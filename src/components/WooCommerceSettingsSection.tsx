import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Save, 
  ExternalLink, 
  HelpCircle, 
  Sliders, 
  Zap, 
  ArrowRightLeft, 
  Check, 
  Layers, 
  ShieldCheck, 
  Database,
  Share2,
  Plus,
  Trash2,
  X,
  Sparkles,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import { CustomSelect } from './CustomSelect';
import { BulkSyncWooCommerceModal } from './BulkSyncWooCommerceModal';
import { useCRM } from '../context/CRMContext';

interface WooCommerceConfigState {
  site_url: string;
  consumer_key: string;
  consumer_secret: string;
  is_active: boolean;
  auto_sync_on_save: boolean;
  auto_sync_on_booking: boolean;
  repeater_slug?: string;
  sync_mode?: 'repeater' | 'simple';
  field_mappings: Record<string, string>;
  has_secret?: boolean;
}

// Danh mục các trường dữ liệu tiêu chuẩn từ Tour CRM
const AVAILABLE_CRM_FIELDS: { key: string; label: string; desc: string; defaultSlug: string }[] = [
  { key: 'code', label: 'Mã lịch trình / Mã tour (SKU)', desc: 'Mã định danh riêng cho từng ngày khởi hành (VD: OBAM140626)', defaultSlug: 'ma_lich_trinh' },
  { key: 'start_date', label: 'Ngày khởi hành', desc: 'Ngày xuất phát của đoàn (YYYY-MM-DD)', defaultSlug: 'ngay_khoi_hanh' },
  { key: 'end_date', label: 'Ngày kết thúc / Ngày về', desc: 'Ngày về đến điểm xuất phát', defaultSlug: 'ngay_ve' },
  { key: 'duration', label: 'Thời lượng tour', desc: 'Số ngày và đêm (VD: 5 ngày 4 đêm)', defaultSlug: 'thoi_luong' },
  { key: 'price_adult', label: 'Giá vé người lớn', desc: 'Giá tour tiêu chuẩn cho người lớn (VNĐ)', defaultSlug: 'gia_nguoi_lon' },
  { key: 'price_child', label: 'Giá vé trẻ em', desc: 'Giá tour cho trẻ em (VNĐ)', defaultSlug: 'gia_tre_em' },
  { key: 'price_infant', label: 'Giá vé em bé', desc: 'Giá tour em bé dưới 2 tuổi (VNĐ)', defaultSlug: 'gia_em_be' },
  { key: 'single_room_surcharge', label: 'Phụ thu phòng đơn', desc: 'Chi phí phát sinh khi ở phòng đơn (VNĐ)', defaultSlug: 'phu_thu_phong_don' },
  { key: 'price_visa_tour', label: 'Phí dịch vụ Visa', desc: 'Chi phí làm thủ tục visa trọn gói (VNĐ)', defaultSlug: 'phi_visa' },
  { key: 'airline', label: 'Hãng hàng không', desc: 'Hãng hàng không vận chuyển (VD: Vietnam Airlines)', defaultSlug: 'hang_hang_khong' },
  { key: 'hotel', label: 'Khách sạn / Tiêu chuẩn', desc: 'Khách sạn lưu trú (VD: Khách sạn 4 sao)', defaultSlug: 'khach_san' },
  { key: 'destination', label: 'Điểm đến / Quốc gia', desc: 'Quốc gia hoặc thành phố tour ghé thăm', defaultSlug: 'diem_den' },
  { key: 'total_seats', label: 'Tổng số chỗ mở bán', desc: 'Số chỗ tối đa của đoàn', defaultSlug: 'tong_so_cho_mo_ban' },
  { key: 'available_seats', label: 'Số chỗ còn trống', desc: 'Số lượng chỗ khả dụng có thể nhận thêm', defaultSlug: 'so_cho_con_lai' },
  { key: 'itinerary_pdf_url', label: 'Link file PDF lịch trình', desc: 'Đường dẫn mở file PDF chương trình tour', defaultSlug: 'link_lich_trinh' },
  { key: 'guide_name', label: 'Tên Hướng dẫn viên', desc: 'Họ tên HDV trưởng đoàn phụ trách tour', defaultSlug: 'ten_hdv' },
  { key: 'guide_phone', label: 'Số điện thoại HDV', desc: 'SĐT liên lạc của HDV trưởng đoàn', defaultSlug: 'sdt_hdv' },
  { key: 'flight_out', label: 'Chuyến bay đi (Chặng 1)', desc: 'Mã hiệu chuyến bay và giờ cất cánh đi', defaultSlug: 'chuyen_bay_di' },
  { key: 'flight_out_transit', label: 'Chuyến bay đi (Quá cảnh)', desc: 'Chuyến bay chuyển tiếp chặng 2', defaultSlug: 'chuyen_bay_di_qua_canh' },
  { key: 'flight_in', label: 'Chuyến bay về (Chặng 1)', desc: 'Mã hiệu chuyến bay và giờ cất cánh về', defaultSlug: 'chuyen_bay_ve' },
  { key: 'flight_in_transit', label: 'Chuyến bay về (Quá cảnh)', desc: 'Chuyến bay chuyển tiếp về', defaultSlug: 'chuyen_bay_ve_qua_canh' },
  { key: 'transit_info', label: 'Ghi chú quá cảnh', desc: 'Thông tin thời gian và sân bay quá cảnh', defaultSlug: 'ghi_chu_qua_canh' },
  { key: 'tour_status', label: 'Tình trạng Tour (No shop / Giờ chót / Giảm giá)', desc: 'Phân loại trạng thái mở bán của tour', defaultSlug: 'tinh_trang_tour' },
  { key: 'description', label: 'Lưu ý đặc biệt / Ghi chú đợt khởi hành', desc: 'Ghi chú điều kiện nhận khách', defaultSlug: 'luu_y_dac_biet' },
  { key: 'ticket_deadline', label: 'Hạn xuất vé đoàn', desc: 'Hạn chót thanh toán và xuất vé máy bay', defaultSlug: 'han_xuat_ve' },
  { key: 'visa_deadline', label: 'Hạn nhận hồ sơ Visa', desc: 'Hạn cuối nộp hồ sơ xin visa', defaultSlug: 'han_nop_visa' },
  { key: 'category', label: 'Tuyến / Danh mục tour', desc: 'Nhóm sản phẩm (VD: Du lịch Châu Âu)', defaultSlug: 'danh_muc_tour' }
];

