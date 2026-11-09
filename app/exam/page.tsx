"use client";

import { LIST_PRODI_SNBT, ProdiItem } from '@/data/prodiDatabase';
import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    ShieldAlert,
    Maximize2,
    Clock,
    CheckCircle2,
    AlertTriangle,
    Layers,
    ArrowRight,
    Lock,
    Loader2,
    FastForward,
    Award,
    Home,
    Check,
    AlertCircle,
    GraduationCap,
    School,
    Search,
    BookOpen,
    X,
    Filter,
    Printer,
    TrendingUp,
    TrendingDown,
    Target,
    BarChart3,
    FileText,
    ExternalLink,
    HelpCircle,
    Eye
} from "lucide-react";
import katex from "katex";
import "katex/dist/katex.min.css";

const GOOGLE_SCRIPT_API_URL =
    "https://script.google.com/macros/s/AKfycbxXeMuz-VXgbdUOESiOOLL5NlLrSMVfrdvOCwhgBbjLWwOy3ASkTjnWJSAIONFDrdY7hg/exec";

export interface PTNProdiBenchmark {
    id: string;
    kampus: string;
    prodi: string;
    jenjang: string;
    rumpun: "SAINTEK" | "SOSHUM";
    dayaTampung: number;
    peminat: number;
    keketatan: string;
    passingGradeMin: number;
}

const LOCAL_BENCHMARKS: PTNProdiBenchmark[] = (LIST_PRODI_SNBT || []).map((item) => ({
    id: String(item.id),
    kampus: item.kampus,
    prodi: item.prodi,
    jenjang: item.jenjang || "S1",
    rumpun: item.kelompok || "SAINTEK",
    dayaTampung: Number(item.dayaTampung || 0),
    peminat: Number(item.peminat || 0),
    keketatan: `${item.keketatan}%`,
    passingGradeMin: Number(item.passingGrade || 650)
}));

const SNBT_STRUCTURE = [
    { code: "PU", name: "Penalaran Umum (PU)", category: "Tes Potensi Skolastik", defaultDurationMinutes: 30, count: 30 },
    { code: "PPU", name: "Pengetahuan & Pemahaman", category: "Tes Potensi Skolastik", defaultDurationMinutes: 15, count: 20 },
    { code: "PBM", name: "Pemahaman Bacaan & Menulis", category: "Tes Potensi Skolastik", defaultDurationMinutes: 25, count: 20 },
    { code: "PK", name: "Pengetahuan Kuantitatif", category: "Tes Potensi Skolastik", defaultDurationMinutes: 20, count: 20 },
    { code: "LIT_INDO", name: "Literasi B. Indonesia", category: "Tes Literasi", defaultDurationMinutes: 42.5, count: 30 },
    { code: "LIT_ENG", name: "Literasi Bahasa Inggris", category: "Tes Literasi", defaultDurationMinutes: 20, count: 20 },
    { code: "PM", name: "Penalaran Matematika", category: "Penalaran Matematika", defaultDurationMinutes: 42.5, count: 20 }
];

export function formatKeketatan(val: any): string {
    if (!val && val !== 0) return "0%";
    const str = String(val).trim().replace(",", ".");
    if (str.includes("%")) return str;
    const num = parseFloat(str);
    if (!isNaN(num)) {
        if (num > 0 && num < 1) {
            return `${(num * 100).toFixed(2)}%`;
        }
        return `${num.toFixed(2)}%`;
    }
    return str;
}

function RenderLatex({ content = "" }: { content: any }) {
    const safeText = String(content ?? "");
    if (!safeText.trim()) return null;

    const parts = safeText.split(/(\$\$[\s\S]*?\$\$|\$[^\$]+?\$)/g);

    return (
        <span>
            {parts.map((part, idx) => {
                if (part.startsWith("$$") && part.endsWith("$$")) {
                    const math = part.slice(2, -2);
                    const html = katex.renderToString(math, { displayMode: true, throwOnError: false });
                    return (
                        <span
                            key={idx}
                            className="block my-2 overflow-x-auto py-1"
                            dangerouslySetInnerHTML={{ __html: html }}
                        />
                    );
                } else if (part.startsWith("$") && part.endsWith("$")) {
                    const math = part.slice(1, -1);
                    const html = katex.renderToString(math, { displayMode: false, throwOnError: false });
                    return (
                        <span
                            key={idx}
                            className="inline-block px-0.5 align-middle"
                            dangerouslySetInnerHTML={{ __html: html }}
                        />
                    );
                }
                return <span key={idx}>{part}</span>;
            })}
        </span>
    );
}

function getCleanImageUrl(rawUrl?: string): string {
    if (!rawUrl) return "";
    const clean = String(rawUrl).trim();
    const driveRegex = /(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)|id=)([a-zA-Z0-9_-]{20,})/;
    const driveMatch = clean.match(driveRegex);
    if (driveMatch && driveMatch[1]) {
        return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
    }
    return clean;
}

interface QuestionOption {
    id: string;
    text: any;
    imageUrl?: string;
}

interface QuestionItem {
    id: string | number;
    localNo: number;
    subtest: string;
    subtestCategory: string;
    stimulus?: string;
    imageUrl?: string;
    imagePosition?: "above" | "below";
    question: any;
    options: QuestionOption[];
    correctAnswer: string;
    explanation: string;
}

interface SubtestConfigItem {
    code: string;
    name: string;
    category: string;
    defaultDurationMinutes: number;
}

function OfficialExamChamberContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [studentSession, setStudentSession] = useState<{
        nisn: string;
        candidateName: string;
        packageId: string;
        token: string;
        pilihan1?: string;
        pilihan2?: string;
        kelas?: string;
    } | null>(null);

    const [pilihanKampus1, setPilihanKampus1] = useState("");
    const [pilihanKampus2, setPilihanKampus2] = useState("");

    const [ptnBenchmarks, setPtnBenchmarks] = useState<PTNProdiBenchmark[]>(LOCAL_BENCHMARKS);
    const [showPTNDatabaseModal, setShowPTNDatabaseModal] = useState(false);
    const [modalSearchQuery, setModalSearchQuery] = useState("");
    const [modalRumpunFilter, setModalRumpunFilter] = useState<"ALL" | "SAINTEK" | "SOSHUM">("ALL");
    const [modalJenjangFilter, setModalJenjangFilter] = useState<"ALL" | "S1" | "D4" | "D3">("ALL");
    const [targetSlotForSelection, setTargetSlotForSelection] = useState<1 | 2>(1);

    const [allQuestions, setAllQuestions] = useState<QuestionItem[]>([]);
    const [subtestsList, setSubtestsList] = useState<SubtestConfigItem[]>(SNBT_STRUCTURE);

    const [sessionTitle, setSessionTitle] = useState("RUANG UJIAN RESMI");
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState("");

    const [currentSubtestIndex, setCurrentSubtestIndex] = useState(0);
    const [currentQIndexInSubtest, setCurrentQIndexInSubtest] = useState(0);
    const [subtestTimeLeft, setSubtestTimeLeft] = useState<number>(30 * 60);

    const [timeSpentPerSubtest, setTimeSpentPerSubtest] = useState<Record<string, number>>({});
    const [answers, setAnswers] = useState<Record<string | number, string>>({});
    const [doubtfuls, setDoubtfuls] = useState<Record<string | number, boolean>>({});
    const [fontSizeMode, setFontSizeMode] = useState<"normal" | "large" | "xlarge">("normal");

    const [isInExam, setIsInExam] = useState(false);
    const [isSyncingServer, setIsSyncingServer] = useState(false);
    const [isExamCompleted, setIsExamCompleted] = useState(false);
    const [isExitingToHome, setIsExitingToHome] = useState(false);
    const [showSubtestConfirmModal, setShowSubtestConfirmModal] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);

    const [isSessionLockedByProctor, setIsSessionLockedByProctor] = useState(false);
    const [sessionLockMessage, setSessionLockMessage] = useState("");
    const [violationCount, setViolationCount] = useState(0);
    const [showViolationModal, setShowViolationModal] = useState(false);
    const [isExamLockedPermanently, setIsExamLockedPermanently] = useState(false);

    const [hardEndTime, setHardEndTime] = useState<number | null>(null);
    const [examStartTimeStr, setExamStartTimeStr] = useState("");
    const [examEndTimeStr, setExamEndTimeStr] = useState("");

    const safeExitFullscreen = () => {
        try {
            if (typeof document !== "undefined" && document.fullscreenElement && document.exitFullscreen) {
                document.exitFullscreen().catch(() => { });
            }
        } catch { }
    };

    // Helper: Map data naskah
    const mapRawToQuestionItems = (rawData: any[]): QuestionItem[] => {
        const getSubtestMeta = (idx: number) => {
            let acc = 0;
            for (const sub of SNBT_STRUCTURE) {
                if (idx < acc + sub.count) {
                    return { subtes: sub.code, localNo: (idx - acc) + 1, category: sub.category };
                }
                acc += sub.count;
            }
            return { subtes: "PM", localNo: 20, category: "Penalaran Matematika" };
        };

        return rawData.map((item: any, idx: number) => {
            const meta = getSubtestMeta(idx);
            const subCode = (item.subtes_code || meta.subtes).toUpperCase();
            const localNo = Number(item.no_soal) || meta.localNo;

            return {
                id: `${subCode}_${localNo}`,
                localNo,
                subtest: subCode,
                subtestCategory: item.subtes_category || meta.category,
                stimulus: item.stimulus || "",
                imageUrl: getCleanImageUrl(item.image_url),
                imagePosition: item.image_position === "above" ? "above" : "below",
                question: item.pertanyaan ?? "",
                options: [
                    { id: "A", text: item.opsi_a ?? "", imageUrl: getCleanImageUrl(item.opsi_a_img) },
                    { id: "B", text: item.opsi_b ?? "", imageUrl: getCleanImageUrl(item.opsi_b_img) },
                    { id: "C", text: item.opsi_c ?? "", imageUrl: getCleanImageUrl(item.opsi_c_img) },
                    { id: "D", text: item.opsi_d ?? "", imageUrl: getCleanImageUrl(item.opsi_d_img) },
                    { id: "E", text: item.opsi_e ?? "", imageUrl: getCleanImageUrl(item.opsi_e_img) }
                ],
                correctAnswer: String(item.kunci || "A").trim().toUpperCase(),
                explanation: item.pembahasan || ""
            };
        });
    };

    // 1. MEMUAT SESI & SELALU PRIORITASKAN DATA RESMI SERVER
    useEffect(() => {
        if (typeof window === "undefined") return;

        let sessionData: any = null;
        const localSess = localStorage.getItem("cbt_student_session");
        if (localSess) {
            try {
                sessionData = JSON.parse(localSess);
            } catch { }
        }

        if (!sessionData || !sessionData.nisn) {
            setLoadError("Kredensial tidak ditemukan. Anda wajib login melalui portal resmi.");
            setIsLoading(false);
            return;
        }

        setStudentSession(sessionData);

        if (sessionData.pilihan1) setPilihanKampus1(sessionData.pilihan1);
        if (sessionData.pilihan2) setPilihanKampus2(sessionData.pilihan2);

        const queryPkg = searchParams.get("package") || searchParams.get("paket");
        const activePkg = queryPkg || sessionData.packageId || "PAKET_1";
        setSessionTitle(`RUANG UJIAN RESMI • ${activePkg.replace("_", " ")}`);

        // Sinkronisasi Sesi & Jadwal Server
        fetch(`${GOOGLE_SCRIPT_API_URL}?action=get_active_session&_t=${Date.now()}`, { cache: "no-store" })
            .then((r) => r.json())
            .then((res) => {
                if (res.status === "success" && res.data?.waktu_selesai) {
                    const endTimestamp = new Date(res.data.waktu_selesai).getTime();
                    if (!isNaN(endTimestamp)) setHardEndTime(endTimestamp);
                }
            })
            .catch(() => { });

        // Cek Cache Durasi Subtes
        const localDuration = localStorage.getItem(`durasi_${activePkg}`);
        if (localDuration) {
            try {
                const parsedDur = JSON.parse(localDuration);
                if (Array.isArray(parsedDur) && parsedDur.length > 0) setSubtestsList(parsedDur);
            } catch { }
        }

        // Pulihkan progres pengerjaan jika siswa sedang melanjutkan
        const savedProgressKey = `cbt_progress_${sessionData.nisn}`;
        const savedProgress = localStorage.getItem(savedProgressKey);
        if (savedProgress) {
            try {
                const parsed = JSON.parse(savedProgress);
                if (parsed.answers) setAnswers(parsed.answers);
                if (parsed.doubtfuls) setDoubtfuls(parsed.doubtfuls);
                if (typeof parsed.subtestIndex === "number") setCurrentSubtestIndex(parsed.subtestIndex);
                if (typeof parsed.qIndex === "number") setCurrentQIndexInSubtest(parsed.qIndex);
                if (typeof parsed.timeLeft === "number" && parsed.timeLeft > 0) setSubtestTimeLeft(parsed.timeLeft);
                if (parsed.timeSpent) setTimeSpentPerSubtest(parsed.timeSpent);
                if (parsed.pilihan1) setPilihanKampus1(parsed.pilihan1);
                if (parsed.pilihan2) setPilihanKampus2(parsed.pilihan2);
                if (parsed.startTime) setExamStartTimeStr(parsed.startTime);
            } catch { }
        }

        // SELALU AMBIL DATA DARI ENDPOINT SERVER TERLEBIH DAHULU (Anti-Stale Cache)
        setIsLoading(true);
        fetch(`/api/questions?paket=${activePkg}&_t=${Date.now()}`, { cache: "no-store" })
            .then((res) => res.json())
            .then((res) => {
                if (res.status === "success" && Array.isArray(res.data) && res.data.length > 0) {
                    setAllQuestions(mapRawToQuestionItems(res.data));
                    setLoadError("");
                    localStorage.setItem(`cbt_questions_${activePkg}`, JSON.stringify(res.data));
                } else {
                    // Fallback ke cache jika offline
                    const cached = localStorage.getItem(`cbt_questions_${activePkg}`);
                    if (cached) {
                        setAllQuestions(mapRawToQuestionItems(JSON.parse(cached)));
                    } else {
                        setLoadError("Naskah soal belum tersedia di server. Harap hubungi pengawas.");
                    }
                }
            })
            .catch(() => {
                const cached = localStorage.getItem(`cbt_questions_${activePkg}`);
                if (cached) {
                    setAllQuestions(mapRawToQuestionItems(JSON.parse(cached)));
                } else {
                    setLoadError("Gagal mengambil naskah soal dari server lokal.");
                }
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [searchParams]);

    // Simpan progres ke browser saat mengerjakan
    useEffect(() => {
        if (!studentSession?.nisn || !isInExam || isExamCompleted) return;
        const savedProgressKey = `cbt_progress_${studentSession.nisn}`;
        const payload = {
            answers,
            doubtfuls,
            subtestIndex: currentSubtestIndex,
            qIndex: currentQIndexInSubtest,
            timeLeft: subtestTimeLeft,
            timeSpent: timeSpentPerSubtest,
            pilihan1: pilihanKampus1,
            pilihan2: pilihanKampus2,
            startTime: examStartTimeStr
        };
        localStorage.setItem(savedProgressKey, JSON.stringify(payload));
    }, [answers, doubtfuls, currentSubtestIndex, currentQIndexInSubtest, subtestTimeLeft, timeSpentPerSubtest, pilihanKampus1, pilihanKampus2, examStartTimeStr, studentSession, isInExam, isExamCompleted]);

    const activeSubtestConfig = subtestsList[currentSubtestIndex] || subtestsList[0];

    const currentSubtestQuestions = useMemo(() => {
        const filtered = allQuestions.filter((q) => q.subtest === activeSubtestConfig.code);
        return filtered.length > 0 ? filtered : allQuestions;
    }, [allQuestions, activeSubtestConfig]);

    const currentQ = currentSubtestQuestions[currentQIndexInSubtest] || currentSubtestQuestions[0];

    // Ganti Subtes (Manual)
    const handleNextSubtestManual = useCallback(() => {
        setShowSubtestConfirmModal(false);
        if (currentSubtestIndex < subtestsList.length - 1) {
            const nextIdx = currentSubtestIndex + 1;
            setCurrentSubtestIndex(nextIdx);
            setCurrentQIndexInSubtest(0);
            const nextDurationMin = subtestsList[nextIdx]?.defaultDurationMinutes || 20;
            setSubtestTimeLeft(Math.round(nextDurationMin * 60));
        } else {
            executeFinalSubmission();
        }
    }, [currentSubtestIndex, subtestsList]);

    // TIMER PER DETIK
    useEffect(() => {
        if (!isInExam || isSyncingServer || isExamCompleted || isExamLockedPermanently || isSessionLockedByProctor) return;

        const timer = setInterval(() => {
            if (hardEndTime && Date.now() >= hardEndTime) {
                clearInterval(timer);
                alert("Waktu batas pelaksanaan sesi ujian telah berakhir. Lembar ujian Anda otomatis disimpan.");
                executeFinalSubmission();
                return;
            }

            setTimeSpentPerSubtest((prev) => {
                const code = activeSubtestConfig.code;
                return { ...prev, [code]: (prev[code] || 0) + 1 };
            });

            setSubtestTimeLeft((prev) => Math.max(0, prev - 1));
        }, 1000);

        return () => clearInterval(timer);
    }, [isInExam, isSyncingServer, isExamCompleted, isExamLockedPermanently, isSessionLockedByProctor, hardEndTime, activeSubtestConfig]);

    // AUTO ADVANCE SUBTES SAAT TIMER HABIS
    useEffect(() => {
        if (!isInExam || isSyncingServer || isExamCompleted) return;

        if (subtestTimeLeft === 0) {
            if (currentSubtestIndex < subtestsList.length - 1) {
                const nextIdx = currentSubtestIndex + 1;
                setCurrentSubtestIndex(nextIdx);
                setCurrentQIndexInSubtest(0);
                const nextDurationMin = subtestsList[nextIdx]?.defaultDurationMinutes || 20;
                setSubtestTimeLeft(Math.round(nextDurationMin * 60));
            } else {
                executeFinalSubmission();
            }
        }
    }, [subtestTimeLeft, isInExam, isSyncingServer, isExamCompleted, currentSubtestIndex, subtestsList]);

    // Parsing target pilihan kampus
    const parseTargetSelection = useCallback((val: string) => {
        if (!val || typeof val !== "string") return null;
        const trimmed = val.trim();
        if (!trimmed.includes(" - ")) return null;

        const parts = trimmed.split(" - ");
        const rawKampus = parts[0] || "";
        const rawProdi = parts.slice(1).join(" - ") || "";

        const cleanKampus = rawKampus.replace(/\(.*?\)/g, "").replace(/[^a-zA-Z0-9\s]/g, " ").trim().toLowerCase();
        const cleanProdi = rawProdi.replace(/\(.*?\)/g, "").replace(/[^a-zA-Z0-9\s]/g, " ").trim().toLowerCase();
        const matchJenjang = rawProdi.match(/\b(S1|D4|D3|D2)\b/i);
        const jenjang = matchJenjang ? matchJenjang[1].toUpperCase() : null;

        return { cleanKampus, cleanProdi, jenjang };
    }, []);

    const benchmarkData1 = useMemo(() => {
        if (!pilihanKampus1 || ptnBenchmarks.length === 0) return null;
        const parsed = parseTargetSelection(pilihanKampus1);
        if (!parsed) return null;

        return ptnBenchmarks.find((b) => {
            const bKampus = b.kampus.replace(/\(.*?\)/g, "").replace(/[^a-zA-Z0-9\s]/g, " ").trim().toLowerCase();
            const bProdi = b.prodi.replace(/\(.*?\)/g, "").replace(/[^a-zA-Z0-9\s]/g, " ").trim().toLowerCase();
            const isKampusMatch = bKampus === parsed.cleanKampus || bKampus.includes(parsed.cleanKampus) || parsed.cleanKampus.includes(bKampus);
            const isProdiMatch = bProdi === parsed.cleanProdi || bProdi.includes(parsed.cleanProdi) || parsed.cleanProdi.includes(bProdi);
            const isJenjangMatch = parsed.jenjang ? (b.jenjang || "S1").toUpperCase() === parsed.jenjang : true;
            return isKampusMatch && isProdiMatch && isJenjangMatch;
        }) || null;
    }, [pilihanKampus1, ptnBenchmarks, parseTargetSelection]);

    const benchmarkData2 = useMemo(() => {
        if (!pilihanKampus2 || ptnBenchmarks.length === 0) return null;
        const parsed = parseTargetSelection(pilihanKampus2);
        if (!parsed) return null;

        return ptnBenchmarks.find((b) => {
            const bKampus = b.kampus.replace(/\(.*?\)/g, "").replace(/[^a-zA-Z0-9\s]/g, " ").trim().toLowerCase();
            const bProdi = b.prodi.replace(/\(.*?\)/g, "").replace(/[^a-zA-Z0-9\s]/g, " ").trim().toLowerCase();
            const isKampusMatch = bKampus === parsed.cleanKampus || bKampus.includes(parsed.cleanKampus) || parsed.cleanKampus.includes(bKampus);
            const isProdiMatch = bProdi === parsed.cleanProdi || bProdi.includes(parsed.cleanProdi) || parsed.cleanProdi.includes(bProdi);
            const isJenjangMatch = parsed.jenjang ? (b.jenjang || "S1").toUpperCase() === parsed.jenjang : true;
            return isKampusMatch && isProdiMatch && isJenjangMatch;
        }) || null;
    }, [pilihanKampus2, ptnBenchmarks, parseTargetSelection]);

    const filteredModalBenchmarks = useMemo(() => {
        const q = modalSearchQuery.toLowerCase().trim();
        return ptnBenchmarks.filter((item) => {
            const matchesQuery = !q || item.kampus.toLowerCase().includes(q) || item.prodi.toLowerCase().includes(q);
            const matchesRumpun = modalRumpunFilter === "ALL" || item.rumpun === modalRumpunFilter;
            const matchesJenjang = modalJenjangFilter === "ALL" || (item.jenjang || "S1") === modalJenjangFilter;
            return matchesQuery && matchesRumpun && matchesJenjang;
        });
    }, [ptnBenchmarks, modalSearchQuery, modalRumpunFilter, modalJenjangFilter]);

    const recordViolation = useCallback(() => {
        if (!isInExam || isSyncingServer || isExamCompleted || isExamLockedPermanently || isSessionLockedByProctor) return;

        setViolationCount((prev) => {
            const next = prev + 1;
            if (studentSession?.nisn) {
                const isFinalLock = next >= 3;
                const cleanNisn = String(studentSession.nisn).replace(/\D/g, "").trim();

                fetch(GOOGLE_SCRIPT_API_URL, {
                    method: "POST",
                    mode: "no-cors",
                    headers: { "Content-Type": "text/plain;charset=utf-8" },
                    body: JSON.stringify({
                        action: "report_kiosk_lock",
                        nisn: cleanNisn,
                        violations: next
                    })
                }).catch(() => { });

                if (isFinalLock) {
                    setIsExamLockedPermanently(true);
                }
            }
            return next;
        });

        setShowViolationModal(true);
    }, [isInExam, isSyncingServer, isExamCompleted, isExamLockedPermanently, isSessionLockedByProctor, studentSession]);

    useEffect(() => {
        if (!isInExam || isSyncingServer || isExamCompleted) return;

        const handleFullscreenChange = () => {
            if (!document.fullscreenElement) {
                recordViolation();
            }
        };
        const handleWindowBlur = () => {
            recordViolation();
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        window.addEventListener("blur", handleWindowBlur);

        return () => {
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
            window.removeEventListener("blur", handleWindowBlur);
        };
    }, [isInExam, isSyncingServer, isExamCompleted, recordViolation]);

    // KALKULASI SKOR 7 SUBTES
    const scoreResults = useMemo(() => {
        let correct = 0;
        let incorrect = 0;
        let unattempted = 0;

        const subtestBreakdown: Record<
            string,
            { correct: number; incorrect: number; unattempted: number; total: number; scoreIRT: number; percentage: number }
        > = {};

        subtestsList.forEach((st) => {
            subtestBreakdown[st.code] = { correct: 0, incorrect: 0, unattempted: 0, total: 0, scoreIRT: 200, percentage: 0 };
        });

        allQuestions.forEach((q) => {
            const code = q.subtest || "PU";
            if (!subtestBreakdown[code]) {
                subtestBreakdown[code] = { correct: 0, incorrect: 0, unattempted: 0, total: 0, scoreIRT: 200, percentage: 0 };
            }
            subtestBreakdown[code].total += 1;

            const ans = answers[q.id];
            if (!ans) {
                unattempted++;
                subtestBreakdown[code].unattempted += 1;
            } else if (ans === q.correctAnswer) {
                correct++;
                subtestBreakdown[code].correct += 1;
            } else {
                incorrect++;
                subtestBreakdown[code].incorrect += 1;
            }
        });

        Object.keys(subtestBreakdown).forEach((code) => {
            const item = subtestBreakdown[code];
            const ratio = item.total > 0 ? item.correct / item.total : 0;
            item.percentage = Math.round(ratio * 100);
            item.scoreIRT = Math.round(200 + ratio * 650);
        });

        const scaledScore = Math.round(200 + (correct / (allQuestions.length || 1)) * 650);

        const tpsCodes = ["PU", "PPU", "PBM", "PK"];
        const litCodes = ["LIT_INDO", "LIT_ENG", "PM"];

        const tpsScores = tpsCodes.map((c) => subtestBreakdown[c]?.scoreIRT || 200);
        const tpsAvg = Math.round(tpsScores.reduce((a, b) => a + b, 0) / (tpsScores.length || 1));

        const litScores = litCodes.map((c) => subtestBreakdown[c]?.scoreIRT || 200);
        const litAvg = Math.round(litScores.reduce((a, b) => a + b, 0) / (litScores.length || 1));

        return {
            correct,
            incorrect,
            unattempted,
            total: allQuestions.length,
            answeredCount: Object.keys(answers).length,
            scaledScore,
            tpsAvg,
            litAvg,
            subtestBreakdown
        };
    }, [answers, allQuestions, subtestsList]);

    // PENGUMPULAN AKHIR SOAL (DILENGKAPI TIMEOUT AGAR TIDAK MACET LOADING)
    const executeFinalSubmission = async () => {
        setShowSubtestConfirmModal(false);
        setIsSyncingServer(true);

        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now
            .getMinutes()
            .toString()
            .padStart(2, "0")}`;
        setExamEndTimeStr(timeStr);

        const cleanNisn = String(studentSession?.nisn || "").replace(/\D/g, "").trim();

        const finalReport = {
            student: {
                ...studentSession,
                pilihan1: pilihanKampus1,
                pilihan2: pilihanKampus2
            },
            score: scoreResults.scaledScore,
            correct: scoreResults.correct,
            incorrect: scoreResults.incorrect,
            unattempted: scoreResults.unattempted,
            total: scoreResults.total,
            subtestBreakdown: scoreResults.subtestBreakdown,
            violations: violationCount,
            startTime: examStartTimeStr,
            finishTime: timeStr,
            pilihan1: pilihanKampus1,
            pilihan2: pilihanKampus2
        };

        // Simpan langsung ke memori browser agar hasil nilai langsung bisa ditampilkan
        localStorage.setItem("cbt_exam_result", JSON.stringify(finalReport));

        if (cleanNisn) {
            localStorage.removeItem(`cbt_progress_${cleanNisn}`);

            try {
                // Gunakan timeout 3 detik agar tidak menggantung jika server Apps Script lambat
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000);

                await fetch(GOOGLE_SCRIPT_API_URL, {
                    method: "POST",
                    mode: "no-cors",
                    signal: controller.signal,
                    headers: { "Content-Type": "text/plain;charset=utf-8" },
                    body: JSON.stringify({
                        action: "update_student_status",
                        nisn: cleanNisn,
                        status: "Selesai",
                        score: scoreResults.scaledScore,
                        violations: violationCount,
                        waktu_selesai: timeStr,
                        pilihan_kampus_1: pilihanKampus1 || "-",
                        pilihan_kampus_2: pilihanKampus2 || "-"
                    })
                }).catch(() => { });

                clearTimeout(timeoutId);
            } catch (err) {
                console.warn("Sinkronisasi server Apps Script dilewati demi kelancaran rapor:", err);
            }
        }

        // Matikan loading dan tampilkan rapor secara instan
        setIsSyncingServer(false);
        setIsExamCompleted(true);
    };

    const enterExamChamber = async () => {
        if (isSessionLockedByProctor || loadError) return;

        const now = new Date();
        const startStr = `${now.getHours().toString().padStart(2, "0")}:${now
            .getMinutes()
            .toString()
            .padStart(2, "0")}`;
        setExamStartTimeStr(startStr);

        if (studentSession) {
            const updated = { ...studentSession, pilihan1: pilihanKampus1, pilihan2: pilihanKampus2 };
            localStorage.setItem("cbt_student_session", JSON.stringify(updated));
            setStudentSession(updated);

            const cleanNisn = String(studentSession.nisn).replace(/\D/g, "").trim();
            if (cleanNisn) {
                fetch(GOOGLE_SCRIPT_API_URL, {
                    method: "POST",
                    mode: "no-cors",
                    headers: { "Content-Type": "text/plain;charset=utf-8" },
                    body: JSON.stringify({
                        action: "save_student_target",
                        nisn: cleanNisn,
                        pilihan_kampus_1: pilihanKampus1 || "-",
                        pilihan_kampus_2: pilihanKampus2 || "-"
                    })
                }).catch(() => { });
            }
        }

        try {
            if (document.documentElement.requestFullscreen) {
                await document.documentElement.requestFullscreen().catch(() => { });
            }
        } catch { }

        setIsInExam(true);
        setShowViolationModal(false);
    };

    const handleExitToHome = () => {
        setIsExitingToHome(true);
        setTimeout(() => {
            safeExitFullscreen();
            localStorage.removeItem("cbt_student_session");
            sessionStorage.clear();
            router.push("/");
        }, 600);
    };

    const handleResumeExam = () => {
        try {
            if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen().catch(() => { });
            }
        } catch { }
        setShowViolationModal(false);
    };

    const handleSelectBenchmark = (item: PTNProdiBenchmark) => {
        const valueStr = `${item.kampus} - ${item.prodi} (${item.jenjang || "S1"})`;
        if (targetSlotForSelection === 1) {
            setPilihanKampus1(valueStr);
        } else {
            setPilihanKampus2(valueStr);
        }
        setShowPTNDatabaseModal(false);
    };

    const handleSelectOption = (optId: string) => {
        if (isExamLockedPermanently || isSessionLockedByProctor || !currentQ) return;
        setAnswers((prev) => ({ ...prev, [currentQ.id]: optId }));
    };

    const handleToggleDoubtful = () => {
        if (isExamLockedPermanently || isSessionLockedByProctor || !currentQ) return;
        setDoubtfuls((prev) => ({ ...prev, [currentQ.id]: !prev[currentQ.id] }));
    };

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    };

    const fontClasses = {
        normal: { stimulus: "text-xs sm:text-sm leading-relaxed", question: "text-sm sm:text-base font-semibold", option: "text-xs sm:text-sm" },
        large: { stimulus: "text-sm sm:text-base leading-relaxed", question: "text-base sm:text-lg font-semibold", option: "text-sm sm:text-base" },
        xlarge: { stimulus: "text-base sm:text-lg leading-relaxed", question: "text-lg sm:text-xl font-bold", option: "text-base sm:text-lg" }
    }[fontSizeMode];

    const renderAdmissionProbabilityBadge = (targetMinScore: number, studentScore: number) => {
        const diff = studentScore - targetMinScore;
        if (diff >= 15) {
            return {
                status: "Peluang Sangat Tinggi (Aman)",
                isPassed: true,
                badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-300",
                icon: TrendingUp,
                colorText: "text-emerald-700",
                note: `Skor kamu (${studentScore}) memenuhi estimasi passing score (+${diff} poin).`
            };
        } else if (diff >= -20) {
            return {
                status: "Kompetitif (Bersaing Ketat)",
                isPassed: false,
                badgeClass: "bg-amber-50 text-amber-800 border-amber-300",
                icon: Target,
                colorText: "text-amber-700",
                note: `Skor kamu (${studentScore}) berada di ambang batas aman (${diff >= 0 ? `+${diff}` : diff} poin).`
            };
        } else {
            return {
                status: "Perlu Peningkatan Intensif",
                isPassed: false,
                badgeClass: "bg-rose-50 text-rose-800 border-rose-300",
                icon: TrendingDown,
                colorText: "text-rose-700",
                note: `Skor kamu (${studentScore}) belum memenuhi passing score target.`
            };
        }
    };

    const recommendedAlternativePTNs = useMemo(() => {
        if (!ptnBenchmarks || ptnBenchmarks.length === 0) return [];
        return ptnBenchmarks.slice(0, 10).map((b) => {
            const diff = scoreResults.scaledScore - b.passingGradeMin;
            let status = "Perlu Peningkatan";
            let color = "text-rose-600 font-bold";
            if (diff >= 15) {
                status = "Peluang Sangat Tinggi";
                color = "text-emerald-700 font-bold";
            } else if (diff >= -20) {
                status = "Kompetitif";
                color = "text-amber-700 font-bold";
            }
            return { ...b, kelulusanStatus: status, kelulusanColor: color };
        });
    }, [ptnBenchmarks, scoreResults.scaledScore]);

    // TAHAP 1: GERBANG KARANTINA
    if (!isInExam) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans text-slate-800">
                {showPTNDatabaseModal && (
                    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl border border-slate-200 max-w-2xl w-full p-6 space-y-4 shadow-2xl animate-in fade-in max-h-[90vh] flex flex-col">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                                        <BookOpen className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-sm text-slate-900">
                                            Database Resmi SNBT &bull; Target Pilihan {targetSlotForSelection}
                                        </h3>
                                        <p className="text-[11px] text-slate-500">
                                            Menampilkan {filteredModalBenchmarks.length} prodi terdaftar nasional (S1, D4, D3)
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowPTNDatabaseModal(false)}
                                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="space-y-2">
                                <div className="relative">
                                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="text"
                                        placeholder="Cari Kampus (UI, UGM, ITB, PNJ, UNJ) atau Program Studi..."
                                        value={modalSearchQuery}
                                        onChange={(e) => setModalSearchQuery(e.target.value)}
                                        className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-medium outline-none focus:border-blue-700"
                                    />
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                                        <span className="text-[10px] font-mono font-bold text-slate-400 px-1.5">JENJANG:</span>
                                        {(["ALL", "S1", "D4", "D3"] as const).map((j) => (
                                            <button
                                                key={j}
                                                onClick={() => setModalJenjangFilter(j)}
                                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer ${modalJenjangFilter === j ? "bg-indigo-700 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
                                                    }`}
                                            >
                                                {j === "ALL" ? "Semua" : j}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                                        {(["ALL", "SAINTEK", "SOSHUM"] as const).map((r) => (
                                            <button
                                                key={r}
                                                onClick={() => setModalRumpunFilter(r)}
                                                className={`px-3 py-1 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer ${modalRumpunFilter === r ? "bg-white text-blue-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
                                                    }`}
                                            >
                                                {r}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[300px]">
                                {filteredModalBenchmarks.slice(0, 50).map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => handleSelectBenchmark(item)}
                                        className="p-3 rounded-2xl border border-slate-200 hover:border-blue-600 hover:bg-blue-50/40 cursor-pointer transition-all space-y-1.5 text-left group"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <div className="text-xs font-black text-slate-900 group-hover:text-blue-900 flex items-center gap-1.5">
                                                    <span>{item.prodi}</span>
                                                    <span className="px-1.5 py-0.2 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono text-[9.5px] font-bold">
                                                        {item.jenjang || "S1"}
                                                    </span>
                                                </div>
                                                <div className="text-[11px] text-slate-500 font-medium">
                                                    {item.kampus}
                                                </div>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded text-[9.5px] font-mono font-bold shrink-0 ${item.rumpun === "SAINTEK" ? "bg-blue-50 text-blue-800 border border-blue-200" : "bg-amber-50 text-amber-800 border border-amber-200"
                                                }`}>
                                                {item.rumpun}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 text-[10.5px] font-mono">
                                            <div className="text-slate-600">
                                                <span className="text-slate-400 block text-[9.5px]">Daya Tampung:</span>
                                                <strong className="text-slate-800">{item.dayaTampung} Kursi</strong>
                                            </div>
                                            <div className="text-slate-600">
                                                <span className="text-slate-400 block text-[9.5px]">Keketatan:</span>
                                                <strong className="text-rose-700">{formatKeketatan(item.keketatan)}</strong>
                                            </div>
                                            <div className="text-slate-600">
                                                <span className="text-slate-400 block text-[9.5px]">Passing Grade:</span>
                                                <strong className="text-emerald-700">&ge; {item.passingGradeMin}</strong>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {filteredModalBenchmarks.length === 0 && (
                                    <div className="text-center py-12 text-slate-400 text-xs font-medium">
                                        Program studi atau kampus tidak ditemukan. Periksa kata kunci pencarian Anda.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div className="w-full max-w-xl bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-9 space-y-5 text-center relative overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-1.5 bg-[#1e3a8a]" />

                    <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center p-1 mx-auto shadow-xs">
                        <img
                            src="/logo-timsim.jpg"
                            alt="Logo Sekolah"
                            className="w-full h-full object-contain"
                            onError={(e) => {
                                (e.target as any).src = "/images/logo-smam18.png";
                            }}
                        />
                    </div>

                    <div className="space-y-1">
                        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-blue-50 border border-blue-200 font-mono text-[10px] font-bold text-blue-900 tracking-wider">
                            <span>SMA MUHAMMADIYAH 18 JAKARTA</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Karantina Bilik Ujian</h1>
                        <p className="text-xs text-slate-500 max-w-md mx-auto">
                            Peserta: <strong className="text-slate-800">{studentSession?.candidateName || "Peserta"}</strong> ({studentSession?.nisn || "-"})
                        </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2 text-xs">
                        <div className="font-bold text-slate-700 font-mono uppercase text-[11px] flex justify-between">
                            <span>Sesi Ujian:</span>
                            <span className="text-blue-700 font-black">{sessionTitle}</span>
                        </div>
                        <p className="text-slate-600 leading-relaxed text-[11px]">
                            Ujian terdiri dari <strong>{subtestsList.length} subtes bertahap</strong>. Naskah soal disajikan secara instan via server sekolah.
                        </p>
                    </div>

                    {/* KARTU TARGET KAMPUS */}
                    <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 text-left space-y-3.5">
                        <div className="flex items-center justify-between border-b border-blue-200/80 pb-2">
                            <div className="flex items-center gap-2">
                                <GraduationCap className="w-4 h-4 text-blue-800" />
                                <span className="text-xs font-black text-blue-950 uppercase tracking-tight">
                                    Target Program Studi &amp; PTN Impian (SNBT 2026)
                                </span>
                            </div>
                        </div>

                        {/* PILIHAN 1 */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-[11px] font-bold text-slate-700 font-mono">
                                    PILIHAN KAMPUS 1 (PRIORITAS UTAMA):
                                </label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setTargetSlotForSelection(1);
                                        setShowPTNDatabaseModal(true);
                                    }}
                                    className="text-[10.5px] font-bold text-blue-700 hover:text-blue-900 inline-flex items-center gap-1 cursor-pointer"
                                >
                                    <Search className="w-3 h-3" />
                                    <span>Pilih dari Database</span>
                                </button>
                            </div>
                            <input
                                list="ptn-options-list"
                                type="text"
                                placeholder="Pilih atau ketik: Contoh: UI - Pendidikan Dokter (S1)"
                                value={pilihanKampus1}
                                onChange={(e) => setPilihanKampus1(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 font-semibold text-slate-900 focus:border-blue-700 outline-none text-xs"
                            />

                            {benchmarkData1 && (
                                <div className="p-2.5 rounded-xl bg-white border border-blue-200 space-y-1 shadow-2xs animate-in fade-in">
                                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-800">
                                        <div className="flex items-center gap-1.5">
                                            <span>{benchmarkData1.prodi} &bull; {benchmarkData1.kampus}</span>
                                            <span className="px-1.5 py-0.2 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono text-[9px] font-bold">
                                                {benchmarkData1.jenjang || "S1"}
                                            </span>
                                        </div>
                                        <span className="font-mono text-[10px] text-blue-700 font-black">{benchmarkData1.rumpun}</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono pt-0.5 border-t border-slate-100">
                                        <div>
                                            <span className="text-slate-400 block text-[9px]">Daya Tampung:</span>
                                            <strong className="text-slate-800">{benchmarkData1.dayaTampung} Kursi</strong>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 block text-[9px]">Keketatan:</span>
                                            <strong className="text-rose-600">{formatKeketatan(benchmarkData1.keketatan)}</strong>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 block text-[9px]">Passing Grade:</span>
                                            <strong className="text-emerald-700">&ge; {benchmarkData1.passingGradeMin}</strong>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* PILIHAN 2 */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-[11px] font-bold text-slate-700 font-mono">
                                    PILIHAN KAMPUS 2 (ALTERNATIF):
                                </label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setTargetSlotForSelection(2);
                                        setShowPTNDatabaseModal(true);
                                    }}
                                    className="text-[10.5px] font-bold text-blue-700 hover:text-blue-900 inline-flex items-center gap-1 cursor-pointer"
                                >
                                    <Search className="w-3 h-3" />
                                    <span>Pilih dari Database</span>
                                </button>
                            </div>
                            <input
                                list="ptn-options-list"
                                type="text"
                                placeholder="Pilih atau ketik: Contoh: PNJ - Teknik Informatika (D4)"
                                value={pilihanKampus2}
                                onChange={(e) => setPilihanKampus2(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 font-semibold text-slate-900 focus:border-blue-700 outline-none text-xs"
                            />

                            {benchmarkData2 && (
                                <div className="p-2.5 rounded-xl bg-white border border-blue-200 space-y-1 shadow-2xs animate-in fade-in">
                                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-800">
                                        <div className="flex items-center gap-1.5">
                                            <span>{benchmarkData2.prodi} &bull; {benchmarkData2.kampus}</span>
                                            <span className="px-1.5 py-0.2 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono text-[9px] font-bold">
                                                {benchmarkData2.jenjang || "S1"}
                                            </span>
                                        </div>
                                        <span className="font-mono text-[10px] text-blue-700 font-black">{benchmarkData2.rumpun}</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono pt-0.5 border-t border-slate-100">
                                        <div>
                                            <span className="text-slate-400 block text-[9px]">Daya Tampung:</span>
                                            <strong className="text-slate-800">{benchmarkData2.dayaTampung} Kursi</strong>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 block text-[9px]">Keketatan:</span>
                                            <strong className="text-rose-600">{formatKeketatan(benchmarkData2.keketatan)}</strong>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 block text-[9px]">Passing Grade:</span>
                                            <strong className="text-emerald-700">&ge; {benchmarkData2.passingGradeMin}</strong>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <datalist id="ptn-options-list">
                            {ptnBenchmarks.slice(0, 300).map((item) => (
                                <option key={item.id} value={`${item.kampus} - ${item.prodi} (${item.jenjang || "S1"})`}>
                                    Jenjang: {item.jenjang || "S1"} | Keketatan: {formatKeketatan(item.keketatan)} | Min Skor: &ge; {item.passingGradeMin}
                                </option>
                            ))}
                        </datalist>
                    </div>

                    {loadError ? (
                        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2.5 text-left">
                            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
                            <span>{loadError}</span>
                        </div>
                    ) : isSessionLockedByProctor ? (
                        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-800 text-xs font-bold flex items-center gap-2.5 text-left">
                            <Lock className="w-5 h-5 shrink-0 text-amber-600" />
                            <span>{sessionLockMessage || "Akses ujian sedang ditutup oleh Pengawas."}</span>
                        </div>
                    ) : null}

                    <div className="pt-1">
                        <button
                            onClick={enterExamChamber}
                            disabled={isLoading || Boolean(loadError) || isSessionLockedByProctor}
                            className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer ${isLoading || loadError || isSessionLockedByProctor
                                ? "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none"
                                : "bg-[#1e3a8a] hover:bg-blue-900 text-white shadow-blue-900/25 active:scale-[0.99]"
                                }`}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Menyiapkan Lembar Soal...</span>
                                </>
                            ) : isSessionLockedByProctor ? (
                                <>
                                    <Lock className="w-4 h-4" />
                                    <span>Sesi Dikunci Pengawas</span>
                                </>
                            ) : (
                                <>
                                    <Maximize2 className="w-4 h-4" />
                                    <span>{Object.keys(answers).length > 0 ? "Lanjutkan Pengerjaan Soal" : "Kunci Layar Penuh & Mulai Ujian"}</span>
                                </>
                            )}
                        </button>
                    </div>

                    <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between border-t pt-3">
                        <span>Kiosk Shield Siap</span>
                        <button
                            onClick={() => {
                                safeExitFullscreen();
                                localStorage.removeItem("cbt_student_session");
                                sessionStorage.clear();
                                router.push("/login");
                            }}
                            className="text-blue-700 hover:underline cursor-pointer"
                        >
                            Ganti Akun
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // TAHAP 2 & 3: BILIK SOAL
    return (
        <div className="min-h-screen bg-slate-100 flex flex-col font-sans select-none text-slate-800 relative">
            {isSyncingServer && (
                <div className="fixed inset-0 z-[999999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl border border-slate-200 max-w-sm w-full p-8 text-center space-y-4 shadow-2xl animate-in fade-in">
                        <Loader2 className="w-12 h-12 text-[#1e3a8a] animate-spin mx-auto" />
                        <div className="space-y-1">
                            <h3 className="text-base font-black text-slate-900">Menyinkronkan Jawaban...</h3>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                Menghitung nilai dan menyimpan hasil lembar ujian. Harap tunggu...
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {showViolationModal && (
                <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl border border-rose-200 max-w-md w-full p-6 text-center space-y-4 shadow-2xl">
                        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                            <ShieldAlert className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-black text-slate-900">
                            {isExamLockedPermanently ? "Ujian Dikunci Permanen!" : `Peringatan Pelanggaran (${violationCount}/3)`}
                        </h3>
                        <p className="text-xs text-slate-600 leading-relaxed">
                            Dilarang meninggalkan layar penuh atau berpindah tab aplikasi. Aktivitas ini tercatat di monitor proktor.
                        </p>
                        {isExamLockedPermanently ? (
                            <button
                                onClick={executeFinalSubmission}
                                className="w-full py-3 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs cursor-pointer"
                            >
                                Kirim Lembar Ujian Sekarang
                            </button>
                        ) : (
                            <button
                                onClick={handleResumeExam}
                                className="w-full py-3 rounded-xl bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold text-xs cursor-pointer"
                            >
                                Kunci Kembali Layar Penuh
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* HEADER BILIK */}
            <header className="bg-white border-b border-slate-200 px-4 sm:px-8 h-16 flex items-center justify-between sticky top-0 z-40 shadow-xs">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 font-black flex items-center justify-center text-xs">
                        CBT
                    </div>
                    <div>
                        <div className="font-bold text-xs sm:text-sm text-slate-900">{activeSubtestConfig.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                            Subtes {currentSubtestIndex + 1} dari {subtestsList.length} &bull; {studentSession?.candidateName}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center bg-slate-100 rounded-xl p-1 gap-1 border border-slate-200">
                        {(["normal", "large", "xlarge"] as const).map((mode) => (
                            <button
                                key={mode}
                                onClick={() => setFontSizeMode(mode)}
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer ${fontSizeMode === mode ? "bg-white text-blue-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                                    }`}
                            >
                                {mode === "normal" ? "A" : mode === "large" ? "A+" : "A++"}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono font-bold text-xs sm:text-sm bg-blue-50 border-blue-200 text-blue-900">
                        <Clock className="w-4 h-4" />
                        <span>{formatTime(subtestTimeLeft)}</span>
                    </div>

                    <button
                        onClick={() => setShowSubtestConfirmModal(true)}
                        className="px-3.5 py-1.5 rounded-xl bg-[#1e3a8a] hover:bg-blue-900 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                    >
                        <span>{currentSubtestIndex === subtestsList.length - 1 ? "Selesai Ujian" : "Lanjut Subtes"}</span>
                        <FastForward className="w-3.5 h-3.5" />
                    </button>
                </div>
            </header>

            {/* AREA SOAL & MATRIX */}
            <div className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 p-5 sm:p-8 space-y-5 shadow-xs">
                    <div className="font-mono text-xs font-bold text-blue-900 border-b border-slate-100 pb-3 flex justify-between items-center">
                        <span>SOAL NOMOR {currentQIndexInSubtest + 1}</span>
                        <span className="text-slate-400 font-normal">Subtes: {activeSubtestConfig.code} ({currentQIndexInSubtest + 1} dari {currentSubtestQuestions.length})</span>
                    </div>

                    {currentQ?.stimulus && (
                        <div className={`p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 whitespace-pre-line leading-relaxed ${fontClasses.stimulus}`}>
                            <RenderLatex content={currentQ.stimulus} />
                        </div>
                    )}

                    {currentQ?.imageUrl && currentQ?.imagePosition === "above" && (
                        <div className="flex justify-center p-3 bg-slate-50 rounded-2xl border border-slate-200">
                            <img src={currentQ.imageUrl} alt="Diagram Soal" className="max-h-72 object-contain rounded-xl" />
                        </div>
                    )}

                    <div className={`text-slate-900 leading-snug ${fontClasses.question}`}>
                        <RenderLatex content={currentQ?.question} />
                    </div>

                    {currentQ?.imageUrl && currentQ?.imagePosition === "below" && (
                        <div className="flex justify-center p-3 bg-slate-50 rounded-2xl border border-slate-200">
                            <img src={currentQ.imageUrl} alt="Diagram Soal" className="max-h-72 object-contain rounded-xl" />
                        </div>
                    )}

                    <div className="space-y-2.5 pt-2">
                        {currentQ?.options?.map((opt) => {
                            const isSelected = answers[currentQ.id] === opt.id;
                            return (
                                <button
                                    key={opt.id}
                                    onClick={() => handleSelectOption(opt.id)}
                                    className={`w-full text-left p-3.5 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer ${fontClasses.option} ${isSelected
                                        ? "bg-blue-50 border-blue-700 text-blue-950 font-bold ring-2 ring-blue-700/20"
                                        : "bg-white hover:bg-slate-50 border-slate-200 text-slate-800"
                                        }`}
                                >
                                    <span
                                        className={`w-7 h-7 rounded-xl border font-mono font-bold flex items-center justify-center shrink-0 ${isSelected ? "bg-blue-700 text-white border-blue-700" : "bg-slate-100 text-slate-600 border-slate-200"
                                            }`}
                                    >
                                        {opt.id}
                                    </span>
                                    <div className="flex-1">
                                        {opt.imageUrl ? (
                                            <img src={opt.imageUrl} alt={`Opsi ${opt.id}`} className="max-h-24 object-contain rounded-lg" />
                                        ) : (
                                            <RenderLatex content={opt.text} />
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* BARIS TOMBOL NAVIGASI DENGAN STYLING KONTRAS */}
                    <div className="pt-4 flex justify-between items-center border-t border-slate-100 gap-3">
                        <button
                            onClick={() => setCurrentQIndexInSubtest((i) => Math.max(0, i - 1))}
                            disabled={currentQIndexInSubtest === 0}
                            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                        >
                            &larr; Sebelumnya
                        </button>

                        <button
                            onClick={handleToggleDoubtful}
                            className={`px-4 py-2.5 border rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${doubtfuls[currentQ?.id]
                                ? "bg-amber-400 text-amber-950 border-amber-500 font-black ring-2 ring-amber-300"
                                : "bg-slate-100 hover:bg-amber-50 border-slate-300 text-slate-700 hover:border-amber-400"
                                }`}
                        >
                            {doubtfuls[currentQ?.id] ? "✓ Ragu-Ragu (Ditandai)" : "Ragu-Ragu"}
                        </button>

                        <button
                            onClick={() => {
                                if (currentQIndexInSubtest < currentSubtestQuestions.length - 1) {
                                    setCurrentQIndexInSubtest((i) => i + 1);
                                } else {
                                    setShowSubtestConfirmModal(true);
                                }
                            }}
                            className="px-5 py-2.5 bg-[#1e3a8a] hover:bg-blue-900 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                        >
                            {currentQIndexInSubtest < currentSubtestQuestions.length - 1 ? "Berikutnya →" : "Selesai Subtes"}
                        </button>
                    </div>
                </div>

                {/* MATRIX NOMOR SOAL KHUSUS SUBTES AKTIF */}
                <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 p-5 space-y-4 shadow-xs sticky top-24">
                    <div className="font-bold text-xs text-slate-800 flex justify-between items-center border-b border-slate-100 pb-3">
                        <span>Daftar Soal Subtes {activeSubtestConfig.code}</span>
                        <span className="font-mono text-blue-700 font-bold">{currentSubtestQuestions.length} Butir</span>
                    </div>

                    <div className="grid grid-cols-5 gap-2 max-h-[380px] overflow-y-auto p-1">
                        {currentSubtestQuestions.map((q, idx) => {
                            const isCurrent = currentQIndexInSubtest === idx;
                            const isAnswered = Boolean(answers[q.id]);
                            const isDoubt = Boolean(doubtfuls[q.id]);

                            return (
                                <button
                                    key={q.id}
                                    onClick={() => setCurrentQIndexInSubtest(idx)}
                                    className={`h-11 rounded-xl border font-mono text-xs font-bold cursor-pointer transition-all ${isCurrent ? "ring-2 ring-blue-700 border-blue-700" : "border-slate-200"
                                        } ${isDoubt
                                            ? "bg-amber-400 text-amber-950 border-amber-400"
                                            : isAnswered
                                                ? "bg-blue-700 text-white border-blue-700"
                                                : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                                        }`}
                                >
                                    {idx + 1}
                                </button>
                            );
                        })}
                    </div>

                    <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-1 text-[10px] font-mono text-slate-500">
                        <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded bg-blue-700 inline-block" />
                            <span>Terjawab</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded bg-amber-400 inline-block" />
                            <span>Ragu</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded bg-slate-100 border border-slate-300 inline-block" />
                            <span>Kosong</span>
                        </div>
                    </div>
                </div>
            </div>

            {showSubtestConfirmModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 text-center shadow-2xl border border-slate-100">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-900 flex items-center justify-center mx-auto">
                            <FastForward className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold text-base text-slate-900">
                            {currentSubtestIndex === subtestsList.length - 1
                                ? "Kumpulkan Seluruh Lembar Ujian?"
                                : `Kumpulkan Subtes ${activeSubtestConfig.code}?`}
                        </h3>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            {currentSubtestIndex === subtestsList.length - 1
                                ? "Nilai resmi Anda akan dihitung dan ditampilkan di layar."
                                : "Setelah dikonfirmasi, Anda akan beralih ke subtes berikutnya dan jawaban subtes ini tidak dapat diubah lagi."}
                        </p>
                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={() => setShowSubtestConfirmModal(false)}
                                className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                            >
                                Cek Kembali
                            </button>
                            <button
                                onClick={handleNextSubtestManual}
                                className="w-1/2 py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-blue-900 text-white text-xs font-bold cursor-pointer shadow-xs"
                            >
                                Ya, Kumpulkan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function OfficialExamChamberPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans text-slate-300">
                    <div className="flex items-center gap-3 bg-white/10 px-5 py-3 rounded-2xl border border-white/10 shadow-xl backdrop-blur-md">
                        <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                        <span className="text-xs font-bold font-mono tracking-wide">
                            Memuat Bilik Ujian Resmi SMA Muhammadiyah 18...
                        </span>
                    </div>
                </div>
            }
        >
            <OfficialExamChamberContent />
        </Suspense>
    );
}