/**
 * Bộ công cụ tính toán tài chính, giá tour và hoa hồng chuẩn hóa của Tour CRM
 */

export interface SurchargeItem {
  id?: string;
  name: string;
  amount: number;
}

export interface OrderTotalCalculationParams {
  adultCount: number;
  childCount: number;
  infantCount?: number;
  priceAdult: number;
  priceChild: number;
  priceInfant?: number;
  singleRoomSurcharge?: number;
  singleRoomCount?: number;
  surcharges?: SurchargeItem[];
  discountAmount?: number;
  vatOption?: 'Xuất VAT' | 'Không xuất VAT' | string;
  priceMarkup?: number;
}

export interface OrderTotalResult {
  seatsSubtotal: number;
  singleRoomTotal: number;
  surchargesTotal: number;
  discountAmount: number;
  priceMarkup: number;
  totalBeforeVat: number;
  vatAmount: number;
  finalTotalAmount: number;
}

/**
 * Tính toán chi tiết tổng tiền đơn hàng bao gồm vé, phụ thu, chiết khấu và VAT
 */
export function calculateOrderTotal(params: OrderTotalCalculationParams): OrderTotalResult {
  const adultTotal = Math.max(0, params.adultCount || 0) * Math.max(0, params.priceAdult || 0);
  const childTotal = Math.max(0, params.childCount || 0) * Math.max(0, params.priceChild || 0);
  const infantTotal = Math.max(0, params.infantCount || 0) * Math.max(0, params.priceInfant || 0);
  const seatsSubtotal = adultTotal + childTotal + infantTotal;

  const singleRoomTotal = Math.max(0, params.singleRoomCount || 0) * Math.max(0, params.singleRoomSurcharge || 0);
  
  const customSurchargesTotal = (params.surcharges || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const surchargesTotal = singleRoomTotal + customSurchargesTotal;

  const discountAmount = Math.max(0, params.discountAmount || 0);
  const priceMarkup = Math.max(0, params.priceMarkup || 0);

  // Thuế VAT đã bao gồm trong giá tour (Gross Amount)
  const finalTotalAmount = Math.max(0, seatsSubtotal + surchargesTotal + priceMarkup - discountAmount);
  
  let totalBeforeVat = finalTotalAmount;
  let vatAmount = 0;

  if (params.vatOption === 'Xuất VAT') {
    // Bóc tách tiền trước thuế và tiền thuế VAT (10%) từ tổng tiền đã gồm VAT
    totalBeforeVat = Math.round(finalTotalAmount / 1.1);
    vatAmount = finalTotalAmount - totalBeforeVat;
  }

  return {
    seatsSubtotal,
    singleRoomTotal,
    surchargesTotal,
    discountAmount,
    priceMarkup,
    totalBeforeVat,
    vatAmount,
    finalTotalAmount
  };
}

export interface CommissionCalculationParams {
  baseCommissionPerSeat: number;
  adultCount: number;
  childCount: number;
  priceMarkup?: number;
  markupTaxPercent?: number; // Mặc định 25%
  discountAmount?: number;
  sellerType?: 'direct' | 'agent' | 'ctv' | string;
  manualCommission?: number;
}

export interface CommissionBreakdownResult {
  commissionPassengerCount: number;
  baseTotalCommission: number;
  priceMarkup: number;
  markupTaxPercent: number;
  markupFeeAmount: number;
  netMarkupReceived: number;
  discountDeducted: number;
  netCommissionReceived: number;
}

/**
 * Tính toán hoa hồng đại lý / CTV theo đúng quy định:
 * - Hoa hồng cơ bản = Hoa hồng định mức * (số người lớn + số trẻ em)
 * - Các khoản phụ thu (phòng đơn, nâng hạng...) KHÔNG tính vào hoa hồng
 * - Tiền bán tour chênh lệch CTV bị công ty thu phí (mặc định 25%)
 * - Tiền giảm giá cho khách sẽ bị khấu trừ vào hoa hồng
 */
export function calculateCommissionBreakdown(params: CommissionCalculationParams): CommissionBreakdownResult {
  const commissionPassengerCount = Math.max(0, params.adultCount || 0) + Math.max(0, params.childCount || 0);
  const baseTotalCommission = Math.max(0, params.baseCommissionPerSeat || 0) * commissionPassengerCount;

  const priceMarkup = Math.max(0, params.priceMarkup || 0);
  const markupTaxPercent = params.markupTaxPercent !== undefined ? params.markupTaxPercent : 25;
  const markupFeeAmount = Math.round((priceMarkup * markupTaxPercent) / 100);
  const netMarkupReceived = Math.max(0, priceMarkup - markupFeeAmount);

  const discountAmount = Math.max(0, params.discountAmount || 0);
  const discountDeducted = Math.min(baseTotalCommission + netMarkupReceived, discountAmount);

  let netCommissionReceived = Math.max(0, baseTotalCommission + netMarkupReceived - discountAmount);

  if (params.manualCommission !== undefined && params.manualCommission !== null && params.manualCommission > 0) {
    netCommissionReceived = params.manualCommission;
  }

  return {
    commissionPassengerCount,
    baseTotalCommission,
    priceMarkup,
    markupTaxPercent,
    markupFeeAmount,
    netMarkupReceived,
    discountDeducted,
    netCommissionReceived
  };
}
