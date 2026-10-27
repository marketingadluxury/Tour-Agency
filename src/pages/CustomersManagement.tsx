import React, { useState, useMemo } from 'react';
import {
  Building2,
  Users,
  Search,
  Plus,
  Edit3,
  Trash2,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Award,
  TrendingUp,
  Briefcase,
  X,
  CheckCircle2,
  XCircle,
  Eye,
  Filter,
  FilterX,
  LayoutGrid,
  List,
  Copy,
  ChevronRight,
  Sparkles,
  DollarSign,
  FileText,
  UserCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useCRM } from '../context/CRMContext';
import { useAuth, UserProfile } from '../context/AuthContext';
import { Order, Role } from '../types';
import { CustomSelect } from '../components/CustomSelect';

// Standard Vietnamese Banks for Dropdown
const VN_BANKS = [
  'Vietcombank (VCB)',
  'VietinBank',
  'BIDV',
  'Agribank',
  'Techcombank (TCB)',
  'MB Bank (MB)',
  'VPBank',
  'ACB',
  'Sacombank',
  'TPBank',
  'VIB',
  'HD Bank',
  'SHB',
  'MSB',
  'SeABank',
  'LienVietPostBank',
  'Eximbank',
  'Ngân hàng khác'
];

export default function CustomersManagement() {
  const { profilesList, addAgentProfile, updateAgentProfile, deleteAgentProfile, orders, currentRole } = useCRM();
  const { user, profile } = useAuth();

  // Active Sub-tab filter
  const [activeTab, setActiveTab] = useState<'all' | 'agent' | 'CTV'>('all');

  // Multi-criteria filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLeaderId, setFilterLeaderId] = useState('all');
  const [filterTier, setFilterTier] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState<'revenue' | 'bookings' | 'pax' | 'commission' | 'newest'>('revenue');

  // Display Mode
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<UserProfile | null>(null);
  const [selectedAgentDetail, setSelectedAgentDetail] = useState<UserProfile | null>(null);

  // Form Field States
  const [formData, setFormData] = useState({
    role: 'agent' as 'agent' | 'CTV',
    full_name: '',
    company_name: '',
    phone: '',
    email: '',
    address: '',
    leader_id: '',
    leader_name: '',
    tier: 'Standard',
    bank_name: 'Vietcombank (VCB)',
    bank_account_number: '',
    bank_account_holder: '',
    notes: '',
    status: 'active' as 'active' | 'inactive'
  });

  // Helper format currency
  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Helper format date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('vi-VN');
    } catch {
      return dateStr;
    }
  };

  // Extract list of all available Leaders / Sales for assigning dropdown
  const leaderOptions = useMemo(() => {
    return profilesList.filter(p =>
      ['sale_leader', 'sale', 'admin', 'bod', 'marketing_leader'].includes(p.role)
    );
  }, [profilesList]);

  // Combine real agent/CTV profiles with demo fallback if list is empty
  const agentProfiles = useMemo(() => {
    const list = profilesList.filter(p => p.role === 'agent' || p.role === 'CTV');

    if (list.length === 0) {
      // Fallback demo agents for initial view
      return [
        {
          id: 'DEMO-AG-01',
          full_name: 'Nguyễn Văn Minh',
          company_name: 'Công ty TNHH Du Lịch Việt Travel',
          phone: '0908 123 456',
          email: 'contact@viettravel-demo.com.vn',
          address: '190 Pasteur, Quận 3, TP. Hồ Chí Minh',
          role: 'agent' as Role,
          tier: 'Gold Partner',
          status: 'active' as const,
          leader_name: 'Trần Thị Mỹ - Sale Leader',
          bank_name: 'Vietcombank (VCB)',
          bank_account_number: '0071001234567',
          bank_account_holder: 'NGUYEN VAN MINH',
          notes: 'Đại lý vàng khu vực Miền Nam',
          created_at: new Date(Date.now() - 30 * 86400000).toISOString()
        },
        {
          id: 'DEMO-AG-02',
          full_name: 'Lê Hoàng Yến',
          company_name: 'Saigon Tourist Partner',
          phone: '0912 345 678',
          email: 'hoangyen@saigontourist-demo.net',
          address: '45 Lê Lợi, Quận 1, TP. Hồ Chí Minh',
          role: 'agent' as Role,
          tier: 'Platinum Partner',
          status: 'active' as const,
          leader_name: 'Nguyễn Văn Nam - Sale',
          bank_name: 'Techcombank (TCB)',
          bank_account_number: '19034567890011',
          bank_account_holder: 'LE HOANG YEN',
          notes: 'Đại lý doanh số bạch kim',
          created_at: new Date(Date.now() - 60 * 86400000).toISOString()
        },
        {
          id: 'DEMO-CTV-01',
          full_name: 'Phạm Đức Anh',
          company_name: 'CTV Tự do',
          phone: '0989 888 999',
          email: 'ducanh.ctv@gmail.com',
          address: 'Đống Đa, Hà Nội',
          role: 'CTV' as Role,
          tier: 'Silver Partner',
          status: 'active' as const,
          leader_name: 'Nguyễn Văn Nam - Sale',
          bank_name: 'MB Bank (MB)',
          bank_account_number: '999988887777',
          bank_account_holder: 'PHAM DUC ANH',
          notes: 'Chuyên gửi khách đi Châu Âu',
          created_at: new Date(Date.now() - 15 * 86400000).toISOString()
        }
      ] as UserProfile[];
    }

    return list;
  }, [profilesList]);

  // Compute metrics for each agent from real orders
  const agentMetricsMap = useMemo(() => {
    const map = new Map<string, {
      agentOrders: Order[];
      totalBookings: number;
      totalPax: number;
      totalRevenue: number;
      totalCommission: number;
      computedTier: string;
    }>();

    agentProfiles.forEach(ag => {
      const nameLower = (ag.full_name || '').toLowerCase().trim();
      const compLower = (ag.company_name || '').toLowerCase().trim();
      const emailLower = (ag.email || '').toLowerCase().trim();
      const phoneClean = (ag.phone || '').replace(/\D/g, '');

      // Match orders created by or associated with this agent/CTV
      const agentOrders = orders.filter(o => {
        if (o.status === 'cancelled') return false;

        const cbLower = (o.created_by || '').toLowerCase();
        const ctvInfoLower = (o.ctv_info || '').toLowerCase();
        const bookerPhone = (o.booker_phone || '').replace(/\D/g, '');

        const isUserIdMatch = o.user_id === ag.id;
        const isNameMatch = nameLower && (cbLower.includes(nameLower) || ctvInfoLower.includes(nameLower));
        const isCompMatch = compLower && compLower !== 'ctv tự do' && (cbLower.includes(compLower) || ctvInfoLower.includes(compLower));
        const isEmailMatch = emailLower && (cbLower.includes(emailLower) || ctvInfoLower.includes(emailLower));
        const isPhoneMatch = phoneClean && phoneClean.length >= 8 && (bookerPhone.includes(phoneClean) || ctvInfoLower.includes(phoneClean));

        return isUserIdMatch || isNameMatch || isCompMatch || isEmailMatch || isPhoneMatch;
      });

      const totalBookings = agentOrders.length;
      const totalPax = agentOrders.reduce((sum, o) => sum + (o.adult_count || 0) + (o.child_count || 0) + (o.infant_count || 0), 0);
      const totalRevenue = agentOrders.reduce((sum, o) => sum + (o.total_price || 0), 0);

      const totalCommission = agentOrders.reduce((sum, o) => {
        if (o.agent_commission_amount) return sum + o.agent_commission_amount;
        if (o.price_markup) {
          const markupFee = o.markup_fee_amount || (o.price_markup * (o.markup_tax_percent ?? 25) / 100);
          return sum + Math.max(0, o.price_markup - markupFee);
        }
        return sum + (o.net_commission_amount || 0);
      }, 0);

      // Tier computation logic based on volume
      let computedTier = ag.tier || 'Standard';
      if (!ag.tier || ag.tier === 'Standard') {
        if (totalPax >= 100) computedTier = 'Platinum Partner';
        else if (totalPax >= 30) computedTier = 'Gold Partner';
        else if (totalPax >= 10) computedTier = 'Silver Partner';
        else computedTier = 'Standard Partner';
      }

      map.set(ag.id, {
        agentOrders,
        totalBookings,
        totalPax,
        totalRevenue,
        totalCommission,
        computedTier
      });
    });

    return map;
  }, [agentProfiles, orders]);

  // Aggregate stats across all agents
  const globalStats = useMemo(() => {
    let totalAgentsCount = 0;
    let totalCtvCount = 0;
    let totalPax = 0;
    let totalRevenue = 0;
    let totalCommission = 0;

    agentProfiles.forEach(ag => {
      if (ag.role === 'agent') totalAgentsCount++;
      if (ag.role === 'CTV') totalCtvCount++;

      const metrics = agentMetricsMap.get(ag.id);
      if (metrics) {
        totalPax += metrics.totalPax;
        totalRevenue += metrics.totalRevenue;
        totalCommission += metrics.totalCommission;
      }
    });

    return {
      totalCount: agentProfiles.length,
      totalAgentsCount,
      totalCtvCount,
      totalPax,
      totalRevenue,
      totalCommission
    };
  }, [agentProfiles, agentMetricsMap]);

  // Filtered & Sorted Agents list
  const filteredAgents = useMemo(() => {
    return agentProfiles
      // 1. Sub-tab filter
      .filter(ag => {
        if (activeTab === 'all') return true;
        return ag.role === activeTab;
      })
      // 2. Keyword Search (name, company, phone, email, bank, address)
      .filter(ag => {
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase().trim();
        return (
          (ag.full_name || '').toLowerCase().includes(term) ||
          (ag.company_name || '').toLowerCase().includes(term) ||
          (ag.phone || '').toLowerCase().includes(term) ||
          (ag.email || '').toLowerCase().includes(term) ||
          (ag.address || '').toLowerCase().includes(term) ||
          (ag.bank_account_number || '').toLowerCase().includes(term) ||
          (ag.leader_name || '').toLowerCase().includes(term)
        );
      })
      // 3. Leader / Sale filter
      .filter(ag => {
        if (filterLeaderId === 'all') return true;
        return ag.leader_id === filterLeaderId;
      })
      // 4. Tier filter
      .filter(ag => {
        if (filterTier === 'all') return true;
        const metrics = agentMetricsMap.get(ag.id);
        const tierStr = (metrics?.computedTier || ag.tier || '').toLowerCase();
        return tierStr.includes(filterTier.toLowerCase());
      })
      // 5. Status filter
      .filter(ag => {
        if (filterStatus === 'all') return true;
        const currentStatus = ag.status || 'active';
        return currentStatus === filterStatus;
      })
      // 6. Sorting
      .sort((a, b) => {
        const mA = agentMetricsMap.get(a.id);
        const mB = agentMetricsMap.get(b.id);

        if (sortBy === 'revenue') return (mB?.totalRevenue || 0) - (mA?.totalRevenue || 0);
        if (sortBy === 'bookings') return (mB?.totalBookings || 0) - (mA?.totalBookings || 0);
        if (sortBy === 'pax') return (mB?.totalPax || 0) - (mA?.totalPax || 0);
        if (sortBy === 'commission') return (mB?.totalCommission || 0) - (mA?.totalCommission || 0);
        if (sortBy === 'newest') return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        return 0;
      });
  }, [agentProfiles, activeTab, searchTerm, filterLeaderId, filterTier, filterStatus, sortBy, agentMetricsMap]);

  // Check if any filter is active
  const isAnyFilterActive =
    searchTerm.trim() !== '' ||
    filterLeaderId !== 'all' ||
    filterTier !== 'all' ||
    filterStatus !== 'all' ||
    activeTab !== 'all';

  const resetAllFilters = () => {
    setSearchTerm('');
    setFilterLeaderId('all');
    setFilterTier('all');
    setFilterStatus('all');
    setActiveTab('all');
    setSortBy('revenue');
  };

  // Handle open Add Modal
  const handleOpenAddModal = () => {
    setEditingAgent(null);
    setFormData({
      role: 'agent',
      full_name: '',
      company_name: '',
      phone: '',
      email: '',
      address: '',
      leader_id: user?.id || '',
      leader_name: profile?.full_name || '',
      tier: 'Standard',
      bank_name: 'Vietcombank (VCB)',
      bank_account_number: '',
      bank_account_holder: '',
      notes: '',
      status: 'active'
    });
    setIsFormOpen(true);
  };

  // Handle open Edit Modal
  const handleOpenEditModal = (agent: UserProfile) => {
    setEditingAgent(agent);
    setFormData({
      role: (agent.role === 'CTV' ? 'CTV' : 'agent') as 'agent' | 'CTV',
      full_name: agent.full_name || '',
      company_name: agent.company_name || '',
      phone: agent.phone || '',
      email: agent.email || '',
      address: agent.address || '',
      leader_id: agent.leader_id || '',
      leader_name: agent.leader_name || '',
      tier: agent.tier || 'Standard',
      bank_name: agent.bank_name || 'Vietcombank (VCB)',
      bank_account_number: agent.bank_account_number || '',
      bank_account_holder: agent.bank_account_holder || '',
      notes: agent.notes || '',
      status: (agent.status as 'active' | 'inactive') || 'active'
    });
    setIsFormOpen(true);
  };

  // Submit Save Agent Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.full_name.trim()) {
      toast.error('Vui lòng nhập Tên đại lý hoặc Họ tên CTV');
      return;
    }
    if (!formData.phone.trim()) {
      toast.error('Vui lòng nhập Số điện thoại liên hệ');
      return;
    }

    // Find assigned leader name
    const assignedLeader = leaderOptions.find(l => l.id === formData.leader_id);
    const leaderName = assignedLeader ? `${assignedLeader.full_name} (${assignedLeader.role})` : formData.leader_name;

    try {
      if (editingAgent) {
        // Update
        await updateAgentProfile(editingAgent.id, {
          role: formData.role,
          full_name: formData.full_name.trim(),
          company_name: formData.company_name.trim() || (formData.role === 'CTV' ? 'CTV Tự do' : 'Đại lý'),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          address: formData.address.trim(),
          leader_id: formData.leader_id || null,
          leader_name: leaderName,
          tier: formData.tier,
          bank_name: formData.bank_name,
          bank_account_number: formData.bank_account_number.trim(),
          bank_account_holder: formData.bank_account_holder.trim().toUpperCase(),
          notes: formData.notes.trim(),
          status: formData.status
        });
        toast.success(`Cập nhật thông tin ${formData.role === 'agent' ? 'Đại lý' : 'CTV'} thành công!`);
      } else {
        // Create new
        await addAgentProfile({
          role: formData.role,
          full_name: formData.full_name.trim(),
          company_name: formData.company_name.trim() || (formData.role === 'CTV' ? 'CTV Tự do' : 'Đại lý'),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          address: formData.address.trim(),
          leader_id: formData.leader_id || null,
          leader_name: leaderName,
          tier: formData.tier,
          bank_name: formData.bank_name,
          bank_account_number: formData.bank_account_number.trim(),
          bank_account_holder: formData.bank_account_holder.trim().toUpperCase(),
          notes: formData.notes.trim(),
          status: formData.status
        });
        toast.success(`Thêm mới ${formData.role === 'agent' ? 'Đại lý' : 'CTV'} thành công!`);
      }

      setIsFormOpen(false);
    } catch (err) {
      toast.error('Đã xảy ra lỗi khi lưu thông tin. Vui lòng thử lại!');
    }
  };

  // Delete Agent confirmation
  const handleDeleteAgent = async (agent: UserProfile) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa ${agent.role === 'agent' ? 'Đại lý' : 'CTV'} "${agent.full_name}" khỏi hệ thống?`)) {
      try {
        await deleteAgentProfile(agent.id);
        toast.success(`Đã xóa đối tác thành công!`);
        if (selectedAgentDetail?.id === agent.id) {
          setSelectedAgentDetail(null);
        }
      } catch (err) {
        toast.error('Lỗi khi xóa đối tác!');
      }
    }
  };

  // Helper copy to clipboard
  const handleCopyText = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`Đã sao chép ${label}: ${text}`);
  };

  // Helper get Tier Badge Style
  const renderTierBadge = (tierName: string) => {
    const t = (tierName || '').toLowerCase();
    if (t.includes('platinum') || t.includes('bạch kim')) {
      return (
        <span className="whitespace-nowrap shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs flex items-center gap-1 border border-purple-300">
          <Sparkles className="w-3 h-3 text-amber-300 fill-amber-300 shrink-0" />
          Platinum Partner
        </span>
      );
    }
    if (t.includes('gold') || t.includes('vàng')) {
      return (
        <span className="whitespace-nowrap shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-xs flex items-center gap-1 border border-amber-300">
          <Award className="w-3 h-3 text-white fill-white shrink-0" />
          Gold Partner
        </span>
      );
    }
    if (t.includes('silver') || t.includes('bạc')) {
      return (
        <span className="whitespace-nowrap shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-gradient-to-r from-slate-500 to-gray-600 text-white shadow-xs flex items-center gap-1 border border-slate-300">
          <Award className="w-3 h-3 text-slate-200 shrink-0" />
          Silver Partner
        </span>
      );
    }
    return (
      <span className="whitespace-nowrap shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700 border border-gray-200 flex items-center gap-1">
        Standard Partner
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* 1. Header Section */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
                Quản lý Đại lý & Cộng tác viên (Agent / CTV)
              </h2>
              <p className="text-xs text-gray-500 mt-0.5 font-medium">
                Hệ thống theo dõi kênh phân phối Đại lý F1/F2, CTV cá nhân, quản lý tài khoản nhận hoa hồng & báo cáo doanh số chi tiết.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {['admin', 'bod', 'sale_leader', 'sale'].includes(currentRole) && (
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Đại lý / CTV mới</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Partners */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Tổng số đối tác</span>
            <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
            {globalStats.totalCount} <span className="text-xs font-semibold text-gray-500">đối tác</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium pt-1 border-t border-gray-100">
            <span className="text-blue-600 font-bold flex items-center gap-1">
              <Building2 className="w-3 h-3 text-blue-600" /> {globalStats.totalAgentsCount} Đại lý
            </span>
            <span>•</span>
            <span className="text-purple-600 font-bold flex items-center gap-1">
              <Users className="w-3 h-3 text-purple-600" /> {globalStats.totalCtvCount} CTV
            </span>
          </div>
        </div>

        {/* Card 2: Total Pax */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Lượt khách (Pax)</span>
            <span className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-teal-700 tracking-tight">
            {globalStats.totalPax} <span className="text-xs font-semibold text-gray-500">Pax</span>
          </div>
          <p className="text-[11px] text-gray-500 font-medium pt-1 border-t border-gray-100 truncate">
            Tổng lượt hành khách mang về từ kênh bán
          </p>
        </div>

        {/* Card 3: Total Sales Revenue */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Doanh số đóng góp</span>
            <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-base sm:text-lg font-black text-indigo-900 tracking-tight truncate">
            {formatVND(globalStats.totalRevenue)}
          </div>
          <p className="text-[11px] text-gray-500 font-medium pt-1 border-t border-gray-100 truncate">
            Giá trị tất cả hợp đồng tour đặt thành công
          </p>
        </div>

        {/* Card 4: Total Commissions */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Hoa hồng phát sinh</span>
            <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="text-base sm:text-lg font-black text-emerald-700 tracking-tight truncate">
            {formatVND(globalStats.totalCommission)}
          </div>
          <p className="text-[11px] text-gray-500 font-medium pt-1 border-t border-gray-100 truncate">
            Tổng hoa hồng & chênh lệch thực nhận
          </p>
        </div>
      </div>

      {/* 3. Sub-Tabs & Filter Toolbar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        {/* Top bar: Sub-tabs + View Mode toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          {/* Sub-tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-gray-100/80 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Tất cả ({agentProfiles.length})
            </button>
            <button
              onClick={() => setActiveTab('agent')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'agent'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Đại lý</span>
              <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded-full text-[10px]">
                {globalStats.totalAgentsCount}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('CTV')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'CTV'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-purple-600" />
              <span>Cộng tác viên</span>
              <span className="px-1.5 py-0.2 bg-purple-100 text-purple-800 rounded-full text-[10px]">
                {globalStats.totalCtvCount}
              </span>
            </button>
          </div>

          {/* Right controls: Sort dropdown & View mode toggle */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-semibold hidden sm:inline">Sắp xếp:</span>
              <CustomSelect
                options={[
                  { value: 'revenue', label: 'Doanh số cao nhất' },
                  { value: 'bookings', label: 'Số đơn booking nhiều nhất' },
                  { value: 'pax', label: 'Số lượng Pax nhiều nhất' },
                  { value: 'commission', label: 'Hoa hồng phát sinh nhiều nhất' },
                  { value: 'newest', label: 'Ngày gia nhập mới nhất' },
                ]}
                value={sortBy}
                onChange={val => setSortBy(val as any)}
                className="w-56 sm:w-60"
                buttonClassName="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
              />
            </div>

            <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50 shrink-0">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Hiển thị dạng thẻ Thẻ (Grid)"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'table' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Hiển thị dạng Bảng (Table)"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Keyword Search */}
          <div className="relative col-span-1 sm:col-span-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-9 pr-8 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white text-slate-900 placeholder:text-slate-400 font-medium transition-all"
              placeholder="Tìm theo tên đại lý, tên công ty, SĐT, email, STK ngân hàng..."
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sale/Leader filter */}
          <div>
            <CustomSelect
              options={[
                { value: 'all', label: 'Tất cả Sale phụ trách' },
                ...leaderOptions.map(l => ({
                  value: l.id,
                  label: `${l.full_name} (${l.role})`
                }))
              ]}
              value={filterLeaderId}
              onChange={setFilterLeaderId}
              className="w-full"
              buttonClassName="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white text-slate-800 font-semibold cursor-pointer transition-all"
            />
          </div>

          {/* Tier filter */}
          <div>
            <CustomSelect
              options={[
                { value: 'all', label: 'Tất cả Hạng đối tác' },
                { value: 'platinum', label: 'Platinum Partner' },
                { value: 'gold', label: 'Gold Partner' },
                { value: 'silver', label: 'Silver Partner' },
                { value: 'standard', label: 'Standard Partner' },
              ]}
              value={filterTier}
              onChange={setFilterTier}
              className="w-full"
              buttonClassName="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white text-slate-800 font-semibold cursor-pointer transition-all"
            />
          </div>
        </div>

        {/* Active Filters Bar */}
        {isAnyFilterActive && (
          <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs">
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
              {filterLeaderId !== 'all' && (
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-200 font-medium text-[11px] flex items-center gap-1">
                  Sale: {leaderOptions.find(l => l.id === filterLeaderId)?.full_name}
                  <X className="w-3 h-3 hover:text-red-500 cursor-pointer" onClick={() => setFilterLeaderId('all')} />
                </span>
              )}
              {filterTier !== 'all' && (
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-200 font-medium text-[11px] flex items-center gap-1">
                  Hạng: {filterTier.toUpperCase()}
                  <X className="w-3 h-3 hover:text-red-500 cursor-pointer" onClick={() => setFilterTier('all')} />
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

      {/* 4. Agents List Main View (Grid or Table) */}
      {filteredAgents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-gray-800">Không tìm thấy Đại lý hoặc CTV phù hợp</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Thử thay đổi từ khóa tìm kiếm hoặc xóa các điều kiện lọc để xem toàn bộ danh sách kênh phân phối.
          </p>
          <button
            onClick={resetAllFilters}
            className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <FilterX className="w-4 h-4" />
            <span>Xóa bộ lọc</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAgents.map(ag => {
            const metrics = agentMetricsMap.get(ag.id);
            const isAgent = ag.role === 'agent';

            return (
              <div
                key={ag.id}
                className="bg-white rounded-2xl border border-gray-200 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                {/* Header info */}
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-2xs ${
                        isAgent ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-purple-100 text-purple-700 border border-purple-200'
                      }`}>
                        {isAgent ? <Building2 className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase shrink-0 ${
                            isAgent ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}>
                            {isAgent ? 'Đại lý' : 'CTV'}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-gray-900 mt-0.5 leading-snug group-hover:text-blue-600 transition-colors break-words">
                          {ag.full_name}
                        </h3>
                        {ag.company_name && ag.company_name !== ag.full_name && (
                          <p className="text-xs font-semibold text-gray-600 leading-normal flex items-start gap-1 mt-1 break-words">
                            <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                            <span className="break-words">{ag.company_name}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0">
                      {renderTierBadge(metrics?.computedTier || ag.tier || 'Standard')}
                    </div>
                  </div>

                  {/* Contact details */}
                  <div className="space-y-1.5 text-xs text-gray-600 pt-2 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 truncate">
                        <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="font-semibold text-gray-800">{ag.phone || 'Chưa cập nhật SĐT'}</span>
                      </div>
                      {ag.phone && (
                        <button
                          onClick={() => handleCopyText(ag.phone, 'Số điện thoại')}
                          className="text-[10px] text-blue-600 hover:underline font-bold shrink-0 cursor-pointer flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Sao chép</span>
                        </button>
                      )}
                    </div>

                    {ag.email && (
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">{ag.email}</span>
                      </div>
                    )}

                    {ag.address && (
                      <div className="flex items-center gap-2 truncate text-gray-500">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">{ag.address}</span>
                      </div>
                    )}

                    {ag.leader_name && (
                      <div className="flex items-center gap-2 truncate text-xs text-blue-600 font-medium pt-1">
                        <Briefcase className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="truncate">Sale phụ trách: <strong>{ag.leader_name}</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Bank info box */}
                  <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-200/80 text-xs space-y-1">
                    <div className="flex items-center justify-between text-gray-500">
                      <span className="font-bold flex items-center gap-1 text-[11px]">
                        <CreditCard className="w-3.5 h-3.5 text-emerald-600" /> Tài khoản nhận hoa hồng
                      </span>
                      {ag.bank_account_number && (
                        <button
                          onClick={() => handleCopyText(ag.bank_account_number!, 'Số tài khoản')}
                          className="text-[10px] text-emerald-600 hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" /> Sao chép STK
                        </button>
                      )}
                    </div>
                    {ag.bank_account_number ? (
                      <div>
                        <p className="font-black text-gray-900 tracking-wide text-xs">
                          {ag.bank_account_number} <span className="font-semibold text-gray-500 text-[11px]">({ag.bank_name || 'Ngân hàng'})</span>
                        </p>
                        <p className="text-[11px] font-bold text-emerald-700 uppercase">
                          {ag.bank_account_holder || ag.full_name}
                        </p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-gray-400 italic">Chưa khai báo tài khoản ngân hàng</p>
                    )}
                  </div>
                </div>

                {/* Bottom Stats & Actions */}
                <div className="bg-slate-50 p-4 border-t border-gray-150 space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white p-2 rounded-lg border border-gray-200/60 shadow-2xs">
                      <span className="text-[10px] font-bold text-gray-400 uppercase block">Booking</span>
                      <span className="text-sm font-black text-gray-900 block mt-0.5">
                        {metrics?.totalBookings || 0} <span className="text-[10px] font-normal text-gray-500">đơn</span>
                      </span>
                    </div>

                    <div className="bg-white p-2 rounded-lg border border-gray-200/60 shadow-2xs">
                      <span className="text-[10px] font-bold text-gray-400 uppercase block">Pax đi</span>
                      <span className="text-sm font-black text-teal-700 block mt-0.5">
                        {metrics?.totalPax || 0} <span className="text-[10px] font-normal text-gray-500">pax</span>
                      </span>
                    </div>

                    <div className="bg-white p-2 rounded-lg border border-gray-200/60 shadow-2xs">
                      <span className="text-[10px] font-bold text-gray-400 uppercase block">Hoa hồng</span>
                      <span className="text-xs font-black text-emerald-700 block mt-0.5 truncate">
                        {formatVND(metrics?.totalCommission || 0)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      onClick={() => setSelectedAgentDetail(ag)}
                      className="flex-1 py-1.5 px-3 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Xem lịch sử Booking</span>
                    </button>

                    {['admin', 'bod', 'sale_leader', 'sale'].includes(currentRole) && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditModal(ag)}
                          className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Chỉnh sửa thông tin"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {['admin', 'bod'].includes(currentRole) && (
                          <button
                            onClick={() => handleDeleteAgent(ag)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Xóa đối tác"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Đối tác</th>
                  <th className="py-3 px-4">Loại & Hạng</th>
                  <th className="py-3 px-4">Liên hệ & Địa chỉ</th>
                  <th className="py-3 px-4">TK Ngân hàng (Hoa hồng)</th>
                  <th className="py-3 px-4 text-center">Booking / Pax</th>
                  <th className="py-3 px-4 text-right">Doanh số đóng góp</th>
                  <th className="py-3 px-4 text-right">Hoa hồng tích lũy</th>
                  <th className="py-3 px-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 text-xs font-medium">
                {filteredAgents.map(ag => {
                  const metrics = agentMetricsMap.get(ag.id);
                  const isAgent = ag.role === 'agent';

                  return (
                    <tr key={ag.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            isAgent ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                          }`}>
                            {isAgent ? <Building2 className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-xs">{ag.full_name}</p>
                            {ag.company_name && (
                              <p className="text-[11px] text-gray-500">{ag.company_name}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 space-y-1">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                          isAgent ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}>
                          {isAgent ? 'Đại lý' : 'CTV'}
                        </span>
                        <div>
                          {renderTierBadge(metrics?.computedTier || ag.tier || 'Standard')}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 space-y-0.5">
                        <p className="font-semibold text-gray-800">{ag.phone || 'N/A'}</p>
                        <p className="text-[11px] text-gray-500 truncate max-w-[180px]">{ag.email || 'N/A'}</p>
                        {ag.leader_name && (
                          <p className="text-[10px] text-blue-600 font-semibold">Sale: {ag.leader_name}</p>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {ag.bank_account_number ? (
                          <div>
                            <p className="font-extrabold text-gray-900">{ag.bank_account_number}</p>
                            <p className="text-[10px] text-gray-500">{ag.bank_name}</p>
                            <p className="text-[10px] font-bold text-emerald-700 uppercase">{ag.bank_account_holder}</p>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic text-[11px]">Chưa cập nhật</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="font-black text-gray-900 block">{metrics?.totalBookings || 0} đơn</span>
                        <span className="text-[10px] font-bold text-teal-600 block">{metrics?.totalPax || 0} Pax</span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-black text-indigo-900">
                        {formatVND(metrics?.totalRevenue || 0)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-black text-emerald-700">
                        {formatVND(metrics?.totalCommission || 0)}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedAgentDetail(ag)}
                            className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                            title="Xem chi tiết lịch sử booking"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {['admin', 'bod', 'sale_leader', 'sale'].includes(currentRole) && (
                            <button
                              onClick={() => handleOpenEditModal(ag)}
                              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                              title="Chỉnh sửa"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}
                          {['admin', 'bod'].includes(currentRole) && (
                            <button
                              onClick={() => handleDeleteAgent(ag)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Xóa đối tác"
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
        </div>
      )}

      {/* 5. Modal Form Add / Edit Agent & CTV */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-2xl w-full p-6 space-y-5 my-8 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-150">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  {editingAgent ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    {editingAgent ? 'Cập nhật thông tin Đối tác' : 'Thêm Đại lý / Cộng tác viên mới'}
                  </h3>
                  <p className="text-xs text-gray-500">Khai báo thông tin tài khoản đối tác phân phối tour & nhận hoa hồng</p>
                </div>
              </div>

              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4">
              {/* Phân loại Đối tác */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700">Loại đối tác <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                    formData.role === 'agent'
                      ? 'bg-blue-50/80 border-blue-500 text-blue-900 font-bold ring-2 ring-blue-200'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="role"
                      value="agent"
                      checked={formData.role === 'agent'}
                      onChange={() => setFormData({ ...formData, role: 'agent' })}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <span className="text-xs">Đại lý (Doanh nghiệp)</span>
                  </label>

                  <label className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                    formData.role === 'CTV'
                      ? 'bg-purple-50/80 border-purple-500 text-purple-900 font-bold ring-2 ring-purple-200'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="role"
                      value="CTV"
                      checked={formData.role === 'CTV'}
                      onChange={() => setFormData({ ...formData, role: 'CTV' })}
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    <Users className="w-4 h-4 text-purple-600" />
                    <span className="text-xs">CTV (Cá nhân tự do)</span>
                  </label>
                </div>
              </div>

              {/* General info grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {formData.role === 'agent' ? 'Tên Đại lý / Người đại diện' : 'Họ và tên CTV'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="VD: Nguyễn Văn A"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Tên Công ty / Thương hiệu
                  </label>
                  <input
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="VD: Công ty Du Lịch Việt"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Số điện thoại liên hệ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="VD: 0908 123 456"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Email liên hệ
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="VD: contact@daily.com"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Địa chỉ làm việc / Đăng ký kinh doanh
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="VD: 190 Pasteur, Phường Võ Thị Sáu, Quận 3, TP. Hồ Chí Minh"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Sale / Leader phụ trách
                  </label>
                  <CustomSelect
                    options={[
                      { value: '', label: '-- Chọn Nhân viên Sale / Leader --' },
                      ...leaderOptions.map(l => ({
                        value: l.id,
                        label: `${l.full_name} (${l.role})`
                      }))
                    ]}
                    value={formData.leader_id}
                    onChange={val => setFormData({ ...formData, leader_id: val })}
                    className="w-full"
                    buttonClassName="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none cursor-pointer transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Hạng đối tác (Tier)
                  </label>
                  <CustomSelect
                    options={[
                      { value: 'Standard', label: 'Standard Partner (Mặc định)' },
                      { value: 'Silver Partner', label: 'Silver Partner (Hạng Bạc)' },
                      { value: 'Gold Partner', label: 'Gold Partner (Hạng Vàng)' },
                      { value: 'Platinum Partner', label: 'Platinum Partner (Hạng Bạch kim)' },
                    ]}
                    value={formData.tier}
                    onChange={val => setFormData({ ...formData, tier: val })}
                    className="w-full"
                    buttonClassName="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none cursor-pointer transition-all"
                  />
                </div>
              </div>

              {/* Bank Account Details */}
              <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-200/80 space-y-3">
                <h4 className="text-xs font-extrabold text-emerald-900 flex items-center gap-1.5 uppercase tracking-wide">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  Thông tin Tài khoản Ngân hàng nhận Hoa hồng
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Ngân hàng</label>
                    <CustomSelect
                      options={VN_BANKS.map(b => ({ value: b, label: b }))}
                      value={formData.bank_name}
                      onChange={val => setFormData({ ...formData, bank_name: val })}
                      className="w-full"
                      buttonClassName="w-full h-9 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none cursor-pointer transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Số tài khoản</label>
                    <input
                      type="text"
                      value={formData.bank_account_number}
                      onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="VD: 0071001234567"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Tên chủ tài khoản</label>
                    <input
                      type="text"
                      value={formData.bank_account_holder}
                      onChange={(e) => setFormData({ ...formData, bank_account_holder: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 bg-white uppercase focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="VD: NGUYEN VAN A"
                    />
                  </div>
                </div>
              </div>

              {/* Notes & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Ghi chú đối tác</label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="VD: Khu vực Miền Nam, ưu tiên tour Châu Âu..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Trạng thái</label>
                  <CustomSelect
                    options={[
                      { value: 'active', label: 'Đang hoạt động' },
                      { value: 'inactive', label: 'Tạm dừng kết nối' },
                    ]}
                    value={formData.status}
                    onChange={val => setFormData({ ...formData, status: val as any })}
                    className="w-full"
                    buttonClassName="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none cursor-pointer transition-all"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-gray-150 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  {editingAgent ? 'Lưu thay đổi' : 'Tạo đối tác mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Modal Drawer Chi tiết Đối tác & Lịch sử Booking */}
      {selectedAgentDetail && (() => {
        const ag = selectedAgentDetail;
        const metrics = agentMetricsMap.get(ag.id);
        const isAgent = ag.role === 'agent';
        const partnerOrders = metrics?.agentOrders || [];

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-4xl w-full p-6 space-y-6 my-8 animate-in zoom-in-95 duration-150">
              {/* Drawer Header */}
              <div className="flex items-start justify-between pb-4 border-b border-gray-150">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base shrink-0 shadow-xs ${
                    isAgent ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-purple-100 text-purple-700 border border-purple-200'
                  }`}>
                    {isAgent ? <Building2 className="w-6 h-6" /> : <Users className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                        isAgent ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}>
                        {isAgent ? 'Đại lý' : 'CTV'}
                      </span>
                      {renderTierBadge(metrics?.computedTier || ag.tier || 'Standard')}
                    </div>
                    <h3 className="text-lg font-black text-gray-900 mt-1">{ag.full_name}</h3>
                    {ag.company_name && (
                      <p className="text-xs text-gray-500 font-medium flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3.5 h-3.5 text-gray-400" />
                        <span>{ag.company_name}</span>
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setSelectedAgentDetail(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Partner Overview Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <span className="text-[10px] font-bold text-gray-500 uppercase block">Tổng Booking</span>
                  <span className="text-base font-black text-gray-900 block mt-0.5">
                    {metrics?.totalBookings || 0} đơn
                  </span>
                </div>
                <div className="bg-teal-50/60 p-3 rounded-xl border border-teal-200">
                  <span className="text-[10px] font-bold text-teal-600 uppercase block">Tổng Khách (Pax)</span>
                  <span className="text-base font-black text-teal-800 block mt-0.5">
                    {metrics?.totalPax || 0} Pax
                  </span>
                </div>
                <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-200">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase block">Doanh số đóng góp</span>
                  <span className="text-xs sm:text-sm font-black text-indigo-900 block mt-0.5 truncate">
                    {formatVND(metrics?.totalRevenue || 0)}
                  </span>
                </div>
                <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase block">Hoa hồng phát sinh</span>
                  <span className="text-xs sm:text-sm font-black text-emerald-800 block mt-0.5 truncate">
                    {formatVND(metrics?.totalCommission || 0)}
                  </span>
                </div>
              </div>

              {/* Detail contact & Bank account info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-200/80 space-y-1.5">
                  <h4 className="font-extrabold text-gray-900 uppercase text-[11px] mb-2 text-blue-600 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-blue-600" />
                    <span>Thông tin Liên hệ</span>
                  </h4>
                  <p><strong>SĐT:</strong> {ag.phone || 'N/A'}</p>
                  <p><strong>Email:</strong> {ag.email || 'N/A'}</p>
                  <p><strong>Địa chỉ:</strong> {ag.address || 'N/A'}</p>
                  <p><strong>Sale phụ trách:</strong> {ag.leader_name || 'N/A'}</p>
                </div>

                <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-1.5">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-extrabold text-emerald-900 uppercase text-[11px] flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Tài khoản Thanh toán Hoa hồng</span>
                    </h4>
                    {ag.bank_account_number && (
                      <button
                        onClick={() => handleCopyText(ag.bank_account_number!, 'Số tài khoản')}
                        className="text-[10px] text-emerald-700 hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" /> Sao chép STK
                      </button>
                    )}
                  </div>
                  {ag.bank_account_number ? (
                    <>
                      <p><strong>Ngân hàng:</strong> {ag.bank_name}</p>
                      <p><strong>Số tài khoản:</strong> <span className="font-black text-gray-900">{ag.bank_account_number}</span></p>
                      <p><strong>Chủ tài khoản:</strong> <span className="font-bold text-emerald-800 uppercase">{ag.bank_account_holder || ag.full_name}</span></p>
                    </>
                  ) : (
                    <p className="text-gray-400 italic">Chưa khai báo thông tin tài khoản ngân hàng</p>
                  )}
                </div>
              </div>

              {/* Booking History Table */}
              <div className="space-y-3">
                <h4 className="text-sm font-black text-gray-900 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>Danh sách Đơn hàng Booking ({partnerOrders.length})</span>
                  </span>
                  <span className="text-xs text-gray-500 font-normal">Tự động tổng hợp từ hệ thống Orders</span>
                </h4>

                {partnerOrders.length === 0 ? (
                  <div className="p-8 text-center bg-gray-50 rounded-xl border border-gray-200 text-gray-500 text-xs italic">
                    Chưa có đơn hàng booking nào phát sinh từ đối tác này.
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto max-h-[320px]">
                      <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead className="sticky top-0 bg-gray-100 border-b border-gray-200 text-[10px] font-extrabold text-gray-500 uppercase">
                          <tr>
                            <th className="py-2.5 px-3">Mã Đơn / Ngày đặt</th>
                            <th className="py-2.5 px-3">Tên Khách / SĐT</th>
                            <th className="py-2.5 px-3 text-center">Pax</th>
                            <th className="py-2.5 px-3 text-right">Tổng Tiền Đơn</th>
                            <th className="py-2.5 px-3 text-right">Hoa hồng / Chênh lệch</th>
                            <th className="py-2.5 px-3 text-center">Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-150 text-xs font-medium">
                          {partnerOrders.map(o => {
                            const totalPax = (o.adult_count || 0) + (o.child_count || 0) + (o.infant_count || 0);
                            const comm = o.agent_commission_amount || (o.price_markup ? (o.price_markup - (o.markup_fee_amount || 0)) : (o.net_commission_amount || 0));

                            return (
                              <tr key={o.id} className="hover:bg-blue-50/30 transition-colors">
                                <td className="py-2.5 px-3 font-mono font-bold text-blue-700">
                                  #{o.id.substring(0, 8)}
                                  <span className="block text-[10px] font-normal text-gray-400 font-sans">{formatDate(o.created_at)}</span>
                                </td>
                                <td className="py-2.5 px-3">
                                  <p className="font-bold text-gray-900">{o.booker_name || o.customer_name || 'N/A'}</p>
                                  <p className="text-[10px] text-gray-500">{o.booker_phone || o.customer_phone || ''}</p>
                                </td>
                                <td className="py-2.5 px-3 text-center font-bold text-teal-700">
                                  {totalPax} Pax
                                </td>
                                <td className="py-2.5 px-3 text-right font-black text-indigo-900">
                                  {formatVND(o.total_price || 0)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-black text-emerald-700">
                                  {formatVND(comm || 0)}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    o.status === 'sure' ? 'bg-green-100 text-green-800' :
                                    o.status === 'hold' ? 'bg-amber-100 text-amber-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {o.status === 'sure' ? 'Chắc chắn' : o.status === 'hold' ? 'Giữ chỗ' : 'Đã hủy'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Close Drawer Button */}
              <div className="pt-3 border-t border-gray-150 flex justify-end">
                <button
                  onClick={() => setSelectedAgentDetail(null)}
                  className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
