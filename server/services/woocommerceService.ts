import { getAdminSupabaseClient } from './supabaseService.js';

export interface WooCommerceConfig {
  id?: string;
  site_url: string;
  consumer_key: string;
  consumer_secret: string;
  is_active: boolean;
  auto_sync_on_save: boolean;
  auto_sync_on_booking: boolean;
  repeater_slug?: string;
  sync_mode?: 'repeater' | 'simple';
  field_mappings: Record<string, string>;
  created_at?: string;
  updated_at?: string;
}

const DEFAULT_FIELD_MAPPINGS: Record<string, string> = {
  code: 'ma_lich_trinh',
  start_date: 'ngay_khoi_hanh',
  end_date: 'ngay_ve',
  duration: 'thoi_luong',
  price_adult: 'gia_nguoi_lon',
  price_child: 'gia_tre_em',
  price_infant: 'gia_em_be',
  single_room_surcharge: 'phu_thu_phong_don',
  price_visa_tour: 'phi_visa',
  airline: 'hang_hang_khong',
  hotel: 'khach_san',
  destination: 'diem_den',
  total_seats: 'tong_so_cho_mo_ban',
  available_seats: 'so_cho_con_lai',
  itinerary_pdf_url: 'link_lich_trinh',
  flight_out: 'chuyen_bay_di',
  flight_in: 'chuyen_bay_ve',
  tour_status: 'tinh_trang_tour',
  description: 'luu_y_dac_biet'
};

// Bộ nhớ đệm tạm thời (In-memory fallback nếu chưa tạo bảng trong Supabase)
let memoryConfig: WooCommerceConfig = {
  site_url: process.env.WOOCOMMERCE_SITE_URL || '',
  consumer_key: process.env.WOOCOMMERCE_CONSUMER_KEY || '',
  consumer_secret: process.env.WOOCOMMERCE_CONSUMER_SECRET || '',
  is_active: true,
  auto_sync_on_save: false,
  auto_sync_on_booking: false,
  repeater_slug: 'lich_trinh_khoi_hanh',
  sync_mode: 'repeater',
  field_mappings: DEFAULT_FIELD_MAPPINGS
};

/**
 * Lấy cấu hình kết nối WooCommerce
 */
export async function getWooCommerceConfig(): Promise<WooCommerceConfig> {
  try {
    const supabase = getAdminSupabaseClient();
    const { data, error } = await supabase
      .from('woocommerce_configs')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      memoryConfig = {
        id: data.id,
        site_url: data.site_url || '',
        consumer_key: data.consumer_key || '',
        consumer_secret: data.consumer_secret || '',
        is_active: data.is_active ?? true,
        auto_sync_on_save: data.auto_sync_on_save ?? false,
        auto_sync_on_booking: data.auto_sync_on_booking ?? false,
        repeater_slug: data.repeater_slug || 'lich_trinh_khoi_hanh',
        sync_mode: data.sync_mode || 'repeater',
        field_mappings: data.field_mappings || DEFAULT_FIELD_MAPPINGS,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
      return memoryConfig;
    }
  } catch (err) {
    console.warn('[WooCommerce] Chưa đọc được từ bảng woocommerce_configs, sử dụng memory config:', err);
  }
  return memoryConfig;
}

/**
 * Lưu hoặc cập nhật cấu hình kết nối WooCommerce
 */
