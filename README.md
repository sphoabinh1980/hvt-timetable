# HVT Timetable App

Web app quản lý và tra cứu thời khóa biểu theo **ngày áp dụng**.

## Chức năng

- Trang **TKB học sinh** theo lớp.
- Trang **TKB giáo viên** theo giáo viên.
- Mặc định luôn chọn phiên bản có `ngày áp dụng <= ngày đang xem` và gần nhất.
- Upload một TKB trong tương lai **không làm thay đổi lịch hiện tại** trước ngày áp dụng.
- Có thể chọn ngày cũ để xem lại đúng TKB từng có hiệu lực.
- Admin upload Excel theo mẫu `Khoi10/11/12-S`, `Khoi10/11/12-C`.
- Admin import danh sách giáo viên để ánh xạ `Mã GV -> Họ tên đầy đủ`.
- Admin export danh sách giáo viên và export toàn bộ TKB giáo viên ra Excel.
- Lưu lịch sử các lần upload; có thể xóa phiên bản lỗi.
- Trên Render, dữ liệu được lưu trong **PostgreSQL** qua `DATABASE_URL`, nên redeploy/restart web service không làm mất thời khóa biểu.
- Khi không có `DATABASE_URL`, app tự fallback sang SQLite để chạy local/VPS.

## Đã kiểm tra với file mẫu người dùng cung cấp

Trên file `TKBL1(2).xlsx`, logic import nhận được:

- **41 lớp**
- **1.614 ô thời khóa biểu**
- **107 mã giáo viên** xuất hiện trong các ô có dạng `Môn - Mã GV`
- đủ 6 sheet lịch sáng/chiều của khối 10, 11, 12

File mẫu có dữ liệu giáo viên nên **không được đóng gói vào repository** để tránh vô tình public thông tin khi tạo GitHub công khai. Sau khi deploy, đăng nhập Admin và upload file này trực tiếp.

## Tài khoản Admin

- Username: `admin`
- Password: cấu hình qua biến môi trường `ADMIN_PASSWORD`.
- Phiên Admin mặc định có thời hạn 7 ngày (`SESSION_TTL_SECONDS=604800`).

Không lưu mật khẩu quản trị thật trong repository public.

## Chạy trên máy

```bash
npm install
cp .env.example .env
npm start
```

Mở: `http://localhost:3000`

Windows PowerShell:

```powershell
Copy-Item .env.example .env
npm install
npm start
```

Nếu để `DATABASE_URL` trống, app dùng SQLite ở `DATA_DIR`. Nếu đặt `DATABASE_URL=postgresql://...`, app tự tạo schema PostgreSQL và dùng database đó.

## Đưa lên GitHub

GitHub chỉ lưu source code. Vì app có backend + database nên **không dùng GitHub Pages**. Có thể kết nối repository này với Railway, Render, Fly.io hoặc VPS.

## Render Blueprint

`render.yaml` hiện tạo:

- Web service `hvt-timetable`
- PostgreSQL `hvt-timetable-db`
- tự gắn `DATABASE_URL` từ database vào web service

Nhờ vậy dữ liệu TKB không còn nằm trong filesystem tạm của Render web service.

> Lưu ý: Render Postgres **Free** hiện chỉ phù hợp chạy thử và hết hạn sau 30 ngày. Để dùng lâu dài, nâng database Render lên gói trả phí hoặc thay `DATABASE_URL` bằng PostgreSQL bền vững khác (ví dụ Neon/Supabase/Postgres riêng). Code app không cần thay đổi.

## Deploy bằng Docker

SQLite local:

```bash
docker build -t hvt-timetable .
docker run -p 3000:3000 \
  -e ADMIN_USER=admin \
  -e ADMIN_PASSWORD='your-admin-password' \
  -e SESSION_SECRET='replace-with-random-secret' \
  -v hvt_data:/app/data \
  hvt-timetable
```

PostgreSQL:

```bash
docker run -p 3000:3000 \
  -e ADMIN_USER=admin \
  -e ADMIN_PASSWORD='your-admin-password' \
  -e SESSION_SECRET='replace-with-random-secret' \
  -e DATABASE_URL='postgresql://user:password@host:5432/database' \
  hvt-timetable
```

## Cấu trúc file Excel TKB

Parser không khóa cứng vị trí cột. Nó tìm hàng có `Thứ` và `Tiết`, sau đó coi các cột lớp nằm phía sau cột `Tiết`. Vì vậy tương thích với khác biệt giữa khối 10 và khối 11–12 trong file mẫu.

Tên sheet được đọc:

- `Khoi10-S`, `Khoi11-S`, `Khoi12-S`
- `Khoi10-C`, `Khoi11-C`, `Khoi12-C`

## Quy tắc chọn phiên bản

Ví dụ database có:

- Lần 1 áp dụng `2026-09-06`
- Lần 2 áp dụng `2026-09-14`

Khi xem ngày `2026-09-10`, app dùng **Lần 1**. Khi xem ngày `2026-09-14` trở đi, app dùng **Lần 2**. Khi chọn lại `2026-09-08`, app lại hiển thị **Lần 1**.
