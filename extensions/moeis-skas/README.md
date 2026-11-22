# SK@S ↔ MOEIS — extension Chrome auto 0.2.0

Versi percubaan untuk Standard 4. Tidak memerlukan standard4helper atau kata laluan disimpan dalam extension.

## Aliran auto (baharu)
1. Dalam MOEIS, buka Standard 4 → pilih tahun dan sesi → **Senarai Guru**. Extension mengambil sesi yang sedang dipilih; ia tidak menganggap semua sesi sama.
2. Klik extension. Isi kod sekolah dan tahun. Pilih **Semua guru dalam sesi ini** atau **Guru pada borang semasa**.
3. Pilih kategori **Semua / Perdana / Pendidikan Khas**. Kategori ditentukan daripada senarai guru SK@S sewaktu pratonton; bacaan MOEIS meliputi senarai sesi semasa.
4. Tekan **Ambil skor automatik** sekali. Extension membaca halaman senarai dan lapan subaspek, bukan menghantar borang. Popup boleh ditutup; kekalkan tab MOEIS terbuka dan jangan berpindah halaman. Buka semula popup untuk lihat kemajuan. Butang Hentikan mengekalkan rekod yang telah lengkap dibaca.
5. Buka SATU tab SK@S. Log masuk Admin/Superadmin dan buka Pengurusan Admin → **Muat Naik dan Muat Turun SK@S**. Pilih sekolah dan tahun yang sama. Tunggu data dimuatkan; kosongkan atau simpan pratonton lama dahulu.
6. Kembali ke tab MOEIS, buka extension dan tekan **Hantar ke pratonton SK@S**. Tab SK@S akan diaktifkan selepas menerima data, maksimum 50 rekod setiap kelompok. Tiada CSV diperlukan.
7. Di SK@S, semak padanan dan amaran, tandakan semakan, kemudian tekan **Simpan penilaian sebagai draf**. Draf sedia ada memerlukan izin penggantian; rekod dihantar/disahkan kekal dikunci.
8. Jika lebih 50 rekod, selepas simpan / kosongkan pratonton, kembali ke MOEIS dan tekan Hantar untuk kelompok seterusnya. Nombor “dihantar ke pratonton” BUKAN pengesahan simpanan pelayan. Pastikan SK@S memaparkan kejayaan simpan.

**Keperluan SK@S:** halaman penerima versi baharu mesti diterbitkan dahulu. Extension akan memberi mesej jika pusat pemindahan yang dibuka belum menyokong hantaran auto. Jangan berikan kata laluan MOEIS/SK@S kepada extension.

**Had:** guru tanpa pautan skor dilaporkan, bukan dianggap berskor sifar. Tiada cubaan mencipta metadata guru dalam MOEIS. Jika log masuk tamat, pautan bertukar guru/sesi, struktur berubah atau permintaan gagal, kutipan berhenti tanpa mencuba berulang. Hasil lengkap sebelumnya dikekalkan. Skor kosong kekal kosong. Setiap rekod memerlukan 38 item yang dapat dibaca; “Semua guru” bermaksud semua rekod dengan pautan skor dalam senarai sesi yang dibuka.

## Kemas kini daripada 0.1
Ekstrak ZIP 0.2 ke folder tetap baharu. Buang extension 0.1 melalui chrome://extensions, kemudian Load unpacked folder 0.2 yang mengandungi manifest.json. ZIP baharu meletakkan manifest.json terus di akar folder ekstrak. Semak versi 0.2.0 selepas pemasangan. Hasil sementara versi lama tidak dipindahkan.

## Privasi dan status ujian versi auto
Hanya halaman senarai/borang skor MOEIS dibaca melalui GET. Tiada auto simpan atau pindaan skor MOEIS. Pautan HTTP MOEIS yang dijana laman dinaik taraf kepada HTTPS sebelum dibaca. Tiada akses cookies/token/kata laluan. Hantaran hanya kepada halaman SK@S tetap apabila pengguna menekan Hantar, melalui sesi akaun SK@S sedia ada. Tiada pengecualian kebenaran API.

