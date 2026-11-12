# Sambungan evidens Apps Script

Setiap sekolah menggunakan deployment Apps Script dan kunci sendiri. Sistem tidak mengaktifkan sambungan atau menukar kebenaran Drive secara automatik.

1. Admin sekolah membuka Tetapan evidens dan memasukkan folder Google Drive bagi modul yang digunakan. Pilih kaedah Apps Script dan simpan.
2. Tekan **Muat turun skrip sekolah**. Fail `.gs` mengandungi kod sekolah, senarai folder dibenarkan dan kunci khusus sekolah. Simpan secara peribadi. Menjana semula menggantikan kunci terdahulu.
3. Pemilik folder membuka Google Apps Script, mencipta projek dan menggantikan kandungan Code.gs dengan fail tersebut.
4. Deploy sebagai Web app, Execute as **Me**, akses **Anyone**, dan benarkan akses Google Drive pada akaun pemilik. Jika dasar DELIMa menyekat pilihan ini, pentadbir Google organisasi perlu meluluskannya. Jangan ubah dasar organisasi untuk memintas sekatan.
5. Tampal URL `/exec` ke Tetapan evidens, simpan, kemudian tekan **Uji sambungan Apps Script**.
6. Uji dengan satu fail rekaan kecil. Fail sepatutnya berada dalam folder modul/kod sekolah/tahun/kod aspek. Pautan masuk ke borang; pengguna masih perlu menyimpan draf skor.

Nama fail ditentukan pelayan, contohnya `1.1.1.A(1).pdf` atau `A2-001.jpg`. Had Apps Script dalam SK@S ialah 5 MB setiap fail. Penggunaan tertakluk kepada kuota Apps Script dan storan Drive akaun pemilik. Tiada Google Cloud billing disediakan oleh integrasi ini; infrastruktur SK@S sedia ada masih tertakluk kepada pelannya sendiri.

## Kawalan akses

Pelayar tidak menerima kunci sambungan semasa muat naik. Pelayan mengesahkan sesi sekolah, akaun aktif, penugasan atau peranan Admin, status skor dan pemilikan tiket muat naik. Kandungan dan destinasi ditandatangani HMAC SHA-256. Skrip menyemak tandatangan, kod sekolah, tempoh lima minit, folder dibenarkan, saiz dan jenis fail. Nama tiket menjadikan percubaan semula idempoten. Perkongsian fail tidak diubah; ia mengikut folder Google Drive.

URL deployment perlu boleh menerima permintaan pelayan, tetapi endpoint itu tidak menerima muat naik tanpa tandatangan sah. Kunci mesti kekal peribadi. Jika terdedah, jana semula skrip dan kemas kini deployment. Jangan berkongsi kod projek Apps Script dengan pengguna yang tidak patut mengakses kunci tersebut.

## Cetakan

Cetakan Pengurusan menggunakan susunan sel dan tajuk daripada `TAPAK SKOR SK@S 2026.xlsx`, dipadankan dengan rubrik semasa dan semua 178 tindakan sistem. Sesetengah lembaran sumber mempunyai bilangan tindakan berlainan, jadi skor semasa tidak dipotong untuk memadankan bilangan lama. Nama panitia/unit datang daripada sekolah yang sedang log masuk, bukan nama contoh templat. Semua unit tambahan dicetak. Catatan dan pautan evidens dicetak selepas jadual skor.

Hasil sebenar perlu disemak dalam print preview pelayar selepas penerbitan. Dataset templat hanya menyertakan tajuk/rubrik/layout, tanpa senarai guru, nombor IC atau nama panitia sekolah sumber.
