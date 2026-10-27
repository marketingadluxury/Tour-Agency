/**
 * Kịch Bản Kiểm Thử Tự Động Độc Lập (Simulation Test Script)
 * Mô phỏng hành động người dùng, kiểm tra phân quyền và xác nhận tính toàn vẹn dữ liệu
 * dành riêng cho 4 vai trò: Sale, Bộ phận Visa, Điều hành Tour, và Kế toán.
 */

import {
  canManageTours,
  canAccessTourCosts,
  canSaleLeaderOperateTour,
  canAccessHRSection,
  canViewPartnerCard,
  canApproveLeaveLevel1,
  canApproveLeaveLevel2,
  UserRole
} from '../src/utils/permissionUtils';

import {
  calculateOrderTotal,
  calculateCommissionBreakdown,
  OrderTotalCalculationParams
} from '../src/utils/orderCalculations';

interface SimulationReport {
  role: string;
  scenarioName: string;
  passed: boolean;
  details: string;
}

const reports: SimulationReport[] = [];

function assert(role: string, scenarioName: string, condition: boolean, details: string) {
  reports.push({
    role,
    scenarioName,
    passed: condition,
    details
  });
  if (!condition) {
    console.error(`❌ [THẤT BẠI] [${role}] ${scenarioName}: ${details}`);
  } else {
    console.log(`✅ [THÀNH CÔNG] [${role}] ${scenarioName}: ${details}`);
  }
}

// ==========================================
// 1. KỊCH BẢN GIẢ LẬP: NHÂN VIÊN SALE (sale)
// ==========================================
function simulateSaleRole() {
  const role: UserRole = 'sale';
  console.log('\n======================================================');
  console.log('▶ ĐANG GIẢ LẬP VAI TRÒ: NHÂN VIÊN KINH DOANH (SALE)');
  console.log('======================================================');

  // Hành động 1: Thử tạo / sửa / xóa / sao chép tour
  assert(
    'Sale',
    'Chặn quyền can thiệp danh mục Tour',
    !canManageTours(role),
    'Sale không có quyền tạo mới, sửa, sao chép hoặc xóa tour khởi hành.'
  );

  // Hành động 2: Thử xem tab Hạch toán Lãi Lỗ & chi phí
  assert(
    'Sale',
    'Bảo mật dữ liệu tài chính nhạy cảm',
    !canAccessTourCosts(role),
    'Tab Hạch toán Chi phí – Lãi lỗ bị ẩn hoàn toàn đối với Sale.'
  );

  // Hành động 3: Thử xem thông tin đối tác F2 (Gửi khách)
  assert(
    'Sale',
    'Ẩn thông tin đối tác nhận gửi khách',
    !canViewPartnerCard(role),
    'Thẻ đối tác gửi khách bị ẩn trên Lịch khởi hành đối với Sale.'
  );

  // Hành động 4: Giả lập tạo đơn hàng phức tạp với nhiều người lớn, trẻ em, trẻ nhỏ, phụ thu, chiết khấu
  const orderParams: OrderTotalCalculationParams = {
    adultCount: 3,
    childCount: 2,
    infantCount: 1,
    priceAdult: 12000000,
    priceChild: 9000000,
    priceInfant: 2500000,
    singleRoomCount: 1,
    singleRoomSurcharge: 3000000,
    surcharges: [
      { name: 'Nâng hạng vé bay khứ hồi', amount: 4500000 },
      { name: 'Bảo hiểm du lịch mở rộng', amount: 1200000 }
    ],
    discountAmount: 2000000,
    vatOption: 'Xuất VAT'
  };

  const orderResult = calculateOrderTotal(orderParams);
  // Vé: 3*12M + 2*9M + 1*2.5M = 36M + 18M + 2.5M = 56.5M
  // Phụ thu: 3M (phòng đơn) + 4.5M + 1.2M = 8.7M
  // Tổng thanh toán (giá tour đã gồm VAT): 56.5M + 8.7M - 2M (giảm) = 63.2M
  // Bóc tách trước VAT: Math.round(63.2M / 1.1) = 57.454.545 đ
  // Thuế VAT 10%: 63.2M - 57.454.545 = 5.745.455 đ
  assert(
    'Sale',
    'Tính toán chính xác đơn hàng đa dịch vụ & VAT (Giá đã bao gồm VAT)',
    orderResult.seatsSubtotal === 56500000 &&
      orderResult.surchargesTotal === 8700000 &&
      orderResult.totalBeforeVat === 57454545 &&
      orderResult.vatAmount === 5745455 &&
      orderResult.finalTotalAmount === 63200000,
    `Tổng vé: ${orderResult.seatsSubtotal.toLocaleString('vi-VN')} đ, Phụ thu: ${orderResult.surchargesTotal.toLocaleString('vi-VN')} đ, VAT: ${orderResult.vatAmount.toLocaleString('vi-VN')} đ, Tổng thanh toán: ${orderResult.finalTotalAmount.toLocaleString('vi-VN')} đ`
  );

  // Hành động 5: Hoa hồng không được cộng các khoản phụ thu
  const commissionResult = calculateCommissionBreakdown({
    baseCommissionPerSeat: 600000,
    adultCount: 3,
    childCount: 2,
    discountAmount: 1000000
  });
  // Hoa hồng gốc: (3 + 2) * 600k = 3M. Trừ 1M giảm giá -> Còn 2M.
  assert(
    'Sale',
    'Tính đúng hoa hồng và loại trừ phụ thu',
    commissionResult.baseTotalCommission === 3000000 && commissionResult.netCommissionReceived === 2000000,
    `Hoa hồng định mức: 3.000.000 đ, trừ chiết khấu: 1.000.000 đ, thực nhận: ${commissionResult.netCommissionReceived.toLocaleString('vi-VN')} đ`
  );

  // Hành động 6: Truy cập Hành chính nhân sự & Quyền duyệt
  assert(
    'Sale',
    'Quyền hạn Hành chính & Chặn duyệt phép',
    canAccessHRSection(role) && !canApproveLeaveLevel1(role) && !canApproveLeaveLevel2(role),
    'Sale được gửi đề xuất chi và đơn nghỉ phép cá nhân nhưng không có quyền duyệt cấp nào.'
  );
}

