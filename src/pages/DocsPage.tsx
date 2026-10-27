import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Compass, 
  ShoppingCart, 
  Sliders, 
  Calculator, 
  Globe, 
  Palmtree, 
  HelpCircle, 
  Search, 
  Share2, 
  Printer, 
  Edit3, 
  Trash2, 
  Plus, 
  ChevronRight, 
  ChevronDown, 
  BookOpen, 
  ThumbsUp, 
  ThumbsDown, 
  Check, 
  Copy, 
  ArrowLeft, 
  ArrowRight,
  Sparkles,
  Menu,
  X,
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { useCRM } from '@/context/CRMContext';
import { SystemDoc, DocCategory, DOC_CATEGORIES, DEFAULT_DOCS } from '@/data/defaultDocs';
import { docsService } from '@/services/docsService';
import { DocMarkdownRenderer } from '@/components/docs/DocMarkdownRenderer';
import { DocSearchModal } from '@/components/docs/DocSearchModal';
import { DocEditModal } from '@/components/docs/DocEditModal';
import { slugifyHeading } from '@/utils/docUtils';

const CATEGORY_ICONS: Record<string, any> = {
  overview: Compass,
  sale: ShoppingCart,
  operator: Sliders,
  accounting: Calculator,
  visa: Globe,
  hr: Palmtree,
  faq: HelpCircle,
};

