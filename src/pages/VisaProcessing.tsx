import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useCRM } from '@/context/CRMContext';
import { Passenger } from '@/types';
import { FileText, Check, AlertCircle, Search, Copy, Pencil, LayoutGrid, List, User, Clock, CheckCircle, XCircle, Paperclip, Eye, X, FileCheck, Calendar, Compass } from 'lucide-react';
import { format } from 'date-fns';
import { PassengerDocumentList } from '@/components/PassengerDocumentList';
import { TimeRangeFilter } from '@/components/TimeRangeFilter';
import { CustomSelect } from '@/components/CustomSelect';
import { isDateInTimeRange } from '@/lib/dateUtils';

interface DisqualifiedReasonInputProps {
  passengerId: string;
  initialReason: string;
  onSave: (passengerId: string, status: 'disqualified', reason: string) => void;
}

function DisqualifiedReasonInput({ passengerId, initialReason, onSave }: DisqualifiedReasonInputProps) {
  const [val, setVal] = useState(initialReason);
  const [isEditing, setIsEditing] = useState(!initialReason || initialReason.trim() === '');
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    setVal(initialReason);
    if (!initialReason || initialReason.trim() === '') {
      setIsEditing(true);
    } else {
      setIsEditing(false);
    }
  }, [initialReason]);

  const handleSave = () => {
    if (!val.trim()) {
      toast.error('Vui lòng nhập nội dung giải trình!');
      return;
    }
    onSave(passengerId, 'disqualified', val.trim());
    setShowSuccess(true);
    setIsEditing(false);
    const timer = setTimeout(() => {
      setShowSuccess(false);
    }, 3000);
    return () => clearTimeout(timer);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide block">
          NỘI DUNG GIẢI TRÌNH
        </label>
        {!isEditing && (
          <button
            type="button"
            onClick={handleEdit}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md transition-colors cursor-pointer border border-blue-200 shadow-2xs"
            title="Chỉnh sửa nội dung giải trình"
          >
            <Pencil className="w-3 h-3 text-blue-600" />
            Sửa
          </button>
        )}
      </div>

      {!isEditing ? (
        <div className="bg-white border-2 border-rose-200 rounded-lg p-3 shadow-2xs relative group">
          <p className="text-xs font-semibold text-rose-950 whitespace-pre-wrap leading-relaxed break-words">
            {val || 'Chưa có nội dung giải trình.'}
          </p>
          {showSuccess && (
            <div className="mt-2 pt-2 border-t border-rose-100 flex items-center gap-1 text-[11px] text-emerald-600 font-bold">
              <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
              Đã lưu nội dung giải trình thành công!
            </div>
          )}
        </div>
      ) : (
        <>
          <textarea
            rows={3}
            value={val}
            onChange={e => setVal(e.target.value)}
            placeholder="Nhập nội dung giải trình chi tiết về lý do hồ sơ của khách hàng chưa đạt yêu cầu..."
            className="w-full px-3 py-2 text-xs border-2 border-gray-900 rounded-lg bg-white focus:outline-none focus:border-gray-950 font-medium text-gray-800 shadow-2xs resize-y leading-relaxed"
          />
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <div className="min-h-[20px] flex items-center">
              {showSuccess && (
                <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 animate-pulse">
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                  Đã lưu thành công!
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {initialReason && initialReason.trim() !== '' && (
                <button
                  type="button"
                  onClick={() => {
                    setVal(initialReason);
                    setIsEditing(false);
                  }}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  Hủy
                </button>
              )}
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-2xs hover:shadow-xs active:scale-95 transition-all shrink-0 cursor-pointer"
              >
                Lưu
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function VisaProcessing() {
  const location = useLocation();
  const { passengers, orders, tours, updateVisaStatus } = useCRM();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [selectedPassengerDetail, setSelectedPassengerDetail] = useState<Passenger | null>(null);
  const [disqualifiedReasonModal, setDisqualifiedReasonModal] = useState<{ name: string; reason: string } | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterTimeRange, setFilterTimeRange] = useState('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [sortBy, setSortBy] = useState('newest_created');

  // Xử lý click từ thông báo
  useEffect(() => {
    if (location.state?.searchTarget) {
      setSearchTerm(location.state.searchTarget);
      setFilterStatus('all');
      setFilterTimeRange('all');
      
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Filter passengers who have uploaded documents (passport or labor contract)
  const visaPassengers = passengers
    .filter(p => {
      const hasDocs = p.passport_url || p.labor_contract_url;
      if (!hasDocs) return false;
      
      const order = orders.find(o => o.id === p.order_id);
      const isOrderCancelled = order?.status === 'cancelled' || p.visa_status === 'cancelled';

      // 1. Không hiển thị hồ sơ của đơn đã hủy trên Kanban để tránh nhân viên xử lý nhầm
      if (viewMode === 'kanban' && isOrderCancelled) return false;

      // 2. Status Filter (chỉ áp dụng ở Dạng Danh Sách)
      if (viewMode !== 'kanban') {
        if (filterStatus === 'cancelled') {
          if (!isOrderCancelled) return false;
        } else if (filterStatus === 'all') {
          // Mặc định tab 'Tất cả' hiển thị các hồ sơ đang xử lý (không tính đơn đã hủy)
          if (isOrderCancelled) return false;
        } else {
          if (isOrderCancelled || p.visa_status !== filterStatus) return false;
        }
      }

      // 2. Search Term Filter
      if (searchTerm.trim() !== '') {
        const q = searchTerm.toLowerCase().trim();
        const order = orders.find(o => o.id === p.order_id);
        const tour = tours.find(t => t.id === order?.tour_id);

        const nameMatch = p.full_name && p.full_name.toLowerCase().includes(q);
        const passportMatch = p.passport_number && p.passport_number.toLowerCase().includes(q);
        const phoneMatch = p.phone && p.phone.includes(q);
        const orderMatch = p.order_id && p.order_id.toLowerCase().includes(q);
        const tourCodeMatch = tour && tour.code && tour.code.toLowerCase().includes(q);
        const tourNameMatch = tour && tour.name && tour.name.toLowerCase().includes(q);
        const countryMatch = tour && tour.visa_country && tour.visa_country.toLowerCase().includes(q);

        if (!nameMatch && !passportMatch && !phoneMatch && !orderMatch && !tourCodeMatch && !tourNameMatch && !countryMatch) {
          return false;
        }
      }

      // 3. Time Range Filter (based on visa_submitted_at or created_at)
      if (filterTimeRange !== 'all') {
        const dateToCheckStr = p.visa_submitted_at || p.created_at;
        if (!isDateInTimeRange(dateToCheckStr, filterTimeRange, filterStartDate, filterEndDate)) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'newest_created') {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      } else if (sortBy === 'oldest_created') {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateA - dateB;
      } else if (sortBy === 'newest_submitted') {
        const dateA = a.visa_submitted_at ? new Date(a.visa_submitted_at).getTime() : 0;
        const dateB = b.visa_submitted_at ? new Date(b.visa_submitted_at).getTime() : 0;
        return dateB - dateA;
      } else if (sortBy === 'deadline_asc') {
        const orderA = orders.find(o => o.id === a.order_id);
        const tourA = tours.find(t => t.id === orderA?.tour_id);
        const orderB = orders.find(o => o.id === b.order_id);
        const tourB = tours.find(t => t.id === orderB?.tour_id);

        const dlA = tourA?.visa_deadline ? new Date(tourA.visa_deadline).getTime() : Infinity;
        const dlB = tourB?.visa_deadline ? new Date(tourB.visa_deadline).getTime() : Infinity;
        return dlA - dlB;
      }
      return 0;
    });

  const getStatusBadge = (status: Passenger['visa_status'], reason?: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Chờ tiếp nhận</span>;
      case 'processing':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Đang xử lý hồ sơ</span>;
      case 'approved':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Đã duyệt Visa</span>;
      case 'rejected':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Bị từ chối</span>;
      case 'disqualified':
        return (
          <button
            type="button"
            onClick={() => {
              setDisqualifiedReasonModal({
                name: 'Hành khách',
                reason: reason || 'Chưa cập nhật lý do chi tiết.'
              });
            }}
            title="Bấm để xem lý do hồ sơ chưa đạt"
            className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-100 text-rose-800 border border-rose-200 hover:bg-rose-200 transition-colors cursor-pointer inline-flex items-center gap-1"
          >
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            Hồ sơ chưa đạt
          </button>
        );
      case 'cancelled':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-100 text-rose-800 border border-rose-200">Đơn đã hủy</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">Không yêu cầu</span>;
    }
  };

  const kanbanColumns = [
    { id: 'pending', title: '⏳ 1. Chờ tiếp nhận', color: 'amber', bgHeader: 'bg-amber-500 text-white', borderCol: 'border-amber-200 bg-amber-50/20' },
    { id: 'processing', title: '🔄 2. Đang làm / Nộp LSQ', color: 'blue', bgHeader: 'bg-blue-600 text-white', borderCol: 'border-blue-200 bg-blue-50/20' },
    { id: 'approved', title: '✅ 3. Đã duyệt Visa', color: 'emerald', bgHeader: 'bg-emerald-600 text-white', borderCol: 'border-emerald-200 bg-emerald-50/20' },
    { id: 'disqualified', title: '⚠️ 3. Hồ sơ chưa đạt', color: 'orange', bgHeader: 'bg-amber-600 text-white', borderCol: 'border-amber-200 bg-amber-50/20' },
    { id: 'rejected', title: '❌ 3. Bị từ chối', color: 'rose', bgHeader: 'bg-rose-600 text-white', borderCol: 'border-rose-200 bg-rose-50/20' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Xử lý & Cấp duyệt Visa</h2>
          <p className="text-xs text-slate-500 mt-1">
            Xem thông tin giấy tờ, hồ sơ làm visa do sale upload lên và cập nhật trạng thái làm visa cho từng hành khách.
          </p>
        </div>

        {/* CONTROLS SWITCHER: KANBAN vs LIST */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('kanban')}
            className={`h-8 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'kanban'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5 text-blue-600" />
            <span>Bảng Kanban</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`h-8 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'list'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <List className="w-3.5 h-3.5 text-purple-600" />
            <span>Dạng Danh Sách</span>
          </button>
        </div>
      </div>

      {/* Filter and Overview tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-0 relative z-20">
        {/* Hàng 1: Bộ lọc trạng thái (chỉ hiển thị ở Dạng Danh Sách) */}
        {viewMode !== 'kanban' && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border-b border-slate-100 bg-white rounded-t-2xl">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Trạng thái Visa:</span>
              <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
                {['all', 'pending', 'processing', 'approved', 'rejected', 'disqualified', 'cancelled'].map(status => {
                  const label = status === 'all' ? 'Tất cả' :
                                status === 'pending' ? 'Chờ duyệt' :
                                status === 'processing' ? 'Đang làm' :
                                status === 'approved' ? 'Đã có Visa' : 
                                status === 'disqualified' ? 'Chưa đạt' : 
                                status === 'cancelled' ? 'Đã hủy' : 'Từ chối';
                  return (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        filterStatus === status ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="text-xs text-slate-500 font-medium shrink-0">
              Hiển thị <span className="font-extrabold text-slate-900">{visaPassengers.length}</span> hồ sơ khách hàng.
            </div>
          </div>
        )}

        {/* Hàng 2: Tìm kiếm, lọc thời gian và sắp xếp */}
        <div className={`p-4 bg-slate-50 grid grid-cols-1 md:grid-cols-3 gap-3 items-center ${viewMode === 'kanban' ? 'rounded-2xl' : 'rounded-b-2xl border-t border-slate-100'}`}>
          {/* Ô tìm kiếm */}
          <div className="relative w-full">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </span>
            <input
              type="text"
              placeholder="Tìm tên khách, hộ chiếu, tour..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal"
            />
          </div>

          {/* Lọc thời gian nộp */}
          <div className="w-full">
            <TimeRangeFilter
              value={filterTimeRange}
              onChange={setFilterTimeRange}
              startDate={filterStartDate}
              onChangeStartDate={setFilterStartDate}
              endDate={filterEndDate}
              onChangeEndDate={setFilterEndDate}
              prefixText="Nộp/Tạo"
              className="w-full"
              selectClassName="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-none cursor-pointer"
            />
          </div>

          {/* Sắp xếp */}
          <div className="w-full">
            <CustomSelect
              options={[
                { value: 'newest_created', label: 'Sắp xếp: Khách mới nhất' },
                { value: 'oldest_created', label: 'Sắp xếp: Khách cũ nhất' },
                { value: 'newest_submitted', label: 'Sắp xếp: Ngày nộp mới nhất' },
                { value: 'deadline_asc', label: 'Sắp xếp: Hạn nộp Visa gần nhất' },
              ]}
              value={sortBy}
              onChange={setSortBy}
              className="w-full"
              buttonClassName="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-semibold cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: COMPACT KANBAN BOARD WITH UNIFORM COLUMNS */}
      {viewMode === 'kanban' && (
        <div className="w-full pb-6">
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-3">
            {kanbanColumns.map(col => {
              const colPassengers = visaPassengers.filter(p => {
                if (col.id === 'pending') return p.visa_status === 'pending' || !p.visa_status;
                return p.visa_status === col.id;
              });

              return (
                <div key={col.id} className={`rounded-2xl border ${col.borderCol} p-3 flex flex-col space-y-3 h-full max-h-[80vh] min-w-0`}>
                  {/* COLUMN HEADER */}
                  <div className={`p-2.5 rounded-xl shadow-2xs flex items-center justify-between ${col.bgHeader}`}>
                  <h4 className="text-xs font-black uppercase tracking-wider line-clamp-1">{col.title}</h4>
                  <span className="text-xs font-extrabold bg-white/20 px-2 py-0.5 rounded-full shrink-0">
                    {colPassengers.length}
                  </span>
                </div>

                {/* COMPACT PASSENGER CARDS IN COLUMN */}
                <div className="space-y-3 flex-1 overflow-y-auto pr-1 pb-1 scrollbar-thin">
                  {colPassengers.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 font-medium text-xs border border-dashed border-slate-300 rounded-xl bg-white/50">
                      Không có hồ sơ
                    </div>
                  ) : (
                    colPassengers.map(passenger => {
                      const order = orders.find(o => o.id === passenger.order_id);
                      const tour = tours.find(t => t.id === order?.tour_id);

                      // Đếm số lượng file đính kèm
                      const docsCount = (passenger.passport_url ? passenger.passport_url.split(',').filter(Boolean).length : 0) +
                                       (passenger.labor_contract_url ? passenger.labor_contract_url.split(',').filter(Boolean).length : 0);

                      return (
                        <div 
                          key={passenger.id} 
                          onClick={() => setSelectedPassengerDetail(passenger)}
                          className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs hover:border-blue-400 hover:shadow-md hover:-translate-y-0.5 transition-all space-y-2.5 cursor-pointer group"
                        >
                          {/* Name & Role Badge */}
                          <div className="flex items-start justify-between gap-1 border-b border-slate-100 pb-2">
                            <div className="overflow-hidden">
                              <h5 className="font-extrabold text-slate-900 text-xs flex items-center gap-1 group-hover:text-blue-700 transition-colors line-clamp-1">
                                <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                <span className="truncate">{passenger.full_name}</span>
                              </h5>
                              {passenger.is_payer && (
                                <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[9px] font-extrabold rounded bg-blue-100 text-blue-700 uppercase">
                                  Trưởng đoàn
                                </span>
                              )}
                            </div>
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                const cleanCode = passenger.order_id.substring(0, 8).toUpperCase();
                                navigator.clipboard.writeText(cleanCode);
                                toast.success(`Đã sao chép mã đơn hàng: ${cleanCode}`);
                              }}
                              className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 shrink-0 hover:bg-slate-200 transition-colors"
                              title="Bấm để sao chép mã đơn"
                            >
                              #{passenger.order_id.substring(0, 8)}
                            </span>
                          </div>

                          {/* Tour / Service Name */}
                          <div className="text-[11px] space-y-1 text-slate-600">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-slate-400 text-[10px]">Dịch vụ:</span>
                              <span className="font-bold text-blue-700 truncate max-w-[130px] text-right">
                                {tour?.tour_type === 'visa' ? `Visa ${tour.visa_country}` : (tour?.code || 'Tour')}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-slate-400 text-[10px]">Ngày nộp:</span>
                              <span className="font-semibold text-emerald-700 text-[10px]">
                                {passenger.visa_submitted_at ? format(new Date(passenger.visa_submitted_at), 'dd/MM/yyyy') : 'Chưa có'}
                              </span>
                            </div>
                          </div>

                          {/* Footer: Document count & View Detail Indicator */}
                          <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
                            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 inline-flex items-center gap-1">
                              <Paperclip className="w-3 h-3" />
                              {docsCount} file
                            </span>

                            <span className="font-bold text-blue-600 group-hover:underline inline-flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Eye className="w-3 h-3" /> Chi tiết
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      )}

      {/* VIEW MODE 2: LIST VIEW */}
      {viewMode === 'list' && (
        <div className="grid grid-cols-1 gap-6">
          {visaPassengers.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center shadow-2xs">
              <FileText className="w-14 h-14 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm font-medium">Không tìm thấy hồ sơ visa nào cần xử lý.</p>
            </div>
          ) : (
            visaPassengers.map(passenger => {
              const order = orders.find(o => o.id === passenger.order_id);
              const tour = tours.find(t => t.id === order?.tour_id);

              return (
                <div key={passenger.id} className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden hover:shadow-md transition-shadow">
                  <div className="p-6 flex flex-col lg:flex-row items-start gap-6">
                    {/* Left block: Passenger info & Tour */}
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="text-lg font-bold text-slate-900">{passenger.full_name}</h3>
                        {passenger.is_payer && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-700 uppercase">Trưởng đoàn</span>
                        )}
                        {getStatusBadge(passenger.visa_status, passenger.visa_disqualified_reason)}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm text-slate-600">
                        <div>
                          <span className="text-slate-400">Mã đơn:</span>{' '}
                          <span 
                            onClick={(e) => {
                              e.stopPropagation();
                              const cleanCode = passenger.order_id.substring(0, 8).toUpperCase();
                              navigator.clipboard.writeText(cleanCode);
                              toast.success(`Đã sao chép mã đơn hàng: ${cleanCode}`);
                            }}
                            className="font-semibold text-slate-800 hover:text-blue-600 cursor-pointer inline-flex items-center gap-1 group/copy"
                            title="Bấm để sao chép mã đơn hàng"
                          >
                            #{passenger.order_id.substring(0, 8)}
                            <Copy className="w-3.5 h-3.5 text-slate-400 group-hover/copy:text-blue-600 opacity-60 group-hover/copy:opacity-100 transition-opacity" />
                          </span>
                        </div>
                        <div>
                          {tour?.tour_type === 'visa' ? (
                            <>
                              <span className="text-slate-400">Dịch vụ:</span>{' '}
                              <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-50 text-purple-700 border border-purple-100">
                                🛂 Visa lẻ {tour.visa_country}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="text-slate-400">Tour đặt:</span>{' '}
                              <span className="font-semibold text-blue-600">{tour?.code}</span>
                            </>
                          )}
                        </div>
                        <div>
                          <span className="text-slate-400">Ngày sinh:</span>{' '}
                          <span className="font-medium text-slate-800">
                            {passenger.dob ? format(new Date(passenger.dob), 'dd/MM/yyyy') : 'Chưa nhập'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">Phân loại/Cấp độ:</span>{' '}
                          <span className="font-semibold text-slate-800">
                            {tour?.tour_type === 'visa' ? (
                              <span className="text-xs">
                                {tour.visa_service_type} ({tour.visa_speed === 'urgent' ? '⚡ Khẩn' : '⏳ Thường'})
                              </span>
                            ) : (
                              'Visa đi Tour'
                            )}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">Thời gian nộp:</span>{' '}
                          <span className="font-semibold text-emerald-600">
                            {passenger.visa_submitted_at ? format(new Date(passenger.visa_submitted_at), 'dd/MM/yyyy HH:mm') : 'Chưa cập nhật'}
                          </span>
                        </div>
                        {tour?.visa_deadline && (
                          <div className="text-rose-600 font-medium">
                            <span>Hạn nộp Visa:</span> {format(new Date(tour.visa_deadline), 'dd/MM/yyyy')}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Middle block: Documents list */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 w-full lg:w-[320px] shrink-0">
                      <div className="flex items-center justify-between mb-1 h-5">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Giấy tờ Sale đã upload</span>
                        {passenger.passport_url && (
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                            {passenger.passport_url.split(',').filter(Boolean).length} file
                          </span>
                        )}
                      </div>
                      
                      <PassengerDocumentList 
                        passportUrl={passenger.passport_url}
                        laborContractUrl={passenger.labor_contract_url}
                        maxInitialDisplay={3}
                        variant="card"
                      />
                    </div>

                    {/* Right block: Actions to update state */}
                    <div className="flex flex-col gap-2 w-full lg:w-[250px] shrink-0">
                      <div className="flex items-center justify-between mb-1 h-5">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Cập nhật trạng thái</span>
                      </div>
                      <CustomSelect
                        options={[
                          { value: 'pending', label: 'Chờ tiếp nhận' },
                          { value: 'processing', label: 'Đang nộp hồ sơ' },
                          { value: 'approved', label: 'Đã duyệt (Có Visa)' },
                          { value: 'rejected', label: 'Bị từ chối' },
                          { value: 'disqualified', label: 'Hồ sơ chưa đạt' },
                        ]}
                        value={passenger.visa_status || 'pending'}
                        onChange={val => {
                          const newStatus = val as Passenger['visa_status'];
                          if (newStatus === 'disqualified') {
                            updateVisaStatus(passenger.id, newStatus, passenger.visa_disqualified_reason || '');
                          } else {
                            updateVisaStatus(passenger.id, newStatus);
                          }
                        }}
                        className="w-full"
                        buttonClassName="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-semibold text-slate-800 cursor-pointer"
                      />

                      {passenger.visa_status === 'disqualified' && (
                        <div className="mt-2.5 p-3.5 bg-rose-50/40 border border-rose-100 rounded-lg">
                          <DisqualifiedReasonInput 
                            passengerId={passenger.id} 
                            initialReason={passenger.visa_disqualified_reason || ''} 
                            onSave={updateVisaStatus} 
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* FULL PASSENGER DETAIL POPUP MODAL */}
      {selectedPassengerDetail && (() => {
        const p = selectedPassengerDetail;
        const order = orders.find(o => o.id === p.order_id);
        const tour = tours.find(t => t.id === order?.tour_id);

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn" onClick={() => setSelectedPassengerDetail(null)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 p-6 space-y-6 font-sans" onClick={e => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-extrabold text-sm flex items-center justify-center shrink-0">
                    {p.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <span>{p.full_name}</span>
                      {p.is_payer && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-700 uppercase">
                          Trưởng đoàn
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Đơn hàng: <strong className="text-slate-800">#{p.order_id.substring(0, 8)}</strong> • Nộp ngày: {p.visa_submitted_at ? format(new Date(p.visa_submitted_at), 'dd/MM/yyyy HH:mm') : 'Chưa cập nhật'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {getStatusBadge(p.visa_status, p.visa_disqualified_reason)}
                  <button
                    type="button"
                    onClick={() => setSelectedPassengerDetail(null)}
                    className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Grid Body */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Personal & Tour Details */}
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-4 h-4 text-blue-600" /> Thông tin Hành khách
                    </h4>
                    <div className="text-xs space-y-1.5 text-slate-700">
                      <div><span className="text-slate-500">Giới tính:</span> <strong>{p.gender === 'male' ? 'Nam' : 'Nữ'}</strong></div>
                      <div><span className="text-slate-500">Ngày sinh:</span> <strong>{p.dob ? format(new Date(p.dob), 'dd/MM/yyyy') : 'Chưa nhập'}</strong></div>
                      <div><span className="text-slate-500">Số Hộ Chiếu:</span> <strong className="font-mono text-blue-700">{p.passport_number || 'Chưa cập nhật'}</strong></div>
                      {p.passport_expiry_date && (
                        <div><span className="text-slate-500">Hạn Hộ Chiếu:</span> <strong>{format(new Date(p.passport_expiry_date), 'dd/MM/yyyy')}</strong></div>
                      )}
                      {p.phone && <div><span className="text-slate-500">Số điện thoại:</span> <strong>{p.phone}</strong></div>}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Compass className="w-4 h-4 text-purple-600" /> Chi tiết Tour / Dịch vụ Visa
                    </h4>
                    <div className="text-xs space-y-1.5 text-slate-700">
                      <div><span className="text-slate-500">Loại dịch vụ:</span> <strong>{tour?.tour_type === 'visa' ? `Visa lẻ ${tour?.visa_country || ''}` : 'Visa đi Tour'}</strong></div>
                      {tour && <div><span className="text-slate-500">Tên Tour/Dịch vụ:</span> <strong className="text-blue-700">{tour.code}</strong></div>}
                      {tour?.visa_deadline && (
                        <div className="text-rose-600 font-bold flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" /> Hạn nộp Visa: {format(new Date(tour.visa_deadline), 'dd/MM/yyyy')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: Documents & Status Selector */}
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Paperclip className="w-4 h-4 text-emerald-600" /> Giấy tờ do Sale upload
                    </h4>
                    <PassengerDocumentList 
                      passportUrl={p.passport_url}
                      laborContractUrl={p.labor_contract_url}
                      maxInitialDisplay={5}
                      variant="card"
                    />
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      ⚙️ Cập nhật Trạng Thái Visa
                    </h4>
                    <CustomSelect
                      options={[
                        { value: 'pending', label: '⏳ 1. Chờ tiếp nhận hồ sơ' },
                        { value: 'processing', label: '🔄 2. Đang nộp / Xử lý LSQ' },
                        { value: 'approved', label: '✅ 3. Đã duyệt (Có Visa)' },
                        { value: 'disqualified', label: '⚠️ 3. Hồ sơ chưa đạt' },
                        { value: 'rejected', label: '❌ 3. Bị từ chối (Trượt)' },
                      ]}
                      value={p.visa_status || 'pending'}
                      onChange={val => {
                        const newStatus = val as Passenger['visa_status'];
                        if (newStatus === 'disqualified') {
                          updateVisaStatus(p.id, newStatus, p.visa_disqualified_reason || '');
                        } else {
                          updateVisaStatus(p.id, newStatus);
                        }
                      }}
                      className="w-full"
                      buttonClassName="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-bold text-slate-800 cursor-pointer"
                    />

                    {p.visa_status === 'disqualified' && (
                      <div className="pt-2">
                        <DisqualifiedReasonInput 
                          passengerId={p.id} 
                          initialReason={p.visa_disqualified_reason || ''} 
                          onSave={updateVisaStatus} 
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="border-t border-slate-100 pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedPassengerDetail(null)}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Đóng cửa sổ
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Disqualified Reason Modal */}
      {disqualifiedReasonModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="disqualified_reason_modal">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-rose-100 transform transition-all duration-300 scale-100">
            <div className="bg-rose-50 px-6 py-4 flex items-center justify-between border-b border-rose-100">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600" />
                <h3 className="text-sm font-black text-rose-950 uppercase tracking-wide">Chi tiết hồ sơ chưa đạt</h3>
              </div>
              <button
                type="button"
                onClick={() => setDisqualifiedReasonModal(null)}
                className="text-rose-400 hover:text-rose-600 transition-colors text-lg font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Khách hàng</span>
                <span className="text-sm font-extrabold text-slate-950 uppercase mt-0.5 block">{disqualifiedReasonModal.name}</span>
              </div>
              <div className="p-4 bg-rose-50/50 rounded-lg border border-rose-100">
                <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block mb-1">Lý do cụ thể</span>
                <p className="text-xs font-semibold text-rose-950 whitespace-pre-wrap leading-relaxed">{disqualifiedReasonModal.reason}</p>
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-3 flex justify-end">
              <button
                type="button"
                onClick={() => setDisqualifiedReasonModal(null)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 transition-all text-white font-extrabold text-xs rounded-lg uppercase shadow-md shadow-rose-600/10 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
