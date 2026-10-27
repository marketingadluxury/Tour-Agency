import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useCRM } from '@/context/CRMContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { PaymentProposal, ProposalStatus, getRoleConfig } from '@/types';
import { DatePicker } from '@/components/DatePicker';
import { TimeRangeFilter } from '@/components/TimeRangeFilter';
import { CustomSelect, SelectOption } from '@/components/CustomSelect';
import { isDateInTimeRange } from '@/lib/dateUtils';
import { formatDateVi, formatDateTimeVi } from '@/lib/utils';
import {
  FileCheck,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  CreditCard,
  UserCheck,
  Calendar,
  Upload,
  AlertTriangle,
  Eye,
  Trash2,
  Filter,
  DollarSign,
  Send,
  Lock,
  ArrowRight,
  ExternalLink,
  Info,
  ShieldCheck,
  ChevronRight,
  FileText,
  LayoutGrid,
  List,
  User,
  Plane,
  Layers,
  RotateCcw,
  Compass,
  Printer,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import PaymentProposalPrintModal from '@/components/PaymentProposalPrintModal';

const VIETNAM_BANKS = [
  'Vietcombank (VCB)',
  'MB Bank (MB)',
  'Techcombank (TCB)',
  'VietinBank (CTG)',
  'BIDV',
  'VPBank',
  'ACB',
  'Sacombank',
  'TPBank',
  'Agribank',
  'VIB',
  'MSB',
  'HD Bank',
  'Eximbank',
  'SeABank',
  'OCB',
  'LienVietPostBank (LPBank)',
  'SHB',
  'Khác (Nhập chi tiết bên dưới)'
];

export default function PaymentProposals() {
  const {
    paymentProposals = [],
    createPaymentProposal,
    approvePaymentProposalLeader,
    rejectPaymentProposalLeader,
    approvePaymentProposalAccounting,
    rejectPaymentProposalAccounting,
    deletePaymentProposal,
    currentRole,
    displayRole,
    customRoles,
    profilesList = [],
    tours = []
  } = useCRM();

  const { user, profile } = useAuth();

  // Role checks - Hỗ trợ TẤT CẢ các Leader trong công ty
  const isAgent = currentRole === 'agent';
  const LEADER_ROLES = ['sale_leader', 'marketing_leader', 'visa_leader', 'operator', 'hr', 'admin', 'bod'];
  const effectiveRole = currentRole || profile?.role || 'sale';
  const isLeader = LEADER_ROLES.includes(currentRole) || LEADER_ROLES.includes(profile?.role || '');
  const isAccountingOrAdmin = ['accounting', 'admin', 'bod'].includes(currentRole) || ['accounting', 'admin', 'bod'].includes(profile?.role || '');

  // Chuẩn hóa dữ liệu Đề nghị thanh toán
  const normalizedPaymentProposals = useMemo(() => {
    return paymentProposals.map(p => {
      const role = p.created_by_role || profilesList.find(prof => prof.id === p.created_by_id)?.role;
      const resolvedNote = p.note || (p as any).notes || (p as any).description || undefined;
      return {
        ...p,
        created_by_role: role,
        note: resolvedNote
      };
    });
  }, [paymentProposals, profilesList]);

  // Helper render huy hiệu vai trò chuẩn Tiếng Việt
  const renderRoleBadge = (roleKey?: string) => {
    const config = getRoleConfig(roleKey, customRoles);
    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${config.bg} ${config.color} ${config.border}`}>
        {config.label}
      </span>
    );
  };

  const location = useLocation();

  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ProposalStatus>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'individual' | 'tour' | 'general'>('all');
  const [viewScope, setViewScope] = useState<'all' | 'my'>('all');
  const [timeRange, setTimeRange] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (location.state?.searchTarget) {
      setSearchTerm(location.state.searchTarget);
      setStatusFilter('all');
      setTypeFilter('all');
      setTimeRange('all');
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<PaymentProposal | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProposalForPrint, setSelectedProposalForPrint] = useState<PaymentProposal | null>(null);

  // Approval Modals
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    proposal: PaymentProposal | null;
    type: 'leader_approve' | 'leader_reject' | 'accounting_approve' | 'accounting_reject' | 'delete';
  }>({ isOpen: false, proposal: null, type: 'leader_approve' });

  const [approvalNote, setApprovalNote] = useState('');
  const [proofFileUrl, setProofFileUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Proposal Form State
  const [formData, setFormData] = useState({
    title: '',
    proposal_type: 'individual' as 'individual' | 'tour' | 'general',
    amount: '',
    payment_method: 'Chuyển khoản' as 'Chuyển khoản' | 'Tiền mặt',
    bank_name: 'Vietcombank (VCB)',
    custom_bank: '',
    account_number: '',
    account_name: '',
    tour_id: '',
    due_date: '',
    file_url: '',
    note: ''
  });

  // Uploading status
  const [isUploading, setIsUploading] = useState(false);

  const getNextProposalCode = () => {
    const now = new Date();
    const mmStr = String(now.getMonth() + 1).padStart(2, '0');
    const yyyyStr = String(now.getFullYear());
    const mmyyyy = `${mmStr}${yyyyStr}`;
    const countThisMonth = paymentProposals.filter(p => {
      if (!p.code) return false;
      return p.code.includes(`DNTT-${mmyyyy}-`) || p.code.includes(`DNTT-${yyyyStr}${mmStr}`);
    }).length + 1;
    return `DNTT-${mmyyyy}-${String(countThisMonth).padStart(3, '0')}`;
  };

  // File Upload handler for attached invoice / quote / proof
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isProof = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const toastId = toast.loading('Đang tải file lên hệ thống...');

    try {
      const uploadData = new FormData();
      uploadData.append('file', file);
      uploadData.append('uploadType', 'payment_proposal');

      if (isProof && actionModal.proposal) {
        uploadData.append('proposalCode', actionModal.proposal.code);
        uploadData.append('proposalType', actionModal.proposal.proposal_type);
        if (actionModal.proposal.tour_code) {
          uploadData.append('tourCode', actionModal.proposal.tour_code);
        }
      } else {
        const nextCode = getNextProposalCode();
        uploadData.append('proposalCode', nextCode);
        uploadData.append('proposalType', formData.proposal_type);
        if (formData.proposal_type === 'tour') {
          const selectedTour = tours.find(t => t.id === formData.tour_id);
          if (selectedTour?.code) {
            uploadData.append('tourCode', selectedTour.code);
          }
        }
      }

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: uploadData
      });

      if (!res.ok) {
        const errText = await res.text();
        let errMsg = 'Tải file lên Google Drive thất bại';
        try {
          const errObj = JSON.parse(errText);
          if (errObj.error) errMsg = errObj.error;
        } catch {}
        throw new Error(errMsg);
      }

      const resText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(resText);
      } catch {
        throw new Error('Định dạng phản hồi từ máy chủ không đúng.');
      }

      const finalUrl = data.url || data.webViewLink;
      if (!finalUrl) {
        throw new Error('Không nhận được đường dẫn file Google Drive.');
      }

      if (isProof) {
        setProofFileUrl(finalUrl);
      } else {
        setFormData(prev => ({ ...prev, file_url: finalUrl }));
      }
      toast.success('Tải file lên Google Drive thành công!', { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Có lỗi xảy ra khi tải file. Vui lòng thử lại.', { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  // Create Proposal Submission
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Vui lòng nhập mục đích / nội dung thanh toán!');
      return;
    }

    const numAmount = Number(formData.amount.replace(/\D/g, ''));
    if (!numAmount || numAmount <= 0) {
      toast.error('Vui lòng nhập số tiền thanh toán hợp lệ (> 0 đ)!');
      return;
    }

    // MANDATORY TAKE NOTE VALIDATION FOR BANK TRANSFER
    if (formData.payment_method === 'Chuyển khoản') {
      const finalBank = formData.bank_name === 'Khác (Nhập chi tiết bên dưới)' ? formData.custom_bank.trim() : formData.bank_name;
      if (!finalBank) {
        toast.error('Bắt buộc nhập tên Ngân hàng khi chọn chuyển khoản!');
        return;
      }
      if (!formData.account_number.trim()) {
        toast.error('Bắt buộc nhập Số tài khoản thụ hưởng!');
        return;
      }
      if (!formData.account_name.trim()) {
        toast.error('Bắt buộc nhập Tên chủ tài khoản thụ hưởng!');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const selectedTour = tours.find(t => t.id === formData.tour_id);
      const finalBank = formData.payment_method === 'Chuyển khoản'
        ? (formData.bank_name === 'Khác (Nhập chi tiết bên dưới)' ? formData.custom_bank.trim() : formData.bank_name)
        : undefined;

      await createPaymentProposal({
        proposal_type: formData.proposal_type,
        title: formData.title.trim(),
        amount: numAmount,
        payment_method: formData.payment_method,
        bank_name: finalBank,
        account_number: formData.payment_method === 'Chuyển khoản' ? formData.account_number.trim() : undefined,
        account_name: formData.payment_method === 'Chuyển khoản' ? formData.account_name.trim().toUpperCase() : undefined,
        tour_id: formData.proposal_type === 'tour' ? formData.tour_id : undefined,
        tour_code: selectedTour?.code,
        tour_name: selectedTour?.name,
        due_date: formData.due_date || undefined,
        file_url: formData.file_url || undefined,
        note: formData.note.trim() || undefined,
        created_by_id: profile?.id || user?.id,
        created_by_name: profile?.full_name || user?.email || 'Nhân viên',
        created_by_role: profile?.role || displayRole || currentRole || 'sale'
      });

      toast.success('Đã gửi Đề nghị thanh toán thành công! Hồ sơ đang chờ Leader duyệt.');
      setShowCreateModal(false);
      // Reset form
      setFormData({
        title: '',
        proposal_type: 'individual',
        amount: '',
        payment_method: 'Chuyển khoản',
        bank_name: 'Vietcombank (VCB)',
        custom_bank: '',
        account_number: '',
        account_name: '',
        tour_id: '',
        due_date: '',
        file_url: '',
        note: ''
      });
    } catch (err: any) {
      console.error(err);
      toast.error('Lỗi khi tạo đề nghị thanh toán: ' + (err.message || 'Thử lại sau'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Action Executions (Leader Approve / Reject, Accounting Approve / Reject, Delete)
  const handleExecuteAction = async () => {
    if (!actionModal.proposal) return;
    const { id } = actionModal.proposal;
    const currentUserName = profile?.full_name || user?.email || 'Quản lý';

    setIsSubmitting(true);
    try {
      if (actionModal.type === 'leader_approve') {
        await approvePaymentProposalLeader(id, currentUserName, approvalNote);
        toast.success('Đã duyệt đề nghị thanh toán (Cấp Leader). Đã chuyển thông tin tới Kế toán!');
      } else if (actionModal.type === 'leader_reject') {
        await rejectPaymentProposalLeader(id, currentUserName, approvalNote);
        toast.error('Đã từ chối đề nghị thanh toán.');
      } else if (actionModal.type === 'accounting_approve') {
        await approvePaymentProposalAccounting(id, currentUserName, approvalNote, proofFileUrl);
        toast.success('Đã duyệt & hoàn tất chi tiền! Đã tự động tạo Phiếu chi trong sổ kế toán.');
      } else if (actionModal.type === 'accounting_reject') {
        await rejectPaymentProposalAccounting(id, currentUserName, approvalNote);
        toast.error('Kế toán đã từ chối chi đề nghị này.');
      } else if (actionModal.type === 'delete') {
        await deletePaymentProposal(id);
        toast.success('Đã xóa đề nghị thanh toán khỏi hệ thống.');
      }

      setActionModal({ isOpen: false, proposal: null, type: 'leader_approve' });
      setApprovalNote('');
      setProofFileUrl('');
    } catch (err: any) {
      console.error(err);
      toast.error('Thao tác thất bại: ' + (err.message || 'Thử lại'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered proposals calculation
  const filteredProposals = useMemo(() => {
    return normalizedPaymentProposals.filter(p => {
      // Role scope filter
      if (viewScope === 'my' && p.created_by_id && profile?.id && p.created_by_id !== profile.id && p.created_by_name !== profile.full_name) {
        return false;
      }

      // Search matching code, title, creator, bank account, tour code
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchCode = p.code?.toLowerCase().includes(term);
        const matchTitle = p.title?.toLowerCase().includes(term);
        const matchCreator = p.created_by_name?.toLowerCase().includes(term);
        const matchBank = p.bank_name?.toLowerCase().includes(term) || p.account_number?.includes(term) || p.account_name?.toLowerCase().includes(term);
        const matchTour = p.tour_code?.toLowerCase().includes(term) || p.tour_name?.toLowerCase().includes(term);
        const matchNote = p.note?.toLowerCase().includes(term);

        if (!matchCode && !matchTitle && !matchCreator && !matchBank && !matchTour && !matchNote) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;

      // Type filter
      if (typeFilter !== 'all' && p.proposal_type !== typeFilter) return false;

      // Time range filter
      if (timeRange !== 'all') {
        const dateStr = p.created_at;
        if (!isDateInTimeRange(dateStr, timeRange, startDate, endDate)) return false;
      }

      return true;
    });
  }, [normalizedPaymentProposals, viewScope, searchTerm, statusFilter, typeFilter, timeRange, startDate, endDate, profile]);

  // Statistics
  const stats = useMemo(() => {
    const totalCount = normalizedPaymentProposals.length;
    const totalAmount = normalizedPaymentProposals.reduce((sum, p) => sum + (p.amount || 0), 0);

    const pendingLeaderCount = normalizedPaymentProposals.filter(p => p.status === 'pending_leader').length;
    const pendingLeaderAmount = normalizedPaymentProposals.filter(p => p.status === 'pending_leader').reduce((sum, p) => sum + (p.amount || 0), 0);

    const pendingAccountingCount = normalizedPaymentProposals.filter(p => p.status === 'approved_leader').length;
    const pendingAccountingAmount = normalizedPaymentProposals.filter(p => p.status === 'approved_leader').reduce((sum, p) => sum + (p.amount || 0), 0);

    const paidCount = normalizedPaymentProposals.filter(p => p.status === 'approved_accounting').length;
    const paidAmount = normalizedPaymentProposals.filter(p => p.status === 'approved_accounting').reduce((sum, p) => sum + (p.amount || 0), 0);

    return {
      totalCount,
      totalAmount,
      pendingLeaderCount,
      pendingLeaderAmount,
      pendingAccountingCount,
      pendingAccountingAmount,
      paidCount,
      paidAmount
    };
  }, [normalizedPaymentProposals]);

  const kanbanColumns = [
    { id: 'pending_leader', title: '1. Chờ Leader duyệt', icon: Clock, bgHeader: 'bg-amber-500 text-white', borderCol: 'border-amber-200 bg-amber-50/20' },
    { id: 'approved_leader', title: '2. Chờ Kế toán chi', icon: Building2, bgHeader: 'bg-blue-600 text-white', borderCol: 'border-blue-200 bg-blue-50/20' },
    { id: 'approved_accounting', title: '3. Đã chi tiền', icon: CheckCircle2, bgHeader: 'bg-emerald-600 text-white', borderCol: 'border-emerald-200 bg-emerald-50/20' },
    { id: 'rejected', title: '4. Bị từ chối', icon: XCircle, bgHeader: 'bg-rose-600 text-white', borderCol: 'border-rose-200 bg-rose-50/20' },
  ];

  // Options for CustomSelect dropdowns
  const statusFilterOptions: SelectOption[] = [
    { value: 'all', label: 'Tất cả trạng thái', icon: <Filter className="w-3.5 h-3.5 text-slate-500" /> },
    { value: 'pending_leader', label: 'Chờ Leader duyệt', icon: <Clock className="w-3.5 h-3.5 text-amber-500" /> },
    { value: 'approved_leader', label: 'Chờ Kế toán chi', icon: <Building2 className="w-3.5 h-3.5 text-blue-500" /> },
    { value: 'approved_accounting', label: 'Đã chi tiền', icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> },
    { value: 'rejected_leader', label: 'Từ chối (Leader)', icon: <XCircle className="w-3.5 h-3.5 text-rose-500" /> },
    { value: 'rejected_accounting', label: 'Từ chối (Kế toán)', icon: <XCircle className="w-3.5 h-3.5 text-rose-500" /> },
  ];

  const typeFilterOptions: SelectOption[] = [
    { value: 'all', label: 'Tất cả loại chi phí', icon: <Layers className="w-3.5 h-3.5 text-slate-500" /> },
    { value: 'individual', label: 'Chi Lẻ / Cá nhân', icon: <User className="w-3.5 h-3.5 text-indigo-500" /> },
    { value: 'tour', label: 'Chi Theo Tour', icon: <Plane className="w-3.5 h-3.5 text-teal-500" /> },
    { value: 'general', label: 'Chi Phí Chung', icon: <Building2 className="w-3.5 h-3.5 text-purple-500" /> },
  ];

  const proposalTypeFormOptions: SelectOption[] = [
    { value: 'individual', label: 'Chi Lẻ / Cá nhân', icon: <User className="w-3.5 h-3.5 text-indigo-600" /> },
    { value: 'tour', label: 'Chi Theo Tour', icon: <Plane className="w-3.5 h-3.5 text-teal-600" /> },
    { value: 'general', label: 'Chi Phí Chung Khác', icon: <Building2 className="w-3.5 h-3.5 text-purple-600" /> },
  ];

  const tourFormOptions: SelectOption[] = useMemo(() => [
    { value: '', label: '-- Chọn Tour liên quan --', icon: <Compass className="w-3.5 h-3.5 text-slate-400" /> },
    ...tours.filter(t => t.tour_type !== 'visa').map(t => ({
      value: t.id,
      label: `[${t.code || 'Tour'}] ${t.name || ''} (${t.start_date ? formatDateVi(t.start_date) : ''})`,
      icon: <Plane className="w-3.5 h-3.5 text-teal-600" />
    }))
  ], [tours]);

  const bankOptions: SelectOption[] = useMemo(() => [
    ...VIETNAM_BANKS.map(b => ({
      value: b,
      label: b,
      icon: <Building2 className="w-3.5 h-3.5 text-blue-600" />
    }))
  ], []);

  // If Agent attempts access
  if (isAgent) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center font-sans">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-xs max-w-lg mx-auto">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mx-auto mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Quyền truy cập hạn chế</h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-6">
            Tính năng <strong>Đề nghị thanh toán</strong> dành cho cán bộ công nhân viên chính thức thuộc công ty.
            Đại lý (Agent) không có quyền gửi đề nghị thanh toán nội bộ.
          </p>
          <div className="text-xs text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200">
            Mọi thắc mắc về hoa hồng hoặc thanh toán Đại lý, vui lòng liên hệ trực tiếp Quản lý Sale hoặc Bộ phận Kế toán.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-[#0038A8] via-blue-900 to-indigo-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-blue-200 text-xs font-semibold uppercase tracking-wider mb-1">
              <FileCheck className="w-4 h-4 text-blue-300" />
              <span>Hệ thống Quản lý Nội bộ</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Đề Nghị Thanh Toán</h1>
            <p className="text-sm text-blue-100 mt-1 max-w-2xl">
              Lập đề nghị chi tiền, tạm ứng, thanh toán nhà cung cấp. Luồng duyệt 2 cấp trực quan: <strong>Trưởng bộ phận (Leader) duyệt</strong> &rarr; <strong>Kế toán chi tiền</strong>.
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white text-[#0038A8] hover:bg-blue-50 font-bold rounded-xl shadow-md transition-all duration-200 hover:scale-[1.02] cursor-pointer whitespace-nowrap self-start sm:self-auto"
          >
            <Plus className="w-5 h-5 text-[#0038A8]" />
            <span>Tạo Đề Nghị Mới</span>
          </button>
        </div>
      </div>

      {/* Overview Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-bold uppercase">Tổng đề nghị</span>
            <FileText className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-2xl font-black text-gray-900">{stats.totalCount}</div>
          <div className="text-xs font-semibold text-gray-500 mt-1">
            Tổng giá trị: <span className="font-bold text-gray-800">{stats.totalAmount.toLocaleString('vi-VN')} đ</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-amber-200 bg-amber-50/20 p-4 shadow-xs">
          <div className="flex items-center justify-between text-amber-700 mb-2">
            <span className="text-xs font-bold uppercase">Chờ Leader Duyệt</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600">{stats.pendingLeaderCount}</div>
          <div className="text-xs font-semibold text-amber-800 mt-1">
            Số tiền: <span className="font-bold">{stats.pendingLeaderAmount.toLocaleString('vi-VN')} đ</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-blue-200 bg-blue-50/20 p-4 shadow-xs">
          <div className="flex items-center justify-between text-blue-700 mb-2">
            <span className="text-xs font-bold uppercase">Chờ Kế Toán Chi</span>
            <UserCheck className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-blue-600">{stats.pendingAccountingCount}</div>
          <div className="text-xs font-semibold text-blue-800 mt-1">
            Số tiền: <span className="font-bold">{stats.pendingAccountingAmount.toLocaleString('vi-VN')} đ</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-emerald-200 bg-emerald-50/20 p-4 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700 mb-2">
            <span className="text-xs font-bold uppercase">Đã Duyệt & Chi Tiền</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{stats.paidCount}</div>
          <div className="text-xs font-semibold text-emerald-800 mt-1">
            Đã chi: <span className="font-bold">{stats.paidAmount.toLocaleString('vi-VN')} đ</span>
          </div>
        </div>
      </div>

      {/* Search & Filtering Controls */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo mã đề nghị, nội dung, người tạo, tài khoản ngân hàng, mã tour..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
              >
                Xóa
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs font-bold text-gray-600">
              <button
                onClick={() => setViewScope('all')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  viewScope === 'all' ? 'bg-white text-blue-700 shadow-xs' : 'hover:text-gray-900'
                }`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setViewScope('my')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  viewScope === 'my' ? 'bg-white text-blue-700 shadow-xs' : 'hover:text-gray-900'
                }`}
              >
                Của tôi
              </button>
            </div>

            <CustomSelect
              options={statusFilterOptions}
              value={statusFilter}
              onChange={(val) => setStatusFilter(val as any)}
              buttonClassName="bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs h-9 min-w-[170px]"
            />

            <CustomSelect
              options={typeFilterOptions}
              value={typeFilter}
              onChange={(val) => setTypeFilter(val as any)}
              buttonClassName="bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs h-9 min-w-[160px]"
            />

            <TimeRangeFilter
              value={timeRange}
              onChange={setTimeRange}
              startDate={startDate}
              onChangeStartDate={setStartDate}
              endDate={endDate}
              onChangeEndDate={setEndDate}
              prefixText="Tạo"
              alignPopover="right"
              selectClassName="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 cursor-pointer h-9"
            />

            {(statusFilter !== 'all' || typeFilter !== 'all' || viewScope !== 'all' || timeRange !== 'all' || searchTerm.trim() !== '') && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('all');
                  setTypeFilter('all');
                  setViewScope('all');
                  setTimeRange('all');
                  setStartDate('');
                  setEndDate('');
                  setSearchTerm('');
                }}
                className="h-9 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
                title="Xóa tất cả bộ lọc"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                <span className="hidden sm:inline">Xóa bộ lọc</span>
              </button>
            )}
            
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
                <span className="hidden sm:inline">Kanban</span>
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
                <span className="hidden sm:inline">Danh Sách</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table / Proposals List */}
      <>
        {filteredProposals.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="py-16 text-center px-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mx-auto mb-3">
                <FileCheck className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-gray-800">Chưa tìm thấy đề nghị thanh toán nào</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                {paymentProposals.length === 0
                  ? 'Hệ thống chưa có đề nghị thanh toán nào được tạo. Hãy bấm nút "Tạo Đề Nghị Mới" để gửi đề nghị đầu tiên.'
                  : 'Không có dữ liệu phù hợp với bộ lọc hiện tại. Thử thay đổi từ khóa hoặc bộ lọc.'}
              </p>
              {paymentProposals.length === 0 && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#0038A8] text-white font-bold text-xs rounded-xl shadow-xs hover:bg-blue-900 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tạo đề nghị ngay</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* VIEW MODE 1: COMPACT KANBAN BOARD */}
            {viewMode === 'kanban' && (
              <div className="w-full pb-6">
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
                  {kanbanColumns.map(col => {
                    const colProposals = filteredProposals.filter(p => {
                      if (col.id === 'rejected') return p.status === 'rejected_leader' || p.status === 'rejected_accounting';
                      return p.status === col.id;
                    });

                    const IconComponent = col.icon;

                    return (
                      <div key={col.id} className={`rounded-2xl border ${col.borderCol} p-3 flex flex-col space-y-3 h-full max-h-[80vh] min-w-0`}>
                        {/* COLUMN HEADER */}
                        <div className={`p-2.5 rounded-xl shadow-2xs flex items-center justify-between ${col.bgHeader}`}>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <IconComponent className="w-4 h-4 shrink-0" />
                            <h4 className="text-xs font-black uppercase tracking-wider line-clamp-1">{col.title}</h4>
                          </div>
                          <span className="text-xs font-extrabold bg-white/20 px-2 py-0.5 rounded-full shrink-0">
                            {colProposals.length}
                          </span>
                        </div>

                        {/* COMPACT PROPOSAL CARDS IN COLUMN */}
                        <div className="space-y-3 flex-1 overflow-y-auto pr-1 pb-1 scrollbar-thin">
                          {colProposals.length === 0 ? (
                            <div className="p-6 text-center text-slate-400 font-medium text-xs border border-dashed border-slate-300 rounded-xl bg-white/50">
                              Không có đề nghị nào
                            </div>
                          ) : (
                            colProposals.map(proposal => (
                              <div 
                                key={proposal.id} 
                                onClick={() => {
                                  setSelectedProposal(proposal);
                                  setShowDetailModal(true);
                                }}
                                className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs hover:border-blue-400 hover:shadow-md hover:-translate-y-0.5 transition-all space-y-2 cursor-pointer group flex flex-col"
                              >
                                <div className="flex justify-between items-start gap-2">
                                  <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 shrink-0">
                                    {proposal.code}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedProposalForPrint(proposal);
                                      }}
                                      className="p-1 hover:bg-blue-100 text-slate-400 hover:text-blue-700 rounded-md transition-colors"
                                      title="Xuất / In giấy đề nghị thanh toán"
                                    >
                                      <Printer className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="text-[10px] text-slate-500 whitespace-nowrap">{formatDateVi(proposal.created_at)}</span>
                                  </div>
                                </div>
                                <h4 className="text-xs font-bold text-slate-800 line-clamp-2 leading-snug" title={proposal.title}>{proposal.title}</h4>
                                {proposal.note && (
                                  <div className="text-[11px] text-slate-600 bg-amber-50/70 border border-amber-200/70 rounded-lg px-2 py-1 line-clamp-2 whitespace-pre-line" title={proposal.note}>
                                    <span className="font-semibold text-amber-800">Ghi chú: </span>{proposal.note}
                                  </div>
                                )}
                                
                                <div className="pt-1 mt-auto">
                                  <div className="text-sm font-black text-rose-600 mb-1.5">
                                    {proposal.amount.toLocaleString('vi-VN')} đ
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <div className="text-[10px] font-medium text-slate-600 flex items-center gap-1 max-w-[70%]">
                                      <UserCheck className="w-3 h-3 text-slate-400 shrink-0" />
                                      <span className="truncate" title={proposal.created_by_name}>{proposal.created_by_name}</span>
                                    </div>
                                    <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase border ${
                                      proposal.proposal_type === 'individual' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                      proposal.proposal_type === 'tour' ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                                    }`}>
                                      {proposal.proposal_type === 'tour' ? (
                                        <>
                                          <Plane className="w-2.5 h-2.5 text-teal-600" />
                                          <span>Tour</span>
                                        </>
                                      ) : proposal.proposal_type === 'general' ? (
                                        <>
                                          <Building2 className="w-2.5 h-2.5 text-slate-600" />
                                          <span>Chung</span>
                                        </>
                                      ) : (
                                        <>
                                          <User className="w-2.5 h-2.5 text-indigo-600" />
                                          <span>Lẻ</span>
                                        </>
                                      )}
                                    </span>
                                  </div>

                                  {/* CỤM NÚT DUYỆT TRỰC TIẾP TRÊN KANBAN CARD */}
                                  {isLeader && proposal.status === 'pending_leader' && (
                                    <div className="pt-2 mt-2 border-t border-slate-100 flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        title="Leader Duyệt Đề Nghị"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActionModal({ isOpen: true, proposal, type: 'leader_approve' });
                                        }}
                                        className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] shadow-2xs flex items-center justify-center gap-1 transition-all cursor-pointer"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>Duyệt</span>
                                      </button>
                                      <button
                                        type="button"
                                        title="Leader Từ Chối"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActionModal({ isOpen: true, proposal, type: 'leader_reject' });
                                        }}
                                        className="py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg text-[11px] border border-rose-200 transition-all cursor-pointer flex items-center justify-center"
                                      >
                                        <XCircle className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}

                                  {isAccountingOrAdmin && proposal.status === 'approved_leader' && (
                                    <div className="pt-2 mt-2 border-t border-slate-100 flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        title="Kế toán Duyệt & Chi Tiền"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActionModal({ isOpen: true, proposal, type: 'accounting_approve' });
                                        }}
                                        className="flex-1 py-1.5 px-2 bg-[#0038A8] hover:bg-blue-900 text-white font-bold rounded-lg text-[11px] shadow-2xs flex items-center justify-center gap-1 transition-all cursor-pointer"
                                      >
                                        <DollarSign className="w-3.5 h-3.5" />
                                        <span>Chi tiền</span>
                                      </button>
                                      <button
                                        type="button"
                                        title="Kế toán Từ chối"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActionModal({ isOpen: true, proposal, type: 'accounting_reject' });
                                        }}
                                        className="py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg text-[11px] border border-rose-200 transition-all cursor-pointer flex items-center justify-center"
                                      >
                                        <XCircle className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))
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
              <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Mã & Ngày tạo</th>
                  <th className="py-3 px-4">Mục đích / Nội dung</th>
                  <th className="py-3 px-4">Người đề nghị</th>
                  <th className="py-3 px-4 text-right">Số tiền (VND)</th>
                  <th className="py-3 px-4">Hình thức & Ngân hàng</th>
                  <th className="py-3 px-4 text-center">Tiến trình duyệt</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                {filteredProposals.map((p) => {
                  // Badges status
                  const isLeaderPending = p.leader_status === 'pending';
                  const isLeaderApproved = p.leader_status === 'approved';
                  const isLeaderRejected = p.leader_status === 'rejected';

                  const isAccPending = p.accounting_status === 'pending';
                  const isAccApproved = p.accounting_status === 'approved';
                  const isAccRejected = p.accounting_status === 'rejected';

                  return (
                    <tr key={p.id} className="hover:bg-blue-50/40 transition-colors">
                      {/* Code & Created Date */}
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-900 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{p.code}</span>
                        </div>
                        <div className="text-[10px] font-sans text-gray-400 font-normal">
                          {p.created_at ? formatDateVi(p.created_at) : ''}
                        </div>
                      </td>

                      {/* Title & Type */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-bold text-gray-900 line-clamp-2">{p.title}</div>
                        {p.note && (
                          <div className="text-[11px] text-amber-900 bg-amber-50/80 border border-amber-200/70 rounded-lg px-2 py-1 mt-1 line-clamp-2 whitespace-pre-line" title={p.note}>
                            <span className="font-semibold">Ghi chú: </span>{p.note}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            p.proposal_type === 'tour'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : p.proposal_type === 'general'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-gray-100 text-gray-700 border-gray-200'
                          }`}>
                            {p.proposal_type === 'tour' ? (
                              <>
                                <Plane className="w-3 h-3 text-indigo-600" />
                                <span>Theo Tour</span>
                              </>
                            ) : p.proposal_type === 'general' ? (
                              <>
                                <Building2 className="w-3 h-3 text-purple-600" />
                                <span>Chi Chung</span>
                              </>
                            ) : (
                              <>
                                <User className="w-3 h-3 text-gray-600" />
                                <span>Chi Lẻ</span>
                              </>
                            )}
                          </span>
                          {p.tour_code && (
                            <span className="text-[10px] font-mono bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded border border-blue-200 font-bold truncate max-w-[120px]">
                              {p.tour_code}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Proposer */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-gray-800">{p.created_by_name}</div>
                        <div className="mt-1">{renderRoleBadge(p.created_by_role)}</div>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="text-sm font-black text-rose-600">
                          {p.amount.toLocaleString('vi-VN')} đ
                        </div>
                        {p.due_date && (
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            Hạn: {formatDateVi(p.due_date)}
                          </div>
                        )}
                      </td>

                      {/* Payment Method & Bank */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-800 flex items-center gap-1">
                          {p.payment_method === 'Chuyển khoản' ? (
                            <CreditCard className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          ) : (
                            <DollarSign className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          )}
                          <span>{p.payment_method}</span>
                        </div>
                        {p.payment_method === 'Chuyển khoản' && (
                          <div className="text-[11px] text-gray-600 mt-0.5 space-y-0.5 bg-gray-50 p-1.5 rounded-lg border border-gray-100">
                            <div className="font-semibold text-gray-900">{p.bank_name}</div>
                            <div className="font-mono text-blue-700 font-bold">STK: {p.account_number}</div>
                            <div className="text-gray-500 uppercase text-[10px]">Chủ TK: {p.account_name}</div>
                          </div>
                        )}
                      </td>

                      {/* Workflow Stepper / Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col items-center gap-1.5">
                          {/* Step 1: Leader */}
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <span className="text-gray-400 font-bold">Leader:</span>
                            {isLeaderPending && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-300 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Chờ duyệt
                              </span>
                            )}
                            {isLeaderApproved && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đã duyệt
                              </span>
                            )}
                            {isLeaderRejected && (
                              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold border border-rose-300 flex items-center gap-1">
                                <XCircle className="w-3 h-3 text-rose-600" /> Từ chối
                              </span>
                            )}
                          </div>

                          {/* Arrow down */}
                          <ChevronRight className="w-3 h-3 text-gray-300 rotate-90" />

                          {/* Step 2: Accounting */}
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <span className="text-gray-400 font-bold">Kế toán:</span>
                            {isLeaderApproved && isAccPending && (
                              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold border border-blue-300 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Chờ chi
                              </span>
                            )}
                            {isAccApproved && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold shadow-xs flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-white" /> Đã chi tiền
                              </span>
                            )}
                            {isAccRejected && (
                              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold border border-rose-300 flex items-center gap-1">
                                <XCircle className="w-3 h-3 text-rose-600" /> Từ chối
                              </span>
                            )}
                            {isLeaderPending && (
                              <span className="text-[10px] text-gray-400 italic">Chưa tới lượt</span>
                            )}
                            {isLeaderRejected && (
                              <span className="text-[10px] text-gray-400 italic">Đã dừng</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Actions Column */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Leader Approve / Reject Buttons */}
                          {isLeader && isLeaderPending && (
                            <div className="flex items-center gap-1 bg-amber-50 p-1 rounded-xl border border-amber-200">
                              <button
                                title="Leader Duyệt Đề Nghị"
                                onClick={() => setActionModal({ isOpen: true, proposal: p, type: 'leader_approve' })}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] shadow-xs flex items-center gap-1 transition-colors"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Leader Duyệt</span>
                              </button>
                              <button
                                title="Leader Từ Chối"
                                onClick={() => setActionModal({ isOpen: true, proposal: p, type: 'leader_reject' })}
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg text-[11px] border border-rose-200 transition-colors"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          {/* Accounting Approve / Reject Buttons */}
                          {isAccountingOrAdmin && p.status === 'approved_leader' && (
                            <div className="flex items-center gap-1 bg-blue-50 p-1 rounded-xl border border-blue-200">
                              <button
                                title="Kế toán Duyệt & Chi Tiền"
                                onClick={() => setActionModal({ isOpen: true, proposal: p, type: 'accounting_approve' })}
                                className="px-2.5 py-1 bg-[#0038A8] hover:bg-blue-900 text-white font-bold rounded-lg text-[11px] shadow-xs flex items-center gap-1 transition-colors"
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                                <span>Kế toán Chi tiền</span>
                              </button>
                              <button
                                title="Kế toán Từ chối"
                                onClick={() => setActionModal({ isOpen: true, proposal: p, type: 'accounting_reject' })}
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg text-[11px] border border-rose-200 transition-colors"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          {/* Export / Print Proposal */}
                          <button
                            onClick={() => setSelectedProposalForPrint(p)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
                            title="Xuất / In giấy đề nghị thanh toán"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Detail View */}
                          <button
                            onClick={() => {
                              setSelectedProposal(p);
                              setShowDetailModal(true);
                            }}
                            className="p-1.5 text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors border border-gray-200"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Delete Button (Creator if pending, or Admin/BOD) */}
                          {(isLeader || p.created_by_id === profile?.id) && (
                            <button
                              onClick={() => setActionModal({ isOpen: true, proposal: p, type: 'delete' })}
                              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Xóa đề nghị"
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
          </>
        )}
      </>

      {/* CREATE PROPOSAL MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-2xl my-8 overflow-hidden font-sans"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-[#0038A8] to-blue-900 px-6 py-4 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-blue-200" />
                  <h2 className="text-lg font-bold">Tạo Đề Nghị Thanh Toán Mới</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                  title="Đóng"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1">
                    Mục đích / Nội dung thanh toán <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Chi thanh toán tiền vé máy bay Thái Lan đoàn 15/08..."
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>

                {/* Proposal Type & Tour */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1">
                      Loại chi phí
                    </label>
                    <CustomSelect
                      options={proposalTypeFormOptions}
                      value={formData.proposal_type}
                      onChange={(val) => setFormData(prev => ({ ...prev, proposal_type: val as any }))}
                      buttonClassName="w-full h-10 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  {formData.proposal_type === 'tour' && (
                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1">
                        Chọn Tour liên quan <span className="text-rose-500">*</span>
                      </label>
                      <CustomSelect
                        options={tourFormOptions}
                        value={formData.tour_id}
                        onChange={(val) => setFormData(prev => ({ ...prev, tour_id: val }))}
                        placeholder="-- Chọn Tour liên quan --"
                        buttonClassName="w-full h-10 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  )}
                </div>

                {/* Amount & Payment Method */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1">
                      Số tiền đề nghị (VND) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="0"
                      value={formData.amount ? Number(formData.amount.replace(/\D/g, '')).toLocaleString('vi-VN') : ''}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '');
                        setFormData(prev => ({ ...prev, amount: raw }));
                      }}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-black text-rose-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1">
                      Hình thức thanh toán <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, payment_method: 'Chuyển khoản' }))}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                          formData.payment_method === 'Chuyển khoản'
                            ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-xs'
                            : 'bg-gray-50 border-gray-200 text-gray-600'
                        }`}
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>Chuyển khoản</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, payment_method: 'Tiền mặt' }))}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                          formData.payment_method === 'Tiền mặt'
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs'
                            : 'bg-gray-50 border-gray-200 text-gray-600'
                        }`}
                      >
                        <DollarSign className="w-4 h-4" />
                        <span>Tiền mặt</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* TRANSFER BANK DETAILS (MANDATORY REQUIREMENT) */}
                {formData.payment_method === 'Chuyển khoản' && (
                  <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-200 space-y-3">
                    <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      <span>Thông tin tài khoản nhận tiền chuyển khoản (Bắt buộc)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          Ngân hàng thụ hưởng <span className="text-rose-500">*</span>
                        </label>
                        <CustomSelect
                          options={bankOptions}
                          value={formData.bank_name}
                          onChange={(val) => setFormData(prev => ({ ...prev, bank_name: val }))}
                          buttonClassName="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>

                      {formData.bank_name === 'Khác (Nhập chi tiết bên dưới)' && (
                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 mb-1">
                            Tên Ngân hàng khác <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Nhập tên ngân hàng..."
                            value={formData.custom_bank}
                            onChange={(e) => setFormData(prev => ({ ...prev, custom_bank: e.target.value }))}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-800"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          Số tài khoản thụ hưởng <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="VD: 1029384756..."
                          value={formData.account_number}
                          onChange={(e) => setFormData(prev => ({ ...prev, account_number: e.target.value }))}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-mono font-bold text-blue-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          Tên chủ tài khoản thụ hưởng <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="VD: NGUYEN VAN A..."
                          value={formData.account_name}
                          onChange={(e) => setFormData(prev => ({ ...prev, account_name: e.target.value.toUpperCase() }))}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-900 uppercase"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Due Date & Proof Attachment */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1">
                      Hạn thanh toán dự kiến
                    </label>
                    <DatePicker
                      value={formData.due_date}
                      onChange={(d) => setFormData(prev => ({ ...prev, due_date: d }))}
                      placeholder="Chọn hạn cần thanh toán..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1">
                      Hóa đơn / Báo giá đính kèm
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="flex-1 cursor-pointer bg-gray-50 hover:bg-gray-100 border border-dashed border-gray-300 rounded-xl p-2.5 text-center text-xs text-gray-600 font-bold transition-colors">
                        <Upload className="w-4 h-4 mx-auto mb-1 text-gray-400" />
                        <span>{isUploading ? 'Đang tải file...' : 'Tải hóa đơn/báo giá'}</span>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={(e) => handleFileUpload(e, false)}
                          disabled={isUploading}
                          className="hidden"
                        />
                      </label>
                    </div>
                    {formData.file_url && (
                      <div className="text-[10px] text-emerald-700 font-bold mt-1 flex items-center gap-1 truncate">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span className="truncate">Đã đính kèm: {formData.file_url}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Detailed Note */}
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1">
                    Ghi chú chi tiết / Giải trình
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ghi rõ lý do chi, thông tin nhà cung cấp hoặc các điều khoản thanh toán liên quan..."
                    value={formData.note}
                    onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>

                {/* Submit Actions */}
                <div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || isUploading}
                    className="px-6 py-2.5 bg-[#0038A8] hover:bg-blue-900 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>Gửi Đề Nghị Thanh Toán</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* APPROVAL & ACTION CONFIRMATION MODAL */}
      <AnimatePresence>
        {actionModal.isOpen && actionModal.proposal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-md p-6 font-sans space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl ${
                  actionModal.type.includes('approve') ? 'bg-emerald-100 text-emerald-700' :
                  actionModal.type.includes('reject') ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    {actionModal.type === 'leader_approve' && 'Xác Nhận Leader Duyệt Đề Nghị'}
                    {actionModal.type === 'leader_reject' && 'Leader Từ Chối Đề Nghị Thanh Toán'}
                    {actionModal.type === 'accounting_approve' && 'Kế Toán Duyệt & Thực Hiện Chi Tiền'}
                    {actionModal.type === 'accounting_reject' && 'Kế Toán Từ Chối Chi Tiền'}
                    {actionModal.type === 'delete' && 'Xác Nhận Xóa Đề Nghị Thanh Toán'}
                  </h3>
                  <p className="text-xs text-gray-500 font-mono">
                    Mã: {actionModal.proposal.code}
                  </p>
                </div>
              </div>

              {/* Proposal Summary Box */}
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 text-xs space-y-1">
                <div className="font-bold text-gray-900">{actionModal.proposal.title}</div>
                <div className="text-rose-600 font-black text-sm">
                  {actionModal.proposal.amount.toLocaleString('vi-VN')} đ
                </div>
                <div className="text-gray-600">
                  Người đề nghị: <strong className="text-gray-800">{actionModal.proposal.created_by_name}</strong> ({getRoleConfig(actionModal.proposal.created_by_role, customRoles).label})
                </div>
                {actionModal.proposal.note && (
                  <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-amber-950 bg-amber-50/80 p-2.5 rounded-lg border border-amber-200/60 whitespace-pre-wrap">
                    <div className="font-bold text-amber-800 text-[11px] mb-0.5 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Ghi chú chi tiết / Giải trình:</span>
                    </div>
                    <div className="text-gray-800 leading-relaxed">{actionModal.proposal.note}</div>
                  </div>
                )}
                {actionModal.proposal.payment_method === 'Chuyển khoản' && (
                  <div className="mt-2 pt-2 border-t border-gray-200 text-[11px] text-blue-900 font-semibold bg-blue-50/50 p-2 rounded-lg">
                    <div>Ngân hàng: {actionModal.proposal.bank_name}</div>
                    <div>STK: {actionModal.proposal.account_number}</div>
                    <div>Chủ TK: {actionModal.proposal.account_name}</div>
                  </div>
                )}
              </div>

              {/* Action specific fields */}
              {actionModal.type === 'accounting_approve' && (
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1">
                    Đính kèm Ủy nhiệm chi (UNC) / Biên lai chuyển tiền
                  </label>
                  <label className="block bg-gray-50 hover:bg-gray-100 border border-dashed border-gray-300 rounded-xl p-2.5 text-center text-xs text-gray-600 font-bold cursor-pointer">
                    <Upload className="w-4 h-4 mx-auto mb-1 text-gray-400" />
                    <span>{isUploading ? 'Đang tải file...' : 'Tải UNC / Ảnh chuyển khoản'}</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFileUpload(e, true)}
                      className="hidden"
                    />
                  </label>
                  {proofFileUrl && (
                    <div className="text-[10px] text-emerald-700 font-bold mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Đã tải đính kèm thành công</span>
                    </div>
                  )}
                </div>
              )}

              {actionModal.type !== 'delete' && (
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1">
                    {actionModal.type.includes('reject') ? 'Lý do từ chối (Bắt buộc)' : 'Ghi chú / Nhận xét'}
                  </label>
                  <textarea
                    rows={2}
                    placeholder={actionModal.type.includes('reject') ? 'Ghi rõ lý do không đồng ý duyệt...' : 'Ghi chú thêm...'}
                    value={approvalNote}
                    onChange={(e) => setApprovalNote(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActionModal({ isOpen: false, proposal: null, type: 'leader_approve' })}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors"
                >
                  Hủy
                </button>

                <button
                  type="button"
                  disabled={isSubmitting || (actionModal.type.includes('reject') && !approvalNote.trim())}
                  onClick={handleExecuteAction}
                  className={`px-5 py-2 font-bold text-xs text-white rounded-xl shadow-md transition-all ${
                    actionModal.type.includes('approve') ? 'bg-emerald-600 hover:bg-emerald-700' :
                    actionModal.type.includes('reject') ? 'bg-rose-600 hover:bg-rose-700' : 'bg-gray-800 hover:bg-black'
                  } disabled:opacity-50`}
                >
                  {isSubmitting ? 'Đang xử lý...' : 'Xác nhận'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DETAIL MODAL */}
      <AnimatePresence>
        {showDetailModal && selectedProposal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-xl my-8 overflow-hidden font-sans"
            >
              <div className="bg-gradient-to-r from-[#0038A8] to-blue-900 px-6 py-4 text-white flex items-center justify-between">
                <div>
                  <div className="text-xs text-blue-200 font-mono">Chi tiết đề nghị</div>
                  <h2 className="text-lg font-bold">{selectedProposal.code}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedProposalForPrint(selectedProposal)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer border border-white/20"
                    title="Xuất / In giấy đề nghị"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Xuất mẫu in</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDetailModal(false)}
                    className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                    title="Đóng"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs text-gray-800">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2">
                  <div className="text-sm font-bold text-gray-900">{selectedProposal.title}</div>
                  <div className="text-lg font-black text-rose-600">
                    {selectedProposal.amount.toLocaleString('vi-VN')} đ
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-gray-600 pt-2 border-t border-gray-200">
                    <div>Người đề nghị: <strong>{selectedProposal.created_by_name}</strong></div>
                    <div className="flex items-center gap-1.5"><span>Vai trò:</span> {renderRoleBadge(selectedProposal.created_by_role)}</div>
                    <div>Hình thức: <strong>{selectedProposal.payment_method}</strong></div>
                    <div>Ngày tạo: <strong>{selectedProposal.created_at ? formatDateTimeVi(selectedProposal.created_at) : ''}</strong></div>
                    {selectedProposal.tour_code && (
                      <div className="col-span-2">Tour liên kết: <strong className="text-indigo-700 font-mono">{selectedProposal.tour_code}</strong> {selectedProposal.tour_name ? `- ${selectedProposal.tour_name}` : ''}</div>
                    )}
                    {selectedProposal.due_date && (
                      <div className="col-span-2">Hạn thanh toán dự kiến: <strong className="text-rose-600">{formatDateVi(selectedProposal.due_date)}</strong></div>
                    )}
                  </div>
                </div>

                {/* Ghi chú chi tiết / Giải trình */}
                <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200/80 space-y-1.5">
                  <div className="font-bold text-amber-900 flex items-center gap-1.5 text-xs">
                    <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Ghi chú chi tiết / Giải trình</span>
                  </div>
                  {selectedProposal.note ? (
                    <div className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed bg-white/80 p-3 rounded-lg border border-amber-100">
                      {selectedProposal.note}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic">
                      Không có ghi chú chi tiết
                    </div>
                  )}
                </div>

                {selectedProposal.payment_method === 'Chuyển khoản' && (
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 space-y-1 text-blue-900">
                    <div className="font-bold flex items-center gap-1.5 mb-1 text-xs">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      <span>Thông tin Chuyển Khoản</span>
                    </div>
                    <div>Ngân hàng: <strong>{selectedProposal.bank_name}</strong></div>
                    <div>Số tài khoản: <strong className="font-mono text-blue-800">{selectedProposal.account_number}</strong></div>
                    <div>Tên chủ tài khoản: <strong className="uppercase">{selectedProposal.account_name}</strong></div>
                  </div>
                )}

                {/* Audit Trail / History Workflow */}
                <div className="space-y-3 pt-2">
                  <h3 className="font-bold text-gray-900 text-xs uppercase tracking-wider">Lịch sử duyệt 2 cấp</h3>

                  {/* Leader Step */}
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      selectedProposal.leader_status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                      selectedProposal.leader_status === 'rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div className="flex-1 space-y-0.5">
                      <div className="font-bold text-gray-900">Cấp 1: Trưởng bộ phận (Leader)</div>
                      <div className="text-gray-600">
                        Trạng thái: {' '}
                        <strong className={
                          selectedProposal.leader_status === 'approved' ? 'text-emerald-700' :
                          selectedProposal.leader_status === 'rejected' ? 'text-rose-700' : 'text-amber-700'
                        }>
                          {selectedProposal.leader_status === 'approved' ? 'Đã duyệt' : selectedProposal.leader_status === 'rejected' ? 'Đã từ chối' : 'Đang chờ duyệt'}
                        </strong>
                      </div>
                      {selectedProposal.leader_approved_by && (
                        <div className="text-[11px] text-gray-500">
                          Người duyệt: <strong>{selectedProposal.leader_approved_by}</strong> ({selectedProposal.leader_approved_at ? new Date(selectedProposal.leader_approved_at).toLocaleString('vi-VN') : ''})
                        </div>
                      )}
                      {selectedProposal.leader_note && (
                        <div className="text-[11px] text-gray-600 bg-white p-2 rounded border border-gray-200 mt-1">
                          Ghi chú: {selectedProposal.leader_note}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Accounting Step */}
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      selectedProposal.accounting_status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                      selectedProposal.accounting_status === 'rejected' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div className="flex-1 space-y-0.5">
                      <div className="font-bold text-gray-900">Cấp 2: Bộ phận Kế toán</div>
                      <div className="text-gray-600">
                        Trạng thái: {' '}
                        <strong className={
                          selectedProposal.accounting_status === 'approved' ? 'text-emerald-700' :
                          selectedProposal.accounting_status === 'rejected' ? 'text-rose-700' : 'text-blue-700'
                        }>
                          {selectedProposal.accounting_status === 'approved' ? 'Đã chi tiền' : selectedProposal.accounting_status === 'rejected' ? 'Đã từ chối' : 'Đang chờ chi'}
                        </strong>
                      </div>
                      {selectedProposal.accounting_approved_by && (
                        <div className="text-[11px] text-gray-500">
                          Kế toán xử lý: <strong>{selectedProposal.accounting_approved_by}</strong> ({selectedProposal.accounting_approved_at ? new Date(selectedProposal.accounting_approved_at).toLocaleString('vi-VN') : ''})
                        </div>
                      )}
                      {selectedProposal.accounting_note && (
                        <div className="text-[11px] text-gray-600 bg-white p-2 rounded border border-gray-200 mt-1">
                          Ghi chú Kế toán: {selectedProposal.accounting_note}
                        </div>
                      )}
                      {selectedProposal.accounting_proof_url && (
                        <a
                          href={selectedProposal.accounting_proof_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-blue-700 font-bold hover:underline mt-1"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Xem Ủy Nhiệm Chi / Biên lai chi tiền</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Attachments */}
                {selectedProposal.file_url && (
                  <div className="pt-2">
                    <h3 className="font-bold text-gray-900 text-xs mb-1">Hóa đơn / Chứng từ đính kèm ban đầu</h3>
                    <a
                      href={selectedProposal.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-blue-700 font-bold bg-blue-50 px-3 py-2 rounded-xl border border-blue-200 hover:bg-blue-100 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Mở xem file đính kèm</span>
                    </a>
                  </div>
                )}
              </div>

              {/* DETAIL MODAL ACTION FOOTER */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
                <div>
                  <button
                    type="button"
                    onClick={() => setShowDetailModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/70 border border-slate-300 transition-colors cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {/* Leader actions */}
                  {isLeader && selectedProposal.status === 'pending_leader' && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDetailModal(false);
                          setActionModal({ isOpen: true, proposal: selectedProposal, type: 'leader_reject' });
                        }}
                        className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Leader Từ chối</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDetailModal(false);
                          setActionModal({ isOpen: true, proposal: selectedProposal, type: 'leader_approve' });
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Leader Duyệt Đề Nghị</span>
                      </button>
                    </>
                  )}

                  {/* Accounting actions */}
                  {isAccountingOrAdmin && selectedProposal.status === 'approved_leader' && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDetailModal(false);
                          setActionModal({ isOpen: true, proposal: selectedProposal, type: 'accounting_reject' });
                        }}
                        className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Kế toán Từ chối</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDetailModal(false);
                          setActionModal({ isOpen: true, proposal: selectedProposal, type: 'accounting_approve' });
                        }}
                        className="px-4 py-2 bg-[#0038A8] hover:bg-blue-900 text-white font-bold rounded-xl text-xs shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <DollarSign className="w-4 h-4" />
                        <span>Kế toán Chi Tiền</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PRINT PREVIEW MODAL */}
      <PaymentProposalPrintModal
        isOpen={!!selectedProposalForPrint}
        onClose={() => setSelectedProposalForPrint(null)}
        proposal={selectedProposalForPrint}
      />
    </div>
  );
}
