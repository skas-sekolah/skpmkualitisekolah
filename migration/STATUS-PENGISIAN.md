## Status Pengisian

Halaman pemantauan baca sahaja tersedia kepada Admin, PGB dan pentadbir sekolah untuk sekolah sendiri, serta Super Admin dan PPD melalui pilihan sekolah. Lima kategori mengikut TAPAK SKOR SK@S 2026: Pengurusan, Panitia Mata Pelajaran, Kelab/Persatuan, Badan Beruniform, Sukan/Permainan. Setiap panitia mempunyai rekod berasingan bagi 3.1.2.1–3.1.2.4.

- **Selesai:** semua skor lengkap dan rekod dihantar/disahkan.
- **Sedang mengisi:** ada skor (termasuk sifar), catatan atau evidens, atau rekod dipulangkan untuk pembetulan.
- **Belum mengisi:** belum ada pengisian; penetapan PPS sahaja tidak dikira.
- **Evidens Ada/Tiada:** sekurang-kurangnya satu pautan HTTP(S) direkodkan. Bukan pengesahan kebolehcapaian atau kelengkapan semua evidens.

Paparan mengambil rekod pelayan, ditapis mengikut tahun dan disegar semula setiap 60 saat. CSV dan cetak/PDF menggunakan penapis aktif. Pautan evidens, skor mentah, pengenalan peribadi dan token tidak dihantar melalui endpoint pemantauan. Senarai unit sedia ada digunakan; jika BBA8284 tahun 2026 belum menetapkan unit, nama rujukan daripada helaian dipaparkan dengan tanda belum ditetapkan. Halaman ini tidak menulis data, menetapkan PPS atau mengubah skor.

Endpoint baca sahaja: `/api/management` action `status` untuk sekolah; `/api/owner` dan `/api/ppd` action `status` untuk senarai/pilihan sekolah. Perlu menerbitkan backend dan frontend bersama untuk mengaktifkan halaman.

Ujian: `node scripts/test-filling-status.mjs`.
