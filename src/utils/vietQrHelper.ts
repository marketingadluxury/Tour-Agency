/**
 * Bộ tiện ích khởi tạo và xử lý mã thanh toán VietQR Napas 24/7
 * Hỗ trợ tạo Base64 PNG Data URL trực tiếp từ API chính thức của VietQR,
 * đảm bảo 100% không bị lỗi CORS, hiển thị sắc nét khi in ấn (window.print)
 * và khi kết xuất file PDF bằng html2canvas/html2pdf.
 */

export interface VietQrOptions {
  bankBin?: string;       // Mã BIN ngân hàng (Mặc định 970436 - Vietcombank)
  accountNo: string;      // Số tài khoản thụ hưởng
  accountName: string;    // Tên chủ tài khoản
  amount?: number;        // Số tiền cần thanh toán
  memo?: string;          // Nội dung chuyển khoản
  template?: string;      // Giao diện VietQR (mặc định 'compact2')
}

// Bảng tra cứu mã BIN ngân hàng Việt Nam phổ biến
export const BANK_BIN_MAP: Record<string, string> = {
  'VIETCOMBANK': '970436',
  'VCB': '970436',
  'BIDV': '970418',
  'VIETINBANK': '970415',
  'TECHCOMBANK': '970407',
  'MBBANK': '970422',
  'MB': '970422',
  'ACB': '970416',
  'VPBANK': '970432',
  'TPBANK': '970423',
  'SACOMBANK': '970403',
  'HDBANK': '970437',
  'VIB': '970441',
  'SHB': '970443',
  'MSB': '970426',
  'OCB': '970448',
  'SEABANK': '970440',
  'AGRIBANK': '970405',
};

/**
 * Lấy mã BIN ngân hàng từ tên ngân hàng
 */
export function getBankBinFromName(bankName?: string): string {
  if (!bankName) return '970436'; // Mặc định Vietcombank
  const normalized = bankName.toUpperCase();
  for (const [key, bin] of Object.entries(BANK_BIN_MAP)) {
    if (normalized.includes(key)) {
      return bin;
    }
  }
  return '970436';
}

/**
 * Tạo URL hình ảnh VietQR trực tiếp (SVG chuẩn CORS)
 */
export function buildVietQrDirectUrl({
  bankBin = '970436',
  accountNo,
  accountName,
  amount = 0,
  memo = '',
  template = 'compact2'
}: VietQrOptions): string {
  const cleanAccount = (accountNo || '').replace(/\s+/g, '');
  const cleanAmount = Math.max(0, Math.round(Number(amount) || 0));
  const cleanMemo = encodeURIComponent((memo || '').substring(0, 25));
  const cleanHolder = encodeURIComponent(accountName || '');
  // Dùng trực tiếp đuôi .svg để tránh mã 301 redirect và đảm bảo header Access-Control-Allow-Origin: *
  return `https://img.vietqr.io/image/${bankBin}-${cleanAccount}-${template}.svg?amount=${cleanAmount}&addInfo=${cleanMemo}&accountName=${cleanHolder}`;
}

// Bộ nhớ đệm tạm thời trong session để tránh gọi API trùng lặp
const qrDataUrlCache = new Map<string, string>();

/**
 * Chuyển đổi mã SVG sang PNG Data URL bằng canvas trong trình duyệt
 */
function convertSvgTextToPngDataUrl(svgText: string, width = 540, height = 640): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      resolve('');
      return;
    }
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      const encodedSvg = encodeURIComponent(svgText);
      img.src = `data:image/svg+xml;charset=utf-8,${encodedSvg}`;

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/png');
            resolve(dataUrl);
            return;
          }
        } catch (canvasErr) {
          console.warn('[VietQR] Canvas rasterize warning:', canvasErr);
        }
        resolve(img.src);
      };

      img.onerror = () => {
        resolve(`data:image/svg+xml;charset=utf-8,${encodedSvg}`);
      };
    } catch {
      resolve('');
    }
  });
}

/**
 * Tải về mã QR dưới dạng Base64 PNG Data URL hoàn chỉnh (data:image/png;base64,...)
 * Gọi qua API chính thức của VietQR, có fallback đa tầng tự động.
 */
export async function fetchVietQrDataUrl(options: VietQrOptions): Promise<string> {
  const {
    bankBin = '970436',
    accountNo,
    accountName,
    amount = 0,
    memo = '',
    template = 'compact2'
  } = options;

  if (!accountNo) return '';

  const cleanAccount = accountNo.replace(/\s+/g, '');
  const cleanAmount = Math.max(0, Math.round(Number(amount) || 0));
  const cleanMemo = (memo || '').substring(0, 50);
  const cacheKey = `${bankBin}_${cleanAccount}_${cleanAmount}_${cleanMemo}_${template}`;

  if (qrDataUrlCache.has(cacheKey)) {
    return qrDataUrlCache.get(cacheKey)!;
  }

  // Tầng 1: Gọi API chính thức v2 của VietQR sinh PNG Data URL chuẩn
  try {
    const res = await fetch('https://api.vietqr.io/v2/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        accountNo: cleanAccount,
        accountName,
        acqId: bankBin,
        amount: cleanAmount,
        addInfo: cleanMemo,
        format: 'text',
        template
      })
    });

    if (res.ok) {
      const json = await res.json();
      if (json?.code === '00' && json?.data?.qrDataURL) {
        const resultUrl = json.data.qrDataURL;
        qrDataUrlCache.set(cacheKey, resultUrl);
        return resultUrl;
      }
    }
  } catch (err) {
    console.warn('[VietQR] Không thể gọi API tạo QR v2, chuyển sang fallback SVG:', err);
  }

  // Tầng 2: Fallback lấy file SVG trực tiếp từ img.vietqr.io và rasterize sang PNG Data URL
  try {
    const svgUrl = buildVietQrDirectUrl(options);
    const svgRes = await fetch(svgUrl);
    if (svgRes.ok) {
      const svgText = await svgRes.text();
      if (svgText && svgText.includes('<svg')) {
        const pngUrl = await convertSvgTextToPngDataUrl(svgText);
        if (pngUrl) {
          qrDataUrlCache.set(cacheKey, pngUrl);
          return pngUrl;
        }
      }
    }
  } catch (err) {
    console.warn('[VietQR] Không thể fetch trực tiếp SVG VietQR:', err);
  }

  // Tầng 3: Trả về URL trực tiếp
  const directUrl = buildVietQrDirectUrl(options);
  return directUrl;
}
