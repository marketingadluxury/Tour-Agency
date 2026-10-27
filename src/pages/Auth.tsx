import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Lock, Mail, User, Phone, ArrowRight, Building2, Map, Eye, EyeOff, CheckCircle2, AlertCircle, Ticket } from 'lucide-react';

interface AuthProps {
  initialIsUpdatePassword?: boolean;
}

function translateAuthError(errMessage: string): string {
  if (!errMessage) return 'Có lỗi xảy ra, vui lòng thử lại.';
  if (errMessage.includes('60 seconds') || errMessage.includes('rate limit') || errMessage.includes('Too Many Requests')) {
    return 'Vì lý do bảo mật, hệ thống giới hạn chỉ gửi 1 email trong vòng 60 giây. Vui lòng kiểm tra kỹ hòm thư (kể cả mục Thư rác/Spam) hoặc đợi 60 giây trước khi bấm gửi lại!';
  }
  if (errMessage.includes('Invalid login credentials')) {
    return 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.';
  }
  if (errMessage.includes('Email not confirmed')) {
    return 'Tài khoản chưa được xác nhận email. Vui lòng kiểm tra hòm thư email (hoặc mục Thư rác/Spam) để nhấn liên kết xác nhận.';
  }
  if (errMessage.includes('User already registered') || errMessage.includes('already exists')) {
    return 'Email này đã được đăng ký tài khoản. Vui lòng chuyển sang tab "Đăng nhập ngay".';
  }
  if (errMessage.includes('Password should be at least')) {
    return 'Mật khẩu phải chứa ít nhất 6 ký tự.';
  }
  if (errMessage.includes('token is expired') || errMessage.includes('invalid') || errMessage.includes('expired')) {
    return 'Liên kết xác nhận/đặt lại mật khẩu đã hết hạn hoặc không hợp lệ. Vui lòng gửi lại yêu cầu mới.';
  }
  if (errMessage.includes('FetchError') || errMessage.includes('placeholder') || errMessage.includes('Failed to fetch')) {
    return 'Lỗi kết nối cơ sở dữ liệu Supabase. Vui lòng kiểm tra lại cấu hình kết nối.';
  }
  return errMessage;
}

