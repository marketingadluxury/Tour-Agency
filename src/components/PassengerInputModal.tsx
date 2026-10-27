import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { X, Upload, CheckCircle2, FileText, Trash2 } from 'lucide-react';
import { Passenger } from '../types';
import { DatePicker } from './DatePicker';
import { CustomSelect } from './CustomSelect';
import { useCRM } from '../context/CRMContext';

interface PassengerInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (passengers: (Omit<Passenger, 'id' | 'order_id' | 'visa_status'> & { needs_visa_service?: boolean })[]) => void;
  adultCount: number;
  childCount: number;
  infantCount: number;
  tourPriceVisa?: number;
}

interface PassengerInputState {
  label: string;
  full_name: string;
  name: string;
  passport_number: string;
  dob: string;
  files: File[];
  passport_url?: string;
  labor_contract_url?: string;
  isPayer: boolean;
  needs_visa_service: boolean;
  gender?: string;
  nationality?: string;
  passport_issue_date?: string;
  passport_expiry_date?: string;
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

export default function PassengerInputModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  adultCount = 1, 
  childCount = 0, 
  infantCount = 0,
  tourPriceVisa = 0
}: PassengerInputModalProps) {
  const [passengers, setPassengers] = useState<PassengerInputState[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const { passengers: dbPassengers = [] } = useCRM();
  const [activePaxIndex, setActivePaxIndex] = useState<number | null>(null);
  const [activePaxField, setActivePaxField] = useState<'full_name' | 'passport_number' | null>(null);
  const [modalSuggestions, setModalSuggestions] = useState<Passenger[]>([]);

  const removeDiacritics = (str: string) => {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
  };

  // Unique profiles in the database
  const dbUniquePassengers = React.useMemo(() => {
    const map = new Map<string, Passenger>();
    dbPassengers.forEach(p => {
      if (p.full_name) {
        const nameKey = removeDiacritics(p.full_name.trim().toLowerCase());
        const passportKey = p.passport_number ? p.passport_number.trim().toLowerCase() : '';
        const key = `${nameKey}|${passportKey}`;
        if (!map.has(key)) {
          map.set(key, p);
        }
      }
    });
    return Array.from(map.values());
  }, [dbPassengers]);

  useEffect(() => {
    if (activePaxIndex === null || activePaxField === null) {
      setModalSuggestions([]);
      return;
    }

    const currentPax = passengers[activePaxIndex];
    if (!currentPax) {
      setModalSuggestions([]);
      return;
    }

    if (activePaxField === 'full_name') {
      const searchVal = removeDiacritics(currentPax.full_name.toLowerCase().trim());
      if (searchVal.length >= 2) {
        const matches = dbUniquePassengers.filter(p => 
          p.full_name && removeDiacritics(p.full_name.toLowerCase()).includes(searchVal)
        );
        setModalSuggestions(matches.slice(0, 5));
      } else {
        setModalSuggestions([]);
      }
    } else if (activePaxField === 'passport_number') {
      const searchVal = currentPax.passport_number.toLowerCase().trim();
      if (searchVal.length >= 3) {
        const matches = dbUniquePassengers.filter(p => 
          p.passport_number && p.passport_number.toLowerCase().includes(searchVal)
        );
        setModalSuggestions(matches.slice(0, 5));
      } else {
        setModalSuggestions([]);
      }
    } else {
      setModalSuggestions([]);
    }
  }, [passengers, activePaxIndex, activePaxField, dbUniquePassengers]);

  const selectModalSuggestion = (paxIndex: number, p: Passenger) => {
    const updated = [...passengers];
    updated[paxIndex] = {
      ...updated[paxIndex],
      full_name: p.full_name.toUpperCase(),
      name: p.full_name.toUpperCase(),
      passport_number: (p.passport_number || '').toUpperCase(),
      dob: p.dob || '',
      gender: p.gender || '',
      nationality: p.nationality || 'VN',
      passport_issue_date: p.passport_issue_date || '',
      passport_expiry_date: p.passport_expiry_date || '',
      passport_url: p.passport_url || '',
      labor_contract_url: p.labor_contract_url || '',
    };
    setPassengers(updated);
    setModalSuggestions([]);
    setActivePaxIndex(null);
    setActivePaxField(null);
  };

  useEffect(() => {
    if (isOpen) {
      const initialPassengers: PassengerInputState[] = [];
      let isFirst = true;

      // Generate Adults
      for (let i = 1; i <= adultCount; i++) {
        initialPassengers.push({
          label: `Người lớn ${i}`,
          full_name: '',
          name: '',
          passport_number: '',
          dob: '',
          files: [],
          isPayer: isFirst,
          needs_visa_service: false,
          gender: '',
          nationality: 'VN',
          passport_issue_date: '',
          passport_expiry_date: '',
        });
        isFirst = false;
      }

      // Generate Children
      for (let i = 1; i <= childCount; i++) {
        initialPassengers.push({
          label: `Trẻ em ${i}`,
          full_name: '',
          name: '',
          passport_number: '',
          dob: '',
          files: [],
          isPayer: false,
          needs_visa_service: false,
          gender: '',
          nationality: 'VN',
          passport_issue_date: '',
          passport_expiry_date: '',
        });
      }

      // Generate Infants
      for (let i = 1; i <= infantCount; i++) {
        initialPassengers.push({
          label: `Em bé (Sơ sinh) ${i}`,
          full_name: '',
          name: '',
          passport_number: '',
          dob: '',
          files: [],
          isPayer: false,
          needs_visa_service: false,
          gender: '',
          nationality: 'VN',
          passport_issue_date: '',
          passport_expiry_date: '',
        });
      }

      setPassengers(initialPassengers);
    }
  }, [isOpen, adultCount, childCount, infantCount]);

  if (!isOpen) return null;

  const updatePassenger = (index: number, field: keyof PassengerInputState, value: any) => {
    let finalValue = value;
    if (field === 'full_name' && typeof value === 'string') {
      finalValue = value.toUpperCase();
    }
    const newPassengers = [...passengers];
    newPassengers[index] = {
      ...newPassengers[index],
      [field]: finalValue,
      // Keep name synchronized with full_name for backward compatibility
      ...(field === 'full_name' ? { name: finalValue } : {})
    };
    setPassengers(newPassengers);
  };

  const handleFileChange = (index: number, fileList: FileList) => {
    const list = Array.from(fileList);
    const updated = [...passengers];
    updated[index].files = [...updated[index].files, ...list];
    setPassengers(updated);
  };

  const removeFile = (paxIndex: number, fileIndex: number) => {
    const updated = [...passengers];
    updated[paxIndex].files = updated[paxIndex].files.filter((_, idx) => idx !== fileIndex);
    setPassengers(updated);
  };

  const handleConfirm = async () => {
    // Validate that at least the first passenger (payer/booker) has a name
    if (passengers.length > 0 && !passengers[0].full_name.trim()) {
      toast.error('Vui lòng nhập Họ tên cho hành khách đầu tiên (Người trưởng nhóm/đại diện)!');
      return;
    }

    setIsUploading(true);
    try {
      const passengersWithFiles = [];
      for (const p of passengers) {
        let passportUrls: string[] = [];

        if (p.full_name && p.files && p.files.length > 0) {
          // Upload each file for this passenger sequentially to avoid Google Drive folder creation race conditions
          for (const file of p.files) {
            try {
              const formData = new FormData();
              formData.append('passportNumber', p.passport_number || 'CHUA_CO_HC');
              formData.append('fullName', p.full_name || 'KHACH_HANG');
              formData.append('file', file);

              const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
              });

              if (!response.ok) {
                let errorMsg = `Lỗi khi tải file ${file.name} lên`;
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                  const errJson = await response.json();
                  errorMsg = errJson.error || errorMsg;
                }
                throw new Error(errorMsg);
              }

              const contentType = response.headers.get('content-type');
              if (contentType && contentType.includes('application/json')) {
                const resData = await response.json();
                if (resData.success && resData.url) {
                  let finalUrl = resData.url;
                  if (!finalUrl.includes('#filename=')) {
                    finalUrl += `#filename=${encodeURIComponent(file.name)}`;
                  }
                  passportUrls.push(finalUrl);
                } else {
                  throw new Error(resData.error || `Lỗi khi tải file ${file.name} lên hệ thống`);
                }
              } else {
                throw new Error(`Đã có lỗi từ máy chủ khi tải file ${file.name}`);
              }
            } catch (err: any) {
              console.error('Exception khi gọi API upload file:', err);
              throw new Error(err.message || `Không thể tải file ${file.name}`);
            }
          }
        }

        passengersWithFiles.push({
          full_name: p.full_name.trim().toUpperCase(),
          name: p.full_name.trim().toUpperCase(), // legacy
          passport_number: p.passport_number.trim().toUpperCase(),
          dob: p.dob,
          passport_url: passportUrls.length > 0 ? passportUrls.join(',') : undefined,
          labor_contract_url: p.labor_contract_url || undefined,
          is_payer: p.isPayer,
          needs_visa_service: p.needs_visa_service,
          gender: p.gender,
          nationality: p.nationality,
          passport_issue_date: p.passport_issue_date,
          passport_expiry_date: p.passport_expiry_date,
        });
      }

      onConfirm(passengersWithFiles);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Đã xảy ra lỗi trong quá trình xử lý hồ sơ hành khách.');
    } finally {
      setIsUploading(false);
    }
  };

  const totalPax = adultCount + childCount + infantCount;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100 font-sans">
        
        {/* Modal Header */}
        <div className="bg-slate-50 border-b border-slate-150 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
              <span>Nhập thông tin danh sách hành khách</span>
              <span className="bg-blue-100 text-blue-700 text-xs px-2.5 py-0.5 rounded-full font-extrabold border border-blue-200">
                {totalPax} khách
              </span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5 font-medium">
              Vui lòng điền đúng thông tin hộ chiếu để phục vụ đặt vé máy bay và làm visa
            </p>
          </div>
          <button 
            onClick={onClose} 
            disabled={isUploading}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Passenger Form List */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {passengers.map((p, index) => {
            const isAdult = p.label.startsWith('Người lớn');
            const isChild = p.label.startsWith('Trẻ em');
            const badgeClass = isAdult 
              ? 'bg-blue-50 text-blue-700 border-blue-200' 
              : isChild 
              ? 'bg-amber-50 text-amber-700 border-amber-200' 
              : 'bg-purple-50 text-purple-700 border-purple-200';

            return (
              <div 
                key={index} 
                className="border border-slate-150 rounded-2xl p-4 bg-slate-50/40 hover:bg-slate-50/70 transition-all space-y-4"
              >
                {/* Pax title / identifier */}
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider border ${badgeClass}`}>
                    {p.label}
                    {p.isPayer && <span className="ml-1.5 text-[9px] bg-blue-600 text-white px-1.5 py-0.2 rounded">Trưởng đoàn</span>}
                  </span>
                  <span className="text-[11px] text-gray-400 font-bold">Hành khách #{index + 1}</span>
                </div>

                {/* Input Fields Grid */}
                <div className="space-y-4">
                  {/* Row 1: Personal Info */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    {/* full_name */}
                    <div className="relative md:col-span-5">
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                        Họ và tên khách {p.isPayer && <span className="text-rose-500">*</span>}
                      </label>
                      <input 
                        type="text" 
                        placeholder="NGUYEN VAN A" 
                        required={p.isPayer}
                        value={p.full_name} 
                        onChange={e => updatePassenger(index, 'full_name', e.target.value.toUpperCase())} 
                        onFocus={() => {
                          setActivePaxIndex(index);
                          setActivePaxField('full_name');
                        }}
                        onBlur={() => setTimeout(() => {
                          setActivePaxIndex(null);
                          setActivePaxField('full_name');
                        }, 250)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-bold text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none placeholder:font-normal placeholder:text-gray-300 uppercase" 
                      />
                      {activePaxIndex === index && activePaxField === 'full_name' && modalSuggestions.length > 0 && (
                        <div className="absolute z-50 w-full bg-white border border-slate-300 rounded-lg mt-1 max-h-40 overflow-y-auto shadow-xl divide-y divide-slate-100">
                          {modalSuggestions.map(suggestion => (
                            <div 
                              key={suggestion.id}
                              onMouseDown={() => selectModalSuggestion(index, suggestion)}
                              className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs flex justify-between items-center"
                            >
                              <div>
                                <div className="font-bold text-slate-800">{suggestion.full_name}</div>
                                {suggestion.passport_number && (
                                  <div className="text-[10px] text-gray-500 font-mono">HC: {suggestion.passport_number}</div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-blue-600 font-bold">{suggestion.phone || 'Chưa có SĐT'}</div>
                                {suggestion.dob && (
                                  <div className="text-[10px] text-gray-400">NS: {suggestion.dob}</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* gender */}
                    <div className="md:col-span-2">
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
                        value={p.gender || ''}
                        onChange={val => updatePassenger(index, 'gender', val)}
                        className="w-full"
                        buttonClassName="w-full h-9 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-semibold text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none cursor-pointer"
                      />
                    </div>

                    {/* dob */}
                    <div className="md:col-span-3">
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                        Ngày sinh (DOB)
                      </label>
                      <DatePicker 
                        value={p.dob} 
                        onChange={val => updatePassenger(index, 'dob', val)} 
                        align="right"
                      />
                    </div>

                    {/* nationality */}
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                        Quốc tịch
                      </label>
                      <input 
                        type="text" 
                        placeholder="VN" 
                        value={p.nationality || ''} 
                        onChange={e => updatePassenger(index, 'nationality', e.target.value.toUpperCase())} 
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-bold text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none uppercase" 
                      />
                    </div>
                  </div>

                  {/* Row 2: Passport Info */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* passport_number */}
                    <div className="relative">
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                        Số hộ chiếu (Passport)
                      </label>
                      <input 
                        type="text" 
                        placeholder="Nhập số hộ chiếu" 
                        value={p.passport_number} 
                        onChange={e => updatePassenger(index, 'passport_number', e.target.value.toUpperCase())} 
                        onFocus={() => {
                          setActivePaxIndex(index);
                          setActivePaxField('passport_number');
                        }}
                        onBlur={() => setTimeout(() => {
                          setActivePaxIndex(null);
                          setActivePaxField(null);
                        }, 250)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none uppercase font-semibold placeholder:font-normal placeholder:text-gray-300" 
                      />
                      {activePaxIndex === index && activePaxField === 'passport_number' && modalSuggestions.length > 0 && (
                        <div className="absolute z-50 w-full bg-white border border-slate-300 rounded-lg mt-1 max-h-40 overflow-y-auto shadow-xl divide-y divide-slate-100">
                          {modalSuggestions.map(suggestion => (
                            <div 
                              key={suggestion.id}
                              onMouseDown={() => selectModalSuggestion(index, suggestion)}
                              className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs flex justify-between items-center"
                            >
                              <div>
                                <div className="font-bold text-slate-800">{suggestion.full_name}</div>
                                {suggestion.passport_number && (
                                  <div className="text-[10px] text-gray-500 font-mono">HC: {suggestion.passport_number}</div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-blue-600 font-bold">{suggestion.phone || 'Chưa có SĐT'}</div>
                                {suggestion.dob && (
                                  <div className="text-[10px] text-gray-400">NS: {suggestion.dob}</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* passport_issue_date */}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                        Ngày cấp hộ chiếu (DOI)
                      </label>
                      <DatePicker 
                        value={p.passport_issue_date || ''} 
                        onChange={val => updatePassenger(index, 'passport_issue_date', val)} 
                        align="right"
                      />
                    </div>

                    {/* passport_expiry_date */}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                        Ngày hết hạn hộ chiếu (DOE)
                      </label>
                      <DatePicker 
                        value={p.passport_expiry_date || ''} 
                        onChange={val => updatePassenger(index, 'passport_expiry_date', val)} 
                        align="right"
                      />
                    </div>
                  </div>
                </div>

                {/* Visa Service Option */}
                {tourPriceVisa > 0 && (
                  <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-white p-2 rounded-lg border border-blue-100 shadow-sm">
                        <CheckCircle2 className={`w-5 h-5 ${p.needs_visa_service ? 'text-blue-600' : 'text-gray-300'}`} />
                      </div>
                      <div>
                        <div className="text-xs font-black text-blue-800">Đăng ký làm Visa qua Tour</div>
                        <div className="text-[10px] text-blue-600 font-bold">Phí dịch vụ: +{tourPriceVisa.toLocaleString('vi-VN')} đ</div>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={p.needs_visa_service}
                        onChange={e => updatePassenger(index, 'needs_visa_service', e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                )}

                {/* Document Upload Area */}
                <div className="border-t border-slate-200/60 pt-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-500" />
                      <span className="text-xs font-bold text-slate-700">Tài liệu đính kèm (Hộ chiếu/Visa)</span>
                    </div>

                    <label className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold cursor-pointer transition-colors border border-blue-100">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Chọn file đính kèm</span>
                      <input
                        type="file"
                        multiple
                        onChange={e => e.target.files && handleFileChange(index, e.target.files)}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {((p.passport_url && p.passport_url.trim() !== '') || (p.labor_contract_url && p.labor_contract_url.trim() !== '')) && (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-black text-emerald-800">Sử dụng lại hồ sơ/giấy tờ cũ</span>
                      </div>
                      <div className="space-y-1 pl-6">
                        {p.passport_url && p.passport_url.split(',').filter(Boolean).map((url, uidx) => {
                          const nameMatch = url.match(/#filename=(.*)$/);
                          const filename = nameMatch ? decodeURIComponent(nameMatch[1]) : `Hộ chiếu đính kèm #${uidx + 1}`;
                          return (
                            <div key={`pass-${uidx}`} className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                              <span className="truncate max-w-[80%]">{filename}</span>
                              <span className="text-[9px] text-emerald-500 font-normal italic font-sans">(Sử dụng lại từ GG Drive)</span>
                            </div>
                          );
                        })}
                        {p.labor_contract_url && p.labor_contract_url.split(',').filter(Boolean).map((url, uidx) => {
                          const nameMatch = url.match(/#filename=(.*)$/);
                          const filename = nameMatch ? decodeURIComponent(nameMatch[1]) : `HĐ lao động đính kèm #${uidx + 1}`;
                          return (
                            <div key={`labor-${uidx}`} className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                              <span className="truncate max-w-[80%]">{filename}</span>
                              <span className="text-[9px] text-emerald-500 font-normal italic font-sans">(Sử dụng lại từ GG Drive)</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {p.files && p.files.length > 0 ? (
                    <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                      {p.files.map((file, fileIdx) => (
                        <div key={fileIdx} className="flex items-center justify-between px-3 py-2 text-xs">
                          <span className="font-semibold text-slate-700 truncate max-w-[80%]">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => removeFile(index, fileIdx)}
                            className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    !((p.passport_url && p.passport_url.trim() !== '') || (p.labor_contract_url && p.labor_contract_url.trim() !== '')) && (
                      <div className="text-[10px] text-gray-400 italic font-medium bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        Chưa chọn tài liệu đính kèm nào cho hành khách này. Bạn có thể chọn file ảnh, PDF, v.v. Tất cả sẽ được tự động tải lên hệ thống khi click "Xác nhận & Chốt chỗ".
                      </div>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-150 px-6 py-4 flex justify-end gap-3 shrink-0">
          <button 
            type="button"
            onClick={onClose} 
            disabled={isUploading}
            className="px-4 py-2 border border-slate-250 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-600 transition-all shadow-sm"
          >
            Hủy bỏ
          </button>
          <button 
            type="button"
            onClick={handleConfirm} 
            disabled={isUploading}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg text-xs font-black shadow-md shadow-emerald-600/10 transition-all flex items-center gap-2"
          >
            {isUploading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Đang lưu hồ sơ...</span>
              </>
            ) : (
              <span>Xác nhận & Chốt chỗ</span>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
