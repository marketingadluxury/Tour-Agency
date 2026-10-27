import toast from 'react-hot-toast';
import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useCRM } from '@/context/CRMContext';
import { Tour, TourStatus } from '@/types';
import { safeFetchApi } from '@/lib/utils';
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
  Folder,
  ExternalLink,
  Tag,
  Grid,
  Plane,
  Building,
  Building2,
  DollarSign,
  ChevronDown,
  ChevronUp,
  UploadCloud,
  Image as ImageIcon,
  Search,
  Filter,
  Phone,
  Mail,
  Users,
  Handshake,
  Crown,
  AlertTriangle,
  Lightbulb,
  BarChart3,
  Calendar,
  LayoutGrid,
  List,
  ArrowRight,
  CheckCircle2,
  Zap,
  Hotel,
  Globe,
  Coins,
  Download,
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
  Info,
  MapPin,
  CalendarDays,
  FileCheck2,
  FileSpreadsheet
} from 'lucide-react';
import { format } from 'date-fns';
import { SyncTourToWooCommerceModal } from '@/components/SyncTourToWooCommerceModal';
import { BulkSyncWooCommerceModal } from '@/components/BulkSyncWooCommerceModal';
import { CustomSelect } from '@/components/CustomSelect';
import DashboardOperator from '@/components/DashboardOperator';
import TourCostsManagement from '@/components/TourCostsManagement';
import { extractSkuPrefix } from '@/utils/skuUtils';
import { NumericFormatInput } from '@/components/NumericFormatInput';
import { BulkSeriesModal } from '@/components/tours/BulkSeriesModal';

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

export const safeIsoString = (val: string | null | undefined): string | undefined => {
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
                <div className="flex items-center gap-1.5">
                  <div>
                    <select
                      value={hours}
                      onChange={e => handleTimeChange(Number(e.target.value), minutes)}
                      className="border border-slate-200 rounded-md py-1 px-2 text-xs bg-slate-50 font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      {Array.from({ length: 24 }).map((_, h) => (
                        <option key={h} value={h}>{h.toString().padStart(2, '0')}</option>
                      ))}
                    </select>
                  </div>
                  <span className="text-slate-400 font-bold">:</span>
                  <div>
                    <select
                      value={minutes}
                      onChange={e => handleTimeChange(hours, Number(e.target.value))}
                      className="border border-slate-200 rounded-md py-1 px-2 text-xs bg-slate-50 font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      {Array.from({ length: 60 }).map((_, m) => (
                        <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                      ))}
                    </select>
                  </div>
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

