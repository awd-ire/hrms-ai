from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.dependencies import get_current_employee
from core.permissions import (
    AdminOrManager,
    AdminOrManagerOrHR,
    EmployeeOnly,
    ManagerOrAdmin,
    is_admin,
)
from database import get_db
from models.user import User
from schemas.performance import (
    PerformanceAnalyticsResponse,
    PerformanceReviewCreate,
    PerformanceReviewResponse,
    PerformanceReviewUpdate,
)
from services.employee_service import EmployeeService
from services.performance_service import PerformanceService

router = APIRouter(
    prefix="/api/performance",
    tags=["Performance"]
)


@router.post(
    "/review",
    response_model=PerformanceReviewResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_review(
    payload: PerformanceReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrManagerOrHR),
    current_employee=Depends(get_current_employee),
):
    return PerformanceService.create_review(
        db,
        current_employee.id,
        payload,
    )


@router.get("/my", response_model=list[PerformanceReviewResponse])
def my_performance(
    db: Session = Depends(get_db),
    current_user: User = Depends(EmployeeOnly),
    current_employee=Depends(get_current_employee),
):
    return PerformanceService.get_by_employee(db, current_employee.id)


@router.get("/team", response_model=list[PerformanceReviewResponse])
def team_performance(
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrManagerOrHR),
    current_employee=Depends(get_current_employee),
):
    if is_admin(current_user):
        return PerformanceService.get_reviews(db)

    team_ids = [
        member.id
        for member in EmployeeService.list_team(db, current_employee.id)
    ]
    return PerformanceService.get_team_reviews(db, team_ids)


@router.put("/{review_id}", response_model=PerformanceReviewResponse)
def update_review(
    review_id: int,
    payload: PerformanceReviewUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrManagerOrHR),
):
    review = PerformanceService.update_review(db, review_id, payload)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Performance review not found",
        )
    return review


@router.get("/analytics", response_model=PerformanceAnalyticsResponse)
def performance_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrManagerOrHR),
    current_employee=Depends(get_current_employee),
):
    if is_admin(current_user):
        return PerformanceService.get_analytics(db)

    team_ids = [
        member.id
        for member in EmployeeService.list_team(db, current_employee.id)
    ]
    return PerformanceService.get_analytics(db, team_ids)
