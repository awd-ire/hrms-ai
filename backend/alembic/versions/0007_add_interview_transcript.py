"""Add interview transcript field

Revision ID: 0007_add_interview_transcript
Revises: 0006_add_recruitment_screening_and_decision_fields
Create Date: 2026-06-04
"""

from alembic import op
import sqlalchemy as sa


revision = "0007_add_interview_transcript"
down_revision = "0006_add_recruitment_screening_and_decision_fields"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "interviews",
        sa.Column("transcript", sa.Text(), nullable=True),
    )


def downgrade():
    op.drop_column("interviews", "transcript")
