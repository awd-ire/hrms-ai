"""Add recruitment screening and decision fields

Revision ID: 0006_add_recruitment_screening_and_decision_fields
Revises: 0005_add_timestamps_to_attendance_payroll_performance
Create Date: 2026-06-02
"""

from alembic import op
import sqlalchemy as sa


revision = "0006_add_recruitment_screening_and_decision_fields"
down_revision = "0005_add_timestamps_to_attendance_payroll_performance"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "candidates",
        sa.Column("screening_score", sa.Float(), nullable=True),
    )
    op.add_column(
        "candidates",
        sa.Column("screening_summary", sa.Text(), nullable=True),
    )
    op.add_column(
        "candidates",
        sa.Column("shortlist_decision", sa.String(length=50), nullable=True),
    )
    op.add_column(
        "candidates",
        sa.Column("interview_score", sa.Float(), nullable=True),
    )
    op.add_column(
        "candidates",
        sa.Column("interview_summary", sa.Text(), nullable=True),
    )
    op.add_column(
        "candidates",
        sa.Column("final_decision", sa.String(length=50), nullable=True),
    )


def downgrade():
    op.drop_column("candidates", "final_decision")
    op.drop_column("candidates", "interview_summary")
    op.drop_column("candidates", "interview_score")
    op.drop_column("candidates", "shortlist_decision")
    op.drop_column("candidates", "screening_summary")
    op.drop_column("candidates", "screening_score")
