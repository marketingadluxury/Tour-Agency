import React, { useState } from 'react';
import { X } from 'lucide-react';

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  onConfirm: (input?: string) => void | boolean;
  showInput?: boolean;
  inputPlaceholder?: string;
  inputLabel?: string;
}

export default function ActionModal({
  isOpen,
  onClose,
  title,
  message,
  onConfirm,
  showInput = false,
  inputPlaceholder = '',
  inputLabel = '',
}: ActionModalProps) {
  const [inputValue, setInputValue] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    const result = onConfirm(showInput ? inputValue : undefined);
    if (result !== false) {
      onClose();
      setInputValue('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <p className="text-gray-600 mb-4 break-words">{message}</p>
        {showInput && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">{inputLabel}</label>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={inputPlaceholder}
              className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            />
          </div>
        )}
        <div className="flex justify-end gap-2 whitespace-nowrap shrink-0">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 whitespace-nowrap shrink-0">Hủy</button>
          <button onClick={handleConfirm} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 whitespace-nowrap shrink-0">Xác nhận</button>
        </div>
      </div>
    </div>
  );
}
