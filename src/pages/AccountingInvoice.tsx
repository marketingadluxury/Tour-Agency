import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { useCRM } from '@/context/CRMContext';
import { useAuth } from '@/context/AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { motion } from 'motion/react';
import { Order, Invoice } from '@/types';
import { parseRefundInfo, safeFetchApi } from '@/lib/utils';
import { CustomSelect, SelectOption } from '@/components/CustomSelect';
import {
  Receipt,
  Check,
  X,
  FileText,
  Filter,
  DollarSign,
  Calendar,
  ExternalLink,
  Clock,
  AlertCircle,
  TrendingUp,
  User,
  Hash,
  ChevronDown,
  ChevronUp,
  Upload,
  Search,
  Folder,
  FolderOpen,
  FileCheck,
  Briefcase,
  Info,
  Copy,
  Eye,
  Coins,
  CheckCircle2,
  Trash2,
  Image as ImageIcon,
  Compass,
  ChevronRight,
  Plus,
  Grid,
  List
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { canApproveReceipt } from '@/utils/permissionUtils';

export default function AccountingInvoice() {
  const { 
    orders, 
    tours, 
    passengers, 
    updateInvoiceStatus,
    invoices,
    approveInvoiceReceipt,
    rejectInvoiceReceipt,
    createInvoiceReceipt,
    uploadInvoiceProof,
    currentRole
  } = useCRM();
  
  const { user, profile } = useAuth();
  const verifierName = profile?.full_name || (currentRole === 'bod' ? 'Ban Giám Đốc' : currentRole === 'admin' ? 'Quản trị viên' : 'Kế toán');
  const isAccountantOrAdmin = canApproveReceipt(currentRole);

  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});

  useEffect(() => {
    async function fetchProfilesMap() {
      if (isSupabaseConfigured()) {
        try {
          const { data } = await supabase.from('profiles').select('id, full_name, phone');
          if (data && data.length > 0) {
            const map: Record<string, string> = {};
            data.forEach((p: any) => {
              if (p.id) {
                map[p.id] = p.full_name || p.phone || 'Thành viên CRM';
              }
            });
            setProfilesMap(map);
          }
        } catch (e) {
          console.error('Lỗi nạp danh sách thành viên:', e);
        }
      }
    }
    fetchProfilesMap();
  }, []);

  const resolveCreatorName = useCallback((createdBy?: string | null, orderId?: string | null) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!createdBy || createdBy.trim() === '') {
      if (orderId && Array.isArray(orders)) {
        const matchedOrder = orders.find(o => o.id === orderId);
        if (matchedOrder?.created_by && !uuidRegex.test(matchedOrder.created_by)) {
          return matchedOrder.created_by;
        }
        if (matchedOrder?.booker_name) {
          return matchedOrder.booker_name;
        }
      }
      return profile?.full_name || 'Hệ thống';
    }

    if (uuidRegex.test(createdBy)) {
      if (profilesMap[createdBy]) {
        return profilesMap[createdBy];
      }
      if ((profile?.id && createdBy === profile.id) || (user?.id && createdBy === user.id)) {
        return profile?.full_name || profile?.phone || user?.email || 'Quản trị viên';
      }
      if (orderId && Array.isArray(orders)) {
        const matchedOrder = orders.find(o => o.id === orderId);
        if (matchedOrder?.created_by && !uuidRegex.test(matchedOrder.created_by)) {
          return matchedOrder.created_by;
        }
        if (matchedOrder?.booker_name) {
          return matchedOrder.booker_name;
        }
      }
      return profile?.full_name || 'Nhân viên CRM';
    }

    return createdBy;
  }, [profilesMap, orders, profile, user]);

  const [activeTab, setActiveTab] = useState<'receipts' | 'vat' | 'payments'>(
    canApproveReceipt(currentRole) ? 'receipts' : 'payments'
  );
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [filterInvoice, setFilterInvoice] = useState<string>('pending');
  const [filterReceiptStatus, setFilterReceiptStatus] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

  // State quản lý việc xác nhận duyệt phiếu thu
  const [approveTarget, setApproveTarget] = useState<{ id: string; amount: number; orderCode: string } | null>(null);
  
  // State quản lý việc từ chối phiếu thu
  const [rejectTarget, setRejectTarget] = useState<{ id: string; orderCode: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('Sai thông tin số tiền / hóa đơn không khớp');

  // State quản lý việc phê duyệt và từ chối phiếu chi (payments)
  const [approvePaymentTarget, setApprovePaymentTarget] = useState<Invoice | null>(null);
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [paymentFileName, setPaymentFileName] = useState<string>('');
  const [isUploadingPaymentFile, setIsUploadingPaymentFile] = useState(false);
  const [uploadProofTarget, setUploadProofTarget] = useState<Invoice | null>(null);
  const [rejectPaymentTarget, setRejectPaymentTarget] = useState<Invoice | null>(null);
  const [rejectPaymentReason, setRejectPaymentReason] = useState('Đề xuất chi chưa chính xác hoặc thiếu chứng từ đối chiếu');

  // State quản lý việc xác nhận xuất hóa đơn VAT đỏ
  const [vatTarget, setVatTarget] = useState<{ orderId: string; orderCode: string; targetStatus: 'issued' | 'pending' } | null>(null);

  // State quản lý các đơn hàng đang được mở rộng chi tiết hóa đơn
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  // State filter mới giúp Kế toán lọc nâng cao
  const [filterTourId, setFilterTourId] = useState<string>('all');
  const [filterCreator, setFilterCreator] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  // Modal hiển thị chi tiết khi bấm vào thẻ Kanban
  const [selectedReceiptDetail, setSelectedReceiptDetail] = useState<Invoice | null>(null);
  const [selectedVatDetail, setSelectedVatDetail] = useState<Order | null>(null);
  const [selectedPaymentDetail, setSelectedPaymentDetail] = useState<Invoice | null>(null);

  const toggleCard = (id: string) => {
    setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAllCards = (ids: string[]) => {
    setExpandedCards(prev => {
      const next = { ...prev };
      ids.forEach(id => { next[id] = true; });
      return next;
    });
  };

  const collapseAllCards = (ids: string[]) => {
    setExpandedCards(prev => {
      const next = { ...prev };
      ids.forEach(id => { next[id] = false; });
      return next;
    });
  };

  // State quản lý việc tạo phiếu chi
  const [isCreatePaymentModalOpen, setIsCreatePaymentModalOpen] = useState(false);
  const [newPaymentData, setNewPaymentData] = useState<{
    amount: string;
    description: string;
    payment_method: string;
    order_id: string | null;
    refund_bank_name: string;
    refund_account_number: string;
    refund_account_name: string;
  }>({
    amount: '',
    description: '',
    payment_method: 'Chuyển khoản',
    order_id: null,
    refund_bank_name: '',
    refund_account_number: '',
    refund_account_name: '',
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');

  // Danh sách các Creator và Tháng khả dụng (Đã resolve tên hiển thị chuẩn)
  const availableCreators = useMemo(() => {
    const set = new Set<string>();
    invoices.forEach(inv => {
      const resolved = resolveCreatorName(inv.created_by, inv.order_id);
      if (resolved) set.add(resolved);
    });
    orders.forEach(o => {
      const resolved = resolveCreatorName(o.created_by, o.id);
      if (resolved) set.add(resolved);
    });
    return Array.from(set).sort();
  }, [invoices, orders, resolveCreatorName]);

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    invoices.forEach(inv => {
      if (inv.created_at) {
        const d = new Date(inv.created_at);
        if (!isNaN(d.getTime())) {
          const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          set.add(m);
        }
      }
    });
    orders.forEach(o => {
      if (o.created_at) {
        const d = new Date(o.created_at);
        if (!isNaN(d.getTime())) {
          const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          set.add(m);
        }
      }
    });
    return Array.from(set).sort().reverse();
  }, [invoices, orders]);

  // Dynamic options for CustomSelect dropdowns
  const tourOptions: SelectOption[] = useMemo(() => [
    { value: 'all', label: 'Tất cả Tour' },
    ...tours.filter(t => t.tour_type !== 'visa').map(t => ({
      value: t.id,
      label: t.code ? `[${t.code}] ${t.name || ''}` : (t.name || 'Tour'),
    }))
  ], [tours]);

  const creatorOptions: SelectOption[] = useMemo(() => [
    { value: 'all', label: 'Tất cả Sales / Người tạo' },
    ...availableCreators.map(c => ({
      value: c,
      label: c,
    }))
  ], [availableCreators]);

  const monthOptions: SelectOption[] = useMemo(() => [
    { value: 'all', label: 'Tất cả thời gian' },
    ...availableMonths.map(m => {
      const [y, mNum] = m.split('-');
      return {
        value: m,
        label: `Tháng ${mNum}/${y}`,
      };
    })
  ], [availableMonths]);

  // Handle click from notifications
  useEffect(() => {
    if (location.state) {
      if (location.state.tab) {
        setActiveTab(location.state.tab as any);
      }
      if (location.state.searchTarget) {
        setSearchTerm(location.state.searchTarget);
        setFilterReceiptStatus('all');
        setFilterPaymentStatus('all');
      }
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'payments' || tabParam === 'receipts' || tabParam === 'vat') {
      setActiveTab(tabParam as any);
    }
    
    const createParam = searchParams.get('create');
    const orderIdParam = searchParams.get('order_id');
    const amountParam = searchParams.get('amount');
    const reasonParam = searchParams.get('reason');
    
    if (createParam === 'true') {
      setIsCreatePaymentModalOpen(true);
      setNewPaymentData({
        amount: amountParam || '',
        description: reasonParam 
          ? `Hoàn tiền cho booking đã hủy #${orderIdParam?.substring(0, 8)}. Lý do: ${decodeURIComponent(reasonParam)}`
          : (orderIdParam ? `Hoàn tiền cho booking đã hủy #${orderIdParam?.substring(0, 8)}` : ''),
        payment_method: 'Chuyển khoản',
        order_id: orderIdParam || null,
        refund_bank_name: '',
        refund_account_number: '',
        refund_account_name: '',
      });
      // Clean up search parameters to avoid resetting form unexpectedly
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('create');
      newParams.delete('order_id');
      newParams.delete('amount');
      newParams.delete('reason');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // All receipts matching search term & filters
  const searchFilteredReceipts = useMemo(() => {
    return invoices.filter(inv => {
      if (inv.type !== 'receipt') return false;

      // Filter by Tour
      if (filterTourId !== 'all') {
        const assocOrder = inv.order_id ? orders.find(o => o.id === inv.order_id) : null;
        const parsedInfo = parseRefundInfo(inv, orders, tours);
        const tourId = assocOrder?.tour_id || (parsedInfo.tourCode ? tours.find(t => t.code === parsedInfo.tourCode)?.id : undefined);
        if (tourId !== filterTourId) return false;
      }

      // Filter by Creator
      if (filterCreator !== 'all') {
        const creatorName = resolveCreatorName(inv.created_by, inv.order_id);
        if (inv.created_by !== filterCreator && creatorName !== filterCreator) return false;
      }

      // Filter by Month
      if (filterMonth !== 'all' && inv.created_at) {
        const d = new Date(inv.created_at);
        if (!isNaN(d.getTime())) {
          const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (m !== filterMonth) return false;
        }
      }

      if (searchTerm.trim() !== '') {
        const q = searchTerm.toLowerCase().trim().replace(/^#/, '');
        const qNoBk = q.replace(/^bk-/, '');
        const assocOrder = inv.order_id ? orders.find(o => o.id === inv.order_id) : null;
        const tour = assocOrder ? tours.find(t => t.id === assocOrder.tour_id) : null;
        const orderCode = assocOrder ? assocOrder.id.substring(0, 8).toUpperCase() : (inv.order_id ? inv.order_id.substring(0, 8).toUpperCase() : '');

        const invCodeMatch = inv.invoice_code && inv.invoice_code.toLowerCase().includes(q);
        const orderIdMatch = inv.order_id && (inv.order_id.toLowerCase().includes(q) || inv.order_id.toLowerCase().includes(qNoBk));
        const orderCodeMatch = orderCode && orderCode.toLowerCase().includes(q);
        const descMatch = inv.description && inv.description.toLowerCase().includes(q);
        const creatorMatch = inv.created_by && inv.created_by.toLowerCase().includes(q);
        const bookerMatch = assocOrder && assocOrder.booker_name && assocOrder.booker_name.toLowerCase().includes(q);
        const phoneMatch = assocOrder && assocOrder.booker_phone && assocOrder.booker_phone.includes(q);
        const tourCodeMatch = tour && tour.code && tour.code.toLowerCase().includes(q);

        if (!invCodeMatch && !orderIdMatch && !orderCodeMatch && !descMatch && !creatorMatch && !bookerMatch && !phoneMatch && !tourCodeMatch) {
          return false;
        }
      }
      return true;
    });
  }, [invoices, searchTerm, orders, tours, filterTourId, filterCreator, filterMonth]);

  // Filter receipt invoices (Phiếu thu chuyển khoản)
  const receiptInvoices = useMemo(() => {
    return searchFilteredReceipts
      .filter(inv => {
        if (viewMode === 'kanban' || filterReceiptStatus === 'all') return true;
        return inv.status === filterReceiptStatus;
      })
      .sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });
  }, [searchFilteredReceipts, filterReceiptStatus, viewMode]);

  // All payment invoices matching search term, filters, and role
  const searchFilteredPayments = useMemo(() => {
    return invoices.filter(inv => {
      if (inv.type !== 'payment') return false;

      // Filter by Tour
      if (filterTourId !== 'all') {
        const assocOrder = inv.order_id ? orders.find(o => o.id === inv.order_id) : null;
        const parsedInfo = parseRefundInfo(inv, orders, tours);
        const tourId = assocOrder?.tour_id || (parsedInfo.tourCode ? tours.find(t => t.code === parsedInfo.tourCode)?.id : undefined);
        if (tourId !== filterTourId) return false;
      }

      // Filter by Creator
      if (filterCreator !== 'all') {
        const creatorName = resolveCreatorName(inv.created_by, inv.order_id);
        if (inv.created_by !== filterCreator && creatorName !== filterCreator) return false;
      }

      // Filter by Month
      if (filterMonth !== 'all' && inv.created_at) {
        const d = new Date(inv.created_at);
        if (!isNaN(d.getTime())) {
          const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (m !== filterMonth) return false;
        }
      }

      if (searchTerm.trim() !== '') {
        const q = searchTerm.toLowerCase().trim().replace(/^#/, '');
        const qNoBk = q.replace(/^bk-/, '');
        const assocOrder = inv.order_id ? orders.find(o => o.id === inv.order_id) : null;
        const tour = assocOrder ? tours.find(t => t.id === assocOrder.tour_id) : null;
        const orderCode = assocOrder ? assocOrder.id.substring(0, 8).toUpperCase() : (inv.order_id ? inv.order_id.substring(0, 8).toUpperCase() : '');

        const invCodeMatch = inv.invoice_code && inv.invoice_code.toLowerCase().includes(q);
        const orderIdMatch = inv.order_id && (inv.order_id.toLowerCase().includes(q) || inv.order_id.toLowerCase().includes(qNoBk));
        const orderCodeMatch = orderCode && orderCode.toLowerCase().includes(q);
        const descMatch = inv.description && inv.description.toLowerCase().includes(q);
        const creatorMatch = inv.created_by && inv.created_by.toLowerCase().includes(q);
        const bookerMatch = assocOrder && assocOrder.booker_name && assocOrder.booker_name.toLowerCase().includes(q);
        const phoneMatch = assocOrder && assocOrder.booker_phone && assocOrder.booker_phone.includes(q);
        const tourCodeMatch = tour && tour.code && tour.code.toLowerCase().includes(q);

        if (!invCodeMatch && !orderIdMatch && !orderCodeMatch && !descMatch && !creatorMatch && !bookerMatch && !phoneMatch && !tourCodeMatch) {
          return false;
        }
      }
      
      // If not accountant/admin, only show their own requests or refunds on their own bookings
      if (!isAccountantOrAdmin) {
        const isCreator = inv.created_by === profile?.full_name || inv.created_by === profile?.id || inv.created_by === user?.id;
        let isMyOrder = false;
        if (inv.order_id) {
          const associatedOrder = orders.find(o => o.id === inv.order_id);
          if (associatedOrder && (associatedOrder.user_id === profile?.id || associatedOrder.created_by === profile?.full_name)) {
            isMyOrder = true;
          }
        }
        if (!isCreator && !isMyOrder) return false;
      }

      return true;
    });
  }, [invoices, searchTerm, orders, tours, isAccountantOrAdmin, profile, user, filterTourId, filterCreator, filterMonth]);

  // Filter payment invoices (Phiếu chi)
  const paymentInvoices = useMemo(() => {
    return searchFilteredPayments
      .filter(inv => {
        if (viewMode === 'kanban' || filterPaymentStatus === 'all') return true;
        return inv.status === filterPaymentStatus;
      })
      .sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });
  }, [searchFilteredPayments, filterPaymentStatus, viewMode]);

  // Gom nhóm hóa đơn chuyển khoản theo mã đơn hàng
  const groupedReceipts = useMemo(() => {
    const groups: {
      orderId: string;
      orderCode: string;
      order?: Order;
      tourName?: string;
      leadName: string;
      invoices: Invoice[];
      totalAmount: number;
    }[] = [];

    receiptInvoices.forEach(inv => {
      const orderId = inv.order_id || 'unassigned';
      let group = groups.find(g => g.orderId === orderId);
      if (!group) {
        const order = inv.order_id ? orders.find(o => o.id === inv.order_id) : null;
        const tour = order ? tours.find(t => t.id === order.tour_id) : null;
        const orderCode = order ? order.id.substring(0, 8).toUpperCase() : (inv.order_id ? inv.order_id.substring(0, 8).toUpperCase() : 'Chưa rõ');
        const orderPassengers = order ? passengers.filter(p => p.order_id === order.id) : [];
        const leadPassenger = orderPassengers.find(p => p.is_payer) || orderPassengers[0];
        const leadName = (order?.booker_name && !order.booker_name.includes('Giữ chỗ tạm'))
          ? order.booker_name
          : (leadPassenger?.full_name || 'Khách trưởng đoàn');

        group = {
          orderId,
          orderCode,
          order: order || undefined,
          tourName: tour?.name || '',
          leadName,
          invoices: [],
          totalAmount: 0
        };
        groups.push(group);
      }
      group.invoices.push(inv);
      group.totalAmount += inv.amount;
    });

    return groups;
  }, [receiptInvoices, orders, tours, passengers]);

  // All VAT orders matching search term & filters
  const searchFilteredVatOrders = useMemo(() => {
    return orders.filter(o => {
      if (o.status !== 'sure' && o.status !== 'paid') return false;
      if (o.vat_option !== 'Xuất VAT') return false;

      // Filter by Tour
      if (filterTourId !== 'all' && o.tour_id !== filterTourId) return false;

      // Filter by Creator
      if (filterCreator !== 'all') {
        const creatorName = resolveCreatorName(o.created_by, o.id);
        if (o.created_by !== filterCreator && creatorName !== filterCreator && o.user_id !== filterCreator) return false;
      }

      // Filter by Month
      if (filterMonth !== 'all' && o.created_at) {
        const d = new Date(o.created_at);
        if (!isNaN(d.getTime())) {
          const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (m !== filterMonth) return false;
        }
      }

      if (searchTerm.trim() !== '') {
        const q = searchTerm.toLowerCase().trim().replace(/^#/, '');
        const qNoBk = q.replace(/^bk-/, '');
        const tour = tours.find(t => t.id === o.tour_id);
        const orderCode = o.id.substring(0, 8).toUpperCase();
        const codeMatch = o.id.toLowerCase().includes(q) || o.id.toLowerCase().includes(qNoBk) || orderCode.toLowerCase().includes(q);
        const nameMatch = o.booker_name && o.booker_name.toLowerCase().includes(q);
        const companyMatch = o.vat_company_name && o.vat_company_name.toLowerCase().includes(q);
        const taxMatch = o.vat_tax_code && o.vat_tax_code.toLowerCase().includes(q);
        const tourCodeMatch = tour && tour.code && tour.code.toLowerCase().includes(q);
        if (!codeMatch && !nameMatch && !companyMatch && !taxMatch && !tourCodeMatch) return false;
      }
      return true;
    });
  }, [orders, searchTerm, tours, filterTourId, filterCreator, filterMonth]);

  // Filter VAT orders (Only orders that requested VAT)
  const invoiceOrders = useMemo(() => {
    return searchFilteredVatOrders
      .filter(o => {
        if (viewMode === 'kanban' || filterInvoice === 'all') return true;
        return o.invoice_status === filterInvoice;
      })
      .sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });
  }, [searchFilteredVatOrders, filterInvoice, viewMode]);

  const getInvoiceBadge = (status: Order['invoice_status']) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs">Chờ xuất VAT</span>;
      case 'issued':
        return <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs"><Check className="w-3 h-3 mr-1 text-emerald-600" /> Đã xuất VAT</span>;
      default:
        return null;
    }
  };

  const getReceiptStatusBadge = (status: Invoice['status']) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs">
            <Clock className="w-3 h-3 mr-1 text-amber-600 animate-spin" /> Chờ kế toán duyệt
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
            <Check className="w-3 h-3 mr-1 text-emerald-600" /> Công ty đã nhận
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-bold rounded-full bg-rose-50 text-rose-800 border border-rose-300 shadow-2xs">
            <X className="w-3 h-3 mr-1 text-rose-600" /> Bị từ chối
          </span>
        );
      default:
        return null;
    }
  };

  // Stats
  const pendingReceiptsCount = useMemo(() => searchFilteredReceipts.filter(inv => inv.status === 'pending').length, [searchFilteredReceipts]);
  const approvedReceiptsCount = useMemo(() => searchFilteredReceipts.filter(inv => inv.status === 'approved').length, [searchFilteredReceipts]);
  const rejectedReceiptsCount = useMemo(() => searchFilteredReceipts.filter(inv => inv.status === 'rejected').length, [searchFilteredReceipts]);
  const totalReceiptsCount = searchFilteredReceipts.length;

  const pendingVatCount = useMemo(() => searchFilteredVatOrders.filter(o => o.invoice_status === 'pending').length, [searchFilteredVatOrders]);
  const issuedVatCount = useMemo(() => searchFilteredVatOrders.filter(o => o.invoice_status === 'issued').length, [searchFilteredVatOrders]);
  const totalVatCount = searchFilteredVatOrders.length;

  const pendingPaymentsCount = useMemo(() => searchFilteredPayments.filter(inv => inv.status === 'pending').length, [searchFilteredPayments]);
  const approvedPaymentsCount = useMemo(() => searchFilteredPayments.filter(inv => inv.status === 'approved').length, [searchFilteredPayments]);
  const rejectedPaymentsCount = useMemo(() => searchFilteredPayments.filter(inv => inv.status === 'rejected').length, [searchFilteredPayments]);
  const totalPaymentsCount = searchFilteredPayments.length;

  const approvedReceiptsSum = useMemo(() => searchFilteredReceipts.filter(inv => inv.status === 'approved').reduce((sum, inv) => sum + inv.amount, 0), [searchFilteredReceipts]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header section */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Kế toán & Phê duyệt Tài chính</h2>
          <p className="text-sm text-gray-500 mt-1">
            {isAccountantOrAdmin 
              ? 'Xác thực hóa đơn chuyển khoản của khách hàng, cập nhật công nợ, duyệt xuất hóa đơn (VAT) hoặc xử lý phiếu chi.'
              : 'Yêu cầu hoàn tiền cho booking bị hủy, đề xuất các phiếu chi và theo dõi trạng thái phê duyệt từ kế toán.'}
          </p>
        </div>
        <div className="flex bg-gray-100 p-1.5 rounded-lg border border-gray-200 w-full md:w-auto overflow-x-auto scrollbar-none gap-1 shrink-0">
          {isAccountantOrAdmin && (
            <>
              <button
                onClick={() => setActiveTab('receipts')}
                className={`flex-1 md:flex-none px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
                  activeTab === 'receipts'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Phiếu thu ({pendingReceiptsCount})
              </button>
              <button
                onClick={() => setActiveTab('vat')}
                className={`flex-1 md:flex-none px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
                  activeTab === 'vat'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Yêu cầu xuất VAT ({pendingVatCount})
              </button>
            </>
          )}
          <button
            onClick={() => setActiveTab('payments')}
            className={`flex-1 md:flex-none px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'payments'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {isAccountantOrAdmin ? 'Phiếu chi / Hoàn tiền' : 'Đề xuất phiếu chi'}
          </button>
        </div>
      </div>

      {/* Stats summary (Hiển thị lên trên đầu) */}
      {isAccountantOrAdmin ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-500">Phiếu thu chờ duyệt</span>
              <div className="text-3xl font-extrabold text-amber-600 mt-2">
                {pendingReceiptsCount} phiếu
              </div>
              <p className="text-xs text-gray-400 mt-1">Cần đối soát tài khoản ngân hàng</p>
            </div>
            <div className="bg-amber-50 p-3.5 rounded-lg">
              <Clock className="w-6 h-6 text-amber-600 animate-pulse" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-500">Đã thu thực tế (Tổng cọc)</span>
              <div className="text-3xl font-extrabold text-green-600 mt-2">
                {new Intl.NumberFormat('vi-VN').format(approvedReceiptsSum)} đ
              </div>
              <p className="text-xs text-gray-400 mt-1">Từ các phiếu thu đã duyệt</p>
            </div>
            <div className="bg-green-50 p-3.5 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-500">Chờ xuất VAT</span>
              <div className="text-3xl font-extrabold text-red-600 mt-2">
                {orders.filter(o => (o.status === 'sure' || o.status === 'paid') && o.vat_option === 'Xuất VAT' && o.invoice_status === 'pending').length} đơn
              </div>
              <p className="text-xs text-gray-400 mt-1">Booking chắc chắn yêu cầu hóa đơn</p>
            </div>
            <div className="bg-red-50 p-3.5 rounded-lg">
              <Receipt className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-500">Yêu cầu chi chờ duyệt</span>
              <div className="text-3xl font-extrabold text-amber-600 mt-2">
                {paymentInvoices.filter(inv => inv.status === 'pending').length} phiếu
              </div>
              <p className="text-xs text-gray-400 mt-1">Đang chờ kế toán duyệt chi</p>
            </div>
            <div className="bg-amber-50 p-3.5 rounded-lg">
              <Clock className="w-6 h-6 text-amber-600 animate-pulse" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-500">Đã được duyệt chi</span>
              <div className="text-3xl font-extrabold text-green-600 mt-2">
                {paymentInvoices.filter(inv => inv.status === 'approved').length} phiếu
              </div>
              <p className="text-xs text-gray-400 mt-1">Yêu cầu hoàn/chi đã chi tiền</p>
            </div>
            <div className="bg-green-50 p-3.5 rounded-lg">
              <Check className="w-6 h-6 text-green-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-500">Số tiền được hoàn/chi</span>
              <div className="text-3xl font-extrabold text-blue-600 mt-2">
                {new Intl.NumberFormat('vi-VN').format(paymentInvoices.filter(inv => inv.status === 'approved').reduce((sum, inv) => sum + inv.amount, 0))} đ
              </div>
              <p className="text-xs text-gray-400 mt-1">Tổng tiền mặt/chuyển khoản đã nhận</p>
            </div>
            <div className="bg-blue-50 p-3.5 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      )}

      {/* Advanced Filter Toolbar for Accountant */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Search box */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Tìm kiếm mã phiếu, mã booking, tên khách, SĐT, MST, ghi chú..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-blue-500 transition-all outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-200 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Custom UI Dropdown Filters & View Mode Toggle */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Bộ chuyển đổi chế độ xem Dạng Danh sách / Bảng Kanban */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'kanban'
                    ? 'bg-white text-blue-700 shadow-2xs border border-blue-200'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Chế độ Bảng Kanban"
              >
                <Grid className="w-3.5 h-3.5 text-blue-600" />
                <span>Bảng Kanban</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white text-blue-700 shadow-2xs border border-blue-200'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Chế độ Dạng Danh Sách"
              >
                <List className="w-3.5 h-3.5 text-blue-600" />
                <span>Dạng Danh Sách</span>
              </button>
            </div>

            {/* Filter Tour */}
            <CustomSelect
              options={tourOptions}
              value={filterTourId}
              onChange={(val) => setFilterTourId(val)}
              icon={<Compass className="w-3.5 h-3.5 text-blue-600" />}
              buttonClassName="bg-gray-50 hover:bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-700 shadow-2xs h-[36px]"
            />

            {/* Filter Creator */}
            <CustomSelect
              options={creatorOptions}
              value={filterCreator}
              onChange={(val) => setFilterCreator(val)}
              icon={<User className="w-3.5 h-3.5 text-blue-600" />}
              buttonClassName="bg-gray-50 hover:bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-700 shadow-2xs h-[36px]"
            />

            {/* Filter Month */}
            <CustomSelect
              options={monthOptions}
              value={filterMonth}
              onChange={(val) => setFilterMonth(val)}
              icon={<Calendar className="w-3.5 h-3.5 text-blue-600" />}
              buttonClassName="bg-gray-50 hover:bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-700 shadow-2xs h-[36px]"
            />

            {/* Reset Filters button */}
            {(filterTourId !== 'all' || filterCreator !== 'all' || filterMonth !== 'all' || searchTerm.trim() !== '') && (
              <button
                onClick={() => {
                  setFilterTourId('all');
                  setFilterCreator('all');
                  setFilterMonth('all');
                  setSearchTerm('');
                }}
                className="px-2.5 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                title="Xóa tất cả bộ lọc"
              >
                <X className="w-3.5 h-3.5" />
                <span>Xóa lọc</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {activeTab === 'receipts' && (
        /* TAB 1: DUYỆT PHIẾU THU CHUYỂN KHOẢN */
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gray-50/50">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Danh sách hóa đơn/phiếu chuyển tiền</h3>
              <p className="text-xs text-gray-500 mt-0.5">Đối chiếu tài khoản công ty và bấm phê duyệt tương ứng</p>
            </div>
            
            {/* Thanh chuyển đổi trạng thái (Sub-tabs) - Chỉ hiển thị khi ở dạng Danh sách */}
            {viewMode === 'list' && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap items-center gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200">
                  <button
                    type="button"
                    onClick={() => setFilterReceiptStatus('pending')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      filterReceiptStatus === 'pending'
                        ? 'bg-white text-blue-700 border border-blue-600 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                    }`}
                  >
                    <span>Chờ phê duyệt</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      filterReceiptStatus === 'pending' ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {pendingReceiptsCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFilterReceiptStatus('approved')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      filterReceiptStatus === 'approved'
                        ? 'bg-white text-blue-700 border border-blue-600 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                    }`}
                  >
                    <span>Công ty đã nhận</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      filterReceiptStatus === 'approved' ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {approvedReceiptsCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFilterReceiptStatus('rejected')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      filterReceiptStatus === 'rejected'
                        ? 'bg-white text-blue-700 border border-blue-600 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                    }`}
                  >
                    <span>Bị từ chối</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      filterReceiptStatus === 'rejected' ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {rejectedReceiptsCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFilterReceiptStatus('all')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      filterReceiptStatus === 'all'
                        ? 'bg-white text-blue-700 border border-blue-600 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                    }`}
                  >
                    <span>Tất cả</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      filterReceiptStatus === 'all' ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {totalReceiptsCount}
                    </span>
                  </button>
                </div>

                {/* Nút Mở rộng / Thu gọn tất cả thẻ */}
                {receiptInvoices.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const allIds = receiptInvoices.map(i => i.id);
                      const isAnyExpanded = allIds.some(id => expandedCards[id]);
                      if (isAnyExpanded) {
                        collapseAllCards(allIds);
                      } else {
                        expandAllCards(allIds);
                      }
                    }}
                    className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Eye className="w-3.5 h-3.5 text-gray-500" />
                    <span>{receiptInvoices.some(i => expandedCards[i.id]) ? 'Thu gọn tất cả' : 'Mở rộng tất cả'}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Dạng xem Kanban hay Dạng xem Danh sách cho Phiếu thu */}
          {viewMode === 'kanban' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 p-4 md:p-6 bg-slate-50/50">
              {[
                { id: 'pending', title: '⏳ 1. CHỜ PHÊ DUYỆT', color: 'bg-amber-500 text-white', borderCol: 'border-amber-200 bg-amber-50/20' },
                { id: 'approved', title: '✅ 2. CÔNG TY ĐÃ NHẬN', color: 'bg-emerald-600 text-white', borderCol: 'border-emerald-200 bg-emerald-50/20' },
                { id: 'rejected', title: '❌ 3. BỊ TỪ CHỐI', color: 'bg-rose-600 text-white', borderCol: 'border-rose-200 bg-rose-50/20' },
              ].map((col) => {
                const colInvoices = searchFilteredReceipts.filter(inv => {
                  if (col.id === 'pending') return inv.status === 'pending' || !inv.status;
                  return inv.status === col.id;
                });

                return (
                  <div key={col.id} className={`flex flex-col rounded-2xl border ${col.borderCol} bg-white shadow-2xs overflow-hidden max-h-[80vh]`}>
                    <div className={`p-3 font-bold text-xs flex items-center justify-between ${col.color}`}>
                      <span className="font-black uppercase tracking-wider">{col.title}</span>
                      <span className="text-xs font-extrabold bg-white/20 px-2 py-0.5 rounded-full shrink-0">
                        {colInvoices.length}
                      </span>
                    </div>
                    <div className="p-3 space-y-3 overflow-y-auto flex-1 scrollbar-thin">
                      {colInvoices.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-xs italic border border-dashed border-slate-200 rounded-xl bg-white/50">
                          Không có phiếu thu nào
                        </div>
                      ) : (
                        colInvoices.map((inv) => {
                          const parsedInfo = parseRefundInfo(inv, orders, tours);
                          const order = inv.order_id ? orders.find(o => o.id === inv.order_id) : null;
                          const tour = order ? tours.find(t => t.id === order.tour_id) : null;
                          const tourCode = tour?.code || parsedInfo.tourCode;
                          const orderPassengers = order ? passengers.filter(p => p.order_id === order.id) : [];
                          const leadPassenger = orderPassengers.find(p => p.is_payer) || orderPassengers[0];
                          const leadName = (order?.booker_name && !order.booker_name.includes('Giữ chỗ tạm'))
                            ? order.booker_name
                            : (leadPassenger?.full_name || 'Khách trưởng đoàn');
                          const phone = order?.booker_phone || leadPassenger?.phone || '';
                          const orderCode = order ? order.id.substring(0, 8).toUpperCase() : (inv.order_id ? inv.order_id.substring(0, 8).toUpperCase() : '');

                          return (
                            <div
                              key={inv.id}
                              onClick={() => setSelectedReceiptDetail(inv)}
                              className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs hover:border-blue-400 hover:shadow-md hover:-translate-y-0.5 transition-all space-y-2 cursor-pointer group"
                            >
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <span className="font-mono font-bold text-xs text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                  {inv.invoice_code || 'Chưa cấp'}
                                </span>
                                <span className="font-black text-emerald-700 text-xs bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                  +{new Intl.NumberFormat('vi-VN').format(inv.amount)}đ
                                </span>
                              </div>

                              <div className="text-xs space-y-1">
                                <div className="font-extrabold text-slate-900 flex items-center gap-1 group-hover:text-blue-700 transition-colors">
                                  <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                  <span className="truncate">{leadName}</span>
                                  {phone && <span className="text-[10px] text-slate-400 font-normal">({phone})</span>}
                                </div>

                                {orderCode && (
                                  <div className="text-[11px] text-blue-700 font-mono font-semibold flex items-center justify-between">
                                    <span>Booking: #{orderCode}</span>
                                    {tourCode && <span className="text-slate-500 font-normal truncate max-w-[100px]">Tour: {tourCode}</span>}
                                  </div>
                                )}

                                {inv.description && (
                                  <div className="text-[11px] text-slate-600 truncate bg-slate-50 p-1.5 rounded border border-slate-100">
                                    {inv.description}
                                  </div>
                                )}
                              </div>

                              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                                <span className="truncate max-w-[120px]">{resolveCreatorName(inv.created_by, inv.order_id)}</span>
                                <span>{inv.created_at ? format(new Date(inv.created_at), 'dd/MM/yyyy') : '---'}</span>
                              </div>

                              {/* Actions */}
                              <div className="pt-1 flex items-center gap-1.5 justify-end" onClick={(e) => e.stopPropagation()}>
                                {inv.file_url && (
                                  <a
                                    href={inv.file_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2 py-0.5 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors inline-flex items-center gap-1"
                                    title="Xem ảnh xác nhận"
                                  >
                                    <FileText className="w-3 h-3 text-blue-600" /> Ảnh
                                  </a>
                                )}
                                {inv.status === 'pending' && isAccountantOrAdmin && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => setApproveTarget({ id: inv.id, amount: inv.amount, orderCode: orderCode || 'N/A' })}
                                      className="px-2 py-0.5 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors flex items-center gap-1 cursor-pointer"
                                    >
                                      <Check className="w-3 h-3" /> Duyệt
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setRejectTarget({ id: inv.id, orderCode: orderCode || 'N/A' })}
                                      className="px-2 py-0.5 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded transition-colors flex items-center gap-1 cursor-pointer"
                                    >
                                      <X className="w-3 h-3" /> Từ chối
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 md:p-6 space-y-4">
              {receiptInvoices.length === 0 ? (
                <div className="text-center py-12 bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
                  <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <h4 className="text-gray-900 font-bold text-sm">Không tìm thấy phiếu thu nào</h4>
                  <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                    {searchTerm.trim() 
                      ? `Không tìm thấy phiếu thu nào phù hợp với từ khóa "${searchTerm}".` 
                      : filterReceiptStatus !== 'all' 
                        ? `Không tìm thấy phiếu thu nào ở trạng thái này.` 
                        : 'Các phiếu thu do Sales tải lên sẽ hiển thị tại đây.'}
                  </p>
                  {(searchTerm.trim() || filterReceiptStatus !== 'all') && (
                    <div className="mt-4 flex justify-center gap-2">
                      {searchTerm.trim() && (
                        <button
                          type="button"
                          onClick={() => setSearchTerm('')}
                          className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
                        >
                          Xóa từ khóa
                        </button>
                      )}
                      {filterReceiptStatus !== 'all' && (
                        <button
                          type="button"
                          onClick={() => setFilterReceiptStatus('all')}
                          className="px-3 py-1.5 text-xs font-bold text-gray-700 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
                        >
                          Xem tất cả ({totalReceiptsCount})
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {receiptInvoices.map((inv) => {
                  const isExpanded = !!expandedCards[inv.id];
                  const parsedInfo = parseRefundInfo(inv, orders, tours);
                  const order = inv.order_id ? orders.find(o => o.id === inv.order_id) : null;
                  const tour = order ? tours.find(t => t.id === order.tour_id) : null;
                  const tourCode = tour?.code || parsedInfo.tourCode;
                  const tourName = tour?.name || parsedInfo.tourName;
                  const orderPassengers = order ? passengers.filter(p => p.order_id === order.id) : [];
                  const leadPassenger = orderPassengers.find(p => p.is_payer) || orderPassengers[0];
                  const leadName = (order?.booker_name && !order.booker_name.includes('Giữ chỗ tạm'))
                    ? order.booker_name
                    : (leadPassenger?.full_name || 'Khách trưởng đoàn');
                  const phone = order?.booker_phone || leadPassenger?.phone || '';
                  const orderCode = order ? order.id.substring(0, 8).toUpperCase() : (inv.order_id ? inv.order_id.substring(0, 8).toUpperCase() : '');

                  return (
                    <div 
                      key={inv.id} 
                      className={`border-x border-b rounded-xl p-4 shadow-2xs relative overflow-hidden bg-white transition-all flex flex-col justify-between border-t-4 border-t-emerald-500 ${
                        isExpanded ? 'border-blue-400 ring-2 ring-blue-100 shadow-md' : 'border-gray-200 hover:border-gray-300 hover:shadow-xs'
                      }`}
                    >
                      <div>
                        {/* Compact Header: Code, Amount, Status & Expand Arrow */}
                        <div className="flex justify-between items-start mb-3 pb-2.5 border-b border-gray-100">
                          <div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Mã Phiếu Thu</div>
                            <div className="font-mono font-bold text-slate-800 text-xs flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded border border-slate-200 shadow-2xs">
                              {inv.invoice_code || 'Chưa cấp'}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="text-right">
                              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Số Tiền Thu</div>
                              <div className="font-black text-emerald-700 text-base select-all bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80 shadow-2xs inline-block">
                                +{new Intl.NumberFormat('vi-VN').format(inv.amount)}đ
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleCard(inv.id)}
                              className="p-1 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer ml-1"
                              title={isExpanded ? "Thu gọn chi tiết" : "Mở rộng chi tiết"}
                            >
                              {isExpanded ? <ChevronUp className="w-5 h-5 text-blue-600" /> : <ChevronDown className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>

                        {/* Status & Short Info ALWAYS visible */}
                        <div className="bg-slate-50/90 p-2.5 rounded-xl border border-slate-200/80 mb-2.5 space-y-2">
                          <div className="flex items-start justify-between gap-2 border-b border-slate-200/60 pb-2">
                            <div className="flex items-center gap-1.5 text-slate-900 font-extrabold text-xs min-w-0 flex-1">
                              <User className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span className="font-extrabold text-slate-900 break-words leading-tight">{leadName}</span>
                            </div>
                            <div className="shrink-0">
                              {getReceiptStatusBadge(inv.status)}
                            </div>
                          </div>

                          {phone && (
                            <div className="flex items-center justify-between text-xs pt-0.5">
                              <span className="text-[11px] text-slate-500 font-medium">Số điện thoại:</span>
                              <span className="text-emerald-800 font-bold font-mono text-[11px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80">
                                📞 {phone}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Summary preview line when collapsed */}
                        {!isExpanded && (
                          <div className="text-[11px] text-gray-500 bg-gray-50 p-2 rounded-lg border border-gray-100 mb-2">
                            <span className="truncate font-medium block">{inv.description || (tourCode ? `Tour: ${tourCode}` : 'Thanh toán tiền tour')}</span>
                          </div>
                        )}

                        {/* EXPANDABLE FULL DETAILS */}
                        {isExpanded && (
                          <div className="mt-3 space-y-3 pt-2 border-t border-gray-100 animate-fadeIn">
                            {/* Thông tin Tour du lịch */}
                            {(tourCode || tourName) && (
                              <div className="bg-blue-50/70 border border-blue-100/90 rounded-lg p-2.5 shadow-2xs">
                                <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                                  <Compass className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                  <span>Thông tin Tour</span>
                                </div>
                                <div className="text-xs space-y-1">
                                  {tourCode && (
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] font-bold text-gray-500">Mã Tour:</span>
                                      <span className="font-mono font-black text-blue-900 bg-white px-1.5 py-0.5 rounded border border-blue-200 text-xs">
                                        {tourCode}
                                      </span>
                                    </div>
                                  )}
                                  {tourName && (
                                    <div className="flex items-start gap-1.5 text-gray-800 font-semibold leading-snug">
                                      <span className="text-[10px] font-bold text-gray-500 shrink-0 mt-0.5">Tên Tour:</span>
                                      <span>{tourName}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Verification Detail */}
                            {inv.verified_by && (
                              <div className="text-[10px] text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100 flex items-center justify-between font-semibold">
                                <span>Duyệt bởi: <strong>{inv.verified_by}</strong></span>
                                {inv.verified_at && <span>{format(new Date(inv.verified_at), 'dd/MM/yyyy')}</span>}
                              </div>
                            )}

                            {/* Order Association */}
                            {orderCode && (
                              <div className="text-[10px] text-blue-700 bg-blue-50/50 p-2 rounded-lg border border-blue-100 font-semibold flex items-center justify-between gap-1.5">
                                <span className="text-gray-600 font-semibold">Booking liên kết:</span>
                                <span 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(orderCode);
                                    toast.success(`Đã sao chép mã booking: ${orderCode}`);
                                  }}
                                  className="font-mono bg-white px-2 py-0.5 rounded border border-blue-200 font-bold text-blue-900 hover:bg-blue-50 cursor-pointer inline-flex items-center gap-1 group/copy transition-colors shrink-0 shadow-2xs"
                                  title="Bấm để sao chép mã booking"
                                >
                                  #{orderCode}
                                  <Copy className="w-3 h-3 text-blue-400 group-hover/copy:text-blue-700 transition-colors" />
                                </span>
                              </div>
                            )}

                            {/* Description */}
                            <div className="bg-gray-50 rounded-lg p-2.5 text-xs text-gray-600 border border-gray-100">
                              <span className="font-bold text-gray-700 block mb-1">Ghi chú & Đợt nộp:</span>
                              <p className="leading-relaxed break-words">
                                {inv.description || 'Chuyển khoản thanh toán tiền tour'}
                              </p>
                            </div>


                            {/* Minh chứng & Thao tác */}
                            <div className="p-2.5 bg-slate-50/80 rounded-lg border border-gray-150 text-xs flex flex-col gap-2">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-gray-500 uppercase text-[10px]">Xác nhận</span>
                                {inv.file_url ? (
                                  <a
                                    href={inv.file_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-800 bg-white px-2.5 py-1 rounded border border-blue-200 shadow-2xs hover:bg-blue-50 transition-colors"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                                    <span>Xem ảnh xác nhận</span>
                                    <ExternalLink className="w-3 h-3 text-blue-400" />
                                  </a>
                                ) : (
                                  <span className="text-gray-400 text-[10px] italic">Chưa có ảnh minh chứng</span>
                                )}
                              </div>

                              {inv.status === 'pending' && (
                                <div className="flex items-center gap-2 pt-2 border-t border-gray-200/80">
                                  <button
                                    onClick={() => {
                                      setApproveTarget({
                                        id: inv.id,
                                        amount: inv.amount,
                                        orderCode: orderCode || 'N/A'
                                      });
                                    }}
                                    className="flex-1 inline-flex items-center justify-center px-3 py-1.5 text-xs font-bold rounded-lg text-white bg-green-600 hover:bg-green-700 transition-colors shadow-xs cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5 mr-1" /> Duyệt nhận
                                  </button>
                                  <button
                                    onClick={() => {
                                      setRejectTarget({
                                        id: inv.id,
                                        orderCode: orderCode || 'N/A'
                                      });
                                    }}
                                    className="px-3 py-1.5 text-xs font-semibold rounded-lg text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 transition-colors cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5 mr-0.5 inline" /> Từ chối
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Footer Actions & Info */}
                      <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400 font-medium">
                        <span className="flex items-center gap-1 text-gray-600 font-semibold truncate max-w-[150px]">
                          <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="truncate">{resolveCreatorName(inv.created_by, inv.order_id)}</span>
                        </span>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            {inv.created_at ? format(new Date(inv.created_at), 'dd/MM/yyyy') : '---'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    )}
      
      {activeTab === 'vat' && (
        /* TAB 2: YÊU CẦU XUẤT HÓA ĐƠN VAT */
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gray-50/50">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Danh sách booking xuất hóa đơn (VAT)</h3>
              <p className="text-xs text-gray-500 mt-0.5">Xử lý các yêu cầu viết hóa đơn thuế giá trị gia tăng</p>
            </div>
            
            {/* Thanh chuyển đổi trạng thái (Sub-tabs) - Chỉ hiển thị khi ở dạng Danh sách */}
            {viewMode === 'list' && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap items-center gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200">
                  <button
                    type="button"
                    onClick={() => setFilterInvoice('pending')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      filterInvoice === 'pending'
                        ? 'bg-white text-blue-700 border border-blue-600 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                    }`}
                  >
                    <span>Chờ xuất VAT</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      filterInvoice === 'pending' ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {pendingVatCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFilterInvoice('issued')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      filterInvoice === 'issued'
                        ? 'bg-white text-blue-700 border border-blue-600 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                    }`}
                  >
                    <span>Đã xuất VAT</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      filterInvoice === 'issued' ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {issuedVatCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFilterInvoice('all')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      filterInvoice === 'all'
                        ? 'bg-white text-blue-700 border border-blue-600 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                    }`}
                  >
                    <span>Tất cả</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      filterInvoice === 'all' ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {totalVatCount}
                    </span>
                  </button>
                </div>

                {/* Nút Mở rộng / Thu gọn tất cả thẻ */}
                {invoiceOrders.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const allIds = invoiceOrders.map(o => o.id);
                      const isAnyExpanded = allIds.some(id => expandedCards[id]);
                      if (isAnyExpanded) {
                        collapseAllCards(allIds);
                      } else {
                        expandAllCards(allIds);
                      }
                    }}
                    className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Eye className="w-3.5 h-3.5 text-gray-500" />
                    <span>{invoiceOrders.some(o => expandedCards[o.id]) ? 'Thu gọn tất cả' : 'Mở rộng tất cả'}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Dạng xem Kanban hay Dạng xem Danh sách cho VAT */}
          {viewMode === 'kanban' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 md:p-6 bg-slate-50/50">
              {[
                { id: 'pending', title: '⏳ 1. CHỜ XUẤT VAT', color: 'bg-amber-500 text-white', borderCol: 'border-amber-200 bg-amber-50/20' },
                { id: 'issued', title: '✅ 2. ĐÃ XUẤT VAT', color: 'bg-emerald-600 text-white', borderCol: 'border-emerald-200 bg-emerald-50/20' },
              ].map((col) => {
                const colOrders = searchFilteredVatOrders.filter(o => o.invoice_status === col.id);
                return (
                  <div key={col.id} className={`flex flex-col rounded-2xl border ${col.borderCol} bg-white shadow-2xs overflow-hidden max-h-[80vh]`}>
                    <div className={`p-3 font-bold text-xs flex items-center justify-between ${col.color}`}>
                      <span className="font-black uppercase tracking-wider">{col.title}</span>
                      <span className="text-xs font-extrabold bg-white/20 px-2 py-0.5 rounded-full shrink-0">
                        {colOrders.length}
                      </span>
                    </div>
                    <div className="p-3 space-y-3 overflow-y-auto flex-1 scrollbar-thin">
                      {colOrders.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-xs italic border border-dashed border-slate-200 rounded-xl bg-white/50">
                          Không có yêu cầu xuất VAT nào
                        </div>
                      ) : (
                        colOrders.map((order) => {
                          const orderCode = order.id.substring(0, 8).toUpperCase();
                          const tour = tours.find(t => t.id === order.tour_id);

                          return (
                            <div
                              key={order.id}
                              onClick={() => setSelectedVatDetail(order)}
                              className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs hover:border-blue-400 hover:shadow-md hover:-translate-y-0.5 transition-all space-y-2 cursor-pointer group"
                            >
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <span className="font-mono font-bold text-xs text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                  #{orderCode}
                                </span>
                                <span className="font-black text-slate-900 text-xs bg-slate-100 px-2 py-0.5 rounded">
                                  {new Intl.NumberFormat('vi-VN').format(order.total_price)}đ
                                </span>
                              </div>

                              <div className="text-xs space-y-1">
                                <div className="font-extrabold text-slate-900 flex items-center gap-1 group-hover:text-blue-700 transition-colors">
                                  <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                  <span className="truncate">{order.booker_name || 'Khách lẻ'}</span>
                                  {order.booker_phone && <span className="text-[10px] text-slate-500 font-normal">({order.booker_phone})</span>}
                                </div>

                                <div className="bg-blue-50/60 p-2 rounded-lg border border-blue-100 text-[11px] space-y-0.5">
                                  <div className="font-bold text-blue-950 truncate">
                                    🏢 {order.vat_company_name || 'Chưa nhập tên công ty'}
                                  </div>
                                  {order.vat_tax_code && (
                                    <div className="font-mono text-blue-800">
                                      MST: {order.vat_tax_code}
                                    </div>
                                  )}
                                  {order.vat_email && (
                                    <div className="text-slate-600 truncate">
                                      ✉️ {order.vat_email}
                                    </div>
                                  )}
                                </div>

                                {tour?.code && (
                                  <div className="text-[11px] text-slate-600 truncate">
                                    Tour: {tour.code}
                                  </div>
                                )}
                              </div>

                              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                                <span className="truncate max-w-[120px]">{resolveCreatorName(order.created_by, order.id)}</span>
                                <span>{order.created_at ? format(new Date(order.created_at), 'dd/MM/yyyy') : '---'}</span>
                              </div>

                              {/* Actions */}
                              {isAccountantOrAdmin && (
                                <div className="pt-1 flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                                  {order.invoice_status === 'pending' ? (
                                    <button
                                      type="button"
                                      onClick={() => setVatTarget({ orderId: order.id, orderCode, targetStatus: 'issued' })}
                                      className="px-2 py-0.5 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors flex items-center gap-1 cursor-pointer"
                                    >
                                      <Check className="w-3 h-3" /> Xác nhận đã xuất VAT
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setVatTarget({ orderId: order.id, orderCode, targetStatus: 'pending' })}
                                      className="px-2.5 py-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded transition-colors flex items-center gap-1 cursor-pointer"
                                    >
                                      <Clock className="w-3 h-3" /> Đổi về Chờ xuất
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 md:p-6 space-y-4">
            {invoiceOrders.length === 0 ? (
              <div className="text-center py-12 bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
                <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <h4 className="text-gray-900 font-bold text-sm">Không tìm thấy yêu cầu xuất hóa đơn nào</h4>
                <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                  {searchTerm.trim() 
                    ? `Không tìm thấy booking nào phù hợp với từ khóa "${searchTerm}".` 
                    : filterInvoice !== 'all' 
                      ? `Không tìm thấy booking nào ở trạng thái xuất VAT này.` 
                      : 'Các yêu cầu xuất VAT từ booking sẽ hiển thị tại đây.'}
                </p>
                {(searchTerm.trim() || filterInvoice !== 'all') && (
                  <div className="mt-4 flex justify-center gap-2">
                    {searchTerm.trim() && (
                      <button
                        type="button"
                        onClick={() => setSearchTerm('')}
                        className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
                      >
                        Xóa từ khóa
                      </button>
                    )}
                    {filterInvoice !== 'all' && (
                      <button
                        type="button"
                        onClick={() => setFilterInvoice('all')}
                        className="px-3 py-1.5 text-xs font-bold text-gray-700 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
                      >
                        Xem tất cả ({totalVatCount})
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {invoiceOrders.map(order => {
                  const isExpanded = !!expandedCards[order.id];
                  const tour = tours.find(t => t.id === order.tour_id);
                  const orderPassengers = passengers.filter(p => p.order_id === order.id);
                  const leadPassenger = orderPassengers.find(p => p.is_payer) || orderPassengers[0];
                  const orderCode = order.id.substring(0, 8).toUpperCase();

                  return (
                    <div 
                      key={order.id} 
                      className={`border-x border-b rounded-xl p-4 shadow-2xs relative overflow-hidden bg-white transition-all flex flex-col justify-between border-t-4 border-t-blue-500 ${
                        isExpanded ? 'border-blue-400 ring-2 ring-blue-100 shadow-md' : 'border-gray-200 hover:border-gray-300 hover:shadow-xs'
                      }`}
                    >
                      <div>
                        {/* Compact Header: Booking Code, Amount & Expand Arrow */}
                        <div className="flex justify-between items-start mb-3 pb-2.5 border-b border-gray-100">
                          <div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Mã Booking</div>
                            <div className="font-mono font-bold text-blue-900 text-xs flex items-center gap-1.5 bg-blue-50 px-2 py-1 rounded border border-blue-200 shadow-2xs">
                              {orderCode}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="text-right">
                              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tổng Tiền Booking</div>
                              <div className="font-black text-slate-900 text-base select-all bg-slate-50 px-2 py-0.5 rounded border border-slate-200 shadow-2xs inline-block">
                                {new Intl.NumberFormat('vi-VN').format(order.total_price)}đ
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleCard(order.id)}
                              className="p-1 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer ml-1"
                              title={isExpanded ? "Thu gọn chi tiết" : "Mở rộng chi tiết"}
                            >
                              {isExpanded ? <ChevronUp className="w-5 h-5 text-blue-600" /> : <ChevronDown className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>

                        {/* Status & Short Buyer Info ALWAYS visible */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2.5 text-xs bg-blue-50/60 p-2.5 rounded-lg border border-blue-150">
                          <div className="flex items-center gap-1.5 text-slate-900 font-extrabold min-w-0">
                            <User className="w-4 h-4 text-blue-600 shrink-0" />
                            <span className="truncate">{leadPassenger?.full_name || order.booker_name || 'Khách lẻ'}</span>
                            {(leadPassenger?.phone || order.booker_phone) && (
                              <span className="text-blue-900 font-bold font-mono text-[11px] bg-white px-1.5 py-0.5 rounded border border-blue-200 shrink-0">
                                📞 {leadPassenger?.phone || order.booker_phone}
                              </span>
                            )}
                          </div>
                          <div className="shrink-0 self-start sm:self-auto">
                            {getInvoiceBadge(order.invoice_status)}
                          </div>
                        </div>

                        {/* Summary preview line when collapsed */}
                        {!isExpanded && (
                          <div className="text-[11px] text-gray-500 bg-gray-50 p-2 rounded-lg border border-gray-100 mb-2">
                            <span className="truncate font-semibold text-gray-800 block">
                              {order.vat_company_name ? `Cty: ${order.vat_company_name}` : (tour?.code ? `Tour: ${tour.code}` : 'Chưa có thông tin Cty')}
                            </span>
                          </div>
                        )}

                        {/* EXPANDABLE FULL VAT DETAILS */}
                        {isExpanded && (
                          <div className="mt-3 space-y-3 pt-2 border-t border-gray-100 animate-fadeIn">
                            {/* Thông tin Tour du lịch */}
                            {tour && (
                              <div className="bg-blue-50/70 border border-blue-100/90 rounded-lg p-2.5 shadow-2xs">
                                <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                                  <Compass className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                  <span>Thông tin Tour</span>
                                </div>
                                <div className="text-xs space-y-1">
                                  {tour.code && (
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] font-bold text-gray-500">Mã Tour:</span>
                                      <span className="font-mono font-black text-blue-900 bg-white px-1.5 py-0.5 rounded border border-blue-200 text-xs">
                                        {tour.code}
                                      </span>
                                    </div>
                                  )}
                                  {tour.name && (
                                    <div className="flex items-start gap-1.5 text-gray-800 font-semibold leading-snug">
                                      <span className="text-[10px] font-bold text-gray-500 shrink-0 mt-0.5">Tên Tour:</span>
                                      <span>{tour.name}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Người mua & Số khách */}
                            <div className="bg-gray-50 rounded-lg p-2.5 text-xs text-gray-700 border border-gray-100 space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Người mua:</span>
                                <span className="font-bold text-gray-900">{leadPassenger?.full_name || order.booker_name || 'Khách lẻ'}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">SĐT:</span>
                                <span className="font-semibold text-gray-800">{leadPassenger?.phone || order.booker_phone || 'Chưa cung cấp'}</span>
                              </div>
                              <div className="flex justify-between items-center pt-1 border-t border-gray-200/60">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Số khách:</span>
                                <span className="bg-gray-200/80 text-gray-800 px-1.5 py-0.5 rounded text-[10px] font-bold">{orderPassengers.length} người</span>
                              </div>
                            </div>

                            {/* Thông tin Chi tiết Xuất Hóa Đơn (VAT) */}
                            <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3">
                              <div className="text-[10px] font-bold text-blue-900 mb-2 uppercase tracking-wider border-b border-blue-200/50 pb-1 flex items-center gap-1">
                                <FileText className="w-3.5 h-3.5 text-blue-600" />
                                <span>Chi tiết Hóa đơn VAT</span>
                              </div>
                              <div className="space-y-2 text-xs">
                                <div>
                                  <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Tên công ty</span>
                                  <span className="font-bold text-gray-900 select-all leading-snug block">{order.vat_company_name || 'Chưa cung cấp'}</span>
                                </div>
                                <div>
                                  <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Mã số thuế (MST)</span>
                                  <span className="font-black text-blue-800 font-mono select-all bg-white px-2 py-0.5 rounded border border-blue-150 inline-block">{order.vat_tax_code || 'Chưa cung cấp'}</span>
                                </div>
                                <div>
                                  <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Địa chỉ công ty</span>
                                  <span className="font-medium text-gray-700 select-all leading-snug block">{order.vat_address || 'Chưa cung cấp'}</span>
                                </div>
                                <div>
                                  <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Email nhận hóa đơn</span>
                                  <span className="font-bold text-gray-800 select-all font-mono break-all bg-white px-2 py-0.5 rounded border border-blue-150 inline-block">{order.vat_email || 'Chưa cung cấp'}</span>
                                </div>
                              </div>
                            </div>

                            {/* Thao tác */}
                            <div className="p-2.5 bg-slate-50/80 rounded-lg border border-gray-150 text-xs flex items-center justify-between">
                              <span className="font-bold text-gray-500 uppercase text-[10px]">Thao tác</span>
                              {order.invoice_status === 'pending' ? (
                                <button
                                  onClick={() => {
                                    setVatTarget({
                                      orderId: order.id,
                                      orderCode,
                                      targetStatus: 'issued'
                                    });
                                  }}
                                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-bold rounded-lg text-white bg-green-600 hover:bg-green-700 shadow-xs transition-colors cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5 mr-1" /> Đã xuất VAT
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setVatTarget({
                                      orderId: order.id,
                                      orderCode,
                                      targetStatus: 'pending'
                                    });
                                  }}
                                  className="text-xs text-gray-500 hover:text-red-600 underline font-bold transition-colors cursor-pointer px-2"
                                >
                                  Đánh dấu chưa xuất VAT
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Footer Actions & Info */}
                      <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400 font-medium">
                        <span className="flex items-center gap-1 text-gray-600 font-semibold truncate max-w-[150px]">
                          <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="truncate">{resolveCreatorName(order.created_by, order.id)}</span>
                        </span>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            {order.created_at ? format(new Date(order.created_at), 'dd/MM/yyyy') : '---'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    )}

      {activeTab === 'payments' && (
        /* TAB 3: PHIẾU CHI */
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 space-y-3">
            {/* Row 1: Title & Main Action Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Danh sách phiếu chi & Hoàn tiền</h3>
                <p className="text-xs text-gray-500 mt-0.5">Quản lý, phê duyệt các khoản chi tiền, hoàn tiền cho khách hàng hoặc đại lý</p>
              </div>

              <button
                type="button"
                onClick={() => setIsCreatePaymentModalOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors cursor-pointer shrink-0 whitespace-nowrap flex items-center justify-center gap-1.5 self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo phiếu chi mới</span>
              </button>
            </div>

            {/* Row 2: Sub-tabs & Expand/Collapse button - Chỉ hiển thị khi ở dạng Danh sách */}
            {viewMode === 'list' && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-200/60">
                <div className="flex flex-wrap items-center gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200">
                  <button
                    type="button"
                    onClick={() => setFilterPaymentStatus('pending')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      filterPaymentStatus === 'pending'
                        ? 'bg-white text-blue-700 border border-blue-600 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                    }`}
                  >
                    <span>Chờ duyệt</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      filterPaymentStatus === 'pending' ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {pendingPaymentsCount}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterPaymentStatus('approved')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      filterPaymentStatus === 'approved'
                        ? 'bg-white text-blue-700 border border-blue-600 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                    }`}
                  >
                    <span>Đã duyệt chi</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      filterPaymentStatus === 'approved' ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {approvedPaymentsCount}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterPaymentStatus('rejected')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      filterPaymentStatus === 'rejected'
                        ? 'bg-white text-blue-700 border border-blue-600 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                    }`}
                  >
                    <span>Bị từ chối</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      filterPaymentStatus === 'rejected' ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {rejectedPaymentsCount}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterPaymentStatus('all')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      filterPaymentStatus === 'all'
                        ? 'bg-white text-blue-700 border border-blue-600 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                    }`}
                  >
                    <span>Tất cả</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      filterPaymentStatus === 'all' ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {totalPaymentsCount}
                    </span>
                  </button>
                </div>

                {/* Nút Mở rộng / Thu gọn tất cả thẻ Phiếu Chi */}
                {paymentInvoices.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const allIds = paymentInvoices.map(p => p.id);
                      const isAnyExpanded = allIds.some(id => expandedCards[id]);
                      if (isAnyExpanded) {
                        collapseAllCards(allIds);
                      } else {
                        expandAllCards(allIds);
                      }
                    }}
                    className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 transition-colors flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
                  >
                    <Eye className="w-3.5 h-3.5 text-gray-500" />
                    <span>{paymentInvoices.some(p => expandedCards[p.id]) ? 'Thu gọn tất cả' : 'Mở rộng tất cả'}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Dạng xem Kanban hay Dạng xem Danh sách cho Phiếu Chi */}
          {viewMode === 'kanban' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 p-4 md:p-6 bg-slate-50/50">
              {[
                { id: 'pending', title: '⏳ 1. CHỜ DUYỆT CHI', color: 'bg-amber-500 text-white', borderCol: 'border-amber-200 bg-amber-50/20' },
                { id: 'approved', title: '✅ 2. ĐÃ DUYỆT CHI', color: 'bg-emerald-600 text-white', borderCol: 'border-emerald-200 bg-emerald-50/20' },
                { id: 'rejected', title: '❌ 3. BỊ TỪ CHỐI', color: 'bg-rose-600 text-white', borderCol: 'border-rose-200 bg-rose-50/20' },
              ].map((col) => {
                const colInvoices = searchFilteredPayments.filter(inv => inv.status === col.id);
                return (
                  <div key={col.id} className={`flex flex-col rounded-2xl border ${col.borderCol} bg-white shadow-2xs overflow-hidden max-h-[80vh]`}>
                    <div className={`p-3 font-bold text-xs flex items-center justify-between ${col.color}`}>
                      <span className="font-black uppercase tracking-wider">{col.title}</span>
                      <span className="text-xs font-extrabold bg-white/20 px-2 py-0.5 rounded-full shrink-0">
                        {colInvoices.length}
                      </span>
                    </div>
                    <div className="p-3 space-y-3 overflow-y-auto flex-1 scrollbar-thin">
                      {colInvoices.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-xs italic border border-dashed border-slate-200 rounded-xl bg-white/50">
                          Không có phiếu chi nào
                        </div>
                      ) : (
                        colInvoices.map((inv) => {
                          const parsedInfo = parseRefundInfo(inv, orders, tours);
                          const order = inv.order_id ? orders.find(o => o.id === inv.order_id) : null;
                          const orderCode = order ? order.id.substring(0, 8).toUpperCase() : (inv.order_id ? inv.order_id.substring(0, 8).toUpperCase() : '');

                          return (
                            <div
                              key={inv.id}
                              onClick={() => setSelectedPaymentDetail(inv)}
                              className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs hover:border-blue-400 hover:shadow-md hover:-translate-y-0.5 transition-all space-y-2 cursor-pointer group"
                            >
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <span className="font-mono font-bold text-xs text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                  {inv.invoice_code || 'Chưa cấp'}
                                </span>
                                <span className="font-black text-rose-700 text-xs bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                  -{new Intl.NumberFormat('vi-VN').format(inv.amount)}đ
                                </span>
                              </div>

                              <div className="text-xs space-y-1">
                                {orderCode && (
                                  <div className="text-[11px] text-blue-700 font-mono font-semibold">
                                    Booking: #{orderCode}
                                  </div>
                                )}
                                {inv.description && (
                                  <div className="text-[11px] text-slate-700 font-medium line-clamp-2 bg-slate-50 p-1.5 rounded border border-slate-100">
                                    {inv.description}
                                  </div>
                                )}
                                {parsedInfo.bankName && (
                                  <div className="text-[10px] text-slate-600 bg-amber-50/60 p-1.5 rounded border border-amber-100 font-mono truncate">
                                    🏦 {parsedInfo.bankName} - {parsedInfo.accountNumber} ({parsedInfo.accountName})
                                  </div>
                                )}
                              </div>

                              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                                <span className="truncate max-w-[120px]">{resolveCreatorName(inv.created_by, inv.order_id)}</span>
                                <span>{inv.created_at ? format(new Date(inv.created_at), 'dd/MM/yyyy') : '---'}</span>
                              </div>

                              {/* Actions */}
                              <div className="pt-1 flex items-center gap-1.5 justify-end" onClick={(e) => e.stopPropagation()}>
                                {inv.file_url && (
                                  <a
                                    href={inv.file_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2 py-0.5 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors inline-flex items-center gap-1"
                                    title="Xem ảnh minh chứng"
                                  >
                                    <FileText className="w-3 h-3 text-blue-600" /> Ảnh
                                  </a>
                                )}
                                {inv.status === 'pending' && isAccountantOrAdmin && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => setApprovePaymentTarget(inv)}
                                      className="px-2 py-0.5 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors flex items-center gap-1 cursor-pointer"
                                    >
                                      <Check className="w-3 h-3" /> Duyệt chi
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setRejectPaymentTarget(inv)}
                                      className="px-2 py-0.5 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded transition-colors flex items-center gap-1 cursor-pointer"
                                    >
                                      <X className="w-3 h-3" /> Từ chối
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 md:p-6 space-y-4">
            {paymentInvoices.length === 0 ? (
              <div className="text-center py-12 bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
                <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <h4 className="text-gray-900 font-bold text-sm">Chưa có phiếu chi nào</h4>
                <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">Các phiếu chi, hoàn tiền thuộc trạng thái bộ lọc hiện tại sẽ hiển thị tại đây.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {paymentInvoices.map((inv) => {
                  const isExpanded = !!expandedCards[inv.id];
                  const parsedInfo = parseRefundInfo(inv, orders, tours);

                  return (
                    <div 
                      key={inv.id} 
                      className={`border-x border-b rounded-xl p-4 shadow-2xs relative overflow-hidden bg-white transition-all flex flex-col justify-between border-t-4 border-t-rose-500 ${
                        isExpanded ? 'border-blue-400 ring-2 ring-blue-100 shadow-md' : 'border-gray-200 hover:border-gray-300 hover:shadow-xs'
                      }`}
                    >
                      <div>
                        {/* Compact Header: Invoice Code, Amount & Expand Arrow */}
                        <div className="flex justify-between items-start mb-3 pb-2.5 border-b border-gray-100">
                          <div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Mã Phiếu Chi</div>
                            <div className="font-mono font-bold text-rose-950 text-xs flex items-center gap-1.5 bg-rose-50 px-2 py-1 rounded border border-rose-200 shadow-2xs">
                              {inv.invoice_code || 'Chưa cấp'}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="text-right">
                              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Số Tiền Chi</div>
                              <div className="font-black text-rose-600 text-base select-all bg-rose-50 px-2 py-0.5 rounded border border-rose-200/80 shadow-2xs inline-block">
                                -{new Intl.NumberFormat('vi-VN').format(inv.amount)}đ
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleCard(inv.id)}
                              className="p-1 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer ml-1"
                              title={isExpanded ? "Thu gọn chi tiết" : "Mở rộng chi tiết"}
                            >
                              {isExpanded ? <ChevronUp className="w-5 h-5 text-blue-600" /> : <ChevronDown className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>

                        {/* Status Badge & Contact Info ALWAYS visible */}
                        <div className="bg-rose-50/40 p-2.5 rounded-xl border border-rose-200/60 mb-2.5 space-y-2">
                          <div className="flex items-start justify-between gap-2 border-b border-rose-200/50 pb-2">
                            <div className="flex items-center gap-1.5 text-slate-900 font-extrabold text-xs min-w-0 flex-1">
                              <User className="w-4 h-4 text-rose-600 shrink-0" />
                              <span className="font-extrabold text-slate-900 break-words leading-tight">
                                {parsedInfo.accountName || (inv.order_id ? (orders.find(o => o.id === inv.order_id)?.booker_name || passengers.find(p => p.order_id === inv.order_id)?.full_name) : null) || 'Khách / Đối tác nhận chi'}
                              </span>
                            </div>
                            <div className="shrink-0">
                              {inv.status === 'pending' ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs">
                                  <Clock className="w-3 h-3 mr-1 text-amber-600 animate-spin" /> Chờ duyệt
                                </span>
                              ) : inv.status === 'approved' ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
                                  <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Đã chi
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-bold rounded-full bg-rose-50 text-rose-800 border border-rose-300 shadow-2xs">
                                  <X className="w-3.5 h-3.5 mr-1 text-rose-600" /> Từ chối
                                </span>
                              )}
                            </div>
                          </div>

                          {(inv.order_id ? (orders.find(o => o.id === inv.order_id)?.booker_phone || passengers.find(p => p.order_id === inv.order_id)?.phone) : null) && (
                            <div className="flex items-center justify-between text-xs pt-0.5">
                              <span className="text-[11px] text-slate-500 font-medium">Số điện thoại:</span>
                              <span className="text-rose-900 font-bold font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-rose-200">
                                📞 {orders.find(o => o.id === inv.order_id)?.booker_phone || passengers.find(p => p.order_id === inv.order_id)?.phone}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Collapsed summary line */}
                        {!isExpanded && (
                          <div className="text-[11px] text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100 mb-2">
                            <span className="truncate font-semibold block">
                              {parsedInfo.tourCode ? `Tour: ${parsedInfo.tourCode}` : (parsedInfo.cleanDescription ? parsedInfo.cleanDescription : 'Phiếu chi tiền')}
                            </span>
                          </div>
                        )}

                        {/* EXPANDABLE FULL PAYMENT DETAILS */}
                        {isExpanded && (
                          <div className="mt-3 space-y-3 pt-2 border-t border-gray-100 animate-fadeIn">
                            {/* Thông tin Tour du lịch */}
                            {(parsedInfo.tourCode || parsedInfo.tourName) && (
                              <div className="bg-blue-50/70 border border-blue-100/90 rounded-lg p-2.5 shadow-2xs">
                                <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                                  <Compass className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                  <span>Thông tin Tour</span>
                                </div>
                                <div className="text-xs space-y-1">
                                  {parsedInfo.tourCode && (
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] font-bold text-gray-500">Mã Tour:</span>
                                      <span className="font-mono font-black text-blue-900 bg-white px-1.5 py-0.5 rounded border border-blue-200 text-xs">
                                        {parsedInfo.tourCode}
                                      </span>
                                    </div>
                                  )}
                                  {parsedInfo.tourName && (
                                    <div className="flex items-start gap-1.5 text-gray-800 font-semibold leading-snug">
                                      <span className="text-[10px] font-bold text-gray-500 shrink-0 mt-0.5">Tên Tour:</span>
                                      <span>{parsedInfo.tourName}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Verification Detail */}
                            {inv.status === 'approved' && inv.verified_by && (
                              <div className="text-[10px] text-green-700 bg-green-50/50 p-2 rounded-lg border border-green-100 flex items-center justify-between font-semibold">
                                <span>Duyệt bởi: <strong>{inv.verified_by}</strong></span>
                                {inv.verified_at && <span>{format(new Date(inv.verified_at), 'dd/MM/yyyy')}</span>}
                              </div>
                            )}

                            {/* Order Association if available */}
                            {inv.order_id && (
                              <div className="text-[10px] text-blue-700 bg-blue-50/50 p-2 rounded-lg border border-blue-100 font-semibold flex items-center justify-between">
                                <span>Booking liên kết:</span>
                                <span 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const code = `#${inv.order_id.substring(0, 8).toUpperCase()}`;
                                    navigator.clipboard.writeText(code);
                                    toast.success(`Đã sao chép mã booking: ${code}`);
                                  }}
                                  className="font-mono bg-white px-1.5 py-0.5 rounded border border-blue-200 font-bold hover:bg-blue-50 hover:text-blue-900 cursor-pointer inline-flex items-center gap-1 group/copy transition-colors"
                                  title="Bấm để sao chép mã booking"
                                >
                                  #{inv.order_id.substring(0, 8).toUpperCase()}
                                  <Copy className="w-3 h-3 text-blue-400 group-hover/copy:text-blue-700 transition-colors" />
                                </span>
                              </div>
                            )}

                            {/* Description */}
                            <div className="bg-gray-50 rounded-lg p-2.5 text-xs text-gray-600 border border-gray-100">
                              <span className="font-bold text-gray-700 block mb-1">{inv.type === 'receipt' ? 'Lý do thu:' : 'Lý do chi:'}</span>
                              <p className="leading-relaxed break-words">
                                {parsedInfo.cleanDescription || 'Không có mô tả chi tiết'}
                              </p>
                            </div>

                            {/* Refund Method Info */}
                            {parsedInfo.method === 'transfer' && (
                              <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3">
                                <span className="text-blue-800 font-black uppercase text-[10px] tracking-wider block mb-2 border-b border-blue-200/50 pb-1">
                                  {inv.type === 'receipt' ? 'Thông tin nộp tiền qua Ngân hàng' : 'Thông tin chuyển khoản Ngân hàng'}
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <div>
                                    <span className="text-blue-500 font-bold text-[9px] uppercase tracking-wider block mb-0.5">Ngân hàng</span>
                                    <span className="font-semibold text-blue-950 text-xs">{parsedInfo.bankName || '---'}</span>
                                  </div>
                                  <div>
                                    <span className="text-blue-500 font-bold text-[9px] uppercase tracking-wider block mb-0.5">Số tài khoản</span>
                                    <span className="font-semibold text-blue-950 text-xs">{parsedInfo.accountNumber || '---'}</span>
                                  </div>
                                  <div>
                                    <span className="text-blue-500 font-bold text-[9px] uppercase tracking-wider block mb-0.5">Chủ tài khoản</span>
                                    <span className="font-bold text-blue-950 text-xs uppercase">{parsedInfo.accountName ? parsedInfo.accountName.toUpperCase() : '---'}</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {parsedInfo.method === 'cash' && (
                              <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-3">
                                <span className="text-amber-800 font-black uppercase text-[10px] tracking-wider block mb-1">
                                  Hoàn trả: Nhận tiền mặt
                                </span>
                                <p className="text-amber-700 text-xs font-semibold">Khách hàng nhận tiền mặt trực tiếp tại văn phòng.</p>
                              </div>
                            )}

                            {/* Minh chứng chuyển khoản cho phiếu chi */}
                            <div className="p-2.5 bg-slate-50/80 rounded-lg border border-gray-150 text-xs flex flex-col gap-2">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-gray-500 uppercase text-[10px]">Xác nhận</span>
                                {inv.file_url ? (
                                  <span className="text-[10px] bg-green-50 text-green-700 border border-green-200 font-bold px-1.5 py-0.5 rounded">
                                    Đã có minh chứng
                                  </span>
                                ) : (
                                  <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 font-bold px-1.5 py-0.5 rounded">
                                    Chưa có minh chứng
                                  </span>
                                )}
                              </div>

                              {inv.file_url ? (
                                <div className="flex items-center gap-2">
                                  <a
                                    href={inv.file_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors"
                                  >
                                    <FileText className="w-3.5 h-3.5" /> Xem ảnh xác nhận
                                  </a>
                                  {isAccountantOrAdmin && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setUploadProofTarget(inv);
                                      }}
                                      className="px-2.5 py-1.5 text-xs font-bold text-gray-600 bg-white hover:bg-gray-100 rounded-md border border-gray-200 transition-colors cursor-pointer"
                                      title="Cập nhật ảnh khác"
                                    >
                                      <Upload className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <div>
                                  {isAccountantOrAdmin ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setUploadProofTarget(inv);
                                      }}
                                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 rounded-md border border-gray-200 transition-colors cursor-pointer"
                                    >
                                      <Upload className="w-3.5 h-3.5 text-gray-500" /> Tải lên biên lai chuyển khoản
                                    </button>
                                  ) : (
                                    <span className="text-gray-400 italic block text-center py-1">Chưa cập nhật ảnh chuyển khoản</span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Accountant Actions */}
                            {isAccountantOrAdmin && inv.status === 'pending' && (
                              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                                <button
                                  type="button"
                                  onClick={() => setRejectPaymentTarget(inv)}
                                  className="flex items-center justify-center gap-1 py-1.5 px-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-lg transition-colors cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" /> Từ chối chi
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setApprovePaymentTarget(inv)}
                                  className="flex items-center justify-center gap-1 py-1.5 px-2 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm transition-colors cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" /> Phê duyệt chi
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Footer Actions & Info */}
                      <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400 font-medium">
                        <span className="flex items-center gap-1 text-gray-600 font-semibold truncate max-w-[150px]">
                          <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="truncate">{resolveCreatorName(inv.created_by, inv.order_id)}</span>
                        </span>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            {inv.created_at ? format(new Date(inv.created_at), 'dd/MM/yyyy') : '---'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    )}

      {/* Modal Xác nhận Duyệt Phiếu Thu */}
      {approveTarget && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl border border-gray-100 overflow-hidden transform transition-all">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 text-green-600 mx-auto mb-4">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-950 text-center mb-2">Xác nhận Đã nhận tiền</h3>
              <p className="text-sm text-gray-600 text-center">
                Bạn có chắc chắn xác nhận tài khoản công ty đã nhận số tiền{' '}
                <strong className="text-blue-600">
                  {new Intl.NumberFormat('vi-VN').format(approveTarget.amount)}đ
                </strong>{' '}
                cho booking{' '}
                <strong>
                  {approveTarget.orderCode}
                </strong>?
              </p>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setApproveTarget(null)}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await approveInvoiceReceipt(approveTarget.id, verifierName);
                    setApproveTarget(null);
                  } catch (err) {
                    toast.error('Gặp sự cố khi phê duyệt phiếu thu');
                  }
                }}
                className="px-4 py-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm transition-colors"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Từ chối Phiếu Thu */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl border border-gray-100 overflow-hidden transform transition-all">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto mb-4">
                <X className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-950 text-center mb-2">Từ chối Phiếu thu</h3>
              <p className="text-sm text-gray-600 text-center mb-4">
                Vui lòng nhập lý do từ chối phiếu thu cho booking{' '}
                <strong>
                  {rejectTarget.orderCode}
                </strong>:
              </p>
              
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-white"
                rows={3}
                placeholder="Ví dụ: Sai thông tin số tiền / hóa đơn không khớp..."
              />
            </div>
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setRejectTarget(null);
                  setRejectReason('Sai thông tin số tiền / hóa đơn không khớp');
                }}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!rejectReason.trim()) {
                    toast.error('Vui lòng nhập lý do từ chối');
                    return;
                  }
                  try {
                    await rejectInvoiceReceipt(rejectTarget.id, verifierName);
                    setRejectTarget(null);
                    setRejectReason('Sai thông tin số tiền / hóa đơn không khớp');
                  } catch (err) {
                    toast.error('Gặp sự cố khi từ chối phiếu thu');
                  }
                }}
                className="px-4 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors"
              >
                Từ chối
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xác nhận Duyệt Chi Phiếu Chi */}
      {approvePaymentTarget && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl border border-gray-100 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 text-green-600 mx-auto mb-4">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-950 text-center mb-2 font-sans tracking-tight">Xác nhận Duyệt chi tiền</h3>
              <p className="text-xs text-gray-600 text-center leading-relaxed">
                Bạn có chắc chắn muốn PHÊ DUYỆT và đánh dấu ĐÃ CHI cho phiếu chi{' '}
                <strong className="text-gray-900 font-mono">
                  {approvePaymentTarget.invoice_code}
                </strong>{' '}
                với số tiền{' '}
                <strong className="text-rose-600 font-black">
                  {new Intl.NumberFormat('vi-VN').format(approvePaymentTarget.amount)}đ
                </strong>? Hành động này sẽ cập nhật trực tiếp vào số dư booking liên quan nếu có.
              </p>

              {/* Thêm phần tải ảnh hóa đơn chuyển khoản chuyển tiền */}
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                <label className="text-xs font-extrabold text-gray-700 uppercase block text-left">
                  Ảnh hóa đơn/biên lai chuyển khoản (Khuyên dùng)
                </label>
                {!paymentFile ? (
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-3 text-center bg-gray-50/50 hover:bg-blue-50/50 hover:border-blue-400 transition-colors relative cursor-pointer group">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null;
                        setPaymentFile(f);
                        setPaymentFileName(f ? f.name : '');
                      }}
                    />
                    <div className="flex flex-col items-center justify-center gap-1.5 py-1">
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Upload className="w-4 h-4 text-blue-600" />
                      </div>
                      <p className="text-xs font-bold text-gray-700">
                        Nhấp hoặc kéo thả để chọn ảnh biên lai
                      </p>
                      <p className="text-[10px] text-gray-400">Định dạng hỗ trợ: JPG, PNG, PDF</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-emerald-50/80 border-2 border-emerald-300 rounded-xl p-3 text-left transition-all relative">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 rounded border border-emerald-300">
                              ✓ Đã chọn file
                            </span>
                            <span className="text-[10px] text-emerald-700 font-medium">
                              {paymentFile.size < 1024 * 1024 ? `${(paymentFile.size / 1024).toFixed(1)} KB` : `${(paymentFile.size / (1024 * 1024)).toFixed(2)} MB`}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-gray-900 truncate mt-0.5" title={paymentFile.name}>
                            {paymentFile.name}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <label className="p-1 px-2 text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors cursor-pointer flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          <span>Đổi</span>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0] || null;
                              setPaymentFile(f);
                              setPaymentFileName(f ? f.name : '');
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentFile(null);
                            setPaymentFileName('');
                          }}
                          className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          title="Xóa file đã chọn"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-100">
              <button
                type="button"
                disabled={isUploadingPaymentFile}
                onClick={() => {
                  setPaymentFile(null);
                  setPaymentFileName('');
                  setApprovePaymentTarget(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isUploadingPaymentFile}
                onClick={async () => {
                  setIsUploadingPaymentFile(true);
                  try {
                    let fileUrl = '';
                    if (paymentFile) {
                      const targetOrder = orders.find(o => o.id === approvePaymentTarget.order_id);
                      const targetTour = targetOrder ? tours.find(t => t.id === targetOrder.tour_id) : null;
                      const parsedInfo = parseRefundInfo(approvePaymentTarget, orders, tours);
                      const resolvedTourCode = targetTour?.code || parsedInfo.tourCode || '';

                      const formData = new FormData();
                      formData.append('file', paymentFile);
                      if (targetOrder) formData.append('orderCode', targetOrder.id.substring(0, 8));
                      if (resolvedTourCode) formData.append('tourCode', resolvedTourCode);
                      if (!targetOrder && !resolvedTourCode) formData.append('orderCode', 'CHIPHI_TOUR');

                      const resData = await safeFetchApi('/api/upload-invoice-receipt', {
                        method: 'POST',
                        body: formData,
                      });
                      fileUrl = resData.url;
                    }

                    await approveInvoiceReceipt(approvePaymentTarget.id, verifierName, fileUrl);
                    
                    // Reset state
                    setPaymentFile(null);
                    setPaymentFileName('');
                    setApprovePaymentTarget(null);
                  } catch (err: any) {
                    console.error(err);
                    toast.error(err.message || 'Gặp sự cố khi phê duyệt phiếu chi');
                  } finally {
                    setIsUploadingPaymentFile(false);
                  }
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isUploadingPaymentFile ? (
                  <>
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  'Duyệt & Chi tiền'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Từ chối Duyệt Chi Phiếu Chi */}
      {rejectPaymentTarget && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl border border-gray-100 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto mb-4">
                <X className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-950 text-center mb-2 font-sans tracking-tight">Từ chối Phiếu chi</h3>
              <p className="text-xs text-gray-600 text-center mb-4 leading-relaxed">
                Vui lòng nhập lý do từ chối phiếu chi{' '}
                <strong className="text-gray-900 font-mono">
                  {rejectPaymentTarget.invoice_code}
                </strong> ({new Intl.NumberFormat('vi-VN').format(rejectPaymentTarget.amount)}đ):
              </p>
              
              <textarea
                value={rejectPaymentReason}
                onChange={(e) => setRejectPaymentReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-900 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-white"
                rows={3}
                placeholder="Ví dụ: Đề xuất chi chưa chính xác hoặc thiếu chứng từ đối chiếu..."
              />
            </div>
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setRejectPaymentTarget(null);
                  setRejectPaymentReason('Đề xuất chi chưa chính xác hoặc thiếu chứng từ đối chiếu');
                }}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!rejectPaymentReason.trim()) {
                    toast.error('Vui lòng nhập lý do từ chối chi');
                    return;
                  }
                  try {
                    await rejectInvoiceReceipt(rejectPaymentTarget.id, verifierName);
                    setRejectPaymentTarget(null);
                    setRejectPaymentReason('Đề xuất chi chưa chính xác hoặc thiếu chứng từ đối chiếu');
                  } catch (err) {
                    toast.error('Gặp sự cố khi từ chối phiếu chi');
                  }
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                Từ chối chi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Upload,
  Search/Cập nhật minh chứng chuyển khoản */}
      {uploadProofTarget && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl border border-gray-100 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-600 mx-auto mb-4">
                <Upload className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-950 text-center mb-2 font-sans tracking-tight">Cập nhật ảnh chuyển khoản</h3>
              <p className="text-xs text-gray-600 text-center mb-4 leading-relaxed">
                Tải lên hóa đơn chuyển khoản (biên lai) cho phiếu chi{' '}
                <strong className="text-gray-900 font-mono">
                  {uploadProofTarget.invoice_code}
                </strong>{' '}
                với số tiền{' '}
                <strong className="text-rose-600 font-black">
                  {new Intl.NumberFormat('vi-VN').format(uploadProofTarget.amount)}đ
                </strong>.
              </p>

              <div className="space-y-2">
                {!paymentFile ? (
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center bg-gray-50/50 hover:bg-blue-50/50 hover:border-blue-400 transition-colors relative cursor-pointer group">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null;
                        setPaymentFile(f);
                        setPaymentFileName(f ? f.name : '');
                      }}
                    />
                    <div className="flex flex-col items-center justify-center gap-1.5 py-1">
                      <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Upload className="w-5 h-5 text-blue-600" />
                      </div>
                      <p className="text-xs font-bold text-gray-800">
                        Nhấp hoặc kéo thả để chọn ảnh biên lai mới
                      </p>
                      <p className="text-[10px] text-gray-400">Định dạng hỗ trợ: JPG, PNG, PDF</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-emerald-50/80 border-2 border-emerald-300 rounded-xl p-3 text-left transition-all relative">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 rounded border border-emerald-300">
                              ✓ Đã chọn file
                            </span>
                            <span className="text-[10px] text-emerald-700 font-medium">
                              {paymentFile.size < 1024 * 1024 ? `${(paymentFile.size / 1024).toFixed(1)} KB` : `${(paymentFile.size / (1024 * 1024)).toFixed(2)} MB`}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-gray-900 truncate mt-0.5" title={paymentFile.name}>
                            {paymentFile.name}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <label className="p-1 px-2 text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors cursor-pointer flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          <span>Đổi</span>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0] || null;
                              setPaymentFile(f);
                              setPaymentFileName(f ? f.name : '');
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentFile(null);
                            setPaymentFileName('');
                          }}
                          className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          title="Xóa file đã chọn"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-100">
              <button
                type="button"
                disabled={isUploadingPaymentFile}
                onClick={() => {
                  setPaymentFile(null);
                  setPaymentFileName('');
                  setUploadProofTarget(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={!paymentFile || isUploadingPaymentFile}
                onClick={async () => {
                  if (!paymentFile) return;
                  setIsUploadingPaymentFile(true);
                  try {
                    const targetOrder = orders.find(o => o.id === uploadProofTarget.order_id);
                    const targetTour = targetOrder ? tours.find(t => t.id === targetOrder.tour_id) : null;
                    const parsedInfo = parseRefundInfo(uploadProofTarget, orders, tours);
                    const resolvedTourCode = targetTour?.code || parsedInfo.tourCode || '';

                    const formData = new FormData();
                    formData.append('file', paymentFile);
                    if (targetOrder) formData.append('orderCode', targetOrder.id.substring(0, 8));
                    if (resolvedTourCode) formData.append('tourCode', resolvedTourCode);
                    if (!targetOrder && !resolvedTourCode) formData.append('orderCode', 'CHIPHI_TOUR');

                    const resData = await safeFetchApi('/api/upload-invoice-receipt', {
                      method: 'POST',
                      body: formData,
                    });
                    
                    await uploadInvoiceProof(uploadProofTarget.id, resData.url);
                    
                    // Reset state
                    setPaymentFile(null);
                    setPaymentFileName('');
                    setUploadProofTarget(null);
                  } catch (err: any) {
                    console.error(err);
                    toast.error(err.message || 'Gặp lỗi khi lưu minh chứng');
                  } finally {
                    setIsUploadingPaymentFile(false);
                  }
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isUploadingPaymentFile ? (
                  <>
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                    Đang tải lên...
                  </>
                ) : (
                  'Lưu minh chứng'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xác nhận Trạng thái Hóa đơn VAT */}
      {vatTarget && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl border border-gray-100 overflow-hidden transform transition-all">
            <div className="p-6">
              <div className={`flex items-center justify-center w-12 h-12 rounded-full mx-auto mb-4 ${
                vatTarget.targetStatus === 'issued' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
              }`}>
                {vatTarget.targetStatus === 'issued' ? <Check className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
              </div>
              <h3 className="text-lg font-bold text-gray-950 text-center mb-2">
                {vatTarget.targetStatus === 'issued' ? 'Xác nhận Đã viết VAT' : 'Đánh dấu Chưa viết VAT'}
              </h3>
              <p className="text-sm text-gray-600 text-center">
                {vatTarget.targetStatus === 'issued' 
                  ? `Bạn có chắc chắn muốn xác nhận ĐÃ XUẤT hóa đơn tài chính VAT đỏ cho booking ${vatTarget.orderCode}?`
                  : `Bạn có chắc chắn muốn đánh dấu booking ${vatTarget.orderCode} là CHƯA XUẤT hóa đơn VAT đỏ?`
                }
              </p>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setVatTarget(null)}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await updateInvoiceStatus(vatTarget.orderId, vatTarget.targetStatus);
                    toast.success('Cập nhật trạng thái hóa đơn thành công!');
                    setVatTarget(null);
                  } catch (err) {
                    toast.error('Gặp sự cố khi cập nhật trạng thái hóa đơn');
                  }
                }}
                className={`px-4 py-2 text-sm font-bold text-white rounded-lg shadow-sm transition-colors ${
                  vatTarget.targetStatus === 'issued' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tạo Phiếu Chi */}
      {isCreatePaymentModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl border border-gray-100 overflow-hidden transform transition-all">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">Tạo Phiếu Chi Mới</h3>
              <button 
                onClick={() => setIsCreatePaymentModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 bg-white hover:bg-gray-100 rounded-full p-1.5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Số tiền chi <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    value={newPaymentData.amount}
                    onChange={(e) => setNewPaymentData({ ...newPaymentData, amount: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="Nhập số tiền..."
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">VND</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Lý do chi <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={newPaymentData.description}
                  onChange={(e) => setNewPaymentData({ ...newPaymentData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  rows={3}
                  placeholder="Ví dụ: Hoàn tiền khách hủy tour, chi phí marketing..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Phương thức <span className="text-rose-500">*</span>
                </label>
                <select
                  value={newPaymentData.payment_method}
                  onChange={(e) => setNewPaymentData({ ...newPaymentData, payment_method: e.target.value })}
                  className="w-full h-9 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all bg-white cursor-pointer"
                >
                  <option value="Chuyển khoản">Chuyển khoản</option>
                  <option value="Tiền mặt">Tiền mặt</option>
                </select>
              </div>

              {newPaymentData.payment_method === 'Chuyển khoản' && (
                <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-150 space-y-3">
                  <div className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                    Thông tin tài khoản nhận chuyển khoản
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Tên Ngân hàng <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        placeholder="VD: Vietcombank, Techcombank..."
                        value={newPaymentData.refund_bank_name}
                        onChange={(e) => setNewPaymentData({ ...newPaymentData, refund_bank_name: e.target.value })}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white font-medium focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Số tài khoản <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        placeholder="VD: 10123456789..."
                        value={newPaymentData.refund_account_number}
                        onChange={(e) => setNewPaymentData({ ...newPaymentData, refund_account_number: e.target.value })}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white font-mono font-bold text-gray-900 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Chủ tài khoản <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        placeholder="VD: NGUYEN VAN A..."
                        value={newPaymentData.refund_account_name}
                        onChange={(e) => setNewPaymentData({ ...newPaymentData, refund_account_name: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white font-bold text-gray-900 uppercase focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsCreatePaymentModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!newPaymentData.amount || Number(newPaymentData.amount) <= 0) {
                    toast.error('Vui lòng nhập số tiền hợp lệ');
                    return;
                  }
                  if (!newPaymentData.description.trim()) {
                    toast.error('Vui lòng nhập lý do chi');
                    return;
                  }
                  if (newPaymentData.payment_method === 'Chuyển khoản') {
                    if (!newPaymentData.refund_bank_name.trim() || !newPaymentData.refund_account_number.trim() || !newPaymentData.refund_account_name.trim()) {
                      toast.error('Vui lòng điền đầy đủ thông tin tài khoản chuyển khoản!');
                      return;
                    }
                  }
                  
                  try {
                    await createInvoiceReceipt({
                      order_id: newPaymentData.order_id,
                      amount: Number(newPaymentData.amount),
                      description: newPaymentData.description.trim(),
                      payment_method: newPaymentData.payment_method,
                      type: 'payment',
                      refund_method: newPaymentData.payment_method === 'Chuyển khoản' ? 'transfer' : 'cash',
                      refund_bank_name: newPaymentData.refund_bank_name,
                      refund_account_number: newPaymentData.refund_account_number,
                      refund_account_name: newPaymentData.refund_account_name,
                      created_by: profile?.full_name || 'Admin',
                    });
                    
                    toast.success('Tạo phiếu chi thành công!');
                    setIsCreatePaymentModalOpen(false);
                    setNewPaymentData({ 
                      amount: '', 
                      description: '', 
                      payment_method: 'Chuyển khoản', 
                      order_id: null,
                      refund_bank_name: '',
                      refund_account_number: '',
                      refund_account_name: '' 
                    });
                  } catch (error) {
                    toast.error('Gặp sự cố khi tạo phiếu chi');
                  }
                }}
                className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
              >
                Tạo Phiếu Chi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CHI TIẾT PHIẾU THU */}
      {selectedReceiptDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-fadeIn border border-slate-100">
            <div className="bg-emerald-700 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-200" />
                <h3 className="font-extrabold text-base">Chi tiết Phiếu Thu Chuyển Khoản</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReceiptDetail(null)}
                className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {(() => {
                const inv = selectedReceiptDetail;
                const parsedInfo = parseRefundInfo(inv, orders, tours);
                const order = inv.order_id ? orders.find(o => o.id === inv.order_id) : null;
                const tour = order ? tours.find(t => t.id === order.tour_id) : null;
                const tourCode = tour?.code || parsedInfo.tourCode;
                const tourName = tour?.name || parsedInfo.tourName;
                const orderPassengers = order ? passengers.filter(p => p.order_id === order.id) : [];
                const leadPassenger = orderPassengers.find(p => p.is_payer) || orderPassengers[0];
                const leadName = (order?.booker_name && !order.booker_name.includes('Giữ chỗ tạm'))
                  ? order.booker_name
                  : (leadPassenger?.full_name || 'Khách trưởng đoàn');
                const phone = order?.booker_phone || leadPassenger?.phone || '';
                const orderCode = order ? order.id.substring(0, 8).toUpperCase() : (inv.order_id ? inv.order_id.substring(0, 8).toUpperCase() : '');

                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between bg-emerald-50 p-3.5 rounded-xl border border-emerald-200">
                      <div>
                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Số tiền thu</span>
                        <span className="text-xl font-black text-emerald-800">+{new Intl.NumberFormat('vi-VN').format(inv.amount)}đ</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Trạng thái</span>
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          inv.status === 'approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                          inv.status === 'rejected' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                          'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}>
                          {inv.status === 'approved' ? 'Công ty đã nhận' : inv.status === 'rejected' ? 'Bị từ chối' : 'Chờ phê duyệt'}
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-bold">Mã phiếu thu:</span>
                        <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">{inv.invoice_code || 'Chưa cấp'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-bold">Khách đặt / Đại lý:</span>
                        <span className="font-bold text-slate-900">{leadName} {phone && `(${phone})`}</span>
                      </div>
                      {orderCode && (
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-bold">Mã Booking:</span>
                          <span className="font-mono font-bold text-blue-700">#{orderCode}</span>
                        </div>
                      )}
                      {(tourCode || tourName) && (
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-bold">Tour:</span>
                          <span className="font-bold text-slate-800 truncate max-w-[200px]">{tourCode ? `${tourCode} - ${tourName || ''}` : tourName}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-bold">Phương thức:</span>
                        <span className="font-semibold text-slate-800">{inv.payment_method || 'Chuyển khoản'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-bold">Người tạo:</span>
                        <span className="font-semibold text-slate-800">{resolveCreatorName(inv.created_by, inv.order_id)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-bold">Ngày tạo:</span>
                        <span className="font-medium text-slate-700">{inv.created_at ? format(new Date(inv.created_at), 'HH:mm dd/MM/yyyy') : '---'}</span>
                      </div>
                    </div>

                    {inv.description && (
                      <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-150 text-xs">
                        <span className="font-bold text-blue-900 block mb-1">Ghi chú & Đợt nộp:</span>
                        <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{inv.description}</p>
                      </div>
                    )}

                    {inv.file_url && (
                      <div className="space-y-1.5">
                        <span className="text-xs font-bold text-slate-700 block">Hình ảnh xác nhận chuyển khoản:</span>
                        <a
                          href={inv.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold border border-blue-200 transition-colors"
                        >
                          <FileText className="w-4 h-4 text-blue-600" /> Xem ảnh chuyển khoản chi tiết
                        </a>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-t border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedReceiptDetail(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Đóng
              </button>

              {selectedReceiptDetail?.status === 'pending' && isAccountantOrAdmin && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const inv = selectedReceiptDetail;
                      const order = inv.order_id ? orders.find(o => o.id === inv.order_id) : null;
                      const orderCode = order ? order.id.substring(0, 8).toUpperCase() : (inv.order_id ? inv.order_id.substring(0, 8).toUpperCase() : '');
                      setSelectedReceiptDetail(null);
                      setRejectTarget({ id: inv.id, orderCode: orderCode || 'N/A' });
                    }}
                    className="px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors cursor-pointer"
                  >
                    Từ chối
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const inv = selectedReceiptDetail;
                      const order = inv.order_id ? orders.find(o => o.id === inv.order_id) : null;
                      const orderCode = order ? order.id.substring(0, 8).toUpperCase() : (inv.order_id ? inv.order_id.substring(0, 8).toUpperCase() : '');
                      setSelectedReceiptDetail(null);
                      setApproveTarget({ id: inv.id, amount: inv.amount, orderCode: orderCode || 'N/A' });
                    }}
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors cursor-pointer"
                  >
                    Phê duyệt thu
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CHI TIẾT YÊU CẦU VAT */}
      {selectedVatDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-fadeIn border border-slate-100">
            <div className="bg-blue-900 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-300" />
                <h3 className="font-extrabold text-base">Chi tiết Yêu cầu Xuất Hóa Đơn VAT</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVatDetail(null)}
                className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {(() => {
                const order = selectedVatDetail;
                const orderCode = order.id.substring(0, 8).toUpperCase();
                const tour = tours.find(t => t.id === order.tour_id);

                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between bg-blue-50 p-3.5 rounded-xl border border-blue-200">
                      <div>
                        <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Mã Đơn Hàng</span>
                        <span className="text-lg font-black text-blue-950 font-mono">#{orderCode}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Tổng giá trị đơn (Đã gồm VAT)</span>
                        <span className="text-base font-black text-slate-900">{new Intl.NumberFormat('vi-VN').format(order.total_price)}đ</span>
                        <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-end gap-2">
                          <span>Trước thuế: <b className="text-slate-800">{new Intl.NumberFormat('vi-VN').format(Math.round(order.total_price / 1.1))}đ</b></span>
                          <span>•</span>
                          <span>VAT 10%: <b className="text-emerald-700">{new Intl.NumberFormat('vi-VN').format(order.total_price - Math.round(order.total_price / 1.1))}đ</b></span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-bold">Người đặt tour:</span>
                        <span className="font-bold text-slate-900">{order.booker_name || 'Khách lẻ'} {order.booker_phone && `(${order.booker_phone})`}</span>
                      </div>
                      {tour?.code && (
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-bold">Tour:</span>
                          <span className="font-bold text-slate-800">{tour.code} - {tour.name}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-bold">Trạng thái VAT:</span>
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          order.invoice_status === 'issued' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}>
                          {order.invoice_status === 'issued' ? 'Đã xuất VAT' : 'Chờ xuất VAT'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-bold">Người tạo:</span>
                        <span className="font-semibold text-slate-800">{resolveCreatorName(order.created_by, order.id)}</span>
                      </div>
                    </div>

                    <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 space-y-2.5">
                      <div className="text-xs font-black text-blue-950 uppercase tracking-wider border-b border-blue-200 pb-1.5 flex items-center gap-1.5">
                        🏢 Thông tin xuất hóa đơn doanh nghiệp
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-500 font-bold uppercase">Tên Công ty / Đơn vị:</span>
                        <span className="font-extrabold text-slate-900 text-sm select-all">{order.vat_company_name || 'Chưa nhập'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-500 font-bold uppercase">Mã số thuế (MST):</span>
                        <span className="font-mono font-black text-blue-900 bg-white px-2 py-0.5 rounded border border-blue-200 inline-block text-xs select-all">{order.vat_tax_code || 'Chưa nhập'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-500 font-bold uppercase">Địa chỉ công ty:</span>
                        <span className="font-medium text-slate-800 select-all">{order.vat_address || 'Chưa nhập'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-500 font-bold uppercase">Email nhận hóa đơn:</span>
                        <span className="font-mono font-bold text-slate-800 select-all">{order.vat_email || 'Chưa nhập'}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-t border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedVatDetail(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Đóng
              </button>

              {isAccountantOrAdmin && selectedVatDetail && (
                <button
                  type="button"
                  onClick={() => {
                    const order = selectedVatDetail;
                    const orderCode = order.id.substring(0, 8).toUpperCase();
                    const targetStatus = order.invoice_status === 'pending' ? 'issued' : 'pending';
                    setSelectedVatDetail(null);
                    setVatTarget({ orderId: order.id, orderCode, targetStatus });
                  }}
                  className={`px-4 py-2 text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer ${
                    selectedVatDetail.invoice_status === 'pending'
                      ? 'text-white bg-emerald-600 hover:bg-emerald-700'
                      : 'text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300'
                  }`}
                >
                  {selectedVatDetail.invoice_status === 'pending' ? 'Xác nhận đã xuất VAT' : 'Đánh dấu chưa xuất VAT'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CHI TIẾT PHIẾU CHI */}
      {selectedPaymentDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-fadeIn border border-slate-100">
            <div className="bg-rose-700 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-rose-200" />
                <h3 className="font-extrabold text-base">Chi tiết Phiếu Chi & Hoàn Tiền</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPaymentDetail(null)}
                className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {(() => {
                const inv = selectedPaymentDetail;
                const parsedInfo = parseRefundInfo(inv, orders, tours);
                const order = inv.order_id ? orders.find(o => o.id === inv.order_id) : null;
                const orderCode = order ? order.id.substring(0, 8).toUpperCase() : (inv.order_id ? inv.order_id.substring(0, 8).toUpperCase() : '');

                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between bg-rose-50 p-3.5 rounded-xl border border-rose-200">
                      <div>
                        <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">Số tiền chi</span>
                        <span className="text-xl font-black text-rose-800">-{new Intl.NumberFormat('vi-VN').format(inv.amount)}đ</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Trạng thái</span>
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          inv.status === 'approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                          inv.status === 'rejected' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                          'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}>
                          {inv.status === 'approved' ? 'Đã duyệt chi' : inv.status === 'rejected' ? 'Bị từ chối' : 'Chờ duyệt chi'}
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-bold">Mã phiếu chi:</span>
                        <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">{inv.invoice_code || 'Chưa cấp'}</span>
                      </div>
                      {orderCode && (
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-bold">Mã Booking:</span>
                          <span className="font-mono font-bold text-blue-700">#{orderCode}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-bold">Phương thức chi:</span>
                        <span className="font-semibold text-slate-800">{inv.payment_method || 'Chuyển khoản'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-bold">Người tạo đề xuất:</span>
                        <span className="font-semibold text-slate-800">{resolveCreatorName(inv.created_by, inv.order_id)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-bold">Ngày tạo:</span>
                        <span className="font-medium text-slate-700">{inv.created_at ? format(new Date(inv.created_at), 'HH:mm dd/MM/yyyy') : '---'}</span>
                      </div>
                    </div>

                    {inv.description && (
                      <div className="bg-rose-50/60 p-3 rounded-xl border border-rose-150 text-xs">
                        <span className="font-bold text-rose-900 block mb-1">Nội dung / Lý do chi:</span>
                        <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{inv.description}</p>
                      </div>
                    )}

                    {parsedInfo.bankName && (
                      <div className="bg-amber-50/80 p-3.5 rounded-xl border border-amber-200 text-xs space-y-1">
                        <span className="font-black text-amber-950 block uppercase tracking-wider text-[10px]">🏦 Tài khoản nhận tiền</span>
                        <div className="font-mono font-bold text-slate-900">{parsedInfo.bankName} - {parsedInfo.accountNumber}</div>
                        <div className="font-bold text-slate-800 uppercase">{parsedInfo.accountName}</div>
                      </div>
                    )}

                    {inv.file_url && (
                      <div className="space-y-1.5">
                        <span className="text-xs font-bold text-slate-700 block">Hình ảnh minh chứng chi:</span>
                        <a
                          href={inv.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold border border-blue-200 transition-colors"
                        >
                          <FileText className="w-4 h-4 text-blue-600" /> Xem ảnh minh chứng chi
                        </a>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-t border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedPaymentDetail(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Đóng
              </button>

              {selectedPaymentDetail?.status === 'pending' && isAccountantOrAdmin && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const inv = selectedPaymentDetail;
                      setSelectedPaymentDetail(null);
                      setRejectPaymentTarget(inv);
                    }}
                    className="px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors cursor-pointer"
                  >
                    Từ chối
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const inv = selectedPaymentDetail;
                      setSelectedPaymentDetail(null);
                      setApprovePaymentTarget(inv);
                    }}
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors cursor-pointer"
                  >
                    Phê duyệt chi
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
