import { getAdminSupabaseClient } from './supabaseService.js';

export interface PingResult {
  success: boolean;
  timestamp: string;
  latencyMs?: number;
  message?: string;
  error?: string;
}

let lastPingResult: PingResult | null = null;

/**
 * Gửi truy vấn nhẹ tới Supabase để ghi nhận hoạt động và giữ ấm cơ sở dữ liệu (Keep-Alive)
 */
export async function pingSupabaseDatabase(): Promise<PingResult> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  try {
    const supabase = getAdminSupabaseClient();
    
    // Thực hiện truy vấn nhẹ nhất: đọc 1 dòng hoặc đếm dữ liệu từ bảng profiles
    const { error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    const latencyMs = Date.now() - startTime;

    if (error) {
      // Nếu có lỗi từ Supabase API
      const result: PingResult = {
        success: false,
        timestamp,
        latencyMs,
        error: error.message || 'Lỗi truy vấn Supabase'
      };
      lastPingResult = result;
      console.warn(`[KeepAlive] Ping Supabase thất bại (${latencyMs}ms):`, error.message);
      return result;
    }

    const result: PingResult = {
      success: true,
      timestamp,
      latencyMs,
      message: 'Supabase database pinged successfully (keep-alive active)'
    };
    lastPingResult = result;
    console.log(`[KeepAlive] Ping Supabase thành công - Phản hồi: ${latencyMs}ms lúc ${timestamp}`);
    return result;
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    const result: PingResult = {
      success: false,
      timestamp,
      latencyMs,
      error: err?.message || 'Không thể kết nối tới Supabase'
    };
    lastPingResult = result;
    console.error(`[KeepAlive] Lỗi ngoại lệ khi ping Supabase (${latencyMs}ms):`, err?.message);
    return result;
  }
}

/**
 * Lấy kết quả ping giữ ấm gần nhất
 */
export function getLastPingResult(): PingResult | null {
  return lastPingResult;
}

/**
 * Khởi động tiến trình tự động ping giữ ấm Supabase định kỳ (mỗi 24 giờ)
 */
export function initSupabaseKeepAlive(): void {
  // Thực hiện ping lần đầu sau 5 giây khi server khởi động
  setTimeout(async () => {
    try {
      await pingSupabaseDatabase();
    } catch (e) {
      console.warn('[KeepAlive] Lần ping khởi động không thành công:', e);
    }
  }, 5000);

  // Lặp lại mỗi 24 giờ một lần (24 * 60 * 60 * 1000 = 86400000ms)
  const intervalMs = 24 * 60 * 60 * 1000;
  const timer = setInterval(async () => {
    try {
      await pingSupabaseDatabase();
    } catch (e) {
      console.warn('[KeepAlive] Lỗi khi thực hiện ping định kỳ:', e);
    }
  }, intervalMs);

  // Đảm bảo timer không chặn tiến trình thoát khi shutdown
  if (timer && typeof timer.unref === 'function') {
    timer.unref();
  }
}
