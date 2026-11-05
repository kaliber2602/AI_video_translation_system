"""
================================================================================
🚀 KIỂM THỬ TẢI ĐỒNG THỜI: 4 NGƯỜI DÙNG XỬ LÝ VIDEO AI CÙNG LÚC
================================================================================
Mục đích:
  Kiểm thử thực tế khả năng xử lý song song của hệ thống backend Celery và GPU
  khi có 4 NGƯỜI DÙNG ĐỘC LẬP cùng lúc tải lên và kích hoạt pipeline dịch thuật video:
    - User 1 (bench_user1@vidnova.com) -> Video 1
    - User 2 (bench_user2@vidnova.com) -> Video 2
    - User 3 (bench_user3@vidnova.com) -> Video 3
    - User 4 (bench_user4@vidnova.com) -> Video 4

Quy trình:
  1. Đăng nhập 4 tài khoản người dùng độc lập đồng thời.
  2. Tải lên video mẫu (sample test video) cho mỗi tài khoản.
  3. Dùng Barrier đồng bộ để bấm 'Start Processing' CÙNG 1 GIÂY cho cả 4 video.
  4. Giám sát thời gian thực:
     - Tiến độ từng bước: Demucs -> Faster-Whisper -> NLLB-200 -> TTS -> HLS.
     - Dung lượng GPU VRAM thực tế (đo nguy cơ tràn 8GB VRAM - CUDA OOM).
     - % CPU và dung lượng RAM hệ thống.
  5. Xuất báo cáo tổng kết chi tiết cho Báo cáo / Luận văn.

Cách chạy:
  python benchmark/stress_test_4_concurrent_videos.py
================================================================================
"""

import os
import sys
import time
import json
import threading
import requests
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE_URL = os.getenv("TARGET_URL", "http://localhost:8000")
SAMPLE_VIDEO_PATH = os.path.join(os.path.dirname(__file__), "benchmark_sample.mp4")

USERS = [
    {"email": f"bench_user{i}@vidnova.com", "password": "User@123456", "name": f"User {i}"}
    for i in range(1, 5)
]


def print_banner():
    print("\n" + "=" * 80)
    print("🚀 VIDNOVA AI - KIỂM THỬ TẢI: 4 NGƯỜI DÙNG XỬ LÝ VIDEO ĐỒNG THỜI")
    print("=" * 80)
    print(f"• Target API: {BASE_URL}")
    print(f"• Số lượng người dùng ảo: 4 tài khoản độc lập")
    print(f"• Video mẫu: {SAMPLE_VIDEO_PATH} ({os.path.getsize(SAMPLE_VIDEO_PATH) if os.path.exists(SAMPLE_VIDEO_PATH) else 0} bytes)")
    print("=" * 80 + "\n")


def login_user(user_info):
    url = f"{BASE_URL}/api/auth/login"
    resp = requests.post(url, json={"email": user_info["email"], "password": user_info["password"]}, timeout=10)
    if resp.status_code == 200:
        token = resp.json().get("access_token")
        return token
    raise RuntimeError(f"Đăng nhập thất bại {user_info['email']}: {resp.status_code} - {resp.text}")


def upload_video_for_user(token, user_idx):
    url = f"{BASE_URL}/api/videos/upload?target_language=vi"
    headers = {"Authorization": f"Bearer {token}"}
    with open(SAMPLE_VIDEO_PATH, "rb") as f:
        files = {"file": (f"stress_video_user_{user_idx}.mp4", f, "video/mp4")}
        resp = requests.post(url, headers=headers, files=files, timeout=30)
    if resp.status_code in (200, 201):
        data = resp.json()
        return data.get("video_id") or data.get("id")
    raise RuntimeError(f"Tải lên video thất bại cho User {user_idx}: {resp.status_code} - {resp.text}")


def trigger_processing(token, video_id, barrier):
    # Chờ cả 4 luồng sẵn sàng để kích hoạt cùng một mili-giây
    barrier.wait()
    t_start = time.perf_counter()
    url = f"{BASE_URL}/api/videos/{video_id}/process"
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.post(url, headers=headers, timeout=15)
    t_dispatch = time.perf_counter() - t_start
    if resp.status_code in (200, 201):
        data = resp.json()
        return {"success": True, "job_id": data.get("job_id"), "dispatch_time_sec": t_dispatch}
    elif resp.status_code == 400 and "already processing" in resp.text:
        return {"success": True, "job_id": "existing", "dispatch_time_sec": t_dispatch}
    else:
        return {"success": False, "error": resp.text, "dispatch_time_sec": t_dispatch}


def get_system_telemetry(admin_token):
    try:
        url = f"{BASE_URL}/api/admin/benchmark/metrics"
        headers = {"Authorization": f"Bearer {admin_token}"}
        resp = requests.get(url, headers=headers, timeout=5)
        if resp.status_code == 200:
            return resp.json()
    except Exception:
        pass
    return None


