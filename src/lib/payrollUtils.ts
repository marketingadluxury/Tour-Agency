import { Holiday, LeaveRequest, HolidayType, LeaveBalance, EmploymentStatus } from '../types';

export interface SeniorityResult {
  years: number;
  months: number;
  days: number;
  totalMonths: number;
  totalDays: number;
  text: string;
  shortText: string;
  seniorityBonusDays: number; // Cứ đủ 5 năm làm việc -> +1 ngày phép năm theo Điều 114 BLLĐ
  isAnniversaryMonth: boolean;
  joinDateFormatted: string;
}

/**
 * Tính toán thâm niên công tác chuẩn xác từ ngày vào làm việc chính thức (join_date)
 * @param joinDateStr - Chuỗi ngày vào làm (YYYY-MM-DD hoặc ISO string)
 * @param referenceDate - Ngày mốc tính toán (mặc định là hôm nay)
 * @param resignedAtStr - Ngày thôi việc nếu nhân sự đã nghỉ việc
 */
export function calculateSeniority(
  joinDateStr?: string | null,
  referenceDate?: Date | string | null,
  resignedAtStr?: string | null
): SeniorityResult {
  if (!joinDateStr) {
    return {
      years: 0,
      months: 0,
      days: 0,
      totalMonths: 0,
      totalDays: 0,
      text: 'Chưa cập nhật ngày vào làm',
      shortText: 'Chưa có',
      seniorityBonusDays: 0,
      isAnniversaryMonth: false,
      joinDateFormatted: '---'
    };
  }

  const startDate = new Date(joinDateStr);
  if (isNaN(startDate.getTime())) {
    return {
      years: 0,
      months: 0,
      days: 0,
      totalMonths: 0,
      totalDays: 0,
      text: 'Ngày vào làm không hợp lệ',
      shortText: 'Không hợp lệ',
      seniorityBonusDays: 0,
      isAnniversaryMonth: false,
      joinDateFormatted: '---'
    };
  }

  // Format dd/mm/yyyy
  const day = String(startDate.getDate()).padStart(2, '0');
  const month = String(startDate.getMonth() + 1).padStart(2, '0');
  const year = startDate.getFullYear();
  const joinDateFormatted = `${day}/${month}/${year}`;

  const endDate = resignedAtStr 
    ? new Date(resignedAtStr) 
    : (referenceDate ? (typeof referenceDate === 'string' ? new Date(referenceDate) : referenceDate) : new Date());

  if (endDate < startDate) {
    return {
      years: 0,
      months: 0,
      days: 0,
      totalMonths: 0,
      totalDays: 0,
      text: 'Chưa đến ngày bắt đầu',
      shortText: '0 tháng',
      seniorityBonusDays: 0,
      isAnniversaryMonth: false,
      joinDateFormatted
    };
  }

  let years = endDate.getFullYear() - startDate.getFullYear();
  let months = endDate.getMonth() - startDate.getMonth();
  let days = endDate.getDate() - startDate.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonthLastDay = new Date(endDate.getFullYear(), endDate.getMonth(), 0).getDate();
    days += prevMonthLastDay;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const totalMonths = years * 12 + months;
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Cứ đủ 5 năm làm việc -> +1 ngày phép thâm niên theo Điều 114 BLLĐ
  const seniorityBonusDays = Math.floor(years / 5);

  const isAnniversaryMonth = endDate.getMonth() === startDate.getMonth() && years > 0;

  let text = '';
  let shortText = '';
  if (years === 0 && months === 0) {
    text = totalDays <= 1 ? 'Mới gia nhập hôm nay' : `Mới gia nhập (${days} ngày)`;
    shortText = `${days} ngày`;
  } else if (years === 0) {
    text = days > 0 ? `${months} tháng ${days} ngày` : `${months} tháng làm việc`;
    shortText = `${months} tháng`;
  } else if (months === 0) {
    text = days > 0 ? `${years} năm ${days} ngày` : `${years} năm làm việc`;
    shortText = `${years} năm`;
  } else {
    text = `${years} năm ${months} tháng`;
    shortText = `${years} năm ${months} th`;
  }

  return {
    years,
    months,
    days,
    totalMonths,
    totalDays,
    text,
    shortText,
    seniorityBonusDays,
    isAnniversaryMonth,
    joinDateFormatted
  };
}

