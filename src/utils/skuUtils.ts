/**
 * skuUtils.ts - Tiện ích bóc tách tiền tố SKU và so khớp sản phẩm Tour giữa CRM và WooCommerce
 */

/**
 * Thuật toán bóc tách tiền tố SKU từ Mã lịch trình trên CRM
 * Tự động nhận diện phần đuôi ngày tháng/mã đợt của tour CRM mà vẫn bảo toàn cấu trúc mã tour gốc.
 * 
 * Ví dụ hợp lệ bóc tách:
 *  - AD-US01-201026 -> AD-US01 (đuôi ngày 201026)
 *  - TOUR-VN-01-20261015 -> TOUR-VN-01 (đuôi ngày 20261015)
 *  - TOUR-VN-01-D1 -> TOUR-VN-01 (đuôi đợt D1)
 *  - AD-US-01-DOT1 -> AD-US-01 (đuôi đợt DOT1)
 *  - EUR-05-151026 -> EUR-05 (đuôi ngày 151026)
 *  - JP-SAKURA-T11 -> JP-SAKURA (đuôi tháng T11)
 *  - US01_15102026 -> US01 (đuôi ngày 15102026)
 * 
 * Ví dụ giữ nguyên mã gốc:
 *  - AD-US01 -> AD-US01 (mã tour gốc, US01 là mã tuyến, không phải đuôi ngày)
 *  - TOUR-VN-HA-LONG -> TOUR-VN-HA-LONG
 *  - EUR-CLASSIC -> EUR-CLASSIC
 */
export function extractSkuPrefix(code: string): string {
  if (!code) return '';
  const trimmed = code.trim();

  // 1. Nhận diện các mẫu ngày tháng / mã đợt khởi hành ở đuôi:
  // - 4 đến 8 chữ số đại diện cho ngày tháng: ví dụ 201026 (YYMMDD), 20261015 (YYYYMMDD), 151026 (DDMMYY), 1510 (DDMM)
  // - Ký hiệu đợt khởi hành: D1, D01, K01, DOT1, DOT-1, KY1, T10, T11 (tháng 10, tháng 11)
  const departureSuffixRegex = /^(.*?)([-_])([0-9]{4,8}|[dDkK][0-9]{1,3}|[dD][oO][tT][0-9]{1,3}|[kK][yY][0-9]{1,3}|[tT][0-9]{1,2})$/i;
  const match = trimmed.match(departureSuffixRegex);
  if (match && match[1]) {
    return match[1].trim();
  }

  // 2. Nhận diện trường hợp có 2 chữ số cuối cùng nhưng đi sau dấu gạch và phía trước là năm/tháng (ví dụ: -26, _26)
  const shortDateRegex = /^(.*?)([-_])(2[4-9]|3[0-5])$/;
  const matchShort = trimmed.match(shortDateRegex);
  if (matchShort && matchShort[1]) {
    // Chỉ cắt nếu phần tiền tố chứa ít nhất một dấu gạch nữa (ví dụ: TOUR-US-26 -> TOUR-US)
    if (matchShort[1].includes('-') || matchShort[1].includes('_')) {
      return matchShort[1].trim();
    }
  }

  return trimmed;
}

/**
 * Chuẩn hóa SKU để so sánh không phân biệt hoa thường và khoảng trắng
 */
export function normalizeSku(sku: string): string {
  return (sku || '').trim().toUpperCase().replace(/\s+/g, '');
}

export type MatchTier = 'linked' | 'sku_matched' | 'departure_matched' | 'auto_matched' | 'new';

export interface ProductMatchResult<T> {
  mode: 'existing' | 'new';
  targetProductId: number | null;
  matchedType: MatchTier;
  matchedProductName?: string;
  matchedProductSku?: string;
  productUrl?: string;
  matchedProduct?: T;
  suggestedNewSku: string;
}

/**
 * Quy tắc 4 tầng so khớp thông minh giữa Tour CRM và danh sách sản phẩm WooCommerce
 * @param tour Tour cần so khớp
 * @param products Danh sách sản phẩm WooCommerce hiện có
 */
