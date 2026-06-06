"""Add interview transcript field

Revision ID: 0007_add_interview_transcript
Revises: 0006_add_recruitment_screening_and_decision_fields
Create Date: 2026-06-04
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "0007_add_interview_transcript"
down_revision = "0006_add_recruitment_screening_and_decision_fields"
branch_labels = None
depends_on = None


def _has_column(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = inspect(bind)
    return any(col["name"] == column_name for col in inspector.get_columns(table_name))


def upgrade():
    if not _has_column("interviews", "transcript"):
        op.add_column(
            "interviews",
            sa.Column("transcript", sa.Text(), nullable=True),
        )


def downgrade():
    if _has_column("interviews", "transcript"):
        op.drop_column("interviews", "transcript")
