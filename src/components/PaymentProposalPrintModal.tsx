import React, { useRef, useState, useEffect } from 'react';
import { Printer, X, Download, FileText, CheckCircle2, QrCode } from 'lucide-react';
import { PaymentProposal } from '@/types';
import { numberToVietnameseWords } from '@/utils/numberToWords';
import { fetchVietQrDataUrl, buildVietQrDirectUrl, getBankBinFromName } from '@/utils/vietQrHelper';

interface PaymentProposalPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposal: PaymentProposal | null;
}

// Map role sang tên phòng ban tương ứng
function getDepartmentFromRole(role?: string, name?: string): string {
  const normRole = (name?.toLowerCase().includes('hậu') && role === 'sale_leader') ? 'marketing_leader' : role;
  switch (normRole) {
    case 'marketing':
    case 'marketing_leader':
      return 'Marketing';
    case 'sale':
    case 'sale_leader':
      return 'Kinh doanh (Sales)';
    case 'operator':
      return 'Điều hành Tour';
    case 'accounting':
      return 'Kế toán';
    case 'hr':
      return 'Hành chính Nhân sự';
    case 'visa':
    case 'visa_leader':
      return 'Bộ phận Visa';
    case 'tour_guide':
      return 'Hướng dẫn viên';
    case 'bod':
      return 'Ban Giám Đốc';
    case 'admin':
      return 'Ban Giám Đốc / Quản trị';
    default:
      return 'Văn phòng Công ty';
  }
}

// Map role sang chức vụ tương ứng
function getPositionFromRole(role?: string, name?: string): string {
  const normRole = (name?.toLowerCase().includes('hậu') && role === 'sale_leader') ? 'marketing_leader' : role;
  switch (normRole) {
    case 'marketing_leader':
      return 'Trưởng phòng Marketing';
    case 'marketing':
      return 'Chuyên viên Marketing';
    case 'sale_leader':
      return 'Trưởng nhóm Kinh doanh (Sale Leader)';
    case 'sale':
      return 'Chuyên viên Tư vấn (Sale)';
    case 'visa_leader':
      return 'Trưởng bộ phận Visa';
    case 'visa':
      return 'Chuyên viên Visa';
    case 'operator':
      return 'Điều hành Tour';
    case 'accounting':
      return 'Kế toán';
    case 'hr':
      return 'Hành chính Nhân sự';
    case 'tour_guide':
      return 'Hướng dẫn viên';
    case 'bod':
      return 'Ban Giám Đốc';
    case 'admin':
      return 'Quản trị viên';
    default:
      return 'Nhân viên';
  }
}

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(amount));
}

// Parse ngày tháng thành chuỗi Tiếng Việt "ngày dd tháng mm năm yyyy"
function formatVietnameseDate(dateStr?: string): { day: string; month: string; year: string; full: string } {
  const d = dateStr ? new Date(dateStr) : new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear());
  return {
    day,
    month,
    year,
    full: `TP.HCM, ngày ${day} tháng ${month} năm ${year}`
  };
}

