/**
 * Chuyển đổi số tiền thành chữ Tiếng Việt chuẩn tài chính - kế toán
 * Ví dụ: 23209200 -> "Hai mươi ba triệu hai trăm lẻ chín nghìn hai trăm đồng."
 */

const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

function readGroup(group: number, showZeroHundred: boolean): string {
  const hundreds = Math.floor(group / 100);
  const tens = Math.floor((group % 100) / 10);
  const units = group % 10;
  let result = '';

  if (hundreds > 0 || showZeroHundred) {
    result += `${DIGITS[hundreds]} trăm `;
    if (tens === 0 && units > 0) {
      result += 'lẻ ';
    }
  }

  if (tens > 1) {
    result += `${DIGITS[tens]} mươi `;
    if (units === 1) {
      result += 'mốt ';
    } else if (units === 4) {
      result += 'bốn ';
    } else if (units === 5) {
      result += 'lăm ';
    } else if (units > 0) {
      result += `${DIGITS[units]} `;
    }
  } else if (tens === 1) {
    result += 'mười ';
    if (units === 1) {
      result += 'một ';
    } else if (units === 4) {
      result += 'bốn ';
    } else if (units === 5) {
      result += 'lăm ';
    } else if (units > 0) {
      result += `${DIGITS[units]} `;
    }
  } else if (units > 0 && (hundreds > 0 || showZeroHundred)) {
    result += `${DIGITS[units]} `;
  } else if (units > 0 && !showZeroHundred && hundreds === 0 && tens === 0) {
    result += `${DIGITS[units]} `;
  }

  return result.trim();
}

export function numberToVietnameseWords(amount: number): string {
  if (!amount || isNaN(amount) || amount === 0) {
    return 'Không đồng.';
  }

  const scales = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
  let num = Math.round(Math.abs(amount));
  const groups: number[] = [];

  while (num > 0) {
    groups.push(num % 1000);
    num = Math.floor(num / 1000);
  }

  let words = '';
  for (let i = groups.length - 1; i >= 0; i--) {
    const group = groups[i];
    if (group > 0) {
      const showZeroHundred = i < groups.length - 1;
      const groupText = readGroup(group, showZeroHundred);
      const scale = scales[i];
      words += `${groupText} ${scale} `;
    }
  }

  words = words.trim();
  if (!words) {
    return 'Không đồng.';
  }

  // Viết hoa chữ cái đầu và thêm đuôi "đồng."
  const capitalized = words.charAt(0).toUpperCase() + words.slice(1).toLowerCase();
  return `${capitalized} đồng.`.replace(/\s+/g, ' ');
}
