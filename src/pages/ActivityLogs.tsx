import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  History,
  Search,
  Filter,
  User,
  Map,
  ShoppingCart,
  FileText,
  Receipt,
  Users,
  DollarSign,
  Settings,
  Download,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Eye,
  Copy,
  Check,
  X,
  Sparkles,
  Info,
  Tag
} from 'lucide-react';
import { useCRM } from '@/context/CRMContext';
import { useAuth } from '@/context/AuthContext';
import { ActivityLog, Role } from '@/types';
import ActionModal from '@/components/ActionModal';

interface ParsedLogDetail {
  info?: string;
  changes: { field: string; old: string; new: string }[];
  rawText?: string;
}

function parseLogDetails(detailsStr?: string): ParsedLogDetail {
  if (!detailsStr) return { changes: [] };

  // 1. Try parsing JSON
  const trimmed = detailsStr.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object') {
        return {
          info: parsed.info || parsed.summary || parsed.description,
          changes: Array.isArray(parsed.changes) ? parsed.changes : [],
          rawText: detailsStr
        };
      }
    } catch (e) {
      // Fallback to text parsing
    }
  }

  // 2. Text parsing for arrow indicators (➔ or -> or =>)
  const lines = detailsStr.split('\n');
  const changes: { field: string; old: string; new: string }[] = [];
  let infoText = '';

  for (const line of lines) {
    const cleanLine = line.replace(/^[•\-\*]\s*/, '').trim();
    if (!cleanLine) continue;

    if (cleanLine.includes('➔') || cleanLine.includes('->') || cleanLine.includes('=>')) {
      const parts = cleanLine.split(/➔|->|=>/);
      if (parts.length >= 2) {
        let leftSide = parts[0].trim();
        let rightSide = parts[1].trim();
        let fieldName = 'Thuộc tính';
        let oldValue = leftSide;

        if (leftSide.includes(':')) {
          const colonIdx = leftSide.indexOf(':');
          fieldName = leftSide.substring(0, colonIdx).trim();
          oldValue = leftSide.substring(colonIdx + 1).trim();
        }

        changes.push({
          field: fieldName || 'Thông số',
          old: oldValue || 'Trống',
          new: rightSide || 'Mới'
        });
        continue;
      }
    }

    if (!infoText) {
      infoText = cleanLine;
    } else {
      infoText += ' | ' + cleanLine;
    }
  }

  return {
    info: infoText || undefined,
    changes,
    rawText: detailsStr
  };
}

