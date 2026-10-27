import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Save,
  Send,
  ShieldCheck,
  Eye,
  EyeOff,
  Info,
  CheckCircle2,
  XCircle,
  Zap,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  fetchMetaCapiConfig,
  saveMetaCapiConfig,
  testMetaConnection,
  simulateMetaWebhook
} from '@/lib/metaCapiService';

interface DiagnosisResult {
  tokenValid: boolean;
  tokenOwner?: { id: string; name: string; type?: string; link?: string };
  permissions?: { name: string; status: string }[];
  pageStatus?: { id: string; name: string; isSubscribedToWebhook?: boolean; webhookApps?: any[]; error?: string };
  pixelStatus?: { id: string; name?: string; canAccess: boolean; error?: string };
  adAccountStatus?: { id: string; name?: string; currency?: string; status?: number; error?: string };
  recommendations: string[];
  rawErrors: string[];
}

interface MetaCapiSettingsSectionProps {
  onConfigSaved?: () => void;
}

export const MetaCapiSettingsSection: React.FC<MetaCapiSettingsSectionProps> = ({ onConfigSaved }) => {
  // State CAPI
  const [pixelId, setPixelId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [testEventCode, setTestEventCode] = useState('');
  const [pageId, setPageId] = useState('');
  const [adAccountId, setAdAccountId] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResult | null>(null);

  // State Simulate Lead Webhook
  const [simName, setSimName] = useState('Nguyễn Văn Khách Hàng');
  const [simPhone, setSimPhone] = useState('0912345678');
  const [simMessage, setSimMessage] = useState('Chào Tour CRM, mình muốn tư vấn tour Nhật Bản 5N4Đ');
  const [isSimulating, setIsSimulating] = useState(false);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const config = await fetchMetaCapiConfig();
      if (config) {
        setPixelId(config.pixel_id || '');
        setAccessToken(config.access_token_masked || '');
        setTestEventCode(config.test_event_code || '');
        setIsEnabled(config.is_enabled !== false);
      }
    } catch (err) {
      console.error('Lỗi nạp cấu hình Meta CAPI:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pixelId.trim()) {
      toast.error('Vui lòng nhập Dataset ID / Meta Pixel ID');
      return;
    }

    setIsSaving(true);
    try {
      const res = await saveMetaCapiConfig({
        pixel_id: pixelId.trim(),
        access_token: accessToken.trim(),
        test_event_code: testEventCode.trim() || undefined,
        is_enabled: isEnabled
      });

      if (res.success) {
        toast.success('Đã lưu cấu hình Meta Conversions API (CAPI) thành công!');
        loadConfig();
        if (onConfigSaved) onConfigSaved();
      } else {
        toast.error(res.error || 'Lỗi khi lưu cấu hình');
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi lưu cấu hình');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!pixelId.trim() || !accessToken.trim()) {
      toast.error('Vui lòng nhập đầy đủ Pixel ID và Access Token trước khi test');
      return;
    }

    setIsTesting(true);
    try {
      const res = await testMetaConnection({
        pixel_id: pixelId.trim(),
        access_token: accessToken.trim(),
        test_event_code: testEventCode.trim() || undefined
      });

      if (res.success) {
        toast.success(`Bắn Test Event thành công lên Meta Graph API! (Events Received: ${res.events_received || 1})`);
      } else {
        toast.error(res.error || 'Lỗi khi bắn Test Event lên Meta');
      }
    } catch (err: any) {
      toast.error(err.message || 'Không thể gửi Test Event');
    } finally {
      setIsTesting(false);
    }
  };

  const handleDiagnoseToken = async () => {
    if (!accessToken.trim()) {
      toast.error('Vui lòng nhập Access Token cần chẩn đoán');
      return;
    }

    setIsDiagnosing(true);
    setDiagnosisResult(null);
    try {
      const res = await fetch('/api/meta-capi/diagnose-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: accessToken.trim(),
          pixel_id: pixelId.trim() || undefined,
          page_id: pageId.trim() || undefined,
          ad_account_id: adAccountId.trim() || undefined
        })
      });

      const data = await res.json();
      if (data.success && data.diagnosis) {
        setDiagnosisResult(data.diagnosis);
        if (data.diagnosis.tokenValid) {
          toast.success('Token Meta API hợp lệ và đã được xác thực!');
        } else {
          toast.error('Mã Token không hợp lệ hoặc đã hết hạn!');
        }
      } else {
        toast.error(data.error || 'Lỗi khi chẩn đoán Token');
      }
    } catch (err: any) {
      toast.error(err.message || 'Không thể kết nối máy chủ chẩn đoán');
    } finally {
      setIsDiagnosing(false);
    }
  };

  const handleSimulateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simName.trim() || !simPhone.trim()) {
      toast.error('Vui lòng điền tên và SĐT để thử nghiệm');
      return;
    }

    setIsSimulating(true);
    try {
      const res = await simulateMetaWebhook({
        customer_name: simName.trim(),
        customer_phone: simPhone.trim(),
        message_text: simMessage.trim()
      });

      if (res.success) {
        toast.success('Bắn giả lập Webhook thành công! Đã tạo Lead và kích hoạt CAPI.');
        if (onConfigSaved) onConfigSaved();
      } else {
        toast.error(res.error || 'Lỗi giả lập Webhook');
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi giả lập Webhook');
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. KHỐI CẤU HÌNH META CAPI */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                1. Cấu Hình Meta Conversions API (CAPI v19.0)
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  isEnabled && pixelId ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {isEnabled && pixelId ? '● Đang kích hoạt' : '○ Chưa kết nối'}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Tự động mã hóa chuẩn SHA-256 (PII) và bắn các sự kiện Lead (SĐT, Đơn hàng mới) &amp; Purchase (Doanh thu thực) về Meta Events Manager.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || !pixelId}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
            >
              <Send className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              {isTesting ? 'Đang test...' : 'Bắn Test Event'}
            </button>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Dataset ID / Meta Pixel ID <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ví dụ: 1560803451392095"
                value={pixelId}
                onChange={(e) => setPixelId(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono shadow-2xs"
                required
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Lấy từ Trình quản lý sự kiện Meta (Meta Events Manager) &gt; Tab Cài đặt &gt; ID Tập dữ liệu.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Mã Thử Nghiệm Sự Kiện (Test Event Code - CAPI)
              </label>
              <input
                type="text"
                placeholder="Ví dụ: TEST67626 (để trống nếu chạy thực tế)"
                value={testEventCode}
                onChange={(e) => setTestEventCode(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono shadow-2xs"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Lấy từ tab "Thử nghiệm sự kiện" trên Meta để theo dõi dữ liệu nảy realtime.
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                CAPI Access Token (Mã Truy Cập Hệ Thống) <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-blue-600 font-medium">
                (Tạo từ mục "Thiết lập tiện ích tích hợp trực tiếp" trên Meta)
              </span>
            </div>
            <div className="relative">
              <input
                type={showAccessToken ? 'text' : 'password'}
                placeholder="Dán mã bắt đầu bằng EAAB... hoặc EAATD..."
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono shadow-2xs"
                required
              />
              <button
                type="button"
                onClick={() => setShowAccessToken(!showAccessToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showAccessToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Hướng dẫn nhanh */}
          <div className="p-3.5 bg-blue-50/80 rounded-xl border border-blue-200/90 text-xs text-blue-950 space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-blue-900">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              Cách lấy CAPI Access Token từ Trình Quản Lý Sự Kiện Meta (Events Manager):
            </div>
            <ol className="list-decimal pl-5 space-y-1 text-[11px] text-slate-700">
              <li>
                Mở <strong>Trình quản lý sự kiện (Meta Events Manager)</strong> &gt; Chọn <strong>Tập dữ liệu / Pixel</strong> của bạn.
              </li>
              <li>
                Chuyển sang tab <strong>Cài đặt</strong> &gt; Cuộn xuống mục <strong>Thiết lập tiện ích tích hợp trực tiếp</strong>.
              </li>
              <li>
                Nhấn nút <strong>"Tạo mã truy cập"</strong> &gt; Copy chuỗi mã <code>EAA...</code> dán vào ô ở trên.
              </li>
            </ol>
          </div>

          <div className="pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span className="text-xs font-bold text-slate-800">
                Kích hoạt tự động bắn sự kiện CAPI khi tạo đơn và thu tiền cọc
              </span>
            </label>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleDiagnoseToken}
                disabled={isDiagnosing || !accessToken}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <ShieldCheck className={`w-4 h-4 ${isDiagnosing ? 'animate-spin' : ''}`} />
                {isDiagnosing ? 'Đang kiểm tra...' : 'Kiểm Tra Token'}
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-xs shadow-blue-600/20 disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                {isSaving ? 'Đang lưu...' : 'Lưu Cấu Hình CAPI'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Bảng kết quả chẩn đoán nếu có */}
      {diagnosisResult && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                diagnosisResult.tokenValid ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
              }`}>
                {diagnosisResult.tokenValid ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">
                  Kết Quả Chẩn Đoán Token Meta API
                </h3>
                <p className="text-xs text-slate-500">
                  {diagnosisResult.tokenValid
                    ? `Mã Token Hợp Lệ • Chủ sở hữu: ${diagnosisResult.tokenOwner?.name || 'N/A'} (ID: ${diagnosisResult.tokenOwner?.id || 'N/A'})`
                    : 'Mã Token Không Hợp Lệ Hoặc Đã Hết Hạn'}
                </p>
              </div>
            </div>

            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
              diagnosisResult.tokenValid ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              {diagnosisResult.tokenValid ? '● ĐÃ XÁC THỰC' : '✕ LỖI KẾT NỐI'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 space-y-1">
              <div className="font-bold text-slate-900">Pixel / Dataset CAPI:</div>
              <div>Quyền truy cập: {diagnosisResult.pixelStatus?.canAccess ? <span className="text-emerald-600 font-bold">Hợp lệ</span> : <span className="text-amber-600 font-bold">Chưa xác định</span>}</div>
              <div>ID Pixel: {pixelId || 'Chưa điền'}</div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 space-y-1">
              <div className="font-bold text-slate-900">Quyền hạn cấp (Permissions):</div>
              <div className="flex flex-wrap gap-1 mt-1">
                {diagnosisResult.permissions && diagnosisResult.permissions.length > 0 ? (
                  diagnosisResult.permissions.map(p => (
                    <span key={p.name} className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-medium text-slate-600">
                      {p.name}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-400 text-xs">Không có danh sách quyền đặc biệt</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. KHỐI GIẢ LẬP WEBHOOK THỬ NGHIỆM */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              2. Thử Nghiệm Giả Lập Webhook (Realtime Lead Test)
            </h2>
            <p className="text-xs text-slate-500">
              Mô phỏng tin nhắn từ Fanpage chứa SĐT để kiểm tra ngay luồng nảy lead tự động về CRM và CAPI.
            </p>
          </div>
        </div>

        <form onSubmit={handleSimulateWebhook} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Tên Khách Hàng Giả Lập
              </label>
              <input
                type="text"
                value={simName}
                onChange={(e) => setSimName(e.target.value)}
                className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Số Điện Thoại Khách
              </label>
              <input
                type="text"
                value={simPhone}
                onChange={(e) => setSimPhone(e.target.value)}
                className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Nội Dung Tin Nhắn Khách Nhắn Trên Fanpage
            </label>
            <input
              type="text"
              value={simMessage}
              onChange={(e) => setSimMessage(e.target.value)}
              className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSimulating}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-xs shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
            >
              <Zap className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
              {isSimulating ? 'Đang bắn thử...' : 'Bắn Thử Nghiệm Giả Lập Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
