/**
 * Tiện ích hỗ trợ hệ thống tài liệu & hướng dẫn Docs
 */

/**
 * Chuyển đổi chuỗi tiếng Việt có dấu thành slug an toàn cho HTML ID & URL anchor
 */
export function slugifyHeading(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // loại bỏ dấu tiếng Việt
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-') // chuyển khoảng trắng & ký tự đặc biệt thành -
    .replace(/(^-|-$)+/g, ''); // loại bỏ dấu - ở đầu và cuối
}

/**
 * Trích xuất nội dung text thuần túy từ React Node
 */
export function extractTextFromNode(node: React.ReactNode): string {
  if (node === null || node === undefined) {
    return '';
  }
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(extractTextFromNode).join('');
  }
  if (typeof node === 'object' && 'props' in node) {
    const props = (node as any).props as { children?: React.ReactNode };
    return extractTextFromNode(props?.children);
  }
  return '';
}