export default function ActivityLogs({ embedded }: { embedded?: boolean } = {}) {
  const { activityLogs, clearActivityLogs, currentRole } = useCRM();
  const { profile, user } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const [showClearModal, setShowClearModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [copiedToast, setCopiedToast] = useState(false);

  // Format date helper: hh:mm dd/mm/yyyy
  const formatDateTime = (isoString?: string) => {
    if (!isoString) return '--/--/---- --:--';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${hours}:${minutes} ${day}/${month}/${year}`;
  };

  const getRoleLabel = (role: Role) => {
    switch (role) {
      case 'agent': return 'Đại lý';
      case 'bod': return 'BOD';
      case 'operator': return 'Điều hành';
      case 'sale_leader': return 'Sale Leader';
      case 'sale': return 'Sale';
      case 'visa': return 'Visa';
      case 'accounting': return 'Kế toán';
      case 'admin': return 'Admin';
      case 'marketing_leader': return 'Trưởng phòng Marketing';
      case 'marketing': return 'Nhân viên Marketing';
      default: return role;
    }
  };

  const getRoleBadgeStyle = (role: Role) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'bod': return 'bg-violet-100 text-violet-800 border-violet-200';
      case 'sale_leader': return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'operator': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'accounting': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'visa': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'sale': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'marketing_leader': return 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200';
      case 'marketing': return 'bg-pink-100 text-pink-800 border-pink-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getModuleBadge = (moduleName: string) => {
    switch (moduleName) {
      case 'Tour':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Map className="w-3.5 h-3.5" /> Tour
          </span>
        );
      case 'Đơn hàng':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <ShoppingCart className="w-3.5 h-3.5" /> Booking
          </span>
        );
      case 'Visa':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <FileText className="w-3.5 h-3.5" /> Visa
          </span>
        );
      case 'Kế toán':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Receipt className="w-3.5 h-3.5" /> Kế toán
          </span>
        );
      case 'Hành khách':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            <Users className="w-3.5 h-3.5" /> Hành khách
          </span>
        );
      case 'Chi phí':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <DollarSign className="w-3.5 h-3.5" /> Chi phí
          </span>
        );
      case 'Thành viên':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <User className="w-3.5 h-3.5" /> Thành viên
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
            <Settings className="w-3.5 h-3.5" /> {moduleName}
          </span>
        );
    }
  };

  // Date filtering logic
  const filteredLogs = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = todayStart - 7 * 24 * 3600 * 1000;
    const thirtyDaysAgo = todayStart - 30 * 24 * 3600 * 1000;

    return activityLogs.filter(log => {
      // 1. Search term (user_name, user_email, action, details)
      const term = searchTerm.toLowerCase().trim();
      if (term) {
        const nameMatch = (log.user_name || '').toLowerCase().includes(term);
        const emailMatch = (log.user_email || '').toLowerCase().includes(term);
        const actionMatch = (log.action || '').toLowerCase().includes(term);
        const detailsMatch = (log.details || '').toLowerCase().includes(term);
        if (!nameMatch && !emailMatch && !actionMatch && !detailsMatch) {
          return false;
        }
      }

      // 2. Module filter
      if (selectedModule !== 'all' && log.module !== selectedModule) {
        return false;
      }

      // 3. Role filter
      if (selectedRole !== 'all' && log.user_role !== selectedRole) {
        return false;
      }

      // 4. Date filter
      if (selectedDateFilter !== 'all') {
        const logTime = new Date(log.created_at).getTime();
        if (selectedDateFilter === 'today' && logTime < todayStart) {
          return false;
        }
        if (selectedDateFilter === '7days' && logTime < sevenDaysAgo) {
          return false;
        }
        if (selectedDateFilter === '30days' && logTime < thirtyDaysAgo) {
          return false;
        }
      }

      return true;
    });
  }, [activityLogs, searchTerm, selectedModule, selectedRole, selectedDateFilter]);

  // Pagination logic
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, currentPage, itemsPerPage]);

  // Statistics
  const todayCount = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0,0,0,0);
    return activityLogs.filter(l => new Date(l.created_at).getTime() >= todayStart.getTime()).length;
  }, [activityLogs]);

  const topUser = useMemo(() => {
    if (activityLogs.length === 0) return 'Chưa có';
    const counts: { [name: string]: number } = {};
    activityLogs.forEach(l => {
      const name = l.user_name || 'Khác';
      counts[name] = (counts[name] || 0) + 1;
    });
    let maxName = '';
    let maxCount = 0;
    Object.entries(counts).forEach(([name, count]) => {
      if (count > maxCount) {
        maxCount = count;
        maxName = name;
      }
    });
    return maxName ? `${maxName} (${maxCount})` : 'Chưa có';
  }, [activityLogs]);

  // Export CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['Thời gian', 'Người thực hiện', 'Email', 'Vai trò', 'Phân loại', 'Hành động', 'Chi tiết'];
    const rows = filteredLogs.map(l => [
      `"${formatDateTime(l.created_at)}"`,
      `"${l.user_name || ''}"`,
      `"${l.user_email || ''}"`,
      `"${getRoleLabel(l.user_role)}"`,
      `"${l.module}"`,
      `"${l.action || ''}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Activity_Logs_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const canAccessLogs = currentRole === 'admin' || profile?.role === 'admin' || currentRole === 'bod' || profile?.role === 'bod';

  if (!canAccessLogs) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 bg-white rounded-2xl border border-gray-200 shadow-xs max-w-md mx-auto my-12 text-center">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0-6v2m0-5a7 7 0 110 14 7 7 0 010-14z" />
          </svg>
        </div>
        <h2 className="text-xl font-black text-gray-900 mb-2">Chỉ Quản trị viên & Ban Giám Đốc mới có quyền xem</h2>
        <p className="text-xs text-gray-500 mb-6 max-w-sm leading-relaxed font-semibold">
          Tính năng Nhật ký thao tác hệ thống chỉ dành riêng cho tài khoản Quản trị viên (Admin) và Ban Giám Đốc (BOD).
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
        >
          Quay lại Lịch khởi hành
        </Link>
      </div>
    );
  }

  return (
    <div className={embedded ? "space-y-6" : "p-6 max-w-7xl mx-auto space-y-6"}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <History className="w-6 h-6" />
            </span>
            <h1 className="text-xl font-black text-gray-900 tracking-tight">Nhật ký thao tác hệ thống</h1>
          </div>
          <p className="text-xs font-semibold text-gray-500">
            Lưu trữ lịch sử thao tác của tất cả tài khoản người dùng trên hệ thống CRM (Chỉ dành cho Quản trị viên).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer border border-slate-200"
            title="Tải xuống tập tin CSV"
          >
            <Download className="w-4 h-4 text-slate-600" /> Xuất CSV
          </button>

          {currentRole === 'admin' && (
            <button
              type="button"
              onClick={() => setShowClearModal(true)}
              disabled={activityLogs.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer border border-rose-200"
              title="Xóa tất cả log thao tác"
            >
              <Trash2 className="w-4 h-4 text-rose-600" /> Xóa nhật ký
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tổng số nhật ký</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">{activityLogs.length.toLocaleString('vi-VN')}</h3>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <History className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Thao tác hôm nay</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">{todayCount.toLocaleString('vi-VN')}</h3>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tài khoản tích cực nhất</p>
            <h3 className="text-sm font-black text-purple-700 truncate max-w-[170px] mt-1" title={topUser}>
              {topUser}
            </h3>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <User className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Trạng thái ghi log</p>
            <h3 className="text-xs font-bold text-emerald-600 flex items-center gap-1 mt-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Tự động & Liên tục
            </h3>
          </div>
          <div className="p-3 bg-sky-50 text-sky-600 rounded-xl">
            <RefreshCw className="w-6 h-6 animate-spin-slow" />
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm tên, email, hành động..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white font-medium text-gray-800"
            />
          </div>

          {/* Module Selector */}
          <div>
            <select
              value={selectedModule}
              onChange={(e) => {
                setSelectedModule(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-9 px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white font-semibold text-slate-800 outline-none transition-all cursor-pointer"
            >
              <option value="all">Tất cả phân loại (Module)</option>
              <option value="Tour">Tour du lịch</option>
              <option value="Đơn hàng">Booking</option>
              <option value="Visa">Dịch vụ Visa</option>
              <option value="Kế toán">Kế toán & Hóa đơn</option>
              <option value="Chi phí">Chi phí Tour</option>
              <option value="Hành khách">Hành khách</option>
              <option value="Thành viên">Đại lý & CTV</option>
              <option value="Hệ thống">Hệ thống</option>
            </select>
          </div>

          {/* Role Selector */}
          <div>
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-9 px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white font-semibold text-slate-800 outline-none transition-all cursor-pointer"
            >
              <option value="all">Tất cả vai trò người dùng</option>
              <option value="admin">Quản trị viên</option>
              <option value="sale_leader">Sale Leader</option>
              <option value="operator">Điều hành Tour</option>
              <option value="sale">Sale</option>
              <option value="accounting">Kế toán</option>
              <option value="visa">Bộ phận Visa</option>
              <option value="CTV">Cộng tác viên</option>
              <option value="bod">Ban Giám đốc</option>
              <option value="marketing_leader">Trưởng phòng Marketing</option>
              <option value="marketing">Nhân viên Marketing</option>
            </select>
          </div>

          {/* Date Filter Selector */}
          <div>
            <select
              value={selectedDateFilter}
              onChange={(e) => {
                setSelectedDateFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-9 px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white font-semibold text-slate-800 outline-none transition-all cursor-pointer"
            >
              <option value="all">Tất cả thời gian</option>
              <option value="today">Hôm nay</option>
              <option value="7days">7 ngày gần đây</option>
              <option value="30days">30 ngày gần đây</option>
            </select>
          </div>
        </div>

        {/* Results Info */}
        <div className="flex items-center justify-between pt-2 text-xs font-semibold text-gray-500 border-t border-gray-100">
          <span>
            Hiển thị <strong className="text-gray-900">{filteredLogs.length}</strong> kết quả khớp bộ lọc
          </span>
          {(searchTerm || selectedModule !== 'all' || selectedRole !== 'all' || selectedDateFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedModule('all');
                setSelectedRole('all');
                setSelectedDateFilter('all');
                setCurrentPage(1);
              }}
              className="text-blue-600 hover:underline text-xs font-bold cursor-pointer"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200 text-gray-600 uppercase tracking-wider font-extrabold text-[11px]">
                <th className="py-3.5 px-4 w-[160px]">Thời gian</th>
                <th className="py-3.5 px-4 w-[200px]">Người thực hiện</th>
                <th className="py-3.5 px-4 w-[130px]">Phân loại</th>
                <th className="py-3.5 px-4 w-[200px]">Hành động</th>
                <th className="py-3.5 px-4">Chi tiết thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500">
                    <History className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                    <p className="font-bold text-gray-700 text-sm">Chưa có dữ liệu nhật ký thao tác</p>
                    <p className="text-xs text-gray-400 mt-1">Không tìm thấy bản ghi nào khớp với điều kiện tìm kiếm.</p>
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => {
                  const parsed = parseLogDetails(log.details);
                  const changeCount = parsed.changes.length;
                  return (
                    <tr 
                      key={log.id} 
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-indigo-50/50 cursor-pointer transition-colors group"
                      title="Bấm để xem chi tiết thao tác"
                    >
                      {/* Thời gian */}
                      <td className="py-3.5 px-4 font-mono font-semibold text-gray-700 whitespace-nowrap">
                        {formatDateTime(log.created_at)}
                      </td>

                      {/* Người thực hiện */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5 font-bold text-gray-900">
                            <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <span className="truncate">{log.user_name || 'Người dùng'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border uppercase tracking-wider ${getRoleBadgeStyle(log.user_role)}`}>
                              {getRoleLabel(log.user_role)}
                            </span>
                            {log.user_email && (
                              <span className="text-[11px] text-gray-400 truncate max-w-[130px]" title={log.user_email}>
                                {log.user_email}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Phân loại */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getModuleBadge(log.module)}
                      </td>

                      {/* Hành động */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-gray-900 leading-snug block group-hover:text-indigo-600 transition-colors">
                          {log.action}
                        </span>
                        {changeCount > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 mt-1 border border-purple-200">
                            <Sparkles className="w-3 h-3 text-purple-500" /> {changeCount} thay đổi
                          </span>
                        )}
                      </td>

                      {/* Chi tiết */}
                      <td className="py-3.5 px-4 text-gray-600 leading-relaxed font-medium">
                        <div className="flex items-center justify-between gap-2">
                          <div className="bg-slate-50 group-hover:bg-white p-2 rounded-lg border border-slate-200 text-[11px] font-sans break-words max-w-lg flex-1 line-clamp-2">
                            {parsed.info || log.details || <span className="text-gray-400 italic">Không có thông tin thêm</span>}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLog(log);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors shrink-0 cursor-pointer shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Xem chi tiết</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-slate-50/50">
            <span className="text-xs text-gray-500 font-semibold">
              Trang <strong className="text-gray-900">{currentPage}</strong> / <strong>{totalPages}</strong>
            </span>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Trang trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 text-xs font-bold text-gray-700">
                {currentPage}
              </span>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Trang sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-indigo-500/20 border border-indigo-400/30 rounded-xl text-indigo-300">
                  <History className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-white">Chi tiết nhật ký thao tác</h3>
                    {getModuleBadge(selectedLog.module)}
                  </div>
                  <p className="text-xs text-indigo-200 mt-0.5 font-medium">
                    Thực hiện lúc {formatDateTime(selectedLog.created_at)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Action Title & User Info */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Hành động thực hiện</span>
                  <span className="text-base font-extrabold text-gray-900 mt-0.5 block">{selectedLog.action}</span>
                </div>
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-2xs">
                  <User className="w-4 h-4 text-gray-400" />
                  <div className="text-xs">
                    <span className="font-bold text-gray-800 block">{selectedLog.user_name || 'Người dùng'}</span>
                    <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-black border uppercase mt-0.5 ${getRoleBadgeStyle(selectedLog.user_role)}`}>
                      {getRoleLabel(selectedLog.user_role)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Detailed Breakdown */}
              {(() => {
                const parsed = parseLogDetails(selectedLog.details);
                return (
                  <div className="space-y-4">
                    {parsed.info && (
                      <div className="bg-blue-50/70 border border-blue-200/80 p-3.5 rounded-xl text-xs font-semibold text-blue-900 flex items-start gap-2.5">
                        <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-extrabold block text-blue-950 mb-0.5">Thực thể tác động:</span>
                          <span className="text-blue-900 leading-relaxed">{parsed.info}</span>
                        </div>
                      </div>
                    )}

                    {parsed.changes.length > 0 ? (
                      <div>
                        <div className="flex items-center gap-1.5 mb-2.5">
                          <Sparkles className="w-4 h-4 text-purple-600" />
                          <h4 className="font-extrabold text-xs text-gray-900 uppercase tracking-wider">
                            Chi tiết các trường thông tin thay đổi ({parsed.changes.length})
                          </h4>
                        </div>

                        <div className="space-y-3">
                          {parsed.changes.map((item, idx) => (
                            <div key={idx} className="p-3.5 bg-white rounded-xl border border-gray-200 shadow-2xs hover:border-purple-300 transition-all">
                              <div className="text-xs font-extrabold text-gray-800 mb-2 flex items-center gap-1.5">
                                <Tag className="w-3.5 h-3.5 text-purple-600" />
                                <span>{item.field}</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                {/* Value Old */}
                                <div className="p-2.5 rounded-lg bg-red-50/80 border border-red-200 text-red-800">
                                  <span className="text-[10px] font-bold text-red-500 uppercase block mb-0.5">Trước cập nhật (Cũ)</span>
                                  <span className="font-semibold line-through text-red-900 break-words">{item.old || 'Trống'}</span>
                                </div>
                                {/* Value New */}
                                <div className="p-2.5 rounded-lg bg-emerald-50/80 border border-emerald-200 text-emerald-800">
                                  <span className="text-[10px] font-bold text-emerald-600 uppercase block mb-0.5">Sau cập nhật (Mới)</span>
                                  <span className="font-extrabold text-emerald-950 break-words">{item.new || 'Trống'}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Mô tả chi tiết</span>
                        <p className="text-xs font-medium text-gray-800 whitespace-pre-wrap leading-relaxed">
                          {selectedLog.details || 'Không có mô tả chi tiết thêm.'}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`[${selectedLog.action}] ${selectedLog.details || ''}`);
                  setCopiedToast(true);
                  setTimeout(() => setCopiedToast(false), 2000);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
              >
                {copiedToast ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700">Đã sao chép!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-gray-500" />
                    <span>Sao chép chi tiết</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2 text-xs font-extrabold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Logs Modal */}
      {showClearModal && (
        <ActionModal
          isOpen={showClearModal}
          onClose={() => setShowClearModal(false)}
          onConfirm={() => {
            clearActivityLogs();
            setShowClearModal(false);
          }}
          title="Xóa toàn bộ nhật ký thao tác"
          message="Bạn có chắc chắn muốn xóa vĩnh viễn toàn bộ lịch sử nhật ký thao tác trên hệ thống không? Hành động này không thể khôi phục."
        />
      )}
    </div>
  );
}
