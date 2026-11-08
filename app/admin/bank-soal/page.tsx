/* eslint-disable @next/next/no-img-element */
// @ts-nocheck
"use client";

import * as XLSX from "xlsx";
import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Database,
    ChevronLeft,
    Send,
    Image as ImageIcon,
    FileSpreadsheet,
    FileText,
    UploadCloud,
    Download,
    HelpCircle,
    CheckCircle2,
    AlertCircle,
    Eye,
    Trash2,
    Link2,
    Copy,
    Check,
    RefreshCw,
    Home,
    ListFilter,
    Clock,
    Save,
    Edit3
} from "lucide-react";

// URL BACKEND GOOGLE APPS SCRIPT MASTER RESMI
const GOOGLE_SCRIPT_API_URL =
    "https://script.google.com/macros/s/AKfycbxXeMuz-VXgbdUOESiOOLL5NlLrSMVfrdvOCwhgBbjLWwOy3ASkTjnWJSAIONFDrdY7hg/exec";

// HELPER RENDER MATEMATIKA: MENDUKUNG FORMULA LATEX MAUPUN NASKAH POLOS
export const MathRenderer = ({ content }: { content: any }) => {
    const [katexReady, setKatexReady] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;
        if ((window as any).katex) {
            setKatexReady(true);
            return;
        }
        const timer = setInterval(() => {
            if ((window as any).katex) {
                setKatexReady(true);
                clearInterval(timer);
            }
        }, 100);
        return () => clearInterval(timer);
    }, []);

    if (content === null || content === undefined) return null;
    let text = String(content).replace(/\\n/g, "\n");
    if (!text.trim()) return null;

    text = text.replace(/<[^>]*>/g, "");

    if (text.includes("$")) {
        const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[^\$]+?\$)/g);
        return (
            <span>
                {parts.map((part, idx) => {
                    if ((part.startsWith("$$") && part.endsWith("$$")) || (part.startsWith("$") && part.endsWith("$"))) {
                        const isDisplay = part.startsWith("$$");
                        let formula = isDisplay ? part.slice(2, -2).trim() : part.slice(1, -1).trim();

                        if (katexReady && typeof window !== "undefined" && (window as any).katex) {
                            try {
                                const html = (window as any).katex.renderToString(formula, {
                                    displayMode: isDisplay,
                                    throwOnError: false
                                });
                                return (
                                    <span
                                        key={idx}
                                        className={isDisplay ? "block my-2 overflow-x-auto text-center" : "inline-block px-0.5"}
                                        dangerouslySetInnerHTML={{ __html: html }}
                                    />
                                );
                            } catch { }
                        }
                        return <span key={idx} className="font-serif italic font-semibold">{formula}</span>;
                    }
                    return <span key={idx}>{part}</span>;
                })}
            </span>
        );
    }

    const formatCleanText = (str: string) => {
        return str
            .replace(/\^0/g, "⁰").replace(/\^1/g, "¹").replace(/\^2/g, "²").replace(/\^3/g, "³")
            .replace(/\^4/g, "⁴").replace(/\^5/g, "⁵").replace(/\^6/g, "⁶").replace(/\^7/g, "⁷")
            .replace(/\^8/g, "⁸").replace(/\^9/g, "⁹")
            .replace(/<=/g, "≤").replace(/>=/g, "≥").replace(/!=/g, "≠").replace(/\+-/g, "±");
    };

    return <span className="leading-relaxed">{formatCleanText(text)}</span>;
};

// HELPER GAMBAR GOOGLE DRIVE CDN
export function convertToDirectImageUrl(rawUrl: string): string {
    if (!rawUrl) return "";
    const clean = String(rawUrl).trim();

    const driveRegex = /(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)|id=)([a-zA-Z0-9_-]{20,})/;
    const driveMatch = clean.match(driveRegex);
    if (driveMatch && driveMatch[1]) {
        return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
    }

    if (clean.includes("lh3.googleusercontent.com")) {
        return clean;
    }

    if (clean.includes("dropbox.com") && clean.includes("dl=0")) {
        return clean.replace("dl=0", "dl=1");
    }

    return clean;
}

interface ParsedQuestion {
    subtes_code: string;
    no_soal: number;
    stimulus?: string;
    image_url?: string;
    image_position?: "above" | "below";
    pertanyaan: string;
    opsi_a: string;
    opsi_b: string;
    opsi_c: string;
    opsi_d: string;
    opsi_e: string;
    opsi_a_img?: string;
    opsi_b_img?: string;
    opsi_c_img?: string;
    opsi_d_img?: string;
    opsi_e_img?: string;
    kunci: string;
    tingkat_kesukaran: string;
    pembahasan?: string;
    author_guru?: string;
}

interface SubtestDurationItem {
    code: string;
    name: string;
    category?: string;
    defaultDurationMinutes: number;
}

