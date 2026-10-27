import crypto from 'crypto';
import { getAdminSupabaseClient } from './supabaseService.js';

export interface MetaCapiEventParams {
  event_name: 'Lead' | 'Purchase' | 'Contact' | 'CompleteRegistration' | string;
  tracking_type: 'PHONE_LEAD' | 'FORM_LEAD' | 'ORDER_CREATED' | 'PURCHASE_REVENUE' | string;
  event_id?: string;
  order_id?: string | null;
  tour_id?: string | null;
  tour_code?: string | null;
  tour_name?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  meta_lead_id?: string | null;
  revenue_value?: number;
  currency?: string;
  pax_count?: number;
  test_event_code?: string | null;
  client_ip_address?: string | null;
  client_user_agent?: string | null;
  utm_source?: string | null;
  utm_campaign?: string | null;
}

export interface MetaCapiConfigData {
  pixel_id: string;
  access_token: string;
  test_event_code?: string;
  is_enabled: boolean;
}

/**
 * Chuẩn hóa số điện thoại Việt Nam & quốc tế sang E.164 không có dấu +
 * Ví dụ: 0912345678 -> 84912345678
 *        +84 912 345 678 -> 84912345678
 */
export function normalizePhone(phone: string): string {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  if (!digits) return '';

  if (digits.startsWith('0')) {
    // 0912345678 -> 84912345678
    digits = '84' + digits.substring(1);
  } else if (digits.length === 9 && (digits.startsWith('3') || digits.startsWith('5') || digits.startsWith('7') || digits.startsWith('8') || digits.startsWith('9'))) {
    // 912345678 -> 84912345678
    digits = '84' + digits;
  }
  return digits;
}

/**
 * Mã hóa SHA-256 theo chuẩn bảo mật PII của Meta Graph API
 */
export function hashSha256(text: string): string {
  if (!text) return '';
  return crypto.createHash('sha256').update(text.trim().toLowerCase()).digest('hex');
}

/**
 * Chuẩn hóa và mã hóa SHA-256 số điện thoại
 */
export function normalizeAndHashPhone(phone: string): { normalized: string; hashed: string } {
  const normalized = normalizePhone(phone);
  const hashed = normalized ? hashSha256(normalized) : '';
  return { normalized, hashed };
}

/**
 * Chuẩn hóa và mã hóa SHA-256 email
 */
export function normalizeAndHashEmail(email: string): string {
  if (!email) return '';
  return hashSha256(email.trim().toLowerCase());
}

/**
 * Lấy cấu hình Meta CAPI từ Database hoặc biến môi trường (.env)
 */
export async function getMetaCapiConfig(): Promise<MetaCapiConfigData> {
  const envPixelId = process.env.META_PIXEL_ID || '';
  const envAccessToken = process.env.META_CAPI_ACCESS_TOKEN || '';
  const envTestEventCode = process.env.META_TEST_EVENT_CODE || '';

  try {
    const supabase = getAdminSupabaseClient();
    const { data, error } = await supabase
      .from('meta_capi_settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data && !error) {
      return {
        pixel_id: data.pixel_id || envPixelId,
        access_token: data.access_token || envAccessToken,
        test_event_code: data.test_event_code || envTestEventCode,
        is_enabled: data.is_enabled !== false
      };
    }
  } catch (err) {
    console.warn('[Meta CAPI] Không thể đọc cài đặt từ DB, dùng biến môi trường:', err);
  }

  return {
    pixel_id: envPixelId,
    access_token: envAccessToken,
    test_event_code: envTestEventCode,
    is_enabled: true
  };
}

/**
 * Gửi sự kiện chuyển đổi lên Meta Conversions API và ghi log vào Supabase
 */
