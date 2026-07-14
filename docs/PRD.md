# PRODUCT REQUIREMENTS DOCUMENT (PRD)

## POS & INVENTORY MANAGEMENT UNTUK JUAL BELI HP BEKAS

**Nama Produk:** RePhone POS  
**Versi Dokumen:** 1.0  
**Tanggal:** 14 Juli 2026  
**Status:** Draft Implementasi  
**Target Pengguna:** Pemilik usaha jual beli HP bekas skala personal atau mikro  
**Merek yang Didukung:** Samsung, Apple iPhone, Google Pixel

---

# 1. RINGKASAN PRODUK

RePhone POS adalah sistem Point of Sale, inventaris, dan keuangan sederhana untuk usaha jual beli HP bekas. Sistem dirancang untuk usaha dengan volume transaksi tidak tetap, setiap unit memiliki kondisi, modal, harga pasang, harga minimal, dan harga jual final yang berbeda.

Setiap HP diperlakukan sebagai satu unit unik berdasarkan kode stok, IMEI, dan serial number. Sistem tidak menggunakan konsep stok massal seperti minimarket, tetapi menggunakan pencatatan per perangkat.

Sistem dibagi menjadi tiga kelompok utama:

1. **Master** — data referensi yang digunakan berulang.
2. **Transaksi** — kejadian bisnis yang memengaruhi stok dan keuangan.
3. **Laporan** — hasil pengolahan data transaksi.

---

# 2. LATAR BELAKANG

Usaha jual beli HP bekas memiliki karakteristik:

- Jumlah unit masuk tidak konsisten.
- Harga beli setiap unit berbeda.
- Kondisi fisik dan fungsi setiap unit berbeda.
- Modal tidak hanya berasal dari harga beli.
- Harga jual dapat berubah akibat negosiasi.
- Satu tipe HP yang sama dapat memiliki modal dan kondisi berbeda.
- Pemilik perlu mengetahui laba per unit, bukan hanya omzet.
- Modal sering tertahan dalam unit yang belum terjual.
- Pengeluaran pribadi perlu dipisahkan dari pengeluaran usaha.
- Neraca perlu menunjukkan kas, persediaan, utang, dan modal pemilik.

Pencatatan manual berpotensi menyebabkan:

- Lupa total modal sebenarnya.
- Salah menghitung laba.
- Tidak mengetahui nilai stok.
- Uang pribadi dan uang usaha tercampur.
- Tidak mengetahui unit yang terlalu lama tersimpan.
- Sulit mengevaluasi merek atau model paling menguntungkan.
- Neraca dan arus kas tidak dapat diketahui secara akurat.

---

# 3. TUJUAN PRODUK

Sistem harus membantu pemilik usaha:

1. Mencatat setiap HP yang diterima saat COD.
2. Melakukan pemeriksaan perangkat dalam transaksi penerimaan.
3. Menghitung total modal setiap unit.
4. Mengelola harga pasang, harga minimal, dan harga jual final.
5. Mengetahui laba atau rugi per unit.
6. Mengetahui nilai persediaan yang belum terjual.
7. Memisahkan uang usaha dan pengambilan pribadi.
8. Menghasilkan jurnal akuntansi otomatis.
9. Menghasilkan laporan laba rugi, arus kas, dan neraca.
10. Mengetahui histori lengkap setiap unit berdasarkan IMEI.

---

# 4. SASARAN DAN NON-SASARAN

## 4.1 Sasaran MVP

- Pengguna tunggal.
- Satu bisnis.
- Satu lokasi penyimpanan utama.
- Pembelian unit dilakukan melalui transfer.
- Penjualan dapat menggunakan transfer atau tunai.
- Tidak ada diskon.
- Negosiasi dicatat melalui harga pasang, harga minimal, dan harga jual final.
- Pemeriksaan dilakukan saat penerimaan unit.
- Tidak ada transaksi perubahan kondisi terpisah.
- Stok dikelola per unit.
- Jurnal akuntansi dibuat otomatis.

## 4.2 Di Luar Ruang Lingkup MVP

- Sinkronisasi marketplace.
- Multi-cabang.
- Multi-gudang.
- Cicilan pelanggan.
- Payroll.
- Pajak kompleks.
- Integrasi bank otomatis.
- Dynamic pricing berbasis AI.
- Marketplace publik.
- Sistem chat dengan pelanggan.
- Aplikasi mobile native.
- Pengelolaan spare part sebagai stok terpisah.
- Reparasi sebagai bisnis jasa independen.

---

# 5. PERSONA PENGGUNA

## Pemilik Usaha

Karakteristik:

- Membeli HP bekas melalui COD.
- Langsung memeriksa unit.
- Membayar melalui transfer.
- Menjual kembali melalui marketplace, media sosial, teman, atau COD.
- Menentukan harga pasang dan batas harga minimal.
- Dapat menerima negosiasi.
- Ingin mengetahui laba bersih per unit.
- Membutuhkan laporan sederhana tetapi akurat.

---

# 6. PRINSIP SISTEM

## 6.1 Unit-Based Inventory

Setiap HP adalah satu record unik. Dua iPhone 13 dengan kapasitas dan warna sama tetap menjadi dua unit berbeda karena:

- IMEI berbeda.
- Kondisi berbeda.
- Harga beli berbeda.
- Biaya tambahan berbeda.
- Harga jual berbeda.
- Riwayat transaksi berbeda.

## 6.2 Harga Beli Bukan Selalu Total Modal

Rumus:

```text
Total Modal Unit =
Harga Beli
+ Biaya Transfer Pembelian
+ Biaya Servis
+ Biaya Aksesori
+ Biaya Cleaning
+ Biaya Transport Langsung
+ Biaya Langsung Lainnya
```

## 6.3 Harga Jual Final Bukan Selalu Net Terjual

Rumus:

```text
Net Terjual =
Harga Jual Final
- Biaya Admin Penjualan
- Ongkir Ditanggung Penjual
- Biaya Penjualan Langsung
```

```text
Laba/Rugi Unit =
Net Terjual
- Total Modal Unit
```

## 6.4 Harga Minimal Bersifat Internal

Harga minimal hanya dapat dilihat pemilik sistem. Nilai ini tidak muncul di invoice atau dokumen pelanggan.

## 6.5 Barang Belum Terjual Bukan Laba

Unit yang belum terjual tetap dicatat sebagai persediaan sebesar total modalnya.

## 6.6 Penarikan Pribadi Bukan Beban

Uang yang diambil pemilik untuk kepentingan pribadi dicatat sebagai prive, bukan pengeluaran operasional.

---

# 7. STRUKTUR MODUL

## 7.1 Modul Master

1. Master Merek
2. Master Model HP
3. Master Varian Penyimpanan
4. Master Warna
5. Master Kondisi Fisik
6. Master Kelengkapan
7. Master Checklist Pemeriksaan
8. Master Penjual
9. Master Pelanggan
10. Master Rekening
11. Master Kanal Penjualan
12. Master Kategori Biaya
13. Master Akun Keuangan
14. Master Periode Akuntansi
15. Master Pengguna

## 7.2 Modul Transaksi

1. Penerimaan Unit
2. Biaya Tambahan Unit
3. Penetapan Harga Jual
4. Penjualan Unit
5. Pengeluaran Operasional
6. Setor Modal
7. Prive
8. Penyesuaian Kas
9. Pembayaran Utang
10. Jurnal Penyesuaian
11. Stock Opname

## 7.3 Modul Laporan

1. Dashboard
2. Daftar Stok Aktif
3. Riwayat Unit
4. Laba/Rugi Per Unit
5. Laba Per Merek
6. Laba Per Model
7. Umur Stok
8. Rekap Pembelian
9. Rekap Penjualan
10. Laporan Pengeluaran
11. Laporan Laba Rugi
12. Laporan Arus Kas
13. Neraca
14. Buku Besar
15. Jurnal Umum
16. Rekap Modal dan Prive

