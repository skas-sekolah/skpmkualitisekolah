# SK@S ↔ MOEIS · 0.5.0

Kemas kini dua hala untuk empat modul. Baca **MULA-DI-SINI.txt** dan bahagian 0.5.0 di bawah dahulu. Nota versi 0.4.1 menerangkan bahagian kutipan yang dikekalkan.

# SK@S ↔ MOEIS — versi 0.4.1

## Bar kemajuan baharu
- Peratus kemajuan keseluruhan dan bilangan guru berpautan yang telah diperiksa.
- Nama guru semasa, subaspek /8 dan item /38.
- Masa berlalu serta anggaran masa berbaki selepas bacaan guru pertama selesai. Anggaran boleh berubah mengikut kelajuan MOEIS.
- Ketika senarai masih dibaca, bar bergerak tanpa peratus kerana jumlah akhir belum diketahui.
- Jika respons lewat, paparan menyatakan Menunggu respons MOEIS; ia tidak mendakwa kutipan siap.
- Apabila tamat, bar bertukar hijau dan memaparkan SIAP — CSV boleh dimuat turun. Cikgu masih perlu menekan butang Muat turun CSV item.
- Senarai amaran dipendekkan dalam bahagian yang boleh dikembangkan.

**Jika versi lama masih mengutip data, biarkan selesai dan simpan CSV dahulu sebelum menukar versi.** Memuat semula extension/tab semasa bacaan boleh menghilangkan hasil sementara.

## Tujuan
Membaca **38 skor item 0–4** daripada lapan subaspek borang Standard 4 MOEIS, bukan menukarkan peratus dalam laporan Excel kepada skor item.

## Pasang / kemas kini
1. Muat turun ZIP dan **Extract all** ke folder tetap baharu.
2. Buka `chrome://extensions` pada Chrome komputer dan hidupkan **Developer mode**.
3. Jika extension lama masih diperlukan untuk hasil kutipan yang belum dieksport, simpan hasil dahulu. Kemudian nyahaktifkan versi lama untuk mengelakkan tertukar popup.
4. Tekan **Load unpacked** dan pilih folder yang mengandungi **manifest.json**. Jangan pilih ZIP atau folder induk yang salah.
5. Semak versi **0.4.1**. Pin extension melalui ikon Extensions. Muat semula tab MOEIS sebelum memulakan bacaan baharu.
6. Selepas versi baharu dipasang, versi lama boleh dibuang. Jangan buang sebelum menyimpan hasil sementara yang diperlukan.

## Cara paling mudah: MOEIS → CSV → SK@S
1. Log masuk MOEIS sendiri. Buka **Standard 4 → tahun yang betul → satu sesi → Senarai Guru**.
2. Buka extension, isi **kod sekolah dan tahun yang sama**. Tekan **Ambil skor automatik**.
3. Kekalkan tab MOEIS terbuka. Popup boleh ditutup dan dibuka semula untuk melihat kemajuan. Jangan bertukar halaman/tab MOEIS sumber semasa bacaan. Bacaan banyak guru memerlukan masa kerana setiap borang dibaca satu demi satu.
4. Selepas selesai atau dihentikan, pilih **Fail CSV** dan tekan **Muat turun CSV item**. Setiap fail maksimum 50 penilaian; jika 132 rekod berjaya dibaca, terdapat tiga fail. Muat turun setiap fail yang disenaraikan.
5. Di SK@S dengan akaun Admin/Superadmin, buka **Pengurusan Admin → Muat Naik dan Muat Turun SK@S**. Pilih sekolah dan tahun yang betul.
6. Pilih **satu fail CSV**. Semak padanan guru, sesi dan skor dalam pratonton, tandakan pengesahan, kemudian tekan **Simpan sebagai draf**. Ulang fail berikutnya selepas kelompok terdahulu selesai disimpan/dikosongkan. Hanya sesi yang dibenarkan oleh penugasan akaun boleh disimpan. Rekod dihantar/disahkan dikekalkan terkunci.
7. Kembali ke MOEIS, pilih sesi berikutnya dan ulang. Simpan semua CSV sesi terdahulu sebelum memulakan kutipan baharu.

CSV merangkumi semua guru yang berjaya dibaca. Kategori guru dipadankan oleh SK@S; penapis kategori dalam popup digunakan bagi hantaran terus sahaja.

## Hantar terus (pilihan)
Buka SATU tab SK@S pada halaman Muat Naik dan Muat Turun SK@S. Selepas bacaan, tekan **Hantar ke pratonton SK@S**. Maksimum 50 penilaian dihantar setiap kali. Semak dan Simpan dalam SK@S sebelum menghantar kelompok seterusnya. Bilangan dihantar ke pratonton bukan pengesahan bahawa pelayan sudah menyimpan data. CSV kekal pilihan sandaran.

