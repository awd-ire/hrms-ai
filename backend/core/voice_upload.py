import uuid
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
VOICE_UPLOAD_DIR = BACKEND_DIR / "uploads" / "voice"

ALLOWED_AUDIO_EXTENSIONS = {".wav", ".mp3", ".m4a", ".webm", ".ogg", ".flac"}
MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024


def ensure_voice_upload_dir() -> Path:
    VOICE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    return VOICE_UPLOAD_DIR


def validate_audio_file(filename: str, content: bytes) -> None:
    if not content:
        raise ValueError("Audio file is required")

    if len(content) > MAX_AUDIO_SIZE_BYTES:
        raise ValueError("Audio file exceeds 25MB limit")

    extension = Path(filename or "").suffix.lower()
    if extension not in ALLOWED_AUDIO_EXTENSIONS:
        allowed = ", ".join(sorted(ALLOWED_AUDIO_EXTENSIONS))
        raise ValueError(f"Unsupported audio type. Allowed: {allowed}")


def save_audio_file(filename: str, content: bytes) -> str:
    validate_audio_file(filename, content)
    upload_dir = ensure_voice_upload_dir()
    extension = Path(filename or "audio.webm").suffix.lower() or ".webm"
    saved_name = f"{uuid.uuid4().hex}{extension}"
    file_path = upload_dir / saved_name
    file_path.write_bytes(content)
    return str(file_path)
