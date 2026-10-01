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
  Image as ImageIcon,
  Banknote,
  Eye,
  X,
  FileCheck,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { request } from '@/utils/request';
import { API_ENDPOINTS } from '@/utils/endpoints';
import { UPLOAD_BASE_URL } from '@/utils/api';
import {
  formatRupiah,
  formatTanggalIndo,
  getTodayFormatted,
  STATUS_ABSENSI_MAP,
} from '@/utils/formatters';
import { TableSkeleton } from '@/components/common/LoadingSkeleton';
import AppSelect from '@/components/common/AppSelect';
import Modal from '@/components/common/Modal';

export default function LaporanRekapPage() {
  const [loading, setLoading] = useState(true);
  const [lahanOptions, setLahanOptions] = useState([]);

  // Filters
  const [selectedLahan, setSelectedLahan] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [includePhotos, setIncludePhotos] = useState(true);

  // Photo viewer modal state
  const [photoViewer, setPhotoViewer] = useState({
    isOpen: false,
    src: null,
    title: '',
  });

  // Report Data
  const [reportData, setReportData] = useState({
    pekerjaan: [],
    absensi: [],
    rekap_pekerja: [],
    summary: {
      total_kegiatan_kerja: 0,
      total_biaya_kerja: 0,
      total_kehadiran_pekerja: 0,
      total_upah_absensi: 0,
      total_upah_dibayarkan: 0,
      total_upah_belum_dibayar: 0,
      total_keseluruhan: 0,
      total_pekerja_terlibat: 0,
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
      csvContent += '=== 1. REKAPAN KERJA LAHAN ===\r\n';
      csvContent += 'No,Tanggal,Lahan,Komoditas,Jenis Pekerjaan,Biaya (Rp),Foto Dokumentasi,Keterangan\r\n';
      reportData.pekerjaan.forEach((p, idx) => {
        const fotoUrl = p.foto ? `${UPLOAD_BASE_URL}/${p.foto}` : '-';
        csvContent += `${idx + 1},"${p.tanggal}","${p.nama_lahan}","${p.komoditas || '-'}","${
          p.jenis_pekerjaan
        }",${p.biaya},"${fotoUrl}","${(p.keterangan || '').replace(/"/g, '""')}"\r\n`;
      });
      csvContent += `\r\nTotal Biaya Kerja Lahan,,,,,${reportData.summary.total_biaya_kerja},,\r\n\r\n`;

      // 2. Rekap Upah per Pekerja Section
      csvContent += '=== 2. REKAPITULASI UPAH PEKERJA YANG SUDAH DIBAYARKAN ===\r\n';
      csvContent += 'No,Nama Pekerja,Jabatan,Kehadiran (Hari),Upah Sudah Dibayar (Rp),Upah Belum Dibayar (Rp),Total Upah (Rp),Status Bayar\r\n';
      (reportData.rekap_pekerja || []).forEach((pk, idx) => {
        csvContent += `${idx + 1},"${pk.nama_pekerja}","${pk.jabatan}",${pk.total_hari},${
          pk.total_upah_dibayarkan
        },${pk.total_upah_belum_dibayar},${pk.total_upah},"${pk.status_bayar}"\r\n`;
      });
      csvContent += `\r\nTotal Upah Pekerja Sudah Dibayarkan,,,,${
        reportData.summary.total_upah_dibayarkan || reportData.summary.total_upah_absensi
      },,,\r\n\r\n`;

      // 3. Absensi Pekerja Section
      csvContent += '=== 3. RINCIAN LOG ABSENSI & UPAH HARIAN ===\r\n';
      csvContent += 'No,Tanggal,Nama Pekerja,Jabatan,Lokasi Lahan,Status Kehadiran,Upah (Rp),Status Pembayaran,Tanggal Bayar,Keterangan\r\n';
      reportData.absensi.forEach((a, idx) => {
        csvContent += `${idx + 1},"${a.tanggal}","${a.nama_pekerja}","${a.jabatan}","${
          a.nama_lahan
        }","${a.status_kehadiran}",${a.upah_dibayarkan},"${a.status_pembayaran || 'Sudah Dibayar'}","${
          a.tanggal_bayar || '-'
        }","${(a.keterangan || '').replace(/"/g, '""')}"\r\n`;
      });

      csvContent += `\r\nTotal Upah Absensi,,,,,,${reportData.summary.total_upah_absensi},,,\r\n`;
      csvContent += `TOTAL PENGELUARAN KESELURUHAN,,,,,,${reportData.summary.total_keseluruhan},,,\r\n`;

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute(
        'download',
        `laporan_rekap_pertanian_${selectedLahan ? 'lahan_' + selectedLahan : 'semua'}_${getTodayFormatted()}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('File CSV Laporan berhasil diunduh');
    } catch (err) {
      toast.error('Gagal mengekspor CSV: ' + err.message);
    }
  };

  const selectedLahanName =
    lahanOptions.find((l) => String(l.id) === String(selectedLahan))?.nama_lahan ||
    'Semua Tempat Lahan';

  const pekerjaanWithPhotos = reportData.pekerjaan.filter((p) => Boolean(p.foto));

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
            Rekap lengkap biaya operasional kerja lahan, foto dokumentasi pengerjaan, dan upah pekerja yang sudah dibayarkan.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
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
            Cetak Laporan / Simpan PDF
          </button>
        </div>
      </div>

      {/* Filter Section (Hidden on Print) */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm print:hidden space-y-3">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100">
          <span className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            Filter Rekapitulasi Laporan
          </span>

          <label className="flex items-center gap-2 cursor-pointer normal-case text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={includePhotos}
              onChange={(e) => setIncludePhotos(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span>Sertakan Foto Pekerjaan di Laporan / PDF</span>
          </label>
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
              <Sprout className="h-6 w-6 stroke-[2.2]" />
              <span>LAPORAN REKAPITULASI HASIL & KERJA PERTANIAN</span>
            </div>
            <p className="text-sm font-bold text-slate-800 mt-1">
              Lokasi / Tempat Lahan: <span className="text-emerald-700">{selectedLahanName}</span>
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
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
            <p className="font-semibold text-slate-700">
              Tanggal Cetak: {formatTanggalIndo(new Date(), true)}
            </p>
            <p className="text-slate-400 mt-0.5">Dicetak via Sistem RekapTani</p>
          </div>
        </div>

        {/* Big Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Biaya Kerja Lahan */}
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
              <Shovel className="h-3.5 w-3.5 text-emerald-600" />
              Total Biaya Kerja Lahan
            </span>
            <p className="text-xl font-extrabold text-emerald-700 mt-1">
              {formatRupiah(reportData.summary.total_biaya_kerja)}
            </p>
            <p className="text-xs text-emerald-600 mt-1 font-medium">
              {reportData.summary.total_kegiatan_kerja} kegiatan kerja tercatat
            </p>
          </div>

          {/* Card 2: Upah Pekerja yang Sudah Dibayarkan */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
            <span className="text-xs font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
              Upah Pekerja Sudah Dibayarkan
            </span>
            <p className="text-xl font-extrabold text-blue-700 mt-1">
              {formatRupiah(
                reportData.summary.total_upah_dibayarkan || reportData.summary.total_upah_absensi
              )}
            </p>
            <p className="text-xs text-blue-600 mt-1 font-medium">
              {reportData.summary.total_kehadiran_pekerja} hari kerja buruh lunas
              {reportData.summary.total_upah_belum_dibayar > 0 && (
                <span className="text-amber-700 ml-1 block font-bold">
                  (Sisa belum bayar: {formatRupiah(reportData.summary.total_upah_belum_dibayar)})
                </span>
              )}
            </p>
          </div>

          {/* Card 3: Total Keseluruhan Pengeluaran */}
          <div className="rounded-xl border border-slate-200 bg-slate-900 text-white p-4">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
              Total Pengeluaran Keseluruhan
            </span>
            <p className="text-2xl font-black text-white mt-1">
              {formatRupiah(reportData.summary.total_keseluruhan)}
            </p>
            <p className="text-xs text-emerald-400 mt-1 font-medium">
              Total Kerja Lahan + Upah Tenaga Kerja
            </p>
          </div>
        </div>

        {/* SECTION 1: Rincian Pekerjaan Lahan (Termasuk Foto Pekerjaan) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Shovel className="h-5 w-5 text-emerald-600" />
              1. Rincian Pekerjaan Lahan & Foto Dokumentasi
            </h3>
            <span className="text-xs font-bold text-slate-600">
              Subtotal: {formatRupiah(reportData.summary.total_biaya_kerja)}
            </span>
          </div>

          {loading ? (
            <TableSkeleton rows={4} cols={6} />
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
                    {includePhotos && <th className="py-2.5 px-3">Foto Dokumentasi</th>}
                    <th className="py-2.5 px-3">Keterangan</th>
                    <th className="py-2.5 px-3 text-right">Biaya (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.pekerjaan.map((p) => (
                    <tr key={p.id} className="break-inside-avoid">
                      <td className="py-2.5 px-3 font-semibold whitespace-nowrap">
                        {formatTanggalIndo(p.tanggal)}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-emerald-800">
                        {p.nama_lahan}
                        {p.komoditas && (
                          <span className="text-[11px] text-slate-400 block font-normal">
                            {p.komoditas}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">{p.jenis_pekerjaan}</td>

                      {/* Photo Column */}
                      {includePhotos && (
                        <td className="py-2.5 px-3">
                          {p.foto ? (
                            <div className="flex items-center gap-2">
                              <img
                                src={`${UPLOAD_BASE_URL}/${p.foto}`}
                                alt={p.jenis_pekerjaan}
                                onClick={() =>
                                  setPhotoViewer({
                                    isOpen: true,
                                    src: `${UPLOAD_BASE_URL}/${p.foto}`,
                                    title: `${p.jenis_pekerjaan} (${formatTanggalIndo(p.tanggal)})`,
                                  })
                                }
                                className="h-12 w-16 object-cover rounded-lg border border-slate-200 shadow-xs cursor-pointer hover:opacity-90 transition-opacity print:h-14 print:w-20 print:rounded print:border"
                              />
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Tanpa foto</span>
                          )}
                        </td>
                      )}

                      <td className="py-2.5 px-3 text-xs text-slate-600 max-w-xs">
                        {p.keterangan || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                        {formatRupiah(p.biaya)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-bold border-t border-slate-200">
                    <td colSpan={includePhotos ? 5 : 4} className="py-2.5 px-3 text-right">
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

        {/* SECTION 2: Rekapitulasi Upah Pekerja yang Sudah Dibayarkan */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Banknote className="h-5 w-5 text-blue-600" />
                2. Rekapitulasi Upah per Pekerja (Yang Sudah Dibayarkan)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Ringkasan total akumulasi upah yang telah diterima masing-masing tenaga kerja.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-700">
              Total Dibayarkan:{' '}
              <span className="text-blue-700">
                {formatRupiah(
                  reportData.summary.total_upah_dibayarkan || reportData.summary.total_upah_absensi
                )}
              </span>
            </span>
          </div>

          {loading ? (
            <TableSkeleton rows={4} cols={6} />
          ) : !reportData.rekap_pekerja || reportData.rekap_pekerja.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              Tidak ada catatan upah pekerja pada periode ini.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm text-slate-700 border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 font-bold uppercase text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center">No</th>
                    <th className="py-2.5 px-3">Nama Pekerja</th>
                    <th className="py-2.5 px-3">Jabatan</th>
                    <th className="py-2.5 px-3 text-center">Kehadiran</th>
                    <th className="py-2.5 px-3 text-right">Upah Sudah Dibayarkan (Rp)</th>
                    <th className="py-2.5 px-3 text-center">Status Pembayaran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.rekap_pekerja.map((pk, idx) => (
                    <tr key={pk.pekerja_id} className="break-inside-avoid">
                      <td className="py-2 px-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                      <td className="py-2 px-3 font-bold text-slate-900">{pk.nama_pekerja}</td>
                      <td className="py-2 px-3 text-slate-600 text-xs">{pk.jabatan}</td>
                      <td className="py-2 px-3 text-center font-semibold text-slate-800">
                        {pk.total_hari} hari kerja
                      </td>
                      <td className="py-2 px-3 text-right font-extrabold text-blue-800">
                        {formatRupiah(pk.total_upah_dibayarkan)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <Check className="h-3 w-3" />
                          Lunas Dibayarkan
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-bold border-t border-slate-200">
                    <td colSpan={4} className="py-2.5 px-3 text-right">
                      Subtotal Upah Pekerja Sudah Dibayarkan:
                    </td>
                    <td className="py-2.5 px-3 text-right text-blue-800">
                      {formatRupiah(
                        reportData.summary.total_upah_dibayarkan ||
                          reportData.summary.total_upah_absensi
                      )}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* SECTION 3: Rincian Log Absensi Harian */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CalendarCheck2 className="h-5 w-5 text-indigo-600" />
              3. Rincian Log Absensi & Upah Harian
            </h3>
            <span className="text-xs font-bold text-slate-600">
              Total Log: {reportData.absensi.length} catatan
            </span>
          </div>

          {loading ? (
            <TableSkeleton rows={4} cols={7} />
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
                    <th className="py-2.5 px-3 text-center">Status Pembayaran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.absensi.map((a) => (
                    <tr key={a.id} className="break-inside-avoid">
                      <td className="py-2 px-3 font-semibold whitespace-nowrap">
                        {formatTanggalIndo(a.tanggal)}
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-900">{a.nama_pekerja}</td>
                      <td className="py-2 px-3 text-xs text-slate-500">{a.jabatan}</td>
                      <td className="py-2 px-3 text-xs text-slate-600">{a.nama_lahan}</td>
                      <td className="py-2 px-3">
                        <span className="font-semibold text-xs">{a.status_kehadiran}</span>
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                        {formatRupiah(a.upah_dibayarkan)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <Check className="h-3 w-3 text-emerald-600" />
                          {a.status_pembayaran || 'Sudah Dibayar'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* SECTION 4: Lampiran Dokumentasi & Foto Pekerjaan Lahan (PDF Visual Attachment) */}
        {includePhotos && pekerjaanWithPhotos.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-emerald-600" />
                  4. Lampiran Dokumentasi Visual & Foto Pekerjaan Lahan
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Foto hasil kerja lapangan sebagai bukti fisik pengerjaan lahan pertanian.
                </p>
              </div>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                {pekerjaanWithPhotos.length} foto dokumentasi
              </span>
            </div>

            {/* Grid of photo documentation cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 print:grid-cols-2 print:gap-3">
              {pekerjaanWithPhotos.map((item) => (
                <div
                  key={'doc-photo-' + item.id}
                  className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs break-inside-avoid print:break-inside-avoid print:border-slate-300"
                >
                  <div className="relative overflow-hidden rounded-lg bg-slate-100">
                    <img
                      src={`${UPLOAD_BASE_URL}/${item.foto}`}
                      alt={item.jenis_pekerjaan}
                      onClick={() =>
                        setPhotoViewer({
                          isOpen: true,
                          src: `${UPLOAD_BASE_URL}/${item.foto}`,
                          title: `${item.jenis_pekerjaan} (${formatTanggalIndo(item.tanggal)})`,
                        })
                      }
                      className="w-full h-44 object-cover cursor-pointer hover:scale-102 transition-transform print:h-40"
                    />
                  </div>

                  <div className="mt-2.5 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900">
                        {formatTanggalIndo(item.tanggal)}
                      </span>
                      <span className="font-semibold text-emerald-800 text-[11px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                        {item.nama_lahan}
                      </span>
                    </div>

                    <p className="font-extrabold text-sm text-slate-800 leading-snug">
                      {item.jenis_pekerjaan}
                    </p>

                    <div className="flex items-center justify-between text-xs text-slate-600 pt-1 border-t border-slate-100">
                      <span>Biaya:</span>
                      <span className="font-bold text-slate-900">{formatRupiah(item.biaya)}</span>
                    </div>

                    {item.keterangan && (
                      <p className="text-[11px] text-slate-500 italic mt-1 line-clamp-2">
                        "{item.keterangan}"
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Signature Area (Useful for Printout / Verification) */}
        <div className="pt-10 hidden print:grid grid-cols-2 text-center text-xs break-inside-avoid">
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

      {/* Modal Photo Viewer */}
      <Modal
        isOpen={photoViewer.isOpen}
        onClose={() => setPhotoViewer({ isOpen: false, src: null, title: '' })}
        title={photoViewer.title || 'Foto Pekerjaan'}
        size="lg"
      >
        {photoViewer.src && (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-xl bg-slate-950 flex items-center justify-center p-2">
              <img
                src={photoViewer.src}
                alt="Dokumentasi Kerja"
                className="max-h-[70vh] w-auto rounded-lg object-contain shadow-md"
              />
            </div>
            <div className="flex justify-between items-center text-xs text-slate-500 pt-1">
              <span>{photoViewer.title}</span>
              <a
                href={photoViewer.src}
                target="_blank"
                rel="noreferrer"
                className="font-bold text-brand-600 hover:text-brand-700"
              >
                Buka Resolusi Penuh ↗
              </a>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
