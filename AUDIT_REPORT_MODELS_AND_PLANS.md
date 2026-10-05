

---

## 16. AUDIT ĐẶC BIỆT: LỖI GHOSTING MODEL TTS & UI NGHE THỬ GIỌNG MẪU (STEP 5)

### 16.1. Nguyên nhân chọn "Coqui XTTS-v2 Voice Cloning (Pro)" nhưng log vẫn chạy "[Edge-TTS] Generating speech..."
* **Thực trạng phát hiện từ log của User**:
  ```text
  [2026-10-04 22:17:55,887: INFO/ForkPoolWorker-2] [Edge-TTS] [60/60] [voice: vi-VN-HoaiMyNeural] [lang: vi] Generating speech...
  ```
* **Mổ xẻ luồng chạy trong mã nguồn**:
  1. **Ở Frontend (`DubbingStep.tsx`)**:
     - User chọn `ttsEngine = "coqui_xtts_v2"`.
     - Khi bấm `Tạo giọng đọc AI`, hàm `generateTTS` gửi:
       ```typescript
       // DubbingStep.tsx line 1028-1043
       const activeVoiceId = `speaker_${selectedSpeaker}`; // ví dụ "speaker_1"
       await videoService.generateTTS(
           videoId, selectedLanguage, selectedSpeaker, ttsStyle, ttsSpeed, false,
           activeVoiceId,
           "coqui_xtts_v2" // param: model
       );
       ```
     - $\rightarrow$ **Frontend GỬI ĐÚNG** `model = "coqui_xtts_v2"` và `voice_id = "speaker_1"`.
  2. **Ở API Backend (`video_routes.py` line 4947-5060)**:
     - Nhận `model = "coqui_xtts_v2"`, cập nhật vào `config.tts_model = "coqui_xtts_v2"`.
     - Tuy nhiên, khi dispatch sang Celery worker:
       ```python
       task_generate_tts_step.delay(
           video_id, user_id, language, speaker_id, style, speed, str(job.id), voice_id
       )
       ```
       $\rightarrow$ **Hàm này KHÔNG HỀ TRUYỀN `tts_model` vào Celery signature!**
  3. **Ở Celery Worker (`video_tasks.py` line 1228-1237)**:
     - Worker đọc lại từ DB: `tts_model = (config.tts_model if config and config.tts_model else "xtts_v2")`.
     - Worker truyền vào: `tts_service.generate_tts_with_alignment(..., model=tts_model)`.
  4. **Ở CỐT LÕI BACKEND (`tts_aligner_service.py` line 267-310) - ĐÂY CHÍNH LÀ NGUYÊN NHÂN GỐC RỄ**:
     - Trong hàm `_call_tts_service`:
       ```python
       # Dòng 220: Kiểm tra ElevenLabs
       if is_elevenlabs and eleven_key:
           ... (gọi ElevenLabs)

       # Dòng 267: BỊ LỖI LOGIC NẶNG TẠI ĐÂY:
       # Direct Edge-TTS in celery-worker-tts
       try:
           import asyncio
           import edge_tts
           ...
           logger.info(f"[Edge-TTS] {seg_info} [voice: {target_voice}] [lang: {tgt_lang}] Generating speech...")
           ...
           return audio
       ```
     - **NGUYÊN NHÂN**: Khối code gọi `edge_tts` **KHÔNG HỀ CÓ CÂU LỆNH `if model == 'edge_tts':`**! 
     - Bất kể `model` truyền vào là `"coqui_xtts_v2"`, `"xtts_v2"` hay gì đi chăng nữa, code chạy tuần tự từ trên xuống dưới, sau khi bỏ qua ElevenLabs (vì không phải model ElevenLabs), nó **lao thẳng vào khối `edge_tts` và chạy Edge-TTS cho tất cả các yêu cầu**!
     - Đây là lỗi **100% HARDCODED FALLBACK / GHOSTING Ở BACKEND**!

---

