import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Select from 'react-select';
import { useCRM } from '@/context/CRMContext';
import { useAuth } from '@/context/AuthContext';
import { isOrderInLeaderTeam } from '@/lib/utils';
import { Order, Passenger } from '@/types';
import { ShoppingCart, Users, Plus, ChevronDown, ChevronUp, Trash2, Info, Edit, Search, Phone, Tag, CreditCard, Copy, Check, Clock, X, XCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import ActionModal from '../components/ActionModal';
import EditPassengerModal from '../components/EditPassengerModal';
import EditOrderModal from '../components/EditOrderModal';
import PaymentModal from '../components/PaymentModal';

export default function VisaOrders() {
  const { tours, orders: allOrders, passengers, createOrder, cancelOrder, updatePassenger, updateOrder, currentRole, profilesList } = useCRM();
  const { profile, user } = useAuth();
  
  const orders = React.useMemo(() => {
    // 1. Filter by role/ownership
    let filtered = ['admin', 'operator', 'visa', 'bod'].includes(currentRole)
      ? allOrders
      : currentRole === 'sale_leader'
      ? allOrders.filter(o => isOrderInLeaderTeam(o, profile, profilesList))
      : allOrders.filter(o => o.user_id === profile?.id || (o.created_by && profile?.full_name && o.created_by.toLowerCase().trim().includes(profile.full_name.toLowerCase().trim())));

    
    // 2. ONLY Visa orders
    filtered = filtered.filter(o => {
      const tour = tours.find(t => t.id === o.tour_id);
      return tour?.tour_type === 'visa';
    });
    
    // Sort by created_at descending (newest first)
    return [...filtered].sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });
  }, [allOrders, currentRole, profile, tours]);

  const normalizePhone = (phone: string) => {
    if (!phone) return '';
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('84') && cleaned.length > 2) {
      cleaned = '0' + cleaned.substring(2);
    }
    return cleaned;
  };

  const removeDiacritics = (str: string) => {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
  };

  // Get unique customers from passengers belonging to the user's orders (or all orders for admin/operator/visa)
  const uniqueCustomers = React.useMemo(() => {
    const isFullAccess = ['admin', 'operator', 'visa'].includes(currentRole);
    const userOrderIds = new Set(
      isFullAccess 
        ? allOrders.map(o => o.id)
        : allOrders.filter(o => o.user_id === profile?.id || o.salesperson_id === profile?.id).map(o => o.id)
    );

    const map = new Map<string, Passenger>();
    passengers.forEach(p => {
      if (p.full_name && userOrderIds.has(p.order_id)) {
        const key = `${p.full_name.trim().toUpperCase()}|${p.phone ? normalizePhone(p.phone) : ''}`;
        if (!map.has(key)) {
          map.set(key, p);
        }
      }
    });
    return Array.from(map.values());
  }, [passengers, allOrders, currentRole, profile]);

  const location = useLocation();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [editingPassenger, setEditingPassenger] = useState<Passenger | null>(null);
  const [isEditPassengerOpen, setIsEditPassengerOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isEditOrderOpen, setIsEditOrderOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'cancelled'>('all');

  // Handle navigation from notifications
  useEffect(() => {
    if (location.state) {
      if (location.state.searchTarget) {
        setSearchTerm(location.state.searchTarget);
      }
      if (location.state.expandOrderId) {
        setExpandedOrderId(location.state.expandOrderId);
      }
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const [confirmModalData, setConfirmModalData] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: (input?: string) => void;
    showInput?: boolean;
    inputPlaceholder?: string;
    inputLabel?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrderId(prev => prev === orderId ? null : orderId);
  };

  // New Order Form State
  const [selectedTourId, setSelectedTourId] = useState('');
  const [bookerName, setBookerName] = useState('');
  const [bookerPhone, setBookerPhone] = useState('');
  const [suggestions, setSuggestions] = useState<Passenger[]>([]);
  const [focusedInput, setFocusedInput] = useState<'name' | 'phone' | null>(null);
  const [showCustomerSelector, setShowCustomerSelector] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [adultCount, setAdultCount] = useState<number>(1);
  const [specialRequests, setSpecialRequests] = useState<string>('');

  useEffect(() => {
    if (focusedInput === 'phone') {
      const searchPhone = normalizePhone(bookerPhone);
      if (searchPhone.length >= 3) {
        const matches = uniqueCustomers.filter(c => c.phone && normalizePhone(c.phone).includes(searchPhone));
        setSuggestions(matches.slice(0, 5));
      } else {
        setSuggestions([]);
      }
    } else if (focusedInput === 'name') {
      const searchName = removeDiacritics(bookerName.trim().toLowerCase());
      if (searchName.length >= 2) {
        const matches = uniqueCustomers.filter(c => c.full_name && removeDiacritics(c.full_name.toLowerCase()).includes(searchName));
        setSuggestions(matches.slice(0, 5));
      } else {
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
    }
  }, [bookerPhone, bookerName, focusedInput, uniqueCustomers]);

  const selectSuggestion = (p: Passenger) => {
    setBookerName(p.full_name.toUpperCase());
    setBookerPhone(p.phone || '');
    setSuggestions([]);
    setFocusedInput(null);
  };
  
  const selectedTour = tours.find(t => t.id === selectedTourId);
  const priceAdult = selectedTour ? (selectedTour.price_adult ?? selectedTour.price) : 0;
  const calculatedTotalPrice = selectedTour ? (priceAdult * adultCount) : 0;

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTourId) {
      toast.error('Vui lòng chọn Dịch vụ Visa!');
      return;
    }

    if (!bookerName.trim() || !bookerPhone.trim()) {
      toast.error('Vui lòng điền đầy đủ Họ tên và Số điện thoại của khách đại diện!');
      return;
    }

    const orderPassengers: any[] = [];
    const finalBookerName = bookerName.trim();
    const finalBookerPhone = bookerPhone.trim();
    
    // Create lead passenger
    orderPassengers.push({
      is_payer: true,
      full_name: finalBookerName,
      phone: finalBookerPhone,
      visa_status: 'pending'
    });

    // Add remaining passengers
    for (let i = 1; i < adultCount; i++) {
      orderPassengers.push({
        is_payer: false,
        full_name: `Khách hàng #${i + 1}`,
        visa_status: 'pending'
      });
    }

    const partnerDisplayName = profile?.full_name || user?.email || 'Ẩn danh';
    const roleLabel = currentRole === 'agent' ? 'Đại lý' : currentRole === 'bod' ? 'BOD' : currentRole === 'sale' ? 'Sale' : currentRole === 'sale_leader' ? 'Sale Leader' : currentRole === 'operator' ? 'Điều hành' : 'Quản trị viên';
    const creatorFullName = `${roleLabel} - ${partnerDisplayName}`;

    createOrder({
      tour_id: selectedTourId,
      status: 'sure',
      total_price: calculatedTotalPrice,
      adult_price: priceAdult,
      passengers: orderPassengers,
      booker_name: finalBookerName,
      booker_phone: finalBookerPhone,
      created_by: creatorFullName,
      user_id: profile?.id,
      adult_count: adultCount,
      child_count: 0,
      infant_count: 0,
      vat_option: 'Không xuất VAT',
      special_requests: specialRequests,
    });

    // Reset Form
    setSelectedTourId('');
    setBookerName('');
    setBookerPhone('');
    setAdultCount(1);
    setSpecialRequests('');
    setShowCreateForm(false);
    toast.success('Đặt dịch vụ visa thành công!');
  };

  const tabCounts = React.useMemo(() => {
    return {
      all: orders.length,
      active: orders.filter(o => o.status !== 'cancelled').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length
    };
  }, [orders]);

  const filteredOrders = React.useMemo(() => {
    return orders.filter(o => {
      if (statusFilter === 'active' && o.status === 'cancelled') return false;
      if (statusFilter === 'cancelled' && o.status !== 'cancelled') return false;

      if (searchTerm.trim() !== '') {
        const tour = tours.find(t => t.id === o.tour_id);
        const searchStr = `${o.booker_name || ''} ${o.booker_phone || ''} ${tour?.code || ''} ${tour?.name || ''} ${o.id || ''}`.toLowerCase();
        if (!searchStr.includes(searchTerm.toLowerCase().trim())) {
          return false;
        }
      }
      return true;
    });
  }, [orders, statusFilter, searchTerm, tours]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Quản lý Booking Visa</h2>
          <p className="text-sm text-gray-500 mt-1">
            Theo dõi danh sách các đơn đặt dịch vụ visa lẻ của đại lý và CTV.
          </p>
        </div>
        <button 
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="inline-flex items-center px-4 py-2.5 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-purple-600 hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          {showCreateForm ? 'Đóng form' : 'Đặt Dịch vụ Visa Mới'}
        </button>
      </div>

      {/* Create Order Form */}
      {showCreateForm && (
        <form onSubmit={handleCreateOrder} className="bg-white rounded-xl border border-gray-200 shadow-md p-6 space-y-6 animate-in slide-in-from-top-4 duration-200">
          <div className="border-b border-gray-100 pb-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center">
              <Plus className="w-5 h-5 mr-2 text-purple-600" />
              Tạo Đơn đặt Dịch vụ Visa Mới
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Chọn Dịch vụ Visa *</label>
              <Select 
                placeholder="-- Chọn Quốc gia / Loại Visa --"
                options={tours
                  .filter(t => t.tour_type === 'visa')
                  .map(t => ({
                    value: t.id,
                    label: `[${t.code}] Visa ${t.visa_country || t.destination || 'Chưa xác định'} - ${t.visa_service_type || 'Dịch vụ'} (${t.visa_speed === 'urgent' ? 'Khẩn' : 'Thường'})`
                  }))
                }
                value={tours.find(t => t.id === selectedTourId) ? {
                  value: selectedTourId,
                  label: `[${tours.find(t => t.id === selectedTourId)?.code}] Visa ${tours.find(t => t.id === selectedTourId)?.visa_country || tours.find(t => t.id === selectedTourId)?.destination || 'Chưa xác định'} - ${tours.find(t => t.id === selectedTourId)?.visa_service_type || 'Dịch vụ'}`
                } : null}
                onChange={(option: any) => setSelectedTourId(option ? option.value : '')}
                className="text-sm"
                isClearable
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                styles={{
                  menuPortal: base => ({ ...base, zIndex: 9999 }),
                  control: base => ({ ...base, borderRadius: '0.5rem', borderColor: '#d1d5db' })
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Số lượng hồ sơ *</label>
              <input 
                type="number"
                min="1"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-bold"
                value={adultCount}
                onChange={e => setAdultCount(Math.max(1, Number(e.target.value)))}
              />
            </div>
          </div>

          <div className="border-t border-gray-150 pt-4 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold text-gray-900 flex items-center">
                <span className="w-1.5 h-3.5 bg-purple-600 rounded mr-2 inline-block"></span>
                1. Thông tin khách đặt visa
              </h4>
              {uniqueCustomers.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowCustomerSelector(!showCustomerSelector)}
                  className="text-xs text-purple-600 hover:text-purple-800 font-bold flex items-center gap-1 bg-purple-50 hover:bg-purple-100 px-2.5 py-1.5 rounded-lg border border-purple-150 transition-all shadow-sm"
                >
                  <Users className="w-3.5 h-3.5" />
                  {showCustomerSelector ? 'Đóng tìm kiếm' : 'Chọn từ khách hàng cũ'}
                </button>
              )}
            </div>
            
            {showCustomerSelector && (
              <div className="bg-slate-50 p-4 rounded-xl border border-gray-200 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <input 
                    type="text"
                    placeholder="Tìm theo tên, SĐT hoặc hộ chiếu..."
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-purple-500 outline-none"
                    value={customerSearchQuery}
                    onChange={e => setCustomerSearchQuery(e.target.value)}
                  />
                  {customerSearchQuery && (
                    <button 
                      type="button"
                      onClick={() => setCustomerSearchQuery('')}
                      className="text-xs text-gray-500 hover:text-gray-700 font-medium shrink-0 bg-white border border-gray-200 px-2 py-1 rounded"
                    >
                      Xoá
                    </button>
                  )}
                </div>
                <div className="max-h-48 overflow-y-auto divide-y divide-gray-150 border border-gray-200 rounded-lg bg-white shadow-inner">
                  {uniqueCustomers
                    .filter(c => {
                      const q = removeDiacritics(customerSearchQuery.toLowerCase().trim());
                      if (!q) return true;
                      const nameMatch = c.full_name && removeDiacritics(c.full_name.toLowerCase()).includes(q);
                      const phoneMatch = c.phone && normalizePhone(c.phone).includes(q);
                      const passportMatch = c.passport_number && c.passport_number.toLowerCase().includes(q);
                      return nameMatch || phoneMatch || passportMatch;
                    })
                    .map(c => (
                      <div 
                        key={c.id}
                        onClick={() => {
                          setBookerName(c.full_name.toUpperCase());
                          setBookerPhone(c.phone || '');
                          setShowCustomerSelector(false);
                        }}
                        className="px-3 py-2.5 hover:bg-purple-50 cursor-pointer flex justify-between items-center text-xs transition-colors"
                      >
                        <div>
                          <div className="font-bold text-slate-800 uppercase">{c.full_name}</div>
                          {c.passport_number && (
                            <div className="text-[10px] text-gray-500 font-mono mt-0.5">Hộ chiếu: {c.passport_number}</div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-purple-600">{c.phone || 'Chưa có SĐT'}</div>
                          {c.dob && (
                            <div className="text-[10px] text-gray-400 mt-0.5">NS: {c.dob}</div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`relative ${focusedInput === 'name' ? 'z-30' : 'z-10'}`}>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Họ tên khách đại diện *</label>
                  <input 
                    type="text"
                    required
                    placeholder="NHẬP HỌ VÀ TÊN TRƯỞNG NHÓM ĐẠI DIỆN"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-bold uppercase focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                    value={bookerName}
                    onChange={e => setBookerName(e.target.value.toUpperCase())}
                    onFocus={() => setFocusedInput('name')}
                    onBlur={() => setTimeout(() => setFocusedInput(null), 250)}
                  />
                  {focusedInput === 'name' && suggestions.length > 0 && (
                    <div className="absolute z-50 w-full bg-white border border-gray-300 rounded-lg mt-1 max-h-48 overflow-y-auto shadow-xl divide-y divide-gray-100">
                      {suggestions.map(p => (
                        <div 
                          key={p.id}
                          className="px-3.5 py-2.5 hover:bg-purple-50 cursor-pointer text-xs flex justify-between items-center"
                          onMouseDown={() => selectSuggestion(p)}
                        >
                          <div>
                            <div className="font-bold text-slate-800 uppercase">{p.full_name}</div>
                            {p.passport_number && (
                              <span className="text-[10px] text-gray-400 font-mono">HC: {p.passport_number}</span>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-purple-600">{p.phone || 'Chưa có SĐT'}</div>
                            {p.dob && (
                              <div className="text-[9px] text-gray-400 font-medium">NS: {p.dob}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className={`relative ${focusedInput === 'phone' ? 'z-30' : 'z-10'}`}>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Số điện thoại liên hệ *</label>
                  <input 
                    type="text"
                    required
                    placeholder="Nhập số điện thoại trưởng nhóm"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-bold focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                    value={bookerPhone}
                    onChange={e => setBookerPhone(e.target.value)}
                    onFocus={() => setFocusedInput('phone')}
                    onBlur={() => setTimeout(() => setFocusedInput(null), 250)}
                  />
                  {focusedInput === 'phone' && suggestions.length > 0 && (
                    <div className="absolute z-50 w-full bg-white border border-gray-300 rounded-lg mt-1 max-h-48 overflow-y-auto shadow-xl divide-y divide-gray-100">
                      {suggestions.map(p => (
                        <div 
                          key={p.id}
                          className="px-3.5 py-2.5 hover:bg-purple-50 cursor-pointer text-xs flex justify-between items-center"
                          onMouseDown={() => selectSuggestion(p)}
                        >
                          <div>
                            <div className="font-bold text-slate-800 uppercase">{p.full_name}</div>
                            {p.passport_number && (
                              <span className="text-[10px] text-gray-400 font-mono">HC: {p.passport_number}</span>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-purple-600">{p.phone || 'Chưa có SĐT'}</div>
                            {p.dob && (
                              <div className="text-[9px] text-gray-400 font-medium">NS: {p.dob}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-xl border border-purple-150 flex justify-between items-center">
            <div className="text-sm text-purple-900 font-bold">
              Tổng tiền tạm tính: {new Intl.NumberFormat('vi-VN').format(calculatedTotalPrice)} VND
            </div>
            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800"
              >
                Hủy bỏ
              </button>
              <button 
                type="submit"
                className="bg-purple-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-purple-700 transition-colors shadow-sm"
              >
                Xác nhận đặt Visa
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Tabs phân loại trạng thái */}
      <div className="flex border-b border-gray-200 bg-white rounded-t-xl overflow-x-auto shadow-sm">
        <button
          onClick={() => setStatusFilter('all')}
          className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all shrink-0 whitespace-nowrap cursor-pointer ${
            statusFilter === 'all'
              ? 'border-purple-600 text-purple-700 bg-purple-50/20'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/40'
          }`}
        >
          <span>Tất cả booking</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
            statusFilter === 'all' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-600'
          }`}>
            {tabCounts.all}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('active')}
          className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all shrink-0 whitespace-nowrap cursor-pointer ${
            statusFilter === 'active'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/20'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/40'
          }`}
        >
          <Check className={`w-3.5 h-3.5 ${statusFilter === 'active' ? 'text-emerald-600' : 'text-gray-400'}`} />
          <span>Đang hoạt động / Đã chốt</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
            statusFilter === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
          }`}>
            {tabCounts.active}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('cancelled')}
          className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all shrink-0 whitespace-nowrap cursor-pointer ${
            statusFilter === 'cancelled'
              ? 'border-rose-600 text-rose-700 bg-rose-50/20'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/40'
          }`}
        >
          <X className={`w-3.5 h-3.5 ${statusFilter === 'cancelled' ? 'text-rose-600' : 'text-gray-400'}`} />
          <span>Đã hủy</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
            statusFilter === 'cancelled' ? 'bg-rose-100 text-rose-800' : 'bg-gray-100 text-gray-600'
          }`}>
            {tabCounts.cancelled}
          </span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm shadow-sm"
          placeholder="Tìm booking visa theo mã, tên khách, số điện thoại..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 py-16 text-center shadow-sm">
            <ShoppingCart className="w-14 h-14 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm font-medium">Không tìm thấy booking visa nào phù hợp với bộ lọc.</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const tour = tours.find(t => t.id === order.tour_id);
            const isExpanded = expandedOrderId === order.id;
            const orderPassengers = passengers.filter(p => p.order_id === order.id);
            const isCancelled = order.status === 'cancelled';

            return (
              <div 
                key={order.id} 
                className={`rounded-xl border shadow-sm overflow-hidden transition-all ${
                  isCancelled 
                    ? 'bg-rose-50/15 border-rose-200/80 opacity-90' 
                    : 'bg-white border-gray-200 hover:shadow-md'
                }`}
              >
                <div 
                  className="p-5 cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                  onClick={() => toggleOrderExpand(order.id)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className={`text-base sm:text-lg font-bold uppercase ${isCancelled ? 'text-gray-700 line-through opacity-80' : 'text-gray-900'}`}>
                        {order.booker_name}
                      </h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 uppercase tracking-wider">
                        {tour?.visa_country || tour?.destination || 'Chưa xác định'} - {tour?.visa_service_type || 'Dịch vụ'}
                      </span>
                      {isCancelled ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 uppercase tracking-wider flex items-center gap-1">
                          <X className="w-3 h-3" /> Đã hủy
                        </span>
                      ) : order.status === 'paid' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider flex items-center gap-1">
                          <Check className="w-3 h-3" /> Đã thanh toán
                        </span>
                      ) : order.status === 'hold' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wider flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Giữ chỗ
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider flex items-center gap-1">
                          <Check className="w-3 h-3" /> Đã chốt
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500 font-medium flex-wrap">
                      <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-gray-400" />{order.booker_phone}</span>
                      <span className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5 text-gray-400" />{tour?.code}</span>
                      <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-gray-400" />{order.adult_count} hồ sơ</span>
                      {isCancelled && order.cancel_reason && (
                        <span className="text-[11px] text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          Lý do hủy: {order.cancel_reason}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`text-lg font-bold ${isCancelled ? 'text-gray-500 line-through' : 'text-purple-700'}`}>
                      {new Intl.NumberFormat('vi-VN').format(order.total_price)} đ
                    </div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">
                      Đặt lúc: {format(new Date(order.created_at || ''), 'HH:mm dd/MM/yyyy')}
                    </div>
                  </div>

                  <button className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                </div>

                {isExpanded && (
                  <div className="px-5 pb-6 pt-2 border-t border-gray-100 bg-gray-50/50 animate-in slide-in-from-top-2 duration-200">
                    {isCancelled && (
                      <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>Booking này đã bị hủy bỏ.{order.cancel_reason ? ` Lý do: ${order.cancel_reason}` : ''}</span>
                        </div>
                        <span className="text-[10px] uppercase font-bold text-rose-600 bg-rose-100/80 px-2 py-0.5 rounded">
                          Đã hủy
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                          <Users className="w-4 h-4 text-purple-600" />
                          Danh sách hồ sơ hành khách
                        </h4>
                        <div className="space-y-2">
                          {orderPassengers.map((p) => (
                            <div key={p.id} className="bg-white p-3 rounded-lg border border-gray-200 flex justify-between items-center shadow-sm">
                              <div>
                                <div className={`text-sm font-bold uppercase ${isCancelled ? 'text-gray-500' : 'text-gray-800'}`}>{p.full_name}</div>
                                <div className="text-[10px] text-gray-400 font-mono mt-0.5">#{p.id.substring(0,8)}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  isCancelled || p.visa_status === 'cancelled' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                                  p.visa_status === 'approved' ? 'bg-green-100 text-green-700' :
                                  p.visa_status === 'rejected' ? 'bg-red-100 text-red-700' :
                                  p.visa_status === 'processing' ? 'bg-blue-100 text-blue-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {isCancelled || p.visa_status === 'cancelled' ? 'Đã hủy' :
                                   p.visa_status === 'approved' ? 'Đã duyệt' :
                                   p.visa_status === 'rejected' ? 'Từ chối' :
                                   p.visa_status === 'processing' ? 'Đang xử lý' : 'Chờ xử lý'}
                                </span>
                                {!isCancelled && (
                                  <button 
                                    onClick={() => {
                                      setEditingPassenger(p);
                                      setIsEditPassengerOpen(true);
                                    }}
                                    className="p-1.5 hover:bg-gray-100 rounded-md text-gray-400 transition-colors"
                                    title="Cập nhật hồ sơ"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                          <Info className="w-4 h-4 text-purple-600" />
                          Thông tin booking & Lịch sử
                        </h4>
                        <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3 shadow-sm text-sm">
                          <div className="flex justify-between items-center py-1 border-b border-gray-50">
                            <span className="text-gray-500">Người tạo đơn:</span>
                            <span className="font-bold text-gray-900">{order.created_by}</span>
                          </div>
                          <div className="flex justify-between items-center py-1 border-b border-gray-50">
                            <span className="text-gray-500">Mã giao dịch:</span>
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                const cleanCode = order.id.substring(0, 8).toUpperCase();
                                navigator.clipboard.writeText(cleanCode);
                                toast.success(`Đã sao chép mã đơn hàng: ${cleanCode}`);
                              }}
                              className="font-mono font-bold text-blue-600 hover:text-blue-800 cursor-pointer inline-flex items-center gap-1 group/copy"
                              title="Bấm để sao chép mã đơn hàng"
                            >
                              #{order.id.substring(0, 8)}
                              <Copy className="w-3.5 h-3.5 text-gray-400 group-hover/copy:text-blue-600 opacity-60 group-hover/copy:opacity-100 transition-opacity" />
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-1 border-b border-gray-50">
                            <span className="text-gray-500">Dịch vụ:</span>
                            <span className="font-bold text-purple-700 uppercase">{tour?.name}</span>
                          </div>
                          <div className="flex justify-between items-center py-1 border-b border-gray-50">
                            <span className="text-gray-500">Ghi chú:</span>
                            <span className="font-medium text-gray-800">{order.special_requests || 'Không có'}</span>
                          </div>
                          <div className="flex justify-between items-center py-1">
                            <span className="text-gray-500">Trạng thái:</span>
                            <span className={`font-bold ${isCancelled ? 'text-rose-600' : 'text-emerald-700'}`}>
                              {isCancelled ? 'Đã hủy đơn hàng' : order.status === 'paid' ? 'Đã hoàn tất thanh toán' : 'Đã chốt (Active)'}
                            </span>
                          </div>
                          
                          <div className="pt-4 flex gap-3 flex-wrap">
                            {!isCancelled ? (
                              <>
                                <button 
                                  onClick={() => {
                                    setPaymentOrder(order);
                                    setIsPaymentModalOpen(true);
                                  }}
                                  className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-blue-200 shadow-sm text-xs font-bold rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 transition-all min-w-[120px]"
                                >
                                  <CreditCard className="w-3.5 h-3.5 mr-2" />
                                  Nộp biên lai
                                </button>
                                <button 
                                  onClick={() => {
                                    setEditingOrder(order);
                                    setIsEditOrderOpen(true);
                                  }}
                                  className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-xs font-bold rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-all min-w-[100px]"
                                >
                                  <Edit className="w-3.5 h-3.5 mr-2" />
                                  Sửa đơn
                                </button>
                                <button 
                                  onClick={() => {
                                    setConfirmModalData({
                                      isOpen: true,
                                      title: 'Hủy booking visa',
                                      message: `Bạn có chắc chắn muốn hủy đơn booking visa #${order.id.substring(0,8).toUpperCase()} của khách hàng "${order.booker_name}"? Hành động này sẽ chuyển trạng thái đơn sang Đã hủy và cập nhật hồ sơ visa liên quan.`,
                                      showInput: true,
                                      inputLabel: 'Lý do hủy booking visa (tùy chọn)',
                                      inputPlaceholder: 'Nhập lý do khách hủy hoặc nguyên nhân...',
                                      onConfirm: async (reasonInput?: string) => {
                                        try {
                                          await cancelOrder(order.id, reasonInput);
                                          toast.success('Đã hủy booking visa thành công!');
                                        } catch (err: any) {
                                          toast.error(err?.message || 'Có lỗi xảy ra khi hủy booking visa!');
                                        }
                                      }
                                    });
                                  }}
                                  className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-rose-300 shadow-sm text-xs font-bold rounded-lg text-rose-700 bg-rose-50 hover:bg-rose-100 hover:text-rose-800 transition-all min-w-[100px]"
                                >
                                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                                  Hủy đơn
                                </button>
                              </>
                            ) : (
                              <div className="w-full text-center py-2 text-xs font-bold text-gray-500 bg-gray-100 rounded-lg">
                                Đơn hàng đã ở trạng thái Đã hủy
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modals */}
      {editingPassenger && (
        <EditPassengerModal
          isOpen={isEditPassengerOpen}
          onClose={() => {
            setIsEditPassengerOpen(false);
            setEditingPassenger(null);
          }}
          passenger={editingPassenger}
          onSave={updatePassenger}
        />
      )}

      {editingOrder && (
        <EditOrderModal
          isOpen={isEditOrderOpen}
          onClose={() => {
            setIsEditOrderOpen(false);
            setEditingOrder(null);
          }}
          order={editingOrder}
          onSave={updateOrder}
        />
      )}

      <ActionModal
        isOpen={confirmModalData.isOpen}
        onClose={() => setConfirmModalData(prev => ({ ...prev, isOpen: false }))}
        title={confirmModalData.title}
        message={confirmModalData.message}
        onConfirm={confirmModalData.onConfirm}
        showInput={confirmModalData.showInput}
        inputPlaceholder={confirmModalData.inputPlaceholder}
        inputLabel={confirmModalData.inputLabel}
      />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setPaymentOrder(null);
        }}
        order={paymentOrder}
      />
    </div>
  );
}
