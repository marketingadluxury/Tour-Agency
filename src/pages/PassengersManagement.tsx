import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { isOrderInLeaderTeam } from '../lib/utils';
import { TimeRangeFilter } from '../components/TimeRangeFilter';
import { isDateInTimeRange } from '../lib/dateUtils';
import {
  Users,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Edit,
  ChevronDown,
  ChevronUp,
  Info,
  Key,
  ShieldAlert,
  History,
  Briefcase,
  Trash2,
  Crown,
  Award,
  Phone,
  Sparkles,
  Globe,
  Copy,
  X
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import { Passenger, Order } from '../types';
import EditPassengerModal from '../components/EditPassengerModal';
import { PassengerDocumentList } from '../components/PassengerDocumentList';
import ActionModal from '../components/ActionModal';
import { PotentialLeadsTab } from '../components/PotentialLeadsTab';
import { CustomSelect } from '../components/CustomSelect';
import { useNavigate } from 'react-router-dom';

interface BookingInfo {
  passenger_id: string;
  order_id: string;
  tour_id?: string;
  tour_code?: string;
  tour_name?: string;
  is_payer: boolean;
  visa_status: Passenger['visa_status'];
  passport_url?: string;
  status?: Order['status'];
  created_at?: string;
  visa_disqualified_reason?: string;
}

interface CustomerGroup {
  id: string; // Grouping key
  full_name: string;
  dob?: string;
  passport_number?: string;
  phone?: string;
  bookings: BookingInfo[];
  totalSpent: number;
}

export default function PassengersManagement() {
  const { 
    passengers, 
    orders: allOrders, 
    tours, 
    currentRole, 
    profilesList,
    updatePassenger,
    deletePassenger,
    membershipSettings
  } = useCRM();
  
  const { profile } = useAuth();

  const navigate = useNavigate();

  // Guard access
  const isDenied = useMemo(() => {
    return ['CTV', 'accounting'].includes(currentRole);
  }, [currentRole]);

  // Filters state
  const [activeTab, setActiveTab] = useState<'passengers' | 'leads'>('passengers');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTourId, setSelectedTourId] = useState('all');
  const [selectedVisaStatus, setSelectedVisaStatus] = useState('all');
  const [selectedTier, setSelectedTier] = useState('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState('all');
  const [selectedStartDate, setSelectedStartDate] = useState('');
  const [selectedEndDate, setSelectedEndDate] = useState('');

  const getMembershipTier = (spent: number) => {
    const silver = membershipSettings?.silverMin ?? 20000000;
    const gold = membershipSettings?.goldMin ?? 50000000;
    const platinum = membershipSettings?.platinumMin ?? 100000000;

    if (spent >= platinum) {
      return {
        name: 'Hạng Kim Cương',
        badge: 'bg-purple-100 text-purple-900 border-purple-300 shadow-xs font-black',
        icon: Sparkles,
        color: 'text-purple-700'
      };
    } else if (spent >= gold) {
      return {
        name: 'Hạng Vàng',
        badge: 'bg-amber-100 text-amber-900 border-amber-300 shadow-xs font-black',
        icon: Crown,
        color: 'text-amber-700'
      };
    } else if (spent >= silver) {
      return {
        name: 'Hạng Bạc',
        badge: 'bg-slate-200 text-slate-800 border-slate-300 font-bold',
        icon: Award,
        color: 'text-slate-700'
      };
    } else {
      return {
        name: 'Hạng Đồng',
        badge: 'bg-amber-50 text-amber-900/80 border-amber-200 font-semibold',
        icon: Users,
        color: 'text-amber-900/60'
      };
    }
  };
  
  // Expanded row state to show booking history
  const [expandedCustomerKeys, setExpandedCustomerKeys] = useState<string[]>([]);

  // Editing passenger state
  const [editingPassenger, setEditingPassenger] = useState<Passenger | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [disqualifiedReasonModal, setDisqualifiedReasonModal] = useState<{ name: string; reason: string } | null>(null);
  
  // Passenger Delete Modal
  const [passengerToDelete, setPassengerToDelete] = useState<{ id: string; name: string } | null>(null);

  // 1. Filter orders based on user permissions
  const myOrders = useMemo(() => {
    if (['admin', 'operator', 'visa', 'bod', 'marketing_leader', 'marketing'].includes(currentRole)) {
      return allOrders;
    }
    if (currentRole === 'sale_leader') {
      return allOrders.filter(o => isOrderInLeaderTeam(o, profile, profilesList));
    }
    return allOrders.filter(o => o.user_id === profile?.id || (o.created_by && profile?.full_name && o.created_by.toLowerCase().trim().includes(profile.full_name.toLowerCase().trim())));
  }, [allOrders, currentRole, profile, profilesList]);

  // 2. Filtered raw passengers belonging to my orders, discarding placeholder drafts
  const validPassengers = useMemo(() => {
    return passengers.filter(p => {
      const belongsToMyOrder = myOrders.some(o => o.id === p.order_id);
      if (!belongsToMyOrder) return false;

      // Discard pure un-filled placeholders
      const name = (p.full_name || p.name || '').trim();
      const isPlaceholder = name === 'Chưa cung cấp (Giữ chỗ tạm)' ||
        name === 'Chưa cung cấp' ||
        name.startsWith('Người lớn #') ||
        name.startsWith('Trẻ em #') ||
        name.startsWith('Trẻ nhỏ #');

      // Keep if it's not a placeholder
      return !isPlaceholder;
    });
  }, [passengers, myOrders]);

  // 3. Group valid passengers into single Customer Profiles
  const customerProfiles = useMemo(() => {
    const groups: { [key: string]: CustomerGroup } = {};

    validPassengers.forEach(p => {
      const order = myOrders.find(o => o.id === p.order_id);
      const tour = order ? tours.find(t => t.id === order.tour_id) : null;

      const pName = (p.full_name || p.name || '').trim();
      const pDob = (p.dob || '').trim();
      const pPassport = (p.passport_number || '').trim().toUpperCase();
      const pPhone = (p.phone || '').trim();

      // Determine an accurate profile key
      let key = '';
      if (pPassport && pPassport !== '-') {
        key = `PP_${pPassport}`;
      } else if (pPhone && pPhone !== 'Chưa cung cấp' && pPhone !== '-') {
        key = `PH_${pName.toUpperCase().replace(/\s+/g, '')}_${pPhone}`;
      } else {
        key = `DB_${pName.toUpperCase().replace(/\s+/g, '')}_${pDob}`;
      }

      if (!groups[key]) {
        groups[key] = {
          id: key,
          full_name: pName,
          dob: p.dob || undefined,
          passport_number: p.passport_number || undefined,
          phone: p.phone && p.phone !== 'Chưa cung cấp' ? p.phone : undefined,
          bookings: [],
          totalSpent: 0
        };
      }

      groups[key].bookings.push({
        passenger_id: p.id,
        order_id: p.order_id,
        tour_id: tour?.id,
        tour_code: tour?.code,
        tour_name: tour?.name,
        is_payer: p.is_payer,
        visa_status: p.visa_status,
        passport_url: p.passport_url,
        status: order?.status,
        created_at: order?.created_at,
        visa_disqualified_reason: p.visa_disqualified_reason
      });
    });

    // Sort bookings inside each customer by date (newest first)
    Object.values(groups).forEach(g => {
      g.bookings.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });

      // Calculate total spent for payer bookings of 'sure' or 'paid' status
      let spent = 0;
      const processed = new Set<string>();
      g.bookings.forEach(b => {
        if (b.is_payer && (b.status === 'sure' || b.status === 'paid') && !processed.has(b.order_id)) {
          processed.add(b.order_id);
          const order = myOrders.find(o => o.id === b.order_id);
          if (order) {
            spent += (order.total_price || 0);
          }
        }
      });
      g.totalSpent = spent;
    });

    return Object.values(groups);
  }, [validPassengers, myOrders, tours]);

  // 4. Search and filter logic on grouped Customer Profiles
  const filteredCustomers = useMemo(() => {
    return customerProfiles.filter(c => {
      // Search match
      const nameMatch = c.full_name.toLowerCase().includes(searchTerm.toLowerCase());
      const passportMatch = c.passport_number?.toLowerCase().includes(searchTerm.toLowerCase());
      const phoneMatch = c.phone?.toLowerCase().includes(searchTerm.toLowerCase());
      const bookingMatch = c.bookings.some(b => 
        b.order_id.toLowerCase().includes(searchTerm.toLowerCase()) || 
        b.tour_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.tour_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      const matchesSearch = !searchTerm || nameMatch || passportMatch || phoneMatch || bookingMatch;

      // Tour match (any of the customer's registered tours)
      const matchesTour = selectedTourId === 'all' || c.bookings.some(b => b.tour_id === selectedTourId);

      // Visa status match (based on their latest booking)
      const latestBooking = c.bookings[0];
      const matchesVisa = selectedVisaStatus === 'all' || (latestBooking && latestBooking.visa_status === selectedVisaStatus);

      // Membership tier match
      let matchesTier = true;
      if (selectedTier !== 'all') {
        const tierInfo = getMembershipTier(c.totalSpent);
        matchesTier = tierInfo.name === selectedTier;
      }

      // Time range match (based on latest booking creation date)
      let matchesTime = true;
      if (selectedTimeRange !== 'all') {
        const dateToCheck = latestBooking?.created_at;
        matchesTime = isDateInTimeRange(dateToCheck, selectedTimeRange, selectedStartDate, selectedEndDate);
      }

      return matchesSearch && matchesTour && matchesVisa && matchesTier && matchesTime;
    });
  }, [customerProfiles, searchTerm, selectedTourId, selectedVisaStatus, selectedTier, selectedTimeRange, selectedStartDate, selectedEndDate, membershipSettings]);

  // Stats derived from Customer Profiles
  const stats = useMemo(() => {
    const totalCustomers = customerProfiles.length;
    let totalBookingsCount = 0;
    
    // Counting overall visa status based on latest registration
    let pending = 0;
    let processing = 0;
    let approved = 0;
    let rejected = 0;
    let notRequired = 0;

    customerProfiles.forEach(c => {
      totalBookingsCount += c.bookings.length;
      const latest = c.bookings[0];
      if (latest) {
        if (latest.visa_status === 'approved') approved++;
        else if (latest.visa_status === 'processing') processing++;
        else if (latest.visa_status === 'rejected') rejected++;
        else if (latest.visa_status === 'not_required') notRequired++;
        else pending++;
      }
    });

    return {
      totalCustomers,
      totalBookingsCount,
      pending,
      processing,
      approved,
      rejected,
      notRequired
    };
  }, [customerProfiles]);

  const toggleExpand = (key: string) => {
    setExpandedCustomerKeys(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const getVisaBadge = (status: Passenger['visa_status'], reason?: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs whitespace-nowrap">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            Đã có Visa
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-blue-50 text-blue-800 border border-blue-200 shadow-2xs whitespace-nowrap">
            <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0 animate-spin-slow" />
            Đang xử lý
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-50 text-rose-800 border border-rose-200 shadow-2xs whitespace-nowrap">
            <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            Bị từ chối
          </span>
        );
      case 'disqualified':
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDisqualifiedReasonModal({
                name: 'Hành khách',
                reason: reason || 'Chưa cập nhật lý do chi tiết.'
              });
            }}
            title="Bấm để xem lý do hồ sơ chưa đạt"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-100 text-rose-900 border border-rose-300 whitespace-nowrap cursor-pointer hover:bg-rose-200 transition-all shadow-xs"
          >
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            Hồ sơ chưa đạt
          </button>
        );
      case 'not_required':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs whitespace-nowrap">
            <Globe className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            Có sẵn Visa
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs whitespace-nowrap">
            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            Chờ nộp hồ sơ
          </span>
        );
    }
  };

  const formatDob = (dobString?: string) => {
    if (!dobString) return '-';
    try {
      const d = new Date(dobString);
      if (isNaN(d.getTime())) return dobString;
      return d.toLocaleDateString('vi-VN');
    } catch {
      return dobString;
    }
  };

  // Get initials for avatar display
  // Blocked Screen UI for restricted roles
  if (isDenied) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-gray-200 max-w-xl mx-auto mt-12 shadow-sm font-sans animate-fade-in">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4 animate-pulse" />
        <h3 className="text-base font-black text-gray-950 uppercase tracking-tight">Quyền truy cập bị từ chối</h3>
        <p className="text-sm text-gray-500 mt-2">
          Hệ thống ghi nhận bạn đang đăng nhập với vai trò <strong className="text-rose-600">{currentRole}</strong>. 
          Menu <strong>Khách hàng đi Tour</strong> chỉ được mở khóa cho Ban quản trị (Admin), Điều hành (Operator), Sale và Visa.
        </p>
        <p className="text-xs text-gray-400 mt-4 italic border-t border-gray-100 pt-3">
          Vui lòng liên hệ với Quản lý Điều hành nếu bạn cho rằng đây là một sự sai sót.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto font-sans animate-fade-in pb-12">
      
      {/* Header section with refined typography and badges */}
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200/90 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black shadow-xs border border-blue-100">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  Quản lý Khách hàng & Hồ sơ
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {stats.totalCustomers} Hồ sơ duy nhất
                  </span>
                </h2>
                <p className="text-xs md:text-sm text-slate-500 mt-0.5">
                  Hệ thống gom nhóm thông tin hành khách theo số hộ chiếu, điện thoại và lịch sử đặt tour.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <div className="px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600" />
              <span>Tổng số lượt book: <strong className="text-slate-900">{stats.totalBookingsCount}</strong></span>
            </div>
          </div>
        </div>

        {/* Tab Navigation Switcher */}
        <div className="flex items-center gap-2 mt-6 pt-5 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setActiveTab('passengers')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'passengers'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Khách hàng đi Tour ({stats.totalCustomers})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('leads')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'leads'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>Khách hàng tiềm năng (Leads Meta)</span>
          </button>
        </div>
      </div>

      {activeTab === 'leads' ? (
        <PotentialLeadsTab 
          onSelectLeadForBooking={(lead) => {
            navigate('/departures', { 
              state: { 
                selectedLead: {
                  name: lead.customer_name,
                  phone: lead.customer_phone,
                  email: lead.customer_email,
                  notes: lead.notes,
                  utm_campaign: lead.utm_campaign,
                  meta_lead_id: lead.meta_lead_id || lead.id
                } 
              } 
            });
          }} 
        />
      ) : (
        <>

      {/* KPI Stats Cards Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 md:gap-4">
        {/* Total Customers */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Khách duy nhất</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{stats.totalCustomers}</span>
            <span className="text-[11px] text-slate-400 block mt-0.5 font-medium">Hồ sơ đã định danh</span>
          </div>
        </div>

        {/* Pending Visa */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-amber-200/80 bg-gradient-to-b from-amber-50/30 to-white shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700">Chờ nộp hồ sơ</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl md:text-3xl font-black text-amber-600 tracking-tight">{stats.pending}</span>
            <span className="text-[11px] text-amber-800/60 block mt-0.5 font-semibold">Cần bổ sung tài liệu</span>
          </div>
        </div>

        {/* Processing Visa */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-blue-200/80 bg-gradient-to-b from-blue-50/30 to-white shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700">Đang xử lý</span>
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <Clock className="w-4 h-4 animate-spin-slow" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl md:text-3xl font-black text-blue-600 tracking-tight">{stats.processing}</span>
            <span className="text-[11px] text-blue-800/60 block mt-0.5 font-semibold">Đang chờ kết quả DSQ</span>
          </div>
        </div>

        {/* Approved Visa */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-emerald-200/80 bg-gradient-to-b from-emerald-50/30 to-white shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">Đã duyệt Visa</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl md:text-3xl font-black text-emerald-600 tracking-tight">{stats.approved}</span>
            <span className="text-[11px] text-emerald-800/60 block mt-0.5 font-semibold">Hồ sơ thành công</span>
          </div>
        </div>

        {/* Rejected Visa */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-rose-200/80 bg-gradient-to-b from-rose-50/30 to-white shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-700">Bị từ chối</span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl md:text-3xl font-black text-rose-600 tracking-tight">{stats.rejected}</span>
            <span className="text-[11px] text-rose-800/60 block mt-0.5 font-semibold">Trả về / Bị từ chối</span>
          </div>
        </div>

        {/* Exempt Visa */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50/40 to-white shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">Có sẵn Visa</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl md:text-3xl font-black text-slate-700 tracking-tight">{stats.notRequired}</span>
            <span className="text-[11px] text-slate-500 block mt-0.5 font-medium">Không cần làm visa</span>
          </div>
        </div>
      </div>

      {/* Control Panel: Filter and Search Bar */}
      <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3.5">
        
        {/* Search Box - Full Width Top Row */}
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input 
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Tìm kiếm theo Tên khách, Số điện thoại, Số hộ chiếu hoặc Mã booking..."
            className="w-full h-10 pl-10 pr-10 border border-slate-200/90 rounded-xl text-xs font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-900 placeholder:text-slate-400 bg-slate-50/50 focus:bg-white transition-all shadow-2xs"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold p-1 rounded-md flex items-center justify-center cursor-pointer transition-colors"
              title="Xóa tìm kiếm"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters Grid - 4 Equal Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
          {/* Time Range Filter */}
          <div className="w-full">
            <TimeRangeFilter
              value={selectedTimeRange}
              onChange={setSelectedTimeRange}
              startDate={selectedStartDate}
              onChangeStartDate={setSelectedStartDate}
              endDate={selectedEndDate}
              onChangeEndDate={setSelectedEndDate}
              prefixText="Đăng ký"
              className="w-full"
              selectClassName="w-full h-10 px-3 py-2 border border-slate-200/90 rounded-xl text-xs font-semibold bg-slate-50/50 hover:bg-slate-100/80 text-slate-800 outline-none cursor-pointer focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-2xs"
            />
          </div>

          {/* Membership Tier Filter */}
          <div className="w-full">
            <CustomSelect
              options={[
                { value: 'all', label: 'Mọi Hạng thành viên' },
                { value: 'Hạng Đồng', label: 'Hạng Đồng' },
                { value: 'Hạng Bạc', label: 'Hạng Bạc' },
                { value: 'Hạng Vàng', label: 'Hạng Vàng' },
                { value: 'Hạng Kim Cương', label: 'Hạng Kim Cương' },
              ]}
              value={selectedTier}
              onChange={setSelectedTier}
              className="w-full"
              buttonClassName="w-full h-10 px-3 py-2 border border-slate-200/90 rounded-xl text-xs font-semibold bg-slate-50/50 hover:bg-slate-100/80 text-slate-800 outline-none cursor-pointer focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-2xs"
            />
          </div>

          {/* Visa Status Filter */}
          <div className="w-full">
            <CustomSelect
              options={[
                { value: 'all', label: 'Mọi trạng thái Visa (Mới nhất)' },
                { value: 'pending', label: 'Chờ nộp hồ sơ' },
                { value: 'processing', label: 'Đang xử lý' },
                { value: 'approved', label: 'Đã có Visa' },
                { value: 'rejected', label: 'Bị từ chối' },
                { value: 'not_required', label: 'Có sẵn Visa' },
              ]}
              value={selectedVisaStatus}
              onChange={setSelectedVisaStatus}
              className="w-full"
              buttonClassName="w-full h-10 px-3 py-2 border border-slate-200/90 rounded-xl text-xs font-semibold bg-slate-50/50 hover:bg-slate-100/80 text-slate-800 outline-none cursor-pointer focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-2xs"
            />
          </div>

          {/* Tour Selection Filter */}
          <div className="w-full">
            <CustomSelect
              options={[
                { value: 'all', label: 'Khách từng đi bất kỳ Tour nào' },
                ...tours.map(t => ({
                  value: t.id,
                  label: `[${t.code}] ${t.name.length > 22 ? t.name.substring(0, 22) + '...' : t.name}`
                }))
              ]}
              value={selectedTourId}
              onChange={setSelectedTourId}
              className="w-full"
              buttonClassName="w-full h-10 px-3 py-2 border border-slate-200/90 rounded-xl text-xs font-semibold bg-slate-50/50 hover:bg-slate-100/80 text-slate-800 outline-none cursor-pointer focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-2xs truncate"
            />
          </div>
        </div>

        {/* Filter result counter bar */}
        <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Đang hiển thị <strong className="text-slate-900 font-extrabold">{filteredCustomers.length}</strong> / {customerProfiles.length} khách hàng</span>
          </div>
          {(searchTerm || selectedTier !== 'all' || selectedVisaStatus !== 'all' || selectedTourId !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedTier('all');
                setSelectedVisaStatus('all');
                setSelectedTourId('all');
              }}
              className="text-blue-600 hover:text-blue-800 font-bold hover:underline"
            >
              Đặt lại bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* Main Grouped Customers Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50/90">
              <tr>
                <th scope="col" className="w-[36px] px-1.5 py-3 text-center text-[10px] font-extrabold text-slate-500 uppercase tracking-wider"></th>
                <th scope="col" className="px-2.5 py-3 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider whitespace-nowrap">Khách hàng</th>
                <th scope="col" className="px-2.5 py-3 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider whitespace-nowrap">Số điện thoại</th>
                <th scope="col" className="px-2.5 py-3 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider whitespace-nowrap">Số hộ chiếu</th>
                <th scope="col" className="px-2 py-3 text-center text-[10px] font-extrabold text-slate-500 uppercase tracking-wider whitespace-nowrap">Hạng thành viên</th>
                <th scope="col" className="px-2 py-3 text-center text-[10px] font-extrabold text-slate-500 uppercase tracking-wider whitespace-nowrap">Số Tour</th>
                <th scope="col" className="px-2.5 py-3 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider whitespace-nowrap">Visa (Gần nhất)</th>
                <th scope="col" className="px-2.5 py-3 text-center text-[10px] font-extrabold text-slate-500 uppercase tracking-wider whitespace-nowrap">Thao tác</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <div className="max-w-xs mx-auto space-y-2">
                      <Users className="w-10 h-10 text-slate-300 mx-auto" />
                      <p className="text-sm font-extrabold text-slate-700">Không tìm thấy khách hàng nào</p>
                      <p className="text-xs text-slate-400">Thử thay đổi từ khóa tìm kiếm hoặc điều kiện lọc ở thanh phía trên.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(c => {
                  const isExpanded = expandedCustomerKeys.includes(c.id);
                  const latestBooking = c.bookings[0];
                  const tierInfo = getMembershipTier(c.totalSpent);
                  const TierIcon = tierInfo.icon;
                  
                  return (
                    <React.Fragment key={c.id}>
                      {/* Main Customer Row */}
                      <tr className={`hover:bg-slate-50/80 transition-colors ${isExpanded ? 'bg-blue-50/30' : ''}`}>
                        {/* Expand / Collapse Button */}
                        <td className="px-1.5 py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => toggleExpand(c.id)}
                            className={`p-1 rounded-lg transition-all ${
                              isExpanded 
                                ? 'bg-blue-600 text-white shadow-xs' 
                                : 'hover:bg-slate-100 text-slate-500'
                            }`}
                            title={isExpanded ? 'Thu gọn' : 'Xem lịch sử tour'}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 font-black" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        {/* Customer Name - NO Avatar, No Line Wrap */}
                        <td className="px-2.5 py-3 whitespace-nowrap">
                          <span className="font-black text-slate-900 text-xs tracking-tight uppercase whitespace-nowrap block">
                            {c.full_name}
                          </span>
                        </td>

                        {/* Phone */}
                        <td className="px-2.5 py-3 text-xs font-semibold text-slate-700 whitespace-nowrap">
                          {c.phone ? (
                            <span className="inline-flex items-center gap-1 font-semibold">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {c.phone}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* Passport */}
                        <td className="px-2.5 py-3 text-xs whitespace-nowrap">
                          {c.passport_number ? (
                            <span className="font-mono font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md uppercase text-[11px]">
                              {c.passport_number}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-mono">-</span>
                          )}
                        </td>

                        {/* Membership Tier */}
                        <td className="px-2 py-3 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-wide border ${tierInfo.badge}`}>
                            <TierIcon className="w-3 h-3 shrink-0" />
                            {tierInfo.name}
                          </span>
                        </td>

                        {/* Booking Count */}
                        <td className="px-2 py-3 text-center whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-black bg-blue-50 text-blue-700 border border-blue-200/80">
                            <History className="w-3 h-3" />
                            {c.bookings.length} Tour
                          </span>
                        </td>

                        {/* Latest Visa */}
                        <td className="px-2.5 py-3 whitespace-nowrap">
                          {latestBooking ? getVisaBadge(latestBooking.visa_status, latestBooking.visa_disqualified_reason) : <span className="text-slate-300">-</span>}
                        </td>

                        {/* Toggle Expand View Button */}
                        <td className="px-2.5 py-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => toggleExpand(c.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                              isExpanded 
                                ? 'bg-blue-600 text-white shadow-xs' 
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            {isExpanded ? 'Đóng' : 'Chi tiết'}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Section showing all tour registrations */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={8} className="p-0 bg-slate-50/90 border-b border-slate-200/90 shadow-inner">
                            <div className="p-3 sm:p-4 md:p-5 space-y-4">
                              
                              {/* Expanded Customer Overview Header */}
                              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                                  <div>
                                    <h4 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                                      {c.full_name}
                                      <span className={`px-2.5 py-0.5 rounded-md text-[10px] uppercase font-black border ${tierInfo.badge}`}>
                                        {tierInfo.name}
                                      </span>
                                    </h4>
                                    <p className="text-xs text-slate-500 mt-1">
                                      Hồ sơ chi tiết & Lịch sử đăng ký dịch vụ của khách hàng
                                    </p>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                                    <div className="text-left lg:text-right">
                                      <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Tổng chi tiêu tích lũy</span>
                                      <span className="text-lg font-black text-emerald-600">{c.totalSpent.toLocaleString('vi-VN')} đ</span>
                                    </div>
                                    <div className="text-left lg:text-right">
                                      <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Số Tour đã tham gia</span>
                                      <span className="text-lg font-black text-blue-600">{c.bookings.length} Tour</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Key Info Grid inside detail view */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs pt-1">
                                  <div>
                                    <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Ngày sinh</span>
                                    <span className="font-bold text-slate-800">{formatDob(c.dob)}</span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Số hộ chiếu</span>
                                    <span className="font-mono font-bold text-slate-800 uppercase">{c.passport_number || 'Chưa cập nhật'}</span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Số điện thoại</span>
                                    <span className="font-semibold text-slate-800">{c.phone || 'Chưa cập nhật'}</span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Trạng thái Visa gần nhất</span>
                                    <div className="mt-0.5">{latestBooking ? getVisaBadge(latestBooking.visa_status, latestBooking.visa_disqualified_reason) : <span className="text-slate-400">-</span>}</div>
                                  </div>
                                </div>
                              </div>

                              {/* Section 1: Tour Registrations List */}
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                    <Briefcase className="w-4 h-4 text-blue-600" />
                                    Lịch sử đăng ký Tour ({c.bookings.length} lần tham gia)
                                  </h4>
                                </div>
                                
                                <div className="overflow-x-auto border border-slate-200/90 rounded-xl shadow-xs bg-white">
                                  <table className="min-w-full divide-y divide-slate-150">
                                    <thead className="bg-slate-100/80">
                                      <tr className="whitespace-nowrap">
                                        <th scope="col" className="px-3 py-2.5 text-left text-[10px] font-extrabold text-slate-600 uppercase">Mã booking</th>
                                        <th scope="col" className="px-3 py-2.5 text-left text-[10px] font-extrabold text-slate-600 uppercase">Tour tham gia</th>
                                        <th scope="col" className="px-3 py-2.5 text-left text-[10px] font-extrabold text-slate-600 uppercase">Ngày đi</th>
                                        <th scope="col" className="px-3 py-2.5 text-left text-[10px] font-extrabold text-slate-600 uppercase">Vai trò</th>
                                        <th scope="col" className="px-3 py-2.5 text-left text-[10px] font-extrabold text-slate-600 uppercase">Hồ sơ / Visa</th>
                                        <th scope="col" className="px-3 py-2.5 text-center text-[10px] font-extrabold text-slate-600 uppercase">Thao tác</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                      {c.bookings.map((b) => {
                                        return (
                                          <tr key={b.passenger_id} className="hover:bg-slate-50/60 transition-colors">
                                            {/* Order ID */}
                                            <td className="px-3 py-2.5 text-xs font-black text-blue-600 font-mono whitespace-nowrap">
                                              {b.order_id ? (
                                                 <button
                                                   type="button"
                                                   onClick={(e) => {
                                                     e.stopPropagation();
                                                     const cleanCode = b.order_id.substring(0, 8).toUpperCase();
                                                     navigator.clipboard.writeText(cleanCode);
                                                     toast.success(`Đã sao chép mã đơn hàng: ${cleanCode}`);
                                                   }}
                                                   className="hover:text-blue-800 hover:underline inline-flex items-center gap-1 cursor-pointer group/copy"
                                                   title="Bấm để sao chép mã đơn hàng"
                                                 >
                                                   #{b.order_id.substring(0, 8)}
                                                   <Copy className="w-3 h-3 text-gray-400 group-hover/copy:text-blue-600 opacity-60 group-hover/copy:opacity-100 transition-opacity" />
                                                 </button>
                                               ) : ''}
                                            </td>

                                            {/* Tour Code & Name */}
                                            <td className="px-3 py-2.5 whitespace-nowrap">
                                              <div className="flex flex-col">
                                                <span className="inline-block self-start px-2 py-0.5 text-[10px] font-black text-blue-700 bg-blue-50 border border-blue-200 rounded uppercase whitespace-nowrap">
                                                  {b.tour_code || 'TOUR'}
                                                </span>
                                                <span className="text-xs font-bold text-slate-900 mt-1 max-w-sm truncate" title={b.tour_name}>
                                                  {b.tour_name || 'N/A'}
                                                </span>
                                              </div>
                                            </td>

                                            {/* Date */}
                                            <td className="px-3 py-2.5 text-xs font-semibold text-slate-600 whitespace-nowrap">
                                              {b.created_at ? formatDob(b.created_at) : '-'}
                                            </td>

                                            {/* Role */}
                                            <td className="px-3 py-2.5 whitespace-nowrap">
                                              {b.is_payer ? (
                                                <span className="px-2.5 py-1 rounded text-[10px] font-extrabold bg-blue-100 text-blue-900 uppercase tracking-wide border border-blue-200 whitespace-nowrap inline-block">
                                                  Trưởng đoàn
                                                </span>
                                              ) : (
                                                <span className="px-2.5 py-1 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase tracking-wide border border-slate-200 whitespace-nowrap inline-block">
                                                  Đi cùng
                                                </span>
                                              )}
                                            </td>

                                            {/* Documents / Visa badge */}
                                            <td className="px-3 py-2.5 whitespace-nowrap">
                                               <div className="flex flex-col gap-1.5 min-w-[150px]">
                                                 <div className="whitespace-nowrap">{getVisaBadge(b.visa_status, b.visa_disqualified_reason)}</div>
                                                 <PassengerDocumentList 
                                                   passportUrl={b.passport_url}
                                                   maxInitialDisplay={2}
                                                   variant="compact"
                                                 />
                                               </div>
                                             </td>

                                            {/* Action button inside this booking */}
                                            <td className="px-3 py-2.5 text-center whitespace-nowrap">
                                              <div className="flex items-center justify-center gap-2">
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    const realP = passengers.find(rp => rp.id === b.passenger_id);
                                                    if (realP) {
                                                      setEditingPassenger(realP);
                                                      setIsEditModalOpen(true);
                                                    }
                                                  }}
                                                  className="px-3 py-1.5 inline-flex items-center gap-1.5 text-xs font-extrabold text-blue-700 hover:text-blue-900 hover:bg-blue-50 border border-blue-200 rounded-lg transition-all cursor-pointer"
                                                >
                                                  <Edit className="w-3.5 h-3.5" />
                                                  Sửa hồ sơ
                                                </button>
                                                {currentRole === 'admin' && (
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      const realP = passengers.find(rp => rp.id === b.passenger_id);
                                                      setPassengerToDelete({
                                                        id: b.passenger_id,
                                                        name: realP?.full_name || 'Khách hàng'
                                                      });
                                                    }}
                                                    className="px-3 py-1.5 inline-flex items-center gap-1.5 text-xs font-extrabold text-rose-700 hover:text-rose-900 hover:bg-rose-50 border border-rose-200 rounded-lg transition-all cursor-pointer"
                                                  >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                    Xóa
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
                              </div>

                              {/* Section 2: Related Passengers (Companions / Payers) */}
                              {(() => {
                                const relatedList: Array<{
                                  order_id: string;
                                  tour_code?: string;
                                  tour_name?: string;
                                  passenger_name: string;
                                  relationship: 'paid_by_them' | 'paid_for_them';
                                  phone?: string;
                                  passport?: string;
                                  visa_status: Passenger['visa_status'];
                                  visa_disqualified_reason?: string;
                                }> = [];

                                c.bookings.forEach(b => {
                                  if (b.is_payer) {
                                    const companions = passengers.filter(p => p.order_id === b.order_id && p.id !== b.passenger_id);
                                    companions.forEach(comp => {
                                      const compName = (comp.full_name || comp.name || '').trim();
                                      const isPlaceholder = compName === 'Chưa cung cấp (Giữ chỗ tạm)' ||
                                        compName === 'Chưa cung cấp' ||
                                        compName.startsWith('Người lớn #') ||
                                        compName.startsWith('Trẻ em #') ||
                                        compName.startsWith('Trẻ nhỏ #');

                                      if (compName && !isPlaceholder) {
                                        relatedList.push({
                                          order_id: b.order_id,
                                          tour_code: b.tour_code,
                                          tour_name: b.tour_name,
                                          passenger_name: compName,
                                          relationship: 'paid_by_them',
                                          phone: comp.phone,
                                          passport: comp.passport_number,
                                          visa_status: comp.visa_status,
                                          visa_disqualified_reason: comp.visa_disqualified_reason
                                        });
                                      }
                                    });
                                  } else {
                                    const orderPayer = passengers.find(p => p.order_id === b.order_id && p.is_payer);
                                    if (orderPayer) {
                                      const payerName = (orderPayer.full_name || orderPayer.name || '').trim();
                                      const isPlaceholder = payerName === 'Chưa cung cấp (Giữ chỗ tạm)' ||
                                        payerName === 'Chưa cung cấp' ||
                                        payerName.startsWith('Người lớn #') ||
                                        payerName.startsWith('Trẻ em #') ||
                                        payerName.startsWith('Trẻ nhỏ #');

                                      if (payerName && !isPlaceholder) {
                                        relatedList.push({
                                          order_id: b.order_id,
                                          tour_code: b.tour_code,
                                          tour_name: b.tour_name,
                                          passenger_name: payerName,
                                          relationship: 'paid_for_them',
                                          phone: orderPayer.phone,
                                          passport: orderPayer.passport_number,
                                          visa_status: orderPayer.visa_status,
                                          visa_disqualified_reason: orderPayer.visa_disqualified_reason
                                        });
                                      }
                                    }
                                  }
                                });

                                if (relatedList.length === 0) return null;

                                return (
                                  <div className="space-y-3 pt-2">
                                    <h5 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                      <Users className="w-4 h-4 text-emerald-600" />
                                      Hành khách liên quan (Đi cùng đoàn trong booking)
                                    </h5>
                                    <div className="overflow-x-auto border border-emerald-200/80 rounded-xl shadow-2xs bg-white">
                                      <table className="min-w-full divide-y divide-slate-150">
                                        <thead className="bg-emerald-50/50">
                                          <tr>
                                            <th scope="col" className="px-3 py-2.5 text-left text-[10px] font-extrabold text-emerald-900 uppercase">Họ và tên</th>
                                            <th scope="col" className="px-3 py-2.5 text-left text-[10px] font-extrabold text-emerald-900 uppercase">Mối quan hệ booking</th>
                                            <th scope="col" className="px-3 py-2.5 text-left text-[10px] font-extrabold text-emerald-900 uppercase">Mã đơn</th>
                                            <th scope="col" className="px-3 py-2.5 text-left text-[10px] font-extrabold text-emerald-900 uppercase">Hộ chiếu</th>
                                            <th scope="col" className="px-3 py-2.5 text-left text-[10px] font-extrabold text-emerald-900 uppercase">Điện thoại</th>
                                            <th scope="col" className="px-3 py-2.5 text-left text-[10px] font-extrabold text-emerald-900 uppercase">Visa</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white text-xs">
                                          {relatedList.map((rel, rIdx) => (
                                            <tr key={rIdx} className="hover:bg-slate-50/60">
                                              <td className="px-5 py-3 font-extrabold text-slate-900 uppercase">{rel.passenger_name}</td>
                                              <td className="px-5 py-3">
                                                {rel.relationship === 'paid_by_them' ? (
                                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                    Được khách này thanh toán (Đi cùng)
                                                  </span>
                                                ) : (
                                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                                    Người trả tiền (Trưởng đoàn)
                                                  </span>
                                                )}
                                              </td>
                                              <td className="px-5 py-3 font-mono font-bold text-slate-500">{rel.order_id ? (
                                                 <button
                                                   type="button"
                                                   onClick={(e) => {
                                                     e.stopPropagation();
                                                     const cleanCode = rel.order_id.substring(0, 8).toUpperCase();
                                                     navigator.clipboard.writeText(cleanCode);
                                                     toast.success(`Đã sao chép mã đơn hàng: ${cleanCode}`);
                                                   }}
                                                   className="hover:text-blue-800 hover:underline inline-flex items-center gap-1 cursor-pointer group/copy"
                                                   title="Bấm để sao chép mã đơn hàng"
                                                 >
                                                   #{rel.order_id.substring(0, 8)}
                                                   <Copy className="w-3 h-3 text-gray-400 group-hover/copy:text-blue-600 opacity-60 group-hover/copy:opacity-100 transition-opacity" />
                                                 </button>
                                               ) : ''}</td>
                                              <td className="px-5 py-3 font-mono font-bold text-slate-700">{rel.passport || '-'}</td>
                                              <td className="px-5 py-3 font-semibold text-slate-700">{rel.phone || '-'}</td>
                                              <td className="px-5 py-3">{getVisaBadge(rel.visa_status, rel.visa_disqualified_reason)}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* Delete Confirmation Modal */}
      <ActionModal
        isOpen={!!passengerToDelete}
        onClose={() => setPassengerToDelete(null)}
        title="Xóa khách hàng"
        message={`Bạn có chắc chắn muốn xóa khách hàng "${passengerToDelete?.name}" khỏi hệ thống không? Hành động này không thể hoàn tác.`}
        onConfirm={() => {
          if (passengerToDelete) {
            deletePassenger(passengerToDelete.id);
            setPassengerToDelete(null);
          }
        }}
      />

      {/* Edit Passenger Dialog Modal */}
      {isEditModalOpen && editingPassenger && (
        <EditPassengerModal 
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingPassenger(null);
          }}
          passenger={editingPassenger}
          tourPriceVisa={editingPassenger ? tours.find(t => t.id === allOrders.find(o => o.id === editingPassenger.order_id)?.tour_id)?.price_visa_tour : undefined}
          onSave={(passengerId, updatedData) => {
            updatePassenger(passengerId, updatedData);
            setIsEditModalOpen(false);
            setEditingPassenger(null);
          }}
        />
      )}

      {/* Disqualified Reason Modal */}
      {disqualifiedReasonModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="disqualified_reason_modal">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-rose-100 transform transition-all duration-300 scale-100">
            <div className="bg-rose-50 px-6 py-4 flex items-center justify-between border-b border-rose-100">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600" />
                <h3 className="text-sm font-black text-rose-950 uppercase tracking-wide">Chi tiết hồ sơ chưa đạt</h3>
              </div>
              <button
                type="button"
                onClick={() => setDisqualifiedReasonModal(null)}
                className="text-rose-400 hover:text-rose-600 transition-colors p-1 rounded-lg cursor-pointer flex items-center justify-center"
                title="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Khách hàng</span>
                <span className="text-sm font-extrabold text-slate-950 uppercase mt-0.5 block">{disqualifiedReasonModal.name}</span>
              </div>
              <div className="p-4 bg-rose-50/50 rounded-xl border border-rose-100">
                <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block mb-1">Lý do cụ thể</span>
                <p className="text-xs font-semibold text-rose-950 whitespace-pre-wrap leading-relaxed">{disqualifiedReasonModal.reason}</p>
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-3.5 flex justify-end">
              <button
                type="button"
                onClick={() => setDisqualifiedReasonModal(null)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 transition-all text-white font-extrabold text-xs rounded-xl uppercase shadow-md shadow-rose-600/10 cursor-pointer"
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
