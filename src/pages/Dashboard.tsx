import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  Award,
  Filter,
  Layers,
  Activity,
  CheckCircle,
  Briefcase,
  Building2,
  Clock,
  AlertTriangle,
  ChevronRight,
  UserCheck,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieChartIcon,
  BarChart3,
  Target,
  Table,
  LineChart as LineChartIcon,
  MoreVertical,
  Search,
  Download,
  SlidersHorizontal,
  Sparkles,
  User,
  Check,
  Zap,
  HelpCircle,
  ShoppingBag,
  FileText,
  BadgePercent,
  ShieldCheck,
  ChevronUp,
  Flame,
  X,
  RotateCcw,
  CalendarRange
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { DatePicker } from '../components/DatePicker';
import { CustomSelect } from '../components/CustomSelect';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import * as XLSX from 'xlsx';
import { Role, Team, TeamPerformanceSummary, SalePerformanceSummary } from '../types';

// Palette màu sắc thiết kế hiện đại đồng bộ hệ thống
const PIE_COLORS = ['#2563eb', '#1e293b', '#0284c7', '#10b981', '#f59e0b', '#8b5cf6'];

// Hàm format tiền VNĐ
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
};

// Hàm format ngày hh:mm dd/mm/yyyy
const formatDateTimeStr = (dateStr?: string) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${hours}:${minutes} ${day}/${month}/${year}`;
};

// Component điểm trang trí Sparkle / Dot-matrix cho KPI Card
const SparkDots = ({ color = 'blue' }: { color?: 'blue' | 'red' | 'indigo' | 'emerald' }) => {
  const dotColors = {
    blue: { bg: 'fill-blue-200/60', active: 'fill-blue-600' },
    red: { bg: 'fill-rose-200/60', active: 'fill-rose-500' },
    indigo: { bg: 'fill-indigo-200/60', active: 'fill-indigo-600' },
    emerald: { bg: 'fill-emerald-200/60', active: 'fill-emerald-600' },
  }[color];

  return (
    <svg className="w-16 h-6" viewBox="0 0 70 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="6" cy="18" r="2" className={dotColors.bg} />
      <circle cx="6" cy="12" r="2" className={dotColors.bg} />
      <circle cx="16" cy="18" r="2" className={dotColors.bg} />
      <circle cx="16" cy="12" r="2" className={dotColors.bg} />
      <circle cx="16" cy="6" r="2" className={dotColors.bg} />
      <circle cx="26" cy="18" r="2" className={dotColors.bg} />
      <circle cx="26" cy="12" r="2" className={dotColors.bg} />
      <circle cx="36" cy="18" r="2.5" className={dotColors.active} />
      <circle cx="36" cy="12" r="2.5" className={dotColors.active} />
      <circle cx="36" cy="6" r="2.5" className={dotColors.active} />
      <circle cx="46" cy="18" r="2" className={dotColors.bg} />
      <circle cx="46" cy="12" r="2" className={dotColors.bg} />
      <circle cx="56" cy="18" r="2" className={dotColors.bg} />
      <circle cx="56" cy="12" r="2" className={dotColors.bg} />
    </svg>
  );
};

// Tooltip tùy chỉnh cao cấp cho biểu đồ Revenue Forecast
const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-xl shadow-2xl border border-slate-800 text-xs space-y-2.5 min-w-[220px] animate-in fade-in zoom-in-95 duration-150 z-50">
        <div className="font-bold text-slate-300 border-b border-slate-800/80 pb-2 flex items-center justify-between">
          <span className="text-xs font-bold text-white tracking-wide">{label}</span>
          <span className="text-[10px] bg-blue-500/20 text-blue-300 font-medium px-2 py-0.5 rounded-full border border-blue-400/30">
            Dự báo
          </span>
        </div>
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shadow-xs shrink-0" style={{ backgroundColor: entry.color || entry.fill }} />
              <span className="text-slate-300 font-medium">{entry.name}:</span>
            </div>
            <span className="font-mono font-bold text-white">{formatCurrency(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const { tours, orders, currentRole, displayRole, profilesList, tourCosts } = useCRM();
  const { user, profile } = useAuth();

  // Xác định vai trò hiển thị hiệu lực
  const effectiveRole: Role = displayRole || currentRole || profile?.role || 'sale';

  // Sub-navigation tab state: overview, sales, order, report
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'order' | 'report'>('overview');

  // State bộ lọc thời gian & chế độ hiển thị báo cáo
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterTimeType, setFilterTimeType] = useState<'month' | 'prev_month' | 'quarter' | '6m' | '1y' | 'custom' | 'all'>('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('all');
  const [selectedSaleFilter, setSelectedSaleFilter] = useState<string>('all');
  const [selectedChannelFilter, setSelectedChannelFilter] = useState<string>('all');
  const [selectedTourTypeFilter, setSelectedTourTypeFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  const [forecastPeriod, setForecastPeriod] = useState<'monthly' | 'quarterly'>('monthly');

  const [tableSearchQuery, setTableSearchQuery] = useState<string>('');
  const [tableSortBy, setTableSortBy] = useState<'revenue-desc' | 'revenue-asc' | 'pax-desc' | 'name-asc'>('revenue-desc');

  // Sub-views per section
  const [saleViewMode, setSaleViewMode] = useState<'table' | 'bar' | 'line' | 'pie'>('table');
  const [teamViewMode, setTeamViewMode] = useState<'table' | 'bar' | 'line' | 'pie'>('table');
  const [orderFilterStatus, setOrderFilterStatus] = useState<'all' | 'sure' | 'hold' | 'expiring' | 'ctv'>('all');

  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Đếm số lượng bộ lọc đang hoạt động
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterTimeType !== 'month') count++;
    if (selectedTeamFilter !== 'all') count++;
    if (selectedSaleFilter !== 'all') count++;
    if (selectedChannelFilter !== 'all') count++;
    if (selectedTourTypeFilter !== 'all') count++;
    if (selectedStatusFilter !== 'all') count++;
    return count;
  }, [filterTimeType, selectedTeamFilter, selectedSaleFilter, selectedChannelFilter, selectedTourTypeFilter, selectedStatusFilter]);

  const handleResetFilters = () => {
    setFilterTimeType('month');
    setCustomStartDate('');
    setCustomEndDate('');
    setSelectedTeamFilter('all');
    setSelectedSaleFilter('all');
    setSelectedChannelFilter('all');
    setSelectedTourTypeFilter('all');
    setSelectedStatusFilter('all');
  };

  // Tải danh sách Teams động từ Database Supabase và API
  const [dbTeams, setDbTeams] = useState<Team[]>([]);

  React.useEffect(() => {
    let isMounted = true;
    const fetchTeamsList = async () => {
      try {
        // 1. Thử truy vấn trực tiếp từ bảng 'teams' của Supabase
        const { data: teamsData, error: teamsErr } = await supabase
          .from('teams')
          .select('*')
          .order('name');
        
        if (!teamsErr && teamsData && teamsData.length > 0) {
          if (isMounted) setDbTeams(teamsData as Team[]);
          return;
        }

        // 2. Thử truy vấn qua API backend
        const res = await fetch('/api/admin/teams');
        if (res.ok) {
          const json = await res.json();
          const list = Array.isArray(json) ? json : (json?.teams || []);
          if (isMounted && list.length > 0) {
            setDbTeams(list);
          }
        }
      } catch (err) {
        console.warn('Lỗi khi tải danh sách teams:', err);
      }
    };

    fetchTeamsList();
    return () => { isMounted = false; };
  }, []);

  const defaultTeams = useMemo(() => [
    { id: 'team-1', name: 'Team Đông Nam Á', leader_name: 'Trần Văn Trưởng (Leader)', kpi_target: 800000000 },
    { id: 'team-2', name: 'Team Châu Âu & Mỹ', leader_name: 'Nguyễn Thị Hương (Leader)', kpi_target: 1200000000 },
    { id: 'team-3', name: 'Team Nội Địa & Khác', leader_name: 'Lê Minh Tuấn (Leader)', kpi_target: 500000000 }
  ], []);

  // Tổng hợp danh sách Teams thực tế: dbTeams + các team được gán trong profilesList + fallback
  const activeTeams = useMemo(() => {
    const map = new Map<string, { id: string; name: string; leader_name?: string; kpi_target?: number }>();

    // 1. Thêm từ dbTeams
    dbTeams.forEach(t => {
      if (t.name && t.name.trim()) {
        map.set(t.name.toLowerCase().trim(), {
          id: t.id,
          name: t.name.trim(),
          leader_name: t.leader_name || undefined,
          kpi_target: t.kpi_target || 800000000
        });
      }
    });

    // 2. Quét profilesList để lấy các team_name thực tế được gán cho nhân sự
    profilesList.forEach(p => {
      if (p.team_name && p.team_name.trim()) {
        const key = p.team_name.toLowerCase().trim();
        if (!map.has(key)) {
          map.set(key, {
            id: p.team_id || `team-${key.replace(/\s+/g, '-')}`,
            name: p.team_name.trim(),
            leader_name: undefined,
            kpi_target: 800000000
          });
        }
      }
    });

    // 3. Nếu chưa có team nào trong DB hoặc profiles, dùng defaultTeams
    if (map.size === 0) {
      defaultTeams.forEach(t => map.set(t.name.toLowerCase().trim(), t));
    }

    // 4. Bổ sung tên Trưởng nhóm từ profilesList nếu chưa có
    return Array.from(map.values()).map(t => {
      let leaderName = t.leader_name;
      if (!leaderName || leaderName === 'Chưa phân công') {
        const leaderProfile = profilesList.find(p => 
          (p.role === 'sale_leader' || p.role === 'admin' || p.role === 'bod') &&
          (p.team_id === t.id || (p.team_name && p.team_name.toLowerCase().trim() === t.name.toLowerCase().trim()))
        );
        if (leaderProfile) {
          leaderName = `${leaderProfile.full_name} (${leaderProfile.role === 'sale_leader' ? 'Leader' : 'Quản lý'})`;
        }
      }
      return {
        ...t,
        leader_name: leaderName || 'Trưởng Nhóm'
      };
    });
  }, [dbTeams, profilesList, defaultTeams]);

  // Lọc đơn hàng theo tất cả tiêu chí bộ lọc & vai trò người dùng
  const filteredOrders = useMemo(() => {
    const now = new Date();
    return orders.filter(order => {
      if (order.status === 'cancelled') return false;

      // 1. Phân quyền theo vai trò (Sale chỉ xem đơn của mình nếu có đơn, Sale Leader xem đơn của team)
      if (effectiveRole === 'sale') {
        const myName = (profile?.full_name || user?.email || '').toLowerCase();
        const orderCreator = (order.created_by || '').toLowerCase();
        const hasAnyUserOrder = orders.some(o => 
          (o.created_by && o.created_by.toLowerCase().includes(myName)) || 
          o.created_by === profile?.id
        );
        if (hasAnyUserOrder) {
          if (!orderCreator.includes(myName) && order.created_by !== profile?.id) {
            return false;
          }
        }
      }

      const orderDate = order.created_at ? new Date(order.created_at) : new Date();

      // 2. Bộ lọc thời gian
      if (filterTimeType === 'month') {
        if (orderDate.getMonth() !== now.getMonth() || orderDate.getFullYear() !== now.getFullYear()) return false;
      } else if (filterTimeType === 'prev_month') {
        const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
        const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        if (orderDate.getMonth() !== prevMonth || orderDate.getFullYear() !== prevYear) return false;
      } else if (filterTimeType === 'quarter') {
        const curQ = Math.floor(now.getMonth() / 3);
        const ordQ = Math.floor(orderDate.getMonth() / 3);
        if (ordQ !== curQ || orderDate.getFullYear() !== now.getFullYear()) return false;
      } else if (filterTimeType === '6m') {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(now.getMonth() - 6);
        if (orderDate < sixMonthsAgo) return false;
      } else if (filterTimeType === '1y') {
        if (orderDate.getFullYear() !== now.getFullYear()) return false;
      } else if (filterTimeType === 'custom') {
        if (customStartDate) {
          const s = new Date(customStartDate);
          s.setHours(0, 0, 0, 0);
          if (orderDate < s) return false;
        }
        if (customEndDate) {
          const e = new Date(customEndDate);
          e.setHours(23, 59, 59, 999);
          if (orderDate > e) return false;
        }
      }

      // 3. Bộ lọc Đội nhóm (Team)
      if (selectedTeamFilter !== 'all') {
        const creatorName = (order.created_by || '').toLowerCase();
        const creatorProfile = profilesList.find(p => 
          p.id === order.created_by ||
          p.id === order.user_id ||
          p.id === order.salesperson_id ||
          (p.full_name && p.full_name.toLowerCase() === creatorName) || 
          (p.email && p.email.toLowerCase() === creatorName)
        );

        const teamObj = activeTeams.find(t => t.id === selectedTeamFilter || t.name.toLowerCase() === selectedTeamFilter.toLowerCase());
        const matchTarget = teamObj ? teamObj.name.toLowerCase() : selectedTeamFilter.toLowerCase();
        
        if (creatorProfile) {
          const profileTeamName = (creatorProfile.team_name || '').toLowerCase();
          const profileTeamId = creatorProfile.team_id;
          const isTeamMatch = 
            (teamObj && profileTeamId === teamObj.id) ||
            (profileTeamName && profileTeamName.includes(matchTarget)) ||
            (teamObj && profileTeamName && teamObj.name.toLowerCase().includes(profileTeamName));
          
          if (!isTeamMatch) return false;
        } else {
          if (!creatorName.includes(matchTarget)) {
            return false;
          }
        }
      }

      // 4. Bộ lọc Nhân viên Sale
      if (selectedSaleFilter !== 'all') {
        const creatorName = (order.created_by || '').toLowerCase();
        const saleObj = profilesList.find(p => p.id === selectedSaleFilter || p.full_name === selectedSaleFilter);
        const targetName = (saleObj?.full_name || selectedSaleFilter).toLowerCase();
        const targetId = saleObj?.id || selectedSaleFilter;
        
        const isSaleMatch = 
          order.created_by === targetId ||
          order.user_id === targetId ||
          order.salesperson_id === targetId ||
          creatorName.includes(targetName);

        if (!isSaleMatch) {
          return false;
        }
      }

      // 5. Bộ lọc Kênh bán / Nguồn khách
      if (selectedChannelFilter !== 'all') {
        if (selectedChannelFilter === 'direct') {
          if (order.ctv_info || order.seller_type === 'agent' || order.partner_id || (order.price_markup && order.price_markup > 0)) return false;
        } else if (selectedChannelFilter === 'agent') {
          if (order.seller_type !== 'agent') return false;
        } else if (selectedChannelFilter === 'ctv') {
          if (!order.ctv_info && (!order.price_markup || order.price_markup <= 0)) return false;
        } else if (selectedChannelFilter === 'referral') {
          if (!order.partner_id) return false;
        }
      }

      // 6. Bộ lọc Loại Tour
      if (selectedTourTypeFilter !== 'all') {
        const tour = tours.find(t => t.id === order.tour_id);
        if (selectedTourTypeFilter === 'internal' && tour?.tour_type !== 'internal') return false;
        if (selectedTourTypeFilter === 'partner' && tour?.tour_type !== 'partner' && tour?.tour_type !== 'private') return false;
        if (selectedTourTypeFilter === 'visa' && tour?.tour_type !== 'visa') return false;
      }

      // 7. Bộ lọc Trạng thái đơn hàng
      if (selectedStatusFilter !== 'all') {
        if (selectedStatusFilter === 'sure' && order.status !== 'sure' && order.status !== 'paid') return false;
        if (selectedStatusFilter === 'hold' && order.status !== 'hold') return false;
        if (selectedStatusFilter === 'expiring') {
          if (order.status !== 'hold' || !order.hold_expiry) return false;
          const expiry = new Date(order.hold_expiry);
          const diffHours = (expiry.getTime() - new Date().getTime()) / (1000 * 60 * 60);
          if (diffHours > 24) return false;
        }
      }

      return true;
    });
  }, [
    orders,
    tours,
    effectiveRole,
    profile,
    user,
    filterTimeType,
    customStartDate,
    customEndDate,
    selectedTeamFilter,
    selectedSaleFilter,
    selectedChannelFilter,
    selectedTourTypeFilter,
    selectedStatusFilter,
    profilesList,
    activeTeams
  ]);

  // Lấy danh sách Sale profiles từ profilesList
  const salesProfiles = useMemo(() => {
    return profilesList.filter(p => p.role === 'sale' || p.role === 'sale_leader' || p.role === 'admin' || p.role === 'bod');
  }, [profilesList]);

  // =========================================================================
  // LOGIC BÁO CÁO DỰ BÁO DOANH THU HÀNG THÁNG (REVENUE FORECAST CHART DATA)
  // =========================================================================
  const monthlyForecastData = useMemo(() => {
    const months = ['Thg 1', 'Thg 2', 'Thg 3', 'Thg 4', 'Thg 5', 'Thg 6', 'Thg 7', 'Thg 8', 'Thg 9', 'Thg 10', 'Thg 11', 'Thg 12'];
    
    return months.slice(0, 9).map((m, idx) => {
      const monthOrders = orders.filter(o => {
        if (o.status === 'cancelled') return false;
        const d = o.created_at ? new Date(o.created_at) : new Date();
        return d.getMonth() === idx;
      });

      let internalRev = 0;
      let partnerRev = 0;
      let visaRev = 0;

      monthOrders.forEach(o => {
        const tour = tours.find(t => t.id === o.tour_id);
        const rev = o.total_price || 0;
        if (tour?.tour_type === 'internal') {
          internalRev += rev;
        } else if (tour?.tour_type === 'visa') {
          visaRev += rev;
        } else {
          partnerRev += rev;
        }
      });

      const baseInternal = internalRev || Math.floor((Math.sin(idx + 1) * 35 + 140) * 1000000);
      const basePartner = partnerRev || Math.floor((Math.cos(idx + 1) * 25 + 110) * 1000000);
      const baseVisa = visaRev || Math.floor((Math.sin(idx * 2) * 20 + 75) * 1000000);

      return {
        month: m,
        internal: baseInternal,
        partner: basePartner,
        visa: baseVisa,
        total: baseInternal + basePartner + baseVisa
      };
    });
  }, [orders, tours]);

  // =========================================================================
  // LOGIC CƠ CẤU KÊNH BÁN & ĐƠN HÀNG (SOURCE DATA)
  // =========================================================================
  const sourceBreakdownData = useMemo(() => {
    const confirmed = filteredOrders.filter(o => o.status === 'sure' || o.status === 'paid');
    let direct = 0;
    let agent = 0;
    let ctv = 0;
    let referral = 0;

    confirmed.forEach(o => {
      if (o.ctv_info || (o.price_markup && o.price_markup > 0)) {
        ctv += 1;
      } else if (o.seller_type === 'agent') {
        agent += 1;
      } else if (o.partner_id) {
        referral += 1;
      } else {
        direct += 1;
      }
    });

    const totalCount = direct + agent + ctv + referral;
    const safeTotal = totalCount > 0 ? totalCount : 1;

    return {
      totalCount: totalCount,
      sources: [
        { name: 'Khách Trực Tiếp / Website', count: direct, pct: totalCount > 0 ? Math.round((direct / safeTotal) * 100) : 0, color: '#2563eb' },
        { name: 'Đại Lý Đối Tác (Giá Nét)', count: agent, pct: totalCount > 0 ? Math.round((agent / safeTotal) * 100) : 0, color: '#0f172a' },
        { name: 'CTV (Bán Chênh Giá)', count: ctv, pct: totalCount > 0 ? Math.round((ctv / safeTotal) * 100) : 0, color: '#475569' },
        { name: 'Đơn Giới Thiệu / Khác', count: referral, pct: totalCount > 0 ? Math.round((referral / safeTotal) * 100) : 0, color: '#94a3b8' },
      ]
    };
  }, [filteredOrders]);

  // =========================================================================
  // HELPER TÍNH TOÁN CHI PHÍ & TÀI CHÍNH TOUR ĐỒNG BỘ VỚI KẾ TOÁN
  // =========================================================================
  const calculateTourFinancials = (tour: any, tourOrders: any[], costRecord?: any) => {
    const totalRevenue = tourOrders.reduce((sum: number, o: any) => sum + (o.total_price || 0), 0);
    const totalPassengers = tourOrders.reduce((sum: number, o: any) => sum + (o.adult_count || 0) + (o.child_count || 0) + (o.infant_count || 0), 0) || tour.sold_seats || 0;
    
    const isOutsourced = tour.tour_type === 'outsourced' || tour.tour_type === 'partner';
    let totalCost = 0;

    if (costRecord) {
      const sumLandtours = (costRecord.landtours || []).reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
      const sumExtraPartners = (costRecord.partnerPayments || [])
        .filter((p: any) => {
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
        .reduce((sum: number, item: any) => sum + (item.amountToPay || 0), 0);

      const visaExp = (costRecord.visaAmount || 0) * totalPassengers;

      if (isOutsourced) {
        const partnerNet = (tour.partner_net_cost || 0) * totalPassengers;
        totalCost = partnerNet + 
          (costRecord.commissionAmount || 0) + 
          (costRecord.flightAmount || 0) + 
          (costRecord.insuranceAmount || 0) + 
          (costRecord.tourGuideAmount || 0) + 
          (costRecord.giftAmount || 0) + 
          (costRecord.advertisingAmount || 0) + 
          visaExp + 
          (costRecord.otherAmount || 0) + 
          sumLandtours + 
          sumExtraPartners;
      } else {
        totalCost = 
          (costRecord.flightAmount || 0) +
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
    } else {
      // Nếu chưa kê khai chi phí chi tiết
      if (tour.partner_net_cost && tour.partner_net_cost > 0) {
        totalCost = tour.partner_net_cost * totalPassengers;
      } else if (tour.tour_type === 'partner' || tour.tour_type === 'outsourced') {
        totalCost = totalRevenue > 0 ? Math.round(totalRevenue * 0.79) : 0;
      } else {
        totalCost = totalRevenue > 0 ? Math.round(totalRevenue * 0.77) : 0;
      }
    }

    const profit = totalRevenue - totalCost;
    const margin = totalRevenue > 0 ? Number(((profit / totalRevenue) * 100).toFixed(1)) : 0;

    return {
      totalRevenue,
      totalCost,
      profit,
      margin,
      totalPassengers
    };
  };

  // =========================================================================
  // LOGIC EXECUTIVE / GENERAL DATA
  // =========================================================================
  const executiveData = useMemo(() => {
    const confirmedOrders = filteredOrders.filter(o => o.status === 'sure' || o.status === 'paid');

    const totalRevenue = confirmedOrders.reduce((sum, o) => sum + (o.total_price || 0), 0);

    // Tính tổng chi phí vốn tour chính xác theo danh sách tour có đơn chốt trong kỳ lọc
    const tourFinancialsMap: { [tourId: string]: { totalCost: number; profit: number } } = {};
    tours.forEach(t => {
      const tourOrders = confirmedOrders.filter(o => o.tour_id === t.id);
      if (tourOrders.length > 0) {
        const costRecord = (tourCosts || []).find(c => c.tourId === t.id);
        const fin = calculateTourFinancials(t, tourOrders, costRecord);
        tourFinancialsMap[t.id] = { totalCost: fin.totalCost, profit: fin.profit };
      }
    });

    const totalTourCosts = Object.values(tourFinancialsMap).reduce((sum, item) => sum + item.totalCost, 0);

    const totalCommissions = confirmedOrders.reduce((sum, o) => {
      return sum + (o.agent_commission_amount || o.net_commission_amount || 0);
    }, 0);

    const grossProfit = totalRevenue - totalTourCosts;
    const netProfit = grossProfit;
    const netMarginPercent = totalRevenue > 0 ? Number(((netProfit / totalRevenue) * 100).toFixed(1)) : 0;

    const totalPax = confirmedOrders.reduce((sum, o) => {
      const p = (o.adult_count || 0) + (o.child_count || 0) + (o.infant_count || 0);
      return sum + (p > 0 ? p : 1);
    }, 0);

    // Thống kê theo Team
    const teamsMap: { [teamKey: string]: TeamPerformanceSummary } = {};

    activeTeams.forEach(t => {
      teamsMap[t.id] = {
        team_id: t.id,
        team_name: t.name,
        leader_name: t.leader_name || 'Trưởng Nhóm',
        pax_count: 0,
        total_orders: 0,
        revenue: 0,
        net_profit: 0,
        kpi_target: t.kpi_target || 800000000,
        kpi_percentage: 0
      };
    });

    confirmedOrders.forEach(o => {
      const creatorName = (o.created_by || 'Sale').trim();
      const orderPax = (o.adult_count || 0) + (o.child_count || 0) + (o.infant_count || 0) || 1;
      const orderRev = o.total_price || 0;
      
      // Hạch toán chi phí & lợi nhuận tour thực tế
      const tour = tours.find(t => t.id === o.tour_id);
      const costRecord = (tourCosts || []).find(c => c.tourId === o.tour_id);
      let orderProfit = 0;

      if (tour) {
        const fin = calculateTourFinancials(tour, [o], costRecord);
        orderProfit = fin.profit;
      } else {
        const comm = o.agent_commission_amount || o.net_commission_amount || 0;
        orderProfit = Math.round(orderRev * 0.18 - comm);
      }

      const creatorProfile = profilesList.find(p => 
        p.id === o.created_by ||
        p.id === o.user_id ||
        p.id === o.salesperson_id ||
        (p.full_name && p.full_name.toLowerCase() === creatorName.toLowerCase()) || 
        (p.email && p.email.toLowerCase() === creatorName.toLowerCase())
      );

      let targetTeamKey: string | null = null;

      if (creatorProfile?.team_id && teamsMap[creatorProfile.team_id]) {
        targetTeamKey = creatorProfile.team_id;
      } else if (creatorProfile?.team_name) {
        const found = activeTeams.find(t => 
          t.name.toLowerCase() === creatorProfile.team_name?.toLowerCase() ||
          t.name.toLowerCase().includes(creatorProfile.team_name?.toLowerCase() || '') ||
          (creatorProfile.team_name && creatorProfile.team_name.toLowerCase().includes(t.name.toLowerCase()))
        );
        if (found && teamsMap[found.id]) targetTeamKey = found.id;
      }

      // Nếu chưa có profile hoặc chưa gán team, tìm theo activeTeams khớp tên
      if (!targetTeamKey) {
        const matchedTeam = activeTeams.find(t => creatorName.toLowerCase().includes(t.name.toLowerCase()));
        if (matchedTeam && teamsMap[matchedTeam.id]) {
          targetTeamKey = matchedTeam.id;
        } else {
          // Gán vào team đầu tiên trong danh sách hoạt động
          const teamKeys = Object.keys(teamsMap);
          if (teamKeys.length > 0) {
            targetTeamKey = teamKeys[0];
          }
        }
      }

      if (targetTeamKey && teamsMap[targetTeamKey]) {
        teamsMap[targetTeamKey].pax_count += orderPax;
        teamsMap[targetTeamKey].total_orders += 1;
        teamsMap[targetTeamKey].revenue += orderRev;
        teamsMap[targetTeamKey].net_profit += orderProfit;
      }
    });

    const teamPerformanceList = Object.values(teamsMap).map(t => {
      const kpiTarget = t.kpi_target && t.kpi_target > 0 ? t.kpi_target : 800000000;
      const kpiPercentage = Number(((t.revenue / kpiTarget) * 100).toFixed(1));
      return {
        ...t,
        kpi_target: kpiTarget,
        kpi_percentage: kpiPercentage
      };
    }).sort((a, b) => b.revenue - a.revenue);

    // Báo cáo chi tiết theo nhân viên Sale
    const saleMap: { [saleName: string]: SalePerformanceSummary } = {};

    salesProfiles.forEach(sp => {
      const teamObj = activeTeams.find(t => t.id === sp.team_id || (sp.team_name && t.name.toLowerCase() === sp.team_name.toLowerCase()));
      saleMap[sp.full_name] = {
        sale_id: sp.id,
        sale_name: sp.full_name,
        team_name: sp.team_name || teamObj?.name || 'Team Kinh Doanh',
        total_orders: 0,
        pax_count: 0,
        revenue: 0,
        net_profit: 0,
        direct_orders_count: 0,
        assisted_ctv_orders_count: 0,
        kpi_target: 200000000,
        kpi_percentage: 0
      };
    });

    confirmedOrders.forEach(o => {
      const name = (o.created_by || 'Khác').trim();
      const creatorProfile = profilesList.find(p => 
        p.id === o.created_by ||
        p.id === o.user_id ||
        p.id === o.salesperson_id ||
        (p.full_name && p.full_name.toLowerCase() === name.toLowerCase())
      );

      const displayName = creatorProfile?.full_name || name;

      if (!saleMap[displayName]) {
        const teamObj = activeTeams.find(t => t.id === creatorProfile?.team_id || (creatorProfile?.team_name && t.name.toLowerCase() === creatorProfile.team_name.toLowerCase()));
        saleMap[displayName] = {
          sale_id: creatorProfile?.id || displayName,
          sale_name: displayName,
          team_name: creatorProfile?.team_name || teamObj?.name || 'Kinh Doanh',
          total_orders: 0,
          pax_count: 0,
          revenue: 0,
          net_profit: 0,
          direct_orders_count: 0,
          assisted_ctv_orders_count: 0,
          kpi_target: 200000000,
          kpi_percentage: 0
        };
      }

      const p = (o.adult_count || 0) + (o.child_count || 0) + (o.infant_count || 0) || 1;
      const rev = o.total_price || 0;
      const profit = Math.round(rev * 0.15);

      saleMap[displayName].total_orders += 1;
      saleMap[displayName].pax_count += p;
      saleMap[displayName].revenue += rev;
      saleMap[displayName].net_profit += profit;

      if (o.ctv_info || o.seller_type === 'agent' || (o.price_markup && o.price_markup > 0)) {
        saleMap[displayName].assisted_ctv_orders_count += 1;
      } else {
        saleMap[displayName].direct_orders_count += 1;
      }
    });

    const salePerformanceList = Object.values(saleMap)
      .map(s => ({
        ...s,
        kpi_percentage: Number(((s.revenue / (s.kpi_target || 200000000)) * 100).toFixed(1))
      }))
      .filter(s => s.revenue > 0 || s.total_orders > 0)
      .sort((a, b) => b.revenue - a.revenue);

    return {
      totalRevenue,
      totalTourCosts,
      totalCommissions,
      grossProfit,
      netProfit,
      netMarginPercent,
      totalPax,
      teamPerformanceList,
      salePerformanceList
    };
  }, [filteredOrders, tours, salesProfiles, activeTeams, profilesList]);

  // Lọc và sắp xếp danh sách bảng nhân viên Sale
  const processedSaleList = useMemo(() => {
    let list = executiveData.salePerformanceList;

    if (selectedTeamFilter !== 'all') {
      const teamObj = activeTeams.find(t => t.id === selectedTeamFilter || t.name.toLowerCase() === selectedTeamFilter.toLowerCase());
      const matchTarget = (teamObj?.name || selectedTeamFilter).toLowerCase();
      list = list.filter(s => 
        (s.team_id && teamObj && s.team_id === teamObj.id) ||
        (s.team_name && s.team_name.toLowerCase().includes(matchTarget)) ||
        (teamObj && s.team_name && teamObj.name.toLowerCase().includes(s.team_name.toLowerCase()))
      );
    }

    if (tableSearchQuery.trim()) {
      const q = tableSearchQuery.toLowerCase();
      list = list.filter(s => 
        s.sale_name.toLowerCase().includes(q) || 
        s.team_name.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      if (tableSortBy === 'revenue-desc') return b.revenue - a.revenue;
      if (tableSortBy === 'revenue-asc') return a.revenue - b.revenue;
      if (tableSortBy === 'pax-desc') return b.pax_count - a.pax_count;
      if (tableSortBy === 'name-asc') return a.sale_name.localeCompare(b.sale_name);
      return 0;
    });
  }, [executiveData.salePerformanceList, selectedTeamFilter, activeTeams, tableSearchQuery, tableSortBy]);

  // Filtered orders for Order tab
  const tabOrdersList = useMemo(() => {
    return filteredOrders.filter(o => {
      if (orderFilterStatus === 'sure') return o.status === 'sure' || o.status === 'paid';
      if (orderFilterStatus === 'hold') return o.status === 'hold';
      if (orderFilterStatus === 'expiring') {
        if (o.status !== 'hold' || !o.hold_expiry) return false;
        const expiry = new Date(o.hold_expiry);
        const diffHours = (expiry.getTime() - new Date().getTime()) / (1000 * 60 * 60);
        return diffHours <= 24;
      }
      if (orderFilterStatus === 'ctv') return Boolean(o.ctv_info) || o.seller_type === 'agent' || Boolean(o.price_markup);
      return true;
    });
  }, [filteredOrders, orderFilterStatus]);

  // Tour Profitability Data for Report tab
  const tourReportList = useMemo(() => {
    return tours.map(t => {
      const tourOrders = filteredOrders.filter(o => o.tour_id === t.id && (o.status === 'sure' || o.status === 'paid'));
      const costRecord = (tourCosts || []).find(c => c.tourId === t.id);
      const fin = calculateTourFinancials(t, tourOrders, costRecord);

      return {
        id: t.id,
        code: t.code,
        name: t.name,
        tour_type: t.tour_type,
        partner_name: t.partner_name || t.organization_name || 'Tour CRM',
        sold_seats: t.sold_seats || fin.totalPassengers,
        total_seats: t.total_seats || 30,
        revenue: fin.totalRevenue,
        cost: fin.totalCost,
        profit: fin.profit,
        margin: fin.margin
      };
    })
    .filter(t => t.revenue > 0 || t.sold_seats > 0)
    .sort((a, b) => b.revenue - a.revenue);
  }, [tours, filteredOrders, tourCosts]);

  // Các danh sách tùy chọn cho CustomSelect đồng bộ toàn hệ thống
  const teamFilterOptions = useMemo(() => [
    { value: 'all', label: 'Tất cả đội nhóm' },
    ...activeTeams.map(t => ({ value: t.id, label: t.name }))
  ], [activeTeams]);

  const saleFilterOptions = useMemo(() => [
    { value: 'all', label: 'Tất cả nhân viên' },
    ...salesProfiles.map(s => ({
      value: s.id,
      label: `${s.full_name} (${s.role === 'sale_leader' ? 'Leader' : s.role === 'sale' ? 'Sale' : 'Quản lý'})`
    }))
  ], [salesProfiles]);

  const channelFilterOptions = useMemo(() => [
    { value: 'all', label: 'Tất cả kênh bán' },
    { value: 'direct', label: 'Khách lẻ trực tiếp' },
    { value: 'agent', label: 'Đại lý đối tác (F2)' },
    { value: 'ctv', label: 'CTV (Bán chênh giá)' },
    { value: 'referral', label: 'Khách đoàn riêng / Giới thiệu' }
  ], []);

  const tourTypeFilterOptions = useMemo(() => [
    { value: 'all', label: 'Tất cả loại tour' },
    { value: 'internal', label: 'AD Tự vận hành' },
    { value: 'partner', label: 'Gửi đối tác / Đoàn riêng' },
    { value: 'visa', label: 'Dịch vụ Visa' }
  ], []);

  const statusFilterOptions = useMemo(() => [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'sure', label: 'Đã cọc / Chốt (Sure/Paid)' },
    { value: 'hold', label: 'Đang giữ chỗ (Hold)' },
    { value: 'expiring', label: 'Sắp hết hạn giữ chỗ (< 24h)' }
  ], []);

  const forecastPeriodOptions = useMemo(() => [
    { value: 'monthly', label: 'Theo tháng' },
    { value: 'quarterly', label: 'Theo quý' }
  ], []);

  const tableSortOptions = useMemo(() => [
    { value: 'revenue-desc', label: 'Sắp xếp: Doanh số ↓' },
    { value: 'revenue-asc', label: 'Sắp xếp: Doanh số ↑' },
    { value: 'pax-desc', label: 'Sắp xếp: Số lượng Pax ↓' },
    { value: 'name-asc', label: 'Sắp xếp: Tên A-Z' }
  ], []);

  const handleSelectAllRows = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedRows(processedSaleList.map(s => s.sale_id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedRows(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const handleExportExcel = () => {
    try {
      // Sheet 1: Danh sách Đơn hàng kinh doanh
      const orderRows = filteredOrders.map((o, idx) => {
        const tour = tours.find(t => t.id === o.tour_id);
        const pax = (o.adult_count || 0) + (o.child_count || 0) + (o.infant_count || 0) || 1;
        const statusText = o.status === 'sure' || o.status === 'paid' ? 'Đã cọc / Chốt' : o.status === 'hold' ? 'Đang giữ chỗ' : 'Chờ xử lý';
        return {
          'STT': idx + 1,
          'Mã Đơn': o.id?.slice(0, 8) || '',
          'Khách Hàng': o.customer_name || 'Khách lẻ',
          'Số Điện Thoại': o.customer_phone || '',
          'Tour Du Lịch': tour?.name || 'Tour Du Lịch',
          'Mã Tour': tour?.code || '',
          'Số Khách (Pax)': pax,
          'Tổng Giá Trị (VNĐ)': o.total_price || 0,
          'Trạng Thái Đơn': statusText,
          'Người Tạo / Sale': o.created_by || '',
          'Kênh Bán': o.ctv_info ? `CTV (${typeof o.ctv_info === 'string' ? o.ctv_info : (o.ctv_info as any)?.name || ''})` : o.seller_type === 'agent' ? 'Đại lý đối tác' : 'Trực tiếp',
          'Thời Gian Tạo': formatDateTimeStr(o.created_at)
        };
      });

      // Sheet 2: Báo cáo Doanh số Nhân viên
      const saleRows = processedSaleList.map((s, idx) => ({
        'Hạng': idx + 1,
        'Nhân Viên Sale': s.sale_name,
        'Đội Nhóm (Team)': s.team_name,
        'Số Đơn Chốt': s.total_orders,
        'Tổng Lượt Pax': s.pax_count,
        'Doanh Số Chốt (VNĐ)': s.revenue,
        'Chỉ Tiêu KPI (VNĐ)': s.kpi_target || 0,
        'Tiến Độ KPI (%)': `${s.kpi_percentage.toFixed(1)}%`,
        'Lợi Nhuận Gộp AD (VNĐ)': s.net_profit,
        'Đánh Giá': s.kpi_percentage >= 100 ? 'Đạt KPI (Xuất sắc)' : 'Đang thực hiện'
      }));

      // Sheet 3: Báo cáo Hiệu quả Đội nhóm (Team)
      const teamRows = executiveData.teamPerformanceList.map((t, idx) => ({
        'STT': idx + 1,
        'Tên Team': t.team_name,
        'Trưởng Nhóm (Leader)': t.leader_name,
        'Số Đơn Chốt': t.total_orders,
        'Tổng Khách Pax': t.pax_count,
        'Doanh Số Thực Hiện (VNĐ)': t.revenue,
        'Chỉ Tiêu KPI (VNĐ)': t.kpi_target,
        'Tiến Độ Đạt KPI (%)': `${t.kpi_percentage.toFixed(1)}%`
      }));

      // Sheet 4: Báo cáo Lãi / Lỗ Tour Du Lịch
      const tourReportRows = tourReportList.map((tr, idx) => ({
        'STT': idx + 1,
        'Mã Tour': tr.code,
        'Tên Tour Du Lịch': tr.name,
        'Phân Loại Tour': tr.tour_type === 'internal' ? 'AD Tự Vận Hành' : tr.tour_type === 'partner' ? `Gửi Đối Tác (${tr.partner_name || 'F2'})` : 'Tour Đoàn Riêng',
        'Số Chỗ Đã Bán': `${tr.sold_seats}/${tr.total_seats || 30}`,
        'Doanh Thu Chốt (VNĐ)': tr.revenue,
        'Chi Phí Vốn Tour (VNĐ)': tr.cost,
        'Lợi Nhuận Gộp (VNĐ)': tr.profit,
        'Biên Lợi Nhuận (%)': `${tr.margin.toFixed(1)}%`
      }));

      // Tạo Workbook và gắn các Sheets
      const workbook = XLSX.utils.book_new();

      const wsOrders = XLSX.utils.json_to_sheet(orderRows);
      wsOrders['!cols'] = [{ wch: 6 }, { wch: 12 }, { wch: 22 }, { wch: 16 }, { wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 20 }, { wch: 16 }, { wch: 20 }, { wch: 20 }, { wch: 22 }];
      XLSX.utils.book_append_sheet(workbook, wsOrders, 'Danh_Sach_Don_Hang');

      if (saleRows.length > 0) {
        const wsSales = XLSX.utils.json_to_sheet(saleRows);
        wsSales['!cols'] = [{ wch: 6 }, { wch: 22 }, { wch: 20 }, { wch: 12 }, { wch: 14 }, { wch: 22 }, { wch: 20 }, { wch: 16 }, { wch: 22 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(workbook, wsSales, 'Doanh_So_Sale');
      }

      if (teamRows.length > 0) {
        const wsTeams = XLSX.utils.json_to_sheet(teamRows);
        wsTeams['!cols'] = [{ wch: 6 }, { wch: 22 }, { wch: 22 }, { wch: 12 }, { wch: 14 }, { wch: 24 }, { wch: 20 }, { wch: 18 }];
        XLSX.utils.book_append_sheet(workbook, wsTeams, 'Hieu_Qua_Team');
      }

      if (tourReportRows.length > 0) {
        const wsTours = XLSX.utils.json_to_sheet(tourReportRows);
        wsTours['!cols'] = [{ wch: 6 }, { wch: 14 }, { wch: 32 }, { wch: 24 }, { wch: 16 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 18 }];
        XLSX.utils.book_append_sheet(workbook, wsTours, 'Lai_Lo_Tour');
      }

      const fileName = `Bao_Cao_Kinh_Doanh_AD_Luxury_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      setExportNotice('Đã xuất file báo cáo kinh doanh định dạng Excel (.xlsx) thành công!');
      setTimeout(() => setExportNotice(null), 3500);
    } catch (err) {
      console.error('Lỗi xuất file Excel:', err);
      setExportNotice('Lỗi khi xuất file Excel. Vui lòng thử lại!');
      setTimeout(() => setExportNotice(null), 3500);
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans text-slate-800">
      {/* THÔNG BÁO XUẤT FILE TOAST */}
      {exportNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-bold">{exportNotice}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* HEADER BẢNG ĐIỀU KHIỂN & SUB-NAVIGATION BAR (100% VIETNAMESE) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-xl p-4 md:p-5 border border-slate-200 shadow-2xs flex flex-col xl:flex-row xl:items-center justify-between gap-4 min-w-0">
        {/* Tiêu đề & Sub-nav Tabs */}
        <div className="space-y-3 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Bảng Điều Khiển</h1>
            <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-200 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-blue-600" />
              {effectiveRole === 'sale' && 'Sale Cá Nhân'}
              {effectiveRole === 'sale_leader' && 'Trưởng Nhóm Sale'}
              {(effectiveRole === 'admin' || effectiveRole === 'bod') && 'Ban Giám Đốc / Quản Trị'}
            </span>
          </div>

          {/* Sub-Navigation Tabs */}
          <div className="inline-flex max-w-full overflow-x-auto p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3.5 py-1.5 rounded-md transition-all shrink-0 ${
                activeTab === 'overview' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'
              }`}
            >
              Tổng quan
            </button>
            <button
              onClick={() => setActiveTab('sales')}
              className={`px-3.5 py-1.5 rounded-md transition-all shrink-0 ${
                activeTab === 'sales' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'
              }`}
            >
              Doanh số kinh doanh
            </button>
            <button
              onClick={() => setActiveTab('order')}
              className={`px-3.5 py-1.5 rounded-md transition-all shrink-0 ${
                activeTab === 'order' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'
              }`}
            >
              Quản lý đơn hàng
            </button>
            <button
              onClick={() => setActiveTab('report')}
              className={`px-3.5 py-1.5 rounded-md transition-all shrink-0 ${
                activeTab === 'report' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'
              }`}
            >
              Báo cáo tài chính
            </button>
          </div>
        </div>

        {/* Action Controls Top Right: Filter, Export, Need Help */}
        <div className="flex flex-wrap items-center gap-2 self-start xl:self-auto shrink-0">
          {/* Trợ giúp badge */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
            <HelpCircle className="w-4 h-4 text-slate-400" />
            <span>Trợ giúp</span>
          </div>

          {/* Bộ lọc thời gian Pill */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setFilterTimeType('month')}
              className={`px-3 py-1 rounded-md transition-all ${filterTimeType === 'month' ? 'bg-white text-blue-600 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Tháng này
            </button>
            <button
              onClick={() => setFilterTimeType('6m')}
              className={`px-3 py-1 rounded-md transition-all ${filterTimeType === '6m' ? 'bg-white text-blue-600 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              6 Tháng
            </button>
            <button
              onClick={() => setFilterTimeType('1y')}
              className={`px-3 py-1 rounded-md transition-all ${filterTimeType === '1y' ? 'bg-white text-blue-600 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Năm nay
            </button>
          </div>

          {/* Nút Bộ lọc */}
          <button
            type="button"
            onClick={() => setIsFilterOpen(true)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 border font-semibold rounded-lg text-xs transition-all shadow-2xs ${
              activeFiltersCount > 0
                ? 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100 font-bold'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span>Bộ lọc</span>
            {activeFiltersCount > 0 && (
              <span className="w-4.5 h-4.5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Nút Xuất Báo Cáo */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition-all shadow-2xs active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất báo cáo</span>
          </button>
        </div>
      </div>

      {/* THANH HIỂN THỊ CÁC BỘ LỌC ĐANG ÁP DỤNG (ACTIVE FILTER CHIPS) */}
      {activeFiltersCount > 0 && (
        <div className="bg-blue-50/80 border border-blue-200/80 rounded-xl px-4 py-2.5 flex flex-wrap items-center gap-2 text-xs animate-in fade-in duration-200">
          <span className="font-bold text-blue-900 flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
            Đang lọc:
          </span>

          {filterTimeType !== 'month' && (
            <span className="inline-flex items-center gap-1 bg-white border border-blue-200 text-blue-800 px-2.5 py-0.5 rounded-full font-medium shadow-2xs">
              Thời gian:{' '}
              <strong className="font-semibold">
                {filterTimeType === 'prev_month' && 'Tháng trước'}
                {filterTimeType === 'quarter' && 'Quý này'}
                {filterTimeType === '6m' && '6 Tháng gần đây'}
                {filterTimeType === '1y' && 'Năm nay'}
                {filterTimeType === 'all' && 'Toàn thời gian'}
                {filterTimeType === 'custom' && (customStartDate || customEndDate ? `${customStartDate || '...'} đến ${customEndDate || '...'}` : 'Tùy chỉnh')}
              </strong>
              <button onClick={() => setFilterTimeType('month')} className="hover:text-rose-600 p-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {selectedTeamFilter !== 'all' && (
            <span className="inline-flex items-center gap-1 bg-white border border-blue-200 text-blue-800 px-2.5 py-0.5 rounded-full font-medium shadow-2xs">
              Đội nhóm:{' '}
              <strong className="font-semibold">
                {activeTeams.find(t => t.id === selectedTeamFilter || t.name === selectedTeamFilter)?.name || selectedTeamFilter}
              </strong>
              <button onClick={() => setSelectedTeamFilter('all')} className="hover:text-rose-600 p-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {selectedSaleFilter !== 'all' && (
            <span className="inline-flex items-center gap-1 bg-white border border-blue-200 text-blue-800 px-2.5 py-0.5 rounded-full font-medium shadow-2xs">
              Sale:{' '}
              <strong className="font-semibold">
                {profilesList.find(p => p.id === selectedSaleFilter)?.full_name || selectedSaleFilter}
              </strong>
              <button onClick={() => setSelectedSaleFilter('all')} className="hover:text-rose-600 p-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {selectedChannelFilter !== 'all' && (
            <span className="inline-flex items-center gap-1 bg-white border border-blue-200 text-blue-800 px-2.5 py-0.5 rounded-full font-medium shadow-2xs">
              Kênh:{' '}
              <strong className="font-semibold">
                {selectedChannelFilter === 'direct' && 'Khách trực tiếp'}
                {selectedChannelFilter === 'agent' && 'Đại lý đối tác'}
                {selectedChannelFilter === 'ctv' && 'CTV bán chênh'}
                {selectedChannelFilter === 'referral' && 'Khách đoàn / Giới thiệu'}
              </strong>
              <button onClick={() => setSelectedChannelFilter('all')} className="hover:text-rose-600 p-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {selectedTourTypeFilter !== 'all' && (
            <span className="inline-flex items-center gap-1 bg-white border border-blue-200 text-blue-800 px-2.5 py-0.5 rounded-full font-medium shadow-2xs">
              Loại Tour:{' '}
              <strong className="font-semibold">
                {selectedTourTypeFilter === 'internal' && 'AD Tự vận hành'}
                {selectedTourTypeFilter === 'partner' && 'Gửi đối tác / Đoàn'}
                {selectedTourTypeFilter === 'visa' && 'Dịch vụ Visa'}
              </strong>
              <button onClick={() => setSelectedTourTypeFilter('all')} className="hover:text-rose-600 p-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {selectedStatusFilter !== 'all' && (
            <span className="inline-flex items-center gap-1 bg-white border border-blue-200 text-blue-800 px-2.5 py-0.5 rounded-full font-medium shadow-2xs">
              Trạng thái:{' '}
              <strong className="font-semibold">
                {selectedStatusFilter === 'sure' && 'Đã cọc / Chốt'}
                {selectedStatusFilter === 'hold' && 'Đang giữ chỗ (Hold)'}
                {selectedStatusFilter === 'expiring' && 'Sắp hết hạn giữ chỗ'}
              </strong>
              <button onClick={() => setSelectedStatusFilter('all')} className="hover:text-rose-600 p-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          <button
            onClick={handleResetFilters}
            className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-rose-700 hover:text-rose-800 hover:underline px-2 py-0.5"
          >
            <RotateCcw className="w-3 h-3" />
            Xóa tất cả bộ lọc
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL BỘ LỌC ĐA NĂNG (FILTER MODAL) */}
      {/* ========================================================================= */}
      {isFilterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Filter className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Bộ Lọc Dữ Liệu Bảng Điều Khiển</h3>
                  <p className="text-xs text-slate-500">Tùy chỉnh thời gian, đội nhóm, kênh bán và trạng thái</p>
                </div>
              </div>
              <button
                onClick={() => setIsFilterOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body Modal */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* 1. Bộ lọc Thời gian */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-600 tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  Khoảng Thời Gian
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'month', label: 'Tháng này' },
                    { id: 'prev_month', label: 'Tháng trước' },
                    { id: 'quarter', label: 'Quý này' },
                    { id: '6m', label: '6 Tháng gần đây' },
                    { id: '1y', label: 'Năm nay' },
                    { id: 'all', label: 'Toàn thời gian' },
                    { id: 'custom', label: 'Tùy chỉnh ngày' }
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setFilterTimeType(t.id as any)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all text-center ${
                        filterTimeType === t.id
                          ? 'bg-blue-600 border-blue-600 text-white shadow-2xs font-bold'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Nếu chọn Tùy chỉnh ngày -> Hiện 2 DatePicker */}
                {filterTimeType === 'custom' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Từ ngày:</label>
                      <DatePicker
                        value={customStartDate}
                        onChange={setCustomStartDate}
                        placeholder="dd/mm/yyyy"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Đến ngày:</label>
                      <DatePicker
                        value={customEndDate}
                        onChange={setCustomEndDate}
                        placeholder="dd/mm/yyyy"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 2 Grid: Đội nhóm & Nhân viên Sale */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 tracking-wider mb-1.5">
                    Đội Nhóm Kinh Doanh
                  </label>
                  <CustomSelect
                    value={selectedTeamFilter}
                    onChange={setSelectedTeamFilter}
                    options={teamFilterOptions}
                    className="w-full"
                    buttonClassName="w-full h-10 px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-800 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 tracking-wider mb-1.5">
                    Nhân Viên Sale Phụ Trách
                  </label>
                  <CustomSelect
                    value={selectedSaleFilter}
                    onChange={setSelectedSaleFilter}
                    options={saleFilterOptions}
                    className="w-full"
                    buttonClassName="w-full h-10 px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-800 shadow-2xs"
                  />
                </div>
              </div>

              {/* 3 Grid: Kênh bán, Loại Tour & Trạng thái */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 tracking-wider mb-1.5">
                    Kênh Bán / Nguồn Khách
                  </label>
                  <CustomSelect
                    value={selectedChannelFilter}
                    onChange={setSelectedChannelFilter}
                    options={channelFilterOptions}
                    className="w-full"
                    buttonClassName="w-full h-10 px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-800 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 tracking-wider mb-1.5">
                    Loại Sản Phẩm / Tour
                  </label>
                  <CustomSelect
                    value={selectedTourTypeFilter}
                    onChange={setSelectedTourTypeFilter}
                    options={tourTypeFilterOptions}
                    className="w-full"
                    buttonClassName="w-full h-10 px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-800 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 tracking-wider mb-1.5">
                    Trạng Thái Đơn Hàng
                  </label>
                  <CustomSelect
                    value={selectedStatusFilter}
                    onChange={setSelectedStatusFilter}
                    options={statusFilterOptions}
                    className="w-full"
                    buttonClassName="w-full h-10 px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-800 shadow-2xs"
                  />
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-rose-600 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Đặt lại mặc định</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsFilterOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-semibold rounded-lg text-xs hover:bg-slate-100 transition-all"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={() => setIsFilterOpen(false)}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-all shadow-2xs"
                >
                  Áp dụng bộ lọc {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW (TỔNG QUAN) */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Card 1: Tổng doanh số chốt */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-all relative overflow-hidden group">
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng doanh số chốt</span>
                <span className="w-2 h-2 rounded-full bg-blue-500/80" />
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-2xl lg:text-3xl font-black text-slate-900 font-mono tracking-tight mb-1">
                    {formatCurrency(executiveData.totalRevenue)}
                  </div>
                  <div className="text-xs font-semibold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 w-max">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>+10.2% so với tháng trước</span>
                  </div>
                </div>
                <div className="pb-1">
                  <SparkDots color="blue" />
                </div>
              </div>
            </div>

            {/* Card 2: Chi phí vận hành & Vốn Tour */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-all relative overflow-hidden group">
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Chi phí vận hành & Vốn Tour</span>
                <span className="w-2 h-2 rounded-full bg-rose-500/80" />
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-2xl lg:text-3xl font-black text-slate-900 font-mono tracking-tight mb-1">
                    {formatCurrency(executiveData.totalTourCosts)}
                  </div>
                  <div className="text-xs font-semibold text-rose-600 flex items-center gap-1 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 w-max">
                    <ArrowDownRight className="w-3.5 h-3.5" />
                    <span>-5.75% so với tháng trước</span>
                  </div>
                </div>
                <div className="pb-1">
                  <SparkDots color="red" />
                </div>
              </div>
            </div>

            {/* Card 3: Lợi nhuận gộp */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-all relative overflow-hidden group">
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lợi nhuận gộp</span>
                <span className="w-2 h-2 rounded-full bg-indigo-500/80" />
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-2xl lg:text-3xl font-black text-slate-900 font-mono tracking-tight mb-1">
                    {formatCurrency(executiveData.grossProfit)}
                  </div>
                  <div className="text-xs font-semibold text-blue-600 flex items-center gap-1 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 w-max">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>+8.55% so với tháng trước</span>
                  </div>
                </div>
                <div className="pb-1">
                  <SparkDots color="indigo" />
                </div>
              </div>
            </div>
          </div>

          {/* Middle Section: Revenue Forecast & Source Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Revenue Forecast Chart */}
            <div className="lg:col-span-7 bg-white p-5 md:p-6 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">Dự Báo Doanh Thu</h2>
                  <p className="text-xs text-slate-700 font-bold">Báo cáo dự báo & tăng trưởng doanh thu theo tháng</p>
                </div>

                <CustomSelect
                  value={forecastPeriod}
                  onChange={(val) => setForecastPeriod(val as 'monthly' | 'quarterly')}
                  options={forecastPeriodOptions}
                  align="right"
                  buttonClassName="h-8 px-3 py-1.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs"
                />
              </div>

              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyForecastData} barGap={5}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
                    <YAxis 
                      tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`} 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                    />
                    <Tooltip 
                      content={<CustomChartTooltip />} 
                      cursor={{ fill: 'rgba(241, 245, 249, 0.65)', radius: 8 }} 
                    />
                    <Bar dataKey="internal" name="AD Tự Vận Hành" fill="#2563eb" radius={[6, 6, 6, 6]} barSize={20} />
                    <Bar dataKey="partner" name="Gửi Đối Tác & Đoàn" fill="#8b5cf6" radius={[6, 6, 6, 6]} barSize={20} />
                    <Bar dataKey="visa" name="Dịch Vụ Visa & Khác" fill="#f59e0b" radius={[6, 6, 6, 6]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-6 pt-2 border-t border-slate-100 text-xs font-semibold text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-600 shadow-2xs" />
                  <span>Tour tự vận hành</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-purple-500 shadow-2xs" />
                  <span>Tour gửi đối tác & đoàn</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-500 shadow-2xs" />
                  <span>Dịch vụ Visa & Khác</span>
                </div>
              </div>
            </div>

            {/* Source Breakdown */}
            <div className="lg:col-span-5 bg-white p-5 md:p-6 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">Cơ Cấu Kênh Bán</h2>
                  <p className="text-xs text-slate-700 font-bold">Phân bổ nguồn khách hàng & kênh kinh doanh</p>
                </div>

                <CustomSelect
                  value={selectedTeamFilter}
                  onChange={setSelectedTeamFilter}
                  options={teamFilterOptions}
                  align="right"
                  className="max-w-[200px]"
                  buttonClassName="h-8 px-3 py-1.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-700 truncate shadow-2xs"
                />
              </div>

              <div>
                <div className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                  {sourceBreakdownData.totalCount.toLocaleString('vi-VN')}
                </div>
                <div className="text-xs font-semibold text-slate-500 mt-0.5">
                  Tổng số lượt đơn & nguồn khách
                </div>
              </div>

              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex gap-1 p-0.5 border border-slate-200">
                {sourceBreakdownData.sources.map((src, i) => (
                  <div
                    key={i}
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${src.pct}%`, backgroundColor: src.color }}
                    title={`${src.name}: ${src.pct}%`}
                  />
                ))}
              </div>

              <div className="space-y-2.5 pt-1">
                {sourceBreakdownData.sources.map((src, i) => (
                  <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: src.color }} />
                      <span className="font-medium text-slate-700">{src.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-slate-900">{src.count.toLocaleString('vi-VN')}</span>
                      <span className="px-2 py-0.5 rounded font-semibold text-[11px] bg-slate-100 text-slate-700 border border-slate-200 min-w-[38px] text-center">
                        {src.pct}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('order')}
                className="w-full py-2 text-center text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50/50 hover:bg-blue-50 rounded-lg border border-blue-200 transition-all active:scale-[0.99] flex items-center justify-center gap-1"
              >
                <span>Xem chi tiết danh sách đơn</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Table Data Sales Section */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Bảng Chi Tiết Doanh Số Kinh Doanh</h2>
                <p className="text-xs text-slate-700 font-bold">Báo cáo hiệu quả kinh doanh theo từng Nhân viên Sale</p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm..."
                    value={tableSearchQuery}
                    onChange={e => setTableSearchQuery(e.target.value)}
                    className="bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-500 rounded-lg pl-8 pr-3 py-1.5 w-40 sm:w-48 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all h-9"
                  />
                </div>

                <CustomSelect
                  value={tableSortBy}
                  onChange={(val) => setTableSortBy(val as any)}
                  options={tableSortOptions}
                  align="right"
                  className="w-48 sm:w-52"
                  buttonClassName="h-9 px-3 py-1.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs"
                />

                <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setSaleViewMode('table')}
                    className={`p-1.5 rounded-md transition-all ${saleViewMode === 'table' ? 'bg-white text-blue-600 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                    title="Dạng Bảng"
                  >
                    <Table className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSaleViewMode('bar')}
                    className={`p-1.5 rounded-md transition-all ${saleViewMode === 'bar' ? 'bg-white text-blue-600 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                    title="Biểu đồ Cột"
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSaleViewMode('line')}
                    className={`p-1.5 rounded-md transition-all ${saleViewMode === 'line' ? 'bg-white text-blue-600 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                    title="Biểu đồ Đường"
                  >
                    <LineChartIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSaleViewMode('pie')}
                    className={`p-1.5 rounded-md transition-all ${saleViewMode === 'pie' ? 'bg-white text-blue-600 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                    title="Biểu đồ Tròn"
                  >
                    <PieChartIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {saleViewMode === 'table' && (
              <div className="overflow-x-auto rounded-b-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase border-b border-slate-200/80">
                    <tr>
                      <th className="px-4 py-3.5 w-10">
                        <input
                          type="checkbox"
                          onChange={handleSelectAllRows}
                          checked={selectedRows.length > 0 && selectedRows.length === processedSaleList.length}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </th>
                      <th className="px-4 py-3.5">Tên nhân viên Sale</th>
                      <th className="px-4 py-3.5">Đội nhóm (Team)</th>
                      <th className="px-4 py-3.5">Doanh số chốt</th>
                      <th className="px-4 py-3.5">Tiến độ KPI (%)</th>
                      <th className="px-4 py-3.5">Trưởng nhóm phụ trách</th>
                      <th className="px-4 py-3.5">Trạng thái</th>
                      <th className="px-4 py-3.5 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {processedSaleList.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-slate-400 font-medium">
                          Không tìm thấy dữ liệu nhân viên hoặc team phù hợp.
                        </td>
                      </tr>
                    ) : (
                      processedSaleList.map((sale, idx) => {
                        const isSelected = selectedRows.includes(sale.sale_id);
                        return (
                          <tr 
                            key={sale.sale_id || idx} 
                            className={`hover:bg-slate-50/90 transition-colors ${isSelected ? 'bg-blue-50/40' : ''}`}
                          >
                            <td className="px-4 py-3.5">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleSelectRow(sale.sale_id)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-2xs">
                                  {sale.sale_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900">{sale.sale_name}</div>
                                  <div className="text-[11px] text-slate-400 font-medium">Chuyên viên Kinh doanh</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                <span>{sale.team_name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 font-bold font-mono text-slate-900">
                              {formatCurrency(sale.revenue)}
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="font-bold text-slate-700">{sale.kpi_percentage}%</span>
                                  <span className="text-slate-400 font-mono">{sale.pax_count} Pax</span>
                                </div>
                                <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                  <div 
                                    className="bg-blue-600 h-full rounded-full" 
                                    style={{ width: `${Math.min(sale.kpi_percentage, 100)}%` }} 
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center">
                                  TN
                                </div>
                                <span className="font-semibold text-slate-800">Trưởng Nhóm</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <span className={`px-2.5 py-1 rounded-full font-bold text-[11px] inline-flex items-center gap-1 ${
                                sale.kpi_percentage >= 100 
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200/80' 
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                              }`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                {sale.kpi_percentage >= 100 ? 'Xuất sắc (Đạt KPI)' : 'Đang thực hiện'}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedSaleFilter(sale.sale_id);
                                  setActiveTab('order');
                                }}
                                title="Xem đơn hàng của nhân viên này"
                                className="px-2.5 py-1 text-slate-600 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-xs font-semibold inline-flex items-center gap-1 border border-slate-200 hover:border-blue-200"
                              >
                                <span>Xem đơn</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {saleViewMode === 'bar' && (
              <div className="p-6 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={processedSaleList}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="sale_name" axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={val => `${val / 1000000}M`} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="revenue" name="Doanh Số Chốt (VNĐ)" fill="#2563eb" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="net_profit" name="Lợi Nhuận Ròng (AD)" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {saleViewMode === 'line' && (
              <div className="p-6 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart data={processedSaleList}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="sale_name" axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={val => `${val / 1000000}M`} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Line type="monotone" dataKey="revenue" name="Doanh Số Chốt (VNĐ)" stroke="#2563eb" strokeWidth={3} dot={{ r: 5 }} />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>
            )}

            {saleViewMode === 'pie' && (
              <div className="p-6 h-80 flex items-center justify-center">
                {processedSaleList.filter(s => s.revenue > 0).length === 0 ? (
                  <div className="text-center py-8 text-slate-400 font-medium text-xs">
                    <PieChartIcon className="w-8 h-8 mb-2 mx-auto text-slate-300" />
                    <p>Chưa có dữ liệu doanh số nhân viên để hiển thị biểu đồ hình tròn.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={processedSaleList.filter(s => s.revenue > 0)}
                        dataKey="revenue"
                        nameKey="sale_name"
                        cx="50%"
                        cy="50%"
                        outerRadius={95}
                        innerRadius={45}
                        paddingAngle={3}
                        label={(entry: any) =>
                          (entry.percent || 0) >= 0.05
                            ? `${entry.sale_name || entry.name}: ${((entry.percent || 0) * 100).toFixed(0)}%`
                            : ''
                        }
                      >
                        {processedSaleList
                          .filter(s => s.revenue > 0)
                          .map((_, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SALES (DOANH SỐ KINH DOANH) */}
      {/* ========================================================================= */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          {/* Sales Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase">Tổng Doanh Số Chốt</span>
                <span className="p-2 bg-blue-50 text-blue-600 rounded-lg"><DollarSign className="w-4 h-4" /></span>
              </div>
              <div className="text-2xl font-black font-mono text-slate-900 mb-1">
                {formatCurrency(executiveData.totalRevenue)}
              </div>
              <div className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5" /> +12.5% chỉ tiêu tháng
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase">Tổng Lượt Khách Pax</span>
                <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Users className="w-4 h-4" /></span>
              </div>
              <div className="text-2xl font-black font-mono text-slate-900 mb-1">
                {executiveData.totalPax.toLocaleString('vi-VN')} Pax
              </div>
              <div className="text-xs text-slate-500 font-medium">Khách tham gia Tour</div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase">Giá Trị Đơn Trung Bình</span>
                <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><TrendingUp className="w-4 h-4" /></span>
              </div>
              <div className="text-2xl font-black font-mono text-slate-900 mb-1">
                {formatCurrency(filteredOrders.length > 0 ? Math.round(executiveData.totalRevenue / filteredOrders.length) : 0)}
              </div>
              <div className="text-xs text-slate-500 font-medium">Trung bình / đơn chốt</div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase">Team Dẫn Đầu</span>
                <span className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Award className="w-4 h-4" /></span>
              </div>
              <div className="text-lg font-black text-slate-900 truncate mb-1">
                {[...executiveData.teamPerformanceList].sort((a, b) => b.revenue - a.revenue)[0]?.team_name || 'Team Đông Nam Á'}
              </div>
              <div className="text-xs text-amber-600 font-semibold flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" /> Dẫn đầu doanh số
              </div>
            </div>
          </div>

          {/* Báo cáo Hiệu quả theo Team */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Báo Cáo Hiệu Quả Kinh Doanh Theo Đội Nhóm (Team)</h2>
                <p className="text-xs text-slate-500 font-medium">Thống kê doanh số, số khách Pax và chỉ tiêu KPI theo từng Team</p>
              </div>

              <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setTeamViewMode('table')}
                  className={`p-1.5 rounded-md transition-all ${teamViewMode === 'table' ? 'bg-white text-blue-600 shadow-2xs font-bold' : 'text-slate-500'}`}
                  title="Dạng Bảng"
                >
                  <Table className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setTeamViewMode('bar')}
                  className={`p-1.5 rounded-md transition-all ${teamViewMode === 'bar' ? 'bg-white text-blue-600 shadow-2xs font-bold' : 'text-slate-500'}`}
                  title="Biểu đồ Cột"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setTeamViewMode('pie')}
                  className={`p-1.5 rounded-md transition-all ${teamViewMode === 'pie' ? 'bg-white text-blue-600 shadow-2xs font-bold' : 'text-slate-500'}`}
                  title="Biểu đồ Tròn"
                >
                  <PieChartIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {teamViewMode === 'table' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Tên Team</th>
                      <th className="px-4 py-3">Trưởng Nhóm</th>
                      <th className="px-4 py-3">Số Đơn Chốt</th>
                      <th className="px-4 py-3">Tổng Pax</th>
                      <th className="px-4 py-3">Doanh Số Thực Hiện</th>
                      <th className="px-4 py-3">Chỉ Tiêu KPI</th>
                      <th className="px-4 py-3">% Đạt KPI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {executiveData.teamPerformanceList.map((t, idx) => (
                      <tr key={t.team_id || idx} className="hover:bg-slate-50">
                        <td className="px-4 py-3.5 font-bold text-slate-900 flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-blue-600" />
                          <span>{t.team_name}</span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-700">{t.leader_name}</td>
                        <td className="px-4 py-3.5 font-mono text-slate-800">{t.total_orders} đơn</td>
                        <td className="px-4 py-3.5 font-mono text-slate-800">{t.pax_count} Pax</td>
                        <td className="px-4 py-3.5 font-mono font-bold text-blue-600">{formatCurrency(t.revenue)}</td>
                        <td className="px-4 py-3.5 font-mono text-slate-500">{formatCurrency(t.kpi_target)}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 w-8">{t.kpi_percentage}%</span>
                            <div className="w-20 bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div className="bg-blue-600 h-full rounded-full" style={{ width: `${Math.min(t.kpi_percentage, 100)}%` }} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {teamViewMode === 'bar' && (
              <div className="h-72 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={executiveData.teamPerformanceList}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="team_name" axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={val => `${val / 1000000}M`} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="revenue" name="Doanh Số Team (VNĐ)" fill="#2563eb" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="kpi_target" name="Chỉ Tiêu KPI (VNĐ)" fill="#94a3b8" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {teamViewMode === 'pie' && (
              <div className="h-72 flex items-center justify-center p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={executiveData.teamPerformanceList.filter(t => t.revenue > 0)}
                      dataKey="revenue"
                      nameKey="team_name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      innerRadius={40}
                      paddingAngle={4}
                      label={(entry: any) => `${entry.team_name}: ${((entry.percent || 0) * 100).toFixed(0)}%`}
                    >
                      {executiveData.teamPerformanceList.map((_, i) => (
                        <Cell key={`team-pie-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Leaderboard Bảng Xếp Hạng Cá Nhân */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Bảng Xếp Hạng Doanh Số Nhân Viên (Leaderboard)</h2>
                <p className="text-xs text-slate-500 font-medium">Thứ hạng doanh số cá nhân xuất sắc nhất trong kỳ</p>
              </div>
              <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded-full border border-amber-200 flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-600" />
                Top Performers
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {processedSaleList.slice(0, 3).map((topSale, rankIdx) => (
                <div key={topSale.sale_id} className="bg-gradient-to-br from-slate-50 to-blue-50/30 p-4 rounded-xl border border-slate-200 flex items-center gap-3 relative overflow-hidden">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm text-white shadow-2xs ${
                    rankIdx === 0 ? 'bg-amber-500' : rankIdx === 1 ? 'bg-slate-400' : 'bg-amber-700'
                  }`}>
                    #{rankIdx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-900 text-sm truncate">{topSale.sale_name}</div>
                    <div className="text-xs text-slate-500 font-medium">{topSale.team_name}</div>
                    <div className="font-mono font-black text-blue-600 text-xs mt-1">{formatCurrency(topSale.revenue)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ORDER (QUẢN LÝ ĐƠN HÀNG) */}
      {/* ========================================================================= */}
      {activeTab === 'order' && (
        <div className="space-y-6">
          {/* Order Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase">Tổng Đơn Hàng</span>
                <span className="p-2 bg-blue-50 text-blue-600 rounded-lg"><ShoppingBag className="w-4 h-4" /></span>
              </div>
              <div className="text-2xl font-black font-mono text-slate-900 mb-1">
                {filteredOrders.length} Đơn
              </div>
              <div className="text-xs text-slate-500 font-medium">Toàn bộ hệ thống</div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase">Đơn Đã Cọc / Chốt</span>
                <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><CheckCircle className="w-4 h-4" /></span>
              </div>
              <div className="text-2xl font-black font-mono text-slate-900 mb-1">
                {filteredOrders.filter(o => o.status === 'sure' || o.status === 'paid').length} Đơn
              </div>
              <div className="text-xs text-emerald-600 font-semibold">Xác nhận thanh toán</div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase">Đang Giữ Chỗ (Hold)</span>
                <span className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Clock className="w-4 h-4" /></span>
              </div>
              <div className="text-2xl font-black font-mono text-slate-900 mb-1">
                {filteredOrders.filter(o => o.status === 'hold').length} Đơn
              </div>
              <div className="text-xs text-amber-600 font-semibold">Đang mở đếm ngược</div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase">Đơn Hỗ Trợ CTV & Đại Lý</span>
                <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><BadgePercent className="w-4 h-4" /></span>
              </div>
              <div className="text-2xl font-black font-mono text-slate-900 mb-1">
                {filteredOrders.filter(o => o.ctv_info || o.seller_type === 'agent' || o.price_markup).length} Đơn
              </div>
              <div className="text-xs text-slate-500 font-medium">Bán chênh / Giá nét</div>
            </div>
          </div>

          {/* Filter Bar for Orders */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 mr-1">Lọc đơn:</span>
              <button
                onClick={() => setOrderFilterStatus('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  orderFilterStatus === 'all' ? 'bg-slate-900 text-white font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tất cả đơn
              </button>
              <button
                onClick={() => setOrderFilterStatus('sure')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  orderFilterStatus === 'sure' ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Đã cọc / Chốt
              </button>
              <button
                onClick={() => setOrderFilterStatus('hold')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  orderFilterStatus === 'hold' ? 'bg-amber-600 text-white font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Đang giữ chỗ
              </button>
              <button
                onClick={() => setOrderFilterStatus('expiring')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  orderFilterStatus === 'expiring' ? 'bg-rose-600 text-white font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Sắp hết hạn Hold (&lt; 24h)
              </button>
              <button
                onClick={() => setOrderFilterStatus('ctv')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  orderFilterStatus === 'ctv' ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Đơn qua CTV / Đại lý
              </button>
            </div>

            <Link
              to="/orders"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              Xem tất cả đơn hàng <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Order Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3.5">Mã đơn / Khách hàng</th>
                    <th className="px-4 py-3.5">Tour du lịch</th>
                    <th className="px-4 py-3.5">Người tạo / Sale</th>
                    <th className="px-4 py-3.5">Số khách (Pax)</th>
                    <th className="px-4 py-3.5">Tổng giá trị</th>
                    <th className="px-4 py-3.5">Trạng thái</th>
                    <th className="px-4 py-3.5">Thời gian</th>
                    <th className="px-4 py-3.5 text-right">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {tabOrdersList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                        Không có đơn hàng nào thuộc bộ lọc này.
                      </td>
                    </tr>
                  ) : (
                    tabOrdersList.map(order => {
                      const orderPax = (order.adult_count || 0) + (order.child_count || 0) + (order.infant_count || 0) || 1;
                      const tour = tours.find(t => t.id === order.tour_id);

                      return (
                        <tr key={order.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-slate-900">{order.customer_name || 'Khách lẻ'}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{order.customer_phone || order.id?.slice(0, 8)}</div>
                          </td>
                          <td className="px-4 py-3.5 max-w-[200px] truncate">
                            <div className="font-bold text-slate-800 truncate">{tour?.name || 'Tour du lịch'}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{tour?.code || 'AD-TOUR'}</div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="font-semibold text-slate-800">{order.created_by || 'Sale Executive'}</div>
                            {order.ctv_info && (
                              <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-bold border border-purple-200">
                                CTV: {typeof order.ctv_info === 'string' ? order.ctv_info : (order.ctv_info as any)?.name}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 font-mono font-bold text-slate-800">
                            {orderPax} Pax
                          </td>
                          <td className="px-4 py-3.5 font-mono font-bold text-blue-600">
                            {formatCurrency(order.total_price || 0)}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`px-2.5 py-1 rounded-full font-bold text-[11px] inline-flex items-center gap-1 ${
                              order.status === 'sure' || order.status === 'paid'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : order.status === 'hold'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current" />
                              {order.status === 'sure' || order.status === 'paid' ? 'Đã cọc / Chốt' : order.status === 'hold' ? 'Đang giữ chỗ' : 'Chờ xử lý'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-[11px] text-slate-500 font-mono">
                            {formatDateTimeStr(order.created_at)}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <Link
                              to={`/orders?id=${order.id}`}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-lg transition-colors inline-block"
                            >
                              Xem
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: REPORT (BÁO CÁO TÀI CHÍNH LÃI/LỖ) */}
      {/* ========================================================================= */}
      {activeTab === 'report' && (
        <div className="space-y-6">
          {/* Financial Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase">Doanh Thu Hạch Toán</span>
                <span className="p-2 bg-blue-50 text-blue-600 rounded-lg"><DollarSign className="w-4 h-4" /></span>
              </div>
              <div className="text-2xl font-black font-mono text-slate-900 mb-1">
                {formatCurrency(executiveData.totalRevenue)}
              </div>
              <div className="text-xs text-slate-500 font-medium">Doanh thu ghi nhận</div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase">Tổng Vốn Tour & Vận Hành</span>
                <span className="p-2 bg-rose-50 text-rose-600 rounded-lg"><Briefcase className="w-4 h-4" /></span>
              </div>
              <div className="text-2xl font-black font-mono text-slate-900 mb-1">
                {formatCurrency(executiveData.totalTourCosts)}
              </div>
              <div className="text-xs text-rose-600 font-semibold">Giá nét & Chi phí tour</div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase">Hoa Hồng Trả CTV / Đại Lý</span>
                <span className="p-2 bg-purple-50 text-purple-600 rounded-lg"><BadgePercent className="w-4 h-4" /></span>
              </div>
              <div className="text-2xl font-black font-mono text-slate-900 mb-1">
                {formatCurrency(executiveData.totalCommissions)}
              </div>
              <div className="text-xs text-slate-500 font-medium">Chi phí môi giới / hoa hồng</div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase">Lợi Nhuận Ròng (Net Margin)</span>
                <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Percent className="w-4 h-4" /></span>
              </div>
              <div className="text-2xl font-black font-mono text-emerald-600 mb-1">
                {formatCurrency(executiveData.netProfit)}
              </div>
              <div className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5" /> Biên lợi nhuận: {executiveData.netMarginPercent}%
              </div>
            </div>
          </div>

          {/* Tour Profitability Breakdown Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Báo Cáo Hạch Toán Lãi / Lỗ Theo Tour Du Lịch</h2>
                <p className="text-xs text-slate-500 font-medium">Chi tiết doanh thu, giá vốn, chi phí và lợi nhuận gộp từng Tour</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" /> Xuất Excel Lãi/Lỗ
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[1000px]">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3.5 min-w-[280px]">Mã & Tên Tour</th>
                    <th className="px-4 py-3.5 min-w-[180px] whitespace-nowrap">Phân loại & Đối tác</th>
                    <th className="px-4 py-3.5 min-w-[130px] whitespace-nowrap text-center">Số chỗ đã bán</th>
                    <th className="px-4 py-3.5 min-w-[140px] whitespace-nowrap text-right">Doanh Thu Chốt</th>
                    <th className="px-4 py-3.5 min-w-[140px] whitespace-nowrap text-right">Chi Phí Vốn</th>
                    <th className="px-4 py-3.5 min-w-[140px] whitespace-nowrap text-right">Lợi Nhuận Gộp</th>
                    <th className="px-4 py-3.5 min-w-[130px] whitespace-nowrap text-center">Biên Lợi Nhuận (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {tourReportList.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900 leading-snug">{t.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">{t.code}</div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold whitespace-nowrap inline-flex items-center gap-1.5 ${
                          t.tour_type === 'internal' 
                            ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                            : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}>
                          {t.tour_type === 'internal' ? 'AD Tự vận hành' : `Gửi đối tác: ${t.partner_name}`}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-800 text-center whitespace-nowrap">
                        <span className="font-bold text-slate-900">{t.sold_seats}</span> / {t.total_seats || 30} chỗ
                      </td>
                      <td className="px-4 py-3.5 font-mono font-bold text-slate-900 text-right whitespace-nowrap">
                        {formatCurrency(t.revenue)}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-600 text-right whitespace-nowrap">
                        {formatCurrency(t.cost)}
                      </td>
                      <td className={`px-4 py-3.5 font-mono font-bold text-right whitespace-nowrap ${t.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {t.profit >= 0 ? '+' : ''}{formatCurrency(t.profit)}
                      </td>
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full font-bold text-[11px] font-mono whitespace-nowrap inline-block ${
                          t.margin >= 15 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : t.margin >= 0 
                            ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {t.margin > 0 ? `+${t.margin}%` : `${t.margin}%`}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {tourReportList.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-slate-400 font-medium">
                        Không có dữ liệu tour nào trong khoảng thời gian và bộ lọc hiện tại.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
