import re
import torch
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

class TranslationService:
    def __init__(self):
        print("[Translate] Đang khởi tạo NLLB-1.3B...", flush=True)
        model_name = "facebook/nllb-200-1.3B"
        
        # Auto-detect CUDA
        cuda_available = torch.cuda.is_available()
        self.device = "cuda" if cuda_available else "cpu"
        
        if cuda_available:
            print(f"[Translate] ✅ CUDA detected, using GPU", flush=True)
        else:
            print(f"[Translate] ⚠️ CUDA not detected, using CPU", flush=True)
        
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(model_name)
            self.model = AutoModelForSeq2SeqLM.from_pretrained(
                model_name,
                torch_dtype=torch.float16 if cuda_available else torch.float32
            ).to(self.device)
            print(f"[Translate] ✅ Model loaded successfully on {self.device.upper()}", flush=True)
        except Exception as e:
            print(f"[Translate] ❌ Failed to load on {self.device}: {e}", flush=True)
            print("[Translate] 🔄 Falling back to CPU with float32...", flush=True)
            self.device = "cpu"
            self.model = AutoModelForSeq2SeqLM.from_pretrained(
                model_name,
                torch_dtype=torch.float32
            ).to(self.device)
            print(f"[Translate] ✅ Model loaded on CPU", flush=True)

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
            else:
                current_merge["text"] += " " + next_text
                current_merge["end"] = next_seg["end"]
                
        merged_segments.append(current_merge)
        return merged_segments

    def translate_document(self, segments: list, glossary: dict, src_lang: str, tgt_lang: str):
        if not segments:
            return []
            
        if src_lang == tgt_lang:
            print(f"[Translate] Ngôn ngữ trùng khớp ({src_lang}), bỏ qua dịch.", flush=True)
            for seg in segments:
                seg["translated_text"] = seg["text"]
            return segments
            
        merged_segments = self._smart_merge_segments(segments)
        print(f"[Translate] Đã gộp {len(segments)} đoạn cắt vụn thành {len(merged_segments)} câu hoàn chỉnh ngữ nghĩa.", flush=True)
        
        self.tokenizer.src_lang = src_lang
        tgt_lang_id = self.tokenizer.convert_tokens_to_ids(tgt_lang)
        
        # Auto-adjust batch size based on device
        batch_size = 4 if self.device == "cuda" else 2
        
        for i in range(0, len(merged_segments), batch_size):
            batch = merged_segments[i:i + batch_size]
            
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
                
        return merged_segments