export function matchTourToWooCommerceProduct<T extends {
  id: number;
  name: string;
  sku?: string;
  permalink?: string;
  departures?: string[];
}>(
  tour: { id: string; name: string; code: string; wp_product_id?: number | string | null; wp_product_sku?: string | null },
  products: T[]
): ProductMatchResult<T> {
  const explicitSku = (tour.wp_product_sku || '').trim();
  const tourCode = (tour.code || '').trim();
  const skuPrefix = explicitSku || extractSkuPrefix(tourCode);
  const normalizedExplicitSku = normalizeSku(explicitSku);
  const normalizedTourCode = normalizeSku(tourCode);
  const normalizedSkuPrefix = normalizeSku(skuPrefix);
  const normalizedTourName = (tour.name || '').trim().toLowerCase();

  // TẦNG 1: Tour đã có liên kết từ trước (wp_product_id)
  if (tour.wp_product_id) {
    const existingLinked = products.find(p => p.id === Number(tour.wp_product_id));
    if (existingLinked) {
      return {
        mode: 'existing',
        targetProductId: existingLinked.id,
        matchedType: 'linked',
        matchedProductName: existingLinked.name,
        matchedProductSku: existingLinked.sku,
        productUrl: existingLinked.permalink,
        matchedProduct: existingLinked,
        suggestedNewSku: explicitSku || skuPrefix || tourCode
      };
    }
  }

  // TẦNG 2 (MỚI): Khớp theo Mã SKU Sản phẩm Web (wp_product_sku) hoặc tiền tố SKU
  if (normalizedExplicitSku || normalizedSkuPrefix) {
    const matchedBySku = products.find(p => {
      if (!p.sku) return false;
      const normalizedProductSku = normalizeSku(p.sku);
      if (normalizedExplicitSku && normalizedProductSku === normalizedExplicitSku) {
        return true;
      }
      return (
        normalizedProductSku === normalizedSkuPrefix ||
        normalizedProductSku === normalizedTourCode ||
        normalizedSkuPrefix === extractSkuPrefix(p.sku).toUpperCase()
      );
    });

    if (matchedBySku) {
      return {
        mode: 'existing',
        targetProductId: matchedBySku.id,
        matchedType: 'sku_matched',
        matchedProductName: matchedBySku.name,
        matchedProductSku: matchedBySku.sku,
        productUrl: matchedBySku.permalink,
        matchedProduct: matchedBySku,
        suggestedNewSku: explicitSku || skuPrefix || tourCode
      };
    }
  }

  // TẦNG 3: Mã lịch trình đã có trong danh sách đợt khởi hành ACF departures của sản phẩm trên website
  if (tourCode) {
    const matchedByDeparture = products.find(p => {
      if (!Array.isArray(p.departures) || p.departures.length === 0) return false;
      return p.departures.some(d => normalizeSku(d) === normalizedTourCode);
    });

    if (matchedByDeparture) {
      return {
        mode: 'existing',
        targetProductId: matchedByDeparture.id,
        matchedType: 'departure_matched',
        matchedProductName: matchedByDeparture.name,
        matchedProductSku: matchedByDeparture.sku,
        productUrl: matchedByDeparture.permalink,
        matchedProduct: matchedByDeparture,
        suggestedNewSku: explicitSku || skuPrefix || tourCode
      };
    }
  }

  // TẦNG 4: So khớp theo tên chương trình tour tương đồng
  if (normalizedTourName) {
    const matchedByName = products.find(p => {
      const pName = (p.name || '').trim().toLowerCase();
      return pName === normalizedTourName || pName.includes(normalizedTourName) || normalizedTourName.includes(pName);
    });

    if (matchedByName) {
      return {
        mode: 'existing',
        targetProductId: matchedByName.id,
        matchedType: 'auto_matched',
        matchedProductName: matchedByName.name,
        matchedProductSku: matchedByName.sku,
        productUrl: matchedByName.permalink,
        matchedProduct: matchedByName,
        suggestedNewSku: explicitSku || skuPrefix || tourCode
      };
    }
  }

  // MẶC ĐỊNH: Chưa có SKU Web - Gợi ý chế độ tạo mới với mã SKU là tiền tố đã bóc tách
  return {
    mode: 'new',
    targetProductId: null,
    matchedType: 'new',
    suggestedNewSku: explicitSku || skuPrefix || tourCode
  };
}

export interface ParentTourGroup<T = any> {
  groupId: string;
  sku: string;
  name: string;
  destination: string;
  duration: string;
  airline: string;
  hotel: string;
  itineraryPdfUrl?: string;
  departures: T[];
  totalSeats: number;
  availableSeats: number;
  minPrice: number;
  primaryTour: T;
  wpProductId?: number | null;
}

/**
 * Gom nhóm danh sách các ngày khởi hành thành các Sản Phẩm Mẹ (Parent Tour Group)
 * Gom nhóm theo:
 *  1. wp_product_sku (nếu đã gán cùng SKU Website, ví dụ OBAU-SYDMEL-JQ)
 *  2. wp_product_id (nếu đã liên kết cùng sản phẩm WooCommerce)
 *  3. Tiền tố SKU bóc tách (nếu khác mã tour) hoặc Tên chương trình tour
 */
