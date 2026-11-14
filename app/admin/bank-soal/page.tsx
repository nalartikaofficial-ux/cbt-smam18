"use client";
/* eslint-disable @next/next/no-img-element */
// @ts-nocheck

import * as XLSX from "xlsx";
import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Database,
    ChevronLeft,
    Send,
    FileSpreadsheet,
    FileText,
    UploadCloud,
    Download,
    CheckCircle2,
    AlertCircle,
    Eye,
    Trash2,
    RefreshCw,
    Home,
    ListFilter
} from "lucide-react";

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

// STRUKTUR RESMI 7 SUBTES SNBT (TOTAL 160 BUTIR SOAL)
const SNBT_STRUCTURE = [
    { code: "PU", name: "Penalaran Umum (PU)", count: 30 },
    { code: "PPU", name: "Pengetahuan & Pemahaman", count: 20 },
    { code: "PBM", name: "Pemahaman Bacaan & Menulis", count: 20 },
    { code: "PK", name: "Pengetahuan Kuantitatif", count: 20 },
    { code: "LIT_INDO", name: "Literasi B. Indonesia", count: 30 },
    { code: "LIT_ENG", name: "Literasi Bahasa Inggris", count: 20 },
    { code: "PM", name: "Penalaran Matematika", count: 20 }
];

