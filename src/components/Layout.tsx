import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Map, 
  ShoppingCart, 
  FileText, 
  Receipt,
  FileCheck,
  Users,
  Settings,
  Bell,
  UserCheck,
  User,
  LayoutDashboard,
  TrendingUp,
  History,
  MessageSquarePlus,
  MessageSquare,
  Menu,
  X,
  Smartphone,
  MoreHorizontal,
  ChevronRight,
  ChevronDown,
  LogOut,
  Ticket,
  Camera,
  Share2,
  Handshake,
  Building,
  Sliders,
  Star,
  Briefcase,
  Globe,
  Calculator,
  Flag,
  Key,
  Megaphone,
  BarChart3,
  Palmtree,
  BookOpen,
  LogIn,
  Scale,
  Monitor
} from 'lucide-react';
import { cn, isOrderInLeaderTeam } from '@/lib/utils';
import { useCRM } from '@/context/CRMContext';
import { useAuth } from '@/context/AuthContext';
import { CustomSelect } from './CustomSelect';
import { Role } from '@/types';
import { HDVQuickUploadModal } from './HDVQuickUploadModal';
import { HDVQuickLinkModal } from './HDVQuickLinkModal';
import { DesktopNotificationSettingsModal } from './DesktopNotificationSettingsModal';
import { 
  sendDesktopNotification, 
  isDesktopNotificationEnabled, 
  getDesktopNotificationPermission 
} from '@/utils/desktopNotification';

const roleOptions = [
  { value: 'agent', label: 'Đại lý', icon: <Handshake className="w-4 h-4 text-amber-600" /> },
  { value: 'bod', label: 'Ban Giám đốc', icon: <Building className="w-4 h-4 text-violet-600" /> },
  { value: 'operator', label: 'Điều hành Tour', icon: <Sliders className="w-4 h-4 text-purple-600" /> },
  { value: 'sale_leader', label: 'Sale Leader', icon: <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> },
  { value: 'sale', label: 'Sale', icon: <Briefcase className="w-4 h-4 text-blue-600" /> },
  { value: 'visa_leader', label: 'Trưởng bộ phận Visa', icon: <Globe className="w-4 h-4 text-indigo-900" /> },
  { value: 'visa', label: 'Bộ phận Visa', icon: <Globe className="w-4 h-4 text-indigo-600" /> },
  { value: 'accounting', label: 'Kế toán', icon: <Calculator className="w-4 h-4 text-emerald-600" /> },
  { value: 'hr', label: 'Nhân sự', icon: <UserCheck className="w-4 h-4 text-cyan-600" /> },
  { value: 'tour_guide', label: 'Hướng Dẫn Viên', icon: <Flag className="w-4 h-4 text-teal-600" /> },
  { value: 'admin', label: 'Quản trị viên', icon: <Key className="w-4 h-4 text-rose-600" /> },
  { value: 'marketing_leader', label: 'Trưởng phòng Marketing', icon: <Megaphone className="w-4 h-4 text-fuchsia-600" /> },
  { value: 'marketing', label: 'Nhân viên Marketing', icon: <BarChart3 className="w-4 h-4 text-pink-500" /> },
];
import { FeedbackModal } from './FeedbackModal';

export interface NavItem {
  name: string;
  href: string;
  icon: any;
  roleAccess: Role[];
}

export interface NavGroup {
  groupName: string;
  icon: any;
  items: NavItem[];
}

export type NavEntry = NavItem | NavGroup;

export const navigationTree: NavGroup[] = [
  {
    groupName: 'Quản lý tour',
    icon: Map,
    items: [
      { name: 'Quản lý Tour', href: '/tours', icon: Map, roleAccess: ['operator', 'admin', 'sale_leader', 'bod', 'tour_guide', 'accounting'] },
      { name: 'Ảnh khách đoàn', href: '/tour-media', icon: Camera, roleAccess: ['bod', 'operator', 'sale', 'sale_leader', 'visa', 'visa_leader', 'accounting', 'tour_guide', 'admin', 'hr'] },
    ]
  },
  {
    groupName: 'Bookings',
    icon: ShoppingCart,
    items: [
      { name: 'Quản lý Booking', href: '/orders', icon: ShoppingCart, roleAccess: ['operator', 'agent', 'bod', 'sale', 'sale_leader', 'admin', 'visa_leader'] },
      { name: 'Dịch vụ Visa (Bảng giá)', href: '/visa-services', icon: FileText, roleAccess: ['operator', 'admin', 'sale', 'sale_leader', 'visa', 'visa_leader', 'bod'] },
      { name: 'Booking Visa (Đơn lẻ)', href: '/visa-orders', icon: Ticket, roleAccess: ['agent', 'bod', 'sale', 'sale_leader', 'visa', 'visa_leader', 'admin'] },
    ]
  },
  {
    groupName: 'Hành chính nhân sự',
    icon: FileCheck,
    items: [
      { name: 'Dashboard Cá Nhân', href: '/my-dashboard', icon: User, roleAccess: ['bod', 'operator', 'sale', 'sale_leader', 'visa', 'visa_leader', 'accounting', 'tour_guide', 'marketing_leader', 'marketing', 'admin', 'hr'] },
      { name: 'Nghỉ phép & Chấm công', href: '/leave-requests', icon: Palmtree, roleAccess: ['bod', 'operator', 'sale', 'sale_leader', 'visa', 'visa_leader', 'accounting', 'tour_guide', 'marketing_leader', 'marketing', 'admin', 'hr'] },
      { name: 'Đề nghị thanh toán', href: '/payment-proposals', icon: FileCheck, roleAccess: ['bod', 'operator', 'sale', 'sale_leader', 'visa', 'visa_leader', 'accounting', 'tour_guide', 'marketing_leader', 'marketing', 'admin', 'hr'] },
      { name: 'Quản lý nhân sự', href: '/employees', icon: Users, roleAccess: ['admin', 'bod', 'hr'] },
    ]
  },
  {
    groupName: 'Đối tác & Khách hàng',
    icon: Users,
    items: [
      { name: 'Khách hàng (Hành khách)', href: '/passengers', icon: Users, roleAccess: ['operator', 'sale', 'sale_leader', 'visa', 'visa_leader', 'tour_guide', 'marketing_leader', 'marketing', 'admin', 'bod'] },
      { name: 'Đại lý & CTV', href: '/customers', icon: UserCheck, roleAccess: ['admin', 'bod', 'sale', 'sale_leader', 'operator', 'accounting', 'hr', 'marketing_leader', 'marketing'] },
    ]
  },
];

export interface MainTabItem {
  name: string;
  href: string;
  icon: any;
  roleAccess: Role[];
  matchPaths?: string[];
  groupRef?: NavGroup;
}

export const mainSidebarNav: MainTabItem[] = [
  { name: 'Bảng điều khiển', href: '/dashboard', icon: LayoutDashboard, roleAccess: ['admin', 'bod'] },
  { name: 'Lịch khởi hành', href: '/', icon: Calendar, roleAccess: ['agent', 'bod', 'operator', 'sale', 'sale_leader', 'visa', 'visa_leader', 'accounting', 'tour_guide', 'marketing_leader', 'marketing', 'admin', 'hr'] },
  {
    name: 'Quản lý tour',
    href: '/tours',
    icon: Map,
    roleAccess: ['operator', 'admin', 'sale_leader', 'bod', 'tour_guide', 'sale', 'visa', 'visa_leader', 'accounting', 'hr'],
    matchPaths: ['/tours', '/tour-media'],
    groupRef: navigationTree[0]
  },
  {
    name: 'Bookings',
    href: '/orders',
    icon: ShoppingCart,
    roleAccess: ['agent', 'bod', 'sale', 'sale_leader', 'admin', 'operator', 'visa', 'visa_leader'],
    matchPaths: ['/orders', '/visa-services', '/visa-orders'],
    groupRef: navigationTree[1]
  },
  { name: 'Xử lý visa', href: '/visa', icon: Globe, roleAccess: ['visa', 'visa_leader', 'admin', 'bod'] },
  {
    name: 'Hành chính nhân sự',
    href: '/my-dashboard',
    icon: FileCheck,
    roleAccess: ['bod', 'operator', 'sale', 'sale_leader', 'visa', 'visa_leader', 'accounting', 'tour_guide', 'marketing_leader', 'marketing', 'admin', 'hr'],
    matchPaths: ['/my-dashboard', '/leave-requests', '/payment-proposals', '/employees'],
    groupRef: navigationTree[2]
  },
  { name: 'Kế toán', href: '/accounting', icon: Receipt, roleAccess: ['accounting', 'admin', 'bod'] },
  { name: 'Tra cứu thuế', href: '/tax-handbook', icon: Scale, roleAccess: ['admin', 'bod', 'accounting', 'operator', 'sale', 'sale_leader', 'hr', 'visa', 'visa_leader', 'tour_guide', 'marketing_leader', 'marketing'] },
  { name: 'Marketing', href: '/meta-ads', icon: Megaphone, roleAccess: ['admin', 'bod', 'marketing_leader', 'marketing'] },
  {
    name: 'Đối tác & Khách hàng',
    href: '/customers',
    icon: Users,
    roleAccess: ['admin', 'bod', 'sale', 'sale_leader', 'operator', 'accounting', 'hr', 'visa', 'visa_leader', 'tour_guide', 'marketing_leader', 'marketing'],
    matchPaths: ['/customers', '/passengers'],
    groupRef: navigationTree[3]
  },
];

