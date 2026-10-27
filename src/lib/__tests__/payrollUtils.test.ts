import { describe, it, expect } from 'vitest';
import { 
  calculateDefaultAccruedLeaveDays, 
  calculateEffectiveTotalLeaveDays, 
  getEffectiveLeaveBalance,
  calculateSeniority 
} from '../payrollUtils';

describe('Phần 2: Automation Tests - Kiểm thử quỹ phép tích lũy (payrollUtils)', () => {
  const currentYear = new Date().getFullYear();

  it('Năm trong tương lai (> năm hiện tại) mặc định là 0 ngày', () => {
    expect(calculateDefaultAccruedLeaveDays(currentYear + 1)).toBe(0);
    expect(calculateDefaultAccruedLeaveDays(currentYear + 2)).toBe(0);
  });

  it('Năm trong quá khứ (< năm hiện tại) mặc định đủ 12 ngày phép', () => {
    expect(calculateDefaultAccruedLeaveDays(currentYear - 1)).toBe(12);
  });

  it('Năm hiện tại tính tích lũy theo tháng hạch toán (1 ngày / tháng)', () => {
    // Nếu hạch toán vào tháng 8
    const daysInAugust = calculateDefaultAccruedLeaveDays(currentYear, null, 8);
    expect(daysInAugust).toBe(8);

    // Nếu hạch toán vào tháng 3
    const daysInMarch = calculateDefaultAccruedLeaveDays(currentYear, null, 3);
    expect(daysInMarch).toBe(3);
  });

  it('Nhân viên mới vào làm trong năm tính từ tháng bắt đầu đến tháng hạch toán', () => {
    // Nhân viên vào làm tháng 3 năm hiện tại
    const newEmployee = {
      join_date: `${currentYear}-03-15`
    };

    // Hạch toán vào tháng 8: từ tháng 3 đến tháng 8 là 6 tháng (8 - 3 + 1 = 6 ngày)
    const accruedDays = calculateDefaultAccruedLeaveDays(currentYear, newEmployee, 8);
    expect(accruedDays).toBe(6);
  });

  it('Nhân viên vào thử việc từ tháng 3 nhưng làm chính thức từ tháng 5 tính quỹ phép từ tháng làm chính thức', () => {
    const employeeWithOfficialDate = {
      join_date: `${currentYear}-03-01`, // Ngày vào thử việc
      official_start_date: `${currentYear}-05-01`, // Ngày ký hợp đồng chính thức
      employment_status: 'official' as const
    };

    // Hạch toán vào tháng 10: từ tháng 5 đến tháng 10 là 6 tháng (10 - 5 + 1 = 6 ngày)
    const accruedDays = calculateDefaultAccruedLeaveDays(currentYear, employeeWithOfficialDate, 10);
    expect(accruedDays).toBe(6);
  });

  it('Nhân viên có ngày làm chính thức từ các năm trước được hưởng đủ theo tháng hạch toán của năm hiện tại', () => {
    const oldEmployee = {
      join_date: `${currentYear - 2}-04-01`,
      official_start_date: `${currentYear - 2}-06-01`,
      employment_status: 'official' as const
    };

    // Hạch toán vào tháng 10 năm hiện tại: đủ 10 ngày
    const accruedDays = calculateDefaultAccruedLeaveDays(currentYear, oldEmployee, 10);
    expect(accruedDays).toBe(10);
  });

  it('Nhân viên có ngày vào làm sau tháng hạch toán nhận 0 ngày', () => {
    const futureEmployee = {
      join_date: `${currentYear}-10-01`
    };
    // Hạch toán vào tháng 5 nhưng tháng 10 mới vào làm -> 0 ngày
    const accruedDays = calculateDefaultAccruedLeaveDays(currentYear, futureEmployee, 5);
    expect(accruedDays).toBe(0);
  });

  it('Nhân sự thử việc (employment_status = "probation") mặc định nhận 0 ngày phép', () => {
    const probationEmployee = {
      join_date: `${currentYear}-01-01`,
      employment_status: 'probation' as const
    };
    // Dù ở tháng 8 thì nhân sự thử việc vẫn là 0 ngày
    const accruedDays = calculateDefaultAccruedLeaveDays(currentYear, probationEmployee, 8);
    expect(accruedDays).toBe(0);
  });

  it('Nhân sự chính thức (employment_status = "official" hoặc không set) tích lũy bình thường', () => {
    const officialEmployee = {
      join_date: `${currentYear}-01-01`,
      employment_status: 'official' as const
    };
    const accruedDays = calculateDefaultAccruedLeaveDays(currentYear, officialEmployee, 8);
    expect(accruedDays).toBe(8);
  });

  it('Nhân sự đã nghỉ việc (employment_status = "resigned") mặc định nhận 0 ngày phép', () => {
    const resignedEmployee = {
      join_date: `${currentYear}-01-01`,
      employment_status: 'resigned' as const
    };
    const accruedDays = calculateDefaultAccruedLeaveDays(currentYear, resignedEmployee, 8);
    expect(accruedDays).toBe(0);
  });

  it('Nhân sự có thâm niên trên 5 năm được cộng thêm ngày phép thâm niên (+1 ngày / 5 năm)', () => {
    const seniorEmployee = {
      join_date: `${currentYear - 6}-01-01`, // 6 năm thâm niên
      employment_status: 'official' as const
    };
    // Tháng 8 hạch toán: 8 ngày cơ bản + 1 ngày phép thâm niên (Math.floor(6/5) = 1) = 9 ngày
    const accruedDays = calculateDefaultAccruedLeaveDays(currentYear, seniorEmployee, 8);
    expect(accruedDays).toBe(9);
  });
});