Akses tambahan versi 0.2 ialah halaman https://skas-sekolah.github.io/skpmkualitisekolah/ untuk memasukkan data ke pratonton. Hasil dan penanda kelompok disimpan dalam sesi Chrome sahaja. Muat semula extension / tutup sesi Chrome akan mengosongkannya. Jangan kosongkan hasil sebelum kelompok yang diperlukan selesai disimpan.

Ujian automatik meliputi halaman senarai berbilang muka surat, lapan subaspek, skor sifar/kosong, pautan luar, borang hilang, padanan kategori/identiti, had kelompok, sekolah/tahun/sesi dan rekod terkunci. Ujian ini menggunakan data rekaan. Struktur navigasi MOEIS sebenar diperiksa secara baca sahaja. Pakej auto dan simpanan hujung ke hujung belum diuji dalam Chrome pengguna / rekod sebenar. Mulakan dengan seorang guru dan semak semua skor sebelum penggunaan seluruh sekolah.

## Alat manual (pilihan)
Alat versi terdahulu boleh dibuka melalui “Alat manual / Isi skor ke MOEIS”.

## Pasang
1. Ekstrak ZIP ke satu folder tetap dalam komputer.
2. Buka `chrome://extensions` dalam Chrome.
3. Hidupkan **Developer mode**.
4. Tekan **Load unpacked**, pilih folder yang mengandungi `manifest.json`.
5. Pin extension **SK@S — Pemindahan Skor MOEIS** melalui ikon Extensions.

## MOEIS → SK@S
1. Log masuk sendiri ke IDME/MOEIS. Buka SKPM → Penilaian Kendiri → tahun yang betul → Pengurusan Kami → Standard 4.
2. Pilih sesi dan guru, kemudian buka Pengisian Skor.
3. Buka extension, tekan **Semak borang semasa**. Isi kod sekolah, tahun dan kategori sebenar; sahkan konteks.
4. Tekan **Kutip subaspek semasa**. Buka setiap subaspek secara manual dan ulang kutipan: 4.1.1, 4.2.1, 4.2.2, 4.3.1, 4.4.1, 4.4.2, 4.5.1, 4.6.1.
5. Apabila 38/38 item dikutip, tekan **Muat turun CSV SK@S**. Kutipan membaca nilai borang semasa; pastikan tiada perubahan belum disimpan jika mahu salinan rekod pelayan. Skor kosong kekal kosong; sifar kekal sifar. Semua 38 item diperlukan tetapi boleh ada nilai kosong.
6. Dalam akaun Admin/Superadmin SK@S, buka Pengurusan Admin → Muat Naik dan Muat Turun SK@S. Import CSV, semak padanan guru/sesi/tahun dan pratonton sebelum simpan sebagai draf. Peraturan akses SK@S tetap terpakai.
7. Kosongkan kutipan sebelum guru atau sesi seterusnya. Kutipan semula subaspek sama menggantikan salinan sementara subaspek itu.

## SK@S → MOEIS
1. Eksport **CSV lengkap SK@S untuk seorang guru/sesi**. CSV tiga lajur tidak diterima kerana tiada identiti. Lengkapkan metadata subjek dan kelas supaya sepadan dengan MOEIS.
2. Buka guru, sesi dan subaspek sasaran dalam MOEIS. Dalam extension, pilih CSV dan tekan Semak borang semasa.
3. Semak nama, sesi, subjek, kelas, sekolah, tahun, kategori dan skor pratonton. Tandakan pengesahan. Jika skor berbeza sudah ada, izin menggantikan diperlukan.
4. Tekan Isi subaspek semasa. Hanya subaspek terbuka diisi; nilai kosong tidak ditukar menjadi sifar. Jika ada skor kosong dalam subaspek ini, pengisian ditolak.
5. Semak borang MOEIS dan tekan **Simpan** sendiri. Pastikan MOEIS mengesahkan simpanan sebelum berpindah. Extension tidak menghantar borang, mengesahkan penilaian atau menjamin simpanan pelayan.
6. Ulang setiap subaspek, buka semula untuk mengesahkan skor tersimpan.

