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
    JobPostingCreate,
    JobPostingUpdate,
)


class RecruitmentService:

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
        db.commit()
        db.refresh(interview)
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

        db.commit()
        db.refresh(interview)
        return interview

    @staticmethod
    def update_candidate_ai_results(
        db: Session,
        candidate_id: int,
        score: float,
        summary: str,
    ) -> Optional[Candidate]:
        candidate = RecruitmentService.get_candidate(db, candidate_id)
        if not candidate:
            return None

        candidate.ai_score = score
        candidate.ai_summary = summary
        db.commit()
        db.refresh(candidate)
        return candidate

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

        return {
            "open_jobs": open_jobs,
            "total_candidates": total_candidates,
            "candidates_by_stage": candidates_by_stage,
            "interviews_scheduled": interviews_scheduled,
        }
