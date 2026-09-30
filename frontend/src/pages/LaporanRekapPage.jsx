import React, { useState, useEffect, useCallback } from 'react';
import {
  FileBarChart2,
  Printer,
  Download,
  Filter,
  DollarSign,
  Shovel,
  CalendarCheck2,
  Sprout,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
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
import { TableSkeleton } from '@/components/common/LoadingSkeleton';
import AppSelect from '@/components/common/AppSelect';

export default function LaporanRekapPage() {
  const [loading, setLoading] = useState(true);
  const [lahanOptions, setLahanOptions] = useState([]);

  // Filters
  const [selectedLahan, setSelectedLahan] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Report Data
  const [reportData, setReportData] = useState({
    pekerjaan: [],
    absensi: [],
    summary: {
      total_kegiatan_kerja: 0,
      total_biaya_kerja: 0,
      total_kehadiran_pekerja: 0,
      total_upah_absensi: 0,
      total_keseluruhan: 0,
    },
  });

  // Fetch lahan options
  useEffect(() => {
    request.get(API_ENDPOINTS.LAHAN.ALL).then((res) => {
      if (res.success) setLahanOptions(res.data);
    });
  }, []);

  // Fetch report data
  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await request.get(API_ENDPOINTS.LAPORAN.RINGKASAN, {
        lahan_id: selectedLahan || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      if (res.success) {
        setReportData(res.data);
      }
    } catch (err) {
      toast.error('Gagal memuat ringkasan laporan: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedLahan, startDate, endDate]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    try {
      let csvContent = 'data:text/csv;charset=utf-8,';

      // 1. Pekerjaan Lahan Section
      csvContent += '=== REKAPAN KERJA LAHAN ===\r\n';
      csvContent += 'No,Tanggal,Lahan,Komoditas,Jenis Pekerjaan,Biaya (Rp),Keterangan\r\n';
      reportData.pekerjaan.forEach((p, idx) => {
        csvContent += `${idx + 1},"${p.tanggal}","${p.nama_lahan}","${p.komoditas || '-'}","${
          p.jenis_pekerjaan
        }",${p.biaya},"${(p.keterangan || '').replace(/"/g, '""')}"\r\n`;
      });

      csvContent += `\r\nTotal Biaya Kerja Lahan,,,,,${reportData.summary.total_biaya_kerja},\r\n\r\n`;

      // 2. Absensi Pekerja Section
      csvContent += '=== REKAPAN ABSENSI & UPAH PEKERJA ===\r\n';
      csvContent += 'No,Tanggal,Nama Pekerja,Jabatan,Lokasi Lahan,Status Kehadiran,Upah (Rp),Keterangan\r\n';
      reportData.absensi.forEach((a, idx) => {
        csvContent += `${idx + 1},"${a.tanggal}","${a.nama_pekerja}","${a.jabatan}","${
          a.nama_lahan
        }","${a.status_kehadiran}",${a.upah_dibayarkan},"${(a.keterangan || '').replace(/"/g, '""')}"\r\n`;
      });

      csvContent += `\r\nTotal Upah Absensi,,,,,,${reportData.summary.total_upah_absensi},\r\n`;
      csvContent += `TOTAL PENGELUARAN KESELURUHAN,,,,,,${reportData.summary.total_keseluruhan},\r\n`;

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute(
        'download',
        `rekap_pertanian_${selectedLahan ? 'lahan_' + selectedLahan : 'semua'}_${getTodayFormatted()}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('File CSV berhasil diunduh');
    } catch (err) {
      toast.error('Gagal mengekspor CSV: ' + err.message);
    }
  };

  const selectedLahanName =
    lahanOptions.find((l) => String(l.id) === String(selectedLahan))?.nama_lahan ||
    'Semua Tempat Lahan';

  return (
    <div className="space-y-6">
      {/* Non-printable Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <FileBarChart2 className="h-6 w-6 text-brand-600" />
            Rekapitulasi & Laporan
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Rekap lengkap biaya operasional kerja lahan dan upah absensi pekerja. Siap cetak atau ekspor.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
          >
            <Download className="h-4 w-4 text-emerald-600" />
            Ekspor CSV (Excel)
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-brand-700 transition-colors"
          >
            <Printer className="h-4 w-4" />
            Cetak Laporan / PDF
          </button>
        </div>
      </div>

      {/* Filter Section (Hidden on Print) */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm print:hidden">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 pb-2 mb-3 border-b border-slate-100">
          <Filter className="h-3.5 w-3.5 text-slate-400" />
          Filter Rekapitulasi
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Tempat Lahan
            </label>
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
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Dari Tanggal
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Sampai Tanggal
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Printable Report Container */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-8 print:p-0 print:border-none print:shadow-none">
        {/* Report Official Header (Shown in Print & View) */}
        <div className="border-b border-slate-200 pb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-brand-700 font-black text-xl tracking-tight">
              <Sprout className="h-6 w-6" />
              <span>LAPORAN REKAPITULASI HASIL & KERJA PERTANIAN</span>
            </div>
            <p className="text-sm font-bold text-slate-700 mt-1">
              Lokasi / Lahan: {selectedLahanName}
            </p>
            <p className="text-xs text-slate-500">
              Periode:{' '}
              {startDate && endDate
                ? `${formatTanggalIndo(startDate)} s/d ${formatTanggalIndo(endDate)}`
                : startDate
                ? `Mulai ${formatTanggalIndo(startDate)}`
                : endDate
                ? `Sampai ${formatTanggalIndo(endDate)}`
                : 'Semua Periode Tercatat'}
            </p>
          </div>

          <div className="text-left sm:text-right text-xs text-slate-500">
            <p>Tanggal Cetak: {formatTanggalIndo(new Date(), true)}</p>
            <p className="text-slate-400">Dicetak oleh Sistem RekapTani</p>
          </div>
        </div>

        {/* Big Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
              Total Biaya Kerja Lahan
            </span>
            <p className="text-xl font-extrabold text-emerald-700 mt-1">
              {formatRupiah(reportData.summary.total_biaya_kerja)}
            </p>
            <p className="text-xs text-emerald-600 mt-1">
              {reportData.summary.total_kegiatan_kerja} kegiatan kerja tercatat
            </p>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
            <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">
              Total Upah Absensi Pekerja
            </span>
            <p className="text-xl font-extrabold text-blue-700 mt-1">
              {formatRupiah(reportData.summary.total_upah_absensi)}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              {reportData.summary.total_kehadiran_pekerja} hari kerja buruh
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-900 text-white p-4">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Total Keseluruhan Pengeluaran
            </span>
            <p className="text-2xl font-black text-white mt-1">
              {formatRupiah(reportData.summary.total_keseluruhan)}
            </p>
            <p className="text-xs text-emerald-400 mt-1">Lahan + Tenaga Kerja</p>
          </div>
        </div>

        {/* Section 1: Rekapan Pekerjaan Lahan */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Shovel className="h-5 w-5 text-emerald-600" />
              1. Rincian Pekerjaan Lahan
            </h3>
            <span className="text-xs font-bold text-slate-600">
              Subtotal: {formatRupiah(reportData.summary.total_biaya_kerja)}
            </span>
          </div>

          {loading ? (
            <TableSkeleton rows={4} cols={5} />
          ) : reportData.pekerjaan.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              Tidak ada rekapan pekerjaan lahan pada periode ini.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm text-slate-700 border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 font-bold uppercase text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Tanggal</th>
                    <th className="py-2.5 px-3">Tempat Lahan</th>
                    <th className="py-2.5 px-3">Jenis Pekerjaan</th>
                    <th className="py-2.5 px-3">Keterangan</th>
                    <th className="py-2.5 px-3 text-right">Biaya (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.pekerjaan.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2 px-3 font-semibold">{formatTanggalIndo(p.tanggal)}</td>
                      <td className="py-2 px-3 font-medium text-emerald-800">{p.nama_lahan}</td>
                      <td className="py-2 px-3">{p.jenis_pekerjaan}</td>
                      <td className="py-2 px-3 text-xs text-slate-500">{p.keterangan || '-'}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">
                        {formatRupiah(p.biaya)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-bold">
                    <td colSpan={4} className="py-2.5 px-3 text-right">
                      Subtotal Biaya Kerja Lahan:
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-800">
                      {formatRupiah(reportData.summary.total_biaya_kerja)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section 2: Rekapan Absensi & Upah Pekerja */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CalendarCheck2 className="h-5 w-5 text-blue-600" />
              2. Rincian Absensi & Upah Pekerja
            </h3>
            <span className="text-xs font-bold text-slate-600">
              Subtotal: {formatRupiah(reportData.summary.total_upah_absensi)}
            </span>
          </div>

          {loading ? (
            <TableSkeleton rows={4} cols={6} />
          ) : reportData.absensi.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              Tidak ada catatan absensi pekerja pada periode ini.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm text-slate-700 border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 font-bold uppercase text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Tanggal</th>
                    <th className="py-2.5 px-3">Nama Pekerja</th>
                    <th className="py-2.5 px-3">Jabatan</th>
                    <th className="py-2.5 px-3">Lokasi Lahan</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Upah (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.absensi.map((a) => (
                    <tr key={a.id}>
                      <td className="py-2 px-3 font-semibold">{formatTanggalIndo(a.tanggal)}</td>
                      <td className="py-2 px-3 font-bold text-slate-900">{a.nama_pekerja}</td>
                      <td className="py-2 px-3 text-xs text-slate-500">{a.jabatan}</td>
                      <td className="py-2 px-3 text-xs text-slate-600">{a.nama_lahan}</td>
                      <td className="py-2 px-3">
                        <span className="font-semibold text-xs">{a.status_kehadiran}</span>
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">
                        {formatRupiah(a.upah_dibayarkan)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-bold">
                    <td colSpan={5} className="py-2.5 px-3 text-right">
                      Subtotal Upah Absensi:
                    </td>
                    <td className="py-2.5 px-3 text-right text-blue-800">
                      {formatRupiah(reportData.summary.total_upah_absensi)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Signature Area (Useful for Printout / Verification) */}
        <div className="pt-10 hidden print:grid grid-cols-2 text-center text-xs">
          <div>
            <p>Dibuat Oleh Mandor Lapangan,</p>
            <div className="h-16"></div>
            <p className="font-bold underline">( ............................................ )</p>
          </div>
          <div>
            <p>Mengetahui / Disetujui Pemilik Pertanian,</p>
            <div className="h-16"></div>
            <p className="font-bold underline">( ............................................ )</p>
          </div>
        </div>
      </div>
    </div>
  );
}
