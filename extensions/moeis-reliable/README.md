# SK@S → MOEIS berpandu 0.7.2

## Pembetulan versi ini
Perbandingan pratonton menggunakan nilai data, bukan susunan kunci objek.
Susunan kunci yang berubah semasa pemindahan mesej Chrome tidak lagi
menyebabkan amaran palsu Borang berubah sejak pratonton.
Perubahan nilai skor, bilangan medan, alamat atau identiti borang sebenar
masih menyekat penghantaran. Mesej ralat menyenaraikan medan yang berubah.

## Pasang
1. Extract ZIP ke folder baharu.
2. Nyahaktifkan versi lama di chrome://extensions.
3. Hidupkan Developer mode, pilih Load unpacked.
4. Pilih folder yang terus mengandungi manifest.json.
5. Pastikan versi 0.7.2; muat semula tab MOEIS.

## Ujian satu borang
Buka borang sebenar melalui menu MOEIS atau ikon pensel.
Pilih pakej SKAS_KE_MOEIS...json, bukan fail laporan extension.
Pilih rekod yang sama dengan borang MOEIS, contohnya 3.2.4.1 · BOLA SEPAK.
Tekan Semak borang semasa. Semak nama unit, standard dan skor dalam pratonton.
Jangan ubah/navigasi halaman selepas pratonton.
Tandakan pengesahan dan tekan Isi, Simpan dan Sahkan.
Tunggu keputusan semakan pelayan. Muat turun laporan.
Buka semula borang melalui menu MOEIS untuk semakan bebas.

## Maksud pengesahan
Simpan dihantar sekali. Respons HTML pelayan dibaca dengan cache no-store.
Skor dalam DOM yang diubah extension bukan bukti simpanan.
Jika skor belum sepadan atau identiti berubah, laporan kekal unconfirmed.
Popup boleh ditutup; semakan diteruskan dalam background selagi tab/pelayar
dan extension kekal tersedia. Elakkan menukar tab sasaran semasa proses.

## Status
Ujian Node laluan/skor, argumen suntikan Chrome dan fixture DOM lulus.
Fixture menghasilkan semula kegagalan perbandingan susunan kunci versi lama,
dan memastikan nilai skor/identiti yang benar-benar berubah tetap ditolak.
Pemasangan Chrome sebenar dan simpanan MOEIS versi ini belum disahkan.
Belum menyokong pengisian pukal; tujuan semasa ialah membuktikan satu borang
yang betul dapat disimpan sebelum automasi pukal diteruskan.

## Ujian pembangunan
npm install
npm test
Tiada akaun atau data sekolah sebenar digunakan dalam ujian.