---

# 8. ALUR BISNIS UTAMA

## 8.1 Penerimaan Unit

1. Pemilik bertemu penjual melalui COD.
2. Pemilik membuka form penerimaan unit.
3. Pemilik mengisi identitas perangkat.
4. Pemilik menjalankan checklist pemeriksaan.
5. Pemilik mengambil foto unit dan mengunggahnya ke Google Drive.
6. Pemilik menyimpan link folder atau album Google Drive ke data unit.
7. Pemilik mencatat kondisi dan minus.
8. Pemilik memutuskan:
   - Ditolak.
   - Diterima.
9. Jika ditolak:
   - Tidak ada stok.
   - Tidak ada jurnal.
   - Alasan penolakan disimpan.
10. Jika diterima:
   - Harga beli dicatat.
   - Pembayaran transfer dicatat.
   - Bukti pembayaran diunggah ke Google Drive.
   - Link bukti pembayaran disimpan pada transaksi penerimaan.
   - Unit masuk persediaan.
   - Status unit menjadi `IN_STOCK`.
   - Jurnal otomatis dibuat.

## 8.2 Tambah Biaya Unit

1. Pemilik memilih unit.
2. Pemilik menambahkan biaya langsung.
3. Sistem menambah total modal unit.
4. Jika biaya dibayar:
   - Saldo rekening berkurang.
   - Nilai persediaan bertambah.
5. Riwayat biaya disimpan.

## 8.3 Penetapan Harga

1. Pemilik menetapkan harga pasang.
2. Pemilik menetapkan harga minimal.
3. Sistem menghitung estimasi laba:
   - Pada harga pasang.
   - Pada harga minimal.
4. Harga minimal tidak ditampilkan ke pelanggan.

## 8.4 Penjualan

1. Pemilik memilih unit berstatus tersedia.
2. Sistem menampilkan:
   - Total modal.
   - Harga pasang.
   - Harga minimal.
3. Pemilik mengisi harga jual final.
4. Sistem menampilkan indikator:
   - Di atas harga pasang.
   - Sesuai target.
   - Di bawah harga minimal.
   - Balik modal.
   - Rugi.
5. Pemilik mengisi biaya penjualan.
6. Sistem menghitung net terjual.
7. Sistem menghitung laba/rugi.
8. Pemilik mengunggah bukti pembayaran penjualan ke Google Drive.
9. Pemilik menyimpan link bukti pembayaran pada transaksi penjualan.
10. Pemilik menyelesaikan transaksi.
11. Status unit menjadi `SOLD`.
12. Jurnal otomatis dibuat.

## 8.5 Retur Penjualan

1. Pemilik memilih transaksi penjualan.
2. Pemilik mencatat alasan retur.
3. Pemilik mencatat kondisi unit saat kembali.
4. Pemilik menentukan:
   - Unit kembali ke stok.
   - Unit masuk servis.
   - Unit rusak.
5. Sistem membalik jurnal penjualan.
6. Sistem mencatat pengembalian dana.

---

# 9. STATUS UNIT

```text
DRAFT
INSPECTION
REJECTED
IN_STOCK
RESERVED
SOLD
RETURNED
SERVICE
DAMAGED
LOST
WRITTEN_OFF
```

Penjelasan:

- `DRAFT`: data belum selesai.
- `INSPECTION`: sedang diperiksa.
- `REJECTED`: unit tidak jadi dibeli.
- `IN_STOCK`: unit tersedia untuk dijual.
- `RESERVED`: unit dipesan.
- `SOLD`: unit terjual.
- `DAMAGED`: unit rusak.
- `WRITTEN_OFF`: nilai unit dihapuskan.

---

# 10. ATURAN BISNIS

## 10.1 Penerimaan

- IMEI 1 wajib diisi.
- IMEI tidak boleh duplikat pada unit aktif.
- Merek hanya boleh Samsung, Apple, atau Google.
- Pembelian yang diterima wajib memiliki nomor referensi transfer.
- Pembelian yang diterima wajib memiliki link Google Drive bukti pembayaran.
- Setiap unit yang diterima wajib memiliki link Google Drive dokumentasi foto unit.
- Unit ditolak tidak menghasilkan jurnal.
- Harga beli harus lebih dari nol.
- Checklist pemeriksaan wajib diselesaikan sebelum status diterima.
- Akun iCloud atau Google harus tercatat statusnya.
- Status IMEI wajib dicatat.

## 10.2 Harga

- Harga pasang harus lebih besar dari nol.
- Harga minimal boleh sama dengan atau lebih besar dari total modal.
- Sistem tetap mengizinkan harga minimal di bawah modal dengan peringatan.
- Harga jual final dapat berada di bawah harga minimal, tetapi membutuhkan konfirmasi.
- Harga jual final di bawah total modal harus menghasilkan peringatan kerugian.
- Perubahan harga harus memiliki histori.

## 10.3 Penjualan

- Hanya unit `IN_STOCK` atau `RESERVED` yang dapat dijual.
- Unit yang terjual tidak dapat dijual kembali tanpa retur.
- Penjualan tidak menggunakan diskon.
- Selisih harga pasang dan harga jual final dianggap hasil negosiasi.
- Laba dihitung dari net terjual, bukan harga jual final.
- Nominal pembayaran harus sama dengan harga jual final untuk transaksi lunas.
- Penjualan yang diselesaikan wajib memiliki link Google Drive bukti pembayaran.
- Link Google Drive harus menggunakan URL yang valid dan dapat diakses sesuai kebijakan pengguna.

## 10.4 Keuangan

- Semua transaksi yang memengaruhi uang wajib memilih rekening.
- Setor modal menambah ekuitas.
- Prive mengurangi ekuitas.
- Biaya unit menambah nilai persediaan.
- Biaya operasional mengurangi laba.
- Saldo rekening tidak boleh menjadi negatif kecuali fitur overdraft diaktifkan.
- Jurnal transaksi yang sudah diposting tidak boleh dihapus; hanya dapat dibatalkan melalui reversal.

---

# 11. STRUKTUR DATA

## 11.1 Konvensi Umum

Semua tabel transaksi memiliki field:

| Field | Tipe | Aturan |
|---|---|---|
| id | UUID | Primary key |
| created_at | timestamp | Waktu dibuat |
| updated_at | timestamp | Waktu diperbarui |
| created_by | UUID | Pengguna pembuat |
| updated_by | UUID nullable | Pengguna pengubah |
| deleted_at | timestamp nullable | Soft delete |
| notes | text nullable | Catatan |
| version | integer | Optimistic locking |

Nominal uang disimpan menggunakan:

```text
decimal(18,2)
```

Semua tanggal transaksi disimpan dalam timezone aplikasi.

---

## 11.2 Tabel `users`

| Field | Tipe | Null | Keterangan |
|---|---|---:|---|
| id | UUID | Tidak | Primary key |
| name | varchar(100) | Tidak | Nama pengguna |
| email | varchar(150) | Tidak | Email unik |
| password_hash | varchar(255) | Tidak | Hash password |
| role | enum | Tidak | OWNER, ADMIN |
| is_active | boolean | Tidak | Status akun |
| last_login_at | timestamp | Ya | Login terakhir |
| created_at | timestamp | Tidak | Waktu dibuat |
| updated_at | timestamp | Tidak | Waktu diperbarui |

---

## 11.3 Tabel `brands`

