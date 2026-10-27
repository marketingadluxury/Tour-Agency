import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatNumber = (num: number | string) => {
  if (!num) return '0';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

export const formatCurrency = (amount: number | string) => {
  return `${formatNumber(amount)} đ`;
};

export const parseNumber = (str: string) => {
  return parseInt(str.replace(/\./g, ''), 10) || 0;
};

export function formatDateVi(dateInput?: string | Date | null): string {
  if (!dateInput) return '';
  const dateStr = String(dateInput).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

export function formatDateTimeVi(dateInput?: string | Date | null): string {
  if (!dateInput) return '';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return String(dateInput);
  }
}

export interface ParsedRefundInfo {
  method: 'transfer' | 'cash' | null;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  tourCode?: string;
  tourName?: string;
  cleanDescription: string;
}

export function parseRefundInfo(
  invoice: { 
    description?: string | null; 
    payment_method?: string; 
    refund_method?: string; 
    refund_bank_name?: string; 
    refund_account_number?: string; 
    refund_account_name?: string;
    tour_code?: string;
    tour_name?: string;
    order_id?: string | null;
  },
  orders?: any[],
  tours?: any[]
): ParsedRefundInfo {
  let description = (invoice.description || '').trim();

  let bankName = invoice.refund_bank_name || '';
  let accountNumber = invoice.refund_account_number || '';
  let accountName = invoice.refund_account_name || '';
  let method: 'transfer' | 'cash' | null = (invoice.refund_method as any) || (invoice.payment_method === 'Chuyển khoản' ? 'transfer' : null);

  let tourCode = (invoice.tour_code || '').trim();
  let tourName = (invoice.tour_name || '').trim();

  // Extract Tour from description if present
  const quotedTourMatch = description.match(/-\s*Tour:\s*"([^"]+)"/i) || description.match(/\[Tour:\s*"([^"]+)"\]/i);
  if (quotedTourMatch) {
    const rawTour = quotedTourMatch[1].trim();
    if (rawTour) {
      const parts = rawTour.split(' - ');
      if (parts.length > 1) {
        if (!tourCode) tourCode = parts[0].trim();
        if (!tourName) tourName = parts.slice(1).join(' - ').trim();
      } else {
        if (!tourCode) tourCode = rawTour;
      }
    }
    description = description
      .replace(/-\s*Tour:\s*"[^"]*"/gi, '')
      .replace(/\[Tour:\s*"[^"]*"\]/gi, '')
      .trim();
  } else {
    const unquotedTourMatch = description.match(/-\s*Tour:\s*([^\n\r()]+)/i);
    if (unquotedTourMatch) {
      const rawTour = unquotedTourMatch[1].trim();
      if (rawTour) {
        const parts = rawTour.split(' - ');
        if (parts.length > 1) {
          if (!tourCode) tourCode = parts[0].trim();
          if (!tourName) tourName = parts.slice(1).join(' - ').trim();
        } else {
          if (!tourCode) tourCode = rawTour;
        }
      }
      description = description.replace(/-\s*Tour:\s*[^\n\r()]+/gi, '').trim();
    }
  }

  // Lookup Tour via order_id -> order -> tour if missing
  if ((!tourCode || !tourName) && invoice.order_id && Array.isArray(orders) && Array.isArray(tours)) {
    const matchedOrder = orders.find(o => o?.id === invoice.order_id);
    if (matchedOrder && matchedOrder.tour_id) {
      const matchedTour = tours.find(t => t?.id === matchedOrder.tour_id);
      if (matchedTour) {
        if (!tourCode) tourCode = matchedTour.code || '';
        if (!tourName) tourName = matchedTour.name || '';
      }
    }
  }

  const transferRegex = /\[(?:Hoàn trả qua Ngân hàng|Chuyển khoản Ngân hàng|Thông tin chuyển khoản)\]:\s*([^-]+)\s*-\s*STK:\s*([^-]+)\s*-\s*Chủ\s*TK:\s*([^\n]+)/i;
  const cashRegex = /\[Hoàn trả\]:\s*Nhận tiền mặt trực tiếp tại văn phòng/i;

  const transferMatch = description.match(transferRegex);
  if (transferMatch) {
    if (!method) method = 'transfer';
    if (!bankName) bankName = transferMatch[1]?.trim() || '';
    if (!accountNumber) accountNumber = transferMatch[2]?.trim() || '';
    if (!accountName) accountName = transferMatch[3]?.trim() || '';
  }

  const cashMatch = description.match(cashRegex);
  if (cashMatch) {
    if (!method) method = 'cash';
  }

  // Always strip bank/refund info suffix from cleanDescription
  description = description
    .replace(/\[(?:Hoàn trả qua Ngân hàng|Chuyển khoản Ngân hàng|Thông tin chuyển khoản)\]:[\s\S]*$/gi, '')
    .replace(/\[Hoàn trả\]:[\s\S]*$/gi, '')
    .trim();

  description = description.replace(/\s+-\s*$/g, '').trim();

  if (bankName || accountNumber || accountName) {
    if (!method) method = 'transfer';
  }

  return {
    method,
    bankName,
    accountNumber,
    accountName: accountName ? accountName.trim().toUpperCase() : '',
    tourCode: tourCode || undefined,
    tourName: tourName || undefined,
    cleanDescription: description,
  };
}

export function isOrderInLeaderTeam(order: any, leaderProfile: any, profilesList: any[] = []): boolean {
  if (!order || !leaderProfile) return false;

  const leaderId = leaderProfile.id;
  const leaderName = (leaderProfile.full_name || '').toLowerCase().trim();
  const leaderEmail = (leaderProfile.email || '').toLowerCase().trim();

  // 1. Direct ownership by leader
  const orderUserId = order.user_id || order.salesperson_id;
  if (orderUserId && orderUserId === leaderId) return true;

  const rawCreatedBy = (order.created_by || '').toLowerCase().trim();
  const cleanCreatedBy = rawCreatedBy.replace(/^(sale leader|sale|đại lý|agent|điều hành|quản trị viên|admin|bod)\s*-\s*/i, '').trim();

  if (rawCreatedBy) {
    if (leaderName && (rawCreatedBy.includes(leaderName) || leaderName.includes(cleanCreatedBy))) return true;
    if (leaderEmail && rawCreatedBy.includes(leaderEmail)) return true;
  }

  // 2. Created by a team member under this leader
  if (Array.isArray(profilesList) && profilesList.length > 0) {
    const creatorProfile = profilesList.find(p => {
      if (p.id && orderUserId && p.id === orderUserId) return true;
      const pName = (p.full_name || '').toLowerCase().trim();
      const pEmail = (p.email || '').toLowerCase().trim();
      if (pName) {
        if (rawCreatedBy && rawCreatedBy.includes(pName)) return true;
        if (cleanCreatedBy && pName.includes(cleanCreatedBy)) return true;
        if (cleanCreatedBy && cleanCreatedBy.includes(pName)) return true;
      }
      if (pEmail && rawCreatedBy && rawCreatedBy.includes(pEmail)) return true;
      return false;
    });

    if (creatorProfile) {
      if (creatorProfile.leader_id === leaderId) return true;
      // If creator has no explicit leader_id set, check if creator role is sale or agent
      if (!creatorProfile.leader_id && (creatorProfile.role === 'sale' || creatorProfile.role === 'agent')) {
        return true;
      }
    }
  }

  return false;
}

export interface CalculateFinancialsInput {
  sellerType?: 'agent' | 'direct';
  originalPrice: number;
  sellingPrice?: number;
  baseCommission?: number;
  agentCommission?: number;
  citTaxPercent?: number;
  vatTaxPercent?: number;
}

export interface CalculateFinancialsOutput {
  sellerType: 'agent' | 'direct';
  originalPrice: number;
  sellingPrice: number;
  priceMarkup: number;
  citTaxPercent: number;
  vatTaxPercent: number;
  markupFeeAmount: number;
  netCommissionAmount: number;
  agentCommissionAmount: number;
  netPayableAmount: number;
}

export function calculateOrderFinancials(input: CalculateFinancialsInput): CalculateFinancialsOutput {
  const sellerType = input.sellerType || 'direct';
  const originalPrice = Math.max(0, input.originalPrice || 0);
  const baseCommission = Math.max(0, input.baseCommission || 0);
  const agentCommissionAmount = input.agentCommission !== undefined ? Math.max(0, input.agentCommission) : baseCommission;
  
  const vatTaxPercent = input.vatTaxPercent !== undefined ? input.vatTaxPercent : 8;
  const citTaxPercent = input.citTaxPercent === 20 ? 20 : 17;

  if (sellerType === 'agent') {
    const netPayableAmount = Math.max(0, originalPrice - agentCommissionAmount);
    return {
      sellerType: 'agent',
      originalPrice,
      sellingPrice: originalPrice,
      priceMarkup: 0,
      citTaxPercent: 0,
      vatTaxPercent: 0,
      markupFeeAmount: 0,
      netCommissionAmount: agentCommissionAmount,
      agentCommissionAmount,
      netPayableAmount,
    };
  }

  const sellingPrice = input.sellingPrice && input.sellingPrice > 0 ? input.sellingPrice : originalPrice;
  return {
    sellerType: 'direct',
    originalPrice,
    sellingPrice,
    priceMarkup: 0,
    citTaxPercent: 0,
    vatTaxPercent: 0,
    markupFeeAmount: 0,
    netCommissionAmount: baseCommission,
    agentCommissionAmount: 0,
    netPayableAmount: sellingPrice,
  };
}

export async function safeFetchApi(url: string, options: RequestInit = {}): Promise<any> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (netErr: any) {
    console.warn(`[safeFetchApi] Network fetch failed for ${url}:`, netErr?.message || netErr);
    throw new Error('Không thể kết nối tới máy chủ (Failed to fetch). Vui lòng kiểm tra kết nối mạng hoặc thử lại sau giây lát.');
  }

  const resText = await response.text();
  const trimmedText = resText.trim();

  if (trimmedText.startsWith('<!doctype html') || trimmedText.startsWith('<html')) {
    console.error(`[safeFetchApi] HTML response received for ${url}:`, trimmedText.substring(0, 200));
    throw new Error('Máy chủ đang khởi động lại hoặc không thể xử lý yêu cầu (Phản hồi HTML). Vui lòng thử lại sau giây lát.');
  }

  let data: any = {};
  if (trimmedText) {
    try {
      data = JSON.parse(trimmedText);
    } catch {
      if (trimmedText.startsWith('http://') || trimmedText.startsWith('https://')) {
        return { success: true, url: trimmedText };
      }
      throw new Error(`Phản hồi từ máy chủ không hợp lệ (${response.status}): ${trimmedText.substring(0, 100)}`);
    }
  }

  if (!response.ok) {
    const errorMsg = data?.error || data?.message || `Lỗi máy chủ (${response.status})`;
    throw new Error(errorMsg);
  }

  return data;
}

