import os
import uuid
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BACKEND_DIR / "uploads" / "resumes"

ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx", ".txt"}
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024


def ensure_upload_dir() -> Path:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    return UPLOAD_DIR


def validate_resume_file(filename: str, content: bytes) -> None:
    if not content:
        raise ValueError("Resume file is required")

    if len(content) > MAX_FILE_SIZE_BYTES:
        raise ValueError("Resume file exceeds 5MB limit")

    extension = Path(filename or "").suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        allowed = ", ".join(sorted(ALLOWED_EXTENSIONS))
        raise ValueError(f"Unsupported file type. Allowed: {allowed}")


def save_resume_file(filename: str, content: bytes) -> str:
    validate_resume_file(filename, content)
    upload_dir = ensure_upload_dir()
    extension = Path(filename or "resume.pdf").suffix.lower() or ".pdf"
    saved_name = f"{uuid.uuid4().hex}{extension}"
    file_path = upload_dir / saved_name
    file_path.write_bytes(content)
    return str(file_path)


def extract_resume_text(file_path: str) -> str:
    path = Path(file_path)
    if not path.exists():
        raise ValueError("Resume file not found on disk")

    extension = path.suffix.lower()

    if extension == ".txt":
        return path.read_text(encoding="utf-8", errors="ignore")

    if extension == ".pdf":
        from pypdf import PdfReader

        reader = PdfReader(str(path))
        pages = [page.extract_text() or "" for page in reader.pages]
        return "\n".join(pages)

    if extension == ".docx":
        try:
            import docx

            doc = docx.Document(str(path))
            paragraphs = [p.text for p in doc.paragraphs if p.text]
            return "\n".join(paragraphs)
        except ImportError:
            raise ValueError(
                "python-docx is not installed. Install it with: pip install python-docx"
            )
        except Exception as exc:
            raise ValueError(f"Failed to extract text from .docx: {exc}")

    raise ValueError(
        "Text extraction supports PDF and TXT only. "
        "Convert Word documents before uploading, or upload .docx and install python-docx."
    )


def resolve_resume_path(stored_path: str) -> Path:
    path = Path(stored_path)
    if not path.is_absolute():
        path = BACKEND_DIR / path

    resolved = path.resolve()
    upload_root = UPLOAD_DIR.resolve()

    if not str(resolved).startswith(str(upload_root)):
        raise ValueError("Invalid resume file path")

    return resolved