| Field | Tipe | Null | Keterangan |
|---|---|---:|---|
| id | UUID | Tidak | Primary key |
| code | varchar(20) | Tidak | SAMSUNG, APPLE, GOOGLE |
| name | varchar(50) | Tidak | Nama merek |
| is_active | boolean | Tidak | Status |
| sort_order | integer | Tidak | Urutan tampilan |

Seed data:

```text
SAMSUNG
APPLE
GOOGLE
```

---

## 11.4 Tabel `phone_models`

| Field | Tipe | Null | Keterangan |
|---|---|---:|---|
| id | UUID | Tidak | Primary key |
| brand_id | UUID | Tidak | FK brands |
| model_code | varchar(50) | Tidak | Kode internal |
| model_name | varchar(100) | Tidak | Contoh iPhone 13 |
| series_name | varchar(100) | Ya | Contoh Galaxy S |
| release_year | smallint | Ya | Tahun rilis |
| default_sim_type | enum | Ya | SINGLE, DUAL, ESIM, HYBRID |
| default_os | varchar(50) | Ya | iOS/Android |
| is_active | boolean | Tidak | Status |

Unique:

```text
brand_id + model_name
```

---

## 11.5 Tabel `storage_variants`

| Field | Tipe | Null | Keterangan |
|---|---|---:|---|
| id | UUID | Tidak | Primary key |
| capacity_gb | integer | Tidak | 64, 128, 256 |
| label | varchar(30) | Tidak | 128 GB |
| is_active | boolean | Tidak | Status |

---

## 11.6 Tabel `colors`

| Field | Tipe | Null | Keterangan |
|---|---|---:|---|
| id | UUID | Tidak | Primary key |
| brand_id | UUID | Ya | Warna khusus merek |
| name | varchar(50) | Tidak | Midnight |
| hex_code | varchar(7) | Ya | Referensi UI |
| is_active | boolean | Tidak | Status |

---

## 11.7 Tabel `physical_conditions`

| Field | Tipe | Null | Keterangan |
|---|---|---:|---|
| id | UUID | Tidak | Primary key |
| code | varchar(20) | Tidak | MULUS, LECET_TIPIS |
| name | varchar(100) | Tidak | Nama kondisi |
| score_min | integer | Ya | Nilai minimal |
| score_max | integer | Ya | Nilai maksimal |
| description | text | Ya | Deskripsi |
| is_active | boolean | Tidak | Status |

Contoh:

```text
LIKE_NEW
MULUS
LECET_TIPIS
LECET_PEMAKAIAN
MINUS_FISIK
BEKAS_SERVIS
```

---

## 11.8 Tabel `accessory_types`

| Field | Tipe | Null | Keterangan |
|---|---|---:|---|
| id | UUID | Tidak | Primary key |
| code | varchar(30) | Tidak | BOX, CHARGER |
| name | varchar(100) | Tidak | Nama kelengkapan |
| is_active | boolean | Tidak | Status |

Seed:

```text
UNIT
BOX
CHARGER
CABLE
CASE
TEMPERED_GLASS
INVOICE
SIM_EJECTOR
```

---

## 11.9 Tabel `inspection_items`

| Field | Tipe | Null | Keterangan |
|---|---|---:|---|
| id | UUID | Tidak | Primary key |
| code | varchar(50) | Tidak | SCREEN_DISPLAY |
| category | enum | Tidak | PHYSICAL, FUNCTION, SECURITY, NETWORK |
| name | varchar(150) | Tidak | Nama pemeriksaan |
| input_type | enum | Tidak | STATUS, BOOLEAN, NUMBER, TEXT |
| unit_label | varchar(20) | Ya | %, cycle |
| is_required | boolean | Tidak | Wajib |
| applies_to_brand_id | UUID | Ya | Khusus merek |
| sort_order | integer | Tidak | Urutan |
| is_active | boolean | Tidak | Status |

Checklist contoh:

### Fisik
- Layar
- Frame
- Backdoor
- Kamera lens
- Tombol
- Port charger
- Bekas bongkar

### Fungsi
- Touchscreen
- Kamera depan
- Kamera utama
- Kamera ultrawide
- Kamera telephoto
- Flash
- Speaker
- Mikrofon
- Vibration
- Wi-Fi
- Bluetooth
- GPS
- NFC
- SIM 1
- SIM 2
- E-SIM
- Fingerprint
- Face ID
- Proximity sensor
- Gyroscope
- Charging
- Wireless charging

### Keamanan
- iCloud status
- Google account status
- Find My status
- Bootloader status
- Root/Jailbreak status
- IMEI status
- MDM status

### Baterai
- Battery health
- Cycle count
- Battery warning
- Charging stability

---

## 11.10 Tabel `sellers`

| Field | Tipe | Null | Keterangan |
|---|---|---:|---|
| id | UUID | Tidak | Primary key |
| seller_code | varchar(30) | Tidak | Kode penjual |
| name | varchar(150) | Tidak | Nama |
| phone | varchar(30) | Ya | Nomor WhatsApp |
| identity_number | varchar(100) | Ya | Opsional |
| city | varchar(100) | Ya | Kota |
| address | text | Ya | Alamat |
| source_channel | varchar(100) | Ya | Facebook, teman |
| risk_flag | boolean | Tidak | Penanda risiko |
| risk_notes | text | Ya | Catatan |
| is_active | boolean | Tidak | Status |

---

## 11.11 Tabel `customers`

| Field | Tipe | Null | Keterangan |
|---|---|---:|---|
| id | UUID | Tidak | Primary key |
| customer_code | varchar(30) | Tidak | Kode pelanggan |
| name | varchar(150) | Tidak | Nama |
| phone | varchar(30) | Ya | WhatsApp |
| city | varchar(100) | Ya | Kota |
| address | text | Ya | Alamat |
| is_repeat_customer | boolean | Tidak | Pelanggan ulang |
| is_blocked | boolean | Tidak | Blokir |
| blocked_reason | text | Ya | Alasan |

---

## 11.12 Tabel `accounts`

Digunakan untuk kas, bank, dan akun akuntansi.

| Field | Tipe | Null | Keterangan |
|---|---|---:|---|
| id | UUID | Tidak | Primary key |
| account_code | varchar(30) | Tidak | 1101 |
| account_name | varchar(150) | Tidak | Bank BCA |
| account_type | enum | Tidak | ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE |
| account_subtype | enum | Tidak | CASH, BANK, INVENTORY, CAPITAL, dll |
| parent_id | UUID | Ya | Akun induk |
| normal_balance | enum | Tidak | DEBIT, CREDIT |
| allow_manual_entry | boolean | Tidak | Boleh jurnal manual |
| is_cash_account | boolean | Tidak | Akun uang |
| is_active | boolean | Tidak | Status |

---

## 11.13 Tabel `bank_accounts`

| Field | Tipe | Null | Keterangan |
|---|---|---:|---|
| id | UUID | Tidak | Primary key |
| account_id | UUID | Tidak | FK accounts |
| bank_name | varchar(100) | Tidak | Nama bank |
| account_number_masked | varchar(50) | Ya | Nomor tersamarkan |
| account_holder | varchar(150) | Tidak | Pemilik rekening |
| opening_balance | decimal(18,2) | Tidak | Saldo awal |
| is_default_purchase | boolean | Tidak | Default pembelian |
| is_default_sales | boolean | Tidak | Default penjualan |
| is_active | boolean | Tidak | Status |

---

## 11.14 Tabel `sales_channels`

| Field | Tipe | Null | Keterangan |
|---|---|---:|---|
| id | UUID | Tidak | Primary key |
| code | varchar(30) | Tidak | FACEBOOK |
| name | varchar(100) | Tidak | Facebook Marketplace |
| default_fee_type | enum | Tidak | NONE, FIXED, PERCENTAGE |
| default_fee_value | decimal(18,2) | Tidak | Nilai fee |
| is_active | boolean | Tidak | Status |

