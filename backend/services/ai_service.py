import json
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

    INTERVIEW_QUESTION_COUNT = 2

    @staticmethod
    def _coerce_text(value: Any) -> str:
        if value is None:
            return ""

        if isinstance(value, str):
            return value

        if isinstance(value, list):
            parts = [AIService._coerce_text(item).strip() for item in value]
            return " ".join(part for part in parts if part)

        if isinstance(value, dict):
            for key in ("message", "content", "text", "reply", "answer", "response"):
                nested = value.get(key)
                if isinstance(nested, str) and nested.strip():
                    return nested
            return json.dumps(value, ensure_ascii=False)

        return str(value)

    @staticmethod
    def _normalize_chat_payload(payload: Dict[str, Any], *, default_reply: str) -> Dict[str, Any]:
        reply = AIService._coerce_text(payload.get("reply", default_reply)).strip() or default_reply
        follow_up_questions = payload.get("follow_up_questions", [])
        if not isinstance(follow_up_questions, list):
            follow_up_questions = [follow_up_questions]

        normalized_follow_ups = []
        for item in follow_up_questions:
            text = AIService._coerce_text(item).strip()
            if text:
                normalized_follow_ups.append(text)

        normalized = dict(payload)
        normalized["reply"] = reply
        normalized["follow_up_questions"] = normalized_follow_ups
        return normalized

    @staticmethod
    def _fallback_interview_questions(context: Optional[Dict[str, Any]] = None, total_questions: int = 2) -> List[Dict[str, str]]:
        job = (context or {}).get("job_posting", {}) if context else {}
        title = str(job.get("title", "")).lower()
        requirements = str(job.get("requirements", "")).lower()
        role_hint = f"{title} {requirements}".strip()

        if any(keyword in role_hint for keyword in ["developer", "engineer", "software", "backend", "frontend", "full stack", "full-stack"]):
            base_questions = [
                {"question": "Tell me about the most recent system or feature you built.", "guidance": "Focus on scope, your role, and the outcome."},
                {"question": "How do you approach debugging a production issue?", "guidance": "Look for structured thinking and communication."},
                {"question": "Describe how you design an API or service for scalability.", "guidance": "Assess architecture and trade-offs."},
                {"question": "What is your experience with databases and data modeling?", "guidance": "Check practical depth."},
                {"question": "Tell me about a difficult technical decision you had to make.", "guidance": "Look for reasoning and impact."},
            ]
        elif any(keyword in role_hint for keyword in ["hr", "recruit", "talent", "people"]):
            base_questions = [
                {"question": "How do you prioritize candidates when multiple roles are open?", "guidance": "Assess process discipline and stakeholder management."},
                {"question": "Describe your experience coordinating interviews with hiring managers.", "guidance": "Look for scheduling and communication skills."},
                {"question": "How do you handle candidate rejection professionally?", "guidance": "Check empathy and professionalism."},
                {"question": "What tools or workflows do you use to track recruitment pipelines?", "guidance": "Assess operational maturity."},
                {"question": "Tell me about a time you improved a recruitment process.", "guidance": "Look for measurable impact."},
            ]
        elif any(keyword in role_hint for keyword in ["data", "analyst", "analytics", "bi"]):
            base_questions = [
                {"question": "Which data tools and reporting workflows do you use most often?", "guidance": "Assess practical tooling depth."},
                {"question": "How do you validate that your analysis is accurate?", "guidance": "Look for methodology and quality checks."},
                {"question": "Tell me about a report or dashboard you created end-to-end.", "guidance": "Check ownership and impact."},
                {"question": "How do you explain insights to non-technical stakeholders?", "guidance": "Assess communication and clarity."},
                {"question": "Describe a time your analysis changed a business decision.", "guidance": "Look for business impact."},
            ]
        else:
            base_questions = [
                {"question": "Tell me about yourself and what attracted you to this role.", "guidance": "Start broad and role-focused."},
                {"question": "Which part of your experience is most relevant to this position?", "guidance": "Connect background to the job."},
                {"question": "Describe a challenge you solved recently and how you approached it.", "guidance": "Assess problem solving."},
                {"question": "How do you learn a new tool, process, or domain quickly?", "guidance": "Look for adaptability."},
                {"question": "What do you want to achieve in your next role?", "guidance": "Evaluate motivation and alignment."},
            ]

        questions: List[Dict[str, str]] = []
        for item in base_questions[: max(1, total_questions)]:
            questions.append(
                {
                    "question": item["question"],
                    "guidance": item["guidance"],
                }
            )

        return questions

    @staticmethod
    def generate_interview_question_bank(
        context: Optional[Dict[str, Any]] = None,
        total_questions: int = INTERVIEW_QUESTION_COUNT,
    ) -> Dict[str, Any]:
        context_text = json.dumps(context, indent=2) if context else "None"
        messages = [
            {
                "role": "system",
                "content": (
                    "You are a professional HR interviewer. "
                    "Create a short interview question bank tailored to the candidate role. "
                    "Return only JSON."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Context:\n{context_text}\n\n"
                    f"Create exactly {total_questions} concise interview questions in interview order. "
                    "The questions must be based on the candidate's applied job role, job description, requirements, and resume context if available. "
                    'Return JSON in the format: {"questions":[{"question":"...","guidance":"..."}, ...]}'
                ),
            },
        ]

        response = OllamaClient.chat(messages, stream=False, json_format=True)
        if response.get("success"):
            parsed = AIService._parse_json_response(
                response.get("response", ""),
                default={"questions": []},
            )
            questions = parsed.get("questions")
            if isinstance(questions, list) and questions:
                normalized = []
                for item in questions[: max(1, total_questions)]:
                    if isinstance(item, dict) and item.get("question"):
                        normalized.append(
                            {
                                "question": str(item.get("question")),
                                "guidance": str(item.get("guidance", "")),
                            }
                        )

                if normalized:
                    return {"questions": normalized}

        return {"questions": AIService._fallback_interview_questions(context, total_questions)}

    @staticmethod
    def evaluate_interview_session(
        questions: List[Dict[str, Any]],
        answers: List[str],
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        context_text = json.dumps(context, indent=2) if context else "None"
        qa_pairs = []
        for idx, question in enumerate(questions):
            answer = answers[idx] if idx < len(answers) else ""
            qa_pairs.append(
                {
                    "question": question.get("question", ""),
                    "guidance": question.get("guidance", ""),
                    "answer": answer,
                }
            )

        messages = [
            {
                "role": "system",
                "content": (
                    "You are an objective HR interviewer scoring a completed interview. "
                    "Evaluate the full interview session using the role context, questions, and answers. "
                    "Return only JSON."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Context:\n{context_text}\n\n"
                    f"Interview Q&A:\n{json.dumps(qa_pairs, indent=2)}\n\n"
                    'Return JSON: {"score": 0-100, "summary": "...", "recommendation": "...", "next_stage": "advance|reject|hold"}'
                ),
            },
        ]

        response = OllamaClient.chat(messages, stream=False, json_format=True)
        if response.get("success"):
            parsed = AIService._parse_json_response(
                response.get("response", ""),
                default={
                    "score": 0,
                    "summary": "Could not parse interview evaluation",
                    "recommendation": "",
                    "next_stage": "hold",
                },
            )
            return parsed

        return {
            "score": 0,
            "summary": f"Evaluation unavailable: {response.get('error')}",
            "recommendation": "",
            "next_stage": "hold",
            "error": response.get("error"),
        }
    
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

        result = AIService._chat_response(
            messages,
            default={
                "reply": "Could not generate interview chat response",
                "follow_up_questions": [],
            },
        )
        return AIService._normalize_chat_payload(result, default_reply="Could not generate interview chat response")

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
    def transcribe_voice(audio_path: str, language: Optional[str] = "en") -> Dict[str, Any]:
        path = Path(audio_path)
        if not path.exists():
            raise ValueError("Audio file not found on disk")

        def is_low_quality(transcript: str) -> bool:
            normalized = transcript.strip()
            if not normalized:
                return True
            return len(normalized.split()) < 3 or len(normalized) < 12

        attempts = [
            ("whisper", language),
            ("whisper", None),
            ("ollama", language),
            ("ollama", None),
        ]
        best_result: Optional[Dict[str, Any]] = None
        last_error = "Transcription failed"

        for provider, attempt_language in attempts:
            if provider == "whisper":
                result = WhisperClient.transcribe(str(path), language=attempt_language)
            else:
                result = OllamaClient.transcribe(str(path), language=attempt_language)

            transcript = str(result.get("transcript", "")).strip()
            if result.get("success") and transcript:
                payload = {
                    "transcript": transcript,
                    "language": result.get("language"),
                    "audio_path": audio_path,
                }
                if not is_low_quality(transcript):
                    payload["provider"] = provider
                    return payload
                if best_result is None or len(transcript) > len(str(best_result.get("transcript", ""))):
                    best_result = {**payload, "provider": provider}

            if result.get("error"):
                last_error = result.get("error")

        if best_result is not None:
            return best_result

        raise RuntimeError(last_error)

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
