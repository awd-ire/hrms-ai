import json
import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path
from threading import Lock
from typing import Any


_LOG_DIR = Path(__file__).resolve().parents[1] / "logs"
_LOCK = Lock()
_LOGGERS: dict[str, logging.Logger] = {}


def _get_logger(name: str, file_name: str) -> logging.Logger:
    with _LOCK:
        if name in _LOGGERS:
            return _LOGGERS[name]

        _LOG_DIR.mkdir(parents=True, exist_ok=True)
        logger = logging.getLogger(name)
        logger.setLevel(logging.INFO)
        logger.propagate = False

        log_file = _LOG_DIR / file_name

        if not any(
            isinstance(handler, RotatingFileHandler)
            and Path(getattr(handler, "baseFilename", "")) == log_file
            for handler in logger.handlers
        ):
            handler = RotatingFileHandler(
                log_file,
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

        _LOGGERS[name] = logger
        return logger


def log_ai_interview_event(action: str, **details: Any) -> None:
    logger = _get_logger("hrms.ai_interview", "ai_interview.log")
    payload = {
        "action": action,
        **details,
    }
    logger.info(json.dumps(payload, ensure_ascii=False, default=str))


def get_ai_interview_log_path() -> Path:
    _get_logger("hrms.ai_interview", "ai_interview.log")
    return _LOG_DIR / "ai_interview.log"


def log_ui_click_event(action: str, **details: Any) -> None:
    logger = _get_logger("hrms.ui_clicks", "ui_clicks.log")
    payload = {
        "action": action,
        **details,
    }
    logger.info(json.dumps(payload, ensure_ascii=False, default=str))


def get_ui_click_log_path() -> Path:
    _get_logger("hrms.ui_clicks", "ui_clicks.log")
    return _LOG_DIR / "ui_clicks.log"
