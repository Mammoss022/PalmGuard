"""initial schema — users, disease_classes, diagnoses (docs/DATABASE.md)

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-08-21

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=150), nullable=False),
        sa.Column("phone_number", sa.String(length=20), nullable=True),
        sa.Column("role", sa.String(length=20), nullable=False, server_default="farmer"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "disease_classes",
        sa.Column("id", sa.SmallInteger(), primary_key=True),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("name_th", sa.String(length=100), nullable=False),
        sa.Column("name_en", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("recommendation_th", sa.Text(), nullable=True),
    )
    op.create_index("ix_disease_classes_code", "disease_classes", ["code"], unique=True)

    op.create_table(
        "diagnoses",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("image_url", sa.String(length=500), nullable=False),
        sa.Column("thumbnail_url", sa.String(length=500), nullable=True),
        sa.Column(
            "predicted_class_id",
            sa.SmallInteger(),
            sa.ForeignKey("disease_classes.id", ondelete="RESTRICT"),
            nullable=True,
        ),
        sa.Column("confidence_score", sa.Numeric(5, 4), nullable=True),
        sa.Column("model_version", sa.String(length=50), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="processing"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_diagnoses_user_id", "diagnoses", ["user_id"])
    op.create_index("ix_diagnoses_predicted_class_id", "diagnoses", ["predicted_class_id"])
    op.create_index("ix_diagnoses_created_at", "diagnoses", ["created_at"])


def downgrade() -> None:
    op.drop_table("diagnoses")
    op.drop_index("ix_disease_classes_code", table_name="disease_classes")
    op.drop_table("disease_classes")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
