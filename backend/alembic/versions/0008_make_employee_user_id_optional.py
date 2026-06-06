"""Make employee user_id optional

Revision ID: 0008_make_employee_user_id_optional
Revises: 0007_add_interview_transcript
Create Date: 2026-06-06
"""

from alembic import op
import sqlalchemy as sa


revision = "0008_make_employee_user_id_optional"
down_revision = "0007_add_interview_transcript"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("employees") as batch_op:
        batch_op.alter_column(
            "user_id",
            existing_type=sa.Integer(),
            nullable=True,
        )


def downgrade():
    with op.batch_alter_table("employees") as batch_op:
        batch_op.alter_column(
            "user_id",
            existing_type=sa.Integer(),
            nullable=False,
        )
