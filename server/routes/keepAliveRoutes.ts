import { Router, Request, Response } from 'express';
import { pingSupabaseDatabase, getLastPingResult } from '../services/keepAliveService.js';

const router = Router();

/**
 * GET /api/keep-alive
 * GET /api/supabase-keepalive
 * Endpoint kích hoạt ping Supabase giữ ấm database chống auto-pause 7 ngày
 */
const handleKeepAlive = async (req: Request, res: Response) => {
  try {
    const result = await pingSupabaseDatabase();

    if (!result.success) {
      return res.status(502).json({
        status: 'error',
        ...result
      });
    }

    return res.status(200).json({
      status: 'active',
      ...result
    });
  } catch (err: any) {
    return res.status(500).json({
      status: 'error',
      success: false,
      timestamp: new Date().toISOString(),
      error: err?.message || 'Lỗi xử lý keep-alive'
    });
  }
};

router.get('/api/keep-alive', handleKeepAlive);
router.get('/api/supabase-keepalive', handleKeepAlive);

/**
 * GET /api/keep-alive/status
 * Lấy trạng thái ping giữ ấm gần nhất
 */
router.get('/api/keep-alive/status', (req: Request, res: Response) => {
  const lastResult = getLastPingResult();
  res.json({
    configured: true,
    lastPing: lastResult || {
      success: false,
      timestamp: null,
      message: 'Chưa có lượt ping nào được ghi nhận'
    }
  });
});

export default router;
