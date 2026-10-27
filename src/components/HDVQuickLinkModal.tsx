import React, { useState, useEffect } from 'react';
import { Share2, Copy, Check, ExternalLink, X, QrCode, Sparkles, Smartphone, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Tour } from '../types';

interface HDVQuickLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  tours: Tour[];
  defaultTourId?: string;
}

export const HDVQuickLinkModal: React.FC<HDVQuickLinkModalProps> = ({
  isOpen,
  onClose,
  tours,
  defaultTourId
}) => {
  const [copied, setCopied] = useState(false);
  const validTours = tours.filter(t => t.tour_type !== 'visa');
  const [selectedTourId, setSelectedTourId] = useState<string>(
    defaultTourId || (validTours.length > 0 ? validTours[0].id : '')
  );

  useEffect(() => {
    if (defaultTourId) {
      setSelectedTourId(defaultTourId);
    } else if (validTours.length > 0) {
      setSelectedTourId(validTours[0].id);
    }
  }, [defaultTourId, isOpen]);

  if (!isOpen) return null;

  const selectedTour = validTours.find(t => t.id === selectedTourId) || validTours[0];

  const appOrigin = window.location.origin;
  const quickLink = selectedTour
    ? `${appOrigin}/guest-upload?uploadTourId=${selectedTour.id}`
    : `${appOrigin}/guest-upload`;

  const handleCopy = () => {
    navigator.clipboard.writeText(quickLink);
    setCopied(true);
    toast.success('Đã sao chép link upload trực tiếp cho HDV Freelance!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Google QR Code API URL for instant scanning
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(quickLink)}`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden my-auto"
        >
          {/* Header */}
          <div className="bg-slate-900 p-5 text-white flex items-center justify-between relative overflow-hidden">
            <div className="flex items-center gap-3 z-10">
              <div className="w-10 h-10 rounded-xl bg-blue-600/30 backdrop-blur-md flex items-center justify-center text-blue-400 border border-blue-500/30">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base leading-snug">Link & Mã QR Cho HDV Freelance</h3>
                <p className="text-xs text-slate-400">Quét mã hoặc click link sẽ mở ngay mục upload ảnh của tour</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Tour selector / locked display */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                Tour Gửi Cho HDV Freelance:
              </label>
              {defaultTourId && selectedTour ? (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-mono font-black text-xs tracking-wide shadow-xs shrink-0">
                      {selectedTour.code}
                    </span>
                    <span className="font-bold text-xs text-blue-950">{selectedTour.name}</span>
                  </div>
                </div>
              ) : (
                <select
                  value={selectedTourId}
                  onChange={(e) => setSelectedTourId(e.target.value)}
                  className="w-full max-w-full overflow-hidden text-ellipsis h-9 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 cursor-pointer transition-all"
                >
                  {validTours.map(t => {
                    const shortName = t.name.length > 28 ? `${t.name.slice(0, 28)}...` : t.name;
                    return (
                      <option key={t.id} value={t.id} title={`[${t.code}] ${t.name}`}>
                        [{t.code}] {shortName}
                      </option>
                    );
                  })}
                </select>
              )}
            </div>

            {/* QR Code display */}
            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-2">
              <div className="p-2 bg-white rounded-xl shadow-md border border-slate-200">
                <img
                  src={qrCodeUrl}
                  alt="QR Code HDV Freelance"
                  className="w-44 h-44 object-contain"
                />
              </div>
              <div className="text-[11px] font-medium text-slate-600 flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                Quét mã QR bằng camera điện thoại để mở trực tiếp mục upload ảnh
              </div>
            </div>

            {/* Link Copy Box */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Đường Dẫn Trực Tiếp (Dùng Gửi Qua Zalo/Viber):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={quickLink}
                  className="flex-1 px-3 py-2 text-xs bg-gray-100 border border-gray-300 rounded-xl font-mono text-gray-700 select-all"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-1.5 shrink-0 ${
                    copied
                      ? 'bg-emerald-600'
                      : 'bg-blue-600 hover:bg-blue-700 shadow-sm'
                  }`}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
                </button>
              </div>
            </div>

            {/* Benefit info badge */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-xs text-amber-900">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Tối ưu trải nghiệm HDV Freelance:</strong> HDV chỉ cần bấm link hoặc quét QR để mở trực tiếp mục upload ảnh đoàn và tải ảnh lên ngay!
              </span>
            </div>
          </div>

          <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl transition-colors"
            >
              Đóng
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
