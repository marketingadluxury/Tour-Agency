import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCRM } from '../context/CRMContext';
import { 
  Palmtree, Calendar, User, Briefcase, 
  CheckCircle2, Clock, XCircle, TrendingUp, 
  ChevronRight, Plus, 
  Building2, Phone, Mail, Sparkles, 
  BarChart3, Check, AlertCircle, LayoutDashboard, PartyPopper
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  getEffectiveLeaveBalance,
  calculateDefaultAccruedLeaveDays,
  calculateEmployeeTimesheet,
  calculateTotalUsedAnnualDays,
  calculateSeniority
} from '../lib/payrollUtils';
import { 
  EMPLOYMENT_STATUS_LABELS,
  EmploymentStatus,
  LeaveRequest,
  Role,
  getRoleConfig
} from '../types';
import { CreateLeaveRequestModal } from '../components/LeaveRequestModal';
import { CustomSelect, SelectOption } from '../components/CustomSelect';

const LEAVE_TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  annual: { label: 'Nghỉ phép năm', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  unpaid: { label: 'Nghỉ không lương', color: 'text-rose-700', bg: 'bg-rose-50' },
  compensatory: { label: 'Nghỉ bù', color: 'text-blue-700', bg: 'bg-blue-50' },
  special: { label: 'Nghỉ chế độ / Hiếu hỷ', color: 'text-purple-700', bg: 'bg-purple-50' },
};

