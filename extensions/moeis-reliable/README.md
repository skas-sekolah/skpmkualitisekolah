# SK@S → MOEIS v0.8.4
## Rumusan terus dalam extension
Popup dan halaman berkelompok memaparkan peratus skor yang disahkan pada pelayan, bilangan simpanan baharu, skor lama sepadan, rekod kosong, sedia, bermasalah dan belum diproses. Pecahan masalah boleh dibuka untuk melihat nama rekod, sebab dan calon pautan. Mod semakan tidak dikira sebagai simpanan baharu.

Gunakan **Lihat laporan penuh / buka laporan lama** dalam popup, kemudian pilih fail **SKAS-laporan-berkelompok…json** untuk membaca laporan lama tanpa menjalankan pengisian. Import hanya menukar paparan; ia tidak menghantar skor atau menimpa proses semasa. Rumusan kekal tersedia selepas popup ditutup.

## Carian panitia v0.8.4
Carian menyokong nama panitia sebagai pautan, pengepala jadual berbilang baris (rowspan/colspan), dan satu ikon pensel yang membuka halaman unit bersama empat standard. Pautan standard mesti ditemui pada halaman sebenar dan identiti unit dikekalkan; ID atau URL tidak direka. Laporan turut menyimpan diagnostik halaman unit bagi membezakan nama yang ditemui daripada pautan borang yang belum ditemui.

Eksport JSON SK@S baharu selepas pembetulan nama. Bahasa Elektif tidak ditukar kepada Bahasa Arab secara umum oleh extension kerana maknanya mungkin berbeza antara sekolah.

## Pemasangan
Muat turun SKAS-MOEIS-Extension-v0.8.4.zip dan ekstrak. Dalam chrome://extensions, aktifkan Developer mode, pilih Load unpacked dan pilih folder yang mengandungi manifest.json. Matikan versi lama supaya satu extension sahaja digunakan.

## Pembaikan pengesanan v0.8.2
Pengesanan kod standard menyokong badge pautan JavaScript, pautan yang berbeza parameter daripada URL semasa, DIV dengan teks berpecah dan input button. Kod daripada sidebar, elemen tersembunyi dan kandungan selepas borang tidak digunakan. Jika beberapa kod wujud, kod aktif / pautan semasa mesti menentukan satu kod sahaja; jika tidak, pengisian tetap disekat. Ujian menyerupai paparan pengguna, bukan salinan HTML MOEIS sebenar.

## Perubahan terdahulu
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
