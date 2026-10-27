import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  Filter,
  Search,
  Plus,
  Trash2,
  ChevronRight,
  ShieldCheck,
  Building,
  Check,
  X,
  FileSpreadsheet,
  Settings,
  CalendarDays,
  Palmtree,
  Users,
  AlertCircle,
  Sparkles,
  AlertTriangle,
  Edit2,
  Edit3,
  RotateCcw,
  Printer
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import { LeaveRequest, LeaveStatus, LeaveType, HolidayType, Holiday } from '../types';
import { getLeaveRequestWorkdaysCount } from '../lib/payrollUtils';
import {
  isUserAuthorizedToApproveLeaveL1,
  isUserAuthorizedToApproveLeaveFinal
} from '../utils/permissionUtils';
import { CreateLeaveRequestModal, EmployeeLeaveBalanceWidget } from '../components/LeaveRequestModal';
import { TimesheetManagement } from '../components/TimesheetManagement';
import { LeaveBalanceManagement } from '../components/LeaveBalanceManagement';
import { DatePicker } from '../components/DatePicker';
import { CustomSelect } from '../components/CustomSelect';
import LeaveRequestPrintModal from '../components/LeaveRequestPrintModal';

export default function LeaveRequestsPage() {
  const { profile, user } = useAuth();
  const {
    leaveRequests,
    approveLeaveRequestLevel1,
    approveLeaveRequestFinal,
    rejectLeaveRequest,
    deleteLeaveRequest,
    holidays,
    addHoliday,
    updateHoliday,
    deleteHoliday,
    profilesList,
    leaveBalances,
    currentRole
  } = useCRM();

  const effectiveRole = currentRole || profile?.role || 'sale';
  const currentUserId = profile?.id || user?.id || '';
  const currentYear = new Date().getFullYear();

  const isLeader = ['sale_leader', 'marketing_leader', 'visa_leader', 'operator', 'admin', 'bod'].includes(effectiveRole);
  const isHRorBODorAdmin = ['hr', 'bod', 'admin'].includes(effectiveRole);
  const isHROrAdmin = ['hr', 'admin', 'bod'].includes(effectiveRole);

  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'my_leaves' | 'team_approval' | 'final_approval' | 'timesheet' | 'leave_balances' | 'holidays_settings'>('my_leaves');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Bộ lọc cho danh sách đơn
  const [statusFilter, setStatusFilter] = useState<'all' | LeaveStatus>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | LeaveType>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Handle navigation from notifications
  useEffect(() => {
    if (location.state) {
      if (location.state.tab) {
        setActiveTab(location.state.tab);
      }
      if (location.state.searchTarget) {
        setSearchTerm(location.state.searchTarget);
        setStatusFilter('all');
        setTypeFilter('all');
      }
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Modal Từ chối
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Modal Xác nhận Xóa đơn
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Modal In / Xuất đơn xin nghỉ phép
  const [selectedLeaveForPrint, setSelectedLeaveForPrint] = useState<LeaveRequest | null>(null);

  // Form Cấu hình / Chỉnh sửa ngày lễ
  const [editingHolidayId, setEditingHolidayId] = useState<string | null>(null);
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayName, setHolidayName] = useState('');
  const [holidayType, setHolidayType] = useState<HolidayType>('official_paid');
  const [holidayDescription, setHolidayDescription] = useState('');
  const [holidayRecurring, setHolidayRecurring] = useState(false);

  // Bộ lọc cho bảng danh sách ngày lễ
  const [holidayYearFilter, setHolidayYearFilter] = useState<string>(currentYear.toString());
  const [holidayMonthFilter, setHolidayMonthFilter] = useState<string>('all');
  const [holidaySearchQuery, setHolidaySearchQuery] = useState<string>('');

  // Đơn nghỉ phép của cá nhân tôi
  const myRequests = useMemo(() => {
    return leaveRequests.filter((r) => r.user_id === currentUserId);
  }, [leaveRequests, currentUserId]);

  // Đơn chờ Trưởng phòng duyệt cấp 1 (cho Leader/Admin/BOD - loại trừ đơn của chính mình)
  const pendingLevel1Requests = useMemo(() => {
    if (!isLeader) return [];
    return leaveRequests.filter((r) => {
      if (r.status !== 'pending') return false;
      // Tuyệt đối không tự duyệt đơn của chính mình
      if (r.user_id === currentUserId) return false;
      const creator = profilesList.find((p) => p.id === r.user_id);
      return isUserAuthorizedToApproveLeaveL1(
        currentUserId,
        effectiveRole,
        r.user_id,
        creator,
        profile
      );
    });
  }, [leaveRequests, isLeader, effectiveRole, profilesList, currentUserId, profile]);

  // Đơn chờ HR / BOD / Admin duyệt cấp 2 (Final - loại trừ đơn của chính mình)
  const pendingFinalRequests = useMemo(() => {
    if (!isHRorBODorAdmin) return [];
    return leaveRequests.filter((r) => {
      // Tuyệt đối không tự duyệt đơn của chính mình
      if (r.user_id === currentUserId) return false;
      return (
        r.status === 'approved_level_1' ||
        (['admin', 'bod', 'hr'].includes(effectiveRole) && r.status === 'pending')
      );
    });
  }, [leaveRequests, isHRorBODorAdmin, effectiveRole, currentUserId]);

  // Danh sách theo tab hiện tại
  const displayRequests = useMemo(() => {
    let list: LeaveRequest[] = [];
    if (activeTab === 'my_leaves') {
      list = myRequests;
    } else if (activeTab === 'team_approval') {
      // Hiển thị toàn bộ đơn của các thành viên thuộc nhóm do Leader phụ trách (để theo dõi tiến trình kể cả sau khi đã duyệt C1)
      list = leaveRequests.filter((r) => {
        if (r.user_id === currentUserId) return false;
        const creator = profilesList.find((p) => p.id === r.user_id);
        return isUserAuthorizedToApproveLeaveL1(
          currentUserId,
          effectiveRole,
          r.user_id,
          creator,
          profile
        );
      });
    } else if (activeTab === 'final_approval') {
      // Dành cho HR / BOD / Admin xem toàn bộ đơn của nhân sự để duyệt hoặc kiểm tra lịch sử
      list = leaveRequests.filter((r) => r.user_id !== currentUserId);
    } else {
      list = leaveRequests;
    }

    return list.filter((req) => {
      if (statusFilter !== 'all' && req.status !== statusFilter) return false;
      if (typeFilter !== 'all' && req.type !== typeFilter) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const nameMatch = (req.user_name || '').toLowerCase().includes(term);
        const reasonMatch = (req.reason || '').toLowerCase().includes(term);
        const handoverMatch = (req.handover_user_name || '').toLowerCase().includes(term);
        if (!nameMatch && !reasonMatch && !handoverMatch) return false;
      }
      return true;
    });
  }, [activeTab, myRequests, leaveRequests, statusFilter, typeFilter, searchTerm, effectiveRole, profilesList, currentUserId, profile]);

  const handleConfirmReject = async () => {
    if (!rejectingId) return;
    if (!rejectReason.trim()) {
      alert('Vui lòng nhập lý do từ chối.');
      return;
    }
    await rejectLeaveRequest(
      rejectingId,
      profile?.full_name || user?.email || (effectiveRole === 'bod' ? 'Ban Giám Đốc' : effectiveRole === 'hr' ? 'Nhân sự (HR)' : 'Quản lý'),
      rejectReason.trim()
    );
    setRejectingId(null);
    setRejectReason('');
  };

  const handleStartEditHoliday = (h: Holiday) => {
    setEditingHolidayId(h.id);
    setHolidayDate(h.date);
    setHolidayName(h.name);
    setHolidayType(h.holiday_type || 'official_paid');
    setHolidayDescription(h.description || '');
    setHolidayRecurring(h.is_recurring ?? false);
  };

  const handleCancelEditHoliday = () => {
    setEditingHolidayId(null);
    setHolidayDate('');
    setHolidayName('');
    setHolidayDescription('');
    setHolidayType('official_paid');
    setHolidayRecurring(false);
  };

  const handleSaveHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayDate || !holidayName.trim()) {
      alert('Vui lòng chọn ngày và nhập tên ngày lễ.');
      return;
    }

    if (editingHolidayId) {
      await updateHoliday(editingHolidayId, {
        date: holidayDate,
        name: holidayName.trim(),
        holiday_type: holidayType,
        description: holidayDescription.trim(),
        is_recurring: holidayRecurring
      });
      handleCancelEditHoliday();
    } else {
      await addHoliday({
        date: holidayDate,
        name: holidayName.trim(),
        holiday_type: holidayType,
        description: holidayDescription.trim(),
        is_recurring: holidayRecurring
      });
      handleCancelEditHoliday();
    }
  };

  // Tính danh sách các năm xuất hiện trong ngày lễ để đưa vào bộ lọc
  const holidayAvailableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    yearsSet.add(currentYear.toString());
    yearsSet.add((currentYear - 1).toString());
    yearsSet.add((currentYear + 1).toString());
    holidays.forEach(h => {
      if (h.date) {
        const y = h.date.split('-')[0];
        if (y) yearsSet.add(y);
      }
    });
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [holidays, currentYear]);

  // Danh sách ngày lễ sau khi lọc theo Năm, Tháng, Từ khóa
  const filteredHolidays = useMemo(() => {
    return holidays
      .filter(h => {
        if (!h.date) return false;
        const [year, month] = h.date.split('-');

        // Lọc theo năm
        if (holidayYearFilter !== 'all') {
          if (year !== holidayYearFilter && !h.is_recurring) return false;
        }

        // Lọc theo tháng
        if (holidayMonthFilter !== 'all') {
          const mNum = parseInt(month, 10).toString();
          if (mNum !== holidayMonthFilter) return false;
        }

        // Lọc theo từ khóa
        if (holidaySearchQuery.trim()) {
          const q = holidaySearchQuery.toLowerCase();
          const nameMatch = (h.name || '').toLowerCase().includes(q);
          const descMatch = (h.description || '').toLowerCase().includes(q);
          if (!nameMatch && !descMatch) return false;
        }

        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [holidays, holidayYearFilter, holidayMonthFilter, holidaySearchQuery]);

  const getLeaveTypeBadge = (type: LeaveType) => {
    switch (type) {
      case 'annual':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">🌴 Phép năm</span>;
      case 'unpaid':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">⏳ Không lương</span>;
      case 'compensatory':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">🔄 Nghỉ bù</span>;
      case 'special':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">🎁 Chế độ</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-50 text-slate-700">{type}</span>;
    }
  };

  const getStatusBadge = (status: LeaveStatus) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/80">
            <Clock className="w-3.5 h-3.5 mr-1 animate-pulse" /> Chờ Trưởng nhóm duyệt (C1)
          </span>
        );
      case 'approved_level_1':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-cyan-50 text-cyan-800 border border-cyan-200/80">
            <UserCheck className="w-3.5 h-3.5 mr-1 text-cyan-600" /> Trưởng nhóm đã duyệt • Chờ HR/BOD duyệt (C2)
          </span>
        );
      case 'approved_final':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Đã duyệt hoàn tất (Cấp cuối)
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200/80">
            <XCircle className="w-3.5 h-3.5 mr-1 text-rose-600" /> Đã từ chối
          </span>
        );
      default:
        return null;
    }
  };

  // Quyền truy cập hạn chế đối với Đại lý / CTV (không áp dụng nhân sự nội bộ)
  if (effectiveRole === 'agent') {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center font-sans">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-xs max-w-lg mx-auto">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mx-auto mb-4">
            <Palmtree className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Quyền truy cập hạn chế</h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-6">
            Chức năng <strong>Nghỉ phép & Chấm công</strong> chỉ áp dụng cho cán bộ công nhân viên chính thức thuộc công ty.
            Tài khoản Đại lý / Cộng tác viên không áp dụng nghiệp vụ này.
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-xs cursor-pointer"
          >
            Quay về Lịch khởi hành
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header chính */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Palmtree className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              Quản lý Nghỉ phép & Chấm công
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 font-medium">
            Theo dõi quỹ phép năm, quy trình duyệt 2 cấp (Trưởng nhóm → HR/BOD) và hạch toán ngày công
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Tạo đơn xin nghỉ phép</span>
          </button>
        </div>
      </div>

      {/* Widget Quỹ Phép Năm Cá Nhân (Đã ẩn nút tạo đơn bên trong để tránh trùng lặp nút) */}
      <EmployeeLeaveBalanceWidget showActionButton={false} />

      {/* Thanh Tabs Điều Hướng */}
      <div className="border-b border-gray-200 pb-2 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 min-w-max flex-nowrap">
          <button
            onClick={() => setActiveTab('my_leaves')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'my_leaves'
                ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-600'
                : 'bg-white text-gray-700 hover:bg-gray-100/80 border border-gray-200 hover:text-gray-900'
            }`}
          >
            <Palmtree className="w-3.5 h-3.5 shrink-0" />
            <span>Đơn của tôi</span>
            {myRequests.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${activeTab === 'my_leaves' ? 'bg-blue-800 text-white' : 'bg-gray-100 text-gray-700 border border-gray-300'}`}>
                {myRequests.length}
              </span>
            )}
          </button>

          {isLeader && (
            <button
              onClick={() => setActiveTab('team_approval')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'team_approval'
                  ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-600'
                  : 'bg-white text-gray-700 hover:bg-gray-100/80 border border-gray-200 hover:text-gray-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Duyệt C1 & Đơn nhóm</span>
              {pendingLevel1Requests.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                  {pendingLevel1Requests.length}
                </span>
              )}
            </button>
          )}

          {isHRorBODorAdmin && (
            <button
              onClick={() => setActiveTab('final_approval')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'final_approval'
                  ? 'bg-cyan-600 text-white shadow-sm ring-1 ring-cyan-600'
                  : 'bg-white text-gray-700 hover:bg-gray-100/80 border border-gray-200 hover:text-gray-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Duyệt Cấp Cuối</span>
              {pendingFinalRequests.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                  {pendingFinalRequests.length}
                </span>
              )}
            </button>
          )}

          {/* Tab Bảng Chấm Công (Hiển thị theo phân quyền dữ liệu) */}
          <button
            onClick={() => setActiveTab('timesheet')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'timesheet'
                ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-600'
                : 'bg-white text-gray-700 hover:bg-gray-100/80 border border-gray-200 hover:text-gray-900'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
            <span>Bảng chấm công</span>
          </button>

          {/* Tab Quản lý & Điều chỉnh Quỹ Phép Năm (Dành cho HR, BOD, Admin) */}
          {isHROrAdmin && (
            <button
              onClick={() => setActiveTab('leave_balances')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'leave_balances'
                  ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-600'
                  : 'bg-white text-gray-700 hover:bg-gray-100/80 border border-gray-200 hover:text-gray-900'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5 shrink-0" />
              <span>Quỹ Phép ({currentYear})</span>
            </button>
          )}

          {/* Tab Cấu hình Ngày lễ (Dành cho HR, BOD, Admin, Kế toán) */}
          {isHRorBODorAdmin && (
            <button
              onClick={() => setActiveTab('holidays_settings')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'holidays_settings'
                  ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-800'
                  : 'bg-white text-gray-700 hover:bg-gray-100/80 border border-gray-200 hover:text-gray-900'
              }`}
            >
              <Settings className="w-3.5 h-3.5 shrink-0" />
              <span>Cấu hình Ngày lễ</span>
            </button>
          )}
        </div>
      </div>

      {/* Nội dung Tab: Bảng chấm công */}
      {activeTab === 'timesheet' && (
        <div className="space-y-6">
          <TimesheetManagement />
        </div>
      )}

      {/* Nội dung Tab: Quản lý Quỹ Phép Năm Nhân Sự */}
      {activeTab === 'leave_balances' && (
        <div className="space-y-6">
          <LeaveBalanceManagement />
        </div>
      )}

      {/* Nội dung Tab: Cấu hình Ngày lễ & Nghỉ bù */}
      {activeTab === 'holidays_settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form thêm / sửa ngày lễ */}
          <div className={`lg:col-span-1 bg-white p-5 rounded-2xl border shadow-2xs space-y-4 transition-all ${
            editingHolidayId ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-gray-200'
          }`}>
            <div className="flex items-center justify-between border-b border-gray-150 pb-3">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${editingHolidayId ? 'bg-amber-100 text-amber-700' : 'bg-indigo-50 text-indigo-600'}`}>
                  {editingHolidayId ? <Edit2 className="w-5 h-5" /> : <CalendarDays className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900">
                    {editingHolidayId ? 'Cập Nhật Ngày Lễ' : 'Thêm Ngày Lễ / Nghỉ Bù'}
                  </h2>
                  <p className="text-[11px] text-gray-500">
                    {editingHolidayId ? 'Chỉnh sửa thông tin ngày nghỉ lễ đã chọn' : 'Khai báo ngày nghỉ được trừ công hoặc hưởng lương'}
                  </p>
                </div>
              </div>
              {editingHolidayId && (
                <button
                  type="button"
                  onClick={handleCancelEditHoliday}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Hủy sửa</span>
                </button>
              )}
            </div>
            <form onSubmit={handleSaveHoliday} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Chọn Ngày Nghỉ Lễ <span className="text-rose-500">*</span>
                </label>
                <DatePicker
                  value={holidayDate}
                  onChange={(dateStr) => setHolidayDate(dateStr)}
                  placeholder="Chọn ngày lễ (dd/mm/yyyy)"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Tên Ngày Lễ / Nghỉ Bù <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={holidayName}
                  onChange={(e) => setHolidayName(e.target.value)}
                  placeholder="VD: Nghỉ hoán đổi Quốc khánh, Giỗ Tổ..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <CustomSelect
                  label="Loại Ngày Nghỉ *"
                  value={holidayType}
                  onChange={(val) => setHolidayType(val as HolidayType)}
                  options={[
                    { value: 'official_paid', label: '⭐ Nghỉ lễ chính thức (Hưởng nguyên lương)' },
                    { value: 'bridge_annual_or_unpaid', label: '🌴 Nghỉ hoán đổi / cầu nối (Trừ phép năm)' },
                    { value: 'unpaid_company', label: '⚠️ Nghỉ không lương toàn công ty' },
                  ]}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Ghi chú / Hướng dẫn
                </label>
                <input
                  type="text"
                  value={holidayDescription}
                  onChange={(e) => setHolidayDescription(e.target.value)}
                  placeholder="VD: Trừ 1 ngày phép năm theo thông báo số 12..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="recurring"
                  checked={holidayRecurring}
                  onChange={(e) => setHolidayRecurring(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded-md border-gray-300 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="recurring" className="text-xs font-bold text-gray-700 cursor-pointer select-none">
                  Lặp lại hàng năm (Dương lịch)
                </label>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  className={`flex-1 py-2.5 px-4 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    editingHolidayId
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {editingHolidayId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  <span>{editingHolidayId ? 'Lưu Cập Nhật Ngày Lễ' : 'Lưu Ngày Nghỉ / Lễ'}</span>
                </button>
                {editingHolidayId && (
                  <button
                    type="button"
                    onClick={handleCancelEditHoliday}
                    className="py-2.5 px-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Danh sách ngày lễ đã cấu hình */}
          <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
            {/* Header và Thống kê */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-150 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h2 className="text-sm font-bold text-gray-900">Danh Sách Ngày Lễ Hệ Thống</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  <span>Hiển thị:</span>
                  <strong className="text-blue-900">{filteredHolidays.length}</strong>
                  <span>/ {holidays.length} ngày</span>
                </span>
              </div>
            </div>

            {/* Thanh Bộ Lọc Năm, Tháng & Tìm Kiếm */}
            <div className="flex flex-wrap items-center gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
              {/* Lọc theo Năm */}
              <div className="w-40 sm:w-44">
                <CustomSelect
                  value={holidayYearFilter}
                  onChange={(val) => setHolidayYearFilter(val)}
                  options={[
                    { value: 'all', label: 'Tất cả các năm' },
                    ...holidayAvailableYears.map((y) => ({
                      value: y,
                      label: `Năm ${y}`
                    }))
                  ]}
                  icon={<Calendar className="w-4 h-4 text-slate-500" />}
                  placeholder="Chọn năm..."
                  buttonClassName="h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs hover:border-slate-300 w-full"
                />
              </div>

              {/* Lọc theo Tháng */}
              <div className="w-44 sm:w-48">
                <CustomSelect
                  value={holidayMonthFilter}
                  onChange={(val) => setHolidayMonthFilter(val)}
                  options={[
                    { value: 'all', label: 'Tất cả các tháng' },
                    { value: '1', label: 'Tháng 01' },
                    { value: '2', label: 'Tháng 02' },
                    { value: '3', label: 'Tháng 03' },
                    { value: '4', label: 'Tháng 04' },
                    { value: '5', label: 'Tháng 05' },
                    { value: '6', label: 'Tháng 06' },
                    { value: '7', label: 'Tháng 07' },
                    { value: '8', label: 'Tháng 08' },
                    { value: '9', label: 'Tháng 09' },
                    { value: '10', label: 'Tháng 10' },
                    { value: '11', label: 'Tháng 11' },
                    { value: '12', label: 'Tháng 12' }
                  ]}
                  icon={<Filter className="w-4 h-4 text-slate-500" />}
                  placeholder="Chọn tháng..."
                  buttonClassName="h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs hover:border-slate-300 w-full"
                />
              </div>

              {/* Tìm kiếm từ khóa */}
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={holidaySearchQuery}
                    onChange={(e) => setHolidaySearchQuery(e.target.value)}
                    placeholder="Tìm theo tên hoặc mô tả ngày lễ..."
                    className="w-full h-10 pl-9 pr-3.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 shadow-2xs hover:border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden placeholder:text-slate-400"
                  />
                </div>
              </div>

              {(holidayYearFilter !== 'all' || holidayMonthFilter !== 'all' || holidaySearchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setHolidayYearFilter('all');
                    setHolidayMonthFilter('all');
                    setHolidaySearchQuery('');
                  }}
                  className="h-10 px-3.5 inline-flex items-center text-xs font-bold text-rose-600 hover:text-rose-700 rounded-xl bg-rose-50/80 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer whitespace-nowrap"
                >
                  Xóa lọc
                </button>
              )}
            </div>

            {filteredHolidays.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-xs">
                {holidays.length === 0 
                  ? 'Chưa có ngày lễ nào được thiết lập. Hãy thêm ngày lễ bên trái để hệ thống tự trừ khi tính ngày công.'
                  : 'Không tìm thấy ngày lễ nào phù hợp với bộ lọc hiện tại.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-600 uppercase font-black tracking-wider border-b border-gray-200">
                    <tr>
                      <th className="py-2.5 px-3">Ngày Lễ</th>
                      <th className="py-2.5 px-3">Tên & Phân Loại Ngày Nghỉ</th>
                      <th className="py-2.5 px-3 text-center">Lặp Lại</th>
                      <th className="py-2.5 px-3 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150">
                    {filteredHolidays.map((h) => {
                      const hType = h.holiday_type || 'official_paid';
                      const isCurrentEditing = editingHolidayId === h.id;
                      return (
                        <tr key={h.id} className={`transition-colors ${
                          isCurrentEditing ? 'bg-amber-50/80 font-medium' : 'hover:bg-slate-50'
                        }`}>
                          <td className="py-2.5 px-3 font-bold text-blue-600 whitespace-nowrap">
                            {h.date.split('-').reverse().join('/')}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-gray-900">{h.name}</span>
                              {hType === 'official_paid' && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <Sparkles className="w-3 h-3 text-emerald-600 shrink-0" />
                                  <span>Lễ hưởng lương</span>
                                </span>
                              )}
                              {hType === 'bridge_annual_or_unpaid' && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  <Palmtree className="w-3 h-3 text-blue-600 shrink-0" />
                                  <span>Cầu nối: Trừ phép / Ko lương</span>
                                </span>
                              )}
                              {hType === 'unpaid_company' && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                                  <span>Không lương Cty</span>
                                </span>
                              )}
                            </div>
                            {h.description && (
                              <div className="text-[11px] text-gray-400 mt-0.5">{h.description}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {h.is_recurring ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Hàng năm
                              </span>
                            ) : (
                              <span className="text-gray-400 font-medium">Một lần</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleStartEditHoliday(h)}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  isCurrentEditing 
                                    ? 'bg-amber-200 text-amber-800' 
                                    : 'text-amber-600 hover:text-amber-800 hover:bg-amber-50'
                                }`}
                                title="Sửa ngày lễ"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Bạn có chắc muốn xóa ngày lễ "${h.name}" (${h.date.split('-').reverse().join('/')})?`)) {
                                    deleteHoliday(h.id);
                                    if (editingHolidayId === h.id) handleCancelEditHoliday();
                                  }
                                }}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Xóa ngày lễ"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Nội dung Tab: Danh sách đơn nghỉ phép (my_leaves, team_approval, final_approval) */}
      {(activeTab === 'my_leaves' || activeTab === 'team_approval' || activeTab === 'final_approval') && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs">
          {/* Bộ lọc & Tìm kiếm */}
          <div className="p-4 border-b border-gray-150 bg-slate-50/50 rounded-t-2xl flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap items-end gap-2.5 flex-1 min-w-[280px]">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-xs flex flex-col gap-1">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Tìm kiếm
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Tìm nhân viên, lý do, người bàn giao..."
                    className="w-full h-[38px] pl-9 pr-3 bg-white border border-gray-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-hidden transition-all"
                  />
                </div>
              </div>

              {/* Lọc Trạng thái */}
              <CustomSelect
                value={statusFilter}
                onChange={(val) => setStatusFilter(val as any)}
                options={[
                  { value: 'all', label: 'Tất cả trạng thái' },
                  { value: 'pending', label: 'Chờ Trưởng nhóm duyệt (C1)' },
                  { value: 'approved_level_1', label: 'Trưởng nhóm đã duyệt (C1)' },
                  { value: 'approved_final', label: 'Đã duyệt hoàn tất (Cấp cuối)' },
                  { value: 'rejected', label: 'Đã từ chối' },
                ]}
                icon={<Clock className="w-3.5 h-3.5 text-gray-500" />}
                label="Trạng thái"
                className="w-64 sm:w-72"
              />

              {/* Lọc Loại nghỉ */}
              <CustomSelect
                value={typeFilter}
                onChange={(val) => setTypeFilter(val as any)}
                options={[
                  { value: 'all', label: 'Tất cả loại nghỉ' },
                  { value: 'annual', label: '🌴 Phép năm' },
                  { value: 'unpaid', label: '⏳ Không lương' },
                  { value: 'compensatory', label: '🔄 Nghỉ bù' },
                  { value: 'special', label: '🎁 Chế độ' },
                ]}
                icon={<Filter className="w-3.5 h-3.5 text-gray-500" />}
                label="Loại nghỉ"
                className="w-48"
              />
            </div>

            <div className="text-xs text-gray-500 font-medium pb-2">
              Hiển thị <strong className="text-gray-900">{displayRequests.length}</strong> đơn
            </div>
          </div>

          {/* Danh sách Bảng */}
          {displayRequests.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Palmtree className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="font-semibold text-gray-600">
                {activeTab === 'my_leaves' ? 'Bạn chưa tạo đơn xin nghỉ phép nào.' : 'Không có đơn nào cần xử lý.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-b-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-600 uppercase font-black tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4 min-w-[150px] text-left">Nhân Viên</th>
                    <th className="py-3 px-4 min-w-[120px] text-left">Loại Nghỉ</th>
                    <th className="py-3 px-4 min-w-[185px] text-left">Thời Gian</th>
                    <th className="py-3 px-4 min-w-[110px] text-center">Số Ngày Công</th>
                    <th className="py-3 px-4 min-w-[220px] text-left">Lý Do & Bàn Giao</th>
                    <th className="py-3 px-4 min-w-[180px] text-left">Trạng Thái</th>
                    <th className="py-3 px-4 min-w-[180px] text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150">
                  {displayRequests.map((req) => {
                    const session = req.leave_session || 'all_day';
                    const daysCount = req.total_days !== undefined
                      ? req.total_days
                      : getLeaveRequestWorkdaysCount(req.start_date, req.end_date, holidays, session);
                    const isMyRequest = req.user_id === currentUserId;
                    const canDelete = (isMyRequest && (req.status === 'pending' || req.status === 'rejected')) || isHRorBODorAdmin;

                    const creator = profilesList.find((p) => p.id === req.user_id);

                    // Quyền duyệt cấp 2 / Duyệt Cuối: HR, BOD, Admin (TUYỆT ĐỐI KHÔNG TỰ DUYỆT ĐƠN CỦA CHÍNH MÌNH)
                    const canApproveFinal = !isMyRequest && isUserAuthorizedToApproveLeaveFinal(currentUserId, effectiveRole, req.user_id) && (
                      req.status === 'approved_level_1' ||
                      (['admin', 'bod', 'hr'].includes(effectiveRole) && req.status === 'pending')
                    );

                    // Quyền duyệt cấp 1: Leader được chỉ định hoặc BOD/Admin (TUYỆT ĐỐI KHÔNG TỰ DUYỆT ĐƠN CỦA CHÍNH MÌNH)
                    const canApproveL1 = !isMyRequest && isUserAuthorizedToApproveLeaveL1(currentUserId, effectiveRole, req.user_id, creator, profile) && req.status === 'pending' && !canApproveFinal;

                    return (
                      <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-gray-900 flex items-center gap-1.5 whitespace-nowrap">
                            <span>{req.user_name || 'Nhân viên'}</span>
                            {isMyRequest && (
                              <span className="px-1.5 py-0.2 rounded-md bg-blue-100 text-blue-700 text-[10px] font-black shrink-0">
                                Tôi
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-400 mt-0.5 whitespace-nowrap">
                            Gửi ngày: {new Date(req.created_at || '').toLocaleDateString('vi-VN')}
                          </div>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          {getLeaveTypeBadge(req.type)}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-bold text-gray-800">
                            {req.start_date.split('-').reverse().join('/')} 
                            <span className="text-gray-400 font-normal mx-1">đến</span> 
                            {req.end_date.split('-').reverse().join('/')}
                          </div>
                          {session !== 'all_day' && (
                            <div className="mt-0.5">
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                session === 'morning' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-orange-50 text-orange-700 border border-orange-200'
                              }`}>
                                {session === 'morning' ? '☀️ Buổi sáng' : '🌅 Buổi chiều'}
                              </span>
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black bg-blue-50 text-blue-700 border border-blue-200">
                            {daysCount} ngày công
                          </span>
                        </td>

                        <td className="py-3 px-4 min-w-[220px]">
                          <div className="font-medium text-gray-900 line-clamp-2" title={req.reason}>
                            {req.reason}
                          </div>
                          {req.handover_user_name && (
                            <div className="text-[11px] text-gray-500 mt-1 flex items-center gap-1.5 whitespace-nowrap">
                              <span className="text-gray-500 font-normal shrink-0">🤝 Bàn giao:</span>
                              <strong className="text-gray-800 font-bold truncate">{req.handover_user_name}</strong>
                            </div>
                          )}
                          {req.rejection_reason && (
                            <div className="text-[11px] text-rose-600 mt-1 font-semibold">
                              ❌ Lý do từ chối: {req.rejection_reason}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          {getStatusBadge(req.status)}
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Nút Xuất / In Đơn Xin Nghỉ Phép */}
                            <button
                              type="button"
                              onClick={() => setSelectedLeaveForPrint(req)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 transition-all cursor-pointer whitespace-nowrap shadow-2xs"
                              title="In / Xuất Đơn xin nghỉ phép (A4)"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Xuất đơn</span>
                            </button>

                            {/* Nút Duyệt Cấp 1 (Trưởng nhóm) */}
                            {canApproveL1 && (
                              <button
                                onClick={() => approveLeaveRequestLevel1(req.id, profile?.full_name || (['admin', 'bod'].includes(effectiveRole) ? 'Ban Giám Đốc' : 'Trưởng nhóm'))}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer whitespace-nowrap"
                                title="Trưởng nhóm / BOD duyệt cấp 1"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Duyệt C1</span>
                              </button>
                            )}

                            {/* Nút Duyệt Cấp 2 / Duyệt Cuối (HR / BOD / Admin) */}
                            {canApproveFinal && (
                              <button
                                onClick={() => approveLeaveRequestFinal(req.id, profile?.full_name || (effectiveRole === 'hr' ? 'Nhân sự (HR)' : effectiveRole === 'bod' ? 'Ban Giám Đốc (BOD)' : 'Quản trị viên (Admin)'))}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer whitespace-nowrap"
                                title="HR / BOD / Admin duyệt hoàn tất"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Duyệt Cuối</span>
                              </button>
                            )}

                            {/* Nút Từ chối (Cho Leader / HR / Admin khi chưa duyệt xong, tuyệt đối không tự từ chối đơn của mình) */}
                            {!isMyRequest && (canApproveL1 || canApproveFinal) && req.status !== 'approved_final' && req.status !== 'rejected' && (
                              <button
                                onClick={() => {
                                  setRejectingId(req.id);
                                  setRejectReason('');
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-all cursor-pointer whitespace-nowrap"
                                title="Từ chối đơn"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Từ chối</span>
                              </button>
                            )}

                            {/* Nút Xoá đơn (Dành cho người tạo khi đơn pending/rejected hoặc HR/BOD/Admin) */}
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => setDeletingId(req.id)}
                                className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                title="Xóa đơn"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal Tạo Đơn Xin Nghỉ Phép */}
      <CreateLeaveRequestModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* Modal Từ Chối Đơn */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center gap-2 text-rose-600 border-b border-gray-150 pb-3">
              <XCircle className="w-5 h-5" />
              <h3 className="text-base font-black">Xác nhận Từ Chối Đơn Nghỉ Phép</h3>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Lý do từ chối <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Nhập lý do từ chối để nhân viên nắm được thông tin..."
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-150">
              <button
                type="button"
                onClick={() => setRejectingId(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-all cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-all shadow-sm cursor-pointer"
              >
                Xác nhận Từ chối
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xác Nhận Xóa Đơn */}
      {deletingId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center gap-2 text-rose-600 border-b border-gray-150 pb-3">
              <Trash2 className="w-5 h-5" />
              <h3 className="text-base font-black">Xác nhận Xóa Đơn Nghỉ Phép</h3>
            </div>
            <p className="text-xs font-medium text-gray-600 leading-relaxed">
              Bạn có chắc chắn muốn xóa đơn xin nghỉ phép này? Dữ liệu đơn nghỉ phép và số ngày phép năm liên quan sẽ được tự động cập nhật lại.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-150">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-all cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteLeaveRequest(deletingId);
                  setDeletingId(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-all shadow-sm cursor-pointer"
              >
                Xác nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}
      {/* PRINT PREVIEW MODAL CHO ĐƠN XIN NGHỈ PHÉP */}
      <LeaveRequestPrintModal
        isOpen={!!selectedLeaveForPrint}
        onClose={() => setSelectedLeaveForPrint(null)}
        leaveRequest={selectedLeaveForPrint}
        employeePhone={profilesList.find(p => p.id === selectedLeaveForPrint?.user_id)?.phone || profile?.phone}
        hireDate={
          profilesList.find(p => p.id === selectedLeaveForPrint?.user_id)?.join_date ||
          profilesList.find(p => p.id === selectedLeaveForPrint?.user_id)?.official_start_date ||
          profilesList.find(p => p.id === selectedLeaveForPrint?.user_id)?.created_at ||
          profile?.join_date ||
          profile?.official_start_date ||
          profile?.created_at
        }
        departmentName={
          profilesList.find(p => p.id === selectedLeaveForPrint?.user_id)?.role === 'marketing' || profilesList.find(p => p.id === selectedLeaveForPrint?.user_id)?.role === 'marketing_leader' ? 'Marketing' :
          profilesList.find(p => p.id === selectedLeaveForPrint?.user_id)?.role === 'sale' || profilesList.find(p => p.id === selectedLeaveForPrint?.user_id)?.role === 'sale_leader' ? 'Kinh doanh (Sales)' :
          profilesList.find(p => p.id === selectedLeaveForPrint?.user_id)?.role === 'operator' ? 'Điều hành Tour' :
          profilesList.find(p => p.id === selectedLeaveForPrint?.user_id)?.role === 'accounting' ? 'Kế toán' :
          profilesList.find(p => p.id === selectedLeaveForPrint?.user_id)?.role === 'hr' ? 'Hành chính Nhân sự' :
          profilesList.find(p => p.id === selectedLeaveForPrint?.user_id)?.role === 'visa' ? 'Bộ phận Visa' :
          profilesList.find(p => p.id === selectedLeaveForPrint?.user_id)?.role === 'tour_guide' ? 'Hướng dẫn viên' :
          'Văn phòng Công ty'
        }
      />
    </div>
  );
}
