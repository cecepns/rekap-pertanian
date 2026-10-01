-- ==============================================================================
-- Migration: 001_add_status_pembayaran_and_tanggal_bayar_to_absensi_pekerja.sql
-- Description: Menambahkan kolom status_pembayaran, tanggal_bayar, dan indeks 
--              pada tabel absensi_pekerja untuk melacak upah pekerja yang sudah 
--              dibayarkan vs belum dibayarkan.
-- Date: 2026-10-01
-- ==============================================================================

USE `rekap_pertanian_db`;

-- ------------------------------------------------------------------------------
-- 1. UP MIGRATION
-- ------------------------------------------------------------------------------

-- Tambah kolom status_pembayaran dan tanggal_bayar jika belum ada
ALTER TABLE `absensi_pekerja`
  ADD COLUMN IF NOT EXISTS `status_pembayaran` ENUM('Sudah Dibayar', 'Belum Dibayar') NOT NULL DEFAULT 'Sudah Dibayar' AFTER `upah_dibayarkan`,
  ADD COLUMN IF NOT EXISTS `tanggal_bayar` DATE NULL AFTER `status_pembayaran`;

-- Tambahkan index untuk mempercepat filter dan reporting query status pembayaran
SET @index_exists := (
  SELECT COUNT(1) 
  FROM information_schema.statistics 
  WHERE table_schema = DATABASE() 
    AND table_name = 'absensi_pekerja' 
    AND index_name = 'idx_absensi_bayar'
);

SET @sql := IF(@index_exists = 0, 'ALTER TABLE `absensi_pekerja` ADD INDEX `idx_absensi_bayar` (`status_pembayaran`)', 'SELECT "Index idx_absensi_bayar already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Backfill data lama: Set tanggal_bayar = tanggal untuk data kehadiran yang berstatus 'Sudah Dibayar'
UPDATE `absensi_pekerja`
SET `tanggal_bayar` = `tanggal`
WHERE `status_pembayaran` = 'Sudah Dibayar' 
  AND `tanggal_bayar` IS NULL 
  AND `upah_dibayarkan` > 0;

-- ------------------------------------------------------------------------------
-- 2. DOWN MIGRATION (Rollback - Opsional jika ingin mengembalikan ke versi awal)
-- ------------------------------------------------------------------------------
-- UNTUK ROLLBACK, JALANKAN PERINTAH BERIKUT:
-- ALTER TABLE `absensi_pekerja` DROP INDEX `idx_absensi_bayar`;
-- ALTER TABLE `absensi_pekerja` DROP COLUMN `tanggal_bayar`;
-- ALTER TABLE `absensi_pekerja` DROP COLUMN `status_pembayaran`;
