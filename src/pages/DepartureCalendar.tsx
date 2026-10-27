import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCRM } from '@/context/CRMContext';
import { useAuth } from '@/context/AuthContext';
import { Tour, MetaLead } from '@/types';
import { Filter, Search, Plus, Plane, Calendar as CalendarIcon, User, ChevronDown, ChevronUp, Building, Tag, X, Clock, ShoppingCart, Users, FileText, HelpCircle, Coins, Sparkles, MessageSquare, Share2, Megaphone, UserCheck, Globe, LogIn } from 'lucide-react';
import { format } from 'date-fns';
import { DatePicker } from '../components/DatePicker';
import { TimeRangeFilter } from '../components/TimeRangeFilter';
import { CustomSelect } from '../components/CustomSelect';
import { isDateInTimeRange } from '../lib/dateUtils';
import { fetchMetaLeads } from '../lib/metaCapiService';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN').format(amount);
};

const formatDate = (dateString: string | undefined | null) => {
  if (!dateString) return 'Chưa xác định';
  try {
    return format(new Date(dateString), 'dd/MM/yyyy');
  } catch (e) {
    return 'Lỗi ngày';
  }
};

const getEffectiveTourStatus = (tour: Tour): string | undefined => {
  const departureDateStr = tour.departure_time || tour.start_date;
  if (departureDateStr) {
    try {
      const departureDate = new Date(departureDateStr);
      const today = new Date();
      const departureMidnight = new Date(departureDate.getFullYear(), departureDate.getMonth(), departureDate.getDate());
      const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      const diffTime = departureMidnight.getTime() - todayMidnight.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays >= 0 && diffDays <= 20) {
        return 'last_minute';
      }
    } catch (e) {
      // ignore
    }
  }
  return tour.tour_status;
};

const SeatStatusBadge = ({ status }: { status: Tour['seat_status'] }) => {
  if (status === 'Còn chỗ') return <span className="inline-flex items-center px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-sm">{status}</span>;
  if (status === 'Hết chỗ') return <span className="inline-flex items-center px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full bg-rose-50 text-rose-700 border border-rose-200/60 shadow-sm">{status}</span>;
  if (status === 'Overbooked') return <span className="inline-flex items-center px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full bg-purple-50 text-purple-700 border border-purple-200/60 shadow-sm">{status}</span>;
  return null;
};

