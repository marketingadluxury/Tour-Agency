import React, { useState, useEffect } from 'react';
import { Camera, UploadCloud, X, Check, Image as ImageIcon, Sparkles, FolderCheck, AlertCircle, ArrowLeft, RefreshCw, ZoomIn, ShieldCheck, WifiOff, ExternalLink, FileImage, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useCRM } from '../context/CRMContext';
import { TourMedia, Tour } from '../types';
import { format } from 'date-fns';
import { compressImage } from '../lib/imageCompression';
import { savePendingUpload, syncPendingUploads, getPendingUploads } from '../lib/offlineSync';
import ActionModal from '../components/ActionModal';

interface GuestPhotoUploadPageProps {
  defaultTourId?: string;
}

export const GuestPhotoUploadPage: React.FC<GuestPhotoUploadPageProps> = ({ defaultTourId }) => {
  const { tours, addTourMedia, deleteTourMedia, tourMedia, fetchTourMedia } = useCRM();

  // Filter valid tours
  const availableTours = tours.filter(t => t.tour_type !== 'visa');

  const [selectedTourId, setSelectedTourId] = useState<string>(defaultTourId || '');
  const [caption, setCaption] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Synchronize tour ID
  useEffect(() => {
    if (defaultTourId) {
      const match = availableTours.find(t => t.id === defaultTourId || t.code === defaultTourId);
      if (match) {
        setSelectedTourId(match.id);
      } else {
        setSelectedTourId(defaultTourId);
      }
    } else if (availableTours.length > 0 && !selectedTourId) {
      setSelectedTourId(availableTours[0].id);
    }
  }, [defaultTourId, availableTours]);

  const currentTour = availableTours.find(t => t.id === selectedTourId || t.code === selectedTourId) || availableTours[0];

  // Fetch photos for current tour
  useEffect(() => {
    if (currentTour?.id || currentTour?.code) {
      fetchTourMedia(currentTour.id || currentTour.code);
    }
  }, [currentTour?.id, currentTour?.code]);

  const currentTourPhotos = tourMedia.filter(m => {
    if (!currentTour) return false;
    const matchId = m.tour_id && currentTour.id && (m.tour_id === currentTour.id);
    const matchCode = m.tour_code && currentTour.code && (m.tour_code.toUpperCase() === currentTour.code.toUpperCase());
    const matchDefault = defaultTourId && (
      m.tour_id === defaultTourId || 
      (m.tour_code && m.tour_code.toUpperCase() === defaultTourId.toUpperCase())
    );
    return Boolean(matchId || matchCode || matchDefault);
  });
  const [pendingOfflineCount, setPendingOfflineCount] = useState(0);

  // Check pending offline items and handle auto-sync on network reconnect
  const checkAndSyncOfflineItems = async () => {
    const items = await getPendingUploads();
    setPendingOfflineCount(items.length);

    if (items.length > 0 && navigator.onLine) {
      toast.loading(`Đang tự động đồng bộ ${items.length} ảnh lưu tạm khi có mạng...`, { id: 'sync-toast' });
      const res = await syncPendingUploads(addTourMedia, (curr, total) => {
        setUploadProgress({ current: curr, total });
      });
      toast.dismiss('sync-toast');
      if (res.successCount > 0) {
        toast.success(`Đã đồng bộ thành công ${res.successCount} ảnh lưu tạm!`);
        if (currentTour?.id) fetchTourMedia(currentTour.id);
      }
      const remaining = await getPendingUploads();
      setPendingOfflineCount(remaining.length);
    }
  };

  useEffect(() => {
    checkAndSyncOfflineItems();

    const handleOnline = () => {
      toast.success('Đã kết nối lại Internet! Đang đồng bộ dữ liệu...');
      checkAndSyncOfflineItems();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [currentTour?.id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...filesArray]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

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

    for (let i = 0; i < selectedFiles.length; i++) {
      const originalFile = selectedFiles[i];
      setUploadProgress({ current: i + 1, total: selectedFiles.length });

      // Step 1: Compress image client-side to < 1MB
      const compressedFile = await compressImage(originalFile, {
        maxSizeBytes: 1024 * 1024, // 1MB
        maxDimension: 1920,
        initialQuality: 0.82
      });

      // Step 2: Check offline status
      if (!navigator.onLine) {
        // Offline-First mode: save to IndexedDB
        await savePendingUpload({
          id: `offline_${Date.now()}_${i}`,
          tour_id: currentTour.id,
          tour_code: currentTour.code,
          file_name: compressedFile.name,
          file_blob: compressedFile,
          caption: caption.trim() || undefined,
          uploaded_by: 'HDV Freelance',
          uploader_role: 'tour_guide',
          created_at: new Date().toISOString()
        });
        offlineSavedCount++;
        continue;
      }

      // Step 3: Online upload
      try {
        const formData = new FormData();
        formData.append('file', compressedFile);
        formData.append('uploadType', 'tour_media');
        formData.append('tourCode', currentTour?.code || defaultTourId || '');
        formData.append('tourId', currentTour?.id || defaultTourId || '');
        formData.append('uploadTourId', defaultTourId || currentTour?.id || '');
        formData.append('category', 'tour_media');
        formData.append('stt', String(i + 1));
        formData.append('uploader', 'HDV Freelance');
        formData.append('caption', caption.trim());
        formData.append('strictDriveOnly', 'true');

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

        // Add to local state (server already saved record to database)
        await addTourMedia({
          id: data.media?.id,
          tour_id: currentTour?.id || data.media?.tour_id || defaultTourId || '',
          tour_code: data.tourCode || currentTour?.code || defaultTourId || '',
          file_url: uploadedUrl,
          file_id: data.fileId || data.media?.file_id || '',
          file_name: data.fileName || compressedFile.name,
          file_size: compressedFile.size,
          uploaded_by: 'HDV Freelance',
          uploader_role: 'tour_guide',
          caption: caption.trim() || undefined
        });
        successCount++;
      } catch (err: any) {
        console.error('Upload photo to Google Drive failed:', err);
        toast.error(`Ảnh #${i + 1} tải lên thất bại: ${err.message || 'Không thể lưu lên Google Drive'}`);
      }
    }

    setIsUploading(false);

    // Refresh media from server
    if (currentTour?.id || currentTour?.code) {
      fetchTourMedia(currentTour.id || currentTour.code);
    }

    if (offlineSavedCount > 0) {
      toast.success(`💾 Đã lưu tạm ${offlineSavedCount} ảnh offline! Hệ thống sẽ tự động đồng bộ khi có mạng.`, { duration: 6000 });
      setSelectedFiles([]);
      setCaption('');
      checkAndSyncOfflineItems();
    } else if (successCount > 0) {
      if (supabaseCount > 0) {
        toast(
          `⚠️ Đã tải lên thành công ${successCount}/${selectedFiles.length} ảnh, tuy nhiên ${supabaseCount} ảnh phải lưu tạm trên Supabase do kết nối Google Drive của đoàn bị lỗi` +
          (lastDriveError ? `: ${lastDriveError}` : '.'),
          { duration: 10000 }
        );
      } else {
        toast.success(`🎉 Đã tải lên thành công ${successCount}/${selectedFiles.length} ảnh đoàn lên Google Drive!`, { duration: 5000 });
      }
      setSelectedFiles([]);
      setCaption('');
    } else {
      toast.error('❌ Không thể tải lên ảnh. Vui lòng kiểm tra lại kết nối và thử lại!', { duration: 5000 });
    }
  };

  return (
    <>
      <div className="min-h-screen bg-slate-50 text-slate-800 pb-12">
      {/* Top Header */}
      <header className="bg-gradient-to-r from-teal-700 via-emerald-700 to-teal-800 text-white shadow-md sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
              <Camera className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h1 className="font-black text-sm sm:text-base tracking-tight leading-snug">
                UPLOAD ÁNH ĐOÀN NHANH
              </h1>
              <p className="text-[11px] text-teal-100 font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-300" />
                Tour CRM • Dành cho HDV Freelance
              </p>
            </div>
          </div>
          <a
            href="/"
            className="text-xs text-white/80 hover:text-white font-bold underline px-2.5 py-1 rounded-lg bg-white/10"
          >
            Đăng nhập
          </a>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
        {/* Info Banner */}
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 shadow-xs">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-950 leading-relaxed">
            <strong className="font-extrabold">Trải nghiệm tự động cho HDV:</strong> Bạn đang ở giao diện upload trực tiếp ảnh kỷ niệm đoàn. Ảnh tải lên sẽ tự động đồng bộ vào album Drive của công ty.
          </div>
        </div>

        {/* Upload Card - Same UI style as Modal */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          {/* Card Header */}
          <div className="bg-gradient-to-r from-teal-600 to-emerald-600 p-4 sm:p-5 text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
              <UploadCloud className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-black text-base">Upload Ảnh Đoàn</h2>
              <p className="text-xs text-teal-100">Chọn hoặc chụp ảnh kỷ niệm đoàn từ điện thoại</p>
            </div>
          </div>

          <div className="p-5 space-y-5">
            {/* Tour Badge or Tour Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Tour Cần Tải Ảnh: <span className="text-red-500">*</span>
              </label>

              {defaultTourId && currentTour ? (
                <div className="p-3.5 bg-teal-50 border border-teal-300/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="px-2.5 py-1 rounded-xl bg-teal-700 text-white font-mono font-black text-xs tracking-wide shadow-xs shrink-0">
                      {currentTour.code}
                    </span>
                    <span className="font-bold text-xs sm:text-sm text-teal-950 line-clamp-2">{currentTour.name}</span>
                  </div>
                  {currentTour.guide_name && (
                    <span className="text-[11px] font-extrabold text-teal-800 bg-teal-100 px-2.5 py-1 rounded-lg self-start sm:self-auto shrink-0">
                      HDV: {currentTour.guide_name}
                    </span>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <select
                    value={selectedTourId}
                    onChange={(e) => setSelectedTourId(e.target.value)}
                    className="w-full h-9 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 cursor-pointer outline-none transition-all"
                  >
                    {availableTours.length === 0 ? (
                      <option value="">(Chưa có danh sách Tour nào)</option>
                    ) : (
                      availableTours.map(t => (
                        <option key={t.id} value={t.id}>
                          [{t.code}] {t.name}
                        </option>
                      ))
                    )}
                  </select>
                  {currentTour && (
                    <div className="px-3.5 py-2 bg-teal-50 border border-teal-200/80 rounded-xl text-xs text-teal-800 flex items-center justify-between font-bold">
                      <span>Mã tour: {currentTour.code}</span>
                      <span className="text-teal-600 font-medium">HDV: {currentTour.guide_name || 'Chưa gán'}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Dotted Capture / Select Zone */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Chụp Ảnh Hoặc Chọn Từ Máy: <span className="text-red-500">*</span>
              </label>

              <label className="relative flex flex-col items-center justify-center p-6 sm:p-8 border-2 border-dashed border-teal-400/80 hover:border-teal-600 bg-teal-50/40 hover:bg-teal-50 rounded-2xl cursor-pointer transition-all group">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-full bg-teal-500 group-hover:scale-105 text-white flex items-center justify-center shadow-lg transition-transform mb-3">
                  <Camera className="w-7 h-7" />
                </div>
                <p className="font-extrabold text-sm text-teal-950 text-center">
                  Chụp Ảnh Hoặc Chọn Từ Thư Viện
                </p>
                <p className="text-xs text-slate-500 text-center mt-1">
                  Nhấn vào đây để mở máy ảnh hoặc chọn nhiều ảnh cùng lúc
                </p>
              </label>
            </div>

            {/* Preview Selected Files */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    Đã chọn ({selectedFiles.length} ảnh):
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedFiles([])}
                    className="text-xs text-red-600 hover:underline font-semibold"
                  >
                    Xóa tất cả
                  </button>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto p-1">
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                          <FileImage className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{file.name}</p>
                          <p className="text-[10px] text-slate-500 font-medium">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                        title="Xóa khỏi danh sách"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Caption Input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Ghi Chú / Chú Thích Ảnh (Tùy chọn):
              </label>
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="VD: Đoàn check-in sân bay, bữa tối giao lưu..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-teal-500 bg-white"
              />
            </div>

            {/* Uploading Progress Indicator */}
            {isUploading && (
              <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-xl space-y-2">
                <div className="flex justify-between text-xs font-bold text-teal-900">
                  <span>Đang tải lên máy chủ...</span>
                  <span>{uploadProgress.current}/{uploadProgress.total}</span>
                </div>
                <div className="w-full bg-teal-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-teal-600 h-full transition-all duration-300"
                    style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleUpload}
                disabled={isUploading || selectedFiles.length === 0}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-extrabold text-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Đang Tải Lên...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-5 h-5" />
                    <span>Tải Lên ({selectedFiles.length} Ảnh)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Existing Uploaded Photos Album for this Tour */}
        {currentTour && (
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-teal-600" />
                  Ảnh Đoàn Đã Tải Lên ({currentTourPhotos.length})
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Mã tour: {currentTour.code}</p>
              </div>
              <button
                type="button"
                onClick={() => fetchTourMedia(currentTour.id)}
                className="p-2 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                title="Làm mới"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {currentTourPhotos.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Camera className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-medium">Chưa có ảnh nào được tải lên cho đoàn này.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {currentTourPhotos.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-teal-50/70 border border-slate-200/80 transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                        <FileImage className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate group-hover:text-teal-700 transition-colors">
                          {item.file_name || item.caption || `Ảnh đoàn ${idx + 1}`}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                          {item.caption && item.file_name && (
                            <span className="font-semibold text-slate-600 truncate max-w-[180px]">{item.caption}</span>
                          )}
                          {item.created_at && (
                            <span>• {format(new Date(item.created_at), 'HH:mm dd/MM/yyyy')}</span>
                          )}
                          {item.uploaded_by && (
                            <span className="hidden sm:inline">• {item.uploaded_by}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={item.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-white border border-slate-200 hover:border-teal-500 text-slate-700 hover:text-teal-700 rounded-xl transition-all shadow-2xs flex items-center gap-1 text-xs font-bold"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Xem</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDeleteUploadedPhoto(item)}
                        className="px-2.5 py-1.5 bg-white border border-red-200 hover:border-red-400 text-red-600 hover:text-red-700 rounded-xl transition-all shadow-2xs flex items-center gap-1 text-xs font-bold"
                        title="Xóa ảnh này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Fullscreen Image Preview Lightbox */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewImage(null)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          >
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 text-white hover:text-red-400 p-2 rounded-full bg-white/10 backdrop-blur-md"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
            />
          </motion.div>
        )}
      </AnimatePresence>
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
