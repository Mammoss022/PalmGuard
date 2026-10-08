"""Operational aggregates and offline model evaluation; never equate the two."""
import json
import math
import re
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy import func, select, union
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.demo_data import real_users, real_user_ids
from app.models.user import User
from app.models.diagnosis import Diagnosis
from app.models.disease_class import DiseaseClass
from app.models.leaf_assessment import LeafAssessment
from app.models.satisfaction_survey import SatisfactionSurvey
from app.schemas.admin_dashboard import AdminDashboardResponse, ModelOverview

BANGKOK = timezone(timedelta(hours=7))
CLASSES = {"HEALTHY": "ปกติ", "BROWN_SPOT": "ใบจุดสีน้ำตาล", "WHITE_SCALE": "เพลี้ยหอย", "NON_PALM": "ไม่ใช่ใบปาล์ม"}
SYMPTOMS = {"brown_spots": "จุดสีน้ำตาล", "white_scales": "คราบขาว / เพลี้ยหอย", "yellowing": "ใบเหลือง", "drying": "ใบแห้ง", "wilting": "ใบเหี่ยว"}


def class_code(value):
    return {"BROWN_SPOTS": "BROWN_SPOT"}.get(value.upper(), value.upper())


def metric(value):
    value = float(value)
    if not math.isfinite(value) or not 0 <= value <= 1:
        raise ValueError("Invalid evaluation metric")
    return value


def read_evaluation(path: Path, version: str) -> ModelOverview:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        datasets = []
        if "new" in data and "old" in data:
            for key, name in [("new", "ชุดทดสอบใหม่"), ("old", "ชุดทดสอบเดิม")]:
                report = data[key]["report"]
                avg = report["macro avg"]
                rows = [{"code": class_code(code), "precision": metric(row["precision"]),
                         "recall": metric(row["recall"]), "f1": metric(row["f1-score"]), "support": int(row["support"])}
                        for code, row in report.items() if isinstance(row, dict) and code not in ("macro avg", "weighted avg")]
                datasets.append({"name": name, "accuracy": metric(report["accuracy"]),
                    "precision": metric(avg["precision"]), "recall": metric(avg["recall"]),
                    "f1": metric(avg["f1-score"]), "support": int(avg["support"]), "per_class": rows})
        else:
            rows = [{"code": class_code(code), "precision": metric(row["precision"]), "recall": metric(row["recall"]),
                     "f1": metric(row["f1"]), "support": int(row["total"])} for code, row in data["per_class"].items()]
            datasets.append({"name": "ชุดทดสอบ", "accuracy": metric(data["accuracy"]),
                **{key: sum(row[key] for row in rows) / len(rows) for key in ("precision", "recall", "f1")},
                "support": sum(row["support"] for row in rows), "per_class": rows})
        return ModelOverview(available=True, model_version=version, source=path.name, datasets=datasets)
    except (OSError, ValueError, KeyError, TypeError, ZeroDivisionError):
        return ModelOverview(available=False, model_version=version, reason="ยังไม่มีรายงานทดสอบที่อ่านได้สำหรับโมเดลนี้")


def model_overview() -> ModelOverview:
    if settings.AI_BACKEND != "mobilenet":
        return ModelOverview(available=False, model_version=settings.GEMINI_MODEL,
            reason="ยังไม่มีผลทดสอบ Accuracy / Precision / Recall / F1 สำหรับ AI ที่ใช้งานอยู่")
    configured = Path(settings.MOBILENET_MODEL_PATH)
    match = re.fullmatch(r"mobilenetv2-(v[\d.]+)\.keras", configured.name)
    if not match:
        return ModelOverview(available=False, reason="ไม่พบรายงานทดสอบที่ตรงกับโมเดลที่ตั้งค่าใช้งาน")
    version = match.group(1)
    root = Path(__file__).resolve().parents[2]
    model_path = configured if configured.is_absolute() else root / configured
    return read_evaluation(model_path.parent / f"evaluation-{version}.json", version)


