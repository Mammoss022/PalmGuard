"""satisfaction_surveys — UAT survey submissions (docs/PROJECT.md#methodology)

Revision ID: 0002_satisfaction_surveys
Revises: 0001_initial_schema
Create Date: 2026-09-01

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002_satisfaction_surveys"
down_revision: Union[str, None] = "0001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "satisfaction_surveys",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("satisfaction_rating", sa.SmallInteger(), nullable=False),
        sa.Column("ease_of_use_rating", sa.SmallInteger(), nullable=False),
        sa.Column("accuracy_rating", sa.SmallInteger(), nullable=False),
        sa.Column("would_recommend", sa.Boolean(), nullable=False),
        sa.Column("comments", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_satisfaction_surveys_user_id", "satisfaction_surveys", ["user_id"])
    op.create_index("ix_satisfaction_surveys_created_at", "satisfaction_surveys", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_satisfaction_surveys_created_at", table_name="satisfaction_surveys")
    op.drop_index("ix_satisfaction_surveys_user_id", table_name="satisfaction_surveys")
    op.drop_table("satisfaction_surveys")
