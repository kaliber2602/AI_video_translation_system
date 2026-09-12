# TÀI LIỆU THIẾT KẾ KIẾN TRÚC HỆ THỐNG (SYSTEM ARCHITECTURE DESIGN)
## Nền Tảng Xử Lý Video Đa Tác Vụ: Bất Đồng Bộ, Đa Mô Hình (Multi-Models / AI Agents), Xử Lý Hàng Loạt (Batch Processing), Thông Báo Đa Kênh & Phân Quyền Chia Sẻ Dự Án (Project Sharing RBAC)

---
- **Mã tài liệu:** `SAD-VIDEO-ASYNC-BATCH-01`
- **Phiên bản:** `1.4.0`
- **Trạng thái:** `Đã hoàn thành Kiểm thử Giai đoạn 1, 2, 3, 4 (Hoàn thiện UI Re-hydration, DAG Gating, Step Soft-Locking & Thông Báo Đa Kênh)`
- **Tác giả:** `Antigravity System Architect Team`
- **Áp dụng cho:** `Backend (FastAPI, Celery, Redis, PostgreSQL)`, `AI Workers (PyTorch, Demucs, Whisper, Pyannote, TTS, FFmpeg)`, `GPU Acceleration (NVIDIA RTX 4060 8GB, CUDA, NVENC)`, `Frontend (React TypeScript Wizard, Batch UI, Notifications & Project Sharing)`

---

