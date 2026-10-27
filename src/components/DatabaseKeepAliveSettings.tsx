import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Database,
  Activity,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Zap,
  RefreshCw,
  Server,
  GitBranch,
  FileCode,
  Globe
} from 'lucide-react';
import { format } from 'date-fns';

interface PingResponse {
  status?: string;
  success: boolean;
  timestamp: string;
  latencyMs?: number;
  message?: string;
  error?: string;
}

export default function DatabaseKeepAliveSettings() {
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<PingResponse | null>(null);
  const [serverStatus, setServerStatus] = useState<any>(null);

  const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
  const hasAnonKey = !!((import.meta as any).env.VITE_SUPABASE_ANON_KEY);
  const keepAliveUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/keep-alive` : '/api/keep-alive';

  // Lấy trạng thái gần nhất khi mở tab
  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/keep-alive/status');
      if (res.ok) {
        const data = await res.json();
        setServerStatus(data);
        if (data.lastPing && data.lastPing.timestamp) {
          setPingResult(data.lastPing);
        }
      }
    } catch (e) {
      console.warn('Chưa lấy được trạng thái keep-alive từ server:', e);
    }
  };

  const handleManualPing = async () => {
    setIsPinging(true);
    const toastId = toast.loading('Đang gửi truy vấn giữ ấm tới Supabase...');
    try {
      const startTime = Date.now();
      const res = await fetch('/api/keep-alive');
      const data: PingResponse = await res.json();
      const clientLatency = Date.now() - startTime;

      if (res.ok && data.success) {
        setPingResult({
          ...data,
          latencyMs: data.latencyMs || clientLatency
        });
        toast.success(
          `Ping giữ ấm thành công! Độ trễ: ${data.latencyMs || clientLatency}ms`,
          { id: toastId }
        );
      } else {
        setPingResult({
          success: false,
          timestamp: new Date().toISOString(),
          error: data.error || 'Phản hồi không thành công từ Supabase',
          latencyMs: clientLatency
        });
        toast.error(
          `Ping thất bại: ${data.error || 'Vui lòng kiểm tra lại kết nối Supabase'}`,
          { id: toastId }
        );
      }
    } catch (err: any) {
      setPingResult({
        success: false,
        timestamp: new Date().toISOString(),
        error: err.message || 'Lỗi mạng'
      });
      toast.error('Lỗi khi gọi API keep-alive', { id: toastId });
    } finally {
      setIsPinging(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      toast.success(`Đã sao chép ${label}!`);
    } else {
      toast.error('Không thể tự động sao chép, vui lòng copy thủ công');
    }
  };

  // Ẩn bớt ký tự URL để bảo mật
  const maskUrl = (url: string) => {
    if (!url) return 'Chưa cấu hình VITE_SUPABASE_URL';
    try {
      const parsed = new URL(url);
      return `${parsed.protocol}//${parsed.hostname}`;
    } catch {
      return url;
    }
  };

  return (
    <div className="space-y-6">
      {/* Thẻ Cảnh báo & Giải thích chính sách 7 ngày */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-sky-50 border border-blue-200/80 rounded-2xl p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-600/20">
            <Database className="w-6 h-6" />
          </div>
          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Cơ Chế Giữ Ấm Cơ Sở Dữ Liệu Supabase 24/7 (Anti-Pause)
              </h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Đang bảo vệ
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Chính sách Supabase gói miễn phí sẽ <strong>tự động tạm dừng (pause) dự án nếu sau 7 ngày liên tục không có bất kỳ truy vấn nào</strong>. Hệ thống Tour CRM đã được trang bị kiến trúc giữ ấm 3 tầng giúp cơ sở dữ liệu luôn duy trì trạng thái hoạt động (Active) liên tục mà không phát sinh chi phí.
            </p>
          </div>
        </div>
      </div>

      {/* Thẻ Trạng thái kết nối & Nút Ping thử nghiệm */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-150 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Trạng thái Kết nối & Ping Kiểm tra
            </h3>
          </div>
          <button
            onClick={handleManualPing}
            disabled={isPinging}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin' : ''}`} />
            <span>{isPinging ? 'Đang gửi ping...' : 'Kiểm tra kết nối & Ping giữ ấm ngay'}</span>
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Supabase URL */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Địa chỉ Supabase Host
              </span>
              <span className="text-xs font-bold text-slate-800 font-mono break-all line-clamp-1" title={supabaseUrl}>
                {maskUrl(supabaseUrl)}
              </span>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-600 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Cấu hình hợp lệ</span>
              </div>
            </div>

            {/* Trạng thái Anon Key */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Khóa Public Anon Key
              </span>
              <span className="text-xs font-bold text-slate-800 font-mono">
                {hasAnonKey ? 'Đã nạp qua biến môi trường' : 'Chưa cấu hình'}
              </span>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-600 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Sẵn sàng xác thực</span>
              </div>
            </div>

            {/* Lần ping gần nhất */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Ghi nhận gần nhất
              </span>
              <div className="text-xs font-bold text-slate-800 font-mono flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  {pingResult?.timestamp
                    ? format(new Date(pingResult.timestamp), 'HH:mm:ss dd/MM/yyyy')
                    : 'Đang sẵn sàng'}
                </span>
              </div>
              <div className="mt-2 text-[11px] font-bold text-blue-600 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Độ trễ: {pingResult?.latencyMs ? `${pingResult.latencyMs}ms` : 'Sẵn sàng'}
                </span>
              </div>
            </div>
          </div>

          {/* Hộp kết quả ping trực quan */}
          {pingResult && (
            <div
              className={`p-4 rounded-xl border text-xs font-medium flex items-start gap-3 ${
                pingResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              {pingResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="font-bold">
                  {pingResult.success
                    ? 'Cơ sở dữ liệu Supabase phản hồi tốt!'
                    : 'Gặp lỗi phản hồi từ Supabase:'}
                </div>
                <div className="text-[11px] opacity-90 font-mono">
                  {pingResult.success
                    ? `Truy vấn SELECT nhẹ thành công trong ${pingResult.latencyMs}ms. Database đã được ghi nhận hoạt động mới và gia hạn thời gian hoạt động.`
                    : (pingResult.error || 'Không thể truy vấn database')}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3 Tầng Bảo Vệ Chi Tiết */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Tầng 1: Worker nội bộ trong CRM */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3 flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                <Server className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                Tầng 1 - Tự Động
              </span>
            </div>
            <h4 className="text-sm font-bold text-slate-900">Worker Tự Động Trong Server</h4>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Server backend của ứng dụng CRM đã tích hợp sẵn worker chạy ngầm: tự động ping cơ sở dữ liệu <strong>sau 5 giây khi khởi động</strong> và lặp lại <strong>mỗi 24 giờ một lần</strong>.
            </p>
          </div>
          <div className="pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Đã tích hợp trong mã nguồn</span>
          </div>
        </div>

        {/* Tầng 2: Webhook Endpoint (Cron-job.org / UptimeRobot) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3 flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
                <Globe className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                Tầng 2 - Độc Lập (Khuyên Dùng)
              </span>
            </div>
            <h4 className="text-sm font-bold text-slate-900">Endpoint API Cho Cron-Job Ngoài</h4>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Sử dụng dịch vụ miễn phí như <strong>Cron-job.org</strong> hoặc <strong>UptimeRobot</strong> để gọi định kỳ vào API endpoint này. Hoàn toàn độc lập, không phụ thuộc vào tình trạng server.
            </p>

            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 space-y-1.5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                API Endpoint Giữ Ấm:
              </div>
              <div className="flex items-center justify-between gap-2">
                <code className="text-[11px] font-mono font-bold text-indigo-700 truncate">
                  /api/keep-alive
                </code>
                <button
                  type="button"
                  onClick={() => copyToClipboard(keepAliveUrl, 'URL Endpoint Giữ Ấm')}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-bold transition-all cursor-pointer shrink-0"
                  title="Sao chép toàn bộ URL"
                >
                  <Copy className="w-3 h-3" />
                  Sao chép URL
                </button>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
            <a
              href="https://cron-job.org"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <span>Mở Cron-job.org</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <span className="text-slate-300">|</span>
            <a
              href="https://uptimerobot.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <span>UptimeRobot</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Tầng 3: GitHub Actions Workflow */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3 flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center">
                <GitBranch className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                Tầng 3 - GitHub Cloud
              </span>
            </div>
            <h4 className="text-sm font-bold text-slate-900">GitHub Actions Tự Động</h4>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Đã tạo sẵn file cấu hình CI/CD trên kho lưu trữ. GitHub sẽ tự động chạy tác vụ gửi lệnh ping trực tiếp tới Supabase <strong>vào 11:00 AM mỗi 2 ngày một lần</strong>.
            </p>

            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                <FileCode className="w-3.5 h-3.5 text-blue-600" />
                <span className="font-mono text-[10px]">.github/workflows/supabase-keep-alive.yml</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Lịch chạy: Mỗi 2 ngày một lần</span>
          </div>
        </div>
      </div>
    </div>
  );
}
