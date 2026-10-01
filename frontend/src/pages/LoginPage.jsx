import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import logoImg from '@/assets/logo.png';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      toast.error('Username dan password wajib diisi');
      return;
    }

    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate('/');
    } catch (err) {
      toast.error(err.message || 'Login gagal, periksa username dan password Anda');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-8 relative overflow-hidden">
      {/* Background glowing effects */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-brand-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo & Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-2 rounded-2xl bg-white/5 border border-white/10 shadow-xl shadow-brand-500/10 mb-4 backdrop-blur-sm">
            <img
              src={logoImg}
              alt="Logo Rekap Pertanian"
              className="h-16 w-16 sm:h-20 sm:w-20 object-contain drop-shadow-md rounded-xl"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            RekapTani
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Sistem Informasi Rekap Pertanian & Absensi Pekerja
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-3xl border border-slate-800 bg-slate-800/80 backdrop-blur-xl p-6 sm:p-8 shadow-2xl">
          <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-brand-400" />
            Masuk ke Aplikasi
          </h2>
          <p className="text-xs text-slate-400 mb-6">
            Masukkan akun Anda untuk mengelola rekapan lahan dan pekerja
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Username / Email
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username Anda"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/90 py-2.5 pl-10 pr-3.5 text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Kata Sandi (Password)
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/90 py-2.5 pl-10 pr-10 text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-bold text-white shadow-lg shadow-brand-600/30 hover:bg-brand-500 transition-colors disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Masuk Sekarang
            </button>
          </form>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-500 mt-6">
          &copy; {new Date().getFullYear()} RekapTani • Platform Kerja Lahan Pertanian
        </p>
      </div>
    </div>
  );
}
