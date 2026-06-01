<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(405, ['message' => 'Method not allowed']);
}

$input = json_decode(file_get_contents('php://input'), true);
$username = isset($input['username']) ? trim($input['username']) : '';
$password = isset($input['password']) ? $input['password'] : '';

if (!$username || !$password) {
    jsonResponse(400, ['message' => 'Username dan password wajib diisi']);
}

$db = getDB();

// Cek apakah username sudah terdaftar
$stmt = $db->prepare("SELECT id FROM users WHERE username = ?");
$stmt->execute([$username]);
if ($stmt->fetch()) {
    jsonResponse(409, ['message' => 'Username sudah digunakan']);
}

// Hash password dan simpan user baru
$hashedPassword = password_hash($password, PASSWORD_BCRYPT);
try {
    $stmt = $db->prepare("INSERT INTO users (username, password) VALUES (?, ?)");
    $stmt->execute([$username, $hashedPassword]);
    jsonResponse(201, ['message' => 'Daftar berhasil! Silakan login.']);
} catch (PDOException $e) {
    jsonResponse(500, ['message' => 'Gagal mendaftar ke database']);
}
?>
