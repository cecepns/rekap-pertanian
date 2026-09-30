import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CalendarCheck2,
  Plus,
  Users,
  Sprout,
  DollarSign,
  Calendar,
  Filter,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  CheckCheck,
  AlertCircle,
  Loader2,
  UserCheck,
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
import Pagination from '@/components/common/Pagination';
import Modal from '@/components/common/Modal';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import EmptyState from '@/components/common/EmptyState';
import { TableSkeleton } from '@/components/common/LoadingSkeleton';
import AppSelect from '@/components/common/AppSelect';
import AsyncPekerjaSelect from '@/components/common/AsyncPekerjaSelect';

export default function AbsensiPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [data, setData] = useState([]);
  const [totalUpahFiltered, setTotalUpahFiltered] = useState(0);
  const [pekerjaOptions, setPekerjaOptions] = useState([]);
  const [lahanOptions, setLahanOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // Filter state
  const [search, setSearch] = useState('');
  const [pekerjaFilter, setPekerjaFilter] = useState('');
  const [lahanFilter, setLahanFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [filterTanggal, setFilterTanggal] = useState('');

  // Modals state
  const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Single Form State
  const [formData, setFormData] = useState({
    pekerja_id: '',
    lahan_id: '',
    tanggal: getTodayFormatted(),
    status_kehadiran: 'Hadir',
    upah_dibayarkan: '',
    keterangan: '',
  });

  // Batch Form State
  const [batchTanggal, setBatchTanggal] = useState(getTodayFormatted());
  const [batchDefaultLahan, setBatchDefaultLahan] = useState('');
  const [batchRows, setBatchRows] = useState([]);

  // Delete dialog
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    item: null,
    loading: false,
  });

  // Fetch dropdown options for pekerja & lahan
  const fetchDropdowns = async () => {
    try {
      const [resPekerja, resLahan] = await Promise.all([
        request.get(API_ENDPOINTS.PEKERJA.ALL),
        request.get(API_ENDPOINTS.LAHAN.ALL),
      ]);
      if (resPekerja.success) setPekerjaOptions(resPekerja.data);
      if (resLahan.success) setLahanOptions(resLahan.data);
    } catch (err) {
      console.error('Error fetch dropdowns:', err);
    }
  };

  useEffect(() => {
    fetchDropdowns();
  }, []);

  // Fetch list absensi
  const fetchAbsensi = useCallback(async () => {
    setLoading(true);
    try {
      const res = await request.get(API_ENDPOINTS.ABSENSI.LIST, {
        page: pagination.page,
        limit: pagination.limit,
        search,
        pekerja_id: pekerjaFilter,
        lahan_id: lahanFilter,
        status_kehadiran: statusFilter,
        tanggal: filterTanggal,
      });

      if (res.success) {
        setData(res.data);
        setTotalUpahFiltered(res.summary?.total_upah || 0);
        setPagination((prev) => ({
          ...prev,
          total: res.pagination.total,
          totalPages: res.pagination.totalPages,
        }));
      }
    } catch (err) {
      toast.error('Gagal memuat absensi pekerja: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, pekerjaFilter, lahanFilter, statusFilter, filterTanggal]);

  useEffect(() => {
    fetchAbsensi();
  }, [fetchAbsensi]);

  // Handle URL query trigger: ?action=create
  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      handleOpenSingleCreate();
      searchParams.delete('action');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams]);

  // Open Single Create Modal
  const handleOpenSingleCreate = () => {
    setIsEditMode(false);
    setCurrentId(null);
    setFormData({
      pekerja_id: '',
      lahan_id: '',
      tanggal: getTodayFormatted(),
      status_kehadiran: 'Hadir',
      upah_dibayarkan: '',
      keterangan: '',
    });
    setIsSingleModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item) => {
    setIsEditMode(true);
    setCurrentId(item.id);
    setFormData({
      pekerja_id: String(item.pekerja_id),
      lahan_id: item.lahan_id ? String(item.lahan_id) : '',
      tanggal: item.tanggal,
      status_kehadiran: item.status_kehadiran || 'Hadir',
      upah_dibayarkan: String(Math.round(item.upah_dibayarkan || 0)),
      keterangan: item.keterangan || '',
    });
    setIsSingleModalOpen(true);
  };

  // Auto calculate upah when pekerja or status changes in Single Modal
  const handlePekerjaSelect = (pekerjaId) => {
    const selected = pekerjaOptions.find((p) => String(p.id) === String(pekerjaId));
    let baseUpah = selected ? Number(selected.upah_harian_standar) : 100000;

    if (formData.status_kehadiran === 'Setengah Hari') {
      baseUpah = Math.round(baseUpah / 2);
    } else if (['Izin', 'Sakit', 'Alpa'].includes(formData.status_kehadiran)) {
      baseUpah = 0;
    }

    setFormData((prev) => ({
      ...prev,
      pekerja_id: pekerjaId,
      upah_dibayarkan: String(baseUpah),
    }));
  };

  const handleStatusSelect = (status) => {
    const selected = pekerjaOptions.find((p) => String(p.id) === String(formData.pekerja_id));
    let baseUpah = selected ? Number(selected.upah_harian_standar) : 100000;

    if (status === 'Setengah Hari') {
      baseUpah = Math.round(baseUpah / 2);
    } else if (['Izin', 'Sakit', 'Alpa'].includes(status)) {
      baseUpah = 0;
    }

    setFormData((prev) => ({
      ...prev,
      status_kehadiran: status,
      upah_dibayarkan: String(baseUpah),
    }));
  };

  // Submit Single Form
  const handleSubmitSingle = async (e) => {
    e.preventDefault();

    if (!formData.pekerja_id) {
      toast.error('Pekerja wajib dipilih');
      return;
    }
    if (!formData.tanggal) {
      toast.error('Tanggal absensi wajib diisi');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditMode) {
        await request.put(API_ENDPOINTS.ABSENSI.UPDATE(currentId), formData);
        toast.success('Data absensi pekerja berhasil diperbarui');
      } else {
        await request.post(API_ENDPOINTS.ABSENSI.CREATE, formData);
        toast.success('Absensi pekerja berhasil disimpan');
      }
      setIsSingleModalOpen(false);
      fetchAbsensi();
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan absensi');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Batch Attendance Modal (Input Seluruh Pekerja Sekaligus)
  const handleOpenBatchModal = () => {
    const activeWorkers = pekerjaOptions.filter((p) => p.status === 'Aktif');
    const initialRows = activeWorkers.map((p) => ({
      pekerja_id: p.id,
      nama: p.nama,
      jabatan: p.jabatan,
      upah_standar: Number(p.upah_harian_standar),
      status_kehadiran: 'Hadir',
      upah_dibayarkan: Number(p.upah_harian_standar),
      keterangan: '',
    }));

    setBatchTanggal(getTodayFormatted());
    setBatchDefaultLahan(lahanOptions[0]?.id ? String(lahanOptions[0].id) : '');
    setBatchRows(initialRows);
    setIsBatchModalOpen(true);
  };

  const handleBatchStatusChange = (index, status) => {
    setBatchRows((prev) => {
      const updated = [...prev];
      const item = updated[index];
      item.status_kehadiran = status;

      if (status === 'Hadir') {
        item.upah_dibayarkan = item.upah_standar;
      } else if (status === 'Setengah Hari') {
        item.upah_dibayarkan = Math.round(item.upah_standar / 2);
      } else {
        item.upah_dibayarkan = 0;
      }
      return updated;
    });
  };

  const handleBatchUpahChange = (index, upah) => {
    setBatchRows((prev) => {
      const updated = [...prev];
      updated[index].upah_dibayarkan = Number(upah) || 0;
      return updated;
    });
  };

  const handleSubmitBatch = async (e) => {
    e.preventDefault();

    if (!batchTanggal) {
      toast.error('Tanggal absensi harian wajib diisi');
      return;
    }
    if (batchRows.length === 0) {
      toast.error('Tidak ada pekerja aktif untuk diabsenkan');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        tanggal: batchTanggal,
        default_lahan_id: batchDefaultLahan || null,
        entries: batchRows.map((r) => ({
          pekerja_id: r.pekerja_id,
          lahan_id: batchDefaultLahan || null,
          status_kehadiran: r.status_kehadiran,
          upah_dibayarkan: r.upah_dibayarkan,
          keterangan: r.keterangan || null,
        })),
      };

      await request.post(API_ENDPOINTS.ABSENSI.BATCH, payload);
      toast.success(`Berhasil merekap absensi ${batchRows.length} pekerja untuk ${batchTanggal}`);
      setIsBatchModalOpen(false);
      fetchAbsensi();
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan absensi massal');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Prompt & Execution
  const handleDeletePrompt = (item) => {
    setDeleteDialog({
      isOpen: true,
      item,
      loading: false,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteDialog.item) return;

    setDeleteDialog((prev) => ({ ...prev, loading: true }));
    try {
      await request.delete(API_ENDPOINTS.ABSENSI.DELETE(deleteDialog.item.id));
      toast.success('Data absensi berhasil dihapus');
      setDeleteDialog({ isOpen: false, item: null, loading: false });
      fetchAbsensi();
    } catch (err) {
      toast.error(err.message || 'Gagal menghapus data absensi');
      setDeleteDialog((prev) => ({ ...prev, loading: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarCheck2 className="h-6 w-6 text-brand-600" />
            Absensi & Upah Pekerja
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pencatatan absensi lapangan yang kita masukkan sendiri perorangan atau rekap harian sekaligus.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleOpenBatchModal}
            className="inline-flex items-center gap-1.5 rounded-xl border border-brand-600 bg-brand-50 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-brand-700 hover:bg-brand-100 transition-colors shadow-sm"
          >
            <CheckCheck className="h-4 w-4" />
            + Absensi Harian (Massal)
          </button>

          <button
            type="button"
            onClick={handleOpenSingleCreate}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-brand-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            + Input Absensi
          </button>
        </div>
      </div>

      {/* Summary Filter Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-950 text-white p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-blue-300 backdrop-blur-md">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-blue-200 uppercase tracking-wider">
              Total Upah Terhitung (Filter Saat Ini)
            </p>
            <p className="text-xl sm:text-2xl font-black text-white">
              {formatRupiah(totalUpahFiltered)}
            </p>
          </div>
        </div>

        <div className="text-xs text-blue-200/80 sm:text-right">
          <span>{pagination.total} log absensi ditemukan</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 pb-1 border-b border-slate-100">
          <span className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            Filter Absensi
          </span>
          {(search || pekerjaFilter || lahanFilter || statusFilter || filterTanggal) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setPekerjaFilter('');
                setLahanFilter('');
                setStatusFilter('');
                setFilterTanggal('');
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="text-brand-600 hover:text-brand-700 font-bold"
            >
              Reset Filter
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Realtime Debounced Search */}
          <div className="lg:col-span-2">
            <SearchInput
              value={search}
              onChange={(val) => {
                setSearch(val);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              placeholder="Cari nama pekerja, jabatan, catatan..."
            />
          </div>

          {/* Filter Pekerja */}
          <div>
            <AppSelect
              value={pekerjaFilter}
              onChange={(val) => {
                setPekerjaFilter(val);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              options={[
                { value: '', label: 'Semua Pekerja' },
                ...pekerjaOptions.map((p) => ({ value: p.id, label: p.nama })),
              ]}
              placeholder="Semua Pekerja"
              isClearable
            />
          </div>

          {/* Filter Status Kehadiran */}
          <div>
            <AppSelect
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              options={[
                { value: '', label: 'Semua Kehadiran' },
                { value: 'Hadir', label: 'Hadir' },
                { value: 'Setengah Hari', label: 'Setengah Hari' },
                { value: 'Izin', label: 'Izin' },
                { value: 'Sakit', label: 'Sakit' },
                { value: 'Alpa', label: 'Alpa' },
              ]}
              placeholder="Semua Kehadiran"
              isClearable
            />
          </div>

          {/* Filter Tanggal */}
          <div>
            <input
              type="date"
              value={filterTanggal}
              onChange={(e) => {
                setFilterTanggal(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              title="Pilih Tanggal Tertentu"
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
        ) : data.length === 0 ? (
          <EmptyState
            icon={CalendarCheck2}
            title="Tidak Ada Data Absensi"
            description={
              search || pekerjaFilter || statusFilter || filterTanggal
                ? 'Tidak ada log absensi yang cocok dengan filter yang dipilih.'
                : 'Belum ada absensi tercatat. Anda dapat memasukkan absensi perorangan atau seluruh pekerja hari ini sekaligus.'
            }
            actionLabel="+ Input Absensi"
            onAction={handleOpenSingleCreate}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4 sm:px-6">Tanggal & Status</th>
                    <th className="py-3.5 px-4">Nama Pekerja</th>
                    <th className="py-3.5 px-4">Lokasi Lahan</th>
                    <th className="py-3.5 px-4">Upah Dibayarkan</th>
                    <th className="py-3.5 px-4">Keterangan</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((item) => {
                    const statusMeta =
                      STATUS_ABSENSI_MAP[item.status_kehadiran] || STATUS_ABSENSI_MAP.Hadir;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Tanggal & Status Badge */}
                        <td className="py-3.5 px-4 sm:px-6">
                          <div className="font-bold text-slate-900">
                            {formatTanggalIndo(item.tanggal)}
                          </div>
                          <div className="mt-1">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusMeta.bg}`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} />
                              {item.status_kehadiran}
                            </span>
                          </div>
                        </td>

                        {/* Pekerja */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 font-bold text-xs text-slate-700">
                              {item.nama_pekerja?.charAt(0).toUpperCase()}
                            </div>
                            <span>{item.nama_pekerja}</span>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 ml-9">
                            {item.jabatan || 'Pekerja Harian'}
                          </div>
                        </td>

                        {/* Tempat Lahan */}
                        <td className="py-3.5 px-4">
                          {item.nama_lahan && item.nama_lahan !== '-' ? (
                            <div className="font-medium text-emerald-800 flex items-center gap-1">
                              <Sprout className="h-3.5 w-3.5 text-emerald-600" />
                              <span>{item.nama_lahan}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">Pekerjaan Umum</span>
                          )}
                        </td>

                        {/* Upah */}
                        <td className="py-3.5 px-4">
                          <div className="font-extrabold text-sm text-slate-900">
                            {formatRupiah(item.upah_dibayarkan)}
                          </div>
                          <span className="text-[11px] text-slate-400">
                            Standar: {formatRupiah(item.upah_harian_standar)}
                          </span>
                        </td>

                        {/* Keterangan */}
                        <td className="py-3.5 px-4 text-xs text-slate-600 max-w-xs truncate">
                          {item.keterangan || '-'}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 sm:px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(item)}
                              className="rounded-lg p-1.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                              title="Edit Absensi"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePrompt(item)}
                              className="rounded-lg p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Hapus Absensi"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Component */}
            <div className="border-t border-slate-100 bg-white px-4 sm:px-6">
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                limit={pagination.limit}
                total={pagination.total}
                onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
                onLimitChange={(limit) => setPagination((p) => ({ ...p, limit }))}
              />
            </div>
          </>
        )}
      </div>

      {/* Modal Input Perorangan (Single Input / Edit) */}
      <Modal
        isOpen={isSingleModalOpen}
        onClose={() => !submitting && setIsSingleModalOpen(false)}
        title={isEditMode ? 'Edit Data Absensi Pekerja' : 'Catat Absensi Pekerja'}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmitSingle} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Pilih Pekerja (Cari via API) <span className="text-rose-500">*</span>
              </label>
              <AsyncPekerjaSelect
                value={formData.pekerja_id}
                selectedPekerjaObj={pekerjaOptions.find((p) => String(p.id) === String(formData.pekerja_id))}
                placeholder="Cari pegawai..."
                isClearable
                onChange={(pekerjaId, selectedOption) => {
                  const pekerja = selectedOption?.pekerja;
                  let baseUpah = pekerja ? Number(pekerja.upah_harian_standar) : 0;
                  if (formData.status_kehadiran === 'Setengah Hari') {
                    baseUpah = Math.round(baseUpah / 2);
                  } else if (['Izin', 'Sakit', 'Alpa'].includes(formData.status_kehadiran)) {
                    baseUpah = 0;
                  }
                  setFormData((prev) => ({
                    ...prev,
                    pekerja_id: pekerjaId || '',
                    upah_dibayarkan: baseUpah > 0 ? String(baseUpah) : '',
                  }));
                }}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Tanggal Absensi <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.tanggal}
                onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Tempat Lahan (Opsional)
              </label>
              <AppSelect
                value={formData.lahan_id}
                onChange={(val) => setFormData({ ...formData, lahan_id: val || '' })}
                options={lahanOptions.map((lahan) => ({
                  value: lahan.id,
                  label: lahan.nama_lahan,
                }))}
                placeholder="Pilih Tempat Lahan (Opsional)..."
                isClearable
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Status Kehadiran <span className="text-rose-500">*</span>
              </label>
              <AppSelect
                value={formData.status_kehadiran}
                onChange={(val) => handleStatusSelect(val || 'Hadir')}
                options={[
                  { value: 'Hadir', label: 'Hadir Penuh (Full Day)' },
                  { value: 'Setengah Hari', label: 'Setengah Hari (1/2 Hari)' },
                  { value: 'Izin', label: 'Izin' },
                  { value: 'Sakit', label: 'Sakit' },
                  { value: 'Alpa', label: 'Alpa / Tanpa Keterangan' },
                ]}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Upah Dibayarkan Hari Ini (Rp) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">Rp</span>
              <input
                type="number"
                min="0"
                step="5000"
                required
                value={formData.upah_dibayarkan}
                onChange={(e) => setFormData({ ...formData, upah_dibayarkan: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-3.5 text-sm text-slate-900 font-bold focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              * Otomatis terisi sesuai upah standar pekerja, namun Anda dapat mengubahnya jika ada penyesuaian/bonus/potongan.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Keterangan / Catatan Tugas
            </label>
            <textarea
              rows={2}
              value={formData.keterangan}
              onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
              placeholder="Contoh: Mengerjakan pemupukan blok barat, lembur 1 jam, dll..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setIsSingleModalOpen(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition-colors disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditMode ? 'Simpan Perubahan' : 'Simpan Absensi'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Batch / Input Harian Sekaligus Seluruh Pekerja */}
      <Modal
        isOpen={isBatchModalOpen}
        onClose={() => !submitting && setIsBatchModalOpen(false)}
        title="Input Absensi Harian Seluruh Pekerja (Massal)"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSubmitBatch} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Tanggal Absensi Harian
              </label>
              <input
                type="date"
                required
                value={batchTanggal}
                onChange={(e) => setBatchTanggal(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-sm text-slate-900 font-semibold focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Lokasi Lahan Kerja Hari Ini
              </label>
              <AppSelect
                value={batchDefaultLahan}
                onChange={(val) => setBatchDefaultLahan(val)}
                options={[
                  { value: '', label: '-- Pekerjaan Umum / Mandiri --' },
                  ...lahanOptions.map((lahan) => ({
                    value: lahan.id,
                    label: lahan.nama_lahan,
                  })),
                ]}
                placeholder="-- Pekerjaan Umum / Mandiri --"
                isClearable
              />
            </div>
          </div>

          <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-1">
            {batchRows.map((row, index) => (
              <div
                key={row.pekerja_id}
                className="p-3 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
              >
                <div className="min-w-0 sm:w-1/3">
                  <p className="text-sm font-bold text-slate-900 truncate">{row.nama}</p>
                  <p className="text-xs text-slate-500">{row.jabatan}</p>
                </div>

                <div className="flex items-center gap-2 sm:w-2/3 justify-end flex-wrap">
                  {/* Status buttons with AppSelect */}
                  <div className="w-36">
                    <AppSelect
                      value={row.status_kehadiran}
                      onChange={(val) => handleBatchStatusChange(index, val || 'Hadir')}
                      options={[
                        { value: 'Hadir', label: 'Hadir' },
                        { value: 'Setengah Hari', label: '1/2 Hari' },
                        { value: 'Izin', label: 'Izin' },
                        { value: 'Sakit', label: 'Sakit' },
                        { value: 'Alpa', label: 'Alpa' },
                      ]}
                      isSearchable={false}
                    />
                  </div>

                  {/* Upah Input */}
                  <div className="relative w-28">
                    <span className="absolute left-2 top-1.5 text-[10px] text-slate-400 font-bold">
                      Rp
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="5000"
                      value={row.upah_dibayarkan}
                      onChange={(e) => handleBatchUpahChange(index, e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white py-1 pl-6 pr-2 text-xs font-semibold text-slate-900 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setIsBatchModalOpen(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition-colors disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Simpan Absensi Semua Pekerja
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        isLoading={deleteDialog.loading}
        title="Hapus Data Absensi"
        message={`Apakah Anda yakin ingin menghapus data absensi "${deleteDialog.item?.nama_pekerja}" pada tanggal ${deleteDialog.item?.tanggal}?`}
        confirmText="Ya, Hapus Absensi"
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteDialog({ isOpen: false, item: null, loading: false })}
      />
    </div>
  );
}
