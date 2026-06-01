"""Initial HRMS Schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-05-31
"""

from alembic import op
import sqlalchemy as sa


revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():

    op.create_table(
        "users",

        sa.Column(
            "id",
            sa.Integer(),
            primary_key=True
        ),

        sa.Column(
            "username",
            sa.String(length=100),
            nullable=False,
            unique=True
        ),

        sa.Column(
            "email",
            sa.String(length=255),
            nullable=False,
            unique=True
        ),

        sa.Column(
            "hashed_password",
            sa.String(length=255),
            nullable=False
        ),

        sa.Column(
            "role",
            sa.String(length=50),
            nullable=False
        ),

        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true()
        ),

        sa.Column(
            "created_at",
            sa.DateTime(timezone=True)
        ),

        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True)
        )
    )

    op.create_table(
        "departments",

        sa.Column(
            "id",
            sa.Integer(),
            primary_key=True
        ),

        sa.Column(
            "name",
            sa.String(length=100),
            nullable=False,
            unique=True
        ),

        sa.Column(
            "code",
            sa.String(length=20),
            nullable=False,
            unique=True
        ),

        sa.Column(
            "description",
            sa.Text()
        ),

        sa.Column(
            "created_at",
            sa.DateTime(timezone=True)
        ),

        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True)
        )
    )

    op.create_table(
        "employees",

        sa.Column(
            "id",
            sa.Integer(),
            primary_key=True
        ),

        sa.Column(
            "employee_code",
            sa.String(length=30),
            nullable=False,
            unique=True
        ),

        sa.Column(
            "first_name",
            sa.String(length=100),
            nullable=False
        ),

        sa.Column(
            "last_name",
            sa.String(length=100),
            nullable=False
        ),

        sa.Column(
            "email",
            sa.String(length=255),
            nullable=False,
            unique=True
        ),

        sa.Column(
            "phone",
            sa.String(length=20)
        ),

        sa.Column(
            "designation",
            sa.String(length=150),
            nullable=False
        ),

        sa.Column(
            "hire_date",
            sa.Date(),
            nullable=False
        ),

        sa.Column(
            "salary",
            sa.Float(),
            nullable=False
        ),

        sa.Column(
            "status",
            sa.String(length=50)
        ),

        sa.Column(
            "profile_image",
            sa.String(length=500)
        ),

        sa.Column(
            "is_active",
            sa.Boolean()
        ),

        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id"),
            nullable=False,
            unique=True
        ),

        sa.Column(
            "department_id",
            sa.Integer(),
            sa.ForeignKey("departments.id"),
            nullable=False
        ),

        sa.Column(
            "manager_id",
            sa.Integer(),
            sa.ForeignKey("employees.id")
        )
    )

    op.create_table(
        "attendance",

        sa.Column(
            "id",
            sa.Integer(),
            primary_key=True
        ),

        sa.Column(
            "employee_id",
            sa.Integer(),
            sa.ForeignKey("employees.id"),
            nullable=False
        ),

        sa.Column(
            "attendance_date",
            sa.Date(),
            nullable=False
        ),

        sa.Column(
            "check_in",
            sa.Time()
        ),

        sa.Column(
            "check_out",
            sa.Time()
        ),

        sa.Column(
            "total_hours",
            sa.String(length=20)
        ),

        sa.Column(
            "status",
            sa.String(length=30)
        ),

        sa.Column(
            "remarks",
            sa.String(length=255)
        )
    )

    op.create_table(
        "leaves",

        sa.Column(
            "id",
            sa.Integer(),
            primary_key=True
        ),

        sa.Column(
            "employee_id",
            sa.Integer(),
            sa.ForeignKey("employees.id"),
            nullable=False
        ),

        sa.Column(
            "leave_type",
            sa.String(length=50),
            nullable=False
        ),

        sa.Column(
            "start_date",
            sa.Date(),
            nullable=False
        ),

        sa.Column(
            "end_date",
            sa.Date(),
            nullable=False
        ),

        sa.Column(
            "total_days",
            sa.Integer(),
            nullable=False
        ),

        sa.Column(
            "reason",
            sa.Text(),
            nullable=False
        ),

        sa.Column(
            "status",
            sa.String(length=30)
        ),

        sa.Column(
            "approved_by",
            sa.Integer(),
            sa.ForeignKey("employees.id")
        ),

        sa.Column(
            "rejection_reason",
            sa.Text()
        )
    )

    op.create_table(
        "payroll",

        sa.Column(
            "id",
            sa.Integer(),
            primary_key=True
        ),

        sa.Column(
            "employee_id",
            sa.Integer(),
            sa.ForeignKey("employees.id"),
            nullable=False
        ),

        sa.Column(
            "payroll_month",
            sa.String(length=20),
            nullable=False
        ),

        sa.Column(
            "payroll_year",
            sa.Integer(),
            nullable=False
        ),

        sa.Column(
            "basic_salary",
            sa.Float(),
            nullable=False
        ),

        sa.Column(
            "allowances",
            sa.Float()
        ),

        sa.Column(
            "bonuses",
            sa.Float()
        ),

        sa.Column(
            "deductions",
            sa.Float()
        ),

        sa.Column(
            "net_salary",
            sa.Float(),
            nullable=False
        ),

        sa.Column(
            "payment_date",
            sa.Date()
        ),

        sa.Column(
            "status",
            sa.String(length=30)
        )
    )

    op.create_table(
        "performance_reviews",

        sa.Column(
            "id",
            sa.Integer(),
            primary_key=True
        ),

        sa.Column(
            "employee_id",
            sa.Integer(),
            sa.ForeignKey("employees.id"),
            nullable=False
        ),

        sa.Column(
            "reviewer_id",
            sa.Integer(),
            sa.ForeignKey("employees.id"),
            nullable=False
        ),

        sa.Column(
            "review_period",
            sa.String(length=100),
            nullable=False
        ),

        sa.Column(
            "review_date",
            sa.Date(),
            nullable=False
        ),

        sa.Column(
            "rating",
            sa.Float(),
            nullable=False
        ),

        sa.Column(
            "strengths",
            sa.Text()
        ),

        sa.Column(
            "improvements",
            sa.Text()
        ),

        sa.Column(
            "goals",
            sa.Text()
        ),

        sa.Column(
            "status",
            sa.String(length=30)
        )
    )

    op.create_table(
        "job_postings",

        sa.Column(
            "id",
            sa.Integer(),
            primary_key=True
        ),

        sa.Column(
            "title",
            sa.String(length=200),
            nullable=False
        ),

        sa.Column(
            "department_id",
            sa.Integer(),
            sa.ForeignKey("departments.id"),
            nullable=False
        ),

        sa.Column(
            "description",
            sa.Text(),
            nullable=False
        ),

        sa.Column(
            "requirements",
            sa.Text(),
            nullable=False
        ),

        sa.Column(
            "employment_type",
            sa.String(length=50),
            nullable=False
        ),

        sa.Column(
            "location",
            sa.String(length=100)
        ),

        sa.Column(
            "salary_range",
            sa.String(length=100)
        ),

        sa.Column(
            "status",
            sa.String(length=30)
        )
    )

    op.create_table(
        "candidates",

        sa.Column(
            "id",
            sa.Integer(),
            primary_key=True
        ),

        sa.Column(
            "job_posting_id",
            sa.Integer(),
            sa.ForeignKey("job_postings.id"),
            nullable=False
        ),

        sa.Column(
            "full_name",
            sa.String(length=200),
            nullable=False
        ),

        sa.Column(
            "email",
            sa.String(length=255),
            nullable=False
        ),

        sa.Column(
            "phone",
            sa.String(length=30)
        ),

        sa.Column(
            "resume_path",
            sa.String(length=500),
            nullable=False
        ),

        sa.Column(
            "experience_years",
            sa.Float()
        ),

        sa.Column(
            "current_company",
            sa.String(length=200)
        ),

        sa.Column(
            "current_role",
            sa.String(length=200)
        ),

        sa.Column(
            "ai_score",
            sa.Float()
        ),

        sa.Column(
            "ai_summary",
            sa.Text()
        ),

        sa.Column(
            "stage",
            sa.String(length=50)
        ),

        sa.Column(
            "applied_date",
            sa.Date(),
            nullable=False
        )
    )

    op.create_table(
        "interviews",

        sa.Column(
            "id",
            sa.Integer(),
            primary_key=True
        ),

        sa.Column(
            "candidate_id",
            sa.Integer(),
            sa.ForeignKey("candidates.id"),
            nullable=False
        ),

        sa.Column(
            "interviewer_id",
            sa.Integer(),
            sa.ForeignKey("employees.id")
        ),

        sa.Column(
            "interview_round",
            sa.String(length=100),
            nullable=False
        ),

        sa.Column(
            "scheduled_date",
            sa.Date(),
            nullable=False
        ),

        sa.Column(
            "feedback",
            sa.Text()
        ),

        sa.Column(
            "score",
            sa.Float()
        ),

        sa.Column(
            "recommendation",
            sa.String(length=50)
        ),

        sa.Column(
            "status",
            sa.String(length=30)
        )
    )


def downgrade():

    op.drop_table("interviews")
    op.drop_table("candidates")
    op.drop_table("job_postings")
    op.drop_table("performance_reviews")
    op.drop_table("payroll")
    op.drop_table("leaves")
    op.drop_table("attendance")
    op.drop_table("employees")
    op.drop_table("departments")
    op.drop_table("users")