"""Store safe guidance for unsuccessful diagnoses."""
from alembic import op
import sqlalchemy as sa

revision = "0008_diagnosis_failure_reason"
down_revision = "0007_revise_disease_advice"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("diagnoses", sa.Column("failure_reason", sa.String(500), nullable=True))


def downgrade():
    op.drop_column("diagnoses", "failure_reason")
