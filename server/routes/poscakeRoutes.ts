import express from 'express';
import { 
  processPosCakeWebhookAsync, 
  formatDateTimeVi 
} from '../services/poscakeWebhookService.js';
import { getPancakeConfig } from '../services/pancakeService.js';

const router = express.Router();

// Shop ID mặc định trên POS Cake
const POSCAKE_DEFAULT_SHOP_ID = '';
const POSCAKE_DEFAULT_WEBHOOK_URL = 'https://yourcompany.com/api/webhooks/poscake';

// Danh sách các URL webhook mà POS Cake / Pancake / Botcake có thể gửi đến
const ALL_POSCAKE_WEBHOOK_PATHS = [
  '/api/webhooks/poscake',
  '/api/poscake/webhook',
  '/api/pancake/webhook',
  '/api/pos/webhook'
];

/**
 * 1. Webhook Handshake Verification (GET)
 * Endpoint xác thực Webhook cho Pancake / POS Cake / Botcake
 */
router.get(ALL_POSCAKE_WEBHOOK_PATHS, (req, res) => {
  const challenge = req.query['hub.challenge'] || req.query['challenge'] || 'ok';
  res.status(200).send(challenge);
});

/**
 * 2. Webhook Ingestion Endpoint (POST)
 * Nhận dữ liệu Realtime từ Pancake POS (Poscake)
 * Yêu cầu: Trả về res.status(200).json({ success: true }) ngay lập tức để tránh timeout,
 * toàn bộ tác vụ xử lý Database chạy ngầm (async) bọc trong try-catch.
 */
router.post(ALL_POSCAKE_WEBHOOK_PATHS, (req, res) => {
  const receiveTime = formatDateTimeVi();
  console.log(`\n📥 [POSCAKE WEBHOOK NHẬN ĐƯỢC LÚC ${receiveTime}] PATH: ${req.originalUrl || req.url}`);

  // Phản hồi 200 OK ngay lập tức cho POS Cake
  res.status(200).json({
    success: true,
    message: 'Đã nhận webhook từ POS Cake thành công',
    timestamp: receiveTime
  });

  // Đẩy tác vụ xử lý vào nền chạy ngầm (non-blocking)
  setImmediate(async () => {
    try {
      await processPosCakeWebhookAsync(req.body);
    } catch (err: any) {
      console.error('[POSCAKE Webhook Error]', err.message);
    }
  });
});

/**
 * 3. Tự động Cấu hình Webhook lên POS Cake (PUT & POST /api/poscake/register-webhook)
 * Thực hiện lệnh HTTP PUT sang https://pos.pages.fm/api/v1/shops/1021979794?api_key={POSCAKE_API_KEY}
 */
const handleRegisterWebhook = async (req: express.Request, res: express.Response) => {
  try {
    const config = await getPancakeConfig();
    const apiKey = (
      req.body?.api_key ||
      req.query?.api_key ||
      config?.api_key ||
      process.env.POSCAKE_API_KEY ||
      process.env.PANCAKE_PUBLIC_API_TOKEN ||
      ''
    ).trim();

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'Chưa có API Key của POS Cake. Vui lòng cung cấp API Key để tự động đăng ký Webhook.'
      });
    }

    const shopId = String(req.body?.shop_id || POSCAKE_DEFAULT_SHOP_ID);
    const webhookUrl = req.body?.webhook_url || POSCAKE_DEFAULT_WEBHOOK_URL;
    const webhookActive = req.body?.webhook_active !== false;

    const poscakeApiUrl = `https://pos.pages.fm/api/v1/shops/${shopId}?api_key=${encodeURIComponent(apiKey)}`;
    const requestPayload = {
      shop: {
        webhook_url: webhookUrl,
        webhook_active: webhookActive
      }
    };

    console.log(`[POSCAKE Auto Register] Gửi PUT sang: https://pos.pages.fm/api/v1/shops/${shopId}`);
    console.log('[POSCAKE Auto Register] Payload:', JSON.stringify(requestPayload));

    const response = await fetch(poscakeApiUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'TourCRM/1.0'
      },
      body: JSON.stringify(requestPayload)
    });

    const responseData = await response.json().catch(() => ({}));

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: responseData.message || responseData.error || `Lỗi kết nối POS Cake API (HTTP ${response.status})`,
        details: responseData
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Cấu hình Webhook Realtime trên POS Cake thành công!',
      shop_id: shopId,
      webhook_url: webhookUrl,
      webhook_active: webhookActive,
      poscake_response: responseData
    });
  } catch (error: any) {
    console.error('[POSCAKE Auto Register Error]', error.message);
    return res.status(500).json({
      success: false,
      error: `Lỗi khi gọi API POS Cake: ${error.message}`
    });
  }
};

router.get('/api/poscake/register-webhook', handleRegisterWebhook);
router.put('/api/poscake/register-webhook', handleRegisterWebhook);
router.post('/api/poscake/register-webhook', handleRegisterWebhook);

/**
 * 4. Kiểm tra cấu hình và trạng thái Webhook của Shop POS Cake (GET)
 */
router.get('/api/poscake/status', async (req, res) => {
  try {
    const config = await getPancakeConfig();
    const apiKey = (
      req.query?.api_key ||
      config?.api_key ||
      process.env.POSCAKE_API_KEY ||
      process.env.PANCAKE_PUBLIC_API_TOKEN ||
      ''
    ).toString().trim();

    const shopId = String(req.query?.shop_id || POSCAKE_DEFAULT_SHOP_ID);

    if (!apiKey) {
      return res.json({
        success: true,
        data: {
          shop_id: shopId,
          configured_url: POSCAKE_DEFAULT_WEBHOOK_URL,
          has_api_key: false,
          status: 'Chưa cấu hình API Key'
        }
      });
    }

    const checkUrl = `https://pos.pages.fm/api/v1/shops/${shopId}?api_key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(checkUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TourCRM/1.0'
      }
    });

    if (response.ok) {
      const data = await response.json() as any;
      return res.json({
        success: true,
        data: {
          shop_id: shopId,
          shop_info: data.data || data.shop || data,
          configured_url: POSCAKE_DEFAULT_WEBHOOK_URL,
          has_api_key: true
        }
      });
    }

    return res.json({
      success: true,
      data: {
        shop_id: shopId,
        configured_url: POSCAKE_DEFAULT_WEBHOOK_URL,
        has_api_key: true,
        error: `HTTP ${response.status}`
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
