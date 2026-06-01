from typing import Any, Dict, List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from models.performance import PerformanceReview

from schemas.performance import PerformanceReviewCreate, PerformanceReviewUpdate


class PerformanceService:

    @staticmethod
    def _review_query(db: Session):
        return (
            db.query(PerformanceReview)
            .options(
                joinedload(PerformanceReview.employee),
                joinedload(PerformanceReview.reviewer),
            )
        )

    @staticmethod
    def get_reviews(db: Session) -> List[PerformanceReview]:
        return (
            PerformanceService._review_query(db)
            .order_by(
                PerformanceReview.review_date.desc(),
                PerformanceReview.id.desc(),
            )
            .all()
        )

    @staticmethod
    def get_by_id(
        db: Session,
        review_id: int,
    ) -> Optional[PerformanceReview]:
        return (
            PerformanceService._review_query(db)
            .filter(PerformanceReview.id == review_id)
            .first()
        )

    @staticmethod
    def get_by_employee(
        db: Session,
        employee_id: int,
    ) -> List[PerformanceReview]:
        return (
            PerformanceService._review_query(db)
            .filter(PerformanceReview.employee_id == employee_id)
            .order_by(PerformanceReview.review_date.desc())
            .all()
        )

    @staticmethod
    def get_team_reviews(
        db: Session,
        employee_ids: List[int],
    ) -> List[PerformanceReview]:
        if not employee_ids:
            return []

        return (
            PerformanceService._review_query(db)
            .filter(PerformanceReview.employee_id.in_(employee_ids))
            .order_by(PerformanceReview.review_date.desc())
            .all()
        )

    @staticmethod
    def create_review(
        db: Session,
        reviewer_id: int,
        payload: PerformanceReviewCreate,
    ) -> PerformanceReview:
        review = PerformanceReview(
            reviewer_id=reviewer_id,
            **payload.model_dump(),
        )
        db.add(review)
        db.commit()
        db.refresh(review)
        return PerformanceService.get_by_id(db, review.id)

    @staticmethod
    def update_review(
        db: Session,
        review_id: int,
        payload: PerformanceReviewUpdate,
    ) -> Optional[PerformanceReview]:
        review = PerformanceService.get_by_id(db, review_id)
        if not review:
            return None

        updates = payload.model_dump(exclude_unset=True)
        for field, value in updates.items():
            setattr(review, field, value)

        db.commit()
        db.refresh(review)
        return review

    @staticmethod
    def get_analytics(
        db: Session,
        employee_ids: Optional[List[int]] = None,
    ) -> Dict[str, Any]:
        if employee_ids is not None and not employee_ids:
            return {
                "total_reviews": 0,
                "average_rating": 0.0,
                "by_status": {},
            }

        def base_query():
            query = db.query(PerformanceReview)
            if employee_ids is not None:
                query = query.filter(
                    PerformanceReview.employee_id.in_(employee_ids)
                )
            return query

        total_reviews = base_query().count()
        average_rating = (
            base_query()
            .with_entities(func.avg(PerformanceReview.rating))
            .scalar()
            or 0.0
        )
        by_status = dict(
            base_query()
            .with_entities(
                PerformanceReview.status,
                func.count(PerformanceReview.id),
            )
            .group_by(PerformanceReview.status)
            .all()
        )

        return {
            "total_reviews": total_reviews,
            "average_rating": float(average_rating),
            "by_status": by_status,
        }
