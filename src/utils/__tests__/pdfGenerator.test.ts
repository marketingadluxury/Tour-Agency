import { describe, it, expect } from 'vitest';
import { oklchToRgb, sanitizeOklchColors, createSafeComputedStyleProxy } from '../colorSanitizer';

describe('PDF Generator OKLCH Sanitizer', () => {
  it('chuyển đổi oklch đen / xám sang chuẩn rgb', () => {
    const res = oklchToRgb(0.205, 0, 0);
    expect(res).toMatch(/^rgb\(\d+,\s*\d+,\s*\d+\)$/);
    expect(res).toBe('rgb(23, 23, 23)');
  });

  it('chuyển đổi oklch có alpha sang rgba', () => {
    const res = oklchToRgb(0.869, 0.022, 252.894, 0.5);
    expect(res).toMatch(/^rgba\(\d+,\s*\d+,\s*\d+,\s*0\.5\)$/);
  });

  it('sanitizeOklchColors thay thế chính xác các chuỗi oklch trong CSS', () => {
    const css = 'color: oklch(0.205 0 0); border: 1px solid oklch(0.869 0.022 252.894 / 0.5);';
    const sanitized = sanitizeOklchColors(css);
    expect(sanitized).not.toContain('oklch');
    expect(sanitized).toContain('color: rgb(23, 23, 23);');
    expect(sanitized).toContain('rgba(');
  });

  it('sanitizeOklchColors xử lý an toàn giá trị none hoặc phần trăm', () => {
    const css = 'background-color: oklch(20.5% none none);';
    const sanitized = sanitizeOklchColors(css);
    expect(sanitized).not.toContain('oklch');
    expect(sanitized).toContain('rgb(');
  });

  it('giữ nguyên chuỗi màu không chứa oklch', () => {
    const hexCss = 'color: #333333; background: rgb(255, 255, 255);';
    expect(sanitizeOklchColors(hexCss)).toBe(hexCss);
  });
});

describe('createSafeComputedStyleProxy', () => {
  it('không bị lỗi Illegal invocation khi truy cập native getter đòi hỏi this instance thật', () => {

    // Giả lập một native prototype có getter với brand check nội bộ (như V8 WebIDL của CSSStyleDeclaration)
    class NativeStyleDeclarationMock {
      private _brand = 'CSSStyleDeclarationInternalSlot';
      private _props: Record<string, string> = {
        color: 'oklch(0.205 0 0)',
        'background-color': 'oklch(0.869 0.022 252.894 / 0.5)',
        margin: '10px'
      };

      get length(): number {
        // Nếu this không phải là instance thật (ví dụ bị truyền Proxy receiver vào), ném Illegal invocation
        if (this._brand !== 'CSSStyleDeclarationInternalSlot') {
          throw new TypeError('Illegal invocation');
        }
        return Object.keys(this._props).length;
      }

      getPropertyValue(prop: string): string {
        if (this._brand !== 'CSSStyleDeclarationInternalSlot') {
          throw new TypeError('Illegal invocation');
        }
        return this._props[prop] || '';
      }

      getPropertyPriority(prop: string): string {
        if (this._brand !== 'CSSStyleDeclarationInternalSlot') {
          throw new TypeError('Illegal invocation');
        }
        return '';
      }

      item(index: number): string {
        if (this._brand !== 'CSSStyleDeclarationInternalSlot') {
          throw new TypeError('Illegal invocation');
        }
        return Object.keys(this._props)[index] || '';
      }
    }

    const nativeInstance = new NativeStyleDeclarationMock() as unknown as CSSStyleDeclaration;
    const proxied = createSafeComputedStyleProxy(nativeInstance);

    // Kiểm tra truy cập .length (getter) không gây lỗi Illegal invocation
    expect(() => proxied.length).not.toThrow();
    expect(proxied.length).toBe(3);

    // Kiểm tra item(i)
    expect(proxied.item(0)).toBe('color');

    // Kiểm tra getPropertyValue tự động khử oklch sang rgb
    const colorVal = proxied.getPropertyValue('color');
    expect(colorVal).not.toContain('oklch');
    expect(colorVal).toBe('rgb(23, 23, 23)');

    const bgVal = proxied.getPropertyValue('background-color');
    expect(bgVal).not.toContain('oklch');
    expect(bgVal).toContain('rgba(');

    // Thuộc tính thường không bị ảnh hưởng
    expect(proxied.getPropertyValue('margin')).toBe('10px');
    expect(proxied.getPropertyPriority('color')).toBe('');
  });
});

