import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  ShieldCheck, 
  CheckCircle2, 
  RefreshCw, 
  Check, 
  Plus, 
  Trash2,
  AlertCircle,
  X,
  Key,
  ExternalLink,
  Copy,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

interface ConnectedAccount {
  email: string;
  display_name?: string;
  connected_at?: string;
  is_active?: boolean;
}

export const GoogleDriveSettingsSection: React.FC = () => {
  const { session, profile, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const [isActive, setIsActive] = useState(true);
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<string>('');

  // Modal Connect Account
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'token' | 'oauth'>('token');

  // Modal Confirm Delete Account
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form Token state
  const [formEmail, setFormEmail] = useState('admin@yourcompany.com');
  const [formDisplayName, setFormDisplayName] = useState('Quản trị viên');
  const [formRefreshToken, setFormRefreshToken] = useState('');
  const [formSetActive, setFormSetActive] = useState(true);
  const [isAddingToken, setIsAddingToken] = useState(false);

  // Copy state
  const [copiedUrl1, setCopiedUrl1] = useState(false);
  const [copiedUrl2, setCopiedUrl2] = useState(false);

  const currentOrigin = window.location.origin;
  const callbackUrlDev = `${currentOrigin}/api/drive/oauth/callback`;
  const callbackUrlProd = `https://tours-agency.vercel.app/api/drive/oauth/callback`;

  const fetchConfig = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const token = session?.access_token;
      const headers: HeadersInit = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (profile?.role) headers['x-user-role'] = profile.role;
      if (user?.email) headers['x-user-email'] = user.email;

      const res = await fetch('/api/drive/config', { headers });
      const data = await res.json();
      if (data.success) {
        setIsActive(data.is_active !== false);
        const list: ConnectedAccount[] = data.connected_accounts || [];
        setAccounts(list);
        
        const active = data.active_email || list[0]?.email || '';
        setSelectedEmail(active);
      }
    } catch (err: any) {
      console.error('Lỗi nạp danh sách tài khoản Google Drive:', err);
      if (!silent) toast.error('Không thể nạp thông tin tài khoản Google Drive.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();

    // Lắng nghe sự kiện từ cửa sổ Popup OAuth
    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_DRIVE_OAUTH_SUCCESS') {
        const userEmail = event.data.email;
        toast.success(`🎉 Đã kết nối tài khoản Google ${userEmail} thành công!`, { duration: 4000 });
        setIsModalOpen(false);
        fetchConfig(true);
      } else if (event.data?.type === 'GOOGLE_DRIVE_OAUTH_FAILED') {
        toast.error(`❌ Kết nối thất bại: ${event.data.error || 'Đã hủy đăng nhập'}`);
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, []);

  // 1. Thêm tài khoản bằng Refresh Token (Cách nhanh & chắc chắn 100%)
  const handleAddAccountByToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmail.trim() || !formRefreshToken.trim()) {
      toast.error('Vui lòng nhập đầy đủ Email tài khoản và Refresh Token.');
      return;
    }

    try {
      setIsAddingToken(true);
      const token = session?.access_token;
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (profile?.role) headers['x-user-role'] = profile.role;
      if (user?.email) headers['x-user-email'] = user.email;

      const res = await fetch('/api/drive/add-account', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: formEmail.trim(),
          display_name: formDisplayName.trim() || undefined,
          refresh_token: formRefreshToken.trim(),
          set_active: formSetActive
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Xác thực thất bại.');
      }

      toast.success(`🎉 ${data.message || 'Đã kết nối tài khoản thành công!'}`);
      setIsModalOpen(false);
      setFormRefreshToken('');
      await fetchConfig(true);
    } catch (err: any) {
      console.error('Add account error:', err);
      toast.error(err.message || 'Lỗi khi kết nối tài khoản Google Drive.');
    } finally {
      setIsAddingToken(false);
    }
  };

  // 2. Mở popup Google OAuth 1-Click
  const handleStartOAuth = async () => {
    try {
      setConnecting(true);
      const res = await fetch('/api/drive/oauth/auth-url');
      const data = await res.json();

      if (!data.success || !data.auth_url) {
        throw new Error(data.error || 'Không thể tạo liên kết đăng nhập Google.');
      }

      const width = 560;
      const height = 660;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        data.auth_url,
        'google_drive_oauth_window',
        `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`
      );

      if (!popup) {
        window.open(data.auth_url, '_blank');
      }
    } catch (err: any) {
      console.error('Lỗi khởi động kết nối Google:', err);
      toast.error(err.message || 'Lỗi khi mở đăng nhập Google.');
    } finally {
      setConnecting(false);
    }
  };

  // 3. Lưu và kiểm tra kết nối (Chọn tài khoản active)
  const handleSaveAndTest = async () => {
    if (!selectedEmail) {
      toast.error('Vui lòng chọn một tài khoản Google Drive.');
      return;
    }

    try {
      setSaving(true);
      const token = session?.access_token;
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (profile?.role) headers['x-user-role'] = profile.role;
      if (user?.email) headers['x-user-email'] = user.email;

      const res = await fetch('/api/drive/select-account', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: selectedEmail,
          is_active: isActive
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Không thể lưu cấu hình.');
      }

      toast.success(`🎉 Đã lưu và kích hoạt tài khoản ${selectedEmail} thành công!`);
      await fetchConfig(true);
    } catch (err: any) {
      console.error('Lỗi lưu tài khoản Google Drive:', err);
      toast.error(err.message || 'Lỗi khi lưu cấu hình.');
    } finally {
      setSaving(false);
    }
  };

  // 4. Mở modal xác nhận xóa tài khoản
  const handleOpenDeleteModal = (email: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAccountToDelete(email);
  };

  // 5. Thực hiện xóa tài khoản sau khi người dùng bấm xác nhận trong Modal
  const handleConfirmDelete = async () => {
    if (!accountToDelete) return;

    try {
      setIsDeleting(true);
      const token = session?.access_token;
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (profile?.role) headers['x-user-role'] = profile.role;
      if (user?.email) headers['x-user-email'] = user.email;

      const res = await fetch('/api/drive/remove-account', {
        method: 'POST',
        headers,
        body: JSON.stringify({ email: accountToDelete })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Đã ngắt kết nối và xóa tài khoản ${accountToDelete} thành công.`);
        setAccountToDelete(null);
        await fetchConfig(true);
      } else {
        toast.error(data.error || 'Lỗi khi xóa tài khoản.');
      }
    } catch (err: any) {
      console.error('Lỗi khi xóa tài khoản Google Drive:', err);
      toast.error('Lỗi kết nối máy chủ.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
        <p className="text-xs font-bold text-slate-600">Đang nạp danh sách tài khoản Google Drive...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Khung Card chính */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6">
        {/* Header box */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-150 gap-3">
          <div className="space-y-1">
            <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Cloud className="w-5 h-5 text-blue-600" />
              <span>Lưu trữ Google Drive</span>
            </h3>
            <p className="text-xs text-slate-600 font-medium">
              Chỉ quản trị viên được kết nối và chọn tài khoản nhận file mới.
            </p>
          </div>

          <div className="shrink-0">
            {isActive ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span>Đang hoạt động</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                <span>Tạm dừng lưu trữ</span>
              </span>
            )}
          </div>
        </div>

        {/* Hộp bảo mật: Kết nối an toàn qua Google */}
        <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 text-blue-900 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h4 className="text-xs font-black uppercase tracking-wide text-blue-950">
              Kết nối an toàn qua Google
            </h4>
            <p className="text-xs text-blue-800/90 font-medium leading-relaxed">
              Bạn đăng nhập trên trang Google; CRM chỉ giữ quyền truy cập ở backend, không hiển thị mã bảo mật. Khi đổi tài khoản, file cũ vẫn được đọc qua kết nối trước đó.
            </p>
          </div>
        </div>

        {/* Danh sách Tài khoản đã kết nối (Radio Select) */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-800">
            Tài khoản đã kết nối
          </label>

          <div className="space-y-2.5">
            {accounts.map((acc) => {
              const isSelected = selectedEmail === acc.email;

              return (
                <div
                  key={acc.email}
                  onClick={() => setSelectedEmail(acc.email)}
                  className={`p-3.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/30 ring-1 ring-blue-500/20 shadow-2xs'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="selectedDriveAccount"
                      checked={isSelected}
                      onChange={() => setSelectedEmail(acc.email)}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                        <span>{acc.email}</span>
                        {acc.display_name && (
                          <span className="text-[11px] font-medium text-slate-500">
                            ({acc.display_name})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {acc.is_active && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Đang dùng</span>
                      </span>
                    )}

                    {accounts.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => handleOpenDeleteModal(acc.email, e)}
                        title="Xóa kết nối tài khoản này"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Checkbox Kích hoạt Google Drive cho file tải lên mới */}
        <div className="flex items-center gap-2.5 pt-1">
          <input
            type="checkbox"
            id="driveActiveCheckbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
          <label htmlFor="driveActiveCheckbox" className="text-xs font-bold text-slate-800 cursor-pointer select-none">
            Kích hoạt Google Drive cho file tải lên mới
          </label>
        </div>

        {/* Nhóm 3 nút thao tác chuẩn */}
        <div className="pt-2 flex flex-wrap items-center gap-3">
          {/* Nút 1: Mở Modal kết nối tài khoản Google khác */}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-blue-700 bg-white hover:bg-blue-50 border border-blue-600 transition-all cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Kết nối tài khoản Google khác</span>
          </button>

          {/* Nút 2: Lưu và kiểm tra kết nối */}
          <button
            type="button"
            onClick={handleSaveAndTest}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            <Check className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
            <span>{saving ? 'Đang lưu & kiểm tra...' : 'Lưu và kiểm tra kết nối'}</span>
          </button>

          {/* Nút 3: Tải lại */}
          <button
            type="button"
            onClick={() => fetchConfig()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 transition-all cursor-pointer shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Tải lại</span>
          </button>
        </div>

        {/* Dòng ghi chú chân trang */}
        <p className="text-[11px] text-slate-500 font-medium leading-relaxed pt-2 border-t border-slate-150">
          Tắt lưu trữ sẽ dừng upload Drive mới; không xóa kết nối hoặc file. Nếu tài khoản cũ bị thu hồi quyền, các file trên tài khoản đó sẽ không thể mở cho đến khi quyền được khôi phục.
        </p>
      </div>

      {/* ================= MODAL KẾT NỐI TÀI KHOẢN GOOGLE ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold">
                  <Cloud className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Kết nối tài khoản Google Drive</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Thêm tài khoản lưu trữ hồ sơ và hóa đơn</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Tab Buttons */}
            <div className="flex bg-slate-100 p-1 rounded-xl gap-1 my-4">
              <button
                type="button"
                onClick={() => setModalTab('token')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  modalTab === 'token'
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Key className="w-3.5 h-3.5 text-blue-600" />
                <span>Nhập Refresh Token (Khuyên dùng)</span>
              </button>
              <button
                type="button"
                onClick={() => setModalTab('oauth')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  modalTab === 'oauth'
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                <span>Đăng nhập 1-Click</span>
              </button>
            </div>

            {/* TAB 1: NHẬP REFRESH TOKEN */}
            {modalTab === 'token' && (
              <form onSubmit={handleAddAccountByToken} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    Email tài khoản Google <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="ví dụ: admin@yourcompany.com"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    Tên hiển thị / Ghi chú (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={formDisplayName}
                    onChange={(e) => setFormDisplayName(e.target.value)}
                    placeholder="ví dụ: Quản trị viên (Marketing)"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    Google OAuth Refresh Token <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={formRefreshToken}
                    onChange={(e) => setFormRefreshToken(e.target.value)}
                    placeholder="1//04... (Dán Refresh Token tại đây)"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs font-mono"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="formSetActiveCheckbox"
                    checked={formSetActive}
                    onChange={(e) => setFormSetActive(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="formSetActiveCheckbox" className="text-xs font-bold text-slate-800 cursor-pointer select-none">
                    Kích hoạt làm tài khoản lưu trữ chính ngay sau khi thêm
                  </label>
                </div>

                {/* Hướng dẫn lấy Token nhanh */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-600 space-y-1">
                  <div className="font-bold text-slate-800 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-blue-600" />
                    <span>Cách lấy Refresh Token trong 1 phút qua OAuth Playground:</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-0.5 text-slate-600 pl-1">
                    <li>Mở <a href="https://developers.google.com/oauthplayground" target="_blank" rel="noreferrer" className="text-blue-600 font-bold underline">developers.google.com/oauthplayground</a></li>
                    <li>Ở góc phải bấm bánh răng ⚙️, tick <strong>Use your own OAuth credentials</strong> (nhập Client ID & Secret nếu có).</li>
                    <li>Tìm mục <strong>Drive API v3</strong>, chọn <code>https://www.googleapis.com/auth/drive</code> ➔ Bấm <strong>Authorize APIs</strong> và đăng nhập tài khoản Google.</li>
                    <li>Bấm <strong>Exchange authorization code for tokens</strong> và copy chuỗi <strong>Refresh token</strong> dán vào ô trên.</li>
                  </ol>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isAddingToken}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm disabled:opacity-50"
                  >
                    <Check className={`w-3.5 h-3.5 ${isAddingToken ? 'animate-spin' : ''}`} />
                    <span>{isAddingToken ? 'Đang xác thực...' : 'Thêm vào danh sách tài khoản'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: ĐĂNG NHẬP 1-CLICK */}
            {modalTab === 'oauth' && (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-950">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Để tránh lỗi 400 redirect_uri_mismatch:</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Hãy truy cập <strong>Google Cloud Console ➔ Credentials</strong> của Client ID và thêm 2 địa chỉ Callback sau vào mục <strong>Authorized redirect URIs</strong>:
                  </p>

                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center gap-1.5 bg-white p-2 rounded-lg border border-amber-200 text-[11px] font-mono select-all">
                      <span className="flex-1 truncate">{callbackUrlProd}</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(callbackUrlProd);
                          setCopiedUrl1(true);
                          setTimeout(() => setCopiedUrl1(false), 2000);
                        }}
                        className="p-1 hover:bg-amber-50 rounded text-amber-800 shrink-0 font-sans text-[10px] font-bold"
                      >
                        {copiedUrl1 ? '✓ Đã chép' : 'Chép'}
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 bg-white p-2 rounded-lg border border-amber-200 text-[11px] font-mono select-all">
                      <span className="flex-1 truncate">{callbackUrlDev}</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(callbackUrlDev);
                          setCopiedUrl2(true);
                          setTimeout(() => setCopiedUrl2(false), 2000);
                        }}
                        className="p-1 hover:bg-amber-50 rounded text-amber-800 shrink-0 font-sans text-[10px] font-bold"
                      >
                        {copiedUrl2 ? '✓ Đã chép' : 'Chép'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={handleStartOAuth}
                    disabled={connecting}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    <ExternalLink className={`w-4 h-4 ${connecting ? 'animate-spin' : ''}`} />
                    <span>{connecting ? 'Đang mở đăng nhập Google...' : 'Mở trang đăng nhập & chọn tài khoản Google'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal xác nhận ngắt kết nối tài khoản Google Drive */}
      {accountToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden transform transition-all">
            <div className="p-6">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto mb-4 text-rose-600">
                <Trash2 className="w-6 h-6" />
              </div>

              <h3 className="text-base font-bold text-slate-900 text-center mb-2">
                Xác nhận ngắt kết nối tài khoản
              </h3>

              <p className="text-xs text-slate-600 text-center leading-relaxed mb-4">
                Bạn có chắc chắn muốn ngắt kết nối và xóa tài khoản{' '}
                <strong className="text-slate-900 font-bold font-mono">{accountToDelete}</strong>{' '}
                khỏi danh sách Google Drive của hệ thống không?
              </p>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/60 text-[11px] text-amber-800 flex items-start gap-2 mb-6">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Các tệp đã tải lên trước đó vẫn được lưu an toàn trên Google Drive. Tuy nhiên hệ thống sẽ không thể tiếp tục tải tệp lên tài khoản này.
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setAccountToDelete(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 text-xs font-bold text-white hover:bg-rose-700 shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang xóa...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xác nhận xóa</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
