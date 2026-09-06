# Đẩy HVT Timetable lên GitHub và chạy online

## 1. Tạo repository GitHub

Tạo repository mới, ví dụ `hvt-timetable-app`, để chế độ Private nếu dữ liệu giáo viên không muốn công khai.

Trong thư mục app:

```bash
git init
git add .
git commit -m "HVT timetable v1"
git branch -M main
git remote add origin https://github.com/USERNAME/hvt-timetable-app.git
git push -u origin main
```

## 2. Không dùng GitHub Pages

GitHub Pages chỉ host HTML tĩnh. App này cần server để giữ mật khẩu Admin ở backend, nhận file Excel, lưu nhiều phiên bản TKB, tự chọn phiên bản theo ngày áp dụng và import/export Excel.

Vì vậy GitHub là nơi lưu code. Sau đó kết nối repository với Railway/Render/VPS.

## 3. Biến môi trường bắt buộc khi public

```text
ADMIN_USER=admin
ADMIN_PASSWORD=<mật khẩu quản trị của bạn>
SESSION_SECRET=<chuỗi ngẫu nhiên dài tối thiểu 32 ký tự>
DATA_DIR=/app/data
SCHOOL_NAME=HVT
TZ=Asia/Ho_Chi_Minh
```

## 4. Persistent storage

Phải mount volume/persistent disk vào `/app/data`. File SQLite nằm trong thư mục đó.

## 5. Sau khi web chạy

1. Mở `/admin.html`.
2. Đăng nhập bằng `ADMIN_USER` / `ADMIN_PASSWORD` đã cấu hình trên server.
3. Chọn file TKB Excel.
4. Chọn **Ngày áp dụng**.
5. Nhấn **Import thời khóa biểu**.
6. Nếu có danh sách họ tên GV đầy đủ, import file `Mã GV / Tên giáo viên / Môn`.
7. Trang học sinh và giáo viên tự dùng bản gần nhất đã tới ngày áp dụng.
