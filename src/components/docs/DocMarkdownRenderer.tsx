import React from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Lightbulb, 
  ShieldAlert, 
  FileText,
  ExternalLink 
} from 'lucide-react';
import { slugifyHeading, extractTextFromNode } from '@/utils/docUtils';

interface DocMarkdownRendererProps {
  content: string;
}

export const DocMarkdownRenderer: React.FC<DocMarkdownRendererProps> = ({ content }) => {
  return (
    <div className="doc-content prose-slate max-w-none text-slate-800 leading-relaxed font-sans">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children, ...props }) => {
            const rawText = extractTextFromNode(children);
            const id = slugifyHeading(rawText);
            return (
              <h1 id={id} className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-8 mb-4 scroll-mt-6 border-b border-slate-200 pb-3" {...props}>
                {children}
              </h1>
            );
          },
          h2: ({ children, ...props }) => {
            const rawText = extractTextFromNode(children);
            const id = slugifyHeading(rawText);
            return (
              <h2 id={id} className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight mt-8 mb-3 scroll-mt-6 flex items-center gap-2 group" {...props}>
                <span className="w-1.5 h-5 bg-blue-600 rounded-full inline-block shrink-0"></span>
                <span>{children}</span>
              </h2>
            );
          },
          h3: ({ children, ...props }) => {
            const rawText = extractTextFromNode(children);
            const id = slugifyHeading(rawText);
            return (
              <h3 id={id} className="text-base font-bold text-slate-900 mt-6 mb-2 scroll-mt-6 flex items-center gap-1.5" {...props}>
                <span className="w-1.5 h-3.5 bg-slate-400 rounded-full inline-block shrink-0"></span>
                <span>{children}</span>
              </h3>
            );
          },
          h4: ({ children, ...props }) => (
            <h4 className="text-sm font-bold text-slate-800 mt-4 mb-1.5" {...props}>
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="text-slate-700 text-sm leading-relaxed mb-4">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-outside pl-5 space-y-2 mb-4 text-sm text-slate-700">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside pl-5 space-y-2 mb-4 text-sm text-slate-700">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-sm text-slate-700 leading-relaxed pl-1">
              {children}
            </li>
          ),
          a: ({ href, children }) => {
            const isExternal = href?.startsWith('http');
            return (
              <a 
                href={href} 
                target={isExternal ? '_blank' : undefined} 
                rel={isExternal ? 'noopener noreferrer' : undefined}
                className="inline-flex items-center gap-0.5 text-blue-600 hover:text-blue-800 font-semibold underline underline-offset-2 transition-colors cursor-pointer"
              >
                <span>{children}</span>
                {isExternal && <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />}
              </a>
            );
          },
          img: ({ src, alt }) => (
            <div className="my-5">
              <img 
                src={src} 
                alt={alt || 'Minh họa tài liệu'} 
                className="rounded-xl border border-slate-200/90 shadow-sm max-w-full h-auto object-contain mx-auto"
                loading="lazy"
              />
              {alt && <p className="text-center text-xs text-slate-400 mt-1.5 italic">{alt}</p>}
            </div>
          ),
          blockquote: ({ children }) => {
            // Extract raw text to detect callout icons
            const raw = extractTextFromNode(children);

            let styleClass = 'bg-blue-50/80 border-blue-500 text-blue-950';
            let IconComponent = Lightbulb;
            let title = 'Mẹo thao tác';

            if (raw.includes('⚠️') || raw.toLowerCase().includes('lưu ý') || raw.toLowerCase().includes('cảnh báo')) {
              styleClass = 'bg-amber-50/90 border-amber-500 text-amber-950';
              IconComponent = AlertTriangle;
              title = 'Lưu ý quan trọng';
            } else if (raw.includes('🔒') || raw.toLowerCase().includes('quyền') || raw.toLowerCase().includes('bảo mật')) {
              styleClass = 'bg-rose-50/90 border-rose-500 text-rose-950';
              IconComponent = ShieldAlert;
              title = 'Bảo mật & Phân quyền';
            } else if (raw.includes('📋') || raw.toLowerCase().includes('quy định') || raw.toLowerCase().includes('chính sách')) {
              styleClass = 'bg-indigo-50/90 border-indigo-500 text-indigo-950';
              IconComponent = FileText;
              title = 'Quy định công ty';
            } else if (raw.includes('✅') || raw.toLowerCase().includes('thành công') || raw.toLowerCase().includes('xác nhận')) {
              styleClass = 'bg-emerald-50/90 border-emerald-500 text-emerald-950';
              IconComponent = CheckCircle2;
              title = 'Xác nhận';
            } else if (raw.includes('💡')) {
              styleClass = 'bg-blue-50/90 border-blue-500 text-blue-950';
              IconComponent = Lightbulb;
              title = 'Gợi ý hữu ích';
            }

            return (
              <div className={`p-4 rounded-xl border-l-4 my-5 shadow-2xs ${styleClass}`}>
                <div className="flex items-center gap-2 mb-1.5 font-bold text-xs uppercase tracking-wide opacity-90">
                  <IconComponent className="w-4 h-4 shrink-0" />
                  <span>{title}</span>
                </div>
                <div className="text-xs sm:text-sm font-medium leading-relaxed">
                  {children}
                </div>
              </div>
            );
          },
          table: ({ children }) => (
            <div className="my-6 overflow-x-auto rounded-xl border border-slate-200 shadow-2xs bg-white">
              <table className="w-full min-w-[550px] divide-y divide-slate-200 text-left text-xs sm:text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-100/80 text-slate-800 font-bold uppercase text-[11px] tracking-wider border-b border-slate-200">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-slate-100 bg-white">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-blue-50/30 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-4 py-3.5 font-bold text-slate-800 whitespace-nowrap">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-3.5 text-slate-700 font-medium align-middle">
              {children}
            </td>
          ),
          code: ({ children, className }) => {
            const isBlock = className?.includes('language-');
            if (isBlock) {
              return (
                <div className="my-4 rounded-xl bg-slate-900 text-slate-100 p-4 font-mono text-xs overflow-x-auto shadow-sm border border-slate-800">
                  <code>{children}</code>
                </div>
              );
            }
            return (
              <code className="px-1.5 py-0.5 rounded-md bg-slate-100 text-blue-700 font-mono text-xs font-semibold border border-slate-200/70">
                {children}
              </code>
            );
          },
          hr: () => <hr className="my-8 border-slate-200" />,
          strong: ({ children }) => <strong className="font-bold text-slate-900">{children}</strong>,
        }}
      >
        {content}
      </Markdown>
    </div>
  );
};
