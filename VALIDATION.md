# Validation report — TKBL1(2).xlsx

Bộ import đã được đối chiếu với chính cấu trúc file mẫu mà người dùng cung cấp.

| Sheet | Số lớp | Số ô có dữ liệu |
|---|---:|---:|
| Khoi10-S | 15 | 436 |
| Khoi11-S | 13 | 376 |
| Khoi12-S | 13 | 387 |
| Khoi10-C | 15 | 152 |
| Khoi11-C | 13 | 131 |
| Khoi12-C | 13 | 132 |
| **Tổng** | **41 lớp duy nhất** | **1.614** |

Có **107 mã giáo viên duy nhất** được phát hiện trong các ô có dạng `Môn - Mã GV`.

Các khác biệt bố cục đã được parser xử lý:

- Khối 10: hàng tiêu đề dạng `Thứ | Tiết | lớp...`.
- Khối 11/12: hàng tiêu đề dạng `Thứ | Buổi | Tiết | lớp...`.
- Ô `Thứ` để trống ở các tiết tiếp theo được hiểu là tiếp tục cùng ngày.
- Buổi sáng/chiều được xác định chắc chắn từ hậu tố sheet `-S` / `-C`.
- Các ô như `GDTC`, `Nâng cao` vẫn được giữ để hiển thị nhưng không tạo mã giáo viên giả.
