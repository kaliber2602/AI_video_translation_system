import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * ============================================================================
 * 📊 KẾ HOẠCH 3: KỊCH BẢN KIỂM THỬ TẢI & ĐỘ TRỄ BẰNG K6
 * ============================================================================
 * Kịch bản tăng tải theo từng giai đoạn (Ramping Virtual Users):
 * - Giai đoạn 1: 1 VU (Baseline đơn lẻ)
 * - Giai đoạn 2: 3 VUs (Tải trung bình)
 * - Giai đoạn 3: 5 VUs (Ngưỡng bão hòa hệ thống)
 * - Giai đoạn 4: 10 VUs (Thử thách quá tải & hàng đợi Celery)
 *
 * Chạy lệnh:
 *   k6 run benchmark/stress_test.js
 * ============================================================================
 */

export const options = {
  stages: [
    { duration: '30s', target: 1 },  // 1 concurrent user
    { duration: '1m', target: 3 },   // ramp up to 3 users
    { duration: '1m', target: 5 },   // ramp up to 5 users
    { duration: '30s', target: 10 }, // peak stress test: 10 users
    { duration: '30s', target: 0 },  // cool-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'], // 95% requests dưới 3 giây
    http_req_failed: ['rate<0.05'],    // Tỷ lệ lỗi dưới 5%
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:8000';

export default function () {
  // 1. Login user
  const loginPayload = JSON.stringify({
    email: 'user@vidnova.com',
    password: 'User@123456',
  });

  const loginRes = http.post(`${BASE_URL}/api/auth/login`, loginPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  const loginOk = check(loginRes, {
    'login status is 200': (r) => r.status === 200,
    'has access_token': (r) => JSON.parse(r.body).access_token !== undefined,
  });

  if (!loginOk) {
    sleep(1);
    return;
  }

  const token = JSON.parse(loginRes.body).access_token;
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 2. Fetch User Profile
  const meRes = http.get(`${BASE_URL}/api/auth/me`, { headers: authHeaders });
  check(meRes, { 'get me status is 200': (r) => r.status === 200 });

  sleep(1);

  // 3. List Projects
  const projRes = http.get(`${BASE_URL}/api/projects`, { headers: authHeaders });
  check(projRes, { 'get projects status is 200': (r) => r.status === 200 });

  // 4. Query Language Catalog
  const catRes = http.get(`${BASE_URL}/api/videos/catalog/languages`, { headers: authHeaders });
  check(catRes, { 'get catalog status is 200': (r) => r.status === 200 });

  sleep(2);
}
