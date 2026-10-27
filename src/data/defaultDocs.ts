export interface SystemDoc {
  id: string;
  slug: string;
  title: string;
  category: string;
  order_index: number;
  target_roles: string[];
  badge?: string;
  summary: string;
  content: string;
  author?: string;
  updated_at?: string;
  created_at?: string;
}

export interface DocCategory {
  id: string;
  name: string;
  iconName: string;
  description: string;
}

export const DOC_CATEGORIES: DocCategory[] = [
  { id: 'overview', name: 'Bắt đầu & Tổng quan', iconName: 'Compass', description: 'Giới thiệu tổng quan hệ thống, giao diện và phân quyền' },
  { id: 'sale', name: 'Nghiệp vụ Sale & Bán Tour', iconName: 'ShoppingCart', description: 'Tra cứu tour, đặt chỗ (Hold), phụ thu và hoa hồng CTV' },
  { id: 'operator', name: 'Nghiệp vụ Điều hành (Operator)', iconName: 'Sliders', description: 'Khai báo tour, chia xe, danh sách đoàn và ảnh HDV' },
  { id: 'accounting', name: 'Nghiệp vụ Kế toán & Tài chính', iconName: 'Calculator', description: 'Hạch toán chi phí, lãi lỗ, phiếu thu/chi và đề nghị thanh toán' },
  { id: 'visa', name: 'Dịch vụ Visa & Hồ sơ khách', iconName: 'Globe', description: 'Bảng giá dịch vụ visa, hồ sơ hành khách và duyệt visa' },
  { id: 'hr', name: 'Hành chính - Nhân sự & Phép năm', iconName: 'Palmtree', description: 'Quỹ phép lũy tiến 1 ngày/tháng và quy trình duyệt 2 cấp' },
  { id: 'faq', name: 'Hỏi đáp & Khắc phục sự cố', iconName: 'HelpCircle', description: 'Giải đáp các thắc mắc và lỗi thường gặp trong vận hành' },
];

