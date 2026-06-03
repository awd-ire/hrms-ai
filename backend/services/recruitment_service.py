from typing import Any, Dict, List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from core.resume_upload import save_resume_file
from models.recruitment import Candidate, Interview, JobPosting

from schemas.recruitment import (
    CandidateCreate,
    CandidateStageUpdate,
    InterviewCreate,
    InterviewFeedbackUpdate,
    InterviewRetryRequest,
    JobPostingCreate,
    JobPostingUpdate,
)


class RecruitmentService:
    SHORTLIST_THRESHOLD = 70

    @staticmethod
    def save_resume_file(filename: str, content: bytes) -> str:
        return save_resume_file(filename, content)

    @staticmethod
    def list_job_postings(db: Session) -> List[JobPosting]:
        return (
            db.query(JobPosting)
            .options(joinedload(JobPosting.department))
            .order_by(JobPosting.id.desc())
            .all()
        )

    @staticmethod
    def get_job_posting(
        db: Session,
        job_id: int,
    ) -> Optional[JobPosting]:
        return (
            db.query(JobPosting)
            .options(joinedload(JobPosting.department))
            .filter(JobPosting.id == job_id)
            .first()
        )

    @staticmethod
    def create_job_posting(
        db: Session,
        payload: JobPostingCreate,
    ) -> JobPosting:
        job = JobPosting(**payload.model_dump())
        db.add(job)
        db.commit()
        db.refresh(job)
        return RecruitmentService.get_job_posting(db, job.id)

    @staticmethod
    def update_job_posting(
        db: Session,
        job_id: int,
        payload: JobPostingUpdate,
    ) -> Optional[JobPosting]:
        job = RecruitmentService.get_job_posting(db, job_id)
        if not job:
            return None

        updates = payload.model_dump(exclude_unset=True)
        for field, value in updates.items():
            setattr(job, field, value)

        db.commit()
        db.refresh(job)
        return job

    @staticmethod
    def delete_job_posting(db: Session, job_id: int) -> bool:
        job = RecruitmentService.get_job_posting(db, job_id)
        if not job:
            return False

        db.delete(job)
        db.commit()
        return True

    @staticmethod
    def list_candidates(db: Session) -> List[Candidate]:
        return (
            db.query(Candidate)
            .options(joinedload(Candidate.job_posting))
            .order_by(Candidate.applied_date.desc(), Candidate.id.desc())
            .all()
        )

    @staticmethod
    def get_candidate(
        db: Session,
        candidate_id: int,
    ) -> Optional[Candidate]:
        return (
            db.query(Candidate)
            .options(
                joinedload(Candidate.job_posting),
                joinedload(Candidate.interviews),
            )
            .filter(Candidate.id == candidate_id)
            .first()
        )

    @staticmethod
    def create_candidate(
        db: Session,
        payload: CandidateCreate,
    ) -> Candidate:
        job = RecruitmentService.get_job_posting(db, payload.job_posting_id)
        if not job:
            raise ValueError("Job posting not found")

        candidate = Candidate(**payload.model_dump())
        db.add(candidate)
        db.commit()
        db.refresh(candidate)
        return RecruitmentService.get_candidate(db, candidate.id)

    @staticmethod
    def update_candidate_stage(
        db: Session,
        candidate_id: int,
        payload: CandidateStageUpdate,
    ) -> Optional[Candidate]:
        candidate = RecruitmentService.get_candidate(db, candidate_id)
        if not candidate:
            return None

        candidate.stage = payload.stage
        db.commit()
        db.refresh(candidate)
        return candidate

    @staticmethod
    def create_interview(
        db: Session,
        payload: InterviewCreate,
    ) -> Interview:
        candidate = RecruitmentService.get_candidate(db, payload.candidate_id)
        if not candidate:
            raise ValueError("Candidate not found")

        interview = Interview(**payload.model_dump())
        db.add(interview)

        if candidate.stage in {"applied", "shortlisted"}:
            candidate.stage = "interview_scheduled"

        db.commit()
        db.refresh(interview)
        db.refresh(candidate)
        return (
            db.query(Interview)
            .options(joinedload(Interview.candidate))
            .filter(Interview.id == interview.id)
            .first()
        )

    @staticmethod
    def update_interview_feedback(
        db: Session,
        interview_id: int,
        payload: InterviewFeedbackUpdate,
    ) -> Optional[Interview]:
        interview = (
            db.query(Interview)
            .options(joinedload(Interview.candidate))
            .filter(Interview.id == interview_id)
            .first()
        )
        if not interview:
            return None

        updates = payload.model_dump()
        for field, value in updates.items():
            setattr(interview, field, value)

        candidate = interview.candidate
        if candidate is not None:
            candidate.interview_score = payload.score
            candidate.interview_summary = payload.feedback
            candidate.ai_score = payload.score
            candidate.ai_summary = payload.feedback
            recommendation = (payload.recommendation or "").lower()
            candidate.final_decision = recommendation or payload.status

            if recommendation in {"reject", "rejected"} or payload.status == "rejected":
                candidate.stage = "rejected"
            elif recommendation in {"hire", "hired"} or payload.status == "hired":
                candidate.stage = "hired"
            else:
                candidate.stage = "interviewed"

        db.commit()
        db.refresh(interview)
        return interview

    @staticmethod
    def update_candidate_screening_result(
        db: Session,
        candidate_id: int,
        score: float,
        summary: str,
        shortlist_decision: str,
    ) -> Optional[Candidate]:
        candidate = RecruitmentService.get_candidate(db, candidate_id)
        if not candidate:
            return None

        candidate.screening_score = score
        candidate.screening_summary = summary
        candidate.ai_score = score
        candidate.ai_summary = summary
        candidate.shortlist_decision = shortlist_decision
        candidate.final_decision = None if shortlist_decision == "shortlisted" else "rejected"
        candidate.stage = "shortlisted" if shortlist_decision == "shortlisted" else "rejected"
        candidate.interview_score = None if shortlist_decision == "shortlisted" else candidate.interview_score
        candidate.interview_summary = None if shortlist_decision == "shortlisted" else candidate.interview_summary
        db.commit()
        db.refresh(candidate)
        return candidate

    @staticmethod
    def update_candidate_interview_result(
        db: Session,
        candidate_id: int,
        score: float,
        summary: str,
        final_decision: str,
    ) -> Optional[Candidate]:
        candidate = RecruitmentService.get_candidate(db, candidate_id)
        if not candidate:
            return None

        candidate.interview_score = score
        candidate.interview_summary = summary
        candidate.ai_score = score
        candidate.ai_summary = summary
        candidate.final_decision = final_decision

        if final_decision in {"rejected", "reject"}:
            candidate.stage = "rejected"
        elif final_decision in {"hired", "hire"}:
            candidate.stage = "hired"
        else:
            candidate.stage = "interviewed"

        db.commit()
        db.refresh(candidate)
        return candidate

    @staticmethod
    def update_candidate_stage_after_interview_schedule(
        db: Session,
        candidate_id: int,
    ) -> Optional[Candidate]:
        candidate = RecruitmentService.get_candidate(db, candidate_id)
        if not candidate:
            return None

        if candidate.stage in {"applied", "shortlisted"}:
            candidate.stage = "interview_scheduled"
            db.commit()
            db.refresh(candidate)

        return candidate

    @staticmethod
    def mark_interview_in_progress(
        db: Session,
        candidate_id: int,
    ) -> Optional[Interview]:
        candidate = RecruitmentService.get_candidate(db, candidate_id)
        if not candidate:
            return None

        interview = (
            db.query(Interview)
            .filter(Interview.candidate_id == candidate_id)
            .order_by(Interview.created_at.desc(), Interview.id.desc())
            .first()
        )
        if not interview:
            return None

        interview.status = "in_progress"
        if candidate.stage in {"interview_scheduled", "shortlisted"}:
            candidate.stage = "interview_in_progress"

        db.commit()
        db.refresh(interview)
        return (
            db.query(Interview)
            .options(joinedload(Interview.candidate))
            .filter(Interview.id == interview.id)
            .first()
        )

    @staticmethod
    def reopen_candidate_interview(
        db: Session,
        candidate_id: int,
        payload: Optional[InterviewRetryRequest] = None,
    ) -> Optional[Interview]:
        candidate = RecruitmentService.get_candidate(db, candidate_id)
        if not candidate:
            return None

        latest_interview = (
            db.query(Interview)
            .filter(Interview.candidate_id == candidate_id)
            .order_by(Interview.created_at.desc(), Interview.id.desc())
            .first()
        )

        interview_round = (
            payload.interview_round
            if payload and payload.interview_round
            else (latest_interview.interview_round if latest_interview else "retry")
        )
        scheduled_date = (
            payload.scheduled_date
            if payload and payload.scheduled_date
            else (latest_interview.scheduled_date if latest_interview else None)
        )

        if scheduled_date is None:
            from datetime import date

            scheduled_date = date.today()

        candidate.interview_score = None
        candidate.interview_summary = None
        candidate.final_decision = None
        candidate.ai_score = candidate.screening_score or 0
        candidate.ai_summary = candidate.screening_summary
        candidate.stage = "interview_scheduled"

        interview = Interview(
            candidate_id=candidate_id,
            interviewer_id=None,
            interview_round=interview_round,
            scheduled_date=scheduled_date,
            status="scheduled",
        )
        db.add(interview)
        db.commit()
        db.refresh(interview)
        db.refresh(candidate)
        return (
            db.query(Interview)
            .options(joinedload(Interview.candidate))
            .filter(Interview.id == interview.id)
            .first()
        )

    @staticmethod
    def get_analytics(db: Session) -> Dict[str, Any]:
        open_jobs = (
            db.query(JobPosting)
            .filter(JobPosting.status == "open")
            .count()
        )
        total_candidates = db.query(Candidate).count()
        candidates_by_stage = dict(
            db.query(Candidate.stage, func.count(Candidate.id))
            .group_by(Candidate.stage)
            .all()
        )
        interviews_scheduled = (
            db.query(Interview)
            .filter(Interview.status == "scheduled")
            .count()
        )
        pending_interview_reviews = (
            db.query(Interview)
            .filter(
                Interview.status == "completed",
                Interview.recommendation == "pending_hr_review",
            )
            .count()
        )

        return {
            "open_jobs": open_jobs,
            "total_candidates": total_candidates,
            "candidates_by_stage": candidates_by_stage,
            "interviews_scheduled": interviews_scheduled,
            "pending_interview_reviews": pending_interview_reviews,
        }