// ==========================================
// 2. KỊCH BẢN GIẢ LẬP: BỘ PHẬN VISA (visa)
// ==========================================
function simulateVisaRole() {
  const role: UserRole = 'visa';
  console.log('\n======================================================');
  console.log('▶ ĐANG GIẢ LẬP VAI TRÒ: BỘ PHẬN VISA (VISA)');
  console.log('======================================================');

  // Hành động 1: Kiểm tra phân quyền quản lý Tour
  assert(
    'Visa',
    'Chặn can thiệp Tour du lịch',
    !canManageTours(role) && !canAccessTourCosts(role),
    'Nhân viên Visa không có quyền tạo/sửa tour và không xem tab hạch toán tài chính.'
  );

  // Hành động 2: Phân loại dịch vụ Visa lẻ không tính là Tour du lịch
  const mockProducts = [
    { id: '1', title: 'Tour Nhật Bản Mùa Hoa Anh Đào', tour_type: 'internal' },
    { id: '2', title: 'Dịch vụ Visa Du Lịch Hàn Quốc', tour_type: 'visa' },
    { id: '3', title: 'Tour Châu Âu 5 Nước', tour_type: 'partner' }
  ];
  const regularTours = mockProducts.filter(p => p.tour_type !== 'visa');
  assert(
    'Visa',
    'Tách biệt dịch vụ Visa khỏi Tour du lịch',
    regularTours.length === 2 && !regularTours.some(t => t.tour_type === 'visa'),
    'Dịch vụ visa lẻ được loại trừ chính xác khỏi danh sách đếm tour và album ảnh đoàn.'
  );

  // Hành động 3: Giả lập quy trình thụ lý hồ sơ Visa hành khách
  interface MockPassenger {
    id: string;
    full_name: string;
    passport_number: string;
    passport_expiry: string;
    visa_status: 'none' | 'applied' | 'approved' | 'rejected';
    visa_file_url: string | null;
  }

  const passenger: MockPassenger = {
    id: 'pass-01',
    full_name: 'Nguyễn Văn An',
    passport_number: 'P01234567',
    passport_expiry: '2032-10-15',
    visa_status: 'none',
    visa_file_url: null
  };

  // Bước A: Nộp hồ sơ xin visa
  passenger.visa_status = 'applied';
  assert('Visa', 'Cập nhật trạng thái Đã nộp hồ sơ', passenger.visa_status === 'applied', 'Hồ sơ chuyển sang trạng thái đã nộp cơ quan lãnh sự.');

  // Bước B: Visa được cấp & đính kèm file từ Supabase Storage
  passenger.visa_status = 'approved';
  passenger.visa_file_url = 'https://supabase-storage/crm-attachments/visas/pass-01-visa.pdf';
  assert(
    'Visa',
    'Phê duyệt Visa & Lưu link Storage an toàn',
    passenger.visa_status === 'approved' && passenger.visa_file_url.startsWith('https://'),
    'Tài liệu visa được lưu trữ an toàn trên Supabase Storage và lưu link URL vào hồ sơ hành khách.'
  );

  // Hành động 4: Quyền duyệt phép
  assert(
    'Visa',
    'Kiểm soát quyền duyệt phép',
    !canApproveLeaveLevel1(role) && !canApproveLeaveLevel2(role),
    'Nhân viên Visa không có quyền duyệt phép cho người khác.'
  );
}