// ========================================================
// MESIN IMPORT WORD DENGAN TEMPLATE BAKU & ANTI-TUMPANG TINDIH
// ========================================================
function WordImporterSection({
    selectedPaket,
    onBulkSubmit,
    isSubmittingServer
}: {
    selectedPaket: string;
    onBulkSubmit: (questions: ParsedQuestion[]) => Promise<void>;
    isSubmittingServer: boolean;
}) {
    const [isParsing, setIsParsing] = useState(false);
    const [stagedList, setStagedList] = useState<ParsedQuestion[]>([]);

    const handleDownloadWordTemplate = () => {
        const wordHtmlContent = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
    <meta charset="utf-8">
    <title>Template Soal Word CBT SMA M18</title>
    <!--[if gte mso 9]>
    <xml>
        <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
    </xml>
    <![endif]-->
    <style>
        body { font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #1e293b; margin: 20mm; }
        .header { text-align: center; font-weight: bold; font-size: 13pt; margin-bottom: 16px; border-bottom: 2px solid #0f172a; padding-bottom: 8px; }
        .tag { font-family: 'Consolas', 'Courier New', monospace; font-weight: bold; color: #4338ca; }
        .box { background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 10px; margin: 8px 0; border-radius: 4px; }
        p { margin: 4px 0; }
    </style>
</head>
<body>
    <div class="header">
        NASKAH RESMI SIMULASI CBT UTBK-SNBT 2026<br/>
        SMA MUHAMMADIYAH 18 JAKARTA
    </div>

    <p><span class="tag">=== SUBTES: PU ===</span></p>

    <p><span class="tag">[WACANA]</span></p>
    <div class="box">
        Penelitian terbaru di bidang neurobiologi menunjukkan bahwa paparan cahaya biru (blue light) dari layar gawai pada malam hari menekan sekresi melatonin oleh kelenjar pineal, memicu desinkronisasi ritme sirkadian. Gangguan kronis ini terbukti meningkatkan risiko resistensi insulin dan penurunan fungsi konsolidasi memori di hipokampus. Para peneliti menyimpulkan bahwa membatasi penggunaan gawai dua jam sebelum tidur dapat menjaga keteraturan ritme biologis tubuh.
    </div>
    <p><span class="tag">[/WACANA]</span></p>

    <p><span class="tag">[SOAL: 1]</span></p>
    <p>Berdasarkan teks di atas, manakah simpulan yang PALING DIDUKUNG oleh bacaan?</p>
    <p>A. Penurunan fungsi memori hanya dialami individu yang menatap gawai lebih dari dua jam.</p>
    <p>B. Menjaga stabilitas sekresi melatonin berkontribusi pada penurunan risiko resistensi insulin.</p>
    <p>C. Filter spektrum kuning mampu menghentikan seluruh dampak negatif gawai secara permanen.</p>
    <p>D. Fase tidur gelombang lambat tidak dipengaruhi oleh fungsi kelenjar pineal.</p>
    <p>E. Paparan cahaya gawai terbukti aman bagi sinkronisasi ritme sirkadian.</p>
    <p><span class="tag">[KUNCI: B]</span></p>
    <p><span class="tag">[PEMBAHASAN]</span></p>
    <p>Cahaya biru menekan sekresi hormon melatonin yang memicu gangguan ritme sirkadian dan resistensi insulin. Maka menjaga stabilitas sekresi melatonin berkontribusi menurunkan risiko tersebut.</p>
    <p><span class="tag">[/PEMBAHASAN]</span></p>

    <br/>

    <p><span class="tag">=== SUBTES: PPU ===</span></p>

    <p><span class="tag">[SOAL: 1]</span></p>
    <p>Tuliskan pertanyaan nomor 1 untuk subtes Pengetahuan & Pemahaman Umum di sini...</p>
    <p>A. Opsi A</p>
    <p>B. Opsi B</p>
    <p>C. Opsi C</p>
    <p>D. Opsi D</p>
    <p>E. Opsi E</p>
    <p><span class="tag">[KUNCI: A]</span></p>
    <p><span class="tag">[PEMBAHASAN]</span></p>
    <p>Tuliskan pembahasan di sini.</p>
    <p><span class="tag">[/PEMBAHASAN]</span></p>
</body>
</html>`;

        const blob = new Blob(['\ufeff' + wordHtmlContent], {
            type: 'application/msword;charset=utf-8'
        });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `Template_Soal_Word_${selectedPaket}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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

            const blocks: { text: string; imgUrl: string }[] = [];
            const leafNodes = doc.body.querySelectorAll("p, td, li, h1, h2, h3, h4");
            leafNodes.forEach((node) => {
                if (node.tagName.toLowerCase() === "td" && node.querySelector("p")) return;
                const img = node.querySelector("img");
                const imgSrc = img ? img.getAttribute("src") || "" : "";
                const text = (node.textContent || "").replace(/\u00A0/g, " ").trim();
                if (text || imgSrc) {
                    blocks.push({ text, imgUrl: imgSrc });
                }
            });

            const rawQuestions: any[] = [];
            let inWacanaBlock = false;
            let inPembahasanBlock = false;
            let pendingStimulus = "";
            let currentImage = "";
            let currentSubtestContext = "PU";
            let hasExplicitSubtestTag = false;
            let current: any = null;

            const commitCurrent = () => {
                if (current && current.pertanyaan && current.opsi_a) {
                    rawQuestions.push({ ...current });
                }
                current = null;
            };

            blocks.forEach((block) => {
                const { text, imgUrl } = block;

                if (imgUrl) currentImage = imgUrl;
                if (!text) return;

                // 1. Tangkap Tag Subtes [SUBTES: PK] atau === SUBTES: PK ===
                const subtestMatch = text.match(/SUBTES:\s*([A-Za-z_]+)/i);
                if (subtestMatch) {
                    commitCurrent();
                    currentSubtestContext = subtestMatch[1].toUpperCase();
                    hasExplicitSubtestTag = true;
                    pendingStimulus = "";
                    return;
                }

                // 2. Tangkap Blok Wacana [WACANA] ... [/WACANA]
                if (/\[WACANA\]/i.test(text)) {
                    inWacanaBlock = true;
                    const clean = text.replace(/\[WACANA\]/i, "").trim();
                    if (clean) pendingStimulus = clean;
                    return;
                }
                if (/\[\/WACANA\]/i.test(text)) {
                    inWacanaBlock = false;
                    const clean = text.replace(/\[\/WACANA\]/i, "").trim();
                    if (clean) pendingStimulus = pendingStimulus ? `${pendingStimulus}\n${clean}` : clean;
                    return;
                }
                if (inWacanaBlock) {
                    pendingStimulus = pendingStimulus ? `${pendingStimulus}\n${text}` : text;
                    return;
                }

                // 3. Tangkap Tag Soal [SOAL: 1] atau nomor standar 1. / Soal 1.
                const tagSoalMatch = text.match(/\[SOAL:\s*(\d+)\]\s*(.*)$/i);
                const explicitQ = text.match(/^(?:soal|nomor|no\.?)\s*(\d+)[\.\:\)]?\s*(.*)$/i);
                const numericQ = text.match(/^(\d+)[\.\)\uff0e]\s*(.*)$/i);

                const isOptionPattern = /^[a-e][\.\)\uff0e]/i.test(text);
                const isKeyPattern = /(?:\[KUNCI:\s*[A-E]\]|kunci(?:\s*jawaban)?\s*[:=]\s*[A-E])/i.test(text);

                let isNewQuestion = false;
                let qText = "";

                if (!isOptionPattern && !isKeyPattern) {
                    if (tagSoalMatch) {
                        isNewQuestion = true;
                        qText = tagSoalMatch[2].trim();
                    } else if (explicitQ) {
                        isNewQuestion = true;
                        qText = explicitQ[2].trim();
                    } else if (numericQ) {
                        isNewQuestion = true;
                        qText = numericQ[2].trim();
                    }
                }

                if (isNewQuestion) {
                    commitCurrent();
                    current = {
                        subtes_code: currentSubtestContext,
                        stimulus: pendingStimulus.trim(),
                        image_url: currentImage,
                        image_position: "above",
                        pertanyaan: qText || "Pertanyaan",
                        opsi_a: "",
                        opsi_b: "",
                        opsi_c: "",
                        opsi_d: "",
                        opsi_e: "",
                        kunci: "A",
                        tingkat_kesukaran: "Sedang",
                        pembahasan: ""
                    };
                    pendingStimulus = "";
                    currentImage = "";
                    return;
                }

                if (!current) return;

                // 4. Tangkap Opsi A - E
                const singleOptMatch = text.match(/^([a-e])[\.\)\uff0e]\s*(.*)$/i);
                if (singleOptMatch) {
                    const letter = singleOptMatch[1].toLowerCase();
                    current[`opsi_${letter}`] = singleOptMatch[2].trim();
                    return;
                }

                const inlineMatches = Array.from(text.matchAll(/(?:^|\s+)([a-e])[\.\)\uff0e]\s+/gi));
                if (inlineMatches.length >= 2) {
                    for (let i = 0; i < inlineMatches.length; i++) {
                        const letter = inlineMatches[i][1].toLowerCase();
                        const start = inlineMatches[i].index! + inlineMatches[i][0].length;
                        const end = (i + 1 < inlineMatches.length) ? inlineMatches[i + 1].index! : text.length;
                        current[`opsi_${letter}`] = text.substring(start, end).trim();
                    }
                    return;
                }

                // 5. Tangkap Kunci Jawaban [KUNCI: B]
                const keyTagMatch = text.match(/\[KUNCI:\s*([A-E])\]/i) || text.match(/(?:kunci(?:\s*jawaban)?|jawaban)\s*[:=]\s*([a-e])/i);
                if (keyTagMatch) {
                    current.kunci = keyTagMatch[1].toUpperCase();
                    return;
                }

                // 6. Tangkap Pembahasan [PEMBAHASAN] ... [/PEMBAHASAN]
                if (/\[PEMBAHASAN\]/i.test(text)) {
                    inPembahasanBlock = true;
                    const clean = text.replace(/\[PEMBAHASAN\]/i, "").trim();
                    if (clean) current.pembahasan = clean;
                    return;
                }
                if (/\[\/PEMBAHASAN\]/i.test(text)) {
                    inPembahasanBlock = false;
                    const clean = text.replace(/\[\/PEMBAHASAN\]/i, "").trim();
                    if (clean) current.pembahasan = current.pembahasan ? `${current.pembahasan}\n${clean}` : clean;
                    return;
                }
                if (inPembahasanBlock) {
                    current.pembahasan = current.pembahasan ? `${current.pembahasan}\n${text}` : text;
                    return;
                }

                if (!current.opsi_a) {
                    current.pertanyaan = current.pertanyaan ? `${current.pertanyaan}\n${text}` : text;
                }
            });

            commitCurrent();

            if (rawQuestions.length === 0) {
                alert("Tidak ada butir soal yang terbaca. Pastikan dokumen memakai format [SOAL: X] atau penomoran 1 s.d. 30!");
                return;
            }

            // Jika file Word memiliki tag SUBTES eksplisit, hormati kode subtes masing-masing agar bisa upload per-subtes tanpa tumpang tindih
            const getSubtestMetaByQuota = (idx: number) => {
                let accumulated = 0;
                for (const sub of SNBT_STRUCTURE) {
                    if (idx < accumulated + sub.count) {
                        return { subtes: sub.code, localNo: (idx - accumulated) + 1 };
                    }
                    accumulated += sub.count;
                }
                return { subtes: "PM", localNo: 20 };
            };

            const subtestCounters: Record<string, number> = {};
            const finalized: ParsedQuestion[] = rawQuestions.map((q, idx) => {
                let subCode = (q.subtes_code || "PU").toUpperCase();
                let localNo = 1;

                if (hasExplicitSubtestTag) {
                    subtestCounters[subCode] = (subtestCounters[subCode] || 0) + 1;
                    localNo = subtestCounters[subCode];
                } else {
                    const meta = getSubtestMetaByQuota(idx);
                    subCode = meta.subtes;
                    localNo = meta.localNo;
                }

                return {
                    no_soal: localNo,
                    subtes_code: subCode,
                    stimulus: q.stimulus || "",
                    image_url: q.image_url || "",
                    image_position: q.image_position || "above",
                    pertanyaan: q.pertanyaan,
                    opsi_a: q.opsi_a,
                    opsi_b: q.opsi_b,
                    opsi_c: q.opsi_c,
                    opsi_d: q.opsi_d,
                    opsi_e: q.opsi_e,
                    kunci: q.kunci,
                    tingkat_kesukaran: q.tingkat_kesukaran || "Sedang",
                    pembahasan: q.pembahasan || ""
                };
            });

            setStagedList(finalized);
        } catch (err: any) {
            console.error(err);
            alert("Gagal membaca file .docx: " + (err?.message || "Format berkas tidak valid"));
        } finally {
            setIsParsing(false);
            e.target.value = "";
        }
    };

    return (
        <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 shadow-sm text-left">
            <div className="border-b border-slate-100 pb-3.5 sm:pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                        Import Naskah Word (.docx) Otomatis
                    </h2>
                    <p className="text-[11px] sm:text-xs text-slate-500">
                        Mendukung upload penuh 7 subtes maupun parsial per subtes (<code className="text-indigo-600 font-bold font-mono">=== SUBTES: PK ===</code>) tanpa menimpa subtes lain.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={handleDownloadWordTemplate}
                    className="inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
                >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh Panduan Template Word</span>
                </button>
            </div>

            <div className="border-2 border-dashed border-indigo-300 hover:border-indigo-600 bg-indigo-50/20 hover:bg-indigo-50/40 rounded-3xl p-6 sm:p-8 text-center transition-all">
                <input
                    type="file"
                    id="docx-file-input"
                    accept=".docx"
                    onChange={handleDocxUpload}
                    disabled={isParsing || isSubmittingServer}
                    className="hidden"
                />
                <label htmlFor="docx-file-input" className="cursor-pointer flex flex-col items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-xs">
                        <UploadCloud className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs sm:text-sm font-bold text-slate-800">
                            {isParsing ? "Sedang Mengurai Naskah Word..." : "Klik untuk Memilih File Dokumen Word (.docx)"}
                        </p>
                        <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                            Target Paket: <strong>{selectedPaket.replace("_", " ")}</strong>
                        </p>
                    </div>
                </label>
            </div>

            {stagedList.length > 0 && (
                <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 shadow-md">
                    <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-xs font-mono">
                                {stagedList.length} Soal Berhasil Dipisahkan
                            </span>
                            <span className="text-xs text-slate-300">
                                Subtes: <strong>{Array.from(new Set(stagedList.map((q) => q.subtes_code))).join(", ")}</strong> → {selectedPaket.replace("_", " ")}
                            </span>
                        </div>
                        <p className="text-[10.5px] sm:text-[11px] text-slate-400">
                            Akan digabungkan otomatis ke {selectedPaket.replace("_", " ")} tanpa menghapus subtes lain yang sudah ada.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-end">
                        <button
                            type="button"
                            onClick={() => setStagedList([])}
                            disabled={isSubmittingServer}
                            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs cursor-pointer"
                        >
                            Batalkan
                        </button>

                        <button
                            type="button"
                            onClick={async () => {
                                await onBulkSubmit(stagedList);
                                setStagedList([]);
                            }}
                            disabled={isSubmittingServer}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                        >
                            <Send className="w-3.5 h-3.5" />
                            <span>Gabungkan & Terapkan</span>
                        </button>
                    </div>
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
                    router.replace("/admin");
                }
            } catch {
                router.replace("/admin");
            }
        }
    }, [router]);

    const [selectedPaket, setSelectedPaket] = useState<"PAKET_1" | "PAKET_2" | "PAKET_3">("PAKET_1");
    const [inputMode, setInputMode] = useState<"list" | "docx_upload" | "csv">("list");

    const [serverQuestions, setServerQuestions] = useState<ParsedQuestion[]>([]);
    const [isLoadingServerQuestions, setIsLoadingServerQuestions] = useState(false);
    const [filterSubtestView, setFilterSubtestView] = useState("ALL");

    const [subtestsConfig, setSubtestsConfig] = useState<SubtestDurationItem[]>([
        { code: "PU", name: "Penalaran Umum (PU)", defaultDurationMinutes: 30 },
        { code: "PPU", name: "Pengetahuan & Pemahaman", defaultDurationMinutes: 15 },
        { code: "PBM", name: "Pemahaman Bacaan & Menulis", defaultDurationMinutes: 25 },
        { code: "PK", name: "Pengetahuan Kuantitatif", defaultDurationMinutes: 20 },
        { code: "LIT_INDO", name: "Literasi B. Indonesia", defaultDurationMinutes: 42.5 },
        { code: "LIT_ENG", name: "Literasi Bahasa Inggris", defaultDurationMinutes: 20 },
        { code: "PM", name: "Penalaran Matematika", defaultDurationMinutes: 42.5 }
    ]);

    const [showCsvPreview, setShowCsvPreview] = useState(true);
    const [batchQuestions, setBatchQuestions] = useState<ParsedQuestion[]>([]);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const fetchSubtestDurations = async (pkg = selectedPaket) => {
        try {
            const raw = localStorage.getItem(`durasi_${pkg}`);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setSubtestsConfig(parsed);
                }
            }
        } catch { }
    };

    const fetchServerQuestions = async (pkg = selectedPaket) => {
        setIsLoadingServerQuestions(true);
        try {
            const res = await fetch(`/api/questions?paket=${pkg}&_t=${Date.now()}`, { cache: "no-store" });
            const json = await res.json();
            if (json.status === "success" && Array.isArray(json.data)) {
                setServerQuestions(json.data);
            } else {
                setServerQuestions([]);
            }
        } catch (err) {
            console.error("Gagal memuat soal:", err);
            setServerQuestions([]);
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

        const updated = serverQuestions.filter((q) => !(Number(q.no_soal) === no && q.subtes_code === sub));
        setServerQuestions(updated);
        localStorage.setItem(`cbt_questions_${selectedPaket}`, JSON.stringify(updated));

        fetch("/api/questions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "delete_question",
                paket: selectedPaket,
                no_soal: no,
                subtes_code: sub
            })
        }).catch(() => { });

        setStatusMsg({ type: "success", text: `Soal No. ${no} (${sub}) berhasil dihapus!` });
    };

    const handleClearAllQuestions = async () => {
        const konfirmasi = confirm(
            `PERINGATAN!\nApakah Anda yakin ingin MENGHAPUS SEMUA SOAL di ${selectedPaket.replace("_", " ")}?`
        );
        if (!konfirmasi) return;

        setIsLoadingServerQuestions(true);
        try {
            localStorage.removeItem(`cbt_questions_${selectedPaket}`);
            setServerQuestions([]);

            fetch("/api/questions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "clear_all_questions", paket: selectedPaket })
            }).catch(() => { });

            setStatusMsg({
                type: "success",
                text: `Seluruh soal di ${selectedPaket.replace("_", " ")} berhasil dikosongkan.`
            });
        } catch (err: any) {
            setStatusMsg({ type: "error", text: "Gagal mengosongkan soal: " + err.message });
        } finally {
            setIsLoadingServerQuestions(false);
        }
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
                    const subtesVal = String(r[idxSub] || "PU").trim().toUpperCase();
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
                        text: `Berhasil mengimpor ${parsed.length} butir soal! Periksa isinya sebelum digabungkan.`
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

    // GABUNGKAN (MERGE) SOAL BARU KE PAKET AKTIF TANPA MERUSAK SUBTES LAIN YANG SUDAH ADA
    const handleBulkSubmit = async (questionsToSubmit: ParsedQuestion[]) => {
        if (!questionsToSubmit || questionsToSubmit.length === 0) return;

        setIsSubmitting(true);
        setStatusMsg(null);

        try {
            // Identifikasi kode subtes yang baru saja diunggah (bisa 1 subtes atau 7 subtes sekaligus)
            const incomingSubtests = new Set(
                questionsToSubmit.map((q) => (q.subtes_code || "PU").toUpperCase())
            );

            // Pertahankan butir soal dari subtes LAIN yang sudah tersimpan sebelumnya agar tidak hilang
            const preservedFromOtherSubtests = serverQuestions.filter(
                (existing) => !incomingSubtests.has((existing.subtes_code || "").toUpperCase())
            );

            // Urutan standar 7 subtes SNBT
            const subtestOrder: Record<string, number> = {
                PU: 1,
                PPU: 2,
                PBM: 3,
                PK: 4,
                LIT_INDO: 5,
                LIT_ENG: 6,
                PM: 7
            };

            const mergedQuestions = [...preservedFromOtherSubtests, ...questionsToSubmit].sort((a, b) => {
                const orderA = subtestOrder[(a.subtes_code || "").toUpperCase()] || 99;
                const orderB = subtestOrder[(b.subtes_code || "").toUpperCase()] || 99;
                if (orderA !== orderB) return orderA - orderB;
                return Number(a.no_soal) - Number(b.no_soal);
            });

            localStorage.setItem(`cbt_questions_${selectedPaket}`, JSON.stringify(mergedQuestions));
            setServerQuestions(mergedQuestions);
            setBatchQuestions([]);

            await fetch("/api/questions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "bulk_upload_questions",
                    paket: selectedPaket,
                    questions: mergedQuestions
                })
            }).catch(() => { });

            setStatusMsg({
                type: "success",
                text: `Sukses! ${questionsToSubmit.length} soal baru digabungkan ke ${selectedPaket.replace("_", " ")} (Total sekarang: ${mergedQuestions.length} butir soal).`
            });

            setTimeout(() => setInputMode("list"), 500);
        } catch (err: any) {
            setStatusMsg({ type: "error", text: "Kendala saat menyimpan: " + err.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const subtestCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        SNBT_STRUCTURE.forEach((s) => { counts[s.code] = 0; });
        serverQuestions.forEach((q) => {
            if (counts[q.subtes_code] !== undefined) counts[q.subtes_code]++;
        });
        return counts;
    }, [serverQuestions]);

    const filteredServerQuestions = useMemo(() => {
        if (filterSubtestView === "ALL") return serverQuestions;
        return serverQuestions.filter((q) => q.subtes_code === filterSubtestView);
    }, [serverQuestions, filterSubtestView]);

    if (!isAuthorized) return <div className="min-h-screen bg-slate-900" />;

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
            <header className="bg-white border-b border-slate-200/90 py-3 px-3.5 sm:px-8 sticky top-0 z-30 shadow-2xs">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 w-full sm:w-auto">
                        <Link href="/admin" className="p-1.5 sm:p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 shrink-0">
                            <ChevronLeft className="w-4 h-4" />
                        </Link>
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white border border-slate-200 p-0.5 flex items-center justify-center overflow-hidden shrink-0">
                            <img src="/logo-timsim.jpg" alt="Logo SMA Muhammadiyah 18" className="w-full h-full object-contain" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-xs sm:text-sm font-black text-slate-900 uppercase truncate">
                                BANK SOAL • SMA MUHAMMADIYAH 18
                            </div>
                            <div className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate">
                                Penyusun Soal: <strong className="text-blue-700">{loggedTeacher.nama}</strong> ({loggedTeacher.mapel || "Guru Mapel"})
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
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
                        <Link href="/" className="p-1.5 sm:p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600">
                            <Home className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </header>

            <div className="max-w-6xl w-full mx-auto p-3.5 sm:p-6 space-y-4 sm:space-y-5 text-left">
                {/* Banner Status Database & Pemilihan Paket */}
                <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                            <Database className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2 flex-wrap">
                                <span className="truncate">Penyimpanan Lokal Edge JSON (7 Subtes SNBT)</span>
                                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-[10px] shrink-0">
                                    Aktif • {serverQuestions.length} Butir Soal
                                </span>
                            </div>
                            <div className="text-[10.5px] sm:text-[11px] text-slate-500 mt-0.5 truncate">
                                Target Aktif: <strong className="text-blue-700 font-bold">{selectedPaket.replace("_", " ")}</strong> • Respon Cepat (50ms)
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 w-full sm:w-auto shrink-0">
                        {(["PAKET_1", "PAKET_2", "PAKET_3"] as const).map((pkt) => (
                            <button
                                key={pkt}
                                type="button"
                                onClick={() => setSelectedPaket(pkt)}
                                className={`flex-1 sm:flex-none px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${selectedPaket === pkt
                                    ? "bg-[#1e3a8a] text-white shadow-xs"
                                    : "text-slate-600 hover:text-slate-900"
                                    }`}
                            >
                                {pkt.replace("_", " ")}
                            </button>
                        ))}
                    </div>
                </div>

                {/* KARTU STATISTIK 7 SUBTES SNBT */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                    {SNBT_STRUCTURE.map((s) => {
                        const count = subtestCounts[s.code] || 0;
                        const isComplete = count >= s.count;
                        return (
                            <div
                                key={s.code}
                                onClick={() => {
                                    setFilterSubtestView(s.code);
                                    setInputMode("list");
                                }}
                                className={`p-2.5 sm:p-3 rounded-2xl border cursor-pointer transition-all text-center ${filterSubtestView === s.code
                                    ? "bg-blue-900 text-white border-blue-900 shadow-sm"
                                    : "bg-white hover:bg-slate-50 border-slate-200 text-slate-800"
                                    }`}
                            >
                                <span className={`text-[9.5px] sm:text-[10px] font-mono font-bold px-1.5 sm:px-2 py-0.2 rounded ${filterSubtestView === s.code
                                    ? "bg-white/20 text-white"
                                    : "bg-indigo-50 text-indigo-800 border border-indigo-200"
                                    }`}>
                                    {s.code}
                                </span>
                                <div className="text-[10.5px] sm:text-[11px] font-bold mt-1 truncate" title={s.name}>
                                    {s.name}
                                </div>
                                <div className="text-[10.5px] sm:text-[11px] font-mono mt-0.5 font-bold">
                                    <span className={filterSubtestView === s.code ? "text-emerald-300" : isComplete ? "text-emerald-600" : "text-amber-600"}>
                                        {count}
                                    </span>
                                    <span className={filterSubtestView === s.code ? "text-slate-300" : "text-slate-400"}> / {s.count}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Tab Navigasi Mode Input Soal */}
                <div className="flex flex-col sm:flex-row items-center gap-1.5 bg-slate-200/80 p-1 rounded-2xl border border-slate-300">
                    <button
                        type="button"
                        onClick={() => setInputMode("list")}
                        className={`w-full sm:flex-1 py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${inputMode === "list" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                    >
                        <ListFilter className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span className="truncate">Koleksi Soal ({serverQuestions.length})</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setInputMode("docx_upload")}
                        className={`w-full sm:flex-1 py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${inputMode === "docx_upload" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                    >
                        <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span className="truncate">Import Naskah Word (.docx)</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setInputMode("csv")}
                        className={`w-full sm:flex-1 py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${inputMode === "csv" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                    >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">Import Massal CSV / Excel</span>
                    </button>
                </div>

                {statusMsg && (
                    <div className={`p-3.5 rounded-2xl border text-xs flex items-center gap-2.5 ${statusMsg.type === "success" ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold" : "bg-rose-50 border-rose-300 text-rose-900 font-semibold"}`}>
                        {statusMsg.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                        <span className="leading-relaxed">{statusMsg.text}</span>
                    </div>
                )}

                {/* TAB 0: DAFTAR SOAL BERKAS */}
                {inputMode === "list" && (
                    <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-5 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
                            <div className="min-w-0">
                                <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight truncate">
                                    Koleksi Soal {selectedPaket.replace("_", " ")} ({filterSubtestView === "ALL" ? "Semua Subtes" : filterSubtestView})
                                </h2>
                                <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                                    {filterSubtestView === "ALL" ? "Menampilkan seluruh koleksi 7 subtes." : `Menampilkan khusus subtes ${filterSubtestView}.`}
                                </p>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                                <select
                                    value={filterSubtestView}
                                    onChange={(e) => setFilterSubtestView(e.target.value)}
                                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold outline-none bg-white cursor-pointer"
                                >
                                    <option value="ALL">Semua Subtes ({serverQuestions.length})</option>
                                    {SNBT_STRUCTURE.map((s) => (
                                        <option key={s.code} value={s.code}>
                                            {s.name} ({subtestCounts[s.code] || 0})
                                        </option>
                                    ))}
                                </select>

                                {serverQuestions.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(serverQuestions, null, 2));
                                            const downloadAnchor = document.createElement("a");
                                            downloadAnchor.setAttribute("href", dataStr);
                                            downloadAnchor.setAttribute("download", `${selectedPaket.toLowerCase()}.json`);
                                            document.body.appendChild(downloadAnchor);
                                            downloadAnchor.click();
                                            downloadAnchor.remove();
                                        }}
                                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shadow-xs"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        <span>Download JSON</span>
                                    </button>
                                )}

                                {serverQuestions.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={handleClearAllQuestions}
                                        disabled={isLoadingServerQuestions}
                                        className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 font-bold text-xs flex items-center gap-1 cursor-pointer shadow-xs"
                                    >
                                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                        <span>Hapus Semua</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {isLoadingServerQuestions ? (
                            <div className="text-center py-12 text-slate-400 space-y-2">
                                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                                <p className="text-xs font-medium">Memuat butir soal dari berkas server...</p>
                            </div>
                        ) : filteredServerQuestions.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 space-y-2">
                                <p className="text-sm font-medium">Belum ada butir soal pada kategori ini.</p>
                                <p className="text-xs">Gunakan tab <strong>Import Dokumen Word</strong> atau <strong>Import Massal CSV</strong> untuk mengisi paket soal.</p>
                            </div>
                        ) : (
                            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                                {filteredServerQuestions.map((q, idx) => (
                                    <div key={idx} className="p-3.5 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-left">
                                        <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                                            <div className="flex items-center gap-2 flex-wrap">
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

                                            <button
                                                type="button"
                                                onClick={() => handleDeleteServerQuestion(q.no_soal, q.subtes_code || "")}
                                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {q.stimulus && (
                                            <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed italic overflow-x-auto">
                                                <MathRenderer content={q.stimulus} />
                                            </div>
                                        )}

                                        {q.image_url && (
                                            <div className="p-3 my-2 bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center overflow-x-auto">
                                                <img
                                                    src={convertToDirectImageUrl(q.image_url)}
                                                    alt={`Gambar Soal No. ${q.no_soal}`}
                                                    referrerPolicy="no-referrer"
                                                    className="max-h-60 sm:max-h-64 object-contain rounded-lg shadow-xs max-w-full"
                                                />
                                            </div>
                                        )}

                                        <div className="text-xs font-semibold text-slate-900 leading-relaxed overflow-x-auto py-1">
                                            <MathRenderer content={q.pertanyaan} />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                            {[
                                                { label: "A", text: q.opsi_a },
                                                { label: "B", text: q.opsi_b },
                                                { label: "C", text: q.opsi_c },
                                                { label: "D", text: q.opsi_d },
                                                { label: "E", text: q.opsi_e }
                                            ].map((opt) => (
                                                <div
                                                    key={opt.label}
                                                    className={`p-2 rounded-xl border text-xs flex items-center gap-2 ${String(q.kunci).trim().toUpperCase() === opt.label
                                                        ? "bg-emerald-50 border-emerald-400 font-bold text-emerald-950"
                                                        : "bg-white border-slate-200 text-slate-700"
                                                        }`}
                                                >
                                                    <span className="font-mono font-bold shrink-0">{opt.label}.</span>
                                                    <div className="flex-1 overflow-x-auto">
                                                        <MathRenderer content={opt.text || "-"} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 1: IMPORT WORD */}
                {inputMode === "docx_upload" && (
                    <WordImporterSection
                        selectedPaket={selectedPaket}
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
                    <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5 sm:pb-4">
                            <div>
                                <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                                    Upload Massal Soal via File CSV / Excel
                                </h2>
                                <p className="text-[11px] sm:text-xs text-slate-500">
                                    Mendukung formula KaTeX serta link Google Drive langsung pada kolom stimulus maupun pilihan A–E.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={handleDownloadExcelTemplate}
                                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-400 rounded-xl transition-all shadow-xs cursor-pointer shrink-0"
                            >
                                <Download className="w-3.5 h-3.5 text-emerald-700" />
                                <span>Unduh Template Lengkap (Excel .xlsx)</span>
                            </button>
                        </div>

                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-slate-300 hover:border-blue-600 hover:bg-blue-50/40 rounded-3xl p-6 sm:p-8 text-center cursor-pointer transition-all space-y-3"
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
                                <p className="text-xs sm:text-sm font-bold text-slate-800">Klik untuk Memilih File CSV atau Excel dari Komputer</p>
                                <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">Mendukung format .csv atau .xlsx standar Excel dan Google Sheets</p>
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

                                    <div className="flex items-center gap-2 flex-wrap">
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
                                            <span>{isSubmitting ? "Menyimpan ke File..." : `Gabungkan & Simpan ke ${selectedPaket}`}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}