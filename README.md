# Tour CRM — Hệ Thống Quản Trị & Điều Hành Công Ty Du Lịch Lữ Hành (Open-Source Edition)

**Tour CRM** là nền tảng quản trị doanh nghiệp (ERP/CRM) toàn diện được thiết kế chuyên biệt cho các **Công ty Du lịch & Lữ hành**. Hệ thống kết nối liền mạch từ khâu tiếp cận khách hàng (Marketing, Meta CAPI, Pancake), kinh doanh (Sale, Đại lý, CTV), điều phối tour (Operator, Hướng dẫn viên), dịch vụ Visa, đến tài chính kế toán (Hạch toán lãi lỗ, Phiếu thu/chi, Đề nghị thanh toán) và Hành chính Nhân sự.

Phiên bản **Open-Source (White-label)** này được chia sẻ miễn phí cho cộng đồng doanh nghiệp du lịch, sẵn sàng triển khai độc lập chỉ trong vài phút với **React 19 + Vite + Tailwind CSS** và **Supabase**.

---

## 🌟 Các Phân Hệ Chính Của Hệ Thống

1. **Lịch Khởi Hành Tour (Departure Calendar & Public View-Only):**
   - Cho phép khách hàng và đối tác tra cứu lịch khởi hành, hành trình, hãng bay, số chỗ trống theo thời gian thực và tải file PDF chương trình tour mà không cần đăng nhập.
   - Tự động bảo mật thông tin hoa hồng đại lý và đối tác nội bộ đối với khách vãng lai.
2. **Quản Lý Tour & Điều Phối Chỗ (Operator):**
   - Khai báo tour đơn lẻ hoặc tạo hàng loạt (Series), quản lý hạn mức chỗ mở bán tiêu chuẩn và giới hạn bán vượt (**Overbooking +OB**).
   - Theo dõi hạn xuất vé máy bay (Ticket Deadline), hạn nộp hồ sơ Visa (Visa Deadline), chia xe, phân công Hướng dẫn viên.
3. **Quản Lý Booking & Giữ Chỗ Thực Tế (Hold 5 Phút):**
   - Cơ chế khóa chỗ tạm thời 5 phút khi nhân viên Sale/Đại lý đang nhập thông tin khách.
   - Hỗ trợ nhiều khoản phụ thu linh hoạt (`surcharges`), tính toán giá chênh lệch CTV (`price_markup`), phí công ty thu và tự động tính hoa hồng thực nhận cho Đại lý/CTV.
   - Xuất & in **Hợp đồng Dịch vụ Du lịch Online chuẩn A4 (12 điều khoản)** kèm mã thanh toán động **VietQR Napas 24/7** và lưu PDF lên Google Drive.
4. **Dịch Vụ Visa & Xử Lý Hồ Sơ (`Kanban & Danh sách`):**
   - Tách biệt độc lập sản phẩm Visa lẻ và Tour du lịch.
   - Quản lý tiến độ xét duyệt hồ sơ Visa của từng hành khách, lưu trữ hộ chiếu và chứng từ lên kho lưu trữ đám mây.
5. **Kế Toán, Hạch Toán Lãi/Lỗ & Đề Nghị Thanh Toán:**
   - Bảng hạch toán doanh thu – chi phí – lợi nhuận gộp theo từng đoàn tour.
   - Quản lý Phiếu thu / Phiếu chi, đối soát công nợ và phê duyệt **Giấy Đề Nghị Thanh Toán** chuẩn A4.
   - Tích hợp **Sổ tay Thuế Lữ hành 2025 – 2026** kèm 3 công cụ tính nhanh: Thuế GTGT Tour Outbound/Inbound, Thuế TNCN & Hoa hồng CTV 10%, và Thuế nhà thầu (FCT) quảng cáo.
