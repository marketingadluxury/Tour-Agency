import React, { useState, useRef, useEffect } from 'react';
import { Camera, Image as ImageIcon, FileImage, Upload, X, CheckCircle2, AlertCircle, Loader2, Sparkles, ExternalLink, FolderCheck, RefreshCw, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import { compressImage as compressImageUtil } from '../lib/imageCompression';
import { savePendingUpload } from '../lib/offlineSync';
import { TourMedia } from '../types';
import ActionModal from './ActionModal';

interface TourMediaUploaderProps {
  tourId: string;
  tourCode: string;
  tourName?: string;
  onUploadSuccess?: () => void;
  onClose?: () => void;
}

export const compressImage = (file: File, maxWidth = 1920, maxHeight = 1080, quality = 0.82): Promise<{ blob: Blob; fileName: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Image compression failed'));
              return;
            }
            const cleanName = file.name.replace(/\.[^/.]+$/, "") + '.jpg';
            resolve({ blob, fileName: cleanName });
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export const TourMediaUploader: React.FC<TourMediaUploaderProps> = ({
  tourId,
  tourCode,
  tourName,
  onUploadSuccess,
  onClose
}) => {
  const { tourMedia, fetchTourMedia, addTourMedia, deleteTourMedia, currentRole } = useCRM();
  const { profile, user } = useAuth();

  const [photoToDelete, setPhotoToDelete] = useState<TourMedia | null>(null);

  const handleDeleteUploadedPhoto = (item: TourMedia) => {
    if (!item.id) return;
    setPhotoToDelete(item);
  };

  const confirmDeletePhoto = async () => {
    if (!photoToDelete) return;
    try {
      await deleteTourMedia(photoToDelete.id, photoToDelete.file_url);
      toast.success('Đã xóa ảnh thành công!');
      if (tourId && fetchTourMedia) {
        fetchTourMedia(tourId);
      }
    } catch (err: any) {
      toast.error('Có lỗi xảy ra khi xóa ảnh!');
    } finally {
      setPhotoToDelete(null);
    }
  };
  
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [selectedFiles, setSelectedFiles] = useState<{ file: File; preview: string; caption: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUploadingIndex, setCurrentUploadingIndex] = useState(0);

  useEffect(() => {
    if (tourId && fetchTourMedia) {
      fetchTourMedia(tourId);
    }
  }, [tourId]);

  const currentTourPhotos = (tourMedia || []).filter(
    m => (m.tour_id && m.tour_id === tourId) ||
         (m.tour_code && tourCode && m.tour_code.toUpperCase() === tourCode.toUpperCase())
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const filesArray = Array.from(e.target.files);

    const newItems = filesArray.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      caption: ''
    }));

    setSelectedFiles(prev => [...prev, ...newItems]);
    // Reset input
    e.target.value = '';
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => {
      const next = [...prev];
      URL.revokeObjectURL(next[index].preview);
      next.splice(index, 1);
      return next;
    });
  };

  const handleCaptionChange = (index: number, caption: string) => {
    setSelectedFiles(prev => {
      const next = [...prev];
      next[index].caption = caption;
      return next;
    });
  };

  const handleStartUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 ảnh');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setCurrentUploadingIndex(0);

    const total = selectedFiles.length;
    let successCount = 0;
    let offlineSavedCount = 0;
    let supabaseCount = 0;
    let lastDriveError = '';
    const uploaderName = profile?.full_name || user?.email || 'Hướng Dẫn Viên';
    const uploaderRole = currentRole || 'tour_guide';

    for (let i = 0; i < total; i++) {
      setCurrentUploadingIndex(i + 1);
      const item = selectedFiles[i];

      try {
        // Step 1: Compress image client side to < 1MB
        const compressedFile = await compressImageUtil(item.file, {
          maxSizeBytes: 1024 * 1024,
          maxDimension: 1920,
          initialQuality: 0.82
        });

        if (!navigator.onLine) {
          await savePendingUpload({
            id: `offline_${Date.now()}_${i}`,
            tour_id: tourId,
            tour_code: tourCode,
            file_name: compressedFile.name,
            file_blob: compressedFile,
            caption: item.caption || `Ảnh kỷ niệm ${tourCode} (${i + 1})`,
            uploaded_by: uploaderName,
            uploader_role: uploaderRole,
            created_at: new Date().toISOString()
          });
          offlineSavedCount++;
          setUploadProgress(Math.round(((i + 1) / total) * 100));
          continue;
        }

        // Step 2: Prepare FormData
        const formData = new FormData();
        formData.append('file', compressedFile);
        formData.append('uploadType', 'tour_media');
        formData.append('tourCode', tourCode);
        formData.append('stt', String(i + 1));
        formData.append('strictDriveOnly', 'true');

        // Step 3: Call Server API /api/upload
        let fileUrl = '';
        let fileId = '';
        let fileName = compressedFile.name;

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });

        const resText = await res.text();
        let data: any = {};
        try {
          data = JSON.parse(resText);
        } catch (pErr) {
          data = { error: `Lỗi kết nối máy chủ (${res.status})` };
        }

        if (!res.ok || data.error || !data.url) {
          throw new Error(data.error || 'Lỗi không thể lưu file lên Google Drive');
        }

        fileUrl = data.url;
        fileId = data.fileId || '';
        fileName = data.fileName || fileName;

        if (data.storage === 'supabase') {
          supabaseCount++;
          if (data.error) lastDriveError = data.error;
        }

        // Step 4: Save record to Database context
        await addTourMedia({
          id: data.media?.id,
          tour_id: tourId,
          tour_code: tourCode,
          file_url: fileUrl,
          file_id: fileId,
          file_name: fileName,
          file_size: compressedFile.size,
          uploaded_by: uploaderName,
          uploader_role: uploaderRole,
          caption: item.caption || `Ảnh kỷ niệm ${tourCode} (${i + 1})`
        });

        successCount++;
      } catch (err: any) {
        console.error(`Lỗi tải ảnh #${i + 1}:`, err);
        toast.error(`Lỗi tải ảnh #${i + 1}: ${err.message || 'Thất bại'}`);
      }

      setUploadProgress(Math.round(((i + 1) / total) * 100));
    }

    setIsUploading(false);

    if (fetchTourMedia && tourId) {
      fetchTourMedia(tourId);
    }

    if (offlineSavedCount > 0) {
      toast.success(`💾 Đã lưu tạm ${offlineSavedCount} ảnh offline! Hệ thống sẽ tự động đồng bộ khi có mạng.`, { duration: 6000 });
      setSelectedFiles([]);
      if (onUploadSuccess) onUploadSuccess();
      // Không tự động tắt giao diện upload
    } else if (successCount > 0) {
      if (supabaseCount > 0) {
        toast(
          `⚠️ Đã tải lên thành công ${successCount}/${total} ảnh, tuy nhiên ${supabaseCount} ảnh phải lưu tạm trên Supabase do kết nối Google Drive của đoàn bị lỗi` +
          (lastDriveError ? `: ${lastDriveError}` : '.'),
          { duration: 10000 }
        );
      } else {
        toast.success(`🎉 Đã tải lên thành công ${successCount}/${total} ảnh đoàn lên Google Drive!`, { duration: 5000 });
      }
      setSelectedFiles([]);
      if (onUploadSuccess) onUploadSuccess();
      // Không tự động tắt giao diện upload
    } else {
      toast.error(`❌ Tải ảnh thất bại (${0}/${total}). Vui lòng kiểm tra lại kết nối!`, { duration: 5000 });
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden max-w-2xl w-full mx-auto">
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
            <Camera className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg leading-tight">Upload Ảnh Đoàn Kỷ Niệm</h3>
            <p className="text-xs text-blue-100 font-medium">
              Tour {tourCode} {tourName ? `• ${tourName}` : ''}
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-2 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="p-6 space-y-6">
        {/* Upload Trigger Buttons for HDV (Mobile-optimized) */}
        {!isUploading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="file"
              ref={cameraInputRef}
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            <input
              type="file"
              ref={galleryInputRef}
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />

            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex items-center justify-center gap-3 p-4 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/50 hover:bg-blue-100/60 text-blue-700 font-semibold transition-all group"
            >
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <Camera className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="block text-sm font-bold">Chụp Ảnh Trực Tiếp</span>
                <span className="block text-xs text-blue-600 font-normal">Mở camera máy ảnh</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="flex items-center justify-center gap-3 p-4 rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50/50 hover:bg-indigo-100/60 text-indigo-700 font-semibold transition-all group"
            >
              <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="block text-sm font-bold">Chọn Từ Thư Viện</span>
                <span className="block text-xs text-indigo-600 font-normal">Chọn nhiều ảnh cùng lúc</span>
              </div>
            </button>
          </div>
        )}

        {/* Selected Files Preview Grid */}
        {selectedFiles.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Danh Sách Ảnh Đã Chọn ({selectedFiles.length})
              </span>
              {!isUploading && (
                <button
                  type="button"
                  onClick={() => setSelectedFiles([])}
                  className="text-xs text-rose-600 hover:underline font-medium"
                >
                  Xóa tất cả
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto p-1 scrollbar-thin">
              {selectedFiles.map((item, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                      <FileImage className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{item.file.name}</p>
                      <p className="text-[10px] text-slate-500 font-medium">{(item.file.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 grow max-w-full sm:max-w-xs">
                    <input
                      type="text"
                      placeholder="Ghi chú ảnh..."
                      value={item.caption}
                      disabled={isUploading}
                      onChange={(e) => handleCaptionChange(idx, e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                    />
                    {!isUploading && (
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                        title="Xóa khỏi danh sách"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Progress Bar */}
        {isUploading && (
          <div className="space-y-2 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                Đang nén & tải lên: {currentUploadingIndex}/{selectedFiles.length} ảnh...
              </span>
              <span className="text-blue-600 font-bold">{uploadProgress}%</span>
            </div>
            <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${uploadProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-[11px] text-slate-500 text-center">
              Ảnh đang được nén tự động để giảm tải dung lượng và tăng tốc độ tải lên.
            </p>
          </div>
        )}

        {/* List of Photos Uploaded to Server for this Tour */}
        <div className="pt-4 border-t border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
              <FolderCheck className="w-4 h-4 text-teal-600" />
              <span>Danh sách ảnh đã tải lên ({currentTourPhotos.length} ảnh):</span>
            </h4>
            {fetchTourMedia && (
              <button
                type="button"
                onClick={() => fetchTourMedia(tourId)}
                className="text-[11px] text-teal-600 hover:text-teal-800 hover:underline font-bold flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Làm mới</span>
              </button>
            )}
          </div>

          {currentTourPhotos.length === 0 ? (
            <div className="p-3 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400 font-medium">
              Chưa có ảnh nào được tải lên cho tour {tourCode}
            </div>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {currentTourPhotos.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-teal-300 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                      <FileImage className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {item.file_name || item.caption || `Ảnh đoàn ${idx + 1}`}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        {item.caption && (
                          <span className="text-slate-700 font-semibold truncate max-w-[140px]">{item.caption} • </span>
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

        {/* Action Footer */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors text-sm"
            >
              Hủy bỏ
            </button>
          )}
          <button
            type="button"
            onClick={handleStartUpload}
            disabled={isUploading || selectedFiles.length === 0}
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-sm shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang Upload...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Tải Lên ({selectedFiles.length} Ảnh)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
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
