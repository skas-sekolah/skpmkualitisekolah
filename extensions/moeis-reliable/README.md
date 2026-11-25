# SK@S → MOEIS v0.8.0 — Pengisian berkelompok

Versi ini menambah kelompok Pengurusan Kami menggunakan isi/simpan/pengesahan
respons pelayan daripada v0.7.2. Alat satu rekod masih tersedia.

## Pasang
Extract ZIP ini ke folder baharu. Nyahaktifkan versi lama.
chrome://extensions → Developer mode → Load unpacked → pilih folder yang
terus mengandungi manifest.json. Pastikan versi 0.8.0. Muat semula tab MOEIS.

## Pengisian berkelompok
1. Log masuk MOEIS. Buka halaman senarai standard/unit bagi sekolah dan tahun betul.
   Contoh: senarai sukan, kelab atau panitia. Elakkan bermula dalam borang lama.
2. Buka popup extension dan tekan Buka pengisian berkelompok.
3. Dalam halaman baharu, pilih pakej JSON SUMBER SK@S terkini,
   bukan fail laporan extension. Pakej lama masih mengandungi kelab yang dipadam.
4. Pilih bahagian: Semua / Pengurusan umum / Panitia / Kelab / Uniform / Sukan.
5. Pilih Isi dan simpan semua padanan yang pasti. Tandakan pengesahan.
   Semak padanan sahaja tersedia untuk bacaan tanpa penghantaran.
6. Tekan Mula proses berkelompok. Kekalkan tab MOEIS dan pelayar terbuka.
   Jangan navigasi tab sasaran secara manual. Popup boleh ditutup.
7. Lihat kemajuan, skor disahkan dan rekod dilangkau.
8. Muat turun laporan berkelompok selepas tamat.
9. Semak beberapa rekod melalui menu MOEIS sendiri selepas proses.

## Cara pemadanan
Carian mengikuti pautan menu dan ikon pensel yang benar-benar ditemui.
Nombor standard + nama panitia/unit + URL mesti sepadan.
Pautan dengan tahun lain, sekolah tidak dapat disahkan, standard lain,
nama tidak sepadan atau beberapa calon tidak digunakan untuk mengisi.
Had carian 80 halaman atau kira-kira 90 saat; pautan tidak ditemui dilangkau.
Had ini boleh menyebabkan hanya sebahagian pakej dapat diproses.
Nama unit diperiksa dengan membuang awalan kategori dan akhiran SR/SM sahaja;
tiada tekaan singkatan atau alias. Nama yang berbeza boleh terus diisi
melalui alat satu rekod selepas semakan pengguna.

## Simpan dan pengesahan
Skor kosong dilangkau, 0 diproses. Rekod readOnly tidak diubah.
Setiap Simpan dihantar sekali. Selepas itu GET baharu cache no-store
memeriksa pilihan skor yang datang daripada pelayan pada identiti borang sama.
Rekod sedia sepadan turut disemak pada pelayan tanpa penghantaran baharu.
Jika tidak disahkan, rekod dicatat dan proses diteruskan tanpa menghantar semula.
Sesi tamat, sekolah/tahun salah atau tab ditutup menghentikan proses.
Butang Hentikan berkuat kuasa selepas rekod/carian semasa selesai.
Jika pelayar dimulakan semula, laporan ditandakan terganggu dan tiada sambungan
atau penghantaran semula automatik. Semak rekod terakhir sebelum memulakan semula.

Peratus = skor yang disahkan pada pelayan / skor sumber tersedia dalam bahagian
pakej pilihan. Ia bukan peratus semua ruangan MOEIS. Proses selesai tidak
bermaksud semua rekod berjaya. Semak status setiap rekod.

## Skop
Pengurusan Kami sahaja. Standard 4, Kekuatan Kami dan Pencapaian Kami belum
termasuk dalam mod kelompok ini. Tiada kata laluan disimpan.
Pakej untuk mod kelompok hanya menghantar medan skor, identiti dan tajuk;
evidens/catatan tidak diubah. Laporan disimpan pada Chrome peranti pengguna.

## Pengesahan pembangunan
Ujian Node untuk skor/laluan, args Chrome, snapshot pratonton, respons pelayan,
pemadanan ikon pensel dan aliran kelompok lulus menggunakan fixture/simulasi.
Mod berkelompok v0.8.0 belum disahkan pada pelayan MOEIS sebenar.
v0.7.2 mempunyai laporan pengguna bagi satu skor Bola Sepak server-confirmed.

npm install
npm test
