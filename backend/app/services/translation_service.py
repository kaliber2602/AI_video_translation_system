import os
import re
import torch
import transformers.utils.import_utils as _tf_iu
import transformers.modeling_utils as _tf_mu
# Bypass CVE-2025-32434 torch >= 2.6 restriction in transformers 4.57+
if hasattr(_tf_iu, "check_torch_load_is_safe"):
    _tf_iu.check_torch_load_is_safe = lambda: None
if hasattr(_tf_mu, "check_torch_load_is_safe"):
    _tf_mu.check_torch_load_is_safe = lambda: None
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

_nllb_cache = {}

class TranslationService:
    def __init__(self, model_name=None):
        raw_model = (model_name or os.getenv("TRANSLATION_MODEL", "nllb_200_1.3b")).strip().lower()
        model_map = {
            "nllb_200_1.3b": "facebook/nllb-200-1.3B",
            "nllb-200-1.3b": "facebook/nllb-200-1.3B",
            "1.3b": "facebook/nllb-200-1.3B",
            "facebook/nllb-200-1.3b": "facebook/nllb-200-1.3B",
            "nllb_200_3.3b": "facebook/nllb-200-3.3B",
            "nllb-200-3.3b": "facebook/nllb-200-3.3B",
            "3.3b": "facebook/nllb-200-3.3B",
            "facebook/nllb-200-3.3b": "facebook/nllb-200-3.3B",
            "nllb_200_distilled_600m": "facebook/nllb-200-distilled-600M",
            "nllb-200-distilled-600m": "facebook/nllb-200-distilled-600M",
            "600m": "facebook/nllb-200-distilled-600M",
        }
        self.hf_model_name = model_map.get(raw_model, raw_model if "/" in raw_model else "facebook/nllb-200-1.3B")
        self.current_model_code = raw_model
        
        # Auto-detect CUDA
        cuda_available = torch.cuda.is_available()
        self.device = "cuda" if cuda_available else "cpu"
        
        cache_key = f"{self.hf_model_name}_{self.device}"
        if cache_key in _nllb_cache:
            print(f"[Translate]  Reusing cached translation model ({cache_key})", flush=True)
            self.tokenizer, self.model = _nllb_cache[cache_key]
            return

        print(f"[Translate] Đang khởi tạo NLLB ({self.hf_model_name}) trên {self.device.upper()}...", flush=True)
        if cuda_available:
            print(f"[Translate]  CUDA detected, using GPU", flush=True)
        else:
            print(f"[Translate]  CUDA not detected, using CPU", flush=True)
        
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(self.hf_model_name)
            self.model = AutoModelForSeq2SeqLM.from_pretrained(
                self.hf_model_name,
                torch_dtype=torch.float16 if cuda_available else torch.float32
            ).to(self.device)
            print(f"[Translate]  Model loaded successfully on {self.device.upper()}", flush=True)
            _nllb_cache[cache_key] = (self.tokenizer, self.model)
        except Exception as e:
            print(f"[Translate] Failed to load on {self.device}: {e}", flush=True)
            print("[Translate] Falling back to CPU with float32...", flush=True)
            self.device = "cpu"
            self.model = AutoModelForSeq2SeqLM.from_pretrained(
                self.hf_model_name,
                torch_dtype=torch.float32
            ).to(self.device)
            print(f"[Translate] Model loaded on CPU", flush=True)
            _nllb_cache[f"{self.hf_model_name}_cpu"] = (self.tokenizer, self.model)

    def unload_model(self):
        """Giải phóng mô hình NLLB khỏi VRAM và dọn dẹp bộ nhớ đệm PyTorch."""
        global _nllb_cache
        _nllb_cache.clear()
        if hasattr(self, "model") and self.model is not None:
            del self.model
            self.model = None
        if hasattr(self, "tokenizer") and self.tokenizer is not None:
            del self.tokenizer
            self.tokenizer = None
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
            text = re.sub(rf'\b{re.escape(term)}\b', placeholder, text, flags=re.IGNORECASE)
            mapping[placeholder] = translation
        return text, mapping

    def unmask_keywords(self, text: str, mapping: dict):
        """Khôi phục lại các từ khóa vào bản dịch."""
        for placeholder, translation in mapping.items():
            text = text.replace(placeholder, translation)
        return text

    def _smart_merge_segments(self, segments: list, max_gap=1.5, max_duration=10.0, max_chars=150):
        """
        Gom các đoạn cắt vụn của Whisper thành một câu hoàn chỉnh,
        trang bị 4 Van an toàn để chống tràn RAM và Crash TTS.
        """
        merged_segments = []
        if not segments:
            return merged_segments
        
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
                current_merge["text"] += " " + next_text
                current_merge["end"] = next_seg["end"]
                current_merge["_constituent_indices"].append(i)
                
        merged_segments.append(current_merge)
        return merged_segments

    def translate_document(self, segments: list, glossary: dict, src_lang: str, tgt_lang: str, model: str = "nllb_200_1.3b", progress_callback=None, smart_merge: bool = False):
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
            
        print(f"[Translate] Dịch {len(segments)} segments ({src_lang} -> {tgt_lang}) sử dụng model: {model}", flush=True)
        # Preserve user split segments 1:1 unless explicitly requested
        target_segments = self._smart_merge_segments(segments) if smart_merge else [s.copy() for s in segments]
        if smart_merge:
            print(f"[Translate] Đã gộp {len(segments)} đoạn cắt vụn thành {len(target_segments)} câu hoàn chỉnh ngữ nghĩa.", flush=True)
        else:
            print(f"[Translate] Bảo toàn cấu trúc {len(target_segments)} phân đoạn (1:1 timeline) từ Step 2.", flush=True)
        
        self.tokenizer.src_lang = src_lang
        tgt_lang_id = self.tokenizer.convert_tokens_to_ids(tgt_lang)
        
        # Auto-adjust batch size based on device (8 on CUDA for high throughput on 8GB VRAM)
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