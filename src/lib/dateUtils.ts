export interface TimeRangeConfig {
  rangeType: string;
  startDate?: string;
  endDate?: string;
}

export const TIME_RANGE_OPTIONS = [
  { value: 'this_month', label: 'Tháng này' },
  { value: 'last_month', label: 'Tháng trước' },
  { value: 'this_week', label: 'Tuần này' },
  { value: 'last_week', label: 'Tuần trước' },
  { value: 'today', label: 'Hôm nay' },
  { value: 'this_year', label: 'Năm nay' },
  { value: 'all', label: 'Mọi thời gian' },
  { value: 'custom', label: 'Chọn ngày' },
];

export function isDateInTimeRange(
  dateInput: Date | string | number | null | undefined,
  rangeType: string,
  customStartDate?: string,
  customEndDate?: string
): boolean {
  if (rangeType === 'all' || !rangeType) return true;
  if (!dateInput) return false;

  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return false;

  const now = new Date();

  if (rangeType === 'today') {
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return d >= todayStart && d <= todayEnd;
  }

  if (rangeType === 'this_week') {
    const day = now.getDay();
    const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.getFullYear(), now.getMonth(), diffToMonday, 0, 0, 0, 0);
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 23, 59, 59, 999);
    return d >= monday && d <= sunday;
  }

  if (rangeType === 'last_week') {
    const day = now.getDay();
    const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
    const thisMonday = new Date(now.getFullYear(), now.getMonth(), diffToMonday, 0, 0, 0, 0);
    const lastMonday = new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate() - 7, 0, 0, 0, 0);
    const lastSunday = new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate() - 1, 23, 59, 59, 999);
    return d >= lastMonday && d <= lastSunday;
  }

  if (rangeType === 'this_month') {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return d >= firstDay && d <= lastDay;
  }

  if (rangeType === 'last_month') {
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return d >= firstDay && d <= lastDay;
  }

  if (rangeType === 'this_year') {
    const firstDay = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    const lastDay = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    return d >= firstDay && d <= lastDay;
  }

  if (rangeType === 'custom') {
    if (customStartDate) {
      const start = new Date(customStartDate + 'T00:00:00');
      if (d < start) return false;
    }
    if (customEndDate) {
      const end = new Date(customEndDate + 'T23:59:59');
      if (d > end) return false;
    }
    return true;
  }

  return true;
}
