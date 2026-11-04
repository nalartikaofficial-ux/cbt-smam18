import rawData from './database_snbt.json';

export interface ProdiItem {
    id: string;
    kodeKampus: string;
    kampus: string;
    kodeProdi: string | null;
    prodi: string;
    jenjang: string;
    dayaTampung: number;
    peminat: number;
    keketatan: number;
    passingGrade: number;
    kelompok: 'SAINTEK' | 'SOSHUM';
}

function tentukanKelompok(namaProdi: string): 'SAINTEK' | 'SOSHUM' {
    const p = (namaProdi || '').toUpperCase();
    if (
        /HUKUM|MANAJEMEN|AKUNTANSI|EKONOMI|SOSIOLOGI|PSIKOLOGI|SEJARAH|SASTRA|PENDIDIKAN BAHASA|GEOGRAFI|ILMU POLITIK|ADMINISTRASI|KOMUNIKASI|HUBUNGAN INTERNASIONAL/i.test(p) &&
        !/PENDIDIKAN DOKTER|TEKNIK|ILMU KOMPUTER|INFORMATIKA|FARMASI|GIZI|KIMIA|BIOLOGI|FISIKA|MATEMATIKA/i.test(p)
    ) {
        return 'SOSHUM';
    }
    return 'SAINTEK';
}

export const LIST_PRODI_SNBT: ProdiItem[] = (rawData as any[]).map((item) => ({
    id: String(item.id),
    kodeKampus: String(item.kodeKampus || ''),
    kampus: String(item.kampus || ''),
    kodeProdi: item.kodeProdi ? String(item.kodeProdi) : null,
    prodi: String(item.prodi || ''),
    jenjang: String(item.jenjang || 'S1'),
    dayaTampung: Number(item.dayaTampung || 0),
    peminat: Number(item.peminat || 0),
    keketatan: Number(item.keketatan || 0),
    passingGrade: Number(item.passingGrade || 650),
    kelompok: tentukanKelompok(item.prodi)
}));