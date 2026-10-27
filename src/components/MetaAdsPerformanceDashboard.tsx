import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  MessageSquare,
  MessageCircle,
  Activity,
  TrendingUp,
  Filter,
  Calendar,
  Users,
  CheckCircle2,
  PhoneCall,
  Target,
  ArrowUpRight,
  PieChart as PieIcon,
  BarChart3,
  Sparkles,
  Layers,
  Percent,
  RefreshCw,
  Zap,
  Info
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { MetaLead, MetaConversionLog, Order } from '@/types';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { format, subDays, isAfter, parseISO, startOfDay, isWithinInterval } from 'date-fns';

interface MetaAdsPerformanceDashboardProps {
  leads: MetaLead[];
  orders: Order[];
  conversionLogs: MetaConversionLog[];
  onRefresh?: () => void;
  isLoading?: boolean;
}

// Bảng màu chuẩn thiết kế
const COLORS = {
  primary: '#2563eb', // blue-600
  success: '#10b981', // emerald-500
  warning: '#f59e0b', // amber-500
  danger: '#ef4444', // red-500
  purple: '#8b5cf6', // purple-500
  cyan: '#06b6d4', // cyan-500
  indigo: '#4f46e5', // indigo-600
  slate: '#64748b' // slate-500
};

const PIE_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];

