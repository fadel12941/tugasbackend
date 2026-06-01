<?php
// ===================================
//  Konfigurasi Database MySQL & Helper
// ===================================

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Cek apakah berjalan di localhost atau di server hosting (InfinityFree)
if ($_SERVER['HTTP_HOST'] === 'localhost' || $_SERVER['HTTP_HOST'] === '127.0.0.1') {
    // Konfigurasi XAMPP Lokal
    define('DB_HOST', 'localhost');
    define('DB_USER', 'root');
    define('DB_PASS', '');
    define('DB_NAME', 'tugas_pertemuan13');
} else {
    // Konfigurasi InfinityFree Online
    define('DB_HOST', 'sql301.infinityfree.com');
    define('DB_USER', 'if0_42063297');
    define('DB_PASS', 'MASUKKAN_PASSWORD_DISINI'); // Ganti dengan password MySQL InfinityFree Anda
    define('DB_NAME', 'if0_42063297_tugasbackend');
}

function getDB() {
    $db = null;
    try {
        // Coba koneksi langsung ke database
        $db = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8", DB_USER, DB_PASS);
        $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    } catch (PDOException $e) {
        // Jika gagal karena database belum ada, coba buat databasenya (berlaku untuk localhost/XAMPP)
        try {
            $tempDb = new PDO("mysql:host=" . DB_HOST . ";charset=utf8", DB_USER, DB_PASS);
            $tempDb->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $tempDb->exec("CREATE DATABASE IF NOT EXISTS " . DB_NAME);
            
            $db = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8", DB_USER, DB_PASS);
            $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        } catch (PDOException $ex) {
            jsonResponse(500, ['message' => 'Koneksi database gagal: ' . $e->getMessage()]);
        }
    }

    // Buat tabel jika belum ada
    try {
        $db->exec("CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            token VARCHAR(100) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");

        $db->exec("CREATE TABLE IF NOT EXISTS barang (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nama VARCHAR(100) NOT NULL,
            kategori VARCHAR(50) NOT NULL,
            jumlah INT NOT NULL,
            keterangan TEXT NULL,
            user_id INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )");
    } catch (PDOException $e) {
        // Abaikan jika error pembuatan tabel
    }

    return $db;
}

// Kirim response JSON
function jsonResponse($code, $data) {
    http_response_code($code);
    echo json_encode($data);
    exit();
}

// Ambil Authorization header (kompatibel dengan shared hosting)
function getAuthorizationHeader() {
    // Cek custom header X-Authorization (menghindari Apache stripping di InfinityFree)
    if (isset($_SERVER['HTTP_X_AUTHORIZATION'])) {
        return $_SERVER['HTTP_X_AUTHORIZATION'];
    }
    if (isset($_SERVER['REDIRECT_HTTP_X_AUTHORIZATION'])) {
        return $_SERVER['REDIRECT_HTTP_X_AUTHORIZATION'];
    }

    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        foreach ($headers as $key => $value) {
            if (strtolower($key) === 'authorization') {
                return $value;
            }
            if (strtolower($key) === 'x-authorization') {
                return $value;
            }
        }
    }
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        return $_SERVER['HTTP_AUTHORIZATION'];
    }
    if (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        return $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    }
    return '';
}

// Verifikasi token
function authenticate() {
    $authHeader = getAuthorizationHeader();
    if (!$authHeader || strpos($authHeader, 'Bearer ') !== 0) {
        jsonResponse(401, ['message' => 'Token tidak ditemukan']);
    }

    $token = substr($authHeader, 7);
    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM users WHERE token = ?");
    $stmt->execute([$token]);
    $user = $stmt->fetch();

    if (!$user) {
        jsonResponse(403, ['message' => 'Token tidak valid']);
    }

    return $user;
}
?>
