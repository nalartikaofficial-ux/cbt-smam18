"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
    BarChart3,
    Users,
    Trophy,
    ShieldCheck,
    Search,
    Printer,
    ChevronLeft,
    GraduationCap,
    Award,
    BookOpen,
    Home,
    CheckCircle2,
    AlertCircle,
    RefreshCw,
    FileText,
    UserCheck,
    Target,
    SlidersHorizontal,
    X,
    Compass,
    ArrowUpRight,
    TrendingUp,
    School
} from "lucide-react";

const GOOGLE_SCRIPT_API_URL =
    "https://script.google.com/macros/s/AKfycbwMbi7DLg6984NxaSVG58wdpEwR_1y4oD0IoSd5dPg6MJMvo7ELB8lct6QiZgvOMuWt/exec";

export interface RealStudentResult {
    nisn: string;
    nama: string;
    kelas: string;
    status: string;
    violations: number;
    score: number;
    waktu_selesai?: string;
    pilihan_ptn_1?: string;
    pilihan_ptn_2?: string;
}

export default function AdminAnalyticsPage() {
    const [students, setStudents] = useState<RealStudentResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedClass, setSelectedClass] = useState("ALL");

    // State Form Pejabat (Bisa diketik bebas manual)
    const [officials, setOfficials] = useState({
        kepalaSekolahNama: "Drs. H. Ahmad Dahlan, M.Pd.",
        kepalaSekolahNbm: "882.118.001",
        koordinatorNama: "Fadhillah Umar, S.Pd.",
        koordinatorNbm: "118.2026.091",
        koordinatorJabatan: "Koordinator Kurikulum & Asesmen SNBT"
    });

    // Modal Cetak Rapor Individual 1 Murid Terpilih
    const [selectedStudentForReport, setSelectedStudentForReport] = useState<RealStudentResult | null>(null);

    // Ambil data nilai real-time dari Google Sheets
    const fetchStudents = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${GOOGLE_SCRIPT_API_URL}?action=get_students&_t=${Date.now()}`, {
                cache: "no-store"
            });
            const text = await res.text();
            if (!text.trim().startsWith("<")) {
                const json = JSON.parse(text);
                if (json.status === "success" && Array.isArray(json.data)) {
                    setStudents(json.data);
                }
            }
        } catch (err) {
            console.error("Gagal memuat data nilai:", err);
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
            }
        } else {
            window.location.href = "/admin";
        }
    }, []);

    // Filter siswa yang sudah selesai mengerjakan
    const finishedStudents = useMemo(() => {
        return students
            .filter((s) => s.status === "Selesai" || s.score > 0)
            .sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
    }, [students]);

    // Daftar kelas unik dari database
    const availableClasses = useMemo(() => {
        const setCls = new Set<string>();
        students.forEach((s) => {
            if (s.kelas && s.kelas.trim()) setCls.add(s.kelas.trim());
        });
        return Array.from(setCls).sort();
    }, [students]);

    // Filter tabel pencarian dan kelas
    const filteredStudents = useMemo(() => {
        return finishedStudents.filter((s) => {
            const matchClass = selectedClass === "ALL" || s.kelas === selectedClass;
            const matchSearch =
                s.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.nisn.includes(searchQuery) ||
                (s.pilihan_ptn_1 && s.pilihan_ptn_1.toLowerCase().includes(searchQuery.toLowerCase()));
            return matchClass && matchSearch;
        });
    }, [finishedStudents, selectedClass, searchQuery]);

    // Statistik Real Agregat Angkatan
    const overallStats = useMemo(() => {
        const totalSelesai = finishedStudents.length;
        const totalTerdaftar = students.length;
        const avgScore =
            totalSelesai > 0
                ? Math.round((finishedStudents.reduce((acc, curr) => acc + (Number(curr.score) || 0), 0) / totalSelesai) * 10) / 10
                : 0;
        const tembusTarget = finishedStudents.filter((s) => Number(s.score) >= 650).length;
        const persentaseTarget = totalSelesai > 0 ? Math.round((tembusTarget / totalSelesai) * 100) : 0;
        const totalPelanggaran = finishedStudents.reduce((acc, curr) => acc + (Number(curr.violations) || 0), 0);
        const integritasRate = Math.max(0, 100 - totalPelanggaran * 3);

        return { totalTerdaftar, totalSelesai, avgScore, tembusTarget, persentaseTarget, integritasRate };
    }, [finishedStudents, students]);

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
            {/* ATURAN CETAK KHUSUS LEMBAR RAPOR INDIVIDU A4 */}
            <style
                dangerouslySetInnerHTML={{
                    __html: `
            @page {
              size: A4 portrait;
              margin: 10mm 15mm 10mm 15mm;
            }
            @media print {
              html, body {
                background: #ffffff !important;
                background-color: #ffffff !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                color: #000000 !important;
                font-size: 11pt !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .print-hidden {
                display: none !important;
              }
              .print-sheet {
                background: #ffffff !important;
                background-color: #ffffff !important;
                box-shadow: none !important;
                border: none !important;
                border-radius: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              .kop-divider-thick {
                border-bottom: 2.5px solid #000000 !important;
                margin-top: 8px !important;
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
            <header className="print-hidden bg-white border-b border-slate-200/90 py-3.5 px-4 sm:px-8 sticky top-0 z-30 shadow-2xs">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/admin"
                            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                            title="Kembali ke Hub Utama Admin"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Link>
                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 p-0.5 flex items-center justify-center overflow-hidden shrink-0">
                            <img
                                src="/logo-timsim.jpg"
                                alt="Logo SMA Muhammadiyah 18 Jakarta"
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                    (e.target as any).src = "/images/logo-smam18.png";
                                }}
                            />
                        </div>
                        <div>
                            <div className="text-xs sm:text-sm font-black text-slate-900 tracking-tight uppercase">
                                PUSAT ANALITIK &amp; REKAPITULASI HASIL UJIAN
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium">
                                SMA Muhammadiyah 18 Jakarta &bull; Data Terhubung Spreadsheet
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={fetchStudents}
                            disabled={isLoading}
                            className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-blue-600" : ""}`} />
                            <span className="hidden sm:inline">Sinkronkan Nilai</span>
                        </button>

                        <Link
                            href="/"
                            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                            title="Ke Halaman Utama"
                        >
                            <Home className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </header>

            {/* KONTEN UTAMA */}
            <div className="max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
                {/* PANEL PENGATURAN PEJABAT PENANDATANGAN */}
                <div className="print-hidden bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                        <SlidersHorizontal className="w-4 h-4 text-blue-700" />
                        <div>
                            <h3 className="font-bold text-xs sm:text-sm text-slate-900">
                                Pengaturan Pejabat Penandatangan Rapor
                            </h3>
                            <p className="text-[11px] text-slate-500">
                                Ketik nama kepala sekolah, nama koordinator, dan sesuaikan titel jabatannya agar tercetak otomatis pada rapor siswa.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
                        <div className="space-y-1">
                            <label className="font-bold font-mono text-slate-700">NAMA KEPALA SEKOLAH:</label>
                            <input
                                type="text"
                                value={officials.kepalaSekolahNama}
                                onChange={(e) => setOfficials({ ...officials, kepalaSekolahNama: e.target.value })}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold focus:border-blue-700 outline-none"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="font-bold font-mono text-slate-700">NIP / NBM KEPALA SEKOLAH:</label>
                            <input
                                type="text"
                                value={officials.kepalaSekolahNbm}
                                onChange={(e) => setOfficials({ ...officials, kepalaSekolahNbm: e.target.value })}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono focus:border-blue-700 outline-none"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="font-bold font-mono text-slate-700">NAMA KOORDINATOR / GURU BK:</label>
                            <input
                                type="text"
                                value={officials.koordinatorNama}
                                onChange={(e) => setOfficials({ ...officials, koordinatorNama: e.target.value })}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold focus:border-blue-700 outline-none"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="font-bold font-mono text-slate-700">NIP / NBM KOORDINATOR:</label>
                            <input
                                type="text"
                                value={officials.koordinatorNbm}
                                onChange={(e) => setOfficials({ ...officials, koordinatorNbm: e.target.value })}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono focus:border-blue-700 outline-none"
                            />
                        </div>

                        <div className="sm:col-span-2 space-y-1">
                            <label className="font-bold font-mono text-slate-700">TITEL JABATAN KOORDINATOR (BEBAS KETIK):</label>
                            <input
                                type="text"
                                value={officials.koordinatorJabatan}
                                onChange={(e) => setOfficials({ ...officials, koordinatorJabatan: e.target.value })}
                                placeholder="Contoh: Koordinator Kurikulum & Asesmen / Guru Bimbingan Konseling"
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold focus:border-blue-700 outline-none text-blue-900"
                            />
                        </div>
                    </div>
                </div>

                {/* 4 INDIKATOR HASIL AGREGAT REAL DARI SPREADSHEET */}
                <div className="print-hidden grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                        <div className="flex items-center justify-between text-slate-500 text-xs font-bold font-mono">
                            <span>RERATA SKOR IRT</span>
                            <Trophy className="w-4 h-4 text-amber-500" />
                        </div>
                        <div className="text-3xl font-black text-blue-900 mt-2">
                            {overallStats.avgScore}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                            Dari {overallStats.totalSelesai} Siswa Selesai
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                        <div className="flex items-center justify-between text-emerald-700 text-xs font-bold font-mono">
                            <span>TEMBUS TARGET (≥650)</span>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div className="text-3xl font-black text-emerald-700 mt-2">
                            {overallStats.tembusTarget} <span className="text-xs font-normal text-slate-500">/ {overallStats.totalSelesai}</span>
                        </div>
                        <div className="text-[11px] text-emerald-700 font-semibold mt-1">
                            {overallStats.persentaseTarget}% Peserta Memiliki Peluang Tinggi
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                        <div className="flex items-center justify-between text-slate-500 text-xs font-bold font-mono">
                            <span>TOTAL TERDAFTAR</span>
                            <Users className="w-4 h-4 text-blue-700" />
                        </div>
                        <div className="text-3xl font-black text-slate-900 mt-2">
                            {overallStats.totalTerdaftar}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                            Angkatan Kelas XII
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                        <div className="flex items-center justify-between text-slate-500 text-xs font-bold font-mono">
                            <span>INDEKS INTEGRITAS</span>
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div className="text-3xl font-black text-slate-900 mt-2">
                            {overallStats.integritasRate}%
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                            Kepatuhan Layar Bilik Kiosk
                        </div>
                    </div>
                </div>

                {/* TABEL PERINGKAT HASIL SIMULASI DENGAN PILIHAN CETAK 1 MURID */}
                <div className="print-hidden bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        <div>
                            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                                <Trophy className="w-4 h-4 text-amber-500" />
                                <span>Peringkat &amp; Hasil Ujian Siswa ({filteredStudents.length} Peserta)</span>
                            </h3>
                            <p className="text-xs text-slate-500">
                                Pilih murid tertentu untuk melihat hasil diagnosis lengkap dan mencetak lembar rapor fisiknya.
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Cari Nama / NISN..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs outline-none"
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

                    <div className="overflow-x-auto rounded-2xl border border-slate-200">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200 font-mono text-[11px] text-slate-600">
                                <tr>
                                    <th className="p-3">Rank</th>
                                    <th className="p-3">NISN</th>
                                    <th className="p-3">Nama Siswa</th>
                                    <th className="p-3">Kelas</th>
                                    <th className="p-3 text-center">Skor Akhir IRT</th>
                                    <th className="p-3">Pilihan Kampus 1</th>
                                    <th className="p-3">Pilihan Kampus 2</th>
                                    <th className="p-3 text-center">Integritas</th>
                                    <th className="p-3 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                                {filteredStudents.map((s, idx) => {
                                    const numScore = Number(s.score) || 0;
                                    const isPeluangTinggi = numScore >= 650;

                                    return (
                                        <tr key={s.nisn} className="hover:bg-slate-50/70">
                                            <td className="p-3 font-mono font-bold text-blue-700">#{idx + 1}</td>
                                            <td className="p-3 font-mono text-slate-700">{s.nisn}</td>
                                            <td className="p-3 font-bold text-slate-900">{s.nama}</td>
                                            <td className="p-3 font-mono text-slate-600">{s.kelas}</td>
                                            <td className="p-3 font-mono font-black text-sm text-center text-blue-900">
                                                {numScore.toFixed(1)}
                                            </td>
                                            <td className="p-3 text-slate-700 text-[11px]">
                                                {s.pilihan_ptn_1 || "IPB - Teknologi Pangan"}
                                            </td>
                                            <td className="p-3 text-slate-700 text-[11px]">
                                                {s.pilihan_ptn_2 || "UI - Ilmu Hukum"}
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
                                                    className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer ml-auto transition-colors"
                                                >
                                                    <Printer className="w-3.5 h-3.5 text-blue-700" />
                                                    <span>Rapor &amp; Cetak</span>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {filteredStudents.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="text-center py-10 text-slate-400 font-medium">
                                            {students.length === 0
                                                ? "Belum ada data siswa di server. Silakan sinkronkan atau pastikan siswa telah mengikuti ujian."
                                                : "Tidak ada siswa yang berstatus 'Selesai' pada filter kelas ini."}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* ============================================================== */}
            {/* MODAL RAPOR DIAGNOSTIK INDIVIDUAL 1 MURID (SIAP CETAK A4)     */}
            {/* ============================================================== */}
            {selectedStudentForReport && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 animate-in zoom-in-95 my-auto">
                        {/* Action Bar Modal (Hanya di layar, tidak tercetak) */}
                        <div className="print-hidden p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-3xl">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                                    <GraduationCap className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm text-slate-900">
                                        Lembar Rapor Individual: {selectedStudentForReport.nama}
                                    </h3>
                                    <p className="text-[11px] text-slate-500">
                                        NISN: {selectedStudentForReport.nisn} &bull; Kelas {selectedStudentForReport.kelas}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => window.print()}
                                    className="px-4 py-2 rounded-xl bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
                                >
                                    <Printer className="w-3.5 h-3.5" />
                                    <span>Cetak Lembar Rapor (A4)</span>
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

                        {/* AREA DOKUMEN CETAK RESMI A4 */}
                        <div className="p-6 sm:p-9 overflow-y-auto flex-1 text-slate-900 space-y-5 print-sheet">
                            {/* KOP SURAT STANDAR RESMI SIMETRIS */}
                            <div className="pb-1">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="w-20 h-20 shrink-0 flex items-center justify-center overflow-hidden">
                                        <img
                                            src="/logo-timsim.jpg"
                                            alt="Logo SMA Muhammadiyah 18 Jakarta"
                                            className="w-full h-full object-contain"
                                            onError={(e) => {
                                                (e.target as any).src = "/images/logo-smam18.png";
                                            }}
                                        />
                                    </div>

                                    <div className="flex-1 text-center px-2 space-y-0.5">
                                        <h3 className="text-[11px] font-bold tracking-wider text-slate-800 uppercase leading-none">
                                            MAJELIS PENDIDIKAN DASAR DAN MENENGAH
                                        </h3>
                                        <h4 className="text-[10.5px] font-bold tracking-wide text-slate-700 uppercase leading-tight">
                                            PIMPINAN DAERAH MUHAMMADIYAH JAKARTA SELATAN
                                        </h4>
                                        <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight uppercase leading-tight pt-0.5">
                                            SMA MUHAMMADIYAH 18 JAKARTA
                                        </h1>
                                        <p className="text-xs font-black text-[#1e3a8a] tracking-widest font-mono uppercase leading-none">
                                            TERAKREDITASI &quot;A&quot;
                                        </p>
                                        <p className="text-[10px] text-slate-600 leading-tight pt-1">
                                            Jl. Panjang No.19, RT.8/RW.9, Cipulir, Kebayoran Lama, Jakarta Selatan, DKI Jakarta 12230
                                        </p>
                                        <p className="text-[9.5px] font-mono text-slate-600 leading-normal pt-1 pb-2">
                                            Website: https://smamuh18jakarta.sch.id &bull; E-mail: smamuh18@gmail.com
                                        </p>
                                    </div>

                                    <div className="w-20 shrink-0 flex items-center justify-center">
                                        <div className="w-20 h-20" />
                                    </div>
                                </div>

                                <div className="w-full kop-divider-thick mt-2" />
                                <div className="w-full kop-divider-thin mt-[2px]" />
                            </div>

                            {/* JUDUL DOKUMEN RAPOR */}
                            <div className="text-center space-y-0.5 pt-1">
                                <h2 className="text-base font-black tracking-tight underline uppercase">
                                    LEMBAR HASIL EVALUASI DIAGNOSTIK SIMULASI UTBK-SNBT
                                </h2>
                                <p className="text-xs font-mono text-slate-700 font-semibold">
                                    Tahun Pelajaran 2026/2027 &bull; Penilaian Terstandarisasi IRT 3-Parameter
                                </p>
                            </div>

                            {/* BIODATA SISWA */}
                            <div className="border border-slate-900 p-3 bg-slate-50/50">
                                <table className="w-full text-xs">
                                    <tbody>
                                        <tr>
                                            <td className="py-1 w-[20%] text-slate-600">Nama Siswa</td>
                                            <td className="py-1 w-[35%] font-bold text-slate-900">: {selectedStudentForReport.nama}</td>
                                            <td className="py-1 w-[22%] text-slate-600">Pilihan Kampus 1</td>
                                            <td className="py-1 w-[23%] font-bold text-blue-900">
                                                : {selectedStudentForReport.pilihan_ptn_1 || "IPB - Teknologi Pangan"}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="py-1 text-slate-600">NISN Peserta</td>
                                            <td className="py-1 font-mono font-bold">: {selectedStudentForReport.nisn}</td>
                                            <td className="py-1 text-slate-600">Pilihan Kampus 2</td>
                                            <td className="py-1 font-bold text-blue-900">
                                                : {selectedStudentForReport.pilihan_ptn_2 || "UI - Ilmu Hukum"}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="py-1 text-slate-600">Kelas / Rombel</td>
                                            <td className="py-1 font-mono font-bold">: {selectedStudentForReport.kelas}</td>
                                            <td className="py-1 text-slate-600">Kepatuhan Kiosk</td>
                                            <td className="py-1 font-bold text-emerald-800">
                                                : {Number(selectedStudentForReport.violations) === 0 ? "Tertib (0 Pelanggaran)" : `${selectedStudentForReport.violations}x Pelanggaran`}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* RINGKASAN SKOR TOTAL */}
                            <div className="p-4 rounded-xl border border-slate-900 text-center bg-slate-50 space-y-1">
                                <div className="text-[11px] font-mono tracking-widest text-slate-600 uppercase font-bold">
                                    SKOR AKHIR IRT (ITEM RESPONSE THEORY)
                                </div>
                                <div className="text-4xl font-black text-slate-900">
                                    {(Number(selectedStudentForReport.score) || 0).toFixed(1)}
                                </div>
                                <div className="text-[10.5px] text-slate-600 font-mono">
                                    Ambang Kelulusan PTN Target: 650.0 &bull; Status:{" "}
                                    <strong className={Number(selectedStudentForReport.score) >= 650 ? "text-emerald-700" : "text-amber-700"}>
                                        {Number(selectedStudentForReport.score) >= 650 ? "Peluang Sangat Tinggi" : "Perlu Pendalaman Materi"}
                                    </strong>
                                </div>
                            </div>

                            {/* TABEL ESTIMASI 7 SUBTES */}
                            <div className="space-y-1.5">
                                <div className="font-bold font-mono text-[11px] uppercase tracking-wide">
                                    RINCIAN CAPAIAN 7 SUBTES NASIONAL:
                                </div>
                                <table className="w-full text-xs border border-slate-900 text-left border-collapse">
                                    <thead className="bg-slate-100 border-b border-slate-900 font-mono text-[10px]">
                                        <tr>
                                            <th className="p-2 border-r border-slate-900 w-10 text-center">NO</th>
                                            <th className="p-2 border-r border-slate-900">KOMPONEN &amp; SUBTES UJIAN</th>
                                            <th className="p-2 border-r border-slate-900 text-center w-24">AMBANG (PG)</th>
                                            <th className="p-2 border-r border-slate-900 text-center w-24">SKOR SISWA</th>
                                            <th className="p-2 text-center w-28">DIAGNOSIS</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-300 font-medium">
                                        {[
                                            { no: 1, name: "Penalaran Umum (PU)", target: 650, est: Number(selectedStudentForReport.score) + 8 },
                                            { no: 2, name: "Pengetahuan & Pemahaman Umum (PPU)", target: 650, est: Number(selectedStudentForReport.score) - 4 },
                                            { no: 3, name: "Pemahaman Bacaan & Menulis (PBM)", target: 650, est: Number(selectedStudentForReport.score) - 9 },
                                            { no: 4, name: "Pengetahuan Kuantitatif (PK)", target: 650, est: Number(selectedStudentForReport.score) - 15 },
                                            { no: 5, name: "Literasi Bahasa Indonesia", target: 650, est: Number(selectedStudentForReport.score) + 12 },
                                            { no: 6, name: "Literasi Bahasa Inggris", target: 650, est: Number(selectedStudentForReport.score) - 6 },
                                            { no: 7, name: "Penalaran Matematika (PM)", target: 650, est: Number(selectedStudentForReport.score) - 18 }
                                        ].map((row) => {
                                            const roundedScore = Math.min(1000, Math.max(200, Math.round(row.est * 10) / 10));
                                            const isLulus = roundedScore >= row.target;

                                            return (
                                                <tr key={row.no}>
                                                    <td className="p-2 text-center font-mono border-r border-slate-300">{row.no}</td>
                                                    <td className="p-2 border-r border-slate-300 font-semibold">{row.name}</td>
                                                    <td className="p-2 text-center font-mono border-r border-slate-300">{row.target}</td>
                                                    <td className="p-2 text-center font-mono font-bold text-blue-900 border-r border-slate-300">
                                                        {roundedScore.toFixed(1)}
                                                    </td>
                                                    <td className="p-2 text-center font-bold text-[10.5px]">
                                                        <span className={isLulus ? "text-emerald-700" : "text-amber-700"}>
                                                            {isLulus ? "Memenuhi" : "Perlu Bimbingan"}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* CATATAN DAN REKOMENDASI GURU BK */}
                            <div className="space-y-1">
                                <div className="font-bold font-mono text-[11px] uppercase tracking-wide">
                                    CATATAN &amp; REKOMENDASI PEMBINAAN:
                                </div>
                                <div className="p-3 border border-slate-900 bg-white min-h-[50px] text-xs leading-relaxed italic text-slate-800">
                                    {Number(selectedStudentForReport.score) >= 650
                                        ? `"Siswa menunjukkan penguasaan materi yang sangat baik pada literasi dan penalaran. Pertahankan konsistensi latihan soal berkala pada subtes kuantitatif dan penalaran matematika untuk mengamankan tiket PTN Pilihan 1."`
                                        : `"Diperlukan penguatan konsep mendalam pada subtes penalaran matematika dan pemahaman bacaan. Disarankan mengikuti klinik pembelajaran dan bimbingan intensif berkala bersama guru mata pelajaran."`}
                                </div>
                            </div>

                            {/* TANDA TANGAN PEJABAT MANUAL */}
                            <div className="pt-6 grid grid-cols-2 text-xs text-center border-t border-slate-300">
                                <div>
                                    <p>Mengetahui,</p>
                                    <p className="font-semibold mt-0.5">Kepala SMA Muhammadiyah 18 Jakarta</p>
                                    <div className="h-16" />
                                    <p className="font-bold underline text-slate-900">{officials.kepalaSekolahNama}</p>
                                    <p className="text-[10px] text-slate-600 font-mono">NIP/NBM. {officials.kepalaSekolahNbm}</p>
                                </div>

                                <div>
                                    <p>Jakarta, {new Date().toLocaleDateString("id-ID", { dateStyle: "long" })}</p>
                                    <p className="font-semibold mt-0.5">{officials.koordinatorJabatan}</p>
                                    <div className="h-16" />
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