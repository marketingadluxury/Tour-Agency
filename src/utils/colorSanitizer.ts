/**
 * Bộ công cụ chuyển đổi & chuẩn hóa màu sắc CSS hiện đại (OKLCH, OKLAB)
 * sang chuẩn RGB / RGBA tương thích html2canvas và các thư viện xuất PDF.
 */

export const COLOR_PROPERTIES = [
  'color',
  'background-color',
  'border-color',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'outline-color',
  'text-decoration-color',
  'box-shadow',
  'fill',
  'stroke'
] as const;

/**
 * Chuyển đổi chính xác giá trị màu OKLCH sang chuẩn RGB / RGBA
 * Công thức chuẩn hóa không gian màu Oklab -> CIE XYZ -> linear sRGB -> sRGB gamma
 */
export function oklchToRgb(l: number, c: number, h: number, a: number = 1): string {
  const hRad = (h * Math.PI) / 180;
  const a_ = c * Math.cos(hRad);
  const b_ = c * Math.sin(hRad);

  const l_ = l + 0.3963377774 * a_ + 0.2158037573 * b_;
  const m_ = l - 0.1055613458 * a_ - 0.0638541728 * b_;
  const s_ = l - 0.0894841775 * a_ - 1.2914855480 * b_;

  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  const rLin = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const gLin = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const bLin = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

  const toRgb = (x: number) => {
    const clamped = Math.max(0, Math.min(1, x));
    const val = clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
    return Math.round(Math.max(0, Math.min(255, val * 255)));
  };

  const r = toRgb(rLin);
  const g = toRgb(gLin);
  const b = toRgb(bLin);

  if (a < 1) {
    return `rgba(${r}, ${g}, ${b}, ${Number(a.toFixed(3))})`;
  }
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Quét và thay thế toàn bộ chuỗi oklch(...) trong văn bản CSS hoặc style string sang RGB/RGBA
 */
export function sanitizeOklchColors(str: string): string {
  if (!str || typeof str !== 'string' || !str.includes('oklch')) {
    return str;
  }

  // Regex nhận diện oklch(L C H [/ A])
  const oklchRegex = /oklch\(\s*([^\s/]+)\s+([^\s/]+)\s+([^\s/]+)(?:\s*\/\s*([^\s)]+))?\s*\)/gi;

  return str.replace(oklchRegex, (match, lStr, cStr, hStr, aStr) => {
    try {
      let l = parseFloat(lStr);
      if (lStr.toLowerCase() === 'none') l = 0;
      else if (lStr.endsWith('%')) l = l / 100;

      let c = parseFloat(cStr);
      if (cStr.toLowerCase() === 'none') c = 0;
      else if (cStr.endsWith('%')) c = c / 100;

      let h = parseFloat(hStr);
      if (hStr.toLowerCase() === 'none' || isNaN(h)) h = 0;
      else if (hStr.endsWith('rad')) h = (h * 180) / Math.PI;
      else if (hStr.endsWith('turn')) h = h * 360;
      else if (hStr.endsWith('grad')) h = (h * 360) / 400;

      let a = 1;
      if (aStr) {
        if (aStr.toLowerCase() === 'none') a = 1;
        else if (aStr.endsWith('%')) a = parseFloat(aStr) / 100;
        else a = parseFloat(aStr);
        if (isNaN(a)) a = 1;
      }

      return oklchToRgb(l, c, h, a);
    } catch {
      return 'rgb(0, 0, 0)';
    }
  });
}

/**
 * Bọc CSSStyleDeclaration trong Proxy an toàn để chuyển đổi các giá trị oklch sang rgb.
 * Lưu ý cốt tử: Tuyệt đối KHÔNG truyền receiver vào Reflect.get vì các native getter của
 * CSSStyleDeclaration (length, cssText, các thuộc tính CSS) yêu cầu "this" phải là native instance.
 * Nếu truyền Proxy receiver, WebIDL binding của trình duyệt sẽ ném lỗi "TypeError: Illegal invocation".
 */
export function createSafeComputedStyleProxy(style: CSSStyleDeclaration): CSSStyleDeclaration {
  if (!style) return style;

  return new Proxy(style, {
    get(target, prop) {
      // 1. Luôn truy xuất trực tiếp trên target (hoặc dùng target làm receiver) để đảm bảo "this"
      // bên trong các getter native (length, cssText, ...) luôn là CSSStyleDeclaration instance thật
      let val: any;
      try {
        val = (target as any)[prop];
      } catch {
        val = Reflect.get(target, prop, target);
      }

      // 2. Nếu là hàm phương thức (getPropertyValue, getPropertyPriority, item...), bind với target
      if (typeof val === 'function') {
        const boundFn = val.bind(target);
        if (prop === 'getPropertyValue') {
          return function(propertyName: string) {
            const res = boundFn(propertyName);
            if (typeof res === 'string' && res.includes('oklch')) {
              return sanitizeOklchColors(res);
            }
            return res;
          };
        }
        return boundFn;
      }

      // 3. Nếu là chuỗi màu chứa oklch (ví dụ truy xuất style.color hoặc style.backgroundColor)
      if (typeof val === 'string' && val.includes('oklch')) {
        return sanitizeOklchColors(val);
      }

      return val;
    }
  });
}

