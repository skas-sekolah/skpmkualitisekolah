# SK@S → MOEIS v0.8.1
## Pemasangan
Muat turun SKAS-MOEIS-Extension-v0.8.1.zip dan ekstrak. Dalam chrome://extensions, aktifkan Developer mode, pilih Load unpacked dan pilih folder yang mengandungi manifest.json. Matikan versi lama supaya satu extension sahaja digunakan.

## Perubahan
- Calon pautan dibaca dengan GET dahulu. Halaman senarai tanpa borang ditolak; beberapa pautan kepada identiti borang sama boleh disatukan. Jika identiti berlainan, rekod tetap dilangkau.
- Tajuk STANDARD disahkan daripada jadual kandungan atau heading utama, bukan teks menu di seluruh halaman.
- Nama RBT dan PJPK dipadankan kepada nama penuh yang diperhatikan dalam MOEIS. Bahasa Elektif tidak dianggap Bahasa Arab secara automatik.
- Nama unit yang ditemui semasa carian disemak semula pada borang.
- Setiap calon pautan, keputusan semakan dan pautan dipilih dimasukkan dalam laporan berkelompok.
- Had carian dinaikkan kepada 180 halaman / 180 saat; had yang dicapai tetap dilaporkan.
- Skor kosong dilangkau, skor 0 dikekalkan. Masalah satu rekod tidak menghalang rekod lain kecuali sesi, sekolah atau tahun bermasalah.
- Selepas satu penghantaran Simpan, skor mesti sepadan pada GET baharu pelayan. Tiada ulang POST automatik.
- Jika extension dikemas kini semasa berjalan, proses ditanda terganggu dan tidak disambung secara senyap.

## Cara guna
1. Muat semula SK@S, eksport pakej JSON baharu selepas perubahan nama.
2. Log masuk MOEIS sendiri dan buka Pengurusan Kami.
3. Buka extension, pilih Pengisian berkelompok, pilih JSON dan jalankan Semak padanan sahaja dahulu.
4. Untuk menghantar, pilih Isi dan simpan, tandakan pengesahan sekolah/tahun dan mula.
5. Kekalkan tab MOEIS terbuka. Laporan membezakan skor disahkan, rekod kosong, rekod sedia dan rekod bermasalah.

## Batas pengujian
Ujian automatik menggunakan fixture dan API Chrome tiruan. Ia tidak membuktikan simpanan sebenar dalam MOEIS. Akses MOEIS dari persekitaran pembinaan disekat; hasil sebenar mesti disahkan dalam sesi MOEIS pengguna. Versi ini tidak menambah mata pelajaran atau unit kepada pendaftaran MOEIS, tidak membawa kata laluan, dan tidak menganggap katalog 29 unit sekolah sebagai katalog penuh MOEIS.