## Batas ujian dan data
Struktur borang Kendiri sebenar telah diperiksa tanpa mengubah skor. Pemetaan 38 item, CSV dan perlindungan pengisian diuji dengan data rekaan. Extension belum dipasang dan diuji simpanan hujung ke hujung pada rekod sebenar. Sesi pencerapan dan Pendidikan Khas perlu ujian terkawal sebelum penggunaan meluas; extension menolak struktur berbeza.

Sekolah/tahun/kategori disahkan oleh pengguna kerana borang skor yang diperiksa tidak memaparkan semua metadata tersebut secara konsisten. Jangan tukar konteks di MOEIS antara semakan dan pengisian.

Data sementara berada dalam `chrome.storage.session` (hilang apabila sesi Chrome berakhir / extension dimuat semula), bukan pelayan extension. CSV dimuat turun mengandungi nama dan skor; simpan di tempat yang sesuai. Tiada akses cookies, kata laluan, token, semua laman atau auto simpan. Versi auto membuat permintaan GET terhad kepada halaman MOEIS serta hantaran pratonton ke SK@S yang dipilih pengguna. Tiada data guru sebenar disertakan dalam pakej.

Untuk buang: buka chrome://extensions → Remove. Untuk kemas kini: gantikan folder, tekan Reload pada kad extension (kutipan sementara akan hilang).

## Pembangun
`node tests/core.test.cjs` dan `node tests/adapter.test.cjs` dari folder ini. Sumber bebas binaan, tiada pergantungan luaran. Ini alat SK@S, bukan produk rasmi KPM.


## 0.3.0 — Kekuatan Kami automatik (percubaan)

1. Muat semula extension selepas menggantikan fail; manifest.json mesti berada pada aras folder yang dipilih.
2. Log masuk MOEIS, buka satu aspek Kekuatan Kami yang telah disimpan. Isi kod sekolah dan tahun dalam extension. Semak kod sekolah sendiri dengan sekolah dalam MOEIS.
3. Tekan **Ambil semua skor wajaran A1–A9**. Kekalkan tab terbuka sehingga 9 aspek selesai.
4. Buka SK@S sebagai Admin / Superadmin → Pengurusan Admin → Muat Naik dan Muat Turun SK@S. Tekan **Hantar wajaran ke pratonton SK@S**, semak dan simpan.
5. Pilihan fail JSON tersedia jika pemindahan terus gagal; fail boleh dimuat naik pada panel Kekuatan Kami di pusat import yang sama.

Penerima dan backend SK@S versi baharu mesti diterbitkan dahulu. Versi laman lama tidak menerima data wajaran. Fail ini tidak mengandungi kata laluan atau data sekolah.

Bacaan GET sahaja daripada pautan aspek di MOEIS; tiada Simpan/Hantar MOEIS ditekan. Mengambil skor yang dipaparkan dan bilangan asal, termasuk pembahagi berasingan, bukan meneka formula wajaran. Perubahan MOEIS yang belum disimpan tidak dikutip. Import menyimpan snapshot berasingan; tidak mengubah pengisian, penugasan, evidens atau pengesahan SK@S. Snapshot boleh menjadi lapuk selepas data MOEIS berubah; ambil semula untuk kemas kini.

Ujian automatik menggunakan struktur DOM simulasi berdasarkan paparan A1; keseluruhan A1–A9 belum diuji pada sesi MOEIS sebenar. Jika struktur/pautan/skor tidak jelas, kutipan berhenti dan hantaran dikunci; jangan anggap gagal baca sebagai skor sifar.
