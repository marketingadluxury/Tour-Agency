import express from 'express';
import { processBotcakeWebhook, normalizeVietnamesePhone } from '../services/botcakeService.js';

const router = express.Router();

/**
 * GET /api/webhooks/botcake
 * Kiểm tra trạng thái endpoint Webhook Botcake
 */
router.get(['/webhooks/botcake', '/api/webhooks/botcake'], (req, res) => {
  const secretConfigured = !!process.env.BOTCAKE_WEBHOOK_SECRET;
  res.json({
    status: 'online',
    service: 'Botcake Webhook Receiver - Tour CRM',
    auth_required: secretConfigured,
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/webhooks/botcake
 * Tiếp nhận payload Webhook từ tính năng JSON API của Botcake
 */
router.post(['/webhooks/botcake', '/api/webhooks/botcake'], (req, res) => {
  // === [TEMPORARY LOGGER] Ghi log chi tiết toàn bộ Headers và Body nhận được từ Botcake ===
  console.log('\n======================================================');
  console.log('📥 [BOTCAKE WEBHOOK INCOMING REQUEST] -', new Date().toISOString());
  console.log('📌 URL:', req.originalUrl || req.url);
  console.log('📌 Method:', req.method);
  console.log('📌 Headers:\n', JSON.stringify(req.headers, null, 2));
  console.log('📌 Body Raw / Parsed:\n', typeof req.body === 'object' ? JSON.stringify(req.body, null, 2) : req.body);
  console.log('======================================================\n');

  const secret = process.env.BOTCAKE_WEBHOOK_SECRET;
  const botcakeTokenHeader = req.headers['x-botcake-token'] || req.headers['x-webhook-secret'] || req.headers['authorization'];

  // Xác thực token nếu BOTCAKE_WEBHOOK_SECRET được cấu hình
  if (secret) {
    let cleanHeader = String(botcakeTokenHeader || '').trim();
    if (cleanHeader.startsWith('Bearer ')) {
      cleanHeader = cleanHeader.slice(7).trim();
    }

    if (!cleanHeader || cleanHeader !== secret) {
      console.warn('[Botcake Webhook] Xác thực thất bại: Header token không khớp với BOTCAKE_WEBHOOK_SECRET');
      res.status(401).json({ error: 'Unauthorized: Invalid x-botcake-token' });
      return;
    }
  }

  // 1. Trả về res.status(200).send('OK') ngay lập tức cho Botcake để tránh timeout
  res.status(200).send('OK');

  // 2. Parse payload an toàn (hỗ trợ cả JSON object lẫn text string do middleware express.text)
  let payload: any = req.body;
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch (e) {
      // Thử bóc tách URL encoded nếu có
      try {
        const params = new URLSearchParams(payload);
        const obj: any = {};
        for (const [k, v] of params.entries()) {
          obj[k] = v;
        }
        if (Object.keys(obj).length > 0) payload = obj;
      } catch (err) {}
    }
  }

  if (!payload || typeof payload !== 'object') {
    console.warn('[Botcake Webhook] Payload không hợp lệ hoặc rỗng');
    return;
  }

  // 3. Xử lý dữ liệu và lưu vào Supabase ngầm (Background Async)
  (async () => {
    try {
      await processBotcakeWebhook(payload);
    } catch (asyncErr: any) {
      console.error('[Botcake Webhook] Lỗi xử lý dữ liệu ngầm:', asyncErr.message || asyncErr);
    }
  })();
});

export default router;