export default function DocsPage() {
  const { currentRole } = useCRM();
  const { user } = useAuth();
  const isAdmin = currentRole === 'admin';

  const [searchParams, setSearchParams] = useSearchParams();
  const initialSlug = searchParams.get('slug') || 'intro';

  const [docs, setDocs] = useState<SystemDoc[]>(DEFAULT_DOCS);
  const [categories] = useState<DocCategory[]>(DOC_CATEGORIES);
  const [activeSlug, setActiveSlug] = useState<string>(initialSlug);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    overview: true,
    sale: true,
    operator: true,
    accounting: true,
    visa: true,
    hr: true,
    faq: true,
  });

  // Modals state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Partial<SystemDoc> | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<'yes' | 'no' | null>(null);

  // Active heading for TOC Scroll Spy
  const [activeHeadingId, setActiveHeadingId] = useState<string>('');
  const contentRef = useRef<HTMLDivElement>(null);

  // Load docs from service
  const loadDocs = async () => {
    try {
      const data = await docsService.getDocs();
      if (data && data.length > 0) {
        setDocs(data);
      }
    } catch {
      // Keep default docs
    }
  };

  useEffect(() => {
    loadDocs();
  }, []);

  // Sync URL slug
  useEffect(() => {
    const slugFromUrl = searchParams.get('slug');
    if (slugFromUrl && slugFromUrl !== activeSlug) {
      setActiveSlug(slugFromUrl);
    }
  }, [searchParams]);

  // Global shortcut Ctrl+K / Cmd+K for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter docs by role
  const roleFilteredDocs = useMemo(() => {
    if (selectedRoleFilter === 'all') return docs;
    return docs.filter(d => {
      if (!d.target_roles || d.target_roles.includes('all')) return true;
      return d.target_roles.includes(selectedRoleFilter);
    });
  }, [docs, selectedRoleFilter]);

  // Group docs by category
  const docsByCategory = useMemo(() => {
    const map: Record<string, SystemDoc[]> = {};
    categories.forEach(cat => {
      map[cat.id] = roleFilteredDocs
        .filter(d => d.category === cat.id)
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    });
    return map;
  }, [categories, roleFilteredDocs]);

  // Active doc
  const currentDoc = useMemo(() => {
    const found = docs.find(d => d.slug === activeSlug);
    return found || docs[0] || DEFAULT_DOCS[0];
  }, [docs, activeSlug]);

  // Select doc
  const handleSelectDoc = (slug: string) => {
    setActiveSlug(slug);
    setSearchParams({ slug });
    setIsMobileSidebarOpen(false);
    setFeedbackGiven(null);
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Toggle category collapse
  const toggleCategory = (catId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  // Extract headings (H2) for Table of Contents
  const tocHeadings = useMemo(() => {
    if (!currentDoc?.content) return [];
    const lines = currentDoc.content.split('\n');
    const headings: { id: string; text: string; level: number }[] = [];

    lines.forEach(line => {
      const matchH2 = line.match(/^##\s+(.+)$/);
      if (matchH2) {
        const rawText = matchH2[1].trim();
        const cleanText = rawText.replace(/^[0-9\.\s]+/, '').replace(/[*_~`]/g, '');
        const id = slugifyHeading(rawText);
        headings.push({ id, text: cleanText || rawText, level: 2 });
      }
    });

    return headings;
  }, [currentDoc]);

  // Scroll spy for TOC
  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveHeadingId(entry.target.id);
          }
        });
      },
      { 
        root: container,
        rootMargin: '-20px 0px -70% 0px' 
      }
    );

    const headingElements = container.querySelectorAll('h2[id]');
    headingElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [currentDoc]);

  // Smooth scroll to heading
  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element && contentRef.current) {
      const containerTop = contentRef.current.getBoundingClientRect().top;
      const elementTop = element.getBoundingClientRect().top;
      const offsetPosition = elementTop - containerTop + contentRef.current.scrollTop - 24;

      contentRef.current.scrollTo({
        top: Math.max(0, offsetPosition),
        behavior: 'smooth'
      });
      setActiveHeadingId(id);
    }
  };

  // Navigation Prev / Next
  const { prevDoc, nextDoc } = useMemo(() => {
    const allList = docs.slice().sort((a, b) => {
      if (a.category === b.category) {
        return (a.order_index ?? 0) - (b.order_index ?? 0);
      }
      const catOrderA = categories.findIndex(c => c.id === a.category);
      const catOrderB = categories.findIndex(c => c.id === b.category);
      return catOrderA - catOrderB;
    });

    const currentIndex = allList.findIndex(d => d.slug === currentDoc.slug);
    return {
      prevDoc: currentIndex > 0 ? allList[currentIndex - 1] : null,
      nextDoc: currentIndex < allList.length - 1 ? allList[currentIndex + 1] : null,
    };
  }, [docs, categories, currentDoc]);

  // Copy link
  const handleCopyLink = () => {
    const url = `${window.location.origin}/docs?slug=${currentDoc.slug}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success('Đã sao chép liên kết bài viết!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Print
  const handlePrint = () => {
    window.print();
  };

  // Save doc handler
  const handleSaveDoc = async (docData: Partial<SystemDoc> & { title: string; category: string; content: string }) => {
    const saved = await docsService.saveDoc(docData);
    toast.success('Đã lưu bài viết thành công!');
    await loadDocs();
    if (saved.slug) {
      handleSelectDoc(saved.slug);
    }
  };

  // Delete doc handler
  const handleDeleteDoc = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa bài viết hướng dẫn này không?')) {
      await docsService.deleteDoc(id);
      toast.success('Đã xóa bài viết!');
      await loadDocs();
      const remaining = docs.filter(d => d.id !== id);
      if (remaining.length > 0) {
        handleSelectDoc(remaining[0].slug);
      }
    }
  };

  const currentCategory = categories.find(c => c.id === currentDoc.category);

  return (
    <div className="h-screen bg-slate-50 flex flex-col w-full text-slate-800 antialiased overflow-hidden font-sans">
      {/* Top Banner / Full-width Header with Back to CRM */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 shrink-0 z-30 px-3 sm:px-6 lg:px-8 py-2.5 shadow-2xs print:hidden">
        <div className="w-full flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Left: Back to CRM + Mobile Toggle + Branding & Breadcrumb */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 shrink-0"
              aria-label="Toggle navigation"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Back to CRM button */}
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-bold text-xs transition-all border border-slate-200/90 shadow-2xs group shrink-0 active:scale-95"
              title="Quay lại giao diện phần mềm Tour CRM"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-600 group-hover:-translate-x-0.5 transition-transform" />
              <span className="hidden sm:inline">Quay lại Tour CRM</span>
              <span className="sm:hidden">CRM</span>
            </Link>

            <div className="h-5 w-px bg-slate-200 hidden sm:block shrink-0" />

            {/* Logo and Brand */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black text-slate-900 tracking-tight leading-none hidden xs:inline">Tour CRM</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200/80 uppercase">Docs</span>
              </div>
            </div>

            {/* Breadcrumb path */}
            <div className="hidden xl:flex items-center gap-2 text-xs text-slate-400 font-medium truncate pl-2 border-l border-slate-200 min-w-0">
              <span className="text-slate-600 truncate font-semibold">{currentCategory?.name || 'Tài liệu'}</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              <span className="text-blue-600 font-bold truncate max-w-[220px]">{currentDoc.title}</span>
            </div>
          </div>

          {/* Center: Search Trigger Bar (Ctrl + K) */}
          <div className="flex-1 max-w-xs sm:max-w-sm lg:max-w-md hidden md:block">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="w-full flex items-center justify-between gap-3 px-3.5 py-1.5 bg-slate-100/90 hover:bg-slate-200/80 border border-slate-200/90 rounded-xl text-xs text-slate-500 hover:text-slate-700 transition-all cursor-pointer group shadow-2xs"
            >
              <div className="flex items-center gap-2 truncate">
                <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" />
                <span className="truncate">Tìm kiếm quy trình, hướng dẫn, FAQ...</span>
              </div>
              <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold text-slate-400 bg-white border border-slate-200 rounded-md shadow-2xs shrink-0">
                Ctrl K
              </kbd>
            </button>
          </div>

          {/* Right: Search Mobile Button & Role Filter & Admin Add */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Search button for mobile */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200"
              title="Tìm kiếm tài liệu"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Role Filter Chips */}
            <div className="hidden lg:flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200 text-xs">
              {[
                { id: 'all', label: 'Tất cả vai trò' },
                { id: 'sale', label: 'Sale' },
                { id: 'operator', label: 'Điều hành' },
                { id: 'accounting', label: 'Kế toán' },
              ].map(rf => (
                <button
                  key={rf.id}
                  onClick={() => setSelectedRoleFilter(rf.id)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                    selectedRoleFilter === rf.id
                      ? 'bg-white text-blue-700 shadow-2xs border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {rf.label}
                </button>
              ))}
            </div>

            {/* Admin Add Doc Button */}
            {isAdmin && (
              <button
                onClick={() => {
                  setEditingDoc(null);
                  setIsEditModalOpen(true);
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Thêm bài mới</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 3-Column Full-Screen Layout Container */}
      <div className="w-full flex-1 flex overflow-hidden relative">
        
        {/* Mobile backdrop */}
        {isMobileSidebarOpen && (
          <div 
            onClick={() => setIsMobileSidebarOpen(false)} 
            className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden print:hidden" 
          />
        )}

        {/* =========================================================================
            COLUMN 1: Left Navigation Sidebar (Categories & Articles Tree)
           ========================================================================= */}
        <aside className={`
          fixed lg:static top-0 lg:top-auto bottom-0 z-50 lg:z-10
          w-72 sm:w-80 shrink-0
          bg-white
          border-r border-slate-200
          h-full overflow-y-auto
          p-4
          transition-transform duration-200 ease-in-out
          ${isMobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
          print:hidden
        `}>
          {/* Mobile close button */}
          <div className="flex lg:hidden items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Danh mục hướng dẫn</span>
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4 pr-1">
            {categories.map((cat) => {
              const catDocs = docsByCategory[cat.id] || [];
              const isExpanded = expandedCategories[cat.id] ?? true;
              const Icon = CATEGORY_ICONS[cat.id] || FileText;

              return (
                <div key={cat.id} className="space-y-1">
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(cat.id)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-black text-slate-800 uppercase tracking-wider rounded-lg hover:bg-slate-100/80 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="truncate">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                        {catDocs.length}
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 group-hover:text-slate-600" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 group-hover:text-slate-600" />
                      )}
                    </div>
                  </button>

                  {/* Articles list */}
                  {isExpanded && (
                    <div className="pl-3.5 ml-2 border-l border-slate-200 space-y-0.5">
                      {catDocs.length === 0 ? (
                        <div className="text-[11px] text-slate-400 py-1 pl-2 italic">
                          Chưa có bài viết
                        </div>
                      ) : (
                        catDocs.map((doc) => {
                          const isActive = doc.slug === currentDoc.slug;
                          return (
                            <button
                              key={doc.id}
                              onClick={() => handleSelectDoc(doc.slug)}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all flex items-center justify-between gap-1.5 group cursor-pointer ${
                                isActive
                                  ? 'bg-blue-50 text-blue-700 font-bold border-l-2 border-blue-600 shadow-2xs'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
                              }`}
                            >
                              <span className="truncate">{doc.title}</span>
                              {doc.badge && (
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 uppercase tracking-wider ${
                                  isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {doc.badge}
                                </span>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* =========================================================================
            COLUMN 2: Center Content Area (Article Viewer & Rich Markdown)
           ========================================================================= */}
        <div 
          ref={contentRef} 
          className="flex-1 min-w-0 h-full overflow-y-auto px-4 sm:px-8 lg:px-12 py-8 bg-slate-50/50 print:h-auto print:overflow-visible print:bg-white print:p-0"
        >
          <main className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-8 lg:p-10 print:border-none print:shadow-none print:p-0 print:max-w-none">
          
          {/* Article Header & Meta */}
          <div className="border-b border-slate-100 pb-6 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
                  {currentCategory?.name || 'Tài liệu'}
                </span>
                {currentDoc.badge && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200/80">
                    {currentDoc.badge}
                  </span>
                )}
                {currentDoc.target_roles && !currentDoc.target_roles.includes('all') && (
                  <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-xs font-bold border border-purple-100">
                    Dành cho: {currentDoc.target_roles.join(', ').toUpperCase()}
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleCopyLink}
                  title="Sao chép liên kết"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 text-xs flex items-center gap-1 transition-all"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{copiedLink ? 'Đã chép' : 'Sao chép link'}</span>
                </button>
                <button
                  onClick={handlePrint}
                  title="In tài liệu"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 text-xs flex items-center gap-1 transition-all"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">In</span>
                </button>

                {isAdmin && (
                  <>
                    <button
                      onClick={() => {
                        setEditingDoc(currentDoc);
                        setIsEditModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 border border-blue-200 text-xs flex items-center gap-1 font-bold transition-all ml-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Sửa bài</span>
                    </button>
                    <button
                      onClick={() => handleDeleteDoc(currentDoc.id)}
                      className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 border border-red-200 text-xs flex items-center gap-1 font-bold transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Main Title */}
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-snug">
              {currentDoc.title}
            </h1>

            {/* Summary Banner */}
            {currentDoc.summary && (
              <p className="mt-3 text-sm sm:text-base text-slate-600 font-medium leading-relaxed bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/70">
                {currentDoc.summary}
              </p>
            )}

            {/* Author / Date Info */}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-400">
              <span>Biên soạn: <strong className="text-slate-700 font-semibold">{currentDoc.author || 'Ban Quản Trị'}</strong></span>
              <span>•</span>
              <span>Cập nhật lúc: <strong className="text-slate-700 font-semibold">{currentDoc.updated_at ? new Date(currentDoc.updated_at).toLocaleDateString('vi-VN') : 'Mới nhất'}</strong></span>
            </div>
          </div>

          {/* Markdown Content Renderer */}
          <div className="py-2">
            <DocMarkdownRenderer content={currentDoc.content} />
          </div>

          {/* Feedback section */}
          <div className="mt-12 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/60 p-4 rounded-xl border border-slate-200/80 print:hidden">
            <div>
              <p className="text-xs font-bold text-slate-800">Tài liệu này có hữu ích với bạn không?</p>
              <p className="text-[11px] text-slate-500">Ý kiến của bạn giúp chúng tôi cải thiện quy trình vận hành</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setFeedbackGiven('yes');
                  toast.success('Cảm ơn phản hồi của bạn!');
                }}
                disabled={feedbackGiven !== null}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                  feedbackGiven === 'yes'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>Hữu ích</span>
              </button>
              <button
                onClick={() => {
                  setFeedbackGiven('no');
                  toast('Cảm ơn bạn! Ban Quản Trị sẽ bổ sung chi tiết hơn cho bài này.');
                }}
                disabled={feedbackGiven !== null}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                  feedbackGiven === 'no'
                    ? 'bg-rose-50 border-rose-300 text-rose-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <ThumbsDown className="w-3.5 h-3.5" />
                <span>Cần bổ sung</span>
              </button>
            </div>
          </div>

          {/* Prev / Next Pagination Cards */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 print:hidden">
            {prevDoc ? (
              <button
                type="button"
                onClick={() => handleSelectDoc(prevDoc.slug)}
                className="w-full min-w-0 p-4 rounded-xl border border-slate-200 hover:border-blue-300 bg-white hover:bg-blue-50/40 text-left transition-all group flex flex-col justify-between items-start cursor-pointer shadow-2xs"
              >
                <span className="text-[11px] font-bold text-slate-400 group-hover:text-blue-600 flex items-center gap-1 uppercase tracking-wider">
                  <ArrowLeft className="w-3 h-3 shrink-0" />
                  <span>Bài trước</span>
                </span>
                <span className="text-sm font-bold text-slate-800 group-hover:text-blue-700 mt-1.5 line-clamp-2 leading-snug w-full text-left">
                  {prevDoc.title}
                </span>
              </button>
            ) : <div className="hidden sm:block" />}

            {nextDoc && (
              <button
                type="button"
                onClick={() => handleSelectDoc(nextDoc.slug)}
                className="w-full min-w-0 p-4 rounded-xl border border-slate-200 hover:border-blue-300 bg-white hover:bg-blue-50/40 text-right transition-all group flex flex-col justify-between items-end cursor-pointer shadow-2xs"
              >
                <span className="text-[11px] font-bold text-slate-400 group-hover:text-blue-600 flex items-center gap-1 uppercase tracking-wider">
                  <span>Bài tiếp theo</span>
                  <ArrowRight className="w-3 h-3 shrink-0" />
                </span>
                <span className="text-sm font-bold text-slate-800 group-hover:text-blue-700 mt-1.5 line-clamp-2 leading-snug w-full text-right">
                  {nextDoc.title}
                </span>
              </button>
            )}
          </div>
        </main>
      </div>

      {/* =========================================================================
          COLUMN 3: Right Sidebar (Table of Contents / On this page)
         ========================================================================= */}
      <aside className="hidden xl:block w-64 xl:w-72 shrink-0 border-l border-slate-200/80 bg-white/70 h-full p-5 overflow-y-auto space-y-5 print:hidden">
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-1.5 h-3.5 bg-blue-600 rounded-full"></span>
              <span>Mục lục bài viết</span>
            </h4>

            {tocHeadings.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Không có đề mục phụ trong bài này</p>
            ) : (
              <nav className="space-y-1">
                {tocHeadings.map((heading) => {
                  const isActive = activeHeadingId === heading.id;
                  return (
                    <button
                      key={heading.id}
                      onClick={() => scrollToHeading(heading.id)}
                      className={`w-full text-left py-1 text-xs transition-all block truncate cursor-pointer ${
                        isActive
                          ? 'text-blue-600 font-bold border-l-2 border-blue-600 pl-2'
                          : 'text-slate-500 hover:text-slate-900 font-medium pl-2 hover:border-l-2 hover:border-slate-300'
                      }`}
                    >
                      {heading.text}
                    </button>
                  );
                })}
              </nav>
            )}
          </div>

          {/* Quick Help Card */}
          <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50/60 rounded-2xl border border-blue-100 shadow-2xs text-xs space-y-2">
            <div className="flex items-center gap-2 text-blue-700 font-bold">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Cần giải đáp trực tiếp?</span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              Nếu quy trình chưa rõ ràng hoặc gặp lỗi hệ thống, hãy liên hệ ngay với <strong>Ban Quản Trị</strong> hoặc bộ phận <strong>IT / Điều Hành</strong>.
            </p>
          </div>
        </aside>
      </div>

      {/* Quick Search Modal (Ctrl + K) */}
      <DocSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        docs={docs}
        categories={categories}
        onSelectDoc={handleSelectDoc}
      />

      {/* Admin Add/Edit Doc Modal */}
      {isAdmin && (
        <DocEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          doc={editingDoc}
          categories={categories}
          onSave={handleSaveDoc}
        />
      )}
    </div>
  );
}
