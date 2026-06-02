"""Add created_at and updated_at to employees

Revision ID: 0002_add_employee_timestamps
Revises: 0001_initial_schema
Create Date: 2026-06-02
"""

from alembic import op
import sqlalchemy as sa


revision = "0002_add_employee_timestamps"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "employees",
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
    )
    op.add_column(
        "employees",
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
    )


def downgrade():
    op.drop_column("employees", "updated_at")
    op.drop_column("employees", "created_at")
