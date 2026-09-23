# app/services/llm_service.py - Free-tier First LLM Strategy (Ollama Local GPU + Gemini Free + Heuristic Fallback)
import logging
import json
import urllib.request
import urllib.error
from typing import List, Dict, Any, Optional
from abc import ABC, abstractmethod

from app.core.config import (
    OLLAMA_BASE_URL,
    OLLAMA_MODEL,
    GEMINI_API_KEY,
    GROQ_API_KEY,
    OPENAI_API_KEY,
)

logger = logging.getLogger("app.services.llm_service")


class BaseLLMProvider(ABC):
    @abstractmethod
    def generate_response(self, prompt: str, system_prompt: Optional[str] = None) -> Optional[str]:
        pass

    @abstractmethod
    def is_available(self) -> bool:
        pass


class OllamaLocalProvider(BaseLLMProvider):
    """
    Local GPU LLM execution via Ollama (DeepSeek-R1 / Qwen2.5).
    100% Free, unlimited, runs directly on RTX 4060.
    """
    def __init__(self, base_url: str = OLLAMA_BASE_URL, model: str = OLLAMA_MODEL):
        self.base_url = base_url.rstrip("/")
        self.model = model

    def is_available(self) -> bool:
        try:
            req = urllib.request.Request(f"{self.base_url}/api/tags", headers={"User-Agent": "VidNova"})
            with urllib.request.urlopen(req, timeout=1.5) as resp:
                return resp.status == 200
        except Exception:
            return False

    def generate_response(self, prompt: str, system_prompt: Optional[str] = None) -> Optional[str]:
        url = f"{self.base_url}/api/generate"
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
        }
        if system_prompt:
            payload["system"] = system_prompt

        try:
            data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=30) as resp:
                result = json.loads(resp.read().decode("utf-8"))
                return result.get("response", "").strip()
        except Exception as e:
            logger.warning(f"[OllamaProvider] Inference error: {e}")
            return None


class GeminiFreeCloudProvider(BaseLLMProvider):
    """
    Google Gemini Flash Free Tier via Google AI Studio API.
    15 Requests/Min, 1,500 Requests/Day Free, fast and excellent Vietnamese comprehension.
    """
    def __init__(self, api_key: Optional[str] = GEMINI_API_KEY):
        self.api_key = api_key

    def is_available(self) -> bool:
        return bool(self.api_key and len(self.api_key) > 10)

    def generate_response(self, prompt: str, system_prompt: Optional[str] = None) -> Optional[str]:
        if not self.is_available():
            return None
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={self.api_key}"
        parts = []
        if system_prompt:
            parts.append({"text": f"Instruction: {system_prompt}\n\n"})
        parts.append({"text": prompt})

        payload = {
            "contents": [{
                "parts": parts
            }],
            "generationConfig": {
                "temperature": 0.3,
                "maxOutputTokens": 2048,
            }
        }
        try:
            data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=15) as resp:
                res_json = json.loads(resp.read().decode("utf-8"))
                candidates = res_json.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        return parts[0].get("text", "").strip()
        except Exception as e:
            logger.warning(f"[GeminiFreeCloudProvider] API error: {e}")
        return None


class GroqFreeCloudProvider(BaseLLMProvider):
    """
    Groq Cloud Free Tier (Llama-3.3-70b-versatile).
    Very fast speed.
    """
    def __init__(self, api_key: Optional[str] = GROQ_API_KEY):
        self.api_key = api_key

    def is_available(self) -> bool:
        return bool(self.api_key and len(self.api_key) > 10)

    def generate_response(self, prompt: str, system_prompt: Optional[str] = None) -> Optional[str]:
        if not self.is_available():
            return None
        url = "https://api.groq.com/openai/v1/chat/completions"
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": messages,
            "temperature": 0.3,
        }
        try:
            data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                url,
                data=data,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.api_key}",
                }
            )
            with urllib.request.urlopen(req, timeout=15) as resp:
                res_json = json.loads(resp.read().decode("utf-8"))
                choices = res_json.get("choices", [])
                if choices:
                    return choices[0].get("message", {}).get("content", "").strip()
        except Exception as e:
            logger.warning(f"[GroqFreeCloudProvider] API error: {e}")
        return None


