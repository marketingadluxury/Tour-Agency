import { describe, it, expect } from 'vitest';
import { extractSkuPrefix, normalizeSku, matchTourToWooCommerceProduct, groupToursByProgram } from '../skuUtils';

describe('extractSkuPrefix', () => {
  it('trích xuất chính xác tiền tố khi có đuôi ngày tháng dạng YYMMDD hoặc YYYYMMDD', () => {
    expect(extractSkuPrefix('AD-US01-201026')).toBe('AD-US01');
    expect(extractSkuPrefix('TOUR-VN-01-20261015')).toBe('TOUR-VN-01');
    expect(extractSkuPrefix('EUR-05-151026')).toBe('EUR-05');
    expect(extractSkuPrefix('US01_15102026')).toBe('US01');
  });

  it('trích xuất chính xác tiền tố khi có đuôi ký hiệu đợt như D1, DOT1, T10', () => {
    expect(extractSkuPrefix('TOUR-VN-01-D1')).toBe('TOUR-VN-01');
    expect(extractSkuPrefix('AD-US-01-DOT1')).toBe('AD-US-01');
    expect(extractSkuPrefix('JP-SAKURA-T11')).toBe('JP-SAKURA');
    expect(extractSkuPrefix('KOR-02_DOT2')).toBe('KOR-02');
  });

  it('giữ nguyên mã tour nếu mã đã là SKU gốc và không có đuôi ngày/đợt', () => {
    expect(extractSkuPrefix('AD-US01')).toBe('AD-US01');
    expect(extractSkuPrefix('TOUR-VN-HA-LONG')).toBe('TOUR-VN-HA-LONG');
    expect(extractSkuPrefix('OBAU-SYDMEL-JQ')).toBe('OBAU-SYDMEL-JQ');
    expect(extractSkuPrefix('')).toBe('');
  });
});

describe('normalizeSku', () => {
  it('loại bỏ khoảng trắng và chuyển chữ hoa', () => {
    expect(normalizeSku(' ad-us01 ')).toBe('AD-US01');
    expect(normalizeSku('tour vn 01')).toBe('TOURVN01');
    expect(normalizeSku('obau-sydmel-jq')).toBe('OBAU-SYDMEL-JQ');
  });
});