/**
 * Tính số ngày phép năm tích lũy mặc định theo Luật Lao Động (1 ngày cho mỗi tháng làm việc + thâm niên):
 * - Đối với năm trong quá khứ (< năm hiện tại): Đủ 12 ngày phép (nếu không có điều chỉnh HR) + ngày phép thâm niên nếu có.
 * - Đối với năm trong tương lai (> năm hiện tại): 0 ngày (hoặc tích lũy dần khi tới năm đó).
 * - Đối với năm hiện tại:
 *   + Mặc định: Số tháng đã trôi qua tính đến thời điểm hiện tại (ví dụ: đang ở tháng 8 thì mặc định có 8 ngày).
 *   + Nếu có ngày vào làm (join_date hoặc created_at của profile) thuộc năm hiện tại:
 *     tính từ tháng vào làm đến tháng hiện tại (hoặc tháng hạch toán).
 *     Ví dụ: Vào làm tháng 3/2026, hiện tại tháng 8/2026 -> 8 - 3 + 1 = 6 ngày.
 *   + Nếu ngày vào làm trong tương lai (sau tháng hiện tại): 0 ngày.
 *   + Thâm niên (Điều 114 BLLĐ): Cứ đủ 5 năm làm việc -> +1 ngày phép năm.
 *
 * @param year - Năm cần tính quỹ phép (vd: 2026)
 * @param profile - Thông tin nhân viên (chứa join_date, created_at)
 * @param targetMonth - Tháng cụ thể đang hạch toán (1 - 12). Nếu không truyền, mặc định lấy tháng hiện tại (nếu là năm hiện tại) hoặc 12 (nếu là năm quá khứ).
 */
