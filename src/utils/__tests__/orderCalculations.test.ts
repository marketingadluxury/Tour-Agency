import { describe, it, expect } from 'vitest';
import { calculateOrderTotal, calculateCommissionBreakdown } from '../orderCalculations';

describe('Phần 2: Automation Tests - Kiểm thử logic Tính tiền & Hoa hồng (OrderCalculations)', () => {
  describe('Tính toán tổng tiền đơn hàng (calculateOrderTotal)', () => {
    it('Tính đúng tổng tiền cho khách người lớn, trẻ em và trẻ nhỏ', () => {
      const result = calculateOrderTotal({
        adultCount: 2,
        childCount: 1,
        infantCount: 1,
        priceAdult: 10000000,
        priceChild: 7000000,
        priceInfant: 2000000
      });

      // 2 * 10M + 1 * 7M + 1 * 2M = 29M
      expect(result.seatsSubtotal).toBe(29000000);
      expect(result.finalTotalAmount).toBe(29000000);
      expect(result.vatAmount).toBe(0);
    });

    it('Cộng chính xác các khoản phụ thu phòng đơn và phụ thu khác', () => {
      const result = calculateOrderTotal({
        adultCount: 1,
        childCount: 0,
        priceAdult: 10000000,
        priceChild: 0,
        singleRoomCount: 1,
        singleRoomSurcharge: 2500000,
        surcharges: [
          { name: 'Nâng hạng ghế', amount: 1500000 },
          { name: 'Phí bảo hiểm VIP', amount: 500000 }
        ]
      });

      expect(result.seatsSubtotal).toBe(10000000);
      expect(result.singleRoomTotal).toBe(2500000);
      expect(result.surchargesTotal).toBe(4500000); // 2.5M + 1.5M + 0.5M
      expect(result.finalTotalAmount).toBe(14500000);
    });

    it('Bóc tách VAT 10% khi chọn Xuất VAT (giá đã bao gồm VAT)', () => {
      const result = calculateOrderTotal({
        adultCount: 1,
        childCount: 0,
        priceAdult: 11000000,
        priceChild: 0,
        discountAmount: 0,
        vatOption: 'Xuất VAT'
      });

      // Giá 11,000,000 đ đã bao gồm VAT:
      // Tổng thanh toán vẫn là 11,000,000 đ (không bị đội thêm tiền)
      expect(result.finalTotalAmount).toBe(11000000);
      // Tiền trước thuế = 11,000,000 / 1.1 = 10,000,000 đ
      expect(result.totalBeforeVat).toBe(10000000);
      // Tiền thuế VAT = 1,000,000 đ
      expect(result.vatAmount).toBe(1000000);
    });

    it('Bóc tách VAT khi có chiết khấu giảm giá', () => {
      const result = calculateOrderTotal({
        adultCount: 1,
        childCount: 0,
        priceAdult: 10000000,
        priceChild: 0,
        discountAmount: 1200000, // giảm 1.2M -> tổng còn 8.8M
        vatOption: 'Xuất VAT'
      });

      // Tổng tiền sau giảm = 8,800,000 đ
      expect(result.finalTotalAmount).toBe(8800000);
      // Tiền trước thuế = 8,800,000 / 1.1 = 8,000,000 đ
      expect(result.totalBeforeVat).toBe(8000000);
      // Tiền thuế VAT 10% = 800,000 đ
      expect(result.vatAmount).toBe(800000);
    });
  });

  describe('Tính toán hoa hồng CTV và Phí công ty (calculateCommissionBreakdown)', () => {
    it('Tính hoa hồng cơ bản theo số khách người lớn + trẻ em', () => {
      const result = calculateCommissionBreakdown({
        baseCommissionPerSeat: 500000,
        adultCount: 2,
        childCount: 1
      });

      expect(result.commissionPassengerCount).toBe(3);
      expect(result.baseTotalCommission).toBe(1500000);
      expect(result.netCommissionReceived).toBe(1500000);
    });

    it('Tính chuẩn tiền chênh lệch CTV và phí công ty thu 25%', () => {
      const result = calculateCommissionBreakdown({
        baseCommissionPerSeat: 500000,
        adultCount: 2,
        childCount: 0,
        priceMarkup: 2000000, // CTV bán chênh 2 triệu
        markupTaxPercent: 25 // Công ty thu 25%
      });

      // Hoa hồng gốc: 2 * 500k = 1,000,000
      expect(result.baseTotalCommission).toBe(1000000);
      // Phí công ty thu: 2M * 25% = 500,000
      expect(result.markupFeeAmount).toBe(500000);
      // Tiền chênh lệch thực nhận của CTV: 2M - 500k = 1,500,000
      expect(result.netMarkupReceived).toBe(1500000);
      // Tổng hoa hồng thực nhận = 1M (gốc) + 1.5M (chênh sau phí) = 2,500,000
      expect(result.netCommissionReceived).toBe(2500000);
    });

    it('Khấu trừ chính xác khi giảm giá cho khách', () => {
      const result = calculateCommissionBreakdown({
        baseCommissionPerSeat: 500000,
        adultCount: 2,
        childCount: 0,
        priceMarkup: 1000000,
        markupTaxPercent: 25,
        discountAmount: 400000 // Giảm giá 400k cho khách
      });

      // Base: 1M. Chênh lệch sau phí: 1M - 250k = 750k. Tổng trước giảm = 1.75M
      // Trừ 400k giảm giá = 1.35M
      expect(result.discountDeducted).toBe(400000);
      expect(result.netCommissionReceived).toBe(1350000);
    });
  });
});
