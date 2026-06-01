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

// Cari user berdasarkan username
$stmt = $db->prepare("SELECT * FROM users WHERE username = ?");
$stmt->execute([$username]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password'])) {
    jsonResponse(401, ['message' => 'Username atau password salah']);
}

// Generate secure random token
$token = bin2hex(random_bytes(16));

// Simpan token ke database
$stmt = $db->prepare("UPDATE users SET token = ? WHERE id = ?");
$stmt->execute([$token, $user['id']]);

jsonResponse(200, [
    'message' => 'Login berhasil',
    'token' => $token,
    'username' => $user['username']
]);
?>
