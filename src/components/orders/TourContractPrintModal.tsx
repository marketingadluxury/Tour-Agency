import React, { useState, useMemo, useEffect } from 'react';
import { 
  Printer, 
  X, 
  Settings2, 
  Plus, 
  Trash2, 
  Save, 
  RotateCcw, 
  Plane,
  FileCheck2,
  Cloud,
  Loader2,
  ExternalLink,
  Download,
  CheckCircle2,
  Clock,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { Order, Tour, Passenger } from '@/types';
import { numberToVietnameseWords } from '@/utils/numberToWords';
import { NumericFormatInput } from '@/components/common/NumericFormatInput';
import { useCRM } from '@/context/CRMContext';
import { safeFetchApi } from '@/lib/utils';
import { exportElementToPdfBlob, downloadPdfBlob } from '@/utils/pdfGenerator';
import { buildVietQrDirectUrl, fetchVietQrDataUrl, getBankBinFromName } from '@/utils/vietQrHelper';
import toast from 'react-hot-toast';

export interface TourContractCustomField {
  id: string;
  label: string;
  value: string;
}

export interface TourContractPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  tour?: Tour | null;
  passengers?: Passenger[];
  onContractSaved?: (url: string) => void;
}

function formatCurrency(amount?: number): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '0';
  return new Intl.NumberFormat('vi-VN').format(Math.round(amount));
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

const TEMPLATE_STORAGE_KEY = 'tour_crm_contract_official_template_v1';

// Cấu hình mặc định Bên A theo mẫu hợp đồng pháp lý lữ hành
const DEFAULT_PARTY_A = {
  companyName: 'CÔNG TY DU LỊCH [TÊN CÔNG TY]',
  representative: 'Ông/Bà [HỌ TÊN NGƯỜI ĐẠI DIỆN]',
  position: 'Giám Đốc',
  powerOfAttorney: '',
  address: '[Địa chỉ trụ sở công ty]',
  phone: '0900000000',
  taxCode: '0123456789',
  licenseLHQT: '[Số giấy phép LHQT do Tổng cục Du lịch cấp]',
  bankName: 'Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)',
  bankAccount: '',
  bankAccountHolder: 'CONG TY DU LICH TEN CONG TY',
  insuranceMaxAmount: '1.200.000.000',
  visaRejectFee: 5000000
};

