import React, { useMemo, useState } from 'react';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import { isOrderInLeaderTeam } from '../lib/utils';
import { format, differenceInDays, differenceInCalendarDays, differenceInMinutes } from 'date-fns';
import {
  PlaneTakeoff,
  Ticket,
  FileCheck,
  Filter,
  X,
  Download,
  Users,
  Search,
  Clock,
  UserCheck,
  AlertCircle,
  History,
  RotateCcw,
  Plane,
  Target,
  CheckCircle2,
  CircleDot,
  Phone,
  Calendar
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CustomSelect } from './CustomSelect';

const removeDiacritics = (str: string): string => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
};

export default function DashboardOperator() {
  const { tours, orders, passengers, currentRole, profilesList } = useCRM();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [daysFilter, setDaysFilter] = useState<number>(99999);
  const [selectedDestination, setSelectedDestination] = useState<string>('all');
  const [selectedTourType, setSelectedTourType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedTour, setSelectedTour] = useState<any | null>(null);
  const [showPassengersModal, setShowPassengersModal] = useState<boolean>(false);
  const [modalSearchTerm, setModalSearchTerm] = useState<string>('');
  const [modalActiveTab, setModalActiveTab] = useState<'sold' | 'hold'>('sold');

  const destinationsList = useMemo(() => {
    const list = new Set<string>();
    tours.forEach(t => {
      if (t.destination && t.tour_type !== 'visa') list.add(t.destination);
    });
    return Array.from(list);
  }, [tours]);

  const daysFilterOptions = useMemo(() => [
    { value: '99999', label: 'Tất cả thời gian' },
    { value: '7', label: 'Trong vòng 7 ngày tới' },
    { value: '15', label: 'Trong vòng 15 ngày tới' },
    { value: '30', label: 'Trong vòng 30 ngày tới' },
    { value: '60', label: 'Trong vòng 60 ngày tới' },
    { value: '90', label: 'Trong vòng 90 ngày tới (3 tháng)' },
    { value: '180', label: 'Trong vòng 180 ngày tới (6 tháng)' },
  ], []);

  const tourTypeOptions = useMemo(() => [
    { value: 'all', label: 'Tất cả loại hình tour' },
    { value: 'internal', label: 'Tour tự vận hành (Internal)' },
    { value: 'partner', label: 'Tour gửi khách đối tác (Partner)' },
    { value: 'private', label: 'Tour đoàn riêng (Private)' },
  ], []);

  const destinationOptions = useMemo(() => [
    { value: 'all', label: 'Tất cả điểm đến' },
    ...destinationsList.map(dest => ({ value: dest, label: dest })),
  ], [destinationsList]);

  // Logic lấy danh sách hành khách của Tour được chọn
  const tourData = useMemo(() => {
    if (!selectedTour) return { ordersList: [], passengersList: [] };

    let ordersList = orders.filter(o => o.tour_id === selectedTour.id && ['sure', 'paid'].includes(o.status));

    // Filter by role: sale_leader only sees their own and team members' orders
    if (currentRole === 'sale_leader') {
      ordersList = ordersList.filter(o => isOrderInLeaderTeam(o, profile, profilesList));
    } else if (['sale', 'agent'].includes(currentRole)) {
      ordersList = ordersList.filter(o => {
        const uid = o.user_id || o.salesperson_id;
        const cb = (o.created_by || '').toLowerCase().trim();
        const pName = (profile?.full_name || '').toLowerCase().trim();
        const pEmail = (profile?.email || '').toLowerCase().trim();
        return uid === profile?.id || (pName && cb.includes(pName)) || (pEmail && cb.includes(pEmail));
      });
    }

    const passengersList: { 
      passenger: any | null; 
      order: any; 
      indexInOrder: number;
      totalInOrder: number;
    }[] = [];

    ordersList.forEach(order => {
      const orderPassengers = passengers.filter(p => p.order_id === order.id);
      if (orderPassengers.length === 0) {
        passengersList.push({
          passenger: null,
          order,
          indexInOrder: 0,
          totalInOrder: 1
        });
      } else {
        orderPassengers.forEach((p, idx) => {
          passengersList.push({
            passenger: p,
            order,
            indexInOrder: idx,
            totalInOrder: orderPassengers.length
          });
        });
      }
    });

    return { ordersList, passengersList };
  }, [selectedTour, orders, passengers, currentRole, profile, profilesList]);

  const filteredModalPassengers = useMemo(() => {
    const { passengersList } = tourData;
    if (!modalSearchTerm.trim()) return passengersList;

    const q = modalSearchTerm.toLowerCase().trim();
    return passengersList.filter(item => {
      const nameMatch = item.passenger?.full_name?.toLowerCase().includes(q) || 
                        item.order?.booker_name?.toLowerCase().includes(q);
      const passportMatch = item.passenger?.passport_number?.toLowerCase().includes(q);
      const phoneMatch = item.passenger?.phone?.includes(q) || item.order?.booker_phone?.includes(q);
      const orderMatch = item.order?.id?.toLowerCase().includes(q);
      const saleMatch = item.order?.created_by?.toLowerCase().includes(q);
      return nameMatch || passportMatch || phoneMatch || orderMatch || saleMatch;
    });
  }, [tourData, modalSearchTerm]);

  // Danh sách giữ chỗ (Hold orders) của Tour được chọn
  const holdOrders = useMemo(() => {
    if (!selectedTour) return [];
    let list = orders.filter(o => o.tour_id === selectedTour.id && o.status === 'hold');

    if (currentRole === 'sale_leader') {
      list = list.filter(o => isOrderInLeaderTeam(o, profile, profilesList));
    } else if (['sale', 'agent'].includes(currentRole)) {
      list = list.filter(o => {
        const uid = o.user_id || o.salesperson_id;
        const cb = (o.created_by || '').toLowerCase().trim();
        const pName = (profile?.full_name || '').toLowerCase().trim();
        const pEmail = (profile?.email || '').toLowerCase().trim();
        return uid === profile?.id || (pName && cb.includes(pName)) || (pEmail && cb.includes(pEmail));
      });
    }

    return [...list].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  }, [selectedTour, orders, currentRole, profile, profilesList]);


  const filteredHoldOrders = useMemo(() => {
    if (!modalSearchTerm.trim()) return holdOrders;
    const q = modalSearchTerm.toLowerCase().trim();
    return holdOrders.filter(o => {
      const idMatch = o.id?.toLowerCase().includes(q);
      const bookerMatch = o.booker_name?.toLowerCase().includes(q) || o.created_by?.toLowerCase().includes(q);
      const customerMatch = o.customer_name?.toLowerCase().includes(q);
      const phoneMatch = o.booker_phone?.includes(q) || o.customer_phone?.includes(q);
      return idMatch || bookerMatch || customerMatch || phoneMatch;
    });
  }, [holdOrders, modalSearchTerm]);

  const formatRemainingTime = (expiryIso?: string) => {
    if (!expiryIso) {
      return { 
        text: 'Không thời hạn', 
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200' 
      };
    }
    const expiryDate = new Date(expiryIso);
    const now = new Date();
    const diffInMinutes = differenceInMinutes(expiryDate, now);

    if (diffInMinutes <= 0) {
      return { 
        text: 'Đã hết hạn', 
        badgeClass: 'bg-red-100 text-red-800 border-red-300 font-bold' 
      };
    }

    const days = Math.floor(diffInMinutes / (24 * 60));
    const hours = Math.floor((diffInMinutes % (24 * 60)) / 60);
    const mins = diffInMinutes % 60;

    let text = '';
    if (days > 0) {
      text = `Còn ${days} ngày ${hours} giờ`;
    } else if (hours > 0) {
      text = `Còn ${hours} giờ ${mins} phút`;
    } else {
      text = `Còn ${mins} phút`;
    }

    let badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold';
    if (diffInMinutes < 180) { // < 3h
      badgeClass = 'bg-rose-100 text-rose-700 border-rose-300 font-bold animate-pulse';
    } else if (diffInMinutes < 720) { // < 12h
      badgeClass = 'bg-amber-100 text-amber-800 border-amber-300 font-bold';
    }

    return { text, badgeClass };
  };

  const handleExportExcel = () => {
    if (!selectedTour) return;
    const { ordersList } = tourData;
    
    // Tính toán tổng số lượng khách động
    let totalAdults = 0;
    let totalChildren = 0;
    let totalInfants = 0;
    let totalSingleRooms = 0;

    ordersList.forEach(order => {
      totalAdults += order.adult_count || 0;
      totalChildren += order.child_count || 0;
      totalInfants += order.infant_count || 0;
      totalSingleRooms += order.single_room_count || 0;
    });

    let rowHtml = '';
    let no = 1;

    ordersList.forEach((order, orderIdx) => {
      const orderPassengers = passengers.filter(p => p.order_id === order.id);
      const orderBgColor = orderIdx % 2 === 0 ? '#ffffff' : '#f8fafc';
      
      const singleRoomSurchargeText = order.single_room_count && order.single_room_count > 0 ? 'O PHONG DON' : '';

      if (orderPassengers.length === 0) {
        // Ghi chú của đơn hàng (Note)
        const noteText = removeDiacritics(order.special_requests || '').toUpperCase();

        rowHtml += `
          <tr style="background-color: ${orderBgColor};">
            <td style="text-align:center; border: 1px solid #000000; padding: 6px;">${no++}</td>
            <td style="text-align:center; border: 1px solid #000000; padding: 6px;">Mr/Mrs</td>
            <td style="font-weight:bold; border: 1px solid #000000; padding: 6px; text-transform:uppercase;">${removeDiacritics(order.booker_name || 'Khach dai dien').toUpperCase()}</td>
            <td style="text-align:center; border: 1px solid #000000; padding: 6px;"></td>
            <td style="text-align:center; border: 1px solid #000000; padding: 6px;">${order.booker_phone || ''}</td>
            <td style="text-align:center; border: 1px solid #000000; padding: 6px; font-family: monospace;">CHUA CO HO CHIEU</td>
            <td style="text-align:center; border: 1px solid #000000; padding: 6px;"></td>
            <td style="text-align:center; border: 1px solid #000000; padding: 6px;"></td>
            <td style="text-align:center; border: 1px solid #000000; padding: 6px;">VN</td>
            <td style="border: 1px solid #000000; padding: 6px; text-align:center; font-weight:bold;">${singleRoomSurchargeText}</td>
            <td style="border: 1px solid #000000; padding: 6px; text-align:center; font-weight:bold; color:#f59e0b;"></td>
            <td style="border: 1px solid #000000; padding: 6px; font-size: 9pt; color:#475569;">
              ${noteText}
            </td>
          </tr>
        `;
      } else {
        orderPassengers.forEach((p, idx) => {
          const isLeader = p.full_name?.toLowerCase().includes('tour leader') || 
                           p.full_name?.toLowerCase().includes('leader');
          
          const isChild = p.full_name?.toLowerCase().includes('chd') || 
                          p.full_name?.toLowerCase().includes('child') ||
                          p.full_name?.toLowerCase().includes('trẻ em') ||
                          p.full_name?.toLowerCase().includes('tre em');
          
          let rowBg = '#ffffff';
          
          const dobStr = p.dob ? format(new Date(p.dob), 'dd/MM/yyyy') : '';
          const issueStr = p.passport_issue_date || '';
          const expiryStr = p.passport_expiry_date ? (p.passport_expiry_date.includes('-') ? format(new Date(p.passport_expiry_date), 'dd/MM/yyyy') : p.passport_expiry_date) : '';
          
          let visaLabel = '';
          if (p.visa_status === 'approved') visaLabel = 'Visa Available';
          else if (p.visa_status === 'processing') visaLabel = 'Processing';
          else if (p.visa_status === 'rejected') visaLabel = 'Rejected';
          else if (p.visa_status === 'not_required') visaLabel = 'No Visa Required';
          
          // Note column
          let noteParts: string[] = [];
          if (isLeader) noteParts.push('TOUR LEADER');
          if (isChild) noteParts.push('CHD');
          if (order.special_requests) noteParts.push(order.special_requests);
          const noteText = removeDiacritics(noteParts.join(' | ')).toUpperCase();

          rowHtml += `
            <tr style="background-color: ${rowBg};">
              <td style="text-align:center; border: 1px solid #000000; padding: 6px;">${no++}</td>
              <td style="text-align:center; border: 1px solid #000000; padding: 6px;">${p.gender || 'Mr'}</td>
              <td style="font-weight:bold; border: 1px solid #000000; padding: 6px; text-transform:uppercase;">${removeDiacritics(p.full_name || '').toUpperCase()}</td>
              <td style="text-align:center; border: 1px solid #000000; padding: 6px;">${dobStr}</td>
              <td style="text-align:center; border: 1px solid #000000; padding: 6px;">${p.phone || order.booker_phone || ''}</td>
              <td style="text-align:center; border: 1px solid #000000; padding: 6px; font-family: monospace;">${p.passport_number || ''}</td>
              <td style="text-align:center; border: 1px solid #000000; padding: 6px;">${issueStr}</td>
              <td style="text-align:center; border: 1px solid #000000; padding: 6px;">${expiryStr}</td>
              <td style="text-align:center; border: 1px solid #000000; padding: 6px;">${p.nationality || 'VN'}</td>
              <td style="border: 1px solid #000000; padding: 6px; text-align:center; font-weight:bold;">${singleRoomSurchargeText}</td>
              <td style="border: 1px solid #000000; padding: 6px; text-align:center; font-weight:bold;">${visaLabel}</td>
              <td style="border: 1px solid #000000; padding: 6px; font-size: 9pt; color:#475569;">
                ${noteText}
              </td>
            </tr>
          `;
        });
      }
    });

    const template = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
      <!--[if gte mso 9]>
      <xml>
      <x:ExcelWorkbook>
        <x:ExcelWorksheets>
          <x:ExcelWorksheet>
            <x:Name>DS_Hanh_Khach_Tour</x:Name>
            <x:WorksheetOptions>
              <x:DisplayGridlines/>
            </x:WorksheetOptions>
          </x:ExcelWorksheet>
        </x:ExcelWorksheets>
      </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
      <style>
        body, table, tr, td, th, div, span, h2 {
          font-family: 'Times New Roman', Times, serif !important;
        }
        table { border-collapse: collapse; }
        th { border: 1px solid #000000; font-weight: bold; text-align: center; font-size: 11pt; padding: 6px; }
        td { border: 1px solid #000000; padding: 5px; font-size: 10pt; }
        .header-main { background-color: #FEF08A; }
      </style>
      </head>
      <body>
        <div style="font-family: 'Times New Roman', Times, serif; font-size: 11pt; font-weight: bold; margin-bottom: 5px; background-color: #FEF08A; padding: 5px; border: 1px solid #000000; display: inline-block;">
          FLIGHT OUT: ${selectedTour.flight_out || 'N/A'} &nbsp;|&nbsp; FLIGHT IN: ${selectedTour.flight_in || 'N/A'}
        </div>
        
        <h2 style="text-align:center; font-family: 'Times New Roman', Times, serif;">DANH SÁCH KHÁCH HÀNG - TOUR ${selectedTour.code}</h2>
        
        <table style="font-family: 'Times New Roman', Times, serif; margin-bottom: 10px; border: none;">
          <tr>
            <td style="border: none; padding: 2px;"><b>Tên tour:</b></td>
            <td style="border: none; padding: 2px;">${removeDiacritics(selectedTour.name).toUpperCase()}</td>
          </tr>
          <tr>
            <td style="border: none; padding: 2px;"><b>Ngày khởi hành:</b></td>
            <td style="border: none; padding: 2px;">${selectedTour.start_date ? format(new Date(selectedTour.start_date), 'dd/MM/yyyy') : 'N/A'}</td>
            <td style="border: none; padding: 2px; padding-left: 20px;"><b>Ngày về:</b></td>
            <td style="border: none; padding: 2px;">${selectedTour.end_date ? format(new Date(selectedTour.end_date), 'dd/MM/yyyy') : 'N/A'}</td>
          </tr>
          <tr>
            <td style="border: none; padding: 2px;"><b>Hãng hàng không:</b></td>
            <td style="border: none; padding: 2px;">${selectedTour.airline || 'N/A'}</td>
          </tr>
          <tr>
            <td style="border: none; padding: 2px;"><b>GUEST:</b></td>
            <td style="border: none; padding: 2px;">${totalAdults} ADT ${totalChildren > 0 ? `; ${totalChildren} CHD` : ''} ${totalInfants > 0 ? `; ${totalInfants} INF` : ''}</td>
          </tr>
          <tr>
            <td style="border: none; padding: 2px;"><b>TOTAL OF ROOMS:</b></td>
            <td style="border: none; padding: 2px;">${totalSingleRooms > 0 ? `${totalSingleRooms} SGL (Phu thu phong don)` : 'N/A'}</td>
          </tr>
        </table>
        <br/>
        <table style="font-family: 'Times New Roman', Times, serif;">
          <thead>
            <tr class="header-main" style="background-color: #FEF08A;">
              <th rowspan="2" style="background-color: #FEF08A; border: 1px solid #000000; padding: 8px;">NO</th>
              <th rowspan="2" style="background-color: #FEF08A; border: 1px solid #000000; padding: 8px;">SEX</th>
              <th rowspan="2" style="background-color: #FEF08A; border: 1px solid #000000; padding: 8px; width: 250px;">FULLNAME</th>
              <th rowspan="2" style="background-color: #FEF08A; border: 1px solid #000000; padding: 8px; width: 100px;">DOB</th>
              <th rowspan="2" style="background-color: #FEF08A; border: 1px solid #000000; padding: 8px; width: 120px;">PHONE</th>
              <th colspan="4" style="background-color: #FEF08A; border: 1px solid #000000; padding: 8px; text-align:center;">PASSPORT INFORMATION</th>
              <th rowspan="2" style="background-color: #FEF08A; border: 1px solid #000000; padding: 8px; width: 150px;">ROOM</th>
              <th rowspan="2" style="background-color: #FEF08A; border: 1px solid #000000; padding: 8px; width: 120px;">VISA STATUS</th>
              <th rowspan="2" style="background-color: #FEF08A; border: 1px solid #000000; padding: 8px; width: 300px;">NOTE</th>
            </tr>
            <tr class="header-main" style="background-color: #FEF08A;">
              <th style="background-color: #FEF08A; border: 1px solid #000000; padding: 8px; width: 120px;">NO.PP</th>
              <th style="background-color: #FEF08A; border: 1px solid #000000; padding: 8px; width: 100px;">DOI</th>
              <th style="background-color: #FEF08A; border: 1px solid #000000; padding: 8px; width: 100px;">DOE</th>
              <th style="background-color: #FEF08A; border: 1px solid #000000; padding: 8px; width: 80px;">NA</th>
            </tr>
          </thead>
          <tbody>
            ${rowHtml}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + template], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DANH_SACH_KHACH_${selectedTour.code}_${format(new Date(), 'ddMMyyyy_HHmm')}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Metrics
  const { holdSeats, sureSeats, upcomingTours, upcomingTicketTours, upcomingVisaTours, departedTours } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let hold = 0;
    let sure = 0;

    const getTourDate = (t: any): Date | null => {
      const raw = t.start_date || t.departure_time;
      if (!raw) return null;
      const d = new Date(raw);
      return isNaN(d.getTime()) ? null : d;
    };

    const matchesFilters = (t: any) => {
      if (t.tour_type === 'visa') return false; // Exclude visa services
      if (selectedDestination !== 'all' && t.destination !== selectedDestination) return false;
      if (selectedTourType !== 'all') {
        if (selectedTourType === 'partner') {
          if (t.tour_type !== 'partner' && t.tour_type !== 'outsourced') return false;
        } else if (selectedTourType === 'internal') {
          if (t.tour_type && t.tour_type !== 'internal') return false;
        } else {
          if (t.tour_type !== selectedTourType) return false;
        }
      }
      if (searchTerm.trim() !== '') {
        const cleanTerm = removeDiacritics(searchTerm.toLowerCase());
        const cleanCode = removeDiacritics((t.code || t.tour_code || '').toLowerCase());
        const cleanName = removeDiacritics((t.name || t.title || '').toLowerCase());
        if (!cleanCode.includes(cleanTerm) && !cleanName.includes(cleanTerm)) return false;
      }
      return true;
    };

    orders.forEach(o => {
      const tour = tours.find(t => t.id === o.tour_id);
      if (!tour) return;
      if (!matchesFilters(tour)) return;

      let seats = (o.adult_count !== undefined || o.child_count !== undefined)
        ? ((o.adult_count || 0) + (o.child_count || 0))
        : 0;
      if (seats === 0) {
        const pCount = passengers.filter(p => p.order_id === o.id).length;
        seats = pCount > 0 ? pCount : 1;
      }

      if (o.status === 'hold') hold += seats;
      if (o.status === 'sure' || o.status === 'paid') sure += seats;
    });

    const upcoming = tours.filter(t => {
      if (!matchesFilters(t)) return false;
      const start = getTourDate(t);
      if (!start) return false;
      const diff = differenceInCalendarDays(start, today);
      return diff >= 0 && (daysFilter === 99999 || diff <= daysFilter);
    }).sort((a, b) => {
      const dA = getTourDate(a);
      const dB = getTourDate(b);
      return (dA ? dA.getTime() : 0) - (dB ? dB.getTime() : 0);
    });

    const upcomingTickets = tours.filter(t => {
      if (!matchesFilters(t)) return false;
      const start = getTourDate(t);
      if (!start) return false;
      const tourStartDiff = differenceInCalendarDays(start, today);
      if (tourStartDiff < 0) return false; // Exclude already departed tours

      const deadline = t.ticket_deadline ? new Date(t.ticket_deadline) : start;
      const diff = differenceInCalendarDays(deadline, today);

      return (t.ticket_status === 'CHỜ XUẤT VÉ' || !t.ticket_status) && (daysFilter === 99999 || diff <= daysFilter);
    }).sort((a, b) => {
      const deadlineA = a.ticket_deadline ? new Date(a.ticket_deadline) : (getTourDate(a) || new Date());
      const deadlineB = b.ticket_deadline ? new Date(b.ticket_deadline) : (getTourDate(b) || new Date());
      return deadlineA.getTime() - deadlineB.getTime();
    });

    const upcomingVisas = tours.filter(t => {
      if (!matchesFilters(t)) return false;
      if (!t.visa_deadline) return false;
      const deadline = new Date(t.visa_deadline);
      const diff = differenceInCalendarDays(deadline, today);
      const start = getTourDate(t) || new Date();
      const tourStartDiff = differenceInCalendarDays(start, today);
      return tourStartDiff >= 0 && (daysFilter === 99999 || diff <= daysFilter); 
    }).sort((a, b) => new Date(a.visa_deadline!).getTime() - new Date(b.visa_deadline!).getTime());

    const departed = tours.filter(t => {
      if (!matchesFilters(t)) return false;
      const start = getTourDate(t);
      if (!start) return false;
      const diff = differenceInCalendarDays(start, today);
      return diff < 0 && (daysFilter === 99999 || Math.abs(diff) <= daysFilter);
    }).sort((a, b) => {
      const dA = getTourDate(a);
      const dB = getTourDate(b);
      return (dB ? dB.getTime() : 0) - (dA ? dA.getTime() : 0);
    }); // Sort newest first

    return {
      holdSeats: hold,
      sureSeats: sure,
      upcomingTours: upcoming,
      upcomingTicketTours: upcomingTickets,
      upcomingVisaTours: upcomingVisas,
      departedTours: departed
    };
  }, [tours, orders, daysFilter, selectedDestination, selectedTourType, searchTerm, passengers]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Detailed Filters */}
      <div className="p-4 bg-white rounded-2xl shadow-sm border border-gray-200 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-gray-800 text-base">Bộ lọc chi tiết điều phối</h2>
          </div>
          {(searchTerm || daysFilter !== 99999 || selectedDestination !== 'all' || selectedTourType !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setDaysFilter(99999);
                setSelectedDestination('all');
                setSelectedTourType('all');
              }}
              className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Đặt lại bộ lọc
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Tìm kiếm */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm mã tour, tên tour..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Thời hạn */}
          <div>
            <CustomSelect
              options={daysFilterOptions}
              value={String(daysFilter)}
              onChange={(val) => setDaysFilter(Number(val))}
              className="w-full"
              buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm font-medium bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-gray-400 transition-colors"
            />
          </div>

          {/* Loại hình Tour */}
          <div>
            <CustomSelect
              options={tourTypeOptions}
              value={selectedTourType}
              onChange={setSelectedTourType}
              className="w-full"
              buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm font-medium bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-gray-400 transition-colors"
            />
          </div>

          {/* Điểm đến */}
          <div>
            <CustomSelect
              options={destinationOptions}
              value={selectedDestination}
              onChange={setSelectedDestination}
              className="w-full"
              buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm font-medium bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-gray-400 transition-colors"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Sắp khởi hành */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <div className="bg-blue-50 p-4 border-b border-blue-100 flex items-center justify-between">
            <h3 className="font-bold text-blue-800 flex items-center gap-2">
              <PlaneTakeoff className="w-5 h-5" />
              Sắp khởi hành
            </h3>
            <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded-full">{upcomingTours.length} tour</span>
          </div>
          <div className="p-4 flex-1 overflow-y-auto max-h-[580px] pr-1.5 scroll-smooth [scrollbar-width:thin] [scrollbar-color:rgba(0,0,0,0.15)_transparent]">
            {upcomingTours.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">Không có tour nào sắp khởi hành</p>
            ) : (
              <div className="space-y-4">
                {upcomingTours.map(t => {
                  const tourDate = t.start_date || t.departure_time;
                  return (
                  <div key={t.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0 hover:bg-slate-50/50 p-1.5 rounded-lg transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-bold text-sm text-blue-950 cursor-pointer hover:text-blue-600 font-mono bg-blue-50/50 px-1.5 py-0.5 rounded border border-blue-100" onClick={() => { setSelectedTour(t); setShowPassengersModal(true); }}>{t.code}</p>
                      <p className="text-xs font-bold text-gray-500">{tourDate ? format(new Date(tourDate), 'dd/MM/yyyy') : 'N/A'}</p>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-1 cursor-pointer hover:text-blue-600" onClick={() => { setSelectedTour(t); setShowPassengersModal(true); }}>{t.name}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 cursor-pointer" onClick={() => { setSelectedTour(t); setShowPassengersModal(true); }}>
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Bán: {t.sold_seats}/{t.total_seats}</span>
                      <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">Hold: {t.hold_seats}</span>
                      <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">Trống: {Math.max(0, t.total_seats - t.sold_seats - t.hold_seats)}</span>
                    </div>
                  </div>
                );})}
              </div>
            )}
          </div>
        </div>

        {/* Chờ xuất vé */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <div className="bg-blue-50/50 p-4 border-b border-blue-100 flex items-center justify-between">
            <h3 className="font-bold text-blue-900 flex items-center gap-2">
              <Ticket className="w-5 h-5" />
              Sắp tới ngày xuất vé
            </h3>
            <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded-full">{upcomingTicketTours.length} tour</span>
          </div>
          <div className="p-4 flex-1 overflow-y-auto max-h-[580px] pr-1.5 scroll-smooth [scrollbar-width:thin] [scrollbar-color:rgba(0,0,0,0.15)_transparent]">
            {upcomingTicketTours.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">Không có tour nào chờ xuất vé</p>
            ) : (
              <div className="space-y-4">
                {upcomingTicketTours.map(t => {
                  const tourDate = t.start_date || t.departure_time;
                  const deadline = t.ticket_deadline ? new Date(t.ticket_deadline) : null;
                  const daysLeft = deadline ? differenceInDays(deadline, new Date()) : null;
                  const isUrgent = daysLeft !== null && daysLeft <= 3;
                  
                  return (
                  <div key={t.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0 hover:bg-slate-50/50 p-1.5 rounded-lg transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-bold text-sm text-indigo-950 cursor-pointer hover:text-indigo-600 font-mono bg-indigo-50/50 px-1.5 py-0.5 rounded border border-indigo-100" onClick={() => { setSelectedTour(t); setShowPassengersModal(true); }}>{t.code}</p>
                      <p className="text-xs font-bold text-gray-500">KH: {tourDate ? format(new Date(tourDate), 'dd/MM/yyyy') : 'N/A'}</p>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-1 cursor-pointer hover:text-indigo-600" onClick={() => { setSelectedTour(t); setShowPassengersModal(true); }}>{t.name}</p>
                    <div className="mt-2 space-y-1.5 cursor-pointer" onClick={() => { setSelectedTour(t); setShowPassengersModal(true); }}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md font-bold uppercase">{t.ticket_status || 'Chờ xuất vé'}</span>
                        {t.airline && <span className="text-[10px] text-gray-500 font-medium">Hãng bay: {t.airline}</span>}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {t.ticket_deadline && (
                          isUrgent ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700 animate-pulse">
                              Hạn vé: {format(new Date(t.ticket_deadline), 'dd/MM/yyyy')}
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-700">
                              Hạn vé: {format(new Date(t.ticket_deadline), 'dd/MM/yyyy')}
                            </span>
                          )
                        )}
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Bán: {t.sold_seats}/{t.total_seats}</span>
                        <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">Trống: {Math.max(0, t.total_seats - t.sold_seats - t.hold_seats)}</span>
                      </div>
                    </div>
                  </div>
                )})}
              </div>
            )}
          </div>
        </div>

        {/* Deadline Visa */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <div className="bg-rose-50 p-4 border-b border-rose-100 flex items-center justify-between">
            <h3 className="font-bold text-rose-800 flex items-center gap-2">
              <FileCheck className="w-5 h-5" />
              Sắp tới hạn Visa
            </h3>
            <span className="text-xs font-semibold text-rose-600 bg-rose-100 px-2 py-1 rounded-full">{upcomingVisaTours.length} tour</span>
          </div>
          <div className="p-4 flex-1 overflow-y-auto max-h-[580px] pr-1.5 scroll-smooth [scrollbar-width:thin] [scrollbar-color:rgba(0,0,0,0.15)_transparent]">
            {upcomingVisaTours.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">Không có deadline visa nào sắp tới</p>
            ) : (
              <div className="space-y-4">
                {upcomingVisaTours.map(t => {
                  const deadline = new Date(t.visa_deadline!);
                  const daysLeft = differenceInDays(deadline, new Date());
                  const isUrgent = daysLeft <= 3;
                  
                  return (
                    <div key={t.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0 hover:bg-slate-50/50 p-1.5 rounded-lg transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <p className="font-bold text-sm text-rose-950 cursor-pointer hover:text-rose-600 font-mono bg-rose-50/50 px-1.5 py-0.5 rounded border border-rose-100" onClick={() => { setSelectedTour(t); setShowPassengersModal(true); }}>{t.code}</p>
                        <p className={`text-xs font-bold ${isUrgent ? 'text-red-600 animate-pulse' : 'text-gray-500'}`}>
                          Hạn: {format(deadline, 'dd/MM/yyyy')}
                        </p>
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-1 cursor-pointer hover:text-rose-600" onClick={() => { setSelectedTour(t); setShowPassengersModal(true); }}>{t.name}</p>
                      <div className="mt-2 flex items-center gap-2 cursor-pointer" onClick={() => { setSelectedTour(t); setShowPassengersModal(true); }}>
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${isUrgent ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                          {daysLeft === 0 ? 'Hôm nay' : daysLeft < 0 ? 'Quá hạn' : `Còn ${daysLeft} ngày`}
                        </span>
                        {t.visa_country && <span className="text-[10px] text-gray-500">Visa: {t.visa_country}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Đã khởi hành */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <div className="bg-gray-50 p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-700 flex items-center gap-2">
              <History className="w-5 h-5 text-gray-500" />
              Đã khởi hành
            </h3>
            <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded-full">{departedTours.length} tour</span>
          </div>
          <div className="p-4 flex-1 overflow-y-auto max-h-[580px] pr-1.5 scroll-smooth [scrollbar-width:thin] [scrollbar-color:rgba(0,0,0,0.15)_transparent]">
            {departedTours.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">Không có tour nào đã khởi hành</p>
            ) : (
              <div className="space-y-4">
                {departedTours.map(t => {
                  const tourDate = t.start_date || t.departure_time;
                  return (
                  <div key={t.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0 hover:bg-slate-50/50 p-1.5 rounded-lg transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-bold text-sm text-gray-800 cursor-pointer hover:text-blue-600 font-mono bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200" onClick={() => { setSelectedTour(t); setShowPassengersModal(true); }}>{t.code}</p>
                      <p className="text-xs font-bold text-gray-500">{tourDate ? format(new Date(tourDate), 'dd/MM/yyyy') : 'N/A'}</p>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-1 cursor-pointer hover:text-blue-600" onClick={() => { setSelectedTour(t); setShowPassengersModal(true); }}>{t.name}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 cursor-pointer" onClick={() => { setSelectedTour(t); setShowPassengersModal(true); }}>
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Bán: {t.sold_seats}/{t.total_seats}</span>
                      <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">Hold: {t.hold_seats}</span>
                    </div>
                  </div>
                );})}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* MODAL DANH SÁCH HÀNH KHÁCH & ĐƠN GIỮ CHỖ */}
      {showPassengersModal && selectedTour && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-6xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-700 to-blue-800 text-white p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-blue-900">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="bg-blue-900/60 text-yellow-300 font-mono font-black text-xs px-2.5 py-1 rounded-full border border-blue-500/30">
                    {selectedTour.code}
                  </span>
                  <span className="text-sm text-blue-100 font-medium">| Lịch khởi hành: {selectedTour.start_date ? format(new Date(selectedTour.start_date), 'dd/MM/yyyy') : 'N/A'}</span>
                </div>
                <h3 className="text-lg md:text-xl font-bold tracking-tight text-white line-clamp-1">{selectedTour.name}</h3>
                <div className="text-xs text-blue-100 mt-2 flex flex-wrap items-center gap-2">
                  {selectedTour.airline && (
                    <span className="inline-flex items-center gap-1.5 bg-blue-900/40 border border-blue-400/20 px-2.5 py-1 rounded-lg">
                      <Plane className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                      <span>Hãng bay: <strong className="text-white font-semibold">{selectedTour.airline}</strong></span>
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 bg-blue-900/40 border border-blue-400/20 px-2.5 py-1 rounded-lg">
                    <Target className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
                    <span>Mở bán (+OB): <strong className="text-white font-semibold">{selectedTour.total_seats}{selectedTour.overbook_limit ? ` (+${selectedTour.overbook_limit} OB)` : ''}</strong></span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-blue-900/40 border border-blue-400/20 px-2.5 py-1 rounded-lg">
                    <Users className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                    <span>Cho phép giữ/bán: <strong className="text-white font-semibold">{(selectedTour.total_seats || 0) + (selectedTour.overbook_limit || 0)}</strong></span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-emerald-950/40 border border-emerald-400/30 px-2.5 py-1 rounded-lg">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Đã bán: <strong className="text-emerald-300 font-bold">{selectedTour.sold_seats}</strong></span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-amber-950/40 border border-amber-400/30 px-2.5 py-1 rounded-lg">
                    <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Đang giữ (Hold): <strong className="text-amber-300 font-bold">{selectedTour.hold_seats || 0}</strong></span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-cyan-950/40 border border-cyan-400/30 px-2.5 py-1 rounded-lg">
                    <CircleDot className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>Chỗ còn lại: <strong className="text-cyan-300 font-bold">{selectedTour.available_seats !== undefined ? selectedTour.available_seats : Math.max(0, (selectedTour.total_seats || 0) + (selectedTour.overbook_limit || 0) - (selectedTour.sold_seats || 0) - (selectedTour.hold_seats || 0))}</strong></span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 self-stretch md:self-auto shrink-0">
                <button
                  onClick={handleExportExcel}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm px-4.5 py-2.5 rounded-xl shadow-lg shadow-emerald-900/20 transition-all cursor-pointer border border-emerald-500/20"
                >
                  <Download className="w-4 h-4" />
                  <span>Xuất Excel chuẩn</span>
                </button>
                <button
                  onClick={() => {
                    setShowPassengersModal(false);
                    setSelectedTour(null);
                    setModalSearchTerm('');
                    setModalActiveTab('sold');
                  }}
                  className="p-2.5 bg-blue-900/40 hover:bg-blue-900/60 text-blue-100 hover:text-white rounded-xl transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-gray-200 bg-slate-100/90 px-5 pt-3 gap-2">
              <button
                type="button"
                onClick={() => setModalActiveTab('sold')}
                className={`px-4 py-2.5 font-bold text-xs md:text-sm rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                  modalActiveTab === 'sold'
                    ? 'border-blue-600 text-blue-700 bg-white font-black shadow-sm'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-slate-200/60'
                }`}
              >
                <Users className="w-4 h-4 text-blue-600" />
                <span>Khách đã bán ({filteredModalPassengers.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setModalActiveTab('hold')}
                className={`px-4 py-2.5 font-bold text-xs md:text-sm rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                  modalActiveTab === 'hold'
                    ? 'border-amber-600 text-amber-800 bg-white font-black shadow-sm'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-slate-200/60'
                }`}
              >
                <Clock className="w-4 h-4 text-amber-600" />
                <span>
                  Danh sách giữ chỗ (Hold: {holdOrders.reduce((sum, o) => sum + ((o.adult_count !== undefined || o.child_count !== undefined) ? ((o.adult_count || 0) + (o.child_count || 0)) : (passengers.filter(p => p.order_id === o.id).length || 1)), 0)} chỗ / {holdOrders.length} đơn)
                </span>
              </button>
            </div>

            {/* Sub-bar / Search */}
            <div className="p-4 bg-slate-50 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={modalActiveTab === 'sold' ? "Tìm hành khách, SĐT, hộ chiếu, mã ĐH..." : "Tìm người giữ chỗ, SĐT, tên khách, mã ĐH..."}
                  value={modalSearchTerm}
                  onChange={(e) => setModalSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                {modalSearchTerm && (
                  <button onClick={() => setModalSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="text-xs text-gray-500 font-medium">
                {modalActiveTab === 'sold' ? (
                  <>Tìm thấy <span className="text-blue-600 font-bold">{filteredModalPassengers.length}</span> hành khách phù hợp</>
                ) : (
                  <>Tìm thấy <span className="text-amber-700 font-bold">{filteredHoldOrders.length}</span> đơn giữ chỗ phù hợp</>
                )}
              </div>
            </div>

            {/* Content Area */}
            <div className="p-5 overflow-y-auto flex-1 bg-white">
              {modalActiveTab === 'sold' ? (
                /* TAB 1: DANH SÁCH HÀNH KHÁCH ĐÃ BÁN */
                filteredModalPassengers.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm font-medium">Chưa có hành khách nào được bán hoặc không tìm thấy hành khách khớp bộ lọc</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                    <table className="w-full text-left border-collapse text-xs md:text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-gray-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                          <th className="py-3 px-3 text-center w-12 border-r border-gray-200">NO</th>
                          <th className="py-3 px-3 w-16 text-center border-r border-gray-200">SEX</th>
                          <th className="py-3 px-4 w-56 border-r border-gray-200">FULLNAME</th>
                          <th className="py-3 px-4 w-32 border-r border-gray-200">Mã booking</th>
                          <th className="py-3 px-4 w-40 border-r border-gray-200">Sale/Đại lý</th>
                          <th className="py-3 px-3 w-28 text-center border-r border-gray-200">Phòng đơn</th>
                          <th className="py-3 px-4 w-52 border-r border-gray-200">Ghi chú</th>
                          <th className="py-3 px-3 w-36 text-center">Tình trạng Visa</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-150">
                        {filteredModalPassengers.map((item, idx) => {
                          const { passenger, order } = item;
                          
                          const orderIdx = tourData.ordersList.findIndex(o => o.id === order.id);
                          const isEvenOrder = orderIdx % 2 === 0;
                          
                          const isLeader = passenger?.full_name?.toLowerCase().includes('tour leader') || 
                                           passenger?.full_name?.toLowerCase().includes('leader') ||
                                           order?.special_requests?.toLowerCase().includes('tour leader') ||
                                           order?.special_requests?.toLowerCase().includes('leader');
                          
                          const isChild = passenger?.full_name?.toLowerCase().includes('chd') || 
                                          passenger?.full_name?.toLowerCase().includes('child') ||
                                          passenger?.full_name?.toLowerCase().includes('trẻ em') ||
                                          order?.special_requests?.toLowerCase().includes('chd');
                          
                          let bgClass = isEvenOrder ? 'bg-white' : 'bg-slate-50/60';
                          if (isLeader) bgClass = 'bg-yellow-100/70 text-amber-900 border-l-2 border-l-amber-500';
                          else if (isChild) bgClass = 'bg-emerald-50/80 text-emerald-900 border-l-2 border-l-emerald-500';

                          let visaBadge = (
                            <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-gray-200">
                              Chưa có
                            </span>
                          );
                          if (passenger?.visa_status === 'approved') {
                            visaBadge = (
                              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                                Đã duyệt
                              </span>
                            );
                          } else if (passenger?.visa_status === 'processing') {
                            visaBadge = (
                              <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
                                Đang xử lý
                              </span>
                            );
                          } else if (passenger?.visa_status === 'rejected') {
                            visaBadge = (
                              <span className="bg-rose-50 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-200">
                                Từ chối
                              </span>
                            );
                          } else if (passenger?.visa_status === 'not_required') {
                            visaBadge = (
                              <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200">
                                Miễn visa
                              </span>
                            );
                          }

                          return (
                            <tr key={`${order.id}-${passenger?.id || idx}`} className={`${bgClass} hover:brightness-95 transition-all`}>
                              <td className="py-3 px-3 text-center border-r border-gray-200/50 font-medium text-gray-500">
                                {idx + 1}
                              </td>
                              <td className="py-3 px-3 text-center border-r border-gray-200/50 font-bold text-gray-600 uppercase">
                                {passenger?.gender || 'Mr'}
                              </td>
                              <td className="py-3 px-4 border-r border-gray-200/50">
                                <div className="font-bold text-gray-950 uppercase tracking-tight">
                                  {passenger?.full_name || order.booker_name || 'Khách đại diện'}
                                </div>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                                  {passenger?.phone && (
                                    <div className="flex items-center gap-1 text-[11px] text-gray-500 font-mono">
                                      <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                                      <span>{passenger.phone}</span>
                                    </div>
                                  )}
                                  {passenger?.dob && (
                                    <div className="flex items-center gap-1 text-[11px] text-gray-500 font-mono">
                                      <Calendar className="w-3 h-3 text-gray-400 shrink-0" />
                                      <span>{format(new Date(passenger.dob), 'dd/MM/yyyy')}</span>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4 border-r border-gray-200/50">
                                <span className="font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[11px] border border-blue-100 font-bold">
                                  {order.id ? order.id.substring(0, 8).toUpperCase() : ''}
                                </span>
                                <div className="text-[10px] text-gray-400 mt-1 font-mono">{format(new Date(order.created_at), 'dd/MM/yyyy')}</div>
                              </td>
                              <td className="py-3 px-4 border-r border-gray-200/50 font-semibold text-gray-800">
                                {order.created_by || 'Chưa rõ'}
                              </td>
                              <td className="py-3 px-3 text-center border-r border-gray-200/50 font-medium text-gray-700">
                                {order.single_room_count > 0 ? (
                                  <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200 font-bold text-[11px]">
                                    Có ({order.single_room_count} phòng)
                                  </span>
                                ) : (
                                  <span className="text-gray-400">Không</span>
                                )}
                              </td>
                              <td className="py-3 px-4 border-r border-gray-200/50 text-xs text-gray-600 italic">
                                {order.special_requests || order.room_share_info || 'Không có ghi chú'}
                              </td>
                              <td className="py-3 px-3 text-center">
                                {visaBadge}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              ) : (
                /* TAB 2: DANH SÁCH GIỮ CHỖ (HOLD) */
                filteredHoldOrders.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="w-12 h-12 text-amber-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm font-medium">Chưa có đơn nào đang giữ chỗ (Hold) cho tour này</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                    <table className="w-full text-left border-collapse text-xs md:text-sm">
                      <thead>
                        <tr className="bg-amber-50/80 border-b border-amber-200/80 text-amber-900 font-bold uppercase tracking-wider text-[11px]">
                          <th className="py-3 px-3 text-center w-12 border-r border-amber-200/60">STT</th>
                          <th className="py-3 px-4 w-32 border-r border-amber-200/60">Mã Booking</th>
                          <th className="py-3 px-4 w-48 border-r border-amber-200/60">Người giữ chỗ</th>
                          <th className="py-3 px-4 w-52 border-r border-amber-200/60">Khách hàng đại diện</th>
                          <th className="py-3 px-3 text-center w-36 border-r border-amber-200/60">Số lượng giữ chỗ</th>
                          <th className="py-3 px-4 w-40 border-r border-amber-200/60">Thời gian đặt</th>
                          <th className="py-3 px-4 w-56 text-center">Thời gian còn lại (Hạn Hold)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-150">
                        {filteredHoldOrders.map((order, idx) => {
                          const orderSeats = (order.adult_count !== undefined || order.child_count !== undefined)
                            ? ((order.adult_count || 0) + (order.child_count || 0))
                            : (passengers.filter(p => p.order_id === order.id).length || 1);

                          const adults = order.adult_count || 0;
                          const children = order.child_count || 0;
                          const infants = order.infant_count || 0;

                          const timeInfo = formatRemainingTime(order.hold_expiry);

                          return (
                            <tr key={order.id} className="hover:bg-amber-50/30 transition-all">
                              <td className="py-3 px-3 text-center border-r border-gray-200/50 font-medium text-gray-500">
                                {idx + 1}
                              </td>
                              <td className="py-3 px-4 border-r border-gray-200/50 font-mono">
                                <span className="bg-amber-100/80 text-amber-900 px-2 py-0.5 rounded font-bold border border-amber-200 text-xs">
                                  {order.id ? order.id.substring(0, 8).toUpperCase() : ''}
                                </span>
                              </td>
                              <td className="py-3 px-4 border-r border-gray-200/50">
                                <div className="font-bold text-gray-900">
                                  {order.booker_name || order.created_by || 'Sale'}
                                </div>
                                {order.created_by && (
                                  <div className="text-[10px] text-gray-500">Tạo bởi: {order.created_by}</div>
                                )}
                              </td>
                              <td className="py-3 px-4 border-r border-gray-200/50">
                                <div className="font-semibold text-gray-950 uppercase">
                                  {order.customer_name || order.booker_name || 'Khách đại diện'}
                                </div>
                                {(order.customer_phone || order.booker_phone) && (
                                  <div className="flex items-center gap-1 text-[11px] text-gray-500 font-mono mt-1">
                                    <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                                    <span>{order.customer_phone || order.booker_phone}</span>
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-3 text-center border-r border-gray-200/50 font-bold text-amber-800">
                                <span className="bg-amber-50 text-amber-800 px-2.5 py-1 rounded-full border border-amber-200 text-xs font-black inline-block">
                                  {orderSeats} chỗ
                                </span>
                                {(adults > 0 || children > 0 || infants > 0) && (
                                  <div className="text-[10px] text-gray-500 font-normal mt-1">
                                    ({adults} NL{children > 0 ? `, ${children} TE` : ''}{infants > 0 ? `, ${infants} EB` : ''})
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-4 border-r border-gray-200/50 text-xs text-gray-600 font-mono">
                                {format(new Date(order.created_at), 'HH:mm dd/MM/yyyy')}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <div className="inline-flex flex-col items-center gap-1">
                                  <span className={`px-3 py-1 rounded-full text-xs border ${timeInfo.badgeClass}`}>
                                    {timeInfo.text}
                                  </span>
                                  {order.hold_expiry && (
                                    <span className="text-[10px] text-gray-400 font-mono">
                                      Hạn: {format(new Date(order.hold_expiry), 'HH:mm dd/MM/yyyy')}
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
