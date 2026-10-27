import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DatePickerProps {
  value?: string; // yyyy-mm-dd
  onChange: (val: string) => void; // yyyy-mm-dd
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  align?: 'left' | 'right' | 'auto';
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value = '',
  onChange,
  className = '',
  placeholder = 'dd/mm/yyyy',
  disabled = false,
  align = 'left',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [openUpward, setOpenUpward] = useState(false);
  
  // Current calendar view state
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-detect whether to open calendar upward if not enough space below
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // Calendar popover height is ~330px
      if (spaceBelow < 330 && rect.top > spaceBelow) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }
    }
  }, [isOpen]);

  // Parse yyyy-mm-dd to dd/mm/yyyy for input display
  useEffect(() => {
    if (value && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [y, m, d] = value.split('-');
      setInputValue(`${d}/${m}/${y}`);
      // Also update calendar view to match the current value
      setCurrentMonth(parseInt(m, 10) - 1);
      setCurrentYear(parseInt(y, 10));
    } else {
      setInputValue('');
    }
  }, [value]);

  // Handle click outside to close calendar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format typed value as dd/mm/yyyy
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Strip non-digits
    const clean = val.replace(/\D/g, '').slice(0, 8);
    
    let formatted = '';
    if (clean.length > 0) {
      formatted += clean.slice(0, 2);
    }
    if (clean.length > 2) {
      formatted += '/' + clean.slice(2, 4);
    }
    if (clean.length > 4) {
      formatted += '/' + clean.slice(4, 8);
    }

    setInputValue(formatted);

    // If fully typed (10 chars: dd/mm/yyyy), validate and trigger onChange
    if (formatted.length === 10) {
      const [dStr, mStr, yStr] = formatted.split('/');
      const d = parseInt(dStr, 10);
      const m = parseInt(mStr, 10);
      const y = parseInt(yStr, 10);

      // Simple date validation
      if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1900 && y <= 2100) {
        // More precise check for days in month
        const dateObj = new Date(y, m - 1, d);
        if (dateObj.getFullYear() === y && dateObj.getMonth() === m - 1 && dateObj.getDate() === d) {
          const paddedM = mStr.padStart(2, '0');
          const paddedD = dStr.padStart(2, '0');
          onChange(`${y}-${paddedM}-${paddedD}`);
          return;
        }
      }
    }
    
    // If empty, clear the value
    if (formatted.length === 0) {
      onChange('');
    }
  };

  const handleInputBlur = () => {
    // If typed format is incomplete or invalid, reset to current value
    if (inputValue.length > 0 && inputValue.length < 10) {
      if (value) {
        const [y, m, d] = value.split('-');
        setInputValue(`${d}/${m}/${y}`);
      } else {
        setInputValue('');
      }
    }
  };

  const selectDate = (day: number, month: number, year: number) => {
    const paddedM = String(month + 1).padStart(2, '0');
    const paddedD = String(day).padStart(2, '0');
    onChange(`${year}-${paddedM}-${paddedD}`);
    setIsOpen(false);
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const setToday = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    onChange(`${y}-${m}-${d}`);
    setIsOpen(false);
  };

  const clearDate = () => {
    onChange('');
    setInputValue('');
    setIsOpen(false);
  };

  // Generate calendar days
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    // 0: Sunday, 1: Monday, ...
    // Convert to Monday start: 0: Monday, 1: Tuesday, ... 6: Sunday
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const daysInCurrentMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDayIndex = getFirstDayOfMonth(currentMonth, currentYear);
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const daysInPrevMonth = getDaysInMonth(prevMonth, prevYear);

  const days: { day: number; month: number; year: number; isCurrentMonth: boolean }[] = [];

  // Previous month padding days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    days.push({
      day: daysInPrevMonth - i,
      month: prevMonth,
      year: prevYear,
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let i = 1; i <= daysInCurrentMonth; i++) {
    days.push({
      day: i,
      month: currentMonth,
      year: currentYear,
      isCurrentMonth: true,
    });
  }

  // Next month padding days to make exact grids of 7 cols
  const totalSlots = 42; // 6 rows
  const remainingSlots = totalSlots - days.length;
  const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
  const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
  for (let i = 1; i <= remainingSlots; i++) {
    days.push({
      day: i,
      month: nextMonth,
      year: nextYear,
      isCurrentMonth: false,
    });
  }

  const vietnameseMonths = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
    'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
    'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ];

  const weekdayNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  // Year choices list
  const currentSystemYear = new Date().getFullYear();
  const yearsList: number[] = [];
  for (let y = currentSystemYear + 10; y >= 1920; y--) {
    yearsList.push(y);
  }

  // Highlight selected date
  const isSelected = (day: number, month: number, year: number) => {
    if (!value) return false;
    const [y, m, d] = value.split('-').map(Number);
    return d === day && m === month + 1 && y === year;
  };

  // Highlight today
  const isToday = (day: number, month: number, year: number) => {
    const today = new Date();
    return today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
  };

  return (
    <div ref={containerRef} className={`relative w-full font-sans ${isOpen ? 'z-[60]' : ''}`}>
      <div className="relative flex items-center">
        <input
          type="text"
          disabled={disabled}
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onClick={() => !disabled && setIsOpen(true)}
          className={`w-full h-9 px-2.5 py-1.5 pr-8 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all ${className} ${disabled ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''}`}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className="absolute right-3 text-gray-400 hover:text-slate-600 transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          <CalendarIcon className="w-4 h-4" />
        </button>
      </div>

      {isOpen && !disabled && (
        <div 
          className={`absolute ${align === 'right' ? 'right-0' : align === 'auto' ? 'left-0 md:left-auto md:right-0' : 'left-0'} ${
            openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          } w-72 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 z-[70] animate-fade-in`}
        >
          {/* Calendar Header with Month/Year selection */}
          <div className="flex items-center justify-between mb-3 gap-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 hover:bg-slate-100 rounded-md text-gray-500 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1">
              {/* Month Selector */}
              <select
                value={currentMonth}
                onChange={(e) => setCurrentMonth(parseInt(e.target.value, 10))}
                className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:border-blue-500"
              >
                {vietnameseMonths.map((m, idx) => (
                  <option key={idx} value={idx}>{m}</option>
                ))}
              </select>

              {/* Year Selector */}
              <select
                value={currentYear}
                onChange={(e) => setCurrentYear(parseInt(e.target.value, 10))}
                className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:border-blue-500"
              >
                {yearsList.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 hover:bg-slate-100 rounded-md text-gray-500 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekdays */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {weekdayNames.map((day, idx) => (
              <span key={idx} className="text-[10px] font-bold text-gray-400 uppercase tracking-wider py-1">
                {day}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {days.map((item, idx) => {
              const selected = isSelected(item.day, item.month, item.year);
              const today = isToday(item.day, item.month, item.year);
              
              let dayClass = 'text-slate-800 hover:bg-slate-100 rounded-lg';
              
              if (!item.isCurrentMonth) {
                dayClass = 'text-slate-300 hover:bg-slate-50 rounded-lg';
              }
              if (today) {
                dayClass += ' border border-blue-400 font-bold text-blue-600';
              }
              if (selected) {
                dayClass = 'bg-blue-600 text-white font-bold rounded-lg shadow-sm hover:bg-blue-700';
              }

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => selectDate(item.day, item.month, item.year)}
                  className={`text-xs py-1.5 font-semibold transition-all focus:outline-none ${dayClass}`}
                >
                  {item.day}
                </button>
              );
            })}
          </div>

          {/* Action Footer */}
          <div className="flex justify-between items-center border-t border-slate-100 pt-2.5 mt-2.5">
            <button
              type="button"
              onClick={clearDate}
              className="text-[11px] font-bold text-rose-500 hover:text-rose-700 transition-colors flex items-center gap-0.5"
            >
              <X className="w-3 h-3" />
              <span>Xóa ngày</span>
            </button>

            <button
              type="button"
              onClick={setToday}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors"
            >
              Hôm nay
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
