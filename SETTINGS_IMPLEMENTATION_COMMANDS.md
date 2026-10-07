# SETTINGS MASTER IMPLEMENTATION COMMANDS & RUNBOOK (MASTER PROMPT)
**Dự án:** VidNova AI Video Translation / Video Understanding Platform  
**Phân hệ:** Hệ thống Cài đặt Người dùng (Settings System)  
**Tài liệu cơ sở:** `SETTINGS_AUDIT_REPORT_VI.md`  
**Phiên bản:** 1.0 — Định dạng Master Runbook cho toàn bộ phiên làm việc  
**Mục tiêu:** Cung cấp bộ quy tắc toàn cục, cấu trúc codebase, chuẩn mực logging và danh mục lệnh phân kỳ chi tiết theo P0 / P1 / P2 bám sát 5 domain Settings đã tinh gọn.

---

## PHẦN 1: QUY TẮC TOÀN CỤC & CHUẨN MỰC XỬ LÝ CODEBASE (GLOBAL RULES)

### 1.1. Nguyên tắc cốt lõi (Core Working Directives)
1. **Evidence-Based (100% dựa trên bằng chứng)**: Tuyệt đối không suy đoán logic hay giả định endpoint/hàm có sẵn. Mọi hành động sửa code phải xuất phát từ việc đọc và kiểm chứng mã nguồn hiện có.
2. **Không tự ý mở rộng phạm vi (Zero Scope Creep)**: Chỉ tập trung giải quyết đúng các đầu việc trong 5 domains đã thống nhất.
3. **Bảo toàn dữ liệu di sản (Database Integrity)**: Tuyệt đối không phá vỡ schema `database/init.sql` nếu không có yêu cầu bắt buộc hoặc migration an toàn. Giữ nguyên các hàm cốt lõi đã chạy ổn định (`user_settings_service.py`, `database.py`).
4. **Không "AI Slop" / Thiết kế sạch chuẩn công thái học**: UI phải tự nhiên, tối giản, chuyên nghiệp, không lạm dụng icon, badge màu mè vô nghĩa hoặc hiệu ứng chuyển động không cần thiết.

---

### 1.2. Chuẩn mực Logging toàn hệ thống (Strict Logging Standard)
Tuyệt đối không chèn emoji/icon vào log. Tuân thủ 100% đúng format định chuẩn dưới đây:

#### A. Đối với FastAPI (Backend Web Server)
Format chuẩn Uvicorn / FastAPI access log:
```text
INFO: 172.18.0.1:42114 - "POST /api/auth/refresh HTTP/1.1" 200 OK
INFO: 172.18.0.1:33530 - "PUT /api/auth/change-password HTTP/1.1" 200 OK
WARNING: 172.18.0.1:33530 - "PUT /api/auth/change-password HTTP/1.1" 400 Bad Request
ERROR: 172.18.0.1:33530 - "PUT /api/auth/change-password HTTP/1.1" 500 Internal Server Error
```

#### B. Đối với Celery Workers (Xử lý âm thanh, dịch thuật, render)
Format chuẩn Celery pipeline:
```text
[2026-10-05 17:17:55,403: INFO/MainProcess] [Edge-TTS] [67/68] [voice: ja-JP-NanamiNeural] [lang: ja] - Done : Generated audio chunk successfully
[2026-10-05 17:18:02,110: ERROR/MainProcess] [Whisper-STT] [job_id: 8f9b2a1c] - Failed : GPU out of memory during transcription
```

---

### 1.3. Cấu trúc Source-Code & Môi trường thực thi
Trước khi thao tác bất kỳ module nào, kỹ sư / agent phải rà soát:
- Cây thư mục Frontend: Tham chiếu tệp `frontend_tree_utf8.txt` (hoặc lệnh `tree .\frontend\src /F`)
- Cây thư mục Backend: Tham chiếu tệp `backend_tree_utf8.txt` (hoặc lệnh `tree .\backend /F`)
- Cấu hình hạ tầng: `docker-compose.yml` (các container `backend`, `frontend`, `db`, `redis`, `minio`, `celery-worker-*`)
- Lược đồ cơ sở dữ liệu: `database/init.sql` (bảng `users`, `user_settings`, `user_notification_preferences`, `user_subscriptions`, `plans`, `credit_audit_logs`)

---

## PHẦN 2: TINH GỌN SIDEBAR & CÁC DOMAINS HOẠT ĐỘNG

