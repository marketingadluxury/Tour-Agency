import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import Select from 'react-select';
import { useCRM, canUnlockOrder, isOrderLocked } from '@/context/CRMContext';
import { useAuth } from '@/context/AuthContext';
import { Order, Passenger } from '@/types';
import { ShoppingCart, User, Users, Clock, FileText, Check, X, Plus, ChevronDown, ChevronUp, ChevronRight, ShieldCheck, Trash2, Info, Edit, ExternalLink, AlertCircle, Search, CreditCard, DollarSign, TrendingUp, UploadCloud, CheckCircle, Eye, Upload, Lock, Unlock, Copy, Filter, RotateCcw, Layers, List, Calendar, MapPin, Building, Coins, Phone, Share2, Megaphone, UserCheck, Globe, Printer } from 'lucide-react';
import { format, differenceInHours } from 'date-fns';
import ActionModal from '../components/ActionModal';
import PassengerInputModal from '../components/PassengerInputModal';
import EditPassengerModal from '../components/EditPassengerModal';
import EditOrderModal from '../components/EditOrderModal';
import PaymentModal from '../components/PaymentModal';
import { TourContractPrintModal } from '../components/orders/TourContractPrintModal';
import { PassengerDocumentList } from '../components/PassengerDocumentList';
import { TimeRangeFilter } from '../components/TimeRangeFilter';
import { CustomSelect } from '../components/CustomSelect';
import { isDateInTimeRange } from '../lib/dateUtils';
import { safeFetchApi } from '../lib/utils';

