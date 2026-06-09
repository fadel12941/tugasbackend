# LAPORAN TUGAS PEMROGRAMAN WEB (PERTEMUAN 13)
## SISTEM MANAJEMEN STOK BARANG SEDERHANA (STOKAPP)

---

### 1. INFORMASI PROYEK
* **Nama Aplikasi**: StokApp (Manajemen Barang Sederhana)
* **URL Hosting Online**: [http://tugas13back.kesug.com/](http://tugas13back.kesug.com/)
* **Teknologi Backend**: PHP Native & MySQL (PDO)
* **Teknologi Frontend**: HTML5, Vanilla CSS, Vanilla JavaScript (Fetch API)
* **Metode Otentikasi**: Bearer Token Auth (disimpan di LocalStorage & dicocokkan dengan Token Database)

---

### 2. DESKRIPSI APLIKASI
StokApp adalah aplikasi berbasis web sederhana untuk mengelola daftar stok barang secara personal. Aplikasi ini mengimplementasikan sistem multi-user, di mana setiap user harus mendaftar dan login terlebih dahulu untuk mengelola stok barang mereka sendiri. Data barang yang ditambahkan oleh satu user tidak akan dapat dilihat atau dimodifikasi oleh user lain (isolasi data aman).

**Fitur Utama:**
1. **Registrasi Akun Baru**: Enkripsi password menggunakan algoritma `BCRYPT` sebelum disimpan ke database.
2. **Login Akun**: Validasi password dan pembuatan sesi menggunakan token acak (Secure Token Authentication).
3. **Dashboard Barang**: Tampilan dashboard premium berbasis *Glassmorphism* gelap dengan visual modern.
4. **CRUD Barang (Create, Read, Delete)**: 
   * Menambah barang baru (nama, kategori, jumlah, dan keterangan).
   * Membaca dan menampilkan daftar barang secara dinamis.
   * Menghapus barang dengan konfirmasi.

---

### 3. ARSITEKTUR DIREKTORI PROYEK
Proyek ini memiliki struktur file yang bersih dan terstruktur untuk memisahkan logika backend (API) dan frontend (UI):

```text
back/
├── api/
│   ├── config.php      # Koneksi database MySQL PDO, CORS & fungsi otentikasi
│   ├── register.php    # API Registrasi akun baru (POST)
│   ├── login.php       # API Login & pembuatan token sesi (POST)
│   └── barang.php      # API CRUD barang milik user yang sedang aktif (GET, POST, DELETE)
├── public/
│   ├── index.html      # Tampilan antarmuka (UI) Form Login/Register & Dashboard
│   ├── app.js          # Logika frontend (fetch data ke API PHP, state management & DOM manipulation)
│   └── style.css       # Desain tema gelap premium (Glassmorphism & responsif)
└── index.php           # Redirect otomatis ke folder public/index.html
```

---

### 4. SKEMA DATABASE MYSQL
Aplikasi ini secara cerdas akan **membuat database dan tabel secara otomatis** saat pertama kali diakses. Berikut adalah skema tabel yang digunakan:

#### A. Tabel `users`
Digunakan untuk menyimpan informasi kredensial user dan token aktif.
| Nama Kolom | Tipe Data | Atribut | Keterangan |
| :--- | :--- | :--- | :--- |
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | ID unik user |
| `username` | VARCHAR(50) | UNIQUE, NOT NULL | Username untuk login |
| `password` | VARCHAR(255) | NOT NULL | Hash password (BCRYPT) |
| `token` | VARCHAR(255) | NULL | Token sesi aktif |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Waktu pendaftaran |

#### B. Tabel `barang`
Digunakan untuk menyimpan data barang milik setiap user.
| Nama Kolom | Tipe Data | Atribut | Keterangan |
| :--- | :--- | :--- | :--- |
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | ID unik barang |
| `nama` | VARCHAR(100) | NOT NULL | Nama barang |
| `kategori` | VARCHAR(50) | NOT NULL | Kategori barang |
| `jumlah` | INT | NOT NULL | Jumlah stok barang |
| `keterangan` | TEXT | NULL | Catatan tambahan |
| `user_id` | INT | FOREIGN KEY (users.id) | ID pemilik barang |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Waktu input barang |

---

### 5. PENJELASAN KODE PROGRAM UTAMA

#### A. Backend: `api/config.php`
Berperan penting dalam menghubungkan aplikasi ke MySQL dan melakukan validasi token keamanan. File ini menggunakan konfigurasi dinamis (*Smart Config*) untuk mendeteksi apakah aplikasi dijalankan di localhost (XAMPP) atau di server online (InfinityFree).

```php
// Cek lingkungan server
if ($_SERVER['HTTP_HOST'] === 'localhost' || $_SERVER['HTTP_HOST'] === '127.0.0.1') {
    define('DB_HOST', 'localhost');
    define('DB_USER', 'root');
    define('DB_PASS', '');
    define('DB_NAME', 'tugas_pertemuan13');
} else {
    define('DB_HOST', 'sql301.infinityfree.com');
    define('DB_USER', 'if0_42063297');
    define('DB_PASS', 'SCeskyc6Wo1');
    define('DB_NAME', 'if0_42063297_tugasbackend');
}
```
*Catatan khusus: Fungsi `getAuthorizationHeader()` dirancang agar membaca custom header `X-Authorization` guna menghindari pembatasan hosting gratis yang sering membuang header standard `Authorization`.*

#### B. Frontend: `public/app.js`
Mengelola seluruh permintaan AJAX ke API secara *asynchronous* menggunakan Fetch API. Data disimpan sementara pada `localStorage` agar sesi tetap aktif setelah halaman di-refresh.
Contoh pemanggilan API Barang menggunakan otentikasi header ganda:
```javascript
var res = await fetch(API_URL + '/barang.php', {
  headers: { 
    'Authorization': 'Bearer ' + TOKEN,
    'X-Authorization': 'Bearer ' + TOKEN
  },
});
```

---

### 6. LANGKAH INSTALASI DAN PENGUJIAN

#### A. Pengujian Lokal (XAMPP)
1. Pindahkan folder `back` ke direktori `C:\xampp\htdocs\`.
2. Aktifkan modul **Apache** dan **MySQL** di XAMPP Control Panel.
3. Akses URL **`http://localhost/back/`** di browser.
4. Database `tugas_pertemuan13` beserta tabel-tabelnya otomatis terbentuk di phpMyAdmin lokal.

#### B. Deploy Hosting (InfinityFree)
1. Buat database MySQL di panel client InfinityFree dengan nama akhiran `tugasbackend`.
2. Upload isi folder `back` ke dalam direktori `/htdocs/` melalui online File Manager.
3. Ubah password database pada file `api/config.php` online sesuai dengan kredensial InfinityFree.
4. Akses alamat domain online untuk menguji registrasi, login, dan CRUD data barang.

---

### 7. KESIMPULAN
Aplikasi Sistem Manajemen Stok Barang Sederhana (StokApp) berhasil diimplementasikan menggunakan arsitektur PHP Native di backend dan Vanilla Javascript di frontend. Penggunaan metode token auth dan pemisahan logika folder (API dan Frontend) membuat struktur aplikasi lebih modern dan aman. Aplikasi ini juga telah teruji dapat berjalan dengan baik di server lokal maupun saat di-hosting secara publik di InfinityFree.
