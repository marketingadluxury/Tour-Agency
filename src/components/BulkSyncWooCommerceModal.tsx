import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Globe, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  ExternalLink, 
  X, 
  Check, 
  Calendar, 
  DollarSign, 
  AlertCircle,
  Sparkles,
  Link2,
  Plus,
  Play,
  RotateCcw,
  Tag,
  ChevronDown,
  ChevronRight,
  Plane,
  Layers,
  StopCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Tour } from '../types';
import { 
  extractSkuPrefix, 
  normalizeSku, 
  groupToursByParentProduct, 
  ParentTourGroup 
} from '../utils/skuUtils';

export interface WordPressProduct {
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

export interface GroupSyncSetting {
  mode: 'existing' | 'new';
  targetProductId: number | null;
  matchedType: 'linked' | 'sku_matched' | 'departure_matched' | 'auto_matched' | 'manual' | 'new';
  matchedProductName?: string;
  matchedProductSku?: string;
  productUrl?: string;
  sku: string;
}

export interface SyncProgressItem {
  groupId: string;
  sku: string;
  tourName: string;
  departuresCount: number;
  status: 'pending' | 'running' | 'success' | 'failed';
  action?: 'created' | 'updated';
  productId?: number;
  productName?: string;
  productUrl?: string;
  message?: string;
}

interface BulkSyncWooCommerceModalProps {
  isOpen: boolean;
  onClose: () => void;
  tours: Tour[];
  onSyncComplete?: () => void;
}

export const BulkSyncWooCommerceModal: React.FC<BulkSyncWooCommerceModalProps> = ({
  isOpen,
  onClose,
  tours,
  onSyncComplete
}) => {
  // Trạng thái màn hình: 'selection' (chọn & ghép nối) | 'progress' (đang chạy & xem kết quả)
  const [currentView, setCurrentView] = useState<'selection' | 'progress'>('selection');

  // Danh sách sản phẩm WooCommerce từ server
  const [wpProducts, setWpProducts] = useState<WordPressProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Bộ lọc & Tìm kiếm Tour Mẹ
  const [searchTourQuery, setSearchTourQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'sku_matched' | 'linked' | 'auto_matched' | 'new'>('all');

  // Danh sách nhóm tour được tích chọn (groupId Set)
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());

  // Danh sách nhóm tour đang được mở rộng accordion để xem các đợt con
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());

  // Cấu hình ghép nối cho từng nhóm tour Mẹ (groupId -> GroupSyncSetting)
  const [syncSettings, setSyncSettings] = useState<Record<string, GroupSyncSetting>>({});

  // Tùy chọn đồng bộ nâng cao
  const [updatePrices, setUpdatePrices] = useState(true);
  const [updateDepartures, setUpdateDepartures] = useState(true);

  // State mở popover đổi sản phẩm cho 1 nhóm cụ thể
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [productSearchKeyword, setProductSearchKeyword] = useState('');

