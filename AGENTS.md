# Tour CRM - Bộ Não Dự Án (Project Brain & Instructions)

Tài liệu này lưu trữ toàn bộ thông tin cốt lõi, quy tắc phát triển, cấu trúc dữ liệu và các lưu ý quan trọng của dự án **Tour CRM - Quản lý Công ty Du lịch**. File này được hệ thống AI tự động đọc để đảm bảo tính nhất quán và hiểu sâu sắc về dự án trong mọi phiên làm việc tiếp theo.

---

## 1. Thông Tin Tổng Quan Dự Án
- **Tên ứng dụng:** Tour CRM - Quản lý cty du lịch
- **Mô tả:** Hệ thống quản lý Tour du lịch, Đại lý, Visa và Kế toán dành cho công ty du lịch lữ hành.
- **Công nghệ chính:**
  - **Frontend:** React 19, Vite, Tailwind CSS, Lucide-React, Motion (Framer Motion).
  - **Backend & Database:** Supabase (PostgreSQL, Auth, Storage).
  - **Môi trường Deploy:** GitHub + Vercel (Frontend), Supabase (Database & Storage).

---

## 2. Quy Tắc Hoạt Động & Giao Tiếp (Bắt Buộc Cho Mọi Model Gemini)
- **Ngôn ngữ giao tiếp:** Luôn luôn phản hồi bằng **Tiếng Việt**.
- **Bảo mật & Trình bày kết quả (Quy tắc Thực hiện Ngầm & Không xuất log):**
  - **TẤT CẢ các bước kiểm tra (Bước 1: Check AGENTS.md, BUGS.md; Bước 4: Double check...) chỉ được diễn ra ngầm (hoàn toàn silent trong quá trình suy nghĩ và gọi công cụ).**
  - **Tuyệt đối KHÔNG** hiển thị các thông tin chạy ngầm của hệ thống, mã lệnh, kết quả tool call thô, tên file, đường dẫn nội bộ, log diff hay các chi tiết kỹ thuật ra giao diện trò chuyện cho người dùng.
  - Tất cả phản hồi gửi tới người dùng chỉ bao gồm kết quả cuối cùng, được tổng hợp bằng **Tiếng Việt** ngắn gọn, rõ ràng, lịch sự và chuyên nghiệp.
- **Định dạng hiển thị phép tính & công thức:** Tuyệt đối **KHÔNG** sử dụng công thức KaTeX/LaTeX hay các ký tự khối hệ thống như `$$`, `\text`, `\math`. Tất cả số liệu, phép tính, chiết khấu và giải thích số tiền phải được trình bày dưới dạng văn bản Tiếng Việt thuần túy, rõ ràng, trực quan (dùng văn bản Markdown thông thường, gạch đầu dòng, dấu trừ `-`, dấu cộng `+`, dấu bằng `=`) để đảm bảo dễ đọc và thân thiện trên mọi giao diện.
- **Định dạng Thời gian & Lịch:**
  - **Định dạng hiển thị thời gian:** Tất cả thời gian trên hệ thống phải luôn tuân thủ chuẩn **`hh:mm dd/mm/yyyy`** (hoặc `dd/mm/yyyy` đối với ngày thuần túy).
  - **Lịch chọn ngày (Calendar):** Luôn sử dụng bộ chọn ngày chuẩn hóa Tiếng Việt (Thứ 2 - CN, Tháng 1 - Tháng 12, Hôm nay, Xóa ngày...) thông qua component `DatePicker.tsx` để đảm bảo trải nghiệm thuần Việt trên mọi thiết bị và trình duyệt. Tuyệt đối KHÔNG sử dụng thẻ `<input type="date">` thô của trình duyệt.
- **Quy tắc Chuẩn Hóa 100% Calendar & Dropdown (Zero Native Inputs):**
  - **Không dùng native `<select>` & `<input type="date">`:** 100% các ô chọn lựa và chọn ngày trên toàn hệ thống (bộ lọc, form tạo, form sửa, modal) phải sử dụng bộ component chuẩn hóa `CustomSelect.tsx` và `DatePicker.tsx`.
  - **Tính đồng bộ thiết kế:** Tất cả các ô nhập liệu, dropdown và datepicker phải đồng bộ chiều cao `h-10`, bo góc mềm `rounded-xl`, viền `border-slate-200/300`, hiệu ứng shadow và icon trực quan.
- **Quy tắc Chống Chồng Chéo & Phân Tầng Z-Index (Anti-Overlap & Stacking Context Discipline):**
  - **Tự động đảo hướng mở thông minh (Auto-flip Placement):** Toàn bộ popup, menu chọn (`CustomSelect`) và bộ lịch (`DatePicker`) phải luôn duy trì cơ chế tự động đo khoảng trống so với đáy viewport/modal (`openUpward`). Khi khoảng trống bên dưới không đủ (< 250px đối với Select, < 330px đối với DatePicker), component BẮT BUỘC phải tự động bung ngược lên trên (`bottom-full mb-1.5`) để tránh tuyệt đối việc tràn qua đáy modal hoặc che khuất thanh nút bấm hành động (Hủy / Lưu / Cập nhật).
  - **Phân tầng Z-Index triệt để:** Container bọc ngoài của `DatePicker` và `CustomSelect` khi kích hoạt (`isOpen === true`) phải luôn được nâng lên `z-[60]` (thay vì để mặc định `z-index: auto`), và khung popover phải có `z-[70]` đến `z-[100]`. Các khối form nằm liên tiếp theo chiều dọc phải được thiết lập thứ tự giảm dần (`relative z-20`, `relative z-10`, `relative z-0`) để triệt tiêu vĩnh viễn hiện tượng viền, icon hay nút bấm phía dưới đè xuyên qua bề mặt lịch/menu đang mở.
- **Quy tắc Thiết kế Nút Bấm & Tránh Double Icon / Duplicate CTA (Bắt Buộc):**
  - **Tránh Double Icon:** Tuyệt đối không thêm các ký tự biểu tượng thủ công (như `+`, `*`, `-`) vào chuỗi text khi button/component đã sử dụng Icon tương ứng từ `lucide-react` (ví dụ: dùng `<Plus />` kèm `<span>Tạo đơn</span>`, tuyệt đối không viết `<span>+ Tạo đơn</span>`).
  - **Tránh trùng lặp nút:** Không đặt 2 nút hành động chính (Call-to-Action) có cùng chức năng nằm cạnh nhau trong cùng một cụm màn hình/khối giao diện.
- **Quy tắc Thiết kế Dropdown & Tránh Cắt Cụt Ký Tự (No Text Truncation):**
  - **Độ rộng an toàn cho Dropdown (CustomSelect):** Tất cả các ô chọn (dropdown/select) có nhãn dài hoặc đi kèm biểu tượng (Icon + Chevron) phải được thiết lập độ rộng tối thiểu an toàn (từ `w-40` đến `w-64 sm:w-72` tùy độ dài text) để đảm bảo không bao giờ bị tràn viền hoặc cắt cụt hiển thị dạng `...` trên mọi thiết bị và độ phân giải.
  - **Chuẩn hóa nhãn phân trang:** Sử dụng nhãn gãy gọn theo chuẩn nghiệp vụ (ví dụ: `10 tour / trang` hoặc `10 mục / trang` thay vì chuỗi dài dễ gây vỡ layout).
- **Quy trình thay đổi logic:** Trước khi thực hiện bất kỳ thay đổi nào về logic hệ thống, cấu trúc database, hoặc tính năng chính, **PHẢI** giải thích chi tiết giải pháp cho người dùng và chỉ thực hiện sau khi có sự xác nhận của người dùng.
- **Quy tắc Quản lý CSS & Chống Lỗi React 19 (Zero Inline Style Tags in JSX):** Tuyệt đối **KHÔNG** nhúng thẻ `<style>{`...`}</style>` trực tiếp trong cây JSX của bất kỳ component nào. Trong React 19, các thẻ `<style>` nhúng trong JSX được coi là thẻ tài nguyên (Resource Hoisting) và sẽ kích hoạt lỗi nghiêm trọng `Internal React error: Expected static flag was missing. Please notify the React team` khi render/unmount động trong modal. Mọi quy tắc CSS in ấn (`@media print`) hoặc kiểu dáng toàn cục phải được khai báo tập trung trong `src/index.css`.
- **Quản lý File & Storage:** 
  - **TẤT CẢ** các file tải lên (hình ảnh, tài liệu, file visa, hộ chiếu, hóa đơn...) **phải luôn được lưu vào Supabase Storage**.
  - **Chỉ** lưu thông tin text, đường dẫn liên kết (URL của file từ Storage) và siêu dữ liệu (metadata) vào các bảng (table) trong database. Không lưu trữ file trực tiếp hay dạng base64 trong database.

---

## 3. Cấu Hình Tài Khoản Quản Trị Viên (Admin)
- Email sau đây được cấu hình mặc định làm **Quản trị viên (Admin)** tối cao của hệ thống:
  1. `admin@yourcompany.com`
- **Cơ chế hoạt động:**
  - Khi người dùng đăng ký hoặc đăng nhập lần đầu bằng email này, hệ thống sẽ tự động gán/cập nhật vai trò (role) thành `admin` thông qua cả Trigger trong database (`supabase-schema.sql`) và kiểm tra logic ở Client (`AuthContext.tsx`).

---

## 4. Cấu Trúc Database Supabase (Schema)
Dưới đây là cấu trúc các bảng chính cần thiết đã được định nghĩa trong file `supabase-schema.sql`:

### 4.1 Bảng `profiles` (Thông tin người dùng & phân quyền)
- `id` (uuid, primary key, tham chiếu `auth.users.id`)
- `full_name` (text)
- `phone` (text)
- `company_name` (text)
- `role` (text: 'admin', 'sale', 'sale_leader', 'operator', 'accounting', 'visa', 'CTV', 'bod')
- `created_at` (timestamp)

### 4.2 Bảng `tours` (Danh sách Tour du lịch & Lịch khởi hành)
- `id` (uuid, primary key)
- `title` (text)
- `tour_code` (text, unique)
- `start_date` (date)
- `end_date` (date)
- `price_adult` (numeric)
- `price_child` (numeric)
- `slots_total` (integer)
- `slots_available` (integer)
- `status` (text: 'upcoming', 'active', 'completed', 'cancelled')
- `created_at` (timestamp)

### 4.3 Bảng `bookings` / `orders` (Quản lý Booking / Đơn hàng Tour)
- `id` (uuid, primary key)
- `tour_id` (uuid, tham chiếu `tours.id`)
- `created_by` (uuid, tham chiếu `profiles.id`)
- `customer_name` (text)
- `customer_phone` (text)
- `customer_email` (text)
- `adult_count` (integer)
- `child_count` (integer)
- `total_price` / `total_amount` (numeric)
- `surcharges` (jsonb - danh sách mảng các khoản phụ thu chi tiết `{id, name, amount}`)
- `surcharge_name` (text)
- `surcharge_amount` (numeric)
- `price_markup` (numeric - tiền tour chênh lệch khi bán qua CTV)
- `markup_tax_percent` (numeric - % phí công ty thu trên chênh lệch, mặc định 25%)
- `markup_fee_amount` (numeric - số tiền phí công ty thu)
- `payment_status` (text: 'unpaid', 'partially_paid', 'paid')
- `booking_status` (text: 'pending', 'confirmed', 'cancelled')
- `created_at` (timestamp)

### 4.4 Bảng `passengers` (Danh sách hành khách tham gia Tour)
- `id` (uuid, primary key)
- `order_id` (uuid, tham chiếu `orders.id`)
- `full_name` (text)
- `gender` (text)
- `birthday` (date)
- `passport_number` (text)
- `passport_expiry` (date)
- `visa_status` (text: 'none', 'applied', 'approved', 'rejected')
- `visa_file_url` (text - link lưu trong Storage)
- `created_at` (timestamp)