export default function Auth({ initialIsUpdatePassword = false }: AuthProps) {
  const [isLogin, setIsLogin] = useState(!initialIsUpdatePassword);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isUpdatePassword, setIsUpdatePassword] = useState(initialIsUpdatePassword);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');

  // Password reset fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();

  // If user is already authenticated and not updating password, redirect to return URL or home
  useEffect(() => {
    if (user && !authLoading && !isUpdatePassword) {
      const returnUrl = (location.state as any)?.from || '/';
      navigate(returnUrl, { replace: true });
    }
  }, [user, authLoading, isUpdatePassword, navigate, location]);

  useEffect(() => {
    // Check if URL hash or search params contains recovery or signup tokens
    const hash = window.location.hash;
    const search = window.location.search;

    if (hash.includes('type=recovery') || search.includes('type=recovery')) {
      setIsUpdatePassword(true);
      setIsForgotPassword(false);
      setIsLogin(false);
      setMessage('Xác thực liên kết thành công! Vui lòng nhập mật khẩu mới cho tài khoản của bạn.');
    } else if (hash.includes('type=signup') || search.includes('type=signup')) {
      setMessage('Xác nhận email thành công! Tài khoản của bạn đã được kích hoạt. Vui lòng đăng nhập.');
      setIsLogin(true);
      setIsForgotPassword(false);
      setIsUpdatePassword(false);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsUpdatePassword(true);
        setIsForgotPassword(false);
        setIsLogin(false);
        setMessage('Xác thực tài khoản thành công! Vui lòng nhập mật khẩu mới bên dưới.');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Vui lòng nhập email của bạn.');
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const redirectUrl = `${window.location.origin}`;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      });
      if (error) throw error;
      setMessage('Đã gửi hướng dẫn đặt lại mật khẩu thành công! Vui lòng kiểm tra hòm thư email của bạn (bao gồm cả thư rác / Spam) và nhấp vào liên kết.');
    } catch (err: any) {
      setError(translateAuthError(err?.message));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('Mật khẩu xác nhận không trùng khớp. Vui lòng kiểm tra lại.');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      // Clean up URL hash
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname);
      }

      setMessage('Cập nhật mật khẩu mới thành công! Vui lòng sử dụng mật khẩu mới để đăng nhập.');
      setIsUpdatePassword(false);
      setIsLogin(true);
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      setError(translateAuthError(err?.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isLogin) {
        // Development fallback check
        if ((import.meta as any).env.VITE_SUPABASE_URL?.includes('placeholder') || !(import.meta as any).env.VITE_SUPABASE_URL) {
          setError('Hệ thống đang chạy chế độ không có kết nối cơ sở dữ liệu. Vui lòng kiểm tra biến môi trường.');
          supabase.auth.setSession({
            access_token: 'mock_token',
            refresh_token: 'mock_token',
          });
          return;
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;

        toast.success('Đăng nhập thành công!');
        const returnUrl = (location.state as any)?.from || '/';
        navigate(returnUrl, { replace: true });
      } else {
        const role = 'CTV';
        const redirectUrl = `${window.location.origin}`;
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              full_name: fullName.trim(),
              phone: phone.trim(),
              company_name: companyName.trim(),
              role: role
            }
          }
        });
        if (error) throw error;
        setMessage('Đăng ký tài khoản thành công! Một email xác nhận đã được gửi. Vui lòng mở hòm thư email (kiểm tra cả thư rác / Spam) và nhấp liên kết để kích hoạt tài khoản.');
      }
    } catch (err: any) {
      const errMsg = err?.message || (typeof err === 'string' ? err : '') || 'Có lỗi xảy ra, vui lòng thử lại.';
      setError(translateAuthError(errMsg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-8">
      <div className="max-w-5xl w-full bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side - Branding/Image */}
        <div className="md:w-5/12 bg-blue-700 text-white p-10 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full fill-current">
              <polygon points="0,100 100,0 100,100" />
            </svg>
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-12">
              <div className="bg-white p-2 rounded-lg">
                <Ticket className="w-6 h-6 text-blue-700" />
              </div>
              <span className="text-2xl font-bold tracking-tight">Tour CRM</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 leading-snug">
              Quản lý Tour &amp; Dịch vụ chuyên nghiệp
            </h1>
            <p className="text-blue-100 mb-8 text-sm leading-relaxed">
              Hệ thống CRM dành riêng cho công ty du lịch. Quản lý điều hành, quỹ chỗ, visa và khách hàng một cách liền mạch.
            </p>
          </div>

          <div className="relative z-10 text-sm text-blue-200 font-medium">
            &copy; 2026 Tour CRM. All rights reserved.
          </div>
        </div>

        {/* Right Side - Auth Form */}
        <div className="md:w-7/12 p-8 sm:p-12">
          <div className="max-w-md mx-auto">
            <div className="mb-4">
              <a
                href="/"
                className="inline-flex items-center text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors gap-1.5 hover:underline"
              >
                <span>← Quay lại xem Lịch khởi hành</span>
              </a>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {isUpdatePassword 
                ? 'Đặt lại mật khẩu mới'
                : isForgotPassword 
                  ? 'Khôi phục mật khẩu' 
                  : isLogin 
                    ? 'Đăng nhập hệ thống' 
                    : 'Đăng ký tài khoản CTV'}
            </h2>
            <p className="text-gray-500 text-sm mb-8">
              {isUpdatePassword
                ? 'Nhập mật khẩu mới của bạn bên dưới để hoàn tất đổi mật khẩu'
                : isForgotPassword 
                  ? 'Nhập email của bạn để nhận hướng dẫn đặt lại mật khẩu'
                  : isLogin 
                    ? 'Vui lòng điền thông tin đăng nhập để tiếp tục' 
                    : 'Điền thông tin bên dưới để đăng ký tài khoản Cộng tác viên (CTV)'}
            </p>

            {error && (
              <div className="mb-6 p-4 bg-rose-50 text-rose-700 text-xs sm:text-sm rounded-xl border border-rose-200 flex items-start gap-2.5 shadow-2xs font-medium">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">{error}</div>
              </div>
            )}
            
            {message && (
              <div className="mb-6 p-4 bg-emerald-50 text-emerald-800 text-xs sm:text-sm rounded-xl border border-emerald-200 flex items-start gap-2.5 shadow-2xs font-medium">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">{message}</div>
              </div>
            )}

            {/* Mode 1: Update Password Form */}
            {isUpdatePassword ? (
              <form onSubmit={handleUpdatePasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Mật khẩu mới</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 sm:text-sm font-medium"
                      placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Xác nhận mật khẩu mới</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 sm:text-sm font-medium"
                      placeholder="Nhập lại mật khẩu mới"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  {loading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsUpdatePassword(false);
                    setIsLogin(true);
                    setError(null);
                    setMessage(null);
                  }}
                  className="w-full text-xs font-semibold text-gray-600 hover:text-gray-900 pt-2 cursor-pointer"
                >
                  Quay lại trang Đăng nhập
                </button>
              </form>
            ) : isForgotPassword ? (
              /* Mode 2: Forgot Password Form */
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Email tài khoản</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      required
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 sm:text-sm font-medium"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  {loading ? 'Đang gửi...' : 'Gửi liên kết khôi phục'}
                </button>
                
                <button
                  type="button"
                  onClick={() => { setIsForgotPassword(false); setError(null); setMessage(null); }}
                  className="w-full text-xs font-semibold text-gray-600 hover:text-gray-900 pt-1 cursor-pointer"
                >
                  Quay lại Đăng nhập
                </button>
              </form>
            ) : (
              /* Mode 3: Standard Login / Register Form */
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Họ và tên *</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <User className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          required
                          className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 sm:text-sm font-medium"
                          placeholder="Nguyễn Văn A"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Số điện thoại *</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Phone className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="tel"
                          required
                          className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 sm:text-sm font-medium"
                          placeholder="0901234567"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Tên công ty <span className="text-gray-400 font-normal">(Tuỳ chọn)</span></label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Building2 className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 sm:text-sm font-medium"
                          placeholder="VD: Công ty Du lịch ABC"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Email *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      required
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 sm:text-sm font-medium"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Mật khẩu *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 sm:text-sm font-medium"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isLogin && (
                  <div className="flex items-center justify-end">
                    <button 
                      type="button"
                      onClick={(e) => { e.preventDefault(); setIsForgotPassword(true); setError(null); setMessage(null); }}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                    >
                      Quên mật khẩu?
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  {loading ? 'Đang xử lý...' : isLogin ? 'Đăng nhập' : 'Đăng ký tài khoản'}
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </button>
              </form>
            )}

            {!isUpdatePassword && (
              <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-center">
                <p className="text-sm text-gray-600 font-medium">
                  {isForgotPassword ? '' : isLogin ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}
                  {!isForgotPassword && (
                    <button
                      onClick={() => {
                        setIsLogin(!isLogin);
                        setError(null);
                        setMessage(null);
                      }}
                      className="ml-1 font-bold text-blue-600 hover:text-blue-700 focus:outline-none cursor-pointer"
                    >
                      {isLogin ? 'Đăng ký tài khoản CTV' : 'Đăng nhập ngay'}
                    </button>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
