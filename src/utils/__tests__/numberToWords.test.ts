import { describe, it, expect } from 'vitest';
import { numberToVietnameseWords } from '../numberToWords';

describe('numberToVietnameseWords', () => {
  it('handles 0 correctly', () => {
    expect(numberToVietnameseWords(0)).toBe('Không đồng.');
  });

  it('handles small numbers correctly', () => {
    expect(numberToVietnameseWords(500000)).toBe('Năm trăm nghìn đồng.');
    expect(numberToVietnameseWords(1000000)).toBe('Một triệu đồng.');
  });

  it('handles complex amount like the sample PDF (23,209,200)', () => {
    const result = numberToVietnameseWords(23209200);
    expect(result).toBe('Hai mươi ba triệu hai trăm lẻ chín nghìn hai trăm đồng.');
  });
});
