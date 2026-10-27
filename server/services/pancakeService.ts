import { getAdminSupabaseClient } from './supabaseService.js';
import { extractVietnamesePhone, extractEmail, saveLeadToDatabase, LeadRecord } from './metaMessengerService.js';
import { sendMetaConversionEvent, getMetaCapiConfig } from './metaCapiService.js';
import { sendInternalSystemNotification } from './botcakeService.js';

export interface PancakeConfig {
  api_key?: string;
  webhook_secret?: string;
  is_active?: boolean;
  auto_sync?: boolean;
  last_synced_at?: string;
  last_lead_at?: string;
}

/**
 * Lấy cấu hình Pancake Public API từ database
 */
export async function getPancakeConfig(): Promise<PancakeConfig> {
  const supabase = getAdminSupabaseClient();
  try {
    const { data, error } = await supabase
      .from('system_integrations')
      .select('config, is_active, updated_at')
      .eq('integration_type', 'pancake')
      .maybeSingle();

    // Lấy thời gian lead Pancake gần nhất
    let lastLeadTime: string | undefined = undefined;
    try {
      const { data: latestLead } = await supabase
        .from('meta_leads')
        .select('created_at')
        .or('source_channel.ilike.%pancake%,utm_source.ilike.%pancake%,source_channel.ilike.%pos%')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latestLead?.created_at) {
        lastLeadTime = latestLead.created_at;
      }
    } catch (e) {
      console.warn('[Pancake Service] Không thể lấy last_lead_at:', e);
    }

    if (error || !data) {
      // Fallback: check environment variable
      return {
        api_key: process.env.PANCAKE_PUBLIC_API_TOKEN || '',
        webhook_secret: process.env.PANCAKE_WEBHOOK_SECRET || '',
        is_active: Boolean(process.env.PANCAKE_PUBLIC_API_TOKEN),
        auto_sync: true,
        last_lead_at: lastLeadTime
      };
    }

    return {
      api_key: data.config?.api_key || '',
      webhook_secret: data.config?.webhook_secret || '',
      is_active: data.is_active !== false,
      auto_sync: data.config?.auto_sync !== false,
      last_synced_at: data.updated_at,
      last_lead_at: lastLeadTime || data.config?.last_lead_at
    };
  } catch (err: any) {
    console.warn('[Pancake Service] Lỗi khi lấy config:', err.message);
    return {
      api_key: process.env.PANCAKE_PUBLIC_API_TOKEN || '',
      webhook_secret: process.env.PANCAKE_WEBHOOK_SECRET || '',
      is_active: false
    };
  }
}

/**
 * Lưu cấu hình Pancake Public API
 */