class LLMService:
    """
    Strategy Orchestrator:
    Tự động ưu tiên mô hình Miễn Phí (Ollama Local GPU -> Gemini Free Cloud -> Groq Free Cloud).
    Cho phép người dùng chỉ định cụ thể model_name hoặc tone (giọng điệu/phong cách giải thích).
    Nếu tất cả provider ngoại vi đều chưa cấu hình hoặc lỗi, tự động fallback về Rule-Based Heuristic sạch đẹp.
    """
    def __init__(self):
        self.ollama = OllamaLocalProvider()
        self.gemini = GeminiFreeCloudProvider()
        self.groq = GroqFreeCloudProvider()
        self.providers: List[BaseLLMProvider] = [
            self.ollama,
            self.gemini,
            self.groq,
        ]

    def _resolve_provider(self, model_name: Optional[str]) -> Optional[BaseLLMProvider]:
        if not model_name or model_name.lower() in ("auto", "default"):
            return None
        m = model_name.lower()
        if "ollama" in m or "local" in m or "gpu" in m:
            return self.ollama
        if "gemini" in m or "google" in m:
            return self.gemini
        if "groq" in m or "llama" in m:
            return self.groq
        return None

    def generate_chat_answer(
        self,
        question: str,
        video_title: str,
        citations: List[Dict[str, Any]],
        model_name: Optional[str] = None,
        tone: Optional[str] = None,
    ) -> Optional[str]:
        """
        Synthesize natural, professional conversational answer based on RAG citations.
        Groups citations hierarchically and enforces concise, sticker-free output.
        Adapts tone and explanation methodology as requested by the user.
        """
        if not citations:
            return None

        # Build clean grouped context
        context_lines = []
        for c in citations:
            ts = c.get("timestamp_formatted", "00:00")
            vname = c.get("video_title") or video_title
            pname = c.get("project_name")
            text = c.get("translated_text") or c.get("text", "")
            prefix = f"[{pname} - {vname}]" if pname else (f"[{vname}]" if vname != video_title else "")
            context_lines.append(f"{prefix} [{ts}]: {text}")

        context_str = "\n".join(context_lines)

        tone_instruction = ""
        if tone:
            tone_instruction = f"\n4. Phong cách / Giọng điệu yêu cầu: Áp dụng phong cách '{tone}' (ví dụ: giải thích dễ hiểu, chuyên sâu, hài hước, hoặc trang trọng tuỳ theo yêu cầu này)."

        system_prompt = (
            "Bạn là trợ lý AI chuyên nghiệp phân tích video (VidNova AI Assistant). "
            "Hãy trả lời câu hỏi của người dùng bằng tiếng Việt ngắn gọn, tự nhiên, súc tích và trực tiếp vào trọng tâm. "
            "Nếu người dùng hỏi xin tổng kết/tóm tắt hoặc phương pháp giải thích, hãy trình bày mạch lạc, logic, bám sát các phân đoạn trích xuất. "
            "Quy tắc bắt buộc:\n"
            "1. TUYỆT ĐỐI KHÔNG sử dụng icon, emoji, sticker hay các ký hiệu trang trí (như 🎬, 📁, ✨, 👉, v.v.).\n"
            "2. Tránh lặp đi lặp lại tên file video ở từng dòng. Nếu các đoạn trích cùng 1 video/dự án, hãy nhóm lại rõ ràng.\n"
            "3. BẮT BUỘC giữ các mốc thời gian dạng [mm:ss] để người dùng nhấp vào xem video."
            f"{tone_instruction}"
        )

        user_prompt = (
            f"Phạm vi: {video_title}\n\n"
            f"Các phân đoạn liên quan trích xuất:\n{context_str}\n\n"
            f"Câu hỏi: {question}\n\n"
            f"Trả lời:"
        )

        # 1. If user explicitly picked a model provider, try it first
        targeted_provider = self._resolve_provider(model_name)
        if targeted_provider and targeted_provider.is_available():
            ans = targeted_provider.generate_response(prompt=user_prompt, system_prompt=system_prompt)
            if ans:
                return ans

        # 2. Fallback to priority list (Ollama Local GPU -> Gemini Free Cloud -> Groq Free Cloud)
        for provider in self.providers:
            if provider.is_available():
                ans = provider.generate_response(prompt=user_prompt, system_prompt=system_prompt)
                if ans:
                    return ans

        return None

    def summarize_video_content(
        self,
        video_title: str,
        full_transcript: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Generates structured executive summary and chapters using free LLMs.
        """
        system_prompt = (
            "Bạn là chuyên gia phân tích nội dung video. Hãy tạo một bản tóm tắt súc tích bằng tiếng Việt "
            "cho video được cung cấp. Đưa ra 3-5 ý chính quan trọng (Key Takeaways) kèm kết luận tổng quan."
        )

        user_prompt = (
            f"Tựa đề video: {video_title}\n\n"
            f"Toàn bộ nội dung lời thoại:\n{full_transcript[:8000]}\n\n"
            f"Hãy viết Executive Summary (khoảng 3-4 đoạn ngắn) và Bullet Points các điểm nổi bật nhất."
        )

        for provider in self.providers:
            if provider.is_available():
                summary = provider.generate_response(prompt=user_prompt, system_prompt=system_prompt)
                if summary:
                    return {
                        "provider": provider.__class__.__name__,
                        "summary": summary,
                    }

        return None
