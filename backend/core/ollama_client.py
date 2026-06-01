import json
import mimetypes
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests

from config import settings


class OllamaClient:
    """HTTP client for local Ollama inference."""

    @staticmethod
    def base_url() -> str:
        return settings.OLLAMA_URL.rstrip("/")

    @staticmethod
    def default_model() -> str:
        return settings.OLLAMA_MODEL

    @staticmethod
    def whisper_model() -> str:
        return settings.OLLAMA_WHISPER_MODEL

    @staticmethod
    def _headers() -> Dict[str, str]:
        return {"Content-Type": "application/json"}

    @staticmethod
    def generate(
        prompt: str,
        model: Optional[str] = None,
        stream: bool = False,
        json_format: bool = True,
    ) -> Dict[str, Any]:
        model = model or OllamaClient.default_model()
        url = f"{OllamaClient.base_url()}/api/generate"

        payload: Dict[str, Any] = {
            "model": model,
            "prompt": prompt,
            "stream": stream,
        }
        if json_format:
            payload["format"] = "json"

        try:
            response = requests.post(
                url,
                json=payload,
                headers=OllamaClient._headers(),
                timeout=300,
            )
            response.raise_for_status()

            if stream:
                full_response = ""
                for line in response.iter_lines():
                    if line:
                        chunk = json.loads(line)
                        full_response += chunk.get("response", "")
                        if chunk.get("done"):
                            break

                return {
                    "success": True,
                    "response": full_response,
                    "model": model,
                }

            data = response.json()
            return {
                "success": True,
                "response": data.get("response", ""),
                "model": model,
            }

        except requests.exceptions.RequestException as exc:
            return {
                "success": False,
                "error": str(exc),
                "model": model,
            }

    @staticmethod
    def chat(
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        stream: bool = False,
        json_format: bool = True,
    ) -> Dict[str, Any]:
        model = model or OllamaClient.default_model()
        url = f"{OllamaClient.base_url()}/api/chat"

        payload: Dict[str, Any] = {
            "model": model,
            "messages": messages,
            "stream": stream,
        }
        if json_format:
            payload["format"] = "json"

        try:
            response = requests.post(
                url,
                json=payload,
                headers=OllamaClient._headers(),
                timeout=300,
            )
            response.raise_for_status()

            if stream:
                full_response = ""
                for line in response.iter_lines():
                    if line:
                        chunk = json.loads(line)
                        message = chunk.get("message", {})
                        full_response += message.get("content", "")
                        if chunk.get("done"):
                            break

                return {
                    "success": True,
                    "response": full_response,
                    "model": model,
                }

            data = response.json()
            message = data.get("message", {})
            return {
                "success": True,
                "response": message.get("content", ""),
                "model": model,
            }

        except requests.exceptions.RequestException as exc:
            return {
                "success": False,
                "error": str(exc),
                "model": model,
            }

    @staticmethod
    def transcribe(
        audio_path: str,
        model: Optional[str] = None,
        language: Optional[str] = None,
    ) -> Dict[str, Any]:
        model = model or OllamaClient.whisper_model()
        path = Path(audio_path)
        mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"

        form_data: Dict[str, str] = {"model": model}
        if language:
            form_data["language"] = language

        errors: List[str] = []

        for endpoint in ("/v1/audio/transcriptions", "/api/transcribe"):
            try:
                with path.open("rb") as handle:
                    response = requests.post(
                        f"{OllamaClient.base_url()}{endpoint}",
                        data=form_data,
                        files={"file": (path.name, handle, mime)},
                        timeout=300,
                    )

                if not response.ok:
                    errors.append(f"{endpoint}: HTTP {response.status_code}")
                    continue

                data = response.json()
                transcript = (data.get("text") or "").strip()
                if transcript:
                    return {
                        "success": True,
                        "transcript": transcript,
                        "language": data.get("language"),
                        "model": model,
                    }

                errors.append(f"{endpoint}: empty transcript")

            except requests.exceptions.RequestException as exc:
                errors.append(f"{endpoint}: {exc}")

        return {
            "success": False,
            "error": (
                "Ollama transcription failed. Ensure Ollama is running and pull a "
                f"Whisper model: ollama pull {model}. "
                f"Details: {'; '.join(errors)}"
            ),
            "model": model,
        }

    @staticmethod
    def embeddings(text: str, model: Optional[str] = None) -> Dict[str, Any]:
        model = model or OllamaClient.default_model()
        url = f"{OllamaClient.base_url()}/api/embeddings"

        try:
            response = requests.post(
                url,
                json={"model": model, "prompt": text},
                headers=OllamaClient._headers(),
                timeout=60,
            )
            response.raise_for_status()
            data = response.json()
            return {
                "success": True,
                "embedding": data.get("embedding", []),
                "model": model,
            }

        except requests.exceptions.RequestException as exc:
            return {
                "success": False,
                "error": str(exc),
                "model": model,
            }

    @staticmethod
    def list_models() -> Dict[str, Any]:
        url = f"{OllamaClient.base_url()}/api/tags"

        try:
            response = requests.get(
                url,
                headers=OllamaClient._headers(),
                timeout=10,
            )
            response.raise_for_status()
            data = response.json()
            models = [model.get("name") for model in data.get("models", [])]

            return {
                "success": True,
                "models": models,
            }

        except requests.exceptions.RequestException as exc:
            return {
                "success": False,
                "error": str(exc),
                "models": [],
            }

    @staticmethod
    def health_check() -> bool:
        try:
            response = requests.get(
                f"{OllamaClient.base_url()}/api/tags",
                timeout=5,
            )
            return response.status_code == 200
        except requests.exceptions.RequestException:
            return False
