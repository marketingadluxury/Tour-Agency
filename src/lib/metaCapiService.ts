import { MetaConversionLog, MetaTrackingType, MetaEventName } from '@/types';
import { safeFetchApi } from './utils';
import { supabase } from './supabase';

export interface TriggerMetaEventParams {
  event_name: MetaEventName | string;
  tracking_type: MetaTrackingType;
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
  utm_source?: string | null;
  utm_campaign?: string | null;
}

/**
 * Gửi sự kiện chuyển đổi Meta CAPI từ phía Client (an toàn, không block UI)
 */
export async function triggerMetaCapiEvent(params: TriggerMetaEventParams): Promise<{
  success: boolean;
  event_id?: string;
  status?: string;
  error?: string;
}> {
  try {
    const payload = {
      event_name: params.event_name,
      tracking_type: params.tracking_type,
      event_id: params.event_id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined),
      order_id: params.order_id,
      tour_id: params.tour_id,
      tour_code: params.tour_code,
      tour_name: params.tour_name,
      customer_name: params.customer_name,
      customer_phone: params.customer_phone,
      customer_email: params.customer_email,
      meta_lead_id: params.meta_lead_id,
      revenue_value: params.revenue_value || 0,
      currency: params.currency || 'VND',
      pax_count: params.pax_count,
      test_event_code: params.test_event_code,
      utm_source: params.utm_source,
      utm_campaign: params.utm_campaign
    };

    const res = await safeFetchApi('/api/meta-capi/send-event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    return res;
  } catch (err: any) {
    console.warn('[Client Meta CAPI] Không thể gửi sự kiện Meta CAPI:', err);
    return {
      success: false,
      error: err.message || 'Lỗi kết nối Meta CAPI'
    };
  }
}

/**
 * Lấy cấu hình Meta CAPI từ backend hoặc trực tiếp từ Supabase
 */
export async function fetchMetaCapiConfig(): Promise<any> {
  try {
    const res = await safeFetchApi('/api/meta-capi/config', { method: 'GET' });
    return res.data;
  } catch (err) {
    console.warn('[Client Meta CAPI] Không thể gọi API, thử lấy trực tiếp từ Supabase:', err);
    try {
      const { data } = await supabase
        .from('system_integrations')
        .select('*')
        .eq('integration_type', 'meta_capi')
        .maybeSingle();
      if (data) {
        return {
          pixel_id: data.config?.pixel_id || '',
          access_token_masked: data.config?.access_token ? '******' : '',
          has_access_token: Boolean(data.config?.access_token),
          test_event_code: data.config?.test_event_code || '',
          is_enabled: data.is_active
        };
      }
    } catch (dbErr) {}
    return null;
  }
}

/**
 * Lưu cấu hình Meta CAPI
 */
export async function saveMetaCapiConfig(config: {
  pixel_id: string;
  access_token: string;
  test_event_code?: string;
  is_enabled: boolean;
}): Promise<any> {
  return await safeFetchApi('/api/meta-capi/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });
}

/**
 * Lấy nhật ký sự kiện Meta Conversion Logs
 */
export async function fetchMetaConversionLogs(limit: number = 100, eventName?: string): Promise<MetaConversionLog[]> {
  try {
    const url = `/api/meta-capi/logs?limit=${limit}${eventName && eventName !== 'all' ? `&event_name=${eventName}` : ''}`;
    const res = await safeFetchApi(url, { method: 'GET' });
    return res.data || [];
  } catch (err) {
    console.warn('[Client Meta CAPI] Không thể gọi API logs, thử lấy trực tiếp từ Supabase:', err);
    try {
      let query = supabase
        .from('meta_conversion_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (eventName && eventName !== 'all') {
        query = query.eq('event_name', eventName);
      }
      const { data } = await query;
      return (data as MetaConversionLog[]) || [];
    } catch (dbErr) {}
    return [];
  }
}

/**
 * Gửi sự kiện kiểm tra kết nối Test Event
 */
export async function testMetaConnection(params?: {
  pixel_id?: string;
  access_token?: string;
  test_event_code?: string;
}): Promise<any> {
  return await safeFetchApi('/api/meta-capi/test-connection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params || {})
  });
}

/**
 * Lấy danh sách khách hàng tiềm năng (Leads) từ Meta Messenger Webhook hoặc Supabase
 */
export async function fetchMetaLeads(params?: {
  search?: string;
  status?: string;
  hasPhoneOnly?: boolean;
}): Promise<any[]> {
  try {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status && params.status !== 'all') query.append('status', params.status);
    if (params?.hasPhoneOnly) query.append('has_phone', 'true');

    const qs = query.toString();
    const endpoint = qs ? `/api/meta-leads?${qs}` : '/api/meta-leads';
    const res = await safeFetchApi(endpoint, { method: 'GET' });
    return res.data || [];
  } catch (err) {
    try {
      let q = supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (params?.status && params.status !== 'all') {
        q = q.eq('status', params.status);
      }
      if (params?.search) {
        q = q.or(`customer_name.ilike.%${params.search}%,customer_phone.ilike.%${params.search}%,message_text.ilike.%${params.search}%`);
      }
      if (params?.hasPhoneOnly) {
        q = q.not('customer_phone', 'is', null);
      }
      const { data } = await q;
      return data || [];
    } catch (dbErr) {}
    return [];
  }
}