describe('matchTourToWooCommerceProduct (Quy tắc so khớp)', () => {
  const mockProducts = [
    {
      id: 101,
      name: 'Tour Bờ Tây Hoa Kỳ 8N7Đ',
      sku: 'AD-US01',
      permalink: 'https://yourcompany.com/product/us-west',
      departures: ['AD-US01-201026', 'AD-US01-151126']
    },
    {
      id: 102,
      name: 'Tour Khám Phá Nhật Bản Mùa Thu',
      sku: 'JP-FALL',
      permalink: 'https://yourcompany.com/product/japan-autumn',
      departures: ['JP-FALL-01', 'SPECIAL-OCT-DEPARTURE']
    },
    {
      id: 103,
      name: 'Tour Châu Âu 5 Nước Cổ Kính',
      sku: 'EUR-CLASSIC',
      permalink: 'https://yourcompany.com/product/europe-classic',
      departures: []
    },
    {
      id: 104,
      name: 'Tour Úc 7N6Đ: Sydney - Melbourne',
      sku: 'OBAU-SYDMEL-JQ',
      permalink: 'https://yourcompany.com/product/australia-sydney-melbourne',
      departures: ['OBAU231026']
    }
  ];

  it('Tầng 0: Khớp chính xác theo wp_product_sku được gắn trực tiếp', () => {
    const tour = {
      id: 'tour-aus-1',
      name: 'Khởi hành Úc tháng 11',
      code: 'OBAU051126', // Mã đợt khởi hành khác biệt
      wp_product_sku: 'OBAU-SYDMEL-JQ' // Đã gán SKU Tour mẹ
    };
    const result = matchTourToWooCommerceProduct(tour, mockProducts);
    expect(result.matchedType).toBe('sku_matched');
    expect(result.targetProductId).toBe(104);
    expect(result.matchedProductSku).toBe('OBAU-SYDMEL-JQ');
    expect(result.mode).toBe('existing');
  });

  it('Tầng 1: Ưu tiên tour đã có liên kết từ trước (wp_product_id)', () => {
    const tour = {
      id: 'tour-1',
      name: 'Tour Đổi Tên Khác',
      code: 'RANDOM-CODE-99',
      wp_product_id: 102
    };
    const result = matchTourToWooCommerceProduct(tour, mockProducts);
    expect(result.matchedType).toBe('linked');
    expect(result.targetProductId).toBe(102);
    expect(result.mode).toBe('existing');
  });

  it('Tầng 2: Khớp theo tiền tố SKU của sản phẩm WooCommerce', () => {
    const tour = {
      id: 'tour-2',
      name: 'Khởi hành Bờ Tây Mỹ Mới Nhất',
      code: 'AD-US01-251226',
      wp_product_id: null
    };
    const result = matchTourToWooCommerceProduct(tour, mockProducts);
    expect(result.matchedType).toBe('sku_matched');
    expect(result.targetProductId).toBe(101);
    expect(result.matchedProductSku).toBe('AD-US01');
    expect(result.mode).toBe('existing');
  });

  it('Tầng 3: Khớp khi mã lịch trình đã có trong danh sách đợt khởi hành ACF', () => {
    const tour = {
      id: 'tour-3',
      name: 'Đợt khởi hành mùa thu',
      code: 'SPECIAL-OCT-DEPARTURE',
      wp_product_id: null
    };
    const result = matchTourToWooCommerceProduct(tour, mockProducts);
    expect(result.matchedType).toBe('departure_matched');
    expect(result.targetProductId).toBe(102);
    expect(result.mode).toBe('existing');
  });

  it('Tầng 4: So khớp theo tên chương trình tour tương đồng', () => {
    const tour = {
      id: 'tour-4',
      name: 'Tour Châu Âu 5 Nước Cổ Kính',
      code: 'EUR-NEW-2026',
      wp_product_id: null
    };
    const result = matchTourToWooCommerceProduct(tour, mockProducts);
    expect(result.matchedType).toBe('auto_matched');
    expect(result.targetProductId).toBe(103);
    expect(result.mode).toBe('existing');
  });

  it('Mặc định: Chưa có SKU tương ứng, gợi ý tạo sản phẩm mới với SKU là tiền tố', () => {
    const tour = {
      id: 'tour-5',
      name: 'Tour Hàn Quốc Seoul Đảo Nami',
      code: 'KOR-SEOUL-101126',
      wp_product_id: null
    };
    const result = matchTourToWooCommerceProduct(tour, mockProducts);
    expect(result.matchedType).toBe('new');
    expect(result.mode).toBe('new');
    expect(result.suggestedNewSku).toBe('KOR-SEOUL');
    expect(result.targetProductId).toBeNull();
  });
});

describe('groupToursByProgram (Gom nhóm theo Chương trình Tour / SKU Web)', () => {
  const mockProducts = [
    {
      id: 201,
      name: 'Tour Úc 7N6Đ: Sydney - Melbourne',
      sku: 'OBAU-SYDMEL-JQ',
      permalink: 'https://yourcompany.com/product/australia',
      departures: []
    }
  ];

  it('gom nhóm nhiều ngày khởi hành có cùng wp_product_sku về 1 ParentTourGroup duy nhất', () => {
    const tours = [
      { id: 't1', name: 'Tour Úc 7N6Đ (Đợt 1)', code: 'OBAU231026', wp_product_sku: 'OBAU-SYDMEL-JQ' },
      { id: 't2', name: 'Tour Úc 7N6Đ (Đợt 2)', code: 'OBAU051126', wp_product_sku: 'OBAU-SYDMEL-JQ' },
      { id: 't3', name: 'Tour Úc 7N6Đ (Đợt 3)', code: 'OBAU191126', wp_product_sku: 'OBAU-SYDMEL-JQ' }
    ];

    const groups = groupToursByProgram(tours);
    expect(groups.length).toBe(1);
    expect(groups[0].sku).toBe('OBAU-SYDMEL-JQ');
    expect(groups[0].departures.length).toBe(3);
  });

  it('gom nhóm các ngày khởi hành có cùng tên chương trình tour', () => {
    const tours = [
      { id: 't4', name: 'Tour Singapore - Malaysia 5N4Đ', code: 'SINMAL-01' },
      { id: 't5', name: 'Tour Singapore - Malaysia 5N4Đ', code: 'SINMAL-02' }
    ];

    const groups = groupToursByProgram(tours);
    expect(groups.length).toBe(1);
    expect(groups[0].departures.length).toBe(2);
    expect(groups[0].name).toBe('Tour Singapore - Malaysia 5N4Đ');
  });
});

