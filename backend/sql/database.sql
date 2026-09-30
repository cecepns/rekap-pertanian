-- Database Rekap Hasil & Kerja Pertanian
-- Charset: utf8mb4

CREATE DATABASE IF NOT EXISTS `rekap_pertanian_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `rekap_pertanian_db`;

-- 1. Tabel Master Lahan
CREATE TABLE IF NOT EXISTS `lahan` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nama_lahan` VARCHAR(150) NOT NULL,
  `lokasi` VARCHAR(255) DEFAULT NULL,
  `luas_lahan` VARCHAR(100) DEFAULT NULL,
  `komoditas` VARCHAR(100) DEFAULT NULL,
  `status` ENUM('Aktif', 'Istirahat', 'Selesai Panen') NOT NULL DEFAULT 'Aktif',
  `keterangan` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_lahan_nama` (`nama_lahan`),
  INDEX `idx_lahan_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabel Rekapan Pekerjaan Lahan
CREATE TABLE IF NOT EXISTS `pekerjaan_lahan` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `lahan_id` INT NOT NULL,
  `tanggal` DATE NOT NULL,
  `jenis_pekerjaan` VARCHAR(150) NOT NULL,
  `biaya` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `foto` VARCHAR(255) DEFAULT NULL,
  `keterangan` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_pekerjaan_lahan_id` (`lahan_id`),
  INDEX `idx_pekerjaan_tanggal` (`tanggal`),
  INDEX `idx_pekerjaan_jenis` (`jenis_pekerjaan`),
  CONSTRAINT `fk_pekerjaan_lahan` FOREIGN KEY (`lahan_id`) REFERENCES `lahan` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabel Master Pekerja
CREATE TABLE IF NOT EXISTS `pekerja` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nama` VARCHAR(150) NOT NULL,
  `no_hp` VARCHAR(50) DEFAULT NULL,
  `jabatan` VARCHAR(100) NOT NULL DEFAULT 'Pekerja Harian',
  `upah_harian_standar` DECIMAL(14, 2) NOT NULL DEFAULT 100000.00,
  `status` ENUM('Aktif', 'Nonaktif') NOT NULL DEFAULT 'Aktif',
  `alamat` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_pekerja_nama` (`nama`),
  INDEX `idx_pekerja_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabel Absensi Pekerja
CREATE TABLE IF NOT EXISTS `absensi_pekerja` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `pekerja_id` INT NOT NULL,
  `lahan_id` INT DEFAULT NULL,
  `tanggal` DATE NOT NULL,
  `status_kehadiran` ENUM('Hadir', 'Setengah Hari', 'Izin', 'Sakit', 'Alpa') NOT NULL DEFAULT 'Hadir',
  `upah_dibayarkan` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `keterangan` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_absensi_pekerja_id` (`pekerja_id`),
  INDEX `idx_absensi_lahan_id` (`lahan_id`),
  INDEX `idx_absensi_tanggal` (`tanggal`),
  INDEX `idx_absensi_status` (`status_kehadiran`),
  UNIQUE KEY `unique_absensi_hari` (`pekerja_id`, `tanggal`),
  CONSTRAINT `fk_absensi_pekerja` FOREIGN KEY (`pekerja_id`) REFERENCES `pekerja` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_absensi_lahan` FOREIGN KEY (`lahan_id`) REFERENCES `lahan` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tabel Master Jenis Pekerjaan