export async function saveWooCommerceConfig(newConfig: Partial<WooCommerceConfig>): Promise<WooCommerceConfig> {
  // Chuẩn hóa URL (bỏ dấu gạch chéo cuối nếu có)
  let cleanUrl = (newConfig.site_url || memoryConfig.site_url).trim();
  if (cleanUrl.endsWith('/')) {
    cleanUrl = cleanUrl.slice(0, -1);
  }

  const updated: WooCommerceConfig = {
    ...memoryConfig,
    ...newConfig,
    site_url: cleanUrl,
    field_mappings: {
      ...DEFAULT_FIELD_MAPPINGS,
      ...(newConfig.field_mappings || memoryConfig.field_mappings)
    },
    updated_at: new Date().toISOString()
  };

  memoryConfig = updated;

  try {
    const supabase = getAdminSupabaseClient();
    const { data: existing } = await supabase
      .from('woocommerce_configs')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      await supabase
        .from('woocommerce_configs')
        .update({
          site_url: updated.site_url,
          consumer_key: updated.consumer_key,
          consumer_secret: updated.consumer_secret,
          is_active: updated.is_active,
          auto_sync_on_save: updated.auto_sync_on_save,
          auto_sync_on_booking: updated.auto_sync_on_booking,
          repeater_slug: updated.repeater_slug || 'lich_trinh_khoi_hanh',
          sync_mode: updated.sync_mode || 'repeater',
          field_mappings: updated.field_mappings,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('woocommerce_configs')
        .insert([{
          site_url: updated.site_url,
          consumer_key: updated.consumer_key,
          consumer_secret: updated.consumer_secret,
          is_active: updated.is_active,
          auto_sync_on_save: updated.auto_sync_on_save,
          auto_sync_on_booking: updated.auto_sync_on_booking,
          repeater_slug: updated.repeater_slug || 'lich_trinh_khoi_hanh',
          sync_mode: updated.sync_mode || 'repeater',
          field_mappings: updated.field_mappings,
          updated_at: new Date().toISOString()
        }]);
    }
  } catch (err) {
    console.warn('[WooCommerce] Lưu DB thất bại, lưu tạm vào bộ nhớ:', err);
  }

  return updated;
}

/**
 * Hàm gọi API WooCommerce bằng native fetch
 */
async function callWooCommerceApi(
  config: WooCommerceConfig,
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  data?: any,
  queryParams?: Record<string, string | number>
) {
  let baseUrl = (config.site_url || '').trim();
  if (!baseUrl) {
    throw new Error('Chưa cấu hình URL website WordPress.');
  }

  // Tự động bổ sung https:// nếu người dùng chỉ nhập tên miền (ví dụ: yourcompany.com)
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    baseUrl = `https://${baseUrl}`;
  }
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1);
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const urlObj = new URL(`${baseUrl}/wp-json/wc/v3${cleanEndpoint}`);

  // Thêm auth qua query params để hỗ trợ cả các server chặn Basic Auth header
  urlObj.searchParams.set('consumer_key', config.consumer_key.trim());
  urlObj.searchParams.set('consumer_secret', config.consumer_secret.trim());

  if (queryParams) {
    for (const [k, v] of Object.entries(queryParams)) {
      if (v !== undefined && v !== null && v !== '') {
        urlObj.searchParams.set(k, String(v));
      }
    }
  }

  const authHeader = 'Basic ' + Buffer.from(`${config.consumer_key.trim()}:${config.consumer_secret.trim()}`).toString('base64');

  const headers: Record<string, string> = {
    'Authorization': authHeader,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'TourCRM-WooCommerce-Sync/2.0'
  };

  const options: RequestInit = {
    method,
    headers,
    redirect: 'follow'
  };

  if (data && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(urlObj.toString(), options);
  const text = await response.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  if (!response.ok) {
    const errorMsg = json?.message || json?.data?.message || `HTTP ${response.status}: ${response.statusText}`;
    const err: any = new Error(errorMsg);
    err.status = response.status;
    err.data = json;
    throw err;
  }

  return {
    status: response.status,
    headers: response.headers,
    data: json
  };
}

/**
 * Kiểm tra kết nối với WordPress WooCommerce
 */
export async function testWooCommerceConnection(customConfig?: Partial<WooCommerceConfig>) {
  const config = customConfig ? { ...memoryConfig, ...customConfig } : await getWooCommerceConfig();
  
  if (!config.site_url || !config.consumer_key || !config.consumer_secret) {
    return {
      success: false,
      message: 'Vui lòng điền đầy đủ Website URL, Consumer Key và Consumer Secret.'
    };
  }

  try {
    // Thử truy vấn 1 sản phẩm để kiểm tra quyền đọc
    const res = await callWooCommerceApi(config, '/products', 'GET', undefined, { per_page: 1 });
    
    // Thử lấy thông tin hệ thống WooCommerce (nếu có quyền)
    let wcVersion = 'Hoạt động';
    try {
      const sysRes = await callWooCommerceApi(config, '/system_status');
      if (sysRes.data?.environment?.version) {
        wcVersion = `WooCommerce v${sysRes.data.environment.version}`;
      }
    } catch {
      // Bỏ qua nếu endpoint system_status bị hạn chế
    }

    const totalStr = res.headers.get('x-wp-total') || '0';
    return {
      success: true,
      message: `Kết nối thành công tới ${config.site_url}! (${wcVersion})`,
      site_url: config.site_url,
      version: wcVersion,
      total_products: parseInt(totalStr, 10)
    };
  } catch (err: any) {
    let errorMsg = err.message || 'Lỗi không xác định khi kết nối tới WordPress';
    if (err.status === 401) {
      errorMsg = 'Xác thực thất bại: Consumer Key hoặc Consumer Secret không đúng, hoặc không có quyền Read/Write.';
    } else if (err.status === 404) {
      errorMsg = `Không tìm thấy WooCommerce REST API tại ${config.site_url}. Vui lòng kiểm tra lại URL và chắc chắn WooCommerce đã được kích hoạt.`;
    } else if (err.data?.message) {
      errorMsg = `Lỗi từ WordPress: ${err.data.message} (${err.data.code || err.status})`;
    } else if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
      errorMsg = `Không thể kết nối tới tên miền ${config.site_url}. Vui lòng kiểm tra lại đường dẫn website.`;
    }
    return {
      success: false,
      message: errorMsg
    };
  }
}

/**
 * Định dạng ngày YYYY-MM-DD sang chuẩn Việt Nam DD/MM/YYYY
 */
