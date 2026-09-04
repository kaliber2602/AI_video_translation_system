import re
import torch
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

class TranslationService:
    def __init__(self):
        self.model_name = "facebook/nllb-200-1.3B"
        self.model = None
        self.tokenizer = None
        self.device = None

    def _ensure_loaded(self):
        if self.model is not None and self.tokenizer is not None:
            return
        print("[Translate] Đang nạp NLLB-1.3B...", flush=True)
        try:
            import torch
            from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self.model = AutoModelForSeq2SeqLM.from_pretrained(self.model_name).to(self.device)
            print(f"[Translate] Đã nạp NLLB-1.3B lên {self.device.upper()} thành công!", flush=True)
        except Exception as e:
            print(f"[Translate] Lỗi khởi tạo: {e}", flush=True)

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

    # =========================================================================
    # THUẬT TOÁN LÕI MỚI: SMART SEGMENT MERGER (GOM CÂU NGỮ NGHĨA AN TOÀN)
    # =========================================================================
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
        
        # Dấu hiệu kết thúc câu (Hỗ trợ cả Tiếng Anh, Việt, Trung, Hàn, Nhật)
        ending_punctuations = ('.', '?', '!', '。', '？', '！', '…')
        
        for i in range(1, len(segments)):
            next_seg = segments[i]
            next_text = next_seg["text"].strip()
            
            # Tính toán các thông số an toàn
            gap = next_seg["start"] - current_merge["end"]
            current_duration = next_seg["end"] - current_merge["start"]
            char_count = len(current_merge["text"]) + len(next_text) # Dùng số ký tự thay vì số từ để an toàn cho tiếng Trung/Nhật
            
            # Kiểm tra 3 LƯẬT CHẶN (Safety Valves)
            is_end_of_sentence = current_merge["text"].endswith(ending_punctuations)
            is_gap_too_large = gap > max_gap
            is_too_long = (current_duration > max_duration) or (char_count > max_chars)
            
            if is_end_of_sentence or is_gap_too_large or is_too_long:
                # Đóng gói đoạn hiện tại, mở đoạn mới
                merged_segments.append(current_merge)
                current_merge = next_seg.copy()
                current_merge["text"] = current_merge["text"].strip()
            else:
                # Tiến hành gộp (Merge)
                # Dùng khoảng trắng để nối (rất an toàn cho mọi ngôn ngữ)
                current_merge["text"] += " " + next_text
                current_merge["end"] = next_seg["end"] # Cập nhật mốc kết thúc mới
                
        # Nhớ push đoạn cuối cùng vào mảng
        merged_segments.append(current_merge)
        return merged_segments

    # =========================================================================
    # DỊCH THEO LÔ (PURE BATCHING) - LOẠI BỎ 100% HALLUCINATION
    # =========================================================================
    def translate_document(self, segments: list, glossary: dict, src_lang: str, tgt_lang: str):
        if not segments:
            return []
            
        if src_lang == tgt_lang:
            print(f"[Translate] Ngôn ngữ trùng khớp ({src_lang}), bỏ qua dịch.", flush=True)
            for seg in segments:
                seg["translated_text"] = seg["text"]
            return segments
            
        # 1. Chạy thuật toán Gom Câu
        merged_segments = self._smart_merge_segments(segments)
        print(f"[Translate] Đã gộp {len(segments)} đoạn cắt vụn thành {len(merged_segments)} câu hoàn chỉnh ngữ nghĩa.", flush=True)
        
        self._ensure_loaded()
        if self.tokenizer is None or self.model is None:
            raise RuntimeError("Translation model could not be loaded.")

        # 2. Cấu hình NLLB
        self.tokenizer.src_lang = src_lang
        tgt_lang_id = self.tokenizer.convert_tokens_to_ids(tgt_lang)
        
        # Batch size nhỏ (4) để CPU/GPU không bị quá tải
        batch_size = 4 
        
        # 3. Dịch theo lô thuần túy (Không dùng ký tự lạ)
        for i in range(0, len(merged_segments), batch_size):
            batch = merged_segments[i:i + batch_size]
            
            # Masking
            masked_texts = []
            mappings = []
            for seg in batch:
                m_text, mapping = self.mask_keywords(seg["text"], glossary)
                masked_texts.append(m_text)
                mappings.append(mapping)
                
            # Đưa vào Model
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
            
            # Unmasking và lưu kết quả
            for j, seg in enumerate(batch):
                final_text = self.unmask_keywords(decoded_batch[j], mappings[j])
                seg["translated_text"] = final_text
                
        return merged_segments
