# Kế Hoạch Triển Khai: Phân Tách Kiến Trúc Celery Workers Chuyên Biệt Theo Từng Step (Phương Án 2)

## 1. Mục tiêu kiến trúc
- **Container `backend` (FastAPI / Uvicorn)**: Trở thành API Gateway mỏng và nhẹ đúng chuẩn. Tiếp nhận request, kiểm tra auth/quota, upload/presigned S3, dispatch Celery task và trả về phản hồi tức thì (`HTTP 202 Accepted`). Không chạy load model AI nặng hay render video trên tiến trình web.
- **Hệ thống Celery Workers (Distributed Task Execution)**: Phân tách theo từng step chuyên biệt vào các container riêng biệt với hàng đợi (queue) riêng, tránh tranh chấp tài nguyên (VRAM/CPU/RAM) và cô lập lỗi (fault isolation).

---

## 2. Thiết kế Hàng Đợi (Queues) & Cụm Workers

### A. Bảng Phân Bổ Hàng Đợi (Task Routing)
| Queue Name | Tác vụ (Task Names) | Worker Service Container | Concurrency | Đặc điểm tài nguyên |
| :--- | :--- | :--- | :---: | :--- |
| **`queue_stt`** | `task_transcribe_step` | `celery-worker-stt` | 1 | Faster-Whisper, Pyannote Diarization (VRAM/CPU cao) |
| **`queue_translate`** | `task_translate_step` | `celery-worker-translate` | 2 | NLLB-200 / MarianMT / LLM Cloud API |
| **`queue_tts`** | `task_generate_tts_step` | `celery-worker-tts` | 2 | TTS Voice Generation, dispatch to `tts-service` |
| **`queue_media`** | `task_extract_audio_step`, `task_dub_mux_step` | `celery-worker-media` | 2 | FFmpeg Audio Extract, Demucs, Subtitle Burn, Video Muxing |
| **`queue_pipeline`** | `process_video_pipeline`, `task_process_batch_job`, `check_task_status` | `celery-worker-pipeline` | 2 | Orchestrator full pipeline, Batch processing, maintenance |

---

## 3. Các thay đổi chi tiết

### File 1: `backend/app/tasks/celery_app.py`
- Định nghĩa các queues và `task_routes` tương ứng cho Celery:
  ```python
  celery_app.conf.task_routes = {
      "task_transcribe_step": {"queue": "queue_stt"},
      "task_translate_step": {"queue": "queue_translate"},
      "task_generate_tts_step": {"queue": "queue_tts"},
      "task_extract_audio_step": {"queue": "queue_media"},
      "task_dub_mux_step": {"queue": "queue_media"},
      "process_video_pipeline": {"queue": "queue_pipeline"},
      "task_process_batch_job": {"queue": "queue_pipeline"},
      "check_task_status": {"queue": "queue_pipeline"},
  }
  ```

### File 2: `backend/app/tasks/video_tasks.py`
- Thêm `task_extract_audio_step`: Chuyển xử lý FFmpeg audio extraction thành Celery task chuẩn (`queue_media`).
- Đảm bảo các task cập nhật progress và trạng thái qua `JobService` và database.

### File 3: `backend/app/api/video_routes.py`
- Cập nhật endpoint `/api/videos/{video_id}/audio/extract` hỗ trợ dispatch bất đồng bộ qua `task_extract_audio_step.delay(...)`.
- Kiểm tra toàn bộ endpoint pipeline trả về `HTTP 202 Accepted` đồng nhất khi chạy async.

### File 4: `backend/app/api/routes.py`
- Thay thế hàm đồng bộ `process_video_translation` trong legacy upload endpoint `/uploads` thành dispatch Celery task `process_video_pipeline.delay(...)` để giải phóng hoàn toàn tiến trình web.

### File 5: `docker-compose.yml`
- **`backend`**:
  - Bỏ `python scripts/prefetch_models.py all` khỏi command.
  - Command: `python scripts/seed_users.py && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`
  - Bỏ các biến môi trường model nặng thừa.
- **Thêm các Celery Worker Services chuyên biệt**:
  1. `celery-worker-stt`: `celery -A app.tasks.celery_app worker -Q queue_stt --concurrency=1 --loglevel=info` (mount model-cache)
  2. `celery-worker-translate`: `celery -A app.tasks.celery_app worker -Q queue_translate --concurrency=2 --loglevel=info` (mount model-cache)
  3. `celery-worker-tts`: `celery -A app.tasks.celery_app worker -Q queue_tts --concurrency=2 --loglevel=info`
  4. `celery-worker-media`: `celery -A app.tasks.celery_app worker -Q queue_media --concurrency=2 --loglevel=info`
  5. `celery-worker-pipeline`: `celery -A app.tasks.celery_app worker -Q queue_pipeline --concurrency=2 --loglevel=info` (mount model-cache)
  6. `celery-beat`: Giữ nguyên cho periodic scheduler.

---

## 4. Kế hoạch kiểm chứng (Verification Plan)
1. **Kiểm tra cú pháp & Import Python**: Chạy `python -m py_compile` cho `celery_app.py`, `video_tasks.py`, `routes.py`.
2. **Khởi động lại Docker Services**: `docker compose up -d` với cấu trúc container mới.
3. **Kiểm tra trạng thái containers**: `docker compose ps` xác nhận tất cả các worker đều `Up` và lắng nghe đúng queues (`celery -A app.tasks.celery_app inspect active_queues`).
4. **Kiểm tra API Backend**: `curl -f http://localhost:8000/api/health` phản hồi tức thì và không bị delay bởi model prefetch.