---

## 11.15 Tabel `cost_categories`

| Field | Tipe | Null | Keterangan |
|---|---|---:|---|
| id | UUID | Tidak | Primary key |
| code | varchar(30) | Tidak | SERVICE |
| name | varchar(100) | Tidak | Servis |
| scope | enum | Tidak | UNIT, OPERATING, SALES |
| expense_account_id | UUID | Ya | Akun beban |
| inventory_account_id | UUID | Ya | Akun persediaan |
| is_active | boolean | Tidak | Status |

Contoh:

### UNIT
- Servis
- Spare part
- Cleaning
- Tempered glass
- Charger
- Transport pengambilan
- Biaya transfer pembelian

### SALES
- Admin marketplace
- Ongkir ditanggung
- Packaging
- Transport COD penjualan

### OPERATING
- Internet
- Iklan umum
- Langganan aplikasi
- ATK
- Biaya bank
- Transport operasional

---

# 12. DATA TRANSAKSI UTAMA

## 12.1 Tabel `unit_receipts`

Header transaksi penerimaan.

| Field | Tipe | Null | Keterangan |
|---|---|---:|---|
| id | UUID | Tidak | Primary key |
| receipt_number | varchar(40) | Tidak | Nomor unik |
| receipt_date | date | Tidak | Tanggal COD |
| seller_id | UUID | Tidak | FK sellers |
| status | enum | Tidak | DRAFT, INSPECTION, ACCEPTED, REJECTED |
| decision_at | timestamp | Ya | Waktu keputusan |
| rejection_reason_code | varchar(50) | Ya | Alasan |
| rejection_notes | text | Ya | Detail |
| purchase_account_id | UUID | Ya | Rekening pembayaran |
| transfer_reference | varchar(100) | Ya | Nomor referensi transfer |
| payment_proof_drive_url | text | Ya | Link Google Drive bukti pembayaran pembelian |
| payment_proof_file_name | varchar(255) | Ya | Nama file bukti pembayaran |
| payment_proof_uploaded_at | timestamp | Ya | Waktu link bukti dicatat |
| transfer_proof_url | text | Ya | Field kompatibilitas lama; diarahkan ke link Drive |
| purchase_price | decimal(18,2) | Ya | Harga beli |
| transfer_fee | decimal(18,2) | Tidak | Biaya transfer |
| initial_unit_cost | decimal(18,2) | Ya | Harga + fee |
| cod_location | varchar(255) | Ya | Lokasi COD |
| latitude | decimal(10,7) | Ya | Opsional |
| longitude | decimal(10,7) | Ya | Opsional |
| inspected_by | UUID | Tidak | Pemeriksa |
| journal_entry_id | UUID | Ya | Jurnal otomatis |

Nomor:

```text
RCV-YYYYMM-0001
```

---

## 12.2 Tabel `phone_units`

Satu record untuk satu HP.

| Field | Tipe | Null | Keterangan |
|---|---|---:|---|
| id | UUID | Tidak | Primary key |
| stock_code | varchar(40) | Tidak | Kode stok unik |
| receipt_id | UUID | Tidak | FK unit_receipts |
| brand_id | UUID | Tidak | FK brands |
| model_id | UUID | Tidak | FK phone_models |
| storage_variant_id | UUID | Tidak | Kapasitas |
| color_id | UUID | Ya | Warna |
| imei_1 | varchar(20) | Tidak | IMEI utama |
| imei_2 | varchar(20) | Ya | IMEI kedua |
| serial_number | varchar(100) | Ya | Serial |
| physical_condition_id | UUID | Tidak | Kondisi |
| physical_score | integer | Ya | 0–100 |
| battery_health | decimal(5,2) | Ya | Persentase |
| battery_cycle_count | integer | Ya | Cycle |
| is_ex_service | boolean | Tidak | Bekas servis |
| service_history_notes | text | Ya | Riwayat |
| icloud_status | enum | Ya | CLEAN, LOCKED, UNKNOWN, NA |
| google_account_status | enum | Ya | CLEAN, LOCKED, UNKNOWN, NA |
| imei_status | enum | Tidak | REGISTERED, UNREGISTERED, BLOCKED, UNKNOWN |
| mdm_status | enum | Tidak | CLEAN, ENROLLED, UNKNOWN, NA |
| root_jailbreak_status | enum | Tidak | CLEAN, DETECTED, UNKNOWN |
| warranty_type | enum | Tidak | NONE, OFFICIAL, STORE, PERSONAL |
| warranty_end_date | date | Ya | Akhir garansi |
| stock_status | enum | Tidak | Status unit |
| purchase_cost | decimal(18,2) | Tidak | Harga beli |
| unit_additional_cost | decimal(18,2) | Tidak | Total biaya |
| total_unit_cost | decimal(18,2) | Tidak | Total modal |
| current_listing_price | decimal(18,2) | Ya | Harga pasang |
| current_minimum_price | decimal(18,2) | Ya | Harga minimal |
| acquired_at | timestamp | Tidak | Tanggal masuk |
| sold_at | timestamp | Ya | Tanggal terjual |
| days_in_stock | integer | Tidak | Nilai terhitung |
| photo_cover_url | text | Ya | Foto utama untuk tampilan sistem |
| google_drive_folder_url | text | Tidak | Link folder Google Drive dokumentasi unit |
| google_drive_photo_url | text | Tidak | Link foto utama atau album foto unit di Google Drive |
| google_drive_access_note | varchar(255) | Ya | Catatan akses/link Drive |

Unique:

```text
imei_1
stock_code
```

Kode stok:

```text
APL-IP13-0001
SMS-S23-0001
GGL-PX7-0001
```

---

## 12.3 Tabel `unit_accessories`

| Field | Tipe | Null | Keterangan |
|---|---|---:|---|
| id | UUID | Tidak | Primary key |
| phone_unit_id | UUID | Tidak | FK phone_units |
| accessory_type_id | UUID | Tidak | Jenis |
| is_included | boolean | Tidak | Tersedia |
| condition_notes | text | Ya | Kondisi |
| estimated_value | decimal(18,2) | Tidak | Nilai informasi |

---

## 12.4 Tabel `unit_inspection_results`

| Field | Tipe | Null | Keterangan |
|---|---|---:|---|
| id | UUID | Tidak | Primary key |
| phone_unit_id | UUID | Tidak | FK |
| inspection_item_id | UUID | Tidak | FK checklist |
| status_value | enum | Ya | NORMAL, ISSUE, NOT_AVAILABLE, NOT_CHECKED |
| boolean_value | boolean | Ya | Input boolean |
| numeric_value | decimal(18,2) | Ya | Angka |
| text_value | text | Ya | Catatan |
| issue_severity | enum | Ya | MINOR, MEDIUM, MAJOR, CRITICAL |
| affects_purchase | boolean | Tidak | Pengaruh keputusan |
| affects_price | boolean | Tidak | Pengaruh harga |
| inspected_at | timestamp | Tidak | Waktu |
| inspected_by | UUID | Tidak | Pengguna |

Unique:

```text
phone_unit_id + inspection_item_id
```

---

## 12.5 Tabel `unit_photos`

| Field | Tipe | Null | Keterangan |
|---|---|---:|---|
| id | UUID | Tidak | Primary key |
| phone_unit_id | UUID | Tidak | FK |
| photo_type | enum | Tidak | FRONT, BACK, LEFT, RIGHT, SCREEN, IMEI, DEFECT, ACCESSORY |
| file_url | text | Tidak | Link file foto, termasuk Google Drive |
| caption | varchar(255) | Ya | Keterangan |
| is_cover | boolean | Tidak | Foto utama |
| uploaded_at | timestamp | Tidak | Waktu |

---