6. **Hành Chính Nhân Sự (HR), Chấm Công & Quỹ Phép Năm:**
   - Quản lý hồ sơ nhân sự (Thử việc / Chính thức), cơ cấu phòng ban & đội nhóm kinh doanh.
   - Tự động tính quỹ phép năm tích lũy động (**1 ngày / tháng** dựa trên ngày làm chính thức) và quy trình phê duyệt đơn xin nghỉ phép 2 cấp chuẩn hóa.
7. **Tích Hợp Mở Rộng Đa Kênh:**
   - **WordPress WooCommerce + ACF Repeater:** Đồng bộ tour và lịch khởi hành nhiều đợt lên website bán tour chỉ với 1 click.
   - **Google Drive & Google Sheets:** Tự động phân loại thư mục lưu trữ Hợp đồng, Ảnh kỷ niệm đoàn của HDV, Hóa đơn chứng từ.
   - **Meta Conversions API (CAPI) & Pancake/Messenger:** Quản lý Lead tiềm năng và tối ưu hóa chuyển đổi quảng cáo.

---

## 🛠️ Công Nghệ Sử Dụng

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Motion, Recharts.
- **Backend:** Node.js, Express (`server.ts` / Serverless API), Google Drive API v3, WooCommerce REST API.
- **Database & Auth:** Supabase (PostgreSQL, Authentication, Row Level Security, Realtime, Storage).

---

## 🚀 Hướng Dẫn Cài Đặt Chi Tiết Từ A - Z

### Bước 1: Tải mã nguồn & Cài đặt thư viện

```bash
git clone <url-repo-cua-ban>
cd tour-crm
npm install
```

---

### Bước 2: Khởi tạo Project Supabase & Chạy Database Schema

