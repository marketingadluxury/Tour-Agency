# Hướng Dẫn Thiết Kế & Quy Chuẩn UI/UX (Design System Guidelines)

Tài liệu này lưu trữ quy chuẩn thiết kế giao diện (UI), cấu trúc CSS, font chữ, bố cục màu sắc, cách xây dựng các component và quy tắc chống lỗi giao diện cho toàn bộ hệ thống **Tour CRM - Quản lý Công ty Du lịch**.

---

## 1. Nguyên Tắc Thiết Kế Cốt Lõi (Core UI Principles)

### 1.1 Zero Native Inputs (Không dùng input/select thô)
- **100% Dropdown / Hộp chọn:** Phải sử dụng component `CustomSelect.tsx`. Tuyệt đối không dùng thẻ `<select>` gốc của HTML.
- **100% Bộ chọn ngày / Lịch:** Phải sử dụng component `DatePicker.tsx` chuẩn Tiếng Việt (hỗ trợ nhập `dd/mm/yyyy`, mở lịch trực quan, có nút Hôm nay, Xóa ngày). Tuyệt đối không dùng thẻ `<input type="date">` gốc của trình duyệt.

### 1.2 Chống Chồng Chéo & Phân Tầng Z-Index (Anti-Overlap & Stacking Context)
- **Tự động đảo hướng mở (Auto-flip placement):**
  - Mọi component có popover hoặc dropdown (`DatePicker`, `CustomSelect`) phải duy trì cơ chế đo khoảng cách đến đáy màn hình / đáy modal (`openUpward`).
  - Nếu khoảng cách bên dưới không đủ (< 250px cho Select, < 330px cho DatePicker), component **bắt buộc phải tự động mở lên trên** (`bottom-full mb-1.5`).
  - Ngăn chặn hoàn toàn việc popover tràn qua đáy modal hoặc che khuất thanh nút hành động (*Hủy bỏ*, *Lưu*, *Cập nhật*).
- **Phân tầng Z-Index triệt để:**
  - Container ngoài của component khi mở (`isOpen === true`): Phải có `z-[60]`.
  - Khung nội dung menu/lịch bên trong: Phải có `z-[70]` đến `z-[100]`.
  - Trong các biểu mẫu dọc (form), các khối kề nhau phải được thiết lập thứ tự giảm dần: `relative z-20`, `relative z-10`, `relative z-0` để ngăn các viền hoặc icon của các trường phía dưới đè xuyên qua bề mặt popup đang mở.

### 1.3 Độ Rộng An Toàn Cho Dropdown (No Text Truncation)
- Tất cả các hộp chọn (`CustomSelect`) có nhãn dài hoặc đi kèm biểu tượng (Icon + Chevron) phải được đặt độ rộng an toàn từ `w-48` đến `w-64 sm:w-72` tùy độ dài text.
- Không để xảy ra tình trạng cắt cụt chữ dạng `...` gây mất thông tin hoặc vỡ layout trên các thiết bị.

### 1.4 Quy Tắc Thiết Kế Nút Bấm (Button Discipline)
- **Tránh Double Icon:** Không thêm các ký tự biểu tượng thủ công (như `+`, `-`, `*`) vào text khi nút đã dùng icon từ `lucide-react` (ví dụ: dùng `<Plus />` kèm `<span>Tạo đơn</span>`, tuyệt đối không viết `<span>+ Tạo đơn</span>`).
- **Tránh nút trùng lặp:** Không đặt 2 nút Call-to-Action có cùng chức năng nằm cạnh nhau trong cùng một khung màn hình.

---

## 2. Quy Chuẩn Kích Thước & Kiểu Dáng (Sizing & Typography)

### 2.1 Kích Thước Chuẩn Cho Các Ô Nhập & Dropdown
- **Chiều cao chuẩn:** `h-10` (40px) cho toàn bộ input, select, datepicker và các nút bấm đi kèm.
- **Bo góc chuẩn:** `rounded-xl` (12px) cho tất cả input, select, datepicker, badge và card nhỏ.
- **Font size chuẩn:**
  - Nhãn (Label): `text-xs font-bold text-gray-700 uppercase tracking-wide`.
  - Giá trị hiển thị trong ô nhập / dropdown: `text-xs font-semibold text-slate-800`.
  - Ghi chú phụ (Helper text): `text-[11px] text-slate-500 font-medium`.
- **Viền & Đổ bóng:**
  - Viền mặc định: `border border-slate-200` hoặc `border-slate-300`.
  - Khi hover: `hover:border-slate-400` hoặc `hover:bg-slate-50`.
  - Khi focus/active: `focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none`.
  - Đổ bóng nhẹ: `shadow-2xs` hoặc `shadow-xs`.

### 2.2 Quy Chuẩn Định Dạng Số Liệu & Thời Gian
- **Thời gian:** Luôn hiển thị theo định dạng `hh:mm dd/mm/yyyy` hoặc `dd/mm/yyyy`.
- **Số tiền & Tài chính:** Luôn phân tách hàng nghìn bằng dấu chấm (VD: `10.500.000 đ`).
- **Phép tính & Công thức:** Trình bày bằng văn bản Markdown Tiếng Việt thuần túy, rõ ràng. Tuyệt đối **không** dùng KaTeX/LaTeX `$$`.

---

## 3. Quy Chuẩn Vỏ Modal & Biểu Mẫu (Modal Architecture)

- **Lớp phủ nền (Backdrop):** `fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto`.
- **Khung chứa Modal:**
  - `bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-lg overflow-hidden my-8`.
  - Nếu form có nhiều trường (> 8 trường): Cần thiết lập `max-h-[90vh] flex flex-col`, phần thân form có `overflow-y-auto` và thanh footer được giữ cố định ở đáy.
- **Thanh tiêu đề (Modal Header):**
  - Nền tối hoặc sáng sang trọng: `p-5 bg-slate-900 text-white flex items-center justify-between` kèm icon trực quan và nút đóng `<X className="w-5 h-5" />`.
- **Thanh hành động đáy (Modal Footer):**
  - `pt-4 border-t border-slate-150 flex items-center justify-end gap-3`.
  - Nút Hủy: `px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black`.
  - Nút Xác nhận / Lưu: `px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-600/10`.
