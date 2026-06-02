"""Add created_at and updated_at to leaves

Revision ID: 0004_add_leave_timestamps
Revises: 0003_add_recruitment_timestamps
Create Date: 2026-06-02
"""

from alembic import op
import sqlalchemy as sa


revision = "0004_add_leave_timestamps"
down_revision = "0003_add_recruitment_timestamps"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "leaves",
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=True,
        ),
    )
    op.add_column(
        "leaves",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=True,
        ),
    )


def downgrade():
    op.drop_column("leaves", "updated_at")
    op.drop_column("leaves", "created_at")