// Format dd/mm/yyyy
function formatDateShort(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// Map bank name sang mã VietQR
function getBankCode(bankName?: string): string {
  if (!bankName) return '970432';
  const norm = bankName.toLowerCase().replace(/\s+/g, '');
  if (norm.includes('vpbank') || norm.includes('vp')) return '970432';
  if (norm.includes('vietcombank') || norm.includes('vcb')) return '970436';
  if (norm.includes('techcombank') || norm.includes('tcb')) return '970407';
  if (norm.includes('mbbank') || norm.includes('mb')) return '970422';
  if (norm.includes('acb')) return '970416';
  if (norm.includes('bidv')) return '970418';
  if (norm.includes('vietinbank') || norm.includes('ctg')) return '970415';
  if (norm.includes('tpbank')) return '970423';
  if (norm.includes('sacombank') || norm.includes('stb')) return '970403';
  if (norm.includes('vib')) return '970441';
  if (norm.includes('shb')) return '970443';
  if (norm.includes('hdbank') || norm.includes('hdb')) return '970437';
  if (norm.includes('msb')) return '970426';
  if (norm.includes('ocb')) return '970448';
  return '970432';
}

export default function PaymentProposalPrintModal({ isOpen, onClose, proposal }: PaymentProposalPrintModalProps) {
  if (!isOpen || !proposal) return null;

  const dateObj = formatVietnameseDate(proposal.created_at);
  const wordsAmount = numberToVietnameseWords(proposal.amount);
  const department = getDepartmentFromRole(proposal.created_by_role, proposal.created_by_name);
  const position = getPositionFromRole(proposal.created_by_role, proposal.created_by_name);
  const paymentDateStr = formatDateShort(proposal.due_date || proposal.created_at);

  const bankBin = getBankBinFromName(proposal.bank_name);
  const qrUrl = proposal.account_number
    ? buildVietQrDirectUrl({
        bankBin,
        accountNo: proposal.account_number,
        accountName: proposal.account_name || proposal.created_by_name || '',
        amount: proposal.amount,
        memo: proposal.code || 'Thanh toan de nghi',
        template: 'compact'
      })
    : '';

  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (!isOpen || !proposal?.account_number) return;
    let isMounted = true;

    fetchVietQrDataUrl({
      bankBin,
      accountNo: proposal.account_number,
      accountName: proposal.account_name || proposal.created_by_name || '',
      amount: proposal.amount,
      memo: proposal.code || 'Thanh toan de nghi',
      template: 'compact'
    }).then(dataUrl => {
      if (isMounted && dataUrl) {
        setQrDataUrl(dataUrl);
      }
    }).catch(err => {
      console.warn('[PaymentProposalPrintModal] VietQR error:', err);
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen, proposal?.account_number, proposal?.amount, proposal?.code, proposal?.account_name, proposal?.bank_name, bankBin]);

  const handlePrint = async () => {
    if (!qrDataUrl && proposal?.account_number) {
      try {
        const fresh = await fetchVietQrDataUrl({
          bankBin,
          accountNo: proposal.account_number,
          accountName: proposal.account_name || proposal.created_by_name || '',
          amount: proposal.amount,
          memo: proposal.code || 'Thanh toan de nghi',
          template: 'compact'
        });
        if (fresh) {
          setQrDataUrl(fresh);
          await new Promise(r => setTimeout(r, 80));
        }
      } catch {
        // continue
      }
    }
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      {/* Modal Container */}
      <div className="bg-slate-100 rounded-2xl shadow-2xl border border-slate-300 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* Modal Toolbar (Screen only) */}
        <div className="bg-white px-5 py-3 border-b border-slate-200 flex items-center justify-between shrink-0 shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                Xuất Giấy Đề Nghị Thanh Toán
              </h2>
              <span className="text-[11px] text-slate-500 font-medium">Mã: {proposal.code}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>In / Tải PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Paper Sheet Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center bg-slate-200/70">
          <div
            id="payment-proposal-print-area"
            className="w-full max-w-[210mm] min-h-[297mm] bg-white p-8 sm:p-14 shadow-lg text-slate-900 font-serif leading-relaxed text-sm relative"
            style={{ fontFamily: '"Times New Roman", Times, serif' }}
          >
            {/* Header: Left company name, Right National Motto */}
            <div className="flex justify-between items-start mb-6">
              <div className="text-left font-bold text-xs sm:text-sm tracking-wide leading-tight">
                <div className="uppercase">CÔNG TY DU LỊCH [TÊN CÔNG TY]</div>
                <div className="text-[11.5px] font-normal text-slate-800 mt-1">
                  Mã phiếu: <span className="font-bold text-black font-mono">{proposal.code}</span>
                </div>
              </div>
              <div className="text-center text-xs sm:text-sm leading-snug">
                <div className="font-bold uppercase tracking-wider">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                <div className="font-bold underline underline-offset-4 decoration-1 mt-0.5">
                  Độc lập - Tự do - Hạnh phúc
                </div>
              </div>
            </div>

            {/* Date line (Right aligned, Italic) */}
            <div className="text-right text-xs sm:text-sm italic mb-8">
              {dateObj.full}
            </div>

            {/* Document Title */}
            <div className="text-center my-6">
              <h1 className="text-lg sm:text-xl font-bold uppercase tracking-wider text-black">
                GIẤY ĐỀ NGHỊ THANH TOÁN
              </h1>
            </div>

            {/* Main content body */}
            <div className="space-y-3.5 text-xs sm:text-sm text-black">
              <div>
                <span className="font-bold">Kính gửi bộ phận: </span>
                <span>Kế toán</span>
              </div>

              <div>
                <span className="font-bold">Họ và tên người đề nghị thanh toán: </span>
                <span>{proposal.created_by_name}</span>
                <span className="text-slate-600 ml-2">({position})</span>
              </div>

              <div>
                <span className="font-bold">Bộ phận: </span>
                <span>{department}</span>
              </div>

              <div>
                <span className="font-bold">Nội dung thanh toán: </span>
                <span>{proposal.title}</span>
                {proposal.note && <div className="text-xs text-slate-700 italic mt-0.5">({proposal.note})</div>}
              </div>

              <div>
                <span className="font-bold">Số tiền: </span>
                <span className="font-bold">{formatCurrency(proposal.amount)} VND</span>
              </div>

              <div>
                <span className="font-bold italic">Bằng chữ: </span>
                <span className="italic">{wordsAmount}</span>
              </div>

              <div>
                <span className="font-bold">Phương thức thanh toán: </span>
                <span>{proposal.payment_method}</span>
              </div>

              {/* Bank Details & QR Code */}
              {proposal.payment_method === 'Chuyển khoản' && (
                <div className="pt-2 pl-2 space-y-1.5">
                  <div className="flex items-start">
                    <span className="mr-2">•</span>
                    <span><strong>Ngân hàng:</strong> {proposal.bank_name || 'VPBank'}</span>
                  </div>
                  <div className="flex items-start">
                    <span className="mr-2">•</span>
                    <span><strong>Số tài khoản:</strong> {proposal.account_number || '---'}</span>
                  </div>
                  <div className="flex items-start">
                    <span className="mr-2">•</span>
                    <span><strong>Chủ tài khoản:</strong> <span className="uppercase">{proposal.account_name || proposal.created_by_name}</span></span>
                  </div>
                  <div className="flex items-start">
                    <span className="mr-2">•</span>
                    <span><strong>Số tiền:</strong> {formatCurrency(proposal.amount)} VND</span>
                  </div>
                  <div className="flex items-start">
                    <span className="mr-2">•</span>
                    <span><strong>Nội dung chuyển khoản:</strong> {proposal.code}</span>
                  </div>

                  {/* VietQR Image Box if account number exists */}
                  {qrUrl && (
                    <div className="my-5 flex flex-col sm:flex-row items-center gap-4 p-3 rounded-xl border border-slate-200 bg-slate-50/50 max-w-sm">
                      <img
                        src={qrDataUrl || qrUrl}
                        alt="VietQR Chuyển khoản"
                        className="w-36 h-36 object-contain rounded-lg border border-slate-300 bg-white p-1 block"
                        style={{ width: '144px', height: '144px', maxWidth: '144px', maxHeight: '144px' }}
                        crossOrigin="anonymous"
                        onError={(e) => {
                          // Hide broken image gracefully if offline
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div className="text-xs space-y-1 font-sans">
                        <div className="font-bold text-slate-800 flex items-center gap-1">
                          <QrCode className="w-3.5 h-3.5 text-blue-600" />
                          <span>Quét mã VietQR 24/7</span>
                        </div>
                        <div className="text-slate-600 text-[11px]">
                          Ngân hàng: <strong>{proposal.bank_name || 'VPBank'}</strong>
                        </div>
                        <div className="text-slate-600 text-[11px]">
                          STK: <strong>{proposal.account_number}</strong>
                        </div>
                        <div className="text-slate-600 text-[11px]">
                          Chủ TK: <strong className="uppercase">{proposal.account_name || proposal.created_by_name}</strong>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2">
                <span className="font-bold">Thời gian thanh toán: </span>
                <span>{paymentDateStr}</span>
              </div>
            </div>

            {/* 3-Column Signatures Table (Exact layout from PDF) */}
            <div className="mt-12 pt-4">
              <table className="w-full border-collapse border border-black text-center text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-black">
                    <th className="w-1/3 py-2 px-3 border-r border-black font-bold text-black">
                      Người đề nghị thanh toán
                    </th>
                    <th className="w-1/3 py-2 px-3 border-r border-black font-bold text-black">
                      Người phụ trách
                    </th>
                    <th className="w-1/3 py-2 px-3 font-bold text-black">
                      Phụ trách Kế toán
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {/* Space for signatures */}
                    <td className="h-28 border-r border-black align-bottom pb-3 font-bold uppercase text-black">
                      {proposal.created_by_name}
                    </td>
                    <td className="h-28 border-r border-black align-bottom pb-3 font-bold uppercase text-black">
                      {proposal.leader_approved_by || (proposal.leader_status === 'approved' ? 'HÙNG TRUNG' : '')}
                    </td>
                    <td className="h-28 align-bottom pb-3 font-bold uppercase text-black">
                      {proposal.accounting_approved_by || (proposal.accounting_status === 'approved' ? 'THANH VÂN' : '')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Document footer code */}
            <div className="mt-8 text-[11px] text-slate-400 text-right font-sans">
              Hệ thống Tour CRM · Mã phiếu: {proposal.code}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
