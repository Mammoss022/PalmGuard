"""diagnoses.class_probabilities — per-class probability breakdown for the
result screen ("ความน่าจะเป็นในแต่ละโรค") instead of just the winning class's
confidence score.

Revision ID: 0003_diagnosis_class_probabilities
Revises: 0002_satisfaction_surveys
Create Date: 2026-09-02

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003_diagnosis_class_probabilities"
down_revision: Union[str, None] = "0002_satisfaction_surveys"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("diagnoses", sa.Column("class_probabilities", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("diagnoses", "class_probabilities")