CREATE TABLE IF NOT EXISTS `jenis_pekerjaan` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nama_jenis` VARCHAR(150) NOT NULL UNIQUE,
  `kategori` VARCHAR(100) DEFAULT 'Umum',
  `keterangan` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_jenis_pekerjaan_nama` (`nama_jenis`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Tabel Manajemen Users & Login
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nama` VARCHAR(150) NOT NULL,
  `username` VARCHAR(100) NOT NULL UNIQUE,
  `email` VARCHAR(150) DEFAULT NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('admin', 'mandor', 'pemilik') NOT NULL DEFAULT 'admin',
  `status` ENUM('Aktif', 'Nonaktif') NOT NULL DEFAULT 'Aktif',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_username` (`username`),
  INDEX `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sample Users (passwords: admin123, mandor123, pemilik123)
INSERT IGNORE INTO `users` (`id`, `nama`, `username`, `email`, `password`, `role`, `status`) VALUES
(1, 'Administrator Pertanian', 'admin', 'admin@rekaptani.com', '$2b$10$HNDNGw0pqlx6SNOjEQpo1O48LVffzKuclo449/Lx4lWRIUB7j.aG.', 'admin', 'Aktif'),
(2, 'Pak Sukardi (Mandor)', 'mandor', 'sukardi@rekaptani.com', '$2b$10$DFQDHFkR7seVW8CzQNggvO0bjQfeYU504FLEw6WiX4KjR9/hlHJi2', 'mandor', 'Aktif'),
(3, 'Haji Ahmad (Pemilik Lahan)', 'pemilik', 'ahmad@rekaptani.com', '$2b$10$RQDm/zgRRJiZAiru.lA1HeON0OhLPJu6qI6IMqWPf9NBn6E4fpVhS', 'pemilik', 'Aktif');

-- Sample Master Jenis Pekerjaan
INSERT IGNORE INTO `jenis_pekerjaan` (`nama_jenis`, `kategori`, `keterangan`) VALUES
('Pengolahan Tanah / Bajak', 'Pengolahan Lahan', 'Pembajakan, singkal, rotary, dan perataan tanah.'),
('Pembuatan Bedengan & Mulsa', 'Pengolahan Lahan', 'Pembuatan guludan/bedeng dan pemasangan plastik mulsa.'),
('Penyemaian Bibit', 'Pembibitan & Tanam', 'Persemaian benih di baki semai atau polybag.'),
('Penanaman Bibit (Tandur)', 'Pembibitan & Tanam', 'Penanaman bibit ke areal lahan siap tanam.'),
('Penyiangan Gulma / Babat Rumput', 'Pemeliharaan', 'Pembersihan gulma liar secara manual maupun mesin babat rumput.'),
('Pemupukan Susulan I', 'Pemupukan & Nutrisi', 'Aplikasi pupuk dasar/susulan pertama (NPK/Urea).'),
('Pemupukan Susulan II', 'Pemupukan & Nutrisi', 'Aplikasi pupuk fase generatif atau pembuahan.'),
('Penyemprotan Hama & Pestisida', 'Pengendalian Hama', 'Penyemprotan insektisida, fungisida, atau herbisida preventif.'),
('Penyiraman & Pengairan (Irigasi)', 'Pemeliharaan', 'Pengairan lahan, pengaturan pintu air, dan pompa sumur dangkal.'),
('Pemangkasan / Pewiwitan', 'Pemeliharaan', 'Pembuangan tunas air / daun tua yang tidak produktif.'),
('Pemasangan Ajir / Bambu Penyangga', 'Konstruksi Tanaman', 'Pemasangan tiang pancang bambu untuk tanaman merambat.'),
('Panen', 'Pemanenan & Pasca Panen', 'Pemetikan hasil pertanian matang petik.'),
('Pembersihan Lahan Pasca Panen', 'Pemanenan & Pasca Panen', 'Pembersihan sisa tanaman dan persiapan musim tanam berikutnya.');

-- Sample Data: Lahan
INSERT INTO `lahan` (`id`, `nama_lahan`, `lokasi`, `luas_lahan`, `komoditas`, `status`, `keterangan`) VALUES
(1, 'Lahan Blok A - Jagung Manis', 'Blok Timur Desa Mekarsari', '1.2 Hektar', 'Jagung Manis Bonanza', 'Aktif', 'Kondisi tanah gembur, dekat saluran irigasi primer.'),
(2, 'Lahan Sawah Lebak - Padi Ciherang', 'Kecamatan Ciawi Hulu', '2.5 Hektar', 'Padi Ciherang', 'Aktif', 'Sawah irigasi teknis, masa vegetatif 35 HST.'),
(3, 'Lahan Kebun Lereng - Cabai Rawit', 'Perbukitan Sukamaju', '8.000 m²', 'Cabai Rawit Merah', 'Aktif', 'Pakai sistem mulsa plastik hitam perak.'),
(4, 'Lahan Blok D - Bawang Merah', 'Dusun Sukaharja RT 03', '5.000 m²', 'Bawang Merah Bima Brebes', 'Istirahat', 'Sedang proses pengistirahatan dan pengapuran tanah (dolomit).');

-- Sample Data: Pekerja
INSERT INTO `pekerja` (`id`, `nama`, `no_hp`, `jabatan`, `upah_harian_standar`, `status`, `alamat`) VALUES
(1, 'Pak Sukardi', '081234567801', 'Mandor Lapangan', 150000.00, 'Aktif', 'Kp. Cijati RT 01/02'),
(2, 'Kang Asep Saepuloh', '081234567802', 'Operator Traktor', 130000.00, 'Aktif', 'Desa Mekarsari No. 14'),
(3, 'Pak Dedi Mulyadi', '081234567803', 'Pekerja Harian', 100000.00, 'Aktif', 'Kp. Babakan RT 04/01'),
(4, 'Bu Siti Rohayah', '081234567804', 'Tenaga Tanam & Panen', 90000.00, 'Aktif', 'Kp. Lembur Tengah'),
(5, 'Pak Ujang Rustandi', '081234567805', 'Pekerja Harian', 100000.00, 'Aktif', 'Kp. Sukamaju RT 02/05'),
(6, 'Bu Warsiti', '081234567806', 'Tenaga Tanam & Panen', 90000.00, 'Aktif', 'Kp. Pasir Gede');

-- Sample Data: Pekerjaan Lahan
INSERT INTO `pekerjaan_lahan` (`lahan_id`, `tanggal`, `jenis_pekerjaan`, `biaya`, `foto`, `keterangan`) VALUES
(1, '2026-09-20', 'Pengolahan Tanah / Bajak', 750000.00, NULL, 'Pembajakan tanah menggunakan traktor mini rotari 2 kali putaran.'),
(1, '2026-09-22', 'Pembuatan Bedengan & Mulsa', 500000.00, NULL, 'Pembuatan bedengan tinggi 30cm dan tabur pupuk dasar kandang 20 karung.'),
(1, '2026-09-25', 'Penanaman Bibit', 450000.00, NULL, 'Penanaman bibit jagung manis jarak tanam 70x20 cm.'),
(2, '2026-09-15', 'Pengolahan Lahan Sawah & Garu', 900000.00, NULL, 'Membajak sawah lebak dan perataan lumpur siap tanam.'),
(2, '2026-09-18', 'Tanam Padi (Tandur)', 800000.00, NULL, 'Sistem jajar legowo 2:1 oleh tim buruh tandur.'),
(2, '2026-09-27', 'Pemupukan Pertama (Urea + Phonska)', 650000.00, NULL, 'Pemupukan susulan I dosis 150kg/ha.'),
(3, '2026-09-24', 'Pemasangan Mulsa & Ajir Bambu', 600000.00, NULL, 'Pemasangan 1.200 batang ajir bambu untuk tanaman cabai.'),
(3, '2026-09-28', 'Penyemprotan Hama & Fungisida', 350000.00, NULL, 'Pencegahan hama thrips dan kutu kebul serta layu fusarium.');

-- Sample Data: Absensi Pekerja
INSERT INTO `absensi_pekerja` (`pekerja_id`, `lahan_id`, `tanggal`, `status_kehadiran`, `upah_dibayarkan`, `keterangan`) VALUES
(1, 1, '2026-09-25', 'Hadir', 150000.00, 'Memimpin tim penanaman jagung'),
(2, 1, '2026-09-25', 'Hadir', 130000.00, 'Membantu distribusi bibit dan logistik'),
(3, 1, '2026-09-25', 'Hadir', 100000.00, 'Menanam bibit bedeng 1-10'),
(4, 1, '2026-09-25', 'Hadir', 90000.00, 'Menanam bibit bedeng 11-20'),
(5, 1, '2026-09-25', 'Setengah Hari', 50000.00, 'Pulang pukul 11:30 urusan keluarga'),
(6, 1, '2026-09-25', 'Hadir', 90000.00, 'Penyiraman awal setelah tanam'),

(1, 2, '2026-09-27', 'Hadir', 150000.00, 'Pengawasan pemupukan sawah lebak'),
(2, 2, '2026-09-27', 'Izin', 0.00, 'Izin servis traktor'),
(3, 2, '2026-09-27', 'Hadir', 100000.00, 'Aplikasi pupuk urea dan NPK'),
(4, 2, '2026-09-27', 'Hadir', 90000.00, 'Pembersihan pematang sawah'),
(5, 2, '2026-09-27', 'Hadir', 100000.00, 'Perbaikan saluran air masuk');
