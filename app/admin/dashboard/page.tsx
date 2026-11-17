"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
    BarChart3,
    Trophy,
    ShieldCheck,
    Search,
    Printer,
    ChevronLeft,
    GraduationCap,
    Home,
    CheckCircle2,
    RefreshCw,
    SlidersHorizontal,
    X,
    TrendingUp,
    TrendingDown,
    Minus,
    Layers,
    Award,
    AlertTriangle,
    PieChart,
    EyeOff,
    Eye
} from "lucide-react";

export interface RealStudentResult {
    nisn: string;
    nama: string;
    kelas: string;
    status: string;
    paket_aktif?: string;
    violations: number;
    score: number;
    nilai_tps?: number;
    nilai_literasi?: number;
    skor_pu?: number;
    skor_ppu?: number;
    skor_pbm?: number;
    skor_pk?: number;
    skor_lit_indo?: number;
    skor_lit_eng?: number;
    skor_pm?: number;
    benar?: number;
    salah?: number;
    kosong?: number;
    waktu_mulai?: string;
    waktu_selesai?: string;
    pilihan_kampus_1?: string;
    pilihan_kampus_2?: string;
}

export interface ExamAttemptRecord {
    id: string;
    nisn: string;
    nama: string;
    kelas: string;
    paket: string;
    score: number;
    nilai_tps: number;
    nilai_literasi: number;
    skor_pu: number;
    skor_ppu: number;
    skor_pbm: number;
    skor_pk: number;
    skor_lit_indo: number;
    skor_lit_eng: number;
    skor_pm: number;
    benar: number;
    salah: number;
    kosong: number;
    violations: number;
    pilihan_kampus_1?: string;
    pilihan_kampus_2?: string;
    completed_at: string;
}

const SUBTEST_LABELS = [
    {
        key: "skor_pu",
        code: "PU",
        shortName: "Penalaran Umum",
        name: "Penalaran Umum (PU)",
        rekomendasi: "Perbanyak latihan silogisme, logika deduktif-induktif, dan analisis pola bilangan/grafik."
    },
    {
        key: "skor_ppu",
        code: "PPU",
        shortName: "Pemahaman Umum",
        name: "Pengetahuan & Pemahaman Umum (PPU)",
        rekomendasi: "Perkuat penguasaan makna kontekstual kata, relasi semantik, dan ide pokok paragraf."
    },
    {
        key: "skor_pbm",
        code: "PBM",
        shortName: "Bacaan & Menulis",
        name: "Pemahaman Bacaan & Menulis (PBM)",
        rekomendasi: "Fokus pada kaidah PUEBI/EYD V, kalimat efektif, konjungsi, dan kepaduan antarparagraf."
    },
    {
        key: "skor_pk",
        code: "PK",
        shortName: "Pengetahuan Kuantitatif",
        name: "Pengetahuan Kuantitatif (PK)",
        rekomendasi: "Latih konsep dasar aljabar, geometri bidang, statistika deskriptif, dan kecukupan data."
    },
    {
        key: "skor_lit_indo",
        code: "LIT_INDO",
        shortName: "Lit. B. Indonesia",
        name: "Literasi Bahasa Indonesia",
        rekomendasi: "Biasakan membaca teks panjang saintek/soshum untuk menarik kesimpulan tersirat secara cepat."
    },
    {
        key: "skor_lit_eng",
        code: "LIT_ENG",
        shortName: "Lit. B. Inggris",
        name: "Literasi Bahasa Inggris",
        rekomendasi: "Perkuat pemahaman author's tone, inference, purpose of text, dan perbandingan dua teks opini."
    },
    {
        key: "skor_pm",
        code: "PM",
        shortName: "Penalaran Matematika",
        name: "Penalaran Matematika (PM)",
        rekomendasi: "Latih pemodelan soal cerita kontekstual ke bentuk persamaan matematika dan analisis tabel."
    }
] as const;

function isDummyAccount(nisn: string): boolean {
    const clean = (nisn || "").trim();
    return clean === "0000000000" || clean === "1111111111" || /^0+$/.test(clean) || /^1+$/.test(clean);
}

function getUnifiedScore(item: Partial<RealStudentResult>): number {
    const subs = [
        Number(item.skor_pu) || 0,
        Number(item.skor_ppu) || 0,
        Number(item.skor_pbm) || 0,
        Number(item.skor_pk) || 0,
        Number(item.skor_lit_indo) || 0,
        Number(item.skor_lit_eng) || 0,
        Number(item.skor_pm) || 0
    ];
    const hasSubtestData = subs.some((v) => v > 0);
    if (hasSubtestData) {
        const sum = subs.reduce((a, b) => a + b, 0);
        return Math.round(sum / 7);
    }
    return Math.round(Number(item.score) || 0);
}

function getUnifiedTps(item: Partial<RealStudentResult>): number {
    const tps = [
        Number(item.skor_pu) || 0,
        Number(item.skor_ppu) || 0,
        Number(item.skor_pbm) || 0,
        Number(item.skor_pk) || 0
    ];
    if (tps.some((v) => v > 0)) {
        return Math.round(tps.reduce((a, b) => a + b, 0) / 4);
    }
    return Math.round(Number(item.nilai_tps) || 0);
}

function getUnifiedLiterasi(item: Partial<RealStudentResult>): number {
    const lit = [
        Number(item.skor_lit_indo) || 0,
        Number(item.skor_lit_eng) || 0,
        Number(item.skor_pm) || 0
    ];
    if (lit.some((v) => v > 0)) {
        return Math.round(lit.reduce((a, b) => a + b, 0) / 3);
    }
    return Math.round(Number(item.nilai_literasi) || 0);
}

