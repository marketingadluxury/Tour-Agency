import React, { useState, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import { 
  Calculator, 
  Receipt, 
  Percent, 
  DollarSign, 
  Calendar, 
  HelpCircle, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  Plane, 
  Building, 
  Users, 
  CreditCard, 
  Clock, 
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Info,
  Scale,
  RefreshCw,
  MapPin,
  Sparkles,
  Plus,
  Sliders
} from 'lucide-react';
import { CustomSelect } from '@/components/CustomSelect';
import { TaxMcpConfigModal } from '@/components/TaxMcpConfigModal';
import { cn } from '@/lib/utils';

// Helper format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN').format(Math.round(amount));
};

// Helper parse input currency
const parseCurrency = (str: string): number => {
  const cleaned = str.replace(/[^\d]/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
};

export default function TaxHandbook() {
  const [activeTab, setActiveTab] = useState<'calculators' | 'handbook' | 'calendar'>('calculators');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedArticleIds, setExpandedArticleIds] = useState<string[]>(['vat-tour']);

  // MCP Sync State
  const [isMcpConfigOpen, setIsMcpConfigOpen] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [lastCheckedTime, setLastCheckedTime] = useState<string>('Vừa xong');
  const [mcpStatus, setMcpStatus] = useState<{
    version: string;
    date: string;
    status: 'online' | 'cached' | 'error';
    message: string;
  }>({
    version: 'v2.2.0',
    date: '06/09/2026',
    status: 'online',
    message: 'Đã đồng bộ với MCP Server (thue-vietnam)'
  });

  const handleCheckMcpUpdate = async (isManual = true) => {
    setIsCheckingUpdate(true);
    try {
      const res = await fetch('/api/tax/check-mcp-update', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setMcpStatus({
          version: data.latestVersion || 'v2.2.0',
          date: data.updatedAt || '06/09/2026',
          status: data.serverStatus === 'online' ? 'online' : 'cached',
          message: data.message || 'Hệ thống đang sử dụng dữ liệu mới nhất từ MCP Server'
        });
        setLastCheckedTime(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
        if (isManual) {
          toast.success('Hệ thống đã đồng bộ thành công với máy chủ MCP! Dữ liệu luật thuế đang ở phiên bản mới nhất.');
        }
      } else {
        throw new Error(data.error || 'Lỗi kết nối MCP');
      }
    } catch (err: any) {
      setMcpStatus(prev => ({
        ...prev,
        status: 'cached',
        message: 'Đang dùng dữ liệu quy chuẩn đóng gói sẵn'
      }));
      if (isManual) {
        toast.success('Hệ thống đang sử dụng bộ quy chuẩn thuế đóng gói sẵn (v2.2.0) đảm bảo tính ổn định.');
      }
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  useEffect(() => {
    handleCheckMcpUpdate(false);
  }, []);

  // --- CALCULATOR 1: VAT TOUR DU LỊCH ---
  const [vatPriceInput, setVatPriceInput] = useState<string>('25,000,000');
  const [vatOutboundDeductionInput, setVatOutboundDeductionInput] = useState<string>('15,000,000');
  const [vatRate, setVatRate] = useState<number>(8); // 8% or 10% or 0%
  const [vatTourType, setVatTourType] = useState<'inbound_domestic' | 'outbound'>('outbound');
  const [vatCalcMode, setVatCalcMode] = useState<'gross_included' | 'net_excluded'>('gross_included');

  const vatPrice = parseCurrency(vatPriceInput);
  const vatOutboundDeduction = parseCurrency(vatOutboundDeductionInput);

  const vatResult = useMemo(() => {
    if (vatTourType === 'outbound') {
      // Tour Outbound: Giá tính thuế = Doanh thu trọn gói trừ (-) các chi phí thực tế phát sinh ở nước ngoài
      // Nếu giá đã bao gồm VAT:
      const taxableBaseBeforeTax = Math.max(0, vatPrice - vatOutboundDeduction);
      if (vatCalcMode === 'gross_included') {
        // Thuế GTGT = taxableBaseBeforeTax - (taxableBaseBeforeTax / (1 + vatRate / 100))
        const taxAmount = (taxableBaseBeforeTax * vatRate) / (100 + vatRate);
        const netPrice = vatPrice - taxAmount;
        return {
          totalPrice: vatPrice,
          netPrice: netPrice,
          taxableBase: taxableBaseBeforeTax - taxAmount,
          taxAmount: taxAmount,
          foreignCost: vatOutboundDeduction,
          effectiveRate: vatPrice > 0 ? (taxAmount / vatPrice) * 100 : 0
        };
      } else {
        // Giá chưa bao gồm VAT:
        const taxAmount = (taxableBaseBeforeTax * vatRate) / 100;
        return {
          totalPrice: vatPrice + taxAmount,
          netPrice: vatPrice,
          taxableBase: taxableBaseBeforeTax,
          taxAmount: taxAmount,
          foreignCost: vatOutboundDeduction,
          effectiveRate: (vatPrice + taxAmount) > 0 ? (taxAmount / (vatPrice + taxAmount)) * 100 : 0
        };
      }
    } else {
      // Tour Nội Địa / Inbound thông thường:
      if (vatCalcMode === 'gross_included') {
        const netPrice = (vatPrice * 100) / (100 + vatRate);
        const taxAmount = vatPrice - netPrice;
        return {
          totalPrice: vatPrice,
          netPrice: netPrice,
          taxableBase: netPrice,
          taxAmount: taxAmount,
          foreignCost: 0,
          effectiveRate: vatRate
        };
      } else {
        const taxAmount = (vatPrice * vatRate) / 100;
        return {
          totalPrice: vatPrice + taxAmount,
          netPrice: vatPrice,
          taxableBase: vatPrice,
          taxAmount: taxAmount,
          foreignCost: 0,
          effectiveRate: vatRate
        };
      }
    }
  }, [vatPrice, vatOutboundDeduction, vatRate, vatTourType, vatCalcMode]);

  // --- CALCULATOR 2: TNCN & HOA HỒNG CTV ---
  const [tncnMode, setTncnMode] = useState<'ctv' | 'salary'>('ctv');
  const [ctvCommissionInput, setCtvCommissionInput] = useState<string>('8,500,000');
  const [hasCommitment08, setHasCommitment08] = useState<boolean>(false);
  const [ctvThresholdOption, setCtvThresholdOption] = useState<'current_2m' | 'new_5m'>('current_2m');

  const ctvCommission = parseCurrency(ctvCommissionInput);

  const ctvResult = useMemo(() => {
    const threshold = ctvThresholdOption === 'current_2m' ? 2000000 : 5000000;
    if (ctvCommission < threshold || hasCommitment08) {
      return {
        grossCommission: ctvCommission,
        taxDeduction: 0,
        netPayment: ctvCommission,
        taxRate: 0,
        note: hasCommitment08 
          ? 'Áp dụng Cam kết mẫu 08/CK-TNCN: Tạm thời không khấu trừ 10% thuế TNCN'
          : `Khoản chi dưới ngưỡng ${formatCurrency(threshold)} đ/lần chi trả: Không bắt buộc khấu trừ thuế 10% tại nguồn.`
      };
    }
    const taxDeduction = ctvCommission * 0.1;
    return {
      grossCommission: ctvCommission,
      taxDeduction: taxDeduction,
      netPayment: ctvCommission - taxDeduction,
      taxRate: 10,
      note: 'Khấu trừ 10% tại nguồn trước khi chi trả. Doanh nghiệp xuất chứng từ khấu trừ thuế TNCN điện tử khi CTV yêu cầu.'
    };
  }, [ctvCommission, hasCommitment08, ctvThresholdOption]);

  // Salary Calculator
  const [salaryGrossInput, setSalaryGrossInput] = useState<string>('28,000,000');
  const [dependentsCount, setDependentsCount] = useState<number>(1);
  const [salaryTaxYear, setSalaryTaxYear] = useState<'2025' | '2026'>('2026');

  const salaryGross = parseCurrency(salaryGrossInput);

  const salaryResult = useMemo(() => {
    // BHXH 8%, BHYT 1.5%, BHTN 1% = 10.5%
    // Trần đóng BHXH 2025-2026
    const ceilingInsurance = salaryTaxYear === '2026' ? 50600000 : 46800000;
    const insuranceBase = Math.min(salaryGross, ceilingInsurance);
    const insuranceAmount = insuranceBase * 0.105;

    // Giảm trừ gia cảnh
    const personalRelief = salaryTaxYear === '2026' ? 15500000 : 11000000;
    const dependentRelief = salaryTaxYear === '2026' ? 6200000 : 4400000;
    const totalDependentRelief = dependentsCount * dependentRelief;
    const totalRelief = personalRelief + totalDependentRelief + insuranceAmount;

    const taxableIncome = Math.max(0, salaryGross - totalRelief);

    // Tính thuế lũy tiến
    let tax = 0;
    let brackets = [];

    if (salaryTaxYear === '2026') {
      // Biểu 5 bậc mới (Luật 109/2025):
      // Bậc 1: <= 10tr: 5%
      // Bậc 2: 10tr - 30tr: 10%
      // Bậc 3: 30tr - 60tr: 20%
      // Bậc 4: 60tr - 100tr: 30%
      // Bậc 5: > 100tr: 35%
      const b1 = Math.min(taxableIncome, 10000000);
      const b2 = Math.max(0, Math.min(taxableIncome - 10000000, 20000000));
      const b3 = Math.max(0, Math.min(taxableIncome - 30000000, 30000000));
      const b4 = Math.max(0, Math.min(taxableIncome - 60000000, 40000000));
      const b5 = Math.max(0, taxableIncome - 100000000);

      tax = b1 * 0.05 + b2 * 0.10 + b3 * 0.20 + b4 * 0.30 + b5 * 0.35;
      brackets = [
        { label: 'Bậc 1 (Đến 10 triệu - 5%)', amount: b1 * 0.05 },
        { label: 'Bậc 2 (10 - 30 triệu - 10%)', amount: b2 * 0.10 },
        { label: 'Bậc 3 (30 - 60 triệu - 20%)', amount: b3 * 0.20 },
        { label: 'Bậc 4 (60 - 100 triệu - 30%)', amount: b4 * 0.30 },
        { label: 'Bậc 5 (Trên 100 triệu - 35%)', amount: b5 * 0.35 },
      ].filter(b => b.amount > 0);
    } else {
      // Biểu 7 bậc cũ (2025):
      // Bậc 1: <= 5tr: 5%
      // Bậc 2: 5-10tr: 10%
      // Bậc 3: 10-18tr: 15%
      // Bậc 4: 18-32tr: 20%
      // Bậc 5: 32-52tr: 25%
      // Bậc 6: 52-80tr: 30%
      // Bậc 7: > 80tr: 35%
      const b1 = Math.min(taxableIncome, 5000000);
      const b2 = Math.max(0, Math.min(taxableIncome - 5000000, 5000000));
      const b3 = Math.max(0, Math.min(taxableIncome - 10000000, 8000000));
      const b4 = Math.max(0, Math.min(taxableIncome - 18000000, 14000000));
      const b5 = Math.max(0, Math.min(taxableIncome - 32000000, 20000000));
      const b6 = Math.max(0, Math.min(taxableIncome - 52000000, 28000000));
      const b7 = Math.max(0, taxableIncome - 80000000);

      tax = b1 * 0.05 + b2 * 0.10 + b3 * 0.15 + b4 * 0.20 + b5 * 0.25 + b6 * 0.30 + b7 * 0.35;
      brackets = [
        { label: 'Bậc 1 (Đến 5 triệu - 5%)', amount: b1 * 0.05 },
        { label: 'Bậc 2 (5 - 10 triệu - 10%)', amount: b2 * 0.10 },
        { label: 'Bậc 3 (10 - 18 triệu - 15%)', amount: b3 * 0.15 },
        { label: 'Bậc 4 (18 - 32 triệu - 20%)', amount: b4 * 0.20 },
        { label: 'Bậc 5 (32 - 52 triệu - 25%)', amount: b5 * 0.25 },
        { label: 'Bậc 6 (52 - 80 triệu - 30%)', amount: b6 * 0.30 },
        { label: 'Bậc 7 (Trên 80 triệu - 35%)', amount: b7 * 0.35 },
      ].filter(b => b.amount > 0);
    }

    const netSalary = salaryGross - insuranceAmount - tax;

    return {
      grossSalary: salaryGross,
      insuranceAmount,
      personalRelief,
      dependentRelief: totalDependentRelief,
      taxableIncome,
      taxAmount: tax,
      netSalary,
      brackets
    };
  }, [salaryGross, dependentsCount, salaryTaxYear]);

  // --- CALCULATOR 3: THUẾ NHÀ THẦU (META/GOOGLE ADS) ---
  const [fctExpenseInput, setFctExpenseInput] = useState<string>('20,000,000');
  const [fctType, setFctType] = useState<'meta_collected' | 'company_withheld'>('meta_collected');

  const fctExpense = parseCurrency(fctExpenseInput);

  const fctResult = useMemo(() => {
    if (fctType === 'meta_collected') {
      // Meta đã cộng trực tiếp 5% VAT trên receipt hóa đơn thẻ
      // Ví dụ: Ngân sách chạy 20.000.000đ, Meta trừ thêm 5% VAT = 1.000.000đ. Tổng trừ thẻ = 21.000.000đ
      // Toàn bộ 21.000.000đ này được tính là chi phí hợp lý được trừ TNDN nếu có sao kê thẻ công ty + receipt có mã số thuế
      const vatMeta = fctExpense * 0.05;
      const totalPaid = fctExpense + vatMeta;
      return {
        adsBudget: fctExpense,
        fctVat: vatMeta,
        fctCit: 0,
        totalPaid: totalPaid,
        deductibleExpense: totalPaid,
        explanation: 'Meta/Google đã đăng ký thuế tại Việt Nam và thu trực tiếp 5% thuế GTGT trên từng giao dịch. Doanh nghiệp không phải kê khai nộp thay, toàn bộ số tiền thanh toán (bao gồm 5% thuế Meta thu) được tính vào chi phí hợp lý được trừ khi có sao kê ngân hàng và receipt hợp lệ.'
      };
    } else {
      // Doanh nghiệp tự kê khai nộp thay nhà thầu (Tỷ lệ ngành dịch vụ: 5% GTGT + 5% TNDN)
      // Tính theo giá Net (Gross-up):
      const revenueTaxable = fctExpense / (1 - 0.05); // Gross-up doanh thu tính thuế TNDN
      const citAmount = revenueTaxable * 0.05;
      const vatAmount = revenueTaxable * 0.05;
      const totalTax = citAmount + vatAmount;
      return {
        adsBudget: fctExpense,
        fctVat: vatAmount,
        fctCit: citAmount,
        totalPaid: fctExpense + totalTax,
        deductibleExpense: fctExpense + totalTax,
        explanation: 'Doanh nghiệp nộp thay thuế nhà thầu mẫu 01/NTNN: 5% thuế GTGT + 5% thuế TNDN (tính trên doanh thu gross-up). Cả 2 khoản này đều được đưa vào chi phí hợp lệ hoặc khấu trừ thuế GTGT nếu có hợp đồng quy định rõ giá net.'
      };
    }
  }, [fctExpense, fctType]);

  // Handbook Articles Structured Data
  const handbookArticles = [
    {
      id: 'vat-tour',
      category: 'Thuế GTGT (VAT)',
      badge: 'Ưu đãi 8% đến hết 2026',
      title: 'Quy tắc tính thuế GTGT đối với Tour Du Lịch Lữ Hành & Thuế Suất 8%',
      summary: 'Áp dụng mức thuế suất ưu đãi 8% đến 31/12/2026. Hướng dẫn bóc tách doanh thu và chi phí phát sinh tại nước ngoài của tour Outbound.',
      sections: [
        {
          heading: '1. Thuế suất GTGT áp dụng cho Tour du lịch',
          badge: 'Nghị định 174/2025/NĐ-CP',
          highlight: {
            title: 'Mức thuế suất ưu đãi 8% được gia hạn áp dụng đến hết ngày 31/12/2026',
            description: 'Áp dụng cho các nhóm hàng hóa, dịch vụ thuộc ngành du lịch lữ hành, dịch vụ lưu trú khách sạn, nhà hàng ăn uống, dịch vụ vận chuyển hành khách nội địa.',
            type: 'success' as const
          },
          paragraphs: [
            'Theo Nghị định 174/2025/NĐ-CP, chính sách giảm 2% thuế suất thuế GTGT tiếp tục có hiệu lực đến hết năm 2026. Các dịch vụ khác ngoài danh mục ưu đãi vẫn áp dụng mức thuế suất phổ thông 10%.'
          ]
        },
        {
          heading: '2. Cách tính thuế GTGT tour Outbound (Đi nước ngoài)',
          badge: 'Khoản 16 Điều 7 Thông tư 219/2013/TT-BTC',
          formula: {
            label: 'Công thức xác định doanh thu tính thuế GTGT tour Outbound',
            items: [
              { label: 'Doanh thu chịu thuế GTGT', sign: '=' },
              { label: 'Tổng giá trọn gói thu của khách', sign: '-' },
              { label: 'Toàn bộ chi phí thực tế tại nước ngoài' }
            ],
            note: 'Giá tính thuế chỉ tính trên phần doanh thu công ty lữ hành được hưởng sau khi trừ toàn bộ các chi phí dịch vụ thực tế ở nước ngoài.'
          },
          bullets: [
            { text: 'Tiền vé máy bay quốc tế khứ hồi', subText: 'Vé máy bay chặng quốc tế từ Việt Nam đi nước ngoài và chiều về có cuống vé/e-ticket.' },
            { text: 'Tiền thuê khách sạn lưu trú', subText: 'Booking phòng khách sạn và hóa đơn/receipt từ nhà cung cấp nước ngoài.' },
            { text: 'Tiền ăn uống & vé tham quan', subText: 'Chi phí ẩm thực, nhà hàng và vé vào cổng các điểm danh lam thắng cảnh trong tour.' },
            { text: 'Tiền xe vận chuyển & bảo hiểm du lịch', subText: 'Xe đưa đón hành trình tại nước ngoài và bảo hiểm du lịch quốc tế cho đoàn.' },
            { text: 'Chi phí đối tác Land Tour nước ngoài', subText: 'Hợp đồng trọn gói và hóa đơn do đối tác công ty du lịch bản địa thực hiện.' }
          ],
          note: 'Doanh nghiệp bắt buộc lưu giữ hợp đồng với đối tác nước ngoài, hóa đơn/chứng từ hợp pháp và chứng từ thanh toán ngân hàng quốc tế để làm căn cứ khấu trừ hợp lệ khi quyết toán.'
        },
        {
          heading: '3. Quy định thanh toán không dùng tiền mặt (Ngưỡng 5 triệu đồng)',
          badge: 'Quy định quản lý thuế mới',
          highlight: {
            title: 'Hạ ngưỡng thanh toán bắt buộc không dùng tiền mặt từ 20 triệu xuống 5.000.000 đồng',
            description: 'Bắt buộc chuyển khoản qua ngân hàng từ tài khoản công ty đến tài khoản nhà cung cấp đối với tất cả hóa đơn từng lần từ 5.000.000 đồng trở lên.',
            type: 'warning' as const
          },
          paragraphs: [
            'Áp dụng đồng thời cho cả điều kiện khấu trừ thuế GTGT đầu vào và điều kiện tính chi phí hợp lý được trừ khi xác định thu nhập chịu thuế TNDN. Các hóa đơn từng lần từ 5.000.000 đồng trở lên nếu thanh toán bằng tiền mặt sẽ bị loại toàn bộ thuế GTGT và loại khỏi chi phí hợp lý.'
          ]
        }
      ]
    },
    {
      id: 'cit-expenses',
      category: 'Thuế TNDN',
      badge: 'Hồ sơ chi phí hợp lệ',
      title: 'Hồ Sơ Chứng Từ Chi Phí Hợp Lý Được Trừ Của Công Ty Du Lịch',
      summary: 'Quy chuẩn hồ sơ vé máy bay, phòng khách sạn, tiếp khách, thuê hướng dẫn viên freelance và hoa hồng chi trả đại lý.',
      sections: [
        {
          heading: '1. Thuế suất Thuế Thu Nhập Doanh Nghiệp (TNDN)',
          badge: 'Luật 67/2025/QH15 & NĐ 320/2025/NĐ-CP',
          bullets: [
            { text: 'Thuế suất ưu đãi 15%', subText: 'Áp dụng đối với doanh nghiệp có tổng doanh thu năm không quá 3 tỷ đồng.' },
            { text: 'Thuế suất ưu đãi 17%', subText: 'Áp dụng đối với doanh nghiệp có tổng doanh thu năm từ trên 3 tỷ đến 50 tỷ đồng.' },
            { text: 'Thuế suất phổ thông 20%', subText: 'Áp dụng cho doanh nghiệp có quy mô doanh thu trên 50 tỷ đồng/năm.' }
          ]
        },
        {
          heading: '2. Chứng từ vé máy bay hành khách đoàn',
          badge: 'Hồ sơ chi phí vé đoàn',
          bullets: [
            { text: 'Hóa đơn điện tử hoặc vé máy bay điện tử (e-ticket)', subText: 'Vé ghi đầy đủ mã đặt chỗ (PNR) và họ tên từng hành khách tham gia tour.' },
            { text: 'Danh sách hành khách đoàn đi tour', subText: 'Danh sách đóng dấu của công ty lữ hành khớp chính xác với vé máy bay đã xuất.' },
            { text: 'Chứng từ thanh toán không dùng tiền mặt', subText: 'Ủy nhiệm chi hoặc sao kê tài khoản công ty chuyển tiền cho hãng bay/đại lý vé F1.' },
            { text: 'Thẻ lên máy bay (Boarding pass)', subText: 'Thẻ lên máy bay hoặc biên bản xác nhận hoàn thành chuyến bay của hãng hàng không.' }
          ]
        },
        {
          heading: '3. Chi phí thuê Hướng dẫn viên (Tour Guide) và CTV bán tour',
          badge: 'Thông tư 111/2013/TT-BTC',
          bullets: [
            { text: 'Hợp đồng dịch vụ / Hợp đồng CTV', subText: 'Ghi rõ phạm vi công việc, thời gian thực hiện tour và định mức thù lao/hoa hồng.' },
            { text: 'Biên bản nghiệm thu / Báo cáo kết thúc đoàn', subText: 'Báo cáo quyết toán đoàn tour có xác nhận của HDV và bộ phận điều hành.' },
            { text: 'Chứng từ chi tiền chuyển khoản ngân hàng', subText: 'Sao kê giao dịch chuyển tiền trực tiếp vào tài khoản ngân hàng chính chủ của HDV/CTV.' },
            { text: 'Khấu trừ 10% thuế TNCN hoặc Cam kết 08', subText: 'Khấu trừ tại nguồn nếu từ 2 triệu/lần trở lên (hoặc lưu trữ Bản cam kết 08/CK-TNCN).' },
            { text: 'Cấp chứng từ khấu trừ thuế TNCN điện tử', subText: 'Xuất chứng từ điện tử cho HDV/CTV khi họ yêu cầu để phục vụ quyết toán thuế cuối năm.' }
          ]
        },
        {
          heading: '4. Chi phí tiếp khách, quà tặng khách hàng và công tác phí',
          badge: 'Chi phí tiếp khách & quà',
          bullets: [
            { text: 'Chi phí tiếp khách đối tác', subText: 'Hóa đơn GTGT hợp pháp, phiếu thanh toán kèm bảng kê chi tiết món ăn/đồ uống, giấy đề xuất tiếp khách hoặc kế hoạch làm việc.' },
            { text: 'Chi phí quà tặng tour cho khách hàng', subText: 'Doanh nghiệp phải lập hóa đơn GTGT đầu ra khi tặng quà cho khách hàng (dù giá trị 0 đồng) và hạch toán vào chi phí bán hàng hợp lý.' }
          ]
        }
      ]
    },
    {
      id: 'pit-ctv',
      category: 'Thuế TNCN',
      badge: 'Chính sách thuế TNCN',
      title: 'Chính Sách Khấu Trừ Thuế TNCN Đối Với Hoa Hồng Đại Lý & CTV Ngoài',
      summary: 'Quy định khấu trừ 10%, điều kiện áp dụng bản cam kết mẫu 08/CK-TNCN và mức giảm trừ gia cảnh mới.',
      sections: [
        {
          heading: '1. Khấu trừ 10% tại nguồn đối với thu nhập vãng lai',
          badge: 'Điều 25 Thông tư 111/2013/TT-BTC',
          highlight: {
            title: 'Khấu trừ 10% tại nguồn cho khoản chi trả từ 2.000.000 đ/lần',
            description: 'Áp dụng cho cá nhân không ký hợp đồng lao động hoặc ký hợp đồng dưới 03 tháng (CTV bán tour, HDV freelance).',
            type: 'purple' as const
          },
          paragraphs: [
            'Lộ trình mới từ 01/07/2026: Theo Nghị định 253/2026/NĐ-CP, ngưỡng bắt đầu khấu trừ thuế 10% đối với thu nhập vãng lai được điều chỉnh nâng lên từ 5.000.000 đồng/lần chi trả.'
          ]
        },
        {
          heading: '2. Bản cam kết mẫu 08/CK-TNCN (thay thế 02/CK-TNCN)',
          badge: 'Cam kết miễn khấu trừ',
          bullets: [
            { text: 'Duy nhất một nguồn thu nhập', subText: 'Cá nhân chỉ có duy nhất thu nhập thuộc đối tượng khấu trừ tại công ty trong năm.' },
            { text: 'Tổng thu nhập chưa đến ngưỡng nộp thuế', subText: 'Ước tính tổng thu nhập sau giảm trừ gia cảnh chưa đạt mức phải nộp thuế trong cả năm tài chính.' },
            { text: 'Đã có mã số thuế cá nhân', subText: 'Cá nhân bắt buộc phải đăng ký thuế và đã được cấp MST cá nhân tại thời điểm làm cam kết.' },
            { text: 'Trách nhiệm doanh nghiệp', subText: 'Lưu giữ bản cam kết 08 kèm bản sao CCCD để làm căn cứ miễn khấu trừ 10% và quyết toán thay.' }
          ]
        },
        {
          heading: '3. Mức giảm trừ gia cảnh mới (Áp dụng từ kỳ tính thuế 2026)',
          badge: 'Nghị quyết Ủy ban Thường vụ QH',
          bullets: [
            { text: 'Kỳ 2026 - Bản thân: 15.500.000 đ/tháng', subText: 'Mức giảm trừ cho bản thân người nộp thuế đạt 186.000.000 đ/năm (tăng thêm 4,5 triệu/tháng).' },
            { text: 'Kỳ 2026 - Người phụ thuộc: 6.200.000 đ/tháng', subText: 'Mức giảm trừ cho mỗi người phụ thuộc đạt 74.400.000 đ/năm (tăng thêm 1,8 triệu/tháng).' },
            { text: 'Kỳ 2025 (Mức hiện hành)', subText: 'Bản thân 11.000.000 đ/tháng (132 triệu/năm) và Người phụ thuộc 4.400.000 đ/tháng (52,8 triệu/năm).' }
          ]
        }
      ]
    },
    {
      id: 'fct-ads',
      category: 'Thuế Nhà Thầu',
      badge: 'Meta & Google Ads',
      title: 'Nghĩa Vụ Thuế Khi Chạy Quảng Cáo Facebook (Meta Ads) & Google Ads',
      summary: 'Cách xử lý hóa đơn receipt từ Meta, kê khai thuế nhà thầu và điều kiện để được trừ chi phí quảng cáo tour.',
      sections: [
        {
          heading: '1. Meta & Google đã đăng ký thuế trực tiếp tại Việt Nam',
          badge: 'Cổng thông tin NCC nước ngoài',
          highlight: {
            title: 'Meta và Google thu trực tiếp 5% thuế GTGT trên từng Receipt',
            description: 'Doanh nghiệp nhập MST công ty vào tài khoản Ads, Meta sẽ tự động tính và cộng 5% VAT vào thẻ. Doanh nghiệp không phải tự kê khai nộp thay.',
            type: 'info' as const
          },
          paragraphs: [
            'Toàn bộ số tiền thanh toán (bao gồm ngân sách chạy và 5% VAT Meta đã thu) được ghi nhận trọn vẹn vào chi phí hợp lý được trừ TNDN nếu có đầy đủ chứng từ hợp lệ.'
          ]
        },
        {
          heading: '2. 3 Điều kiện để chi phí quảng cáo được tính vào chi phí hợp lý TNDN',
          badge: 'Điều kiện chứng từ',
          bullets: [
            { text: '1. Tài khoản Ads khai báo đúng thông tin công ty', subText: 'Tài khoản quảng cáo phải ghi đúng Tên công ty, Địa chỉ và Mã số thuế của doanh nghiệp.' },
            { text: '2. Hóa đơn / Receipt tải từ Trình quản lý quảng cáo', subText: 'Tải hóa đơn (Receipt/Invoice) từng tháng có hiển thị đầy đủ thông tin MST và tên doanh nghiệp.' },
            { text: '3. Chứng từ thanh toán ngân hàng', subText: 'Thanh toán bằng thẻ công ty. Nếu dùng thẻ cá nhân nhân sự: Cần có quy chế tài chính ủy quyền chi hộ và chứng từ hoàn ứng qua ngân hàng.' }
          ]
        }
      ]
    }
  ];

  // Calendar Deadlines
  const taxDeadlines = [
    {
      date: 'Ngày 20 hàng tháng',
      title: 'Tờ khai thuế GTGT & TNCN (Kê khai theo tháng)',
      desc: 'Áp dụng cho doanh nghiệp có tổng doanh thu năm trước liền kề trên 50 tỷ đồng.',
      badge: 'Hàng tháng',
      badgeColor: 'bg-blue-100 text-blue-700'
    },
    {
      date: 'Ngày cuối cùng tháng đầu quý sau (30/04, 31/07, 31/10, 31/01)',
      title: 'Nộp tờ khai thuế GTGT & TNCN Quý',
      desc: 'Áp dụng cho doanh nghiệp kê khai theo quý (doanh thu năm trước từ 50 tỷ đồng trở xuống). Hạn nộp tờ khai và tiền thuế trùng nhau.',
      badge: 'Hàng quý',
      badgeColor: 'bg-emerald-100 text-emerald-700'
    },
    {
      date: 'Ngày 30 của tháng đầu quý sau (30/04, 30/07, 30/10, 30/01)',
      title: 'Tạm nộp thuế Thu nhập doanh nghiệp (TNDN) Quý',
      desc: 'Doanh nghiệp tự tính và tạm nộp tiền thuế TNDN phát sinh của quý. Tổng số thuế TNDN tạm nộp 4 quý phải đạt tối thiểu 80% số thuế TNDN phải nộp cả năm.',
      badge: 'TNDN Quý',
      badgeColor: 'bg-amber-100 text-amber-700'
    },
    {
      date: 'Ngày 31/03 năm sau',
      title: 'Hồ sơ Quyết toán Thuế TNDN & Thuế TNCN của Công ty',
      desc: 'Hạn chót nộp Báo cáo tài chính, Tờ khai quyết toán thuế TNDN (Mẫu 03/TNDN) và Tờ khai quyết toán thuế TNCN (Mẫu 05/QTT-TNCN) cho kỳ tính thuế năm trước.',
      badge: 'Quyết toán năm',
      badgeColor: 'bg-rose-100 text-rose-700'
    },
    {
      date: 'Ngày 30/04 năm sau',
      title: 'Quyết toán thuế TNCN trực tiếp của Cá nhân',
      desc: 'Dành cho cá nhân nhân viên, CTV có thu nhập từ 2 nơi trở lên tự đi quyết toán trực tiếp với cơ quan thuế.',
      badge: 'Cá nhân',
      badgeColor: 'bg-purple-100 text-purple-700'
    }
  ];

  // Handbook categories list
  const handbookCategories = [
    { id: 'all', label: 'Tất cả quy chuẩn', count: handbookArticles.length },
    { id: 'Thuế GTGT (VAT)', label: 'Thuế GTGT (VAT)', count: handbookArticles.filter(a => a.category === 'Thuế GTGT (VAT)').length },
    { id: 'Thuế TNDN', label: 'Thuế TNDN & Chi phí', count: handbookArticles.filter(a => a.category === 'Thuế TNDN').length },
    { id: 'Thuế TNCN', label: 'Thuế TNCN & CTV', count: handbookArticles.filter(a => a.category === 'Thuế TNCN').length },
    { id: 'Thuế Nhà Thầu', label: 'Thuế Nhà Thầu Ads', count: handbookArticles.filter(a => a.category === 'Thuế Nhà Thầu').length },
  ];

  // Accordion toggle helpers
  const toggleArticle = (id: string) => {
    setExpandedArticleIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleToggleAllArticles = () => {
    if (expandedArticleIds.length === handbookArticles.length) {
      setExpandedArticleIds([]);
    } else {
      setExpandedArticleIds(handbookArticles.map(a => a.id));
    }
  };

  // Filter articles based on search & category
  const filteredArticles = useMemo(() => {
    return handbookArticles.filter(art => {
      const matchCategory = selectedCategory === 'all' || art.category === selectedCategory;
      if (!matchCategory) return false;
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase().trim();
      return (
        art.title.toLowerCase().includes(query) ||
        art.category.toLowerCase().includes(query) ||
        art.summary.toLowerCase().includes(query) ||
        art.sections.some(s =>
          s.heading.toLowerCase().includes(query) ||
          (s.paragraphs && s.paragraphs.some(p => p.toLowerCase().includes(query))) ||
          (s.highlight && (s.highlight.title.toLowerCase().includes(query) || s.highlight.description.toLowerCase().includes(query))) ||
          (s.bullets && s.bullets.some(b => b.text.toLowerCase().includes(query) || (b.subText && b.subText.toLowerCase().includes(query))))
        )
      );
    });
  }, [searchQuery, selectedCategory, handbookArticles]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-950 text-white p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-blue-500/30 text-blue-200 text-xs font-bold rounded-full border border-blue-400/30 flex items-center gap-1.5 backdrop-blur-xs">
                <Scale className="w-3.5 h-3.5 text-blue-300" />
                <span>Quy chuẩn Thuế Du Lịch 2025 – 2026</span>
              </span>
              <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded-full border border-emerald-400/30">
                VAT 8% đến hết 2026
              </span>
              <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 text-xs font-bold rounded-full border border-amber-400/30">
                Thanh toán không tiền mặt ≥ 5 triệu
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Sổ Tay Thuế &amp; Công Cụ Tính Nhanh Kế Toán
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed font-medium">
              Hệ thống tra cứu quy chuẩn pháp lý thuế GTGT tour lữ hành, chi phí hợp lý TNDN, khấu trừ 10% hoa hồng CTV và công cụ bóc tách số liệu tự động dành cho nhân sự công ty.
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsMcpConfigOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-white/15 hover:bg-white/25 active:scale-95 text-white text-xs font-bold rounded-xl border border-white/20 transition-all cursor-pointer backdrop-blur-md shadow-sm"
                title="Cấu hình địa chỉ MCP Endpoint URL"
              >
                <Sliders className="w-3.5 h-3.5 text-blue-200" />
                <span>Cấu hình MCP</span>
              </button>

              <button
                type="button"
                onClick={() => handleCheckMcpUpdate(true)}
                disabled={isCheckingUpdate}
                className="flex items-center gap-2 px-3.5 py-2 bg-blue-500/30 hover:bg-blue-500/40 active:scale-95 text-white text-xs font-bold rounded-xl border border-blue-400/40 transition-all cursor-pointer backdrop-blur-md shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={cn("w-3.5 h-3.5 text-blue-200", isCheckingUpdate && "animate-spin")} />
                <span>{isCheckingUpdate ? "Đang đồng bộ..." : "Kiểm tra cập nhật MCP"}</span>
              </button>
            </div>

            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[11px] text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span>MCP Skill: <strong className="text-white font-semibold">{mcpStatus.version}</strong> ({mcpStatus.date})</span>
              <span className="text-slate-400">· {lastCheckedTime}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('calculators')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
            activeTab === 'calculators'
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          )}
        >
          <Calculator className="w-4 h-4" />
          <span>Bộ công cụ tính thuế nhanh</span>
        </button>

        <button
          onClick={() => setActiveTab('handbook')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
            activeTab === 'handbook'
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          )}
        >
          <FileText className="w-4 h-4" />
          <span>Cẩm nang quy chuẩn thuế du lịch</span>
        </button>

        <button
          onClick={() => setActiveTab('calendar')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
            activeTab === 'calendar'
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          )}
        >
          <Calendar className="w-4 h-4" />
          <span>Lịch nộp tờ khai &amp; nộp thuế</span>
        </button>
      </div>

      {/* TAB 1: CALCULATORS */}
      {activeTab === 'calculators' && (
        <div className="space-y-6">
          {/* CALCULATOR 1: VAT TOUR DU LỊCH */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  1. Tính Thuế GTGT (VAT) Tour Du Lịch Lữ Hành
                </h2>
                <p className="text-xs text-slate-500">
                  Hỗ trợ tính VAT cho tour Outbound (trừ chi phí nước ngoài) hoặc tour Nội địa / Inbound.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form Input */}
              <div className="lg:col-span-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Loại hình tour
                    </label>
                    <CustomSelect
                      value={vatTourType}
                      onChange={(val) => setVatTourType(val as any)}
                      options={[
                        { value: 'outbound', label: 'Tour Outbound (Đi nước ngoài)', icon: <Plane className="w-3.5 h-3.5 text-blue-500" /> },
                        { value: 'inbound_domestic', label: 'Tour Nội địa / Inbound', icon: <MapPin className="w-3.5 h-3.5 text-emerald-500" /> }
                      ]}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Kiểu giá nhập
                    </label>
                    <CustomSelect
                      value={vatCalcMode}
                      onChange={(val) => setVatCalcMode(val as any)}
                      options={[
                        { value: 'gross_included', label: 'Giá đã gồm VAT (Bóc tách)', icon: <Receipt className="w-3.5 h-3.5 text-indigo-500" /> },
                        { value: 'net_excluded', label: 'Giá chưa gồm VAT (Cộng thêm)', icon: <Plus className="w-3.5 h-3.5 text-slate-500" /> }
                      ]}
                      className="w-full"
                      align="right"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {vatCalcMode === 'gross_included' ? 'Tổng tiền thu của khách (Đã gồm VAT)' : 'Giá tour trước thuế (Chưa VAT)'} (VNĐ)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={vatPriceInput}
                      onChange={(e) => setVatPriceInput(formatCurrency(parseCurrency(e.target.value)))}
                      className="w-full h-10 text-xs font-bold px-3 py-2 pl-8 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-2xs text-slate-900 bg-white transition-all"
                      placeholder="0"
                    />
                    <DollarSign className="w-4 h-4 text-slate-400 absolute left-2.5 top-3" />
                  </div>
                </div>

                {vatTourType === 'outbound' && (
                  <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100 space-y-1.5">
                    <label className="block text-xs font-bold text-blue-900">
                      Chi phí thực tế phát sinh ở nước ngoài được trừ (VNĐ)
                    </label>
                    <p className="text-[11px] text-blue-700 leading-relaxed">
                      Bao gồm: vé máy bay quốc tế, khách sạn lưu trú, ăn uống, xe đưa đón và vé tham quan tại nước ngoài có chứng từ hợp pháp.
                    </p>
                    <div className="relative mt-2">
                      <input
                        type="text"
                        value={vatOutboundDeductionInput}
                        onChange={(e) => setVatOutboundDeductionInput(formatCurrency(parseCurrency(e.target.value)))}
                        className="w-full h-10 text-xs font-bold px-3 py-2 pl-8 border border-blue-200 rounded-xl bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-2xs text-slate-900 transition-all"
                        placeholder="0"
                      />
                      <Plane className="w-4 h-4 text-blue-500 absolute left-2.5 top-3" />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Thuế suất áp dụng
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { rate: 8, label: '8% (Ưu đãi du lịch)' },
                      { rate: 10, label: '10% (Phổ thông)' },
                      { rate: 0, label: '0% (Miễn thuế)' },
                    ].map((item) => (
                      <button
                        key={item.rate}
                        type="button"
                        onClick={() => setVatRate(item.rate)}
                        className={cn(
                          "h-10 px-2 text-xs font-bold rounded-xl border transition-all cursor-pointer text-center shadow-2xs",
                          vatRate === item.rate
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Result Summary */}
              <div className="lg:col-span-6 bg-slate-50 p-5 rounded-xl border border-slate-200 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Kết quả bóc tách hóa đơn VAT
                  </div>

                  <div className="space-y-2 text-xs divide-y divide-slate-200/60 font-medium">
                    <div className="flex justify-between items-center pt-1.5">
                      <span className="text-slate-600">Tổng tiền thanh toán của khách:</span>
                      <span className="text-slate-900 font-bold">{formatCurrency(vatResult.totalPrice)} đ</span>
                    </div>

                    {vatTourType === 'outbound' && (
                      <div className="flex justify-between items-center pt-1.5 text-blue-700">
                        <span>Chi phí nước ngoài được trừ:</span>
                        <span className="font-semibold">- {formatCurrency(vatResult.foreignCost)} đ</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-1.5">
                      <span className="text-slate-600">Doanh thu tính thuế GTGT ({vatRate}%):</span>
                      <span className="text-slate-900 font-bold">{formatCurrency(vatResult.taxableBase)} đ</span>
                    </div>

                    <div className="flex justify-between items-center pt-1.5 text-rose-600">
                      <span className="font-bold">Tiền thuế GTGT (VAT phải nộp):</span>
                      <span className="font-bold text-sm">{formatCurrency(vatResult.taxAmount)} đ</span>
                    </div>

                    <div className="flex justify-between items-center pt-1.5">
                      <span className="text-slate-600">Doanh thu thuần của tour (sau thuế):</span>
                      <span className="text-slate-900 font-semibold">{formatCurrency(vatResult.netPrice)} đ</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200">
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-[11px] text-emerald-800 leading-relaxed">
                    <div className="font-bold mb-0.5">📌 Lưu ý xuất hóa đơn:</div>
                    Trên hóa đơn điện tử, dòng tiền thuế ghi rõ: <span className="font-bold">{formatCurrency(vatResult.taxAmount)} đ</span>. 
                    {vatTourType === 'outbound' && ' Đính kèm bảng kê chi tiết các khoản chi phí vé máy bay và dịch vụ nước ngoài được trừ theo Điều 7 Thông tư 219.'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CALCULATOR 2: TNCN & HOA HỒNG CTV */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    2. Tính Thuế TNCN &amp; Hoa Hồng Chi Trả CTV
                  </h2>
                  <p className="text-xs text-slate-500">
                    Khấu trừ 10% tại nguồn cho CTV ngoài hoặc tính biểu thuế lũy tiến lương nhân sự.
                  </p>
                </div>
              </div>

              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setTncnMode('ctv')}
                  className={cn(
                    "px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer",
                    tncnMode === 'ctv' ? "bg-white text-purple-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  Hoa hồng CTV ngoài
                </button>
                <button
                  type="button"
                  onClick={() => setTncnMode('salary')}
                  className={cn(
                    "px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer",
                    tncnMode === 'salary' ? "bg-white text-purple-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  Lương nhân sự công ty
                </button>
              </div>
            </div>

            {tncnMode === 'ctv' ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-6 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tổng tiền hoa hồng chi trả CTV (VNĐ)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={ctvCommissionInput}
                        onChange={(e) => setCtvCommissionInput(formatCurrency(parseCurrency(e.target.value)))}
                        className="w-full h-10 text-xs font-bold px-3 py-2 pl-8 border border-slate-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 shadow-2xs text-slate-900 bg-white transition-all"
                        placeholder="0"
                      />
                      <DollarSign className="w-4 h-4 text-slate-400 absolute left-2.5 top-3" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Ngưỡng khấu trừ
                      </label>
                      <CustomSelect
                        value={ctvThresholdOption}
                        onChange={(val) => setCtvThresholdOption(val as any)}
                        options={[
                          { value: 'current_2m', label: 'Từ 2.000.000 đ / lần', icon: <DollarSign className="w-3.5 h-3.5 text-purple-500" /> },
                          { value: 'new_5m', label: 'Từ 5.000.000 đ / lần (từ 01/07/2026)', icon: <Sparkles className="w-3.5 h-3.5 text-amber-500" /> }
                        ]}
                        className="w-full"
                      />
                    </div>

                    <div className="flex flex-col justify-end">
                      <label className="h-10 flex items-center gap-2.5 px-3 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs">
                        <input
                          type="checkbox"
                          checked={hasCommitment08}
                          onChange={(e) => setHasCommitment08(e.target.checked)}
                          className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                        />
                        <span className="text-xs font-bold text-slate-700 select-none">Có Cam kết 08/CK-TNCN</span>
                      </label>
                    </div>
                  </div>

                  <div className="p-3.5 bg-purple-50/60 rounded-xl border border-purple-100 text-xs text-purple-900 leading-relaxed font-medium">
                    {ctvResult.note}
                  </div>
                </div>

                <div className="lg:col-span-6 bg-slate-50 p-5 rounded-xl border border-slate-200 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Bảng tính chi trả CTV
                    </div>

                    <div className="space-y-2 text-xs divide-y divide-slate-200/60 font-medium">
                      <div className="flex justify-between items-center pt-1.5">
                        <span className="text-slate-600">Hoa hồng phê duyệt (Gross):</span>
                        <span className="text-slate-900 font-bold">{formatCurrency(ctvResult.grossCommission)} đ</span>
                      </div>

                      <div className="flex justify-between items-center pt-1.5 text-rose-600">
                        <span className="font-bold">Thuế TNCN khấu trừ 10%:</span>
                        <span className="font-bold text-sm">- {formatCurrency(ctvResult.taxDeduction)} đ</span>
                      </div>

                      <div className="flex justify-between items-center pt-1.5 text-emerald-700 bg-emerald-50/70 p-2 rounded-lg">
                        <span className="font-bold">Thực chuyển khoản cho CTV:</span>
                        <span className="font-black text-base">{formatCurrency(ctvResult.netPayment)} đ</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] text-slate-500 leading-relaxed">
                    💡 Doanh nghiệp có trách nhiệm nộp khoản thuế 10% này vào ngân sách nhà nước theo tờ khai quý và cấp chứng từ khấu trừ thuế điện tử cho CTV khi có yêu cầu.
                  </div>
                </div>
              </div>
            ) : (
              /* Salary Calculator */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Kỳ tính thuế
                      </label>
                      <CustomSelect
                        value={salaryTaxYear}
                        onChange={(val) => setSalaryTaxYear(val as any)}
                        options={[
                          { value: '2026', label: 'Kỳ 2026 (Giảm trừ 15,5tr / 6,2tr)', icon: <Sparkles className="w-3.5 h-3.5 text-blue-500" /> },
                          { value: '2025', label: 'Kỳ 2025 (Giảm trừ 11tr / 4,4tr)', icon: <Calendar className="w-3.5 h-3.5 text-slate-500" /> }
                        ]}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Số người phụ thuộc
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={dependentsCount}
                        onChange={(e) => setDependentsCount(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full h-10 text-xs font-bold px-3 py-2 border border-slate-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 shadow-2xs text-slate-900 bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tổng thu nhập Gross (Lương + Phụ cấp + Thưởng) (VNĐ)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={salaryGrossInput}
                        onChange={(e) => setSalaryGrossInput(formatCurrency(parseCurrency(e.target.value)))}
                        className="w-full h-10 text-xs font-bold px-3 py-2 pl-8 border border-slate-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 shadow-2xs text-slate-900 bg-white transition-all"
                        placeholder="0"
                      />
                      <DollarSign className="w-4 h-4 text-slate-400 absolute left-2.5 top-3" />
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Trừ bảo hiểm bắt buộc (10.5%):</span>
                      <span className="font-bold text-slate-800">{formatCurrency(salaryResult.insuranceAmount)} đ</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Giảm trừ bản thân:</span>
                      <span className="font-bold text-slate-800">{formatCurrency(salaryResult.personalRelief)} đ</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Giảm trừ người phụ thuộc:</span>
                      <span className="font-bold text-slate-800">{formatCurrency(salaryResult.dependentRelief)} đ</span>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-6 bg-slate-50 p-5 rounded-xl border border-slate-200 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Bảng tổng hợp tiền lương Net &amp; Thuế
                    </div>

                    <div className="space-y-2 text-xs divide-y divide-slate-200/60 font-medium">
                      <div className="flex justify-between items-center pt-1.5">
                        <span className="text-slate-600">Thu nhập chịu thuế (sau giảm trừ):</span>
                        <span className="text-slate-900 font-bold">{formatCurrency(salaryResult.taxableIncome)} đ</span>
                      </div>

                      <div className="flex justify-between items-center pt-1.5 text-rose-600">
                        <span className="font-bold">Thuế TNCN phải nộp:</span>
                        <span className="font-bold text-sm">{formatCurrency(salaryResult.taxAmount)} đ</span>
                      </div>

                      <div className="flex justify-between items-center pt-1.5 text-emerald-700 bg-emerald-50/70 p-2 rounded-lg">
                        <span className="font-bold">Lương thực nhận (Net):</span>
                        <span className="font-black text-base">{formatCurrency(salaryResult.netSalary)} đ</span>
                      </div>
                    </div>

                    {salaryResult.brackets.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-slate-200 space-y-1">
                        <div className="text-[11px] font-bold text-slate-500 uppercase">Chi tiết theo từng bậc:</div>
                        {salaryResult.brackets.map((b, idx) => (
                          <div key={idx} className="flex justify-between text-[11px] text-slate-600">
                            <span>{b.label}:</span>
                            <span className="font-semibold">{formatCurrency(b.amount)} đ</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* CALCULATOR 3: THUẾ NHÀ THẦU ADS */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  3. Tính Thuế Nhà Thầu (FCT) Chạy Quảng Cáo Facebook &amp; Google
                </h2>
                <p className="text-xs text-slate-500">
                  Xác định chi phí hợp lý được trừ TNDN và nghĩa vụ thuế khi chi tiền quảng cáo tour.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hình thức thanh toán quảng cáo
                  </label>
                  <CustomSelect
                    value={fctType}
                    onChange={(val) => setFctType(val as any)}
                    options={[
                      { value: 'meta_collected', label: 'Meta / Google thu trực tiếp 5% thuế trên hóa đơn thẻ', icon: <CreditCard className="w-3.5 h-3.5 text-amber-500" /> },
                      { value: 'company_withheld', label: 'Doanh nghiệp tự kê khai nộp thay (5% GTGT + 5% TNDN)', icon: <Scale className="w-3.5 h-3.5 text-indigo-500" /> }
                    ]}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ngân sách chạy quảng cáo (VNĐ)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={fctExpenseInput}
                      onChange={(e) => setFctExpenseInput(formatCurrency(parseCurrency(e.target.value)))}
                      className="w-full h-10 text-xs font-bold px-3 py-2 pl-8 border border-slate-200 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-2xs text-slate-900 bg-white transition-all"
                      placeholder="0"
                    />
                    <DollarSign className="w-4 h-4 text-slate-400 absolute left-2.5 top-3" />
                  </div>
                </div>

                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100 text-xs text-amber-900 leading-relaxed font-medium">
                  {fctResult.explanation}
                </div>
              </div>

              <div className="lg:col-span-6 bg-slate-50 p-5 rounded-xl border border-slate-200 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Hạch toán chi phí hợp lệ
                  </div>

                  <div className="space-y-2 text-xs divide-y divide-slate-200/60 font-medium">
                    <div className="flex justify-between items-center pt-1.5">
                      <span className="text-slate-600">Ngân sách quảng cáo thực tế:</span>
                      <span className="text-slate-900 font-bold">{formatCurrency(fctResult.adsBudget)} đ</span>
                    </div>

                    <div className="flex justify-between items-center pt-1.5 text-amber-700">
                      <span>Thuế GTGT nhà thầu (5%):</span>
                      <span className="font-semibold">{formatCurrency(fctResult.fctVat)} đ</span>
                    </div>

                    {fctResult.fctCit > 0 && (
                      <div className="flex justify-between items-center pt-1.5 text-amber-700">
                        <span>Thuế TNDN nhà thầu (5%):</span>
                        <span className="font-semibold">{formatCurrency(fctResult.fctCit)} đ</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-1.5 text-emerald-700 bg-emerald-50/70 p-2 rounded-lg">
                      <span className="font-bold">Tổng chi phí được trừ khi tính thuế TNDN:</span>
                      <span className="font-black text-base">{formatCurrency(fctResult.deductibleExpense)} đ</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] text-slate-500 leading-relaxed">
                  📑 Điều kiện bắt buộc: Cần in Receipt từ Ads Manager có ghi MST công ty và kẹp cùng Sao kê ngân hàng thanh toán của công ty.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: HANDBOOK ARTICLES */}
      {activeTab === 'handbook' && (
        <div className="space-y-5">
          {/* Search Box & Quick Controls */}
          <div className="space-y-3">
            <div className="bg-white h-11 px-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm nhanh: vé máy bay, hóa đơn 5 triệu, 8%, hoa hồng, giảm trừ gia cảnh, Facebook ads..."
                className="w-full text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 px-2 py-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Xóa
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex flex-wrap items-center gap-1.5">
                {handbookCategories.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1.5",
                        isSelected
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
                      )}
                    >
                      <span>{cat.label}</span>
                      <span className={cn(
                        "px-1.5 py-0.2 rounded-full text-[10px] font-black",
                        isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                      )}>
                        {cat.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Toggle All Button */}
              <button
                type="button"
                onClick={handleToggleAllArticles}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
              >
                {expandedArticleIds.length === handbookArticles.length ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                    <span>Thu gọn tất cả</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                    <span>Mở tất cả ({handbookArticles.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Articles List */}
          <div className="space-y-4">
            {filteredArticles.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
                <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                <div className="text-sm font-bold text-slate-800">Không tìm thấy nội dung phù hợp</div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Không tìm thấy quy chuẩn thuế nào khớp với từ khóa "{searchQuery}". Bạn có thể thử từ khóa khác hoặc bấm nút "Tất cả quy chuẩn".
                </p>
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                  className="px-4 py-2 bg-blue-50 text-blue-600 font-bold text-xs rounded-xl border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  Xem tất cả quy chuẩn
                </button>
              </div>
            ) : (
              filteredArticles.map((article) => {
                const isExpanded = expandedArticleIds.includes(article.id);
                return (
                  <div
                    key={article.id}
                    className="bg-white rounded-2xl shadow-sm border border-slate-200/90 overflow-hidden transition-all duration-200"
                  >
                    {/* Accordion Header */}
                    <button
                      type="button"
                      onClick={() => toggleArticle(article.id)}
                      className="w-full text-left p-5 sm:p-6 hover:bg-slate-50/60 transition-colors cursor-pointer flex flex-col gap-2.5"
                    >
                      <div className="flex items-center justify-between gap-3 w-full">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-100">
                            {article.category}
                          </span>
                          <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 text-[11px] font-semibold rounded-lg border border-slate-200">
                            {article.badge}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-slate-400 font-bold text-xs shrink-0">
                          <span className="hidden sm:inline text-[11px] text-slate-400">
                            {isExpanded ? 'Thu gọn' : 'Xem chi tiết'}
                          </span>
                          <div className={cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center transition-transform duration-200",
                            isExpanded ? "rotate-180 bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500"
                          )}>
                            <ChevronDown className="w-4 h-4" />
                          </div>
                        </div>
                      </div>

                      <div>
                        <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                          {article.title}
                        </h2>
                        <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
                          {article.summary}
                        </p>
                      </div>
                    </button>

                    {/* Accordion Body */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 p-5 sm:p-6 bg-slate-50/40 space-y-4 animate-in fade-in duration-200">
                        {article.sections.map((sec, idx) => (
                          <div
                            key={idx}
                            className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs space-y-3.5"
                          >
                            {/* Section Header */}
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                              <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                                <span className="w-5 h-5 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-black shrink-0">
                                  {idx + 1}
                                </span>
                                <span>{sec.heading}</span>
                              </h3>
                              {sec.badge && (
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs flex items-center gap-1">
                                  <Scale className="w-3 h-3 text-blue-600" />
                                  <span>{sec.badge}</span>
                                </span>
                              )}
                            </div>

                            {/* Highlight Box if present */}
                            {sec.highlight && (
                              <div className={cn(
                                "p-3.5 rounded-xl border flex items-start gap-3",
                                sec.highlight.type === 'warning' ? "bg-amber-50/80 border-amber-200 text-amber-950" :
                                sec.highlight.type === 'success' ? "bg-emerald-50/80 border-emerald-200 text-emerald-950" :
                                sec.highlight.type === 'purple' ? "bg-purple-50/80 border-purple-200 text-purple-950" :
                                "bg-blue-50/80 border-blue-200 text-blue-950"
                              )}>
                                <div className="shrink-0 mt-0.5">
                                  {sec.highlight.type === 'warning' ? <AlertTriangle className="w-4 h-4 text-amber-600" /> :
                                   sec.highlight.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> :
                                   sec.highlight.type === 'purple' ? <Sparkles className="w-4 h-4 text-purple-600" /> :
                                   <Info className="w-4 h-4 text-blue-600" />}
                                </div>
                                <div className="space-y-0.5">
                                  <div className="text-xs font-bold">{sec.highlight.title}</div>
                                  <div className="text-xs leading-relaxed opacity-90 font-medium">
                                    {sec.highlight.description}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Formula Diagram if present */}
                            {sec.formula && (
                              <div className="p-3.5 bg-blue-50/40 rounded-xl border border-blue-100 shadow-2xs space-y-2">
                                <div className="text-[11px] font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                                  <Calculator className="w-3.5 h-3.5 text-blue-600" />
                                  <span>{sec.formula.label}</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-800 pt-1">
                                  {sec.formula.items.map((item, i) => (
                                    <React.Fragment key={i}>
                                      <div className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-900 shadow-2xs">
                                        {item.label}
                                      </div>
                                      {item.sign && (
                                        <span className="text-base font-black text-blue-600 px-1">
                                          {item.sign}
                                        </span>
                                      )}
                                    </React.Fragment>
                                  ))}
                                </div>
                                {sec.formula.note && (
                                  <div className="text-[11px] text-slate-500 font-medium pt-1 leading-relaxed">
                                    💡 {sec.formula.note}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Bullets List Cards if present */}
                            {sec.bullets && sec.bullets.length > 0 && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                                {sec.bullets.map((b, bIdx) => (
                                  <div
                                    key={bIdx}
                                    className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50/60 border border-slate-200/80 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition-colors"
                                  >
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                    <div className="space-y-0.5 min-w-0">
                                      <div className="text-xs font-bold text-slate-800 leading-snug">
                                        {b.text}
                                      </div>
                                      {b.subText && (
                                        <div className="text-[11px] text-slate-500 font-medium leading-relaxed">
                                          {b.subText}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Paragraphs text */}
                            {sec.paragraphs && sec.paragraphs.map((p, pIdx) => (
                              <p key={pIdx} className="text-xs text-slate-700 leading-relaxed font-medium">
                                {p}
                              </p>
                            ))}

                            {/* Note Box if present */}
                            {sec.note && (
                              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 leading-relaxed flex items-start gap-2 font-medium">
                                <span className="text-sm shrink-0">📌</span>
                                <div>{sec.note}</div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 3: TAX DEADLINES CALENDAR */}
      {activeTab === 'calendar' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Lịch Tuân Thủ Nộp Tờ Khai &amp; Nộp Thuế Năm 2025 – 2026
              </h2>
              <p className="text-xs text-slate-500">
                Nhắc nhở thời hạn nộp tờ khai và thuế hàng tháng, hàng quý và quyết toán năm cho kế toán.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {taxDeadlines.map((item, idx) => (
              <div key={idx} className="p-4 bg-slate-50 hover:bg-blue-50/40 rounded-xl border border-slate-200 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider", item.badgeColor)}>
                      {item.badge}
                    </span>
                    <span className="text-xs font-bold text-slate-900">{item.title}</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {item.desc}
                  </p>
                </div>

                <div className="sm:text-right shrink-0">
                  <div className="text-[11px] text-slate-400 font-medium">Hạn chót:</div>
                  <div className="text-xs font-bold text-rose-600">{item.date}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1 leading-relaxed">
            <div className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Chế tài xử phạt chậm nộp tờ khai và chậm nộp thuế:</span>
            </div>
            <div>
              - Tiền chậm nộp thuế: Tính 0,03%/ngày trên số tiền thuế chậm nộp.
            </div>
            <div>
              - Phạt nộp chậm tờ khai: Từ 2.000.000đ đến 25.000.000đ tùy theo số ngày quá hạn theo Nghị định 125/2020/NĐ-CP.
            </div>
          </div>
        </div>
      )}

      {/* Modal Cấu Hình MCP Server */}
      <TaxMcpConfigModal
        isOpen={isMcpConfigOpen}
        onClose={() => setIsMcpConfigOpen(false)}
        onSaved={() => handleCheckMcpUpdate(true)}
      />
    </div>
  );
}
