import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Camera, Share2, Folder, ExternalLink, Search, Calendar, User, UploadCloud, Trash2, ShieldCheck, Image as ImageIcon, Sparkles, FolderOpen, RefreshCw, MapPin, X, Filter } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useCRM } from '../context/CRMContext';
import { TimeRangeFilter } from '../components/TimeRangeFilter';
import { CustomSelect } from '../components/CustomSelect';
import { isDateInTimeRange, TIME_RANGE_OPTIONS } from '../lib/dateUtils';
import { HDVQuickUploadModal } from '../components/HDVQuickUploadModal';
import { HDVQuickLinkModal } from '../components/HDVQuickLinkModal';

export default function TourMediaManagement() {
  const { tours, tourMedia, deleteTourMedia, currentRole } = useCRM();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDestination, setSelectedDestination] = useState<string>('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('all');
  const [selectedStartDate, setSelectedStartDate] = useState<string>('');
  const [selectedEndDate, setSelectedEndDate] = useState<string>('');
  const [selectedTourId, setSelectedTourId] = useState<string>('all');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [uploadModalTourId, setUploadModalTourId] = useState<string | undefined>(undefined);
  const [linkModalTourId, setLinkModalTourId] = useState<string | undefined>(undefined);
  const [loadingFolderCode, setLoadingFolderCode] = useState<string | null>(null);

  const canManageMedia = ['admin', 'operator', 'tour_guide'].includes(currentRole);

  // Filter valid tours (Exclude visa services)
  const validTours = tours.filter(t => t.tour_type !== 'visa');

  // Extract unique destinations / categories
  const destinationOptions = Array.from(
    new Set(
      validTours
        .map(t => (t.destination || t.category || '').trim())
        .filter((d): d is string => Boolean(d))
    )
  ).sort();

  const destinationSelectOptions = [
    { value: 'all', label: `Tất cả điểm đến (${destinationOptions.length})` },
    ...destinationOptions.map(dest => ({
      value: dest,
      label: dest,
      icon: <MapPin className="w-3.5 h-3.5 text-teal-600" />
    }))
  ];

  const tourSelectOptions = [
    { value: 'all', label: `Tất cả các đoàn tour (${validTours.length})` },
    ...validTours.map(t => {
      const shortName = t.name.length > 28 ? `${t.name.slice(0, 28)}...` : t.name;
      return {
        value: t.id,
        label: `[${t.code}] ${shortName}`
      };
    })
  ];

  const location = useLocation();

  // Handle navigation from notifications
  useEffect(() => {
    if (location.state) {
      if (location.state.searchTarget) {
        setSearchTerm(location.state.searchTarget);
        setSelectedTimeRange('all');
        setSelectedDestination('all');
      }
      if (location.state.tourId) {
        setSelectedTourId(location.state.tourId);
      }
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Auto open upload modal if accessed via direct QR link / URL parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const uploadId = urlParams.get('uploadTourId') || urlParams.get('tourId');
    if (uploadId) {
      const foundTour = validTours.find(t => t.id === uploadId || t.code === uploadId);
      if (foundTour) {
        setUploadModalTourId(foundTour.id);
      } else {
        setUploadModalTourId(uploadId);
      }
      setIsUploadModalOpen(true);
    }
  }, [tours]);

  // Hide from agent
  if (currentRole === 'agent') {
    return (
      <div className="bg-white p-12 text-center rounded-2xl border border-gray-200 space-y-3">
        <ShieldCheck className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-gray-900">Không có quyền truy cập</h2>
        <p className="text-xs text-gray-500">Tài khoản Đại lý (Agent) không có quyền truy cập mục Kho Ảnh Khách Đoàn.</p>
      </div>
    );
  }

  // Filtered tours based on search, destination, departure date range, and tour choice
  const filteredTours = validTours.filter(t => {
    // 1. Keyword search
    const matchesSearch =
      !searchTerm ||
      (t.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.guide_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    // 2. Destination filter
    const tourDest = (t.destination || t.category || '').trim();
    const matchesDestination =
      selectedDestination === 'all' ||
      tourDest.toLowerCase() === selectedDestination.toLowerCase();

    // 3. Departure Date Range filter
    const tourDepDate = t.departure_time || t.start_date;
    const matchesDepartureDate = isDateInTimeRange(
      tourDepDate,
      selectedTimeRange,
      selectedStartDate,
      selectedEndDate
    );

    // 4. Specific Tour filter
    const matchesTour = selectedTourId === 'all' || t.id === selectedTourId;

    return matchesSearch && matchesDestination && matchesDepartureDate && matchesTour;
  });

  const hasActiveFilters =
    searchTerm !== '' ||
    selectedDestination !== 'all' ||
    selectedTimeRange !== 'all' ||
    selectedStartDate !== '' ||
    selectedEndDate !== '' ||
    selectedTourId !== 'all';

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedDestination('all');
    setSelectedTimeRange('all');
    setSelectedStartDate('');
    setSelectedEndDate('');
    setSelectedTourId('all');
  };

  const handleOpenDriveFolder = async (tourCode: string) => {
    setLoadingFolderCode(tourCode);
    const toastId = toast.loading(`Đang kết nối thư mục Drive cho tour ${tourCode}...`);

    try {
      const response = await fetch('/api/get-tour-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tourCode, subFolder: 'Ảnh đoàn' }),
      });

      const data = await response.json();
      toast.dismiss(toastId);

      if (data.success && data.folderUrl) {
        toast.success(`Đã mở thư mục Ảnh đoàn của Tour ${tourCode}`);
        window.open(data.folderUrl, '_blank');
      } else {
        // Fallback: search on drive or inform user
        const fallbackSearchUrl = `https://drive.google.com/drive/search?q=${encodeURIComponent(tourCode)}`;
        toast.success(`Đang mở Google Drive tìm kiếm cho tour ${tourCode}...`);
        window.open(fallbackSearchUrl, '_blank');
      }
    } catch (err) {
      toast.dismiss(toastId);
      console.error('Lỗi kết nối thư mục Drive:', err);
      window.open(`https://drive.google.com/drive/search?q=${encodeURIComponent(tourCode)}`, '_blank');
    } finally {
      setLoadingFolderCode(null);
    }
  };

  const [deletingMediaItem, setDeletingMediaItem] = useState<{ id: string; fileUrl: string; fileName: string } | null>(null);

  const handleDeleteMedia = (id: string, fileUrl: string, fileName: string) => {
    setDeletingMediaItem({ id, fileUrl, fileName });
  };

  const confirmDeleteMedia = async () => {
    if (!deletingMediaItem) return;
    const { id, fileUrl, fileName } = deletingMediaItem;

    try {
      if (fileUrl) {
        await fetch('/api/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: fileUrl }),
        });
      }

      await deleteTourMedia(id);
      toast.success(`Đã xóa file "${fileName}" thành công!`);
    } catch (err) {
      console.error('Lỗi xóa media:', err);
      toast.error('Có lỗi xảy ra khi xóa file!');
    } finally {
      setDeletingMediaItem(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 rounded-2xl p-5 sm:p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-bold mb-1">
              <Camera className="w-3.5 h-3.5 text-amber-300" />
              <span>Dành Cho Tất Cả Thành Viên Công Ty & HDV</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Kho Ảnh Khách Đoàn (Google Drive)
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Truy cập trực tiếp thư mục Google Drive lưu trữ toàn bộ hình ảnh kỷ niệm chuyến đi của từng đoàn tour. HDV Freelance có thể dùng Link & QR Code để tải ảnh nhanh từ điện thoại.
            </p>
          </div>

          {canManageMedia && (
            <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full md:w-auto">
              <button
                type="button"
                onClick={() => {
                  setUploadModalTourId(undefined);
                  setIsUploadModalOpen(true);
                }}
                className="flex-1 md:flex-none px-4 py-2.5 ml-px rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-extrabold text-xs shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Camera className="w-4 h-4 text-amber-300 animate-pulse" />
                <span>Upload Ảnh Đoàn</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLinkModalTourId(undefined);
                  setIsLinkModalOpen(true);
                }}
                className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs backdrop-blur-md transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4 text-blue-300" />
                <span>Link HDV Freelance</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          {/* 1. Keyword Search */}
          <div>
            <label className="block text-[11px] font-extrabold text-gray-500 uppercase tracking-wider mb-1">
              Từ khóa
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Mã Tour, Tên Tour, HDV..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-gray-50/50 hover:bg-white transition-all h-[38px]"
              />
            </div>
          </div>

          {/* 2. Destination Filter */}
          <CustomSelect
            label="Thị trường / Điểm đến"
            options={destinationSelectOptions}
            value={selectedDestination}
            onChange={setSelectedDestination}
            className="w-full"
            icon={<MapPin className="w-3.5 h-3.5 text-teal-600" />}
          />

          {/* 3. Departure Date Range Filter */}
          <TimeRangeFilter
            label="Thời gian khởi hành"
            value={selectedTimeRange}
            onChange={setSelectedTimeRange}
            startDate={selectedStartDate}
            onChangeStartDate={setSelectedStartDate}
            endDate={selectedEndDate}
            onChangeEndDate={setSelectedEndDate}
            showAllOption={true}
            className="w-full"
          />

          {/* 4. Specific Tour Filter */}
          <CustomSelect
            label="Chọn Đoàn Tour"
            options={tourSelectOptions}
            value={selectedTourId}
            onChange={setSelectedTourId}
            className="w-full"
          />
        </div>

        {/* Active Filter Bar & Reset Button */}
        {hasActiveFilters && (
          <div className="pt-2.5 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 flex-wrap text-gray-600 font-medium">
              <span className="inline-flex items-center gap-1 font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200/60">
                <Filter className="w-3.5 h-3.5 text-blue-600" />
                Hiển thị: <strong>{filteredTours.length}</strong> / {validTours.length} đoàn tour
              </span>

              {selectedDestination !== 'all' && (
                <span className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 font-bold flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-teal-600" />
                  Thị trường: {selectedDestination}
                </span>
              )}

              {selectedTimeRange !== 'all' && (
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-emerald-600" />
                  Khởi hành: {
                    selectedTimeRange === 'custom'
                      ? `${selectedStartDate ? format(new Date(selectedStartDate), 'dd/MM/yyyy') : '...'} - ${selectedEndDate ? format(new Date(selectedEndDate), 'dd/MM/yyyy') : '...'}`
                      : (TIME_RANGE_OPTIONS.find(o => o.value === selectedTimeRange)?.label || selectedTimeRange)
                  }
                </span>
              )}

              {selectedTourId !== 'all' && (
                <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-800 border border-purple-200 font-bold flex items-center gap-1">
                  Đoàn tour chọn lọc
                </span>
              )}

              {searchTerm && (
                <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-bold flex items-center gap-1">
                  Từ khóa: "{searchTerm}"
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-1.5 text-xs font-extrabold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 rounded-xl transition-all active:scale-95 flex items-center gap-1 shrink-0 ml-auto cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Xóa bộ lọc</span>
            </button>
          </div>
        )}
      </div>

      {/* Tour List & Drive Folder Links */}
      <div className="space-y-4">
        {filteredTours.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-gray-200">
            <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm font-semibold">Không tìm thấy đoàn tour nào phù hợp.</p>
          </div>
        ) : (
          filteredTours.map((tour) => {
            return (
              <div
                key={tour.id}
                className="bg-white rounded-2xl border border-gray-200 shadow-xs hover:shadow-md transition-shadow overflow-hidden"
              >
                {/* Tour Card Header */}
                <div className="p-4 sm:p-5 bg-gradient-to-r from-gray-50 via-slate-50 to-white border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="px-3 py-1 rounded-lg bg-blue-600 text-white font-mono font-black text-xs tracking-wide shadow-xs">
                        {tour.code}
                      </span>
                      {tour.departure_time && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                          Khởi hành: {format(new Date(tour.departure_time), 'dd/MM/yyyy')}
                        </span>
                      )}
                      {tour.guide_name && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
                          <User className="w-3.5 h-3.5 text-amber-600" />
                          HDV: {tour.guide_name}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-base text-gray-900 mt-1">
                      {tour.name}
                    </h3>
                  </div>

                  {/* Actions Bar (Only for Operator, Admin, Tour Guide) */}
                  {canManageMedia && (
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Quick Upload for this Tour */}
                      <button
                        type="button"
                        onClick={() => {
                          setUploadModalTourId(tour.id);
                          setIsUploadModalOpen(true);
                        }}
                        className="px-3.5 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <Camera className="w-4 h-4 text-teal-600" />
                        <span>Upload Ảnh</span>
                      </button>

                      {/* Quick Link Freelance for this Tour */}
                      <button
                        type="button"
                        onClick={() => {
                          setLinkModalTourId(tour.id);
                          setIsLinkModalOpen(true);
                        }}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                        title="Lấy link & QR code cho HDV Freelance"
                      >
                        <Share2 className="w-3.5 h-3.5 text-slate-600" />
                        <span>Link HDV</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Folder Info Banner */}
                <div className="p-4 sm:p-5 bg-blue-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 text-slate-700">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <FolderOpen className="w-5 h-5 text-amber-300" />
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-900 text-xs">Vị trí lưu trữ: Tour CRM &gt; Tour &gt; {tour.code} &gt; Ảnh đoàn</p>
                      <p className="text-slate-500 text-[11px] mt-0.5">Tất cả hình ảnh &amp; video kỷ niệm chuyến đi của đoàn được tải lên và lưu trực tiếp trên Google Drive của công ty.</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenDriveFolder(tour.code)}
                    disabled={loadingFolderCode === tour.code}
                    className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-extrabold text-xs shadow-xs flex items-center justify-center gap-2 shrink-0 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {loadingFolderCode === tour.code ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <Folder className="w-4 h-4 text-amber-300" />
                    )}
                    <span>Mở Thư Mục Google Drive</span>
                    <ExternalLink className="w-3.5 h-3.5 text-blue-200" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Upload Modal */}
      {canManageMedia && (
        <HDVQuickUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          defaultTourId={uploadModalTourId}
        />
      )}

      {/* Link Freelance Modal */}
      {canManageMedia && (
        <HDVQuickLinkModal
          isOpen={isLinkModalOpen}
          onClose={() => setIsLinkModalOpen(false)}
          tours={validTours}
          defaultTourId={linkModalTourId}
        />
      )}

      {/* Modal Popup Xác Nhận Xóa File Media */}
      {deletingMediaItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-5 animate-scaleUp">
            <div className="flex items-center gap-3.5 text-rose-600">
              <div className="w-12 h-12 rounded-2xl bg-rose-100/80 flex items-center justify-center shrink-0 border border-rose-200">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Xác nhận XÓA file ảnh</h3>
                <p className="text-xs text-rose-600 font-semibold">Hành động này không thể hoàn tác!</p>
              </div>
            </div>

            <div className="bg-rose-50/80 border border-rose-200/80 rounded-xl p-4 text-xs text-gray-800 space-y-1.5">
              <p className="font-semibold text-gray-900">Tên file:</p>
              <p className="font-bold text-rose-700 break-all">{deletingMediaItem.fileName}</p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingMediaItem(null)}
                className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-50 transition-all cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={confirmDeleteMedia}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all cursor-pointer flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Xác nhận Xóa File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
