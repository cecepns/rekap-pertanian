import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Shovel,
  Plus,
  Calendar,
  DollarSign,
  Image as ImageIcon,
  Sprout,
  Edit2,
  Trash2,
  Filter,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Upload,
  X,
  Eye,
  Sparkles,
  FileCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { request } from '@/utils/request';
import { API_ENDPOINTS } from '@/utils/endpoints';
import { UPLOAD_BASE_URL } from '@/utils/api';
import {
  formatRupiah,
  formatTanggalIndo,
  getTodayFormatted,
  JENIS_PEKERJAAN_OPTIONS,
} from '@/utils/formatters';
import { compressImage, formatFileSize } from '@/utils/compressor';
import SearchInput from '@/components/common/SearchInput';
import Pagination from '@/components/common/Pagination';
import Modal from '@/components/common/Modal';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import EmptyState from '@/components/common/EmptyState';
import { TableSkeleton } from '@/components/common/LoadingSkeleton';
import AppSelect from '@/components/common/AppSelect';

export default function PekerjaanLahanPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const fileInputRef = useRef(null);

  const [data, setData] = useState([]);
  const [totalBiayaFiltered, setTotalBiayaFiltered] = useState(0);
  const [lahanOptions, setLahanOptions] = useState([]);
  const [jenisOptions, setJenisOptions] = useState(JENIS_PEKERJAAN_OPTIONS);
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
  const [lahanFilter, setLahanFilter] = useState('');
  const [jenisFilter, setJenisFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Photo viewer modal state
  const [photoViewer, setPhotoViewer] = useState({
    isOpen: false,
    src: null,
    title: '',
  });

  // Delete Confirm Dialog state
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    item: null,
    loading: false,
  });

  // Form Fields
  const [formData, setFormData] = useState({
    lahan_id: '',
    tanggal: getTodayFormatted(),
    jenis_pekerjaan: '',
    custom_jenis: '',
    biaya: '',
    keterangan: '',
    keep_old_foto: true,
  });

  // Image compression & upload state
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [compressing, setCompressing] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState(null);

  // Fetch all lahan and jenis pekerjaan for dropdowns
  const fetchLahanOptions = async () => {
    try {
      const [resLahan, resJenis] = await Promise.all([
        request.get(API_ENDPOINTS.LAHAN.ALL),
        request.get(API_ENDPOINTS.JENIS_PEKERJAAN.ALL),
      ]);
      if (resLahan.success) {
        setLahanOptions(resLahan.data);
      }
      if (resJenis.success && resJenis.data.length > 0) {
        setJenisOptions(resJenis.data.map((j) => j.nama_jenis));
      }
    } catch (err) {
      console.error('Error fetch dropdown options:', err);
    }
  };

  useEffect(() => {
    fetchLahanOptions();
  }, []);

  // Fetch list pekerjaan lahan
  const fetchPekerjaan = useCallback(async () => {
    setLoading(true);
    try {
      const res = await request.get(API_ENDPOINTS.PEKERJAAN.LIST, {
        page: pagination.page,
        limit: pagination.limit,
        search,
        lahan_id: lahanFilter,
        jenis_pekerjaan: jenisFilter,
        startDate,
        endDate,
      });

      if (res.success) {
        setData(res.data);
        setTotalBiayaFiltered(res.summary?.total_biaya || 0);
        setPagination((prev) => ({
          ...prev,
          total: res.pagination.total,
          totalPages: res.pagination.totalPages,
        }));
      }
    } catch (err) {
      toast.error('Gagal memuat catatan kerja lahan: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, lahanFilter, jenisFilter, startDate, endDate]);

  useEffect(() => {
    fetchPekerjaan();
  }, [fetchPekerjaan]);

  // Handle URL query trigger: ?action=create
  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      handleOpenCreate();
      searchParams.delete('action');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams]);

  const handleOpenCreate = () => {
    setIsEditMode(false);
    setCurrentId(null);
    setFormData({
      lahan_id: '',
      tanggal: getTodayFormatted(),
      jenis_pekerjaan: '',
      custom_jenis: '',
      biaya: '',
      keterangan: '',
      keep_old_foto: true,
    });
    setImageFile(null);
    setImagePreview(null);
    setCompressionInfo(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item) => {
    setIsEditMode(true);
    setCurrentId(item.id);

    const isCustom = !JENIS_PEKERJAAN_OPTIONS.includes(item.jenis_pekerjaan);

    setFormData({
      lahan_id: String(item.lahan_id),
      tanggal: item.tanggal,
      jenis_pekerjaan: isCustom ? 'Lainnya' : item.jenis_pekerjaan,
      custom_jenis: isCustom ? item.jenis_pekerjaan : '',
      biaya: String(Math.round(item.biaya)),
      keterangan: item.keterangan || '',
      keep_old_foto: true,
    });

    setImageFile(null);
    setImagePreview(item.foto ? `${UPLOAD_BASE_URL}/${item.foto}` : null);
    setCompressionInfo(null);
    setIsFormOpen(true);
  };

  // Image Selection & Client-Side Compression with Compressor.js
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCompressing(true);
    const toastId = toast.loading('Mengompres foto via CompressorJS...');

    try {
      // Client-side compression targeting <= 500KB as explicitly specified
      const result = await compressImage(file, { maxSizeKB: 500 });

      setImageFile(result.file);
      setImagePreview(result.previewUrl);
      setCompressionInfo({
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
        savedPercent: result.savedPercent,
      });

      toast.success(
        `Foto berhasil dikompres: ${formatFileSize(result.originalSize)} ➔ ${formatFileSize(
          result.compressedSize
        )} (Maks 500KB)`,
        { id: toastId }
      );
    } catch (err) {
      toast.error('Gagal mengompres foto: ' + err.message, { id: toastId });
    } finally {
      setCompressing(false);
      // Reset input value to allow selecting same file if desired
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = () => {
    setImageFile(null);
    setImagePreview(null);
    setCompressionInfo(null);
    setFormData((prev) => ({ ...prev, keep_old_foto: false }));
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();

    if (!formData.lahan_id) {
      toast.error('Silakan pilih tempat lahan terlebih dahulu');
      return;
    }
    if (!formData.tanggal) {
      toast.error('Tanggal pekerjaan wajib diisi');
      return;
    }

    const finalJenis =
      formData.jenis_pekerjaan === 'Lainnya'
        ? formData.custom_jenis.trim()
        : formData.jenis_pekerjaan;

    if (!finalJenis) {
      toast.error('Jenis pekerjaan wajib diisi');
      return;
    }

    const numBiaya = Number(formData.biaya);
    if (isNaN(numBiaya) || numBiaya < 0) {
      toast.error('Biaya pengerjaan harus berupa angka >= 0');
      return;
    }

    setSubmitting(true);
    try {
      const dataPayload = new FormData();
      dataPayload.append('lahan_id', formData.lahan_id);
      dataPayload.append('tanggal', formData.tanggal);
      dataPayload.append('jenis_pekerjaan', finalJenis);
      dataPayload.append('biaya', numBiaya);
      dataPayload.append('keterangan', formData.keterangan || '');

      if (imageFile) {
        dataPayload.append('foto', imageFile);
      } else {
        dataPayload.append('keep_old_foto', formData.keep_old_foto);
      }

      if (isEditMode) {
        await request.putUpload(API_ENDPOINTS.PEKERJAAN.UPDATE(currentId), dataPayload);
        toast.success('Rekapan kerja lahan berhasil diperbarui');
      } else {
        await request.upload(API_ENDPOINTS.PEKERJAAN.CREATE, dataPayload);
        toast.success('Rekapan kerja lahan berhasil dicatat');
      }

      setIsFormOpen(false);
      fetchPekerjaan();
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan rekapan kerja');
    } finally {
      setSubmitting(false);
    }
  };

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
      await request.delete(API_ENDPOINTS.PEKERJAAN.DELETE(deleteDialog.item.id));
      toast.success('Catatan kerja lahan berhasil dihapus');
      setDeleteDialog({ isOpen: false, item: null, loading: false });
      fetchPekerjaan();
    } catch (err) {
      toast.error(err.message || 'Gagal menghapus catatan pekerjaan');
      setDeleteDialog((prev) => ({ ...prev, loading: false }));
    }
  };

  const resetFilters = () => {
    setSearch('');
    setLahanFilter('');
    setJenisFilter('');
    setStartDate('');
    setEndDate('');
    setPagination((p) => ({ ...p, page: 1 }));
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Shovel className="h-6 w-6 text-brand-600" />
            Rekapan Kerja Lahan
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Catat tanggal pengerjaan, jenis pekerjaan, biaya operasional, dan bukti foto kegiatan.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-brand-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          + Catat Pekerjaan
        </button>
      </div>

      {/* Summary Filter Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-900 to-teal-900 text-white p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-emerald-300 backdrop-blur-md">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-emerald-200 uppercase tracking-wider">
              Total Biaya Pengerjaan (Filter Saat Ini)
            </p>
            <p className="text-xl sm:text-2xl font-black text-white">
              {formatRupiah(totalBiayaFiltered)}
            </p>
          </div>
        </div>

        <div className="text-xs text-emerald-200/80 sm:text-right">
          <span>{pagination.total} catatan pekerjaan tercatat</span>
        </div>
      </div>

      {/* Filters Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 pb-1 border-b border-slate-100">
          <span className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            Filter & Pencarian
          </span>
          {(search || lahanFilter || jenisFilter || startDate || endDate) && (
            <button
              type="button"
              onClick={resetFilters}
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
              placeholder="Cari jenis pekerjaan atau keterangan..."
            />
          </div>

          {/* Lahan Filter */}
          <div>
            <AppSelect
              value={lahanFilter}
              onChange={(val) => {
                setLahanFilter(val);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              options={[
                { value: '', label: 'Semua Lahan' },
                ...lahanOptions.map((lahan) => ({
                  value: lahan.id,
                  label: lahan.nama_lahan,
                })),
              ]}
              placeholder="Semua Lahan"
              isClearable
            />
          </div>

          {/* Jenis Filter */}
          <div>
            <AppSelect
              value={jenisFilter}
              onChange={(val) => {
                setJenisFilter(val);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              options={[
                { value: '', label: 'Semua Jenis Pekerjaan' },
                ...jenisOptions.map((opt) => ({ value: opt, label: opt })),
              ]}
              placeholder="Semua Jenis Pekerjaan"
              isClearable
            />
          </div>

          {/* Tanggal Mulai */}
          <div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              title="Dari Tanggal"
            />
          </div>

          {/* Tanggal Sampai */}
          <div>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
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
        ) : data.length === 0 ? (
          <EmptyState
            icon={Shovel}
            title="Tidak Ada Catatan Kerja Lahan"
            description={
              search || lahanFilter || jenisFilter || startDate || endDate
                ? 'Tidak ada pekerjaan lahan yang sesuai dengan kriteria filter.'
                : 'Belum ada rekapan pekerjaan lahan. Klik tombol di bawah untuk mencatat pekerjaan pertama.'
            }
            actionLabel="+ Catat Pekerjaan"
            onAction={handleOpenCreate}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4 sm:px-6">Tanggal & Bukti</th>
                    <th className="py-3.5 px-4">Tempat Lahan</th>
                    <th className="py-3.5 px-4">Jenis Pekerjaan</th>
                    <th className="py-3.5 px-4">Biaya Pengerjaan</th>
                    <th className="py-3.5 px-4">Keterangan</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Tanggal & Foto Thumbnail */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          {item.foto ? (
                            <button
                              type="button"
                              onClick={() =>
                                setPhotoViewer({
                                  isOpen: true,
                                  src: `${UPLOAD_BASE_URL}/${item.foto}`,
                                  title: `${item.jenis_pekerjaan} - ${item.nama_lahan}`,
                                })
                              }
                              className="relative group h-12 w-12 shrink-0 rounded-xl overflow-hidden border border-slate-200 shadow-sm"
                            >
                              <img
                                src={`${UPLOAD_BASE_URL}/${item.foto}`}
                                alt={item.jenis_pekerjaan}
                                className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-200"
                              />
                              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                <Eye className="h-4 w-4" />
                              </div>
                            </button>
                          ) : (
                            <div className="h-12 w-12 shrink-0 rounded-xl bg-slate-100 border border-dashed border-slate-200 flex items-center justify-center text-slate-400">
                              <ImageIcon className="h-5 w-5" />
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-slate-400" />
                              <span>{formatTanggalIndo(item.tanggal)}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Nama Lahan */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-emerald-800 flex items-center gap-1.5">
                          <Sprout className="h-4 w-4 text-emerald-600" />
                          <span>{item.nama_lahan}</span>
                        </div>
                        {item.komoditas && (
                          <div className="text-xs text-slate-500 mt-0.5">
                            Tanaman: {item.komoditas}
                          </div>
                        )}
                      </td>

                      {/* Jenis Pekerjaan */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800 bg-slate-100/90 text-slate-700 px-2.5 py-1 rounded-lg text-xs">
                          {item.jenis_pekerjaan}
                        </span>
                      </td>

                      {/* Biaya */}
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-base text-slate-900">
                          {formatRupiah(item.biaya)}
                        </div>
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
                            title="Edit Catatan"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePrompt(item)}
                            className="rounded-lg p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Hapus Catatan"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
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

      {/* Modal Input / Edit Catatan Kerja Lahan */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => !submitting && setIsFormOpen(false)}
        title={isEditMode ? 'Edit Rekapan Kerja Lahan' : 'Catat Pekerjaan Lahan Baru'}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmitForm} className="space-y-4">
          {/* Pilihan Tempat Lahan */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Pilih Tempat Lahan <span className="text-rose-500">*</span>
            </label>
            <AppSelect
              value={formData.lahan_id}
              onChange={(val) => setFormData({ ...formData, lahan_id: val || '' })}
              options={lahanOptions.map((lahan) => ({
                value: lahan.id,
                label: `${lahan.nama_lahan} ${lahan.komoditas ? `(${lahan.komoditas})` : ''}`,
              }))}
              placeholder="-- Pilih Tempat Lahan --"
              isClearable
              required
            />
          </div>

          {/* Tanggal & Biaya Pengerjaan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Tanggal Pekerjaan <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.tanggal}
                onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Biaya Pengerjaan (Rp) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">
                  Rp
                </span>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  required
                  placeholder="Contoh: 350000"
                  value={formData.biaya}
                  onChange={(e) => setFormData({ ...formData, biaya: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-3.5 text-sm text-slate-900 font-semibold focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            </div>
          </div>

          {/* Jenis Pekerjaan */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Jenis Pekerjaan <span className="text-rose-500">*</span>
              </label>
              <a
                href="/jenis-pekerjaan"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-bold text-brand-600 hover:text-brand-700 underline"
              >
                + Kelola Master Jenis
              </a>
            </div>
            <AppSelect
              value={formData.jenis_pekerjaan}
              onChange={(val) => setFormData({ ...formData, jenis_pekerjaan: val || '' })}
              options={[
                ...jenisOptions.map((opt) => ({ value: opt, label: opt })),
                { value: 'Lainnya', label: 'Lainnya (Input Manual)...' },
              ]}
              placeholder="-- Pilih Jenis Pekerjaan --"
              isClearable
              required
            />

            {formData.jenis_pekerjaan === 'Lainnya' && (
              <input
                type="text"
                required
                placeholder="Tuliskan jenis pekerjaan lainnya..."
                value={formData.custom_jenis}
                onChange={(e) => setFormData({ ...formData, custom_jenis: e.target.value })}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white py-2 px-3.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            )}
          </div>

          {/* Foto Pengerjaan (Opsional) with Frontend Compressor.js */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Foto Bukti Kerja (Opsional)
              </label>
              <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Auto compress &lt; 500KB
              </span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {!imagePreview ? (
              <div
                onClick={() => !compressing && fileInputRef.current?.click()}
                className="cursor-pointer border-2 border-dashed border-slate-200 rounded-2xl p-5 text-center hover:bg-slate-50/70 hover:border-brand-400 transition-all group"
              >
                {compressing ? (
                  <div className="flex flex-col items-center justify-center py-2 text-brand-600">
                    <Loader2 className="h-8 w-8 animate-spin mb-2" />
                    <p className="text-xs font-bold">Mengompres Foto...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-1">
                    <div className="h-10 w-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                      <Upload className="h-5 w-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-700">
                      Klik untuk Ambil / Upload Foto
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      JPG, PNG, atau WEBP. Foto otomatis dikompres di bawah 500KB agar ringan.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative rounded-2xl border border-slate-200 p-3 bg-slate-50/60">
                <div className="flex items-center gap-4">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-20 w-20 rounded-xl object-cover border border-slate-200 shadow-sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <FileCheck className="h-4 w-4 text-emerald-600" />
                      Foto Siap Disimpan
                    </p>
                    {compressionInfo ? (
                      <div className="mt-1 text-[11px] text-slate-600 space-y-0.5">
                        <p>
                          Ukuran asli: {formatFileSize(compressionInfo.originalSize)} ➔{' '}
                          <span className="font-bold text-emerald-700">
                            {formatFileSize(compressionInfo.compressedSize)}
                          </span>
                        </p>
                        <p className="text-emerald-600 font-semibold">
                          Hemat {compressionInfo.savedPercent}% (Max 500KB Terpenuhi ✓)
                        </p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500 mt-1">
                        Foto tersimpan sebelumnya
                      </p>
                    )}

                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs font-semibold text-brand-600 hover:text-brand-700 underline"
                      >
                        Ganti Foto
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-700 underline"
                      >
                        Hapus Foto
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Keterangan */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Keterangan / Rincian
            </label>
            <textarea
              rows={2}
              value={formData.keterangan}
              onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
              placeholder="Catatan pengerjaan, pupuk/obat yang digunakan, jam kerja, dll..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setIsFormOpen(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || compressing}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition-colors disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditMode ? 'Simpan Perubahan' : 'Simpan Rekapan Kerja'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Photo Viewer Modal */}
      <Modal
        isOpen={photoViewer.isOpen}
        onClose={() => setPhotoViewer({ isOpen: false, src: null, title: '' })}
        title={photoViewer.title || 'Bukti Foto Pekerjaan'}
        maxWidth="max-w-3xl"
      >
        <div className="flex flex-col items-center justify-center">
          {photoViewer.src && (
            <img
              src={photoViewer.src}
              alt="Foto Pekerjaan Lahan"
              className="max-h-[70vh] w-auto rounded-xl object-contain shadow-md"
            />
          )}
        </div>
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        isLoading={deleteDialog.loading}
        title="Hapus Rekapan Kerja"
        message={`Apakah Anda yakin ingin menghapus catatan kegiatan "${deleteDialog.item?.jenis_pekerjaan}" pada tanggal ${deleteDialog.item?.tanggal}?`}
        confirmText="Ya, Hapus Data"
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteDialog({ isOpen: false, item: null, loading: false })}
      />
    </div>
  );
}