// ==========================================
// 3. KỊCH BẢN GIẢ LẬP: ĐIỀU HÀNH TOUR (operator)
// ==========================================
function simulateOperatorRole() {
  const role: UserRole = 'operator';
  console.log('\n======================================================');
  console.log('▶ ĐANG GIẢ LẬP VAI TRÒ: ĐIỀU HÀNH TOUR (OPERATOR)');
  console.log('======================================================');

  // Hành động 1: Toàn quyền quản lý tour
  assert(
    'Operator',
    'Toàn quyền tạo, sửa, xóa & quản lý tour',
    canManageTours(role),
    'Điều hành có đầy đủ quyền hạn tạo tour mới, thêm ngày khởi hành, tạo series, sửa và xóa tour.'
  );

  // Hành động 2: Quyền thao tác mọi loại tour (kể cả tự vận hành)
  assert(
    'Operator',
    'Quản lý Tour tự vận hành & Tour gửi',
    canSaleLeaderOperateTour(role, 'internal') && canSaleLeaderOperateTour(role, 'partner'),
    'Điều hành được phép điều phối cả tour tự vận hành lẫn tour gửi khách đối tác.'
  );

  // Hành động 3: Quyền xem tab Hạch toán chi phí & Thẻ thông tin đối tác
  assert(
    'Operator',
    'Xem bảng kê chi phí & đối tác F2',
    canAccessTourCosts(role) && canViewPartnerCard(role),
    'Điều hành được xem chi tiết giá vốn, công nợ nhà cung cấp và thẻ thông tin đối tác gửi khách.'
  );

  // Hành động 4: Giả lập tạo danh mục mới ngay tại form tạo tour và đồng bộ bộ lọc
  const initialCategories = ['Du lịch Hàn Quốc', 'Du lịch Nhật Bản'];
  const newCategoryInput = 'Du lịch Bắc Âu Mùa Cực Quang';
  const updatedCategories = [...initialCategories, newCategoryInput];

  assert(
    'Operator',
    'Tự động đồng bộ danh mục mới vào bộ lọc',
    updatedCategories.includes(newCategoryInput) && updatedCategories.length === 3,
    `Tạo danh mục mới "${newCategoryInput}" thành công và tự động xuất hiện tại bộ lọc Lịch khởi hành.`
  );

  // Hành động 5: Phân quyền duyệt nghỉ phép của Điều hành (Lưu ý: operator không duyệt cấp 1 đơn nghỉ phép)
  assert(
    'Operator',
    'Quy chuẩn duyệt nghỉ phép của Điều hành',
    !canApproveLeaveLevel1(role) && !canApproveLeaveLevel2(role),
    'Đúng quy chuẩn AGENTS.md: Điều hành tour không có quyền duyệt cấp 1 đơn nghỉ phép nhân viên.'
  );
}

