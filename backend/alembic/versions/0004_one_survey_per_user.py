"""Keep each user's survey immutable and prevent concurrent duplicate submissions."""
from alembic import op

revision = "0004_one_survey_per_user"
down_revision = "0003_class_probabilities"
branch_labels = None
depends_on = None


def upgrade():
    # Preserve all existing answers; duplicate legacy rows must be reviewed
    # rather than silently deleted if the unique index cannot be created.
    op.create_index("uq_satisfaction_surveys_user_id", "satisfaction_surveys", ["user_id"], unique=True)


def downgrade():
    op.drop_index("uq_satisfaction_surveys_user_id", table_name="satisfaction_surveys")
