# Panduan singkat: mengaktifkan Cloud Sync (Bahasa Indonesia)

Tujuan: karakter Pithe yang sama muncul di laptop dan HP. Panduan teknis lengkap (bahasa Inggris) ada di `SUPABASE_SETUP.md`.

## Hal yang harus Anda tahu dulu

- Game tetap jalan tanpa cloud. Save di setiap perangkat selalu tetap ada di perangkat itu.
- Cloud Sync BARU AKTIF kalau `js/config.js` berisi Project URL dan Publishable key. Project URL sudah terisi. Publishable key sengaja DIKOSONGKAN di ZIP ini: Anda mengisinya sendiri (langkah 3). Anda tidak perlu mengirim key ke siapa pun.
- Yang boleh dipakai di game hanya **Publishable key** (`sb_publishable_...`). **Jangan pernah** memakai Secret key (`sb_secret_...`) atau service_role key. Kalau terpasang tidak sengaja, game menolak menyalakan Cloud Sync.
- Belum ada bukti bahwa semuanya jalan di proyek Supabase asli Anda. Langkah 6 di bawah adalah cara membuktikannya.

## Langkah 1. Amankan save sekarang (2 menit)

Di laptop, buka game di alamat tempat Pithe Anda dimainkan, lalu: More, Settings and save data, Export save file. Simpan file yang terunduh.

## Langkah 2. Jalankan SQL di Supabase (sekali saja)

1. Buka https://supabase.com/dashboard, pilih proyek Anda.
2. Menu kiri: **SQL Editor**, lalu **New query**.
3. Buka file `supabase/schema.sql` dari proyek ini, salin SEMUA isinya, tempel, klik **Run**.
4. Harus muncul "Success. No rows returned". Cek di **Table Editor** ada tabel `cloud_saves` berlabel RLS enabled.

Kalau muncul pesan error merah, kirim tulisannya ke Claude. Jangan lanjut dulu.

## Langkah 3. Cek pengaturan login, lalu isi key

Di dashboard Supabase, **Authentication**:
- Provider **Email** aktif, **Confirm email** aktif.
- **URL Configuration**: Site URL `https://haikal-hafidz.github.io/Tap-Protocol/`. Redirect URLs: tambahkan `https://haikal-hafidz.github.io/Tap-Protocol/` dan `https://haikal-hafidz.github.io/Tap-Protocol/**`. Huruf besar-kecil dan tanda `/` di akhir harus persis.

Lalu isi key sendiri, di laptop Anda (key tidak pernah dikirim lewat chat):

**Cara mudah (Windows):** ekstrak ZIP ke satu folder. Seret file TXT yang berisi key Anda ke atas file `ISI-KEY.bat`, lepas. (Atau klik dua kali `ISI-KEY.bat`, lalu tempel key; layar tidak menampilkan apa pun saat menempel, itu normal.) Muncul "Selesai". Key tidak ditampilkan dan tidak disimpan di tempat lain. Kalau TXT Anda juga berisi Secret key, Secret key itu diabaikan; sebaiknya tidak disimpan di file teks.
**Mac/Linux atau lewat VS Code terminal:** di folder proyek jalankan `node tools/set-key.mjs` (tempel key), atau `node tools/set-key.mjs lokasi/key.txt`.
**Kalau tidak ada Node.js:** di GitHub buka `js/config.js`, klik ikon pensil, tempel key di antara kedua tanda kutip pada baris `SUPABASE_KEY`, lalu **Commit changes**. Cara ini juga berfungsi.

Skrip hanya mengubah `js/config.js` dan angka versi cache di `sw.js`. Skrip menolak Secret key / service_role key.

## Langkah 4. Unggah ke GitHub (Anda yang memutuskan)

Repositori Anda (`haikal-hafidz/Tap-Protocol`, cabang `main`) menyimpan file proyek langsung di akarnya, tanpa langkah build. Cukup unggah ulang isi folder hasil ekstrak (setelah Langkah 3), dengan cara yang sama seperti unggahan sebelumnya: GitHub, **Add file, Upload files**, seret SEMUA isi folder (file dan subfolder, bukan folder `tap-protocol` itu sendiri), lalu **Commit changes**. File dengan nama sama akan diganti, file baru ditambahkan, dan file lain (gameplay, ikon, dll.) tidak berubah isinya.

Yang baru: `js/cloud.js`, `js/sync.js`, `js/cloud-ui.js`, `js/config.js`, folder `supabase/`, `docs/`, `ISI-KEY.bat`, `tools/set-key.mjs`, dan beberapa file di `tests/`. Yang diperbarui: `js/main.js`, `js/ui.js`, `css/style.css`, `sw.js`, `package.json`, `package-lock.json`, `README.md`, `PROJECT_STATUS.md`, `tests/run.mjs`, `tests/RESULTS.txt`. `rules.js`, `data.js`, `storage.js`, `pwa.js`, `index.html`, manifest dan ikon identik dengan yang sudah ada.

Tunggu GitHub Pages selesai (centang hijau di tab Actions atau Settings, Pages). Di perangkat yang sudah punya game akan muncul "A new version is ready": tekan **Reload to update**. Save tidak terpengaruh.

## Langkah 5. Pemakaian pertama

**Laptop** (yang punya Pithe, di browser dan alamat yang sama dengan sebelumnya):
1. Character, turun ke **Cloud sync**. Isi email dan password (minimal 8 karakter), tekan **Create account**.
2. Buka email dari Supabase, klik link-nya. Anda kembali ke game dalam keadaan login.
3. Panel menampilkan **Synced at ...**.

**HP:**
1. Buka game. **Jangan buat karakter baru.** Di layar pertama cari **Cloud sync**, isi email dan password yang SAMA, tekan **Sign in** (bukan Create account).
2. Tekan **Restore cloud save onto this device**. Pithe muncul.

Catatan: browser biasa dan aplikasi yang di-install (PWA) di HP punya penyimpanan terpisah. Pilih salah satu dan gunakan terus di perangkat itu.

## Langkah 6. Buktikan benar-benar jalan (wajib sekali)

1. Di laptop, buat perubahan kecil (misalnya satu catatan jurnal). Tunggu **Synced at**.
2. Di Supabase, **Table Editor, cloud_saves**: harus ada satu baris, kolom `revision` naik 1 setiap sync.
3. Di HP, buka ulang game: catatan itu muncul.
4. Mode pesawat di HP, main sebentar (status **Offline**), matikan mode pesawat: tersinkron sendiri.
5. Sign out di HP: save di HP tetap ada. Sign in lagi.

Kalau ada langkah yang gagal, kirim ke Claude: nomor langkah dan tulisan yang tampil di panel Cloud sync.

## Kalau layar "Your saves are different" muncul

Artinya laptop dan cloud sama-sama punya perubahan berbeda, atau cloud terlihat LEBIH TUA (waktu game lebih kecil) dari perangkat ini. **Tidak ada yang ditimpa.** Kedua versi sudah dicadangkan. Tekan **Download both as files** kalau ingin salinan sendiri, lalu pilih **Keep this device's save** atau **Keep the cloud save**. **Decide later** tidak mengubah apa pun.

## Catatan

- **RESET** hanya menghapus save di perangkat itu, bukan di cloud.
- Tidak ada fitur lupa password di dalam game. Gunakan dashboard: Authentication, Users, kirim email recovery.
- Cloud menyimpan satu save terbaru, bukan riwayat. Riwayat = cadangan di tiap perangkat + file export Anda.