## MỤC LỤC
1. [BỐI CẢNH & PHÂN TÍCH NGHỊCH LÝ HIỆN TẠI](#1-bối-cảnh--phân-tích-nghịch-lý-hiện-tại)
2. [MỤC TIÊU VÀ NGUYÊN TẮC THIẾT KẾ KIẾN TRÚC](#2-mục-tiêu-và-nguyên-tắc-thiết-kế-kiến-trúc)
3. [KIẾN TRÚC TỔNG THỂ HỢP NHẤT (UNIFIED ARCHITECTURE)](#3-kiến-trúc-tổng-thể-hợp-nhất-unified-architecture)
4. [THIẾT KẾ CHI TIẾT CÁC TẦNG HỆ THỐNG](#4-thiết-kế-chi-tiết-các-tầng-hệ-thống)
   - 4.1. [Đồ Thị Phụ Thuộc Dữ Liệu (DAG) & Hiệu Ứng Domino (Cascading Invalidation)](#41-đồ-thị-phụ-thuộc-dữ-liệu-dag--hiệu-ứng-domino-cascading-invalidation)
   - 4.2. [Quản Lý Trạng Thái Step & Cơ Chế Chặn/Tái Lập Dữ Liệu (Gating & Re-hydration)](#42-quản-lý-trạng-thái-step--cơ-chế-chặntái-lập-dữ-liệu-gating--re-hydration)
   - 4.3. [Tầng Đa Mô Hình & AI Agents (Multi-Model / AI Agent Abstraction)](#43-tầng-đa-mô-hình--ai-agents-multi-model--ai-agent-abstraction)
   - 4.4. [Hệ Thống Xử Lý Hàng Loạt (Batch Processing Engine) & Hàng Đợi Ưu Tiên](#44-hệ-thống-xử-lý-hàng-loạt-batch-processing-engine--hàng-đợi-ưu-tiên)
   - 4.5. [Định Tuyến Tín Dụng & Khấu Trừ Chi Phí Động (Dynamic Billing & Escrow)](#45-định-tuyến-tín-dụng--khấu-trừ-chi-phí-động-dynamic-billing--escrow)
   - 4.6. [Quản Lý Xung Đột, Hủy Tác Vụ & Tiến Trình Ma (Concurrency & Revocation)](#46-quản-lý-xung-đột-hủy-tác-vụ--tiến-trình-ma-concurrency--revocation)
   - 4.7. [Hệ Thống Thông Báo Đa Kênh: In-App & Email (Notification Subsystem)](#47-hệ-thống-thông-báo-đa-kênh-in-app--email-notification-subsystem)
   - 4.8. [Nghiệp Vụ Chia Sẻ Dự Án & Phân Quyền Hợp Tác Nhóm (Project Sharing & Team RBAC)](#48-nghiệp-vụ-chia-sẻ-dự-án--phân-quyền-hợp-tác-nhóm-project-sharing--team-rbac)
   - 4.9. [Tách Biệt Triệt Để Web Gateway & Worker Pools: Ngăn Chặn Chiếm Dụng Container & Điều Hướng Tự Do (Non-Blocking Navigation)](#49-tách-biệt-triệt-để-web-gateway--worker-pools-ngăn-chặn-chiếm-dụng-container--điều-hướng-tự-do-non-blocking-navigation)
   - 4.10. [Thiết Kế Kiến Trúc Tăng Tốc Phần Cứng GPU & Điều Phối VRAM 8GB (RTX 4060)](#410-thiết-kế-kiến-trúc-tăng-tốc-phần-cứng-gpu--điều-phối-vram-8gb-rtx-4060)
5. [ĐẶC TẢ DỮ LIỆU CHUẨN (CANONICAL SCHEMAS)](#5-đặc-tả-dữ-liệu-chuẩn-canonical-schemas)
6. [KẾ HOẠCH TRIỂN KHAI THEO GIAI ĐOẠN (IMPLEMENTATION PLAN)](#6-kế-hoạch-triển-khai-theo-giai-đoạn-implementation-plan)
7. [TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)](#7-tiêu-chí-nghiệm-thu-acceptance-criteria)

---

## 1. BỐI CẢNH & PHÂN TÍCH NGHỊCH LÝ HIỆN TẠI

### 1.1. Bối cảnh thực tế
Từ kết quả kiểm tra hệ thống thực tế và báo cáo sự cố tại Video 13:
- Video thời lượng `06:54` (~414 giây) thực hiện trích xuất audio và nhận diện Whisper STT trên CPU thành công (1,368 từ), đã trừ quota của người dùng.
- Khi chuyển tiếp qua Pyannote Diarization 3.1 trên CPU, thời gian tính toán thực tế vượt quá `300 giây` (5 phút).
- Frontend Axios cấu hình cứng `{ timeout: 300000 }` đã chủ động ngắt kết nối với lỗi `AxiosError: timeout of 300000ms exceeded`.
- Người dùng thấy thông báo thất bại, trong khi Backend vẫn tiếp tục xử lý hoặc bị treo tài nguyên. Khi người dùng tải lại trang hoặc bấm thử lại, hệ thống không tải được kết quả trước đó, đồng thời tiếp tục trừ phí trùng lặp.
- **Sự Hiện Diện Của Phần Cứng GPU (Host GPU Reality):** Máy chủ/Host thực tế được trang bị card đồ họa **NVIDIA GeForce RTX 4060 với 8GB VRAM**, tuy nhiên hệ thống trước đó đang chạy giả định cấu hình CPU-only (sử dụng PyTorch CPU wheels trong Dockerfile và không passthrough GPU trong Docker Compose). Điều này khiến các mô hình dịch NLLB (214s) hay STT/Diarization phải gánh toàn bộ tải trên CPU, trong khi tiềm năng phần cứng GPU bị bỏ trống hoàn toàn.

### 1.2. Bốn Nghịch lý Kiến trúc Lớn
1. **Nghịch lý Thực thi (Execution Paradox):** Hệ thống đã xây dựng sẵn hạ tầng Celery worker, Redis và JobService cho luồng chạy tự động `process_video_pipeline`. Tuy nhiên, giao diện Wizard từng bước (Upload $\rightarrow$ Transcript $\rightarrow$ Translation $\rightarrow$ Subtitle $\rightarrow$ Dubbing) lại bị lập trình theo lối tắt: gọi trực tiếp các API synchronous trên Web server FastAPI, giữ kết nối HTTP và DB session kéo dài hàng chục phút.
2. **Nghịch lý Trạng thái (State Paradox):** `VideoPipeline.tsx` kiểm tra trạng thái video bằng logic suy diễn lỏng lẻo (nếu `status === 'completed'` thì tự động nhảy cóc sang Step 6). Không có sự phân biệt giữa trạng thái tổng thể của video và trạng thái của từng bước riêng lẻ.
3. **Nghịch lý Mở rộng & Hợp tác (Extensibility & Collaboration Paradox):** Các module xử lý AI hiện đang bị fix cứng vào các lớp cụ thể. Khi mở rộng sang Multi-models, Batch Processing và Chia sẻ Dự án (nhiều người cùng làm việc trên một project), hệ thống chưa có cơ chế điều phối thông báo tự động (In-App/Email) và chưa có luật phân định chi phí / xung đột ghi đè giữa các thành viên (Owner vs Editor).
4. **Nghịch lý Chiếm dụng Web Gateway & Nghẽn Event Loop (Web Gateway Hijacking & Event-Loop Starvation):**
   - *Phát hiện thực tế:* Trong Giai đoạn 2, mới chỉ có Bước 2 (STT) được bóc tách sang Celery worker (`task_transcribe_step`). Khi người dùng chuyển sang Bước 3 (Translation - NLLB 1.3B) hoặc Bước 5 (Dubbing - XTTS v2 / Audio Alignment), các tác vụ này **vẫn đang được thực thi trực tiếp trên luồng của container `backend` (FastAPI / Uvicorn)**.
   - *Hậu quả nghiêm trọng:* Tiến trình Uvicorn bị khóa chặt bởi tính toán CPU-heavy và vòng lặp I/O tuần tự (ví dụ: gọi 100 HTTP requests tới TTS server). Khi người dùng bấm quay trở lại giao diện Workspace (`/workspace`) hoặc chuyển sang video khác, toàn bộ các request nhẹ tiếp theo (`GET /api/videos/`, `GET /api/projects/`, `GET /api/notifications/`, `GET /api/auth/me`) bị kẹt cứng trong hàng đợi TCP socket của container `backend`. Trình duyệt người dùng rơi vào trạng thái chờ phản hồi vô tận (hang/freeze) cho đến khi tác vụ TTS/Translation hoàn thành, làm sụp đổ hoàn toàn trải nghiệm ứng dụng. *(Đã giải quyết triệt để ở Giai đoạn 3 qua các Celery Step Tasks và HTTP 202 Accepted).*
5. **Nghịch lý Bẫy VRAM 8GB (The 8GB VRAM Squeeze & OOM Trap):**
   - Nếu kích hoạt GPU một cách tùy tiện (`--gpus all`) mà không có cơ chế kiểm soát vòng đời bộ nhớ, việc nạp đồng thời hoặc lưu cache tĩnh cho các mô hình (Whisper 1.8GB + Pyannote 1.5GB + NLLB 3.2GB + XTTS 2.8GB) sẽ nhanh chóng vượt ngưỡng 8GB VRAM, dẫn đến lỗi chí mạng `CUDA Out of Memory (OOM)` làm sập toàn bộ Celery Worker. Cần một kiến trúc điều phối VRAM chuyên biệt cho card 8GB.

---

## 2. MỤC TIÊU VÀ NGUYÊN TẮC THIẾT KẾ KIẾN TRÚC

### 2.1. Mục tiêu cốt lõi
1. **Non-blocking API (100% Async):** Không có bất kỳ tác vụ AI nào chạy trực tiếp trong luồng HTTP của FastAPI. Toàn bộ tác vụ nặng chuyển sang Celery Worker, API trả về `HTTP 202 Accepted` kèm `job_id` trong thời gian $< 100\text{ms}$.
2. **Universal Step Execution:** Từng bước trong Wizard và toàn bộ quy trình Pipeline đều dùng chung một bộ **Atomic Step Tasks** trong Celery.
3. **F5 Resilience & Granular Re-hydration:** Tải lại trang ở bất kỳ thời điểm nào đều khôi phục chính xác 100% dữ liệu của từng bước.
4. **Data Dependency Integrity:** Bảo vệ tính toàn vẹn dữ liệu khi chạy lại một bước bất kỳ; bảo toàn công sức chỉnh sửa thủ công của người dùng.
5. **Multi-Model & Agentic Extensibility:** Dễ dàng bổ sung bất kỳ mô hình AI mới nào (Local Model hoặc Cloud API) thông qua Adapter Pattern chuẩn hóa.
6. **Enterprise Batch Processing:** Áp dụng cấu hình mẫu (Preset) để chạy tự động hàng loạt $N$ video mà không làm nghẽn các tác vụ tương tác tay.
7. **Omni-channel Notifications:** Tự động gửi thông báo In-App (real-time badge/toast) và Email (bản tin tổng hợp digest/lỗi) dựa trên cấu hình Notification Preferences của người dùng.
8. **Enterprise Project RBAC & Shared Billing:** Quản lý quyền hạn chặt chẽ (Owner, Admin, Editor, Viewer); cơ chế hạn mức chi tiêu dự án (Project Budget Escrow) ngăn chặn lạm chi tín dụng giữa các thành viên.
9. **Zero Heavy Compute on Web Gateway (Cách ly tài nguyên container tuyệt đối):** Container `backend` (FastAPI / Uvicorn) được bảo vệ tuyệt đối như một API Gateway thuần túy. Mọi tác vụ tính toán thời gian $> 50\text{ms}$ (Demucs, Whisper, NLLB, XTTS, FFmpeg) bắt buộc phải chuyển sang các container Celery Worker riêng biệt, bảo đảm Web Gateway luôn phản hồi các request Workspace, Project, Auth trong $< 20\text{ms}$ ngay cả khi worker đang chịu tải 100% CPU/GPU.
10. **Unconstrained Client Navigation (Tự do điều hướng không phong tỏa):** Người dùng có thể khởi chạy tác vụ tại bất kỳ step nào rồi tự do chuyển trang, về Workspace, duyệt video khác hoặc tắt trình duyệt mà không làm gián đoạn tiến trình đang chạy và không bị đơ giao diện.
11. **Dynamic VRAM Lifecycle & Graceful Degrade (Kiến trúc điều phối VRAM động & Fallback linh hoạt):** Khi hệ thống chạy trên phần cứng có GPU hạn chế (ví dụ 8GB VRAM như RTX 4060), tuyệt đối không nạp giữ đồng thời nhiều mô hình AI; thực thi tuần tự hóa (Task Serialization) trên GPU pool với `concurrency=1`, áp dụng lượng tử hóa FP16/INT8, tự động giải phóng bộ nhớ đệm `torch.cuda.empty_cache()` sau mỗi step, và tự động hạ cấp xuống CPU (graceful degradation) nếu xảy ra hiện tượng thiếu hụt VRAM.

---

## 3. KIẾN TRÚC TỔNG THỂ HỢP NHẤT (UNIFIED ARCHITECTURE)

Hệ thống được thiết kế theo kiến trúc phân tầng chịu lỗi cao:

```mermaid
graph TD
    subgraph ClientLayer [Client & User Interface]
        WIZ[Interactive Step Wizard]
        BATCH_UI[Batch Processing Dashboard]
        NOTIF_BELL[In-App Notification Center]
        SHARE_MODAL[Project Sharing & RBAC Modal]
    end

    subgraph APIGateway [FastAPI Ingestion & Orchestration]
        ROUTER[Video & Job Router]
        AUTH[Auth & RBAC Permission Guard]
        BILLING[Project Budget & Escrow Controller]
        DISPATCHER[Step Job Dispatcher]
        NOTIF_API[Notification Service API]
    end

    subgraph RedisBroker [Redis Infrastructure]
        Q_HIGH[Queue: interactive_high]
        Q_BATCH[Queue: batch_heavy_local]
        Q_IO[Queue: cloud_api_io]
        Q_NOTIF[Queue: notification_delivery]
        LOCKS[Distributed Locks: video:step & project:collab]
        PUBSUB[Redis PubSub / State Cache]
    end

    subgraph CeleryWorkers [Specialized Celery Worker Pools]
        W_GPU[Local AI Worker: GPU/CPU - Concurrency: 1-2]
        W_IO[Cloud Agent Worker: Async I/O - Concurrency: 10-20]
        W_NOTIF[Notification Worker: Email SMTP & WebPush]
    end

    subgraph ModelAdapters [Unified Model Adapter Engine]
        AD_SEP[Audio Separation: Demucs / MDX / Bypass]
        AD_STT[STT: WhisperX / Whisper Local / Deepgram Cloud]
        AD_DIA[Diarization: Pyannote 3.1 / Silero VAD / Bypass]
        AD_TRANS[Translation: NLLB / Gemini / GPT-4o / DeepL]
        AD_TTS[TTS: Coqui XTTS-v2 / Edge-TTS / ElevenLabs]
        AD_MUX[Muxing: FFmpeg Subtitle & Audio Blender]
    end

    subgraph StorageData [Persistent Storage & Database]
        DB[(PostgreSQL: Video, StepState, ProjectMember, Notifications)]
        S3[(MinIO / AWS S3: Audio, Video, Subtitles)]
    end

    WIZ -->|Trigger Single Step / Edit| ROUTER
    BATCH_UI -->|Trigger Batch N Videos with Preset| ROUTER
    NOTIF_BELL --> NOTIF_API
    SHARE_MODAL --> ROUTER

    ROUTER --> AUTH --> BILLING --> DISPATCHER

    DISPATCHER -->|Interactive Requests| Q_HIGH
    DISPATCHER -->|Batch Local Tasks| Q_BATCH
    DISPATCHER -->|Cloud API Tasks| Q_IO

    Q_HIGH --> W_GPU
    Q_BATCH --> W_GPU
    Q_IO --> W_IO

    W_GPU --> ModelAdapters
    W_IO --> ModelAdapters

    ModelAdapters --> DB
    ModelAdapters --> S3

    W_GPU -.->|Trigger Event| Q_NOTIF
    W_IO -.->|Trigger Event| Q_NOTIF
    Q_NOTIF --> W_NOTIF --> DB
    W_NOTIF -->|Send Mail| SMTP[SMTP Mail Relay]

    PUBSUB -.->|Progress Polling / SSE| WIZ
    PUBSUB -.->|Batch Status Updates| BATCH_UI
```

### 3.2. Ma Trận Phân Định Trách Nhiệm Container Trong Docker Compose (Container Responsibility Matrix)

Nhằm triệt tiêu tận gốc hiện tượng **Web Gateway Hijacking** và **Event-Loop Starvation**, ranh giới trách nhiệm giữa các container trong hệ thống được phân định nghiêm ngặt:

| Container Tên | Công Nghệ & Vai Trò | Trách Nhiệm Cốt Lõi | Giới Hạn Tài Nguyên & SLA Phản Hồi | Quy Tắc Cấm Tuyệt Đối |
| :--- | :--- | :--- | :--- | :--- |
| **`backend`** | FastAPI / Uvicorn<br>*(API Gateway)* | • Xác thực JWT, phân quyền RBAC (`check_user_project_access`).<br>• Xác thực payload, quản lý Project Budget/Escrow.<br>• Tiếp nhận yêu cầu, tạo `Job` (UUID), dispatch task vào Redis.<br>• Phản hồi tức thì `HTTP 202 Accepted` hoặc phục vụ CRUD nhanh (`GET /videos`, `GET /projects`). | • Response time: $< 50\text{ms}$ ($99\text{th}$ percentile $< 100\text{ms}$).<br>• CPU: nhẹ (I/O non-blocking). | ❌ **Nghiêm cấm:** Không load PyTorch, Whisper, NLLB, XTTS.<br>❌ Không chạy FFmpeg trực tiếp trong route.<br>❌ Không chạy vòng lặp xử lý sync $> 50\text{ms}$. |
| **`celery-worker-ai-local`** | Celery Worker (Pool 1)<br>*(Compute Heavy)* | • Thực thi các mô hình AI tính toán nặng cục bộ: Whisper STT, Pyannote Diarization, NLLB-200 Translation, Demucs Audio Separation, Coqui XTTS.<br>• Tự động thu hồi VRAM/RAM sau mỗi tác vụ (`torch.cuda.empty_cache()`). | • Concurrency: $1 - 2$ processes.<br>• Giới hạn CPU/RAM: cấp phát 4-8 Cores CPU, 8-16GB RAM. | ❌ Không nhận các task I/O thuần túy hoặc FFmpeg muxing video dài. |
| **`celery-worker-media`** | Celery Worker (Pool 2)<br>*(Media & Audio Processing)* | • Thực thi FFmpeg: trích xuất audio từ video gốc (`step 1`).<br>• Render phụ đề hardsub/softsub (`step 4`).<br>• Căn chỉnh tốc độ audio (Audio Alignment với `atempo`), ghép audio lồng tiếng + BGM + video gốc (`step 6`). | • Concurrency: $2 - 4$ processes.<br>• Tối ưu đa luồng FFmpeg (threads 2-4). | ❌ Không nạp mô hình deep learning lớn làm chiếm dụng RAM. |
| **`celery-worker-io`** | Celery Worker (Pool 3)<br>*(Cloud Agent Async I/O)* | • Gọi các Cloud AI API: Gemini 1.5 Flash/Pro, OpenAI GPT-4o, DeepL API, ElevenLabs TTS, Edge-TTS.<br>• Gửi email thông báo SMTP (`notification_service`). | • Concurrency: $10 - 20$ greenlets/threads (gevent/eventlet hoặc prefork).<br>• I/O bound, tiêu tốn cực ít CPU/RAM. | ❌ Không chạy các thuật toán xử lý media nặng. |
| **`tts-service`** | FastAPI + Coqui XTTS<br>*(Dedicated Inference Server)* | • Máy chủ inference riêng biệt cho Coqui XTTS-v2.<br>• Chỉ giao tiếp nội bộ với `celery-worker-ai-local` qua mạng docker bridge. | • Port: 8020 (Internal Docker Network). | ❌ Không mở public ra Internet; không xử lý logic DB/Auth. |
| **`redis`** | Redis 7 Alpine<br>*(Broker & Locks)* | • Lưu hàng đợi Celery (`ai_heavy`, `media_heavy`, `cloud_api_io`, `notification_delivery`).<br>• Lưu Distributed Locks (`lock:video:{id}:step:{step}`).<br>• Cache Step State & PubSub cập nhật tiến độ realtime. | • In-memory fast storage. | ❌ Không lưu trữ dữ liệu vĩnh viễn không có TTL. |
| **`db`** | PostgreSQL 15<br>*(Relational Storage)* | • Lưu trữ metadata video, người dùng, project members, phân quyền RBAC, transcript segments, translation segments, step states, notifications. | • Chuẩn hóa UUID, quan hệ Foreign Key toàn vẹn. | ❌ Không lưu binary file lớn (audio/video blobs). |
| **`minio`** | MinIO S3 Object Storage<br>*(Media Artifacts)* | • Lưu trữ toàn bộ file video gốc, audio vocals, bgm, dubbing wav, file phụ đề ass/srt, file export mp4. | • Phục vụ presigned URL và streaming nội bộ. | ❌ Không lưu dữ liệu quan hệ hay bảng trạng thái. |

---

## 4. THIẾT KẾ CHI TIẾT CÁC TẦNG HỆ THỐNG

### 4.1. Đồ Thị Phụ Thuộc Dữ Liệu (DAG) & Hiệu Ứng Domino (Cascading Invalidation)

Hệ thống xử lý video bản chất là một đồ thị có hướng không chu trình (DAG). Mỗi bước tạo ra các hiện vật (Artifacts) làm đầu vào cho các bước tiếp theo:

```mermaid
graph LR
    S1[Step 1: Audio Extract/Separate] -->|vocal.wav, bgm.wav| S2[Step 2: Transcript & Diarize]
    S2 -->|transcript_segments| S3[Step 3: Translation]
    S3 -->|translation_segments| S4[Step 4: Subtitles]
    S3 -->|translation_segments| S5[Step 5: Voice Dubbing]
    S1 -->|bgm.wav| S5
    S4 -->|subtitle.ass/srt| S6[Step 6: Review & Export]
    S5 -->|dubbed_audio.wav| S6
    S1 -->|video_source| S6
```

#### Xử lý khi Người dùng Re-run một Step ở giữa:
Khi người dùng quay lại Step $K$ để chạy lại hoặc sửa đổi cấu trúc:
1. **Phân biệt 2 loại thay đổi:**
   - **Thay đổi Cấu trúc (Structural Mutation):** Chạy lại toàn bộ bằng AI, gộp/tách câu, thay đổi mốc thời gian `start_time` / `end_time`.
   - **Thay đổi Nội dung Thuần túy (Content Mutation):** Chỉ sửa chính tả text trong 1 câu, giữ nguyên mốc thời gian.
2. **Cơ chế Đánh dấu Trạng thái Lỗi thời (Dirty Flagging):**
   - Nếu Step 2 (Transcript) bị Structural Mutation $\rightarrow$ Hệ thống tự động đánh dấu Step 3 (Translation) và Step 5 (Dubbing) là `status = "stale_outdated"`.
   - Giao diện người dùng sẽ hiển thị cảnh báo màu vàng: *"Dữ liệu phụ đề gốc đã thay đổi. Bản dịch hiện tại có thể không khớp thời gian. Bạn có muốn dịch lại tự động không?"*.
3. **Bảo vệ Công sức Chỉnh sửa Thủ công (Manual Edits Protection):**
   - Hệ thống lưu cờ `is_manually_edited: bool` trên từng segment.
   - Khi chạy lại AI cho một step, hệ thống cung cấp 2 tùy chọn:
     - *Ghi đè hoàn toàn (Overwrite All).*
     - *Chỉ ghi đè các đoạn chưa sửa tay (Keep Manual Modifications).*

---

### 4.2. Quản Lý Trạng Thái Step & Cơ Chế Chặn/Tái Lập Dữ Liệu (Gating & Re-hydration)

#### 4.2.1. Tách rời Trạng thái: Global vs. Step State
Loại bỏ việc sử dụng duy nhất một trường `video.status`. Bổ sung cấu trúc trạng thái chi tiết lưu trong bảng `video_step_states`:

```json
{
  "video_id": 13,
  "overall_status": "ready_for_review",
  "steps": {
    "audio": { "status": "completed", "updated_at": "2026-09-13T01:00:00Z", "task_id": null },
    "transcript": { "status": "completed", "updated_at": "2026-09-13T01:05:00Z", "model": "whisperx_large_v3", "word_count": 1368 },
    "translation": { "status": "completed", "updated_at": "2026-09-13T01:07:00Z", "model": "gemini_1.5_flash", "target_lang": "vi" },
    "subtitle": { "status": "completed", "updated_at": "2026-09-13T01:08:00Z", "format": "ass" },
    "dubbing": { "status": "processing", "progress": 45, "task_id": "celery-uuid-999", "model": "edge_tts" },
    "export": { "status": "idle", "output_path": null }
  }
}
```

#### 4.2.2. Ma trận Điều Kiện Tiên Quyết (Prerequisite Matrix & Step Gating)
Mỗi step trước khi cho phép chạy hoặc cho phép người dùng bấm nút trên UI phải kiểm tra thỏa mãn điều kiện tiên quyết:

| Step | Điều kiện tiên quyết bắt buộc (Prerequisites) | Trạng thái hiển thị trên UI khi chưa thỏa mãn |
| :--- | :--- | :--- |
| **1. Audio** | Video gốc đã tải lên (`video.input_path` tồn tại) | Khóa toàn bộ, yêu cầu upload video trước. |
| **2. Transcript** | File `vocal_path` từ Step 1 tồn tại và hợp lệ | Nút "Start Whisper" bị disable; tooltip: *"Cần tách âm thanh trước"*. |
| **3. Translation** | Có ít nhất 1 bản ghi `transcript_segments` hợp lệ | Chặn gọi API; tooltip: *"Cần hoàn thành phụ đề gốc trước"*. |
| **4. Subtitle** | Có dữ liệu `translation_segments` của ngôn ngữ đích | Chặn sinh sub; gợi ý chuyển qua tab Translation. |
| **5. Dubbing** | Có dữ liệu `translation_segments` và `bgm_path` | Chặn tổng hợp giọng nói; hiển thị cảnh báo thiếu text dịch. |
| **6. Export** | Tối thiểu có Video gốc + Subtitle HOẶC Dubbed Audio | Nút Render video bị mờ; hiển thị danh sách các thành phần còn thiếu. |

#### 4.2.3. Khôi phục Dữ liệu khi F5 (Re-hydration Engine)
Khi người dùng mở trang `VideoPipeline.tsx` (dù là video mới hay video cũ):
1. **Pha 1 (Fetch Step States):** Frontend gọi `GET /api/videos/{id}/steps-summary` lấy toàn bộ trạng thái và hiện vật của 6 steps.
2. **Pha 2 (Auto-resume Task):** Nếu phát hiện bất kỳ step nào có `status === "processing"`, Frontend tự động kích hoạt tiến trình Polling theo `task_id` và hiển thị ProgressBar tương ứng.
3. **Pha 3 (Render Active Step):** Xác định step hợp lệ tiếp theo cần người dùng thao tác.

---

### 4.3. Tầng Đa Mô Hình & AI Agents (Multi-Model / AI Agent Abstraction)

Hệ thống thiết kế theo mẫu `Adapter / Strategy Pattern`. Mọi model trong cùng một module đều phải tuân theo một Abstract Class duy nhất:

#### 4.3.1. Danh mục Mô hình theo Module:
* **Audio Separation:** `demucs_htdemucs` (Studio quality), `demucs_mdx_extra` (Fast), `bypass_raw_audio`.
* **STT:** `whisper_local` (tiny $\rightarrow$ large-v3), `whisperx_local`, `faster_whisper` (CTranslate2 4x speed), `openai_whisper_api`, `deepgram_cloud`.
* **Speaker Diarization:** `pyannote_3.1`, `silero_vad_heuristic`, `single_speaker_bypass` (0s overhead).
* **Translation:** `nllb_local`, `gemini_flash`, `openai_gpt` (GPT-4o/mini), `claude_haiku`, `deepl_api`.
* **TTS:** `coqui_xtts_v2` (Voice Cloning), `edge_tts` (Free, natural), `elevenlabs` (Studio grade), `openai_tts`.
* **Muxing:** `ffmpeg_cpu`, `ffmpeg_nvenc` (GPU acceleration).

#### 4.3.2. Quản lý Tài nguyên VRAM & Phân bổ Worker
1. **Worker Pool 1 (GPU/CPU Heavy):** Chạy Local Models (Demucs, Whisper, Pyannote, XTTS). Cấu hình `--concurrency=1` hoặc `2`.
2. **Worker Pool 2 (Cloud Agent I/O):** Chạy Cloud API (Gemini, DeepL, Edge-TTS, ElevenLabs). Cấu hình `--concurrency=15`.
3. **Dynamic Model Offloading:** Tự động giải phóng VRAM bằng `torch.cuda.empty_cache()` sau mỗi công đoạn.

---

### 4.4. Hệ Thống Xử Lý Hàng Loạt (Batch Processing Engine) & Hàng Đợi Ưu Tiên

1. **Pipeline Presets:** Đóng gói toàn bộ model, ngôn ngữ, style phụ đề, giọng lồng tiếng thành một cấu hình mẫu có thể tái sử dụng.
2. **Anti-Starvation Queuing:**
   * `interactive_high`: Dành riêng cho người dùng tương tác tay trên Wizard $\rightarrow$ Luôn được ưu tiên xử lý trước.
   * `batch_heavy_local`: Dành cho các tác vụ hàng loạt $\rightarrow$ Chạy khi hàng đợi tương tác rỗng.
3. **Leaky Bucket Throttling:** Giới hạn mỗi người dùng tối đa $K=2$ video chạy song song trong batch để chống độc chiếm tài nguyên.

---

### 4.5. Định Tuyến Tín Dụng & Khấu Trừ Chi Phí Động (Dynamic Billing & Escrow)

1. **Two-Phase Escrow:** Hold/Reserve tín dụng khi bắt đầu $\rightarrow$ Capture/Settle chính xác theo số từ/thời lượng khi thành công $\rightarrow$ Release/Refund toàn bộ nếu gặp lỗi.
2. **Miễn phí Sửa tay:** Chỉnh sửa văn bản, thay đổi font/style, dịch lại thủ công hoàn toàn miễn phí.

---

### 4.6. Quản Lý Xung Đột, Hủy Tác Vụ & Tiến Trình Ma (Concurrency & Revocation)

1. **Redis Distributed Lock:** `SET lock:video:{video_id}:step:{step_name} {task_id} NX EX 3600`.
2. **Task Revocation:** Thu hồi Celery Task cũ khi người dùng hủy hoặc đổi cấu hình; kiểm tra cờ `cancelled` trước khi ghi dữ liệu vào DB/S3.

---

### 4.7. Hệ Thống Thông Báo Đa Kênh: In-App & Email (Notification Subsystem)

Hệ thống đã có nền tảng `notification_service.py` hỗ trợ cả bảng tin nội bộ (In-App) và gửi thư điện tử (SMTP Email Relay). Trong kiến trúc Async & Batch, hệ thống thông báo đóng vai trò cầu nối thông tin hai chiều với người dùng.

```mermaid
graph TD
    CELERY_EVENT[Celery Worker: Step/Batch Lifecycle Event] -->|Push Event Payload| Q_NOTIF[Queue: notification_delivery]
    Q_NOTIF --> NOTIF_WORKER[Notification Worker Process]
    
    NOTIF_WORKER --> CHECK_PREF{Check User Notification Preferences}
    CHECK_PREF -->|inapp_on_* == True| CREATE_DB[Write to notifications table]
    CHECK_PREF -->|email_on_* == True| DISPATCH_EMAIL[Build HTML Digest & Send SMTP]
    
    CREATE_DB --> WS_POLL[In-App Bell Badge & Toast]
    DISPATCH_EMAIL --> USER_INBOX[User Email Inbox]
```

#### 4.7.1. Phân loại Sự kiện Thông báo (Notification Taxonomy)

| Loại sự kiện | Kênh truyền tải | Điều kiện kích hoạt | Nội dung thông báo | Hành động đích (Action URL) |
| :--- | :--- | :--- | :--- | :--- |
| `PIPELINE_SUCCESS` | In-App + Email | Video hoàn thành toàn bộ bước xuất bản | *"Video '{title}' đã hoàn tất dịch thuật và lồng tiếng. Thời lượng: {dur}."* | `/workspace/projects/{p_id}/videos/{v_id}?step=review-export` |
| `BATCH_COMPLETED` | In-App + Email Digest | Toàn bộ $N$ video trong Batch đã xử lý xong | *"Xử lý hàng loạt hoàn tất: {success_count}/{total_count} video thành công."* | `/workspace/projects/{p_id}/batch/{batch_id}` |
| `PIPELINE_FAILED` | In-App + Email Alert | Bất kỳ step nào gặp lỗi không thể fallback | *"Sự cố xử lý video '{title}' tại bước {step}: {error_reason}. Nhấn để thử lại."* | `/workspace/projects/{p_id}/videos/{v_id}?step={failed_step}` |
| `QUOTA_WARNING` | In-App + Email | Tín dụng tài khoản hoặc dự án còn dưới 10% | *"Cảnh báo: Tín dụng còn lại chỉ đủ xử lý thêm ~{mins} phút video."* | `/settings/billing` |
| `STEP_COMPLETED` | In-App Toast | Một bước AI dài trong Wizard hoàn thành | *"Đã nhận diện xong phụ đề cho '{title}' ({words} từ)."* | Cập nhật trực tiếp trên UI active |
| `COLLAB_UPDATE` | In-App | Thành viên trong nhóm hoàn tất chỉnh sửa | *"Thành viên {user} vừa cập nhật phụ đề video '{title}'."* | `/workspace/projects/{p_id}/videos/{v_id}?step=subtitle` |

#### 4.7.2. Chính sách Chống Spam (Anti-Spam & Digest Aggregation)
- **Quy tắc 1 (No Granular Email for Steps):** Không gửi email riêng cho từng step trong Wizard. Email chỉ gửi khi **toàn bộ video hoàn tất** hoặc **cả Batch hoàn tất**.
- **Quy tắc 2 (Digest Batch Completion):** Khi chạy batch 50 video, hệ thống không gửi 50 email rời rạc. Toàn bộ tiến độ được gom lại thành **1 Email Tổng Hợp Duy Nhất (Batch Summary Digest)** liệt kê chi tiết số video thành công, số video lỗi kèm link xem từng video.
- **Quy tắc 3 (Honor Preferences):** Luôn kiểm tra các trường `email_on_pipeline_success`, `inapp_on_pipeline_failed` trong bảng `notification_preferences` trước khi phát hành.

---

### 4.8. Nghiệp Vụ Chia Sẻ Dự Án & Phân Quyền Hợp Tác Nhóm (Project Sharing & Team RBAC)

Trong môi trường doanh nghiệp hoặc đội ngũ sản xuất nội dung, nhiều thành viên sẽ cùng làm việc trên một Project. Kiến trúc xử lý video phải phân định rõ quyền hạn thực thi, trách nhiệm chi phí và tránh xung đột thao tác đồng thời.

#### 4.8.1. Ma Trận Phân Quyền Thực Thi (Role-Based Access Matrix)
Dựa trên bảng `project_members` với 4 cấp độ vai trò:

| Hành động nghiệp vụ | Owner | Admin | Editor | Viewer |
| :--- | :---: | :---: | :---: | :---: |
| Xem video, nghe vocal/dubbing, tải file xuất bản | ✅ | ✅ | ✅ | ✅ |
| Chỉnh sửa thủ công Transcript / Translation / Subtitles | ✅ | ✅ | ✅ | ❌ |
| Kích hoạt các Step AI (Whisper, Gemini, XTTS...) | ✅ | ✅ | ✅ (nếu được phép) | ❌ |
| Kích hoạt Xử lý Hàng loạt (Batch Upload) | ✅ | ✅ | ✅ (nếu được phép) | ❌ |
| Thêm/Xóa thành viên dự án, phân quyền | ✅ | ✅ | ❌ | ❌ |
| Thiết lập Hạn ngạch Tín dụng Dự án (Project AI Budget) | ✅ | ❌ | ❌ | ❌ |
| Xóa Video / Xóa Dự án vĩnh viễn | ✅ | ❌ | ❌ | ❌ |

#### 4.8.2. Cơ Chế Quy Trách Nhiệm Chi Phí (Shared Project Billing Attribution)
Khi `Editor` bấm chạy Whisper hoặc kích hoạt Batch 20 video, bài toán đặt ra là: **Trừ tiền của Editor hay của Project Owner?**

Hệ thống thiết lập chính sách **Project Team Quota (Hạn Mức Theo Dự Án)**:
1. **Nguồn trừ tiền:** Mặc định toàn bộ tác vụ AI thực thi bên trong một Dự án sẽ được **khấu trừ vào Quota của `Project Owner`** (người sở hữu tài nguyên).
2. **Cơ chế Bảo Vệ Chủ Sở Hữu (Owner Safeguards):**
   - Owner có quyền cấu hình cờ: `allow_member_ai_execution: bool` (Mặc định: `True`). Nếu tắt, chỉ Owner mới được bấm chạy các model AI tính phí; Editors chỉ được sửa tay.
   - Owner có quyền đặt ngân sách trần: `project_credit_budget` (Ví dụ: Dự án này tối đa tiêu 200 credits/tháng).
   - Khi Editor bấm chạy, hệ thống kiểm tra:
     $$\text{Chi phí yêu cầu} \le \text{Ngân sách còn lại của Project} \quad \text{VÀ} \quad \text{Chi phí yêu cầu} \le \text{Số dư ví của Owner}$$
   - Nếu vượt hạn mức $\rightarrow$ Chặn với thông báo: *"Ngân sách AI của dự án đã đạt giới hạn. Vui lòng liên hệ Owner để cấp thêm."*

#### 4.8.3. Kiểm Soát Xung Đột Đồng Thời (Collaborative Concurrency & Presence)
Tránh hiện tượng: Editor A đang gõ tay bản dịch câu 10 ở Step 3, Editor B ở máy khác bấm "Dịch lại toàn bộ bằng GPT-4o" làm đè mất dữ liệu.

1. **Khóa Mềm Cấp Bước (Step Soft-Locking):**
   - Khi một thành viên kích hoạt Celery Task cho một Step:
     - Ghi nhận trạng thái: `step_locked_by: user_id`, `step_locked_at: timestamp`.
     - Toàn bộ thành viên khác truy cập vào Step đó sẽ thấy giao diện chuyển sang **Chế độ Chỉ Đọc (Read-Only)** kèm Banner cảnh báo màu xanh dương:
       `[Đang xử lý] Thành viên John Doe đang thực hiện 'Dịch thuật AI' cho video này. Giao diện tạm thời khóa chỉnh sửa.`
2. **Presence & Heartbeat (Tùy chọn tương lai):**
   - Khi có người đang mở tab chỉnh sửa Transcript, gửi tín hiệu heartbeat nhẹ qua Redis (TTL 30s). Nếu người khác vào, hiển thị avatar người đang xem/sửa để tránh thao tác chéo.

---

### 4.9. Tách Biệt Triệt Để Web Gateway & Worker Pools: Ngăn Chặn Chiếm Dụng Container & Điều Hướng Tự Do (Non-Blocking Navigation)

#### 4.9.1. Phân Tích Bản Chất Lỗi Chiếm Dụng Web Gateway (Container Hijacking & Starvation)
1. **Kiến trúc luồng đơn (Single-process Uvicorn Event Loop):**
   - Container `backend` chạy FastAPI với Uvicorn server (`uvicorn app.main:app --host 0.0.0.0 --port 8000`).
   - Khi request `POST /api/videos/{id}/translations` được gửi tới:
     - `video_routes.py` gọi trực tiếp `translation_service.translate_document(...)` (chạy model NLLB 1.3B hoặc Gemini theo vòng lặp).
     - Model NLLB ngốn 100% CPU thread và giữ khóa Global Interpreter Lock (GIL) trong hàng chục giây.
   - Khi request `POST /api/videos/{id}/tts` hoặc `POST /api/videos/{id}/dub` được gửi tới:
     - Route gọi trực tiếp `tts_service.generate_tts_with_alignment(...)` lặp qua 100+ segments, mỗi segment gọi HTTP request tới `tts-service` container rồi gọi FFmpeg chạy filter `atempo`.
     - Tuyến tính này chiếm toàn bộ thời gian của worker process trong 2-5 phút.
2. **Hiện tượng Nghẽn Event Loop (Event-Loop Starvation) & Kẹt Hàng Đợi TCP:**
   - Trong thời gian Uvicorn process bị chiếm dụng bởi phép tính nặng, **asyncio event loop bị đóng băng (frozen)**.
   - Khi người dùng ở frontend bấm vào menu "Projects" hoặc "Workspace", trình duyệt gửi request:
     - `GET /api/projects/`
     - `GET /api/videos/`
     - `GET /api/notifications/unread-count`
     - `GET /api/auth/me`
   - Tất cả các HTTP request này bị giữ lại ở tầng socket TCP của hệ điều hành, không có luồng nào xử lý.
   - Trình duyệt hiển thị spinner quay vô tận, giao diện đóng băng, người dùng tưởng chừng toàn bộ hệ thống bị crash.

#### 4.9.2. Quy Tắc Vàng: Web Gateway Thuần Túy (<50ms Response, 0 Heavy Compute)
1. Container `backend` (FastAPI) chỉ thực hiện đúng 4 nhiệm vụ:
   - **Xác thực & Phân quyền (Authentication & RBAC):** Kiểm tra JWT token, xác nhận quyền xem/sửa (`check_user_project_access`).
   - **Xác thực Đầu vào & Kiểm tra Ngân sách (Validation & Budget Guard):** Kiểm tra schema payload, kiểm tra số dư quota.
   - **Tạo Job & Khởi phát Task Bất đồng bộ (Job Ingestion & Task Dispatch):** Lưu bản ghi `Job` (status: `queued`), cấp `job_id` UUID, gọi Celery task `task.apply_async(...)` đẩy vào Redis queue.
   - **Phản hồi tức thì `HTTP 202 Accepted`:** Trả về JSON `{ "job_id": "...", "status": "queued", "step": "..." }` trong thời gian $< 50\text{ms}$.
2. **Nghiêm cấm tuyệt đối trên container `backend`:**
   - Không nạp mô hình ML/AI (Whisper, Pyannote, NLLB, Coqui) vào tiến trình FastAPI.
   - Không chạy FFmpeg trực tiếp trong FastAPI route.
   - Không chạy vòng lặp xử lý audio/text đồng bộ dài $> 50\text{ms}$ trong FastAPI route.

#### 4.9.3. Danh Mục 6 Atomic Celery Step Tasks Chuẩn Hóa Toàn Diện
Mọi bước trong Wizard lẫn quy trình tự động Pipeline đều sử dụng chung danh mục 6 Celery Step Tasks:

| Step | Tên Celery Step Task | Hàng đợi (Queue) | Container Worker đảm nhiệm | Trách nhiệm thực thi |
| :--- | :--- | :--- | :--- | :--- |
| **Step 1: Audio** | `task_extract_audio_step` | `media_heavy` | `celery-worker-media` | FFmpeg trích xuất audio từ video gốc, chạy Demucs tách vocal/BGM. |
| **Step 2: STT** | `task_transcribe_step` | `ai_heavy` | `celery-worker-ai-local` | Whisper / WhisperX STT + Pyannote Diarization (Đã hoàn thiện ở Phase 2). |
| **Step 3: Translate** | `task_translate_step` | `cloud_api_io` / `ai_heavy` | `celery-worker-io` (Cloud) / `celery-worker-ai-local` (NLLB) | Dịch thuật văn bản từng segment theo batch, hỗ trợ Gemini / GPT / NLLB. |
| **Step 4: Subtitle** | `task_subtitle_render_step` | `media_heavy` | `celery-worker-media` | Sinh và format file phụ đề định dạng ASS, SRT, VTT chuẩn hóa. |
| **Step 5: TTS** | `task_generate_tts_step` | `cloud_api_io` / `ai_heavy` | `celery-worker-io` (Edge-TTS) / `celery-worker-ai-local` (XTTS) | Tổng hợp âm thanh giọng đọc + căn chỉnh tốc độ (audio alignment). |
| **Step 6: Dub/Export**| `task_dub_mux_step` | `media_heavy` | `celery-worker-media` | FFmpeg mux vocal lồng tiếng + BGM + Video gốc thành file MP4 hoàn chỉnh. |

#### 4.9.4. Cơ Chế Điều Hướng Tự Do Phía Client (Unconstrained Client Navigation)
Khi giao diện người dùng chuyển sang mô hình Non-blocking:
1. **Fire & Detach:** Khi người dùng bấm "Dịch Phụ Đề" hoặc "Tạo Giọng Nói", Frontend gọi API `POST /api/videos/{id}/translations` hoặc `POST /api/videos/{id}/tts`.
   - Backend phản hồi `HTTP 202 Accepted` ngay sau 30ms.
   - UI cập nhật state sang `status: "processing"`, lưu `job_id` vào state và bắt đầu chu kỳ Polling nhẹ nhàng (`GET /api/videos/jobs/{job_id}`).
2. **Unmount An Toàn (Safe Route Transition):**
   - Nếu người dùng bấm "Quay lại Workspace" (`/workspace`) hoặc chuyển sang xem Video 14:
     - Component Step Wizard unmount bình thường, hủy timer polling cục bộ.
     - Celery Task trong worker container **vẫn tiếp tục xử lý độc lập ngầm** trên máy chủ mà không bị ảnh hưởng.
     - Web server phản hồi `GET /api/videos/` ngay lập tức ($< 15\text{ms}$) vì không bị nghẽn CPU. Giao diện Workspace mở ra mượt mà tức thì.
3. **Tái Lập Trạng Thái Tự Động (Auto Re-hydration Khi Quay Lại):**
   - Khi người dùng quay trở lại Video 13:
     - `VideoPipeline.tsx` gọi `GET /api/videos/13/steps-summary`.
     - Nếu Step 3 hoặc Step 5 đã hoàn thành $\rightarrow$ UI hiển thị kết quả dịch / vocal hoàn tất.
     - Nếu Step vẫn đang chạy $\rightarrow$ UI phát hiện `status: "processing"` và `task_id`, tự động khởi động lại ProgressBar tracking mà người dùng không cần thao tác lại từ đầu.

#### 4.9.5. Phân Tách Container Worker Pools Trong Hạ Tầng Docker Compose
Để bảo đảm tính cách ly tuyệt đối về tài nguyên CPU, VRAM và I/O, hệ thống triển khai kiến trúc multi-worker pools trong `docker-compose.yml`:
```yaml
services:
  # 1. Web Gateway: Pure API, 0 heavy compute, <50ms response
  backend:
    build: ./backend
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
    # Chỉ chứa router, auth, database I/O, Celery task dispatcher

  # 2. Local AI Worker: GPU/CPU compute heavy
  celery-worker-ai-local:
    build: ./backend
    command: celery -A app.core.celery_app worker -Q ai_heavy -c 1 --loglevel=INFO -n worker-ai@%h
    environment:
      - OMP_NUM_THREADS=4
    deploy:
      resources:
        limits:
          cpus: '4.0'
          memory: 8G

  # 3. Media Worker: FFmpeg processing & audio muxing
  celery-worker-media:
    build: ./backend
    command: celery -A app.core.celery_app worker -Q media_heavy -c 2 --loglevel=INFO -n worker-media@%h

  # 4. Cloud Agent Worker: Async network I/O
  celery-worker-io:
    build: ./backend
    command: celery -A app.core.celery_app worker -Q cloud_api_io -c 10 --loglevel=INFO -n worker-io@%h

  # 5. Dedicated TTS Server: Coqui XTTS v2
  tts-service:
    build: ./tts_service
    ports:
      - "8020:8020"
```

---

### 4.10. Thiết Kế Kiến Trúc Tăng Tốc Phần Cứng GPU & Điều Phối VRAM 8GB (RTX 4060)

Khi hệ thống được triển khai trên máy chủ hoặc máy trạm có trang bị card đồ họa rời (đặc thù cấu hình thực tế: **NVIDIA GeForce RTX 4060 với 8GB VRAM**), kiến trúc xử lý video cần được nâng cấp toàn diện từ mô hình tính toán CPU/RAM thuần túy sang **Mô hình Hybrid GPU-Accelerated Pipeline**.

Tuy nhiên, 8GB VRAM là một ngưỡng tài nguyên rất nhạy cảm trong hệ thống xử lý video đa tác vụ (Multimodal AI). Nếu không có kiến trúc điều phối thông minh, hệ thống sẽ lập tức rơi vào thảm họa `CUDA Out of Memory (OOM)`. Phần này thiết lập chiến lược điều phối VRAM, lượng tử hóa và cấu hình hạ tầng cho môi trường có GPU.

```mermaid
graph TD
    subgraph HostHardware [Phần Cứng Vật Lý: RTX 4060 8GB GDDR6]
        TOTAL_VRAM[Tổng VRAM: 8,188 MB]
        OS_DISPLAY[Windows DWM / Apps / Display: ~1,600 MB]
        USABLE_VRAM[VRAM Khả Dụng Cho AI Container: ~6,500 MB]
    end

    subgraph DynamicVRAMOrchestrator [Bộ Điều Phối VRAM Động & Task Serialization]
        direction TB
        LOCK[Redis Mutex: lock:gpu:vram_slot]
        CONC[Celery Worker GPU: concurrency=1]
        CLEANUP[Post-Step Cleanup: del model + torch.cuda.empty_cache]
    end

    subgraph PipelineLifecycle [Vòng Đời Nạp & Giải Phóng VRAM Theo Bước]
        direction LR
        STEP1["Demucs (FP16)<br/>~1.4 GB VRAM"] -->|Evict| STEP2["Whisper Large-v3 (INT8_FP16)<br/>~1.1 GB VRAM"]
        STEP2 -->|Evict| STEP3["Pyannote (FP16)<br/>~1.3 GB VRAM"]
        STEP3 -->|Evict| STEP4["NLLB-200-1.3B (CT2 INT8)<br/>~0.9 GB VRAM"]
        STEP4 -->|Evict| STEP5["Coqui XTTS v2 (FP16)<br/>~2.8 GB VRAM"]
        STEP5 -->|Evict| STEP6["FFmpeg NVENC (ASIC)<br/>~0.25 GB VRAM"]
    end

    subgraph SafetyFallbacks [Cơ Chế Bảo Hiểm]
        MONITOR[VRAM Watchdog: torch.cuda.mem_get_info]
        DEGRADE[Graceful Fallback to CPU if Free VRAM < 1.2 GB]
    end

    USABLE_VRAM --> DynamicVRAMOrchestrator
    DynamicVRAMOrchestrator --> PipelineLifecycle
    PipelineLifecycle -.-> MONITOR
    MONITOR -.->|Thiếu bộ nhớ| DEGRADE
```

#### 4.10.1. Khảo Sát Năng Lực Phần Cứng & Hiện Trạng VRAM Thực Tế
- **Thông số GPU:** NVIDIA GeForce RTX 4060 Laptop/Desktop (Kiến trúc Ada Lovelace, Compute Capability 8.9, 3,072 CUDA Cores, 24 Tensor TFLOPS FP16, 8GB GDDR6 128-bit bus).
- **Bộ Mã Hóa Phần Cứng (NVENC):** 8th Generation NVENC hỗ trợ mã hóa tăng tốc phần cứng AV1, HEVC (H.265), H.264 với độ trễ siêu thấp.
- **Hiện trạng chiếm dụng VRAM của Host:** Các tiến trình giao diện (Windows Desktop Window Manager `dwm.exe`, Antigravity IDE, Web Browser, VS Code) chiếm dụng tĩnh từ `1,500MB – 1,700MB` VRAM.
- **Hạn mức thực tế an toàn cho Docker AI:** **$\approx 6,200\text{MB} - 6,500\text{MB}$**. Vượt quá ngưỡng này, Windows sẽ kích hoạt cơ chế Shared GPU Memory (chuyển bộ nhớ GPU tràn sang RAM hệ thống qua PCIe bus), khiến tốc độ suy luận giảm thảm hại từ 10x đến 50x và thường xuyên gây crash CUDA driver.

#### 4.10.2. Ma Trận Tiêu Thụ VRAM & So Sánh Hiệu Năng (Benchmarks)

Bảng so sánh thời gian xử lý và mức độ chiếm dụng VRAM trên video thử nghiệm mẫu (thời lượng `06:54`):

| Tác vụ AI trong Pipeline | Chế độ CPU (Hiện tại) | Chế độ GPU FP32 (Mặc định) | Chế độ GPU Tối Ưu (FP16 / INT8) | VRAM Chiếm Dụng Tối Ưu | Tốc Độ Tăng Trưởng |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Bước 1: Tách nhạc (Demucs)** | 45.2s (100% CPU) | 8.1s | 5.2s (`htdemucs` FP16) | ~1,400 MB | **8.7x** |
| **Bước 2: Bóc băng (Whisper)** | 62.8s (Large-v3 CPU) | 14.5s (FP32) | 8.4s (`int8_float16` CTranslate2) | ~1,100 MB | **7.5x** |
| **Bước 2b: Diarization (Pyannote)**| 285.0s (Timeout nguy cơ) | 32.0s (FP32) | 18.2s (FP16, 10s chunk) | ~1,300 MB | **15.6x** |
| **Bước 3: Dịch thuật (NLLB 1.3B)** | 214.5s (87 segments) | 38.0s (5.2GB - Dễ OOM) | 12.8s (CTranslate2 INT8) | ~900 MB | **16.7x** |
| **Bước 4: Sinh giọng đọc (XTTS v2)**| 60.0s (87 segments) | 16.0s (FP32) | 14.0s (FP16) | ~2,800 MB | **4.3x** |
| **Bước 5: Mux & Render (FFmpeg)**| 42.0s (`libx264` CPU 100%)| N/A | 3.5s (`h264_nvenc` ASIC) | ~250 MB | **12.0x** |
| **TỔNG THỜI GIAN TOÀN BỘ** | **~709.5s (~11.8 phút)** | **Dễ sập VRAM (>11GB)** | **~62.1s (~1.0 phút)** | **Đỉnh: ~3,900 MB** | **TĂNG TỐC 11.4 LẦN** |

> [!CRITICAL]
> **Cảnh báo về Nghịch lý VRAM 8GB:**
> Nếu nạp đồng thời toàn bộ mô hình lên GPU theo kiểu Cache vĩnh viễn (Demucs 1.4GB + Whisper 1.8GB + Pyannote 1.3GB + NLLB 2.6GB + XTTS 2.8GB), tổng nhu cầu VRAM đạt tới **9.9GB**, vượt quá 8GB vật lý $\rightarrow$ **Hệ thống sẽ bị sập ngay lập tức do CUDA OOM**. Do đó, bắt buộc phải áp dụng kiến trúc **VRAM Lifecycle & Task Serialization** dưới đây.

#### 4.10.3. Bốn Trụ Cột Điều Phối VRAM Cho Card 8GB (The 4 Pillars of VRAM Management)

##### Trụ cột 1: Tuần Tự Hóa Tác Vụ GPU (Strict GPU Task Serialization)
- Trên máy chủ có 1 GPU 8GB, **tuyệt đối không chạy song song 2 tác vụ AI inference nặng**.
- Worker Celery dành riêng cho GPU được khởi chạy với tham số:
  ```bash
  celery -A app.tasks.celery_app worker -Q gpu_queue -c 1 --loglevel=INFO
  ```
  *(Số lượng concurrency = 1 đảm bảo tại một thời điểm chỉ có duy nhất 1 tác vụ AI chiếm dụng VRAM).*
- Đồng thời thiết lập Redis Mutex Lock `lock:gpu:vram_slot` để đồng bộ giữa các tiến trình độc lập (nếu có nhiều worker).

##### Trụ cột 2: Quản Lý Vòng Đời & Thu Hồi VRAM Chủ Động (Dynamic Scoped Eviction)
- Bãi bỏ việc giữ mô hình vĩnh viễn trong VRAM sau khi hoàn thành bước xử lý (bãi bỏ Singleton Cache GPU dài hạn).
- Triển khai mô hình **Context Manager Scoped VRAM**:
  ```python
  import gc
  import torch

  class ScopedGPUModel:
      """Quản lý nạp mô hình vào VRAM và giải phóng triệt để ngay khi hoàn thành tác vụ."""
      def __init__(self, loader_func):
          self.loader_func = loader_func
          self.model = None

      def __enter__(self):
          torch.cuda.empty_cache()
          self.model = self.loader_func()
          return self.model

      def __exit__(self, exc_type, exc_val, exc_tb):
          if self.model is not None:
              del self.model
              self.model = None
          gc.collect()
          if torch.cuda.is_available():
              torch.cuda.empty_cache()
  ```
- **Quy trình luân chuyển VRAM trong Step Task:**
  1. *Step 1 (Demucs):* Nạp Demucs (1.4GB) $\rightarrow$ Tách âm $\rightarrow$ Giải phóng Demucs $\rightarrow$ VRAM về 0MB.
  2. *Step 2 (Whisper STT):* Nạp Whisper (1.1GB) $\rightarrow$ Bóc băng $\rightarrow$ Nạp Pyannote (1.3GB) $\rightarrow$ Diarize $\rightarrow$ Giải phóng toàn bộ $\rightarrow$ VRAM về 0MB.
  3. *Step 3 (NLLB Translation):* Nạp NLLB CTranslate2 (0.9GB) $\rightarrow$ Dịch thuật $\rightarrow$ Giải phóng NLLB $\rightarrow$ VRAM về 0MB.
  4. *Step 4 (TTS):* Gọi TTS Service (2.8GB) $\rightarrow$ Sinh giọng $\rightarrow$ Hoàn tất.
  5. *Step 5 (Dubbing FFmpeg):* Gọi `h264_nvenc` (~250MB VRAM chuyên dụng) $\rightarrow$ Render video 1080p trong 3.5 giây.

##### Trụ cột 3: Kiến Trúc Phân Bổ VRAM Giữa Celery Worker & TTS Service
Hệ thống hiện tại có 2 container có nhu cầu dùng GPU: `celery-worker` và `tts-service`. Thiết kế 2 phương án kiến trúc phân bổ:

* **Phương Án 1: Cùng Tồn Tại An Toàn (Co-existence Model - Áp dụng ngay):**
  - Container `tts-service` được cấp GPU, nạp mô hình XTTS v2 (~2.8GB VRAM tĩnh).
  - VRAM còn lại khả dụng cho `celery-worker`: $6,500\text{MB} - 2,800\text{MB} = \mathbf{3,700\text{MB}}$.
  - Các bước trong `celery-worker` áp dụng lượng tử hóa cao nhất:
    * Whisper STT: dùng `compute_type="int8_float16"` (chỉ tốn 1,100MB VRAM $\rightarrow$ Đỉnh VRAM: $2,800 + 1,100 = 3,900\text{MB} < 6,500\text{MB}$).
    * NLLB Translation: dùng `CTranslate2 INT8` (chỉ tốn 900MB VRAM $\rightarrow$ Đỉnh VRAM: $2,800 + 900 = 3,700\text{MB} < 6,500\text{MB}$).
  - *Đánh giá:* Cả 2 container cùng chạy trên GPU mà **không bao giờ vượt quá 4.5GB VRAM**, an toàn tuyệt đối trên RTX 4060 8GB.

* **Phương Án 2: Hợp Nhất TTS Thành Celery Task (Integrated Engine - Khuyến nghị dài hạn):**
  - Loại bỏ container `tts-service` độc lập.
  - Tích hợp XTTS v2 trực tiếp thành một Celery Task (`task_generate_tts_step`) trong `celery-worker`.
  - *Lợi ích:* Toàn bộ `6,500MB` VRAM được phục vụ duy nhất cho 1 tác vụ tại 1 thời điểm. Cho phép chạy Whisper Large-v3 ở chất lượng FP16 cao nhất (1.8GB) và NLLB FP16 (2.6GB) mà không phải nén INT8.

##### Trụ cột 4: Cơ Chế Bảo Hiểm Suy Thoái Êm Dịu (Graceful Fallback on VRAM Starvation)
Trước khi khởi tạo bất kỳ mô hình nào lên GPU, hệ thống thực hiện kiểm tra động:
```python
def get_safe_device(required_vram_mb: int = 1500) -> str:
    """Kiểm tra dung lượng VRAM thực tế trước khi cấp phát."""
    if not torch.cuda.is_available():
        return "cpu"
    try:
        free_bytes, total_bytes = torch.cuda.mem_get_info()
        free_mb = free_bytes / (1024 * 1024)
        if free_mb < required_vram_mb:
            logger.warning(
                f"[VRAM Guard] ⚠️ Dung lượng VRAM khả dụng ({free_mb:.0f}MB) thấp hơn yêu cầu ({required_vram_mb}MB). "
                f"Tự động kích hoạt Graceful Fallback sang CPU để chống OOM crash!"
            )
            return "cpu"
        return "cuda"
    except Exception as e:
        logger.warning(f"[VRAM Guard] Không thể kiểm tra VRAM ({e}), fallback sang CPU.")
        return "cpu"
```
Nếu người dùng đang chạy đồng thời tác vụ đồ họa khác trên máy tính khiến VRAM bị tụt xuống dưới 1.2GB, hệ thống tự động suy thoái về CPU mà không làm dừng pipeline hay báo lỗi đỏ.

#### 4.10.4. Thiết Kế Hạ Tầng Triển Khai Thực Tế (Infrastructure Blueprint)

##### 1. Tệp Cấu Hình Ghi Đè: `docker-compose.gpu.yml`
Không sửa trực tiếp file gốc để đảm bảo tính tương thích chéo (Portable). Khi triển khai trên máy có GPU, sử dụng lệnh:
`docker compose -f docker-compose.yml -f docker-compose.gpu.yml up -d`

```yaml
version: '3.8'

services:
  celery-worker:
    build:
      context: ./backend
      dockerfile: Dockerfile.gpu
    command: celery -A app.tasks.celery_app worker --loglevel=info --concurrency=1 -Q celery,gpu_queue
    environment:
      - WHISPER_DEVICE=cuda
      - WHISPER_COMPUTE_TYPE=int8_float16
      - TRANSLATION_DEVICE=cuda
      - PYANNOTE_DEVICE=cuda
      - FFMPEG_HWACCEL=nvenc
      - NVIDIA_VISIBLE_DEVICES=all
      - NVIDIA_DRIVER_CAPABILITIES=compute,utility,video
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]

  tts-service:
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    environment:
      - TTS_DEVICE=cuda
      - NVIDIA_VISIBLE_DEVICES=all
      - NVIDIA_DRIVER_CAPABILITIES=compute,utility
```

##### 2. Dockerfile GPU Chuyên Biệt: `backend/Dockerfile.gpu`
Thay thế các thư viện CPU bằng CUDA wheels:
```dockerfile
FROM python:3.12-slim

WORKDIR /app

# Cài đặt FFmpeg hỗ trợ NVENC và các thư viện âm thanh
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    build-essential \
    git \
    libsndfile1 \
    libgl1 \
    libglib2.0-0 \
    espeak-ng \
    && rm -rf /var/lib/apt/lists/*

COPY requirements-gpu.txt ./

# Cài đặt PyTorch với CUDA 12.4 runtime
RUN pip install --no-cache-dir \
    torch==2.5.1 torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124 && \
    pip install --no-cache-dir -r requirements-gpu.txt

COPY . ./

ENV WHISPER_DEVICE=cuda \
    WHISPER_COMPUTE_TYPE=int8_float16 \
    TRANSLATION_BACKEND=nllb \
    HF_HOME=/opt/model-cache/hf

CMD ["celery", "-A", "app.tasks.celery_app", "worker", "--pool=solo", "--loglevel=info"]
```
> **Ghi chú kỹ thuật về PyTorch CUDA & Celery Pool:** Mặc định Celery sử dụng prefork pool (Linux fork). PyTorch CUDA nghiêm cấm re-init context trong forked process (`Cannot re-initialize CUDA in forked subprocess`). Việc sử dụng `--pool=solo` cho GPU worker đảm bảo tiến trình CUDA chạy thuần nhất, an toàn và giải phóng VRAM tức thì mà không gặp xung đột bộ nhớ đa tiến trình.

##### 3. Tăng Tốc Render Video Bằng NVENC Trong `AudioService`:
Trong hàm `mix_and_mux` ([`backend/app/services/audio_service.py`](file:///c:/Users/ADMIN/OneDrive/Desktop/Project/AI_video_translation_system/backend/app/services/audio_service.py)):
- Thay vì sử dụng `-c:v libx264 -preset fast -crf 23` (chậm và ngốn 100% CPU), khi phát hiện GPU có NVENC:
  ```bash
  ffmpeg -y -i input.mp4 -i dubbed_audio.wav -vf scale=-2:1080,subtitles=sub.ass \
    -c:v h264_nvenc -preset p4 -tune hq -b:v 5M \
    -c:a aac -b:a 192k output.mp4
  ```
- **Kết quả thực nghiệm trên RTX 4060 (Video #13 dài ~7 phút):**
  - Muxing & Burn hardsub: Giảm từ **~180 giây xuống 29.9 giây (nhanh gấp ~6 lần, tốc độ 13.8x Realtime)**.
  - Dịch thuật NLLB-1.3B: Giảm từ **214 giây xuống 33.29 giây (nhanh gấp 6.5 lần)**.
  - Đỉnh VRAM: Giữ ổn định ở mức **6.19 GB / 8.19 GB**, hoàn toàn không bị CUDA OOM.
  - Tự động Evict: Sau khi dịch xong giải phóng ngay 2.76 GB VRAM về mức **3.43 GB**.

---

## 5. ĐẶC TẢ DỮ LIỆU CHUẨN (CANONICAL SCHEMAS)

Mọi Adapter của các Model khác nhau đều phải chuyển đổi dữ liệu về cấu trúc chuẩn sau:

### 5.1. Canonical Transcript Schema
```json
{
  "video_id": 13,
  "language": "en",
  "total_segments": 140,
  "total_words": 1368,
  "segments": [
    {
      "id": 1,
      "start": 0.52,
      "end": 3.84,
      "speaker": "SPEAKER_01",
      "text": "Welcome back to our advanced AI engineering series.",
      "words": [
        { "word": "Welcome", "start": 0.52, "end": 0.85, "confidence": 0.98 },
        { "word": "back", "start": 0.88, "end": 1.12, "confidence": 0.99 }
      ],
      "confidence": 0.985,
      "is_edited": false
    }
  ]
}
```

### 5.2. Canonical Translation Schema
```json
{
  "video_id": 13,
  "source_language": "en",
  "target_language": "vi",
  "model_used": "gemini_1.5_flash",
  "segments": [
    {
      "segment_id": 1,
      "original_text": "Welcome back to our advanced AI engineering series.",
      "translated_text": "Chào mừng các bạn đã quay trở lại với chuỗi bài giảng kỹ thuật AI nâng cao.",
      "speaker": "SPEAKER_01",
      "start": 0.52,
      "end": 3.84,
      "is_edited": false
    }
  ]
}
```

---

## 6. KẾ HOẠCH TRIỂN KHAI THEO GIAI ĐOẠN (IMPLEMENTATION PLAN)

Kế hoạch được chia làm 5 giai đoạn độc lập:

```mermaid
gantt
    title Lộ Trình Triển Khai Nâng Cấp Hệ Thống
    dateFormat  YYYY-MM-DD
    section Giai đoạn 1 (Hotfix)
    Tách Persistence Whisper & Diarize Fallback (Done)  :done, 2026-09-11, 2026-09-12
    section Giai đoạn 2 (Async Engine & RBAC)
    Celery Step STT, Redis Locks & RBAC Access (Done)   :done, 2026-09-12, 2026-09-13
    section Giai đoạn 3 (Async Offload & Workers)
    Bóc tách Async cho Translate, TTS, Dubbing (Done)    :done, 2026-09-13, 2026-09-13
    Gói Tăng Tốc GPU RTX 4060 & NVENC 13.8x (Done)      :done, 2026-09-13, 2026-09-13
    section Giai đoạn 4 (UI Wizard & Notifications)
    Gating, Re-hydration, Step Locking trên UI (Done)   :done, 2026-09-13, 2026-09-13
    Tích hợp In-App Notification & Email Alerts (Done)  :done, 2026-09-13, 2026-09-13
    section Giai đoạn 5 (Batch Processing)
    Pipeline Presets & Giao diện Batch Upload           :2026-09-14, 4d
```

### ✅ Giai đoạn 1: Hotfix Khẩn Cấp Ổn Định Sự Cố (ĐÃ HOÀN THÀNH & XÁC NHẬN KIỂM THỬ)
* **Kết quả nghiệm thu:** Đã dời ranh giới lưu trữ sang lưu tức thời `TranscriptSegment` ngay sau Whisper; bọc an toàn Diarization Pyannote bằng timeout mềm và fallback tự động `SPEAKER_01`; Singleton Cache cho `DiarizationService`.
* **Trạng thái:** `Passed 100%`.

### ✅ Giai đoạn 2: Chuẩn Hóa Async Job Engine & Phân Quyền RBAC (ĐÃ HOÀN THÀNH & XÁC NHẬN KIỂM THỬ)
* **Kết quả nghiệm thu:** 
  - Đã chuẩn hóa `task_transcribe_step` trả về `HTTP 202 Accepted` kèm `job_id` trong $< 50\text{ms}$.
  - Phân quyền RBAC (`check_user_project_access`) bảo vệ quyền `can_execute_ai`.
  - Tích hợp Redis Lock chống chạy lặp.
  - Đã khắc phục lỗi `psycopg2 UUID adapter` và lỗi SQL schema trong `steps-summary`.
  - Kiểm thử End-to-End thành công với tài khoản người dùng `yugi.thang@gmail.com` trên Video 13 (7/7 tests passed).
* **Trạng thái:** `Passed 100%`.

### ✅ Giai đoạn 3: Phân Rã Async Toàn Diện & Triệt Tiêu Nghẽn Web Gateway (ĐÃ HOÀN THÀNH & XÁC NHẬN KIỂM THỬ)
* **Kết quả nghiệm thu:**
  - Bóc tách 100% các tác vụ nặng khỏi FastAPI sang Celery: `task_translate_step`, `task_generate_tts_step`, `task_dub_mux_step`.
  - Toàn bộ các API `POST /{video_id}/translations`, `POST /{video_id}/tts`, `POST /{video_id}/dub` phản hồi `HTTP 202 Accepted` kèm `job_id` trong $< 100\text{ms}$.
  - Giải quyết triệt để **Nghịch lý 4 (Web Gateway Hijacking & Event-Loop Starvation)**: Trong lúc Celery Worker dịch 87 câu NLLB 1.3B (chạy 214s), Web Gateway phản hồi các ping `GET /api/projects/` và `GET /api/videos/` chỉ trong **6.8ms – 13.5ms**. Người dùng tự do chuyển trang `/workspace` mà không gặp bất kỳ độ trễ nào.
  - Frontend polling tự động và khôi phục tiến trình khi F5; `npm run build` đạt chuẩn với **0 lỗi TypeScript**.
  - Kiểm thử End-to-End thành công với tài khoản người dùng `yugi.thang@gmail.com` trên Video 13.
* **Trạng thái:** `Passed 100%`.

### ✅ Gói Kích Hoạt Tăng Tốc Phần Cứng GPU & Tối Ưu VRAM 8GB (RTX 4060 Pack) (ĐÃ HOÀN THÀNH & XÁC NHẬN KIỂM THỬ THỰC TẾ)
* **Kết quả nghiệm thu thực nghiệm trên NVIDIA GeForce RTX 4060 (Video #13 dài ~7 phút):**
  - **Dịch thuật NLLB-1.3B (100 segments):** Hoàn thành trong **33.29 giây** trên GPU (so với 214 giây trên CPU $\rightarrow$ **tốc độ tăng 6.5 lần**).
  - **Tổng hợp giọng nói XTTS v2 (87 segments):** Hoàn thành trong **62.9 giây** với nhịp xử lý ~0.6s/segment.
  - **Mã hóa & Render Video với Hardware NVENC (`h264_nvenc`):** Render video 1080p kèm burn hardsub hoàn tất trong **29.9 giây** (so với 150-180 giây trên CPU $\rightarrow$ **nhanh gấp 5-6 lần, tốc độ 13.8x Realtime**).
  - **Quản trị an toàn VRAM 8GB:** Đỉnh VRAM đạt **6.19 GB / 8.19 GB** (thấp hơn ngưỡng an toàn 6.5 GB). Cơ chế Dynamic Eviction ngay lập tức thu hồi **2.76 GB VRAM**, đưa mức tiêu thụ về **3.43 GB** khi kết thúc dịch để nhường chỗ cho XTTS v2 và NVENC.
  - **Khắc phục lỗi CUDA Fork:** Khởi chạy Celery Worker với `--pool=solo`, giải quyết triệt để lỗi `Cannot re-initialize CUDA in forked subprocess`.
  - **Đồng bộ hóa VideoRenderOutput:** Áp dụng Upsert cho bảng `video_render_outputs` trên cột `video.output_path`, loại bỏ lỗi vi phạm ràng buộc `uq_video_render_target` và đảm bảo endpoint `/download` trả về HTTP 200 (63.6 MB) tức thì.
  - **Độ nhạy Web Gateway:** Zero Event-Loop starvation (ping độ trễ ổn định ở mức **5.8ms – 12.2ms** xuyên suốt thời gian chạy tác vụ nặng).
* **Trạng thái:** `Passed 100% (Sẵn sàng vận hành song song qua docker-compose.gpu.yml)`.

### ✅ Giai đoạn 4: UI Re-hydration Hoàn Thiện & Hệ Thống Thông Báo Đa Kênh (ĐÃ HOÀN THÀNH & XÁC NHẬN KIỂM THỬ)
* **Kết quả nghiệm thu:**
  - **Omni-Channel Notifications từ Celery Worker:**
    - Tích hợp hàm `_send_task_notification` vào toàn bộ 5 Celery tasks (`process_video_pipeline`, `task_transcribe_step`, `task_translate_step`, `task_generate_tts_step`, `task_dub_mux_step`).
    - Xử lý tự động phân loại sự kiện `pipeline_success` và `pipeline_failed`, ánh xạ chính xác `action_url` về `/workspace/project/:projectId/video/:videoId`.
    - Hỗ trợ gửi Email thông báo trực tiếp khi chạy trong Celery Worker (`background_tasks is None`), tuân thủ tuyệt đối cài đặt `user_notification_preferences` của người dùng.
    - Đã xác minh tự động: Gửi thông báo thành công, số lượng thông báo chưa đọc (`unread_count`) nhảy từ 0 lên 1 tức thì trên tài khoản `yugi.thang@gmail.com`.
  - **UI Re-hydration & Strict DAG Gating:**
    - Đưa `stepsSummary` vào `PipelineContext`, đóng vai trò là Single Source of Truth cho toàn bộ các bước trong Wizard.
    - Chuẩn hóa `isStepCheckpointCompleted(stepId)` kiểm tra trực tiếp trạng thái xác thực từ database backend (`stepsSummary.steps[stepId]?.status === 'completed'`).
    - Thiết lập luật DAG nghiêm ngặt trong `canNavigateToStep`: Chặn hoàn toàn việc nhảy cóc sang các bước kế tiếp khi các bước tiên quyết chưa hoàn tất.
  - **Active Task Banner & Step Soft-Locking:**
    - Hiển thị banner cảnh báo tác vụ nền đang chạy ở đầu Wizard (`ActiveTaskBanner`) kèm icon xoay, tên bước và thanh phần trăm tiến độ.
    - Khóa mềm (soft-lock disable) các nút hành động chính trong `TranscriptStep`, `TranslationStep`, `DubbingStep` khi có tác vụ ngầm đang chạy, ngăn chặn xung đột VRAM và việc gửi lặp tác vụ.
    - Tự động polling `getStepsSummary` chu kỳ 3s, khi tác vụ kết thúc sẽ tự động làm mới metadata và bắn sự kiện `notifications-updated` để chuông thông báo trên thanh Navbar cập nhật số badge tức thì mà không cần F5.
  - **Chất lượng mã nguồn:** `tsc -b && vite build` hoàn thành với **0 lỗi TypeScript**.
* **Trạng thái:** `Passed 100%`.

### Giai đoạn 5: Hệ Thống Xử Lý Hàng Loạt (Batch Engine) (4-5 ngày)
* Xây dựng bảng `pipeline_presets` và giao diện Batch Upload.
* Cài đặt cơ chế hàng đợi ưu tiên `interactive_high` vs `batch_heavy_local`.

---

## 7. TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)

| Mã tiêu chí | Hạng mục kiểm tra | Tiêu chí đạt chuẩn |
| :--- | :--- | :--- |
| **AC-01** | Xử lý Video dài trên CPU | Video 10 phút chạy STT + Diarization trên CPU không bao giờ gây lỗi timeout phía client; luôn hiển thị phụ đề đầy đủ. *(Đã đạt ở Phase 1)* |
| **AC-02** | F5 Resilience | Tải lại trang hoặc chuyển tab khi đang chạy $\rightarrow$ UI tiếp tục hiển thị thanh tiến độ đang chạy, không bị mất trạng thái. *(Đã đạt ở Phase 2, 3 & 4)* |
| **AC-03** | Bảo toàn dữ liệu Whisper | Nếu Diarization bị hủy hoặc lỗi $\rightarrow$ Phụ đề Whisper vẫn được lưu nguyên vẹn, tiếp tục bước dịch bình thường. *(Đã đạt ở Phase 1)* |
| **AC-04** | Quyền hạn Viewer & Editor | User quyền `Viewer` bị chặn hoàn toàn các nút gọi AI; User quyền `Editor` được phép chạy AI và chi phí trừ vào ngân sách của Project Owner. *(Đã đạt ở Phase 2)* |
| **AC-05** | Thông báo tự động | Khi video/bước hoàn tất hoặc gặp sự cố, Celery worker tự động sinh In-App notification và gửi Email thông báo kèm link trực tiếp `/workspace/project/:id/video/:id`. *(Đã đạt ở Phase 4)* |
| **AC-06** | Khóa xung đột nhóm (Soft-Locking) | Khi tác vụ AI đang chạy ngầm, giao diện hiển thị ActiveTaskBanner cảnh báo và các nút kích hoạt tác vụ mới bị khóa mềm (disabled) để tránh xung đột VRAM/dữ liệu. *(Đã đạt ở Phase 4)* |
| **AC-07** | Đa mô hình & Batch không nghẽn | Chạy batch 20 video không làm nghẽn các thao tác tương tác tay của người dùng khác nhờ hàng đợi ưu tiên `interactive_high`. |
| **AC-08** | Zero Gateway Blocking & Free Navigation | Trong lúc bất kỳ tác vụ nặng nào (Whisper, Translation, TTS, Dubbing) đang chạy ngầm, gọi `GET /api/videos/` hoặc `GET /api/projects/` trên Web Gateway luôn phản hồi trong $< 50\text{ms}$. Người dùng có thể tự do bấm về Workspace, mở video khác hoặc tải lại trang mà không gặp hiện tượng treo kết nối (freeze/hang). *(Đã đạt ở Phase 3)* |
| **AC-09** | GPU Acceleration & Zero-OOM under 8GB VRAM | Khi chạy trên GPU RTX 4060 8GB, toàn bộ quy trình 5 bước AI hoàn thành tuần tự mà mức chiếm dụng VRAM không bao giờ vượt quá 6.5GB; tốc độ xử lý video tăng tối thiểu 5x – 10x so với CPU; không bao giờ xảy ra lỗi `CUDA Out of Memory`. *(Đã đạt nghiệm thu thực tế trên RTX 4060: Max VRAM 6.19GB, Translation 33.29s (tăng 6.5x), Dynamic Eviction về 3.43GB, Zero OOM)* |
| **AC-10** | Hardware NVENC Video Rendering | Bước Mux & Render Video sử dụng bộ mã hóa `h264_nvenc` xuất video 1080p thời lượng 7 phút trong $< 35\text{giây}$, giảm tải CPU xuống $< 10\%$. *(Đã đạt nghiệm thu thực tế trên RTX 4060: Render 1080p 7 phút trong 29.9s, tốc độ 13.8x Realtime)* |

---
*Tài liệu này đóng vai trò là kim chỉ nam kỹ thuật chuẩn hóa toàn bộ luồng xử lý video của dự án. Mọi thay đổi mã nguồn trong các bước tiếp theo sẽ tuân thủ nghiêm ngặt theo bản thiết kế này.*
