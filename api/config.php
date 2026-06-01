<?php
// ===================================
//  Konfigurasi Database MySQL & Helper
// ===================================

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Default XAMPP MySQL Configuration (Bisa diubah saat hosting)
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'tugas_pertemuan13');

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
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        foreach ($headers as $key => $value) {
            if (strtolower($key) === 'authorization') {
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
