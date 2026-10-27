import express from 'express';
import { 
  sendMetaConversionEvent, 
  getMetaCapiConfig, 
  normalizeAndHashPhone, 
  normalizeAndHashEmail,
  MetaCapiEventParams 
} from '../services/metaCapiService.js';
import { getAdminSupabaseClient } from '../services/supabaseService.js';

const router = express.Router();

/**
 * Gửi sự kiện chuyển đổi lên Meta Conversions API
 */
router.post('/api/meta-capi/send-event', async (req, res) => {
  try {
    const params: MetaCapiEventParams = {
      event_name: req.body.event_name || 'Lead',
      tracking_type: req.body.tracking_type || 'PHONE_LEAD',
      event_id: req.body.event_id,
      order_id: req.body.order_id,
      tour_id: req.body.tour_id,
      tour_code: req.body.tour_code,
      tour_name: req.body.tour_name,
      customer_name: req.body.customer_name,
      customer_phone: req.body.customer_phone,
      customer_email: req.body.customer_email,
      meta_lead_id: req.body.meta_lead_id,
      revenue_value: req.body.revenue_value,
      currency: req.body.currency || 'VND',
      pax_count: req.body.pax_count,
      test_event_code: req.body.test_event_code,
      client_ip_address: req.ip || req.headers['x-forwarded-for'] as string,
      client_user_agent: req.headers['user-agent'],
      utm_source: req.body.utm_source,
      utm_campaign: req.body.utm_campaign
    };

    const result = await sendMetaConversionEvent(params);
    res.json(result);
  } catch (error: any) {
    console.error('[Meta CAPI Route] Lỗi:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Lỗi máy chủ khi gửi sự kiện Meta CAPI'
    });
  }
});

/**
 * Lấy cấu hình Meta Pixel & CAPI hiện tại
 */
router.get('/api/meta-capi/config', async (req, res) => {
  try {
    const config = await getMetaCapiConfig();
    const maskedToken = config.access_token 
      ? (config.access_token.length > 12 
          ? `${config.access_token.substring(0, 6)}...${config.access_token.substring(config.access_token.length - 4)}` 
          : '******')
      : '';

    res.json({
      success: true,
      data: {
        pixel_id: config.pixel_id || '',
        access_token_masked: maskedToken,
        has_access_token: Boolean(config.access_token),
        test_event_code: config.test_event_code || '',
        is_enabled: config.is_enabled
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Lỗi khi lấy cấu hình Meta CAPI'
    });
  }
});

/**
 * Cập nhật cấu hình Meta Pixel & CAPI vào Database
 */
router.post('/api/meta-capi/config', async (req, res) => {
  try {
    const { pixel_id, access_token, test_event_code, is_enabled } = req.body;

    const supabase = getAdminSupabaseClient();
    
    // Đọc token hiện tại nếu người dùng không đổi
    let finalAccessToken = access_token;
    if (!finalAccessToken || finalAccessToken.includes('...')) {
      const currentConfig = await getMetaCapiConfig();
      finalAccessToken = currentConfig.access_token;
    }

    const payload: Record<string, any> = {
      pixel_id: pixel_id ? String(pixel_id).trim() : '',
      access_token: finalAccessToken ? String(finalAccessToken).trim() : '',
      test_event_code: test_event_code ? String(test_event_code).trim() : null,
      is_enabled: is_enabled !== undefined ? Boolean(is_enabled) : true,
      updated_at: new Date().toISOString()
    };

    // Kiểm tra xem đã có bản ghi cấu hình nào chưa
    const { data: existingList } = await supabase
      .from('meta_capi_settings')
      .select('id')
      .limit(1);

    let data;
    if (existingList && existingList.length > 0) {
      const { data: updated, error } = await supabase
        .from('meta_capi_settings')
        .update(payload)
        .eq('id', existingList[0].id)
        .select()
        .single();

      if (error) throw error;
      data = updated;
    } else {
      const { data: inserted, error } = await supabase
        .from('meta_capi_settings')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      data = inserted;
    }

    res.json({
      success: true,
      message: 'Cập nhật cấu hình Meta CAPI thành công!',
      data
    });
  } catch (error: any) {
    console.error('[Meta CAPI Save Config] Lỗi:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Lỗi khi lưu cấu hình Meta CAPI'
    });
  }
});