export function groupToursByParentProduct<T extends {
  id: string;
  name: string;
  code: string;
  departure_time?: string;
  start_date?: string;
  price?: number;
  price_adult?: number;
  total_seats?: number;
  available_seats?: number;
  destination?: string;
  duration?: string;
  airline?: string;
  hotel?: string;
  itinerary_pdf_url?: string;
  wp_product_id?: number | string | null;
  wp_product_sku?: string | null;
}>(tours: T[]): ParentTourGroup<T>[] {
  const groupsMap = new Map<string, T[]>();

  tours.forEach(tour => {
    let groupKey = '';

    if (tour.wp_product_sku && tour.wp_product_sku.trim()) {
      groupKey = `SKU:${normalizeSku(tour.wp_product_sku)}`;
    } else if (tour.wp_product_id) {
      groupKey = `WP_ID:${tour.wp_product_id}`;
    } else {
      const prefix = extractSkuPrefix(tour.code);
      if (prefix && prefix !== tour.code) {
        groupKey = `PREFIX:${normalizeSku(prefix)}`;
      } else {
        const cleanName = (tour.name || '').trim().toLowerCase().replace(/\s+/g, ' ');
        groupKey = `NAME:${cleanName}`;
      }
    }

    const existing = groupsMap.get(groupKey) || [];
    existing.push(tour);
    groupsMap.set(groupKey, existing);
  });

  const parentGroups: ParentTourGroup<T>[] = [];

  groupsMap.forEach((departures, groupKey) => {
    // Sắp xếp các đợt theo ngày khởi hành tăng dần
    const sorted = [...departures].sort((a, b) => {
      const timeA = new Date(a.departure_time || a.start_date || 0).getTime();
      const timeB = new Date(b.departure_time || b.start_date || 0).getTime();
      return timeA - timeB;
    });

    const primaryTour = sorted[0];
    const explicitSku = sorted.find(t => t.wp_product_sku?.trim())?.wp_product_sku?.trim();
    const explicitWpId = sorted.find(t => t.wp_product_id)?.wp_product_id;

    const parentSku = explicitSku || extractSkuPrefix(primaryTour.code) || primaryTour.code;
    const totalSeats = sorted.reduce((sum, t) => sum + Number(t.total_seats || 0), 0);
    const availableSeats = sorted.reduce((sum, t) => sum + Number(t.available_seats ?? t.total_seats ?? 0), 0);

    const prices = sorted
      .map(t => Number(t.price_adult || t.price || 0))
      .filter(p => p > 0);
    const minPrice = prices.length > 0 ? Math.min(...prices) : Number(primaryTour.price_adult || primaryTour.price || 0);

    parentGroups.push({
      groupId: groupKey,
      sku: parentSku,
      name: primaryTour.name,
      destination: primaryTour.destination || '',
      duration: primaryTour.duration || '',
      airline: primaryTour.airline || '',
      hotel: primaryTour.hotel || '',
      itineraryPdfUrl: primaryTour.itinerary_pdf_url,
      departures: sorted,
      totalSeats,
      availableSeats,
      minPrice,
      primaryTour,
      wpProductId: explicitWpId ? Number(explicitWpId) : null
    });
  });

  return parentGroups;
}

export const groupToursByProgram = groupToursByParentProduct;

/**
 * Chuẩn hóa text tiếng Việt không dấu
 */
export function normalizeText(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

/**
 * Bí danh tương thích cho extractSkuPrefix
 */
export const extractSkuFromTourCode = extractSkuPrefix;

/**
 * Tìm sản phẩm WooCommerce tương ứng cho một Tour CRM (hợp nhất từ skuHelper)
 */
export function findMatchedProductForTour<T extends {
  id: number;
  name: string;
  sku?: string;
  permalink?: string;
  departures?: string[];
}>(
  tour: { id: string; name?: string; code?: string; wp_product_id?: string | number | null; wp_product_sku?: string | null },
  productsList: T[]
): {
  targetProductId: number | null;
  matchedType: 'linked' | 'sku_matched' | 'name_matched' | 'new';
  matchedSku?: string;
  matchedProductName?: string;
  productUrl?: string;
} {
  const normalizedTour = {
    id: tour.id,
    name: tour.name || '',
    code: tour.code || '',
    wp_product_id: tour.wp_product_id,
    wp_product_sku: tour.wp_product_sku
  };
  const result = matchTourToWooCommerceProduct(normalizedTour, productsList);
  
  let mappedType: 'linked' | 'sku_matched' | 'name_matched' | 'new' = 'new';
  if (result.matchedType === 'linked') {
    mappedType = 'linked';
  } else if (result.matchedType === 'sku_matched' || result.matchedType === 'departure_matched') {
    mappedType = 'sku_matched';
  } else if (result.matchedType === 'auto_matched') {
    mappedType = 'name_matched';
  }

  return {
    targetProductId: result.targetProductId,
    matchedType: mappedType,
    matchedSku: result.matchedProductSku,
    matchedProductName: result.matchedProductName,
    productUrl: result.productUrl
  };
}

