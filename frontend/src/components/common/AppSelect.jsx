import React from 'react';
import Select from 'react-select';

export const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    backgroundColor: '#ffffff',
    borderColor: state.isFocused ? '#16a34a' : '#e2e8f0',
    borderRadius: '0.75rem', // 12px (rounded-xl)
    padding: '1px 2px',
    fontSize: '0.875rem', // text-sm
    minHeight: '40px',
    boxShadow: state.isFocused ? '0 0 0 3px rgba(22, 197, 94, 0.15)' : 'none',
    '&:hover': {
      borderColor: state.isFocused ? '#16a34a' : '#cbd5e1',
    },
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  }),
  valueContainer: (base) => ({
    ...base,
    padding: '2px 8px',
  }),
  singleValue: (base) => ({
    ...base,
    color: '#0f172a',
    fontWeight: 500,
  }),
  placeholder: (base) => ({
    ...base,
    color: '#94a3b8',
    fontSize: '0.875rem',
  }),
  menu: (base) => ({
    ...base,
    borderRadius: '0.875rem',
    overflow: 'hidden',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
    border: '1px solid #f1f5f9',
    zIndex: 99999,
  }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 99999,
  }),
  menuList: (base) => ({
    ...base,
    padding: '4px',
  }),
  option: (base, state) => ({
    ...base,
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    padding: '8px 12px',
    margin: '1px 0',
    backgroundColor: state.isSelected
      ? '#16a34a'
      : state.isFocused
      ? '#f0fdf4'
      : 'transparent',
    color: state.isSelected ? '#ffffff' : state.isFocused ? '#15803d' : '#334155',
    fontWeight: state.isSelected ? 600 : 500,
    cursor: 'pointer',
    '&:active': {
      backgroundColor: '#15803d',
      color: '#ffffff',
    },
  }),
  indicatorSeparator: () => ({
    display: 'none',
  }),
  dropdownIndicator: (base, state) => ({
    ...base,
    color: state.isFocused ? '#16a34a' : '#94a3b8',
    padding: '6px',
    '&:hover': {
      color: '#16a34a',
    },
  }),
  clearIndicator: (base) => ({
    ...base,
    color: '#94a3b8',
    padding: '6px',
    '&:hover': {
      color: '#ef4444',
    },
  }),
};

export default function AppSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Pilih...',
  isClearable = false,
  isSearchable = true,
  isDisabled = false,
  isLoading = false,
  className = '',
  name,
  id,
  required = false,
}) {
  // Allow passing raw value (id/string) or { value, label } object
  const selectedOption =
    options.find((opt) => String(opt.value) === String(value)) ||
    (typeof value === 'object' && value !== null ? value : null);

  const handleChange = (selected) => {
    if (onChange) {
      // Return option object or pass both selected and value for convenience
      onChange(selected ? selected.value : '', selected);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <Select
        id={id}
        name={name}
        value={selectedOption}
        onChange={handleChange}
        options={options}
        placeholder={placeholder}
        isClearable={isClearable}
        isSearchable={isSearchable}
        isDisabled={isDisabled}
        isLoading={isLoading}
        styles={customSelectStyles}
        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
        menuPosition="fixed"
        noOptionsMessage={() => 'Tidak ada pilihan'}
        loadingMessage={() => 'Memuat data...'}
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