## 12.6 Tabel `unit_costs`

Biaya langsung setelah penerimaan.

| Field | Tipe | Null | Keterangan |
|---|---|---:|---|
| id | UUID | Tidak | Primary key |
| cost_number | varchar(40) | Tidak | Nomor |
| phone_unit_id | UUID | Tidak | Unit |
| cost_date | date | Tidak | Tanggal |
| cost_category_id | UUID | Tidak | Kategori |
| description | varchar(255) | Tidak | Detail |
| amount | decimal(18,2) | Tidak | Nominal |
| payment_account_id | UUID | Tidak | Rekening |
| vendor_name | varchar(150) | Ya | Vendor |
| payment_reference | varchar(100) | Ya | Referensi |
| proof_url | text | Ya | Bukti |
| status | enum | Tidak | DRAFT, POSTED, VOID |
| journal_entry_id | UUID | Ya | Jurnal |

Nomor:

```text
UC-YYYYMM-0001
```

---

## 12.7 Tabel `unit_price_histories`

| Field | Tipe | Null | Keterangan |
|---|---|---:|---|
| id | UUID | Tidak | Primary key |
| phone_unit_id | UUID | Tidak | Unit |
| effective_at | timestamp | Tidak | Waktu berlaku |
| listing_price | decimal(18,2) | Tidak | Harga pasang |
| minimum_price | decimal(18,2) | Tidak | Harga minimal |
| estimated_profit_listing | decimal(18,2) | Tidak | Estimasi laba |
| estimated_profit_minimum | decimal(18,2) | Tidak | Estimasi laba min |
| change_reason | text | Ya | Alasan |
| changed_by | UUID | Tidak | Pengguna |

---

## 12.8 Tabel `sales`

Header penjualan.

| Field | Tipe | Null | Keterangan |
|---|---|---:|---|
| id | UUID | Tidak | Primary key |
| sale_number | varchar(40) | Tidak | Nomor transaksi |
| sale_date | date | Tidak | Tanggal |
| customer_id | UUID | Ya | Pelanggan |
| sales_channel_id | UUID | Tidak | Kanal |
| status | enum | Tidak | DRAFT, COMPLETED, RETURNED, VOID |
| payment_method | enum | Tidak | CASH, TRANSFER |
| receiving_account_id | UUID | Tidak | Rekening penerimaan |
| payment_reference | varchar(100) | Ya | Nomor referensi pembayaran |
| payment_proof_drive_url | text | Ya | Link Google Drive bukti pembayaran penjualan |
| payment_proof_file_name | varchar(255) | Ya | Nama file bukti pembayaran |
| payment_proof_uploaded_at | timestamp | Ya | Waktu link bukti dicatat |
| payment_proof_url | text | Ya | Field kompatibilitas lama; diarahkan ke link Drive |
| gross_sale_amount | decimal(18,2) | Tidak | Harga final |
| direct_sales_cost | decimal(18,2) | Tidak | Biaya jual |
| net_sale_amount | decimal(18,2) | Tidak | Net terjual |
| total_cost_of_goods | decimal(18,2) | Tidak | HPP |
| gross_profit | decimal(18,2) | Tidak | Laba kotor |
| warranty_days | integer | Tidak | Lama garansi |
| warranty_end_date | date | Ya | Akhir garansi |
| negotiation_notes | text | Ya | Catatan nego |
| completed_at | timestamp | Ya | Selesai |
| journal_entry_id | UUID | Ya | Jurnal |

Nomor:

```text
SAL-YYYYMM-0001
```

---

## 12.9 Tabel `sale_items`

MVP tetap satu unit per transaksi, tetapi struktur mendukung lebih dari satu unit.

| Field | Tipe | Null | Keterangan |
|---|---|---:|---|
| id | UUID | Tidak | Primary key |
| sale_id | UUID | Tidak | Header |
| phone_unit_id | UUID | Tidak | Unit |
| listed_price_snapshot | decimal(18,2) | Tidak | Harga pasang |
| minimum_price_snapshot | decimal(18,2) | Tidak | Harga minimal |
| final_sale_price | decimal(18,2) | Tidak | Harga final |
| unit_cost_snapshot | decimal(18,2) | Tidak | Total modal |
| negotiation_difference | decimal(18,2) | Tidak | Pasang - final |
| unit_sales_cost | decimal(18,2) | Tidak | Biaya jual |
| net_unit_sale | decimal(18,2) | Tidak | Net |
| unit_profit_loss | decimal(18,2) | Tidak | Laba/rugi |
| margin_percentage | decimal(8,4) | Tidak | Margin |

Rumus:

```text
negotiation_difference =
listed_price_snapshot - final_sale_price
```

```text
net_unit_sale =
final_sale_price - unit_sales_cost
```

```text
unit_profit_loss =
net_unit_sale - unit_cost_snapshot
```

```text
margin_percentage =
unit_profit_loss / net_unit_sale × 100
```

---

## 12.10 Tabel `sale_costs`

| Field | Tipe | Null | Keterangan |
|---|---|---:|---|
| id | UUID | Tidak | Primary key |
| sale_id | UUID | Tidak | Penjualan |
| cost_category_id | UUID | Tidak | Kategori SALES |
| description | varchar(255) | Tidak | Detail |
| amount | decimal(18,2) | Tidak | Nilai |
| paid_from_account_id | UUID | Ya | Rekening |
| is_deducted_from_receipt | boolean | Tidak | Dipotong langsung |

---

## 12.11 Tabel `sale_returns`

| Field | Tipe | Null | Keterangan |
|---|---|---:|---|
| id | UUID | Tidak | Primary key |
| return_number | varchar(40) | Tidak | Nomor |
| sale_id | UUID | Tidak | Penjualan |
| phone_unit_id | UUID | Tidak | Unit |
| return_date | date | Tidak | Tanggal |
| reason_code | enum | Tidak | DEFECT, NOT_AS_DESCRIBED, WARRANTY, OTHER |
| reason_notes | text | Tidak | Detail |
| refund_amount | decimal(18,2) | Tidak | Pengembalian |
| refund_account_id | UUID | Tidak | Rekening |
| returned_unit_status | enum | Tidak | IN_STOCK, SERVICE, DAMAGED |
| condition_after_return | text | Tidak | Kondisi |
| status | enum | Tidak | DRAFT, COMPLETED, VOID |
| journal_entry_id | UUID | Ya | Jurnal |

---

## 12.12 Tabel `warranty_claims`

| Field | Tipe | Null | Keterangan |
|---|---|---:|---|
| id | UUID | Tidak | Primary key |
| claim_number | varchar(40) | Tidak | Nomor |
| sale_id | UUID | Tidak | Penjualan |
| phone_unit_id | UUID | Tidak | Unit |
| claim_date | date | Tidak | Tanggal |
| complaint | text | Tidak | Keluhan |
| inspection_result | text | Ya | Hasil |
| resolution | enum | Ya | REPAIR, REPLACE, REFUND, REJECT |
| resolution_cost | decimal(18,2) | Tidak | Biaya |
| status | enum | Tidak | OPEN, PROCESS, RESOLVED, REJECTED |
| resolved_at | timestamp | Ya | Selesai |

---

# 13. TRANSAKSI KEUANGAN

## 13.1 Tabel `capital_contributions`

| Field | Tipe | Null | Keterangan |
|---|---|---:|---|
| id | UUID | Tidak | Primary key |
| contribution_number | varchar(40) | Tidak | Nomor |
| contribution_date | date | Tidak | Tanggal |
| amount | decimal(18,2) | Tidak | Nominal |
| receiving_account_id | UUID | Tidak | Rekening |
| description | text | Ya | Catatan |
| journal_entry_id | UUID | Tidak | Jurnal |

