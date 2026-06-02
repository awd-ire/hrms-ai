"""Add created_at to recruitment tables

Revision ID: 0003_add_recruitment_timestamps
Revises: 0002_add_employee_timestamps
Create Date: 2026-06-02
"""

from alembic import op
import sqlalchemy as sa


revision = "0003_add_recruitment_timestamps"
down_revision = "0002_add_employee_timestamps"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "job_postings",
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
    )
    op.add_column(
        "candidates",
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
    )
    op.add_column(
        "interviews",
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
    )


def downgrade():
    op.drop_column("interviews", "created_at")
    op.drop_column("candidates", "created_at")
    op.drop_column("job_postings", "created_at")
