import React, { useState, useEffect, useCallback } from 'react';
import {
  ListChecks,
  Plus,
  Edit2,
  Trash2,
  Tag,
  Filter,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Layers,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { request } from '@/utils/request';
import { API_ENDPOINTS } from '@/utils/endpoints';
import SearchInput from '@/components/common/SearchInput';
import Pagination from '@/components/common/Pagination';
import Modal from '@/components/common/Modal';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import EmptyState from '@/components/common/EmptyState';
import { TableSkeleton } from '@/components/common/LoadingSkeleton';
import AppSelect from '@/components/common/AppSelect';

const KATEGORI_OPTIONS = [
  'Pengolahan Lahan',
  'Pembibitan & Tanam',
  'Pemeliharaan',
  'Pemupukan & Nutrisi',
  'Pengendalian Hama',
  'Konstruksi Tanaman',
  'Pemanenan & Pasca Panen',
  'Umum',
];

export default function JenisPekerjaanPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [search, setSearch] = useState('');
  const [kategoriFilter, setKategoriFilter] = useState('');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    nama_jenis: '',
    kategori: 'Pengolahan Lahan',
    keterangan: '',
  });

  // Delete dialog
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    item: null,
    loading: false,
  });

  const fetchJenisPekerjaan = useCallback(async () => {
    setLoading(true);
    try {
      const res = await request.get(API_ENDPOINTS.JENIS_PEKERJAAN.LIST, {
        page: pagination.page,
        limit: pagination.limit,
        search,
        kategori: kategoriFilter,
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
      toast.error('Gagal memuat data jenis pekerjaan: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, kategoriFilter]);

  useEffect(() => {
    fetchJenisPekerjaan();
  }, [fetchJenisPekerjaan]);

  const handleOpenCreate = () => {
    setIsEditMode(false);
    setCurrentId(null);
    setFormData({
      nama_jenis: '',
      kategori: 'Pengolahan Lahan',
      keterangan: '',
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item) => {
    setIsEditMode(true);
    setCurrentId(item.id);
    setFormData({
      nama_jenis: item.nama_jenis || '',
      kategori: item.kategori || 'Umum',
      keterangan: item.keterangan || '',
    });
    setIsFormOpen(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();

    if (!formData.nama_jenis.trim()) {
      toast.error('Nama jenis pekerjaan wajib diisi');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditMode) {
        await request.put(API_ENDPOINTS.JENIS_PEKERJAAN.UPDATE(currentId), formData);
        toast.success('Jenis pekerjaan berhasil diperbarui');
      } else {
        await request.post(API_ENDPOINTS.JENIS_PEKERJAAN.CREATE, formData);
        toast.success('Jenis pekerjaan baru berhasil ditambahkan');
      }
      setIsFormOpen(false);
      fetchJenisPekerjaan();
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan jenis pekerjaan');
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
      await request.delete(API_ENDPOINTS.JENIS_PEKERJAAN.DELETE(deleteDialog.item.id));
      toast.success(`Jenis pekerjaan "${deleteDialog.item.nama_jenis}" berhasil dihapus`);
      setDeleteDialog({ isOpen: false, item: null, loading: false });
      fetchJenisPekerjaan();
    } catch (err) {
      toast.error(err.message || 'Gagal menghapus jenis pekerjaan');
      setDeleteDialog((prev) => ({ ...prev, loading: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ListChecks className="h-6 w-6 text-brand-600" />
            Master Jenis Pekerjaan
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kelola jenis kegiatan atau pekerjaan pertanian untuk pilihan saat input catatan kerja lahan.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-brand-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          + Tambah Jenis Pekerjaan
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
              placeholder="Cari nama jenis pekerjaan atau keterangan..."
            />
          </div>

          <div>
            <AppSelect
              value={kategoriFilter}
              onChange={(val) => {
                setKategoriFilter(val || '');
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              options={[
                { value: '', label: 'Semua Kategori' },
                ...KATEGORI_OPTIONS.map((kat) => ({ value: kat, label: kat })),
              ]}
              placeholder="Semua Kategori"
              isClearable
            />
          </div>
        </div>
      </div>

      {/* Content Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={6} cols={5} />
          </div>
        ) : data.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="Tidak Ada Jenis Pekerjaan"
            description={
              search || kategoriFilter
                ? 'Tidak ada data yang cocok dengan kriteria filter.'
                : 'Belum ada data jenis pekerjaan. Klik tombol di bawah untuk menambahkan jenis baru.'
            }
            actionLabel="+ Tambah Jenis Pekerjaan"
            onAction={handleOpenCreate}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4 sm:px-6">Nama Jenis Pekerjaan</th>
                    <th className="py-3.5 px-4">Kategori</th>
                    <th className="py-3.5 px-4">Keterangan</th>
                    <th className="py-3.5 px-4">Penggunaan di Lapangan</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-4 sm:px-6 font-bold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                            <Tag className="h-4 w-4" />
                          </div>
                          <span>{item.nama_jenis}</span>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span className="inline-flex text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                          {item.kategori}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-xs text-slate-500 max-w-xs truncate">
                        {item.keterangan || '-'}
                      </td>

                      <td className="py-4 px-4 text-xs">
                        <span className="font-semibold text-slate-800">
                          {item.total_penggunaan || 0}
                        </span>{' '}
                        kali tercatat
                      </td>

                      <td className="py-4 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="rounded-lg p-1.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                            title="Edit Jenis Pekerjaan"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePrompt(item)}
                            className="rounded-lg p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Hapus Jenis Pekerjaan"
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

      {/* Modal Tambah / Edit */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => !submitting && setIsFormOpen(false)}
        title={isEditMode ? 'Edit Jenis Pekerjaan' : 'Tambah Jenis Pekerjaan Baru'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmitForm} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Nama Jenis Pekerjaan <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.nama_jenis}
              onChange={(e) => setFormData({ ...formData, nama_jenis: e.target.value })}
              placeholder="Contoh: Pemangkasan Daun / Pruning"
              className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Kategori Kegiatan
            </label>
            <AppSelect
              value={formData.kategori}
              onChange={(val) => setFormData({ ...formData, kategori: val || 'Umum' })}
              options={KATEGORI_OPTIONS.map((kat) => ({ value: kat, label: kat }))}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Keterangan / Catatan SOP
            </label>
            <textarea
              rows={3}
              value={formData.keterangan}
              onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
              placeholder="Penjelasan ringkas tentang pekerjaan ini..."
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
              {isEditMode ? 'Simpan Perubahan' : 'Tambah Jenis Pekerjaan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        isLoading={deleteDialog.loading}
        title="Hapus Jenis Pekerjaan"
        message={`Apakah Anda yakin ingin menghapus jenis pekerjaan "${deleteDialog.item?.nama_jenis}"?`}
        confirmText="Ya, Hapus Data"
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteDialog({ isOpen: false, item: null, loading: false })}
      />
    </div>
  );
}