const TourCard: React.FC<{ 
  tour: Tour; 
  onBookClick: (tour: Tour) => void;
  onShowNotice: (tour: Tour) => void;
  isGuest?: boolean;
}> = ({ tour, onBookClick, onShowNotice, isGuest }) => {
  const { currentRole } = useCRM();
  const [expanded, setExpanded] = useState(false);

  const effectiveTourStatus = getEffectiveTourStatus(tour);

  const borderClasses = (() => {
    // Cả "Giờ chót" (tour_status === 'last_minute') và "Hết chỗ" (seat_status === 'Hết chỗ') đều viền đỏ nổi bật
    if (tour.seat_status === 'Hết chỗ' || effectiveTourStatus === 'last_minute') {
      return 'border-rose-400 border-[2px] bg-white';
    }
    if (tour.seat_status === 'Còn chỗ') {
      return 'border-emerald-400 border-[2px] bg-white';
    }
    if (tour.seat_status === 'Overbooked') {
      return 'border-purple-400 border-[2px] bg-white';
    }
    return 'border-gray-200 border bg-white';
  })();

  return (
    <div className={`rounded-2xl transition-all hover:shadow-md font-sans overflow-hidden ${borderClasses}`}>

      <div 
        className="p-5 cursor-pointer flex flex-col xl:flex-row gap-6 items-start xl:items-center justify-between"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Left side: Tour Name & Basic info */}
        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h3 className="text-lg font-bold text-gray-900 leading-tight uppercase">
              {tour.name}
            </h3>
          </div>
          
          {/* Action buttons on their own row below tour name */}
          <div className="flex flex-wrap items-center gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
            {tour.itinerary_pdf_url ? (
              <a
                href={tour.itinerary_pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-all shadow-sm"
              >
                <FileText className="w-3.5 h-3.5 mr-1 shrink-0 text-blue-600" />
                Lịch trình tour
              </a>
            ) : (
              <button
                onClick={() => toast.error("File PDF lịch trình chi tiết đang được cập nhật bởi Điều hành. Vui lòng kiểm tra lại sau!")}
                className="inline-flex items-center px-2.5 py-1 text-xs font-bold text-gray-400 bg-gray-50 border border-gray-200 rounded-md cursor-not-allowed"
              >
                <FileText className="w-3.5 h-3.5 mr-1 shrink-0" />
                Lịch trình tour
              </button>
            )}

            <button
              onClick={() => onShowNotice(tour)}
              className="inline-flex items-center px-2.5 py-1 text-xs font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-md transition-all shadow-sm"
            >
              <HelpCircle className="w-3.5 h-3.5 mr-1 shrink-0 text-orange-600" />
              Thông tin lưu ý
            </button>
          </div>

          {/* Product type badge and summary details */}
          {(tour.tour_type && tour.tour_type !== 'internal') && (
            <div className="flex flex-wrap gap-2 items-center text-xs mt-1">
              {(tour.tour_type === 'partner' || tour.tour_type === 'outsourced') && ['operator', 'admin', 'sale_leader', 'bod'].includes(currentRole) && (
                <span className="px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/60 font-bold uppercase tracking-wide text-[10px] shadow-sm flex items-center gap-1.5">
                  🤝 GỬI KHÁCH ĐỐI TÁC: <span className="underline">{tour.partner_name}</span> ({tour.partner_contact})
                </span>
              )}
              {tour.tour_type === 'private' && (
                <span className="px-2.5 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200/60 font-bold uppercase tracking-wide text-[10px] shadow-sm flex items-center gap-1.5">
                  👑 TOUR ĐOÀN RIÊNG: <span className="underline">{tour.organization_name}</span> {tour.custom_requirements ? `| Yêu cầu: ${tour.custom_requirements}` : ''}
                </span>
              )}
              {tour.tour_type === 'visa' && (
                <span className="px-2.5 py-1 rounded bg-purple-50 text-purple-700 border border-purple-200/60 font-bold uppercase tracking-wide text-[10px] shadow-sm flex items-center gap-1.5">
                  🛂 DỊCH VỤ VISA LẺ: <span className="underline">{tour.visa_country}</span> — {tour.visa_service_type} ({tour.visa_speed === 'urgent' ? '⚡ KHẨN CẤP' : '⏳ THƯỜNG QUY'})
                </span>
              )}
            </div>
          )}
          
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600">
            <div className="flex items-center text-blue-700 font-medium">
              <Tag className="w-4 h-4 mr-1.5" />
              {tour.code}
            </div>
            {tour.destination && (
              <div className="flex items-center font-bold text-slate-900">
                <Building className="w-4 h-4 mr-1.5 text-blue-500" />
                {tour.destination}
              </div>
            )}
            {tour.tour_type !== 'visa' && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="flex items-center font-medium text-gray-900 whitespace-nowrap">
                  <CalendarIcon className="w-4 h-4 mr-1.5 text-gray-400 shrink-0" />
                  Ngày đi: {formatDate(tour.departure_time || tour.start_date)}
                </div>
                <div className="flex items-center whitespace-nowrap">
                  <CalendarIcon className="w-4 h-4 mr-1.5 text-gray-400 shrink-0" />
                  {tour.duration}
                </div>
                <div className="flex items-center font-medium whitespace-nowrap">
                  <Plane className="w-4 h-4 mr-1.5 text-gray-400 shrink-0" />
                  {tour.airline}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right side: Key Numbers */}
        <div className="flex flex-wrap sm:flex-nowrap gap-6 items-center w-full xl:w-auto">
          {/* Seats Info with Status Badges above */}
          {tour.tour_type !== 'visa' ? (
            <div className="flex flex-col gap-2 flex-1 sm:flex-none">
              {/* Badges container */}
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <SeatStatusBadge status={tour.seat_status} />
                {effectiveTourStatus && (
                  <span className={`inline-flex items-center px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full shadow-sm ${
                    effectiveTourStatus === 'on_sale' ? 'bg-amber-50 text-amber-700 border border-amber-200/60' :
                    effectiveTourStatus === 'last_minute' ? 'bg-rose-50 text-rose-700 border border-rose-200/60' :
                    effectiveTourStatus === 'holiday' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/60' :
                    effectiveTourStatus === 'noshop' ? 'bg-slate-100 text-slate-700 border border-slate-200' :
                    'bg-blue-50 text-blue-700 border border-blue-200/60'
                  }`}>
                    {effectiveTourStatus === 'on_sale' ? 'Giảm giá' :
                     effectiveTourStatus === 'last_minute' ? 'Giờ chót' :
                     effectiveTourStatus === 'holiday' ? 'Lễ Tết' :
                     effectiveTourStatus === 'noshop' ? 'No-shop' : 'Mở bán'}
                  </span>
                )}
              </div>

              {/* Seats Info box */}
              <div className="flex gap-4 text-sm bg-gray-50 px-4 py-2.5 rounded-lg border border-gray-100 justify-center">
                <div className="flex flex-col items-center">
                  <span className="text-gray-500 text-xs mb-1">Đã bán</span>
                  <span className="font-semibold text-blue-700 text-base">{tour.sold_seats}</span>
                </div>
                <div className="w-px h-8 bg-gray-200"></div>
                <div className="flex flex-col items-center">
                  <span className="text-gray-500 text-xs mb-1">Giữ chỗ</span>
                  <span className="font-semibold text-orange-500 text-base">{tour.hold_seats}</span>
                </div>
                <div className="w-px h-8 bg-gray-200"></div>
                <div className="flex flex-col items-center">
                  <span className="text-gray-500 text-xs mb-1">Còn lại</span>
                  <span className="font-bold text-green-600 text-base">{tour.available_seats}</span>
                </div>
              </div>
            </div>
          ) : (
            /* For Visa, show badges if they exist without the seats count */
            (tour.seat_status || effectiveTourStatus) && (
              <div className="flex items-center gap-2 justify-center sm:justify-start flex-1 sm:flex-none">
                <SeatStatusBadge status={tour.seat_status} />
                {effectiveTourStatus && (
                  <span className={`inline-flex items-center px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full shadow-sm ${
                    effectiveTourStatus === 'on_sale' ? 'bg-amber-50 text-amber-700 border border-amber-200/60' :
                    effectiveTourStatus === 'last_minute' ? 'bg-rose-50 text-rose-700 border border-rose-200/60' :
                    effectiveTourStatus === 'holiday' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/60' :
                    effectiveTourStatus === 'noshop' ? 'bg-slate-100 text-slate-700 border border-slate-200' :
                    'bg-blue-50 text-blue-700 border border-blue-200/60'
                  }`}>
                    {effectiveTourStatus === 'on_sale' ? 'Giảm giá' :
                     effectiveTourStatus === 'last_minute' ? 'Giờ chót' :
                     effectiveTourStatus === 'holiday' ? 'Lễ Tết' :
                     effectiveTourStatus === 'noshop' ? 'No-shop' : 'Mở bán'}
                  </span>
                )}
              </div>
            )
          )}

          {/* Pricing */}
          <div className="text-right min-w-[150px]">
            {tour.discount && tour.discount > 0 ? (
              <div className="flex flex-col items-end">
                <div className="text-xs text-gray-400 line-through">{formatCurrency(tour.price)} đ</div>
                <div className="text-xl font-black text-red-600 tracking-tight">{formatCurrency(tour.price - tour.discount)} đ</div>
              </div>
            ) : (
              <div className="text-xl font-black text-red-600 tracking-tight">{formatCurrency(tour.price)} đ</div>
            )}
            {tour.price_visa_tour && tour.price_visa_tour > 0 ? (
              <div className="mt-1.5 flex justify-end">
                <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-900 border border-blue-300/80 px-2.5 py-1 rounded-lg shadow-xs">
                  <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="text-[11px] font-bold text-blue-800">Phí Visa:</span>
                  <span className="text-sm font-black text-blue-700">+{formatCurrency(tour.price_visa_tour)} đ</span>
                </span>
              </div>
            ) : null}
            {!isGuest && (
              <div className="mt-1.5 flex justify-end">
                <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-900 border border-amber-300/80 px-2.5 py-1 rounded-lg shadow-xs">
                  <Coins className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="text-[11px] font-bold text-amber-800">Hoa hồng:</span>
                  <span className="text-sm font-black text-emerald-700">{formatCurrency(tour.commission)} đ</span>
                </span>
              </div>
            )}
          </div>

          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 self-center hidden sm:block">
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>
      <div className="border-b border-dashed border-gray-200 mx-5" />

      {/* Expanded Details */}
      {expanded && (
        <div className="px-5 py-5 border-t border-gray-100 bg-gray-50/50 space-y-6 animate-in slide-in-from-top-2 duration-200">
          {/* Custom Pricing Table Row */}
          {tour.tour_type !== 'visa' && (
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <h4 className="font-bold text-xs uppercase tracking-wider text-blue-700 mb-3 flex items-center">
                <span className="w-1.5 h-3 bg-blue-600 rounded mr-2 inline-block"></span>
                Biểu giá tour chi tiết theo độ tuổi & dịch vụ
              </h4>
              <div className={`grid grid-cols-2 ${isGuest ? 'lg:grid-cols-5' : 'lg:grid-cols-6'} gap-3 text-center`}>
                <div className="bg-blue-50/30 p-3 rounded-lg border border-blue-100/50">
                  <div className="text-xs text-gray-500 mb-1 font-semibold">Người lớn (≥ 10 tuổi)</div>
                  <div className="text-base font-bold text-gray-900">{formatCurrency(tour.price_adult ?? tour.price)} VND</div>
                </div>
                <div className="bg-green-50/30 p-3 rounded-lg border border-green-100/50">
                  <div className="text-xs text-gray-500 mb-1 font-semibold">Trẻ em (2 - dưới 10 tuổi)</div>
                  <div className="text-base font-bold text-gray-900">{formatCurrency(tour.price_child ?? Math.round(tour.price * 0.8))} VND</div>
                </div>
                <div className="bg-purple-50/30 p-3 rounded-lg border border-purple-100/50">
                  <div className="text-xs text-gray-500 mb-1 font-semibold">Trẻ nhỏ (&lt; 2 tuổi)</div>
                  <div className="text-base font-bold text-gray-900">{formatCurrency(tour.price_infant ?? Math.round(tour.price * 0.3))} VND</div>
                </div>
                <div className="bg-red-50/30 p-3 rounded-lg border border-red-100/50">
                  <div className="text-xs text-gray-500 mb-1 font-semibold">Phụ thu phòng đơn</div>
                  <div className="text-base font-bold text-red-600">{formatCurrency(tour.single_room_surcharge ?? 7500000)} VND</div>
                </div>
                <div className="bg-sky-50/70 p-3 rounded-lg border border-sky-200/80 shadow-2xs flex flex-col justify-center">
                  <div className="text-xs text-blue-900 mb-1 font-bold flex items-center justify-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    Dịch vụ Visa (Nếu cần)
                  </div>
                  <div className="text-base font-black text-blue-700">{tour.price_visa_tour ? `${formatCurrency(tour.price_visa_tour)} VND` : 'Miễn phí'}</div>
                </div>
                {!isGuest && (
                  <div className="bg-amber-50/90 p-3 rounded-lg border border-amber-200 shadow-2xs flex flex-col justify-center">
                    <div className="text-xs text-amber-900 mb-1 font-bold flex items-center justify-center gap-1">
                      <Coins className="w-3.5 h-3.5 text-amber-600" />
                      Hoa hồng / Khách
                    </div>
                    <div className="text-base font-black text-amber-700">{formatCurrency(tour.commission)} VND</div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Column 1: Dates & Location */}
          <div className="space-y-3 text-sm">
            <h4 className="font-semibold text-gray-900 border-b border-gray-200 pb-2 flex items-center gap-1.5">
              <CalendarIcon className="w-4 h-4 text-blue-600" />
              Lịch trình & Dịch vụ
            </h4>
            {tour.tour_type !== 'visa' && (
              <>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-gray-500 flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>Ngày đi:</span>
                  </span>
                  <span className="font-medium text-gray-900">{formatDate(tour.departure_time)}</span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-gray-500 flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>Ngày về:</span>
                  </span>
                  <span className="font-medium text-gray-900">{formatDate(tour.return_time)}</span>
                </div>
              </>
            )}
            {tour.category && (
              <div className="flex justify-between items-center py-0.5">
                <span className="text-gray-500 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-purple-500 shrink-0" />
                  <span>Danh mục:</span>
                </span>
                <span className="font-medium text-gray-900">{tour.category}</span>
              </div>
            )}
            {tour.hold_duration_hours && tour.tour_type !== 'visa' && (
              <div className="flex justify-between items-center py-0.5">
                <span className="text-gray-500 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Thời gian giữ chỗ:</span>
                </span>
                <span className="font-bold text-orange-600">{tour.hold_duration_hours} giờ</span>
              </div>
            )}
            {tour.tour_type !== 'visa' && (
              <div className="flex justify-between items-center py-0.5">
                <span className="text-gray-500 flex items-center gap-2">
                  <Building className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Khách sạn:</span>
                </span>
                <span className="font-medium text-emerald-700 flex items-center gap-1">
                  {tour.hotel}
                </span>
              </div>
            )}
          </div>

          {/* Column 2: Flights & Guide */}
          {tour.tour_type !== 'visa' && (
            <div className="space-y-4 text-sm">
              <h4 className="font-semibold text-gray-900 border-b border-gray-200 pb-2">Vận chuyển & HDV</h4>
              {tour.flight_out && (
                <div className="flex gap-3">
                  <Plane className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  <div className="space-y-1 w-full">
                    <div className="text-gray-500 text-xs mb-0.5">Chuyến đi</div>
                    <div className="font-medium text-gray-900">{tour.flight_out}</div>
                    {tour.flight_out_transit && (
                      <div className="relative pl-4 mt-1 border-l-2 border-dashed border-gray-200 ml-1">
                        <div className="text-[11px] text-orange-600 font-medium mb-0.5 uppercase tracking-wide">Quá cảnh</div>
                        <div className="font-medium text-gray-900">{tour.flight_out_transit}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {tour.flight_in && (
                <div className="flex gap-3 mt-4">
                  <Plane className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  <div className="space-y-1 w-full">
                    <div className="text-gray-500 text-xs mb-0.5">Chuyến về</div>
                    <div className="font-medium text-gray-900">{tour.flight_in}</div>
                    {tour.flight_in_transit && (
                      <div className="relative pl-4 mt-1 border-l-2 border-dashed border-gray-200 ml-1">
                        <div className="text-[11px] text-orange-600 font-medium mb-0.5 uppercase tracking-wide">Quá cảnh</div>
                        <div className="font-medium text-gray-900">{tour.flight_in_transit}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {tour.transit_info && (
                <div className="mt-2 bg-orange-50 text-orange-800 px-3 py-2 rounded-lg border border-orange-100 flex items-center">
                   <span className="text-xs font-medium">{tour.transit_info}</span>
                </div>
              )}
              {tour.guide_name && (
                <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
                  <User className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-gray-500 text-xs mb-0.5">Hướng dẫn viên</div>
                    <div className="font-medium text-blue-700 uppercase">
                      {tour.guide_name} {tour.guide_phone && `- ${tour.guide_phone}`}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Column 3: Status & Action */}
          <div className="space-y-3 text-sm flex flex-col h-full">
            <h4 className="font-semibold text-gray-900 border-b border-gray-200 pb-2">Thông tin khác</h4>
            {tour.ticket_status && tour.tour_type !== 'visa' && (
              <div className="flex justify-between">
                <span className="text-gray-500">Tình trạng vé:</span>
                <span className="font-semibold text-blue-700">{tour.ticket_status}</span>
              </div>
            )}
            {tour.visa_deadline && (
              <div className="flex justify-between">
                <span className="text-gray-500">Hạn nhận hồ sơ:</span>
                <span className="font-medium text-red-600">{formatDate(tour.visa_deadline)}</span>
              </div>
            )}
            {tour.description && (
              <div className="flex flex-col gap-1 mt-2">
                <span className="text-gray-500">Ghi chú:</span>
                <span className="text-gray-700">{tour.description}</span>
              </div>
            )}
            <div className="mt-auto pt-6">
              {(() => {
                const depDate = new Date(tour.departure_time || tour.start_date || '');
                const todayStart = new Date();
                todayStart.setHours(0, 0, 0, 0);
                const isDeparted = !isNaN(depDate.getTime()) && depDate < todayStart;

                if (isGuest) {
                  return (
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onBookClick(tour);
                      }}
                      className="w-full inline-flex items-center justify-center h-9 px-4 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
                    >
                      <LogIn className="w-4 h-4 mr-1.5" />
                      <span>Đăng nhập để giữ chỗ / đặt tour</span>
                    </button>
                  );
                }

                return (
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isDeparted) onBookClick(tour);
                    }}
                    className={`w-full inline-flex items-center justify-center h-9 px-4 rounded-lg text-xs font-bold transition-colors shadow-sm cursor-pointer ${
                      isDeparted 
                        ? 'bg-slate-200 text-slate-500 cursor-not-allowed border border-slate-300'
                        : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed border border-transparent'
                    }`}
                    disabled={isDeparted || tour.available_seats === 0}
                  >
                    {isDeparted ? '🔒 Tour đã quá lịch khởi hành' : 'Giữ chỗ / Tạo Booking'}
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    )}
    </div>
  );
};

export default function DepartureCalendar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { tours, orders: allOrders = [], createOrder, currentRole, passengers = [], categories = [] } = useCRM();
  const { profile, user } = useAuth();
  const isGuest = !user;
  const [searchTerm, setSearchTerm] = useState('');
  const [noticeTour, setNoticeTour] = useState<Tour | null>(null);

  const handleBookClick = (tour: Tour) => {
    if (isGuest) {
      toast('Vui lòng đăng nhập hệ thống để thực hiện giữ chỗ hoặc đặt tour.', { icon: '🔒' });
      navigate('/login');
      return;
    }
    setSelectedTourForBooking(tour);
  };
  
  // Meta Leads state for Booking flow
  const [metaLeads, setMetaLeads] = useState<MetaLead[]>([]);
  const [selectedMetaLeadId, setSelectedMetaLeadId] = useState<string | null>(null);

  useEffect(() => {
    fetchMetaLeads()
      .then(leads => {
        if (Array.isArray(leads)) setMetaLeads(leads);
      })
      .catch(() => {});
  }, []);

  // Handle incoming lead from navigation state
  useEffect(() => {
    if (location.state && (location.state as any).selectedLead) {
      const lead = (location.state as any).selectedLead;
      if (lead.name) setBookerName(lead.name.toUpperCase());
      if (lead.phone) setBookerPhone(lead.phone);
      if (lead.notes) setSpecialRequests(`[Nhu cầu từ Lead Meta]: ${lead.notes}`);
      if (lead.meta_lead_id) setSelectedMetaLeadId(lead.meta_lead_id);
      toast.success(`Đã tự động điền thông tin Lead: ${lead.name} (${lead.phone || ''})! Hãy chọn tour để tạo giữ chỗ.`);
    }
  }, [location.state]);
  
  // Dynamic filter states
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTourStatus, setSelectedTourStatus] = useState('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState('all');
  const [selectedStartDate, setSelectedStartDate] = useState('');
  const [selectedEndDate, setSelectedEndDate] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [sortBy, setSortBy] = useState('date_asc');

  // States for Booking Modal Popup
  const [selectedTourForBooking, setSelectedTourForBooking] = useState<Tour | null>(null);
  const [bookerName, setBookerName] = useState('');
  const [bookerPhone, setBookerPhone] = useState('');
  const [adultCount, setAdultCount] = useState(1);
  const [childCount, setChildCount] = useState(0);
  const [infantCount, setInfantCount] = useState(0);
  const [singleRoomCount, setSingleRoomCount] = useState(0);
  const [roomShareInfo, setRoomShareInfo] = useState('Không ghép');
  const [vatOption, setVatOption] = useState('Không xuất VAT');
  const [vatCompanyName, setVatCompanyName] = useState('');
  const [vatTaxCode, setVatTaxCode] = useState('');
  const [vatAddress, setVatAddress] = useState('');
  const [vatEmail, setVatEmail] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [ctvInfo, setCtvInfo] = useState('');
  const [isCreatingForCTV, setIsCreatingForCTV] = useState(false);
  const [customerSource, setCustomerSource] = useState('Quảng cáo');
  const [countdown, setCountdown] = useState(300);

  const isAgentRole = currentRole === 'agent' || profile?.role === 'agent';
  const isSaleRole = !isAgentRole && ['sale', 'sale_leader', 'admin', 'bod'].includes(currentRole || profile?.role || '');

  // Auto-complete Customer suggestions logic
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [focusedInput, setFocusedInput] = useState<'name' | 'phone' | null>(null);
  const [showCustomerSelector, setShowCustomerSelector] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');

  const normalizePhone = (phone: string) => {
    if (!phone) return '';
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('84') && cleaned.length > 2) {
      cleaned = '0' + cleaned.substring(2);
    }
    return cleaned;
  };

  const removeDiacritics = (str: string) => {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
  };

  const uniqueCustomers = React.useMemo(() => {
    const isFullAccess = ['admin', 'operator', 'visa', 'bod', 'marketing_leader', 'marketing'].includes(currentRole);
    const userOrderIds = new Set(
      isFullAccess 
        ? allOrders.map(o => o.id)
        : allOrders.filter(o => o.user_id === profile?.id || o.salesperson_id === profile?.id).map(o => o.id)
    );

    const map = new Map<string, any>();
    passengers.forEach(p => {
      if (p.full_name && userOrderIds.has(p.order_id)) {
        const key = `${p.full_name.trim().toUpperCase()}|${p.phone ? normalizePhone(p.phone) : ''}`;
        if (!map.has(key)) {
          map.set(key, {
            ...p,
            source_type: 'passenger'
          });
        }
      }
    });

    // Also include potential leads from Meta Messenger
    metaLeads.forEach(lead => {
      if (lead.customer_name) {
        const key = `${lead.customer_name.trim().toUpperCase()}|${lead.customer_phone ? normalizePhone(lead.customer_phone) : ''}`;
        if (!map.has(key)) {
          map.set(key, {
            id: lead.id,
            full_name: lead.customer_name,
            phone: lead.customer_phone,
            notes: lead.notes,
            meta_lead_id: lead.meta_lead_id || lead.id,
            source_type: 'meta_lead',
            source_channel: lead.source_channel || 'Facebook Messenger'
          });
        }
      }
    });

    return Array.from(map.values());
  }, [passengers, allOrders, currentRole, profile, metaLeads]);

  useEffect(() => {
    if (focusedInput === 'phone') {
      const searchPhone = normalizePhone(bookerPhone);
      if (searchPhone.length >= 3) {
        const matches = uniqueCustomers.filter(c => c.phone && normalizePhone(c.phone).includes(searchPhone));
        setSuggestions(matches.slice(0, 5));
      } else {
        setSuggestions([]);
      }
    } else if (focusedInput === 'name') {
      const searchName = removeDiacritics(bookerName.trim().toLowerCase());
      if (searchName.length >= 2) {
        const matches = uniqueCustomers.filter(c => c.full_name && removeDiacritics(c.full_name.toLowerCase()).includes(searchName));
        setSuggestions(matches.slice(0, 5));
      } else {
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
    }
  }, [bookerPhone, bookerName, focusedInput, uniqueCustomers]);

  const selectSuggestion = (p: any) => {
    setBookerName(p.full_name.toUpperCase());
    setBookerPhone(p.phone || '');
    if (p.meta_lead_id || p.source_type === 'meta_lead') {
      setSelectedMetaLeadId(p.meta_lead_id || p.id);
      if (p.notes && !specialRequests) {
        setSpecialRequests(`[Nhu cầu từ Lead Meta]: ${p.notes}`);
      }
    }
    setSuggestions([]);
    setFocusedInput(null);
  };

  const handleAdultCountChange = (val: number) => {
    if (!selectedTourForBooking) return;
    const maxAllowed = Math.max(0, selectedTourForBooking.total_seats + (selectedTourForBooking.overbook_limit || 0) - selectedTourForBooking.sold_seats - selectedTourForBooking.hold_seats);
    const potentialTotal = val + childCount;
    if (potentialTotal > maxAllowed) {
      const allowedAdult = Math.max(1, maxAllowed - childCount);
      setAdultCount(allowedAdult);
      toast.error(`Số lượng khách vượt quá số chỗ trống và overbooking cho phép! Hệ thống tự động giới hạn tối đa ${allowedAdult} người lớn (trong tổng số ${maxAllowed} chỗ khả dụng còn lại).`);
    } else {
      setAdultCount(Math.max(1, val));
    }
  };

  const handleChildCountChange = (val: number) => {
    if (!selectedTourForBooking) return;
    const maxAllowed = Math.max(0, selectedTourForBooking.total_seats + (selectedTourForBooking.overbook_limit || 0) - selectedTourForBooking.sold_seats - selectedTourForBooking.hold_seats);
    const potentialTotal = adultCount + val;
    if (potentialTotal > maxAllowed) {
      const allowedChild = Math.max(0, maxAllowed - adultCount);
      setChildCount(allowedChild);
      toast.error(`Số lượng khách vượt quá số chỗ trống và overbooking cho phép! Hệ thống tự động giới hạn tối đa ${allowedChild} trẻ em (trong tổng số ${maxAllowed} chỗ khả dụng còn lại).`);
    } else {
      setChildCount(Math.max(0, val));
    }
  };

  // Booking Timer countdown
  useEffect(() => {
    if (!selectedTourForBooking) return;
    setCountdown(300); // 5 minutes
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setSelectedTourForBooking(null);
          toast.error('Hết giờ! Phiếu giữ chỗ đã tự động đóng để nhường tài nguyên hệ thống.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [selectedTourForBooking]);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Pricing helper variables based on selectedTourForBooking
  const tourDiscount = selectedTourForBooking?.discount || 0;
  const rawPriceAdult = selectedTourForBooking ? (selectedTourForBooking.price_adult ?? selectedTourForBooking.price) : 0;
  const priceAdult = selectedTourForBooking ? Math.max(0, rawPriceAdult - tourDiscount) : 0;
  const priceChild = selectedTourForBooking ? Math.max(0, (selectedTourForBooking.price_child ?? Math.round(rawPriceAdult * 0.8)) - (selectedTourForBooking.price_child ? tourDiscount : Math.round(tourDiscount * 0.8))) : 0;
  const priceInfant = selectedTourForBooking ? Math.max(0, (selectedTourForBooking.price_infant ?? Math.round(rawPriceAdult * 0.3)) - (selectedTourForBooking.price_infant ? tourDiscount : Math.round(tourDiscount * 0.3))) : 0;
  const singleRoomSurcharge = selectedTourForBooking ? (selectedTourForBooking.single_room_surcharge ?? 7500000) : 0;

  const subtotalPrice = selectedTourForBooking 
    ? (priceAdult * adultCount) + (priceChild * childCount) + (priceInfant * infantCount) + (singleRoomSurcharge * singleRoomCount)
    : 0;

  // Thuế VAT đã bao gồm trong giá tour
  const calculatedTotalPrice = subtotalPrice;
  const vatAmount = vatOption === 'Xuất VAT' 
    ? Math.round(calculatedTotalPrice - (calculatedTotalPrice / 1.1)) 
    : 0;

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTourForBooking) return;

    if (!bookerName.trim() || !bookerPhone.trim()) {
      toast.error('Vui lòng nhập đầy đủ Họ và tên và Số điện thoại khách trưởng nhóm!');
      return;
    }

    const orderPassengers: any[] = [];
    const finalBookerName = bookerName.trim();
    const finalBookerPhone = bookerPhone.trim();
    
    // Booker passenger
    orderPassengers.push({
      is_payer: true,
      full_name: finalBookerName,
      phone: finalBookerPhone,
      visa_status: 'pending'
    });

    // Other adults
    for (let i = 1; i < adultCount; i++) {
      orderPassengers.push({
        is_payer: false,
        full_name: `Người lớn #${i + 1} (Đi cùng)`,
        visa_status: 'pending'
      });
    }

    // Children
    for (let i = 0; i < childCount; i++) {
      orderPassengers.push({
        is_payer: false,
        full_name: `Trẻ em #${i + 1} (Đi cùng)`,
        visa_status: 'not_required'
      });
    }

    // Infants
    for (let i = 0; i < infantCount; i++) {
      orderPassengers.push({
        is_payer: false,
        full_name: `Trẻ nhỏ #${i + 1} (Đi cùng)`,
        visa_status: 'not_required'
      });
    }

    const partnerDisplayName = profile?.full_name || user?.email || 'Ẩn danh';
    const roleLabel = currentRole === 'agent' ? 'Đại lý' : currentRole === 'bod' ? 'BOD' : currentRole === 'sale' ? 'Sale' : currentRole === 'sale_leader' ? 'Sale Leader' : currentRole === 'operator' ? 'Điều hành' : 'Quản trị viên';
    const creatorFullName = `${roleLabel} - ${partnerDisplayName}`;

    createOrder({
      tour_id: selectedTourForBooking.id,
      status: 'hold',
      adult_price: priceAdult,
      total_price: calculatedTotalPrice,
      passengers: orderPassengers,
      booker_name: finalBookerName,
      booker_phone: finalBookerPhone,
      created_by: creatorFullName,
      user_id: profile?.id,
      adult_count: adultCount,
      child_count: childCount,
      infant_count: infantCount,
      single_room_count: singleRoomCount,
      room_share_info: roomShareInfo,
      vat_option: vatOption,
        vat_company_name: vatCompanyName,
        vat_tax_code: vatTaxCode,
        vat_address: vatAddress,
        vat_email: vatEmail,
      special_requests: specialRequests,
      ctv_info: ctvInfo.trim(),
      customer_source: (isCreatingForCTV || ctvInfo.trim().length > 0 || isAgentRole) ? 'CTV' : (customerSource || 'Quảng cáo'),
    });

    // Reset fields
    setBookerName('');
    setBookerPhone('');
    setSelectedMetaLeadId(null);
    setAdultCount(1);
    setChildCount(0);
    setInfantCount(0);
    setSingleRoomCount(0);
    setRoomShareInfo('Không ghép');
    setSpecialRequests('');
    setCtvInfo('');
    setIsCreatingForCTV(false);
    setCustomerSource('Quảng cáo');
    setVatOption('Không xuất VAT');
    setVatCompanyName('');
    setVatTaxCode('');
    setVatAddress('');
    setVatEmail('');
    setSelectedTourForBooking(null);
    toast.success('Đặt giữ chỗ tour thành công!');
  };

  // Filter application
  const filteredTours = tours.filter(tour => {
    // Separation: Exclude visa services and private tours from the main departure calendar.
    if (tour.tour_type === 'visa' || tour.tour_type === 'private') {
      return false;
    }

    // Exclude departed tours (tours with departure date before 00:00 today)
    const depDate = new Date(tour.departure_time || tour.start_date || '');
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    if (!isNaN(depDate.getTime()) && depDate < todayStart) {
      return false;
    }

    // 1. Search term match code or name
    const matchesSearch = tour.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          tour.code.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    // 2. Category match
    if (selectedCategory !== 'all' && tour.category !== selectedCategory) return false;

    // 3. Tour Status match
    const effectiveTourStatus = getEffectiveTourStatus(tour);
    if (selectedTourStatus !== 'all' && effectiveTourStatus !== selectedTourStatus) return false;

    // 4. Time Range match
    if (selectedTimeRange !== 'all') {
      const targetDate = tour.departure_time || tour.start_date;
      if (!isDateInTimeRange(targetDate, selectedTimeRange, selectedStartDate, selectedEndDate)) {
        return false;
      }
    }

    return true;
  });

  const sortedFilteredTours = [...filteredTours].sort((a, b) => {
    switch (sortBy) {
      case 'date_asc':
        return new Date(a.departure_time).getTime() - new Date(b.departure_time).getTime();
      case 'date_desc':
        return new Date(b.departure_time).getTime() - new Date(a.departure_time).getTime();
      case 'price_asc':
        return (a.price_adult || a.price) - (b.price_adult || b.price);
      case 'price_desc':
        return (b.price_adult || b.price) - (a.price_adult || a.price);
      default:
        return 0;
    }
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Banner chào đón & hướng dẫn dành riêng cho Khách vãng lai */}
      {isGuest && (
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white p-4 sm:p-5 rounded-2xl shadow-md">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-wider backdrop-blur-xs">
                Chế độ xem công khai
              </span>
              <span className="text-xs font-bold text-blue-100">• Cập nhật thời gian thực</span>
            </div>
            <h2 className="text-base sm:text-lg font-black tracking-tight">
              Lịch Khởi Hành Tour Du Lịch — Tour CRM
            </h2>
            <p className="text-xs text-blue-100/90 leading-relaxed max-w-3xl font-medium">
              Bạn có thể tự do tra cứu thông tin hành trình, số chỗ khả dụng, giá vé và tải file lịch trình tour chi tiết. Để thực hiện giữ chỗ, tạo booking hoặc liên kết đại lý, vui lòng đăng nhập tài khoản.
            </p>
          </div>
        </div>
      )}

      {/* Filters and Actions */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              className="block w-full h-9 pl-10 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              placeholder="Tìm kiếm theo mã tour, tên tour..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 w-full lg:w-auto shrink-0">
            <CustomSelect
              value={sortBy}
              onChange={(val) => setSortBy(val)}
              options={[
                { value: 'date_asc', label: 'Khởi hành gần nhất' },
                { value: 'date_desc', label: 'Khởi hành xa nhất' },
                { value: 'price_asc', label: 'Giá tăng dần' },
                { value: 'price_desc', label: 'Giá giảm dần' },
              ]}
              buttonClassName="w-full sm:w-auto h-9 px-3.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white text-slate-800 hover:bg-slate-50 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-sm transition-all cursor-pointer"
            />
            <button 
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`inline-flex items-center justify-center h-9 px-3.5 py-1.5 border text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                showAdvancedFilters 
                  ? 'bg-blue-50 text-blue-700 border-blue-300' 
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Filter className="h-4 w-4 mr-1.5 shrink-0" />
              <span>Bộ lọc nâng cao</span>
            </button>
            {!isGuest && (currentRole === 'admin' || currentRole === 'operator' || currentRole === 'sale_leader' || currentRole === 'bod') && (
              <button 
                onClick={() => navigate('/tours', { state: { openCreateModal: true } })}
                className="inline-flex items-center justify-center h-9 px-3.5 py-1.5 border border-transparent shadow-sm text-xs font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Plus className="h-4 w-4 mr-1.5 shrink-0" />
                <span>Thêm Tour Mới</span>
              </button>
            )}
          </div>
        </div>

        {/* Advanced Filters section */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 animate-in fade-in duration-150">
            {/* Filter by Time */}
            <div>
              <TimeRangeFilter
                label="Thời gian khởi hành"
                value={selectedTimeRange}
                onChange={setSelectedTimeRange}
                startDate={selectedStartDate}
                onChangeStartDate={setSelectedStartDate}
                endDate={selectedEndDate}
                onChangeEndDate={setSelectedEndDate}
                selectClassName="w-full h-9 pl-3 pr-8 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
              />
            </div>

            {/* Filter by Category */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Danh mục sản phẩm</label>
              <CustomSelect
                value={selectedCategory}
                onChange={setSelectedCategory}
                options={[
                  { value: 'all', label: 'Tất cả danh mục' },
                  ...categories.map((cat) => ({ value: cat, label: cat })),
                ]}
                className="w-full"
                buttonClassName="w-full h-9 px-3.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white text-slate-800 hover:bg-slate-50 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-sm transition-all cursor-pointer"
              />
            </div>

            {/* Filter by Tour Status */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Tình trạng tour</label>
              <CustomSelect
                value={selectedTourStatus}
                onChange={setSelectedTourStatus}
                options={[
                  { value: 'all', label: 'Tất cả tình trạng' },
                  { value: 'available', label: 'Còn chỗ' },
                  { value: 'noshop', label: 'No-shop' },
                  { value: 'last_minute', label: 'Giờ chót' },
                  { value: 'holiday', label: 'Lễ Tết' },
                  { value: 'on_sale', label: 'Đang giảm giá' },
                  { value: 'full', label: 'Kín chỗ' },
                ]}
                className="w-full"
                buttonClassName="w-full h-9 px-3.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white text-slate-800 hover:bg-slate-50 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-sm transition-all cursor-pointer"
              />
            </div>

            {/* Reset Filters */}
            <div className="md:col-span-3 flex justify-end">
              <button
                onClick={() => {
                  setSelectedTimeRange('all');
                  setSelectedStartDate('');
                  setSelectedEndDate('');
                  setSelectedCategory('all');
                  setSelectedTourStatus('all');
                  setSearchTerm('');
                }}
                className="text-xs font-bold text-red-600 hover:text-red-800 flex items-center cursor-pointer transition-colors"
              >
                <X className="w-3.5 h-3.5 mr-1" /> Xóa bộ lọc
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tour List */}
      <div className="space-y-4">
        {sortedFilteredTours.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 py-16 text-center shadow-sm">
            <CalendarIcon className="w-14 h-14 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm font-medium">Không tìm thấy tour du lịch phù hợp.</p>
          </div>
        ) : (
          sortedFilteredTours.map((tour) => (
            <TourCard key={tour.id} tour={tour} onBookClick={handleBookClick} onShowNotice={setNoticeTour} isGuest={isGuest} />
          ))
        )}
      </div>

      {/* Booking Modal Popup */}
      {selectedTourForBooking && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 relative">
            
            {/* Modal Header */}
            <div className="sticky top-0 bg-slate-50 border-b border-gray-150 p-5 z-10 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center">
                  <ShoppingCart className="w-5 h-5 mr-2 text-blue-600" />
                  Phiếu thông tin giữ chỗ & Đặt tour
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Tour: <span className="font-bold text-blue-700">{selectedTourForBooking.code}</span> - {selectedTourForBooking.name}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${countdown < 60 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-green-100 text-green-700'}`}>
                  <Clock className="w-3.5 h-3.5 mr-1.5" />
                  <span>Cửa sổ sẽ tự đóng sau {formatCountdown(countdown)} phút!</span>
                </div>
                <button 
                  type="button" 
                  onClick={() => setSelectedTourForBooking(null)}
                  className="p-1.5 hover:bg-gray-200 rounded-full text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateOrder} className="p-6 space-y-6">
              {/* Step 1: Choose Hold type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Hình thức giữ chỗ *</label>
                <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse flex-shrink-0"></span>
                    <div>
                      <div className="font-bold text-blue-900 text-sm">Hold tạm thời</div>
                      <div className="text-xs text-blue-700 mt-0.5">
                        Hệ thống tự động nhả chỗ sau {selectedTourForBooking.hold_duration_hours || 48} giờ. Booking sẽ chuyển sang Sure chỗ sau khi ghi nhận thanh toán.
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold bg-blue-100 text-blue-800 px-3 py-1 rounded-lg border border-blue-200 whitespace-nowrap ml-2">Hold</span>
                </div>
              </div>

              {/* Display Tour Price List */}
              <div className="bg-slate-50 p-4 rounded-xl border border-gray-200 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700">Bảng giá áp dụng</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-white p-2 rounded border border-gray-200">
                    <span className="text-gray-500 block">Người lớn:</span>
                    <span className="font-bold text-gray-950">{formatCurrency(priceAdult)} đ</span>
                  </div>
                  <div className="bg-white p-2 rounded border border-gray-200">
                    <span className="text-gray-500 block">Trẻ em (2 - &lt;10):</span>
                    <span className="font-bold text-gray-950">{formatCurrency(priceChild)} đ</span>
                  </div>
                  <div className="bg-white p-2 rounded border border-gray-200">
                    <span className="text-gray-500 block">Trẻ nhỏ (&lt;2):</span>
                    <span className="font-bold text-gray-950">{formatCurrency(priceInfant)} đ</span>
                  </div>
                  <div className="bg-white p-2 rounded border border-gray-200">
                    <span className="text-gray-500 block">Phụ thu phòng đơn:</span>
                    <span className="font-bold text-red-600">{formatCurrency(singleRoomSurcharge)} đ</span>
                  </div>
                </div>
              </div>

              {/* Section 1: Booker info */}
              <div className="border-t border-gray-150 pt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-gray-900 flex items-center">
                    <span className="w-1.5 h-3.5 bg-blue-600 rounded mr-2 inline-block"></span>
                    1. Thông tin khách đặt tour
                  </h4>
                  {uniqueCustomers.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowCustomerSelector(!showCustomerSelector)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg border border-blue-200 transition-all shadow-2xs"
                    >
                      <Users className="w-3.5 h-3.5" />
                      {showCustomerSelector ? 'Đóng danh sách' : 'Chọn từ Khách cũ / Lead Meta'}
                    </button>
                  )}
                </div>

                {showCustomerSelector && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2">
                      <input 
                        type="text"
                        placeholder="Tìm theo tên, SĐT hoặc hộ chiếu..."
                        className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder-slate-400"
                        value={customerSearchQuery}
                        onChange={e => setCustomerSearchQuery(e.target.value)}
                      />
                      {customerSearchQuery && (
                        <button 
                          type="button"
                          onClick={() => setCustomerSearchQuery('')}
                          className="h-9 text-xs text-slate-500 hover:text-slate-700 font-semibold shrink-0 bg-white border border-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          Xoá
                        </button>
                      )}
                    </div>
                    <div className="max-h-48 overflow-y-auto divide-y divide-slate-150 border border-slate-200 rounded-lg bg-white shadow-inner">
                      {uniqueCustomers
                        .filter(c => {
                          const q = removeDiacritics(customerSearchQuery.toLowerCase().trim());
                          if (!q) return true;
                          const nameMatch = c.full_name && removeDiacritics(c.full_name.toLowerCase()).includes(q);
                          const phoneMatch = c.phone && normalizePhone(c.phone).includes(q);
                          const passportMatch = c.passport_number && c.passport_number.toLowerCase().includes(q);
                          return nameMatch || phoneMatch || passportMatch;
                        })
                        .map(c => (
                          <div 
                            key={c.id}
                            onClick={() => {
                              setBookerName(c.full_name.toUpperCase());
                              setBookerPhone(c.phone || '');
                              if (c.source_type === 'meta_lead' || c.meta_lead_id) {
                                setSelectedMetaLeadId(c.meta_lead_id || c.id);
                                if (c.notes && !specialRequests) {
                                  setSpecialRequests(`[Nhu cầu từ Lead Meta]: ${c.notes}`);
                                }
                              }
                              setShowCustomerSelector(false);
                            }}
                            className="px-3 py-2.5 hover:bg-blue-50 cursor-pointer flex justify-between items-center text-xs transition-colors"
                          >
                            <div>
                              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                {c.full_name}
                                {c.source_type === 'meta_lead' && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-blue-100 text-blue-700">
                                    <Sparkles className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                                    Lead Messenger
                                  </span>
                                )}
                              </div>
                              {c.passport_number && (
                                <div className="text-[10px] text-gray-500 font-mono mt-0.5">Hộ chiếu: {c.passport_number}</div>
                              )}
                              {c.notes && c.source_type === 'meta_lead' && (
                                <div className="text-[10px] text-slate-500 truncate max-w-xs mt-0.5 italic">Nhu cầu: {c.notes}</div>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-blue-600">{c.phone || 'Chưa có SĐT'}</div>
                              {c.dob && (
                                <div className="text-[10px] text-gray-400 mt-0.5">NS: {c.dob}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      {uniqueCustomers.filter(c => {
                        const q = removeDiacritics(customerSearchQuery.toLowerCase().trim());
                        if (!q) return true;
                        const nameMatch = c.full_name && removeDiacritics(c.full_name.toLowerCase()).includes(q);
                        const phoneMatch = c.phone && normalizePhone(c.phone).includes(q);
                        const passportMatch = c.passport_number && c.passport_number.toLowerCase().includes(q);
                        return nameMatch || phoneMatch || passportMatch;
                      }).length === 0 && (
                        <div className="text-center py-4 text-xs text-gray-400 font-medium">
                          Không tìm thấy khách hàng nào khớp.
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className={`relative ${focusedInput === 'name' ? 'z-30' : 'z-20'}`}>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Họ và tên khách trưởng nhóm *
                      </label>
                      <input 
                        type="text"
                        required
                        placeholder="Nhập họ và tên trưởng nhóm đại diện"
                        className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 placeholder-slate-400 uppercase font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        value={bookerName}
                        onChange={e => setBookerName(e.target.value.toUpperCase())}
                        onFocus={() => setFocusedInput('name')}
                        onBlur={() => setTimeout(() => setFocusedInput(null), 250)}
                      />
                      {focusedInput === 'name' && suggestions.length > 0 && (
                        <div className="absolute z-50 w-full bg-white border border-slate-200 rounded-lg mt-1 max-h-48 overflow-y-auto shadow-xl divide-y divide-slate-100">
                          {suggestions.map(p => (
                            <div 
                              key={p.id}
                              className="px-3.5 py-2.5 hover:bg-blue-50 cursor-pointer text-xs flex justify-between items-center"
                              onMouseDown={() => selectSuggestion(p)}
                            >
                              <div>
                                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                  {p.full_name}
                                  {p.source_type === 'meta_lead' && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-blue-100 text-blue-700">
                                      <Sparkles className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                                      Lead Meta
                                    </span>
                                  )}
                                </div>
                                {p.passport_number && (
                                  <span className="text-[10px] text-slate-400 font-mono">HC: {p.passport_number}</span>
                                )}
                                {p.notes && p.source_type === 'meta_lead' && (
                                  <div className="text-[10px] text-slate-500 italic mt-0.5 truncate max-w-[200px]">{p.notes}</div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="font-semibold text-blue-600">{p.phone || 'Chưa có SĐT'}</div>
                                {p.dob && (
                                  <div className="text-[9px] text-slate-400">NS: {p.dob}</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className={`relative ${focusedInput === 'phone' ? 'z-30' : 'z-10'}`}>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Số điện thoại liên hệ *
                      </label>
                      <input 
                        type="text"
                        required
                        placeholder="Nhập số điện thoại trưởng nhóm"
                        className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 placeholder-slate-400 font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        value={bookerPhone}
                        onChange={e => setBookerPhone(e.target.value)}
                        onFocus={() => setFocusedInput('phone')}
                        onBlur={() => setTimeout(() => setFocusedInput(null), 250)}
                      />
                      {focusedInput === 'phone' && suggestions.length > 0 && (
                        <div className="absolute z-50 w-full bg-white border border-slate-200 rounded-lg mt-1 max-h-48 overflow-y-auto shadow-xl divide-y divide-slate-100">
                          {suggestions.map(p => (
                            <div 
                              key={p.id}
                              className="px-3.5 py-2.5 hover:bg-blue-50 cursor-pointer text-xs flex justify-between items-center"
                              onMouseDown={() => selectSuggestion(p)}
                            >
                              <div>
                                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                  {p.full_name}
                                  {p.source_type === 'meta_lead' && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-blue-100 text-blue-700">
                                      <Sparkles className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                                      Lead Meta
                                    </span>
                                  )}
                                </div>
                                {p.passport_number && (
                                  <span className="text-[10px] text-slate-400 font-mono">HC: {p.passport_number}</span>
                                )}
                                {p.notes && p.source_type === 'meta_lead' && (
                                  <div className="text-[10px] text-slate-500 italic mt-0.5 truncate max-w-[200px]">{p.notes}</div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-blue-600">{p.phone || 'Chưa có SĐT'}</div>
                                {p.dob && (
                                  <div className="text-[9px] text-slate-400">NS: {p.dob}</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedMetaLeadId && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs animate-in fade-in duration-200">
                      <div className="flex items-center gap-2 text-blue-900 font-semibold">
                        <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                        <span>Đang liên kết với <strong>Khách hàng tiềm năng từ Messenger</strong></span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedMetaLeadId(null)}
                        className="text-blue-600 hover:text-blue-800 text-[11px] font-bold underline cursor-pointer"
                      >
                        Bỏ liên kết
                      </button>
                    </div>
                  )}
              </div>

              {/* Section 2: Classified guest counts */}
              <div className="border-t border-gray-150 pt-4 space-y-3">
                <h4 className="text-sm font-bold text-gray-900 flex items-center">
                  <span className="w-1.5 h-3.5 bg-blue-600 rounded mr-2 inline-block"></span>
                  2. Số lượng khách (Tính giá tạm tính)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Người lớn (≥ 10 tuổi) *</label>
                    <input 
                      type="number"
                      min="1"
                      required
                      className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-bold text-blue-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      value={adultCount}
                      onChange={e => handleAdultCountChange(Number(e.target.value))}
                    />
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Trẻ em (2 - &lt; 10 tuổi)</label>
                    <input 
                      type="number"
                      min="0"
                      className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      value={childCount}
                      onChange={e => handleChildCountChange(Number(e.target.value))}
                    />
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Trẻ nhỏ (&lt; 2 tuổi)</label>
                    <input 
                      type="number"
                      min="0"
                      className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      value={infantCount}
                      onChange={e => setInfantCount(Math.max(0, Number(e.target.value)))}
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Surcharges and Advanced Options */}
              <div className="border-t border-gray-150 pt-4 space-y-4">
                <h4 className="text-sm font-bold text-gray-900 flex items-center">
                  <span className="w-1.5 h-3.5 bg-blue-600 rounded mr-2 inline-block"></span>
                  3. Phụ thu & Tùy chọn nâng cao
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-600">Số lượng phụ thu phòng đơn</label>
                    <input 
                      type="number"
                      min="0"
                      className="w-full h-9 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      value={singleRoomCount}
                      onChange={e => setSingleRoomCount(Math.max(0, Number(e.target.value)))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-600">Thông tin ghép phòng (Lẻ nam / Lẻ nữ)</label>
                    <CustomSelect
                      options={[
                        { value: 'Không ghép', label: 'Không ghép (Tự sắp xếp)' },
                        { value: 'Lẻ nam', label: 'Lẻ nam (Mong muốn ghép phòng nam)' },
                        { value: 'Lẻ nữ', label: 'Lẻ nữ (Mong muốn ghép phòng nữ)' },
                        { value: 'Yêu cầu khác', label: 'Yêu cầu ghép linh hoạt khác' },
                      ]}
                      value={roomShareInfo}
                      onChange={setRoomShareInfo}
                      className="w-full"
                      buttonClassName="w-full h-9 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-600">Yêu cầu xuất hóa đơn VAT</label>
                    <div className="flex gap-4 pt-1">
                      <label className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
                        <input 
                          type="radio" 
                          name="modalVatOption" 
                          value="Không xuất VAT"
                          className="text-blue-600 focus:ring-blue-500"
                          checked={vatOption === 'Không xuất VAT'}
                          onChange={() => setVatOption('Không xuất VAT')}
                        />
                        <span>Không xuất VAT</span>
                      </label>
                      <label className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
                        <input 
                          type="radio" 
                          name="modalVatOption" 
                          value="Xuất VAT"
                          className="text-blue-600 focus:ring-blue-500"
                          checked={vatOption === 'Xuất VAT'}
                          onChange={() => setVatOption('Xuất VAT')}
                        />
                        <span>Xuất hoá đơn VAT</span>
                      </label>
                    </div>
                  </div>
                  {vatOption === 'Xuất VAT' && (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-3 mb-4">
                      <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">Thông tin xuất hóa đơn</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tên công ty <span className="text-red-500">*</span></label>
                          <input type="text" value={vatCompanyName} onChange={e => setVatCompanyName(e.target.value)} className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder-slate-400" placeholder="CÔNG TY TNHH..." required />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Mã số thuế <span className="text-red-500">*</span></label>
                          <input type="text" value={vatTaxCode} onChange={e => setVatTaxCode(e.target.value)} className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder-slate-400" placeholder="Nhập mã số thuế..." required />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Địa chỉ xuất hóa đơn <span className="text-red-500">*</span></label>
                          <input type="text" value={vatAddress} onChange={e => setVatAddress(e.target.value)} className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder-slate-400" placeholder="Địa chỉ đăng ký kinh doanh..." required />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Email nhận hóa đơn <span className="text-red-500">*</span></label>
                          <input type="email" value={vatEmail} onChange={e => setVatEmail(e.target.value)} className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder-slate-400" placeholder="Email nhận hóa đơn điện tử..." required />
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">Yêu cầu đặc biệt (Ghi chú thêm)</label>
                    <textarea 
                      rows={2}
                      placeholder="Nhập các yêu cầu ăn uống, phòng ở đặc biệt..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder-slate-400"
                      value={specialRequests}
                      onChange={e => setSpecialRequests(e.target.value)}
                    />
                  </div>

                  {/* Nguồn khách cho Sale (Chỉ hiển thị khi KHÔNG tạo đơn cho CTV và không phải Đại lý) */}
                  {isSaleRole && !(isCreatingForCTV || ctvInfo.trim().length > 0) && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Share2 className="w-4 h-4 text-blue-600" />
                          <span>Nguồn khách hàng</span>
                        </label>
                        <span className="text-[11px] text-slate-500 font-medium">Kênh tiếp cận khách</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 pt-0.5">
                        {[
                          { id: 'Quảng cáo', label: 'Quảng cáo', icon: Megaphone },
                          { id: 'Khách cá nhân', label: 'Khách cá nhân', icon: UserCheck },
                          { id: 'Kênh social', label: 'Kênh social', icon: Globe }
                        ].map(item => {
                          const Icon = item.icon;
                          const isSelected = (customerSource || 'Quảng cáo') === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setCustomerSource(item.id)}
                              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all border ${
                                isSelected
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 hover:border-slate-400'
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5 shrink-0" />
                              <span>{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {isSaleRole && (
                    <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3 space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isCreatingForCTV}
                          onChange={e => {
                            setIsCreatingForCTV(e.target.checked);
                            if (!e.target.checked) setCtvInfo('');
                          }}
                          className="w-4 h-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                          <span>🤝 Tạo đơn thay cho CTV (Cộng Tác Viên)</span>
                        </span>
                      </label>

                      {(isCreatingForCTV || ctvInfo.trim().length > 0) && (
                        <div className="space-y-1 pt-1">
                          <span className="text-[10px] text-amber-700 block">Dành riêng cho Sale ghi nhận tên, SĐT, số tiền hoa hồng CTV</span>
                          <input
                            type="text"
                            placeholder="Nhập Tên CTV, SĐT, số tiền hoa hồng..."
                            className="w-full h-9 px-3 py-1.5 border border-amber-300 rounded-lg text-xs font-semibold bg-white text-slate-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all placeholder-slate-400"
                            value={ctvInfo}
                            onChange={e => {
                              setCtvInfo(e.target.value);
                              if (e.target.value.trim().length > 0 && !isCreatingForCTV) {
                                setIsCreatingForCTV(true);
                              }
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Pricing calculation summary */}
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-150 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="text-xs space-y-1 text-gray-700 w-full sm:w-auto">
                  <div className="font-semibold text-blue-800 text-sm">Tổng hợp chi tiết tạm tính:</div>
                  <div className="space-y-1">
                    <div className="flex justify-between gap-8">
                      <span>• Người lớn ({adultCount} khách x {formatCurrency(priceAdult)} đ):</span>
                      <span className="font-semibold">{formatCurrency(priceAdult * adultCount)} đ</span>
                    </div>
                    {childCount > 0 && (
                      <div className="flex justify-between gap-8">
                        <span>• Trẻ em ({childCount} khách x {formatCurrency(priceChild)} đ):</span>
                        <span className="font-semibold">{formatCurrency(priceChild * childCount)} đ</span>
                      </div>
                    )}
                    {infantCount > 0 && (
                      <div className="flex justify-between gap-8">
                        <span>• Trẻ nhỏ ({infantCount} khách x {formatCurrency(priceInfant)} đ):</span>
                        <span className="font-semibold">{formatCurrency(priceInfant * infantCount)} đ</span>
                      </div>
                    )}
                    {singleRoomCount > 0 && (
                      <div className="flex justify-between gap-8">
                        <span>• Phụ thu phòng đơn ({singleRoomCount} phòng x {formatCurrency(singleRoomSurcharge)} đ):</span>
                        <span className="font-semibold text-red-600">{formatCurrency(singleRoomSurcharge * singleRoomCount)} đ</span>
                      </div>
                    )}
                    {vatOption === 'Xuất VAT' && (
                      <div className="flex justify-between gap-8 border-t border-blue-200/60 pt-1 text-emerald-700 font-medium">
                        <span>• Thuế VAT 10% (Đã gồm trong giá):</span>
                        <span className="font-bold">{formatCurrency(vatAmount)} đ</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right sm:border-l sm:border-gray-200 sm:pl-6 shrink-0 w-full sm:w-auto">
                  <div className="text-xs text-gray-500 font-medium">Tổng giá trị giữ chỗ tạm tính</div>
                  <div className="text-2xl font-black text-red-600">
                    {formatCurrency(calculatedTotalPrice)} VND
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium">Đã bao gồm thuế phí áp dụng</span>
                </div>
              </div>

              {/* Thống kê Phí Visa cho Phiếu Giữ chỗ */}
              {selectedTourForBooking && selectedTourForBooking.price_visa_tour && selectedTourForBooking.price_visa_tour > 0 ? (
                <div className="bg-blue-50/90 p-3.5 rounded-xl border border-blue-200/80 shadow-xs space-y-2 text-xs">
                  <div className="flex justify-between items-center text-blue-950 font-bold border-b border-blue-200/80 pb-1.5">
                    <span className="flex items-center gap-1.5 text-blue-800">
                      <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                      Phí dịch vụ Visa / khách (nếu chọn làm qua Tour):
                    </span>
                    <span className="font-extrabold text-sm text-blue-900">+{formatCurrency(selectedTourForBooking.price_visa_tour)} đ/khách</span>
                  </div>
                  <div className="flex justify-between items-center text-blue-950 font-black pt-0.5">
                    <span>Ước tính phí Visa tối đa cho đoàn ({adultCount + childCount} khách):</span>
                    <span className="text-base font-black text-blue-700">+{formatCurrency(selectedTourForBooking.price_visa_tour * (adultCount + childCount))} đ</span>
                  </div>
                </div>
              ) : null}

              {/* Thống kê Hoa hồng & Giá Net cho Phiếu Giữ chỗ */}
              {selectedTourForBooking && (
                <div className="space-y-2">
                  {/* Thống kê Hoa hồng: Hiển thị nếu là Đại lý, CTV, hoặc Sale chọn tạo đơn cho CTV */}
                  {(isAgentRole || currentRole === 'CTV' || profile?.role === 'CTV' || (isSaleRole && (isCreatingForCTV || ctvInfo.trim().length > 0))) && (
                    <div className="bg-amber-50/90 p-3.5 rounded-xl border border-amber-200/80 shadow-sm space-y-2 text-xs">
                      <div className="flex justify-between items-center text-amber-950 font-bold border-b border-amber-200/80 pb-1.5">
                        <span className="flex items-center gap-1.5 text-amber-800">
                          <Coins className="w-4 h-4 text-amber-600" />
                          Hoa hồng nhận được / khách:
                        </span>
                        <span className="font-extrabold text-sm text-amber-900">{formatCurrency(selectedTourForBooking.commission || 0)} đ/khách</span>
                      </div>
                      <div className="flex justify-between items-center text-emerald-950 font-black pt-0.5">
                        <span>Tổng hoa hồng nhận được đơn hàng ({adultCount + childCount} khách):</span>
                        <span className="text-base font-black text-emerald-700">{formatCurrency((selectedTourForBooking.commission || 0) * (adultCount + childCount))} đ</span>
                      </div>
                    </div>
                  )}

                  {/* Thống kê Giá Net: CHỈ hiển thị khi user là Đại lý thao tác */}
                  {isAgentRole && (
                    <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-3.5 rounded-xl border border-indigo-200 shadow-xs flex justify-between items-center text-xs">
                      <div className="flex flex-col">
                        <span className="font-black text-indigo-950 uppercase tracking-tight">Số tiền phải chuyển cho AD (Giá Net):</span>
                        <span className="text-[10px] text-indigo-600 font-medium">(Tổng tạm tính trừ tổng hoa hồng nhận được)</span>
                      </div>
                      <span className="text-base font-black text-indigo-700">
                        {formatCurrency(Math.max(0, calculatedTotalPrice - ((selectedTourForBooking.commission || 0) * (adultCount + childCount))))} đ
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button 
                  type="button"
                  onClick={() => {
                    setBookerName('');
                    setBookerPhone('');
                    setAdultCount(1);
                    setChildCount(0);
                    setInfantCount(0);
                    setSingleRoomCount(0);
                    setRoomShareInfo('Không ghép');
                    setSpecialRequests('');
                    setVatOption('Không xuất VAT');
    setVatCompanyName('');
    setVatTaxCode('');
    setVatAddress('');
    setVatEmail('');
                  }}
                  className="h-9 px-4 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 bg-white transition-colors cursor-pointer"
                >
                  Nhập lại (Reset)
                </button>
                <button 
                  type="button"
                  onClick={() => setSelectedTourForBooking(null)}
                  className="h-9 px-4 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 bg-white transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit"
                  className="h-9 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
                >
                  Lưu thông tin giữ chỗ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Travel disclaimers modal */}
      {noticeTour && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-200 relative">
            {/* Modal Header */}
            <div className="sticky top-0 bg-slate-50 border-b border-slate-200 p-5 z-10 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center uppercase tracking-wider">
                  <FileText className="w-5 h-5 mr-2 text-orange-600" />
                  Bảng thông tin & Quy định lưu ý đi Tour
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Mã tour: <span className="font-bold text-blue-700">{noticeTour.code}</span> — Tên hành trình: <span className="font-semibold text-slate-800">{noticeTour.name}</span>
                </p>
              </div>
              <button
                onClick={() => setNoticeTour(null)}
                className="p-1.5 hover:bg-slate-200 rounded-full transition-colors text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body: Styled Travel guidelines table */}
            <div className="p-6 space-y-8">
              {(() => {
                const sections = (() => {
                  if (!noticeTour.notice_sections) {
                    return [
                      {
                        title: "1. Hành lý và chỗ ngồi trên máy bay:",
                        items: [
                          { key: "Hành lý ký gửi", value: "Theo quy định chung của các hãng hàng không đối với hành trình quốc tế, mỗi hành khách được miễn cước phí vận chuyển tối đa 1 kiện 23kg." },
                          { key: "Hành lý xách tay", value: "KHÔNG NẶNG QUÁ 10KG, kích thước không cồng kềnh. Không mang các vật nhọn, chất lỏng quá 100ml trong hành lý xách tay." },
                          { key: "Chỗ ngồi trên máy bay", value: "- Đây là vé đoàn hạng phổ thông nên chỗ ngồi tùy thuộc theo tình hình thực tế chuyến bay.\n- Nếu khách có yêu cầu chỗ ngồi tốt hơn thì phải đóng thêm phí (tùy hãng hàng không)." }
                        ]
                      },
                      {
                        title: "2. Xuất/nhập cảnh Việt Nam:",
                        items: [
                          { key: "Thủ tục cần thiết", value: "Khi nhập cảnh, Quý khách vui lòng tập trung theo nhóm. Nhân viên hải quan sẽ hỏi nhanh một số câu hỏi liên quan đến lịch trình." },
                          { key: "Số tiền mang theo", value: "Theo quy định về quản lý ngoại hối, khi xuất cảnh mỗi người được mang theo dưới 5.000 USD tiền mặt và dưới 15.000.000 VNĐ." }
                        ]
                      }
                    ];
                  }
                  try {
                    return JSON.parse(noticeTour.notice_sections);
                  } catch (e) {
                    return [];
                  }
                })();

                return sections.map((sec: any, secIdx: number) => (
                  <div key={secIdx} className="space-y-3">
                    {/* Section Title */}
                    <div className="bg-red-800 text-white font-extrabold px-4 py-2.5 rounded-t-lg shadow-sm text-xs tracking-wide uppercase">
                      {sec.title}
                    </div>
                    
                    {/* Table Grid structure */}
                    <div className="border border-slate-200 rounded-b-lg overflow-hidden divide-y divide-slate-200">
                      {sec.items && sec.items.map((row: any, rowIdx: number) => (
                        <div key={rowIdx} className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-200 hover:bg-slate-50/50 transition-colors">
                          {/* Left column / key Label */}
                          <div className="md:w-[220px] shrink-0 bg-emerald-50/50 text-emerald-900 font-extrabold p-3 text-xs leading-relaxed flex items-center">
                            {row.key}
                          </div>
                          {/* Right column / value Description */}
                          <div className="flex-1 p-4 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                            {row.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-4 flex justify-end">
              <button
                onClick={() => setNoticeTour(null)}
                className="h-9 px-5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                Đóng thông tin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
