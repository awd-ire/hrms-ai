import json
import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path
from threading import Lock
from typing import Any


_LOGGER_NAME = "hrms.ai_interview"
_LOG_DIR = Path(__file__).resolve().parents[1] / "logs"
_LOG_FILE = _LOG_DIR / "ai_interview.log"
_LOCK = Lock()
_LOGGER: logging.Logger | None = None


def _ensure_logger() -> logging.Logger:
    global _LOGGER

    with _LOCK:
        if _LOGGER is not None:
            return _LOGGER

        _LOG_DIR.mkdir(parents=True, exist_ok=True)
        logger = logging.getLogger(_LOGGER_NAME)
        logger.setLevel(logging.INFO)
        logger.propagate = False

        if not any(
            isinstance(handler, RotatingFileHandler) and Path(getattr(handler, "baseFilename", "")) == _LOG_FILE
            for handler in logger.handlers
        ):
            handler = RotatingFileHandler(
                _LOG_FILE,
                maxBytes=1_000_000,
                backupCount=5,
                encoding="utf-8",
            )
            handler.setFormatter(
                logging.Formatter(
                    "%(asctime)s | %(levelname)s | %(message)s",
                    datefmt="%Y-%m-%d %H:%M:%S",
                )
            )
            logger.addHandler(handler)

        _LOGGER = logger
        return logger


def log_ai_interview_event(action: str, **details: Any) -> None:
    logger = _ensure_logger()
    payload = {
        "action": action,
        **details,
    }
    logger.info(json.dumps(payload, ensure_ascii=False, default=str))


def get_ai_interview_log_path() -> Path:
    _ensure_logger()
    return _LOG_FILE