/**
 * Lấy danh sách lịch sử chuyển đổi Meta Conversion Logs
 */
router.get('/api/meta-capi/logs', async (req, res) => {
  try {
    const supabase = getAdminSupabaseClient(req);
    const limit = parseInt(req.query.limit as string) || 100;
    const eventName = req.query.event_name as string;

    let query = supabase
      .from('meta_conversion_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (eventName && eventName !== 'all') {
      query = query.eq('event_name', eventName);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('[Meta CAPI Logs] Cảnh báo truy vấn bảng meta_conversion_logs:', error.message);
      return res.json({
        success: true,
        data: []
      });
    }

    res.json({
      success: true,
      data: data || []
    });
  } catch (error: any) {
    console.warn('[Meta CAPI Logs] Không thể tải log, trả về danh sách rỗng:', error?.message || error);
    res.json({
      success: true,
      data: []
    });
  }
});

/**
 * Gửi sự kiện Test lên Meta để kiểm tra kết nối Pixel & Token
 */
router.post('/api/meta-capi/test-connection', async (req, res) => {
  try {
    const { test_event_code, pixel_id, access_token } = req.body;

    const testPhone = '0988888888';
    const testEmail = 'test.lead@yourcompany.com';

    const testParams: MetaCapiEventParams = {
      event_name: 'Lead',
      tracking_type: 'PHONE_LEAD',
      customer_name: 'Khách Hàng Test Meta CAPI',
      customer_phone: testPhone,
      customer_email: testEmail,
      tour_name: 'Tour Test Thử Nghiệm Meta CAPI',
      revenue_value: 10000000,
      currency: 'VND',
      pax_count: 1,
      test_event_code: test_event_code || undefined,
      client_ip_address: req.ip || '127.0.0.1',
      client_user_agent: req.headers['user-agent']
    };

    // Nếu người dùng cung cấp pixel/token tạm để test
    if (pixel_id && access_token) {
      const { normalized, hashed: hashedPhone } = normalizeAndHashPhone(testPhone);
      const hashedEmail = normalizeAndHashEmail(testEmail);

      const eventPayload = {
        data: [
          {
            event_name: 'Lead',
            event_time: Math.floor(Date.now() / 1000),
            event_id: crypto.randomUUID(),
            action_source: 'system_generated',
            user_data: {
              ph: [hashedPhone],
              em: [hashedEmail]
            },
            custom_data: {
              currency: 'VND',
              value: 10000000,
              content_name: 'Tour Test Thử Nghiệm Meta CAPI'
            }
          }
        ],
        ...(test_event_code ? { test_event_code } : {})
      };

      const metaRes = await fetch(`https://graph.facebook.com/v19.0/${pixel_id}/events?access_token=${access_token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventPayload)
      });

      const metaData = await metaRes.json();
      if (!metaRes.ok || metaData.error) {
        return res.status(400).json({
          success: false,
          error: metaData.error?.message || 'Meta API báo lỗi kết nối',
          details: metaData
        });
      }

      return res.json({
        success: true,
        message: 'Kết nối Meta Pixel & CAPI thành công mỹ mãn!',
        events_received: metaData.events_received || 1,
        details: metaData
      });
    }

    // Nếu dùng cấu hình đã lưu
    const result = await sendMetaConversionEvent(testParams);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Gửi sự kiện test thất bại',
        details: result.response
      });
    }

    res.json({
      success: true,
      message: 'Đã gửi sự kiện Lead thử nghiệm thành công lên Meta Events Manager!',
      event_id: result.event_id,
      details: result.response
    });
  } catch (error: any) {
    console.error('[Meta CAPI Test Connection] Lỗi:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Lỗi khi gửi sự kiện test'
    });
  }
});

/**
 * Chẩn đoán chi tiết Token, Quyền hạn & Kết nối Webhook/Ad Account
 */
router.post('/api/meta-capi/diagnose-token', async (req, res) => {
  try {
    const { accessToken, pageId, pixelId, adAccountId } = req.body;

    let token = accessToken ? String(accessToken).trim() : '';
    // Nếu token bị masked hoặc trống, lấy token đã lưu trong cấu hình / env
    if (!token || token.includes('...')) {
      const storedConfig = await getMetaCapiConfig();
      token = storedConfig.access_token || process.env.META_PAGE_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN || '';
    }

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Chưa cung cấp Access Token để kiểm tra.',
      });
    }

    const diagnosis: {
      tokenValid: boolean;
      tokenOwner?: { id: string; name: string; type?: string; link?: string };
      permissions?: { name: string; status: string }[];
      pageStatus?: { id: string; name: string; isSubscribedToWebhook?: boolean; webhookApps?: any[]; error?: string };
      pixelStatus?: { id: string; name?: string; canAccess: boolean; error?: string };
      adAccountStatus?: { id: string; name?: string; currency?: string; status?: number; error?: string };
      recommendations: string[];
      rawErrors: string[];
    } = {
      tokenValid: false,
      recommendations: [],
      rawErrors: [],
    };

    // 1. Kiểm tra Token validity với /me
    try {
      const meRes = await fetch(`https://graph.facebook.com/v22.0/me?fields=id,name,link,category&access_token=${encodeURIComponent(token)}`);
      const meData: any = await meRes.json();

      if (meData.error) {
        diagnosis.tokenValid = false;
        diagnosis.rawErrors.push(`Lỗi Token /me: ${meData.error.message} (Code: ${meData.error.code})`);
        diagnosis.recommendations.push('Access Token đã hết hạn hoặc không hợp lệ. Vui lòng tạo lại mã truy cập mới từ Meta for Developers.');
        return res.json({ success: true, diagnosis });
      }

      diagnosis.tokenValid = true;
      diagnosis.tokenOwner = {
        id: meData.id,
        name: meData.name,
        type: meData.category ? `Fanpage (${meData.category})` : 'User / System User',
        link: meData.link,
      };
    } catch (e: any) {
      diagnosis.rawErrors.push(`Lỗi kết nối /me: ${e.message}`);
    }

    // 2. Kiểm tra Permissions với /me/permissions
    try {
      const permRes = await fetch(`https://graph.facebook.com/v22.0/me/permissions?access_token=${encodeURIComponent(token)}`);
      const permData: any = await permRes.json();

      if (permData.data && Array.isArray(permData.data)) {
        diagnosis.permissions = permData.data.map((p: any) => ({
          name: p.permission,
          status: p.status,
        }));

        const granted = new Set(permData.data.filter((p: any) => p.status === 'granted').map((p: any) => p.permission));
        if (!granted.has('pages_messaging')) {
          diagnosis.recommendations.push('Thiếu quyền "pages_messaging": Fanpage sẽ không thể nhận hoặc phản hồi tin nhắn tự động từ khách.');
        }
        if (!granted.has('leads_retrieval')) {
          diagnosis.recommendations.push('Thiếu quyền "leads_retrieval": Hệ thống sẽ không thể đọc thông tin chi tiết khách hàng từ biểu mẫu Meta Lead Ads.');
        }
        if (!granted.has('pages_read_engagement') && !granted.has('pages_manage_metadata')) {
          diagnosis.recommendations.push('Thiếu quyền "pages_read_engagement" / "pages_manage_metadata" để quản lý tương tác và webhook.');
        }
      }
    } catch (e: any) {
      // Bỏ qua nếu là token Page thuần
    }

    // 3. Kiểm tra Fanpage & Webhook Subscriptions
    const targetPageId = pageId || diagnosis.tokenOwner?.id || process.env.META_PAGE_ID || '103836966010338';
    if (targetPageId) {
      try {
        const pageRes = await fetch(`https://graph.facebook.com/v22.0/${targetPageId}?fields=id,name,category,link&access_token=${encodeURIComponent(token)}`);
        const pageData: any = await pageRes.json();

        if (pageData.error) {
          diagnosis.pageStatus = {
            id: targetPageId,
            name: 'Không thể truy cập',
            error: pageData.error.message,
          };
          diagnosis.recommendations.push(`Không thể truy cập Page ID ${targetPageId}: ${pageData.error.message}. Đảm bảo token có quyền quản lý Trang này.`);
        } else {
          // Check subscribed apps
          let isSubscribed = false;
          let webhookApps = [];
          try {
            const subRes = await fetch(`https://graph.facebook.com/v22.0/${targetPageId}/subscribed_apps?access_token=${encodeURIComponent(token)}`);
            const subData: any = await subRes.json();
            if (subData.data && Array.isArray(subData.data) && subData.data.length > 0) {
              isSubscribed = true;
              webhookApps = subData.data;
            }
          } catch (err) {
            // Ignore sub-call error
          }

          diagnosis.pageStatus = {
            id: pageData.id,
            name: pageData.name,
            isSubscribedToWebhook: isSubscribed,
            webhookApps,
          };

          if (!isSubscribed) {
            diagnosis.recommendations.push(`Fanpage "${pageData.name}" chưa kích hoạt đăng ký nhận Webhook (subscribed_apps). Hãy kiểm tra lại bước Subscriptions trên Meta Developers.`);
          }
        }
      } catch (e: any) {
        diagnosis.rawErrors.push(`Lỗi kiểm tra Trang: ${e.message}`);
      }
    }

    // 4. Kiểm tra Pixel / CAPI Dataset
    const targetPixelId = pixelId || process.env.META_PIXEL_ID;
    if (targetPixelId) {
      try {
        const pixelRes = await fetch(`https://graph.facebook.com/v22.0/${targetPixelId}?fields=id,name&access_token=${encodeURIComponent(token)}`);
        const pixelData: any = await pixelRes.json();

        if (pixelData.error) {
          diagnosis.pixelStatus = {
            id: targetPixelId,
            canAccess: false,
            error: pixelData.error.message,
          };
          diagnosis.recommendations.push(`Không thể truy cập Pixel ID ${targetPixelId}: ${pixelData.error.message}.`);
        } else {
          diagnosis.pixelStatus = {
            id: pixelData.id,
            name: pixelData.name,
            canAccess: true,
          };
        }
      } catch (e: any) {
        diagnosis.rawErrors.push(`Lỗi kiểm tra Pixel: ${e.message}`);
      }
    }

    // 5. Kiểm tra Ad Account nếu có
    const targetAdAccountId = adAccountId || process.env.META_AD_ACCOUNT_ID;
    if (targetAdAccountId) {
      const cleanAdAccountId = targetAdAccountId.startsWith('act_') ? targetAdAccountId : `act_${targetAdAccountId}`;
      try {
        const adAccRes = await fetch(`https://graph.facebook.com/v22.0/${cleanAdAccountId}?fields=id,name,account_status,currency&access_token=${encodeURIComponent(token)}`);
        const adAccData: any = await adAccRes.json();

        if (adAccData.error) {
          diagnosis.adAccountStatus = {
            id: cleanAdAccountId,
            error: adAccData.error.message,
          };
        } else {
          diagnosis.adAccountStatus = {
            id: adAccData.id,
            name: adAccData.name,
            currency: adAccData.currency,
            status: adAccData.account_status,
          };
        }
      } catch (e: any) {
        diagnosis.rawErrors.push(`Lỗi kiểm tra Ad Account: ${e.message}`);
      }
    }

    res.json({
      success: true,
      diagnosis,
    });
  } catch (error: any) {
    console.error('[Meta CAPI Diagnose Token] Lỗi:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi chẩn đoán Access Token: ' + (error.message || 'Lỗi không xác định'),
    });
  }
});

export default router;