### 4.5 Bảng `invoices` (Quản lý Thu/Chi & Kế toán)
- `id` (uuid, primary key)
- `order_id` (uuid, tham chiếu `orders.id`)
- `invoice_code` (text, unique)
- `type` (text: 'receipt' - phiếu thu, 'payment' - phiếu chi)
- `amount` (numeric)
- `payment_method` (text)
- `description` (text)
- `status` (text: 'pending', 'approved', 'rejected')
- `created_by` (uuid, tham chiếu `profiles.id`)
- `created_at` (timestamp)

### 4.6 Bảng `tour_media` (Lưu Album Ảnh Kỷ Niệm Đoàn Của HDV)
- `id` (uuid, primary key)
- `tour_id` (uuid, tham chiếu `tours.id`)
- `tour_code` (text)
- `file_url` (text - link ảnh trên Storage/Drive)
- `file_id` (text)
- `file_name` (text)
- `file_size` (numeric)
- `uploaded_by` (text)
- `uploader_role` (text)
- `caption` (text)
- `created_at` (timestamp)

### 4.7 Bảng `woocommerce_configs` (Cấu Hình Tích Hợp WordPress & ACF)
- `id` (uuid, primary key)
- `site_url` (text - tên miền website WordPress có HTTPS)
- `consumer_key` (text - khóa WooCommerce API ck_...)
- `consumer_secret` (text - mã bí mật WooCommerce API cs_...)
- `is_active` (boolean)
- `auto_sync_on_save` (boolean - tự động đồng bộ khi tạo/sửa tour)
- `auto_sync_on_booking` (boolean - tự động cập nhật số chỗ trống khi có booking)
- `field_mappings` (jsonb - bảng ánh xạ trường ACF)
- `created_at`, `updated_at` (timestamp)

---

## 5. Cấu Hình Supabase Storage (Yêu Cầu)
- **Bucket bắt buộc:** Tạo một bucket tên là `crm-attachments` hoặc các bucket tương ứng với mục đích để lưu trữ:
  - Tài liệu Visa (`visa_file_url` trong bảng hành khách).
  - Hóa đơn / Chứng từ thanh toán.
  - Tài liệu đính kèm khác.
- **Chính sách bảo mật (RLS) cho Storage:** Đảm bảo chỉ người dùng đã đăng nhập (authenticated) mới được tải lên và đọc tài liệu.

---

## 6. Hướng Dẫn Khởi Tạo Hệ Thống (Dành cho Lập trình viên)
1. **Thiết lập Database:** Copy toàn bộ nội dung trong file `supabase-schema.sql` chạy trong mục **SQL Editor** trên Dashboard của Supabase để khởi tạo tất cả các bảng, enum, trigger tự động đồng bộ tài khoản auth và profile.
2. **Thiết lập Biến Môi Trường:** Tạo file `.env` từ `.env.example` và điền thông tin kết nối Supabase của bạn:
   ```env
   VITE_SUPABASE_URL="https://your-project.supabase.co"
   VITE_SUPABASE_ANON_KEY="your-anon-key"
   ```
3. **Cập nhật và Phát triển:** 
   - Kiểm tra phân quyền phân vai trò người dùng trong `CRMContext.tsx`.
   - Luôn tuân thủ quy trình kiểm tra linter (`npm run lint`), kiểm thử tự động (`npm test`, `npm run test:simulation`) và xây dựng (`npm run build`) trước khi hoàn thành công việc.
   - **Hệ thống Automation Test (Vitest & Simulation):** Đã được tích hợp sẵn sàng trong dự án với 2 lệnh:
     + `npm test`: Chạy toàn bộ Unit Tests kiểm tra tính toán tài chính, phân quyền vai trò và tích lũy phép năm.
     + `npm run test:simulation`: Kịch bản kiểm thử độc lập mô phỏng hành vi người dùng, kiểm tra phân quyền và toàn vẹn dữ liệu cho 4 vai trò: Sale, Bộ phận Visa, Điều hành Tour, và Kế toán.

---

