import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Sprout,
  Shovel,
  CalendarCheck2,
  Users,
  FileBarChart2,
  ListChecks,
  UserCog,
  X,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function Sidebar({ isOpen, onClose }) {
  const { user, isAdmin } = useAuth();

  const menuItems = [
    {
      path: '/',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      path: '/pekerjaan',
      label: 'Kerja Lahan',
      icon: Shovel,
      badge: 'Utama',
    },
    {
      path: '/lahan',
      label: 'Tempat Lahan',
      icon: Sprout,
      badge: null,
    },
    {
      path: '/absensi',
      label: 'Absensi Pekerja',
      icon: CalendarCheck2,
      badge: 'Mandor',
    },
    {
      path: '/pekerja',
      label: 'Data Pekerja',
      icon: Users,
      badge: null,
    },
    {
      path: '/jenis-pekerjaan',
      label: 'Jenis Pekerjaan',
      icon: ListChecks,
      badge: null,
    },
    {
      path: '/laporan',
      label: 'Rekap & Laporan',
      icon: FileBarChart2,
      badge: null,
    },
  ];

  // Admin exclusive menu
  if (isAdmin) {
    menuItems.push({
      path: '/users',
      label: 'Kelola Akun',
      icon: UserCog,
      badge: 'Admin',
    });
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 text-white shadow-md shadow-brand-500/30">
              <Sprout className="h-6 w-6 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="font-extrabold text-base tracking-tight text-white leading-tight">
                RekapTani
              </h1>
              <p className="text-[11px] font-medium text-brand-300">
                Kerja Lahan & Absensi
              </p>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5">
          <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Menu Operasional
          </div>

          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => {
                  if (window.innerWidth < 1024) onClose();
                }}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`h-5 w-5 transition-transform duration-200 group-hover:scale-110 ${
                          isActive ? 'text-white' : 'text-slate-400 group-hover:text-brand-400'
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-brand-700 text-brand-100'
                            : 'bg-slate-800 text-brand-300 border border-brand-500/20'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Bottom Card / System Status */}
        <div className="p-4 border-t border-slate-800/80">
          <div className="rounded-xl bg-slate-800/60 p-3 border border-slate-700/60">
            <div className="flex items-center gap-2 mb-1 text-xs font-semibold text-brand-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Login: @{user?.username || 'user'}</span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              {user?.nama || 'Petugas'} ({user?.role?.toUpperCase() || 'USER'})
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
