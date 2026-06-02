from fastapi import FastAPI

from config import settings

from core.resume_upload import ensure_upload_dir
from core.voice_upload import ensure_voice_upload_dir

from routers.auth import router as auth_router
from routers.employees import router as employees_router
from routers.departments import router as departments_router
from routers.attendance import router as attendance_router
from routers.leave import router as leave_router
from routers.payroll import router as payroll_router
from routers.performance import router as performance_router
from routers.recruitment import router as recruitment_router
from routers.ai import router as ai_router
from routers.dashboard import router as dashboard_router
from routers.analytics import router as analytics_router
from fastapi.middleware.cors import CORSMiddleware

ensure_upload_dir()
ensure_voice_upload_dir()

app = FastAPI(
    title=settings.APP_NAME
)

app.add_middleware(
  CORSMiddleware,
  allow_origins=["http://localhost:5173"],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)
app.include_router(auth_router)
app.include_router(employees_router)
app.include_router(departments_router)
app.include_router(attendance_router)
app.include_router(leave_router)
app.include_router(payroll_router)
app.include_router(performance_router)
app.include_router(recruitment_router)
app.include_router(ai_router)
app.include_router(dashboard_router)
app.include_router(analytics_router)


@app.get("/")
def root():

    return {
        "app": settings.APP_NAME,
        "status": "running"
    }


@app.get("/health")
def health():

    return {
        "status": "healthy"
    }
