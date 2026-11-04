const fs = require('fs');
const path = './data/database_snbt.json';

// Validasi keberadaan file database SNBT
if (!fs.existsSync(path)) {
    console.error("File data/database_snbt.json tidak ditemukan!");
    process.exit(1);
}

const db = JSON.parse(fs.readFileSync(path, 'utf8'));
console.log(`=== AUDIT INTEGRITAS & KUALITAS DATABASE SNBT (${db.length} PRODI) ===\n`);

const cacatTeknis = [];
const prodiSepi = [];

db.forEach((item, index) => {
    const issues = [];
    const prodi = (item.prodi || item.nama_prodi || item.nama || '').trim();
    const kampus = (item.kampus || item.nama_ptn || item.ptn || '').trim();
    const daya = Number(item.dayaTampung || item.daya_tampung || item.kuota || 0);
    const peminat = Number(item.peminat || item.jumlah_peminat || 0);
    const ketat = Number(item.keketatan || 0);

    // 1. Audit Struktural (Parsing / Scraping Error)
    if (!prodi || prodi.length < 3) {
        issues.push("Nama prodi kosong atau terlalu pendek");
    } else if (prodi.toUpperCase() === kampus.toUpperCase()) {
        issues.push("Nama prodi tertukar dengan nama kampus");
    } else if (/DAYA TAMPUNG|SNBT|KODE PRODI|NO\.|PORTOFOLIO/i.test(prodi)) {
        issues.push("Nama prodi tertukar dengan teks header tabel");
    }

    // 2. Audit Kuota Pokok
    if (daya <= 0) {
        issues.push("Daya tampung bernilai 0 / kosong");
    }

    // 3. Klasifikasi Realitas Peminat (Membedakan Error vs Fakta Lapangan)
    if (peminat === 0) {
        prodiSepi.push({
            index: index + 1,
            kampus,
            prodi,
            daya,
            peminat,
            status: "Prodi Baru / Tanpa Riwayat Peminat Tahun Lalu"
        });
    } else if (peminat > 0 && peminat < daya) {
        prodiSepi.push({
            index: index + 1,
            kampus,
            prodi,
            daya,
            peminat,
            status: `Peminat Rendah (Wilayah Khusus/Seni: ${peminat} pelamar untuk ${daya} kursi)`
        });
    }

    // 4. Audit Integritas Angka Keketatan
    if (isNaN(ketat) || ketat < 0) {
        issues.push("Nilai keketatan corrupt (NaN/minus)");
    }

    if (issues.length > 0) {
        cacatTeknis.push({
            index: index + 1,
            kampus,
            prodi,
            daya,
            peminat,
            kendala: issues.join(", ")
        });
    }
});

// Cetak Ringkasan Hasil Audit
console.log(`1. Cacat Teknis Murni (Wajib Dipatch): ${cacatTeknis.length} prodi`);
console.log(`2. Prodi Sepi / Wilayah Khusus (Data Wajar): ${prodiSepi.length} prodi\n`);

if (cacatTeknis.length > 0) {
    console.log("--- SAMPEL CACAT TEKNIS (MAKS. 15 DATA) ---");
    console.table(cacatTeknis.slice(0, 15).map(c => ({
        No: c.index,
        Kampus: c.kampus.slice(0, 25),
        Prodi: c.prodi.slice(0, 25),
        Daya: c.daya,
        Kendala: c.kendala
    })));
    fs.writeFileSync('./data/cacat_teknis_snbt.json', JSON.stringify(cacatTeknis, null, 2), 'utf8');
    console.log(`\nLaporan daftar cacat teknis tersimpan di: data/cacat_teknis_snbt.json`);
} else {
    console.log("Status: 100% Bersih. Tidak ditemukan cacat teknis struktural pada database SNBT.");
}

if (prodiSepi.length > 0) {
    fs.writeFileSync('./data/prodi_sepi_peminat_snbt.json', JSON.stringify(prodiSepi, null, 2), 'utf8');
    console.log(`Data referensi prodi sepi tersimpan di: data/prodi_sepi_peminat_snbt.json`);
}