export const TourContractPrintModal: React.FC<TourContractPrintModalProps> = ({
  isOpen,
  onClose,
  order,
  tour,
  passengers = [],
  onContractSaved
}) => {
  const { updateOrder } = useCRM();
  const [isSavingDrive, setIsSavingDrive] = useState(false);
  const [currentContractUrl, setCurrentContractUrl] = useState<string | undefined>(order?.contract_url);

  useEffect(() => {
    setCurrentContractUrl(order?.contract_url);
  }, [order?.contract_url, order?.id]);

  // Lọc hành khách thuộc đơn hàng
  const orderPassengers = useMemo(() => {
    if (!order?.id) return [];
    return passengers.filter(p => p.order_id === order.id);
  }, [passengers, order?.id]);

  const firstPassenger = orderPassengers[0];

  // Drawer toggles & tabs
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [activeDrawerTab, setActiveDrawerTab] = useState<'payment' | 'partyA' | 'partyB' | 'options' | 'custom'>('payment');

  // Load Bên A cấu hình lưu sẵn
  const initialPartyA = useMemo(() => {
    try {
      const saved = localStorage.getItem(TEMPLATE_STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_PARTY_A, ...JSON.parse(saved) };
      }
    } catch {
      // fallback
    }
    return DEFAULT_PARTY_A;
  }, []);

  // Thông tin tiêu đề & số HĐ
  const currentYear = new Date().getFullYear();
  const orderShortId = order?.id ? order.id.substring(0, 8).toUpperCase() : '';
  const destinationName = tour?.destination || 'QUỐC TẾ';
  const defaultContractTitle = `HỢP ĐỒNG DỊCH VỤ DU LỊCH ${destinationName.toUpperCase()}`;
  
  // Format số hợp đồng theo mẫu: _____/HDDV/2026 – [Mã Tour]
  const rawTourCode = tour?.code || 'TOUR';
  const tourCodeClean = rawTourCode.split('.')[0].replace(/\s+/g, '');
  const defaultContractNumber = `_____/HDDV/${currentYear} – ${tourCodeClean}`;

  const [contractTitle, setContractTitle] = useState(defaultContractTitle);
  const [contractNumber, setContractNumber] = useState(defaultContractNumber);
  
  // Ngày lập hợp đồng: "ngày 04 tháng 06 năm 2026"
  const createdDate = order?.created_at ? new Date(order.created_at) : new Date();
  const [signDay, setSignDay] = useState(String(createdDate.getDate()).padStart(2, '0'));
  const [signMonth, setSignMonth] = useState(String(createdDate.getMonth() + 1).padStart(2, '0'));
  const [signYear, setSignYear] = useState(String(createdDate.getFullYear()));

  // Bên A State (Bên cung cấp dịch vụ)
  const [partyACompanyName, setPartyACompanyName] = useState(initialPartyA.companyName);
  const [partyARepresentative, setPartyARepresentative] = useState(initialPartyA.representative);
  const [partyAPosition, setPartyAPosition] = useState(initialPartyA.position);
  const [partyAPowerOfAttorney, setPartyAPowerOfAttorney] = useState(initialPartyA.powerOfAttorney);
  const [partyAAddress, setPartyAAddress] = useState(initialPartyA.address);
  const [partyAPhone, setPartyAPhone] = useState(initialPartyA.phone);
  const [partyATaxCode, setPartyATaxCode] = useState(initialPartyA.taxCode);
  const [partyALicenseLHQT, setPartyALicenseLHQT] = useState(initialPartyA.licenseLHQT);
  const [partyABankName, setPartyABankName] = useState(initialPartyA.bankName);
  const [partyABankAccount, setPartyABankAccount] = useState(initialPartyA.bankAccount);
  const [partyABankAccountHolder, setPartyABankAccountHolder] = useState(initialPartyA.bankAccountHolder);
  const [insuranceMaxAmount, setInsuranceMaxAmount] = useState(initialPartyA.insuranceMaxAmount);
  const [visaRejectFee, setVisaRejectFee] = useState<number>(initialPartyA.visaRejectFee);

  // Bên B State (Bên sử dụng dịch vụ - Khách hàng)
  const [partyBName, setPartyBName] = useState(order?.customer_name || order?.booker_name || '');
  const [partyBAddress, setPartyBAddress] = useState(order?.vat_address || 'Thành phố Hồ Chí Minh');
  const [partyBPhone, setPartyBPhone] = useState(order?.customer_phone || order?.booker_phone || '');
  const [partyBIdNumber, setPartyBIdNumber] = useState(firstPassenger?.passport_number || '');

  // Điều 1: Tuyến tour & Khách
  const [tourRoute, setTourRoute] = useState(tour?.name || `${destinationName} trọn gói`);
  const [startDateStr, setStartDateStr] = useState(formatDate(tour?.start_date || order?.created_at));
  const [endDateStr, setEndDateStr] = useState(formatDate(tour?.end_date || order?.created_at));
  const [tourDurationStr, setTourDurationStr] = useState(tour?.duration || '5 ngày 4 đêm');
  
  const totalPassengerCount = useMemo(() => {
    if (order?.adult_count !== undefined) {
      return (order.adult_count || 0) + (order.child_count || 0) + (order.infant_count || 0);
    }
    return orderPassengers.length || 1;
  }, [order?.adult_count, order?.child_count, order?.infant_count, orderPassengers.length]);

  // Điều 2: Bảng giá trị hợp đồng
  const totalContractPrice = order?.total_price || 0;
  const adultCount = order?.adult_count ?? orderPassengers.length ?? 1;
  const childCount = order?.child_count ?? 0;
  const infantCount = order?.infant_count ?? 0;
  const adultPrice = tour?.price_adult ?? tour?.price ?? (totalContractPrice / Math.max(1, adultCount));
  const childPrice = tour?.price_child ?? Math.round(adultPrice * 0.85);
  const infantPrice = tour?.price_infant ?? Math.round(adultPrice * 0.3);
  const discountAmount = order?.discount_value || 0;
  const singleRoomSurcharge = (order?.single_room_count || 0) * (tour?.single_room_surcharge || 0);

  // Điều 3: Tiến độ thanh toán (2 đợt hoặc 3 đợt)
  const [paymentPlanType, setPaymentPlanType] = useState<'3_steps' | '2_steps'>('3_steps');
  
  // Mặc định phân bổ: Đợt 1 cọc ~10-20% hoặc 5 triệu/khách; Đợt 2 ~40-50%; Đợt 3 phần còn lại
  const defaultDepositStep1 = Math.min(totalContractPrice, Math.max(5000000, Math.round(totalContractPrice * 0.2)));
  const defaultDepositStep2 = paymentPlanType === '3_steps' 
    ? Math.max(0, Math.round((totalContractPrice - defaultDepositStep1) * 0.5))
    : 0;

  const [step1Amount, setStep1Amount] = useState<number>(order?.paid_amount || defaultDepositStep1);
  const [step2Amount, setStep2Amount] = useState<number>(defaultDepositStep2);
  const [step2DateNote, setStep2DateNote] = useState<string>('Trong khoảng ngày 05 đến 15 của tháng khởi hành hoặc khi nộp visa');
  const [step3DaysBefore, setStep3DaysBefore] = useState<number>(10);

  // Tự động tính số tiền đợt cuối
  const calculatedRemaining = useMemo(() => {
    if (paymentPlanType === '3_steps') {
      return Math.max(0, totalContractPrice - step1Amount - step2Amount);
    }
    return Math.max(0, totalContractPrice - step1Amount);
  }, [paymentPlanType, totalContractPrice, step1Amount, step2Amount]);

  // Điều 7: Tỷ lệ phạt hủy
  const [cancelRateImmediate] = useState<number>(30);
  const [cancelRate15Days] = useState<number>(50);
  const [cancelRate10Days] = useState<number>(85);
  const [cancelRate7Days] = useState<number>(100);

  // Tùy chọn in ấn
  const [includePassengerTable, setIncludePassengerTable] = useState<boolean>(true);
  const [includeVietQR, setIncludeVietQR] = useState<boolean>(true);
  const [includeAppendix, setIncludeAppendix] = useState<boolean>(false);

  // Điều khoản bổ sung tùy biến (Custom Fields)
  const [customFields, setCustomFields] = useState<TourContractCustomField[]>([]);

  // VietQR State & Helpers
  const [vietQrDataUrl, setVietQrDataUrl] = useState<string>('');
  const [isLoadingQr, setIsLoadingQr] = useState<boolean>(false);

  // Bank BIN cho ngân hàng Bên A
  const partyABankBin = useMemo(() => {
    return getBankBinFromName(partyABankName);
  }, [partyABankName]);

  // VietQR URL trực tiếp (SVG chuẩn CORS)
  const vietQrUrl = useMemo(() => {
    return buildVietQrDirectUrl({
      bankBin: partyABankBin,
      accountNo: partyABankAccount,
      accountName: partyABankAccountHolder,
      amount: 0, // Không điền sẵn số tiền theo yêu cầu
      memo: `HD ${tourCodeClean} ${partyBName.replace(/\s+/g, '')}`,
      template: 'compact2'
    });
  }, [partyABankBin, partyABankAccount, partyABankAccountHolder, tourCodeClean, partyBName]);

  // Tự động tải Base64 PNG Data URL cho mã QR để in ấn và xuất PDF sắc nét 100%
  useEffect(() => {
    if (!isOpen || !includeVietQR || !partyABankAccount) return;
    let isMounted = true;
    setIsLoadingQr(true);

    fetchVietQrDataUrl({
      bankBin: partyABankBin,
      accountNo: partyABankAccount,
      accountName: partyABankAccountHolder,
      amount: 0, // Không điền sẵn số tiền theo yêu cầu
      memo: `HD ${tourCodeClean} ${partyBName.replace(/\s+/g, '')}`,
      template: 'compact2'
    }).then(dataUrl => {
      if (isMounted && dataUrl) {
        setVietQrDataUrl(dataUrl);
      }
    }).catch(err => {
      console.warn('[TourContractPrintModal] Lỗi tải VietQR Data URL:', err);
    }).finally(() => {
      if (isMounted) setIsLoadingQr(false);
    });

    return () => {
      isMounted = false;
    };
  }, [
    isOpen,
    includeVietQR,
    partyABankBin,
    partyABankAccount,
    partyABankAccountHolder,
    tourCodeClean,
    partyBName
  ]);

  // Thêm custom field
  const handleAddCustomField = () => {
    setCustomFields(prev => [
      ...prev,
      { id: Date.now().toString(), label: `Thỏa thuận riêng ${prev.length + 1}`, value: '' }
    ]);
  };

  const handleUpdateCustomField = (id: string, key: 'label' | 'value', val: string) => {
    setCustomFields(prev => prev.map(f => f.id === id ? { ...f, [key]: val } : f));
  };

  const handleRemoveCustomField = (id: string) => {
    setCustomFields(prev => prev.filter(f => f.id !== id));
  };

  // Lưu Bên A làm mẫu mặc định
  const handleSavePartyATemplate = () => {
    const payload = {
      companyName: partyACompanyName,
      representative: partyARepresentative,
      position: partyAPosition,
      powerOfAttorney: partyAPowerOfAttorney,
      address: partyAAddress,
      phone: partyAPhone,
      taxCode: partyATaxCode,
      licenseLHQT: partyALicenseLHQT,
      bankName: partyABankName,
      bankAccount: partyABankAccount,
      bankAccountHolder: partyABankAccountHolder,
      insuranceMaxAmount,
      visaRejectFee
    };
    try {
      localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(payload));
      toast.success('Đã lưu cấu hình Bên A làm mẫu mặc định thành công!');
    } catch {
      toast.error('Không thể lưu vào bộ nhớ trình duyệt');
    }
  };

  // Khôi phục về mặc định gốc
  const handleResetToDefault = () => {
    setPartyACompanyName(DEFAULT_PARTY_A.companyName);
    setPartyARepresentative(DEFAULT_PARTY_A.representative);
    setPartyAPosition(DEFAULT_PARTY_A.position);
    setPartyAPowerOfAttorney(DEFAULT_PARTY_A.powerOfAttorney);
    setPartyAAddress(DEFAULT_PARTY_A.address);
    setPartyAPhone(DEFAULT_PARTY_A.phone);
    setPartyATaxCode(DEFAULT_PARTY_A.taxCode);
    setPartyALicenseLHQT(DEFAULT_PARTY_A.licenseLHQT);
    setPartyABankName(DEFAULT_PARTY_A.bankName);
    setPartyABankAccount(DEFAULT_PARTY_A.bankAccount);
    setPartyABankAccountHolder(DEFAULT_PARTY_A.bankAccountHolder);
    setInsuranceMaxAmount(DEFAULT_PARTY_A.insuranceMaxAmount);
    setVisaRejectFee(DEFAULT_PARTY_A.visaRejectFee);

    setContractTitle(defaultContractTitle);
    setContractNumber(defaultContractNumber);
    setTourRoute(tour?.name || `${destinationName} trọn gói`);
    toast.success('Đã khôi phục về mẫu hợp đồng mặc định');
  };

  // Hàm làm sạch tên file tiếng Việt chuẩn quy chuẩn hệ thống
  const cleanFileNamePart = (str?: string): string => {
    if (!str) return '';
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Bỏ dấu tiếng Việt
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .replace(/[^a-zA-Z0-9_-]/g, '') // Bỏ khoảng trắng & ký tự đặc biệt
      .trim();
  };

  // Tạo tài liệu HTML độc lập chuẩn khổ in A4 để lưu lên Google Drive
  const generateContractHtmlDocument = (): string => {
    const printElement = document.getElementById('official-tour-contract-print-area');
    if (!printElement) return '';

    const clonedElement = printElement.cloneNode(true) as HTMLElement;

    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${contractTitle} - ${orderShortId}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px 16px;
      background-color: #f8fafc;
      font-family: 'Times New Roman', Times, serif;
      color: #0f172a;
      display: flex;
      justify-content: center;
    }
    .contract-wrapper {
      width: 100%;
      max-width: 820px;
      background: #ffffff;
      padding: 48px 56px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      border-radius: 4px;
      font-size: 11pt;
      line-height: 1.45;
    }
    table {
      width: 100% !important;
      border-collapse: collapse !important;
      margin: 12px 0 !important;
    }
    th, td {
      border: 1px solid #1e293b !important;
      padding: 6px 10px !important;
      font-size: 10pt !important;
    }
    th {
      background-color: #f1f5f9 !important;
      font-weight: bold !important;
      text-align: center !important;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-bold { font-weight: bold; }
    .uppercase { text-transform: uppercase; }
    .avoid-break { page-break-inside: avoid; }
    .page-break { page-break-before: always; }
    @media print {
      body { background: #fff !important; padding: 0 !important; }
      .contract-wrapper { box-shadow: none !important; padding: 4mm 2mm !important; max-width: 100% !important; border: none !important; }
      @page { size: A4 portrait; margin: 15mm 12mm 15mm 15mm; }
    }
  </style>
</head>
<body>
  <div class="contract-wrapper">
    ${clonedElement.innerHTML}
  </div>
</body>
</html>`;
  };

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [showConfirmOverwrite, setShowConfirmOverwrite] = useState(false);

  // Đóng gói và lưu hợp đồng dưới định dạng PDF vào Google Drive trong thư mục đơn hàng (hỗ trợ ghi đè/xóa file cũ)
  const saveContractToGoogleDrive = async (silent = false, overwrite = false): Promise<string | null> => {
    if (!order) return null;
    if (currentContractUrl && !overwrite) {
      toast('Hợp đồng này đã được lưu trên Google Drive rồi! Bạn có thể chọn "Cập nhật lại HĐ mới".', { icon: 'ℹ️' });
      return currentContractUrl;
    }
    setIsSavingDrive(true);
    let toastId: string | undefined;
    if (!silent) {
      toastId = toast.loading(overwrite ? 'Đang tạo bản PDF mới và ghi đè lên Google Drive (xóa bản cũ)...' : 'Đang khởi tạo file PDF và lưu lên Google Drive...');
    }

    try {
      // Đảm bảo mã QR VietQR đã nạp thành Data URL trước khi kết xuất PDF
      if (includeVietQR && !vietQrDataUrl && partyABankAccount) {
        try {
          const freshQr = await fetchVietQrDataUrl({
            bankBin: partyABankBin,
            accountNo: partyABankAccount,
            accountName: partyABankAccountHolder,
            amount: 0,
            memo: `HD ${tourCodeClean} ${partyBName.replace(/\s+/g, '')}`,
            template: 'compact2'
          });
          if (freshQr) {
            setVietQrDataUrl(freshQr);
            await new Promise(r => setTimeout(r, 100));
          }
        } catch (e) {
          console.warn('[saveContractToGoogleDrive] Không thể nạp trước QR:', e);
        }
      }

      const printElement = document.getElementById('official-tour-contract-print-area');
      if (!printElement) {
        throw new Error('Chưa thể lấy nội dung hợp đồng để lưu');
      }

      const maTour = cleanFileNamePart(tour?.code) || 'TOUR';
      const tenKhach = cleanFileNamePart(partyBName) || cleanFileNamePart(order.booker_name) || cleanFileNamePart(order.customer_name) || 'KhachHang';
      const maDon = `DH-${orderShortId}`;
      const fileName = `HopDong_${maTour}_${tenKhach}_${maDon}.pdf`;

      // Tạo file PDF A4 thực thụ từ phần tử hợp đồng
      const pdfBlob = await exportElementToPdfBlob(printElement, { filename: fileName });
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('orderCode', order.id);
      if (tour?.code) {
        formData.append('tourCode', tour.code);
      }
      formData.append('customFileName', fileName);
      formData.append('isContract', 'true');
      formData.append('uploadType', 'contract');

      // Nếu có yêu cầu ghi đè và đã có hợp đồng cũ, gửi URL cũ để backend xóa file cũ trên Google Drive
      if (overwrite && currentContractUrl) {
        formData.append('oldContractUrl', currentContractUrl);
      }

      const resData = await safeFetchApi('/api/upload-contract', {
        method: 'POST',
        body: formData,
      });

      if (resData?.url) {
        setCurrentContractUrl(resData.url);
        await updateOrder(order.id, { contract_url: resData.url });
        if (onContractSaved) {
          onContractSaved(resData.url);
        }
        if (!silent && toastId) {
          toast.success(overwrite ? `Đã cập nhật hợp đồng mới và thay thế bản cũ thành công!` : `Đã lưu hợp đồng PDF lên Google Drive: ${fileName}`, { id: toastId });
        } else if (silent) {
          toast.success(`Đã lưu hợp đồng PDF lên Google Drive`, { duration: 3000 });
        }
        return resData.url;
      }
      throw new Error('Máy chủ không trả về liên kết xem file');
    } catch (err: any) {
      console.error('[Save Contract To Drive Error]:', err);
      if (!silent && toastId) {
        toast.error(err?.message || 'Không thể lưu hợp đồng PDF lên Google Drive', { id: toastId });
      }
      return null;
    } finally {
      setIsSavingDrive(false);
    }
  };

  // Tải file PDF trực tiếp về máy tính
  const handleDownloadPdf = async () => {
    const printElement = document.getElementById('official-tour-contract-print-area');
    if (!printElement) {
      toast.error('Chưa thể lấy nội dung hợp đồng để tải về');
      return;
    }
    const toastId = toast.loading('Đang khởi tạo file PDF hợp đồng chuẩn A4...');
    try {
      setIsDownloadingPdf(true);

      // Đảm bảo mã QR VietQR đã nạp thành Data URL trước khi kết xuất PDF
      if (includeVietQR && !vietQrDataUrl && partyABankAccount) {
        try {
          const freshQr = await fetchVietQrDataUrl({
            bankBin: partyABankBin,
            accountNo: partyABankAccount,
            accountName: partyABankAccountHolder,
            amount: 0,
            memo: `HD ${tourCodeClean} ${partyBName.replace(/\s+/g, '')}`,
            template: 'compact2'
          });
          if (freshQr) {
            setVietQrDataUrl(freshQr);
            await new Promise(r => setTimeout(r, 100));
          }
        } catch (e) {
          console.warn('[handleDownloadPdf] Không thể nạp trước QR:', e);
        }
      }

      const maTour = cleanFileNamePart(tour?.code) || 'TOUR';
      const tenKhach = cleanFileNamePart(partyBName) || cleanFileNamePart(order.booker_name) || cleanFileNamePart(order.customer_name) || 'KhachHang';
      const maDon = `DH-${orderShortId}`;
      const fileName = `HopDong_${maTour}_${tenKhach}_${maDon}.pdf`;

      const pdfBlob = await exportElementToPdfBlob(printElement, { filename: fileName });
      downloadPdfBlob(pdfBlob, fileName);
      toast.success(`Đã tải file PDF về máy: ${fileName}`, { id: toastId });
    } catch (err: any) {
      console.error('[Download PDF Error]:', err);
      toast.error(err?.message || 'Lỗi khi tạo file PDF', { id: toastId });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Quản lý dọn dẹp class in ấn khi đóng hộp thoại in
  useEffect(() => {
    const handleAfterPrint = () => {
      document.body.classList.remove('is-printing-contract');
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
      document.body.classList.remove('is-printing-contract');
    };
  }, []);

  // In hợp đồng ra máy in / trình duyệt (KHÔNG tự động upload lên Drive)
  const handlePrint = async () => {
    if (includeVietQR && !vietQrDataUrl && partyABankAccount) {
      try {
        const freshQr = await fetchVietQrDataUrl({
          bankBin: partyABankBin,
          accountNo: partyABankAccount,
          accountName: partyABankAccountHolder,
          amount: 0,
          memo: `HD ${tourCodeClean} ${partyBName.replace(/\s+/g, '')}`,
          template: 'compact2'
        });
        if (freshQr) {
          setVietQrDataUrl(freshQr);
          await new Promise(r => setTimeout(r, 100));
        }
      } catch (e) {
        console.warn('[handlePrint] Không thể nạp trước QR:', e);
      }
    }
    document.body.classList.add('is-printing-contract');
    setTimeout(() => {
      window.print();
    }, 100);
  };

  if (!isOpen || !order) return null;

  return (
    <div className="contract-modal-overlay fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex justify-center p-2 sm:p-4 print:p-0 print:m-0 print:bg-white print:static print:block print:w-full print:overflow-visible print:border-none print:shadow-none">
      {/* Main Container */}
      <div className="contract-modal-container relative bg-slate-100 rounded-2xl w-full max-w-5xl my-auto shadow-2xl flex flex-col border border-slate-300 overflow-hidden print:border-none print:shadow-none print:bg-white print:w-full print:max-w-none print:rounded-none print:static print:block print:m-0 print:p-0 print:overflow-visible">
        
        {/* Modal Top Bar (Screen only) */}
        <div className="px-4 py-3 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shadow-md shrink-0 no-print">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-sm sm:text-base tracking-wide">
                  Hợp Đồng Dịch Vụ Du Lịch
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Chuẩn A4 Đứng • 12 Điều Khoản
                </span>
                {/* Badge tình trạng lưu Google Drive */}
                {currentContractUrl ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Đã lưu Google Drive</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-2xs">
                    <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Chưa lưu Google Drive</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-300 truncate max-w-md sm:max-w-xl mt-0.5">
                Booking #{orderShortId} • {tour?.name || tour?.code || 'Tour du lịch'} • Khách: {partyBName}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 justify-end">
            {currentContractUrl && (
              <a
                href={currentContractUrl}
                target="_blank"
                rel="noreferrer"
                className="h-9 px-3 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap"
                title="Mở xem file PDF hợp đồng trực tiếp trên Google Drive"
              >
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                <span>Xem trên Drive</span>
              </a>
            )}

            <button
              type="button"
              disabled={isDownloadingPdf}
              onClick={handleDownloadPdf}
              className="h-9 px-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer border border-slate-700 whitespace-nowrap"
              title="Tải file PDF hợp đồng chuẩn A4 trực tiếp về máy"
            >
              {isDownloadingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang tải...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 shrink-0" />
                  <span>Tải PDF</span>
                </>
              )}
            </button>

            {/* Nút Lưu Google Drive / Cập Nhật Lại Bản HĐ Mới */}
            {currentContractUrl ? (
              <button
                type="button"
                disabled={isSavingDrive}
                onClick={() => setShowConfirmOverwrite(true)}
                className="h-9 px-3 bg-amber-600 hover:bg-amber-500 active:scale-95 disabled:opacity-60 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer border border-amber-500/40 whitespace-nowrap"
                title="Hợp đồng đã có trên Google Drive. Bấm để lưu lại bản hợp đồng mới (sẽ xóa bản cũ)"
              >
                {isSavingDrive ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang cập nhật...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-amber-100 shrink-0" />
                    <span>Cập nhật HĐ mới</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                disabled={isSavingDrive}
                onClick={() => saveContractToGoogleDrive(false, false)}
                className="h-9 px-3 bg-blue-600 hover:bg-blue-500 active:scale-95 disabled:opacity-60 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap"
                title="Lưu file PDF hợp đồng này vào đúng thư mục đơn hàng trên Google Drive"
              >
                {isSavingDrive ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Cloud className="w-3.5 h-3.5 shrink-0" />
                    <span>Lưu Drive</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowCustomizer(!showCustomizer)}
              className={`h-9 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border whitespace-nowrap ${
                showCustomizer 
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs' 
                  : 'bg-white/10 hover:bg-white/20 text-slate-200 border-white/10'
              }`}
              title="Mở bảng cấu hình tùy biến hợp đồng"
            >
              <Settings2 className="w-3.5 h-3.5 shrink-0" />
              <span>{showCustomizer ? 'Ẩn cài đặt' : 'Tùy biến HĐ'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="h-9 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5 shrink-0" />
              <span>In Hợp đồng / PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-lg bg-white/10 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="Đóng cửa sổ"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body: Left Preview, Right Drawer (Collapsible) */}
        <div className="contract-modal-body flex flex-1 overflow-hidden relative min-h-[600px] max-h-[85vh] print:max-h-none print:min-h-0 print:h-auto print:overflow-visible print:static print:block print:w-full print:m-0 print:p-0 print:border-none print:shadow-none">
          
          {/* A4 Paper Preview Area (A4 Vertical: 210mm x 297mm) */}
          <div className="contract-modal-scroll flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200/80 flex justify-center print:p-0 print:m-0 print:bg-white print:overflow-visible print:static print:block print:w-full">
            
            <div 
              id="official-tour-contract-print-area" 
              className="w-full max-w-[794px] bg-white shadow-xl rounded-sm p-8 sm:p-10 text-slate-900 border border-slate-300 print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none print:w-full print:block print:static"
              style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '11pt', lineHeight: 1.45, boxSizing: 'border-box' }}
            >
              
              {/* QUỐC HIỆU - TIÊU NGỮ */}
              <div className="text-center mb-5 avoid-break">
                <p className="font-bold tracking-wider text-[12pt] uppercase text-slate-950">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                <p className="font-bold text-[12pt] text-slate-950">Độc Lập – Tự Do – Hạnh Phúc</p>
                <p className="text-[11pt] mt-0.5 tracking-widest text-slate-700 font-serif">---o0o---</p>
              </div>

              {/* TÊN HỢP ĐỒNG & SỐ */}
              <div className="text-center mb-5 avoid-break">
                <h1 className="font-bold text-[15pt] uppercase tracking-wide leading-tight mb-1 text-slate-950">
                  {contractTitle}
                </h1>
                <p className="text-[11pt] font-semibold text-slate-800">
                  Số: <span className="font-mono tracking-tight">{contractNumber}</span>
                </p>
              </div>

              {/* NGÀY THÁNG LẬP HỢP ĐỒNG */}
              <div className="mb-4 text-[11pt]">
                <p>
                  Hôm nay ngày <span className="font-bold">{signDay}</span> tháng <span className="font-bold">{signMonth}</span> năm <span className="font-bold">{signYear}</span>, chúng tôi gồm:
                </p>
              </div>

              {/* ĐẠI DIỆN BÊN A (BÊN CUNG CẤP DỊCH VỤ) */}
              <div className="mb-5 space-y-1 text-[11pt] avoid-break">
                <h2 className="font-bold text-[11.5pt] uppercase text-slate-950 tracking-wide mb-1.5">
                  ĐẠI DIỆN BÊN A: (Bên cung cấp dịch vụ)
                </h2>

                <div className="grid grid-cols-[130px_12px_1fr] items-baseline">
                  <span className="font-medium">Đơn vị</span>
                  <span>:</span>
                  <span className="font-bold uppercase text-slate-950">{partyACompanyName}</span>
                </div>

                <div className="grid grid-cols-[130px_12px_1fr] items-baseline">
                  <span className="font-medium">Đại diện</span>
                  <span>:</span>
                  <span className="font-bold uppercase">{partyARepresentative}</span>
                </div>

                <div className="grid grid-cols-[130px_12px_1fr] items-baseline">
                  <span className="font-medium">Chức vụ</span>
                  <span>:</span>
                  <div className="space-y-0.5">
                    <span className="font-bold">{partyAPosition}</span>
                    {partyAPowerOfAttorney && (
                      <p className="italic text-[10.5pt] text-slate-700">{partyAPowerOfAttorney}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-[130px_12px_1fr] items-baseline">
                  <span className="font-medium">Địa chỉ</span>
                  <span>:</span>
                  <span>{partyAAddress}</span>
                </div>

                <div className="grid grid-cols-[130px_12px_1fr] items-baseline">
                  <span className="font-medium">Điện thoại</span>
                  <span>:</span>
                  <span className="font-mono">{partyAPhone}</span>
                </div>

                <div className="grid grid-cols-[130px_12px_1fr] items-baseline">
                  <span className="font-medium">Mã số thuế</span>
                  <span>:</span>
                  <span className="font-mono font-bold">{partyATaxCode}</span>
                </div>

                <div className="grid grid-cols-[130px_12px_1fr] items-baseline">
                  <span className="font-medium">Giấy phép LHQT</span>
                  <span>:</span>
                  <span>{partyALicenseLHQT}</span>
                </div>
              </div>

              {/* ĐẠI DIỆN BÊN B (BÊN SỬ DỤNG DỊCH VỤ - KHÁCH HÀNG) */}
              <div className="mb-5 space-y-1 text-[11pt] border-t border-dashed border-slate-300 pt-3 avoid-break">
                <h2 className="font-bold text-[11.5pt] uppercase text-slate-950 tracking-wide mb-1.5">
                  ĐẠI DIỆN BÊN B: (Bên sử dụng dịch vụ)
                </h2>

                <div className="grid grid-cols-[130px_12px_1fr] items-baseline">
                  <span className="font-medium">Đại diện</span>
                  <span>:</span>
                  <span className="font-bold uppercase text-slate-950">{partyBName || '....................................................................'}</span>
                </div>

                <div className="grid grid-cols-[130px_12px_1fr] items-baseline">
                  <span className="font-medium">Địa chỉ</span>
                  <span>:</span>
                  <span>{partyBAddress || '....................................................................'}</span>
                </div>

                <div className="grid grid-cols-[130px_12px_1fr] items-baseline">
                  <span className="font-medium">Điện thoại</span>
                  <span>:</span>
                  <span className="font-mono font-bold">{partyBPhone || '....................................................................'}</span>
                </div>

                <div className="grid grid-cols-[130px_12px_1fr] items-baseline">
                  <span className="font-medium">Số Passport/CCCD</span>
                  <span>:</span>
                  <span className="font-mono font-bold">{partyBIdNumber || '....................................................................'}</span>
                </div>
              </div>

              {/* LỜI MỞ ĐẦU THỎA THUẬN */}
              <div className="mb-4 text-[11pt] text-justify space-y-1">
                <p>Mỗi bên được gọi riêng là “Bên” và gọi chung là “Các Bên”.</p>
                <p>
                  Sau khi thỏa thuận, Các Bên thống nhất ký kết hợp đồng dịch vụ du lịch này (“Hợp đồng”) với các điều kiện và điều khoản sau đây:
                </p>
              </div>

              {/* ĐIỀU 1: NỘI DUNG HỢP ĐỒNG */}
              <div className="mb-5 space-y-1.5 text-[11pt] avoid-break">
                <h3 className="font-bold text-[11.5pt] uppercase text-slate-950">
                  ĐIỀU 1: NỘI DUNG HỢP ĐỒNG
                </h3>
                <div className="text-justify space-y-1 pl-1">
                  <p>
                    <strong>1.1.</strong> Bên B đồng ý chọn bên A là đơn vị cung cấp dịch vụ du lịch trọn gói tại {destinationName} tuyến <strong className="uppercase">{tourRoute}</strong> (đi và về bằng máy bay). Chương trình chi tiết đã được Các Bên thống nhất đính kèm Hợp đồng này.
                  </p>
                  <p>
                    <strong>1.2.</strong> Thời gian khởi hành: từ ngày <strong className="font-mono">{startDateStr}</strong> đến ngày <strong className="font-mono">{endDateStr}</strong> ({tourDurationStr}).
                  </p>
                  <p>
                    <strong>1.3.</strong> Số lượng khách dự kiến: <strong className="font-mono font-bold">{String(totalPassengerCount).padStart(2, '0')}</strong> Khách.
                  </p>
                </div>

                {/* Bảng Danh sách Hành khách */}
                {includePassengerTable && (
                  <div className="mt-2 overflow-hidden">
                    <table className="w-full border-collapse border border-slate-700 text-[10pt]">
                      <thead>
                        <tr className="bg-slate-100 font-bold text-center">
                          <th className="border border-slate-700 px-2.5 py-1 w-12">STT</th>
                          <th className="border border-slate-700 px-2.5 py-1 text-left">HỌ VÀ TÊN KHÁCH</th>
                          <th className="border border-slate-700 px-2.5 py-1 w-32 text-center">SỐ HỘ CHIẾU/CCCD</th>
                          <th className="border border-slate-700 px-2.5 py-1 w-24 text-center">NGÀY SINH</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orderPassengers.length > 0 ? (
                          orderPassengers.map((p, idx) => (
                            <tr key={p.id || idx}>
                              <td className="border border-slate-700 px-2 py-1.5 text-center font-mono leading-relaxed">{idx + 1}</td>
                              <td className="border border-slate-700 px-2.5 py-1.5 font-bold uppercase leading-relaxed">{p.full_name}</td>
                              <td className="border border-slate-700 px-2 py-1.5 text-center font-mono leading-relaxed">{p.passport_number || '---'}</td>
                              <td className="border border-slate-700 px-2 py-1.5 text-center font-mono leading-relaxed">{formatDate(p.dob || (p as any).birthday) || '---'}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td className="border border-slate-700 px-2 py-1.5 text-center font-mono leading-relaxed">1</td>
                            <td className="border border-slate-700 px-2.5 py-1.5 font-bold uppercase leading-relaxed">{partyBName}</td>
                            <td className="border border-slate-700 px-2 py-1.5 text-center font-mono leading-relaxed">{partyBIdNumber || '---'}</td>
                            <td className="border border-slate-700 px-2 py-1.5 text-center font-mono leading-relaxed">---</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ĐIỀU 2: GIÁ TRỊ HỢP ĐỒNG */}
              <div className="mb-5 space-y-1.5 text-[11pt] avoid-break">
                <h3 className="font-bold text-[11.5pt] uppercase text-slate-950">
                  ĐIỀU 2: GIÁ TRỊ HỢP ĐỒNG
                </h3>

                <div className="overflow-hidden mt-1">
                  <table className="w-full border-collapse border border-slate-700 text-[10pt]">
                    <thead>
                      <tr className="bg-slate-100 font-bold text-center">
                        <th className="border border-slate-700 px-2 py-1 text-left">Diễn giải</th>
                        <th className="border border-slate-700 px-2 py-1 w-20">Số lượng</th>
                        <th className="border border-slate-700 px-2 py-1 w-28 text-right">Đơn giá (VNĐ)</th>
                        <th className="border border-slate-700 px-2 py-1 w-32 text-right">Thành tiền (VNĐ)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-slate-700 px-2.5 py-2.5 font-medium leading-relaxed">Khách Người lớn</td>
                        <td className="border border-slate-700 px-2.5 py-2.5 text-center font-mono leading-relaxed">{String(adultCount).padStart(2, '0')}</td>
                        <td className="border border-slate-700 px-2.5 py-2.5 text-right font-mono leading-relaxed">{formatCurrency(adultPrice)}</td>
                        <td className="border border-slate-700 px-2.5 py-2.5 text-right font-mono font-bold leading-relaxed">{formatCurrency(adultCount * adultPrice)}</td>
                      </tr>

                      {childCount > 0 && (
                        <tr>
                          <td className="border border-slate-700 px-2.5 py-2.5 font-medium leading-relaxed">Khách Trẻ em (2 - 11 tuổi)</td>
                          <td className="border border-slate-700 px-2.5 py-2.5 text-center font-mono leading-relaxed">{String(childCount).padStart(2, '0')}</td>
                          <td className="border border-slate-700 px-2.5 py-2.5 text-right font-mono leading-relaxed">{formatCurrency(childPrice)}</td>
                          <td className="border border-slate-700 px-2.5 py-2.5 text-right font-mono font-bold leading-relaxed">{formatCurrency(childCount * childPrice)}</td>
                        </tr>
                      )}

                      {infantCount > 0 && (
                        <tr>
                          <td className="border border-slate-700 px-2.5 py-2.5 font-medium leading-relaxed">Khách Em bé (&lt; 2 tuổi)</td>
                          <td className="border border-slate-700 px-2.5 py-2.5 text-center font-mono leading-relaxed">{String(infantCount).padStart(2, '0')}</td>
                          <td className="border border-slate-700 px-2.5 py-2.5 text-right font-mono leading-relaxed">{formatCurrency(infantPrice)}</td>
                          <td className="border border-slate-700 px-2.5 py-2.5 text-right font-mono font-bold leading-relaxed">{formatCurrency(infantCount * infantPrice)}</td>
                        </tr>
                      )}

                      {singleRoomSurcharge > 0 && (
                        <tr>
                          <td className="border border-slate-700 px-2.5 py-2.5 font-medium leading-relaxed">Phụ thu phòng đơn</td>
                          <td className="border border-slate-700 px-2.5 py-2.5 text-center font-mono leading-relaxed">{String(order.single_room_count || 1).padStart(2, '0')}</td>
                          <td className="border border-slate-700 px-2.5 py-2.5 text-right font-mono leading-relaxed">{formatCurrency(tour?.single_room_surcharge || 0)}</td>
                          <td className="border border-slate-700 px-2.5 py-2.5 text-right font-mono font-bold leading-relaxed">{formatCurrency(singleRoomSurcharge)}</td>
                        </tr>
                      )}

                      {discountAmount > 0 && (
                        <tr>
                          <td className="border border-slate-700 px-2.5 py-2.5 font-medium text-rose-800 leading-relaxed">Giảm giá / Ưu đãi</td>
                          <td className="border border-slate-700 px-2.5 py-2.5 text-center font-mono leading-relaxed">01</td>
                          <td className="border border-slate-700 px-2.5 py-2.5 text-right font-mono text-rose-800 leading-relaxed">-{formatCurrency(discountAmount)}</td>
                          <td className="border border-slate-700 px-2.5 py-2.5 text-right font-mono font-bold text-rose-800 leading-relaxed">-{formatCurrency(discountAmount)}</td>
                        </tr>
                      )}

                      <tr className="bg-slate-100 font-bold">
                        <td colSpan={3} className="border border-slate-700 px-2.5 py-2.5 text-right uppercase tracking-wide leading-relaxed">
                          Tổng giá trị hợp đồng
                        </td>
                        <td className="border border-slate-700 px-2.5 py-2.5 text-right font-mono text-[11pt] text-slate-950 leading-relaxed">
                          {formatCurrency(totalContractPrice)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p className="italic text-[10.5pt] text-slate-900 mt-1">
                  <strong>Bằng chữ:</strong> {numberToVietnameseWords(totalContractPrice)} chẵn./.
                </p>
              </div>

              {/* ĐIỀU 3: THỜI HẠN & PHƯƠNG THỨC THANH TOÁN */}
              <div className="mb-5 space-y-1.5 text-[11pt] avoid-break">
                <h3 className="font-bold text-[11.5pt] uppercase text-slate-950">
                  ĐIỀU 3: THỜI HẠN & PHƯƠNG THỨC THANH TOÁN
                </h3>
                <div className="text-justify space-y-1 pl-1">
                  <p><strong>3.1. Phương thức thanh toán:</strong> Chuyển khoản hoặc Tiền mặt.</p>
                  
                  <p>
                    <strong>3.2. Thời gian thanh toán:</strong> {paymentPlanType === '3_steps' ? 'chia làm 03 đợt:' : 'chia làm 02 đợt:'}
                  </p>

                  <div className="space-y-1 pl-3 border-l-2 border-slate-300 my-1.5">
                    <p>
                      <strong>• Đợt 1:</strong> Ngay sau khi ký hợp đồng, Bên B đặt cọc cho Bên A số tiền: <strong className="font-mono text-slate-950">{formatCurrency(step1Amount)} VNĐ</strong>
                      <br />
                      <span className="italic text-[10pt] text-slate-700">(Bằng chữ: {numberToVietnameseWords(step1Amount)} chẵn./.).</span>
                    </p>

                    {paymentPlanType === '3_steps' && (
                      <p>
                        <strong>• Đợt 2:</strong> {step2DateNote}, Bên B thanh toán cho Bên A số tiền: <strong className="font-mono text-slate-950">{formatCurrency(step2Amount)} VNĐ</strong>
                        <br />
                        <span className="italic text-[10pt] text-slate-700">(Bằng chữ: {numberToVietnameseWords(step2Amount)} chẵn./.).</span>
                      </p>
                    )}

                    <p>
                      <strong>• {paymentPlanType === '3_steps' ? 'Đợt 3:' : 'Đợt 2:'}</strong> Trước {step3DaysBefore} ngày khởi hành, Bên B thanh toán cho Bên A số tiền còn lại: <strong className="font-mono text-slate-950">{formatCurrency(calculatedRemaining)} VNĐ</strong>
                      <br />
                      <span className="italic text-[10pt] text-slate-700">(Bằng chữ: {numberToVietnameseWords(calculatedRemaining)} chẵn./.).</span>
                    </p>
                  </div>

                  <p><strong>3.3. Thông tin thanh toán:</strong></p>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_160px] gap-4 items-center bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-3.5 rounded-xl border border-slate-300/80 shadow-2xs text-[10.5pt]">
                    <div className="space-y-1.5">
                      <div className="grid grid-cols-[110px_10px_1fr] items-center">
                        <span className="font-semibold text-slate-700">Tên tài khoản</span>
                        <span className="text-slate-400">:</span>
                        <span className="font-bold uppercase text-slate-950">{partyABankAccountHolder}</span>
                      </div>
                      <div className="grid grid-cols-[110px_10px_1fr] items-center">
                        <span className="font-semibold text-slate-700">Số tài khoản</span>
                        <span className="text-slate-400">:</span>
                        <span className="font-bold font-mono text-[11.5pt] text-indigo-950 tracking-wider bg-indigo-50/50 px-2 py-0.5 rounded border border-indigo-100">{partyABankAccount}</span>
                      </div>
                      <div className="grid grid-cols-[110px_10px_1fr] items-center">
                        <span className="font-semibold text-slate-700">Ngân hàng</span>
                        <span className="text-slate-400">:</span>
                        <span className="text-slate-900 font-medium">{partyABankName}</span>
                      </div>
                    </div>

                    {includeVietQR && (
                      <div className="flex flex-col items-center justify-center p-2 bg-white rounded-xl border border-slate-200 shadow-xs">
                        {vietQrDataUrl ? (
                          <img 
                            src={vietQrDataUrl} 
                            alt="VietQR Chuyển khoản" 
                            className="w-24 h-24 object-contain block rounded"
                            style={{ width: '96px', height: '96px', maxWidth: '96px', maxHeight: '96px' }}
                            crossOrigin="anonymous"
                          />
                        ) : isLoadingQr ? (
                          <div className="w-24 h-24 flex flex-col items-center justify-center text-slate-400">
                            <Loader2 className="w-5 h-5 animate-spin text-indigo-600 mb-1" />
                            <span className="text-[8pt] font-sans">Đang tạo QR...</span>
                          </div>
                        ) : (
                          <img 
                            src={vietQrUrl} 
                            alt="VietQR Chuyển khoản" 
                            className="w-24 h-24 object-contain block rounded"
                            style={{ width: '96px', height: '96px', maxWidth: '96px', maxHeight: '96px' }}
                            crossOrigin="anonymous"
                          />
                        )}
                        <span className="text-[8pt] text-indigo-900 font-sans mt-1 font-bold whitespace-nowrap bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">Quét VietQR 24/7</span>
                      </div>
                    )}
                  </div>

                  <p className="text-justify pt-1">
                    <strong>3.4.</strong> Trong trường hợp, Bên B có nhu cầu phát sinh bên ngoài thoả thuận hợp đồng đã ký, thì Bên B phải chịu toàn bộ chi phí cho những phát sinh ngoài hợp đồng này với điều kiện Bên A có khả năng phục vụ được. Khoản chi phí phát sinh tăng này sẽ được thể hiện trong thanh lý hợp đồng và Bên B thực hiện thanh toán chi phí này trong vòng 03 (ba) ngày sau khi 2 bên ký kết thanh lý hợp đồng.
                  </p>
                </div>
              </div>

              {/* ĐIỀU 4: THỊ THỰC */}
              <div className="mb-5 space-y-1 text-[11pt] avoid-break">
                <h3 className="font-bold text-[11.5pt] uppercase text-slate-950">
                  ĐIỀU 4: THỊ THỰC
                </h3>
                <div className="text-justify space-y-1 pl-1">
                  <p>
                    <strong>4.1.</strong> Bên A hỗ trợ thủ tục xin visa du lịch cho khách hàng của Bên B nhưng không chịu trách nhiệm về việc khách hàng của Bên B bị phía Lãnh Sự Quán từ chối cấp visa;
                  </p>
                  <p>
                    <strong>4.2.</strong> Bên A không chịu trách nhiệm trong trường hợp khách hàng của Bên B (khách mang hộ chiếu ngoại giao, công vụ, hộ chiếu có visa các nước được miễn Visa du lịch, khách có thẻ APEC hay khách mang các quốc tịch được miễn visa nhập cảnh du lịch vào nước sở tại cùng đi trong đoàn và kể cả khách mang hộ chiếu phổ thông đã được LSQ cấp visa) bị các cơ quan hữu quan phía Việt Nam từ chối cho phép xuất cảnh hoặc phía LSQ/Hải quan nước sở tại từ chối cho phép nhập cảnh. Trong trường hợp này khách hàng của bên B sẽ phải trả phí hủy chuyến đi như Điều 7 Mục 7.2 bên dưới.
                  </p>
                </div>
              </div>

              {/* ĐIỀU 5: QUYỀN & TRÁCH NHIỆM CỦA BÊN A */}
              <div className="mb-5 space-y-1 text-[11pt] avoid-break">
                <h3 className="font-bold text-[11.5pt] uppercase text-slate-950">
                  ĐIỀU 5: QUYỀN & TRÁCH NHIỆM CỦA BÊN A
                </h3>
                <div className="text-justify space-y-1 pl-1">
                  <p><strong>5.1. Quyền của Bên A</strong></p>
                  <div className="space-y-0.5 pl-3 text-[10.5pt]">
                    <p><strong>5.1.1</strong> Quyền linh hoạt thay đổi chương trình hoặc dịch vụ mà không thông báo trước trong trường hợp việc thay đổi này nhằm đảm bảo sự an toàn và lợi ích tốt nhất cho Bên B và Bên A không có khả năng thông báo trước. Ngay sau khi thay đổi, Bên A sẽ thông báo cho Bên B biết về việc thay đổi và lý do của việc thay đổi.</p>
                    <p><strong>5.1.2</strong> Nếu bên A có những thay đổi về chương trình hoặc dịch vụ trước ngày khởi hành khác với thỏa thuận trong hợp đồng thì Bên A phải thông báo cho Bên B bằng văn bản, sau khi có sự đồng ý của Bên B bằng văn bản thì mới được tiến hành thay đổi.</p>
                    <p><strong>5.1.3</strong> Nếu Bên A có những thay đổi về chương trình hoặc dịch vụ trong quá trình Bên B đang tham gia hành trình tour mà khác với thỏa thuận trong hợp đồng thì người đại diện, chịu trách nhiệm của Bên A phải thông báo cho người đại diện, chịu trách nhiệm của Bên B, sau khi có sự đồng ý của bên B thì mới tiến hành thay đổi.</p>
                    <p><strong>5.1.4</strong> Quyền yêu cầu Bên B có sự hỗ trợ, phối hợp trong phạm vi thực hiện Hợp đồng khi phát sinh vấn đề chi phí liên quan.</p>
                    <p><strong>5.1.5</strong> Yêu cầu Bên B thanh toán đầy đủ theo thoả thuận Hợp đồng.</p>
                  </div>

                  <p className="pt-1"><strong>5.2. Trách nhiệm của Bên A</strong></p>
                  <div className="space-y-0.5 pl-3 text-[10.5pt]">
                    <p><strong>5.2.1</strong> Có trách nhiệm cung cấp dịch vụ đạt chất lượng, tương xứng với giá đã cam kết và theo đúng các điều khoản mà 2 bên đã thỏa thuận.</p>
                    <p><strong>5.2.2</strong> Bên A cử người làm người đại diện, chịu trách nhiệm thực hiện các dịch vụ đã thoả thuận với Bên B trong suốt chuyến đi.</p>
                    <p><strong>5.2.3</strong> Bên A có trách nhiệm cử đại diện để gặp gỡ và hướng dẫn các thủ tục, lễ nghi văn hóa cần thiết ở nơi đến tham quan, kể cả các hành vi vi phạm pháp luật cho nhân viên của Bên B.</p>
                    <p><strong>5.2.4</strong> Bên A không chịu trách nhiệm bồi hoàn và trách nhiệm pháp lý đối với những thiệt hại về vật chất lẫn tinh thần do việc chậm trễ giờ giấc của các phương tiện công cộng (như máy bay, xe lửa, tàu thuyền...) mà không thuộc quyền kiểm soát của Bên A hoặc do sự chậm trễ của chính hành khách gây ra.</p>
                    <p><strong>5.2.5</strong> Bên A không chịu bất cứ trách nhiệm gì đối với hành vi vi phạm của hành khách Bên B (nếu có) ở nơi đến tham quan.</p>
                    <p><strong>5.2.6</strong> Cung cấp hóa đơn tài chính hợp lệ cho Bên B sau khi kết thúc chuyến tham quan.</p>
                    <p><strong>5.2.7</strong> Bên A không chịu trách nhiệm sự thất lạc, hư hỏng hành lý hay bất kỳ vật dụng cá nhân nào khác của hành khách Bên B trong suốt quá trình thực hiện dịch vụ mà không do lỗi của Bên A.</p>
                    <p><strong>5.2.8</strong> Mua bảo hiểm du lịch cho các thành viên trong đoàn của bên B dựa trên danh sách đoàn khách do bên B cung cấp.</p>
                    <p><strong>5.2.9</strong> Bên A không có trách nhiệm hoàn trả các dịch vụ đã thanh toán nếu bên B không sử dụng hoặc tự ý bỏ.</p>
                    <p><strong>5.2.10</strong> Bên A có trách nhiệm hỗ trợ cho bên B trong việc triển khai xin visa.</p>
                  </div>
                </div>
              </div>

              {/* ĐIỀU 6: QUYỀN VÀ TRÁCH NHIỆM CỦA BÊN B */}
              <div className="mb-5 space-y-1 text-[11pt] avoid-break">
                <h3 className="font-bold text-[11.5pt] uppercase text-slate-950">
                  ĐIỀU 6: QUYỀN VÀ TRÁCH NHIỆM CỦA BÊN B
                </h3>
                <div className="text-justify space-y-1 pl-1">
                  <p><strong>6.1. Quyền của Bên B</strong></p>
                  <div className="space-y-0.5 pl-3 text-[10.5pt]">
                    <p><strong>6.1.1</strong> Được hưởng các dịch vụ và chương trình tham quan đúng chất lượng và đầy đủ như Các Bên đã thoả thuận trong Hợp đồng.</p>
                    <p><strong>6.1.2</strong> Có quyền được biết mọi thay đổi về chương trình, dịch vụ trong suốt chuyến đi (nếu có) từ Bên A ngay khi thay đổi đó xảy ra và trong trường hợp sự thay đổi đó ảnh hưởng đến lợi ích của mình, Bên B có quyền từ chối chi trả các chi phí phát sinh đó.</p>
                  </div>

                  <p className="pt-1"><strong>6.2. Trách nhiệm của Bên B</strong></p>
                  <div className="space-y-0.5 pl-3 text-[10.5pt]">
                    <p><strong>6.2.1</strong> Trong trường hợp số lượng khách tăng hơn số lượng đã đăng ký trước đó thì phải thông báo cho Bên A biết ít nhất 15 ngày trước ngày khởi hành. Tùy theo tình hình thực tế, Bên A sẽ xác nhận lại khả năng cung cấp thêm dịch vụ cho số khách tăng thêm này.</p>
                    <p><strong>6.2.2</strong> Bên B cử người đại diện của đoàn để phối hợp với trưởng đoàn của Bên A trong quá trình tham quan.</p>
                    <p><strong>6.2.3</strong> Cung cấp đầy đủ các thông tin, các loại giấy tờ cần thiết theo quy định để Bên A tiến hành xin visa cho các thành viên của Bên B. Đồng thời phối hợp để bổ sung thêm các loại giấy tờ (nếu Đại sứ quán yêu cầu bổ sung).</p>
                    <p><strong>6.2.4</strong> Trong thời gian tham quan, các thành viên trong đoàn của Bên B phải tuân thủ theo chương trình đã được hai bên thống nhất, đồng thời chấp hành đúng pháp luật của nước sở tại. Nếu có nhu cầu thay đổi phải thông báo và được sự đồng ý của trưởng đoàn và hướng dẫn viên Bên A.</p>
                    <p><strong>6.2.5</strong> Với mọi trường hợp bất kỳ lý do gì trong thời gian đi tham quan du lịch một hay nhiều thành viên của khách hàng Bên B tự ý cắt ngắn, bỏ tour, tách đoàn không thực hiện trọn vẹn hoặc từ chối tham quan, ăn uống theo đúng chương trình tour (chương trình chi tiết đính kèm), thì Bên B không có quyền khiếu nại, đòi bồi hoàn chi phí.</p>
                    <p><strong>6.2.6</strong> Trong thời gian tổ chức tham quan theo lịch trình, các thành viên của Bên B không được tự ý tách đoàn, nếu có yêu cầu thay đổi phải thông báo cho Trưởng đoàn của Bên A.</p>
                    <p><strong>6.2.7</strong> Thực hiện đúng việc thanh toán theo quy định tại Điều 3.</p>
                  </div>

                  <p className="pt-1 text-[10.5pt]">
                    <strong>6.3.</strong> Việc thay đổi, bổ sung hợp đồng chỉ có giá trị pháp lý khi được Các Bên lập thành văn bản phụ lục hợp đồng và cùng ký tên.
                  </p>
                </div>
              </div>

              {/* ĐIỀU 7: ĐIỀU KIỆN HOÀN/HỦY */}
              <div className="mb-5 space-y-1 text-[11pt] avoid-break">
                <h3 className="font-bold text-[11.5pt] uppercase text-slate-950">
                  ĐIỀU 7: ĐIỀU KIỆN HOÀN/HỦY
                </h3>
                <div className="text-justify space-y-1 pl-1">
                  <p>
                    <strong>7.1. Trường hợp khách hàng Bên B bị từ chối cấp thị thực:</strong> chi phí không hoàn lại là <strong className="font-mono">{formatCurrency(visaRejectFee)} VNĐ/khách</strong> bị từ chối cấp thị thực ({numberToVietnameseWords(visaRejectFee)} trên một khách bị từ chối cấp thị thực).
                  </p>
                  
                  <p>
                    <strong>7.2. Điều kiện hủy tour:</strong>
                    <br />
                    Nếu tính đến ngày khởi hành (không tính thứ 7, Chủ Nhật, ngày nghỉ theo qui định) mà có thành viên của Bên B không thể tham dự chuyến đi thì Bên B phải thông báo cho Bên A bằng văn bản, hoặc bằng email. Nếu hủy chuyến du lịch ngay sau khi Đại Sứ Quán, Lãnh Sự Quán đã cấp visa: Bên A có quyền hủy visa đã có, đồng thời Bên B sẽ phải chịu phí phải bồi thường như sau:
                  </p>

                  <ul className="space-y-0.5 pl-4 text-[10.5pt]">
                    <li>• Khách hủy bỏ tour ngay sau khi ký hợp đồng: Phí hủy tour tương đương <strong>{cancelRateImmediate}%</strong> tổng giá trị tour.</li>
                    <li>• Khách hủy tour trong vòng 15 ngày: Phí hủy tour tương đương <strong>{cancelRate15Days}%</strong> tổng giá trị tour.</li>
                    <li>• Khách hủy tour trong vòng 10 ngày: Phí hủy tour tương đương <strong>{cancelRate10Days}%</strong> tổng giá trị tour.</li>
                    <li>• Hủy tour trong vòng 7 ngày trước khởi hành hoặc hủy mà không thông báo thì sẽ chịu phí <strong>{cancelRate7Days}%</strong> giá trị tour.</li>
                  </ul>
                </div>
              </div>

              {/* ĐIỀU 8: BẤT KHẢ KHÁNG */}
              <div className="mb-5 space-y-1 text-[11pt] avoid-break">
                <h3 className="font-bold text-[11.5pt] uppercase text-slate-950">
                  ĐIỀU 8: BẤT KHẢ KHÁNG
                </h3>
                <div className="text-justify space-y-0.5 pl-1 text-[10.5pt]">
                  <p>
                    Trong trường hợp bất khả kháng do thời tiết, thiên tai, dịch hoạ, đình công, bạo động, phá hoại, chiến tranh, dịch bệnh, chuyến bay bị trì hoãn hay bị hủy do thời tiết hoặc do kỹ thuật, thị thực hay chính sách xuất nhập cảnh, thì Bên A được miễn trách nhiệm. Nếu vì lý do bất khả kháng mà chương trình không thể tiếp tục thực hiện được thì Các Bên cùng nhau bàn bạc và tìm ra phương án tối ưu để giải quyết nhằm giảm thiệt hại ở mức thấp nhất. Khi đó, Bên B sẽ thanh toán cho Bên A các chi phí liên quan đến chuyến đi của đoàn nhưng không thể thu hồi được, bao gồm:
                  </p>
                  <ul className="space-y-0.5 pl-4">
                    <li>- Các khoản chi phí thực tế mà Bên A đã chi trả liên quan đến việc chuẩn bị và tổ chức cho chuyến đi theo tinh thần của Hợp đồng này nhưng không thể thu hồi được; và</li>
                    <li>- Các khoản chi phí tương đương với giá trị các dịch vụ mà thành viên của Bên B đã sử dụng tính đến thời điểm Các Bên quyết định ngưng chuyến đi; và</li>
                    <li>- Các khoản chi phí tương đương với giá trị các dịch vụ mà thành viên của Bên B sẽ tiếp tục sử dụng từ lúc Các Bên quyết định ngưng chuyến đi đến khi đoàn trở về đến Việt nam, bao gồm cả chi phí vé máy bay lượt về.</li>
                  </ul>
                </div>
              </div>

              {/* ĐIỀU 9: BỒI THƯỜNG THIỆT HẠI & PHẠT VI PHẠM */}
              <div className="mb-5 space-y-1 text-[11pt] avoid-break">
                <h3 className="font-bold text-[11.5pt] uppercase text-slate-950">
                  ĐIỀU 9: BỒI THƯỜNG THIỆT HẠI & PHẠT VI PHẠM
                </h3>
                <div className="text-justify space-y-0.5 pl-1 text-[10.5pt]">
                  <p><strong>9.1.</strong> Trong trường hợp không thực hiện được một phần hoặc hủy toàn bộ chuyến đi do lỗi của Bên A (trừ trường hợp bất khả kháng), thì Bên A phải báo ngay cho Bên B ít nhất trước chuyến đi 07 ngày làm việc bằng văn bản. Bên A phải hoàn trả lại số tiền mà Bên B đã thanh toán (nếu có). Thời gian Bên A phải thực hiện nghĩa vụ hoàn trả lại tiền đã nhận nói trên không quá 07 ngày làm việc kể từ ngày thông báo bằng văn bản cho Bên B biết.</p>
                  <p><strong>9.2.</strong> Bên A có quyền không thực hiện hoặc tạm ngưng thực hiện Hợp đồng nếu Bên B không thanh toán hoặc thanh toán không đầy đủ giá trị Hợp đồng theo Mục 3.2 Điều 3 của Hợp đồng, mà không phải hoàn trả bất kỳ chi phí nào hay bồi thường cho Bên B. Ngoài ra, Bên B phải thanh toán cho Bên A các chi phí thực tế và các khoản thiệt hại phát sinh (nếu có) mà Bên A đã chi trả nhiều hơn số tiền Bên B đã thanh toán cho Bên A.</p>
                  <p><strong>9.3.</strong> Đối với trường hợp thanh toán khoản chi phí phát sinh theo Mục 3.4 Điều 3 tại hợp đồng này, nếu quá 15 (mười lăm) ngày làm việc kể từ ngày Bên B nhận được thanh lý hợp đồng mà Bên B chưa thanh toán cho Bên A, Bên B phải chịu thêm tiền lãi trên số tiền chậm thanh toán, tính theo lãi suất trả chậm của Vietcombank.</p>
                </div>
              </div>

              {/* ĐIỀU 10: LUẬT ĐIỀU CHỈNH VÀ GIẢI QUYẾT TRANH CHẤP */}
              <div className="mb-5 space-y-1 text-[11pt] avoid-break">
                <h3 className="font-bold text-[11.5pt] uppercase text-slate-950">
                  ĐIỀU 10: LUẬT ĐIỀU CHỈNH VÀ GIẢI QUYẾT TRANH CHẤP
                </h3>
                <div className="text-justify space-y-0.5 pl-1 text-[10.5pt]">
                  <p><strong>10.1.</strong> Hợp đồng này được giải thích và điều chỉnh theo luật pháp của Việt Nam.</p>
                  <p><strong>10.2.</strong> Mọi tranh chấp, tranh cãi hay bất đồng có thể phát sinh liên quan đến hợp đồng này (nếu có), trước hết phải được giải quyết bằng thương lượng và hoà giải trên cơ sở khắc phục những thiếu sót, thiệt hại trong thời hạn 30 ngày, kể từ ngày xảy ra tranh chấp. Trong trường hợp hết thời hạn này, Các Bên tranh chấp không thỏa thuận được với nhau thì vụ tranh chấp sẽ được đưa ra Toà kinh tế để giải quyết. Quyết định của Toà án là quyết định cuối cùng mà các Bên phải thực hiện. Mọi chi phí có liên quan đến việc giải quyết tranh chấp sẽ do bên có lỗi chịu.</p>
                </div>
              </div>

              {/* ĐIỀU 11: ĐIỀU KHOẢN BẢO HIỂM VÀ RỦI RO */}
              <div className="mb-5 space-y-1 text-[11pt] avoid-break">
                <h3 className="font-bold text-[11.5pt] uppercase text-slate-950">
                  ĐIỀU 11: ĐIỀU KHOẢN BẢO HIỂM VÀ RỦI RO
                </h3>
                <div className="text-justify space-y-0.5 pl-1 text-[10.5pt]">
                  <p><strong>11.1</strong> Bên A thực hiện mua bảo hiểm du lịch nước ngoài với mức bảo hiểm tối đa lên đến <strong className="font-mono">{insuranceMaxAmount} đồng/khách/vụ</strong> đối với các khách tham gia Chương trình du lịch này.</p>
                  <p><strong>11.2</strong> Trong trường hợp xảy ra các sự cố liên quan đến tai nạn, bệnh tật, mất mát tài sản, thất lạc giấy tờ du lịch, chuyến bay bị trì hoãn hoặc hủy chuyến, hoặc do tình hình an ninh, chính trị tại địa phương ảnh hưởng đến chương trình tham quan, thì công ty bảo hiểm có trách nhiệm bồi thường trực tiếp cho khách hàng Bên B theo Hợp đồng bảo hiểm.</p>
                  <ul className="space-y-0.5 pl-4">
                    <li>• Bên A có trách nhiệm phối hợp, đôn đốc công ty bảo hiểm thực hiện nghĩa vụ bồi thường theo đúng điều kiện và quy định trong Hợp đồng bảo hiểm.</li>
                    <li>• Bên A không chịu trách nhiệm đền bù cho khách hàng trong các trường hợp này.</li>
                  </ul>
                  <p><strong>11.3</strong> Trường hợp khách hàng tự ý tách đoàn hoặc tham gia các hoạt động cá nhân ngoài thời gian, chương trình chính thức, nếu xảy ra bất kỳ sự cố nào liên quan đến thiệt hại về tài sản, sức khỏe hoặc tính mạng, thì Bên A không chịu trách nhiệm. Trong trường hợp này, nếu có thiệt hại xảy ra, Bên B tự chịu trách nhiệm đối với toàn bộ tổn thất (ngoại trừ phần bồi thường được công ty bảo hiểm chi trả, nếu có).</p>
                </div>
              </div>

              {/* ĐIỀU KHOẢN BỔ SUNG NẾU CÓ CUSTOM FIELDS */}
              {customFields.length > 0 && (
                <div className="mb-5 space-y-1 text-[11pt] avoid-break">
                  <h3 className="font-bold text-[11.5pt] uppercase text-slate-950">
                    ĐIỀU KHOẢN BỔ SUNG RIÊNG BIỆT (THEO THỎA THUẬN)
                  </h3>
                  <div className="space-y-1 pl-1 text-[10.5pt]">
                    {customFields.map((f, i) => (
                      <p key={f.id} className="text-justify">
                        <strong>{i + 1}. {f.label}:</strong> {f.value || '....................................................................'}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* ĐIỀU 12: ĐIỀU KHOẢN CHUNG */}
              <div className="mb-6 space-y-1 text-[11pt] avoid-break">
                <h3 className="font-bold text-[11.5pt] uppercase text-slate-950">
                  ĐIỀU 12: ĐIỀU KHOẢN CHUNG
                </h3>
                <div className="text-justify space-y-0.5 pl-1 text-[10.5pt]">
                  <p><strong>12.1</strong> Các Bên cam kết thực hiện đúng và đầy đủ các điều khoản đã thoả thuận trong Hợp đồng.</p>
                  <p><strong>12.2</strong> Mọi sự thay đổi phải được lập thành văn bản do đại diện của các bên tham gia Hợp đồng ký tên.</p>
                  <p><strong>12.3</strong> Sau khi kết thúc chuyến đi, nếu không có bất kỳ phát sinh nào, hợp đồng này sẽ tự động thanh lý. Hai bên không còn ràng buộc trách nhiệm lẫn nhau.</p>
                  <p className="pt-1">
                    Hợp Đồng này có hiệu lực từ ngày ký và được lập thành <strong>03 (ba) bản</strong> có giá trị pháp lý như nhau. Bên A giữ 02 (hai) bản, Bên B giữ 01 (một) bản.
                  </p>
                </div>
              </div>

              {/* KHỐI KÝ TÊN 2 BÊN */}
              <div className="grid grid-cols-2 gap-8 text-center text-[11pt] pt-2 mb-8 avoid-break">
                <div>
                  <p className="font-bold text-[11.5pt] uppercase tracking-wide">ĐẠI DIỆN BÊN A</p>
                  <p className="italic text-[10pt] text-slate-600 mb-16">(Ký, đóng dấu và ghi rõ họ tên)</p>
                  <p className="font-bold text-[11.5pt] uppercase tracking-wide text-slate-950">{partyARepresentative}</p>
                  <p className="text-[10.5pt] font-medium text-slate-700">{partyAPosition}</p>
                </div>

                <div>
                  <p className="font-bold text-[11.5pt] uppercase tracking-wide">ĐẠI DIỆN BÊN B</p>
                  <p className="italic text-[10pt] text-slate-600 mb-16">(Ký và ghi rõ họ tên)</p>
                  <p className="font-bold text-[11.5pt] uppercase tracking-wide text-slate-950">{partyBName}</p>
                  <p className="text-[10.5pt] font-medium text-slate-700">Đại diện sử dụng dịch vụ</p>
                </div>
              </div>

              {/* PHỤ LỤC CHƯƠNG TRÌNH TOUR & LƯU Ý (NẾU ĐƯỢC CHỌN) */}
              {includeAppendix && (
                <div className="page-break pt-6 pb-6 border-t-2 border-slate-800">
                  <div className="text-center mb-5">
                    <p className="font-bold text-xs uppercase tracking-widest text-slate-500 mb-1">Phụ lục 1 đính kèm hợp đồng</p>
                    <h2 className="font-bold text-[14pt] uppercase tracking-wide text-indigo-950">
                      CHƯƠNG TRÌNH DU LỊCH CHI TIẾT & LƯU Ý ĐI TOUR
                    </h2>
                    <p className="font-bold text-[11.5pt] text-slate-800 mt-1 uppercase">
                      {tour?.name || tourRoute}
                    </p>
                    <p className="text-[10.5pt] text-slate-600 mt-0.5">
                      Thời lượng: {tourDurationStr} • Hãng hàng không: {tour?.airline || 'Tiêu chuẩn quốc tế'}
                    </p>
                  </div>

                  {/* Thông tin chuyến bay */}
                  {(tour?.flight_out || tour?.flight_in) && (
                    <div className="mb-4 bg-slate-50 p-3 rounded-lg border border-slate-300 text-[10.5pt] avoid-break">
                      <h4 className="font-bold uppercase text-[11pt] text-slate-900 mb-1.5 flex items-center gap-1.5">
                        <Plane className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
                        THÔNG TIN CHUYẾN BAY DỰ KIẾN
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {tour.flight_out && (
                          <div>
                            <span className="font-bold text-slate-700">Chuyến bay đi:</span>
                            <p className="font-mono text-slate-900">{tour.flight_out}</p>
                          </div>
                        )}
                        {tour.flight_in && (
                          <div>
                            <span className="font-bold text-slate-700">Chuyến bay về:</span>
                            <p className="font-mono text-slate-900">{tour.flight_in}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Nội dung lưu ý & điều kiện */}
                  <div className="space-y-3.5 text-[10.5pt] text-justify leading-relaxed">
                    <div className="border border-slate-300 p-3 rounded-lg avoid-break">
                      <h4 className="font-bold uppercase text-[11pt] text-slate-900 mb-1.5">
                        GIÁ TOUR BAO GỒM
                      </h4>
                      <ul className="space-y-0.5 list-disc pl-5 text-slate-800">
                        <li>Vé máy bay quốc tế khứ hồi theo đoàn kèm thuế phi trường và phụ thu hàng không.</li>
                        <li>Khách sạn tiêu chuẩn quốc tế 3-4 sao (2 khách/phòng, trường hợp nam/nữ lẻ ngủ phòng 3).</li>
                        <li>Các bữa ăn tiêu chuẩn theo thực đơn chương trình tour.</li>
                        <li>Xe du lịch máy lạnh đời mới vận chuyển theo hành trình.</li>
                        <li>Vé tham quan các thắng cảnh và điểm du lịch có trong chương trình.</li>
                        <li>Bảo hiểm du lịch quốc tế suốt tuyến theo quy định Hợp đồng.</li>
                        <li>Trưởng đoàn và Hướng dẫn viên du lịch chuyên nghiệp, tận tâm phục vụ đoàn suốt tuyến.</li>
                      </ul>
                    </div>

                    <div className="border border-slate-300 p-3 rounded-lg avoid-break">
                      <h4 className="font-bold uppercase text-[11pt] text-slate-900 mb-1.5">
                        GIÁ TOUR KHÔNG BAO GỒM
                      </h4>
                      <ul className="space-y-0.5 list-disc pl-5 text-slate-800">
                        <li>Chi phí phòng đơn (nếu khách có nhu cầu ngủ riêng 1 người 1 phòng).</li>
                        <li>Phí cấp thị thực nhập cảnh (Visa) vào nước sở tại.</li>
                        <li>Tiền bồi dưỡng (Tip) cho Hướng dẫn viên và Lái xe địa phương theo thông lệ quốc tế.</li>
                        <li>Hành lý quá cước, cước điện thoại, giặt ủi và các chi phí cá nhân ngoài chương trình.</li>
                        <li>Chi phí xét nghiệm, y tế cá nhân hoặc các phát sinh do chậm trễ cá nhân gây ra.</li>
                      </ul>
                    </div>

                    <div className="border border-slate-300 p-3 rounded-lg avoid-break">
                      <h4 className="font-bold uppercase text-[11pt] text-slate-900 mb-1.5">
                        QUY ĐỊNH HỒ SƠ VISA & THỦ TỤC XUẤT NHẬP CẢNH
                      </h4>
                      <p className="mb-1.5">
                        Để đảm bảo tiến độ cấp thị thực đúng hạn, Quý khách vui lòng cung cấp đầy đủ các giấy tờ sau tối thiểu 20 ngày trước khởi hành:
                      </p>
                      <ul className="space-y-0.5 list-disc pl-5 text-slate-800">
                        <li>Hộ chiếu gốc còn giá trị sử dụng trên 6 tháng tính đến ngày kết thúc chuyến đi.</li>
                        <li>Căn cước công dân gắn chip hoặc hộ chiếu còn hiệu lực (bản sao công chứng).</li>
                        <li>Giấy tờ chứng minh công việc (Hợp đồng lao động, Giấy phép ĐKKD, hoặc Quyết định hưu trí).</li>
                        <li>Giấy tờ chứng minh tài chính (Sổ tiết kiệm, sao kê tài khoản ngân hàng, giấy tờ nhà đất).</li>
                        <li>Ảnh thẻ chuẩn phông trắng quốc tế chụp trong vòng 6 tháng gần nhất.</li>
                      </ul>
                    </div>
                  </div>

                  <div className="mt-6 text-center text-[10pt] italic text-slate-500">
                    --- Phụ lục này là một bộ phận không tách rời của Hợp đồng dịch vụ du lịch ---
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Right Customization Drawer (Collapsible) */}
          {showCustomizer && (
            <div className="w-full sm:w-96 bg-white border-l border-slate-200 flex flex-col shrink-0 z-20 shadow-xl overflow-hidden animate-in slide-in-from-right duration-200 no-print">
              
              {/* Drawer Header */}
              <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-indigo-600" />
                  <span className="font-bold text-xs uppercase tracking-wide text-slate-800">Tùy biến Hợp Đồng</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCustomizer(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Tabs */}
              <div className="flex border-b border-slate-200 bg-slate-100 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveDrawerTab('payment')}
                  className={`flex-1 py-2 text-center transition-all cursor-pointer border-b-2 ${
                    activeDrawerTab === 'payment'
                      ? 'border-indigo-600 text-indigo-700 bg-white'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Thanh toán
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDrawerTab('partyA')}
                  className={`flex-1 py-2 text-center transition-all cursor-pointer border-b-2 ${
                    activeDrawerTab === 'partyA'
                      ? 'border-indigo-600 text-indigo-700 bg-white'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Bên A (ADL)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDrawerTab('partyB')}
                  className={`flex-1 py-2 text-center transition-all cursor-pointer border-b-2 ${
                    activeDrawerTab === 'partyB'
                      ? 'border-indigo-600 text-indigo-700 bg-white'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Bên B
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDrawerTab('options')}
                  className={`flex-1 py-2 text-center transition-all cursor-pointer border-b-2 ${
                    activeDrawerTab === 'options'
                      ? 'border-indigo-600 text-indigo-700 bg-white'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tùy chọn
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDrawerTab('custom')}
                  className={`flex-1 py-2 text-center transition-all cursor-pointer border-b-2 ${
                    activeDrawerTab === 'custom'
                      ? 'border-indigo-600 text-indigo-700 bg-white'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Thêm
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                
                {/* TAB 1: TIẾN ĐỘ THANH TOÁN (Có dấu phân cách hàng nghìn) */}
                {activeDrawerTab === 'payment' && (
                  <div className="space-y-3.5">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Chế độ phân bổ đợt thanh toán:</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setPaymentPlanType('3_steps')}
                          className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all ${
                            paymentPlanType === '3_steps'
                              ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-xs'
                              : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          3 Đợt (Mẫu thực tế)
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentPlanType('2_steps')}
                          className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all ${
                            paymentPlanType === '2_steps'
                              ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-xs'
                              : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          2 Đợt (Gọn)
                        </button>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                      <div>
                        <NumericFormatInput
                          label="Số tiền Đợt 1 (Đặt cọc ngay):"
                          value={step1Amount}
                          onChange={(val) => setStep1Amount(val === '' ? 0 : Number(val))}
                          suffix="VNĐ"
                          placeholder="Nhập số tiền cọc đợt 1..."
                          inputClassName="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500"
                          labelClassName="font-bold text-slate-700 block mb-1 text-xs"
                        />
                      </div>

                      {paymentPlanType === '3_steps' && (
                        <div className="space-y-2">
                          <NumericFormatInput
                            label="Số tiền Đợt 2:"
                            value={step2Amount}
                            onChange={(val) => setStep2Amount(val === '' ? 0 : Number(val))}
                            suffix="VNĐ"
                            placeholder="Nhập số tiền thanh toán đợt 2..."
                            inputClassName="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500"
                            labelClassName="font-bold text-slate-700 block mb-1 text-xs"
                          />
                          
                          <div>
                            <label className="font-bold text-slate-700 block mb-1 text-xs">Thời hạn Đợt 2:</label>
                            <input
                              type="text"
                              value={step2DateNote}
                              onChange={(e) => setStep2DateNote(e.target.value)}
                              placeholder="Ví dụ: Trong khoảng ngày 05 đến 06/06/2026..."
                              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs"
                            />
                          </div>
                        </div>
                      )}

                      <div className="pt-1">
                        <label className="font-bold text-slate-700 block mb-1 text-xs">Số tiền Đợt cuối (Tự động tính):</label>
                        <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-300 rounded-lg font-mono font-black text-emerald-900 text-xs flex items-center justify-between">
                          <span>{formatCurrency(calculatedRemaining)} VNĐ</span>
                          <span className="text-[10px] text-emerald-700 font-sans font-normal">(Phần còn lại)</span>
                        </div>

                        <label className="font-bold text-slate-700 block mt-2.5 mb-1 text-xs">Hạn thanh toán trước khởi hành (ngày):</label>
                        <input
                          type="number"
                          value={step3DaysBefore}
                          onChange={(e) => setStep3DaysBefore(Number(e.target.value) || 7)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-slate-900 text-xs"
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                      <NumericFormatInput
                        label="Phí không hoàn lại khi rớt Visa (Điều 7.1):"
                        value={visaRejectFee}
                        onChange={(val) => setVisaRejectFee(val === '' ? 0 : Number(val))}
                        suffix="VNĐ / khách"
                        placeholder="Mặc định 5.000.000 VNĐ..."
                        inputClassName="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg font-mono font-bold text-amber-950 text-xs focus:ring-2 focus:ring-amber-500"
                        labelClassName="font-bold text-amber-900 block mb-1 text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* TAB 2: THÔNG TIN BÊN A */}
                {activeDrawerTab === 'partyA' && (
                  <div className="space-y-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Tên công ty:</label>
                      <input
                        type="text"
                        value={partyACompanyName}
                        onChange={(e) => setPartyACompanyName(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Người đại diện:</label>
                      <input
                        type="text"
                        value={partyARepresentative}
                        onChange={(e) => setPartyARepresentative(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Chức vụ:</label>
                      <input
                        type="text"
                        value={partyAPosition}
                        onChange={(e) => setPartyAPosition(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Giấy ủy quyền:</label>
                      <input
                        type="text"
                        value={partyAPowerOfAttorney}
                        onChange={(e) => setPartyAPowerOfAttorney(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Mã số thuế:</label>
                      <input
                        type="text"
                        value={partyATaxCode}
                        onChange={(e) => setPartyATaxCode(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Giấy phép LHQT:</label>
                      <textarea
                        rows={2}
                        value={partyALicenseLHQT}
                        onChange={(e) => setPartyALicenseLHQT(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Số tài khoản ngân hàng:</label>
                      <input
                        type="text"
                        value={partyABankAccount}
                        onChange={(e) => setPartyABankAccount(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Ngân hàng:</label>
                      <input
                        type="text"
                        value={partyABankName}
                        onChange={(e) => setPartyABankName(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleSavePartyATemplate}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Lưu mẫu Bên A làm mặc định
                    </button>
                  </div>
                )}

                {/* TAB 3: THÔNG TIN BÊN B */}
                {activeDrawerTab === 'partyB' && (
                  <div className="space-y-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Đại diện Bên B (Họ tên):</label>
                      <input
                        type="text"
                        value={partyBName}
                        onChange={(e) => setPartyBName(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs uppercase font-bold"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Số Passport / CCCD:</label>
                      <input
                        type="text"
                        value={partyBIdNumber}
                        onChange={(e) => setPartyBIdNumber(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Số điện thoại:</label>
                      <input
                        type="text"
                        value={partyBPhone}
                        onChange={(e) => setPartyBPhone(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Địa chỉ:</label>
                      <textarea
                        rows={2}
                        value={partyBAddress}
                        onChange={(e) => setPartyBAddress(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* TAB 4: TÙY CHỌN BẬT/TẮT */}
                {activeDrawerTab === 'options' && (
                  <div className="space-y-3">
                    <label className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100">
                      <div>
                        <span className="font-bold text-slate-800 block">Bảng danh sách hành khách</span>
                        <span className="text-[10px] text-slate-500">Hiển thị bảng tên, số hộ chiếu ở Điều 1</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={includePassengerTable}
                        onChange={(e) => setIncludePassengerTable(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100">
                      <div>
                        <span className="font-bold text-slate-800 block">Mã VietQR Chuyển khoản</span>
                        <span className="text-[10px] text-slate-500">Mã QR quét thanh toán Napas 24/7</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={includeVietQR}
                        onChange={(e) => setIncludeVietQR(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 bg-indigo-50/70 border border-indigo-200 rounded-lg cursor-pointer hover:bg-indigo-100/70">
                      <div>
                        <span className="font-bold text-indigo-900 block">In kèm Phụ lục chương trình</span>
                        <span className="text-[10px] text-indigo-600">Nối thêm phụ lục lịch trình, chuyến bay & lưu ý</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={includeAppendix}
                        onChange={(e) => setIncludeAppendix(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded"
                      />
                    </label>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleResetToDefault}
                        className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-colors border border-slate-300 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Khôi phục mẫu mặc định
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 5: ĐIỀU KHOẢN BỔ SUNG */}
                {activeDrawerTab === 'custom' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">Điều khoản bổ sung:</span>
                      <button
                        type="button"
                        onClick={handleAddCustomField}
                        className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Thêm
                      </button>
                    </div>

                    {customFields.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic text-center py-4">Chưa có điều khoản thỏa thuận riêng nào.</p>
                    ) : (
                      <div className="space-y-2.5">
                        {customFields.map((f, i) => (
                          <div key={f.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-700 text-[11px]">Điều khoản #{i + 1}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveCustomField(f.id)}
                                className="text-rose-500 hover:text-rose-700 p-0.5 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <input
                              type="text"
                              value={f.label}
                              onChange={(e) => handleUpdateCustomField(f.id, 'label', e.target.value)}
                              placeholder="Tiêu đề điều khoản..."
                              className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-bold"
                            />
                            <textarea
                              rows={2}
                              value={f.value}
                              onChange={(e) => handleUpdateCustomField(f.id, 'value', e.target.value)}
                              placeholder="Nội dung điều khoản thỏa thuận..."
                              className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          )}

        </div>

        {/* Modal Bottom Bar (Screen only) */}
        <div className="px-5 py-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 no-print">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-medium">Định dạng A4 Đứng (Portrait):</span> Khổ in 210mm × 297mm, font chữ 11pt chuẩn thể thức hành chính, các ô số có dấu chấm hàng nghìn.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-300 transition-colors cursor-pointer"
            >
              Đóng cửa sổ
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>In Ngay / Xuất PDF</span>
            </button>
          </div>
        </div>

      </div>

      {/* Modal Xác Nhận Cập Nhật Lại / Ghi Đè Hợp Đồng Trên Google Drive */}
      {showConfirmOverwrite && (
        <div className="fixed inset-0 z-[70] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 no-print">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-sm text-slate-900">
                  Xác nhận lưu lại hợp đồng mới?
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Đơn hàng này đã có 1 bản hợp đồng lưu trên Google Drive. Khi xác nhận, hệ thống sẽ <strong>xóa file hợp đồng cũ</strong> và lưu <strong>bản hợp đồng mới nhất</strong> vào đúng thư mục đơn hàng.
                </p>
              </div>
            </div>

            <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 text-[11px] text-amber-900 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 font-bold">
                <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Thao tác này sẽ ghi đè file trên Google Drive</span>
              </div>
              <p className="text-amber-800 text-[10.5px]">
                Đường dẫn liên kết xem file trong hệ thống sẽ được tự động cập nhật sang file mới.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConfirmOverwrite(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all cursor-pointer border border-slate-200"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowConfirmOverwrite(false);
                  await saveContractToGoogleDrive(false, true);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:scale-95 rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Xác nhận &amp; Lưu mới</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TourContractPrintModal;