## 7. Quy Tắc Phân Quyền & Tính Năng Đặc Biệt (Cập Nhật Mới)
- **Modal Đồng Bộ Hàng Loạt Chuyên Dụng Lên WooCommerce (`BulkSyncWooCommerceModal.tsx` & `SyncTourToWooCommerceModal.tsx`):**
  - **Duyệt & Tích chọn Tour:** Thay thế toàn bộ hộp thoại `window.confirm` ngầm trước đây. Khi bấm nút "Đồng bộ Website" (tại `/tours`) hoặc "Bắt đầu đồng bộ toàn bộ Tour sang Website" (tại `/settings`), hệ thống mở Modal chuyên dụng cho phép duyệt toàn bộ danh sách tour, tìm kiếm nhanh (tên, mã tour, điểm đến), lọc theo trạng thái ghép nối, và chọn/bỏ chọn tour linh hoạt.
  - **Cơ Chế Bóc Tách Tiền Tố SKU & So Khớp 4 Tầng Thông Minh (`skuUtils.ts`):**
    + *Thuật toán bóc tách tiền tố SKU:* Tự động nhận diện phần đuôi ngày tháng (`YYMMDD`, `YYYYMMDD`, `DDMM`) hoặc ký hiệu đợt (`D1`, `DOT1`, `T10`, `DOT-1`) để tách lấy SKU tour mẹ (`AD-US01-201026` -> SKU `AD-US01`, `TOUR-VN-01-D1` -> SKU `TOUR-VN-01`), bảo toàn nguyên vẹn mã gốc nếu không có đuôi ngày (`AD-US01` giữ nguyên `AD-US01`).
    + *Tầng 1:* Tour đã có liên kết từ trước (`tour.wp_product_id` -> Badge xanh lá *Đã liên kết #ID*).
    + *Tầng 2 (Mới):* Khớp theo tiền tố SKU của sản phẩm WooCommerce (Badge xanh chàm *Khớp SKU [Mã SKU] #ID*).
    + *Tầng 3:* Mã lịch trình đã có trong danh sách đợt khởi hành ACF `departures` của sản phẩm trên website (Badge tím *Đã có trong ACF #ID*).
    + *Tầng 4:* So khớp theo tên chương trình tour tương đồng (Badge lam *Khớp tên #ID*).
    + *Mặc định:* Gợi ý chế độ tạo mới với mã SKU là tiền tố đã bóc tách (Badge hổ phách *Chưa có SKU Web (Sẽ tạo SKU: [Prefix])*).
  - **Cập Nhật Đợt Khởi Hành Vào ACF Repeater & Tính Tổng Chỗ Trống:**
    + Khi đồng bộ sang sản phẩm WooCommerce: Nếu đợt đã có trong bảng ACF thì cập nhật giá vé, ngày đi/về, chuyến bay và chỗ trống; nếu chưa có thì tự động thêm dòng mới vào bảng ACF Repeater.
    + Tự động cộng dồn số chỗ trống khả dụng (`stock_quantity`) của toàn bộ các đợt khởi hành trong bảng ACF và cập nhật giá sàn hiển thị ("Giá chỉ từ...") theo mức giá thấp nhất của các đợt đang mở bán (`regular_price`).
  - **Khắc Phục Triệt Để Lỗi Tải Danh Sách Sản Phẩm Web (`yourcompany.com`):**
    + Loại bỏ hoàn toàn chuỗi `status: 'publish,draft,private'` gây lỗi 400 Bad Request trên WooCommerce REST API v3.
    + Tích hợp cơ chế 3 tầng fallback (`status: 'any'` -> `status: 'publish'` -> không truyền status), hỗ trợ tự động bổ sung protocol `https://`, xử lý `redirect: 'follow'` và gửi song song cả Basic Auth Header lẫn Query Params.
  - **Đổi sản phẩm liên kết linh hoạt:** Cho phép mở popover chọn nhanh sản phẩm WooCommerce bất kỳ (hiển thị ID, SKU, số đợt lịch, giá sàn) để ghép nối thủ công hoặc chuyển sang tạo sản phẩm mới.
  - **Tùy chọn nâng cao:** Bật/tắt cập nhật bảng giá (Regular Price) và cập nhật ACF Repeater lịch khởi hành.
  - **Tiến trình chạy thực tế (Live Progress):** Hiển thị thanh tiến trình % trực quan, trạng thái xử lý từng tour theo thời gian thực (pending -> running -> success/failed), log kết quả chi tiết và link mở trực tiếp sản phẩm trên website.
- **Chế Độ Xem Lịch Khởi Hành Công Khai (Public View-Only) Cho Tất Cả Người Dùng:**
  - **Truy cập công khai:** Mọi người dùng khi vào trang chủ website (`/`) đều có thể xem ngay trang **Lịch khởi hành tour** mà không cần đăng nhập trước.
  - **Giới hạn Chỉ xem (View-only):** Khách vãng lai xem được đầy đủ: Danh sách tour, lịch trình, hành trình, thời gian đi/về, chuyến bay, khách sạn, số chỗ trống khả dụng, biểu giá các đối tượng (người lớn, trẻ em, trẻ nhỏ, phụ thu phòng đơn, phí visa), tìm kiếm, bộ lọc nâng cao, tải/mở file PDF lịch trình chi tiết và modal Thông tin lưu ý.
  - **Bảo mật dữ liệu kinh doanh:** Ẩn hoàn toàn thông tin **Hoa hồng / Khách** (cả trên thẻ tour và bảng chi tiết), ẩn thẻ đối tác nhận gửi khách (`🤝 GỬI KHÁCH ĐỐI TÁC`), ẩn nút *Thêm Tour Mới*. Nút hành động giữ chỗ được chuyển thành *"Đăng nhập để giữ chỗ / đặt tour"* dẫn trực tiếp tới trang Đăng nhập (`/login`).
  - **Tối Ưu Điểm Đăng Nhập (Tránh Trùng Lặp Nút CTA):** Duy trì duy nhất **1 nút Đăng nhập** ở góc trên bên phải thanh Header. Loại bỏ hoàn toàn các nút đăng nhập trùng lặp trong khung Chế độ xem công khai ở Sidebar và trong Banner giới thiệu Lịch khởi hành.
  - **Khóa Quyền Xem Tài Liệu & Gửi Góp Ý Đối Với Khách Chưa Đăng Nhập:** Trang **Tài liệu & Hướng dẫn (`/docs`)** và modal **Góp ý & Báo lỗi** chỉ dành cho người dùng nội bộ đã đăng nhập. Khách chưa đăng nhập bị ẩn hoàn toàn các mục menu, nút "Hướng dẫn", và dải banner thông báo thử nghiệm chạy ngang dưới Header; nếu cố tình vào URL `/docs` sẽ được chuyển hướng yêu cầu đăng nhập.
  - **Bảo vệ phân hệ nội bộ:** Tất cả các phân hệ quản lý nội bộ (Đơn hàng, Hạch toán kế toán, Hành chính nhân sự, Quản lý tour, CRM khách hàng, Dashboard...) đều được bảo vệ bởi `ProtectedRoute`; khách vãng lai khi truy cập sẽ được thông báo và chuyển hướng yêu cầu đăng nhập tài khoản.
- **Module Tra Cứu Thuế & Sổ Tay Thuế Lữ Hành 2025 – 2026 (`/tax-handbook`):**
  - **Truy cập & Phân quyền:** Được hiển thị trên thanh điều hướng Sidebar cho toàn bộ 11 vai trò nhân sự nội bộ công ty (`admin`, `bod`, `accounting`, `operator`, `sale`, `sale_leader`, `hr`, `visa`, `tour_guide`, `marketing_leader`, `marketing`) nhằm hỗ trợ báo giá khách, tính toán hoa hồng, tra cứu pháp lý và hạch toán thuế. Khách vãng lai và đại lý ngoài (`agent`) không truy cập được.
  - **Cơ chế Tự động Đồng bộ & Cập nhật từ MCP Server:** Tích hợp proxy endpoint `/api/tax/check-mcp-update` kết nối trực tiếp đến MCP Server (`thue-vietnam`), hiển thị trạng thái kết nối realtime (chấm xanh `●`), phiên bản skill hiện hành (`v2.2.0`), ngày phát hành và nút *"Kiểm tra cập nhật MCP"*. Hệ thống tự động kiểm tra ngầm khi mở trang và hỗ trợ đồng bộ thủ công 1-click.
  - **Cấu hình & Cập nhật MCP Endpoint Trực Tiếp Từ Frontend:**
    + Tích hợp nút **"Cấu hình MCP"** và modal `TaxMcpConfigModal.tsx` trên trang Sổ tay thuế lữ hành.
    + Cho phép người dùng nhập địa chỉ MCP Endpoint URL mới, kiểm tra kết nối realtime (Test Connection) để xem phản hồi của máy chủ trước khi lưu.
    + Lưu cấu hình đồng bộ lên database Supabase (`app_settings`) và `localStorage`, cho phép khôi phục về URL mặc định bất kỳ lúc nào mà không cần can thiệp mã nguồn backend.
  - **3 Công cụ tính thuế nhanh (Interactive Calculators):**
    1. *Tính thuế GTGT (VAT) Tour:* Hỗ trợ bóc tách VAT theo mức 8% (ưu đãi đến 31/12/2026) hoặc 10%, tự động trừ chi phí thực tế tại nước ngoài đối với tour Outbound theo Điều 7 Thông tư 219.
    2. *Tính thuế TNCN & Hoa hồng CTV:* Tính khấu trừ 10% tại nguồn cho CTV ngoài (kèm kiểm tra điều kiện Cam kết 08/CK-TNCN), hoặc tính thuế lũy tiến theo bảng lương nhân sự công ty với mức giảm trừ gia cảnh mới (15,5 triệu bản thân / 6,2 triệu người phụ thuộc).
    3. *Tính thuế nhà thầu (FCT) Ads:* Tính chi phí hợp lý được trừ TNDN và nghĩa vụ thuế 5% GTGT + 5% TNDN khi chi tiêu quảng cáo Meta Ads, Google Ads.
  - **Đồng Bộ Hóa UI & Dropdown Chuẩn Hệ Thống:** Toàn bộ 5 dropdown (loại hình tour, kiểu giá, ngưỡng CTV, kỳ tính thuế, hình thức thuế nhà thầu) đều sử dụng component `CustomSelect` chuẩn hệ thống kèm icon trực quan, độ rộng an toàn chống cắt cụt ký tự, các ô nhập tiền và thanh tìm kiếm được đồng bộ chuẩn chiều cao `h-10`/`h-11`, bo viền `rounded-xl` và đổ bóng mềm.
  - **Cẩm nang pháp lý & Lịch tuân thủ:** Tổng hợp hồ sơ chi phí hợp lý TNDN (vé máy bay, phòng khách sạn, tiếp khách, tour guide), quy định hóa đơn không dùng tiền mặt từ 5.000.000 đồng và lịch nộp tờ khai/nộp thuế chi tiết. Tái cấu trúc giao diện cẩm nang thành các khối thẻ trực quan (Accordion mở rộng/thu gọn, bộ lọc Category Pills, sơ đồ công thức tính thuế Outbound, thẻ điểm nhấn Highlight và danh sách thẻ con có icon tích xanh `CheckCircle2` chống ngợp chữ).
- **Xuất & In Biểu Mẫu Chuẩn Cho Hành Chính Nhân Sự (Giấy Đề Nghị Thanh Toán & Đơn Xin Nghỉ Phép):**
  - **Giấy Đề Nghị Thanh Toán (`PaymentProposalPrintModal.tsx`):** Chuẩn văn bản hành chính A4, Quốc hiệu - Tiêu ngữ, ngày tháng năm TP.HCM, bộ phận, nội dung, số tiền phân tách hàng nghìn và thuật toán đọc số tiền thành chữ Tiếng Việt chuẩn tài chính (`numberToVietnameseWords.ts`). Tự động sinh mã VietQR Napas 24/7 theo STK, ngân hàng, số tiền và mã phiếu. Bảng ký duyệt 3 cột viền đen đúng chuẩn (*Người đề nghị thanh toán*, *Người phụ trách*, *Phụ trách Kế toán*). Nút *"Xuất mẫu in"* được tích hợp trên thẻ đề xuất, bảng danh sách và modal xem chi tiết tại `/payment-proposals`.
  - **Đơn Xin Nghỉ Phép (`LeaveRequestPrintModal.tsx`):** Chuẩn mẫu A4 song ngữ Anh - Việt (*Application For Leave*), Logo công ty, địa chỉ công ty, website & fanpage. Đầy đủ Mục A (thông tin nhân viên, mã số, ngày vào làm), Mục B (thời gian nghỉ, số ngày công, lý do, bảng phân loại dạng ô tick `[X]` trực quan), Mục C (bàn giao công việc, người hỗ trợ, điện thoại khẩn cấp, chữ ký nhân viên) và Mục D (3 chữ ký: cấp trên, trưởng phòng, nhân sự HR). Nút *"Xuất đơn"* được tích hợp trên bảng danh sách tại `/leave-requests`.
  - **In ấn & Xuất PDF (`@media print`):** Thiết lập CSS chuẩn in khổ giấy A4 portrait, tự động ẩn toàn bộ header, sidebar, thanh điều hướng của website khi gọi lệnh in, hỗ trợ in ra máy in văn phòng hoặc lưu file PDF sắc nét.
- **Tạo & Xuất Hợp Đồng Du Lịch Online Chuẩn A4 (`TourContractPrintModal.tsx`):**
  - **Mẫu In Chuẩn Pháp Lý 12 Điều Khoản:** Thiết kế chuẩn hợp đồng dịch vụ du lịch gồm Quốc hiệu - Tiêu ngữ, số hợp đồng chuẩn (`Số: _____/HĐDV/[Năm] – [Mã Tour].[Ký hiệu Sale/Đơn]`), ngày ký hợp đồng.
  - **Chủ Thể Hai Bên:**
    + *Bên A (Bên cung cấp dịch vụ):* CÔNG TY DU LỊCH [TÊN CÔNG TY], Đại diện Ông/Bà [HỌ TÊN NGƯỜI ĐẠI DIỆN], địa chỉ công ty, Hotline, MST, Giấy phép LHQT.
    + *Bên B (Bên sử dụng dịch vụ):* Đại diện khách hàng / đoàn, số CCCD/Hộ chiếu, điện thoại, địa chỉ.
  - **Cấu Trúc 12 Điều Khoản & Phụ Lục:**
    + *Điều 1:* Nội dung hợp đồng (tuyến du lịch, phương tiện máy bay, thời gian từ ngày... đến ngày... X ngày Y đêm, số khách, bảng danh sách hành khách đoàn).
    + *Điều 2:* Giá trị hợp đồng (bảng Diễn giải | Số lượng | Đơn giá | Thành tiền; đọc tiền thành chữ Tiếng Việt chuẩn tài chính bằng `numberToVietnameseWords()`).
    + *Điều 3:* Thời hạn & Phương thức thanh toán (hỗ trợ chọn linh hoạt **3 đợt thanh toán** hoặc **2 đợt thanh toán**; thông tin tài khoản ngân hàng kèm mã VietQR Napas 24/7; điều khoản phát sinh chi phí ngoài hợp đồng thanh toán trong 03 ngày).
    + *Điều 4 đến Điều 12:* Quy định thị thực visa; Quyền & Trách nhiệm Bên A; Quyền & Trách nhiệm Bên B; Điều kiện hoàn/hủy (chi phí không hoàn lại khi rớt visa mặc định 5.000.000 đ, tỷ lệ phạt hủy 30% - 50% - 85% - 100%); Bất khả kháng; Bồi thường thiệt hại & Phạt vi phạm; Luật điều chỉnh & Giải quyết tranh chấp tại Tòa kinh tế; Bảo hiểm du lịch nước ngoài tối đa lên đến 1.200.000.000 đồng/khách/vụ; Điều khoản chung (03 bản).
    + *Bảng Ký Tên Hai Bên:* Đại diện Bên A & Đại diện Bên B.
    + *Phụ Lục Chương Trình (Tùy chọn in kèm):* Nối tiếp trang chương trình tour chi tiết, thông tin chuyến bay đi/về, bảng giá bao gồm/không bao gồm, lưu ý và hướng dẫn hồ sơ visa.
  - **Tối Ưu Hóa In Ấn Đa Trang A4 Đứng (Khắc Phục Triệt Để Trang Trắng Khi Bấm In):**
    + Khắc phục hoàn toàn hiện tượng hộp thoại in của trình duyệt (`window.print()`) hiện trang trắng tinh 1/1 do các container bọc ngoài của modal có `overflow: hidden`, `position: absolute` và `visibility: hidden`.
    + Đưa toàn bộ chuỗi container cha (`.contract-modal-overlay`, `.contract-modal-container`, `.contract-modal-body`, `.contract-modal-scroll`) và `#official-tour-contract-print-area` về trạng thái luồng văn bản tĩnh tự nhiên (`position: static !important; overflow: visible !important; height: auto !important; max-height: none !important; width: 100% !important`).
    + Tự động gắn class `is-printing-contract` trên `document.body` kết hợp với bộ chọn CSS `:has(#official-tour-contract-print-area)`: Ẩn triệt để thanh Sidebar, Header, Navigation và các phần tử nền bằng `display: none !important`, cho phép trình duyệt ngắt trang tự nhiên và in đầy đủ 100% các trang A4 của hợp đồng 12 điều khoản.
  - **Lưu File Hợp Đồng PDF Lên Google Drive Trong Thư Mục Booking (Chế Độ Thủ Công & Khả Năng Lưu Lại / Xóa File Cũ):**
    + *Lưu thủ công 100%:* Việc lưu file PDF lên Google Drive chỉ diễn ra khi người dùng chủ động nhấn nút *"Lưu Google Drive"* hoặc *"Cập nhật lại HĐ mới"*. Thao tác *"In Hợp đồng / PDF"* được tách biệt hoàn toàn, chỉ mở hộp thoại in của trình duyệt, không tự động upload ngầm.
    + *Cơ chế tìm kiếm đa tầng định vị thư mục đơn hàng (`getOrCreateOrderFolderV2`):* Tự động tìm kiếm thư mục đơn hàng theo 5 tầng thông minh (khớp mã đơn chính xác, khớp tiền tố `DH-` hoặc `BK-`, tìm thư mục chứa mã đơn trong `Đơn hàng`, tìm trong thư mục `Tour`, và tạo mới nếu chưa có). Đảm bảo 100% file PDF vào đúng thư mục booking tương ứng.
    + *Khả năng Cập nhật lại Hợp đồng mới (Ghi đè & Xóa file cũ):* Khi đơn hàng đã có `contract_url` (hợp đồng đã được lưu trước đó), hệ thống hiển thị nút *"Cập nhật lại HĐ mới"* màu hổ phách kèm icon `RefreshCw`. Khi bấm, hệ thống hiển thị modal hộp thoại xác nhận bảo vệ; khi người dùng xác nhận, backend sẽ tự động xóa file PDF cũ trên Google Drive (`deleteGoogleDriveFile`), tải bản PDF mới lên và cập nhật liên kết mới nhất vào database.
    + *Hiển thị Tình trạng Hợp đồng:* Trực quan hóa tình trạng hợp đồng trên Header Modal in hợp đồng (`✓ Đã lưu Google Drive` / `⏳ Chưa lưu Google Drive`), trên thẻ tóm tắt đơn hàng (`✓ HĐ Drive` / `⏳ Chưa lưu HĐ`), trong tab Thông tin liên hệ và nút thao tác nhanh `HĐ (Đã lưu)` trên trang Quản lý Đơn hàng (`OrdersManagement.tsx`).
    + *Cơ chế Xuất File PDF Khổ A4 & Triệt Tiêu Lỗi Màu OKLCH (`pdfGenerator.ts` & `colorSanitizer.ts`):* Tích hợp bộ lọc và chuyển đổi màu sắc chuyên sâu 3 tầng phòng thủ (DOM inline sanitizer, Javascript Proxy cho `getComputedStyle`, và bộ lọc thẻ `<style>` trong iframe cloned document). Tự động nhận diện và chuyển đổi mọi giá trị màu OKLCH do Tailwind CSS v4 sinh ra sang chuẩn RGB/RGBA, khắc phục triệt để lỗi phân tích màu `unsupported color function oklch` trong `html2canvas`, đảm bảo xuất và tải file PDF hợp đồng A4 mượt mà, sắc nét.
    + *Chuẩn Hóa Mã Thanh Toán VietQR Napas 24/7 (`vietQrHelper.ts`):* Sinh mã QR chuyển khoản trực tiếp dưới dạng Base64 PNG Data URL (`data:image/png;base64,...`) thông qua API v2 chính thức của VietQR kèm cơ chế dự phòng 3 tầng. Loại bỏ hoàn toàn lỗi CORS redirect, hiện tượng tainted canvas hoặc ô mã QR bị trắng/trống khi in (`window.print()`) và khi xuất file PDF hợp đồng du lịch cũng như giấy đề nghị thanh toán.
  - **Điểm Kích Hoạt Tích Hợp:** Nút *"In Hợp đồng Online"* trong Modal Sửa Đơn hàng (`EditOrderModal.tsx`), nút *"In HĐ Online"* trong khối Hợp đồng dịch vụ và nút thao tác nhanh *"In HĐ"* tại thẻ đơn hàng trên trang Quản lý Đơn hàng (`OrdersManagement.tsx`).
- **Phân Quyền Duyệt Phiếu Thu Cho Ban Giám Đốc (BOD):** Vai trò **Ban Giám Đốc (`bod`)** có đầy đủ quyền hạn truy cập mục Kế toán & Tài chính, xem tab **Phiếu thu** chuyển khoản của khách hàng, xem danh sách phiếu chờ duyệt/đã duyệt/từ chối và thực hiện hành động **Duyệt phiếu thu** hoặc **Từ chối phiếu thu** tương tự như Kế toán (`accounting`) và Quản trị viên (`admin`). Khi duyệt, thông tin người xác thực được tự động ghi nhận theo tên thật của tài khoản BOD.
- **Phân Quyền Tab Hành Chính Nhân Sự (Không Áp Dụng Cho Đại Lý / CTV):** Tab "Hành chính nhân sự" (bao gồm Đề nghị thanh toán `/payment-proposals` và Nghỉ phép & Chấm công `/leave-requests`) chỉ áp dụng cho cán bộ công nhân viên chính thức thuộc công ty. Tài khoản đối tác ngoài (Đại lý & CTV - `role === 'agent'`) bị ẩn hoàn toàn mục này trên thanh Sidebar và menu Profile, đồng thời được thiết lập lớp bảo vệ (Permission Guard) chặn trực tiếp tại trang nếu truy cập qua đường dẫn URL.
- **Phân Quyền Quản Lý Booking Cho Điều Hành (Operator):** Vai trò **Điều hành Tour (`operator`)** được cấp quyền truy cập đầy đủ trang **Quản lý Booking (`/orders`)** trên thanh điều hướng Sidebar. Điều hành có quyền xem toàn bộ danh sách booking đặt tour của công ty, kiểm tra tiến độ cọc/thanh toán, duyệt chỗ (Chốt Sure) cho booking giữ chỗ tạm, phê duyệt/từ chối yêu cầu gia hạn giữ chỗ của Sales và cập nhật/xóa thông tin danh sách hành khách đoàn.
- **Quyền tạo Tour:** Chỉ có vai trò **Điều hành Tour (`operator`)** và **Quản trị viên (`admin`)** mới có quyền nhìn thấy và sử dụng tính năng **Tạo Tour mới**. Các vai trò khác (như Sale, CTV, Đại lý, Visa, Kế toán) sẽ không có quyền này.
- **Nâng Cấp Trang Bảng Điều Khiển (Dashboard) Tùy Biến Theo 3 Nhóm Vai Trò:**
  - **Sale Công Ty (`role === 'sale'`):** Ẩn hoàn toàn ô "Hoa hồng tạm tính", chỉ xem đơn hàng cá nhân, hiển thị 4 thẻ chỉ số (Doanh số chốt, Tiến độ KPI %, Số lượt khách Pax, Đặt chỗ sắp hết hạn Hold) cùng 2 bảng chi tiết (Đơn hàng & cảnh báo cọc, Đơn hỗ trợ nhập hộ cho CTV/Đại lý ngoài).
  - **Sale Leader (`role === 'sale_leader'`):** Hiển thị tổng quan kinh doanh của toàn nhóm (Doanh số nhóm, % KPI nhóm, Tổng Pax nhóm, Giữ chỗ mở nhóm), Bảng xếp hạng doanh số nhân viên trong team (Leaderboard) và Báo cáo hạch toán Lãi/Lỗ Tour gửi đối tác (`outsourced`) & Tour đoàn riêng (`private`).
  - **Giám Đốc / BOD / Admin (`role === 'admin' | 'bod'`):** Tích hợp Bảng điều hành chiến lược toàn diện bao gồm Top 4 thẻ chỉ số (Doanh thu toàn công ty, Lãi gộp, Net Margin %, Tổng Pax), 2 Biểu đồ phân tích (Cơ cấu doanh thu kênh bán & Lợi nhuận theo loại tour), Báo cáo hiệu quả kinh doanh theo Team (Team Performance) và Báo cáo chi tiết theo từng Sale (Sale Performance Breakdown).
- **Đa Dạng Hóa Chế Độ Xem Báo Cáo Dashboard (Bảng, Cột, Đường, Hình Tròn):** Tất cả các khối báo cáo dạng bảng trên Dashboard (bao gồm Báo cáo Hiệu quả Kinh doanh theo Team, Báo cáo Chi tiết theo Nhân viên Sale và Bảng Xếp hạng Doanh số Team) được tích hợp bộ chuyển đổi chế độ xem linh hoạt cho phép người dùng chuyển đổi trực tiếp giữa 4 định dạng: **Bảng dữ liệu (`Table`)**, **Biểu đồ cột (`BarChart`)**, **Biểu đồ đường (`LineChart`)** và **Biểu đồ hình tròn (`PieChart`)**. Các tab chuyển đổi góc nhìn được thiết kế đồng bộ kích thước chuẩn (`text-xs font-bold`, padding, border rounded), đồng thời các biểu đồ tròn được tối ưu bộ lọc dữ liệu dương (`> 0`) và nhãn hiển thị `%` để tránh tuyệt đối lỗi chồng chéo chữ hoặc vỡ giao diện.
- **Liên kết Tạo Tour & Vị trí Nút Thêm Tour:** Nút **"+ Thêm Tour Mới"** được đặt ở góc phải thanh tiêu đề *Danh sách điều phối chỗ & Lịch trình* (bên cạnh bộ chuyển đổi kiểu hiển thị) bên dưới thanh tab điều hướng chính, giúp giao diện gọn gàng hơn. Khi bấm nút, hệ thống sẽ kích hoạt form khai báo tour mới và tự động cuộn màn hình mượt mà xuống biểu mẫu nhập liệu.
- **Chuyển Đổi Vai Trò Xem (Xem Thử Phân Quyền):** Chỉ các tài khoản có vai trò thật sự là `admin` trong bảng `profiles` hoặc email Quản trị viên mặc định (`admin@yourcompany.com`) mới có quyền thay đổi **"Vai trò đang xem"** thông qua hộp chọn (select) trên thanh Sidebar. Đối với các tài khoản vai trò khác, hộp chọn này sẽ bị khóa (`disabled`).
- **Phân Quyền Sale Leader khi Tạo, Thao Tác & Xem Lãi Lỗ Tour:** Vai trò **Sale Leader (`sale_leader`)** chỉ có thể tạo, chỉnh sửa, sao chép và xem bảng hạch toán chi phí/lãi lỗ đối với các loại **Tour gửi khách đối tác (`partner`)** và **Tour đoàn riêng (`private`)**. Sale Leader hoàn toàn **không có quyền** tạo mới, sửa, sao chép, xóa hoặc **xem báo cáo lãi lỗ/chi phí** của các **Tour tự vận hành (`internal`)**. Các nút thao tác và danh sách hạch toán cho loại tour tự vận hành sẽ tự động bị vô hiệu hóa hoặc ẩn khỏi vai trò Sale Leader.
- **Tạo Danh Mục Sản Phẩm Mới Khi Tạo Tour:** Ngay tại form khai báo/cập nhật Tour du lịch mới, hệ thống cho phép tạo nhanh danh mục sản phẩm mới ngay lập tức mà không cần chuyển sang tab danh mục riêng biệt. Khi tạo thành công, danh mục này sẽ tự động được chọn làm danh mục hiện tại cho Tour đó.
- **Tự Động Đồng Bộ Bộ Lọc Danh Mục:** Bộ lọc danh mục sản phẩm tại trang *Lịch khởi hành* (Departure Calendar) tự động cập nhật danh sách và thêm danh mục mới ngay khi có bất kỳ danh mục nào được khởi tạo thêm (từ tab Danh mục hoặc trực tiếp từ biểu mẫu Tạo Tour).
- **Phân Loại Dịch Vụ Visa & Quản Lý Booking Visa Chuyên Biệt (`/visa-orders`):**
  - Dịch vụ visa lẻ (`tour_type === 'visa'`) **không tính là Tour du lịch**. Tất cả các bộ lọc, số lượng đếm Tour, và danh sách chọn album ảnh đoàn đều tự động loại trừ các sản phẩm dịch vụ visa.
  - **Quản lý Booking Visa (`/visa-orders`):** Độc lập với Quản lý đơn hàng tour (`/orders`), hỗ trợ phân loại 3 tab trạng thái: **Tất cả booking**, **Đang hoạt động / Đã chốt**, **Đã hủy** với số lượng cập nhật theo thời gian thực.
  - **Cơ chế Hủy Đơn Booking Visa Chuẩn Nghiệp Vụ:**
    + Khi hủy booking visa: Người dùng xác nhận qua modal kèm tùy chọn nhập lý do hủy chi tiết, hệ thống cập nhật đồng bộ trạng thái `status: 'cancelled'` và `booking_status: 'cancelled'` cho đơn hàng, đồng thời chuyển trạng thái toàn bộ hành khách thuộc booking sang `visa_status: 'cancelled'` trên cả Client state và Database Supabase (`bookings`, `passengers`).
    + Trên giao diện: Đơn đã hủy hiển thị rõ ràng huy hiệu màu đỏ **"Đã hủy"**, tên khách gạch ngang mờ nhẹ, hiển thị khung thông báo trạng thái đơn kèm lý do hủy, ẩn các nút thao tác nghiệp vụ (Nộp biên lai, Sửa đơn, Hủy đơn) và thay thế bằng nhãn "Đơn hàng đã ở trạng thái Đã hủy".
    + Trang Xử lý Visa (`/visa-processing`): Tự động ẩn hồ sơ của các booking visa đã hủy khỏi bảng Kanban quy trình để tránh chuyên viên visa xử lý nhầm; hỗ trợ tab lọc "Đã hủy" ở chế độ xem Danh sách để dễ dàng đối soát lịch sử.
- **Giao Diện & Tính Năng Dành Cho Hướng Dẫn Viên (HDV / `tour_guide`) & Ảnh Khách Đoàn:**
  - **Trang & Tab Riêng "Ảnh khách đoàn" (`/tour-media`):** Được hiển thị trên thanh Sidebar cho người dùng công ty (Admin, Operator, Sale, Visa, Kế toán, BOD, HDV) và **ẩn đối với Cộng Tác Viên (`CTV`)**. Trang này chứa danh sách đoàn tour kèm nút duy nhất **"📂 Mở Thư Mục Google Drive"** để truy cập thẳng thư mục `Tour CRM > Tour > {MÃ_TOUR} > Ảnh đoàn`.
  - **Phân Quyền Thao Tác Upload & Link HDV:** Chỉ có vai trò **Điều hành (`operator`)**, **HDV (`tour_guide`)** và **Quản trị viên (`admin`)** mới có quyền thao tác các nút **"📸 Upload Ảnh Đoàn"** và **"🔗 Link HDV Freelance"**. Các vai trò khác (Sale, Kế toán, Visa, BOD) chỉ xem và mở thư mục Drive.
  - **Giới Hạn Quyền HDV Trong Quản Lý Tour (`/tours`):** Hướng dẫn viên chỉ có quyền xem danh sách tour và bấm nút **"Xem chi tiết & Quản lý chỗ"** (Icon Info) để tra cứu lịch trình, khách sạn, chuyến bay và danh sách khách. HDV **bị chặn và ẩn hoàn toàn**:
    1. Tab **"Hạch toán Chi phí – Lãi lỗ"** (ẩn doanh thu, tiền thu, công nợ, chi phí và lợi nhuận) và tab **"Tuyến / Danh mục"**.
    2. Các nút **"Thêm ngày đi mới"**, **"Tạo hàng loạt (Series)"** và **"Sao chép ngày khởi hành"** (không được mở form thêm ngày khởi hành).
    3. Các nút **"Sửa chi tiết"** (trong bảng và nút chân trang Drawer) cũng như nút **"Xóa"** tour (chặn cả ở giao diện lẫn tầng logic).
    4. Ẩn thông tin **"Hoa hồng / Khách"** trong Drawer xem chi tiết tour.
- **Dải Thông Báo Chạy Ngang Giai Đoạn Thử Nghiệm & Tích Hợp Đồng Bộ Google Sheet Realtime Cho Góp Ý & Báo Lỗi:**
  - Hệ thống tích hợp dải thông báo chạy ngang mỏng nhẹ nằm ngay dưới Header chính trong `Layout.tsx`.
  - Nội dung: *"Hệ thống đang trong giai đoạn thử nghiệm, nếu có lỗi mong mọi người thông cảm. Hãy góp ý & Báo lỗi để cải thiện hệ thống. Xin cảm ơn!"*
  - Hỗ trợ hiệu ứng lặp liên tục, tự động dừng chạy khi di chuột (`hover`) và tích hợp hành động click trực tiếp vào chữ hoặc nút *"Góp ý ngay"* để mở modal Góp ý & Báo lỗi (`FeedbackModal`).
  - **Tự động ghi đồng thời vào Google Sheet & Google Drive:** Khi người dùng gửi biểu mẫu góp ý/báo lỗi, backend API (`/api/feedback`) tự động ghi thêm 1 dòng mới ngay lập tức vào tệp Google Sheet `Góp Ý & Báo Lỗi - Tour CRM` (với đầy đủ thời gian định dạng chuẩn `hh:mm:ss dd/mm/yyyy`, phân loại, tiêu đề, nội dung chi tiết, thông tin người gửi, URL trang sự cố, link ảnh chụp màn hình và trạng thái tiếp nhận), đồng thời lưu trữ tệp tin `.json` vào thư mục `Góp Ý & Báo Lỗi` trên Google Drive.
- **Nhiều Khoản Phụ Thu & Tiền Tour Chênh Lệch CTV:**
  - **Quản lý Nhiều Phụ Thu:** Hỗ trợ tạo, chỉnh sửa và xóa danh sách nhiều khoản phụ thu linh hoạt (`surcharges`) cho từng đơn hàng (thay vì chỉ 1 khoản đơn lẻ). Tự động cộng tổng các khoản phụ thu vào tổng giá trị đơn hàng. **Lưu ý quan trọng:** Các khoản phụ thu (nâng hạng ghế, vé tham quan, phụ thu phòng đơn, v.v.) chỉ tính vào tổng tiền đơn hàng, **hoàn toàn không được cộng vào hoa hồng thực nhận** của CTV/Đại lý.
  - **Tiền Tour Chênh Lệch CTV & Phí Công Ty:** Khi tạo đơn cho CTV, cho phép nhập cố định khoản Tiền tour chênh lệch (`price_markup`) khi CTV bán giá cao hơn cho khách. Hệ thống tự động tính phí công ty thu trên chênh lệch (mặc định 25%, có thể tự điều chỉnh 0-100%) và tính toán chính xác hoa hồng thực nhận còn lại cho CTV.
  - **Trình Bày Chi Tiết Bảng Tính Hoa Hồng:** Bảng thống kê hoa hồng được trình bày trực quan thành từng mục riêng biệt: (1) **Hoa hồng**: Hoa hồng/khách & Hoa hồng định mức tổng khách; (2) **Giá chênh lệch**: Tổng giá chênh lệch, Phí công ty thu (% trừ) và Số tiền chênh lệch còn lại; (3) **Bị trừ**: Do giảm giá cho khách (nếu có); (4) **Tổng hoa hồng thực nhận**: Khối tổng kết xanh nổi bật dễ nhìn.
- **Tự Động Tính Hoa Hồng Chi Phí Tour:** Ô nhập **Hoa Hồng / Commission** trong Bảng Khai Báo Chi Phí Tour được thiết lập tự động điền giá trị bằng tổng hoa hồng thực nhận từ tất cả các booking thuộc Tour đó (bao gồm hoa hồng đại lý/CTV, chênh lệch CTV sau trừ phí công ty, trừ chiết khấu). Ô này ở trạng thái chỉ đọc (read-only/disabled) và không cho chỉnh sửa thủ công, phía dưới có thông báo ghi chú tự động tổng hợp từ danh sách booking.
- **Phân Quyền Hiển Thị Tour F2 / Gửi Khách Đối Tác:** Tại trang *Lịch khởi hành* (`DepartureCalendar.tsx`), tất cả các vai trò (bao gồm cả Đại lý & CTV) đều nhìn thấy các Tour F2 / Gửi khách đối tác để xem lịch trình, giữ chỗ và theo dõi hoa hồng. Tuy nhiên, **Thẻ thông tin đối tác** (`🤝 GỬI KHÁCH ĐỐI TÁC: {Tên đối tác}`) trên thẻ Tour chỉ hiển thị duy nhất cho 4 vai trò quản lý/điều hành: **Điều hành tour (`operator`)**, **Quản trị viên (`admin`)**, **Sale Leader (`sale_leader`)** và **Ban Giám Đốc (`bod`)**.
- **Thứ Tự Biểu Giá Tour Chi Tiết:** Bảng "Biểu giá tour chi tiết theo độ tuổi & dịch vụ" tại trang Lịch khởi hành được sắp xếp lại thứ tự ưu tiên các thẻ hiển thị theo đúng thứ tự: (1) **Người lớn (≥ 10 tuổi)**, (2) **Trẻ em (2 - dưới 10 tuổi)**, (3) **Trẻ nhỏ (< 2 tuổi)**, (4) **Phụ thu phòng đơn**, (5) **Dịch vụ Visa (Nếu cần)**, (6) **Hoa hồng / Khách**.
- **Tối Ưu UX/UI Quản Lý Tour & Phân Trang (`ToursManagement.tsx`):**
  - **Phân trang & Giới hạn số lượng:** Mặc định phân trang 10-20 tour trên một trang, cho phép tùy chỉnh chọn 5, 10, 20 hoặc 50 phần tử/trang kèm thanh điều hướng phân trang chuyên nghiệp ở chân bảng.
  - **Bộ lọc Trạng thái Thời gian:** Bổ sung các Tab thời gian: (1) **Sắp khởi hành** (Mặc định - chỉ hiển thị tour chưa quá ngày khởi hành), (2) **Đã khởi hành / Lưu trữ** (Tour có ngày đi trước 00:00 hôm nay kèm badge `📁 Đã khởi hành`), và (3) **Tất cả thời gian**.
  - **Bộ lọc đa năng:** Hỗ trợ Tìm kiếm theo Từ khóa, Lọc theo Tháng khởi hành và Lọc theo Danh mục sản phẩm kèm nút "Xóa bộ lọc".
  - **Ẩn Tour Đã Khởi Hành:** Tại *Lịch khởi hành* (`DepartureCalendar.tsx`), hệ thống tự động lọc bỏ các tour có ngày khởi hành trước 00:00 ngày hôm nay, chỉ hiển thị các tour từ hôm nay trở đi. Nếu cần xem hoặc lưu trữ tour đã qua ngày đi, người dùng có thể tra cứu tại trang *Quản lý Tour* (`ToursManagement.tsx`).
  - **Khóa Đặt Chỗ Tour Quá Hạn:** Tại Lịch khởi hành (`DepartureCalendar.tsx`), các tour đã quá ngày đi sẽ tự động vô hiệu hóa nút đặt chỗ và hiển thị trạng thái `🔒 Tour đã quá lịch khởi hành`.
- **Cơ Chế Tính Quỹ Phép Năm Tích Lũy Động (1 Ngày / Tháng):**
  - **Quy tắc tích lũy:** Số ngày phép năm mặc định được tích lũy theo số tháng làm việc trong năm (1 ngày / 1 tháng). Ví dụ: Hiện tại là Tháng 8 thì quỹ phép năm mặc định là 8 ngày (thay vì cấp sẵn 12 ngày ngay từ đầu năm).
  - **Năm quá khứ & tương lai:** Đối với các năm trước, số ngày phép mặc định là 12 ngày; đối với các năm tương lai là 0 ngày (tích lũy dần theo từng tháng khi năm đó đến).
  - **Tích Lũy Phép Dựa Trên Ngày Làm Chính Thức (`official_start_date`):**
    + Quỹ phép năm trong năm được tự động tính lũy kế dựa trên **Tháng làm việc chính thức** (`official_start_date`) đến tháng hiện tại/tháng hạch toán (`accrued = effectiveMonth - officialStartMonth + 1`).
    + *Ví dụ:* Nhân viên vào thử việc từ Tháng 3/2026 nhưng ký hợp đồng chính thức từ Tháng 5/2026: Đến Tháng 10 sẽ được tự động tích lũy `10 - 5 + 1 = 6 ngày phép`.
    + Nếu nhân viên đã làm chính thức từ các năm trước: Tính đủ 1 ngày/tháng từ Tháng 1 đến tháng hạch toán (+ ngày phép thâm niên tính từ `join_date` nếu >= 5 năm).
    + Trường *Ngày vào làm* (`join_date`) dùng để tính thâm niên công tác; trường *Ngày làm chính thức* (`official_start_date`) dùng để tích lũy ngày phép.
  - **Tự động cộng +1 ngày phép qua tháng mới (kể cả sau khi HR điều chỉnh):**
    + Nếu HR chưa can thiệp: Hệ thống tự động tích lũy 1 ngày/tháng x số tháng đã trôi qua (+ ngày phép thâm niên nếu có).
    + Nếu HR đã điều chỉnh thủ công trước đó: Hệ thống lấy mốc số ngày HR đã điều chỉnh làm gốc và **tự động cộng thêm +1 ngày phép cho mỗi tháng mới trôi qua** sau thời điểm điều chỉnh. (Ví dụ: Tháng 9 HR lưu 9 ngày ➔ Sang Tháng 10 hệ thống tự động cộng thành 10 ngày; nếu Tháng 8 HR thưởng đặc cách 10 ngày ➔ Sang Tháng 10 tự động cộng thành 12 ngày).
  - **Phân Loại Trạng Thái Làm Việc (Thử Việc / Chính Thức):**
    - Hệ thống quản lý trường `employment_status` ('probation' | 'official') cho từng nhân sự.
    - **Nhân sự Thử việc (`probation`):** Mặc định quỹ phép năm tích lũy tự động là **0 ngày** (không tích lũy phép năm theo tháng). Nếu nhân sự cần nghỉ trong giai đoạn thử việc thì sử dụng hình thức *Nghỉ không lương* (hoặc được HR/Admin chủ động cấp ngày phép thủ công nếu có thỏa thuận riêng).
    - **Nhân sự Chính thức (`official`):** Tích lũy đủ 1 ngày phép cho mỗi tháng làm việc thực tế theo Luật Lao Động.
    - **Phân Quyền Chỉnh Sửa Trạng Thái Cho HR Tại Tab Quỹ Phép:**
      - Bộ phận **Nhân sự (`hr`)**, **Ban Giám Đốc (`bod`)** và **Quản trị viên (`admin`)** có quyền thay đổi trạng thái làm việc (*Thử việc* / *Chính thức*) của nhân viên trực tiếp ngay trong tab **Quỹ phép năm** (`LeaveBalanceManagement.tsx`) thuộc trang Nghỉ phép & Chấm công (`/leave-requests`).
      - **Quy cách giao diện:** Trên bảng danh sách chỉ hiển thị huy hiệu (badge) trạng thái tĩnh nhằm giữ giao diện sạch đẹp, không xổ dropdown. Việc thay đổi trạng thái làm việc chỉ được thực hiện khi người dùng bấm vào nút **"Điều chỉnh"** để mở Modal điều chỉnh quỹ phép của nhân sự đó.
    - Trạng thái làm việc được quản lý và hiển thị rõ ràng trên: Form tạo/sửa người dùng, Bảng danh sách nhân sự công ty, Bảng Quản lý quỹ phép năm và Bảng Chấm công hàng tháng.
    - **Đồng Bộ Tổng Quỹ Phép Động Trên Bảng Chấm Công:** Cột *Quỹ phép còn* trên Bảng Chấm công hàng tháng hiển thị dưới dạng `{Còn lại} / {Tổng phép} ngày` (trong đó mẫu số `{Tổng phép}` được lấy động theo đúng tổng ngày phép thực tế `row.leave_balance_total` của tháng hạch toán hoặc sau điều chỉnh của HR, tuyệt đối không hardcode cố định `/ 12 ngày`).
  - **Vị Trí Tab Quản Lý Quỹ Phép:** Tính năng Quản lý Quỹ phép năm nhân viên nằm tập trung duy nhất tại trang **Hành chính nhân sự** (`/leave-requests`), hoàn toàn loại bỏ khỏi Cài đặt hệ thống (`/settings`).
  - **Quy Trình Phân Quyền Duyệt Đơn Nghỉ Phép (2 Cấp Chuẩn Hóa & Chặn Tuyệt Đối Tự Duyệt):**
    - **Nguyên Tắc Chặn Tự Duyệt (No Self-Approval):** Tuyệt đối **không cho phép tự phê duyệt** đơn nghỉ phép của chính mình ở bất kỳ cấp nào (Cấp 1 hay Cấp Cuối), áp dụng cho mọi vị trí từ Nhân viên, Trưởng phòng đến Ban Giám Đốc. Đơn của ai thì người đó chỉ có quyền theo dõi hoặc xóa/hủy đơn khi đang chờ duyệt.
    - **Định Tuyến Cấp Trên Trực Tiếp (Supervisor Routing):**
      + Khi một nhân viên hoặc Trưởng phòng tạo đơn, nếu tài khoản đã được gán Quản lý trực tiếp (`leader_id`), thì chỉ Quản lý trực tiếp đó (hoặc BOD / Admin) mới nhìn thấy đơn trong danh sách chờ duyệt C1 và có quyền bấm Duyệt C1.
      + Ví dụ: Trưởng phòng tạo đơn và có `leader_id` là Ban Giám Đốc (BOD) -> Trưởng phòng không thể tự duyệt đơn của mình, nút duyệt C1 sẽ chỉ hiển thị cho Ban Giám Đốc (BOD) hoặc Admin.
    - **Cấp 1 (Quản lý trực tiếp):** Trưởng nhóm Sale (`sale_leader`), Trưởng nhóm Marketing (`marketing_leader`), Nhân sự (`hr`), Quản trị viên (`admin`), Ban Giám Đốc (`bod`). *Lưu ý: Vai trò Điều hành tour (`operator`) là nhân viên điều hành tour, không có quyền duyệt cấp 1 đơn nghỉ phép*.
    - **Cấp 2 (Duyệt Cấp Cuối & Trừ Phép):** Chỉ có **Nhân sự (`hr`)**, **Ban Giám Đốc (`bod`)** và **Quản trị viên (`admin`)** mới có quyền duyệt cấp cuối và trừ vào quỹ phép năm. *Lưu ý: Kế toán (`accounting`) không có quyền duyệt cấp cuối*.
  - **Đồng Bộ Tour Sang Website WordPress (WooCommerce REST API + ACF Repeater):**
  - **Mô Hình 1 Tour Nhiều Ngày Khởi Hành (ACF Repeater):**
    + Trên website WordPress, mỗi chương trình tour là 1 sản phẩm chứa trường ACF Repeater (mặc định: `lich_trinh_khoi_hanh`).
    + CRM tự động gom nhóm các đợt khởi hành có cùng tên tour (`name`) lại khi đồng bộ.
    + Khóa định danh duy nhất: Sử dụng **Mã lịch trình** (`code` ➔ `ma_lich_trinh`) để đối chiếu từng dòng trong bảng Repeater. Khi đồng bộ, CRM cập nhật giá và chỗ của đúng đợt đó nếu đã có, hoặc tự động append thêm dòng mới nếu là đợt mới, tuyệt đối không đè mất các ngày khởi hành khác.
    + Sinh đồng thời 2 chuẩn metadata của ACF Pro (`meta_data` array và indexed meta `repeater_slug_N_subfield`) để tương thích 100% với hàm `get_field()` và `have_rows()` trong PHP của theme WordPress.
    + Giá đại diện `regular_price` ngoài trang chủ tự động lấy mức giá người lớn thấp nhất của các đợt đang mở bán (giá "Chỉ từ ...").
    + Cập nhật tồn kho tự động khi có booking đặt tour đúng theo mã lịch trình.
  - **Giao Diện Ghép Trường ACF Ngoài Frontend (`WooCommerceSettingsSection.tsx`):**
    + Cho phép cấu hình tên slug của trường Repeater trên WordPress.
    + Thêm/xóa/sửa trường ACF linh hoạt, có sẵn trường `code` (Mã lịch trình / Mã tour) gợi ý mặc định `ma_lich_trinh`.

- **Quy Chuẩn Đồng Bộ & Phân Quyền Cho Tất Cả Các Vai Trò Leader Nội Bộ:**
  - **Danh sách Leader chính thức:** `sale_leader` (Trưởng nhóm Kinh doanh), `marketing_leader` (Trưởng phòng Marketing), `visa_leader` (Trưởng bộ phận Visa), `operator` (Điều hành Tour), `hr` (Phụ trách Hành chính Nhân sự), `bod` (Ban Giám Đốc), `admin` (Quản trị viên).
  - **Tuyệt đối không ép vai trò:** Cấm các logic ép vai trò `marketing_leader` thành `sale_leader` hay `marketing` thành `sale`. Mọi vai trò Leader phải luôn giữ đúng định danh độc lập của mình trên toàn hệ thống.
  - **Quyền duyệt Đề nghị thanh toán (`/payment-proposals`):** Tất cả các Leader (`sale_leader`, `marketing_leader`, `visa_leader`, `operator`, `hr`, `bod`, `admin`) có toàn quyền phê duyệt đề nghị thanh toán (Cấp Leader) trước khi chuyển sang Kế toán chi tiền.
  - **Hiển thị tiếng Việt:** Trên toàn bộ giao diện bảng, modal, thẻ đề xuất, vai trò luôn được hiển thị bằng tiếng Việt kèm huy hiệu màu sắc chuẩn (`Trưởng phòng Marketing` màu tím fuchsia, `Trưởng nhóm Kinh doanh` màu cam amber, `Trưởng bộ phận Visa` màu chàm indigo...).
  - **Mẫu in A4 Giấy Đề Nghị Thanh Toán:** Tự động điền đúng tên phòng ban (Marketing, Kinh doanh, Visa, Điều hành Tour, Nhân sự...) và chức vụ của người đề nghị.
  - **Phân quyền truy cập cho Team Marketing (`marketing_leader`, `marketing`):**
    + Được xem đầy đủ **Lịch khởi hành tour** (`/`) để nắm bắt số chỗ, lịch bay, giá bán phục vụ chiến dịch truyền thông quảng cáo.
    + Được truy cập phân hệ **Đối tác & Khách hàng** (`/customers`, `/passengers`) để xem danh sách Đại lý, CTV và tra cứu toàn bộ hồ sơ khách đoàn toàn công ty phục vụ nghiên cứu tệp khách hàng, tạo Custom Audience và remarketing.

- **Hệ Thống Thông Báo Đẩy Lên Màn Hình Desktop (Native Push Notifications):**
  - **Công nghệ:** Sử dụng HTML5 Web Notification API kết hợp Service Worker và Web Audio API (`desktopNotification.ts`).
  - **Khả năng hoạt động:** Gửi thông báo native lên màn hình Windows / macOS / Linux ngay cả khi người dùng thu nhỏ trình duyệt hoặc đang làm việc trên ứng dụng khác (Excel, Word, Zalo...).
  - **Âm thanh:** Âm chuông 2 nốt Crystal Ding-dong (E6 -> B6) sinh bằng Web Audio API thuần, không lỗi CORS hay 404.
  - **Tương tác trực tiếp:** Khi click vào banner thông báo, trình duyệt tự động kích hoạt tab CRM và mở thẳng tới đơn hàng/đề nghị thanh toán/đơn nghỉ phép tương ứng.
  - **Cài đặt & Thử nghiệm:** Tích hợp modal cài đặt (`DesktopNotificationSettingsModal.tsx`) trên Dropdown chuông thông báo Header và Menu Profile, cho phép Bật/Tắt đẩy, Bật/Tắt tiếng và Gửi thông báo thử nghiệm.

- **Cấu Trúc Tab Quản Lý Người Dùng & Phân Quyền (`UserManagement.tsx`):**
    - Trang Quản lý người dùng trong Cài đặt hệ thống được phân tách thành **3 tab** chuyên biệt:
      1. **🏢 Quản lý Nhân sự Công ty (`company`):** Quản lý tất cả tài khoản nội bộ công ty (Admin, BOD, Sale Leader, Sale, Điều hành, Visa, Kế toán, HDV, HR, Marketing).
      2. **🤝 Tài khoản Đại lý & CTV (`agents`):** Chuyên quản lý danh sách tài khoản đối tác ngoài (Đại lý, CTV).
      3. **🏛️ Quản lý Team Kinh doanh (`teams`):** Quản lý cấu trúc nhóm kinh doanh, Gán Leader, KPI và thành viên.
  - **Cơ Chế Giữ Ấm Cơ Sở Dữ Liệu Supabase 24/7 (Chống Tự Động Tạm Dừng Sau 7 Ngày):**
    - **Chính sách Supabase:** Gói Free của Supabase tự động pause dự án nếu không có truy vấn nào sau 7 ngày.
    - **Kiến trúc 3 Tầng Giữ Ấm:**
      1. **Tầng 1 (Worker Server CRM):** Server Express tự động ping nhẹ (`profiles` select 1 row) sau 5 giây khởi động và lặp lại mỗi 24 giờ một lần ngầm trong hệ thống (`server/services/keepAliveService.ts`).
      2. **Tầng 2 (API Webhook):** Cung cấp các endpoint `GET /api/keep-alive` và `GET /api/supabase-keepalive` cho các dịch vụ miễn phí như Cron-job.org hoặc UptimeRobot gọi định kỳ 1 - 2 ngày/lần.
      3. **Tầng 3 (GitHub Actions CI/CD):** Tự động chạy file workflow `.github/workflows/supabase-keep-alive.yml` vào 11:00 AM mỗi 2 ngày một lần trên hạ tầng GitHub Cloud để ping trực tiếp tới REST API của Supabase.
    - **Giao diện Quản trị (`Settings.tsx`):** Tab "Cơ sở dữ liệu & Tự động giữ ấm" giúp Quản trị viên xem tình trạng kết nối, độ trễ phản hồi (latency ms), nút ping trực tiếp và sao chép nhanh URL webhook.

---

## 8. Tích hợp & Quy Trình Lưu Trữ File, Hình Ảnh (Google Drive & Supabase Storage)
- **Cơ chế hoạt động & Quản lý Tài khoản Google Drive từ Frontend (`/settings?tab=drive`):**
  - Hệ thống tích hợp lưu trữ file hoàn toàn ở phía **Backend** thông qua các API endpoint (`/api/upload`, `/api/upload-invoice-receipt`, `/api/delete`).
  - **Quản lý & Đổi tài khoản Google Drive 1-Click trực tiếp từ Frontend:** Quản trị viên (`admin`) và Ban Giám Đốc (`bod`) có thể xem danh sách tài khoản đã kết nối (`connected_accounts`), chọn radio tài khoản muốn dùng làm kho chính (hiển thị badge xanh `● Đang dùng`), bấm nút *"Kết nối tài khoản Google khác"* để mở màn hình Google OAuth 2.0 (chọn tài khoản Google 1-click), bấm *"Lưu và kiểm tra kết nối"* hoặc *"Tải lại"*.
  - **Cơ chế nạp cấu hình 3 tầng:**
    1. **Tầng 1 (CSDL Supabase `app_settings`):** Khi Admin lưu cấu hình trên giao diện, danh sách tài khoản và `active_email` được lưu an toàn vào `app_settings` (key `google_drive_config`) và áp dụng ngay lập tức cho toàn bộ hệ thống.
    2. **Tầng 2 (Biến môi trường `.env`):** Nếu chưa có cấu hình tùy chỉnh trên CSDL, hệ thống tự động fallback về biến môi trường `.env` (`GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_REFRESH_TOKEN`...).
  - **Tích hợp Pancake Webhook (`/settings?tab=ads`):** Cấu hình Pancake Public API Token, Khóa bảo vệ webhook (`webhook_secret`), nút *"Tạo khóa ngẫu nhiên"*, ô sao chép URL Webhook (`/api/pancake/webhook`), checkbox kích hoạt và kiểm tra token.

- **Cấu trúc Thư mục & Định dạng Tên File:**
  1. **Hóa đơn, Phiếu Thu, Phiếu Chi, Minh chứng chuyển khoản & Hợp đồng Tour:**
     - **Vị trí lưu trữ:** Được tự động gom nhóm và lưu trực tiếp vào **thư mục Tour tương ứng** (`Tour CRM > Tour > {MÃ_TOUR}`).
     - **Cơ chế nhận diện:** Backend tự động phân tích và tra cứu mã Tour (`tourCode`) từ Mã đơn hàng (`orderId`/`orderCode`), mã hóa đơn (`invoiceId`/`invoiceCode`), hoặc mã Tour trực tiếp. Nếu là khoản chi phí chung không thuộc tour cụ thể, file sẽ được lưu vào thư mục `Tour CRM > Tour > TOUR_CHUNG`.
     - **Tên file:** Chuẩn hóa theo công thức: `{MÃ_ĐƠN_HÀNG/MÃ_LOẠI}_{TIMESTAMP}_{TÊN_FILE_GỐC}`.
  2. **Hồ sơ Hành khách, Hộ chiếu & Giấy tờ cá nhân:**
     - **Vị trí lưu trữ:** Lưu theo thư mục số hộ chiếu của khách: `Tour CRM > Đơn hàng > {SỐ_HỘ_CHIẾU}` (hoặc `CHUA_CO_HC` nếu chưa có hộ chiếu).
     - **Tên file:** Chuẩn hóa theo công thức: `{SỐ_HỘ_CHIẾU}-{TÊN_VIẾT_TẮT_KHÁCH}.{định_dạng_file}`.
  3. **Tài liệu Visa & File Hướng dẫn Mẫu:**
     - **File mẫu từng dịch vụ visa lẻ:** Lưu tại thư mục dịch vụ riêng biệt (`Tour CRM > Visa > {MÃ_DỊCH_VỤ}` - VD: `Tour CRM > Visa > VIAU`).
     - **File mẫu dùng chung tất cả loại visa:** Lưu trực tiếp tại thư mục gốc Visa (`Tour CRM > Visa`).
  4. **Đề nghị Thanh toán, Hóa đơn & Minh chứng Chi tiền (Payment Proposals):**
     - **Chi phí theo Tour:** Lưu tự động vào `Tour CRM > Tour > {MÃ_TOUR} > Chi phí`.
     - **Chi phí chung / Chi lẻ:** Lưu tự động vào `Tour CRM > Kế toán > Tháng {MM-YYYY} > Chi phí` (VD: `Tour CRM > Kế toán > Tháng 07-2026 > Chi phí`).
     - **Mã Đề nghị Thanh toán:** Chuẩn hóa theo công thức `DNTT-mmyyyy-stt` (VD: `DNTT-072026-001`).
     - **Tên File:** Chuẩn hóa tự động theo công thức: `{MÃ_ĐỀ_NGHỊ}_{TÊN_FILE_GỐC}` (VD: `DNTT-072026-001_HoaDonTraSua.pdf`).

- **Quyền Truy Cập & Xóa File Vĩnh Viễn:**
  - **Quyền truy cập:** Khi file được tải lên Google Drive, backend tự động thiết lập quyền xem công khai (`role: reader, type: anyone`) và trả về đường dẫn `webViewLink`. Người dùng có thể click trực tiếp để xem trước, phóng to, in ấn hoặc tải xuống.
  - **Xóa file:** Khi xóa file khỏi hệ thống, backend tự động phân biệt liên kết (Google Drive File ID hay Supabase Public URL) để gọi API xóa vĩnh viễn trên kho lưu trữ tương ứng, đảm bảo không để lại tài liệu rác hay chiếm dụng dung lượng.

---

## 9. Cấu Trúc Thư Mục & Vai Trò Hệ Thống Hóa các File (Hỗ trợ Quản lý & Nâng cấp)
Để giúp quá trình quản lý, sửa chữa và nâng cấp hệ thống sau này diễn ra trơn tru nhất, cấu trúc mã nguồn được quy định và mô tả chi tiết như sau:

### 9.1 Sơ đồ cấu trúc thư mục chính
```bash
/
├── server.ts               # Core Backend (Express, Google Drive API, Supabase Proxy, Dev Server)
├── supabase-schema.sql     # Database Schema (Mã SQL khởi tạo bảng, quyền, trigger đồng bộ profile)
├── metadata.json           # Metadata ứng dụng AI Studio (Tên, mô tả, quyền thiết bị)
├── package.json            # Quản lý các thư viện dependencies và lệnh build/run
├── .env.example            # Bản mẫu cấu hình biến môi trường (Supabase, Google Drive)
├── src/
│   ├── main.tsx            # Điểm khởi chạy Client-side React
│   ├── App.tsx             # Cấu hình Routing chính và phân chia Layout theo quyền truy cập
│   ├── types.ts            # Định nghĩa toàn bộ kiểu dữ liệu (Tour, Order, Passenger, Role...)
│   ├── index.css           # Global CSS sử dụng Tailwind CSS v4
│   ├── lib/
│   │   ├── supabase.ts     # Client kết nối Supabase, Proxy thông minh, kiểm tra Auto-create Bucket
│   │   └── utils.ts        # Các hàm tiện ích dùng chung
│   ├── context/
│   │   ├── AuthContext.tsx # Quản lý phiên đăng nhập (Supabase Auth) và đồng bộ Profile người dùng
│   │   └── CRMContext.tsx  # Bộ não quản lý trạng thái CRM (Đồng bộ offline/online, CRUD Tour, Đơn hàng)
│   ├── components/
│   │   ├── Layout.tsx      # Sidebar, Header, thanh chọn Vai trò (Role Switcher), nút Góp ý & Báo lỗi, thông báo đẩy (Real-time)
│   │   ├── FeedbackModal.tsx # Form tiếp nhận đóng góp ý kiến & báo lỗi hệ thống
│   │   ├── DatePicker.tsx  # Component chọn ngày chuẩn hóa giao diện và trải nghiệm
│   │   ├── ActionModal.tsx # Hộp thoại thông báo xác nhận hành động nguy hiểm (Xóa, Hủy)
│   │   ├── UserManagement.tsx # Trình quản lý tài khoản thành viên (Chỉ Admin mới truy cập được)
│   │   ├── EditOrderModal.tsx # Form cập nhật thông tin Booking / Đơn hàng
│   │   └── EditPassengerModal.tsx # Form cập nhật hồ sơ hành khách, tải lên Visa / Hộ chiếu

│   └── pages/
│       ├── DepartureCalendar.tsx # Lịch khởi hành (Bộ lọc danh mục, hiển thị trực quan dạng lịch & danh sách)
│       ├── ToursManagement.tsx   # Quản lý Tour & Lịch trình (Form tạo Tour, Tab Danh mục sản phẩm)
│       ├── OrdersManagement.tsx  # Quản lý Booking (Form đặt chỗ, theo dõi trạng thái hold/sure, gia hạn giữ chỗ)
│       ├── VisaServices.tsx      # Quản lý các dịch vụ Visa lẻ của đại lý
│       ├── VisaProcessing.tsx    # Xử lý Visa (Dành cho bộ phận Visa duyệt, cập nhật trạng thái hồ sơ hành khách)
│       ├── AccountingInvoice.tsx # Kế toán & Hóa đơn (Duyệt Thu/Chi hóa đơn, thống kê doanh thu lữ hành)
│       ├── CustomersManagement.tsx # Quản lý Đại lý & CTV (Thống kê xếp hạng thành viên: Bạc, Vàng, Kim cương)
│       ├── PassengersManagement.tsx # Quản lý danh sách Khách hàng đi tour
│       ├── Profile.tsx           # Trang thông tin tài khoản cá nhân, đổi mật khẩu
│       └── Settings.tsx          # Trang cài đặt cấu hình hệ thống chuyên sâu
```

### 9.2 Nguyên tắc bảo trì & Tránh phá vỡ Logic cũ
Khi thực hiện nâng cấp hoặc sửa đổi bất kỳ file nào trong hệ thống, bắt buộc tuân thủ các nguyên tắc vàng sau:
1. **Kiến trúc Offline-First Dự phòng (Hybrid Mode):** 
   - `CRMContext.tsx` được thiết kế để tự động đồng bộ dữ liệu với Supabase khi online, và lưu tạm vào `localStorage` làm phương án dự phòng khi offline hoặc khi Supabase chưa cấu hình. 
   - **Tuyệt đối không** loại bỏ phần dự phòng `localStorage` khi sửa code fetch dữ liệu.
2. **Đồng bộ File an toàn qua Backend:**
   - Client tuyệt đối không gọi trực tiếp API Google Drive. Mọi thao tác tải lên và xóa file hộ chiếu/visa phải thông qua API trung gian ở `server.ts` để bảo mật API key và Service Account.
3. **Phân Quyền ở cả 2 đầu (Client & Database):**
   - Không được tắt tính năng RLS (Row Level Security) trên các bảng Supabase. Mọi thay đổi về phân quyền ở frontend (`Layout.tsx`) phải đồng nhất với logic phân vai trò tại `AuthContext.tsx`.
4. **Nhất quán Ngôn ngữ:**
   - Toàn bộ giao diện người dùng, thông báo thành công, lỗi và hướng dẫn cài đặt phải viết bằng **Tiếng Việt** chuẩn xác, chuyên nghiệp.

---

## 10. Quy Tắc Giao Diện Bộ Lọc, Dropdown & Popover (UI Rules)
- **Thiết kế Dropdown Tùy Chỉnh (Custom UI Dropdown):**
  - Sử dụng giao diện Menu Dropdown tùy chỉnh theo chuẩn Tailwind CSS (`bg-white border border-slate-200 shadow-xl rounded-xl`) thay cho thẻ `<select>` mặc định của trình duyệt để đảm bảo màu sắc, icon, góc bo tròn và hiệu ứng hover đồng bộ hoàn toàn với ứng dụng.
  - **Chống xuống dòng (No-Wrap Layout):** Đảm bảo tất cả các button kích hoạt dropdown luôn sử dụng `flex items-center justify-between gap-2 whitespace-nowrap min-w-0` để tiêu đề và icon mũi tên (`ChevronDown`) luôn nằm trên cùng một hàng duy nhất, không bao giờ bị rớt icon xuống dòng dưới.
- **Cơ chế hoạt động Bộ lọc thời gian (`TimeRangeFilter`):**
  - **Menu Lựa Chọn Tùy Chỉnh:** Hiển thị nút bấm kích hoạt dropdown với icon lịch và chevron xoay mượt mà, danh sách tùy chọn có dấu tích xanh (`Check`) đánh dấu mục đang chọn.
  - **Nút Chỉnh Sửa Ngày Tùy Chỉnh:** Khi ở chế độ "Chọn ngày", hiển thị khoảng ngày đã chọn kèm nút icon cây bút ✏️ (`Edit2`) bên cạnh để mở/đóng Popover tùy chỉnh mượt mà mà không đè lên menu dropdown.
  - **Tự động đóng Menu & Popover:** Click ra ngoài vùng chọn (click-outside) sẽ tự động ẩn menu dropdown và popover ngày.

---

## 11. Quy Trình Triển Khai Task Theo 5 Bước (Bắt Buộc Cho AI)
Để đảm bảo chất lượng code cao nhất và tránh tối đa lỗi phát sinh, AI bắt buộc phải tuân thủ nghiêm ngặt **Quy trình triển khai task 5 bước** sau đây trong mọi tương tác:

- **Bước 1: Check lại trong file AGENTS.md và file BUGS.md về task đó**
  - Đọc kỹ toàn bộ hướng dẫn, cấu trúc database, phân quyền, cấu trúc thư mục, quy tắc UI trong `AGENTS.md`.
  - Kiểm tra file `BUGS.md` (nếu có) để xem các lỗi hoặc lưu ý liên quan đến chức năng đang xử lý.
- **Bước 2: Trao đổi, phản biện lại với người dùng về task đó**
  - Trước khi bắt tay vào code, giải thích rõ hiểu biết về yêu cầu, đề xuất giải pháp kỹ thuật, phân tích tác động và chờ xác nhận từ người dùng.
- **Bước 3: Triển khai task**
  - Tiến hành viết code sạch, chuẩn hóa TypeScript, tối ưu hiệu năng và bám sát các tiêu chuẩn thiết kế tinh tế (Anti-Slop) của dự án.
- **Bước 4: Double check lại hoạt động của task sau khi code xong**
  - Chạy linter (`npm run lint`), build thử nghiệm (`npm run build`).
  - Kiểm tra các lỗi phổ biến như đổi thứ tự React Hook, sai logic phân quyền, lỗi render vô tận, hay rớt dòng UI.
- **Bước 5: Lưu lại thông tin về task đó**
  - Cập nhật nhật ký công việc hoặc lưu trữ thông tin cần thiết vào `AGENTS.md` / `BUGS.md` để đảm bảo ngữ cảnh cho các phiên làm việc tiếp theo.

---

## 12. Phân Hệ Quản Lý Nhân Sự (HR), Nghỉ Phép & Chấm Công
- **Vai trò Nhân sự (`role: 'hr'`):**
  - Quản lý phân hệ **Quản lý nhân sự** (`/employees`) trực thuộc cụm *Hành chính nhân sự* (thay vì vào Cài đặt hệ thống) và phân hệ *Nghỉ phép & Chấm công* (`/leave-requests`).
  - Có toàn quyền xem danh sách nhân sự công ty, cơ cấu phòng ban/team, thêm nhân sự mới, cập nhật hồ sơ cá nhân và quản lý trạng thái làm việc (Thử việc / Chính thức / Đã nghỉ việc).
  - Có quyền điều chỉnh số ngày phép / quỹ phép của toàn bộ nhân viên thủ công (qua bảng chấm công `TimesheetManagement.tsx` và phân hệ `LeaveBalanceManagement.tsx`).
  - Mục *Cài đặt hệ thống* (`/settings`): Đã được ẩn khỏi thanh Sidebar của HR (chỉ dành riêng cho Admin/BOD); nếu HR truy cập URL này sẽ được tự động điều hướng sang `/employees`.
- **Tab Con "Quản lý nhân sự" Trong Cụm Hành Chính Nhân Sự:**
  - Vị trí: Hiển thị trên thanh Sidebar và thanh Sub-tabs điều hướng của cụm *Hành chính nhân sự* (`/employees`).
  - Phân quyền: Chỉ hiển thị cho **Nhân sự (`hr`)**, **Quản trị viên (`admin`)** và **Ban Giám Đốc (`bod`)**. Các nhân viên khác (Sale, Điều hành, Visa, Kế toán, HDV...) bị ẩn để bảo mật hồ sơ nhân sự nội bộ.
- **Quy trình Duyệt Nghỉ Phép 2 Cấp:**
  - **Cấp 1:** Trưởng nhóm (Leader: `sale_leader`, `marketing_leader`, etc.) duyệt đơn của thành viên trong nhóm (`status` chuyển thành `approved_level_1`).
  - **Cấp 2 (Duyệt cuối):** Nhân sự (`hr`) hoặc Ban Giám Đốc/Admin duyệt hoàn tất (`status` chuyển thành `approved_final`).
- **Phân Quyền Xem Dữ Liệu Chấm Công & Quỹ Phép:**
  - **Nhân viên thông thường:** Chỉ xem dữ liệu chấm công và quỹ phép của chính mình.
  - **Trưởng nhóm (Leader):** Xem dữ liệu của chính mình và các thành viên trực thuộc nhóm phụ trách.
  - **HR / BOD / Admin:** Xem toàn bộ nhân sự công ty.
- **Chuẩn Hóa UI/UX Toàn Bộ Calendar và Dropdown Trong Phân Hệ Nhân Sự:**
  - **Lịch chọn ngày (Calendar):** Thay thế toàn bộ các thẻ `<input type="date">` thô bằng component `DatePicker.tsx` chuẩn Tiếng Việt (hỗ trợ nhập `dd/mm/yyyy`, chọn ngày lịch trực quan, nút Hôm nay, Xóa ngày) tại tất cả các modal: Ngày vào làm việc chính thức (`join_date`), Ngày chính thức thôi việc (`resigned_at`) và modal Thay đổi trạng thái nhanh.
  - **Hộp chọn Dropdown (CustomSelect):** Chuyển đổi 100% các thẻ `<select>` native sang component `CustomSelect.tsx` với biểu tượng đi kèm, độ rộng an toàn chống cắt chữ (`w-52` đến `w-64`), đồng bộ chiều cao `h-10` và hiệu ứng dropdown mềm mại:
    + Bộ lọc Trạng thái làm việc (`employmentFilter` - icon `Briefcase`).
    + Bộ lọc Thâm niên công tác (`seniorityFilter` - icon `Clock`).
    + Bộ lọc Vai trò CRM (`roleFilter` - icon `Shield`).
    + Bộ lọc Team / Nhóm kinh doanh (`teamFilter` - icon `Building2`).
    + Dropdown Phân vai trò trong form Nhân sự.
    + Dropdown Trạng thái làm việc & Chế độ trong form Nhân sự.
    + Dropdown Thuộc Team / Nhóm trong form Nhân sự.
    + Dropdown Leader phụ trách trực tiếp trong form Nhân sự.
    + Dropdown Chọn Leader phụ trách Team trong modal Quản lý Team.
    + Dropdown Chọn tông màu huy hiệu trong modal Phân quyền vai trò.

---

## 13. Quy Chuẩn Xuất Hóa Đơn VAT & Tính Thuế / Phí Cho Cộng Tác Viên (CTV)

### 13.1 Xuất Hóa Đơn VAT (VAT Invoicing)
- **Tùy chọn xuất VAT:**
  - Hệ thống hỗ trợ 2 chế độ: **"Xuất VAT"** (`vat_option === 'Xuất VAT'`) và **"Không xuất VAT"** (mặc định).
  - Tỷ lệ thuế VAT chuẩn: **10%**.
- **Nguyên tắc Giá Tour Đã Bao Gồm Thuế VAT (VAT Included):**
  - Biểu giá niêm yết của Tour (Người lớn, Trẻ em, Trẻ nhỏ) và các phụ thu là giá trọn gói **đã bao gồm thuế VAT**. Khách hàng chọn xuất hóa đơn đỏ hay không thì **Tổng tiền thanh toán không đổi** (không bị đội thêm 10%).
  - **Tổng tiền thanh toán đơn hàng (Final Total Amount):** Tổng tiền vé + Tổng phụ thu + Tiền bán tour chênh lệch CTV - Tiền giảm giá (chiết khấu).
  - **Khi chọn "Xuất VAT":** Hệ thống bóc tách thuế VAT từ tổng tiền thanh toán:
    + `Tiền trước thuế (Total Before VAT) = Math.round(Tổng thanh toán / 1.1)`.
    + `Tiền thuế VAT (VAT Amount) = Tổng thanh toán - Tiền trước thuế`.
    + `Tổng giá trị hóa đơn xuất VAT = Tổng thanh toán`.
  - **Khi chọn "Không xuất VAT":** Tiền VAT ghi nhận bằng 0, Tổng thanh toán giữ nguyên.
- **Trường thông tin doanh nghiệp nhận hóa đơn VAT:**
  - `vat_company_name`: Tên pháp nhân đầy đủ của doanh nghiệp nhận hóa đơn.
  - `vat_tax_code`: Mã số thuế (MST) của công ty.
  - `vat_address`: Địa chỉ trụ sở ghi nhận trên giấy phép kinh doanh.
  - `vat_email`: Email tiếp nhận hóa đơn điện tử (e-invoice).

---

### 13.2 Tính Thuế / Phí Công Ty & Hoa Hồng Cho Cộng Tác Viên (CTV)
- **Cơ chế hoa hồng định mức cơ bản:**
  - Hoa hồng định mức được tính trên mỗi ghế khách: người lớn và trẻ em (`paxCount = adultCount + childCount`). Trẻ nhỏ (< 2 tuổi) không tính hoa hồng.
  - **Hoa hồng gốc:** `Hoa hồng định mức mỗi khách * Số khách tính hoa hồng`.
  - **Quy tắc phụ thu:** Các khoản phụ thu (phòng đơn, nâng hạng, dịch vụ thêm) **tuyệt đối không được tính vào hoa hồng** của CTV.
- **Tiền bán tour chênh lệch (Price Markup) & Phí công ty thu:**
  - Khi CTV bán giá cao hơn biểu giá niêm yết của công ty cho khách, khoản chênh lệch này được khai báo ở trường `price_markup`.
  - **Tỷ lệ phí/thuế công ty thu:** Mặc định là **25%** (`markup_tax_percent = 25`), có thể tùy chỉnh từ 0% đến 100%.
  - **Số tiền phí công ty thu:** `Tiền bán chênh lệch * 25%`.
  - **Tiền chênh lệch thực nhận của CTV:** `Tiền bán chênh lệch - Tiền phí công ty thu` (tương đương 75% giá trị chênh lệch).
- **Khấu trừ giảm giá cho khách:**
  - Nếu CTV chủ động giảm giá cho khách hàng (`discountAmount`), số tiền giảm giá này sẽ bị trừ trực tiếp vào tổng hoa hồng thực nhận của CTV.
- **Công thức tổng hoa hồng thực nhận cuối cùng của CTV:**
  - `Tổng hoa hồng thực nhận = (Hoa hồng định mức * Số khách) + (Tiền bán chênh lệch - Phí công ty thu) - Tiền giảm giá`.
  - Nếu có gán hoa hồng thủ công đặc biệt (`manualCommission`), hệ thống sẽ ưu tiên ghi nhận theo số tiền này.