const DEFAULT_MAPPINGS: Record<string, string> = {
  code: 'ma_lich_trinh',
  start_date: 'ngay_khoi_hanh',
  end_date: 'ngay_ve',
  duration: 'thoi_luong',
  price_adult: 'gia_nguoi_lon',
  price_child: 'gia_tre_em',
  price_infant: 'gia_em_be',
  single_room_surcharge: 'phu_thu_phong_don',
  total_seats: 'tong_so_cho_mo_ban',
  available_seats: 'so_cho_con_lai',
  airline: 'hang_hang_khong',
  hotel: 'khach_san',
  destination: 'diem_den',
  itinerary_pdf_url: 'link_lich_trinh',
  flight_out: 'chuyen_bay_di',
  flight_in: 'chuyen_bay_ve'
};

export default function WooCommerceSettingsSection() {
  const [config, setConfig] = useState<WooCommerceConfigState>({
    site_url: '',
    consumer_key: '',
    consumer_secret: '',
    is_active: true,
    auto_sync_on_save: false,
    auto_sync_on_booking: false,
    repeater_slug: 'lich_trinh_khoi_hanh',
    sync_mode: 'repeater',
    field_mappings: { ...DEFAULT_MAPPINGS }
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [testResult, setTestResult] = useState<{
    success?: boolean;
    message?: string;
    version?: string;
    total_products?: number;
  } | null>(null);

  const [activeSubTab, setActiveSubTab] = useState<'connection' | 'acf_mapping' | 'bulk_sync'>('connection');

  // Modal / Form Thêm trường ACF mới
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCrmField, setSelectedCrmField] = useState<string>('start_date');
  const [customCrmFieldKey, setCustomCrmFieldKey] = useState<string>('');
  const [newAcfSlug, setNewAcfSlug] = useState<string>('');
  const [newFieldLabel, setNewFieldLabel] = useState<string>('');

  // Load config on mount
  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/woocommerce/config');
      const json = await res.json();
      if (json.success && json.data) {
        setConfig({
          site_url: json.data.site_url || '',
          consumer_key: json.data.consumer_key || '',
          consumer_secret: json.data.consumer_secret || '',
          is_active: json.data.is_active ?? true,
          auto_sync_on_save: json.data.auto_sync_on_save ?? false,
          auto_sync_on_booking: json.data.auto_sync_on_booking ?? false,
          field_mappings: {
            ...DEFAULT_MAPPINGS,
            ...(json.data.field_mappings || {})
          },
          has_secret: json.data.has_secret
        });
      }
    } catch (err) {
      console.error('Lỗi khi tải cấu hình WooCommerce:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setIsSaving(true);
      const res = await fetch('/api/woocommerce/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Đã lưu cấu hình kết nối WooCommerce thành công!');
        if (json.data) {
          setConfig(prev => ({
            ...prev,
            ...json.data,
            has_secret: json.data.has_secret
          }));
        }
      } else {
        toast.error(json.message || 'Lưu cấu hình thất bại');
      }
    } catch (err: any) {
      toast.error('Lỗi mạng khi lưu cấu hình: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setIsTesting(true);
      setTestResult(null);
      const res = await fetch('/api/woocommerce/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const json = await res.json();
      setTestResult(json);
      if (json.success) {
        toast.success(json.message);
      } else {
        toast.error(json.message);
      }
    } catch (err: any) {
      const msg = 'Lỗi kết nối tới máy chủ: ' + err.message;
      setTestResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setIsTesting(false);
    }
  };

  const { tours, refreshTours } = useCRM();
  const [isBulkSyncModalOpen, setIsBulkSyncModalOpen] = useState(false);

  const handleSyncAllTours = () => {
    setIsBulkSyncModalOpen(true);
  };

  // Thao tác Xóa 1 trường ACF mapping
  const handleDeleteFieldMapping = (crmKey: string) => {
    const meta = AVAILABLE_CRM_FIELDS.find(f => f.key === crmKey);
    const displayName = meta ? meta.label : crmKey;
    if (!window.confirm(`Bạn có chắc muốn xóa trường ACF "${displayName}" (${crmKey})? Sau khi xóa, trường này sẽ không được đồng bộ sang website WordPress nữa.`)) {
      return;
    }

    setConfig(prev => {
      const updated = { ...prev.field_mappings };
      delete updated[crmKey];
      return {
        ...prev,
        field_mappings: updated
      };
    });
    toast.success(`Đã xóa trường "${displayName}" khỏi bảng đồng bộ`);
  };

  // Mở modal Thêm trường ACF mới
  const handleOpenAddModal = () => {
    // Tìm trường CRM đầu tiên chưa có trong field_mappings
    const unused = AVAILABLE_CRM_FIELDS.find(f => !(f.key in config.field_mappings));
    const defaultField = unused || AVAILABLE_CRM_FIELDS[0];
    setSelectedCrmField(defaultField.key);
    setNewAcfSlug(defaultField.defaultSlug);
    setNewFieldLabel(defaultField.label);
    setCustomCrmFieldKey('');
    setShowAddModal(true);
  };

  // Khi chọn trường CRM khác trong modal
  const handleCrmFieldChange = (crmKey: string) => {
    setSelectedCrmField(crmKey);
    if (crmKey === 'custom') {
      setNewAcfSlug('');
      setNewFieldLabel('');
    } else {
      const found = AVAILABLE_CRM_FIELDS.find(f => f.key === crmKey);
      if (found) {
        setNewAcfSlug(found.defaultSlug);
        setNewFieldLabel(found.label);
      }
    }
  };

  // Thao tác Lưu thêm trường ACF mới
  const handleConfirmAddField = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCrmKey = selectedCrmField === 'custom' ? customCrmFieldKey.trim() : selectedCrmField;
    const finalAcfSlug = newAcfSlug.trim();

    if (!finalCrmKey) {
      toast.error('Vui lòng chọn hoặc nhập tên trường dữ liệu Tour CRM.');
      return;
    }

    if (!finalAcfSlug) {
      toast.error('Vui lòng nhập tên định danh ACF (Slug / Field Name).');
      return;
    }

    // Kiểm tra xem trường đã tồn tại chưa
    if (finalCrmKey in config.field_mappings) {
      if (!window.confirm(`Trường "${finalCrmKey}" đã tồn tại với ACF Slug "${config.field_mappings[finalCrmKey]}". Bạn có muốn ghi đè bằng Slug mới "${finalAcfSlug}" không?`)) {
        return;
      }
    }

    setConfig(prev => ({
      ...prev,
      field_mappings: {
        ...prev.field_mappings,
        [finalCrmKey]: finalAcfSlug
      }
    }));

    setShowAddModal(false);
    toast.success(`Đã thêm trường ACF "${finalAcfSlug}" (${finalCrmKey}) thành công! Nhớ bấm "Lưu bảng ghép trường ACF" để áp dụng.`);
  };

  if (isLoading) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
        <p className="text-xs font-bold text-slate-600">Đang tải cấu hình kết nối WooCommerce & ACF...</p>
      </div>
    );
  }

  const mappingCount = Object.keys(config.field_mappings).length;

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-400">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black tracking-tight">Tích Hợp Website WordPress (WooCommerce + ACF)</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                REST API v3
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium leading-relaxed">
              Tự động hóa đồng bộ giá tour, ngày khởi hành, mã tour, số chỗ trống khả dụng và các trường thông tin nâng cao (ACF) từ Tour CRM sang website bán tour WordPress của bạn chỉ với 1 cú click.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="h-10 px-4 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleSaveConfig()}
              disabled={isSaving}
              className="h-10 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Đang lưu...' : 'Lưu cấu hình'}</span>
            </button>
          </div>
        </div>

        {/* Live connection badge */}
        {testResult && (
          <div className={`mt-4 p-3 rounded-xl text-xs font-bold flex items-center gap-2.5 border transition-all ${
            testResult.success
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
          }`}>
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <div className="flex-1">
              <span>{testResult.message}</span>
              {testResult.total_products !== undefined && (
                <span className="ml-2 font-normal text-slate-300">
                  (Tổng số sản phẩm WooCommerce hiện tại: {testResult.total_products})
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sub-tabs Navigation */}
      <div className="flex bg-slate-100 rounded-2xl p-1 border border-slate-200 shadow-2xs gap-1">
        <button
          type="button"
          onClick={() => setActiveSubTab('connection')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeSubTab === 'connection'
              ? 'bg-white text-blue-600 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>1. Cấu hình kết nối API</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('acf_mapping')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeSubTab === 'acf_mapping'
              ? 'bg-white text-blue-600 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span>2. Ghép trường ACF (Field Mapping)</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
            {mappingCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('bulk_sync')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeSubTab === 'bulk_sync'
              ? 'bg-white text-blue-600 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>3. Đồng bộ hàng loạt & Tự động</span>
        </button>
      </div>

      {/* SUB-TAB 1: CẤU HÌNH KẾT NỐI API */}
      {activeSubTab === 'connection' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Thông Tin Xác Thực WooCommerce REST API</span>
              </h4>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Các thông tin này được lấy từ mục Cài đặt Nâng cao trong WooCommerce của WordPress.
              </p>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              {/* Site URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-blue-600" />
                  <span>Website URL (Tên miền WordPress) *</span>
                </label>
                <input
                  type="url"
                  placeholder="https://yourcompany.com"
                  required
                  value={config.site_url}
                  onChange={(e) => setConfig({ ...config, site_url: e.target.value })}
                  className="w-full h-10 px-3.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-2xs"
                />
                <p className="text-[11px] text-slate-500">
                  Nhập địa chỉ website có giao thức HTTPS đầy đủ (Ví dụ: <code className="text-blue-600 font-bold">https://yourcompany.com</code>).
                </p>
              </div>

              {/* Consumer Key */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  <span>Consumer Key (Mã định danh API) *</span>
                </label>
                <input
                  type="text"
                  placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  required
                  value={config.consumer_key}
                  onChange={(e) => setConfig({ ...config, consumer_key: e.target.value })}
                  className="w-full h-10 px-3.5 border border-slate-300 rounded-xl text-xs font-mono font-medium text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-2xs"
                />
              </div>

              {/* Consumer Secret */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-600" />
                  <span>Consumer Secret (Mã bí mật API) *</span>
                </label>
                <input
                  type="password"
                  placeholder={config.has_secret ? '••••••••••••••••••••••••••••••••••••••••' : 'cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'}
                  required={!config.has_secret}
                  value={config.consumer_secret}
                  onChange={(e) => setConfig({ ...config, consumer_secret: e.target.value })}
                  className="w-full h-10 px-3.5 border border-slate-300 rounded-xl text-xs font-mono font-medium text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-2xs"
                />
                <p className="text-[11px] text-slate-500">
                  Mã bí mật được bảo vệ an toàn ở máy chủ nội bộ và không bao giờ xuất hiện ở ngoài.
                </p>
              </div>

              {/* Kích hoạt kết nối */}
              <div className="pt-2">
                <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={config.is_active}
                    onChange={(e) => setConfig({ ...config, is_active: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Kích hoạt cổng kết nối với Website WordPress</span>
                    <span className="text-[11px] text-slate-500">Cho phép các tính năng đồng bộ tour và kiểm tra tình trạng chỗ trống hoạt động.</span>
                  </div>
                </label>
              </div>
            </form>
          </div>

          {/* Guide Card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-150 rounded-2xl p-6 space-y-4 shadow-sm h-fit">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-blue-600" />
              <h4 className="text-xs font-black text-blue-900 uppercase tracking-wide">Hướng Dẫn Lấy API Key</h4>
            </div>

            <ol className="text-xs text-slate-700 space-y-3 font-medium list-decimal list-inside leading-relaxed">
              <li>
                Đăng nhập vào trang quản trị <strong>WordPress Admin</strong> của website.
              </li>
              <li>
                Vào mục <strong>WooCommerce</strong> &gt; <strong>Cài đặt (Settings)</strong> &gt; Tab <strong>Nâng cao (Advanced)</strong>.
              </li>
              <li>
                Chọn mục <strong>REST API</strong> &gt; Bấm nút <strong>Thêm khóa (Add key)</strong>.
              </li>
              <li>
                Đặt mô tả: <span className="font-bold text-blue-700">Tour CRM Sync</span>.
              </li>
              <li>
                Mục Quyền (Permissions): Chọn <strong className="text-emerald-700">Đọc/Ghi (Read/Write)</strong>.
              </li>
              <li>
                Bấm <strong>Tạo khóa API</strong> và sao chép <em>Consumer Key</em> & <em>Consumer Secret</em> dán vào khung bên trái.
              </li>
            </ol>

            <div className="pt-3 border-t border-blue-200/60">
              <span className="text-[11px] text-blue-800 font-bold block mb-1">Lưu ý an toàn:</span>
              <p className="text-[11px] text-blue-700 leading-normal">
                Website của bạn cần chạy chứng chỉ bảo mật HTTPS (SSL) để WooCommerce REST API hoạt động ổn định.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: GHÉP TRƯỜNG ACF (FIELD MAPPING) */}
      {activeSubTab === 'acf_mapping' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
          {/* Hộp cấu hình ACF Repeater Lịch Khởi Hành */}
          <div className="p-4 bg-linear-to-r from-blue-50/80 to-indigo-50/60 rounded-2xl border border-blue-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                  <h5 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Cấu Hình Bảng Lịch Khởi Hành (ACF Repeater)
                  </h5>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-600 text-white shadow-2xs">
                    Mô hình 1 Tour nhiều ngày khởi hành
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium">
                  Hệ thống tự động gom các lịch khởi hành có chung tên tour thành một bảng Repeater trên website. 
                  <strong className="text-blue-900 font-bold ml-1">Mã lịch trình (ví dụ: OBAM140626)</strong> là chìa khóa duy nhất để cập nhật đúng từng ngày và giá bán tương ứng.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <label className="text-xs font-bold text-slate-700 whitespace-nowrap">Tên Slug trường Repeater:</label>
                <input
                  type="text"
                  value={config.repeater_slug || 'lich_trinh_khoi_hanh'}
                  onChange={(e) => setConfig(prev => ({ ...prev, repeater_slug: e.target.value.trim() }))}
                  placeholder="lich_trinh_khoi_hanh"
                  className="h-9 px-3 bg-white border border-blue-300 rounded-xl text-xs font-mono font-bold text-blue-950 shadow-2xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden w-52 sm:w-60"
                  title="Nhập tên trường Field Name của Repeater trong WordPress ACF (ví dụ: lich_trinh_khoi_hanh hoặc departures)"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span>Bảng Ghép Trường Thông Tin ACF (Field Mapping)</span>
                </h4>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  {mappingCount} trường đang đồng bộ
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Tự do thêm hoặc xóa các trường ACF để khớp chính xác với slug custom field đang lưu trên website WordPress của bạn.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Bạn có chắc muốn khôi phục lại danh sách các trường ACF mặc định không?')) {
                    setConfig(prev => ({
                      ...prev,
                      field_mappings: { ...DEFAULT_MAPPINGS }
                    }));
                    toast.success('Đã khôi phục về danh sách trường ACF mặc định');
                  }
                }}
                className="text-xs text-slate-500 hover:text-slate-800 font-bold transition-colors underline cursor-pointer"
              >
                Khôi phục mặc định
              </button>

              <button
                type="button"
                onClick={handleOpenAddModal}
                className="h-9 px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm trường ACF</span>
              </button>
            </div>
          </div>

          {mappingCount === 0 ? (
            <div className="p-10 border-2 border-dashed border-slate-200 rounded-2xl text-center space-y-3">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                <Layers className="w-6 h-6" />
              </div>
              <h5 className="text-sm font-bold text-slate-800">Chưa có trường ACF nào được ghép nối</h5>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Bấm vào nút <strong>"Thêm trường ACF"</strong> ở trên hoặc khôi phục danh sách mặc định để bắt đầu đồng bộ dữ liệu sang website.
              </p>
              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, field_mappings: { ...DEFAULT_MAPPINGS } }))}
                className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Tải lại danh sách trường mặc định
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(config.field_mappings).map(([fieldKey, acfSlug]) => {
                const meta = AVAILABLE_CRM_FIELDS.find(f => f.key === fieldKey);
                const labelText = meta ? meta.label : `Trường: ${fieldKey}`;
                const descText = meta ? meta.desc : `Dữ liệu trường tùy biến: ${fieldKey}`;

                return (
                  <div key={fieldKey} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 hover:border-slate-300 transition-colors relative group">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-600" />
                        <span>{labelText}</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          CRM: {fieldKey}
                        </span>
                        {/* Nút Xóa trường ACF */}
                        <button
                          type="button"
                          onClick={() => handleDeleteFieldMapping(fieldKey)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title={`Xóa trường ${labelText} khỏi bảng đồng bộ`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500 whitespace-nowrap">ACF Slug:</span>
                      <input
                        type="text"
                        value={acfSlug}
                        placeholder={meta ? meta.defaultSlug : fieldKey}
                        onChange={(e) => {
                          const newMappings = { ...config.field_mappings, [fieldKey]: e.target.value.trim() };
                          setConfig({ ...config, field_mappings: newMappings });
                        }}
                        className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-blue-700 focus:border-blue-500 outline-none"
                      />
                    </div>

                    <p className="text-[10px] text-slate-500 font-medium">
                      {descText}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={() => handleSaveConfig()}
              disabled={isSaving}
              className="h-10 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Đang lưu...' : 'Lưu bảng ghép trường ACF'}</span>
            </button>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: ĐỒNG BỘ HÀNG LOẠT & TỰ ĐỘNG */}
      {activeSubTab === 'bulk_sync' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tùy chọn tự động */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Cơ Chế Đồng Bộ Tự Động (Auto-Sync)</span>
            </h4>

            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={config.auto_sync_on_save}
                  onChange={(e) => setConfig({ ...config, auto_sync_on_save: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer mt-0.5"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Tự động đồng bộ ngay khi Tạo hoặc Cập nhật Tour</span>
                  <span className="text-[11px] text-slate-500 leading-normal">
                    Khi Điều hành bấm "Lưu Tour" trên CRM, hệ thống sẽ tự động gửi dữ liệu sang WooCommerce để cập nhật ngay lập tức.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={config.auto_sync_on_booking}
                  onChange={(e) => setConfig({ ...config, auto_sync_on_booking: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer mt-0.5"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Tự động cập nhật số chỗ trống khi có Booking</span>
                  <span className="text-[11px] text-slate-500 leading-normal">
                    Khi Sales giữ chỗ hoặc chốt đơn làm giảm số chỗ còn lại, số lượng tồn kho trên website WordPress sẽ tự động được điều chỉnh.
                  </span>
                </div>
              </label>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleSaveConfig()}
                disabled={isSaving}
                className="h-10 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Đang lưu...' : 'Lưu thiết lập tự động'}</span>
              </button>
            </div>
          </div>

          {/* Nút bấm đồng bộ toàn bộ */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Share2 className="w-4 h-4 text-blue-600" />
                <span>Đồng Bộ Toàn Bộ Danh Sách Tour (Bulk Sync)</span>
              </h4>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Đẩy các tour từ Tour CRM lên website WordPress. Hệ thống tự động nhận diện sản phẩm theo quy tắc <strong>tiền tố Mã lịch trình tương ứng với SKU tour</strong> trên website, cập nhật/thêm đợt vào bảng ACF Repeater và tính lại tổng số chỗ trống; nếu chưa có SKU tương ứng, bạn có thể chọn ghép nối hoặc tạo sản phẩm mới trên modal.
              </p>
            </div>

            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 space-y-1">
              <span className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Lưu ý trước khi bấm:</span>
              </span>
              <p className="text-[11px] leading-relaxed">
                Vui lòng đảm bảo bạn đã bấm <strong>"Kiểm tra kết nối"</strong> thành công ở Tab 1 trước khi thực hiện đồng bộ hàng loạt.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSyncAllTours}
              disabled={isSyncingAll}
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncingAll ? 'animate-spin' : ''}`} />
              <span>{isSyncingAll ? 'Đang đồng bộ toàn bộ Tour...' : 'Bắt đầu đồng bộ toàn bộ Tour sang Website'}</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL THÊM TRƯỜNG ACF MỚI */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">Thêm Trường ACF Đồng Bộ Mới</h3>
                  <p className="text-[11px] text-slate-500">Khớp nối thêm dữ liệu từ Tour CRM sang WordPress</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmAddField} className="p-6 space-y-4">
              {/* Chọn nguồn dữ liệu CRM */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  1. Chọn trường thông tin nguồn từ Tour CRM *
                </label>
                <CustomSelect
                  options={[
                    ...AVAILABLE_CRM_FIELDS.map(f => ({
                      value: f.key,
                      label: `${f.label} (${f.key})`
                    })),
                    { value: 'custom', label: '➕ Trường tùy biến khác (Tự nhập key CRM)' }
                  ]}
                  value={selectedCrmField}
                  onChange={handleCrmFieldChange}
                  className="w-full"
                />
              </div>

              {/* Nếu chọn custom key */}
              {selectedCrmField === 'custom' && (
                <div className="space-y-1.5 animate-in fade-in duration-150">
                  <label className="text-xs font-bold text-slate-700 block">
                    Nhập tên trường trong Tour CRM (Key) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: custom_field_name"
                    value={customCrmFieldKey}
                    onChange={(e) => setCustomCrmFieldKey(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                    className="w-full h-10 px-3.5 border border-slate-300 rounded-xl text-xs font-mono font-bold text-blue-700 focus:border-blue-500 outline-none"
                  />
                </div>
              )}

              {/* Nhập tên ACF Slug */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  2. Tên định danh trường ACF trên WordPress (Field Name / Slug) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: ngay_khoi_hanh, thoi_luong, gia_tre_em..."
                  value={newAcfSlug}
                  onChange={(e) => setNewAcfSlug(e.target.value.trim().toLowerCase().replace(/\s+/g, '_'))}
                  className="w-full h-10 px-3.5 border border-slate-300 rounded-xl text-xs font-mono font-bold text-blue-700 focus:border-blue-500 outline-none"
                />
                <p className="text-[11px] text-slate-500">
                  Tên này phải trùng khớp với <strong>Field Name</strong> đã khai báo trong plugin ACF trên website WordPress.
                </p>
              </div>

              <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-150 text-xs text-blue-800 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed text-[11px]">
                  Sau khi thêm, trường mới sẽ xuất hiện ngay trong danh sách. Bạn có thể bấm lưu cấu hình để cập nhật vào cơ sở dữ liệu.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="h-10 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="h-10 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Xác nhận thêm</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Đồng Bộ Hàng Loạt Chuyên Dụng Lên WooCommerce */}
      <BulkSyncWooCommerceModal
        isOpen={isBulkSyncModalOpen}
        onClose={() => setIsBulkSyncModalOpen(false)}
        tours={tours}
        onSyncComplete={() => {
          refreshTours();
        }}
      />
    </div>
  );
}