export default function ToursManagement() {
  const location = useLocation();
  const { 
    tours, 
    orders, 
    addTour, 
    updateTour, 
    deleteTour, 
    handleExtensionRequest,
    categories,
    addCategory,
    deleteCategory,
    updateCategory,
    refreshTours,
    currentRole,
    tourMedia,
    createOrder,
    updateOrder
  } = useCRM();

  // Permissions for tabs and actions
  const canAccessCosts = ['admin', 'bod', 'operator', 'accounting', 'sale_leader'].includes(currentRole);
  const canAccessCategories = ['admin', 'bod', 'operator', 'sale_leader'].includes(currentRole);
  const canManageTours = ['admin', 'operator', 'sale_leader'].includes(currentRole);

  // Navigation tabs: 'tours' | 'categories' | 'costs'
  const [activeTab, setActiveTab] = useState<'tours' | 'categories' | 'costs'>(
    currentRole === 'accounting' ? 'costs' : 'tours'
  );

  // Synchronize activeTab if currentRole changes
  useEffect(() => {
    if (currentRole === 'accounting') {
      setActiveTab('costs');
    } else if (!canAccessCosts && activeTab === 'costs') {
      setActiveTab('tours');
    } else if (!canAccessCategories && activeTab === 'categories') {
      setActiveTab('tours');
    }
  }, [currentRole, activeTab, canAccessCosts, canAccessCategories]);

  // View mode for tour listing: 'grouped' (default) | 'flat'
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');
  const [expandedGroups, setExpandedGroups] = useState<{ [key: string]: boolean }>({});
  // Filter state for tour operation type
  const [filterTourType, setFilterTourType] = useState<'all' | 'internal' | 'outsourced' | 'private'>('all');
  // Filter state for time status: 'upcoming' (default) | 'departed' | 'all'
  const [filterTimeStatus, setFilterTimeStatus] = useState<'upcoming' | 'departed' | 'all'>('upcoming');
  // Filter state for departure month
  const [filterMonth, setFilterMonth] = useState<string>('all');
  // Filter state for category
  const [filterCategory, setFilterCategory] = useState<string>('all');
  // Search term
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Drawer state for viewing tour details
  const [selectedTourForDrawer, setSelectedTourForDrawer] = useState<Tour | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // WooCommerce Sync states
  const [isSyncingTourId, setIsSyncingTourId] = useState<string | null>(null);
  const [isBulkSyncing, setIsBulkSyncing] = useState<boolean>(false);
  const [isBulkSyncModalOpen, setIsBulkSyncModalOpen] = useState<boolean>(false);
  const [selectedTourForWpSync, setSelectedTourForWpSync] = useState<Tour | null>(null);

  const handleSyncSingleTourToWooCommerce = (tour: Tour) => {
    // Mở modal lựa chọn sản phẩm website thông minh trước khi đồng bộ
    setSelectedTourForWpSync(tour);
  };

  const handleBulkSyncToWooCommerce = () => {
    // Mở modal đồng bộ hàng loạt chuyên dụng cho phép duyệt, tích chọn và ghép nối sản phẩm
    setIsBulkSyncModalOpen(true);
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  // Reset page when any filter or view mode changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterTourType, filterTimeStatus, filterMonth, filterCategory, searchTerm, viewMode, itemsPerPage]);

  // Extract available departure months (YYYY-MM) from all tours
  const availableMonths = React.useMemo(() => {
    const monthsSet = new Set<string>();
    tours.filter(t => t.tour_type !== 'visa').forEach(t => {
      const dateStr = t.departure_time || t.start_date;
      if (dateStr) {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          monthsSet.add(mKey);
        }
      }
    });
    return Array.from(monthsSet).sort();
  }, [tours]);

  const todayStart = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Base tours matching current filterTourType for sub-tabs time status counts
  const baseToursForTimeFilter = React.useMemo(() => {
    return tours
      .filter(t => t.tour_type !== 'visa')
      .filter(t => {
        if (filterTourType === 'internal') {
          return !t.tour_type || t.tour_type === 'internal';
        }
        if (filterTourType === 'outsourced') {
          return t.tour_type === 'outsourced' || t.tour_type === 'partner';
        }
        if (filterTourType === 'private') {
          return t.tour_type === 'private';
        }
        return true;
      });
  }, [tours, filterTourType]);

  // Filtered tours based on selected filters
  const displayTours = React.useMemo(() => {
    return tours
      .filter(t => t.tour_type !== 'visa')
      .filter(t => {
        // 1. Operation type
        if (filterTourType === 'internal') {
          if (t.tour_type && t.tour_type !== 'internal') return false;
        } else if (filterTourType === 'outsourced') {
          if (t.tour_type !== 'outsourced' && t.tour_type !== 'partner') return false;
        } else if (filterTourType === 'private') {
          if (t.tour_type !== 'private') return false;
        }

        // 2. Time status (upcoming vs departed)
        const depDate = new Date(t.departure_time || t.start_date || '');
        const isDeparted = !isNaN(depDate.getTime()) && depDate < todayStart;

        if (filterTimeStatus === 'upcoming') {
          if (isDeparted) return false;
        } else if (filterTimeStatus === 'departed') {
          if (!isDeparted) return false;
        }

        // 3. Month filter
        if (filterMonth !== 'all') {
          const dateStr = t.departure_time || t.start_date;
          if (dateStr) {
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) {
              const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
              if (mKey !== filterMonth) return false;
            } else return false;
          } else return false;
        }

        // 4. Category filter
        if (filterCategory !== 'all' && t.category !== filterCategory) {
          return false;
        }

        // 5. Search term
        if (searchTerm.trim() !== '') {
          const term = searchTerm.toLowerCase();
          const matchName = (t.name || '').toLowerCase().includes(term);
          const matchCode = (t.code || '').toLowerCase().includes(term);
          const matchDest = (t.destination || '').toLowerCase().includes(term);
          if (!matchName && !matchCode && !matchDest) return false;
        }

        return true;
      });
  }, [tours, filterTourType, filterTimeStatus, filterMonth, filterCategory, searchTerm, todayStart]);

  // Group tours by name for easier bulk management
  const groupedTours = React.useMemo<Record<string, Tour[]>>(() => {
    const groups: { [key: string]: Tour[] } = {};

    displayTours.forEach(tour => {
      const key = tour.name || 'Hành trình chưa đặt tên';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(tour);
    });
    // Sort departures within each group by departure_time ascending
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => {
        if (!a.departure_time) return 1;
        if (!b.departure_time) return -1;
        return new Date(a.departure_time).getTime() - new Date(b.departure_time).getTime();
      });
    });
    return groups;
  }, [displayTours]);

  // Pagination calculations
  const totalGroupItems = Object.keys(groupedTours).length;
  const totalGroupPages = Math.ceil(totalGroupItems / itemsPerPage) || 1;
  const paginatedGroupEntries = React.useMemo(() => {
    const entries = Object.entries(groupedTours);
    const startIdx = (currentPage - 1) * itemsPerPage;
    return entries.slice(startIdx, startIdx + itemsPerPage);
  }, [groupedTours, currentPage, itemsPerPage]);

  const totalFlatItems = displayTours.length;
  const totalFlatPages = Math.ceil(totalFlatItems / itemsPerPage) || 1;
  const paginatedFlatTours = React.useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return displayTours.slice(startIdx, startIdx + itemsPerPage);
  }, [displayTours, currentPage, itemsPerPage]);

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

  const handleOpenBulkModal = (tour: Tour) => {
    if (!canManageTours) {
      toast.error('Bạn không có quyền tạo chuỗi ngày khởi hành.');
      return;
    }
    if (currentRole === 'sale_leader' && (!tour.tour_type || tour.tour_type === 'internal')) {
      toast.error('Sale Leader không có quyền thao tác với Tour tự vận hành.');
      return;
    }
    setBulkBaseTour(tour);
    setShowBulkModal(true);
  };


  // Form toggles
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTour, setEditingTour] = useState<Tour | null>(null);

  // Categories form states
  const [newCatName, setNewCatName] = useState('');
  const [editingCatOldName, setEditingCatOldName] = useState<string | null>(null);
  const [editingCatNewName, setEditingCatNewName] = useState('');
  const [catToDelete, setCatToDelete] = useState<string | null>(null);
  const [catAlertMessage, setCatAlertMessage] = useState<string | null>(null);

  // Tour Form State (for both create & edit)
  const [code, setCode] = useState('');
  const [wpProductSku, setWpProductSku] = useState('');
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

  const handlePriceChange = (val: number | '') => {
    setPrice(val);
    if (tourType !== 'visa') {
      const effectivePrice = (val === '' ? 0 : Number(val)) - (discount === '' ? 0 : Number(discount));
      setPriceAdult(effectivePrice);
      setPriceChild(Math.round(effectivePrice * 0.8));
      setPriceInfant(Math.round(effectivePrice * 0.3));
    }
  };

  const handleDiscountChange = (val: number | '') => {
    setDiscount(val);
    if (tourType !== 'visa') {
      const effectivePrice = (price === '' ? 0 : Number(price)) - (val === '' ? 0 : Number(val));
      setPriceAdult(effectivePrice);
      setPriceChild(Math.round(effectivePrice * 0.8));
      setPriceInfant(Math.round(effectivePrice * 0.3));
    }
  };
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
  const [ticketDeadline, setTicketDeadline] = useState('');
  const [visaDeadline, setVisaDeadline] = useState('');
  const [description, setDescription] = useState('');
  const [tourStatus, setTourStatus] = useState<TourStatus>('available');
  const [category, setCategory] = useState('');
  const [itineraryPdfUrl, setItineraryPdfUrl] = useState('');
  const [isUploadingItinerary, setIsUploadingItinerary] = useState(false);

  useEffect(() => {
    if (!ticketDeadline) {
      setTicketStatus('CHỜ XUẤT VÉ');
      return;
    }
    const deadline = new Date(ticketDeadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadline.setHours(0, 0, 0, 0);
    
    if (today > deadline) {
      setTicketStatus('ĐÃ XUẤT VÉ');
    } else {
      setTicketStatus('CHỜ XUẤT VÉ');
    }
  }, [ticketDeadline]);

  const [itineraryUploadError, setItineraryUploadError] = useState<string | null>(null);

  const handleItineraryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!code.trim()) {
      toast.error('Vui lòng nhập Mã Tour trước khi tải file lịch trình lên để hệ thống đặt tên file chính xác!');
      e.target.value = '';
      return;
    }

    setIsUploadingItinerary(true);
    setItineraryUploadError(null);

    try {
      const formData = new FormData();
      formData.append('uploadType', 'tour');
      formData.append('tourCode', code.trim());
      formData.append('category', category || 'Chung');
      formData.append('file', file);

      const data = await safeFetchApi('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (data && data.url) {
        setItineraryPdfUrl(data.url);
      } else if (data && data.error) {
        throw new Error(data.error);
      } else {
        console.error('Phản hồi không hợp lệ từ máy chủ:', data);
        throw new Error('Phản hồi từ máy chủ không chứa đường dẫn file.');
      }
    } catch (err: any) {
      console.error(err);
      setItineraryUploadError(err.message || 'Lỗi tải file lên');
    } finally {
      setIsUploadingItinerary(false);
      e.target.value = '';
    }
  };

  const handlePrivateContractUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!code.trim()) {
      toast.error('Vui lòng nhập Mã Tour trước khi tải file hợp đồng lên để hệ thống đặt tên file chính xác!');
      e.target.value = '';
      return;
    }

    setIsUploadingContract(true);
    setContractUploadError(null);

    try {
      const formData = new FormData();
      formData.append('uploadType', 'tour');
      formData.append('tourCode', code.trim());
      formData.append('category', category || 'Chung');
      formData.append('file', file);

      const data = await safeFetchApi('/api/upload', {
        method: 'POST',
        headers: {
          'Accept': 'application/json'
        },
        body: formData,
      });

      if (data && data.url) {
        setPrivateContractFileUrl(data.url);
        toast.success('Đã tải file hợp đồng/chương trình tour lên thành công!');
      } else if (data && data.error) {
        throw new Error(data.error);
      } else {
        console.error('Phản hồi không hợp lệ từ máy chủ:', data);
        throw new Error('Phản hồi từ máy chủ không chứa đường dẫn file.');
      }
    } catch (err: any) {
      console.error(err);
      setContractUploadError(err.message || 'Lỗi tải file lên');
      toast.error(err.message || 'Lỗi tải file lên thất bại!');
    } finally {
      setIsUploadingContract(false);
      e.target.value = '';
    }
  };

  // Tour Type fields
  const [tourType, setTourType] = useState<'internal' | 'outsourced' | 'partner' | 'private' | 'visa'>('internal');
  const [partnerName, setPartnerName] = useState('');
  const [partnerContact, setPartnerContact] = useState('');
  const [partnerCompanyName, setPartnerCompanyName] = useState('');
  const [partnerRetailPrice, setPartnerRetailPrice] = useState<number | ''>('');
  const [partnerNetCost, setPartnerNetCost] = useState<number | ''>('');
  const [partnerCommission, setPartnerCommission] = useState<number | ''>('');

  const updateNetCost = (retailVal: number | '', commVal: number | '') => {
    if (retailVal === '') {
      setPartnerNetCost('');
    } else {
      const r = Number(retailVal);
      const c = Number(commVal) || 0;
      setPartnerNetCost(Math.max(0, r - c));
    }
  };
  const [organizationName, setOrganizationName] = useState('');
  const [groupLeaderContact, setGroupLeaderContact] = useState('');
  const [customRequirements, setCustomRequirements] = useState('');
  const [visaCountry, setVisaCountry] = useState('');
  const [visaServiceType, setVisaServiceType] = useState('');
  const [visaSpeed, setVisaSpeed] = useState<'standard' | 'urgent'>('standard');

  // Private tour specific states
  const [privateCustomerName, setPrivateCustomerName] = useState('');
  const [privateCustomerPhone, setPrivateCustomerPhone] = useState('');
  const [privateCustomerEmail, setPrivateCustomerEmail] = useState('');
  const [privatePaxCount, setPrivatePaxCount] = useState<number | ''>('');
  const [privateTotalAmount, setPrivateTotalAmount] = useState<number | ''>('');
  const [privateContractFileUrl, setPrivateContractFileUrl] = useState('');
  const [isUploadingContract, setIsUploadingContract] = useState(false);
  const [contractUploadError, setContractUploadError] = useState<string | null>(null);

  // State for Delete Tour confirmation modal
  const [deletingTour, setDeletingTour] = useState<Tour | null>(null);

  // Inline category creation state
  const [showInlineCatForm, setShowInlineCatForm] = useState(false);
  const [inlineCatName, setInlineCatName] = useState('');

  const handleAddInlineCategory = async () => {
    const trimmed = inlineCatName.trim();
    if (!trimmed) return;
    if (categories.includes(trimmed)) {
      toast.error('Danh mục này đã tồn tại!');
      return;
    }
    await addCategory(trimmed);
    setCategory(trimmed);
    setInlineCatName('');
    setShowInlineCatForm(false);
  };

  // Travel Notes/Disclaimer Builder state
  const [noticeSections, setNoticeSections] = useState<Array<{ title: string; items: Array<{ key: string; value: string }> }>>(DEFAULT_NOTICE_SECTIONS);

  // Set default category when categories are loaded
  useEffect(() => {
    if (categories && categories.length > 0 && !category) {
      setCategory(categories[0]);
    }
  }, [categories, category]);

  // Handle Extension requests list
  const extensionRequests = orders.filter(o => o.extension_status === 'requested');

  // Trigger editing mode and populate states
  const startEdit = (tour: Tour) => {
    if (!canManageTours) {
      toast.error('Bạn không có quyền chỉnh sửa thông tin tour.');
      return;
    }
    if (currentRole === 'sale_leader' && (!tour.tour_type || tour.tour_type === 'internal')) {
      toast.error('Sale Leader không có quyền thao tác với Tour tự vận hành.');
      return;
    }
    setEditingTour(tour);
    setContractUploadError(null);
    setItineraryUploadError(null);
    setCode(tour.code);
    setWpProductSku(tour.wp_product_sku || '');
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
    setPriceVisaTour(tour.price_visa_tour ?? '');
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
    if (tour.ticket_deadline) {
      setTicketDeadline(tour.ticket_deadline.split('T')[0]);
    } else {
      setTicketDeadline('');
    }
    
    if (tour.visa_deadline) {
      setVisaDeadline(tour.visa_deadline.split('T')[0]);
    } else {
      setVisaDeadline('');
    }
    
    setDescription(tour.description || '');
    setTourStatus(tour.tour_status || 'available');
    setCategory(tour.category || (categories && categories[0]) || '');
    setItineraryPdfUrl(tour.itinerary_pdf_url || '');

    setTourType(tour.tour_type || 'internal');
    setPartnerName(tour.partner_name || tour.partner_company_name || '');
    setPartnerContact(tour.partner_contact || '');
    setPartnerCompanyName(tour.partner_company_name || tour.partner_name || '');
    const retail = tour.partner_retail_price ?? '';
    const net = tour.partner_net_cost ?? '';
    setPartnerRetailPrice(retail);
    setPartnerNetCost(net);
    if (retail !== '' && net !== '') {
      setPartnerCommission(Math.max(0, Number(retail) - Number(net)));
    } else {
      setPartnerCommission('');
    }
    setOrganizationName(tour.organization_name || '');
    setGroupLeaderContact(tour.group_leader_contact || '');
    setCustomRequirements(tour.custom_requirements || '');
    setVisaCountry(tour.visa_country || '');
    setVisaServiceType(tour.visa_service_type || '');
    setVisaSpeed(tour.visa_speed || 'standard');

    if (tour.tour_type === 'private') {
      setPrivateCustomerName(tour.organization_name || '');
      setPrivateCustomerPhone(tour.group_leader_contact || '');
      const emailMatch = tour.custom_requirements?.match(/Email:\s*([^\s,;]+)/i);
      if (emailMatch) {
        setPrivateCustomerEmail(emailMatch[1]);
      } else {
        const linkedOrder = orders.find(o => o.tour_id === tour.id);
        if (linkedOrder) {
          setPrivateCustomerEmail((linkedOrder as any).customer_email || (linkedOrder as any).booker_email || '');
        } else {
          setPrivateCustomerEmail('');
        }
      }
      setPrivatePaxCount(tour.total_seats || '');
      setPrivateTotalAmount(tour.price || '');
      setPrivateContractFileUrl(tour.itinerary_pdf_url || '');
    }

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

  // Helper function to create missing order for a private tour
  const handleCreateMissingPrivateOrder = async (tour: Tour) => {
    try {
      const paxCount = tour.total_seats || 1;
      const totalAmount = tour.price || 0;
      const orderData = {
        tour_id: tour.id,
        tour_fallback: tour,
        status: 'sure' as const,
        total_price: Number(totalAmount),
        adult_price: Math.round(Number(totalAmount) / Number(paxCount)),
        adult_count: Number(paxCount),
        booker_name: tour.organization_name || 'Khách đoàn',
        booker_phone: tour.group_leader_contact || '0000000000',
        special_requests: tour.custom_requirements || '',
        is_locked: true,
        seller_type: 'direct' as const
      };
      const created = await createOrder(orderData);
      if (created) {
        toast.success(`Đã tự động khởi tạo Đơn hàng (Booking) thành công cho Tour đoàn riêng ${tour.code}!`);
      } else {
        toast.error('Có lỗi xảy ra khi tạo Đơn hàng!');
      }
    } catch (err) {
      console.error('Lỗi khi khởi tạo Đơn hàng liên kết:', err);
      toast.error('Lỗi khi tạo Đơn hàng liên kết!');
    }
  };

  // Auto Sync: Tự động khởi tạo Booking cho bất kỳ Tour đoàn riêng nào chưa có đơn hàng liên kết
  const syncingPrivateToursRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!tours || tours.length === 0 || !orders) return;

    const privateTours = tours.filter(t => t.tour_type === 'private');
    if (privateTours.length === 0) return;

    privateTours.forEach(async (pTour) => {
      const hasOrder = orders.some(o => o.tour_id === pTour.id);
      if (!hasOrder && !syncingPrivateToursRef.current.has(pTour.id)) {
        syncingPrivateToursRef.current.add(pTour.id);
        try {
          const paxCount = pTour.total_seats || 1;
          const totalAmount = pTour.price || 0;
          const orderData = {
            tour_id: pTour.id,
            tour_fallback: pTour,
            status: 'sure' as const,
            total_price: Number(totalAmount),
            adult_price: Math.round(Number(totalAmount) / Number(paxCount)),
            adult_count: Number(paxCount),
            booker_name: pTour.organization_name || 'Khách đoàn',
            booker_phone: pTour.group_leader_contact || '0000000000',
            special_requests: pTour.custom_requirements || '',
            is_locked: true,
            seller_type: 'direct' as const
          };
          await createOrder(orderData);
        } catch (err) {
          console.error('Lỗi khi tự động sinh Booking cho Tour đoàn riêng:', err);
        } finally {
          syncingPrivateToursRef.current.delete(pTour.id);
        }
      }
    });
  }, [tours, orders, createOrder]);

  // Trigger duplicate/clone and populate form
  const handleCloneTour = (tour: Tour) => {
    if (!canManageTours) {
      toast.error('Bạn không có quyền sao chép hoặc thêm ngày khởi hành mới.');
      return;
    }
    if (currentRole === 'sale_leader' && (!tour.tour_type || tour.tour_type === 'internal')) {
      toast.error('Sale Leader không có quyền thao tác với Tour tự vận hành.');
      return;
    }
    setCode(`${tour.code}-CLONE`);
    setName(`[SAO CHÉP] ${tour.name.toUpperCase()}`);
    setDestination(tour.destination || '');
    setDuration(tour.duration);
    setDepartureTime('');
    setReturnTime('');
    setAirline(tour.airline || 'Vietnam Airlines');
    setHotel(tour.hotel || 'Khách sạn 4*');
    setPrice(tour.price);
    setDiscount(tour.discount ?? '');
    setCommission(tour.commission);
    setPriceVisaTour(tour.price_visa_tour ?? '');
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
    if (tour.ticket_deadline) {
      setTicketDeadline(tour.ticket_deadline.split('T')[0]);
    } else {
      setTicketDeadline('');
    }
    setVisaDeadline('');
    setDescription(tour.description || '');
    setTourStatus('available');
    setCategory(tour.category || (categories && categories[0]) || '');
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

  // Pre-fill form to quickly add a new departure under the same Tour series
  const handleAddDepartureQuick = (tour: Tour) => {
    if (!canManageTours) {
      toast.error('Bạn không có quyền thêm ngày khởi hành mới.');
      return;
    }
    if (currentRole === 'sale_leader' && (!tour.tour_type || tour.tour_type === 'internal')) {
      toast.error('Sale Leader không có quyền thao tác với Tour tự vận hành.');
      return;
    }
    // Try to strip any date suffix or clone suffix from the code
    const baseCode = tour.code.replace(/-CLONE/g, '').replace(/-\d{6}$/g, '');
    setCode(baseCode);
    setName(tour.name);
    setDestination(tour.destination || '');
    setDuration(tour.duration);
    setDepartureTime('');
    setReturnTime('');
    setAirline(tour.airline || 'Vietnam Airlines');
    setHotel(tour.hotel || 'Khách sạn 4*');
    setPrice(tour.price);
    setDiscount(tour.discount ?? '');
    setCommission(tour.commission);
    setPriceVisaTour(tour.price_visa_tour ?? '');
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
    if (tour.ticket_deadline) {
      setTicketDeadline(tour.ticket_deadline.split('T')[0]);
    } else {
      setTicketDeadline('');
    }
    setVisaDeadline('');
    setDescription(tour.description || '');
    setTourStatus('available');
    setCategory(tour.category || (categories && categories[0]) || '');
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
    setWpProductSku('');
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
    setTicketDeadline('');
    setVisaDeadline('');
    setDescription('');
    setTourStatus('available');
    setCategory(categories[0] || 'Du lịch Đông Nam Á');
    setItineraryPdfUrl('');
    setNoticeSections(DEFAULT_NOTICE_SECTIONS);
    setTourType(currentRole === 'sale_leader' ? 'outsourced' : 'internal');
    setPartnerName('');
    setPartnerContact('');
    setPartnerCompanyName('');
    setPartnerRetailPrice('');
    setPartnerNetCost('');
    setPartnerCommission('');
    setOrganizationName('');
    setGroupLeaderContact('');
    setCustomRequirements('');
    setVisaCountry('');
    setVisaServiceType('');
    setVisaSpeed('standard');
    setPrivateCustomerName('');
    setPrivateCustomerPhone('');
    setPrivateCustomerEmail('');
    setPrivatePaxCount('');
    setPrivateTotalAmount('');
    setPrivateContractFileUrl('');
    setContractUploadError(null);
    setItineraryUploadError(null);
    setEditingTour(null);
    setShowAddForm(false);
    setShowInlineCatForm(false);
    setInlineCatName('');
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
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageTours) {
      toast.error('Bạn không có quyền tạo hoặc chỉnh sửa tour.');
      return;
    }
    if (isCodeDuplicate) {
      toast.error('Mã tour/visa này đã tồn tại, vui lòng chọn mã khác!');
      return;
    }
    if (currentRole === 'sale_leader' && tourType === 'internal') {
      toast.error('Sale Leader chỉ có quyền tạo Tour gửi khách đối tác hoặc Tour đoàn riêng.');
      return;
    }

    if (tourType === 'private') {
      if (!code || !name || !departureTime || !returnTime) {
        toast.error('Vui lòng nhập đầy đủ các trường thông tin bắt buộc (Mã Tour, Tên đoàn, Ngày đi, Ngày về)!');
        return;
      }
      if (!privateCustomerName || !privateCustomerPhone) {
        toast.error('Vui lòng nhập đầy đủ Tên cơ quan/Doanh nghiệp và Số điện thoại liên hệ!');
        return;
      }
      if (privatePaxCount === '' || Number(privatePaxCount) <= 0) {
        toast.error('Vui lòng nhập số lượng khách chốt (Pax) hợp lệ!');
        return;
      }
      if (privateTotalAmount === '' || Number(privateTotalAmount) <= 0) {
        toast.error('Vui lòng nhập tổng giá trị hợp đồng đoàn (VNĐ) hợp lệ!');
        return;
      }
    } else {
      if (tourType !== 'visa' && (!code || !name || !departureTime || !returnTime)) {
        toast.error('Vui lòng nhập đầy đủ các trường thông tin bắt buộc (Mã tour, Tên tour, Ngày đi, Ngày về)!');
        return;
      }
      if (tourType === 'visa' && (!code || !name)) {
        toast.error('Vui lòng nhập Mã visa và Tên visa!');
        return;
      }
    }

    const calculatedPrice = price === '' ? 0 : Number(price);
    const effectivePrice = calculatedPrice - (discount === '' ? 0 : Number(discount));
    const calculatedCommission = commission === '' ? 0 : Number(commission);

    let tourData: any = {};

    if (tourType === 'private') {
      const totalAmountVal = Number(privateTotalAmount);
      const paxCountVal = Number(privatePaxCount);
      const avgPrice = Math.round(totalAmountVal / paxCountVal);

      tourData = {
        code,
        name,
        destination: destination || category || 'Chưa xác định',
        start_date: departureTime ? departureTime.substring(0, 10) : new Date().toISOString().substring(0, 10),
        end_date: returnTime ? returnTime.substring(0, 10) : new Date().toISOString().substring(0, 10),
        duration,
        departure_time: departureTime ? (safeIsoString(departureTime) || null) : null,
        return_time: returnTime ? (safeIsoString(returnTime) || null) : null,
        airline: 'Vietnam Airlines',
        hotel: 'Khách sạn 4*',
        price: totalAmountVal,
        discount: 0,
        price_visa_tour: 0,
        commission: calculatedCommission,
        total_seats: paxCountVal,
        overbook_limit: 0,
        tour_status: 'available' as const,
        category: category || categories[0],
        hold_duration_hours: 0,
        price_adult: avgPrice,
        price_child: 0,
        price_infant: 0,
        single_room_surcharge: 0,
        itinerary_pdf_url: privateContractFileUrl || undefined,
        notice_sections: JSON.stringify([]),
        tour_type: 'private' as const,
        organization_name: privateCustomerName,
        group_leader_contact: privateCustomerPhone,
        custom_requirements: privateCustomerEmail ? `Email: ${privateCustomerEmail}` : undefined,
        wp_product_sku: wpProductSku.trim().toUpperCase() || undefined,
      };
    } else {
      tourData = {
        code,
        name,
        destination: destination || category || 'Chưa xác định',
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
        ticket_deadline: safeIsoString(ticketDeadline),
        description: description || undefined,
        tour_status: tourStatus,
        category: category || categories[0],
        hold_duration_hours: Number(holdDuration),
        price_adult: priceAdult !== '' ? Number(priceAdult) : effectivePrice,
        price_child: priceChild !== '' ? Number(priceChild) : Math.round(effectivePrice * 0.8),
        price_infant: priceInfant !== '' ? Number(priceInfant) : Math.round(effectivePrice * 0.3),
        single_room_surcharge: singleRoomSurcharge !== '' ? Number(singleRoomSurcharge) : 7500000,
        itinerary_pdf_url: itineraryPdfUrl || undefined,
        notice_sections: JSON.stringify(noticeSections),
        tour_type: tourType,
        partner_name: partnerCompanyName || partnerName || undefined,
        partner_contact: partnerContact || undefined,
        partner_company_name: partnerCompanyName || partnerName || undefined,
        partner_retail_price: partnerRetailPrice !== '' ? Number(partnerRetailPrice) : 0,
        partner_net_cost: partnerNetCost !== '' ? Number(partnerNetCost) : 0,
        ad_commission_amount: Math.max(0, (partnerRetailPrice !== '' ? Number(partnerRetailPrice) : 0) - (partnerNetCost !== '' ? Number(partnerNetCost) : 0)),
        organization_name: organizationName || undefined,
        group_leader_contact: groupLeaderContact || undefined,
        custom_requirements: customRequirements || undefined,
        visa_country: visaCountry || (tourType === 'visa' ? destination : undefined),
        visa_service_type: visaServiceType || undefined,
        visa_speed: visaSpeed || undefined,
        wp_product_sku: wpProductSku.trim().toUpperCase() || undefined,
      };
    }

    if (editingTour) {
      // Logic edit
      await updateTour({
        ...editingTour,
        ...tourData,
      } as Tour);

      if (tourType === 'private') {
        const linkedOrder = orders.find(o => o.tour_id === editingTour.id);
        if (linkedOrder) {
          try {
            await updateOrder(linkedOrder.id, {
              total_price: Number(privateTotalAmount),
              adult_count: Number(privatePaxCount),
              booker_name: privateCustomerName,
              booker_phone: privateCustomerPhone,
              special_requests: privateCustomerEmail ? `Email: ${privateCustomerEmail}` : '',
            });
          } catch (orderErr) {
            console.error('Lỗi tự động cập nhật Đơn hàng liên kết:', orderErr);
          }
        } else {
          try {
            const paxCount = Number(privatePaxCount) || editingTour.total_seats || 1;
            const totalAmount = Number(privateTotalAmount) || editingTour.price || 0;
            const orderData = {
              tour_id: editingTour.id,
              tour_fallback: { ...editingTour, ...tourData },
              status: 'sure' as const,
              total_price: totalAmount,
              adult_price: Math.round(totalAmount / paxCount),
              adult_count: paxCount,
              booker_name: privateCustomerName || editingTour.organization_name || 'Khách đoàn',
              booker_phone: privateCustomerPhone || editingTour.group_leader_contact || '0000000000',
              special_requests: privateCustomerEmail ? `Email: ${privateCustomerEmail}` : (editingTour.custom_requirements || ''),
              is_locked: true,
              seller_type: 'direct' as const
            };
            await createOrder(orderData);
            toast.success('Đã tự động khởi tạo Đơn hàng (Booking) liên kết mới cho Tour đoàn riêng!');
          } catch (orderErr) {
            console.error('Lỗi khi tự động khởi tạo Đơn hàng liên kết:', orderErr);
          }
        }
      }

      toast.success(`Đã cập nhật thông tin tour ${code} thành công!`);
      resetForm();
    } else {
      // Logic add
      const createdTour = await addTour(tourData);
      
      if (tourType === 'private') {
        if (createdTour) {
          syncingPrivateToursRef.current.add(createdTour.id);
          try {
            const orderData = {
              tour_id: createdTour.id,
              tour_fallback: createdTour,
              status: 'sure' as const,
              total_price: Number(privateTotalAmount),
              adult_price: Math.round(Number(privateTotalAmount) / Number(privatePaxCount)),
              adult_count: Number(privatePaxCount),
              booker_name: privateCustomerName,
              booker_phone: privateCustomerPhone,
              special_requests: privateCustomerEmail ? `Email: ${privateCustomerEmail}` : '',
              is_locked: true,
              seller_type: 'direct' as const
            };
            const createdOrder = await createOrder(orderData);
            if (createdOrder) {
              toast.success(`Đã khởi tạo Tour đoàn riêng ${code} và tự động sinh Đơn hàng thành công!`);
            } else {
              toast.error('Tour đã được tạo nhưng có lỗi xảy ra khi tự động sinh Đơn hàng liên kết!');
            }
          } catch (orderErr) {
            console.error('Lỗi tự động sinh đơn hàng:', orderErr);
            toast.error('Lỗi khi tự động sinh Đơn hàng liên kết cho Tour đoàn riêng!');
          } finally {
            resetForm();
            setShowAddForm(false);
          }
        } else {
          toast.error('Lỗi khi thêm Tour đoàn riêng mới!');
        }
      } else {
        toast.success(`Đã thêm tour ${code} khởi hành mới thành công!`);
        resetForm();
        setShowAddForm(false);
      }
    }
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
    if (!canManageTours) {
      toast.error('Bạn không có quyền xóa tour.');
      return;
    }
    if (currentRole === 'sale_leader' && (!tour.tour_type || tour.tour_type === 'internal')) {
      toast.error('Sale Leader không có quyền xóa Tour tự vận hành.');
      return;
    }
    setDeletingTour(tour);
  };

  const handleConfirmDeleteTour = async () => {
    if (!deletingTour) return;
    try {
      await deleteTour(deletingTour.id);
      toast.success(`Đã xóa tour ${deletingTour.code || ''} ra khỏi cơ sở dữ liệu.`);
    } catch (err) {
      console.error('Lỗi khi xóa tour:', err);
      toast.error('Lỗi khi xóa tour');
    } finally {
      setDeletingTour(null);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {(currentRole === 'admin' || currentRole === 'operator' || currentRole === 'sale_leader') && (
        <DashboardOperator />
      )}

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
                      <span className="font-bold text-gray-900">{order.id}</span>
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

      {/* Header section with Tabs and Actions */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              {currentRole === 'accounting' ? 'Hạch toán Chi phí – Lãi lỗ Tour' : 'Quản lý & Điều hành Tour'}
            </h2>
            <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200">
              {tours.filter(t => t.tour_type !== 'visa').length} tour
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {currentRole === 'accounting'
              ? 'Theo dõi doanh thu, định mức chi phí thực tế, công nợ đối tác và tỷ suất lợi nhuận lãi/lỗ của từng tour.'
              : 'Quản lý lịch khởi hành, điều phối quỹ chỗ, dự toán chi phí và theo dõi tiến độ đoàn.'}
          </p>
        </div>
        
        {currentRole !== 'accounting' && (
          <div className="flex flex-wrap items-center gap-2.5 self-stretch md:self-auto shrink-0">
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1 flex-1 md:flex-initial">
              <button
                onClick={() => setActiveTab('tours')}
                className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'tours' 
                    ? 'bg-white text-blue-700 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Danh sách Tour</span>
              </button>
              {canAccessCosts && (
                <button
                  onClick={() => setActiveTab('costs')}
                  className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'costs' 
                      ? 'bg-white text-blue-700 shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Hạch toán Chi phí – Lãi lỗ</span>
                </button>
              )}
              {canAccessCategories && (
                <button
                  onClick={() => setActiveTab('categories')}
                  className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'categories' 
                      ? 'bg-white text-blue-700 shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>Tuyến / Danh mục ({categories.length})</span>
                </button>
              )}
            </div>

            {(currentRole === 'admin' || currentRole === 'operator') && (
              <button
                type="button"
                onClick={handleBulkSyncToWooCommerce}
                disabled={isBulkSyncing}
                className="inline-flex items-center h-9 px-3.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 shadow-2xs transition-all cursor-pointer whitespace-nowrap"
                title="Đồng bộ toàn bộ danh sách tour sang website WordPress (WooCommerce)"
              >
                <Globe className={`w-3.5 h-3.5 mr-1.5 text-indigo-600 ${isBulkSyncing ? 'animate-spin' : ''}`} />
                <span>{isBulkSyncing ? 'Đang đồng bộ...' : 'Đồng bộ Website'}</span>
              </button>
            )}

            {(currentRole === 'admin' || currentRole === 'operator' || currentRole === 'sale_leader') && (
              <button
                onClick={() => {
                  resetForm();
                  if (filterTourType === 'outsourced') {
                    setTourType('outsourced');
                  } else if (filterTourType === 'private') {
                    setTourType('private');
                  } else {
                    setTourType('internal');
                  }
                  setShowAddForm(true);
                }}
                className="inline-flex items-center h-9 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-sm transition-all cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Tạo Tour Mới
              </button>
            )}
          </div>
        )}
      </div>

      {activeTab === 'categories' ? (
        /* CATEGORIES MANAGEMENT TAB */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs h-fit space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">Tạo Danh Mục Mới</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Tên tuyến / danh mục mới *</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Tuyến Bắc Mỹ, Tuyến Nhật Bản..."
                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-slate-800 placeholder-slate-400"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!newCatName.trim()) return;
                  addCategory(newCatName);
                  setNewCatName('');
                }}
                className="w-full inline-flex items-center justify-center bg-blue-600 text-white text-xs font-bold h-9 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-2xs cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-1.5" /> Thêm danh mục
              </button>
            </div>
          </div>

          <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Danh sách danh mục đang kích hoạt ({categories.length})</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {categories.map(cat => {
                const tourCount = tours.filter(t => t.category === cat).length;
                const isEditingThis = editingCatOldName === cat;

                return (
                  <div key={cat} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                    {isEditingThis ? (
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          className="flex-1 h-8 px-3 border border-blue-400 rounded-lg text-xs font-semibold bg-white"
                          value={editingCatNewName}
                          onChange={e => setEditingCatNewName(e.target.value)}
                        />
                        <button
                          onClick={() => {
                            updateCategory(cat, editingCatNewName);
                            setEditingCatOldName(null);
                          }}
                          className="px-3 h-8 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 cursor-pointer"
                        >
                          Lưu
                        </button>
                        <button
                          onClick={() => setEditingCatOldName(null)}
                          className="px-3 h-8 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-300 cursor-pointer"
                        >
                          Hủy
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2.5">
                          <Tag className="w-4 h-4 text-slate-400" />
                          <span className="font-bold text-slate-800 text-xs">{cat}</span>
                          <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-bold">
                            {tourCount} tour liên kết
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setEditingCatOldName(cat);
                              setEditingCatNewName(cat);
                            }}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                            title="Sửa tên danh mục"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (tourCount > 0) {
                                setCatAlertMessage(`Không thể xóa danh mục này vì đang có ${tourCount} tour liên kết. Vui lòng chuyển đổi danh mục của các tour này trước.`);
                                return;
                              }
                              setCatToDelete(cat);
                            }}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                            title="Xóa danh mục"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (activeTab === 'costs' && canAccessCosts) ? (
        /* TOUR COSTS MANAGEMENT TAB */
        <TourCostsManagement />
      ) : (
        /* TOURS MANAGEMENT TAB */
        <>
          {/* TOUR FORM MODAL (Both Add & Edit) */}
          {(showAddForm || editingTour) && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
                      <Plane className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900">
                        {editingTour ? `Cập Nhật Tour: ${editingTour.code}` : 'Khai Báo Tour Du Lịch Mới'}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {editingTour ? 'Chỉnh sửa thông tin lịch trình, giá bán và cấu hình lưu ý đi tour' : 'Tạo mới hành trình tour và mở bán cho các bộ phận sale, CTV'}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={resetForm}
                    className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="overflow-y-auto p-6 space-y-8 flex-1">
                  <form id="tour-creation-modal-form" onSubmit={handleSubmit} className="space-y-8">
                {/* 1. Basic Info */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                    <Grid className="w-4 h-4 text-blue-600" /> General / Thông tin cơ bản
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">{tourType === 'visa' ? 'Mã visa *' : 'Mã tour *'}</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Ví dụ: THAILAN-5D-ART"
                        className={`w-full h-9 px-3 py-1.5 border rounded-lg text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all uppercase ${isCodeDuplicate ? 'border-red-500 bg-red-50' : 'border-slate-300 bg-white'}`}
                        value={code}
                        onChange={e => setCode(e.target.value.toUpperCase())}
                      />
                      {isCodeDuplicate && <p className="text-red-500 text-xs mt-1 font-semibold">{tourType === 'visa' ? 'Mã visa này đã tồn tại!' : 'Mã tour này đã tồn tại!'}</p>}
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-xs font-semibold text-slate-600 mb-1">{tourType === 'visa' ? 'Tên visa *' : 'Tên tour *'}</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Ví dụ: [SÀI GÒN] THÁI LAN: BANGKOK - PATTAYA..."
                        className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all uppercase"
                        value={name}
                        onChange={e => setName(e.target.value.toUpperCase())}
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Điểm đến / Quốc gia *</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Ví dụ: Thái Lan, Châu Âu..."
                        className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        value={destination}
                        onChange={e => setDestination(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Loại hình sản phẩm *</label>
                      <CustomSelect
                        options={[
                          ...(currentRole !== 'sale_leader' ? [{ value: 'internal', label: 'AD Tự vận hành' }] : []),
                          { value: 'outsourced', label: 'Gửi khách đối tác-F2' },
                          { value: 'private', label: 'Tour đoàn riêng' },
                        ]}
                        value={tourType}
                        onChange={val => setTourType(val as any)}
                        className="w-full"
                        buttonClassName="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
                      />
                    </div>

                    <div className="md:col-span-4 bg-indigo-50/60 p-3.5 rounded-xl border border-indigo-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Globe className="w-4 h-4 text-indigo-600 shrink-0" />
                          <label className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                            Mã SKU Sản Phẩm Website (WooCommerce)
                          </label>
                          {code && !wpProductSku && (
                            <button
                              type="button"
                              onClick={() => setWpProductSku(extractSkuPrefix(code))}
                              className="text-[11px] font-bold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                              title="Tự động bóc tách tiền tố SKU từ Mã Tour"
                            >
                              Gợi ý: {extractSkuPrefix(code)} (Bấm để gán)
                            </button>
                          )}
                        </div>
                        <p className="text-[11px] text-indigo-700 leading-relaxed">
                          Mã SKU chung của chương trình tour trên website (VD: <strong className="font-mono">OBAU-SYDMEL-JQ</strong>). Tất cả các ngày khởi hành có cùng SKU này sẽ tự động gom về cùng 1 sản phẩm WooCommerce cha và cập nhật vào bảng lịch trình ACF.
                        </p>
                      </div>
                      <div className="w-full sm:w-64 shrink-0">
                        <input
                          type="text"
                          placeholder={code ? extractSkuPrefix(code) : 'Ví dụ: OBAU-SYDMEL-JQ'}
                          className="w-full h-9 px-3 py-1.5 border border-indigo-300 rounded-lg text-xs font-mono font-bold text-indigo-900 bg-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 uppercase"
                          value={wpProductSku}
                          onChange={e => setWpProductSku(e.target.value.toUpperCase())}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Tour Type Specific Fields */}
                  {tourType !== 'internal' && (
                    <div className={`p-4 rounded-xl border animate-in fade-in slide-in-from-top-2 duration-200 mt-4 ${
                      tourType === 'outsourced' || tourType === 'partner' ? 'bg-indigo-50/50 border-indigo-200 text-indigo-900' :
                      tourType === 'private' ? 'bg-amber-50/40 border-amber-200 text-amber-900' :
                      'bg-purple-50/40 border-purple-200 text-purple-900'
                    }`}>
                      <h5 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        {(tourType === 'outsourced' || tourType === 'partner') && <><Handshake className="w-4 h-4 text-indigo-600" /> Thông tin Gửi khách đối tác-F2</>}
                        {tourType === 'private' && <><Crown className="w-4 h-4 text-amber-600" /> Thông tin Yêu cầu Tour đoàn riêng / Custom</>}
                        {tourType === 'visa' && <><FileText className="w-4 h-4 text-purple-600" /> Thông tin Dịch vụ Visa lẻ đặc thù</>}
                      </h5>

                      {(tourType === 'outsourced' || tourType === 'partner') && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1">Tên công ty đối tác vận hành *</label>
                              <input
                                type="text"
                                required
                                placeholder="Ví dụ: Saigontourist, Vietravel..."
                                className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 font-bold placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                value={partnerCompanyName || partnerName}
                                onChange={e => {
                                  setPartnerCompanyName(e.target.value);
                                  setPartnerName(e.target.value);
                                }}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1">Thông tin liên hệ đối tác (SĐT/Người phụ trách) *</label>
                              <input
                                type="text"
                                required
                                placeholder="Ví dụ: Anh Nam - 0987xxxxxx"
                                className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 font-semibold placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                value={partnerContact}
                                onChange={e => setPartnerContact(e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <NumericFormatInput
                                label="Giá bán niêm yết của Đối tác (VNĐ/Khách) *"
                                required
                                value={partnerRetailPrice}
                                onChange={(val) => {
                                  setPartnerRetailPrice(val);
                                  updateNetCost(val, partnerCommission);
                                }}
                                placeholder="Ví dụ: 29.000.000"
                                labelClassName="block text-xs font-semibold text-slate-600 mb-1"
                                inputClassName="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 font-bold placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                              />
                            </div>
                            <div>
                              <NumericFormatInput
                                label="Hoa hồng đối tác chiết khấu cho AD (VNĐ/Khách) *"
                                required
                                value={partnerCommission}
                                onChange={(val) => {
                                  setPartnerCommission(val);
                                  updateNetCost(partnerRetailPrice, val);
                                }}
                                placeholder="Ví dụ: 2.000.000"
                                labelClassName="block text-xs font-semibold text-slate-600 mb-1"
                                inputClassName="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 font-bold placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                              />
                              <p className="text-xs text-blue-700 font-medium mt-1.5 flex items-center gap-1 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-md">
                                <ArrowRight className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                <span>Giá net AD phải nộp cho đối tác: <strong className="font-extrabold text-blue-800">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(partnerNetCost) || 0)}</strong> / Khách</span>
                              </p>
                            </div>
                          </div>

                          {/* Badge Preview for AD Commission */}
                          <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 flex items-center justify-between text-xs shadow-2xs">
                            <div className="flex items-center gap-2">
                              <span className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-black text-sm">
                                <Coins className="w-4 h-4 text-white" />
                              </span>
                              <div>
                                <span className="text-emerald-950 font-extrabold block text-xs">
                                  Hoa hồng AD hưởng (Chênh lệch Giá Niêm Yết - Giá Net)
                                </span>
                                <span className="text-emerald-700 text-[11px]">
                                  Tự động hạch toán cho mỗi suất khách đặt qua hệ thống
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-xs text-emerald-800 font-medium block">Lợi nhuận gộp / khách:</span>
                              <span className="text-base font-black text-emerald-700">
                                +{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                                  Math.max(0, (Number(partnerRetailPrice) || 0) - (Number(partnerNetCost) || 0))
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {tourType === 'private' && (
                        <div className="space-y-6">
                          <div className="bg-amber-50/20 p-4 rounded-xl border border-amber-200/50 space-y-4">
                            <div className="flex items-center gap-2 text-amber-800">
                              <Lightbulb className="w-4 h-4 text-amber-600 shrink-0" />
                              <p className="text-xs font-medium leading-relaxed">
                                <strong>Bản chất nghiệp vụ:</strong> Tour đoàn riêng là 1 Booking trọn gói (1 Tour = 1 Đơn hàng duy nhất). Hệ thống sẽ <strong>TỰ ĐỘNG sinh 1 Đơn hàng (Booking) tương ứng</strong> trong database ngay khi bấm lưu để lược bỏ toàn bộ các bước đặt chỗ, giữ chỗ thủ công phức tạp.
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-blue-600" /> Tên cơ quan / Doanh nghiệp / Đoàn khách *
                              </label>
                              <div className="relative">
                                <input
                                  type="text"
                                  required
                                  placeholder="Ví dụ: Công ty Techcombank - CN Sài Gòn"
                                  className="w-full h-9 pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 font-semibold placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                  value={privateCustomerName}
                                  onChange={e => {
                                    setPrivateCustomerName(e.target.value);
                                    setOrganizationName(e.target.value);
                                  }}
                                />
                                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5 text-blue-600" /> Đại diện liên hệ (SĐT) *
                              </label>
                              <div className="relative">
                                <input
                                  type="text"
                                  required
                                  placeholder="Ví dụ: Chị Lan Anh - 0912345678"
                                  className="w-full h-9 pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 font-semibold placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                  value={privateCustomerPhone}
                                  onChange={e => {
                                    setPrivateCustomerPhone(e.target.value);
                                    setGroupLeaderContact(e.target.value);
                                  }}
                                />
                                <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <Mail className="w-3.5 h-3.5 text-blue-600" /> Email nhận thông tin hợp đồng
                              </label>
                              <div className="relative">
                                <input
                                  type="email"
                                  placeholder="Ví dụ: lananh@techcombank.com.vn"
                                  className="w-full h-9 pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 font-semibold placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                  value={privateCustomerEmail}
                                  onChange={e => {
                                    setPrivateCustomerEmail(e.target.value);
                                    setCustomRequirements(e.target.value ? `Email: ${e.target.value}` : '');
                                  }}
                                />
                                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div>
                              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5 text-blue-600" /> Số lượng khách chốt (Pax) *
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  required
                                  min="1"
                                  placeholder="Ví dụ: 35"
                                  className="w-full h-9 pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 font-bold placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                  value={privatePaxCount}
                                  onChange={e => setPrivatePaxCount(e.target.value !== '' ? Number(e.target.value) : '')}
                                />
                                <Users className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                              </div>
                              <p className="text-[11px] text-gray-400 mt-1">Số lượng khách thực tế tham gia để tính toán giá bình quân.</p>
                            </div>

                            <div>
                              <NumericFormatInput
                                label="Tổng giá trị hợp đồng trọn gói (VNĐ) *"
                                required
                                value={privateTotalAmount}
                                onChange={setPrivateTotalAmount}
                                placeholder="Ví dụ: 250.000.000"
                                labelClassName="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5"
                                inputClassName="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 font-extrabold placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                              />
                              <p className="text-[11px] text-gray-400 mt-1">Tổng tiền ghi nhận trên hợp đồng ký kết với khách hàng.</p>
                            </div>

                            <div>
                              <NumericFormatInput
                                label="Hoa hồng trích thưởng/chiết khấu (VNĐ)"
                                value={commission}
                                onChange={setCommission}
                                placeholder="Ví dụ: 5.000.000"
                                labelClassName="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5"
                                inputClassName="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-emerald-700 font-bold placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                              />
                              <p className="text-[11px] text-gray-400 mt-1">Hoa hồng dành cho đại lý, Sale hoặc giới thiệu đoàn.</p>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <UploadCloud className="w-3.5 h-3.5 text-blue-600" /> Đính kèm Hợp đồng / Chương trình Tour
                              </label>
                              <div className="flex gap-2">
                                <div className="flex-1">
                                  <label className={`w-full flex flex-col items-center justify-center border border-dashed rounded-lg cursor-pointer transition-all p-2 bg-white ${
                                    privateContractFileUrl ? 'border-emerald-300 hover:border-emerald-400 bg-emerald-50/10' : 'border-gray-300 hover:border-blue-400'
                                  }`}>
                                    <div className="flex items-center gap-1.5">
                                      {isUploadingContract ? (
                                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                      ) : privateContractFileUrl ? (
                                        <span className="text-emerald-600 text-xs font-bold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Đã tải file</span>
                                      ) : (
                                        <span className="text-gray-500 text-xs font-medium">Chọn tệp đính kèm</span>
                                      )}
                                    </div>
                                    <input 
                                      type="file" 
                                      className="hidden" 
                                      onChange={handlePrivateContractUpload}
                                    />
                                  </label>
                                </div>
                                {privateContractFileUrl && (
                                  <a 
                                    href={privateContractFileUrl} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="p-2 border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg flex items-center justify-center transition-colors shadow-2xs"
                                    title="Xem file hợp đồng"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </a>
                                )}
                              </div>
                              {contractUploadError && (
                                <p className="text-[10px] font-semibold text-rose-600 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" /> {contractUploadError}</p>
                              )}
                              <p className="text-[11px] text-gray-400 mt-1">Lưu trữ file chương trình/hợp đồng trực tiếp trên server.</p>
                            </div>
                          </div>

                          {privatePaxCount !== '' && privateTotalAmount !== '' && Number(privatePaxCount) > 0 && (
                            <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border border-blue-100 flex items-center justify-between text-xs shadow-2xs">
                              <div className="flex items-center gap-2">
                                <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                                  <BarChart3 className="w-4 h-4 text-white" />
                                </span>
                                <div>
                                  <span className="text-slate-900 font-extrabold block text-xs">
                                    Hạch toán nội bộ tự động:
                                  </span>
                                  <span className="text-slate-500 text-[11px]">
                                    Giá bình quân đầu người để lập hóa đơn và theo dõi lãi/lỗ
                                  </span>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-xs text-slate-500 font-medium block">Giá Net / Pax (Bình quân):</span>
                                <span className="text-base font-extrabold text-blue-700">
                                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                                    Math.round(Number(privateTotalAmount) / Number(privatePaxCount))
                                  )}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">{tourType === 'visa' ? 'Thời gian xử lý *' : 'Thời gian hành trình *'}</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Ví dụ: 5 ngày 4 đêm"
                        className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
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
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Danh mục sản phẩm *</label>
                      
                      {showInlineCatForm ? (
                        <div className="flex gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
                          <input
                            type="text"
                            placeholder="Nhập tên danh mục mới..."
                            className="flex-1 h-9 px-3 py-1.5 border border-blue-400 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white"
                            value={inlineCatName}
                            onChange={e => setInlineCatName(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddInlineCategory();
                              }
                            }}
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={handleAddInlineCategory}
                            className="h-9 px-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer shrink-0"
                          >
                            Thêm
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowInlineCatForm(false);
                              setInlineCatName('');
                            }}
                            className="h-9 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-xs transition-colors cursor-pointer shrink-0"
                          >
                            Hủy
                          </button>
                        </div>
                      ) : (
                        <div className="relative">
                          <CustomSelect 
                            options={[
                              ...categories.map(cat => ({ value: cat, label: cat })),
                              { value: '__ADD_NEW_CAT__', label: '+ Tạo danh mục mới...' }
                            ]}
                            value={category}
                            onChange={val => {
                              if (val === '__ADD_NEW_CAT__') {
                                setShowInlineCatForm(true);
                                setInlineCatName('');
                              } else {
                                setCategory(val);
                              }
                            }}
                            className="w-full"
                            buttonClassName="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Airline, Hotel, PDF Itinerary */}
                {tourType !== 'visa' && tourType !== 'private' && (
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 pb-1.5 flex items-center gap-1.5">
                    <Plane className="w-4 h-4 text-emerald-600" /> Logistics & Lịch Trình PDF
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Hãng hàng không</label>
                      <input 
                        type="text" 
                        placeholder="Vietnam Airlines, Vietjet..."
                        className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        value={airline}
                        onChange={e => setAirline(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Tiêu chuẩn Khách sạn</label>
                      <input 
                        type="text" 
                        placeholder="Khách sạn 4 sao, Resort 5 sao..."
                        className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        value={hotel}
                        onChange={e => setHotel(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1.5">
                        <Folder className="w-3.5 h-3.5 text-blue-600" /> Lịch trình chi tiết (File PDF)
                        <HelpCircle className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                      </label>
                      
                      {isUploadingItinerary ? (
                        <div className="flex flex-col items-center justify-center border-2 border-dashed border-blue-300 bg-blue-50/30 rounded-xl p-4 text-center">
                          <div className="w-8 h-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin mb-2" />
                          <p className="text-xs font-semibold text-blue-700">Đang tải file lên hệ thống...</p>
                          <p className="text-[10px] text-blue-500 mt-1">Đang đồng bộ và sắp xếp vào thư mục Drive...</p>
                        </div>
                      ) : itineraryPdfUrl ? (
                        <div className="p-3 border border-emerald-200 bg-emerald-50/40 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-700">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-emerald-800 truncate" title={itineraryPdfUrl}>
                                {code ? `${code.trim().toUpperCase()}.pdf` : 'Lich_trinh.pdf'}
                              </p>
                              <a 
                                href={itineraryPdfUrl} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-[11px] text-blue-600 hover:underline font-semibold flex items-center gap-1 mt-0.5"
                              >
                                Xem tài liệu <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                          
                          <label className="cursor-pointer bg-white border border-gray-300 hover:bg-gray-50 text-slate-700 font-bold text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm">
                            Thay đổi
                            <input 
                              type="file" 
                              accept=".pdf,application/pdf" 
                              className="hidden" 
                              onChange={handleItineraryUpload}
                            />
                          </label>
                        </div>
                      ) : (
                        <label className={`group cursor-pointer flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-4 text-center transition-all ${
                          code.trim() 
                            ? 'border-gray-300 bg-white hover:border-blue-500 hover:bg-blue-50/10' 
                            : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                        }`}>
                          <UploadCloud className={`w-8 h-8 mb-2 transition-colors ${
                            code.trim() ? 'text-gray-400 group-hover:text-blue-500' : 'text-gray-300'
                          }`} />
                          <p className="text-xs font-bold text-gray-700">
                            {code.trim() ? 'Kéo thả hoặc click để tải lên tệp PDF' : 'Vui lòng nhập Mã Tour trước'}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-1">
                            {code.trim() ? 'Chỉ chấp nhận file định dạng PDF' : 'Để hệ thống đặt tên file theo mã tour'}
                          </p>
                          {code.trim() && (
                            <input 
                              type="file" 
                              accept=".pdf,application/pdf" 
                              className="hidden" 
                              onChange={handleItineraryUpload}
                            />
                          )}
                        </label>
                      )}
                      
                      {itineraryUploadError && (
                        <p className="text-xs font-semibold text-rose-600 mt-1.5 flex items-center gap-1 bg-rose-50 border border-rose-100 p-2 rounded-lg">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" /> {itineraryUploadError}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                )}

                {/* 3. Numeric inputs with dynamic thousands separator formatting */}
                {tourType !== 'private' && (
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 pb-1.5 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-rose-600" /> Biểu giá & Hoa hồng
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <NumericFormatInput
                        label={tourType === 'visa' ? "Giá visa (VND) *" : "Giá Tour niêm yết (VND) *"}
                        required
                        value={price}
                        onChange={handlePriceChange}
                      />
                      <NumericFormatInput
                        label="Giảm giá tour (VND)"
                        value={discount}
                        onChange={handleDiscountChange}
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
                          placeholder={price ? `Mặc định: ${new Intl.NumberFormat('vi-VN').format(Number(price) - Number(discount || 0))}` : 'Như giá tour'}
                        />
                        <NumericFormatInput
                          label="Giá trẻ em (2-10T)"
                          value={priceChild}
                          onChange={setPriceChild}
                          placeholder={price ? `Mặc định: ${new Intl.NumberFormat('vi-VN').format(Math.round((Number(price) - Number(discount || 0)) * 0.8))}` : '80% giá tour'}
                        />
                        <NumericFormatInput
                          label="Giá trẻ nhỏ (<2T)"
                          value={priceInfant}
                          onChange={setPriceInfant}
                          placeholder={price ? `Mặc định: ${new Intl.NumberFormat('vi-VN').format(Math.round((Number(price) - Number(discount || 0)) * 0.3))}` : '30% giá tour'}
                        />
                        <NumericFormatInput
                          label="Phụ thu phòng đơn"
                          value={singleRoomSurcharge}
                          onChange={setPriceInfant}
                          placeholder="Mặc định: 7.500.000"
                        />
                      </div>
                    </div>
                  )}
                  </div>
                )}

                {/* 4. Seats & Holds */}
                {tourType !== 'visa' && tourType !== 'private' && (
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 pb-1.5 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-purple-600" /> Quỹ Chỗ & Quy Định Hold
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Tổng số chỗ mở bán *</label>
                      <input 
                        type="number" 
                        required
                        className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        value={totalSeats}
                        onChange={e => setTotalSeats(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Overbooking cho phép</label>
                      <input 
                        type="number" 
                        min="0"
                        placeholder="Mặc định: 0"
                        className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        value={overbookLimit}
                        onChange={e => setOverbookLimit(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Mặc định Hold (Giờ) *</label>
                      <input 
                        type="number" 
                        required
                        className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
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
                    <VietnameseDateTimePicker
                      label="Hạn xuất vé"
                      showTime={false}
                      value={ticketDeadline}
                      onChange={setTicketDeadline}
                    />
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Trạng thái mở bán</label>
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
                        buttonClassName="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
                )}

                {/* Flight numbers / transit details */}
                {tourType !== 'visa' && tourType !== 'private' && (
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
                          className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                          value={flightOut}
                          onChange={e => setFlightOut(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Chặng bay đi tiếp theo (Quá cảnh)</label>
                        <input 
                          type="text" 
                          placeholder="VD: QR039 DOH - CDG 01:25 - 07:25"
                          className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
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
                          className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                          value={flightIn}
                          onChange={e => setFlightIn(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Chặng bay về tiếp theo (Quá cảnh)</label>
                        <input 
                          type="text" 
                          placeholder="VD: QR970 DOH - SGN 02:35 - 14:25"
                          className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
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
                        className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        value={transitInfo}
                        onChange={e => setTransitInfo(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Tình trạng vé đoàn</label>
                      <input 
                        type="text" 
                        placeholder="CHỜ XUẤT VÉ, ĐÃ CHỐT XUẤT VÉ..."
                        className="w-full h-9 px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-500 cursor-not-allowed font-semibold"
                        value={ticketStatus}
                        readOnly
                        title="Tình trạng vé được cập nhật tự động dựa trên hạn xuất vé"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Hướng dẫn viên trưởng đoàn</label>
                      <input 
                        type="text" 
                        placeholder="Họ tên HDV"
                        className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        value={guideName}
                        onChange={e => setGuideName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Số điện thoại liên hệ HDV</label>
                      <input 
                        type="text" 
                        placeholder="Số điện thoại"
                        className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        value={guidePhone}
                        onChange={e => setGuidePhone(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                )}

                {/* 5. VISUAL TRAVEL NOTES & DISCLAIMER BUILDER (identical to screenshot format) */}
                {tourType !== 'private' && (
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
                            className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-blue-800 bg-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
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
                                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-emerald-800 bg-slate-50 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
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
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs leading-relaxed text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
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
                )}

                {/* Submit Center */}
                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                  <button 
                    type="button"
                    onClick={resetForm}
                    className="h-9 px-4 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 bg-white transition-all cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button 
                    type="submit"
                    disabled={isCodeDuplicate}
                    className={`h-9 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center justify-center cursor-pointer ${isCodeDuplicate ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {editingTour ? 'Cập Nhật Tour' : (tourType === 'private' ? 'Lưu hợp đồng & Khởi tạo đoàn' : 'Lưu & Đăng Bán')}
                  </button>
                </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* COMPACT SUMMARY METRICS STRIP */}
          <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-4 divide-x divide-slate-100 text-xs font-semibold text-slate-600 overflow-x-auto w-full lg:w-auto">
              <div className="flex items-center gap-1.5 pr-2">
                <span className="text-slate-400">Tổng tour:</span>
                <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                  {tours.filter(t => t.tour_type !== 'visa').length}
                </span>
              </div>
              <div className="flex items-center gap-1.5 pl-2 sm:pl-4 pr-2">
                <span className="text-slate-400">Tổng chỗ:</span>
                <span className="font-bold text-purple-700 bg-purple-50 border border-purple-200/80 px-2 py-0.5 rounded-md">
                  {tours.filter(t => t.tour_type !== 'visa').reduce((sum, t) => sum + (t.total_seats || t.available_seats || 0), 0)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 pl-2 sm:pl-4 pr-2">
                <span className="text-slate-400">Đã bán:</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md">
                  {tours.filter(t => t.tour_type !== 'visa').reduce((sum, t) => sum + t.sold_seats, 0)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 pl-2 sm:pl-4 pr-2">
                <span className="text-slate-400">Giữ tạm:</span>
                <span className="font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md">
                  {tours.filter(t => t.tour_type !== 'visa').reduce((sum, t) => sum + t.hold_seats, 0)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 pl-2 sm:pl-4">
                <span className="text-slate-400">Còn trống:</span>
                <span className="font-bold text-blue-700 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-md">
                  {tours.filter(t => t.tour_type !== 'visa').reduce((sum, t) => sum + t.available_seats, 0)}
                </span>
              </div>
            </div>

            {/* Quick count of currently filtered tours */}
            <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Hiển thị: <strong className="text-slate-900 font-bold">{displayTours.length}</strong> tour khả dụng</span>
            </div>
          </div>

          {/* UNIFIED COMPACT FILTER TOOLBAR */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-3 space-y-3">
            {/* Top Row: Tour Type Segmented Tabs + Time Status Filter Tabs */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
              {/* 1. Tour Type Segmented Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200/80">
                {/* Tất cả */}
                <button
                  type="button"
                  onClick={() => setFilterTourType('all')}
                  className={`px-3 h-8 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    filterTourType === 'all'
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5 text-slate-500" />
                  <span>Tất cả loại tour</span>
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
                    filterTourType === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {tours.filter(t => t.tour_type !== 'visa').length}
                  </span>
                </button>

                {/* AD Tự vận hành */}
                <button
                  type="button"
                  onClick={() => setFilterTourType('internal')}
                  className={`px-3 h-8 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    filterTourType === 'internal'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-purple-700 hover:bg-purple-50'
                  }`}
                >
                  <Building2 className={`w-3.5 h-3.5 ${filterTourType === 'internal' ? 'text-purple-200' : 'text-purple-600'}`} />
                  <span>AD Tự vận hành</span>
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
                    filterTourType === 'internal' ? 'bg-purple-800 text-purple-100' : 'bg-purple-100 text-purple-700'
                  }`}>
                    {tours.filter(t => (t.tour_type === 'internal' || !t.tour_type) && t.tour_type !== 'visa').length}
                  </span>
                </button>

                {/* Gửi khách đối tác */}
                <button
                  type="button"
                  onClick={() => setFilterTourType('outsourced')}
                  className={`px-3 h-8 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    filterTourType === 'outsourced'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50'
                  }`}
                >
                  <Handshake className={`w-3.5 h-3.5 ${filterTourType === 'outsourced' ? 'text-blue-200' : 'text-blue-600'}`} />
                  <span>Gửi khách đối tác</span>
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
                    filterTourType === 'outsourced' ? 'bg-blue-800 text-blue-100' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {tours.filter(t => (t.tour_type === 'outsourced' || (t.tour_type as string) === 'partner')).length}
                  </span>
                </button>

                {/* Đoàn riêng */}
                <button
                  type="button"
                  onClick={() => setFilterTourType('private')}
                  className={`px-3 h-8 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    filterTourType === 'private'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-amber-700 hover:bg-amber-50'
                  }`}
                >
                  <Crown className={`w-3.5 h-3.5 ${filterTourType === 'private' ? 'text-amber-200' : 'text-amber-600'}`} />
                  <span>Đoàn riêng</span>
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
                    filterTourType === 'private' ? 'bg-amber-800 text-amber-100' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {tours.filter(t => t.tour_type === 'private').length}
                  </span>
                </button>
              </div>

              {/* 2. Time Status Filter Tabs */}
              <div className="flex bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 shrink-0 items-center">
                <button
                  type="button"
                  onClick={() => setFilterTimeStatus('upcoming')}
                  className={`px-3 h-8 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    filterTimeStatus === 'upcoming'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Đang mở bán</span>
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
                    filterTimeStatus === 'upcoming' ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {baseToursForTimeFilter.filter(t => !t.departure_time || new Date(t.departure_time) >= todayStart).length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterTimeStatus('departed')}
                  className={`px-3 h-8 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    filterTimeStatus === 'departed'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  <Folder className="w-3.5 h-3.5 text-slate-400" />
                  <span>Đã khởi hành</span>
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
                    filterTimeStatus === 'departed' ? 'bg-slate-700 text-slate-200' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {baseToursForTimeFilter.filter(t => t.departure_time && new Date(t.departure_time) < todayStart).length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterTimeStatus('all')}
                  className={`px-3 h-8 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    filterTimeStatus === 'all'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5 text-blue-300" />
                  <span>Tất cả thời gian</span>
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
                    filterTimeStatus === 'all' ? 'bg-blue-700 text-blue-100' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {baseToursForTimeFilter.length}
                  </span>
                </button>
              </div>
            </div>

            {/* Bottom Row: Search Bar + Month Dropdown + Category Dropdown + Reset Filter Button */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-center">
              {/* Search Input - 6 cols */}
              <div className="relative lg:col-span-6">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm mã tour, tên hành trình, điểm đến..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full h-9.5 pl-9 pr-8 py-1.5 text-xs font-semibold border border-slate-200 rounded-xl bg-slate-50/70 hover:bg-white text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-2xs"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Month filter dropdown - 3 cols */}
              <div className="relative lg:col-span-3">
                <CustomSelect
                  options={[
                    { value: 'all', label: 'Tất cả tháng khởi hành' },
                    ...availableMonths.map(m => {
                      const [year, month] = m.split('-');
                      return {
                        value: m,
                        label: `Tháng ${month}/${year}`
                      };
                    })
                  ]}
                  value={filterMonth}
                  onChange={setFilterMonth}
                  icon={<Calendar className="w-3.5 h-3.5" />}
                  className="w-full"
                  buttonClassName="w-full h-9.5 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-xl bg-slate-50/70 hover:bg-white text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer shadow-2xs"
                />
              </div>

              {/* Category filter dropdown - 3 cols (or span-2 if reset active) */}
              <div className={`relative ${searchTerm || filterMonth !== 'all' || filterCategory !== 'all' || filterTimeStatus !== 'upcoming' || filterTourType !== 'all' ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
                <CustomSelect
                  options={[
                    { value: 'all', label: 'Tất cả danh mục thị trường' },
                    ...categories.map(c => ({
                      value: c,
                      label: c
                    }))
                  ]}
                  value={filterCategory}
                  onChange={setFilterCategory}
                  icon={<Tag className="w-3.5 h-3.5" />}
                  className="w-full"
                  buttonClassName="w-full h-9.5 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-xl bg-slate-50/70 hover:bg-white text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer shadow-2xs"
                />
              </div>

              {/* Reset filters button if any filter is active */}
              {(searchTerm || filterMonth !== 'all' || filterCategory !== 'all' || filterTimeStatus !== 'upcoming' || filterTourType !== 'all') && (
                <div className="lg:col-span-1">
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setFilterMonth('all');
                      setFilterCategory('all');
                      setFilterTimeStatus('upcoming');
                      setFilterTourType('all');
                    }}
                    title="Xóa tất cả bộ lọc đang chọn"
                    className="w-full h-9.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer shadow-2xs whitespace-nowrap"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Xóa lọc</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* LIST OF ACTIVE TOURS WITH FULL CRUD OPERATIONS */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200/80 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  Danh sách điều phối chỗ & Lịch trình
                  <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {filterTourType === 'all' ? 'Tất cả' : filterTourType === 'internal' ? 'AD Tự vận hành' : filterTourType === 'outsourced' ? 'Gửi khách đối tác' : 'Đoàn riêng'}
                  </span>
                </h3>
                <span className="text-xs text-slate-500 mt-0.5 block">
                  Quản lý ngày khởi hành, quỹ chỗ và điều phối tour thuộc phân loại {filterTourType === 'all' ? 'tất cả các loại tour' : filterTourType === 'internal' ? 'AD Tự vận hành' : filterTourType === 'outsourced' ? 'Gửi khách đối tác' : 'Đoàn riêng'}.
                </span>
              </div>

              <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
                {/* View mode toggle switcher: Danh sách thẻ vs Danh sách bảng */}
                <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 shrink-0 h-9 items-center">
                  <button
                    type="button"
                    onClick={() => setViewMode('grouped')}
                    className={`px-3 h-7 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      viewMode === 'grouped' 
                        ? 'bg-white text-blue-700 shadow-sm' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5 text-blue-600" /> Danh sách thẻ
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('flat')}
                    className={`px-3 h-7 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      viewMode === 'flat' 
                        ? 'bg-white text-blue-700 shadow-sm' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <List className="w-3.5 h-3.5 text-purple-600" /> Danh sách bảng
                  </button>
                </div>

                {!showAddForm && !editingTour && (currentRole === 'admin' || currentRole === 'operator' || currentRole === 'sale_leader') && (
                  <button 
                    onClick={() => {
                      resetForm();
                      if (filterTourType === 'outsourced') {
                        setTourType('outsourced');
                      } else if (filterTourType === 'private') {
                        setTourType('private');
                      } else {
                        setTourType('internal');
                      }
                      setShowAddForm(true);
                    }}
                    className="inline-flex items-center h-9 px-4 border border-transparent shadow-xs text-xs font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Thêm {filterTourType === 'outsourced' ? 'Tour Gửi Đối Tác' : filterTourType === 'private' ? 'Tour Đoàn Riêng' : 'Tour Mới'}
                  </button>
                )}
              </div>
            </div>

            {viewMode === 'grouped' ? (
              <div className="p-6 space-y-6">
                {totalGroupItems === 0 ? (
                  <div className="text-center py-12 text-xs text-slate-400 font-semibold">Không tìm thấy tour du lịch nào phù hợp với bộ lọc hiện tại.</div>
                ) : (
                  paginatedGroupEntries.map(([groupName, groupToursList]) => {
                    const groupTours = groupToursList as Tour[];
                    const isExpanded = expandedGroups[groupName];
                    const firstTour = groupTours[0];
                    const totalSold = groupTours.reduce((sum, t) => sum + t.sold_seats, 0);
                    const totalHold = groupTours.reduce((sum, t) => sum + t.hold_seats, 0);
                    const totalSeatsSum = groupTours.reduce((sum, t) => sum + t.total_seats, 0);

                    return (
                      <div key={groupName} className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white hover:border-slate-300 transition-all duration-200">
                        {/* Group Header (Accordion toggle) */}
                        <div 
                          onClick={() => toggleGroup(groupName)}
                          className="bg-slate-50/80 hover:bg-slate-100/90 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none transition-colors border-b border-slate-200/80"
                        >
                          <div className="space-y-1.5 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                                {firstTour.category || 'Chưa phân mục'}
                              </span>
                              <span className="text-xs font-semibold text-slate-600 flex items-center">
                                <Plane className="w-3.5 h-3.5 mr-1 text-slate-400" />
                                {firstTour.airline}
                              </span>
                              <span className="text-xs font-semibold text-slate-600 flex items-center">
                                <Building className="w-3.5 h-3.5 mr-1 text-slate-400" />
                                {firstTour.hotel}
                              </span>
                              {firstTour.itinerary_pdf_url && (
                                <span className="text-xs font-bold text-emerald-700 flex items-center bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                  <FileText className="w-3.5 h-3.5 mr-1" />
                                  LỊCH TRÌNH PDF
                                </span>
                              )}
                            </div>
                            <h4 className="text-base font-bold text-slate-900 leading-snug uppercase tracking-wide">
                              {groupName}
                            </h4>
                            <div className="text-xs text-slate-600 font-medium flex flex-wrap items-center gap-x-3 gap-y-1">
                              <span>Thời lượng: <strong className="text-slate-900 font-semibold">{firstTour.duration}</strong></span>
                              <span className="text-slate-300">|</span>
                              <span>Chuỗi gồm: <strong className="text-blue-700 font-bold">{groupTours.length} {firstTour.tour_type === 'visa' ? 'phiên bản' : 'đợt khởi hành'}</strong></span>
                              {firstTour.tour_type !== 'visa' && (
                                <>
                                  <span className="text-slate-300">|</span>
                                  <span>Đã bán chuỗi: <strong className="text-emerald-700 font-bold">{totalSold}</strong> — Giữ chỗ: <strong className="text-amber-700 font-bold">{totalHold}</strong> — Trống: <strong className="text-slate-800 font-bold">{totalSeatsSum - totalSold - totalHold}</strong></span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 self-end md:self-auto" onClick={e => e.stopPropagation()}>
                            {/* Quick Add Departure button */}
                            {canManageTours && firstTour.tour_type !== 'visa' && firstTour.tour_type !== 'private' && (
                              <button
                                type="button"
                                onClick={() => handleAddDepartureQuick(firstTour)}
                                disabled={currentRole === 'sale_leader' && (!firstTour.tour_type || firstTour.tour_type === 'internal')}
                                className={`inline-flex items-center h-9 px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                                  currentRole === 'sale_leader' && (!firstTour.tour_type || firstTour.tour_type === 'internal')
                                    ? 'opacity-40 cursor-not-allowed'
                                    : ''
                                }`}
                              >
                                <Plus className="w-3.5 h-3.5 mr-1.5" />
                                Thêm ngày đi mới
                              </button>
                            )}

                            {/* Bulk Create Series button */}
                            {canManageTours && firstTour.tour_type !== 'visa' && firstTour.tour_type !== 'private' && (
                              <button
                                type="button"
                                onClick={() => handleOpenBulkModal(firstTour)}
                                disabled={currentRole === 'sale_leader' && (!firstTour.tour_type || firstTour.tour_type === 'internal')}
                                className={`inline-flex items-center h-9 px-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                                  currentRole === 'sale_leader' && (!firstTour.tour_type || firstTour.tour_type === 'internal')
                                    ? 'opacity-40 cursor-not-allowed'
                                    : ''
                                }`}
                              >
                                <Grid className="w-3.5 h-3.5 mr-1.5" />
                                Tạo hàng loạt (Series)
                              </button>
                            )}

                            {/* Collapse/Expand indicator */}
                            <button
                              type="button"
                              onClick={() => toggleGroup(groupName)}
                              className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/60 transition-colors"
                            >
                              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>

                        {/* Group Content: Departure Dates Table */}
                        {isExpanded && (
                          <div className="overflow-x-auto border-t border-slate-200 bg-white">
                            <table className="min-w-full divide-y divide-slate-200">
                              <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                <tr>
                                  <th className="px-5 py-3 text-left">Mã & Loại Tour</th>
                                  <th className="px-5 py-3 text-left">Khởi Hành</th>
                                  <th className="px-5 py-3 text-right">Giá Người Lớn</th>
                                  <th className="px-5 py-3 text-center">Tình Trạng Quỹ Chỗ</th>
                                  <th className="px-5 py-3 text-center w-28">Thao Tác</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                                {groupTours.map(t => {
                                  const depDate = new Date(t.departure_time || t.start_date || '');
                                  const isDeparted = !isNaN(depDate.getTime()) && depDate < todayStart;
                                  return (
                                  <tr key={t.id} className={`hover:bg-slate-50/80 transition-colors ${isDeparted ? 'bg-slate-50/50 opacity-80' : ''}`}>
                                    <td className="px-5 py-3">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-mono font-bold text-blue-700 tracking-tight bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded text-xs">
                                          {t.code}
                                        </span>
                                        {isDeparted && (
                                          <span className="text-[10px] font-bold text-slate-600 bg-slate-200/80 px-1.5 py-0.5 rounded">
                                            Đã đi
                                          </span>
                                        )}
                                        {t.tour_type === 'outsourced' || t.tour_type === 'partner' ? (
                                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                                            Gửi đối tác
                                          </span>
                                        ) : t.tour_type === 'private' ? (
                                          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                            Đoàn riêng
                                          </span>
                                        ) : (
                                          <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded">
                                            Tự vận hành
                                          </span>
                                        )}
                                        {t.wp_product_sku && (
                                          <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded flex items-center gap-1" title={`Mã SKU Tour Website: ${t.wp_product_sku}`}>
                                            <Tag className="w-2.5 h-2.5 text-indigo-600" /> {t.wp_product_sku}
                                          </span>
                                        )}
                                        {t.wp_product_id && (
                                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded flex items-center gap-1" title={`Đã đồng bộ WooCommerce Product ID #${t.wp_product_id}`}>
                                            <Globe className="w-3 h-3 text-emerald-600" /> WC #{t.wp_product_id}
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-5 py-3">
                                      <div className={`font-bold text-xs ${isDeparted ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                                        {t.tour_type === 'visa' ? t.duration : (t.departure_time ? format(new Date(t.departure_time), 'dd/MM/yyyy HH:mm') : '-')}
                                      </div>
                                    </td>
                                    <td className="px-5 py-3 text-right font-black text-rose-600 text-xs whitespace-nowrap">
                                      {t.discount && t.discount > 0 ? (
                                        <div>{new Intl.NumberFormat('vi-VN').format(t.price - t.discount)} đ</div>
                                      ) : (
                                        <div>{new Intl.NumberFormat('vi-VN').format(t.price)} đ</div>
                                      )}
                                    </td>
                                    <td className="px-5 py-3 text-center whitespace-nowrap">
                                      {t.tour_type === 'visa' ? (
                                        <span className="text-xs text-slate-400 italic">Không giới hạn</span>
                                      ) : t.tour_type === 'private' ? (
                                        <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md inline-flex items-center gap-1">
                                          <Crown className="w-3 h-3 text-amber-600" /> Trọn đoàn ({t.total_seats || t.available_seats || 0} Khách)
                                        </span>
                                      ) : (
                                        <div className="inline-flex gap-1 font-bold text-[11px] items-center">
                                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200" title="Đã bán chắc chắn">
                                            {t.sold_seats} Bán
                                          </span>
                                          <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200" title="Đang giữ tạm">
                                            {t.hold_seats} Giữ
                                          </span>
                                          <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200" title="Còn trống">
                                            {t.available_seats} Trống
                                          </span>
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-5 py-3 text-center whitespace-nowrap">
                                      <div className="flex items-center justify-center gap-1.5">
                                        {/* View Details Drawer */}
                                        <button
                                          type="button"
                                          onClick={() => setSelectedTourForDrawer(t)}
                                          className="p-1.5 text-indigo-600 hover:text-indigo-800 rounded-lg transition-colors border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100"
                                          title="Xem chi tiết & Quản lý chỗ"
                                        >
                                          <Info className="w-4 h-4" />
                                        </button>

                                        {/* WooCommerce Sync */}
                                        {canManageTours && (
                                          <button
                                            type="button"
                                            onClick={() => handleSyncSingleTourToWooCommerce(t)}
                                            disabled={isSyncingTourId === t.id}
                                            className={`p-1.5 rounded-lg transition-colors border cursor-pointer ${
                                              t.wp_sync_status === 'synced'
                                                ? 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                                                : t.wp_sync_status === 'failed'
                                                ? 'text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100'
                                                : 'text-blue-600 bg-blue-50/60 border-blue-200 hover:bg-blue-100'
                                            }`}
                                            title={
                                              t.wp_sync_status === 'synced'
                                                ? `Đã đồng bộ sang Website (WC #${t.wp_product_id}). Bấm để cập nhật lại.`
                                                : t.wp_sync_status === 'failed'
                                                ? `Đồng bộ lỗi: ${t.wp_sync_message || ''}. Bấm để thử lại.`
                                                : 'Đồng bộ tour này sang Website WordPress (WooCommerce)'
                                            }
                                          >
                                            <Globe className={`w-4 h-4 ${isSyncingTourId === t.id ? 'animate-spin' : ''}`} />
                                          </button>
                                        )}

                                        {/* Duplicate/Clone */}
                                        {canManageTours && t.tour_type !== 'private' && (
                                          <button
                                            type="button"
                                            onClick={() => handleCloneTour(t)}
                                            disabled={currentRole === "sale_leader" && (!t.tour_type || t.tour_type === "internal")}
                                            className={`p-1.5 text-blue-600 rounded-lg transition-colors border border-blue-100 bg-blue-50/40 ${currentRole === "sale_leader" && (!t.tour_type || t.tour_type === "internal") ? "opacity-30 cursor-not-allowed" : "hover:bg-blue-50"}`}
                                            title="Sao chép ngày khởi hành"
                                          >
                                            <Copy className="w-4 h-4" />
                                          </button>
                                        )}
                                        {/* Edit */}
                                        {canManageTours && (
                                          <button
                                            type="button"
                                            onClick={() => startEdit(t)}
                                            disabled={currentRole === "sale_leader" && (!t.tour_type || t.tour_type === "internal")}
                                            className={`p-1.5 text-amber-600 rounded-lg transition-colors border border-amber-100 bg-amber-50/40 ${currentRole === "sale_leader" && (!t.tour_type || t.tour_type === "internal") ? "opacity-30 cursor-not-allowed" : "hover:bg-amber-50"}`}
                                            title="Sửa chi tiết"
                                          >
                                            <Edit3 className="w-4 h-4" />
                                          </button>
                                        )}
                                        {/* Delete */}
                                        {canManageTours && (
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteTourClick(t)}
                                            disabled={currentRole === "sale_leader" && (!t.tour_type || t.tour_type === "internal")}
                                            className={`p-1.5 text-rose-600 rounded-lg transition-colors border border-rose-100 bg-rose-50/40 ${currentRole === "sale_leader" && (!t.tour_type || t.tour_type === "internal") ? "opacity-30 cursor-not-allowed" : "hover:bg-rose-50"}`}
                                            title="Xóa"
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
                    );
                  })
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                {totalFlatItems === 0 ? (
                  <div className="text-center py-12 text-sm text-gray-400 font-medium">
                    Không tìm thấy tour du lịch nào phù hợp với bộ lọc hiện tại.
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50/80 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-3.5 text-left">Mã tour / Danh mục</th>
                        <th className="px-6 py-3.5 text-left">Tên Hành Trình</th>
                        <th className="px-6 py-3.5 text-center">Khởi Hành</th>
                        <th className="px-6 py-3.5 text-center">Giá Tour</th>
                        <th className="px-6 py-3.5 text-center">Hold / Vé</th>
                        <th className="px-6 py-3.5 text-center">Ghế (Bán / Giữ / Trống)</th>
                        <th className="px-6 py-3.5 text-center">Hành động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-sm text-gray-700">
                      {paginatedFlatTours.map(t => {
                        const depDate = new Date(t.departure_time || t.start_date || '');
                        const isDeparted = !isNaN(depDate.getTime()) && depDate < todayStart;
                        return (
                        <tr key={t.id} className={`hover:bg-gray-50/60 transition-colors ${isDeparted ? 'bg-slate-50/50' : ''}`}>
                          <td className="px-6 py-3.5 min-w-[180px]">
                            <div className="flex flex-col gap-1.5 items-start">
                              <div className="font-bold text-blue-700 tracking-tight text-xs bg-blue-50 border border-blue-200/80 px-2.5 py-1 rounded-md inline-block">
                                {t.code}
                              </div>
                              {isDeparted && (
                                <span className="text-[10px] font-extrabold text-slate-600 bg-slate-200/80 border border-slate-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                                  <Folder className="w-3 h-3 text-slate-500" /> Đã khởi hành
                                </span>
                              )}
                              <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider truncate max-w-[160px]" title={t.category || 'Chưa phân mục'}>
                                {t.category || 'Chưa phân mục'}
                              </div>
                              {/* Tour Type Badge */}
                              <div className="flex">
                                {(t.tour_type === 'partner' || t.tour_type === 'outsourced') && (
                                  <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full font-semibold uppercase whitespace-nowrap inline-flex items-center gap-1">
                                    <Handshake className="w-3 h-3 text-indigo-600" /> Gửi khách đối tác-F2
                                  </span>
                                )}
                                {t.tour_type === 'private' && (
                                  <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-semibold uppercase whitespace-nowrap inline-flex items-center gap-1">
                                    <Crown className="w-3 h-3 text-amber-600" /> Tour đoàn riêng
                                  </span>
                                )}
                                {t.tour_type === 'visa' && (
                                  <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full font-semibold uppercase whitespace-nowrap inline-flex items-center gap-1">
                                    <FileText className="w-3 h-3 text-purple-600" /> Dịch vụ Visa lẻ
                                  </span>
                                )}
                                {(t.tour_type === 'internal' || !t.tour_type) && (
                                  <span className="text-xs bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 rounded-full font-semibold uppercase whitespace-nowrap inline-flex items-center gap-1">
                                    <Building2 className="w-3 h-3 text-gray-500" /> AD Tự vận hành
                                  </span>
                                )}
                              </div>
                              {t.wp_product_id && (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1" title={`Đã đồng bộ WooCommerce Product ID #${t.wp_product_id}`}>
                                  <Globe className="w-3 h-3 text-emerald-600" /> WC #{t.wp_product_id}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-3.5 min-w-[300px] max-w-md">
                            <div className="font-bold text-gray-900 text-sm line-clamp-2" title={t.name}>{t.name}</div>
                            <div className="text-xs text-gray-500 mt-1.5 font-medium flex flex-col gap-1">
                              <div className="flex items-center gap-1.5 whitespace-nowrap overflow-hidden text-ellipsis">
                                <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap inline-block">{t.duration}</span>
                                <span className="text-gray-300">•</span>
                                <span className="text-gray-600 truncate flex items-center gap-1" title={`Khách sạn: ${t.hotel}`}><Hotel className="w-3 h-3 text-slate-400 shrink-0" /> {t.hotel || 'Chưa cập nhật'}</span>
                              </div>
                              
                              {/* Product-Specific Subtext */}
                              {(t.tour_type === 'partner' || t.tour_type === 'outsourced') && (
                                <div className="text-[11px] text-indigo-700 font-medium bg-indigo-50/60 px-2.5 py-1 rounded border border-indigo-100 mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis max-w-[280px] flex items-center gap-1" title={`Đối tác: ${t.partner_name || t.partner_company_name || 'Đối tác'} (${t.partner_contact || 'Chưa có thông tin'})`}>
                                  <Handshake className="w-3 h-3 text-indigo-600 shrink-0" /> <span className="font-semibold">{t.partner_company_name || t.partner_name || 'Đối tác'}</span> ({t.partner_contact || 'Liên hệ'})
                                </div>
                              )}
                              {t.tour_type === 'private' && (
                                <div className="text-[11px] text-amber-800 font-medium bg-amber-50/60 px-2.5 py-1 rounded border border-amber-100 mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis max-w-[280px] flex items-center gap-1" title={`Đoàn riêng: ${t.organization_name} | Y/C: ${t.custom_requirements || 'Không có'}`}>
                                  <Crown className="w-3 h-3 text-amber-600 shrink-0" /> <span className="font-semibold">{t.organization_name}</span> | Y/C: {t.custom_requirements || 'N/A'}
                                </div>
                              )}
                              {t.tour_type === 'visa' && (
                                <div className="text-[11px] text-purple-800 font-medium bg-purple-50/60 px-2.5 py-1 rounded border border-purple-100 mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis max-w-[280px] flex items-center gap-1" title={`Quốc gia: ${t.visa_country} | ${t.visa_service_type} (${t.visa_speed === 'urgent' ? 'Khẩn' : 'Thường'})`}>
                                  <FileText className="w-3 h-3 text-purple-600 shrink-0" /> <span className="font-semibold">{t.visa_country}</span> | {t.visa_service_type} ({t.visa_speed === 'urgent' ? 'Khẩn' : 'Thường'})
                                </div>
                              )}
                            </div>
                          </td>
                        <td className="px-6 py-3.5 text-center whitespace-nowrap">
                          <div className="font-semibold text-gray-900 text-xs">
                            {t.tour_type === 'visa' 
                              ? t.duration 
                              : (t.departure_time ? format(new Date(t.departure_time), 'dd/MM/yyyy HH:mm') : '-')
                            }
                          </div>
                          {t.visa_deadline && (
                            <div className="text-xs text-rose-700 font-medium mt-1 uppercase tracking-wide bg-rose-50 border border-rose-200 px-2 py-0.5 rounded inline-block">
                              Hạn visa: {format(new Date(t.visa_deadline), 'dd/MM')}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-right whitespace-nowrap font-bold text-rose-600 text-xs">
                          {t.discount && t.discount > 0 ? (
                            <>
                              <div className="line-through text-gray-400 font-normal text-xs mb-0.5">{new Intl.NumberFormat('vi-VN').format(t.price)} đ</div>
                              <div>{new Intl.NumberFormat('vi-VN').format(t.price - t.discount)} VND</div>
                            </>
                          ) : (
                            <div>{new Intl.NumberFormat('vi-VN').format(t.price)} VND</div>
                          )}
                          <div className="text-xs text-gray-400 font-medium mt-0.5">HH: {new Intl.NumberFormat('vi-VN').format(t.commission)}</div>
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          {t.tour_type === 'visa' ? (
                            <span className="text-xs text-gray-400 italic">Không áp dụng</span>
                          ) : t.tour_type === 'private' ? (
                            <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 inline-flex items-center gap-1">
                              <Crown className="w-3 h-3 text-amber-600" /> Theo Hợp đồng
                            </span>
                          ) : (
                            <>
                              <div className="text-xs font-semibold text-gray-800 bg-gray-100 px-2 py-0.5 rounded-md inline-block">
                                {t.hold_duration_hours || 48}h
                              </div>
                              <div className="text-xs text-gray-500 mt-1 italic max-w-[120px] truncate" title={t.ticket_status}>
                                {t.ticket_status || 'Chờ xuất vé'}
                              </div>
                            </>
                          )}
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap text-center">
                          {t.tour_type === 'visa' ? (
                            <span className="text-xs text-gray-400 italic">Không giới hạn</span>
                          ) : t.tour_type === 'private' ? (
                            <div className="flex flex-col items-center gap-1.5">
                              <span className="text-xs font-extrabold text-amber-800 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-md inline-flex items-center gap-1">
                                <Crown className="w-3 h-3 text-amber-600" /> Trọn đoàn ({t.total_seats || t.available_seats || 0} Khách)
                              </span>
                              {(() => {
                                const linkedOrder = orders.find(o => o.tour_id === t.id);
                                if (linkedOrder) {
                                  return (
                                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md inline-flex items-center gap-1" title="Đã tự động khởi tạo đơn hàng Booking">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Booking #{linkedOrder.id.substring(0, 8).toUpperCase()}
                                    </span>
                                  );
                                }
                                return (
                                  <span className="text-[11px] font-medium text-amber-700 bg-amber-50/80 border border-amber-200 px-2 py-0.5 rounded-md inline-flex items-center gap-1 animate-pulse">
                                    <Clock className="w-3 h-3 text-amber-600 animate-spin" /> Đang tự động tạo Booking...
                                  </span>
                                );
                              })()}
                            </div>
                          ) : (
                            <div className="inline-flex gap-1.5 text-xs font-semibold items-center">
                              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200" title="Đã bán chắc chắn">
                                {t.sold_seats} Sure
                              </span>
                              <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200" title="Đang giữ tạm">
                                {t.hold_seats} Hold
                              </span>
                              <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200" title="Còn trống để đăng ký">
                                {t.available_seats} Trống
                              </span>
                              {t.overbook_limit ? (
                                <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200" title="Overbooking tối đa được cho phép">
                                  +{t.overbook_limit} OB
                                </span>
                              ) : null}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* View Details Drawer */}
                            <button
                              type="button"
                              onClick={() => setSelectedTourForDrawer(t)}
                              className="p-1.5 text-indigo-600 hover:text-indigo-800 rounded-lg transition-colors border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100"
                              title="Xem chi tiết & Quản lý chỗ"
                            >
                              <Info className="w-4 h-4" />
                            </button>

                            {/* WooCommerce Sync */}
                            {canManageTours && (
                              <button
                                type="button"
                                onClick={() => handleSyncSingleTourToWooCommerce(t)}
                                disabled={isSyncingTourId === t.id}
                                className={`p-1.5 rounded-lg transition-colors border cursor-pointer ${
                                  t.wp_sync_status === 'synced'
                                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                                    : t.wp_sync_status === 'failed'
                                    ? 'text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100'
                                    : 'text-blue-600 bg-blue-50/60 border-blue-200 hover:bg-blue-100'
                                }`}
                                title={
                                  t.wp_sync_status === 'synced'
                                    ? `Đã đồng bộ sang Website (WC #${t.wp_product_id}). Bấm để cập nhật lại.`
                                    : t.wp_sync_status === 'failed'
                                    ? `Đồng bộ lỗi: ${t.wp_sync_message || ''}. Bấm để thử lại.`
                                    : 'Đồng bộ tour này sang Website WordPress (WooCommerce)'
                                }
                              >
                                <Globe className={`w-4 h-4 ${isSyncingTourId === t.id ? 'animate-spin' : ''}`} />
                              </button>
                            )}

                            {/* Duplicate/Clone action */}
                            {canManageTours && t.tour_type !== 'private' && (
                              <button
                                type="button"
                                onClick={() => handleCloneTour(t)}
                                disabled={currentRole === "sale_leader" && (!t.tour_type || t.tour_type === "internal")}
                                className={`p-1.5 text-blue-600 rounded-lg transition-colors border border-blue-100 bg-blue-50/40 ${currentRole === "sale_leader" && (!t.tour_type || t.tour_type === "internal") ? "opacity-30 cursor-not-allowed" : "hover:bg-blue-50"}`}
                                title="Sao chép tour sang ngày khởi hành khác"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                            )}
                            
                            {/* Edit action */}
                            {canManageTours && (
                              <button
                                type="button"
                                onClick={() => startEdit(t)}
                                disabled={currentRole === "sale_leader" && (!t.tour_type || t.tour_type === "internal")}
                                className={`p-1.5 text-amber-600 rounded-lg transition-colors border border-amber-100 bg-amber-50/40 ${currentRole === "sale_leader" && (!t.tour_type || t.tour_type === "internal") ? "opacity-30 cursor-not-allowed" : "hover:bg-amber-50"}`}
                                title="Sửa thông tin chi tiết tour"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            )}

                            {/* Delete action */}
                            {canManageTours && (
                              <button
                                type="button"
                                onClick={() => handleDeleteTourClick(t)}
                                disabled={currentRole === "sale_leader" && (!t.tour_type || t.tour_type === "internal")}
                                className={`p-1.5 text-rose-600 rounded-lg transition-colors border border-rose-100 bg-rose-50/40 ${currentRole === "sale_leader" && (!t.tour_type || t.tour_type === "internal") ? "opacity-30 cursor-not-allowed" : "hover:bg-rose-50"}`}
                                title="Xóa tour khởi hành này"
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
                )}
              </div>
            )}

            {/* PAGINATION FOOTER CONTROL BAR */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-500 font-medium flex flex-wrap items-center gap-2">
                <span>Hiển thị</span>
                <div className="inline-block">
                  <CustomSelect
                    options={[
                      { value: '5', label: '5 tour / trang' },
                      { value: '10', label: '10 tour / trang' },
                      { value: '20', label: '20 tour / trang' },
                      { value: '50', label: '50 tour / trang' },
                    ]}
                    value={String(itemsPerPage)}
                    onChange={val => {
                      setItemsPerPage(Number(val));
                      setCurrentPage(1);
                    }}
                    className="w-40 sm:w-44"
                    buttonClassName="w-full h-8 px-3 py-1 border border-slate-300 rounded-lg bg-white text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer shadow-2xs"
                  />
                </div>
                <span>
                  {viewMode === 'grouped'
                    ? `(Tổng số ${totalGroupItems} chuỗi tour, Trang ${currentPage} / ${totalGroupPages})`
                    : `(Tổng số ${totalFlatItems} đợt tour, Trang ${currentPage} / ${totalFlatPages})`
                  }
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  className="px-2.5 py-1 text-xs font-bold border border-slate-200 rounded-lg bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  title="Về trang đầu tiên"
                >
                  « Đầu
                </button>
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="px-3 py-1 text-xs font-bold border border-slate-200 rounded-lg bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  title="Trang trước"
                >
                  ‹ Trước
                </button>

                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: viewMode === 'grouped' ? totalGroupPages : totalFlatPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === (viewMode === 'grouped' ? totalGroupPages : totalFlatPages) || Math.abs(p - currentPage) <= 1)
                    .map((p, idx, arr) => (
                      <React.Fragment key={p}>
                        {idx > 0 && p - arr[idx - 1] > 1 && <span className="text-xs text-slate-400 px-0.5">...</span>}
                        <button
                          onClick={() => setCurrentPage(p)}
                          className={`w-7 h-7 rounded-lg text-xs font-black transition-all ${
                            currentPage === p
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    ))}
                </div>

                <button
                  disabled={currentPage === (viewMode === 'grouped' ? totalGroupPages : totalFlatPages)}
                  onClick={() => setCurrentPage(prev => Math.min(viewMode === 'grouped' ? totalGroupPages : totalFlatPages, prev + 1))}
                  className="px-3 py-1 text-xs font-bold border border-slate-200 rounded-lg bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  title="Trang sau"
                >
                  Sau ›
                </button>
                <button
                  disabled={currentPage === (viewMode === 'grouped' ? totalGroupPages : totalFlatPages)}
                  onClick={() => setCurrentPage(viewMode === 'grouped' ? totalGroupPages : totalFlatPages)}
                  className="px-2.5 py-1 text-xs font-bold border border-slate-200 rounded-lg bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  title="Đến trang cuối cùng"
                >
                  Cuối »
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* MODAL BỘ TẠO TOUR KHỞI HÀNH HÀNG LOẠT (SERIES) */}
      <BulkSeriesModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        baseTour={bulkBaseTour}
        onAddTour={addTour}
        categories={categories}
        defaultNoticeSections={DEFAULT_NOTICE_SECTIONS}
      />


      {/* Custom Delete Confirmation Modal */}
      {catToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl border border-slate-100 max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-950 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" /> Xác nhận xóa danh mục
            </h3>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Bạn có chắc chắn muốn xóa danh mục <strong className="text-slate-900">"{catToDelete}"</strong> không? Hành động này không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCatToDelete(null)}
                className="h-9 px-4 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteCategory(catToDelete);
                  setCatToDelete(null);
                }}
                className="h-9 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
              >
                Đồng ý xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert Message Modal */}
      {catAlertMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl border border-slate-100 max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-950 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" /> Thông báo từ hệ thống
            </h3>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              {catAlertMessage}
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setCatAlertMessage(null)}
                className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Popup Xác Nhận Xóa Tour */}
      {deletingTour && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-scaleUp">
            <div className="flex items-center gap-3.5 text-rose-600">
              <div className="w-12 h-12 rounded-2xl bg-rose-100/80 flex items-center justify-center shrink-0 border border-rose-200">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Xác nhận XÓA vĩnh viễn Tour</h3>
                <p className="text-xs text-rose-600 font-semibold">Hành động này không thể hoàn tác!</p>
              </div>
            </div>

            <div className="bg-rose-50/80 border border-rose-200/80 rounded-xl p-4 space-y-2 text-xs text-slate-700">
              <p className="font-semibold text-slate-900">
                Mã tour: <span className="text-rose-700 font-extrabold">{deletingTour.code}</span>
              </p>
              <p className="font-medium text-slate-800 line-clamp-2">
                Tên tour: <span className="font-bold">{deletingTour.name}</span>
              </p>
              <p className="text-[11px] text-rose-800 pt-2 border-t border-rose-200/60 leading-relaxed flex items-start gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" /> <span><strong>Cảnh báo:</strong> Khi xóa tour, toàn bộ thông tin tour và các đơn đặt giữ chỗ (Booking) liên quan đến tour này có thể bị ảnh hưởng.</span>
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingTour(null)}
                className="h-9 px-4 rounded-lg border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-all cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteTour}
                className="h-9 px-5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Xác nhận Xóa Tour
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER XEM CHI TIẾT & ĐIỀU PHỐI TOUR (SLIDE-OVER DRAWER) */}
      {selectedTourForDrawer && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
          <div 
            className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-250"
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-5 bg-slate-50/90 border-b border-slate-200 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
                    {selectedTourForDrawer.code}
                  </span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
                    {selectedTourForDrawer.category || 'Chưa phân mục'}
                  </span>
                  {selectedTourForDrawer.tour_type === 'outsourced' || selectedTourForDrawer.tour_type === 'partner' ? (
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Gửi khách đối tác
                    </span>
                  ) : selectedTourForDrawer.tour_type === 'private' ? (
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                      Tour đoàn riêng
                    </span>
                  ) : (
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                      AD Tự vận hành
                    </span>
                  )}
                </div>
                <h3 className="text-base font-black text-slate-900 pt-1 leading-snug">
                  {selectedTourForDrawer.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTourForDrawer(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors"
                title="Đóng chi tiết"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
              {/* Quỹ chỗ & Tình trạng mở bán */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Tình trạng quỹ chỗ</span>
                  <span className="text-xs font-semibold text-slate-500">
                    Tổng: <strong>{selectedTourForDrawer.total_seats || selectedTourForDrawer.available_seats || 0} chỗ</strong>
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg">
                    <span className="text-[11px] font-semibold text-emerald-600 block">Đã bán (Sure)</span>
                    <strong className="text-base font-black text-emerald-700">{selectedTourForDrawer.sold_seats || 0}</strong>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-lg">
                    <span className="text-[11px] font-semibold text-amber-600 block">Giữ tạm (Hold)</span>
                    <strong className="text-base font-black text-amber-700">{selectedTourForDrawer.hold_seats || 0}</strong>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 p-2.5 rounded-lg">
                    <span className="text-[11px] font-semibold text-blue-600 block">Còn trống</span>
                    <strong className="text-base font-black text-blue-700">{selectedTourForDrawer.available_seats || 0}</strong>
                  </div>
                </div>
              </div>

              {/* Lịch trình & Thời gian */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Thời gian & Lịch khởi hành</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                    <span className="text-slate-500 font-medium">Khởi hành:</span>
                    <p className="font-bold text-slate-900">
                      {selectedTourForDrawer.departure_time ? format(new Date(selectedTourForDrawer.departure_time), 'HH:mm dd/MM/yyyy') : 'Chưa cập nhật'}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                    <span className="text-slate-500 font-medium">Ngày về:</span>
                    <p className="font-bold text-slate-900">
                      {selectedTourForDrawer.return_time ? format(new Date(selectedTourForDrawer.return_time), 'HH:mm dd/MM/yyyy') : 'Chưa cập nhật'}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                    <span className="text-slate-500 font-medium">Thời lượng:</span>
                    <p className="font-bold text-slate-900">{selectedTourForDrawer.duration || 'Chưa cập nhật'}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                    <span className="text-slate-500 font-medium">Hạn nộp Visa:</span>
                    <p className="font-bold text-rose-600">
                      {selectedTourForDrawer.visa_deadline ? format(new Date(selectedTourForDrawer.visa_deadline), 'dd/MM/yyyy') : 'Không yêu cầu'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Biểu giá & Hoa hồng */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Biểu giá tour & Chiết khấu</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                    <span className="text-slate-500 font-medium">Giá Người lớn (≥10T):</span>
                    <p className="font-black text-rose-600">
                      {new Intl.NumberFormat('vi-VN').format(selectedTourForDrawer.price || 0)} đ
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                    <span className="text-slate-500 font-medium">Giá Trẻ em (2-10T):</span>
                    <p className="font-bold text-slate-800">
                      {selectedTourForDrawer.price_child ? `${new Intl.NumberFormat('vi-VN').format(selectedTourForDrawer.price_child)} đ` : 'Chưa nhập'}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                    <span className="text-slate-500 font-medium">Giá Em bé (&lt;2T):</span>
                    <p className="font-bold text-slate-800">
                      {selectedTourForDrawer.price_infant ? `${new Intl.NumberFormat('vi-VN').format(selectedTourForDrawer.price_infant)} đ` : 'Chưa nhập'}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                    <span className="text-slate-500 font-medium">Phụ thu phòng đơn:</span>
                    <p className="font-bold text-slate-800">
                      {selectedTourForDrawer.single_room_surcharge ? `${new Intl.NumberFormat('vi-VN').format(selectedTourForDrawer.single_room_surcharge)} đ` : '0 đ'}
                    </p>
                  </div>
                  {currentRole !== 'tour_guide' && (
                    <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                      <span className="text-slate-500 font-medium">Hoa hồng / Khách:</span>
                      <p className="font-bold text-emerald-700">
                        {selectedTourForDrawer.commission ? `${new Intl.NumberFormat('vi-VN').format(selectedTourForDrawer.commission)} đ` : '0 đ'}
                      </p>
                    </div>
                  )}
                  <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                    <span className="text-slate-500 font-medium">Thời gian giữ chỗ:</span>
                    <p className="font-bold text-slate-800">{selectedTourForDrawer.hold_duration_hours || 48} giờ</p>
                  </div>
                </div>
              </div>

              {/* Dịch vụ đi kèm (Hàng không, Khách sạn) */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Tiêu chuẩn dịch vụ</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <Plane className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">Hãng hàng không</span>
                      <strong className="text-slate-900">{selectedTourForDrawer.airline || 'Chưa cập nhật'}</strong>
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                      <Hotel className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">Tiêu chuẩn khách sạn</span>
                      <strong className="text-slate-900">{selectedTourForDrawer.hotel || 'Chưa cập nhật'}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Thông tin đối tác hoặc đoàn riêng nếu có */}
              {(selectedTourForDrawer.tour_type === 'outsourced' || selectedTourForDrawer.tour_type === 'partner') && (
                <div className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-200 space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-bold text-indigo-900">
                    <Handshake className="w-4 h-4 text-indigo-700" />
                    <span>Thông tin đối tác nhận gửi khách</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-700 pt-1">
                    <div>Công ty: <strong>{selectedTourForDrawer.partner_company_name || selectedTourForDrawer.partner_name || 'Chưa có'}</strong></div>
                    <div>Liên hệ: <strong>{selectedTourForDrawer.partner_contact || 'Chưa có'}</strong></div>
                  </div>
                </div>
              )}

              {selectedTourForDrawer.tour_type === 'private' && (
                <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-bold text-amber-900">
                    <Crown className="w-4 h-4 text-amber-700" />
                    <span>Thông tin tổ chức / Doanh nghiệp đặt đoàn riêng</span>
                  </div>
                  <div className="text-slate-700 space-y-1 pt-1">
                    <div>Tổ chức: <strong>{selectedTourForDrawer.organization_name || 'Chưa có'}</strong></div>
                    <div>Yêu cầu đặc biệt: <strong>{selectedTourForDrawer.custom_requirements || 'Không có'}</strong></div>
                  </div>
                </div>
              )}

              {/* Danh sách các đơn Booking đặt chỗ thuộc Tour */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Danh sách Booking của Tour ({orders.filter(o => o.tour_id === selectedTourForDrawer.id).length})</h4>
                </div>
                {orders.filter(o => o.tour_id === selectedTourForDrawer.id).length === 0 ? (
                  <div className="text-center py-6 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-400 font-medium">
                    Chưa có đơn đặt chỗ nào cho tour này.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white text-xs">
                    {orders.filter(o => o.tour_id === selectedTourForDrawer.id).map(ord => (
                      <div key={ord.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-blue-700">#{ord.id.substring(0, 8).toUpperCase()}</span>
                            <span className="font-bold text-slate-900">{ord.customer_name}</span>
                            <span className="text-slate-500 font-medium">{ord.customer_phone}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {ord.adult_count || 1} Lớn {ord.child_count ? `, ${ord.child_count} Trẻ em` : ''} • Tổng: {new Intl.NumberFormat('vi-VN').format(ord.total_price || 0)} đ
                          </div>
                        </div>
                        <div>
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            ord.status === 'paid' || ord.status === 'sure'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : ord.status === 'cancelled'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {ord.status === 'paid' ? 'Đã thanh toán' : ord.status === 'sure' ? 'Đã cọc/Chắc chắn' : ord.status === 'cancelled' ? 'Đã hủy' : 'Đang giữ chỗ'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedTourForDrawer(null)}
                className="h-9 px-4 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all cursor-pointer"
              >
                Đóng
              </button>
              {canManageTours && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const t = selectedTourForDrawer;
                      setSelectedTourForDrawer(null);
                      startEdit(t);
                    }}
                    disabled={currentRole === "sale_leader" && (!selectedTourForDrawer.tour_type || selectedTourForDrawer.tour_type === "internal")}
                    className={`h-9 px-4 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm cursor-pointer ${
                      currentRole === "sale_leader" && (!selectedTourForDrawer.tour_type || selectedTourForDrawer.tour_type === "internal")
                        ? "opacity-40 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    <Edit3 className="w-4 h-4" />
                    Chỉnh sửa Tour
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Lựa chọn Sản phẩm Website & Đồng bộ Tour Thông minh */}
      <SyncTourToWooCommerceModal
        isOpen={!!selectedTourForWpSync}
        onClose={() => setSelectedTourForWpSync(null)}
        tour={selectedTourForWpSync}
        onSyncSuccess={(res) => {
          if (selectedTourForWpSync && res?.product_id) {
            updateTour({
              ...selectedTourForWpSync,
              wp_product_id: res.product_id,
              wp_sync_status: 'synced',
              wp_last_synced_at: new Date().toISOString(),
              wp_sync_message: res.message
            });
          }
        }}
      />

      {/* Modal Đồng Bộ Hàng Loạt Chuyên Dụng Lên WooCommerce */}
      <BulkSyncWooCommerceModal
        isOpen={isBulkSyncModalOpen}
        onClose={() => setIsBulkSyncModalOpen(false)}
        tours={tours}
        onSyncComplete={() => {
          // Tải lại danh sách tour từ Supabase để cập nhật trạng thái mới nhất
          refreshTours();
        }}
      />
    </div>
  );
}
