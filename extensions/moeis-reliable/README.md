# SK@S → MOEIS berpandu 0.7.1

Versi pembangunan berasingan untuk menguji satu borang Pengurusan Kami yang betul sebelum menyambung pengisian pukal. Tidak mengubah aplikasi SK@S atau akaun.

## Pasang
Nyahaktifkan versi lama. Muat turun ZIP cabang ini, extract, buka chrome://extensions → Developer mode → Load unpacked → pilih folder extensions/moeis-reliable (folder manifest.json).

## Guna
1. Log masuk MOEIS sendiri. Buka standard melalui menu sebenar; untuk unit, klik ikon pensel unit.
2. Buka extension, pilih pakej JSON SK@S dan rekod sumber.
3. Tekan Semak borang semasa. Semak laluan, nombor standard, nama unit dan setiap skor.
4. Tandakan pengesahan, tekan Isi, Simpan dan Sahkan.
5. Tunggu hasil. Popup boleh ditutup; jangan navigasi tab atau tutup pelayar ketika semakan.
6. Muat turun laporan; buka semula borang melalui menu MOEIS untuk pengesahan bebas.

Hanya skor tersedia (termasuk 0) diubah. Skor kosong tidak diisi. Simpan dihantar sekali. Laporan disahkan hanya apabila HTML daripada GET baharu dengan cache no-store menunjukkan pilihan skor yang sepadan pada identiti borang sama. Jika pelayan menjana skor melalui JavaScript, atau destinasi/identiti berubah, status kekal belum disahkan.

Nama unit mesti diperiksa pengguna; versi ini tidak melakukan padanan nama automatik atau pengisian pukal. Tidak melaporkan peratus keseluruhan sekolah. Tiada kata laluan, token atau data sekolah sebenar dalam kod. JSON dipegang dalam memori popup. Laporan hanya rekod terakhir disimpan pada peranti.

## Status ujian
Ujian Node untuk laluan/skor dan regresi argumen Chrome telah lulus. Semua fail JavaScript lulus semakan sintaks. Integrasi Chrome dan simpanan pelayan MOEIS BELUM diuji; bukan pengganti stabil bagi versi lama sehingga ujian borang sebenar disahkan. Fail ini ialah sumber pembangunan, bukan bukti simpanan berjaya.


## Pembetulan 0.7.1
Argumen kosong kepada chrome.scripting.executeScript kini dihantar sebagai null, bukan undefined. Ini membetulkan ralat args index 2: Value is unserializable ketika Semak borang semasa. Ujian: node tests/core.test.cjs dan node tests/background.test.cjs. Pengesahan simpanan MOEIS sebenar masih diperlukan.
