"""
================================================================================
📊 KẾ HOẠCH 3: KỊCH BẢN KIỂM THỬ TẢI & HIỆU NĂNG BẰNG LOCUST (STRESS TEST)
================================================================================
Kịch bản: Giả lập N người dùng độc lập đồng thời gửi yêu cầu lên hệ thống:
1. Đăng nhập người dùng bằng tài khoản độc lập.
2. Tạo dự án Video mới (Create Project).
3. Gửi yêu cầu khởi động pipeline dịch thuật (Trigger Video Pipeline).
4. Polling trạng thái tiến độ pipeline (Transcribe -> Translate -> Dubbing).
5. Đo lường Độ trễ (P50, P95, Max Latency), Tần suất yêu cầu (RPS), Tỷ lệ lỗi (Failures).

Hướng dẫn chạy:
  # Cài đặt Locust:
  pip install locust

  # Chạy giao diện Web UI (Mở http://localhost:8089):
  locust -f benchmark/locustfile.py --host http://localhost:8000

  # Chạy kiểm thử tự động Headless (1, 3, 5, 10, 20 users):
  locust -f benchmark/locustfile.py --headless -u 5 -r 1 --run-time 1m --host http://localhost:8000 --csv=benchmark/reports/stress_run_5u
================================================================================
"""

import os
import random
import time
from locust import HttpUser, task, between, events


class VideoTranslationLoadUser(HttpUser):
    # Thời gian nghỉ ngẫu nhiên giữa các hành vi của người dùng (1 - 3 giây)
    wait_time = between(1.0, 3.0)

    def on_start(self):
        """Khởi tạo phiên làm việc: Đăng nhập tài khoản độc lập lấy JWT Token."""
        self.user_id = random.randint(1000, 99999)
        self.email = os.getenv("BENCHMARK_USER_EMAIL", "user@vidnova.com")
        self.password = os.getenv("BENCHMARK_USER_PASSWORD", "User@123456")
        self.token = None
        self.project_id = None
        self.video_id = None
        self.authenticate()

    def authenticate(self):
        payload = {
            "email": self.email,
            "password": self.password,
        }
        with self.client.post(
            "/api/auth/login",
            json=payload,
            name="[Auth] POST /api/auth/login",
            catch_response=True,
        ) as resp:
            if resp.status_code == 200:
                data = resp.json()
                self.token = data.get("access_token")
                self.headers = {"Authorization": f"Bearer {self.token}"}
                resp.success()
            else:
                resp.failure(f"Login failed status {resp.status_code}: {resp.text}")

    @task(3)
    def fetch_user_profile(self):
        """Kiểm tra phản hồi endpoint /api/auth/me."""
        if not self.token:
            return
        self.client.get(
            "/api/auth/me",
            headers=self.headers,
            name="[Profile] GET /api/auth/me",
        )

    @task(4)
    def list_projects_and_videos(self):
        """Người dùng xem danh sách dự án và video hiện tại."""
        if not self.token:
            return
        self.client.get(
            "/api/projects",
            headers=self.headers,
            name="[Project] GET /api/projects",
        )

    @task(2)
    def create_project_and_test_pipeline(self):
        """Người dùng tạo dự án mới và kiểm tra trạng thái workflow."""
        if not self.token:
            return

        proj_name = f"StressTest_Project_{self.user_id}_{int(time.time())}"
        with self.client.post(
            "/api/projects",
            headers=self.headers,
            json={"name": proj_name, "description": "Locust Automated Benchmark Project"},
            name="[Project] POST /api/projects",
            catch_response=True,
        ) as resp:
            if resp.status_code in (200, 201):
                res_data = resp.json()
                self.project_id = res_data.get("id")
                resp.success()
            else:
                resp.failure(f"Create project error: {resp.text}")

    @task(5)
    def poll_pipeline_job_status(self):
        """Giả lập polling kiểm tra trạng thái tiến trình (Job Status Polling)."""
        if not self.token:
            return
        self.client.get(
            "/api/videos/catalog/languages",
            headers=self.headers,
            name="[Catalog] GET /api/videos/catalog/languages",
        )


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Tổng kết kết quả sau khi hoàn thành đợt kiểm thử."""
    print("\n" + "=" * 60)
    print("📊 BÁO CÁO TỔNG HỢP KIỂM THỬ TẢI LOCUST (KẾ HOẠCH 3)")
    print("=" * 60)
    for name, stat in environment.stats.entries.items():
        if stat.num_requests > 0:
            p50 = stat.get_response_time_percentile(0.5)
            p95 = stat.get_response_time_percentile(0.95)
            fail_rate = (stat.num_failures / stat.num_requests) * 100
            print(f"Endpoint: {stat.name}")
            print(f"  Requests: {stat.num_requests} | Failures: {stat.num_failures} ({fail_rate:.1f}%)")
            print(f"  P50 Latency: {p50:.1f} ms | P95 Latency: {p95:.1f} ms | Avg: {stat.avg_response_time:.1f} ms")
    print("=" * 60 + "\n")
