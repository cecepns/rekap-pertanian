import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Banknote,
  DollarSign,
  CalendarCheck2,
  Users,
  Sprout,
  Filter,
  CheckCircle2,
  Clock,
  Printer,
  Download,
  Eye,
  FileText,
  AlertCircle,
  Phone,
  Briefcase,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  CheckCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { request } from '@/utils/request';
import { API_ENDPOINTS } from '@/utils/endpoints';
import {
  formatRupiah,
  formatTanggalIndo,
  getTodayFormatted,
  STATUS_ABSENSI_MAP,
} from '@/utils/formatters';
import SearchInput from '@/components/common/SearchInput';
import Modal from '@/components/common/Modal';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import EmptyState from '@/components/common/EmptyState';
import { TableSkeleton, CardSkeleton } from '@/components/common/LoadingSkeleton';
import Badge from '@/components/common/Badge';
import AppSelect from '@/components/common/AppSelect';

export default function UpahPekerjaPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [pekerjaList, setPekerjaList] = useState([]);
  const [rawLogs, setRawLogs] = useState([]);
  const [lahanOptions, setLahanOptions] = useState([]);
  const [summary, setSummary] = useState({
    grand_total_dibayarkan: 0,
    grand_total_belum_dibayar: 0,
    grand_total_semua: 0,
    grand_total_kehadiran: 0,
    grand_total_pekerja: 0,
  });

  // Active view tab: 'per-pekerja' | 'log-harian'
  const [activeTab, setActiveTab] = useState('per-pekerja');

  // Filters
  const [search, setSearch] = useState('');
  const [selectedLahan, setSelectedLahan] = useState('');
  const [selectedStatusBayar, setSelectedStatusBayar] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Worker detail modal
  const [selectedPekerjaDetail, setSelectedPekerjaDetail] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Wage slip modal (Kuitansi / Slip Upah)
  const [slipData, setSlipData] = useState(null);
  const [isSlipModalOpen, setIsSlipModalOpen] = useState(false);

  // Confirm dialog for toggling payment status
  const [confirmToggle, setConfirmToggle] = useState({
    isOpen: false,
    item: null,
    targetStatus: '',
    loading: false,
  });

  // Fetch dropdown lahan
  useEffect(() => {
    request.get(API_ENDPOINTS.LAHAN.ALL).then((res) => {
      if (res.success) setLahanOptions(res.data);
    });
  }, []);

  // Fetch Rekap Upah Data
  const fetchRekapUpah = useCallback(async () => {
    setLoading(true);
    try {
      const res = await request.get(API_ENDPOINTS.UPAH.REKAP, {
        search: search || undefined,
        lahan_id: selectedLahan || undefined,
        status_pembayaran: selectedStatusBayar || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      if (res.success) {
        setPekerjaList(res.data || []);
        setRawLogs(res.raw_logs || []);
        setSummary(res.summary || {
          grand_total_dibayarkan: 0,
          grand_total_belum_dibayar: 0,
          grand_total_semua: 0,
          grand_total_kehadiran: 0,
          grand_total_pekerja: 0,
        });
      }
    } catch (err) {
      toast.error('Gagal memuat rekap upah: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [search, selectedLahan, selectedStatusBayar, startDate, endDate]);

  useEffect(() => {
    fetchRekapUpah();
  }, [fetchRekapUpah]);

  // Handle Quick Toggle Status Pembayaran
  const handlePromptToggle = (item) => {
    const nextStatus = item.status_pembayaran === 'Sudah Dibayar' ? 'Belum Dibayar' : 'Sudah Dibayar';
    setConfirmToggle({
      isOpen: true,
      item,
      targetStatus: nextStatus,
      loading: false,
    });
  };

  const handleConfirmToggle = async () => {
    if (!confirmToggle.item) return;
    setConfirmToggle((prev) => ({ ...prev, loading: true }));
    try {
      await request.patch(API_ENDPOINTS.UPAH.TOGGLE_STATUS(confirmToggle.item.id), {
        status_pembayaran: confirmToggle.targetStatus,
      });
      toast.success(
        `Status upah ${confirmToggle.item.nama_pekerja} (${formatTanggalIndo(
          confirmToggle.item.tanggal
        )}) diubah menjadi "${confirmToggle.targetStatus}"`
      );
      setConfirmToggle({ isOpen: false, item: null, targetStatus: '', loading: false });
      fetchRekapUpah();
    } catch (err) {
      toast.error('Gagal mengubah status: ' + err.message);
      setConfirmToggle((prev) => ({ ...prev, loading: false }));
    }
  };

  // Open worker detail modal
  const handleOpenWorkerDetail = (pekerja) => {
    setSelectedPekerjaDetail(pekerja);
    setIsDetailModalOpen(true);
  };

  // Open slip modal
  const handleOpenSlip = (pekerja) => {
    setSlipData(pekerja);
    setIsSlipModalOpen(true);
  };

  const handlePrintSlip = () => {
    window.print();
  };

  // Export CSV
  const handleExportCSV = () => {
    try {
      let csvContent = 'data:text/csv;charset=utf-8,';

      if (activeTab === 'per-pekerja') {
        csvContent += '=== REKAPITULASI UPAH PER PEKERJA ===\r\n';
        csvContent += 'No,Nama Pekerja,Jabatan,No HP,Hari Hadir,Upah Standar (Rp),Upah Sudah Dibayar (Rp),Upah Belum Dibayar (Rp),Total Upah (Rp),Status Pembayaran\r\n';
        pekerjaList.forEach((p, idx) => {
          csvContent += `${idx + 1},"${p.nama}","${p.jabatan}","${p.no_hp || '-'}","${p.total_kehadiran} hari",${p.upah_harian_standar},${p.total_upah_dibayarkan},${p.total_upah_belum_dibayar},${p.total_upah_keseluruhan},"${p.status_bayar_summary}"\r\n`;
        });
        csvContent += `\r\nTOTAL SUDAH DIBAYARKAN,,,,,${summary.grand_total_dibayarkan}\r\n`;
        csvContent += `TOTAL BELUM DIBAYAR,,,,,${summary.grand_total_belum_dibayar}\r\n`;
        csvContent += `GRAND TOTAL UPAH KESELURUHAN,,,,,${summary.grand_total_semua}\r\n`;
      } else {
        csvContent += '=== RINCIAN LOG HARIAN PEMBAYARAN UPAH ===\r\n';
        csvContent += 'No,Tanggal,Nama Pekerja,Jabatan,Lokasi Lahan,Kehadiran,Nominal Upah (Rp),Status Pembayaran,Tanggal Bayar,Keterangan\r\n';
        rawLogs.forEach((l, idx) => {
          csvContent += `${idx + 1},"${l.tanggal}","${l.nama_pekerja}","${l.jabatan}","${l.nama_lahan}","${l.status_kehadiran}",${l.upah_dibayarkan},"${l.status_pembayaran}","${l.tanggal_bayar || '-'}","${(l.keterangan || '').replace(/"/g, '""')}"\r\n`;
        });
      }

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `rekap_upah_pekerja_${getTodayFormatted()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('File CSV Rekap Upah berhasil diunduh');
    } catch (err) {
      toast.error('Gagal mengekspor CSV: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Banknote className="h-6 w-6 text-brand-600" />
            Upah Pekerja yang Sudah Dibayarkan
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pantau rekapitulasi pembayaran upah tenaga kerja pertanian, status lunas, dan rincian hari kerja.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
          >
            <Download className="h-4 w-4 text-emerald-600" />
            Ekspor CSV
          </button>

          <button
            type="button"
            onClick={() => navigate('/laporan')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-brand-700 hover:bg-brand-100 shadow-sm transition-colors"
          >
            <FileText className="h-4 w-4" />
            Laporan Lengkap & PDF
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        {/* Total Upah Sudah Dibayarkan */}
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50/50 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Upah Sudah Dibayarkan
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-600 text-white">
              Lunas
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-700">
            {formatRupiah(summary.grand_total_dibayarkan)}
          </div>
          <p className="mt-1 text-xs text-emerald-600 font-medium">
            Total upah riil yang sudah diserahterimakan
          </p>
        </div>

        {/* Total Upah Belum Dibayar */}
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/40 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-amber-600" />
              Upah Belum Dibayar
            </span>
            {summary.grand_total_belum_dibayar > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white">
                Pending
              </span>
            )}
          </div>
          <div className="text-2xl font-black text-amber-700">
            {formatRupiah(summary.grand_total_belum_dibayar)}
          </div>
          <p className="mt-1 text-xs text-amber-600 font-medium">
            {summary.grand_total_belum_dibayar > 0
              ? 'Ada upah tertunda yang belum diambil pekerja'
              : 'Semua upah telah lunas dibayarkan'}
          </p>
        </div>

        {/* Total Hari Kehadiran */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Hari Kerja Terbayar
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <CalendarCheck2 className="h-5 w-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {summary.grand_total_kehadiran}
            <span className="text-sm font-semibold text-slate-400 ml-1">hari kerja</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Dari seluruh log absensi periode ini</p>
        </div>

        {/* Total Pekerja Terlibat */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Tenaga Kerja
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {summary.grand_total_pekerja}
            <span className="text-sm font-semibold text-slate-400 ml-1">orang</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Pekerja yang memiliki catatan kerja</p>
        </div>
      </div>

      {/* Filter and Tab Switching Bar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm space-y-3 print:hidden">
        {/* Top bar with tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('per-pekerja')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'per-pekerja'
                  ? 'bg-white text-brand-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rekapitulasi per Pekerja ({pekerjaList.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('log-harian')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'log-harian'
                  ? 'bg-white text-brand-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rincian Log Harian ({rawLogs.length})
            </button>
          </div>

          {(search || selectedLahan || selectedStatusBayar || startDate || endDate) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSelectedLahan('');
                setSelectedStatusBayar('');
                setStartDate('');
                setEndDate('');
              }}
              className="text-xs font-bold text-brand-600 hover:text-brand-700 self-end sm:self-auto"
            >
              Reset Filter
            </button>
          )}
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Cari nama pekerja atau keahlian/jabatan..."
            />
          </div>

          <div>
            <AppSelect
              value={selectedLahan}
              onChange={(val) => setSelectedLahan(val || '')}
              options={[
                { value: '', label: 'Semua Tempat Lahan' },
                ...lahanOptions.map((l) => ({ value: l.id, label: l.nama_lahan })),
              ]}
              placeholder="Semua Tempat Lahan"
              isClearable
            />
          </div>

          <div>
            <AppSelect
              value={selectedStatusBayar}
              onChange={(val) => setSelectedStatusBayar(val || '')}
              options={[
                { value: '', label: 'Semua Status Bayar' },
                { value: 'Sudah Dibayar', label: 'Sudah Dibayar (Lunas)' },
                { value: 'Belum Dibayar', label: 'Belum Dibayar' },
              ]}
              placeholder="Semua Status Bayar"
              isClearable
            />
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 px-2.5 text-xs text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none"
              title="Dari Tanggal"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 px-2.5 text-xs text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none"
              title="Sampai Tanggal"
            />
          </div>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={6} cols={6} />
          </div>
        ) : activeTab === 'per-pekerja' ? (
          /* TAB 1: REKAPITULASI PER PEKERJA */
          pekerjaList.length === 0 ? (
            <EmptyState
              icon={Banknote}
              title="Tidak Ada Rekap Upah Pekerja"
              description="Tidak ada catatan upah pekerja yang cocok dengan filter yang dipilih."
              actionLabel="Lihat Semua Absensi"
              onAction={() => {
                setSearch('');
                setSelectedLahan('');
                setSelectedStatusBayar('');
                setStartDate('');
                setEndDate('');
              }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4 sm:px-6">Nama Pekerja</th>
                    <th className="py-3.5 px-4">Jabatan</th>
                    <th className="py-3.5 px-4 text-center">Kehadiran</th>
                    <th className="py-3.5 px-4 text-right">Upah Standar/Hari</th>
                    <th className="py-3.5 px-4 text-right">Upah Sudah Dibayar</th>
                    <th className="py-3.5 px-4 text-center">Status Bayar</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pekerjaList.map((pekerja) => {
                    const isLunas = pekerja.status_bayar_summary === 'Lunas';
                    const isSebagian = pekerja.status_bayar_summary === 'Sebagian';

                    return (
                      <tr key={pekerja.pekerja_id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Worker Info */}
                        <td className="py-3.5 px-4 sm:px-6">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 font-black text-brand-700 text-sm border border-brand-200/60">
                              {pekerja.nama.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block leading-tight">
                                {pekerja.nama}
                              </span>
                              {pekerja.no_hp && (
                                <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                  <Phone className="h-3 w-3 text-slate-400" />
                                  {pekerja.no_hp}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Jabatan */}
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                            <Briefcase className="h-3 w-3 text-slate-500" />
                            {pekerja.jabatan}
                          </span>
                        </td>

                        {/* Kehadiran */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="font-bold text-slate-800 text-sm">
                            {pekerja.total_kehadiran}
                          </span>
                          <span className="text-xs text-slate-400 block">hari kerja</span>
                        </td>

                        {/* Upah Standar */}
                        <td className="py-3.5 px-4 text-right font-medium text-xs text-slate-500">
                          {formatRupiah(pekerja.upah_harian_standar)}
                        </td>

                        {/* Upah yang Sudah Dibayarkan */}
                        <td className="py-3.5 px-4 text-right">
                          <span className="font-extrabold text-emerald-700 text-base block">
                            {formatRupiah(pekerja.total_upah_dibayarkan)}
                          </span>
                          {pekerja.total_upah_belum_dibayar > 0 && (
                            <span className="text-[11px] text-amber-600 font-semibold block">
                              Sisa: {formatRupiah(pekerja.total_upah_belum_dibayar)}
                            </span>
                          )}
                        </td>

                        {/* Status Bayar */}
                        <td className="py-3.5 px-4 text-center">
                          {isLunas ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              Lunas Dibayar
                            </span>
                          ) : isSebagian ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="h-3 w-3 text-amber-600" />
                              Sebagian
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertCircle className="h-3 w-3 text-rose-600" />
                              Belum Dibayar
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 sm:px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenWorkerDetail(pekerja)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                              title="Lihat Rincian Harian"
                            >
                              <Eye className="h-3.5 w-3.5 text-brand-600" />
                              Rincian
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenSlip(pekerja)}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors"
                              title="Cetak Slip / Kuitansi Upah"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              Slip Kuitansi
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Summary Footer Row */}
                  <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-200">
                    <td colSpan={2} className="py-3.5 px-4 sm:px-6">
                      Total Rekapitulasi ({pekerjaList.length} Pekerja)
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {summary.grand_total_kehadiran} hari
                    </td>
                    <td className="py-3.5 px-4 text-right text-xs text-slate-500">-</td>
                    <td className="py-3.5 px-4 text-right text-emerald-800 text-base">
                      {formatRupiah(summary.grand_total_dibayarkan)}
                    </td>
                    <td colSpan={2} className="py-3.5 px-4 sm:px-6 text-xs text-slate-500 font-normal">
                      Sudah lunas diserahkan ke pekerja
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* TAB 2: RINCIAN LOG HARIAN & TOGGLE STATUS BAYAR */
          rawLogs.length === 0 ? (
            <EmptyState
              icon={CalendarCheck2}
              title="Tidak Ada Catatan Log Harian"
              description="Tidak ada log absensi harian yang cocok dengan filter yang dipilih."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4 sm:px-6">Tanggal</th>
                    <th className="py-3.5 px-4">Nama Pekerja</th>
                    <th className="py-3.5 px-4">Lokasi Lahan</th>
                    <th className="py-3.5 px-4">Kehadiran</th>
                    <th className="py-3.5 px-4 text-right">Nominal Upah</th>
                    <th className="py-3.5 px-4 text-center">Status Pembayaran</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Ubah Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rawLogs.map((log) => {
                    const isPaid = log.status_pembayaran === 'Sudah Dibayar';
                    const statusMeta =
                      STATUS_ABSENSI_MAP[log.status_kehadiran] || STATUS_ABSENSI_MAP.Hadir;

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 sm:px-6 font-semibold text-slate-900">
                          {formatTanggalIndo(log.tanggal)}
                        </td>

                        <td className="py-3 px-4 font-bold text-slate-900">
                          {log.nama_pekerja}
                          <span className="text-xs font-normal text-slate-400 block">
                            {log.jabatan}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-xs font-medium text-emerald-800">
                          <span className="flex items-center gap-1">
                            <Sprout className="h-3 w-3 text-emerald-600" />
                            {log.nama_lahan}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border ${statusMeta.bg}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} />
                            {log.status_kehadiran}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                          {formatRupiah(log.upah_dibayarkan)}
                        </td>

                        <td className="py-3 px-4 text-center">
                          {isPaid ? (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                Sudah Dibayar
                              </span>
                              {log.tanggal_bayar && (
                                <span className="text-[10px] text-slate-400 block mt-0.5">
                                  Tgl: {formatTanggalIndo(log.tanggal_bayar)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <Clock className="h-3 w-3 text-amber-600" />
                              Belum Dibayar
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 sm:px-6 text-right">
                          <button
                            type="button"
                            onClick={() => handlePromptToggle(log)}
                            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                              isPaid
                                ? 'border border-slate-200 bg-white text-slate-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200'
                                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                            }`}
                          >
                            {isPaid ? 'Tandai Belum' : '✓ Tandai Lunas'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Modal 1: Rincian Riwayat Pembayaran Pekerja */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={`Rincian Upah & Riwayat: ${selectedPekerjaDetail?.nama || ''}`}
        size="lg"
      >
        {selectedPekerjaDetail && (
          <div className="space-y-4">
            {/* Header info */}
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-extrabold text-base text-slate-900">
                  {selectedPekerjaDetail.nama}
                </h4>
                <p className="text-xs text-slate-500">
                  {selectedPekerjaDetail.jabatan} • Standar Upah:{' '}
                  {formatRupiah(selectedPekerjaDetail.upah_harian_standar)} / hari
                </p>
                {selectedPekerjaDetail.no_hp && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    Kontak: {selectedPekerjaDetail.no_hp}
                  </p>
                )}
              </div>

              <div className="text-left sm:text-right">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 block">
                  Total Upah Sudah Dibayar
                </span>
                <span className="text-xl font-black text-emerald-700">
                  {formatRupiah(selectedPekerjaDetail.total_upah_dibayarkan)}
                </span>
                <p className="text-[11px] text-slate-400">
                  {selectedPekerjaDetail.total_kehadiran} hari kerja tercatat
                </p>
              </div>
            </div>

            {/* List of dates */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs sm:text-sm text-slate-700">
                <thead className="bg-slate-100 font-bold uppercase text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Tanggal</th>
                    <th className="py-2.5 px-3">Tempat Lahan</th>
                    <th className="py-2.5 px-3">Kehadiran</th>
                    <th className="py-2.5 px-3 text-right">Nominal</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedPekerjaDetail.rincian.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2 px-3 font-semibold">{formatTanggalIndo(item.tanggal)}</td>
                      <td className="py-2 px-3 text-emerald-800">{item.nama_lahan}</td>
                      <td className="py-2 px-3">{item.status_kehadiran}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">
                        {formatRupiah(item.upah_dibayarkan)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            item.status_pembayaran === 'Sudah Dibayar'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.status_pembayaran}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-xs text-slate-500">{item.keterangan || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  handleOpenSlip(selectedPekerjaDetail);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs sm:text-sm font-bold text-white hover:bg-emerald-700"
              >
                <FileText className="h-4 w-4" />
                Cetak Slip / Kuitansi
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal 2: Slip / Kuitansi Upah Pekerja (Printable) */}
      <Modal
        isOpen={isSlipModalOpen}
        onClose={() => setIsSlipModalOpen(false)}
        title="Kuitansi / Slip Upah Pekerja"
        size="md"
      >
        {slipData && (
          <div className="space-y-4">
            {/* Printable Slip Container */}
            <div
              id="printable-slip"
              className="rounded-2xl border border-slate-300 bg-white p-6 space-y-4 text-slate-800"
            >
              <div className="text-center border-b border-slate-200 pb-3">
                <h3 className="font-black text-base uppercase text-brand-700 tracking-wider">
                  KUITANSI PEMBAYARAN UPAH PEKERJA
                </h3>
                <p className="text-xs text-slate-500">Sistem Rekapitulasi Kerja Pertanian</p>
              </div>

              <div className="grid grid-cols-2 text-xs gap-2 py-1">
                <div>
                  <span className="text-slate-400 block">Nama Tenaga Kerja:</span>
                  <span className="font-bold text-slate-900 text-sm">{slipData.nama}</span>
                  <span className="text-slate-500 block">{slipData.jabatan}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block">Tanggal Cetak:</span>
                  <span className="font-semibold text-slate-800">
                    {formatTanggalIndo(new Date(), true)}
                  </span>
                  <span className="text-emerald-700 font-bold block mt-0.5">
                    Status: {slipData.status_bayar_summary}
                  </span>
                </div>
              </div>

              {/* Rincian Table */}
              <div className="border-t border-b border-slate-200 py-2">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="text-slate-400 uppercase text-[10px]">
                      <th className="py-1">Tanggal</th>
                      <th className="py-1">Lahan</th>
                      <th className="py-1 text-center">Status</th>
                      <th className="py-1 text-right">Nominal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {slipData.rincian.map((r) => (
                      <tr key={r.id}>
                        <td className="py-1.5 font-medium">{formatTanggalIndo(r.tanggal)}</td>
                        <td className="py-1.5 text-slate-600">{r.nama_lahan}</td>
                        <td className="py-1.5 text-center">{r.status_kehadiran}</td>
                        <td className="py-1.5 text-right font-bold text-slate-900">
                          {formatRupiah(r.upah_dibayarkan)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total Row */}
              <div className="flex items-center justify-between text-sm font-extrabold bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span>TOTAL UPAH DIBAYARKAN:</span>
                <span className="text-base text-emerald-800 font-black">
                  {formatRupiah(slipData.total_upah_dibayarkan)}
                </span>
              </div>

              {/* Signatures */}
              <div className="pt-6 grid grid-cols-2 text-center text-xs gap-4">
                <div>
                  <p className="text-slate-500">Penerima Upah,</p>
                  <div className="h-12"></div>
                  <p className="font-bold underline text-slate-900">
                    ( {slipData.nama} )
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Mandor / Pembayar,</p>
                  <div className="h-12"></div>
                  <p className="font-bold underline text-slate-900">
                    ( ..................................... )
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 print:hidden">
              <button
                type="button"
                onClick={handlePrintSlip}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-brand-700"
              >
                <Printer className="h-4 w-4" />
                Cetak Slip / PDF
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm Dialog Toggle Status Bayar */}
      <ConfirmDialog
        isOpen={confirmToggle.isOpen}
        onClose={() => setConfirmToggle({ isOpen: false, item: null, targetStatus: '', loading: false })}
        onConfirm={handleConfirmToggle}
        loading={confirmToggle.loading}
        title="Konfirmasi Perubahan Status Upah"
        message={`Apakah Anda yakin ingin mengubah status pembayaran upah ${
          confirmToggle.item?.nama_pekerja || ''
        } pada tanggal ${
          confirmToggle.item ? formatTanggalIndo(confirmToggle.item.tanggal) : ''
        } (${formatRupiah(confirmToggle.item?.upah_dibayarkan)}) menjadi "${
          confirmToggle.targetStatus
        }"?`}
        confirmText="Ya, Ubah Status"
        confirmVariant={confirmToggle.targetStatus === 'Sudah Dibayar' ? 'primary' : 'warning'}
      />
    </div>
  );
}