export async function savePancakeConfig(config: PancakeConfig): Promise<{ success: boolean; error?: string }> {
  const supabase = getAdminSupabaseClient();
  const now = new Date().toISOString();
  try {
    const { data: existing } = await supabase
      .from('system_integrations')
      .select('id, config')
      .eq('integration_type', 'pancake')
      .maybeSingle();

    const currentConfig = existing?.config || {};

    const payload = {
      integration_type: 'pancake',
      config: {
        ...currentConfig,
        api_key: config.api_key !== undefined ? config.api_key.trim() : (currentConfig.api_key || ''),
        webhook_secret: config.webhook_secret !== undefined ? config.webhook_secret.trim() : (currentConfig.webhook_secret || ''),
        auto_sync: config.auto_sync !== false
      },
      is_active: config.is_active !== false,
      updated_at: now
    };

    if (existing) {
      const { error } = await supabase
        .from('system_integrations')
        .update(payload)
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('system_integrations')
        .insert([payload]);
      if (error) throw error;
    }

    return { success: true };
  } catch (err: any) {
    console.error('[Pancake Service] Lỗi khi lưu config:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Hàm helper phân tích JWT Token (nếu token là JWT)
 */
function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.trim().split('.');
    if (parts.length === 3) {
      const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const jsonStr = Buffer.from(payloadBase64, 'base64').toString('utf8');
      return JSON.parse(jsonStr);
    }
  } catch (e) {
    // Không phải JWT token hợp lệ
  }
  return null;
}

/**
 * Hàm helper gọi API Pancake lấy danh sách Pages/Shops an toàn
 */
async function fetchPagesFromPancake(token: string): Promise<any[]> {
  const cleanToken = token.trim();
  const headers = {
    'Accept': 'application/json, text/plain, */*',
    'User-Agent': 'TourCRM/1.0'
  };

  // 1. Kiểm tra nếu Token là dạng JWT (Page Access Token hoặc User Token mã hóa)
  const jwtPayload = decodeJwtPayload(cleanToken);
  if (jwtPayload) {
    const pageId = jwtPayload.page_id || jwtPayload.pageId || jwtPayload.id;
    const pageName = jwtPayload.page_name || jwtPayload.name || 'Fanpage Pancake';
    
    if (pageId) {
      try {
        const testUrl = `https://pages.fm/api/public_api/v1/pages/${pageId}/conversations?page_access_token=${encodeURIComponent(cleanToken)}&page_size=1`;
        const testRes = await fetch(testUrl, { headers });
        if (testRes.ok) {
          return [{
            id: String(pageId),
            name: pageName,
            page_access_token: cleanToken
          }];
        }
      } catch (e) {
        // Silent fallback
      }
    }
  }

  // 2. Thử endpoint v1 chuẩn của Pancake (User Access Token)
  const url1 = `https://pages.fm/api/v1/pages?access_token=${encodeURIComponent(cleanToken)}`;
  try {
    const res1 = await fetch(url1, { method: 'GET', headers });
    if (res1.ok) {
      const data1 = await res1.json() as any;
      const pages = data1.pages || data1.data || (Array.isArray(data1) ? data1 : []);
      if (pages && pages.length > 0) return pages;
    }
  } catch (e) {
    // Silent fallback
  }

  // 3. Thử endpoint public_api v1
  const url2 = `https://pages.fm/api/public_api/v1/pages?access_token=${encodeURIComponent(cleanToken)}`;
  try {
    const res2 = await fetch(url2, { method: 'GET', headers });
    if (res2.ok) {
      const data2 = await res2.json() as any;
      const pages = data2.pages || data2.data || (Array.isArray(data2) ? data2 : []);
      if (pages && pages.length > 0) return pages;
    }
  } catch (e) {
    // Silent fallback
  }

  // 4. Thử với Header Authorization: Bearer
  try {
    const res3 = await fetch('https://pages.fm/api/v1/pages', {
      method: 'GET',
      headers: {
        ...headers,
        'Authorization': `Bearer ${cleanToken}`
      }
    });
    if (res3.ok) {
      const data3 = await res3.json() as any;
      const pages = data3.pages || data3.data || (Array.isArray(data3) ? data3 : []);
      if (pages && pages.length > 0) return pages;
    }
  } catch (e) {
    // Silent fallback
  }

  // 5. Thử endpoint POS Cake (Shops) & Botcake Public API
  try {
    const posUrl = `https://pos.pages.fm/api/v1/shops?api_key=${encodeURIComponent(cleanToken)}`;
    const posRes = await fetch(posUrl, { method: 'GET', headers });
    if (posRes.ok) {
      const posData = await posRes.json() as any;
      const shops = posData.shops || posData.data || (Array.isArray(posData) ? posData : []);
      if (shops && shops.length > 0) {
        return shops.map((s: any) => ({
          id: String(s.id || s.shop_id),
          name: s.name || 'Cửa hàng POS Cake',
          is_pos: true,
          page_access_token: cleanToken
        }));
      }
    }
  } catch (e) {
    // Silent fallback
  }

  // 5.1 Thử endpoint Botcake Public API (Customers / Subscribers)
  try {
    const botcakeUrls = [
      `https://api.botcake.io/api/public_api/v1/customers?api_key=${encodeURIComponent(cleanToken)}&page_size=1`,
      `https://botcake.io/api/public_api/v1/subscribers?api_key=${encodeURIComponent(cleanToken)}&page_size=1`,
      `https://botcake.io/api/v1/customers?api_key=${encodeURIComponent(cleanToken)}&page_size=1`
    ];

    for (const bUrl of botcakeUrls) {
      const bRes = await fetch(bUrl, { method: 'GET', headers });
      if (bRes.ok) {
        return [{
          id: 'botcake_page',
          name: 'Fanpage Tour CRM (Botcake)',
          is_botcake: true,
          page_access_token: cleanToken
        }];
      }
    }
  } catch (e) {
    // Silent fallback
  }

  // 6. Kiểm tra nếu trong database đã có Fanpage sẵn từ Meta để test với Page Token này
  try {
    const supabase = getAdminSupabaseClient();
    const { data: dbPages } = await supabase.from('facebook_pages').select('page_id, page_name').limit(5);
    if (dbPages && dbPages.length > 0) {
      for (const p of dbPages) {
        const testConvUrl = `https://pages.fm/api/public_api/v1/pages/${p.page_id}/conversations?page_access_token=${encodeURIComponent(cleanToken)}&page_size=1`;
        const testConvRes = await fetch(testConvUrl, { headers });
        if (testConvRes.ok) {
          return [{
            id: p.page_id,
            name: p.page_name || 'Fanpage Tour CRM',
            page_access_token: cleanToken
          }];
        }
      }
    }
  } catch (e) {
    // ignore
  }

  // Nếu tất cả các cách trên không trả về dữ liệu thành công, gọi lại url1 để lấy thông điệp lỗi chính xác từ Pancake
  const finalRes = await fetch(url1, { method: 'GET', headers });
  if (!finalRes.ok) {
    const errText = await finalRes.text();
    let parsedMessage = errText;
    try {
      const jsonErr = JSON.parse(errText);
      parsedMessage = jsonErr.message || jsonErr.error || errText;
    } catch (e) {}
    throw new Error(`Pancake API phản hồi (${finalRes.status}): ${parsedMessage || 'Token không hợp lệ. Vui lòng lấy User Access Token tại Cài đặt cá nhân trên pages.fm'}`);
  }

  const finalData = await finalRes.json() as any;
  return finalData.pages || finalData.data || (Array.isArray(finalData) ? finalData : []);
}

/**
 * Kiểm tra kết nối với Pancake Public API bằng Token
 */
export async function testPancakeConnection(apiKey?: string): Promise<{
  success: boolean;
  pages?: Array<{ id: string; name: string; username?: string; avatar?: string }>;
  error?: string;
}> {
  const token = apiKey || (await getPancakeConfig()).api_key;
  if (!token || !token.trim()) {
    return { success: false, error: 'Chưa cung cấp Pancake Public API Access Token' };
  }

  try {
    const rawPages = await fetchPagesFromPancake(token);
    const pages = rawPages.map((p: any) => ({
      id: String(p.id || p.page_id),
      name: p.name || p.page_name || 'Fanpage',
      username: p.username || '',
      avatar: p.avatar_url || p.picture?.data?.url || null
    }));

    return {
      success: true,
      pages
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Lỗi kết nối tới Pancake: ${err.message}`
    };
  }
}

/**
 * Hàm helper lấy Page Access Token cho một Page cụ thể từ User Access Token
 */
async function resolvePageAccessToken(pageId: string, pageObj: any, userToken: string, headers: any): Promise<string> {
  // 1. Nếu trong pageObj đã có sẵn token
  if (pageObj?.page_access_token) return pageObj.page_access_token;
  if (pageObj?.settings?.page_access_token) return pageObj.settings.page_access_token;
  if (pageObj?.access_token && pageObj.access_token !== userToken) return pageObj.access_token;

  // 2. Thử gọi API sinh/lấy page_access_token bằng User Token
  try {
    const genUrl = `https://pages.fm/api/v1/pages/${pageId}/generate_page_access_token?access_token=${encodeURIComponent(userToken)}`;
    const res = await fetch(genUrl, { method: 'POST', headers });
    if (res.ok) {
      const data = await res.json() as any;
      const tok = data.page_access_token || data.access_token || data.token || data.data?.page_access_token;
      if (tok) return tok;
    }
  } catch (e) {}

  try {
    const genUrl2 = `https://pages.fm/api/public_api/v1/pages/${pageId}/generate_page_access_token?access_token=${encodeURIComponent(userToken)}`;
    const res2 = await fetch(genUrl2, { method: 'POST', headers });
    if (res2.ok) {
      const data2 = await res2.json() as any;
      const tok2 = data2.page_access_token || data2.access_token || data2.token;
      if (tok2) return tok2;
    }
  } catch (e) {}

  // 3. Thử lấy thông tin chi tiết Page
  try {
    const pUrl = `https://pages.fm/api/v1/pages/${pageId}?access_token=${encodeURIComponent(userToken)}`;
    const pRes = await fetch(pUrl, { method: 'GET', headers });
    if (pRes.ok) {
      const pData = await pRes.json() as any;
      const tok3 = pData.page_access_token || pData.settings?.page_access_token || pData.page?.page_access_token || pData.access_token;
      if (tok3) return tok3;
    }
  } catch (e) {}

  return userToken;
}

/**
 * Hàm helper lấy chi tiết tin nhắn và SĐT trong một cuộc hội thoại từ Pancake
 */
async function fetchConversationDetailsAndMessages(
  pageId: string, 
  convId: string, 
  customerId: string | undefined,
  pageToken: string, 
  userToken: string, 
  headers: any
): Promise<{
  lastCustomerMessage: string;
  phone: string | null;
  email: string | null;
}> {
  let lastCustomerMessage = '';
  let phone: string | null = null;
  let email: string | null = null;

  // 1. Thử lấy tin nhắn trong hội thoại
  const msgEndpoints = [
    `https://pages.fm/api/public_api/v1/pages/${pageId}/conversations/${convId}/messages?page_access_token=${encodeURIComponent(pageToken)}&page_size=30`,
    `https://pages.fm/api/public_api/v2/pages/${pageId}/conversations/${convId}/messages?page_access_token=${encodeURIComponent(pageToken)}&page_size=30`,
    `https://pages.fm/api/v1/pages/${pageId}/conversations/${convId}/messages?page_access_token=${encodeURIComponent(pageToken)}&page_size=30`,
    `https://pages.fm/api/v1/pages/${pageId}/conversations/${convId}/messages?access_token=${encodeURIComponent(userToken)}&page_size=30`,
  ];

  for (const endpoint of msgEndpoints) {
    try {
      const res = await fetch(endpoint, { headers });
      if (res.ok) {
        const data = await res.json() as any;
        const msgList = data.messages || data.data || (Array.isArray(data) ? data : []);
        if (Array.isArray(msgList) && msgList.length > 0) {
          // Duyệt từ tin mới nhất đến cũ nhất
          for (const msg of msgList) {
            const txt = String(msg.message || msg.text || msg.content || msg.snippet || '');
            if (!txt) continue;

            if (!lastCustomerMessage) {
              lastCustomerMessage = txt;
            }

            if (!phone) {
              const p = extractVietnamesePhone(txt);
              if (p) phone = p;
            }

            if (!email) {
              const em = extractEmail(txt);
              if (em) email = em;
            }

            // Kiểm tra các trường phụ trong tin nhắn
            if (!phone && msg.phone_number) {
              phone = extractVietnamesePhone(String(msg.phone_number));
            }
          }
          break; // Đã lấy được danh sách tin nhắn
        }
      }
    } catch (e) {}
  }

  // 2. Nếu vẫn chưa có SĐT và có customerId -> Thử tra cứu hồ sơ khách hàng trên Pancake
  if (!phone && customerId) {
    const custEndpoints = [
      `https://pages.fm/api/public_api/v1/pages/${pageId}/customers/${customerId}?page_access_token=${encodeURIComponent(pageToken)}`,
      `https://pages.fm/api/v1/pages/${pageId}/customers/${customerId}?page_access_token=${encodeURIComponent(pageToken)}`,
      `https://pages.fm/api/v1/pages/${pageId}/customers/${customerId}?access_token=${encodeURIComponent(userToken)}`,
    ];

    for (const custUrl of custEndpoints) {
      try {
        const cRes = await fetch(custUrl, { headers });
        if (cRes.ok) {
          const cData = await cRes.json() as any;
          const cust = cData.customer || cData.data || cData;
          if (cust) {
            const rawP = cust.phone || cust.mobile || cust.phone_number || (Array.isArray(cust.phone_numbers) ? cust.phone_numbers[0] : '');
            if (rawP) {
              const p = extractVietnamesePhone(String(rawP)) || String(rawP);
              if (p) phone = p;
            }
            if (!email && cust.email) {
              email = cust.email;
            }
            break;
          }
        }
      } catch (e) {}
    }
  }

  return { lastCustomerMessage, phone, email };
}

/**
 * Đồng bộ hội thoại và Lead (SĐT) từ Pancake về Tour CRM
 */
export async function syncPancakeConversations(): Promise<{
  success: boolean;
  leads_synced: number;
  conversations_checked: number;
  phones_found: number;
  error?: string;
}> {
  const config = await getPancakeConfig();
  if (!config.api_key || !config.is_active) {
    return { success: false, leads_synced: 0, conversations_checked: 0, phones_found: 0, error: 'Pancake chưa được cấu hình hoặc đang tắt' };
  }

  const token = config.api_key.trim();
  let totalLeadsSynced = 0;
  let totalConversationsChecked = 0;
  let totalPhonesFound = 0;

  try {
    // 1. Lấy danh sách Fanpage từ Pancake
    const pagesList = await fetchPagesFromPancake(token);
    const headers = {
      'Accept': 'application/json, text/plain, */*',
      'User-Agent': 'TourCRM/1.0'
    };

    const supabase = getAdminSupabaseClient();

    // 2. Với mỗi Page, quét các cuộc hội thoại và danh sách khách hàng
    for (const page of pagesList) {
      const pageId = String(page.id || page.page_id);
      const pageName = page.name || page.page_name || 'Fanpage Tour CRM';
      
      // Tìm Token phù hợp nhất cho trang này
      const pageToken = await resolvePageAccessToken(pageId, page, token, headers);

      let allConversations: any[] = [];
      const seenConvIds = new Set<string>();

      // A. Thử các endpoint lấy hội thoại (Conversations)
      const convEndpoints = [
        `https://pages.fm/api/public_api/v2/pages/${pageId}/conversations?page_access_token=${encodeURIComponent(pageToken)}&page_size=100`,
        `https://pages.fm/api/public_api/v1/pages/${pageId}/conversations?page_access_token=${encodeURIComponent(pageToken)}&page_size=100`,
        `https://pages.fm/api/v1/pages/${pageId}/conversations?page_access_token=${encodeURIComponent(pageToken)}&page_size=100`,
        `https://pages.fm/api/v1/pages/${pageId}/conversations?access_token=${encodeURIComponent(token)}&page_size=100`,
        `https://pages.fm/api/public_api/v1/pages/${pageId}/conversations?access_token=${encodeURIComponent(token)}&page_size=100`,
      ];

      for (const endpoint of convEndpoints) {
        try {
          const res = await fetch(endpoint, { headers });
          if (res.ok) {
            const data = await res.json() as any;
            const list = data.conversations || data.data || (Array.isArray(data) ? data : []);
            if (Array.isArray(list) && list.length > 0) {
              for (const item of list) {
                const itemId = String(item.id || item._id || item.conversation_id || '');
                if (itemId && !seenConvIds.has(itemId)) {
                  seenConvIds.add(itemId);
                  allConversations.push(item);
                } else if (!itemId) {
                  allConversations.push(item);
                }
              }
              break; // Đã lấy thành công danh sách hội thoại từ endpoint này
            }
          }
        } catch (e) {}
      }

      // B. Thử thêm endpoint lấy khách hàng (Customers / Subscribers) từ Botcake & Pancake theo chuẩn API Developers Botcake
      const customerEndpoints = [
        `https://api.botcake.io/api/public_api/v1/pages/${pageId}/customers?access_token=${encodeURIComponent(token)}&page_size=100`,
        `https://api.botcake.io/api/public_api/v1/pages/${pageId}/customers?page_access_token=${encodeURIComponent(pageToken)}&page_size=100`,
        `https://api.botcake.io/api/public_api/v1/pages/${pageId}/customers?api_key=${encodeURIComponent(token)}&page_size=100`,
        `https://api.botcake.io/api/public_api/v1/pages/${pageId}/subscribers?access_token=${encodeURIComponent(token)}&page_size=100`,
        `https://api.botcake.io/api/public_api/v1/pages/${pageId}/subscribers?page_access_token=${encodeURIComponent(pageToken)}&page_size=100`,
        `https://api.botcake.io/api/public_api/v1/pages/${pageId}/subscribers?api_key=${encodeURIComponent(token)}&page_size=100`,
        `https://api.botcake.io/api/public_api/v1/pages/${pageId}/customer?access_token=${encodeURIComponent(token)}`,
        `https://api.botcake.io/api/public_api/v1/pages/${pageId}/customer?page_access_token=${encodeURIComponent(pageToken)}`,
        `https://botcake.io/api/v1/pages/${pageId}/customers?access_token=${encodeURIComponent(token)}&page_size=100`,
        `https://botcake.io/api/public_api/v1/pages/${pageId}/customers?access_token=${encodeURIComponent(token)}&page_size=100`,
        `https://botcake.io/api/public_api/v1/pages/${pageId}/subscribers?access_token=${encodeURIComponent(token)}&page_size=100`,
        `https://pages.fm/api/public_api/v1/pages/${pageId}/customers?page_access_token=${encodeURIComponent(pageToken)}&page_size=100`,
        `https://pages.fm/api/public_api/v2/pages/${pageId}/customers?page_access_token=${encodeURIComponent(pageToken)}&page_size=100`,
        `https://pages.fm/api/v1/pages/${pageId}/customers?page_access_token=${encodeURIComponent(pageToken)}&page_size=100`,
        `https://pages.fm/api/v1/pages/${pageId}/customers?access_token=${encodeURIComponent(token)}&page_size=100`,
        `https://pos.pages.fm/api/v1/shops/${pageId}/customers?api_key=${encodeURIComponent(token)}&page_size=100`,
      ];

      let customersList: any[] = [];
      for (const custEndpoint of customerEndpoints) {
        try {
          const authHeaders = {
            ...headers,
            'Authorization': `Bearer ${token}`
          };
          const res = await fetch(custEndpoint, { headers: authHeaders });
          if (res.ok) {
            const data = await res.json() as any;
            const list = data.customers || data.data || data.subscribers || (Array.isArray(data) ? data : []);
            if (Array.isArray(list) && list.length > 0) {
              customersList = list;
              console.log(`[Botcake Sync] Lấy thành công ${list.length} khách hàng từ endpoint: ${custEndpoint}`);
              break;
            }
          }
        } catch (e) {}
      }

      totalConversationsChecked += allConversations.length + customersList.length;

      // 3. Xử lý danh sách hội thoại (Conversations)
      for (const conv of allConversations) {
        const convId = String(conv.id || conv._id || conv.conversation_id || '');
        const customer = conv.customer || (conv.customers && conv.customers[0]) || {};
        const customerName = customer.name || conv.customer_name || conv.name || 'Khách hàng Pancake';
        const psid = String(customer.id || customer.fb_id || conv.customer_id || conv.from?.id || conv.id || '');
        const avatar = customer.avatar_url || customer.avatar || conv.customer_avatar || null;

        // Trích xuất số điện thoại từ các thuộc tính trên object conversation
        let detectedPhone: string | null = null;
        if (conv.phone_numbers && Array.isArray(conv.phone_numbers) && conv.phone_numbers.length > 0) {
          detectedPhone = extractVietnamesePhone(String(conv.phone_numbers[0])) || String(conv.phone_numbers[0]);
        } else if (conv.phone_number) {
          detectedPhone = extractVietnamesePhone(String(conv.phone_number)) || String(conv.phone_number);
        } else if (conv.customer_phone) {
          detectedPhone = extractVietnamesePhone(String(conv.customer_phone)) || String(conv.customer_phone);
        } else if (customer.phone) {
          detectedPhone = extractVietnamesePhone(String(customer.phone)) || String(customer.phone);
        } else if (customer.mobile) {
          detectedPhone = extractVietnamesePhone(String(customer.mobile)) || String(customer.mobile);
        } else if (customer.phone_numbers && Array.isArray(customer.phone_numbers) && customer.phone_numbers.length > 0) {
          detectedPhone = extractVietnamesePhone(String(customer.phone_numbers[0])) || String(customer.phone_numbers[0]);
        }

        // Lấy nội dung tin nhắn gần nhất
        let lastMessage = conv.last_message?.message || conv.last_message?.text || conv.last_message_text || conv.snippet || conv.message || '';
        if (!detectedPhone && lastMessage) {
          detectedPhone = extractVietnamesePhone(lastMessage);
        }

        // Nếu có mảng tin nhắn sẵn trong conv
        if (!detectedPhone && Array.isArray(conv.messages)) {
          for (const msg of conv.messages) {
            const txt = msg.message || msg.text || msg.content || '';
            const p = extractVietnamesePhone(txt);
            if (p) {
              detectedPhone = p;
              break;
            }
          }
        }

        let detectedEmail = extractEmail(lastMessage) || customer.email || null;

        // BƯỚC NÂNG CẤP QUAN TRỌNG: Quét sâu vào API tin nhắn chi tiết nếu chưa có SĐT hoặc tin nhắn bị rỗng
        if (convId && (!detectedPhone || !lastMessage)) {
          const detailRes = await fetchConversationDetailsAndMessages(
            pageId, 
            convId, 
            customer.id || conv.customer_id, 
            pageToken, 
            token, 
            headers
          );

          if (!detectedPhone && detailRes.phone) {
            detectedPhone = detailRes.phone;
          }
          if (!lastMessage && detailRes.lastCustomerMessage) {
            lastMessage = detailRes.lastCustomerMessage;
          }
          if (!detectedEmail && detailRes.email) {
            detectedEmail = detailRes.email;
          }
        }

        if (detectedPhone) totalPhonesFound++;

        // Lưu vào bảng leads trong CRM
        const leadRecord: LeadRecord = {
          customer_name: customerName,
          customer_phone: detectedPhone || null,
          customer_email: detectedEmail || null,
          customer_avatar: avatar,
          source_channel: 'pancake_messenger',
          page_id: pageId,
          psid: psid || null,
          message_text: lastMessage || 'Khách hàng liên hệ qua Pancake Messenger',
          notes: `Đồng bộ từ Pancake (Fanpage: ${pageName})`,
          status: 'lead_captured',
          last_message_at: conv.updated_at || conv.last_message?.inserted_at || new Date().toISOString()
        };

        const saveRes = await saveLeadToDatabase(leadRecord);
        if (saveRes.success) {
          totalLeadsSynced++;

          // Lưu hoặc cập nhật vào meta_chat_conversations
          try {
            if (psid && pageId) {
              await supabase.from('meta_chat_conversations').upsert({
                page_id: pageId,
                psid: psid,
                customer_name: customerName,
                customer_avatar: avatar,
                customer_phone: detectedPhone,
                customer_email: detectedEmail,
                last_message_text: lastMessage || 'Đồng bộ từ Pancake',
                last_message_at: conv.updated_at || new Date().toISOString(),
                unread_count: 0,
                status: 'active'
              }, { onConflict: 'page_id,psid' });
            }
          } catch (e) {}

          // Nếu phát hiện có số điện thoại -> Bắn sự kiện Lead lên Meta CAPI
          if (detectedPhone) {
            try {
              await sendMetaConversionEvent({
                event_name: 'Lead',
                tracking_type: 'PHONE_LEAD',
                customer_name: customerName,
                customer_phone: detectedPhone,
                customer_email: detectedEmail || undefined,
                utm_source: 'pancake_messenger'
              });
            } catch (capiErr: any) {
              console.warn('[Pancake -> Meta CAPI] Lỗi bắn sự kiện CAPI:', capiErr.message);
            }
          }
        }
      }

      // 4. Xử lý danh sách khách hàng (Customers) từ Pancake & Botcake
      for (const cust of customersList) {
        const custName = cust.name || cust.full_name || `${cust.first_name || ''} ${cust.last_name || ''}`.trim() || 'Khách hàng Pancake';
        
        let rawPhone = cust.phone || cust.mobile || cust.phone_number || cust.user_phone || (Array.isArray(cust.phone_numbers) ? cust.phone_numbers[0] : '');
        if (!rawPhone && cust.custom_fields) {
          rawPhone = cust.custom_fields.phone || cust.custom_fields.sdt || cust.custom_fields.phone_number || cust.custom_fields.so_dien_thoai || '';
        }
        if (!rawPhone && cust.variables) {
          rawPhone = cust.variables.phone || cust.variables.sdt || cust.variables.so_dien_thoai || '';
        }
        if (!rawPhone && cust.attributes) {
          rawPhone = cust.attributes.phone || cust.attributes.phone_number || cust.attributes.sdt || '';
        }

        const custPhone = extractVietnamesePhone(rawPhone) || (rawPhone ? String(rawPhone).trim() : null);
        const custEmail = cust.email || cust.custom_fields?.email || cust.variables?.email || null;
        const custPsid = String(cust.id || cust.fb_id || cust.psid || cust.recipient_id || '');
        let custAvatar = cust.avatar_url || cust.avatar || cust.profile_pic || cust.picture?.data?.url || null;
        if (!custAvatar && custPsid && !custPsid.includes('{')) {
          custAvatar = `https://graph.facebook.com/${custPsid}/picture?type=normal`;
        }
        
        let custGender: string | null = null;
        if (cust.gender) {
          const g = String(cust.gender).toLowerCase().trim();
          if (g === 'male' || g === 'nam' || g === '1') custGender = 'Nam';
          else if (g === 'female' || g === 'nu' || g === 'nữ' || g === '2') custGender = 'Nữ';
        }

        // Trích xuất ngày sinh
        let custBirthday = cust.birthday || cust.date_of_birth || cust.dob || cust.custom_fields?.birthday || cust.custom_fields?.date_of_birth || cust.custom_fields?.ngay_sinh || null;
        if (custBirthday && String(custBirthday).includes('{{')) custBirthday = null;

        // Trích xuất FB ID & Pancake ID
        const custFbId = String(cust.fb_id || cust.id || cust.psid || cust.recipient_id || '');
        const custPancakeId = String(cust.id || cust.customer_id || '');

        const adId = cust.ad_id || cust.adId || cust.fb_ad_id || cust.custom_fields?.ad_id || cust.custom_fields?.adId || null;
        const adName = cust.ad_name || cust.adName || cust.custom_fields?.ad_name || null;
        const campaignId = cust.campaign_id || cust.campaignId || cust.custom_fields?.campaign_id || null;
        const campaign = cust.campaign || cust.campaign_name || cust.custom_fields?.campaign || cust.utm_campaign || null;
        const adsetId = cust.adset_id || cust.adsetId || cust.custom_fields?.adset_id || null;
        const adsetName = cust.adset_name || cust.adsetName || cust.custom_fields?.adset_name || null;

        if (custPhone) totalPhonesFound++;

        const leadRecord: LeadRecord = {
          customer_name: custName,
          customer_phone: custPhone,
          customer_email: custEmail,
          customer_avatar: custAvatar,
          gender: custGender,
          birthday: custBirthday,
          fb_id: custFbId || null,
          pancake_id: custPancakeId || null,
          ad_id: adId,
          ad_name: adName,
          campaign_id: campaignId,
          adset_id: adsetId,
          adset_name: adsetName,
          utm_campaign: campaign,
          utm_source: cust.utm_source || 'pancake_customer',
          utm_medium: cust.utm_medium || null,
          utm_content: cust.utm_content || null,
          utm_term: cust.utm_term || null,
          shop_id: cust.shop_id || null,
          source_channel: adId ? `Ad ID: ${adId}` : 'pancake_messenger',
          page_id: pageId,
          psid: custPsid || null,
          message_text: `Khách hàng từ danh mục Botcake/Pancake (${pageName})`,
          notes: `Đồng bộ từ Botcake Customer API (Fanpage: ${pageName})`,
          status: 'lead_captured',
          last_message_at: cust.updated_at || cust.inserted_at || new Date().toISOString()
        };

        const saveRes = await saveLeadToDatabase(leadRecord);
        if (saveRes.success) {
          totalLeadsSynced++;

          if (custPhone) {
            try {
              await sendMetaConversionEvent({
                event_name: 'Lead',
                tracking_type: 'PHONE_LEAD',
                customer_name: custName,
                customer_phone: custPhone,
                customer_email: custEmail || undefined,
                utm_source: 'pancake_customer'
              });
            } catch (capiErr: any) {}
          }
        }
      }
    }

    return {
      success: true,
      leads_synced: totalLeadsSynced,
      conversations_checked: totalConversationsChecked,
      phones_found: totalPhonesFound
    };
  } catch (err: any) {
    console.error('[Pancake Sync] Lỗi khi đồng bộ:', err);
    return {
      success: false,
      leads_synced: totalLeadsSynced,
      conversations_checked: totalConversationsChecked,
      phones_found: totalPhonesFound,
      error: err.message
    };
  }
}

/**
 * Xử lý Webhook Realtime nhận tin nhắn & SĐT trực tiếp từ Pancake
 */
export async function handleIncomingPancakeWebhook(payload: any): Promise<{
  success: boolean;
  message?: string;
  lead?: any;
}> {
  if (!payload) return { success: false, message: 'Payload rỗng' };

  try {
    const supabase = getAdminSupabaseClient();
    
    // 1. Phân tích các dạng event của Pancake / POS Cake
    const eventType = String(payload.type || payload.event || payload.action || payload.topic || 'message:created').toLowerCase();
    const pageId = String(payload.page_id || payload.pageId || payload.page?.id || payload.shop_id || payload.shop?.id || payload.data?.shop_id || '');
    const pageName = payload.page_name || payload.page?.name || payload.shop?.name || payload.data?.shop?.name || 'Fanpage / Shop Tour CRM';

    // Trích xuất đơn hàng (nếu là webhook Order từ POS Cake)
    const order = payload.order || payload.data?.order || (eventType.includes('order') ? (payload.data || payload) : null);
    const orderTotal = order ? (Number(order.total_price || order.total_amount || order.grand_total || order.subtotal || order.order_total || 0)) : 0;
    const orderCode = order ? (order.code || order.order_id || order.id || order.display_id || '') : '';
    const orderStatus = order?.status_name || order?.status_text || (order?.status !== undefined ? `Trạng thái #${order.status}` : '');

    // Trích xuất danh sách sản phẩm trong đơn hàng POS Cake
    let itemsSummary = '';
    const orderItems = order?.items || order?.order_items || order?.products || [];
    if (Array.isArray(orderItems) && orderItems.length > 0) {
      itemsSummary = orderItems.map((it: any) => {
        const pName = it.product_name || it.name || it.title || 'Sản phẩm';
        const vName = it.variation_name || it.variant_name || '';
        const qty = it.quantity || it.qty || 1;
        const price = Number(it.price || it.retail_price || 0);
        return `${pName}${vName ? ` (${vName})` : ''} x${qty} [${price.toLocaleString('vi-VN')} đ]`;
      }).join('; ');
    }

    // Trích xuất đối tác / khách hàng (từ POS Cake partner hoặc shipping address)
    const partner = order?.partner || payload.partner || payload.customer || payload.data?.customer || payload.conversation?.customer || {};
    const customer = payload.customer || payload.data?.customer || order?.customer || {};
    const shipping = order?.shipping_address || payload.shipping_address || {};

    let customerName = payload.customer_name || payload.name || payload.full_name || partner.name || partner.full_name || order?.bill_full_name || shipping.full_name || order?.customer_name;
    if (customerName && (String(customerName).includes('{{') || String(customerName).startsWith('{'))) {
      customerName = null;
    }
    if (!customerName && (payload.first_name || payload.last_name)) {
      customerName = `${payload.first_name || ''} ${payload.last_name || ''}`.trim();
    }
    if (!customerName && (partner.first_name || partner.last_name)) {
      customerName = `${partner.first_name || ''} ${partner.last_name || ''}`.trim();
    }
    if (!customerName) customerName = 'Khách hàng Pancake / POS Cake';

    let psid = String(partner.fb_id || partner.id || payload.psid || payload.from?.id || customer.id || '');
    if (psid.includes('{{') || psid.startsWith('{') || psid.length > 30) {
      // nếu id không phải facebook psid (ví dụ uuid pos cake)
      if (psid.includes('-') || !/^\d+$/.test(psid)) psid = '';
    }

    let avatar = payload.avatar || payload.customer_avatar || payload.profile_pic || payload.user_profile_pic || payload.avatar_url || partner.avatar_url || partner.avatar || null;
    if (avatar && (String(avatar).includes('{{') || String(avatar).startsWith('{'))) {
      avatar = null;
    }
    if (!avatar && psid) {
      avatar = `https://graph.facebook.com/${psid}/picture?type=normal`;
    }

    // Trích xuất giới tính (Nam / Nữ / khác)
    let gender: string | null = null;
    const rawGender = payload.gender || payload.customer_gender || payload.gioi_tinh || partner.gender || customer.gender || null;
    if (rawGender && !String(rawGender).includes('{{')) {
      const g = String(rawGender).toLowerCase().trim();
      if (g === 'male' || g === 'nam' || g === '1') gender = 'Nam';
      else if (g === 'female' || g === 'nữ' || g === 'nu' || g === '2') gender = 'Nữ';
      else gender = String(rawGender);
    }

    // Trích xuất địa chỉ đầy đủ
    const fullAddress = shipping.full_address || shipping.address || partner.full_address || partner.address || payload.address || null;

    // Trích xuất tin nhắn hoặc mô tả đơn hàng
    const msgObj = payload.message || payload.data?.message || payload.conversation?.last_message || {};
    let messageText = String(msgObj.message || msgObj.text || msgObj.content || payload.text || payload.message_text || '');
    if (!messageText && order) {
      messageText = `Đơn hàng POS Cake #${orderCode}${orderStatus ? ` (${orderStatus})` : ''}: Tổng ${orderTotal.toLocaleString('vi-VN')} đ${itemsSummary ? ` - ${itemsSummary}` : ''}`;
    }

    // Trích xuất số điện thoại (từ tất cả biến thể và trường tùy chỉnh)
    let detectedPhone: string | null = null;
    const phoneCandidates = [
      payload.phone,
      payload.customer_phone,
      payload.phone_number,
      order?.bill_phone_number,
      shipping.phone_number,
      shipping.phone,
      partner.phone_number,
      partner.phone,
      partner.mobile,
      payload.mobile,
      payload.tel,
      payload.sdt,
      payload.so_dien_thoai,
      payload.custom_fields?.phone,
      payload.custom_fields?.sdt,
      payload.custom_fields?.phone_number,
      payload.attributes?.phone,
      payload.attributes?.phone_number,
      customer.phone,
      customer.mobile,
      customer.phone_number
    ];

    for (const cand of phoneCandidates) {
      if (cand && !String(cand).includes('{{')) {
        const extracted = extractVietnamesePhone(String(cand));
        if (extracted) {
          detectedPhone = extracted;
          break;
        } else {
          const cleanNum = String(cand).replace(/[^0-9+]/g, '');
          if (cleanNum.length >= 9 && cleanNum.length <= 11) {
            detectedPhone = cleanNum;
            break;
          }
        }
      }
    }

    if (!detectedPhone && (partner.phone_numbers || payload.phone_numbers) && Array.isArray(partner.phone_numbers || payload.phone_numbers)) {
      const pList = partner.phone_numbers || payload.phone_numbers;
      if (pList.length > 0) {
        const firstP = String(pList[0]);
        if (!firstP.includes('{{')) {
          detectedPhone = extractVietnamesePhone(firstP) || firstP;
        }
      }
    }

    if (!detectedPhone && messageText && !messageText.includes('{{')) {
      detectedPhone = extractVietnamesePhone(messageText);
    }

    let detectedEmail = payload.email || payload.customer_email || partner.email || customer.email || order?.email || payload.custom_fields?.email || extractEmail(messageText) || null;
    if (detectedEmail && String(detectedEmail).includes('{{')) detectedEmail = null;

    // Trích xuất ngày sinh của khách hàng
    let detectedBirthday = payload.birthday || payload.date_of_birth || payload.dob || partner.birthday || partner.date_of_birth || partner.dob || customer.birthday || customer.date_of_birth || payload.custom_fields?.birthday || payload.custom_fields?.date_of_birth || payload.custom_fields?.ngay_sinh || null;
    if (detectedBirthday && String(detectedBirthday).includes('{{')) detectedBirthday = null;

    // Trích xuất FB ID & Pancake ID
    const detectedFbId = String(partner.fb_id || payload.fb_id || customer.fb_id || psid || '');
    const detectedPancakeId = String(partner.id || customer.id || payload.pancake_id || payload.id || '');

    // Trích xuất dữ liệu quảng cáo (Ads & Campaign metadata)
    let adId = payload.ad_id || payload.adId || payload.fb_ad_id || order?.ad_id || order?.fb_ad_id || payload.custom_fields?.ad_id || null;
    if (adId && String(adId).includes('{{')) adId = null;

    let adName = payload.ad_name || payload.adName || order?.ad_name || payload.custom_fields?.ad_name || null;
    if (adName && String(adName).includes('{{')) adName = null;

    let campaignId = payload.campaign_id || payload.campaignId || order?.campaign_id || payload.custom_fields?.campaign_id || null;
    if (campaignId && String(campaignId).includes('{{')) campaignId = null;

    let campaignName = payload.utm_campaign || payload.campaign_name || payload.campaign || order?.utm_campaign || null;
    if (campaignName && String(campaignName).includes('{{')) campaignName = null;

    let adsetId = payload.adset_id || payload.adsetId || order?.adset_id || payload.custom_fields?.adset_id || null;
    if (adsetId && String(adsetId).includes('{{')) adsetId = null;

    let adsetName = payload.adset_name || payload.adsetName || order?.adset_name || payload.custom_fields?.adset_name || null;
    if (adsetName && String(adsetName).includes('{{')) adsetName = null;

    const isOrderEvent = Boolean(order && (orderTotal > 0 || eventType.includes('order')));

    let utmSource = payload.utm_source || order?.utm_source || (isOrderEvent ? 'pos_cake' : 'botcake');
    let utmMedium = payload.utm_medium || order?.utm_medium || null;
    let utmContent = payload.utm_content || order?.utm_content || null;
    let utmTerm = payload.utm_term || order?.utm_term || null;
    const createdAt = payload.created_at || payload.registered_at || payload.registration_date || payload.time || payload.timestamp || order?.inserted_at || new Date().toISOString();

    // Lưu vào database CRM
    const sourceChannelName = isOrderEvent ? 'pos_pancake_order' : (eventType.includes('customer') || eventType.includes('partner') ? 'pos_pancake_customer' : (adId ? `Ad ID: ${adId}` : 'pancake_messenger'));

    let detailedNotes = `Nhận Realtime từ POS Cake Webhook (${eventType})`;
    if (isOrderEvent) {
      detailedNotes = `Đơn hàng POS Cake #${orderCode} - Giá trị: ${orderTotal.toLocaleString('vi-VN')} đ${orderStatus ? ` - ${orderStatus}` : ''}${fullAddress ? ` - Đ/c: ${fullAddress}` : ''}`;
    } else if (fullAddress) {
      detailedNotes += ` (Địa chỉ: ${fullAddress})`;
    }

    const leadRecord: LeadRecord = {
      customer_name: customerName,
      customer_phone: detectedPhone || null,
      customer_email: detectedEmail || null,
      customer_avatar: avatar,
      gender: gender,
      birthday: detectedBirthday,
      fb_id: detectedFbId || null,
      pancake_id: detectedPancakeId || null,
      source_channel: payload.source || payload.source_channel || sourceChannelName,
      page_id: pageId || null,
      shop_id: pageId || payload.shop_id || order?.shop_id || null,
      psid: psid || null,
      ad_id: adId || null,
      ad_name: adName || null,
      campaign_id: campaignId || null,
      adset_id: adsetId || null,
      adset_name: adsetName || null,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: campaignName,
      utm_content: utmContent,
      utm_term: utmTerm,
      message_text: messageText || (isOrderEvent ? `Đơn hàng POS Cake #${orderCode}` : 'Khách để lại SĐT qua kịch bản Botcake / Pancake'),
      notes: detailedNotes,
      status: isOrderEvent ? 'order_created' : 'lead_captured',
      last_message_at: createdAt,
      created_at: createdAt
    };

    const saveRes = await saveLeadToDatabase(leadRecord);

    // Đồng bộ vào bảng customers (Khách hàng trung tâm) nếu có SĐT
    if (detectedPhone) {
      try {
        const { data: existCust } = await supabase
          .from('customers')
          .select('id, full_name, email, address')
          .eq('phone', detectedPhone)
          .maybeSingle();

        if (existCust) {
          await supabase.from('customers').update({
            full_name: (existCust.full_name === 'Khách hàng mới' || !existCust.full_name) ? customerName : existCust.full_name,
            email: detectedEmail || existCust.email,
            address: fullAddress || existCust.address,
            updated_at: new Date().toISOString()
          }).eq('id', existCust.id);
        } else {
          await supabase.from('customers').insert({
            full_name: customerName,
            phone: detectedPhone,
            email: detectedEmail,
            address: fullAddress,
            gender: gender,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      } catch (custErr: any) {
        console.warn('[POS Cake Webhook] Không thể đồng bộ khách hàng vào bảng customers:', custErr.message);
      }
    }

    // Bắn thông báo nội bộ (Chuông thông báo CRM)
    try {
      await sendInternalSystemNotification({
        fullName: customerName,
        phone: detectedPhone,
        psid: psid,
        pageId: pageId,
        tags: payload.tags || (isOrderEvent ? ['POS Cake Order', `Đơn #${orderCode}`] : ['POS Cake Webhook'])
      });
    } catch (notifErr: any) {
      console.warn('[Pancake/Botcake Webhook] Lỗi gửi thông báo:', notifErr.message);
    }

    // Cập nhật hội thoại nếu có psid
    if (psid && pageId) {
      try {
        await supabase.from('meta_chat_conversations').upsert({
          page_id: pageId,
          psid: psid,
          customer_name: customerName,
          customer_avatar: avatar,
          customer_phone: detectedPhone,
          customer_email: detectedEmail,
          last_message_text: messageText || 'Cập nhật từ POS Cake',
          last_message_at: new Date().toISOString(),
          unread_count: 1,
          status: 'active'
        }, { onConflict: 'page_id,psid' });
      } catch (e) {}
    }

    // Bắn sự kiện Meta CAPI
    if (detectedPhone) {
      try {
        if (isOrderEvent && orderTotal > 0) {
          // Bắn sự kiện Purchase (Doanh thu đơn hàng thực tế)
          await sendMetaConversionEvent({
            event_name: 'Purchase',
            tracking_type: 'PURCHASE_REVENUE',
            order_id: String(orderCode || Date.now()),
            revenue_value: orderTotal,
            currency: 'VND',
            customer_name: customerName,
            customer_phone: detectedPhone,
            customer_email: detectedEmail || undefined,
            utm_source: 'pos_cake_webhook'
          });
        } else {
          // Bắn sự kiện Lead (Khách hàng tiềm năng)
          await sendMetaConversionEvent({
            event_name: 'Lead',
            tracking_type: 'PHONE_LEAD',
            customer_name: customerName,
            customer_phone: detectedPhone,
            customer_email: detectedEmail || undefined,
            utm_source: isOrderEvent ? 'pos_cake' : 'pancake_webhook'
          });
        }
      } catch (capiErr) {}
    }

    return {
      success: true,
      message: 'Đã xử lý Webhook POS Cake / Pancake thành công',
      lead: leadRecord
    };
  } catch (err: any) {
    console.error('[Pancake Webhook] Lỗi xử lý webhook:', err);
    return { success: false, message: err.message };
  }
}

/**
 * Worker chạy ngầm tự động đồng bộ Pancake định kỳ (mỗi 30s)
 */
let autoSyncInterval: any = null;

export function startPancakeAutoSyncWorker(intervalMs = 30000) {
  console.log('[Pancake Worker] Tính năng Polling ngầm Pancake đang tạm dừng theo yêu cầu.');
  return;
}

/**
 * ========================================================
 * POS CAKE API INTEGRATIONS (Address / Orders / Customers)
 * Theo chuẩn tài liệu: https://docs.pancake.biz/pos/api
 * ========================================================
 */

/**
 * Lấy danh sách Tỉnh/Thành phố từ Pancake POS Geo API
 */
export async function getPosCakeProvinces(apiKeyOverride?: string): Promise<{ success: boolean; data: any[]; error?: string }> {
  try {
    const config = await getPancakeConfig();
    const token = apiKeyOverride || config.api_key || process.env.PANCAKE_PUBLIC_API_TOKEN || '';
    
    const urls = [
      `https://pos.pages.fm/api/v1/geo/provinces${token ? `?api_key=${encodeURIComponent(token)}` : ''}`,
      `https://pos.pancake.vn/api/v1/geo/provinces${token ? `?api_key=${encodeURIComponent(token)}` : ''}`
    ];

    for (const url of urls) {
      try {
        const res = await fetch(url, {
          headers: { 'Accept': 'application/json', 'User-Agent': 'TourCRM/1.0' }
        });
        if (res.ok) {
          const json = await res.json() as any;
          const provinces = json.data || json.provinces || (Array.isArray(json) ? json : []);
          if (Array.isArray(provinces) && provinces.length > 0) {
            return { success: true, data: provinces };
          }
        }
      } catch (e) {}
    }

    return { success: true, data: [] };
  } catch (err: any) {
    return { success: false, data: [], error: err.message };
  }
}

/**
 * Lấy danh sách Quận/Huyện theo Tỉnh từ Pancake POS Geo API
 */
export async function getPosCakeDistricts(provinceId: string, apiKeyOverride?: string): Promise<{ success: boolean; data: any[]; error?: string }> {
  if (!provinceId) return { success: true, data: [] };
  try {
    const config = await getPancakeConfig();
    const token = apiKeyOverride || config.api_key || process.env.PANCAKE_PUBLIC_API_TOKEN || '';

    const urls = [
      `https://pos.pages.fm/api/v1/geo/districts?province_id=${encodeURIComponent(provinceId)}${token ? `&api_key=${encodeURIComponent(token)}` : ''}`,
      `https://pos.pancake.vn/api/v1/geo/districts?province_id=${encodeURIComponent(provinceId)}${token ? `&api_key=${encodeURIComponent(token)}` : ''}`
    ];

    for (const url of urls) {
      try {
        const res = await fetch(url, {
          headers: { 'Accept': 'application/json', 'User-Agent': 'TourCRM/1.0' }
        });
        if (res.ok) {
          const json = await res.json() as any;
          const districts = json.data || json.districts || (Array.isArray(json) ? json : []);
          if (Array.isArray(districts) && districts.length > 0) {
            return { success: true, data: districts };
          }
        }
      } catch (e) {}
    }

    return { success: true, data: [] };
  } catch (err: any) {
    return { success: false, data: [], error: err.message };
  }
}

/**
 * Lấy danh sách Xã/Phường theo Huyện từ Pancake POS Geo API
 */
export async function getPosCakeCommunes(districtId: string, apiKeyOverride?: string): Promise<{ success: boolean; data: any[]; error?: string }> {
  if (!districtId) return { success: true, data: [] };
  try {
    const config = await getPancakeConfig();
    const token = apiKeyOverride || config.api_key || process.env.PANCAKE_PUBLIC_API_TOKEN || '';

    const urls = [
      `https://pos.pages.fm/api/v1/geo/communes?district_id=${encodeURIComponent(districtId)}${token ? `&api_key=${encodeURIComponent(token)}` : ''}`,
      `https://pos.pancake.vn/api/v1/geo/communes?district_id=${encodeURIComponent(districtId)}${token ? `&api_key=${encodeURIComponent(token)}` : ''}`
    ];

    for (const url of urls) {
      try {
        const res = await fetch(url, {
          headers: { 'Accept': 'application/json', 'User-Agent': 'TourCRM/1.0' }
        });
        if (res.ok) {
          const json = await res.json() as any;
          const communes = json.data || json.communes || (Array.isArray(json) ? json : []);
          if (Array.isArray(communes) && communes.length > 0) {
            return { success: true, data: communes };
          }
        }
      } catch (e) {}
    }

    return { success: true, data: [] };
  } catch (err: any) {
    return { success: false, data: [], error: err.message };
  }
}

/**
 * Lấy danh sách Cửa hàng (Shops) từ POS Cake API
 */
export async function getPosCakeShops(apiKeyOverride?: string): Promise<{ success: boolean; data: any[]; error?: string }> {
  try {
    const config = await getPancakeConfig();
    const token = apiKeyOverride || config.api_key || process.env.PANCAKE_PUBLIC_API_TOKEN || '';
    if (!token) return { success: false, data: [], error: 'Chưa cấu hình API Key Pancake / POS Cake' };

    const urls = [
      `https://pos.pages.fm/api/v1/shops?api_key=${encodeURIComponent(token)}`,
      `https://pos.pancake.vn/api/v1/shops?api_key=${encodeURIComponent(token)}`,
      `https://pages.fm/api/v1/shops?access_token=${encodeURIComponent(token)}`
    ];

    for (const url of urls) {
      try {
        const res = await fetch(url, {
          headers: { 'Accept': 'application/json', 'User-Agent': 'TourCRM/1.0' }
        });
        if (res.ok) {
          const json = await res.json() as any;
          const shops = json.shops || json.data || (Array.isArray(json) ? json : []);
          if (Array.isArray(shops) && shops.length > 0) {
            return { success: true, data: shops };
          }
        }
      } catch (e) {}
    }

    return { success: true, data: [] };
  } catch (err: any) {
    return { success: false, data: [], error: err.message };
  }
}
