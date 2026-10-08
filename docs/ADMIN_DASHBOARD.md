# Admin Dashboard

Open `/admin/dashboard`, the Dashboard link on `/admin`, or the admin account menu.
Only the database-backed `admin` role can call `GET /api/v1/admin/dashboard`.

## Data definitions

- `days` selects 1–365 days (the UI offers 7, 30, 90, 365). The period starts at
  midnight in Bangkok on the first day and ends at the response timestamp.
  Future-dated events are excluded. All-time user counts and offline model
  evaluation are independent of this operational window.
- New users: accounts created in this period.
- Active Users: distinct users who submitted a diagnosis, satisfaction survey,
  or leaf assessment in this period. This measures submissions, not logins or
  passive browsing.
- AI confidence: average confidence on completed diagnoses, excluding
  `admin-corrected` records. Low confidence means below 0.75. Disease counts
  reflect the current saved results, including administrator corrections.
- Satisfaction surveys remain immutable, one per user. Their accuracy rating is
  a user opinion, not the model's test-set accuracy.

## Leaf symptom assessments

The existing survey measures satisfaction and has no symptom fields. A separate
`leaf_assessments` table stores one immutable symptom assessment per diagnosis.
The owner submits it from the diagnosis result page using
`POST /api/v1/diagnoses/{id}/assessment`. The owner and admins can read it with GET.
Admins cannot submit on another user's behalf. Processing records cannot be assessed.

Fields: expected disease (healthy, brown spot, white scale), selected symptoms,
and self-reported severity 1–5. Healthy requires severity 1 and no symptoms.
Risk groups are an explicit display rule: 1–2 low, 3 medium, 4–5 high; they are
not derived from a trained risk model. Symptoms are multiple-choice, so symptom
totals can exceed the number of submitted assessments.

At submission, save the AI disease and model-version snapshot. The comparison
uses this snapshot for the same diagnosis, so subsequent administrator edits
cannot silently change the paired result. Failed diagnoses, NON_PALM results,
and results corrected by an admin before assessment are excluded from agreement.
Agreement is matched pairs / eligible pairs and is null when there are no pairs.
The matrix rows are user assessments and columns are AI classifications.
Users can see the AI result before assessing it: this is a potentially biased
agreement measure, not ground truth or test-set accuracy. Deleting the diagnosis
also deletes its linked assessment.

## Model metrics

Read `evaluation-vX.Y.json` beside the MobileNet model named in
`MOBILENET_MODEL_PATH`; never substitute an unrelated model's metrics. v1.3 has
separate `new` and `old` datasets (365 and 397 images). v1.2 uses the older
`per_class` format (417 images). Accuracy is from each report; precision, recall,
and F1 use the macro average. Per-class metrics and support are also displayed.
Missing, invalid, unmatched reports and Gemini mode display an unavailable state.
Ship these JSON reports with the model files when deploying.

## Migration and validation

Run `cd backend` and `.\.venv\Scripts\python.exe -m alembic upgrade head` to apply
`0005_leaf_assessments`. The local database was backed up to
`tmp/palmguard-before-admin-dashboard.db` before applying it.

`test_admin_dashboard.py` covers permissions, date boundaries, averages, deduped
activity, empty states, matched/excluded pairs, immutable submissions, ownership,
snapshots, cascaded deletion, and both evaluation formats. Existing diagnosis,
survey, and timestamp tests remain part of the backend test suite.
