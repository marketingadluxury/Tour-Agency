import React, { useState, useEffect } from 'react';
import { Grid, X, Globe, Plus, Trash2, Check } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Tour, TourStatus } from '@/types';
import { extractSkuPrefix } from '@/utils/skuUtils';
import { DatePicker } from '@/components/DatePicker';

interface BulkSeriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  baseTour: Tour | null;
  onAddTour: (tourData: any) => void;
  categories: string[];
  defaultNoticeSections: any[];
}

// Helper to format tour code based on base code and departure date (DDMMYY)
function getFormattedCode(currentCode: string, departureDateIso: string): string {
  if (!departureDateIso) return currentCode;
  const date = new Date(departureDateIso);
  if (isNaN(date.getTime())) return currentCode;

  // Clean any trailing -CLONE
  let cleanCode = currentCode.replace(/-CLONE/gi, '');
  
  // Strip trailing 6-digit date suffix (e.g., -150726 or 150726)
  const hasHyphenSuffix = /-\d{6}$/.test(cleanCode);
  const hasPlainSuffix = /\d{6}$/.test(cleanCode) && !/-\d{6}$/.test(cleanCode);
  
  let basePart = cleanCode;
  let separator = '';

  if (hasHyphenSuffix) {
    basePart = cleanCode.substring(0, cleanCode.length - 7);
    separator = '-';
  } else if (hasPlainSuffix) {
    basePart = cleanCode.substring(0, cleanCode.length - 6);
    separator = '';
  } else {
    separator = '-';
  }

  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = String(date.getFullYear()).slice(-2);
  const newDateSuffix = `${d}${m}${y}`;

  return `${basePart}${separator}${newDateSuffix}`;
}

