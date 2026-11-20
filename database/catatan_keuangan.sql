-- ==========================================================
-- Database Schema: Catatan Keuangan (XAMPP MySQL / MariaDB)
-- ==========================================================

CREATE DATABASE IF NOT EXISTS `catatan_keuangan` 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `catatan_keuangan`;

-- --------------------------------------------------------
-- Struktur Tabel `transaksi`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `transaksi` (
  `id` VARCHAR(64) NOT NULL COMMENT 'ID Unik UUID / NanoID Transaksi',
  `type` ENUM('masuk', 'keluar') NOT NULL COMMENT 'Jenis: masuk (pemasukan/BKU) atau keluar (pengeluaran)',
  `tanggal` VARCHAR(20) NOT NULL COMMENT 'Tanggal transaksi (YYYY-MM-DD)',
  `nama` VARCHAR(255) NOT NULL COMMENT 'Uraian atau Nama BKU/Pengeluaran',
  `qty` DECIMAL(10, 2) DEFAULT NULL COMMENT 'Jumlah kuantitas (opsional)',
  `satuan` VARCHAR(50) DEFAULT NULL COMMENT 'Satuan barang (opsional: rim, buah, pack)',
  `harga` DECIMAL(15, 2) DEFAULT NULL COMMENT 'Harga satuan (opsional)',
  `jumlah` DECIMAL(15, 2) NOT NULL DEFAULT 0.00 COMMENT 'Total nominal transaksi (Rp)',
  `fotoBarangUrl` TEXT DEFAULT NULL COMMENT 'URL foto fisik barang di server XAMPP / GDrive',
  `fotoNotaUrl` TEXT DEFAULT NULL COMMENT 'URL foto nota/invoice pembelian',
  `catatan` TEXT DEFAULT NULL COMMENT 'Catatan/keterangan tambahan',
  `createdAt` BIGINT NOT NULL COMMENT 'Timestamp pembuatan (epoch ms)',
  `updatedAt` BIGINT NOT NULL COMMENT 'Timestamp pembaruan terakhir (epoch ms)',
  `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Status soft-delete (0: aktif, 1: dihapus)',
  `version` INT NOT NULL DEFAULT 1 COMMENT 'Versi record untuk resolusi konflik sinkronisasi',
  `clientId` VARCHAR(64) DEFAULT NULL COMMENT 'ID unik perangkat pencatat',
  `bkuId` VARCHAR(64) DEFAULT NULL COMMENT 'ID BKU Pemasukan induk (khusus type=keluar)',
  PRIMARY KEY (`id`),
  INDEX `idx_updatedAt` (`updatedAt`),
  INDEX `idx_deleted` (`deleted`),
  INDEX `idx_bkuId` (`bkuId`),
  INDEX `idx_tanggal` (`tanggal`),
  INDEX `idx_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
