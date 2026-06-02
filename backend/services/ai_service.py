import json
import re
from pathlib import Path
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from core.ollama_client import OllamaClient
from core.resume_upload import extract_resume_text, save_resume_file
from core.whisper_client import WhisperClient


class AIService:
    """Service layer for AI inference operations"""
    
    @staticmethod
    def get_status(db: Session) -> Dict[str, Any]:
        """Get AI service status"""
        is_healthy = OllamaClient.health_check()
        
        if not is_healthy:
            return {
                "status": "unavailable",
                "provider": "ollama",
                "url": OllamaClient.base_url(),
                "model": OllamaClient.default_model(),
                "message": (
                    "Ollama is not running. Start it locally with: ollama serve"
                ),
            }
        
        models_response = OllamaClient.list_models()
        
        if models_response.get("success"):
            models = models_response.get("models", [])
            chat_model = OllamaClient.default_model()

            return {
                "status": "ready",
                "provider": "ollama",
                "url": OllamaClient.base_url(),
                "model": chat_model,
                "whisper_model": WhisperClient.model_name(),
                "whisper_provider": "faster-whisper",
                "chat_model_available": any(
                    chat_model in name or name.startswith(chat_model)
                    for name in models
                ),
                "whisper_model_available": True,
                "available_models": models,
                "message": "Local Ollama AI service operational",
            }

        return {
            "status": "error",
            "provider": "ollama",
            "url": OllamaClient.base_url(),
            "model": OllamaClient.default_model(),
            "message": models_response.get("error", "Unknown error"),
        }
    
    @staticmethod
    def analyze_resume(resume_text: str, job_description: Optional[str] = None) -> Dict[str, Any]:
        """
        Analyze a resume against optional job description
        
        Returns:
            {
                "score": float (0-100),
                "summary": str,
                "strengths": list,
                "weaknesses": list,
                "recommendations": list
            }
        """
        prompt = f"""Analyze the following resume and provide structured feedback.

Resume:
{resume_text}

{"Job Description: " + job_description if job_description else ""}

Provide your analysis in this exact JSON format:
{{
    "score": <0-100>,
    "summary": "<one sentence summary>",
    "strengths": ["strength1", "strength2", ...],
    "weaknesses": ["weakness1", "weakness2", ...],
    "recommendations": ["recommendation1", ...]
}}

IMPORTANT: Return ONLY valid JSON, no other text."""
        
        response = OllamaClient.generate(prompt, stream=False)
        
        if not response.get("success"):
            return {
                "score": 0,
                "summary": f"Error analyzing resume: {response.get('error')}",
                "strengths": [],
                "weaknesses": [],
                "recommendations": [],
                "error": response.get("error")
            }
        
        return AIService._parse_json_response(
            response.get("response", ""),
            default={
                "score": 0,
                "summary": "Could not parse analysis",
                "strengths": [],
                "weaknesses": [],
                "recommendations": []
            }
        )
    
    @staticmethod
    def rank_candidates(candidates: List[Dict[str, str]]) -> Dict[str, Any]:
        """
        Rank candidates based on provided information
        
        Args:
            candidates: List of dicts with 'name' and 'profile' keys
            
        Returns:
            {
                "ranked": [
                    {"name": str, "rank": int, "score": float, "reason": str},
                    ...
                ],
                "summary": str
            }
        """
        candidates_text = "\n".join([
            f"- {c.get('name', 'Unknown')}: {c.get('profile', '')}"
            for c in candidates
        ])
        
        prompt = f"""Rank the following candidates from best to worst fit.

Candidates:
{candidates_text}

Provide ranking in this JSON format:
{{
    "ranked": [
        {{"name": "<candidate name>", "rank": 1, "score": <0-100>, "reason": "<why ranked>"}},
        {{"name": "<candidate name>", "rank": 2, "score": <0-100>, "reason": "<why ranked>"}},
        ...
    ],
    "summary": "<overall summary of candidates>"
}}

IMPORTANT: Return ONLY valid JSON."""
        
        response = OllamaClient.generate(prompt, stream=False)
        
        if not response.get("success"):
            return {
                "ranked": [],
                "summary": f"Error ranking candidates: {response.get('error')}",
                "error": response.get("error")
            }
        
        return AIService._parse_json_response(
            response.get("response", ""),
            default={
                "ranked": [],
                "summary": "Could not parse rankings"
            }
        )
    
    @staticmethod
    def screen_resume_file(
        file_content: bytes,
        filename: str,
        job_description: Optional[str] = None,
    ) -> Dict[str, Any]:
        resume_path = save_resume_file(filename, file_content)
        resume_text = extract_resume_text(resume_path)

        if len(resume_text.strip()) < 10:
            raise ValueError(
                "Could not extract enough text from the resume file"
            )

        result = AIService.analyze_resume(resume_text, job_description)
        result["resume_path"] = resume_path
        return result

    @staticmethod
    def screen_existing_resume(
        resume_path: str,
        job_description: Optional[str] = None,
    ) -> Dict[str, Any]:
        resume_text = extract_resume_text(resume_path)

        if len(resume_text.strip()) < 10:
            raise ValueError(
                "Could not extract enough text from the resume file"
            )

        result = AIService.analyze_resume(resume_text, job_description)
        result["resume_path"] = resume_path
        return result

    @staticmethod
    def recruitment_chat(
        message: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        context_text = json.dumps(context, indent=2) if context else "None"

        messages = [
            {
                "role": "system",
                "content": (
                    "You are an HR recruitment assistant. "
                    "Respond only with JSON containing reply and suggestions."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Context:\n{context_text}\n\n"
                    f"Recruiter message:\n{message}\n\n"
                    'Return JSON: {"reply": "...", "suggestions": ["..."]}'
                ),
            },
        ]

        return AIService._chat_response(
            messages,
            default={
                "reply": "Could not generate recruitment chat response",
                "suggestions": [],
            },
        )

    @staticmethod
    def interview_chat(
        message: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        context_text = json.dumps(context, indent=2) if context else "None"

        messages = [
            {
                "role": "system",
                "content": (
                    "You are a professional interview assistant. "
                    "Respond only with JSON containing reply and follow_up_questions."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Context:\n{context_text}\n\n"
                    f"Message:\n{message}\n\n"
                    'Return JSON: {"reply": "...", "follow_up_questions": ["..."]}'
                ),
            },
        ]

        return AIService._chat_response(
            messages,
            default={
                "reply": "Could not generate interview chat response",
                "follow_up_questions": [],
            },
        )

    @staticmethod
    def generate_interview_question(
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        context_text = json.dumps(context, indent=2) if context else "None"
        messages = [
            {
                "role": "system",
                "content": (
                    "You are a professional AI interview conductor. "
                    "Ask one concise interview question at a time. "
                    "Respond only with JSON containing question and guidance."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Context:\n{context_text}\n\n"
                    'Return JSON: {"question": "...", "guidance": "..."}'
                ),
            },
        ]

        return AIService._chat_response(
            messages,
            default={
                "question": "Tell me about yourself and the role you're applying for.",
                "guidance": "Start with a warm, open-ended question.",
            },
        )

    @staticmethod
    def evaluate_interview_turn(
        transcript: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        context_text = json.dumps(context, indent=2) if context else "None"
        messages = [
            {
                "role": "system",
                "content": (
                    "You are an interview evaluator. "
                    "Assess the candidate's answer and decide whether to continue or finish. "
                    "Return only JSON."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Context:\n{context_text}\n\n"
                    f"Transcript:\n{transcript}\n\n"
                    'Return JSON: {"score": 0-100, "summary": "...", "recommendation": "...", "next_stage": "advance|reject|hold", "completed": true|false}'
                ),
            },
        ]

        return AIService._chat_response(
            messages,
            default={
                "score": 0,
                "summary": "Could not evaluate interview turn",
                "recommendation": "",
                "next_stage": "hold",
                "completed": False,
            },
        )

    @staticmethod
    def transcribe_voice(audio_path: str) -> Dict[str, Any]:
        path = Path(audio_path)
        if not path.exists():
            raise ValueError("Audio file not found on disk")

        result = WhisperClient.transcribe(str(path))
        if not result.get("success"):
            raise RuntimeError(result.get("error", "Transcription failed"))

        return {
            "transcript": result.get("transcript", ""),
            "language": result.get("language"),
            "audio_path": audio_path,
        }

    @staticmethod
    def evaluate_interview(
        transcript: str,
        resume_summary: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Evaluate an interview transcript and suggest a score, summary,
        recommendation and next_stage.

        Returns JSON like:
        {
            "score": <0-100>,
            "summary": "...",
            "recommendation": "...",
            "next_stage": "advance|reject|hold"
        }
        """
        context = f"Resume summary:\n{resume_summary}\n\nTranscript:\n{transcript}" if resume_summary else f"Transcript:\n{transcript}"

        prompt = f"""You are an objective HR evaluator. Evaluate the candidate based on the transcript and optional resume summary.

Context:
{context}

Return ONLY valid JSON in this exact format:
{{
  "score": <0-100>,
  "summary": "<one-sentence evaluation>",
  "recommendation": "<short recommendation>",
  "next_stage": "<advance|reject|hold>"
}}

IMPORTANT: Return ONLY JSON."""

        response = OllamaClient.generate(prompt, stream=False)

        if not response.get("success"):
            return {
                "score": 0,
                "summary": "Evaluation failed",
                "recommendation": "",
                "next_stage": "hold",
                "error": response.get("error"),
            }

        return AIService._parse_json_response(
            response.get("response", ""),
            default={
                "score": 0,
                "summary": "Could not parse evaluation",
                "recommendation": "",
                "next_stage": "hold",
            },
        )

    @staticmethod
    def _chat_response(
        messages: List[Dict[str, str]],
        default: Dict[str, Any],
    ) -> Dict[str, Any]:
        response = OllamaClient.chat(messages, stream=False, json_format=True)

        if not response.get("success"):
            return {**default, "error": response.get("error")}

        return AIService._parse_json_response(
            response.get("response", ""),
            default=default,
        )

    @staticmethod
    def _parse_json_response(response_text: str, default: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract and parse JSON from LLM response
        
        Args:
            response_text: Raw response from LLM
            default: Default dict if parsing fails
            
        Returns:
            Parsed JSON dict or default
        """
        # Try to extract JSON from the response
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        
        if not json_match:
            return default
        
        try:
            json_str = json_match.group(0)
            parsed = json.loads(json_str)
            return {**default, **parsed}
        except (json.JSONDecodeError, AttributeError):
            return default
