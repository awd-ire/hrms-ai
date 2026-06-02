"""Add created_at and updated_at to attendance, payroll, and performance reviews

Revision ID: 0005_add_timestamps_to_attendance_payroll_performance
Revises: 0004_add_leave_timestamps
Create Date: 2026-06-02
"""

from alembic import op
import sqlalchemy as sa


revision = "0005_add_timestamps_to_attendance_payroll_performance"
down_revision = "0004_add_leave_timestamps"
branch_labels = None
depends_on = None


def upgrade():
    for table_name in ["attendance", "payroll", "performance_reviews"]:
        op.add_column(
            table_name,
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
                nullable=True,
            ),
        )
        op.add_column(
            table_name,
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
                nullable=True,
            ),
        )


def downgrade():
    for table_name in ["performance_reviews", "payroll", "attendance"]:
        op.drop_column(table_name, "updated_at")
        op.drop_column(table_name, "created_at")