export default function OrdersManagement() {
  const location = useLocation();
  const { tours, orders: allOrders, passengers, invoices, createOrder, cancelOrder, requestExtension, handleExtensionRequest, confirmOrder, updatePassenger, addPassengersToOrder, deletePassenger, updateOrder, createInvoiceReceipt, currentRole, profilesList } = useCRM();
  const { profile, user } = useAuth();

  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [orderFilterStatus, setOrderFilterStatus] = useState('hold');
  const [orderFilterTimeRange, setOrderFilterTimeRange] = useState('this_month');
  const [orderFilterStartDate, setOrderFilterStartDate] = useState('');
  const [orderFilterEndDate, setOrderFilterEndDate] = useState('');
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
  const [orderSortBy, setOrderSortBy] = useState('newest');
  const [orderFilterTourId, setOrderFilterTourId] = useState('all');
  const [orderFilterCreator, setOrderFilterCreator] = useState('all');
  const [orderFilterPaymentStatus, setOrderFilterPaymentStatus] = useState('all');
  const [orderFilterHoldStatus, setOrderFilterHoldStatus] = useState('all');
  const [contractUploadProgress, setContractUploadProgress] = useState<Record<string, boolean>>({});
  const [contractPrintOrder, setContractPrintOrder] = useState<Order | null>(null);

  // Overview Stats Detail Modal state
  const [overviewModalType, setOverviewModalType] = useState<'hold' | 'sure' | 'revenue' | 'paid' | 'remaining' | null>(null);
  const [overviewModalViewMode, setOverviewModalViewMode] = useState<'tour' | 'order'>('tour');
  const [overviewModalSearch, setOverviewModalSearch] = useState('');

  const handleUploadContract = async (orderId: string, orderCode: string, file: File) => {
    setContractUploadProgress(prev => ({ ...prev, [orderId]: true }));
    const toastId = toast.loading(`Đang tải hợp đồng của booking ${orderCode || orderId.substring(0,8)}...`);
    try {
      const targetOrder = allOrders.find(o => o.id === orderId);
      const targetTour = targetOrder ? tours.find(t => t.id === targetOrder.tour_id) : null;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('orderCode', orderId);
      if (targetTour?.code) {
        formData.append('tourCode', targetTour.code);
      }

      const resData = await safeFetchApi('/api/upload-invoice-receipt', {
        method: 'POST',
        body: formData,
      });
      await updateOrder(orderId, { contract_url: resData.url });
      toast.success('Tải lên hợp đồng thành công!', { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Gặp lỗi khi tải lên hợp đồng', { id: toastId });
    } finally {
      setContractUploadProgress(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const handleDeleteContract = async (orderId: string) => {
    const toastId = toast.loading('Đang gỡ hợp đồng...');
    try {
      await updateOrder(orderId, { contract_url: undefined });
      toast.success('Đã gỡ hợp đồng thành công!', { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Lỗi khi gỡ hợp đồng', { id: toastId });
    }
  };

  const handleCopyOrderCode = (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation();
    const cleanCode = orderId.substring(0, 8).toUpperCase();
    navigator.clipboard.writeText(cleanCode);
    toast.success(`Đã sao chép mã đơn hàng: ${cleanCode}`);
  };

  const isOrderInLeaderTeam = React.useCallback((o: any, leaderProfile: any, profiles: any[]) => {
    if (!leaderProfile) return false;

    // 1. Created by leader directly
    const isCreatedByLeader =
      (o.user_id && o.user_id === leaderProfile.id) ||
      (o.salesperson_id && o.salesperson_id === leaderProfile.id) ||
      (o.created_by && leaderProfile.full_name && o.created_by.toLowerCase().trim() === leaderProfile.full_name.toLowerCase().trim()) ||
      (o.created_by && leaderProfile.email && o.created_by.toLowerCase().trim() === leaderProfile.email.toLowerCase().trim());

    if (isCreatedByLeader) return true;

    // 2. Created by a team member whose leader_id === leaderProfile.id
    const creatorProfile = profiles.find(p =>
      (p.id && o.user_id && p.id === o.user_id) ||
      (p.id && o.salesperson_id && p.id === o.salesperson_id) ||
      (p.full_name && o.created_by && p.full_name.toLowerCase().trim() === o.created_by.toLowerCase().trim()) ||
      (p.email && o.created_by && p.email.toLowerCase().trim() === o.created_by.toLowerCase().trim())
    );

    return Boolean(creatorProfile && creatorProfile.leader_id === leaderProfile.id);
  }, []);

  const tourFilterOptions = React.useMemo(() => {
    return tours
      .filter(t => t.tour_type !== 'visa')
      .sort((a, b) => (a.code || '').localeCompare(b.code || ''));
  }, [tours]);

  const uniqueCreators = React.useMemo(() => {
    const creatorsSet = new Set<string>();
    let baseOrders = ['admin', 'operator', 'bod'].includes(currentRole)
      ? allOrders
      : currentRole === 'sale_leader'
      ? allOrders.filter(o => isOrderInLeaderTeam(o, profile, profilesList))
      : allOrders.filter(o => o.user_id === profile?.id || (o.created_by && profile?.full_name && o.created_by.toLowerCase().trim() === profile.full_name.toLowerCase().trim()));

    baseOrders.forEach(o => {
      if (o.created_by) creatorsSet.add(o.created_by);
    });
    return Array.from(creatorsSet).sort();
  }, [allOrders, currentRole, profile, profilesList, isOrderInLeaderTeam]);

  const orders = React.useMemo(() => {
    // 1. Filter by role/ownership
    let filtered = ['admin', 'operator', 'bod'].includes(currentRole)
      ? allOrders
      : currentRole === 'sale_leader'
      ? allOrders.filter(o => isOrderInLeaderTeam(o, profile, profilesList))
      : allOrders.filter(o => o.user_id === profile?.id || (o.created_by && profile?.full_name && o.created_by.toLowerCase().trim() === profile.full_name.toLowerCase().trim()));

    // 2. Filter out Visa-only service orders (separation of concerns)
    filtered = filtered.filter(o => {
      const tour = tours.find(t => t.id === o.tour_id);
      return tour?.tour_type !== 'visa';
    });

    // 3. Search term filter (code, booker_name, booker_phone, tour code, tour name, creator)
    if (orderSearchTerm.trim() !== '') {
      const rawQ = orderSearchTerm.toLowerCase().trim();
      const q = rawQ.replace(/^#/, '').replace(/^bk-/i, '');
      filtered = filtered.filter(o => {
        const tour = tours.find(t => t.id === o.tour_id);
        const nameMatch = o.booker_name && o.booker_name.toLowerCase().includes(rawQ);
        const phoneMatch = o.booker_phone && o.booker_phone.includes(rawQ);
        const codeMatch = o.id && (o.id.toLowerCase().includes(q) || o.id.toLowerCase().includes(rawQ));
        const tourCodeMatch = tour && tour.code && tour.code.toLowerCase().includes(rawQ);
        const tourNameMatch = tour && tour.name && tour.name.toLowerCase().includes(rawQ);
        const creatorMatch = o.created_by && o.created_by.toLowerCase().includes(rawQ);
        return nameMatch || phoneMatch || codeMatch || tourCodeMatch || tourNameMatch || creatorMatch;
      });
    }

    // 4. Tour filter
    if (orderFilterTourId !== 'all') {
      filtered = filtered.filter(o => o.tour_id === orderFilterTourId);
    }

    // 5. Creator / Sale filter
    if (orderFilterCreator !== 'all') {
      filtered = filtered.filter(o => (o.created_by || '').toLowerCase() === orderFilterCreator.toLowerCase());
    }

    // 6. Payment Status filter
    if (orderFilterPaymentStatus !== 'all') {
      filtered = filtered.filter(o => {
        const totalP = o.total_price || 0;
        const orderInvoices = invoices.filter(inv => inv.order_id === o.id);
        const paidA = orderInvoices
          .filter(inv => inv.type === 'receipt' && inv.status === 'approved')
          .reduce((s, inv) => s + inv.amount, 0) || o.paid_amount || 0;

        if (orderFilterPaymentStatus === 'unpaid') {
          return paidA <= 0;
        }
        if (orderFilterPaymentStatus === 'partially_paid') {
          return paidA > 0 && paidA < totalP;
        }
        if (orderFilterPaymentStatus === 'paid_full') {
          return paidA >= totalP && totalP > 0;
        }
        return true;
      });
    }

    // 7. Hold Status filter
    if (orderFilterHoldStatus !== 'all') {
      const now = new Date().getTime();
      filtered = filtered.filter(o => {
        if (o.status !== 'hold' || !o.hold_expiry) return false;
        const expTime = new Date(o.hold_expiry).getTime();
        const diffHours = (expTime - now) / (1000 * 3600);

        if (orderFilterHoldStatus === 'expiring_soon') {
          return diffHours > 0 && diffHours <= 6;
        }
        if (orderFilterHoldStatus === 'expired') {
          return diffHours <= 0;
        }
        return true;
      });
    }

    // 8. Status filter
    if (orderFilterStatus !== 'all') {
      filtered = filtered.filter(o => {
        if (orderFilterStatus === 'paid') {
          return o.status === 'paid' || o.status === 'sure';
        }
        if (orderFilterStatus === 'refund') {
          return o.status === 'cancelled' && invoices.some(inv => inv.order_id === o.id && inv.type === 'payment');
        }
        if (orderFilterStatus === 'cancelled') {
          return o.status === 'cancelled' && !invoices.some(inv => inv.order_id === o.id && inv.type === 'payment');
        }
        return o.status === orderFilterStatus;
      });
    }

    // 9. Time range filter
    if (orderFilterTimeRange !== 'all') {
      filtered = filtered.filter(o => {
        return isDateInTimeRange(o.created_at, orderFilterTimeRange, orderFilterStartDate, orderFilterEndDate);
      });
    }

    // Sort logic
    return [...filtered].sort((a, b) => {
      if (orderSortBy === 'newest') {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      } else if (orderSortBy === 'oldest') {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateA - dateB;
      } else if (orderSortBy === 'highest_price') {
        return (b.total_price || 0) - (a.total_price || 0);
      } else if (orderSortBy === 'lowest_price') {
        return (a.total_price || 0) - (b.total_price || 0);
      } else if (orderSortBy === 'hold_expiry') {
        const expA = a.hold_expiry ? new Date(a.hold_expiry).getTime() : Infinity;
        const expB = b.hold_expiry ? new Date(b.hold_expiry).getTime() : Infinity;
        return expA - expB;
      }
      return 0;
    });
  }, [allOrders, currentRole, profile, tours, orderSearchTerm, orderFilterStatus, orderFilterTimeRange, orderSortBy, invoices, orderFilterTourId, orderFilterCreator, orderFilterPaymentStatus, orderFilterHoldStatus]);

  const holdStatistics = React.useMemo(() => {
    const stats: Record<string, { orderCount: number; seatsHold: number; detailTours: Record<string, number> }> = {};

    allOrders.forEach(o => {
      if (o.status === 'hold') {
        const creator = o.created_by || 'Chưa rõ';
        const tour = tours.find(t => t.id === o.tour_id);
        const tourCode = tour?.code || 'Chưa rõ Tour';
        let seats = (o.adult_count !== undefined || o.child_count !== undefined)
          ? ((o.adult_count || 0) + (o.child_count || 0))
          : 0;
        if (seats === 0) {
          const pCount = passengers.filter(p => p.order_id === o.id).length;
          seats = pCount > 0 ? pCount : 1;
        }

        if (!stats[creator]) {
          stats[creator] = {
            orderCount: 0,
            seatsHold: 0,
            detailTours: {}
          };
        }

        stats[creator].orderCount += 1;
        stats[creator].seatsHold += seats;
        stats[creator].detailTours[tourCode] = (stats[creator].detailTours[tourCode] || 0) + seats;
      }
    });

    return Object.entries(stats).map(([creator, data]) => ({
      creator,
      ...data
    })).sort((a, b) => b.seatsHold - a.seatsHold);
  }, [allOrders, tours, passengers]);

  const salesOverviewStats = React.useMemo(() => {
    // 1. Filter by role/ownership
    let baseOrders = ['admin', 'operator', 'bod'].includes(currentRole)
      ? allOrders
      : currentRole === 'sale_leader'
      ? allOrders.filter(o => isOrderInLeaderTeam(o, profile, profilesList))
      : allOrders.filter(o => o.user_id === profile?.id || (o.created_by && profile?.full_name && o.created_by.toLowerCase().trim() === profile.full_name.toLowerCase().trim()));

    // 2. Filter out Visa-only service orders
    baseOrders = baseOrders.filter(o => {
      const tour = tours.find(t => t.id === o.tour_id);
      return tour?.tour_type !== 'visa';
    });

    // 3. Search term filter
    if (orderSearchTerm.trim() !== '') {
      const rawQ = orderSearchTerm.toLowerCase().trim();
      const q = rawQ.replace(/^#/, '').replace(/^bk-/i, '');
      baseOrders = baseOrders.filter(o => {
        const tour = tours.find(t => t.id === o.tour_id);
        const nameMatch = o.booker_name && o.booker_name.toLowerCase().includes(rawQ);
        const phoneMatch = o.booker_phone && o.booker_phone.includes(rawQ);
        const codeMatch = o.id && (o.id.toLowerCase().includes(q) || o.id.toLowerCase().includes(rawQ));
        const tourCodeMatch = tour && tour.code && tour.code.toLowerCase().includes(rawQ);
        const tourNameMatch = tour && tour.name && tour.name.toLowerCase().includes(rawQ);
        const creatorMatch = o.created_by && o.created_by.toLowerCase().includes(rawQ);
        return nameMatch || phoneMatch || codeMatch || tourCodeMatch || tourNameMatch || creatorMatch;
      });
    }

    // 4. Tour filter
    if (orderFilterTourId !== 'all') {
      baseOrders = baseOrders.filter(o => o.tour_id === orderFilterTourId);
    }

    // 5. Creator filter
    if (orderFilterCreator !== 'all') {
      baseOrders = baseOrders.filter(o => (o.created_by || '').toLowerCase() === orderFilterCreator.toLowerCase());
    }

    // 6. Time range filter
    if (orderFilterTimeRange !== 'all') {
      baseOrders = baseOrders.filter(o => {
        return isDateInTimeRange(o.created_at, orderFilterTimeRange, orderFilterStartDate, orderFilterEndDate);
      });
    }

    const slotsHold = baseOrders
      .filter(o => o.status === 'hold')
      .reduce((sum, o) => {
        let count = (o.adult_count !== undefined || o.child_count !== undefined)
          ? ((o.adult_count || 0) + (o.child_count || 0))
          : 0;
        if (count === 0) {
          const pCount = passengers.filter(p => p.order_id === o.id).length;
          count = pCount > 0 ? pCount : 1;
        }
        return sum + count;
      }, 0);

    const slotsSure = baseOrders
      .filter(o => ['sure', 'paid'].includes(o.status))
      .reduce((sum, o) => {
        let count = (o.adult_count !== undefined || o.child_count !== undefined)
          ? ((o.adult_count || 0) + (o.child_count || 0))
          : 0;
        if (count === 0) {
          const pCount = passengers.filter(p => p.order_id === o.id).length;
          count = pCount > 0 ? pCount : 1;
        }
        return sum + count;
      }, 0);

    const totalRev = baseOrders
      .filter(o => ['sure', 'paid'].includes(o.status))
      .reduce((sum, o) => sum + (o.total_price || 0), 0);

    const totalPaid = baseOrders
      .filter(o => ['sure', 'paid'].includes(o.status))
      .reduce((sum, o) => {
        const orderInvoices = invoices.filter(inv => inv.order_id === o.id);
        const approvedPaid = orderInvoices
          .filter(inv => inv.type === 'receipt' && inv.status === 'approved')
          .reduce((s, inv) => s + inv.amount, 0);
        return sum + (approvedPaid || o.paid_amount || 0);
      }, 0);

    const totalRemaining = Math.max(0, totalRev - totalPaid);

    const holdOrdersCount = baseOrders.filter(o => o.status === 'hold').length;
    const sureOrdersCount = baseOrders.filter(o => ['sure', 'paid'].includes(o.status)).length;

    return {
      baseOrders,
      slotsHold,
      slotsSure,
      totalRevenue: totalRev,
      totalPaid,
      totalRemaining,
      holdOrdersCount,
      sureOrdersCount
    };
  }, [allOrders, currentRole, profile, profilesList, tours, invoices, orderSearchTerm, orderFilterTourId, orderFilterCreator, orderFilterTimeRange, passengers]);

  // Compute filtered orders and tour groups for the overview detail modal
  const overviewModalFilteredOrders = React.useMemo(() => {
    if (!overviewModalType || !salesOverviewStats.baseOrders) return [];
    let ordersList = salesOverviewStats.baseOrders;

    if (overviewModalType === 'hold') {
      ordersList = ordersList.filter(o => o.status === 'hold');
    } else if (overviewModalType === 'sure') {
      ordersList = ordersList.filter(o => ['sure', 'paid'].includes(o.status));
    } else if (overviewModalType === 'revenue') {
      ordersList = ordersList.filter(o => ['sure', 'paid'].includes(o.status));
    } else if (overviewModalType === 'paid') {
      ordersList = ordersList.filter(o => {
        if (!['sure', 'paid'].includes(o.status)) return false;
        const orderInvoices = invoices.filter(inv => inv.order_id === o.id);
        const approvedPaid = orderInvoices
          .filter(inv => inv.type === 'receipt' && inv.status === 'approved')
          .reduce((s, inv) => s + inv.amount, 0);
        return (approvedPaid || o.paid_amount || 0) > 0;
      });
    } else if (overviewModalType === 'remaining') {
      ordersList = ordersList.filter(o => {
        if (!['sure', 'paid'].includes(o.status)) return false;
        const orderInvoices = invoices.filter(inv => inv.order_id === o.id);
        const approvedPaid = orderInvoices
          .filter(inv => inv.type === 'receipt' && inv.status === 'approved')
          .reduce((s, inv) => s + inv.amount, 0);
        const paid = approvedPaid || o.paid_amount || 0;
        return ((o.total_price || 0) - paid) > 0;
      });
    }

    if (overviewModalSearch.trim() !== '') {
      const rawQ = overviewModalSearch.toLowerCase().trim();
      const q = rawQ.replace(/^#/, '').replace(/^bk-/i, '');
      ordersList = ordersList.filter(o => {
        const tour = tours.find(t => t.id === o.tour_id);
        return (
          (o.id && (o.id.toLowerCase().includes(q) || o.id.toLowerCase().includes(rawQ))) ||
          (o.booker_name && o.booker_name.toLowerCase().includes(rawQ)) ||
          (o.booker_phone && o.booker_phone.includes(rawQ)) ||
          (o.created_by && o.created_by.toLowerCase().includes(rawQ)) ||
          (tour && tour.code && tour.code.toLowerCase().includes(rawQ)) ||
          (tour && tour.name && tour.name.toLowerCase().includes(rawQ))
        );
      });
    }

    return ordersList;
  }, [overviewModalType, salesOverviewStats.baseOrders, overviewModalSearch, tours, invoices]);

  const overviewModalTourGroups = React.useMemo(() => {
    if (!overviewModalType || overviewModalFilteredOrders.length === 0) return [];

    const map = new Map<string, {
      tour: any;
      orders: Order[];
      totalSeats: number;
      totalPrice: number;
      totalPaid: number;
      totalRemaining: number;
    }>();

    overviewModalFilteredOrders.forEach(o => {
      const tour = tours.find(t => t.id === o.tour_id) || { id: o.tour_id || 'unassigned', name: 'Tour chưa gán mã / Khác', code: 'N/A' };
      const tId = tour.id;

      if (!map.has(tId)) {
        map.set(tId, {
          tour,
          orders: [],
          totalSeats: 0,
          totalPrice: 0,
          totalPaid: 0,
          totalRemaining: 0,
        });
      }

      const item = map.get(tId)!;
      item.orders.push(o);

      let seats = (o.adult_count !== undefined || o.child_count !== undefined)
        ? ((o.adult_count || 0) + (o.child_count || 0))
        : 0;
      if (seats === 0) {
        const pCount = passengers.filter(p => p.order_id === o.id).length;
        seats = pCount > 0 ? pCount : 1;
      }

      const orderInvoices = invoices.filter(inv => inv.order_id === o.id);
      const approvedPaid = orderInvoices
        .filter(inv => inv.type === 'receipt' && inv.status === 'approved')
        .reduce((s, inv) => s + inv.amount, 0);
      const paid = approvedPaid || o.paid_amount || 0;
      const price = o.total_price || 0;
      const rem = Math.max(0, price - paid);

      item.totalSeats += seats;
      item.totalPrice += price;
      item.totalPaid += paid;
      item.totalRemaining += rem;
    });

    return Array.from(map.values()).sort((a, b) => b.orders.length - a.orders.length);
  }, [overviewModalType, overviewModalFilteredOrders, tours, passengers, invoices]);

  // Tính số lượng đơn hàng cho từng tab (sau khi đã áp dụng tìm kiếm, lọc thời gian...)
  const tabCounts = React.useMemo(() => {
    // 1. Filter by role/ownership
    let base = ['admin', 'operator', 'bod'].includes(currentRole)
      ? allOrders
      : currentRole === 'sale_leader'
      ? allOrders.filter(o => isOrderInLeaderTeam(o, profile, profilesList))
      : allOrders.filter(o => o.user_id === profile?.id || (o.created_by && profile?.full_name && o.created_by.toLowerCase().trim() === profile.full_name.toLowerCase().trim()));

    // 2. Filter out Visa-only service orders
    base = base.filter(o => {
      const tour = tours.find(t => t.id === o.tour_id);
      return tour?.tour_type !== 'visa';
    });

    // 3. Search term filter
    if (orderSearchTerm.trim() !== '') {
      const rawQ = orderSearchTerm.toLowerCase().trim();
      const q = rawQ.replace(/^#/, '').replace(/^bk-/i, '');
      base = base.filter(o => {
        const tour = tours.find(t => t.id === o.tour_id);
        const nameMatch = o.booker_name && o.booker_name.toLowerCase().includes(rawQ);
        const phoneMatch = o.booker_phone && o.booker_phone.includes(rawQ);
        const codeMatch = o.id && (o.id.toLowerCase().includes(q) || o.id.toLowerCase().includes(rawQ));
        const tourCodeMatch = tour && tour.code && tour.code.toLowerCase().includes(rawQ);
        const tourNameMatch = tour && tour.name && tour.name.toLowerCase().includes(rawQ);
        const creatorMatch = o.created_by && o.created_by.toLowerCase().includes(rawQ);
        return nameMatch || phoneMatch || codeMatch || tourCodeMatch || tourNameMatch || creatorMatch;
      });
    }

    // 4. Tour filter
    if (orderFilterTourId !== 'all') {
      base = base.filter(o => o.tour_id === orderFilterTourId);
    }

    // 5. Creator filter
    if (orderFilterCreator !== 'all') {
      base = base.filter(o => (o.created_by || '').toLowerCase() === orderFilterCreator.toLowerCase());
    }

    // 6. Payment Status filter
    if (orderFilterPaymentStatus !== 'all') {
      base = base.filter(o => {
        const totalP = o.total_price || 0;
        const orderInvoices = invoices.filter(inv => inv.order_id === o.id);
        const paidA = orderInvoices
          .filter(inv => inv.type === 'receipt' && inv.status === 'approved')
          .reduce((s, inv) => s + inv.amount, 0) || o.paid_amount || 0;

        if (orderFilterPaymentStatus === 'unpaid') return paidA <= 0;
        if (orderFilterPaymentStatus === 'partially_paid') return paidA > 0 && paidA < totalP;
        if (orderFilterPaymentStatus === 'paid_full') return paidA >= totalP && totalP > 0;
        return true;
      });
    }

    // 7. Hold Status filter
    if (orderFilterHoldStatus !== 'all') {
      const now = new Date().getTime();
      base = base.filter(o => {
        if (o.status !== 'hold' || !o.hold_expiry) return false;
        const expTime = new Date(o.hold_expiry).getTime();
        const diffHours = (expTime - now) / (1000 * 3600);
        if (orderFilterHoldStatus === 'expiring_soon') return diffHours > 0 && diffHours <= 6;
        if (orderFilterHoldStatus === 'expired') return diffHours <= 0;
        return true;
      });
    }

    // 8. Time range filter
    if (orderFilterTimeRange !== 'all') {
      base = base.filter(o => {
        return isDateInTimeRange(o.created_at, orderFilterTimeRange, orderFilterStartDate, orderFilterEndDate);
      });
    }

    return {
      paid: base.filter(o => o.status === 'paid' || o.status === 'sure').length,
      hold: base.filter(o => o.status === 'hold').length,
      cancelled: base.filter(o => o.status === 'cancelled' && !invoices.some(inv => inv.order_id === o.id && inv.type === 'payment')).length,
      refund: base.filter(o => o.status === 'cancelled' && invoices.some(inv => inv.order_id === o.id && inv.type === 'payment')).length,
      total: base.length
    };
  }, [allOrders, currentRole, profile, tours, orderSearchTerm, orderFilterTimeRange, orderFilterStartDate, orderFilterEndDate, invoices, orderFilterTourId, orderFilterCreator, orderFilterPaymentStatus, orderFilterHoldStatus]);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [activeTabs, setActiveTabs] = useState<Record<string, 'details' | 'contact_info' | 'payment_history'>>({});
  const [isPassengerModalOpen, setIsPassengerModalOpen] = useState(false);
  const [orderToConfirm, setOrderToConfirm] = useState<string | null>(null);
  const [orderToAddPassengers, setOrderToAddPassengers] = useState<string | null>(null);
  const [editingPassenger, setEditingPassenger] = useState<Passenger | null>(null);
  const [isEditPassengerOpen, setIsEditPassengerOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null);
  const [disqualifiedReasonModal, setDisqualifiedReasonModal] = useState<{ name: string; reason: string } | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isEditOrderOpen, setIsEditOrderOpen] = useState(false);
  const [selectedInvoiceNote, setSelectedInvoiceNote] = useState<{ code: string; note: string } | null>(null);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [isCancelPaymentModalOpen, setIsCancelPaymentModalOpen] = useState(false);
  const [cancelPaymentOrder, setCancelPaymentOrder] = useState<Order | null>(null);
  const [cancelPaymentReason, setCancelPaymentReason] = useState('');
  const [cancelPaymentRefundAmount, setCancelPaymentRefundAmount] = useState<number>(0);
  const [cancelPaymentRefundInput, setCancelPaymentRefundInput] = useState('');
  const [cancelConfirmFile, setCancelConfirmFile] = useState<File | null>(null);
  const [cancelRefundMethod, setCancelRefundMethod] = useState<'cash' | 'transfer'>('transfer');
  const [cancelRefundBankName, setCancelRefundBankName] = useState('');
  const [cancelRefundAccountNumber, setCancelRefundAccountNumber] = useState('');
  const [cancelRefundAccountName, setCancelRefundAccountName] = useState('');
  const [isCancelUploading, setIsCancelUploading] = useState(false);
  const [confirmModalData, setConfirmModalData] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: (input?: string) => void;
    showInput?: boolean;
    inputPlaceholder?: string;
    inputLabel?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrderId(prev => prev === orderId ? null : orderId);
  };

  // Xử lý click từ thông báo
  useEffect(() => {
    if (location.state) {
      if (location.state.searchTarget) {
        setOrderSearchTerm(location.state.searchTarget);
        setOrderFilterStatus('all');
        setOrderFilterTimeRange('all');
        setOrderFilterTourId('all');
        setOrderFilterCreator('all');
        setOrderFilterPaymentStatus('all');
        setOrderFilterHoldStatus('all');
      }
      if (location.state.expandOrderId) {
        const found = allOrders.find(o => o.id === location.state.expandOrderId || o.id.startsWith(location.state.expandOrderId));
        if (found) {
          setExpandedOrderId(found.id);
        } else {
          setExpandedOrderId(location.state.expandOrderId);
        }
      }
      // Clear state để không tự nhảy lại khi F5
      window.history.replaceState({}, document.title);
    }
  }, [location.state, allOrders]);

  // New Order Form State
  const [selectedTourId, setSelectedTourId] = useState('');
  const [orderStatus, setOrderStatus] = useState<'hold' | 'sure'>('hold');

  // Booker/Representative
  const [bookerName, setBookerName] = useState('');
  const [bookerPhone, setBookerPhone] = useState('');
  const [suggestions, setSuggestions] = useState<Passenger[]>([]);
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

  // Get unique customers from passengers belonging to the user's orders (or all orders for admin/operator/visa)
  const uniqueCustomers = React.useMemo(() => {
    const isFullAccess = ['admin', 'operator', 'visa', 'bod'].includes(currentRole);
    const userOrderIds = new Set(
      isFullAccess 
        ? allOrders.map(o => o.id)
        : allOrders.filter(o => o.user_id === profile?.id || o.salesperson_id === profile?.id).map(o => o.id)
    );

    const map = new Map<string, Passenger>();
    passengers.forEach(p => {
      if (p.full_name && userOrderIds.has(p.order_id)) {
        const key = `${p.full_name.trim().toUpperCase()}|${p.phone ? normalizePhone(p.phone) : ''}`;
        if (!map.has(key)) {
          map.set(key, p);
        }
      }
    });
    return Array.from(map.values());
  }, [passengers, allOrders, currentRole, profile]);

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

  const selectSuggestion = (p: Passenger) => {
    setBookerName(p.full_name);
    setBookerPhone(p.phone || '');
    setSuggestions([]);
    setFocusedInput(null);
  };

  // Passenger counts
  const [adultCount, setAdultCount] = useState<number>(1);
  const [childCount, setChildCount] = useState<number>(0);
  const [infantCount, setInfantCount] = useState<number>(0);

  // Surcharges & Advanced
  const [singleRoomCount, setSingleRoomCount] = useState<number>(0);
  const [roomShareInfo, setRoomShareInfo] = useState<string>('Không ghép');
  const [specialRequests, setSpecialRequests] = useState<string>('');
  const [vatOption, setVatOption] = useState<string>('Không xuất VAT');
  const [vatCompanyName, setVatCompanyName] = useState<string>('');
  const [vatTaxCode, setVatTaxCode] = useState<string>('');
  const [vatAddress, setVatAddress] = useState<string>('');
  const [vatEmail, setVatEmail] = useState<string>('');
  const [ctvInfo, setCtvInfo] = useState<string>('');
  const [isCreatingForCTV, setIsCreatingForCTV] = useState<boolean>(false);
  const [customerSource, setCustomerSource] = useState<string>('Quảng cáo');

  const isAgentRole = (currentRole as string) === 'agent' || (profile?.role as string) === 'agent';
  const isSaleRole = !isAgentRole && (['sale', 'sale_leader', 'admin', 'bod'].includes(currentRole as string) || ['sale', 'sale_leader', 'admin', 'bod'].includes(profile?.role || ''));

  // Countdown timer for form completion
  const [countdown, setCountdown] = useState(300); // 5 minutes in seconds

  useEffect(() => {
    if (!showCreateForm) return;
    setCountdown(300);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setShowCreateForm(false);
          toast('Thời hạn nhập thông tin giữ chỗ (5 phút) đã hết! Form đặt chỗ đã tự động đóng để nhường tài nguyên hệ thống.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [showCreateForm]);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const selectedTour = tours.find(t => t.id === selectedTourId);

  const handleTourChange = (tourId: string) => {
    setSelectedTourId(tourId);
    if (!tourId) return;
    const targetTour = tours.find(t => t.id === tourId);
    if (!targetTour) return;

    if (targetTour.tour_type === 'private') {
      setAdultCount(targetTour.total_seats || 1);
      setChildCount(0);
      if (targetTour.organization_name) setBookerName(targetTour.organization_name);
      if (targetTour.group_leader_contact) setBookerPhone(targetTour.group_leader_contact);
      return;
    }

    const maxAllowed = Math.max(0, targetTour.total_seats + (targetTour.overbook_limit || 0) - targetTour.sold_seats - targetTour.hold_seats);
    if (adultCount + childCount > maxAllowed) {
      let newAdult = Math.min(adultCount, maxAllowed);
      if (newAdult < 1) newAdult = 1;
      const remainingForChild = maxAllowed - newAdult;
      const newChild = Math.min(childCount, remainingForChild);

      setAdultCount(newAdult);
      setChildCount(newChild);

      toast(`Tour mới chọn chỉ cho phép tối đa ${maxAllowed} chỗ (bao gồm cả overbooking được phê duyệt)! Số lượng khách đã được điều chỉnh về mức tối đa: ${newAdult} người lớn, ${newChild} trẻ em.`);
    }
  };

  const handleAdultCountChange = (val: number) => {
    if (!selectedTour) return;
    const maxAllowed = Math.max(0, selectedTour.total_seats + (selectedTour.overbook_limit || 0) - selectedTour.sold_seats - selectedTour.hold_seats);
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
    if (!selectedTour) return;
    const maxAllowed = Math.max(0, selectedTour.total_seats + (selectedTour.overbook_limit || 0) - selectedTour.sold_seats - selectedTour.hold_seats);
    const potentialTotal = adultCount + val;
    if (potentialTotal > maxAllowed) {
      const allowedChild = Math.max(0, maxAllowed - adultCount);
      setChildCount(allowedChild);
      toast.error(`Số lượng khách vượt quá số chỗ trống và overbooking cho phép! Hệ thống tự động giới hạn tối đa ${allowedChild} trẻ em (trong tổng số ${maxAllowed} chỗ khả dụng còn lại).`);
    } else {
      setChildCount(Math.max(0, val));
    }
  };

  const tourDiscount = selectedTour?.discount || 0;
  const rawPriceAdult = selectedTour ? (selectedTour.price_adult ?? selectedTour.price) : 0;
  const priceAdult = selectedTour ? Math.max(0, rawPriceAdult - tourDiscount) : 0;
  const priceChild = selectedTour ? Math.max(0, (selectedTour.price_child ?? Math.round(rawPriceAdult * 0.8)) - (selectedTour.price_child ? tourDiscount : Math.round(tourDiscount * 0.8))) : 0;
  const priceInfant = selectedTour ? Math.max(0, (selectedTour.price_infant ?? Math.round(rawPriceAdult * 0.3)) - (selectedTour.price_infant ? tourDiscount : Math.round(tourDiscount * 0.3))) : 0;
  const singleRoomSurcharge = selectedTour ? (selectedTour.single_room_surcharge ?? 7500000) : 0;

  const subtotalPrice = selectedTour
    ? (priceAdult * adultCount) + (priceChild * childCount) + (priceInfant * infantCount) + (singleRoomSurcharge * singleRoomCount)
    : 0;

  // Thuế VAT đã bao gồm trong giá tour
  const calculatedTotalPrice = subtotalPrice;
  const vatAmount = vatOption === 'Xuất VAT' ? Math.round(calculatedTotalPrice - (calculatedTotalPrice / 1.1)) : 0;

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTourId) {
      toast.error('Vui lòng chọn Tour khởi hành!');
      return;
    }

    if (!bookerName.trim() || !bookerPhone.trim()) {
      toast.error('Vui lòng nhập đầy đủ Họ và tên và Số điện thoại khách trưởng nhóm!');
      return;
    }

    const orderPassengers: any[] = [];
    const finalBookerName = bookerName.trim();
    const finalBookerPhone = bookerPhone.trim();

    // Create lead passenger
    orderPassengers.push({
      is_payer: true,
      full_name: finalBookerName,
      phone: finalBookerPhone,
      visa_status: 'pending'
    });

    // Add remaining adults
    for (let i = 1; i < adultCount; i++) {
      orderPassengers.push({
        is_payer: false,
        full_name: `Người lớn #${i + 1} (Đi cùng)`,
        visa_status: 'pending'
      });
    }

    // Add children
    for (let i = 0; i < childCount; i++) {
      orderPassengers.push({
        is_payer: false,
        full_name: `Trẻ em #${i + 1} (Đi cùng)`,
        visa_status: 'not_required'
      });
    }

    // Add infants
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

    const executeCreateOrder = () => {
      createOrder({
        tour_id: selectedTourId,
        status: orderStatus,
        total_price: calculatedTotalPrice,
        adult_price: priceAdult,
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
        is_locked: false,
        seller_type: currentRole === 'agent' ? 'agent' : 'direct',
      });

      // Reset Form
      setSelectedTourId('');
      setOrderStatus('hold');
      setBookerName('');
      setBookerPhone('');
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
      setShowCreateForm(false);
    };

    if (!['admin', 'sale_leader', 'bod', 'operator'].includes(currentRole)) {
      setConfirmModalData({
        isOpen: true,
        title: '🔒 Cảnh báo: Tự động khóa booking sau khi lưu',
        message: 'Sau khi lưu thông tin booking này, hệ thống sẽ TỰ ĐỘNG KHÓA các thông tin giá tiền, VAT, phụ thu & doanh thu để bảo vệ dữ liệu kế toán. Chỉ Quản trị viên (Admin) hoặc Sale Leader mới có quyền mở khóa. Bạn có chắc chắn muốn tiến hành tạo booking không?',
        onConfirm: executeCreateOrder
      });
      return;
    }

    executeCreateOrder();
  };

  // Helper to format remaining hold time
  const getRemainingHoldTime = (expiryString?: string) => {
    if (!expiryString) return null;
    const expiry = new Date(expiryString);
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();
    if (diffMs <= 0) return 'Đã hết hạn';

    const hours = Math.floor(diffMs / (3600 * 1000));
    const mins = Math.floor((diffMs % (3600 * 1000)) / (60 * 1000));
    return `${hours} giờ ${mins} phút`;
  };

  const getHoldTimeSeverity = (expiryString?: string) => {
    if (!expiryString) return 'normal';
    const expiry = new Date(expiryString);
    const now = new Date();
    const diffHours = differenceInHours(expiry, now);
    if (diffHours < 4) return 'danger';
    if (diffHours < 12) return 'warning';
    return 'normal';
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Quản lý Booking</h2>
          <p className="text-sm text-gray-500 mt-1">
            Giữ chỗ tạm thời, chốt chắc chắn (Sure) và theo dõi đếm ngược thời hạn giải phóng booking tự động.
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="inline-flex items-center px-4 py-2.5 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          {showCreateForm ? 'Đóng form' : 'Tạo Booking Mới'}
        </button>
      </div>

      {/* Overview Statistics Cards Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 sm:p-6 space-y-4 font-sans">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-gray-950 flex items-center gap-2 flex-wrap">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <span>Bảng Tổng quan Giữ chỗ & Doanh thu</span>
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                ['admin', 'operator', 'bod'].includes(currentRole)
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : currentRole === 'sale_leader'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-indigo-50 text-indigo-700 border-indigo-200'
              }`}>
                {['admin', 'operator', 'bod'].includes(currentRole)
                  ? 'Toàn hệ thống (Admin/BOD/Điều hành)'
                  : currentRole === 'sale_leader'
                  ? 'Nhóm / Team (Sale Leader)'
                  : 'Cá nhân (Sales/CTV)'}
              </span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Tổng số chỗ giữ tạm, số chỗ đã xác nhận chắc chắn, doanh số và dư nợ cần nộp.</p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {/* Quick Time Range Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-gray-200 rounded-lg px-2 py-1 text-xs shadow-2xs">
              <span className="text-gray-500 font-medium whitespace-nowrap">Thời gian:</span>
              <TimeRangeFilter
                value={orderFilterTimeRange}
                onChange={setOrderFilterTimeRange}
                startDate={orderFilterStartDate}
                onChangeStartDate={setOrderFilterStartDate}
                endDate={orderFilterEndDate}
                onChangeEndDate={setOrderFilterEndDate}
                selectClassName="bg-transparent font-bold text-blue-700 focus:outline-none cursor-pointer text-xs"
              />
            </div>

            {/* Reset filter button if active */}
            {(orderSearchTerm || orderFilterTourId !== 'all' || orderFilterCreator !== 'all' || orderFilterPaymentStatus !== 'all' || orderFilterHoldStatus !== 'all' || orderFilterTimeRange !== 'this_month' || orderSortBy !== 'newest') && (
              <button
                type="button"
                onClick={() => {
                  setOrderSearchTerm('');
                  setOrderFilterTourId('all');
                  setOrderFilterCreator('all');
                  setOrderFilterPaymentStatus('all');
                  setOrderFilterHoldStatus('all');
                  setOrderFilterTimeRange('this_month');
                  setOrderSortBy('newest');
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer border border-rose-200"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Xóa bộ lọc</span>
              </button>
            )}

            {/* Toggle Advanced Filter Button */}
            <button
              type="button"
              onClick={() => setIsAdvancedFilterOpen(!isAdvancedFilterOpen)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer border shadow-2xs ${
                isAdvancedFilterOpen || orderSearchTerm || orderFilterTourId !== 'all' || orderFilterCreator !== 'all' || orderFilterPaymentStatus !== 'all' || orderFilterHoldStatus !== 'all'
                  ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-sm'
                  : 'bg-white hover:bg-slate-50 text-gray-700 border-gray-300'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{isAdvancedFilterOpen ? 'Thu gọn bộ lọc' : 'Bộ lọc nâng cao'}</span>
              {(orderSearchTerm || orderFilterTourId !== 'all' || orderFilterCreator !== 'all' || orderFilterPaymentStatus !== 'all' || orderFilterHoldStatus !== 'all') && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
              {isAdvancedFilterOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Expanded Advanced Filter Panel right under the Top Header button */}
        {isAdvancedFilterOpen && (
          <div className="pt-3 border-b border-gray-200/80 pb-3.5 animate-fadeIn">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-extrabold text-blue-800 flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-blue-600" />
                <span>Bộ lọc tìm kiếm nâng cao</span>
                {(orderSearchTerm || orderFilterTourId !== 'all' || orderFilterCreator !== 'all' || orderFilterPaymentStatus !== 'all' || orderFilterHoldStatus !== 'all' || orderFilterTimeRange !== 'this_month' || orderSortBy !== 'newest') && (
                  <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                    Đang lọc
                  </span>
                )}
              </span>
              <span className="text-[11px] text-gray-500 font-medium italic hidden sm:inline">
                Tự động đồng bộ với kết quả thống kê & danh sách booking
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-gray-200">
              {/* 1. Tìm kiếm tổng hợp */}
              <div className="relative col-span-1 sm:col-span-2 lg:col-span-1">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </span>
                <input
                  type="text"
                  placeholder="Mã đơn hàng, tên khách, SĐT, Tour..."
                  value={orderSearchTerm}
                  onChange={e => setOrderSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
                />
                {orderSearchTerm && (
                  <button
                    type="button"
                    onClick={() => setOrderSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* 2. Lọc Tour */}
              <div>
                <CustomSelect
                  value={orderFilterTourId}
                  onChange={setOrderFilterTourId}
                  options={[
                    { value: 'all', label: `🗺️ Tất cả các Tour (${tourFilterOptions.length})` },
                    ...tourFilterOptions.map((t) => ({
                      value: t.id,
                      label: `[${t.code || 'CHƯA_MÃ'}] ${t.name} (${t.start_date ? format(new Date(t.start_date), 'dd/MM') : ''})`,
                    })),
                  ]}
                  className="w-full"
                  buttonClassName="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white hover:bg-slate-50 focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              {/* 3. Lọc Người tạo / Sale */}
              <div>
                <CustomSelect
                  value={orderFilterCreator}
                  onChange={setOrderFilterCreator}
                  options={[
                    { value: 'all', label: `👤 Tất cả người tạo / Sale (${uniqueCreators.length})` },
                    ...uniqueCreators.map((c) => ({
                      value: c,
                      label: `Sale/CTV: ${c}`,
                    })),
                  ]}
                  className="w-full"
                  buttonClassName="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white hover:bg-slate-50 focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              {/* 4. Lọc Trạng thái Thanh toán */}
              <div>
                <CustomSelect
                  value={orderFilterPaymentStatus}
                  onChange={setOrderFilterPaymentStatus}
                  options={[
                    { value: 'all', label: '💳 Tất cả thanh toán' },
                    { value: 'unpaid', label: '🔴 Chưa thanh toán (Chưa cọc)' },
                    { value: 'partially_paid', label: '🟡 Đã cọc (Thanh toán 1 phần)' },
                    { value: 'paid_full', label: '🟢 Đã thanh toán đủ (100%)' },
                  ]}
                  className="w-full"
                  buttonClassName="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white hover:bg-slate-50 focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              {/* 5. Lọc Hạn Hold */}
              <div>
                <CustomSelect
                  value={orderFilterHoldStatus}
                  onChange={setOrderFilterHoldStatus}
                  options={[
                    { value: 'all', label: '⏳ Tất cả hạn Hold' },
                    { value: 'expiring_soon', label: '⚠️ Sắp hết hạn Hold (< 6 giờ)' },
                    { value: 'expired', label: '🚨 Đã quá hạn Hold' },
                  ]}
                  className="w-full"
                  buttonClassName="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white hover:bg-slate-50 focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              {/* 6. Lọc Thời gian tạo */}
              <div>
                <TimeRangeFilter
                  value={orderFilterTimeRange}
                  onChange={setOrderFilterTimeRange}
                  startDate={orderFilterStartDate}
                  onChangeStartDate={setOrderFilterStartDate}
                  endDate={orderFilterEndDate}
                  onChangeEndDate={setOrderFilterEndDate}
                  selectClassName="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              {/* 7. Sắp xếp */}
              <div>
                <CustomSelect
                  value={orderSortBy}
                  onChange={setOrderSortBy}
                  options={[
                    { value: 'newest', label: '↕️ Sắp xếp: Mới nhất' },
                    { value: 'oldest', label: '↕️ Sắp xếp: Cũ nhất' },
                    { value: 'highest_price', label: '↕️ Giá trị cao nhất' },
                    { value: 'lowest_price', label: '↕️ Giá trị thấp nhất' },
                    { value: 'hold_expiry', label: '↕️ Hạn giữ chỗ gần nhất' },
                  ]}
                  className="w-full"
                  buttonClassName="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white hover:bg-slate-50 focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800"
                />
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Card 1: Slots Hold */}
          <div
            onClick={() => {
              setOverviewModalType('hold');
              setOverviewModalSearch('');
            }}
            className="bg-amber-50/50 hover:bg-amber-100/70 rounded-xl p-4 border-2 border-amber-200/80 hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group relative"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Chỗ giữ tạm (HOLD)</span>
              <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700 border border-amber-200/80 group-hover:bg-amber-200 transition-colors">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-amber-950">{salesOverviewStats.slotsHold}</span>
              <span className="text-xs font-bold text-amber-700">chỗ</span>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-amber-200/50">
              <span className="text-[11px] text-amber-700 font-semibold truncate">
                Từ {salesOverviewStats.holdOrdersCount} đơn tạm tính
              </span>
              <span className="text-[10px] font-bold text-amber-800 group-hover:underline flex items-center gap-0.5 shrink-0">
                Chi tiết →
              </span>
            </div>
          </div>

          {/* Card 2: Slots Sure */}
          <div
            onClick={() => {
              setOverviewModalType('sure');
              setOverviewModalSearch('');
            }}
            className="bg-green-50/50 hover:bg-green-100/70 rounded-xl p-4 border-2 border-green-200/80 hover:border-green-400 hover:shadow-md transition-all cursor-pointer group relative"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-green-800 uppercase tracking-wider">Chỗ đã chốt (SURE)</span>
              <div className="p-1.5 rounded-lg bg-green-100 text-green-700 border border-green-200/80 group-hover:bg-green-200 transition-colors">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-green-950">{salesOverviewStats.slotsSure}</span>
              <span className="text-xs font-bold text-green-700">chỗ</span>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-green-200/50">
              <span className="text-[11px] text-green-700 font-semibold truncate">
                Từ {salesOverviewStats.sureOrdersCount} đơn đã chốt
              </span>
              <span className="text-[10px] font-bold text-green-800 group-hover:underline flex items-center gap-0.5 shrink-0">
                Chi tiết →
              </span>
            </div>
          </div>

          {/* Card 3: Total Revenue */}
          <div
            onClick={() => {
              setOverviewModalType('revenue');
              setOverviewModalSearch('');
            }}
            className="bg-blue-50/50 hover:bg-blue-100/70 rounded-xl p-4 border-2 border-blue-200/80 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group relative"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">Doanh thu chốt (SURE)</span>
              <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700 border border-blue-200/80 group-hover:bg-blue-200 transition-colors">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black text-blue-950 break-all">
                {new Intl.NumberFormat('vi-VN').format(salesOverviewStats.totalRevenue)}đ
              </span>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-blue-200/50">
              <span className="text-[10px] text-blue-700 font-semibold truncate">
                Giá trị đơn SURE & PAID
              </span>
              <span className="text-[10px] font-bold text-blue-800 group-hover:underline flex items-center gap-0.5 shrink-0">
                Chi tiết →
              </span>
            </div>
          </div>

          {/* Card 4: Total Paid */}
          <div
            onClick={() => {
              setOverviewModalType('paid');
              setOverviewModalSearch('');
            }}
            className="bg-teal-50/50 hover:bg-teal-100/70 rounded-xl p-4 border-2 border-teal-200/80 hover:border-teal-400 hover:shadow-md transition-all cursor-pointer group relative"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-teal-800 uppercase tracking-wider">Đã thanh toán</span>
              <div className="p-1.5 rounded-lg bg-teal-100 text-teal-700 border border-teal-200/80 group-hover:bg-teal-200 transition-colors">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black text-teal-950 break-all">
                {new Intl.NumberFormat('vi-VN').format(salesOverviewStats.totalPaid)}đ
              </span>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-teal-200/50">
              <span className="text-[10px] text-teal-700 font-semibold truncate">
                Kế toán đã thực thu
              </span>
              <span className="text-[10px] font-bold text-teal-800 group-hover:underline flex items-center gap-0.5 shrink-0">
                Chi tiết →
              </span>
            </div>
          </div>

          {/* Card 5: Remaining Debt */}
          <div
            onClick={() => {
              setOverviewModalType('remaining');
              setOverviewModalSearch('');
            }}
            className="bg-rose-50/50 hover:bg-rose-100/70 rounded-xl p-4 border-2 border-rose-200/80 hover:border-rose-400 hover:shadow-md transition-all cursor-pointer group relative"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">Còn lại cần nộp</span>
              <div className="p-1.5 rounded-lg bg-rose-100 text-rose-700 border border-rose-200/80 group-hover:bg-rose-200 transition-colors">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black text-rose-950 break-all">
                {new Intl.NumberFormat('vi-VN').format(salesOverviewStats.totalRemaining)}đ
              </span>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-rose-200/50">
              <span className="text-[10px] text-rose-700 font-semibold truncate">
                Dư nợ cần hoàn tất
              </span>
              <span className="text-[10px] font-bold text-rose-800 group-hover:underline flex items-center gap-0.5 shrink-0">
                Chi tiết →
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Hold Statistics Dashboard */}
      {['admin', 'operator', 'bod'].includes(currentRole) && holdStatistics.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4 font-sans">
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-4.5 h-4.5 text-blue-600" />
              <span>Thống kê giữ chỗ theo Đối tác (Sale / CTV / Đại lý)</span>
              <span className="bg-blue-50 text-blue-700 text-[11px] font-bold px-2 py-0.5 rounded-full border border-blue-200">
                {holdStatistics.length} đối tác đang giữ chỗ
              </span>
            </h3>
            <span className="text-xs text-gray-400 font-medium italic">Tự động cập nhật theo thời gian thực</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {holdStatistics.map((stat, idx) => (
              <div key={idx} className="bg-slate-50/70 rounded-xl p-4 border border-gray-150 hover:border-blue-200 hover:bg-slate-50 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-extrabold text-sm text-gray-800 line-clamp-1" title={stat.creator}>
                      {stat.creator}
                    </span>
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0">
                      {stat.seatsHold} chỗ
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5 font-semibold">
                    Đang giữ {stat.orderCount} booking tạm tính
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-gray-200/60 space-y-1">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Chi tiết Tour giữ chỗ:</div>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {Object.entries(stat.detailTours).map(([tourCode, count]) => (
                      <span key={tourCode} className="inline-flex items-center bg-white px-2 py-0.5 rounded text-[10px] font-bold text-gray-700 border border-gray-200">
                        {tourCode}: <strong className="text-blue-600 ml-1 font-extrabold">{count}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Order Form */}
      {showCreateForm && (
        <form onSubmit={handleCreateOrder} className="bg-white rounded-xl border border-gray-200 shadow-md p-6 space-y-6 animate-in slide-in-from-top-4 duration-200 relative">
          {/* Form Header with live countdown */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-100 pb-4 gap-3 bg-slate-50 -mx-6 -mt-6 p-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                <ShoppingCart className="w-5 h-5 mr-2 text-blue-600" />
                Phiếu thông tin giữ chỗ & Đặt tour
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Vui lòng hoàn thành thông tin đặt giữ chỗ theo biểu mẫu tiêu chuẩn dưới đây.</p>
            </div>
            <div className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-bold ${countdown < 60 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-green-100 text-green-700'}`}>
              <Clock className="w-3.5 h-3.5 mr-1.5" />
              <span>Cửa sổ sẽ tự đóng sau {formatCountdown(countdown)} phút!</span>
            </div>
          </div>

          <div className="space-y-6">
            {/* Step 1: Choose Tour and Hold type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Chọn Tour đoàn riêng *</label>
                <Select
                  placeholder="-- Chọn Tour đoàn riêng --"
                  options={tours
                    .filter(t => t.tour_type === 'private')
                    .map(t => {
                      const maxAllowed = Math.max(0, t.total_seats + (t.overbook_limit || 0) - t.sold_seats - t.hold_seats);
                      return {
                        value: t.id,
                        label: `[${t.code}] ${t.name} (Còn ${t.available_seats} chỗ${t.overbook_limit ? `, OB tối đa: +${t.overbook_limit}` : ''})`,
                        isDisabled: false
                      };
                    })}
                  value={tours.find(t => t.id === selectedTourId) ? {
                    value: selectedTourId,
                    label: `[${tours.find(t => t.id === selectedTourId)?.code}] ${tours.find(t => t.id === selectedTourId)?.name} (Còn ${tours.find(t => t.id === selectedTourId)?.available_seats} chỗ${tours.find(t => t.id === selectedTourId)?.overbook_limit ? `, OB tối đa: +${tours.find(t => t.id === selectedTourId)?.overbook_limit}` : ''})`
                  } : null}
                  onChange={(option: any) => handleTourChange(option ? option.value : '')}
                  className="text-sm"
                  isClearable
                  menuPortalTarget={document.body}
                  styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Hình thức giữ chỗ *</label>
                <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse flex-shrink-0"></span>
                    <div>
                      <div className="font-bold text-blue-900 text-sm">Hold tạm thời</div>
                      <div className="text-xs text-blue-700 mt-0.5">
                        Hệ thống tự động nhả chỗ sau {selectedTour?.hold_duration_hours || 48} giờ. Booking sẽ chuyển sang Sure chỗ sau khi ghi nhận thanh toán.
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold bg-blue-100 text-blue-800 px-3 py-1 rounded-lg border border-blue-200 whitespace-nowrap ml-2">Hold</span>
                </div>
              </div>
            </div>

            {/* Display Tour Price List if selected */}
            {selectedTour && (
              <div className="bg-slate-50 p-4 rounded-xl border border-gray-200 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700">Bảng giá tour áp dụng</h4>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                  <div className="bg-white p-2.5 rounded border border-gray-200">
                    <span className="text-gray-500 block">Người lớn (≥ 10 tuổi):</span>
                    <span className="font-bold text-gray-900">{new Intl.NumberFormat('vi-VN').format(priceAdult)} VND</span>
                  </div>
                  <div className="bg-white p-2.5 rounded border border-gray-200">
                    <span className="text-gray-500 block">Trẻ em (2 - dưới 10):</span>
                    <span className="font-bold text-gray-900">{new Intl.NumberFormat('vi-VN').format(priceChild)} VND</span>
                  </div>
                  <div className="bg-white p-2.5 rounded border border-gray-200">
                    <span className="text-gray-500 block">Trẻ nhỏ (&lt; 2 tuổi):</span>
                    <span className="font-bold text-gray-900">{new Intl.NumberFormat('vi-VN').format(priceInfant)} VND</span>
                  </div>
                  <div className="bg-white p-2.5 rounded border border-gray-200">
                    <span className="text-gray-500 block">Phụ thu phòng đơn:</span>
                    <span className="font-bold text-red-600">{new Intl.NumberFormat('vi-VN').format(singleRoomSurcharge)} VND</span>
                  </div>
                </div>
              </div>
            )}

            {/* Section 1: Booker info */}
            <div className="border-t border-gray-150 pt-4 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold text-gray-900 flex items-center">
                  <span className="w-1.5 h-3.5 bg-blue-600 rounded mr-2 inline-block"></span>
                  1. Thông tin khách đặt tour
                </h4>
                {uniqueCustomers.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowCustomerSelector(!showCustomerSelector)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg border border-blue-150 transition-all shadow-sm"
                  >
                    <Users className="w-3.5 h-3.5" />
                    {showCustomerSelector ? 'Đóng tìm kiếm' : 'Chọn từ khách hàng cũ'}
                  </button>
                )}
              </div>

              {showCustomerSelector && (
                <div className="bg-slate-50 p-4 rounded-xl border border-gray-200 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Tìm theo tên, SĐT hoặc hộ chiếu..."
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-blue-500 outline-none"
                      value={customerSearchQuery}
                      onChange={e => setCustomerSearchQuery(e.target.value)}
                    />
                    {customerSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setCustomerSearchQuery('')}
                        className="text-xs text-gray-500 hover:text-gray-700 font-medium shrink-0 bg-white border border-gray-200 px-2 py-1 rounded"
                      >
                        Xoá
                      </button>
                    )}
                  </div>
                  <div className="max-h-48 overflow-y-auto divide-y divide-gray-150 border border-gray-200 rounded-lg bg-white shadow-inner">
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
                            setBookerName(c.full_name);
                            setBookerPhone(c.phone || '');
                            setShowCustomerSelector(false);
                          }}
                          className="px-3 py-2.5 hover:bg-blue-50 cursor-pointer flex justify-between items-center text-xs transition-colors"
                        >
                          <div>
                            <div className="font-bold text-slate-800">{c.full_name}</div>
                            {c.passport_number && (
                              <div className="text-[10px] text-gray-500 font-mono mt-0.5">Hộ chiếu: {c.passport_number}</div>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`relative ${focusedInput === 'name' ? 'z-30' : 'z-20'}`}>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Họ và tên khách trưởng nhóm *</label>
                    <input
                      type="text"
                      required
                      placeholder="Nhập họ và tên trưởng nhóm đại diện"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-bold uppercase"
                      value={bookerName}
                      onChange={e => setBookerName(e.target.value.toUpperCase())}
                      onFocus={() => setFocusedInput('name')}
                      onBlur={() => setTimeout(() => setFocusedInput(null), 250)}
                    />
                    {focusedInput === 'name' && suggestions.length > 0 && (
                      <div className="absolute z-50 w-full bg-white border border-gray-300 rounded-lg mt-1 max-h-48 overflow-y-auto shadow-xl divide-y divide-gray-100">
                        {suggestions.map(p => (
                          <div
                            key={p.id}
                            className="px-3.5 py-2.5 hover:bg-blue-50 cursor-pointer text-xs flex justify-between items-center"
                            onMouseDown={() => selectSuggestion(p)}
                          >
                            <div>
                              <div className="font-bold text-slate-800">{p.full_name}</div>
                              {p.passport_number && (
                                <span className="text-[10px] text-gray-400 font-mono">HC: {p.passport_number}</span>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-blue-600">{p.phone || 'Chưa có SĐT'}</div>
                              {p.dob && (
                                <div className="text-[9px] text-gray-400">NS: {p.dob}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className={`relative ${focusedInput === 'phone' ? 'z-30' : 'z-10'}`}>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Số điện thoại liên hệ *</label>
                    <input
                      type="text"
                      required
                      placeholder="Nhập số điện thoại trưởng nhóm"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-bold"
                      value={bookerPhone}
                      onChange={e => setBookerPhone(e.target.value)}
                      onFocus={() => setFocusedInput('phone')}
                      onBlur={() => setTimeout(() => setFocusedInput(null), 250)}
                    />
                    {focusedInput === 'phone' && suggestions.length > 0 && (
                      <div className="absolute z-50 w-full bg-white border border-gray-300 rounded-lg mt-1 max-h-48 overflow-y-auto shadow-xl divide-y divide-gray-100">
                        {suggestions.map(p => (
                          <div
                            key={p.id}
                            className="px-3.5 py-2.5 hover:bg-blue-50 cursor-pointer text-xs flex justify-between items-center"
                            onMouseDown={() => selectSuggestion(p)}
                          >
                            <div>
                              <div className="font-bold text-slate-800">{p.full_name}</div>
                              {p.passport_number && (
                                <span className="text-[10px] text-gray-400 font-mono">HC: {p.passport_number}</span>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-blue-600">{p.phone || 'Chưa có SĐT'}</div>
                              {p.dob && (
                                <div className="text-[9px] text-gray-400">NS: {p.dob}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
            </div>

            {/* Section 2: Classified guest counts */}
            <div className="border-t border-gray-150 pt-4 space-y-4">
              <h4 className="text-sm font-bold text-gray-900 flex items-center">
                <span className="w-1.5 h-3.5 bg-blue-600 rounded mr-2 inline-block"></span>
                2. Số lượng khách phân loại để tính giá tạm tính
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-3 rounded-lg border border-gray-200 space-y-1">
                  <label className="block text-xs font-bold text-gray-700">Số người lớn (≥ 10 tuổi) *</label>
                  <span className="text-[10px] text-gray-500 block pb-1">Tính 100% biểu giá người lớn</span>
                  <input
                    type="number"
                    min="1"
                    required
                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm bg-white font-bold text-blue-700"
                    value={adultCount}
                    onChange={e => handleAdultCountChange(Number(e.target.value))}
                  />
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-gray-200 space-y-1">
                  <label className="block text-xs font-bold text-gray-700">Số trẻ em (2 - dưới 10 tuổi)</label>
                  <span className="text-[10px] text-gray-500 block pb-1">Tính theo giá trẻ em của tour</span>
                  <input
                    type="number"
                    min="0"
                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm bg-white font-bold"
                    value={childCount}
                    onChange={e => handleChildCountChange(Number(e.target.value))}
                  />
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-gray-200 space-y-1">
                  <label className="block text-xs font-bold text-gray-700">Số trẻ nhỏ (&lt; 2 tuổi)</label>
                  <span className="text-[10px] text-gray-500 block pb-1">Tính theo giá trẻ nhỏ của tour</span>
                  <input
                    type="number"
                    min="0"
                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm bg-white font-bold"
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
                  <span className="text-[10px] text-gray-500 block">Cộng thêm đơn giá phòng đơn quy định</span>
                  <input
                    type="number"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                    value={singleRoomCount}
                    onChange={e => setSingleRoomCount(Math.max(0, Number(e.target.value)))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-600">Thông tin ghép phòng (Lẻ nam / Lẻ nữ)</label>
                  <span className="text-[10px] text-gray-500 block">Lựa chọn ghép nhóm hoặc đi lẻ</span>
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
                  <span className="text-[10px] text-gray-500 block">Hóa đơn giá trị gia tăng</span>
                  <div className="flex gap-4 pt-1">
                    <label className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="radio"
                        name="vatOption"
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
                        name="vatOption"
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
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-3 mb-4">
                    <h4 className="text-xs font-bold text-gray-700 uppercase mb-2">Thông tin xuất hóa đơn</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">Tên công ty <span className="text-red-500">*</span></label>
                        <input type="text" value={vatCompanyName} onChange={e => setVatCompanyName(e.target.value)} className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm bg-white" placeholder="CÔNG TY TNHH..." required />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">Mã số thuế <span className="text-red-500">*</span></label>
                        <input type="text" value={vatTaxCode} onChange={e => setVatTaxCode(e.target.value)} className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm bg-white" placeholder="Nhập mã số thuế..." required />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">Địa chỉ xuất hóa đơn <span className="text-red-500">*</span></label>
                        <input type="text" value={vatAddress} onChange={e => setVatAddress(e.target.value)} className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm bg-white" placeholder="Địa chỉ đăng ký kinh doanh..." required />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">Email nhận hóa đơn <span className="text-red-500">*</span></label>
                        <input type="email" value={vatEmail} onChange={e => setVatEmail(e.target.value)} className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm bg-white" placeholder="Email nhận hóa đơn điện tử..." required />
                      </div>
                    </div>
                  </div>
                )}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-600">Yêu cầu đặc biệt (Ghi chú thêm)</label>
                  <span className="text-[10px] text-gray-500 block">Ăn chay, dị ứng, trẻ sơ sinh...</span>
                  <textarea
                    rows={2}
                    placeholder="Nhập các yêu cầu ăn uống, phòng ở đặc biệt..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
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
                          className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm bg-white focus:ring-1 focus:ring-amber-500 outline-none font-medium"
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
          </div>

          {/* Pricing calculation summary */}
          {selectedTour && (
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-150 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="text-xs space-y-1 text-gray-700">
                <div className="font-semibold text-blue-800 text-sm">Tổng hợp chi tiết tạm tính:</div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
                  <div>• Người lớn ({adultCount} x {new Intl.NumberFormat('vi-VN').format(priceAdult)} đ):</div>
                  <div className="font-semibold">{new Intl.NumberFormat('vi-VN').format(priceAdult * adultCount)} VND</div>
                  {childCount > 0 && (
                    <>
                      <div>• Trẻ em ({childCount} x {new Intl.NumberFormat('vi-VN').format(priceChild)} đ):</div>
                      <div className="font-semibold">{new Intl.NumberFormat('vi-VN').format(priceChild * childCount)} VND</div>
                    </>
                  )}
                  {infantCount > 0 && (
                    <>
                      <div>• Trẻ nhỏ ({infantCount} x {new Intl.NumberFormat('vi-VN').format(priceInfant)} đ):</div>
                      <div className="font-semibold">{new Intl.NumberFormat('vi-VN').format(priceInfant * infantCount)} VND</div>
                    </>
                  )}
                  {singleRoomCount > 0 && (
                    <>
                      <div>• Phụ thu phòng đơn ({singleRoomCount} x {new Intl.NumberFormat('vi-VN').format(singleRoomSurcharge)} đ):</div>
                      <div className="font-semibold text-red-600">{new Intl.NumberFormat('vi-VN').format(singleRoomSurcharge * singleRoomCount)} VND</div>
                    </>
                  )}
                  {vatOption === 'Xuất VAT' && (
                    <>
                      <div>• Thuế VAT 10% (Đã gồm trong giá):</div>
                      <div className="font-semibold text-blue-600">{new Intl.NumberFormat('vi-VN').format(vatAmount)} VND</div>
                    </>
                  )}
                </div>
              </div>
              <div className="text-right sm:border-l sm:border-gray-200 sm:pl-6 shrink-0 w-full sm:w-auto">
                <div className="text-xs text-gray-500 font-medium">Tổng giá trị giữ chỗ tạm tính</div>
                <div className="text-2xl font-black text-red-600">
                  {new Intl.NumberFormat('vi-VN').format(calculatedTotalPrice)} VND
                </div>
                <span className="text-[10px] text-gray-400 font-medium">Đã bao gồm thuế phí áp dụng</span>
              </div>
            </div>
          )}

          {/* Thống kê Phí Visa cho Phiếu thông tin giữ chỗ */}
          {selectedTour && selectedTour.price_visa_tour && selectedTour.price_visa_tour > 0 ? (
            <div className="bg-blue-50/90 p-3.5 rounded-xl border border-blue-200/80 shadow-xs space-y-2 text-xs">
              <div className="flex justify-between items-center text-blue-950 font-bold border-b border-blue-200/80 pb-1.5">
                <span className="flex items-center gap-1.5 text-blue-800">
                  <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                  Phí dịch vụ Visa / khách (nếu chọn làm qua Tour):
                </span>
                <span className="font-extrabold text-sm text-blue-900">+{new Intl.NumberFormat('vi-VN').format(selectedTour.price_visa_tour)} đ/khách</span>
              </div>
              <div className="flex justify-between items-center text-blue-950 font-black pt-0.5">
                <span>Ưóc tính phí Visa tối đa cho đoàn ({adultCount + childCount} khách):</span>
                <span className="text-base font-black text-blue-700">+{new Intl.NumberFormat('vi-VN').format(selectedTour.price_visa_tour * (adultCount + childCount))} đ</span>
              </div>
            </div>
          ) : null}

          {/* Thống kê Hoa hồng & Giá Net cho Phiếu thông tin giữ chỗ */}
          {selectedTour && (
            <div className="space-y-2">
              {/* Thống kê Hoa hồng: Hiển thị nếu là Đại lý, CTV, hoặc Sale chọn tạo đơn cho CTV */}
              {(isAgentRole || currentRole === 'CTV' || profile?.role === 'CTV' || (isSaleRole && (isCreatingForCTV || ctvInfo.trim().length > 0))) && (
                <div className="bg-amber-50/90 p-3.5 rounded-xl border border-amber-200/80 shadow-sm space-y-2 text-xs">
                  <div className="flex justify-between items-center text-amber-950 font-bold border-b border-amber-200/80 pb-1.5">
                    <span className="flex items-center gap-1.5 text-amber-800">
                      <Coins className="w-4 h-4 text-amber-600" />
                      Hoa hồng nhận được / khách:
                    </span>
                    <span className="font-extrabold text-sm text-amber-900">{new Intl.NumberFormat('vi-VN').format(selectedTour.commission || 0)} đ/khách</span>
                  </div>
                  <div className="flex justify-between items-center text-emerald-950 font-black pt-0.5">
                    <span>Tổng hoa hồng nhận được đơn hàng ({adultCount + childCount} khách):</span>
                    <span className="text-base font-black text-emerald-700">{new Intl.NumberFormat('vi-VN').format((selectedTour.commission || 0) * (adultCount + childCount))} đ</span>
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
                    {new Intl.NumberFormat('vi-VN').format(Math.max(0, calculatedTotalPrice - ((selectedTour.commission || 0) * (adultCount + childCount))))} đ
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 bg-slate-50 -mx-6 -mb-6 p-6">
            <button
              type="button"
              onClick={() => {
                // reset form
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
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 bg-white transition-colors"
            >
              Nhập lại (Reset)
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 bg-white transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-md hover:shadow-lg transition-all"
            >
              Lưu thông tin giữ chỗ
            </button>
          </div>
        </form>
      )}

      {/* Orders list and monitoring */}
      <div id="booking-list-table" className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden scroll-mt-6">
        <div className="px-6 py-4 border-b border-gray-150 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span>Danh sách Booking của bạn</span>
          </h3>
          <span className="bg-slate-100 text-slate-700 text-xs font-bold px-3 py-1 rounded-full border border-gray-250 shrink-0">
            Đang hiển thị: {orders.length} booking
          </span>
        </div>

        {/* Tabs phân loại trạng thái trực quan và sang trọng */}
        <div className="flex border-b border-gray-200 bg-white overflow-x-auto scrollbar-none">
          <button
            onClick={() => setOrderFilterStatus('hold')}
            className={`flex-1 min-w-[110px] sm:min-w-0 flex items-center justify-center gap-1.5 sm:gap-2 py-3 sm:py-4 px-3 sm:px-6 text-xs sm:text-sm font-bold border-b-2 transition-all relative shrink-0 whitespace-nowrap ${
              orderFilterStatus === 'hold'
                ? 'border-amber-500 text-amber-600 bg-amber-50/10'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/30'
            }`}
          >
            <Clock className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${orderFilterStatus === 'hold' ? 'text-amber-500' : 'text-gray-400'}`} />
            <span>Giữ chỗ</span>
            <span className={orderFilterStatus === 'hold'
              ? 'text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded-full font-black bg-amber-100 text-amber-800'
              : 'text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded-full font-black bg-gray-100 text-gray-600'
            }>
              {tabCounts.hold}
            </span>
          </button>

          <button
            onClick={() => setOrderFilterStatus('paid')}
            className={`flex-1 min-w-[130px] sm:min-w-0 flex items-center justify-center gap-1.5 sm:gap-2 py-3 sm:py-4 px-3 sm:px-6 text-xs sm:text-sm font-bold border-b-2 transition-all relative shrink-0 whitespace-nowrap ${
              orderFilterStatus === 'paid'
                ? 'border-blue-500 text-blue-600 bg-blue-50/10'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/30'
            }`}
          >
            <CreditCard className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${orderFilterStatus === 'paid' ? 'text-blue-500' : 'text-gray-400'}`} />
            <span>Đã thanh toán</span>
            <span className={orderFilterStatus === 'paid'
              ? 'text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded-full font-black bg-blue-100 text-blue-800'
              : 'text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded-full font-black bg-gray-100 text-gray-600'
            }>
              {tabCounts.paid}
            </span>
          </button>

          <button
            onClick={() => setOrderFilterStatus('cancelled')}
            className={`flex-1 min-w-[100px] sm:min-w-0 flex items-center justify-center gap-1.5 sm:gap-2 py-3 sm:py-4 px-3 sm:px-6 text-xs sm:text-sm font-bold border-b-2 transition-all relative shrink-0 whitespace-nowrap ${
              orderFilterStatus === 'cancelled'
                ? 'border-slate-500 text-slate-700 bg-slate-50/20'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/30'
            }`}
          >
            <X className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${orderFilterStatus === 'cancelled' ? 'text-slate-500' : 'text-gray-400'}`} />
            <span>Đã hủy</span>
            <span className={orderFilterStatus === 'cancelled'
              ? 'text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded-full font-black bg-slate-100 text-slate-700'
              : 'text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded-full font-black bg-gray-100 text-gray-600'
            }>
              {tabCounts.cancelled}
            </span>
          </button>

          <button
            onClick={() => setOrderFilterStatus('refund')}
            className={`flex-1 min-w-[120px] sm:min-w-0 flex items-center justify-center gap-1.5 sm:gap-2 py-3 sm:py-4 px-3 sm:px-6 text-xs sm:text-sm font-bold border-b-2 transition-all relative shrink-0 whitespace-nowrap ${
              orderFilterStatus === 'refund'
                ? 'border-rose-500 text-rose-600 bg-rose-50/10'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/30'
            }`}
          >
            <DollarSign className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${orderFilterStatus === 'refund' ? 'text-rose-500' : 'text-gray-400'}`} />
            <span>Hủy hoàn tiền</span>
            <span className={orderFilterStatus === 'refund'
              ? 'text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded-full font-black bg-rose-100 text-rose-800'
              : 'text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded-full font-black bg-gray-100 text-gray-600'
            }>
              {tabCounts.refund}
            </span>
          </button>
        </div>



        {orders.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm font-medium">Bạn chưa có đơn đặt chỗ nào hoặc không tìm thấy kết quả phù hợp với bộ lọc.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-150">
            {orders.map(order => {
              const tour = tours.find(t => t.id === order.tour_id);
              const orderPassengers = passengers.filter(p => p.order_id === order.id);
              const leadPassenger = orderPassengers.find(p => p.is_payer) || orderPassengers[0];
              const timeSeverity = getHoldTimeSeverity(order.hold_expiry);
              const remainingTime = getRemainingHoldTime(order.hold_expiry);
              const isExpanded = expandedOrderId === order.id;
              const orderInvoices = invoices.filter(inv => inv.order_id === order.id);
              const approvedPaidAmount = orderInvoices.filter(inv => inv.type === 'receipt' && inv.status === 'approved').reduce((sum, inv) => sum + inv.amount, 0);
              const effectivePaidAmount = Math.max(approvedPaidAmount, order.paid_amount || 0);
              const hasApprovedReceipt = effectivePaidAmount > 0 || order.payment_status === 'partially_paid' || order.payment_status === 'paid' || order.status === 'paid';
              const isFullyPaid = order.status === 'paid' || order.payment_status === 'paid' || (effectivePaidAmount >= order.total_price - 100 && order.total_price > 0);
              const isPartiallyPaid = !isFullyPaid && (hasApprovedReceipt || effectivePaidAmount > 0 || order.payment_status === 'partially_paid');

              const visaPassengersCount = orderPassengers.filter(p => p.needs_visa_service).length;
              const tourDiscount = tour?.discount || 0;
              const rawPriceAdult = tour ? (tour.price_adult ?? tour.price) : 0;
              const priceAdult = tour ? Math.max(0, rawPriceAdult - tourDiscount) : 0;
              const priceChild = tour ? Math.max(0, (tour.price_child ?? Math.round(rawPriceAdult * 0.9)) - (tour.price_child ? tourDiscount : Math.round(tourDiscount * 0.9))) : 0;
              const priceInfant = tour ? Math.max(0, (tour.price_infant ?? Math.round(rawPriceAdult * 0.3)) - (tour.price_infant ? tourDiscount : Math.round(tourDiscount * 0.3))) : 0;
              const singleRoomSurcharge = tour?.single_room_surcharge || 0;
              const priceVisaTour = tour?.price_visa_tour || 0;

              const totalAdult = (order.adult_count || 0) * priceAdult;
              const totalChild = (order.child_count || 0) * priceChild;
              const totalInfant = (order.infant_count || 0) * priceInfant;
              const totalSingleRoom = (order.single_room_count || 0) * singleRoomSurcharge;
              const totalVisa = visaPassengersCount * priceVisaTour;

              const totalSubtotal = totalAdult + totalChild + totalInfant + totalSingleRoom + totalVisa;
              const discountAmount = order.discount_type === 'percent'
                ? (totalSubtotal * (order.discount_value || 0)) / 100
                : (order.discount_value || 0);
              const customSurchargeAmount = order.surcharge_amount || 0;
              // Thuế VAT đã bao gồm trong giá tour: bóc tách từ tổng tiền đơn hàng
              const grossOrderTotal = order.total_price || Math.max(0, totalSubtotal - discountAmount + customSurchargeAmount + (order.price_markup || 0));
              const computedVat = order.vat_option === 'Xuất VAT' ? Math.round(grossOrderTotal - (grossOrderTotal / 1.1)) : 0;

              // Commission breakdown calculations
              const baseCommissionPerSeat = tour?.commission || 0;
              const commissionPassengerCount = (order.adult_count !== undefined && order.adult_count !== null) || (order.child_count !== undefined && order.child_count !== null)
                ? ((order.adult_count || 0) + (order.child_count || 0))
                : (orderPassengers.length > 0 ? orderPassengers.length : 1);
              const baseTotalCommission = baseCommissionPerSeat * commissionPassengerCount;

              const markupTaxPercent = order.markup_tax_percent ?? 25;
              const priceMarkupNet = Math.max(0, (order.price_markup || 0) - (order.markup_fee_amount || Math.round(((order.price_markup || 0) * markupTaxPercent) / 100)));
              const commissionAdded = priceMarkupNet;

              let netCommissionReceived = Math.max(0, baseTotalCommission + commissionAdded - discountAmount);
              if (order.seller_type === 'agent' && order.agent_commission_amount !== undefined && order.agent_commission_amount !== null && order.agent_commission_amount > 0) {
                netCommissionReceived = order.agent_commission_amount;
              } else if (order.net_commission_amount !== undefined && order.net_commission_amount !== null && order.net_commission_amount > 0) {
                netCommissionReceived = Math.max(order.net_commission_amount, netCommissionReceived);
              }

              const commissionDeducted = discountAmount > 0 ? Math.min(baseTotalCommission + commissionAdded, discountAmount) : 0;

              return (
                <div
                  key={order.id}
                  className={`transition-all duration-200 ${
                    isExpanded
                      ? 'bg-blue-50/10'
                      : 'hover:bg-gray-50/60'
                  }`}
                >
                  {/* Summary / Header block clickable */}
                  <div
                    onClick={() => toggleOrderExpand(order.id)}
                    className="p-5 flex flex-col gap-3.5 cursor-pointer select-none"
                  >
                    {/* Row 1: Core Information Grid */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Order ID & Time */}
                      <div className="flex items-center gap-3.5 min-w-[150px] shrink-0">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 border border-blue-100">
                          <ShoppingCart className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <div 
                              onClick={(e) => handleCopyOrderCode(e, order.id)}
                              className="font-black text-gray-900 text-sm tracking-tight hover:text-blue-600 cursor-pointer inline-flex items-center gap-1 group/copy transition-colors"
                              title="Bấm để sao chép mã đơn hàng"
                            >
                              #{order.id.substring(0, 8)}
                              <Copy className="w-3.5 h-3.5 text-gray-400 group-hover/copy:text-blue-600 opacity-60 group-hover/copy:opacity-100 transition-opacity" />
                            </div>

                            {/* Tình trạng hợp đồng */}
                            {order.contract_url ? (
                              <a
                                href={order.contract_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors shadow-2xs"
                                title="Đã lưu file hợp đồng PDF lên Google Drive. Nhấp để xem file"
                              >
                                <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span>HĐ Drive</span>
                              </a>
                            ) : (
                              <span 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setContractPrintOrder(order);
                                }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 transition-colors cursor-pointer"
                                title="Chưa lưu hợp đồng lên Drive. Nhấp để tạo & in hợp đồng"
                              >
                                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>Chưa lưu HĐ</span>
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-400 font-medium mt-0.5">
                            {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}
                          </div>
                        </div>
                      </div>

                      {/* Tour info (Full Name) */}
                      <div className="flex-1 min-w-[240px]">
                        <div className="inline-block px-1.5 py-0.5 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200/60 rounded uppercase tracking-wider">{tour?.code}</div>
                        <div className="text-sm font-bold text-gray-800 mt-1 break-words leading-relaxed" title={tour?.name}>
                          {tour?.name}
                        </div>
                      </div>

                      {/* Representative guest */}
                      <div className="min-w-[170px] shrink-0">
                        <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Khách trưởng nhóm</div>
                        <div className="text-sm font-bold text-gray-800 mt-0.5">
                          {(order.booker_name && !order.booker_name.includes('Giữ chỗ tạm'))
                            ? order.booker_name
                            : (leadPassenger?.full_name || 'Chưa cung cấp')}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {order.booker_phone || leadPassenger?.phone || 'Chưa cung cấp'}
                        </div>
                      </div>

                      {/* Quantity of guests */}
                      <div className="min-w-[130px] shrink-0">
                        <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Tổng hành khách</div>
                        <div className="inline-flex items-center gap-1.5 mt-1 bg-slate-100 px-3 py-1 rounded-full text-xs font-bold text-slate-700 border border-slate-200">
                          <Users className="w-3.5 h-3.5" />
                          <span>
                            {order.adult_count !== undefined ? ((order.adult_count || 0) + (order.child_count || 0) + (order.infant_count || 0)) : orderPassengers.length} người
                          </span>
                        </div>
                        {order.adult_count !== undefined && (
                          <div className="text-[10px] text-gray-400 font-semibold mt-1">
                            ({order.adult_count}NL {order.child_count ? `- ${order.child_count}TE` : ''} {order.infant_count ? `- ${order.infant_count}TN` : ''})
                          </div>
                        )}
                      </div>

                      {/* Total Booking Cost */}
                      <div className="min-w-[140px] shrink-0">
                        <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Tổng cộng</div>
                        <div className="text-base font-black text-rose-600 mt-0.5">
                          {new Intl.NumberFormat('vi-VN').format(order.total_price)} VND
                        </div>
                      </div>

                      {/* Non-hold Status & Expand Indicator */}
                      <div className="flex items-center justify-between lg:justify-end gap-3.5 min-w-[110px] shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-gray-100">
                        <div>
                          {tour?.tour_type === 'private' ? (
                            <span className="inline-flex items-center px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                              👑 Tour đoàn riêng
                            </span>
                          ) : (
                            <>
                              {order.status === 'sure' && !hasApprovedReceipt && (
                                <span className="inline-flex items-center px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Sure chỗ
                                </span>
                              )}
                              {(order.payment_status === 'paid' || isFullyPaid) && order.status !== 'cancelled' && (
                                <span className="inline-flex items-center px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                  Đã thanh toán
                                </span>
                              )}
                              {(order.status === 'sure' && isPartiallyPaid && order.payment_status !== 'paid') && (
                                <span className="inline-flex items-center px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200">
                                  Thanh toán một phần
                                </span>
                              )}
                            </>
                          )}
                          {order.status === 'cancelled' && (() => {
                            const refundInvoices = invoices.filter(inv => inv.order_id === order.id && inv.type === 'payment');
                            if (refundInvoices.length === 0) {
                              return orderFilterStatus !== 'refund' ? (
                                <span className="inline-flex items-center px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full bg-slate-50 text-slate-400 border border-slate-200">
                                  Đã huỷ
                                </span>
                              ) : null;
                            }

                            const anyApproved = refundInvoices.some(inv => inv.status === 'approved');
                            const anyPending = refundInvoices.some(inv => inv.status === 'pending');
                            const allRejected = refundInvoices.every(inv => inv.status === 'rejected');

                            let progressText = '';
                            let progressStyle = '';

                            if (anyApproved && !anyPending) {
                              progressText = 'Hoàn tiền: Hoàn tất';
                              progressStyle = 'bg-green-50 text-green-700 border-green-200';
                            } else if (anyApproved && anyPending) {
                              progressText = 'Hoàn tiền: Đang xử lý';
                              progressStyle = 'bg-cyan-50 text-cyan-700 border-cyan-200 animate-pulse';
                            } else if (allRejected) {
                              progressText = 'Hoàn tiền: Từ chối';
                              progressStyle = 'bg-rose-50 text-rose-700 border-rose-200';
                            } else {
                              progressText = 'Hoàn tiền: Chờ duyệt';
                              progressStyle = 'bg-amber-50 text-amber-700 border-amber-200';
                            }

                            return (
                              <div className="flex flex-wrap items-center gap-1.5">
                                {orderFilterStatus !== 'refund' && (
                                  <span className="inline-flex items-center px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full bg-slate-50 text-slate-400 border border-slate-200">
                                    Đã huỷ
                                  </span>
                                )}
                                <span className={`inline-flex items-center px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full border ${progressStyle}`}>
                                  {progressText}
                                </span>
                              </div>
                            );
                          })()}
                        </div>

                        <div className="text-gray-400 p-1 hover:bg-slate-100 rounded-full transition-colors ml-auto lg:ml-0">
                          {isExpanded ? <ChevronUp className="w-5 h-5 text-blue-600" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Hold Status and Remaining Time Banner (Separate Row) */}
                    {order.status === 'hold' && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-dashed border-gray-200 pt-3 mt-1 bg-amber-50/50 p-3 rounded-lg border border-amber-100/60">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider mr-1">Chế độ đặt chỗ:</span>
                          <span className="inline-flex items-center px-3 py-1 text-xs font-black uppercase tracking-wider rounded-lg bg-amber-500 text-white shadow-sm">
                            Giữ chỗ tạm (Hold)
                          </span>
                        </div>
                        {remainingTime && (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Thời gian hết hạn tự động còn:</span>
                            <span className={`inline-flex items-center text-xs font-bold px-3 py-1 rounded-lg border shadow-sm ${
                              timeSeverity === 'danger' ? 'bg-red-50 text-red-700 border-red-200 animate-pulse' :
                              timeSeverity === 'warning' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-blue-50 text-blue-700 border-blue-200'
                            }`}>
                              <Clock className="w-3.5 h-3.5 mr-1.5" />
                              {remainingTime}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Expandable Details Container */}
                  {isExpanded && (() => {
                    const orderInvoices = invoices
                      .filter(inv => inv.order_id === order.id)
                      .sort((a, b) => {
                        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                        return dateB - dateA;
                      });
                    const approvedPaid = orderInvoices.filter(inv => inv.type === 'receipt' && inv.status === 'approved').reduce((sum, inv) => sum + inv.amount, 0);
                    const pendingPaid = orderInvoices.filter(inv => inv.type === 'receipt' && inv.status === 'pending').reduce((sum, inv) => sum + inv.amount, 0);
                    const remainingAmount = Math.max(0, order.total_price - approvedPaid);
                    const currentTab = activeTabs[order.id] || 'details';

                    return (
                      <div className="px-5 pb-6 pt-3 bg-slate-50/40 border-t border-gray-100 space-y-5 animate-in fade-in duration-150">
                        {/* Tabs Bar */}
                        <div className="flex border-b border-gray-200 gap-1">
                          <button
                            type="button"
                            onClick={() => setActiveTabs(prev => ({ ...prev, [order.id]: 'details' }))}
                            className={`py-2 px-4 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                              currentTab === 'details'
                                ? 'border-blue-600 text-blue-600 bg-white shadow-sm font-extrabold'
                                : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100/50'
                            }`}
                          >
                            <FileText className="w-4 h-4" />
                            Chi tiết booking
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveTabs(prev => ({ ...prev, [order.id]: 'contact_info' }))}
                            className={`py-2 px-4 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                              currentTab === 'contact_info'
                                ? 'border-blue-600 text-blue-600 bg-white shadow-sm font-extrabold'
                                : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100/50'
                            }`}
                          >
                            <Phone className="w-4 h-4 text-blue-600" />
                            Thông tin liên hệ
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveTabs(prev => ({ ...prev, [order.id]: 'payment_history' }))}
                            className={`py-2 px-4 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                              currentTab === 'payment_history'
                                ? 'border-blue-600 text-blue-600 bg-white shadow-sm font-extrabold'
                                : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100/50'
                            }`}
                          >
                            <DollarSign className="w-4 h-4 text-emerald-600" />
                            Lịch sử thanh toán
                            {orderInvoices.length > 0 && (
                              <span className="ml-1 px-1.5 py-0.5 text-[9px] font-black rounded-full bg-blue-100 text-blue-800">
                                {orderInvoices.length}
                              </span>
                            )}
                          </button>
                        </div>

                        {currentTab === 'contact_info' ? (
                          <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-4 animate-in fade-in duration-150">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                              <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-2">
                                <Phone className="w-4 h-4 text-blue-600" />
                                Thông tin liên hệ đặt chỗ
                              </h4>
                              {(['admin', 'operator'].includes(currentRole) || order.user_id === profile?.id || order.created_by === profile?.full_name) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingOrder(order);
                                    setIsEditOrderOpen(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-800 text-xs font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                  Chỉnh sửa
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                              <div className="space-y-3 bg-slate-50/60 p-4 rounded-xl border border-slate-100">
                                <div className="flex justify-between items-center py-1.5 border-b border-dashed border-gray-200">
                                  <span className="text-gray-600 font-medium">Người đặt chỗ:</span>
                                  <span className="font-bold text-gray-900 text-sm">
                                    {(order.booker_name && !order.booker_name.includes('Giữ chỗ tạm'))
                                      ? order.booker_name
                                      : (leadPassenger?.full_name || 'Chưa cung cấp')}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center py-1.5 border-b border-dashed border-gray-200">
                                  <span className="text-gray-600 font-medium">Số điện thoại:</span>
                                  <span className="font-mono font-bold text-gray-900 text-sm">
                                    {order.booker_phone || leadPassenger?.phone || 'Chưa cung cấp'}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center py-1.5 border-b border-dashed border-gray-200">
                                  <span className="text-gray-600 font-medium">Sales / CTV phụ trách:</span>
                                  <span className="font-bold text-blue-700 text-sm">
                                    {order.created_by || 'Chưa rõ'}
                                  </span>
                                </div>
                                {order.customer_source && order.customer_source !== 'CTV' && (
                                  <div className="flex justify-between items-center py-1.5">
                                    <span className="text-gray-600 font-medium">Nguồn khách:</span>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                      {order.customer_source}
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="space-y-3 bg-slate-50/60 p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
                                {order.ctv_info && (
                                  <div className="bg-amber-50/80 p-3 rounded-lg border border-amber-200 space-y-1 mb-2">
                                    <span className="text-amber-900 font-bold text-xs block">Ghi chú / Thông tin CTV:</span>
                                    <p className="font-medium text-amber-950 text-xs whitespace-pre-wrap leading-relaxed">
                                      {order.ctv_info}
                                    </p>
                                  </div>
                                )}
                                <div className="flex flex-wrap items-center justify-between py-1 gap-2">
                                  <span className="text-gray-700 font-bold flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-blue-600 shrink-0" /> Hợp đồng dịch vụ:
                                  </span>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <button
                                      type="button"
                                      onClick={() => setContractPrintOrder(order)}
                                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border border-indigo-200 cursor-pointer shadow-2xs"
                                      title="Mở mẫu in hợp đồng du lịch online chuẩn A4"
                                    >
                                      <Printer className="w-3.5 h-3.5 shrink-0 text-indigo-600" />
                                      In HĐ Online
                                    </button>

                                    {order.contract_url ? (
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded font-bold text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                          Đã lưu Google Drive
                                        </span>
                                        <a
                                          href={order.contract_url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                                        >
                                          <Eye className="w-3.5 h-3.5 shrink-0" /> Xem trên Drive
                                        </a>
                                        {(['admin', 'operator'].includes(currentRole) || order.user_id === profile?.id || order.created_by === profile?.full_name) && (
                                          <button
                                            onClick={() => handleDeleteContract(order.id)}
                                            className="p-1.5 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-lg transition-colors cursor-pointer shrink-0 border border-transparent hover:border-rose-200"
                                            title="Gỡ file hợp đồng"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded font-semibold text-xs bg-amber-50 text-amber-700 border border-amber-200">
                                          <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                          Chưa lưu Google Drive
                                        </span>
                                        <label className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm">
                                          <Upload className="w-3.5 h-3.5 shrink-0" />
                                          Tải file lên Drive
                                          <input
                                            type="file"
                                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                            className="hidden"
                                            onChange={(e) => {
                                              const file = e.target.files?.[0];
                                              if (file) handleUploadContract(order.id, order.id.substring(0,8), file);
                                            }}
                                            disabled={contractUploadProgress[order.id]}
                                          />
                                        </label>
                                        {contractUploadProgress[order.id] && <Clock className="w-4 h-4 animate-spin text-blue-600 shrink-0" />}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : currentTab === 'details' ? (
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        {/* Box 1: Combined Pricing Breakdown & Service Config */}
                        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm space-y-4">
                          <h4 className="text-xs font-black uppercase tracking-wider text-gray-500 border-b border-gray-100 pb-2 flex items-center justify-between flex-wrap gap-2">
                            <span className="flex items-center gap-1.5">
                              <CreditCard className="w-4 h-4 text-rose-500" />
                              Chi tiết bảng tính giá & Dịch vụ
                            </span>
                            <div className="flex items-center gap-2">
                              {order.seller_type === 'agent' && (
                                <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold px-2 py-0.5 rounded-full">
                                  Đại lý (Giá Net)
                                </span>
                              )}
                              {(['admin', 'operator'].includes(currentRole) || order.user_id === profile?.id || order.created_by === profile?.full_name) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingOrder(order);
                                    setIsEditOrderOpen(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-800 text-[10px] font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Edit className="w-3 h-3" />
                                  Chỉnh sửa
                                </button>
                              )}
                            </div>
                          </h4>

                          <div className="space-y-3 text-xs">
                            {/* Phần 1: Bảng tính giá chi tiết */}
                            <div className="space-y-1.5">
                              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Bảng tính giá chi tiết</div>
                              <div className="flex justify-between py-1 border-b border-dashed border-gray-100">
                                <span className="text-gray-600 font-medium">
                                  NL ({(order.adult_count || 1)} x {new Intl.NumberFormat('vi-VN').format(priceAdult)} đ):
                                </span>
                                <span className="font-bold text-gray-900">{new Intl.NumberFormat('vi-VN').format(totalAdult)} đ</span>
                              </div>
                              {(order.child_count || 0) > 0 && (
                                <div className="flex justify-between py-1 border-b border-dashed border-gray-100">
                                  <span className="text-gray-600 font-medium">
                                    TE ({order.child_count} x {new Intl.NumberFormat('vi-VN').format(priceChild)} đ):
                                  </span>
                                  <span className="font-bold text-gray-900">{new Intl.NumberFormat('vi-VN').format(totalChild)} đ</span>
                                </div>
                              )}
                              {(order.infant_count || 0) > 0 && (
                                <div className="flex justify-between py-1 border-b border-dashed border-gray-100">
                                  <span className="text-gray-600 font-medium">
                                    TN ({order.infant_count} x {new Intl.NumberFormat('vi-VN').format(priceInfant)} đ):
                                  </span>
                                  <span className="font-bold text-gray-900">{new Intl.NumberFormat('vi-VN').format(totalInfant)} đ</span>
                                </div>
                              )}
                              {totalSingleRoom > 0 && (
                                <div className="flex justify-between py-1 border-b border-dashed border-gray-100">
                                  <span className="text-gray-600 font-medium">
                                    Phòng đơn ({(order.single_room_count || 1)} x {new Intl.NumberFormat('vi-VN').format(singleRoomSurcharge)} đ):
                                  </span>
                                  <span className="font-bold text-red-600">{new Intl.NumberFormat('vi-VN').format(totalSingleRoom)} đ</span>
                                </div>
                              )}
                              {totalVisa > 0 && (
                                <div className="flex justify-between py-1 border-b border-dashed border-gray-100 text-blue-800">
                                  <span className="font-medium flex items-center gap-1">
                                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                                    Phí Visa ({visaPassengersCount} x {new Intl.NumberFormat('vi-VN').format(priceVisaTour)} đ):
                                  </span>
                                  <span className="font-bold text-blue-700">+{new Intl.NumberFormat('vi-VN').format(totalVisa)} đ</span>
                                </div>
                              )}
                              {(order.discount_value || 0) > 0 && (
                                <div className="flex justify-between py-1 border-b border-dashed border-gray-100">
                                  <span className="text-rose-500 font-medium">Giảm giá {order.discount_type === 'percent' ? `(${order.discount_value}%)` : ''} : </span>
                                  <span className="font-bold text-rose-600">-{new Intl.NumberFormat('vi-VN').format(
                                    order.discount_type === 'percent'
                                      ? ((totalAdult + totalChild + totalInfant + totalSingleRoom) * (order.discount_value || 0)) / 100
                                      : (order.discount_value || 0)
                                  )} đ</span>
                                </div>
                              )}
                              {order.surcharges && order.surcharges.length > 0 ? (
                                order.surcharges.filter(s => s.amount > 0).map((s, idx) => (
                                  <div key={s.id || idx} className="flex justify-between py-1 border-b border-dashed border-gray-100">
                                    <span className="text-blue-500 font-medium">{s.name || `Phụ thu ${idx + 1}`}:</span>
                                    <span className="font-bold text-blue-600">+{new Intl.NumberFormat('vi-VN').format(s.amount)} đ</span>
                                  </div>
                                ))
                              ) : (order.surcharge_amount || 0) > 0 && (
                                <div className="flex justify-between py-1 border-b border-dashed border-gray-100">
                                  <span className="text-blue-500 font-medium">{order.surcharge_name || 'Phụ thu khác'}:</span>
                                  <span className="font-bold text-blue-600">+{new Intl.NumberFormat('vi-VN').format(order.surcharge_amount || 0)} đ</span>
                                </div>
                              )}
                              {(order.price_markup || 0) > 0 && (
                                <div className="flex justify-between py-1 border-b border-dashed border-gray-100 text-xs">
                                  <span className="text-emerald-700 font-medium">Tiền tour chênh lệch (CTV):</span>
                                  <span className="font-bold text-emerald-600">+{new Intl.NumberFormat('vi-VN').format(order.price_markup || 0)} đ</span>
                                </div>
                              )}
                              {order.vat_option === 'Xuất VAT' && (
                                <div className="flex justify-between py-1 border-b border-dashed border-gray-100">
                                  <span className="text-emerald-700 font-medium">Thuế VAT 10% (Đã gồm trong giá):</span>
                                  <span className="font-bold text-emerald-600">{new Intl.NumberFormat('vi-VN').format(computedVat)} đ</span>
                                </div>
                              )}
                              <div className="flex justify-between py-2 mt-1 bg-slate-50 px-2.5 rounded-lg border border-slate-200 items-center">
                                <span className="font-black text-gray-900 uppercase text-[11px]">TỔNG CỘNG (GIÁ NIÊM YẾT):</span>
                                <span className="font-black text-rose-600 text-sm">{new Intl.NumberFormat('vi-VN').format(order.total_price)} đ</span>
                              </div>
                            </div>

                            {/* Phần 2: Cấu hình Phụ thu & Dịch vụ */}
                            <div className="pt-2 border-t border-gray-100 space-y-1.5">
                              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Cấu hình dịch vụ & Phụ thu</div>
                              <div className="flex justify-between py-1 border-b border-dashed border-gray-100">
                                <span className="text-gray-500">Phòng đơn:</span>
                                <span className="font-bold text-gray-900">
                                  {order.single_room_count ? `${order.single_room_count} phòng` : 'Không'}
                                </span>
                              </div>
                              <div className="flex justify-between py-1 border-b border-dashed border-gray-100">
                                <span className="text-gray-500">Ghép giường:</span>
                                <span className="font-semibold text-gray-800">{order.room_share_info || 'Không'}</span>
                              </div>
                              <div className="flex flex-col py-1 border-b border-dashed border-gray-100">
                                <div className="flex justify-between">
                                  <span className="text-gray-500">VAT:</span>
                                  <span className={`font-bold ${order.vat_option === 'Xuất VAT' ? 'text-blue-600' : 'text-gray-500'}`}>
                                    {order.vat_option || 'Không'}
                                  </span>
                                </div>
                                {order.vat_option === 'Xuất VAT' && (
                                  <div className="mt-2 p-2 bg-blue-50/50 rounded-md border border-blue-100 space-y-1">
                                    <div className="flex justify-between text-[11px]">
                                      <span className="text-slate-500">Công ty:</span>
                                      <span className="font-semibold text-slate-700 text-right">{order.vat_company_name || '---'}</span>
                                    </div>
                                    <div className="flex justify-between text-[11px]">
                                      <span className="text-slate-500">MST:</span>
                                      <span className="font-semibold text-slate-700 text-right">{order.vat_tax_code || '---'}</span>
                                    </div>
                                    <div className="flex justify-between text-[11px]">
                                      <span className="text-slate-500">Địa chỉ:</span>
                                      <span className="font-semibold text-slate-700 text-right line-clamp-2" title={order.vat_address || ''}>{order.vat_address || '---'}</span>
                                    </div>
                                    <div className="flex justify-between text-[11px]">
                                      <span className="text-slate-500">Email:</span>
                                      <span className="font-semibold text-slate-700 text-right">{order.vat_email || '---'}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                              {order.special_requests && (
                                <div className="pt-1">
                                  <span className="text-gray-500 block mb-1">Ghi chú đặc biệt:</span>
                                  <div className="bg-amber-50 border border-amber-100 rounded-lg p-2.5 text-amber-900 italic leading-relaxed text-[11px]">
                                    "{order.special_requests}"
                                  </div>
                                </div>
                              )}
                              {order.ctv_info && isSaleRole && (
                                <div className="pt-1">
                                  <span className="text-amber-900 font-bold block mb-1">🤝 Ghi chú CTV:</span>
                                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-amber-950 font-medium leading-relaxed text-[11px]">
                                    {order.ctv_info}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Phần 3: Thống kê Hoa hồng & Giá Net */}
                            {(isAgentRole || order.seller_type === 'agent' || currentRole === 'CTV' || profile?.role === 'CTV' || (isSaleRole && order.ctv_info && order.ctv_info.trim().length > 0)) && (baseTotalCommission > 0 || netCommissionReceived > 0 || (order.price_markup || 0) > 0) && (
                              <div className="pt-2 border-t border-dashed border-gray-200 space-y-2">
                                <div className="bg-amber-50/90 p-3 rounded-xl border border-amber-200/80 space-y-2 text-xs">
                                  <div className="flex justify-between items-center text-amber-900 font-bold border-b border-amber-200/60 pb-1.5">
                                    <span className="flex items-center gap-1.5 text-amber-800">
                                      <Coins className="w-4 h-4 text-amber-600 shrink-0" />
                                      <span>Hoa hồng / khách:</span>
                                    </span>
                                    <span className="font-extrabold text-amber-950">{new Intl.NumberFormat('vi-VN').format(baseCommissionPerSeat)} đ/khách</span>
                                  </div>

                                  <div className="flex justify-between items-center text-amber-900 font-medium">
                                    <span>Hoa hồng định mức ({commissionPassengerCount} chỗ):</span>
                                    <span className="font-semibold">{new Intl.NumberFormat('vi-VN').format(baseTotalCommission)} đ</span>
                                  </div>

                                  {(order.price_markup || 0) > 0 && (
                                    <div className="bg-emerald-50/80 p-2.5 rounded-lg border border-emerald-200 space-y-1.5 my-1 text-emerald-950">
                                      <div className="flex justify-between items-center font-medium">
                                        <span>Tổng giá chênh lệch:</span>
                                        <span className="font-bold text-emerald-700">+{new Intl.NumberFormat('vi-VN').format(order.price_markup || 0)} đ</span>
                                      </div>
                                      <div className="flex justify-between items-center text-rose-700 font-medium">
                                        <span>Phí công ty thu ({markupTaxPercent}%):</span>
                                        <span className="font-bold">-{new Intl.NumberFormat('vi-VN').format(order.markup_fee_amount || Math.round(((order.price_markup || 0) * markupTaxPercent) / 100))} đ</span>
                                      </div>
                                      <div className="flex justify-between items-center text-emerald-900 font-bold border-t border-emerald-200/60 pt-1 mt-0.5">
                                        <span>Số tiền chênh lệch còn lại:</span>
                                        <span className="text-emerald-600 font-black">+{new Intl.NumberFormat('vi-VN').format(priceMarkupNet)} đ</span>
                                      </div>
                                    </div>
                                  )}

                                  {commissionDeducted > 0 && (
                                    <div className="flex justify-between items-center text-rose-700 font-medium">
                                      <span>Bị trừ (Do giảm giá cho khách):</span>
                                      <span className="font-bold text-rose-600">-{new Intl.NumberFormat('vi-VN').format(commissionDeducted)} đ</span>
                                    </div>
                                  )}

                                  <div className="flex justify-between items-center bg-emerald-100/90 text-emerald-950 p-2.5 rounded-lg border border-emerald-300 font-extrabold text-xs mt-1">
                                    <span>Tổng hoa hồng thực nhận:</span>
                                    <span className="text-base font-black text-emerald-700">{new Intl.NumberFormat('vi-VN').format(netCommissionReceived)} đ</span>
                                  </div>
                                </div>

                                {/* Giá Net Prominent Highlight Box - CHỈ hiển thị khi user là Đại lý */}
                                {isAgentRole && (
                                  <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-3 rounded-xl border border-indigo-200/90 shadow-xs flex justify-between items-center">
                                    <div className="flex flex-col">
                                      <span className="font-black text-indigo-950 text-xs uppercase tracking-tight">GIÁ NET:</span>
                                      <span className="text-[10px] text-indigo-600 font-medium">(Đã trừ tổng hoa hồng thực nhận)</span>
                                    </div>
                                    <span className="text-base font-black text-indigo-700">
                                      {new Intl.NumberFormat('vi-VN').format(Math.max(0, order.total_price - netCommissionReceived))} đ
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Box 2: Full passenger manifests or Hold Overview */}
                        {order.status === 'hold' ? (
                          <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm space-y-4 lg:col-span-2">
                            <div className="border-b border-gray-100 pb-2 flex items-center justify-between">
                              <h4 className="text-xs font-black uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                                <Users className="w-4 h-4 text-amber-500" />
                                Tổng quan hành khách giữ chỗ ({order.adult_count !== undefined ? ((order.adult_count || 0) + (order.child_count || 0) + (order.infant_count || 0)) : orderPassengers.length || 1} khách)
                              </h4>
                              <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded border border-amber-150 uppercase tracking-wider">
                                Trạng thái: Giữ chỗ tạm
                              </span>
                            </div>

                            <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 space-y-2.5">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block">Cơ cấu hành khách</span>
                              <div className="space-y-2 text-xs">
                                <div className="flex justify-between items-center py-1 border-b border-dashed border-gray-100">
                                  <span className="text-gray-600 font-medium">Người lớn (Adult):</span>
                                  <span className="font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-150">
                                    {order.adult_count !== undefined ? (order.adult_count || 0) : orderPassengers.filter(p => !p.full_name.includes('Trẻ em') && !p.full_name.includes('Trẻ nhỏ')).length || 1} khách
                                  </span>
                                </div>
                                <div className="flex justify-between items-center py-1 border-b border-dashed border-gray-100">
                                  <span className="text-gray-600 font-medium">Trẻ em (Child, 2-11 tuổi):</span>
                                  <span className="font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-150">
                                    {order.child_count !== undefined ? (order.child_count || 0) : orderPassengers.filter(p => p.full_name.includes('Trẻ em')).length} khách
                                  </span>
                                </div>
                                <div className="flex justify-between items-center py-1">
                                  <span className="text-gray-600 font-medium">Trẻ nhỏ (Infant, &lt;2 tuổi):</span>
                                  <span className="font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-150">
                                    {order.infant_count !== undefined ? (order.infant_count || 0) : orderPassengers.filter(p => p.full_name.includes('Trẻ nhỏ')).length} khách
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="bg-blue-50/60 border border-blue-100/80 rounded-xl p-3.5 text-blue-800 flex items-start gap-2.5">
                              <Info className="w-4.5 h-4.5 shrink-0 mt-0.5 text-blue-500" />
                              <div className="space-y-1 w-full">
                                <p className="font-bold text-xs">Yêu cầu khai báo thông tin & Hồ sơ Visa</p>
                                <p className="text-gray-600 leading-relaxed text-[11px]">
                                  Trong trạng thái giữ chỗ tạm thời, hệ thống chỉ hiển thị tổng quan số lượng khách đặt chỗ để tối ưu hóa hiệu năng hiển thị.
                                  Bản khai chi tiết từng hành khách (Họ tên, Ngày sinh, Hộ chiếu) và chức năng tải lên hồ sơ Visa sẽ tự động kích hoạt sau khi booking được chuyển sang trạng thái <strong>Sure chỗ (Xác nhận chắc chắn)</strong>.
                                </p>
                                {['admin', 'operator', 'sale_leader'].includes(currentRole) && (
                                  <div className="pt-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const currentOrderPassengers = passengers.filter(p => p.order_id === order.id);
                                        const hasRealPassengers = currentOrderPassengers.length > 0 && currentOrderPassengers.some(p => {
                                          const n = (p.full_name || p.name || '').trim();
                                          return n && n !== 'Chưa cung cấp (Giữ chỗ tạm)' && n !== 'Hành khách';
                                        });

                                        if (hasRealPassengers) {
                                          setConfirmModalData({
                                            isOpen: true,
                                            title: 'Duyệt chỗ & Chốt Sure',
                                            message: `Xác nhận duyệt chỗ và chuyển booking #${order.id.substring(0, 8)} sang trạng thái Chắc chắn (Sure)? Danh sách ${currentOrderPassengers.length} hành khách đã được ghi nhận và số chỗ sẽ chuyển sang danh sách Đã bán chính thức của đoàn.`,
                                            onConfirm: () => {
                                              confirmOrder(order.id, currentOrderPassengers.map(p => ({
                                                full_name: p.full_name || p.name || 'Hành khách',
                                                gender: p.gender || 'male',
                                                phone: p.phone,
                                                dob: p.dob,
                                                passport_number: p.passport_number,
                                                passport_expiry_date: (p as any).passport_expiry || p.passport_expiry_date,
                                                passport_url: p.passport_url,
                                                needs_visa_service: p.needs_visa_service,
                                                is_payer: p.is_payer
                                              })));
                                            }
                                          });
                                        } else {
                                          setOrderToConfirm(order.id);
                                          setIsPassengerModalOpen(true);
                                        }
                                      }}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                                    >
                                      <CheckCircle className="w-3.5 h-3.5" />
                                      Duyệt chỗ (Chốt Sure) ngay
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm space-y-3.5 lg:col-span-2">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                              <h4 className="text-xs font-black uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                                <Users className="w-4 h-4 text-emerald-600" />
                                Bản khai hành khách & Visa ({orderPassengers.length} / {(order.adult_count || 0) + (order.child_count || 0) + (order.infant_count || 0)} khách)
                              </h4>
                              {((order.adult_count || 0) + (order.child_count || 0) + (order.infant_count || 0) - orderPassengers.length) > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setOrderToAddPassengers(order.id)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  Nhập thông tin {(order.adult_count || 0) + (order.child_count || 0) + (order.infant_count || 0) - orderPassengers.length} khách còn thiếu
                                </button>
                              )}
                            </div>

                            {orderPassengers.length > ((order.adult_count || 0) + (order.child_count || 0) + (order.infant_count || 0)) && (
                              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                                  <span>
                                    <strong>Cảnh báo:</strong> Đơn hàng khai báo <strong>{orderPassengers.length} hành khách</strong>, vượt quá số chỗ đăng ký trên đơn (<strong>{(order.adult_count || 0) + (order.child_count || 0) + (order.infant_count || 0)} khách</strong>). Vui lòng dùng nút <strong>"Xóa"</strong> đối với khách thừa bên dưới hoặc bấm <strong>"Chỉnh sửa"</strong> bảng giá để điều chỉnh lại số chỗ.
                                  </span>
                                </div>
                              </div>
                            )}

                            {orderPassengers.length === 0 ? (
                              <p className="text-xs text-gray-500 italic py-4 text-center">Chưa có thông tin chi tiết từng hành khách. Vui lòng thêm khách hàng.</p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="min-w-full text-xs text-left text-gray-700 table-auto">
                                  <thead>
                                    <tr className="border-b border-gray-150 text-gray-400 font-bold uppercase tracking-wider text-[10px] whitespace-nowrap">
                                      <th className="sticky left-0 bg-white z-10 py-2.5 pr-4 min-w-[160px] whitespace-nowrap shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Họ và tên khách</th>
                                      <th className="py-2.5 px-3 min-w-[90px] whitespace-nowrap">Ngày sinh</th>
                                      <th className="py-2.5 px-3 min-w-[110px] whitespace-nowrap">Số hộ chiếu</th>
                                      <th className="py-2.5 px-3 min-w-[100px] whitespace-nowrap">Số điện thoại</th>
                                      <th className="py-2.5 px-3 min-w-[150px] whitespace-nowrap">Tài liệu</th>
                                      <th className="py-2.5 px-3 min-w-[140px] whitespace-nowrap">Thời gian nộp</th>
                                      <th className="py-2.5 px-3 min-w-[100px] whitespace-nowrap">Loại khách</th>
                                      <th className="py-2.5 px-3 text-center min-w-[125px] whitespace-nowrap">Hồ sơ / Visa</th>
                                      <th className="py-2.5 pl-3 pr-1 text-right min-w-[65px] whitespace-nowrap">Thao tác</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {orderPassengers.map((passenger) => (
                                      <tr key={passenger.id} className="group hover:bg-slate-50/50">
                                        <td className="sticky left-0 bg-white group-hover:bg-slate-50 z-10 py-2.5 pr-4 font-bold text-gray-900 whitespace-nowrap shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] border-r border-gray-100">{passenger.full_name}</td>
                                        <td className="py-2.5 px-3 text-gray-500 whitespace-nowrap">
                                          {passenger.dob ? new Date(passenger.dob).toLocaleDateString('vi-VN') : '-'}
                                        </td>
                                        <td className="py-2.5 px-3 font-mono text-gray-700 uppercase whitespace-nowrap">
                                          {passenger.passport_number || '-'}
                                        </td>
                                        <td className="py-2.5 px-3 text-gray-500 whitespace-nowrap">{passenger.phone || '-'}</td>
                                        <td className="py-2.5 px-3">
                                          <PassengerDocumentList 
                                            passportUrl={passenger.passport_url}
                                            laborContractUrl={passenger.labor_contract_url}
                                            maxInitialDisplay={2}
                                            variant="compact"
                                          />
                                        </td>
                                        <td className="py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
                                          {passenger.visa_submitted_at ? format(new Date(passenger.visa_submitted_at), 'dd/MM/yyyy HH:mm') : <span className="text-gray-300 italic">-</span>}
                                        </td>
                                        <td className="py-2.5 px-3 whitespace-nowrap">
                                          {passenger.is_payer ? (
                                            <span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded border border-blue-200 text-[10px] whitespace-nowrap inline-block">Trưởng đoàn</span>
                                          ) : (
                                            <span className="text-gray-500 bg-slate-100 px-2 py-0.5 rounded text-[10px] whitespace-nowrap inline-block">Đi cùng</span>
                                          )}
                                        </td>
                                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                          {passenger.visa_status === 'pending' && (
                                            <span className="px-2 py-0.5 font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap inline-block">Chờ nộp hồ sơ</span>
                                          )}
                                          {passenger.visa_status === 'processing' && (
                                            <span className="px-2 py-0.5 font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap inline-block">Đang xét duyệt</span>
                                          )}
                                          {passenger.visa_status === 'approved' && (
                                            <span className="px-2 py-0.5 font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap inline-block">Đạt Visa</span>
                                          )}
                                          {passenger.visa_status === 'rejected' && (
                                            <span className="px-2 py-0.5 font-semibold rounded-full bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap inline-block">Từ chối Visa</span>
                                          )}
                                          {passenger.visa_status === 'disqualified' && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setDisqualifiedReasonModal({
                                                  name: passenger.full_name,
                                                  reason: passenger.visa_disqualified_reason || 'Chưa cập nhật lý do chi tiết.'
                                                });
                                              }}
                                              title="Bấm để xem lý do hồ sơ chưa đạt"
                                              className="px-2 py-0.5 font-bold rounded-full bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200 transition-colors whitespace-nowrap inline-flex items-center gap-1 cursor-pointer"
                                            >
                                              <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                                              Hồ sơ chưa đạt
                                            </button>
                                          )}
                                          {passenger.visa_status === 'not_required' && (
                                            <span className="px-2 py-0.5 font-semibold rounded-full bg-slate-100 text-slate-500 whitespace-nowrap inline-block">Có sẵn Visa</span>
                                          )}
                                        </td>
                                        <td className="py-2.5 pl-3 pr-1 text-right font-semibold whitespace-nowrap">
                                          <div className="flex items-center justify-end gap-2">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setEditingPassenger(passenger);
                                                setIsEditPassengerOpen(true);
                                              }}
                                              className="text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer"
                                            >
                                              Sửa
                                            </button>
                                            {(!isOrderLocked(order) || ['admin', 'sale_leader', 'operator'].includes(currentRole)) && (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setConfirmModalData({
                                                    isOpen: true,
                                                    title: 'Xác nhận xóa hành khách',
                                                    message: `Bạn có chắc chắn muốn xóa hành khách "${passenger.full_name || 'chưa đặt tên'}" khỏi đơn hàng này không?`,
                                                    onConfirm: async () => {
                                                      await deletePassenger(passenger.id);
                                                      setConfirmModalData(prev => ({ ...prev, isOpen: false }));
                                                    }
                                                  });
                                                }}
                                                className="text-rose-600 hover:text-rose-800 font-bold hover:underline cursor-pointer ml-1"
                                              >
                                                Xóa
                                              </button>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                      /* Tab Lịch sử thanh toán */
                          <div className="space-y-5 animate-in fade-in duration-150">
                            {/* Khối thống kê số tiền */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm flex items-center justify-between">
                                <div>
                                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Tổng giá trị đơn</span>
                                  <span className="text-sm font-black text-slate-800 block mt-1">
                                    {new Intl.NumberFormat('vi-VN').format(order.total_price)} đ
                                  </span>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-500">
                                  <DollarSign className="w-5 h-5" />
                                </div>
                              </div>

                              <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm flex items-center justify-between">
                                <div>
                                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-wider block">Đã thanh toán (Đã duyệt)</span>
                                  <span className="text-sm font-black text-emerald-600 block mt-1">
                                    {new Intl.NumberFormat('vi-VN').format(approvedPaid)} đ
                                  </span>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                                  <Check className="w-5 h-5" />
                                </div>
                              </div>

                              <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm flex items-center justify-between">
                                <div>
                                  <span className="text-[10px] font-black text-amber-500 uppercase tracking-wider block">Đang chờ phê duyệt</span>
                                  <span className="text-sm font-black text-amber-600 block mt-1">
                                    {new Intl.NumberFormat('vi-VN').format(pendingPaid)} đ
                                  </span>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
                                  <Clock className="w-5 h-5" />
                                </div>
                              </div>

                              <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm flex items-center justify-between">
                                <div>
                                  <span className="text-[10px] font-black text-rose-500 uppercase tracking-wider block">Số tiền còn lại</span>
                                  <span className={`text-sm font-black block mt-1 ${remainingAmount === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {new Intl.NumberFormat('vi-VN').format(remainingAmount)} đ
                                  </span>
                                </div>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${remainingAmount === 0 ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                                  {remainingAmount === 0 ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-5 h-5" />}
                                </div>
                              </div>
                            </div>

                            {/* Danh sách lịch sử giao dịch */}
                            <div className="bg-white rounded-2xl border border-slate-200/85 shadow-md overflow-hidden" id="transaction_history_section">
                              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600 border border-emerald-100">
                                    <FileText className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                                      Lịch sử giao dịch thu/chi liên quan
                                    </h4>
                                    <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                                      Danh sách phiếu thu và phiếu chi đã khởi tạo cho booking này
                                    </p>
                                  </div>
                                </div>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wider">
                                  {orderInvoices.length} Giao dịch
                                </span>
                              </div>

                              {orderInvoices.length === 0 ? (
                                <div className="text-center py-12 text-gray-400 text-xs italic bg-slate-50/20">
                                  Chưa có lịch sử thanh toán hay biên lai thu chi nào được ghi nhận cho booking này.
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {orderInvoices.map((inv) => {
                                    const isReceipt = inv.type === "receipt";
                                    const isExpanded = expandedInvoiceId === inv.id;
                                    const cardBgClass = isExpanded
                                      ? "bg-white border border-slate-200 shadow-sm rounded-xl ring-1 ring-slate-900/5 transition-all overflow-hidden"
                                      : "bg-white border border-slate-200/80 rounded-xl hover:border-slate-300 hover:shadow-2xs transition-all overflow-hidden";
                                    return (
                                      <div key={inv.id} className={cardBgClass}>
                                        {/* Row Header (Collapsed State) */}
                                        <div
                                          onClick={() => setExpandedInvoiceId(isExpanded ? null : inv.id)}
                                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 transition-colors cursor-pointer select-none hover:bg-slate-50/60"
                                        >
                                          <div className="flex items-center gap-3 min-w-0">
                                            {/* Chevron indicator */}
                                            <div className="text-slate-400 shrink-0">
                                              {isExpanded ? (
                                                <ChevronDown className="w-4 h-4 text-slate-600" />
                                              ) : (
                                                <ChevronRight className="w-4 h-4 text-slate-400" />
                                              )}
                                            </div>

                                            {/* Invoice Code and Type Badge */}
                                            <div className="flex flex-wrap items-center gap-2 min-w-0">
                                              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 text-[11px] font-mono font-medium shrink-0">
                                                {inv.invoice_code || inv.id.substring(0, 8).toUpperCase()}
                                              </span>
                                              {isReceipt ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/60 uppercase tracking-wide">
                                                  Phiếu thu
                                                </span>
                                              ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-rose-50 text-rose-800 border border-rose-200/60 uppercase tracking-wide">
                                                  Phiếu chi (Hoàn)
                                                </span>
                                              )}
                                            </div>
                                          </div>

                                          <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 ml-7 sm:ml-0">
                                            {/* Amount */}
                                            <div className="text-left sm:text-right whitespace-nowrap">
                                              <span className={`font-semibold text-sm ${isReceipt ? "text-emerald-700" : "text-rose-700"}`}>
                                                {isReceipt ? "+" : "-"} {new Intl.NumberFormat("vi-VN").format(inv.amount)} đ
                                              </span>
                                            </div>

                                            {/* Date Time */}
                                            <div className="hidden md:block text-slate-500 font-normal text-[11px] whitespace-nowrap">
                                              {inv.created_at ? (
                                                <div className="flex flex-col text-right leading-tight">
                                                  <span className="font-medium text-slate-700">
                                                    {new Date(inv.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                                                  </span>
                                                  <span className="text-[10px] text-slate-400">
                                                    {new Date(inv.created_at).toLocaleDateString("vi-VN")}
                                                  </span>
                                                </div>
                                              ) : (
                                                "---"
                                              )}
                                            </div>

                                            {/* Status Badge */}
                                            <div className="shrink-0 text-right">
                                              {inv.status === "approved" && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                                  <Check className="w-3 h-3 text-emerald-600" />
                                                  Đã duyệt
                                                </span>
                                              )}
                                              {inv.status === "pending" && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200/70">
                                                  <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                                                  Chờ duyệt
                                                </span>
                                              )}
                                              {inv.status === "rejected" && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-800 border border-rose-200/70">
                                                  <AlertCircle className="w-3 h-3 text-rose-600" />
                                                  Từ chối
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        {/* Expanded Details Area */}
                                        {isExpanded && (
                                          <div className="p-4 border-t border-slate-150 bg-slate-50/50 text-xs text-slate-700 animate-fadeIn space-y-3">
                                            {/* Metadata Tiles Grid */}
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                              {/* Payment Method */}
                                              <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs flex items-center gap-3">
                                                <CreditCard className="w-4 h-4 text-slate-400 shrink-0" />
                                                <div className="min-w-0">
                                                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Phương thức thanh toán</span>
                                                  <span className="font-medium text-slate-800 text-xs truncate block">{inv.payment_method || "Chuyển khoản"}</span>
                                                </div>
                                              </div>

                                              {/* Transaction Time */}
                                              <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs flex items-center gap-3">
                                                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                                                <div className="min-w-0">
                                                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Thời gian giao dịch</span>
                                                  <span className="font-medium text-slate-800 text-xs truncate block">
                                                    {inv.created_at ? (
                                                      `${new Date(inv.created_at).toLocaleTimeString("vi-VN")} ngày ${new Date(inv.created_at).toLocaleDateString("vi-VN")}`
                                                    ) : "---"}
                                                  </span>
                                                </div>
                                              </div>

                                              {/* Creator / Payer */}
                                              <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs flex items-center gap-3">
                                                <User className="w-4 h-4 text-slate-400 shrink-0" />
                                                <div className="min-w-0">
                                                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Người nộp / Tạo</span>
                                                  <span className="font-medium text-slate-800 text-xs truncate block">
                                                    {(inv.created_by && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(inv.created_by))
                                                      ? inv.created_by
                                                      : (order.created_by || order.booker_name || leadPassenger?.full_name || "Hệ thống")}
                                                  </span>
                                                </div>
                                              </div>
                                            </div>

                                            {/* Note / Description Box */}
                                            <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs space-y-1.5">
                                              <div className="flex items-center gap-1.5 text-slate-500 font-medium text-[11px] uppercase tracking-wider">
                                                <FileText className="w-3.5 h-3.5 text-slate-400" />
                                                <span>Ghi chú / Mô tả chi tiết</span>
                                              </div>
                                              <div className="p-2.5 rounded-md bg-slate-50/80 text-slate-800 text-xs font-normal leading-relaxed whitespace-pre-wrap break-words border border-slate-200/60">
                                                {inv.description || "Chuyển khoản thanh toán"}
                                              </div>
                                            </div>

                                            {/* Verification Details if verified */}
                                            {(inv.verified_by || inv.verified_at) && (
                                              <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-2 text-xs">
                                                <div className="flex items-center gap-2">
                                                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                                                  <span className="text-slate-600 font-medium">Người duyệt: <strong className="text-slate-800 font-semibold">{inv.verified_by || "Hệ thống"}</strong></span>
                                                </div>
                                                {inv.verified_at && (
                                                  <span className="text-slate-400 text-[11px]">
                                                    Ngày duyệt: {new Date(inv.verified_at).toLocaleDateString("vi-VN")}
                                                  </span>
                                                )}
                                              </div>
                                            )}

                                            {/* Proof File Attachment Footer */}
                                            <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                              <div className="flex items-center gap-2 text-slate-600 font-medium text-xs">
                                                <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                                                <span>Minh chứng giao dịch:</span>
                                              </div>
                                              {inv.file_url ? (
                                                <a
                                                  href={inv.file_url}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md transition-colors cursor-pointer"
                                                >
                                                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                                                  Xem ảnh minh chứng giao dịch
                                                </a>
                                              ) : (
                                                <span className="text-slate-400 italic text-xs">
                                                  Không có ảnh minh chứng được đính kèm
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                          </div>
                        </div>
                      )}

                      {/* Box 3: Action center bar */}
                      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                            order.status === 'cancelled' ? 'bg-slate-50 text-slate-500' :
                            order.status === 'hold' ? 'bg-amber-50 text-amber-600' :
                            (order.status === 'paid' || isFullyPaid) ? 'bg-blue-50 text-blue-600' :
                            isPartiallyPaid ? 'bg-cyan-50 text-cyan-600' : 'bg-emerald-50 text-emerald-600'
                          }`}>
                            {order.status === 'cancelled' ? <ShieldCheck className="w-4 h-4" /> :
                             order.status === 'hold' ? <Clock className="w-4 h-4" /> :
                             (order.status === 'paid' || isFullyPaid) ? <Check className="w-4 h-4" /> :
                             isPartiallyPaid ? <CreditCard className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                          </div>
                          <div className="text-xs">
                            <span className="font-bold text-gray-900 block">
                              Yêu cầu nghiệp vụ: {
                                order.status === 'cancelled' ? 'Booking đã đóng (Huỷ)' :
                                order.status === 'hold' ? 'Nhận thanh toán đặt cọc' :
                                (order.status === 'paid' || isFullyPaid) ? 'Booking đã hoàn tất thanh toán' :
                                isPartiallyPaid ? 'Booking còn dư nợ, cần thanh toán thêm' :
                                order.status === 'sure' ? 'Xác nhận dịch vụ hoàn tất' : 'Booking đã đóng'
                              }
                            </span>
                            <span className="text-gray-500 mt-0.5 block">
                              {order.status === 'cancelled'
                                ? 'Đơn đặt đã huỷ. Quỹ vé đã được giải phóng để bán cho khách hàng khác.'
                                : order.status === 'hold'
                                ? 'Cần chuyển trạng thái đơn sang Sure để giữ phòng & vé máy bay chính thức trước khi đếm ngược kết thúc.'
                                : (order.status === 'paid' || isFullyPaid)
                                ? 'Booking đã được thanh toán đầy đủ, không còn dư nợ.'
                                : isPartiallyPaid
                                ? 'Booking mới được thanh toán một phần. Cần hoàn tất số dư còn lại.'
                                : order.status === 'sure'
                                ? 'Booking an toàn. Điều hành tour và Đại lý có thể tiến hành chuẩn bị hồ sơ visa, vé máy bay.'
                                : 'Đơn đặt đã huỷ.'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto justify-end">
                          {/* Nút Khóa / Mở khóa booking dành cho Admin & Sale Leader */}
                          {['admin', 'sale_leader'].includes(currentRole) && order.status !== 'cancelled' && (() => {
                            const isLocked = isOrderLocked(order);
                            const isAllowedToUnlock = canUnlockOrder(order, currentRole, profile, profilesList);
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  if (isLocked) {
                                    if (!isAllowedToUnlock) {
                                      const creatorName = order.created_by || 'nhân viên thuộc nhóm khác';
                                      toast.error(`Bạn không có quyền mở khóa booking này. Booking do ${creatorName} tạo. Leader chỉ được mở khóa đơn của thành viên nhóm mình.`);
                                      return;
                                    }
                                    updateOrder(order.id, { is_locked: false });
                                    toast.success(`Đã mở khóa booking #${order.id.substring(0, 8)}. Hệ thống cho phép chỉnh sửa lại thông tin.`);
                                  } else {
                                    updateOrder(order.id, { is_locked: true });
                                    toast.success(`Đã khóa booking #${order.id.substring(0, 8)}`);
                                  }
                                }}
                                className={`px-3.5 py-2 text-xs font-bold rounded-lg border transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                                  isLocked
                                    ? isAllowedToUnlock
                                      ? 'text-amber-800 bg-amber-50 border-amber-300 hover:bg-amber-100 shadow-xs'
                                      : 'text-gray-400 bg-gray-50 border-gray-200 cursor-not-allowed opacity-75'
                                    : 'text-slate-700 bg-slate-50 border-slate-200 hover:bg-slate-100'
                                }`}
                                title={
                                  isLocked
                                    ? isAllowedToUnlock
                                      ? 'Bấm để mở khóa booking'
                                      : 'Bạn không có quyền mở khóa booking của thành viên thuộc nhóm khác'
                                    : 'Bấm để khóa booking'
                                }
                              >
                                {isLocked ? (
                                  <>
                                    <Unlock className={`w-3.5 h-3.5 ${isAllowedToUnlock ? 'text-amber-600' : 'text-gray-400'}`} />
                                    Mở khóa đơn
                                  </>
                                ) : (
                                  <>
                                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                                    Khóa đơn
                                  </>
                                )}
                              </button>
                            );
                          })()}

                          {order.status !== 'cancelled' && (
                            <button
                              type="button"
                              onClick={() => setContractPrintOrder(order)}
                              className={`px-3 py-2 text-xs font-bold rounded-lg border transition-colors inline-flex items-center cursor-pointer shadow-2xs ${
                                order.contract_url 
                                  ? 'text-emerald-700 bg-emerald-50 border-emerald-300 hover:bg-emerald-100'
                                  : 'text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100'
                              }`}
                              title={order.contract_url ? "Hợp đồng đã lưu trên Google Drive (Bấm để in hoặc xem lại)" : "Tạo & In hợp đồng du lịch online chuẩn A4"}
                            >
                              <Printer className={`w-3.5 h-3.5 mr-1.5 ${order.contract_url ? 'text-emerald-600' : 'text-indigo-600'}`} />
                              <span>{order.contract_url ? 'HĐ (Đã lưu)' : 'In HĐ'}</span>
                            </button>
                          )}

                          {order.status !== 'cancelled' && order.status !== 'paid' && !isFullyPaid && (
                            <button
                              type="button"
                              onClick={() => {
                                setPaymentOrder(order);
                                setIsPaymentModalOpen(true);
                              }}
                              className="px-3.5 py-2 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:text-blue-800 transition-colors inline-flex items-center"
                            >
                              <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                              Thanh toán
                            </button>
                          )}
                          {order.status === 'hold' && (
                            <>
                              {/* Direct Confirm / Sure Button for Operator, Admin, Sale Leader */}
                              {['admin', 'operator', 'sale_leader'].includes(currentRole) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const currentOrderPassengers = passengers.filter(p => p.order_id === order.id);
                                    const hasRealPassengers = currentOrderPassengers.length > 0 && currentOrderPassengers.some(p => {
                                      const n = (p.full_name || p.name || '').trim();
                                      return n && n !== 'Chưa cung cấp (Giữ chỗ tạm)' && n !== 'Hành khách';
                                    });

                                    if (hasRealPassengers) {
                                      setConfirmModalData({
                                        isOpen: true,
                                        title: 'Duyệt chỗ & Chốt Sure',
                                        message: `Xác nhận duyệt chỗ và chuyển booking #${order.id.substring(0, 8)} sang trạng thái Chắc chắn (Sure)? Danh sách ${currentOrderPassengers.length} hành khách đã được ghi nhận và số chỗ sẽ chuyển sang danh sách Đã bán chính thức của đoàn.`,
                                        onConfirm: () => {
                                          confirmOrder(order.id, currentOrderPassengers.map(p => ({
                                            full_name: p.full_name || p.name || 'Hành khách',
                                            gender: p.gender || 'male',
                                            phone: p.phone,
                                            dob: p.dob,
                                            passport_number: p.passport_number,
                                            passport_expiry_date: (p as any).passport_expiry || p.passport_expiry_date,
                                            passport_url: p.passport_url,
                                            needs_visa_service: p.needs_visa_service,
                                            is_payer: p.is_payer
                                          })));
                                        }
                                      });
                                    } else {
                                      setOrderToConfirm(order.id);
                                      setIsPassengerModalOpen(true);
                                    }
                                  }}
                                  className="px-3.5 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 rounded-lg hover:bg-emerald-100 hover:text-emerald-800 transition-colors inline-flex items-center cursor-pointer shadow-2xs"
                                  title="Duyệt chỗ và chốt chắc chắn (Sure) cho đoàn"
                                >
                                  <CheckCircle className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                                  Duyệt chỗ (Chốt Sure)
                                </button>
                              )}

                              {/* Extensions Request Button */}
                              {order.is_extended ? (
                                <span className="text-xs text-emerald-600 font-extrabold bg-emerald-50 px-3.5 py-2 rounded-lg border border-emerald-200 inline-flex items-center">
                                  <Check className="w-4 h-4 mr-1.5" /> Đã gia hạn thành công
                                </span>
                              ) : order.extension_status === 'requested' ? (
                                ['admin', 'operator'].includes(currentRole) ? (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-amber-700 font-semibold bg-amber-50 px-2 py-1.5 rounded-lg border border-amber-200 inline-flex items-center">
                                      <Clock className="w-3.5 h-3.5 mr-1 text-amber-600 animate-pulse" /> Xin thêm {(order as any).extension_hours || 24}h
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleExtensionRequest(order.id, true)}
                                      className="px-2.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg inline-flex items-center shadow-xs cursor-pointer"
                                      title="Duyệt đồng ý gia hạn giữ chỗ"
                                    >
                                      <Check className="w-3.5 h-3.5 mr-1" /> Duyệt
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleExtensionRequest(order.id, false)}
                                      className="px-2.5 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-lg inline-flex items-center cursor-pointer"
                                      title="Từ chối yêu cầu gia hạn"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-amber-600 font-semibold bg-amber-50 px-3.5 py-2 rounded-lg border border-amber-200 inline-flex items-center animate-pulse">
                                    <Clock className="w-4 h-4 mr-1.5" /> Chờ duyệt gia hạn...
                                  </span>
                                )
                              ) : order.extension_status === 'rejected' ? (
                                <span className="text-xs text-rose-600 font-medium bg-rose-50 px-3.5 py-2 rounded-lg border border-rose-200">
                                  Bị từ chối gia hạn
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setConfirmModalData({
                                      isOpen: true,
                                      title: 'Yêu cầu gia hạn',
                                      message: `Gia hạn thời gian giữ chỗ cho booking #${order.id.substring(0, 8)}.`,
                                      showInput: true,
                                      inputLabel: 'Số giờ gia hạn',
                                      inputPlaceholder: '24',
                                      onConfirm: (hours) => requestExtension(order.id, Number(hours)),
                                    });
                                  }}
                                  className="px-3.5 py-2 text-xs font-extrabold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:text-blue-800 transition-colors inline-flex items-center"
                                >
                                  <Clock className="w-3.5 h-3.5 mr-1.5" />
                                  Yêu cầu gia hạn
                                </button>
                              )}
                            </>
                          )}

                          {/* Universal Cancel Order Button */}
                          {order.status !== 'cancelled' && (
                            <button
                              type="button"
                              onClick={() => {
                                console.log('Cancel button clicked for:', order.id);
                                const orderInvoices = invoices.filter(inv => inv.order_id === order.id);
                                const approvedPaidAmount = orderInvoices.filter(inv => inv.type === 'receipt' && inv.status === 'approved').reduce((sum, inv) => sum + inv.amount, 0) || order.paid_amount || 0;
                                const hasPayment = approvedPaidAmount > 0;
                                if (hasPayment) {
                                  setCancelPaymentOrder({ ...order, paid_amount: approvedPaidAmount });
                                  setCancelPaymentReason('');
                                  setCancelPaymentRefundAmount(approvedPaidAmount);
                                  setCancelPaymentRefundInput(new Intl.NumberFormat('vi-VN').format(approvedPaidAmount));
                                  setCancelConfirmFile(null);
                                  setCancelRefundMethod('transfer');
                                  setCancelRefundBankName('');
                                  setCancelRefundAccountNumber('');
                                  setCancelRefundAccountName('');
                                  setIsCancelPaymentModalOpen(true);
                                } else {
                                  setConfirmModalData({
                                    isOpen: true,
                                    title: 'Hủy booking',
                                    message: `Bạn có chắc chắn muốn HỦY đơn đặt giữ chỗ #${order.id.substring(0, 8)}? Hành động này sẽ trả lại ${orderPassengers.length} chỗ trống về quỹ tour khởi hành.`,
                                    showInput: false,
                                    onConfirm: async () => {
                                      try {
                                        await cancelOrder(order.id, '');
                                        toast.success('Đã hủy đơn đặt giữ chỗ thành công!');
                                      } catch (err) {
                                        toast.error('Gặp sự cố khi hủy booking!');
                                      }
                                    },
                                  });
                                }
                              }}
                              className="px-3.5 py-2 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 hover:text-rose-800 transition-colors inline-flex items-center cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                              Hủy booking
                            </button>
                          )}

                          {tour?.tour_type === 'private' ? (
                            <span className="px-3.5 py-2 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg inline-flex items-center">
                              👑 Tour đoàn riêng (Hợp đồng trọn gói)
                            </span>
                          ) : order.status === 'sure' && !hasApprovedReceipt && (
                            <span className="px-3.5 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg inline-flex items-center">
                              <Check className="w-4 h-4 mr-1.5" /> Đã chốt thành công (Sure)
                            </span>
                          )}

                          {(order.status === 'paid' || isFullyPaid) && (
                            <span className="px-3.5 py-2 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg inline-flex items-center">
                              <Check className="w-4 h-4 mr-1.5" /> Đã hoàn tất thanh toán
                            </span>
                          )}

                          {(order.status === 'sure' && isPartiallyPaid) && (
                            <span className="px-3.5 py-2 text-xs font-bold text-cyan-700 bg-cyan-50 border border-cyan-200 rounded-lg inline-flex items-center">
                              <CreditCard className="w-4 h-4 mr-1.5" /> Đã thanh toán một phần
                            </span>
                          )}

                          {order.status === 'cancelled' && (() => {
                            const orderInvoices = invoices.filter(inv => inv.order_id === order.id);
                            const refundInvoices = orderInvoices.filter(inv => inv.type === 'payment');
                            const approvedPaidAmount = orderInvoices.filter(inv => inv.type === 'receipt' && inv.status === 'approved').reduce((sum, inv) => sum + inv.amount, 0) || order.paid_amount || 0;
                            const hasRefundPendingOrApproved = refundInvoices.some(inv => inv.status === 'pending' || inv.status === 'approved');
                            const hasRejectedRefund = refundInvoices.some(inv => inv.status === 'rejected');

                            return (
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="px-3.5 py-2 text-xs font-semibold text-gray-400 bg-gray-50 border border-gray-200 rounded-lg inline-flex items-center">
                                  Đã hủy booking
                                </span>
                                {approvedPaidAmount > 0 && !hasRefundPendingOrApproved && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCancelPaymentOrder({ ...order, paid_amount: approvedPaidAmount });
                                      setCancelPaymentReason(hasRejectedRefund ? 'Yêu cầu hoàn tiền lại sau khi bị từ chối' : '');
                                      setCancelPaymentRefundAmount(approvedPaidAmount);
                                      setCancelPaymentRefundInput(new Intl.NumberFormat('vi-VN').format(approvedPaidAmount));
                                      setCancelConfirmFile(null);
                                      setCancelRefundMethod('transfer');
                                      setCancelRefundBankName('');
                                      setCancelRefundAccountNumber('');
                                      setCancelRefundAccountName('');
                                      setIsCancelPaymentModalOpen(true);
                                    }}
                                    className="px-3.5 py-2 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors inline-flex items-center cursor-pointer"
                                  >
                                    <DollarSign className="w-3.5 h-3.5 mr-1.5" />
                                    {hasRejectedRefund ? 'Yêu cầu hoàn tiền lại' : 'Tạo phiếu chi hoàn tiền'}
                                  </button>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  );
                })()}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <ActionModal
        isOpen={confirmModalData.isOpen}
        onClose={() => setConfirmModalData(prev => ({ ...prev, isOpen: false }))}
        title={confirmModalData.title}
        message={confirmModalData.message}
        onConfirm={confirmModalData.onConfirm}
        showInput={confirmModalData.showInput}
        inputPlaceholder={confirmModalData.inputPlaceholder}
        inputLabel={confirmModalData.inputLabel}
      />
      <PassengerInputModal
        isOpen={isPassengerModalOpen}
        onClose={() => setIsPassengerModalOpen(false)}
        adultCount={orderToConfirm ? allOrders.find(o => o.id === orderToConfirm)?.adult_count || 1 : 1}
        childCount={orderToConfirm ? allOrders.find(o => o.id === orderToConfirm)?.child_count || 0 : 0}
        infantCount={orderToConfirm ? allOrders.find(o => o.id === orderToConfirm)?.infant_count || 0 : 0}
        tourPriceVisa={orderToConfirm ? tours.find(t => t.id === allOrders.find(o => o.id === orderToConfirm)?.tour_id)?.price_visa_tour : 0}
        onConfirm={(passengers) => {
          if (orderToConfirm) {
            if (!['admin', 'sale_leader', 'operator'].includes(currentRole)) {
              setConfirmModalData({
                isOpen: true,
                title: '🔒 Cảnh báo: Chốt Sure & Tự động khóa booking',
                message: 'Chuyển booking sang trạng thái Chắc chắn (Sure) sẽ TỰ ĐỘNG KHÓA toàn bộ thông tin giá tiền & doanh thu. Chỉ Admin hoặc Sale Leader mới có quyền mở khóa hoặc điều chỉnh lại. Bạn có chắc chắn danh sách hành khách và thông tin booking đã chính xác?',
                onConfirm: () => {
                  confirmOrder(orderToConfirm, passengers);
                  setIsPassengerModalOpen(false);
                  setOrderToConfirm(null);
                }
              });
            } else {
              confirmOrder(orderToConfirm, passengers);
              setIsPassengerModalOpen(false);
              setOrderToConfirm(null);
            }
          }
        }}
      />
      <PassengerInputModal
        isOpen={!!orderToAddPassengers}
        onClose={() => setOrderToAddPassengers(null)}
        adultCount={orderToAddPassengers ? (allOrders.find(o => o.id === orderToAddPassengers)?.adult_count || 0) + (allOrders.find(o => o.id === orderToAddPassengers)?.child_count || 0) + (allOrders.find(o => o.id === orderToAddPassengers)?.infant_count || 0) - passengers.filter(p => p.order_id === orderToAddPassengers).length : 1}
        childCount={0}
        infantCount={0}
        tourPriceVisa={orderToAddPassengers ? tours.find(t => t.id === allOrders.find(o => o.id === orderToAddPassengers)?.tour_id)?.price_visa_tour : 0}
        onConfirm={(passengersData) => {
          if (orderToAddPassengers) {
            addPassengersToOrder(orderToAddPassengers, passengersData);
            setOrderToAddPassengers(null);
          }
        }}
      />
      <EditPassengerModal
        isOpen={isEditPassengerOpen}
        onClose={() => {
          setIsEditPassengerOpen(false);
          setEditingPassenger(null);
        }}
        passenger={editingPassenger}
        tourPriceVisa={editingPassenger ? tours.find(t => t.id === allOrders.find(o => o.id === editingPassenger.order_id)?.tour_id)?.price_visa_tour : undefined}
        onSave={(passengerId, updatedData) => {
          updatePassenger(passengerId, updatedData);
        }}
      />
      <EditOrderModal
        isOpen={isEditOrderOpen}
        onClose={() => {
          setIsEditOrderOpen(false);
          setEditingOrder(null);
        }}
        order={editingOrder}
        onSave={(orderId, updatedData) => {
          updateOrder(orderId, updatedData);
        }}
      />

      {/* Selected Invoice Note Modal */}
      {selectedInvoiceNote && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="invoice_note_modal">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 transform transition-all duration-200 scale-100">
            <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Chi tiết Ghi chú / Mô tả</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoiceNote(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors text-lg font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mã hóa đơn / Phiếu</span>
                <span className="text-xs font-mono font-extrabold text-slate-900 mt-0.5 block uppercase">{selectedInvoiceNote.code}</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-150 max-h-[300px] overflow-y-auto">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Nội dung ghi chú</span>
                <p className="text-xs font-semibold text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {selectedInvoiceNote.note || 'Không có ghi chú chi tiết.'}
                </p>
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-3.5 flex justify-end border-t border-slate-150">
              <button
                type="button"
                onClick={() => setSelectedInvoiceNote(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 active:scale-95 transition-all text-white font-extrabold text-xs rounded-lg uppercase shadow-md shadow-slate-900/10 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disqualified Reason Modal */}
      {disqualifiedReasonModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="disqualified_reason_modal">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-rose-100 transform transition-all duration-300 scale-100">
            <div className="bg-rose-50 px-6 py-4 flex items-center justify-between border-b border-rose-100">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600" />
                <h3 className="text-sm font-black text-rose-950 uppercase tracking-wide">Chi tiết hồ sơ chưa đạt</h3>
              </div>
              <button
                type="button"
                onClick={() => setDisqualifiedReasonModal(null)}
                className="text-rose-400 hover:text-rose-600 transition-colors text-lg font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Khách hàng</span>
                <span className="text-sm font-extrabold text-gray-950 uppercase mt-0.5 block">{disqualifiedReasonModal.name}</span>
              </div>
              <div className="p-4 bg-rose-50/50 rounded-lg border border-rose-100">
                <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block mb-1">Lý do cụ thể</span>
                <p className="text-xs font-semibold text-rose-950 whitespace-pre-wrap leading-relaxed">{disqualifiedReasonModal.reason}</p>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-3 flex justify-end">
              <button
                type="button"
                onClick={() => setDisqualifiedReasonModal(null)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 transition-all text-white font-extrabold text-xs rounded-lg uppercase shadow-md shadow-rose-600/10 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Hủy booking có thanh toán */}
      {isCancelPaymentModalOpen && cancelPaymentOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-xl w-full shadow-xl border border-gray-100 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-950 flex items-center gap-2">
                ⚠️ Hủy Booking Có Thanh Toán
              </h3>
              <button
                onClick={() => {
                  setIsCancelPaymentModalOpen(false);
                  setCancelPaymentOrder(null);
                }}
                className="text-gray-400 hover:text-gray-600 bg-white hover:bg-gray-100 rounded-full p-1.5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 font-semibold leading-relaxed">
                Booking <span className="font-mono font-bold">#{cancelPaymentOrder.id.substring(0, 8)}</span> này đã được thanh toán. Khi hủy, hệ thống sẽ tự động tạo một phiếu chi hoàn trả cho khách hàng tương ứng với số tiền bạn thiết lập dưới đây.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Số tiền đã thanh toán
                  </label>
                  <div className="px-3 py-2 bg-gray-100 rounded-lg text-sm font-black text-gray-800">
                    {new Intl.NumberFormat('vi-VN').format(cancelPaymentOrder.paid_amount || 0)}đ
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Số tiền hoàn trả cho khách <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={cancelPaymentRefundInput}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const cleanVal = raw.replace(/\D/g, '');
                        if (!cleanVal) {
                          setCancelPaymentRefundInput('');
                          setCancelPaymentRefundAmount(0);
                          return;
                        }
                        const numVal = Number(cleanVal);
                        const maxPaid = cancelPaymentOrder.paid_amount || 0;
                        const capVal = Math.min(numVal, maxPaid);
                        setCancelPaymentRefundAmount(capVal);
                        setCancelPaymentRefundInput(new Intl.NumberFormat('vi-VN').format(capVal));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-bold text-gray-950 focus:ring-2 focus:ring-blue-500 bg-white pr-8"
                      placeholder="Nhập số tiền hoàn trả..."
                    />
                    <span className="absolute right-3 top-2.5 text-sm text-gray-400 font-bold">đ</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Số tiền còn lại (giữ lại)
                  </label>
                  <div className="px-3 py-2 bg-rose-50 border border-rose-100 rounded-lg text-sm font-black text-rose-700">
                    {new Intl.NumberFormat('vi-VN').format(Math.max(0, (cancelPaymentOrder.paid_amount || 0) - cancelPaymentRefundAmount))}đ
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Lý do hủy booking <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={cancelPaymentReason}
                    onChange={(e) => setCancelPaymentReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-950 focus:ring-2 focus:ring-blue-500 bg-white"
                    placeholder="Lý do khách hủy..."
                  />
                </div>
              </div>

              {/* Upload ảnh minh chứng xác nhận của khách hàng */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Ảnh minh chứng xác nhận hủy của khách <span className="text-red-500">*</span>
                </label>
                <p className="text-[10px] text-gray-400">Tải lên ảnh chụp màn hình tin nhắn Zalo, SMS, Email... xác nhận hủy và hoàn tiền từ khách hàng</p>
                <div className="mt-1 flex justify-center px-6 pt-4 pb-4 border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-400 transition-colors bg-slate-50/50">
                  <div className="space-y-1 text-center">
                    <UploadCloud className="mx-auto h-8 w-8 text-slate-400" />
                    <div className="flex text-xs text-gray-600 justify-center">
                      <label
                        htmlFor="cancel-confirm-file"
                        className="relative cursor-pointer bg-white rounded-md font-bold text-blue-600 hover:text-blue-500 focus-within:outline-none"
                      >
                        <span>Tải ảnh minh chứng</span>
                        <input
                          id="cancel-confirm-file"
                          name="cancel-confirm-file"
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setCancelConfirmFile(e.target.files[0]);
                            }
                          }}
                        />
                      </label>
                    </div>
                    {cancelConfirmFile ? (
                      <div className="mt-2 text-xs font-bold text-emerald-600 flex items-center justify-center gap-1.5">
                        <CheckCircle className="w-4 h-4 shrink-0" />
                        <span className="truncate max-w-[200px]">{cancelConfirmFile.name}</span>
                      </div>
                    ) : (
                      <p className="text-[10px] text-gray-400">Chưa chọn ảnh (Hỗ trợ PNG, JPG, JPEG)</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Thông tin hoàn trả (Chỉ hiển thị khi số tiền hoàn trả > 0) */}
              {cancelPaymentRefundAmount > 0 && (
                <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider block border-b border-slate-200/80 pb-1.5">
                    💳 Phương án hoàn trả tiền
                  </span>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Hình thức hoàn trả <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setCancelRefundMethod('transfer')}
                        className={`px-3 py-2 text-xs font-bold rounded-lg border text-center transition-all cursor-pointer ${
                          cancelRefundMethod === 'transfer'
                            ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        Chuyển khoản ngân hàng
                      </button>
                      <button
                        type="button"
                        onClick={() => setCancelRefundMethod('cash')}
                        className={`px-3 py-2 text-xs font-bold rounded-lg border text-center transition-all cursor-pointer ${
                          cancelRefundMethod === 'cash'
                            ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        Nhận tiền mặt
                      </button>
                    </div>
                  </div>

                  {cancelRefundMethod === 'transfer' && (
                    <div className="space-y-3 animate-fadeIn">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                            Tên ngân hàng <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={cancelRefundBankName}
                            onChange={(e) => setCancelRefundBankName(e.target.value)}
                            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500 bg-white"
                            placeholder="Ví dụ: Vietcombank"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                            Số tài khoản <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={cancelRefundAccountNumber}
                            onChange={(e) => setCancelRefundAccountNumber(e.target.value)}
                            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500 bg-white"
                            placeholder="Nhập số tài khoản..."
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                          Tên chủ tài khoản <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={cancelRefundAccountName}
                          onChange={(e) => setCancelRefundAccountName(e.target.value.toUpperCase())}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 bg-white"
                          placeholder="VÍ DỤ: NGUYEN VAN A"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-100">
              <button
                type="button"
                disabled={isCancelUploading}
                onClick={() => {
                  setIsCancelPaymentModalOpen(false);
                  setCancelPaymentOrder(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isCancelUploading}
                onClick={async () => {
                  if (!cancelPaymentReason.trim()) {
                    toast.error('Vui lòng nhập lý do hủy booking!');
                    return;
                  }
                  if (!cancelConfirmFile) {
                    toast.error('Vui lòng tải lên ảnh minh chứng xác nhận hủy của khách hàng!');
                    return;
                  }
                  if (cancelPaymentRefundAmount > (cancelPaymentOrder.paid_amount || 0)) {
                    toast.error('Số tiền hoàn trả không được vượt quá số tiền đã thanh toán!');
                    return;
                  }
                  if (cancelPaymentRefundAmount > 0 && cancelRefundMethod === 'transfer') {
                    if (!cancelRefundBankName.trim() || !cancelRefundAccountNumber.trim() || !cancelRefundAccountName.trim()) {
                      toast.error('Vui lòng điền đầy đủ thông tin tài khoản ngân hàng để hoàn tiền chuyển khoản!');
                      return;
                    }
                  }

                  setIsCancelUploading(true);
                  try {
                    // 1. Upload ảnh minh chứng lên Google Drive qua backend API
                    const targetTour = tours.find(t => t.id === cancelPaymentOrder.tour_id);
                    const formData = new FormData();
                    formData.append('file', cancelConfirmFile);
                    formData.append('orderCode', cancelPaymentOrder.id.substring(0, 8));
                    if (targetTour?.code) {
                      formData.append('tourCode', targetTour.code);
                    }

                    const resData = await safeFetchApi('/api/upload-invoice-receipt', {
                      method: 'POST',
                      body: formData,
                    });

                    // 2. Hủy đơn hàng nếu chưa hủy
                    if (cancelPaymentOrder.status !== 'cancelled') {
                      await cancelOrder(cancelPaymentOrder.id, cancelPaymentReason);
                    }

                    // 3. Tạo phiếu chi hoàn tiền nếu số tiền hoàn trả > 0
                    if (cancelPaymentRefundAmount > 0) {
                      const paymentMethodLabel = cancelRefundMethod === 'cash' ? 'Tiền mặt' : 'Chuyển khoản';
                      let finalDesc = cancelPaymentOrder.status === 'cancelled'
                        ? `Yêu cầu hoàn tiền mới cho đơn đặt chỗ đã hủy #${cancelPaymentOrder.id.substring(0, 8)}. Lý do: ${cancelPaymentReason}`
                        : `Hoàn tiền cho khách hàng do hủy booking #${cancelPaymentOrder.id.substring(0, 8)}. Lý do: ${cancelPaymentReason}`;

                      if (cancelRefundMethod === 'transfer') {
                        finalDesc += `\n[Hoàn trả qua Ngân hàng]: ${cancelRefundBankName.trim()} - STK: ${cancelRefundAccountNumber.trim()} - Chủ TK: ${cancelRefundAccountName.trim()}`;
                      } else {
                        finalDesc += `\n[Hoàn trả]: Nhận tiền mặt trực tiếp tại văn phòng`;
                      }

                      await createInvoiceReceipt({
                        order_id: cancelPaymentOrder.id,
                        amount: cancelPaymentRefundAmount,
                        description: finalDesc,
                        payment_method: paymentMethodLabel,
                        type: 'payment',
                        file_url: resData.url, // đính kèm ảnh minh chứng hủy xác nhận của khách hàng
                        created_by: profile?.full_name || user?.email || 'Hệ thống',
                        refund_method: cancelRefundMethod,
                        refund_bank_name: cancelRefundMethod === 'transfer' ? cancelRefundBankName.trim() : undefined,
                        refund_account_number: cancelRefundMethod === 'transfer' ? cancelRefundAccountNumber.trim() : undefined,
                        refund_account_name: cancelRefundMethod === 'transfer' ? cancelRefundAccountName.trim() : undefined,
                      });

                      toast.success(cancelPaymentOrder.status === 'cancelled'
                        ? `Đã gửi lại yêu cầu hoàn trả ${new Intl.NumberFormat('vi-VN').format(cancelPaymentRefundAmount)}đ thành công!`
                        : `Đã tự động tạo phiếu chi hoàn trả ${new Intl.NumberFormat('vi-VN').format(cancelPaymentRefundAmount)}đ thành công!`
                      );
                    } else {
                      toast.success(cancelPaymentOrder.status === 'cancelled' ? 'Đã lưu thông tin.' : 'Đã hủy booking thành công (Không có tiền hoàn trả).');
                    }

                    setIsCancelPaymentModalOpen(false);
                    setCancelPaymentOrder(null);
                  } catch (err: any) {
                    console.error(err);
                    toast.error(err.message || 'Có lỗi xảy ra khi hủy booking hoặc tạo phiếu chi hoàn tiền!');
                  } finally {
                    setIsCancelUploading(false);
                  }
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {isCancelUploading && (
                  <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {isCancelUploading ? 'Đang xử lý...' : 'Xác nhận Hủy & Hoàn tiền'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OVERVIEW STATS DETAIL POPUP MODAL */}
      {overviewModalType && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full border border-gray-100 flex flex-col max-h-[92vh] overflow-hidden my-auto">
            {/* Banner Header */}
            <div className={`p-4 sm:p-5 text-white flex flex-col gap-3 relative shrink-0 ${
              overviewModalType === 'hold' ? 'bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800' :
              overviewModalType === 'sure' ? 'bg-gradient-to-r from-emerald-600 via-emerald-700 to-emerald-800' :
              overviewModalType === 'revenue' ? 'bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800' :
              overviewModalType === 'paid' ? 'bg-gradient-to-r from-teal-600 via-teal-700 to-teal-800' :
              'bg-gradient-to-r from-rose-600 via-rose-700 to-rose-800'
            }`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-white/15 backdrop-blur-md border border-white/20">
                    {overviewModalType === 'hold' && <Clock className="w-6 h-6" />}
                    {overviewModalType === 'sure' && <ShieldCheck className="w-6 h-6" />}
                    {overviewModalType === 'revenue' && <DollarSign className="w-6 h-6" />}
                    {overviewModalType === 'paid' && <CreditCard className="w-6 h-6" />}
                    {overviewModalType === 'remaining' && <AlertCircle className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg sm:text-xl font-extrabold uppercase tracking-wide">
                        {overviewModalType === 'hold' && 'Chi tiết Chỗ Giữ Tạm (Hold)'}
                        {overviewModalType === 'sure' && 'Chi tiết Chỗ Đã Chốt (Sure)'}
                        {overviewModalType === 'revenue' && 'Chi tiết Doanh Thu Chốt (Sure/Paid)'}
                        {overviewModalType === 'paid' && 'Chi tiết Tiền Đã Thanh Toán'}
                        {overviewModalType === 'remaining' && 'Chi tiết Dư Nợ Cần Thu'}
                      </h3>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white/20 border border-white/30 backdrop-blur-xs">
                        {orderFilterTimeRange === 'this_month' ? '📅 Tháng này' :
                         orderFilterTimeRange === 'today' ? '📅 Hôm nay' :
                         orderFilterTimeRange === 'this_week' ? '📅 Tuần này' : '📅 Mọi thời gian'}
                      </span>
                    </div>
                    <p className="text-xs text-white/90 mt-0.5 font-medium">
                      {overviewModalType === 'hold' && 'Danh sách toàn bộ các đơn đang trong thời gian giữ chỗ tạm tính'}
                      {overviewModalType === 'sure' && 'Danh sách các đơn hàng đã chốt chắc chắn / đã thanh toán'}
                      {overviewModalType === 'revenue' && 'Tổng hợp doanh số bán hàng từ các đơn SURE & PAID'}
                      {overviewModalType === 'paid' && 'Số tiền kế toán đã duyệt thực thu từ các hóa đơn thanh toán'}
                      {overviewModalType === 'remaining' && 'Số dư còn lại khách hàng hoặc đại lý cần thanh toán bổ sung'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setOverviewModalType(null)}
                  className="p-2 rounded-full bg-black/20 hover:bg-black/30 text-white transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Summary Badges Bar inside Header */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/20 text-xs">
                <div className="bg-black/15 rounded-lg px-3 py-1.5 flex items-center justify-between">
                  <span className="text-white/80 font-medium">Số Tour:</span>
                  <span className="font-extrabold text-white">{overviewModalTourGroups.length} Tour</span>
                </div>
                <div className="bg-black/15 rounded-lg px-3 py-1.5 flex items-center justify-between">
                  <span className="text-white/80 font-medium">Số Đơn Booking:</span>
                  <span className="font-extrabold text-white">{overviewModalFilteredOrders.length} đơn</span>
                </div>
                <div className="bg-black/15 rounded-lg px-3 py-1.5 flex items-center justify-between">
                  <span className="text-white/80 font-medium">Tổng số chỗ:</span>
                  <span className="font-extrabold text-white">
                    {overviewModalFilteredOrders.reduce((sum, o) => {
                      let c = (o.adult_count || 0) + (o.child_count || 0);
                      if (c === 0) {
                        const pc = passengers.filter(p => p.order_id === o.id).length;
                        c = pc > 0 ? pc : 1;
                      }
                      return sum + c;
                    }, 0)} chỗ
                  </span>
                </div>
                <div className="bg-black/15 rounded-lg px-3 py-1.5 flex items-center justify-between">
                  <span className="text-white/80 font-medium">Tổng giá trị:</span>
                  <span className="font-black text-amber-200">
                    {new Intl.NumberFormat('vi-VN').format(
                      overviewModalFilteredOrders.reduce((s, o) => s + (o.total_price || 0), 0)
                    )}đ
                  </span>
                </div>
              </div>
            </div>

            {/* Filter Controls Bar */}
            <div className="p-3 sm:p-4 bg-slate-100 border-b border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="relative w-full sm:w-80">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </span>
                <input
                  type="text"
                  placeholder="Tìm mã Tour, tên khách, SĐT, sale..."
                  value={overviewModalSearch}
                  onChange={e => setOverviewModalSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500 font-medium"
                />
                {overviewModalSearch && (
                  <button
                    type="button"
                    onClick={() => setOverviewModalSearch('')}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <span className="text-xs text-gray-500 font-medium hidden sm:inline">Kiểu hiển thị:</span>
                <div className="inline-flex rounded-lg bg-gray-200 p-0.5 border border-gray-300 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setOverviewModalViewMode('tour')}
                    className={`px-3 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                      overviewModalViewMode === 'tour'
                        ? 'bg-white text-blue-700 shadow-2xs font-extrabold'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Gom nhóm theo Tour ({overviewModalTourGroups.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOverviewModalViewMode('order')}
                    className={`px-3 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                      overviewModalViewMode === 'order'
                        ? 'bg-white text-blue-700 shadow-2xs font-extrabold'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Danh sách Booking lẻ ({overviewModalFilteredOrders.length})</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Scrollable Modal Content */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-50/60 grow">
              {overviewModalFilteredOrders.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300 p-6">
                  <Info className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-gray-700">Không tìm thấy đơn booking nào phù hợp</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Thử đổi từ khóa tìm kiếm hoặc chọn khung thời gian khác trên thanh công cụ.
                  </p>
                </div>
              ) : overviewModalViewMode === 'tour' ? (
                /* VIEW MODE: GOM NHÓM THEO TOUR */
                <div className="space-y-4">
                  {overviewModalTourGroups.map(({ tour, orders, totalSeats, totalPrice, totalPaid, totalRemaining }) => {
                    return (
                      <div
                        key={tour.id}
                        className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:border-blue-300 hover:shadow-md transition-all"
                      >
                        {/* Tour Header Row */}
                        <div className="bg-slate-100/90 border-b border-gray-200 p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-xs px-2.5 py-1 bg-blue-700 text-white rounded-md tracking-wider">
                                {tour.code || 'CHƯA_MÃ'}
                              </span>
                              <h4 className="font-extrabold text-sm sm:text-base text-gray-900">
                                {tour.name || 'Tour chưa gán tên'}
                              </h4>
                              {tour.status && (
                                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                                  tour.status === 'upcoming' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                  tour.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                  'bg-gray-100 text-gray-600 border-gray-200'
                                }`}>
                                  {tour.status === 'upcoming' ? 'Lịch sắp tới' : tour.status === 'active' ? 'Đang diễn ra' : 'Hoàn thành/Hủy'}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-4 text-xs text-gray-600 flex-wrap pt-0.5">
                              {tour.start_date && (
                                <span className="flex items-center gap-1 font-semibold text-slate-700">
                                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                                  <span>Khởi hành: {format(new Date(tour.start_date), 'dd/MM/yyyy')}</span>
                                </span>
                              )}
                              {tour.price_adult > 0 && (
                                <span className="flex items-center gap-1 font-semibold text-slate-700">
                                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Giá vé: {new Intl.NumberFormat('vi-VN').format(tour.price_adult)}đ/khách</span>
                                </span>
                              )}
                              {tour.slots_total !== undefined && (
                                <span className="flex items-center gap-1 font-semibold text-slate-700">
                                  <Users className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Sức chứa Tour: {tour.slots_total} chỗ ({tour.slots_available ?? 0} trống)</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Tour Totals Badge */}
                          <div className="flex items-center gap-2 flex-wrap shrink-0">
                            <div className="bg-amber-50 border border-amber-200/80 rounded-lg px-2.5 py-1 text-center">
                              <span className="text-[10px] uppercase font-bold text-amber-700 block">Số đơn</span>
                              <span className="text-xs font-black text-amber-900">{orders.length} đơn</span>
                            </div>
                            <div className="bg-blue-50 border border-blue-200/80 rounded-lg px-2.5 py-1 text-center">
                              <span className="text-[10px] uppercase font-bold text-blue-700 block">Số chỗ</span>
                              <span className="text-xs font-black text-blue-900">{totalSeats} chỗ</span>
                            </div>
                            <div className="bg-emerald-50 border border-emerald-200/80 rounded-lg px-2.5 py-1 text-center">
                              <span className="text-[10px] uppercase font-bold text-emerald-700 block">Tổng giá trị</span>
                              <span className="text-xs font-black text-emerald-900">
                                {new Intl.NumberFormat('vi-VN').format(totalPrice)}đ
                              </span>
                            </div>
                            {totalRemaining > 0 && (
                              <div className="bg-rose-50 border border-rose-200/80 rounded-lg px-2.5 py-1 text-center">
                                <span className="text-[10px] uppercase font-bold text-rose-700 block">Dư nợ</span>
                                <span className="text-xs font-black text-rose-900">
                                  {new Intl.NumberFormat('vi-VN').format(totalRemaining)}đ
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* List of Orders in this Tour */}
                        <div className="divide-y divide-gray-100">
                          {orders.map(order => {
                            let orderSeats = (order.adult_count || 0) + (order.child_count || 0);
                            if (orderSeats === 0) {
                              const pc = passengers.filter(p => p.order_id === order.id).length;
                              orderSeats = pc > 0 ? pc : 1;
                            }

                            const orderInvoices = invoices.filter(inv => inv.order_id === order.id);
                            const approvedPaid = orderInvoices
                              .filter(inv => inv.type === 'receipt' && inv.status === 'approved')
                              .reduce((s, inv) => s + inv.amount, 0);
                            const paid = approvedPaid || order.paid_amount || 0;
                            const price = order.total_price || 0;
                            const remaining = Math.max(0, price - paid);

                            return (
                              <div
                                key={order.id}
                                className="p-3 sm:p-4 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-extrabold text-xs text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                      #{order.id.substring(0, 8).toUpperCase()}
                                    </span>
                                    <span className="font-bold text-sm text-gray-900">
                                      {order.booker_name || 'Khách chưa nhập tên'}
                                    </span>
                                    {order.booker_phone && (
                                      <span className="text-xs text-gray-500 font-medium">
                                        • 📞 {order.booker_phone}
                                      </span>
                                    )}
                                    {order.created_by && (
                                      <span className="text-[11px] font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                                        👤 Sale: {order.created_by}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-3 text-xs text-gray-600 flex-wrap">
                                    <span className="font-medium">
                                      Số chỗ: <strong className="text-gray-900">{orderSeats} người</strong> ({order.adult_count || 0} lớn, {order.child_count || 0} trẻ)
                                    </span>
                                    {order.created_at && (
                                      <span className="text-gray-400">
                                        • Ngày tạo: {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-4 justify-between md:justify-end border-t md:border-t-0 pt-2 md:pt-0 border-gray-100">
                                  <div className="text-right">
                                    <div className="text-xs font-black text-gray-900">
                                      {new Intl.NumberFormat('vi-VN').format(price)}đ
                                    </div>
                                    <div className="text-[11px] font-medium text-emerald-700">
                                      Đã nộp: {new Intl.NumberFormat('vi-VN').format(paid)}đ
                                    </div>
                                    {remaining > 0 && (
                                      <div className="text-[11px] font-bold text-rose-600">
                                        Còn nộp: {new Intl.NumberFormat('vi-VN').format(remaining)}đ
                                      </div>
                                    )}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOverviewModalType(null);
                                      setOrderSearchTerm(order.id.substring(0, 8));
                                      document.getElementById('booking-list-table')?.scrollIntoView({ behavior: 'smooth' });
                                      toast.success(`Đã chọn đơn #${order.id.substring(0, 8).toUpperCase()}`);
                                    }}
                                    className="px-3 py-1.5 text-xs font-bold text-blue-700 hover:text-white bg-blue-50 hover:bg-blue-600 border border-blue-200 hover:border-blue-600 rounded-lg transition-all cursor-pointer flex items-center gap-1 shrink-0 shadow-2xs"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Xem chi tiết</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* VIEW MODE: DANH SÁCH BOOKING LẺ */
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 border-b border-gray-200 text-gray-700 font-extrabold uppercase text-[11px]">
                          <th className="p-3">Mã Booking</th>
                          <th className="p-3">Tour Du Lịch</th>
                          <th className="p-3">Khách Hàng</th>
                          <th className="p-3 text-center">Số Chỗ</th>
                          <th className="p-3 text-right">Tổng Tiền</th>
                          <th className="p-3 text-right">Đã Thu</th>
                          <th className="p-3 text-right">Dư Nợ</th>
                          <th className="p-3 text-center">Trạng Thái</th>
                          <th className="p-3 text-center">Thao Tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                        {overviewModalFilteredOrders.map(order => {
                          const tour = tours.find(t => t.id === order.tour_id);
                          let orderSeats = (order.adult_count || 0) + (order.child_count || 0);
                          if (orderSeats === 0) {
                            const pc = passengers.filter(p => p.order_id === order.id).length;
                            orderSeats = pc > 0 ? pc : 1;
                          }

                          const orderInvoices = invoices.filter(inv => inv.order_id === order.id);
                          const approvedPaid = orderInvoices
                            .filter(inv => inv.type === 'receipt' && inv.status === 'approved')
                            .reduce((s, inv) => s + inv.amount, 0);
                          const paid = approvedPaid || order.paid_amount || 0;
                          const price = order.total_price || 0;
                          const remaining = Math.max(0, price - paid);

                          return (
                            <tr key={order.id} className="hover:bg-blue-50/50 transition-colors">
                              <td className="p-3 font-extrabold text-blue-700">
                                #{order.id.substring(0, 8).toUpperCase()}
                              </td>
                              <td className="p-3 max-w-[220px]">
                                <span className="font-bold text-gray-900 block truncate">
                                  {tour?.name || 'Tour chưa gán'}
                                </span>
                                {tour?.code && (
                                  <span className="text-[10px] font-extrabold text-blue-800 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                                    {tour.code}
                                  </span>
                                )}
                              </td>
                              <td className="p-3">
                                <span className="font-bold text-gray-900 block">
                                  {order.booker_name || 'Khách chưa đặt tên'}
                                </span>
                                {order.booker_phone && (
                                  <span className="text-gray-500 text-[11px]">📞 {order.booker_phone}</span>
                                )}
                              </td>
                              <td className="p-3 text-center font-bold">
                                {orderSeats} chỗ
                              </td>
                              <td className="p-3 text-right font-black text-gray-900">
                                {new Intl.NumberFormat('vi-VN').format(price)}đ
                              </td>
                              <td className="p-3 text-right font-bold text-emerald-700">
                                {new Intl.NumberFormat('vi-VN').format(paid)}đ
                              </td>
                              <td className="p-3 text-right font-bold text-rose-600">
                                {remaining > 0 ? `${new Intl.NumberFormat('vi-VN').format(remaining)}đ` : '0đ'}
                              </td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                                  tour?.tour_type === 'private' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                                  order.status === 'hold' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                                  ['sure', 'paid'].includes(order.status) ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                                  'bg-gray-50 text-gray-600 border-gray-200'
                                }`}>
                                  {tour?.tour_type === 'private' ? 'ĐOÀN RIÊNG' : order.status === 'hold' ? 'HOLD' : 'SURE'}
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOverviewModalType(null);
                                    setOrderSearchTerm(order.id.substring(0, 8));
                                    document.getElementById('booking-list-table')?.scrollIntoView({ behavior: 'smooth' });
                                    toast.success(`Đã chọn đơn #${order.id.substring(0, 8).toUpperCase()}`);
                                  }}
                                  className="px-2.5 py-1 text-[11px] font-bold text-blue-700 hover:text-white bg-blue-50 hover:bg-blue-600 border border-blue-200 rounded-md transition-all cursor-pointer"
                                >
                                  Mở đơn
                                </button>
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

            {/* Modal Footer */}
            <div className="p-3 sm:p-4 bg-gray-100 border-t border-gray-200 flex items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-gray-500 font-medium">
                Đang hiển thị <strong>{overviewModalFilteredOrders.length}</strong> đơn booking trong danh mục chi tiết này.
              </span>

              <button
                type="button"
                onClick={() => setOverviewModalType(null)}
                className="px-5 py-2 text-xs font-bold text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-200 border border-gray-300 rounded-xl transition-all cursor-pointer shadow-2xs"
              >
                Đóng cửa sổ
              </button>
            </div>
          </div>
        </div>
      )}

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setPaymentOrder(null);
        }}
        order={paymentOrder}
      />

      {Boolean(contractPrintOrder) && (
        <TourContractPrintModal
          isOpen={Boolean(contractPrintOrder)}
          onClose={() => setContractPrintOrder(null)}
          order={contractPrintOrder!}
          tour={contractPrintOrder ? tours.find(t => t.id === contractPrintOrder.tour_id) : undefined}
          passengers={passengers}
          onContractSaved={(url) => {
            if (contractPrintOrder) {
              setContractPrintOrder(prev => prev ? ({ ...prev, contract_url: url }) : null);
            }
          }}
        />
      )}
    </div>
  );
}