---

## 13.2 Tabel `owner_drawings`

| Field | Tipe | Null | Keterangan |
|---|---|---:|---|
| id | UUID | Tidak | Primary key |
| drawing_number | varchar(40) | Tidak | Nomor |
| drawing_date | date | Tidak | Tanggal |
| amount | decimal(18,2) | Tidak | Nominal |
| source_account_id | UUID | Tidak | Rekening |
| purpose | text | Ya | Tujuan pribadi |
| journal_entry_id | UUID | Tidak | Jurnal |

---

## 13.3 Tabel `operating_expenses`

| Field | Tipe | Null | Keterangan |
|---|---|---:|---|
| id | UUID | Tidak | Primary key |
| expense_number | varchar(40) | Tidak | Nomor |
| expense_date | date | Tidak | Tanggal |
| cost_category_id | UUID | Tidak | OPERATING |
| description | varchar(255) | Tidak | Detail |
| amount | decimal(18,2) | Tidak | Nominal |
| payment_account_id | UUID | Tidak | Rekening |
| vendor_name | varchar(150) | Ya | Penerima |
| proof_url | text | Ya | Bukti |
| journal_entry_id | UUID | Tidak | Jurnal |

---

## 13.4 Tabel `cash_adjustments`

| Field | Tipe | Null | Keterangan |
|---|---|---:|---|
| id | UUID | Tidak | Primary key |
| adjustment_number | varchar(40) | Tidak | Nomor |
| adjustment_date | date | Tidak | Tanggal |
| account_id | UUID | Tidak | Kas/rekening |
| adjustment_type | enum | Tidak | INCREASE, DECREASE |
| amount | decimal(18,2) | Tidak | Nominal |
| reason | text | Tidak | Alasan |
| approved_by | UUID | Tidak | Penyetuju |
| journal_entry_id | UUID | Tidak | Jurnal |

---

# 14. JURNAL AKUNTANSI

## 14.1 Tabel `journal_entries`

| Field | Tipe | Null | Keterangan |
|---|---|---:|---|
| id | UUID | Tidak | Primary key |
| journal_number | varchar(40) | Tidak | Nomor |
| transaction_date | date | Tidak | Tanggal |
| source_module | enum | Tidak | RECEIPT, SALE, COST, CAPITAL, dll |
| source_id | UUID | Tidak | ID sumber |
| description | varchar(255) | Tidak | Uraian |
| status | enum | Tidak | DRAFT, POSTED, REVERSED |
| total_debit | decimal(18,2) | Tidak | Total debit |
| total_credit | decimal(18,2) | Tidak | Total kredit |
| posted_at | timestamp | Ya | Waktu posting |
| reversed_entry_id | UUID | Ya | Referensi reversal |

Validasi:

```text
total_debit = total_credit
```

---

## 14.2 Tabel `journal_lines`

| Field | Tipe | Null | Keterangan |
|---|---|---:|---|
| id | UUID | Tidak | Primary key |
| journal_entry_id | UUID | Tidak | Header |
| account_id | UUID | Tidak | Akun |
| description | varchar(255) | Ya | Uraian |
| debit | decimal(18,2) | Tidak | Debit |
| credit | decimal(18,2) | Tidak | Kredit |
| phone_unit_id | UUID | Ya | Unit terkait |
| seller_id | UUID | Ya | Penjual |
| customer_id | UUID | Ya | Pelanggan |

Aturan:

- Salah satu debit atau kredit harus nol.
- Tidak boleh keduanya lebih dari nol.
- Tidak boleh keduanya nol.

---

# 15. CHART OF ACCOUNTS MINIMAL

## Aset

| Kode | Akun |
|---|---|
| 1101 | Kas Tunai |
| 1102 | Bank/Rekening Usaha |
| 1201 | Persediaan HP Bekas |
| 1202 | Piutang Pelanggan |
| 1301 | Peralatan |
| 1302 | Akumulasi Penyusutan |

## Liabilitas

| Kode | Akun |
|---|---|
| 2101 | Utang Pembelian Unit |
| 2102 | Utang Operasional |
| 2103 | Uang Muka Pelanggan |
| 2104 | Utang Pengembalian Dana |

## Ekuitas

| Kode | Akun |
|---|---|
| 3101 | Modal Pemilik |
| 3102 | Prive |
| 3201 | Laba Ditahan |
| 3202 | Laba Tahun Berjalan |

## Pendapatan

| Kode | Akun |
|---|---|
| 4101 | Pendapatan Penjualan HP |
| 4102 | Pendapatan Lainnya |

## Harga Pokok Penjualan

| Kode | Akun |
|---|---|
| 5101 | Harga Pokok Penjualan HP |

## Beban

| Kode | Akun |
|---|---|
| 6101 | Beban Admin Marketplace |
| 6102 | Beban Ongkir Penjualan |
| 6103 | Beban Iklan |
| 6104 | Beban Internet |
| 6105 | Beban Transport Operasional |
| 6106 | Beban Bank |
| 6199 | Beban Operasional Lainnya |

---

# 16. ATURAN JURNAL OTOMATIS

## 16.1 Setor Modal

```text
Debit  Bank/Kas
Kredit Modal Pemilik
```

## 16.2 Penerimaan Unit

```text
Debit  Persediaan HP Bekas
Kredit Bank
```

Nilai: harga beli + biaya transfer langsung.

## 16.3 Biaya Tambahan Unit

```text
Debit  Persediaan HP Bekas
Kredit Bank/Kas
```

## 16.4 Penjualan Unit

Jurnal penerimaan:

```text
Debit  Bank/Kas
Kredit Pendapatan Penjualan HP
```

Jurnal HPP:

```text
Debit  Harga Pokok Penjualan HP
Kredit Persediaan HP Bekas
```

Jika ada biaya penjualan terpisah:

```text
Debit  Beban Penjualan
Kredit Bank/Kas
```

## 16.5 Pengeluaran Operasional

```text
Debit  Beban Operasional
Kredit Bank/Kas
```

## 16.6 Prive

```text
Debit  Prive
Kredit Bank/Kas
```

## 16.7 Retur Penjualan

Pembalikan pendapatan:

```text
Debit  Retur/Pengurang Penjualan
Kredit Bank/Kas
```

Pengembalian unit ke persediaan:

```text
Debit  Persediaan HP Bekas
Kredit Harga Pokok Penjualan
```

---

# 17. LAPORAN NERACA

## 17.1 Aset Lancar

- Kas Tunai.
- Saldo Bank.
- Persediaan HP.
- Piutang Pelanggan.

## 17.2 Aset Tidak Lancar

- Peralatan.
- Akumulasi Penyusutan.

## 17.3 Liabilitas

- Utang pembelian.
- Utang operasional.
- Uang muka pelanggan.
- Kewajiban refund.

## 17.4 Ekuitas

- Modal pemilik.
- Laba ditahan.
- Laba berjalan.
- Dikurangi prive.

Persamaan:

```text
Total Aset = Total Liabilitas + Total Ekuitas
```

Sistem harus menampilkan indikator merah jika neraca tidak seimbang.

---

# 18. LAPORAN LABA RUGI

Struktur:

```text
Pendapatan Penjualan
- Retur Penjualan
= Penjualan Bersih

- Harga Pokok Penjualan
= Laba Kotor

- Beban Penjualan
- Beban Operasional
= Laba Bersih
```

Filter:

- Harian.
- Mingguan.
- Bulanan.
- Tahunan.
- Rentang tanggal.
- Merek.
- Model.
- Kanal penjualan.

---

# 19. LAPORAN ARUS KAS

## Aktivitas Operasional

- Penjualan.
- Pembelian unit.
- Biaya unit.
- Pengeluaran operasional.
- Retur.

