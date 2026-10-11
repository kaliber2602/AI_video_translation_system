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
    HF_TOKEN,
    HERMES_MODEL,
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
    Local GPU LLM execution via Ollama.
    100% Free, runs directly on local GPU/CPU.
    """
    def __init__(self, base_url: str = OLLAMA_BASE_URL, model: str = OLLAMA_MODEL):
        self.base_url = base_url.rstrip("/")
        self.model = model

    def is_available(self) -> bool:
        for candidate_url in [self.base_url, "http://localhost:11434", "http://127.0.0.1:11434", "http://172.18.0.1:11434"]:
            try:
                req = urllib.request.Request(f"{candidate_url}/api/tags", headers={"User-Agent": "VidNova"})
                with urllib.request.urlopen(req, timeout=1.5) as resp:
                    if resp.status == 200:
                        self.base_url = candidate_url
                        return True
            except Exception:
                continue
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


class HermesLLMProvider(BaseLLMProvider):
    """
    Nous Hermes (Hermes-3-Llama-3.1-8B) Reasoning Model running locally via Ollama container
    with fallback to Hugging Face Inference API if configured.
    Renowned for steerability, detailed explanations, and structured video reasoning.
    """
    def __init__(self, base_url: str = OLLAMA_BASE_URL, model: str = "hermes3:8b", token: Optional[str] = HF_TOKEN):
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.token = token

    def is_available(self) -> bool:
        # Check local Ollama container first
        for candidate_url in [self.base_url, "http://ollama:11434", "http://localhost:11434", "http://172.18.0.1:11434"]:
            try:
                req = urllib.request.Request(f"{candidate_url}/api/tags", headers={"User-Agent": "VidNova"})
                with urllib.request.urlopen(req, timeout=1.5) as resp:
                    if resp.status == 200:
                        self.base_url = candidate_url
                        return True
            except Exception:
                continue
        return bool(self.token and len(self.token) > 10)

    def generate_response(self, prompt: str, system_prompt: Optional[str] = None) -> Optional[str]:
        # 1. Primary: Query local GPU Ollama Hermes-3-8b
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
            with urllib.request.urlopen(req, timeout=45) as resp:
                result = json.loads(resp.read().decode("utf-8"))
                ans = result.get("response", "").strip()
                if ans:
                    return ans
        except Exception as e:
            logger.warning(f"[HermesLLMProvider] Local Ollama Hermes-3 inference warning: {e}")

        # 2. Fallback: Hugging Face Inference API if token is valid
        if self.token:
            hf_url = f"https://api-inference.huggingface.co/models/{self.model}/v1/chat/completions"
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            try:
                hf_payload = {"model": self.model, "messages": messages, "temperature": 0.3, "max_tokens": 1024}
                req = urllib.request.Request(
                    hf_url,
                    data=json.dumps(hf_payload).encode("utf-8"),
                    headers={"Content-Type": "application/json", "Authorization": f"Bearer {self.token}"}
                )
                with urllib.request.urlopen(req, timeout=20) as resp:
                    res_json = json.loads(resp.read().decode("utf-8"))
                    choices = res_json.get("choices", [])
                    if choices:
                        return choices[0].get("message", {}).get("content", "").strip()
            except Exception as e:
                logger.warning(f"[HermesLLMProvider] HF Inference error: {e}")
        return None


class LLMService:
    """
    Strategy Orchestrator:
    Tập trung vào 2 mô hình theo yêu cầu hệ thống: Ollama (Local/Self-hosted) & Hermes (Nous Research).
    Nếu provider ngoại vi tạm thời chưa sẵn sàng, tự động chuyển đổi sang Heuristic RAG sạch đẹp.
    """
    def __init__(self):
        self.ollama = OllamaLocalProvider()
        self.hermes = HermesLLMProvider()
        self.providers: List[BaseLLMProvider] = [
            self.ollama,
            self.hermes,
        ]

    def _resolve_provider(self, model_name: Optional[str]) -> Optional[BaseLLMProvider]:
        if not model_name:
            return None
        m = model_name.lower().strip()
        if "hermes" in m or "nous" in m:
            return self.hermes
        if "ollama" in m or "local" in m:
            return self.ollama
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
            if ans and len(ans.strip()) > 10:
                return ans.strip()

        # 2. Try any other configured providers
        for provider in self.providers:
            if provider != targeted_provider and provider.is_available():
                ans = provider.generate_response(prompt=user_prompt, system_prompt=system_prompt)
                if ans and len(ans.strip()) > 10:
                    return ans.strip()

        # 3. Fallback only if no provider responded: present retrieved evidence cleanly without hardcoded heuristics
        snippets = []
        for c in citations[:4]:
            ts = c.get("timestamp_formatted", "00:00")
            txt = (c.get("translated_text") or c.get("text") or "").strip()
            if txt:
                snippets.append(f"- Mốc [{ts}]: {txt}")
        if snippets:
            return "Dựa trên nội dung trong video:\n\n" + "\n".join(snippets)
        return "Không tìm thấy nội dung liên quan trong video để trả lời câu hỏi này."

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
