import React, { useState, useEffect, useCallback } from 'react';
import {
  Sprout,
  Plus,
  MapPin,
  Maximize2,
  Tag,
  DollarSign,
  Shovel,
  Edit2,
  Trash2,
  Layers,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { request } from '@/utils/request';
import { API_ENDPOINTS } from '@/utils/endpoints';
import { formatRupiah, STATUS_LAHAN_MAP } from '@/utils/formatters';
import SearchInput from '@/components/common/SearchInput';
import Pagination from '@/components/common/Pagination';
import Modal from '@/components/common/Modal';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import EmptyState from '@/components/common/EmptyState';
import { TableSkeleton } from '@/components/common/LoadingSkeleton';
import Badge from '@/components/common/Badge';
import AppSelect from '@/components/common/AppSelect';

export default function LahanPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    nama_lahan: '',
    lokasi: '',
    luas_lahan: '',
    komoditas: '',
    status: 'Aktif',
    keterangan: '',
  });

  // Delete Confirm Dialog state
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    item: null,
    loading: false,
  });

  // Fetch list lahan
  const fetchLahan = useCallback(async () => {
    setLoading(true);
    try {
      const res = await request.get(API_ENDPOINTS.LAHAN.LIST, {
        page: pagination.page,
        limit: pagination.limit,
        search,
        status: statusFilter,
      });

      if (res.success) {
        setData(res.data);
        setPagination((prev) => ({
          ...prev,
          total: res.pagination.total,
          totalPages: res.pagination.totalPages,
        }));
      }
    } catch (err) {
      toast.error('Gagal memuat data lahan: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, statusFilter]);

  useEffect(() => {
    fetchLahan();
  }, [fetchLahan]);

  const handleOpenCreate = () => {
    setIsEditMode(false);
    setCurrentId(null);
    setFormData({
      nama_lahan: '',
      lokasi: '',
      luas_lahan: '',
      komoditas: '',
      status: 'Aktif',
      keterangan: '',
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item) => {
    setIsEditMode(true);
    setCurrentId(item.id);
    setFormData({
      nama_lahan: item.nama_lahan || '',
      lokasi: item.lokasi || '',
      luas_lahan: item.luas_lahan || '',
      komoditas: item.komoditas || '',
      status: item.status || 'Aktif',
      keterangan: item.keterangan || '',
    });
    setIsFormOpen(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();

    if (!formData.nama_lahan.trim()) {
      toast.error('Nama tempat/lahan wajib diisi');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditMode) {
        await request.put(API_ENDPOINTS.LAHAN.UPDATE(currentId), formData);
        toast.success('Data lahan berhasil diperbarui');
      } else {
        await request.post(API_ENDPOINTS.LAHAN.CREATE, formData);
        toast.success('Data lahan baru berhasil ditambahkan');
      }
      setIsFormOpen(false);
      fetchLahan();
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan data lahan');
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
      await request.delete(API_ENDPOINTS.LAHAN.DELETE(deleteDialog.item.id));
      toast.success(`Lahan "${deleteDialog.item.nama_lahan}" berhasil dihapus`);
      setDeleteDialog({ isOpen: false, item: null, loading: false });
      fetchLahan();
    } catch (err) {
      toast.error(err.message || 'Gagal menghapus lahan');
      setDeleteDialog((prev) => ({ ...prev, loading: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Sprout className="h-6 w-6 text-brand-600" />
            Tempat Lahan Pertanian
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kelola data master lahan, luas areal tanam, komoditas utama, serta alokasi biaya.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-brand-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          + Tambah Lahan
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <SearchInput
              value={search}
              onChange={(val) => {
                setSearch(val);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              placeholder="Cari nama lahan, lokasi, atau komoditas..."
            />
          </div>

          <div>
            <AppSelect
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val || '');
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              options={[
                { value: '', label: 'Semua Status Lahan' },
                { value: 'Aktif', label: 'Aktif' },
                { value: 'Istirahat', label: 'Istirahat' },
                { value: 'Selesai Panen', label: 'Selesai Panen' },
              ]}
              placeholder="Semua Status Lahan"
              isClearable
            />
          </div>
        </div>
      </div>

      {/* Content Table & Cards */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={5} cols={5} />
          </div>
        ) : data.length === 0 ? (
          <EmptyState
            icon={Sprout}
            title="Tidak Ada Data Lahan"
            description={
              search || statusFilter
                ? 'Tidak ada lahan yang cocok dengan kata kunci atau filter status.'
                : 'Mulai dengan menambahkan data tempat lahan pertanian pertama Anda.'
            }
            actionLabel="+ Tambah Lahan"
            onAction={handleOpenCreate}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4 sm:px-6">Nama Lahan & Lokasi</th>
                    <th className="py-3.5 px-4">Komoditas & Luas</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Total Biaya Kerja</th>
                    <th className="py-3.5 px-4">Pekerjaan</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((lahan) => {
                    const statusMeta = STATUS_LAHAN_MAP[lahan.status] || STATUS_LAHAN_MAP.Aktif;
                    return (
                      <tr key={lahan.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-4 px-4 sm:px-6 font-semibold text-slate-900">
                          <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                              <Sprout className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{lahan.nama_lahan}</div>
                              {lahan.lokasi && (
                                <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                  <span>{lahan.lokasi}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <div className="font-medium text-slate-800">
                            {lahan.komoditas || '-'}
                          </div>
                          {lahan.luas_lahan && (
                            <div className="text-xs text-slate-500 mt-0.5">
                              Luas: {lahan.luas_lahan}
                            </div>
                          )}
                        </td>

                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusMeta.bg}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} />
                            {lahan.status}
                          </span>
                        </td>

                        <td className="py-4 px-4 font-bold text-slate-900">
                          {formatRupiah(lahan.total_biaya_lahan)}
                        </td>

                        <td className="py-4 px-4 text-xs text-slate-600">
                          <span className="font-semibold text-slate-800">
                            {lahan.total_pekerjaan}
                          </span>{' '}
                          kegiatan
                        </td>

                        <td className="py-4 px-4 sm:px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(lahan)}
                              className="rounded-lg p-1.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                              title="Edit Lahan"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePrompt(lahan)}
                              className="rounded-lg p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Hapus Lahan"
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

            {/* Pagination component */}
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

      {/* Modal Create / Edit Lahan */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => !submitting && setIsFormOpen(false)}
        title={isEditMode ? 'Edit Tempat Lahan' : 'Tambah Tempat Lahan Baru'}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmitForm} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Nama Tempat / Lahan <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.nama_lahan}
              onChange={(e) => setFormData({ ...formData, nama_lahan: e.target.value })}
              placeholder="Contoh: Lahan Blok A - Jagung Manis"
              className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Komoditas / Tanaman
              </label>
              <input
                type="text"
                value={formData.komoditas}
                onChange={(e) => setFormData({ ...formData, komoditas: e.target.value })}
                placeholder="Contoh: Jagung Bonanza, Padi"
                className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Luas Lahan
              </label>
              <input
                type="text"
                value={formData.luas_lahan}
                onChange={(e) => setFormData({ ...formData, luas_lahan: e.target.value })}
                placeholder="Contoh: 1.5 Hektar / 5.000 m²"
                className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Status Lahan
              </label>
              <AppSelect
                value={formData.status}
                onChange={(val) => setFormData({ ...formData, status: val || 'Aktif' })}
                options={[
                  { value: 'Aktif', label: 'Aktif (Sedang Berjalan)' },
                  { value: 'Istirahat', label: 'Istirahat / Olah Tanah' },
                  { value: 'Selesai Panen', label: 'Selesai Panen' },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Lokasi / Alamat
              </label>
              <input
                type="text"
                value={formData.lokasi}
                onChange={(e) => setFormData({ ...formData, lokasi: e.target.value })}
                placeholder="Contoh: Blok Timur Sukamaju"
                className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Keterangan Tambahan
            </label>
            <textarea
              rows={3}
              value={formData.keterangan}
              onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
              placeholder="Catatan kondisi tanah, pengairan, atau histori lahan..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

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
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition-colors disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditMode ? 'Simpan Perubahan' : 'Tambah Lahan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        isLoading={deleteDialog.loading}
        title="Hapus Data Lahan"
        message={`Apakah Anda yakin ingin menghapus lahan "${deleteDialog.item?.nama_lahan}"? Pastikan tidak ada data kegiatan kerja lahan yang masih terkait.`}
        confirmText="Ya, Hapus Lahan"
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteDialog({ isOpen: false, item: null, loading: false })}
      />
    </div>
  );
}
