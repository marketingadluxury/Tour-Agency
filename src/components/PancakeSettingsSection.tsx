import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Copy, 
  Check, 
  RefreshCw, 
  Save, 
  Key, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  XCircle,
  HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export const PancakeSettingsSection: React.FC = () => {
  const { session } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [hasApiKey, setHasApiKey] = useState(false);
  const [hasWebhookSecret, setHasWebhookSecret] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [lastLeadAt, setLastLeadAt] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);

  // URL Webhook hiện tại của hệ thống
  const webhookUrl = `${window.location.origin}/api/pancake/webhook`;

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/pancake/config');
      const data = await res.json();
      if (data.success && data.data) {
        setHasApiKey(Boolean(data.data.has_api_key));
        setHasWebhookSecret(Boolean(data.data.has_webhook_secret));
        setIsActive(data.data.is_active !== false);
        setLastLeadAt(data.data.last_lead_at || null);
        setApiKey('');
        setWebhookSecret('');
      }
    } catch (err: any) {
      console.error('Lỗi nạp cấu hình Pancake:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  // Format thời gian hiển thị chuẩn `HH:mm dd/MM/yyyy`
  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return 'Chưa có lead';
    try {
      const d = new Date(dateStr);
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${hh}:${mm} ${dd}/${mo}/${yyyy}`;
    } catch {
      return dateStr;
    }
  };

  // Tạo khóa ngẫu nhiên
  const handleGenerateSecret = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let rand = 'pck_';
    for (let i = 0; i < 24; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setWebhookSecret(rand);
    toast.success('Đã tạo khóa bảo vệ ngẫu nhiên! Vui lòng bấm "Lưu cấu hình Pancake" để kích hoạt.');
  };

  // Copy URL Webhook
  const handleCopyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast.success('Đã sao chép URL webhook vào clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Lưu cấu hình
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const token = session?.access_token;
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const payload: any = {
        is_active: isActive
      };
      if (apiKey.trim()) payload.api_key = apiKey.trim();
      if (webhookSecret.trim()) payload.webhook_secret = webhookSecret.trim();

      const res = await fetch('/api/pancake/config', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.error || 'Lỗi khi lưu cấu hình Pancake.');
      }

      toast.success('🎉 Đã lưu cấu hình tích hợp Pancake thành công!');
      await fetchConfig();
    } catch (err: any) {
      console.error('Save Pancake error:', err);
      toast.error(err.message || 'Lỗi khi lưu cấu hình.');
    } finally {
      setSaving(false);
    }
  };

  // Kiểm tra API Token
  const handleTestToken = async () => {
    try {
      setTesting(true);
      const token = session?.access_token;
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/pancake/test-connection', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          api_key: apiKey.trim() || undefined
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`🎉 ${data.message || 'Kết nối Pancake Public API thành công!'}`);
      } else {
        toast.error(`❌ Kiểm tra thất bại: ${data.error || 'API Token không hợp lệ'}`);
      }
    } catch (err: any) {
      console.error('Test Pancake token error:', err);
      toast.error('Lỗi khi kiểm tra kết nối với Pancake.');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
        <p className="text-xs font-bold text-slate-600">Đang nạp cấu hình tích hợp Pancake...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner thông báo bảo mật */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 text-blue-900 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <h4 className="text-xs font-black uppercase tracking-wide text-blue-950">
            Chỉ quản trị viên được thay đổi tích hợp
          </h4>
          <p className="text-xs text-blue-800/90 font-medium leading-relaxed">
            Token mới chỉ được gửi đến backend; sau khi lưu, hệ thống không hiển thị lại token. Để đổi token, nhập token mới rồi lưu.
          </p>
        </div>
      </div>

      {/* Main Card: Pancake -> Lead CRM */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6">
        {/* Header box */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-150 gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Pancake → Lead CRM</span>
            </h3>
            <p className="text-xs text-slate-600 font-medium mt-1">
              Pancake gửi tin nhắn có số điện thoại về CRM qua webhook. API Token chỉ cần nếu muốn kiểm tra tài khoản hoặc đồng bộ thủ công.
            </p>
            <p className="text-[11px] text-slate-500 font-semibold mt-1">
              Lead Pancake gần nhất: <span className="text-slate-800 font-bold">{formatDateTime(lastLeadAt)}</span>
            </p>
          </div>

          <div className="shrink-0">
            {hasWebhookSecret ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Webhook đã có khóa</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                <span>Chưa đặt khóa bảo vệ</span>
              </span>
            )}
          </div>
        </div>

        {/* Inputs grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Col 1: Pancake Public API Token */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800">
              Pancake Public API Token
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Để trống để giữ token hiện tại"
              className="w-full h-10 px-3.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 shadow-2xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
            />
          </div>

          {/* Col 2: Khóa bảo vệ webhook */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800">
              Khóa bảo vệ webhook {hasWebhookSecret && <span className="text-emerald-600 font-semibold">(đã lưu)</span>}
            </label>
            <input
              type="text"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder="Tạo khóa mới hoặc để trống để giữ khóa hiện tại"
              className="w-full h-10 px-3.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 shadow-2xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
            />
          </div>
        </div>

        {/* Nút Tạo khóa ngẫu nhiên */}
        <div>
          <button
            type="button"
            onClick={handleGenerateSecret}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 transition-all cursor-pointer shadow-2xs"
          >
            <Key className="w-3.5 h-3.5 text-slate-500" />
            <span>Tạo khóa ngẫu nhiên</span>
          </button>
        </div>

        {/* Box URL Webhook */}
        <div className="bg-slate-50/90 border border-slate-200 rounded-xl p-4 space-y-2">
          <div className="text-xs font-bold text-slate-800">
            URL webhook nhập tại Pancake
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-mono text-slate-800 truncate select-all">
              {webhookUrl}
            </div>
            <button
              type="button"
              onClick={handleCopyWebhookUrl}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all cursor-pointer shrink-0 shadow-2xs"
              title="Sao chép URL"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
            Pancake cần gửi cùng khóa trong header <code>x-webhook-secret</code>. Nếu nền tảng không hỗ trợ header tùy chỉnh, có thể dùng tham số token trong URL; không chia sẻ URL chứa khóa công khai.
          </p>
        </div>

        {/* Checkbox Kích hoạt */}
        <div className="flex items-center gap-2.5">
          <input
            type="checkbox"
            id="pancakeActiveCheckbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
          <label htmlFor="pancakeActiveCheckbox" className="text-xs font-bold text-slate-800 cursor-pointer select-none">
            Kích hoạt nhận dữ liệu Pancake
          </label>
        </div>

        {/* Action buttons */}
        <div className="pt-3 flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
            <span>{saving ? 'Đang lưu...' : 'Lưu cấu hình Pancake'}</span>
          </button>

          <button
            type="button"
            onClick={handleTestToken}
            disabled={testing}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
            <span>{testing ? 'Đang kiểm tra...' : 'Kiểm tra API Token'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
