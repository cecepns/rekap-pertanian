import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shovel,
  Sprout,
  Users,
  CalendarCheck2,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  PlusCircle,
  AlertCircle,
  Clock,
  MapPin,
  ChevronRight,
} from 'lucide-react';
import { request } from '@/utils/request';
import { API_ENDPOINTS } from '@/utils/endpoints';
import { formatRupiah, formatTanggalIndo, STATUS_ABSENSI_MAP } from '@/utils/formatters';
import { CardSkeleton } from '@/components/common/LoadingSkeleton';
import Badge from '@/components/common/Badge';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  const fetchDashboardStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await request.get(API_ENDPOINTS.DASHBOARD.STATS);
      if (res.success) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Fetch stats error:', err);
      setError(err.message || 'Gagal memuat data dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-slate-200 animate-pulse rounded-lg"></div>
          <div className="h-4 w-96 bg-slate-100 animate-pulse rounded"></div>
        </div>
        <CardSkeleton count={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700">
        <AlertCircle className="mx-auto h-10 w-10 text-rose-500 mb-2" />
        <h3 className="font-bold text-base mb-1">Gagal Menghubungkan ke Server</h3>
        <p className="text-sm mb-4">{error}</p>
        <button
          onClick={fetchDashboardStats}
          className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  const {
    total_lahan = 0,
    lahan_aktif = 0,
    total_pekerjaan = 0,
    total_biaya_kerja = 0,
    total_pekerja = 0,
    pekerja_aktif = 0,
    total_absensi = 0,
    total_upah_absensi = 0,
    total_pengeluaran = 0,
    biaya_per_lahan = [],
    jenis_pekerjaan_stats = [],
    recent_pekerjaan = [],
    absensi_hari_ini = [],
  } = stats || {};

  const biayaPerLahan = biaya_per_lahan;
  const jenisPekerjaanStats = jenis_pekerjaan_stats;
  const recentPekerjaan = recent_pekerjaan;
  const absensiHariIni = absensi_hari_ini;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Hero Welcome */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 p-6 sm:p-8 text-white shadow-xl shadow-emerald-900/10">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-600/60 backdrop-blur-md px-3 py-1 text-xs font-semibold text-emerald-100 border border-emerald-400/20 mb-3">
            <Sprout className="h-3.5 w-3.5" />
            <span>Sistem Informasi Pertanian & Lahan</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Ringkasan Operasional Lahan & Pekerja
          </h1>
          <p className="mt-2 text-emerald-100/90 text-sm sm:text-base leading-relaxed">
            Pantau seluruh catatan kerja lahan, pengeluaran operasional, serta absensi harian tenaga kerja secara terpusat dan akurat.
          </p>

          {/* Quick Buttons */}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/pekerjaan?action=create')}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs sm:text-sm font-bold text-emerald-800 shadow-md hover:bg-emerald-50 transition-colors"
            >
              <PlusCircle className="h-4 w-4 text-emerald-600" />
              Catat Pekerjaan Lahan
            </button>
            <button
              onClick={() => navigate('/absensi?action=create')}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-900/60 backdrop-blur-md border border-emerald-400/30 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-emerald-900/80 transition-colors"
            >
              <CalendarCheck2 className="h-4 w-4 text-emerald-300" />
              Input Absensi Pekerja
            </button>
          </div>
        </div>

        {/* Decorative background circle */}
        <div className="absolute -right-12 -bottom-16 h-64 w-64 rounded-full bg-emerald-500/15 blur-2xl pointer-events-none" />
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Keseluruhan Pengeluaran */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Pengeluaran
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {formatRupiah(total_pengeluaran)}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
            <span className="font-medium text-slate-700">Kerja Lahan + Upah Absensi</span>
          </div>
        </div>

        {/* Biaya Pengerjaan Lahan */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Biaya Kerja Lahan
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Shovel className="h-5 w-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-700">
            {formatRupiah(total_biaya_kerja)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>{total_pekerjaan} kali kegiatan kerja</span>
            <button
              onClick={() => navigate('/pekerjaan')}
              className="text-brand-600 hover:text-brand-700 font-semibold inline-flex items-center"
            >
              Detail <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Total Upah Absensi Pekerja */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Upah Absensi
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <CalendarCheck2 className="h-5 w-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-blue-700">
            {formatRupiah(total_upah_absensi)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>{total_absensi} log kehadiran tercatat</span>
            <button
              onClick={() => navigate('/absensi')}
              className="text-brand-600 hover:text-brand-700 font-semibold inline-flex items-center"
            >
              Detail <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Lahan & Pekerja Aktif */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Lahan & Tenaga Kerja
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Sprout className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{lahan_aktif}</span>
            <span className="text-xs text-slate-500">Lahan Aktif / {total_lahan}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>{pekerja_aktif} Pekerja Aktif</span>
            <button
              onClick={() => navigate('/lahan')}
              className="text-brand-600 hover:text-brand-700 font-semibold inline-flex items-center"
            >
              Kelola <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Middle Grid: Breakdown Biaya per Lahan & Distribusi Kegiatan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Biaya per Tempat Lahan */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-slate-900">Pengeluaran per Lahan</h3>
              <p className="text-xs text-slate-500">Alokasi biaya kerja berdasarkan tempat/lahan</p>
            </div>
            <button
              onClick={() => navigate('/lahan')}
              className="text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              Lihat Semua
            </button>
          </div>

          <div className="space-y-4">
            {biaya_per_lahan.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">Belum ada data lahan</p>
            ) : (
              biaya_per_lahan.map((lahan) => {
                const percent =
                  total_biaya_kerja > 0
                    ? Math.round((Number(lahan.total_biaya_lahan) / total_biaya_kerja) * 100)
                    : 0;
                return (
                  <div key={lahan.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <div className="font-semibold text-slate-800 truncate max-w-[240px]">
                        {lahan.nama_lahan}
                        {lahan.komoditas && (
                          <span className="text-slate-400 font-normal ml-1">
                            ({lahan.komoditas})
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-900">
                          {formatRupiah(lahan.total_biaya_lahan)}
                        </span>
                        <span className="text-[11px] text-slate-400 ml-1.5">({percent}%)</span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                        style={{ width: `${Math.max(percent, 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Jenis Pekerjaan Terbanyak */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-slate-900">Kegiatan Kerja Terbanyak</h3>
              <p className="text-xs text-slate-500">Distribusi biaya berdasarkan jenis pengerjaan</p>
            </div>
            <button
              onClick={() => navigate('/pekerjaan')}
              className="text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              Lihat Semua
            </button>
          </div>

          <div className="space-y-3">
            {jenisPekerjaanStats.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">Belum ada catatan pekerjaan</p>
            ) : (
              jenisPekerjaanStats.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-100/80 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100/70 text-emerald-700 font-bold text-xs">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-slate-800">
                        {item.jenis_pekerjaan}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {item.total_kegiatan} kali pengerjaan
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs sm:text-sm font-bold text-slate-900">
                      {formatRupiah(item.total_biaya)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Catatan Pekerjaan Terbaru & Absensi Hari Ini */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Catatan Pekerjaan Terbaru (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-100 bg-white p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-slate-900">Catatan Kerja Lahan Terbaru</h3>
              <p className="text-xs text-slate-500">5 pengerjaan lahan yang terakhir diinput</p>
            </div>
            <button
              onClick={() => navigate('/pekerjaan')}
              className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700"
            >
              Lihat Daftar Lengkap <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentPekerjaan.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">Belum ada catatan pekerjaan</p>
            ) : (
              recentPekerjaan.map((p) => (
                <div key={p.id} className="py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 font-bold">
                      <Shovel className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">
                        {p.jenis_pekerjaan}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap mt-0.5">
                        <span className="font-medium text-emerald-700">{p.nama_lahan}</span>
                        <span>•</span>
                        <span>{formatTanggalIndo(p.tanggal)}</span>
                        {p.foto && (
                          <>
                            <span>•</span>
                            <span className="text-[11px] text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">
                              Ada Foto
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-extrabold text-slate-900">
                      {formatRupiah(p.biaya)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Absensi Hari Ini (1 col) */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 sm:p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-slate-900">Absensi Hari Ini</h3>
              <p className="text-xs text-slate-500">{formatTanggalIndo(new Date(), true)}</p>
            </div>
            <button
              onClick={() => navigate('/absensi')}
              className="text-xs font-bold text-brand-600 hover:text-brand-700"
            >
              Absen
            </button>
          </div>

          <div className="flex-1 space-y-3">
            {absensiHariIni.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center border border-dashed border-slate-200 rounded-xl p-4">
                <Clock className="h-8 w-8 text-slate-300 mb-2" />
                <p className="text-xs text-slate-600 font-semibold">Belum Ada Absensi Hari Ini</p>
                <p className="text-[11px] text-slate-400 mt-1 mb-3">
                  Masukkan absensi pekerja yang bertugas hari ini.
                </p>
                <button
                  onClick={() => navigate('/absensi?action=create')}
                  className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
                >
                  + Input Absensi
                </button>
              </div>
            ) : (
              absensiHariIni.map((item) => {
                const statusMeta = STATUS_ABSENSI_MAP[item.status_kehadiran] || STATUS_ABSENSI_MAP.Hadir;
                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800">{item.nama_pekerja}</p>
                      <p className="text-[11px] text-slate-500">
                        {item.nama_lahan !== '-' ? item.nama_lahan : item.jabatan}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusMeta.bg}`}
                      >
                        {item.status_kehadiran}
                      </span>
                      <p className="text-xs font-semibold text-slate-700 mt-1">
                        {formatRupiah(item.upah_dibayarkan)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
