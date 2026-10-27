import React, { useState, useEffect, useRef } from 'react';
import { Search, X, BookOpen, ArrowRight, CornerDownLeft } from 'lucide-react';
import { SystemDoc, DocCategory } from '@/data/defaultDocs';

interface DocSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  docs: SystemDoc[];
  categories: DocCategory[];
  onSelectDoc: (slug: string) => void;
}

export const DocSearchModal: React.FC<DocSearchModalProps> = ({
  isOpen,
  onClose,
  docs,
  categories,
  onSelectDoc,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSearchTerm('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const filteredDocs = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return docs.slice(0, 8); // show popular or first 8
    }

    return docs.filter(d => {
      const matchTitle = d.title.toLowerCase().includes(term);
      const matchSummary = d.summary.toLowerCase().includes(term);
      const matchContent = d.content.toLowerCase().includes(term);
      const categoryName = categories.find(c => c.id === d.category)?.name.toLowerCase() || '';
      const matchCategory = categoryName.includes(term);
      return matchTitle || matchSummary || matchContent || matchCategory;
    }).slice(0, 10);
  }, [searchTerm, docs, categories]);

  // Handle keyboard arrow navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < filteredDocs.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredDocs.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredDocs[selectedIndex]) {
        onSelectDoc(filteredDocs[selectedIndex].slug);
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
          <Search className="w-5 h-5 text-blue-600 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Tìm kiếm tài liệu, quy trình, từ khóa (VD: giữ chỗ, ctv, phép năm, hoa hồng)..."
            className="w-full bg-transparent text-sm sm:text-base font-medium text-slate-800 focus:outline-hidden placeholder:text-slate-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-1 text-[10px] font-bold text-slate-500 bg-slate-200/80 rounded-md border border-slate-300/60">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-2 divide-y divide-slate-100">
          {filteredDocs.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <BookOpen className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">Không tìm thấy bài viết phù hợp</p>
              <p className="text-xs text-slate-400 mt-1">Hãy thử tìm với các từ khóa phổ biến: <span className="text-blue-600 font-medium">giữ chỗ, hoa hồng, điều hành, phép năm</span></p>
            </div>
          ) : (
            filteredDocs.map((doc, idx) => {
              const isSelected = idx === selectedIndex;
              const catName = categories.find(c => c.id === doc.category)?.name || doc.category;
              return (
                <div
                  key={doc.id}
                  onClick={() => {
                    onSelectDoc(doc.slug);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-3 rounded-xl cursor-pointer transition-all flex items-start justify-between gap-3 ${
                    isSelected ? 'bg-blue-50/90 text-blue-950 border border-blue-100 shadow-2xs' : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                        {catName}
                      </span>
                      {doc.badge && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                          {doc.badge}
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 truncate">
                      {doc.title}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1 leading-relaxed">
                      {doc.summary}
                    </p>
                  </div>
                  <div className="flex items-center self-center shrink-0">
                    {isSelected ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-blue-600">
                        <span>Xem</span>
                        <CornerDownLeft className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <ArrowRight className="w-4 h-4 text-slate-300" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <div className="flex items-center gap-3">
            <span>Dùng <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-bold">↑</kbd> <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-bold">↓</kbd> để di chuyển</span>
            <span><kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-bold">Enter</kbd> để mở bài</span>
          </div>
          <span className="text-blue-600 font-bold">Tour CRM Docs</span>
        </div>
      </div>
    </div>
  );
};
