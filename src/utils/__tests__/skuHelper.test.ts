import { describe, it, expect } from 'vitest';
import { extractSkuFromTourCode, findMatchedProductForTour } from '../skuUtils';

describe('extractSkuFromTourCode', () => {
  it('trích xuất tiền tố SKU chuẩn xác khi mã lịch trình có ngày/đợt ở đuôi', () => {
    expect(extractSkuFromTourCode('AD-US01-201026')).toBe('AD-US01');
    expect(extractSkuFromTourCode('AD-EU05_15112026')).toBe('AD-EU05');
    expect(extractSkuFromTourCode('TOUR-VN-01-D1')).toBe('TOUR-VN-01');
    expect(extractSkuFromTourCode('US-WEST-K01')).toBe('US-WEST');
  });

  it('giữ nguyên mã nếu không có phân tách ngày tháng/đợt ở đuôi', () => {
    expect(extractSkuFromTourCode('AD-US01')).toBe('AD-US01');
    expect(extractSkuFromTourCode('VN-PQ01')).toBe('VN-PQ01');
    expect(extractSkuFromTourCode('')).toBe('');
  });
});

describe('findMatchedProductForTour', () => {
  const sampleProducts = [
    {
      id: 101,
      name: 'Tour Du Lịch Bờ Tây Nước Mỹ 8N7Đ',
      sku: 'AD-US01',
      departures: ['AD-US01-100126', 'AD-US01-150226']
    },
    {
      id: 102,
      name: 'Tour Khám Phá Châu Âu 5 Nước',
      sku: 'AD-EU05',
      departures: []
    },
    {
      id: 103,
      name: 'Tour Phú Quốc Đảo Ngọc',
      sku: 'VN-PQ01',
      departures: ['VN-PQ01-D1']
    }
  ];

  it('ưu tiên ghép nối theo wp_product_id đã liên kết trước đó', () => {
    const tour = {
      id: 'tour-1',
      name: 'Tên tour bất kỳ',
      code: 'UNKNOWN-01',
      wp_product_id: 102
    };

    const res = findMatchedProductForTour(tour, sampleProducts);
    expect(res.targetProductId).toBe(102);
    expect(res.matchedType).toBe('linked');
  });

  it('tự động khớp sản phẩm theo tiền tố SKU của mã lịch trình CRM', () => {
    const tour = {
      id: 'tour-2',
      name: 'Tour Bờ Tây Hoa Kỳ Khởi Hành Tháng 10',
      code: 'AD-US01-201026',
      wp_product_id: null
    };

    const res = findMatchedProductForTour(tour, sampleProducts);
    expect(res.targetProductId).toBe(101);
    expect(res.matchedType).toBe('sku_matched');
    expect(res.matchedSku).toBe('AD-US01');
  });

  it('tự động khớp khi mã lịch trình nằm trong danh sách departures ACF của sản phẩm web', () => {
    const tour = {
      id: 'tour-3',
      name: 'Khác tên hoàn toàn',
      code: 'VN-PQ01-D1',
      wp_product_id: null
    };

    const res = findMatchedProductForTour(tour, sampleProducts);
    expect(res.targetProductId).toBe(103);
    expect(res.matchedType).toBe('sku_matched');
  });

  it('tự động khớp theo tên tour nếu không có SKU trùng khớp', () => {
    const tour = {
      id: 'tour-4',
      name: 'Tour Khám Phá Châu Âu 5 Nước',
      code: 'KHONG-TRUNG-SKU',
      wp_product_id: null
    };

    const res = findMatchedProductForTour(tour, sampleProducts);
    expect(res.targetProductId).toBe(102);
    expect(res.matchedType).toBe('name_matched');
  });

  it('chọn chế độ new khi không tìm thấy sản phẩm khớp', () => {
    const tour = {
      id: 'tour-5',
      name: 'Tour Nam Cực Mạo Hiểm',
      code: 'ANTARCTICA-01',
      wp_product_id: null
    };

    const res = findMatchedProductForTour(tour, sampleProducts);
    expect(res.targetProductId).toBeNull();
    expect(res.matchedType).toBe('new');
  });
});
