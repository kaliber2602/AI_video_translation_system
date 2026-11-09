#!/bin/bash
# ============================================================================
# VIDNOVA PLATFORM - 1-Click Vast.ai GPU Worker Bootstrap Script
# Tự động hóa 100% triển khai GPU Worker trên Vast.ai (Userspace Tailscale + Socat)
# Usage: ./scripts/deploy_vastai_worker.sh <MASTER_TAILSCALE_IP> <TAILSCALE_AUTHKEY>
# Example: ./scripts/deploy_vastai_worker.sh 100.90.113.102 tskey-auth-kxvmwuhN7J11CNTRL-xxxxxx
# ============================================================================
set -e

MASTER_IP="${1}"
AUTH_KEY="${2}"

if [ -z "$MASTER_IP" ] || [ -z "$AUTH_KEY" ]; then
    echo "========================================================================"
    echo "❌ LỖI: Thiếu tham số kết nối."
    echo "Cú pháp: ./scripts/deploy_vastai_worker.sh <MASTER_TAILSCALE_IP> <TAILSCALE_AUTHKEY>"
    echo "Ví dụ:   ./scripts/deploy_vastai_worker.sh 100.90.113.102 tskey-auth-kxvmwuhN7J11CNTRL-xxx"
    echo "========================================================================"
    exit 1
fi

echo "========================================================================"
echo "🚀 BẮT ĐẦU CẤU HÌNH VAST.AI GPU WORKER (MASTER IP: $MASTER_IP)"
echo "========================================================================"

# Bước 1: Cài đặt công cụ nền tảng (socat, curl, tailscale)
echo ">>> [1/7] Cài đặt công cụ mạng và Tailscale..."
apt-get update -qq >/dev/null 2>&1 || true
apt-get install -y -qq socat curl netcat-openbsd psmisc procps >/dev/null 2>&1 || true

if ! command -v tailscale &> /dev/null; then
    echo "Đang tải và cài đặt Tailscale..."
    curl -fsSL https://tailscale.com/install.sh | sh
fi

# Bước 2: Thiết lập Tailscaled ở chế độ Userspace Networking (phù hợp với Docker unprivileged của Vast.ai)
echo ">>> [2/7] Khởi động Tailscaled (Userspace Mode)..."
mkdir -p /var/run/tailscale /var/lib/tailscale /tmp/tailscale-log
killall tailscaled 2>/dev/null || true
sleep 1

nohup tailscaled \
    --tun=userspace-networking \
    --statedir=/var/lib/tailscale \
    --socket=/var/run/tailscale/tailscaled.sock \
    > /tmp/tailscaled.log 2>&1 &

sleep 3

# Kết nối Tailscale với Auth Key
echo ">>> [3/7] Xác thực và gia nhập mạng Tailscale..."
tailscale --socket=/var/run/tailscale/tailscaled.sock up \
    --authkey="$AUTH_KEY" \
    --hostname="vastai-worker-$(hostname)" \
    --reset

CURRENT_TS_IP=$(tailscale --socket=/var/run/tailscale/tailscaled.sock ip -4 2>/dev/null || true)
echo "✅ Worker Tailscale IP: $CURRENT_TS_IP"

# Bước 3: Cấu hình ánh xạ /etc/hosts và Socat Port-Forwarding
echo ">>> [4/7] Thiết lập kênh chuyển tiếp cổng (Socat) tới Master ($MASTER_IP)..."
if ! grep -q "redis" /etc/hosts; then
    echo "127.0.0.1 redis db minio" >> /etc/hosts
fi

killall socat 2>/dev/null || true
sleep 1

# Forward Redis (6379)
nohup socat TCP-LISTEN:6379,fork,reuseaddr,bind=127.0.0.1 EXEC:"tailscale --socket=/var/run/tailscale/tailscaled.sock nc $MASTER_IP 6379" >/tmp/socat_redis.log 2>&1 &
# Forward PostgreSQL (5432)
nohup socat TCP-LISTEN:5432,fork,reuseaddr,bind=127.0.0.1 EXEC:"tailscale --socket=/var/run/tailscale/tailscaled.sock nc $MASTER_IP 5432" >/tmp/socat_db.log 2>&1 &
# Forward MinIO/S3 (9000)
nohup socat TCP-LISTEN:9000,fork,reuseaddr,bind=127.0.0.1 EXEC:"tailscale --socket=/var/run/tailscale/tailscaled.sock nc $MASTER_IP 9000" >/tmp/socat_minio.log 2>&1 &

sleep 2

# Kiểm tra kết nối Redis
echo "Kiểm tra kết nối tới Redis Master qua kênh bảo mật..."
if nc -z 127.0.0.1 6379 2>/dev/null; then
    echo "✅ Kết nối Redis thành công!"
else
    echo "⚠️ Chú ý: Chưa thấy Redis phản hồi tức thì, tiến trình nền vẫn đang duy trì kết nối."
fi

# Bước 4: Cấu hình tệp môi trường .env cho Worker
echo ">>> [5/7] Khởi tạo và đồng bộ file .env cho GPU Worker..."
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
    else
        touch .env
    fi
