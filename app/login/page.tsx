"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    KeyRound,
    Maximize2,
    ChevronLeft,
    AlertCircle,
    Loader2,
    CheckCircle2,
    Layers,
    Sparkles,
    Lock
} from "lucide-react";

const GOOGLE_SCRIPT_API_URL =
    "https://script.google.com/macros/s/AKfycbxXeMuz-VXgbdUOESiOOLL5NlLrSMVfrdvOCwhgBbjLWwOy3ASkTjnWJSAIONFDrdY7hg/exec";

// KAMUS PESAN ERROR SEDERHANA (Bisa kamu edit langsung teksnya di sini)
function getPesanErrorSederhana(rawMsg: string): string {
    const msg = (rawMsg || "").toLowerCase();

    if (msg.includes("nama")) {
        return "Nama kamu tidak sesuai dengan NISN ini!";
    }
    if (msg.includes("nisn")) {
        return "NISN belum terdaftar di daftar ujian!";
    }
    if (msg.includes("token")) {
        return "Token ujian salah, tanyakan pada pengawas!";
    }
    if (msg.includes("selesai")) {
        return "Selamat, kamu sudah selesai mengerjakan ujian ini.";
    }
    if (msg.includes("terkunci") || msg.includes("kunci") || msg.includes("blokir")) {
        return "Akun kamu sedang dikunci pengawas ruang.";
    }
    if (msg.includes("belum dimulai")) {
        return "Waktu ujian belum dimulai!";
    }
    if (msg.includes("berakhir")) {
        return "Waktu sesi ujian sudah habis.";
    }

    return "Data login salah, silahkan coba lagi!";
}

