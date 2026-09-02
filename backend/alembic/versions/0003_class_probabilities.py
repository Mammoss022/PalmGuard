"""diagnoses.class_probabilities — per-class probability breakdown for the
result screen ("ความน่าจะเป็นในแต่ละโรค") instead of just the winning class's
confidence score.

Revision ID: 0003_class_probabilities
Revises: 0002_satisfaction_surveys
Create Date: 2026-09-02

Note: named shorter than the "diagnoses.class_probabilities" description
above on purpose — Alembic's default alembic_version.version_num column is
VARCHAR(32); a longer revision id fails on Postgres (which enforces the
length) even though it silently worked on SQLite (which doesn't).
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003_class_probabilities"
down_revision: Union[str, None] = "0002_satisfaction_surveys"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("diagnoses", sa.Column("class_probabilities", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("diagnoses", "class_probabilities")
