const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'rahasia_jwt_pertemuan13';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database Setup (Dual Mode: Postgres for Render, SQLite for Local)
const isPostgres = !!process.env.DATABASE_URL;
let dbInstance = null;

if (isPostgres) {
  const { Pool } = require('pg');
  dbInstance = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  console.log('✅ Terhubung ke database PostgreSQL (Supabase/Cloud)');

  // Initialize tables in PostgreSQL
  dbInstance.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS barang (
      id SERIAL PRIMARY KEY,
      nama VARCHAR(255) NOT NULL,
      kategori VARCHAR(255) NOT NULL,
      jumlah INTEGER NOT NULL,
      keterangan TEXT,
      user_id INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `).catch(err => console.error('⚠️ Gagal inisialisasi tabel PG:', err.message));

} else {
  const sqlite3 = require('sqlite3').verbose();
  dbInstance = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) console.error('DB Error:', err.message);
    else console.log('✅ Terhubung ke database SQLite Lokal');
  });

  dbInstance.serialize(() => {
    dbInstance.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    dbInstance.run(`CREATE TABLE IF NOT EXISTS barang (
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
}

// Helper to convert "?" placeholders to "$1, $2" for PostgreSQL
function formatQuery(sql, params) {
  if (!isPostgres) return sql;
  let pgSql = sql;
  params.forEach((_, idx) => {
    pgSql = pgSql.replace('?', `$${idx + 1}`);
  });
  return pgSql;
}

// Database helper functions to abstract differences
async function queryOne(sql, params = []) {
  if (isPostgres) {
    const formattedSql = formatQuery(sql, params);
    const res = await dbInstance.query(formattedSql, params);
    return res.rows[0] || null;
  } else {
    return new Promise((resolve, reject) => {
      dbInstance.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      });
    });
  }
}

async function queryAll(sql, params = []) {
  if (isPostgres) {
    const formattedSql = formatQuery(sql, params);
    const res = await dbInstance.query(formattedSql, params);
    return res.rows;
  } else {
    return new Promise((resolve, reject) => {
      dbInstance.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}

async function runQuery(sql, params = []) {
  if (isPostgres) {
    let formattedSql = formatQuery(sql, params);
    const isInsert = sql.trim().toUpperCase().startsWith('INSERT');
    if (isInsert) {
      formattedSql += ' RETURNING id';
    }
    const res = await dbInstance.query(formattedSql, params);
    return {
      lastID: isInsert && res.rows[0] ? res.rows[0].id : null,
      changes: res.rowCount
    };
  } else {
    return new Promise((resolve, reject) => {
      dbInstance.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }
}

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
    await runQuery('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);
    res.status(201).json({ message: 'Daftar berhasil! Silakan login.' });
  } catch (err) {
    if (err.message.includes('UNIQUE') || err.message.includes('duplicate key')) {
      return res.status(409).json({ message: 'Username sudah digunakan' });
    }
    res.status(500).json({ message: 'Gagal mendaftar' });
  }
});

// POST /api/login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ message: 'Username dan password wajib diisi' });

  try {
    const user = await queryOne('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(401).json({ message: 'Username atau password salah' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: 'Username atau password salah' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
      expiresIn: '8h',
    });
    res.json({ message: 'Login berhasil', token, username: user.username });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/barang
app.get('/api/barang', authenticateToken, async (req, res) => {
  try {
    const rows = await queryAll('SELECT * FROM barang WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengambil data' });
  }
});

// POST /api/barang
app.post('/api/barang', authenticateToken, async (req, res) => {
  const { nama, kategori, jumlah, keterangan } = req.body;
  if (!nama || !kategori || !jumlah)
    return res.status(400).json({ message: 'Nama, kategori, dan jumlah wajib diisi' });

  try {
    const result = await runQuery(
      'INSERT INTO barang (nama, kategori, jumlah, keterangan, user_id) VALUES (?, ?, ?, ?, ?)',
      [nama, kategori, jumlah, keterangan || '', req.user.id]
    );
    res.status(201).json({ message: 'Barang berhasil ditambahkan', id: result.lastID });
  } catch (err) {
    res.status(500).json({ message: 'Gagal menambah barang' });
  }
});

// DELETE /api/barang/:id
app.delete('/api/barang/:id', authenticateToken, async (req, res) => {
  try {
    const result = await runQuery(
      'DELETE FROM barang WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (result.changes === 0) {
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }
    res.json({ message: 'Barang berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ message: 'Gagal menghapus' });
  }
});

// Catch-all → serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});
