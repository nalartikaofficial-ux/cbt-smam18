"use client";

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
    Sparkles,
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
    Save
} from "lucide-react";

// URL BACKEND GOOGLE APPS SCRIPT MASTER RESMI
const GOOGLE_SCRIPT_API_URL =
    "https://script.google.com/macros/s/AKfycbxXeMuz-VXgbdUOESiOOLL5NlLrSMVfrdvOCwhgBbjLWwOy3ASkTjnWJSAIONFDrdY7hg/exec";

// HELPER RENDER FORMULA LATEX / KATEX
export const MathRenderer = ({ content }: { content: any }) => {
    if (content === null || content === undefined) return null;
    const textContent = String(content);
    if (!textContent.trim()) return null;

    const parts = textContent.split(/(\$\$[\s\S]*?\$\$|\$[^\$]+?\$)/g);

    return (
        <span>
            {parts.map((part, idx) => {
                if (part.startsWith("$$") && part.endsWith("$$")) {
                    const formula = part.slice(2, -2);
                    if (typeof window !== "undefined" && (window as any).katex) {
                        try {
                            const html = (window as any).katex.renderToString(formula, { displayMode: true, throwOnError: false });
                            return <span key={idx} className="block my-1 overflow-x-auto" dangerouslySetInnerHTML={{ __html: html }} />;
                        } catch { }
                    }
                    return <span key={idx} className="font-mono text-blue-900 font-bold">{formula}</span>;
                } else if (part.startsWith("$") && part.endsWith("$")) {
                    const formula = part.slice(1, -1);
                    if (typeof window !== "undefined" && (window as any).katex) {
                        try {
                            const html = (window as any).katex.renderToString(formula, { displayMode: false, throwOnError: false });
                            return <span key={idx} className="inline-block px-0.5" dangerouslySetInnerHTML={{ __html: html }} />;
                        } catch { }
                    }
                    return (
                        <span
                            key={idx}
                            className="inline-block px-1 py-0.2 mx-0.5 rounded bg-blue-50 border border-blue-200 font-mono text-blue-900 font-semibold text-[11px]"
                        >
                            {formula}
                        </span>
                    );
                }
                return <span key={idx}>{part}</span>;
            })}
        </span>
    );
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

    if (clean.includes("dropbox.com") && clean.includes("dl=0")) {
        return clean.replace("dl=0", "dl=1");
    }

    const gimgMatch = clean.match(/imgurl=([^&]+)/);
    if (gimgMatch && gimgMatch[1]) {
        return decodeURIComponent(gimgMatch[1]);
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
    const [inputMode, setInputMode] = useState<"list" | "text_parse" | "csv" | "manual">("list");

    const [serverQuestions, setServerQuestions] = useState<ParsedQuestion[]>([]);
    const [isLoadingServerQuestions, setIsLoadingServerQuestions] = useState(false);
    const [filterSubtestView, setFilterSubtestView] = useState("ALL");

    // STATE ALOKASI WAKTU PER SUBTES
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

    const [testInputUrl, setTestInputUrl] = useState("");
    const [testedDirectUrl, setTestedDirectUrl] = useState("");
    const [isCopied, setIsCopied] = useState(false);

    const [batchQuestions, setBatchQuestions] = useState<ParsedQuestion[]>([]);
    const [rawText, setRawText] = useState("");
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

    // ========================================================
    // ALGORITMA PRESISI: WORD MATH TO CLEAN KATEX
    // ========================================================
    const autoCleanMathString = (str: string): string => {
        if (!str) return "";
        let res = str;

        // 1. Bersihkan sisa tanda dolar yang salah atau bertumpuk dari percobaan sebelumnya
        res = res.replace(/\${2,}/g, "$").replace(/\$\s*\$/g, "");

        // 2. Normalisasi karakter minus & pangkat Unicode langsung ke teks biasa
        const unicodeSupMap: Record<string, string> = {
            '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
            '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
            '⁺': '+', '⁻': '-', '–': '-', '—': '-'
        };
        // Tangani pola bilangan 10 diikuti superscript minus dan angka (misal: 10⁻⁶ atau 10⁻¹²)
        res = res.replace(/10([⁻–\-]?)([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, (_, sign, exps) => {
            const cleanSign = sign ? "-" : "";
            const cleanExp = exps.split("").map((c: string) => unicodeSupMap[c] || c).join("");
            return `$10^{${cleanSign}${cleanExp}}$`;
        });

        // Tangani superscript tunggal lainnya (misal: m² atau s⁻²)
        res = res.replace(/([a-zA-Z])([⁻–\-]?)([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, (_, base, sign, exps) => {
            const cleanSign = sign ? "-" : "";
            const cleanExp = exps.split("").map((c: string) => unicodeSupMap[c] || c).join("");
            return `${base}^{${cleanSign}${cleanExp}}`;
        });

        // 3. Perbaiki pola eksponen yang terlanjur rusak seperti 10^-^6 atau 10^-$^6$
        res = res.replace(/10\^[-–—]?\$?\^?([0-9]+)/g, "$10^{-$1}$");
        res = res.replace(/\$10\^\-\$?\^?([0-9]+)\$?/g, "$10^{-$1}$");

        // 4. Perbaiki satuan fisika umum (W/m^2, m/s^2, kg/m^3, dll)
        res = res.replace(/W\/?\$?m\^?2\$?/gi, "$\\text{W/m}^2$");
        res = res.replace(/m\/?s\^?2/gi, "\\text{m/s}^2");
        res = res.replace(/m\/?s(?![a-zA-Z])/gi, "\\text{m/s}");

        // 5. Variabel fisika dengan indeks bawah (subscript seperti I_0, v_0, a_t, F_total)
        res = res.replace(/\b([IivFa-zA-Z])_([0-9a-zA-Z]+)\b/g, "$$1_{$2}$");

        // 6. Simbol Yunani & Operator Fisika
        const symbols: [RegExp, string][] = [
            [/×/g, "\\times "],
            [/÷/g, "\\div "],
            [/±/g, "\\pm "],
            [/≤/g, "\\leq "],
            [/≥/g, "\\geq "],
            [/≠/g, "\\neq "],
            [/θ/g, "\\theta "],
            [/λ/g, "\\lambda "],
            [/μ/g, "\\mu "],
            [/π/g, "\\pi "],
            [/ρ/g, "\\rho "],
            [/ω/g, "\\omega "],
            [/Δ/g, "\\Delta "]
        ];
        symbols.forEach(([regex, latex]) => {
            res = res.replace(regex, `$${latex.trim()}$`);
        });

        // 7. Sanitasi tanda dolar ganda yang berdekatan ($...$ $...$)
        res = res.replace(/\$\s*\$/g, " ");
        res = res.replace(/\$([^\$]+)\$/g, (_, inner) => {
            // Bersihkan inner dari tanda $ yang terselip
            const cleanInner = inner.replace(/\$/g, "").trim();
            return `$${cleanInner}$`;
        });

        return res.trim();
    };

    const handleAutoFormatWordToLatex = () => {
        if (!rawText.trim()) return;

        const lines = rawText.split("\n");
        const cleanedLines = lines.map((line) => {
            const trimmed = line.trim();
            // Lewati baris khusus opsi atau kunci yang murni angka
            if (/^(Kunci:|Posisi:|Gambar:)/i.test(trimmed)) {
                return trimmed;
            }
            return autoCleanMathString(line);
        });

        const result = cleanedLines.join("\n");
        setRawText(result);
        setStatusMsg({
            type: "success",
            text: "Berhasil! Formula eksponen (10⁻⁶, 10⁻¹²), subscript (I₀), dan satuan W/m² telah dirapikan ke format KaTeX presisi."
        });
    };

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

    // ========================================================
    // PARSER SMART PASTE: MAMPU MEMBEDAH SOAL & OPSI LINEAR
    // ========================================================
    const handleParseRawText = () => {
        if (!rawText.trim()) return;

        try {
            // Normalisasi pemisah baris & pecah blok berdasarkan pola awal angka (mis: 1. atau 1))
            const cleanSource = rawText.replace(/\r\n/g, "\n");
            const blocks = cleanSource.split(/\n(?=\s*\d+[\.\)])/).filter((b) => b.trim() !== "");
            const parsed: ParsedQuestion[] = [];

            blocks.forEach((block, idx) => {
                const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);

                let questionLines: string[] = [];
                let a = "", b = "", c = "", d = "", e = "";
                let aImg = "", bImg = "", cImg = "", dImg = "", eImg = "";
                let kunciJawaban = "A", stimulusText = "", imgUrl = "";
                let imgPos: "above" | "below" = "below";

                lines.forEach((line) => {
                    if (/^Wacana:\s*/i.test(line)) {
                        stimulusText = line.replace(/^Wacana:\s*/i, "").trim();
                    } else if (/^Gambar:\s*/i.test(line)) {
                        imgUrl = convertToDirectImageUrl(line.replace(/^Gambar:\s*/i, "").trim());
                    } else if (/^Posisi:\s*(atas|above)/i.test(line)) {
                        imgPos = "above";
                    } else if (/^Posisi:\s*(bawah|below)/i.test(line)) {
                        imgPos = "below";
                    } else if (/^Kunci:\s*/i.test(line)) {
                        kunciJawaban = line.replace(/^Kunci:\s*/i, "").trim().toUpperCase().charAt(0);
                    } else if (/^[A-E][\.\)]/i.test(line)) {
                        // Cek jika opsi ditulis dalam satu baris (mis: A. 10 B. 20 C. 30 ...)
                        const optMatch = line.match(/([A-E])[\.\)]\s*(.*?)(?=(?:[A-E][\.\)]|$))/gi);
                        if (optMatch && optMatch.length > 1) {
                            optMatch.forEach((m) => {
                                const tag = m.charAt(0).toUpperCase();
                                const val = m.replace(/^[A-E][\.\)]\s*/i, "").trim();
                                const optParsed = extractOptionAndImg(val);
                                if (tag === "A") { a = optParsed.text; aImg = optParsed.img; }
                                if (tag === "B") { b = optParsed.text; bImg = optParsed.img; }
                                if (tag === "C") { c = optParsed.text; cImg = optParsed.img; }
                                if (tag === "D") { d = optParsed.text; dImg = optParsed.img; }
                                if (tag === "E") { e = optParsed.text; eImg = optParsed.img; }
                            });
                        } else {
                            const tag = line.charAt(0).toUpperCase();
                            const val = line.replace(/^[A-E][\.\)]\s*/i, "").trim();
                            const optParsed = extractOptionAndImg(val);
                            if (tag === "A") { a = optParsed.text; aImg = optParsed.img; }
                            if (tag === "B") { b = optParsed.text; bImg = optParsed.img; }
                            if (tag === "C") { c = optParsed.text; cImg = optParsed.img; }
                            if (tag === "D") { d = optParsed.text; dImg = optParsed.img; }
                            if (tag === "E") { e = optParsed.text; eImg = optParsed.img; }
                        }
                    } else {
                        // Teks pertanyaan utama (hapus nomor soal depan jika baris pertama)
                        const cleanedLine = line.replace(/^\d+[\.\)]\s*/, "").trim();
                        if (cleanedLine && !a) {
                            questionLines.push(cleanedLine);
                        }
                    }
                });

                const finalPertanyaan = questionLines.join(" ");

                parsed.push({
                    subtes_code: selectedSubtest,
                    no_soal: serverQuestions.length + idx + 1,
                    stimulus: stimulusText,
                    image_url: imgUrl,
                    image_position: imgPos,
                    pertanyaan: finalPertanyaan,
                    opsi_a: a, opsi_b: b, opsi_c: c, opsi_d: d, opsi_e: e,
                    opsi_a_img: aImg, opsi_b_img: bImg, opsi_c_img: cImg, opsi_d_img: dImg, opsi_e_img: eImg,
                    kunci: kunciJawaban || "A",
                    tingkat_kesukaran: "Sedang",
                    pembahasan: "",
                    author_guru: `${loggedTeacher.nama} (${loggedTeacher.mapel || "Guru Mapel"})`
                });
            });

            setBatchQuestions(parsed);
            setStatusMsg({
                type: "success",
                text: `Sempurna! Berhasil membedah ${parsed.length} butir soal eksakta siap simpan.`
            });
        } catch {
            setStatusMsg({
                type: "error",
                text: "Format teks belum rapi. Pastikan naskah diawali angka 1. lalu opsi A. B. C. D. E. dan Kunci: X."
            });
        }
    };

    const handleDownloadTemplate = () => {
        const csvHeader =
            "subtes_code,no_soal,stimulus,image_url,image_position,pertanyaan,opsi_a,opsi_b,opsi_c,opsi_d,opsi_e,opsi_a_img,opsi_b_img,opsi_c_img,opsi_d_img,opsi_e_img,kunci,tingkat_kesukaran,pembahasan\n";
        const sampleRows =
            'PM,1,"Sebuah tangki silinder terisi air dengan fungsi volume $V(t) = \\pi r^2 h$.","https://drive.google.com/file/d/...","above","Jika jari-jari $r = 7\\text{ m}$ dan tinggi $h = 10\\text{ m}$, volume tangki adalah...","$1.400\\text{ m}^3$","$1.540\\text{ m}^3$","$1.600\\text{ m}^3$","$1.740\\text{ m}^3$","$1.800\\text{ m}^3$","","","","","","B","Sedang","Gunakan formula tabung"\n';

        const blob = new Blob([csvHeader + sampleRows], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `TEMPLATE_BANK_SOAL_${selectedPaket}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
            if (lines.length < 2) return;

            const parsed: ParsedQuestion[] = [];
            for (let i = 1; i < lines.length; i++) {
                const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(",");
                const clean = row.map((cell) => cell.replace(/^"|"$/g, "").trim());

                if (clean.length >= 11) {
                    parsed.push({
                        subtes_code: clean[0] || "PU",
                        no_soal: Number(clean[1]) || i,
                        stimulus: clean[2] || "",
                        image_url: convertToDirectImageUrl(clean[3] || ""),
                        image_position: clean[4] === "above" ? "above" : "below",
                        pertanyaan: clean[5] || "",
                        opsi_a: clean[6] || "",
                        opsi_b: clean[7] || "",
                        opsi_c: clean[8] || "",
                        opsi_d: clean[9] || "",
                        opsi_e: clean[10] || "",
                        opsi_a_img: convertToDirectImageUrl(clean[11] || ""),
                        opsi_b_img: convertToDirectImageUrl(clean[12] || ""),
                        opsi_c_img: convertToDirectImageUrl(clean[13] || ""),
                        opsi_d_img: convertToDirectImageUrl(clean[14] || ""),
                        opsi_e_img: convertToDirectImageUrl(clean[15] || ""),
                        kunci: (clean[16] || "A").toUpperCase(),
                        tingkat_kesukaran: clean[17] || "Sedang",
                        pembahasan: clean[18] || "",
                        author_guru: `${loggedTeacher.nama} (${loggedTeacher.mapel || "Guru Mapel"})`
                    });
                }
            }

            setBatchQuestions(parsed);
            setStatusMsg({
                type: "success",
                text: `Berhasil mengimpor ${parsed.length} butir soal dari CSV!`
            });
        };
        reader.readAsText(file);
    };

    const handleBulkSubmit = async () => {
        if (batchQuestions.length === 0) return;

        setIsSubmitting(true);
        setStatusMsg(null);

        const payload = {
            action: "bulk_upload_questions",
            paket: selectedPaket,
            package: selectedPaket,
            questions: batchQuestions
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
                text: `Sukses! Sebanyak ${batchQuestions.length} butir soal telah berhasil disimpan ke ${selectedPaket}!`
            });
            setBatchQuestions([]);
            setRawText("");
            setTimeout(() => {
                fetchServerQuestions(selectedPaket);
                setInputMode("list");
            }, 3000);
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
                                BANK SOAL &amp; EDITOR FORMULA SAINS &bull; SMA MUHAMMADIYAH 18
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

                {/* TOOL KHUSUS: EKSTRAKTOR GAMBAR GOOGLE DRIVE */}
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
                                Tempelkan link share Google Drive di bawah. Sistem otomatis mengubahnya ke direct URL Google yang dijamin tampil di peramban siswa.
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
                                Tentukan durasi menit pengerjaan untuk masing-masing 7 subtes. Mendukung angka desimal seperti <strong>0.5</strong> menit (30 detik) atau <strong>22.5</strong> menit.
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
                        onClick={() => setInputMode("text_parse")}
                        className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${inputMode === "text_parse" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                            }`}
                    >
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span>Smart Paste (Word / LaTeX)</span>
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

                {/* TAB 0: DAFTAR SOAL YANG TERSIMPAN DI GOOGLE SHEETS */}
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
                                <p className="text-xs">Gunakan tab <strong>Smart Paste</strong> atau <strong>Input Satuan</strong> untuk menambahkan soal.</p>
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

                                            <button
                                                type="button"
                                                onClick={() => handleDeleteServerQuestion(Number(q.no_soal), q.subtes_code)}
                                                className="p-1 rounded-lg border border-slate-200 hover:bg-rose-50 text-slate-400 hover:text-rose-700 cursor-pointer transition-colors"
                                                title="Hapus Soal"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                        {q.stimulus && (
                                            <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed italic">
                                                <MathRenderer content={q.stimulus} />
                                            </div>
                                        )}

                                        {q.image_url && (
                                            <div className="p-2 bg-white rounded-xl border border-slate-200 flex justify-center">
                                                <img
                                                    src={q.image_url}
                                                    alt={`Soal No. ${q.no_soal}`}
                                                    referrerPolicy="no-referrer"
                                                    className="max-h-52 rounded object-contain"
                                                    onError={(e) => { (e.target as any).style.display = "none"; }}
                                                />
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

                {/* TAB 1: SMART TEXT PARSER */}
                {inputMode === "text_parse" && (
                    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-5 shadow-sm">
                        <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                                    Smart Text Parser &bull; Ekstraksi Naskah Soal &amp; KaTeX
                                </h2>
                                <p className="text-xs text-slate-500">
                                    Tempelkan naskah soal langsung dari Word. Klik tombol Auto-Format untuk membersihkan simbol sebelum dibedah.
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleAutoFormatWordToLatex}
                                    className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all shrink-0"
                                    title="Otomatis bersihkan pangkat, akar, perkalian, & huruf Yunani dari Word"
                                >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>✨ Auto-Format Simbol Word ke LaTeX</span>
                                </button>
                                <span className="px-2.5 py-1 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 text-xs font-mono font-bold shrink-0">
                                    LaTeX Enabled
                                </span>
                            </div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1.5">
                            <div className="font-bold flex items-center gap-1.5 text-amber-800">
                                <HelpCircle className="w-4 h-4" />
                                <span>Contoh Format Bebas yang Otomatis Dikenali:</span>
                            </div>
                            <pre className="font-mono text-[11px] bg-white/90 p-3 rounded-xl border border-amber-200 text-slate-700 leading-relaxed overflow-x-auto">
                                {`1. Wacana: Sebuah balok bermassa m = 2 kg ditarik dengan gaya F = 10 N membentuk sudut θ = 60°.
Gambar: https://drive.google.com/file/d/...
Berapakah percepatan benda jika bidang licin?
A. 2.5 m/s²
B. 5 m/s²
C. 7.5 m/s²
D. 10 m/s²
E. 12.5 m/s²
Kunci: A`}
                            </pre>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 font-mono">PILIH SUBTES TUJUAN:</label>
                            <select
                                value={selectedSubtest}
                                onChange={(e) => setSelectedSubtest(e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:border-blue-600 outline-none bg-white cursor-pointer"
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

                        <textarea
                            rows={8}
                            value={rawText}
                            onChange={(e) => setRawText(e.target.value)}
                            placeholder="Tempelkan naskah soal Word Anda di sini (Nomor 1, 2, 3 dst)..."
                            className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs font-mono leading-relaxed focus:border-blue-600 outline-none"
                        />

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={handleParseRawText}
                                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm"
                            >
                                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                <span>Bedah Soal &amp; Buat Pratinjau KaTeX</span>
                            </button>

                            {batchQuestions.length > 0 && (
                                <button
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={handleBulkSubmit}
                                    className="px-5 py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-blue-900/20 cursor-pointer disabled:opacity-50"
                                >
                                    <Send className="w-3.5 h-3.5" />
                                    <span>{isSubmitting ? "Menyimpan..." : `Simpan ${batchQuestions.length} Soal ke ${selectedPaket}`}</span>
                                </button>
                            )}
                        </div>

                        {batchQuestions.length > 0 && (
                            <div className="space-y-4 pt-4 border-t border-slate-200">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                                        <Eye className="w-4 h-4 text-blue-700" />
                                        <span>Pratinjau Layar Siswa ({batchQuestions.length} Butir Soal Terdeteksi)</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setBatchQuestions([])}
                                        className="text-xs text-rose-600 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Bersihkan Pratinjau</span>
                                    </button>
                                </div>

                                <div className="space-y-4 max-h-[550px] overflow-y-auto pr-1">
                                    {batchQuestions.map((q, qIdx) => (
                                        <div key={qIdx} className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-left">
                                            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2 py-0.5 rounded bg-[#1e3a8a] text-white font-mono font-bold text-[10px]">
                                                        SOAL NO. {q.no_soal}
                                                    </span>
                                                    <span className="font-semibold text-slate-700 text-[11px] font-mono">
                                                        Subtes: {q.subtes_code}
                                                    </span>
                                                </div>
                                                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300 font-mono text-[10px] font-black">
                                                    KUNCI: {q.kunci}
                                                </span>
                                            </div>

                                            {q.stimulus && (
                                                <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed italic">
                                                    <MathRenderer content={q.stimulus} />
                                                </div>
                                            )}

                                            {q.image_url && (
                                                <div className="p-2 bg-white rounded-xl border border-slate-200 flex justify-center">
                                                    <img
                                                        src={q.image_url}
                                                        alt="Stimulus Soal"
                                                        referrerPolicy="no-referrer"
                                                        className="max-h-52 rounded object-contain"
                                                        onError={(e) => { (e.target as any).style.display = "none"; }}
                                                    />
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
                                                    { label: "E", text: q.opsi_e }
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
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 2: UPLOAD MASSAL FILE CSV */}
                {inputMode === "csv" && (
                    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                            <div>
                                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                                    Upload Massal Soal via File CSV
                                </h2>
                                <p className="text-xs text-slate-500">
                                    Mendukung formula KaTeX serta link Google Drive langsung pada kolom stimulus maupun pilihan A–E.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={handleDownloadTemplate}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs transition-colors cursor-pointer"
                            >
                                <Download className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Unduh Template Lengkap CSV</span>
                            </button>
                        </div>

                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-slate-300 hover:border-blue-600 hover:bg-blue-50/40 rounded-3xl p-8 text-center cursor-pointer transition-all space-y-3"
                        >
                            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center mx-auto">
                                <UploadCloud className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-800">Klik untuk Memilih File CSV dari Komputer</p>
                                <p className="text-xs text-slate-400 mt-0.5">Mendukung format .csv standar Excel atau Google Sheets</p>
                            </div>
                        </div>

                        {batchQuestions.length > 0 && (
                            <div className="space-y-4 pt-2">
                                <div className="flex items-center justify-between">
                                    <div className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                                        <Eye className="w-4 h-4 text-blue-700" />
                                        <span>Pratinjau Hasil Impor CSV ({batchQuestions.length} Soal)</span>
                                    </div>
                                    <button
                                        type="button"
                                        disabled={isSubmitting}
                                        onClick={handleBulkSubmit}
                                        className="px-5 py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-blue-900/20 cursor-pointer disabled:opacity-50"
                                    >
                                        <Send className="w-3.5 h-3.5" />
                                        <span>{isSubmitting ? "Mengunggah..." : `Simpan Semua ke ${selectedPaket}`}</span>
                                    </button>
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
                                    action: "add_question",
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
                                    placeholder="Gunakan $...$ untuk simbol matematika..."
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
                                <label className="text-xs font-bold text-slate-700 font-mono">PERTANYAAN UTAMA (MENDUKUNG $...$):</label>
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
                                        <div className="flex items-center gap-1.5 pl-8">
                                            <ImageIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            <input
                                                type="text"
                                                value={opt.imgVal}
                                                onChange={(e) => opt.setImgVal(convertToDirectImageUrl(e.target.value))}
                                                placeholder={`URL Gambar Opsi ${opt.label} (Google Drive / web)...`}
                                                className="w-full px-2.5 py-1 rounded-md border border-slate-200 text-[11px] font-mono bg-white text-slate-600 outline-none"
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
                                <span>{isSubmitting ? "Menyimpan..." : `Simpan Soal ke ${selectedPaket}`}</span>
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

                                            {opt.img && (
                                                <img
                                                    src={opt.img}
                                                    alt={`Gambar ${opt.label}`}
                                                    referrerPolicy="no-referrer"
                                                    className="h-10 max-w-[90px] object-contain rounded border bg-white p-0.5"
                                                    onError={(e) => { (e.target as any).style.display = "none"; }}
                                                />
                                            )}
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