export default function StudentLoginPage() {
    const router = useRouter();

    // State Formulir Login Siswa
    const [nisn, setNisn] = useState("");
    const [candidateName, setCandidateName] = useState("");
    const [examToken, setExamToken] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [isValidating, setIsValidating] = useState(false);

    // Info Sesi Aktif dari Proktor Server
    const [activeSession, setActiveSession] = useState<{
        paket_aktif: string;
        nama_paket: string;
        status_akses: string;
        durasi_menit: number;
        waktu_mulai?: string;
        waktu_selesai?: string;
    } | null>(null);

    // Ambil Info Sesi & Jadwal yang Sedang Dibuka Proktor
    useEffect(() => {
        const fetchSession = async () => {
            try {
                const res = await fetch(`${GOOGLE_SCRIPT_API_URL}?action=get_active_session&_t=${Date.now()}`, {
                    cache: "no-store"
                });
                const json = await res.json();
                if (json.status === "success" && json.data) {
                    setActiveSession(json.data);
                }
            } catch {
                setActiveSession({
                    paket_aktif: "PAKET_1",
                    nama_paket: "Simulasi Terstandarisasi SNBT 2026",
                    status_akses: "DIBUKA",
                    durasi_menit: 195
                });
            }
        };

        fetchSession();
    }, []);

    const handleStartOfficialExam = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg("");

        const cleanNisn = nisn.trim().replace(/\D/g, "");
        const cleanName = candidateName.trim();
        const cleanToken = examToken.trim().toUpperCase();

        // Validasi cepat di frontend
        if (!cleanNisn) {
            setErrorMsg("NISN jangan dikosongkan ya!");
            return;
        }

        if (!cleanName) {
            setErrorMsg("Nama lengkap wajib diisi!");
            return;
        }

        if (!cleanToken) {
            setErrorMsg("Token ujian belum diisi!");
            return;
        }

        if (activeSession?.status_akses === "TERKUNCI") {
            setErrorMsg("Bilik ujian masih dikunci pengawas.");
            return;
        }

        setIsValidating(true);

        try {
            const verifyUrl = `${GOOGLE_SCRIPT_API_URL}?action=verify_student&nisn=${cleanNisn}&nama=${encodeURIComponent(cleanName)}&token=${cleanToken}&_t=${Date.now()}`;
            const res = await fetch(verifyUrl, { cache: "no-store" });
            const json = await res.json();

            if (json.status === "success" && json.student) {
                const student = json.student;
                const targetPackage = json.session?.paket || activeSession?.paket_aktif || "PAKET_1";

                const sessionData = {
                    nisn: student.nisn,
                    candidateName: student.nama || cleanName,
                    kelas: student.kelas || "XII",
                    packageId: targetPackage,
                    school: "SMA Muhammadiyah 18 Jakarta",
                    token: cleanToken,
                    pilihan1: student.pilihan1 || "",
                    pilihan2: student.pilihan2 || "",
                    duration: json.session?.durasi_menit || activeSession?.durasi_menit || 195,
                    loginTime: new Date().toISOString()
                };

                localStorage.setItem("cbt_student_session", JSON.stringify(sessionData));
                router.push(`/exam?package=${targetPackage}`);
            } else {
                // Di sini pesannya otomatis diterjemahkan jadi kata-kata simpel yang kamu tentukan
                setErrorMsg(getPesanErrorSederhana(json.message));
                setIsValidating(false);
            }
        } catch {
            setErrorMsg("Koneksi internet bermasalah, coba lagi ya!");
            setIsValidating(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
            {/* Header Minimalis Portal */}
            <header className="bg-white border-b border-slate-200/90 py-3.5 px-4 sm:px-8">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Kembali ke Laman Depan</span>
                    </Link>

                    <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>SERVER CBT RESMI AKTIF</span>
                    </div>
                </div>
            </header>

            {/* Konten Utama */}
            <div className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
                <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 p-6 sm:p-9 space-y-6 relative overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-600" />

                    {/* Logo & Judul Portal */}
                    <div className="text-center space-y-2">
                        <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center mx-auto overflow-hidden p-1">
                            <img
                                src="/logo-timsim.jpg"
                                alt="Logo SMA Muhammadiyah 18 Jakarta"
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                    (e.target as any).src = "/images/logo-smam18.png";
                                }}
                            />
                        </div>

                        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-blue-50 border border-blue-200 font-mono text-[10px] font-bold text-blue-900 uppercase tracking-wider">
                            <span>SMA MUHAMMADIYAH 18 JAKARTA</span>
                        </div>

                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                            Bilik Masuk Siswa
                        </h1>

                        <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                            Silakan masukkan NISN, Nama Lengkap resmi, dan Token Ujian yang tertera di layar pengawas ruang.
                        </p>
                    </div>

                    {/* Banner Sesi Terpusat dari Proktor */}
                    {activeSession && (
                        <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-200 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-blue-600 text-white rounded-xl">
                                    <Layers className="w-4 h-4" />
                                </div>
                                <div className="text-left">
                                    <span className="font-bold text-blue-950 block">{activeSession.nama_paket}</span>
                                    <span className="text-[11px] font-mono text-blue-700 font-semibold">
                                        Target: {activeSession.paket_aktif} &bull; {activeSession.durasi_menit} Menit
                                    </span>
                                </div>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full font-mono text-[10px] font-black uppercase ${activeSession.status_akses === "DIBUKA" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                                }`}>
                                {activeSession.status_akses}
                            </span>
                        </div>
                    )}

                    {errorMsg && (
                        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in">
                            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                            <span className="font-semibold text-left leading-relaxed">{errorMsg}</span>
                        </div>
                    )}

                    <form onSubmit={handleStartOfficialExam} className="space-y-4">
                        {/* 1. Input NISN */}
                        <div className="space-y-1.5 text-left">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono block">
                                Nomor Induk Siswa Nasional (NISN):
                            </label>
                            <input
                                type="text"
                                required
                                autoFocus
                                inputMode="numeric"
                                maxLength={10}
                                placeholder="Contoh: 0078192831"
                                value={nisn}
                                onChange={(e) => setNisn(e.target.value.replace(/\D/g, ""))}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm font-mono tracking-wider font-bold text-slate-900 outline-none transition-all"
                            />
                        </div>

                        {/* 2. Input Nama Lengkap Siswa */}
                        <div className="space-y-1.5 text-left">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono block">
                                Nama Lengkap Siswa (Sesuai Data Sekolah):
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="Masukkan nama lengkap..."
                                value={candidateName}
                                onChange={(e) => setCandidateName(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm font-semibold text-slate-900 outline-none transition-all"
                            />
                        </div>

                        {/* 3. Input Token Pengawas */}
                        <div className="space-y-1.5 text-left pt-1">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                                    Token Resmi Ruang Ujian:
                                </label>
                                <span className="text-[11px] text-slate-400 italic">Diberikan oleh pengawas</span>
                            </div>
                            <input
                                type="text"
                                required
                                maxLength={8}
                                placeholder="TOKEN..."
                                value={examToken}
                                onChange={(e) => setExamToken(e.target.value.toUpperCase())}
                                className="w-full px-4 py-3 rounded-xl border-2 border-amber-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-base font-mono tracking-widest text-center uppercase font-black text-amber-700 bg-amber-50/30 outline-none transition-all"
                            />
                        </div>

                        {/* Tombol Masuk */}
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isValidating || activeSession?.status_akses === "TERKUNCI"}
                                className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${activeSession?.status_akses === "TERKUNCI"
                                    ? "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none"
                                    : "bg-[#1e3a8a] hover:bg-blue-900 active:scale-[0.99] text-white shadow-blue-900/25"
                                    } disabled:opacity-50`}
                            >
                                {isValidating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Memverifikasi Kredensial...</span>
                                    </>
                                ) : activeSession?.status_akses === "TERKUNCI" ? (
                                    <>
                                        <Lock className="w-4 h-4" />
                                        <span>Sesi Ujian Sedang Dikunci</span>
                                    </>
                                ) : (
                                    <>
                                        <Maximize2 className="w-4 h-4" />
                                        <span>Masuk ke Bilik Ujian</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Footer Info Sistem */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-400">
                        <span>Standar UTBK-SNBT 2026</span>
                        <span>Kiosk Security On</span>
                    </div>
                </div>
            </div>
        </div>
    );
}