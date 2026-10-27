import React, { useState, useEffect } from 'react';
import { Camera, UploadCloud, X, Check, Image as ImageIcon, FileImage, Sparkles, FolderCheck, AlertCircle, ExternalLink, RefreshCw, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Tour, TourMedia } from '../types';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import { compressImage } from '../lib/imageCompression';
import { savePendingUpload, syncPendingUploads, getPendingUploads } from '../lib/offlineSync';
import ActionModal from './ActionModal';

interface HDVQuickUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTourId?: string;
}

export const HDVQuickUploadModal: React.FC<HDVQuickUploadModalProps> = ({
  isOpen,
  onClose,
  defaultTourId
}) => {
  const { tours, tourMedia, fetchTourMedia, addTourMedia, deleteTourMedia, currentRole } = useCRM();
  const { user } = useAuth();

  // Filter valid tours (exclude visa)
  const availableTours = tours.filter(t => t.tour_type !== 'visa');
  const [selectedTourId, setSelectedTourId] = useState<string>(
    defaultTourId || (availableTours.length > 0 ? availableTours[0].id : '')
  );
  const [caption, setCaption] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [photoToDelete, setPhotoToDelete] = useState<TourMedia | null>(null);

  useEffect(() => {
    if (defaultTourId) {
      setSelectedTourId(defaultTourId);
    } else if (availableTours.length > 0) {
      setSelectedTourId(availableTours[0].id);
    }
  }, [defaultTourId, isOpen]);

  useEffect(() => {
    if (isOpen && selectedTourId && fetchTourMedia) {
      fetchTourMedia(selectedTourId);
    }
  }, [isOpen, selectedTourId]);

  if (!isOpen) return null;

  const currentTour = availableTours.find(t => t.id === selectedTourId) || availableTours[0];
  const currentTourPhotos = (tourMedia || []).filter(
    m => (m.tour_id && currentTour?.id && m.tour_id === currentTour.id) ||
         (m.tour_code && currentTour?.code && m.tour_code.toUpperCase() === currentTour.code.toUpperCase())
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...filesArray]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeleteUploadedPhoto = (item: TourMedia) => {
    if (!item.id) return;
    setPhotoToDelete(item);
  };

  const confirmDeletePhoto = async () => {
    if (!photoToDelete) return;
    try {
      await deleteTourMedia(photoToDelete.id, photoToDelete.file_url);
      toast.success('Đã xóa ảnh thành công!');
      if (currentTour?.id && fetchTourMedia) {
        fetchTourMedia(currentTour.id);
      }
    } catch (err: any) {
      toast.error('Có lỗi xảy ra khi xóa ảnh!');
    } finally {
      setPhotoToDelete(null);
    }
  };

  const handleUpload = async () => {
    if (!currentTour) {
      toast.error('Vui lòng chọn Tour để tải ảnh lên');
      return;
    }
    if (selectedFiles.length === 0) {
      toast.error('Vui lòng chọn hoặc chụp ít nhất 1 hình ảnh');
      return;
    }

    setIsUploading(true);
    setUploadProgress({ current: 0, total: selectedFiles.length });

    let successCount = 0;
    let offlineSavedCount = 0;
    let supabaseCount = 0;
    let lastDriveError = '';
    const uploaderName = user?.email || (currentRole === 'tour_guide' ? 'Hướng Dẫn Viên' : 'Điều Hành Tour');

    for (let i = 0; i < selectedFiles.length; i++) {
      const originalFile = selectedFiles[i];
      setUploadProgress({ current: i + 1, total: selectedFiles.length });

      // Compress image client-side to < 1MB
      let compressedFile: File = originalFile;
      try {
        compressedFile = await compressImage(originalFile, {
          maxSizeBytes: 1024 * 1024,
          maxDimension: 1920,
          initialQuality: 0.82
        });
      } catch (e) {
        console.warn('Lỗi nén ảnh, sử dụng file gốc:', e);
      }

      if (!navigator.onLine) {
        // Save offline
        await savePendingUpload({
          id: `offline_${Date.now()}_${i}`,
          tour_id: currentTour.id,
          tour_code: currentTour.code,
          file_name: compressedFile.name,
          file_blob: compressedFile,
          caption: caption.trim() || undefined,
          uploaded_by: uploaderName,
          uploader_role: currentRole,
          created_at: new Date().toISOString()
        });
        offlineSavedCount++;
        continue;
      }

      try {
        const formData = new FormData();
        formData.append('file', compressedFile);
        formData.append('uploadType', 'tour_media');
        formData.append('tourCode', currentTour.code);
        formData.append('tourId', currentTour.id);
        formData.append('category', 'tour_media');
        formData.append('stt', String(i + 1));
        formData.append('uploader', uploaderName);
        formData.append('uploaderRole', currentRole);
        formData.append('caption', caption.trim());
        formData.append('strictDriveOnly', 'true');

        // Upload to server endpoint
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const responseText = await response.text();
        let data: any = {};
        try {
          data = JSON.parse(responseText);
        } catch (parseErr) {
          data = { error: `Lỗi kết nối máy chủ (${response.status})` };
        }

        if (!response.ok || data.error || !data.url) {
          throw new Error(data.error || 'Lỗi không thể lưu file lên Google Drive');
        }

        const uploadedUrl = data.url;
        if (data.storage === 'supabase') {
          supabaseCount++;
          if (data.error) lastDriveError = data.error;
        }

        await addTourMedia({
          id: data.media?.id,
          tour_id: currentTour.id,
          tour_code: currentTour.code,
          file_url: uploadedUrl,
          file_id: data.fileId || '',
          file_name: data.fileName || compressedFile.name,
          file_size: compressedFile.size,
          uploaded_by: uploaderName,
          uploader_role: currentRole,
          caption: caption.trim() || undefined
        });
        successCount++;
      } catch (err: any) {
        console.error('Upload photo failed:', err);
        toast.error(`Ảnh #${i + 1} tải lên thất bại: ${err.message || 'Không thể lưu lên Google Drive'}`);
      }
    }

    setIsUploading(false);

    if (currentTour?.id && fetchTourMedia) {
      fetchTourMedia(currentTour.id);
    }

    if (offlineSavedCount > 0) {
      toast.success(`💾 Đã lưu tạm ${offlineSavedCount} ảnh offline! Hệ thống sẽ tự động đồng bộ khi có mạng.`, { duration: 6000 });
      setSelectedFiles([]);
      setCaption('');
    } else if (successCount > 0) {
      if (supabaseCount > 0) {
        toast(
          `⚠️ Đã tải lên thành công ${successCount}/${selectedFiles.length} ảnh, tuy nhiên ${supabaseCount} ảnh phải lưu tạm trên Supabase do kết nối Google Drive của đoàn bị lỗi` +
          (lastDriveError ? `: ${lastDriveError}` : '.'),
          { duration: 10000 }
        );
      } else {
        toast.success(`🎉 Tải lên thành công ${successCount}/${selectedFiles.length} ảnh đoàn lên Google Drive!`, { duration: 5000 });
      }
      setSelectedFiles([]);
      setCaption('');
    } else {
      toast.error('❌ Tải ảnh thất bại. Vui lòng kiểm tra lại kết nối Google Drive và thử lại!', { duration: 5000 });
    }
  };

  return (
    <>
      <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-slate-900/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden my-auto"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-600 via-emerald-600 to-blue-600 p-4 sm:p-5 text-white flex items-center justify-between relative overflow-hidden">
            <div className="flex items-center gap-3 z-10">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-inner">
                <Camera className="w-6 h-6 animate-pulse text-amber-300" />
              </div>
              <div>
                <h3 className="font-bold text-base sm:text-lg leading-snug">Upload Ảnh Đoàn Nhanh</h3>
                <p className="text-xs text-teal-100">Dành riêng cho Hướng Dẫn Viên (HDV) & Điều Hành Tour</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Tour selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                Tour Cần Tải Ảnh: <span className="text-red-500">*</span>
              </label>
              {defaultTourId && currentTour ? (
                <div className="p-3 bg-teal-50 border border-teal-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-teal-700 text-white font-mono font-black text-xs tracking-wide shadow-xs shrink-0">
                      {currentTour.code}
                    </span>
                    <span className="font-bold text-xs text-teal-950">{currentTour.name}</span>
                  </div>
                  {currentTour.guide_name && (
                    <span className="text-[11px] font-bold text-teal-700 bg-teal-100/80 px-2 py-0.5 rounded-md self-start sm:self-auto shrink-0">
                      HDV: {currentTour.guide_name}
                    </span>
                  )}
                </div>
              ) : (
                <>
                  <select
                    value={selectedTourId}
                    onChange={(e) => setSelectedTourId(e.target.value)}
                    className="w-full max-w-full overflow-hidden text-ellipsis h-9 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 cursor-pointer transition-all"
                  >
                    {availableTours.length === 0 ? (
                      <option value="">(Chưa có danh sách Tour nào)</option>
                    ) : (
                      availableTours.map(t => {
                        const shortName = t.name.length > 28 ? `${t.name.slice(0, 28)}...` : t.name;
                        return (
                          <option key={t.id} value={t.id} title={`[${t.code}] ${t.name}`}>
                            [{t.code}] {shortName}
                          </option>
                        );
                      })
                    )}
                  </select>
                  {currentTour && (
                    <div className="mt-1.5 px-3 py-1.5 bg-teal-50 border border-teal-200/80 rounded-lg text-xs text-teal-800 flex items-center justify-between">
                      <span className="font-bold">Mã tour: {currentTour.code}</span>
                      <span className="text-[11px] text-teal-600">HDV: {currentTour.guide_name || 'Chưa gán'}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Quick Camera & File Input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                Chụp Ảnh Hoặc Chọn Từ Máy: <span className="text-red-500">*</span>
              </label>

              <label className="flex flex-col items-center justify-center p-5 bg-teal-50/80 hover:bg-teal-100 border-2 border-dashed border-teal-400 rounded-2xl cursor-pointer transition-all active:scale-98 text-center group">
                <div className="w-12 h-12 rounded-full bg-teal-600 text-white flex items-center justify-center mb-2 shadow-md group-hover:scale-105 transition-transform">
                  <Camera className="w-6 h-6 text-amber-300" />
                </div>
                <span className="text-xs font-extrabold text-teal-900">Chụp Ảnh Hoặc Chọn Từ Thư Viện</span>
                <span className="text-[11px] text-teal-600 mt-0.5">Nhấn vào đây để mở máy ảnh hoặc chọn nhiều ảnh cùng lúc</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* Selected files preview */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                  <span>Đã chọn ({selectedFiles.length} ảnh):</span>
                  <button
                    onClick={() => setSelectedFiles([])}
                    className="text-red-600 hover:underline text-[11px]"
                  >
                    Xóa tất cả
                  </button>
                </div>

                <div className="space-y-1.5 max-h-40 overflow-y-auto p-1 bg-gray-50 border border-gray-200 rounded-xl">
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-white border border-gray-200 shadow-2xs">
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <div className="w-7 h-7 rounded-md bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                          <FileImage className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-800 truncate">{file.name}</p>
                          <p className="text-[10px] text-gray-500 font-medium">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors shrink-0"
                        title="Xóa khỏi danh sách"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Optional caption */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Ghi Chú / Chú Thích Ảnh (Tùy chọn):
              </label>
              <input
                type="text"
                placeholder="VD: Đoàn check-in sân bay, bữa tối giao lưu..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Progress indicator */}
            {isUploading && (
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-teal-800">
                  <span>Đang tải ảnh lên hệ thống...</span>
                  <span>{uploadProgress.current} / {uploadProgress.total}</span>
                </div>
                <div className="w-full bg-teal-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-teal-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* List of Photos Uploaded to Server for this Tour */}
            {currentTour && (
              <div className="pt-3 border-t border-gray-200 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-gray-800 flex items-center gap-1.5">
                    <FolderCheck className="w-4 h-4 text-teal-600" />
                    <span>Ảnh đoàn đã tải lên ({currentTourPhotos.length} ảnh):</span>
                  </h4>
                  {fetchTourMedia && (
                    <button
                      type="button"
                      onClick={() => fetchTourMedia(currentTour.id)}
                      className="text-[11px] text-teal-600 hover:text-teal-800 hover:underline font-bold flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Làm mới</span>
                    </button>
                  )}
                </div>

                {currentTourPhotos.length === 0 ? (
                  <div className="p-3 text-center bg-gray-50 border border-dashed border-gray-200 rounded-xl text-xs text-gray-400 font-medium">
                    Chưa có ảnh nào được tải lên cho tour {currentTour.code}
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {currentTourPhotos.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="flex items-center justify-between p-2 rounded-xl bg-gray-50 border border-gray-200 hover:border-teal-300 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                            <FileImage className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-800 truncate">
                              {item.file_name || item.caption || `Ảnh đoàn ${idx + 1}`}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-gray-500">
                              {item.caption && (
                                <span className="text-gray-700 font-semibold truncate max-w-[140px]">{item.caption} • </span>
                              )}
                              <span>{item.uploaded_by || 'HDV'}</span>
                              {item.created_at && (
                                <span>• {new Date(item.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <a
                            href={item.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 text-[11px] font-bold text-teal-700 bg-white border border-teal-200 hover:bg-teal-50 rounded-lg transition-colors flex items-center gap-1 shrink-0"
                          >
                            <span>Xem</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleDeleteUploadedPhoto(item)}
                            className="px-2 py-1 text-[11px] font-bold text-red-600 bg-white border border-red-200 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors flex items-center gap-1 shrink-0"
                            title="Xóa ảnh này khỏi đoàn tour"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Xóa</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer controls */}
          <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleUpload}
              disabled={isUploading || selectedFiles.length === 0}
              className="px-5 py-2.5 text-xs font-extrabold text-white bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-98"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{isUploading ? 'Đang Tải Lên...' : `Tải Lên ${selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}`}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
    <ActionModal
      isOpen={!!photoToDelete}
      onClose={() => setPhotoToDelete(null)}
      title="Xác nhận xóa ảnh"
      message={`Bạn có chắc chắn muốn xóa ảnh "${photoToDelete?.file_name || 'này'}" khỏi đoàn tour không?`}
      onConfirm={() => { confirmDeletePhoto(); }}
    />
    </>
  );
};
