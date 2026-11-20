# Life Dashboard

Life Dashboard adalah aplikasi web sederhana untuk membantu mengatur aktivitas harian dalam satu halaman.

## Fitur
- Jam dan tanggal otomatis berdasarkan waktu perangkat.
- Ucapan salam berdasarkan waktu dan nama panggilan.
- Focus timer dengan tombol mulai, berhenti, atur ulang, dan pengaturan durasi.
- Daftar tugas: tambah, edit, tandai selesai, hapus, dan urutkan.
- Jadwal kegiatan: catat kegiatan berdasarkan tanggal dan jam, urut dari yang terdekat.
- Target pribadi: tetapkan target dengan angka dan pantau kemajuannya lewat bilah progres.
- Quick Links untuk menyimpan dan membuka situs favorit.
- Mode terang/gelap.

## Teknologi
- HTML
- CSS
- JavaScript murni (tanpa framework)
- Browser Local Storage untuk menyimpan data di perangkat pengguna.

## Menjalankan project
1. Unduh atau clone repository.
2. Buka `index.html` di browser modern (Chrome, Firefox, Edge, atau Safari).
3. Tidak membutuhkan server backend atau instalasi dependency.

## Struktur folder
```text
life-dashboard/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── script.js
├── .kiro/
│   └── README.md
└── README.md
```

## Publikasi GitHub Pages
1. Unggah seluruh isi folder project ke repository GitHub.
2. Buka **Settings → Pages** pada repository.
3. Pada bagian Build and deployment, pilih **Deploy from a branch**.
4. Pilih branch `main` dan folder `/ (root)`, lalu klik **Save**.
5. Tunggu proses deployment dan buka URL GitHub Pages yang diberikan GitHub.

Data tugas, nama, tema, durasi timer, dan tautan disimpan pada Local Storage browser yang digunakan. Data tidak disinkronkan ke perangkat atau browser lain.
