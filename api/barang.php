<?php
require_once 'config.php';

// Verifikasi user token
$user = authenticate();
$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // Ambil semua barang milik user yang sedang login
        $stmt = $db->prepare("SELECT * FROM barang WHERE user_id = ? ORDER BY created_at DESC");
        $stmt->execute([$user['id']]);
        $rows = $stmt->fetchAll();
        
        // Pastikan format tipe data integer untuk jumlah
        foreach ($rows as &$row) {
            $row['id'] = (int)$row['id'];
            $row['jumlah'] = (int)$row['jumlah'];
            $row['user_id'] = (int)$row['user_id'];
        }
        
        jsonResponse(200, $rows);
        break;

    case 'POST':
        // Tambah barang baru
        $input = json_decode(file_get_contents('php://input'), true);
        $nama = isset($input['nama']) ? trim($input['nama']) : '';
        $kategori = isset($input['kategori']) ? trim($input['kategori']) : '';
        $jumlah = isset($input['jumlah']) ? (int)$input['jumlah'] : 0;
        $keterangan = isset($input['keterangan']) ? trim($input['keterangan']) : '';

        if (!$nama || !$kategori || $jumlah <= 0) {
            jsonResponse(400, ['message' => 'Nama, kategori, dan jumlah wajib diisi']);
        }

        try {
            $stmt = $db->prepare("INSERT INTO barang (nama, kategori, jumlah, keterangan, user_id) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$nama, $kategori, $jumlah, $keterangan, $user['id']]);
            $lastId = $db->lastInsertId();
            jsonResponse(201, ['message' => 'Barang berhasil ditambahkan', 'id' => (int)$lastId]);
        } catch (PDOException $e) {
            jsonResponse(500, ['message' => 'Gagal menambahkan barang']);
        }
        break;

    case 'DELETE':
        // Hapus barang (id dikirim via query string: ?id=X)
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

        if ($id <= 0) {
            jsonResponse(400, ['message' => 'ID barang tidak valid']);
        }

        try {
            $stmt = $db->prepare("DELETE FROM barang WHERE id = ? AND user_id = ?");
            $stmt->execute([$id, $user['id']]);
            
            if ($stmt->rowCount() === 0) {
                jsonResponse(404, ['message' => 'Barang tidak ditemukan atau bukan milik Anda']);
            }
            
            jsonResponse(200, ['message' => 'Barang berhasil dihapus']);
        } catch (PDOException $e) {
            jsonResponse(500, ['message' => 'Gagal menghapus barang']);
        }
        break;

    default:
        jsonResponse(405, ['message' => 'Method not allowed']);
        break;
}
?>
