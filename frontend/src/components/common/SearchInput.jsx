import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

export default function SearchInput({
  value = '',
  onChange,
  placeholder = 'Cari data...',
  debounceMs = 400,
  className = '',
}) {
  const [localValue, setLocalValue] = useState(value);
  const debounced = useDebounce(localValue, debounceMs);

  // Sync internal state when parent updates
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Trigger parent onChange when debounced value changes
  useEffect(() => {
    if (debounced !== value) {
      onChange(debounced);
    }
  }, [debounced]);

  const handleClear = () => {
    setLocalValue('');
    onChange('');
  };

  return (
    <div className={`relative flex items-center ${className}`}>
      <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-slate-400" />
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-9 text-sm text-slate-800 placeholder-slate-400 shadow-sm transition-all focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
      />
      {localValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 rounded-md p-0.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          title="Hapus pencarian"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