### 16.2. Vấn đề Giao diện (UI): Chỉ có ElevenLabs và Edge-TTS mới có danh sách giọng mẫu, Coqui XTTS-v2 thì không có
* **Nguyên nhân**:
  - **Bản chất của Coqui XTTS-v2**: XTTS-v2 là mô hình **Voice Cloning (Nhân bản giọng nói tức thì)**. Nó không có danh sách các nhân vật ảo cố định như Edge-TTS (`Hoài My`, `Nam Minh`) hay ElevenLabs (`Rachel`, `Adam`).
  - Thay vào đó, XTTS-v2 cần một **tệp âm thanh mẫu (audio sample 6-10s)** từ chính giọng nói của video gốc (`vocals.wav` tách ra từ Step 1) để nhân bản giọng của diễn viên/người nói trong video sang ngôn ngữ mới.
  - **Lỗi hiển thị trên UI (Ảnh 1: `media_1791152371418.png`)**:
    - Giao diện đang render một dropdown chứa `SPEAKER_01 (en)` (lấy từ Pyannote Diarization cũ đã bỏ).
    - Nút `Thử` bên cạnh gọi API `/vocal/sample`, nhưng vì Step 1 tách âm Demucs bị hardcode hoặc chưa tách nên không có sample để nghe.
* **Chuẩn hóa Giao diện Voice Selector cho cả 3 nhóm Model**:
  1. **Nhóm 1: Microsoft Edge-TTS Neural (Free)**:
     - Hiển thị Dropdown danh sách giọng chuẩn theo ngôn ngữ đích:
       - Tiếng Việt (`vi`): `Hoài My (Nữ chuẩn)`, `Nam Minh (Nam chuẩn)`.
       - Tiếng Anh (`en`): `Jenny (Nữ Mỹ)`, `Guy (Nam Mỹ)`.
     - Kèm nút `🔊 Thử`: Nghe trước câu chào mẫu của Edge-TTS.
  2. **Nhóm 2: ElevenLabs Multilingual v2 (Pro API)**:
     - Hiển thị Dropdown danh sách giọng ElevenLabs Studio: `Rachel`, `Adam`, `Antoni`, `Bella`...
     - Kèm nút `🔊 Thử`: Nghe trước audio demo MP3 từ ElevenLabs CDN.
  3. **Nhóm 3: Coqui XTTS-v2 Voice Cloning (Pro)**:
     - **Không hiển thị dropdown giả `SPEAKER_01 (en)` nữa**.
     - Thay bằng **Card Trực Quan: "Nhân bản giọng từ Video gốc (Original Voice Profile)"**:
       - Hiển thị: Sóng âm trích xuất từ `vocals.wav` của video.
       - Nút `🔊 Nghe giọng gốc`: Cho user nghe đoạn 5s giọng gốc của nhân vật sẽ được đem đi nhân bản.
       - Tùy chọn `Tải lên file giọng mẫu (.wav)` nếu user muốn dùng giọng của chính mình thay vì giọng diễn viên trong video.

---

### 16.3. Giải pháp Code khắc phục triệt để khi triển khai
1. **Sửa `tts_aligner_service.py`**:
   - Thêm điều kiện rẽ nhánh rành mạch theo đúng `model`:
     ```python
     model_clean = (model or "edge_tts").lower().strip()
     
     # 1. ELEVENLABS PRO
     if "eleven" in model_clean or is_elevenlabs:
         return self._call_elevenlabs(...)
         
     # 2. COQUI XTTS-V2 VOICE CLONING (PRO)
     elif "xtts" in model_clean or "coqui" in model_clean:
         # Gọi XTTS Docker Service hoặc XTTS Python Engine với speaker_wav_data
         return self._call_xtts_service(...)
         
     # 3. MICROSOFT EDGE-TTS NEURAL (FREE)
     elif "edge" in model_clean:
         return self._call_edge_tts(...)
     ```
2. **Sửa `DubbingStep.tsx`**:
   - Hiển thị đúng card "Original Voice Clone" khi chọn Coqui XTTS-v2.
   - Truyền chính xác `ttsEngine` sang backend.
