import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import ActionModal from '@/components/ActionModal';
import { useLocation } from 'react-router-dom';
import { useCRM } from '@/context/CRMContext';
import { Tour, TourStatus } from '@/types';
import { CustomSelect } from '@/components/CustomSelect';
import { NumericFormatInput } from '@/components/NumericFormatInput';
import {
  Plus,
  User,
  Check,
  X,
  Clock,
  HelpCircle,
  Edit3,
  Trash2,
  Copy,
  FileText,
  FolderOpen,
  ExternalLink,
  Grid,
  Plane,
  DollarSign,
  ChevronDown,
  ChevronUp,
  UploadCloud,
  Search,
  Paperclip,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';

const getItineraryFiles = (urlStr: string): { name: string; url: string }[] => {
  if (!urlStr) return [];
  try {
    if (urlStr.startsWith('[')) {
      const parsed = JSON.parse(urlStr);
      return parsed.map((item: any) => {
        if (typeof item === 'string') {
          const decoded = decodeURIComponent(item.split('/').pop() || 'Tài liệu');
          return { name: decoded, url: item };
        }
        return item;
      });
    } else {
      const decoded = decodeURIComponent(urlStr.split('/').pop() || 'Tài liệu');
      return [{ name: decoded, url: urlStr }];
    }
  } catch (e) {
    const decoded = decodeURIComponent(urlStr.split('/').pop() || 'Tài liệu');
    return [{ name: decoded, url: urlStr }];
  }
};

// End of getItineraryFiles

// Helper to format tour code based on base code and departure date (DDMMYY)
const getFormattedCode = (currentCode: string, departureDateIso: string) => {
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
    basePart = cleanCode.replace(/-\d{6}$/, '');
    separator = '-';
  } else if (hasPlainSuffix) {
    basePart = cleanCode.replace(/\d{6}$/, '');
    separator = '';
  } else {
    separator = cleanCode.includes('-') ? '-' : '';
  }
  
  const yy = date.getFullYear().toString().slice(-2);
  const mm = (date.getMonth() + 1).toString().padStart(2, '0');
  const dd = date.getDate().toString().padStart(2, '0');
  
  return `${basePart}${separator}${dd}${mm}${yy}`;
};

const safeIsoString = (val: string | null | undefined): string | undefined => {
  if (!val || !val.trim()) return undefined;
  const str = val.trim();
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }
  } catch (e) {
    // ignore
  }
  const parts = str.split(' ');
  const dateParts = parts[0].split('/');
  if (dateParts.length === 3) {
    const day = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1;
    const year = parseInt(dateParts[2], 10);
    let hours = 0;
    let minutes = 0;
    if (parts[1]) {
      const timeParts = parts[1].split(':');
      if (timeParts.length >= 2) {
        hours = parseInt(timeParts[0], 10) || 0;
        minutes = parseInt(timeParts[1], 10) || 0;
      }
    }
    const d2 = new Date(year, month, day, hours, minutes);
    if (!isNaN(d2.getTime())) {
      return d2.toISOString();
    }
  }
  return str;
};

// Custom fully Vietnamese Date and Time Picker component
interface VietnameseDateTimePickerProps {
  label: string;
  value: string; // ISO String or empty
  onChange: (isoString: string) => void;
  required?: boolean;
  showTime?: boolean;
  placeholder?: string;
  align?: 'left' | 'right' | 'auto';
}