def get_dashboard(db: Session, days: int, now: datetime | None = None) -> AdminDashboardResponse:
    end = now or datetime.now(timezone.utc)
    start = (end.astimezone(BANGKOK).replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=days - 1)).astimezone(timezone.utc)
    def window(column):
        return (column >= start, column <= end)
    def count(model, *conditions):
        if model is User:
            conditions = (*conditions, real_users())
        elif model is SatisfactionSurvey:
            conditions = (*conditions, SatisfactionSurvey.user_id.in_(real_user_ids()))
        return db.scalar(select(func.count()).select_from(model).where(*conditions)) or 0
    def average(column, *conditions):
        if column.class_ is SatisfactionSurvey:
            conditions = (*conditions, SatisfactionSurvey.user_id.in_(real_user_ids()))
        value = db.scalar(select(func.avg(column)).where(*conditions))
        return float(value) if value is not None else None

    active_events = union(
        select(Diagnosis.user_id).where(*window(Diagnosis.created_at)),
        select(SatisfactionSurvey.user_id).where(*window(SatisfactionSurvey.created_at)),
        select(LeafAssessment.user_id).where(*window(LeafAssessment.created_at)),
    ).subquery()
    users = {"total": count(User), "new_users": count(User, *window(User.created_at)),
        "active_users": db.scalar(select(func.count()).select_from(active_events).where(active_events.c.user_id.in_(real_user_ids()))),
        "admins": count(User, User.role == "admin"), "farmers": count(User, User.role == "farmer")}

    statuses = dict(db.execute(select(Diagnosis.status, func.count()).where(*window(Diagnosis.created_at)).group_by(Diagnosis.status)).all())
    original = (*window(Diagnosis.created_at), Diagnosis.status == "completed",
                (Diagnosis.model_version.is_(None) | (Diagnosis.model_version != "admin-corrected")))
    disease_counts = dict(db.execute(select(DiseaseClass.code, func.count()).join(Diagnosis.disease_class)
        .where(*window(Diagnosis.created_at), Diagnosis.status == "completed").group_by(DiseaseClass.code)).all())
    dates = db.scalars(select(Diagnosis.created_at).where(*window(Diagnosis.created_at)))
    daily = Counter((date.replace(tzinfo=timezone.utc) if date.tzinfo is None else date).astimezone(BANGKOK).date().isoformat() for date in dates)
    ai = {"total": sum(statuses.values()), "completed": statuses.get("completed", 0), "failed": statuses.get("failed", 0),
        "processing": statuses.get("processing", 0), "mean_confidence": average(Diagnosis.confidence_score, *original),
        "low_confidence": count(Diagnosis, *original, Diagnosis.confidence_score < .75),
        "admin_corrected": count(Diagnosis, *window(Diagnosis.created_at), Diagnosis.model_version == "admin-corrected"),
        "diseases": [{"code": code, "label": label, "count": disease_counts.get(code, 0)} for code, label in CLASSES.items()],
        "daily": [{"code": (start.astimezone(BANGKOK).date() + timedelta(days=i)).isoformat(),
                   "label": (start.astimezone(BANGKOK).date() + timedelta(days=i)).strftime("%d/%m"),
                   "count": daily.get((start.astimezone(BANGKOK).date() + timedelta(days=i)).isoformat(), 0)} for i in range(days)]}

    rows = db.execute(select(LeafAssessment.severity_score, LeafAssessment.symptoms, LeafAssessment.expected_class_code,
        LeafAssessment.ai_class_code).where(*window(LeafAssessment.created_at))).all()
    risks = Counter("low" if row.severity_score <= 2 else "medium" if row.severity_score == 3 else "high" for row in rows)
    symptoms = Counter(symptom for row in rows for symptom in set(row.symptoms))
    assessments = {"total": len(rows), "mean_severity": sum(row.severity_score for row in rows) / len(rows) if rows else None,
        "risks": [{"code": code, "label": label, "count": risks[code]} for code, label in [("low", "ต่ำ"), ("medium", "ปานกลาง"), ("high", "สูง")]],
        "symptoms": [{"code": code, "label": label, "count": symptoms[code]} for code, label in SYMPTOMS.items()],
        "satisfaction_count": count(SatisfactionSurvey, *window(SatisfactionSurvey.created_at)),
        "mean_satisfaction": average(SatisfactionSurvey.satisfaction_rating, *window(SatisfactionSurvey.created_at)),
        "mean_ease_of_use": average(SatisfactionSurvey.ease_of_use_rating, *window(SatisfactionSurvey.created_at)),
        "mean_accuracy_rating": average(SatisfactionSurvey.accuracy_rating, *window(SatisfactionSurvey.created_at))}
    pairs = Counter((row.expected_class_code, row.ai_class_code) for row in rows if row.ai_class_code in CLASSES and row.ai_class_code != "NON_PALM")
    eligible = sum(pairs.values())
    agreed = sum(n for (expected, predicted), n in pairs.items() if expected == predicted)
    comparison = {"eligible": eligible, "agreed": agreed, "disagreed": eligible - agreed, "excluded": len(rows) - eligible,
        "agreement_rate": agreed / eligible if eligible else None,
        "matrix": [{"assessment_code": expected, "ai_code": predicted, "count": pairs[(expected, predicted)]}
                   for expected in list(CLASSES)[:3] for predicted in list(CLASSES)[:3]]}
    return AdminDashboardResponse(days=days, start_at=start, end_at=end, users=users, ai=ai,
        assessments=assessments, comparison=comparison, model=model_overview())
