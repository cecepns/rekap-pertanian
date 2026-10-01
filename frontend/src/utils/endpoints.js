export const API_ENDPOINTS = {
  HEALTH: '/health',

  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    PROFILE: '/auth/profile',
  },

  USERS: {
    LIST: '/users',
    DETAIL: (id) => `/users/${id}`,
    CREATE: '/users',
    UPDATE: (id) => `/users/${id}`,
    DELETE: (id) => `/users/${id}`,
  },

  JENIS_PEKERJAAN: {
    LIST: '/jenis-pekerjaan',
    ALL: '/jenis-pekerjaan/all',
    DETAIL: (id) => `/jenis-pekerjaan/${id}`,
    CREATE: '/jenis-pekerjaan',
    UPDATE: (id) => `/jenis-pekerjaan/${id}`,
    DELETE: (id) => `/jenis-pekerjaan/${id}`,
  },

  DASHBOARD: {
    STATS: '/dashboard/stats',
  },

  LAHAN: {
    LIST: '/lahan',
    ALL: '/lahan/all',
    DETAIL: (id) => `/lahan/${id}`,
    CREATE: '/lahan',
    UPDATE: (id) => `/lahan/${id}`,
    DELETE: (id) => `/lahan/${id}`,
  },

  PEKERJAAN: {
    LIST: '/pekerjaan',
    DETAIL: (id) => `/pekerjaan/${id}`,
    CREATE: '/pekerjaan',
    UPDATE: (id) => `/pekerjaan/${id}`,
    DELETE: (id) => `/pekerjaan/${id}`,
  },

  PEKERJA: {
    LIST: '/pekerja',
    ALL: '/pekerja/all',
    DETAIL: (id) => `/pekerja/${id}`,
    CREATE: '/pekerja',
    UPDATE: (id) => `/pekerja/${id}`,
    DELETE: (id) => `/pekerja/${id}`,
  },

  ABSENSI: {
    LIST: '/absensi',
    DETAIL: (id) => `/absensi/${id}`,
    CREATE: '/absensi',
    BATCH: '/absensi/batch',
    UPDATE: (id) => `/absensi/${id}`,
    DELETE: (id) => `/absensi/${id}`,
    TOGGLE_STATUS: (id) => `/absensi/${id}/status-pembayaran`,
    BULK_BAYAR: '/absensi/bulk-bayar',
  },

  UPAH: {
    REKAP: '/upah/rekap',
    TOGGLE_STATUS: (id) => `/absensi/${id}/status-pembayaran`,
    BULK_BAYAR: '/absensi/bulk-bayar',
  },

  LAPORAN: {
    RINGKASAN: '/laporan/ringkasan',
  },
};