function formatDateVN(dateStr: string): string {
  if (!dateStr) return '';
  const clean = dateStr.trim().split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * Thuật toán bóc tách tiền tố SKU từ Mã lịch trình trên CRM
 */
export function extractSkuPrefix(code: string): string {
  if (!code) return '';
  const trimmed = code.trim();

  // Nhận diện các mẫu ngày tháng / mã đợt khởi hành ở đuôi
  const departureSuffixRegex = /^(.*?)([-_])([0-9]{4,8}|[dD][0-9]{1,3}|[dD][oO][tT][0-9]{1,3}|[tT][0-9]{1,2})$/i;
  const match = trimmed.match(departureSuffixRegex);
  if (match && match[1]) {
    return match[1].trim();
  }

  // Nhận diện đuôi 2 số năm/tháng (ví dụ: TOUR-US-26 -> TOUR-US)
  const shortDateRegex = /^(.*?)([-_])(2[4-9]|3[0-5])$/;
  const matchShort = trimmed.match(shortDateRegex);
  if (matchShort && matchShort[1]) {
    if (matchShort[1].includes('-') || matchShort[1].includes('_')) {
      return matchShort[1].trim();
    }
  }

  return trimmed;
}

export function normalizeSku(sku: string): string {
  return (sku || '').trim().toUpperCase().replace(/\s+/g, '');
}

/**
 * Trích xuất mã hiệu chuyến bay và giờ cất cánh/hạ cánh
 * Ví dụ: "JQ62 22:35 - 10:15" -> { flightCode: 'JQ62', depTime: '22:35', arrTime: '10:15' }
 */
export function parseFlightInfo(flightStr?: string, dateTimeIso?: string) {
  let flightCode = '';
  let depTime = '';
  let arrTime = '';

  if (flightStr) {
    const trimmed = flightStr.trim();
    const codeMatch = trimmed.match(/\b([A-Za-z]{2,3}\s?[0-9]{2,4})\b/);
    if (codeMatch) {
      flightCode = codeMatch[1].replace(/\s+/g, '').toUpperCase();
    } else {
      const firstToken = trimmed.split(/[\s-]+/)[0];
      if (firstToken && firstToken.length >= 2 && firstToken.length <= 8) {
        flightCode = firstToken.toUpperCase();
      }
    }

    const timeMatches = trimmed.match(/\b([0-1]?[0-9]|2[0-3]):[0-5][0-9]\b/g);
    if (timeMatches && timeMatches.length >= 1) {
      depTime = timeMatches[0];
      if (timeMatches.length >= 2) {
        arrTime = timeMatches[1];
      }
    }
  }

  if (!depTime && dateTimeIso) {
    try {
      const d = new Date(dateTimeIso);
      if (!isNaN(d.getTime())) {
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        if (hh !== '00' || mm !== '00') {
          depTime = `${hh}:${mm}`;
        }
      }
    } catch (e) {
      // ignore
    }
  }

  return { flightCode, depTime, arrTime };
}

/**
 * Xây dựng 1 hàng (row) cho bảng ACF Repeater từ thông tin Tour
 * Chuẩn hóa 100% theo đúng cấu trúc bảng ACF thực tế trên Website (image_0ea0250c.png)
 */
function buildRepeaterRowFromTour(tour: any, mappings: Record<string, string>): Record<string, any> {
  const row: Record<string, any> = {};
  const adultPrice = Number(tour.price_adult || tour.price || 0);
  const childPrice = Number(tour.price_child || Math.round(adultPrice * 0.8));
  const infantPrice = Number(tour.price_infant || Math.round(adultPrice * 0.3));
  const singleRoom = Number(tour.single_room_surcharge || 0);
  const totalSeats = Number(tour.total_seats || 0);
  const availSeats = Number(tour.available_seats ?? tour.total_seats ?? 0);

  const depDateVn = tour.departure_time ? formatDateVN(tour.departure_time) : (tour.start_date ? formatDateVN(tour.start_date) : '');
  const retDateVn = tour.return_time ? formatDateVN(tour.return_time) : (tour.end_date ? formatDateVN(tour.end_date) : '');

  const outFlight = parseFlightInfo(tour.flight_out, tour.departure_time);
  const inFlight = parseFlightInfo(tour.flight_in, tour.return_time);

  // Ánh xạ trạng thái tour sang checkbox ACF
  const statusLabels: string[] = [];
  if (tour.tour_status === 'noshop') statusLabels.push('No Shop');
  else if (tour.tour_status === 'last_minute') statusLabels.push('Giờ chót');
  else if (tour.tour_status === 'holiday') statusLabels.push('Lễ tết');
  else if (tour.tour_status === 'on_sale') statusLabels.push('Giảm giá');

  // Đầy đủ các trường chuẩn hóa theo ACF thực tế (Lịch trình khởi hành)
  row.ma_lich_trinh = tour.code;
  row.ngay_khoi_hanh = depDateVn;

  // 1. Chuyến bay đi
  row.ngay_di = depDateVn;
  row.ma_chuyen_bay_di = outFlight.flightCode || tour.airline || '';
  row.gio_cat_canh_di = outFlight.depTime || '';
  row.gio_ha_canh_di = outFlight.arrTime || '';
  row.chuyen_bay_di = tour.flight_out || outFlight.flightCode || '';

  // 2. Chuyến bay về
  row.ngay_ve = retDateVn;
  row.ma_chuyen_bay_ve = inFlight.flightCode || tour.airline || '';
  row.gio_cat_canh_ve = inFlight.depTime || '';
  row.gio_ha_canh_ve = inFlight.arrTime || '';
  row.chuyen_bay_ve = tour.flight_in || inFlight.flightCode || '';

  // 3. Bảng giá
  row.gia_nguoi_lon = adultPrice;
  row.gia_tre_em = childPrice;
  row.gia_em_be = infantPrice;
  row.phu_thu_phong_don = singleRoom;

  // 4. Lưu ý đặc biệt & Tình trạng chỗ
  row.luu_y_dac_biet = tour.description || (tour.visa_deadline ? `Nhận hồ sơ đến: ${formatDateVN(tour.visa_deadline)}` : '');
  row.tong_so_cho_mo_ban = totalSeats;
  row.so_cho_con_lai = availSeats;
  row.han_muc_overbook = Number(tour.overbook_limit || 0);
  row.tinh_trang_tour = statusLabels;

  // Áp dụng thêm các mapping tùy chỉnh người dùng cài đặt
  for (const [crmField, acfSlug] of Object.entries(mappings || {})) {
    if (!acfSlug || typeof acfSlug !== 'string' || !acfSlug.trim()) continue;
    const cleanSlug = acfSlug.trim();
    if (row[cleanSlug] !== undefined) continue;

    let val: any = tour[crmField];
    if (crmField === 'code') val = tour.code;
    else if (crmField === 'price_adult') val = adultPrice;
    else if (crmField === 'price_child') val = childPrice;
    else if (crmField === 'price_infant') val = infantPrice;
    else if (crmField === 'single_room_surcharge') val = singleRoom;
    else if (crmField === 'total_seats') val = totalSeats;
    else if (crmField === 'available_seats') val = availSeats;
    else if (crmField === 'start_date') val = depDateVn;
    else if (crmField === 'end_date') val = retDateVn;
    else if (crmField === 'flight_out') val = tour.flight_out || '';
    else if (crmField === 'flight_in') val = tour.flight_in || '';
    else if (crmField === 'tour_status') val = tour.tour_status || 'available';
    else if (crmField === 'description') val = tour.description || '';

    if (val !== undefined && val !== null) {
      row[cleanSlug] = val;
    }
  }

  return row;
}

/**
 * Xây dựng payload sản phẩm WooCommerce từ Tour (hỗ trợ cả Simple Product & ACF Repeater)
 */
function buildWooCommercePayload(
  primaryTour: any,
  groupTours: any[],
  config: WooCommerceConfig,
  existingProduct?: any,
  options?: { update_prices?: boolean; update_departures?: boolean }
) {
  const mappings = config.field_mappings || DEFAULT_FIELD_MAPPINGS;
  const repeaterSlug = (config.repeater_slug || 'lich_trinh_khoi_hanh').trim();
  const codeSlug = (mappings.code || 'ma_lich_trinh').trim();

  const shouldUpdatePrices = options?.update_prices !== false;
  const shouldUpdateDepartures = options?.update_departures !== false;

  // Tìm mức giá người lớn thấp nhất của các đợt đang mở bán để hiển thị giá "Chỉ từ ..."
  const prices = groupTours
    .map(t => Number(t.price_adult || t.price || 0))
    .filter(p => p > 0);
  const minPrice = prices.length > 0 ? Math.min(...prices) : Number(primaryTour.price_adult || primaryTour.price || 0);

  // Tổng số chỗ khả dụng của toàn bộ các đợt khởi hành
  const totalAvailableSeats = groupTours.reduce((sum, t) => {
    return sum + Number(t.available_seats ?? t.total_seats ?? 0);
  }, 0);

  // Mảng ACF metadata
  const metaData: { key: string; value: any }[] = [];

  // 1. Thêm các trường metadata tổng quan của chương trình Tour
  if (mappings && typeof mappings === 'object') {
    for (const [crmField, acfSlug] of Object.entries(mappings)) {
      if (!acfSlug || typeof acfSlug !== 'string' || !acfSlug.trim()) continue;
      const cleanSlug = acfSlug.trim();
      let val = primaryTour[crmField];

      if (val === undefined || val === null) {
        if (crmField === 'price_adult') val = minPrice;
        else if (crmField === 'available_seats') val = totalAvailableSeats;
        else if (crmField === 'total_seats') val = groupTours.reduce((sum, t) => sum + Number(t.total_seats || 0), 0);
      }

      if (typeof val === 'number') {
        val = Number(val);
      } else if (val === undefined || val === null) {
        val = '';
      }

      metaData.push({ key: cleanSlug, value: val });
    }
  }

  // 2. Xây dựng bảng ACF Repeater Lịch Trình Khởi Hành
  if (shouldUpdateDepartures) {
    let currentRows: Record<string, any>[] = [];
    if (existingProduct && Array.isArray(existingProduct.meta_data)) {
      const existingMeta = existingProduct.meta_data.find((m: any) => m.key === repeaterSlug);
      if (existingMeta && Array.isArray(existingMeta.value)) {
        currentRows = [...existingMeta.value];
      }
    }

    const rowsMap = new Map<string, Record<string, any>>();
    currentRows.forEach(r => {
      const codeVal = r[codeSlug] || r.ma_lich_trinh || r.code;
      if (codeVal) rowsMap.set(String(codeVal).trim().toUpperCase(), r);
    });

    groupTours.forEach(t => {
      const row = buildRepeaterRowFromTour(t, mappings);
      const codeVal = String(t.code).trim().toUpperCase();
      rowsMap.set(codeVal, row);
    });

    const finalRepeaterRows = Array.from(rowsMap.values());

    metaData.push({ key: repeaterSlug, value: finalRepeaterRows });
    metaData.push({ key: repeaterSlug, value: finalRepeaterRows.length });
    finalRepeaterRows.forEach((r, idx) => {
      for (const [subKey, subVal] of Object.entries(r)) {
        metaData.push({
          key: `${repeaterSlug}_${idx}_${subKey}`,
          value: subVal
        });
      }
    });
  } else if (existingProduct && Array.isArray(existingProduct.meta_data)) {
    // Giữ nguyên repeater cũ từ existingProduct
    const existingMeta = existingProduct.meta_data.find((m: any) => m.key === repeaterSlug);
    if (existingMeta) {
      metaData.push({ key: repeaterSlug, value: existingMeta.value });
    }
  }

  // Cờ nhận diện Tour CRM
  metaData.push({ key: '_synced_by_tour_crm', value: 'yes' });
  metaData.push({ key: '_tour_crm_primary_id', value: primaryTour.id });

  // Tóm tắt lịch trình đại diện
  const shortDesc = `
<p><strong>Chương trình Tour:</strong> ${primaryTour.name}</p>
<p><strong>Thời lượng:</strong> ${primaryTour.duration || 'N/A'} - <strong>Điểm đến:</strong> ${primaryTour.destination || 'N/A'}</p>
<p><strong>Hãng bay:</strong> ${primaryTour.airline || 'N/A'} - <strong>Khách sạn:</strong> ${primaryTour.hotel || 'N/A'}</p>
<p><strong>Số đợt khởi hành đang mở bán:</strong> ${groupTours.length} đợt</p>
${primaryTour.itinerary_pdf_url ? `<p><a href="${primaryTour.itinerary_pdf_url}" target="_blank" rel="noopener noreferrer">📄 Tải lịch trình chi tiết (PDF)</a></p>` : ''}
  `.trim();

  return {
    name: primaryTour.name,
    type: 'simple',
    sku: existingProduct?.sku || primaryTour.wp_product_sku || extractSkuPrefix(primaryTour.code) || primaryTour.code,
    regular_price: (!shouldUpdatePrices && existingProduct?.regular_price) 
      ? existingProduct.regular_price 
      : (minPrice > 0 ? minPrice.toString() : '0'),
    manage_stock: true,
    stock_quantity: totalAvailableSeats >= 0 ? totalAvailableSeats : 0,
    stock_status: totalAvailableSeats > 0 ? 'instock' : 'outofstock',
    status: 'publish',
    short_description: shortDesc,
    meta_data: metaData
  };
}

/**
 * Lấy danh sách sản phẩm Tour hiện có trên website WordPress WooCommerce
 * Tự động thử nghiệm 3 tầng fallback để tương thích tuyệt đối với mọi cấu hình WordPress/WooCommerce
 */
export async function getWooCommerceProducts(search?: string, perPage = 50, page = 1) {
  const config = await getWooCommerceConfig();
  if (!config.is_active || !config.site_url) {
    throw new Error('Chưa kích hoạt hoặc cấu hình kết nối WooCommerce.');
  }

  const baseParams: Record<string, string | number> = {
    per_page: Math.min(perPage, 100),
    page: page,
    orderby: 'title',
    order: 'asc'
  };

  if (search && search.trim()) {
    baseParams.search = search.trim();
  }

  let res: any = null;
  let lastError: any = null;

  // Lần thử 1: Thử lấy danh sách sản phẩm với status='any' (chuẩn WooCommerce)
  try {
    res = await callWooCommerceApi(config, '/products', 'GET', undefined, { ...baseParams, status: 'any' });
  } catch (err1: any) {
    lastError = err1;
    // Lần thử 2: Nếu bị lỗi tham số status hoặc phân quyền, thử với status='publish'
    try {
      res = await callWooCommerceApi(config, '/products', 'GET', undefined, { ...baseParams, status: 'publish' });
    } catch (err2: any) {
      lastError = err2;
      // Lần thử 3: Bỏ hoàn toàn tham số status (WooCommerce sẽ tự dùng mặc định)
      try {
        res = await callWooCommerceApi(config, '/products', 'GET', undefined, baseParams);
      } catch (err3: any) {
        lastError = err3;
      }
    }
  }

  if (!res || !res.data) {
    const errorMsg = lastError?.message || lastError?.data?.message || 'Không thể tải danh sách sản phẩm từ WordPress WooCommerce.';
    throw new Error(errorMsg);
  }

  const products = Array.isArray(res.data) ? res.data : [];
  const repeaterSlug = (config.repeater_slug || 'lich_trinh_khoi_hanh').trim();
  const codeSlug = (config.field_mappings?.code || 'ma_lich_trinh').trim();

  // Bóc tách danh sách các mã lịch trình đang có trong từng sản phẩm
  const parsedProducts = products.map((p: any) => {
    let departures: string[] = [];
    let departuresCount = 0;

    if (Array.isArray(p.meta_data)) {
      const repeaterMeta = p.meta_data.find((m: any) => m.key === repeaterSlug);
      if (repeaterMeta && Array.isArray(repeaterMeta.value)) {
        departures = repeaterMeta.value
          .map((row: any) => String(row[codeSlug] || row.ma_lich_trinh || row.code || '').trim())
          .filter(Boolean);
        departuresCount = departures.length;
      }
    }

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      permalink: p.permalink,
      price: p.price,
      regular_price: p.regular_price,
      sku: p.sku || '',
      status: p.status,
      stock_quantity: p.stock_quantity,
      stock_status: p.stock_status,
      departures_count: departuresCount,
      departures: departures
    };
  });

  const totalStr = res.headers?.get?.('x-wp-total') || String(parsedProducts.length);
  const totalPagesStr = res.headers?.get?.('x-wp-totalpages') || '1';

  return {
    success: true,
    total: parseInt(totalStr, 10),
    total_pages: parseInt(totalPagesStr, 10),
    products: parsedProducts
  };
}