describe('Phần 2.2: Automation Tests - Kiểm thử tính thâm niên công tác (calculateSeniority)', () => {
  it('Xử lý trường hợp không có ngày vào làm', () => {
    const res = calculateSeniority(null);
    expect(res.years).toBe(0);
    expect(res.text).toBe('Chưa cập nhật ngày vào làm');
  });

  it('Tính chính xác nhân sự mới gia nhập trong tháng', () => {
    const res = calculateSeniority('2026-09-15', new Date('2026-09-29'));
    expect(res.years).toBe(0);
    expect(res.months).toBe(0);
    expect(res.days).toBe(14);
    expect(res.text).toContain('Mới gia nhập (14 ngày)');
  });

  it('Tính chính xác thâm niên theo năm và tháng', () => {
    const res = calculateSeniority('2024-03-10', new Date('2026-09-29'));
    expect(res.years).toBe(2);
    expect(res.months).toBe(6);
    expect(res.text).toBe('2 năm 6 tháng');
  });

  it('Tính ngày phép thưởng thâm niên (seniorityBonusDays) theo Luật lao động', () => {
    const res5yr = calculateSeniority('2021-01-01', new Date('2026-09-29'));
    expect(res5yr.seniorityBonusDays).toBe(1); // 5 năm -> +1 ngày

    const res11yr = calculateSeniority('2015-01-01', new Date('2026-09-29'));
    expect(res11yr.seniorityBonusDays).toBe(2); // 11 năm -> +2 ngày
  });

  it('Tính đúng thâm niên đến ngày thôi việc nếu nhân viên đã nghỉ việc (resignedAt)', () => {
    const res = calculateSeniority('2023-01-01', null, '2025-06-15');
    expect(res.years).toBe(2);
    expect(res.months).toBe(5);
    expect(res.text).toBe('2 năm 5 tháng');
  });
});

describe('Phần 2.3: Automation Tests - Tự động cộng +1 ngày phép khi qua tháng mới (kể cả sau khi HR điều chỉnh)', () => {
  const currentYear = new Date().getFullYear();

  it('Nếu HR chưa điều chỉnh, tự động tích lũy theo tháng (Tháng 10 = 10 ngày)', () => {
    const totalDays = calculateEffectiveTotalLeaveDays(currentYear, null, null, 10);
    expect(totalDays).toBe(10);
  });

  it('Nếu HR đã cập nhật thủ công vào Tháng 9 (9 ngày), sang Tháng 10 tự động cộng thêm +1 ngày thành 10 ngày', () => {
    const manualBalanceSept = {
      user_id: 'u-1',
      year: currentYear,
      total_days: 9,
      used_days: 2,
      updated_at: `${currentYear}-09-15T08:00:00.000Z`
    };

    // Khi xem lại ở Tháng 9: đúng 9 ngày
    const daysInSept = calculateEffectiveTotalLeaveDays(currentYear, manualBalanceSept, null, 9);
    expect(daysInSept).toBe(9);

    // Khi bước sang Tháng 10: tự động cộng +1 ngày thành 10 ngày
    const daysInOct = calculateEffectiveTotalLeaveDays(currentYear, manualBalanceSept, null, 10);
    expect(daysInOct).toBe(10);

    // Khi bước sang Tháng 11: tự động cộng +2 ngày thành 11 ngày
    const daysInNov = calculateEffectiveTotalLeaveDays(currentYear, manualBalanceSept, null, 11);
    expect(daysInNov).toBe(11);
  });

  it('Nếu HR thưởng đặc cách vào Tháng 8 (10 ngày), sang Tháng 10 tự động cộng +2 ngày thành 12 ngày', () => {
    const manualBonusBalance = {
      user_id: 'u-2',
      year: currentYear,
      total_days: 10, // Tháng 8 chuẩn là 8, HR thưởng thành 10 (+2 ngày)
      used_days: 1,
      updated_at: `${currentYear}-08-20T10:00:00.000Z`
    };

    // Tháng 8: 10 ngày
    expect(calculateEffectiveTotalLeaveDays(currentYear, manualBonusBalance, null, 8)).toBe(10);
    // Tháng 9: 10 + 1 = 11 ngày
    expect(calculateEffectiveTotalLeaveDays(currentYear, manualBonusBalance, null, 9)).toBe(11);
    // Tháng 10: 10 + 2 = 12 ngày
    expect(calculateEffectiveTotalLeaveDays(currentYear, manualBonusBalance, null, 10)).toBe(12);
  });

  it('Nhân sự thử việc hoặc đã nghỉ việc vẫn luôn nhận 0 ngày phép', () => {
    const probationProfile = {
      employment_status: 'probation' as const
    };
    const manualBalance = {
      user_id: 'u-3',
      year: currentYear,
      total_days: 9,
      used_days: 0,
      updated_at: `${currentYear}-09-01T00:00:00.000Z`
    };

    expect(calculateEffectiveTotalLeaveDays(currentYear, manualBalance, probationProfile, 10)).toBe(0);
  });
});


