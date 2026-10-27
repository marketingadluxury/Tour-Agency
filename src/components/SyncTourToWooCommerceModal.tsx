import React, { useState, useEffect, useMemo } from 'react';
import { 
  Globe, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  Plus, 
  ExternalLink, 
  X, 
  Check, 
  Calendar, 
  DollarSign, 
  Users, 
  AlertCircle,
  Layers,
  Sparkles,
  ArrowRight,
  Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { Tour } from '../types';
import { extractSkuPrefix, normalizeSku, matchTourToWooCommerceProduct } from '../utils/skuUtils';

interface WordPressProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  price: string;
  regular_price: string;
  sku: string;
  status: string;
  stock_quantity: number | null;
  stock_status: string;
  departures_count: number;
  departures: string[];
}

interface SyncTourToWooCommerceModalProps {
  isOpen: boolean;
  onClose: () => void;
  tour: Tour | null;
  onSyncSuccess?: (result: any) => void;
}

export const SyncTourToWooCommerceModal: React.FC<SyncTourToWooCommerceModalProps> = ({
  isOpen,
  onClose,
  tour,
  onSyncSuccess
}) => {
  const [products, setProducts] = useState<WordPressProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Lựa chọn: 'existing' (ghép vào sản phẩm có sẵn) | 'new' (tạo sản phẩm mới)
  const [syncMode, setSyncMode] = useState<'existing' | 'new'>('existing');
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [matchBadge, setMatchBadge] = useState<{ text: string; type: string } | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    product_id?: number;
    product_name?: string;
    product_url?: string;
    action?: string;
    departure_action?: string;
    message?: string;
  } | null>(null);

  // Fetch danh sách sản phẩm từ WooCommerce API
  const fetchProducts = async (keyword = '') => {
    try {
      setIsLoadingProducts(true);
      const url = new URL('/api/woocommerce/products', window.location.origin);
      if (keyword.trim()) {
        url.searchParams.set('search', keyword.trim());
      }
      url.searchParams.set('per_page', '50');

      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.success && Array.isArray(data.products)) {
        setProducts(data.products);

        // Áp dụng thuật toán 4 tầng so khớp tự động
        if (tour) {
          const matchResult = matchTourToWooCommerceProduct(tour, data.products);
          if (matchResult.mode === 'existing' && matchResult.targetProductId) {
            setSelectedProductId(matchResult.targetProductId);
            setSyncMode('existing');
            if (matchResult.matchedType === 'sku_matched') {
              setMatchBadge({ text: `Khớp SKU [${matchResult.matchedProductSku || matchResult.suggestedNewSku}]`, type: 'sku' });
            } else if (matchResult.matchedType === 'linked') {
              setMatchBadge({ text: `Đã liên kết #${matchResult.targetProductId}`, type: 'linked' });
            } else if (matchResult.matchedType === 'departure_matched') {
              setMatchBadge({ text: `Đã có trong ACF #${matchResult.targetProductId}`, type: 'acf' });
            } else {
              setMatchBadge({ text: `Khớp tên #${matchResult.targetProductId}`, type: 'name' });
            }
          } else {
            setSyncMode('new');
            setSelectedProductId(null);
            setMatchBadge({ text: `Chưa có SKU (Sẽ tạo SKU: ${matchResult.suggestedNewSku})`, type: 'new' });
          }
        }
      } else {
        toast.error(data.message || 'Không thể nạp danh sách sản phẩm từ website.');
      }
    } catch (err: any) {
      console.error('Lỗi khi tải danh sách sản phẩm WooCommerce:', err);
      toast.error(err?.message || 'Không thể nạp danh sách sản phẩm từ website.');
    } finally {
      setIsLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (isOpen && tour) {
      setSyncResult(null);
      setSearchQuery(tour.name || '');
      setSelectedProductId(tour.wp_product_id ? Number(tour.wp_product_id) : null);
      fetchProducts(tour.name || '');
    }
  }, [isOpen, tour]);

  // Tìm sản phẩm được chọn
  const selectedProduct = useMemo(() => {
    return products.find(p => p.id === selectedProductId) || null;
  }, [products, selectedProductId]);

  // Kiểm tra xem sản phẩm được chọn đã có mã lịch trình của tour này chưa
  const departureStatusOnSelectedProduct = useMemo(() => {
    if (!selectedProduct || !tour?.code) return null;
    const cleanCode = tour.code.trim().toUpperCase();
    const hasCode = selectedProduct.departures.some(d => d.trim().toUpperCase() === cleanCode);
    return hasCode ? 'update' : 'add_new';
  }, [selectedProduct, tour]);

  // Thực hiện đồng bộ
  const handleExecuteSync = async () => {
    if (!tour) return;
    if (syncMode === 'existing' && !selectedProductId) {
      toast.error('Vui lòng chọn một Sản phẩm trên Website để đồng bộ.');
      return;
    }

    try {
      setIsSyncing(true);
      const payload: any = {
        target_product_id: syncMode === 'existing' ? selectedProductId : 'new',
        force_new: syncMode === 'new'
      };

      const res = await fetch(`/api/woocommerce/sync-tour/${tour.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Đồng bộ thất bại');
      }

      setSyncResult(data);
      toast.success('🎉 ' + (data.message || 'Đồng bộ thành công!'));
      if (onSyncSuccess) {
        onSyncSuccess(data);
      }
    } catch (err: any) {
      console.error('Lỗi đồng bộ:', err);
      toast.error(err.message || 'Lỗi khi đồng bộ sang website');
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isOpen || !tour) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 relative my-6 font-sans"
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Đồng bộ Tour sang Website WordPress
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Ghép ngày khởi hành vào sản phẩm cha trên website WordPress WooCommerce
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* THÔNG TIN TOUR CRM ĐANG CHỌN */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 my-4 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                  {tour.code}
                </span>
                {tour.wp_product_sku && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1">
                    <Tag className="w-2.5 h-2.5" /> SKU Web: {tour.wp_product_sku}
                  </span>
                )}
              </div>
              <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{tour.name}</h4>
            </div>
            <span className="text-xs font-black text-rose-600 shrink-0">
              {(tour.price_adult || tour.price || 0).toLocaleString('vi-VN')} đ
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-600 pt-1 border-t border-slate-200">
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Đi: <strong>{tour.start_date ? tour.start_date.split('-').reverse().join('/') : 'N/A'}</strong></span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Chỗ trống: <strong className="text-emerald-600">{tour.available_seats ?? tour.total_seats ?? 0} chỗ</strong></span>
            </div>
            <div className="flex items-center gap-1">
              <span>Hãng bay: <strong>{tour.airline || 'N/A'}</strong></span>
            </div>
          </div>
        </div>

        {/* KẾT QUẢ ĐỒNG BỘ NẾU ĐÃ HOÀN THÀNH */}
        {syncResult && syncResult.success ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 my-4 space-y-3 animate-in fade-in">
            <div className="flex items-center gap-2.5 text-emerald-800 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Đồng bộ lên Website thành công!</span>
            </div>
            <p className="text-xs text-emerald-700 leading-relaxed font-medium">
              {syncResult.message}
            </p>
            {syncResult.product_url && (
              <div className="pt-2 flex items-center gap-2">
                <a
                  href={syncResult.product_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Xem sản phẩm trên Website</span>
                </a>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-300"
                >
                  Đóng
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 my-4">
            {/* LỰA CHỌN PHƯƠNG THỨC ĐỒNG BỘ */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Chọn phương thức đồng bộ:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* TÙY CHỌN 1: GHÉP VÀO SẢN PHẨM CÓ SẴN */}
                <div
                  onClick={() => setSyncMode('existing')}
                  className={`p-3.5 rounded-xl border cursor-pointer select-none transition-all flex items-start gap-2.5 ${
                    syncMode === 'existing'
                      ? 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-500/20 shadow-2xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="syncMode"
                    checked={syncMode === 'existing'}
                    onChange={() => setSyncMode('existing')}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 mt-0.5 cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-600" />
                      <span>Ghép vào Sản phẩm có sẵn</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                      Thêm hoặc cập nhật ngày khởi hành này vào Sản phẩm Tour lớn trên website.
                    </p>
                  </div>
                </div>

                {/* TÙY CHỌN 2: TẠO SẢN PHẨM MỚI */}
                <div
                  onClick={() => {
                    setSyncMode('new');
                    setSelectedProductId(null);
                  }}
                  className={`p-3.5 rounded-xl border cursor-pointer select-none transition-all flex items-start gap-2.5 ${
                    syncMode === 'new'
                      ? 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-500/20 shadow-2xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="syncMode"
                    checked={syncMode === 'new'}
                    onChange={() => {
                      setSyncMode('new');
                      setSelectedProductId(null);
                    }}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 mt-0.5 cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                      <Plus className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Tạo Sản phẩm mới trên Web</span>
                      {tour?.code && (
                        <span className="font-mono text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded font-bold">
                          SKU: {extractSkuPrefix(tour.code)}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                      Đăng một Sản phẩm Tour hoàn toàn mới lên website và đưa đợt này vào làm ngày khởi hành đầu tiên.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* NẾU CHỌN GHÉP VÀO SẢN PHẨM CÓ SẴN */}
            {syncMode === 'existing' && (
              <div className="space-y-3 pt-1">
                {/* Ô tìm kiếm sản phẩm website */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          fetchProducts(searchQuery);
                        }
                      }}
                      placeholder="Gõ tên sản phẩm tour trên website rồi bấm Tìm kiếm..."
                      className="w-full h-10 pl-9 pr-3.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => fetchProducts(searchQuery)}
                    disabled={isLoadingProducts}
                    className="px-3.5 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingProducts ? 'animate-spin' : ''}`} />
                    <span>Tìm</span>
                  </button>
                </div>

                {/* Danh sách Sản phẩm WooCommerce */}
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {isLoadingProducts ? (
                    <div className="p-8 text-center text-xs text-slate-500 space-y-2">
                      <RefreshCw className="w-5 h-5 text-blue-600 animate-spin mx-auto" />
                      <p>Đang tìm kiếm sản phẩm trên website yourcompany.com...</p>
                    </div>
                  ) : products.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-2">
                      <AlertCircle className="w-5 h-5 text-slate-400 mx-auto" />
                      <p>Không tìm thấy sản phẩm nào khớp với từ khóa "{searchQuery}".</p>
                      <button
                        type="button"
                        onClick={() => setSyncMode('new')}
                        className="text-blue-600 font-bold hover:underline"
                      >
                        + Bấm vào đây để tạo Sản phẩm mới trên Web
                      </button>
                    </div>
                  ) : (
                    products.map((p) => {
                      const isSelected = selectedProductId === p.id;
                      const hasCurrentCode = p.departures.some(d => d.trim().toUpperCase() === tour.code.trim().toUpperCase());

                      return (
                        <div
                          key={p.id}
                          onClick={() => setSelectedProductId(p.id)}
                          className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500/30 shadow-2xs'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <input
                              type="radio"
                              name="selectedWpProduct"
                              checked={isSelected}
                              onChange={() => setSelectedProductId(p.id)}
                              className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                            />
                            <div className="space-y-0.5 min-w-0">
                              <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                                <span className="truncate">{p.name}</span>
                                <span className="text-[10px] font-mono text-slate-500 shrink-0">
                                  (ID: #{p.id})
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-slate-500 flex-wrap">
                                {p.sku && <span className="font-mono text-indigo-700 bg-indigo-50 px-1 rounded font-bold">SKU: {p.sku}</span>}
                                <span>Giá web: <strong>{p.price ? Number(p.price).toLocaleString('vi-VN') + ' đ' : 'Chưa có giá'}</strong></span>
                                <span>•</span>
                                <span className="text-blue-700 font-bold">
                                  {p.departures_count} ngày khởi hành đang có
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-2">
                            {hasCurrentCode ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200">
                                <RefreshCw className="w-2.5 h-2.5 text-amber-600" />
                                <span>Đã có mã lịch (Sẽ cập nhật)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
                                <Plus className="w-2.5 h-2.5 text-emerald-600" />
                                <span>Chưa có (Sẽ thêm mới dòng)</span>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Hộp tóm tắt hành động */}
                {selectedProduct && (
                  <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5 leading-relaxed">
                      <div>
                        Đã chọn Sản phẩm: <strong>{selectedProduct.name}</strong> (ID: #{selectedProduct.id})
                      </div>
                      <div className="text-[11px] text-blue-800">
                        {departureStatusOnSelectedProduct === 'update' ? (
                          <span>
                            ➔ Mã lịch <strong>{tour.code}</strong> đã có sẵn trong bảng lịch trình. Hệ thống sẽ <strong>CẬP NHẬT</strong> lại giá vé, chỗ trống và ngày đi mới nhất.
                          </span>
                        ) : (
                          <span>
                            ➔ Mã lịch <strong>{tour.code}</strong> chưa có trong bảng lịch trình. Hệ thống sẽ <strong>TỰ ĐỘNG THÊM MỚI 1 HÀNG</strong> ngày khởi hành vào sản phẩm này.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* NẾU CHỌN TẠO SẢN PHẨM MỚI */}
            {syncMode === 'new' && (
              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-amber-950">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Tạo Sản phẩm mới trên Website</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                  Hệ thống sẽ tạo 1 Sản phẩm Tour mới trên website WordPress có tên là <strong>"{tour.name}"</strong> và đưa ngày khởi hành <strong>[{tour.code}]</strong> vào làm hàng lịch trình đầu tiên.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer Buttons */}
        {!syncResult?.success && (
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-300 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleExecuteSync}
              disabled={isSyncing || (syncMode === 'existing' && !selectedProductId)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <Check className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Đang đồng bộ...' : 'Xác nhận Đồng bộ sang Website'}</span>
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
export default SyncTourToWooCommerceModal;
