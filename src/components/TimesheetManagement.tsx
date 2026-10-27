import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Download,
  Filter,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Building,
  RefreshCw,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  Palmtree,
  AlertTriangle,
  Shield
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import { calculateEmployeeTimesheet, calculateStandardWorkingDays } from '../lib/payrollUtils';
import { EmployeeTimesheetRow, Holiday, HolidayType, getRoleConfig, ROLE_DEPARTMENT_ORDER, EMPLOYMENT_STATUS_LABELS } from '../types';
import { DatePicker } from './DatePicker';
import { CustomSelect, SelectOption } from './CustomSelect';

export const TimesheetManagement: React.FC = () => {
  const { profile } = useAuth();
  const { profilesList, leaveRequests, holidays, addHoliday, deleteHoliday, leaveBalances, updateLeaveBalance, currentRole } = useCRM();

  const currentUserId = profile?.id || '';
  const effectiveRole = currentRole || profile?.role || 'sale';

  const isHRorBODorAdmin = ['hr', 'bod', 'admin', 'accounting'].includes(effectiveRole);
  const isLeader = ['sale_leader', 'marketing_leader', 'visa_leader', 'operator'].includes(effectiveRole);
  // Quyền xuất file Excel: Chỉ dành cho HR, Ban Giám Đốc (bod) và Quản trị viên (admin)
  const canExportExcel = ['hr', 'bod', 'admin'].includes(effectiveRole);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');

  // Modal quản lý ngày lễ
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayType, setNewHolidayType] = useState<HolidayType>('official_paid');
  const [newHolidayDescription, setNewHolidayDescription] = useState('');
  const [newHolidayRecurring, setNewHolidayRecurring] = useState(false);

  // Modal điều chỉnh quỹ phép nhanh
  const [quickEditUserId, setQuickEditUserId] = useState<string | null>(null);
  const [quickEditTotal, setQuickEditTotal] = useState<number>(12);
  const [quickEditUsed, setQuickEditUsed] = useState<number>(0);
  const [quickEditNote, setQuickEditNote] = useState<string>('');

  // Danh sách nhân viên theo phân quyền hiển thị (loại trừ Admin, Đại lý và CTV - mặc định sắp xếp theo bộ phận)
  const staffProfiles = useMemo(() => {
    const deletedIds = new Set(JSON.parse(localStorage.getItem('crm_deleted_user_ids') || '[]'));
    return profilesList
      .filter((p) => {
        if (deletedIds.has(p.id)) return false;
        // Loại trừ Admin, Đại lý và CTV ra khỏi danh sách chấm công
        if (p.role === 'admin' || p.role === 'agent' || p.role === 'CTV') return false;

        // Chỉ tính công cho nhân viên công ty (sale, leader, operator, accounting, visa, bod, tour_guide, marketing...)
        const isInternalStaff = ['hr', 'sale', 'sale_leader', 'operator', 'accounting', 'visa', 'bod', 'tour_guide', 'marketing', 'marketing_leader'].includes(p.role || '');
        if (!isInternalStaff) return false;

        // Phân quyền hiển thị dữ liệu:
        // 1. HR/BOD/Admin/Kế toán: Thấy tất cả nhân viên
        // 2. Leader (Trưởng nhóm): Thấy chính mình + các nhân viên trực thuộc nhóm (leader_id = currentUserId hoặc chung team_id)
        // 3. Nhân viên thông thường: Chỉ thấy duy nhất bảng công của chính mình
        if (!isHRorBODorAdmin) {
          if (isLeader) {
            const isMe = p.id === currentUserId;
            const isMySubordinate = p.leader_id === currentUserId;
            const isSameTeam = profile?.team_id && p.team_id === profile.team_id;
            if (!isMe && !isMySubordinate && !isSameTeam) return false;
          } else {
            // Employee: only see self
            if (p.id !== currentUserId) return false;
          }
        }

        if (selectedRoleFilter !== 'all' && p.role !== selectedRoleFilter) return false;

        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchName = (p.full_name || '').toLowerCase().includes(term);
          const matchEmail = (p.email || '').toLowerCase().includes(term);
          const matchPhone = (p.phone || '').toLowerCase().includes(term);
          if (!matchName && !matchEmail && !matchPhone) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const orderA = ROLE_DEPARTMENT_ORDER[a.role || ''] || 99;
        const orderB = ROLE_DEPARTMENT_ORDER[b.role || ''] || 99;
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        return (a.full_name || a.email || '').localeCompare(b.full_name || b.email || '', 'vi');
      });
  }, [profilesList, selectedRoleFilter, searchTerm, isHRorBODorAdmin, isLeader, currentUserId, profile]);

  // Chuẩn chuẩn ngày công của tháng
  const standardMonthDays = useMemo(() => {
    return calculateStandardWorkingDays(selectedMonth, selectedYear, holidays);
  }, [selectedMonth, selectedYear, holidays]);

  // Bảng tính công của tất cả nhân viên
  const timesheetData: EmployeeTimesheetRow[] = useMemo(() => {
    return staffProfiles.map((p) => {
      const balance = leaveBalances.find((b) => b.user_id === p.id && b.year === selectedYear);
      return calculateEmployeeTimesheet(p, selectedMonth, selectedYear, leaveRequests, holidays, balance);
    });
  }, [staffProfiles, selectedMonth, selectedYear, leaveRequests, holidays, leaveBalances]);

  // Thống kê tổng hợp toàn công ty
  const companySummary = useMemo(() => {
    const totalEmployees = timesheetData.length;
    const totalStandardDays = totalEmployees * standardMonthDays;
    const totalActualDays = timesheetData.reduce((acc, row) => acc + row.actual_working_days, 0);
    const totalPaidLeave = timesheetData.reduce((acc, row) => acc + row.paid_leave_days, 0);
    const totalUnpaidLeave = timesheetData.reduce((acc, row) => acc + row.unpaid_leave_days, 0);

    return {
      totalEmployees,
      totalStandardDays,
      totalActualDays,
      totalPaidLeave,
      totalUnpaidLeave
    };
  }, [timesheetData, standardMonthDays]);

  // Xuất file Excel (.xlsx) - Chỉ dành cho HR, Ban Giám Đốc và Quản trị viên
  const handleExportExcel = () => {
    if (!canExportExcel) {
      alert('Bạn không có quyền xuất file Excel. Chức năng này chỉ dành cho HR, Quản trị viên và Ban Giám Đốc.');
      return;
    }
    try {
      const excelRows = timesheetData.map((row, index) => {
        const notes: string[] = [];
        if (row.bridge_leave_applied && row.bridge_leave_applied.length > 0) {
          row.bridge_leave_applied.forEach((b) => {
            if (b.type === 'paid_annual') {
              notes.push(`Nghỉ hoán đổi ${b.date.substring(8, 10)}/${b.date.substring(5, 7)} (Trừ phép năm, hưởng lương)`);
            } else {
              notes.push(`Nghỉ hoán đổi ${b.date.substring(8, 10)}/${b.date.substring(5, 7)} (Hết phép -> Nghỉ không lương)`);
            }
          });
        }

        return {
          'STT': index + 1,
          'Họ và tên': row.employee_name,
          'Email': row.employee_email,
          'Bộ phận / Vai trò': getRoleConfig(row.employee_role).label,
          'Công chuẩn tháng': row.standard_working_days,
          'Nghỉ phép năm (hưởng lương)': row.paid_leave_days,
          'Nghỉ bù / Chế độ': row.compensatory_leave_days + row.special_leave_days,
          'Nghỉ không lương (trừ công)': row.unpaid_leave_days,
          'Ngày công thực tế tính lương': row.actual_working_days,
          'Quỹ phép năm còn lại': `${row.leave_balance_remaining} / ${row.leave_balance_total} ngày`,
          'Ghi chú': notes.join('; ')
        };
      });

      // Tạo workbook
      const worksheet = XLSX.utils.json_to_sheet(excelRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, `Bang_Cong_T${selectedMonth}_${selectedYear}`);

      // Auto width columns
      const maxCols = [5, 25, 25, 20, 15, 20, 15, 20, 20, 18, 35];
      worksheet['!cols'] = maxCols.map((w) => ({ wch: w }));

      const fileName = `Bang_Cham_Cong_AD_Luxury_Thang_${selectedMonth}_${selectedYear}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } catch (err) {
      console.error('Lỗi xuất file Excel:', err);
      alert('Không thể xuất file Excel. Vui lòng thử lại!');
    }
  };

  const handleAddHolidaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayName.trim() || !newHolidayDate) {
      alert('Vui lòng nhập tên và ngày nghỉ lễ');
      return;
    }
    await addHoliday({
      name: newHolidayName.trim(),
      date: newHolidayDate,
      holiday_type: newHolidayType,
      description: newHolidayDescription.trim() || undefined,
      is_recurring: newHolidayRecurring
    });
    setNewHolidayName('');
    setNewHolidayDate('');
    setNewHolidayDescription('');
    setNewHolidayType('official_paid');
    setNewHolidayRecurring(false);
  };

  // Tìm các ngày lễ / ngày nghỉ trong tháng hiện tại đang xem
  const activeMonthHolidays = useMemo(() => {
    return holidays.filter((h) => {
      if (!h.date) return false;
      const [hYear, hMonth] = h.date.split('-').map(Number);
      if (h.is_recurring) {
        return Number(h.date.substring(5, 7)) === selectedMonth;
      }
      return hYear === selectedYear && hMonth === selectedMonth;
    });
  }, [holidays, selectedMonth, selectedYear]);

  return (
    <div className="space-y-6">
      {/* Header & Công cụ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
            Bảng Chấm Công & Hạch Toán Ngày Công Nhân Sự
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Tự động trừ Thứ 7, Chủ Nhật, Ngày Lễ & Đơn nghỉ phép đã duyệt cuối
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Nút Quản lý ngày lễ */}
          <button
            type="button"
            onClick={() => setShowHolidayModal(true)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
          >
            <Calendar className="w-4 h-4 text-blue-600" />
            Cấu Hình Ngày Lễ ({holidays.length})
          </button>

          {/* Nút Xuất Excel (Chỉ hiển thị với HR, Ban Giám Đốc và Quản trị viên) */}
          {canExportExcel && (
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4" />
              Xuất File Excel (.xlsx)
            </button>
          )}
        </div>
      </div>

      {/* Thẻ Thống Kê Tổng Quan */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase">Công Chuẩn Tháng {selectedMonth}/{selectedYear}</div>
          <div className="text-2xl font-black text-blue-600 mt-1">{standardMonthDays} ngày</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Không tính T7, CN & Lễ</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase">Tổng Nhân Sự Hạch Toán</div>
          <div className="text-2xl font-black text-slate-800 mt-1">{companySummary.totalEmployees} người</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Khối văn phòng & vận hành</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="text-xs font-bold text-emerald-600 uppercase">Tổng Công Thực Tế</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{companySummary.totalActualDays} công</div>
          <div className="text-[11px] text-emerald-600/80 mt-0.5">Được tính lương chính thức</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="text-xs font-bold text-amber-600 uppercase">Tổng Nghỉ Không Lương</div>
          <div className="text-2xl font-black text-amber-700 mt-1">{companySummary.totalUnpaidLeave} ngày</div>
          <div className="text-[11px] text-amber-600/80 mt-0.5">Đã trừ trực tiếp vào công</div>
        </div>
      </div>

      {/* Thanh Bộ Lọc & Tìm Kiếm */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col md:flex-row items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-2.5 w-full md:w-auto">
          {/* Chọn Tháng */}
          <CustomSelect
            value={String(selectedMonth)}
            onChange={(val) => setSelectedMonth(Number(val))}
            options={Array.from({ length: 12 }, (_, i) => ({
              value: String(i + 1),
              label: `Tháng ${i + 1}`,
            }))}
            icon={<Calendar className="w-3.5 h-3.5 text-blue-600" />}
            label="Tháng"
            className="w-36 sm:w-40"
          />

          {/* Chọn Năm */}
          <CustomSelect
            value={String(selectedYear)}
            onChange={(val) => setSelectedYear(Number(val))}
            options={[2024, 2025, 2026, 2027, 2028].map((y) => ({
              value: String(y),
              label: `Năm ${y}`,
            }))}
            icon={<Calendar className="w-3.5 h-3.5 text-blue-600" />}
            label="Năm"
            className="w-36 sm:w-40"
          />

          {/* Lọc Bộ Phận */}
          <CustomSelect
            value={selectedRoleFilter}
            onChange={(val) => setSelectedRoleFilter(val)}
            options={[
              { value: 'all', label: 'Tất cả bộ phận' },
              { value: 'bod', label: 'Ban Giám Đốc' },
              { value: 'hr', label: 'Nhân sự' },
              { value: 'sale_leader', label: 'Sale Leader' },
              { value: 'sale', label: 'Nhân viên Kinh doanh' },
              { value: 'marketing_leader', label: 'Trưởng phòng Marketing' },
              { value: 'marketing', label: 'Nhân viên Marketing' },
              { value: 'operator', label: 'Điều hành Tour' },
              { value: 'accounting', label: 'Kế toán' },
              { value: 'visa', label: 'Bộ phận Visa' },
              { value: 'tour_guide', label: 'Hướng Dẫn Viên' },
              { value: 'admin', label: 'Quản trị viên' },
            ]}
            icon={<Filter className="w-3.5 h-3.5 text-slate-500" />}
            label="Bộ phận"
            className="w-60"
          />
        </div>

        {/* Ô Tìm Kiếm */}
        <div className="flex flex-col gap-1 w-full md:w-72">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Tìm kiếm
          </label>
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên, email, SĐT..."
              className="w-full h-[38px] pl-9 pr-3 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Banner thông báo các ngày lễ / ngày nghỉ trong tháng đang chọn */}
      {activeMonthHolidays.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/90 text-xs text-amber-900 flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1.5 flex-1">
            <div className="font-bold text-amber-950 text-sm flex items-center justify-between">
              <span>Lịch nghỉ lễ & hoán đổi Tháng {selectedMonth}/{selectedYear}</span>
              <span className="text-[11px] font-normal text-amber-700">({activeMonthHolidays.length} ngày nghỉ/lễ)</span>
            </div>
            <div className="space-y-1 text-amber-900 leading-relaxed">
              {activeMonthHolidays.map((h) => {
                const dayStr = h.date.substring(8, 10);
                const hType = h.holiday_type || 'official_paid';
                return (
                  <div key={h.id || h.date} className="flex items-start gap-1.5">
                    <span className="font-bold text-amber-950 shrink-0">• Ngày {dayStr}/{selectedMonth}:</span>
                    <span>
                      <strong>{h.name}</strong>{' '}
                      {hType === 'official_paid' && (
                        <span className="text-emerald-700 font-semibold">(Nghỉ lễ chính thức hưởng nguyên lương)</span>
                      )}
                      {hType === 'bridge_annual_or_unpaid' && (
                        <span className="text-blue-800 font-semibold">(Nghỉ hoán đổi / cầu nối: Trừ 1 ngày phép năm hưởng lương; hết phép tính nghỉ không lương)</span>
                      )}
                      {hType === 'unpaid_company' && (
                        <span className="text-rose-700 font-semibold">(Nghỉ không hưởng lương toàn công ty)</span>
                      )}
                      {h.description ? ` — ${h.description}` : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bảng Dữ Liệu Chấm Công Grid */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4 text-center w-12">STT</th>
                <th className="py-3.5 px-4">Nhân sự</th>
                <th className="py-3.5 px-4">Bộ phận</th>
                <th className="py-3.5 px-4 text-center bg-blue-50/60 text-blue-900 border-x border-blue-100">
                  Công chuẩn
                </th>
                <th className="py-3.5 px-4 text-center text-blue-700">Phép năm</th>
                <th className="py-3.5 px-4 text-center text-emerald-700">Nghỉ bù / Chế độ</th>
                <th className="py-3.5 px-4 text-center text-rose-700 bg-rose-50/40">Không lương (Trừ)</th>
                <th className="py-3.5 px-4 text-center bg-emerald-50 text-emerald-900 font-black border-x border-emerald-200">
                  Công thực tế
                </th>
                <th className="py-3.5 px-4 text-center">Quỹ phép còn ({selectedYear})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {timesheetData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">Không tìm thấy nhân sự nào phù hợp</p>
                  </td>
                </tr>
              ) : (
                timesheetData.map((row, idx) => {
                  const hasBridgeAnnual = row.bridge_leave_applied?.some((b) => b.type === 'paid_annual');
                  const hasBridgeUnpaid = row.bridge_leave_applied?.some((b) => b.type === 'unpaid');

                  return (
                    <tr key={row.user_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 text-center font-medium text-slate-400">{idx + 1}</td>

                      {/* Tên & Email */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-800">{row.employee_name}</div>
                        <div className="text-[11px] text-slate-400">{row.employee_email}</div>
                        {row.bridge_leave_applied && row.bridge_leave_applied.length > 0 && (
                          <div className="mt-1 flex flex-wrap items-center gap-1">
                            {row.bridge_leave_applied.map((b, bIdx) => {
                              const dPart = b.date.substring(8, 10) + '/' + b.date.substring(5, 7);
                              if (b.type === 'paid_annual') {
                                return (
                                  <span key={bIdx} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200" title={b.name}>
                                    🌴 Trừ phép {dPart}
                                  </span>
                                );
                              }
                              return (
                                <span key={bIdx} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200" title={b.name}>
                                  ⚠️ Không lương {dPart}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </td>

                      {/* Role / Bộ phận & Trạng thái làm việc */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          {(() => {
                            const roleConfig = getRoleConfig(row.employee_role);
                            return (
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black border ${roleConfig.bg} ${roleConfig.color} ${roleConfig.border}`}>
                                <Shield className="w-3 h-3" />
                                <span>{roleConfig.label}</span>
                              </span>
                            );
                          })()}
                          {(() => {
                            const empStatus = row.employment_status || 'official';
                            const statusConfig = EMPLOYMENT_STATUS_LABELS[empStatus] || EMPLOYMENT_STATUS_LABELS.official;
                            return (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}>
                                <span>{statusConfig.label}</span>
                              </span>
                            );
                          })()}
                        </div>
                      </td>

                      {/* Công chuẩn */}
                      <td className="py-3.5 px-4 text-center font-extrabold text-blue-900 bg-blue-50/30 border-x border-blue-50">
                        {row.standard_working_days}
                      </td>

                      {/* Phép năm */}
                      <td className="py-3.5 px-4 text-center font-bold text-blue-600">
                        {row.paid_leave_days > 0 ? (
                          <span className="bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                            {row.paid_leave_days}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Nghỉ bù + Chế độ */}
                      <td className="py-3.5 px-4 text-center font-bold text-emerald-600">
                        {row.compensatory_leave_days + row.special_leave_days > 0 ? (
                          <span className="bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                            {row.compensatory_leave_days + row.special_leave_days}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Nghỉ không lương */}
                      <td className="py-3.5 px-4 text-center font-bold text-rose-600 bg-rose-50/20">
                        {row.unpaid_leave_days > 0 ? (
                          <span className="bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 text-rose-700">
                            -{row.unpaid_leave_days}
                          </span>
                        ) : (
                          <span className="text-slate-300">0</span>
                        )}
                      </td>

                      {/* Công thực tế */}
                      <td className="py-3.5 px-4 text-center font-black text-sm text-emerald-700 bg-emerald-50/70 border-x border-emerald-100">
                        {row.actual_working_days}
                      </td>

                      {/* Quỹ phép còn lại */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="font-bold text-slate-700">
                            {row.leave_balance_remaining} / {row.leave_balance_total} ngày
                          </span>
                          {isHRorBODorAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                const currentBal = leaveBalances.find(b => b.user_id === row.user_id && b.year === selectedYear);
                                setQuickEditUserId(row.user_id);
                                setQuickEditTotal(row.leave_balance_total);
                                setQuickEditUsed(currentBal ? Number(currentBal.used_days ?? 0) : Math.max(0, row.leave_balance_total - row.leave_balance_remaining));
                                setQuickEditNote(currentBal?.note || '');
                              }}
                              className="p-1 rounded-md text-cyan-600 hover:text-cyan-800 hover:bg-cyan-50 transition-colors"
                              title="Điều chỉnh quỹ phép nhân viên"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Điều Chỉnh Quỹ Phép Nhanh */}
      {quickEditUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-600/10 text-cyan-600 flex items-center justify-center font-bold">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Điều Chỉnh Quỹ Phép Năm {selectedYear}</h3>
                  <p className="text-[11px] text-slate-500">
                    {profilesList.find(p => p.id === quickEditUserId)?.full_name || 'Nhân sự'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setQuickEditUserId(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!quickEditUserId) return;
                await updateLeaveBalance(quickEditUserId, selectedYear, {
                  total_days: Number(quickEditTotal),
                  used_days: Number(quickEditUsed),
                  remaining_days: Math.max(0, Number(quickEditTotal) - Number(quickEditUsed)),
                  note: quickEditNote.trim() || undefined,
                  updated_by: profile?.full_name || 'Nhân sự (HR)',
                });
                setQuickEditUserId(null);
              }}
              className="p-5 space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tổng Ngày Cấp *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={quickEditTotal}
                    onChange={(e) => setQuickEditTotal(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Đã Sử Dụng *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={quickEditUsed}
                    onChange={(e) => setQuickEditUsed(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs font-bold"
                    required
                  />
                </div>
              </div>

              <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-xl text-center">
                <span className="text-xs text-cyan-800 font-semibold">Còn lại thực tế: </span>
                <strong className="text-sm font-black text-cyan-900">
                  {Math.max(0, Number(quickEditTotal) - Number(quickEditUsed))} ngày
                </strong>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Lý Do / Ghi Chú</label>
                <textarea
                  rows={2}
                  value={quickEditNote}
                  onChange={(e) => setQuickEditNote(e.target.value)}
                  placeholder="Ghi chú lý do điều chỉnh..."
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setQuickEditUserId(null)}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-xs"
                >
                  Lưu Điều Chỉnh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cấu Hình Ngày Lễ */}
      {showHolidayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[88vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center font-bold">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Cấu Hình Ngày Nghỉ & Ngày Lễ Công Ty</h3>
                  <p className="text-xs text-slate-500">Tùy biến linh hoạt: Lễ hưởng lương, Nghỉ hoán đổi / cầu nối (trừ phép), Nghỉ không lương</p>
                </div>
              </div>
              <button
                onClick={() => setShowHolidayModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold px-2 py-1 cursor-pointer"
              >
                ✕ Đóng
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Form Thêm Ngày Lễ Mới */}
              <form onSubmit={handleAddHolidaySubmit} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3.5">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center justify-between">
                  <span>Thêm Ngày Lễ Mới / Lịch Nghỉ Đặc Biệt</span>
                  <span className="text-[10px] text-blue-600 lowercase font-normal">* Áp dụng tự động vào bảng chấm công</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Tên ngày lễ / ngày nghỉ *</label>
                    <input
                      type="text"
                      value={newHolidayName}
                      onChange={(e) => setNewHolidayName(e.target.value)}
                      placeholder="VD: Nghỉ hoán đổi, Lễ Quốc khánh, Du lịch cty..."
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-blue-500/20"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Ngày nghỉ (dd/mm/yyyy) *</label>
                    <DatePicker
                      value={newHolidayDate}
                      onChange={(val) => setNewHolidayDate(val)}
                      placeholder="Chọn ngày nghỉ (dd/mm/yyyy)"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Loại ngày nghỉ *</label>
                    <CustomSelect
                      value={newHolidayType}
                      onChange={(val) => setNewHolidayType(val as HolidayType)}
                      options={[
                        { value: 'official_paid', label: '⭐ Nghỉ lễ chính thức (Hưởng nguyên lương)' },
                        { value: 'bridge_annual_or_unpaid', label: '🌴 Nghỉ hoán đổi / cầu nối (Trừ phép năm)' },
                        { value: 'unpaid_company', label: '⚠️ Nghỉ không lương toàn công ty' },
                      ]}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Ghi chú / Hướng dẫn</label>
                    <input
                      type="text"
                      value={newHolidayDescription}
                      onChange={(e) => setNewHolidayDescription(e.target.value)}
                      placeholder="VD: Trừ vào phép năm theo thông báo số 12..."
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newHolidayRecurring}
                      onChange={(e) => setNewHolidayRecurring(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    Lặp lại hàng năm (Theo ngày và tháng)
                  </label>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
                  >
                    + Thêm Ngày Nghỉ / Lễ
                  </button>
                </div>
              </form>

              {/* Danh sách các ngày lễ */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center justify-between">
                  <span>Các ngày lễ & ngày nghỉ đang áp dụng ({holidays.length})</span>
                </div>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                  {holidays.map((h) => {
                    const hType = h.holiday_type || 'official_paid';
                    const formattedDate = h.date ? h.date.split('-').reverse().join('/') : '';
                    return (
                      <div key={h.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 text-xs gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-800 text-sm">{h.name}</span>
                            {hType === 'official_paid' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Sparkles className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span>Lễ hưởng nguyên lương</span>
                              </span>
                            )}
                            {hType === 'bridge_annual_or_unpaid' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                <Palmtree className="w-3 h-3 text-blue-600 shrink-0" />
                                <span>Cầu nối: Trừ phép năm / Không lương</span>
                              </span>
                            )}
                            {hType === 'unpaid_company' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                                <span>Nghỉ không lương Cty</span>
                              </span>
                            )}
                            {h.is_recurring && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                                <RefreshCw className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                                <span>Lặp lại hàng năm</span>
                              </span>
                            )}
                          </div>
                          <div className="text-slate-500 text-[11px] flex items-center gap-1.5 flex-wrap">
                            <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>Ngày: <strong className="text-slate-800 font-semibold">{formattedDate}</strong></span>
                            {h.description && <span className="text-slate-400 italic">({h.description})</span>}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Bạn có chắc muốn xóa ngày nghỉ lễ "${h.name}"?`)) {
                              deleteHoliday(h.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                          title="Xóa ngày lễ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
