import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  Filter,
  Search,
  AlertCircle,
  Plus,
  Trash2,
  ChevronRight,
  ShieldCheck,
  User,
  Building,
  Check,
  X
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import { LeaveRequest, LeaveStatus, LeaveType, getRoleConfig } from '../types';
import { getLeaveRequestWorkdaysCount } from '../lib/payrollUtils';
import {
  isUserAuthorizedToApproveLeaveL1,
  isUserAuthorizedToApproveLeaveFinal
} from '../utils/permissionUtils';
import { CreateLeaveRequestModal } from './LeaveRequestModal';
import { CustomSelect } from './CustomSelect';

export const LeaveManagementTab: React.FC = () => {
  const { profile, user } = useAuth();
  const {
    leaveRequests,
    approveLeaveRequestLevel1,
    approveLeaveRequestFinal,
    rejectLeaveRequest,
    deleteLeaveRequest,
    holidays,
    profilesList,
    leaveBalances
  } = useCRM();

  const currentRole = profile?.role || 'sale';
  const currentUserId = profile?.id || user?.id || '';

  const [statusFilter, setStatusFilter] = useState<'all' | LeaveStatus>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | LeaveType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Modal từ chối
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Modal xác nhận xóa
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Quyền duyệt:
  // Cấp 1: Trưởng phòng (sale_leader, marketing_leader, visa_leader, operator) hoặc Admin / BOD / HR
  // Cấp 2 (Final): HR / Admin / BOD (Kế toán & Điều hành tour không duyệt)
  const canApproveLevel1 = ['sale_leader', 'marketing_leader', 'visa_leader', 'operator', 'admin', 'bod', 'hr'].includes(currentRole);
  const canApproveFinal = ['admin', 'bod', 'hr'].includes(currentRole);

  const filteredRequests = useMemo(() => {
    return leaveRequests.filter((req) => {
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
  }, [leaveRequests, statusFilter, typeFilter, searchTerm]);

  // Thống kê nhanh
  const stats = useMemo(() => {
    const total = leaveRequests.length;
    const pendingL1 = leaveRequests.filter((r) => r.status === 'pending').length;
    const pendingFinal = leaveRequests.filter((r) => r.status === 'approved_level_1').length;
    const approved = leaveRequests.filter((r) => r.status === 'approved_final').length;
    const rejected = leaveRequests.filter((r) => r.status === 'rejected').length;
    return { total, pendingL1, pendingFinal, approved, rejected };
  }, [leaveRequests]);

  const handleConfirmReject = async () => {
    if (!rejectingId) return;
    if (!rejectReason.trim()) {
      alert('Vui lòng nhập lý do từ chối.');
      return;
    }
    await rejectLeaveRequest(
      rejectingId,
      profile?.full_name || user?.email || 'Quản lý',
      rejectReason.trim()
    );
    setRejectingId(null);
    setRejectReason('');
  };

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
            <Clock className="w-3.5 h-3.5 mr-1 animate-pulse" /> Chờ Trưởng phòng duyệt
          </span>
        );
      case 'approved_level_1':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
            <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Chờ Kế toán / HR duyệt
          </span>
        );
      case 'approved_final':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Đã duyệt cấp cuối
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 mr-1" /> Đã từ chối
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Thao tác */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
            <Calendar className="w-6 h-6 text-blue-600" />
            Quản Lý Đơn Xin Nghỉ Phép & Phê Duyệt
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Quy trình phê duyệt 2 cấp: Trưởng phòng bộ phận $\rightarrow$ Kế toán / HR duyệt hạch toán
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Tạo Đơn Xin Nghỉ
        </button>
      </div>

      {/* Thẻ Thống Kê Nhanh */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setStatusFilter('all')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'all'
              ? 'bg-white border-blue-500 shadow-md ring-2 ring-blue-500/10'
              : 'bg-white/80 border-slate-200/80 hover:bg-white'
          }`}
        >
          <div className="text-xs font-bold text-slate-500 uppercase">Tổng số đơn</div>
          <div className="text-2xl font-black text-slate-800 mt-1">{stats.total}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Tất cả đề xuất nghỉ phép</div>
        </div>

        <div
          onClick={() => setStatusFilter('pending')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'pending'
              ? 'bg-amber-50/50 border-amber-500 shadow-md ring-2 ring-amber-500/10'
              : 'bg-white/80 border-slate-200/80 hover:bg-white'
          }`}
        >
          <div className="text-xs font-bold text-amber-600 uppercase">Chờ Trưởng phòng</div>
          <div className="text-2xl font-black text-amber-700 mt-1">{stats.pendingL1}</div>
          <div className="text-[11px] text-amber-600/80 mt-0.5">Đơn mới cấp 1</div>
        </div>

        <div
          onClick={() => setStatusFilter('approved_level_1')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'approved_level_1'
              ? 'bg-sky-50/50 border-sky-500 shadow-md ring-2 ring-sky-500/10'
              : 'bg-white/80 border-slate-200/80 hover:bg-white'
          }`}
        >
          <div className="text-xs font-bold text-sky-600 uppercase">Chờ Kế toán / HR</div>
          <div className="text-2xl font-black text-sky-700 mt-1">{stats.pendingFinal}</div>
          <div className="text-[11px] text-sky-600/80 mt-0.5">Đã qua duyệt cấp 1</div>
        </div>

        <div
          onClick={() => setStatusFilter('approved_final')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'approved_final'
              ? 'bg-emerald-50/50 border-emerald-500 shadow-md ring-2 ring-emerald-500/10'
              : 'bg-white/80 border-slate-200/80 hover:bg-white'
          }`}
        >
          <div className="text-xs font-bold text-emerald-600 uppercase">Đã duyệt cuối</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{stats.approved}</div>
          <div className="text-[11px] text-emerald-600/80 mt-0.5">Đã trừ phép / hạch toán</div>
        </div>
      </div>

      {/* Bộ Lọc & Tìm Kiếm */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col md:flex-row items-end justify-between gap-3">
        <div className="flex flex-col gap-1 w-full md:w-80">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Tìm kiếm
          </label>
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên nhân viên, lý do..."
              className="w-full h-[38px] pl-9 pr-3 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-2.5 w-full md:w-auto">
          {/* Lọc Trạng Thái */}
          <CustomSelect
            value={statusFilter}
            onChange={(val) => setStatusFilter(val as any)}
            options={[
              { value: 'all', label: 'Tất cả trạng thái' },
              { value: 'pending', label: 'Chờ Trưởng phòng (Cấp 1)' },
              { value: 'approved_level_1', label: 'Chờ Kế toán / HR (Cấp 2)' },
              { value: 'approved_final', label: 'Đã duyệt cuối' },
              { value: 'rejected', label: 'Đã từ chối' },
            ]}
            icon={<Clock className="w-3.5 h-3.5 text-slate-500" />}
            label="Trạng thái"
            className="w-60 sm:w-64"
          />

          {/* Lọc Loại Nghỉ Phép */}
          <CustomSelect
            value={typeFilter}
            onChange={(val) => setTypeFilter(val as any)}
            options={[
              { value: 'all', label: 'Tất cả loại phép' },
              { value: 'annual', label: '🌴 Phép năm' },
              { value: 'unpaid', label: '⏳ Không lương' },
              { value: 'compensatory', label: '🔄 Nghỉ bù' },
              { value: 'special', label: '🎁 Chế độ' },
            ]}
            icon={<Filter className="w-3.5 h-3.5 text-slate-500" />}
            label="Loại phép"
            className="w-48"
          />
        </div>
      </div>

      {/* Bảng Danh Sách Đơn Xin Nghỉ */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Nhân viên</th>
                <th className="py-3.5 px-4">Loại phép</th>
                <th className="py-3.5 px-4">Thời gian nghỉ</th>
                <th className="py-3.5 px-4 text-center">Số ngày làm việc</th>
                <th className="py-3.5 px-4">Người nhận bàn giao</th>
                <th className="py-3.5 px-4">Lý do & Ghi chú</th>
                <th className="py-3.5 px-4">Trạng thái</th>
                <th className="py-3.5 px-4 text-right">Thao tác duyệt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center">
                      <Calendar className="w-10 h-10 text-slate-300 mb-2" />
                      <p className="font-semibold text-sm text-slate-600">Không có đơn xin nghỉ phép nào</p>
                      <p className="text-xs text-slate-400 mt-0.5">Các đề xuất nghỉ phép sẽ hiển thị tại đây</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => {
                  const workdays = getLeaveRequestWorkdaysCount(req.start_date, req.end_date, holidays);
                  const isOwner = req.user_id === currentUserId;

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Nhân viên */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-800">{req.user_name || 'Nhân viên'}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <span className="font-semibold text-slate-600">{getRoleConfig(req.user_role).label}</span>
                          {req.created_at && <span>• {new Date(req.created_at).toLocaleDateString('vi-VN')}</span>}
                        </div>
                      </td>

                      {/* Loại phép */}
                      <td className="py-3.5 px-4 whitespace-nowrap">{getLeaveTypeBadge(req.type)}</td>

                      {/* Thời gian */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-700">
                          {req.start_date.split('-').reverse().join('/')} → {req.end_date.split('-').reverse().join('/')}
                        </div>
                      </td>

                      {/* Số ngày công thực tế */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="font-extrabold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                          {workdays} ngày
                        </span>
                      </td>

                      {/* Người bàn giao */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {req.handover_user_name ? (
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                            {req.handover_user_name}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Chưa chỉ định</span>
                        )}
                      </td>

                      {/* Lý do */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="text-slate-700 truncate" title={req.reason}>
                          {req.reason}
                        </div>
                        {req.rejection_reason && (
                          <div className="text-[11px] text-rose-600 font-medium mt-0.5">
                            Lý do từ chối: {req.rejection_reason}
                          </div>
                        )}
                      </td>

                      {/* Trạng thái */}
                      <td className="py-3.5 px-4 whitespace-nowrap">{getStatusBadge(req.status)}</td>

                      {/* Thao tác */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {(() => {
                          const creator = profilesList.find((p) => p.id === req.user_id);
                          const canApproveL1 = !isOwner && isUserAuthorizedToApproveLeaveL1(currentUserId, currentRole, req.user_id, creator, profile);
                          const canApproveL2 = !isOwner && isUserAuthorizedToApproveLeaveFinal(currentUserId, currentRole, req.user_id);

                          return (
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Nút Duyệt Cấp 1 (Trưởng phòng) */}
                              {req.status === 'pending' && canApproveL1 && (
                                <button
                                  type="button"
                                  onClick={() => approveLeaveRequestLevel1(req.id, profile?.full_name || user?.email || 'Trưởng phòng')}
                                  className="px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs"
                                  title="Duyệt Cấp 1 (Trưởng phòng)"
                                >
                                  <Check className="w-3.5 h-3.5" /> Duyệt Cấp 1
                                </button>
                              )}

                              {/* Nút Duyệt Cấp Cuối (HR / BOD / Admin) */}
                              {req.status === 'approved_level_1' && canApproveL2 && (
                                <button
                                  type="button"
                                  onClick={() => approveLeaveRequestFinal(req.id, profile?.full_name || user?.email || 'HR / Ban Giám Đốc')}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs"
                                  title="Duyệt cấp cuối (Hạch toán công/phép)"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Duyệt Cuối
                                </button>
                              )}

                              {/* Nút Từ chối (Nếu chưa duyệt cuối, tuyệt đối không tự từ chối đơn của mình) */}
                              {!isOwner && (req.status === 'pending' || req.status === 'approved_level_1') && (canApproveL1 || canApproveL2) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRejectingId(req.id);
                                    setRejectReason('');
                                  }}
                                  className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors"
                                  title="Từ chối đơn"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Nút Xóa (Dành cho chủ đơn khi chờ/từ chối hoặc HR/BOD/Admin) */}
                              {((isOwner && (req.status === 'pending' || req.status === 'rejected')) || ['admin', 'hr', 'bod', 'accounting'].includes(currentRole || '')) && (
                                <button
                                  type="button"
                                  onClick={() => setDeletingId(req.id)}
                                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                  title="Xóa đơn"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Từ Chối Đơn */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-5 space-y-4">
            <div className="flex items-center gap-2.5 text-rose-600 font-bold text-base">
              <AlertCircle className="w-5 h-5" />
              Từ Chối Đơn Xin Nghỉ Phép
            </div>
            <p className="text-xs text-slate-500">
              Vui lòng nhập lý do từ chối để nhân viên nắm được thông tin và sắp xếp lại kế hoạch công việc:
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Nhập lý do từ chối (Ví dụ: Trùng lịch tour cao điểm, cần người trực...)"
              rows={3}
              className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectingId(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs"
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xác Nhận Xóa Đơn */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-5 space-y-4">
            <div className="flex items-center gap-2.5 text-rose-600 font-bold text-base">
              <Trash2 className="w-5 h-5" />
              Xác nhận Xóa Đơn Nghỉ Phép
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Bạn có chắc chắn muốn xóa đơn xin nghỉ phép này? Dữ liệu đơn nghỉ phép và số ngày phép năm liên quan sẽ được tự động cập nhật lại.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteLeaveRequest(deletingId);
                  setDeletingId(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Xác nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tạo Đơn Mới */}
      <CreateLeaveRequestModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
    </div>
  );
};