## Aktivitas Pendanaan

- Setor modal.
- Prive.
- Pinjaman modal.
- Pembayaran pinjaman.

---

# 20. DASHBOARD

Dashboard menampilkan:

## Kartu Ringkasan

- Saldo kas dan bank.
- Nilai persediaan.
- Jumlah unit tersedia.
- Jumlah unit terjual bulan berjalan.
- Omzet bulan berjalan.
- Laba bersih bulan berjalan.
- Modal tertahan.
- Rata-rata laba per unit.
- Rata-rata hari stok.
- Jumlah unit rugi.

## Grafik

- Penjualan per bulan.
- Laba per bulan.
- Nilai stok per merek.
- Laba per merek.
- Umur stok.
- Distribusi status unit.

## Daftar Peringatan

- Unit lebih dari 30 hari.
- Unit lebih dari 60 hari.
- Unit tanpa harga pasang.
- Unit di bawah harga minimal.
- Unit dengan IMEI tidak jelas.
- Garansi pelanggan akan berakhir.
- Saldo rekening rendah.

---

# 21. METRIK BISNIS

## Gross Profit per Unit

```text
Net Terjual - Total Modal
```

## Margin

```text
Laba Unit / Net Terjual × 100%
```

## Markup

```text
Laba Unit / Total Modal × 100%
```

## Inventory Turnover

```text
HPP / Rata-rata Nilai Persediaan
```

## Days in Stock

```text
Tanggal Hari Ini - Tanggal Penerimaan
```

## Negotiation Rate

```text
(Harga Pasang - Harga Final) / Harga Pasang × 100%
```

## Sell-Through Rate

```text
Unit Terjual / Unit Masuk × 100%
```

---

# 22. VALIDASI DAN PERINGATAN

## Validasi Keras

- IMEI duplikat.
- Unit belum diperiksa.
- Harga beli nol.
- Rekening tidak dipilih.
- Jurnal tidak seimbang.
- Unit sudah terjual.
- Penjualan tanpa harga final.
- Nominal pembayaran tidak cocok.
- Akun transaksi tidak aktif.

## Peringatan Lunak

- Harga jual di bawah harga minimal.
- Harga jual di bawah total modal.
- Margin di bawah target.
- Unit sudah lama tersimpan.
- Battery health rendah.
- IMEI belum terdaftar.
- iCloud/Google account belum bersih.
- Bekas servis.
- Bukti transfer belum diunggah.

---

# 23. HAK AKSES

## OWNER

- Akses seluruh modul.
- Melihat harga minimal.
- Melihat modal dan laba.
- Membuat jurnal penyesuaian.
- Membatalkan transaksi.
- Mengelola akun.
- Mengelola pengguna.

## ADMIN

- Mencatat penerimaan.
- Mencatat pemeriksaan.
- Mencatat penjualan.
- Mengelola pelanggan.
- Tidak dapat melihat harga minimal jika dinonaktifkan.
- Tidak dapat membuat jurnal manual.
- Tidak dapat menghapus transaksi posted.

Untuk MVP, cukup menggunakan OWNER.

---

# 24. AUDIT TRAIL

Sistem mencatat:

- Pengguna pembuat.
- Pengguna pengubah.
- Waktu perubahan.
- Nilai sebelum.
- Nilai sesudah.
- Alasan perubahan.
- IP address.
- Device identifier opsional.

Tabel `audit_logs`:

| Field | Tipe |
|---|---|
| id | UUID |
| user_id | UUID |
| entity_type | varchar |
| entity_id | UUID |
| action | enum |
| old_values | jsonb |
| new_values | jsonb |
| reason | text |
| ip_address | varchar |
| created_at | timestamp |

---

# 25. NOTIFIKASI

MVP menggunakan notifikasi dalam aplikasi.

Jenis:

- Unit terlalu lama tersimpan.
- Harga belum ditetapkan.
- Harga jual di bawah batas.
- Garansi hampir habis.
- Stok rusak belum ditindaklanjuti.
- Jurnal gagal dibuat.
- Neraca tidak seimbang.

---

# 26. PENCARIAN DAN FILTER

Pencarian global dapat menggunakan:

- Kode stok.
- IMEI.
- Serial number.
- Merek.
- Model.
- Penjual.
- Pelanggan.
- Nomor transaksi.
- Nomor referensi transfer.

Filter stok:

- Merek.
- Model.
- Kapasitas.
- Warna.
- Kondisi.
- Status.
- Rentang modal.
- Rentang harga.
- Umur stok.
- IMEI status.
- Battery health.

---

# 27. INVOICE DAN DOKUMEN

Invoice penjualan menampilkan:

- Nomor invoice.
- Tanggal.
- Nama pelanggan.
- Informasi unit.
- IMEI tersamarkan.
- Harga jual final.
- Metode pembayaran.
- Masa garansi.
- Catatan kondisi.
- Ketentuan retur.
- Tanda tangan.

Invoice tidak menampilkan:

- Harga beli.
- Total modal.
- Harga minimal.
- Laba.
- Data penjual sebelumnya.

---

# 28. INTEGRASI TAUTAN GOOGLE DRIVE

## 28.1 Tujuan

Sistem tidak mengunggah file langsung ke Google Drive pada MVP. Pengguna mengunggah foto atau bukti pembayaran secara manual ke Google Drive, kemudian menempelkan tautannya ke dalam sistem.

## 28.2 Dokumentasi Foto Unit

Setiap unit yang diterima wajib memiliki salah satu atau keduanya:

- Link folder Google Drive yang berisi seluruh dokumentasi unit.
- Link foto utama atau album Google Drive.

Rekomendasi isi folder:

```text
/Kode-Stok/
  01-depan.jpg
  02-belakang.jpg
  03-frame-kiri.jpg
  04-frame-kanan.jpg
  05-layar.jpg
  06-imei.jpg
  07-kelengkapan.jpg
  08-minus-fisik.jpg
```

## 28.3 Bukti Pembayaran Pembelian

Setiap penerimaan unit berstatus `ACCEPTED` wajib memiliki:

- Nomor referensi transfer.
- Link Google Drive bukti pembayaran.
- Nama file bukti pembayaran.
- Tanggal pencatatan bukti.

## 28.4 Bukti Pembayaran Penjualan

Setiap transaksi penjualan berstatus `COMPLETED` wajib memiliki:

- Nomor referensi pembayaran jika menggunakan transfer.
- Link Google Drive bukti pembayaran.
- Nama file bukti pembayaran.
- Tanggal pencatatan bukti.

Untuk pembayaran tunai, bukti dapat berupa:

- Foto uang diterima.
- Foto kuitansi.
- Scan tanda terima.
- Dokumen konfirmasi pembayaran tunai.

## 28.5 Validasi URL

- URL wajib menggunakan protokol `https`.
- Domain yang direkomendasikan adalah `drive.google.com` atau `docs.google.com`.
- Sistem memberikan peringatan jika tautan bukan Google Drive.
- Sistem tidak menyimpan file asli pada database.
- Sistem hanya menyimpan URL dan metadata pendukung.
- Pengguna bertanggung jawab memastikan izin akses Drive sesuai kebutuhan.

## 28.6 Privasi

- Link bukti pembayaran hanya dapat dilihat oleh OWNER.
- Data pelanggan, nomor rekening, dan nominal sensitif tidak boleh ditampilkan pada halaman publik.
- Sistem sebaiknya membuka link di tab baru.
- IMEI pada foto dapat disamarkan jika dokumentasi dibagikan kepada pihak luar.

---

# 30. KEBUTUHAN NON-FUNGSIONAL

## Performa

- Halaman umum terbuka kurang dari 2 detik.
- Pencarian unit kurang dari 1 detik untuk 10.000 data.
- Laporan bulanan kurang dari 5 detik.

