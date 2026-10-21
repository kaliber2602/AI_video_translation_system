# app/services/llm_service.py - Free-tier First LLM Strategy (Ollama Local GPU + Heuristic Fallback)
import logging
import json
import re
import urllib.request
import urllib.error
from typing import List, Dict, Any, Optional
from abc import ABC, abstractmethod

from langdetect import detect, DetectorFactory

# Enforce deterministic language detection across threads
DetectorFactory.seed = 0

from app.core.config import (
    OLLAMA_BASE_URL,
    OLLAMA_MODEL,
    HF_TOKEN,
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
    Local GPU LLM execution via Ollama container.
    100% Free, runs directly on local GPU/CPU.
    Supports dynamic model switching (e.g. qwen2.5:3b).
    """
    def __init__(self, base_url: str = OLLAMA_BASE_URL, model: str = OLLAMA_MODEL):
        self.base_url = base_url.rstrip("/")
        self.model = model

    def is_available(self, model_name: Optional[str] = None) -> bool:
        check_model = (model_name or self.model or "").lower().strip()
        for candidate_url in [self.base_url, "http://ollama:11434", "http://localhost:11434", "http://127.0.0.1:11434", "http://172.18.0.1:11434"]:
            try:
                req = urllib.request.Request(f"{candidate_url}/api/tags", headers={"User-Agent": "VidNova"})
                with urllib.request.urlopen(req, timeout=2.0) as resp:
                    if resp.status == 200:
                        data = json.loads(resp.read().decode("utf-8"))
                        model_names = [m.get("name", "").lower() for m in data.get("models", [])]
                        if not check_model or any(check_model in m for m in model_names):
                            self.base_url = candidate_url
                            return True
            except Exception:
                continue
        return False

    def generate_response(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        model_name: Optional[str] = None,
        timeout: int = 180,
    ) -> Optional[str]:
        target_model = model_name or self.model
        url = f"{self.base_url}/api/generate"
        payload = {
            "model": target_model,
            "prompt": prompt,
            "stream": False,
        }
        if system_prompt:
            payload["system"] = system_prompt

        try:
            data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
            # 180s timeout to allow local GPU/CPU to thoroughly synthesize full executive paragraphs without premature cutoff
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                result = json.loads(resp.read().decode("utf-8"))
                return result.get("response", "").strip()
        except Exception as e:
            logger.warning(f"[OllamaProvider] Inference error with model {target_model}: {e}")
            return None


class LLMService:
    """
    Strategy Orchestrator:
    Tập trung vào Ollama Local GPU Engine (mặc định model Qwen 2.5 3B).
    Hỗ trợ song ngữ (tiếng Việt, tiếng Anh và ngôn ngữ video) toàn diện.
    """
    def __init__(self):
        self.ollama = OllamaLocalProvider()
        self.providers: List[BaseLLMProvider] = [
            self.ollama,
        ]

    def _detect_language(self, text: str) -> str:
        """
        Phát hiện ngôn ngữ của câu hỏi bằng thư viện chuẩn quốc tế `langdetect`.
        Hỗ trợ nhận diện chính xác tiếng Việt ('vi'), tiếng Anh ('en'), tiếng Nhật ('ja'),
        tiếng Pháp ('fr'), tiếng Trung ('zh-cn'), v.v.
        """
        clean_text = (text or "").strip()
        if not clean_text:
            return "vi"

        try:
            detected_lang = detect(clean_text)
            return detected_lang.lower()
        except Exception as e:
            logger.debug(f"[LLMService] langdetect error for '{clean_text}': {e}")
            return "vi"

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
        Supports dual-language context (original speech & translated subtitles) and mirrors user query language.
        """
        if not citations:
            return None

        # Build clean grouped dual-language context
        context_lines = []
        for c in citations:
            ts = c.get("timestamp_formatted", "00:00")
            vname = c.get("video_title") or video_title
            pname = c.get("project_name")
            orig_text = (c.get("text") or "").strip()
            trans_text = (c.get("translated_text") or "").strip()

            prefix = f"[{pname} - {vname}]" if pname else (f"[{vname}]" if vname != video_title else "")
            
            # Format dual language chunk cleanly:
            if orig_text and trans_text and orig_text.lower() != trans_text.lower():
                context_lines.append(f"{prefix} [{ts}]: {orig_text} (Bản dịch: {trans_text})")
            elif trans_text:
                context_lines.append(f"{prefix} [{ts}]: {trans_text}")
            elif orig_text:
                context_lines.append(f"{prefix} [{ts}]: {orig_text}")

        context_str = "\n".join(context_lines)

        tone_instruction = ""
        if tone:
            tone_instruction = f"\n4. Phong cách / Giọng điệu yêu cầu: Áp dụng phong cách '{tone}' (ví dụ: giải thích dễ hiểu, chuyên sâu, hoặc trang trọng tuỳ theo yêu cầu này)."

        detected_lang = self._detect_language(question)
        if detected_lang == "vi":
            lang_instruction = "NGÔN NGỮ BẮT BUỘC: Bạn PHẢI trả lời hoàn toàn bằng tiếng Việt tự nhiên, súc tích và đúng trọng tâm."
            answer_prefix = "Trả lời bằng tiếng Việt:"
        elif detected_lang == "en":
            lang_instruction = "MANDATORY LANGUAGE: The user asked in English. You MUST reply 100% in fluent English. Do NOT speak Vietnamese."
            answer_prefix = "Answer in English:"
        else:
            lang_instruction = f"MANDATORY LANGUAGE: Match the user inquiry language code '{detected_lang}' precisely. Do NOT fallback to Vietnamese if the user asked in another language."
            answer_prefix = f"Answer in {detected_lang}:"

        system_prompt = (
            "You are VidNova AI, an intelligent video analysis and translation assistant.\n"
            f"{lang_instruction}\n"
            "Rules:\n"
            "1. TUYỆT ĐỐI KHÔNG sử dụng icon, emoji, sticker hay các ký hiệu trang trí (như 🎬, 📁, ✨, 👉, etc.).\n"
            "2. Tránh lặp lại tên file video ở từng dòng. Nhóm các thông tin một cách mạch lạc.\n"
            "3. BẮT BUỘC giữ lại các mốc thời gian dạng [mm:ss] tương ứng từ context để người dùng có thể nhấp vào xem video.\n"
            "4. Analyze both the original speech and translated subtitles to formulate the most accurate answer."
            f"{tone_instruction}"
        )

        user_prompt = (
            f"Scope (Video/Project): {video_title}\n\n"
            f"Transcript Context Chunks:\n{context_str}\n\n"
            f"Question: {question}\n\n"
            f"{answer_prefix}"
        )

        # Standardize target model name (e.g. qwen2.5:3b)
        actual_model = "qwen2.5:3b"
        if model_name:
            m_lower = model_name.lower().strip()
            if "qwen" in m_lower or "3b" in m_lower:
                actual_model = "qwen2.5:3b"
            else:
                actual_model = model_name.strip()

        # Try Ollama with target model
        if self.ollama.is_available(actual_model):
            ans = self.ollama.generate_response(prompt=user_prompt, system_prompt=system_prompt, model_name=actual_model)
            if ans and len(ans.strip()) > 10:
                return ans.strip()

        # Fallback: present retrieved evidence cleanly without hardcoded heuristics
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
        Generates structured executive summary using free LLMs.
        """
        system_prompt = (
            "Bạn là chuyên gia phân tích nội dung video. Hãy tạo một bản tóm tắt súc tích "
            "cho video được cung cấp theo đúng ngôn ngữ chính của video. Đưa ra 3-5 ý chính quan trọng (Key Takeaways) kèm kết luận tổng quan."
        )

        user_prompt = (
            f"Tựa đề video: {video_title}\n\n"
            f"Toàn bộ nội dung lời thoại:\n{full_transcript[:8000]}\n\n"
            f"Hãy viết Executive Summary (khoảng 3-4 đoạn ngắn) và Bullet Points các điểm nổi bật nhất."
        )

        if self.ollama.is_available("qwen2.5:3b"):
            summary = self.ollama.generate_response(prompt=user_prompt, system_prompt=system_prompt, model_name="qwen2.5:3b")
            if summary:
                return {
                    "provider": "OllamaLocalProvider",
                    "summary": summary,
                }

        return None

    def generate_semantic_chapters_and_summary(
        self,
        video_title: str,
        timestamped_dialogue: str,
        video_duration: float = 0.0,
    ) -> Optional[Dict[str, Any]]:
        """
        Interprets transcript with timestamps and generates executive summary, conceptual chapters, and key takeaways.
        Enforces conceptual topic naming (NOT verbatim spoken dialogue) and comprehensive synthesis.
        """
        system_prompt = (
            "Bạn là một chuyên gia phân tích nghiệp vụ và tóm tắt điều hành cao cấp (Senior Executive Business Analyst).\n"
            "Nhiệm vụ của bạn là đọc lời thoại video được gắn mốc thời gian để lập BẢN BÁO CÁO PHÂN TÍCH ĐIỀU HÀNH & PHÂN ĐOẠN CHUYÊN NGHIỆP.\n"
            "QUY TẮC CỐT LÕI BẮT BUỘC:\n"
            "1. TIÊU ĐỀ CHAPTER: TUYỆT ĐỐI KHÔNG sao chép nguyên văn câu nói của speaker. BẮT BUỘC tư duy trừu tượng hóa, đặt tiêu đề chủ đề ngắn gọn (dưới 8 từ) khái quát bản chất vấn đề được thảo luận (ví dụ: 'Bản chất của AI Workflow', 'Quy trình Tự động hóa No-Code', 'Chiến dịch Đa tầng 90% AI', 'Mở rộng và Vận hành').\n"
            "2. PHẠM VI TIMELINE CHAPTER: BẮT BUỘC chia video thành từ 3 đến 5 chapter nối tiếp nhau (mỗi chapter tương ứng với 1 giai đoạn thời lượng từ 30s - 60s), bao phủ toàn bộ thời lượng từ 0.0s đến hết video (ví dụ: Chapter 1: 0.0s -> 45.0s, Chapter 2: 45.0s -> 90.0s, Chapter 3: 90.0s -> hết video). TUYỆT ĐỐI PHẢI TRẢ VỀ ĐỦ TẤT CẢ 3 ĐẾN 5 CHAPTERS TRONG MẢNG 'chapters', KHÔNG ĐƯỢC chỉ trả về 1 chapter duy nhất.\n"
            "3. DIỄN GIẢI CHI TIẾT TỪNG PHÂN ĐOẠN (CHAPTER ANALYSIS):\n"
            "   - 'summary': Viết 1 câu hoặc đoạn ngắn súc tích (1-2 câu) tóm tắt nhanh mục tiêu cốt lõi của chương.\n"
            "   - 'detailed_analysis': Viết đoạn văn phân tích chuyên sâu, diễn giải cặn kẽ (1-2 đoạn văn hoàn chỉnh, từ 80-150 từ) phân tích logic vận hành, cách thức speaker lập luận, các bước kỹ thuật hoặc dẫn chứng thực tế được đề cập trong đoạn đó. Tuyệt đối không copy paste câu thoại thô.\n"
            "   - 'key_points': Mảng 2-4 gạch đầu dòng các luận điểm/bước thực thi chính được nhắc đến trong chương đó.\n"
            "4. TÓM TẮT ĐIỀU HÀNH (EXECUTIVE SUMMARY): Viết 2-3 đoạn văn hoàn chỉnh (full paragraphs) đúc kết bản chất cốt lõi, phương pháp thực thi và giá trị thực tế của toàn bộ video.\n"
            "5. ĐIỂM NỔI BẬT & KHUYẾN NGHỊ (KEY TAKEAWAYS): Danh sách 3-5 gạch đầu dòng các bài học thực tiễn, nguyên lý cốt lõi.\n"
            "6. BỘ CÔNG CỤ ĐỀ CẬP (TECH STACK): Danh sách các công cụ, phần mềm hoặc công nghệ được nhắc đến trong video (ví dụ: Zapier, Make, n8n, Claude, ChatGPT, Gmail).\n"
            "7. Mốc thời gian start_time và end_time tính bằng giây (float hoặc integer), nằm trong khoảng thời lượng video.\n"
            "8. ĐỊNH DẠNG PHẢN HỒI: Trả về cú pháp JSON hợp lệ DUY NHẤT theo schema sau (không thêm lời chào, không bọc text ngoài JSON):\n"
            "{\n"
            '  "executive_summary": "Đoạn 1 (Bản chất)...\\n\\nĐoạn 2 (Phương pháp & Công cụ)...\\n\\nĐoạn 3 (Lộ trình áp dụng)...",\n'
            '  "key_takeaways": ["Ý cốt lõi 1", "Ý cốt lõi 2", "Ý cốt lõi 3"],\n'
            '  "tech_stack": ["Công cụ 1", "Công cụ 2"],\n'
            '  "chapters": [\n'
            '    {\n'
            '      "start_time": 0.0,\n'
            '      "end_time": 45.0,\n'
            '      "title": "Bản chất của AI Workflow",\n'
            '      "summary": "Tóm tắt súc tích bản chất phân đoạn...",\n'
            '      "detailed_analysis": "Đoạn văn diễn giải chi tiết, phân tích cặn kẽ logic, công cụ, cách triển khai...",\n'
            '      "key_points": ["Luận điểm / bước 1", "Luận điểm / bước 2"]\n'
            '    },\n'
            '    {\n'
            '      "start_time": 45.0,\n'
            '      "end_time": 90.0,\n'
            '      "title": "Xây dựng Pipeline No-Code",\n'
            '      "summary": "Tóm tắt bước thực thi tiếp theo...",\n'
            '      "detailed_analysis": "Phân tích chi tiết quy trình kết nối các node tự động hóa...",\n'
            '      "key_points": ["Luận điểm 1", "Luận điểm 2"]\n'
            '    },\n'
            '    {\n'
            '      "start_time": 90.0,\n'
            '      "end_time": 137.0,\n'
            '      "title": "Mở rộng và Tự động hóa Toàn diện",\n'
            '      "summary": "Tóm tắt chiến lược mở rộng...",\n'
            '      "detailed_analysis": "Phân tích việc nhân rộng các bước AI để đạt 90% tự động...",\n'
            '      "key_points": ["Luận điểm 1", "Luận điểm 2"]\n'
            '    }\n'
            '  ]\n'
            "}"
        )

        user_prompt = (
            f"Tiêu đề video: {video_title}\n"
            f"Thời lượng dự kiến: {video_duration}s\n\n"
            f"Danh sách lời thoại có gắn mốc thời gian:\n"
            f"{timestamped_dialogue[:12000]}\n\n"
            "Hãy phân tích nghiệp vụ chuyên sâu và trả về JSON hợp lệ:"
        )

        if self.ollama.is_available("qwen2.5:3b"):
            try:
                response_text = self.ollama.generate_response(
                    prompt=user_prompt,
                    system_prompt=system_prompt,
                    model_name="qwen2.5:3b",
                    timeout=180,
                )
                if response_text:
                    raw = response_text.strip()
                    # Clean markdown code fence if present
                    if "```json" in raw:
                        raw = raw.split("```json", 1)[1].split("```", 1)[0].strip()
                    elif "```" in raw:
                        raw = raw.split("```", 1)[1].split("```", 1)[0].strip()

                    # Locate outermost JSON braces
                    s_idx = raw.find("{")
                    e_idx = raw.rfind("}")
                    if s_idx != -1 and e_idx != -1 and e_idx > s_idx:
                        parsed = json.loads(raw[s_idx:e_idx + 1])
                        if isinstance(parsed, dict) and "chapters" in parsed:
                            return {
                                "provider": "OllamaLocalProvider",
                                "data": parsed,
                            }
            except Exception as e:
                logger.warning(f"[LLMService] Failed to parse chapter generation from Ollama: {e}")

        return None
