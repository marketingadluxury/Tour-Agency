import html2pdf from 'html2pdf.js';
import {
  COLOR_PROPERTIES,
  sanitizeOklchColors,
  createSafeComputedStyleProxy
} from './colorSanitizer';

export interface GeneratePdfOptions {
  filename?: string;
  margin?: number | [number, number, number, number];
}

export { oklchToRgb, sanitizeOklchColors, createSafeComputedStyleProxy } from './colorSanitizer';

/**
 * Quét toàn bộ phần tử DOM và chuẩn hóa các giá trị màu oklch thành RGB
 */
function sanitizeElementTree(root: HTMLElement): void {
  const allElements = [root, ...Array.from(root.querySelectorAll('*'))] as HTMLElement[];

  allElements.forEach(el => {
    // 1. Chuẩn hóa thuộc tính style inline nếu có
    const styleAttr = el.getAttribute('style');
    if (styleAttr && styleAttr.includes('oklch')) {
      el.setAttribute('style', sanitizeOklchColors(styleAttr));
    }

    // 2. Chuẩn hóa SVG fill / stroke
    const fillAttr = el.getAttribute('fill');
    if (fillAttr && fillAttr.includes('oklch')) {
      el.setAttribute('fill', sanitizeOklchColors(fillAttr));
    }
    const strokeAttr = el.getAttribute('stroke');
    if (strokeAttr && strokeAttr.includes('oklch')) {
      el.setAttribute('stroke', sanitizeOklchColors(strokeAttr));
    }

    // 3. Chuẩn hóa computed style sang inline style để override triệt để
    if (typeof window !== 'undefined' && el.ownerDocument?.defaultView) {
      try {
        const computed = el.ownerDocument.defaultView.getComputedStyle(el);
        COLOR_PROPERTIES.forEach(prop => {
          const val = computed.getPropertyValue(prop);
          if (val && val.includes('oklch')) {
            el.style.setProperty(prop, sanitizeOklchColors(val), 'important');
          }
        });
      } catch {
        // bỏ qua nếu không thể đọc computed style của node
      }
    }
  });
}

/**
 * Xuất phần tử DOM thành file PDF (Blob) chuẩn khổ giấy A4
 * @param element Phần tử HTML cần chuyển đổi sang PDF
 * @param options Cấu hình tên file và lề trang in
 */