const VietnameseDateTimePicker: React.FC<VietnameseDateTimePickerProps> = ({
  label,
  value,
  onChange,
  required = false,
  showTime = false,
  placeholder = '',
  align = 'left'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => {
    return value ? new Date(value) : new Date();
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    return value ? new Date(value) : null;
  });

  const [hours, setHours] = useState(() => {
    return value ? new Date(value).getHours() : 8;
  });
  const [minutes, setMinutes] = useState(() => {
    return value ? new Date(value).getMinutes() : 0;
  });

  // Keep internal states in sync with external value
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      setSelectedDate(d);
      setCurrentDate(d);
      setHours(d.getHours());
      setMinutes(d.getMinutes());
    } else {
      setSelectedDate(null);
    }
  }, [value]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday, 1 is Monday...

  // Map Sunday (0) to index 6, and Monday (1) to Saturday (6) as 0 to 5.
  const adjustedFirstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

  const days: Array<Date | null> = [];
  for (let i = 0; i < adjustedFirstDayIndex; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(new Date(year, month, d));
  }

  const handleSelectDay = (day: Date, e: React.MouseEvent) => {
    e.stopPropagation();
    const newD = new Date(day);
    if (showTime) {
      newD.setHours(hours, minutes, 0, 0);
    } else {
      newD.setHours(0, 0, 0, 0);
    }
    setSelectedDate(newD);
    onChange(newD.toISOString());
    if (!showTime) {
      setIsOpen(false);
    }
  };

  const handleTimeChange = (h: number, m: number) => {
    setHours(h);
    setMinutes(m);
    if (selectedDate) {
      const newD = new Date(selectedDate);
      newD.setHours(h, m, 0, 0);
      setSelectedDate(newD);
      onChange(newD.toISOString());
    }
  };

  const formattedValue = selectedDate
    ? format(selectedDate, showTime ? 'dd/MM/yyyy HH:mm' : 'dd/MM/yyyy')
    : '';

  const dayLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const monthLabels = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
    'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
    'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ];

  return (
    <div className="relative">
      <label className="block text-sm font-semibold text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white cursor-pointer flex items-center justify-between hover:border-blue-500 transition-colors shadow-xs"
      >
        <span className={formattedValue ? 'text-slate-800 font-bold' : 'text-slate-400 font-semibold'}>
          {formattedValue || placeholder || (showTime ? 'Chọn ngày giờ (dd/MM/yyyy HH:mm)' : 'Chọn ngày (dd/MM/yyyy)')}
        </span>
        <Clock className="w-4 h-4 text-slate-400" />
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div 
            onClick={e => e.stopPropagation()}
            className={`absolute ${align === 'right' ? 'right-0' : align === 'auto' ? 'left-0 md:left-auto md:right-0' : 'left-0'} mt-1 bg-white border border-slate-200 rounded-xl shadow-xl p-4 z-50 w-72 animate-in fade-in slide-in-from-top-1 duration-150`}
          >
            <div className="flex items-center justify-between mb-3">
              <button 
                type="button" 
                onClick={handlePrevMonth}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors font-bold text-sm w-7 h-7 flex items-center justify-center"
              >
                &lt;
              </button>
              <div className="font-bold text-xs text-slate-800">
                {monthLabels[month]} {year}
              </div>
              <button 
                type="button" 
                onClick={handleNextMonth}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors font-bold text-sm w-7 h-7 flex items-center justify-center"
              >
                &gt;
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {dayLabels.map(l => (
                <span key={l} className="text-[10px] font-bold text-slate-400 uppercase">{l}</span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 mb-3">
              {days.map((day, idx) => {
                if (!day) return <div key={`empty-${idx}`} />;
                const isSelected = selectedDate && 
                  day.getDate() === selectedDate.getDate() &&
                  day.getMonth() === selectedDate.getMonth() &&
                  day.getFullYear() === selectedDate.getFullYear();
                
                const isToday = new Date().getDate() === day.getDate() &&
                  new Date().getMonth() === day.getMonth() &&
                  new Date().getFullYear() === day.getFullYear();

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => handleSelectDay(day, e)}
                    className={`py-1 text-xs rounded-md font-semibold transition-all ${
                      isSelected 
                        ? 'bg-blue-600 text-white font-bold' 
                        : isToday
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>

            {showTime && (
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-bold text-slate-500">Giờ khởi hành:</span>
                <div className="flex items-center gap-1">
                  <select
                    value={hours}
                    onChange={e => handleTimeChange(Number(e.target.value), minutes)}
                    className="border border-slate-200 rounded p-1 text-xs bg-slate-50 font-bold"
                  >
                    {Array.from({ length: 24 }).map((_, h) => (
                      <option key={h} value={h}>{h.toString().padStart(2, '0')}</option>
                    ))}
                  </select>
                  <span className="text-slate-400 font-bold">:</span>
                  <select
                    value={minutes}
                    onChange={e => handleTimeChange(hours, Number(e.target.value))}
                    className="border border-slate-200 rounded p-1 text-xs bg-slate-50 font-bold"
                  >
                    {Array.from({ length: 60 }).map((_, m) => (
                      <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                className="bg-blue-600 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors w-full text-center"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Default Travel disclaimers structure (identical to user screenshot)
const DEFAULT_NOTICE_SECTIONS = [
  {
    title: "1. Hành lý và chỗ ngồi trên máy bay:",
    items: [
      { key: "Hành lý ký gửi", value: "Hành lý ký gửi: Theo quy định chung của các hãng hàng không đối với hành trình quốc tế, mỗi hành khách được miễn cước phí vận chuyển 02 kiện hành lý 23 kg # 50 Pound cho chặng quốc tế & nội địa của Mỹ (nếu Quý khách mua thêm kiện hành lý thứ 3 phải trả thêm tiền)." },
      { key: "Hành lý xách tay", value: "Hành lý xách tay: KHÔNG NẶNG QUÁ 10KG, kích thước không cồng kềnh, Quý khách TUYỆT ĐỐI KHÔNG để trong xách tay những vật nhọn bằng kim loại như kéo, kềm, dao nhỏ.. & các loại chất lỏng như: dầu tắm, mỹ phẩm, nước hoa, nước uống & sữa... Các loại chất lỏng chỉ cho phép dung tích tối đa dưới 100ml, nếu hơn 100ml phải để trong hành lý ký gửi." },
      { key: "Chỗ ngồi trên máy bay", value: "- Đây là vé đoàn hạng phổ thông nên chỗ ngồi tùy theo tình hình thực tế chuyến bay.\n- Nếu khách có yêu cầu chỗ ngồi tốt hơn thì phải đóng thêm phí (tùy hãng hàng không)." }
    ]
  },
  {
    title: "2. Xuất/nhập cảnh Việt Nam:",
    items: [
      { key: "Thủ tục cần thiết", value: "Khi nhập cảnh Mỹ ngay tại cửa khẩu, Quý khách vui lòng tập trung theo nhóm. Nhân viên Hải quan cửa khẩu Mỹ là người có quyền quyết định cho Quý khách nhập cảnh vào Mỹ hay không dù đã có visa & thời gian lưu trú bao lâu tại Mỹ cũng tùy thuộc vào cách trả lời các câu hỏi của Quý khách." },
      { key: "Số tiền mang theo", value: "Theo quy định về quản lý ngoại hối, khi xuất cảnh mỗi người (kể cả trẻ em đi kèm) được mang theo 5.000USD tiền mặt. Tiền đồng Việt Nam được mang dưới 15.000.000đ. Các loại thẻ thanh toán quốc tế như: Visa hoặc Mastercard được sử dụng rộng rãi tại Mỹ." }
    ]
  },
  {
    title: "3. Nhập cảnh nước sở tại:",
    items: [
      { key: "Quy định thực phẩm", value: "CÁC LOẠI THỰC PHẨM TƯƠI SỐNG HOẶC ĐÓNG HỘP TỪ THỊT ĐỘNG VẬT, CÁC CHẾ PHẨM TỪ TRỨNG, SỮA & LOẠI HOA QUẢ TƯƠI CÁC LOẠI..., KHÔNG ĐƯỢC NHẬP CẢNH VÀO MỸ, Quý khách có thể mang theo các loại thực phẩm khô như mì gói. Nếu có mang theo hàng hóa vui lòng khai báo cụ thể theo mẫu đơn của Hải Quan. Trưởng đoàn sẽ tư vấn kỹ cho Quý khách trước khi làm thủ tục nhập cảnh Hoa Kỳ." }
    ]
  }
];

export default function VisaServices() {
  const location = useLocation();
  const { 
    tours, 
    orders, 
    addTour, 
    updateTour, 
    deleteTour, 
    handleExtensionRequest,
    currentRole,
    visaCommonFiles,
    updateVisaCommonFiles
  } = useCRM();

  const isVisaOrAdmin = currentRole === 'visa' || currentRole === 'admin';
  const visaTours = tours.filter(t => t.tour_type === 'visa');

  // View mode for tour listing: 'grouped' (default) | 'flat'
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');
  const [expandedGroups, setExpandedGroups] = useState<{ [key: string]: boolean }>({});
  const [commonFilesExpanded, setCommonFilesExpanded] = useState<boolean>(true);
  const [commonFilesPage, setCommonFilesPage] = useState<number>(1);

  useEffect(() => {
    const totalPages = Math.ceil(visaCommonFiles.length / 10);
    if (commonFilesPage > totalPages && totalPages > 0) {
      setCommonFilesPage(totalPages);
    }
  }, [visaCommonFiles, commonFilesPage]);

  const ITEMS_PER_PAGE = 10;
  const commonFilesTotalPages = Math.ceil(visaCommonFiles.length / ITEMS_PER_PAGE);
  const commonFilesStartIndex = (commonFilesPage - 1) * ITEMS_PER_PAGE;
  const currentPageFiles = visaCommonFiles.slice(commonFilesStartIndex, commonFilesStartIndex + ITEMS_PER_PAGE);

  // Filters and Sorting States for Visa Services
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCountry, setFilterCountry] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const visaCountries = React.useMemo(() => {
    const countries = tours
      .filter(t => t.tour_type === 'visa' && (t.visa_country || t.destination))
      .map(t => t.visa_country || t.destination);
    return Array.from(new Set(countries)) as string[];
  }, [tours]);

  const filteredVisaTours = React.useMemo(() => {
    let list = tours.filter(t => t.tour_type === 'visa');

    // 1. Search Filter
    if (searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(t => {
        const nameMatch = t.name && t.name.toLowerCase().includes(q);
        const codeMatch = t.code && t.code.toLowerCase().includes(q);
        const countryMatch = (t.visa_country || t.destination) && (t.visa_country || t.destination)!.toLowerCase().includes(q);
        const typeMatch = t.visa_service_type && t.visa_service_type.toLowerCase().includes(q);
        return nameMatch || codeMatch || countryMatch || typeMatch;
      });
    }

    // 2. Country Filter
    if (filterCountry !== 'all') {
      list = list.filter(t => (t.visa_country || t.destination) === filterCountry);
    }

    // 3. Sorting
    return [...list].sort((a, b) => {
      if (sortBy === 'newest') {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      } else if (sortBy === 'oldest') {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateA - dateB;
      } else if (sortBy === 'highest_price') {
        return (b.price || 0) - (a.price || 0);
      } else if (sortBy === 'lowest_price') {
        return (a.price || 0) - (b.price || 0);
      }
      return 0;
    });
  }, [tours, searchTerm, filterCountry, sortBy]);

  // Group tours by name for easier bulk management
  const groupedTours = React.useMemo<Record<string, Tour[]>>(() => {
    const groups: { [key: string]: Tour[] } = {};
    filteredVisaTours.forEach(tour => {
      const key = tour.name || 'Hành trình chưa đặt tên';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(tour);
    });
    return groups;
  }, [filteredVisaTours]);

  // Handle auto-expanding new groups
  useEffect(() => {
    setExpandedGroups(prev => {
      const updated = { ...prev };
      Object.keys(groupedTours).forEach(groupName => {
        if (updated[groupName] === undefined) {
          updated[groupName] = true; // default to expanded
        }
      });
      return updated;
    });
  }, [groupedTours]);

  // Bulk creation states
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkBaseTour, setBulkBaseTour] = useState<Tour | null>(null);
  const [bulkCustomDate, setBulkCustomDate] = useState<string>('');
  const [bulkDatesList, setBulkDatesList] = useState<Array<{ date: Date; selected: boolean }>>([]);

  const handleOpenBulkModal = (tour: Tour) => {
    setBulkBaseTour(tour);
    setBulkCustomDate('');
    setBulkDatesList([]);
    setShowBulkModal(true);
  };

  const handleAddBulkDate = () => {
    if (!bulkCustomDate || !bulkBaseTour) {
      toast.error('Vui lòng chọn ngày khởi hành trước!');
      return;
    }
    const baseDep = new Date(bulkBaseTour.departure_time);
    const dateToAdd = new Date(bulkCustomDate);
    // Set hours and minutes to match base tour's departure time so they have the exact same time
    dateToAdd.setHours(baseDep.getHours(), baseDep.getMinutes(), 0, 0);

    const isDuplicate = bulkDatesList.some(item => item.date.getTime() === dateToAdd.getTime());
    if (isDuplicate) {
      toast.error('Ngày khởi hành này đã tồn tại trong danh sách!');
      return;
    }
    setBulkDatesList(prev => [...prev, { date: dateToAdd, selected: true }].sort((a, b) => a.date.getTime() - b.date.getTime()));
    setBulkCustomDate('');
  };

  const handleCreateBulkSeries = () => {
    if (!bulkBaseTour) return;
    const selectedDates = bulkDatesList.filter(d => d.selected);
    if (selectedDates.length === 0) {
      toast.error('Vui lòng chọn hoặc thêm ít nhất một ngày khởi hành hợp lệ!');
      return;
    }

    // Calculate duration difference in MS from base tour
    const baseDep = new Date(bulkBaseTour.departure_time);
    const baseRet = new Date(bulkBaseTour.return_time);
    const durationMs = baseRet.getTime() - baseDep.getTime();

    selectedDates.forEach(({ date }) => {
      // Use getFormattedCode to generate correct DDMMYY structure
      const generatedCode = getFormattedCode(bulkBaseTour.code, date.toISOString());

      // Calculate return date
      const generatedReturnTime = new Date(date.getTime() + durationMs);

      // Visa deadline (if base tour had one, shift it by same difference)
      let generatedVisaDeadline: string | undefined = undefined;
      if (bulkBaseTour.visa_deadline) {
        const baseVisa = new Date(bulkBaseTour.visa_deadline);
        const visaDiffMs = baseDep.getTime() - baseVisa.getTime();
        generatedVisaDeadline = new Date(date.getTime() - visaDiffMs).toISOString();
      }

      // Clone notice sections
      let noticeSecs = DEFAULT_NOTICE_SECTIONS;
      if (bulkBaseTour.notice_sections) {
        try {
          noticeSecs = JSON.parse(bulkBaseTour.notice_sections);
        } catch (e) {
          // fallback
        }
      }

      const newTourData = {
        code: generatedCode,
        name: bulkBaseTour.name,
        destination: bulkBaseTour.destination || 'Visa',
        start_date: date.toISOString().substring(0, 10),
        end_date: generatedReturnTime.toISOString().substring(0, 10),
        duration: bulkBaseTour.duration,
        departure_time: date.toISOString(),
        return_time: generatedReturnTime.toISOString(),
        airline: bulkBaseTour.airline || 'Vietnam Airlines',
        hotel: bulkBaseTour.hotel || 'Khách sạn 4*',
        price: bulkBaseTour.price,
        commission: bulkBaseTour.commission,
        total_seats: bulkBaseTour.total_seats,
        flight_out: bulkBaseTour.flight_out || undefined,
        flight_out_transit: bulkBaseTour.flight_out_transit || undefined,
        flight_in: bulkBaseTour.flight_in || undefined,
        flight_in_transit: bulkBaseTour.flight_in_transit || undefined,
        transit_info: bulkBaseTour.transit_info || undefined,
        guide_name: bulkBaseTour.guide_name || undefined,
        guide_phone: bulkBaseTour.guide_phone || undefined,
        ticket_status: bulkBaseTour.ticket_status || 'CHỜ XUẤT VÉ',
        visa_deadline: generatedVisaDeadline,
        description: bulkBaseTour.description || undefined,
        tour_status: 'available' as TourStatus,
        category: 'Visa',
        hold_duration_hours: bulkBaseTour.hold_duration_hours || 48,
        price_adult: bulkBaseTour.price_adult ?? bulkBaseTour.price,
        price_child: bulkBaseTour.price_child ?? Math.round(bulkBaseTour.price * 0.8),
        price_infant: bulkBaseTour.price_infant ?? Math.round(bulkBaseTour.price * 0.3),
        single_room_surcharge: bulkBaseTour.single_room_surcharge ?? 7500000,
        itinerary_pdf_url: bulkBaseTour.itinerary_pdf_url || undefined,
        notice_sections: JSON.stringify(noticeSecs),
      };

      addTour(newTourData);
    });

    toast.success(`Đã khởi tạo thành công chuỗi gồm ${selectedDates.length} ngày khởi hành cho Tour series này!`);
    setShowBulkModal(false);
  };

  // Form toggles
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTour, setEditingTour] = useState<Tour | null>(null);

  // Tour Form State (for both create & edit)
  const [code, setCode] = useState('');
  const [isCodeDuplicate, setIsCodeDuplicate] = useState(false);

  useEffect(() => {
    if (!code) {
      setIsCodeDuplicate(false);
      return;
    }
    
    // Check if code exists in tours
    const isDuplicate = tours.some(t => 
      t.code.toLowerCase() === code.toLowerCase() && 
      (!editingTour || t.id !== editingTour.id)
    );
    
    setIsCodeDuplicate(isDuplicate);
  }, [code, tours, editingTour]);
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [duration, setDuration] = useState('5 ngày 4 đêm');
  const [departureTime, setDepartureTime] = useState('');
  const [returnTime, setReturnTime] = useState('');
  const [airline, setAirline] = useState('Vietnam Airlines');
  const [hotel, setHotel] = useState('Khách sạn 4*');
  const [price, setPrice] = useState<number | ''>(8500000);
  const [discount, setDiscount] = useState<number | ''>('');
  const [priceVisaTour, setPriceVisaTour] = useState<number | ''>('');
  const [commission, setCommission] = useState<number | ''>(600000);
  const [priceAdult, setPriceAdult] = useState<number | ''>('');
  const [priceChild, setPriceChild] = useState<number | ''>('');
  const [priceInfant, setPriceInfant] = useState<number | ''>('');
  const [singleRoomSurcharge, setSingleRoomSurcharge] = useState<number | ''>(7500000);
  const [totalSeats, setTotalSeats] = useState(30);
  const [overbookLimit, setOverbookLimit] = useState(0);
  const [holdDuration, setHoldDuration] = useState(48);
  const [flightOut, setFlightOut] = useState('');
  const [flightOutTransit, setFlightOutTransit] = useState('');
  const [flightIn, setFlightIn] = useState('');
  const [flightInTransit, setFlightInTransit] = useState('');
  const [transitInfo, setTransitInfo] = useState('');
  const [guideName, setGuideName] = useState('');
  const [guidePhone, setGuidePhone] = useState('');
  const [ticketStatus, setTicketStatus] = useState('CHỜ XUẤT VÉ');
  const [visaDeadline, setVisaDeadline] = useState('');
  const [description, setDescription] = useState('');
  const [tourStatus, setTourStatus] = useState<TourStatus>('available');
  const [category, setCategory] = useState('Visa');
  const [itineraryPdfUrl, setItineraryPdfUrl] = useState('');
  const [isUploadingItinerary, setIsUploadingItinerary] = useState(false);
  const [itineraryUploadError, setItineraryUploadError] = useState<string | null>(null);

  const [isUploadingVisaSample, setIsUploadingVisaSample] = useState(false);
  const [visaSampleUploadError, setVisaSampleUploadError] = useState<string | null>(null);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [tourToDelete, setTourToDelete] = useState<Tour | null>(null);

  const processVisaSampleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploadingVisaSample(true);
    setVisaSampleUploadError(null);

    const uploadedFiles: { name: string; url: string }[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('uploadType', 'visa');
        formData.append('file', file);

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const text = await res.text();
          let errorData = { error: `Lỗi tải file ${file.name}` };
          try { errorData = JSON.parse(text); } catch {}
          throw new Error(errorData.error || `Lỗi tải file ${file.name}`);
        }

        const resText = await res.text();
        let data;
        try { data = JSON.parse(resText); } catch { throw new Error(`Định dạng phản hồi từ máy chủ không đúng cho file ${file.name}`); }
        if (data.success && data.url) {
          uploadedFiles.push({
            name: data.fileName || file.name,
            url: data.url
          });
        } else {
          throw new Error(data.error || `Lỗi tải file ${file.name}`);
        }
      }

      const newFiles = [...visaCommonFiles, ...uploadedFiles];
      await updateVisaCommonFiles(newFiles);
      toast.success(`Đã tải lên thành công ${uploadedFiles.length} file mẫu visa chung!`);
    } catch (err: any) {
      console.error(err);
      setVisaSampleUploadError(err.message || 'Lỗi tải file mẫu lên');
      toast.error(err.message || 'Lỗi tải file mẫu lên');
    } finally {
      setIsUploadingVisaSample(false);
    }
  };

  const handleVisaSampleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    processVisaSampleUpload(e.target.files);
    e.target.value = '';
  };

  const handleRemoveVisaSampleFile = async (urlToRemove: string) => {
    console.log('[VisaServices] Xóa file URL:', urlToRemove);
    try {
      const res = await fetch('/api/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: urlToRemove }),
      });
      
      if (!res.ok) {
        const text = await res.text();
        let errorData = { error: 'Lỗi từ máy chủ khi xóa file' };
        try { errorData = JSON.parse(text); } catch {}
        throw new Error(errorData.error || 'Lỗi từ máy chủ khi xóa file');
      }
      
      const newFiles = visaCommonFiles.filter(f => f.url !== urlToRemove);
      await updateVisaCommonFiles(newFiles);
      toast.success('Đã xóa file mẫu thành công!');
    } catch (err: any) {
      console.error(err);
      toast.error('Không thể xóa file mẫu: ' + err.message);
    } finally {
      setFileToDelete(null);
    }
  };

  const processItineraryUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    if (!code.trim()) {
      toast.error(tourType === 'visa' 
        ? 'Vui lòng nhập Mã Visa trước khi tải file hồ sơ mẫu lên để hệ thống đặt tên file chính xác!' 
        : 'Vui lòng nhập Mã Tour trước khi tải file lịch trình lên để hệ thống đặt tên file chính xác!'
      );
      return;
    }

    setIsUploadingItinerary(true);
    setItineraryUploadError(null);

    const uploadedFiles: { name: string; url: string }[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('uploadType', 'tour');
        formData.append('tourCode', code.trim());
        formData.append('category', category || 'Chung');
        formData.append('file', file);

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          let errorMsg = 'Không thể tải file lên hệ thống';
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errJson = await res.json();
            errorMsg = errJson.error || errorMsg;
          } else {
            const text = await res.text();
            errorMsg = text.substring(0, 100) || errorMsg;
          }
          throw new Error(`Lỗi tải file ${file.name}: ${errorMsg}`);
        }

        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json();
          if (data.success && data.url) {
            uploadedFiles.push({
              name: data.fileName || file.name,
              url: data.url
            });
          } else {
            throw new Error(data.error || `Lỗi tải file ${file.name}`);
          }
        } else {
          throw new Error(`Định dạng phản hồi không hợp lệ cho file ${file.name}`);
        }
      }

      // Merge with existing files
      const existingFiles = getItineraryFiles(itineraryPdfUrl);
      const newFilesList = [...existingFiles, ...uploadedFiles];
      setItineraryPdfUrl(JSON.stringify(newFilesList));
      toast.success(`Đã tải lên thành công ${uploadedFiles.length} file tài liệu!`);
    } catch (err: any) {
      console.error(err);
      setItineraryUploadError(err.message || 'Lỗi tải file lên');
    } finally {
      setIsUploadingItinerary(false);
    }
  };

  const handleItineraryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    processItineraryUpload(e.target.files);
    e.target.value = '';
  };

  const handleRemoveItineraryFile = (urlToRemove: string) => {
    const existingFiles = getItineraryFiles(itineraryPdfUrl);
    const newFilesList = existingFiles.filter(f => f.url !== urlToRemove);
    if (newFilesList.length === 0) {
      setItineraryPdfUrl('');
    } else {
      setItineraryPdfUrl(JSON.stringify(newFilesList));
    }
    toast.success('Đã gỡ file tài liệu ra khỏi danh sách!');
  };

  // Tour Type fields
  const [tourType, setTourType] = useState<'internal' | 'outsourced' | 'partner' | 'private' | 'visa'>('visa');
  const [partnerName, setPartnerName] = useState('');
  const [partnerContact, setPartnerContact] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [groupLeaderContact, setGroupLeaderContact] = useState('');
  const [customRequirements, setCustomRequirements] = useState('');
  const [visaCountry, setVisaCountry] = useState('');
  const [visaServiceType, setVisaServiceType] = useState('');
  const [visaSpeed, setVisaSpeed] = useState<'standard' | 'urgent'>('standard');

  // Travel Notes/Disclaimer Builder state
  const [noticeSections, setNoticeSections] = useState<Array<{ title: string; items: Array<{ key: string; value: string }> }>>(DEFAULT_NOTICE_SECTIONS);
  const [selectedNoticeTour, setSelectedNoticeTour] = useState<Tour | null>(null);
  const [showNoticeModal, setShowNoticeModal] = useState(false);

  const handleShowNoticeModal = (tour: Tour) => {
    setSelectedNoticeTour(tour);
    setShowNoticeModal(true);
  };

  // Handle Extension requests list
  const extensionRequests = orders.filter(o => o.extension_status === 'requested');

  // Trigger editing mode and populate states
  const startEdit = (tour: Tour) => {
    setEditingTour(tour);
    setCode(tour.code);
    setName(tour.name);
    setDestination(tour.destination || '');
    setDuration(tour.duration);
    
    // Format dates to YYYY-MM-DDTHH:MM for inputs
    if (tour.departure_time) {
      const depDate = new Date(tour.departure_time);
      const tzOffset = depDate.getTimezoneOffset() * 60000;
      const localDep = new Date(depDate.getTime() - tzOffset);
      setDepartureTime(localDep.toISOString().slice(0, 16));
    } else {
      setDepartureTime('');
    }

    if (tour.return_time) {
      const retDate = new Date(tour.return_time);
      const tzOffset = retDate.getTimezoneOffset() * 60000;
      const localRet = new Date(retDate.getTime() - tzOffset);
      setReturnTime(localRet.toISOString().slice(0, 16));
    } else {
      setReturnTime('');
    }

    setAirline(tour.airline || 'Vietnam Airlines');
    setHotel(tour.hotel || 'Khách sạn 4*');
    setPrice(tour.price);
    setDiscount(tour.discount ?? '');
    setCommission(tour.commission);
    setPriceAdult(tour.price_adult ?? '');
    setPriceChild(tour.price_child ?? '');
    setPriceInfant(tour.price_infant ?? '');
    setSingleRoomSurcharge(tour.single_room_surcharge ?? '');
    setTotalSeats(tour.total_seats);
    setOverbookLimit(tour.overbook_limit || 0);
    setHoldDuration(tour.hold_duration_hours || 48);
    setFlightOut(tour.flight_out || '');
    setFlightOutTransit(tour.flight_out_transit || '');
    setFlightIn(tour.flight_in || '');
    setFlightInTransit(tour.flight_in_transit || '');
    setTransitInfo(tour.transit_info || '');
    setGuideName(tour.guide_name || '');
    setGuidePhone(tour.guide_phone || '');
    setTicketStatus(tour.ticket_status || 'CHỜ XUẤT VÉ');
    
    if (tour.visa_deadline) {
      setVisaDeadline(tour.visa_deadline.split('T')[0]);
    } else {
      setVisaDeadline('');
    }
    
    setDescription(tour.description || '');
    setTourStatus(tour.tour_status || 'available');
    setCategory(tour.category || 'Visa');
    setItineraryPdfUrl(tour.itinerary_pdf_url || '');

    setTourType(tour.tour_type || 'internal');
    setPartnerName(tour.partner_name || '');
    setPartnerContact(tour.partner_contact || '');
    setOrganizationName(tour.organization_name || '');
    setGroupLeaderContact(tour.group_leader_contact || '');
    setCustomRequirements(tour.custom_requirements || '');
    setVisaCountry(tour.visa_country || '');
    setVisaServiceType(tour.visa_service_type || '');
    setVisaSpeed(tour.visa_speed || 'standard');

    // Parse disclaimers
    if (tour.notice_sections) {
      try {
        setNoticeSections(JSON.parse(tour.notice_sections));
      } catch (e) {
        setNoticeSections(DEFAULT_NOTICE_SECTIONS);
      }
    } else {
      setNoticeSections(DEFAULT_NOTICE_SECTIONS);
    }

    setShowAddForm(false);
    // Scroll smoothly to form
    setTimeout(() => {
      document.getElementById('tour-form-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Trigger duplicate/clone and populate form
  const handleCloneTour = (tour: Tour) => {
    setCode(`${tour.code}-CLONE`);
    setName(`[Sao chép] ${tour.name}`);
    setDestination(tour.destination || '');
    setDuration(tour.duration);
    setDepartureTime('');
    setReturnTime('');
    setAirline(tour.airline || 'Vietnam Airlines');
    setHotel(tour.hotel || 'Khách sạn 4*');
    setPrice(tour.price);
    setDiscount(tour.discount ?? '');
    setCommission(tour.commission);
    setPriceAdult(tour.price_adult ?? '');
    setPriceChild(tour.price_child ?? '');
    setPriceInfant(tour.price_infant ?? '');
    setSingleRoomSurcharge(tour.single_room_surcharge ?? '');
    setTotalSeats(tour.total_seats);
    setOverbookLimit(tour.overbook_limit || 0);
    setHoldDuration(tour.hold_duration_hours || 48);
    setFlightOut(tour.flight_out || '');
    setFlightOutTransit(tour.flight_out_transit || '');
    setFlightIn(tour.flight_in || '');
    setFlightInTransit(tour.flight_in_transit || '');
    setTransitInfo(tour.transit_info || '');
    setGuideName(tour.guide_name || '');
    setGuidePhone(tour.guide_phone || '');
    setTicketStatus(tour.ticket_status || 'CHỜ XUẤT VÉ');
    setVisaDeadline('');
    setDescription(tour.description || '');
    setTourStatus('available');
    setCategory(tour.category || 'Visa');
    setItineraryPdfUrl(tour.itinerary_pdf_url || '');

    setTourType(tour.tour_type || 'internal');
    setPartnerName(tour.partner_name || '');
    setPartnerContact(tour.partner_contact || '');
    setOrganizationName(tour.organization_name || '');
    setGroupLeaderContact(tour.group_leader_contact || '');
    setCustomRequirements(tour.custom_requirements || '');
    setVisaCountry(tour.visa_country || '');
    setVisaServiceType(tour.visa_service_type || '');
    setVisaSpeed(tour.visa_speed || 'standard');

    if (tour.notice_sections) {
      try {
        setNoticeSections(JSON.parse(tour.notice_sections));
      } catch (e) {
        setNoticeSections(DEFAULT_NOTICE_SECTIONS);
      }
    } else {
      setNoticeSections(DEFAULT_NOTICE_SECTIONS);
    }

    setEditingTour(null);
    setShowAddForm(true);
    
    setTimeout(() => {
      document.getElementById('tour-form-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Reset/Clear Form State
  const resetForm = () => {
    setCode('');
    setName('');
    setDestination('');
    setDuration('5 ngày 4 đêm');
    setDepartureTime('');
    setReturnTime('');
    setAirline('Vietnam Airlines');
    setHotel('Khách sạn 4*');
    setPrice(8500000);
    setDiscount('');
    setPriceVisaTour('');
    setCommission(600000);
    setPriceAdult('');
    setPriceChild('');
    setPriceInfant('');
    setSingleRoomSurcharge(7500000);
    setTotalSeats(30);
    setOverbookLimit(0);
    setHoldDuration(48);
    setFlightOut('');
    setFlightOutTransit('');
    setFlightIn('');
    setFlightInTransit('');
    setTransitInfo('');
    setGuideName('');
    setGuidePhone('');
    setTicketStatus('CHỜ XUẤT VÉ');
    setVisaDeadline('');
    setDescription('');
    setTourStatus('available');
    setCategory('Visa');
    setItineraryPdfUrl('');
    setVisaSampleUploadError(null);
    setNoticeSections(DEFAULT_NOTICE_SECTIONS);
    setTourType('visa');
    setPartnerName('');
    setPartnerContact('');
    setOrganizationName('');
    setGroupLeaderContact('');
    setCustomRequirements('');
    setVisaCountry('');
    setVisaServiceType('');
    setVisaSpeed('standard');
    setEditingTour(null);
    setShowAddForm(false);
  };

  // Trigger auto open create form when navigate from Departure Calendar
  useEffect(() => {
    if (location.state && (location.state as any).openCreateModal) {
      resetForm();
      setShowAddForm(true);
      // Clean history state so it won't open again on page refresh/re-mount
      try {
        window.history.replaceState({}, document.title);
      } catch (e) {
        // ignore
      }
      setTimeout(() => {
        document.getElementById('tour-form-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    }
  }, [location.state]);

  // Submit handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCodeDuplicate) {
      toast.error('Mã tour/visa này đã tồn tại, vui lòng chọn mã khác!');
      return;
    }
    if (tourType !== 'visa' && (!code || !name || !departureTime || !returnTime)) {
      toast.error('Vui lòng nhập đầy đủ các trường thông tin bắt buộc (Mã tour, Tên tour, Ngày đi, Ngày về)!');
      return;
    }
    if (tourType === 'visa' && (!code || !name)) {
      toast.error('Vui lòng nhập Mã visa và Tên visa!');
      return;
    }

    const calculatedPrice = price === '' ? 0 : Number(price);
    const calculatedCommission = commission === '' ? 0 : Number(commission);

    const tourData = {
      code,
      name,
      destination: destination || visaCountry || 'Dịch vụ Visa',
      start_date: (tourType !== 'visa' && departureTime) ? departureTime.substring(0, 10) : new Date().toISOString().substring(0, 10),
      end_date: (tourType !== 'visa' && returnTime) ? returnTime.substring(0, 10) : new Date().toISOString().substring(0, 10),
      duration,
      departure_time: (tourType !== 'visa' && departureTime) ? (safeIsoString(departureTime) || null) : null,
      return_time: (tourType !== 'visa' && returnTime) ? (safeIsoString(returnTime) || null) : null,
      airline,
      hotel,
      price: calculatedPrice,
      discount: discount === '' ? 0 : Number(discount),
      price_visa_tour: priceVisaTour === '' ? 0 : Number(priceVisaTour),
      commission: calculatedCommission,
      total_seats: Number(totalSeats),
      overbook_limit: Number(overbookLimit),
      flight_out: flightOut || undefined,
      flight_out_transit: flightOutTransit || undefined,
      flight_in: flightIn || undefined,
      flight_in_transit: flightInTransit || undefined,
      transit_info: transitInfo || undefined,
      guide_name: guideName || undefined,
      guide_phone: guidePhone || undefined,
      ticket_status: ticketStatus || undefined,
      visa_deadline: safeIsoString(visaDeadline),
      description: description || undefined,
      tour_status: tourStatus,
      category: 'Visa',
      hold_duration_hours: Number(holdDuration),
      price_adult: priceAdult !== '' ? Number(priceAdult) : calculatedPrice,
      price_child: priceChild !== '' ? Number(priceChild) : Math.round(calculatedPrice * 0.8),
      price_infant: priceInfant !== '' ? Number(priceInfant) : Math.round(calculatedPrice * 0.3),
      single_room_surcharge: singleRoomSurcharge !== '' ? Number(singleRoomSurcharge) : 7500000,
      itinerary_pdf_url: itineraryPdfUrl || undefined,
      notice_sections: JSON.stringify(noticeSections),
      tour_type: tourType,
      partner_name: partnerName || undefined,
      partner_contact: partnerContact || undefined,
      organization_name: organizationName || undefined,
      group_leader_contact: groupLeaderContact || undefined,
      custom_requirements: customRequirements || undefined,
      visa_country: visaCountry || destination || undefined,
      visa_service_type: visaServiceType || undefined,
      visa_speed: visaSpeed || undefined,
    };

    if (editingTour) {
      // Logic edit
      updateTour({
        ...editingTour,
        ...tourData,
      } as Tour);
      toast.success(`Đã cập nhật thông tin tour ${code} thành công!`);
    } else {
      // Logic add
      addTour(tourData);
      toast.success(`Đã thêm tour ${code} khởi hành mới thành công!`);
    }

    resetForm();
  };

  // Interactive controls for visualTravelNotesBuilder
  const updateSectionTitle = (secIndex: number, newTitle: string) => {
    setNoticeSections(prev => prev.map((sec, i) => i === secIndex ? { ...sec, title: newTitle } : sec));
  };

  const updateSectionRow = (secIndex: number, rowIndex: number, field: 'key' | 'value', value: string) => {
    setNoticeSections(prev => prev.map((sec, i) => {
      if (i !== secIndex) return sec;
      const updatedItems = sec.items.map((row, r) => r === rowIndex ? { ...row, [field]: value } : row);
      return { ...sec, items: updatedItems };
    }));
  };

  const addRowToSection = (secIndex: number) => {
    setNoticeSections(prev => prev.map((sec, i) => {
      if (i !== secIndex) return sec;
      return {
        ...sec,
        items: [...sec.items, { key: "Tiêu đề lưu ý", value: "Nội dung quy định chi tiết mới..." }]
      };
    }));
  };

  const removeRowFromSection = (secIndex: number, rowIndex: number) => {
    setNoticeSections(prev => prev.map((sec, i) => {
      if (i !== secIndex) return sec;
      return {
        ...sec,
        items: sec.items.filter((_, r) => r !== rowIndex)
      };
    }));
  };

  const addNoticeSection = () => {
    setNoticeSections(prev => [
      ...prev,
      {
        title: `${prev.length + 1}. Mục thông tin lưu ý mới:`,
        items: [
          { key: "Yêu cầu", value: "Mô tả nội dung cụ thể..." }
        ]
      }
    ]);
  };

  const removeNoticeSection = (secIndex: number) => {
    setNoticeSections(prev => prev.filter((_, i) => i !== secIndex));
  };

  // Delete tour helper
  const handleDeleteTourClick = (tour: Tour) => {
    setTourToDelete(tour);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Extension Requests Pending Operator approval */}
      {extensionRequests.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-orange-900 flex items-center mb-4">
            <Clock className="w-5 h-5 mr-2 text-orange-600 animate-pulse" />
            Yêu cầu gia hạn giữ chỗ cần duyệt ({extensionRequests.length})
          </h3>
          <div className="space-y-4">
            {extensionRequests.map(order => {
              const tour = tours.find(t => t.id === order.tour_id);
              return (
                <div key={order.id} className="bg-white p-4 rounded-lg border border-orange-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">#{order.id.substring(0, 8)}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-700">{tour?.code}</span>
                    </div>
                    <p className="text-sm text-gray-700 mt-1">
                      Sale <span className="font-semibold text-gray-900">{order.created_by}</span> yêu cầu gia hạn thêm <span className="font-bold text-orange-600">{(order as any).extension_hours} giờ</span> giữ chỗ.
                    </p>
                    {order.hold_expiry && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Hạn giữ chỗ hiện tại: {format(new Date(order.hold_expiry), 'HH:mm dd/MM/yyyy')}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button 
                      onClick={() => handleExtensionRequest(order.id, false)}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center px-3.5 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <X className="w-4 h-4 mr-1 text-red-500" /> Từ chối
                    </button>
                    <button 
                      onClick={() => handleExtensionRequest(order.id, true)}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center px-3.5 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 shadow-sm"
                    >
                      <Check className="w-4 h-4 mr-1" /> Đồng ý gia hạn
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Header section */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Bảng điều hành Dịch vụ Visa</h2>
          <p className="text-sm text-gray-500 mt-1">Quản lý danh sách dịch vụ Visa, hồ sơ và các yêu cầu cấp Visa.</p>
        </div>
        
        <div className="flex items-center gap-2 shrink-0 self-stretch md:self-auto">
          {!showAddForm && !editingTour && isVisaOrAdmin && (
            <button 
              onClick={() => {
                resetForm();
                setShowAddForm(true);
              }}
              className="inline-flex items-center justify-center w-full md:w-auto px-4 py-2 border border-transparent shadow-sm text-sm font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Thêm Dịch vụ Visa mới
            </button>
          )}
        </div>
      </div>

      {/* SECTION HỒ SƠ & FILE MẪU VISA CHUNG */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-200">
        <button 
          type="button"
          onClick={() => setCommonFilesExpanded(!commonFilesExpanded)}
          className="w-full px-6 py-4.5 bg-gray-50/80 hover:bg-gray-100/90 border-b border-gray-200 flex items-center justify-between transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-100 rounded-lg text-purple-700">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h3 className="text-base font-bold text-gray-900">📁 Hồ Sơ & File Mẫu Visa Chung</h3>
              <p className="text-xs text-gray-500 mt-0.5">Kho tài liệu hướng dẫn, tờ khai mẫu dùng chung cho tất cả các loại Visa.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold px-3 py-1 bg-purple-50 text-purple-700 rounded-full border border-purple-200">
              {visaCommonFiles.length} tài liệu
            </span>
            {commonFilesExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </button>

        {commonFilesExpanded && (
          <div className="p-6 space-y-6 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Cột Trái: Tải lên file mới (Chỉ hiển thị cho admin / visa có quyền) */}
              {isVisaOrAdmin && (
                <div className="md:col-span-5 space-y-4">
                  <div className="bg-purple-50/35 border border-purple-100/50 p-4 rounded-xl">
                    <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                      <Paperclip className="w-3.5 h-3.5" /> Thêm file mẫu mới
                    </h4>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      Tải lên các file mẫu hướng dẫn, tờ khai, quy chuẩn hồ sơ. Các file này sẽ tự động được đồng bộ và lưu trữ an toàn trong thư mục <strong className="text-purple-700">"Visa"</strong>.
                    </p>
                  </div>

                  <div className="relative">
                    {isUploadingVisaSample ? (
                      <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-purple-200 bg-purple-50/50 rounded-xl text-center min-h-[160px]">
                        <div className="w-8 h-8 rounded-full border-4 border-purple-500 border-t-transparent animate-spin mb-3" />
                        <p className="text-sm font-semibold text-purple-700">Đang tải tài liệu lên hệ thống lưu trữ...</p>
                      </div>
                    ) : (
                      <label 
                        className="group cursor-pointer flex flex-col items-center justify-center border-2 border-dashed border-purple-200 bg-white hover:border-purple-500 hover:bg-purple-50/5 rounded-xl p-6 text-center transition-all"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          processVisaSampleUpload(e.dataTransfer.files);
                        }}
                      >
                        <UploadCloud className="w-10 h-10 mb-2 text-purple-400 group-hover:text-purple-500 transition-colors" />
                        <p className="text-xs font-bold text-gray-700">Kéo thả hoặc click để tải lên</p>
                        <p className="text-[10px] text-gray-400 mt-1">Hỗ trợ PDF, Word, Excel, hình ảnh...</p>
                        <input 
                          type="file" 
                          multiple
                          className="hidden" 
                          onChange={handleVisaSampleUpload}
                        />
                      </label>
                    )}
                    
                    {visaSampleUploadError && (
                      <p className="text-xs font-semibold text-rose-600 flex items-center gap-1 bg-rose-50 border border-rose-100 p-2.5 rounded-lg mt-2">
                        ⚠️ {visaSampleUploadError}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Cột Phải: Danh sách file đã tải lên (Tự động kéo giãn nếu không có quyền tải lên) */}
              <div className={`${isVisaOrAdmin ? 'md:col-span-7' : 'md:col-span-12'} space-y-3`}>
                <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Danh sách file tài liệu ({visaCommonFiles.length})
                </h4>

                {visaCommonFiles.length === 0 ? (
                  <div className="h-[180px] flex flex-col items-center justify-center border border-dashed border-gray-200 rounded-xl bg-gray-50/50 text-gray-400 gap-2">
                    <FileText className="w-8 h-8 text-gray-300" />
                    <span className="text-xs font-semibold">Chưa có file mẫu nào được tải lên</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Render 2 cột: sắp xếp theo thứ tự hàng ngang (Z-pattern) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {currentPageFiles.map((fileObj, idx) => {
                        const globalIndex = commonFilesStartIndex + idx;
                        const url = fileObj.url;
                        const displayFileName = fileObj.name || `Tài liệu Visa ${globalIndex + 1}`;

                        return (
                          <div key={url} className="p-3.5 border border-purple-100 bg-purple-50/10 hover:bg-purple-50/25 rounded-xl flex items-center justify-between gap-4 animate-in fade-in duration-200 transition-colors">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="p-2 bg-purple-50 rounded-lg text-purple-600 shrink-0">
                                <FileText className="w-4.5 h-4.5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-purple-950 truncate" title={displayFileName}>
                                  {displayFileName}
                                </p>
                                <a 
                                  href={url} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="text-[10px] text-blue-600 hover:underline font-bold inline-flex items-center gap-0.5 mt-1"
                                >
                                  Xem tài liệu / Tải về <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            </div>
                            
                            {isVisaOrAdmin && (
                              <button
                                type="button"
                                onClick={() => setFileToDelete(url)}
                                className="p-2 hover:bg-slate-100 text-slate-400 hover:text-red-600 rounded-lg transition-colors border border-transparent hover:border-slate-200 shrink-0"
                                title="Xóa tài liệu này"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Pagination Controls */}
                    {commonFilesTotalPages > 1 && (
                      <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-2">
                        <button
                          type="button"
                          disabled={commonFilesPage === 1}
                          onClick={() => setCommonFilesPage(prev => Math.max(prev - 1, 1))}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-600 bg-white border border-gray-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all"
                        >
                          <ChevronLeft className="w-4 h-4" /> Trang trước
                        </button>
                        <span className="text-xs font-bold text-slate-500">
                          Trang {commonFilesPage} / {commonFilesTotalPages}
                        </span>
                        <button
                          type="button"
                          disabled={commonFilesPage === commonFilesTotalPages}
                          onClick={() => setCommonFilesPage(prev => Math.min(prev + 1, commonFilesTotalPages))}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-600 bg-white border border-gray-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all"
                        >
                          Trang sau <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* TOURS MANAGEMENT TAB */}
      <>
          {/* TOUR FORM SECTION (Both Add & Edit) */}
          {(showAddForm || editingTour) && (
            <div id="tour-form-section" className="bg-white rounded-xl border border-gray-200 shadow-md animate-in fade-in duration-200">
              <div className="px-6 py-4 border-b border-gray-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="text-base font-black text-gray-900">
                  {editingTour ? `Cập Nhật Tour: ${editingTour.code}` : 'Khai Báo Tour Du Lịch Mới'}
                </h3>
                <button 
                  onClick={resetForm}
                  className="p-1 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-8">
                {/* 1. Basic Info */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                    <Grid className="w-4 h-4 text-blue-600" /> General / Thông tin cơ bản
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{tourType === 'visa' ? 'Mã visa *' : 'Mã tour *'}</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Ví dụ: THAILAN-5D-ART"
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase font-bold ${isCodeDuplicate ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                        value={code}
                        onChange={e => setCode(e.target.value.toUpperCase())}
                      />
                      {isCodeDuplicate && <p className="text-red-500 text-xs mt-1 font-semibold">{tourType === 'visa' ? 'Mã visa này đã tồn tại!' : 'Mã tour này đã tồn tại!'}</p>}
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">{tourType === 'visa' ? 'Tên visa *' : 'Tên tour *'}</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Ví dụ: [SÀI GÒN] THÁI LAN: BANGKOK - PATTAYA..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={name}
                        onChange={e => setName(e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Điểm đến / Quốc gia *</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Ví dụ: Thái Lan, Châu Âu..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={destination}
                        onChange={e => {
                          setDestination(e.target.value);
                          if (tourType === 'visa') {
                            setVisaCountry(e.target.value);
                          }
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Loại hình sản phẩm *</label>
                      <div className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 font-semibold text-slate-800">
                        🛂 Dịch vụ Visa lẻ
                      </div>
                    </div>
                  </div>
                  
                  {tourType !== 'internal' && (
                    <div className={`p-4 rounded-xl border animate-in fade-in slide-in-from-top-2 duration-200 mt-4 ${
                      tourType === 'partner' ? 'bg-indigo-50/50 border-indigo-200 text-indigo-900' :
                      tourType === 'private' ? 'bg-amber-50/40 border-amber-200 text-amber-900' :
                      'bg-purple-50/40 border-purple-200 text-purple-900'
                    }`}>
                      <h5 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        {tourType === 'partner' && <>🤝 Thông tin Gửi khách sang Công ty đối tác</>}
                        {tourType === 'private' && <>👑 Thông tin Yêu cầu Tour đoàn riêng / Custom</>}
                        {tourType === 'visa' && <>🛂 Thông tin Dịch vụ Visa lẻ đặc thù</>}
                      </h5>

                      {tourType === 'partner' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Tên công ty đối tác nhận khách *</label>
                            <input
                              type="text"
                              required
                              placeholder="Ví dụ: Saigontourist, Vietravel..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-slate-950 font-medium"
                              value={partnerName}
                              onChange={e => setPartnerName(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Thông tin liên hệ đối tác (SĐT/Người phụ trách) *</label>
                            <input
                              type="text"
                              required
                              placeholder="Ví dụ: Anh Nam - 0987xxxxxx"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-slate-950 font-medium"
                              value={partnerContact}
                              onChange={e => setPartnerContact(e.target.value)}
                            />
                          </div>
                        </div>
                      )}

                      {tourType === 'private' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Tên cơ quan / Đoàn khách / Doanh nghiệp *</label>
                            <input
                              type="text"
                              required
                              placeholder="Ví dụ: Công ty Techcombank chi nhánh Sài Gòn"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-slate-950 font-medium"
                              value={organizationName}
                              onChange={e => setOrganizationName(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Đại diện liên hệ (Tên, SĐT, Chức vụ) *</label>
                            <input
                              type="text"
                              required
                              placeholder="Ví dụ: Chị Lan Anh (HR) - 0912xxxxxx"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-slate-950 font-medium"
                              value={groupLeaderContact}
                              onChange={e => setGroupLeaderContact(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Yêu cầu đặc biệt (Gala, Teambuilding, v.v.)</label>
                            <input
                              type="text"
                              placeholder="Ví dụ: Cần Gala dinner, quay phim flycam, Backdrop teambuilding"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-slate-950 font-medium"
                              value={customRequirements}
                              onChange={e => setCustomRequirements(e.target.value)}
                            />
                          </div>
                        </div>
                      )}

                      {tourType === 'visa' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Loại visa lẻ (Du lịch, Công tác, Thăm thân...) *</label>
                            <input
                              type="text"
                              required
                              placeholder="Ví dụ: Visa Du lịch Hàn Quốc 5 năm, Visa Thương mại..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-slate-950 font-medium"
                              value={visaServiceType}
                              onChange={e => setVisaServiceType(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Độ khẩn *</label>
                            <CustomSelect
                              options={[
                                { value: 'standard', label: '⏳ Thường' },
                                { value: 'urgent', label: '⚡ Khẩn' },
                              ]}
                              value={visaSpeed}
                              onChange={val => setVisaSpeed(val as any)}
                              className="w-full"
                              buttonClassName="w-full h-9 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all cursor-pointer"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Yêu cầu hồ sơ đính kèm (Hoặc lưu ý cần chuẩn bị)</label>
                            <input
                              type="text"
                              placeholder="Ví dụ: Hộ chiếu gốc còn hạn 6 tháng, 2 ảnh 4x6 nền trắng, CCCD công chứng..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-slate-950 font-medium"
                              value={customRequirements}
                              onChange={e => setCustomRequirements(e.target.value)}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{tourType === 'visa' ? 'Thời gian xử lý *' : 'Thời gian hành trình *'}</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Ví dụ: 5 ngày 4 đêm"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={duration}
                        onChange={e => setDuration(e.target.value)}
                      />
                    </div>
                    {tourType !== 'visa' && (
                      <VietnameseDateTimePicker
                        label="Ngày giờ đi"
                        required
                        showTime
                        value={departureTime}
                        onChange={setDepartureTime}
                      />
                    )}
                    {tourType !== 'visa' && (
                      <VietnameseDateTimePicker
                        label="Ngày giờ về"
                        required
                        showTime
                        value={returnTime}
                        onChange={setReturnTime}
                      />
                    )}
                  </div>
                </div>

                {/* 2. Airline, Hotel, PDF Itinerary - Conditional for Visa services */}
                {tourType !== 'visa' ? (
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 pb-1.5 flex items-center gap-1.5">
                      <Plane className="w-4 h-4 text-emerald-600" /> Logistics & Lịch Trình PDF
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Hãng hàng không</label>
                        <input 
                          type="text" 
                          placeholder="Vietnam Airlines, Vietjet..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          value={airline}
                          onChange={e => setAirline(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu chuẩn Khách sạn</label>
                        <input 
                          type="text" 
                          placeholder="Khách sạn 4 sao, Resort 5 sao..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          value={hotel}
                          onChange={e => setHotel(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                          📂 File tài liệu hoặc lịch trình chi tiết (Hỗ trợ nhiều file, mọi định dạng)
                          <HelpCircle className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                        </label>
                        
                        {isUploadingItinerary && (
                          <div className="mb-3 flex flex-col items-center justify-center border-2 border-dashed border-blue-300 bg-blue-50/30 rounded-xl p-4 text-center">
                            <div className="w-8 h-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin mb-2" />
                            <p className="text-xs font-semibold text-blue-700">Đang tải file lên hệ thống...</p>
                            <p className="text-[10px] text-blue-500 mt-1">Đang đồng bộ và sắp xếp vào thư mục Drive...</p>
                          </div>
                        )}

                        {/* Danh sách file đã tải lên */}
                        {(() => {
                          const currentFiles = getItineraryFiles(itineraryPdfUrl);
                          if (currentFiles.length === 0) return null;
                          return (
                            <div className="space-y-2 mb-3">
                              {currentFiles.map((fileObj, fIdx) => (
                                <div key={fileObj.url + '-' + fIdx} className="p-2.5 border border-slate-200 bg-slate-50/50 rounded-xl flex items-center justify-between gap-2 shadow-xs">
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600 shrink-0">
                                      <FileText className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-bold text-slate-800 truncate" title={fileObj.name}>
                                        {fileObj.name}
                                      </p>
                                      <a 
                                        href={fileObj.url} 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        className="text-[10px] text-blue-600 hover:underline font-semibold inline-flex items-center gap-0.5 mt-0.5"
                                      >
                                        Xem trực tuyến <ExternalLink className="w-2.5 h-2.5" />
                                      </a>
                                    </div>
                                  </div>
                                  
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveItineraryFile(fileObj.url)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-all shrink-0"
                                    title="Xóa tài liệu này"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          );
                        })()}

                        {/* Dropzone hoặc nút Tải thêm file */}
                        {(() => {
                          const currentFiles = getItineraryFiles(itineraryPdfUrl);
                          const isDisabled = !code.trim();
                          
                          if (currentFiles.length > 0) {
                            return (
                              <label className={`inline-flex items-center gap-1.5 cursor-pointer bg-white border border-gray-300 hover:bg-slate-50 text-slate-700 font-bold text-xs px-3 py-2 rounded-lg transition-colors shadow-sm ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                <Plus className="w-4 h-4 text-slate-500" /> Tải thêm tài liệu mới
                                {!isDisabled && (
                                  <input 
                                    type="file" 
                                    multiple
                                    className="hidden" 
                                    onChange={handleItineraryUpload}
                                  />
                                )}
                              </label>
                            );
                          }

                          return (
                            <label className={`group cursor-pointer flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-4 text-center transition-all ${
                              code.trim() 
                                ? 'border-gray-300 bg-white hover:border-blue-500 hover:bg-blue-50/10' 
                                : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                            }`}>
                              <UploadCloud className={`w-8 h-8 mb-2 transition-colors ${
                                code.trim() ? 'text-gray-400 group-hover:text-blue-500' : 'text-gray-300'
                              }`} />
                              <p className="text-xs font-bold text-gray-700">
                                {code.trim() ? 'Kéo thả hoặc click để tải lên các tài liệu' : 'Vui lòng nhập Mã Tour trước'}
                              </p>
                              <p className="text-[10px] text-gray-400 mt-1">
                                {code.trim() ? 'Hỗ trợ tải lên nhiều file, mọi định dạng' : 'Để hệ thống đặt tên file theo mã tour'}
                              </p>
                              {code.trim() && (
                                <input 
                                  type="file" 
                                  multiple
                                  className="hidden" 
                                  onChange={handleItineraryUpload}
                                />
                              )}
                            </label>
                          );
                        })()}
                        
                        {itineraryUploadError && (
                          <p className="text-xs font-semibold text-rose-600 mt-1.5 flex items-center gap-1 bg-rose-50 border border-rose-100 p-2 rounded-lg">
                            ⚠️ {itineraryUploadError}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 pb-1.5 flex items-center gap-1.5">
                      <Paperclip className="w-4 h-4 text-purple-600" /> Hồ sơ yêu cầu & Tài liệu hướng dẫn
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                          📂 File hồ sơ mẫu, tờ khai hoặc checklist (Hỗ trợ nhiều file, mọi định dạng)
                          <HelpCircle className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                        </label>
                        
                        {/* Danh sách file đã tải lên */}
                        {(() => {
                          const currentFiles = getItineraryFiles(itineraryPdfUrl);
                          if (currentFiles.length === 0) return null;
                          return (
                            <div className="space-y-2 mb-3">
                              {currentFiles.map((fileObj, fIdx) => (
                                <div key={fileObj.url + '-' + fIdx} className="p-2.5 border border-slate-200 bg-slate-50/50 rounded-xl flex items-center justify-between gap-2 shadow-xs">
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <div className="p-1.5 bg-purple-50 rounded-lg text-purple-600 shrink-0">
                                      <FileText className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-bold text-slate-800 truncate" title={fileObj.name}>
                                        {fileObj.name}
                                      </p>
                                      <a 
                                        href={fileObj.url} 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        className="text-[10px] text-purple-600 hover:underline font-semibold inline-flex items-center gap-0.5 mt-0.5"
                                      >
                                        Xem trực tuyến <ExternalLink className="w-2.5 h-2.5" />
                                      </a>
                                    </div>
                                  </div>
                                  
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveItineraryFile(fileObj.url)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-all shrink-0"
                                    title="Xóa tài liệu này"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          );
                        })()}

                        {/* Dropzone hoặc nút Tải tài liệu */}
                        <div className="relative mt-3">
                          {isUploadingItinerary ? (
                            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-purple-200 bg-purple-50/50 rounded-xl text-center min-h-[160px]">
                              <div className="w-8 h-8 rounded-full border-4 border-purple-500 border-t-transparent animate-spin mb-3" />
                              <p className="text-sm font-semibold text-purple-700">Đang tải tài liệu lên hệ thống lưu trữ...</p>
                            </div>
                          ) : (
                            <label 
                              className={`group cursor-pointer flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                                code.trim() 
                                  ? 'border-gray-300 bg-white hover:border-purple-500 hover:bg-purple-50/10' 
                                  : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                              }`}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (code.trim()) {
                                  processItineraryUpload(e.dataTransfer.files);
                                }
                              }}
                            >
                              <UploadCloud className={`w-10 h-10 mb-2 transition-colors ${
                                code.trim() ? 'text-gray-400 group-hover:text-purple-500' : 'text-gray-300'
                              }`} />
                              <p className="text-xs font-bold text-gray-700">
                                {code.trim() ? 'Kéo thả hoặc click để tải lên các tài liệu' : 'Vui lòng nhập Mã Visa trước'}
                              </p>
                              <p className="text-[10px] text-gray-400 mt-1">
                                {code.trim() ? 'Hỗ trợ tải lên nhiều file, mọi định dạng' : 'Để hệ thống đặt tên file theo mã visa'}
                              </p>
                              {code.trim() && (
                                <input 
                                  type="file" 
                                  multiple
                                  className="hidden" 
                                  onChange={handleItineraryUpload}
                                />
                              )}
                            </label>
                          )}
                          
                          {itineraryUploadError && (
                            <p className="text-xs font-semibold text-rose-600 flex items-center gap-1 bg-rose-50 border border-rose-100 p-2.5 rounded-lg mt-2">
                              ⚠️ {itineraryUploadError}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Numeric inputs with dynamic thousands separator formatting */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 pb-1.5 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-rose-600" /> Biểu giá & Hoa hồng
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <NumericFormatInput
                      label={tourType === 'visa' ? "Giá visa (VND) *" : "Giá Tour niêm yết (VND) *"}
                      required
                      value={price}
                      onChange={setPrice}
                    />
                    <NumericFormatInput
                      label="Giảm giá tour (VND)"
                      value={discount}
                      onChange={setDiscount}
                    />
                    <NumericFormatInput
                      label="Hoa hồng Sales / Đại lý *"
                      required
                      value={commission}
                      onChange={setCommission}
                    />
                    {tourType !== 'visa' && (
                      <NumericFormatInput
                        label="Giá visa đi tour (VND)"
                        value={priceVisaTour}
                        onChange={setPriceVisaTour}
                      />
                    )}
                    <div className="md:col-span-2 bg-blue-50/50 p-4 rounded-xl border border-blue-100/50 space-y-1">
                      <div className="text-xs font-bold text-blue-800">Gợi ý tỷ lệ:</div>
                      <div className="text-[11px] text-blue-600 leading-relaxed">
                        Sales sẽ thấy giá bán cuối cùng đã trừ hoa hồng hoặc cộng thêm tùy chỉnh. Hãy thiết lập hoa hồng cân đối để tối ưu doanh số của đại lý.
                      </div>
                    </div>
                  </div>

                  {tourType !== 'visa' && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-4">
                    <h5 className="text-xs font-black uppercase tracking-wider text-slate-600">Cấu hình giá chi tiết theo độ tuổi</h5>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <NumericFormatInput
                        label="Giá người lớn"
                        value={priceAdult}
                        onChange={setPriceAdult}
                        placeholder={price ? `Mặc định: ${new Intl.NumberFormat('vi-VN').format(Number(price))}` : 'Như giá tour'}
                      />
                      <NumericFormatInput
                        label="Giá trẻ em (2-10T)"
                        value={priceChild}
                        onChange={setPriceChild}
                        placeholder={price ? `Mặc định: ${new Intl.NumberFormat('vi-VN').format(Math.round(Number(price) * 0.8))}` : '80% giá tour'}
                      />
                      <NumericFormatInput
                        label="Giá trẻ nhỏ (<2T)"
                        value={priceInfant}
                        onChange={setPriceInfant}
                        placeholder={price ? `Mặc định: ${new Intl.NumberFormat('vi-VN').format(Math.round(Number(price) * 0.3))}` : '30% giá tour'}
                      />
                      <NumericFormatInput
                        label="Phụ thu phòng đơn"
                        value={singleRoomSurcharge}
                        onChange={setSingleRoomSurcharge}
                        placeholder="Mặc định: 7.500.000"
                      />
                    </div>
                  </div>
                )}
                </div>

                {/* 4. Seats & Holds */}
                {tourType !== 'visa' && (
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 pb-1.5 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-purple-600" /> Quỹ Chỗ & Quy Định Hold
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tổng số chỗ mở bán *</label>
                      <input 
                        type="number" 
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        value={totalSeats}
                        onChange={e => setTotalSeats(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Overbooking cho phép</label>
                      <input 
                        type="number" 
                        min="0"
                        placeholder="Mặc định: 0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        value={overbookLimit}
                        onChange={e => setOverbookLimit(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mặc định Hold (Giờ) *</label>
                      <input 
                        type="number" 
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        value={holdDuration}
                        onChange={e => setHoldDuration(Number(e.target.value))}
                      />
                    </div>
                    <VietnameseDateTimePicker
                      label="Hạn nộp Visa"
                      showTime={false}
                      value={visaDeadline}
                      onChange={setVisaDeadline}
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái mở bán</label>
                      <CustomSelect
                        options={[
                          { value: 'available', label: 'Còn chỗ' },
                          { value: 'noshop', label: 'No shop' },
                          { value: 'last_minute', label: 'Giờ chót' },
                          { value: 'holiday', label: 'Lễ Tết' },
                          { value: 'on_sale', label: 'Đang giảm giá' },
                          { value: 'full', label: 'Kín chỗ' },
                        ]}
                        value={tourStatus}
                        onChange={val => setTourStatus(val as TourStatus)}
                        className="w-full"
                        buttonClassName="w-full h-9 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
                )}

                {/* Flight numbers / transit details */}
                {tourType !== 'visa' && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 pb-1.5 flex items-center gap-1.5">
                    <Plane className="w-4 h-4 text-teal-600" /> Mã hiệu chuyến bay / Quá cảnh
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Chuyến bay đi (Chặng 1)</label>
                        <input 
                          type="text" 
                          placeholder="VD: QR971 SGN - DOH 19:55 - 23:25"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                          value={flightOut}
                          onChange={e => setFlightOut(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Chặng bay đi tiếp theo (Quá cảnh)</label>
                        <input 
                          type="text" 
                          placeholder="VD: QR039 DOH - CDG 01:25 - 07:25"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                          value={flightOutTransit}
                          onChange={e => setFlightOutTransit(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Chuyến bay về (Chặng 1)</label>
                        <input 
                          type="text" 
                          placeholder="VD: QR116 FCO - DOH 16:35 - 23:10"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                          value={flightIn}
                          onChange={e => setFlightIn(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Chặng bay về tiếp theo (Quá cảnh)</label>
                        <input 
                          type="text" 
                          placeholder="VD: QR970 DOH - SGN 02:35 - 14:25"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                          value={flightInTransit}
                          onChange={e => setFlightInTransit(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Ghi chú quá cảnh</label>
                      <input 
                        type="text" 
                        placeholder="VD: Quá cảnh tại Doha 3 tiếng"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                        value={transitInfo}
                        onChange={e => setTransitInfo(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Tình trạng vé đoàn</label>
                      <input 
                        type="text" 
                        placeholder="CHỜ XUẤT VÉ, ĐÃ CHỐT XUẤT VÉ..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                        value={ticketStatus}
                        onChange={e => setTicketStatus(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Hướng dẫn viên trưởng đoàn</label>
                      <input 
                        type="text" 
                        placeholder="Họ tên HDV"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                        value={guideName}
                        onChange={e => setGuideName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Số điện thoại liên hệ HDV</label>
                      <input 
                        type="text" 
                        placeholder="Số điện thoại"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                        value={guidePhone}
                        onChange={e => setGuidePhone(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                )}

                {/* 5. VISUAL TRAVEL NOTES & DISCLAIMER BUILDER (identical to screenshot format) */}
                <div className="space-y-5 pt-4 border-t border-slate-100">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-orange-600" />
                      Biểu mẫu Thông Tin / Quy định / Lưu ý đi tour chi tiết
                    </h4>
                    <button
                      type="button"
                      onClick={addNoticeSection}
                      className="inline-flex items-center text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Thêm phần mới
                    </button>
                  </div>

                  <p className="text-xs text-gray-500 leading-normal">
                    Thiết lập bảng thông tin quy định chi tiết về hành lý, hải quan, ăn uống và sức khỏe. Mục này sẽ xuất hiện dưới dạng một bảng tra cứu thông tin chuyên nghiệp (như ảnh chụp quy chuẩn) khi người dùng click vào nút <strong>"Thông tin lưu ý"</strong> ở màn hình lịch khởi hành.
                  </p>

                  <div className="space-y-6">
                    {noticeSections.map((sec, secIdx) => (
                      <div key={secIdx} className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 relative">
                        {/* Remove Section button */}
                        <button
                          type="button"
                          onClick={() => removeNoticeSection(secIdx)}
                          className="absolute right-3 top-3 text-gray-400 hover:text-red-600 transition-colors"
                          title="Xóa mục lớn này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <div className="max-w-md mb-4">
                          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Tên mục lớn (Ví dụ: II. THỦ TỤC HÀNG KHÔNG VÀ HẢI QUAN)</label>
                          <input
                            type="text"
                            required
                            className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm font-bold text-blue-800 bg-white"
                            value={sec.title}
                            onChange={(e) => updateSectionTitle(secIdx, e.target.value)}
                          />
                        </div>

                        {/* Rows list */}
                        <div className="space-y-3.5 pl-2 border-l-2 border-blue-100">
                          {sec.items.map((row, rowIdx) => (
                            <div key={rowIdx} className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start bg-white p-3 rounded-lg border border-gray-150">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Tiêu đề hàng (Trái)</label>
                                <input
                                  type="text"
                                  required
                                  placeholder="Hành lý ký gửi..."
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs font-semibold text-emerald-800 bg-gray-50"
                                  value={row.key}
                                  onChange={(e) => updateSectionRow(secIdx, rowIdx, 'key', e.target.value)}
                                />
                              </div>
                              <div className="lg:col-span-2 flex items-start gap-2.5">
                                <div className="flex-1">
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Nội dung giải trình</label>
                                  <textarea
                                    rows={2}
                                    required
                                    placeholder="Nội dung cụ thể quy định..."
                                    className="w-full px-2.5 py-1 border border-gray-300 rounded text-xs leading-relaxed text-gray-700 bg-white"
                                    value={row.value}
                                    onChange={(e) => updateSectionRow(secIdx, rowIdx, 'value', e.target.value)}
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeRowFromSection(secIdx, rowIdx)}
                                  className="p-1 mt-4 text-gray-400 hover:text-rose-600 transition-colors"
                                  title="Xóa hàng này"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}

                          <button
                            type="button"
                            onClick={() => addRowToSection(secIdx)}
                            className="inline-flex items-center text-xs text-emerald-600 hover:text-emerald-700 font-bold mt-1"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" /> Thêm hàng quy định
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Submit Center */}
                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                  <button 
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 bg-white"
                  >
                    Hủy bỏ
                  </button>
                  <button 
                    type="submit"
                    disabled={isCodeDuplicate}
                    className={`px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-sm ${isCodeDuplicate ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {editingTour ? 'Cập Nhật Tour' : 'Lưu & Đăng Bán'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SUMMARY DASHBOARD FOR VISA TEAM */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-500">Tổng số Dịch vụ Visa</span>
                <div className="text-2xl font-bold text-gray-900 mt-1">{visaTours.length}</div>
              </div>
              <div className="bg-blue-50 p-3.5 rounded-xl border border-blue-100">
                <FolderOpen className="w-6 h-6 text-blue-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-500">Chỗ đã bán (Sure)</span>
                <div className="text-2xl font-bold text-emerald-600 mt-1">
                  {visaTours.reduce((sum, t) => sum + t.sold_seats, 0)} chỗ
                </div>
              </div>
              <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-100">
                <Check className="w-6 h-6 text-emerald-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-500">Chỗ đang giữ tạm thời</span>
                <div className="text-2xl font-bold text-amber-600 mt-1">
                  {visaTours.reduce((sum, t) => sum + t.hold_seats, 0)} chỗ
                </div>
              </div>
              <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-100">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>

          {/* LIST OF ACTIVE TOURS WITH FULL CRUD OPERATIONS */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">Danh sách điều phối chỗ & Lịch trình</h3>
                <span className="text-xs text-gray-500 mt-1 block">Tạo và quản lý các loại dịch vụ Visa lẻ.</span>
              </div>

              {/* View mode toggle switcher */}
              <div className="flex bg-gray-100 p-1.5 rounded-lg border border-gray-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode('grouped')}
                  className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    viewMode === 'grouped' 
                      ? 'bg-white text-blue-700 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Gom nhóm theo Hành Trình
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('flat')}
                  className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    viewMode === 'flat' 
                      ? 'bg-white text-blue-700 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Danh sách phẳng
                </button>
              </div>
            </div>

            {/* Filters and Sorting Controls */}
            <div className="bg-gray-50/80 border-b border-gray-200 p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Ô tìm kiếm */}
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-400" />
                </span>
                <input
                  type="text"
                  placeholder="Tìm mã, tên dịch vụ..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal"
                />
              </div>

              {/* Lọc quốc gia */}
              <CustomSelect
                options={[
                  { value: 'all', label: 'Tất cả quốc gia' },
                  ...visaCountries.map(c => ({ value: c, label: c }))
                ]}
                value={filterCountry}
                onChange={setFilterCountry}
                className="w-full"
                buttonClassName="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all cursor-pointer"
              />

              {/* Sắp xếp */}
              <CustomSelect
                options={[
                  { value: 'newest', label: 'Sắp xếp: Mới nhất' },
                  { value: 'oldest', label: 'Sắp xếp: Cũ nhất' },
                  { value: 'highest_price', label: 'Sắp xếp: Phí dịch vụ giảm dần' },
                  { value: 'lowest_price', label: 'Sắp xếp: Phí dịch vụ tăng dần' },
                ]}
                value={sortBy}
                onChange={setSortBy}
                className="w-full"
                buttonClassName="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all cursor-pointer"
              />
            </div>

            {viewMode === 'grouped' ? (
              <div className="p-6 space-y-6">
                {Object.keys(groupedTours).length === 0 ? (
                  <div className="text-center py-12 text-sm text-gray-400">Không tìm thấy dịch vụ visa nào phù hợp với bộ lọc.</div>
                ) : (
                  Object.entries(groupedTours)
                    .sort((entryA, entryB) => {
                      const toursA = entryA[1] as Tour[];
                      const toursB = entryB[1] as Tour[];
                      const latestA = Math.max(...toursA.map(t => t.created_at ? new Date(t.created_at).getTime() : 0));
                      const latestB = Math.max(...toursB.map(t => t.created_at ? new Date(t.created_at).getTime() : 0));
                      return latestB - latestA;
                    })
                    .map(([groupName, groupToursList]) => {
                    const groupTours = groupToursList as Tour[];
                    const firstTour = groupTours[0];

                    return (
                      <div key={groupName} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white hover:border-gray-300 hover:shadow transition-all duration-200">
                        {/* Group Header */}
                        <div className="bg-gray-50/80 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-gray-200/80">
                          <div className="space-y-1 flex-1">
                            <h4 className="text-base font-bold text-gray-900 leading-snug uppercase tracking-wide">
                              {groupName}
                            </h4>
                            <div className="text-xs text-gray-600 font-medium flex flex-wrap items-center gap-x-3 gap-y-1">
                              <span>Thời gian xử lý: <strong className="text-gray-900 font-semibold">{firstTour.duration}</strong></span>
                            </div>
                          </div>
                        </div>

                        {/* Group Content: Services Table (Always Expanded) */}
                        <div className="overflow-x-auto border-t border-gray-200 bg-white">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50/80 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                <tr>
                                  <th className="px-6 py-3.5 text-left w-36">Mã Dịch vụ</th>
                                  <th className="px-6 py-3.5 text-left">Tên Dịch vụ / Chi tiết</th>
                                  <th className="px-6 py-3.5 text-right">Phí dịch vụ & Hoa hồng</th>
                                  <th className="px-6 py-3.5 text-center">Thông tin lưu ý</th>
                                  {isVisaOrAdmin && <th className="px-6 py-3.5 text-center w-28">Hành động</th>}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200 text-sm text-gray-700">
                                {groupTours.map(t => (
                                  <tr key={t.id} className="hover:bg-gray-50/60 transition-colors">
                                    <td className="px-6 py-3.5">
                                      <span className="font-mono font-bold text-blue-700 tracking-tight bg-blue-50 border border-blue-200/80 px-2.5 py-1 rounded-md text-xs inline-block">
                                        {t.code}
                                      </span>
                                    </td>
                                    <td className="px-6 py-3.5">
                                      <div className="font-bold text-gray-900 text-sm">
                                        {t.name}
                                      </div>
                                      <div className="text-xs text-gray-500 mt-1 flex flex-col gap-0.5 font-medium">
                                        <div>Quốc gia: <span className="underline font-semibold text-gray-800">{t.visa_country || t.destination || 'Chưa xác định'}</span> | Loại: {t.visa_service_type || 'Dịch vụ'} ({t.visa_speed === 'urgent' ? '⚡ Khẩn' : '⏳ Thường'})</div>
                                        {t.custom_requirements && <div className="text-xs text-purple-700 font-medium">Yêu cầu: {t.custom_requirements}</div>}
                                        
                                        {t.itinerary_pdf_url && (() => {
                                          let files: { name: string; url: string }[] = [];
                                          try {
                                            if (t.itinerary_pdf_url.startsWith('[')) {
                                              const parsed = JSON.parse(t.itinerary_pdf_url);
                                              files = parsed.map((item: any) => {
                                                if (typeof item === 'string') {
                                                  const decoded = decodeURIComponent(item.split('/').pop() || 'File mẫu');
                                                  return { name: decoded, url: item };
                                                }
                                                return item;
                                              });
                                            } else if (t.itinerary_pdf_url) {
                                              const decoded = decodeURIComponent(t.itinerary_pdf_url.split('/').pop() || 'File mẫu');
                                              files = [{ name: decoded, url: t.itinerary_pdf_url }];
                                            }
                                          } catch (e) {
                                            const decoded = decodeURIComponent(t.itinerary_pdf_url.split('/').pop() || 'File mẫu');
                                            files = [{ name: decoded, url: t.itinerary_pdf_url }];
                                          }
                                          if (files.length === 0) return null;
                                          return (
                                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5 pt-1.5 border-t border-dashed border-slate-100">
                                              <span className="text-[9px] font-black text-purple-700 bg-purple-50 px-1 py-0.5 rounded border border-purple-200 uppercase tracking-wide flex items-center shrink-0">
                                                <Paperclip className="w-2.5 h-2.5 mr-0.5" /> File mẫu ({files.length}):
                                              </span>
                                              <div className="flex flex-wrap gap-1">
                                                {files.map((f) => (
                                                  <a
                                                    key={f.url}
                                                    href={f.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-[9px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50/70 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded transition-all flex items-center gap-0.5 shadow-xs max-w-[120px] truncate"
                                                    title={f.name}
                                                  >
                                                    {f.name} <ExternalLink className="w-2 h-2 shrink-0" />
                                                  </a>
                                                ))}
                                              </div>
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    </td>
                                    <td className="px-6 py-3 text-right font-bold text-rose-600 whitespace-nowrap">
                                      <div>{new Intl.NumberFormat('vi-VN').format(t.price)} VND</div>
                                      <div className="text-[10px] text-gray-400 font-medium">HH: {new Intl.NumberFormat('vi-VN').format(t.commission)}</div>
                                    </td>
                                    <td className="px-6 py-3 text-center whitespace-nowrap">
                                      <button
                                        type="button"
                                        onClick={() => handleShowNoticeModal(t)}
                                        style={{ backgroundColor: '#ff0000', color: '#ffffff' }}
                                        className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-sm hover:opacity-90"
                                      >
                                        <FileText className="w-3.5 h-3.5 mr-1" />
                                        Thông tin lưu ý
                                      </button>
                                    </td>
                                    {isVisaOrAdmin && (
                                      <td className="px-6 py-3 text-center whitespace-nowrap">
                                        <div className="flex items-center justify-center gap-1.5">
                                          {/* Duplicate/Clone */}
                                          <button
                                            onClick={() => handleCloneTour(t)}
                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-100 bg-blue-50/40"
                                            title="Sao chép ngày khởi hành"
                                          >
                                            <Copy className="w-4 h-4" />
                                          </button>
                                          {/* Edit */}
                                          <button
                                            onClick={() => startEdit(t)}
                                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors border border-amber-100 bg-amber-50/40"
                                            title="Sửa chi tiết"
                                          >
                                            <Edit3 className="w-4 h-4" />
                                          </button>
                                          {/* Delete */}
                                          <button
                                            onClick={() => handleDeleteTourClick(t)}
                                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-rose-100 bg-rose-50/40"
                                            title="Xóa"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </td>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50/80 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3.5 text-left">Mã dịch vụ</th>
                      <th className="px-6 py-3.5 text-left">Tên dịch vụ / Quốc gia</th>
                      <th className="px-6 py-3.5 text-right">Phí dịch vụ</th>
                      <th className="px-6 py-3.5 text-center">Thông tin lưu ý</th>
                      {isVisaOrAdmin && <th className="px-6 py-3.5 text-center">Hành động</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-sm text-gray-700">
                    {filteredVisaTours.map(t => (
                      <tr key={t.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-6 py-3.5">
                          <div className="font-bold text-blue-700 tracking-tight text-xs bg-blue-50 border border-blue-200/80 px-2.5 py-1 rounded-md inline-block">
                            {t.code}
                          </div>
                          {/* Tour Type Badge */}
                          <div className="mt-1.5">
                            {t.tour_type === 'visa' && (
                              <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full font-semibold uppercase">
                                🛂 Dịch vụ Visa lẻ
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3.5 max-w-xs">
                          <div className="font-bold text-gray-900 text-sm line-clamp-2" title={t.name}>{t.name}</div>
                          <div className="text-xs text-gray-500 mt-1 font-medium flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5">
                              <span>Thời gian xử lý: {t.duration}</span>
                            </div>
                            
                            {/* Product-Specific Subtext */}
                            {t.tour_type === 'visa' && (
                              <div className="text-xs text-purple-800 font-medium bg-purple-50/60 px-2 py-0.5 rounded border border-purple-100 mt-1">
                                Quốc gia: <span className="underline font-semibold">{t.visa_country || t.destination || 'Chưa xác định'}</span> | {t.visa_service_type || 'Dịch vụ'} ({t.visa_speed === 'urgent' ? '⚡ Khẩn' : '⏳ Thường'})
                              </div>
                            )}
                            {t.custom_requirements && (
                              <div className="text-xs text-purple-700 font-medium mt-0.5">Yêu cầu: {t.custom_requirements}</div>
                            )}

                            {t.itinerary_pdf_url && (() => {
                              let files: { name: string; url: string }[] = [];
                              try {
                                if (t.itinerary_pdf_url.startsWith('[')) {
                                  const parsed = JSON.parse(t.itinerary_pdf_url);
                                  files = parsed.map((item: any) => {
                                    if (typeof item === 'string') {
                                      const decoded = decodeURIComponent(item.split('/').pop() || 'File mẫu');
                                      return { name: decoded, url: item };
                                    }
                                    return item;
                                  });
                                } else if (t.itinerary_pdf_url) {
                                  const decoded = decodeURIComponent(t.itinerary_pdf_url.split('/').pop() || 'File mẫu');
                                  files = [{ name: decoded, url: t.itinerary_pdf_url }];
                                }
                              } catch (e) {
                                const decoded = decodeURIComponent(t.itinerary_pdf_url.split('/').pop() || 'File mẫu');
                                files = [{ name: decoded, url: t.itinerary_pdf_url }];
                              }
                              if (files.length === 0) return null;
                              return (
                                <div className="flex flex-wrap items-center gap-1.5 mt-1.5 pt-1.5 border-t border-dashed border-gray-200">
                                  <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 uppercase tracking-wide flex items-center shrink-0">
                                    <Paperclip className="w-3 h-3 mr-0.5" /> File mẫu ({files.length}):
                                  </span>
                                  <div className="flex flex-wrap gap-1">
                                    {files.map((f) => (
                                      <a
                                        key={f.url}
                                        href={f.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-[10px] font-semibold text-blue-700 hover:text-blue-900 bg-blue-50/70 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded transition-all flex items-center gap-0.5 shadow-xs max-w-[140px] truncate"
                                        title={f.name}
                                      >
                                        {f.name} <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-right whitespace-nowrap font-bold text-rose-600 text-xs">
                          <div>{new Intl.NumberFormat('vi-VN').format(t.price)} VND</div>
                          <div className="text-xs text-gray-400 font-medium">HH: {new Intl.NumberFormat('vi-VN').format(t.commission)}</div>
                        </td>
                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleShowNoticeModal(t)}
                            className="inline-flex items-center px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold transition-all shadow-sm"
                          >
                            <FileText className="w-3.5 h-3.5 mr-1" />
                            Thông tin lưu ý
                          </button>
                        </td>
                        {isVisaOrAdmin && (
                          <td className="px-6 py-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Duplicate/Clone action */}
                              <button
                                onClick={() => handleCloneTour(t)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-100 bg-blue-50/40"
                                title="Sao chép ngày khởi hành"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              
                              {/* Edit action */}
                              <button
                                onClick={() => startEdit(t)}
                                className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors border border-amber-100 bg-amber-50/40"
                                title="Sửa chi tiết"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              {/* Delete action */}
                              <button
                                onClick={() => handleDeleteTourClick(t)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-rose-100 bg-rose-50/40"
                                title="Xóa"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>

      {/* MODAL BỘ TẠO TOUR KHỞI HÀNH HÀNG LOẠT (SERIES) */}
      {showBulkModal && bulkBaseTour && (
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
                onClick={() => setShowBulkModal(false)}
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
                    <div className="text-xs font-bold text-slate-800 line-clamp-2 uppercase" title={bulkBaseTour.name}>
                      {bulkBaseTour.name}
                    </div>
                    <div className="text-[11px] text-slate-500 font-semibold mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                      <span>{bulkBaseTour.duration}</span>
                      <span>•</span>
                      <span>Hotel: {bulkBaseTour.hotel}</span>
                      <span>•</span>
                      <span>{bulkBaseTour.airline}</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex justify-between text-xs">
                    <span className="text-slate-500 font-semibold">Mã gốc:</span>
                    <strong className="text-slate-800 font-mono">{bulkBaseTour.code}</strong>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-4">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Thêm ngày khởi hành mới</h4>
                  
                  {/* Select Custom Date using custom VietnameseDateTimePicker */}
                  <VietnameseDateTimePicker
                    label="Chọn Ngày khởi hành muốn tạo"
                    required
                    showTime={false}
                    value={bulkCustomDate}
                    onChange={setBulkCustomDate}
                    placeholder="Chọn ngày khởi hành..."
                  />

                  <button
                    type="button"
                    onClick={handleAddBulkDate}
                    className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-black transition-all shadow-sm"
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
                    Tổng số: {bulkDatesList.length} ngày
                  </span>
                </div>

                <div className="overflow-y-auto divide-y divide-slate-100 flex-1 max-h-[320px]">
                  {bulkDatesList.length === 0 ? (
                    <div className="text-center py-16 text-slate-400 text-xs px-6">
                      <p className="font-semibold">Chưa có ngày khởi hành nào được chọn.</p>
                      <p className="text-[11px] mt-1 text-slate-400">Vui lòng chọn ngày khởi hành ở cột bên trái và bấm thêm.</p>
                    </div>
                  ) : (
                    bulkDatesList.map((item, idx) => {
                      // Calculate return date preview
                      const baseDep = new Date(bulkBaseTour.departure_time);
                      const baseRet = new Date(bulkBaseTour.return_time);
                      const durationMs = baseRet.getTime() - baseDep.getTime();
                      const retDate = new Date(item.date.getTime() + durationMs);

                      // Format for preview code using the helper
                      const tourCodePreview = getFormattedCode(bulkBaseTour.code, item.date.toISOString());

                      // Day name translation to Vietnamese
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
                                const updated = [...bulkDatesList];
                                updated[idx].selected = e.target.checked;
                                setBulkDatesList(updated);
                              }}
                              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded cursor-pointer animate-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setBulkDatesList(prev => prev.filter((_, i) => i !== idx));
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
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={bulkDatesList.filter(d => d.selected).length === 0}
                onClick={handleCreateBulkSeries}
                className="px-5 py-2 text-xs font-black text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm hover:shadow transition-all inline-flex items-center"
              >
                <Check className="w-4 h-4 mr-1.5" />
                Xác nhận tạo {bulkDatesList.filter(d => d.selected).length} Tour khởi hành
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NOTICE MODAL */}
      {showNoticeModal && selectedNoticeTour && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-150 shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-150 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 rounded-lg text-amber-700 border border-amber-200">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Thông tin Lưu ý / Quy định Dịch vụ</h3>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    Dịch vụ: <span className="text-blue-700 font-mono font-bold">{selectedNoticeTour.code}</span> — {selectedNoticeTour.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowNoticeModal(false);
                  setSelectedNoticeTour(null);
                }}
                className="p-1 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-6">
              {(() => {
                let sections = DEFAULT_NOTICE_SECTIONS;
                if (selectedNoticeTour.notice_sections) {
                  try {
                    sections = typeof selectedNoticeTour.notice_sections === 'string' 
                      ? JSON.parse(selectedNoticeTour.notice_sections) 
                      : selectedNoticeTour.notice_sections;
                  } catch (e) {
                    console.error('Error parsing notice sections:', e);
                  }
                }

                if (!sections || sections.length === 0) {
                  return (
                    <div className="text-center py-12 text-slate-400 text-sm">
                      Chưa có cấu hình thông tin lưu ý đặc thù nào cho dịch vụ này.
                    </div>
                  );
                }

                return sections.map((sec, secIdx) => (
                  <div key={secIdx} className="space-y-3">
                    <h4 className="text-xs font-black text-blue-900 uppercase tracking-wider bg-blue-50/70 px-3 py-2 rounded-lg">
                      {sec.title}
                    </h4>
                    <div className="space-y-3 pl-1">
                      {sec.items.map((row, rowIdx) => (
                        <div key={rowIdx} className="grid grid-cols-1 md:grid-cols-4 gap-2 bg-slate-50/50 p-3 rounded-lg border border-slate-200/60 hover:bg-slate-50 transition-colors">
                          <div className="text-xs font-bold text-emerald-800 md:col-span-1">
                            {row.key}
                          </div>
                          <div className="text-xs text-slate-700 md:col-span-3 leading-relaxed whitespace-pre-line">
                            {row.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowNoticeModal(false);
                  setSelectedNoticeTour(null);
                }}
                className="px-5 py-2 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all"
              >
                Đồng ý / Đóng lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal xác nhận xóa file mẫu */}
      <ActionModal
        isOpen={!!fileToDelete}
        onClose={() => setFileToDelete(null)}
        title="Xác nhận xóa file mẫu"
        message="Bạn có chắc chắn muốn xóa file mẫu này khỏi danh sách và máy chủ?"
        onConfirm={() => {
          if (fileToDelete) {
            handleRemoveVisaSampleFile(fileToDelete);
          }
        }}
      />

      {/* Modal xác nhận xóa Dịch vụ visa */}
      <ActionModal
        isOpen={!!tourToDelete}
        onClose={() => setTourToDelete(null)}
        title="Xác nhận xóa Dịch vụ"
        message={`Bạn có chắc chắn muốn XÓA vĩnh viễn ${tourToDelete?.code || 'dịch vụ này'}? HÀNH ĐỘNG NÀY SẼ XÓA TẤT CẢ CÁC ĐƠN BOOKING LIÊN QUAN VÀ KHÔNG THỂ KHÔI PHỤC.`}
        onConfirm={() => {
          if (tourToDelete) {
            deleteTour(tourToDelete.id);
            toast.success(`Đã xóa tour ${tourToDelete.code} ra khỏi cơ sở dữ liệu.`);
          }
        }}
      />

    </div>
  );
}
