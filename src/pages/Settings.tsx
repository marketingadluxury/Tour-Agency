import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useCRM } from '../context/CRMContext';
import { Settings as SettingsIcon, Award, ShieldAlert, Save, Sparkles, Users, Database, History, Globe, Cloud, Zap } from 'lucide-react';
import UserManagement from '../components/UserManagement';
import DatabaseKeepAliveSettings from '../components/DatabaseKeepAliveSettings';
import WooCommerceSettingsSection from '../components/WooCommerceSettingsSection';
import { GoogleDriveSettingsSection } from '../components/GoogleDriveSettingsSection';
import { PancakeSettingsSection } from '../components/PancakeSettingsSection';
import ActivityLogs from './ActivityLogs';

export default function Settings() {
  const { currentRole, membershipSettings, updateMembershipSettings } = useCRM();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const tabFromUrl = searchParams.get('tab') as any;

  useEffect(() => {
    if (currentRole === 'hr') {
      navigate('/employees', { replace: true });
    }
  }, [currentRole, navigate]);

  const [activeTab, setActiveTab] = useState<'membership' | 'users' | 'ads' | 'drive' | 'database' | 'logs' | 'woocommerce'>(
    tabFromUrl && ['membership', 'users', 'ads', 'drive', 'database', 'logs', 'woocommerce'].includes(tabFromUrl)
      ? tabFromUrl
      : 'membership'
  );
  
  const [silver, setSilver] = useState(membershipSettings?.silverMin || 20000000);
  const [gold, setGold] = useState(membershipSettings?.goldMin || 50000000);
  const [platinum, setPlatinum] = useState(membershipSettings?.platinumMin || 100000000);
  const [isSaved, setIsSaved] = useState(false);

  const canAccessSettings = ['admin', 'bod'].includes(currentRole);

  if (!canAccessSettings) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 bg-white rounded-2xl border border-gray-200 shadow-sm max-w-md mx-auto my-12 text-center font-sans">
        <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-6 border border-amber-200">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-gray-900 mb-2">Quyền truy cập hạn chế</h2>
        <p className="text-xs text-gray-500 mb-6 max-w-sm leading-relaxed font-semibold">
          Chỉ có <span className="text-blue-600 font-bold">Quản trị viên (Admin)</span> và <span className="text-violet-600 font-bold">Ban Giám Đốc (BOD)</span> mới có quyền truy cập trang Cài đặt hệ thống.
        </p>
      </div>
    );
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateMembershipSettings({
      silverMin: Number(silver),
      goldMin: Number(gold),
      platinumMin: Number(platinum),
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header section */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-blue-600" />
            <span>Cài đặt hệ thống</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1 font-medium">
            Quản lý các cấu hình hệ thống và hạng mức thành viên.
          </p>
        </div>
        <div className="text-xs px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200 font-extrabold uppercase tracking-wider">
          Quản trị hệ thống
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap bg-slate-100 rounded-2xl p-1 border border-slate-200 shadow-inner gap-1">
        <button
          onClick={() => setActiveTab('membership')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'membership'
              ? 'bg-white text-blue-600 shadow-sm font-extrabold border border-slate-150'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Hạng thành viên</span>
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'users'
              ? 'bg-white text-blue-600 shadow-sm font-extrabold border border-slate-150'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Quản lý người dùng & phân quyền</span>
        </button>
        {['admin', 'bod'].includes(currentRole) && (
          <button
            onClick={() => {
              setActiveTab('ads');
              setSearchParams({ tab: 'ads' });
            }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'ads'
                ? 'bg-white text-blue-600 shadow-sm font-extrabold border border-slate-150'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Tích hợp quảng cáo</span>
          </button>
        )}
        {['admin', 'bod'].includes(currentRole) && (
          <button
            onClick={() => {
              setActiveTab('drive');
              setSearchParams({ tab: 'drive' });
            }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'drive'
                ? 'bg-white text-blue-600 shadow-sm font-extrabold border border-slate-150'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            <Cloud className="w-4 h-4 text-blue-500" />
            <span>Lưu trữ Google Drive</span>
          </button>
        )}
        {currentRole === 'admin' && (
          <button
            onClick={() => {
              setActiveTab('database');
              setSearchParams({ tab: 'database' });
            }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'database'
                ? 'bg-white text-blue-600 shadow-sm font-extrabold border border-slate-150'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Cơ sở dữ liệu & Tự động giữ ấm</span>
          </button>
        )}
        {['admin', 'bod'].includes(currentRole) && (
          <button
            onClick={() => {
              setActiveTab('woocommerce');
              setSearchParams({ tab: 'woocommerce' });
            }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'woocommerce'
                ? 'bg-white text-blue-600 shadow-sm font-extrabold border border-slate-150'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Kết nối Website WordPress (WooCommerce)</span>
          </button>
        )}
        {['admin', 'bod'].includes(currentRole) && (
          <button
            onClick={() => {
              setActiveTab('logs');
              setSearchParams({ tab: 'logs' });
            }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'logs'
                ? 'bg-white text-blue-600 shadow-sm font-extrabold border border-slate-150'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Nhật ký hệ thống</span>
          </button>
        )}
      </div>

      {activeTab === 'membership' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Help & Guide card */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-150 rounded-2xl p-6 space-y-4">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center border border-blue-200 text-blue-600">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Cơ chế phân hạng thành viên</h3>
            <p className="text-xs text-slate-600 leading-relaxed mt-2 font-medium">
              Phân hạng thành viên được tính tự động dựa trên <strong>tổng số tiền đã chi tiêu thực tế</strong> (các hóa đơn của booking có trạng thái <strong className="text-green-700">Chắc chắn (Sure)</strong> hoặc <strong className="text-emerald-700">Đã thanh toán (Paid)</strong>) do khách hàng đó làm người chi trả chính (Payer).
            </p>
          </div>
          
          <div className="pt-2 border-t border-blue-200 space-y-2">
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Nguyên tắc xếp hạng:</h4>
            <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 font-semibold">
              <li>Dưới hạn mức Bạc: <strong>Hạng Đồng</strong></li>
              <li>Đạt hạn mức Bạc: <strong>Hạng Bạc</strong></li>
              <li>Đạt hạn mức Vàng: <strong>Hạng Vàng</strong></li>
              <li>Đạt hạn mức Kim Cương: <strong>Hạng Kim Cương</strong></li>
            </ul>
          </div>
        </div>

        {/* Input Settings Form */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-150 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Hạn mức chi tiêu tích lũy (VND)</span>
            </h3>
            <span className="text-xs text-gray-400 font-semibold">Cập nhật thời gian thực</span>
          </div>

          <form onSubmit={handleSave} className="p-6 space-y-5">
            {/* Bronze Default Note */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex justify-between items-center">
              <div>
                <span className="block text-xs font-bold text-slate-800">Hạng Đồng (Bronze)</span>
                <span className="text-[11px] text-gray-400 font-semibold">Hạng mặc định cho tất cả khách hàng mới</span>
              </div>
              <span className="text-xs px-2.5 py-1 bg-slate-200 text-slate-700 rounded-lg font-black border border-slate-300">
                &ge; 0 VND
              </span>
            </div>

            {/* Silver threshold */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                  Hạng Bạc (Silver)
                </label>
                <span className="text-[11px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  {new Intl.NumberFormat('vi-VN').format(silver)} VND
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={silver ? new Intl.NumberFormat('vi-VN').format(silver) : '0'}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setSilver(val ? Number(val) : 0);
                  }}
                  className="w-full pl-4 pr-12 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  required
                />
                <span className="absolute right-4 top-3 text-xs font-bold text-slate-400">VND</span>
              </div>
            </div>

            {/* Gold threshold */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                  Hạng Vàng (Gold)
                </label>
                <span className="text-[11px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  {new Intl.NumberFormat('vi-VN').format(gold)} VND
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={gold ? new Intl.NumberFormat('vi-VN').format(gold) : '0'}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setGold(val ? Number(val) : 0);
                  }}
                  className="w-full pl-4 pr-12 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  required
                />
                <span className="absolute right-4 top-3 text-xs font-bold text-slate-400">VND</span>
              </div>
            </div>

            {/* Platinum threshold */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                  Hạng Kim Cương (Platinum)
                </label>
                <span className="text-[11px] font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                  {new Intl.NumberFormat('vi-VN').format(platinum)} VND
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={platinum ? new Intl.NumberFormat('vi-VN').format(platinum) : '0'}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setPlatinum(val ? Number(val) : 0);
                  }}
                  className="w-full pl-4 pr-12 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  required
                />
                <span className="absolute right-4 top-3 text-xs font-bold text-slate-400">VND</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-150 flex items-center justify-between gap-4">
              {isSaved ? (
                <div className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Lưu thiết lập thành công! Hệ thống đã cập nhật tức thì.
                </div>
              ) : (
                <div className="text-xs text-gray-400 font-medium">
                  Thiết lập áp dụng lập tức cho toàn bộ khách hàng.
                </div>
              )}
              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-600/10 transition-all flex items-center gap-2 cursor-pointer shrink-0"
              >
                <Save className="w-4 h-4" />
                Lưu cài đặt
              </button>
            </div>
          </form>
        </div>
      </div>
      )}

      {activeTab === 'users' && <UserManagement />}
      {activeTab === 'ads' && <PancakeSettingsSection />}
      {activeTab === 'drive' && <GoogleDriveSettingsSection />}
      {activeTab === 'database' && <DatabaseKeepAliveSettings />}
      {activeTab === 'woocommerce' && <WooCommerceSettingsSection />}
      {activeTab === 'logs' && <ActivityLogs embedded />}
    </div>
  );
}