export const BulkSeriesModal: React.FC<BulkSeriesModalProps> = ({
  isOpen,
  onClose,
  baseTour,
  onAddTour,
  categories,
  defaultNoticeSections,
}) => {
  const [seriesSku, setSeriesSku] = useState('');
  const [customDate, setCustomDate] = useState('');
  const [datesList, setDatesList] = useState<Array<{ date: Date; selected: boolean }>>([]);

  useEffect(() => {
    if (baseTour) {
      setSeriesSku(baseTour.wp_product_sku || extractSkuPrefix(baseTour.code) || '');
      setCustomDate('');
      setDatesList([]);
    }
  }, [baseTour]);

  if (!isOpen || !baseTour) return null;

  const handleAddDate = () => {
    if (!customDate) {
      toast.error('Vui lòng chọn ngày khởi hành trước!');
      return;
    }
    const baseDep = new Date(baseTour.departure_time);
    const dateToAdd = new Date(customDate);
    dateToAdd.setHours(baseDep.getHours(), baseDep.getMinutes(), 0, 0);

    const isDuplicate = datesList.some(item => item.date.getTime() === dateToAdd.getTime());
    if (isDuplicate) {
      toast.error('Ngày khởi hành này đã tồn tại trong danh sách!');
      return;
    }
    setDatesList(prev => [...prev, { date: dateToAdd, selected: true }].sort((a, b) => a.date.getTime() - b.date.getTime()));
    setCustomDate('');
  };

  const handleCreateSeries = () => {
    const selectedDates = datesList.filter(d => d.selected);
    if (selectedDates.length === 0) {
      toast.error('Vui lòng chọn hoặc thêm ít nhất một ngày khởi hành hợp lệ!');
      return;
    }

    const baseDep = new Date(baseTour.departure_time);
    const baseRet = new Date(baseTour.return_time);
    const durationMs = baseRet.getTime() - baseDep.getTime();

    selectedDates.forEach(({ date }) => {
      const generatedCode = getFormattedCode(baseTour.code, date.toISOString());
      const generatedReturnTime = new Date(date.getTime() + durationMs);

      let generatedVisaDeadline: string | undefined = undefined;
      if (baseTour.visa_deadline) {
        const baseVisa = new Date(baseTour.visa_deadline);
        const visaDiffMs = baseDep.getTime() - baseVisa.getTime();
        generatedVisaDeadline = new Date(date.getTime() - visaDiffMs).toISOString();
      }

      let generatedTicketDeadline: string | undefined = undefined;
      if (baseTour.ticket_deadline) {
        const baseTicket = new Date(baseTour.ticket_deadline);
        const ticketDiffMs = baseDep.getTime() - baseTicket.getTime();
        generatedTicketDeadline = new Date(date.getTime() - ticketDiffMs).toISOString();
      }

      let noticeSecs = defaultNoticeSections;
      if (baseTour.notice_sections) {
        try {
          noticeSecs = JSON.parse(baseTour.notice_sections);
        } catch (e) {
          // fallback
        }
      }

      const newTourData = {
        code: generatedCode,
        name: baseTour.name,
        destination: baseTour.destination || 'Chưa xác định',
        start_date: date.toISOString().substring(0, 10),
        end_date: generatedReturnTime.toISOString().substring(0, 10),
        duration: baseTour.duration,
        departure_time: date.toISOString(),
        return_time: generatedReturnTime.toISOString(),
        airline: baseTour.airline || 'Vietnam Airlines',
        hotel: baseTour.hotel || 'Khách sạn 4*',
        price: baseTour.price,
        commission: baseTour.commission,
        total_seats: baseTour.total_seats,
        flight_out: baseTour.flight_out || undefined,
        flight_out_transit: baseTour.flight_out_transit || undefined,
        flight_in: baseTour.flight_in || undefined,
        flight_in_transit: baseTour.flight_in_transit || undefined,
        transit_info: baseTour.transit_info || undefined,
        guide_name: baseTour.guide_name || undefined,
        guide_phone: baseTour.guide_phone || undefined,
        ticket_status: baseTour.ticket_status || 'CHỜ XUẤT VÉ',
        visa_deadline: generatedVisaDeadline,
        ticket_deadline: generatedTicketDeadline,
        description: baseTour.description || undefined,
        tour_status: 'available' as TourStatus,
        category: baseTour.category || categories[0],
        hold_duration_hours: baseTour.hold_duration_hours || 48,
        price_adult: baseTour.price_adult ?? baseTour.price,
        price_child: baseTour.price_child ?? Math.round(baseTour.price * 0.8),
        price_infant: baseTour.price_infant ?? Math.round(baseTour.price * 0.3),
        single_room_surcharge: baseTour.single_room_surcharge ?? 7500000,
        itinerary_pdf_url: baseTour.itinerary_pdf_url || undefined,
        notice_sections: JSON.stringify(noticeSecs),
        tour_type: baseTour.tour_type || 'partner',
        partner_name: baseTour.partner_name || undefined,
        partner_contact: baseTour.partner_contact || undefined,
        organization_name: baseTour.organization_name || undefined,
        group_leader_contact: baseTour.group_leader_contact || undefined,
        custom_requirements: baseTour.custom_requirements || undefined,
        wp_product_sku: seriesSku.trim().toUpperCase() || baseTour.wp_product_sku || undefined,
        wp_product_id: baseTour.wp_product_id || undefined,
      };

      onAddTour(newTourData);
    });

    toast.success(`Đã khởi tạo thành công chuỗi gồm ${selectedDates.length} ngày khởi hành cho Tour series này!`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-purple-50 border-b border-purple-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
              <Grid className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base">Bộ tạo đoàn khởi hành hàng loạt</h3>
              <p className="text-xs text-slate-500 font-semibold">Tự động hóa nhân bản tour sang nhiều ngày khởi hành tùy chọn trong tích tắc.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-full transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 bg-slate-50/40">
          {/* Left Column: Rules configuration (5 cols) */}
          <div className="md:col-span-5 space-y-4">
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-3">
              <h4 className="text-xs font-black text-purple-700 uppercase tracking-wider">Hành trình gốc</h4>
              <div>
                <div className="text-xs font-bold text-slate-800 line-clamp-2 uppercase" title={baseTour.name}>
                  {baseTour.name}
                </div>
                <div className="text-[11px] text-slate-500 font-semibold mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                  <span>{baseTour.duration}</span>
                  <span>•</span>
                  <span>Hotel: {baseTour.hotel}</span>
                  <span>•</span>
                  <span>{baseTour.airline}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 flex justify-between text-xs">
                <span className="text-slate-500 font-semibold">Mã gốc:</span>
                <strong className="text-slate-800 font-mono">{baseTour.code}</strong>
              </div>
              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                <label className="text-[11px] font-bold text-indigo-900 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-indigo-600" /> Mã SKU Web dùng chung cho chuỗi:
                </label>
                <input
                  type="text"
                  value={seriesSku}
                  onChange={e => setSeriesSku(e.target.value.toUpperCase())}
                  placeholder={baseTour.wp_product_sku || extractSkuPrefix(baseTour.code) || 'Ví dụ: OBAU-SYDMEL-JQ'}
                  className="w-full h-8 px-2.5 border border-indigo-200 rounded-lg text-xs font-mono font-bold text-indigo-900 bg-indigo-50/40 uppercase focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <p className="text-[10px] text-slate-500">Tất cả {datesList.length || 'các'} đợt khởi hành tạo ra sẽ mang cùng SKU này để tự động gom về 1 tour trên Web.</p>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-4">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Thêm ngày khởi hành mới</h4>
              
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Chọn Ngày khởi hành muốn tạo *</label>
                <DatePicker
                  value={customDate}
                  onChange={setCustomDate}
                  placeholder="dd/mm/yyyy"
                />
              </div>

              <button
                type="button"
                onClick={handleAddDate}
                className="w-full h-9 inline-flex items-center justify-center px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-black transition-all shadow-sm"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Thêm ngày này vào danh sách
              </button>
            </div>
          </div>

          {/* Right Column: Generated Dates Preview (7 cols) */}
          <div className="md:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[350px]">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider font-sans">Danh sách đoàn sắp khởi tạo</span>
              <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded">
                Tổng số: {datesList.length} ngày
              </span>
            </div>

            <div className="overflow-y-auto divide-y divide-slate-100 flex-1 max-h-[320px]">
              {datesList.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-xs px-6">
                  <p className="font-semibold">Chưa có ngày khởi hành nào được chọn.</p>
                  <p className="text-[11px] mt-1 text-slate-400">Vui lòng chọn ngày khởi hành ở cột bên trái và bấm thêm.</p>
                </div>
              ) : (
                datesList.map((item, idx) => {
                  const baseDep = new Date(baseTour.departure_time);
                  const baseRet = new Date(baseTour.return_time);
                  const durationMs = baseRet.getTime() - baseDep.getTime();
                  const retDate = new Date(item.date.getTime() + durationMs);

                  const tourCodePreview = getFormattedCode(baseTour.code, item.date.toISOString());
                  const dayNamesMap = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
                  const vietnameseDayName = dayNamesMap[item.date.getDay()];

                  return (
                    <div key={idx} className={`p-3.5 flex items-center justify-between hover:bg-slate-50/60 transition-colors ${!item.selected ? 'opacity-50' : ''}`}>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded">
                            {tourCodePreview}
                          </span>
                          <span className="text-[10px] text-purple-600 font-bold uppercase tracking-wider">
                            {vietnameseDayName}
                          </span>
                        </div>
                        <div className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                          <span>Đi: <strong className="text-slate-800">{format(item.date, 'dd/MM/yyyy HH:mm')}</strong></span>
                          <span>→</span>
                          <span>Về: <strong className="text-slate-800">{format(retDate, 'dd/MM/yyyy HH:mm')}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={(e) => {
                            const updated = [...datesList];
                            updated[idx].selected = e.target.checked;
                            setDatesList(updated);
                          }}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded cursor-pointer animate-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setDatesList(prev => prev.filter((_, i) => i !== idx));
                          }}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Xóa ngày này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 text-xs font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            disabled={datesList.filter(d => d.selected).length === 0}
            onClick={handleCreateSeries}
            className="h-9 px-5 text-xs font-black text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm hover:shadow transition-all inline-flex items-center"
          >
            <Check className="w-4 h-4 mr-1.5" />
            Xác nhận tạo {datesList.filter(d => d.selected).length} Tour khởi hành
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkSeriesModal;
