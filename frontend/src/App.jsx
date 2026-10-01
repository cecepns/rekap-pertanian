import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import Layout from '@/components/layout/Layout';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import LahanPage from '@/pages/LahanPage';
import PekerjaanLahanPage from '@/pages/PekerjaanLahanPage';
import PekerjaPage from '@/pages/PekerjaPage';
import AbsensiPage from '@/pages/AbsensiPage';
import JenisPekerjaanPage from '@/pages/JenisPekerjaanPage';
import UsersPage from '@/pages/UsersPage';
import LaporanRekapPage from '@/pages/LaporanRekapPage';
import UpahPekerjaPage from '@/pages/UpahPekerjaPage';

function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
        <Loader2 className="h-10 w-10 animate-spin text-brand-400 mb-3" />
        <p className="text-sm font-semibold text-slate-300">Memverifikasi sesi login...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          {/* Toast Notification Container */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3500,
              style: {
                background: '#1e293b',
                color: '#fff',
                fontSize: '13px',
                borderRadius: '12px',
                padding: '12px 16px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
              },
              success: {
                iconTheme: {
                  primary: '#22c55e',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#f43f5e',
                  secondary: '#fff',
                },
              },
            }}
          />

          <Routes>
            {/* Public Auth Route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Routes inside Layout */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="pekerjaan" element={<PekerjaanLahanPage />} />
              <Route path="lahan" element={<LahanPage />} />
              <Route path="absensi" element={<AbsensiPage />} />
              <Route path="upah-pekerja" element={<UpahPekerjaPage />} />
              <Route path="pekerja" element={<PekerjaPage />} />
              <Route path="jenis-pekerjaan" element={<JenisPekerjaanPage />} />
              <Route
                path="users"
                element={
                  <ProtectedRoute adminOnly>
                    <UsersPage />
                  </ProtectedRoute>
                }
              />
              <Route path="laporan" element={<LaporanRekapPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
