import React, { useState } from 'react';
import { ExternalLink, Download, ChevronDown, ChevronUp, FileText } from 'lucide-react';

interface PassengerDocumentListProps {
  passportUrl?: string;
  laborContractUrl?: string;
  maxInitialDisplay?: number;
  variant?: 'card' | 'compact';
}

export const extractFileNameFromUrl = (url: string): string => {
  if (!url) return 'Tài liệu đính kèm';

  try {
    // 1. Check for explicit hash fragment or query string filename parameter (#filename=... or ?filename=...)
    if (url.includes('#filename=')) {
      const fragment = url.split('#filename=')[1];
      if (fragment) {
        const rawName = fragment.split('&')[0];
        if (rawName) {
          return decodeURIComponent(rawName);
        }
      }
    }

    if (url.includes('filename=')) {
      const match = url.match(/[?&]filename=([^&]+)/i);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
    }

    if (url.includes('fileName=')) {
      const match = url.match(/[?&]fileName=([^&]+)/i);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
    }

    // 2. Try parsing pathname (Supabase Storage URL or direct link)
    const cleanPath = url.split('#')[0].split('?')[0];
    const rawName = cleanPath.substring(cleanPath.lastIndexOf('/') + 1);

    if (rawName) {
      const decoded = decodeURIComponent(rawName);
      // Ensure it's not a generic Google Drive action path (view, edit, etc.)
      if (decoded && !decoded.includes('drive.google.com') && decoded !== 'view' && decoded !== 'edit' && !decoded.includes('usp=')) {
        let clean = decoded;
        clean = clean.replace(/^(FB_\d+_|PASSPORT_\d+_|DOC_\d+_)/i, '');
        clean = clean.replace(/^\d{10,}_/, '');
        clean = clean.replace(/^[a-zA-Z0-9]+_\d{10,}_/, '');
        clean = clean.replace(/^[A-Z0-9]+-[A-Z0-9]+\./i, '');

        if (clean) return clean;
      }
    }
  } catch (e) {
    // Fallback on error
  }

  if (url.includes('drive.google.com')) {
    return 'Tài liệu Google Drive';
  }

  if (url.includes('supabase.com') || url.includes('supabase.co')) {
    return 'Hồ sơ Supabase';
  }

  return 'Tài liệu đính kèm';
};

export const PassengerDocumentList: React.FC<PassengerDocumentListProps> = ({
  passportUrl,
  laborContractUrl,
  maxInitialDisplay = 2,
  variant = 'card'
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Gom tất cả URL file thành danh sách
  const urls: { url: string; type: 'passport' | 'labor' }[] = [];

  if (passportUrl) {
    passportUrl.split(',').filter(Boolean).forEach(u => {
      urls.push({ url: u.trim(), type: 'passport' });
    });
  }

  if (laborContractUrl) {
    laborContractUrl.split(',').filter(Boolean).forEach(u => {
      urls.push({ url: u.trim(), type: 'labor' });
    });
  }

  if (urls.length === 0) {
    return (
      <div className="text-xs text-gray-400 italic">
        Chưa có tài liệu đính kèm
      </div>
    );
  }

  const hasMore = urls.length > maxInitialDisplay;
  const visibleUrls = isExpanded ? urls : urls.slice(0, maxInitialDisplay);
  const hiddenCount = urls.length - maxInitialDisplay;

  if (variant === 'compact') {
    return (
      <div className="flex flex-col gap-1 w-full">
        <div className="flex flex-col gap-1">
          {visibleUrls.map((item, idx) => {
            const fileName = extractFileNameFromUrl(item.url);
            const isGoogleDriveFolder = item.url.includes('drive.google.com');
            const isSupabaseFolder = item.url.includes('supabase.com') || item.url.includes('supabase.co');

            let badgeClass = "inline-flex items-center gap-1.5 text-[11px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-md transition-colors truncate max-w-[170px]";
            
            if (isGoogleDriveFolder) {
              badgeClass = "inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md transition-colors truncate max-w-[170px]";
            } else if (isSupabaseFolder) {
              badgeClass = "inline-flex items-center gap-1.5 text-[11px] font-medium text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-md transition-colors truncate max-w-[170px]";
            }

            return (
              <a
                key={idx}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className={badgeClass}
                title={fileName}
              >
                <ExternalLink className="w-3 h-3 shrink-0" />
                <span className="truncate">{fileName}</span>
              </a>
            );
          })}
        </div>

        {hasMore && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50/80 hover:bg-blue-100 px-2 py-0.5 rounded transition-all w-fit mt-0.5 cursor-pointer"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3 h-3" />
                <span>Thu gọn</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" />
                <span>Xem thêm +{hiddenCount} file</span>
              </>
            )}
          </button>
        )}
      </div>
    );
  }

  // Default 'card' variant (dùng cho trang Xử lý Visa & Modal)
  return (
    <div className="space-y-1.5 w-full">
      <div className="space-y-1.5">
        {visibleUrls.map((item, idx) => {
          const fileName = extractFileNameFromUrl(item.url);
          const isGoogleDriveFolder = item.url.includes('drive.google.com');
          const isSupabaseFolder = item.url.includes('supabase.com') || item.url.includes('supabase.co');

          let itemClass = "flex items-center justify-between text-xs bg-white px-3 py-1.5 rounded-lg border border-gray-200 gap-2 hover:border-gray-300 transition-colors shadow-2xs";
          let linkClass = "text-blue-600 hover:text-blue-800 p-1.5 rounded bg-blue-50 hover:bg-blue-100 transition-colors shrink-0";

          if (isGoogleDriveFolder) {
            itemClass = "flex items-center justify-between text-xs bg-emerald-50/90 px-3 py-1.5 rounded-lg border border-emerald-200/80 gap-2 hover:bg-emerald-100/70 transition-colors shadow-2xs";
            linkClass = "text-emerald-700 hover:text-emerald-900 p-1.5 rounded bg-emerald-100/80 hover:bg-emerald-200 transition-colors shrink-0";
          } else if (isSupabaseFolder) {
            itemClass = "flex items-center justify-between text-xs bg-indigo-50/90 px-3 py-1.5 rounded-lg border border-indigo-200/80 gap-2 hover:bg-indigo-100/70 transition-colors shadow-2xs";
            linkClass = "text-indigo-700 hover:text-indigo-900 p-1.5 rounded bg-indigo-100/80 hover:bg-indigo-200 transition-colors shrink-0";
          }

          return (
            <div key={idx} className={itemClass}>
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="text-gray-800 font-medium truncate text-xs" title={fileName}>
                  {fileName}
                </span>
              </div>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
                title={`Mở file: ${fileName}`}
              >
                {isGoogleDriveFolder || isSupabaseFolder ? (
                  <ExternalLink className="w-3.5 h-3.5" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
              </a>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 py-1.5 px-3 rounded-lg transition-colors cursor-pointer"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Thu gọn danh sách</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              <span>Xem toàn bộ ({urls.length} file)</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};
