/**
 * Format number to Indonesian Rupiah currency (e.g. Rp 350.000)
 */
export const formatRupiah = (value) => {
  const num = Number(value) || 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

/**
 * Format YYYY-MM-DD or date string to readable Indonesian date
 * e.g. "2026-09-25" -> "25 Sep 2026"
 */
export const formatTanggalIndo = (dateStr, includeDay = false) => {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };
    if (includeDay) {
      options.weekday = 'long';
    }
    return new Intl.DateTimeFormat('id-ID', options).format(date);
  } catch {
    return dateStr;
  }
};

/**
 * Get current date formatted as YYYY-MM-DD for input[type="date"]
 */
export const getTodayFormatted = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Predefined common agricultural job types for quick selection & recommendation
 */
export const JENIS_PEKERJAAN_OPTIONS = [
  'Pengolahan Tanah / Bajak',
  'Pembuatan Bedengan & Mulsa',
  'Penyemaian Bibit',
  'Penanaman Bibit (Tandur)',
  'Penyiangan Gulma / Babat Rumput',
  'Pemupukan Susulan I',
  'Pemupukan Susulan II',
  'Penyemprotan Hama & Pestisida',
  'Penyiraman & Pengairan (Irigasi)',
  'Pemangkasan / Pewiwitan',
  'Pemasangan Ajir / Bambu Penyangga',
  'Panen',
  'Pembersihan Lahan Pasca Panen',
  'Perbaikan Saluran & Pematang',
  'Lainnya',
];

/**
 * Attendance status color configurations
 */
export const STATUS_ABSENSI_MAP = {
  Hadir: {
    label: 'Hadir',
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  'Setengah Hari': {
    label: '1/2 Hari',
    bg: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  Izin: {
    label: 'Izin',
    bg: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
  },
  Sakit: {
    label: 'Sakit',
    bg: 'bg-purple-50 text-purple-700 border-purple-200',
    dot: 'bg-purple-500',
  },
  Alpa: {
    label: 'Alpa',
    bg: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-500',
  },
};

/**
 * Lahan status color configurations
 */
export const STATUS_LAHAN_MAP = {
  Aktif: {
    label: 'Aktif',
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  Istirahat: {
    label: 'Istirahat',
    bg: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  'Selesai Panen': {
    label: 'Selesai Panen',
    bg: 'bg-slate-100 text-slate-700 border-slate-300',
    dot: 'bg-slate-500',
  },
};