  // Tiến trình đồng bộ
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgressList, setSyncProgressList] = useState<SyncProgressItem[]>([]);
  const [currentSyncIndex, setCurrentSyncIndex] = useState(0);
  const abortSyncRef = useRef(false);

  // Chuẩn hóa chuỗi tìm kiếm tiếng Việt
  const normalizeText = (text: string) => {
    return (text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .trim();
  };

  // Gom nhóm danh sách Tour CRM thành các Sản Phẩm Tour Mẹ theo SKU Web hoặc Tuyến Tour
  const parentTourGroups: ParentTourGroup<Tour>[] = useMemo(() => {
    return groupToursByParentProduct<Tour>(tours);
  }, [tours]);

  // Nạp danh sách sản phẩm WooCommerce khi mở Modal
  const loadWooCommerceProducts = async () => {
    try {
      setIsLoadingProducts(true);
      const res = await fetch('/api/woocommerce/products?per_page=100');
      const data = await res.json();
      if (data.success && Array.isArray(data.products)) {
        setWpProducts(data.products);
        autoMatchParentGroups(parentTourGroups, data.products);
      } else {
        const errorMsg = data.message || 'Không thể tải danh sách sản phẩm từ Website WordPress. Vui lòng kiểm tra lại cấu hình kết nối.';
        toast.error(errorMsg);
      }
    } catch (err: any) {
      console.error('Lỗi nạp sản phẩm WooCommerce:', err);
      toast.error(err?.message || 'Lỗi kết nối máy chủ WooCommerce.');
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // Thuật toán tự động ghép nối Sản Phẩm Mẹ sang WooCommerce theo Quy Tắc 4 Tầng
  const autoMatchParentGroups = (groups: ParentTourGroup<Tour>[], productsList: WordPressProduct[]) => {
    const newSettings: Record<string, GroupSyncSetting> = {};
    const defaultSelected = new Set<string>();

    groups.forEach(group => {
      // Mặc định chọn tất cả các nhóm tour có ít nhất 1 đợt không bị hủy
      const hasActive = group.departures.some(d => d.status !== 'cancelled');
      if (hasActive) {
        defaultSelected.add(group.groupId);
      }

      const explicitSku = (group.sku || '').trim();
      const normalizedGroupSku = normalizeSku(explicitSku);
      const normalizedGroupName = normalizeText(group.name);

      // TẦNG 1: Sản phẩm đã có liên kết từ trước (wpProductId của nhóm)
      if (group.wpProductId) {
        const linkedProduct = productsList.find(p => p.id === Number(group.wpProductId));
        if (linkedProduct) {
          newSettings[group.groupId] = {
            mode: 'existing',
            targetProductId: linkedProduct.id,
            matchedType: 'linked',
            matchedProductName: linkedProduct.name,
            matchedProductSku: linkedProduct.sku,
            productUrl: linkedProduct.permalink,
            sku: explicitSku || linkedProduct.sku
          };
          return;
        }
      }

      // TẦNG 2: Khớp theo Mã SKU Sản phẩm Web (OBAU-SYDMEL-JQ) hoặc tiền tố SKU
      if (normalizedGroupSku) {
        const matchedBySku = productsList.find(p => {
          if (!p.sku) return false;
          const pSkuNorm = normalizeSku(p.sku);
          return (
            pSkuNorm === normalizedGroupSku ||
            normalizedGroupSku === normalizeSku(extractSkuPrefix(p.sku))
          );
        });

        if (matchedBySku) {
          newSettings[group.groupId] = {
            mode: 'existing',
            targetProductId: matchedBySku.id,
            matchedType: 'sku_matched',
            matchedProductName: matchedBySku.name,
            matchedProductSku: matchedBySku.sku,
            productUrl: matchedBySku.permalink,
            sku: explicitSku || matchedBySku.sku
          };
          return;
        }
      }

      // TẦNG 3: Mã của bất kỳ đợt khởi hành nào đã có trong danh sách ACF departures
      const matchedByDeparture = productsList.find(p => {
        if (!Array.isArray(p.departures) || p.departures.length === 0) return false;
        return group.departures.some(dep => {
          const depCodeNorm = normalizeSku(dep.code);
          return p.departures.some(d => normalizeSku(d) === depCodeNorm);
        });
      });

      if (matchedByDeparture) {
        newSettings[group.groupId] = {
          mode: 'existing',
          targetProductId: matchedByDeparture.id,
          matchedType: 'departure_matched',
          matchedProductName: matchedByDeparture.name,
          matchedProductSku: matchedByDeparture.sku,
          productUrl: matchedByDeparture.permalink,
          sku: explicitSku || matchedByDeparture.sku
        };
        return;
      }

      // TẦNG 4: So khớp theo tên chương trình tour tương đồng
      if (normalizedGroupName) {
        let matchedByName = productsList.find(p => normalizeText(p.name) === normalizedGroupName);
        if (!matchedByName) {
          matchedByName = productsList.find(p => {
            const pNorm = normalizeText(p.name);
            return pNorm.includes(normalizedGroupName) || normalizedGroupName.includes(pNorm);
          });
        }

        if (matchedByName) {
          newSettings[group.groupId] = {
            mode: 'existing',
            targetProductId: matchedByName.id,
            matchedType: 'auto_matched',
            matchedProductName: matchedByName.name,
            matchedProductSku: matchedByName.sku,
            productUrl: matchedByName.permalink,
            sku: explicitSku || matchedByName.sku
          };
          return;
        }
      }

      // MẶC ĐỊNH: Chưa có SKU Web - Gợi ý tạo mới sản phẩm WooCommerce cha
      newSettings[group.groupId] = {
        mode: 'new',
        targetProductId: null,
        matchedType: 'new',
        sku: explicitSku
      };
    });

    setSyncSettings(newSettings);
    setSelectedGroupIds(defaultSelected);
  };

  useEffect(() => {
    if (isOpen) {
      setCurrentView('selection');
      setIsSyncing(false);
      setEditingGroupId(null);
      setProductSearchKeyword('');
      setExpandedGroupIds(new Set());
      loadWooCommerceProducts();
    }
  }, [isOpen, parentTourGroups]);

  // Lọc danh sách nhóm tour Mẹ hiển thị
  const filteredGroups = useMemo(() => {
    return parentTourGroups.filter(group => {
      // Tìm kiếm theo tên tour mẹ, SKU, điểm đến hoặc mã đợt khởi hành con
      if (searchTourQuery.trim()) {
        const query = normalizeText(searchTourQuery);
        const nameMatch = normalizeText(group.name).includes(query);
        const skuMatch = normalizeText(group.sku).includes(query);
        const destMatch = normalizeText(group.destination || '').includes(query);
        const departureMatch = group.departures.some(d => normalizeText(d.code).includes(query));
        if (!nameMatch && !skuMatch && !destMatch && !departureMatch) return false;
      }

      // Lọc theo trạng thái ghép nối
      const setting = syncSettings[group.groupId];
      if (statusFilter === 'sku_matched') {
        return setting?.matchedType === 'sku_matched';
      }
      if (statusFilter === 'linked') {
        return setting?.matchedType === 'linked';
      }
      if (statusFilter === 'auto_matched') {
        return setting?.matchedType === 'auto_matched' || setting?.matchedType === 'departure_matched';
      }
      if (statusFilter === 'new') {
        return setting?.matchedType === 'new';
      }

      return true;
    });
  }, [parentTourGroups, searchTourQuery, statusFilter, syncSettings]);

  // Thống kê số lượng theo từng tầng so khớp
  const stats = useMemo(() => {
    const selectedCount = selectedGroupIds.size;
    let totalSelectedDepartures = 0;
    let skuMatchedCount = 0;
    let linkedCount = 0;
    let autoMatchedCount = 0;
    let newCount = 0;

    parentTourGroups.forEach(g => {
      if (selectedGroupIds.has(g.groupId)) {
        totalSelectedDepartures += g.departures.length;
        const s = syncSettings[g.groupId];
        if (!s || s.matchedType === 'new') {
          newCount++;
        } else if (s.matchedType === 'sku_matched') {
          skuMatchedCount++;
        } else if (s.matchedType === 'linked') {
          linkedCount++;
        } else {
          autoMatchedCount++;
        }
      }
    });

    return { 
      selectedCount, 
      totalSelectedDepartures,
      skuMatchedCount, 
      linkedCount, 
      autoMatchedCount, 
      newCount 
    };
  }, [selectedGroupIds, syncSettings, parentTourGroups]);

  // Chọn / Bỏ chọn 1 nhóm
  const toggleSelectGroup = (groupId: string) => {
    setSelectedGroupIds(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  // Mở rộng / Thu gọn xem các đợt con của 1 nhóm
  const toggleExpandGroup = (groupId: string) => {
    setExpandedGroupIds(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  // Chọn tất cả các nhóm đang hiển thị
  const handleSelectAllFiltered = () => {
    setSelectedGroupIds(prev => {
      const next = new Set(prev);
      filteredGroups.forEach(g => next.add(g.groupId));
      return next;
    });
  };

  // Bỏ chọn tất cả các nhóm đang hiển thị
  const handleDeselectAllFiltered = () => {
    setSelectedGroupIds(prev => {
      const next = new Set(prev);
      filteredGroups.forEach(g => next.delete(g.groupId));
      return next;
    });
  };

  // Cập nhật ghép nối sản phẩm cho 1 nhóm tour
  const handleSelectProductForGroup = (groupId: string, product: WordPressProduct | 'new') => {
    const group = parentTourGroups.find(g => g.groupId === groupId);
    const sku = group?.sku || '';

    setSyncSettings(prev => {
      if (product === 'new') {
        return {
          ...prev,
          [groupId]: {
            mode: 'new',
            targetProductId: null,
            matchedType: 'new',
            sku
          }
        };
      }
      return {
        ...prev,
        [groupId]: {
          mode: 'existing',
          targetProductId: product.id,
          matchedType: 'manual',
          matchedProductName: product.name,
          matchedProductSku: product.sku,
          productUrl: product.permalink,
          sku: sku || product.sku
        }
      };
    });
    setEditingGroupId(null);
  };

  // Danh sách sản phẩm WordPress được lọc trong popover đổi liên kết
  const filteredWpProductsForSelector = useMemo(() => {
    if (!productSearchKeyword.trim()) return wpProducts.slice(0, 30);
    const kw = normalizeText(productSearchKeyword);
    return wpProducts.filter(p => 
      normalizeText(p.name).includes(kw) || 
      String(p.id).includes(kw) ||
      normalizeText(p.sku || '').includes(kw)
    ).slice(0, 30);
  }, [wpProducts, productSearchKeyword]);

  // Thực hiện đồng bộ hàng loạt theo từng Nhóm Tour Mẹ
  const handleStartBulkSync = async () => {
    const groupsToSync = parentTourGroups.filter(g => selectedGroupIds.has(g.groupId));
    if (groupsToSync.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 chương trình tour để đồng bộ.');
      return;
    }

    // Chuẩn bị danh sách tiến trình theo Sản Phẩm Tour Mẹ
    const initialProgress: SyncProgressItem[] = groupsToSync.map(g => {
      const s = syncSettings[g.groupId];
      return {
        groupId: g.groupId,
        sku: g.sku,
        tourName: g.name,
        departuresCount: g.departures.length,
        status: 'pending',
        productId: s?.targetProductId || undefined,
        productName: s?.matchedProductName,
        productUrl: s?.productUrl
      };
    });

    setSyncProgressList(initialProgress);
    setCurrentView('progress');
    setIsSyncing(true);
    setCurrentSyncIndex(0);
    abortSyncRef.current = false;

    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < groupsToSync.length; i++) {
      if (abortSyncRef.current) {
        toast('Đã dừng tiến trình đồng bộ theo yêu cầu.', { icon: '⚠️' });
        break;
      }

      const currentGroup = groupsToSync[i];
      const setting = syncSettings[currentGroup.groupId] || { 
        mode: 'new', 
        targetProductId: null, 
        matchedType: 'new', 
        sku: currentGroup.sku 
      };

      setCurrentSyncIndex(i);

      // Cập nhật trạng thái đang chạy
      setSyncProgressList(prev => prev.map((item, idx) => 
        idx === i ? { ...item, status: 'running' } : item
      ));

      try {
        // Gửi mảng chính xác group_tour_ids để backend cập nhật toàn bộ các đợt vào 1 sản phẩm WooCommerce
        const payload: any = {
          target_product_id: setting.mode === 'existing' && setting.targetProductId ? setting.targetProductId : 'new',
          force_new: setting.mode === 'new',
          update_prices: updatePrices,
          update_departures: updateDepartures,
          group_tour_ids: currentGroup.departures.map(d => d.id)
        };

        const res = await fetch(`/api/woocommerce/sync-tour/${currentGroup.primaryTour.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (res.ok && data.success) {
          successCount++;
          setSyncProgressList(prev => prev.map((item, idx) => 
            idx === i ? {
              ...item,
              status: 'success',
              action: data.action,
              productId: data.product_id,
              productName: data.product_name,
              productUrl: data.product_url,
              message: data.message || `Đã cập nhật ${currentGroup.departures.length} đợt vào SP #${data.product_id}`
            } : item
          ));
        } else {
          failedCount++;
          setSyncProgressList(prev => prev.map((item, idx) => 
            idx === i ? {
              ...item,
              status: 'failed',
              message: data.message || 'Lỗi không xác định khi đồng bộ tour'
            } : item
          ));
        }
      } catch (err: any) {
        failedCount++;
        setSyncProgressList(prev => prev.map((item, idx) => 
          idx === i ? {
            ...item,
            status: 'failed',
            message: err.message || 'Lỗi kết nối khi gửi dữ liệu'
          } : item
        ));
      }

      // Giãn cách nhẹ 200ms giữa các request để giảm tải máy chủ WordPress
      await new Promise(r => setTimeout(r, 200));
    }

    setIsSyncing(false);

    if (successCount > 0) {
      toast.success(`Đồng bộ thành công ${successCount}/${groupsToSync.length} chương trình tour lên Website!`);
      if (onSyncComplete) {
        onSyncComplete();
      }
    }
    if (failedCount > 0) {
      toast.error(`Có ${failedCount} tour đồng bộ thất bại, vui lòng kiểm tra chi tiết lỗi bên dưới.`);
    }
  };

  // Dừng tiến trình đồng bộ
  const handleStopSync = () => {
    abortSyncRef.current = true;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={() => setEditingGroupId(null)}
      >
        {/* MODAL HEADER */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 shadow-2xs">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">
                  Đồng Bộ Chương Trình Tour Sang Website (WooCommerce & ACF)
                </h3>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {parentTourGroups.length} Sản phẩm Web • {tours.length} Đợt khởi hành
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Tự động gom nhóm các ngày khởi hành có cùng Mã SKU Web vào 1 sản phẩm WooCommerce cha, cập nhật đợt vào ACF và cộng dồn chỗ trống khả dụng.
              </p>
            </div>
          </div>
          
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL CONTENT */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {currentView === 'selection' ? (
            /* MÀN HÌNH 1: CHỌN SẢN PHẨM MẸ & XEM GHÉP NỐI */
            <div className="space-y-4">
              {/* THANH CÔNG CỤ & THỐNG KÊ */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
                {/* 4 Thẻ Thống kê So khớp */}
                <div className="md:col-span-7 flex flex-wrap items-center gap-2">
                  <div className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-700 flex items-center gap-1.5 shadow-2xs">
                    <Layers className="w-3.5 h-3.5 text-slate-500" />
                    <span>Đã chọn:</span>
                    <strong className="text-indigo-700 font-bold">{stats.selectedCount} tour mẹ</strong>
                    <span className="text-slate-400">({stats.totalSelectedDepartures} đợt)</span>
                  </div>

                  <div className="px-2.5 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-xs font-medium text-indigo-900 flex items-center gap-1.5 shadow-2xs">
                    <Tag className="w-3.5 h-3.5 text-indigo-700" />
                    <span>Khớp SKU Web:</span>
                    <strong className="font-bold">{stats.skuMatchedCount}</strong>
                  </div>

                  <div className="px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 flex items-center gap-1.5 shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Đã liên kết:</span>
                    <strong className="font-bold">{stats.linkedCount}</strong>
                  </div>

                  <div className="px-2.5 py-1.5 rounded-lg bg-purple-50 border border-purple-200 text-xs font-medium text-purple-800 flex items-center gap-1.5 shadow-2xs">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>Khớp tên:</span>
                    <strong className="font-bold">{stats.autoMatchedCount}</strong>
                  </div>

                  <div className="px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs font-medium text-amber-800 flex items-center gap-1.5 shadow-2xs">
                    <Plus className="w-3.5 h-3.5 text-amber-600" />
                    <span>Chưa có SKU:</span>
                    <strong className="font-bold">{stats.newCount}</strong>
                  </div>
                </div>

                {/* 2 Tùy chọn checkbox đồng bộ */}
                <div className="md:col-span-5 flex flex-wrap items-center justify-end gap-2 text-xs text-slate-700">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs hover:border-slate-300">
                    <input 
                      type="checkbox" 
                      checked={updatePrices} 
                      onChange={(e) => setUpdatePrices(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                    <span>Cập nhật bảng giá & giá sàn</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer select-none bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs hover:border-slate-300">
                    <input 
                      type="checkbox" 
                      checked={updateDepartures} 
                      onChange={(e) => setUpdateDepartures(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Cập nhật ACF Repeater</span>
                  </label>
                </div>
              </div>

              {/* BỘ LỌC VÀ TÌM KIẾM TOUR MẸ */}
              <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTourQuery}
                    onChange={(e) => setSearchTourQuery(e.target.value)}
                    placeholder="Tìm theo SKU Web, tên tour, điểm đến, mã đợt khởi hành..."
                    className="w-full pl-9 pr-8 h-10 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                  />
                  {searchTourQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchTourQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-xl border transition-all ${
                      statusFilter === 'all'
                        ? 'bg-slate-800 text-white border-slate-800 shadow-sm font-bold'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    Tất cả ({parentTourGroups.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('sku_matched')}
                    className={`px-3 py-1.5 rounded-xl border transition-all ${
                      statusFilter === 'sku_matched'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm font-bold'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    Khớp SKU ({stats.skuMatchedCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('linked')}
                    className={`px-3 py-1.5 rounded-xl border transition-all ${
                      statusFilter === 'linked'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm font-bold'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    Đã liên kết ({stats.linkedCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('auto_matched')}
                    className={`px-3 py-1.5 rounded-xl border transition-all ${
                      statusFilter === 'auto_matched'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm font-bold'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    Khớp tên ({stats.autoMatchedCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('new')}
                    className={`px-3 py-1.5 rounded-xl border transition-all ${
                      statusFilter === 'new'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm font-bold'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    Chưa có SKU ({stats.newCount})
                  </button>

                  <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />

                  {/* Nút chọn nhanh */}
                  <button
                    type="button"
                    onClick={handleSelectAllFiltered}
                    className="px-2.5 py-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg font-bold transition-colors cursor-pointer"
                  >
                    Chọn trang này
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAllFiltered}
                    className="px-2.5 py-1.5 text-slate-500 hover:bg-slate-100 rounded-lg font-medium transition-colors cursor-pointer"
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>

              {/* BẢNG DANH SÁCH SẢN PHẨM TOUR MẸ VÀ CÁC ĐỢT KHỞI HÀNH CON */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <div className="overflow-x-auto max-h-[52vh]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-20 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="p-3 w-10 text-center">
                          <input 
                            type="checkbox"
                            checked={filteredGroups.length > 0 && filteredGroups.every(g => selectedGroupIds.has(g.groupId))}
                            onChange={(e) => {
                              if (e.target.checked) handleSelectAllFiltered();
                              else handleDeselectAllFiltered();
                            }}
                            className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                          />
                        </th>
                        <th className="p-3 min-w-[280px]">Sản Phẩm Tour Website (Chương Trình Mẹ)</th>
                        <th className="p-3 w-32">Giá Sàn ("Chỉ từ")</th>
                        <th className="p-3 w-36">Tổng Chỗ Khả Dụng</th>
                        <th className="p-3 min-w-[320px]">Sản Phẩm Website Khớp Nối</th>
                        <th className="p-3 w-28 text-center">Hành Động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredGroups.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-12 text-slate-400">
                            Không tìm thấy chương trình tour nào phù hợp với bộ lọc.
                          </td>
                        </tr>
                      ) : (
                        filteredGroups.map(group => {
                          const isSelected = selectedGroupIds.has(group.groupId);
                          const isExpanded = expandedGroupIds.has(group.groupId);
                          const setting = syncSettings[group.groupId] || { 
                            mode: 'new', 
                            targetProductId: null, 
                            matchedType: 'new', 
                            sku: group.sku 
                          };
                          const isEditing = editingGroupId === group.groupId;

                          return (
                            <React.Fragment key={group.groupId}>
                              {/* DÒNG SẢN PHẨM MẸ */}
                              <tr 
                                className={`transition-colors hover:bg-slate-50/90 ${isSelected ? 'bg-indigo-50/30' : ''}`}
                              >
                                {/* Checkbox chọn nhóm */}
                                <td className="p-3 text-center align-top">
                                  <input 
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSelectGroup(group.groupId)}
                                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer mt-1"
                                  />
                                </td>

                                {/* Thông tin Chương Trình Tour Mẹ & SKU Web */}
                                <td className="p-3 align-top">
                                  <div className="space-y-1.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-mono font-black text-xs text-indigo-900 bg-indigo-100/80 border border-indigo-200 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                                        <Tag className="w-3 h-3 text-indigo-600" />
                                        <span>SKU: {group.sku}</span>
                                      </span>
                                      <span className="font-black text-slate-900 text-xs">
                                        {group.name}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                                      {group.destination && <span className="font-semibold text-slate-700">Điểm đến: {group.destination}</span>}
                                      {group.duration && <span>• {group.duration}</span>}
                                      {group.airline && <span>• {group.airline}</span>}
                                      {group.hotel && <span>• {group.hotel}</span>}
                                    </div>

                                    {/* Nút Toggle mở rộng xem các đợt khởi hành con */}
                                    <div className="pt-0.5">
                                      <button
                                        type="button"
                                        onClick={() => toggleExpandGroup(group.groupId)}
                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200/60 transition-colors cursor-pointer"
                                      >
                                        {isExpanded ? (
                                          <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
                                        ) : (
                                          <ChevronRight className="w-3.5 h-3.5 text-indigo-600" />
                                        )}
                                        <span>{group.departures.length} đợt khởi hành đi kèm</span>
                                        <span className="text-[10px] text-indigo-500 font-normal">
                                          ({isExpanded ? 'Bấm để thu gọn' : 'Bấm xem chi tiết'})
                                        </span>
                                      </button>
                                    </div>
                                  </div>
                                </td>

                                {/* Giá sàn ("Chỉ từ...") */}
                                <td className="p-3 align-top font-medium text-slate-700">
                                  {group.minPrice > 0 ? (
                                    <div>
                                      <span className="text-[10px] text-slate-400 block font-normal">Chỉ từ:</span>
                                      <span className="text-amber-700 font-black text-xs">
                                        {group.minPrice.toLocaleString('vi-VN')} đ
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 text-xs">Chưa có giá</span>
                                  )}
                                </td>

                                {/* Tổng chỗ khả dụng cộng dồn */}
                                <td className="p-3 align-top text-slate-700">
                                  <div className="space-y-0.5">
                                    <div className="font-bold text-xs text-emerald-800">
                                      Còn {group.availableSeats} chỗ
                                    </div>
                                    <div className="text-[11px] text-slate-400">
                                      Tổng mở: {group.totalSeats} chỗ
                                    </div>
                                  </div>
                                </td>

                                {/* Ghép nối Sản Phẩm Website */}
                                <td className="p-3 align-top relative">
                                  <div className="space-y-1.5">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {setting.matchedType === 'sku_matched' && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-200 shadow-2xs">
                                          <Tag className="w-3 h-3 text-indigo-700" />
                                          <span>Khớp SKU [{setting.matchedProductSku || group.sku}] #{setting.targetProductId}</span>
                                        </span>
                                      )}

                                      {setting.matchedType === 'linked' && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
                                          <Link2 className="w-3 h-3 text-emerald-600" />
                                          <span>Đã liên kết #{setting.targetProductId}</span>
                                        </span>
                                      )}

                                      {setting.matchedType === 'departure_matched' && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200 shadow-2xs">
                                          <Check className="w-3 h-3 text-purple-600" />
                                          <span>Đã có trong ACF #{setting.targetProductId}</span>
                                        </span>
                                      )}

                                      {setting.matchedType === 'auto_matched' && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-200 shadow-2xs">
                                          <Sparkles className="w-3 h-3 text-sky-600" />
                                          <span>Khớp tên #{setting.targetProductId}</span>
                                        </span>
                                      )}

                                      {setting.matchedType === 'manual' && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200 shadow-2xs">
                                          <Check className="w-3 h-3 text-blue-600" />
                                          <span>Đã chọn #{setting.targetProductId}</span>
                                        </span>
                                      )}

                                      {setting.matchedType === 'new' && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs">
                                          <AlertCircle className="w-3 h-3 text-amber-600" />
                                          <span>Chưa có SKU Web (Sẽ tạo SKU: {group.sku})</span>
                                        </span>
                                      )}

                                      {setting.matchedProductName && (
                                        <span className="text-slate-600 text-xs truncate max-w-[200px]" title={setting.matchedProductName}>
                                          {setting.matchedProductName}
                                        </span>
                                      )}
                                    </div>

                                    {/* Nhãn hành động rõ ràng theo yêu cầu */}
                                    <div className="text-[11px] font-semibold">
                                      {setting.mode === 'existing' ? (
                                        <span className="text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 inline-block">
                                          ↳ Đẩy/cập nhật {group.departures.length} đợt vào bảng ACF Repeater của sản phẩm #{setting.targetProductId} & cộng dồn chỗ trống
                                        </span>
                                      ) : (
                                        <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 inline-block">
                                          ↳ Tạo mới sản phẩm trên Web với SKU: [{group.sku}] & {group.departures.length} đợt khởi hành vào ACF
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* POPOVER ĐỔI SẢN PHẨM LIÊN KẾT */}
                                  {isEditing && (
                                    <div 
                                      className="absolute left-0 top-full mt-1 z-[90] w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-2.5 space-y-2 animate-in fade-in zoom-in-95 duration-150"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                                        <span className="font-bold text-slate-800 text-xs">Chọn Sản Phẩm Website Ghép Nối</span>
                                        <button 
                                          type="button" 
                                          onClick={() => setEditingGroupId(null)}
                                          className="text-slate-400 hover:text-slate-600 p-0.5"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>

                                      {/* Ô tìm kiếm sản phẩm WP */}
                                      <div className="relative">
                                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                        <input 
                                          type="text"
                                          value={productSearchKeyword}
                                          onChange={(e) => setProductSearchKeyword(e.target.value)}
                                          placeholder="Tìm tên sản phẩm, ID, SKU..."
                                          className="w-full pl-7 pr-2.5 h-8 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                                        />
                                      </div>

                                      {/* Danh sách lựa chọn */}
                                      <div className="max-h-48 overflow-y-auto space-y-1">
                                        {/* Tùy chọn 1: Tạo mới */}
                                        <button
                                          type="button"
                                          onClick={() => handleSelectProductForGroup(group.groupId, 'new')}
                                          className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                                            setting.mode === 'new' 
                                              ? 'bg-indigo-50 text-indigo-700 font-bold' 
                                              : 'hover:bg-slate-50 text-slate-700'
                                          }`}
                                        >
                                          <div className="flex items-center gap-1.5">
                                            <Plus className="w-3.5 h-3.5 text-indigo-600" />
                                            <span>✨ Tạo sản phẩm mới trên Website (SKU: {group.sku})</span>
                                          </div>
                                          {setting.mode === 'new' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                                        </button>

                                        <div className="h-px bg-slate-100 my-1" />

                                        {/* Danh sách các sản phẩm từ WordPress */}
                                        {filteredWpProductsForSelector.map(p => {
                                          const isCurrent = setting.targetProductId === p.id;
                                          return (
                                            <button
                                              key={p.id}
                                              type="button"
                                              onClick={() => handleSelectProductForGroup(group.groupId, p)}
                                              className={`w-full text-left p-2 rounded-lg text-xs transition-colors flex items-start justify-between gap-2 ${
                                                isCurrent 
                                                  ? 'bg-indigo-50 border border-indigo-200 font-bold text-indigo-900' 
                                                  : 'hover:bg-slate-50 text-slate-700'
                                              }`}
                                            >
                                              <div className="space-y-0.5 flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                  <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1 rounded">
                                                    #{p.id}
                                                  </span>
                                                  {p.sku && (
                                                    <span className="font-mono text-[10px] bg-indigo-50 text-indigo-700 px-1 rounded font-bold">
                                                      {p.sku}
                                                    </span>
                                                  )}
                                                  <span className="truncate block font-semibold text-slate-800">
                                                    {p.name}
                                                  </span>
                                                </div>
                                                <div className="text-[10px] text-slate-400">
                                                  {p.departures_count > 0 ? `${p.departures_count} đợt trong ACF` : 'Chưa có đợt ACF'} • Giá: {Number(p.regular_price || p.price || 0).toLocaleString('vi-VN')} đ
                                                </div>
                                              </div>
                                              {isCurrent && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </td>

                                {/* Nút Hành động */}
                                <td className="p-3 align-top text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingGroupId(isEditing ? null : group.groupId);
                                        setProductSearchKeyword('');
                                      }}
                                      className="px-2.5 py-1 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
                                    >
                                      Đổi
                                    </button>

                                    {setting.productUrl && (
                                      <a
                                        href={setting.productUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                                        title="Xem sản phẩm trên Website"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                      </a>
                                    )}
                                  </div>
                                </td>
                              </tr>

                              {/* BẢNG CON CHI TIẾT CÁC ĐỢT KHỞI HÀNH (KHI MỞ RỘNG ACCORDION) */}
                              {isExpanded && (
                                <tr className="bg-slate-50/70 border-b border-slate-200/80 animate-in fade-in duration-150">
                                  <td colSpan={6} className="p-3 pl-12 pr-6">
                                    <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs space-y-2">
                                      <div className="flex items-center justify-between text-xs font-bold text-slate-800 pb-1.5 border-b border-slate-100">
                                        <div className="flex items-center gap-2">
                                          <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                                          <span>Danh sách {group.departures.length} đợt khởi hành sẽ đẩy vào bảng ACF Repeater ("departures")</span>
                                        </div>
                                        <span className="text-[11px] text-slate-500 font-normal">
                                          Mỗi dòng tương ứng 1 hàng trong bảng lịch trình website
                                        </span>
                                      </div>

                                      <div className="overflow-x-auto">
                                        <table className="w-full text-left text-[11px]">
                                          <thead className="text-slate-500 font-semibold border-b border-slate-100">
                                            <tr>
                                              <th className="py-1 px-2">Mã lịch trình</th>
                                              <th className="py-1 px-2">Ngày đi - Ngày về</th>
                                              <th className="py-1 px-2">Chuyến bay đi / về</th>
                                              <th className="py-1 px-2">Chỗ mở / Còn lại</th>
                                              <th className="py-1 px-2">Giá người lớn</th>
                                              <th className="py-1 px-2">Giá trẻ em</th>
                                              <th className="py-1 px-2">Phụ thu phòng đơn</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                            {group.departures.map((dep, dIdx) => (
                                              <tr key={dep.id || dIdx} className="hover:bg-slate-50/60">
                                                <td className="py-1.5 px-2 font-mono font-bold text-indigo-900">
                                                  {dep.code}
                                                </td>
                                                <td className="py-1.5 px-2">
                                                  {dep.start_date || (dep.departure_time ? dep.departure_time.substring(0, 10) : 'N/A')}
                                                  {dep.end_date ? ` → ${dep.end_date}` : ''}
                                                </td>
                                                <td className="py-1.5 px-2 text-slate-600">
                                                  {dep.flight_out || dep.airline || '-'} / {dep.flight_in || dep.airline || '-'}
                                                </td>
                                                <td className="py-1.5 px-2">
                                                  <span className="font-bold text-emerald-700">
                                                    {dep.available_seats ?? dep.total_seats ?? 0}
                                                  </span> / {dep.total_seats || 0} chỗ
                                                </td>
                                                <td className="py-1.5 px-2 font-bold text-amber-700">
                                                  {Number(dep.price_adult || dep.price || 0).toLocaleString('vi-VN')} đ
                                                </td>
                                                <td className="py-1.5 px-2">
                                                  {dep.price_child ? `${Number(dep.price_child).toLocaleString('vi-VN')} đ` : '-'}
                                                </td>
                                                <td className="py-1.5 px-2">
                                                  {dep.single_room_surcharge ? `${Number(dep.single_room_surcharge).toLocaleString('vi-VN')} đ` : '-'}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* MÀN HÌNH 2: TIẾN TRÌNH ĐỒNG BỘ THỰC TẾ (LIVE PROGRESS VIEW) */
            <div className="space-y-4">
              {/* Progress Summary Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <RefreshCw className={`w-4 h-4 text-indigo-600 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span className="font-bold text-slate-800">
                      {isSyncing ? 'Đang thực hiện đồng bộ lên Website...' : 'Đã hoàn tất tiến trình đồng bộ'}
                    </span>
                  </div>
                  <div className="text-slate-500 font-bold">
                    {syncProgressList.filter(p => p.status === 'success').length} thành công / {syncProgressList.length} chương trình tour mẹ
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-full transition-all duration-300"
                    style={{
                      width: `${syncProgressList.length > 0 ? (currentSyncIndex / syncProgressList.length) * 100 : 0}%`
                    }}
                  />
                </div>

                {/* Nút dừng nếu đang chạy */}
                {isSyncing && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleStopSync}
                      className="inline-flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-bold cursor-pointer"
                    >
                      <StopCircle className="w-3.5 h-3.5" />
                      <span>Dừng tiến trình</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Bảng chi tiết kết quả từng Sản Phẩm Mẹ */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold text-[11px] uppercase">
                    <tr>
                      <th className="p-3 w-12 text-center">STT</th>
                      <th className="p-3 min-w-[240px]">Chương Trình Tour Mẹ</th>
                      <th className="p-3 w-32">Đợt Đi Kèm</th>
                      <th className="p-3 w-32">Trạng Thái</th>
                      <th className="p-3 min-w-[260px]">Chi Tiết Kết Quả</th>
                      <th className="p-3 w-24 text-center">Website</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {syncProgressList.map((item, idx) => (
                      <tr key={item.groupId} className="hover:bg-slate-50">
                        <td className="p-3 text-center text-slate-400 font-medium">
                          {idx + 1}
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900 line-clamp-1">{item.tourName}</div>
                          <div className="font-mono text-[11px] text-indigo-700">SKU: {item.sku}</div>
                        </td>
                        <td className="p-3 text-slate-600 font-semibold">
                          {item.departuresCount} đợt khởi hành
                        </td>
                        <td className="p-3">
                          {item.status === 'pending' && (
                            <span className="text-slate-400 text-xs flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-slate-300" /> Chờ xử lý
                            </span>
                          )}
                          {item.status === 'running' && (
                            <span className="text-indigo-600 text-xs font-bold flex items-center gap-1">
                              <RefreshCw className="w-3 h-3 animate-spin" /> Đang đồng bộ...
                            </span>
                          )}
                          {item.status === 'success' && (
                            <span className="text-emerald-700 text-xs font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Thành công
                            </span>
                          )}
                          {item.status === 'failed' && (
                            <span className="text-rose-600 text-xs font-bold flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-500" /> Thất bại
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-slate-600">
                          {item.message ? (
                            <span className={item.status === 'failed' ? 'text-rose-600' : 'text-slate-700'}>
                              {item.message}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {item.productUrl ? (
                            <a
                              href={item.productUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold transition-colors"
                            >
                              <span>Xem Web</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          {currentView === 'selection' ? (
            <>
              <div className="text-xs text-slate-500">
                <span>Đã chọn </span>
                <strong className="text-indigo-900 font-bold">{stats.selectedCount} chương trình tour mẹ</strong>
                <span> ({stats.totalSelectedDepartures} đợt khởi hành)</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                >
                  Hủy bỏ
                </button>

                <button
                  type="button"
                  onClick={handleStartBulkSync}
                  disabled={stats.selectedCount === 0 || isLoadingProducts}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-sm hover:shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Bắt đầu đồng bộ ({stats.selectedCount} Tour)</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-xs text-slate-500">
                {isSyncing ? (
                  <span>Đang thực hiện đồng bộ... Vui lòng không đóng trang.</span>
                ) : (
                  <span>Quá trình đồng bộ hàng loạt đã hoàn tất.</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {!isSyncing && (
                  <button
                    type="button"
                    onClick={() => setCurrentView('selection')}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Quay lại cấu hình</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSyncing}
                  className="px-5 py-2 text-xs font-bold text-white bg-slate-800 rounded-xl hover:bg-slate-900 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  Hoàn tất & Đóng
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkSyncWooCommerceModal;