Sidebar Settings chính thức được tinh gọn từ 10 domains xuống còn đúng **5 Domains**:
- **Đã loại bỏ**: `Account`, `Workspace`, `AI & Processing`, `Translation & Voice`, `Integrations`.
- **5 Domains hoạt động chính thức**:
  1. **General** (`/workspace/settings?tab=general`)
  2. **Billing & Subscription** (`/workspace/settings?tab=billing`)
  3. **Notifications** (`/workspace/settings?tab=notifications`)
  4. **Security** (`/workspace/settings?tab=security`)
  5. **Data & Privacy** (`/workspace/settings?tab=privacy`)

---

## PHẦN 3: PHÂN KỲ TRIỂN KHAI THEO DOMAIN & ĐỘ ƯU TIÊN (P0 / P1 / P2)

### 📌 P0: BẢO MẬT, TOÀN VẸN DỮ LIỆU & SỬA LỖI ĐỘC LẬP (CRITICAL)

#### Task 0.1 [Security Domain]: Loại bỏ 100% Mock 2FA & Chuẩn hóa Auth Guard
- **File tác động:** `frontend/src/components/settings/sections/SecuritySection.tsx`, `backend/app/api/auth_routes.py`
- **Yêu cầu chi tiết:**
  - Xóa bỏ hoàn toàn khối UI *Two-Factor Authentication (2FA)*, mã QR tĩnh, modal xác thực OTP giả lập bằng Javascript.
  - Sửa lỗi Auth Guard: Khi token hết hạn, backend trả về mã `401 Unauthorized` rõ ràng thay vì `403 Forbidden` (`bearer_scheme = HTTPBearer(auto_error=False)` trong `auth_routes.py`).
  - Frontend bắt lỗi `401` để thông báo đăng nhập lại kịp thời, tránh người dùng đổi mật khẩu khi session đã chết.

#### Task 0.2 [General Domain]: Loại bỏ Dead UI & Chuẩn hóa Múi giờ, Font chữ
- **File tác động:** `frontend/src/components/settings/sections/GeneralSection.tsx`, `frontend/src/types/settings.ts`, CSS root
- **Yêu cầu chi tiết:**
  - **Bỏ các mục:** *Compact Interface Density* và *Reduced Motion*.
  - **Xử lý Múi giờ (Timezone):** Bỏ dropdown chọn múi giờ thủ công rườm rà. Chuyển sang cơ chế **tự động detect múi giờ client** (`Intl.DateTimeFormat().resolvedOptions().timeZone`), format hiển thị trực quan (ví dụ: `Asia/Ho_Chi_Minh (GMT+7)`).
  - **Cấu hình Font chữ toàn hệ thống:** Thêm lựa chọn Font chữ hiển thị cho toàn bộ ứng dụng (chọn các font đọc văn bản tự nhiên, hỗ trợ tốt cả tiếng Việt và tiếng Anh như `Be Vietnam Pro`, `Inter`, `Roboto`, `Open Sans`, `Lexend`; tuyệt đối không chọn font kiểu AI/Sci-Fi). Lưu cấu hình và áp dụng ngay lên CSS root `font-family`.

---

### 📌 P1: CHUẨN HÓA LOGIC NGHIỆP VỤ & TỰ ĐỘNG HÓA UX (HIGH PRIORITY)

#### Task 1.1 [Notifications Domain]: Auto-Save Hoàn toàn & Loại bỏ Cụm nút Thừa
- **File tác động:** `frontend/src/components/settings/sections/NotificationsSection.tsx`, `frontend/src/types/notification.ts`
- **Yêu cầu chi tiết:**
  - Loại bỏ hoàn toàn 2 nút `[Reset]` và `[Save Changes / Saved]` ở Header của tab Notifications.
  - Áp dụng cơ chế **Auto-save tức thì**: Gạt công tắc nào là tự động lưu ngầm ngay lập tức công tắc đó vào CSDL qua `PATCH /api/notifications/preferences`.
  - Hiển thị toast nhẹ / status indicator tinh tế, không làm gián đoạn trải nghiệm người dùng.
  - Loại bỏ triệt để nhóm *Collaboration (Project Invitations, Comments & Mentions)* khỏi state và interface của Notifications.

#### Task 1.2 [Billing & Subscription Domain]: Khóa Hạ cấp cho gói Pro & Bổ sung Mốc Thời gian
- **File tác động:** `frontend/src/components/settings/sections/BillingSection.tsx`
- **Yêu cầu chi tiết:**
  - Khi tài khoản đang ở gói **Pro**: Tuyệt đối **không hiển thị lựa chọn / nút đổi sang gói Free** (chỉ hiển thị gói Pro hiện tại hoặc nâng cấp Add-on). Gói sẽ chỉ tự động chuyển về Free khi hết hạn chu kỳ đăng ký.
  - Bổ sung hiển thị minh bạch 2 mốc thời gian:
    - Ngày kích hoạt đăng ký (`Subscribed at / started_at`)
    - Ngày hết hạn đăng ký (`Expires at / expires_at`)

