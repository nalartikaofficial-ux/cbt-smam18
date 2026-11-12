"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Award, AlertTriangle, Layers, Home, Check } from "lucide-react";

export default function ExamResultPage() {
    const router = useRouter();
    const [result, setResult] = useState<any>(null);
    const [hasChecked, setHasChecked] = useState(false);

    useEffect(() => {
        if (typeof document !== "undefined" && document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(() => { });
        }

        const data = localStorage.getItem("cbt_exam_result");
        if (data) {
            try {
                setResult(JSON.parse(data));
            } catch { }
        }
        setHasChecked(true);
    }, []);

    const handleFinishAndHome = () => {
        localStorage.removeItem("cbt_student_session");
        sessionStorage.clear();
        router.push("/");
    };

    if (hasChecked && !result) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 sm:p-6 font-sans text-slate-800">
                <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8 text-center space-y-4">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                        <AlertTriangle className="w-6 h-6 sm:w-7 sm:h-7" />
                    </div>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900">Belum Ada Riwayat Ujian</h2>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        Data hasil pengerjaan tidak ditemukan di perangkat ini. Silakan masuk melalui bilik ujian resmi.
                    </p>
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold text-xs shadow-md transition-all"
                    >
                        <Home className="w-4 h-4 shrink-0" />
                        <span>Kembali ke Beranda Utama</span>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-3.5 sm:p-6 md:p-8 font-sans text-slate-800">
            <div className="w-full max-w-md sm:max-w-xl bg-white rounded-3xl border border-slate-200 shadow-2xl p-5 sm:p-8 md:p-9 space-y-5 sm:space-y-6 text-center relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                <div className="absolute top-0 inset-x-0 h-1.5 bg-emerald-600" />

                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
                    <Award className="w-7 h-7 sm:w-8 sm:h-8" />
                </div>

                <div className="space-y-1.5">
                    <span className="inline-block px-3 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 font-mono text-[10px] sm:text-xs font-bold text-emerald-700 tracking-wide">
                        HASIL RESMI TERSINKRONISASI
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                        Lembar Jawaban Diterima
                    </h2>
                    <p className="text-xs text-slate-500 break-words">
                        Peserta: <strong className="text-slate-800">{result?.student?.candidateName || "Peserta Ujian"}</strong>{" "}
                        <span className="font-mono text-[11px]">({result?.student?.nisn || "-"})</span>
                    </p>
                </div>

                {/* Grid 3 Metrik Utama (1 Kolom di HP sempit, 3 Kolom di Tablet/Desktop) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex sm:block items-center justify-between">
                        <div className="text-[10px] font-mono text-slate-400 font-bold uppercase">Estimasi Skor</div>
                        <div className="text-xl sm:text-2xl font-black text-blue-700 mt-0 sm:mt-0.5">
                            {result?.score || 0}
                        </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex sm:block items-center justify-between">
                        <div className="text-[10px] font-mono text-slate-400 font-bold uppercase">Benar / Total</div>
                        <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-0 sm:mt-0.5">
                            {result?.correct || 0}{" "}
                            <span className="text-xs font-bold text-slate-400">/ {result?.total || 0}</span>
                        </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex sm:block items-center justify-between">
                        <div className="text-[10px] font-mono text-slate-400 font-bold uppercase">Pelanggaran</div>
                        <div
                            className={`text-xl sm:text-2xl font-black mt-0 sm:mt-0.5 ${result?.violations > 0 ? "text-rose-600" : "text-slate-800"
                                }`}
                        >
                            {result?.violations || 0} / 3
                        </div>
                    </div>
                </div>

                {/* Rincian Subtes (Jika Ada Breakdown) */}
                {result?.breakdown && Object.keys(result.breakdown).length > 0 && (
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2.5">
                        <div className="flex items-center gap-1.5 font-mono text-[10.5px] sm:text-[11px] font-bold text-slate-600 uppercase">
                            <Layers className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                            <span>Rincian Capaian Kategori:</span>
                        </div>
                        <div className="space-y-1.5 text-xs">
                            {Object.entries(result.breakdown).map(([category, stat]: [string, any]) => (
                                <div
                                    key={category}
                                    className="flex justify-between items-center gap-2 text-slate-700 py-0.5 border-b border-slate-200/60 last:border-b-0"
                                >
                                    <span className="font-medium text-[11px] truncate flex-1 min-w-0">
                                        {category}
                                    </span>
                                    <span className="font-mono font-bold text-[10.5px] sm:text-[11px] text-blue-900 bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0">
                                        {stat.correct} / {stat.total} Butir
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Status Pengerjaan */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-1.5 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-slate-700 text-[11px]">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Status Pengerjaan: Selesai</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                        Nilai dan catatan integritas Anda telah otomatis tersimpan di Buku Nilai IRT bilik Pengawas.
                    </p>
                </div>

                {/* Tombol Kembali */}
                <button
                    onClick={handleFinishAndHome}
                    className="w-full py-3 sm:py-3.5 px-5 rounded-2xl bg-[#1e3a8a] hover:bg-blue-900 active:scale-[0.99] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-900/20 transition-all"
                >
                    <Home className="w-4 h-4 shrink-0" />
                    <span>Selesai & Kembali ke Halaman Beranda</span>
                </button>
            </div>
        </div>
    );
}