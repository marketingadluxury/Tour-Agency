import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { 
  Sliders, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Save, 
  RotateCcw, 
  ExternalLink,
  ShieldCheck,
  Server,
  KeyRound
} from 'lucide-react';

interface TaxMcpConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const TaxMcpConfigModal: React.FC<TaxMcpConfigModalProps> = ({
  isOpen,
  onClose,
  onSaved
}) => {
  const [endpointInput, setEndpointInput] = useState('');
  const [defaultEndpoint, setDefaultEndpoint] = useState('');
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: 'idle' | 'success' | 'warning' | 'error';
    message: string;
    details?: any;
  }>({ status: 'idle', message: '' });

  // Load config hiện tại khi mở modal
  useEffect(() => {
    if (isOpen) {
      setTestResult({ status: 'idle', message: '' });
      loadCurrentConfig();
    }
  }, [isOpen]);

  const loadCurrentConfig = async () => {
    setIsLoadingConfig(true);
    try {
      const res = await fetch('/api/tax/mcp-config');
      const data = await res.json();
      if (data.success) {
        setEndpointInput(data.endpoint || '');
        setDefaultEndpoint(data.defaultEndpoint || '');
      }
    } catch (err) {
      const local = localStorage.getItem('crm_tax_mcp_endpoint') || '';
      setEndpointInput(local);
    } finally {
      setIsLoadingConfig(false);
    }
  };

  const handleTestConnection = async () => {
    const trimmed = endpointInput.trim();
    if (!trimmed) {
      toast.error('Vui lòng nhập địa chỉ URL Endpoint MCP Server.');
      return;
    }

    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      toast.error('Địa chỉ URL phải bắt đầu bằng http:// hoặc https://');
      return;
    }

    setIsTesting(true);
    setTestResult({ status: 'idle', message: '' });

    try {
      const res = await fetch('/api/tax/check-mcp-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: trimmed })
      });
      const data = await res.json();

      if (data.serverStatus === 'online') {
        setTestResult({
          status: 'success',
          message: `Kết nối thành công! Đã tìm thấy skill "${data.skillName || 'thue-vietnam'}" phiên bản ${data.latestVersion || 'mới nhất'}.`,
          details: data
        });
        toast.success('Kết nối MCP Server thành công!');
      } else {
        const errorMsg = data.mcpNotice || data.message || 'Máy chủ không phản hồi dữ liệu skill hợp lệ.';
        setTestResult({
          status: 'warning',
          message: errorMsg,
          details: data
        });
        toast.error(`Cảnh báo kết nối: ${errorMsg}`);
      }
    } catch (err: any) {
      setTestResult({
        status: 'error',
        message: `Lỗi kết nối mạng: ${err.message || 'Không thể liên lạc tới máy chủ MCP.'}`
      });
      toast.error('Kiểm tra kết nối thất bại.');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    const trimmed = endpointInput.trim();
    if (trimmed && !trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      toast.error('Địa chỉ URL phải bắt đầu bằng http:// hoặc https://');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/tax/mcp-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: trimmed })
      });
      const data = await res.json();

      if (data.success) {
        localStorage.setItem('crm_tax_mcp_endpoint', data.endpoint);
        toast.success('Đã lưu cấu hình máy chủ MCP Thuế thành công!');
        if (onSaved) {
          onSaved();
        }
        onClose();
      } else {
        throw new Error(data.error || 'Lỗi khi lưu cấu hình.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Không thể lưu cấu hình MCP.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefault = () => {
    if (defaultEndpoint) {
      setEndpointInput(defaultEndpoint);
      setTestResult({ status: 'idle', message: '' });
      toast.success('Đã khôi phục URL mặc định của hệ thống.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/15 rounded-xl backdrop-blur-xs">
              <Sliders className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Cấu Hình MCP Server Thuế Việt Nam</h3>
              <p className="text-[11px] text-blue-100">Cập nhật Endpoint &amp; Khóa API đồng bộ luật thuế realtime</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs text-slate-700 max-h-[75vh] overflow-y-auto">
          {/* Giới thiệu */}
          <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200/80 flex items-start gap-2.5 text-blue-900">
            <Server className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-[11.5px] leading-relaxed">
              <p className="font-bold text-blue-950">Giao thức MCP (Model Context Protocol)</p>
              <p className="text-blue-800/90 mt-0.5">
                Hệ thống kết nối đến máy chủ MCP chứa bộ kỹ năng <strong>thue-vietnam</strong> để cập nhật realtime các thông tư, nghị định và quy chuẩn thuế mới nhất 2025 – 2026.
              </p>
            </div>
          </div>

          {/* Ô nhập Endpoint */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                <span>Địa chỉ MCP Endpoint URL</span>
              </label>
              {defaultEndpoint && endpointInput !== defaultEndpoint && (
                <button
                  type="button"
                  onClick={handleResetDefault}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Khôi phục mặc định</span>
                </button>
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                value={endpointInput}
                onChange={(e) => {
                  setEndpointInput(e.target.value);
                  setTestResult({ status: 'idle', message: '' });
                }}
                disabled={isLoadingConfig || isSaving}
                placeholder="https://go.noti.vn/api/skill-mcp/... hoặc URL máy chủ MCP riêng"
                className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-2xs"
              />
            </div>
            <p className="text-[10.5px] text-slate-500">
              * Điền đường dẫn MCP Endpoint được cấp từ cổng Noti / Skill MCP hoặc server nội bộ.
            </p>
          </div>

          {/* Nút kiểm tra kết nối */}
          <div>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || !endpointInput.trim()}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-200 text-xs transition-all shadow-2xs active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Đang gửi yêu cầu kiểm tra...' : 'Kiểm tra kết nối tới Endpoint này'}</span>
            </button>
          </div>

          {/* Hộp hiển thị kết quả kiểm tra */}
          {testResult.status !== 'idle' && (
            <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 animate-in fade-in duration-150 ${
              testResult.status === 'success' 
                ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                : testResult.status === 'warning'
                ? 'bg-amber-50/90 border-amber-200 text-amber-950'
                : 'bg-rose-50/90 border-rose-200 text-rose-950'
            }`}>
              {testResult.status === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : testResult.status === 'warning' ? (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="text-[11.5px] leading-relaxed">
                <p className="font-bold">
                  {testResult.status === 'success' && 'Kết nối MCP hoạt động tốt'}
                  {testResult.status === 'warning' && 'Phản hồi từ MCP Server'}
                  {testResult.status === 'error' && 'Không thể kết nối đến máy chủ'}
                </p>
                <p className="mt-0.5 opacity-90">{testResult.message}</p>
                {testResult.status === 'warning' && (
                  <p className="text-[10.5px] text-amber-800 mt-1 font-medium">
                    (Khi khóa bị thu hồi, hệ thống sẽ tự động sử dụng bộ dữ liệu luật thuế chuẩn v2.2.0 đã đóng gói sẵn trong ứng dụng).
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Hướng dẫn an toàn & lưu trữ */}
          <div className="pt-2 border-t border-slate-100 space-y-1.5">
            <div className="font-bold text-[11px] text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Chính sách lưu trữ an toàn:</span>
            </div>
            <ul className="text-[10.5px] text-slate-600 space-y-1 list-disc pl-4">
              <li>Cấu hình được lưu trực tiếp vào bảng <code>app_settings</code> trên cơ sở dữ liệu Supabase của công ty.</li>
              <li>Hỗ trợ đồng bộ tự động giữa các máy tính và thiết bị của nhân sự công ty.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold rounded-xl text-xs transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Đang lưu...' : 'Lưu cấu hình MCP'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
