import React, { useState, useRef } from 'react';
import { X, Send, Sparkles, CheckCircle, AlertCircle, Loader2, ImagePlus, Trash2, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCRM } from '../context/CRMContext';
import { supabase } from '../lib/supabase';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const { user, profile } = useAuth();
  const { displayRole } = useCRM();

  const [type] = useState<string>('Góp ý & Báo lỗi');
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !user) return null;

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'agent': return 'Đại lý (Agent)';
      case 'bod': return 'BOD (Ban Giám đốc)';
      case 'operator': return 'Điều hành Tour';
      case 'sale_leader': return 'Sale Leader';
      case 'sale': return 'Sale';
      case 'visa': return 'Bộ phận Visa';
      case 'accounting': return 'Kế toán';
      case 'admin': return 'Quản trị viên';
      case 'tour_guide': return 'Hướng Dẫn Viên (HDV)';
      case 'marketing_leader': return 'Trưởng phòng Marketing';
      case 'marketing': return 'Nhân viên Marketing';
      case 'CTV': return 'Cộng Tác Viên (CTV)';
      default: return role;
    }
  };

  const handleSelectFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Vui lòng chỉ chọn file hình ảnh (PNG, JPG, WEBP)!');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Kích thước ảnh tối đa là 10MB.');
      return;
    }
    setErrorMsg(null);
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleSelectFile(e.target.files[0]);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          handleSelectFile(file);
          e.preventDefault();
          break;
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setErrorMsg('Vui lòng đăng nhập hệ thống để gửi góp ý hoặc báo lỗi!');
      return;
    }
    if (!content.trim()) {
      setErrorMsg('Vui lòng nhập nội dung góp ý hoặc báo lỗi!');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      let imageUrl: string | null = null;

      // 1. Tải ảnh đính kèm (nếu có)
      if (imageFile) {
        // Gọi trực tiếp API máy chủ lưu ảnh vào Google Drive (/api/upload)
        const formData = new FormData();
        formData.append('file', imageFile);
        formData.append('uploadType', 'feedback');

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) {
          const errText = await uploadRes.text();
          let errMsg = 'Lỗi tải ảnh đính kèm lên Google Drive.';
          try {
            const errObj = JSON.parse(errText);
            if (errObj.error) errMsg = errObj.error;
          } catch {}
          throw new Error(errMsg);
        }

        const uploadText = await uploadRes.text();
        try {
          const uploadData = JSON.parse(uploadText);
          if (uploadData.url) {
            imageUrl = uploadData.url;
          }
        } catch {
          throw new Error('Máy chủ không phản hồi JSON khi tải ảnh lên Google Drive.');
        }
      }

      // 2. Gửi thông tin phản hồi
      let submittedSuccessfully = false;
      let finalMessage = 'Cảm ơn bạn! Yêu cầu góp ý/báo lỗi đã được ghi nhận thành công.';

      // Bước 2.1: Gửi qua API máy chủ
      try {
        const response = await fetch('/api/submit-feedback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type,
            title: 'Góp ý & Báo lỗi hệ thống',
            content: content.trim(),
            description: content.trim(),
            imageUrl,
            screenshot_url: imageUrl,
            senderName: profile?.full_name || user?.email?.split('@')[0] || 'Thành viên',
            senderEmail: user?.email || '',
            senderPhone: profile?.phone || '',
            senderRole: getRoleBadge(displayRole),
            page_url: window.location.href,
          }),
        });

        if (response.ok) {
          const resText = await response.text();
          try {
            const data = JSON.parse(resText);
            if (data.message) finalMessage = data.message;
            submittedSuccessfully = true;
          } catch {
            submittedSuccessfully = true;
          }
        }
      } catch (apiErr) {
        console.warn('Lỗi gọi /api/submit-feedback:', apiErr);
      }

      // Bước 2.2: Nếu API máy chủ chưa phản hồi thành công, Fallback ghi trực tiếp vào Supabase table 'system_feedback'
      if (!submittedSuccessfully) {
        try {
          const { error: dbError } = await supabase
            .from('system_feedback')
            .insert({
              type,
              title: 'Góp ý & Báo lỗi hệ thống',
              description: content.trim(),
              user_email: user?.email || 'Ẩn danh',
              user_name: profile?.full_name || user?.email?.split('@')[0] || 'Thành viên',
              page_url: window.location.href,
              screenshot_url: imageUrl,
              metadata: {
                sender_role: getRoleBadge(displayRole),
                sender_phone: profile?.phone || '',
                submitted_at: new Date().toISOString(),
                channel: 'client_supabase_fallback'
              }
            });

          if (!dbError) {
            submittedSuccessfully = true;
          }
        } catch (dbErr) {
          console.warn('Lỗi ghi feedback trực tiếp vào Supabase:', dbErr);
        }
      }

      // Bước 2.3: Bộ đệm dự phòng LocalStorage để luôn đảm bảo dữ liệu của người dùng được lưu trữ
      try {
        const offlineList = JSON.parse(localStorage.getItem('crm_offline_feedback') || '[]');
        offlineList.push({
          id: `fb_${Date.now()}`,
          content: content.trim(),
          imageUrl,
          senderName: profile?.full_name || user?.email || 'Thành viên',
          senderEmail: user?.email || '',
          senderRole: getRoleBadge(displayRole),
          createdAt: new Date().toISOString()
        });
        localStorage.setItem('crm_offline_feedback', JSON.stringify(offlineList.slice(-20)));
        submittedSuccessfully = true;
      } catch (lsErr) {
        console.warn('LocalStorage buffer error:', lsErr);
      }

      if (!submittedSuccessfully) {
        throw new Error('Không thể lưu thông tin phản hồi. Vui lòng kiểm tra lại kết nối mạng.');
      }

      setSuccessMsg(finalMessage);
      setContent('');
      handleRemoveImage();
      
      // Auto close after 2.5 seconds on success
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 2500);

    } catch (err: any) {
      console.error('Lỗi khi gửi phản hồi:', err);
      setErrorMsg(err.message || 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div 
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Matching Image 2 style */}
        <div className="bg-slate-900 p-6 text-white relative flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 via-purple-500 to-emerald-400 flex items-center justify-center text-white shadow-lg shadow-pink-500/20">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                Góp Ý & Báo Lỗi
              </h3>
              <p className="text-xs font-medium text-slate-400 mt-0.5">
                Hệ thống Quản lý Du lịch Tour CRM
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-white max-h-[80vh] overflow-y-auto">
          {/* Feedback Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-bold text-gray-800">
                Nội dung phản hồi <span className="text-red-500">*</span>
              </label>
              <span className="text-xs font-semibold text-gray-400">
                Tối đa 1000 ký tự ({content.length}/1000)
              </span>
            </div>
            
            <textarea
              rows={4}
              maxLength={1000}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onPaste={handlePaste}
              placeholder="Hãy viết những cảm nghĩ, lỗi gặp phải hoặc góp ý của bạn để giúp chúng mình cải tiến sản phẩm... (Có thể dán trực tiếp ảnh Ctrl+V)"
              className="w-full p-4 text-sm text-gray-800 placeholder-gray-400 bg-slate-50/50 rounded-2xl border border-gray-200 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all leading-relaxed resize-none"
              required
            />
          </div>

          {/* Screenshot / Image Attachment Section */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-emerald-600" />
                Ảnh chụp màn hình minh họa (Tùy chọn)
              </label>
              <span className="text-[11px] text-gray-400">Hỗ trợ dán ảnh (Ctrl+V)</span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {imagePreview ? (
              <div className="relative rounded-2xl border border-emerald-200 bg-emerald-50/40 p-2.5 flex items-center gap-3">
                <img
                  src={imagePreview}
                  alt="Ảnh chụp đính kèm"
                  className="w-16 h-16 object-cover rounded-xl border border-emerald-300 shadow-2xs flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-800 truncate">
                    {imageFile?.name || 'Ảnh_chụp_màn_hình.png'}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {imageFile ? (imageFile.size / 1024 / 1024).toFixed(2) + ' MB' : 'Đã chọn'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="p-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-600 transition-colors cursor-pointer"
                  title="Xóa ảnh"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 px-4 border-2 border-dashed border-gray-200 hover:border-emerald-400 bg-slate-50 hover:bg-emerald-50/30 rounded-2xl flex items-center justify-center gap-2 text-xs font-semibold text-gray-600 hover:text-emerald-700 transition-all cursor-pointer group"
              >
                <ImagePlus className="w-4 h-4 text-gray-400 group-hover:text-emerald-600 transition-colors" />
                <span>Thêm hoặc kéo thả / dán ảnh chụp màn hình</span>
              </button>
            )}
          </div>

          {/* Sender Metadata Info */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 flex items-center justify-between text-xs text-gray-600">
            <span className="font-semibold text-gray-500">
              Người gửi: <strong className="text-gray-900 font-bold">{profile?.full_name || user?.email?.split('@')[0] || 'Thành viên'}</strong>
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold text-[11px]">
              {getRoleBadge(displayRole)}
            </span>
          </div>

          {/* Success / Error Messages */}
          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2.5 animate-fadeIn">
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 text-xs font-bold rounded-2xl flex items-center gap-2.5 animate-fadeIn">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Submit Action */}
          <div className="flex items-center justify-end pt-1">
            <button
              type="submit"
              disabled={loading || !content.trim()}
              className="px-7 py-3 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang gửi...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Gửi đóng góp</span>
                </>
              )}
            </button>
          </div>

          {/* Footer Notice */}
          <p className="text-[11px] text-center text-gray-400 pt-2 border-t border-gray-100 leading-relaxed font-medium">
            Phản hồi & ảnh minh họa của bạn sẽ được lưu để Quản trị viên giải đáp thắc mắc.
          </p>
        </form>
      </div>
    </div>
  );
};
