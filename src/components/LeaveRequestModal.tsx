import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Calendar, AlertCircle, Clock, CheckCircle2, UserCheck, X, Sun, Sunset, Plus } from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import { LeaveType, LeaveSession } from '../types';
import { getLeaveRequestWorkdaysCount, getEffectiveLeaveBalance } from '../lib/payrollUtils';
import { DatePicker } from './DatePicker';
import { CustomSelect } from './CustomSelect';

interface CreateLeaveRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateLeaveRequestModal: React.FC<CreateLeaveRequestModalProps> = ({ isOpen, onClose }) => {
  const { user, profile } = useAuth();
  const { profilesList, createLeaveRequest, holidays, leaveBalances, leaveRequests } = useCRM();

  const currentYear = new Date().getFullYear();
  const currentUserId = profile?.id || user?.id || '';

  const userBalance = useMemo(() => {
    return getEffectiveLeaveBalance(currentUserId, currentYear, leaveBalances, profile, undefined, leaveRequests, holidays);
  }, [leaveBalances, currentUserId, currentYear, profile, leaveRequests, holidays]);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [leaveSession, setLeaveSession] = useState<LeaveSession>('all_day');
  const [leaveType, setLeaveType] = useState<LeaveType>('annual');
  const [reason, setReason] = useState('');
  const [handoverNote, setHandoverNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Kiểm tra xem có phải đơn xin nghỉ trong 1 ngày không (để cho phép chọn Buổi sáng / Buổi chiều / Cả ngày)
  const isSingleDay = startDate && endDate && startDate === endDate;

  // Tính số ngày làm việc thực tế cho đơn
  const requestedWorkdays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const session = isSingleDay ? leaveSession : 'all_day';
    return getLeaveRequestWorkdaysCount(startDate, endDate, holidays, session);
  }, [startDate, endDate, holidays, isSingleDay, leaveSession]);

  // Cảnh báo nếu chọn phép năm nhưng số ngày xin vượt quá quỹ còn lại
  const isOverBalance = leaveType === 'annual' && requestedWorkdays > userBalance.remaining;

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      alert('Vui lòng chọn ngày bắt đầu và ngày kết thúc nghỉ phép.');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      alert('Ngày bắt đầu không được lớn hơn ngày kết thúc.');
      return;
    }
    if (!reason.trim()) {
      alert('Vui lòng nhập lý do xin nghỉ.');
      return;
    }
    if (requestedWorkdays === 0) {
      alert('Khoảng thời gian bạn chọn chỉ bao gồm Thứ 7, Chủ Nhật hoặc Ngày Lễ (0 ngày công).');
      return;
    }

    setIsSubmitting(true);
    try {
      const sessionToSave: LeaveSession = isSingleDay ? leaveSession : 'all_day';

      await createLeaveRequest({
        user_id: currentUserId,
        user_name: profile?.full_name || user?.email || 'Nhân viên',
        user_email: user?.email || '',
        user_role: profile?.role || 'sale',
        start_date: startDate,
        end_date: endDate,
        leave_session: sessionToSave,
        total_days: requestedWorkdays,
        type: leaveType,
        reason: reason.trim(),
        handover_user_id: null,
        handover_user_name: handoverNote.trim() || null,
      });

      onClose();
      // Reset form
      setStartDate('');
      setEndDate('');
      setLeaveSession('all_day');
      setReason('');
      setHandoverNote('');
      setLeaveType('annual');
    } catch (err) {
      console.error('Lỗi khi tạo đơn nghỉ phép:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Tạo Đơn Xin Nghỉ Phép</h3>
              <p className="text-xs text-slate-500">Gửi đề xuất nghỉ phép và bàn giao công việc</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Thông tin Quỹ phép năm hiện tại */}
          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="text-xs font-semibold text-blue-800 uppercase tracking-wider">Quỹ phép năm {currentYear}</div>
                {profile?.employment_status === 'probation' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    Nhân sự thử việc
                  </span>
                )}
              </div>
              <div className="text-xs text-blue-600 mt-0.5">
                Tổng cộng: <strong className="font-bold">{userBalance.total}</strong> ngày | Đã dùng: <strong className="font-bold">{userBalance.used}</strong> ngày
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500">Còn lại:</span>
              <div className="text-xl font-black text-blue-700">{userBalance.remaining} ngày</div>
            </div>
          </div>

          {profile?.employment_status === 'probation' && userBalance.total === 0 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Lưu ý đối với nhân sự Thử việc:</strong> Bạn hiện chưa có ngày phép năm hưởng lương (0 ngày). Nếu cần nghỉ, vui lòng chọn hình thức <strong>Nghỉ Không Lương</strong> hoặc liên hệ HR để được hỗ trợ.
              </div>
            </div>
          )}

          {/* Loại nghỉ phép */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
              Loại nghỉ phép <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLeaveType('annual')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  leaveType === 'annual'
                    ? 'border-blue-600 bg-blue-50/50 text-blue-900 ring-2 ring-blue-600/20 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="text-sm font-semibold flex items-center gap-1.5">
                  🌴 Nghỉ Phép Năm
                </div>
                <div className="text-[11px] text-slate-500 font-normal mt-0.5">Hưởng nguyên lương (trừ quỹ phép)</div>
              </button>

              <button
                type="button"
                onClick={() => setLeaveType('unpaid')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  leaveType === 'unpaid'
                    ? 'border-amber-600 bg-amber-50/50 text-amber-900 ring-2 ring-amber-600/20 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="text-sm font-semibold flex items-center gap-1.5">
                  ⏳ Nghỉ Không Lương
                </div>
                <div className="text-[11px] text-slate-500 font-normal mt-0.5">Trừ trực tiếp ngày công hạch toán</div>
              </button>

              <button
                type="button"
                onClick={() => setLeaveType('compensatory')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  leaveType === 'compensatory'
                    ? 'border-emerald-600 bg-emerald-50/50 text-emerald-900 ring-2 ring-emerald-600/20 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="text-sm font-semibold flex items-center gap-1.5">
                  🔄 Nghỉ Bù
                </div>
                <div className="text-[11px] text-slate-500 font-normal mt-0.5">Bù trực ca / làm thêm ngày lễ</div>
              </button>

              <button
                type="button"
                onClick={() => setLeaveType('special')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  leaveType === 'special'
                    ? 'border-purple-600 bg-purple-50/50 text-purple-900 ring-2 ring-purple-600/20 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="text-sm font-semibold flex items-center gap-1.5">
                  🎁 Nghỉ Chế Độ (Hiếu/Hỉ)
                </div>
                <div className="text-[11px] text-slate-500 font-normal mt-0.5">Theo luật lao động (Hưởng lương)</div>
              </button>
            </div>
          </div>

          {/* Chọn Thời gian */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Từ ngày <span className="text-red-500">*</span>
              </label>
              <DatePicker
                value={startDate}
                onChange={(val) => {
                  setStartDate(val);
                  if (!endDate) setEndDate(val);
                }}
                placeholder="Chọn ngày bắt đầu"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Đến ngày <span className="text-red-500">*</span>
              </label>
              <DatePicker
                value={endDate}
                onChange={(val) => setEndDate(val)}
                placeholder="Chọn ngày kết thúc"
              />
            </div>
          </div>

          {/* Tùy chọn Buổi nghỉ (Chỉ hiển thị khi nghỉ trong 1 ngày) */}
          {isSingleDay && (
            <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <label className="block text-xs font-bold text-slate-700">
                Thời lượng nghỉ trong ngày:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setLeaveSession('all_day')}
                  className={`p-2 rounded-lg border text-center transition-all ${
                    leaveSession === 'all_day'
                      ? 'bg-blue-50 border-blue-500 text-blue-800 font-bold shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Clock className="w-4 h-4 mx-auto mb-1 text-blue-600" />
                  <div className="text-xs">Cả ngày</div>
                  <div className="text-[10px] text-slate-500 font-normal">1.0 ngày công</div>
                </button>

                <button
                  type="button"
                  onClick={() => setLeaveSession('morning')}
                  className={`p-2 rounded-lg border text-center transition-all ${
                    leaveSession === 'morning'
                      ? 'bg-amber-50 border-amber-500 text-amber-800 font-bold shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Sun className="w-4 h-4 mx-auto mb-1 text-amber-500" />
                  <div className="text-xs">Buổi sáng</div>
                  <div className="text-[10px] text-slate-500 font-normal">0.5 ngày công</div>
                </button>

                <button
                  type="button"
                  onClick={() => setLeaveSession('afternoon')}
                  className={`p-2 rounded-lg border text-center transition-all ${
                    leaveSession === 'afternoon'
                      ? 'bg-orange-50 border-orange-500 text-orange-800 font-bold shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Sunset className="w-4 h-4 mx-auto mb-1 text-orange-500" />
                  <div className="text-xs">Buổi chiều</div>
                  <div className="text-[10px] text-slate-500 font-normal">0.5 ngày công</div>
                </button>
              </div>
            </div>
          )}

          {/* Hiển thị số ngày công nghỉ thực tế */}
          {startDate && endDate && (
            <>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100/80 border border-slate-200 text-xs">
                <span className="text-slate-600">Thời gian nghỉ thực tế (không tính T7, CN, Lễ):</span>
                <span className="font-bold text-slate-900 text-sm">
                  {requestedWorkdays} ngày làm việc {isSingleDay && leaveSession !== 'all_day' ? `(${leaveSession === 'morning' ? 'Buổi sáng' : 'Buổi chiều'})` : ''}
                </span>
              </div>

              {requestedWorkdays === 0 && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Ngày chọn không phải là ngày làm việc!</p>
                    <p className="mt-0.5 text-rose-700">
                      Khoảng thời gian bạn chọn rơi vào <strong>Thứ 7, Chủ Nhật hoặc Ngày Lễ</strong> (công ty mặc định nghỉ). Vui lòng chọn ngày làm việc trong tuần (Thứ 2 - Thứ 6) để gửi đơn xin nghỉ.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Cảnh báo nếu vượt quá quỹ phép năm */}
          {isOverBalance && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-800">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Cảnh báo: Vượt quá số ngày phép năm còn lại!</p>
                <p className="mt-0.5 text-amber-700">
                  Bạn đang xin nghỉ <strong>{requestedWorkdays} ngày</strong> nhưng quỹ phép chỉ còn <strong>{userBalance.remaining} ngày</strong>. Hệ thống gợi ý bạn chuyển sang loại <strong>Nghỉ không lương</strong> để được phê duyệt nhanh chóng.
                </p>
                <button
                  type="button"
                  onClick={() => setLeaveType('unpaid')}
                  className="mt-2 text-xs font-bold text-amber-900 underline hover:text-amber-950"
                >
                  👉 Bấm vào đây để chuyển sang Nghỉ không lương
                </button>
              </div>
            </div>
          )}

          {/* Người nhận bàn giao công việc */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-slate-500" />
              <span>Người nhận bàn giao công việc</span>
            </label>
            <input
              type="text"
              value={handoverNote}
              onChange={(e) => setHandoverNote(e.target.value)}
              placeholder="Nhập tên người nhận bàn giao (Ví dụ: Băng Băng, Y Bình, Duyên Huỳnh...)"
              className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
            />
            <p className="text-[11px] text-slate-400 mt-1">Ghi tên đồng nghiệp hoặc bộ phận sẽ hỗ trợ xử lý công việc trong thời gian nghỉ</p>
          </div>

          {/* Lý do xin nghỉ */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Lý do xin nghỉ <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ghi rõ lý do xin nghỉ phép (Ví dụ: Việc gia đình, Du lịch, Khám sức khỏe...)"
              rows={3}
              className="w-full p-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
              required
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting || requestedWorkdays === 0}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md shadow-blue-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? 'Đang gửi...' : 'Gửi Đơn Xin Nghỉ'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

interface EmployeeLeaveBalanceWidgetProps {
  showActionButton?: boolean;
}

export const EmployeeLeaveBalanceWidget: React.FC<EmployeeLeaveBalanceWidgetProps> = ({
  showActionButton = true,
}) => {
  const { user, profile } = useAuth();
  const { leaveBalances, leaveRequests, holidays } = useCRM();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const currentYear = new Date().getFullYear();
  const currentUserId = profile?.id || user?.id || '';

  const userBalance = useMemo(() => {
    return getEffectiveLeaveBalance(currentUserId, currentYear, leaveBalances, profile, undefined, leaveRequests, holidays);
  }, [leaveBalances, currentUserId, currentYear, profile, leaveRequests, holidays]);

  // Đếm các đơn của nhân viên đang chờ duyệt
  const pendingRequestsCount = useMemo(() => {
    return leaveRequests.filter(
      (r) => r.user_id === currentUserId && (r.status === 'pending' || r.status === 'approved_level_1')
    ).length;
  }, [leaveRequests, currentUserId]);

  return (
    <>
      <div className="bg-linear-to-br from-white to-blue-50/40 rounded-2xl border border-blue-100/80 p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20 shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-slate-800">Quỹ Phép Năm ({currentYear})</h4>
              {profile?.employment_status === 'probation' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  Thử việc
                </span>
              )}
              {pendingRequestsCount > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                  <Clock className="w-3 h-3 mr-1" /> {pendingRequestsCount} đơn chờ duyệt
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Đã dùng: <strong className="text-slate-700 font-bold">{userBalance.used}</strong> / {userBalance.total} ngày | Còn lại: <strong className="text-blue-600 font-black text-sm">{userBalance.remaining}</strong> ngày
            </div>
          </div>
        </div>

        {showActionButton && (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Tạo Đơn Xin Nghỉ
          </button>
        )}
      </div>

      {showActionButton && (
        <CreateLeaveRequestModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      )}
    </>
  );
};