const allNavItems: NavItem[] = [
  { name: 'Bảng điều khiển', href: '/dashboard', icon: LayoutDashboard, roleAccess: ['admin', 'bod'] },
  { name: 'Lịch khởi hành', href: '/', icon: Calendar, roleAccess: ['agent', 'bod', 'operator', 'sale', 'sale_leader', 'visa', 'visa_leader', 'accounting', 'tour_guide', 'marketing_leader', 'marketing', 'admin', 'hr'] },
  { name: 'Quản lý Tour', href: '/tours', icon: Map, roleAccess: ['operator', 'admin', 'sale_leader', 'bod', 'tour_guide', 'accounting'] },
  { name: 'Ảnh khách đoàn', href: '/tour-media', icon: Camera, roleAccess: ['bod', 'operator', 'sale', 'sale_leader', 'visa', 'visa_leader', 'accounting', 'tour_guide', 'admin', 'hr'] },
  { name: 'Quản lý Booking', href: '/orders', icon: ShoppingCart, roleAccess: ['operator', 'agent', 'bod', 'sale', 'sale_leader', 'admin', 'visa_leader'] },
  { name: 'Dịch vụ Visa (Bảng giá)', href: '/visa-services', icon: FileText, roleAccess: ['operator', 'admin', 'sale', 'sale_leader', 'visa', 'visa_leader', 'bod'] },
  { name: 'Booking Visa (Đơn lẻ)', href: '/visa-orders', icon: Ticket, roleAccess: ['agent', 'bod', 'sale', 'sale_leader', 'visa', 'visa_leader', 'admin'] },
  { name: 'Xử lý Visa', href: '/visa', icon: Globe, roleAccess: ['visa', 'visa_leader', 'admin', 'bod'] },
  { name: 'Dashboard Cá Nhân', href: '/my-dashboard', icon: User, roleAccess: ['bod', 'operator', 'sale', 'sale_leader', 'visa', 'visa_leader', 'accounting', 'tour_guide', 'marketing_leader', 'marketing', 'admin', 'hr'] },
  { name: 'Nghỉ phép & Chấm công', href: '/leave-requests', icon: Palmtree, roleAccess: ['bod', 'operator', 'sale', 'sale_leader', 'visa', 'visa_leader', 'accounting', 'tour_guide', 'marketing_leader', 'marketing', 'admin', 'hr'] },
  { name: 'Đề nghị thanh toán', href: '/payment-proposals', icon: FileCheck, roleAccess: ['bod', 'operator', 'sale', 'sale_leader', 'visa', 'visa_leader', 'accounting', 'tour_guide', 'marketing_leader', 'marketing', 'admin', 'hr'] },
  { name: 'Quản lý nhân sự', href: '/employees', icon: Users, roleAccess: ['admin', 'bod', 'hr'] },
  { name: 'Khách hàng (Hành khách)', href: '/passengers', icon: Users, roleAccess: ['operator', 'sale', 'sale_leader', 'visa', 'visa_leader', 'tour_guide', 'marketing_leader', 'marketing', 'admin', 'bod'] },
  { name: 'Đại lý & CTV', href: '/customers', icon: UserCheck, roleAccess: ['admin', 'bod', 'sale', 'sale_leader', 'operator', 'accounting', 'hr', 'marketing_leader', 'marketing'] },
  { name: 'Kế toán', href: '/accounting', icon: Receipt, roleAccess: ['accounting', 'admin', 'bod'] },
  { name: 'Tra cứu thuế', href: '/tax-handbook', icon: Scale, roleAccess: ['admin', 'bod', 'accounting', 'operator', 'sale', 'sale_leader', 'hr', 'visa', 'visa_leader', 'tour_guide', 'marketing_leader', 'marketing'] },
  { name: 'Marketing', href: '/meta-ads', icon: Megaphone, roleAccess: ['admin', 'bod', 'marketing_leader', 'marketing'] },
  { name: 'Tài liệu & Hướng dẫn', href: '/docs', icon: BookOpen, roleAccess: ['agent', 'bod', 'operator', 'sale', 'sale_leader', 'visa', 'visa_leader', 'accounting', 'tour_guide', 'marketing_leader', 'marketing', 'admin', 'hr'] },
  { name: 'Cài đặt hệ thống', href: '/settings', icon: Settings, roleAccess: ['admin'] },
  { name: 'Nhật ký hệ thống', href: '/activity-logs', icon: History, roleAccess: ['admin', 'bod'] },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentRole, setCurrentRole, displayRole, notifications: allNotifications, markNotificationAsRead, markAllNotificationsAsRead, orders, passengers, paymentProposals = [], profilesList = [], leaveRequests = [], tours = [], customRoles = [] } = useCRM();
  const { signOut, user, profile } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isHdvQuickUploadOpen, setIsHdvQuickUploadOpen] = useState(false);
  const [isHdvQuickLinkOpen, setIsHdvQuickLinkOpen] = useState(false);

  // Auto detect HDV role or quick upload tab from URL query params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('role') === 'tour_guide' && currentRole !== 'tour_guide') {
      setCurrentRole('tour_guide');
    }
  }, [location.search]);

  // PWA Install state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPwaBanner, setShowPwaBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
    setIsStandalone(standalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(ios);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPwaBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPWA = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          setShowPwaBanner(false);
        }
        setDeferredPrompt(null);
      });
    }
  };

  // Desktop Notification State
  const [isDesktopNotifSettingsOpen, setIsDesktopNotifSettingsOpen] = useState(false);
  const seenNotifIdsRef = useRef<Set<string>>(new Set());
  const isInitialNotifLoadRef = useRef(true);

  // Lắng nghe sự kiện click từ Desktop Notification để điều hướng
  useEffect(() => {
    const handleDesktopNavigate = (e: any) => {
      const path = e.detail?.path || e.detail;
      if (path && typeof path === 'string') {
        navigate(path, { state: e.detail?.data });
      }
    };
    const handleSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NAVIGATE' && event.data?.url) {
        navigate(event.data.url);
      }
    };

    window.addEventListener('crm-navigate-to', handleDesktopNavigate);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
    }

    return () => {
      window.removeEventListener('crm-navigate-to', handleDesktopNavigate);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      }
    };
  }, [navigate]);

  // Close mobile menu when navigating
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleNotificationClick = (notif: any) => {
    setShowNotifications(false);
    if (notif.id) {
      markNotificationAsRead(notif.id);
    }

    const titleLower = (notif.title || '').toLowerCase();
    const msgLower = (notif.message || '').toLowerCase();
    const fullText = `${titleLower} ${msgLower}`;

    // 1. NGHỈ PHÉP & CHẤM CÔNG (Leave Requests & Timesheet)
    const isLeaveNotif = 
      notif.type === 'leave' || 
      titleLower.includes('nghỉ phép') || 
      msgLower.includes('nghỉ phép') ||
      titleLower.includes('đơn xin nghỉ') || 
      msgLower.includes('đơn xin nghỉ') ||
      titleLower.includes('chấm công') ||
      msgLower.includes('chấm công');

    if (isLeaveNotif) {
      let targetTab: 'my_leaves' | 'team_approval' | 'final_approval' = 'my_leaves';
      const isLeader = ['sale_leader', 'operator', 'marketing_leader', 'visa_leader'].includes(currentRole);
      const isHRorAdmin = ['hr', 'admin', 'bod'].includes(currentRole);

      if (isHRorAdmin) {
        if (msgLower.includes('cấp 1') || msgLower.includes('leader duyệt') || msgLower.includes('chờ duyệt cấp cuối') || msgLower.includes('cần duyệt')) {
          targetTab = 'final_approval';
        } else {
          targetTab = 'final_approval';
        }
      } else if (isLeader) {
        if (msgLower.includes('cần duyệt') || msgLower.includes('chờ duyệt') || msgLower.includes('vừa gửi đơn')) {
          targetTab = 'team_approval';
        } else {
          targetTab = 'my_leaves';
        }
      } else {
        targetTab = 'my_leaves';
      }

      // Extract search target (person name or request code)
      let leaveSearch = '';
      const nameMatch = (notif.message || '').match(/của\s+([^.,(\n]+)/i) || (notif.message || '').match(/nhân sự\s+([^.,(\n]+)/i);
      if (nameMatch && nameMatch[1]) {
        leaveSearch = nameMatch[1].trim();
      }

      navigate('/leave-requests', { state: { tab: targetTab, searchTarget: leaveSearch } });
      return;
    }

    // 2. ĐỀ NGHỊ THANH TOÁN (Payment Proposals)
    const isPaymentProposalNotif = 
      notif.type === 'payment_proposal' ||
      titleLower.includes('đề nghị thanh toán') || 
      msgLower.includes('đề nghị thanh toán') || 
      msgLower.includes('dntt-') ||
      (notif.targetId && String(notif.targetId).toUpperCase().startsWith('DNTT-'));

    if (isPaymentProposalNotif) {
      let proposalSearch = '';
      const dnttMatch = (notif.message || '').match(/DNTT-\d+-\d+/i) || (notif.title || '').match(/DNTT-\d+-\d+/i);
      if (dnttMatch) {
        proposalSearch = dnttMatch[0];
      } else if (notif.targetId) {
        proposalSearch = notif.targetId;
      }
      navigate('/payment-proposals', { state: { searchTarget: proposalSearch } });
      return;
    }

    // Trích xuất mã đối tượng tìm kiếm chung từ nội dung hoặc targetId
    let searchTarget = '';
    const hashMatch = (notif.message || '').match(/#([a-zA-Z0-9-]+)/) || (notif.title || '').match(/#([a-zA-Z0-9-]+)/);
    if (hashMatch && hashMatch[1]) {
      searchTarget = hashMatch[1];
    } else {
      const codeMatch = (notif.message || '').match(/(?:booking|đơn hàng|đơn giữ chỗ|phiếu thu|phiếu chi|mã|tour|đoàn)\s+([a-zA-Z0-9-]+)/i);
      if (codeMatch && codeMatch[1]) {
        searchTarget = codeMatch[1];
      } else if (notif.targetId) {
        const matchingOrder = orders.find(o => o.id === notif.targetId || o.id.toLowerCase().startsWith(String(notif.targetId).toLowerCase()));
        if (matchingOrder) {
          searchTarget = matchingOrder.id.includes('-') ? matchingOrder.id.split('-')[0] : matchingOrder.id.substring(0, 8);
        } else if (notif.targetId.length > 8 && notif.targetId.includes('-')) {
          searchTarget = notif.targetId.substring(0, 8);
        } else {
          searchTarget = notif.targetId;
        }
      }
    }

    // 3. ẢNH KHÁCH ĐOÀN & DRIVE HDV
    const isTourMediaNotif = 
      titleLower.includes('ảnh đoàn') || 
      msgLower.includes('ảnh đoàn') || 
      titleLower.includes('album ảnh') ||
      msgLower.includes('album ảnh') ||
      (titleLower.includes('hdv') && (msgLower.includes('ảnh') || msgLower.includes('media')));

    if (isTourMediaNotif) {
      let tourSearch = searchTarget;
      const tourMatch = (notif.message || '').match(/\[([a-zA-Z0-9-]+)\]/);
      if (tourMatch && tourMatch[1]) {
        tourSearch = tourMatch[1];
      }
      navigate('/tour-media', { state: { searchTarget: tourSearch } });
      return;
    }

    // 4. KẾ TOÁN (Thu, Chi, Hoàn tiền, VAT)
    const isAccountingUser = ['accounting', 'admin', 'bod'].includes(currentRole);
    const isAccountingNotif = 
      notif.type === 'accounting' ||
      titleLower.includes('hóa đơn') ||
      titleLower.includes('phiếu thu') ||
      titleLower.includes('phiếu chi') ||
      titleLower.includes('kế toán') ||
      titleLower.includes('hoàn tiền') ||
      msgLower.includes('phiếu thu') ||
      msgLower.includes('phiếu chi') ||
      msgLower.includes('hoàn tiền cho booking');

    if (isAccountingNotif) {
      if (isAccountingUser) {
        let tab: 'receipts' | 'payments' | 'vat' = 'receipts';
        if (fullText.includes('chi') || fullText.includes('hoàn tiền') || fullText.includes('phiếu chi')) {
          tab = 'payments';
        } else if (fullText.includes('vat') || fullText.includes('xuất hóa đơn')) {
          tab = 'vat';
        }
        navigate('/accounting', { state: { searchTarget, tab } });
      } else {
        // Nếu là Sale / Đại lý / Khác -> Đưa về đơn hàng của họ để xem chi tiết
        navigate('/orders', { state: { searchTarget, expandOrderId: searchTarget } });
      }
      return;
    }

    // 5. DỊCH VỤ VISA LẺ vs HỒ SƠ VISA ĐOÀN
    const isVisaServiceOrderNotif = 
      fullText.includes('dịch vụ visa') || 
      fullText.includes('visa lẻ') || 
      fullText.includes('đơn visa') ||
      (notif.targetId && orders.some(o => (o.id === notif.targetId || o.id.startsWith(notif.targetId)) && tours.some(t => t.id === o.tour_id && t.tour_type === 'visa')));

    if (isVisaServiceOrderNotif) {
      navigate('/visa-orders', { state: { searchTarget, expandOrderId: searchTarget } });
      return;
    }

    const isVisaDocNotif = 
      notif.type === 'visa' || 
      fullText.includes('visa') || 
      fullText.includes('hộ chiếu') || 
      fullText.includes('passport');

    if (isVisaDocNotif) {
      const isVisaStaff = ['visa', 'admin', 'operator', 'bod'].includes(currentRole);
      if (isVisaStaff) {
        navigate('/visa', { state: { searchTarget } });
      } else {
        navigate('/orders', { state: { searchTarget, expandOrderId: searchTarget } });
      }
      return;
    }

    // 6. BOOKING TOUR / GIỮ CHỖ / CHỐT SURE / HỦY / GIA HẠN
    const matchedOrder = orders.find(o => o.id === searchTarget || o.id.toLowerCase().startsWith(searchTarget.toLowerCase()));
    const matchedTour = matchedOrder ? tours.find(t => t.id === matchedOrder.tour_id) : null;
    if (matchedTour?.tour_type === 'visa') {
      navigate('/visa-orders', { state: { searchTarget, expandOrderId: matchedOrder?.id || searchTarget } });
      return;
    }

    navigate('/orders', { state: { searchTarget, expandOrderId: matchedOrder?.id || searchTarget } });
  };

  const notifications = React.useMemo(() => {
    const currentUserId = profile?.id || user?.id || '';
    const userFullName = (profile?.full_name || '').trim().toLowerCase();
    const userEmail = (user?.email || profile?.email || '').trim().toLowerCase();

    // Map order IDs relevant to the logged-in user or sale leader's team
    const myOrderIds = new Set(
      orders.filter(o => {
        if (currentRole === 'sale_leader') {
          return isOrderInLeaderTeam(o, profile, profilesList);
        }
        const cb = (o.created_by || '').toLowerCase();
        const uid = o.user_id || '';
        return (
          uid === currentUserId ||
          (userFullName && cb.includes(userFullName)) ||
          (userEmail && cb.includes(userEmail))
        );
      }).map(o => o.id)
    );

    const myPassengerIds = new Set(
      passengers.filter(p => myOrderIds.has(p.order_id)).map(p => p.id)
    );

    const myProposalIds = new Set(
      (paymentProposals || [])
        .filter(p => {
          if (currentRole === 'sale_leader') {
            const isMyProposal = p.created_by_id === currentUserId || (userFullName && (p.created_by_name || '').toLowerCase().includes(userFullName));
            if (isMyProposal) return true;
            const creator = profilesList.find(prof => prof.id === p.created_by_id || (prof.full_name && (p.created_by_name || '').toLowerCase().includes(prof.full_name.toLowerCase())));
            if (creator && (creator.leader_id === currentUserId || (!creator.leader_id && (creator.role === 'sale' || creator.role === 'agent')))) {
              return true;
            }
            return false;
          }
          return p.created_by_id === currentUserId || (userFullName && (p.created_by_name || '').toLowerCase().includes(userFullName));
        })
        .map(p => p.id)
    );

    const myLeaveIds = new Set(
      (leaveRequests || [])
        .filter(lr => {
          if (lr.user_id === currentUserId) return true;
          if (currentRole === 'sale_leader' || currentRole === 'operator' || currentRole === 'marketing_leader') {
            const creator = profilesList.find(p => p.id === lr.user_id);
            return creator?.leader_id === currentUserId || (profile?.team_id && creator?.team_id === profile.team_id);
          }
          return false;
        })
        .map(lr => lr.id)
    );

    return allNotifications.filter(n => {
      // Filter out legacy mock sample notifications or unlinked invalid notifications
      if (n.id === 'N-1' || n.id === 'N-2' || n.targetId === 'P-101' || n.targetId === 'O-1001') {
        return false;
      }
      if ((n.message || '').includes('#Chưa rõ') || (n.title || '').includes('#Chưa rõ')) {
        return false;
      }

      // 1. Executive Management (Admin, BOD): Full visibility over valid notifications
      if (['admin', 'bod'].includes(currentRole)) {
        return true;
      }

      const msg = (n.message || '').toLowerCase();
      const title = (n.title || '').toLowerCase();

      // Check if notification targets an order/passenger/proposal in user's scope
      const targetOrder = n.targetId ? orders.find(o => o.id === n.targetId || (n.targetId && (o.id.toLowerCase().startsWith(n.targetId.toLowerCase()) || n.targetId.toLowerCase().startsWith(o.id.toLowerCase())))) : undefined;
      const isTargetOrderInScope = targetOrder ? myOrderIds.has(targetOrder.id) : false;

      const matchesUserOrder = isTargetOrderInScope || Array.from(myOrderIds).some(id => {
        if (!id) return false;
        const shortId = id.includes('-') ? id.split('-')[0] : id;
        const targetId = (n.targetId || '').toLowerCase();
        const fullId = id.toLowerCase();
        const sId = shortId.toLowerCase();
        
        return (
          targetId === fullId ||
          targetId === sId ||
          (targetId && fullId.includes(targetId)) ||
          (targetId && targetId.includes(sId)) ||
          msg.includes(sId) ||
          msg.includes(fullId) ||
          title.includes(sId)
        );
      });

      const matchesUserPassenger = n.targetId ? myPassengerIds.has(n.targetId) : false;
      const matchesUserProposal = n.targetId ? myProposalIds.has(n.targetId) : false;
      const matchesUserLeave = n.targetId ? myLeaveIds.has(n.targetId) : false;
      const isDirectlyRelevant = matchesUserOrder || matchesUserPassenger || matchesUserProposal || matchesUserLeave;

      // 2. HR Department: All leave requests, timesheets, HR notifications
      if (currentRole === 'hr') {
        if (n.type === 'leave' || title.includes('nghỉ phép') || msg.includes('nghỉ phép') || title.includes('chấm công') || msg.includes('chấm công')) {
          return true;
        }
        return isDirectlyRelevant;
      }

      // 3. Sale Leader: Notifications for their own + team members' orders, passengers, proposals, leaves, plus system alerts
      if (currentRole === 'sale_leader') {
        if (n.type === 'system' && !n.targetId) return true;
        if (n.type === 'leave' || title.includes('nghỉ phép') || msg.includes('nghỉ phép')) {
          return matchesUserLeave || (userFullName && msg.includes(userFullName));
        }
        return isDirectlyRelevant;
      }

      // 4. Regular Sale & Agent: Notifications strictly for their own orders, passengers, proposals, leaves
      if (['sale', 'agent'].includes(currentRole)) {
        if (n.type === 'system' && !n.targetId) return true;
        return isDirectlyRelevant;
      }

      // 5. Visa department: Visa related or directly relevant
      if (currentRole === 'visa') {
        if (n.type === 'visa' || title.includes('visa') || msg.includes('visa')) return true;
        return isDirectlyRelevant;
      }

      // 6. Accounting department: Accounting, proposals, invoices, receipts
      if (currentRole === 'accounting') {
        if (n.type === 'system') return true;
        if (
          n.type === 'accounting' || 
          title.includes('đề nghị thanh toán') || 
          msg.includes('đề nghị thanh toán') ||
          title.includes('hóa đơn') ||
          title.includes('phiếu thu') ||
          title.includes('phiếu chi')
        ) {
          return true;
        }
        return isDirectlyRelevant;
      }

      // 7. Operator department: Extension requests, hold status, tour operations, cancellations, leaves
      if (currentRole === 'operator') {
        if (n.type === 'system') return true;
        if (
          n.type === 'extension' || 
          title.includes('gia hạn') || 
          title.includes('chốt sure') || 
          title.includes('huỷ')
        ) {
          return true;
        }
        return isDirectlyRelevant;
      }

      return isDirectlyRelevant;
    });
  }, [allNotifications, currentRole, orders, passengers, paymentProposals, leaveRequests, profilesList, profile, user]);

  const unreadNotifications = React.useMemo(() => {
    return notifications.filter(n => !n.read);
  }, [notifications]);

  // Tự động đẩy thông báo lên Desktop khi có thông báo mới thuộc vai trò của user
  useEffect(() => {
    if (!notifications || notifications.length === 0) return;

    if (isInitialNotifLoadRef.current) {
      // Đánh dấu các thông báo hiện có trong lần tải đầu tiên để không spam thông báo cũ
      notifications.forEach(n => seenNotifIdsRef.current.add(n.id));
      isInitialNotifLoadRef.current = false;
      return;
    }

    // Kiểm tra các thông báo mới chưa đọc và chưa từng được gửi lên desktop
    const newUnreadNotifs = notifications.filter(n => !n.read && !seenNotifIdsRef.current.has(n.id));
    if (newUnreadNotifs.length > 0 && isDesktopNotificationEnabled()) {
      newUnreadNotifs.forEach(notif => {
        seenNotifIdsRef.current.add(notif.id);

        let targetUrl = '/';
        const titleLower = (notif.title || '').toLowerCase();
        const msgLower = (notif.message || '').toLowerCase();

        if (titleLower.includes('nghỉ phép') || msgLower.includes('nghỉ phép') || (notif.type as string) === 'leave') {
          targetUrl = '/leave-requests';
        } else if (titleLower.includes('đề nghị thanh toán') || msgLower.includes('đề nghị thanh toán') || notif.type === 'proposal' || (notif.type as string) === 'payment_proposal') {
          targetUrl = '/payment-proposals';
        } else if (notif.type === 'accounting' || titleLower.includes('phiếu thu') || titleLower.includes('hóa đơn')) {
          targetUrl = '/accounting';
        } else if (notif.type === 'visa') {
          targetUrl = '/visa';
        } else if (notif.type === 'order' || notif.type === 'extension') {
          targetUrl = '/orders';
        }

        sendDesktopNotification({
          title: notif.title || '🔔 Thông báo từ Tour CRM',
          body: (notif.message || '').replace(/\b([0-9a-fA-F]{8})-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g, '$1'),
          url: targetUrl,
          tag: notif.id,
          playSound: true
        });
      });
    }
  }, [notifications]);

  const activeGroup = React.useMemo(() => {
    for (const group of navigationTree) {
      if (group.items.some(child => child.href === location.pathname)) {
        return group;
      }
    }
    return undefined;
  }, [location.pathname]);

  const mergedRoleOptions = React.useMemo(() => {
    const base = [...roleOptions];
    if (customRoles && customRoles.length > 0) {
      customRoles.forEach(cr => {
        if (!base.some(r => r.value === cr.role_key)) {
          base.push({
            value: cr.role_key,
            label: cr.label,
            icon: <Globe className="w-4 h-4 text-indigo-700" />
          });
        }
      });
    }
    return base;
  }, [customRoles]);

  const getRoleLabel = (role: Role) => {
    const foundCustom = customRoles?.find(cr => cr.role_key === role);
    if (foundCustom) return foundCustom.label;

    switch (role) {
      case 'agent': return 'Đại lý (Agent)';
      case 'bod': return 'BOD (Ban Giám đốc)';
      case 'operator': return 'Điều hành Tour';
      case 'sale_leader': return 'Sale Leader';
      case 'sale': return 'Sale';
      case 'visa_leader': return 'Trưởng bộ phận Visa';
      case 'visa': return 'Bộ phận Visa';
      case 'accounting': return 'Kế toán';
      case 'hr': return 'Nhân sự (HR)';
      case 'admin': return 'Quản trị viên';
      case 'marketing_leader': return 'Trưởng phòng Marketing';
      case 'marketing': return 'Nhân viên Marketing';
      case 'tour_guide': return 'Hướng Dẫn Viên';
      case 'CTV': return 'Cộng Tác Viên';
      default: return role;
    }
  };

  // Check access control for current page and role
  const isSettingsPath = location.pathname === '/settings';
  const currentNavItem = allNavItems.find(n => n.href === location.pathname);
  const isGuest = !user;
  
  let hasAccess = false;
  if (isGuest) {
    hasAccess = location.pathname === '/' || location.pathname === '/login' || location.pathname === '/guest-upload';
  } else if (currentRole === 'admin') {
    hasAccess = true;
  } else if (isSettingsPath) {
    hasAccess = false;
  } else if (currentNavItem) {
    hasAccess = currentNavItem.roleAccess.includes(currentRole as any);
  } else {
    hasAccess = true;
  }

  const pendingLeavesBadgeCount = React.useMemo(() => {
    const currentUserId = profile?.id || user?.id || '';
    if (['sale_leader', 'operator', 'marketing_leader', 'visa_leader'].includes(currentRole)) {
      return leaveRequests.filter(r => r.status === 'pending').length;
    }
    if (['hr', 'bod', 'admin', 'accounting'].includes(currentRole)) {
      return leaveRequests.filter(r => r.status === 'approved_level_1' || r.status === 'pending').length;
    }
    return 0;
  }, [leaveRequests, currentRole, profile, user]);

  const AccessDeniedView = () => (
    <div className="flex flex-col items-center justify-center py-16 px-6 bg-white rounded-2xl border border-gray-200 shadow-xs max-w-md mx-auto my-8 text-center">
      <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0-6v2m0-5a7 7 0 110 14 7 7 0 010-14z" />
        </svg>
      </div>
      <h2 className="text-lg font-black text-gray-900 mb-2">Không có quyền truy cập</h2>
      <p className="text-xs text-gray-500 mb-6 max-w-sm leading-relaxed font-semibold">
        {isGuest ? (
          <span>Vui lòng đăng nhập hệ thống để truy cập chức năng này.</span>
        ) : (
          <span>Vai trò hiện tại của bạn là <strong className="text-blue-600">{getRoleLabel(displayRole)}</strong> không được phân quyền truy cập chức năng này.</span>
        )}
      </p>
      <Link
        to={isGuest ? "/login" : "/"}
        className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
      >
        {isGuest ? "Đăng nhập ngay" : "Quay lại Lịch khởi hành"}
      </Link>
    </div>
  );

  // Trang riêng full màn hình cho Tài liệu & Hướng dẫn (/docs), Đăng nhập (/login), Guest Upload (/guest-upload)
  if (location.pathname === '/docs' || location.pathname === '/login' || location.pathname === '/guest-upload') {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col shrink-0 h-full">
        <div className="h-16 flex items-center px-5 border-b border-gray-200 shrink-0 gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center p-1.5 text-white shadow-sm shrink-0">
            <img src="/favicon.svg" alt="Vé máy bay logo" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0">
            <span className="text-base font-black text-gray-900 tracking-tight block leading-none truncate">Tour CRM</span>
            <span className="text-[10px] text-blue-600 font-extrabold uppercase tracking-wider block mt-0.5 truncate">Quản lý Lữ hành</span>
          </div>
        </div>
        
        {/* Active Role Card */}
        {isGuest ? (
          <div className="p-4 border-b border-gray-150 bg-blue-50/50 shrink-0">
            <div className="flex items-center space-x-2 mb-1.5">
              <Globe className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-blue-900 uppercase tracking-wide">Chế độ xem công khai</span>
            </div>
            <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
              Xem lịch khởi hành và tình trạng chỗ trống cập nhật thời gian thực.
            </p>
          </div>
        ) : (
          <div className="p-4 border-b border-gray-150 bg-slate-50/50 shrink-0">
            <div className="flex items-center space-x-2 mb-2">
              <UserCheck className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Vai trò đang xem</span>
            </div>
            <CustomSelect
              options={mergedRoleOptions}
              value={displayRole}
              onChange={(val) => setCurrentRole(val as Role)}
              disabled={profile?.role !== 'admin' && user?.email !== 'admin@yourcompany.com'}
              className="w-full"
              buttonClassName="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
            />

            {/* Button Góp Ý & Báo Lỗi */}
            {currentRole !== 'admin' && (
              <button
                type="button"
                onClick={() => setIsFeedbackModalOpen(true)}
                className="mt-3 w-full py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                <MessageSquarePlus className="w-4 h-4 text-emerald-100" />
                <span>Góp ý & Báo lỗi</span>
              </button>
            )}
          </div>
        )}

        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          {isGuest ? (
            <div className="space-y-1">
              <Link
                to="/"
                className={cn(
                  location.pathname === '/'
                    ? 'bg-blue-50 text-blue-700 font-bold shadow-2xs'
                    : 'text-gray-800 hover:bg-gray-100/80 font-semibold',
                  'group flex items-center px-3.5 py-2.5 text-sm rounded-xl transition-colors'
                )}
              >
                <Calendar className="mr-2.5 flex-shrink-0 h-4 w-4 text-blue-600" />
                <span>Lịch khởi hành</span>
              </Link>
            </div>
          ) : (
            mainSidebarNav.map((item) => {
              if (!item.roleAccess.includes(currentRole as any)) return null;

              let targetHref = item.href;
              if (item.groupRef) {
                const accessibleChild = item.groupRef.items.find(child => child.roleAccess.includes(currentRole as any));
                if (accessibleChild) {
                  const canAccessPrimary = allNavItems.find(n => n.href === item.href)?.roleAccess.includes(currentRole as any);
                  if (!canAccessPrimary) {
                    targetHref = accessibleChild.href;
                  }
                }
              }

              const isActive = location.pathname === targetHref || (item.matchPaths && item.matchPaths.includes(location.pathname));

              return (
                <Link
                  key={item.name}
                  to={targetHref}
                  className={cn(
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-bold shadow-2xs'
                      : 'text-gray-800 hover:bg-gray-100/80 font-semibold',
                    'group flex items-center justify-between px-3.5 py-2.5 text-sm rounded-xl transition-colors relative'
                  )}
                >
                  <div className="flex items-center min-w-0 pr-1">
                    <item.icon
                      className={cn(
                        isActive ? 'text-blue-700' : 'text-gray-400 group-hover:text-gray-600',
                        'mr-2.5 flex-shrink-0 h-4 w-4'
                      )}
                    />
                    <span className="truncate">{item.name}</span>
                  </div>
                  {(item.href === '/leave-requests' || item.matchPaths?.includes('/leave-requests')) && pendingLeavesBadgeCount > 0 && (
                    <span className="ml-auto inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-black leading-none text-white bg-rose-500 rounded-full shadow-2xs animate-pulse">
                      {pendingLeavesBadgeCount}
                    </span>
                  )}
                </Link>
              );
            })
          )}
        </nav>
        
        {!isGuest && (['admin', 'bod'].includes(currentRole)) && (
          <div className="p-3 border-t border-gray-200 shrink-0 space-y-1">
            {['admin', 'bod'].includes(currentRole) && (
              <Link
                to="/activity-logs"
                className={cn(
                  location.pathname === '/activity-logs'
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'text-gray-700 hover:bg-gray-100/80 font-medium',
                  'group flex items-center px-3 py-2 text-xs rounded-xl transition-colors'
                )}
              >
                <History className="text-gray-400 group-hover:text-gray-500 mr-2.5 flex-shrink-0 h-4 w-4" />
                Nhật ký hệ thống
              </Link>
            )}
            {currentRole === 'admin' && (
              <Link
                to="/settings"
                className={cn(
                  location.pathname === '/settings'
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'text-gray-700 hover:bg-gray-100/80 font-medium',
                  'group flex items-center px-3 py-2 text-xs rounded-xl transition-colors'
                )}
              >
                <Settings className="text-gray-400 group-hover:text-gray-500 mr-2.5 flex-shrink-0 h-4 w-4" />
                Cài đặt hệ thống
              </Link>
            )}
          </div>
        )}
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Mobile / App Top Header */}
        <header className="h-14 md:h-16 bg-white border-b border-gray-200 flex items-center justify-between px-3.5 sm:px-6 z-20 shadow-xs shrink-0 pt-[env(safe-area-inset-top)]">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Mobile menu trigger */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-1.5 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg active:scale-95 transition-all"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-[28px] font-bold text-gray-900 truncate" style={{ fontSize: '28px' }}>
                {isGuest ? 'Lịch khởi hành tour' : (allNavItems.find(n => n.href === location.pathname)?.name || 'Tour CRM')}
              </h1>
              <span className="hidden sm:inline-block text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-semibold bg-blue-100 text-blue-700 whitespace-nowrap">
                {isGuest ? 'Khách vãng lai' : getRoleLabel(displayRole)}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            {/* Quick Docs Link (chỉ dành cho tài khoản đã đăng nhập) */}
            {!isGuest && (
              <Link
                to="/docs"
                title="Tài liệu & Hướng dẫn sử dụng (Ctrl + K)"
                className="text-gray-500 hover:text-blue-600 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl hover:bg-blue-50 transition-colors flex items-center gap-1.5 active:scale-95 border border-slate-200/80 bg-slate-50/60"
              >
                <BookOpen className="h-4 w-4 text-blue-600" />
                <span className="hidden sm:inline text-xs font-bold text-slate-700 hover:text-blue-600">Hướng dẫn</span>
              </Link>
            )}

            {isGuest ? (
              <Link
                to="/login"
                className="px-3.5 py-1.5 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer shrink-0"
              >
                <LogIn className="w-4 h-4" />
                <span>Đăng nhập</span>
              </Link>
            ) : (
              <>
                {/* Notification Dropdown */}
                <div className="relative">
                  <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="text-gray-500 hover:text-gray-700 relative p-2 rounded-full hover:bg-gray-100 transition-colors active:scale-95"
                  >
                    <Bell className="h-5 w-5" />
                    {unreadNotifications.length > 0 && (
                      <span className="absolute top-1.5 right-1.5 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
                    )}
                  </button>

                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-88 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden z-40">
                      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <span className="font-bold text-sm text-gray-900">Thông báo hệ thống</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsDesktopNotifSettingsOpen(true);
                            }}
                            className="p-1 hover:bg-slate-200 text-slate-500 hover:text-blue-700 rounded-lg transition-colors cursor-pointer"
                            title="Cài đặt thông báo Desktop"
                          >
                            <Monitor className="w-3.5 h-3.5" />
                          </button>
                          {unreadNotifications.length > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAllNotificationsAsRead();
                              }}
                              className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer hover:underline ml-1"
                            >
                              Đã đọc tất cả
                            </button>
                          )}
                          <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                            {unreadNotifications.length} mới
                          </span>
                        </div>
                      </div>

                      {/* Banner gợi ý bật thông báo Desktop nếu chưa cấp quyền */}
                      {getDesktopNotificationPermission() === 'default' && (
                        <div 
                          onClick={() => setIsDesktopNotifSettingsOpen(true)}
                          className="px-3.5 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 flex items-center justify-between gap-2 cursor-pointer hover:bg-blue-100/60 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Monitor className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span className="text-[11px] font-bold text-blue-900 leading-tight">
                              Bật thông báo đẩy Desktop
                            </span>
                          </div>
                          <span className="text-[10px] bg-blue-600 text-white font-bold px-2 py-0.5 rounded-md shrink-0">
                            Kích hoạt
                          </span>
                        </div>
                      )}

                      <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-4 text-center text-xs text-gray-500">Chưa có thông báo nào</div>
                        ) : (
                          notifications.map(notif => {
                            const isProposalNotif = (notif.title || '').toLowerCase().includes('đề nghị thanh toán') || 
                                                    (notif.message || '').toLowerCase().includes('đề nghị thanh toán') || 
                                                    (notif.message || '').includes('DNTT-');
                            return (
                              <div 
                                key={notif.id} 
                                onClick={() => handleNotificationClick(notif)}
                                className={`p-3 hover:bg-gray-50 transition-colors cursor-pointer ${!notif.read ? 'bg-blue-50/40' : ''}`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                    isProposalNotif ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                    notif.type === 'visa' ? 'bg-purple-50 text-purple-600' :
                                    notif.type === 'accounting' ? 'bg-red-50 text-red-600' :
                                    notif.type === 'extension' ? 'bg-orange-50 text-orange-600' :
                                    'bg-blue-50 text-blue-600 border border-blue-200'
                                  }`}>
                                    {isProposalNotif ? 'ĐỀ NGHỊ TT' :
                                     notif.type === 'visa' ? 'VISA' :
                                     notif.type === 'accounting' ? 'KẾ TOÁN' :
                                     notif.type === 'extension' ? 'ĐIỀU HÀNH' : 'ĐƠN HÀNG'}
                                  </span>
                                  {!notif.read && (
                                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                                  )}
                                </div>
                                <p className="text-xs font-semibold text-gray-800 mt-1">{notif.title}</p>
                                <p className="text-xs text-gray-600 mt-0.5 line-clamp-2 leading-relaxed">
                                  {(notif.message || '').replace(/\b([0-9a-fA-F]{8})-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g, '$1')}
                                </p>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Footer của Dropdown Thông Báo */}
                      <div className="p-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 px-3">
                        <button
                          type="button"
                          onClick={() => {
                            setShowNotifications(false);
                            setIsDesktopNotifSettingsOpen(true);
                          }}
                          className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer"
                        >
                          <Monitor className="w-3.5 h-3.5" />
                          <span>Cài đặt thông báo Desktop</span>
                        </button>
                        <span className="text-[10px] text-slate-400">Realtime</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Profile Menu */}
                <div className="relative group">
                  <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs uppercase shadow-xs cursor-pointer ring-2 ring-blue-100">
                    {user?.email ? user.email.charAt(0).toUpperCase() : 'AD'}
                  </div>
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden z-40 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                     <div className="px-4 py-3 border-b border-gray-100 overflow-hidden bg-slate-50">
                        <p className="text-xs font-bold text-gray-900 truncate">{user?.email || 'Tài khoản'}</p>
                        <p className="text-[10px] text-blue-600 font-semibold">{getRoleLabel(displayRole)}</p>
                     </div>
                     <Link 
                       to="/profile"
                       className="w-full flex items-center px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                     >
                       <User className="h-4 w-4 mr-2 text-slate-400" />
                       Thông tin cá nhân
                     </Link>
                     {currentRole !== 'agent' && (
                       <Link 
                         to="/my-dashboard"
                         className="w-full flex items-center px-4 py-2.5 text-xs font-bold text-blue-700 hover:bg-blue-50 transition-colors border-t border-gray-100"
                       >
                         <LayoutDashboard className="h-4 w-4 mr-2 text-blue-600" />
                         Dashboard cá nhân
                       </Link>
                     )}
                     <button 
                       type="button"
                       onClick={() => setIsDesktopNotifSettingsOpen(true)}
                       className="w-full flex items-center text-left px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors border-t border-gray-100 cursor-pointer"
                     >
                       <Monitor className="h-4 w-4 mr-2 text-indigo-600" />
                       <span>Thông báo Desktop</span>
                     </button>
                     <button 
                       onClick={() => signOut()}
                       className="w-full flex items-center text-left px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100"
                     >
                       <LogOut className="h-4 w-4 mr-2" />
                       Đăng xuất
                     </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Dải thông báo chạy ngang giai đoạn thử nghiệm (Chỉ hiển thị cho người dùng nội bộ đã đăng nhập) */}
        {!isGuest && (
          <div className="bg-amber-50/95 border-b border-amber-200/80 px-3 sm:px-4 py-1.5 flex items-center gap-2 overflow-hidden shrink-0 z-10 select-none shadow-2xs">
            <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs shrink-0 bg-amber-100/90 px-2 sm:px-2.5 py-0.5 rounded-full border border-amber-300/80 shadow-2xs">
              <Megaphone className="w-3.5 h-3.5 text-amber-600 animate-pulse shrink-0" />
              <span className="text-[10px] sm:text-[11px] font-bold tracking-tight whitespace-nowrap">Thử nghiệm</span>
            </div>

            <div className="relative flex-1 overflow-hidden h-5 flex items-center cursor-pointer" onClick={() => setIsFeedbackModalOpen(true)} title="Bấm để Góp ý & Báo lỗi cho hệ thống">
              <div className="animate-marquee flex items-center whitespace-nowrap text-xs font-medium text-amber-950">
                <div className="inline-flex items-center gap-1.5 pr-14">
                  <span>Hệ thống đang trong giai đoạn thử nghiệm, nếu có lỗi mong mọi người thông cảm. Hãy</span>
                  <span className="font-bold underline text-blue-700 hover:text-blue-900 mx-0.5">
                    Góp ý &amp; Báo lỗi
                  </span>
                  <span>để cải thiện hệ thống. Xin cảm ơn!</span>
                  <span className="text-amber-400 font-bold ml-3">✦</span>
                </div>
                <div className="inline-flex items-center gap-1.5 pr-14">
                  <span>Hệ thống đang trong giai đoạn thử nghiệm, nếu có lỗi mong mọi người thông cảm. Hãy</span>
                  <span className="font-bold underline text-blue-700 hover:text-blue-900 mx-0.5">
                    Góp ý &amp; Báo lỗi
                  </span>
                  <span>để cải thiện hệ thống. Xin cảm ơn!</span>
                  <span className="text-amber-400 font-bold ml-3">✦</span>
                </div>
                <div className="inline-flex items-center gap-1.5 pr-14">
                  <span>Hệ thống đang trong giai đoạn thử nghiệm, nếu có lỗi mong mọi người thông cảm. Hãy</span>
                  <span className="font-bold underline text-blue-700 hover:text-blue-900 mx-0.5">
                    Góp ý &amp; Báo lỗi
                  </span>
                  <span>để cải thiện hệ thống. Xin cảm ơn!</span>
                  <span className="text-amber-400 font-bold ml-3">✦</span>
                </div>
                <div className="inline-flex items-center gap-1.5 pr-14">
                  <span>Hệ thống đang trong giai đoạn thử nghiệm, nếu có lỗi mong mọi người thông cảm. Hãy</span>
                  <span className="font-bold underline text-blue-700 hover:text-blue-900 mx-0.5">
                    Góp ý &amp; Báo lỗi
                  </span>
                  <span>để cải thiện hệ thống. Xin cảm ơn!</span>
                  <span className="text-amber-400 font-bold ml-3">✦</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsFeedbackModalOpen(true)}
              className="shrink-0 text-[11px] font-bold text-amber-900 bg-amber-200/80 hover:bg-amber-300/80 px-2.5 py-0.5 rounded-full border border-amber-300 transition-colors hidden sm:flex items-center gap-1 active:scale-95 cursor-pointer shadow-2xs"
              title="Mở popup Góp ý & Báo lỗi"
            >
              <MessageSquarePlus className="w-3.5 h-3.5 text-amber-700" />
              <span>Góp ý ngay</span>
            </button>
          </div>
        )}
        
        {/* Sub-Tabs Bar for Grouped Routes */}
        {activeGroup && !isGuest && (
          <div className="bg-white border-b border-gray-200 px-3.5 sm:px-6 py-2.5 shrink-0 z-10 shadow-2xs">
            <div className="inline-flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 overflow-x-auto max-w-full">
              {activeGroup.items
                .filter(item => item.roleAccess.includes(currentRole as any))
                .map(item => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={cn(
                        'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer',
                        isActive
                          ? 'bg-white text-blue-700 shadow-xs border border-slate-200/80 font-black'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                      )}
                    >
                      <item.icon className={cn('w-3.5 h-3.5', isActive ? 'text-blue-600' : 'text-slate-400')} />
                      <span>{item.name}</span>
                      {item.href === '/leave-requests' && pendingLeavesBadgeCount > 0 && (
                        <span className="ml-1 px-1.5 py-0.2 bg-rose-500 text-white text-[10px] rounded-full font-black animate-pulse">
                          {pendingLeavesBadgeCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
            </div>
          </div>
        )}

        {/* Main scrollable view */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 p-3 sm:p-6 md:p-8 pb-20 md:pb-8 min-w-0 w-full">
          {hasAccess ? children : <AccessDeniedView />}
        </main>

        {/* Mobile Bottom Navigation Bar (App Experience) */}
        {isGuest ? (
          <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 z-40 flex items-center justify-around px-4 py-1.5 shadow-lg pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
            <Link
              to="/"
              className={cn(
                'flex flex-col items-center justify-center py-1 px-4 rounded-xl transition-all',
                location.pathname === '/' ? 'text-blue-600 font-bold scale-105' : 'text-slate-500 hover:text-slate-800'
              )}
            >
              <Calendar className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] leading-tight font-semibold">Lịch Tour</span>
            </Link>

            <Link
              to="/login"
              className="flex items-center justify-center py-1.5 px-5 rounded-xl text-white bg-blue-600 hover:bg-blue-700 font-bold shadow-xs active:scale-95 transition-all gap-1.5"
            >
              <LogIn className="w-4 h-4" />
              <span className="text-xs leading-tight">Đăng Nhập</span>
            </Link>
          </nav>
        ) : (
          <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 z-40 flex items-center justify-around px-1 py-1 shadow-lg pb-[calc(0.4rem+env(safe-area-inset-bottom))]">
            <Link
              to="/"
              className={cn(
                'flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all min-w-[52px]',
                location.pathname === '/' ? 'text-blue-600 font-bold scale-105' : 'text-slate-500 hover:text-slate-800'
              )}
            >
              <Calendar className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] leading-tight">Lịch Tour</span>
            </Link>

            <Link
              to="/tours"
              className={cn(
                'flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all min-w-[52px]',
                location.pathname === '/tours' ? 'text-blue-600 font-bold scale-105' : 'text-slate-500 hover:text-slate-800'
              )}
            >
              <Map className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] leading-tight">Quản Lý Tour</span>
            </Link>

            {/* Big Center Action Camera Button for HDV Quick Upload */}
            <button
              type="button"
              onClick={() => setIsHdvQuickUploadOpen(true)}
              className="flex flex-col items-center justify-center -mt-5 relative z-10 focus:outline-none"
              title="Upload Ảnh Đoàn Nhanh"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-500 p-0.5 shadow-lg shadow-blue-500/25 ring-4 ring-white active:scale-95 transition-transform flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-blue-600 flex items-center justify-center text-white">
                  <Camera className="w-5 h-5 text-white" />
                </div>
              </div>
              <span className="text-[10px] font-bold text-blue-600 tracking-tight mt-0.5">Chụp Ảnh</span>
            </button>

            <Link
              to="/payment-proposals"
              className={cn(
                'flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all min-w-[52px]',
                location.pathname === '/payment-proposals' ? 'text-blue-600 font-bold scale-105' : 'text-slate-500 hover:text-slate-800'
              )}
            >
              <FileCheck className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] leading-tight">Đề Nghị TT</span>
            </Link>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-slate-500 hover:text-slate-800 min-w-[52px]"
            >
              <MoreHorizontal className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] leading-tight">Menu</span>
            </button>
          </nav>
        )}
      </div>

      {/* Mobile Menu Drawer / Slide-over */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer content */}
          <div className="relative flex-1 max-w-xs w-full bg-white h-full flex flex-col shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center p-1 text-white shadow-xs shrink-0">
                  <img src="/favicon.svg" alt="Vé máy bay logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <span className="text-sm font-black tracking-tight block leading-none">Tour CRM</span>
                  <span className="text-[9px] text-blue-400 font-bold uppercase tracking-wider block mt-0.5">Quản lý Lữ hành</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Active Role Card Mobile */}
            {isGuest ? (
              <div className="p-4 border-b border-gray-150 bg-blue-50/50">
                <div className="flex items-center space-x-2 mb-1.5">
                  <Globe className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-blue-900 uppercase tracking-wide">Chế độ xem công khai</span>
                </div>
                <p className="text-[11px] text-gray-500 font-medium leading-relaxed mb-3">
                  Xem lịch khởi hành và tình trạng chỗ trống cập nhật thời gian thực.
                </p>
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Đăng nhập hệ thống</span>
                </Link>
              </div>
            ) : (
              <div className="p-4 border-b border-gray-150 bg-slate-50">
                <div className="flex items-center space-x-2 mb-2">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Vai trò đang xem</span>
                </div>
                <CustomSelect
                  options={roleOptions}
                  value={currentRole}
                  onChange={(val) => {
                    setCurrentRole(val as Role);
                    setIsMobileMenuOpen(false);
                  }}
                  disabled={profile?.role !== 'admin' && user?.email !== 'admin@yourcompany.com'}
                  className="w-full"
                  buttonClassName="w-full px-2.5 py-2 border border-gray-300 rounded-xl text-xs font-bold bg-white text-gray-800 shadow-xs focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />

                {currentRole !== 'admin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsFeedbackModalOpen(true);
                    }}
                    className="mt-3 w-full py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs"
                  >
                    <MessageSquarePlus className="w-4 h-4" />
                    <span>Góp ý & Báo lỗi</span>
                  </button>
                )}
              </div>
            )}

            {/* Nav list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              <div className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider px-3 py-1">Menu Chức Năng</div>
              {isGuest ? (
                <>
                  <Link
                    to="/"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      location.pathname === '/'
                        ? 'bg-blue-50 text-blue-700 font-bold shadow-2xs'
                        : 'text-gray-800 hover:bg-gray-100 font-semibold',
                      'flex items-center justify-between px-3.5 py-2.5 text-sm rounded-xl transition-colors'
                    )}
                  >
                    <div className="flex items-center">
                      <Calendar className="mr-3 flex-shrink-0 h-4 w-4 text-blue-700" />
                      <span>Lịch khởi hành</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </Link>
                </>
              ) : (
                mainSidebarNav.map((item) => {
                  if (!item.roleAccess.includes(currentRole as any)) return null;

                  let targetHref = item.href;
                  if (item.groupRef) {
                    const accessibleChild = item.groupRef.items.find(child => child.roleAccess.includes(currentRole as any));
                    if (accessibleChild) {
                      const canAccessPrimary = allNavItems.find(n => n.href === item.href)?.roleAccess.includes(currentRole as any);
                      if (!canAccessPrimary) {
                        targetHref = accessibleChild.href;
                      }
                    }
                  }

                  const isActive = location.pathname === targetHref || (item.matchPaths && item.matchPaths.includes(location.pathname));

                  return (
                    <Link
                      key={item.name}
                      to={targetHref}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        isActive
                          ? 'bg-blue-50 text-blue-700 font-bold shadow-2xs'
                          : 'text-gray-800 hover:bg-gray-100 font-semibold',
                        'flex items-center justify-between px-3.5 py-2.5 text-sm rounded-xl transition-colors'
                      )}
                    >
                      <div className="flex items-center">
                        <item.icon
                          className={cn(
                            isActive ? 'text-blue-700' : 'text-gray-400',
                            'mr-3 flex-shrink-0 h-4 w-4'
                          )}
                        />
                        <span>{item.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {(item.href === '/leave-requests' || item.matchPaths?.includes('/leave-requests')) && pendingLeavesBadgeCount > 0 && (
                          <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-black leading-none text-white bg-rose-500 rounded-full animate-pulse">
                            {pendingLeavesBadgeCount}
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                      </div>
                    </Link>
                  );
                })
              )}

              {!isGuest && ['admin', 'bod', 'hr'].includes(currentRole) && (
                <div className="mt-2 border-t border-gray-100 pt-3 space-y-1">
                  {['admin', 'bod'].includes(currentRole) && (
                    <Link
                      to="/activity-logs"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        location.pathname === '/activity-logs'
                          ? 'bg-blue-50 text-blue-700 font-bold shadow-xs'
                          : 'text-gray-700 hover:bg-gray-100 font-medium',
                        'flex items-center justify-between px-3 py-2.5 text-xs rounded-xl transition-colors'
                      )}
                    >
                      <div className="flex items-center">
                        <History className="mr-3 h-4 w-4 text-gray-400" />
                        <span>Nhật ký hệ thống</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </Link>
                  )}
                  {['admin', 'hr'].includes(currentRole) && (
                    <Link
                      to="/settings"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        location.pathname === '/settings'
                          ? 'bg-blue-50 text-blue-700 font-bold shadow-xs'
                          : 'text-gray-700 hover:bg-gray-100 font-medium',
                        'flex items-center justify-between px-3 py-2.5 text-xs rounded-xl transition-colors'
                      )}
                    >
                      <div className="flex items-center">
                        <Settings className="mr-3 h-4 w-4 text-gray-400" />
                        <span>Cài đặt hệ thống</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Footer Profile & Logout */}
            {isGuest ? (
              <div className="p-4 border-t border-gray-200 bg-slate-50 flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium">Chế độ xem công khai</span>
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Đăng nhập</span>
                </Link>
              </div>
            ) : (
              <div className="p-4 border-t border-gray-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <div className="h-8 w-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-800 truncate">{user?.email || 'Tài khoản'}</p>
                    <p className="text-[10px] text-gray-500 font-medium">{getRoleLabel(displayRole)}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => signOut()}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                  title="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Góp ý & Báo lỗi (Chỉ dành cho tài khoản đã đăng nhập) */}
      {!isGuest && (
        <FeedbackModal
          isOpen={isFeedbackModalOpen}
          onClose={() => setIsFeedbackModalOpen(false)}
        />
      )}

      {/* Modal Upload Ảnh Nhanh cho HDV */}
      <HDVQuickUploadModal
        isOpen={isHdvQuickUploadOpen}
        onClose={() => setIsHdvQuickUploadOpen(false)}
      />

      {/* Modal Link & QR cho HDV Freelance */}
      <HDVQuickLinkModal
        isOpen={isHdvQuickLinkOpen}
        onClose={() => setIsHdvQuickLinkOpen(false)}
        tours={useCRM().tours}
      />

      {/* Modal Cài Đặt Thông Báo Desktop */}
      <DesktopNotificationSettingsModal
        isOpen={isDesktopNotifSettingsOpen}
        onClose={() => setIsDesktopNotifSettingsOpen(false)}
      />
    </div>
  );
}


