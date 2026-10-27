import React, { useState, useRef, useEffect } from 'react';
import { Bot, Sparkles, X, Send, RefreshCw, User, HelpCircle, Edit3, CheckCircle2, AlertCircle } from 'lucide-react';
import { useCRM } from '../../context/CRMContext';

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

const SUGGESTED_QUESTIONS = [
  '💡 Cơ chế tính hoa hồng CTV bán chênh giá?',
  '📄 Cách nộp file Visa cho hành khách?',
  '🔐 Phân biệt quyền Operator và Sale Leader?',
  '📁 Quy định lưu file Google Drive & Supabase?',
  '💰 Cách lập Đề nghị thanh toán (DNTT)?'
];

export const ERPCopilotModal: React.FC = () => {
  const { displayRole } = useCRM();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Feedback state for Admin
  const [feedbackModalMsg, setFeedbackModalMsg] = useState<Message | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSuccessMessage, setFeedbackSuccessMessage] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      content: `Xin chào! Tôi là **Trợ lý hướng dẫn** 🤖 - Trợ lý AI thông minh chuyên hỗ trợ vận hành hệ thống Tour CRM.\n\nBạn có thể hỏi tôi về các quy trình nghiệp vụ, phân quyền vai trò (**${displayRole?.toUpperCase() || 'HỆ THỐNG'}**), cơ chế tính hoa hồng, nộp file Visa hoặc cách khởi tạo tour!`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, loading]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const historyPayload = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historyPayload,
          currentRole: displayRole
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra khi kết nối với Trợ lý hướng dẫn');
      }

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: data.reply || 'Rất tiếc, AI chưa đưa ra được phản hồi.',
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      console.error('Error calling Trợ lý hướng dẫn:', err);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: `⚠️ **Lỗi:** ${err.message || 'Không thể kết nối tới máy chủ Trợ lý hướng dẫn.'}`,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim() || !feedbackModalMsg) return;
    setFeedbackSubmitting(true);
    setFeedbackSuccessMessage(null);

    try {
      // Find the question that produced this bot response if possible
      const msgIndex = messages.findIndex(m => m.id === feedbackModalMsg.id);
      const prevQuestion = msgIndex > 0 ? messages[msgIndex - 1]?.content : 'N/A';

      const res = await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalQuestion: prevQuestion,
          botResponse: feedbackModalMsg.content,
          feedbackContent: feedbackText.trim(),
          userRole: displayRole
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Lỗi khi gửi góp ý');
      }

      setFeedbackSuccessMessage(data.message || 'Cảm ơn Admin đã gửi góp ý thành công!');
      setTimeout(() => {
        setFeedbackModalMsg(null);
        setFeedbackText('');
        setFeedbackSuccessMessage(null);
      }, 1800);
    } catch (err: any) {
      console.error('Error submitting feedback:', err);
      alert(err.message || 'Không thể gửi phản hồi lúc này');
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  // Helper to parse inline styles (bold **text**, inline `code`)
  const parseInlineElements = (textStr: string) => {
    // First split by bold **text**
    const parts = textStr.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, pIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={pIdx} className="font-semibold text-slate-900 dark:text-slate-100">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={pIdx} className="px-1.5 py-0.5 bg-blue-50 dark:bg-slate-700 text-blue-700 dark:text-blue-300 rounded font-mono text-[11px] border border-blue-100 dark:border-slate-600 mx-0.5">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  // Enhanced Markdown Parser for responses
  const renderMarkdown = (text: string, isUserMessage: boolean) => {
    if (isUserMessage) {
      return <p className="leading-relaxed whitespace-pre-wrap">{text}</p>;
    }

    const lines = text.split('\n');
    return (
      <div className="space-y-1 text-slate-800 dark:text-slate-200">
        {lines.map((line, idx) => {
          const trimmed = line.trim();

          if (!trimmed) {
            return <div key={idx} className="h-1.5" />;
          }

          // Headers (#, ##, ###)
          if (trimmed.startsWith('#')) {
            const headerText = trimmed.replace(/^#+\s*/, '');
            return (
              <h4 key={idx} className="font-bold text-slate-900 dark:text-white text-[13px] pt-1 pb-0.5 border-b border-slate-100 dark:border-slate-700/60">
                {parseInlineElements(headerText)}
              </h4>
            );
          }

          // Multi-level Bullet List Item & Indentation Parser
          const leadingSpaces = line.match(/^(\s*)/)?.[1].length || 0;
          const indentLevel = Math.min(Math.floor(leadingSpaces / 2), 3);

          const bulletMatch = line.match(/^(\s*)([-*+])\s+(.*)$/);
          if (bulletMatch) {
            const content = bulletMatch[3];
            let indentClass = 'pl-0.5';
            let bulletSymbol = '•';
            let bulletColor = 'text-blue-600 dark:text-blue-400 font-bold';

            if (indentLevel === 1) {
              indentClass = 'pl-4';
              bulletSymbol = '◦';
              bulletColor = 'text-indigo-600 dark:text-indigo-400 font-bold';
            } else if (indentLevel >= 2) {
              indentClass = 'pl-7';
              bulletSymbol = '▪';
              bulletColor = 'text-slate-500 dark:text-slate-400 font-semibold text-[10px]';
            }

            return (
              <div key={idx} className={`flex items-start gap-2 my-0.5 ${indentClass} text-xs leading-relaxed`}>
                <span className={`${bulletColor} shrink-0 mt-0.5`}>{bulletSymbol}</span>
                <div className="flex-1">{parseInlineElements(content)}</div>
              </div>
            );
          }

          // Numbered / Lettered List Item (e.g., 1. , 2. , a) , b. )
          const numMatch = line.match(/^(\s*)(\d+|[a-z])[\.\)]\s+(.*)$/i);
          if (numMatch) {
            const num = numMatch[2];
            const content = numMatch[3];
            let indentClass = 'pl-0.5';
            if (indentLevel === 1) indentClass = 'pl-4';
            if (indentLevel >= 2) indentClass = 'pl-7';

            return (
              <div key={idx} className={`flex items-start gap-2 my-0.5 ${indentClass} text-xs leading-relaxed`}>
                <span className="inline-flex items-center justify-center min-w-4 px-1 h-4 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold text-[10px] shrink-0 mt-0.5">
                  {num}
                </span>
                <div className="flex-1">{parseInlineElements(content)}</div>
              </div>
            );
          }

          // Paragraph
          return (
            <p key={idx} className="my-0.5 leading-relaxed text-xs">
              {parseInlineElements(line)}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          id="btn-open-erp-copilot"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-full shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 hover:scale-105 active:scale-95 transition-all duration-300 group border border-blue-500/50"
          title="Mở Trợ lý hướng dẫn Tour CRM"
        >
          <div className="relative">
            <div className="p-1 bg-white/20 rounded-full text-white">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-80"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400"></span>
            </span>
          </div>
          <span className="hidden sm:inline font-semibold tracking-wide text-white">Trợ lý hướng dẫn</span>
          <Sparkles className="w-4 h-4 text-amber-300 opacity-90 group-hover:rotate-12 transition-transform" />
        </button>
      )}

      {/* Chat Window Popup */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[430px] h-[600px] max-h-[85vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
          {/* Header - Aligned with system header style (Slate 900) */}
          <div className="px-4 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0 shadow-md border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30 flex items-center justify-center">
                <Bot className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-bold text-sm flex items-center gap-1.5 leading-tight tracking-wide text-white">
                  Trợ lý hướng dẫn
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                </h3>
                <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                  Hỗ trợ nghiệp vụ & vận hành hệ thống Tour CRM
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setMessages([{
                  id: 'welcome',
                  role: 'model',
                  content: `Xin chào! Tôi là **Trợ lý hướng dẫn** 🤖 - Trợ lý AI thông minh chuyên hỗ trợ vận hành hệ thống Tour CRM.\n\nBạn có thể hỏi tôi về các quy trình nghiệp vụ, phân quyền vai trò (**${displayRole?.toUpperCase() || 'HỆ THỐNG'}**), cơ chế tính hoa hồng, nộp file Visa hoặc cách khởi tạo tour!`,
                  timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                }])}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title="Tạo hội thoại mới"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title="Thu nhỏ"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Role Status Banner */}
          <div className="bg-slate-50 dark:bg-slate-800/80 px-4 py-2 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 shrink-0">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Vai trò: <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold uppercase text-[10px] tracking-wider border border-blue-200 dark:border-blue-800">{displayRole || 'Khách'}</span>
            </span>
            <span className="text-slate-400 text-[10px] flex items-center gap-1 font-medium">
              <HelpCircle className="w-3.5 h-3.5 text-blue-500" /> AI Trợ Lý 24/7
            </span>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-900/50 text-xs custom-scrollbar">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 shadow-2xs ${
                      isUser
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-900 text-blue-400 border border-slate-700'
                    }`}
                  >
                    {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  <div className={`max-w-[85%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`p-3.5 rounded-2xl shadow-2xs text-xs transition-all ${
                        isUser
                          ? 'bg-blue-600 text-white rounded-tr-none font-medium'
                          : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/90 dark:border-slate-700/80 rounded-tl-none leading-relaxed'
                      }`}
                    >
                      {renderMarkdown(msg.content, isUser)}
                    </div>
                    <div className="flex items-center gap-2 mt-1 px-1">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                        {msg.timestamp}
                      </span>
                      {!isUser && displayRole === 'admin' && (
                        <button
                          onClick={() => {
                            setFeedbackModalMsg(msg);
                            setFeedbackText('');
                            setFeedbackSuccessMessage(null);
                          }}
                          className="text-[10px] text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/80 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/80 transition-colors cursor-pointer"
                          title="Góp ý / Sửa lại thông tin này (Dành cho Quản trị viên)"
                        >
                          <Edit3 className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                          Góp ý / Sửa thông tin
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing Indicator */}
            {loading && (
              <div className="flex gap-2.5 items-center">
                <div className="w-7 h-7 rounded-lg bg-slate-900 text-blue-400 border border-slate-700 flex items-center justify-center shrink-0 shadow-2xs">
                  <Bot className="w-4 h-4 animate-pulse" />
                </div>
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 p-3.5 rounded-2xl rounded-tl-none shadow-2xs flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs">
                  <span className="font-medium text-slate-600 dark:text-slate-300">Trợ lý đang suy nghĩ</span>
                  <span className="flex gap-1 items-center ml-1">
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Questions (scrollbar-none to hide horizontal scrollbar) */}
          {messages.length <= 2 && !loading && (
            <div className="px-3.5 py-2.5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 overflow-x-auto scrollbar-none shrink-0 flex gap-2">
              {SUGGESTED_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(q)}
                  className="px-3 py-1.5 text-[11px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/40 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-300 rounded-xl border border-slate-200 dark:border-slate-700 whitespace-nowrap transition-all shrink-0 cursor-pointer hover:border-blue-300 dark:hover:border-blue-500"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input Controls */}
          <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/90 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:bg-white transition-all">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Hỏi Trợ lý hướng dẫn về quy trình ERP, hoa hồng, booking, visa..."
                className="w-full bg-transparent text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none py-0.5"
                disabled={loading}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                className="p-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:text-slate-400 text-white rounded-lg transition-colors shrink-0 shadow-2xs cursor-pointer"
                title="Gửi câu hỏi"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Admin Feedback Dialog Overlay */}
          {feedbackModalMsg && (
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
                <div className="bg-amber-500/10 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
                    <Edit3 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>Góp ý & Sửa thông tin Trợ lý AI</span>
                  </div>
                  <button
                    onClick={() => {
                      setFeedbackModalMsg(null);
                      setFeedbackText('');
                      setFeedbackSuccessMessage(null);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-4 space-y-3 text-xs">
                  {feedbackSuccessMessage ? (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="font-medium text-[11px]">{feedbackSuccessMessage}</span>
                    </div>
                  ) : (
                    <>
                      <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] line-clamp-3">
                        <strong className="text-slate-800 dark:text-slate-200">Câu trả lời cần góp ý:</strong>
                        <p className="mt-0.5 italic">{feedbackModalMsg.content.slice(0, 120)}...</p>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-200 mb-1">
                          Nội dung Admin muốn hiệu chỉnh/sửa lại:
                        </label>
                        <textarea
                          rows={3}
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          placeholder="Ví dụ: Phí công ty thu CTV bán chênh từ tháng này điều chỉnh thành 25%, nhờ AI cập nhật lại..."
                          className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setFeedbackModalMsg(null);
                            setFeedbackText('');
                            setFeedbackSuccessMessage(null);
                          }}
                          className="px-3 py-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                        >
                          Hủy bỏ
                        </button>
                        <button
                          type="button"
                          onClick={handleSubmitFeedback}
                          disabled={!feedbackText.trim() || feedbackSubmitting}
                          className="px-3.5 py-1.5 text-[11px] font-semibold bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                        >
                          {feedbackSubmitting ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                          <span>Gửi hiệu chỉnh</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
