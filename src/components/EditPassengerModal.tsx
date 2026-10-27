import React, { useState, useEffect } from 'react';
import { X, Upload, CheckCircle2, FileText, Trash2, ExternalLink, AlertTriangle, Lock, ChevronDown, ChevronUp } from 'lucide-react';
import { Passenger } from '../types';
import { DatePicker } from './DatePicker';
import { CustomSelect } from './CustomSelect';

import { useCRM, isOrderLocked } from '../context/CRMContext';
import { extractFileNameFromUrl } from './PassengerDocumentList';
import { safeFetchApi } from '../lib/utils';

interface EditPassengerModalProps {
  isOpen: boolean;
  onClose: () => void;
  passenger: Passenger | null;
  onSave: (passengerId: string, updatedData: Partial<Passenger>) => void;
  tourPriceVisa?: number; // Giá visa đi tour
}

const getInitials = (fullName: string): string => {
  if (!fullName) return '';
  const unsigned = fullName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/Đ/g, 'D')
    .replace(/đ/g, 'd')
    .toUpperCase();
  const parts = unsigned.trim().split(/\s+/);
  return parts.map(p => p[0]).join('');
};

export default function EditPassengerModal({
  isOpen,
  onClose,
  passenger,
  onSave,
  tourPriceVisa,
}: EditPassengerModalProps) {
  const { orders, currentRole } = useCRM();
  const order = passenger ? orders.find(o => o.id === passenger.order_id) : null;
  const isOrderExplicitlyLocked = isOrderLocked(order);
  const isPrivilegedRole = ['admin', 'sale_leader'].includes(currentRole);
  const canEditVisaOption = isPrivilegedRole || !isOrderExplicitlyLocked;

  const [fullName, setFullName] = useState('');
  const [passportNumber, setPassportNumber] = useState('');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [nationality, setNationality] = useState('VN');
  const [passportIssueDate, setPassportIssueDate] = useState('');
  const [passportExpiryDate, setPassportExpiryDate] = useState('');
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [needsVisaService, setNeedsVisaService] = useState(false);
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null);
  const [deletingState, setDeletingState] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showDeletedAlert, setShowDeletedAlert] = useState(false);
  const [isFileListExpanded, setIsFileListExpanded] = useState(false);

  useEffect(() => {
    if (isOpen && passenger && passenger.id !== activeId) {
      setFullName(passenger.full_name || '');
      setPassportNumber(passenger.passport_number || '');
      setDob(passenger.dob || '');
      setPhone(passenger.phone || '');
      setGender(passenger.gender || '');
      setNationality(passenger.nationality || 'VN');
      setPassportIssueDate(passenger.passport_issue_date || '');
      setPassportExpiryDate(passenger.passport_expiry_date || '');
      setNeedsVisaService(passenger.needs_visa_service || false);
      setUploadedUrls(passenger.passport_url ? passenger.passport_url.split(',').filter(Boolean) : []);
      setActiveId(passenger.id);
      setErrorMsg(null);
      setShowDeletedAlert(false);
    }
  }, [isOpen, passenger, activeId]);

  useEffect(() => {
    if (!isOpen) {
      setActiveId(null);
    }
  }, [isOpen]);

  if (!isOpen || !passenger) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setIsUploading(true);
    setErrorMsg(null);
    try {
      const filesArray = Array.from(fileList) as File[];
      const newUrls: string[] = [];

      for (const file of filesArray) {
        const formData = new FormData();
        formData.append('passportNumber', passportNumber || 'CHUA_CO_HC');
        formData.append('fullName', fullName || 'KHACH_HANG');
        formData.append('file', file);

        const data = await safeFetchApi('/api/upload', {
          method: 'POST',
          body: formData
        });

        if (data.url) {
          let finalUrl = data.url;
          if (!finalUrl.includes('#filename=')) {
            finalUrl += `#filename=${encodeURIComponent(file.name)}`;
          }
          newUrls.push(finalUrl);
        } else {
          throw new Error(data.error || `Lỗi khi tải file ${file.name} lên hệ thống`);
        }
      }

      setUploadedUrls(prev => [...prev, ...newUrls]);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Lỗi: ${err.message || 'Không thể tải file lên hệ thống'}`);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleFileDelete = async (urlToDelete: string) => {
    setDeletingState(true);
    setErrorMsg(null);
    try {
      await safeFetchApi('/api/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: urlToDelete })
      });

      setUploadedUrls(prev => prev.filter(url => url !== urlToDelete));
      setShowDeletedAlert(true);
    } catch (err) {
      console.error('Lỗi khi xóa file:', err);
      setUploadedUrls(prev => prev.filter(url => url !== urlToDelete));
      setShowDeletedAlert(true);
    } finally {
      setDeletingState(false);
      setDeletingUrl(null);
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      setErrorMsg('Vui lòng nhập Họ tên hành khách!');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    try {
      // Update passenger details
      onSave(passenger.id, {
        full_name: fullName.trim().toUpperCase(),
        passport_number: passportNumber.trim().toUpperCase(),
        dob,
        phone: phone.trim(),
        passport_url: uploadedUrls.join(','),
        needs_visa_service: needsVisaService,
        gender,
        nationality: nationality.trim().toUpperCase(),
        passport_issue_date: passportIssueDate,
        passport_expiry_date: passportExpiryDate,
      });

      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg('Đã xảy ra lỗi trong quá trình cập nhật hồ sơ hành khách.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100 font-sans">
        
        {/* Modal Header */}
        <div className="bg-slate-50 border-b border-slate-150 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
              <span>Chỉnh sửa thông tin hành khách</span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5 font-medium">
              Cập nhật thông tin chi tiết và đính kèm hồ sơ
            </p>
          </div>
          <button 
            onClick={onClose} 
            disabled={isSaving}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-100 text-rose-700 px-3.5 py-3 rounded-xl text-xs font-bold flex justify-between items-center gap-2 animate-fade-in shadow-sm">
              <span className="flex-1">{errorMsg}</span>
              <button 
                type="button"
                onClick={() => setErrorMsg(null)} 
                className="text-rose-500 hover:text-rose-700 p-1 rounded-full hover:bg-rose-100 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Full Name & Gender */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-8">
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Họ và tên khách <span className="text-rose-500">*</span>
              </label>
              <input 
                type="text" 
                placeholder="NGUYEN VAN A" 
                required
                value={fullName} 
                onChange={e => setFullName(e.target.value.toUpperCase())} 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-bold text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none uppercase" 
              />
            </div>
            
            <div className="md:col-span-4">
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Giới tính (Sex)
              </label>
              <CustomSelect
                options={[
                  { value: '', label: 'Chọn' },
                  { value: 'Mr', label: 'Mr (Nam)' },
                  { value: 'Mrs', label: 'Mrs (Bà)' },
                  { value: 'Ms', label: 'Ms (Cô)' },
                ]}
                value={gender}
                onChange={setGender}
                className="w-full"
                buttonClassName="w-full h-9 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-semibold text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none cursor-pointer"
              />
            </div>
          </div>

          {/* Personal Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date of Birth */}
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Ngày sinh (DOB)
              </label>
              <DatePicker 
                value={dob} 
                onChange={val => setDob(val)} 
                align="left"
              />
            </div>

            {/* Nationality */}
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Quốc tịch
              </label>
              <input 
                type="text" 
                placeholder="VN" 
                value={nationality} 
                onChange={e => setNationality(e.target.value.toUpperCase())} 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-bold text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none uppercase" 
              />
            </div>

            {/* Phone Number */}
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Số điện thoại
              </label>
              <input 
                type="tel" 
                placeholder="Nhập số điện thoại" 
                value={phone} 
                onChange={e => setPhone(e.target.value)} 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-semibold text-slate-800" 
              />
            </div>
          </div>

          {/* Passport Info Grid */}
          <div className="border-t border-slate-100 pt-4 space-y-4">
            <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Thông tin hộ chiếu (Passport)</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Passport Number */}
              <div className="md:col-span-3">
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Số hộ chiếu (Passport No.)
                </label>
                <input 
                  type="text" 
                  placeholder="Nhập số hộ chiếu" 
                  value={passportNumber} 
                  onChange={e => setPassportNumber(e.target.value.toUpperCase())} 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none uppercase font-semibold text-slate-800" 
                />
              </div>

              {/* Passport Issue Date */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Ngày cấp (DOI)
                </label>
                <DatePicker 
                  value={passportIssueDate} 
                  onChange={val => setPassportIssueDate(val)} 
                  align="left"
                />
              </div>

              {/* Passport Expiry Date */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Ngày hết hạn (DOE)
                </label>
                <DatePicker 
                  value={passportExpiryDate} 
                  onChange={val => setPassportExpiryDate(val)} 
                  align="left"
                />
              </div>
            </div>
          </div>

          {/* Visa Service Option */}
          <div className={`border rounded-xl p-4 space-y-3 ${
            !canEditVisaOption ? 'bg-slate-50 border-slate-200' : 'bg-blue-50/50 border-blue-100'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <CheckCircle2 className={`w-4 h-4 ${needsVisaService ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className="text-xs font-bold text-slate-700">Đăng ký dịch vụ làm Visa qua Tour</span>
                {!canEditVisaOption && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                    <Lock className="w-3 h-3 text-amber-600" />
                    Đã khóa (Xác nhận làm Visa)
                  </span>
                )}
              </div>
              <label className={`relative inline-flex items-center ${!canEditVisaOption ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  disabled={!canEditVisaOption}
                  checked={needsVisaService}
                  onChange={e => {
                    if (!canEditVisaOption) return;
                    setNeedsVisaService(e.target.checked);
                  }}
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            {!canEditVisaOption && (
              <div className="text-[11px] text-amber-900 bg-amber-50/80 p-2.5 rounded-lg border border-amber-200/60 leading-relaxed flex items-start gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  {isOrderExplicitlyLocked ? (
                    <>Booking đã bị khóa bởi Quản trị viên. Tùy chọn làm Visa qua Tour bị khóa đối với tài khoản Sale/Đại lý. Vui lòng liên hệ <strong className="font-bold">Quản trị viên (Admin)</strong> hoặc <strong className="font-bold">Sale Leader</strong> nếu cần mở khóa hoặc thay đổi.</>
                  ) : (
                    <>Lựa chọn làm Visa qua Tour đã được xác nhận cho hành khách này. Do thay đổi dịch vụ Visa sẽ trực tiếp ảnh hưởng đến tổng giá trị booking, tùy chọn này đã bị khóa đối với tài khoản Sale/Đại lý. Vui lòng liên hệ <strong className="font-bold">Quản trị viên (Admin)</strong> hoặc <strong className="font-bold">Sale Leader</strong> nếu cần điều chỉnh.</>
                  )}
                </div>
              </div>
            )}

            {needsVisaService ? (
              <div className="text-[11px] text-blue-700 font-medium bg-white/60 p-2.5 rounded-lg border border-blue-50 animate-fade-in">
                Hành khách <strong>CHƯA CÓ VISA</strong>. Hệ thống sẽ tự động cộng thêm phí làm visa đi tour (<strong>{tourPriceVisa?.toLocaleString('vi-VN')}đ</strong>) vào tổng giá trị booking.
              </div>
            ) : (
              <div className="text-[11px] text-slate-500 font-medium p-1">
                Hành khách <strong>ĐÃ CÓ VISA</strong> hoặc không cần làm visa qua tour. Không phát sinh thêm phí.
              </div>
            )}
          </div>

          {/* Document Section */}
          <div className="border-t border-slate-150 pt-4 space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-700">Hồ sơ, tài liệu đính kèm</span>
            </div>

            {showDeletedAlert && (
              <div className="bg-amber-50 border border-amber-100 text-amber-800 text-[11px] p-3 rounded-xl font-bold flex items-center gap-1.5 animate-fade-in shadow-sm">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Đã gỡ tài liệu tạm thời. Hãy nhớ bấm nút "Lưu thay đổi" phía dưới để hoàn tất cập nhật vào hệ thống!</span>
              </div>
            )}

            {/* List of uploaded files */}
            {uploadedUrls.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <span>Danh sách tài liệu đã tải lên ({uploadedUrls.length}):</span>
                  {uploadedUrls.length > 3 && (
                    <button
                      type="button"
                      onClick={() => setIsFileListExpanded(!isFileListExpanded)}
                      className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer normal-case"
                    >
                      {isFileListExpanded ? (
                        <>
                          <span>Thu gọn</span>
                          <ChevronUp className="w-3 h-3" />
                        </>
                      ) : (
                        <>
                          <span>Xem tất cả ({uploadedUrls.length} file)</span>
                          <ChevronDown className="w-3 h-3" />
                        </>
                      )}
                    </button>
                  )}
                </div>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                  {(isFileListExpanded ? uploadedUrls : uploadedUrls.slice(0, 3)).map((url, uIdx) => {
                    const displayFileName = extractFileNameFromUrl(url);
                    const isConfirming = deletingUrl === url;

                    return (
                      <div key={uIdx} className={`flex items-center justify-between p-2.5 transition-all ${isConfirming ? 'bg-rose-50/75' : 'hover:bg-slate-50'}`}>
                        {isConfirming ? (
                          <>
                            <div className="flex items-center gap-1.5 text-rose-700 font-bold text-xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                              <span>Xác nhận xóa tài liệu này?</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                disabled={deletingState}
                                onClick={() => handleFileDelete(url)}
                                className="bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white text-[10px] font-bold px-2.5 py-1 rounded-md transition-colors cursor-pointer shadow-2xs"
                              >
                                {deletingState ? 'Đang xóa...' : 'Xóa'}
                              </button>
                              <button
                                type="button"
                                disabled={deletingState}
                                onClick={() => setDeletingUrl(null)}
                                className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                              >
                                Hủy
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline truncate max-w-[80%]"
                              title={displayFileName}
                            >
                              <ExternalLink className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                              <span className="truncate">{displayFileName}</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => setDeletingUrl(url)}
                              className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded transition-all cursor-pointer"
                              title="Xóa tài liệu này"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-slate-500 bg-slate-50 px-3.5 py-3 rounded-xl border border-slate-150">
                <p className="font-bold text-slate-700">Chưa có tài liệu đính kèm</p>
                <p className="text-gray-400 mt-0.5">
                  Bạn có thể kéo thả hoặc chọn file phía dưới để tải trực tiếp lên cho hành khách này.
                </p>
              </div>
            )}

            {/* Upload Box */}
            <div className="relative">
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/50 hover:bg-slate-50 rounded-2xl p-5 cursor-pointer transition-all">
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  disabled={isUploading || isSaving}
                  className="hidden"
                />
                <Upload className="w-8 h-8 text-slate-400 mb-2" />
                <span className="text-xs font-bold text-slate-700">Tải lên tài liệu mới</span>
                <span className="text-[10px] text-gray-400 mt-1 text-center font-medium">
                  Hỗ trợ định dạng PDF, hình ảnh (JPG, PNG), Word, v.v.
                </span>
              </label>

              {isUploading && (
                <div className="absolute inset-0 bg-white/80 rounded-2xl flex flex-col items-center justify-center gap-2">
                  <svg className="animate-spin h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="text-xs font-bold text-slate-700">Đang tải file lên...</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-150 px-6 py-4 flex justify-end gap-3 shrink-0 whitespace-nowrap">
          <button 
            type="button"
            onClick={onClose} 
            disabled={isSaving}
            className="px-4 py-2 border border-slate-250 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-600 transition-all shadow-sm whitespace-nowrap shrink-0"
          >
            Hủy bỏ
          </button>
          <button 
            type="button"
            onClick={handleSave} 
            disabled={isSaving}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-xs font-black shadow-md shadow-blue-600/10 transition-all flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isSaving ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Đang xử lý...</span>
              </>
            ) : (
              <span>Lưu thay đổi</span>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
