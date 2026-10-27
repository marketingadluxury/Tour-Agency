import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Send, 
  X, 
  Monitor, 
  Laptop, 
  ShieldCheck 
} from 'lucide-react';
import { 
  isDesktopNotificationSupported, 
  getDesktopNotificationPermission, 
  isDesktopNotificationEnabled, 
  setDesktopNotificationEnabled, 
  isDesktopNotificationSoundMuted, 
  setDesktopNotificationSoundMuted, 
  requestDesktopNotificationPermission, 
  sendTestDesktopNotification,
  playNotificationSound
} from '@/utils/desktopNotification';

interface DesktopNotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DesktopNotificationSettingsModal: React.FC<DesktopNotificationSettingsModalProps> = ({
  isOpen,
  onClose
}) => {
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [enabled, setEnabled] = useState(true);
  const [muted, setMuted] = useState(false);
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const isSup = isDesktopNotificationSupported();
      setSupported(isSup);
      if (isSup) {
        setPermission(getDesktopNotificationPermission());
        setEnabled(isDesktopNotificationEnabled());
        setMuted(isDesktopNotificationSoundMuted());
      }
      setTestSent(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    const success = await requestDesktopNotificationPermission();
    setPermission(getDesktopNotificationPermission());
    setEnabled(isDesktopNotificationEnabled());
    if (success) {
      // Gửi thông báo chào mừng
      sendTestDesktopNotification();
      setTestSent(true);
    }
  };

  const handleToggleEnabled = () => {
    const nextState = !enabled;
    setEnabled(nextState);
    setDesktopNotificationEnabled(nextState);
  };

  const handleToggleSound = () => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    setDesktopNotificationSoundMuted(nextMuted);
    if (!nextMuted) {
      playNotificationSound();
    }
  };

  const handleSendTest = () => {
    playNotificationSound();
    sendTestDesktopNotification();
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/15 rounded-xl backdrop-blur-xs">
              <Monitor className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Cài Đặt Thông Báo Desktop</h3>
              <p className="text-[11px] text-blue-100">Thông báo đẩy native trên màn hình máy tính</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs text-slate-700">
          {!supported ? (
            <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2.5 text-amber-900">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Trình duyệt không hỗ trợ</p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Trình duyệt này không hỗ trợ HTML5 Web Notification. Hãy dùng Google Chrome, Microsoft Edge, Firefox hoặc Safari.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Permission Banner */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                permission === 'granted'
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                  : permission === 'denied'
                  ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                  : 'bg-blue-50/80 border-blue-200 text-blue-950'
              }`}>
                <div className="flex items-center gap-2.5">
                  {permission === 'granted' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : permission === 'denied' ? (
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  ) : (
                    <Bell className="w-5 h-5 text-blue-600 shrink-0 animate-bounce" />
                  )}
                  <div>
                    <div className="font-bold text-xs">
                      {permission === 'granted' && 'Đã cấp quyền thông báo'}
                      {permission === 'denied' && 'Trình duyệt đang chặn thông báo'}
                      {permission === 'default' && 'Chưa cấp quyền thông báo'}
                    </div>
                    <div className="text-[11px] opacity-80 mt-0.5">
                      {permission === 'granted' && 'Hệ thống đã sẵn sàng gửi thông báo lên Desktop.'}
                      {permission === 'denied' && 'Bấm vào biểu tượng ổ khóa bên cạnh thanh địa chỉ để Bật lại.'}
                      {permission === 'default' && 'Bấm nút dưới để cho phép nhận thông báo.'}
                    </div>
                  </div>
                </div>

                {permission === 'default' && (
                  <button
                    type="button"
                    onClick={handleRequestPermission}
                    className="shrink-0 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs transition-colors shadow-xs active:scale-95"
                  >
                    Cho phép
                  </button>
                )}
              </div>

              {/* Toggles */}
              {permission === 'granted' && (
                <div className="space-y-3 pt-1">
                  {/* Toggle 1: Nhận thông báo Desktop */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                        <Laptop className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">Thông báo đẩy Desktop</div>
                        <div className="text-[10px] text-slate-500">Bật banner thông báo native góc màn hình</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleEnabled}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                        enabled ? 'bg-blue-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Toggle 2: Âm thanh chuông */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                        {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">Âm thanh chuông (Ding-dong)</div>
                        <div className="text-[10px] text-slate-500">Phát âm thanh nhẹ nhàng khi có thông báo mới</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleSound}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                        !muted ? 'bg-indigo-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          !muted ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Nút gửi thông báo thử nghiệm */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleSendTest}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-blue-700 font-bold rounded-xl border border-blue-200 transition-all shadow-2xs active:scale-98"
                    >
                      <Send className="w-3.5 h-3.5 text-blue-600" />
                      <span>{testSent ? 'Đã gửi thông báo thử nghiệm!' : 'Gửi thử 1 thông báo lên màn hình Desktop'}</span>
                    </button>
                    <p className="text-[10px] text-slate-500 text-center mt-1.5 italic">
                      * Bấm nút này để nghe chuông và thấy banner xuất hiện ở góc dưới/trên màn hình máy tính của bạn.
                    </p>
                  </div>
                </div>
              )}

              {/* Tính năng nổi bật */}
              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                <div className="font-bold text-[11px] text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>Các sự kiện sẽ tự động gửi thông báo:</span>
                </div>
                <ul className="text-[10.5px] text-slate-600 space-y-1 list-disc pl-4">
                  <li><strong>Hành chính & Quản lý:</strong> Đơn xin nghỉ phép mới / Đề nghị thanh toán cần duyệt</li>
                  <li><strong>Kế toán & BOD:</strong> Khách chuyển khoản / Phiếu thu tiền mới cần xác nhận</li>
                  <li><strong>Kinh doanh & Điều hành:</strong> Booking mới giữ chỗ / Hết hạn giữ chỗ tour</li>
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
