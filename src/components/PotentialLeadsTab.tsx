import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Phone, 
  Mail, 
  MessageSquare, 
  Calendar, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Trash2, 
  Tag, 
  Plus, 
  Eye, 
  Share2, 
  RefreshCw, 
  ExternalLink,
  ChevronRight,
  UserCheck,
  Zap,
  Flame,
  User,
  Layers,
  HelpCircle,
  TrendingUp,
  Sliders,
  ArrowUpDown,
  Settings,
  Copy,
  Check,
  ShoppingBag,
  Link as LinkIcon,
  Cake,
  Globe
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useCRM } from '@/context/CRMContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { MetaLead, Tour } from '@/types';
import { 
  fetchMetaLeads, 
  updateMetaLead, 
  deleteMetaLead
} from '@/lib/metaCapiService';
import { format } from 'date-fns';

interface PotentialLeadsTabProps {
  onSelectLeadForBooking?: (lead: MetaLead) => void;
}

export const PotentialLeadsTab: React.FC<PotentialLeadsTabProps> = ({ onSelectLeadForBooking }) => {
  const { tours = [], profilesList = [], orders = [], currentRole } = useCRM();
  const { profile } = useAuth();

  const [leads, setLeads] = useState<MetaLead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedLead, setSelectedLead] = useState<MetaLead | null>(null);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [isEditingModalOpen, setIsEditingModalOpen] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState('lead_captured');
  const [editGender, setEditGender] = useState('');
  const [editBirthday, setEditBirthday] = useState('');
  const [editFbId, setEditFbId] = useState('');
  const [copiedFbId, setCopiedFbId] = useState(false);
  const [editAssignedTo, setEditAssignedTo] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Delete Modals State
  const [leadToDelete, setLeadToDelete] = useState<{ id: string; name: string; phone?: string } | null>(null);
  const [isDeletingSingle, setIsDeletingSingle] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  // Simulation State
  const [isSimModalOpen, setIsSimModalOpen] = useState(false);
  const [simType, setSimType] = useState<'messenger' | 'lead_form'>('messenger');
  const [simName, setSimName] = useState('Nguyễn Văn Khách Test');
  const [simGender, setSimGender] = useState('Nam');
  const [simPhone, setSimPhone] = useState('0988123456');
  const [simEmail, setSimEmail] = useState('khachhang.test@gmail.com');
  const [simMessage, setSimMessage] = useState('Chào công ty, mình muốn tư vấn tour Dubai 5N4Đ cho 2 người lớn, sđt mình là 0988123456.');
  const [simTourInterest, setSimTourInterest] = useState('Tour Dubai 5N4Đ');
  const [simCampaign, setSimCampaign] = useState('Chiến dịch Quảng cáo Tour Mùa Thu 2026');
  const [isSimulating, setIsSimulating] = useState(false);

  // Load leads
  const loadLeads = async (isSilent: boolean = false) => {
    if (!isSilent) {
      setIsLoading(true);
    }
    try {
      const data = await fetchMetaLeads({
        search: searchTerm || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined
      });
      setLeads(data);
    } catch (err) {
      console.error('Lỗi khi tải danh sách leads:', err);
      if (!isSilent) {
        toast.error('Không thể tải danh sách khách hàng tiềm năng');
      }
    } finally {
      if (!isSilent) {
        setIsLoading(false);
      }
    }
  };

  const sortedLeads = useMemo(() => {
    return [...leads].sort((a, b) => {
      const timeA = new Date(a.created_at || 0).getTime();
      const timeB = new Date(b.created_at || 0).getTime();
      return sortAsc ? timeA - timeB : timeB - timeA;
    });
  }, [leads, sortAsc]);

  const handleToggleSelectAll = () => {
    if (selectedLeadIds.length === sortedLeads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(sortedLeads.map(l => l.id));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedLeadIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    loadLeads();

    let debounceTimer: any = null;
    // Lắng nghe Realtime trên bảng leads để cập nhật ngay khi có khách hàng hoặc SĐT mới (cập nhật mượt mà, không giật màn hình)
    const leadsChannel = supabase
      .channel('potential_leads_realtime_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          loadLeads(true); // Cập nhật ngầm êm ái, không bật loading spinner gây giật nháy
        }, 1500);
      })
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(leadsChannel);
    };
  }, [statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadLeads();
  };

  // Quick action: Change status
  const handleUpdateStatus = async (leadId: string, newStatus: string) => {
    try {
      const res = await updateMetaLead(leadId, { status: newStatus });
      if (res.success) {
        toast.success('Đã cập nhật trạng thái Lead!');
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi cập nhật trạng thái');
    }
  };

  // Helper format ngày sinh
  const formatBirthday = (b?: string) => {
    if (!b) return null;
    try {
      const parts = b.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      const d = new Date(b);
      if (!isNaN(d.getTime())) {
        return format(d, 'dd/MM/yyyy');
      }
    } catch (e) {}
    return b;
  };

  // Open Edit Modal
  const openEditModal = (lead: MetaLead) => {
    setSelectedLead(lead);
    setEditNotes(lead.notes || '');
    setEditStatus(lead.status || 'lead_captured');
    setEditGender(lead.gender || '');
    setEditBirthday(lead.birthday || '');
    setEditFbId(lead.fb_id || lead.psid || '');
    setEditAssignedTo(lead.assigned_to || '');
    setCopiedFbId(false);
    setIsEditingModalOpen(true);
  };

  // Save Edit
  const handleSaveEdit = async () => {
    if (!selectedLead) return;
    setIsSaving(true);
    try {
      const res = await updateMetaLead(selectedLead.id, {
        status: editStatus,
        notes: editNotes,
        gender: editGender || undefined,
        birthday: editBirthday || undefined,
        fb_id: editFbId || undefined,
        assigned_to: editAssignedTo || undefined
      });
      if (res.success) {
        toast.success('Đã lưu thông tin khách hàng tiềm năng!');
        setIsEditingModalOpen(false);
        loadLeads();
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi cập nhật');
    } finally {
      setIsSaving(false);
    }
  };

  // Trigger single lead deletion modal
  const handleDeleteLead = (leadId: string, leadName: string, phone?: string) => {
    setLeadToDelete({ id: leadId, name: leadName || 'Khách hàng', phone });
  };

  // Confirm single deletion
  const handleConfirmDeleteSingle = async () => {
    if (!leadToDelete) return;
    setIsDeletingSingle(true);
    try {
      const res = await deleteMetaLead(leadToDelete.id);
      if (res && res.success !== false) {
        toast.success(`Đã xóa khách hàng "${leadToDelete.name}" thành công!`);
        setLeads(prev => prev.filter(l => l.id !== leadToDelete.id));
        setSelectedLeadIds(prev => prev.filter(id => id !== leadToDelete.id));
        if (selectedLead?.id === leadToDelete.id) {
          setSelectedLead(null);
          setIsEditingModalOpen(false);
        }
        setLeadToDelete(null);
      } else {
        toast.error(res?.error || 'Không thể xóa khách hàng');
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi xóa khách hàng');
    } finally {
      setIsDeletingSingle(false);
    }
  };

  // Confirm bulk deletion
  const handleConfirmDeleteBulk = async () => {
    if (selectedLeadIds.length === 0) return;
    setIsDeletingBulk(true);
    try {
      let count = 0;
      for (const id of selectedLeadIds) {
        try {
          await deleteMetaLead(id);
          count++;
        } catch (e) {}
      }
      toast.success(`Đã xóa thành công ${count} khách hàng!`);
      setLeads(prev => prev.filter(l => !selectedLeadIds.includes(l.id)));
      setSelectedLeadIds([]);
      setShowBulkDeleteModal(false);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi xóa danh sách đã chọn');
    } finally {
      setIsDeletingBulk(false);
    }
  };

  // Run Simulation Test
  const handleSimulateWebhook = async () => {
    if (!simName.trim() || !simPhone.trim()) {
      toast.error('Vui lòng nhập Tên khách hàng và Số điện thoại');
      return;
    }

    setIsSimulating(true);
    try {
      if (simType === 'messenger') {
        // Gửi Webhook giả lập Messenger y hệt Meta
        const fakePayload = {
          object: 'page',
          entry: [
            {
              id: '103836966010338',
              time: Date.now(),
              messaging: [
                {
                  sender: { id: `sim_psid_${Date.now()}` },
                  recipient: { id: '103836966010338' },
                  timestamp: Date.now(),
                  message: {
                    mid: `m_sim_${Date.now()}`,
                    text: simMessage
                  }
                }
              ]
            }
          ]
        };

        const res = await fetch('/api/meta-messenger/webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fakePayload)
        });

        if (res.ok) {
          toast.success('✅ Đã gửi Webhook Messenger giả lập thành công!');
        } else {
          throw new Error('Lỗi gửi Webhook');
        }
      } else {
        // Gửi tạo Lead Form trực tiếp
        const res = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_name: simName,
            customer_phone: simPhone,
            customer_email: simEmail,
            source_channel: 'meta_lead_form',
            utm_campaign: simCampaign,
            tour_interest: simTourInterest,
            message_text: `Biểu mẫu đăng ký: Nhu cầu ${simTourInterest} (${simCampaign})`,
            status: 'lead_captured'
          })
        });

        if (res.ok) {
          toast.success('✅ Đã tạo Lead Form quảng cáo thành công!');
        } else {
          throw new Error('Lỗi tạo Lead Form');
        }
      }

      setIsSimModalOpen(false);
      // Đợi 500ms rồi reload danh sách
      setTimeout(() => {
        loadLeads();
      }, 500);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi chạy giả lập');
    } finally {
      setIsSimulating(false);
    }
  };

  // KPI Statistics
  const stats = useMemo(() => {
    const total = leads.length;
    const withPhone = leads.filter(l => Boolean(l.customer_phone)).length;
    const newLeads = leads.filter(l => l.status === 'lead_captured' || l.status === 'active').length;
    const converted = leads.filter(l => l.status === 'lead_converted').length;
    const contacted = leads.filter(l => l.status === 'contacted').length;
    const convRate = total > 0 ? Math.round((converted / total) * 100) : 0;
    return { total, withPhone, newLeads, converted, contacted, convRate };
  }, [leads]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'lead_captured':
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
            Mới để lại SĐT
          </span>
        );
      case 'contacted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
            <Clock className="w-3 h-3 text-amber-600" />
            Đã liên hệ tư vấn
          </span>
        );
      case 'lead_converted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Đã chốt Booking
          </span>
        );
      case 'unqualified':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">
            <XCircle className="w-3 h-3 text-slate-400" />
            Chưa phù hợp
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700 border border-gray-200 whitespace-nowrap">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Thanh Header Quản lý Khách Hàng Tiềm Năng */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Danh Sách Khách Hàng Tiềm Năng (Leads Meta)
              <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                {leads.length} khách
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Quản lý danh sách khách hàng tự động thu thập từ Facebook Messenger &amp; Lead Form Ads
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsSimModalOpen(true)}
            className="h-9 px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            title="Mở công cụ giả lập test Webhook & Lead Ads"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-100" />
            <span>Giả lập Tin nhắn / Lead Ads</span>
          </button>
        </div>
      </div>

      {/* 4 Thẻ KPI Chỉ Số Nổi Bật */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Tổng Leads Messenger</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <MessageSquare className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-2xl md:text-3xl font-black text-slate-900">{stats.total}</span>
                <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                  {stats.withPhone} có SĐT
                </span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-blue-200 bg-gradient-to-b from-blue-50/30 to-white shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700">Mới Nhận (Cần gọi)</span>
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Flame className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl md:text-3xl font-black text-blue-700">{stats.newLeads}</span>
                <span className="text-[11px] text-blue-800/70 block mt-0.5 font-medium">Khách vừa để lại SĐT</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-gradient-to-b from-amber-50/30 to-white shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700">Đang chăm sóc</span>
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl md:text-3xl font-black text-amber-600">{stats.contacted}</span>
                <span className="text-[11px] text-amber-800/70 block mt-0.5 font-medium">Đã gọi điện tư vấn</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50/30 to-white shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">Đã chốt Booking</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-2xl md:text-3xl font-black text-emerald-700">{stats.converted}</span>
                <span className="text-[11px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                  Tỷ lệ: {stats.convRate}%
                </span>
              </div>
            </div>
          </div>

          {/* Bộ Lọc & Tìm Kiếm */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
            <form onSubmit={handleSearch} className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Tìm theo Tên khách, Số điện thoại, Email hoặc Chiến dịch quảng cáo..."
                className="w-full h-10 pl-10 pr-24 border border-slate-200 rounded-xl text-xs font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-900 placeholder:text-slate-400 bg-slate-50/60 focus:bg-white transition-all shadow-2xs"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
              >
                Tìm
              </button>
            </form>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="h-10 px-3 border border-slate-200 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-800 outline-none cursor-pointer focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-2xs"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="lead_captured">Mới để lại SĐT</option>
                <option value="contacted">Đã liên hệ tư vấn</option>
                <option value="lead_converted">Đã chốt Booking</option>
                <option value="unqualified">Chưa phù hợp</option>
              </select>

              <button
                type="button"
                onClick={() => loadLeads()}
                disabled={isLoading}
                className="h-10 w-10 shrink-0 flex items-center justify-center bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 transition-colors cursor-pointer"
                title="Làm mới danh sách"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            </div>
          </div>

            {/* Bulk actions bar if selected */}
            {selectedLeadIds.length > 0 && (
              <div className="mb-4 bg-blue-50/90 border border-blue-200 rounded-xl px-4 py-2.5 flex items-center justify-between animate-in fade-in slide-in-from-top-1">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  Đã chọn {selectedLeadIds.length} khách hàng
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedLeadIds([])}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 cursor-pointer"
                  >
                    Bỏ chọn
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBulkDeleteModal(true)}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Xóa {selectedLeadIds.length} khách đã chọn
                  </button>
                </div>
              </div>
            )}

            {/* Danh Sách Khách Hàng Tiềm Năng (Bảng dữ liệu chuẩn Enterprise) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              {isLoading ? (
                <div className="py-16 text-center text-slate-400 space-y-3">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600" />
                  <p className="text-xs font-semibold">Đang tải danh sách khách hàng tiềm năng...</p>
                </div>
              ) : sortedLeads.length === 0 ? (
                <div className="py-16 text-center text-slate-500 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                    <Users className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">Chưa có khách hàng tiềm năng nào</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Khi khách hàng nhắn tin để lại số điện thoại trên Facebook Messenger hoặc Webhook, hệ thống sẽ tự động đồng bộ và lưu trữ ngay tại đây.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 text-[11px] font-extrabold uppercase tracking-wider">
                        <th className="py-3.5 px-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={sortedLeads.length > 0 && selectedLeadIds.length === sortedLeads.length}
                            onChange={handleToggleSelectAll}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </th>
                        <th className="py-3.5 px-4">Khách hàng</th>
                        <th className="py-3.5 px-4">Giới tính &amp; Ngày sinh</th>
                        <th className="py-3.5 px-4">Số điện thoại</th>
                        <th className="py-3.5 px-4">Dữ liệu Quảng cáo (Ads)</th>
                        <th className="py-3.5 px-4">Trạng thái</th>
                        <th 
                          className="py-3.5 px-4 cursor-pointer select-none hover:text-blue-600 transition-colors"
                          onClick={() => setSortAsc(!sortAsc)}
                          title="Click để đổi chiều sắp xếp thời gian"
                        >
                          <span className="inline-flex items-center gap-1">
                            Ngày giờ đăng ký
                            <ArrowUpDown className="w-3 h-3" />
                          </span>
                        </th>
                        <th className="py-3.5 px-4 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {sortedLeads.map(lead => {
                        const isSelected = selectedLeadIds.includes(lead.id);
                        return (
                          <tr 
                            key={lead.id} 
                            className={`transition-colors ${isSelected ? 'bg-blue-50/50' : 'hover:bg-blue-50/30'}`}
                          >
                            
                            {/* Checkbox */}
                            <td className="py-3.5 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectOne(lead.id)}
                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                            </td>

                            {/* Họ và tên + Avatar + FB ID */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                {lead.customer_avatar ? (
                                  <img
                                    src={lead.customer_avatar}
                                    alt={lead.customer_name || 'Avatar'}
                                    referrerPolicy="no-referrer"
                                    className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0 shadow-2xs"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <div className="w-9 h-9 rounded-full bg-linear-to-br from-blue-500 to-indigo-600 text-white font-extrabold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                                    {(lead.customer_name || 'K').charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                    {lead.customer_name || 'Khách chưa có tên'}
                                  </div>
                                  {lead.customer_email && (
                                    <div className="text-[11px] text-slate-400 font-normal">
                                      {lead.customer_email}
                                    </div>
                                  )}
                                  {(lead.fb_id || lead.psid) && (
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span 
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200/80 cursor-pointer hover:bg-blue-100 transition-colors"
                                        title="Click để sao chép FB ID"
                                        onClick={() => {
                                          navigator.clipboard.writeText(lead.fb_id || lead.psid || '');
                                          toast.success(`Đã sao chép FB ID: ${lead.fb_id || lead.psid}`);
                                        }}
                                      >
                                        <Globe className="w-2.5 h-2.5 text-blue-600" />
                                        FB: {lead.fb_id || lead.psid}
                                      </span>
                                      {lead.fb_id && !isNaN(Number(lead.fb_id)) && (
                                        <a
                                          href={`https://facebook.com/${lead.fb_id}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-blue-500 hover:text-blue-700"
                                          title="Mở trang Facebook cá nhân"
                                        >
                                          <ExternalLink className="w-3 h-3" />
                                        </a>
                                      )}
                                    </div>
                                  )}
                                  {lead.assigned_name && (
                                    <span className="text-[10px] text-indigo-600 font-semibold flex items-center gap-1 mt-0.5">
                                      <User className="w-3 h-3" />
                                      Sale: {lead.assigned_name}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Giới tính & Ngày sinh */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="space-y-1">
                                <div>
                                  {lead.gender === 'Nam' || lead.gender === 'male' ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                      Nam
                                    </span>
                                  ) : lead.gender === 'Nữ' || lead.gender === 'female' ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-pink-50 text-pink-700 border border-pink-200">
                                      Nữ
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 font-medium text-xs">-</span>
                                  )}
                                </div>
                                {lead.birthday && (
                                  <div className="inline-flex items-center gap-1 text-[11px] text-slate-700 font-semibold" title={`Ngày sinh: ${lead.birthday}`}>
                                    <Cake className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                    <span>{formatBirthday(lead.birthday)}</span>
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Số điện thoại */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {lead.customer_phone ? (
                                <a
                                  href={`tel:${lead.customer_phone}`}
                                  className="inline-flex items-center gap-1.5 font-bold text-blue-600 hover:text-blue-800 hover:underline text-xs bg-blue-50/80 px-2.5 py-1 rounded-lg border border-blue-200/60 transition-colors"
                                >
                                  <Phone className="w-3 h-3 text-blue-500" />
                                  {lead.customer_phone}
                                </a>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">Chưa có SĐT</span>
                              )}
                            </td>

                            {/* Dữ liệu Quảng cáo (Ads / Campaign / UTM) */}
                            <td className="py-3.5 px-4">
                              <div className="space-y-1 max-w-[240px]">
                                {lead.ad_id && (
                                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-50 text-purple-700 border border-purple-200" title={`Ad ID: ${lead.ad_id}`}>
                                    <Tag className="w-3 h-3 text-purple-500 shrink-0" />
                                    <span>Ad: {lead.ad_id}</span>
                                  </div>
                                )}
                                {lead.ad_name && (
                                  <div className="text-[10px] font-semibold text-purple-900 truncate" title={`Tên Ad: ${lead.ad_name}`}>
                                    {lead.ad_name}
                                  </div>
                                )}
                                {lead.utm_campaign && (
                                  <div className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 max-w-full truncate" title={`Chiến dịch: ${lead.utm_campaign}`}>
                                    <Tag className="w-3 h-3 text-indigo-500 shrink-0" />
                                    <span className="truncate">{lead.utm_campaign}</span>
                                  </div>
                                )}
                                {lead.adset_name && (
                                  <div className="inline-flex items-center gap-1 text-[10px] font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 max-w-full truncate" title={`Nhóm QC: ${lead.adset_name}`}>
                                    <span className="truncate">{lead.adset_name}</span>
                                  </div>
                                )}
                                {!lead.ad_id && !lead.utm_campaign && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                                    {lead.source_channel === 'pancake_messenger' ? 'POS CAKE' : (lead.source_channel === 'meta_lead_form' ? 'LEAD ADS' : (lead.source_channel || 'FACEBOOK'))}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Trạng thái */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {getStatusBadge(lead.status)}
                            </td>

                            {/* Ngày giờ đăng ký */}
                            <td className="py-3.5 px-4 text-slate-700 text-xs font-semibold whitespace-nowrap">
                              {lead.created_at ? format(new Date(lead.created_at), 'HH:mm dd/MM/yyyy') : '-'}
                            </td>

                            {/* Action buttons */}
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                
                                {/* Nút Tạo Booking Ngay */}
                                {onSelectLeadForBooking && (
                                  <button
                                    type="button"
                                    onClick={() => onSelectLeadForBooking(lead)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs hover:shadow transition-all cursor-pointer"
                                    title="Tạo Booking từ Lead này"
                                  >
                                    <Zap className="w-3.5 h-3.5 fill-current" />
                                    <span>Tạo Booking</span>
                                  </button>
                                )}

                                {/* Nút Chi tiết & Note */}
                                <button
                                  type="button"
                                  onClick={() => openEditModal(lead)}
                                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                                  title="Chi tiết & Cập nhật thông tin"
                                >
                                  <Sliders className="w-3.5 h-3.5" />
                                </button>

                                {/* Xóa Lead */}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteLead(lead.id, lead.customer_name, lead.customer_phone || undefined)}
                                  className="p-1.5 bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                                  title="Xóa Lead"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>

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

      {/* Modal Chi Tiết & Chỉnh Sửa Khách Hàng Tiềm Năng */}
      {isEditingModalOpen && selectedLead && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Chi Tiết &amp; Cập Nhật Khách Hàng Tiềm Năng
              </h3>
              <button
                type="button"
                onClick={() => setIsEditingModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              
              {/* Header Box tóm tắt */}
              <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-900 text-sm">{selectedLead.customer_name || 'Khách chưa có tên'}</div>
                  {selectedLead.customer_phone && (
                    <a
                      href={`tel:${selectedLead.customer_phone}`}
                      className="text-blue-700 font-bold bg-white px-2 py-0.5 rounded-lg border border-blue-200 text-xs inline-flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3 text-blue-600" />
                      {selectedLead.customer_phone}
                    </a>
                  )}
                </div>
                {selectedLead.last_message && (
                  <div className="text-slate-700 text-[11px] bg-white p-2.5 rounded-lg border border-blue-100">
                    <span className="font-semibold text-slate-500">Tin nhắn/Nội dung: </span>
                    "{selectedLead.last_message}"
                  </div>
                )}
              </div>

              {/* Khối 1: Thông tin Khách hàng (POS Cake & Messenger) */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  Thông Tin Khách Hàng
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Giới tính:</label>
                    <select
                      value={editGender}
                      onChange={e => setEditGender(e.target.value)}
                      className="w-full h-9 px-3 border border-slate-300 rounded-lg font-semibold bg-white text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="">-- Chưa xác định --</option>
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1 flex items-center gap-1">
                      <Cake className="w-3 h-3 text-amber-500" />
                      Ngày tháng năm sinh:
                    </label>
                    <input
                      type="date"
                      value={editBirthday}
                      onChange={e => setEditBirthday(e.target.value)}
                      className="w-full h-9 px-3 border border-slate-300 rounded-lg font-semibold bg-white text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-600 font-bold mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3 text-blue-600" />
                        Facebook ID / PSID:
                      </span>
                      {editFbId && !isNaN(Number(editFbId)) && (
                        <a
                          href={`https://facebook.com/${editFbId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline inline-flex items-center gap-0.5 text-[11px] font-normal"
                        >
                          Mở Facebook Profile <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={editFbId}
                        onChange={e => setEditFbId(e.target.value)}
                        placeholder="Nhập Facebook ID hoặc PSID..."
                        className="flex-1 h-9 px-3 border border-slate-300 rounded-lg font-mono text-xs bg-white text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      />
                      {editFbId && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(editFbId);
                            setCopiedFbId(true);
                            setTimeout(() => setCopiedFbId(false), 2000);
                            toast.success('Đã sao chép Facebook ID');
                          }}
                          className="h-9 px-3 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          {copiedFbId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedFbId ? 'Đã chép' : 'Sao chép'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Khối 2: Dữ liệu Quảng cáo (Meta Ads & POS Cake Tracking) */}
              <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-200/80 space-y-2.5">
                <div className="font-bold text-purple-950 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-purple-600" />
                    Dữ Liệu Quảng Cáo &amp; Chiến Dịch (Ads / UTM)
                  </span>
                  <span className="text-[10px] font-mono bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                    {selectedLead.source_channel || 'Meta Ads / POS Cake'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-white p-2 rounded-lg border border-purple-100">
                    <span className="text-slate-500 block">Ad ID:</span>
                    <span className="font-mono font-bold text-purple-700">{selectedLead.ad_id || 'Không có'}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-purple-100">
                    <span className="text-slate-500 block">Tên Quảng Cáo (Ad Name):</span>
                    <span className="font-semibold text-slate-800">{selectedLead.ad_name || 'Không có'}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-purple-100">
                    <span className="text-slate-500 block">Chiến Dịch (Campaign):</span>
                    <span className="font-semibold text-indigo-700">{selectedLead.utm_campaign || selectedLead.campaign_id || 'Không có'}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-purple-100">
                    <span className="text-slate-500 block">Nhóm QC (Adset):</span>
                    <span className="font-semibold text-teal-700">{selectedLead.adset_name || selectedLead.adset_id || 'Không có'}</span>
                  </div>
                  {selectedLead.utm_source && (
                    <div className="bg-white p-2 rounded-lg border border-purple-100 sm:col-span-2">
                      <span className="text-slate-500 block">UTM Tracking:</span>
                      <span className="font-mono text-slate-700">
                        source: <b>{selectedLead.utm_source}</b>
                        {selectedLead.utm_medium ? ` | medium: ${selectedLead.utm_medium}` : ''}
                        {selectedLead.utm_content ? ` | content: ${selectedLead.utm_content}` : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Khối 3: Quản lý Chăm sóc & Tư vấn */}
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Trạng thái chăm sóc:</label>
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value)}
                    className="w-full h-9 px-3 border border-slate-300 rounded-lg font-semibold bg-white text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="lead_captured">Mới để lại SĐT</option>
                    <option value="contacted">Đã liên hệ tư vấn</option>
                    <option value="lead_converted">Đã chốt Booking</option>
                    <option value="unqualified">Chưa phù hợp / Hủy</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Gán Nhân viên Sale phụ trách:</label>
                  <select
                    value={editAssignedTo}
                    onChange={e => setEditAssignedTo(e.target.value)}
                    className="w-full h-9 px-3 border border-slate-300 rounded-lg font-semibold bg-white text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">-- Chưa gán (Chung cho đội Sale) --</option>
                    {profilesList.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.full_name || p.email} ({p.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Ghi chú nhu cầu khách (Tuyến tour, ngày đi mong muốn, số khách...):</label>
                  <textarea
                    rows={3}
                    value={editNotes}
                    onChange={e => setEditNotes(e.target.value)}
                    placeholder="Nhập ghi chú chi tiết..."
                    className="w-full p-2.5 border border-slate-300 rounded-lg font-medium bg-white text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              {selectedLead && (
                <button
                  type="button"
                  onClick={() => {
                    const l = selectedLead;
                    setIsEditingModalOpen(false);
                    handleDeleteLead(l.id, l.customer_name, l.customer_phone || undefined);
                  }}
                  className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Xóa Lead này
                </button>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setIsEditingModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  Lưu Thay Đổi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Giả Lập Test Webhook & Lead Ads */}
      {isSimModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                Công Cụ Giả Lập Test Webhook & Lead Ads
              </h3>
              <button
                type="button"
                onClick={() => setIsSimModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200/80 text-slate-700 space-y-1">
                <p className="font-bold text-amber-900 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                  Mô phỏng sự kiện thực tế từ Meta:
                </p>
                <p className="text-[11px] text-amber-800">
                  Hệ thống sẽ gửi gói tin Webhook giả lập tới Backend, tự động lọc SĐT, bóc tách nhu cầu tour và lưu ngay vào database Supabase theo thời gian thực.
                </p>
              </div>

              {/* Loại giả lập */}
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Loại sự kiện muốn thử nghiệm:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSimType('messenger');
                      setSimMessage('Chào Tour CRM, mình muốn tư vấn tour Dubai 5N4Đ, sđt mình 0988123456');
                    }}
                    className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                      simType === 'messenger'
                        ? 'border-blue-600 bg-blue-50/60 text-blue-900 font-bold shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs">Tin nhắn Messenger</div>
                      <div className="text-[10px] text-slate-400 font-normal">Khách chat để lại SĐT</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSimType('lead_form');
                      setSimCampaign('Quảng cáo Chuyển đổi Lead Form - Tour Úc 2026');
                      setSimTourInterest('Tour Úc Sydney - Melbourne 7N6Đ');
                    }}
                    className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                      simType === 'lead_form'
                        ? 'border-blue-600 bg-blue-50/60 text-blue-900 font-bold shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs">Biểu Mẫu Lead Ads</div>
                      <div className="text-[10px] text-slate-400 font-normal">Instant Form trên Facebook</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Tên khách, Giới tính & SĐT */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="col-span-1">
                  <label className="block text-slate-600 font-bold mb-1">Tên khách test:</label>
                  <input
                    type="text"
                    value={simName}
                    onChange={e => setSimName(e.target.value)}
                    className="w-full h-9 px-3 border border-slate-300 rounded-lg font-semibold bg-white text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-slate-600 font-bold mb-1">Giới tính:</label>
                  <select
                    value={simGender}
                    onChange={e => setSimGender(e.target.value)}
                    className="w-full h-9 px-3 border border-slate-300 rounded-lg font-semibold bg-white text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>
                <div className="col-span-1">
                  <label className="block text-slate-600 font-bold mb-1">Số điện thoại:</label>
                  <input
                    type="text"
                    value={simPhone}
                    onChange={e => setSimPhone(e.target.value)}
                    className="w-full h-9 px-3 border border-slate-300 rounded-lg font-bold text-blue-700 bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {simType === 'messenger' ? (
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Nội dung tin nhắn khách gửi:</label>
                  <textarea
                    rows={3}
                    value={simMessage}
                    onChange={e => setSimMessage(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg font-medium bg-white text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Tuyến Tour quan tâm:</label>
                    <input
                      type="text"
                      value={simTourInterest}
                      onChange={e => setSimTourInterest(e.target.value)}
                      className="w-full h-9 px-3 border border-slate-300 rounded-lg font-semibold bg-white text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Tên Chiến Dịch Quảng Cáo:</label>
                    <input
                      type="text"
                      value={simCampaign}
                      onChange={e => setSimCampaign(e.target.value)}
                      className="w-full h-9 px-3 border border-slate-300 rounded-lg font-medium bg-white text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsSimModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSimulateWebhook}
                disabled={isSimulating}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                {isSimulating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-amber-300" />}
                Bắn Webhook Thử Nghiệm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xác Nhận Xóa 1 Khách Hàng Tiềm Năng */}
      {leadToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-2xs">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Xác nhận xóa khách hàng</h3>
                <p className="text-xs text-slate-500">Dữ liệu khách hàng sẽ bị xóa vĩnh viễn khỏi CRM.</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Họ và tên:</span>
                <span className="text-blue-700 font-extrabold">{leadToDelete.name}</span>
              </div>
              {leadToDelete.phone && (
                <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Số điện thoại:</span>
                  <span className="text-emerald-700 font-mono font-black">{leadToDelete.phone}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setLeadToDelete(null)}
                disabled={isDeletingSingle}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSingle}
                disabled={isDeletingSingle}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                {isDeletingSingle ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Xác Nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xác Nhận Xóa Hàng Loạt */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-2xs">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Xóa nhiều khách hàng đã chọn</h3>
                <p className="text-xs text-slate-500">Đang chọn {selectedLeadIds.length} khách hàng tiềm năng.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-50/80 border border-rose-200 text-xs text-rose-800 leading-relaxed font-medium">
              Bạn có chắc chắn muốn xóa vĩnh viễn <strong>{selectedLeadIds.length} khách hàng</strong> đã chọn không? Thao tác này không thể hoàn tác.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(false)}
                disabled={isDeletingBulk}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteBulk}
                disabled={isDeletingBulk}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                {isDeletingBulk ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Xóa {selectedLeadIds.length} Khách Hàng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
