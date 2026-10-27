import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCRM } from '../context/CRMContext';
import { supabase } from '../lib/supabase';
import { calculateSeniority } from '../lib/payrollUtils';
import { DatePicker } from './DatePicker';
import { CustomSelect } from './CustomSelect';
import { Role, Team, EmploymentStatus, EMPLOYMENT_STATUS_LABELS, CustomRole } from '../types';
import { 
  Users, UserPlus, Edit2, Trash2, Shield, Key, Mail, Phone, 
  Building2, Search, X, Check, AlertCircle, RefreshCw, Eye, EyeOff,
  Target, Plus, Award, UserCheck, ShieldAlert, Briefcase,
  UserMinus, Calendar, FileText, CheckCircle2, RotateCcw,
  Sparkles, Layers, Sliders, Palette, Info, Clock, PartyPopper
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ManagedUser {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  company_name: string;
  role: Role;
  employment_status?: EmploymentStatus;
  resigned_at?: string | null;
  resigned_note?: string | null;
  join_date?: string | null;
  official_start_date?: string | null;
  leader_id?: string | null;
  team_id?: string | null;
  team_name?: string | null;
  created_at?: string;
}

const DEFAULT_ROLE_LABELS: Record<string, { label: string; color: string; bg: string; border: string; department?: string; is_system?: boolean; description?: string }> = {
  admin: { label: 'Quản trị viên (Full)', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200', department: 'Ban Quản Trị', is_system: true, description: 'Toàn quyền cấu hình, quản trị người dùng, phân quyền và dữ liệu' },
  bod: { label: 'BOD (Ban Giám đốc)', color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200', department: 'Ban Giám Đốc', is_system: true, description: 'Xem toàn bộ báo cáo doanh thu, lãi lỗ và phê duyệt thu chi/nghỉ phép' },
  sale_leader: { label: 'Sale Leader', color: 'text-amber-800', bg: 'bg-amber-100', border: 'border-amber-300', department: 'Kinh doanh & Sale', is_system: true, description: 'Quản lý nhóm Sale, theo dõi KPI, duyệt chỗ và tạo tour gửi đối tác' },
  sale: { label: 'Sale', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', department: 'Kinh doanh & Sale', is_system: true, description: 'Tư vấn, giữ chỗ và tạo đơn hàng cho khách hàng cá nhân/đoàn' },
  operator: { label: 'Điều hành Tour', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', department: 'Phòng Điều hành', is_system: true, description: 'Tạo tour, điều phối booking, duyệt chốt chỗ và quản lý giá tour' },
  visa_leader: { label: 'Trưởng bộ phận Visa', color: 'text-indigo-900', bg: 'bg-indigo-100', border: 'border-indigo-300', department: 'Phòng Visa', is_system: true, description: 'Quản lý toàn diện hồ sơ và chuyên viên bộ phận Visa, phân công và duyệt hồ sơ visa' },
  visa: { label: 'Bộ phận Visa', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200', department: 'Phòng Visa', is_system: true, description: 'Tiếp nhận, xử lý, nộp và cập nhật kết quả hồ sơ visa cho khách' },
  accounting: { label: 'Kế toán', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', department: 'Kế toán & Tài chính', is_system: true, description: 'Quản lý thu chi, duyệt phiếu thu, hạch toán chi phí và công nợ' },
  hr: { label: 'Nhân sự (HR)', color: 'text-cyan-800', bg: 'bg-cyan-50', border: 'border-cyan-200', department: 'Hành chính nhân sự', is_system: true, description: 'Quản lý hồ sơ nhân sự, chấm công, nghỉ phép và chính sách nhân sự' },
  tour_guide: { label: 'Hướng Dẫn Viên (HDV)', color: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-200', department: 'Điều hành & HDV', is_system: true, description: 'Dẫn tour, quản lý danh sách đoàn và đăng tải album ảnh kỷ niệm' },
  marketing_leader: { label: 'Trưởng phòng Marketing', color: 'text-fuchsia-800', bg: 'bg-fuchsia-100', border: 'border-fuchsia-300', department: 'Phòng Marketing', is_system: true, description: 'Quản lý chiến dịch quảng cáo, phân bổ ngân sách và trưởng nhóm Marketing' },
  marketing: { label: 'Nhân viên Marketing', color: 'text-pink-700', bg: 'bg-pink-50', border: 'border-pink-200', department: 'Phòng Marketing', is_system: true, description: 'Chạy ads, theo dõi chuyển đổi Meta/Google và sáng tạo nội dung' },
  agent: { label: 'Đại lý (Agent)', color: 'text-amber-800', bg: 'bg-amber-50', border: 'border-amber-200', department: 'Đối tác ngoài', is_system: true, description: 'Đối tác đại lý phân phối sản phẩm tour và dịch vụ visa' },
  CTV: { label: 'Cộng Tác Viên (CTV)', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', department: 'Đối tác ngoài', is_system: true, description: 'Cộng tác viên bán hàng và giới thiệu khách hàng' }
};

const COLOR_PALETTES = [
  { key: 'indigo', label: 'Chàm Tím (Indigo)', color: 'text-indigo-900', bg: 'bg-indigo-100', border: 'border-indigo-300' },
  { key: 'blue', label: 'Xanh Dương (Blue)', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  { key: 'purple', label: 'Tím (Purple)', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
  { key: 'emerald', label: 'Xanh Lá (Emerald)', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { key: 'rose', label: 'Đỏ Hồng (Rose)', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
  { key: 'amber', label: 'Cam Vàng (Amber)', color: 'text-amber-800', bg: 'bg-amber-100', border: 'border-amber-300' },
  { key: 'cyan', label: 'Xanh Lơ (Cyan)', color: 'text-cyan-800', bg: 'bg-cyan-50', border: 'border-cyan-200' },
  { key: 'fuchsia', label: 'Hồng Đậm (Fuchsia)', color: 'text-fuchsia-800', bg: 'bg-fuchsia-100', border: 'border-fuchsia-300' },
  { key: 'teal', label: 'Xanh Mòng Két (Teal)', color: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-200' },
  { key: 'orange', label: 'Cam Đậm (Orange)', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  { key: 'slate', label: 'Xám Đậm (Slate)', color: 'text-slate-800', bg: 'bg-slate-100', border: 'border-slate-300' }
];

const AVAILABLE_PERMISSIONS = [
  { key: 'visa_processing', label: 'Quản lý & Xử lý hồ sơ Visa', desc: 'Xem, phân công và cập nhật trạng thái Visa toàn công ty' },
  { key: 'visa_orders', label: 'Quản lý Đơn Visa lẻ', desc: 'Tiếp nhận và quản lý các đơn đặt dịch vụ Visa' },
  { key: 'visa_services', label: 'Bảng giá & Dịch vụ Visa', desc: 'Quản lý danh mục và chính sách giá làm Visa' },
  { key: 'leave_requests_approve', label: 'Duyệt Đơn xin nghỉ phép (Cấp 1)', desc: 'Thẩm quyền ký duyệt đơn nghỉ phép của nhân viên trực thuộc' },
  { key: 'payment_proposals_approve', label: 'Duyệt Giấy đề nghị thanh toán', desc: 'Thẩm quyền ký duyệt đề xuất chi trả kinh phí' },
  { key: 'tours_manage', label: 'Quản lý Lịch khởi hành Tour', desc: 'Thêm, sửa lịch tour và điều phối số chỗ' },
  { key: 'orders_manage', label: 'Quản lý Booking & Giữ chỗ', desc: 'Kiểm soát đơn đặt tour của khách hàng' },
  { key: 'tax_handbook', label: 'Tra cứu Sổ tay Thuế Lữ hành', desc: 'Truy cập sổ tay và công cụ tính thuế GTGT/TNCN' },
  { key: 'accounting_access', label: 'Quản lý Thu/Chi & Kế toán', desc: 'Xem sổ sách kế toán và duyệt phiếu thu' },
  { key: 'hr_access', label: 'Quản lý Hành chính Nhân sự', desc: 'Quản lý hồ sơ nhân viên, phòng ban và chức vụ' }
];

export default function UserManagement() {
  const { session } = useAuth();
  const { currentRole, deleteUser, refreshProfiles, updateUserProfile, customRoles = [], addCustomRole, updateCustomRole, deleteCustomRole } = useCRM();

  const canAccess = ['admin', 'bod', 'hr'].includes(currentRole);

  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 bg-white rounded-2xl border border-gray-200 shadow-sm max-w-md mx-auto my-8 text-center font-sans">
        <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-4 border border-rose-200">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-black text-gray-900 mb-2">Quyền truy cập hạn chế</h3>
        <p className="text-xs text-gray-500 max-w-sm leading-relaxed font-semibold">
          Chỉ có <span className="text-blue-600 font-bold">Quản trị viên (Admin)</span>, <span className="text-violet-600 font-bold">Ban Giám Đốc (BOD)</span> và <span className="text-cyan-700 font-bold">Bộ phận Nhân sự (HR)</span> mới có quyền quản lý nhân sự và phân quyền.
        </p>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState<'company' | 'agents' | 'teams' | 'roles'>('company');
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [employmentFilter, setEmploymentFilter] = useState<string>('all');
  const [seniorityFilter, setSeniorityFilter] = useState<string>('all');
  
  // User Modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  // Quick Employment Status Change Modal
  const [statusTargetUser, setStatusTargetUser] = useState<ManagedUser | null>(null);
  const [quickStatus, setQuickStatus] = useState<EmploymentStatus>('resigned');
  const [quickResignedAt, setQuickResignedAt] = useState<string>(new Date().toISOString().split('T')[0]);
  const [quickResignedNote, setQuickResignedNote] = useState<string>('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Team Modal state
  const [isTeamFormOpen, setIsTeamFormOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamFormData, setTeamFormData] = useState({
    name: '',
    leader_id: '',
    leader_name: '',
    kpi_target: 800000000
  });

  // Role Modal state (Dynamic Roles)
  const [isRoleFormOpen, setIsRoleFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [roleFormData, setRoleFormData] = useState({
    label: '',
    role_key: '',
    department: 'Phòng Visa',
    color: 'text-indigo-900',
    bg: 'bg-indigo-100',
    border: 'border-indigo-300',
    description: '',
    permissions: [] as string[]
  });
  const [deleteRoleTarget, setDeleteRoleTarget] = useState<CustomRole | null>(null);

  // Delete confirm modal state
  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null);
  const [deleteTeamTarget, setDeleteTeamTarget] = useState<Team | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Merged Role Labels Map
  const mergedRoleLabels = useMemo(() => {
    const res: Record<string, { label: string; color: string; bg: string; border: string; department?: string; is_system?: boolean; description?: string }> = {
      ...DEFAULT_ROLE_LABELS
    };

    if (customRoles && customRoles.length > 0) {
      customRoles.forEach(cr => {
        res[cr.role_key] = {
          label: cr.label,
          color: cr.color || 'text-slate-800',
          bg: cr.bg || 'bg-slate-100',
          border: cr.border || 'border-slate-300',
          department: cr.department || 'Tùy chỉnh',
          is_system: cr.is_system || false,
          description: cr.description || ''
        };
      });
    }
    return res;
  }, [customRoles]);

  // User Form states
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    company_name: '',
    role: 'agent' as Role,
    employment_status: 'official' as EmploymentStatus,
    resigned_at: '',
    resigned_note: '',
    join_date: '',
    official_start_date: '',
    leader_id: '',
    team_id: '',
    team_name: ''
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      let loadedUsers: ManagedUser[] = [];
      const token = session?.access_token;
      const headers: HeadersInit = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      try {
        const response = await fetch('/api/admin/users', { headers });
        const contentType = response.headers.get('content-type');
        if (response.ok && contentType && contentType.includes('application/json')) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            loadedUsers = data;
          }
        }
      } catch (err) {
        console.warn('API fetch users error:', err);
      }

      // Fallback to Supabase direct query if API returned empty or failed
      if (loadedUsers.length === 0) {
        const { data: dbProfiles, error: dbError } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (!dbError && dbProfiles && dbProfiles.length > 0) {
          loadedUsers = dbProfiles as ManagedUser[];
        }
      }

      // Fallback default Admin profiles if database is completely empty
      if (loadedUsers.length === 0) {
        loadedUsers = [
          {
            id: 'admin-default-1',
            full_name: 'Quản trị viên Hệ thống',
            email: 'admin@yourcompany.com',
            phone: '0988888888',
            company_name: 'Tour CRM',
            role: 'admin',
            employment_status: 'official',
            created_at: new Date().toISOString()
          }
        ];

        try {
          await supabase.from('profiles').upsert(loadedUsers);
        } catch (e) {
          console.warn('Background insert default profiles warning:', e);
        }
      }

      const normalizedUsers = loadedUsers.map(u => {
        if (!u.email) {
          if (u.id === 'admin-default-1') return { ...u, email: 'admin@yourcompany.com' };
          if (u.full_name) {
            const slug = u.full_name
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .toLowerCase()
              .replace(/[^a-z0-9]/g, '');
            return { ...u, email: `${slug}@yourcompany.com` };
          }
          return { ...u, email: 'user@yourcompany.com' };
        }
        return u;
      });

      const deletedIds = new Set(JSON.parse(localStorage.getItem('crm_deleted_user_ids') || '[]'));
      setUsers(normalizedUsers.filter(u => !deletedIds.has(u.id)));
    } catch (err: any) {
      console.warn('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      let loadedTeams: Team[] = [];
      const token = session?.access_token;
      const headers: HeadersInit = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      try {
        const response = await fetch('/api/admin/teams', { headers });
        const contentType = response.headers.get('content-type');
        if (response.ok && contentType && contentType.includes('application/json')) {
          const data = await response.json();
          if (Array.isArray(data)) loadedTeams = data;
          else if (data && Array.isArray(data.teams)) loadedTeams = data.teams;
        }
      } catch (err) {
        console.warn('API fetch teams error:', err);
      }

      if (loadedTeams.length === 0) {
        const { data: dbTeams } = await supabase.from('teams').select('*').order('name');
        if (dbTeams && dbTeams.length > 0) {
          loadedTeams = dbTeams as Team[];
        }
      }

      setTeams(loadedTeams);
    } catch (err) {
      console.warn('Error fetching teams:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchTeams();
  }, [session]);

  // Handle User Modal
  const handleOpenAddUser = () => {
    setEditingUser(null);
    setFormData({
      email: '',
      password: '',
      full_name: '',
      phone: '',
      company_name: 'Tour CRM',
      role: activeTab === 'agents' ? 'agent' : 'sale',
      employment_status: 'official',
      resigned_at: '',
      resigned_note: '',
      join_date: new Date().toISOString().split('T')[0],
      official_start_date: new Date().toISOString().split('T')[0],
      leader_id: '',
      team_id: '',
      team_name: ''
    });
    setShowPassword(false);
    setIsFormOpen(true);
  };

  const handleOpenEditUser = (user: ManagedUser) => {
    setEditingUser(user);
    setFormData({
      email: user.email || '',
      password: '',
      full_name: user.full_name || '',
      phone: user.phone || '',
      company_name: user.company_name || '',
      role: user.role,
      employment_status: user.employment_status || 'official',
      resigned_at: user.resigned_at ? user.resigned_at.split('T')[0] : '',
      resigned_note: user.resigned_note || '',
      join_date: user.join_date ? user.join_date.split('T')[0] : (user.created_at ? user.created_at.split('T')[0] : ''),
      official_start_date: user.official_start_date ? user.official_start_date.split('T')[0] : '',
      leader_id: user.leader_id || '',
      team_id: user.team_id || '',
      team_name: user.team_name || ''
    });
    setShowPassword(false);
    setIsFormOpen(true);
  };

  const handleUserFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!formData.email || !formData.full_name) {
      setError('Vui lòng nhập đầy đủ Email và Họ tên.');
      return;
    }

    if (!editingUser && !formData.password) {
      setError('Mật khẩu là bắt buộc khi thêm tài khoản mới.');
      return;
    }

    try {
      const token = session?.access_token;
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const url = editingUser ? `/api/admin/users/${editingUser.id}` : '/api/admin/users';
      const method = editingUser ? 'PUT' : 'POST';
      
      const selectedTeam = teams.find(t => t.id === formData.team_id);
      const bodyData: any = {
        ...formData,
        team_name: selectedTeam ? selectedTeam.name : (formData.team_id ? formData.team_name : ''),
        join_date: formData.join_date || null,
        official_start_date: formData.employment_status === 'official' ? (formData.official_start_date || formData.join_date || null) : null,
        resigned_at: formData.employment_status === 'resigned' ? (formData.resigned_at || new Date().toISOString()) : null,
        resigned_note: formData.employment_status === 'resigned' ? (formData.resigned_note || null) : null
      };

      if (editingUser && !bodyData.password) {
        delete bodyData.password;
      }

      // Also update directly in Supabase profiles for realtime resilience
      if (editingUser) {
        await updateUserProfile(editingUser.id, {
          full_name: formData.full_name,
          phone: formData.phone,
          company_name: formData.company_name,
          role: formData.role,
          employment_status: formData.employment_status,
          resigned_at: bodyData.resigned_at,
          resigned_note: bodyData.resigned_note,
          join_date: bodyData.join_date,
          official_start_date: bodyData.official_start_date,
          leader_id: formData.leader_id || null,
          team_id: formData.team_id || null,
          team_name: bodyData.team_name || null
        });
      }

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(bodyData)
      });

      if (!response.ok) {
        let errorMsg = 'Gặp lỗi trong quá trình xử lý yêu cầu.';
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errJson = await response.json();
          errorMsg = errJson.error || errorMsg;
        }
        throw new Error(errorMsg);
      }

      setActionSuccess(editingUser ? 'Cập nhật thông tin tài khoản thành công!' : 'Thêm tài khoản người dùng mới thành công!');
      setIsFormOpen(false);
      fetchUsers();
      refreshProfiles();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi không xác định.');
    }
  };

  // Quick Change Status Modal
  const handleOpenQuickStatus = (user: ManagedUser) => {
    setStatusTargetUser(user);
    const currentSt = user.employment_status || 'official';
    // If already resigned, offer to reactivate to official, otherwise offer to resign
    setQuickStatus(currentSt === 'resigned' ? 'official' : 'resigned');
    setQuickResignedAt(user.resigned_at ? user.resigned_at.split('T')[0] : new Date().toISOString().split('T')[0]);
    setQuickResignedNote(user.resigned_note || '');
  };

  const handleSaveQuickStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusTargetUser) return;
    try {
      setIsUpdatingStatus(true);
      setError(null);

      const payload: any = {
        employment_status: quickStatus,
        resigned_at: quickStatus === 'resigned' ? (quickResignedAt || new Date().toISOString()) : null,
        resigned_note: quickStatus === 'resigned' ? (quickResignedNote.trim() || null) : (quickResignedNote.trim() ? `[Lịch sử: ${quickResignedNote.trim()}]` : null)
      };

      // 1. Cập nhật qua context
      await updateUserProfile(statusTargetUser.id, payload);

      // 2. Cập nhật qua API backend
      const token = session?.access_token;
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      await fetch(`/api/admin/users/${statusTargetUser.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload)
      });

      // 3. Cập nhật state local
      setUsers(prev => prev.map(u => u.id === statusTargetUser.id ? { ...u, ...payload } : u));
      setStatusTargetUser(null);
      await refreshProfiles();

      const stLabel = EMPLOYMENT_STATUS_LABELS[quickStatus]?.label || quickStatus;
      setActionSuccess(`Đã chuyển trạng thái của ${statusTargetUser.full_name} sang: ${stLabel}!`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi cập nhật trạng thái nhân sự.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleConvertDeleteToResign = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      setError(null);

      const payload: any = {
        employment_status: 'resigned',
        resigned_at: new Date().toISOString(),
        resigned_note: 'Chuyển sang Đã nghỉ việc thay vì xóa tài khoản'
      };

      await updateUserProfile(deleteTarget.id, payload);

      const token = session?.access_token;
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      await fetch(`/api/admin/users/${deleteTarget.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload)
      });

      setUsers(prev => prev.map(u => u.id === deleteTarget.id ? { ...u, ...payload } : u));
      setDeleteTarget(null);
      await refreshProfiles();
      setActionSuccess(`Đã chuyển ${deleteTarget.full_name} sang trạng thái "Đã nghỉ việc" an toàn!`);
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: any) {
      setError(err.message || 'Không thể chuyển trạng thái.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      setError(null);
      
      const targetId = deleteTarget.id;
      await deleteUser(targetId);

      setUsers(prev => prev.filter(u => u.id !== targetId));
      setDeleteTarget(null);
      await refreshProfiles();
      setActionSuccess('Xóa tài khoản người dùng thành công!');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Không thể xóa tài khoản này.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Team Modal
  const handleOpenAddTeam = () => {
    setEditingTeam(null);
    setTeamFormData({
      name: '',
      leader_id: '',
      leader_name: '',
      kpi_target: 800000000
    });
    setIsTeamFormOpen(true);
  };

  const handleOpenEditTeam = (team: Team) => {
    setEditingTeam(team);
    setTeamFormData({
      name: team.name,
      leader_id: team.leader_id || '',
      leader_name: team.leader_name || '',
      kpi_target: team.kpi_target || 800000000
    });
    setIsTeamFormOpen(true);
  };

  const handleTeamFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!teamFormData.name.trim()) {
      setError('Tên Team là bắt buộc.');
      return;
    }

    try {
      const token = session?.access_token;
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const url = editingTeam ? `/api/admin/teams/${editingTeam.id}` : '/api/admin/teams';
      const method = editingTeam ? 'PUT' : 'POST';

      const selectedLeader = users.find(u => u.id === teamFormData.leader_id);
      const bodyData = {
        ...teamFormData,
        leader_name: selectedLeader ? `${selectedLeader.full_name} (${mergedRoleLabels[selectedLeader.role]?.label || selectedLeader.role})` : teamFormData.leader_name
      };

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(bodyData)
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || 'Thao tác không thành công.');
      }

      setActionSuccess(editingTeam ? 'Cập nhật thông tin Team thành công!' : 'Tạo Team mới thành công!');
      setIsTeamFormOpen(false);
      fetchTeams();
      fetchUsers();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi lưu thông tin Team.');
    }
  };

  const handleDeleteTeam = async () => {
    if (!deleteTeamTarget) return;
    try {
      setIsDeleting(true);
      setError(null);
      const token = session?.access_token;
      const headers: HeadersInit = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`/api/admin/teams/${deleteTeamTarget.id}`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        throw new Error('Không thể xóa Team.');
      }

      setTeams(prev => prev.filter(t => t.id !== deleteTeamTarget.id));
      setDeleteTeamTarget(null);
      setActionSuccess('Xóa Team thành công!');
      fetchUsers();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi xóa Team.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Role Management Handlers (Dynamic Roles)
  const handleOpenAddRole = () => {
    setEditingRole(null);
    setRoleFormData({
      label: '',
      role_key: '',
      department: 'Phòng Visa',
      color: 'text-indigo-900',
      bg: 'bg-indigo-100',
      border: 'border-indigo-300',
      description: '',
      permissions: ['visa_processing', 'visa_orders', 'leave_requests_approve']
    });
    setIsRoleFormOpen(true);
  };

  const handleOpenEditRole = (role: CustomRole) => {
    setEditingRole(role);
    setRoleFormData({
      label: role.label,
      role_key: role.role_key,
      department: role.department || 'Phòng Visa',
      color: role.color || 'text-indigo-900',
      bg: role.bg || 'bg-indigo-100',
      border: role.border || 'border-indigo-300',
      description: role.description || '',
      permissions: role.permissions || []
    });
    setIsRoleFormOpen(true);
  };

  const handleRoleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!roleFormData.label.trim()) {
      setError('Tên chức danh là bắt buộc.');
      return;
    }

    let finalRoleKey = (roleFormData.role_key || '').trim().toLowerCase();
    if (!finalRoleKey) {
      finalRoleKey = roleFormData.label
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    }

    if (!finalRoleKey) {
      setError('Mã vai trò không hợp lệ.');
      return;
    }

    try {
      if (editingRole && editingRole.id) {
        await updateCustomRole(editingRole.id, {
          ...roleFormData,
          role_key: finalRoleKey
        });
      } else {
        await addCustomRole({
          ...roleFormData,
          role_key: finalRoleKey
        });
      }

      setIsRoleFormOpen(false);
      setActionSuccess(editingRole ? 'Cập nhật chức danh thành công!' : 'Thêm chức danh mới thành công!');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi lưu chức danh.');
    }
  };

  const handleDeleteRole = async () => {
    if (!deleteRoleTarget) return;
    try {
      setIsDeleting(true);
      setError(null);
      const success = await deleteCustomRole(deleteRoleTarget.id || '', deleteRoleTarget.role_key);
      if (success) {
        setDeleteRoleTarget(null);
        setActionSuccess('Xóa chức danh thành công!');
        setTimeout(() => setActionSuccess(null), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi xóa chức danh.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter and search users
  const companyUsers = users.filter(u => !['agent', 'CTV'].includes(u.role));
  const agentUsers = users.filter(u => ['agent', 'CTV'].includes(u.role));
  const baseUsersForTab = activeTab === 'agents' ? agentUsers : companyUsers;

  const allRolesList = useMemo(() => {
    return Object.entries(mergedRoleLabels).map(([key, config]) => {
      const staffCount = users.filter(u => u.role === key && u.employment_status !== 'resigned').length;
      const customRoleObj = customRoles.find(cr => cr.role_key === key);
      return {
        key,
        ...config,
        staffCount,
        customRoleObj
      };
    });
  }, [mergedRoleLabels, users, customRoles]);

  const filteredUsers = baseUsersForTab.filter(user => {
    const matchesSearch = 
      (user.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.phone || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.company_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.team_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.resigned_note || '').toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesTeam = teamFilter === 'all' || user.team_id === teamFilter || (teamFilter === 'none' && !user.team_id);
    
    // Employment Status Filter
    let matchesEmployment = true;
    const empStatus = user.employment_status || 'official';
    if (employmentFilter === 'working') {
      matchesEmployment = empStatus !== 'resigned' && empStatus !== 'suspended';
    } else if (employmentFilter !== 'all') {
      matchesEmployment = empStatus === employmentFilter;
    }

    // Seniority Filter
    let matchesSeniority = true;
    if (seniorityFilter !== 'all') {
      const joinStr = user.join_date || user.created_at;
      const sen = calculateSeniority(joinStr, null, user.resigned_at);
      if (seniorityFilter === 'lt_1yr') {
        matchesSeniority = sen.years === 0;
      } else if (seniorityFilter === '1_to_3yr') {
        matchesSeniority = sen.years >= 1 && sen.years < 3;
      } else if (seniorityFilter === '3_to_5yr') {
        matchesSeniority = sen.years >= 3 && sen.years < 5;
      } else if (seniorityFilter === 'gte_5yr') {
        matchesSeniority = sen.years >= 5;
      }
    }

    return matchesSearch && matchesRole && matchesTeam && matchesEmployment && matchesSeniority;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Alert toast messages */}
      <AnimatePresence>
        {actionSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl shadow-xl flex items-center gap-3 font-semibold text-xs"
          >
            <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
              <Check className="w-4 h-4" />
            </div>
            <span>{actionSuccess}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Tab Navigation */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 bg-slate-100/80 p-1 rounded-xl flex-wrap">
          <button
            onClick={() => { setActiveTab('company'); setRoleFilter('all'); setEmploymentFilter('all'); setSeniorityFilter('all'); }}
            className={`px-4 py-2.5 rounded-lg text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'company' 
                ? 'bg-white text-blue-700 shadow-sm border border-slate-200/80' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Users className="w-4 h-4 text-blue-600" />
            <span>Quản lý Nhân sự Công ty</span>
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-extrabold">
              {companyUsers.length}
            </span>
          </button>

          <button
            onClick={() => { setActiveTab('agents'); setRoleFilter('all'); setEmploymentFilter('all'); setSeniorityFilter('all'); }}
            className={`px-4 py-2.5 rounded-lg text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'agents' 
                ? 'bg-white text-amber-700 shadow-sm border border-slate-200/80' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <UserCheck className="w-4 h-4 text-amber-600" />
            <span>Tài khoản Đại lý & CTV</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold">
              {agentUsers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('teams')}
            className={`px-4 py-2.5 rounded-lg text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'teams' 
                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Building2 className="w-4 h-4 text-indigo-600" />
            <span>Quản lý Team Kinh doanh</span>
            <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-extrabold">
              {teams.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('roles')}
            className={`px-4 py-2.5 rounded-lg text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'roles' 
                ? 'bg-white text-purple-700 shadow-sm border border-slate-200/80' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Shield className="w-4 h-4 text-purple-600" />
            <span>Chức danh & Vai trò</span>
            <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-extrabold">
              {allRolesList.length}
            </span>
          </button>
        </div>

        <div>
          {activeTab === 'roles' ? (
            <button
              onClick={handleOpenAddRole}
              className="w-full sm:w-auto px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-purple-600/15 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Chức Danh / Role Mới</span>
            </button>
          ) : activeTab === 'teams' ? (
            <button
              onClick={handleOpenAddTeam}
              className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-600/15 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo Team Mới</span>
            </button>
          ) : (
            <button
              onClick={handleOpenAddUser}
              className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-blue-600/15 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>{activeTab === 'agents' ? 'Thêm Đại lý / CTV Mới' : 'Thêm Nhân sự Mới'}</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1 & 2: USER ACCOUNTS MANAGEMENT (COMPANY STAFF / AGENTS) */}
      {(activeTab === 'company' || activeTab === 'agents') && (
        <div className="space-y-4">
          {/* Filters & Search */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm theo Tên, Email, SĐT, Công ty, Ghi chú..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              {/* Employment Status Filter */}
              <div className="w-56 sm:w-60">
                <CustomSelect
                  value={employmentFilter}
                  onChange={(val) => setEmploymentFilter(val)}
                  options={[
                    { value: 'all', label: `Tất cả trạng thái (${baseUsersForTab.length})` },
                    { value: 'working', label: `🟢 Đang làm việc (${baseUsersForTab.filter(u => u.employment_status !== 'resigned' && u.employment_status !== 'suspended').length})` },
                    { value: 'official', label: `Chính thức (${baseUsersForTab.filter(u => !u.employment_status || u.employment_status === 'official').length})` },
                    { value: 'probation', label: `Thử việc (${baseUsersForTab.filter(u => u.employment_status === 'probation').length})` },
                    { value: 'resigned', label: `⚪ Đã nghỉ việc (${baseUsersForTab.filter(u => u.employment_status === 'resigned').length})` },
                    { value: 'suspended', label: `🔴 Tạm nghỉ (${baseUsersForTab.filter(u => u.employment_status === 'suspended').length})` },
                  ]}
                  icon={<Briefcase className="w-3.5 h-3.5 text-slate-500" />}
                  placeholder="Trạng thái làm việc..."
                  buttonClassName="h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs hover:border-slate-300 w-full"
                />
              </div>

              {/* Seniority Filter (for Company staff) */}
              {activeTab === 'company' && (
                <div className="w-56 sm:w-64">
                  <CustomSelect
                    value={seniorityFilter}
                    onChange={(val) => setSeniorityFilter(val)}
                    options={[
                      { value: 'all', label: 'Tất cả thâm niên' },
                      { value: 'lt_1yr', label: 'Dưới 1 năm (Mới vào)' },
                      { value: '1_to_3yr', label: '1 - 3 năm công tác' },
                      { value: '3_to_5yr', label: '3 - 5 năm công tác' },
                      { value: 'gte_5yr', label: '⭐️ Trên 5 năm (+Phép thâm niên)' },
                    ]}
                    icon={<Clock className="w-3.5 h-3.5 text-emerald-600" />}
                    placeholder="Thâm niên công tác..."
                    buttonClassName="h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs hover:border-slate-300 w-full"
                  />
                </div>
              )}

              {/* Role filter */}
              <div className="w-52 sm:w-60">
                <CustomSelect
                  value={roleFilter}
                  onChange={(val) => setRoleFilter(val)}
                  options={[
                    { value: 'all', label: `Tất cả vai trò (${baseUsersForTab.length})` },
                    ...Object.entries(mergedRoleLabels)
                      .filter(([roleKey]) => activeTab === 'agents' ? ['agent', 'CTV'].includes(roleKey) : !['agent', 'CTV'].includes(roleKey))
                      .map(([roleKey, roleVal]) => ({
                        value: roleKey,
                        label: `${roleVal.label} (${users.filter(u => u.role === roleKey).length})`
                      }))
                  ]}
                  icon={<Shield className="w-3.5 h-3.5 text-gray-400" />}
                  placeholder="Vai trò CRM..."
                  buttonClassName="h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs hover:border-slate-300 w-full"
                />
              </div>

              {/* Team filter */}
              {activeTab === 'company' && (
                <div className="w-48 sm:w-56">
                  <CustomSelect
                    value={teamFilter}
                    onChange={(val) => setTeamFilter(val)}
                    options={[
                      { value: 'all', label: 'Tất cả Team' },
                      { value: 'none', label: 'Chưa gán Team' },
                      ...teams.map(t => ({
                        value: t.id,
                        label: t.name
                      }))
                    ]}
                    icon={<Building2 className="w-3.5 h-3.5 text-indigo-500" />}
                    placeholder="Chọn Team..."
                    buttonClassName="h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs hover:border-slate-300 w-full"
                  />
                </div>
              )}

              <button
                onClick={fetchUsers}
                className="h-10 w-10 flex items-center justify-center bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl shadow-2xs transition-all cursor-pointer shrink-0"
                title="Làm mới danh sách"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Users table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-gray-500 font-semibold text-xs flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                <span>Đang tải danh sách người dùng...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-12 text-center text-gray-400 font-semibold text-xs">
                Không tìm thấy tài khoản người dùng phù hợp.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                      <th className="py-3.5 px-4">Họ và Tên</th>
                      <th className="py-3.5 px-4">Email / Tài khoản</th>
                      <th className="py-3.5 px-4">SĐT</th>
                      <th className="py-3.5 px-4">Vai Trò (Role)</th>
                      <th className="py-3.5 px-4">Trạng Thái Làm Việc</th>
                      {activeTab === 'company' && <th className="py-3.5 px-4">Ngày Vào Làm & Thâm Niên</th>}
                      <th className="py-3.5 px-4">Team Kinh Doanh</th>
                      <th className="py-3.5 px-4">Leader Phụ Trách</th>
                      <th className="py-3.5 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredUsers.map((u) => {
                      const isResigned = u.employment_status === 'resigned';
                      const roleConfig = mergedRoleLabels[u.role] || { 
                        label: u.role, 
                        color: 'text-gray-700', 
                        bg: 'bg-gray-100', 
                        border: 'border-gray-200' 
                      };

                      const leaderObj = users.find(l => l.id === u.leader_id);
                      const teamObj = teams.find(t => t.id === u.team_id) || (u.team_name ? { name: u.team_name } : null);
                      const empStatus = u.employment_status || 'official';
                      const statusConfig = EMPLOYMENT_STATUS_LABELS[empStatus] || EMPLOYMENT_STATUS_LABELS.official;
                      const seniority = calculateSeniority(u.join_date || u.created_at, null, u.resigned_at);

                      return (
                        <tr 
                          key={u.id} 
                          className={`transition-all group ${isResigned ? 'bg-slate-50/50 hover:bg-slate-100/60 opacity-85' : 'hover:bg-slate-50/80'}`}
                        >
                          <td className="py-3.5 px-4 font-black text-slate-800">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-black text-xs shadow-xs ${
                                isResigned 
                                  ? 'bg-slate-200 border-slate-300 text-slate-600' 
                                  : 'bg-blue-50 border-blue-200 text-blue-700'
                              }`}>
                                {u.full_name ? u.full_name.charAt(0).toUpperCase() : 'U'}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className={`font-extrabold ${isResigned ? 'text-slate-600 line-through decoration-slate-400' : 'text-slate-900'}`}>
                                    {u.full_name || 'Chưa đặt tên'}
                                  </span>
                                  {isResigned && (
                                    <span className="text-[10px] px-1.5 py-0.2 bg-slate-200 text-slate-700 font-bold rounded-md">
                                      Nghỉ việc
                                    </span>
                                  )}
                                </div>
                                {u.company_name && (
                                  <div className="text-[10px] text-gray-400 font-bold">{u.company_name}</div>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-bold text-slate-700">
                            <div className="flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-gray-400" />
                              <span className={isResigned ? 'text-slate-500' : 'text-slate-700'}>{u.email}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-bold text-slate-600">
                            {u.phone ? (
                              <div className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-gray-400" />
                                <span>{u.phone}</span>
                              </div>
                            ) : (
                              <span className="text-gray-300 italic">Chưa có</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black border ${roleConfig.bg} ${roleConfig.color} ${roleConfig.border}`}>
                              <Shield className="w-3 h-3" />
                              <span>{roleConfig.label}</span>
                            </span>
                          </td>

                          {/* Trạng thái làm việc */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col items-start gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenQuickStatus(u)}
                                title="Bấm để chuyển trạng thái nhân sự / bàn giao"
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold border transition-all cursor-pointer hover:shadow-xs hover:scale-102 ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}
                              >
                                {isResigned ? <UserMinus className="w-3 h-3 text-slate-500" /> : <Briefcase className="w-3 h-3" />}
                                <span>{statusConfig.label}</span>
                              </button>
                              {isResigned && u.resigned_at && (
                                <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                                  <Calendar className="w-2.5 h-2.5" />
                                  <span>Từ: {new Date(u.resigned_at).toLocaleDateString('vi-VN')}</span>
                                </span>
                              )}
                              {isResigned && u.resigned_note && (
                                <span className="text-[10px] text-slate-400 italic font-medium truncate max-w-[150px]" title={u.resigned_note}>
                                  Note: {u.resigned_note}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Ngày vào làm & Thâm niên (Company Staff only) */}
                          {activeTab === 'company' && (
                            <td className="py-3.5 px-4">
                              <div className="flex flex-col items-start gap-1">
                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800">
                                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{seniority.joinDateFormatted !== '---' ? seniority.joinDateFormatted : (u.created_at ? new Date(u.created_at).toLocaleDateString('vi-VN') : '---')}</span>
                                </span>
                                
                                <div className="flex items-center gap-1 flex-wrap">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                    seniority.years >= 5 
                                      ? 'bg-amber-50 text-amber-800 border-amber-300' 
                                      : seniority.years >= 1 
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                        : 'bg-slate-100 text-slate-700 border-slate-200'
                                  }`}>
                                    <Clock className="w-2.5 h-2.5" />
                                    <span>{seniority.text}</span>
                                  </span>

                                  {seniority.seniorityBonusDays > 0 && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-black" title="Cộng thêm ngày phép thâm niên theo Điều 114 BLLĐ">
                                      +{seniority.seniorityBonusDays} ngày phép
                                    </span>
                                  )}

                                  {seniority.isAnniversaryMonth && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-pink-50 text-pink-700 border border-pink-200 text-[10px] font-black animate-pulse" title="Tháng kỷ niệm gia nhập công ty">
                                      <PartyPopper className="w-2.5 h-2.5" />
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                          )}

                          <td className="py-3.5 px-4 font-bold">
                            {teamObj ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                                <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                                <span>{teamObj.name}</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 italic font-semibold">Chưa gán Team</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 font-extrabold text-slate-700">
                            {leaderObj ? (
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                <span>{leaderObj.full_name}</span>
                              </div>
                            ) : (
                              <span className="text-gray-300 italic font-semibold">Tự do / Top Leader</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* Quick Change Status Button */}
                              <button
                                onClick={() => handleOpenQuickStatus(u)}
                                className="p-1.5 text-slate-500 hover:text-cyan-700 hover:bg-cyan-50 rounded-lg transition-all cursor-pointer"
                                title={isResigned ? 'Khôi phục làm việc' : 'Chuyển trạng thái / Bàn giao nghỉ việc'}
                              >
                                {isResigned ? <RotateCcw className="w-4 h-4 text-cyan-600" /> : <UserMinus className="w-4 h-4 text-slate-500" />}
                              </button>

                              <button
                                onClick={() => handleOpenEditUser(u)}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                                title="Chỉnh sửa tài khoản"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              {/* Only Admin can delete accounts */}
                              {currentRole === 'admin' && (
                                <button
                                  onClick={() => setDeleteTarget(u)}
                                  className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                  title="Xóa tài khoản hoặc chuyển sang Đã nghỉ việc"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: TEAMS MANAGEMENT */}
      {activeTab === 'teams' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {teams.map((t) => {
              const teamMembers = users.filter(u => u.team_id === t.id || u.team_name === t.name);
              const activeMembers = teamMembers.filter(u => u.employment_status !== 'resigned');
              const leaderUser = users.find(u => u.id === t.leader_id);

              return (
                <div key={t.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 font-black">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-slate-900 text-sm">{t.name}</h3>
                          <span className="text-[10px] font-bold text-slate-400">ID: {t.id}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditTeam(t)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                          title="Sửa thông tin Team"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {currentRole === 'admin' && (
                          <button
                            onClick={() => setDeleteTeamTarget(t)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                            title="Xóa Team"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="py-4 space-y-3">
                      {/* Leader */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-500 flex items-center gap-1">
                          <Award className="w-3.5 h-3.5 text-amber-500" />
                          Trưởng nhóm (Leader):
                        </span>
                        <span className="font-black text-slate-800">
                          {leaderUser ? leaderUser.full_name : (t.leader_name || 'Chưa chỉ định')}
                        </span>
                      </div>

                      {/* KPI Target */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-500 flex items-center gap-1">
                          <Target className="w-3.5 h-3.5 text-emerald-500" />
                          Mục tiêu KPI Tháng:
                        </span>
                        <span className="font-black text-emerald-600">
                          {(t.kpi_target || 0).toLocaleString('vi-VN')} đ
                        </span>
                      </div>

                      {/* Member count */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-500 flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-blue-500" />
                          Số thành viên:
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-black text-[11px] border border-blue-200">
                          {activeMembers.length} Sale đang làm
                        </span>
                      </div>
                    </div>

                    {/* Member list preview */}
                    <div className="pt-3 border-t border-slate-100">
                      <div className="text-[11px] font-black uppercase text-slate-400 mb-2">Thành viên trong Team:</div>
                      {teamMembers.length === 0 ? (
                        <div className="text-xs text-slate-400 italic">Chưa có thành viên nào gán vào Team này.</div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {teamMembers.slice(0, 5).map(m => (
                            <span 
                              key={m.id} 
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${
                                m.employment_status === 'resigned' ? 'bg-slate-100 text-slate-400 line-through' : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              <span>{m.full_name}</span>
                            </span>
                          ))}
                          {teamMembers.length > 5 && (
                            <span className="px-2 py-1 rounded-lg bg-slate-200 text-slate-600 font-black text-[10px]">
                              +{teamMembers.length - 5}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: ROLES & PERMISSIONS MANAGEMENT (DYNAMIC ROLES) */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          {/* Header Card */}
          <div className="bg-gradient-to-r from-purple-900 to-indigo-950 p-6 rounded-2xl text-white shadow-md relative overflow-hidden">
            <div className="absolute right-0 top-0 w-80 h-full bg-gradient-to-l from-purple-500/10 to-transparent pointer-events-none" />
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="p-1.5 rounded-lg bg-white/10 text-purple-300">
                    <Shield className="w-5 h-5" />
                  </span>
                  <h2 className="text-lg font-black tracking-tight">Cơ Cấu Chức Danh & Vai Trò Hệ Thống</h2>
                </div>
                <p className="text-xs text-purple-200/80 font-medium max-w-2xl">
                  Quản lý danh mục chức danh, phân quyền truy cập tính năng và bổ sung các vai trò mới linh hoạt cho toàn bộ cán bộ nhân viên công ty.
                </p>
              </div>

              <button
                onClick={handleOpenAddRole}
                className="px-4 py-2.5 bg-white text-purple-950 hover:bg-purple-50 font-black text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4 text-purple-700" />
                <span>Thêm Chức Danh Mới</span>
              </button>
            </div>
          </div>

          {/* Roles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allRolesList.map((role) => {
              const isCustom = !role.is_system || !!role.customRoleObj;
              const permissions = role.customRoleObj?.permissions || [];

              return (
                <div 
                  key={role.key}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group relative"
                >
                  <div>
                    {/* Role Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black border shadow-2xs ${role.bg} ${role.color} ${role.border}`}>
                          <Shield className="w-3.5 h-3.5" />
                          <span>{role.label}</span>
                        </span>
                        <div className="text-[11px] font-mono text-slate-400 mt-1.5 font-bold">
                          Key: <span className="text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">{role.key}</span>
                        </div>
                      </div>

                      {/* Action buttons if custom role */}
                      {isCustom && role.customRoleObj && (
                        <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100">
                          <button
                            onClick={() => handleOpenEditRole(role.customRoleObj!)}
                            className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all cursor-pointer"
                            title="Chỉnh sửa Chức danh"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {currentRole === 'admin' && (
                            <button
                              onClick={() => setDeleteRoleTarget(role.customRoleObj!)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                              title="Xóa Chức danh"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Department & Description */}
                    <div className="space-y-2 py-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-400">Phòng ban:</span>
                        <span className="font-bold text-slate-700 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-150">
                          {role.department || 'Chung'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed font-normal line-clamp-2">
                        {role.description || 'Chức danh nghiệp vụ trong cơ cấu tổ chức công ty.'}
                      </p>
                    </div>

                    {/* Permissions tags */}
                    {permissions.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 mt-2">
                        <div className="text-[10px] font-black uppercase text-slate-400 mb-1.5">Quyền hạn chính:</div>
                        <div className="flex flex-wrap gap-1">
                          {permissions.slice(0, 3).map(pKey => {
                            const pObj = AVAILABLE_PERMISSIONS.find(p => p.key === pKey);
                            return (
                              <span key={pKey} className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-200">
                                {pObj ? pObj.label : pKey}
                              </span>
                            );
                          })}
                          {permissions.length > 3 && (
                            <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
                              +{permissions.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Staff count footer */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-3 text-xs">
                    <span className="text-[11px] font-bold text-slate-400">Nhân sự đang giữ vai trò:</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-[11px]">
                      {role.staffCount} nhân sự
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* QUICK EMPLOYMENT STATUS MODAL */}
      <AnimatePresence>
        {statusTargetUser && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-md overflow-hidden my-8"
            >
              <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-cyan-400" />
                  <div>
                    <h3 className="font-black text-sm">Chuyển Trạng Thái Nhân Sự</h3>
                    <p className="text-[11px] text-slate-400 font-medium">{statusTargetUser.full_name} ({statusTargetUser.email})</p>
                  </div>
                </div>
                <button
                  onClick={() => setStatusTargetUser(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveQuickStatus} className="p-6 space-y-4 font-sans">
                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Status Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                    Chọn trạng thái nhân sự mới *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setQuickStatus('official')}
                      className={`p-3 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                        quickStatus === 'official'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs ring-2 ring-emerald-500/20'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-black text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Chính thức</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-normal mt-0.5">Tích lũy phép 1 ngày/tháng</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setQuickStatus('probation')}
                      className={`p-3 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                        quickStatus === 'probation'
                          ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-xs ring-2 ring-amber-500/20'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-black text-amber-700">
                        <Briefcase className="w-3.5 h-3.5" />
                        <span>Thử việc</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-normal mt-0.5">Mặc định 0 ngày phép</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setQuickStatus('resigned')}
                      className={`p-3 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                        quickStatus === 'resigned'
                          ? 'bg-slate-100 text-slate-900 border-slate-400 shadow-xs ring-2 ring-slate-500/20'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-black text-slate-700">
                        <UserMinus className="w-3.5 h-3.5 text-slate-500" />
                        <span>Đã nghỉ việc</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-normal mt-0.5">Bảo toàn dữ liệu lịch sử</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setQuickStatus('suspended')}
                      className={`p-3 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                        quickStatus === 'suspended'
                          ? 'bg-rose-50 text-rose-800 border-rose-300 shadow-xs ring-2 ring-rose-500/20'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-black text-rose-700">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Tạm nghỉ</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-normal mt-0.5">Tạm dừng hoạt động</div>
                    </button>
                  </div>
                </div>

                {/* Resignation Specific Inputs */}
                {quickStatus === 'resigned' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-3 pt-2 border-t border-slate-100"
                  >
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] font-semibold leading-relaxed">
                      💡 <strong>Lợi ích bảo toàn:</strong> Nhân sự chuyển sang "Đã nghỉ việc" sẽ không thể đăng nhập hoặc nhận tour mới, nhưng 100% đơn hàng và báo cáo doanh số trước đây vẫn được giữ nguyên đầy đủ.
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-cyan-600" />
                        <span>Ngày chính thức nghỉ việc *</span>
                      </label>
                      <DatePicker
                        value={quickResignedAt}
                        onChange={(val) => setQuickResignedAt(val)}
                        placeholder="dd/mm/yyyy"
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        <span>Ghi chú lý do / Bàn giao công việc cho ai</span>
                      </label>
                      <textarea
                        rows={3}
                        placeholder="VD: Nghỉ theo nguyện vọng cá nhân, đã bàn giao các đơn hàng và danh sách khách cho Sale Nguyễn Văn B..."
                        value={quickResignedNote}
                        onChange={(e) => setQuickResignedNote(e.target.value)}
                        className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                      />
                    </div>
                  </motion.div>
                )}

                {/* Modal Footer */}
                <div className="pt-4 border-t border-slate-150 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    disabled={isUpdatingStatus}
                    onClick={() => setStatusTargetUser(null)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-all cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingStatus}
                    className="px-5 py-2.5 bg-cyan-700 hover:bg-cyan-800 text-white rounded-xl text-xs font-black shadow-lg shadow-cyan-700/15 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {isUpdatingStatus && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>Lưu Cập Nhật Trạng Thái</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* USER EDIT/ADD MODAL */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-lg overflow-hidden my-8"
            >
              <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-blue-400" />
                  <h3 className="font-black text-sm">
                    {editingUser ? 'Chỉnh Sửa Tài Khoản Người Dùng' : 'Tạo Tài Khoản Người Dùng Mới'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUserFormSubmit} className="p-6 space-y-4">
                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    <span>Email đăng nhập *</span>
                  </label>
                  <input
                    type="email"
                    placeholder="user@yourcompany.com"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1">
                    <Key className="w-3.5 h-3.5 text-gray-400" />
                    <span>Mật khẩu {editingUser ? '(Để trống nếu không đổi)' : '*'}</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder={editingUser ? '••••••••' : 'Nhập mật khẩu khởi tạo'}
                      required={!editingUser}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full pl-4 pr-10 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Full name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-gray-400" />
                    <span>Họ và Tên *</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Nguyễn Văn A"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span>Số điện thoại</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="09xxxxxxxx"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>

                {/* Company Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-gray-400" />
                    <span>Công ty / Chi nhánh</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Tour CRM"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>

                {/* Role SELECT */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-gray-400" />
                    <span>Phân vai trò (Role CRM)</span>
                  </label>
                  <CustomSelect
                    value={formData.role}
                    onChange={(val) => setFormData({ ...formData, role: val as Role })}
                    options={Object.entries(mergedRoleLabels).map(([key, val]) => ({
                      value: key,
                      label: val.label
                    }))}
                    icon={<Shield className="w-3.5 h-3.5 text-gray-400" />}
                    placeholder="Chọn vai trò..."
                    buttonClassName="h-10 px-3.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 shadow-2xs hover:border-blue-500 w-full"
                    className="w-full"
                  />
                </div>

                {/* Trạng thái làm việc */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Trạng thái làm việc & Chế độ nhân sự *</span>
                  </label>
                  <CustomSelect
                    value={formData.employment_status || 'official'}
                    onChange={(val) => setFormData({ ...formData, employment_status: val as EmploymentStatus })}
                    options={[
                      { value: 'official', label: 'Chính thức (Tích lũy phép 1 ngày/tháng)' },
                      { value: 'probation', label: 'Thử việc (Mặc định 0 ngày phép)' },
                      { value: 'resigned', label: 'Đã nghỉ việc (Khóa quyền truy cập, bảo toàn dữ liệu)' },
                      { value: 'suspended', label: 'Tạm nghỉ / Đình chỉ' },
                    ]}
                    icon={<Briefcase className="w-3.5 h-3.5 text-emerald-600" />}
                    placeholder="Chọn trạng thái làm việc..."
                    buttonClassName="h-10 px-3.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 shadow-2xs hover:border-emerald-500 w-full"
                    className="w-full"
                  />
                </div>

                {/* Ngày vào làm việc & Ngày làm chính thức */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3 relative z-20">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-blue-600" />
                          <span>Ngày vào làm (Join Date)</span>
                        </span>
                      </label>
                      <DatePicker
                        value={formData.join_date}
                        onChange={(val) => setFormData({ ...formData, join_date: val, official_start_date: formData.official_start_date || val })}
                        placeholder="dd/mm/yyyy"
                        className="w-full"
                      />
                      <span className="text-[10px] text-slate-400 font-medium block">Dùng tính thâm niên công tác</span>
                    </div>

                    {formData.employment_status === 'official' && (
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Ngày làm chính thức</span>
                          </span>
                        </label>
                        <DatePicker
                          value={formData.official_start_date || formData.join_date}
                          onChange={(val) => setFormData({ ...formData, official_start_date: val })}
                          placeholder="dd/mm/yyyy"
                          className="w-full"
                        />
                        <span className="text-[10px] text-emerald-600 font-medium block">Dùng tính tích lũy ngày phép năm</span>
                      </div>
                    )}
                  </div>

                  {formData.join_date && (() => {
                    const sen = calculateSeniority(formData.join_date, null, formData.employment_status === 'resigned' ? formData.resigned_at : null);
                    return (
                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] font-semibold text-slate-600">
                        <span className="flex items-center gap-1 text-slate-500">
                          <Clock className="w-3 h-3 text-emerald-600" />
                          <span>Thâm niên ước tính:</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {sen.text}
                          </span>
                          {sen.seniorityBonusDays > 0 && (
                            <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 text-[10px]">
                              +{sen.seniorityBonusDays} ngày phép thâm niên
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Resigned Details in User Form */}
                {formData.employment_status === 'resigned' && (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 uppercase flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Ngày chính thức nghỉ việc</span>
                      </label>
                      <DatePicker
                        value={formData.resigned_at}
                        onChange={(val) => setFormData({ ...formData, resigned_at: val })}
                        placeholder="dd/mm/yyyy"
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 uppercase">Ghi chú lý do / Bàn giao cho ai</label>
                      <input
                        type="text"
                        placeholder="VD: Bàn giao khách cho Sale B..."
                        value={formData.resigned_note}
                        onChange={(e) => setFormData({ ...formData, resigned_note: e.target.value })}
                        className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 bg-white outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                )}

                {/* Team SELECT */}
                <div className="space-y-1.5 relative z-10">
                  <label className="text-xs font-bold text-indigo-700 uppercase tracking-wide flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Thuộc Team / Nhóm kinh doanh</span>
                  </label>
                  <CustomSelect
                    value={formData.team_id || ''}
                    onChange={(val) => {
                      const selectedT = teams.find(t => t.id === val);
                      setFormData({ 
                        ...formData, 
                        team_id: val,
                        team_name: selectedT ? selectedT.name : ''
                      });
                    }}
                    options={[
                      { value: '', label: '-- Chưa gán Team nào --' },
                      ...teams.map(t => ({
                        value: t.id,
                        label: `${t.name} (Leader: ${t.leader_name || 'Chưa chỉ định'})`
                      }))
                    ]}
                    icon={<Building2 className="w-3.5 h-3.5 text-indigo-500" />}
                    placeholder="Chọn Team..."
                    buttonClassName="h-10 px-3.5 bg-white border border-indigo-200 rounded-xl text-xs font-bold text-indigo-900 shadow-2xs hover:border-indigo-400 w-full"
                    className="w-full"
                  />
                </div>

                {/* Leader SELECT */}
                <div className="space-y-1.5 relative z-0">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-blue-500" />
                    <span>Leader phụ trách (Trưởng nhóm trực tiếp)</span>
                  </label>
                  <CustomSelect
                    value={formData.leader_id || ''}
                    onChange={(val) => setFormData({ ...formData, leader_id: val })}
                    options={[
                      { value: '', label: '-- Không chọn (Tự do / Top Leader) --' },
                      ...users
                        .filter(u => u.id !== editingUser?.id && (u.role === 'sale_leader' || u.role === 'marketing_leader' || u.role === 'admin' || u.role === 'bod' || u.role === 'visa_leader'))
                        .map(u => ({
                          value: u.id,
                          label: `${u.full_name} (${mergedRoleLabels[u.role]?.label || u.role})`
                        }))
                    ]}
                    icon={<Users className="w-3.5 h-3.5 text-blue-500" />}
                    placeholder="Chọn Leader phụ trách..."
                    buttonClassName="h-10 px-3.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 shadow-2xs hover:border-blue-500 w-full"
                    className="w-full"
                  />
                </div>

                {/* Modal Footer */}
                <div className="pt-4 border-t border-slate-150 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-all cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-600/10 transition-all cursor-pointer"
                  >
                    {editingUser ? 'Cập nhật' : 'Tạo tài khoản'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TEAM EDIT/ADD MODAL */}
      <AnimatePresence>
        {isTeamFormOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-5 bg-indigo-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-300" />
                  <h3 className="font-black text-sm">
                    {editingTeam ? 'Chỉnh Sửa Team Kinh Doanh' : 'Tạo Team Kinh Doanh Mới'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsTeamFormOpen(false)}
                  className="p-1 text-indigo-300 hover:text-white rounded-lg transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleTeamFormSubmit} className="p-6 space-y-4">
                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Team Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Tên Team / Nhóm *</span>
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Team Đông Nam Á, Team Châu Âu & Mỹ..."
                    required
                    value={teamFormData.name}
                    onChange={(e) => setTeamFormData({ ...teamFormData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>

                {/* Team Leader Select */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-amber-500" />
                    <span>Trưởng Nhóm (Leader)</span>
                  </label>
                  <CustomSelect
                    value={teamFormData.leader_id}
                    onChange={(val) => {
                      const u = users.find(x => x.id === val);
                      setTeamFormData({
                        ...teamFormData,
                        leader_id: val,
                        leader_name: u ? u.full_name : ''
                      });
                    }}
                    options={[
                      { value: '', label: '-- Chưa chọn Leader --' },
                      ...users
                        .filter(u => u.role === 'sale_leader' || u.role === 'admin' || u.role === 'bod' || u.role === 'marketing_leader' || u.role === 'visa_leader')
                        .map(u => ({
                          value: u.id,
                          label: `${u.full_name} (${mergedRoleLabels[u.role]?.label || u.role}) - ${u.email}`
                        }))
                    ]}
                    icon={<Award className="w-3.5 h-3.5 text-amber-500" />}
                    placeholder="Chọn Leader phụ trách..."
                    buttonClassName="h-10 px-3.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 shadow-2xs hover:border-indigo-500 w-full"
                    className="w-full"
                  />
                </div>

                {/* KPI Target */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Mục tiêu Doanh số KPI Tháng (VNĐ)</span>
                  </label>
                  <input
                    type="number"
                    step="10000000"
                    placeholder="800000000"
                    value={teamFormData.kpi_target}
                    onChange={(e) => setTeamFormData({ ...teamFormData, kpi_target: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>

                {/* Modal Footer */}
                <div className="pt-4 border-t border-slate-150 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsTeamFormOpen(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-all cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-600/10 transition-all cursor-pointer"
                  >
                    {editingTeam ? 'Cập nhật Team' : 'Tạo Team Mới'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ROLE / TITLE EDIT & ADD MODAL (DYNAMIC ROLES) */}
      <AnimatePresence>
        {isRoleFormOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-xl overflow-hidden my-8"
            >
              <div className="p-5 bg-gradient-to-r from-purple-950 to-indigo-950 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-purple-300" />
                  <h3 className="font-black text-sm">
                    {editingRole ? 'Chỉnh Sửa Chức Danh / Vai Trò' : 'Thêm Chức Danh / Vai Trò Mới'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsRoleFormOpen(false)}
                  className="p-1 text-purple-300 hover:text-white rounded-lg transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRoleFormSubmit} className="p-6 space-y-4 font-sans">
                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Role Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-purple-500" />
                    <span>Tên Chức Danh / Vai Trò *</span>
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Trưởng bộ phận Visa, Chuyên viên Digital Ads..."
                    required
                    value={roleFormData.label}
                    onChange={(e) => {
                      const newLabel = e.target.value;
                      // Auto slug role_key if not editing existing role or key was empty
                      const autoKey = newLabel
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '_')
                        .replace(/^_+|_+$/g, '');
                      
                      setRoleFormData(prev => ({
                        ...prev,
                        label: newLabel,
                        role_key: editingRole ? prev.role_key : autoKey
                      }));
                    }}
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
                  />
                </div>

                {/* Role Key (Slug) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1">
                      <Key className="w-3.5 h-3.5 text-slate-400" />
                      <span>Mã định danh (Role Key)</span>
                    </label>
                    <span className="text-[11px] text-slate-400 font-mono">Dùng trong code & database</span>
                  </div>
                  <input
                    type="text"
                    placeholder="VD: visa_leader, marketing_spec..."
                    required
                    disabled={!!editingRole && !!editingRole.is_system}
                    value={roleFormData.role_key}
                    onChange={(e) => setRoleFormData({ ...roleFormData, role_key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                    className="w-full px-4 py-2 border border-slate-300 bg-slate-50 font-mono rounded-xl text-xs font-bold text-purple-950 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all disabled:opacity-60"
                  />
                </div>

                {/* Department & Color Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Phòng ban trực thuộc</span>
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Phòng Visa, Ban Quản Trị..."
                      value={roleFormData.department}
                      onChange={(e) => setRoleFormData({ ...roleFormData, department: e.target.value })}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1">
                      <Palette className="w-3.5 h-3.5 text-pink-500" />
                      <span>Tông màu huy hiệu (Badge)</span>
                    </label>
                    <CustomSelect
                      value={COLOR_PALETTES.find(c => c.bg === roleFormData.bg)?.key || 'indigo'}
                      onChange={(val) => {
                        const palette = COLOR_PALETTES.find(c => c.key === val);
                        if (palette) {
                          setRoleFormData({
                            ...roleFormData,
                            color: palette.color,
                            bg: palette.bg,
                            border: palette.border
                          });
                        }
                      }}
                      options={COLOR_PALETTES.map(p => ({
                        value: p.key,
                        label: p.label,
                        icon: <span className={`w-3.5 h-3.5 rounded-full ${p.bg} ${p.border} border shrink-0`} />
                      }))}
                      icon={<Palette className="w-3.5 h-3.5 text-pink-500" />}
                      placeholder="Chọn màu huy hiệu..."
                      buttonClassName="h-10 px-3.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 shadow-2xs hover:border-purple-500 w-full"
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Role Preview Badge */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500">Xem trước hiển thị:</span>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black border shadow-2xs ${roleFormData.bg} ${roleFormData.color} ${roleFormData.border}`}>
                    <Shield className="w-3.5 h-3.5" />
                    <span>{roleFormData.label || 'Chức danh mới'}</span>
                  </span>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                    Mô tả chức năng & Trách nhiệm
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Mô tả tóm tắt phạm vi công việc của chức danh này..."
                    value={roleFormData.description}
                    onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
                  />
                </div>

                {/* Permissions checklist */}
                <div className="space-y-2 pt-2 border-t border-slate-150">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Sliders className="w-3.5 h-3.5 text-purple-600" />
                      <span>Phân quyền tính năng hệ thống</span>
                    </span>
                    <span className="text-[11px] text-purple-700 font-bold">
                      Đã chọn {roleFormData.permissions.length} quyền
                    </span>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                    {AVAILABLE_PERMISSIONS.map(perm => {
                      const isChecked = roleFormData.permissions.includes(perm.key);
                      return (
                        <label
                          key={perm.key}
                          className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-purple-50/80 border-purple-300 text-purple-950 shadow-2xs ring-1 ring-purple-400/30'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setRoleFormData({
                                  ...roleFormData,
                                  permissions: [...roleFormData.permissions, perm.key]
                                });
                              } else {
                                setRoleFormData({
                                  ...roleFormData,
                                  permissions: roleFormData.permissions.filter(k => k !== perm.key)
                                });
                              }
                            }}
                            className="mt-0.5 w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300 cursor-pointer shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-bold leading-tight truncate">{perm.label}</div>
                            <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{perm.desc}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="pt-4 border-t border-slate-150 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsRoleFormOpen(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-all cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-black shadow-lg shadow-purple-700/15 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>{editingRole ? 'Lưu Thay Đổi' : 'Thêm Chức Danh'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE ROLE CONFIRM MODAL */}
      <AnimatePresence>
        {deleteRoleTarget && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 text-center space-y-4">
                <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto border border-rose-200">
                  <AlertCircle className="w-6 h-6" />
                </div>
                
                <div>
                  <h3 className="text-base font-black text-slate-900">Xác nhận xóa Chức danh?</h3>
                  <p className="text-xs text-gray-500 font-semibold mt-1.5 leading-relaxed">
                    Xóa chức danh <strong className="text-rose-600">{deleteRoleTarget.label}</strong> (Key: {deleteRoleTarget.role_key}).
                  </p>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 text-left font-medium">
                  ⚠️ <strong>Lưu ý:</strong> Nhân sự đang giữ chức danh này sẽ cần được gán lại vai trò mới phù hợp.
                </div>

                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl text-left">
                    {error}
                  </div>
                )}

                <div className="pt-2 flex items-center justify-center gap-3">
                  <button
                    disabled={isDeleting}
                    onClick={() => setDeleteRoleTarget(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-all cursor-pointer disabled:opacity-55"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    disabled={isDeleting}
                    onClick={handleDeleteRole}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md shadow-rose-600/15 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-55"
                  >
                    {isDeleting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>Xác nhận Xóa</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE USER CONFIRM MODAL */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-lg overflow-hidden my-8"
            >
              <div className="p-6 text-center space-y-4">
                <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto border border-amber-200">
                  <AlertCircle className="w-6 h-6" />
                </div>
                
                <div>
                  <h3 className="text-base font-black text-slate-900">Xử lý tài khoản nhân sự</h3>
                  <p className="text-xs text-gray-500 font-semibold mt-1.5 leading-relaxed">
                    Bạn đang thao tác với tài khoản <strong className="text-slate-800">{deleteTarget.full_name}</strong> ({deleteTarget.email}).
                  </p>
                </div>

                {/* Safety recommendation box */}
                <div className="p-4 bg-amber-50 border border-amber-200/80 rounded-xl text-left space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 font-black text-xs">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Lưu ý toàn vẹn dữ liệu kế toán & đơn hàng</span>
                  </div>
                  <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                    Nếu nhân sự này đã từng có <strong>Đơn hàng (Booking)</strong>, <strong>Hóa đơn phiếu thu</strong> hoặc <strong>Lịch sử chấm công</strong>, việc xóa vĩnh viễn tài khoản có thể làm mất dấu dữ liệu doanh số.
                  </p>
                  <p className="text-[11px] text-emerald-800 font-bold leading-relaxed">
                    👉 <strong>Khuyến nghị tốt nhất:</strong> Chuyển sang <strong>"Đã nghỉ việc"</strong> để khóa quyền truy cập, ẩn khỏi danh sách gán mới nhưng vẫn bảo toàn 100% doanh số và lịch sử kế toán.
                  </p>
                </div>

                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl text-left">
                    {error}
                  </div>
                )}

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                  <button
                    disabled={isDeleting}
                    onClick={() => setDeleteTarget(null)}
                    className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-all cursor-pointer disabled:opacity-55"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    disabled={isDeleting}
                    onClick={handleConvertDeleteToResign}
                    className="w-full sm:w-auto px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/15 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-55"
                  >
                    {isDeleting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>Chuyển sang "Đã nghỉ việc" (Khuyên dùng)</span>
                  </button>
                  <button
                    disabled={isDeleting}
                    onClick={handleDeleteUser}
                    className="w-full sm:w-auto px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-55"
                    title="Xóa cứng vĩnh viễn khỏi CSDL"
                  >
                    <span>Vẫn muốn xóa</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE TEAM CONFIRM MODAL */}
      <AnimatePresence>
        {deleteTeamTarget && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 text-center space-y-4">
                <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto border border-rose-200">
                  <AlertCircle className="w-6 h-6" />
                </div>
                
                <div>
                  <h3 className="text-base font-black text-slate-900">Xác nhận xóa Team?</h3>
                  <p className="text-xs text-gray-500 font-semibold mt-1.5 leading-relaxed">
                    Xóa <strong className="text-rose-600">{deleteTeamTarget.name}</strong>. Các nhân viên thuộc Team này sẽ trở về trạng thái "Chưa gán Team".
                  </p>
                </div>

                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl text-left">
                    {error}
                  </div>
                )}

                <div className="pt-2 flex items-center justify-center gap-3">
                  <button
                    disabled={isDeleting}
                    onClick={() => setDeleteTeamTarget(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-all cursor-pointer disabled:opacity-55"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    disabled={isDeleting}
                    onClick={handleDeleteTeam}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md shadow-rose-600/15 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-55"
                  >
                    {isDeleting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>Xác nhận Xóa Team</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
