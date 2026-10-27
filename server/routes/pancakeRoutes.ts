import express from 'express';
import { 
  getPancakeConfig, 
  savePancakeConfig, 
  testPancakeConnection, 
  syncPancakeConversations,
  handleIncomingPancakeWebhook,
  getPosCakeProvinces,
  getPosCakeDistricts,
  getPosCakeCommunes,
  getPosCakeShops
} from '../services/pancakeService.js';

const router = express.Router();

// Danh sách các route webhook hợp lệ cho Pancake, POS Cake và Botcake
const WEBHOOK_PATHS = [
  '/api/pancake/webhook',
  '/api/poscake/webhook',
  '/api/pos/webhook',
  '/api/botcake/webhook'
];

/**
 * Endpoint xác thực Webhook Pancake, POS Cake & Botcake (GET)
 */
router.get(WEBHOOK_PATHS, (req, res) => {
  const challenge = req.query['hub.challenge'] || req.query['challenge'] || 'ok';
  res.status(200).send(challenge);
});

/**
 * Endpoint nhận dữ liệu Webhook Realtime từ Pancake, POS Cake & Botcake (POST)
 */
router.post(WEBHOOK_PATHS, async (req, res) => {
  console.log('\n======================================================');
  console.log('📥 [PANCAKE / POS CAKE WEBHOOK REQUEST] -', new Date().toISOString());
  console.log('📌 URL:', req.originalUrl || req.url);
  console.log('📌 Method:', req.method);
  console.log('📌 Headers:\n', JSON.stringify(req.headers, null, 2));
  console.log('📌 Body Raw / Parsed:\n', typeof req.body === 'object' ? JSON.stringify(req.body, null, 2) : req.body);
  console.log('======================================================\n');

  try {
    const config = await getPancakeConfig();
    
    // Kiểm tra khóa bảo vệ webhook nếu đã được cấu hình
    if (config.webhook_secret && config.webhook_secret.trim()) {
      const incomingSecret = (req.headers['x-webhook-secret'] as string) || 
                             (req.headers['x-hub-signature'] as string) ||
                             (req.query['token'] as string) || 
                             (req.query['secret'] as string) ||
                             (req.query['key'] as string);

      if (incomingSecret && incomingSecret !== config.webhook_secret.trim()) {
        console.warn('[Pancake Webhook] Cảnh báo: Khóa webhook không khớp!', { incomingSecret });
      }
    }

    let payload = req.body;
    
    // Nếu payload là dạng chuỗi thô (do header Content-Type chưa set application/json ở Botcake/POS)
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch (jsonErr) {
        try {
          const params = new URLSearchParams(payload);
          const obj: Record<string, any> = {};
          for (const [key, value] of params.entries()) {
            obj[key] = value;
          }
          if (Object.keys(obj).length > 0) payload = obj;
        } catch (urlErr) {}
      }
    }

    console.log('[Pancake/POS Cake Webhook] Nhận payload:', JSON.stringify(payload).substring(0, 300));
    const result = await handleIncomingPancakeWebhook(payload);
    res.status(200).json(result);
  } catch (error: any) {
    console.error('[Pancake/POS Cake Webhook] Lỗi:', error.message);
    res.status(200).json({ success: false, error: error.message });
  }
});

/**
 * Lấy cấu hình Pancake API
 */
router.get('/api/pancake/config', async (req, res) => {
  try {
    const config = await getPancakeConfig();
    const maskedKey = config.api_key 
      ? (config.api_key.length > 16 
          ? `${config.api_key.substring(0, 8)}...${config.api_key.substring(config.api_key.length - 6)}`
          : '******')
      : '';

    const maskedSecret = config.webhook_secret
      ? (config.webhook_secret.length > 8
          ? `${config.webhook_secret.substring(0, 4)}••••••••${config.webhook_secret.substring(config.webhook_secret.length - 4)}`
          : '••••••••')
      : '';

    res.json({
      success: true,
      data: {
        api_key_masked: maskedKey,
        has_api_key: Boolean(config.api_key),
        webhook_secret_masked: maskedSecret,
        has_webhook_secret: Boolean(config.webhook_secret),
        is_active: config.is_active !== false,
        auto_sync: config.auto_sync !== false,
        last_synced_at: config.last_synced_at,
        last_lead_at: config.last_lead_at
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Cập nhật cấu hình Pancake API
 */
router.post('/api/pancake/config', async (req, res) => {
  try {
    const { api_key, webhook_secret, is_active, auto_sync } = req.body;
    let finalKey = api_key;
    if (finalKey === undefined || finalKey.includes('...')) {
      const current = await getPancakeConfig();
      finalKey = current.api_key;
    }

    let finalSecret = webhook_secret;
    if (finalSecret === undefined || finalSecret.includes('••••')) {
      const current = await getPancakeConfig();
      finalSecret = current.webhook_secret;
    }

    const result = await savePancakeConfig({
      api_key: finalKey,
      webhook_secret: finalSecret,
      is_active: is_active !== false,
      auto_sync: auto_sync !== false
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Kiểm tra kết nối với Pancake Public API
 */
router.post('/api/pancake/test-connection', async (req, res) => {
  try {
    let { api_key } = req.body;
    if (!api_key || api_key.includes('...')) {
      const current = await getPancakeConfig();
      api_key = current.api_key;
    }
    const result = await testPancakeConnection(api_key);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Thực hiện đồng bộ hội thoại & khách hàng có SĐT từ Pancake về CRM
 */
router.post('/api/pancake/sync', async (req, res) => {
  try {
    const result = await syncPancakeConversations();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Tra cứu Tỉnh/Thành phố từ Pancake POS Geo API
 * (https://docs.pancake.biz/pos/api/#tag/address)
 */
router.get('/api/pancake/pos/geo/provinces', async (req, res) => {
  try {
    const result = await getPosCakeProvinces();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Tra cứu Quận/Huyện theo Tỉnh từ Pancake POS Geo API
 */
router.get('/api/pancake/pos/geo/districts', async (req, res) => {
  try {
    const provinceId = String(req.query.province_id || '');
    const result = await getPosCakeDistricts(provinceId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Tra cứu Xã/Phường theo Huyện từ Pancake POS Geo API
 */
router.get('/api/pancake/pos/geo/communes', async (req, res) => {
  try {
    const districtId = String(req.query.district_id || '');
    const result = await getPosCakeCommunes(districtId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Lấy danh sách Shops từ POS Cake API
 */
router.get('/api/pancake/pos/shops', async (req, res) => {
  try {
    const result = await getPosCakeShops();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
