from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.permissions import AdminOnly, Authenticated, AdminOrManagerOrHR
from database import get_db
from schemas.department import (
    DepartmentCreate,
    DepartmentResponse,
    DepartmentUpdate,
)
from services.employee_service import DepartmentService

router = APIRouter(
    prefix="/api/departments",
    tags=["Departments"]
)


@router.get("/", response_model=list[DepartmentResponse])
def list_departments(
    db: Session = Depends(get_db),
    current_user=Depends(Authenticated),
):
    return DepartmentService.list_all(db)


@router.post(
    "/",
    response_model=DepartmentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_department(
    payload: DepartmentCreate,
    db: Session = Depends(get_db),
    current_user=Depends(AdminOrManagerOrHR),
):
    try:
        return DepartmentService.create(db, payload)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.put("/{department_id}", response_model=DepartmentResponse)
def update_department(
    department_id: int,
    payload: DepartmentUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(AdminOrManagerOrHR),
):
    department = DepartmentService.update(db, department_id, payload)
    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found",
        )
    return department


@router.delete("/{department_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_department(
    department_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(AdminOrManagerOrHR),
):
    try:
        deleted = DepartmentService.delete(db, department_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found",
        )
