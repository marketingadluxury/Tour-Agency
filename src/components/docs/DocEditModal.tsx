import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Eye, Edit3 } from 'lucide-react';
import { SystemDoc, DocCategory } from '@/data/defaultDocs';
import { DocMarkdownRenderer } from './DocMarkdownRenderer';

interface DocEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  doc: Partial<SystemDoc> | null;
  categories: DocCategory[];
  onSave: (docData: Partial<SystemDoc> & { title: string; category: string; content: string }) => Promise<void>;
}

export const DocEditModal: React.FC<DocEditModalProps> = ({
  isOpen,
  onClose,
  doc,
  categories,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('overview');
  const [summary, setSummary] = useState('');
  const [badge, setBadge] = useState('');
  const [content, setContent] = useState('');
  const [orderIndex, setOrderIndex] = useState(1);
  const [author, setAuthor] = useState('Ban Quản Trị');
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const insertSnippet = (snippet: string) => {
    setContent(prev => (prev ? `${prev}\n\n${snippet}` : snippet));
  };

  useEffect(() => {
    if (isOpen) {
      if (doc) {
        setTitle(doc.title || '');
        setCategory(doc.category || 'overview');
        setSummary(doc.summary || '');
        setBadge(doc.badge || '');
        setContent(doc.content || '');
        setOrderIndex(doc.order_index ?? 1);
        setAuthor(doc.author || 'Ban Quản Trị');
      } else {
        setTitle('');
        setCategory('overview');
        setSummary('');
        setBadge('Mới');
        setContent('## 1. Tiêu đề mục\n\nNội dung hướng dẫn chi tiết...\n\n> 💡 **Mẹo:** Bạn có thể dùng định dạng Markdown để viết bài.');
        setOrderIndex(10);
        setAuthor('Ban Quản Trị');
      }
      setActiveTab('edit');
      setError(null);
    }
  }, [isOpen, doc]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Vui lòng nhập tiêu đề bài viết');
      return;
    }
    if (!content.trim()) {
      setError('Vui lòng nhập nội dung bài viết');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await onSave({
        id: doc?.id,
        title: title.trim(),
        category,
        summary: summary.trim(),
        badge: badge.trim() || undefined,
        content: content.trim(),
        order_index: Number(orderIndex) || 1,
        author: author.trim() || 'Ban Quản Trị',
        target_roles: doc?.target_roles || ['all'],
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Có lỗi xảy ra khi lưu bài viết');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              {doc?.id ? 'Chỉnh sửa bài viết hướng dẫn' : 'Thêm bài viết hướng dẫn mới'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Hỗ trợ định dạng Markdown, hộp ghi chú Callout (Tip, Warning, Rule) và bảng dữ liệu
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Tiêu đề bài viết <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Hướng dẫn giữ chỗ và chốt tour"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Chuyên mục <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-hidden"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Huy hiệu (Badge)
              </label>
              <input
                type="text"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                placeholder="VD: Quan trọng, Mới, Quy trình"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Thứ tự hiển thị
              </label>
              <input
                type="number"
                value={orderIndex}
                onChange={(e) => setOrderIndex(Number(e.target.value))}
                min={1}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Tác giả biên soạn
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="VD: Phòng Điều Hành"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Tóm tắt ngắn gọn
            </label>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="VD: Quy trình 3 bước giữ chỗ an toàn và gia hạn thời gian..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Content Editor / Preview Switch */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Nội dung bài viết (Markdown) <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('edit')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                    activeTab === 'edit'
                      ? 'bg-white text-blue-600 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Soạn thảo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                    activeTab === 'preview'
                      ? 'bg-white text-blue-600 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Xem trước (Preview)</span>
                </button>
              </div>
            </div>

            {activeTab === 'edit' ? (
              <div className="space-y-2">
                {/* Quick Markdown Toolbar */}
                <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100/80 border border-slate-200/80 rounded-xl text-xs">
                  <span className="text-[11px] font-bold text-slate-500 px-1.5 hidden sm:inline">Chèn nhanh:</span>
                  <button
                    type="button"
                    onClick={() => insertSnippet('## Tiêu đề mục chính')}
                    className="px-2 py-1 bg-white hover:bg-slate-200/60 rounded-md border border-slate-200 text-slate-700 font-bold text-[11px] shadow-2xs cursor-pointer"
                  >
                    H2 Mục
                  </button>
                  <button
                    type="button"
                    onClick={() => insertSnippet('### Tiêu đề mục con')}
                    className="px-2 py-1 bg-white hover:bg-slate-200/60 rounded-md border border-slate-200 text-slate-700 font-bold text-[11px] shadow-2xs cursor-pointer"
                  >
                    H3 Con
                  </button>
                  <button
                    type="button"
                    onClick={() => insertSnippet('**Văn bản in đậm**')}
                    className="px-2 py-1 bg-white hover:bg-slate-200/60 rounded-md border border-slate-200 text-slate-700 font-bold text-[11px] shadow-2xs cursor-pointer"
                  >
                    Bôi đậm
                  </button>
                  <button
                    type="button"
                    onClick={() => insertSnippet('> 💡 **Mẹo:** Ghi chú kinh nghiệm hoặc mẹo thao tác hữu ích.')}
                    className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-md border border-blue-200 text-[11px] shadow-2xs cursor-pointer"
                  >
                    💡 Mẹo
                  </button>
                  <button
                    type="button"
                    onClick={() => insertSnippet('> ⚠️ **Lưu ý:** Cảnh báo quan trọng cần chú ý thực hiện đúng quy trình.')}
                    className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded-md border border-amber-200 text-[11px] shadow-2xs cursor-pointer"
                  >
                    ⚠️ Lưu ý
                  </button>
                  <button
                    type="button"
                    onClick={() => insertSnippet('> 🔒 **Bảo mật & Phân quyền:** Chỉ tài khoản có quyền Quản trị hoặc Điều hành mới được thao tác.')}
                    className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-md border border-rose-200 text-[11px] shadow-2xs cursor-pointer"
                  >
                    🔒 Phân quyền
                  </button>
                  <button
                    type="button"
                    onClick={() => insertSnippet('| Cột 1 | Cột 2 | Ghi chú |\n|---|---|---|\n| Dữ liệu A | 100.000 | Chuẩn |\n| Dữ liệu B | 200.000 | Tùy chọn |')}
                    className="px-2 py-1 bg-white hover:bg-slate-200/60 rounded-md border border-slate-200 text-slate-700 font-bold text-[11px] shadow-2xs cursor-pointer"
                  >
                    📊 Bảng mẫu
                  </button>
                </div>

                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={13}
                  placeholder="Nhập nội dung theo chuẩn Markdown...&#10;&#10;## 1. Tiêu đề mục chính&#10;Nội dung văn bản...&#10;&#10;> 💡 **Mẹo:** Khối thông báo mẹo hay&#10;> ⚠️ **Lưu ý:** Khối cảnh báo quan trọng"
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-hidden leading-relaxed"
                />
              </div>
            ) : (
              <div className="p-5 bg-white border border-slate-200 rounded-xl min-h-[300px] max-h-[450px] overflow-y-auto">
                <DocMarkdownRenderer content={content} />
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Mẹo: Sử dụng <code>## Tiêu đề</code> để hệ thống tự tạo mục lục bài viết
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-all"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Đang lưu...' : 'Lưu bài viết'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