export function calculateDefaultAccruedLeaveDays(
  year: number,
  profile?: { join_date?: string; official_start_date?: string | null; created_at?: string; employment_status?: string } | null,
  targetMonth?: number
): number {
  // Nếu nhân sự đang trong giai đoạn thử việc (probation) hoặc đã nghỉ việc (resigned): Mặc định 0 ngày
  if (profile?.employment_status === 'probation' || profile?.employment_status === 'resigned') {
    return 0;
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1 - 12

  // Xác định mốc tháng tính toán
  let effectiveMonth = 12;
  if (year > currentYear) {
    return 0; // Năm tương lai chưa có tháng làm việc nào
  } else if (year === currentYear) {
    effectiveMonth = targetMonth !== undefined ? Math.min(12, Math.max(1, targetMonth)) : currentMonth;
  } else {
    // Năm quá khứ: nếu có targetMonth cụ thể thì lấy targetMonth, ngược lại đủ cả năm 12 tháng
    effectiveMonth = targetMonth !== undefined ? Math.min(12, Math.max(1, targetMonth)) : 12;
  }

  // Xác định tháng bắt đầu làm việc chính thức của nhân viên
  let startMonth = 1;
  let seniorityBonus = 0;

  // Ưu tiên ngày làm chính thức (official_start_date), nếu chưa cấu hình thì fallback về join_date hoặc created_at
  const officialDateStr = profile?.official_start_date || profile?.join_date || profile?.created_at;
  const originalJoinStr = profile?.join_date || profile?.created_at || profile?.official_start_date;

  if (officialDateStr) {
    try {
      const officialDate = new Date(officialDateStr);
      if (!isNaN(officialDate.getTime())) {
        const officialYear = officialDate.getFullYear();
        const officialMonth = officialDate.getMonth() + 1;

        if (officialYear > year) {
          // Chưa chuyển chính thức trong năm tính toán
          return 0;
        } else if (officialYear === year) {
          startMonth = officialMonth;
        }
      }
    } catch (e) {
      console.warn('Lỗi phân tích ngày làm chính thức:', e);
    }
  }

  // Tính thâm niên (Điều 114 BLLĐ: cứ đủ 5 năm làm việc -> +1 ngày phép)
  if (originalJoinStr) {
    try {
      const joinDate = new Date(originalJoinStr);
      if (!isNaN(joinDate.getTime())) {
        const joinYear = joinDate.getFullYear();
        if (year > joinYear) {
          const yearsOfService = year - joinYear;
          seniorityBonus = Math.floor(yearsOfService / 5);
        }
      }
    } catch (e) {
      console.warn('Lỗi phân tích ngày vào làm thâm niên:', e);
    }
  }

  if (startMonth > effectiveMonth) {
    return 0;
  }

  const accrued = effectiveMonth - startMonth + 1;
  const baseLeave = Math.max(0, Math.min(12, accrued));
  return baseLeave + seniorityBonus;
}

/**
 * Tính tổng số ngày phép năm hiệu lực của nhân viên cho một mốc tháng cụ thể:
 * - Nếu không có can thiệp thủ công từ HR: Tích lũy tự động theo tháng (1 ngày/tháng + thâm niên nếu có).
 * - Nếu HR đã điều chỉnh thủ công trước đó: Lấy mốc số ngày HR đã điều chỉnh và TỰ ĐỘNG CỘNG THÊM +1 ngày cho mỗi tháng mới trôi qua sau tháng điều chỉnh!
 *   Ví dụ: Tháng 9 HR lưu 9 ngày -> Sang Tháng 10 hệ thống tự động cộng thêm 1 ngày thành 10 ngày (hoặc nếu HR lưu 11 ngày thì sang Tháng 10 thành 12 ngày).
 */
export function calculateEffectiveTotalLeaveDays(
  year: number,
  leaveBalance?: LeaveBalance | { total_days?: number; used_days?: number; updated_at?: string; created_at?: string } | null,
  profile?: { join_date?: string; official_start_date?: string | null; created_at?: string; employment_status?: string } | null,
  targetMonth?: number
): number {
  // Nếu nhân sự thử việc hoặc đã nghỉ việc: 0 ngày
  if (profile?.employment_status === 'probation' || profile?.employment_status === 'resigned') {
    return 0;
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1 - 12

  // Xác định mốc tháng tính toán
  let effectiveMonth = 12;
  if (year > currentYear) {
    return 0; // Năm tương lai
  } else if (year === currentYear) {
    effectiveMonth = targetMonth !== undefined ? Math.min(12, Math.max(1, targetMonth)) : currentMonth;
  } else {
    effectiveMonth = targetMonth !== undefined ? Math.min(12, Math.max(1, targetMonth)) : 12;
  }

  // 1. Trường hợp chưa có can thiệp thủ công từ HR
  if (!leaveBalance || leaveBalance.total_days === undefined || leaveBalance.total_days === null) {
    return calculateDefaultAccruedLeaveDays(year, profile, targetMonth);
  }

  // 2. Trường hợp HR ĐÃ điều chỉnh thủ công
  const baseManualTotal = Number(leaveBalance.total_days);

  // Xác định tháng mà HR đã lưu điều chỉnh
  let adjustedMonth = 1;
  const updatedAtStr = (leaveBalance as any).updated_at || (leaveBalance as any).created_at;
  if (updatedAtStr) {
    try {
      const updatedDate = new Date(updatedAtStr);
      if (!isNaN(updatedDate.getTime()) && updatedDate.getFullYear() === year) {
        adjustedMonth = updatedDate.getMonth() + 1;
      }
    } catch {
      adjustedMonth = 1;
    }
  } else {
    // Nếu không có timestamp: coi adjustedMonth là mốc tương ứng với số ngày điều chỉnh (hoặc tháng 1)
    adjustedMonth = Math.min(12, Math.max(1, Math.floor(baseManualTotal)));
  }

  // Nếu tháng hiện tại/tháng hạch toán đã bước sang tháng mới sau tháng điều chỉnh -> Tự động cộng +1 ngày / tháng mới
  if (effectiveMonth > adjustedMonth) {
    const additionalMonths = effectiveMonth - adjustedMonth;
    return baseManualTotal + additionalMonths;
  } else if (effectiveMonth < adjustedMonth && targetMonth !== undefined) {
    // Khi xem lại bảng chấm công của các tháng trước lần điều chỉnh
    const fewerMonths = adjustedMonth - effectiveMonth;
    return Math.max(0, baseManualTotal - fewerMonths);
  }

  return baseManualTotal;
}

/**
 * Tính tổng số ngày phép năm đã sử dụng (bao gồm các đơn nghỉ phép năm đã duyệt + các ngày nghỉ hoán đổi/cầu nối toàn công ty)
 */
export function calculateTotalUsedAnnualDays(
  userId: string,
  year: number,
  leaveRequests: LeaveRequest[] = [],
  holidays: Holiday[] = [],
  targetMonth?: number
): number {
  const effectiveHolidays = holidays && holidays.length > 0 ? holidays : DEFAULT_VIETNAM_HOLIDAYS;

  // 1. Đếm số ngày công từ các đơn xin nghỉ phép năm đã duyệt cấp cuối trong năm
  const approvedAnnualLeaves = leaveRequests.filter((req) => {
    if (req.user_id !== userId || req.status !== 'approved_final' || req.type === 'annual') {
      return false;
    }
    const reqYear = req.start_date ? new Date(req.start_date).getFullYear() : year;
    return reqYear === year;
  });

  let approvedUsedDays = 0;
  approvedAnnualLeaves.forEach((req) => {
    approvedUsedDays += getLeaveRequestWorkdaysCount(req.start_date, req.end_date, effectiveHolidays, req.leave_session, req.total_days);
  });

  // 2. Đếm các ngày nghỉ hoán đổi / cầu nối ('bridge_annual_or_unpaid') trong năm chưa bị trùng với đơn nghỉ phép
  const bridgeHolidaysInYear = effectiveHolidays.filter((h) => {
    if ((h.holiday_type || 'official_paid') !== 'bridge_annual_or_unpaid') return false;
    if (!h.date) return false;
    if (h.is_recurring) return true;
    const hYear = Number(h.date.split('-')[0]);
    return hYear === year;
  });

  let bridgeDaysUsed = 0;
  bridgeHolidaysInYear.forEach((bridge) => {
    const actualBridgeDate = bridge.is_recurring ? `${year}-${bridge.date.substring(5)}` : bridge.date;
    const bDate = new Date(actualBridgeDate);
    const dayOfWeek = bDate.getDay();
    // Bỏ qua nếu rơi vào T7, CN
    if (dayOfWeek === 0 || dayOfWeek === 6) return;

    // Bỏ qua nếu vượt quá mốc targetMonth (nếu có chỉ định)
    if (targetMonth !== undefined) {
      const bMonth = bDate.getMonth() + 1;
      if (bMonth > targetMonth) return;
    }

    // Kiểm tra xem nhân viên đã có đơn xin nghỉ phép cá nhân phủ ngày này chưa
    const hasExplicitLeave = approvedAnnualLeaves.some((req) => {
      return req.start_date <= actualBridgeDate && req.end_date >= actualBridgeDate;
    });

    if (!hasExplicitLeave) {
      bridgeDaysUsed += 1;
    }
  });

  return approvedUsedDays + bridgeDaysUsed;
}

export function getEffectiveLeaveBalance(
  userId: string,
  year: number,
  leaveBalances: LeaveBalance[] = [],
  profile?: any,
  targetMonth?: number,
  leaveRequests: LeaveRequest[] = [],
  holidays: Holiday[] = []
): {
  total: number;
  used: number;
  remaining: number;
  isManualOverride: boolean;
  note?: string;
  updatedBy?: string;
} {
  const balance = leaveBalances.find((b) => b.user_id === userId && b.year === year);
  const isManualOverride = balance?.total_days !== undefined && balance?.total_days !== null;

  const total = calculateEffectiveTotalLeaveDays(year, balance, profile, targetMonth);

  const effectiveHolidays = holidays && holidays.length > 0 ? holidays : DEFAULT_VIETNAM_HOLIDAYS;

  // Tính tổng số ngày phép năm đã sử dụng (đơn cá nhân + ngày hoán đổi)
  const calculatedUsedDays = calculateTotalUsedAnnualDays(userId, year, leaveRequests, effectiveHolidays, targetMonth);

  // Số ngày đã dùng lấy max giữa số ngày tính toán và số ngày đã lưu thủ công (nếu HR điều chỉnh trực tiếp)
  const manualUsedDays = balance ? Number(balance.used_days ?? 0) : 0;
  const used = Math.max(manualUsedDays, calculatedUsedDays);

  const remaining = Math.max(0, total - used);

  return {
    total,
    used,
    remaining,
    isManualOverride,
    note: balance?.note,
    updatedBy: balance?.updated_by,
  };
}

/**
 * Danh sách ngày lễ mặc định tại Việt Nam (Dùng làm fallback nếu Supabase chưa có dữ liệu)
 */
export const DEFAULT_VIETNAM_HOLIDAYS: Holiday[] = [
  { id: 'def-1', date: '2026-01-01', name: 'Tết Dương Lịch', is_recurring: true, holiday_type: 'official_paid', description: 'Nghỉ Tết Dương Lịch 1 ngày (Hưởng nguyên lương)' },
  { id: 'def-2', date: '2026-02-16', name: 'Tết Nguyên Đán (29 Tết)', is_recurring: false, holiday_type: 'official_paid', description: 'Nghỉ Tết Âm Lịch (Hưởng nguyên lương)' },
  { id: 'def-3', date: '2026-02-17', name: 'Tết Nguyên Đán (30 Tết)', is_recurring: false, holiday_type: 'official_paid', description: 'Nghỉ Tết Âm Lịch (Hưởng nguyên lương)' },
  { id: 'def-4', date: '2026-02-18', name: 'Tết Nguyên Đán (Mùng 1)', is_recurring: false, holiday_type: 'official_paid', description: 'Nghỉ Tết Âm Lịch (Hưởng nguyên lương)' },
  { id: 'def-5', date: '2026-02-19', name: 'Tết Nguyên Đán (Mùng 2)', is_recurring: false, holiday_type: 'official_paid', description: 'Nghỉ Tết Âm Lịch (Hưởng nguyên lương)' },
  { id: 'def-6', date: '2026-02-20', name: 'Tết Nguyên Đán (Mùng 3)', is_recurring: false, holiday_type: 'official_paid', description: 'Nghỉ Tết Âm Lịch (Hưởng nguyên lương)' },
  { id: 'def-7', date: '2026-04-26', name: 'Giỗ Tổ Hùng Vương (10/3 ÂL)', is_recurring: false, holiday_type: 'official_paid', description: 'Nghỉ Giỗ Tổ Hùng Vương (Hưởng nguyên lương)' },
  { id: 'def-8', date: '2026-04-30', name: 'Ngày Giải phóng miền Nam', is_recurring: true, holiday_type: 'official_paid', description: 'Nghỉ Lễ 30/4 (Hưởng nguyên lương)' },
  { id: 'def-9', date: '2026-05-01', name: 'Ngày Quốc tế Lao động', is_recurring: true, holiday_type: 'official_paid', description: 'Nghỉ Lễ 1/5 (Hưởng nguyên lương)' },
  { id: 'def-10', date: '2026-08-31', name: 'Nghỉ hoán đổi / cầu nối Quốc khánh 2026', is_recurring: false, holiday_type: 'bridge_annual_or_unpaid', description: 'Nghỉ trừ vào phép năm (hưởng lương). Hết phép tính nghỉ không lương.' },
  { id: 'def-11', date: '2026-09-01', name: 'Nghỉ liền kề Quốc khánh', is_recurring: false, holiday_type: 'official_paid', description: 'Nghỉ lễ hưởng nguyên lương theo quy định' },
  { id: 'def-12', date: '2026-09-02', name: 'Ngày Quốc khánh', is_recurring: true, holiday_type: 'official_paid', description: 'Nghỉ Quốc khánh 2/9 hưởng nguyên lương' },
];

/**
 * Kiểm tra xem một ngày cụ thể (YYYY-MM-DD) có phải là ngày Lễ chính thức (Hưởng nguyên lương) hay không
 * Lưu ý: 'official_paid' hoặc mặc định (nếu không có holiday_type) được tính là ngày lễ chính thức làm giảm số ngày công chuẩn trong tháng.
 * 'bridge_annual_or_unpaid' vẫn được tính vào công chuẩn nhưng sẽ xử lý khấu trừ tự động vào phép năm/không lương của từng nhân viên.
 * 'unpaid_company' là ngày toàn công ty nghỉ không hưởng lương.
 */
export function isHolidayDate(dateStr: string, holidays: Holiday[]): { isHoliday: boolean; holidayName?: string; holidayType?: HolidayType } {
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const monthDay = `${monthStr}-${dayStr}`;

  for (const h of holidays) {
    if (!h.date) continue;
    const effectiveType: HolidayType = h.holiday_type || 'official_paid';

    // Khớp chính xác ngày YYYY-MM-DD
    if (h.date === dateStr) {
      // Chỉ ngày lễ chính thức (official_paid) mới làm giảm ngày công chuẩn tháng
      if (effectiveType === 'official_paid') {
        return { isHoliday: true, holidayName: h.name, holidayType: effectiveType };
      }
      return { isHoliday: false, holidayName: h.name, holidayType: effectiveType };
    }
    // Nếu là ngày lễ lặp lại hàng năm (is_recurring), so sánh MM-DD
    if (h.is_recurring) {
      const hMonthDay = h.date.substring(5); // Lấy MM-DD
      if (hMonthDay === monthDay) {
        if (effectiveType === 'official_paid') {
          return { isHoliday: true, holidayName: h.name, holidayType: effectiveType };
        }
        return { isHoliday: false, holidayName: h.name, holidayType: effectiveType };
      }
    }
  }

  return { isHoliday: false };
}

/**
 * Kiểm tra một ngày cụ thể có phải là ngày làm việc (Thứ 2 đến Thứ 6 và Không phải ngày lễ)
 */
export function isWorkingDay(date: Date, holidays: Holiday[]): boolean {
  const dayOfWeek = date.getDay(); // 0: CN, 6: T7
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;

  const { isHoliday } = isHolidayDate(dateStr, holidays);
  return !isHoliday;
}

/**
 * 1. Tự động tính số "Ngày công chuẩn" trong tháng (Month: 1 - 12, Year: 2026...)
 * Logic:
 * - Đếm tổng số ngày trong tháng.
 * - Trừ đi tất cả các ngày Thứ 7 và Chủ Nhật.
 * - Trừ tiếp các ngày có trong bảng holidays (nếu ngày Lễ đó không rơi vào T7, CN).
 */
export function calculateStandardWorkingDays(month: number, year: number, holidays: Holiday[] = []): number {
  // Lấy tổng số ngày trong tháng (bằng cách truyền ngày 0 của tháng kế tiếp)
  const totalDaysInMonth = new Date(year, month, 0).getDate();
  let standardWorkingDays = 0;

  for (let day = 1; day <= totalDaysInMonth; day++) {
    const currentDate = new Date(year, month - 1, day);
    const dayOfWeek = currentDate.getDay(); // 0: CN, 6: T7

    // Bỏ qua Thứ 7 và Chủ Nhật
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      continue;
    }

    const yyyy = year;
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const { isHoliday } = isHolidayDate(dateStr, holidays);
    if (!isHoliday) {
      standardWorkingDays += 1;
    }
  }

  return standardWorkingDays;
}

/**
 * Tính số ngày làm việc thực tế giữa 2 mốc thời gian (start_date -> end_date) trong 1 tháng cụ thể
 * Chỉ đếm các ngày thuộc tháng đó, là ngày trong tuần (T2-T6) và không trùng ngày Lễ.
 * Hỗ trợ các đơn nghỉ nửa ngày (session: morning/afternoon -> 0.5 ngày).
 */
export function calculateWorkingDaysInRange(
  startDateStr: string,
  endDateStr: string,
  targetMonth: number,
  targetYear: number,
  holidays: Holiday[] = [],
  leaveSession?: 'all_day' | 'morning' | 'afternoon',
  totalDaysOverride?: number
): number {
  if (totalDaysOverride !== undefined && totalDaysOverride !== null && totalDaysOverride > 0) {
    // Nếu có override rõ ràng (ví dụ 0.5) và đơn chỉ trong 1 ngày
    if (startDateStr === endDateStr) {
      const d = new Date(startDateStr);
      if (d.getFullYear() === targetYear && d.getMonth() + 1 === targetMonth) {
        if (isWorkingDay(d, holidays)) {
          return totalDaysOverride;
        }
      }
      return 0;
    }
  }

  if (startDateStr === endDateStr && (leaveSession === 'morning' || leaveSession === 'afternoon')) {
    const d = new Date(startDateStr);
    if (d.getFullYear() === targetYear && d.getMonth() + 1 === targetMonth) {
      if (isWorkingDay(d, holidays)) {
        return 0.5;
      }
    }
    return 0;
  }

  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  // Chuẩn hóa thời gian về 00:00:00
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  if (start > end) return 0;

  let count = 0;
  const current = new Date(start);

  while (current <= end) {
    const curYear = current.getFullYear();
    const curMonth = current.getMonth() + 1;

    // Chỉ xét các ngày rơi vào đúng tháng/năm mục tiêu
    if (curYear === targetYear && curMonth === targetMonth) {
      if (isWorkingDay(current, holidays)) {
        count += 1;
      }
    }

    current.setDate(current.getDate() + 1);
  }

  return count;
}

export interface EmployeeTimesheetRow {
  user_id: string;
  employee_name: string;
  employee_email: string;
  employee_role: string;
  employment_status?: EmploymentStatus;
  month: number;
  year: number;
  standard_working_days: number;
  paid_leave_days: number;
  compensatory_leave_days: number;
  special_leave_days: number;
  unpaid_leave_days: number;
  actual_working_days: number;
  leave_balance_total: number;
  leave_balance_remaining: number;
  leave_details?: LeaveRequest[];
  bridge_leave_applied?: {
    date: string;
    type: 'paid_annual' | 'unpaid';
    name: string;
  }[];
}

/**
 * 3. Tự động tính bảng chấm công tổng hợp cho 1 nhân viên
 */
export function calculateEmployeeTimesheet(
  profile: any,
  month: number,
  year: number,
  leaveRequests: LeaveRequest[],
  holidays: Holiday[] = [],
  leaveBalance?: LeaveBalance | { total_days?: number; used_days?: number; updated_at?: string; created_at?: string } | null
): EmployeeTimesheetRow {
  const userId = profile.id;
  const standardWorkingDays = calculateStandardWorkingDays(month, year, holidays);

  // Lọc các đơn nghỉ phép đã được duyệt cấp cuối ('approved_final')
  const userApprovedLeaves = leaveRequests.filter(
    (req) => req.user_id === userId && req.status === 'approved_final'
  );

  let paidLeaveDays = 0; // Phép năm (annual)
  let compensatoryLeaveDays = 0; // Nghỉ bù (compensatory)
  let specialLeaveDays = 0; // Nghỉ chế độ (special)
  let unpaidLeaveDays = 0; // Nghỉ không lương (unpaid)

  userApprovedLeaves.forEach((req) => {
    const daysInMonth = calculateWorkingDaysInRange(
      req.start_date,
      req.end_date,
      month,
      year,
      holidays,
      req.leave_session,
      req.total_days
    );

    if (req.type === 'annual') {
      paidLeaveDays += daysInMonth;
    } else if (req.type === 'compensatory') {
      compensatoryLeaveDays += daysInMonth;
    } else if (req.type === 'special') {
      specialLeaveDays += daysInMonth;
    } else if (req.type === 'unpaid') {
      unpaidLeaveDays += daysInMonth;
    }
  });

  const totalDays = calculateEffectiveTotalLeaveDays(year, leaveBalance, profile, month);

  // Tính tổng số ngày phép năm từ các đơn đã duyệt trong năm cho nhân viên này
  const annualLeavesForYear = leaveRequests.filter((req) => {
    if (req.user_id === userId && req.status === 'approved_final' && req.type === 'annual') {
      const rYear = req.start_date ? new Date(req.start_date).getFullYear() : year;
      return rYear === year;
    }
    return false;
  });

  let approvedAnnualDaysYear = 0;
  annualLeavesForYear.forEach((req) => {
    approvedAnnualDaysYear += getLeaveRequestWorkdaysCount(
      req.start_date,
      req.end_date,
      holidays,
      req.leave_session,
      req.total_days
    );
  });

  const usedDays = Math.max(leaveBalance?.used_days ?? 0, approvedAnnualDaysYear);
  let leave_balance_remaining = Math.max(0, totalDays - usedDays);

  // Xử lý ngày nghỉ hoán đổi / cầu nối (Option B: Bridge Holiday) từ danh sách holidays động
  const bridgeAppliedList: { date: string; type: 'paid_annual' | 'unpaid'; name: string }[] = [];
  
  // Lấy các ngày nghỉ thuộc loại 'bridge_annual_or_unpaid' hoặc 'unpaid_company' trong tháng này
  const holidaysInMonth = holidays.filter((h) => {
    if (!h.date) return false;
    const [hYear, hMonth] = h.date.split('-').map(Number);
    // Nếu có lặp lại hàng năm
    if (h.is_recurring) {
      const monthPart = Number(h.date.substring(5, 7));
      return monthPart === month;
    }
    return hYear === year && hMonth === month;
  });

  const bridgeHolidaysInMonth = holidaysInMonth.filter((h) => (h.holiday_type || 'official_paid') === 'bridge_annual_or_unpaid');
  const unpaidCompanyHolidaysInMonth = holidaysInMonth.filter((h) => h.holiday_type === 'unpaid_company');

  // Xử lý ngày cầu nối / hoán đổi (trừ phép năm hoặc nghỉ không lương)
  bridgeHolidaysInMonth.forEach((bridge) => {
    // Chuẩn hóa ngày nếu là recurring
    const actualBridgeDate = bridge.is_recurring ? `${year}-${bridge.date.substring(5)}` : bridge.date;

    // Kiểm tra xem nhân viên đã có đơn nghỉ phép chính thức nào phủ ngày này chưa
    const hasExplicitLeave = userApprovedLeaves.some((req) => {
      return req.start_date <= actualBridgeDate && req.end_date >= actualBridgeDate;
    });

    if (!hasExplicitLeave) {
      if (leave_balance_remaining >= 1) {
        // Có đủ phép năm: trừ 1 ngày phép năm, nhân viên được hưởng nguyên lương
        paidLeaveDays += 1;
        leave_balance_remaining -= 1;
        bridgeAppliedList.push({
          date: actualBridgeDate,
          type: 'paid_annual',
          name: bridge.name
        });
      } else {
        // Hết hoặc không đủ phép năm: tính là nghỉ không lương (trừ 1 ngày công)
        unpaidLeaveDays += 1;
        bridgeAppliedList.push({
          date: actualBridgeDate,
          type: 'unpaid',
          name: bridge.name
        });
      }
    }
  });

  // Xử lý ngày nghỉ không lương toàn công ty
  unpaidCompanyHolidaysInMonth.forEach((uHoliday) => {
    const actualUDate = uHoliday.is_recurring ? `${year}-${uHoliday.date.substring(5)}` : uHoliday.date;
    const hasExplicitLeave = userApprovedLeaves.some((req) => {
      return req.start_date <= actualUDate && req.end_date >= actualUDate;
    });
    if (!hasExplicitLeave) {
      unpaidLeaveDays += 1;
      bridgeAppliedList.push({
        date: actualUDate,
        type: 'unpaid',
        name: `${uHoliday.name} (Nghỉ không lương Cty)`
      });
    }
  });

  const actualWorkingDays = Math.max(0, standardWorkingDays - unpaidLeaveDays);

  return {
    user_id: userId,
    employee_name: profile.full_name || profile.name || 'Chưa đặt tên',
    employee_email: profile.email || '',
    employee_role: profile.role || '',
    employment_status: profile.employment_status,
    month,
    year,
    standard_working_days: standardWorkingDays,
    paid_leave_days: paidLeaveDays,
    compensatory_leave_days: compensatoryLeaveDays,
    special_leave_days: specialLeaveDays,
    unpaid_leave_days: unpaidLeaveDays,
    actual_working_days: actualWorkingDays,
    leave_balance_total: totalDays,
    leave_balance_remaining,
    leave_details: userApprovedLeaves,
    bridge_leave_applied: bridgeAppliedList.length > 0 ? bridgeAppliedList : undefined,
  };
}


/**
 * Tính tổng số ngày làm việc thực tế của một đơn xin nghỉ phép bất kỳ (để trừ quỹ phép hoặc hiển thị)
 * Hỗ trợ các đơn nghỉ nửa ngày (session: morning/afternoon -> 0.5 ngày).
 */
export function getLeaveRequestWorkdaysCount(
  startDateStr: string,
  endDateStr: string,
  holidays: Holiday[] = [],
  leaveSession?: 'all_day' | 'morning' | 'afternoon',
  totalDaysOverride?: number
): number {
  if (totalDaysOverride !== undefined && totalDaysOverride !== null && totalDaysOverride > 0) {
    if (startDateStr === endDateStr) {
      const d = new Date(startDateStr);
      if (isWorkingDay(d, holidays)) {
        return totalDaysOverride;
      }
      return 0;
    }
  }

  if (startDateStr === endDateStr && (leaveSession === 'morning' || leaveSession === 'afternoon')) {
    const d = new Date(startDateStr);
    if (isWorkingDay(d, holidays)) {
      return 0.5;
    }
    return 0;
  }

  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  if (start > end) return 0;

  let count = 0;
  const current = new Date(start);

  while (current <= end) {
    if (isWorkingDay(current, holidays)) {
      count += 1;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}