/**
 * Đồng bộ 1 Tour cụ thể sang WooCommerce (Hỗ trợ chọn Sản phẩm có sẵn hoặc Tạo mới)
 * Áp dụng Quy tắc 4 Tầng So Khớp Thông Minh:
 *  - Tầng 1: Tour đã có liên kết từ trước (wp_product_id) hoặc chỉ định thủ công
 *  - Tầng 2 (Mới): Khớp theo tiền tố SKU của sản phẩm WooCommerce (Badge xanh chàm)
 *  - Tầng 3: Mã lịch trình đã có trong danh sách đợt khởi hành ACF departures của sản phẩm trên website
 *  - Tầng 4: So khớp theo tên chương trình tour tương đồng
 *  - Mặc định: Gợi ý chế độ tạo mới với mã SKU là tiền tố đã bóc tách
 */
export async function syncTourToWooCommerce(
  tourId: string, 
  options?: { 
    target_product_id?: number | 'new'; 
    force_new?: boolean;
    update_prices?: boolean;
    update_departures?: boolean;
    group_tour_ids?: string[];
  }
) {
  const config = await getWooCommerceConfig();
  if (!config.is_active || !config.site_url) {
    throw new Error('Chưa kích hoạt hoặc cấu hình tích hợp WooCommerce.');
  }

  const supabase = getAdminSupabaseClient();
  const { data: tour, error: tourError } = await supabase
    .from('tours')
    .select('*')
    .eq('id', tourId)
    .single();

  if (tourError || !tour) {
    throw new Error(`Không tìm thấy tour ID: ${tourId}`);
  }

  const explicitSku = (tour.wp_product_sku || '').trim();
  const tourCode = (tour.code || '').trim();
  const skuPrefix = explicitSku || extractSkuPrefix(tourCode);

  // Xác định Target Product ID trên WooCommerce theo Quy tắc 4 Tầng
  let targetWpProductId: number | undefined = undefined;
  let existingProduct: any = null;
  let matchMethod: 'target_id' | 'linked' | 'sku_prefix' | 'acf_departure' | 'name_match' | 'new' = 'new';

  // TẦNG 1: Người dùng chọn sản phẩm đích cụ thể hoặc tour đã có wp_product_id
  if (options?.target_product_id && options.target_product_id !== 'new') {
    targetWpProductId = Number(options.target_product_id);
    matchMethod = 'target_id';
  } else if (!options?.force_new && options?.target_product_id !== 'new') {
    if (tour.wp_product_id) {
      targetWpProductId = Number(tour.wp_product_id);
      matchMethod = 'linked';
    }
  }

  // Nếu đã có targetWpProductId từ Tầng 1, kiểm tra trên WooCommerce
  if (targetWpProductId) {
    try {
      const getRes = await callWooCommerceApi(config, `/products/${targetWpProductId}`, 'GET');
      if (getRes.data?.id) {
        existingProduct = getRes.data;
      } else {
        targetWpProductId = undefined;
      }
    } catch (e) {
      console.warn(`[WooCommerce] Không tìm thấy sản phẩm ID #${targetWpProductId}:`, e);
      targetWpProductId = undefined;
    }
  }

  // TẦNG 2 (MỚI): Khớp theo Mã SKU Sản phẩm Web (wp_product_sku) hoặc tiền tố SKU
  if (!targetWpProductId && !options?.force_new && options?.target_product_id !== 'new') {
    const searchSku = explicitSku || skuPrefix;
    if (searchSku) {
      try {
        // 1. Tìm chính xác theo searchSku
        const skuRes = await callWooCommerceApi(config, '/products', 'GET', undefined, {
          sku: searchSku,
          per_page: 5
        });
        if (Array.isArray(skuRes.data) && skuRes.data.length > 0) {
          const found = skuRes.data.find((p: any) => normalizeSku(p.sku) === normalizeSku(searchSku)) || skuRes.data[0];
          if (found?.id) {
            targetWpProductId = found.id;
            existingProduct = found;
            matchMethod = 'sku_prefix';
          }
        }

        // 2. Nếu chưa thấy và có tourCode khác searchSku, thử tìm SKU = tourCode
        if (!targetWpProductId && tourCode !== searchSku) {
          const codeRes = await callWooCommerceApi(config, '/products', 'GET', undefined, {
            sku: tourCode,
            per_page: 3
          });
          if (Array.isArray(codeRes.data) && codeRes.data.length > 0) {
            targetWpProductId = codeRes.data[0].id;
            existingProduct = codeRes.data[0];
            matchMethod = 'sku_prefix';
          }
        }
      } catch (e) {
        console.warn('[WooCommerce] Tìm sản phẩm theo SKU thất bại:', e);
      }
    }
  }

  // TẦNG 3: Mã lịch trình đã có trong danh sách đợt khởi hành ACF departures của sản phẩm
  if (!targetWpProductId && !options?.force_new && options?.target_product_id !== 'new' && tourCode) {
    try {
      const searchRes = await callWooCommerceApi(config, '/products', 'GET', undefined, {
        search: tourCode,
        per_page: 5
      });
      if (Array.isArray(searchRes.data) && searchRes.data.length > 0) {
        const repeaterSlug = (config.repeater_slug || 'lich_trinh_khoi_hanh').trim();
        const codeSlug = (config.field_mappings?.code || 'ma_lich_trinh').trim();

        const found = searchRes.data.find((p: any) => {
          if (!Array.isArray(p.meta_data)) return false;
          const repMeta = p.meta_data.find((m: any) => m.key === repeaterSlug);
          if (!repMeta || !Array.isArray(repMeta.value)) return false;
          return repMeta.value.some((row: any) => {
            const rowCode = String(row[codeSlug] || row.ma_lich_trinh || row.code || '').trim().toUpperCase();
            return rowCode === tourCode.toUpperCase();
          });
        });

        if (found?.id) {
          targetWpProductId = found.id;
          existingProduct = found;
          matchMethod = 'acf_departure';
        }
      }
    } catch (e) {
      console.warn('[WooCommerce] Tìm sản phẩm theo đợt khởi hành ACF thất bại:', e);
    }
  }

  // TẦNG 4: So khớp theo tên chương trình tour tương đồng
  if (!targetWpProductId && !options?.force_new && options?.target_product_id !== 'new' && tour.name) {
    try {
      const searchRes = await callWooCommerceApi(config, '/products', 'GET', undefined, {
        search: tour.name,
        per_page: 5
      });
      if (Array.isArray(searchRes.data) && searchRes.data.length > 0) {
        const exactMatch = searchRes.data.find(
          (p: any) => p.name?.trim().toLowerCase() === tour.name.trim().toLowerCase()
        ) || searchRes.data[0];
        if (exactMatch?.id) {
          targetWpProductId = exactMatch.id;
          existingProduct = exactMatch;
          matchMethod = 'name_match';
        }
      }
    } catch (e) {
      console.warn('[WooCommerce] Tìm sản phẩm theo tên thất bại:', e);
    }
  }

  // Tìm tất cả các tour trên CRM thuộc cùng sản phẩm này (hoặc lấy chính xác theo group_tour_ids)
  let groupTours: any[] = [tour];
  if (options?.group_tour_ids && Array.isArray(options.group_tour_ids) && options.group_tour_ids.length > 0) {
    const { data: requestedTours } = await supabase
      .from('tours')
      .select('*')
      .in('id', options.group_tour_ids);
    if (requestedTours && requestedTours.length > 0) {
      groupTours = requestedTours;
    }
  } else {
    const orConditions: string[] = [`name.eq."${tour.name}"`];
    if (targetWpProductId) {
      orConditions.push(`wp_product_id.eq.${targetWpProductId}`);
    }
    if (explicitSku) {
      orConditions.push(`wp_product_sku.eq."${explicitSku}"`);
    }
    if (skuPrefix && skuPrefix.length >= 3) {
      orConditions.push(`code.like.${skuPrefix}%`);
    }

    const { data: siblingTours } = await supabase
      .from('tours')
      .select('*')
      .or(orConditions.join(','));

    groupTours = (siblingTours && siblingTours.length > 0) ? siblingTours : [tour];
  }

  // Sắp xếp các đợt trong groupTours theo ngày khởi hành
  groupTours.sort((a, b) => {
    const timeA = new Date(a.departure_time || a.start_date || 0).getTime();
    const timeB = new Date(b.departure_time || b.start_date || 0).getTime();
    return timeA - timeB;
  });

  // Kiểm tra xem mã lịch trình của tour này đã có trong sản phẩm chưa
  const repeaterSlug = (config.repeater_slug || 'lich_trinh_khoi_hanh').trim();
  const codeSlug = (config.field_mappings?.code || 'ma_lich_trinh').trim();
  let departureAction: 'added' | 'updated' = 'added';

  if (existingProduct && Array.isArray(existingProduct.meta_data)) {
    const existingMeta = existingProduct.meta_data.find((m: any) => m.key === repeaterSlug);
    if (existingMeta && Array.isArray(existingMeta.value)) {
      const hasCode = existingMeta.value.some((row: any) => {
        const c = String(row[codeSlug] || row.ma_lich_trinh || row.code || '').trim().toUpperCase();
        return c === String(tour.code).trim().toUpperCase();
      });
      if (hasCode) {
        departureAction = 'updated';
      }
    }
  }

  const payload = buildWooCommercePayload(tour, groupTours, config, existingProduct, options);

  let finalProductId = targetWpProductId;
  let productUrl = '';
  let isUpdate = false;
  const allTourIds = groupTours.map((t: any) => t.id);

  try {
    if (targetWpProductId) {
      // Cập nhật sản phẩm có sẵn trên website
      const updateRes = await callWooCommerceApi(config, `/products/${targetWpProductId}`, 'PUT', payload);
      finalProductId = updateRes.data.id;
      productUrl = updateRes.data.permalink || '';
      isUpdate = true;
    } else {
      // Tạo sản phẩm mới hoàn toàn trên website
      const createRes = await callWooCommerceApi(config, '/products', 'POST', payload);
      finalProductId = createRes.data.id;
      productUrl = createRes.data.permalink || '';
    }

    // Cập nhật lại wp_product_id và trạng thái đồng bộ cho TOÀN BỘ các đợt trong nhóm
    const now = new Date().toISOString();
    const actionDesc = isUpdate 
      ? (departureAction === 'updated' ? `Cập nhật ${groupTours.length} đợt vào SP #${finalProductId}` : `Thêm mới ${groupTours.length} đợt vào SP #${finalProductId}`)
      : `Tạo mới SP #${finalProductId} với ${groupTours.length} đợt khởi hành`;

    await supabase
      .from('tours')
      .update({
        wp_product_id: finalProductId,
        wp_product_sku: explicitSku || existingProduct?.sku || skuPrefix || tour.code,
        wp_sync_status: 'synced',
        wp_last_synced_at: now,
        wp_sync_message: `Đồng bộ thành công (${actionDesc})`
      })
      .in('id', allTourIds);

    return {
      success: true,
      product_id: finalProductId,
      product_name: isUpdate && existingProduct?.name ? existingProduct.name : tour.name,
      product_url: productUrl,
      action: isUpdate ? 'updated' : 'created',
      departure_action: departureAction,
      synced_tours_count: groupTours.length,
      message: isUpdate 
        ? `Đã cập nhật thành công ${groupTours.length} đợt khởi hành vào sản phẩm "${existingProduct?.name || tour.name}" (#${finalProductId}) trên website.`
        : `Đã tạo mới sản phẩm "${tour.name}" (#${finalProductId}) với ${groupTours.length} đợt khởi hành trên website.`
    };
  } catch (err: any) {
    const errorMsg = err.data?.message || err.message || 'Lỗi không xác định';

    // Ghi nhận lỗi vào tất cả các tour trong nhóm
    await supabase
      .from('tours')
      .update({
        wp_sync_status: 'failed',
        wp_last_synced_at: new Date().toISOString(),
        wp_sync_message: `Lỗi: ${errorMsg}`
      })
      .in('id', allTourIds);

    throw new Error(`Đồng bộ thất bại: ${errorMsg}`);
  }
}