export async function sendMetaConversionEvent(params: MetaCapiEventParams): Promise<{
  success: boolean;
  event_id: string;
  status: string;
  response?: any;
  error?: string;
}> {
  const eventId = params.event_id || crypto.randomUUID();
  const config = await getMetaCapiConfig();

  // Chuẩn hóa và mã hóa thông tin người dùng PII
  const { normalized: normalizedPhone, hashed: hashedPhone } = normalizeAndHashPhone(params.customer_phone || '');
  const hashedEmail = params.customer_email ? normalizeAndHashEmail(params.customer_email) : '';
  const hashedName = params.customer_name ? hashSha256(params.customer_name.trim().toLowerCase()) : '';

  // Xây dựng User Data cho Meta CAPI
  const userData: Record<string, any> = {};
  if (hashedPhone) userData.ph = [hashedPhone];
  if (hashedEmail) userData.em = [hashedEmail];
  if (hashedName) userData.fn = [hashedName];
  if (params.meta_lead_id) userData.lead_id = params.meta_lead_id;
  if (params.client_ip_address) userData.client_ip_address = params.client_ip_address;
  if (params.client_user_agent) userData.client_user_agent = params.client_user_agent;

  // Xây dựng Custom Data cho Meta CAPI
  const revenueValue = Number(params.revenue_value) || 0;
  const customData: Record<string, any> = {
    currency: params.currency || 'VND',
    value: revenueValue
  };

  if (params.tour_name || params.tour_code) {
    customData.content_name = params.tour_name || params.tour_code;
    customData.content_category = 'Tour du lịch';
  }
  if (params.order_id) {
    customData.order_id = params.order_id;
  }
  if (params.pax_count && params.pax_count > 0) {
    customData.num_items = params.pax_count;
  }

  const metaEventPayload = {
    event_name: params.event_name,
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    action_source: 'system_generated',
    user_data: userData,
    custom_data: customData
  };

  const testCode = params.test_event_code || config.test_event_code;
  const requestBody: Record<string, any> = {
    data: [metaEventPayload]
  };
  if (testCode && testCode.trim()) {
    requestBody.test_event_code = testCode.trim();
  }

  let finalStatus: 'success' | 'error' | 'pending_config' = 'success';
  let errorMessage: string | null = null;
  let responseData: any = null;

  // Kiểm tra xem đã có Pixel ID & Access Token chưa
  if (!config.pixel_id || !config.access_token) {
    finalStatus = 'pending_config';
    errorMessage = 'Chưa cấu hình Meta Pixel ID hoặc Meta CAPI Access Token trong Hệ thống / Biến môi trường';
    console.warn(`[Meta CAPI] Sự kiện [${params.event_name}] đã ghi nhận trên CRM nhưng chưa gửi lên Meta vì thiếu cấu hình Pixel/Token.`);
  } else if (!config.is_enabled) {
    finalStatus = 'pending_config';
    errorMessage = 'Tính năng Meta CAPI đang bị tắt trong cài đặt hệ thống';
  } else {
    try {
      const graphUrl = `https://graph.facebook.com/v19.0/${config.pixel_id}/events?access_token=${config.access_token}`;
      const res = await fetch(graphUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      responseData = await res.json();

      if (!res.ok || responseData.error) {
        finalStatus = 'error';
        errorMessage = responseData.error?.message || `Meta API trả về mã lỗi ${res.status}`;
        console.error('[Meta CAPI] Lỗi khi gửi sự kiện lên Meta:', responseData);
      } else {
        console.log(`[Meta CAPI] Bắn sự kiện [${params.event_name}] thành công! Events Received: ${responseData.events_received || 1}, Event ID: ${eventId}`);
      }
    } catch (apiErr: any) {
      finalStatus = 'error';
      errorMessage = apiErr.message || 'Lỗi mạng khi kết nối đến Meta Graph API';
      console.error('[Meta CAPI] Ngoại lệ kết nối Meta Graph API:', apiErr);
    }
  }

  // Ghi log vào bảng meta_conversion_logs trên Supabase
  try {
    const supabase = getAdminSupabaseClient();
    const logData = {
      order_id: params.order_id || null,
      tour_id: params.tour_id || null,
      tour_code: params.tour_code || null,
      event_name: params.event_name,
      tracking_type: params.tracking_type,
      event_id: eventId,
      meta_lead_id: params.meta_lead_id || null,
      customer_phone: params.customer_phone || null,
      customer_email: params.customer_email || null,
      hashed_phone: hashedPhone || null,
      hashed_email: hashedEmail || null,
      revenue_value: revenueValue,
      currency: params.currency || 'VND',
      payload: requestBody,
      response_data: responseData,
      status: finalStatus,
      error_message: errorMessage,
      created_at: new Date().toISOString()
    };

    const { error: logErr } = await supabase.from('meta_conversion_logs').insert(logData);
    if (logErr) {
      console.warn('[Meta CAPI] Không thể ghi log vào database meta_conversion_logs:', logErr.message);
    }
  } catch (logEx) {
    console.warn('[Meta CAPI] Lỗi khi lưu log Meta CAPI:', logEx);
  }

  return {
    success: finalStatus === 'success',
    event_id: eventId,
    status: finalStatus,
    response: responseData,
    error: errorMessage || undefined
  };
}