1. Truy cập [Supabase Dashboard](https://supabase.com/dashboard) và nhấn **New Project** để tạo một dự án mới.
2. Sau khi project khởi tạo xong, vào mục **SQL Editor** ở thanh menu bên trái -> Nhấn **New Query**.
3. Mở file **`supabase-schema.sql`** trong thư mục gốc của mã nguồn này, copy **toàn bộ nội dung** và dán vào cửa sổ SQL Editor trên Supabase.
4. Nhấn nút **Run** (hoặc `Ctrl + Enter`) để hệ thống tự động tạo đầy đủ các bảng (`profiles`, `tours`, `orders`, `passengers`, `invoices`, `payment_proposals`, `leave_requests`, `app_settings`...), phân quyền bảo mật (RLS) và Trigger tự động gán quyền Admin.

---

### Bước 3: Tạo Storage Bucket `"crm-attachments"` (Public)

Hệ thống cần một Bucket trên Supabase Storage để lưu trữ ảnh ủy nhiệm chi, hồ sơ visa, hộ chiếu và file PDF lịch trình:

1. Trên giao diện Supabase Dashboard, chọn mục **Storage** ở thanh menu bên trái.
2. Nhấn nút **New bucket**.
3. Nhập tên bucket chính xác là: **`crm-attachments`**
4. Bật công tắc **Public bucket** sang trạng thái **ON** (Cho phép đọc URL công khai).
5. Nhấn **Save** để hoàn tất. *(Lưu ý: Các chính sách RLS cho phép tải lên và xem file đối với bucket `crm-attachments` đã được thiết lập tự động trong file `supabase-schema.sql` ở Bước 2).*

---

### Bước 4: Cấu hình Biến Môi Trường (`.env`)

1. Tại thư mục gốc của dự án, sao chép file `.env.example` thành file `.env`:
   ```bash
   cp .env.example .env
   ```
2. Vào **Supabase Dashboard** -> **Project Settings** (biểu tượng bánh răng) -> **API** để lấy thông tin kết nối và điền vào file `.env`:

```env
# 1. CẤU HÌNH SUPABASE (BẮT BUỘC)
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOi........."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGc........."

# 2. CẤU HÌNH TRỢ LÝ AI (TÙY CHỌN)
GEMINI_API_KEY="your-gemini-api-key"

# 3. CẤU HÌNH GOOGLE DRIVE LƯU TRỮ HỢP ĐỒNG & ẢNH ĐOÀN (TÙY CHỌN - Có thể cấu hình trực tiếp trên giao diện Cài đặt)
GOOGLE_DRIVE_CLIENT_ID=""
GOOGLE_DRIVE_CLIENT_SECRET=""
GOOGLE_DRIVE_REFRESH_TOKEN=""
GOOGLE_DRIVE_PARENT_FOLDER_ID=""
```

> 💡 **Mẹo:** Biến `SUPABASE_SERVICE_ROLE_KEY` giúp Quản trị viên có thể tạo, đặt lại mật khẩu và quản lý tài khoản nhân viên trực tiếp ngay trong trang *Cài đặt hệ thống -> Quản lý người dùng*.

---

### Bước 5: Đăng ký Tài khoản Quản trị viên (Admin) đầu tiên

Hệ thống đã được cấu hình sẵn cơ chế tự động nhận diện email Quản trị viên mặc định là **`admin@yourcompany.com`**:

1. Khởi chạy ứng dụng và truy cập trang **Đăng nhập** (`/login`).
2. Chuyển sang chế độ **Đăng ký tài khoản mới** và đăng ký với email:
   - **Email:** `admin@yourcompany.com`
   - **Mật khẩu:** *(Tùy chọn, tối thiểu 6 ký tự)*
3. Ngay khi đăng ký (hoặc đăng nhập lần đầu), Trigger trong Database và hệ thống xác thực sẽ **tự động cấp quyền `admin` (Quản trị viên tối cao)** cho tài khoản này.
4. *(Tùy chọn)* Nếu bạn muốn dùng email riêng của công ty bạn làm Admin mặc định, bạn chỉ cần sửa lại chuỗi `admin@yourcompany.com` trong `supabase-schema.sql` và `src/context/AuthContext.tsx`, hoặc vào bảng `profiles` trên Supabase đổi cột `role` của tài khoản bạn thành `'admin'`.

---

### Bước 6: Chạy ứng dụng tại máy cục bộ (Local Development)

- **Khởi chạy máy chủ phát triển (Frontend + Backend Express tại cổng 3000):**
  ```bash
  npm run dev
  ```
  Sau đó mở trình duyệt tại địa chỉ: `http://localhost:3000`

- **Kiểm tra Linter (TypeScript) & Chạy bộ Kiểm thử tự động (Unit Tests):**
  ```bash
  npm run lint
  npm test
  ```

- **Đóng gói bản Production (Build):**
  ```bash
  npm run build
  ```

---

## ☁️ Hướng Dẫn Deploy Lên Vercel

Dự án đã được cấu hình sẵn sàng cho kiến trúc Serverless trên **Vercel** (thông qua thư mục `/api`):

1. Đẩy mã nguồn dự án của bạn lên kho lưu trữ **GitHub** cá nhân hoặc tổ chức.
2. Truy cập [Vercel Dashboard](https://vercel.com/dashboard) -> Nhấn **Add New...** -> **Project** và chọn repository GitHub vừa tạo.
3. Trong phần **Build and Output Settings**, giữ nguyên cấu hình mặc định của Vite:
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Trong phần **Environment Variables**, thêm đầy đủ các biến môi trường từ file `.env` của bạn:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - *(Cùng các biến tùy chọn khác nếu có sử dụng)*
5. Nhấn **Deploy** và chờ khoảng 1 phút để Vercel hoàn tất quá trình triển khai.

---

## 📄 Giấy Phép (License)

Dự án được phát hành dưới giấy phép mã nguồn mở **MIT License**. Các công ty du lịch, đại lý lữ hành và lập trình viên hoàn toàn tự do sử dụng, tùy biến thương hiệu và phát triển thêm tính năng phục vụ hoạt động kinh doanh.