export const DEFAULT_DOCS: SystemDoc[] = [
  {
    id: 'doc-intro',
    slug: 'intro',
    title: 'Giới thiệu tổng quan hệ thống Tour CRM',
    category: 'overview',
    order_index: 1,
    target_roles: ['all'],
    badge: 'Khởi đầu',
    summary: 'Tổng quan kiến trúc, mục tiêu và các phân hệ chức năng chính của hệ thống Tour CRM.',
    content: `## 1. Tổng quan về Tour CRM

**Tour CRM** là nền tảng quản trị vận hành du lịch lữ hành toàn diện dành cho doanh nghiệp lữ hành, kết nối liền mạch từ khâu tiếp cận khách hàng (Marketing, Meta CAPI, Pancake), kinh doanh (Sale, CTV, Đại lý), điều phối (Điều hành Tour, HDV), đến tài chính (Kế toán, BOD) và nhân sự (HR).

> 💡 **Mục tiêu cốt lõi:** Chuẩn hóa 100% luồng dữ liệu, loại bỏ sai lệch số liệu giữ chỗ, kiểm soát chặt chẽ lãi lỗ từng đoàn tour và tự động hóa thanh toán hoa hồng cho Đại lý/CTV.

---

## 2. Các phân hệ nghiệp vụ chính

Hệ thống được chia thành 7 phân hệ chính tương ứng với quy trình vận hành thực tế:

- **Lịch khởi hành (Departure Calendar):** Trung tâm tra cứu sản phẩm tour, lịch bay, tình trạng chỗ trống theo thời gian thực và biểu giá chi tiết.
- **Quản lý Tour & Điều hành:** Dành cho bộ phận Điều hành (Operator) cấu hình định mức chỗ mở bán, hạn mức vé/visa, chia danh sách đoàn và kết nối thư mục ảnh Google Drive của HDV.
- **Quản lý Booking:** Ghi nhận đơn đặt chỗ (Hold), kiểm tra hạn giữ chỗ 5 phút, xác nhận thanh toán cọc và quản lý danh sách hành khách.
- **Dịch vụ & Hồ sơ Visa:** Quản lý bảng giá visa lẻ, nhận hồ sơ, theo dõi tiến độ cấp visa và lưu trữ chứng từ.
- **Kế toán & Hạch toán:** Bảng hạch toán chi phí - lãi lỗ từng tour, quản lý phiếu thu/chi, công nợ đại lý và duyệt Đề nghị thanh toán (DNTT).
- **Hành chính Nhân sự:** Chấm công, quản lý quỹ phép năm lũy tiến động (1 ngày/tháng) và quy trình duyệt phép 2 cấp.
- **Marketing & Phân tích:** Báo cáo hiệu quả quảng cáo Meta Ads, chỉ số CAPI và tương tác khách hàng qua Fanpage/Messenger.

---

## 3. Quy chuẩn hiển thị & Thao tác trên hệ thống

- **Định dạng thời gian:** Tất cả thời gian trên hệ thống luôn tuân thủ định dạng \`HH:mm dd/MM/yyyy\` (hoặc \`dd/MM/yyyy\` với ngày thuần túy).
- **Phân tách hàng nghìn:** Tất cả ô nhập tiền tệ hoặc số lượng luôn tự động định dạng phân tách dấu chấm \`1.000.000 đ\` để tránh nhầm lẫn.
- **Giao diện di động (PWA):** Ứng dụng hỗ trợ cài đặt trực tiếp lên màn hình chính của điện thoại (iOS và Android) với trải nghiệm như ứng dụng gốc.`,
    author: 'Ban Quản Trị',
    updated_at: '2026-09-09T00:00:00Z',
  },
  {
    id: 'doc-roles',
    slug: 'roles-and-permissions',
    title: 'Phân quyền & Ma trận trách nhiệm 12 vai trò',
    category: 'overview',
    order_index: 2,
    target_roles: ['all'],
    badge: 'Quan trọng',
    summary: 'Quy định chi tiết về phạm vi truy cập, quyền hạn và trách nhiệm của từng vai trò nhân sự trong hệ thống.',
    content: `## 1. Danh sách 12 vai trò trong hệ thống

Hệ thống Tour CRM thiết lập ma trận phân quyền chặt chẽ (RBAC) để đảm bảo bảo mật và minh bạch dữ liệu:

| Vai trò (Role) | Ký hiệu | Phạm vi trách nhiệm chính |
| :--- | :--- | :--- |
| **Quản trị viên** | \`admin\` | Toàn quyền quản trị hệ thống, người dùng, cấu hình bảo mật và dữ liệu. |
| **Ban Giám Đốc** | \`bod\` | Xem toàn bộ báo cáo doanh thu, lãi gộp, hiệu quả từng team và duyệt cấp cuối. |
| **Trưởng nhóm Sale** | \`sale_leader\` | Quản lý team kinh doanh, duyệt đơn phép cấp 1, xem báo cáo tour gửi & đoàn riêng. |
| **Nhân viên Sale** | \`sale\` | Tư vấn khách, giữ chỗ, chốt đơn, theo dõi KPI cá nhân và nhập hộ cho CTV. |
| **Điều hành Tour** | \`operator\` | Tạo tour, cấu hình chỗ, điều phối xe/HDV, overbooking và xuất danh sách đoàn. |
| **Kế toán** | \`accounting\` | Lập phiếu thu/chi, hạch toán lãi lỗ, đối soát công nợ và duyệt thanh toán. |
| **Bộ phận Visa** | \`visa\` | Quản lý hồ sơ visa đoàn/lẻ, cập nhật kết quả và thông báo khách. |
| **Nhân sự (HR)** | \`hr\` | Quản lý tài khoản nhân viên, điều chỉnh quỹ phép và duyệt nghỉ phép cấp cuối. |
| **Hướng Dẫn Viên** | \`tour_guide\` | Xem danh sách đoàn, tải ảnh kỷ niệm đoàn lên Drive và lập đề nghị thanh toán tour. |
| **Marketing Leader** | \`marketing_leader\` | Quản lý chiến dịch quảng cáo, hiệu quả chuyển đổi và duyệt phép team MKT. |
| **Nhân viên Marketing** | \`marketing\` | Theo dõi lead, phân tích số liệu Meta Ads và tối ưu nội dung. |
| **Đại lý & CTV** | \`agent\` / \`CTV\` | Xem lịch tour, giữ chỗ theo giá niêm yết, theo dõi hoa hồng thực nhận. |

---

## 2. Các quy định đặc thù về phân quyền cần nhớ

> ⚠️ **Quyền tạo Tour:** Chỉ duy nhất vai trò **Điều hành (\`operator\`)** và **Quản trị viên (\`admin\`)** mới có nút Tạo tour mới. Sale Leader chỉ được tạo và quản lý Tour gửi đối tác (\`partner\`) và Tour đoàn riêng (\`private\`), **không có quyền** can thiệp Tour tự vận hành nội bộ.

> 🔒 **Quyền mở khóa đơn hàng:** Khi đơn hàng đã bị khóa để chốt danh sách đoàn, chỉ có Admin hoặc Sale Leader phụ trách trực tiếp thành viên đó mới có quyền mở khóa để bổ sung/sửa đổi thông tin.`,
    author: 'Ban Quản Trị',
    updated_at: '2026-09-09T00:00:00Z',
  },
  {
    id: 'doc-departure-calendar',
    slug: 'departure-calendar',
    title: 'Hướng dẫn tra cứu Lịch khởi hành & Biểu giá chi tiết',
    category: 'sale',
    order_index: 1,
    target_roles: ['sale', 'sale_leader', 'agent', 'CTV', 'operator'],
    badge: 'Nghiệp vụ Sale',
    summary: 'Cách lọc tour, xem số chỗ còn lại theo thời gian thực và tra cứu biểu giá phân cấp theo độ tuổi.',
    content: `## 1. Giao diện Lịch khởi hành (Departure Calendar)

Trang **Lịch khởi hành** là công cụ làm việc hàng ngày của bộ phận Sale và Đại lý, giúp cập nhật tình trạng chỗ và giá bán trong vài giây.

### Các bộ lọc thông minh:
- **Lọc theo Tuyến / Danh mục:** Chọn nhanh các tuyến tour Đông Nam Á, Đông Bắc Á, Châu Âu, Mỹ, Nội địa.
- **Lọc theo Tháng khởi hành:** Tìm kiếm các ngày đi trong tháng mong muốn.
- **Tìm kiếm từ khóa:** Tìm theo mã tour (\`TL-2026...\`), tên chương trình hoặc hãng bay.

> 💡 **Tự động lọc tour quá hạn:** Hệ thống tự động ẩn các tour đã khởi hành trước 00:00 ngày hôm nay để tránh giữ chỗ nhầm vào tour cũ. Nút đặt chỗ của các tour đã hết ngày đi sẽ tự động bị khóa với nhãn \`🔒 Tour đã quá lịch khởi hành\`.

---

## 2. Thứ tự ưu tiên trong Biểu giá chi tiết

Biểu giá của mỗi tour được chuẩn hóa hiển thị thành 6 khối riêng biệt:

1. **Người lớn (≥ 10 tuổi):** Giá trọn gói tiêu chuẩn cho 1 khách người lớn.
2. **Trẻ em (2 - dưới 10 tuổi):** Mức giá áp dụng ngủ chung giường với bố mẹ.
3. **Trẻ nhỏ (< 2 tuổi):** Chi phí vé máy bay & bảo hiểm cho em bé.
4. **Phụ thu phòng đơn:** Áp dụng khi khách đi lẻ có nhu cầu nghỉ riêng 1 phòng.
5. **Dịch vụ Visa (Nếu cần):** Phí làm visa theo quy định của tuyến tour (nếu chưa gồm trong giá tour).
6. **Hoa hồng / Khách:** Mức hoa hồng định mức quy định cho Đại lý/CTV khi bán thành công 1 khách người lớn.

---

## 3. Nhận diện trạng thái chỗ mở bán

- 🟢 **Còn chỗ (Available):** Số ghế thực tế còn trống cho phép giữ chỗ hoặc chốt tour ngay.
- ⏳ **Đang giữ (Hold):** Số chỗ đang được giữ tạm thời bởi các tư vấn viên khác, có thể nhả lại nếu hết hạn hold.
- 🔴 **Hết chỗ (Sold Out):** Đoàn đã đủ khách. Trường hợp có phê duyệt Overbooking (+OB), hệ thống sẽ hiển thị số chỗ overbook cho phép chốt thêm.`,
    author: 'Phòng Điều Hành',
    updated_at: '2026-09-09T00:00:00Z',
  },
  {
    id: 'doc-booking-and-hold',
    slug: 'booking-and-hold',
    title: 'Quy trình đặt chỗ (Hold 5 phút) & Chốt booking',
    category: 'sale',
    order_index: 2,
    target_roles: ['sale', 'sale_leader', 'agent', 'CTV'],
    badge: 'Quy trình cốt lõi',
    summary: 'Các bước nhập thông tin giữ chỗ, thời gian đếm ngược và thủ tục xác nhận đặt cọc an toàn.',
    content: `## 1. Quy trình giữ chỗ 3 bước chuẩn

Để đảm bảo công bằng cho toàn bộ đội ngũ kinh doanh và tránh tình trạng "ôm chỗ ảo", hệ thống áp dụng cơ chế khóa chỗ tạm thời:

### Bước 1: Chọn Tour & Bấm "Đặt tour / Giữ chỗ"
- Tại thẻ Tour trên trang Lịch khởi hành, bấm nút **"Đặt tour / Giữ chỗ"**.
- Hệ thống lập tức kích hoạt bộ đếm ngược **5 phút giữ chỗ**. Trong 5 phút này, số chỗ bạn chọn sẽ được tạm khóa để bạn an tâm điền thông tin khách mà không sợ bị người khác lấy mất.

### Bước 2: Nhập thông tin trưởng đoàn & số lượng khách
- Nhập **Họ và tên**, **Số điện thoại** của khách đại diện (trưởng nhóm).
- Khai báo số lượng Người lớn, Trẻ em, Em bé và số phòng đơn phát sinh.
- Nếu là đơn tạo hộ cho Đại lý hoặc CTV ngoài, chọn đúng tài khoản đối tác để hệ thống tự động tính hoa hồng.

### Bước 3: Xác nhận Giữ chỗ hoặc Chốt thanh toán
- **Giữ chỗ tạm thời (Hold):** Sử dụng khi khách hàng đang suy nghĩ hoặc chờ chuyển khoản. Hạn giữ chỗ mặc định sẽ do Điều hành quy định (thường từ 24h - 48h).
- **Chốt cọc / Chốt Sure:** Tải lên ảnh ủy nhiệm chi / biên lai chuyển tiền và cập nhật số tiền khách đã cọc để chuyển trạng thái sang **Đã chốt**.

> ⚠️ **Hết hạn đếm ngược 5 phút:** Nếu sau 5 phút bạn chưa bấm Xác nhận lưu đơn, form đặt chỗ sẽ tự động đóng và hoàn trả số chỗ lại cho toàn hệ thống.`,
    author: 'Phòng Kinh Doanh',
    updated_at: '2026-09-09T00:00:00Z',
  },
  {
    id: 'doc-surcharges-and-commission',
    slug: 'surcharges-and-commission',
    title: 'Hướng dẫn Phụ thu, Giá chênh lệch & Tính hoa hồng CTV',
    category: 'sale',
    order_index: 3,
    target_roles: ['sale', 'sale_leader', 'accounting', 'agent', 'CTV'],
    badge: 'Tài chính Sale',
    summary: 'Cách khai báo danh sách phụ thu linh hoạt, cơ chế chia sẻ giá chênh lệch CTV và công thức tính hoa hồng thực nhận.',
    content: `## 1. Quản lý danh sách nhiều khoản Phụ thu (Surcharges)

Trong thực tế bán tour, mỗi đơn hàng có thể phát sinh nhiều khoản phụ thu khác nhau (nâng hạng vé máy bay, phòng đơn, suất ăn đặc biệt, visa khẩn).

- Hệ thống hỗ trợ thêm không giới hạn các khoản phụ thu dạng danh sách \`{Tên phụ thu, Số tiền}\`.
- Tổng tiền các khoản phụ thu sẽ được tự động cộng vào **Tổng giá trị đơn hàng** mà khách phải thanh toán.

> 📋 **Lưu ý cốt lõi:** Các khoản phụ thu chỉ tính vào tổng tiền đơn hàng để thu của khách, **hoàn toàn KHÔNG được tính vào hoa hồng thực nhận** của CTV/Đại lý.

---

## 2. Tiền Tour Chênh Lệch CTV & Phí Công Ty

Khi Cộng Tác Viên (CTV) bán tour cho khách với giá cao hơn giá công ty niêm yết:

- **Nhập khoản Tiền tour chênh lệch (\`price_markup\`):** Số tiền chênh lệch CTV tự bán thêm cho khách.
- **Phí công ty thu trên chênh lệch:** Mặc định là **25%** (có thể điều chỉnh linh hoạt từ 0% đến 100% theo chính sách từng đoàn).
- **Tiền chênh lệch CTV nhận:** Bằng 75% số tiền chênh lệch sau khi đã trừ đi phí công ty thu.

---

## 3. Công thức tính Tổng Hoa Hồng Thực Nhận

Bảng kê hoa hồng trong đơn hàng được trình bày rõ ràng thành 4 khối:

1. **Hoa hồng định mức:** \`Hoa hồng/khách x Tổng số khách người lớn\`.
2. **Cộng Tiền chênh lệch được hưởng:** \`Giá chênh lệch - Phí công ty thu (25%)\`.
3. **Trừ Chiết khấu/Giảm giá:** Số tiền giảm giá cho khách (nếu CTV/Sale tự trích hoa hồng giảm cho khách).
4. **TỔNG HOA HỒNG THỰC NHẬN:** \`Hoa hồng định mức + Chênh lệch được hưởng - Giảm giá khách\`.`,
    author: 'Phòng Kế Toán',
    updated_at: '2026-09-09T00:00:00Z',
  },
  {
    id: 'doc-tour-contract-drive',
    slug: 'tour-contract-google-drive',
    title: 'Hướng dẫn Tạo, In Hợp Đồng Du Lịch & Lưu Vào Google Drive',
    category: 'sale',
    order_index: 4,
    target_roles: ['sale', 'sale_leader', 'operator', 'accounting', 'admin', 'bod'],
    badge: 'Hợp Đồng & Drive',
    summary: 'Quy trình tạo mẫu hợp đồng du lịch 12 điều khoản pháp lý, tùy biến trực tiếp, in chuẩn A4 đứng và cơ chế tự động lưu file vào Google Drive thư mục booking.',
    content: `## 1. Tổng quan Hợp Đồng Du Lịch Online Chuẩn Hệ Thống

Mẫu hợp đồng dịch vụ du lịch online trên hệ thống được xây dựng hoàn toàn dựa trên văn bản pháp lý tiêu chuẩn của **CÔNG TY DU LỊCH [TÊN CÔNG TY]**, phục vụ cho việc ký kết với khách hàng lẻ và đoàn theo từng Booking Tour.

### Các đặc điểm cốt lõi:
- **Chuẩn pháp lý 12 Điều khoản:** Quy định rõ ràng quyền & nghĩa vụ hai bên, quy định thị thực visa, điều kiện hoàn/hủy chi tiết (phí rớt visa mặc định 5.000.000 đ, các mốc phạt 30% - 50% - 85% - 100%), bảo hiểm du lịch nước ngoài tối đa lên đến 1.200.000.000 đồng/khách/vụ.
- **Tự động trích xuất dữ liệu booking:** Tên tour, tuyến điểm, thời gian đi/về, chuyến bay, danh sách hành khách đoàn (họ tên, số hộ chiếu/CCCD, ngày sinh), bảng phân tích giá trị hợp đồng (người lớn, trẻ em, phụ thu phòng đơn, giảm giá).
- **Đọc số tiền thành chữ Tiếng Việt tài chính:** Tự động chuyển đổi tổng giá trị hợp đồng thành chuỗi chữ tiếng Việt chuẩn xác (ví dụ: *Bốn mươi lăm triệu bảy trăm chín mươi nghìn đồng chẵn*).
- **Mã VietQR Napas 24/7 thông minh:** Tự động tạo mã QR động dẫn thẳng về tài khoản ngân hàng của công ty kèm số tiền và nội dung chuyển khoản theo mã booking.
- **Linh hoạt 2 đợt hoặc 3 đợt thanh toán:** Cho phép chuyển đổi dễ dàng giữa tiến độ thanh toán 2 đợt hoặc 3 đợt (kèm thời hạn cụ thể từng đợt).

---

## 2. Chuẩn Khổ In A4 Đứng (Vertical / Portrait) & Tùy Biến Trực Tiếp

### Thiết kế tối ưu cho in ấn văn bản hành chính:
- **Khổ giấy:** Chuẩn A4 đứng (\`size: A4 portrait; margin: 15mm 12mm 15mm 15mm;\`).
- **Phông chữ & cỡ chữ:** Font Times New Roman thanh lịch; Tiêu đề 15pt in hoa đậm; Quốc hiệu 12pt đậm; Các điều khoản 11.5pt đậm; Nội dung 11pt giãn dòng 1.45; Bảng biểu 10pt.
- **Cơ chế chống ngắt trang dở dang (\`.avoid-break\`):** Mỗi điều khoản, bảng số liệu và khối chữ ký hai bên được bao bọc bởi quy tắc chống rách trang giữa chừng, đảm bảo văn bản in ra liền mạch, đẹp mắt.

### Bảng cài đặt tùy biến (Drawer):
- Bấm nút **"Tùy biến HĐ"** trên thanh tiêu đề Modal để mở Drawer chỉnh sửa:
  - **Tab Thanh toán:** Chọn 2 đợt hoặc 3 đợt, ngày hạn từng đợt, số tiền từng đợt (hỗ trợ phân tách hàng nghìn bằng dấu chấm rõ ràng).
  - **Tab Bên A (Công ty Du lịch):** Cho phép sửa thông tin người đại diện, chức vụ, số giấy ủy quyền, tài khoản ngân hàng, mức bảo hiểm, phí rớt visa.
  - **Tab Bên B (Khách hàng):** Chỉnh sửa người đại diện ký, số CCCD/Hộ chiếu, địa chỉ, số điện thoại.
  - **Tab Tùy chọn:** Bật/tắt in Phụ lục chương trình tour chi tiết & hướng dẫn hồ sơ visa.
  - **Tab Điều khoản:** Bổ sung các cam kết đặc thù theo từng đoàn khách.
- **Nút Lưu mẫu:** Lưu cấu hình Bên A vào máy để tái sử dụng cho các lần sau.
- **Nút Khôi phục mặc định:** Trả lại mẫu nguyên bản chuẩn hệ thống chỉ với 1 click.

---

## 3. Cơ Chế Tự Động Lưu File Hợp Đồng Vào Google Drive

Hệ thống tích hợp cơ chế đồng bộ và lưu trữ tệp hợp đồng trực tiếp lên Google Drive của công ty, hoàn toàn tự động và an toàn.

### Vị trí lưu trữ trong Google Drive:
File hợp đồng sẽ được lưu đúng vào thư mục đơn hàng của booking:

\`Google Drive > Tour CRM > Tour > [Mã Tour] > Đơn hàng > [Mã Đơn Hàng]\`

### Quy chuẩn đặt tên file:
Hệ thống tự động chuẩn hóa tiếng Việt sạch không dấu theo công thức:

\`HopDong_[MaTour]_[TenKhach]_[MaDon].pdf\`

> 📌 **Ví dụ:** Booking mã \`4C90F1D6\`, tour Úc \`OBAU040726\`, khách Nguyễn Minh Trúc Tiên sẽ có tên file là:  
> \`HopDong_OBAU040726_NguyenMinhTrucTien_DH-4C90F1D6.pdf\`

### Các hình thức lưu trữ & xuất file linh hoạt:
1. **Tự động lưu PDF khi in:** Ngay khi bấm **"In Hợp đồng / PDF"**, hệ thống tự động xuất hợp đồng thành tệp PDF chuẩn khổ A4 đứng và tải lên Google Drive ngầm, trong khi hộp thoại in của trình duyệt vẫn mở bình thường mà không phải chờ đợi.
2. **Nút chủ động "Lưu Google Drive":** Nằm ngay trên thanh công cụ Modal, cho phép nhân viên lưu file PDF lên Drive bất kỳ lúc nào mà không cần bấm lệnh in.
3. **Nút "Tải PDF":** Cho phép tải ngay tệp PDF hợp đồng chuẩn A4 về máy tính cá nhân để gửi qua Zalo, Email hoặc lưu trữ offline.

### Gắn liên kết xem file trực tiếp vào đơn hàng:
- Ngay sau khi lưu thành công, đường dẫn xem trực tiếp (\`contract_url\`) được tự động cập nhật vào cơ sở dữ liệu của đơn hàng:
  - Trên Modal xuất hiện nút **"Xem trên Drive"** để mở xem file PDF ngay trên trình duyệt qua trình đọc PDF của Google Drive.
  - Trên danh sách đơn hàng (\`/orders\`) xuất hiện huy hiệu **"Đã tải hợp đồng"** kèm nút **"Xem file"** cho toàn bộ nhân viên liên quan tra cứu thuận tiện.

---

## 4. Hướng dẫn thao tác nhanh cho Nhân viên Sale & Điều hành

1. Truy cập trang **Quản lý Đơn hàng** (\`/orders\`) hoặc mở chi tiết booking cần in hợp đồng.
2. Tại khối Hợp đồng dịch vụ hoặc danh sách thao tác nhanh, bấm **"In HĐ Online"**.
3. Xem trước hợp đồng trên giao diện chuẩn A4. Nếu cần điều chỉnh đợt thanh toán hoặc thông tin đại diện, bấm **"Tùy biến HĐ"**.
4. Bấm **"In Hợp đồng / PDF"** để in ra giấy/xuất PDF cho khách ký, hoặc bấm **"Tải PDF"** để lưu về máy, hoặc bấm **"Lưu Google Drive"** để lưu trữ lên hệ thống đám mây.
5. Sau vài giây, kiểm tra huy hiệu **"Đã tải hợp đồng"** trên đơn hàng để xác nhận file PDF đã được lưu thành công vào đúng thư mục booking trên Google Drive.`,
    author: 'Phòng Kinh Doanh & CNTT',
    updated_at: '2026-10-22T00:00:00Z',
  },
  {
    id: 'doc-tour-management',
    slug: 'tour-management',
    title: 'Quy trình Khai báo Tour mới & Quản lý Overbooking (+OB)',
    category: 'operator',
    order_index: 1,
    target_roles: ['operator', 'admin', 'sale_leader', 'bod'],
    badge: 'Điều hành',
    summary: 'Hướng dẫn điều phối chỗ, hạn mức vé máy bay, visa deadline và cấu hình giới hạn bán vượt overbook.',
    content: `## 1. Khai báo Tour mới (Dành cho Operator & Admin)

Nút **"+ Thêm Tour Mới"** nằm tại góc trên bên phải thanh tiêu đề *Danh sách điều phối chỗ & Lịch trình*.

### Các trường dữ liệu bắt buộc:
- **Tên tour & Tuyến:** Ghi rõ hành trình (Ví dụ: \`Hà Nội - Bangkok - Pattaya 5N4Đ\`).
- **Mã Tour:** Mã duy nhất chuẩn hóa (Ví dụ: \`BK-2604-VJ\`).
- **Ngày khởi hành & Ngày về:** Ngày giờ chính xác của chuyến bay.
- **Hãng hàng không:** Vietnam Airlines, Vietjet Air, Thai Airways, AirAsia,...
- **Số chỗ mở bán tiêu chuẩn (\`total_seats\`):** Số vé đã đặt cọc với hãng bay (series chỗ).
- **Hạn mức Overbooking (\`overbook_limit\`):** Số lượng chỗ cho phép bán vượt mức nếu hãng còn mở bán thêm.
- **Hạn xuất vé (Ticket deadline) & Hạn visa (Visa deadline):** Mốc thời gian hệ thống cảnh báo trước khi hủy đoàn.

---

## 2. Cơ chế Cho Phép Giữ/Bán & Overbooking (+OB)

\`Tổng số chỗ cho phép bán = Số chỗ mở bán tiêu chuẩn + Hạn mức Overbooking\`

- Khi số vé bán đạt đến \`total_seats\`, hệ thống sẽ tự động kích hoạt quota Overbooking.
- Việc áp dụng Overbooking giúp tối đa hóa doanh thu đoàn mà vẫn được kiểm soát an toàn trong giới hạn Operator đã duyệt trước.

---

## 3. Tạo nhanh Danh mục sản phẩm ngay trong Form Tour

Ngay tại hộp chọn Danh mục trong form Tạo Tour, Operator có thể bấm **"+ Thêm danh mục mới"** để tạo ngay tuyến mới mà không cần phải rời sang tab Cài đặt. Danh mục mới tạo sẽ tự động được chọn và đồng bộ ra bộ lọc ngoài trang chủ.`,
    author: 'Phòng Điều Hành',
    updated_at: '2026-09-09T00:00:00Z',
  },
  {
    id: 'doc-tour-media-drive',
    slug: 'tour-media-drive',
    title: 'Quản lý Thư mục Ảnh Khách Đoàn & Google Drive của HDV',
    category: 'operator',
    order_index: 2,
    target_roles: ['operator', 'tour_guide', 'admin', 'sale', 'bod'],
    badge: 'Tài nguyên đoàn',
    summary: 'Quy trình lưu trữ ảnh tour của Hướng Dẫn Viên lên Google Drive và bảo mật dữ liệu.',
    content: `## 1. Mục đích của trang "Ảnh khách đoàn"

Sau mỗi hành trình, việc gửi ảnh kỷ niệm cho khách hàng là điểm chạm quan trọng nâng cao trải nghiệm thương hiệu của công ty.

- Truy cập trang **"Ảnh khách đoàn"** (\`/tour-media\`) từ menu chính.
- Trang này tự động hiển thị danh sách toàn bộ các đoàn tour đã và đang khởi hành.
- Mỗi đoàn tour có một nút duy nhất: **"📂 Mở Thư Mục Google Drive"**.

---

## 2. Cấu trúc thư mục Google Drive chuẩn hóa

Hệ thống tự động điều hướng trực tiếp đến đường dẫn:

\`Google Drive > Tour CRM > Tour > {MÃ_TOUR} > Ảnh đoàn\`

### Phân quyền thao tác:
- **Điều hành (\`operator\`), HDV (\`tour_guide\`) và Admin:** Được phép bấm nút **"📸 Upload Ảnh Đoàn"** và tạo **"🔗 Link HDV Freelance"** để gửi cho cộng tác viên HDV bên ngoài tự tải ảnh lên mà không cần cấp quyền vào toàn hệ thống CRM.
- **Sale, Kế toán, Visa, BOD:** Được mở thư mục Drive để lấy ảnh đẹp gửi chăm sóc khách hàng hoặc làm tư liệu truyền thông.
- **Cộng Tác Viên (CTV):** Bị ẩn trang này để bảo mật thông tin nội bộ của đoàn.`,
    author: 'Phòng Điều Hành',
    updated_at: '2026-09-09T00:00:00Z',
  },
  {
    id: 'doc-payment-proposals',
    slug: 'payment-proposals',
    title: 'Quy trình Lập & Duyệt Đề nghị thanh toán (DNTT)',
    category: 'accounting',
    order_index: 1,
    target_roles: ['accounting', 'operator', 'sale', 'sale_leader', 'tour_guide', 'admin', 'bod'],
    badge: 'Kế toán',
    summary: 'Cách tạo phiếu đề xuất chi tiền cho nhà cung cấp, đặt cọc vé máy bay, land tour và quy trình phê duyệt.',
    content: `## 1. Khi nào cần tạo Đề nghị thanh toán?

Đề nghị thanh toán (DNTT) được lập khi phát sinh các nhu cầu chi tiền của công ty:
- Đặt cọc vé máy bay series / vé lẻ cho đoàn.
- Tạm ứng chi phí Land tour cho đối tác nước ngoài.
- Thanh toán tiền phòng khách sạn, nhà hàng, xe vận chuyển.
- Chi phí bảo hiểm, visa hoặc các chi phí hoàn tiền cho khách hủy tour.

---

## 2. Các bước lập Đề nghị thanh toán

1. Vào mục **Hành chính nhân sự > Đề nghị thanh toán** (\`/payment-proposals\`).
2. Bấm nút **"+ Tạo Đề Nghị Thanh Toán"**.
3. Chọn đoàn Tour liên quan (nếu là chi phí theo đoàn) hoặc chọn Chi phí chung.
4. Nhập đầy đủ: **Số tiền đề xuất**, **Nội dung thanh toán**, **Tên người thụ hưởng**, **Số tài khoản ngân hàng** và **Tên ngân hàng**.
5. Đính kèm hóa đơn, hợp đồng hoặc ảnh chụp ủy nhiệm chi đối soát.

---

## 3. Luồng phê duyệt Đề nghị thanh toán

- **Trạng thái Chờ duyệt (Pending):** Đơn mới tạo được gửi thông báo đến bộ phận Kế toán và Ban Giám Đốc.
- **Trạng thái Đã duyệt (Approved):** Kế toán trưởng hoặc BOD xác nhận chi, tiến hành chuyển khoản theo số tài khoản đính kèm.
- **Trạng thái Đã thanh toán (Paid):** Kế toán tải lên biên lai ủy nhiệm chi hoàn tất và hạch toán vào sổ quỹ.`,
    author: 'Phòng Kế Toán',
    updated_at: '2026-09-09T00:00:00Z',
  },
  {
    id: 'doc-leave-balance-policy',
    slug: 'leave-balance-policy',
    title: 'Quy chế Quỹ phép năm Lũy tiến động & Duyệt nghỉ phép 2 cấp',
    category: 'hr',
    order_index: 1,
    target_roles: ['all'],
    badge: 'Chính sách HR',
    summary: 'Công thức tích lũy phép năm 1 ngày/tháng, cách tính số ngày còn lại và quy trình phê duyệt 2 cấp chuẩn hóa.',
    content: `## 1. Cơ chế Tích lũy Quỹ phép năm Động (1 Ngày / Tháng)

Nhằm đảm bảo tính công bằng và chính xác theo Luật Lao động, hệ thống Tour CRM áp dụng cơ chế tính quỹ phép lũy tiến theo từng tháng làm việc:

\`Số ngày phép năm khả dụng = Số tháng đã làm việc trong năm hiện tại (Mỗi tháng +1 ngày)\`

- **Ví dụ thực tế:** Hiện tại đang là **Tháng 4**, số ngày phép mặc định mà nhân viên được hưởng là **4 ngày** (thay vì cấp trọn 12 ngày ngay từ đầu năm). Đến Tháng 5 sẽ tự động tăng lên 5 ngày.
- **Năm quá khứ:** Tự động cố định 12 ngày/năm.
- **Năm tương lai:** 0 ngày (tích lũy dần khi năm đó bắt đầu).
- **Ưu tiên điều chỉnh của HR:** Bất kỳ điều chỉnh đặc cách nào của bộ phận Nhân sự trong mục Quản lý quỹ phép sẽ luôn được ưu tiên áp dụng tuyệt đối.

---

## 2. Quy trình Phê duyệt Đơn nghỉ phép 2 Cấp

Để đơn nghỉ phép được tính là hợp lệ và tự động trừ vào quỹ phép:

### Cấp 1 - Quản lý trực tiếp (Direct Manager)
- Các vai trò duyệt: **Sale Leader**, **Marketing Leader**, **Nhân sự (HR)**, **Admin**, **Ban Giám Đốc (BOD)**.
- *Lưu ý:* Vai trò Điều hành (\`operator\`) không có quyền duyệt phép cấp 1.

### Cấp 2 - Duyệt Cấp Cuối & Trừ Phép (Final Approval)
- Chỉ duy nhất 3 vai trò: **Nhân sự (\`hr\`)**, **Ban Giám Đốc (\`bod\`)** và **Quản trị viên (\`admin\`)** mới có quyền phê duyệt cấp cuối.
- Sau khi được phê duyệt cấp 2, hệ thống mới chính thức trừ số ngày nghỉ vào số dư phép năm của nhân viên.`,
    author: 'Phòng Nhân Sự',
    updated_at: '2026-09-09T00:00:00Z',
  },
  {
    id: 'doc-faq-booking',
    slug: 'faq-booking-issues',
    title: 'Hỏi đáp: Xử lý sự cố giữ chỗ & Hủy đơn hàng',
    category: 'faq',
    order_index: 1,
    target_roles: ['all'],
    badge: 'FAQ',
    summary: 'Giải đáp các tình huống thường gặp khi bị quá hạn giữ chỗ, đổi thông tin khách và hoàn cọc.',
    content: `## 1. Làm gì khi đơn giữ chỗ bị hết hạn (Expired)?

- Khi hết thời gian Hold do Điều hành quy định mà đơn chưa được chuyển sang trạng thái Đã cọc (Deposit) hoặc Đã thanh toán (Paid), hệ thống sẽ chuyển trạng thái đơn sang **Hết hạn giữ chỗ** và nhả ghế lại cho thị trường.
- **Khắc phục:** Nếu khách hàng vẫn muốn mua, tư vấn viên liên hệ trực tiếp với Điều hành Tour hoặc Sale Leader để xin gia hạn thêm hoặc tạo lại đơn mới nếu tour còn chỗ.

---

## 2. Tôi muốn sửa thông tin khách hoặc đổi số phòng đơn nhưng đơn đã bị khóa?

- Khi đơn hàng đã được Điều hành chốt danh sách hoặc hết hạn cho phép tự sửa, nút chỉnh sửa sẽ bị khóa (\`🔒\`).
- **Cách xử lý:** 
  - Nếu bạn thuộc team kinh doanh, hãy nhờ **Sale Leader** của team mình bấm nút **"Mở khóa booking"** ngay tại danh sách đơn hàng.
  - Sau khi Leader mở khóa, bạn có thể chỉnh sửa lại thông tin hành khách, ngày sinh, hộ chiếu hoặc ghi chú phòng đơn.

---

## 3. Quy định về Hủy booking & Hoàn tiền

- Khi phát sinh yêu cầu hủy booking, tư vấn viên bắt buộc phải tải lên **Ảnh minh chứng xác nhận hủy** của khách hàng và nhập **Lý do hủy rõ ràng**.
- Số tiền hoàn trả (nếu có) không được vượt quá số tiền khách đã thực thanh toán. Hệ thống sẽ tự động tạo một phiếu chi hoàn tiền trong sổ quỹ kế toán để chuyển khoản trả lại cho khách hàng.`,
    author: 'Ban Quản Trị',
    updated_at: '2026-09-09T00:00:00Z',
  },
];
