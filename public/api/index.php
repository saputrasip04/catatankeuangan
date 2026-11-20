<?php
/**
 * api/index.php — REST / RPC Sync API untuk Catatan Keuangan via XAMPP MySQL
 */

// Header CORS agar dapat diakses dari localhost, IP LAN HP (192.168.x.x), maupun GitHub Pages
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/db.php';

function jsonOut($ok, $data = null, $error = null) {
    echo json_encode([
        'ok' => (bool)$ok,
        'data' => $data,
        'error' => $error
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$raw = file_get_contents('php://input');
$body = json_decode($raw, true);
if (!is_array($body)) {
    $body = $_POST;
}

$action = isset($body['action']) ? trim($body['action']) : (isset($_GET['action']) ? trim($_GET['action']) : 'test');

$pdo = getDb();

try {
    switch ($action) {
        case 'test':
            $stmt = $pdo->query("SELECT COUNT(*) AS total FROM `transaksi` WHERE `deleted` = 0");
            $row = $stmt->fetch();
            $totalActive = (int)($row['total'] ?? 0);
            
            $stmtBku = $pdo->query("SELECT COUNT(*) AS total_bku FROM `transaksi` WHERE `deleted` = 0 AND `type` = 'masuk'");
            $rowBku = $stmtBku->fetch();
            $totalBku = (int)($rowBku['total_bku'] ?? 0);

            jsonOut(true, [
                'status' => 'connected',
                'backend' => 'XAMPP MySQL',
                'database' => DB_NAME,
                'totalTransaksi' => $totalActive,
                'totalBku' => $totalBku,
                'serverTime' => round(microtime(true) * 1000)
            ]);
            break;

        case 'list':
            $since = isset($body['since']) ? (int)$body['since'] : (isset($_GET['since']) ? (int)$_GET['since'] : 0);
            
            $stmt = $pdo->prepare("
                SELECT * FROM `transaksi`
                WHERE `updatedAt` > :since
                ORDER BY `updatedAt` ASC
                LIMIT 5000
            ");
            $stmt->execute([':since' => $since]);
            $rows = $stmt->fetchAll();

            $items = [];
            foreach ($rows as $r) {
                $items[] = [
                    'id' => (string)$r['id'],
                    'type' => (string)$r['type'],
                    'tanggal' => (string)$r['tanggal'],
                    'nama' => (string)$r['nama'],
                    'qty' => $r['qty'] !== null ? (float)$r['qty'] : null,
                    'satuan' => $r['satuan'] !== null ? (string)$r['satuan'] : null,
                    'harga' => $r['harga'] !== null ? (float)$r['harga'] : null,
                    'jumlah' => (float)$r['jumlah'],
                    'fotoBarangUrl' => (string)($r['fotoBarangUrl'] ?? ''),
                    'fotoNotaUrl' => (string)($r['fotoNotaUrl'] ?? ''),
                    'catatan' => (string)($r['catatan'] ?? ''),
                    'createdAt' => (int)$r['createdAt'],
                    'updatedAt' => (int)$r['updatedAt'],
                    'deleted' => (bool)$r['deleted'],
                    'version' => (int)$r['version'],
                    'clientId' => (string)($r['clientId'] ?? ''),
                    'bkuId' => $r['bkuId'] ? (string)$r['bkuId'] : null
                ];
            }

            jsonOut(true, [
                'items' => $items,
                'serverTime' => round(microtime(true) * 1000)
            ]);
            break;

        case 'upsert':
            if (empty($body['item']) || !is_array($body['item'])) {
                jsonOut(false, null, 'invalid_input: missing item');
            }

            $item = $body['item'];
            $id = trim($item['id'] ?? '');
            if (!$id) {
                jsonOut(false, null, 'invalid_input: missing id');
            }

            $type = trim($item['type'] ?? 'keluar');
            $tanggal = trim($item['tanggal'] ?? date('Y-m-d'));
            $nama = trim($item['nama'] ?? 'Tanpa Nama');
            $qty = isset($item['qty']) && $item['qty'] !== '' && $item['qty'] !== null ? (float)$item['qty'] : null;
            $satuan = isset($item['satuan']) && $item['satuan'] !== '' && $item['satuan'] !== null ? trim($item['satuan']) : null;
            $harga = isset($item['harga']) && $item['harga'] !== '' && $item['harga'] !== null ? (float)$item['harga'] : null;
            $jumlah = isset($item['jumlah']) ? (float)$item['jumlah'] : 0.0;
            $fotoBarangUrl = trim($item['fotoBarangUrl'] ?? '');
            $fotoNotaUrl = trim($item['fotoNotaUrl'] ?? '');
            $catatan = trim($item['catatan'] ?? '');
            $createdAt = (int)($item['createdAt'] ?? round(microtime(true) * 1000));
            $updatedAt = (int)($item['updatedAt'] ?? round(microtime(true) * 1000));
            $deleted = !empty($item['deleted']) ? 1 : 0;
            $version = (int)($item['version'] ?? 1);
            $clientId = trim($item['clientId'] ?? '');
            $bkuId = !empty($item['bkuId']) ? trim($item['bkuId']) : null;

            // Pastikan jika update, hanya update jika updatedAt yang datang >= updatedAt di server
            $stmtCheck = $pdo->prepare("SELECT `updatedAt` FROM `transaksi` WHERE `id` = :id");
            $stmtCheck->execute([':id' => $id]);
            $existing = $stmtCheck->fetch();

            if ($existing && (int)$existing['updatedAt'] > $updatedAt) {
                // Konflik LWW (server memiliki data yang lebih baru)
                jsonOut(true, ['id' => $id, 'status' => 'ignored_older_version']);
            }

            $sql = "
                INSERT INTO `transaksi` (
                    `id`, `type`, `tanggal`, `nama`, `qty`, `satuan`, `harga`, `jumlah`,
                    `fotoBarangUrl`, `fotoNotaUrl`, `catatan`, `createdAt`, `updatedAt`,
                    `deleted`, `version`, `clientId`, `bkuId`
                ) VALUES (
                    :id, :type, :tanggal, :nama, :qty, :satuan, :harga, :jumlah,
                    :fotoBarangUrl, :fotoNotaUrl, :catatan, :createdAt, :updatedAt,
                    :deleted, :version, :clientId, :bkuId
                ) ON DUPLICATE KEY UPDATE
                    `type` = VALUES(`type`),
                    `tanggal` = VALUES(`tanggal`),
                    `nama` = VALUES(`nama`),
                    `qty` = VALUES(`qty`),
                    `satuan` = VALUES(`satuan`),
                    `harga` = VALUES(`harga`),
                    `jumlah` = VALUES(`jumlah`),
                    `fotoBarangUrl` = VALUES(`fotoBarangUrl`),
                    `fotoNotaUrl` = VALUES(`fotoNotaUrl`),
                    `catatan` = VALUES(`catatan`),
                    `updatedAt` = VALUES(`updatedAt`),
                    `deleted` = VALUES(`deleted`),
                    `version` = VALUES(`version`),
                    `clientId` = VALUES(`clientId`),
                    `bkuId` = VALUES(`bkuId`)
            ";

            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                ':id' => $id,
                ':type' => $type,
                ':tanggal' => $tanggal,
                ':nama' => $nama,
                ':qty' => $qty,
                ':satuan' => $satuan,
                ':harga' => $harga,
                ':jumlah' => $jumlah,
                ':fotoBarangUrl' => $fotoBarangUrl,
                ':fotoNotaUrl' => $fotoNotaUrl,
                ':catatan' => $catatan,
                ':createdAt' => $createdAt,
                ':updatedAt' => $updatedAt,
                ':deleted' => $deleted,
                ':version' => $version,
                ':clientId' => $clientId,
                ':bkuId' => $bkuId
            ]);

            jsonOut(true, ['id' => $id, 'updatedAt' => $updatedAt]);
            break;

        case 'delete':
            $id = trim($body['id'] ?? '');
            if (!$id) {
                jsonOut(false, null, 'invalid_input: missing id');
            }
            $updatedAt = (int)($body['updatedAt'] ?? round(microtime(true) * 1000));

            $stmt = $pdo->prepare("
                UPDATE `transaksi`
                SET `deleted` = 1, `updatedAt` = :updatedAt
                WHERE `id` = :id
            ");
            $stmt->execute([':id' => $id, ':updatedAt' => $updatedAt]);

            jsonOut(true, ['id' => $id, 'deleted' => true]);
            break;

        case 'upload':
            $id = trim($body['id'] ?? '');
            $kind = trim($body['kind'] ?? 'photo');
            $base64 = trim($body['base64'] ?? '');
            $mimeType = trim($body['mimeType'] ?? 'image/jpeg');

            if (!$id || !$base64) {
                jsonOut(false, null, 'invalid_input: missing id or base64');
            }

            // Folder penyimpanan upload
            $uploadDir = __DIR__ . '/uploads';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }

            // Bersihkan data base64 jika ada prefix data:image/...;base64,
            if (preg_match('/^data:image\/(\w+);base64,/', $base64, $matches)) {
                $ext = strtolower($matches[1]);
                if ($ext === 'jpeg') $ext = 'jpg';
                $base64 = substr($base64, strpos($base64, ',') + 1);
            } else {
                $ext = (strpos($mimeType, 'png') !== false) ? 'png' : 'jpg';
            }

            $binaryData = base64_decode($base64);
            if ($binaryData === false) {
                jsonOut(false, null, 'Gagal mendecode base64 gambar');
            }

            $fileName = $id . '_' . $kind . '_' . time() . '.' . $ext;
            $filePath = $uploadDir . '/' . $fileName;

            file_put_contents($filePath, $binaryData);

            // Bangun URL publik dinamis sesuai host pengakses (localhost atau IP LAN)
            $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https://" : "http://";
            $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
            
            // Path relatif terhadap htdocs
            $publicUrl = $protocol . $host . '/catatankeuangan/api/uploads/' . $fileName;

            jsonOut(true, [
                'url' => $publicUrl,
                'fileName' => $fileName
            ]);
            break;

        default:
            jsonOut(false, null, 'invalid_action: ' . $action);
            break;
    }
} catch (Exception $e) {
    jsonOut(false, null, 'server_error: ' . $e->getMessage());
}