export default function MyDashboard() {
  const { user, profile } = useAuth();
  const { 
    leaveBalances, 
    leaveRequests, 
    holidays, 
    profilesList, 
    orders, 
    currentRole 
  } = useCRM();

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');

  // Thông tin user hiện tại
  const myProfile = useMemo(() => {
    return profilesList.find(p => p.id === (profile?.id || user?.id)) || profile;
  }, [profilesList, profile, user]);

  const userId = myProfile?.id || user?.id || '';

  // Tính thâm niên công tác chuẩn hóa
  const seniority = useMemo(() => {
    return calculateSeniority(myProfile?.join_date || myProfile?.created_at, null, myProfile?.resigned_at);
  }, [myProfile]);

  // Quỹ phép năm hiệu dụng
  const effectiveLeave = useMemo(() => {
    return getEffectiveLeaveBalance(
      userId,
      selectedYear,
      leaveBalances,
      myProfile,
      undefined,
      leaveRequests,
      holidays
    );
  }, [userId, selectedYear, leaveBalances, myProfile, leaveRequests, holidays]);

  // Tiến độ sử dụng phép
  const leaveUsagePercent = useMemo(() => {
    if (effectiveLeave.total <= 0) return 0;
    return Math.min(100, Math.round((effectiveLeave.used / effectiveLeave.total) * 100));
  }, [effectiveLeave]);

  // Lịch sử đơn nghỉ phép cá nhân trong năm đã chọn
  const myLeaveRequests = useMemo(() => {
    return leaveRequests
      .filter(r => {
        if (r.user_id !== userId && r.user_email !== myProfile?.email) return false;
        const reqYear = new Date(r.start_date).getFullYear();
        return reqYear === selectedYear;
      })
      .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
  }, [leaveRequests, userId, myProfile, selectedYear]);

  // Dữ liệu bảng công & thu nhập 12 tháng
  const monthlyTimesheetData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const userBalance = leaveBalances.find(b => b.user_id === userId && b.year === selectedYear);
    
    return months.map(m => {
      const ts = calculateEmployeeTimesheet(
        myProfile || { id: userId, full_name: myProfile?.full_name || 'Nhân viên' },
        m,
        selectedYear,
        leaveRequests,
        holidays,
        userBalance
      );

      const standardDays = ts.standard_working_days;
      const actualDays = ts.actual_working_days;
      const annualLeaveDays = ts.paid_leave_days;
      const holidayDays = 0;
      const paidLeaveDays = ts.paid_leave_days + ts.compensatory_leave_days + ts.special_leave_days;
      const unpaidLeaveDays = ts.unpaid_leave_days;
      const completionRate = standardDays > 0 ? Math.min(100, Math.round((actualDays / standardDays) * 100)) : 100;

      // Tính doanh số & hoa hồng trong tháng đối với nhân sự Sale / CTV / Leader
      const isPastOrCurrent = selectedYear < currentYear || (selectedYear === currentYear && m <= currentMonth);
      
      let monthSales = 0;
      let monthCommission = 0;
      let orderCount = 0;

      if (['sale', 'sale_leader', 'agent', 'CTV'].includes(myProfile?.role || '')) {
        const myOrdersInMonth = orders.filter(o => {
          const isMyOrder = o.created_by === userId || (o.ctv_info && o.ctv_info.includes(myProfile?.full_name || '___'));
          if (!isMyOrder) return false;
          if (o.status === 'cancelled') return false;
          const oDate = new Date(o.created_at || new Date());
          return oDate.getFullYear() === selectedYear && (oDate.getMonth() + 1) === m;
        });

        orderCount = myOrdersInMonth.length;
        monthSales = myOrdersInMonth.reduce((sum, o) => sum + (Number(o.total_price) || 0), 0);
        monthCommission = myOrdersInMonth.reduce((sum, o) => {
          const markup = Number(o.price_markup) || 0;
          const markupFee = Number(o.markup_fee_amount) || 0;
          const netMarkup = Math.max(0, markup - markupFee);
          const paxCount = (Number(o.adult_count) || 0) + (Number(o.child_count) || 0);
          const baseComm = paxCount * 100000; // Mức hoa hồng định mức 100k/pax
          return sum + baseComm + netMarkup;
        }, 0);
      }

      return {
        month: m,
        ...ts,
        standardDays,
        actualDays,
        annualLeaveDays,
        holidayDays,
        paidLeaveDays,
        unpaidLeaveDays,
        completionRate,
        isPastOrCurrent,
        orderCount,
        monthSales,
        monthCommission
      };
    });
  }, [userId, selectedYear, currentYear, currentMonth, leaveRequests, holidays, myProfile, orders, leaveBalances]);

  // Thống kê tháng hiện tại
  const currentMonthStats = useMemo(() => {
    return monthlyTimesheetData.find(m => m.month === currentMonth) || monthlyTimesheetData[0];
  }, [monthlyTimesheetData, currentMonth]);

  // Tổng doanh số & hoa hồng cả năm
  const annualSalesSummary = useMemo(() => {
    const totalSales = monthlyTimesheetData.reduce((sum, m) => sum + m.monthSales, 0);
    const totalCommission = monthlyTimesheetData.reduce((sum, m) => sum + m.monthCommission, 0);
    const totalOrders = monthlyTimesheetData.reduce((sum, m) => sum + m.orderCount, 0);
    return { totalSales, totalCommission, totalOrders };
  }, [monthlyTimesheetData]);

  const empStatus = (myProfile?.employment_status as EmploymentStatus) || 'official';
  const statusCfg = EMPLOYMENT_STATUS_LABELS[empStatus] || EMPLOYMENT_STATUS_LABELS.official;
  const roleCfg = getRoleConfig(myProfile?.role || currentRole);

  const yearOptions: SelectOption[] = [
    { value: String(currentYear - 1), label: `Năm ${currentYear - 1}` },
    { value: String(currentYear), label: `Năm ${currentYear} (Hiện tại)` },
    { value: String(currentYear + 1), label: `Năm ${currentYear + 1}` },
  ];

  return (
    <div className="space-y-6 font-sans max-w-7xl mx-auto pb-12">
      {/* 1. TOP HEADER & EMPLOYEE PROFILE CARD */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 text-gray-900 shadow-2xs border border-gray-200">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5">
            {/* Avatar */}
            <div className="relative">
              <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-0.5 shadow-sm">
                <div className="w-full h-full rounded-[14px] bg-white flex items-center justify-center text-2xl font-black text-blue-600">
                  {myProfile?.full_name ? myProfile.full_name.charAt(0).toUpperCase() : 'U'}
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 p-0.5 bg-white rounded-full">
                <div className={`w-3.5 h-3.5 rounded-full ${empStatus === 'official' ? 'bg-emerald-500 ring-2 ring-white' : 'bg-amber-500 ring-2 ring-white'}`} />
              </div>
            </div>

            {/* Profile Info */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  {myProfile?.full_name || user?.email?.split('@')[0] || 'Nhân sự Công ty'}
                </h1>
                
                {/* Role Badge */}
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${roleCfg.bg} ${roleCfg.color} ${roleCfg.border}`}>
                  {roleCfg.label}
                </span>

                {/* Employment Status Badge */}
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border}`}>
                  {statusCfg.label}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-gray-500 font-medium">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  <span>{myProfile?.email || user?.email}</span>
                </span>
                {myProfile?.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span>{myProfile.phone}</span>
                  </span>
                )}
                {myProfile?.team_name && (
                  <span className="flex items-center gap-1 text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{myProfile.team_name}</span>
                  </span>
                )}
                <span className="flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{seniority.text}</span>
                  {seniority.seniorityBonusDays > 0 && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1 rounded font-bold">
                      +{seniority.seniorityBonusDays} ngày phép
                    </span>
                  )}
                  {seniority.isAnniversaryMonth && (
                    <span className="text-[10px] text-pink-600 font-black flex items-center gap-0.5 ml-1 animate-pulse" title="Tháng kỷ niệm gia nhập công ty">
                      <PartyPopper className="w-3 h-3" />
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Year selector & Quick Action */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-start lg:justify-end">
            <CustomSelect
              options={yearOptions}
              value={String(selectedYear)}
              onChange={(val) => setSelectedYear(Number(val))}
              icon={<Calendar className="w-4 h-4 text-blue-600" />}
              className="w-48 sm:w-52"
              buttonClassName="w-full h-10 px-3 py-2 bg-gray-50 hover:bg-gray-100/80 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 shadow-2xs"
            />

            <button
              onClick={() => setIsLeaveModalOpen(true)}
              className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer active:scale-95 whitespace-nowrap"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Tạo đơn xin nghỉ phép</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. TOP METRIC CARDS (QUỸ PHÉP & CÔNG THÁNG NÀY & HOA HỒNG) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Quỹ Phép Năm */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                  <Palmtree className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Quỹ Phép Năm {selectedYear}</h3>
                  <p className="text-[11px] text-gray-400 font-medium">Chính sách nghỉ phép theo luật</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
                Còn {effectiveLeave.remaining} ngày
              </span>
            </div>

            <div className="py-4 space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-bold text-gray-500">Đã dùng / Tổng cấp:</span>
                <div className="text-right">
                  <span className="text-xl font-black text-gray-900">{effectiveLeave.used}</span>
                  <span className="text-xs font-bold text-gray-400"> / {effectiveLeave.total} ngày</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${leaveUsagePercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 font-semibold">
                  <span>Đã dùng {leaveUsagePercent}%</span>
                  <span>Khả dụng {effectiveLeave.remaining} ngày</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
            <span className="flex items-center gap-1 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Tích lũy 1 ngày/tháng</span>
            </span>
            <button
              onClick={() => setIsLeaveModalOpen(true)}
              className="font-bold text-blue-600 hover:text-blue-700 cursor-pointer flex items-center gap-0.5"
            >
              <span>Nghỉ phép</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Card 2: Chấm Công Tháng Này */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Công Tháng {currentMonth}/{selectedYear}</h3>
                  <p className="text-[11px] text-gray-400 font-medium">Tiến độ ngày làm việc chuẩn</p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full font-bold text-xs border ${
                currentMonthStats.completionRate >= 100 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}>
                {currentMonthStats.completionRate}%
              </span>
            </div>

            <div className="py-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-500">Ngày công chuẩn:</span>
                <span className="font-bold text-gray-800">{currentMonthStats.standardDays} ngày</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-500">Công thực tế ghi nhận:</span>
                <span className="font-bold text-blue-600">{currentMonthStats.actualDays} ngày</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-500">Nghỉ hưởng lương (Lễ/Phép):</span>
                <span className="font-bold text-emerald-600">{currentMonthStats.paidLeaveDays} ngày</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
            <span className="font-medium">Nghỉ không lương: <strong className="text-rose-600">{currentMonthStats.unpaidLeaveDays} ngày</strong></span>
            <Link 
              to="/leave-requests" 
              state={{ tab: 'timesheet' }}
              className="font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 cursor-pointer"
            >
              <span>Bảng công</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Card 3: Doanh Số & Hoa Hồng Cá Nhân */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Hiệu Quả & Thu Nhập {selectedYear}</h3>
                  <p className="text-[11px] text-gray-400 font-medium">Hoa hồng & Kết quả kinh doanh</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 font-bold text-xs border border-amber-200">
                {annualSalesSummary.totalOrders} Đơn hàng
              </span>
            </div>

            <div className="py-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-500">Tổng doanh số chốt:</span>
                <span className="font-bold text-gray-900">{annualSalesSummary.totalSales.toLocaleString('vi-VN')} đ</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-500">Hoa hồng thực nhận:</span>
                <span className="font-bold text-emerald-600 text-sm">
                  {annualSalesSummary.totalCommission.toLocaleString('vi-VN')} đ
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-500">Hoa hồng tháng này:</span>
                <span className="font-bold text-amber-700">
                  {currentMonthStats.monthCommission.toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
            <span className="font-medium">Trạng thái: <strong className="text-gray-800">Đã đối soát</strong></span>
            <Link to="/orders" className="font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5">
              <span>Đơn hàng</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* 3. SECTION: LỊCH SỬ BẢNG CÔNG & THU NHẬP 12 THÁNG */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <span>Bảng Tổng Hợp Công & Lương Năm {selectedYear}</span>
            </h2>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              Chi tiết ngày công chuẩn, ngày công thực tế, ngày nghỉ phép và hoa hồng theo từng tháng
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-blue-700 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Bảng dữ liệu
            </button>
            <button
              onClick={() => setViewMode('chart')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'chart' ? 'bg-white text-blue-700 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Biểu đồ trực quan
            </button>
          </div>
        </div>

        {viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-bold uppercase text-gray-500 tracking-wider">
                  <th className="py-3.5 px-4">Tháng</th>
                  <th className="py-3.5 px-4 text-center">Công Chuẩn</th>
                  <th className="py-3.5 px-4 text-center">Công Thực Tế</th>
                  <th className="py-3.5 px-4 text-center">Nghỉ Lễ / Bù</th>
                  <th className="py-3.5 px-4 text-center">Nghỉ Phép Năm</th>
                  <th className="py-3.5 px-4 text-center">Không Lương</th>
                  <th className="py-3.5 px-4 text-center">Tỷ Lệ Đạt (%)</th>
                  <th className="py-3.5 px-4 text-right">Hoa Hồng (VNĐ)</th>
                  <th className="py-3.5 px-4 text-center">Đánh Giá</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {monthlyTimesheetData.map((m) => {
                  const isCurrent = selectedYear === currentYear && m.month === currentMonth;
                  const isFuture = selectedYear > currentYear || (selectedYear === currentYear && m.month > currentMonth);

                  return (
                    <tr 
                      key={m.month}
                      className={`transition-all ${
                        isCurrent 
                          ? 'bg-blue-50/60 font-bold hover:bg-blue-50/80' 
                          : isFuture 
                          ? 'text-gray-400 hover:bg-gray-50/50' 
                          : 'hover:bg-gray-50/80'
                      }`}
                    >
                      <td className="py-3 px-4 font-bold">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                            isCurrent 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            T{m.month}
                          </div>
                          <div>
                            <span className={isCurrent ? 'text-blue-700' : 'text-gray-800'}>
                              Tháng {m.month}/{selectedYear}
                            </span>
                            {isCurrent && (
                              <span className="ml-1.5 px-1.5 py-0.2 bg-blue-100 text-blue-800 text-[10px] rounded-md font-bold">
                                Hiện tại
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center font-bold text-gray-600">
                        {m.standardDays} ngày
                      </td>

                      <td className="py-3 px-4 text-center font-bold text-blue-600">
                        {isFuture ? '-' : `${m.actualDays} ngày`}
                      </td>

                      <td className="py-3 px-4 text-center font-bold text-gray-600">
                        {isFuture ? '-' : (m.holidayDays > 0 ? `${m.holidayDays} ngày` : '0')}
                      </td>

                      <td className="py-3 px-4 text-center font-bold text-emerald-600">
                        {isFuture ? '-' : (m.annualLeaveDays > 0 ? `${m.annualLeaveDays} ngày` : '0')}
                      </td>

                      <td className="py-3 px-4 text-center font-bold text-rose-600">
                        {isFuture ? '-' : (m.unpaidLeaveDays > 0 ? `${m.unpaidLeaveDays} ngày` : '0')}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {isFuture ? (
                          <span className="text-gray-300">-</span>
                        ) : (
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                            m.completionRate >= 100 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : m.completionRate >= 80 
                              ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {m.completionRate}%
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right font-bold text-gray-800">
                        {isFuture ? '-' : (
                          m.monthCommission > 0 ? (
                            <span className="text-emerald-600 font-bold">
                              {m.monthCommission.toLocaleString('vi-VN')} đ
                            </span>
                          ) : (
                            <span className="text-gray-400">0 đ</span>
                          )
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {isFuture ? (
                          <span className="text-gray-400 text-[11px] italic">Chưa tới</span>
                        ) : m.completionRate >= 100 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Đạt 100% công</span>
                          </span>
                        ) : m.unpaidLeaveDays > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Nghỉ trừ công</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600">
                            <Check className="w-3.5 h-3.5" />
                            <span>Đủ công phép</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Biểu đồ tỷ lệ hoàn thành công chuẩn (%) theo từng tháng
              </h3>
              <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 items-end h-44 pt-4 border-b border-gray-200 pb-2">
                {monthlyTimesheetData.map((m) => {
                  const heightPercent = Math.min(100, Math.max(10, m.completionRate));
                  const isCurrent = selectedYear === currentYear && m.month === currentMonth;
                  const isFuture = selectedYear > currentYear || (selectedYear === currentYear && m.month > currentMonth);

                  return (
                    <div key={m.month} className="flex flex-col items-center gap-1.5 h-full justify-end group">
                      <div className="text-[10px] font-bold text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isFuture ? '-' : `${m.completionRate}%`}
                      </div>
                      <div 
                        className={`w-full max-w-[28px] rounded-t-lg transition-all ${
                          isFuture 
                            ? 'bg-gray-100 h-2' 
                            : isCurrent 
                            ? 'bg-blue-600 shadow-sm' 
                            : m.completionRate >= 100 
                            ? 'bg-emerald-500' 
                            : 'bg-amber-400'
                        }`}
                        style={{ height: isFuture ? '8px' : `${heightPercent}%` }}
                      />
                      <span className={`text-[10px] font-bold ${isCurrent ? 'text-blue-700 font-bold' : 'text-gray-400'}`}>
                        T{m.month}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Commission Trend Chart */}
            <div className="space-y-3 pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Biến động hoa hồng & thu nhập kinh doanh (VNĐ)
              </h3>
              <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 items-end h-36 pt-4 border-b border-gray-200 pb-2">
                {monthlyTimesheetData.map((m) => {
                  const maxComm = Math.max(1, ...monthlyTimesheetData.map(x => x.monthCommission));
                  const heightPercent = m.monthCommission > 0 ? Math.min(100, Math.max(12, (m.monthCommission / maxComm) * 100)) : 4;
                  const isFuture = selectedYear > currentYear || (selectedYear === currentYear && m.month > currentMonth);

                  return (
                    <div key={m.month} className="flex flex-col items-center gap-1.5 h-full justify-end group">
                      <div className="text-[9px] font-bold text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity truncate max-w-full">
                        {m.monthCommission > 0 ? `${(m.monthCommission / 1000000).toFixed(1)}Tr` : ''}
                      </div>
                      <div 
                        className={`w-full max-w-[28px] rounded-t-lg transition-all ${
                          isFuture 
                            ? 'bg-gray-100' 
                            : m.monthCommission > 0 
                            ? 'bg-emerald-500 shadow-sm' 
                            : 'bg-gray-100'
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      />
                      <span className="text-[10px] font-bold text-gray-400">
                        T{m.month}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. SECTION: LỊCH SỬ ĐƠN NGHỈ PHÉP CỦA TÔI */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Palmtree className="w-5 h-5 text-emerald-600" />
              <span>Lịch Sử Đơn Nghỉ Phép Năm {selectedYear}</span>
            </h2>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              Danh sách các đơn xin nghỉ phép đã gửi và tiến độ phê duyệt
            </p>
          </div>

          <button
            onClick={() => setIsLeaveModalOpen(true)}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tạo đơn mới</span>
          </button>
        </div>

        {myLeaveRequests.length === 0 ? (
          <div className="p-12 text-center text-gray-400 font-medium text-xs flex flex-col items-center justify-center gap-2">
            <Palmtree className="w-8 h-8 text-gray-300" />
            <span>Bạn chưa có đơn xin nghỉ phép nào trong năm {selectedYear}.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-bold uppercase text-gray-500 tracking-wider">
                  <th className="py-3.5 px-4">Loại Nghỉ</th>
                  <th className="py-3.5 px-4">Khoảng Thời Gian</th>
                  <th className="py-3.5 px-4 text-center">Buổi Nghỉ</th>
                  <th className="py-3.5 px-4 text-center">Số Ngày Trừ Phép</th>
                  <th className="py-3.5 px-4">Lý Do / Bàn Giao</th>
                  <th className="py-3.5 px-4 text-center">Trạng Thái</th>
                  <th className="py-3.5 px-4 text-right">Người Phê Duyệt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {myLeaveRequests.map((req) => {
                  const typeCfg = LEAVE_TYPE_LABELS[req.type] || { label: req.type, color: 'text-gray-700', bg: 'bg-gray-100' };
                  
                  return (
                    <tr key={req.id} className="hover:bg-gray-50/80 transition-all">
                      <td className="py-3.5 px-4 font-bold text-gray-800">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${typeCfg.bg} ${typeCfg.color}`}>
                          {typeCfg.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-gray-700">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span>
                            {new Date(req.start_date).toLocaleDateString('vi-VN')}
                            {req.start_date !== req.end_date && ` - ${new Date(req.end_date).toLocaleDateString('vi-VN')}`}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center font-medium text-gray-600">
                        {req.leave_session === 'morning' ? 'Buổi sáng' : req.leave_session === 'afternoon' ? 'Buổi chiều' : 'Cả ngày'}
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-emerald-600">
                        {req.total_days || 1} ngày
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-medium text-gray-800 truncate" title={req.reason}>
                          {req.reason}
                        </div>
                        {req.handover_user_name && (
                          <div className="text-[10px] text-gray-400 font-medium">
                            Bàn giao: {req.handover_user_name}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {req.status === 'approved_final' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Đã duyệt hoàn tất</span>
                          </span>
                        ) : req.status === 'approved_level_1' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-200">
                            <Clock className="w-3 h-3" />
                            <span>Trưởng nhóm đã duyệt</span>
                          </span>
                        ) : req.status === 'rejected' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-[11px] border border-rose-200" title={req.rejection_reason || ''}>
                            <XCircle className="w-3 h-3" />
                            <span>Từ chối</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 font-bold text-[11px] border border-amber-200">
                            <Clock className="w-3 h-3" />
                            <span>Chờ duyệt</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-medium text-gray-700">
                        {req.approver_final_name ? (
                          <div className="text-[11px] text-emerald-700 font-bold">{req.approver_final_name}</div>
                        ) : req.approver_level_1_name ? (
                          <div className="text-[11px] text-blue-700 font-medium">L1: {req.approver_level_1_name}</div>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* LEAVE REQUEST MODAL POPUP */}
      <CreateLeaveRequestModal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
      />
    </div>
  );
}
