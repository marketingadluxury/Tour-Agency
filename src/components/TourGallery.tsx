import React, { useState } from 'react';
import { Image as ImageIcon, Download, Copy, Trash2, Plus, Maximize2, ChevronLeft, ChevronRight, X, ExternalLink, User, Calendar, FolderCheck, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { TourMedia, Tour } from '../types';
import { useCRM } from '../context/CRMContext';
import { TourMediaUploader } from './TourMediaUploader';
import ActionModal from './ActionModal';

interface TourGalleryProps {
  tour: Tour;
  canUpload?: boolean;
}

export const TourGallery: React.FC<TourGalleryProps> = ({ tour, canUpload = true }) => {
  const { tourMedia, deleteTourMedia, currentRole } = useCRM();
  
  const [showUploader, setShowUploader] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Filter media belonging to this tour
  const tourPhotos = tourMedia.filter(m => m.tour_id === tour.id || m.tour_code === tour.code);

  const handleCopyAlbumLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success('Đã sao chép liên kết album kỷ niệm đoàn!');
  };

  const handleDownloadImage = (photo: TourMedia) => {
    const link = document.createElement('a');
    link.href = photo.file_url;
    link.target = '_blank';
    link.download = photo.file_name || `${tour.code}_anh_doan.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Đang tải ảnh xuống...');
  };

  const handleDownloadAll = () => {
    if (tourPhotos.length === 0) {
      toast.error('Chưa có ảnh nào trong album đoàn');
      return;
    }
    toast.success(`Đang mở ${tourPhotos.length} ảnh trong tab mới...`);
    tourPhotos.forEach((photo, idx) => {
      setTimeout(() => {
        window.open(photo.file_url, '_blank');
      }, idx * 300);
    });
  };

  const [photoToDelete, setPhotoToDelete] = useState<TourMedia | null>(null);

  const handleDeletePhoto = (photo: TourMedia) => {
    setPhotoToDelete(photo);
  };

  const confirmDeletePhoto = async () => {
    if (!photoToDelete) return;
    try {
      await deleteTourMedia(photoToDelete.id, photoToDelete.file_url);
      toast.success('Đã xóa ảnh đoàn');
      if (lightboxIndex !== null) setLightboxIndex(null);
    } catch (err) {
      toast.error('Không thể xóa ảnh');
    } finally {
      setPhotoToDelete(null);
    }
  };

  const activePhoto = lightboxIndex !== null ? tourPhotos[lightboxIndex] : null;

  return (
    <>
      <div className="space-y-6">
      {/* Header Banner & Quick Actions */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
              ALBUM ĐOÀN
            </span>
            <span className="text-slate-400 text-xs">Mã Tour: {tour.code}</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-blue-400" />
            Ảnh Kỷ Niệm Chuyến Đi ({tourPhotos.length})
          </h2>
          <p className="text-xs text-slate-300">
            {tour.name} • HDV: {tour.guide_name || 'Chưa phân công'}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2.5 z-10 w-full md:w-auto">
          <button
            type="button"
            onClick={handleCopyAlbumLink}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs backdrop-blur-md border border-white/10 transition-all"
          >
            <Share2 className="w-4 h-4 text-amber-400" />
            Sao chép link album
          </button>

          {tourPhotos.length > 0 && (
            <button
              type="button"
              onClick={handleDownloadAll}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs backdrop-blur-md border border-white/10 transition-all"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              Tải trọn bộ ({tourPhotos.length})
            </button>
          )}

          {canUpload && (
            <button
              type="button"
              onClick={() => setShowUploader(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-500/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              Upload Ảnh Mới
            </button>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploader && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl my-auto"
            >
              <TourMediaUploader
                tourId={tour.id}
                tourCode={tour.code}
                tourName={tour.name}
                onClose={() => setShowUploader(false)}
                onUploadSuccess={() => setShowUploader(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Empty State / Direct Drive Access */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-blue-50/70 p-4 rounded-xl border border-blue-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <FolderCheck className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-gray-900">Thư Mục Ảnh Trên Google Drive</h3>
              <p className="text-xs text-gray-600">Toàn bộ ảnh do Hướng Dẫn Viên tải lên cho đoàn tour {tour.code} đều được tự động lưu tại thư mục này.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={async () => {
              const toastId = toast.loading(`Đang kết nối thư mục Drive...`);
              try {
                const res = await fetch('/api/get-tour-folder', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ tourCode: tour.code, subFolder: 'Ảnh đoàn' }),
                });
                const data = await res.json();
                toast.dismiss(toastId);
                if (data.success && data.folderUrl) {
                  window.open(data.folderUrl, '_blank');
                } else {
                  window.open(`https://drive.google.com/drive/search?q=${encodeURIComponent(tour.code)}`, '_blank');
                }
              } catch (err) {
                toast.dismiss(toastId);
                window.open(`https://drive.google.com/drive/search?q=${encodeURIComponent(tour.code)}`, '_blank');
              }
            }}
            className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 shrink-0"
          >
            <FolderCheck className="w-4 h-4 text-amber-300" />
            <span>Mở Thư Mục Google Drive</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Direct Google Drive Folder Link */}
        <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 text-center space-y-2">
          <p className="text-xs text-slate-600">
            Tất cả hình ảnh và video của chuyến đi được lưu trữ tập trung tại thư mục Google Drive: <strong className="text-blue-700">Tour CRM &gt; Tour &gt; {tour.code} &gt; Ảnh đoàn</strong>
          </p>
        </div>
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {activePhoto && lightboxIndex !== null && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            {/* Close Button */}
            <button
              onClick={() => setLightboxIndex(null)}
              className="absolute top-4 right-4 z-10 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Prev/Next Buttons */}
            {tourPhotos.length > 1 && (
              <>
                <button
                  onClick={() => setLightboxIndex((lightboxIndex - 1 + tourPhotos.length) % tourPhotos.length)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={() => setLightboxIndex((lightboxIndex + 1) % tourPhotos.length)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            {/* Image Container */}
            <div className="max-w-4xl max-h-[85vh] flex flex-col items-center justify-center space-y-4">
              <img
                src={activePhoto.file_url}
                alt={activePhoto.caption || activePhoto.file_name}
                className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-2xl"
              />

              <div className="bg-slate-800/80 backdrop-blur-md text-white p-4 rounded-xl max-w-lg w-full flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="font-semibold text-sm text-white">{activePhoto.caption || activePhoto.file_name}</p>
                  <p className="text-xs text-slate-300 flex items-center gap-2">
                    <span>Đăng bởi: {activePhoto.uploaded_by}</span>
                    <span>•</span>
                    <span>{new Date(activePhoto.created_at).toLocaleDateString('vi-VN')}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadImage(activePhoto)}
                    className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                    title="Tải ảnh này"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <a
                    href={activePhoto.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                    title="Mở trong tab mới"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
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
