"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Maximize2,
    ChevronLeft,
    AlertCircle,
    Loader2,
    Layers,
    Lock,
    Clock
} from "lucide-react";

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
        return "Kamu sudah menyelesaikan ujian ini dan tidak dapat mengerjakan ulang.";
    }
    if (msg.includes("terkunci") || msg.includes("kunci") || msg.includes("blokir")) {
        return "Akses ujian sedang dikunci pengawas ruang.";
    }
    if (msg.includes("belum dimulai")) {
        return "Waktu ujian belum dimulai! Silakan tunggu sesuai jadwal.";
    }
    if (msg.includes("berakhir") || msg.includes("habis")) {
        return "Batas waktu pelaksanaan sesi ujian telah berakhir. Pintu masuk ditutup otomatis.";
    }

    return rawMsg || "Data login salah, silahkan coba lagi!";
}

function formatJadwalWIB(isoStr?: string): string {
    if (!isoStr) return "-";
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return d.toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    }) + " WIB";
}

export default function StudentLoginPage() {
    const router = useRouter();

    const [nisn, setNisn] = useState("");
    const [candidateName, setCandidateName] = useState("");
    const [examToken, setExamToken] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [isValidating, setIsValidating] = useState(false);
    const [nowMs, setNowMs] = useState<number>(() => Date.now());

    const [activeSession, setActiveSession] = useState<{
        paket_aktif: string;
        nama_paket: string;
        status_akses: string;
        durasi_menit: number;
        waktu_mulai?: string;
        waktu_selesai?: string;
    } | null>(null);

    // Jam real-time berjalan setiap detik untuk evaluasi jadwal otomatis
    useEffect(() => {
        const clockTimer = setInterval(() => {
            setNowMs(Date.now());
        }, 1000);
        return () => clearInterval(clockTimer);
    }, []);

    // Sinkronisasi jadwal & status sesi dari server secara berkala (tiap 15 detik)
    useEffect(() => {
        const fetchSession = async () => {
            try {
                const res = await fetch(`/api/session?_t=${Date.now()}`, {
                    cache: "no-store"
                });
                const json = await res.json();
                if (json.status === "success" && json.data) {
                    setActiveSession({
                        paket_aktif: json.data.paket_aktif || "PAKET_1",
                        nama_paket: json.data.nama_paket || "Simulasi Terstandarisasi SNBT 2026",
                        status_akses: json.data.status_akses || "TERKUNCI",
                        durasi_menit: Number(json.data.durasi_menit || 195),
                        waktu_mulai: json.data.waktu_mulai || "",
                        waktu_selesai: json.data.waktu_selesai || ""
                    });
                    return;
                }
            } catch { }

            try {
                const resFallback = await fetch(`/api/auth/student?_t=${Date.now()}`, {
                    cache: "no-store"
                });
                const jsonFallback = await resFallback.json();
                if (jsonFallback.status === "success" && jsonFallback.data) {
                    setActiveSession(jsonFallback.data);
                }
            } catch {
                setActiveSession((prev) => prev || {
                    paket_aktif: "PAKET_1",
                    nama_paket: "Simulasi Terstandarisasi SNBT 2026",
                    status_akses: "TERKUNCI",
                    durasi_menit: 195
                });
            }
        };

        fetchSession();
        const syncInterval = setInterval(fetchSession, 15000);
        return () => clearInterval(syncInterval);
    }, []);

    // Evaluasi Gembok Otomatis (Saklar Proktor + Jadwal Real-Time)
    const gateStatus = useMemo(() => {
        if (!activeSession) {
            return { isBlocked: true, badge: "MEMUAT...", buttonText: "Memeriksa Jadwal...", reason: "" };
        }

        // 1. Saklar Darurat Proktor (Kill-switch semua paket)
        if (activeSession.status_akses === "TERKUNCI") {
            return {
                isBlocked: true,
                badge: "DIKUNCI PENGAWAS",
                buttonText: "Sesi Ujian Dikunci Pengawas",
                reason: "Bilik ujian sedang ditutup sementara oleh Pengawas Ruang."
            };
        }

        // 2. Jadwal belum diatur oleh Proktor
        if (!activeSession.waktu_mulai || !activeSession.waktu_selesai) {
            return {
                isBlocked: true,
                badge: "JADWAL BELUM DIATUR",
                buttonText: "Menunggu Jadwal Pengawas",
                reason: "Pengawas belum menetapkan jam mulai dan batas selesai ujian hari ini."
            };
        }

        const startMs = new Date(activeSession.waktu_mulai).getTime();
        const endMs = new Date(activeSession.waktu_selesai).getTime();

        // 3. Belum memasuki jam mulai ujian
        if (!isNaN(startMs) && nowMs < startMs) {
            return {
                isBlocked: true,
                badge: "BELUM DIMULAI",
                buttonText: "Ujian Belum Dimulai",
                reason: `Sesi ujian baru akan dibuka otomatis pada ${formatJadwalWIB(activeSession.waktu_mulai)}.`
            };
        }

        // 4. Batas waktu real-time sudah habis (Otomatis terkunci walaupun di Proktor masih DIBUKA)
        if (!isNaN(endMs) && nowMs >= endMs) {
            return {
                isBlocked: true,
                badge: "WAKTU HABIS",
                buttonText: "Batas Waktu Ujian Berakhir",
                reason: `Batas waktu sesi berakhir pada ${formatJadwalWIB(activeSession.waktu_selesai)}. Peserta yang terlambat/tidak hadir tidak dapat mengikuti sesi ini.`
            };
        }

        return {
            isBlocked: false,
            badge: "DIBUKA",
            buttonText: "Masuk ke Bilik Ujian",
            reason: ""
        };
    }, [activeSession, nowMs]);

    const handleStartOfficialExam = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg("");

        if (gateStatus.isBlocked) {
            setErrorMsg(gateStatus.reason || "Akses masuk bilik ujian sedang ditutup.");
            return;
        }

        const cleanNisn = nisn.trim().replace(/\D/g, "");
        const cleanName = candidateName.trim();
        const cleanToken = examToken.trim().toUpperCase();

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

        setIsValidating(true);

        try {
            // Verifikasi ulang waktu & status ke server tepat sebelum mengizinkan masuk
            const sessionCheckRes = await fetch(`/api/session?_t=${Date.now()}`, { cache: "no-store" });
            const sessionCheckJson = await sessionCheckRes.json();
            if (sessionCheckJson.status === "success" && sessionCheckJson.data) {
                const srv = sessionCheckJson.data;
                const serverNow = Date.now();
                const srvStart = srv.waktu_mulai ? new Date(srv.waktu_mulai).getTime() : NaN;
                const srvEnd = srv.waktu_selesai ? new Date(srv.waktu_selesai).getTime() : NaN;

                if (srv.status_akses === "TERKUNCI") {
                    setErrorMsg("Bilik ujian baru saja dikunci oleh pengawas.");
                    setIsValidating(false);
                    return;
                }
                if (!srv.waktu_mulai || !srv.waktu_selesai || (!isNaN(srvStart) && serverNow < srvStart)) {
                    setErrorMsg("Waktu ujian belum dimulai! Silakan tunggu sesuai jadwal.");
                    setIsValidating(false);
                    return;
                }
                if (!isNaN(srvEnd) && serverNow >= srvEnd) {
                    setErrorMsg("Batas waktu sesi ujian telah berakhir. Pintu masuk sudah ditutup otomatis.");
                    setIsValidating(false);
                    return;
                }
            }

            const res = await fetch("/api/auth/student", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nisn: cleanNisn,
                    nama: cleanName,
                    token: cleanToken
                })
            });
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
            <header className="bg-white border-b border-slate-200/90 py-3 px-4 sm:px-8 sticky top-0 z-20 shadow-2xs">
                <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors shrink-0"
                    >
                        <ChevronLeft className="w-4 h-4 shrink-0" />
                        <span>Laman Depan</span>
                    </Link>

                    <div className="flex items-center gap-1.5 font-mono text-[10px] sm:text-[11px] text-slate-500 truncate">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${gateStatus.isBlocked ? "bg-rose-500" : "bg-emerald-500 animate-pulse"}`} />
                        <span className="truncate">
                            {new Date(nowMs).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} WIB
                        </span>
                    </div>
                </div>
            </header>

            {/* Konten Utama Form Login */}
            <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8 my-auto">
                <div className="w-full max-w-md sm:max-w-lg bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 p-5 sm:p-8 md:p-9 space-y-5 sm:space-y-6 relative overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-600" />

                    {/* Logo & Judul Portal */}
                    <div className="text-center space-y-2">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center mx-auto overflow-hidden p-1">
                            <img
                                src="https://iqflpgrliqztoecpzrnu.supabase.co/storage/v1/object/public/cbt-assets/logo-timsim.jpg"
                                alt="Logo SMA Muhammadiyah 18 Jakarta"
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = "/images/logo-smam18.png";
                                }}
                            />
                        </div>

                        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-blue-50 border border-blue-200 font-mono text-[9.5px] sm:text-[10px] font-bold text-blue-900 uppercase tracking-wider">
                            <span>SMA MUHAMMADIYAH 18 JAKARTA</span>
                        </div>

                        <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                            Bilik Masuk Siswa
                        </h1>

                        <p className="text-[11px] sm:text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                            Silakan masukkan NISN, Nama Lengkap resmi, dan Token Ujian yang tertera di layar pengawas ruang.
                        </p>
                    </div>

                    {/* Banner Sesi Terpusat dari Proktor */}
                    {activeSession && (
                        <div className={`p-3 sm:p-3.5 rounded-2xl border space-y-2 text-xs ${gateStatus.isBlocked ? "bg-rose-50/70 border-rose-200" : "bg-blue-50/70 border-blue-200"}`}>
                            <div className="flex flex-col xs:flex-row sm:flex-row items-start sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0 w-full sm:w-auto">
                                    <div className={`p-2 text-white rounded-xl shrink-0 ${gateStatus.isBlocked ? "bg-rose-600" : "bg-blue-600"}`}>
                                        <Layers className="w-4 h-4" />
                                    </div>
                                    <div className="text-left min-w-0 flex-1">
                                        <span className="font-bold text-slate-950 block truncate">
                                            {activeSession.nama_paket}
                                        </span>
                                        <span className="text-[10.5px] sm:text-[11px] font-mono text-slate-600 font-semibold block truncate">
                                            Target: {activeSession.paket_aktif} • {activeSession.durasi_menit} Menit
                                        </span>
                                    </div>
                                </div>
                                <span
                                    className={`self-start sm:self-center px-2.5 py-0.5 rounded-full font-mono text-[9.5px] sm:text-[10px] font-black uppercase shrink-0 ${!gateStatus.isBlocked
                                        ? "bg-emerald-100 text-emerald-800"
                                        : "bg-rose-100 text-rose-800"
                                        }`}
                                >
                                    {gateStatus.badge}
                                </span>
                            </div>

                            {activeSession.waktu_mulai && activeSession.waktu_selesai && (
                                <div className="pt-1.5 border-t border-slate-200/70 flex items-center gap-1.5 text-[10px] font-mono text-slate-600">
                                    <Clock className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                                    <span>
                                        Jadwal: <strong>{formatJadwalWIB(activeSession.waktu_mulai)}</strong> s.d. <strong>{formatJadwalWIB(activeSession.waktu_selesai)}</strong>
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Peringatan Otomatis Jika Jadwal Belum Mulai / Sudah Habis / Dikunci */}
                    {gateStatus.isBlocked && gateStatus.reason && (
                        <div className="p-3 sm:p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2.5">
                            <Lock className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
                            <span className="font-semibold text-left leading-relaxed">{gateStatus.reason}</span>
                        </div>
                    )}

                    {/* Pesan Error Validasi */}
                    {errorMsg && (
                        <div className="p-3 sm:p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
                            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                            <span className="font-semibold text-left leading-relaxed">{errorMsg}</span>
                        </div>
                    )}

                    {/* Form Login */}
                    <form onSubmit={handleStartOfficialExam} className="space-y-3.5 sm:space-y-4">
                        <div className="space-y-1 text-left">
                            <label className="text-[10.5px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider font-mono block">
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
                                className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm font-mono tracking-wider font-bold text-slate-900 outline-none transition-all"
                            />
                        </div>

                        <div className="space-y-1 text-left">
                            <label className="text-[10.5px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider font-mono block">
                                Nama Lengkap Siswa (Sesuai Data Sekolah):
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="Masukkan nama lengkap..."
                                value={candidateName}
                                onChange={(e) => setCandidateName(e.target.value)}
                                className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm font-semibold text-slate-900 outline-none transition-all"
                            />
                        </div>

                        <div className="space-y-1 text-left pt-0.5">
                            <div className="flex items-center justify-between gap-2">
                                <label className="text-[10.5px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                                    Token Resmi Ruang Ujian:
                                </label>
                                <span className="text-[10px] sm:text-[11px] text-slate-400 italic shrink-0">
                                    Dari pengawas
                                </span>
                            </div>
                            <input
                                type="text"
                                required
                                maxLength={8}
                                autoCapitalize="characters"
                                autoCorrect="off"
                                autoComplete="off"
                                spellCheck={false}
                                placeholder="TOKEN..."
                                value={examToken}
                                onChange={(e) => setExamToken(e.target.value)}
                                className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl border-2 border-amber-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-base font-mono tracking-widest text-center uppercase font-black text-amber-700 bg-amber-50/30 outline-none transition-all"
                            />
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isValidating || gateStatus.isBlocked}
                                className={`w-full py-3 sm:py-3.5 px-6 rounded-2xl font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 ${gateStatus.isBlocked
                                    ? "bg-slate-300 text-slate-600 cursor-not-allowed shadow-none"
                                    : "bg-[#1e3a8a] hover:bg-blue-900 active:scale-[0.99] text-white shadow-blue-900/25 cursor-pointer"
                                    } disabled:opacity-70`}
                            >
                                {isValidating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                                        <span>Memverifikasi Kredensial...</span>
                                    </>
                                ) : gateStatus.isBlocked ? (
                                    <>
                                        <Lock className="w-4 h-4 shrink-0" />
                                        <span>{gateStatus.buttonText}</span>
                                    </>
                                ) : (
                                    <>
                                        <Maximize2 className="w-4 h-4 shrink-0" />
                                        <span>{gateStatus.buttonText}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Footer Info Sistem */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-[10px] sm:text-[11px] font-mono text-slate-400">
                        <span>Standar UTBK-SNBT 2026</span>
                        <span>Auto-Schedule Gate On</span>
                    </div>
                </div>
            </main>
        </div>
    );
}