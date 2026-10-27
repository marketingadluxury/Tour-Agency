import React, { useState } from 'react';
import { X, Upload, Loader2, CheckCircle2, FileText, Trash2, Image as ImageIcon } from 'lucide-react';
import { useCRM } from '@/context/CRMContext';
import { useAuth } from '@/context/AuthContext';
import { Order } from '@/types';
import toast from 'react-hot-toast';
import { safeFetchApi } from '@/lib/utils';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
}

export default function PaymentModal({ isOpen, onClose, order }: PaymentModalProps) {
  const { createInvoiceReceipt, invoices, tours } = useCRM();
  const { profile } = useAuth();
  const [amount, setAmount] = useState<number>(0);
  const [invoiceCode, setInvoiceCode] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Set default amount when modal opens and generate payment code automatically
  React.useEffect(() => {
    if (order) {
      const remaining = order.total_price - (order.paid_amount || 0);
      setAmount(remaining > 0 ? remaining : 0);
      
      // Calculate sequence number of payment
      const orderInvoices = invoices.filter(inv => inv.order_id === order.id);
      const sequence = orderInvoices.length + 1;
      const orderShortId = order.id.substring(0, 8).toUpperCase();
      setInvoiceCode(`${orderShortId}-TT-${sequence}`);
      
      setDescription(`Thanh toán lần ${sequence}`);
      setFile(null);
    }
  }, [order, isOpen, invoices]);

  if (!isOpen || !order) return null;

  const orderCode = `#${order.id.substring(0, 8).toUpperCase()}`;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      toast.error('Vui lòng nhập số tiền thanh toán hợp lệ (lớn hơn 0).');
      return;
    }
    if (!invoiceCode.trim()) {
      toast.error('Vui lòng nhập mã giao dịch chuyển khoản.');
      return;
    }
    if (!file) {
      toast.error('Vui lòng tải lên ảnh chụp hóa đơn/biên lai chuyển tiền.');
      return;
    }

    setIsUploading(true);
    try {
      // 1. Prepare upload form data
      const targetTour = tours.find(t => t.id === order.tour_id);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('orderCode', order.id.substring(0, 8));
      if (targetTour?.code) {
        formData.append('tourCode', targetTour.code);
      }

      // 2. Call upload API
      const resData = await safeFetchApi('/api/upload-invoice-receipt', {
        method: 'POST',
        body: formData,
      });
      
      // 3. Create invoice receipt in state & DB
      await createInvoiceReceipt({
        order_id: order.id,
        amount: Number(amount),
        type: 'receipt',
        payment_method: 'Chuyển khoản',
        description: description.trim() || 'Thanh toán chuyển khoản',
        invoice_code: invoiceCode.trim().toUpperCase(),
        file_url: resData.url,
        created_by: profile?.full_name || 'Nhân viên Sales'
      });

      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Gặp lỗi khi nộp hóa đơn thanh toán.');
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in duration-200" id="payment-modal-container">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h3 className="font-bold text-gray-900 text-base">Nộp hóa đơn thanh toán</h3>
            <p className="text-xs text-gray-500 mt-0.5">Thanh toán nhiều lần cho booking {orderCode}</p>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 bg-white border border-gray-200 p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Amount input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase">Số tiền thanh toán (VND) <span className="text-rose-500">*</span></label>
            <div className="relative rounded-lg shadow-sm">
              <input
                type="text"
                required
                className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold text-gray-900"
                placeholder="Nhập số tiền..."
                value={amount ? new Intl.NumberFormat('vi-VN').format(amount) : ''}
                onChange={(e) => {
                  const rawValue = e.target.value.replace(/[^0-9]/g, '');
                  setAmount(rawValue ? parseInt(rawValue, 10) : 0);
                }}
              />
            </div>
            <p className="text-[11px] text-gray-400">
              Tổng tiền đơn: <span className="font-semibold text-gray-600">{new Intl.NumberFormat('vi-VN').format(order.total_price)} đ</span>. 
              Đã thanh toán: <span className="font-semibold text-gray-600">{new Intl.NumberFormat('vi-VN').format(order.paid_amount || 0)} đ</span>.
            </p>
          </div>

          {/* Transaction code */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase">Mã giao dịch (Hệ thống tự động tạo)</label>
            <input
              type="text"
              disabled
              className="block w-full px-3.5 py-2.5 border border-emerald-200 rounded-lg text-sm font-mono uppercase font-black text-emerald-700 bg-emerald-50 cursor-not-allowed"
              value={invoiceCode}
            />
            <p className="text-[11px] text-gray-400">Được tạo theo cấu trúc: [Mã booking]-TT-[Số thứ tự lần thanh toán].</p>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase">Ghi chú thanh toán</label>
            <textarea
              rows={2}
              className="block w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
              placeholder="Thanh toán cọc lần 1, thanh toán phần còn lại..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* File Upload Area */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase block">
              Ảnh biên lai / Hóa đơn chuyển khoản <span className="text-rose-500">*</span>
            </label>

            {!file ? (
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-5 text-center hover:bg-blue-50/50 hover:border-blue-400 transition-all relative group cursor-pointer">
                <input
                  type="file"
                  required
                  accept="image/*,application/pdf"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  onChange={handleFileChange}
                />
                <div className="space-y-2 flex flex-col items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">
                      Nhấp hoặc kéo thả để tải lên biên lai
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Định dạng hỗ trợ: JPG, PNG, PDF (Hình ảnh hóa đơn chuyển tiền)
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50/80 border-2 border-emerald-300 rounded-xl p-3.5 transition-all relative animate-in fade-in duration-200">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 rounded-md border border-emerald-300">
                          ✓ Đã chọn file thành công
                        </span>
                        <span className="text-[11px] font-medium text-emerald-700">
                          {formatFileSize(file.size)}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-gray-900 truncate mt-1" title={file.name}>
                        {file.name}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5 shrink-0">
                    <label className="p-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors cursor-pointer flex items-center gap-1" title="Đổi sang file khác">
                      <FileText className="w-3.5 h-3.5" />
                      <span>Đổi file</span>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Xóa file đã chọn"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-gray-100">
            <button
              type="button"
              disabled={isUploading}
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all flex items-center justify-center shadow-md disabled:bg-blue-400 disabled:cursor-not-allowed cursor-pointer"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Đang tải lên...
                </>
              ) : (
                'Gửi hóa đơn chờ duyệt'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

