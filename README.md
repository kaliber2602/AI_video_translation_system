# 🎬 AI Video Translation & Dubbing Platform (VidNova)

Hệ thống AI xử lý, dịch thuật và lồng tiếng video đa ngôn ngữ toàn diện (End-to-End AI Video Translation & Dubbing Pipeline) hỗ trợ giao diện song ngữ (Tiếng Việt / English), tích hợp AI Models tiên tiến (Faster-Whisper, Demucs v4, NLLB-200, ElevenLabs, Ollama, EdgeTTS, VNPay Payment Gateway).

---

## 📑 Mục Lục
- [1. Tính Năng Nổi Bật](#1-tính-năng-nổi-bật)
- [2. Kiến Trúc Hệ Thống & Tech Stack](#2-kiến-trúc-hệ-thống--tech-stack)
- [3. Yêu Cầu Phần Cứng & Môi Trường](#3-yêu-cầu-phần-cứng--môi-trường)
- [4. Hướng Dẫn Cài Đặt & Chạy Local / Server](#4-hướng-dẫn-cài-đặt--chạy-local--server)
- [5. Hướng Dẫn Triển Khai Lên AWS EC2](#5-hướng-dẫn-triển-khai-lên-aws-ec2)
- [6. Tài Khoản Thử Nghiệm & Cổng Dịch Vụ](#6-tài-khoản-thử-nghiệm--cổng-dịch-vụ)
- [7. Cấu Hình Biến Môi Trường (.env)](#7-cấu-hình-biến-môi-trường-env)

---

## 1. Tính Năng Nổi Bật

- **Quy trình Pipeline 6 Tầng Khép Kín:**
  1. **Upload & Media Inspection:** Phân tích thông số media, tách nhạc nền / giọng nói với **Demucs v4**.
  2. **Transcription (STT):** Nhận dạng giọng nói độ chính xác cao bằng **Faster-Whisper** (Tiny, Base, Small, Medium, Large-v3) kèm speaker diarization.
  3. **Translation (MT / LLM):** Dịch thuật ngữ cảnh thông minh hỗ trợ Meta **NLLB-200**, Google Translate, Ollama (Llama 3 / Qwen) và OpenAI.
  4. **Subtitles & OCR / Masking:** Tự động canh lề thời gian, tạo phụ đề đa kiểu dáng, tính năng xóa/che subtitle cứng cũ (Subtitle Mask Studio).
  5. **Dubbing & Voice Cloning (TTS):** Khớp khẩu hình/thời lượng, lồng tiếng chất lượng cao bằng EdgeTTS hoặc ElevenLabs voice cloning.
  6. **Review & Export:** Trình phát video đa rãnh, xuất định dạng MP4, tách audio WAV/MP3, file phụ đề SRT/VTT hoặc file ZIP trọn gói.
- **Preset Studio 6 Tầng AI & Batch Processing:** Thiết lập cấu hình hàng loạt cho nhiều video và xử lý song song thông qua Celery Workers.
- **Quốc tế hóa đa ngôn ngữ (i18n):** Chuyển đổi linh hoạt Tiếng Việt / Tiếng Anh cho toàn bộ giao diện người dùng.
- **Hệ thống Quản Trị & Thanh Toán:** Quản lý gói cước (Free / Pro), nạp tiền tích hợp cổng thanh toán VNPay Sandbox.

---

## 2. Kiến Trúc Hệ Thống & Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS, Lucide Icons, i18next, Nginx.
- **Backend API:** FastAPI (Python 3.10+), Pydantic v2, SQLAlchemy, Uvicorn.
- **Task Queue & Scheduler:** Celery, Redis (phân luồng tách biệt: `queue_stt`, `queue_translate`, `queue_tts`, `queue_media`, `queue_pipeline`).
- **Storage:** MinIO (S3-compatible Object Storage) hoặc AWS S3 trực tiếp.
- **Database:** PostgreSQL 16 Alpine.
- **AI Engines / Local Inference:** PyTorch, Faster-Whisper, Demucs, HuggingFace Transformers, Ollama.

---

## 3. Yêu Cầu Phần Cứng & Môi Trường

- **Hệ điều hành:** Linux (Ubuntu 22.04 LTS khuyến nghị), Windows 11 với WSL2, hoặc macOS.
- **Docker:** Docker Engine 24+ & Docker Compose v2+.
- **Cấu hình GPU (Khuyến nghị để tăng tốc AI):**
  - NVIDIA RTX 3060 / 4060 trở lên (VRAM tối thiểu 6GB, tối ưu từ 8GB - 16GB).
  - Cài đặt sẵn NVIDIA Driver và **NVIDIA Container Toolkit** để Docker nhận diện card GPU:
    ```bash
    nvidia-smi
    ```

---

## 4. Hướng Dẫn Cài Đặt & Chạy Local / Server

### Bước 1: Clone mã nguồn
```bash
git clone https://github.com/<your-username>/AI_video_translation_system.git
cd AI_video_translation_system
```

### Bước 2: Chuẩn bị file cấu hình môi trường
Tạo file `.env` từ file mẫu:
```bash
cp .env.example .env
```
> Chỉnh sửa các thông tin cơ bản trong `.env` nếu cần (như `HF_TOKEN`, `JWT_SECRET_KEY`). Với cấu hình mặc định, hệ thống đã sẵn sàng kết nối MinIO và Postgres nội bộ.

### Bước 3: Khởi động hệ thống bằng Docker Compose
Hệ thống sử dụng **duy nhất 1 file `docker-compose.yml`** được chuẩn hóa toàn diện:
```bash
docker compose up -d --build
```
> *Lưu ý:* Khi khởi động lần đầu, container `backend` sẽ tự động kích hoạt script `prefetch_models.py` để tải sẵn các trọng số model AI cần thiết và script `seed_users.py` để tạo tài khoản ban đầu vào Postgres.

### Bước 4: Kiểm tra trạng thái các container
```bash
docker compose ps
```
Để theo dõi log xử lý Celery Worker:
```bash
docker compose logs -f celery-worker-stt backend
```

---

## 5. Hướng Dẫn Triển Khai Lên AWS EC2 (Sơ Lược)

Để triển khai hệ thống lên nền tảng đám mây AWS (ví dụ máy chủ EC2 có GPU họ `g4dn.xlarge` hoặc `g5.xlarge`):

1. **Khởi tạo EC2 Instance:**
   - Chọn AMI: **Ubuntu Server 22.04 LTS** (hoặc Deep Learning Base OSS Nvidia Driver GPU AMI).
   - Instance Type: `g4dn.xlarge` (1 GPU T4 16GB VRAM) hoặc `g5.xlarge` (1 GPU A10G 24GB VRAM).
   - Cấu hình Storage (EBS): Tối thiểu **100 GB** (để chứa Docker images và model cache).
   - Security Group: Mở các cổng `22` (SSH), `80` / `5173` (Frontend Web), `8000` (Backend API).

2. **Kết nối SSH vào máy chủ:**
   ```bash
   ssh -i "your-key.pem" ubuntu@<your-ec2-public-ip>
   ```

3. **Cài đặt Docker & NVIDIA Container Toolkit (nếu dùng máy chủ GPU):**
   ```bash
   # Cài Docker
   curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh
   sudo usermod -aG docker $USER
   newgrp docker

   # Cài đặt NVIDIA Container Toolkit
   sudo apt-get update
   sudo apt-get install -y nvidia-container-toolkit
   sudo nvidia-ctk runtime configure --runtime=docker
   sudo systemctl restart docker
   ```

4. **Clone source code từ GitHub & Thiết lập:**
   ```bash
   git clone https://github.com/<your-username>/AI_video_translation_system.git
   cd AI_video_translation_system
   cp .env.example .env
   # Sửa IP server trong .env (VITE_API_BASE_URL, S3_ENDPOINT_URL...)
   nano .env
   ```

5. **Khởi chạy hệ thống trên AWS:**
   ```bash
   docker compose up -d --build
   ```

---

## 6. Tài Khoản Thử Nghiệm & Cổng Dịch Vụ

Sau khi các container khởi động thành công:

| Dịch vụ | Đường dẫn truy cập | Ghi chú |
| :--- | :--- | :--- |
| **Giao diện Web (Frontend)** | `http://localhost:5173` | Hỗ trợ chuyển đổi EN / VI |
| **API Documentation (Swagger)** | `http://localhost:8000/docs` | FastAPI Interactive Docs |
| **MinIO Console (S3 Storage)** | `http://localhost:9001` | Quản lý file media tải lên |
| **Ollama Local LLM** | `http://localhost:11434` | Dịch thuật cục bộ qua Llama/Qwen |

### Tài khoản mặc định (Được seed tự động)
- **Tài khoản Quản trị viên (Admin):**
  - Email: `admin@vidnova.com`
  - Mật khẩu: `Admin@123456`
  - Quyền hạn: Quản lý người dùng, cấu hình gói Pro, tra cứu toàn bộ giao dịch.
- **Tài khoản Người dùng (User):**
  - Email: `user@vidnova.com`
  - Mật khẩu: `User@123456`

---

## 7. Cấu Hình Biến Môi Trường (.env)

Các biến quan trọng nhất cần lưu ý trong file `.env`:
```ini
# Storage Mode: 'auto', 'minio', hoặc 's3'
STORAGE_MODE=auto
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
AWS_REGION=ap-southeast-1
AWS_S3_BUCKET=vidnova-media
S3_ENDPOINT_URL=http://minio:9000

# HuggingFace Token (Bắt buộc nếu tải pyannote diarization hoặc NLLB private)
HF_TOKEN=your_huggingface_token_here

# JWT Auth Secret
JWT_SECRET_KEY=vidnova_super_secure_jwt_secret_key_change_me_in_production

# Cổng thanh toán VNPay Sandbox (Tùy chọn cho nạp ví)
VNPAY_TMN_CODE=your_tmn_code
VNPAY_HASH_SECRET=your_hash_secret
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:5173/payment/vnpay-return
```

---
*Chúc bạn có trải nghiệm tuyệt vời với nền tảng biên dịch & lồng tiếng video AI VidNova!*