// ========================================================
// MESIN IMPORT WORD DENGAN PARSER DETEKSI UNIVERSAL
// ========================================================
function WordImporterSection({
    selectedSubtest,
    selectedPaket,
    currentCount,
    onBulkSubmit,
    isSubmittingServer
}: {
    selectedSubtest: string;
    selectedPaket: string;
    currentCount: number;
    onBulkSubmit: (questions: ParsedQuestion[]) => Promise<void>;
    isSubmittingServer: boolean;
}) {
    const [isParsing, setIsParsing] = useState(false);
    const [stagedList, setStagedList] = useState<ParsedQuestion[]>([]);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<ParsedQuestion | null>(null);

    // Fungsi pemecah jika opsi A-E diketik sejajar di 1 baris
    const parseMultipleOptionsInOneLine = (line: string) => {
        const matches = Array.from(line.matchAll(/(?:^|\s+)([A-Ea-e])[\.\)\uff0e]\s+/g));
        if (matches.length >= 2) {
            const result: { [key: string]: string } = {};
            for (let i = 0; i < matches.length; i++) {
                const letter = matches[i][1].toUpperCase();
                const start = matches[i].index! + matches[i][0].length;
                const end = (i + 1 < matches.length) ? matches[i + 1].index! : line.length;
                result[letter] = line.substring(start, end).trim();
            }
            return result;
        }
        return null;
    };

    const handleDocxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsParsing(true);
        try {
            const mammothModule: any = await import("mammoth");
            const mammoth = mammothModule.default || mammothModule;
            const arrayBuffer = await file.arrayBuffer();

            const result = await mammoth.convertToHtml(
                { arrayBuffer },
                {
                    convertImage: mammoth.images.inline((element: any) => {
                        return element.read("base64").then((imageBuffer: any) => {
                            return {
                                src: `data:${element.contentType};base64,${imageBuffer}`,
                            };
                        });
                    }),
                }
            );

            const parser = new DOMParser();
            const doc = parser.parseFromString(result.value, "text/html");

            // Rata-kan semua baris (paragraf, sel tabel, list)
            const blocks: { text: string; imgUrl: string }[] = [];
            const leafNodes = doc.body.querySelectorAll("p, td, li, h1, h2, h3, h4");
            leafNodes.forEach((node) => {
                if (node.tagName.toLowerCase() === "td" && node.querySelector("p")) {
                    return;
                }
                const img = node.querySelector("img");
                const imgSrc = img ? img.getAttribute("src") || "" : "";
                const text = (node.textContent || "").replace(/\u00A0/g, " ").trim();
                if (text || imgSrc) {
                    blocks.push({ text, imgUrl: imgSrc });
                }
            });

            const questions: ParsedQuestion[] = [];
            let current: Partial<ParsedQuestion> = {
                subtes_code: selectedSubtest || "PU",
                image_position: "above",
                tingkat_kesukaran: "Sedang",
                kunci: "A",
            };

            let counter = 1;
            let isReadingPembahasan = false;

            const commitCurrent = () => {
                if (current.pertanyaan || current.opsi_a) {
                    questions.push({
                        no_soal: currentCount + counter,
                        subtes_code: current.subtes_code || selectedSubtest || "PU",
                        stimulus: (current.stimulus || "").trim(),
                        image_url: current.image_url || "",
                        image_position: current.image_position || "above",
                        pertanyaan: (current.pertanyaan || "Pertanyaan").trim(),
                        opsi_a: (current.opsi_a || "").trim(),
                        opsi_b: (current.opsi_b || "").trim(),
                        opsi_c: (current.opsi_c || "").trim(),
                        opsi_d: (current.opsi_d || "").trim(),
                        opsi_e: (current.opsi_e || "").trim(),
                        kunci: (current.kunci || "A").trim().toUpperCase(),
                        tingkat_kesukaran: current.tingkat_kesukaran || "Sedang",
                        pembahasan: (current.pembahasan || "").trim(),
                    });
                    counter++;
                    current = {
                        subtes_code: selectedSubtest || "PU",
                        image_position: "above",
                        tingkat_kesukaran: "Sedang",
                        kunci: "A",
                    };
                    isReadingPembahasan = false;
                }
            };

            blocks.forEach((block) => {
                let { text, imgUrl } = block;

                if (imgUrl && !current.image_url) {
                    current.image_url = imgUrl;
                }

                if (!text) return;

                // Abaikan teks judul pengantar ujian yang bukan soal
                if (/^(?:SMA\s+MUHAMMADIYAH|PAKET\s+LATIHAN|PETUNJUK|Gambar\s+\d+:)/i.test(text)) {
                    return;
                }

                // 1. Deteksi Nomor Soal Baru:
                // Mendukung: "1.", "1)", "Soal 1", "Soal 1.", "No. 1", "No 1:"
                // Sekaligus memotong jika ada header di depannya: misal "Paket B ... Soal 1 Seorang praktikan..."
                const inlineSoalMatch = text.match(/(?:^|.*?)(?:(?:soal|nomor|no\.?)\s*(\d+)[\.\:\)]?|(?<!\w)(\d+)[\.\)\uff0e])\s+(.*)/i);

                // Pastikan bukan bagian dari opsi A-E atau bukan bagian wacana
                if (inlineSoalMatch && !/^[A-Ea-e][\.\)\uff0e]/i.test(text) && !/^(?:KUNCI|JAWABAN|PEMBAHASAN)/i.test(text)) {
                    // Simpan soal sebelumnya
                    commitCurrent();

                    // Teks pertanyaan setelah kata nomor
                    current.pertanyaan = inlineSoalMatch[3] || "";
                    isReadingPembahasan = false;
                    return;
                }

                // 2. Deteksi Opsi Sejajar ke Samping (Inline A. ... B. ... C. ...)
                const inlineMap = parseMultipleOptionsInOneLine(text);
                if (inlineMap) {
                    if (inlineMap["A"]) current.opsi_a = inlineMap["A"];
                    if (inlineMap["B"]) current.opsi_b = inlineMap["B"];
                    if (inlineMap["C"]) current.opsi_c = inlineMap["C"];
                    if (inlineMap["D"]) current.opsi_d = inlineMap["D"];
                    if (inlineMap["E"]) current.opsi_e = inlineMap["E"];
                    return;
                }

                // 3. Deteksi Pilihan Ganda Tunggal per Baris/Kolom: "A. ...", "A) ...", "a. ..."
                const singleOptMatch = text.match(/^([A-Ea-e])[\.\)\uff0e]\s*(.*)/i);
                if (singleOptMatch) {
                    const char = singleOptMatch[1].toUpperCase();
                    const val = singleOptMatch[2].trim();
                    if (char === "A") current.opsi_a = val;
                    if (char === "B") current.opsi_b = val;
                    if (char === "C") current.opsi_c = val;
                    if (char === "D") current.opsi_d = val;
                    if (char === "E") current.opsi_e = val;
                    return;
                }

                // 4. Deteksi Kunci Jawaban: "Kunci: A", "Kunci Jawaban: B", "Jawaban = C"
                const keyMatch = text.match(/(?:KUNCI(?:\s*JAWABAN)?|JAWABAN)\s*[:=]\s*([A-Ea-e])/i);
                if (keyMatch) {
                    current.kunci = keyMatch[1].toUpperCase();
                    return;
                }

                // 5. Deteksi Judul Pembahasan: "Pembahasan: ..."
                const pbhMatch = text.match(/^PEMBAHASAN(?:\s+SOAL\s+NOMOR\s*\d+)?\s*[:=]?\s*(.*)/i);
                if (pbhMatch) {
                    current.pembahasan = pbhMatch[1] ? pbhMatch[1].trim() : "";
                    isReadingPembahasan = true;
                    return;
                }

                // 6. Deteksi Wacana / Stimulus
                if (/^Wacana:\s*/i.test(text)) {
                    current.stimulus = text.replace(/^Wacana:\s*/i, "").trim();
                    return;
                }

                // 7. Penggabungan Teks Tambahan
                if (isReadingPembahasan) {
                    current.pembahasan = current.pembahasan ? current.pembahasan + "\n" + text : text;
                } else if (!current.opsi_a) {
                    if (!current.pertanyaan) {
                        current.pertanyaan = text;
                    } else {
                        current.pertanyaan += "\n" + text;
                    }
                }
            });

            // Simpan soal terakhir
            commitCurrent();

            if (questions.length === 0) {
                alert("Tidak ada butir soal yang terbaca. Pastikan terdapat format penomoran (1., Soal 1, atau No. 1) serta pilihan opsi (A., B., C., D., E.).");
            } else {
                setStagedList(questions);
            }
        } catch (err: any) {
            console.error(err);
            alert("Gagal membaca file .docx: " + (err?.message || "Format berkas tidak valid"));
        } finally {
            setIsParsing(false);
            e.target.value = "";
        }
    };

    return (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm text-left">
            <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                        Import Naskah Word Biasa (.docx) &bull; Format Alami Guru
                    </h2>
                    <p className="text-xs text-slate-500">
                        Mendukung penomoran standar ("1.", "Soal 1", "No. 1"), opsi A-E di tabel/baris, gambar grafik, kunci, dan pembahasan tanpa perlu kode khusus.
                    </p>
                </div>
            </div>

            <div className="border-2 border-dashed border-indigo-300 hover:border-indigo-600 bg-indigo-50/20 hover:bg-indigo-50/40 rounded-3xl p-8 text-center transition-all">
                <input
                    type="file"
                    id="docx-file-input"
                    accept=".docx"
                    onChange={handleDocxUpload}
                    disabled={isParsing || isSubmittingServer}
                    className="hidden"
                />
                <label
                    htmlFor="docx-file-input"
                    className="cursor-pointer flex flex-col items-center justify-center gap-3"
                >
                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-xs">
                        <UploadCloud className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-800">
                            {isParsing ? "Sedang Membaca Soal, Gambar & Opsi..." : "Klik untuk Memilih File Dokumen Word (.docx)"}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Paket Target: <strong>{selectedPaket.replace("_", " ")}</strong> &bull; Subtes Default: <strong>{selectedSubtest}</strong>
                        </p>
                    </div>
                </label>
            </div>

            {stagedList.length > 0 && (
                <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-xs font-mono">
                                {stagedList.length} Soal Berhasil Terbaca Sempurna
                            </span>
                            <span className="text-xs text-slate-300">Siap disimpan ke {selectedPaket.replace("_", " ")}</span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                            Semua butir soal, opsi A–E, dan kunci jawaban telah dipisahkan secara akurat.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={() => setStagedList([])}
                            disabled={isSubmittingServer}
                            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
                        >
                            Batalkan
                        </button>
                        <button
                            type="button"
                            onClick={() => onBulkSubmit(stagedList)}
                            disabled={isSubmittingServer}
                            className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50 transition-all"
                        >
                            {isSubmittingServer ? (
                                <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    <span>Menyimpan ke Server...</span>
                                </>
                            ) : (
                                <>
                                    <Send className="w-3.5 h-3.5" />
                                    <span>Simpan Semua ({stagedList.length} Soal)</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {stagedList.length > 0 && (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                    {stagedList.map((q) => {
                        const isEditing = editingId === q.no_soal;

                        if (isEditing && editForm) {
                            return (
                                <div key={q.no_soal} className="p-5 rounded-2xl bg-white border-2 border-indigo-500 shadow-md space-y-3">
                                    <div className="flex items-center justify-between pb-2 border-b">
                                        <span className="text-xs font-bold text-indigo-700 font-mono">
                                            Edit Soal No. {q.no_soal}
                                        </span>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setStagedList((prev) => prev.map((item) => item.no_soal === editForm.no_soal ? editForm : item));
                                                    setEditingId(null);
                                                    setEditForm(null);
                                                }}
                                                className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-500"
                                            >
                                                Selesai Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setEditingId(null); setEditForm(null); }}
                                                className="px-3 py-1 bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                                            >
                                                Batal
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-bold text-slate-600 font-mono block mb-1">PERTANYAAN:</label>
                                        <textarea
                                            rows={3}
                                            value={editForm.pertanyaan}
                                            onChange={(e) => setEditForm({ ...editForm, pertanyaan: e.target.value })}
                                            className="w-full text-xs p-2.5 border rounded-xl outline-none focus:border-indigo-600"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {(["a", "b", "c", "d", "e"] as const).map((letter) => (
                                            <div key={letter} className="flex items-center gap-1.5">
                                                <span className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center font-mono font-bold text-[10px] border">
                                                    {letter.toUpperCase()}
                                                </span>
                                                <input
                                                    type="text"
                                                    value={(editForm as any)[`opsi_${letter}`]}
                                                    onChange={(e) =>
                                                        setEditForm({ ...editForm, [`opsi_${letter}`]: e.target.value })
                                                    }
                                                    className="flex-1 p-1.5 border rounded-lg text-xs"
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-600 font-mono block mb-1">KUNCI JAWABAN:</label>
                                            <select
                                                value={editForm.kunci}
                                                onChange={(e) => setEditForm({ ...editForm, kunci: e.target.value })}
                                                className="w-full text-xs p-2 border rounded-xl font-bold bg-white"
                                            >
                                                {["A", "B", "C", "D", "E"].map((k) => (
                                                    <option key={k} value={k}>Opsi {k}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-600 font-mono block mb-1">PEMBAHASAN:</label>
                                            <input
                                                type="text"
                                                value={editForm.pembahasan}
                                                onChange={(e) => setEditForm({ ...editForm, pembahasan: e.target.value })}
                                                className="w-full text-xs p-2 border rounded-xl"
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div key={q.no_soal} className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded bg-[#1e3a8a] text-white font-mono font-bold text-[10px]">
                                            NO. {q.no_soal}
                                        </span>
                                        <span className="font-semibold text-slate-700 text-[11px] font-mono">
                                            Subtes: {q.subtes_code}
                                        </span>
                                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300 font-mono text-[10px] font-bold">
                                            KUNCI: {q.kunci}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => { setEditingId(q.no_soal); setEditForm({ ...q }); }}
                                            className="px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg flex items-center gap-1 transition-all"
                                        >
                                            <Edit3 className="w-3 h-3" />
                                            <span>Edit</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setStagedList((prev) => prev.filter((item) => item.no_soal !== q.no_soal))}
                                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                {q.stimulus && (
                                    <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed italic">
                                        <MathRenderer content={q.stimulus} />
                                    </div>
                                )}

                                {q.image_url && (
                                    <div className="p-2 bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center">
                                        <img
                                            src={q.image_url}
                                            alt={`Gambar Soal No. ${q.no_soal}`}
                                            className="max-h-56 max-w-full rounded-lg object-contain"
                                        />
                                        <span className="text-[10px] text-slate-400 mt-1">
                                            Gambar diekstrak dari dokumen Word
                                        </span>
                                    </div>
                                )}

                                <div className="text-xs font-semibold text-slate-900 leading-relaxed">
                                    <MathRenderer content={q.pertanyaan} />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                    {[
                                        { label: "A", text: q.opsi_a },
                                        { label: "B", text: q.opsi_b },
                                        { label: "C", text: q.opsi_c },
                                        { label: "D", text: q.opsi_d },
                                        { label: "E", text: q.opsi_e },
                                    ].map((opt) => (
                                        <div
                                            key={opt.label}
                                            className={`p-2 rounded-xl border text-xs flex items-center gap-2 ${q.kunci === opt.label
                                                ? "bg-emerald-50 border-emerald-400 font-bold text-emerald-950"
                                                : "bg-white border-slate-200 text-slate-700"
                                                }`}
                                        >
                                            <span className="font-mono font-bold">{opt.label}.</span>
                                            <span><MathRenderer content={opt.text || "-"} /></span>
                                        </div>
                                    ))}
                                </div>

                                {q.pembahasan && (
                                    <div className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-100 text-[11px] text-blue-900">
                                        <strong>Pembahasan: </strong>
                                        <MathRenderer content={q.pembahasan} />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ========================================================
// HALAMAN UTAMA BANK SOAL
// ========================================================
export default function AdminBankSoalPage() {
    const router = useRouter();

    const [isAuthorized, setIsAuthorized] = useState(false);
    const [loggedTeacher, setLoggedTeacher] = useState<{ nama: string; mapel?: string }>({
        nama: "Fadhillah Umar, S.Pd.",
        mapel: "Fisika"
    });

    useEffect(() => {
        if (typeof window !== "undefined") {
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css";
            document.head.appendChild(link);

            const script = document.createElement("script");
            script.src = "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js";
            script.async = true;
            document.body.appendChild(script);

            const raw = sessionStorage.getItem("logged_user");
            if (!raw) {
                router.replace("/admin");
                return;
            }

            try {
                const parsed = JSON.parse(raw);
                if (parsed.role === "admin" || parsed.role === "guru") {
                    setLoggedTeacher(parsed);
                    setIsAuthorized(true);
                } else {
                    alert("Akses Dibatasi: Bilik ini khusus Guru Pembuat Soal & Administrator.");
                    router.replace("/admin");
                }
            } catch {
                router.replace("/admin");
            }
        }
    }, [router]);

    const [selectedPaket, setSelectedPaket] = useState<"PAKET_1" | "PAKET_2" | "PAKET_3">("PAKET_1");
    const [inputMode, setInputMode] = useState<"list" | "docx_upload" | "csv" | "manual">("list");

    const [serverQuestions, setServerQuestions] = useState<ParsedQuestion[]>([]);
    const [isLoadingServerQuestions, setIsLoadingServerQuestions] = useState(false);
    const [filterSubtestView, setFilterSubtestView] = useState("ALL");

    const [subtestsConfig, setSubtestsConfig] = useState<SubtestDurationItem[]>([
        { code: "PU", name: "Penalaran Umum (PU)", defaultDurationMinutes: 30 },
        { code: "PPU", name: "Pengetahuan & Pemahaman", defaultDurationMinutes: 15 },
        { code: "PBM", name: "Pemahaman Bacaan & Menulis", defaultDurationMinutes: 25 },
        { code: "PK", name: "Pengetahuan Kuantitatif", defaultDurationMinutes: 20 },
        { code: "LIT_INDO", name: "Literasi B. Indonesia", defaultDurationMinutes: 45 },
        { code: "LIT_ENG", name: "Literasi Bahasa Inggris", defaultDurationMinutes: 30 },
        { code: "PM", name: "Penalaran Matematika", defaultDurationMinutes: 30 }
    ]);
    const [isSavingDurations, setIsSavingDurations] = useState(false);

    const [showCsvPreview, setShowCsvPreview] = useState(true);
    const [testInputUrl, setTestInputUrl] = useState("");
    const [testedDirectUrl, setTestedDirectUrl] = useState("");
    const [isCopied, setIsCopied] = useState(false);
    const [batchQuestions, setBatchQuestions] = useState<ParsedQuestion[]>([]);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const [selectedSubtest, setSelectedSubtest] = useState("PU");
    const [noSoal, setNoSoal] = useState("1");
    const [stimulus, setStimulus] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [imagePosition, setImagePosition] = useState<"above" | "below">("below");
    const [pertanyaan, setPertanyaan] = useState("");
    const [opsiA, setOpsiA] = useState("");
    const [opsiB, setOpsiB] = useState("");
    const [opsiC, setOpsiC] = useState("");
    const [opsiD, setOpsiD] = useState("");
    const [opsiE, setOpsiE] = useState("");
    const [opsiAImg, setOpsiAImg] = useState("");
    const [opsiBImg, setOpsiBImg] = useState("");
    const [opsiCImg, setOpsiCImg] = useState("");
    const [opsiDImg, setOpsiDImg] = useState("");
    const [opsiEImg, setOpsiEImg] = useState("");
    const [kunci, setKunci] = useState("A");
    const [kesukaran, setKesukaran] = useState("Sedang");
    const [pembahasan, setPembahasan] = useState("");

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [isEditingMode, setIsEditingMode] = useState(false);

    const fetchSubtestDurations = async (pkg = selectedPaket) => {
        try {
            const res = await fetch(`${GOOGLE_SCRIPT_API_URL}?action=get_subtests&package=${pkg}&paket=${pkg}&_t=${Date.now()}`, {
                cache: "no-store"
            });
            const json = await res.json();
            if (json.status === "success" && Array.isArray(json.data) && json.data.length > 0) {
                setSubtestsConfig(json.data);
            }
        } catch { }
    };

    const handleSaveSubtestDurations = async () => {
        setIsSavingDurations(true);
        setStatusMsg(null);
        try {
            await fetch(GOOGLE_SCRIPT_API_URL, {
                method: "POST",
                mode: "no-cors",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({
                    action: "save_subtests",
                    paket: selectedPaket,
                    package: selectedPaket,
                    subtests: subtestsConfig
                })
            });

            setStatusMsg({
                type: "success",
                text: `Alokasi durasi 7 subtes untuk ${selectedPaket.replace("_", " ")} berhasil disimpan ke server!`
            });
        } catch {
            setStatusMsg({
                type: "error",
                text: "Gagal menyimpan durasi subtes. Pastikan koneksi internet stabil."
            });
        } finally {
            setIsSavingDurations(false);
        }
    };

    const fetchServerQuestions = async (pkg = selectedPaket) => {
        setIsLoadingServerQuestions(true);
        try {
            const res = await fetch(
                `${GOOGLE_SCRIPT_API_URL}?action=get_questions&package=${pkg}&paket=${pkg}&_t=${Date.now()}`,
                { cache: "no-store" }
            );
            const text = await res.text();
            if (!text.trim().startsWith("<")) {
                const json = JSON.parse(text);
                if (json.status === "success" && Array.isArray(json.data)) {
                    setServerQuestions(json.data);
                    setNoSoal(String(json.data.length + 1));
                } else {
                    setServerQuestions([]);
                    setNoSoal("1");
                }
            }
        } catch (err) {
            console.error("Gagal memuat soal dari spreadsheet:", err);
        } finally {
            setIsLoadingServerQuestions(false);
        }
    };

    useEffect(() => {
        if (isAuthorized) {
            fetchServerQuestions(selectedPaket);
            fetchSubtestDurations(selectedPaket);
        }
    }, [selectedPaket, isAuthorized]);

    const handleDeleteServerQuestion = async (no: number, sub: string) => {
        if (!confirm(`Hapus soal No. ${no} (${sub}) dari ${selectedPaket}?`)) return;

        try {
            await fetch(GOOGLE_SCRIPT_API_URL, {
                method: "POST",
                mode: "no-cors",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({
                    action: "delete_question",
                    paket: selectedPaket,
                    package: selectedPaket,
                    no_soal: no,
                    subtes_code: sub
                })
            });

            setServerQuestions((prev) => prev.filter((q) => !(Number(q.no_soal) === no && q.subtes_code === sub)));
            setStatusMsg({ type: "success", text: `Soal No. ${no} berhasil dihapus dari ${selectedPaket}!` });
            setTimeout(() => fetchServerQuestions(selectedPaket), 2500);
        } catch {
            setStatusMsg({ type: "error", text: "Gagal menghapus soal dari spreadsheet." });
        }
    };

    const handleEditQuestion = (item: any) => {
        setIsEditingMode(true);
        setNoSoal(String(item.no_soal || item.no || "1"));
        if (item.subtes_code || item.subtes) {
            setSelectedSubtest(item.subtes_code || item.subtes);
        }
        setStimulus(item.stimulus || "");
        setImageUrl(item.image_url || "");
        setImagePosition(item.image_position === "above" ? "above" : "below");
        setPertanyaan(item.pertanyaan || "");

        setOpsiA(item.opsi_a || "");
        setOpsiB(item.opsi_b || "");
        setOpsiC(item.opsi_c || "");
        setOpsiD(item.opsi_d || "");
        setOpsiE(item.opsi_e || "");

        setKunci(item.kunci || "A");
        if (item.kesukaran || item.tingkat_kesukaran) setKesukaran(item.kesukaran || item.tingkat_kesukaran);
        if (item.pembahasan) setPembahasan(item.pembahasan);

        setInputMode("manual");

        setStatusMsg({
            type: "success",
            text: `Memuat Soal No. ${item.no_soal} (${item.subtes_code}) untuk diedit. Setelah selesai, klik 'Perbarui Soal'.`
        });

        window.scrollTo({ top: 350, behavior: "smooth" });
    };

    const extractOptionAndImg = (rawOptionText: string) => {
        let text = String(rawOptionText || "").trim();
        let img = "";
        const match = text.match(/\[img:\s*([^\]]+)\]/i);
        if (match) {
            img = convertToDirectImageUrl(match[1]);
            text = text.replace(match[0], "").trim();
        } else if (/^https?:\/\//i.test(text) || text.startsWith("data:image/")) {
            img = convertToDirectImageUrl(text);
            text = "";
        }
        return { text, img };
    };

    const handleDownloadExcelTemplate = () => {
        const data = [
            {
                "No": 1,
                "Subtes": "PK",
                "Wacana / Stimulus": "Sebuah partikel bergerak di sepanjang garis lurus.",
                "Link Gambar (Opsional)": "https://lh3.googleusercontent.com/d/contoh_link_gambar",
                "Posisi Gambar": "above",
                "Pertanyaan": "Sebuah partikel bergerak dengan kecepatan $v(t) = 3t^2 + 4t$. Berapakah percepatan partikel saat $t = 2\\text{ s}$?",
                "Opsi A": "$12\\text{ m/s}^2$",
                "Opsi B": "$16\\text{ m/s}^2$",
                "Opsi C": "$20\\text{ m/s}^2$",
                "Opsi D": "$24\\text{ m/s}^2$",
                "Opsi E": "$28\\text{ m/s}^2$",
                "Kunci Jawaban": "B",
                "Tingkat Kesukaran": "Sedang",
                "Pembahasan": "Turunan pertama $a(t) = 6t + 4$. Saat $t = 2\\text{ s}$, $a(2) = 16\\text{ m/s}^2$."
            }
        ];

        const worksheet = XLSX.utils.json_to_sheet(data);
        worksheet["!cols"] = [
            { wch: 6 }, { wch: 10 }, { wch: 35 }, { wch: 30 }, { wch: 14 },
            { wch: 45 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 },
            { wch: 18 }, { wch: 14 }, { wch: 16 }, { wch: 40 }
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Bank Soal CBT");
        XLSX.writeFile(workbook, "Template_Bank_Soal_CBT_SMA_M18.xlsx");
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const dataBuffer = event.target?.result;
                if (!dataBuffer) return;

                const workbook = XLSX.read(dataBuffer, { type: "binary" });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

                if (!rows || rows.length < 2) {
                    alert("File kosong atau tidak memiliki baris data soal.");
                    return;
                }

                const headerRow = (rows[0] || []).map((h) => String(h || "").trim().toLowerCase());

                const findIdx = (keywords: string[], fallbackIdx: number) => {
                    const idx = headerRow.findIndex((h) => keywords.some((k) => h.includes(k)));
                    return idx !== -1 ? idx : fallbackIdx;
                };

                const idxNo = findIdx(["no", "nomor"], 0);
                const idxSub = findIdx(["subtes", "sub"], 1);
                const idxStimulus = findIdx(["wacana", "stimulus"], 2);
                const idxImg = findIdx(["link gambar", "image_url", "gambar"], 3);
                const idxPos = findIdx(["posisi", "image_position"], 4);
                const idxTanya = findIdx(["pertanyaan", "soal"], 5);
                const idxA = findIdx(["opsi a", "pilihan a"], 6);
                const idxB = findIdx(["opsi b", "pilihan b"], 7);
                const idxC = findIdx(["opsi c", "pilihan c"], 8);
                const idxD = findIdx(["opsi d", "pilihan d"], 9);
                const idxE = findIdx(["opsi e", "pilihan e"], 10);
                const idxKunci = findIdx(["kunci", "jawaban"], 11);
                const idxLevel = findIdx(["kesukaran", "tingkat"], 12);
                const idxBahasa = findIdx(["pembahasan", "penjelasan"], 13);

                const parsed: ParsedQuestion[] = [];

                for (let i = 1; i < rows.length; i++) {
                    const r = rows[i];
                    if (!r || r.length === 0) continue;

                    const pertanyaanText = String(r[idxTanya] || "").trim();
                    if (!pertanyaanText) continue;

                    const optAParsed = extractOptionAndImg(String(r[idxA] || ""));
                    const optBParsed = extractOptionAndImg(String(r[idxB] || ""));
                    const optCParsed = extractOptionAndImg(String(r[idxC] || ""));
                    const optDParsed = extractOptionAndImg(String(r[idxD] || ""));
                    const optEParsed = extractOptionAndImg(String(r[idxE] || ""));

                    const noSoalVal = Number(r[idxNo]) || (parsed.length + 1);
                    const subtesVal = String(r[idxSub] || selectedSubtest || "PU").trim().toUpperCase();
                    const rawKunci = String(r[idxKunci] || "A").trim().toUpperCase();
                    const kunciVal = ["A", "B", "C", "D", "E"].includes(rawKunci) ? rawKunci : "A";
                    const posVal = String(r[idxPos] || "").toLowerCase().includes("bawah") ? "below" : "above";

                    parsed.push({
                        no_soal: noSoalVal,
                        subtes_code: subtesVal,
                        stimulus: String(r[idxStimulus] || "").trim(),
                        image_url: convertToDirectImageUrl(String(r[idxImg] || "").trim()),
                        image_position: posVal,
                        pertanyaan: pertanyaanText,
                        opsi_a: optAParsed.text,
                        opsi_b: optBParsed.text,
                        opsi_c: optCParsed.text,
                        opsi_d: optDParsed.text,
                        opsi_e: optEParsed.text,
                        opsi_a_img: optAParsed.img,
                        opsi_b_img: optBParsed.img,
                        opsi_c_img: optCParsed.img,
                        opsi_d_img: optDParsed.img,
                        opsi_e_img: optEParsed.img,
                        kunci: kunciVal,
                        tingkat_kesukaran: String(r[idxLevel] || "Sedang").trim(),
                        pembahasan: String(r[idxBahasa] || "").trim(),
                        author_guru: `${loggedTeacher.nama} (${loggedTeacher.mapel || "Guru Mapel"})`
                    });
                }

                if (parsed.length > 0) {
                    setBatchQuestions(parsed);
                    setShowCsvPreview(true);
                    setStatusMsg({
                        type: "success",
                        text: `Berhasil mengimpor ${parsed.length} butir soal! Periksa isinya sebelum disimpan.`
                    });
                }
            } catch (err: any) {
                setStatusMsg({
                    type: "error",
                    text: `Terjadi kendala saat membaca file: ${err.message}`
                });
            } finally {
                if (e.target) e.target.value = "";
            }
        };

        reader.readAsBinaryString(file);
    };

    const handleBulkSubmit = async (questionsToSubmit = batchQuestions) => {
        if (questionsToSubmit.length === 0) return;

        setIsSubmitting(true);
        setStatusMsg(null);

        const payload = {
            action: "bulk_upload_questions",
            paket: selectedPaket,
            package: selectedPaket,
            questions: questionsToSubmit
        };

        try {
            await fetch(GOOGLE_SCRIPT_API_URL, {
                method: "POST",
                mode: "no-cors",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify(payload)
            });

            setStatusMsg({
                type: "success",
                text: `Sukses! Sebanyak ${questionsToSubmit.length} butir soal telah berhasil disimpan ke ${selectedPaket}!`
            });
            setBatchQuestions([]);
            setTimeout(() => {
                fetchServerQuestions(selectedPaket);
                setInputMode("list");
            }, 2500);
        } catch (err: any) {
            setStatusMsg({ type: "error", text: "Gagal menyimpan: " + (err?.message || "Kesalahan jaringan") });
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredServerQuestions = useMemo(() => {
        if (filterSubtestView === "ALL") return serverQuestions;
        return serverQuestions.filter((q) => q.subtes_code === filterSubtestView);
    }, [serverQuestions, filterSubtestView]);

    if (!isAuthorized) {
        return <div className="min-h-screen bg-slate-900" />;
    }

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
            <header className="bg-white border-b border-slate-200/90 py-3 px-4 sm:px-8 sticky top-0 z-30 shadow-2xs">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/admin"
                            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                            title="Kembali ke Dashboard Admin"
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
                                BANK SOAL &bull; SMA MUHAMMADIYAH 18
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium">
                                Penyusun Soal: <strong className="text-blue-700">{loggedTeacher.nama}</strong> ({loggedTeacher.mapel || "Guru Mapel"})
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                fetchServerQuestions(selectedPaket);
                                fetchSubtestDurations(selectedPaket);
                            }}
                            disabled={isLoadingServerQuestions}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingServerQuestions ? "animate-spin text-blue-600" : ""}`} />
                            <span className="hidden sm:inline">Refresh Data</span>
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

            <div className="max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-5">
                {/* Banner Status Database & Pemilihan Paket */}
                <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0">
                            <Database className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
                                <span>Database Cloud Spreadsheet</span>
                                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-[10px]">
                                    Online &bull; {serverQuestions.length} Butir Soal
                                </span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                                Target Aktif: <strong className="text-blue-700 font-bold">{selectedPaket.replace("_", " ")}</strong> &bull; SMA Muhammadiyah 18 Jakarta
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200 self-stretch sm:self-auto">
                        {(["PAKET_1", "PAKET_2", "PAKET_3"] as const).map((pkt) => (
                            <button
                                key={pkt}
                                type="button"
                                onClick={() => setSelectedPaket(pkt)}
                                className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${selectedPaket === pkt
                                    ? "bg-[#1e3a8a] text-white shadow-xs"
                                    : "text-slate-600 hover:text-slate-900"
                                    }`}
                            >
                                {pkt.replace("_", " ")}
                            </button>
                        ))}
                    </div>
                </div>

                {/* TOOL: EKSTRAKTOR GAMBAR GOOGLE DRIVE */}
                <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-5 sm:p-6 text-white shadow-md space-y-3">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-white/10 text-amber-300 shrink-0">
                            <Link2 className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-xs sm:text-sm font-black tracking-tight text-white flex items-center gap-2">
                                <span>Universal Image Extractor (Google Drive CDN)</span>
                                <span className="px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[9.5px] font-mono">
                                    Bypass CORS
                                </span>
                            </h3>
                            <p className="text-[11px] text-slate-300">
                                Tempelkan link share Google Drive di bawah. Sistem otomatis mengubahnya ke direct URL Google yang tampil di layar siswa.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1">
                        <div className="sm:col-span-9">
                            <input
                                type="text"
                                placeholder="Tempel link Google Drive di sini..."
                                value={testInputUrl}
                                onChange={(e) => {
                                    setTestInputUrl(e.target.value);
                                    setTestedDirectUrl(convertToDirectImageUrl(e.target.value));
                                }}
                                className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-xs font-mono text-white placeholder:text-slate-400 focus:bg-white/20 focus:border-amber-400 outline-none"
                            />
                        </div>

                        <div className="sm:col-span-3 flex gap-2">
                            <button
                                type="button"
                                onClick={() => setTestedDirectUrl(convertToDirectImageUrl(testInputUrl))}
                                className="flex-1 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-sm"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Konversi</span>
                            </button>

                            {testedDirectUrl && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        navigator.clipboard.writeText(testedDirectUrl);
                                        setIsCopied(true);
                                        setTimeout(() => setIsCopied(false), 2000);
                                    }}
                                    className="px-3 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs flex items-center justify-center cursor-pointer transition-all"
                                    title="Salin Link Hasil"
                                >
                                    {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                </button>
                            )}
                        </div>
                    </div>

                    {testedDirectUrl && (
                        <div className="p-3 bg-white/10 rounded-2xl border border-white/15 flex flex-col sm:flex-row items-center gap-3 animate-in fade-in">
                            <div className="h-20 w-28 bg-white/20 rounded-xl border border-white/20 flex items-center justify-center overflow-hidden shrink-0">
                                <img
                                    src={testedDirectUrl}
                                    alt="Hasil Ekstraksi"
                                    referrerPolicy="no-referrer"
                                    className="max-h-full max-w-full object-contain"
                                    onError={(e) => {
                                        (e.target as any).src = "https://placehold.co/120x80/red/white?text=Akses+Bukan+Publik";
                                    }}
                                />
                            </div>
                            <div className="space-y-1 text-left flex-1 min-w-0">
                                <div className="text-[10px] font-mono text-emerald-300 font-bold uppercase flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Gambar Berhasil Dikonversi &amp; Siap Dipakai</span>
                                </div>
                                <div className="text-[11px] font-mono text-slate-200 truncate bg-black/30 p-1.5 rounded-lg border border-white/10 select-all">
                                    {testedDirectUrl}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* PANEL PENGATUR DURASI WAKTU PER SUBTES */}
                <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        <div>
                            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-indigo-700" />
                                <span>Alokasi Waktu Pengerjaan per Subtes ({selectedPaket.replace("_", " ")})</span>
                            </h3>
                            <p className="text-xs text-slate-500">
                                Tentukan durasi menit pengerjaan untuk masing-masing 7 subtes. Mendukung desimal seperti <strong>0.5</strong> menit atau <strong>22.5</strong> menit.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleSaveSubtestDurations}
                            disabled={isSavingDurations}
                            className="px-5 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all disabled:opacity-50 shrink-0"
                        >
                            <Save className="w-4 h-4" />
                            <span>{isSavingDurations ? "Menyimpan ke Server..." : "Simpan Durasi Subtes"}</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                        {subtestsConfig.map((sub, idx) => (
                            <div key={sub.code} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 text-center">
                                <span className="text-[10px] font-mono font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                    {sub.code}
                                </span>
                                <div className="text-[11px] font-bold text-slate-800 truncate" title={sub.name}>
                                    {sub.name}
                                </div>
                                <div className="flex items-center justify-center gap-1">
                                    <input
                                        type="number"
                                        step="any"
                                        min={0.1}
                                        max={180}
                                        value={sub.defaultDurationMinutes}
                                        onChange={(e) => {
                                            const rawVal = e.target.value;
                                            const num = parseFloat(rawVal.replace(",", "."));
                                            setSubtestsConfig((prev) => {
                                                const updated = [...prev];
                                                updated[idx] = {
                                                    ...updated[idx],
                                                    defaultDurationMinutes: isNaN(num) ? (rawVal as any) : num
                                                };
                                                return updated;
                                            });
                                        }}
                                        className="w-18 px-2 py-1 text-center font-mono font-bold text-xs rounded-lg border border-slate-300 focus:border-indigo-600 outline-none bg-white"
                                        placeholder="0.5"
                                    />
                                    <span className="text-[10px] text-slate-500 font-medium">mnt</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tab Navigasi Mode Input Soal */}
                <div className="flex items-center gap-2 bg-slate-200/80 p-1 rounded-2xl border border-slate-300">
                    <button
                        type="button"
                        onClick={() => setInputMode("list")}
                        className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${inputMode === "list" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                            }`}
                    >
                        <ListFilter className="w-4 h-4 text-indigo-600" />
                        <span>Daftar Soal di Server ({serverQuestions.length})</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setInputMode("docx_upload")}
                        className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${inputMode === "docx_upload" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                            }`}
                    >
                        <FileText className="w-4 h-4 text-indigo-600" />
                        <span>Import Dokumen Word (.docx)</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setInputMode("csv")}
                        className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${inputMode === "csv" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                            }`}
                    >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        <span>Import Massal CSV</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setInputMode("manual")}
                        className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${inputMode === "manual" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                            }`}
                    >
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span>Input Satuan Manual</span>
                    </button>
                </div>

                {statusMsg && (
                    <div
                        className={`p-4 rounded-2xl border text-xs flex items-center gap-2.5 animate-in fade-in duration-200 ${statusMsg.type === "success"
                            ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold"
                            : "bg-rose-50 border-rose-300 text-rose-900 font-semibold"
                            }`}
                    >
                        {statusMsg.type === "success" ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <span>{statusMsg.text}</span>
                    </div>
                )}

                {/* TAB 0: DAFTAR SOAL SERVER */}
                {inputMode === "list" && (
                    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-5 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
                            <div>
                                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                                    Koleksi Soal {selectedPaket.replace("_", " ")} Terdaftar
                                </h2>
                                <p className="text-xs text-slate-500">
                                    Daftar butir soal yang saat ini aktif di spreadsheet dan akan diujikan kepada siswa.
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <select
                                    value={filterSubtestView}
                                    onChange={(e) => setFilterSubtestView(e.target.value)}
                                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold outline-none bg-white"
                                >
                                    <option value="ALL">Semua Subtes ({serverQuestions.length})</option>
                                    <option value="PU">Penalaran Umum (PU)</option>
                                    <option value="PPU">Pengetahuan &amp; Pemahaman Umum (PPU)</option>
                                    <option value="PBM">Pemahaman Bacaan &amp; Menulis (PBM)</option>
                                    <option value="PK">Pengetahuan Kuantitatif (PK)</option>
                                    <option value="LIT_INDO">Literasi Bahasa Indonesia</option>
                                    <option value="LIT_ENG">Literasi Bahasa Inggris</option>
                                    <option value="PM">Penalaran Matematika (PM)</option>
                                </select>
                            </div>
                        </div>

                        {isLoadingServerQuestions ? (
                            <div className="text-center py-12 text-slate-400 space-y-2">
                                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                                <p className="text-xs font-medium">Memuat butir soal dari spreadsheet...</p>
                            </div>
                        ) : filteredServerQuestions.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 space-y-2">
                                <p className="text-sm font-medium">Belum ada butir soal di {selectedPaket.replace("_", " ")}.</p>
                                <p className="text-xs">Gunakan tab <strong>Import Dokumen Word</strong>, <strong>Import Massal CSV</strong>, atau <strong>Input Satuan</strong> untuk menambahkan soal.</p>
                            </div>
                        ) : (
                            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                                {filteredServerQuestions.map((q, idx) => (
                                    <div key={idx} className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-left">
                                        <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                                            <div className="flex items-center gap-2">
                                                <span className="px-2 py-0.5 rounded bg-[#1e3a8a] text-white font-mono font-bold text-[10px]">
                                                    NO. {q.no_soal}
                                                </span>
                                                <span className="font-semibold text-slate-700 text-[11px] font-mono">
                                                    Subtes: {q.subtes_code}
                                                </span>
                                                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300 font-mono text-[10px] font-bold">
                                                    KUNCI: {q.kunci}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleEditQuestion(q)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-all shadow-sm active:scale-95"
                                                    title="Edit soal ini"
                                                >
                                                    <Edit3 className="w-3.5 h-3.5" />
                                                    <span>Edit</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteServerQuestion(q.no_soal, q.subtes_code || "")}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg transition-all"
                                                    title="Hapus butir soal"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {q.stimulus && (
                                            <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed italic">
                                                <MathRenderer content={q.stimulus} />
                                            </div>
                                        )}

                                        {q.image_url && (
                                            <div className="p-3 my-2 bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center">
                                                <img
                                                    src={convertToDirectImageUrl(q.image_url)}
                                                    alt={`Gambar Soal No. ${q.no_soal}`}
                                                    referrerPolicy="no-referrer"
                                                    className="max-h-64 max-w-full rounded-lg object-contain shadow-xs"
                                                />
                                                <a
                                                    href={q.image_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[10px] text-blue-600 hover:underline mt-1.5"
                                                >
                                                    Buka gambar di tab baru ↗
                                                </a>
                                            </div>
                                        )}

                                        <div className="text-xs font-semibold text-slate-900 leading-relaxed">
                                            <MathRenderer content={q.pertanyaan} />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                            {[
                                                { label: "A", text: q.opsi_a, img: q.opsi_a_img },
                                                { label: "B", text: q.opsi_b, img: q.opsi_b_img },
                                                { label: "C", text: q.opsi_c, img: q.opsi_c_img },
                                                { label: "D", text: q.opsi_d, img: q.opsi_d_img },
                                                { label: "E", text: q.opsi_e, img: q.opsi_e_img }
                                            ].map((opt) => (
                                                <div
                                                    key={opt.label}
                                                    className={`p-2 rounded-xl border text-xs flex items-center gap-2 ${String(q.kunci).trim().toUpperCase() === opt.label
                                                        ? "bg-emerald-50 border-emerald-400 font-bold text-emerald-950"
                                                        : "bg-white border-slate-200 text-slate-700"
                                                        }`}
                                                >
                                                    <span className="font-mono font-bold">{opt.label}.</span>
                                                    <span><MathRenderer content={opt.text || "-"} /></span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 1: IMPORT DOKUMEN WORD (.DOCX) */}
                {inputMode === "docx_upload" && (
                    <WordImporterSection
                        selectedSubtest={selectedSubtest}
                        selectedPaket={selectedPaket}
                        currentCount={serverQuestions.length}
                        onBulkSubmit={async (readyList) => {
                            const formatted = readyList.map((item) => ({
                                ...item,
                                author_guru: `${loggedTeacher.nama} (${loggedTeacher.mapel || "Guru Mapel"})`
                            }));
                            await handleBulkSubmit(formatted);
                        }}
                        isSubmittingServer={isSubmitting}
                    />
                )}

                {/* TAB 2: UPLOAD MASSAL FILE CSV / EXCEL */}
                {inputMode === "csv" && (
                    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                            <div>
                                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                                    Upload Massal Soal via File CSV / Excel
                                </h2>
                                <p className="text-xs text-slate-500">
                                    Mendukung formula KaTeX serta link Google Drive langsung pada kolom stimulus maupun pilihan A–E.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={handleDownloadExcelTemplate}
                                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-400 rounded-full transition-all duration-200 shadow-sm hover:shadow active:scale-95"
                            >
                                <Download className="w-4 h-4 text-emerald-700" />
                                <span>Unduh Template Lengkap (Excel .xlsx)</span>
                            </button>
                        </div>

                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-slate-300 hover:border-blue-600 hover:bg-blue-50/40 rounded-3xl p-8 text-center cursor-pointer transition-all space-y-3"
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv, .xlsx, .xls"
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center mx-auto">
                                <UploadCloud className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-800">Klik untuk Memilih File CSV atau Excel dari Komputer</p>
                                <p className="text-xs text-slate-400 mt-0.5">Mendukung format .csv atau .xlsx standar Excel dan Google Sheets</p>
                            </div>
                        </div>

                        {batchQuestions.length > 0 && (
                            <div className="space-y-4 pt-4 border-t border-slate-200">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowCsvPreview(!showCsvPreview)}
                                        className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
                                    >
                                        <Eye className="w-4 h-4 text-blue-700" />
                                        <span>Pratinjau Hasil Impor CSV ({batchQuestions.length} Soal)</span>
                                        <span className="text-[10px] bg-blue-200/70 text-blue-900 px-1.5 py-0.5 rounded font-mono">
                                            {showCsvPreview ? "Tutup ▲" : "Lihat Hasil ▼"}
                                        </span>
                                    </button>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setBatchQuestions([])}
                                            className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            <span>Bersihkan</span>
                                        </button>

                                        <button
                                            type="button"
                                            disabled={isSubmitting}
                                            onClick={() => handleBulkSubmit(batchQuestions)}
                                            className="px-5 py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-blue-900/20 cursor-pointer disabled:opacity-50"
                                        >
                                            <Send className="w-3.5 h-3.5" />
                                            <span>{isSubmitting ? "Mengunggah..." : `Simpan Semua ke ${selectedPaket}`}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 3: INPUT MANUAL SATUAN */}
                {inputMode === "manual" && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        <form
                            onSubmit={async (e) => {
                                e.preventDefault();
                                setIsSubmitting(true);
                                setStatusMsg(null);

                                const payload = {
                                    action: isEditingMode ? "edit_question" : "add_question",
                                    paket: selectedPaket,
                                    package: selectedPaket,
                                    subtes_code: selectedSubtest,
                                    no_soal: Number(noSoal),
                                    stimulus,
                                    image_url: convertToDirectImageUrl(imageUrl),
                                    image_position: imagePosition,
                                    pertanyaan,
                                    opsi_a: opsiA,
                                    opsi_b: opsiB,
                                    opsi_c: opsiC,
                                    opsi_d: opsiD,
                                    opsi_e: opsiE,
                                    opsi_a_img: convertToDirectImageUrl(opsiAImg),
                                    opsi_b_img: convertToDirectImageUrl(opsiBImg),
                                    opsi_c_img: convertToDirectImageUrl(opsiCImg),
                                    opsi_d_img: convertToDirectImageUrl(opsiDImg),
                                    opsi_e_img: convertToDirectImageUrl(opsiEImg),
                                    kunci,
                                    tingkat_kesukaran: kesukaran,
                                    pembahasan,
                                    author_guru: `${loggedTeacher.nama} (${loggedTeacher.mapel || "Guru Mapel"})`
                                };

                                try {
                                    await fetch(GOOGLE_SCRIPT_API_URL, {
                                        method: "POST",
                                        mode: "no-cors",
                                        headers: { "Content-Type": "text/plain;charset=utf-8" },
                                        body: JSON.stringify(payload)
                                    });

                                    setStatusMsg({
                                        type: "success",
                                        text: `Soal No. ${noSoal} (${selectedSubtest}) berhasil disimpan ke ${selectedPaket}!`
                                    });

                                    setNoSoal((prev) => String(Number(prev) + 1));
                                    setPertanyaan("");
                                    setImageUrl("");
                                    setOpsiA(""); setOpsiAImg("");
                                    setOpsiB(""); setOpsiBImg("");
                                    setOpsiC(""); setOpsiCImg("");
                                    setOpsiD(""); setOpsiDImg("");
                                    setOpsiE(""); setOpsiEImg("");
                                    setPembahasan("");
                                    setTimeout(() => fetchServerQuestions(selectedPaket), 2500);
                                } catch (err: any) {
                                    setStatusMsg({ type: "error", text: "Gagal menyimpan: " + (err?.message || "Kesalahan jaringan") });
                                } finally {
                                    setIsSubmitting(false);
                                }
                            }}
                            className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4 text-left"
                        >
                            <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
                                <h2 className="text-base font-black text-slate-900 tracking-tight">Formulir Butir Soal Baru</h2>
                                <span className="text-[11px] font-mono text-slate-400">Penyusun: {loggedTeacher.nama}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700 font-mono">SUBTES:</label>
                                    <select
                                        value={selectedSubtest}
                                        onChange={(e) => setSelectedSubtest(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:border-blue-600 outline-none bg-white"
                                    >
                                        <option value="PU">Penalaran Umum (PU)</option>
                                        <option value="PPU">Pengetahuan &amp; Pemahaman Umum (PPU)</option>
                                        <option value="PBM">Pemahaman Bacaan &amp; Menulis (PBM)</option>
                                        <option value="PK">Pengetahuan Kuantitatif (PK)</option>
                                        <option value="LIT_INDO">Literasi Bahasa Indonesia</option>
                                        <option value="LIT_ENG">Literasi Bahasa Inggris</option>
                                        <option value="PM">Penalaran Matematika (PM)</option>
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700 font-mono">NO SOAL:</label>
                                    <input
                                        type="number"
                                        required
                                        min={1}
                                        value={noSoal}
                                        onChange={(e) => setNoSoal(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold font-mono focus:border-blue-600 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700 font-mono">WACANA / STIMULUS (OPSIONAL):</label>
                                <textarea
                                    rows={2}
                                    value={stimulus}
                                    onChange={(e) => setStimulus(e.target.value)}
                                    placeholder="Wacana atau stimulus bacaan..."
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-blue-600 outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                                <div className="sm:col-span-8 space-y-1">
                                    <label className="text-xs font-bold text-slate-700 font-mono flex items-center gap-1.5">
                                        <ImageIcon className="w-3.5 h-3.5 text-blue-700" />
                                        <span>LINK GAMBAR SOAL:</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Tempel link Google Drive di sini..."
                                        value={imageUrl}
                                        onChange={(e) => setImageUrl(convertToDirectImageUrl(e.target.value))}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:border-blue-600 outline-none"
                                    />
                                </div>

                                <div className="sm:col-span-4 space-y-1">
                                    <label className="text-xs font-bold text-slate-700 font-mono">POSISI GAMBAR:</label>
                                    <select
                                        value={imagePosition}
                                        onChange={(e: any) => setImagePosition(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:border-blue-600 outline-none"
                                    >
                                        <option value="above">Di Atas Pertanyaan</option>
                                        <option value="below">Di Bawah Pertanyaan</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700 font-mono">PERTANYAAN UTAMA:</label>
                                <textarea
                                    rows={3}
                                    required
                                    value={pertanyaan}
                                    onChange={(e) => setPertanyaan(e.target.value)}
                                    placeholder="Tuliskan pertanyaan di sini..."
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:border-blue-600 outline-none"
                                />
                            </div>

                            <div className="space-y-2.5 pt-1">
                                <label className="text-xs font-bold text-slate-700 font-mono">PILIHAN GANDA A - E:</label>
                                {[
                                    { label: "A", val: opsiA, setVal: setOpsiA, imgVal: opsiAImg, setImgVal: setOpsiAImg },
                                    { label: "B", val: opsiB, setVal: setOpsiB, imgVal: opsiBImg, setImgVal: setOpsiBImg },
                                    { label: "C", val: opsiC, setVal: setOpsiC, imgVal: opsiCImg, setImgVal: setOpsiCImg },
                                    { label: "D", val: opsiD, setVal: setOpsiD, imgVal: opsiDImg, setImgVal: setOpsiDImg },
                                    { label: "E", val: opsiE, setVal: setOpsiE, imgVal: opsiEImg, setImgVal: setOpsiEImg }
                                ].map((opt) => (
                                    <div key={opt.label} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                                        <div className="flex items-center gap-2">
                                            <span className="w-6 h-6 rounded bg-white border border-slate-300 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                                                {opt.label}
                                            </span>
                                            <input
                                                type="text"
                                                value={opt.val}
                                                onChange={(e) => opt.setVal(e.target.value)}
                                                placeholder={`Teks pilihan ${opt.label}...`}
                                                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white focus:border-blue-600 outline-none"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-1">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700 font-mono">KUNCI JAWABAN:</label>
                                    <select
                                        value={kunci}
                                        onChange={(e) => setKunci(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-emerald-300 text-xs font-black font-mono bg-emerald-50 text-emerald-950"
                                    >
                                        {["A", "B", "C", "D", "E"].map((k) => (
                                            <option key={k} value={k}>OPSI {k}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700 font-mono">TINGKAT KESUKARAN:</label>
                                    <select
                                        value={kesukaran}
                                        onChange={(e) => setKesukaran(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white"
                                    >
                                        <option value="Mudah">Mudah</option>
                                        <option value="Sedang">Sedang</option>
                                        <option value="Sulit">Sulit</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-3 rounded-2xl bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                            >
                                <Send className="w-4 h-4" />
                                <span>
                                    {isSubmitting
                                        ? "Menyimpan ke Server..."
                                        : isEditingMode
                                            ? `Perbarui Soal No. ${noSoal} di ${selectedPaket}`
                                            : `Simpan Soal Baru ke ${selectedPaket}`}
                                </span>
                            </button>
                        </form>

                        {/* LIVE CARD PREVIEW SISWA */}
                        <div className="lg:col-span-5 bg-white rounded-3xl border-2 border-blue-200 p-5 shadow-lg space-y-4 text-left sticky top-20">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                                <div className="flex items-center gap-2 text-xs font-black text-blue-900">
                                    <Eye className="w-4 h-4 text-blue-700" />
                                    <span>Tampilan Nyata di Layar Siswa</span>
                                </div>
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                    Kunci: {kunci}
                                </span>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pb-1.5 border-b border-slate-200">
                                    <span className="font-bold text-blue-700">SOAL NO. {noSoal || "1"}</span>
                                    <span>{selectedSubtest}</span>
                                </div>

                                {stimulus && (
                                    <div className="p-2.5 bg-white rounded-lg border text-[11px] text-slate-600 italic leading-relaxed">
                                        <MathRenderer content={stimulus} />
                                    </div>
                                )}

                                {imageUrl && imagePosition === "above" && (
                                    <div className="p-2 bg-white rounded-xl border border-slate-200 flex justify-center">
                                        <img
                                            src={imageUrl}
                                            alt="Gambar Soal (Atas)"
                                            referrerPolicy="no-referrer"
                                            className="max-h-48 rounded object-contain"
                                            onError={(e) => { (e.target as any).style.display = "none"; }}
                                        />
                                    </div>
                                )}

                                <div className="text-xs font-semibold text-slate-900 leading-snug">
                                    <MathRenderer content={pertanyaan || "Pertanyaan Anda akan muncul di sini secara visual..."} />
                                </div>

                                {imageUrl && imagePosition === "below" && (
                                    <div className="p-2 bg-white rounded-xl border border-slate-200 flex justify-center">
                                        <img
                                            src={imageUrl}
                                            alt="Gambar Soal (Bawah)"
                                            referrerPolicy="no-referrer"
                                            className="max-h-48 rounded object-contain"
                                            onError={(e) => { (e.target as any).style.display = "none"; }}
                                        />
                                    </div>
                                )}

                                <div className="space-y-1.5 pt-1">
                                    {[
                                        { label: "A", text: opsiA, img: opsiAImg },
                                        { label: "B", text: opsiB, img: opsiBImg },
                                        { label: "C", text: opsiC, img: opsiCImg },
                                        { label: "D", text: opsiD, img: opsiDImg },
                                        { label: "E", text: opsiE, img: opsiEImg }
                                    ].map((opt) => (
                                        <div
                                            key={opt.label}
                                            className={`p-2 rounded-xl border text-xs flex items-center justify-between gap-2 ${String(kunci).trim().toUpperCase() === opt.label
                                                ? "bg-emerald-50 border-emerald-400 font-semibold text-emerald-950"
                                                : "bg-white border-slate-200 text-slate-700"
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center font-mono font-bold text-[10px] shrink-0 border border-slate-200">
                                                    {opt.label}
                                                </span>
                                                <span className="text-[11px] leading-tight">
                                                    <MathRenderer content={opt.text || `(Pilihan ${opt.label})`} />
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}