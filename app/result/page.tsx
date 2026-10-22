"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Award, CheckCircle2, AlertTriangle, Layers, Home, Check } from "lucide-react";

export default function ExamResultPage() {
    const router = useRouter();
    const [result, setResult] = useState<any>(null);
    const [hasChecked, setHasChecked] = useState(false);

    useEffect(() => {
        // Lepas mode fullscreen secara aman
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
            <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans text-slate-800">
                <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-xl p-8 text-center space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                        <AlertTriangle className="w-7 h-7" />
                    </div>
                    <h2 className="text-xl font-black text-slate-900">Belum Ada Riwayat Ujian</h2>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        Data hasil pengerjaan tidak ditemukan di perangkat ini. Silakan masuk melalui bilik ujian resmi.
                    </p>
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold text-xs shadow-md transition-all"
                    >
                        <Home className="w-4 h-4" />
                        <span>Kembali ke Beranda Utama</span>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans text-slate-800">
            <div className="w-full max-w-xl bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-9 space-y-6 text-center relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                <div className="absolute top-0 inset-x-0 h-1.5 bg-emerald-600" />

                <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
                    <Award className="w-8 h-8" />
                </div>

                <div className="space-y-1">
                    <span className="inline-block px-3 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 font-mono text-xs font-bold text-emerald-700">
                        HASIL RESMI TERSINKRONISASI
                    </span>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Lembar Jawaban Diterima</h2>
                    <p className="text-xs text-slate-500">
                        Peserta: <strong className="text-slate-800">{result?.student?.candidateName || "Peserta Ujian"}</strong> ({result?.student?.nisn || "-"})
                    </p>
                </div>

                {/* Grid 3 Metrik Utama */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                        <div className="text-[10px] font-mono text-slate-400 font-bold uppercase">Estimasi Skor</div>
                        <div className="text-2xl font-black text-blue-700">{result?.score || 0}</div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                        <div className="text-[10px] font-mono text-slate-400 font-bold uppercase">Benar / Total</div>
                        <div className="text-2xl font-black text-emerald-600">
                            {result?.correct || 0} <span className="text-xs text-slate-400">/ {result?.total || 0}</span>
                        </div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                        <div className="text-[10px] font-mono text-slate-400 font-bold uppercase">Pelanggaran</div>
                        <div className={`text-2xl font-black ${result?.violations > 0 ? "text-rose-600" : "text-slate-800"}`}>
                            {result?.violations || 0} / 3
                        </div>
                    </div>
                </div>

                {/* Rincian Subtes (Jika Ada Breakdown) */}
                {result?.breakdown && Object.keys(result.breakdown).length > 0 && (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2">
                        <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-slate-600 uppercase">
                            <Layers className="w-3.5 h-3.5 text-blue-700" />
                            <span>Rincian Capaian Kategori:</span>
                        </div>
                        <div className="space-y-1.5 text-xs">
                            {Object.entries(result.breakdown).map(([category, stat]: [string, any]) => (
                                <div key={category} className="flex justify-between items-center text-slate-700">
                                    <span className="font-medium text-[11px] truncate max-w-[240px]">{category}</span>
                                    <span className="font-mono font-bold text-[11px] text-blue-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                                        {stat.correct} / {stat.total} Butir
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-1.5 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-slate-700 text-[11px]">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Status Pengerjaan: Selesai</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                        Nilai dan catatan integritas Anda telah otomatis tersimpan di Buku Nilai IRT bilik Pengawas.
                    </p>
                </div>

                <button
                    onClick={handleFinishAndHome}
                    className="w-full py-3.5 rounded-xl bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all"
                >
                    <Home className="w-4 h-4" />
                    <span>Selesai &amp; Kembali ke Halaman Beranda</span>
                </button>
            </div>
        </div>
    );
}