---

### 📌 P2: DỌN DẸP DATA & PRIVACY VÀ LÀM GỌN TỔNG THỂ (CLEANUP & POLISH)

#### Task 2.1 [Data & Privacy Domain]: Tinh gọn Quota, Danh sách File, Sửa lỗi Popup Modal & Xóa Dead Features
- **File tác động:** `frontend/src/components/settings/sections/DataPrivacySection.tsx`, `frontend/src/components/settings/common/SettingsModal.tsx`
- **Yêu cầu chi tiết:**
  - **Sửa lỗi Popup Modal hiển thị lệch / phải cuộn xuống mới thấy:**
    - Cố định căn giữa màn hình cho `SettingsModal` (`fixed inset-0 z-50 flex items-center justify-center p-4`).
    - Khóa cuộn trang nền (`document.body.style.overflow = 'hidden'`) khi modal mở, loại bỏ tình trạng popup bị trôi xuống đáy trang do cuộn trang cha.
    - Giới hạn chiều cao tối đa của vùng nội dung modal (`max-h-[80vh] overflow-y-auto`) và tự động focus lên đầu modal.
  - **Export Project & Account Data (Tính năng THẬT):**
    - Giữ lại tính năng này vì backend xuất file ZIP hoàn chỉnh (`POST /api/subscriptions/storage/export-archive`).
    - Tinh gọn giao diện modal Export: Thay vì liệt kê danh sách dài các checkbox thực thể phức tạp gây lỗi tràn màn hình, thiết kế 1 nút bấm trực diện "Tải toàn bộ bản sao lưu ZIP" kèm tóm tắt dung lượng/số project.
  - **Bỏ bảng tỷ lệ trừ tĩnh:** Bỏ 4 ô tỷ lệ trừ từ (Whisper STT, Translation, Voice TTS, Subtitle Editor).
  - **Recent AI Word Deductions:** Tải toàn bộ lịch sử khấu trừ quota qua API `GET /api/subscriptions/audit-logs`, bỏ nút chuyển `Manage Plan`.
  - **Storage & Data Usage:** Bỏ toàn bộ chuỗi tên cột database kỹ thuật (`(videos.original_path)`, `(video_render_outputs.output_video_path)`, v.v.), thay bằng nhãn thân thiện.
  - **Largest Files:** Thiết kế lại danh sách file top tiêu thụ dung lượng theo dạng danh sách phẳng, gọn gàng, công thái học, không "AI slop".
  - **Bỏ 100% code AI Model Privacy & Training.**
  - **Bỏ 100% card Data Retention & Storage Lifecycle** (do backend không có worker thực thi).
  - **Delete Account:** Làm gọn modal, hiển thị chính xác email thật của user đang đăng nhập (bỏ email hardcoded `alex.morgan@vidnova.ai` và số dự án giả `28 video projects`).

#### Task 2.2 [Routing & Sidebar]: Cập nhật Router và Dọn dẹp File Mồ côi
- **File tác động:** `frontend/src/components/settings/SettingsSidebar.tsx`, `frontend/src/components/settings/MobileSettingsNav.tsx`, `frontend/src/pages/Settings.tsx`
- **Yêu cầu chi tiết:**
  - Cập nhật Sidebar và Mobile Nav chỉ render đúng 5 items: General, Billing, Notifications, Security, Data & Privacy.
  - Xóa bỏ các tệp mồ côi: `SettingsPlaceholderSection.tsx`, `SettingsGroup.tsx`.

---

## PHẦN 4: TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)
1. **Build & Syntax:** `npm run build` không phát sinh lỗi TypeScript hay CSS. Backend khởi động sạch sẽ không lỗi cú pháp.
2. **Log Format:** Mọi dòng log xuất ra đúng 100% mẫu quy chuẩn (FastAPI HTTP log, Celery worker log, không icon).
3. **UX Nhất quán:** Notifications tự động lưu mượt mà không có nút Save/Reset giả tạo; General tự phát hiện múi giờ và đổi font toàn app; Pro không bị hạ cấp thủ công; Data & Privacy sạch sẽ không còn nhãn kỹ thuật database.