export async function exportElementToPdfBlob(
  element: HTMLElement,
  options: GeneratePdfOptions = {}
): Promise<Blob> {
  // Clone element để xóa border/shadow của khung preview màn hình
  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.boxSizing = 'border-box';
  clone.style.boxShadow = 'none';
  clone.style.border = 'none';
  clone.style.margin = '0';
  clone.style.width = '100%';
  clone.style.maxWidth = '100%';
  clone.style.minWidth = '0';
  clone.style.padding = '0';
  clone.style.backgroundColor = '#ffffff';
  clone.style.overflowWrap = 'break-word';
  clone.style.wordBreak = 'break-word';

  // Đảm bảo tất cả bảng không bị tràn ra ngoài khung in
  clone.querySelectorAll('table').forEach(tbl => {
    const el = tbl as HTMLElement;
    el.style.width = '100%';
    el.style.maxWidth = '100%';
    el.style.boxSizing = 'border-box';
    el.style.tableLayout = 'auto';
  });

  // Đồng bộ trạng thái hình ảnh (Base64 data URL, crossOrigin) từ element gốc sang clone
  const originalImgs = Array.from(element.querySelectorAll('img'));
  const clonedImgs = Array.from(clone.querySelectorAll('img'));
  clonedImgs.forEach((clonedImg, idx) => {
    const origImg = originalImgs[idx];
    if (origImg) {
      if (origImg.currentSrc || origImg.src) {
        clonedImg.src = origImg.currentSrc || origImg.src;
      }
      clonedImg.crossOrigin = 'anonymous';
    }
    clonedImg.style.maxWidth = '100%';
  });

  // Container ẩn tạm thời ngoài màn hình để html2pdf chụp ảnh chuẩn nhất
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '734px'; // Bề rộng in ấn thực tế của khổ A4 (210mm trừ lề 2 bên 16mm = 194mm ~ 733.2px)
  container.style.boxSizing = 'border-box';
  container.style.backgroundColor = '#ffffff';
  container.style.zIndex = '-9999';
  container.appendChild(clone);
  document.body.appendChild(container);

  // Đảm bảo tất cả hình ảnh trong clone đã load xong hoàn toàn trước khi html2canvas bắt đầu chụp
  await Promise.all(
    clonedImgs.map(img => {
      if (img.complete && img.naturalWidth !== 0) return Promise.resolve();
      return new Promise<void>(resolve => {
        const timer = setTimeout(resolve, 2000);
        img.onload = () => {
          clearTimeout(timer);
          resolve();
        };
        img.onerror = () => {
          clearTimeout(timer);
          resolve();
        };
      });
    })
  );

  // Chuẩn hóa cây DOM clone trước khi render
  sanitizeElementTree(clone);

  // Intercept getComputedStyle của window chính làm tầng bảo vệ thứ nhất
  let origWindowGetComputedStyle: typeof window.getComputedStyle | null = null;
  if (typeof window !== 'undefined' && window.getComputedStyle) {
    origWindowGetComputedStyle = window.getComputedStyle;
    window.getComputedStyle = function(el: Element, pseudo?: string | null) {
      const style = origWindowGetComputedStyle!.call(window, el, pseudo);
      return createSafeComputedStyleProxy(style);
    };
  }

  try {
    const opt = {
      margin: options.margin ?? [10, 8, 10, 8],
      filename: options.filename || 'HopDong_DuLich.pdf',
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        letterRendering: true,
        backgroundColor: '#ffffff',
        windowWidth: 800,
        onclone: (clonedDoc: Document) => {
          // 0. Canh chỉnh container và phần tử nguồn trong iframe để không bị lệch mép phải hay subpixel centering
          try {
            const pdfContainer = clonedDoc.querySelector('.html2pdf__container') as HTMLElement | null;
            if (pdfContainer) {
              pdfContainer.style.left = '0';
              pdfContainer.style.right = 'auto';
              pdfContainer.style.margin = '0';
              pdfContainer.style.padding = '0';
              pdfContainer.style.boxSizing = 'border-box';
              if (pdfContainer.firstElementChild) {
                const child = pdfContainer.firstElementChild as HTMLElement;
                child.style.width = '100%';
                child.style.maxWidth = '100%';
                child.style.minWidth = '0';
                child.style.padding = '0';
                child.style.margin = '0';
                child.style.boxSizing = 'border-box';
                child.style.overflowWrap = 'break-word';
                child.style.wordBreak = 'break-word';
              }
            }
          } catch (e) {
            console.warn('[pdfGenerator] Error adjusting cloned container:', e);
          }

          // 1. Quét và thay thế oklch trong toàn bộ thẻ <style> của iframe
          try {
            const styleNodes = clonedDoc.querySelectorAll('style');
            styleNodes.forEach(s => {
              if (s.textContent && s.textContent.includes('oklch')) {
                s.textContent = sanitizeOklchColors(s.textContent);
              }
            });
          } catch (e) {
            console.warn('[pdfGenerator] Error sanitizing cloned <style>:', e);
          }

          // 2. Đặt Proxy an toàn cho getComputedStyle của window trong iframe
          try {
            const clonedWin = clonedDoc.defaultView;
            if (clonedWin && clonedWin.getComputedStyle) {
              const origClonedGetComputedStyle = clonedWin.getComputedStyle;
              clonedWin.getComputedStyle = function(el: Element, pseudo?: string | null) {
                const style = origClonedGetComputedStyle.call(clonedWin, el, pseudo);
                return createSafeComputedStyleProxy(style);
              };
            }
          } catch (e) {
            console.warn('[pdfGenerator] Error proxying iframe getComputedStyle:', e);
          }

          // 3. Chuẩn hóa toàn bộ cây phần tử trong clonedDoc
          try {
            if (clonedDoc.body) {
              sanitizeElementTree(clonedDoc.body);
            }
          } catch (e) {
            console.warn('[pdfGenerator] Error sanitizing cloned DOM tree:', e);
          }
        }
      },
      jsPDF: {
        unit: 'mm' as const,
        format: 'a4' as const,
        orientation: 'portrait' as const
      },
      pagebreak: { 
        mode: ['avoid-all', 'css', 'legacy'],
        avoid: ['.avoid-break', 'tr', 'h1', 'h2', 'h3']
      }
    };

    const worker = html2pdf().from(clone).set(opt);
    const blob: Blob = await worker.output('blob');
    return blob;
  } finally {
    // Khôi phục getComputedStyle gốc của window chính
    if (origWindowGetComputedStyle && typeof window !== 'undefined') {
      window.getComputedStyle = origWindowGetComputedStyle;
    }
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

/**
 * Tải file PDF trực tiếp xuống máy tính của người dùng
 * @param blob File PDF dạng Blob
 * @param filename Tên file khi tải về máy
 */
export function downloadPdfBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