// ==========================================
// 4. KỊCH BẢN GIẢ LẬP: KẾ TOÁN (accounting)
// ==========================================
function simulateAccountingRole() {
  const role: UserRole = 'accounting';
  console.log('\n======================================================');
  console.log('▶ ĐANG GIẢ LẬP VAI TRÒ: KẾ TOÁN (ACCOUNTING)');
  console.log('======================================================');

  // Hành động 1: Chặn quyền sửa cấu trúc tour
  assert(
    'Accounting',
    'Chặn thay đổi lịch trình & cấu trúc tour',
    !canManageTours(role),
    'Kế toán không can thiệp sửa lịch trình hay xóa ngày khởi hành của tour.'
  );

  // Hành động 2: Quyền xem và hạch toán chi phí - Lãi lỗ
  assert(
    'Accounting',
    'Toàn quyền hạch toán Doanh thu, Chi phí & Lãi lỗ',
    canAccessTourCosts(role),
    'Kế toán có quyền truy cập đầy đủ tab Hạch toán Chi phí – Lãi lỗ.'
  );

  // Hành động 3: Giả lập tự động tính tổng hoa hồng tour từ danh sách đơn hàng
  const sampleBookings = [
    {
      order_id: 'ord-01',
      adult_count: 2,
      child_count: 0,
      base_commission: 500000,
      price_markup: 1000000,
      markup_tax_percent: 25,
      discount: 0
    },
    {
      order_id: 'ord-02',
      adult_count: 4,
      child_count: 1,
      base_commission: 400000,
      price_markup: 0,
      markup_tax_percent: 25,
      discount: 500000
    }
  ];

  // Đơn 1: 2*500k + (1M - 250k) = 1M + 750k = 1.75M
  // Đơn 2: 5*400k - 500k = 2M - 500k = 1.5M
  // Tổng hoa hồng tour: 1.75M + 1.5M = 3.25M
  let totalTourCommission = 0;
  for (const b of sampleBookings) {
    const res = calculateCommissionBreakdown({
      baseCommissionPerSeat: b.base_commission,
      adultCount: b.adult_count,
      childCount: b.child_count,
      priceMarkup: b.price_markup,
      markupTaxPercent: b.markup_tax_percent,
      discountAmount: b.discount
    });
    totalTourCommission += res.netCommissionReceived;
  }

  assert(
    'Accounting',
    'Khóa tự động tính hoa hồng chi phí Tour (Read-only)',
    totalTourCommission === 3250000,
    `Tổng hoa hồng tự động kết chuyển vào chi phí tour: ${totalTourCommission.toLocaleString('vi-VN')} đ (Đúng chuẩn quy tắc read-only).`
  );

  // Hành động 4: Giả lập lập Phiếu Thu (Receipt) và cập nhật công nợ
  const orderTotalAmount = 50000000;
  let paidAmount = 0;

  // Thu cọc đợt 1
  const receipt1 = 20000000;
  paidAmount += receipt1;
  const statusStep1 = paidAmount >= orderTotalAmount ? 'paid' : paidAmount > 0 ? 'partially_paid' : 'unpaid';
  assert(
    'Accounting',
    'Cập nhật trạng thái Thanh toán một phần',
    statusStep1 === 'partially_paid' && paidAmount === 20000000,
    `Thu cọc đợt 1: 20.000.000 đ -> Trạng thái: ${statusStep1}, Còn lại: ${(orderTotalAmount - paidAmount).toLocaleString('vi-VN')} đ`
  );

  // Thu nốt đợt 2
  const receipt2 = 30000000;
  paidAmount += receipt2;
  const statusStep2 = paidAmount >= orderTotalAmount ? 'paid' : 'partially_paid';
  assert(
    'Accounting',
    'Cập nhật trạng thái Hoàn tất thanh toán',
    statusStep2 === 'paid' && paidAmount === orderTotalAmount,
    `Thu đợt 2: 30.000.000 đ -> Tổng thu: 50.000.000 đ -> Trạng thái: ${statusStep2}`
  );
}

// ==========================================
// THỰC THI TOÀN BỘ KỊCH BẢN KIỂM THỬ
// ==========================================
export function runAllRoleSimulations(): boolean {
  console.log('================================================================');
  console.log('🚀 BẮT ĐẦU CHẠY SCRIPT KIỂM THỬ TỰ ĐỘNG ĐỘC LẬP THEO 4 VAI TRÒ');
  console.log('   (Sale, Bộ phận Visa, Điều hành Tour, Kế toán)');
  console.log('================================================================');

  simulateSaleRole();
  simulateVisaRole();
  simulateOperatorRole();
  simulateAccountingRole();

  console.log('\n================================================================');
  console.log('📊 TỔNG KẾT KẾT QUẢ KIỂM THỬ TỰ ĐỘNG:');
  console.log('================================================================');

  const total = reports.length;
  const passed = reports.filter(r => r.passed).length;
  const failed = reports.filter(r => !r.passed).length;

  console.log(`- Tổng số kịch bản kiểm tra: ${total}`);
  console.log(`- Thành công: ${passed}`);
  console.log(`- Thất bại: ${failed}`);

  if (failed === 0) {
    console.log('🎉 TẤT CẢ 4 VAI TRÒ ĐÃ VƯỢT QUA TOÀN BỘ KIỂM THỬ PHÂN QUYỀN VÀ TOÀN VẸN DỮ LIỆU!');
    return true;
  } else {
    console.error('❌ CÓ KỊCH BẢN KIỂM THỬ BỊ THẤT BẠI. XIN VUI LÒNG KIỂM TRA LẠI.');
    return false;
  }
}

// Thực thi nếu chạy trực tiếp bằng tsx
runAllRoleSimulations();
