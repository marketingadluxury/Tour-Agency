/**
 * Bộ quy tắc phân quyền người dùng và vai trò theo chuẩn AGENTS.md
 */

export type UserRole =
  | 'admin'
  | 'sale'
  | 'sale_leader'
  | 'operator'
  | 'accounting'
  | 'visa'
  | 'visa_leader'
  | 'agent'
  | 'CTV'
  | 'bod'
  | 'tour_guide'
  | 'hr'
  | 'marketing'
  | 'marketing_leader'
  | string;

/**
 * Kiểm tra quyền quản lý tour (Thêm ngày khởi hành, Sửa, Xóa, Tạo hàng loạt)
 * Chỉ có admin, operator, và sale_leader mới có quyền quản lý tour.
 * Hướng dẫn viên (tour_guide), Sale, CTV, Kế toán, Visa KHÔNG có quyền.
 */
export function canManageTours(role?: string | null): boolean {
  if (!role) return false;
  return ['admin', 'operator', 'sale_leader'].includes(role);
}

/**
 * Kiểm tra quyền truy cập tab Hạch toán Chi phí - Lãi lỗ tour
 * Ẩn hoàn toàn với Hướng dẫn viên (tour_guide), CTV, Đại lý, Visa, Sale thường.
 */
export function canAccessTourCosts(role?: string | null): boolean {
  if (!role) return false;
  return ['admin', 'bod', 'operator', 'accounting', 'sale_leader'].includes(role);
}

/**
 * Kiểm tra quyền thao tác với Tour tự vận hành (internal)
 * Sale Leader KHÔNG có quyền sửa/xóa/xem chi phí của Tour tự vận hành.
 */
export function canSaleLeaderOperateTour(role: string | null | undefined, tourType?: string | null): boolean {
  if (role !== 'sale_leader') return true;
  if (!tourType || tourType === 'internal') return false;
  return true; // Được phép với partner (outsourced) hoặc private
}

/**
 * Kiểm tra quyền truy cập tab Hành chính nhân sự (Đề nghị thanh toán & Nghỉ phép)
 * Ẩn hoàn toàn đối với Đại lý & CTV (role === 'agent' hoặc 'CTV')
 */
export function canAccessHRSection(role?: string | null): boolean {
  if (!role) return false;
  return role !== 'agent' && role !== 'CTV';
}

/**
 * Kiểm tra quyền xem thẻ thông tin đối tác F2 (Gửi khách đối tác)
 * Chỉ hiển thị cho admin, operator, sale_leader, bod.
 */
export function canViewPartnerCard(role?: string | null): boolean {
  if (!role) return false;
  return ['admin', 'operator', 'sale_leader', 'bod'].includes(role);
}

/**
 * Kiểm tra quyền duyệt và quản lý phiếu thu / kế toán
 * Cho phép kế toán (accounting), quản trị viên (admin) và ban giám đốc (bod).
 */
export function canApproveReceipt(role?: string | null): boolean {
  if (!role) return false;
  return ['accounting', 'admin', 'bod'].includes(role);
}

/**
 * Phân quyền duyệt đơn nghỉ phép Cấp 1 (Quản lý trực tiếp)
 * Gồm: sale_leader, marketing_leader, hr, admin, bod.
 * (Lưu ý: operator và accounting KHÔNG có quyền duyệt cấp 1)
 */
export function canApproveLeaveLevel1(role?: string | null): boolean {
  if (!role) return false;
  return ['sale_leader', 'marketing_leader', 'visa_leader', 'hr', 'admin', 'bod'].includes(role);
}

/**
 * Phân quyền duyệt đơn nghỉ phép Cấp 2 (Duyệt cấp cuối & trừ phép)
 * Chỉ có: hr, bod, admin.
 */
export function canApproveLeaveLevel2(role?: string | null): boolean {
  if (!role) return false;
  return ['hr', 'bod', 'admin'].includes(role);
}

/**
 * Kiểm tra xem người dùng hiện tại có thẩm quyền duyệt Cấp 1 cho một đơn nghỉ phép cụ thể hay không:
 * - TUYỆT ĐỐI không cho phép tự duyệt đơn của chính mình (currentUserId === requestUserId -> false)
 * - Admin hoặc BOD có quyền duyệt Cấp 1 cho tất cả đơn của nhân viên/trưởng phòng khác
 * - Nếu người tạo có gán leader_id: Người duyệt phải có ID trùng với creator.leader_id
 * - Nếu người tạo chưa gán leader_id: Trưởng phòng cùng team_id có thể duyệt
 */
export function isUserAuthorizedToApproveLeaveL1(
  currentUserId: string,
  currentUserRole: string,
  requestUserId: string,
  creatorProfile?: { leader_id?: string | null; team_id?: string | null; [key: string]: any } | null,
  currentProfile?: { team_id?: string | null; [key: string]: any } | null
): boolean {
  if (!currentUserId || !requestUserId) return false;
  // Tuyệt đối không tự duyệt đơn của chính mình
  if (currentUserId === requestUserId) return false;

  // Admin và BOD có thẩm quyền duyệt C1 cho mọi đơn của người khác
  if (['admin', 'bod'].includes(currentUserRole)) return true;

  // Nếu vai trò không thuộc nhóm có quyền duyệt C1
  if (!['sale_leader', 'marketing_leader', 'visa_leader', 'hr'].includes(currentUserRole)) return false;

  // Nếu người tạo có gán leader_id cụ thể: Chỉ đúng leader đó mới được duyệt
  if (creatorProfile?.leader_id) {
    return creatorProfile.leader_id === currentUserId;
  }

  // Nếu chưa gán leader_id: kiểm tra xem có cùng team_id hay không
  if (currentProfile?.team_id && creatorProfile?.team_id) {
    return currentProfile.team_id === creatorProfile.team_id;
  }

  // Trường hợp dự phòng cho HR khi nhân viên chưa có nhóm
  if (currentUserRole === 'hr') return true;

  return false;
}

/**
 * Kiểm tra xem người dùng hiện tại có thẩm quyền duyệt Cuối (Cấp 2) cho đơn nghỉ phép:
 * - Chỉ hr, bod, admin
 * - TUYỆT ĐỐI không cho phép tự duyệt cuối đơn của chính mình
 */
export function isUserAuthorizedToApproveLeaveFinal(
  currentUserId: string,
  currentUserRole: string,
  requestUserId: string
): boolean {
  if (!currentUserId || !requestUserId) return false;
  // Tuyệt đối không tự duyệt đơn của chính mình
  if (currentUserId === requestUserId) return false;
  return ['hr', 'bod', 'admin'].includes(currentUserRole);
}

