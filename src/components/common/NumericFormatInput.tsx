import React, { useState, useEffect } from 'react';

export interface NumericFormatInputProps {
  label?: string;
  value: number | '';
  onChange: (val: number | '') => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
  labelClassName?: string;
  inputClassName?: string;
  suffix?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
}

export const NumericFormatInput: React.FC<NumericFormatInputProps> = ({
  label,
  value,
  onChange,
  required = false,
  placeholder = '',
  className = '',
  labelClassName = 'block text-sm font-medium text-slate-700 mb-1',
  inputClassName = 'w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all',
  suffix,
  disabled = false,
}) => {
  const [displayValue, setDisplayValue] = useState(() => {
    if (value === '' || value === undefined || value === null) return '';
    return new Intl.NumberFormat('vi-VN').format(value);
  });

  useEffect(() => {
    if (value === '' || value === undefined || value === null) {
      setDisplayValue('');
    } else {
      const parsedDisplay = displayValue.replace(/\./g, '');
      if (Number(parsedDisplay) !== value) {
        setDisplayValue(new Intl.NumberFormat('vi-VN').format(value));
      }
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, ''); // digits only
    if (rawValue === '') {
      setDisplayValue('');
      onChange('');
    } else {
      const numValue = Number(rawValue);
      setDisplayValue(new Intl.NumberFormat('vi-VN').format(numValue));
      onChange(numValue);
    }
  };

  return (
    <div className={className}>
      {label && <label className={labelClassName}>{label}</label>}
      <div className="relative">
        <input
          type="text"
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          className={`${inputClassName} ${suffix ? 'pr-8' : ''}`}
          value={displayValue}
          onChange={handleChange}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
};

export default NumericFormatInput;