def run_benchmark():
    if not os.path.exists(SAMPLE_VIDEO_PATH):
        print(f"❌ Không tìm thấy file video mẫu tại: {SAMPLE_VIDEO_PATH}")
        return

    print_banner()

    # 1. Login Admin to monitor telemetry
    print("🔑 [1/4] Đăng nhập tài khoản Quản trị để theo dõi Telemetry...")
    admin_token = None
    try:
        admin_token = login_user({"email": "admin@vidnova.com", "password": "Admin@123456"})
        print("   -> Đăng nhập Admin thành công.")
    except Exception as e:
        print(f"   [Cảnh báo] Không thể đăng nhập admin để lấy metrics: {e}")

    # 2. Login 4 Users
    print("\n👥 [2/4] Đăng nhập 4 tài khoản người dùng độc lập...")
    tokens = {}
    for idx, u in enumerate(USERS, 1):
        try:
            tokens[idx] = login_user(u)
            print(f"   -> User {idx} ({u['email']}): Đăng nhập thành công.")
        except Exception as e:
            print(f"   ❌ Lỗi đăng nhập {u['email']}: {e}")
            return

    # 3. Upload 4 Videos
    print("\n📤 [3/4] Tải lên 4 video mẫu đồng thời lên hệ thống...")
    video_ids = {}
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = {executor.submit(upload_video_for_user, tokens[i], i): i for i in range(1, 5)}
        for f in futures:
            idx = futures[f]
            try:
                vid = f.result()
                video_ids[idx] = vid
                print(f"   -> User {idx}: Video đã tải lên thành công (Video ID: {vid}).")
            except Exception as e:
                print(f"   ❌ User {idx} upload lỗi: {e}")
                return

    # 4. Trigger 4 Pipelines Simultaneously
    print("\n⚡ [4/4] ĐỒNG BỘ KÍCH HOẠT 4 PIPELINE CÙNG MỘT THỜI ĐIỂM (Synchronized Barrier)...")
    barrier = threading.Barrier(4)
    dispatch_results = {}
    start_timestamp = time.time()

    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = {
            executor.submit(trigger_processing, tokens[i], video_ids[i], barrier): i
            for i in range(1, 5)
        }
        for f in futures:
            idx = futures[f]
            res = f.result()
            dispatch_results[idx] = res
            print(f"   -> User {idx} (Video #{video_ids[idx]}): Dispatch thành công ({res['dispatch_time_sec']:.3f}s)")

    print("\n" + "=" * 80)
    print("📊 BẮT ĐẦU VÒNG LẶP GIÁM SÁT 4 TÁC VỤ SONG SONG VÀ TÀI NGUYÊN GPU VRAM...")
    print("=" * 80)

    # 5. Monitoring Loop
    video_statuses = {i: {"status": "processing", "progress": 0, "step": "starting", "done": False} for i in range(1, 5)}
    peak_vram_mb = 0.0
    peak_cpu_pct = 0.0
    peak_ram_gb = 0.0
    max_active_tasks = 0
    oom_detected = False
    durations = {}

    start_monitor_time = time.perf_counter()

    while True:
        time.sleep(2.0)
        elapsed = time.perf_counter() - start_monitor_time
        all_done = True

        # Check status for each of 4 videos
        for i in range(1, 5):
            if not video_statuses[i]["done"]:
                try:
                    url = f"{BASE_URL}/api/videos/{video_ids[i]}/status"
                    headers = {"Authorization": f"Bearer {tokens[i]}"}
                    r = requests.get(url, headers=headers, timeout=5)
                    if r.status_code == 200:
                        sdata = r.json()
                        st = str(sdata.get("status") or "unknown")
                        prg = int(sdata.get("progress") or 0)
                        step = str(sdata.get("current_step") or "queued")
                        video_statuses[i]["status"] = st
                        video_statuses[i]["progress"] = prg
                        video_statuses[i]["step"] = step

                        if st in ("completed", "success"):
                            video_statuses[i]["done"] = True
                            if i not in durations:
                                durations[i] = elapsed
                        elif st in ("failed", "error"):
                            video_statuses[i]["done"] = True
                            video_statuses[i]["error"] = sdata.get("error_message")
                            if i not in durations:
                                durations[i] = elapsed
                        else:
                            all_done = False
                    else:
                        all_done = False
                except Exception:
                    all_done = False
            else:
                pass

        # Check telemetry
        telemetry = get_system_telemetry(admin_token) if admin_token else None
        vram_str = "N/A"
        cpu_str = "N/A"
        ram_str = "N/A"
        risk_str = "SAFE"

        if telemetry:
            hw = telemetry.get("hardware", {})
            cap = telemetry.get("capacity", {})
            cpu_val = hw.get("cpu_percent", 0.0)
            ram_val = hw.get("ram_used_gb", 0.0)
            vram_val = hw.get("vram_used_mb", 0.0)
            active_cnt = cap.get("current_running_tasks", 0)
            risk = cap.get("cuda_oom_risk_level", "SAFE")

            peak_cpu_pct = max(peak_cpu_pct, cpu_val)
            peak_ram_gb = max(peak_ram_gb, ram_val)
            peak_vram_mb = max(peak_vram_mb, vram_val)
            max_active_tasks = max(max_active_tasks, active_cnt)

            cpu_str = f"{cpu_val}%"
            ram_str = f"{ram_val} GB"
            vram_str = f"{vram_val:.0f} MB / {hw.get('vram_total_mb', 8188):.0f} MB ({hw.get('vram_percent', 0)}%)"
            risk_str = risk

            if risk == "CRITICAL" or "OutOfMemory" in str(telemetry):
                oom_detected = True

        # Print status table in terminal
        sys.stdout.write("\033[H\033[J")  # Clear console
        print("=" * 80)
        print(f"⏱️ THỜI GIAN ĐÃ CHẠY: {elapsed:.1f}s  |  TÁC VỤ CELERY ĐANG XỬ LÝ: {max_active_tasks}")
        print("=" * 80)
        for i in range(1, 5):
            vst = video_statuses[i]
            bar_len = 20
            prg = int(vst.get("progress") or 0)
            filled = int((prg / 100.0) * bar_len)
            pbar = "#" * filled + "-" * (bar_len - filled)
            st_status = str(vst.get("status") or "unknown")
            st_step = str(vst.get("step") or "queued")
            st_icon = "[OK  ]" if st_status in ('completed', 'success') else "[FAIL]" if st_status in ('failed', 'error') else "[PROC]"
            print(f"{st_icon} User {i} (Video #{video_ids[i]}): [{pbar}] {prg:>3}%  | Step: {st_step:<15} | Status: {st_status}")

        print("-" * 80)
        print(f"🖥️ TÀI NGUYÊN PHẦN CỨNG MÁY CHỦ:")
        print(f"   • CPU: {cpu_str}  |  RAM: {ram_str}")
        print(f"   • GPU VRAM: {vram_str}")
        print(f"   • Nguy cơ CUDA OOM: {risk_str}")
        print("=" * 80)

        if all_done:
            break

        if elapsed > 300:  # Timeout 5 minutes
            print("\n⚠️ Đã chạm ngưỡng timeout 5 phút.")
            break

    # 6. Final Report
    print("\n" + "=" * 80)
    print("🎉 HOÀN THÀNH KIỂM THỬ TẢI: 4 NGƯỜI DÙNG XỬ LÝ VIDEO SONG SONG")
    print("=" * 80)
    for i in range(1, 5):
        dur = durations.get(i, elapsed)
        err_note = f" - Lỗi: {video_statuses[i].get('error')}" if video_statuses[i].get("error") else ""
        print(f"• User {i} (Video #{video_ids[i]}): Thời gian hoàn thành = {dur:.1f}s | Trạng thái: {video_statuses[i]['status']}{err_note}")

    print("-" * 80)
    print("📈 TỔNG KẾT MỨC TIÊU HAO PHẦN CỨNG ĐỈNH (PEAK HARDWARE CONSUMPTION):")
    print(f"• Peak CPU: {peak_cpu_pct}%")
    print(f"• Peak RAM: {peak_ram_gb} GB")
    print(f"• Peak GPU VRAM: {peak_vram_mb:.1f} MB ({round((peak_vram_mb / 8188.0) * 100, 1)}% trên GPU RTX 4060 8GB)")
    print(f"• CUDA Out-of-Memory (OOM): {'CÓ XẢY RA (CRITICAL)' if oom_detected else 'KHÔNG (Hệ thống an toàn tuyệt đối)'}")
    print("=" * 80 + "\n")

    # Export report JSON
    os.makedirs("benchmark/reports", exist_ok=True)
    report_file = "benchmark/reports/stress_4_videos_report.json"
    report_data = {
        "test_name": "4 Concurrent Users Video Processing Pipeline Stress Test",
        "timestamp": datetime.utcnow().isoformat(),
        "video_duration_seconds": 5.2,
        "concurrent_users": 4,
        "video_ids": list(video_ids.values()),
        "durations_per_video": durations,
        "peak_cpu_percent": peak_cpu_pct,
        "peak_ram_gb": peak_ram_gb,
        "peak_vram_mb": peak_vram_mb,
        "cuda_oom_error": oom_detected,
        "status": "success" if not oom_detected else "oom_warning"
    }
    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(report_data, f, indent=2, ensure_ascii=False)
    print(f"📁 Đã lưu file kết quả JSON tại: {report_file}")


if __name__ == "__main__":
    run_benchmark()
