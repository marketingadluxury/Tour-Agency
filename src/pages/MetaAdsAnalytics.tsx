import React, { useState, useEffect, useMemo } from 'react';
import { 
  Megaphone, 
  Activity, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  ShieldCheck, 
  Search, 
  BarChart3, 
  DollarSign, 
  PhoneCall, 
  ShoppingCart, 
  Layers, 
  Code2,
  Sliders,
  Users,
  Bot
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCRM } from '@/context/CRMContext';
import { supabase } from '@/lib/supabase';
import { MetaConversionLog, MetaLead } from '@/types';
import { 
  fetchMetaCapiConfig, 
  fetchMetaConversionLogs, 
  fetchMetaLeads
} from '@/lib/metaCapiService';
import { MetaAdsPerformanceDashboard } from '@/components/MetaAdsPerformanceDashboard';
import { PotentialLeadsTab } from '@/components/PotentialLeadsTab';
import { MetaCapiSettingsSection } from '@/components/MetaCapiSettingsSection';
import { formatCurrency } from '@/lib/utils';

export default function MetaAdsAnalytics() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { orders = [] } = useCRM();

  // Trạng thái cấu hình Meta CAPI (đọc trạng thái hoạt động)
  const [pixelId, setPixelId] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);

  // State Logs & Filter & Leads
  const [logs, setLogs] = useState<MetaConversionLog[]>([]);
  const [leads, setLeads] = useState<MetaLead[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [selectedEventFilter, setSelectedEventFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLogDetail, setSelectedLogDetail] = useState<MetaConversionLog | null>(null);

  // Active Tab: leads | overview | campaigns | logs | settings
  const [activeTab, setActiveTab] = useState<'leads' | 'overview' | 'campaigns' | 'logs' | 'settings'>('leads');

  // Đọc tab từ URL nếu có
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'settings' || tabParam === 'meta-capi' || tabParam === 'capi') {
      setActiveTab('settings');
    } else if (tabParam === 'overview' || tabParam === 'campaigns' || tabParam === 'logs' || tabParam === 'leads') {
      setActiveTab(tabParam as any);
    }
  }, [searchParams]);

  // Load config, logs & leads khi vào trang
  const loadData = async (isSilent: boolean = false) => {
    if (!isSilent) {
      setIsLoadingLogs(true);
    }
    try {
      const [configData, logsData, leadsData] = await Promise.all([
        fetchMetaCapiConfig(),
        fetchMetaConversionLogs(200),
        fetchMetaLeads()
      ]);

      if (configData) {
        setPixelId(configData.pixel_id || '');
        setIsEnabled(configData.is_enabled !== false);
      }

      setLogs(logsData || []);
      setLeads(leadsData || []);
    } catch (err) {
      console.error('Lỗi nạp dữ liệu Meta CAPI & Leads:', err);
      if (!isSilent) {
        toast.error('Không thể tải dữ liệu Meta CAPI');
      }
    } finally {
      if (!isSilent) {
        setIsLoadingLogs(false);
      }
    }
  };

  useEffect(() => {
    loadData();

    let debounceTimer: any = null;
    // Lắng nghe Realtime từ Supabase khi có lead mới từ Webhook / Lead Form
    const leadsChannel = supabase
      .channel('realtime_meta_leads_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          loadData(true);
        }, 1500);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meta_conversion_logs' }, () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          loadData(true);
        }, 1500);
      })
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(leadsChannel);
    };
  }, []);

  // Chuyển tới trang tạo booking khi click vào lead
  const handleSelectLeadForBooking = (lead: MetaLead) => {
    navigate('/', {
      state: {
        prefillCustomerName: lead.customer_name,
        prefillCustomerPhone: lead.customer_phone,
        prefillCustomerEmail: lead.customer_email,
        prefillMetaLeadId: lead.id,
        prefillUtmCampaign: lead.utm_campaign,
        prefillNotes: lead.notes || lead.last_message
      }
    });
  };

  // Thống kê tổng quan
  const stats = useMemo(() => {
    const totalEvents = logs.length;
    const successEvents = logs.filter(l => l.status === 'success').length;
    const leadEvents = logs.filter(l => l.event_name === 'Lead' || l.tracking_type === 'PHONE_LEAD' || l.tracking_type === 'ORDER_CREATED');
    const purchaseEvents = logs.filter(l => l.event_name === 'Purchase' || l.tracking_type === 'PURCHASE_REVENUE');
    
    const totalTrackedRevenue = purchaseEvents
      .filter(l => l.status === 'success')
      .reduce((sum, l) => sum + (Number(l.revenue_value) || 0), 0);

    const successRate = totalEvents > 0 ? Math.round((successEvents / totalEvents) * 100) : 100;

    return {
      totalEvents,
      successEvents,
      leadCount: leadEvents.length,
      purchaseCount: purchaseEvents.length,
      totalTrackedRevenue,
      successRate
    };
  }, [logs]);

  // Thống kê hiệu quả theo Campaign / UTM Source
  const campaignStats = useMemo(() => {
    const campaignsMap: Record<string, {
      campaign: string;
      source: string;
      leadCount: number;
      orderCount: number;
      totalRevenue: number;
    }> = {};

    // 1. Phân tích từ orders
    orders.forEach(order => {
      const campName = order.utm_campaign || order.meta_lead_id ? (order.utm_campaign || 'Meta Ads Direct') : 'Chưa gắn UTM';
      const srcName = order.utm_source || (order.meta_lead_id ? 'facebook' : 'Trực tiếp / Khác');
      const key = `${campName}__${srcName}`;

      if (!campaignsMap[key]) {
        campaignsMap[key] = {
          campaign: campName,
          source: srcName,
          leadCount: 0,
          orderCount: 0,
          totalRevenue: 0
        };
      }

      campaignsMap[key].orderCount += 1;
      campaignsMap[key].totalRevenue += (Number(order.total_price) || 0);
    });

    // 2. Phân tích từ logs
    logs.forEach(log => {
      const campName = log.payload?.data?.[0]?.custom_data?.utm_campaign || log.payload?.utm_campaign || (log.meta_lead_id ? 'Meta Ads Lead' : 'Chưa gắn UTM');
      const srcName = log.payload?.data?.[0]?.custom_data?.utm_source || (log.meta_lead_id ? 'facebook' : 'Khác');
      const key = `${campName}__${srcName}`;

      if (!campaignsMap[key]) {
        campaignsMap[key] = {
          campaign: campName,
          source: srcName,
          leadCount: 0,
          orderCount: 0,
          totalRevenue: 0
        };
      }

      if (log.event_name === 'Lead') {
        campaignsMap[key].leadCount += 1;
      }
    });

    return Object.values(campaignsMap).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [orders, logs]);

  // Lọc logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Lọc loại sự kiện
      if (selectedEventFilter !== 'all' && log.event_name !== selectedEventFilter) {
        return false;
      }
      // Lọc trạng thái
      if (selectedStatusFilter !== 'all' && log.status !== selectedStatusFilter) {
        return false;
      }
      // Tìm kiếm từ khóa
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchPhone = log.customer_phone?.toLowerCase().includes(term);
        const matchTour = log.tour_code?.toLowerCase().includes(term);
        const matchEventId = log.event_id?.toLowerCase().includes(term);
        const matchLeadId = log.meta_lead_id?.toLowerCase().includes(term);
        if (!matchPhone && !matchTour && !matchEventId && !matchLeadId) {
          return false;
        }
      }
      return true;
    });
  }, [logs, selectedEventFilter, selectedStatusFilter, searchTerm]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                <Megaphone className="w-3.5 h-3.5" /> Meta Ads Conversions API (CAPI)
              </span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${isEnabled && pixelId ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
                {isEnabled && pixelId ? '● Đang hoạt động' : '○ Chưa kết nối'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Đo Lường Hiệu Quả & Đồng Bộ Meta Ads
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Hệ thống tự động mã hóa PII (SHA-256) và bắn sự kiện chuyển đổi (Lead, Phone Lead, Purchase Doanh Thu) từ CRM về Meta Graph API chuẩn xác 100%.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => loadData()}
              disabled={isLoadingLogs}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-all backdrop-blur-sm border border-white/10 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingLogs ? 'animate-spin' : ''}`} />
              Làm mới
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-white text-blue-900 shadow-white/20'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
              }`}
            >
              <Sliders className="w-4 h-4" />
              Cấu hình Meta CAPI
            </button>
          </div>
        </div>
      </div>

      {/* Top 4 Chỉ số KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tổng Sự Kiện Chuyển Đổi</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-800">{stats.totalEvents.toLocaleString('vi-VN')}</span>
            <span className="text-xs font-medium text-emerald-600">Đã bắn Meta</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Tỷ lệ thành công: <strong className="text-slate-700">{stats.successRate}%</strong>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Leads / Đặt Tour Meta</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <PhoneCall className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-800">{stats.leadCount.toLocaleString('vi-VN')}</span>
            <span className="text-xs font-medium text-amber-600">Khách tiềm năng</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Gồm Lead SĐT & Đơn đặt tour tạo mới
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Đơn Thu Tiền (Purchase)</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-800">{stats.purchaseCount.toLocaleString('vi-VN')}</span>
            <span className="text-xs font-medium text-emerald-600">Đã chốt & thu cọc</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Tự động gửi khi Kế toán duyệt Phiếu thu
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Doanh Thu Ghi Nhận Meta</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-indigo-700">{formatCurrency(stats.totalTrackedRevenue)}</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" /> Tối ưu ROAS chiến dịch
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('leads')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeTab === 'leads'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" /> Khách Hàng Tiềm Năng (Leads Hub) ({leads.length})
          </button>

          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-4 h-4" /> Tổng Quan Hiệu Quả
          </button>

          <button
            onClick={() => setActiveTab('campaigns')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeTab === 'campaigns'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4" /> Báo Cáo Chiến Dịch UTM ({campaignStats.length})
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeTab === 'logs'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Activity className="w-4 h-4" /> Nhật Ký Chuyển Đổi Meta ({filteredLogs.length})
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Sliders className="w-4 h-4" /> Cấu Hình Meta CAPI
          </button>
        </div>
      </div>

      {/* TAB KHÁCH HÀNG TIỀM NĂNG (LEADS HUB) */}
      {activeTab === 'leads' && (
        <div className="space-y-4">
          <PotentialLeadsTab onSelectLeadForBooking={handleSelectLeadForBooking} />
        </div>
      )}

      {/* TAB 1: TỔNG QUAN HIỆU QUẢ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Dashboard Recharts Báo Cáo Hiệu Suất Quảng Cáo Meta */}
          <MetaAdsPerformanceDashboard
            leads={leads}
            orders={orders}
            conversionLogs={logs}
            onRefresh={loadData}
            isLoading={isLoadingLogs}
          />

          {/* Hướng dẫn luồng dữ liệu CAPI */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              Quy Trình Đo Lường & Tối Ưu Chiến Dịch Meta Ads (Conversions API)
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 font-bold text-slate-800 text-sm mb-1">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">1</span>
                  Thu Thập & Ghi Nhận Lead
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Khi khách điền biểu mẫu Lead, gọi điện hoặc Nhân viên Sale tạo đơn hàng mới trên CRM, hệ thống tự động gắn UTM, Meta Lead ID và chuẩn hóa số điện thoại theo chuẩn quốc tế <strong>84xxxxxxxxx</strong>.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 font-bold text-slate-800 text-sm mb-1">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">2</span>
                  Mã Hóa Bảo Mật PII (SHA-256)
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Mọi thông tin cá nhân (SĐT, Email, Tên) được mã hóa một chiều chuẩn <strong>SHA-256</strong> trước khi gửi lên Meta Graph API v19.0, tuân thủ nghiêm ngặt chính sách bảo mật dữ liệu khách hàng.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 font-bold text-slate-800 text-sm mb-1">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">3</span>
                  Bắn Doanh Thu Thực (Purchase)
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Khi Kế toán duyệt Phiếu thu hoặc xác nhận thanh toán cọc/toàn phần, sự kiện <strong>Purchase</strong> kèm giá trị tiền thật (VND) được gửi về Meta để tối ưu máy học phân phối quảng cáo chính xác khách có tiền.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BÁO CÁO CHI TIẾT CHIẾN DỊCH UTM */}
      {activeTab === 'campaigns' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Hiệu Quả Chiến Dịch Meta Ads & Kênh Bán Hàng</h2>
              <p className="text-xs text-slate-500">Đối soát doanh số thực tế từ chiến dịch quảng cáo Facebook / Meta Ads</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase">
                  <th className="py-3.5 px-4">Chiến Dịch (Campaign)</th>
                  <th className="py-3.5 px-4">Nguồn (Source)</th>
                  <th className="py-3.5 px-4 text-center">Số Lead Ghi Nhận</th>
                  <th className="py-3.5 px-4 text-center">Số Đơn Hàng</th>
                  <th className="py-3.5 px-4 text-right">Tổng Doanh Thu</th>
                  <th className="py-3.5 px-4 text-right">Giá Trị Đơn Trung Bình</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {campaignStats.map((camp, idx) => {
                  const aov = camp.orderCount > 0 ? Math.round(camp.totalRevenue / camp.orderCount) : 0;
                  return (
                    <tr key={idx} className="hover:bg-blue-50/40 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {camp.campaign}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700">
                          {camp.source}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-amber-600">
                        {camp.leadCount.toLocaleString('vi-VN')}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-emerald-600">
                        {camp.orderCount.toLocaleString('vi-VN')}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-indigo-700 text-sm">
                        {formatCurrency(camp.totalRevenue)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-slate-600">
                        {formatCurrency(aov)}
                      </td>
                    </tr>
                  );
                })}
                {campaignStats.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      Chưa có dữ liệu chiến dịch.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: NHẬT KÝ SỰ KIỆN CONVERSION LOGS */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Nhật Ký Sự Kiện Chuyển Đổi Meta (CAPI Logs)</h2>
              <p className="text-xs text-slate-500">Tra cứu chi tiết từng sự kiện Lead & Purchase được gửi về Meta Events Manager</p>
            </div>

            {/* Bộ lọc tìm kiếm */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm SĐT, Tour, Event ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48 sm:w-60"
                />
              </div>

              <select
                value={selectedEventFilter}
                onChange={(e) => setSelectedEventFilter(e.target.value)}
                className="text-xs rounded-xl border border-slate-200 py-1.5 px-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="all">Tất cả loại sự kiện</option>
                <option value="Lead">Lead (Khách tiềm năng)</option>
                <option value="Purchase">Purchase (Doanh thu)</option>
                <option value="Contact">Contact</option>
              </select>

              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="text-xs rounded-xl border border-slate-200 py-1.5 px-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="success">Thành công (Success)</option>
                <option value="error">Lỗi (Error)</option>
                <option value="pending_config">Chờ cấu hình</option>
              </select>
            </div>
          </div>

          {/* Table Logs */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase">
                  <th className="py-3 px-3">Thời gian</th>
                  <th className="py-3 px-3">Sự Kiện Meta</th>
                  <th className="py-3 px-3">Khách Hàng / SĐT</th>
                  <th className="py-3 px-3">Tour / Đơn Hàng</th>
                  <th className="py-3 px-3 text-right">Giá Trị (VND)</th>
                  <th className="py-3 px-3 text-center">Trạng Thái</th>
                  <th className="py-3 px-3 text-center">Chi Tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredLogs.map((log) => {
                  const logDate = new Date(log.created_at);
                  const formattedDate = !isNaN(logDate.getTime()) 
                    ? `${String(logDate.getHours()).padStart(2, '0')}:${String(logDate.getMinutes()).padStart(2, '0')} ${String(logDate.getDate()).padStart(2, '0')}/${String(logDate.getMonth() + 1).padStart(2, '0')}/${logDate.getFullYear()}`
                    : log.created_at;

                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap font-medium">
                        {formattedDate}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                          log.event_name === 'Purchase' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {log.event_name}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">
                          {log.customer_phone || (log.hashed_phone ? `SHA256: ${log.hashed_phone.substring(0, 8)}...` : 'Chưa có SĐT')}
                        </div>
                        {log.customer_email && (
                          <div className="text-[11px] text-slate-500">{log.customer_email}</div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-700">{log.tour_code || 'Chưa gán Tour'}</div>
                        {log.order_id && (
                          <div className="text-[11px] text-slate-400">Đơn #{log.order_id.substring(0, 8)}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-800 whitespace-nowrap">
                        {Number(log.revenue_value) > 0 ? formatCurrency(Number(log.revenue_value)) : '-'}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {log.status === 'success' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Thành công
                          </span>
                        )}
                        {log.status === 'error' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200" title={log.error_message || ''}>
                            <XCircle className="w-3.5 h-3.5 text-rose-600" /> Báo lỗi
                          </span>
                        )}
                        {log.status === 'pending_config' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200" title={log.error_message || ''}>
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Thiếu Cài Đặt
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => setSelectedLogDetail(log)}
                          className="px-2.5 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all"
                        >
                          Xem JSON
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">
                      Không tìm thấy log chuyển đổi nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: CẤU HÌNH META CAPI & PANCAKE */}
      {activeTab === 'settings' && (
        <div className="space-y-4">
          <MetaCapiSettingsSection onConfigSaved={() => loadData(true)} />
        </div>
      )}

      {/* MODAL XEM CHI TIẾT LOG JSON */}
      {selectedLogDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold">Chi Tiết Sự Kiện Meta CAPI: {selectedLogDetail.event_name}</h3>
              </div>
              <button
                onClick={() => setSelectedLogDetail(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs font-mono">
              <div>
                <span className="font-bold text-slate-700 block mb-1">Payload Gửi Lên Meta Graph API:</span>
                <pre className="bg-slate-950 text-emerald-400 p-4 rounded-xl overflow-x-auto text-[11px] leading-relaxed">
                  {JSON.stringify(selectedLogDetail.payload, null, 2)}
                </pre>
              </div>

              <div>
                <span className="font-bold text-slate-700 block mb-1">Phản Hồi Từ Meta Graph API (Response):</span>
                <pre className="bg-slate-950 text-blue-300 p-4 rounded-xl overflow-x-auto text-[11px] leading-relaxed">
                  {JSON.stringify(selectedLogDetail.response_data, null, 2)}
                </pre>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedLogDetail(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl"
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