## Keamanan

- Password di-hash.
- Session timeout.
- CSRF protection.
- Rate limiting.
- Validasi file.
- Masking IMEI.
- Audit log.
- Backup berkala.
- Tidak menyimpan nomor rekening penuh di UI publik.

## Reliabilitas

- Database transaction untuk setiap transaksi keuangan.
- Jurnal dan transaksi bisnis disimpan secara atomik.
- Tidak boleh ada penjualan tanpa pengurangan stok.
- Tidak boleh ada jurnal setengah tersimpan.

## Backup

- Backup database harian.
- Retensi minimal 30 hari.
- Backup media mingguan.
- Restore test berkala.

---

# 30. API MINIMAL

## Master

```text
GET    /api/brands
GET    /api/models
POST   /api/models
GET    /api/inspection-items
GET    /api/accounts
GET    /api/sellers
POST   /api/sellers
GET    /api/customers
POST   /api/customers
```

## Penerimaan

```text
POST   /api/receipts
GET    /api/receipts
GET    /api/receipts/{id}
PUT    /api/receipts/{id}
POST   /api/receipts/{id}/inspection
POST   /api/receipts/{id}/accept
POST   /api/receipts/{id}/reject
```

## Unit

```text
GET    /api/units
GET    /api/units/{id}
POST   /api/units/{id}/costs
POST   /api/units/{id}/prices
GET    /api/units/{id}/history
```

## Penjualan

```text
POST   /api/sales
GET    /api/sales
GET    /api/sales/{id}
POST   /api/sales/{id}/complete
POST   /api/sales/{id}/return
```

## Keuangan

```text
POST   /api/capital-contributions
POST   /api/owner-drawings
POST   /api/operating-expenses
GET    /api/journals
GET    /api/ledger
```

## Laporan

```text
GET    /api/reports/dashboard
GET    /api/reports/inventory
GET    /api/reports/profit-loss
GET    /api/reports/balance-sheet
GET    /api/reports/cash-flow
GET    /api/reports/unit-profitability
```

---

# 31. RELASI DATA INTI

```text
brands
  └── phone_models
        └── phone_units

unit_receipts
  ├── sellers
  ├── phone_units
  │     ├── unit_inspection_results
  │     ├── unit_accessories
  │     ├── unit_photos
  │     ├── unit_costs
  │     ├── unit_price_histories
  │     └── sale_items
  └── journal_entries

sales
  ├── customers
  ├── sales_channels
  ├── sale_items
  │     └── phone_units
  ├── sale_costs
  ├── sale_returns
  ├── warranty_claims
  └── journal_entries

journal_entries
  └── journal_lines
        └── accounts
```

---

# 32. INDEX DATABASE YANG DISARANKAN

```text
phone_units(imei_1)
phone_units(stock_code)
phone_units(stock_status)
phone_units(brand_id, model_id)
phone_units(acquired_at)
phone_units(sold_at)
phone_units(total_unit_cost)
phone_units(current_listing_price)

unit_receipts(receipt_number)
unit_receipts(receipt_date)
unit_receipts(seller_id)

sales(sale_number)
sales(sale_date)
sales(customer_id)
sales(status)

journal_entries(transaction_date)
journal_entries(source_module, source_id)
journal_lines(account_id)
journal_lines(phone_unit_id)
```

---

# 33. ACCEPTANCE CRITERIA MVP

## Penerimaan Unit

- Pengguna dapat membuat penerimaan.
- Pengguna dapat mengisi checklist.
- Pengguna dapat menerima atau menolak.
- Unit diterima masuk stok.
- Link Google Drive foto unit tersimpan.
- Link Google Drive bukti pembayaran pembelian tersimpan.
- Jurnal otomatis terbentuk.
- IMEI duplikat ditolak.

## Biaya Unit

- Biaya dapat ditambahkan.
- Total modal otomatis berubah.
- Nilai persediaan berubah.
- Riwayat biaya tersimpan.

## Harga

- Harga pasang dan minimal dapat disimpan.
- Estimasi laba tampil.
- Histori harga tersimpan.

## Penjualan

- Unit aktif dapat dijual.
- Harga final dapat berbeda dari harga pasang.
- Sistem menghitung net dan laba.
- Stok berubah menjadi terjual.
- Link Google Drive bukti pembayaran penjualan tersimpan.
- Jurnal penjualan dan HPP terbentuk.

## Keuangan

- Setor modal tercatat.
- Prive tercatat.
- Beban operasional tercatat.
- Saldo akun dapat dilihat.
- Neraca seimbang.

## Laporan

- Laporan laba rugi tersedia.
- Neraca tersedia.
- Arus kas tersedia.
- Laba per unit tersedia.
- Umur stok tersedia.

---

# 34. ROADMAP

## Fase 1 — MVP

- Master dasar.
- Penerimaan dan inspeksi.
- Inventaris per IMEI.
- Biaya unit.
- Harga jual.
- Penjualan.
- Setor modal.
- Prive.
- Pengeluaran.
- Jurnal otomatis.
- Neraca.
- Laba rugi.
- Arus kas.

## Fase 2

- Retur.
- Garansi.
- Reservasi unit.
- Invoice PDF.
- WhatsApp sharing.
- Multi-user.
- Stock opname.
- PWA.

## Fase 3

- Sinkronisasi marketplace.
- Analisis harga pasar.
- Rekomendasi harga.
- Multi-cabang.
- Integrasi bank.
- Customer loyalty.
- Supplier scoring.

---

# 35. ASUMSI

1. Sistem digunakan untuk usaha mikro milik satu orang.
2. Semua pembelian unit dibayar transfer.
3. Penjualan dapat tunai atau transfer.
4. Tidak terdapat diskon formal.
5. Negosiasi direpresentasikan oleh selisih harga pasang dan harga final.
6. Satu unit memiliki satu IMEI utama.
7. Unit diperiksa saat COD.
8. Biaya langsung dapat ditambahkan setelah pembelian.
9. Akuntansi menggunakan basis akrual sederhana.
10. Persediaan dinilai berdasarkan biaya spesifik per unit.
11. Pajak belum menjadi fokus MVP.
12. Retur dan garansi dapat dikembangkan setelah alur utama stabil.

---

# 36. DEFINISI ISTILAH

| Istilah | Definisi |
|---|---|
| Harga Beli | Nilai kesepakatan pembelian unit |
| Total Modal | Harga beli ditambah biaya langsung |
| Harga Pasang | Harga yang ditampilkan kepada calon pembeli |
| Harga Minimal | Batas internal terendah |
| Harga Jual Final | Harga kesepakatan setelah negosiasi |
| Net Terjual | Harga final dikurangi biaya penjualan |
| Laba Unit | Net terjual dikurangi total modal |
| Modal Tertahan | Total nilai unit yang belum terjual |
| Prive | Uang usaha yang diambil untuk kebutuhan pribadi |
| HPP | Total modal unit yang terjual |
| Umur Stok | Lama unit berada dalam persediaan |
| Reversal | Jurnal pembalik untuk transaksi yang dibatalkan |

---

# 37. KESIMPULAN

RePhone POS dirancang untuk memastikan setiap unit HP memiliki riwayat yang jelas sejak penerimaan, pemeriksaan, penambahan biaya, penetapan harga, negosiasi, hingga penjualan.

Sistem harus dapat menjawab:

1. Berapa uang usaha yang tersedia?
2. Berapa modal yang masih tertahan?
3. Unit mana yang paling lama belum terjual?
4. Berapa laba sebenarnya dari setiap unit?
5. Merek dan model apa yang paling menguntungkan?
6. Berapa kekayaan bersih usaha saat ini?
7. Apakah neraca usaha seimbang?