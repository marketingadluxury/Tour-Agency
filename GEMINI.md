# Hướng Dẫn Dành Cho Tất Cả Các Model Gemini (Tour CRM)

Tài liệu này là quy chuẩn bắt buộc áp dụng cho toàn bộ các model Gemini khi hỗ trợ dự án **Tour CRM**:

## 1. Quy Tắc Trình Bày & Giao Tiếp (Bắt Buộc)
- **Ngôn ngữ:** 100% trả lời bằng **Tiếng Việt**.
- **Thực hiện ngầm toàn bộ quá trình kiểm tra:**
  - Mọi bước đọc file, check cấu trúc, check lỗi trong `AGENTS.md` và `BUGS.md`, kiểm tra linter hay biên dịch đều diễn ra hoàn toàn ngầm trong hệ thống.
  - **Tuyệt đối KHÔNG** hiển thị log tool, mã lệnh console, kết quả git diff, tên file hay mã lỗi thô ra khung chat với người dùng.
  - Chỉ gửi phản hồi cuối cùng dưới dạng văn bản Tiếng Việt mạch lạc, ngắn gọn, súc tích và chuyên nghiệp.

## 2. Quy Trình 5 Bước Khi Triển Khai Task
1. **Bước 1 (Ngầm):** Kiểm tra lại trong `AGENTS.md` và `BUGS.md` về task.
2. **Bước 2:** Trao đổi, phản biện và xác nhận giải pháp với người dùng bằng Tiếng Việt.
3. **Bước 3:** Triển khai code theo đúng yêu cầu.
4. **Bước 4 (Ngầm):** Double check, chạy lint và build kiểm tra.
5. **Bước 5 (Ngầm):** Lưu lại thông tin công việc vào `BUGS.md` / `AGENTS.md`.

## 3. Quy Chuẩn Giao Diện (UI/UX) Bắt Buộc - Phòng Tránh Lỗi Tuyệt Đối
- **Quy tắc Zero Native Inputs:** 100% các ô chọn lựa và chọn ngày trên toàn hệ thống (bộ lọc, form tạo, form sửa, modal) phải sử dụng bộ component chuẩn hóa `CustomSelect.tsx` và `DatePicker.tsx`. Tuyệt đối **KHÔNG** sử dụng thẻ `<select>` hay `<input type="date">` thô của trình duyệt.
- **Quy tắc Chống Chồng Chéo & Phân Tầng Z-Index (Anti-Overlap Discipline):**
  - **Tự động đảo hướng mở (Auto-flip):** Toàn bộ popup, menu chọn (`CustomSelect`) và bộ lịch (`DatePicker`) phải luôn duy trì cơ chế tự động đo khoảng trống so với đáy màn hình/modal (`openUpward`). Khi khoảng trống bên dưới không đủ (< 250px đối với Select, < 330px đối với DatePicker), component BẮT BUỘC phải tự động bung ngược lên trên (`bottom-full mb-1.5`) để tránh tràn qua đáy modal hoặc che khuất thanh nút bấm hành động (Hủy / Lưu / Cập nhật).
  - **Phân tầng Z-Index triệt để:** Container bọc ngoài của `DatePicker` và `CustomSelect` khi kích hoạt (`isOpen === true`) phải luôn được nâng lên `z-[60]` (thay vì để mặc định `z-index: auto`), và khung popover phải có `z-[70]` đến `z-[100]`. Các khối form nằm liên tiếp theo chiều dọc phải thiết lập thứ tự giảm dần (`relative z-20`, `relative z-10`, `relative z-0`) để triệt tiêu vĩnh viễn hiện tượng viền, icon hay nút bấm phía dưới đè xuyên qua bề mặt lịch/menu đang mở.
- **Quy tắc Dropdown & Tránh Cắt Chữ (No Text Truncation):** Thiết lập độ rộng tối thiểu an toàn (`w-48` đến `w-64 sm:w-72`), chiều cao đồng bộ chuẩn `h-10`, bo góc mềm `rounded-xl`, icon trực quan, không để cụt chữ `...`.
- **Quy tắc Thiết kế Nút Bấm:** Tránh Double Icon (không thêm `+`, `-`, `*` vào text khi đã có Icon từ lucide-react), tránh trùng lặp 2 nút CTA cùng chức năng trong một màn hình.
- **Quy chuẩn Định Dạng:**
  - Thời gian: Luôn tuân thủ chuẩn `hh:mm dd/mm/yyyy` hoặc `dd/mm/yyyy`.
  - Số tiền & Phép tính: Luôn phân tách hàng nghìn (`10.000.000 đ`), không dùng KaTeX/LaTeX `$$`.

