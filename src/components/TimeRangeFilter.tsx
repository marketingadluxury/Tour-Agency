import React, { useState, useEffect, useRef } from 'react';
import { DatePicker } from './DatePicker';
import { TIME_RANGE_OPTIONS } from '../lib/dateUtils';
import { Calendar as CalendarIcon, X, Edit2, ChevronDown, Check } from 'lucide-react';

interface TimeRangeFilterProps {
  value: string;
  onChange: (val: string) => void;
  startDate?: string;
  onChangeStartDate?: (val: string) => void;
  endDate?: string;
  onChangeEndDate?: (val: string) => void;
  label?: string;
  className?: string;
  selectClassName?: string;
  showAllOption?: boolean;
  prefixText?: string;
  alignPopover?: 'left' | 'right';
}

export const TimeRangeFilter: React.FC<TimeRangeFilterProps> = ({
  value,
  onChange,
  startDate = '',
  onChangeStartDate,
  endDate = '',
  onChangeEndDate,
  label,
  className = '',
  selectClassName = '',
  showAllOption = true,
  prefixText = '',
  alignPopover = 'left',
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setIsCustomOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDateDisplay = (dateStr?: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const getCustomPillText = () => {
    const startFmt = formatDateDisplay(startDate);
    const endFmt = formatDateDisplay(endDate);
    if (startFmt && endFmt) return `${startFmt} - ${endFmt}`;
    if (startFmt) return `Từ ${startFmt}`;
    if (endFmt) return `Đến ${endFmt}`;
    return 'Chọn ngày';
  };

  const hasCustomDates = !!(startDate || endDate);

  // Get display text for trigger button
  const getSelectedLabel = () => {
    const found = TIME_RANGE_OPTIONS.find((opt) => opt.value === value);
    if (!found) return 'Mọi thời gian';
    if (value === 'custom') {
      return hasCustomDates ? getCustomPillText() : 'Chọn ngày...';
    }
    let text = found.label;
    if (prefixText && value !== 'all') {
      text = `${prefixText} ${text.toLowerCase()}`;
      text = text.charAt(0).toUpperCase() + text.slice(1);
    }
    if (value === 'this_month') {
      text = `${text} (Mặc định)`;
    }
    return text;
  };

  const options = TIME_RANGE_OPTIONS.filter((opt) => showAllOption || opt.value !== 'all');

  return (
    <div ref={containerRef} className={`relative inline-flex flex-col gap-1 ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {label}
        </label>
      )}

      <div className="flex items-center gap-1.5 flex-nowrap">
        {/* Custom Dropdown Trigger Button */}
        <button
          type="button"
          onClick={() => {
            setIsDropdownOpen(!isDropdownOpen);
            if (isCustomOpen) setIsCustomOpen(false);
          }}
          className={`flex items-center justify-between gap-2 text-left whitespace-nowrap transition-all cursor-pointer ${
            selectClassName ||
            'w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white hover:bg-slate-50 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold text-slate-800'
          }`}
        >
          <span className="truncate flex items-center gap-1.5 min-w-0">
            <CalendarIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="truncate">{getSelectedLabel()}</span>
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
              isDropdownOpen ? 'rotate-180 text-blue-600' : ''
            }`}
          />
        </button>

        {/* Pencil edit icon when custom range is active */}
        {value === 'custom' && (
          <button
            type="button"
            onClick={() => {
              setIsCustomOpen(!isCustomOpen);
              if (isDropdownOpen) setIsDropdownOpen(false);
            }}
            className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-2xs"
            title="Chỉnh sửa khoảng ngày tùy chỉnh"
          >
            <Edit2 className="w-3.5 h-3.5 text-blue-600" />
          </button>
        )}
      </div>

      {/* Floating Custom Dropdown Options Menu */}
      {isDropdownOpen && (
        <div
          className={`absolute top-full ${
            alignPopover === 'right' ? 'right-0' : 'left-0'
          } mt-1.5 z-50 bg-white border border-slate-200 shadow-xl rounded-xl p-1 text-xs min-w-full w-max max-w-xs sm:max-w-sm flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-150`}
        >
          {options.map((opt) => {
            let itemText = opt.label;
            if (prefixText && opt.value !== 'custom' && opt.value !== 'all') {
              itemText = `${prefixText} ${opt.label.toLowerCase()}`;
              itemText = itemText.charAt(0).toUpperCase() + itemText.slice(1);
            }
            if (opt.value === 'this_month') {
              itemText = `${itemText} (Mặc định)`;
            } else if (opt.value === 'custom') {
              itemText = hasCustomDates ? getCustomPillText() : 'Chọn ngày...';
            }

            const isSelected = value === opt.value;

            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsDropdownOpen(false);
                  if (opt.value === 'custom') {
                    setIsCustomOpen(true);
                  }
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="truncate flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-blue-600' : 'bg-transparent'}`} />
                  {itemText}
                </span>
                {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      )}

      {/* Floating Popover Panel for Custom Date Selection */}
      {value === 'custom' && isCustomOpen && (
        <div
          className={`absolute top-full ${
            alignPopover === 'right' ? 'right-0' : 'left-0'
          } mt-1.5 z-50 bg-white border border-slate-200 shadow-xl rounded-xl p-3.5 text-xs w-72 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-150`}
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-blue-600" /> Khoảng thời gian tùy chỉnh
            </span>
            <button
              type="button"
              onClick={() => setIsCustomOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-slate-600 w-16 shrink-0">Từ ngày:</span>
              <div className="flex-1">
                <DatePicker
                  value={startDate}
                  onChange={(val) => onChangeStartDate?.(val)}
                  placeholder="dd/mm/yyyy"
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-slate-600 w-16 shrink-0">Đến ngày:</span>
              <div className="flex-1">
                <DatePicker
                  value={endDate}
                  onChange={(val) => onChangeEndDate?.(val)}
                  placeholder="dd/mm/yyyy"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                onChangeStartDate?.('');
                onChangeEndDate?.('');
              }}
              className="text-[11px] font-semibold text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
            >
              Xóa ngày
            </button>
            <button
              type="button"
              onClick={() => setIsCustomOpen(false)}
              className="px-3.5 py-1 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-2xs transition-colors cursor-pointer"
            >
              Xác nhận
            </button>
          </div>
        </div>
      )}
    </div>
  );
};


