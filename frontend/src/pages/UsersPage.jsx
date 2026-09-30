import React, { useState, useEffect, useCallback } from 'react';
import {
  UserCog,
  Plus,
  Shield,
  Mail,
  User,
  KeyRound,
  Edit2,
  Trash2,
  Filter,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { request } from '@/utils/request';
import { API_ENDPOINTS } from '@/utils/endpoints';
import { formatTanggalIndo } from '@/utils/formatters';
import { useAuth } from '@/context/AuthContext';
import SearchInput from '@/components/common/SearchInput';
import Pagination from '@/components/common/Pagination';
import Modal from '@/components/common/Modal';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import EmptyState from '@/components/common/EmptyState';
import { TableSkeleton } from '@/components/common/LoadingSkeleton';
import Badge from '@/components/common/Badge';
import AppSelect from '@/components/common/AppSelect';

export default function UsersPage() {
  const { user: currentUser } = useAuth();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    nama: '',
    username: '',
    email: '',
    password: '',
    role: 'admin',
    status: 'Aktif',
  });

  // Delete dialog
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    item: null,
    loading: false,
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await request.get(API_ENDPOINTS.USERS.LIST, {
        page: pagination.page,
        limit: pagination.limit,
        search,
        role: roleFilter,
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
      toast.error('Gagal memuat data users: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpenCreate = () => {
    setIsEditMode(false);
    setCurrentId(null);
    setFormData({
      nama: '',
      username: '',
      email: '',
      password: '',
      role: 'admin',
      status: 'Aktif',
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item) => {
    setIsEditMode(true);
    setCurrentId(item.id);
    setFormData({
      nama: item.nama || '',
      username: item.username || '',
      email: item.email || '',
      password: '', // blank unless updating
      role: item.role || 'admin',
      status: item.status || 'Aktif',
    });
    setIsFormOpen(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();

    if (!formData.nama.trim()) {
      toast.error('Nama lengkap wajib diisi');
      return;
    }
    if (!formData.username.trim()) {
      toast.error('Username wajib diisi');
      return;
    }
    if (!isEditMode && (!formData.password || formData.password.length < 5)) {
      toast.error('Password minimal 5 karakter');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditMode) {
        await request.put(API_ENDPOINTS.USERS.UPDATE(currentId), formData);
        toast.success('Data akun berhasil diperbarui');
      } else {
        await request.post(API_ENDPOINTS.USERS.CREATE, formData);
        toast.success('Akun baru berhasil didaftarkan');
      }
      setIsFormOpen(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan data user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePrompt = (item) => {
    if (item.id === currentUser?.id) {
      toast.error('Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif');
      return;
    }

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
      await request.delete(API_ENDPOINTS.USERS.DELETE(deleteDialog.item.id));
      toast.success(`Akun "${deleteDialog.item.username}" berhasil dihapus`);
      setDeleteDialog({ isOpen: false, item: null, loading: false });
      fetchUsers();
    } catch (err) {
      toast.error(err.message || 'Gagal menghapus akun');
      setDeleteDialog((prev) => ({ ...prev, loading: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <UserCog className="h-6 w-6 text-brand-600" />
            Manajemen Akun & Role
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kelola hak akses dan akun pengguna aplikasi (Admin, Mandor Lapangan, dan Pemilik Lahan).
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-brand-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          + Tambah Akun
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <SearchInput
              value={search}
              onChange={(val) => {
                setSearch(val);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              placeholder="Cari nama, username, atau email..."
            />
          </div>

          <div>
            <AppSelect
              value={roleFilter}
              onChange={(val) => {
                setRoleFilter(val || '');
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              options={[
                { value: '', label: 'Semua Role' },
                { value: 'admin', label: 'Admin' },
                { value: 'mandor', label: 'Mandor' },
                { value: 'pemilik', label: 'Pemilik Lahan' },
              ]}
              placeholder="Semua Role"
              isClearable
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
                { value: '', label: 'Semua Status' },
                { value: 'Aktif', label: 'Aktif' },
                { value: 'Nonaktif', label: 'Non-aktif' },
              ]}
              placeholder="Semua Status"
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
            icon={UserCog}
            title="Tidak Ada Akun Pengguna"
            description={
              search || roleFilter || statusFilter
                ? 'Tidak ada akun yang sesuai dengan kriteria pencarian.'
                : 'Belum ada akun terdaftar.'
            }
            actionLabel="+ Tambah Akun"
            onAction={handleOpenCreate}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4 sm:px-6">Pengguna</th>
                    <th className="py-3.5 px-4">Role Akses</th>
                    <th className="py-3.5 px-4">Email</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Dibuat Pada</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((u) => {
                    const isSelf = u.id === currentUser?.id;
                    const roleColor =
                      u.role === 'admin'
                        ? 'purple'
                        : u.role === 'mandor'
                        ? 'success'
                        : 'info';

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-4 px-4 sm:px-6 font-semibold text-slate-900">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-700">
                              {u.nama.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span>{u.nama}</span>
                                {isSelf && (
                                  <span className="text-[10px] bg-brand-100 text-brand-700 font-bold px-1.5 py-0.2 rounded">
                                    Anda
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-400">@{u.username}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <Badge variant={roleColor} dot>
                            {u.role.toUpperCase()}
                          </Badge>
                        </td>

                        <td className="py-4 px-4 text-xs text-slate-600">
                          {u.email || '-'}
                        </td>

                        <td className="py-4 px-4">
                          <Badge variant={u.status === 'Aktif' ? 'success' : 'default'}>
                            {u.status}
                          </Badge>
                        </td>

                        <td className="py-4 px-4 text-xs text-slate-500">
                          {formatTanggalIndo(u.created_at)}
                        </td>

                        <td className="py-4 px-4 sm:px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(u)}
                              className="rounded-lg p-1.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                              title="Edit Akun"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              disabled={isSelf}
                              onClick={() => handleDeletePrompt(u)}
                              className={`rounded-lg p-1.5 transition-colors ${
                                isSelf
                                  ? 'text-slate-300 cursor-not-allowed'
                                  : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                              }`}
                              title={isSelf ? 'Tidak bisa menghapus akun sendiri' : 'Hapus Akun'}
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

      {/* Modal Tambah / Edit User */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => !submitting && setIsFormOpen(false)}
        title={isEditMode ? 'Edit Akun Pengguna' : 'Tambah Akun Baru'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmitForm} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Nama Lengkap <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.nama}
              onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
              placeholder="Contoh: Budi Santoso"
              className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Username <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="budisantoso"
                className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="budi@example.com"
                className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Password {isEditMode ? '(Kosongkan jika tidak ingin diubah)' : <span className="text-rose-500">*</span>}
            </label>
            <input
              type="password"
              required={!isEditMode}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder={isEditMode ? '••••••••' : 'Minimal 5 karakter'}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Role Akses
              </label>
              <AppSelect
                value={formData.role}
                onChange={(val) => setFormData({ ...formData, role: val || 'mandor' })}
                options={[
                  { value: 'admin', label: 'Admin (Akses Penuh)' },
                  { value: 'mandor', label: 'Mandor Lapangan' },
                  { value: 'pemilik', label: 'Pemilik Lahan' },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Status Akun
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
              {isEditMode ? 'Simpan Perubahan' : 'Buat Akun'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        isLoading={deleteDialog.loading}
        title="Hapus Akun Pengguna"
        message={`Apakah Anda yakin ingin menghapus akun "${deleteDialog.item?.nama}" (@${deleteDialog.item?.username})? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Ya, Hapus Akun"
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteDialog({ isOpen: false, item: null, loading: false })}
      />
    </div>
  );
}
