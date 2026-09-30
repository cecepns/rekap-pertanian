const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'rekap_pertanian_secret_key_2026';

// Upload directory configuration
const UPLOAD_DIR_NAME = 'uploads-rekap-pertanian';
const UPLOAD_DIR = path.join(__dirname, UPLOAD_DIR_NAME);

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 30);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, `${cleanBase}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Format file harus berupa JPG, PNG, atau WEBP'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB guard, frontend compresses to <= 500KB
  fileFilter,
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving for uploads
app.use(`/${UPLOAD_DIR_NAME}`, express.static(UPLOAD_DIR));
app.use('/uploads', express.static(UPLOAD_DIR));

// MySQL Connection Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'rekap_pertanian_db',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+07:00',
});

// Test Database Connection
pool.getConnection()
  .then((conn) => {
    console.log('✅ Terhubung ke database MySQL:', process.env.DB_NAME || 'rekap_pertanian_db');
    conn.release();
  })
  .catch((err) => {
    console.error('❌ Gagal koneksi ke database MySQL:', err.message);
  });

// ==========================================
// 1. HEALTHCHECK & DASHBOARD STATS
// ==========================================
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'API Rekap Pertanian siap melayani' });
});

app.get('/api/dashboard/stats', async (req, res) => {
  try {
    // 1. Total Lahan & Status
    const [[{ total_lahan }]] = await pool.query('SELECT COUNT(*) AS total_lahan FROM lahan');
    const [[{ lahan_aktif }]] = await pool.query("SELECT COUNT(*) AS lahan_aktif FROM lahan WHERE status = 'Aktif'");

    // 2. Total Pekerjaan & Total Biaya
    const [[{ total_pekerjaan, total_biaya_kerja }]] = await pool.query(
      'SELECT COUNT(*) AS total_pekerjaan, COALESCE(SUM(biaya), 0) AS total_biaya_kerja FROM pekerjaan_lahan'
    );

    // 3. Total Pekerja
    const [[{ total_pekerja, pekerja_aktif }]] = await pool.query(
      "SELECT COUNT(*) AS total_pekerja, SUM(CASE WHEN status = 'Aktif' THEN 1 ELSE 0 END) AS pekerja_aktif FROM pekerja"
    );

    // 4. Total Biaya Upah Absensi
    const [[{ total_absensi, total_upah_absensi }]] = await pool.query(
      'SELECT COUNT(*) AS total_absensi, COALESCE(SUM(upah_dibayarkan), 0) AS total_upah_absensi FROM absensi_pekerja'
    );

    // 5. Total Pengeluaran Keseluruhan (Pekerjaan Lahan + Upah Absensi)
    const total_pengeluaran = Number(total_biaya_kerja) + Number(total_upah_absensi);

    // 6. Breakdown Biaya per Lahan (Top 5)
    const [biayaPerLahan] = await pool.query(`
      SELECT 
        l.id,
        l.nama_lahan,
        l.komoditas,
        COALESCE(SUM(p.biaya), 0) AS total_biaya_lahan,
        COUNT(p.id) AS jumlah_pekerjaan
      FROM lahan l
      LEFT JOIN pekerjaan_lahan p ON l.id = p.lahan_id
      GROUP BY l.id, l.nama_lahan, l.komoditas
      ORDER BY total_biaya_lahan DESC
    `);

    // 7. Breakdown Jenis Pekerjaan Terbanyak
    const [jenisPekerjaanStats] = await pool.query(`
      SELECT 
        jenis_pekerjaan,
        COUNT(*) AS total_kegiatan,
        COALESCE(SUM(biaya), 0) AS total_biaya
      FROM pekerjaan_lahan
      GROUP BY jenis_pekerjaan
      ORDER BY total_biaya DESC
      LIMIT 6
    `);

    // 8. Pekerjaan Lahan Terbaru (5 terakhir)
    const [recentPekerjaan] = await pool.query(`
      SELECT 
        p.id,
        p.lahan_id,
        DATE_FORMAT(p.tanggal, '%Y-%m-%d') AS tanggal,
        p.jenis_pekerjaan,
        p.biaya,
        p.foto,
        p.keterangan,
        p.created_at,
        p.updated_at,
        l.nama_lahan
      FROM pekerjaan_lahan p
      JOIN lahan l ON p.lahan_id = l.id
      ORDER BY p.tanggal DESC, p.id DESC
      LIMIT 5
    `);

    // 9. Absensi Hari Ini
    const today = new Date().toISOString().split('T')[0];
    const [absensiHariIni] = await pool.query(`
      SELECT 
        a.id,
        a.pekerja_id,
        a.lahan_id,
        DATE_FORMAT(a.tanggal, '%Y-%m-%d') AS tanggal,
        a.status_kehadiran,
        a.upah_dibayarkan,
        a.keterangan,
        a.created_at,
        pk.nama AS nama_pekerja,
        pk.jabatan,
        COALESCE(l.nama_lahan, '-') AS nama_lahan
      FROM absensi_pekerja a
      JOIN pekerja pk ON a.pekerja_id = pk.id
      LEFT JOIN lahan l ON a.lahan_id = l.id
      WHERE a.tanggal = ?
      ORDER BY a.id DESC
    `, [today]);

    res.json({
      success: true,
      data: {
        total_lahan: Number(total_lahan),
        lahan_aktif: Number(lahan_aktif),
        total_pekerjaan: Number(total_pekerjaan),
        total_biaya_kerja: Number(total_biaya_kerja),
        total_pekerja: Number(total_pekerja),
        pekerja_aktif: Number(pekerja_aktif || 0),
        total_absensi: Number(total_absensi),
        total_upah_absensi: Number(total_upah_absensi),
        total_pengeluaran,
        biaya_per_lahan: biayaPerLahan,
        jenis_pekerjaan_stats: jenisPekerjaanStats,
        recent_pekerjaan: recentPekerjaan,
        absensi_hari_ini: absensiHariIni,
      },
    });
  } catch (error) {
    console.error('Error dashboard stats:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil data dashboard: ' + error.message });
  }
});

// ==========================================
// 2. MASTER LAHAN
// ==========================================

// GET /api/lahan/all (simple dropdown)
app.get('/api/lahan/all', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, nama_lahan, lokasi, luas_lahan, komoditas, status FROM lahan ORDER BY nama_lahan ASC');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/lahan (with pagination, search, filter status)
app.get('/api/lahan', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.max(1, parseInt(req.query.limit || '10', 10));
    const offset = (page - 1) * limit;
    const search = (req.query.search || '').trim();
    const status = (req.query.status || '').trim();

    const whereClauses = [];
    const params = [];

    if (search) {
      whereClauses.push('(l.nama_lahan LIKE ? OR l.lokasi LIKE ? OR l.komoditas LIKE ? OR l.keterangan LIKE ?)');
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    if (status) {
      whereClauses.push('l.status = ?');
      params.push(status);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Count Total
    const countSql = `SELECT COUNT(*) AS total FROM lahan l ${whereSql}`;
    const [[{ total }]] = await pool.query(countSql, params);

    // Fetch data with subtotal stats
    const dataSql = `
      SELECT 
        l.*,
        COUNT(DISTINCT p.id) AS total_pekerjaan,
        COALESCE(SUM(p.biaya), 0) AS total_biaya_lahan,
        COUNT(DISTINCT a.id) AS total_absensi_lahan
      FROM lahan l
      LEFT JOIN pekerjaan_lahan p ON l.id = p.lahan_id
      LEFT JOIN absensi_pekerja a ON l.id = a.lahan_id
      ${whereSql}
      GROUP BY l.id
      ORDER BY l.id DESC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.query(dataSql, [...params, limit, offset]);

    res.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error('Error list lahan:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/lahan/:id
app.get('/api/lahan/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(`
      SELECT 
        l.*,
        COUNT(DISTINCT p.id) AS total_pekerjaan,
        COALESCE(SUM(p.biaya), 0) AS total_biaya_lahan
      FROM lahan l
      LEFT JOIN pekerjaan_lahan p ON l.id = p.lahan_id
      WHERE l.id = ?
      GROUP BY l.id
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Lahan tidak ditemukan' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/lahan
app.post('/api/lahan', async (req, res) => {
  try {
    const { nama_lahan, lokasi, luas_lahan, komoditas, status, keterangan } = req.body;

    if (!nama_lahan || !nama_lahan.trim()) {
      return res.status(400).json({ success: false, message: 'Nama tempat/lahan wajib diisi' });
    }

    const [result] = await pool.query(
      `INSERT INTO lahan (nama_lahan, lokasi, luas_lahan, komoditas, status, keterangan) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        nama_lahan.trim(),
        lokasi?.trim() || null,
        luas_lahan?.trim() || null,
        komoditas?.trim() || null,
        status || 'Aktif',
        keterangan?.trim() || null,
      ]
    );

    const [created] = await pool.query('SELECT * FROM lahan WHERE id = ?', [result.insertId]);
    res.status(201).json({
      success: true,
      message: 'Data lahan berhasil ditambahkan',
      data: created[0],
    });
  } catch (error) {
    console.error('Error create lahan:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/lahan/:id
app.put('/api/lahan/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_lahan, lokasi, luas_lahan, komoditas, status, keterangan } = req.body;

    if (!nama_lahan || !nama_lahan.trim()) {
      return res.status(400).json({ success: false, message: 'Nama tempat/lahan wajib diisi' });
    }

    const [check] = await pool.query('SELECT id FROM lahan WHERE id = ?', [id]);
    if (check.length === 0) {
      return res.status(404).json({ success: false, message: 'Data lahan tidak ditemukan' });
    }

    await pool.query(
      `UPDATE lahan SET 
        nama_lahan = ?, 
        lokasi = ?, 
        luas_lahan = ?, 
        komoditas = ?, 
        status = ?, 
        keterangan = ?
       WHERE id = ?`,
      [
        nama_lahan.trim(),
        lokasi?.trim() || null,
        luas_lahan?.trim() || null,
        komoditas?.trim() || null,
        status || 'Aktif',
        keterangan?.trim() || null,
        id,
      ]
    );

    const [updated] = await pool.query('SELECT * FROM lahan WHERE id = ?', [id]);
    res.json({
      success: true,
      message: 'Data lahan berhasil diperbarui',
      data: updated[0],
    });
  } catch (error) {
    console.error('Error update lahan:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/lahan/:id
app.delete('/api/lahan/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [check] = await pool.query('SELECT id, nama_lahan FROM lahan WHERE id = ?', [id]);
    if (check.length === 0) {
      return res.status(404).json({ success: false, message: 'Data lahan tidak ditemukan' });
    }

    // Check associated data
    const [[{ count: workCount }]] = await pool.query('SELECT COUNT(*) AS count FROM pekerjaan_lahan WHERE lahan_id = ?', [id]);
    if (workCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Lahan tidak dapat dihapus karena memiliki ${workCount} catatan pekerjaan lahan. Hapus data pekerjaan terkait terlebih dahulu.`,
      });
    }

    await pool.query('DELETE FROM lahan WHERE id = ?', [id]);
    res.json({ success: true, message: `Lahan "${check[0].nama_lahan}" berhasil dihapus` });
  } catch (error) {
    console.error('Error delete lahan:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 3. REKAPAN KERJA LAHAN (PEKERJAAN LAHAN)
// ==========================================

// GET /api/pekerjaan (pagination, search, filters)
app.get('/api/pekerjaan', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.max(1, parseInt(req.query.limit || '10', 10));
    const offset = (page - 1) * limit;
    const search = (req.query.search || '').trim();
    const lahan_id = req.query.lahan_id ? parseInt(req.query.lahan_id, 10) : null;
    const jenis = (req.query.jenis_pekerjaan || '').trim();
    const startDate = (req.query.startDate || '').trim();
    const endDate = (req.query.endDate || '').trim();

    const whereClauses = [];
    const params = [];

    if (search) {
      whereClauses.push('(p.jenis_pekerjaan LIKE ? OR p.keterangan LIKE ? OR l.nama_lahan LIKE ?)');
      const sp = `%${search}%`;
      params.push(sp, sp, sp);
    }

    if (lahan_id) {
      whereClauses.push('p.lahan_id = ?');
      params.push(lahan_id);
    }

    if (jenis) {
      whereClauses.push('p.jenis_pekerjaan = ?');
      params.push(jenis);
    }

    if (startDate) {
      whereClauses.push('p.tanggal >= ?');
      params.push(startDate);
    }

    if (endDate) {
      whereClauses.push('p.tanggal <= ?');
      params.push(endDate);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Total Count & Total Biaya Sum
    const [[countResult]] = await pool.query(
      `SELECT COUNT(*) AS total, COALESCE(SUM(p.biaya), 0) AS total_biaya_filtered 
       FROM pekerjaan_lahan p
       JOIN lahan l ON p.lahan_id = l.id
       ${whereSql}`,
      params
    );

    const total = Number(countResult.total);
    const total_biaya = Number(countResult.total_biaya_filtered);

    // List Data
    const dataSql = `
      SELECT 
        p.id,
        p.lahan_id,
        DATE_FORMAT(p.tanggal, '%Y-%m-%d') AS tanggal,
        p.jenis_pekerjaan,
        p.biaya,
        p.foto,
        p.keterangan,
        p.created_at,
        p.updated_at,
        l.nama_lahan,
        l.komoditas,
        l.lokasi
      FROM pekerjaan_lahan p
      JOIN lahan l ON p.lahan_id = l.id
      ${whereSql}
      ORDER BY p.tanggal DESC, p.id DESC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.query(dataSql, [...params, limit, offset]);

    res.json({
      success: true,
      data: rows,
      summary: {
        total_biaya,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error('Error list pekerjaan:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/pekerjaan/:id
app.get('/api/pekerjaan/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(`
      SELECT 
        p.id,
        p.lahan_id,
        DATE_FORMAT(p.tanggal, '%Y-%m-%d') AS tanggal,
        p.jenis_pekerjaan,
        p.biaya,
        p.foto,
        p.keterangan,
        p.created_at,
        p.updated_at,
        l.nama_lahan,
        l.komoditas,
        l.lokasi
      FROM pekerjaan_lahan p
      JOIN lahan l ON p.lahan_id = l.id
      WHERE p.id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data pekerjaan tidak ditemukan' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/pekerjaan (supports optional compressed photo upload)
app.post('/api/pekerjaan', upload.single('foto'), async (req, res) => {
  try {
    const { lahan_id, tanggal, jenis_pekerjaan, biaya, keterangan } = req.body;

    if (!lahan_id) {
      return res.status(400).json({ success: false, message: 'Tempat lahan wajib dipilih' });
    }
    if (!tanggal) {
      return res.status(400).json({ success: false, message: 'Tanggal pekerjaan wajib diisi' });
    }
    if (!jenis_pekerjaan || !jenis_pekerjaan.trim()) {
      return res.status(400).json({ success: false, message: 'Jenis pekerjaan wajib diisi' });
    }
    if (biaya === undefined || biaya === null || isNaN(Number(biaya)) || Number(biaya) < 0) {
      return res.status(400).json({ success: false, message: 'Biaya pengerjaan harus berupa angka >= 0' });
    }

    // Verify lahan exists
    const [lahanCheck] = await pool.query('SELECT id FROM lahan WHERE id = ?', [lahan_id]);
    if (lahanCheck.length === 0) {
      return res.status(400).json({ success: false, message: 'Lahan yang dipilih tidak valid' });
    }

    const fotoFilename = req.file ? req.file.filename : null;

    const [result] = await pool.query(
      `INSERT INTO pekerjaan_lahan (lahan_id, tanggal, jenis_pekerjaan, biaya, foto, keterangan) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        parseInt(lahan_id, 10),
        tanggal,
        jenis_pekerjaan.trim(),
        Number(biaya),
        fotoFilename,
        keterangan?.trim() || null,
      ]
    );

    const [created] = await pool.query(`
      SELECT p.*, l.nama_lahan 
      FROM pekerjaan_lahan p
      JOIN lahan l ON p.lahan_id = l.id
      WHERE p.id = ?
    `, [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'Rekapan kerja lahan berhasil disimpan',
      data: created[0],
    });
  } catch (error) {
    console.error('Error create pekerjaan:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/pekerjaan/:id
app.put('/api/pekerjaan/:id', upload.single('foto'), async (req, res) => {
  try {
    const { id } = req.params;
    const { lahan_id, tanggal, jenis_pekerjaan, biaya, keterangan, keep_old_foto } = req.body;

    const [check] = await pool.query('SELECT * FROM pekerjaan_lahan WHERE id = ?', [id]);
    if (check.length === 0) {
      return res.status(404).json({ success: false, message: 'Data pekerjaan tidak ditemukan' });
    }

    const currentRecord = check[0];

    if (!lahan_id) {
      return res.status(400).json({ success: false, message: 'Tempat lahan wajib dipilih' });
    }
    if (!tanggal) {
      return res.status(400).json({ success: false, message: 'Tanggal pekerjaan wajib diisi' });
    }
    if (!jenis_pekerjaan || !jenis_pekerjaan.trim()) {
      return res.status(400).json({ success: false, message: 'Jenis pekerjaan wajib diisi' });
    }
    if (biaya === undefined || isNaN(Number(biaya)) || Number(biaya) < 0) {
      return res.status(400).json({ success: false, message: 'Biaya pengerjaan harus berupa angka >= 0' });
    }

    let fotoFilename = currentRecord.foto;

    if (req.file) {
      // New photo uploaded, delete old photo if exists
      if (currentRecord.foto) {
        const oldPath = path.join(UPLOAD_DIR, currentRecord.foto);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      fotoFilename = req.file.filename;
    } else if (keep_old_foto === 'false' || keep_old_foto === false) {
      // User explicitly removed photo
      if (currentRecord.foto) {
        const oldPath = path.join(UPLOAD_DIR, currentRecord.foto);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      fotoFilename = null;
    }

    await pool.query(
      `UPDATE pekerjaan_lahan SET 
        lahan_id = ?, 
        tanggal = ?, 
        jenis_pekerjaan = ?, 
        biaya = ?, 
        foto = ?, 
        keterangan = ?
       WHERE id = ?`,
      [
        parseInt(lahan_id, 10),
        tanggal,
        jenis_pekerjaan.trim(),
        Number(biaya),
        fotoFilename,
        keterangan?.trim() || null,
        id,
      ]
    );

    const [updated] = await pool.query(`
      SELECT p.*, l.nama_lahan 
      FROM pekerjaan_lahan p
      JOIN lahan l ON p.lahan_id = l.id
      WHERE p.id = ?
    `, [id]);

    res.json({
      success: true,
      message: 'Rekapan kerja lahan berhasil diperbarui',
      data: updated[0],
    });
  } catch (error) {
    console.error('Error update pekerjaan:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/pekerjaan/:id
app.delete('/api/pekerjaan/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [check] = await pool.query('SELECT * FROM pekerjaan_lahan WHERE id = ?', [id]);
    if (check.length === 0) {
      return res.status(404).json({ success: false, message: 'Data pekerjaan tidak ditemukan' });
    }

    // Delete photo if exists
    if (check[0].foto) {
      const filePath = path.join(UPLOAD_DIR, check[0].foto);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await pool.query('DELETE FROM pekerjaan_lahan WHERE id = ?', [id]);
    res.json({ success: true, message: 'Catatan kerja lahan berhasil dihapus' });
  } catch (error) {
    console.error('Error delete pekerjaan:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 4. MASTER PEKERJA
// ==========================================

// GET /api/pekerja/all (unpaginated for dropdowns)
app.get('/api/pekerja/all', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT id, nama, no_hp, jabatan, upah_harian_standar, status 
      FROM pekerja 
      ORDER BY status ASC, nama ASC
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/pekerja (with pagination, search, status filter)
app.get('/api/pekerja', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.max(1, parseInt(req.query.limit || '10', 10));
    const offset = (page - 1) * limit;
    const search = (req.query.search || '').trim();
    const status = (req.query.status || '').trim();

    const whereClauses = [];
    const params = [];

    if (search) {
      whereClauses.push('(pk.nama LIKE ? OR pk.no_hp LIKE ? OR pk.jabatan LIKE ? OR pk.alamat LIKE ?)');
      const sp = `%${search}%`;
      params.push(sp, sp, sp, sp);
    }

    if (status) {
      whereClauses.push('pk.status = ?');
      params.push(status);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) AS total FROM pekerja pk ${whereSql}`;
    const [[{ total }]] = await pool.query(countSql, params);

    const dataSql = `
      SELECT 
        pk.*,
        COUNT(a.id) AS total_kehadiran,
        COALESCE(SUM(a.upah_dibayarkan), 0) AS total_upah_diterima
      FROM pekerja pk
      LEFT JOIN absensi_pekerja a ON pk.id = a.pekerja_id
      ${whereSql}
      GROUP BY pk.id
      ORDER BY pk.id DESC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.query(dataSql, [...params, limit, offset]);

    res.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error('Error list pekerja:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/pekerja
app.post('/api/pekerja', async (req, res) => {
  try {
    const { nama, no_hp, jabatan, upah_harian_standar, status, alamat } = req.body;

    if (!nama || !nama.trim()) {
      return res.status(400).json({ success: false, message: 'Nama pekerja wajib diisi' });
    }

    const upah = Number(upah_harian_standar) || 100000;

    const [result] = await pool.query(
      `INSERT INTO pekerja (nama, no_hp, jabatan, upah_harian_standar, status, alamat) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        nama.trim(),
        no_hp?.trim() || null,
        jabatan?.trim() || 'Pekerja Harian',
        upah,
        status || 'Aktif',
        alamat?.trim() || null,
      ]
    );

    const [created] = await pool.query('SELECT * FROM pekerja WHERE id = ?', [result.insertId]);
    res.status(201).json({
      success: true,
      message: 'Data pekerja berhasil ditambahkan',
      data: created[0],
    });
  } catch (error) {
    console.error('Error create pekerja:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/pekerja/:id
app.put('/api/pekerja/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nama, no_hp, jabatan, upah_harian_standar, status, alamat } = req.body;

    if (!nama || !nama.trim()) {
      return res.status(400).json({ success: false, message: 'Nama pekerja wajib diisi' });
    }

    const [check] = await pool.query('SELECT id FROM pekerja WHERE id = ?', [id]);
    if (check.length === 0) {
      return res.status(404).json({ success: false, message: 'Data pekerja tidak ditemukan' });
    }

    const upah = Number(upah_harian_standar) || 100000;

    await pool.query(
      `UPDATE pekerja SET 
        nama = ?, 
        no_hp = ?, 
        jabatan = ?, 
        upah_harian_standar = ?, 
        status = ?, 
        alamat = ?
       WHERE id = ?`,
      [
        nama.trim(),
        no_hp?.trim() || null,
        jabatan?.trim() || 'Pekerja Harian',
        upah,
        status || 'Aktif',
        alamat?.trim() || null,
        id,
      ]
    );

    const [updated] = await pool.query('SELECT * FROM pekerja WHERE id = ?', [id]);
    res.json({
      success: true,
      message: 'Data pekerja berhasil diperbarui',
      data: updated[0],
    });
  } catch (error) {
    console.error('Error update pekerja:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/pekerja/:id
app.delete('/api/pekerja/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [check] = await pool.query('SELECT id, nama FROM pekerja WHERE id = ?', [id]);
    if (check.length === 0) {
      return res.status(404).json({ success: false, message: 'Data pekerja tidak ditemukan' });
    }

    await pool.query('DELETE FROM pekerja WHERE id = ?', [id]);
    res.json({ success: true, message: `Data pekerja "${check[0].nama}" berhasil dihapus` });
  } catch (error) {
    console.error('Error delete pekerja:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 5. ABSENSI PEKERJA (INPUT KITA SENDIRI)
// ==========================================

// GET /api/absensi (pagination, search, filter tanggal/pekerja/lahan/status)
app.get('/api/absensi', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.max(1, parseInt(req.query.limit || '10', 10));
    const offset = (page - 1) * limit;
    const search = (req.query.search || '').trim();
    const pekerja_id = req.query.pekerja_id ? parseInt(req.query.pekerja_id, 10) : null;
    const lahan_id = req.query.lahan_id ? parseInt(req.query.lahan_id, 10) : null;
    const status_kehadiran = (req.query.status_kehadiran || '').trim();
    const startDate = (req.query.startDate || '').trim();
    const endDate = (req.query.endDate || '').trim();
    const tanggal = (req.query.tanggal || '').trim();

    const whereClauses = [];
    const params = [];

    if (search) {
      whereClauses.push('(pk.nama LIKE ? OR pk.jabatan LIKE ? OR a.keterangan LIKE ?)');
      const sp = `%${search}%`;
      params.push(sp, sp, sp);
    }

    if (pekerja_id) {
      whereClauses.push('a.pekerja_id = ?');
      params.push(pekerja_id);
    }

    if (lahan_id) {
      whereClauses.push('a.lahan_id = ?');
      params.push(lahan_id);
    }

    if (status_kehadiran) {
      whereClauses.push('a.status_kehadiran = ?');
      params.push(status_kehadiran);
    }

    if (tanggal) {
      whereClauses.push('a.tanggal = ?');
      params.push(tanggal);
    } else {
      if (startDate) {
        whereClauses.push('a.tanggal >= ?');
        params.push(startDate);
      }
      if (endDate) {
        whereClauses.push('a.tanggal <= ?');
        params.push(endDate);
      }
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const [[countResult]] = await pool.query(
      `SELECT COUNT(*) AS total, COALESCE(SUM(a.upah_dibayarkan), 0) AS total_upah_filtered 
       FROM absensi_pekerja a
       JOIN pekerja pk ON a.pekerja_id = pk.id
       LEFT JOIN lahan l ON a.lahan_id = l.id
       ${whereSql}`,
      params
    );

    const total = Number(countResult.total);
    const total_upah = Number(countResult.total_upah_filtered);

    const dataSql = `
      SELECT 
        a.id,
        a.pekerja_id,
        a.lahan_id,
        DATE_FORMAT(a.tanggal, '%Y-%m-%d') AS tanggal,
        a.status_kehadiran,
        a.upah_dibayarkan,
        a.keterangan,
        a.created_at,
        a.updated_at,
        pk.nama AS nama_pekerja,
        pk.no_hp,
        pk.jabatan,
        pk.upah_harian_standar,
        COALESCE(l.nama_lahan, '-') AS nama_lahan,
        l.komoditas
      FROM absensi_pekerja a
      JOIN pekerja pk ON a.pekerja_id = pk.id
      LEFT JOIN lahan l ON a.lahan_id = l.id
      ${whereSql}
      ORDER BY a.tanggal DESC, a.id DESC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.query(dataSql, [...params, limit, offset]);

    res.json({
      success: true,
      data: rows,
      summary: {
        total_upah,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error('Error list absensi:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/absensi (single input)
app.post('/api/absensi', async (req, res) => {
  try {
    const { pekerja_id, lahan_id, tanggal, status_kehadiran, upah_dibayarkan, keterangan } = req.body;

    if (!pekerja_id) {
      return res.status(400).json({ success: false, message: 'Pekerja wajib dipilih' });
    }
    if (!tanggal) {
      return res.status(400).json({ success: false, message: 'Tanggal absensi wajib diisi' });
    }

    const upah = Number(upah_dibayarkan) >= 0 ? Number(upah_dibayarkan) : 0;
    const targetLahanId = lahan_id ? parseInt(lahan_id, 10) : null;

    // Check if duplicate for same worker on same day
    const [exist] = await pool.query(
      'SELECT id FROM absensi_pekerja WHERE pekerja_id = ? AND tanggal = ?',
      [pekerja_id, tanggal]
    );

    if (exist.length > 0) {
      // Update existing record
      await pool.query(
        `UPDATE absensi_pekerja SET 
          lahan_id = ?, 
          status_kehadiran = ?, 
          upah_dibayarkan = ?, 
          keterangan = ?
         WHERE id = ?`,
        [targetLahanId, status_kehadiran || 'Hadir', upah, keterangan?.trim() || null, exist[0].id]
      );

      const [updated] = await pool.query(`
        SELECT a.*, pk.nama AS nama_pekerja, l.nama_lahan 
        FROM absensi_pekerja a
        JOIN pekerja pk ON a.pekerja_id = pk.id
        LEFT JOIN lahan l ON a.lahan_id = l.id
        WHERE a.id = ?
      `, [exist[0].id]);

      return res.json({
        success: true,
        message: 'Data absensi tanggal tersebut berhasil diperbarui',
        data: updated[0],
      });
    }

    const [result] = await pool.query(
      `INSERT INTO absensi_pekerja (pekerja_id, lahan_id, tanggal, status_kehadiran, upah_dibayarkan, keterangan) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        parseInt(pekerja_id, 10),
        targetLahanId,
        tanggal,
        status_kehadiran || 'Hadir',
        upah,
        keterangan?.trim() || null,
      ]
    );

    const [created] = await pool.query(`
      SELECT a.*, pk.nama AS nama_pekerja, l.nama_lahan 
      FROM absensi_pekerja a
      JOIN pekerja pk ON a.pekerja_id = pk.id
      LEFT JOIN lahan l ON a.lahan_id = l.id
      WHERE a.id = ?
    `, [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'Absensi pekerja berhasil disimpan',
      data: created[0],
    });
  } catch (error) {
    console.error('Error create absensi:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/absensi/batch (Massal / Multi Pekerja Sekaligus untuk satu tanggal)
app.post('/api/absensi/batch', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { tanggal, default_lahan_id, entries } = req.body;

    if (!tanggal) {
      return res.status(400).json({ success: false, message: 'Tanggal absensi wajib diisi' });
    }
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ success: false, message: 'Data absensi pekerja tidak boleh kosong' });
    }

    await connection.beginTransaction();

    for (const item of entries) {
      const { pekerja_id, lahan_id, status_kehadiran, upah_dibayarkan, keterangan } = item;
      if (!pekerja_id) continue;

      const currentLahanId = lahan_id || default_lahan_id || null;
      const upah = Number(upah_dibayarkan) >= 0 ? Number(upah_dibayarkan) : 0;
      const status = status_kehadiran || 'Hadir';

      // UPSERT using INSERT ... ON DUPLICATE KEY UPDATE
      await connection.query(
        `INSERT INTO absensi_pekerja (pekerja_id, lahan_id, tanggal, status_kehadiran, upah_dibayarkan, keterangan)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           lahan_id = VALUES(lahan_id),
           status_kehadiran = VALUES(status_kehadiran),
           upah_dibayarkan = VALUES(upah_dibayarkan),
           keterangan = VALUES(keterangan)`,
        [
          parseInt(pekerja_id, 10),
          currentLahanId ? parseInt(currentLahanId, 10) : null,
          tanggal,
          status,
          upah,
          keterangan?.trim() || null,
        ]
      );
    }

    await connection.commit();

    res.json({
      success: true,
      message: `Berhasil menyimpan absensi ${entries.length} pekerja untuk tanggal ${tanggal}`,
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error batch absensi:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    connection.release();
  }
});

// PUT /api/absensi/:id
app.put('/api/absensi/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { pekerja_id, lahan_id, tanggal, status_kehadiran, upah_dibayarkan, keterangan } = req.body;

    const [check] = await pool.query('SELECT * FROM absensi_pekerja WHERE id = ?', [id]);
    if (check.length === 0) {
      return res.status(404).json({ success: false, message: 'Data absensi tidak ditemukan' });
    }

    const upah = Number(upah_dibayarkan) >= 0 ? Number(upah_dibayarkan) : 0;
    const targetLahanId = lahan_id ? parseInt(lahan_id, 10) : null;

    await pool.query(
      `UPDATE absensi_pekerja SET 
        pekerja_id = ?, 
        lahan_id = ?, 
        tanggal = ?, 
        status_kehadiran = ?, 
        upah_dibayarkan = ?, 
        keterangan = ?
       WHERE id = ?`,
      [
        parseInt(pekerja_id || check[0].pekerja_id, 10),
        targetLahanId,
        tanggal || check[0].tanggal,
        status_kehadiran || 'Hadir',
        upah,
        keterangan?.trim() || null,
        id,
      ]
    );

    const [updated] = await pool.query(`
      SELECT a.*, pk.nama AS nama_pekerja, l.nama_lahan 
      FROM absensi_pekerja a
      JOIN pekerja pk ON a.pekerja_id = pk.id
      LEFT JOIN lahan l ON a.lahan_id = l.id
      WHERE a.id = ?
    `, [id]);

    res.json({
      success: true,
      message: 'Data absensi berhasil diperbarui',
      data: updated[0],
    });
  } catch (error) {
    console.error('Error update absensi:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/absensi/:id
app.delete('/api/absensi/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [check] = await pool.query('SELECT id FROM absensi_pekerja WHERE id = ?', [id]);
    if (check.length === 0) {
      return res.status(404).json({ success: false, message: 'Data absensi tidak ditemukan' });
    }

    await pool.query('DELETE FROM absensi_pekerja WHERE id = ?', [id]);
    res.json({ success: true, message: 'Data absensi berhasil dihapus' });
  } catch (error) {
    console.error('Error delete absensi:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 6. LAPORAN & REKAPAN LENGKAP
// ==========================================
app.get('/api/laporan/ringkasan', async (req, res) => {
  try {
    const { lahan_id, startDate, endDate } = req.query;

    const workWhere = [];
    const workParams = [];
    const absWhere = [];
    const absParams = [];

    if (lahan_id) {
      workWhere.push('p.lahan_id = ?');
      workParams.push(parseInt(lahan_id, 10));
      absWhere.push('a.lahan_id = ?');
      absParams.push(parseInt(lahan_id, 10));
    }

    if (startDate) {
      workWhere.push('p.tanggal >= ?');
      workParams.push(startDate);
      absWhere.push('a.tanggal >= ?');
      absParams.push(startDate);
    }

    if (endDate) {
      workWhere.push('p.tanggal <= ?');
      workParams.push(endDate);
      absWhere.push('a.tanggal <= ?');
      absParams.push(endDate);
    }

    const workWhereSql = workWhere.length > 0 ? `WHERE ${workWhere.join(' AND ')}` : '';
    const absWhereSql = absWhere.length > 0 ? `WHERE ${absWhere.join(' AND ')}` : '';

    // Ambil list pekerjaan lahan
    const [pekerjaanList] = await pool.query(`
      SELECT 
        p.id,
        p.lahan_id,
        DATE_FORMAT(p.tanggal, '%Y-%m-%d') AS tanggal,
        p.jenis_pekerjaan,
        p.biaya,
        p.foto,
        p.keterangan,
        l.nama_lahan,
        l.komoditas
      FROM pekerjaan_lahan p
      JOIN lahan l ON p.lahan_id = l.id
      ${workWhereSql}
      ORDER BY p.tanggal ASC
    `, workParams);

    // Ambil list absensi pekerja
    const [absensiList] = await pool.query(`
      SELECT 
        a.id,
        a.pekerja_id,
        a.lahan_id,
        DATE_FORMAT(a.tanggal, '%Y-%m-%d') AS tanggal,
        a.status_kehadiran,
        a.upah_dibayarkan,
        a.keterangan,
        pk.nama AS nama_pekerja,
        pk.jabatan,
        COALESCE(l.nama_lahan, '-') AS nama_lahan
      FROM absensi_pekerja a
      JOIN pekerja pk ON a.pekerja_id = pk.id
      LEFT JOIN lahan l ON a.lahan_id = l.id
      ${absWhereSql}
      ORDER BY a.tanggal ASC
    `, absParams);

    const total_biaya_kerja = pekerjaanList.reduce((acc, cur) => acc + Number(cur.biaya), 0);
    const total_upah_absensi = absensiList.reduce((acc, cur) => acc + Number(cur.upah_dibayarkan), 0);
    const total_keseluruhan = total_biaya_kerja + total_upah_absensi;

    res.json({
      success: true,
      data: {
        pekerjaan: pekerjaanList,
        absensi: absensiList,
        summary: {
          total_kegiatan_kerja: pekerjaanList.length,
          total_biaya_kerja,
          total_kehadiran_pekerja: absensiList.length,
          total_upah_absensi,
          total_keseluruhan,
        },
      },
    });
  } catch (error) {
    console.error('Error laporan ringkasan:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 7. AUTHENTICATION & LOGIN (JWT)
// ==========================================

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username dan password wajib diisi' });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE username = ? OR email = ?', [
      username.trim(),
      username.trim(),
    ]);

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Username atau password salah' });
    }

    const user = rows[0];

    if (user.status === 'Nonaktif') {
      return res.status(403).json({ success: false, message: 'Akun Anda dinonaktifkan. Silakan hubungi admin.' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Username atau password salah' });
    }

    const tokenPayload = {
      id: user.id,
      nama: user.nama,
      username: user.username,
      role: user.role,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      message: 'Login berhasil',
      data: {
        token,
        user: {
          id: user.id,
          nama: user.nama,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error('Error auth login:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/auth/profile
app.get('/api/auth/profile', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, message: 'Token tidak ditemukan' });
    }

    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(403).json({ success: false, message: 'Token kedaluwarsa atau tidak valid' });
      }

      const [rows] = await pool.query('SELECT id, nama, username, email, role, status FROM users WHERE id = ?', [
        decoded.id,
      ]);

      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
      }

      res.json({ success: true, data: rows[0] });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 8. MANAJEMEN USERS & AKUN ADMIN
// ==========================================

// GET /api/users (with pagination, search, role filter)
app.get('/api/users', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.max(1, parseInt(req.query.limit || '10', 10));
    const offset = (page - 1) * limit;
    const search = (req.query.search || '').trim();
    const role = (req.query.role || '').trim();
    const status = (req.query.status || '').trim();

    const whereClauses = [];
    const params = [];

    if (search) {
      whereClauses.push('(nama LIKE ? OR username LIKE ? OR email LIKE ?)');
      const sp = `%${search}%`;
      params.push(sp, sp, sp);
    }

    if (role) {
      whereClauses.push('role = ?');
      params.push(role);
    }

    if (status) {
      whereClauses.push('status = ?');
      params.push(status);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) AS total FROM users ${whereSql}`;
    const [[{ total }]] = await pool.query(countSql, params);

    const dataSql = `
      SELECT id, nama, username, email, role, status, created_at, updated_at
      FROM users
      ${whereSql}
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.query(dataSql, [...params, limit, offset]);

    res.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error('Error list users:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/users/:id
app.get('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      'SELECT id, nama, username, email, role, status, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/users (create user)
app.post('/api/users', async (req, res) => {
  try {
    const { nama, username, email, password, role, status } = req.body;

    if (!nama || !nama.trim()) {
      return res.status(400).json({ success: false, message: 'Nama lengkap wajib diisi' });
    }
    if (!username || !username.trim()) {
      return res.status(400).json({ success: false, message: 'Username wajib diisi' });
    }
    if (!password || password.length < 5) {
      return res.status(400).json({ success: false, message: 'Password minimal 5 karakter' });
    }

    // Check duplicate username
    const [exist] = await pool.query('SELECT id FROM users WHERE username = ?', [username.trim()]);
    if (exist.length > 0) {
      return res.status(400).json({ success: false, message: 'Username sudah digunakan oleh akun lain' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `INSERT INTO users (nama, username, email, password, role, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        nama.trim(),
        username.trim().toLowerCase(),
        email?.trim() || null,
        hashedPassword,
        role || 'admin',
        status || 'Aktif',
      ]
    );

    const [created] = await pool.query(
      'SELECT id, nama, username, email, role, status, created_at FROM users WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Akun user berhasil dibuat',
      data: created[0],
    });
  } catch (error) {
    console.error('Error create user:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/users/:id (update user)
app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nama, username, email, password, role, status } = req.body;

    const [check] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    if (check.length === 0) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    }

    if (!nama || !nama.trim()) {
      return res.status(400).json({ success: false, message: 'Nama lengkap wajib diisi' });
    }
    if (!username || !username.trim()) {
      return res.status(400).json({ success: false, message: 'Username wajib diisi' });
    }

    // Check if new username conflicts with another user
    const [exist] = await pool.query('SELECT id FROM users WHERE username = ? AND id != ?', [
      username.trim(),
      id,
    ]);
    if (exist.length > 0) {
      return res.status(400).json({ success: false, message: 'Username sudah digunakan oleh akun lain' });
    }

    let passwordHash = check[0].password;
    if (password && password.trim().length >= 5) {
      passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    await pool.query(
      `UPDATE users SET 
        nama = ?, 
        username = ?, 
        email = ?, 
        password = ?, 
        role = ?, 
        status = ?
       WHERE id = ?`,
      [
        nama.trim(),
        username.trim().toLowerCase(),
        email?.trim() || null,
        passwordHash,
        role || check[0].role,
        status || check[0].status,
        id,
      ]
    );

    const [updated] = await pool.query(
      'SELECT id, nama, username, email, role, status, updated_at FROM users WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Data akun berhasil diperbarui',
      data: updated[0],
    });
  } catch (error) {
    console.error('Error update user:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/users/:id
app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [check] = await pool.query('SELECT id, username FROM users WHERE id = ?', [id]);
    if (check.length === 0) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    }

    // Prevent deleting last admin
    const [[{ adminCount }]] = await pool.query("SELECT COUNT(*) AS adminCount FROM users WHERE role = 'admin'");
    if (adminCount <= 1 && check[0].role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Tidak dapat menghapus admin utama satu-satunya',
      });
    }

    await pool.query('DELETE FROM users WHERE id = ?', [id]);
    res.json({ success: true, message: `Akun "${check[0].username}" berhasil dihapus` });
  } catch (error) {
    console.error('Error delete user:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 9. MASTER JENIS PEKERJAAN LAHAN
// ==========================================

// GET /api/jenis-pekerjaan/all (unpaginated for dropdowns)
app.get('/api/jenis-pekerjaan/all', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, nama_jenis, kategori, keterangan FROM jenis_pekerjaan ORDER BY nama_jenis ASC');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/jenis-pekerjaan (pagination, search, kategori filter)
app.get('/api/jenis-pekerjaan', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.max(1, parseInt(req.query.limit || '10', 10));
    const offset = (page - 1) * limit;
    const search = (req.query.search || '').trim();
    const kategori = (req.query.kategori || '').trim();

    const whereClauses = [];
    const params = [];

    if (search) {
      whereClauses.push('(nama_jenis LIKE ? OR kategori LIKE ? OR keterangan LIKE ?)');
      const sp = `%${search}%`;
      params.push(sp, sp, sp);
    }

    if (kategori) {
      whereClauses.push('kategori = ?');
      params.push(kategori);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) AS total FROM jenis_pekerjaan ${whereSql}`;
    const [[{ total }]] = await pool.query(countSql, params);

    const dataSql = `
      SELECT 
        jp.*,
        COUNT(p.id) AS total_penggunaan
      FROM jenis_pekerjaan jp
      LEFT JOIN pekerjaan_lahan p ON jp.nama_jenis = p.jenis_pekerjaan
      ${whereSql}
      GROUP BY jp.id
      ORDER BY jp.nama_jenis ASC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.query(dataSql, [...params, limit, offset]);

    res.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error('Error list jenis pekerjaan:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/jenis-pekerjaan
app.post('/api/jenis-pekerjaan', async (req, res) => {
  try {
    const { nama_jenis, kategori, keterangan } = req.body;

    if (!nama_jenis || !nama_jenis.trim()) {
      return res.status(400).json({ success: false, message: 'Nama jenis pekerjaan wajib diisi' });
    }

    const [exist] = await pool.query('SELECT id FROM jenis_pekerjaan WHERE nama_jenis = ?', [nama_jenis.trim()]);
    if (exist.length > 0) {
      return res.status(400).json({ success: false, message: 'Jenis pekerjaan ini sudah ada' });
    }

    const [result] = await pool.query(
      'INSERT INTO jenis_pekerjaan (nama_jenis, kategori, keterangan) VALUES (?, ?, ?)',
      [nama_jenis.trim(), kategori?.trim() || 'Umum', keterangan?.trim() || null]
    );

    const [created] = await pool.query('SELECT * FROM jenis_pekerjaan WHERE id = ?', [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'Jenis pekerjaan berhasil ditambahkan',
      data: created[0],
    });
  } catch (error) {
    console.error('Error create jenis pekerjaan:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/jenis-pekerjaan/:id
app.put('/api/jenis-pekerjaan/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_jenis, kategori, keterangan } = req.body;

    const [check] = await pool.query('SELECT * FROM jenis_pekerjaan WHERE id = ?', [id]);
    if (check.length === 0) {
      return res.status(404).json({ success: false, message: 'Data jenis pekerjaan tidak ditemukan' });
    }

    if (!nama_jenis || !nama_jenis.trim()) {
      return res.status(400).json({ success: false, message: 'Nama jenis pekerjaan wajib diisi' });
    }

    const [exist] = await pool.query('SELECT id FROM jenis_pekerjaan WHERE nama_jenis = ? AND id != ?', [
      nama_jenis.trim(),
      id,
    ]);
    if (exist.length > 0) {
      return res.status(400).json({ success: false, message: 'Nama jenis pekerjaan sudah digunakan' });
    }

    const oldName = check[0].nama_jenis;
    const newName = nama_jenis.trim();

    await pool.query(
      'UPDATE jenis_pekerjaan SET nama_jenis = ?, kategori = ?, keterangan = ? WHERE id = ?',
      [newName, kategori?.trim() || 'Umum', keterangan?.trim() || null, id]
    );

    // Also update existing pekerjaan_lahan records if name changed
    if (oldName !== newName) {
      await pool.query('UPDATE pekerjaan_lahan SET jenis_pekerjaan = ? WHERE jenis_pekerjaan = ?', [
        newName,
        oldName,
      ]);
    }

    const [updated] = await pool.query('SELECT * FROM jenis_pekerjaan WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Jenis pekerjaan berhasil diperbarui',
      data: updated[0],
    });
  } catch (error) {
    console.error('Error update jenis pekerjaan:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/jenis-pekerjaan/:id
app.delete('/api/jenis-pekerjaan/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [check] = await pool.query('SELECT id, nama_jenis FROM jenis_pekerjaan WHERE id = ?', [id]);
    if (check.length === 0) {
      return res.status(404).json({ success: false, message: 'Data jenis pekerjaan tidak ditemukan' });
    }

    await pool.query('DELETE FROM jenis_pekerjaan WHERE id = ?', [id]);
    res.json({ success: true, message: `Jenis pekerjaan "${check[0].nama_jenis}" berhasil dihapus` });
  } catch (error) {
    console.error('Error delete jenis pekerjaan:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Terjadi kesalahan pada server internal',
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server backend rekap pertanian berjalan pada http://localhost:${PORT}`);
});