/**
 * Cập nhật thông tin Lead (trạng thái, ghi chú, gán người phụ trách)
 */
export async function updateMetaLead(leadId: string, data: {
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  customer_avatar?: string;
  gender?: string;
  birthday?: string;
  fb_id?: string;
  status?: string;
  notes?: string;
  assigned_to?: string;
  [key: string]: any;
}): Promise<any> {
  try {
    return await safeFetchApi(`/api/meta-leads/${leadId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  } catch (err) {
    const { error } = await supabase.from('leads').update(data).eq('id', leadId);
    if (error) throw error;
    return { success: true };
  }
}

/**
 * Xóa Lead khỏi danh sách
 */
export async function deleteMetaLead(leadId: string): Promise<any> {
  try {
    return await safeFetchApi(`/api/meta-leads/${leadId}`, {
      method: 'DELETE'
    });
  } catch (err) {
    const { error } = await supabase.from('leads').delete().eq('id', leadId);
    if (error) throw error;
    return { success: true };
  }
}

/**
 * Lấy cấu hình Pancake Public API
 */
export async function fetchPancakeConfig(): Promise<any> {
  try {
    const res = await safeFetchApi('/api/pancake/config', { method: 'GET' });
    return res.data;
  } catch (err) {
    console.warn('[Pancake Service] Không thể gọi API pancake config, thử lấy trực tiếp từ Supabase:', err);
    try {
      const { data } = await supabase
        .from('system_integrations')
        .select('*')
        .eq('integration_type', 'pancake')
        .maybeSingle();
      if (data) {
        return {
          api_key_masked: data.config?.api_key ? '******' : '',
          has_api_key: Boolean(data.config?.api_key),
          is_active: data.is_active,
          auto_sync: data.config?.auto_sync,
          last_synced_at: data.last_synced_at
        };
      }
    } catch (dbErr) {}
    return null;
  }
}

/**
 * Lưu cấu hình Pancake Public API
 */
export async function savePancakeConfig(config: {
  api_key: string;
  is_active: boolean;
  auto_sync?: boolean;
}): Promise<any> {
  return await safeFetchApi('/api/pancake/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });
}

/**
 * Kiểm tra kết nối với Pancake Public API
 */
export async function testPancakeConnection(apiKey?: string): Promise<{
  success: boolean;
  pages?: Array<{ id: string; name: string; username?: string }>;
  error?: string;
}> {
  return await safeFetchApi('/api/pancake/test-connection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey })
  });
}

/**
 * Đồng bộ hội thoại & SĐT từ Pancake về Tour CRM
 */
export async function syncPancakeLeads(): Promise<{
  success: boolean;
  leads_synced?: number;
  conversations_checked?: number;
  phones_found?: number;
  error?: string;
}> {
  return await safeFetchApi('/api/pancake/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Bắn thử nghiệm giả lập sự kiện Meta Webhook (Realtime simulation)
 */
export async function simulateMetaWebhook(data?: {
  customer_name?: string;
  customer_phone?: string;
  message_text?: string;
  page_id?: string;
}): Promise<{
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}> {
  return await safeFetchApi('/api/meta/webhook/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data || {})
  });
}

/**
 * Lấy danh sách Tỉnh/Thành phố từ Pancake POS Geo API
 */
export async function fetchPosCakeProvinces(): Promise<{ success: boolean; data: any[]; error?: string }> {
  return await safeFetchApi('/api/pancake/pos/geo/provinces', { method: 'GET' });
}

/**
 * Lấy danh sách Quận/Huyện theo Tỉnh từ Pancake POS Geo API
 */
export async function fetchPosCakeDistricts(provinceId: string): Promise<{ success: boolean; data: any[]; error?: string }> {
  return await safeFetchApi(`/api/pancake/pos/geo/districts?province_id=${encodeURIComponent(provinceId)}`, { method: 'GET' });
}

/**
 * Lấy danh sách Xã/Phường theo Huyện từ Pancake POS Geo API
 */
export async function fetchPosCakeCommunes(districtId: string): Promise<{ success: boolean; data: any[]; error?: string }> {
  return await safeFetchApi(`/api/pancake/pos/geo/communes?district_id=${encodeURIComponent(districtId)}`, { method: 'GET' });
}

/**
 * Lấy danh sách Cửa hàng từ POS Cake API
 */
export async function fetchPosCakeShops(): Promise<{ success: boolean; data: any[]; error?: string }> {
  return await safeFetchApi('/api/pancake/pos/shops', { method: 'GET' });
}


