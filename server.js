const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'rahasia_jwt_pertemuan13';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database Setup
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) console.error('DB Error:', err.message);
  else console.log('✅ Terhubung ke database SQLite');
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS barang (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT NOT NULL,
    kategori TEXT NOT NULL,
    jumlah INTEGER NOT NULL,
    keterangan TEXT,
    user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);
});

// Middleware Auth
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token tidak ditemukan' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token tidak valid' });
    req.user = user;
    next();
  });
}

// =====================
//   API ROUTES
// =====================

// POST /api/register
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ message: 'Username dan password wajib diisi' });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run(
      'INSERT INTO users (username, password) VALUES (?, ?)',
      [username, hashedPassword],
      function (err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint'))
            return res.status(409).json({ message: 'Username sudah digunakan' });
          return res.status(500).json({ message: 'Gagal mendaftar' });
        }
        res.status(201).json({ message: 'Daftar berhasil! Silakan login.' });
      }
    );
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ message: 'Username dan password wajib diisi' });

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err || !user)
      return res.status(401).json({ message: 'Username atau password salah' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(401).json({ message: 'Username atau password salah' });

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
      expiresIn: '8h',
    });
    res.json({ message: 'Login berhasil', token, username: user.username });
  });
});

// GET /api/barang — Ambil semua barang milik user
app.get('/api/barang', authenticateToken, (req, res) => {
  db.all(
    'SELECT * FROM barang WHERE user_id = ? ORDER BY created_at DESC',
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ message: 'Gagal mengambil data' });
      res.json(rows);
    }
  );
});

// POST /api/barang — Tambah barang baru
app.post('/api/barang', authenticateToken, (req, res) => {
  const { nama, kategori, jumlah, keterangan } = req.body;
  if (!nama || !kategori || !jumlah)
    return res.status(400).json({ message: 'Nama, kategori, dan jumlah wajib diisi' });

  db.run(
    'INSERT INTO barang (nama, kategori, jumlah, keterangan, user_id) VALUES (?, ?, ?, ?, ?)',
    [nama, kategori, jumlah, keterangan || '', req.user.id],
    function (err) {
      if (err) return res.status(500).json({ message: 'Gagal menambah barang' });
      res.status(201).json({ message: 'Barang berhasil ditambahkan', id: this.lastID });
    }
  );
});

// DELETE /api/barang/:id — Hapus barang
app.delete('/api/barang/:id', authenticateToken, (req, res) => {
  db.run(
    'DELETE FROM barang WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id],
    function (err) {
      if (err) return res.status(500).json({ message: 'Gagal menghapus' });
      if (this.changes === 0) return res.status(404).json({ message: 'Data tidak ditemukan' });
      res.json({ message: 'Barang berhasil dihapus' });
    }
  );
});

// Catch-all → serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});
