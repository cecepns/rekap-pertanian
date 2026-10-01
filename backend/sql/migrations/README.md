# 🗄️ Database Migrations - Rekap Pertanian

Folder ini berisi daftar file migrasi skema database SQL secara berurutan (*version-controlled migrations*).

---

## 📋 Daftar File Migrasi

| No | File | Deskripsi | Tanggal |
|---|---|---|---|
| 001 | `001_add_status_pembayaran_and_tanggal_bayar_to_absensi_pekerja.sql` | Penambahan kolom `status_pembayaran`, `tanggal_bayar`, dan indeks `idx_absensi_bayar` pada tabel `absensi_pekerja` untuk fitur pelacakan upah pekerja sudah dibayarkan. | 2026-10-01 |

---

## 🚀 Cara Menjalankan Migrasi Manual

### Menggunakan Terminal / MySQL CLI:
```bash
mysql -u root -p rekap_pertanian_db < backend/sql/migrations/001_add_status_pembayaran_and_tanggal_bayar_to_absensi_pekerja.sql
```

### Menggunakan GUI (phpMyAdmin / TablePlus / DBeaver / MySQL Workbench):
1. Buka koneksi database `rekap_pertanian_db`.
2. Buka tab **SQL Query**.
3. Buka file `.sql` migrasi yang ingin dijalankan.
4. Klik **Execute / Run**.

---

## ⚡ Auto-Migration di Server
Backend `server.js` juga telah dilengkapi dengan deteksi otomatis kolom saat pertama kali server dijalankan (`SHOW COLUMNS FROM absensi_pekerja LIKE 'status_pembayaran'`), sehingga server dapat melakukan migrasi *in-place* secara aman tanpa menyebabkan error jika kolom sudah ada.
