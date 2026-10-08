"""Separate leaf symptom assessments from satisfaction surveys."""
from alembic import op
import sqlalchemy as sa

revision = "0005_leaf_assessments"
down_revision = "0004_one_survey_per_user"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("leaf_assessments",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("diagnosis_id", sa.Uuid(), sa.ForeignKey("diagnoses.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("expected_class_code", sa.String(50), nullable=False),
        sa.Column("severity_score", sa.SmallInteger(), nullable=False),
        sa.Column("symptoms", sa.JSON(), nullable=False),
        sa.Column("ai_class_code", sa.String(50)),
        sa.Column("ai_model_version", sa.String(50)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("severity_score BETWEEN 1 AND 5", name="ck_leaf_assessment_severity"))
    op.create_index("ix_leaf_assessments_user_id", "leaf_assessments", ["user_id"])
    op.create_index("ix_leaf_assessments_created_at", "leaf_assessments", ["created_at"])


def downgrade():
    op.drop_table("leaf_assessments")