export const MetaAdsPerformanceDashboard: React.FC<MetaAdsPerformanceDashboardProps> = ({
  leads = [],
  orders = [],
  conversionLogs = [],
  onRefresh,
  isLoading = false
}) => {
  // Bộ lọc
  const [timeFilter, setTimeFilter] = useState<'7d' | '14d' | '30d' | 'this_month' | 'all'>('30d');
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [activeChartTab, setActiveChartTab] = useState<'leads_trend' | 'campaign_performance' | 'funnel'>('leads_trend');

  // Ngân sách ước tính hoặc tính từ các chiến dịch
  // Hỗ trợ cấu hình chi phí ước tính trên mỗi Lead (hoặc từ Meta Ads Campaign)
  const [cplEstimate, setCplEstimate] = useState<number>(45000); // 45,000đ / Lead hoặc click

  // 1. Lấy danh sách Campaign & Nguồn duy nhất cho Dropdown lọc
  const uniqueCampaigns = useMemo(() => {
    const set = new Set<string>();
    leads.forEach(l => {
      if (l.utm_campaign) set.add(l.utm_campaign);
    });
    orders.forEach(o => {
      if (o.utm_campaign) set.add(o.utm_campaign);
    });
    return Array.from(set);
  }, [leads, orders]);

  const uniqueSources = useMemo(() => {
    const set = new Set<string>();
    leads.forEach(l => {
      if (l.source_channel) set.add(l.source_channel);
    });
    return Array.from(set);
  }, [leads]);

  // 2. Lọc Leads và Orders theo khoảng thời gian & chiến dịch
  const filteredData = useMemo(() => {
    const now = new Date();
    let startDate: Date | null = null;

    if (timeFilter === '7d') startDate = subDays(now, 7);
    else if (timeFilter === '14d') startDate = subDays(now, 14);
    else if (timeFilter === '30d') startDate = subDays(now, 30);
    else if (timeFilter === 'this_month') startDate = new Date(now.getFullYear(), now.getMonth(), 1);

    // Lọc Leads
    const filteredLeads = leads.filter(lead => {
      if (startDate && lead.created_at) {
        try {
          const leadDate = new Date(lead.created_at);
          if (leadDate < startDate) return false;
        } catch (e) {
          return true;
        }
      }
      if (selectedCampaign !== 'all' && lead.utm_campaign !== selectedCampaign) {
        return false;
      }
      if (selectedSource !== 'all' && lead.source_channel !== selectedSource) {
        return false;
      }
      return true;
    });

    // Lọc Orders (được quy cho Meta Ads hoặc UTM)
    const filteredOrders = orders.filter(order => {
      if (startDate && order.created_at) {
        try {
          const orderDate = new Date(order.created_at);
          if (orderDate < startDate) return false;
        } catch (e) {
          return true;
        }
      }
      if (selectedCampaign !== 'all' && order.utm_campaign !== selectedCampaign) {
        return false;
      }
      return true;
    });

    return { leads: filteredLeads, orders: filteredOrders };
  }, [leads, orders, timeFilter, selectedCampaign, selectedSource]);

  // 3. Tính toán các chỉ số KPI theo yêu cầu của bạn:
  // - Số tiền đã chi tiêu
  // - Số tin nhắn
  // - Số tin nhắn mới
  // - Tương tác trang
  // - Tỷ lệ chuyển đổi & Doanh thu
  const metrics = useMemo(() => {
    const currentLeads = filteredData.leads;
    const currentOrders = filteredData.orders;

    // A. Số tin nhắn & Tin nhắn mới
    const messengerLeads = currentLeads.filter(l => 
      l.source_channel === 'facebook_messenger' || !l.source_channel || l.source_channel === 'facebook'
    );
    const totalMessages = messengerLeads.length;
    
    // Tin nhắn mới (vừa nhận, chưa liên hệ hoặc đang cần gọi)
    const newMessages = currentLeads.filter(l => 
      l.status === 'lead_captured' || l.status === 'active' || !l.status
    ).length;

    // Số Lead để lại SĐT
    const leadsWithPhone = currentLeads.filter(l => Boolean(l.customer_phone)).length;

    // Số Lead đã chốt Booking
    const convertedLeads = currentLeads.filter(l => l.status === 'lead_converted').length;
    
    // Tỷ lệ chuyển đổi Lead -> Chốt (%)
    const totalLeadsCount = currentLeads.length;
    const conversionRate = totalLeadsCount > 0 ? ((convertedLeads / totalLeadsCount) * 100).toFixed(1) : '0';

    // B. Tương tác trang (Tổng số lượt tin nhắn + lead ads forms + click CAPI events)
    const totalInteractions = totalLeadsCount + conversionLogs.length;

    // C. Số tiền đã chi tiêu (Tính toán từ ngân sách CPL hoặc tổng số Lead)
    // Ước lượng chi phí thực tế chiến dịch dựa trên cplEstimate * số lượng tương tác/lead
    const totalSpentEstimated = totalLeadsCount * cplEstimate;

    // D. Doanh thu từ Ads
    const adsRevenue = currentOrders
      .filter(o => o.utm_campaign || o.utm_source?.includes('facebook') || o.meta_lead_id)
      .reduce((sum, o) => sum + (Number(o.total_price) || 0), 0);

    // E. ROAS (Return On Ad Spend)
    const roas = totalSpentEstimated > 0 ? (adsRevenue / totalSpentEstimated).toFixed(2) : '0';

    return {
      totalLeadsCount,
      totalSpentEstimated,
      totalMessages,
      newMessages,
      totalInteractions,
      leadsWithPhone,
      convertedLeads,
      conversionRate,
      adsRevenue,
      roas
    };
  }, [filteredData, conversionLogs, cplEstimate]);

  // 4. Dữ liệu Biểu đồ: Xu hướng theo ngày (Recharts Area/Line Chart)
  const dailyTrendData = useMemo(() => {
    const daysMap: Record<string, { date: string; leads: number; phoneLeads: number; converted: number; messages: number }> = {};

    // Khởi tạo các mốc ngày trong khoảng lọc
    const daysCount = timeFilter === '7d' ? 7 : timeFilter === '14d' ? 14 : 30;
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const dateKey = format(d, 'dd/MM');
      daysMap[dateKey] = {
        date: dateKey,
        leads: 0,
        phoneLeads: 0,
        converted: 0,
        messages: 0
      };
    }

    // Điền dữ liệu từ Leads
    filteredData.leads.forEach(lead => {
      if (!lead.created_at) return;
      try {
        const leadDate = parseISO(lead.created_at);
        const dateKey = format(leadDate, 'dd/MM');
        if (daysMap[dateKey]) {
          daysMap[dateKey].leads += 1;
          if (lead.customer_phone) daysMap[dateKey].phoneLeads += 1;
          if (lead.status === 'lead_converted') daysMap[dateKey].converted += 1;
          if (lead.source_channel === 'facebook_messenger' || !lead.source_channel) {
            daysMap[dateKey].messages += 1;
          }
        }
      } catch (e) {}
    });

    return Object.values(daysMap);
  }, [filteredData, timeFilter]);

  // 5. Dữ liệu Biểu đồ: Hiệu suất theo Chiến dịch (Recharts Bar Chart)
  const campaignPerformanceData = useMemo(() => {
    const campMap: Record<string, {
      name: string;
      leads: number;
      phones: number;
      converted: number;
      rate: number;
    }> = {};

    filteredData.leads.forEach(lead => {
      const camp = lead.utm_campaign || 'Chiến dịch chung / Messenger';
      if (!campMap[camp]) {
        campMap[camp] = {
          name: camp,
          leads: 0,
          phones: 0,
          converted: 0,
          rate: 0
        };
      }
      campMap[camp].leads += 1;
      if (lead.customer_phone) campMap[camp].phones += 1;
      if (lead.status === 'lead_converted') campMap[camp].converted += 1;
    });

    return Object.values(campMap)
      .map(c => ({
        ...c,
        rate: c.leads > 0 ? Math.round((c.converted / c.leads) * 100) : 0
      }))
      .sort((a, b) => b.leads - a.leads)
      .slice(0, 7); // Lấy top 7 chiến dịch
  }, [filteredData]);

  // 6. Dữ liệu Biểu đồ Tròn: Phân bổ Nguồn & Kênh tương tác (Recharts Pie Chart)
  const channelDistributionData = useMemo(() => {
    const channels: Record<string, number> = {
      'Facebook Messenger': 0,
      'Meta Lead Ads Form': 0,
      'Bình luận / Bài viết': 0,
      'Instagram Direct': 0,
      'Khác': 0
    };

    filteredData.leads.forEach(lead => {
      if (lead.source_channel === 'facebook_messenger' || !lead.source_channel) {
        channels['Facebook Messenger'] += 1;
      } else if (lead.source_channel === 'meta_lead_form' || lead.source_channel === 'lead_ad') {
        channels['Meta Lead Ads Form'] += 1;
      } else if (lead.source_channel === 'facebook_comment') {
        channels['Bình luận / Bài viết'] += 1;
      } else if (lead.source_channel === 'instagram') {
        channels['Instagram Direct'] += 1;
      } else {
        channels['Khác'] += 1;
      }
    });

    return Object.entries(channels)
      .filter(([_, count]) => count > 0)
      .map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  return (
    <div className="space-y-6" id="meta-ads-dashboard">
      {/* 1. Thanh Bộ Lọc Đa Năng */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Nhãn Tiêu Đề & Nút Refresh */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-xs">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Bảng Điều Khiển Hiệu Suất Meta Ads
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  <Zap className="w-3 h-3 text-blue-600" /> Recharts Live
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Theo dõi chi tiêu, tin nhắn, tương tác trang và tỷ lệ chốt tour tự động từ chiến dịch quảng cáo
              </p>
            </div>
          </div>

          {/* Các nút lọc */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Bộ lọc khoảng thời gian */}
            <div className="inline-flex p-1 bg-slate-100/80 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setTimeFilter('7d')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  timeFilter === '7d' ? 'bg-white text-blue-700 shadow-xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                7 ngày
              </button>
              <button
                type="button"
                onClick={() => setTimeFilter('14d')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  timeFilter === '14d' ? 'bg-white text-blue-700 shadow-xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                14 ngày
              </button>
              <button
                type="button"
                onClick={() => setTimeFilter('30d')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  timeFilter === '30d' ? 'bg-white text-blue-700 shadow-xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                30 ngày
              </button>
              <button
                type="button"
                onClick={() => setTimeFilter('this_month')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  timeFilter === 'this_month' ? 'bg-white text-blue-700 shadow-xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tháng này
              </button>
              <button
                type="button"
                onClick={() => setTimeFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  timeFilter === 'all' ? 'bg-white text-blue-700 shadow-xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tất cả
              </button>
            </div>

            {/* Bộ lọc Chiến dịch */}
            {uniqueCampaigns.length > 0 && (
              <select
                value={selectedCampaign}
                onChange={e => setSelectedCampaign(e.target.value)}
                className="h-9 px-3 border border-slate-200 rounded-xl text-xs font-semibold bg-slate-50 text-slate-800 focus:bg-white focus:border-blue-500 outline-none cursor-pointer shadow-2xs"
              >
                <option value="all">Tất cả chiến dịch</option>
                {uniqueCampaigns.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}

            {/* Nút Làm mới */}
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading}
                className="h-9 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
                title="Cập nhật số liệu"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
                <span>Làm mới</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Hàng 5 Thẻ Chỉ Số Trọng Yếu (Chi tiêu, Tin nhắn, Tin nhắn mới, Tương tác, Chuyển đổi) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        
        {/* Thẻ 1: Số tiền đã chi tiêu */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Số Tiền Đã Chi Tiêu</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-slate-900">
              {formatCurrency(metrics.totalSpentEstimated)}
            </div>
            <span className="text-[10px] text-slate-500 font-medium block mt-1">
              Ước tính: {formatCurrency(cplEstimate)} / lead
            </span>
          </div>
        </div>

        {/* Thẻ 2: Số tin nhắn */}
        <div className="bg-white p-4 rounded-2xl border border-blue-200 bg-gradient-to-b from-blue-50/20 to-white shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700">Số Tin Nhắn</span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl sm:text-3xl font-black text-blue-700">
              {metrics.totalMessages}
            </div>
            <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
              {metrics.leadsWithPhone} có SĐT
            </span>
          </div>
        </div>

        {/* Thẻ 3: Số tin nhắn mới (Cần gọi tư vấn) */}
        <div className="bg-white p-4 rounded-2xl border border-indigo-200 bg-gradient-to-b from-indigo-50/20 to-white shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-700">Tin Nhắn Mới</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <MessageCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl sm:text-3xl font-black text-indigo-700">
              {metrics.newMessages}
            </div>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">
              Chưa chốt
            </span>
          </div>
        </div>

        {/* Thẻ 4: Tương tác trang */}
        <div className="bg-white p-4 rounded-2xl border border-purple-200 bg-gradient-to-b from-purple-50/20 to-white shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-purple-700">Tương Tác Trang</span>
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl sm:text-3xl font-black text-purple-700">
              {metrics.totalInteractions}
            </div>
            <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
              Sự kiện & Click
            </span>
          </div>
        </div>

        {/* Thẻ 5: Tỷ lệ chuyển đổi & Doanh thu */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50/20 to-white shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">Tỷ Lệ Chốt Tour</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl sm:text-3xl font-black text-emerald-700">
              {metrics.conversionRate}%
            </div>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
              {metrics.convertedLeads} đơn chốt
            </span>
          </div>
        </div>
      </div>

      {/* 3. Khu Vực Biểu Đồ Recharts Trực Quan */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Cột 1 & 2: Biểu Đồ Chính (Xu Hướng Theo Ngày & So Sánh Chiến Dịch) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 flex flex-col justify-between">
          
          {/* Header Biểu Đồ & Chuyển Tab */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                {activeChartTab === 'leads_trend' ? 'Biểu Đồ Xu Hướng Số Lượng Leads & Tin Nhắn Theo Ngày' : 'Biểu Đồ So Sánh Hiệu Suất Theo Chiến Dịch Quảng Cáo'}
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Dữ liệu đo lường trực tiếp từ Webhook Meta Ads và chuyển đổi Booking CRM
              </p>
            </div>

            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={() => setActiveChartTab('leads_trend')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  activeChartTab === 'leads_trend' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Xu hướng ngày
              </button>
              <button
                type="button"
                onClick={() => setActiveChartTab('campaign_performance')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  activeChartTab === 'campaign_performance' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Theo chiến dịch
              </button>
            </div>
          </div>

          {/* Render Biểu Đồ Recharts */}
          <div className="pt-5 w-full h-[320px]">
            {activeChartTab === 'leads_trend' ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorConverted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={COLORS.success} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      fontSize: '12px',
                      fontWeight: 600
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Area
                    type="monotone"
                    dataKey="leads"
                    name="Tổng Leads / Tin nhắn"
                    stroke={COLORS.primary}
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorLeads)"
                  />
                  <Area
                    type="monotone"
                    dataKey="phoneLeads"
                    name="Khách để lại SĐT"
                    stroke={COLORS.indigo}
                    strokeWidth={2}
                    fillOpacity={0}
                  />
                  <Area
                    type="monotone"
                    dataKey="converted"
                    name="Chốt Booking thành công"
                    stroke={COLORS.success}
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorConverted)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={campaignPerformanceData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 10, fill: '#64748b' }} 
                    stroke="#cbd5e1" 
                    interval={0} 
                    angle={-15} 
                    textAnchor="end"
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      fontSize: '12px',
                      fontWeight: 600
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '20px' }} />
                  <Bar dataKey="leads" name="Số lượng Leads" fill={COLORS.primary} radius={[6, 6, 0, 0]} />
                  <Bar dataKey="phones" name="Có Số Điện Thoại" fill={COLORS.indigo} radius={[6, 6, 0, 0]} />
                  <Bar dataKey="converted" name="Chốt Booking" fill={COLORS.success} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Cột 3: Biểu Đồ Tròn Phân Bổ Nguồn & Phễu Chuyển Đổi */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 flex flex-col justify-between">
          <div className="pb-3 border-b border-slate-100">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-indigo-600" />
              Cơ Cấu Nguồn Leads Meta
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Tỷ lệ phân bổ qua Messenger và Lead Form
            </p>
          </div>

          <div className="w-full h-[220px] flex items-center justify-center my-2">
            {channelDistributionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={channelDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {channelDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      fontSize: '11px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-400 text-xs py-8">
                Chưa có dữ liệu phân bổ
              </div>
            )}
          </div>

          {/* Chú thích nguồn */}
          <div className="space-y-2 pt-3 border-t border-slate-100">
            {channelDistributionData.map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                  />
                  <span className="text-slate-700 font-medium truncate max-w-[130px]">{item.name}</span>
                </div>
                <span className="font-bold text-slate-900">{item.value} ({metrics.totalLeadsCount > 0 ? Math.round((item.value / metrics.totalLeadsCount) * 100) : 0}%)</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