fi

# Đảm bảo các cấu hình kết nối chuẩn
grep -q "^DATABASE_URL=" .env && sed -i "s|^DATABASE_URL=.*|DATABASE_URL=postgresql://ai_video:ai_video@127.0.0.1:5432/ai_video|g" .env || echo "DATABASE_URL=postgresql://ai_video:ai_video@127.0.0.1:5432/ai_video" >> .env
grep -q "^REDIS_URL=" .env && sed -i "s|^REDIS_URL=.*|REDIS_URL=redis://127.0.0.1:6379/0|g" .env || echo "REDIS_URL=redis://127.0.0.1:6379/0" >> .env
grep -q "^CELERY_BROKER_URL=" .env && sed -i "s|^CELERY_BROKER_URL=.*|CELERY_BROKER_URL=redis://127.0.0.1:6379/0|g" .env || echo "CELERY_BROKER_URL=redis://127.0.0.1:6379/0" >> .env
grep -q "^CELERY_RESULT_BACKEND=" .env && sed -i "s|^CELERY_RESULT_BACKEND=.*|CELERY_RESULT_BACKEND=redis://127.0.0.1:6379/0|g" .env || echo "CELERY_RESULT_BACKEND=redis://127.0.0.1:6379/0" >> .env

grep -q "^JWT_SECRET_KEY=" .env || echo "JWT_SECRET_KEY=Kimchidoao_change_this_to_a_secure_random_key_in_production" >> .env
grep -q "^JWT_ALGORITHM=" .env || echo "JWT_ALGORITHM=HS256" >> .env

# Kích hoạt chế độ tăng tốc GPU
grep -q "^WHISPER_DEVICE=" .env && sed -i "s|^WHISPER_DEVICE=.*|WHISPER_DEVICE=cuda|g" .env || echo "WHISPER_DEVICE=cuda" >> .env
grep -q "^TRANSLATION_DEVICE=" .env && sed -i "s|^TRANSLATION_DEVICE=.*|TRANSLATION_DEVICE=cuda|g" .env || echo "TRANSLATION_DEVICE=cuda" >> .env
grep -q "^WHISPER_COMPUTE_TYPE=" .env && sed -i "s|^WHISPER_COMPUTE_TYPE=.*|WHISPER_COMPUTE_TYPE=int8_float16|g" .env || echo "WHISPER_COMPUTE_TYPE=int8_float16" >> .env

# Cấu hình cache HuggingFace & Torch sang thư mục rộng hơn nếu cần
export HF_HOME="${HF_HOME:-/workspace/.hf_home}"
mkdir -p "$HF_HOME"

# Bước 5: Cài đặt thư viện bổ trợ CUDA 12 cho CTranslate2/Faster-Whisper
echo ">>> [6/7] Kiểm tra và cài đặt thư viện NVIDIA cuBLAS / cuDNN..."
pip install --no-cache-dir nvidia-cublas-cu12 nvidia-cudnn-cu12 >/dev/null 2>&1 || true

# Tự động dò đường dẫn thư viện cuBLAS cu12
SITE_PACKAGES=$(python3 -c "import site; print(site.getsitepackages()[0])" 2>/dev/null || echo "/venv/main/lib/python3.12/site-packages")
CUBLAS_LIB="$SITE_PACKAGES/nvidia/cublas/lib"
CUDNN_LIB="$SITE_PACKAGES/nvidia/cudnn/lib"

export LD_LIBRARY_PATH="$CUBLAS_LIB:$CUDNN_LIB:$LD_LIBRARY_PATH"

# Bước 6: Khởi chạy Celery Worker
echo ">>> [7/7] Khởi chạy Celery GPU Worker..."
killall celery 2>/dev/null || true
sleep 1

# Export toàn bộ biến môi trường từ .env
set -a
[ -f .env ] && source .env
set +a

# Chạy worker bằng python từ môi trường hiện tại
nohup env LD_LIBRARY_PATH="$LD_LIBRARY_PATH" celery -A backend.app.tasks.celery_app worker \
    --loglevel=info \
    -Q queue_media,queue_pipeline,queue_stt,queue_translate,queue_tts \
    -P solo \
    -Ofair \
    > celery_worker.log 2>&1 &

WORKER_PID=$!
sleep 3

if ps -p $WORKER_PID > /dev/null; then
    echo "========================================================================"
    echo "🎉 CELERY GPU WORKER ĐÃ KHỞI CHẠY THÀNH CÔNG! (PID: $WORKER_PID)"
    echo "========================================================================"
    echo "👉 Để xem nhật ký hoạt động thời gian thực:"
    echo "   tail -f celery_worker.log"
    echo "👉 Trạng thái GPU hiện tại:"
    nvidia-smi --query-gpu=name,memory.total,memory.free,driver_version --format=csv,noheader
    echo "========================================================================"
else
    echo "❌ Lỗi: Celery Worker không thể duy trì. Xem chi tiết tại celery_worker.log:"
    cat celery_worker.log | tail -n 25
    exit 1
fi
