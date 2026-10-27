import React from 'react';
import { useCRM } from '../context/CRMContext';
import { Users, ShieldAlert, Sparkles, Building2 } from 'lucide-react';
import UserManagement from '../components/UserManagement';

export default function EmployeesManagement() {
  const { currentRole } = useCRM();

  const canAccess = ['admin', 'bod', 'hr'].includes(currentRole);

  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 bg-white rounded-2xl border border-gray-200 shadow-sm max-w-md mx-auto my-12 text-center font-sans">
        <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-6 border border-amber-200">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-gray-900 mb-2">Quyền truy cập hạn chế</h2>
        <p className="text-xs text-gray-500 mb-6 max-w-sm leading-relaxed font-semibold">
          Chỉ có <span className="text-cyan-700 font-bold">Nhân sự (HR)</span>, <span className="text-blue-600 font-bold">Quản trị viên (Admin)</span> và <span className="text-violet-600 font-bold">Ban Giám Đốc (BOD)</span> mới có quyền quản lý hồ sơ nhân sự công ty.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-2xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-150">
              <Users className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              Quản lý Nhân sự Công ty
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 font-medium">
            Quản lý hồ sơ cán bộ nhân viên, cơ cấu phòng ban, chức vụ và trạng thái công tác nội bộ công ty.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs px-3.5 py-1.5 bg-cyan-50 text-cyan-800 rounded-xl border border-cyan-200 font-bold">
            <Building2 className="w-3.5 h-3.5 text-cyan-600" />
            <span>Hành chính nhân sự</span>
          </span>
        </div>
      </div>

      {/* Main User & Employee Management Component */}
      <UserManagement />
    </div>
  );
}
