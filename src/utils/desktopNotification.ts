/**
 * Tour CRM - Hệ Thống Quản Lý Thông Báo Đẩy Desktop (Native Web Push Notifications)
 * Tương thích: Chrome, Edge, Safari, Firefox trên Windows, macOS, Linux, Android
 */

const STORAGE_KEY_ENABLED = 'crm_desktop_notif_enabled';
const STORAGE_KEY_MUTED = 'crm_desktop_notif_sound_muted';

/**
 * Kiểm tra xem trình duyệt hiện tại có hỗ trợ Notification API hay không
 */
export function isDesktopNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Lấy trạng thái quyền hiện tại từ trình duyệt
 * 'granted' (Đã cấp quyền) | 'denied' (Đã chặn) | 'default' (Chưa hỏi)
 */
export function getDesktopNotificationPermission(): NotificationPermission {
  if (!isDesktopNotificationSupported()) return 'denied';
  return Notification.permission;
}

/**
 * Kiểm tra xem người dùng đã bật thông báo Desktop trong CRM hay chưa
 */
export function isDesktopNotificationEnabled(): boolean {
  if (!isDesktopNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;
  return localStorage.getItem(STORAGE_KEY_ENABLED) !== 'false';
}

/**
 * Bật hoặc tắt trạng thái nhận thông báo trong CRM
 */
export function setDesktopNotificationEnabled(enabled: boolean): void {
  localStorage.setItem(STORAGE_KEY_ENABLED, enabled ? 'true' : 'false');
}

/**
 * Kiểm tra trạng thái bật/tắt âm thanh
 */
export function isDesktopNotificationSoundMuted(): boolean {
  return localStorage.getItem(STORAGE_KEY_MUTED) === 'true';
}

/**
 * Bật/tắt âm thanh thông báo
 */
export function setDesktopNotificationSoundMuted(muted: boolean): void {
  localStorage.setItem(STORAGE_KEY_MUTED, muted ? 'true' : 'false');
}

/**
 * Yêu cầu quyền gửi thông báo từ người dùng
 */
export async function requestDesktopNotificationPermission(): Promise<boolean> {
  if (!isDesktopNotificationSupported()) {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setDesktopNotificationEnabled(true);
      return true;
    }
    return false;
  } catch (error) {
    console.warn('Lỗi khi yêu cầu cấp quyền Notification:', error);
    return false;
  }
}

/**
 * Phát âm thanh chuông thông báo hệ thống (Web Audio API - E6 -> G#6 -> B6 Crystal Chimes)
 * Tăng cường âm lượng to rõ, trong trẻo, không phụ thuộc file ngoài, độ trễ 0ms
 */
export function playNotificationSound(): void {
  if (isDesktopNotificationSoundMuted()) return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Nốt 1: E6 (1318.5 Hz) - Âm mở đầu
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1318.5, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.70, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.45);

    // Nốt 2: G#6 (1661.2 Hz) sau 90ms - Âm chuyển tiếp
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1661.2, now + 0.09);
    gain2.gain.setValueAtTime(0, now + 0.09);
    gain2.gain.linearRampToValueAtTime(0.75, now + 0.11);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.09);
    osc2.stop(now + 0.55);

    // Nốt 3: B6 (1975.5 Hz) sau 180ms - Âm điểm nhấn cao vút, ngân vang
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(1975.5, now + 0.18);
    gain3.gain.setValueAtTime(0, now + 0.18);
    gain3.gain.linearRampToValueAtTime(0.85, now + 0.20);
    gain3.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now + 0.18);
    osc3.stop(now + 0.85);
  } catch (e) {
    console.warn('Không thể phát âm thanh chuông:', e);
  }
}

export interface DesktopNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  data?: any;
  playSound?: boolean;
  onClick?: () => void;
}

/**
 * Gửi thông báo đẩy Native lên Desktop của máy tính
 */
export function sendDesktopNotification(payload: DesktopNotificationPayload): Notification | null {
  if (!isDesktopNotificationSupported()) {
    return null;
  }

  if (Notification.permission !== 'granted' || !isDesktopNotificationEnabled()) {
    return null;
  }

  // Phát âm thanh chuông
  if (payload.playSound !== false) {
    playNotificationSound();
  }

  try {
    const notif = new Notification(payload.title, {
      body: payload.body,
      icon: payload.icon || '/favicon.svg',
      badge: payload.badge || '/favicon.svg',
      tag: payload.tag || `crm-notif-${Date.now()}`,
      data: payload.data || { url: payload.url },
      requireInteraction: false,
      silent: true // Tắt tiếng mặc định của OS để dùng tiếng chimes mượt mà của Web Audio
    });

    notif.onclick = () => {
      try {
        window.focus();
      } catch {}

      if (payload.onClick) {
        payload.onClick();
      }

      if (payload.url) {
        // Kích hoạt điều hướng React Router qua custom event
        window.dispatchEvent(new CustomEvent('crm-navigate-to', { detail: { path: payload.url, data: payload.data } }));
      }

      notif.close();
    };

    return notif;
  } catch (error) {
    console.warn('Lỗi khi hiển thị Desktop Notification:', error);
    return null;
  }
}

/**
 * Gửi thông báo đẩy thử nghiệm (Test Notification)
 */
export function sendTestDesktopNotification(): boolean {
  if (Notification.permission !== 'granted') {
    return false;
  }

  sendDesktopNotification({
    title: '🔔 Tour CRM - Kiểm Tra Thông Báo',
    body: 'Hệ thống thông báo đẩy Desktop đã được kích hoạt thành công! Bạn sẽ nhận được thông báo ngay cả khi đang làm việc trên ứng dụng khác.',
    url: '/leave-requests',
    playSound: true
  });

  return true;
}
