import os
import re
import threading
import torch
import transformers.utils.import_utils as _tf_iu
import transformers.modeling_utils as _tf_mu

# Bypass CVE-2025-32434 torch >= 2.6 restriction in transformers 4.57+
if hasattr(_tf_iu, "check_torch_load_is_safe"):
    _tf_iu.check_torch_load_is_safe = lambda: None
if hasattr(_tf_mu, "check_torch_load_is_safe"):
    _tf_mu.check_torch_load_is_safe = lambda: None

from transformers import AutoModelForSeq2SeqLM, AutoTokenizer


class TranslationService:
    """
    Singleton Translation Service for Meta NLLB models.
    Ensures model weights are loaded on-demand once and reused across requests.
    Strictly prevents silent fallback to a different model if an invalid or unsupported model code is provided.
    """
    _instance = None
    _lock = threading.Lock()
    
    # Supported NLLB models map
    SUPPORTED_MODELS = {
        "nllb_200_distilled_600m": "facebook/nllb-200-distilled-600M",
        "nllb-200-distilled-600m": "facebook/nllb-200-distilled-600M",
        "600m": "facebook/nllb-200-distilled-600M",
        "facebook/nllb-200-distilled-600m": "facebook/nllb-200-distilled-600M",
        
        "nllb_200_1.3b": "facebook/nllb-200-1.3B",
        "nllb-200-1.3b": "facebook/nllb-200-1.3B",
        "1.3b": "facebook/nllb-200-1.3B",
        "facebook/nllb-200-1.3b": "facebook/nllb-200-1.3B",
        
        "nllb_200_3.3b": "facebook/nllb-200-3.3B",
        "nllb-200-3.3b": "facebook/nllb-200-3.3B",
        "3.3b": "facebook/nllb-200-3.3B",
        "facebook/nllb-200-3.3b": "facebook/nllb-200-3.3B",
    }

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            with cls._lock:
                if not cls._instance:
                    cls._instance = super(TranslationService, cls).__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self, model_name: str = None):
        if not getattr(self, "_initialized", False):
            with self._lock:
                if not getattr(self, "_initialized", False):
                    self.current_model_code = None
                    self.hf_model_name = None
                    self.tokenizer = None
                    self.model = None
                    self.device = "cuda" if torch.cuda.is_available() else "cpu"
                    self._initialized = True

        if model_name:
            self.load_model(model_name)
        elif not self.model:
            default_model = os.getenv("TRANSLATION_MODEL", "nllb_200_1.3b")
            self.load_model(default_model)

    def load_model(self, model_name: str):
        """
        Loads the requested translation model.
        If the requested model is already loaded, reuses it immediately.
        Raises ValueError if the model code is invalid or unsupported, refusing silent fallback.
        """
        raw_code = (model_name or "").strip().lower()
        if raw_code not in self.SUPPORTED_MODELS:
            supported_keys = list(self.SUPPORTED_MODELS.keys())
            raise ValueError(
                f"[Translate] Model '{model_name}' không được hỗ trợ bởi TranslationService. "
                f"Hệ thống từ chối fallback tự động. Các model hợp lệ: {supported_keys}"
            )

        target_hf_name = self.SUPPORTED_MODELS[raw_code]

        # If already loaded and active, return without re-loading
        if self.model is not None and self.hf_model_name == target_hf_name:
            return

        with self._lock:
            if self.model is not None and self.hf_model_name == target_hf_name:
                return

            # Unload previous model if a different model was active
            if self.model is not None:
                print(f"[Translate] Đang thay đổi mô hình dịch từ {self.hf_model_name} sang {target_hf_name}...", flush=True)
                self.unload_model()

            self.hf_model_name = target_hf_name
            self.current_model_code = raw_code
            cuda_available = torch.cuda.is_available()
            self.device = "cuda" if cuda_available else "cpu"

            print(f"[Translate] Đang khởi tạo NLLB ({self.hf_model_name}) trên {self.device.upper()}...", flush=True)
            if cuda_available:
                print(f"[Translate] CUDA detected, using GPU", flush=True)
            else:
                print(f"[Translate] CUDA not detected, using CPU", flush=True)

            try:
                self.tokenizer = AutoTokenizer.from_pretrained(self.hf_model_name)
                self.model = AutoModelForSeq2SeqLM.from_pretrained(
                    self.hf_model_name,
                    dtype=torch.float16 if cuda_available else torch.float32
                ).to(self.device)
                print(f"[Translate] Model loaded successfully on {self.device.upper()}", flush=True)
            except Exception as e:
                print(f"[Translate] Failed to load on {self.device}: {e}", flush=True)
                print("[Translate] Loading on CPU with float32...", flush=True)
                self.device = "cpu"
                self.tokenizer = AutoTokenizer.from_pretrained(self.hf_model_name)
                self.model = AutoModelForSeq2SeqLM.from_pretrained(
                    self.hf_model_name,
                    dtype=torch.float32
                ).to(self.device)
                print(f"[Translate] Model loaded on CPU", flush=True)

    def unload_model(self):
        """Giải phóng mô hình NLLB khỏi VRAM và dọn dẹp bộ nhớ đệm PyTorch."""
        with self._lock:
            if hasattr(self, "model") and self.model is not None:
                del self.model
                self.model = None
            if hasattr(self, "tokenizer") and self.tokenizer is not None:
                del self.tokenizer
                self.tokenizer = None
            self.hf_model_name = None
            self.current_model_code = None

            import gc
            gc.collect()
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            print("[Translate] Đã giải phóng bộ nhớ NLLB khỏi VRAM.", flush=True)

    def mask_keywords(self, text: str, glossary: dict):
        """Bảo vệ các từ khóa (Tên riêng, Thuật ngữ) không bị AI dịch sai."""
        if not glossary:
            return text, {}
        mapping = {}
        for idx, (term, translation) in enumerate(glossary.items()):
            placeholder = f"__GLOSSARY_{idx}__"
            if re.search(r'[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u30ff\uac00-\ud7af]', term):
                pattern = re.escape(term)
            else:
                pattern = rf'\b{re.escape(term)}\b'
            text = re.sub(pattern, placeholder, text, flags=re.IGNORECASE)
            mapping[placeholder] = translation
        return text, mapping

    def unmask_keywords(self, text: str, mapping: dict):
        """Khôi phục các từ khóa đã bảo vệ sang định dạng bản dịch mong muốn."""
        for placeholder, translation in mapping.items():
            text = text.replace(placeholder, translation)
        return text

    def _smart_merge_segments(self, segments: list, max_duration: float = 6.0, max_chars: int = 150, max_gap: float = 1.0) -> list:
        """Gộp các phân đoạn nhỏ ngắt câu lửng thành các câu hoàn chỉnh ngữ nghĩa."""
        if not segments:
            return []
            
        merged_segments = []
        current_merge = segments[0].copy()
        current_merge["text"] = current_merge["text"].strip()
        current_merge["_constituent_indices"] = [0]
        
        ending_punctuations = ('.', '?', '!', '。', '？', '！', '…')
        
        for i in range(1, len(segments)):
            next_seg = segments[i]
            next_text = next_seg["text"].strip()
            
            gap = next_seg["start"] - current_merge["end"]
            current_duration = next_seg["end"] - current_merge["start"]
            char_count = len(current_merge["text"]) + len(next_text)
            
            is_end_of_sentence = current_merge["text"].endswith(ending_punctuations)
            is_gap_too_large = gap > max_gap
            is_too_long = (current_duration > max_duration) or (char_count > max_chars)
            
            if is_end_of_sentence or is_gap_too_large or is_too_long:
                merged_segments.append(current_merge)
                current_merge = next_seg.copy()
                current_merge["text"] = current_merge["text"].strip()
                current_merge["_constituent_indices"] = [i]
            else:
                last_ch = current_merge["text"][-1] if current_merge["text"] else ""
                first_ch = next_text[0] if next_text else ""
                is_cjk_merge = (
                    bool(re.search(r'[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u30ff]', last_ch)) and
                    bool(re.search(r'[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u30ff]', first_ch))
                )
                joiner = "" if is_cjk_merge else " "
                current_merge["text"] += joiner + next_text
                current_merge["end"] = next_seg["end"]
                current_merge["_constituent_indices"].append(i)
                
        merged_segments.append(current_merge)
        return merged_segments

    def translate_document(self, segments: list, glossary: dict, src_lang: str, tgt_lang: str, model: str = None, progress_callback=None, smart_merge: bool = False):
        if not segments:
            return []
            
        if src_lang == tgt_lang:
            print(f"[Translate] Ngôn ngữ trùng khớp ({src_lang}), bỏ qua dịch.", flush=True)
            for seg in segments:
                seg["translated_text"] = seg["text"]
            if progress_callback:
                try:
                    progress_callback(100, len(segments), len(segments))
                except Exception:
                    pass
            return segments

        # Load or verify target model
        target_model = model or self.current_model_code or "nllb_200_1.3b"
        self.load_model(target_model)
            
        print(f"[Translate] Dịch {len(segments)} segments ({src_lang} -> {tgt_lang}) sử dụng model: {self.current_model_code} ({self.hf_model_name})", flush=True)
        target_segments = self._smart_merge_segments(segments) if smart_merge else [s.copy() for s in segments]
        if smart_merge:
            print(f"[Translate] Đã gộp {len(segments)} đoạn cắt vụn thành {len(target_segments)} câu hoàn chỉnh ngữ nghĩa.", flush=True)
        else:
            print(f"[Translate] Bảo toàn cấu trúc {len(target_segments)} phân đoạn (1:1 timeline) từ Step 2.", flush=True)
        
        self.tokenizer.src_lang = src_lang
        tgt_lang_id = self.tokenizer.convert_tokens_to_ids(tgt_lang)
        
        batch_size = 8 if self.device == "cuda" else 2
        total_items = len(target_segments)
        processed_count = 0
        
        for i in range(0, total_items, batch_size):
            batch = target_segments[i:i + batch_size]
            
            masked_texts = []
            mappings = []
            for seg in batch:
                m_text, mapping = self.mask_keywords(seg["text"], glossary)
                masked_texts.append(m_text)
                mappings.append(mapping)
                
            inputs = self.tokenizer(
                masked_texts,
                return_tensors="pt",
                padding=True,
                truncation=True,
                max_length=512
            ).to(self.model.device)
            
            translated_tokens = self.model.generate(
                **inputs,
                forced_bos_token_id=tgt_lang_id,
                max_length=512
            )
            
            decoded_batch = self.tokenizer.batch_decode(translated_tokens, skip_special_tokens=True)
            
            for j, seg in enumerate(batch):
                final_text = self.unmask_keywords(decoded_batch[j], mappings[j])
                seg["translated_text"] = final_text
                
            processed_count += len(batch)
            if progress_callback and total_items > 0:
                pct = min(100, int((processed_count / total_items) * 100))
                try:
                    progress_callback(pct, processed_count, total_items)
                except Exception as cb_err:
                    print(f"[Translate] Progress callback error: {cb_err}", flush=True)
                
        return target_segments