export default function AdminAnalyticsPage() {
    const [students, setStudents] = useState<RealStudentResult[]>([]);
    const [attempts, setAttempts] = useState<ExamAttemptRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedClass, setSelectedClass] = useState("ALL");
    const [hideDummyData, setHideDummyData] = useState(false);
    const [activeTab, setActiveTab] = useState<"ranking" | "progres_to" | "subtes_angkatan">("ranking");

    const [officials, setOfficials] = useState({
        kepalaSekolahNama: "Drs. H. Ahmad Dahlan, M.Pd.",
        kepalaSekolahNbm: "882.118.001",
        koordinatorNama: "Fadhillah Umar, S.Pd.",
        koordinatorNbm: "118.2026.091",
        koordinatorJabatan: "Koordinator Kurikulum & Asesmen SNBT"
    });

    const [selectedStudentForReport, setSelectedStudentForReport] = useState<RealStudentResult | null>(null);

    const fetchStudents = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/students?history=true&_t=${Date.now()}`, {
                cache: "no-store"
            });
            const json = await res.json();
            if (json.status === "success") {
                if (Array.isArray(json.data)) setStudents(json.data);
                if (Array.isArray(json.attempts)) setAttempts(json.attempts);
            }
        } catch (err) {
            console.error("Gagal memuat data analitik Supabase:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const raw = sessionStorage.getItem("logged_user");
        if (raw) {
            const user = JSON.parse(raw);
            if (user.role !== "admin") {
                alert("Akses ditolak! Halaman ini khusus Administrator.");
                window.location.href = "/admin";
                return;
            }
        } else {
            window.location.href = "/admin";
            return;
        }

        fetchStudents();
    }, []);

    const activeStudentsPool = useMemo(() => {
        return hideDummyData ? students.filter((s) => !isDummyAccount(s.nisn)) : students;
    }, [students, hideDummyData]);

    const activeAttemptsPool = useMemo(() => {
        return hideDummyData ? attempts.filter((a) => !isDummyAccount(a.nisn)) : attempts;
    }, [attempts, hideDummyData]);

    const finishedStudents = useMemo(() => {
        return activeStudentsPool
            .filter((s) => s.status === "Selesai" || Number(s.score) > 0)
            .sort((a, b) => getUnifiedScore(b) - getUnifiedScore(a));
    }, [activeStudentsPool]);

    const availableClasses = useMemo(() => {
        const setCls = new Set<string>();
        activeStudentsPool.forEach((s) => {
            if (s.kelas && s.kelas.trim()) setCls.add(s.kelas.trim());
        });
        return Array.from(setCls).sort();
    }, [activeStudentsPool]);

    const filteredStudents = useMemo(() => {
        return finishedStudents.filter((s) => {
            const matchClass = selectedClass === "ALL" || s.kelas === selectedClass;
            const q = searchQuery.toLowerCase();
            const matchSearch =
                s.nama.toLowerCase().includes(q) ||
                s.nisn.includes(searchQuery) ||
                (s.pilihan_kampus_1 && s.pilihan_kampus_1.toLowerCase().includes(q));
            return matchClass && matchSearch;
        });
    }, [finishedStudents, selectedClass, searchQuery]);

    // Perbandingan Progres Kronologis TO-1 -> TO-2 -> TO-3 (Bebas Bug Urutan & Encoding)
    const studentProgressionList = useMemo(() => {
        const map = new Map<
            string,
            {
                nisn: string;
                nama: string;
                kelas: string;
                to1?: ExamAttemptRecord;
                to2?: ExamAttemptRecord;
                to3?: ExamAttemptRecord;
                history: ExamAttemptRecord[];
            }
        >();

        const chronoAttempts = [...activeAttemptsPool].sort(
            (a, b) => new Date(a.completed_at || 0).getTime() - new Date(b.completed_at || 0).getTime()
        );

        chronoAttempts.forEach((att) => {
            if (!map.has(att.nisn)) {
                map.set(att.nisn, {
                    nisn: att.nisn,
                    nama: att.nama,
                    kelas: att.kelas,
                    history: []
                });
            }
            const entry = map.get(att.nisn)!;
            entry.history.push(att);
            const pkt = (att.paket || "").toUpperCase();
            if (pkt === "PAKET_1") entry.to1 = att;
            else if (pkt === "PAKET_2") entry.to2 = att;
            else if (pkt === "PAKET_3") entry.to3 = att;
        });

        return Array.from(map.values()).filter((item) => {
            const matchClass = selectedClass === "ALL" || item.kelas === selectedClass;
            const q = searchQuery.toLowerCase();
            const matchSearch = item.nama.toLowerCase().includes(q) || item.nisn.includes(searchQuery);
            return matchClass && matchSearch;
        });
    }, [activeAttemptsPool, selectedClass, searchQuery]);

    // Analitik Agregat Lintas TO (Sebelum vs Sesudah), Distribusi Kesiapan, & Perbandingan Kelas
    const executiveAnalytics = useMemo(() => {
        const totalSelesai = finishedStudents.length;
        const totalTerdaftar = activeStudentsPool.length;
        const avgScore =
            totalSelesai > 0
                ? Math.round((finishedStudents.reduce((acc, curr) => acc + getUnifiedScore(curr), 0) / totalSelesai) * 10) / 10
                : 0;

        const amanCount = finishedStudents.filter((s) => getUnifiedScore(s) >= 650).length;
        const kompetitifCount = finishedStudents.filter((s) => {
            const sc = getUnifiedScore(s);
            return sc >= 520 && sc < 650;
        }).length;
        const bimbinganCount = finishedStudents.filter((s) => getUnifiedScore(s) < 520).length;

        const persentaseTarget = totalSelesai > 0 ? Math.round((amanCount / totalSelesai) * 100) : 0;
        const totalPelanggaran = finishedStudents.reduce((acc, curr) => acc + (Number(curr.violations) || 0), 0);
        const integritasRate = Math.max(0, 100 - totalPelanggaran * 3);

        // Perbandingan Rata-rata Kelas
        const classGroups = new Map<string, { total: number; count: number }>();
        finishedStudents.forEach((s) => {
            const cls = (s.kelas || "Umum").trim();
            const prev = classGroups.get(cls) || { total: 0, count: 0 };
            classGroups.set(cls, { total: prev.total + getUnifiedScore(s), count: prev.count + 1 });
        });
        const classComparison = Array.from(classGroups.entries())
            .map(([kelas, val]) => ({
                kelas,
                avg: Math.round((val.total / val.count) * 10) / 10,
                count: val.count
            }))
            .sort((a, b) => b.avg - a.avg);

        // Perbandingan Rata-rata Sebelum vs Sesudah (TO-1 vs TO-2 vs TO-3)
        const paketList = ["PAKET_1", "PAKET_2", "PAKET_3"] as const;
        const tryoutTrend = paketList.map((pkt, idx) => {
            const matched = activeAttemptsPool.filter((a) => (a.paket || "").toUpperCase() === pkt);
            const avg =
                matched.length > 0
                    ? Math.round((matched.reduce((sum, item) => sum + getUnifiedScore(item), 0) / matched.length) * 10) / 10
                    : 0;
            return {
                label: `TO-${idx + 1}`,
                paket: pkt,
                avg,
                participants: matched.length
            };
        });

        return {
            totalTerdaftar,
            totalSelesai,
            avgScore,
            amanCount,
            kompetitifCount,
            bimbinganCount,
            persentaseTarget,
            integritasRate,
            classComparison,
            tryoutTrend
        };
    }, [finishedStudents, activeStudentsPool, activeAttemptsPool]);

    const subtestClassAverages = useMemo(() => {
        const count = filteredStudents.length;
        return SUBTEST_LABELS.map((sub) => {
            if (count === 0) return { ...sub, avg: 0 };
            const total = filteredStudents.reduce((acc, s) => acc + (Number((s as any)[sub.key]) || 0), 0);
            return { ...sub, avg: Math.round((total / count) * 10) / 10 };
        });
    }, [filteredStudents]);

    const subtestHighlights = useMemo(() => {
        if (filteredStudents.length === 0) return { strongest: [], weakest: [] };
        const sortedDesc = [...subtestClassAverages].sort((a, b) => b.avg - a.avg);
        const sortedAsc = [...subtestClassAverages].sort((a, b) => a.avg - b.avg);
        return {
            strongest: sortedDesc.slice(0, 2),
            weakest: sortedAsc.slice(0, 2)
        };
    }, [subtestClassAverages, filteredStudents.length]);

    // Analisis Mendalam untuk Siswa yang Diklik pada Modal Rapor
    const reportDiagnostic = useMemo(() => {
        if (!selectedStudentForReport) return null;

        const unifiedScore = getUnifiedScore(selectedStudentForReport);
        const unifiedTps = getUnifiedTps(selectedStudentForReport);
        const unifiedLit = getUnifiedLiterasi(selectedStudentForReport);

        const subtestScores = SUBTEST_LABELS.map((sub) => {
            const val = Number((selectedStudentForReport as any)[sub.key]) || 200;
            return {
                ...sub,
                score: val,
                gap: Math.round((val - 650) * 10) / 10,
                isPassed: val >= 650
            };
        });

        const sortedDesc = [...subtestScores].sort((a, b) => b.score - a.score);
        const strengths = sortedDesc.slice(0, 2);
        const weaknesses = [...subtestScores].sort((a, b) => a.score - b.score).slice(0, 2);

        const benar = Number(selectedStudentForReport.benar) || 0;
        const salah = Number(selectedStudentForReport.salah) || 0;
        const kosong = Number(selectedStudentForReport.kosong) || 0;
        const totalSoal = Math.max(1, benar + salah + kosong);
        const dijawab = benar + salah;
        const akurasiJawab = dijawab > 0 ? Math.round((benar / dijawab) * 100) : 0;
        const tingkatPartisipasi = Math.round((dijawab / totalSoal) * 100);

        const studentAttempts = attempts
            .filter((a) => a.nisn === selectedStudentForReport.nisn)
            .sort((a, b) => new Date(a.completed_at || 0).getTime() - new Date(b.completed_at || 0).getTime())
            .map((a) => ({
                ...a,
                unifiedScore: getUnifiedScore(a),
                unifiedTps: getUnifiedTps(a),
                unifiedLit: getUnifiedLiterasi(a)
            }));

        return {
            unifiedScore,
            unifiedTps,
            unifiedLit,
            subtestScores,
            strengths,
            weaknesses,
            benar,
            salah,
            kosong,
            totalSoal,
            akurasiJawab,
            tingkatPartisipasi,
            studentAttempts
        };
    }, [selectedStudentForReport, attempts]);

    const handleOpenStudentByNisn = (nisn: string) => {
        const found = students.find((s) => s.nisn === nisn);
        if (found) {
            setSelectedStudentForReport(found);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
            <style
                dangerouslySetInnerHTML={{
                    __html: `
            @page {
              size: A4 portrait;
              margin: 10mm 14mm 10mm 14mm;
            }
            @media print {
              html, body {
                background: #ffffff !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                color: #000000 !important;
                font-family: 'Times New Roman', Times, serif !important;
                font-size: 10.5pt !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .print-hidden {
                display: none !important;
              }
              .print-sheet {
                background: #ffffff !important;
                box-shadow: none !important;
                border: none !important;
                border-radius: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
              }
              .kop-divider-thick {
                border-bottom: 2.5px solid #000000 !important;
                margin-top: 6px !important;
              }
              .kop-divider-thin {
                border-bottom: 1px solid #000000 !important;
                margin-top: 2px !important;
              }
            }
          `
                }}
            />

            {/* HEADER ATAS */}
            <header className="print-hidden bg-white border-b border-slate-200/90 py-3 sm:py-3.5 px-3.5 sm:px-8 sticky top-0 z-30 shadow-2xs">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 w-full sm:w-auto">
                        <Link
                            href="/admin"
                            className="p-1.5 sm:p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors shrink-0 cursor-pointer"
                            title="Kembali ke Hub Utama Admin"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Link>
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white border border-slate-200 p-0.5 flex items-center justify-center overflow-hidden shrink-0">
                            <img
                                src="https://iqflpgrliqztoecpzrnu.supabase.co/storage/v1/object/public/cbt-assets/logo-timsim.jpg"
                                alt="Logo SMA Muhammadiyah 18 Jakarta"
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                    (e.target as any).src = "/images/logo-smam18.png";
                                }}
                            />
                        </div>
                        <div className="min-w-0">
                            <div className="text-xs sm:text-sm font-black text-slate-900 tracking-tight uppercase truncate">
                                PUSAT ANALITIK & PROGRES TRYOUT SNBT
                            </div>
                            <div className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate">
                                SMA Muhammadiyah 18 Jakarta • Terhubung Real-Time Supabase
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 flex-wrap">
                        <button
                            type="button"
                            onClick={() => setHideDummyData(!hideDummyData)}
                            className={`px-3 py-1.5 sm:py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${hideDummyData
                                ? "bg-amber-50 border-amber-300 text-amber-800"
                                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                                }`}
                        >
                            {hideDummyData ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            <span>{hideDummyData ? "Data Uji Coba Disembunyikan" : "Sembunyikan Uji Coba"}</span>
                        </button>

                        <button
                            onClick={fetchStudents}
                            disabled={isLoading}
                            className="px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-blue-600" : ""}`} />
                            <span className="hidden sm:inline">Muat Ulang Data</span>
                        </button>

                        <Link
                            href="/"
                            className="p-1.5 sm:p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                            title="Ke Halaman Utama"
                        >
                            <Home className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </header>

            {/* KONTEN UTAMA */}
            <div className="max-w-7xl w-full mx-auto p-3.5 sm:p-6 space-y-4 sm:space-y-6 text-left">
                {/* PANEL PENGATURAN PEJABAT PENANDATANGAN */}
                <div className="print-hidden bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                        <SlidersHorizontal className="w-4 h-4 text-blue-700 shrink-0" />
                        <div>
                            <h3 className="font-bold text-xs sm:text-sm text-slate-900">
                                Pengaturan Pejabat Penandatangan Rapor
                            </h3>
                            <p className="text-[10.5px] sm:text-[11px] text-slate-500">
                                Ketik nama kepala sekolah, nama koordinator, dan sesuaikan titel jabatannya agar tercetak otomatis pada rapor siswa.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3.5 text-xs">
                        <div className="space-y-1">
                            <label className="font-bold font-mono text-slate-700 text-[10.5px] sm:text-xs">NAMA KEPALA SEKOLAH:</label>
                            <input
                                type="text"
                                value={officials.kepalaSekolahNama}
                                onChange={(e) => setOfficials({ ...officials, kepalaSekolahNama: e.target.value })}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold focus:border-blue-700 outline-none text-xs"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="font-bold font-mono text-slate-700 text-[10.5px] sm:text-xs">NIP / NBM KEPALA SEKOLAH:</label>
                            <input
                                type="text"
                                value={officials.kepalaSekolahNbm}
                                onChange={(e) => setOfficials({ ...officials, kepalaSekolahNbm: e.target.value })}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono focus:border-blue-700 outline-none text-xs"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="font-bold font-mono text-slate-700 text-[10.5px] sm:text-xs">NAMA KOORDINATOR / GURU BK:</label>
                            <input
                                type="text"
                                value={officials.koordinatorNama}
                                onChange={(e) => setOfficials({ ...officials, koordinatorNama: e.target.value })}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold focus:border-blue-700 outline-none text-xs"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="font-bold font-mono text-slate-700 text-[10.5px] sm:text-xs">NIP / NBM KOORDINATOR:</label>
                            <input
                                type="text"
                                value={officials.koordinatorNbm}
                                onChange={(e) => setOfficials({ ...officials, koordinatorNbm: e.target.value })}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono focus:border-blue-700 outline-none text-xs"
                            />
                        </div>

                        <div className="sm:col-span-2 space-y-1">
                            <label className="font-bold font-mono text-slate-700 text-[10.5px] sm:text-xs">TITEL JABATAN KOORDINATOR (BEBAS KETIK):</label>
                            <input
                                type="text"
                                value={officials.koordinatorJabatan}
                                onChange={(e) => setOfficials({ ...officials, koordinatorJabatan: e.target.value })}
                                placeholder="Contoh: Koordinator Kurikulum & Asesmen / Guru Bimbingan Konseling"
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold focus:border-blue-700 outline-none text-blue-900 text-xs"
                            />
                        </div>
                    </div>
                </div>

                {/* 4 INDIKATOR HASIL AGREGAT REAL */}
                <div className="print-hidden grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                    <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs">
                        <div className="flex items-center justify-between text-slate-500 text-[11px] sm:text-xs font-bold font-mono">
                            <span>RERATA SKOR IRT</span>
                            <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
                        </div>
                        <div className="text-2xl sm:text-3xl font-black text-blue-900 mt-1 sm:mt-2 font-mono">
                            {executiveAnalytics.avgScore}
                        </div>
                        <div className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">
                            Dari {executiveAnalytics.totalSelesai} Siswa Selesai
                        </div>
                    </div>

                    <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs">
                        <div className="flex items-center justify-between text-emerald-700 text-[11px] sm:text-xs font-bold font-mono">
                            <span>TARGET (≥650)</span>
                            <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
                        </div>
                        <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1 sm:mt-2 font-mono">
                            {executiveAnalytics.amanCount} <span className="text-xs font-normal text-slate-500">/ {executiveAnalytics.totalSelesai}</span>
                        </div>
                        <div className="text-[10px] sm:text-[11px] text-emerald-700 font-semibold mt-0.5 truncate">
                            {executiveAnalytics.persentaseTarget}% Peluang Tinggi
                        </div>
                    </div>

                    <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs">
                        <div className="flex items-center justify-between text-slate-500 text-[11px] sm:text-xs font-bold font-mono">
                            <span>TOTAL PERCOBAAN TO</span>
                            <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-700" />
                        </div>
                        <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 sm:mt-2 font-mono">
                            {activeAttemptsPool.length}
                        </div>
                        <div className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">
                            Dari {executiveAnalytics.totalTerdaftar} Peserta Terdaftar
                        </div>
                    </div>

                    <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs">
                        <div className="flex items-center justify-between text-slate-500 text-[11px] sm:text-xs font-bold font-mono">
                            <span>INTEGRITAS</span>
                            <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
                        </div>
                        <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 sm:mt-2 font-mono">
                            {executiveAnalytics.integritasRate}%
                        </div>
                        <div className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 truncate">
                            Kepatuhan Layar Kiosk
                        </div>
                    </div>
                </div>

                {/* PANEL GRAFIK RINGKASAN EKSEKUTIF (DISTRIBUSI, ANTAR KELAS, & SEBELUM VS SESUDAH) */}
                <div className="print-hidden grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* GRAFIK 1: DISTRIBUSI KESIAPAN SISWA */}
                    <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                            <span className="text-xs font-bold font-mono text-slate-900 uppercase">
                                DISTRIBUSI KESIAPAN SNBT
                            </span>
                            <PieChart className="w-4 h-4 text-blue-700" />
                        </div>

                        <div className="space-y-3 pt-1 text-xs">
                            {[
                                { label: "Sangat Kompetitif (≥ 650)", count: executiveAnalytics.amanCount, color: "bg-emerald-500", text: "text-emerald-700" },
                                { label: "Cukup Kompetitif (520–649)", count: executiveAnalytics.kompetitifCount, color: "bg-amber-500", text: "text-amber-700" },
                                { label: "Perlu Klinik Intensif (< 520)", count: executiveAnalytics.bimbinganCount, color: "bg-rose-500", text: "text-rose-700" }
                            ].map((tier) => {
                                const pct = executiveAnalytics.totalSelesai > 0 ? Math.round((tier.count / executiveAnalytics.totalSelesai) * 100) : 0;
                                return (
                                    <div key={tier.label} className="space-y-1">
                                        <div className="flex justify-between font-mono text-[11px]">
                                            <span className="font-semibold text-slate-700">{tier.label}</span>
                                            <span className={`font-black ${tier.text}`}>{tier.count} ({pct}%)</span>
                                        </div>
                                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full ${tier.color}`} style={{ width: `${Math.max(tier.count > 0 ? 6 : 0, pct)}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* GRAFIK 2: KOMPARASI RATA-RATA ANTAR KELAS */}
                    <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                            <span className="text-xs font-bold font-mono text-slate-900 uppercase">
                                KOMPARASI RATA-RATA KELAS
                            </span>
                            <BarChart3 className="w-4 h-4 text-indigo-700" />
                        </div>

                        {executiveAnalytics.classComparison.length === 0 ? (
                            <div className="text-xs text-slate-400 py-6 text-center">Belum ada data kelas selesai.</div>
                        ) : (
                            <div className="space-y-2.5 pt-1">
                                {executiveAnalytics.classComparison.slice(0, 4).map((cls) => {
                                    const pct = Math.min(100, Math.max(8, ((cls.avg - 200) / 800) * 100));
                                    return (
                                        <div key={cls.kelas} className="space-y-1">
                                            <div className="flex justify-between font-mono text-[11px]">
                                                <span className="font-bold text-slate-800">{cls.kelas} ({cls.count} siswa)</span>
                                                <span className="font-black text-blue-900">{cls.avg}</span>
                                            </div>
                                            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full bg-indigo-600" style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* GRAFIK 3: PERBANDINGAN SEBELUM VS SESUDAH (TO-1 vs TO-2 vs TO-3) */}
                    <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                            <span className="text-xs font-bold font-mono text-slate-900 uppercase">
                                TREN ANGKATAN (TO-1 vs TO-2 vs TO-3)
                            </span>
                            <TrendingUp className="w-4 h-4 text-emerald-600" />
                        </div>

                        <div className="grid grid-cols-3 gap-2.5 items-end h-28 pt-4 px-2 border-b border-slate-200">
                            {executiveAnalytics.tryoutTrend.map((to) => {
                                const hPct = to.avg > 0 ? Math.min(100, Math.max(15, ((to.avg - 200) / 800) * 100)) : 8;
                                return (
                                    <div key={to.paket} className="flex flex-col items-center justify-end h-full">
                                        <span className="text-[10.5px] font-mono font-black text-slate-900 mb-1">
                                            {to.avg > 0 ? to.avg : "-"}
                                        </span>
                                        <div
                                            className={`w-full max-w-[44px] rounded-t-xl transition-all duration-500 ${to.avg > 0 ? "bg-gradient-to-t from-blue-800 to-blue-500" : "bg-slate-200"}`}
                                            style={{ height: `${hPct}%` }}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                        <div className="grid grid-cols-3 gap-2.5 text-center font-mono text-[10px]">
                            {executiveAnalytics.tryoutTrend.map((to) => (
                                <div key={to.paket}>
                                    <div className="font-bold text-slate-800">{to.label}</div>
                                    <div className="text-slate-400">{to.participants} sesi</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* NAVIGASI TAB ANALITIK KOMPLEKS */}
                <div className="print-hidden bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 lg:p-8 space-y-5 shadow-sm">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl">
                            <button
                                onClick={() => setActiveTab("ranking")}
                                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === "ranking" ? "bg-[#1e3a8a] text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                                    }`}
                            >
                                <Trophy className="w-3.5 h-3.5" />
                                <span>Peringkat & Rapor Siswa ({filteredStudents.length})</span>
                            </button>

                            <button
                                onClick={() => setActiveTab("progres_to")}
                                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === "progres_to" ? "bg-[#1e3a8a] text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                                    }`}
                            >
                                <TrendingUp className="w-3.5 h-3.5" />
                                <span>Perbandingan Progres TO-1 vs TO-2 vs TO-3</span>
                            </button>

                            <button
                                onClick={() => setActiveTab("subtes_angkatan")}
                                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === "subtes_angkatan" ? "bg-[#1e3a8a] text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                                    }`}
                            >
                                <BarChart3 className="w-3.5 h-3.5" />
                                <span>Keunggulan & Kelemahan 7 Subtes</span>
                            </button>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <div className="relative">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Cari Nama / NISN / Kampus..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full sm:w-auto pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-blue-700"
                                />
                            </div>

                            <select
                                value={selectedClass}
                                onChange={(e) => setSelectedClass(e.target.value)}
                                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold outline-none bg-white cursor-pointer"
                            >
                                <option value="ALL">Semua Kelas</option>
                                {availableClasses.map((cls) => (
                                    <option key={cls} value={cls}>
                                        {cls}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* TAB 1: PERINGKAT & CETAK RAPOR */}
                    {activeTab === "ranking" && (
                        <div className="space-y-2.5">
                            <p className="text-[11px] text-slate-500">
                                Klik pada <strong>Nama Siswa</strong> atau tombol <strong>Rapor & Diagram</strong> untuk melihat grafik lingkaran proporsi jawaban, tren progres TO, serta keunggulan & kelemahan per subtes.
                            </p>
                            <div className="overflow-x-auto rounded-2xl border border-slate-200">
                                <table className="w-full text-left text-xs border-collapse min-w-[820px]">
                                    <thead className="bg-slate-50 border-b border-slate-200 font-mono text-[10.5px] sm:text-[11px] text-slate-600">
                                        <tr>
                                            <th className="p-3">Rank</th>
                                            <th className="p-3">NISN</th>
                                            <th className="p-3">Nama Siswa (Klik untuk Detail)</th>
                                            <th className="p-3">Kelas</th>
                                            <th className="p-3 text-center">Skor IRT</th>
                                            <th className="p-3 text-center">TPS / Lit</th>
                                            <th className="p-3">Pilihan Kampus 1</th>
                                            <th className="p-3 text-center">Integritas</th>
                                            <th className="p-3 text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium">
                                        {filteredStudents.map((s, idx) => {
                                            const unifiedScore = getUnifiedScore(s);
                                            const unifiedTps = getUnifiedTps(s);
                                            const unifiedLit = getUnifiedLiterasi(s);

                                            return (
                                                <tr key={s.nisn} className="hover:bg-blue-50/40 transition-colors">
                                                    <td className="p-3 font-mono font-bold text-blue-700">#{idx + 1}</td>
                                                    <td className="p-3 font-mono text-slate-700">{s.nisn}</td>
                                                    <td className="p-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedStudentForReport(s)}
                                                            className="font-bold text-slate-900 hover:text-blue-700 hover:underline text-left cursor-pointer"
                                                        >
                                                            {s.nama}
                                                        </button>
                                                    </td>
                                                    <td className="p-3 font-mono text-slate-600">{s.kelas}</td>
                                                    <td className="p-3 font-mono font-black text-xs sm:text-sm text-center text-blue-900">
                                                        {unifiedScore}
                                                    </td>
                                                    <td className="p-3 font-mono text-[11px] text-center text-slate-600">
                                                        {unifiedTps} / {unifiedLit}
                                                    </td>
                                                    <td className="p-3 text-slate-700 text-[11px]">
                                                        {s.pilihan_kampus_1 || "-"}
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        {Number(s.violations) === 0 ? (
                                                            <span className="text-emerald-700 font-bold text-[10px]">Bersih</span>
                                                        ) : (
                                                            <span className="text-rose-700 font-bold text-[10px]">{s.violations}x Langgar</span>
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-right">
                                                        <button
                                                            onClick={() => setSelectedStudentForReport(s)}
                                                            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 text-[10.5px] sm:text-[11px] font-bold flex items-center gap-1.5 cursor-pointer ml-auto transition-colors shadow-2xs"
                                                        >
                                                            <PieChart className="w-3.5 h-3.5 text-blue-700" />
                                                            <span>Rapor & Diagram</span>
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}

                                        {filteredStudents.length === 0 && (
                                            <tr>
                                                <td colSpan={9} className="text-center py-10 text-slate-400 font-medium">
                                                    {isLoading
                                                        ? "Memuat data dari Supabase..."
                                                        : "Belum ada siswa berstatus 'Selesai' pada filter ini."}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: PERBANDINGAN PROGRES TO-1 vs TO-2 vs TO-3 */}
                    {activeTab === "progres_to" && (
                        <div className="space-y-3">
                            <p className="text-xs text-slate-500">
                                Klik <strong>Nama Siswa</strong> untuk membuka grafik progres lengkap lintas tryout (<strong>PAKET 1 = TO-1</strong>, <strong>PAKET 2 = TO-2</strong>, <strong>PAKET 3 = TO-3</strong>).
                            </p>
                            <div className="overflow-x-auto rounded-2xl border border-slate-200">
                                <table className="w-full text-left text-xs border-collapse min-w-[820px]">
                                    <thead className="bg-slate-50 border-b border-slate-200 font-mono text-[10.5px] text-slate-600">
                                        <tr>
                                            <th className="p-3">NISN</th>
                                            <th className="p-3">Nama Siswa</th>
                                            <th className="p-3">Kelas</th>
                                            <th className="p-3 text-center">Skor TO-1 (Paket 1)</th>
                                            <th className="p-3 text-center">Skor TO-2 (Paket 2)</th>
                                            <th className="p-3 text-center">Skor TO-3 (Paket 3)</th>
                                            <th className="p-3 text-center">Mini Grafik</th>
                                            <th className="p-3 text-center">Selisih (Δ)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium">
                                        {studentProgressionList.map((item) => {
                                            const s1 = item.to1 ? getUnifiedScore(item.to1) : null;
                                            const s2 = item.to2 ? getUnifiedScore(item.to2) : null;
                                            const s3 = item.to3 ? getUnifiedScore(item.to3) : null;

                                            const orderedScores = [s1, s2, s3].filter((v): v is number => v !== null);
                                            const delta = orderedScores.length >= 2 ? orderedScores[orderedScores.length - 1] - orderedScores[0] : null;

                                            return (
                                                <tr key={item.nisn} className="hover:bg-blue-50/40 transition-colors">
                                                    <td className="p-3 font-mono text-slate-600">{item.nisn}</td>
                                                    <td className="p-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenStudentByNisn(item.nisn)}
                                                            className="font-bold text-slate-900 hover:text-blue-700 hover:underline text-left cursor-pointer"
                                                        >
                                                            {item.nama}
                                                        </button>
                                                    </td>
                                                    <td className="p-3 font-mono text-slate-600">{item.kelas}</td>
                                                    <td className="p-3 text-center font-mono font-bold text-slate-800">
                                                        {s1 !== null ? s1 : <span className="text-slate-300">-</span>}
                                                    </td>
                                                    <td className="p-3 text-center font-mono font-bold text-slate-800">
                                                        {s2 !== null ? s2 : <span className="text-slate-300">-</span>}
                                                    </td>
                                                    <td className="p-3 text-center font-mono font-bold text-slate-800">
                                                        {s3 !== null ? s3 : <span className="text-slate-300">-</span>}
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="flex items-end justify-center gap-1.5 h-7">
                                                            {[s1, s2, s3].map((val, bIdx) => {
                                                                const h = val ? Math.min(100, Math.max(18, ((val - 200) / 800) * 100)) : 12;
                                                                return (
                                                                    <div key={bIdx} className="w-2.5 h-full bg-slate-100 rounded-xs flex items-end overflow-hidden">
                                                                        <div
                                                                            className={`w-full rounded-t-xs ${val ? "bg-blue-700" : "bg-slate-200"}`}
                                                                            style={{ height: `${h}%` }}
                                                                        />
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </td>
                                                    <td className="p-3 text-center font-mono">
                                                        {delta === null ? (
                                                            <span className="text-[10.5px] text-slate-400">Baru 1x TO</span>
                                                        ) : delta > 0 ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px]">
                                                                <TrendingUp className="w-3 h-3" /> +{delta}
                                                            </span>
                                                        ) : delta < 0 ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-[11px]">
                                                                <TrendingDown className="w-3 h-3" /> {delta}
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold text-[11px]">
                                                                <Minus className="w-3 h-3" /> 0
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}

                                        {studentProgressionList.length === 0 && (
                                            <tr>
                                                <td colSpan={8} className="text-center py-10 text-slate-400 font-medium">
                                                    Belum ada riwayat percobaan tryout.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: KEUNGGULAN & KELEMAHAN 7 SUBTES ANGKATAN / KELAS */}
                    {activeTab === "subtes_angkatan" && (
                        <div className="space-y-5">
                            {filteredStudents.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 space-y-2.5">
                                        <div className="flex items-center gap-1.5 text-emerald-800 font-mono font-bold text-xs uppercase">
                                            <Award className="w-4 h-4 text-emerald-600" />
                                            <span>KEUNGGULAN KOMPETENSI ANGKATAN (TOP 2)</span>
                                        </div>
                                        <div className="space-y-2">
                                            {subtestHighlights.strongest.map((st, idx) => (
                                                <div key={st.code} className="p-3 rounded-xl bg-white border border-emerald-200 flex items-center justify-between text-xs">
                                                    <span className="font-bold text-slate-900">{idx + 1}. {st.name}</span>
                                                    <span className="font-mono font-black text-emerald-700">{st.avg.toFixed(1)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/50 space-y-2.5">
                                        <div className="flex items-center gap-1.5 text-rose-800 font-mono font-bold text-xs uppercase">
                                            <AlertTriangle className="w-4 h-4 text-rose-600" />
                                            <span>KELEMAHAN & PRIORITAS KLINIK GURU (TERENDAH)</span>
                                        </div>
                                        <div className="space-y-2">
                                            {subtestHighlights.weakest.map((wk, idx) => (
                                                <div key={wk.code} className="p-3 rounded-xl bg-white border border-rose-200 space-y-1 text-xs">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-bold text-slate-900">{idx + 1}. {wk.name}</span>
                                                        <span className="font-mono font-black text-rose-700">{wk.avg.toFixed(1)}</span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-600">{wk.rekomendasi}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <p className="text-xs text-slate-500">
                                Rata-rata capaian skor IRT per subtes untuk menentukan fokus klinik pendalaman materi bagi tim guru pengajar (target minimal: <strong>650.0</strong>).
                            </p>
                            <div className="space-y-3">
                                {subtestClassAverages.map((sub) => {
                                    const pct = Math.min(100, Math.max(5, ((sub.avg - 200) / 800) * 100));
                                    const barColor = sub.avg >= 650 ? "bg-emerald-600" : sub.avg >= 500 ? "bg-amber-500" : "bg-rose-500";
                                    return (
                                        <div key={sub.code} className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-1.5">
                                            <div className="flex items-center justify-between text-xs font-mono">
                                                <span className="font-bold text-slate-900">{sub.name}</span>
                                                <span className="font-black text-blue-900">{sub.avg.toFixed(1)}</span>
                                            </div>
                                            <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ============================================================== */}
            {/* MODAL RAPOR DIAGNOSTIK & GRAFIK ANALISIS INDIVIDUAL 1 MURID      */}
            {/* ============================================================== */}
            {selectedStudentForReport && reportDiagnostic && (
                <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 my-auto text-left">
                        {/* Action Bar Modal */}
                        <div className="print-hidden p-3.5 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 rounded-t-3xl">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold shrink-0">
                                    <GraduationCap className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                                        Analisis Diagnostik & Rapor Individual: {selectedStudentForReport.nama}
                                    </h3>
                                    <p className="text-[10px] sm:text-[11px] text-slate-500 font-mono truncate">
                                        NISN: {selectedStudentForReport.nisn} • Kelas: {selectedStudentForReport.kelas}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                                <button
                                    type="button"
                                    onClick={() => window.print()}
                                    className="px-3.5 sm:px-4 py-2 rounded-xl bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
                                >
                                    <Printer className="w-3.5 h-3.5" />
                                    <span>Cetak / Simpan PDF (A4)</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedStudentForReport(null)}
                                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-200 text-slate-600 cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* AREA DOKUMEN CETAK & VISUALISASI GRAFIK */}
                        <div className="p-4 sm:p-8 overflow-y-auto flex-1 text-slate-900 space-y-5 print-sheet">
                            {/* KOP SURAT RESMI */}
                            <div className="pb-1 overflow-x-auto">
                                <div className="flex items-center justify-between gap-3 min-w-[540px] sm:min-w-0">
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 flex items-center justify-center overflow-hidden">
                                        <img
                                            src="https://iqflpgrliqztoecpzrnu.supabase.co/storage/v1/object/public/cbt-assets/logo-timsim.jpg"
                                            alt="Logo SMA Muhammadiyah 18 Jakarta"
                                            className="w-full h-full object-contain"
                                            onError={(e) => {
                                                (e.target as any).src = "/images/logo-smam18.png";
                                            }}
                                        />
                                    </div>

                                    <div className="flex-1 text-center px-1 sm:px-2 space-y-0.5">
                                        <h3 className="text-[10px] sm:text-[11px] font-bold tracking-wider text-slate-800 uppercase leading-none font-sans">
                                            MAJELIS PENDIDIKAN DASAR DAN MENENGAH
                                        </h3>
                                        <h4 className="text-[9.5px] sm:text-[10.5px] font-bold tracking-wide text-slate-700 uppercase leading-tight font-sans">
                                            PIMPINAN DAERAH MUHAMMADIYAH JAKARTA SELATAN
                                        </h4>
                                        <h1 className="text-lg sm:text-2xl font-black text-slate-950 tracking-tight uppercase leading-tight pt-0.5 font-sans">
                                            SMA MUHAMMADIYAH 18 JAKARTA
                                        </h1>
                                        <p className="text-[11px] sm:text-xs font-black text-[#1e3a8a] tracking-widest font-mono uppercase leading-none">
                                            TERAKREDITASI "A"
                                        </p>
                                        <p className="text-[9px] sm:text-[10px] text-slate-600 leading-tight pt-0.5 font-sans">
                                            Jl. Panjang No.19, RT.8/RW.9, Cipulir, Kebayoran Lama, Jakarta Selatan, DKI Jakarta 12230
                                        </p>
                                        <p className="text-[8.5px] sm:text-[9.5px] font-mono text-slate-600 leading-normal pt-0.5 pb-1">
                                            Website: https://smamuh18jakarta.sch.id • E-mail: smamuh18@gmail.com
                                        </p>
                                    </div>

                                    <div className="w-16 sm:w-20 shrink-0" />
                                </div>

                                <div className="w-full kop-divider-thick mt-1.5" />
                                <div className="w-full kop-divider-thin mt-[2px]" />
                            </div>

                            {/* JUDUL DOKUMEN */}
                            <div className="text-center space-y-0.5">
                                <h2 className="text-sm sm:text-base font-black tracking-tight underline uppercase">
                                    LEMBAR HASIL EVALUASI DIAGNOSTIK SIMULASI UTBK-SNBT
                                </h2>
                                <p className="text-[10.5px] sm:text-xs font-mono text-slate-700 font-semibold">
                                    Tahun Pelajaran 2026/2027 • Penilaian Terstandarisasi IRT 3-Parameter
                                </p>
                            </div>

                            {/* BIODATA & TARGET PTN */}
                            <div className="border border-slate-900 p-3 bg-slate-50/60 rounded-xl">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                    <div className="space-y-1">
                                        <div className="flex">
                                            <span className="w-32 text-slate-600">Nama Siswa</span>
                                            <span className="font-bold text-slate-900">: {selectedStudentForReport.nama}</span>
                                        </div>
                                        <div className="flex">
                                            <span className="w-32 text-slate-600">NISN / Kelas</span>
                                            <span className="font-mono font-bold">: {selectedStudentForReport.nisn} / {selectedStudentForReport.kelas}</span>
                                        </div>
                                        <div className="flex">
                                            <span className="w-32 text-slate-600">Kepatuhan Kiosk</span>
                                            <span className="font-bold text-emerald-800">
                                                : {Number(selectedStudentForReport.violations) === 0 ? "Tertib (0 Pelanggaran)" : `${selectedStudentForReport.violations}x Pelanggaran`}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex">
                                            <span className="w-32 text-slate-600 shrink-0">PTN Pilihan 1</span>
                                            <span className="font-bold text-blue-900">: {selectedStudentForReport.pilihan_kampus_1 || "Belum ditentukan"}</span>
                                        </div>
                                        <div className="flex">
                                            <span className="w-32 text-slate-600 shrink-0">PTN Pilihan 2</span>
                                            <span className="font-bold text-blue-900">: {selectedStudentForReport.pilihan_kampus_2 || "Belum ditentukan"}</span>
                                        </div>
                                        <div className="flex">
                                            <span className="w-32 text-slate-600 shrink-0">Rerata TPS / Lit</span>
                                            <span className="font-mono font-bold">: {reportDiagnostic.unifiedTps} / {reportDiagnostic.unifiedLit}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* BARIS 1 VISUAL: SKOR TOTAL + DIAGRAM LINGKARAN PROPORSI JAWABAN */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
                                <div className="md:col-span-5 p-4 rounded-2xl border border-slate-900 bg-gradient-to-br from-blue-900 to-indigo-950 text-white flex flex-col justify-center text-center space-y-1.5">
                                    <div className="text-[10px] font-mono tracking-widest text-blue-200 uppercase font-bold">
                                        NILAI RATA-RATA KESELURUHAN (IRT)
                                    </div>
                                    <div className="text-4xl sm:text-5xl font-black tracking-tight">
                                        {reportDiagnostic.unifiedScore}
                                    </div>
                                    <div className="text-[11px] font-mono text-blue-200">
                                        Skala Nasional 200 s.d. 1000
                                    </div>
                                    <div className="pt-1">
                                        <span
                                            className={`inline-block px-3 py-1 rounded-full text-[10.5px] font-bold ${reportDiagnostic.unifiedScore >= 650
                                                ? "bg-emerald-500/25 text-emerald-200 border border-emerald-400/40"
                                                : "bg-amber-400/20 text-amber-200 border border-amber-300/40"
                                                }`}
                                        >
                                            {reportDiagnostic.unifiedScore >= 650 ? "Kompetitif / Peluang Tinggi" : "Perlu Penguatan Intensif"}
                                        </span>
                                    </div>
                                </div>

                                <div className="md:col-span-7 p-4 rounded-2xl border border-slate-300 bg-white flex flex-col sm:flex-row items-center gap-4">
                                    {(() => {
                                        const { benar, salah, kosong, totalSoal, akurasiJawab } = reportDiagnostic;
                                        const pBenar = (benar / totalSoal) * 100;
                                        const pSalah = (salah / totalSoal) * 100;
                                        const pKosong = Math.max(0, 100 - pBenar - pSalah);

                                        const r = 42;
                                        const circ = 2 * Math.PI * r;
                                        const lenBenar = (pBenar / 100) * circ;
                                        const lenSalah = (pSalah / 100) * circ;
                                        const lenKosong = (pKosong / 100) * circ;

                                        return (
                                            <>
                                                <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
                                                    <svg viewBox="0 0 110 110" className="w-full h-full -rotate-90">
                                                        <circle cx="55" cy="55" r={r} fill="transparent" stroke="#e2e8f0" strokeWidth="14" />
                                                        <circle
                                                            cx="55"
                                                            cy="55"
                                                            r={r}
                                                            fill="transparent"
                                                            stroke="#10b981"
                                                            strokeWidth="14"
                                                            strokeDasharray={`${lenBenar} ${circ}`}
                                                            strokeDashoffset={0}
                                                        />
                                                        <circle
                                                            cx="55"
                                                            cy="55"
                                                            r={r}
                                                            fill="transparent"
                                                            stroke="#f43f5e"
                                                            strokeWidth="14"
                                                            strokeDasharray={`${lenSalah} ${circ}`}
                                                            strokeDashoffset={-lenBenar}
                                                        />
                                                        <circle
                                                            cx="55"
                                                            cy="55"
                                                            r={r}
                                                            fill="transparent"
                                                            stroke="#94a3b8"
                                                            strokeWidth="14"
                                                            strokeDasharray={`${lenKosong} ${circ}`}
                                                            strokeDashoffset={-(lenBenar + lenSalah)}
                                                        />
                                                    </svg>
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                                        <span className="text-base font-black text-slate-900 font-mono">{akurasiJawab}%</span>
                                                        <span className="text-[9px] font-mono text-slate-500 uppercase">Akurasi</span>
                                                    </div>
                                                </div>

                                                <div className="flex-1 w-full space-y-2 text-xs">
                                                    <div className="font-bold font-mono text-[11px] text-slate-800 uppercase">
                                                        PROPORSI JAWABAN ({totalSoal} BUTIR SOAL)
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <div className="flex items-center justify-between">
                                                            <span className="flex items-center gap-2 font-semibold text-emerald-700">
                                                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                                                Jawaban Benar
                                                            </span>
                                                            <span className="font-mono font-bold text-slate-900">
                                                                {benar} soal ({pBenar.toFixed(1)}%)
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="flex items-center gap-2 font-semibold text-rose-700">
                                                                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                                                                Jawaban Salah
                                                            </span>
                                                            <span className="font-mono font-bold text-slate-900">
                                                                {salah} soal ({pSalah.toFixed(1)}%)
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="flex items-center gap-2 font-semibold text-slate-600">
                                                                <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                                                                Tidak Dijawab (Kosong)
                                                            </span>
                                                            <span className="font-mono font-bold text-slate-900">
                                                                {kosong} soal ({pKosong.toFixed(1)}%)
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* BARIS 2 VISUAL: KEUNGGULAN UTAMA VS KEKURANGAN PRIORITAS */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div className="p-3.5 rounded-2xl border border-emerald-300 bg-emerald-50/60 space-y-2">
                                    <div className="flex items-center gap-1.5 text-emerald-800 font-bold font-mono text-xs uppercase">
                                        <Award className="w-4 h-4 text-emerald-600 shrink-0" />
                                        <span>KEUNGGULAN UTAMA SISWA (TOP 2 SUBTES)</span>
                                    </div>
                                    <div className="space-y-1.5 text-xs">
                                        {reportDiagnostic.strengths.map((st, i) => (
                                            <div key={st.code} className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-emerald-200">
                                                <span className="font-bold text-slate-900">
                                                    {i + 1}. {st.name}
                                                </span>
                                                <span className="font-mono font-black text-emerald-700">{st.score.toFixed(1)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-3.5 rounded-2xl border border-rose-300 bg-rose-50/60 space-y-2">
                                    <div className="flex items-center gap-1.5 text-rose-800 font-bold font-mono text-xs uppercase">
                                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                                        <span>PRIORITAS PERBAIKAN (2 SUBTES TERENDAH)</span>
                                    </div>
                                    <div className="space-y-1.5 text-xs">
                                        {reportDiagnostic.weaknesses.map((wk, i) => (
                                            <div key={wk.code} className="bg-white px-3 py-2 rounded-xl border border-rose-200 space-y-0.5">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-slate-900">
                                                        {i + 1}. {wk.name}
                                                    </span>
                                                    <span className="font-mono font-black text-rose-700">{wk.score.toFixed(1)}</span>
                                                </div>
                                                <p className="text-[10.5px] text-slate-600 leading-snug">{wk.rekomendasi}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* GRAFIK BATANG PERBANDINGAN 7 SUBTES & TABEL RINCIAN */}
                            <div className="space-y-2 overflow-x-auto">
                                <div className="font-bold font-mono text-[11px] uppercase tracking-wide text-slate-900">
                                    PETA CAPAIAN & GRAFIK KOMPARASI 7 SUBTES NASIONAL (TARGET PG: 650):
                                </div>
                                <table className="w-full text-xs border border-slate-900 text-left border-collapse min-w-[600px]">
                                    <thead className="bg-slate-100 border-b border-slate-900 font-mono text-[10px]">
                                        <tr>
                                            <th className="p-2 border-r border-slate-900 w-9 text-center">NO</th>
                                            <th className="p-2 border-r border-slate-900">KOMPONEN & SUBTES UJIAN</th>
                                            <th className="p-2 border-r border-slate-900 w-44">GRAFIK CAPAIAN (200-1000)</th>
                                            <th className="p-2 border-r border-slate-900 text-center w-20">SKOR</th>
                                            <th className="p-2 border-r border-slate-900 text-center w-20">SELISIH</th>
                                            <th className="p-2 text-center w-28">STATUS</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-300 font-medium text-[11px]">
                                        {reportDiagnostic.subtestScores.map((sub, i) => {
                                            const barPct = Math.min(100, Math.max(4, ((sub.score - 200) / 800) * 100));
                                            const barColor = sub.score >= 650 ? "bg-emerald-600" : sub.score >= 500 ? "bg-amber-500" : "bg-blue-700";

                                            return (
                                                <tr key={sub.code}>
                                                    <td className="p-2 text-center font-mono border-r border-slate-300">{i + 1}</td>
                                                    <td className="p-2 border-r border-slate-300 font-semibold">{sub.name}</td>
                                                    <td className="p-2 border-r border-slate-300">
                                                        <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                                                            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${barPct}%` }} />
                                                        </div>
                                                    </td>
                                                    <td className="p-2 text-center font-mono font-black text-blue-950 border-r border-slate-300">
                                                        {sub.score.toFixed(1)}
                                                    </td>
                                                    <td className="p-2 text-center font-mono font-bold border-r border-slate-300">
                                                        <span className={sub.gap >= 0 ? "text-emerald-700" : "text-rose-700"}>
                                                            {sub.gap >= 0 ? `+${sub.gap}` : sub.gap}
                                                        </span>
                                                    </td>
                                                    <td className="p-2 text-center font-bold text-[10px]">
                                                        <span className={sub.isPassed ? "text-emerald-700" : "text-amber-700"}>
                                                            {sub.isPassed ? "Memenuhi PG" : "Perlu Bimbingan"}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* GRAFIK & TABEL PROGRES PENGERJAAN LINTAS TRYOUT */}
                            {reportDiagnostic.studentAttempts.length > 0 && (
                                <div className="space-y-2 border border-slate-300 rounded-2xl p-3.5 bg-slate-50/40">
                                    <div className="font-bold font-mono text-[11px] uppercase tracking-wide text-slate-900">
                                        GRAFIK & RIWAYAT PROGRES PENGERJAAN TRYOUT ({reportDiagnostic.studentAttempts.length} SESI):
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                                        {reportDiagnostic.studentAttempts.map((att, idx) => {
                                            const prevScore = idx > 0 ? reportDiagnostic.studentAttempts[idx - 1].unifiedScore : null;
                                            const diff = prevScore !== null ? att.unifiedScore - prevScore : null;
                                            const heightPct = Math.min(100, Math.max(12, ((att.unifiedScore - 200) / 800) * 100));

                                            return (
                                                <div key={att.id} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3">
                                                    <div className="space-y-0.5">
                                                        <div className="text-[10px] font-mono font-bold text-slate-500">
                                                            SESI #{idx + 1} • {att.paket.replace("_", " ")}
                                                        </div>
                                                        <div className="text-xl font-black font-mono text-blue-900">
                                                            {att.unifiedScore}
                                                        </div>
                                                        <div className="text-[10px] font-mono text-slate-600">
                                                            TPS: {att.unifiedTps} | Lit: {att.unifiedLit}
                                                        </div>
                                                        {diff !== null && (
                                                            <div className={`text-[10px] font-mono font-bold ${diff >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                                                                {diff >= 0 ? `▲ Naik +${diff} poin` : `▼ Turun ${diff} poin`}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="w-6 h-16 bg-slate-100 rounded-lg flex items-end overflow-hidden border border-slate-200 shrink-0">
                                                        <div className="w-full bg-blue-700 rounded-t-sm" style={{ height: `${heightPct}%` }} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* CATATAN & REKOMENDASI PEMBINAAN */}
                            <div className="space-y-1">
                                <div className="font-bold font-mono text-[10.5px] sm:text-[11px] uppercase tracking-wide">
                                    KESIMPULAN & REKOMENDASI PEMBINAAN GURU / WALI KELAS:
                                </div>
                                <div className="p-3 border border-slate-900 bg-white text-xs leading-relaxed italic text-slate-800">
                                    “Ananda <strong>{selectedStudentForReport.nama}</strong> memiliki kekuatan paling menonjol pada subtes{" "}
                                    <strong>{reportDiagnostic.strengths[0]?.name}</strong> ({reportDiagnostic.strengths[0]?.score.toFixed(1)}) dan{" "}
                                    <strong>{reportDiagnostic.strengths[1]?.name}</strong> ({reportDiagnostic.strengths[1]?.score.toFixed(1)}). Untuk mendongkrak skor akhir menuju target PTN pilihan, disarankan mengikuti klinik pendalaman intensif pada subtes{" "}
                                    <strong>{reportDiagnostic.weaknesses[0]?.name}</strong> serta meningkatkan efektivitas pengerjaan soal (tingkat akurasi saat ini {reportDiagnostic.akurasiJawab}% dari soal yang dijawab).”
                                </div>
                            </div>

                            {/* TANDA TANGAN PEJABAT */}
                            <div className="pt-4 grid grid-cols-2 text-xs text-center border-t border-slate-300">
                                <div>
                                    <p>Mengetahui,</p>
                                    <p className="font-semibold mt-0.5">Kepala SMA Muhammadiyah 18 Jakarta</p>
                                    <div className="h-14" />
                                    <p className="font-bold underline text-slate-900">{officials.kepalaSekolahNama}</p>
                                    <p className="text-[10px] text-slate-600 font-mono">NIP/NBM. {officials.kepalaSekolahNbm}</p>
                                </div>

                                <div>
                                    <p>Jakarta, {new Date().toLocaleDateString("id-ID", { dateStyle: "long" })}</p>
                                    <p className="font-semibold mt-0.5">{officials.koordinatorJabatan}</p>
                                    <div className="h-14" />
                                    <p className="font-bold underline text-slate-900">{officials.koordinatorNama}</p>
                                    <p className="text-[10px] text-slate-600 font-mono">NIP/NBM. {officials.koordinatorNbm}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}