/**
 * Đồng bộ toàn bộ tour đang hoạt động sang WooCommerce (tự động gom nhóm theo Tên Tour)
 */
export async function syncAllToursToWooCommerce() {
  const config = await getWooCommerceConfig();
  if (!config.is_active || !config.site_url) {
    throw new Error('Chưa kích hoạt hoặc cấu hình tích hợp WooCommerce.');
  }

  const supabase = getAdminSupabaseClient();
  const { data: tours, error } = await supabase
    .from('tours')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !tours || tours.length === 0) {
    return {
      success: true,
      total: 0,
      synced: 0,
      failed: 0,
      results: []
    };
  }

  // Gom nhóm các tour theo Tên Tour
  const groupsMap = new Map<string, any[]>();
  for (const t of tours) {
    const key = (t.name || t.code || 'Tour').trim();
    if (!groupsMap.has(key)) {
      groupsMap.set(key, []);
    }
    groupsMap.get(key)!.push(t);
  }

  const results: any[] = [];
  let syncedCount = 0;
  let failedCount = 0;

  for (const [tourName, group] of groupsMap.entries()) {
    const primaryTour = group[0];
    try {
      const res = await syncTourToWooCommerce(primaryTour.id);
      results.push({
        name: tourName,
        success: true,
        product_id: res.product_id,
        departures_count: group.length,
        departures: group.map(g => g.code)
      });
      syncedCount += group.length;
    } catch (e: any) {
      results.push({
        name: tourName,
        success: false,
        error: e.message,
        departures_count: group.length,
        departures: group.map(g => g.code)
      });
      failedCount += group.length;
    }
  }

  return {
    success: true,
    total: tours.length,
    total_groups: groupsMap.size,
    synced: syncedCount,
    failed: failedCount,
    results
  };
}
