import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { useCRM } from '@/context/CRMContext';
import { useAuth } from '@/context/AuthContext';
import { Tour, LandtourCost, PartnerPayment, PartnerPaymentInstallment } from '@/types';
import { formatDateVi } from '@/lib/utils';
import { DatePicker } from '@/components/DatePicker';
import { CustomSelect } from '@/components/CustomSelect';
import {
  Plus,
  Trash2,
  Calendar,
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  User,
  Shield,
  Gift,
  Megaphone,
  Plane,
  Tag,
  Eye,
  UploadCloud,
  Search,
  Check,
  Briefcase,
  RefreshCw,
  Coins,
  FolderOpen,
  ChevronRight,
  Folder,
  Camera,
  ChevronDown,
  ChevronUp,
  Layers,
  Edit3,
  Building2,
  Filter,
  FilterX,
  X,
  TrendingUp,
  TrendingDown,
  Zap,
  Handshake
} from 'lucide-react';
import toast from 'react-hot-toast';

// Component định dạng số có phân tách hàng nghìn (chỉ số dương)
interface FormattedNumberInputProps {
  label: string;
  icon?: React.ReactNode;
  value: number;
  onChange: (val: number) => void;
  placeholder?: string;
  disabled?: boolean;
}

const FormattedNumberInput: React.FC<FormattedNumberInputProps> = ({
  label,
  icon,
  value,
  onChange,
  placeholder = '0',
  disabled = false,
}) => {
  const [displayValue, setDisplayValue] = useState(() => {
    if (value === 0) return '';
    return new Intl.NumberFormat('vi-VN').format(value);
  });

  React.useEffect(() => {
    if (value === 0) {
      const parsedDisplay = displayValue.replace(/\./g, '');
      const parsedValue = Number(parsedDisplay);
      if (displayValue !== '' && parsedValue !== 0) {
        setDisplayValue('');
      }
    } else {
      const parsedDisplay = displayValue.replace(/\./g, '');
      const parsedValue = Number(parsedDisplay);
      if (isNaN(parsedValue) || parsedValue !== value) {
        setDisplayValue(new Intl.NumberFormat('vi-VN').format(value));
      }
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawText = e.target.value;
    
    // Nếu rỗng
    if (rawText === '') {
      setDisplayValue('');
      onChange(0);
      return;
    }

    // Lọc bỏ ký tự không phải số
    const digitsOnly = rawText.replace(/\D/g, '');
    
    if (digitsOnly === '') {
      setDisplayValue('');
      onChange(0);
      return;
    }

    const numValue = Number(digitsOnly);
    
    if (!isNaN(numValue)) {
      setDisplayValue(new Intl.NumberFormat('vi-VN').format(numValue));
      onChange(numValue);
    }
  };

  return (
    <div>
      <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">
        {icon} {label}
      </label>
      <input
        type="text"
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:opacity-60 disabled:bg-gray-50"
        value={displayValue}
        onChange={handleChange}
      />
    </div>
  );
};

export default function TourCostsManagement() {
  const { 
    tours, 
    orders, 
    tourCosts, 
    updateTourCost, 
    currentRole,
    invoices,
    categories,
    createInvoiceReceipt,
    uploadInvoiceProof,
    deleteInvoiceReceipt
  } = useCRM();

  const { profile } = useAuth();

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTourType, setFilterTourType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterProfit, setFilterProfit] = useState<string>('all');

  const [selectedTourId, setSelectedTourId] = useState<string | null>(null);

  // States for active Tour Cost form being edited
  const [isEditingCosts, setIsEditingCosts] = useState<boolean>(true);
  const [flightAmount, setFlightAmount] = useState<number>(0);
  const [insuranceAmount, setInsuranceAmount] = useState<number>(0);
  const [tourGuideAmount, setTourGuideAmount] = useState<number>(0);
  const [giftAmount, setGiftAmount] = useState<number>(0);
  const [commissionAmount, setCommissionAmount] = useState<number>(0);
  const [advertisingAmount, setAdvertisingAmount] = useState<number>(0);
  const [otherAmount, setOtherAmount] = useState<number>(0);
  const [visaAmount, setVisaAmount] = useState<number>(0);
  
  // Landtours sub-list being edited
  const [landtours, setLandtours] = useState<LandtourCost[]>([]);
  // Input fields for new landtour item
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierAmount, setNewSupplierAmount] = useState<number | ''>('');

  // Partner payments sub-list being edited
  const [partnerPayments, setPartnerPayments] = useState<PartnerPayment[]>([]);
  // Input fields for new partner payment
  const [newPartnerName, setNewPartnerName] = useState('');
  const [newPartnerAmountToPay, setNewPartnerAmountToPay] = useState<number | ''>('');
  const [newPartnerStatus, setNewPartnerStatus] = useState<PartnerPayment['status']>('unpaid');
  const [newPartnerVoucherUrl, setNewPartnerVoucherUrl] = useState('');
  const [isUploadingVoucher, setIsUploadingVoucher] = useState(false);

  // Installment management state per partner payment
  const [expandedInstallments, setExpandedInstallments] = useState<Record<string, boolean>>({});
  const [instAmountMap, setInstAmountMap] = useState<Record<string, number | ''>>({});
  const [instMethodMap, setInstMethodMap] = useState<Record<string, string>>({});
  const [instDateMap, setInstDateMap] = useState<Record<string, string>>({});
  const [instNoteMap, setInstNoteMap] = useState<Record<string, string>>({});
  const [instProofUrlMap, setInstProofUrlMap] = useState<Record<string, string>>({});
  const [instBankNameMap, setInstBankNameMap] = useState<Record<string, string>>({});
  const [instAccountNumberMap, setInstAccountNumberMap] = useState<Record<string, string>>({});
  const [instAccountNameMap, setInstAccountNameMap] = useState<Record<string, string>>({});
  const [isUploadingProofFor, setIsUploadingProofFor] = useState<string | null>(null);

  // Helper to format currency
  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  // Helper to calculate summary stats for a single tour card in overview
  const getTourSummaryStats = (tour: Tour) => {
    const tourOrders = orders.filter(o => o.tour_id === tour.id && o.status !== 'cancelled');
    const totalRevenue = tourOrders.reduce((sum, o) => sum + (o.total_price || 0), 0);
    const orderIds = tourOrders.map(o => o.id);
    const collectedRevenue = invoices
      .filter(inv => inv.type === 'receipt' && inv.status === 'approved' && inv.order_id && orderIds.includes(inv.order_id))
      .reduce((sum, inv) => sum + (inv.amount || 0), 0);

    const isOutsourced = tour.tour_type === 'outsourced' || tour.tour_type === 'partner';
    const costRecord = tourCosts.find(c => c.tourId === tour.id);
    let totalCosts = 0;

    if (isOutsourced) {
      const totalPassengers = tourOrders.reduce((sum, o) => sum + (o.adult_count || 0) + (o.child_count || 0), 0);
      const visaExp = (costRecord?.visaAmount || 0) * totalPassengers;
      const otherExp = costRecord?.otherAmount || 0;
      totalCosts = (tour.partner_net_cost || 0) * totalPassengers + (costRecord?.commissionAmount || 0) + visaExp + otherExp;
    } else if (costRecord) {
      const totalPassengers = tourOrders.reduce((sum, o) => sum + (o.adult_count || 0) + (o.child_count || 0), 0);
      const sumLandtours = (costRecord.landtours || []).reduce((sum, item) => sum + (item.amount || 0), 0);
      const sumExtraPartners = (costRecord.partnerPayments || [])
        .filter(p => {
          const name = (p.partnerName || '').trim().toLowerCase();
          const isStandard = [
            'hãng hàng không / đại lý vé máy bay',
            'công ty bảo hiểm du lịch',
            'hướng dẫn viên (tạm ứng chi phí điều hành tour)',
            'đối tác cung ứng quà tặng du lịch',
            'đại lý (hoa hồng bán tour)',
            'đại lý & ctv (hoa hồng bán tour)',
            'đối tác quảng cáo / marketing',
            'nhà cung cấp dịch vụ visa',
            'chi phí vận hành khác'
          ].includes(name) || name.startsWith('landtour:');
          return !isStandard;
        })
        .reduce((sum, item) => sum + (item.amountToPay || 0), 0);

      const visaExp = (costRecord.visaAmount || 0) * totalPassengers;
      totalCosts = (costRecord.flightAmount || 0) +
        (costRecord.insuranceAmount || 0) +
        (costRecord.tourGuideAmount || 0) +
        (costRecord.giftAmount || 0) +
        (costRecord.commissionAmount || 0) +
        (costRecord.advertisingAmount || 0) +
        visaExp +
        (costRecord.otherAmount || 0) +
        sumLandtours +
        sumExtraPartners;
    }
    const netProfit = totalRevenue - totalCosts;
    const progressPercent = totalRevenue > 0 ? Math.round((collectedRevenue / totalRevenue) * 100) : 0;

    const getTourStatusBadge = () => {
      if (tour.status === 'cancelled') {
        return { label: 'Đã hủy', className: 'bg-red-100 text-red-800 border border-red-200' };
      }
      const todayStr = new Date().toISOString().substring(0, 10);
      const startDate = tour.start_date || (tour.departure_time ? tour.departure_time.substring(0, 10) : '');
      const endDate = tour.end_date || (tour.return_time ? tour.return_time.substring(0, 10) : '');

      if (tour.status === 'completed' || (endDate && endDate < todayStr)) {
        return { label: 'Đã hoàn thành', className: 'bg-blue-100 text-blue-800 border border-blue-200' };
      }
      if (tour.status === 'active' || (startDate && endDate && startDate <= todayStr && endDate >= todayStr)) {
        return { label: 'Đang chạy', className: 'bg-green-100 text-green-800 border border-green-200' };
      }
      return { label: 'Sắp khởi hành', className: 'bg-amber-100 text-amber-800 border border-amber-200' };
    };

    return {
      tourOrders,
      totalRevenue,
      collectedRevenue,
      totalCosts,
      netProfit,
      progressPercent,
      statusBadge: getTourStatusBadge()
    };
  };

  // Extracted available departure months from tours list (Format: MM/YYYY)
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    tours.forEach(t => {
      const dStr = t.start_date || (t.departure_time ? t.departure_time.substring(0, 10) : '');
      if (dStr && dStr.length >= 7) {
        const parts = dStr.split('-');
        if (parts.length >= 2 && parts[0] && parts[1]) {
          monthsSet.add(`${parts[1]}/${parts[0]}`);
        }
      }
    });
    return Array.from(monthsSet).sort((a, b) => {
      const [mA, yA] = a.split('/');
      const [mB, yB] = b.split('/');
      return `${yB}-${mB}`.localeCompare(`${yA}-${mA}`);
    });
  }, [tours]);

  // Filter tours (exclude visa services, and exclude internal tours for sale_leader)
  const filteredTours = useMemo(() => {
    const todayStr = new Date().toISOString().substring(0, 10);

    return tours
      .filter(t => t.tour_type !== 'visa')
      .filter(t => {
        if (currentRole === 'sale_leader') {
          return t.tour_type === 'partner' || t.tour_type === 'private';
        }
        return true;
      })
      // 1. Search term (code, name, destination, category)
      .filter(t => {
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase().trim();
        return (
          (t.name || '').toLowerCase().includes(term) ||
          (t.code || '').toLowerCase().includes(term) ||
          (t.category || '').toLowerCase().includes(term) ||
          (t.destination || '').toLowerCase().includes(term)
        );
      })
      // 2. Tour type filter
      .filter(t => {
        if (filterTourType === 'all') return true;
        if (filterTourType === 'internal') return !t.tour_type || t.tour_type === 'internal';
        if (filterTourType === 'partner') return t.tour_type === 'partner' || t.tour_type === 'outsourced';
        if (filterTourType === 'private') return t.tour_type === 'private';
        return true;
      })
      // 3. Status filter
      .filter(t => {
        if (filterStatus === 'all') return true;
        const startDate = t.start_date || (t.departure_time ? t.departure_time.substring(0, 10) : '');
        const endDate = t.end_date || (t.return_time ? t.return_time.substring(0, 10) : '');

        if (filterStatus === 'upcoming') {
          return t.status !== 'cancelled' && t.status !== 'completed' && (!startDate || startDate >= todayStr);
        }
        if (filterStatus === 'departed') {
          return t.status === 'completed' || (endDate && endDate < todayStr);
        }
        if (filterStatus === 'active') {
          return t.status === 'active' || (startDate && endDate && startDate <= todayStr && endDate >= todayStr);
        }
        if (filterStatus === 'cancelled') {
          return t.status === 'cancelled';
        }
        return true;
      })
      // 4. Month filter (MM/YYYY)
      .filter(t => {
        if (filterMonth === 'all') return true;
        const startDate = t.start_date || (t.departure_time ? t.departure_time.substring(0, 10) : '');
        if (!startDate) return false;
        const parts = startDate.split('-');
        if (parts.length < 2) return false;
        const tourMonthYear = `${parts[1]}/${parts[0]}`;
        return tourMonthYear === filterMonth;
      })
      // 5. Category filter
      .filter(t => {
        if (filterCategory === 'all') return true;
        return (t.category || 'Chung') === filterCategory;
      })
      // 6. Profit status filter
      .filter(t => {
        if (filterProfit === 'all') return true;
        const stats = getTourSummaryStats(t);
        if (filterProfit === 'profit') return stats.netProfit > 0;
        if (filterProfit === 'loss') return stats.netProfit < 0;
        if (filterProfit === 'even') return stats.netProfit === 0;
        return true;
      });
  }, [tours, searchTerm, currentRole, filterTourType, filterStatus, filterMonth, filterCategory, filterProfit, orders, invoices, tourCosts]);

  // Aggregate stats across all currently filtered tours
  const aggregateFilteredStats = useMemo(() => {
    let totalRevenue = 0;
    let totalCosts = 0;
    let totalNetProfit = 0;

    filteredTours.forEach(tour => {
      const stats = getTourSummaryStats(tour);
      totalRevenue += stats.totalRevenue;
      totalCosts += stats.totalCosts;
      totalNetProfit += stats.netProfit;
    });

    return {
      count: filteredTours.length,
      totalRevenue,
      totalCosts,
      totalNetProfit
    };
  }, [filteredTours, orders, invoices, tourCosts]);

  const isAnyFilterActive =
    searchTerm.trim() !== '' ||
    filterTourType !== 'all' ||
    filterStatus !== 'all' ||
    filterMonth !== 'all' ||
    filterCategory !== 'all' ||
    filterProfit !== 'all';

  const resetAllFilters = () => {
    setSearchTerm('');
    setFilterTourType('all');
    setFilterStatus('all');
    setFilterMonth('all');
    setFilterCategory('all');
    setFilterProfit('all');
  };

  // Selected tour object
  const selectedTour = useMemo(() => {
    const tour = tours.find(t => t.id === selectedTourId) || null;
    if (tour && currentRole === 'sale_leader' && (!tour.tour_type || tour.tour_type === 'internal')) {
      return null;
    }
    return tour;
  }, [tours, selectedTourId, currentRole]);

  // Orders and bookings for the selected tour
  const selectedTourOrders = useMemo(() => {
    if (!selectedTourId) return [];
    return orders.filter(o => o.tour_id === selectedTourId && o.status !== 'cancelled');
  }, [orders, selectedTourId]);

  // Total Expected Revenue
  const totalRevenue = useMemo(() => {
    return selectedTourOrders.reduce((sum, order) => sum + (order.total_price || 0), 0);
  }, [selectedTourOrders]);

  // Auto-calculated total commission from active bookings for the selected tour
  const totalBookingCommissions = useMemo(() => {
    if (!selectedTourOrders || selectedTourOrders.length === 0) return 0;
    return selectedTourOrders.reduce((sum, order) => {
      // Check if order is sold by or created for an Agent / CTV
      const isAgentOrCTV =
        order.seller_type === 'agent' ||
        (order.ctv_info !== undefined && order.ctv_info !== null && order.ctv_info.trim().length > 0) ||
        (order.agent_commission_amount !== undefined && order.agent_commission_amount !== null && order.agent_commission_amount > 0);

      // Direct AD sales do not have base agent commission
      const tourCommPerSeat = isAgentOrCTV ? (selectedTour?.commission || 0) : 0;
      const seats = Math.max(1, (order.adult_count || 0) + (order.child_count || 0));
      const baseTotalComm = seats * tourCommPerSeat;

      // Price markup net calculation
      const markup = order.price_markup || 0;
      const markupTax = order.markup_tax_percent !== undefined ? order.markup_tax_percent : 25;
      const markupFee = order.markup_fee_amount !== undefined ? order.markup_fee_amount : Math.round((markup * markupTax) / 100);
      const markupNet = Math.max(0, markup - markupFee);

      // Discount amount calculation
      let discountAmount = 0;
      if (order.discount_type === 'percent') {
        discountAmount = Math.round(((order.adult_count * (selectedTour?.price_adult || 0) + order.child_count * (selectedTour?.price_child || 0)) * (order.discount_value || 0)) / 100);
      } else if (order.discount_type === 'amount') {
        discountAmount = order.discount_value || 0;
      }

      let netComm = Math.max(0, baseTotalComm + markupNet - discountAmount);
      if (order.agent_commission_amount !== undefined && order.agent_commission_amount > 0) {
        netComm = order.agent_commission_amount;
      } else if (order.net_commission_amount !== undefined && order.net_commission_amount > 0) {
        netComm = Math.max(order.net_commission_amount, netComm);
      } else if (!isAgentOrCTV && markupNet === 0) {
        netComm = 0;
      }

      return sum + netComm;
    }, 0);
  }, [selectedTourOrders, selectedTour]);

  // Keep commissionAmount always synchronized with totalBookingCommissions automatically
  React.useEffect(() => {
    if (selectedTourId) {
      if (selectedTourOrders.length > 0) {
        setCommissionAmount(totalBookingCommissions);
      } else {
        setCommissionAmount(0);
      }
    }
  }, [selectedTourId, selectedTourOrders, totalBookingCommissions]);

  // Keep track of the last loaded tourId and serialized costs to prevent overwriting user edits and avoid infinite render loops
  const lastLoadedRef = React.useRef<{ tourId: string | null; serializedCosts: string | null }>({
    tourId: null,
    serializedCosts: null
  });

  // Load cost data when a tour is selected or when the saved costs are updated on context/server
  const handleSelectTour = (tour: Tour) => {
    if (currentRole === 'sale_leader' && (!tour.tour_type || tour.tour_type === 'internal')) {
      toast.error('Sale Leader không có quyền xem chi phí và lãi lỗ của Tour tự vận hành.');
      return;
    }
    setSelectedTourId(tour.id);
    
    // Reset input fields
    setNewSupplierName('');
    setNewSupplierAmount('');
    setNewPartnerName('');
    setNewPartnerAmountToPay('');
    setNewPartnerStatus('unpaid');
    setNewPartnerVoucherUrl('');
  };

  React.useEffect(() => {
    if (!selectedTourId) return;

    const existingCosts = tourCosts.find(c => c.tourId === selectedTourId);
    
    // Serialize only fields we manage to detect external changes (e.g. database sync)
    const serializedExisting = existingCosts 
      ? JSON.stringify({
          flightAmount: existingCosts.flightAmount,
          insuranceAmount: existingCosts.insuranceAmount,
          tourGuideAmount: existingCosts.tourGuideAmount,
          giftAmount: existingCosts.giftAmount,
          commissionAmount: existingCosts.commissionAmount,
          advertisingAmount: existingCosts.advertisingAmount,
          otherAmount: existingCosts.otherAmount,
          visaAmount: existingCosts.visaAmount,
          landtours: existingCosts.landtours,
          partnerPayments: existingCosts.partnerPayments
        })
      : 'empty';

    const isTourChanged = lastLoadedRef.current.tourId !== selectedTourId;
    if (
      isTourChanged || 
      (!isEditingCosts && lastLoadedRef.current.serializedCosts !== serializedExisting)
    ) {
      // Update ref immediately (mutating ref does not trigger render)
      lastLoadedRef.current = {
        tourId: selectedTourId,
        serializedCosts: serializedExisting
      };

      if (isTourChanged) {
        setIsEditingCosts(false);
      }

      if (existingCosts) {
        setFlightAmount(Math.max(0, existingCosts.flightAmount || 0));
        setInsuranceAmount(Math.max(0, existingCosts.insuranceAmount || 0));
        setTourGuideAmount(Math.max(0, existingCosts.tourGuideAmount || 0));
        setGiftAmount(Math.max(0, existingCosts.giftAmount || 0));
        const commToSet = selectedTourOrders.length > 0 
          ? totalBookingCommissions 
          : Math.max(0, existingCosts.commissionAmount || 0);
        setCommissionAmount(commToSet);
        setAdvertisingAmount(Math.max(0, existingCosts.advertisingAmount || 0));
        setOtherAmount(Math.max(0, existingCosts.otherAmount || 0));
        setVisaAmount(Math.max(0, existingCosts.visaAmount || 0));
        setLandtours(existingCosts.landtours || []);

        const loadedPayments = existingCosts.partnerPayments || [];
        const synced = getAutoGeneratedPaymentsList(loadedPayments, {
          flightAmount: Math.max(0, existingCosts.flightAmount || 0),
          insuranceAmount: Math.max(0, existingCosts.insuranceAmount || 0),
          tourGuideAmount: Math.max(0, existingCosts.tourGuideAmount || 0),
          giftAmount: Math.max(0, existingCosts.giftAmount || 0),
          commissionAmount: commToSet,
          advertisingAmount: Math.max(0, existingCosts.advertisingAmount || 0),
          visaAmount: Math.max(0, existingCosts.visaAmount || 0),
          otherAmount: Math.max(0, existingCosts.otherAmount || 0),
          landtours: existingCosts.landtours || []
        });
        setPartnerPayments(synced);
      } else {
        // Initialize with default/zeros or pre-populated values
        setFlightAmount(0);
        setInsuranceAmount(0);
        setTourGuideAmount(0);
        setGiftAmount(0);
        const computedComm = totalBookingCommissions;
        setCommissionAmount(computedComm);
        setAdvertisingAmount(0);
        setOtherAmount(0);
        setVisaAmount(0);
        setLandtours([]);

        const synced = getAutoGeneratedPaymentsList([], {
          flightAmount: 0,
          insuranceAmount: 0,
          tourGuideAmount: 0,
          giftAmount: 0,
          commissionAmount: computedComm,
          advertisingAmount: 0,
          visaAmount: 0,
          otherAmount: 0,
          landtours: []
        });
        setPartnerPayments(synced);
        setIsEditingCosts(true);
      }
    }
  }, [selectedTourId, tourCosts, tours]);

  // Add landtour NCC item
  const handleAddLandtour = async () => {
    if (!newSupplierName.trim()) {
      toast.error('Vui lòng nhập tên nhà cung cấp Landtour!');
      return;
    }
    if (newSupplierAmount === '' || newSupplierAmount <= 0) {
      toast.error('Vui lòng nhập số tiền hợp lệ!');
      return;
    }

    const newItem: LandtourCost = {
      id: Math.random().toString(36).substring(2, 9),
      supplierName: newSupplierName.trim(),
      amount: Number(newSupplierAmount),
      updatedAt: new Date().toISOString()
    };

    const updatedLandtours = [...landtours, newItem];
    setLandtours(updatedLandtours);
    setNewSupplierName('');
    setNewSupplierAmount('');

    if (selectedTourId) {
      await updateTourCost(selectedTourId, {
        tourId: selectedTourId,
        flightAmount,
        insuranceAmount,
        tourGuideAmount,
        giftAmount,
        commissionAmount,
        advertisingAmount,
        visaAmount,
        otherAmount,
        landtours: updatedLandtours,
        partnerPayments
      });
    }

    toast.success('Đã thêm nhà cung cấp Landtour!');
  };

  // Delete landtour item
  const handleDeleteLandtour = async (id: string) => {
    const updatedLandtours = landtours.filter(item => item.id !== id);
    setLandtours(updatedLandtours);

    if (selectedTourId) {
      await updateTourCost(selectedTourId, {
        tourId: selectedTourId,
        flightAmount,
        insuranceAmount,
        tourGuideAmount,
        giftAmount,
        commissionAmount,
        advertisingAmount,
        visaAmount,
        otherAmount,
        landtours: updatedLandtours,
        partnerPayments
      });
    }

    toast.success('Đã xóa nhà cung cấp Landtour');
  };

  // Upload Voucher File
  const handleUploadVoucher = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!selectedTour) {
      toast.error('Vui lòng chọn Tour trước khi tải chứng từ!');
      return;
    }

    setIsUploadingVoucher(true);
    const toastId = toast.loading('Đang tải chứng từ lên kho lưu trữ...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      // Use the unique tour code as directory/orderCode category
      formData.append('orderCode', selectedTour.code);
      formData.append('tourCode', selectedTour.code);

      const response = await fetch('/api/upload-invoice-receipt', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errText = await response.text();
        let errMsg = 'Lỗi tải file lên server';
        try {
          const errObj = JSON.parse(errText);
          if (errObj.error) errMsg = errObj.error;
        } catch {}
        throw new Error(errMsg);
      }

      const resText = await response.text();
      let result;
      try {
        result = JSON.parse(resText);
      } catch {
        throw new Error('Định dạng phản hồi từ máy chủ không đúng.');
      }
      setNewPartnerVoucherUrl(result.url);
      toast.success('Tải chứng từ lên thành công!', { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error(`Không thể tải file: ${err.message || 'Lỗi không xác định'}`, { id: toastId });
    } finally {
      setIsUploadingVoucher(false);
    }
  };

  // Add partner payment item
  const handleAddPartnerPayment = () => {
    if (!newPartnerName.trim()) {
      toast.error('Vui lòng nhập tên đối tác cung cấp dịch vụ!');
      return;
    }
    if (newPartnerAmountToPay === '' || newPartnerAmountToPay <= 0) {
      toast.error('Vui lòng nhập số tiền cần thanh toán!');
      return;
    }

    const newItem: PartnerPayment = {
      id: Math.random().toString(36).substring(2, 9),
      partnerName: newPartnerName.trim(),
      amountToPay: Number(newPartnerAmountToPay),
      status: newPartnerStatus,
      voucherUrl: newPartnerVoucherUrl || undefined
    };

    setPartnerPayments(prev => [...prev, newItem]);
    setNewPartnerName('');
    setNewPartnerAmountToPay('');
    setNewPartnerStatus('unpaid');
    setNewPartnerVoucherUrl('');
    toast.success('Đã thêm thanh toán đối tác!');
  };

  // Delete partner payment item
  const handleDeletePartnerPayment = async (id: string) => {
    const target = partnerPayments.find(item => item.id === id);
    if (target) {
      const targetInstallments = target.installments || [];
      const hasInstallments = targetInstallments.length > 0;
      const targetPaid = targetInstallments.reduce((sum, inst) => sum + (inst.amount || 0), 0);
      const isPaidOrPartial = target.status === 'paid' || target.status === 'partially_paid' || targetPaid > 0;
      const hasInvoiceOrProof = Boolean(target.invoiceId || target.proofUrl);

      if (hasInstallments || isPaidOrPartial || hasInvoiceOrProof) {
        toast.error('Thẻ thanh toán đã ghi nhận đợt thanh toán, không thể xóa!');
        return;
      }
    }

    const updated = partnerPayments.filter(item => item.id !== id);
    setPartnerPayments(updated);
    if (selectedTourId) {
      await updateTourCost(selectedTourId, {
        tourId: selectedTourId,
        flightAmount,
        insuranceAmount,
        tourGuideAmount,
        giftAmount,
        commissionAmount,
        advertisingAmount,
        visaAmount,
        otherAmount,
        landtours,
        partnerPayments: updated
      });
    }
    toast.success('Đã xóa khoản thanh toán đối tác');
  };

  // Lấy hóa đơn liên kết của khoản thanh toán đối tác
  const getLinkedInvoice = (invoiceId?: string) => {
    if (!invoiceId) return null;
    return invoices.find(inv => inv.id === invoiceId) || null;
  };

  // Tự động đồng bộ danh sách thẻ thanh toán đối tác dựa trên chi phí đã khai báo
  const getAutoGeneratedPaymentsList = (
    currentPayments: PartnerPayment[],
    costs: {
      flightAmount: number;
      insuranceAmount: number;
      tourGuideAmount: number;
      giftAmount: number;
      commissionAmount: number;
      advertisingAmount: number;
      visaAmount: number;
      otherAmount: number;
      landtours: LandtourCost[];
    }
  ): PartnerPayment[] => {
    const result = [...currentPayments];

    const syncCategory = (partnerName: string, amountToPay: number) => {
      const pNameLower = partnerName.trim().toLowerCase();
      const existingIndex = result.findIndex(p => {
        const nameLower = (p.partnerName || '').trim().toLowerCase();
        if (nameLower === pNameLower) return true;
        if (pNameLower.includes('đại lý') && nameLower.includes('đại lý')) return true;
        return false;
      });

      if (amountToPay <= 0) {
        if (existingIndex >= 0) {
          const p = result[existingIndex];
          const hasInstallments = p.installments && p.installments.length > 0;
          const isPaid = p.status === 'paid' || p.status === 'partially_paid';
          if (!hasInstallments && !isPaid) {
            result.splice(existingIndex, 1);
          } else {
            result[existingIndex] = { ...p, amountToPay: 0 };
          }
        }
        return;
      }

      if (existingIndex >= 0) {
        // Cập nhật số tiền nếu có thay đổi
        result[existingIndex] = {
          ...result[existingIndex],
          partnerName: partnerName,
          amountToPay: amountToPay
        };
      } else {
        // Tạo thẻ thanh toán mới
        result.push({
          id: Math.random().toString(36).substring(2, 9),
          partnerName: partnerName,
          amountToPay: amountToPay,
          status: 'unpaid',
          installments: []
        });
      }
    };

    syncCategory('Hãng hàng không / Đại lý vé máy bay', costs.flightAmount);
    syncCategory('Công ty Bảo hiểm du lịch', costs.insuranceAmount);
    syncCategory('Hướng dẫn viên (Tạm ứng chi phí điều hành Tour)', costs.tourGuideAmount);
    syncCategory('Đối tác cung ứng quà tặng du lịch', costs.giftAmount);
    syncCategory('Đại lý (Hoa hồng bán tour)', costs.commissionAmount);
    syncCategory('Đối tác Quảng cáo / Marketing', costs.advertisingAmount);
    syncCategory('Nhà cung cấp dịch vụ Visa', (costs.visaAmount || 0) * totalConfirmedPassengers);
    syncCategory('Chi phí vận hành khác', costs.otherAmount);

    costs.landtours.forEach(lt => {
      if (lt.amount > 0) {
        syncCategory(`Landtour: ${lt.supplierName}`, lt.amount);
      }
    });

    // Tự động đồng bộ khoản thanh toán Net nộp cho Đối tác nhận khách (đối với Tour đối tác / gửi khách)
    if (selectedTour && (selectedTour.tour_type === 'partner' || selectedTour.tour_type === 'outsourced') && (selectedTour.partner_net_cost || 0) > 0) {
      const partnerLabel = `Thanh toán đối tác: ${selectedTour.partner_company_name || selectedTour.partner_name || 'Đối tác nhận khách'}`;
      const partnerNetTotal = (selectedTour.partner_net_cost || 0) * totalConfirmedPassengers;
      syncCategory(partnerLabel, partnerNetTotal);
    }

    // Lọc bỏ các thẻ Landtour chưa thanh toán nếu NCC Landtour tương ứng đã bị xóa
    const currentLandtourNames = new Set(
      costs.landtours.map(lt => `landtour: ${lt.supplierName.trim().toLowerCase()}`)
    );
    const filteredResult = result.filter(p => {
      const name = p.partnerName.trim().toLowerCase();
      if (name.startsWith('landtour:')) {
        const isStillInLandtours = currentLandtourNames.has(name);
        const hasInstallments = p.installments && p.installments.length > 0;
        const isPaid = p.status === 'paid' || p.status === 'partially_paid';
        if (!isStillInLandtours && !hasInstallments && !isPaid) {
          return false;
        }
      }
      return true;
    });

    return filteredResult;
  };

  // Tự động khởi tạo danh sách thanh toán đối tác dựa trên chi phí đã khai báo phía trên
  const handleAutoGeneratePayments = () => {
    if (!selectedTourId) {
      toast.error('Vui lòng chọn Tour trước khi tự động tạo khoản thanh toán!');
      return;
    }

    const synced = getAutoGeneratedPaymentsList(partnerPayments, {
      flightAmount,
      insuranceAmount,
      tourGuideAmount,
      giftAmount,
      commissionAmount,
      advertisingAmount,
      visaAmount,
      otherAmount,
      landtours
    });

    const newCount = synced.length - partnerPayments.length;
    setPartnerPayments(synced);

    if (newCount > 0) {
      toast.success(`Đã tự động khởi tạo thêm ${newCount} thẻ thanh toán đối tác từ chi phí!`);
    } else {
      toast.success('Đã cập nhật/đồng bộ thành công danh sách thẻ thanh toán đối tác!');
    }
  };

  // Upload ảnh xác nhận (Proof image / UNC do Điều hành upload)
  const handleUploadProofImage = async (
    paymentId: string, 
    file: File, 
    installmentId?: string
  ) => {
    if (!selectedTour) {
      toast.error('Vui lòng chọn Tour trước khi tải ảnh xác nhận!');
      return;
    }

    const uploadKey = installmentId ? `${paymentId}_${installmentId}` : paymentId;
    setIsUploadingProofFor(uploadKey);
    const toastId = toast.loading('Đang tải ảnh xác nhận lên...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('orderCode', selectedTour.code || 'TOUR');
      formData.append('tourCode', selectedTour.code || 'TOUR');

      const res = await fetch('/api/upload-invoice-receipt', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errText = await res.text();
        let errMsg = 'Lỗi upload ảnh';
        try {
          const errObj = JSON.parse(errText);
          if (errObj.error) errMsg = errObj.error;
        } catch {}
        throw new Error(errMsg);
      }

      const resText = await res.text();
      let resData;
      try { resData = JSON.parse(resText); } catch { throw new Error('Định dạng phản hồi từ máy chủ không đúng.'); }
      const fileUrl = resData.url;

      let targetInvoiceId: string | undefined;
      let updatedPaymentsList: PartnerPayment[] = [];
      if (installmentId) {
        updatedPaymentsList = partnerPayments.map(p => {
          if (p.id !== paymentId) return p;
          const updatedInsts = (p.installments || []).map(inst => {
            if (inst.id === installmentId) {
              targetInvoiceId = inst.invoice_id;
              return { ...inst, proof_url: fileUrl };
            }
            return inst;
          });
          return { ...p, installments: updatedInsts };
        });
      } else {
        updatedPaymentsList = partnerPayments.map(p => {
          if (p.id !== paymentId) return p;
          targetInvoiceId = p.invoiceId;
          return { ...p, proofUrl: fileUrl };
        });
      }

      setPartnerPayments(updatedPaymentsList);

      if (selectedTourId) {
        await updateTourCost(selectedTourId, {
          tourId: selectedTourId,
          flightAmount,
          insuranceAmount,
          tourGuideAmount,
          giftAmount,
          commissionAmount,
          advertisingAmount,
          visaAmount,
          otherAmount,
          landtours,
          partnerPayments: updatedPaymentsList
        });
      }

      if (targetInvoiceId) {
        await uploadInvoiceProof(targetInvoiceId, fileUrl);
      }

      toast.success('Đã tải lên ảnh xác nhận thành công!', { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error(`Không thể tải file: ${err.message || 'Lỗi không xác định'}`, { id: toastId });
    } finally {
      setIsUploadingProofFor(null);
    }
  };

  // Thêm đợt thanh toán cho thẻ thanh toán đối tác
  const handleAddInstallment = async (paymentId: string) => {
    const amount = Number(instAmountMap[paymentId] || 0);
    if (amount <= 0) {
      toast.error('Vui lòng nhập số tiền thanh toán hợp lệ lớn hơn 0!');
      return;
    }

    const method = instMethodMap[paymentId] || 'Chuyển khoản';
    const date = instDateMap[paymentId] || new Date().toISOString().substring(0, 10);
    const note = instNoteMap[paymentId] || '';
    const proofUrl = instProofUrlMap[paymentId] || undefined;

    const bankName = instBankNameMap[paymentId] || '';
    const accountNumber = instAccountNumberMap[paymentId] || '';
    const accountName = instAccountNameMap[paymentId] || '';

    if (method === 'Chuyển khoản') {
      if (!bankName.trim() || !accountNumber.trim() || !accountName.trim()) {
        toast.error('Vui lòng điền đầy đủ thông tin tài khoản chuyển khoản (Ngân hàng, Số TK, Chủ TK)!');
        return;
      }
    }

    const selectedTour = selectedTourId ? tours.find(t => t.id === selectedTourId) : null;

    const updatedPayments = await Promise.all(partnerPayments.map(async p => {
      if (p.id !== paymentId) return p;

      // Tạo phiếu chi cho đợt thanh toán này gửi sang Kế toán
      let instInvoiceId: string | undefined = undefined;
      if (selectedTour) {
        try {
          const newInvoice = await createInvoiceReceipt({
            order_id: null,
            amount,
            type: 'payment',
            payment_method: method,
            description: `[Đợt chi đối tác] Thanh toán đợt cho "${p.partnerName}" - Tour: "${selectedTour.code} - ${selectedTour.name}"${note ? ` (${note})` : ''}`,
            refund_method: method === 'Chuyển khoản' ? 'transfer' : 'cash',
            refund_bank_name: bankName,
            refund_account_number: accountNumber,
            refund_account_name: accountName,
            created_by: profile?.full_name || 'Điều hành'
          });
          if (newInvoice && newInvoice.id) {
            instInvoiceId = newInvoice.id;
          }
        } catch (e) {
          console.error('Lỗi tự động tạo phiếu chi đợt thanh toán:', e);
        }
      }

      const currentInstallments = p.installments || [];
      const newInst: PartnerPaymentInstallment = {
        id: Math.random().toString(36).substring(2, 9),
        amount,
        payment_method: method,
        payment_date: date,
        note,
        proof_url: proofUrl,
        invoice_id: instInvoiceId,
        status: 'pending',
        bank_name: bankName,
        account_number: accountNumber,
        account_name: accountName,
        created_at: new Date().toISOString()
      };

      const updatedInstallments = [...currentInstallments, newInst];
      // Chỉ tính tổng đã thanh toán từ các đợt ĐÃ ĐƯỢC KẾ TOÁN DUYỆT CHI
      const approvedInsts = updatedInstallments.filter(inst => {
        if (inst.invoice_id) {
          const inv = invoices.find(i => i.id === inst.invoice_id);
          if (inv) return inv.status === 'approved';
        }
        return inst.status === 'approved';
      });
      const totalPaid = approvedInsts.reduce((sum, inst) => sum + (inst.amount || 0), 0);

      let newStatus: PartnerPayment['status'] = 'unpaid';
      if (totalPaid >= p.amountToPay) {
        newStatus = 'paid';
      } else if (totalPaid > 0) {
        newStatus = 'partially_paid';
      }

      return {
        ...p,
        invoiceId: p.invoiceId || instInvoiceId,
        installments: updatedInstallments,
        status: newStatus
      };
    }));

    setPartnerPayments(updatedPayments);

    if (selectedTourId) {
      await updateTourCost(selectedTourId, {
        tourId: selectedTourId,
        flightAmount,
        insuranceAmount,
        tourGuideAmount,
        giftAmount,
        commissionAmount,
        advertisingAmount,
        visaAmount,
        otherAmount,
        landtours,
        partnerPayments: updatedPayments
      });
    }

    setInstAmountMap(prev => ({ ...prev, [paymentId]: '' }));
    setInstNoteMap(prev => ({ ...prev, [paymentId]: '' }));
    setInstProofUrlMap(prev => ({ ...prev, [paymentId]: '' }));
    setInstBankNameMap(prev => ({ ...prev, [paymentId]: '' }));
    setInstAccountNumberMap(prev => ({ ...prev, [paymentId]: '' }));
    setInstAccountNameMap(prev => ({ ...prev, [paymentId]: '' }));

    toast.success('Đã tạo phiếu chi cho đợt thanh toán và gửi tới Kế toán chờ duyệt chi!');
  };

  // Xóa đợt thanh toán
  const handleDeleteInstallment = async (paymentId: string, installmentId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa đợt thanh toán này? Thao tác này sẽ tự động xóa phiếu chi tương ứng bên Kế toán.')) {
      return;
    }

    const targetPayment = partnerPayments.find(p => p.id === paymentId);
    const targetInst = targetPayment?.installments?.find(inst => inst.id === installmentId);

    if (targetInst?.invoice_id) {
      try {
        await deleteInvoiceReceipt(targetInst.invoice_id);
      } catch (err) {
        console.error('Lỗi khi xóa phiếu chi liên kết:', err);
      }
    }

    const updatedPayments = partnerPayments.map(p => {
      if (p.id !== paymentId) return p;

      const updatedInstallments = (p.installments || []).filter(inst => inst.id !== installmentId);
      const approvedInsts = updatedInstallments.filter(inst => {
        if (inst.invoice_id) {
          const inv = invoices.find(i => i.id === inst.invoice_id && i.id !== targetInst?.invoice_id);
          if (inv) return inv.status === 'approved';
        }
        return inst.status === 'approved';
      });
      const totalPaid = approvedInsts.reduce((sum, inst) => sum + (inst.amount || 0), 0);

      let newStatus: PartnerPayment['status'] = 'unpaid';
      if (totalPaid >= p.amountToPay) {
        newStatus = 'paid';
      } else if (totalPaid > 0) {
        newStatus = 'partially_paid';
      }

      return {
        ...p,
        installments: updatedInstallments,
        status: newStatus
      };
    });

    setPartnerPayments(updatedPayments);

    if (selectedTourId) {
      await updateTourCost(selectedTourId, {
        tourId: selectedTourId,
        flightAmount,
        insuranceAmount,
        tourGuideAmount,
        giftAmount,
        commissionAmount,
        advertisingAmount,
        visaAmount,
        otherAmount,
        landtours,
        partnerPayments: updatedPayments
      });
    }

    toast.success('Đã xóa đợt thanh toán và cập nhật chi phí thành công!');
  };

  // Gửi đề xuất/yêu cầu thanh toán sang bộ phận kế toán dưới dạng phiếu chi
  const handleSendPaymentRequest = async (item: PartnerPayment) => {
    if (!selectedTourId) {
      toast.error('Vui lòng chọn Tour trước khi gửi yêu cầu chi!');
      return;
    }

    const selectedTour = tours.find(t => t.id === selectedTourId);
    if (!selectedTour) return;

    const isOperatorOrAdmin = currentRole === 'admin' || currentRole === 'operator';
    if (!isOperatorOrAdmin) {
      toast.error('Chỉ tài khoản Điều hành hoặc Quản trị viên mới có quyền đề xuất chi!');
      return;
    }

    const toastId = toast.loading(`Đang khởi tạo yêu cầu chi cho đối tác "${item.partnerName}"...`);

    try {
      // 1. Tạo Invoice (loại: payment, status: pending)
      const invoiceData = {
        order_id: null,
        amount: item.amountToPay,
        type: 'payment' as const,
        payment_method: 'Chuyển khoản',
        description: `[Chi đối tác] Thanh toán cho "${item.partnerName}" - Tour: "${selectedTour.code} - ${selectedTour.name}"`,
        created_by: profile?.full_name || 'Điều hành'
      };

      const newInvoice = await createInvoiceReceipt(invoiceData);

      if (!newInvoice || !newInvoice.id) {
        throw new Error('Không nhận được thông tin phản hồi từ hệ thống hóa đơn!');
      }

      // 2. Cập nhật partnerPayments trong state
      const updatedPayments = partnerPayments.map(p => {
        if (p.id === item.id) {
          return {
            ...p,
            invoiceId: newInvoice.id,
            status: 'unpaid' as const
          };
        }
        return p;
      });

      setPartnerPayments(updatedPayments);

      // 3. Tự động lưu bảng kê chi phí xuống Database để đồng bộ ngay lập tức!
      await updateTourCost(selectedTour.id, {
        tourId: selectedTour.id,
        flightAmount,
        insuranceAmount,
        tourGuideAmount,
        giftAmount,
        commissionAmount,
        advertisingAmount,
        visaAmount,
        otherAmount,
        landtours,
        partnerPayments: updatedPayments
      });

      toast.success(`Đã gửi yêu cầu chi ${formatVND(item.amountToPay)} tới kế toán thành công! Mã phiếu chi: ${newInvoice.invoice_code || 'N/A'}`, { id: toastId });
    } catch (err: any) {
      console.error('Lỗi khi gửi yêu cầu chi:', err);
      toast.error(`Gửi yêu cầu chi thất bại: ${err.message || 'Lỗi kết nối database'}`, { id: toastId });
    }
  };

  const isOutsourcedTour = selectedTour?.tour_type === 'outsourced' || selectedTour?.tour_type === 'partner';

  const totalConfirmedPassengers = useMemo(() => {
    return selectedTourOrders.reduce((sum, o) => sum + (o.adult_count || 0) + (o.child_count || 0), 0);
  }, [selectedTourOrders]);

  const outsourcedPartnerNetTotal = useMemo(() => {
    if (!isOutsourcedTour || !selectedTour) return 0;
    return (selectedTour.partner_net_cost || 0) * totalConfirmedPassengers;
  }, [isOutsourcedTour, selectedTour, totalConfirmedPassengers]);

  // Total direct costs calculated
  const totalCosts = useMemo(() => {
    const totalVisaExpense = (visaAmount || 0) * totalConfirmedPassengers;
    if (isOutsourcedTour) {
      return outsourcedPartnerNetTotal + commissionAmount + totalVisaExpense + otherAmount;
    }
    const sumLandtours = landtours.reduce((sum, item) => sum + item.amount, 0);
    const sumExtraPartners = partnerPayments
      .filter(p => {
        const name = (p.partnerName || '').trim().toLowerCase();
        const isStandard = [
          'hãng hàng không / đại lý vé máy bay',
          'công ty bảo hiểm du lịch',
          'hướng dẫn viên (tạm ứng chi phí điều hành tour)',
          'đối tác cung ứng quà tặng du lịch',
          'đại lý (hoa hồng bán tour)',
          'đại lý & ctv (hoa hồng bán tour)',
          'đối tác quảng cáo / marketing',
          'nhà cung cấp dịch vụ visa',
          'chi phí vận hành khác'
        ].includes(name) || name.startsWith('landtour:');
        return !isStandard;
      })
      .reduce((sum, item) => sum + item.amountToPay, 0);
    
    return (
      flightAmount +
      insuranceAmount +
      tourGuideAmount +
      giftAmount +
      commissionAmount +
      advertisingAmount +
      totalVisaExpense +
      otherAmount +
      sumLandtours +
      sumExtraPartners
    );
  }, [
    isOutsourcedTour,
    outsourcedPartnerNetTotal,
    flightAmount,
    insuranceAmount,
    tourGuideAmount,
    giftAmount,
    commissionAmount,
    advertisingAmount,
    otherAmount,
    visaAmount,
    totalConfirmedPassengers,
    landtours,
    partnerPayments
  ]);

  // Save changes
  const handleSaveCosts = async () => {
    if (!selectedTourId) return;

    const isOperatorOrAdmin = currentRole === 'admin' || currentRole === 'operator';
    if (!isOperatorOrAdmin) {
      toast.error('Chỉ tài khoản Điều hành hoặc Quản trị viên mới có quyền cập nhật chi phí Tour!');
      return;
    }

    const toastId = toast.loading('Đang lưu bảng chi phí Tour...');

    // Tự động đồng bộ thẻ thanh toán đối tác với tất cả khoản chi phí đã nhập (bao gồm Landtour)
    const syncedPartnerPayments = getAutoGeneratedPaymentsList(partnerPayments, {
      flightAmount,
      insuranceAmount,
      tourGuideAmount,
      giftAmount,
      commissionAmount,
      advertisingAmount,
      visaAmount,
      otherAmount,
      landtours
    });

    setPartnerPayments(syncedPartnerPayments);

    try {
      await updateTourCost(selectedTourId, {
        tourId: selectedTourId,
        flightAmount,
        insuranceAmount,
        tourGuideAmount,
        giftAmount,
        commissionAmount,
        advertisingAmount,
        visaAmount,
        otherAmount,
        landtours,
        partnerPayments: syncedPartnerPayments
      });

      setIsEditingCosts(false);
      toast.success('Đã lưu bảng chi phí Tour và tự động đồng bộ thẻ thanh toán đối tác!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Đã xảy ra lỗi khi lưu chi phí.', { id: toastId });
    }
  };

  // Collected Revenue from Receipts (customer payments)
  const collectedRevenue = useMemo(() => {
    if (selectedTourOrders.length === 0) return 0;
    const orderIds = selectedTourOrders.map(o => o.id);
    return invoices
      .filter(inv => inv.type === 'receipt' && inv.status === 'approved' && inv.order_id && orderIds.includes(inv.order_id))
      .reduce((sum, inv) => sum + (inv.amount || 0), 0);
  }, [invoices, selectedTourOrders]);

  const remainingRevenue = Math.max(0, totalRevenue - collectedRevenue);

  // Paid Costs to Suppliers / Partners
  const paidCosts = useMemo(() => {
    const partnerInvIds = partnerPayments.map(p => p.invoiceId).filter(Boolean);
    return invoices
      .filter(inv => inv.type === 'payment' && inv.status === 'approved')
      .filter(inv => {
        if (inv.id && partnerInvIds.includes(inv.id as string)) return true;
        if (selectedTour?.code && inv.description?.includes(selectedTour.code)) return true;
        return false;
      })
      .reduce((sum, inv) => sum + (inv.amount || 0), 0);
  }, [invoices, partnerPayments, selectedTour]);

  const remainingCosts = Math.max(0, totalCosts - paidCosts);

  const netProfit = totalRevenue - totalCosts;
  const marginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {!selectedTour ? (
        /* OVERVIEW VIEW: GRID OF TOUR CARDS MATCHING KẾ TOÁN */
        <div className="space-y-6">
          {/* Header & Comprehensive Multi-Criteria Filter Panel */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
            {/* Top Row: Title & Aggregate Summary Cards for Filtered Tours */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-blue-600" />
                  Danh sách Tour & Bảng hạch toán Chi phí - Lãi lỗ
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Chọn một tour bên dưới để mở chi tiết bảng kê chi phí, hoa hồng, landtour và xem báo cáo lãi lỗ thực tế.
                </p>
              </div>

              {/* Aggregate Summary Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
                <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200/80 text-left">
                  <p className="text-[10px] font-bold text-gray-500 uppercase">Tổng số tour</p>
                  <p className="text-sm font-black text-gray-900 mt-0.5">{aggregateFilteredStats.count} tour</p>
                </div>
                <div className="bg-blue-50/60 p-2.5 rounded-lg border border-blue-150 text-left">
                  <p className="text-[10px] font-bold text-blue-600 uppercase">Doanh thu dự kiến</p>
                  <p className="text-xs font-black text-blue-800 mt-0.5 truncate">{formatVND(aggregateFilteredStats.totalRevenue)}</p>
                </div>
                <div className="bg-amber-50/60 p-2.5 rounded-lg border border-amber-150 text-left">
                  <p className="text-[10px] font-bold text-amber-700 uppercase">Tổng chi phí</p>
                  <p className="text-xs font-black text-amber-800 mt-0.5 truncate">{formatVND(aggregateFilteredStats.totalCosts)}</p>
                </div>
                <div className={`p-2.5 rounded-lg border text-left ${aggregateFilteredStats.totalNetProfit >= 0 ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800' : 'bg-rose-50/60 border-rose-200 text-rose-800'}`}>
                  <p className="text-[10px] font-bold uppercase">Lợi nhuận ròng</p>
                  <p className="text-xs font-black mt-0.5 truncate">{formatVND(aggregateFilteredStats.totalNetProfit)}</p>
                </div>
              </div>
            </div>

            {/* Filter Controls Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5">
              {/* 1. Keyword Search */}
              <div className="relative col-span-1 sm:col-span-2 md:col-span-1 xl:col-span-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-9 pl-9 pr-8 border border-slate-300 rounded-lg text-xs leading-normal focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white text-slate-800 placeholder:text-slate-400 font-medium transition-all"
                  placeholder="Tìm tên tour, mã tour, điểm đến..."
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* 2. Tour Type Filter */}
              <div>
                <CustomSelect
                  options={[
                    { value: 'all', label: 'Tất cả loại tour' },
                    { value: 'internal', label: 'Tour tự vận hành' },
                    { value: 'partner', label: 'Tour gửi đối tác (F2)' },
                    { value: 'private', label: 'Tour đoàn riêng' },
                  ]}
                  value={filterTourType}
                  onChange={setFilterTourType}
                  className="w-full"
                  buttonClassName="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white text-slate-800 font-semibold cursor-pointer transition-all"
                />
              </div>

              {/* 3. Departure Status Filter */}
              <div>
                <CustomSelect
                  options={[
                    { value: 'all', label: 'Tất cả trạng thái' },
                    { value: 'upcoming', label: 'Sắp khởi hành' },
                    { value: 'active', label: 'Đang chạy' },
                    { value: 'departed', label: 'Đã hoàn thành / Khởi hành' },
                    { value: 'cancelled', label: 'Đã hủy' },
                  ]}
                  value={filterStatus}
                  onChange={setFilterStatus}
                  className="w-full"
                  buttonClassName="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white text-slate-800 font-semibold cursor-pointer transition-all"
                />
              </div>

              {/* 4. Month Filter */}
              <div>
                <CustomSelect
                  options={[
                    { value: 'all', label: 'Tất cả tháng khởi hành' },
                    ...availableMonths.map(m => ({ value: m, label: `Tháng ${m}` }))
                  ]}
                  value={filterMonth}
                  onChange={setFilterMonth}
                  className="w-full"
                  buttonClassName="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white text-slate-800 font-semibold cursor-pointer transition-all"
                />
              </div>

              {/* 5. Category Filter */}
              <div>
                <CustomSelect
                  options={[
                    { value: 'all', label: 'Tất cả danh mục' },
                    ...categories.map(cat => ({ value: cat, label: cat }))
                  ]}
                  value={filterCategory}
                  onChange={setFilterCategory}
                  className="w-full"
                  buttonClassName="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white text-slate-800 font-semibold cursor-pointer transition-all"
                />
              </div>

              {/* 6. Profit / Loss Status Filter */}
              <div>
                <CustomSelect
                  options={[
                    { value: 'all', label: 'Tất cả hạch toán' },
                    { value: 'profit', label: 'Có lãi (Lợi nhuận > 0)' },
                    { value: 'loss', label: 'Bị lỗ (Lợi nhuận < 0)' },
                    { value: 'even', label: 'Hòa vốn / Chưa hạch toán' },
                  ]}
                  value={filterProfit}
                  onChange={setFilterProfit}
                  className="w-full"
                  buttonClassName="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white text-slate-800 font-semibold cursor-pointer transition-all"
                />
              </div>
            </div>

            {/* Active Filters Bar & Reset */}
            {isAnyFilterActive && (
              <div className="pt-2.5 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-bold text-gray-500 text-[11px] flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5 text-blue-600" /> Đang lọc theo:
                  </span>
                  {searchTerm && (
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-200 font-medium text-[11px] flex items-center gap-1">
                      Từ khóa: "{searchTerm}"
                      <X className="w-3 h-3 hover:text-red-500 cursor-pointer" onClick={() => setSearchTerm('')} />
                    </span>
                  )}
                  {filterTourType !== 'all' && (
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-200 font-medium text-[11px] flex items-center gap-1">
                      Loại: {filterTourType === 'internal' ? 'Tour tự vận hành' : filterTourType === 'partner' ? 'Tour gửi đối tác' : 'Tour đoàn riêng'}
                      <X className="w-3 h-3 hover:text-red-500 cursor-pointer" onClick={() => setFilterTourType('all')} />
                    </span>
                  )}
                  {filterStatus !== 'all' && (
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-200 font-medium text-[11px] flex items-center gap-1">
                      Trạng thái: {filterStatus === 'upcoming' ? 'Sắp khởi hành' : filterStatus === 'active' ? 'Đang chạy' : filterStatus === 'departed' ? 'Đã hoàn thành' : 'Đã hủy'}
                      <X className="w-3 h-3 hover:text-red-500 cursor-pointer" onClick={() => setFilterStatus('all')} />
                    </span>
                  )}
                  {filterMonth !== 'all' && (
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-200 font-medium text-[11px] flex items-center gap-1">
                      Tháng: {filterMonth}
                      <X className="w-3 h-3 hover:text-red-500 cursor-pointer" onClick={() => setFilterMonth('all')} />
                    </span>
                  )}
                  {filterCategory !== 'all' && (
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-200 font-medium text-[11px] flex items-center gap-1">
                      Danh mục: {filterCategory}
                      <X className="w-3 h-3 hover:text-red-500 cursor-pointer" onClick={() => setFilterCategory('all')} />
                    </span>
                  )}
                  {filterProfit !== 'all' && (
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-200 font-medium text-[11px] flex items-center gap-1">
                      Hạch toán: {filterProfit === 'profit' ? 'Có lãi' : filterProfit === 'loss' ? 'Bị lỗ' : 'Hòa vốn'}
                      <X className="w-3 h-3 hover:text-red-500 cursor-pointer" onClick={() => setFilterProfit('all')} />
                    </span>
                  )}
                </div>

                <button
                  onClick={resetAllFilters}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1 rounded-md transition-colors font-bold text-[11px] flex items-center gap-1 border border-red-200 cursor-pointer ml-auto"
                >
                  <FilterX className="w-3.5 h-3.5" />
                  <span>Xóa tất cả bộ lọc</span>
                </button>
              </div>
            )}
          </div>

          {/* Grid Tour Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTours.map(tour => {
              const stats = getTourSummaryStats(tour);
              const hasCosts = tourCosts.some(c => c.tourId === tour.id);

              return (
                <motion.div
                  key={tour.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all overflow-hidden flex flex-col"
                >
                  {/* Upper Section */}
                  <div className="p-5 border-b border-gray-100 flex-1 space-y-3">
                    <div>
                      <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 font-mono font-black text-xs px-2.5 py-1 rounded border border-blue-150">
                            <Tag className="w-3 h-3 text-blue-500" />
                            <span>{tour.code || 'CHUA_CO_MA'}</span>
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${stats.statusBadge.className}`}>
                            {stats.statusBadge.label}
                          </span>
                        </div>
                        {hasCosts && (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] px-2 py-0.5 rounded-full font-bold">
                            Đã lập phí
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2" title={tour.name}>
                        {tour.name}
                      </h4>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        {tour.start_date ? formatDateVi(tour.start_date) : '---'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                        {stats.tourOrders.length} bookings
                      </span>
                    </div>

                    {/* Cash & Profitability indicators */}
                    <div className="space-y-2 pt-2 border-t border-dashed border-gray-100">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500 font-medium">Doanh thu dự tính:</span>
                        <span className="font-extrabold text-gray-800">{formatVND(stats.totalRevenue)}</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-500 font-medium">Tiền đã thu:</span>
                          <span className="font-black text-emerald-600">{formatVND(stats.collectedRevenue)} ({stats.progressPercent}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-full rounded-full transition-all duration-300" 
                            style={{ width: `${Math.min(100, stats.progressPercent)}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-xs pt-0.5">
                        <span className="text-gray-500 font-medium">Lãi/lỗ tạm tính:</span>
                        <span className={`font-extrabold ${stats.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {stats.netProfit >= 0 ? '+' : ''}{formatVND(stats.netProfit)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Button Action */}
                  <div className="bg-gray-50 p-3.5 border-t border-gray-100">
                    <button
                      onClick={() => handleSelectTour(tour)}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <FolderOpen className="w-4 h-4" /> Mở chi tiết hạch toán
                    </button>
                  </div>
                </motion.div>
              );
            })}

            {filteredTours.length === 0 && (
              <div className="col-span-full bg-white p-12 text-center border border-gray-200 rounded-xl">
                <Folder className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm font-medium">Không tìm thấy tour nào phù hợp với từ khóa tìm kiếm.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* DETAIL VIEW FOR SELECTED TOUR */
        <div className="space-y-6">
          {/* Breadcrumb Navigation Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
              <button 
                onClick={() => setSelectedTourId(null)}
                className="hover:text-blue-600 cursor-pointer flex items-center gap-1 text-gray-600"
              >
                Trang tổng quan
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-blue-700 font-mono font-black bg-blue-50 px-2.5 py-1 rounded border border-blue-150 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-blue-600" />
                <span>{selectedTour.code}</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedTourId(null)}
                className="px-3.5 py-2 border border-gray-300 rounded-lg text-xs font-semibold hover:bg-gray-50 bg-white transition-all cursor-pointer flex items-center gap-1 text-gray-700"
              >
                Quay lại danh sách
              </button>
            </div>
          </div>

          {/* Tour Title Banner */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-md">{selectedTour.code}</span>
                  <span className="text-gray-400 font-mono text-xs">| Khởi hành: {selectedTour.start_date ? formatDateVi(selectedTour.start_date) : '---'}</span>
                </div>
                <h3 className="text-lg font-extrabold text-gray-900 mt-2">{selectedTour.name}</h3>
                <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                  <span>Số lượng đã bán: <strong className="text-slate-800 font-bold">{selectedTour.sold_seats || 0} khách</strong></span>
                  <span>•</span>
                  <span>Số booking: <strong className="text-slate-800 font-bold">{selectedTourOrders.length} bookings</strong></span>
                </div>
              </div>
              
              {currentRole !== 'admin' && currentRole !== 'operator' && (
                <div className="text-xs bg-yellow-50 text-yellow-800 border border-yellow-200 p-2.5 rounded-lg flex items-center gap-1.5 max-w-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-yellow-600" />
                  <span>Bạn đang ở chế độ xem. Chỉ Quản trị viên và Điều hành mới có quyền sửa chi phí.</span>
                </div>
              )}
            </div>
          </div>

            {/* Báo cáo Tài chính & Hạch toán Lãi lỗ (Thiết lập đồng bộ giao diện Kế toán) */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
              <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-blue-600" />
                  <h4 className="font-bold text-gray-900 text-sm">Báo cáo Tài chính & Lãi lỗ Tour</h4>
                </div>
                <span className="text-xs text-gray-500 font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                  Đồng bộ thời gian thực với Kế toán
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Panel 1: Revenue & Customer Collections */}
                <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <span className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> DOANH THU & TIỀN THU
                    </span>
                    <span className="text-[10px] text-blue-700 font-bold bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded">
                      Khách hàng
                    </span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">Tổng doanh thu (Bookings):</span>
                      <span className="font-extrabold text-gray-900 text-sm">{formatVND(totalRevenue)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">Khách đã nộp (Đã thu):</span>
                      <span className="font-black text-emerald-600 text-sm flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        {formatVND(collectedRevenue)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-200/80 pt-2 font-semibold">
                      <span className="text-gray-600">Còn lại cần thu (Công nợ):</span>
                      <span className="font-extrabold text-amber-600">{formatVND(remainingRevenue)}</span>
                    </div>
                  </div>
                </div>

                {/* Panel 2: Direct Costs & Partner Payments */}
                <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <span className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-purple-600" /> CHI PHÍ & THANH TOÁN
                    </span>
                    <span className="text-[10px] text-purple-700 font-bold bg-purple-50 border border-purple-200/60 px-2 py-0.5 rounded">
                      Đối tác / NCC
                    </span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">Tổng chi phí kê khai:</span>
                      <span className="font-extrabold text-gray-900 text-sm">{formatVND(totalCosts)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">Đã chi cho đối tác:</span>
                      <span className="font-black text-blue-600 text-sm flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-blue-500" />
                        {formatVND(paidCosts)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-200/80 pt-2 font-semibold">
                      <span className="text-gray-600">Còn nợ / Chưa chi:</span>
                      <span className="font-extrabold text-rose-600">{formatVND(remainingCosts)}</span>
                    </div>
                  </div>
                </div>

                {/* Panel 3: Net Profit & Margin */}
                <div className={`p-4 rounded-xl border space-y-3 shadow-2xs ${
                  netProfit >= 0 ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'
                }`}>
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <span className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 text-blue-600" /> LỢI NHUẬN GỘP (LÃI LỖ)
                    </span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${
                      netProfit >= 0 ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-rose-100 text-rose-800 border-rose-300'
                    }`}>
                      {marginPercent.toFixed(1)}% Tỷ suất
                    </span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-baseline mt-1">
                      <span className="text-gray-700 font-semibold">Lợi nhuận ròng dự tính:</span>
                      <span className={`text-base sm:text-lg font-black ${netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {netProfit >= 0 ? '+' : ''}{formatVND(netProfit)}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 leading-relaxed border-t border-slate-200/60 pt-2">
                      (Được tính tự động: Tổng giá trị booking trừ đi toàn bộ chi phí thực tế kê khai cho Tour).
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Fields & Lists Grouped in Section 1 */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
              <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                <h4 className="text-sm font-black uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-blue-600" /> 1. Chi phí vận hành, Hành chính & Landtour
                </h4>
                <span className="text-xs font-bold text-slate-500">
                  Tổng Mục 1: <strong className="text-blue-600 font-extrabold text-sm">{formatVND(isOutsourcedTour ? outsourcedPartnerNetTotal + commissionAmount + (visaAmount * totalConfirmedPassengers) + otherAmount : flightAmount + insuranceAmount + tourGuideAmount + giftAmount + commissionAmount + advertisingAmount + (visaAmount * totalConfirmedPassengers) + otherAmount + landtours.reduce((sum, item) => sum + item.amount, 0))}</strong>
                </span>
              </div>

              {isOutsourcedTour ? (
                <div className="p-5 rounded-2xl bg-indigo-50/70 border border-indigo-200/90 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-200/80 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                        <Handshake className="w-5 h-5" />
                      </span>
                      <div>
                        <h5 className="font-extrabold text-indigo-950 text-sm flex items-center gap-2">
                          TOUR GỬI ĐỐI TÁC VẬN HÀNH
                          <span className="text-[10px] font-bold bg-indigo-200/80 text-indigo-800 px-2 py-0.5 rounded-full border border-indigo-300">
                            Khóa bảng chi phí lẻ
                          </span>
                        </h5>
                        <p className="text-xs text-indigo-700">
                          Tour này do Công ty Đối tác trực tiếp tổ chức & điều hành: <strong className="text-indigo-950 font-bold">{selectedTour?.partner_company_name || selectedTour?.partner_name || 'Công ty đối tác'}</strong>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Auto-calculated Net Cost row */}
                  <div className="bg-white p-4 rounded-xl border border-indigo-150 shadow-2xs space-y-3">
                    <div className="text-xs font-extrabold text-indigo-950 uppercase tracking-wider flex items-center justify-between border-b border-slate-100 pb-2">
                      <span>Hạch toán Chi phí Net cố định nộp cho Đối tác</span>
                      <span className="text-indigo-700 text-sm font-black">{formatVND(outsourcedPartnerNetTotal)}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60">
                        <span className="text-slate-500 block text-[11px] font-medium">Đối tác vận hành:</span>
                        <span className="font-extrabold text-slate-900">{selectedTour?.partner_company_name || selectedTour?.partner_name || 'Chưa cập nhật'}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60">
                        <span className="text-slate-500 block text-[11px] font-medium font-medium">Tổng số khách đã chốt:</span>
                        <span className="font-extrabold text-blue-700">{totalConfirmedPassengers} người lớn & trẻ em</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60">
                        <span className="text-slate-500 block text-[11px] font-medium">Đơn giá Net / khách:</span>
                        <span className="font-extrabold text-indigo-700">{formatVND(selectedTour?.partner_net_cost || 0)}</span>
                      </div>
                    </div>

                    <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-between text-xs">
                      <span className="text-emerald-900 font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Lợi nhuận gộp định mức AD hưởng ({formatVND((selectedTour?.partner_retail_price || 0) - (selectedTour?.partner_net_cost || 0))}/khách x {totalConfirmedPassengers} khách):</span>
                      </span>
                      <span className="font-black text-emerald-700 text-sm">
                        +{formatVND(((selectedTour?.partner_retail_price || 0) - (selectedTour?.partner_net_cost || 0)) * totalConfirmedPassengers)}
                      </span>
                    </div>
                  </div>

                  {/* Additional costs for Outsourced / Partner Tour: Visa & Other costs */}
                  <div className="bg-white p-4 rounded-xl border border-indigo-150 shadow-2xs space-y-3">
                    <h6 className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 text-indigo-600" /> Chi phí Visa & Chi phí Khác phát sinh (nếu có)
                    </h6>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <FormattedNumberInput
                          label="Chi Phí Visa / Khách"
                          icon={<FileText className="w-3.5 h-3.5 text-slate-400" />}
                          value={visaAmount}
                          onChange={setVisaAmount}
                          placeholder="Nhập chi phí visa / khách..."
                          disabled={!isEditingCosts || (currentRole !== 'admin' && currentRole !== 'operator')}
                        />
                        <div className="mt-1 flex items-start gap-1.5 text-[11px] text-blue-900 bg-blue-50/90 px-2.5 py-1.5 rounded-lg border border-blue-200/90 shadow-2xs font-medium leading-tight">
                          <span className="font-bold text-blue-600 shrink-0 flex items-center gap-1"><Coins className="w-3 h-3" /> Tổng tiền Visa đoàn:</span>
                          <span className="font-extrabold text-blue-800">
                            {formatVND(visaAmount * totalConfirmedPassengers)}
                          </span>
                          <span className="text-slate-500 text-[10px]">({formatVND(visaAmount)}/khách × {totalConfirmedPassengers} khách)</span>
                        </div>
                      </div>

                      <div>
                        <FormattedNumberInput
                          label="Chi Phí Khác"
                          icon={<DollarSign className="w-3.5 h-3.5 text-slate-400" />}
                          value={otherAmount}
                          onChange={setOtherAmount}
                          placeholder="Nhập chi phí khác..."
                          disabled={!isEditingCosts || (currentRole !== 'admin' && currentRole !== 'operator')}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* General Incurred Costs Form */}
                <div className="space-y-4">
                  <h5 className="text-xs font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-slate-400" /> Chi phí vận hành chung
                  </h5>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    
                    <FormattedNumberInput
                      label="Vé Máy Bay"
                      icon={<Plane className="w-3.5 h-3.5 text-slate-400" />}
                      value={flightAmount}
                      onChange={setFlightAmount}
                      placeholder="Nhập tiền vé bay..."
                      disabled={!isEditingCosts || (currentRole !== 'admin' && currentRole !== 'operator')}
                    />

                    <FormattedNumberInput
                      label="Bảo Hiểm Du Lịch"
                      icon={<Shield className="w-3.5 h-3.5 text-slate-400" />}
                      value={insuranceAmount}
                      onChange={setInsuranceAmount}
                      placeholder="Nhập tiền bảo hiểm..."
                      disabled={!isEditingCosts || (currentRole !== 'admin' && currentRole !== 'operator')}
                    />

                    <FormattedNumberInput
                      label="Chi Phí Tour Guide (HDV)"
                      icon={<User className="w-3.5 h-3.5 text-slate-400" />}
                      value={tourGuideAmount}
                      onChange={setTourGuideAmount}
                      placeholder="Nhập tiền HDV..."
                      disabled={!isEditingCosts || (currentRole !== 'admin' && currentRole !== 'operator')}
                    />

                    <FormattedNumberInput
                      label="Quà Tặng Cho Khách"
                      icon={<Gift className="w-3.5 h-3.5 text-slate-400" />}
                      value={giftAmount}
                      onChange={setGiftAmount}
                      placeholder="Nhập tiền quà tặng..."
                      disabled={!isEditingCosts || (currentRole !== 'admin' && currentRole !== 'operator')}
                    />

                    <div>
                      <FormattedNumberInput
                        label="Hoa Hồng / Commission"
                        icon={<Tag className="w-3.5 h-3.5 text-slate-400" />}
                        value={commissionAmount}
                        onChange={() => {}}
                        placeholder="0 đ"
                        disabled={true}
                      />
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-amber-800 bg-amber-50/90 px-2.5 py-1.5 rounded-lg border border-amber-200/90 shadow-2xs font-medium leading-normal">
                        <span className="font-bold text-amber-600 shrink-0 whitespace-nowrap flex items-center gap-1"><Zap className="w-3 h-3 text-amber-500" /> Tự động tính:</span>
                        <span className="break-words">
                          Tổng hợp từ {selectedTourOrders.length} booking
                        </span>
                      </div>
                    </div>

                    <FormattedNumberInput
                      label="Chi Phí Quảng Cáo"
                      icon={<Megaphone className="w-3.5 h-3.5 text-slate-400" />}
                      value={advertisingAmount}
                      onChange={setAdvertisingAmount}
                      placeholder="Nhập tiền quảng cáo..."
                      disabled={!isEditingCosts || (currentRole !== 'admin' && currentRole !== 'operator')}
                    />

                    <div>
                      <FormattedNumberInput
                        label="Chi Phí Visa / Khách"
                        icon={<FileText className="w-3.5 h-3.5 text-slate-400" />}
                        value={visaAmount}
                        onChange={setVisaAmount}
                        placeholder="Nhập chi phí visa / khách..."
                        disabled={!isEditingCosts || (currentRole !== 'admin' && currentRole !== 'operator')}
                      />
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-blue-900 bg-blue-50/90 px-2.5 py-1.5 rounded-lg border border-blue-200/90 shadow-2xs font-medium leading-normal">
                        <span className="font-bold text-blue-600 shrink-0 whitespace-nowrap flex items-center gap-1"><Coins className="w-3 h-3 text-blue-500" /> Tổng tiền Visa đoàn:</span>
                        <span className="font-extrabold text-blue-800 whitespace-nowrap">
                          {formatVND(visaAmount * totalConfirmedPassengers)}
                        </span>
                        <span className="text-slate-500 text-[10px] break-words">({formatVND(visaAmount)}/khách × {totalConfirmedPassengers} khách)</span>
                      </div>
                    </div>

                    <FormattedNumberInput
                      label="Chi Phí Khác"
                      icon={<DollarSign className="w-3.5 h-3.5 text-slate-400" />}
                      value={otherAmount}
                      onChange={setOtherAmount}
                      placeholder="Nhập chi phí khác..."
                      disabled={!isEditingCosts || (currentRole !== 'admin' && currentRole !== 'operator')}
                    />

                  </div>
                </div>

                {/* Landtours Cost Form and List */}
                <div className="space-y-4">
                  <h5 className="text-xs font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" /> Landtour & Nhà cung cấp
                  </h5>

                  {/* Landtour Quick Add (Operator/Admin only) */}
                  {(currentRole === 'admin' || currentRole === 'operator') && isEditingCosts && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
                      <div className="sm:col-span-2 space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Tên Nhà Cung Cấp Landtour</label>
                        <input
                          type="text"
                          placeholder="Ví dụ: NCC Land Thái Lan, Hoàng Gia..."
                          className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 bg-white font-medium"
                          value={newSupplierName}
                          onChange={e => setNewSupplierName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Số Tiền</label>
                        <input
                          type="text"
                          placeholder="VNĐ..."
                          className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 bg-white font-medium"
                          value={newSupplierAmount === '' ? '' : new Intl.NumberFormat('vi-VN').format(newSupplierAmount)}
                          onChange={e => {
                            const digitsOnly = e.target.value.replace(/\D/g, '');
                            setNewSupplierAmount(digitsOnly === '' ? '' : Number(digitsOnly));
                          }}
                        />
                      </div>
                      <button
                        onClick={handleAddLandtour}
                        className="sm:col-span-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Thêm NCC Landtour
                      </button>
                    </div>
                  )}

                  {/* Landtour List */}
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {landtours.length === 0 ? (
                      <div className="text-center py-6 text-gray-400 text-xs italic bg-slate-50/50 rounded-lg border border-dashed border-slate-200">Chưa khai báo chi phí Landtour nào.</div>
                    ) : (
                      landtours.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-2.5 border border-gray-200 rounded-lg bg-slate-50/40 text-xs hover:bg-white transition-colors">
                          <div>
                            <p className="font-bold text-gray-800">{item.supplierName}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              Cập nhật: {new Date(item.updatedAt).toLocaleDateString('vi-VN')} {new Date(item.updatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <span className="font-black text-slate-700">{formatVND(item.amount)}</span>
                            {(currentRole === 'admin' || currentRole === 'operator') && isEditingCosts && (
                              <button
                                onClick={() => handleDeleteLandtour(item.id)}
                                className="text-red-500 hover:bg-red-50 p-1 rounded hover:text-red-700 transition-colors"
                                title="Xóa nhà cung cấp"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
              )}

              {/* Total calculation bar for Section 1 */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex flex-wrap items-center justify-between text-xs font-bold text-slate-700 gap-2">
                <div className="flex items-center gap-3 text-slate-600 font-semibold">
                  {isOutsourcedTour ? (
                    <span>Chi phí Net nộp Đối tác ({formatVND(selectedTour?.partner_net_cost || 0)}/khách x {totalConfirmedPassengers} khách): <strong className="text-slate-900">{formatVND(outsourcedPartnerNetTotal)}</strong></span>
                  ) : (
                    <>
                      <span>Chi phí chung: <strong className="text-slate-900">{formatVND(flightAmount + insuranceAmount + tourGuideAmount + giftAmount + commissionAmount + advertisingAmount + (visaAmount * totalConfirmedPassengers) + otherAmount)}</strong></span>
                      <span>•</span>
                      <span>Landtour: <strong className="text-slate-900">{formatVND(landtours.reduce((sum, item) => sum + item.amount, 0))}</strong></span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span>Tổng chi phí Mục 1:</span>
                  <span className="text-sm font-black text-blue-600">
                    {formatVND(isOutsourcedTour ? outsourcedPartnerNetTotal + commissionAmount + (visaAmount * totalConfirmedPassengers) + otherAmount : flightAmount + insuranceAmount + tourGuideAmount + giftAmount + commissionAmount + advertisingAmount + (visaAmount * totalConfirmedPassengers) + otherAmount + landtours.reduce((sum, item) => sum + item.amount, 0))}
                  </span>
                </div>
              </div>
            </div>

            {/* Save / Edit Costs Action Panel above Section 2 */}
            {(currentRole === 'admin' || currentRole === 'operator') && (
              isEditingCosts ? (
                <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-4 rounded-xl text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white/15 rounded-lg border border-white/20 shrink-0">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h5 className="font-black text-sm uppercase tracking-wide">Xác nhận khai báo Chi phí Tour</h5>
                      <p className="text-xs text-blue-100 mt-0.5">
                        Khi bấm Lưu thông tin, hệ thống sẽ lưu bảng khai báo chi phí Tour. Bạn có thể chủ động gửi đề xuất chi cho từng đối tác ở Mục 2 khi cần.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveCosts}
                    className="w-full sm:w-auto px-6 py-2.5 bg-white text-blue-700 hover:bg-blue-50 text-xs font-black rounded-lg shadow-sm uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4 text-blue-600" /> Lưu Bảng Chi Phí & Hạch Toán
                  </button>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-4 rounded-xl text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white/15 rounded-lg border border-white/20 shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h5 className="font-black text-sm uppercase tracking-wide flex items-center gap-2">
                        Đã Khai Báo & Hạch Toán Chi Phí Tour
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/40 text-emerald-100 border border-emerald-400/30 text-[10px] uppercase tracking-wider font-extrabold">Đã lưu</span>
                      </h5>
                      <p className="text-xs text-emerald-100 mt-0.5">
                        Bảng chi phí đã được lưu. Nhấn "Chỉnh sửa chi phí" để thay đổi thông tin khai báo nếu cần.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditingCosts(true)}
                    className="w-full sm:w-auto px-6 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 text-xs font-black rounded-lg shadow-sm uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
                  >
                    <Edit3 className="w-4 h-4 text-emerald-600" /> Chỉnh Sửa Chi Phí
                  </button>
                </div>
              )
            )}

            {/* Third-party Suppliers / Partner Payments */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
              <div className="border-b border-gray-100 pb-2 flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-black uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-blue-600" /> 2. Thanh toán đối tác & Chứng từ chi trả
                </h4>
                {(currentRole === 'admin' || currentRole === 'operator') && (
                  <button
                    type="button"
                    onClick={handleAutoGeneratePayments}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    title="Cập nhật/đồng bộ danh sách thẻ thanh toán đối tác theo các chi phí đã khai báo"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-blue-600" /> Đồng bộ từ chi phí
                  </button>
                )}
              </div>

              {/* Partner payments list */}
              <div className="space-y-4">
                {partnerPayments.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 text-xs italic">Chưa phát sinh thanh toán đối tác dịch vụ nào.</div>
                ) : (
                  partnerPayments.map(item => {
                    const linkedInvoice = getLinkedInvoice(item.invoiceId);
                    const isApproved = linkedInvoice?.status === 'approved';
                    const isPending = linkedInvoice?.status === 'pending';
                    const isRejected = linkedInvoice?.status === 'rejected';

                    // Tính tổng tiền đã thanh toán từ các đợt ĐÃ ĐƯỢC KẾ TOÁN DUYỆT CHI
                    const installments = item.installments || [];
                    const approvedInstallments = installments.filter(inst => {
                      if (inst.invoice_id) {
                        const inv = invoices.find(i => i.id === inst.invoice_id);
                        if (inv) return inv.status === 'approved';
                      }
                      return inst.status === 'approved';
                    });
                    const totalPaid = approvedInstallments.reduce((sum, inst) => sum + (inst.amount || 0), 0);
                    const remainingAmount = Math.max(0, item.amountToPay - totalPaid);

                    // Trạng thái hiển thị
                    let currentStatus: PartnerPayment['status'] = item.status;
                    if (totalPaid >= item.amountToPay && item.amountToPay > 0) {
                      currentStatus = 'paid';
                    } else if (totalPaid > 0) {
                      currentStatus = 'partially_paid';
                    } else {
                      currentStatus = 'unpaid';
                    }

                    const isExpanded = expandedInstallments[item.id] || false;
                    const hasPaymentRecord = installments.length > 0 || totalPaid > 0 || currentStatus !== 'unpaid' || Boolean(item.proofUrl) || Boolean(linkedInvoice);

                    return (
                      <div key={item.id} className="p-4 border border-slate-200 rounded-xl bg-white shadow-sm hover:shadow transition-all space-y-3">
                        {/* Header & Main Info */}
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                          
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-extrabold text-slate-900 text-sm">{item.partnerName}</span>
                              {linkedInvoice && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  ({linkedInvoice.invoice_code})
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-[10px]">
                              <span className="text-slate-400 font-medium">Trạng thái đối tác:</span>
                              <span className={`px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider text-[9px] ${
                                currentStatus === 'paid' 
                                  ? 'bg-green-100 text-green-800 border border-green-200' 
                                  : currentStatus === 'partially_paid' 
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                                  : 'bg-rose-100 text-rose-800 border border-rose-200'
                              }`}>
                                {currentStatus === 'paid' ? 'Đã thanh toán đủ' : currentStatus === 'partially_paid' ? 'Thanh toán một phần' : 'Chưa thanh toán'}
                              </span>

                              {/* Trạng thái duyệt chi từ kế toán */}
                              <span className="text-slate-300">|</span>
                              <span className="text-slate-400 font-medium">Kế toán:</span>
                              {linkedInvoice ? (
                                <span className={`px-2 py-0.5 rounded-full font-extrabold text-[9px] flex items-center gap-1 ${
                                  isApproved 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                    : isPending 
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse' 
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}>
                                  <span className={`w-1 h-1 rounded-full ${isApproved ? 'bg-emerald-500' : isPending ? 'bg-amber-500' : 'bg-rose-500'}`} />
                                  {isApproved ? 'Đã duyệt chi' : isPending ? 'Chờ duyệt chi' : 'Từ chối chi'}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-extrabold text-[9px]">
                                  Chưa gửi yêu cầu chi
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Financial Summary & Primary Actions */}
                          <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3 text-xs">
                            <div className="text-right">
                              <div className="text-[10px] text-slate-400 font-bold uppercase">Cần thanh toán</div>
                              <div className="font-black text-slate-900 text-sm">{formatVND(item.amountToPay)}</div>
                            </div>

                            {installments.length > 0 && (
                              <>
                                <div className="text-right">
                                  <div className="text-[10px] text-emerald-600 font-bold uppercase">Đã thanh toán</div>
                                  <div className="font-extrabold text-emerald-700 text-xs">{formatVND(totalPaid)}</div>
                                </div>

                                <div className="text-right">
                                  <div className="text-[10px] text-rose-500 font-bold uppercase">Còn nợ</div>
                                  <div className="font-extrabold text-rose-600 text-xs">{formatVND(remainingAmount)}</div>
                                </div>
                              </>
                            )}

                            <div className="flex items-center gap-1.5 flex-wrap">
                              {/* Toggle hiển thị danh sách đợt thanh toán */}
                              <button
                                type="button"
                                onClick={() => setExpandedInstallments(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] transition-all cursor-pointer"
                              >
                                <Layers className="w-3.5 h-3.5 text-slate-500" />
                                {installments.length} đợt thanh toán
                                {isExpanded ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
                              </button>

                              {/* Nút xóa thẻ: Chỉ được xóa khi chưa có đợt thanh toán hay chứng từ nào */}
                              {(currentRole === 'admin' || currentRole === 'operator') && (
                                hasPaymentRecord ? (
                                  <button
                                    type="button"
                                    disabled
                                    className="text-slate-300 p-1.5 rounded-lg cursor-not-allowed border border-transparent"
                                    title="Thẻ này đã ghi nhận đợt thanh toán/chứng từ, không thể xóa"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleDeletePartnerPayment(item.id)}
                                    className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg hover:text-red-700 transition-colors border border-transparent hover:border-red-100 cursor-pointer"
                                    title="Xóa thẻ thanh toán đối tác"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )
                              )}
                            </div>

                          </div>
                        </div>

                        {/* Mục ẢNH XÁC NHẬN (ĐIỀU HÀNH UPLOAD ÁNH XÁC NHẬN LÊN) */}
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                          <div className="flex items-center gap-2">
                            <Camera className="w-4 h-4 text-blue-600 shrink-0" />
                            <div>
                              <span className="font-bold text-slate-800">Ảnh xác nhận (Điều hành):</span>
                              <span className="text-slate-500 text-[11px] ml-1">
                                {item.proofUrl ? 'Đã tải ảnh xác nhận thanh toán/chuyển khoản' : 'Chưa đính kèm ảnh xác nhận'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Nút xem ảnh xác nhận */}
                            {item.proofUrl && (
                              <a
                                href={item.proofUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-md font-bold text-[11px] transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" /> Xem ảnh xác nhận
                              </a>
                            )}

                            {/* Nút Upload / Thay đổi ảnh xác nhận */}
                            {(currentRole === 'admin' || currentRole === 'operator') && (
                              <div className="relative">
                                <input
                                  type="file"
                                  id={`proof-upload-${item.id}`}
                                  className="hidden"
                                  accept="image/*,.pdf"
                                  disabled={isUploadingProofFor === item.id}
                                  onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) handleUploadProofImage(item.id, file);
                                  }}
                                />
                                <label
                                  htmlFor={`proof-upload-${item.id}`}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-md font-bold text-[11px] cursor-pointer transition-colors shadow-2xs"
                                >
                                  <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
                                  {isUploadingProofFor === item.id 
                                    ? 'Đang tải lên...' 
                                    : item.proofUrl 
                                    ? 'Đổi ảnh xác nhận' 
                                    : 'Upload ảnh xác nhận'}
                                </label>
                              </div>
                            )}

                            {/* Ủy nhiệm chi do Kế toán duyệt */}
                            {isApproved && linkedInvoice?.file_url && (
                              <a
                                href={linkedInvoice.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md font-bold text-[11px] transition-colors"
                                title="Xem Ủy nhiệm chi / Minh chứng thanh toán của Kế toán"
                              >
                                <Check className="w-3.5 h-3.5" /> UNC Kế toán
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Expandable Section: Thanh toán nhiều đợt */}
                        {isExpanded && (
                          <div className="pt-2 space-y-3 border-t border-slate-100">
                            
                            {/* Danh sách các đợt đã thanh toán */}
                            <div className="space-y-2">
                              <h5 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                                <FileText className="w-3.5 h-3.5 text-blue-600" /> Danh sách đợt thanh toán ({installments.length})
                              </h5>

                              {installments.length === 0 ? (
                                <div className="text-center py-3 bg-slate-50 rounded-lg text-slate-400 text-xs italic">
                                  Chưa ghi nhận đợt thanh toán nào cho đối tác này.
                                </div>
                              ) : (
                                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden bg-slate-50/50">
                                  {installments.map((inst, idx) => {
                                    let instSt = inst.status || 'pending';
                                    let instProofUrl = inst.proof_url;
                                    if (inst.invoice_id) {
                                      const inv = invoices.find(i => i.id === inst.invoice_id);
                                      if (inv) {
                                        instSt = inv.status;
                                        if (inv.file_url) instProofUrl = inv.file_url;
                                      }
                                    }

                                    const isUploadingThisInst = isUploadingProofFor === `${item.id}_${inst.id}`;

                                    return (
                                      <div key={inst.id} className="p-3 space-y-1.5 hover:bg-white transition-colors">
                                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                          <div className="flex items-center gap-3">
                                            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 font-black text-[10px] flex items-center justify-center shrink-0">
                                              #{idx + 1}
                                            </span>
                                            <div>
                                              <div className="font-extrabold text-slate-800 flex items-center gap-2">
                                                {formatVND(inst.amount)} 
                                                <span className="font-normal text-slate-500 text-[11px]">({inst.payment_method || 'Chuyển khoản'})</span>
                                                {instSt === 'approved' && (
                                                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[9px] border border-emerald-200">
                                                    Đã duyệt chi
                                                  </span>
                                                )}
                                                {instSt === 'pending' && (
                                                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-extrabold text-[9px] border border-amber-200 animate-pulse">
                                                    Chờ Kế toán duyệt
                                                  </span>
                                                )}
                                                {instSt === 'rejected' && (
                                                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-extrabold text-[9px] border border-rose-200">
                                                    Từ chối
                                                  </span>
                                                )}
                                              </div>
                                              <div className="text-[10px] text-slate-400 mt-0.5">
                                                Ngày: {inst.payment_date || 'N/A'} {inst.note && `• ${inst.note}`}
                                              </div>
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-2">
                                            {/* Xem ảnh chứng từ nếu đã có */}
                                            {instProofUrl && (
                                              <a
                                                href={instProofUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded font-bold text-[10px] transition-colors"
                                                title="Xem ảnh chứng từ"
                                              >
                                                <Eye className="w-3 h-3 text-blue-600" /> Xem ảnh
                                              </a>
                                            )}
                                          </div>
                                        </div>

                                        {/* Chi tiết chuyển khoản nếu có */}
                                        {(inst.payment_method === 'Chuyển khoản' || inst.bank_name) && (
                                          <div className="text-[11px] text-blue-900 bg-blue-50/80 px-2.5 py-1 rounded-lg border border-blue-100 font-medium flex flex-wrap items-center gap-x-3 gap-y-0.5 ml-9">
                                            <span className="font-bold flex items-center gap-1"><Building2 className="w-3 h-3 text-blue-600" /> TK nhận:</span>
                                            <span>NH: <strong>{inst.bank_name || 'N/A'}</strong></span>
                                            <span>STK: <strong className="font-mono">{inst.account_number || 'N/A'}</strong></span>
                                            <span>Chủ TK: <strong>{(inst.account_name || 'N/A').toUpperCase()}</strong></span>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Form Thêm đợt thanh toán mới */}
                            {(currentRole === 'admin' || currentRole === 'operator') && (
                              <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg space-y-2.5">
                                <div className="text-[11px] font-bold text-blue-800 uppercase flex items-center gap-1">
                                  <Plus className="w-3.5 h-3.5 text-blue-600" /> Thêm đợt thanh toán mới
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs items-end">
                                  <div className="space-y-1">
                                    <label className="block text-[10px] font-bold text-slate-500">Số tiền đợt này</label>
                                    <input
                                      type="text"
                                      placeholder="VNĐ..."
                                      className="w-full h-9 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white font-bold text-slate-800 outline-none transition-all"
                                      value={instAmountMap[item.id] === undefined || instAmountMap[item.id] === '' ? '' : new Intl.NumberFormat('vi-VN').format(Number(instAmountMap[item.id]))}
                                      onChange={e => {
                                        const digits = e.target.value.replace(/\D/g, '');
                                        setInstAmountMap(prev => ({ ...prev, [item.id]: digits === '' ? '' : Number(digits) }));
                                      }}
                                    />
                                  </div>

                                  <div className="space-y-1">
                                    <label className="block text-[10px] font-bold text-slate-500">Phương thức</label>
                                    <CustomSelect
                                      options={[
                                        { value: 'Chuyển khoản', label: 'Chuyển khoản' },
                                        { value: 'Tiền mặt', label: 'Tiền mặt' },
                                        { value: 'Thẻ tín dụng', label: 'Thẻ tín dụng' },
                                      ]}
                                      value={instMethodMap[item.id] || 'Chuyển khoản'}
                                      onChange={val => setInstMethodMap(prev => ({ ...prev, [item.id]: val }))}
                                      className="w-full"
                                      buttonClassName="w-full h-9 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white font-medium text-slate-800 outline-none transition-all cursor-pointer"
                                    />
                                  </div>

                                  <div className="space-y-1">
                                    <label className="block text-[10px] font-bold text-slate-500">Ngày thanh toán</label>
                                    <DatePicker
                                      value={instDateMap[item.id] || new Date().toISOString().substring(0, 10)}
                                      onChange={val => setInstDateMap(prev => ({ ...prev, [item.id]: val }))}
                                      align="right"
                                    />
                                  </div>

                                  <div className="space-y-1">
                                    <label className="block text-[10px] font-bold text-slate-500">Ghi chú</label>
                                    <input
                                      type="text"
                                      placeholder="VD: Đợt 1 cọc 30%..."
                                      className="w-full h-9 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white font-medium text-slate-800 outline-none transition-all"
                                      value={instNoteMap[item.id] || ''}
                                      onChange={e => setInstNoteMap(prev => ({ ...prev, [item.id]: e.target.value }))}
                                    />
                                  </div>
                                </div>

                                {(instMethodMap[item.id] || 'Chuyển khoản') === 'Chuyển khoản' && (
                                  <div className="p-2.5 bg-blue-100/60 border border-blue-200 rounded-lg space-y-2 text-xs">
                                    <div className="text-[10px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1">
                                      <Building2 className="w-3.5 h-3.5 text-blue-600" /> Thông tin tài khoản nhận tiền chuyển khoản (Bắt buộc)
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                      <div>
                                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Tên Ngân hàng <span className="text-rose-500">*</span></label>
                                        <input
                                          type="text"
                                          placeholder="VD: Vietcombank, Techcombank..."
                                          className="w-full h-9 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                          value={instBankNameMap[item.id] || ''}
                                          onChange={e => setInstBankNameMap(prev => ({ ...prev, [item.id]: e.target.value }))}
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Số tài khoản <span className="text-rose-500">*</span></label>
                                        <input
                                          type="text"
                                          placeholder="VD: 10123456789..."
                                          className="w-full h-9 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-mono font-bold text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                          value={instAccountNumberMap[item.id] || ''}
                                          onChange={e => setInstAccountNumberMap(prev => ({ ...prev, [item.id]: e.target.value }))}
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Tên chủ tài khoản <span className="text-rose-500">*</span></label>
                                        <input
                                          type="text"
                                          placeholder="VD: NGUYEN VAN A..."
                                          className="w-full h-9 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-bold text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none uppercase transition-all"
                                          value={instAccountNameMap[item.id] || ''}
                                          onChange={e => setInstAccountNameMap(prev => ({ ...prev, [item.id]: e.target.value.toUpperCase() }))}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                )}

                                <div className="flex justify-end pt-1">
                                  <button
                                    type="button"
                                    onClick={() => handleAddInstallment(item.id)}
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5" /> Xác nhận thêm đợt thanh toán
                                  </button>
                                </div>
                              </div>
                            )}

                          </div>
                        )}

                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
