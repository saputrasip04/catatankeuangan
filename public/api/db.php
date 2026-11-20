<?php
/**
 * api/db.php — Koneksi Database MySQL XAMPP (PDO)
 */

define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'catatan_keuangan');

function getDb() {
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $dsn = "mysql:host=" . DB_HOST . ";charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    try {
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        
        // Buat database jika belum ada
        $pdo->exec("CREATE DATABASE IF NOT EXISTS `" . DB_NAME . "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        $pdo->exec("USE `" . DB_NAME . "`");
        
        // Buat tabel jika belum ada
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS `transaksi` (
                `id` VARCHAR(64) NOT NULL,
                `type` ENUM('masuk', 'keluar') NOT NULL,
                `tanggal` VARCHAR(20) NOT NULL,
                `nama` VARCHAR(255) NOT NULL,
                `qty` DECIMAL(10, 2) DEFAULT NULL,
                `satuan` VARCHAR(50) DEFAULT NULL,
                `harga` DECIMAL(15, 2) DEFAULT NULL,
                `jumlah` DECIMAL(15, 2) NOT NULL DEFAULT 0,
                `fotoBarangUrl` TEXT DEFAULT NULL,
                `fotoNotaUrl` TEXT DEFAULT NULL,
                `catatan` TEXT DEFAULT NULL,
                `createdAt` BIGINT NOT NULL,
                `updatedAt` BIGINT NOT NULL,
                `deleted` TINYINT(1) NOT NULL DEFAULT 0,
                `version` INT NOT NULL DEFAULT 1,
                `clientId` VARCHAR(64) DEFAULT NULL,
                `bkuId` VARCHAR(64) DEFAULT NULL,
                PRIMARY KEY (`id`),
                INDEX `idx_updatedAt` (`updatedAt`),
                INDEX `idx_deleted` (`deleted`),
                INDEX `idx_bkuId` (`bkuId`),
                INDEX `idx_tanggal` (`tanggal`),
                INDEX `idx_type` (`type`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");

        return $pdo;
    } catch (PDOException $e) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'ok' => false,
            'data' => null,
            'error' => 'Gagal koneksi ke database MySQL XAMPP: ' . $e->getMessage()
        ]);
        exit;
    }
}
