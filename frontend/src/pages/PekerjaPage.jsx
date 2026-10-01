import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Plus,
  Phone,
  Briefcase,
  DollarSign,
  Edit2,
  Trash2,
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { request } from '@/utils/request';
import { API_ENDPOINTS } from '@/utils/endpoints';
import { formatRupiah } from '@/utils/formatters';
import SearchInput from '@/components/common/SearchInput';
import Pagination from '@/components/common/Pagination';
import Modal from '@/components/common/Modal';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import EmptyState from '@/components/common/EmptyState';
import { TableSkeleton } from '@/components/common/LoadingSkeleton';
import Badge from '@/components/common/Badge';
import AppSelect from '@/components/common/AppSelect';

export default function PekerjaPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    nama: '',
    no_hp: '',
    jabatan: 'Pekerja Harian',
    upah_harian_standar: '100000',
    status: 'Aktif',
    alamat: '',
  });

  // Delete dialog
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    item: null,
    loading: false,
  });

  const fetchPekerja = useCallback(async () => {
    setLoading(true);
    try {
      const res = await request.get(API_ENDPOINTS.PEKERJA.LIST, {
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
      toast.error('Gagal memuat data pekerja: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, statusFilter]);

  useEffect(() => {
    fetchPekerja();
  }, [fetchPekerja]);

  const handleOpenCreate = () => {
    setIsEditMode(false);
    setCurrentId(null);
    setFormData({
      nama: '',
      no_hp: '',
      jabatan: 'Pekerja Harian',
      upah_harian_standar: '100000',
      status: 'Aktif',
      alamat: '',
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item) => {
    setIsEditMode(true);
    setCurrentId(item.id);
    setFormData({
      nama: item.nama || '',
      no_hp: item.no_hp || '',
      jabatan: item.jabatan || 'Pekerja Harian',
      upah_harian_standar: String(Math.round(item.upah_harian_standar || 100000)),
      status: item.status || 'Aktif',
      alamat: item.alamat || '',
    });
    setIsFormOpen(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();

    if (!formData.nama.trim()) {
      toast.error('Nama pekerja wajib diisi');
      return;
    }

    const upah = Number(formData.upah_harian_standar);
    if (isNaN(upah) || upah < 0) {
      toast.error('Upah harian standar harus berupa angka valid');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditMode) {
        await request.put(API_ENDPOINTS.PEKERJA.UPDATE(currentId), formData);
        toast.success('Data pekerja berhasil diperbarui');
      } else {
        await request.post(API_ENDPOINTS.PEKERJA.CREATE, formData);
        toast.success('Pekerja baru berhasil ditambahkan');
      }
      setIsFormOpen(false);
      fetchPekerja();
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan data pekerja');
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
      await request.delete(API_ENDPOINTS.PEKERJA.DELETE(deleteDialog.item.id));
      toast.success(`Data pekerja "${deleteDialog.item.nama}" berhasil dihapus`);
      setDeleteDialog({ isOpen: false, item: null, loading: false });
      fetchPekerja();
    } catch (err) {
      toast.error(err.message || 'Gagal menghapus data pekerja');
      setDeleteDialog((prev) => ({ ...prev, loading: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-brand-600" />
            Data Pekerja Pertanian
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Daftar tenaga kerja, nomor kontak, jabatan, upah harian standar, dan riwayat kehadiran.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-brand-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          + Tambah Pekerja
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
              placeholder="Cari nama pekerja, jabatan, atau nomor telepon..."
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
                { value: '', label: 'Semua Status Pekerja' },
                { value: 'Aktif', label: 'Aktif' },
                { value: 'Nonaktif', label: 'Non-aktif' },
              ]}
              placeholder="Semua Status Pekerja"
              isClearable
            />
          </div>
        </div>
      </div>

      {/* Content Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={5} cols={5} />
          </div>
        ) : data.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Tidak Ada Data Pekerja"
            description={
              search || statusFilter
                ? 'Tidak ada pekerja yang cocok dengan pencarian Anda.'
                : 'Belum ada data tenaga kerja. Klik tombol di bawah untuk mendaftarkan pekerja pertama.'
            }
            actionLabel="+ Tambah Pekerja"
            onAction={handleOpenCreate}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4 sm:px-6">Nama Pekerja & Kontak</th>
                    <th className="py-3.5 px-4">Jabatan / Keahlian</th>
                    <th className="py-3.5 px-4">Upah Standar</th>
                    <th className="py-3.5 px-4">Kehadiran & Upah Diterima</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((pekerja) => {
                    const isAktif = pekerja.status === 'Aktif';
                    return (
                      <tr key={pekerja.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-4 px-4 sm:px-6 font-semibold text-slate-900">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-700">
                              {pekerja.nama.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{pekerja.nama}</div>
                              {pekerja.no_hp && (
                                <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                                  <Phone className="h-3 w-3 text-slate-400" />
                                  <span>{pekerja.no_hp}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                            <Briefcase className="h-3 w-3 text-slate-500" />
                            {pekerja.jabatan}
                          </span>
                        </td>

                        <td className="py-4 px-4 font-bold text-slate-900">
                          {formatRupiah(pekerja.upah_harian_standar)}
                          <span className="text-xs font-normal text-slate-400 block">/ hari</span>
                        </td>

                        <td className="py-4 px-4 text-xs">
                          <div className="font-semibold text-slate-800">
                            {pekerja.total_kehadiran} hari kerja
                          </div>
                          <div className="text-emerald-700 font-extrabold mt-0.5">
                            {formatRupiah(pekerja.total_upah_diterima)}
                          </div>
                          <Link
                            to={`/upah-pekerja?search=${encodeURIComponent(pekerja.nama)}`}
                            className="text-[11px] text-brand-600 hover:text-brand-800 font-bold inline-flex items-center gap-0.5 mt-1"
                          >
                            Rincian Upah →
                          </Link>
                        </td>

                        <td className="py-4 px-4">
                          <Badge variant={isAktif ? 'success' : 'default'} dot>
                            {pekerja.status}
                          </Badge>
                        </td>

                        <td className="py-4 px-4 sm:px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(pekerja)}
                              className="rounded-lg p-1.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                              title="Edit Pekerja"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePrompt(pekerja)}
                              className="rounded-lg p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Hapus Pekerja"
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

      {/* Modal Tambah / Edit Pekerja */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => !submitting && setIsFormOpen(false)}
        title={isEditMode ? 'Edit Data Pekerja' : 'Daftarkan Pekerja Baru'}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmitForm} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Nama Lengkap Pekerja <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.nama}
              onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
              placeholder="Contoh: Pak Sukardi"
              className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                No. Telepon / WhatsApp
              </label>
              <input
                type="text"
                value={formData.no_hp}
                onChange={(e) => setFormData({ ...formData, no_hp: e.target.value })}
                placeholder="Contoh: 08123456789"
                className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Jabatan / Peran
              </label>
              <AppSelect
                value={formData.jabatan}
                onChange={(val) => setFormData({ ...formData, jabatan: val || 'Pekerja Harian' })}
                options={[
                  { value: 'Pekerja Harian', label: 'Pekerja Harian' },
                  { value: 'Mandor Lapangan', label: 'Mandor Lapangan' },
                  { value: 'Operator Traktor', label: 'Operator Traktor' },
                  { value: 'Tenaga Tanam & Panen', label: 'Tenaga Tanam & Panen' },
                  { value: 'Spesialis Semprot / Hama', label: 'Spesialis Semprot / Hama' },
                  { value: 'Lainnya', label: 'Lainnya' },
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Upah Standar per Hari (Rp) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="5000"
                required
                value={formData.upah_harian_standar}
                onChange={(e) => setFormData({ ...formData, upah_harian_standar: e.target.value })}
                placeholder="100000"
                className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3.5 text-sm text-slate-900 font-semibold focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Status Pekerja
              </label>
              <AppSelect
                value={formData.status}
                onChange={(val) => setFormData({ ...formData, status: val || 'Aktif' })}
                options={[
                  { value: 'Aktif', label: 'Aktif' },
                  { value: 'Nonaktif', label: 'Non-aktif' },
                ]}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Alamat / Domisili
            </label>
            <textarea
              rows={2}
              value={formData.alamat}
              onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
              placeholder="Contoh: Kp. Babakan RT 02/03..."
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
              {isEditMode ? 'Simpan Perubahan' : 'Daftarkan Pekerja'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        isLoading={deleteDialog.loading}
        title="Hapus Data Pekerja"
        message={`Apakah Anda yakin ingin menghapus data pekerja "${deleteDialog.item?.nama}"? Seluruh riwayat absensi terkait pekerja ini juga akan terhapus.`}
        confirmText="Ya, Hapus Pekerja"
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteDialog({ isOpen: false, item: null, loading: false })}
      />
    </div>
  );
}
