import React from 'react';
import AsyncSelect from 'react-select/async';
import { request } from '@/utils/request';
import { API_ENDPOINTS } from '@/utils/endpoints';
import { formatRupiah } from '@/utils/formatters';
import { customSelectStyles } from './AppSelect';
import { User } from 'lucide-react';

export default function AsyncPekerjaSelect({
  value,
  onChange,
  placeholder = 'Cari pegawai...',
  isClearable = true,
  isDisabled = false,
  required = false,
  selectedPekerjaObj = null,
}) {
  // Load workers from backend API with debounced search
  const loadOptions = async (inputValue) => {
    try {
      const res = await request.get(API_ENDPOINTS.PEKERJA.LIST, {
        search: (inputValue || '').trim(),
        limit: 25,
      });

      if (res.success && Array.isArray(res.data)) {
        return res.data.map((p) => ({
          value: p.id,
          label: `${p.nama} (${p.jabatan})`,
          pekerja: p,
        }));
      }
      return [];
    } catch (err) {
      console.error('Error load pekerja options:', err);
      return [];
    }
  };

  // Custom Option rendering with worker details & upah badge
  const formatOptionLabel = ({ label, pekerja }) => {
    if (!pekerja) return label;
    return (
      <div className="flex items-center justify-between py-0.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100/70 text-emerald-800 font-bold text-xs">
            {pekerja.nama.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800 leading-tight">{pekerja.nama}</p>
            <p className="text-[11px] text-slate-500">{pekerja.jabatan}</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            {formatRupiah(pekerja.upah_harian_standar)}
          </span>
        </div>
      </div>
    );
  };

  // Convert raw value or object to selected value (strictly null if value is falsy/empty)
  let selectedOption = null;
  if (value && selectedPekerjaObj) {
    selectedOption = {
      value: selectedPekerjaObj.id,
      label: `${selectedPekerjaObj.nama} (${selectedPekerjaObj.jabatan})`,
      pekerja: selectedPekerjaObj,
    };
  } else if (value) {
    selectedOption = {
      value,
      label: `Pekerja #${value}`,
    };
  }

  const handleChange = (selected) => {
    if (onChange) {
      onChange(selected ? selected.value : '', selected);
    }
  };

  return (
    <div className="relative">
      <AsyncSelect
        value={selectedOption}
        onChange={handleChange}
        loadOptions={loadOptions}
        defaultOptions
        cacheOptions
        placeholder={placeholder}
        isClearable={isClearable}
        isDisabled={isDisabled}
        styles={customSelectStyles}
        formatOptionLabel={formatOptionLabel}
        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
        menuPosition="fixed"
        noOptionsMessage={({ inputValue }) =>
          inputValue ? `Tidak ada pekerja "${inputValue}"` : 'Ketik untuk mencari pekerja...'
        }
        loadingMessage={() => 'Mencari pekerja via API...'}
      />
      {required && (
        <input
          tabIndex={-1}
          autoComplete="off"
          style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
          value={value || ''}
          onChange={() => {}}
          required={required}
        />
      )}
    </div>
  );
}
