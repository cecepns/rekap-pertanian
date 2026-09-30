import React, { useState } from 'react';
import { Menu, Plus, CalendarCheck, Shovel, LogOut, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import ConfirmDialog from '@/components/common/ConfirmDialog';

export default function Navbar({ onToggleSidebar }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return 'Dashboard Pertanian';
      case '/pekerjaan':
        return 'Rekapan Kerja Lahan';
      case '/lahan':
        return 'Kelola Tempat Lahan';
      case '/absensi':
        return 'Absensi Pekerja Lapangan';
      case '/pekerja':
        return 'Daftar Tenaga Kerja';
      case '/jenis-pekerjaan':
        return 'Master Jenis Pekerjaan';
      case '/users':
        return 'Manajemen Akun & Role';
      case '/laporan':
        return 'Rekapitulasi & Laporan';
      default:
        return 'Rekap Pertanian';
    }
  };

  const handleConfirmLogout = () => {
    setLogoutDialogOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 sm:px-6 backdrop-blur-md shadow-sm">
        {/* Left: Mobile Toggle & Page Title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 lg:hidden focus:outline-none transition-colors"
            aria-label="Buka menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
              {getPageTitle()}
            </h2>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Pencatatan aktivitas lahan & upah pekerja
            </p>
          </div>
        </div>

        {/* Right: Quick Action Buttons, User Info & Logout */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => navigate('/pekerjaan?action=create')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition-colors"
          >
            <Shovel className="h-4 w-4" />
            <span className="hidden xs:inline">+ Kerja Lahan</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/absensi?action=create')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
          >
            <CalendarCheck className="h-4 w-4 text-brand-600" />
            <span className="hidden sm:inline">+ Absen</span>
          </button>

          {/* User Profile Pill */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100 text-brand-700 font-bold text-sm">
              {user?.nama ? user.nama.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-bold text-slate-800 leading-none truncate max-w-[120px]">
                {user?.nama || 'Petugas'}
              </p>
              <p className="text-[10px] text-emerald-600 font-medium uppercase mt-0.5">
                ● {user?.role || 'user'}
              </p>
            </div>

            {/* Logout button */}
            <button
              type="button"
              onClick={() => setLogoutDialogOpen(true)}
              className="ml-1 rounded-xl p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Keluar dari Akun"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Logout Confirm Dialog */}
      <ConfirmDialog
        isOpen={logoutDialogOpen}
        title="Konfirmasi Keluar"
        message="Apakah Anda yakin ingin keluar dari akun ini?"
        confirmText="Ya, Keluar"
        variant="warning"
        onConfirm={handleConfirmLogout}
        onClose={() => setLogoutDialogOpen(false)}
      />
    </>
  );
}
