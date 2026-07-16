# Manual QA Checklist

Gunakan checklist ini setelah schema Supabase terbaru sudah diterapkan dan akun OWNER bisa login.

## 1. Auth OWNER

- Buka `/login`, login dengan akun OWNER.
- Pastikan berhasil masuk dashboard.
- Klik logout, pastikan kembali ke `/login`.
- Akses salah satu halaman dashboard tanpa session, pastikan diarahkan ke login.

## 2. Penerimaan Unit

- Buka `/receipts`, pastikan empty state atau data tampil rapi.
- Buat receipt baru dari `/receipts/new`.
- Buka detail receipt, isi checklist inspeksi, lalu simpan.
- Klik `Accept`, pastikan confirm dialog muncul.
- Konfirmasi accept, pastikan toast sukses muncul dan status berubah `ACCEPTED`.
- Ulangi dengan receipt lain untuk `Reject`, pastikan catatan wajib, confirm dialog muncul, toast sukses muncul, dan status berubah `REJECTED`.

## 3. Inventory Unit

- Buka `/inventory`, masuk ke detail unit berstatus stok.
- Tambah biaya unit, pastikan toast sukses muncul dan total modal berubah.
- Update harga jual, pastikan toast sukses muncul dan estimasi laba berubah.
- Pastikan tabel riwayat biaya/harga tetap terbaca di tablet width.

## 4. Penjualan

- Buka `/sales/new`, buat draft sale dengan unit `IN_STOCK` atau `RESERVED`.
- Buka detail sale, klik `Complete Sale`, pastikan confirm dialog muncul.
- Konfirmasi complete, pastikan toast sukses muncul, sale menjadi `COMPLETED`, dan unit menjadi `SOLD`.
- Proses retur, pastikan confirm dialog muncul.
- Konfirmasi retur, pastikan toast sukses muncul dan unit kembali ke status target.

## 5. Keuangan

- Buka `/finance`.
- Submit setoran modal, prive, beban operasional, dan penyesuaian kas dengan nominal kecil.
- Pastikan toast sukses/error muncul sesuai hasil submit.
- Untuk transaksi keluar melebihi saldo, pastikan tombol submit disabled dan pesan saldo tidak cukup muncul.

## 6. Ledger, Laporan, Audit

- Buka `/reports`, pastikan dashboard dan semua tab laporan memuat tanpa error.
- Buka `/audit-logs`, filter action/entity/date, lalu buka detail.
- Pastikan old/new values tampil dalam modal dan modal bisa discroll di layar tablet.

## 7. Responsive

- Cek minimal di desktop lebar normal dan tablet width.
- Pastikan sidebar berubah menjadi menu overlay di layar kecil.
- Pastikan tabel horizontal scroll tanpa teks saling menimpa.
- Pastikan modal confirm dan detail audit tidak keluar dari viewport.