## Perubahan 0.4.1
- Bacaan pautan biasa, data-href/data-url dan URL literal dalam onclick. Kod JavaScript laman tidak dijalankan.
- Pengesanan subaspek menggunakan ID item URL jika menu mempunyai beberapa subaspek dengan bilangan item yang sama; jika masih samar, rekod ditolak.
- Nama guru diperoleh daripada baris Senarai Guru yang dipautkan apabila borang tiada medan NAMA GURU. Nama yang bercanggah ditolak.
- Kemajuan 8 subaspek / 38 item dipaparkan bagi guru semasa.
- Guru tanpa pautan, borang kosong dan bacaan kurang daripada lapan subaspek disenaraikan sebagai amaran; guru lain diteruskan. Sesi tamat menghentikan bacaan.
- Skor sifar kekal sifar, pilihan kosong kekal kosong; tiada skor diandaikan daripada jumlah peratus.
- Muat turun CSV setiap kelompok dan fail teks senarai amaran.

## Had dan status ujian
Ujian automatik menggunakan data rekaan serta struktur diagnostik MOEIS yang telah diberikan. **Bacaan 0.4.1 pada sesi MOEIS sebenar dan simpanan sebenar sekolah belum disahkan.** Mulakan dengan kutipan satu sesi dan bandingkan skor seorang guru dengan paparan MOEIS sebelum mengimport kelompok sekolah. Guru yang tiada pautan skor atau struktur tidak dikenali tidak boleh diambil secara automatik. Tiada andaian URL atau percubaan mendapatkan data tersembunyi.

Pakej juga mengekalkan alat A1–A9 dan pengisian balik subaspek yang lama di bahagian pilihan. Kemas kini ini khusus untuk pengambilan 38 item Standard 4; ia tidak mengesahkan bahawa kutipan A1–A9 sudah berjaya di MOEIS sebenar. Alat manual satu guru memerlukan nama pada borang; jika tiada, gunakan bacaan semua guru dari Senarai Guru.

## Data dan privasi
Bacaan auto Standard 4 menggunakan GET sahaja. Ia tidak menekan Simpan atau mengubah skor MOEIS. Tiada kata laluan, cookie atau token dikutip oleh extension. Halaman MOEIS yang dibaca menggunakan sesi login pengguna. Data sementara disimpan dalam sesi Chrome dan boleh hilang apabila sesi/extension ditamatkan; muat turun CSV sebelum menutupnya. CSV mengandungi nama dan skor guru: simpan pada peranti yang sesuai.

Tiada data sekolah dihantar atau diimport ke pelayan SK@S sehingga cikgu memilih dan menyimpan pratonton. Skor import disimpan sebagai draf mengikut kebenaran, larangan pengesahan sendiri dan kunci rekod sedia ada.

## 0.5.0 — pengisian balik empat modul
Tab SK@S → MOEIS kini mempunyai empat pilihan modul dan lima bahagian Pengurusan.
Pakej `SKAS_MOEIS_UPLOAD_V1` daripada SK@S menyediakan nilai tersimpan dengan label
asal; pengguna memilih rekod dan memadankan medan pada borang MOEIS semasa.
Semua padanan bermula dengan **Jangan isi**. Seluruh pelan disahkan sebelum medan
diubah. Padanan berganda, borang berubah, julat/pilihan tidak tepat dan penukaran
skor mentah 0–4 kepada medan peratus/wajaran ditolak.

Standard 4 menerima CSV berkelompok sehingga 50 penilaian, atau rekod dalam pakej.
Jika NAMA GURU tiada pada borang, identiti diambil daripada Senarai Guru yang
pengguna semak, dengan ID guru serta tahun/sesi URL yang sepadan secara unik.

Pencapaian 5.1 yang dijana MOEIS, medan read-only/disabled, hidden inputs dan
lampiran fail tidak diisi. Program/baris baharu perlu disediakan oleh pengguna
di MOEIS sebelum pemadanan. Extension **tidak menekan Simpan**; pengguna menyemak
nilai dan menyimpan sendiri. Tiada keserasian simpanan sebenar MOEIS didakwa.
Pakej dan pilihan disimpan dalam sesi extension; simpan fail JSON/CSV sebagai
salinan sebelum reload/menaik taraf. Kata laluan, cookie dan token tidak dieksport.
Lihat **MULA-DI-SINI.txt** untuk pemasangan dan aliran penuh.
