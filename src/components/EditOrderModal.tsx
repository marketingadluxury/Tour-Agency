import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { X, Bed, Percent, Info, RefreshCw, Lock, Copy, Coins, Plus, Trash2, Tag, Share2, Megaphone, UserCheck, Globe, FileText, Printer } from 'lucide-react';
import { Order, SurchargeItem } from '../types';
import { useCRM, canUnlockOrder, isOrderLocked } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import { CustomSelect } from './CustomSelect';
import { formatNumber, parseNumber, calculateOrderFinancials } from '@/lib/utils';
import { TourContractPrintModal } from './orders/TourContractPrintModal';

interface EditOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onSave: (orderId: string, updatedData: Partial<Order>) => void;
}

export default function EditOrderModal({
  isOpen,
  onClose,
  order,
  onSave,
}: EditOrderModalProps) {
  const { tours, currentRole, profilesList, passengers } = useCRM();
  const { profile } = useAuth();
  const [showContractModal, setShowContractModal] = useState(false);
  
  const [singleRoomCount, setSingleRoomCount] = useState(0);
  const [roomShareInfo, setRoomShareInfo] = useState('');
  const [vatOption, setVatOption] = useState(order?.vat_option || 'Không xuất VAT');
  const [vatCompanyName, setVatCompanyName] = useState(order?.vat_company_name || '');
  const [vatTaxCode, setVatTaxCode] = useState(order?.vat_tax_code || '');
  const [vatAddress, setVatAddress] = useState(order?.vat_address || '');
  const [vatEmail, setVatEmail] = useState(order?.vat_email || '');
  const [specialRequests, setSpecialRequests] = useState('');
  const [ctvInfo, setCtvInfo] = useState('');
  const [isCreatingForCTV, setIsCreatingForCTV] = useState(false);
  const [discountType, setDiscountType] = useState<'percent' | 'amount'>(order?.discount_type || 'amount');
  const [discountValueDisplay, setDiscountValueDisplay] = useState(formatNumber(order?.discount_value || 0));
  const [surcharges, setSurcharges] = useState<SurchargeItem[]>([]);
  const [priceMarkupDisplay, setPriceMarkupDisplay] = useState<string>('');
  const [markupTaxPercent, setMarkupTaxPercent] = useState<number>(25);
  const [totalPrice, setTotalPrice] = useState(0);

  // Financial mechanics: Direct vs Agent
  const [sellerType, setSellerType] = useState<'direct' | 'agent'>(order?.seller_type || 'direct');
  const [partnerId, setPartnerId] = useState<string>(order?.partner_id || '');
  const [sellingPriceDisplay, setSellingPriceDisplay] = useState<string>('');
  const [citTaxPercent, setCitTaxPercent] = useState<number>(order?.cit_tax_percent || 17);
  const [agentCommissionDisplay, setAgentCommissionDisplay] = useState<string>('');

  // Nguồn khách hàng (Quảng cáo / Khách cá nhân / Kênh social)
  const [customerSource, setCustomerSource] = useState<string>(order?.customer_source || 'Quảng cáo');

  const [isSaving, setIsSaving] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showLockConfirmModal, setShowLockConfirmModal] = useState(false);

  // Find tour for pricing references
  const tour = order ? tours.find((t) => t.id === order.tour_id) || null : null;

  // Pricing formula definitions
  const tourDiscount = tour?.discount || 0;
  const rawPriceAdult = tour ? (tour.price_adult ?? tour.price) : 0;
  const priceAdult = tour ? Math.max(0, rawPriceAdult - tourDiscount) : 0;
  const priceChild = tour ? Math.max(0, (tour.price_child ?? Math.round(rawPriceAdult * 0.8)) - (tour.price_child ? tourDiscount : Math.round(tourDiscount * 0.8))) : 0;
  const priceInfant = tour ? Math.max(0, (tour.price_infant ?? Math.round(rawPriceAdult * 0.3)) - (tour.price_infant ? tourDiscount : Math.round(tourDiscount * 0.3))) : 0;
  const singleRoomSurcharge = tour ? (tour.single_room_surcharge ?? 7500000) : 7500000;

  const adultCount = order?.adult_count ?? 1;
  const childCount = order?.child_count ?? 0;
  const infantCount = order?.infant_count ?? 0;

  const baseAdultTotal = priceAdult * adultCount;
  const baseChildTotal = priceChild * childCount;
  const baseInfantTotal = priceInfant * infantCount;
  const baseSubtotal = baseAdultTotal + baseChildTotal + baseInfantTotal;
  const surchargeTotal = singleRoomSurcharge * singleRoomCount;
  const subtotalWithSurcharge = baseSubtotal + surchargeTotal;
  
  const discountAmount = discountType === 'percent' 
    ? (subtotalWithSurcharge * parseNumber(discountValueDisplay)) / 100 
    : parseNumber(discountValueDisplay);
    
  const subtotalAfterDiscount = subtotalWithSurcharge - discountAmount;
  
  // Custom surcharges total
  const customSurchargeAmount = surcharges.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  
  // CTV Price markup & fee tax
  const priceMarkup = parseNumber(priceMarkupDisplay);
  const markupFeeAmount = Math.round((priceMarkup * markupTaxPercent) / 100);
  const netMarkupReceived = Math.max(0, priceMarkup - markupFeeAmount);

  // Thuế VAT đã bao gồm trong giá tour
  const computedTotalPrice = Math.max(0, subtotalAfterDiscount + customSurchargeAmount + priceMarkup);
  const totalBeforeVat = vatOption === 'Xuất VAT' ? Math.round(computedTotalPrice / 1.1) : computedTotalPrice;
  const vatAmount = vatOption === 'Xuất VAT' ? Math.max(0, computedTotalPrice - totalBeforeVat) : 0;

  // Commission calculations
  const baseCommissionPerSeat = tour?.commission || 0;
  const baseTotalCommission = baseCommissionPerSeat * (adultCount + childCount);
  const totalCommissionBenefit = baseTotalCommission + netMarkupReceived;
  const netCommissionReceived = Math.max(0, totalCommissionBenefit - discountAmount);
  const commissionDeducted = discountAmount > 0 ? Math.min(totalCommissionBenefit, discountAmount) : 0;

  // Format money function
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount);
  };

  const isCurrentAgent = currentRole === 'agent' || profile?.role === 'agent';
  const isActuallyCTV = isCreatingForCTV || isCurrentAgent || sellerType === 'agent' || (currentRole === 'CTV' || profile?.role === 'CTV') || Boolean(ctvInfo && ctvInfo.trim().length > 0);

  useEffect(() => {
    if (isOpen && order) {
      setSingleRoomCount(order.single_room_count || 0);
      setRoomShareInfo(order.room_share_info || '');
      setVatOption(order.vat_option || 'Không xuất VAT');
      setVatCompanyName(order.vat_company_name || '');
      setVatTaxCode(order.vat_tax_code || '');
      setVatAddress(order.vat_address || '');
      setVatEmail(order.vat_email || '');
      setSpecialRequests(order.special_requests || '');
      setCtvInfo(order.ctv_info || '');
      
      const hasCTV = Boolean(order.ctv_info && order.ctv_info.trim().length > 0) || (order.price_markup !== undefined && order.price_markup > 0);
      setIsCreatingForCTV(hasCTV);

      setDiscountType(order.discount_type || 'amount');
      setDiscountValueDisplay(formatNumber(order.discount_value || 0));

      // Surcharges list initialization
      if (order.surcharges && Array.isArray(order.surcharges) && order.surcharges.length > 0) {
        setSurcharges(order.surcharges);
      } else if (order.surcharge_amount && order.surcharge_amount > 0) {
        setSurcharges([{ id: '1', name: order.surcharge_name || 'Phụ thu khác', amount: order.surcharge_amount }]);
      } else {
        setSurcharges([]);
      }

      setPriceMarkupDisplay(formatNumber(order.price_markup || 0));
      setMarkupTaxPercent(order.markup_tax_percent ?? 25);
      setTotalPrice(order.total_price || 0);
      setCustomerSource(order.customer_source || 'Quảng cáo');

      const creatorProfile = profilesList.find(p => p.id === order.user_id || p.id === order.created_by);
      const isCreatorAgent = creatorProfile?.role === 'agent';
      const defaultSeller = order.seller_type || (isCurrentAgent || isCreatorAgent ? 'agent' : 'direct');
      setSellerType(defaultSeller);
      
      let initialPartnerId = order.partner_id || '';
      if (!initialPartnerId) {
        if (isCurrentAgent && profile?.id) {
          initialPartnerId = profile.id;
        } else if (isCreatorAgent && creatorProfile?.id) {
          initialPartnerId = creatorProfile.id;
        } else if (order.created_by) {
          const matchProfile = profilesList.find(p => (p.role === 'agent' || p.company_name) && (
            (p.full_name && order.created_by.includes(p.full_name)) ||
            (p.company_name && order.created_by.includes(p.company_name))
          ));
          if (matchProfile) initialPartnerId = matchProfile.id;
        }
      }
      setPartnerId(initialPartnerId);
      setSellingPriceDisplay(formatNumber(order.selling_price || order.total_price || 0));
      setCitTaxPercent(order.cit_tax_percent || 17);
      
      const defaultAgentComm = order.agent_commission_amount !== undefined 
        ? order.agent_commission_amount 
        : ((tour?.commission || 0) * ((order.adult_count || 1) + (order.child_count || 0)));
      setAgentCommissionDisplay(formatNumber(defaultAgentComm));

      setIsInitialLoad(true);
    }
  }, [isOpen, order]);

  // Helper functions for surcharges
  const handleAddSurcharge = () => {
    setSurcharges(prev => [...prev, { id: Date.now().toString(), name: '', amount: 0 }]);
  };

  const handleRemoveSurcharge = (id: string) => {
    setSurcharges(prev => prev.filter(s => s.id !== id));
  };

  const handleUpdateSurchargeName = (id: string, name: string) => {
    setSurcharges(prev => prev.map(s => s.id === id ? { ...s, name } : s));
  };

  const handleUpdateSurchargeAmount = (id: string, rawValStr: string) => {
    const rawVal = rawValStr.replace(/[^0-9]/g, '');
    const num = rawVal ? parseInt(rawVal, 10) : 0;
    setSurcharges(prev => prev.map(s => s.id === id ? { ...s, amount: num } : s));
  };

  // Synchronize computed price when inputs change
  useEffect(() => {
    if (!isOpen || !order) return;

    if (isInitialLoad) {
      setIsInitialLoad(false);
      return;
    }

    const isAdmin = ['admin', 'sale_leader'].includes(currentRole);
    if (!isAdmin || !isInitialLoad) {
      setTotalPrice(computedTotalPrice);
    }
  }, [singleRoomCount, vatOption, discountType, parseNumber(discountValueDisplay), surcharges, priceMarkupDisplay, markupTaxPercent, currentRole]);

  // Compute live financial breakdown based on seller mechanism
  const financials = calculateOrderFinancials({
    sellerType,
    originalPrice: computedTotalPrice,
    sellingPrice: parseNumber(sellingPriceDisplay) || computedTotalPrice,
    baseCommission: (tour?.commission || 0) * (adultCount + childCount),
    agentCommission: parseNumber(agentCommissionDisplay),
    citTaxPercent,
    vatTaxPercent: 8,
  });

  const isAgent = (currentRole as string) === 'agent' || (profile?.role as string) === 'agent';
  const isSaleRole = !isAgent && (['sale', 'sale_leader', 'admin', 'bod'].includes(currentRole as string) || ['sale', 'sale_leader', 'admin', 'bod'].includes(profile?.role || ''));
  const isCTVOrAgent = (currentRole as string) === 'CTV' || (currentRole as string) === 'agent' || (profile?.role as string) === 'CTV' || (profile?.role as string) === 'agent';
  const maxCommission = sellerType === 'agent' 
    ? (parseNumber(agentCommissionDisplay) || ((tour?.commission || 0) * (adultCount + childCount)))
    : ((tour?.commission || 0) * (adultCount + childCount));
  const isDiscountExceedingCommission = isCTVOrAgent && (discountAmount > maxCommission);

  if (!isOpen || !order) return null;

  const isOrderConfirmed = isOrderLocked(order);
  const canUnlock = canUnlockOrder(order, currentRole, profile, profilesList);
  const isPrivilegedRole = currentRole === 'admin' || (currentRole === 'sale_leader' && canUnlock);
  const canEditFinancials = isPrivilegedRole || !isOrderConfirmed;

  const handleSave = async (forceConfirm = false) => {
    if (isCTVOrAgent && discountAmount > maxCommission) {
      toast.error(`Vai trò ${currentRole === 'agent' || profile?.role === 'agent' ? 'Đại lý' : 'CTV'} không thể giảm số tiền (${formatCurrency(discountAmount)} đ) lớn hơn tiền hoa hồng (${formatCurrency(maxCommission)} đ)!`);
      return;
    }

    if (!isPrivilegedRole && !forceConfirm) {
      setShowLockConfirmModal(true);
      return;
    }

    setIsSaving(true);
    try {
      const finalTotalPrice = sellerType === 'agent' 
        ? financials.netPayableAmount 
        : Number(totalPrice);

      const surchargeNameCombined = surcharges.map(s => s.name.trim()).filter(Boolean).join(', ') || (customSurchargeAmount > 0 ? 'Phụ thu khác' : '');

      onSave(order.id, {
        single_room_count: Number(singleRoomCount),
        room_share_info: roomShareInfo.trim(),
        vat_option: vatOption,
        vat_company_name: vatCompanyName.trim(),
        vat_tax_code: vatTaxCode.trim(),
        vat_address: vatAddress.trim(),
        vat_email: vatEmail.trim(),
        special_requests: specialRequests.trim(),
        ctv_info: isActuallyCTV ? ctvInfo.trim() : '',
        discount_type: discountType,
        discount_value: parseNumber(discountValueDisplay),
        surcharges,
        surcharge_name: surchargeNameCombined,
        surcharge_amount: customSurchargeAmount,
        price_markup: isActuallyCTV ? priceMarkup : 0,
        markup_fee_amount: isActuallyCTV ? markupFeeAmount : 0,
        markup_tax_percent: isActuallyCTV ? markupTaxPercent : 25,
        total_price: finalTotalPrice,
        is_locked: true,

        seller_type: sellerType,
        partner_id: partnerId || (isCurrentAgent ? profile?.id : undefined),
        original_price: computedTotalPrice,
        selling_price: financials.sellingPrice,
        cit_tax_percent: financials.citTaxPercent,
        vat_tax_percent: 8,
        net_commission_amount: netCommissionReceived,
        net_payable_amount: financials.netPayableAmount,
        agent_commission_amount: financials.agentCommissionAmount,
        customer_source: isActuallyCTV ? 'CTV' : (customerSource || 'Quảng cáo'),
      });
      toast.success('Cập nhật thông tin booking thành công! Booking đã tự động khóa.');
      setShowLockConfirmModal(false);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Đã xảy ra lỗi khi cập nhật booking.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[95vh] border border-slate-100 font-sans">
        
        {/* Modal Header */}
        <div className="bg-slate-50 border-b border-slate-150 px-6 py-4 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-base font-black text-slate-800 flex items-center gap-1.5">
              <span>Chỉnh sửa thông tin booking</span>
              <span 
                onClick={(e) => {
                  e.stopPropagation();
                  const code = `#${order.id.substring(0, 8)}`;
                  navigator.clipboard.writeText(code);
                  toast.success(`Đã sao chép mã booking: ${code}`);
                }}
                className="hover:text-blue-600 cursor-pointer inline-flex items-center gap-1 group/copy text-blue-700 font-mono"
                title="Bấm để sao chép mã booking"
              >
                #{order.id.substring(0, 8)}
                <Copy className="w-3.5 h-3.5 text-gray-400 group-hover/copy:text-blue-600 opacity-70 group-hover/copy:opacity-100 transition-opacity" />
              </span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5 font-medium">
              Cập nhật phụ thu phòng đơn, VAT, ghi chú hoặc điều chỉnh tổng tiền
            </p>
          </div>
          <button 
            onClick={onClose} 
            disabled={isSaving}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {!canEditFinancials && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-amber-900">
              <Lock className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-amber-950">Booking đã được xác nhận hoặc bị khóa</p>
                <p className="text-amber-800 mt-0.5 leading-relaxed">
                  Các thông tin liên quan tới <strong className="font-bold">giá tiền & tài chính</strong> (Phòng đơn, VAT, Giảm giá, Phụ thu, Tổng tiền) đã được khóa tự động để tránh sai lệch doanh thu kế toán.
                  Chỉ <strong className="font-bold text-amber-950">Quản trị viên (Admin)</strong> và <strong className="font-bold text-amber-950">Sale Leader</strong> mới có quyền điều chỉnh hoặc mở khóa booking.
                </p>
              </div>
            </div>
          )}

          {/* Agent Form Options (Shown automatically when booking is for Agent) */}
          {sellerType === 'agent' && (
            <div className="bg-indigo-50/70 border border-indigo-150 rounded-xl p-3.5 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-indigo-200/60">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
                  <span className="text-xs font-extrabold text-indigo-950 uppercase tracking-wider">Thông tin Đại lý đối tác (Agent - Giá Net)</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-indigo-900 mb-1">
                      Đại lý đối tác (Agent)
                    </label>
                    {isCurrentAgent ? (
                      <div className="w-full bg-indigo-100/90 border border-indigo-200/90 rounded-lg px-2.5 py-1.5 text-xs font-bold text-indigo-950 flex items-center justify-between shadow-xs">
                        <span className="truncate">
                          {profile?.company_name ? `${profile.company_name} (${profile.full_name})` : (profile?.full_name || 'Tài khoản Đại lý của bạn')}
                        </span>
                        <span className="text-[10px] bg-indigo-600 text-white font-extrabold px-1.5 py-0.5 rounded shrink-0 ml-1">
                          Tài khoản của bạn
                        </span>
                      </div>
                    ) : (
                      <CustomSelect
                        disabled={!canEditFinancials}
                        options={[
                          { value: '', label: '-- Chọn Đại lý đối tác --' },
                          ...profilesList.filter(p => p.role === 'agent' || p.company_name).map(p => ({
                            value: p.id,
                            label: p.company_name ? `${p.company_name} (${p.full_name})` : p.full_name
                          }))
                        ]}
                        value={partnerId}
                        onChange={setPartnerId}
                        className="w-full"
                        buttonClassName="w-full bg-white border border-indigo-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-indigo-900 mb-1">
                      Hoa hồng Đại lý (VND)
                    </label>
                    <input
                      type="text"
                      disabled={!canEditFinancials}
                      value={agentCommissionDisplay}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        setAgentCommissionDisplay(raw ? formatNumber(raw) : '');
                      }}
                      placeholder="Nhập tiền hoa hồng..."
                      className="w-full bg-white border border-indigo-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="bg-white border border-indigo-200 rounded-lg p-2.5 text-xs space-y-1">
                  <div className="flex justify-between text-slate-600">
                    <span>Tổng giá niêm yết:</span>
                    <span className="font-semibold">{formatCurrency(computedTotalPrice)} đ</span>
                  </div>
                  <div className="flex justify-between text-indigo-700">
                    <span>Hoa hồng Đại lý khấu trừ:</span>
                    <span className="font-bold">-{formatCurrency(financials.agentCommissionAmount)} đ</span>
                  </div>
                  <div className="flex justify-between text-indigo-950 font-extrabold border-t border-indigo-100 pt-1 text-sm">
                    <span>Số tiền Đại lý phải chuyển cho AD (Giá Net):</span>
                    <span className="text-indigo-700 font-black">{formatCurrency(financials.netPayableAmount)} đ</span>
                  </div>
                </div>
              </div>
            )}

          {/* Surcharge & VAT Block */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                Số phòng đơn (Surcharge)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Bed className="w-4 h-4" />
                </div>
                <input
                  type="number"
                  min="0"
                  disabled={!canEditFinancials}
                  value={singleRoomCount}
                  onChange={(e) => setSingleRoomCount(Math.max(0, parseInt(e.target.value) || 0))}
                  className={`pl-9 w-full rounded-lg border px-3 py-2 text-sm font-semibold ${
                    !canEditFinancials 
                      ? 'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed' 
                      : 'border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
                  }`}
                />
              </div>
              <p className="text-[10px] text-blue-600 font-medium">
                Đơn giá phụ thu: <span className="font-bold">{formatCurrency(singleRoomSurcharge)} đ</span> / phòng
              </p>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                Hoá đơn VAT (10%)
              </label>
              <CustomSelect
                disabled={!canEditFinancials}
                options={[
                  { value: 'Không xuất VAT', label: 'Không xuất VAT' },
                  { value: 'Xuất VAT', label: 'Xuất VAT (10%)' },
                ]}
                value={vatOption}
                onChange={setVatOption}
                className="w-full"
                buttonClassName={`w-full h-9 rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${
                  !canEditFinancials
                    ? 'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed'
                    : 'border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white text-slate-800 cursor-pointer'
                }`}
              />
              {vatOption === 'Xuất VAT' && (
                <p className="text-[10px] text-emerald-600 font-medium">
                  Hệ thống sẽ tự động cộng thêm 10% thuế VAT
                </p>
              )}
            </div>
            
            {vatOption === 'Xuất VAT' && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 space-y-3 md:col-span-2">
                <h4 className="text-xs font-bold text-emerald-800 uppercase mb-2">Thông tin xuất hóa đơn</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-emerald-700 mb-1">Tên công ty <span className="text-red-500">*</span></label>
                    <input type="text" disabled={!canEditFinancials} value={vatCompanyName} onChange={e => setVatCompanyName(e.target.value)} className="w-full px-2.5 py-1.5 border border-emerald-200 rounded text-sm bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-100 disabled:cursor-not-allowed" placeholder="CÔNG TY TNHH..." required />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-emerald-700 mb-1">Mã số thuế <span className="text-red-500">*</span></label>
                    <input type="text" disabled={!canEditFinancials} value={vatTaxCode} onChange={e => setVatTaxCode(e.target.value)} className="w-full px-2.5 py-1.5 border border-emerald-200 rounded text-sm bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-100 disabled:cursor-not-allowed" placeholder="Nhập mã số thuế..." required />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-semibold text-emerald-700 mb-1">Địa chỉ xuất hóa đơn <span className="text-red-500">*</span></label>
                    <input type="text" disabled={!canEditFinancials} value={vatAddress} onChange={e => setVatAddress(e.target.value)} className="w-full px-2.5 py-1.5 border border-emerald-200 rounded text-sm bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-100 disabled:cursor-not-allowed" placeholder="Địa chỉ đăng ký kinh doanh..." required />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-semibold text-emerald-700 mb-1">Email nhận hóa đơn <span className="text-red-500">*</span></label>
                    <input type="email" disabled={!canEditFinancials} value={vatEmail} onChange={e => setVatEmail(e.target.value)} className="w-full px-2.5 py-1.5 border border-emerald-200 rounded text-sm bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-100 disabled:cursor-not-allowed" placeholder="Email nhận hóa đơn điện tử..." required />
                  </div>
                </div>
              </div>
            )}
            
            <div className="hidden">
            </div>
          </div>

          {/* Share Room Info */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Yêu cầu ghép giường / ghép phòng
            </label>
            <input
              type="text"
              value={roomShareInfo}
              onChange={(e) => setRoomShareInfo(e.target.value)}
              placeholder="Ví dụ: Ghép chung phòng với chị Hoa đoàn HN, lẻ nam/nữ..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
            />
          </div>

          {/* Special notes */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Ghi chú đặc biệt
            </label>
            <textarea
              rows={2}
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              placeholder="Yêu cầu ăn chay, dị ứng hải sản, em bé cần cũi nằm, ..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
            />
          </div>

          {/* CTV Toggle and Information Section */}
          {isSaleRole && (
            <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isCreatingForCTV}
                  disabled={!canEditFinancials}
                  onChange={e => {
                    setIsCreatingForCTV(e.target.checked);
                    if (!e.target.checked) {
                      setCtvInfo('');
                      setPriceMarkupDisplay('');
                    }
                  }}
                  className="w-4 h-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <span>🤝 Tạo đơn thay cho CTV (Cộng Tác Viên)</span>
                </span>
              </label>

              {isCreatingForCTV && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] text-amber-700 block">Dành riêng cho Sale ghi nhận tên, SĐT, số tiền hoa hồng CTV</span>
                  <input
                    type="text"
                    disabled={!canEditFinancials}
                    value={ctvInfo}
                    onChange={(e) => setCtvInfo(e.target.value)}
                    placeholder="Nhập Tên CTV, SĐT, tỷ lệ/số tiền hoa hồng hứa trả cho CTV..."
                    className="w-full bg-white border border-amber-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}
            </div>
          )}

          {!isSaleRole && Boolean(ctvInfo) && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 space-y-1.5">
              <label className="block text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <span>🤝 Ghi chú / Thông tin CTV</span>
              </label>
              <div className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700">
                {ctvInfo}
              </div>
            </div>
          )}

          {/* Nguồn khách hàng cho Sale (Ẩn khi là đơn CTV) */}
          {!isActuallyCTV && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Share2 className="w-4 h-4 text-blue-600" />
                  <span>Nguồn khách hàng</span>
                </label>
                <span className="text-[11px] text-slate-500 font-medium">Kênh tiếp cận khách đặt tour</span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1">
                {[
                  { id: 'Quảng cáo', label: 'Quảng cáo', icon: Megaphone },
                  { id: 'Khách cá nhân', label: 'Khách cá nhân', icon: UserCheck },
                  { id: 'Kênh social', label: 'Kênh social', icon: Globe }
                ].map(item => {
                  const Icon = item.icon;
                  const isSelected = (customerSource || 'Quảng cáo') === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCustomerSource(item.id)}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold transition-all border ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 hover:border-slate-400'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Discount Block */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Loại giảm giá
                </label>
                <CustomSelect
                  disabled={!canEditFinancials}
                  options={[
                    { value: 'amount', label: 'Số tiền (đ)' },
                    { value: 'percent', label: 'Phần trăm (%)' },
                  ]}
                  value={discountType}
                  onChange={val => setDiscountType(val as 'percent' | 'amount')}
                  className="w-full"
                  buttonClassName={`w-full h-9 rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${
                    !canEditFinancials
                      ? 'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed'
                      : 'border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white text-slate-800 cursor-pointer'
                  }`}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Giá trị giảm
                </label>
                <input
                  type="text"
                  disabled={!canEditFinancials}
                  value={discountValueDisplay}
                  onChange={(e) => {
                      const rawValue = e.target.value.replace(/[^0-9]/g, '');
                      if (!rawValue) {
                        setDiscountValueDisplay('');
                      } else {
                        const numericValue = parseInt(rawValue, 10);
                        setDiscountValueDisplay(formatNumber(numericValue.toString()));
                      }
                  }}
                  className={`w-full rounded-lg border px-3 py-2 text-sm font-semibold ${
                    isDiscountExceedingCommission
                      ? 'border-rose-400 bg-rose-50 text-rose-700 focus:ring-rose-500'
                      : !canEditFinancials
                      ? 'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed'
                      : 'border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
                  }`}
                />
              </div>
            </div>

            {isCTVOrAgent && isDiscountExceedingCommission && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-start gap-2">
                <span className="text-sm shrink-0">⚠️</span>
                <div>
                  <span className="font-bold">Vượt quá giới hạn giảm giá! </span>
                  Tài khoản vai trò <strong className="font-bold">{currentRole === 'agent' || profile?.role === 'agent' ? 'Đại lý' : 'CTV'}</strong> chỉ được giảm tối đa bằng số tiền hoa hồng được hưởng là <strong className="font-extrabold underline">{formatCurrency(maxCommission)} đ</strong>. Số tiền giảm hiện tại là <strong>{formatCurrency(discountAmount)} đ</strong>.
                </div>
              </div>
            )}
          </div>

          {/* Multiple Surcharges Block */}
          <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-blue-600" />
                <span>Các khoản phụ thu ({surcharges.length})</span>
              </label>
              {canEditFinancials && (
                <button
                  type="button"
                  onClick={handleAddSurcharge}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-white border border-blue-200 px-2.5 py-1 rounded-lg shadow-sm hover:bg-blue-50 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Thêm phụ thu
                </button>
              )}
            </div>

            {surcharges.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-1">Chưa có khoản phụ thu nào. Bấm "+ Thêm phụ thu" nếu cần.</p>
            ) : (
              <div className="space-y-2 pt-1">
                {surcharges.map((item, idx) => (
                  <div key={item.id || idx} className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-lg border border-slate-200">
                    <div className="col-span-6">
                      <input
                        type="text"
                        disabled={!canEditFinancials}
                        placeholder="Tên phụ thu (VD: Phụ thu phòng đơn, Vé máy bay...)"
                        value={item.name}
                        onChange={(e) => handleUpdateSurchargeName(item.id, e.target.value)}
                        className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="col-span-5">
                      <input
                        type="text"
                        disabled={!canEditFinancials}
                        placeholder="Số tiền (đ)"
                        value={item.amount ? formatNumber(item.amount.toString()) : ''}
                        onChange={(e) => handleUpdateSurchargeAmount(item.id, e.target.value)}
                        className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="col-span-1 text-right">
                      {canEditFinancials && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSurcharge(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
                          title="Xóa phụ thu"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {customSurchargeAmount > 0 && (
                  <div className="flex justify-between items-center text-xs font-bold text-blue-700 pt-1 px-1">
                    <span>Tổng phụ thu:</span>
                    <span>+{formatCurrency(customSurchargeAmount)} đ</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CTV Markup & Fee Tax Block */}
          {(isCreatingForCTV || currentRole === 'CTV' || profile?.role === 'CTV') && (
            <div className="space-y-2 bg-emerald-50/70 border border-emerald-200 p-3 rounded-xl">
              <div className="flex items-center justify-between border-b border-emerald-200/80 pb-1.5">
                <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Tiền tour chênh lệch CTV & Phí tính thuế</span>
                </span>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">Dành cho CTV</span>
              </div>

              <div className="grid grid-cols-12 gap-3 pt-1">
                <div className="col-span-7 space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase">
                    Tiền tour chênh lệch (đ)
                  </label>
                  <input
                    type="text"
                    disabled={!canEditFinancials}
                    placeholder="VD: 5.000.000"
                    value={priceMarkupDisplay}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, '');
                      setPriceMarkupDisplay(raw ? formatNumber(raw) : '');
                    }}
                    className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-bold text-emerald-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div className="col-span-5 space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase">
                    Phí tính trên chênh lệch (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      disabled={!canEditFinancials}
                      value={markupTaxPercent}
                      onChange={(e) => setMarkupTaxPercent(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                      className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 pr-7 focus:border-emerald-500 focus:outline-none"
                    />
                    <span className="absolute right-2.5 top-1.5 text-xs font-bold text-slate-400">%</span>
                  </div>
                </div>
              </div>

              {priceMarkup > 0 && (
                <div className="bg-white/80 p-2 rounded-lg border border-emerald-200 space-y-1 text-xs text-emerald-950 font-medium">
                  <div className="flex justify-between">
                    <span>Tiền chênh lệch bán cao hơn:</span>
                    <span className="font-bold">+{formatCurrency(priceMarkup)} đ</span>
                  </div>
                  <div className="flex justify-between text-rose-700">
                    <span>Phí công ty thu ({markupTaxPercent}%):</span>
                    <span className="font-bold">-{formatCurrency(markupFeeAmount)} đ</span>
                  </div>
                  <div className="flex justify-between text-emerald-800 font-bold border-t border-emerald-200/60 pt-1 mt-1">
                    <span>CTV thực nhận thêm:</span>
                    <span className="text-emerald-600">+{formatCurrency(netMarkupReceived)} đ</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Automatic Calculator Breakdown Box */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2.5">
            <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-blue-600" />
              Chi tiết giá tạm tính tự động
            </h3>
            
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Người lớn ({adultCount} khách x {formatCurrency(priceAdult)} đ):</span>
                <span className="font-semibold text-slate-800">{formatCurrency(baseAdultTotal)} đ</span>
              </div>
              
              {childCount > 0 && (
                <div className="flex justify-between">
                  <span>Trẻ em ({childCount} khách x {formatCurrency(priceChild)} đ):</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(baseChildTotal)} đ</span>
                </div>
              )}
              
              {infantCount > 0 && (
                <div className="flex justify-between">
                  <span>Trẻ nhỏ ({infantCount} khách x {formatCurrency(priceInfant)} đ):</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(baseInfantTotal)} đ</span>
                </div>
              )}

              {singleRoomCount > 0 && (
                <div className="flex justify-between text-blue-700 font-medium">
                  <span>Phụ thu phòng đơn ({singleRoomCount} phòng x {formatCurrency(singleRoomSurcharge)} đ):</span>
                  <span className="font-bold">{formatCurrency(surchargeTotal)} đ</span>
                </div>
              )}

              {parseNumber(discountValueDisplay) > 0 && (
                <div className="flex justify-between text-rose-700 font-medium">
                  <span>Giảm giá{discountType === 'percent' ? ` (${discountValueDisplay}%)` : ''}:</span>
                  <span className="font-bold">-{formatCurrency(discountAmount)} đ</span>
                </div>
              )}

              {surcharges.length > 0 && customSurchargeAmount > 0 && (
                <div className="space-y-1 border-t border-slate-200/60 pt-1.5 mt-1.5">
                  {surcharges.filter(s => s.amount > 0).map((item, i) => (
                    <div key={item.id || i} className="flex justify-between text-blue-700 font-medium">
                      <span>{item.name || `Phụ thu ${i + 1}`}:</span>
                      <span className="font-bold">+{formatCurrency(item.amount)} đ</span>
                    </div>
                  ))}
                </div>
              )}

              {priceMarkup > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium border-t border-slate-200/60 pt-1.5">
                  <span className="flex items-center gap-1">
                    Tiền tour chênh lệch (CTV):
                  </span>
                  <span className="font-bold">+{formatCurrency(priceMarkup)} đ</span>
                </div>
              )}

              {vatOption === 'Xuất VAT' && (
                <div className="flex justify-between text-emerald-700 font-medium border-t border-slate-200/60 pt-1.5">
                  <span className="flex items-center gap-1">
                    <Percent className="w-3.5 h-3.5 text-emerald-600" />
                    Thuế VAT 10% (Đã gồm trong giá):
                  </span>
                  <span className="font-bold">{formatCurrency(vatAmount)} đ</span>
                </div>
              )}

              <div className="flex justify-between items-center text-sm font-extrabold text-slate-800 border-t border-slate-200 pt-2 mt-1">
                <span className="text-blue-800">Tổng cộng (Giá tính toán):</span>
                <span className="text-base text-rose-600">{formatCurrency(computedTotalPrice)} đ</span>
              </div>

              {/* Commission breakdown box */}
              {((sellerType === 'agent') || currentRole === 'CTV' || profile?.role === 'CTV' || isCreatingForCTV) && (baseTotalCommission > 0 || netCommissionReceived > 0 || priceMarkup > 0) && (
                <div className="bg-amber-50/90 p-3 rounded-xl border border-amber-200/80 space-y-2 text-xs mt-2.5">
                  <div className="flex justify-between items-center text-amber-900 font-bold border-b border-amber-200/60 pb-1.5">
                    <span className="flex items-center gap-1.5 text-amber-800">
                      <Coins className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Hoa hồng / khách:</span>
                    </span>
                    <span className="font-extrabold text-amber-950">{formatCurrency(baseCommissionPerSeat)} đ/khách</span>
                  </div>

                  <div className="flex justify-between items-center text-amber-900 font-medium">
                    <span>Hoa hồng định mức ({adultCount + childCount} chỗ):</span>
                    <span className="font-semibold">{formatCurrency(baseTotalCommission)} đ</span>
                  </div>

                  {priceMarkup > 0 && (
                    <div className="bg-emerald-50/80 p-2.5 rounded-lg border border-emerald-200 space-y-1.5 my-1 text-emerald-950">
                      <div className="flex justify-between items-center font-medium">
                        <span>Tổng giá chênh lệch:</span>
                        <span className="font-bold text-emerald-700">+{formatCurrency(priceMarkup)} đ</span>
                      </div>
                      <div className="flex justify-between items-center text-rose-700 font-medium">
                        <span>Phí công ty thu ({markupTaxPercent}%):</span>
                        <span className="font-bold">-{formatCurrency(markupFeeAmount)} đ</span>
                      </div>
                      <div className="flex justify-between items-center text-emerald-900 font-bold border-t border-emerald-200/60 pt-1 mt-0.5">
                        <span>Số tiền chênh lệch còn lại:</span>
                        <span className="text-emerald-600 font-black">+{formatCurrency(netMarkupReceived)} đ</span>
                      </div>
                    </div>
                  )}

                  {commissionDeducted > 0 && (
                    <div className="flex justify-between items-center text-rose-700 font-medium">
                      <span>Bị trừ (Do giảm giá cho khách):</span>
                      <span className="font-bold text-rose-600">-{formatCurrency(commissionDeducted)} đ</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center bg-emerald-100/90 text-emerald-950 p-2.5 rounded-lg border border-emerald-300 font-extrabold text-xs mt-1">
                    <span>Tổng hoa hồng thực nhận:</span>
                    <span className="text-base font-black text-emerald-700">{formatCurrency(netCommissionReceived)} đ</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Total Price Box */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                Tổng tiền booking (VND)
              </label>
              
              {canEditFinancials && isPrivilegedRole && totalPrice !== computedTotalPrice && (
                <button
                  type="button"
                  onClick={() => setTotalPrice(computedTotalPrice)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-bold inline-flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 hover:bg-blue-100 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  Đặt lại về giá tự động
                </button>
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                value={totalPrice === 0 ? '0' : formatCurrency(totalPrice)}
                disabled={!canEditFinancials || !isPrivilegedRole}
                onChange={(e) => {
                  const rawValue = e.target.value.replace(/\D/g, '');
                  setTotalPrice(rawValue ? parseInt(rawValue, 10) : 0);
                }}
                className={`w-full rounded-lg border px-4 py-2.5 text-base font-black focus:outline-none ring-offset-2 transition-all ${
                  canEditFinancials && isPrivilegedRole
                    ? 'border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 text-rose-600 bg-white cursor-text' 
                    : 'border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed font-extrabold'
                }`}
              />
            </div>
            
            {isPrivilegedRole ? (
              <p className="text-[10px] text-gray-400 font-medium">
                * Bạn có quyền <strong className="font-bold">Quản trị viên / Sale Leader</strong> để điều chỉnh thủ công giá trị này vượt mức tính toán tự động của hệ thống.
              </p>
            ) : null}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-150 px-6 py-4 flex flex-col gap-3 shrink-0">
          {!isPrivilegedRole && (
            <p className="text-[11px] font-medium text-amber-800 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200/80 flex items-center gap-2 w-full">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Booking sẽ bị khóa sau khi lưu thông tin để tránh ảnh hưởng đến nghiệp vụ kế toán, hãy check thật kỹ.</span>
            </p>
          )}
          <div className="flex items-center justify-between gap-3 w-full flex-wrap">
            <button
              type="button"
              onClick={() => setShowContractModal(true)}
              className="px-3.5 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              title="Xem và in hợp đồng du lịch online cho booking này"
            >
              <Printer className="w-3.5 h-3.5 text-blue-600" />
              <span>In Hợp đồng Online</span>
            </button>

            <div className="flex items-center gap-3 ml-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => handleSave(false)}
                disabled={isSaving}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap shrink-0"
              >
                {isSaving ? 'Đang lưu...' : 'Lưu thông tin'}
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Confirmation Warning Modal before Auto-Locking for Sale/CTV */}
      {showLockConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 z-[60] animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-amber-200 space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-base font-extrabold text-slate-900">Xác nhận Lưu booking</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Sau khi nhấn <strong className="font-bold text-slate-900">Xác nhận lưu</strong>, hệ thống sẽ <strong className="font-bold text-amber-700">TỰ ĐỘNG KHÓA</strong> toàn bộ thông tin giá tiền, VAT, phụ thu & doanh thu của booking này.
              </p>
              <p className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-left font-medium">
                🔒 Chỉ <strong className="font-bold">Quản trị viên (Admin)</strong> và <strong className="font-bold">Sale Leader</strong> mới có quyền mở khóa hoặc điều chỉnh lại các số liệu này sau khi đã lưu.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLockConfirmModal(false)}
                className="flex-1 px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors whitespace-nowrap shrink-0"
              >
                Kiểm tra lại
              </button>
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={isSaving}
                className="flex-1 px-4 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors shadow-sm cursor-pointer whitespace-nowrap shrink-0"
              >
                {isSaving ? 'Đang lưu...' : 'Đồng ý Lưu & Khóa booking'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tour Contract Print Modal */}
      {showContractModal && (
        <TourContractPrintModal
          isOpen={showContractModal}
          onClose={() => setShowContractModal(false)}
          order={order}
          tour={tour}
          passengers={passengers}
        />
      )}
    </div>
  );
}
