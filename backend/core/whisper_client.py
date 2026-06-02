from pathlib import Path
from threading import Lock
from typing import Any, Dict, Optional

try:
    from faster_whisper import WhisperModel  # type: ignore
    _WHISPER_AVAILABLE = True
except Exception:
    WhisperModel = None  # type: ignore
    _WHISPER_AVAILABLE = False

from config import settings


class WhisperClient:
    """Local speech-to-text client backed by faster-whisper when available.

    The package `faster_whisper` is optional for local development. When it's
    absent the client will return a clear error payload instead of raising at
    import time so the API can start normally.
    """

    _models: Dict[str, "WhisperModel"] = {}
    _lock = Lock()

    @staticmethod
    def model_name() -> str:
        return settings.WHISPER_MODEL

    @staticmethod
    def device() -> str:
        return settings.WHISPER_DEVICE

    @staticmethod
    def compute_type() -> str:
        return settings.WHISPER_COMPUTE_TYPE

    @classmethod
    def _get_model(cls, model: Optional[str] = None):
        if not _WHISPER_AVAILABLE:
            raise RuntimeError("faster_whisper is not installed")

        name = model or cls.model_name()

        if name not in cls._models:
            with cls._lock:
                if name not in cls._models:
                    cls._models[name] = WhisperModel(
                        name,
                        device=cls.device(),
                        compute_type=cls.compute_type(),
                    )

        return cls._models[name]

    @classmethod
    def transcribe(
        cls,
        audio_path: str,
        model: Optional[str] = None,
        language: Optional[str] = None,
    ) -> Dict[str, Any]:
        if not _WHISPER_AVAILABLE:
            return {
                "success": False,
                "error": "faster_whisper package not available",
                "model": model or cls.model_name(),
            }

        model = model or cls.model_name()
        path = Path(audio_path)

        if not path.exists():
            return {
                "success": False,
                "error": f"Audio file not found: {audio_path}",
                "model": model,
            }

        try:
            whisper_model = cls._get_model(model)
            segments, info = whisper_model.transcribe(
                str(path),
                language=language,
                vad_filter=True,
            )
            transcript = "".join(segment.text for segment in segments).strip()

            if not transcript:
                return {
                    "success": False,
                    "error": "Transcription returned empty text",
                    "language": info.language,
                    "model": model,
                }

            return {
                "success": True,
                "transcript": transcript,
                "language": info.language,
                "model": model,
            }

        except Exception as exc:
            return {
                "success": False,
                "error": str(exc),
                "model": model,
            }

    @classmethod
    def health_check(cls) -> bool:
        if not _WHISPER_AVAILABLE:
            return False
        try:
            cls._get_model()
            return True
        except Exception:
            return False
