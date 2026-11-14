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
    Eye,
    LayoutGrid,
    Play
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

// KUOTA RESMI 7 SUBTES SNBT (TOTAL 160 BUTIR SOAL)
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
                            className="block my-2 overflow-x-auto py-1 max-w-full text-center"
                            dangerouslySetInnerHTML={{ __html: html }}
                        />
                    );
                } else if (part.startsWith("$") && part.endsWith("$")) {
                    const math = part.slice(1, -1);
                    const html = katex.renderToString(math, { displayMode: false, throwOnError: false });
                    return (
                        <span
                            key={idx}
                            className="inline-block px-0.5 align-middle max-w-full overflow-x-auto"
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

    // State layar jeda antar-subtes
    const [isWaitingNextSubtest, setIsWaitingNextSubtest] = useState(false);

    const [timeSpentPerSubtest, setTimeSpentPerSubtest] = useState<Record<string, number>>({});
    const [answers, setAnswers] = useState<Record<string | number, string>>({});
    const [doubtfuls, setDoubtfuls] = useState<Record<string | number, boolean>>({});
    const [fontSizeMode, setFontSizeMode] = useState<"normal" | "large" | "xlarge">("normal");

    // Laci kisi-kisi untuk tablet & HP
    const [showMobileMatrix, setShowMobileMatrix] = useState(false);

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

    const mapRawToQuestionItems = (rawData: any[]): QuestionItem[] => {
        const categoryMap: Record<string, string> = {
            PU: "Tes Potensi Skolastik",
            PPU: "Tes Potensi Skolastik",
            PBM: "Tes Potensi Skolastik",
            PK: "Tes Potensi Skolastik",
            LIT_INDO: "Tes Literasi",
            LIT_ENG: "Tes Literasi",
            PM: "Penalaran Matematika"
        };

        return rawData.map((item: any, idx: number) => {
            const subCode = String(item.subtes_code || "PU").trim().toUpperCase();
            const localNo = Number(item.no_soal) || idx + 1;

            return {
                id: `${subCode}_${localNo}`,
                localNo,
                subtest: subCode,
                subtestCategory: categoryMap[subCode] || "Tes Potensi Skolastik",
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

        fetch(`/api/session?_t=${Date.now()}`, { cache: "no-store" })
            .then((r) => r.json())
            .then((res) => {
                if (res.status === "success" && res.data) {
                    if (res.data.status_akses === "TERKUNCI") {
                        setIsSessionLockedByProctor(true);
                        setSessionLockMessage("Akses ruang ujian sedang dikunci oleh Pengawas.");
                    }
                    if (res.data.waktu_selesai) {
                        const endTimestamp = new Date(res.data.waktu_selesai).getTime();
                        if (!isNaN(endTimestamp)) setHardEndTime(endTimestamp);
                    }
                }
            })
            .catch(() => { });

        const localDuration = localStorage.getItem(`durasi_${activePkg}`);
        if (localDuration) {
            try {
                const parsedDur = JSON.parse(localDuration);
                if (Array.isArray(parsedDur) && parsedDur.length > 0) setSubtestsList(parsedDur);
            } catch { }
        }

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

        setIsLoading(true);
        fetch(`/api/questions?paket=${activePkg}&_t=${Date.now()}`, { cache: "no-store" })
            .then((res) => res.json())
            .then((res) => {
                if (res.status === "success" && Array.isArray(res.data) && res.data.length > 0) {
                    const sanitized = mapRawToQuestionItems(res.data);
                    setAllQuestions(sanitized);
                    setLoadError("");
                    localStorage.setItem(`cbt_questions_${activePkg}`, JSON.stringify(res.data));
                } else {
                    const cached = localStorage.getItem(`cbt_questions_${activePkg}`);
                    if (cached) {
                        setAllQuestions(mapRawToQuestionItems(JSON.parse(cached)));
                    } else {
                        setLoadError("Naskah soal belum tersedia di server.");
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
        const filtered = allQuestions
            .filter((q) => q.subtest === activeSubtestConfig.code)
            .sort((a, b) => a.localNo - b.localNo);
        return filtered.length > 0 ? filtered : allQuestions;
    }, [allQuestions, activeSubtestConfig]);

    // Ringkasan jawaban subtes aktif untuk layar jeda antar-subtes
    const currentSubtestSummary = useMemo(() => {
        let answered = 0;
        let doubtful = 0;
        currentSubtestQuestions.forEach((q) => {
            if (answers[q.id]) answered++;
            if (doubtfuls[q.id]) doubtful++;
        });
        return {
            answered,
            doubtful,
            empty: currentSubtestQuestions.length - answered,
            total: currentSubtestQuestions.length
        };
    }, [currentSubtestQuestions, answers, doubtfuls]);

    const currentQ = currentSubtestQuestions[currentQIndexInSubtest] || currentSubtestQuestions[0];

    // Ganti Subtes (Manual) -> Munculkan layar jeda dulu jika bukan subtes terakhir
    const handleNextSubtestManual = useCallback(() => {
        setShowSubtestConfirmModal(false);
        if (currentSubtestIndex < subtestsList.length - 1) {
            setIsWaitingNextSubtest(true);
        } else {
            executeFinalSubmission();
        }
    }, [currentSubtestIndex, subtestsList]);

    // Mulai subtes berikutnya dari layar jeda
    const handleStartNextSubtest = useCallback(() => {
        const nextIdx = currentSubtestIndex + 1;
        setCurrentSubtestIndex(nextIdx);
        setCurrentQIndexInSubtest(0);
        const nextDurationMin = subtestsList[nextIdx]?.defaultDurationMinutes || 20;
        setSubtestTimeLeft(Math.round(nextDurationMin * 60));
        setIsWaitingNextSubtest(false);
    }, [currentSubtestIndex, subtestsList]);

    // TIMER PER DETIK (Jeda saat isWaitingNextSubtest = true)
    useEffect(() => {
        if (!isInExam || isSyncingServer || isExamCompleted || isExamLockedPermanently || isSessionLockedByProctor || isWaitingNextSubtest) return;

        const timer = setInterval(() => {
            if (hardEndTime && Date.now() >= hardEndTime) {
                clearInterval(timer);
                alert("Waktu batas pelaksanaan sesi ujian telah berakhir. Lembar ujian otomatis dikumpulkan.");
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
    }, [isInExam, isSyncingServer, isExamCompleted, isExamLockedPermanently, isSessionLockedByProctor, isWaitingNextSubtest, hardEndTime, activeSubtestConfig]);

    // AUTO ADVANCE KETIKA TIMER HABIS -> Munculkan layar jeda antar-subtes
    useEffect(() => {
        if (!isInExam || isSyncingServer || isExamCompleted || isWaitingNextSubtest) return;

        if (subtestTimeLeft === 0) {
            if (currentSubtestIndex < subtestsList.length - 1) {
                setIsWaitingNextSubtest(true);
            } else {
                executeFinalSubmission();
            }
        }
    }, [subtestTimeLeft, isInExam, isSyncingServer, isExamCompleted, isWaitingNextSubtest, currentSubtestIndex, subtestsList]);

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

                fetch("/api/students", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
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

    const executeFinalSubmission = () => {
        setShowSubtestConfirmModal(false);
        setIsWaitingNextSubtest(false);

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

        localStorage.setItem("cbt_exam_result", JSON.stringify(finalReport));

        if (cleanNisn) {
            localStorage.removeItem(`cbt_progress_${cleanNisn}`);

            const gasPayload = {
                action: "update_student_status",
                nisn: cleanNisn,
                nama_siswa: studentSession?.candidateName || "-",
                kelas: studentSession?.kelas || "XII",
                paket: studentSession?.packageId || "PAKET_1",
                status: "Selesai",
                nilai_total: scoreResults.scaledScore,
                nilai_tps: scoreResults.tpsAvg,
                nilai_literasi: scoreResults.litAvg,
                skor_pu: scoreResults.subtestBreakdown["PU"]?.scoreIRT || 200,
                skor_ppu: scoreResults.subtestBreakdown["PPU"]?.scoreIRT || 200,
                skor_pbm: scoreResults.subtestBreakdown["PBM"]?.scoreIRT || 200,
                skor_pk: scoreResults.subtestBreakdown["PK"]?.scoreIRT || 200,
                skor_lit_indo: scoreResults.subtestBreakdown["LIT_INDO"]?.scoreIRT || 200,
                skor_lit_eng: scoreResults.subtestBreakdown["LIT_ENG"]?.scoreIRT || 200,
                skor_pm: scoreResults.subtestBreakdown["PM"]?.scoreIRT || 200,
                benar: scoreResults.correct,
                salah: scoreResults.incorrect,
                kosong: scoreResults.unattempted,
                violations: violationCount,
                waktu_mulai: examStartTimeStr || "-",
                waktu_selesai: timeStr,
                pilihan_kampus_1: pilihanKampus1 || "-",
                pilihan_kampus_2: pilihanKampus2 || "-"
            };

            fetch("/api/students", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "finish_exam",
                    student: {
                        nisn: cleanNisn,
                        nama: studentSession?.candidateName || "-",
                        kelas: studentSession?.kelas || "XII",
                        paket: studentSession?.packageId || "PAKET_1",
                        score: scoreResults.scaledScore,
                        nilai_tps: scoreResults.tpsAvg,
                        nilai_literasi: scoreResults.litAvg,
                        skor_pu: scoreResults.subtestBreakdown["PU"]?.scoreIRT || 200,
                        skor_ppu: scoreResults.subtestBreakdown["PPU"]?.scoreIRT || 200,
                        skor_pbm: scoreResults.subtestBreakdown["PBM"]?.scoreIRT || 200,
                        skor_pk: scoreResults.subtestBreakdown["PK"]?.scoreIRT || 200,
                        skor_lit_indo: scoreResults.subtestBreakdown["LIT_INDO"]?.scoreIRT || 200,
                        skor_lit_eng: scoreResults.subtestBreakdown["LIT_ENG"]?.scoreIRT || 200,
                        skor_pm: scoreResults.subtestBreakdown["PM"]?.scoreIRT || 200,
                        benar: scoreResults.correct,
                        salah: scoreResults.incorrect,
                        kosong: scoreResults.unattempted,
                        violations: violationCount,
                        waktu_mulai: examStartTimeStr || "-",
                        waktu_selesai: timeStr,
                        pilihan_kampus_1: pilihanKampus1 || "-",
                        pilihan_kampus_2: pilihanKampus2 || "-"
                    }
                })
            }).catch(() => { });
        }

        safeExitFullscreen();
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
                fetch("/api/students", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
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

    // TAHAP 1: GERBANG KARANTINA (RESPONSIF MOBILE / TABLET / LAPTOP)
    if (!isInExam) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center p-3.5 sm:p-6 font-sans text-slate-800">
                {showPTNDatabaseModal && (
                    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3.5 sm:p-4">
                        <div className="bg-white rounded-3xl border border-slate-200 max-w-2xl w-full p-4 sm:p-6 space-y-4 shadow-2xl animate-in fade-in max-h-[92vh] flex flex-col text-left">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold shrink-0">
                                        <BookOpen className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-xs sm:text-sm text-slate-900 leading-tight">
                                            Database Resmi SNBT • Target Pilihan {targetSlotForSelection}
                                        </h3>
                                        <p className="text-[10px] sm:text-[11px] text-slate-500">
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
                                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
                                        <span className="text-[9.5px] font-mono font-bold text-slate-400 px-1 shrink-0">JENJANG:</span>
                                        {(["ALL", "S1", "D4", "D3"] as const).map((j) => (
                                            <button
                                                key={j}
                                                onClick={() => setModalJenjangFilter(j)}
                                                className={`px-2 py-0.5 rounded-lg text-[9.5px] font-bold font-mono transition-all cursor-pointer shrink-0 ${modalJenjangFilter === j ? "bg-indigo-700 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
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
                                                className={`px-2.5 py-0.5 rounded-lg text-[9.5px] font-bold font-mono transition-all cursor-pointer ${modalRumpunFilter === r ? "bg-white text-blue-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
                                                    }`}
                                            >
                                                {r}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[260px]">
                                {filteredModalBenchmarks.slice(0, 50).map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => handleSelectBenchmark(item)}
                                        className="p-3 rounded-2xl border border-slate-200 hover:border-blue-600 hover:bg-blue-50/40 cursor-pointer transition-all space-y-1.5 text-left group"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <div className="text-xs font-black text-slate-900 group-hover:text-blue-900 flex items-center gap-1.5 flex-wrap">
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
                                                <strong className="text-emerald-700">≥ {item.passingGradeMin}</strong>
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

                <div className="w-full max-w-xl bg-white rounded-3xl border border-slate-200 shadow-xl p-5 sm:p-9 space-y-4 sm:space-y-5 text-center relative overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-1.5 bg-[#1e3a8a]" />

                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center p-1 mx-auto shadow-xs">
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
                        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-blue-50 border border-blue-200 font-mono text-[9.5px] sm:text-[10px] font-bold text-blue-900 tracking-wider">
                            <span>SMA MUHAMMADIYAH 18 JAKARTA</span>
                        </div>
                        <h1 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">Karantina Bilik Ujian</h1>
                        <p className="text-xs text-slate-500 max-w-md mx-auto truncate">
                            Peserta: <strong className="text-slate-800">{studentSession?.candidateName || "Peserta"}</strong> ({studentSession?.nisn || "-"})
                        </p>
                    </div>

                    <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-1.5 text-xs">
                        <div className="font-bold text-slate-700 font-mono uppercase text-[10.5px] sm:text-[11px] flex justify-between">
                            <span>Sesi Ujian:</span>
                            <span className="text-blue-700 font-black">{sessionTitle}</span>
                        </div>
                        <p className="text-slate-600 leading-relaxed text-[10.5px] sm:text-[11px]">
                            Ujian terdiri dari <strong>{subtestsList.length} subtes bertahap</strong>. Naskah soal disajikan secara instan via server lokal sekolah.
                        </p>
                    </div>

                    {/* KARTU TARGET KAMPUS */}
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-blue-50/70 border border-blue-200 text-left space-y-3">
                        <div className="flex items-center justify-between border-b border-blue-200/80 pb-2">
                            <div className="flex items-center gap-2">
                                <GraduationCap className="w-4 h-4 text-blue-800 shrink-0" />
                                <span className="text-[11px] sm:text-xs font-black text-blue-950 uppercase tracking-tight">
                                    Target Program Studi & PTN Impian (SNBT 2026)
                                </span>
                            </div>
                        </div>

                        {/* PILIHAN 1 */}
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <label className="text-[10.5px] sm:text-[11px] font-bold text-slate-700 font-mono">
                                    PILIHAN KAMPUS 1 (PRIORITAS UTAMA):
                                </label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setTargetSlotForSelection(1);
                                        setShowPTNDatabaseModal(true);
                                    }}
                                    className="text-[10px] sm:text-[10.5px] font-bold text-blue-700 hover:text-blue-900 inline-flex items-center gap-1 cursor-pointer"
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
                                        <div className="flex items-center gap-1.5 truncate">
                                            <span>{benchmarkData1.prodi} • {benchmarkData1.kampus}</span>
                                            <span className="px-1.5 py-0.2 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono text-[9px] font-bold">
                                                {benchmarkData1.jenjang || "S1"}
                                            </span>
                                        </div>
                                        <span className="font-mono text-[10px] text-blue-700 font-black shrink-0">{benchmarkData1.rumpun}</span>
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
                                            <strong className="text-emerald-700">≥ {benchmarkData1.passingGradeMin}</strong>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* PILIHAN 2 */}
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <label className="text-[10.5px] sm:text-[11px] font-bold text-slate-700 font-mono">
                                    PILIHAN KAMPUS 2 (ALTERNATIF):
                                </label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setTargetSlotForSelection(2);
                                        setShowPTNDatabaseModal(true);
                                    }}
                                    className="text-[10px] sm:text-[10.5px] font-bold text-blue-700 hover:text-blue-900 inline-flex items-center gap-1 cursor-pointer"
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
                                        <div className="flex items-center gap-1.5 truncate">
                                            <span>{benchmarkData2.prodi} • {benchmarkData2.kampus}</span>
                                            <span className="px-1.5 py-0.2 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono text-[9px] font-bold">
                                                {benchmarkData2.jenjang || "S1"}
                                            </span>
                                        </div>
                                        <span className="font-mono text-[10px] text-blue-700 font-black shrink-0">{benchmarkData2.rumpun}</span>
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
                                            <strong className="text-emerald-700">≥ {benchmarkData2.passingGradeMin}</strong>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <datalist id="ptn-options-list">
                            {ptnBenchmarks.slice(0, 300).map((item) => (
                                <option key={item.id} value={`${item.kampus} - ${item.prodi} (${item.jenjang || "S1"})`}>
                                    Jenjang: {item.jenjang || "S1"} | Keketatan: {formatKeketatan(item.keketatan)} | Min Skor: ≥ {item.passingGradeMin}
                                </option>
                            ))}
                        </datalist>
                    </div>

                    {loadError ? (
                        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2.5 text-left">
                            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
                            <span>{loadError}</span>
                        </div>
                    ) : isSessionLockedByProctor ? (
                        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-800 text-xs font-bold flex items-center gap-2.5 text-left">
                            <Lock className="w-5 h-5 shrink-0 text-amber-600" />
                            <span>{sessionLockMessage || "Akses ujian sedang ditutup oleh Pengawas."}</span>
                        </div>
                    ) : null}

                    <div className="pt-1">
                        <button
                            onClick={enterExamChamber}
                            disabled={isLoading || Boolean(loadError) || isSessionLockedByProctor}
                            className={`w-full py-3.5 px-6 rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer ${isLoading || loadError || isSessionLockedByProctor
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

                    <div className="text-[10px] sm:text-[11px] font-mono text-slate-400 flex items-center justify-between border-t pt-2.5">
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

    // LAYAR JEDA TRANSISI ANTAR-SUBTES (DITAMBAHKAN SESUAI REFERENSI)
    if (isWaitingNextSubtest) {
        const finishedSubtest = subtestsList[currentSubtestIndex];
        const nextSubtest = subtestsList[currentSubtestIndex + 1];
        const nextSubtestQCount = allQuestions.filter((q) => q.subtest === nextSubtest?.code).length;

        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center p-3.5 sm:p-4 font-sans text-slate-800">
                <div className="w-full max-w-xl bg-white rounded-3xl border-2 border-blue-200 shadow-2xl p-6 sm:p-9 space-y-6 animate-in zoom-in-95">
                    <div className="text-center space-y-2">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <div className="font-mono text-xs font-bold text-slate-500 uppercase">
                            Subtes {currentSubtestIndex + 1} dari {subtestsList.length} Selesai
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                            {finishedSubtest.name} Telah Terkunci
                        </h2>
                        <p className="text-xs text-slate-500">
                            Lembar jawaban subtes ini sudah disimpan permanen.
                        </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center font-mono text-xs">
                        <div className="p-2 rounded-xl bg-white border border-slate-200">
                            <div className="text-[10px] text-slate-400 font-bold">DIJAWAB</div>
                            <div className="text-lg font-black text-blue-700">{currentSubtestSummary.answered}</div>
                        </div>
                        <div className="p-2 rounded-xl bg-white border border-slate-200">
                            <div className="text-[10px] text-slate-400 font-bold">RAGU-RAGU</div>
                            <div className="text-lg font-black text-amber-600">{currentSubtestSummary.doubtful}</div>
                        </div>
                        <div className="p-2 rounded-xl bg-white border border-slate-200">
                            <div className="text-[10px] text-slate-400 font-bold">KOSONG</div>
                            <div className="text-lg font-black text-rose-600">{currentSubtestSummary.empty}</div>
                        </div>
                    </div>

                    {nextSubtest && (
                        <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 space-y-2 text-xs text-left">
                            <div className="flex items-center gap-2 font-bold text-blue-900 text-sm">
                                <Clock className="w-4 h-4 text-blue-700 shrink-0" />
                                <span>Subtes Berikutnya: {nextSubtest.name}</span>
                            </div>
                            <div className="text-slate-600 leading-relaxed pl-6 space-y-1">
                                <div>• Alokasi Waktu: <strong>{nextSubtest.defaultDurationMinutes} Menit</strong></div>
                                <div>• Jumlah Butir: <strong>{nextSubtestQCount} Butir Soal</strong></div>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleStartNextSubtest}
                        className="w-full py-3.5 px-6 rounded-2xl bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold text-sm shadow-lg shadow-blue-900/25 cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                    >
                        <Play className="w-4 h-4 fill-white" />
                        <span>Mulai Mengerjakan Subtes {currentSubtestIndex + 2}: {nextSubtest?.code}</span>
                    </button>
                </div>
            </div>
        );
    }

    // TAHAP 4: RAPOR SKOR LENGKAP & EVALUASI DIAGNOSTIK
    if (isExamCompleted) {
        const p1Eval = benchmarkData1 ? renderAdmissionProbabilityBadge(benchmarkData1.passingGradeMin, scoreResults.scaledScore) : null;
        const p2Eval = benchmarkData2 ? renderAdmissionProbabilityBadge(benchmarkData2.passingGradeMin, scoreResults.scaledScore) : null;

        const tpsSubtests = subtestsList.filter((s) => ["PU", "PPU", "PBM", "PK"].includes(s.code));
        const litSubtests = subtestsList.filter((s) => ["LIT_INDO", "LIT_ENG", "PM"].includes(s.code));

        const currentDateStr = new Date().toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });

        return (
            <div className="min-h-screen bg-slate-100 py-6 px-3 sm:px-6 font-sans text-slate-800 text-left">
                <style
                    dangerouslySetInnerHTML={{
                        __html: `
                        @media print {
                            * {
                                -webkit-print-color-adjust: exact !important;
                                print-color-adjust: exact !important;
                                color-adjust: exact !important;
                            }
                            body { background: white !important; color: black !important; padding: 0 !important; margin: 0 !important; }
                            .print-hidden { display: none !important; }
                            .print-card { box-shadow: none !important; border: none !important; max-width: 100% !important; border-radius: 0 !important; padding: 0 !important; }
                            @page { size: A4 portrait; margin: 10mm; }
                        }
                    `
                    }}
                />

                {/* MODAL REVIEW PEMBAHASAN */}
                {showReviewModal && (
                    <div className="fixed inset-0 z-[999999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
                        <div className="bg-white rounded-3xl border border-slate-200 max-w-3xl w-full p-4 sm:p-6 space-y-4 shadow-2xl animate-in fade-in max-h-[90vh] flex flex-col text-left">
                            <div className="flex items-center justify-between border-b pb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                                        <Eye className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-xs sm:text-sm text-slate-900">Review Kunci Jawaban & Pembahasan Soal</h3>
                                        <p className="text-[10px] sm:text-[11px] text-slate-500">Naskah Asesmen Resmi CBT - Paket {studentSession?.packageId}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowReviewModal(false)}
                                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                                {allQuestions.map((q, idx) => {
                                    const studentAns = answers[q.id];
                                    const isCorrect = studentAns === q.correctAnswer;
                                    const isUnanswered = !studentAns;

                                    return (
                                        <div key={q.id} className="p-3.5 sm:p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2.5 text-left text-xs">
                                            <div className="flex items-center justify-between border-b border-slate-200/70 pb-1.5">
                                                <span className="font-mono font-bold text-blue-900">
                                                    No. {q.localNo || idx + 1} • {q.subtest}
                                                </span>
                                                <span
                                                    className={`px-2 py-0.5 rounded font-mono text-[9.5px] sm:text-[10px] font-bold ${isCorrect
                                                        ? "bg-emerald-100 text-emerald-800"
                                                        : isUnanswered
                                                            ? "bg-slate-200 text-slate-700"
                                                            : "bg-rose-100 text-rose-800"
                                                        }`}
                                                >
                                                    {isCorrect ? "Benar (+)" : isUnanswered ? "Kosong (0)" : "Salah (X)"}
                                                </span>
                                            </div>

                                            {q.stimulus && (
                                                <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-[11px] sm:text-[11.5px] whitespace-pre-line leading-relaxed">
                                                    <RenderLatex content={q.stimulus} />
                                                </div>
                                            )}

                                            <div className="font-semibold text-slate-900 leading-snug">
                                                <RenderLatex content={q.question} />
                                            </div>

                                            <div className="space-y-1 pt-1">
                                                {q.options.map((opt) => {
                                                    const isSelected = studentAns === opt.id;
                                                    const isKey = q.correctAnswer === opt.id;
                                                    return (
                                                        <div
                                                            key={opt.id}
                                                            className={`p-2 rounded-xl border flex items-center gap-2 text-[10.5px] sm:text-[11px] ${isKey
                                                                ? "bg-emerald-50 border-emerald-400 font-bold text-emerald-950"
                                                                : isSelected
                                                                    ? "bg-rose-50 border-rose-300 font-medium text-rose-900"
                                                                    : "bg-white border-slate-200 text-slate-700"
                                                                }`}
                                                        >
                                                            <span
                                                                className={`w-5 h-5 rounded-md flex items-center justify-center font-mono text-[9px] sm:text-[10px] font-bold shrink-0 ${isKey
                                                                    ? "bg-emerald-600 text-white"
                                                                    : isSelected
                                                                        ? "bg-rose-600 text-white"
                                                                        : "bg-slate-100 text-slate-600"
                                                                    }`}
                                                            >
                                                                {opt.id}
                                                            </span>
                                                            <div className="flex-1">
                                                                <RenderLatex content={opt.text} />
                                                            </div>
                                                            {isKey && <span className="text-[9.5px] sm:text-[10px] font-mono font-bold text-emerald-700 uppercase">Kunci</span>}
                                                            {isSelected && !isKey && <span className="text-[9.5px] sm:text-[10px] font-mono font-bold text-rose-600 uppercase">Jawaban Anda</span>}
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {q.explanation && (
                                                <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-950 text-[10.5px] sm:text-[11px] leading-relaxed">
                                                    <strong className="block text-[9.5px] sm:text-[10px] font-mono uppercase text-blue-900 mb-0.5">Pembahasan:</strong>
                                                    <RenderLatex content={q.explanation} />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* 1. TOP ACTION BAR */}
                <div className="max-w-4xl mx-auto mb-4 bg-white rounded-2xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-2.5 shadow-xs print-hidden">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                        <Award className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="text-[11px] sm:text-xs">Hasil Asesmen Terstandarisasi • Evaluasi Diagnostik Siap Cetak</span>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto justify-end">
                        <button
                            onClick={handleExitToHome}
                            className="px-3 sm:px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-[11px] sm:text-xs flex items-center gap-1 cursor-pointer"
                        >
                            <Home className="w-3.5 h-3.5" />
                            <span>Halaman Utama</span>
                        </button>

                        <button
                            onClick={() => setShowReviewModal(true)}
                            className="px-3 sm:px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] sm:text-xs flex items-center gap-1 cursor-pointer"
                        >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Review Pembahasan</span>
                        </button>

                        <button
                            onClick={() => window.print()}
                            className="px-3 sm:px-3.5 py-1.5 rounded-xl bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold text-[11px] sm:text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Cetak Lembar Rapor</span>
                        </button>
                    </div>
                </div>

                {/* RAPOR RESMI BENTUK DOKUMEN CETAK */}
                <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-xl p-4 sm:p-10 space-y-5 sm:space-y-6 print-card text-left">
                    {/* 2. KOP SURAT */}
                    <div className="flex items-center gap-3 sm:gap-4 border-b-2 border-slate-900 pb-3 sm:pb-4 text-center">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 flex items-center justify-center p-0.5">
                            <img
                                src="/logo-timsim.jpg"
                                alt="Logo SMA Muhammadiyah 18 Jakarta"
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                    (e.target as any).src = "/images/logo-smam18.png";
                                }}
                            />
                        </div>
                        <div className="flex-1 space-y-0.5 text-center">
                            <div className="text-[9.5px] sm:text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                MAJELIS PENDIDIKAN DASAR DAN MENENGAH
                            </div>
                            <div className="text-[9.5px] sm:text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                PIMPINAN DAERAH MUHAMMADIYAH JAKARTA SELATAN
                            </div>
                            <h1 className="text-base sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
                                SMA MUHAMMADIYAH 18 JAKARTA
                            </h1>
                            <div className="text-[9.5px] sm:text-[10.5px] font-bold font-mono text-blue-900 uppercase">
                                TERAKREDITASI "A"
                            </div>
                            <p className="text-[8.5px] sm:text-[10px] text-slate-500">
                                Jl. Panjang No. 19 RT.8/RW.9, Kel. Cipulir, Kec. Kebayoran Lama, Kota Jakarta Selatan, DKI Jakarta 12230
                            </p>
                        </div>
                    </div>

                    {/* 3. IDENTITAS SISWA & JAM PELAKSANAAN */}
                    <div
                        className="p-3 sm:p-3.5 rounded-2xl text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs shadow-sm"
                        style={{ backgroundColor: "#1c4cb7" }}
                    >
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center font-bold shrink-0">
                                <GraduationCap className="w-4 h-4 text-blue-200" />
                            </div>
                            <div className="text-left">
                                <div className="font-black text-xs sm:text-sm uppercase tracking-wide">
                                    {studentSession?.candidateName || "Peserta Ujian"}
                                </div>
                                <div className="text-[10px] sm:text-[11px] text-blue-200 font-mono">
                                    NISN: {studentSession?.nisn || "-"} • KELAS: {studentSession?.kelas || "XII"} • SMA MUHAMMADIYAH 18
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 text-left sm:text-right">
                            <div className="text-[10px] sm:text-[11px] font-mono">
                                <span className="text-blue-300 block text-[9px] uppercase">WAKTU UJIAN</span>
                                <span className="font-bold">
                                    {currentDateStr}, {examStartTimeStr || "07:30"} - {examEndTimeStr || "10:45"}
                                </span>
                            </div>
                            <span className="px-3 py-1 rounded-full bg-emerald-500 text-white font-black text-[10px] sm:text-[10.5px] font-mono uppercase tracking-wider">
                                Selesai
                            </span>
                        </div>
                    </div>

                    {/* 4. NILAI RATA-RATA KESELURUHAN BANNER */}
                    <div
                        className="p-5 sm:p-6 rounded-2xl text-white text-center space-y-1 shadow-md"
                        style={{ backgroundColor: "#1c4cb7" }}
                    >
                        <div className="text-[10px] sm:text-xs font-mono font-bold text-blue-100 uppercase tracking-wider">
                            NILAI RATA-RATA KESELURUHAN (IRT 3-PARAMETER)
                        </div>
                        <div className="text-5xl sm:text-6xl font-black tracking-tight text-white my-1">{scoreResults.scaledScore}</div>
                        <div className="text-[10px] sm:text-[11px] text-blue-100 font-mono">
                            Kalkulasi {scoreResults.total} Butir Soal Terstandarisasi Pemerintah • Skala 200 s.d. 1000
                        </div>
                    </div>

                    {/* 5. PILIHAN PROGRAM STUDI & STATUS KELULUSAN */}
                    <div className="space-y-2 text-left">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                            <Target className="w-4 h-4 text-blue-700" />
                            <span className="uppercase font-mono text-[10.5px] sm:text-[11px]">PILIHAN PROGRAM STUDI & KELULUSAN</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
                            {/* KARTU PILIHAN 1 */}
                            <div className="p-3.5 sm:p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                                <div className="text-[9.5px] sm:text-[10px] font-mono font-bold text-slate-400 uppercase">PTN Pilihan 1:</div>
                                <div className="text-sm font-black text-slate-900 leading-tight">
                                    {benchmarkData1?.kampus || pilihanKampus1?.split("-")[0] || "Pilihan 1 Belum Dipilih"}
                                </div>
                                <div className="text-xs font-semibold text-slate-600">
                                    {benchmarkData1?.prodi || pilihanKampus1?.split("-")[1] || "-"}
                                </div>

                                {benchmarkData1 && (
                                    <div className="flex items-center gap-1.5 pt-1 text-[10px] font-mono font-bold">
                                        <span className="px-2 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-700">
                                            DK: {formatKeketatan(benchmarkData1.keketatan)}
                                        </span>
                                        <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700">
                                            DT: {benchmarkData1.dayaTampung}
                                        </span>
                                        <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                                            Peminat: {benchmarkData1.peminat}
                                        </span>
                                    </div>
                                )}

                                <div className="pt-2 border-t border-slate-200 text-[11px] space-y-1">
                                    <div className="text-slate-500 font-medium">
                                        Subtes Utama Penentu: <strong className="text-slate-800">Penalaran Matematika & Penalaran Umum</strong>
                                    </div>
                                    <div className="font-mono text-[10.5px] text-slate-600">
                                        PASSING SCORE TARGET: <strong>{benchmarkData1?.passingGradeMin || 650}</strong>
                                    </div>
                                    <div className={`font-bold pt-0.5 flex items-center gap-1.5 text-xs ${p1Eval?.colorText || "text-slate-500"}`}>
                                        {p1Eval?.isPassed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                                        <span>{p1Eval?.note || "Pilihan belum ditentukan"}</span>
                                    </div>
                                </div>
                            </div>

                            {/* KARTU PILIHAN 2 */}
                            <div className="p-3.5 sm:p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                                <div className="text-[9.5px] sm:text-[10px] font-mono font-bold text-slate-400 uppercase">PTN Pilihan 2:</div>
                                <div className="text-sm font-black text-slate-900 leading-tight">
                                    {benchmarkData2?.kampus || pilihanKampus2?.split("-")[0] || "Pilihan 2 Belum Dipilih"}
                                </div>
                                <div className="text-xs font-semibold text-slate-600">
                                    {benchmarkData2?.prodi || pilihanKampus2?.split("-")[1] || "-"}
                                </div>

                                {benchmarkData2 && (
                                    <div className="flex items-center gap-1.5 pt-1 text-[10px] font-mono font-bold">
                                        <span className="px-2 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-700">
                                            DK: {formatKeketatan(benchmarkData2.keketatan)}
                                        </span>
                                        <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700">
                                            DT: {benchmarkData2.dayaTampung}
                                        </span>
                                        <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                                            Peminat: {benchmarkData2.peminat}
                                        </span>
                                    </div>
                                )}

                                <div className="pt-2 border-t border-slate-200 text-[11px] space-y-1">
                                    <div className="text-slate-500 font-medium">
                                        Subtes Utama Penentu: <strong className="text-slate-800">Pengetahuan Kuantitatif & Pemahaman Bacaan</strong>
                                    </div>
                                    <div className="font-mono text-[10.5px] text-slate-600">
                                        PASSING SCORE TARGET: <strong>{benchmarkData2?.passingGradeMin || 620}</strong>
                                    </div>
                                    <div className={`font-bold pt-0.5 flex items-center gap-1.5 text-xs ${p2Eval?.colorText || "text-slate-500"}`}>
                                        {p2Eval?.isPassed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                                        <span>{p2Eval?.note || "Pilihan belum ditentukan"}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 6. TABEL TES SKOLASTIK (4 SUBTES) */}
                    <div className="space-y-1 text-left overflow-x-auto">
                        <div
                            className="p-2 sm:p-2.5 rounded-t-xl text-white flex items-center justify-between text-[11px] sm:text-xs font-bold font-mono min-w-[320px]"
                            style={{ backgroundColor: "#1c4cb7" }}
                        >
                            <span>TES SKOLASTIK (4 SUBTES)</span>
                            <span>Rerata: {scoreResults.tpsAvg}</span>
                        </div>
                        <div className="border border-slate-200 rounded-b-xl overflow-hidden min-w-[320px]">
                            <table className="w-full text-left text-[11px] sm:text-xs">
                                <thead className="bg-slate-50 text-[9.5px] font-mono font-bold text-slate-400 border-b">
                                    <tr>
                                        <th className="p-2 sm:p-2.5">SUBTES</th>
                                        <th className="p-2 sm:p-2.5 text-center">BENAR</th>
                                        <th className="p-2 sm:p-2.5 text-center">SALAH</th>
                                        <th className="p-2 sm:p-2.5 text-center">KOSONG</th>
                                        <th className="p-2 sm:p-2.5 hidden sm:table-cell">PROGRESS CAPAIAN</th>
                                        <th className="p-2 sm:p-2.5 text-right">SKOR</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                    {tpsSubtests.map((st) => {
                                        const s = scoreResults.subtestBreakdown[st.code] || { correct: 0, incorrect: 0, unattempted: 0, percentage: 0, scoreIRT: 200 };
                                        return (
                                            <tr key={st.code} className="hover:bg-slate-50/50">
                                                <td className="p-2 sm:p-2.5 font-bold text-slate-900">{st.name}</td>
                                                <td className="p-2 sm:p-2.5 text-center font-mono text-emerald-700 font-bold">{s.correct}</td>
                                                <td className="p-2 sm:p-2.5 text-center font-mono text-rose-600 font-bold">{s.incorrect}</td>
                                                <td className="p-2 sm:p-2.5 text-center font-mono text-slate-400">{s.unattempted}</td>
                                                <td className="p-2 sm:p-2.5 w-44 hidden sm:table-cell">
                                                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                                        <div className="bg-blue-700 h-full rounded-full" style={{ width: `${Math.max(5, s.percentage)}%` }} />
                                                    </div>
                                                </td>
                                                <td className="p-2 sm:p-2.5 text-right font-mono font-bold text-slate-900">{s.scoreIRT}.0</td>
                                            </tr>
                                        );
                                    })}
                                    <tr className="bg-slate-50 font-bold text-slate-900 border-t">
                                        <td className="p-2 sm:p-2.5">Nilai Rata-rata Skolastik</td>
                                        <td className="p-2 sm:p-2.5 text-center font-mono text-emerald-700">
                                            {tpsSubtests.reduce((a, b) => a + (scoreResults.subtestBreakdown[b.code]?.correct || 0), 0)}
                                        </td>
                                        <td className="p-2 sm:p-2.5 text-center font-mono text-rose-600">
                                            {tpsSubtests.reduce((a, b) => a + (scoreResults.subtestBreakdown[b.code]?.incorrect || 0), 0)}
                                        </td>
                                        <td className="p-2 sm:p-2.5 text-center font-mono text-slate-400">
                                            {tpsSubtests.reduce((a, b) => a + (scoreResults.subtestBreakdown[b.code]?.unattempted || 0), 0)}
                                        </td>
                                        <td className="p-2 sm:p-2.5 hidden sm:table-cell"></td>
                                        <td className="p-2 sm:p-2.5 text-right font-mono text-blue-900 font-black">{scoreResults.tpsAvg}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* 7. TABEL TES LITERASI & PENALARAN MATEMATIKA (3 SUBTES) */}
                    <div className="space-y-1 text-left overflow-x-auto">
                        <div
                            className="p-2 sm:p-2.5 rounded-t-xl text-white flex items-center justify-between text-[11px] sm:text-xs font-bold font-mono min-w-[320px]"
                            style={{ backgroundColor: "#6d28d9" }}
                        >
                            <span>TES LITERASI & PENALARAN MATEMATIKA (3 SUBTES)</span>
                            <span>Rerata: {scoreResults.litAvg}</span>
                        </div>
                        <div className="border border-slate-200 rounded-b-xl overflow-hidden min-w-[320px]">
                            <table className="w-full text-left text-[11px] sm:text-xs">
                                <thead className="bg-slate-50 text-[9.5px] font-mono font-bold text-slate-400 border-b">
                                    <tr>
                                        <th className="p-2 sm:p-2.5">SUBTES</th>
                                        <th className="p-2 sm:p-2.5 text-center">BENAR</th>
                                        <th className="p-2 sm:p-2.5 text-center">SALAH</th>
                                        <th className="p-2 sm:p-2.5 text-center">KOSONG</th>
                                        <th className="p-2 sm:p-2.5 hidden sm:table-cell">PROGRESS CAPAIAN</th>
                                        <th className="p-2 sm:p-2.5 text-right">SKOR</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                    {litSubtests.map((st) => {
                                        const s = scoreResults.subtestBreakdown[st.code] || { correct: 0, incorrect: 0, unattempted: 0, percentage: 0, scoreIRT: 200 };
                                        return (
                                            <tr key={st.code} className="hover:bg-slate-50/50">
                                                <td className="p-2 sm:p-2.5 font-bold text-slate-900">{st.name}</td>
                                                <td className="p-2 sm:p-2.5 text-center font-mono text-emerald-700 font-bold">{s.correct}</td>
                                                <td className="p-2 sm:p-2.5 text-center font-mono text-rose-600 font-bold">{s.incorrect}</td>
                                                <td className="p-2 sm:p-2.5 text-center font-mono text-slate-400">{s.unattempted}</td>
                                                <td className="p-2 sm:p-2.5 w-44 hidden sm:table-cell">
                                                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                                        <div className="bg-purple-700 h-full rounded-full" style={{ width: `${Math.max(5, s.percentage)}%` }} />
                                                    </div>
                                                </td>
                                                <td className="p-2 sm:p-2.5 text-right font-mono font-bold text-slate-900">{s.scoreIRT}.0</td>
                                            </tr>
                                        );
                                    })}
                                    <tr className="bg-slate-50 font-bold text-slate-900 border-t">
                                        <td className="p-2 sm:p-2.5">Nilai Rata-rata Literasi</td>
                                        <td className="p-2 sm:p-2.5 text-center font-mono text-emerald-700">
                                            {litSubtests.reduce((a, b) => a + (scoreResults.subtestBreakdown[b.code]?.correct || 0), 0)}
                                        </td>
                                        <td className="p-2 sm:p-2.5 text-center font-mono text-rose-600">
                                            {litSubtests.reduce((a, b) => a + (scoreResults.subtestBreakdown[b.code]?.incorrect || 0), 0)}
                                        </td>
                                        <td className="p-2 sm:p-2.5 text-center font-mono text-slate-400">
                                            {litSubtests.reduce((a, b) => a + (scoreResults.subtestBreakdown[b.code]?.unattempted || 0), 0)}
                                        </td>
                                        <td className="p-2 sm:p-2.5 hidden sm:table-cell"></td>
                                        <td className="p-2 sm:p-2.5 text-right font-mono text-purple-900 font-black">{scoreResults.litAvg}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* 8. BLOCKING TIME & EVALUASI KECEPATAN PENGERJAAN */}
                    <div className="space-y-1 text-left overflow-x-auto">
                        <div className="p-2 sm:p-2.5 rounded-t-xl bg-slate-900 text-white flex items-center justify-between text-[11px] sm:text-xs font-bold font-mono min-w-[320px]">
                            <span className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-blue-400" />
                                <span>BLOCKING TIME & EVALUASI KECEPATAN PENGERJAAN</span>
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal">Terdistribusi Presisi</span>
                        </div>
                        <div className="border border-slate-200 rounded-b-xl p-3.5 sm:p-4 divide-y divide-slate-100 bg-white min-w-[320px]">
                            {subtestsList.map((st) => {
                                const s = scoreResults.subtestBreakdown[st.code] || { correct: 0, incorrect: 0, unattempted: 0, total: 20 };
                                const spentSecs = timeSpentPerSubtest[st.code] || 15;
                                const spentMin = Math.floor(spentSecs / 60);
                                const spentSecRemainder = spentSecs % 60;
                                const totalMin = st.defaultDurationMinutes;
                                const pctTime = Math.min(100, Math.round((spentSecs / (totalMin * 60)) * 100));

                                const isHasty = pctTime < 35 && s.correct < s.total * 0.5;

                                return (
                                    <div key={st.code} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                                        <div className="space-y-0.5">
                                            <div className="font-bold text-slate-900">{st.name}</div>
                                            <div className="text-[10.5px] sm:text-[11px] text-slate-500 font-mono">
                                                Dikerjakan {spentMin} menit {spentSecRemainder} detik dari {totalMin} menit ({pctTime}%) • Benar: {s.correct}, Salah: {s.incorrect}, Kosong: {s.unattempted}
                                            </div>
                                            <p className="text-[10px] sm:text-[10.5px] text-slate-400 italic">
                                                {isHasty
                                                    ? "Alokasi waktu tersisa banyak, tapi banyak jawaban yang terlewat. Majukan ritme soal!"
                                                    : "Ritme pengerjaan terjaga stabil, tingkatkan fokus ketelitian saat eliminasi opsi."}
                                            </p>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold shrink-0 ${isHasty ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                                            }`}>
                                            {isHasty ? "Terburu-buru" : "Optimal"}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* 9. ANALISA PASSING SCORE PER SUBTES */}
                    <div className="space-y-1 text-left overflow-x-auto">
                        <div className="p-2 sm:p-2.5 rounded-t-xl bg-slate-900 text-white flex items-center justify-between text-[11px] sm:text-xs font-bold font-mono min-w-[320px]">
                            <span>ANALISA PASSING SCORE PER SUBTES TERHADAP PROGRAM STUDI PILIHAN</span>
                        </div>
                        <div className="border border-slate-200 rounded-b-xl overflow-hidden min-w-[320px]">
                            <table className="w-full text-left text-[11px] sm:text-xs">
                                <thead className="bg-slate-50 text-[9.5px] font-mono font-bold text-slate-400 border-b">
                                    <tr>
                                        <th className="p-2 sm:p-2.5">SUBTES</th>
                                        <th className="p-2 sm:p-2.5 text-center">SKOR KAMU</th>
                                        <th className="p-2 sm:p-2.5 text-center">PILIHAN 1 - {benchmarkData1?.prodi || "PILIHAN 1"}</th>
                                        <th className="p-2 sm:p-2.5 text-center">PILIHAN 2 - {benchmarkData2?.prodi || "PILIHAN 2"}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                    {subtestsList.map((st) => {
                                        const s = scoreResults.subtestBreakdown[st.code] || { scoreIRT: 200 };
                                        const targetP1 = benchmarkData1?.passingGradeMin || 650;
                                        const targetP2 = benchmarkData2?.passingGradeMin || 620;

                                        const p1Passed = s.scoreIRT >= targetP1;
                                        const p2Passed = s.scoreIRT >= targetP2;

                                        return (
                                            <tr key={st.code} className="hover:bg-slate-50/50">
                                                <td className="p-2 sm:p-2.5 font-bold text-slate-900">{st.name}</td>
                                                <td className="p-2 sm:p-2.5 text-center font-mono font-bold text-slate-900">{s.scoreIRT}.0</td>
                                                <td className="p-2 sm:p-2.5 text-center font-mono text-[10.5px] sm:text-[11px]">
                                                    {p1Passed ? (
                                                        <span className="text-emerald-700 font-bold">√ Memenuhi ({targetP1})</span>
                                                    ) : (
                                                        <span className="text-rose-600 font-bold">× Belum mencukupi ({targetP1})</span>
                                                    )}
                                                </td>
                                                <td className="p-2 sm:p-2.5 text-center font-mono text-[10.5px] sm:text-[11px]">
                                                    {p2Passed ? (
                                                        <span className="text-emerald-700 font-bold">√ Memenuhi ({targetP2})</span>
                                                    ) : (
                                                        <span className="text-rose-600 font-bold">× Belum mencukupi ({targetP2})</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* 10. DIAGRAM KOMPARASI CAPAIAN 7 SUBTES */}
                    <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white text-left space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-2 gap-2">
                            <div>
                                <h3 className="font-mono font-bold text-[11px] sm:text-xs uppercase text-slate-900">
                                    DIAGRAM KOMPARASI CAPAIAN 7 SUBTES (SKALA 200 - 1000)
                                </h3>
                                <p className="text-[9.5px] sm:text-[10px] text-slate-400">
                                    Garis vertikal batas putus-putus menunjukkan ambang batas rata-rata kelulusan SNBT Target 650
                                </p>
                            </div>
                            <div className="flex items-center gap-2 text-[9.5px] sm:text-[10px] font-mono">
                                <span className="flex items-center gap-1">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                    ≥ 650 (Aman)
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                                    500 - 649 (Ketat)
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                                    ≤ 499 (Kurang)
                                </span>
                            </div>
                        </div>

                        <div className="space-y-3 relative pt-3">
                            <div className="absolute top-0 bottom-0 left-[65%] w-px border-l-2 border-dashed border-slate-400 z-10 pointer-events-none">
                                <span className="absolute -top-3 -left-6 bg-slate-900 text-white font-mono text-[8.5px] font-black px-1.5 py-0.2 rounded">
                                    TARGET 650
                                </span>
                            </div>

                            {subtestsList.map((st) => {
                                const s = scoreResults.subtestBreakdown[st.code] || { scoreIRT: 200 };
                                const pctWidth = Math.min(100, Math.max(10, ((s.scoreIRT - 200) / 800) * 100));
                                const barColor = s.scoreIRT >= 650 ? "bg-emerald-600" : s.scoreIRT >= 500 ? "bg-amber-500" : "bg-rose-500";

                                return (
                                    <div key={st.code} className="space-y-1">
                                        <div className="flex justify-between text-xs font-mono">
                                            <span className="font-semibold text-slate-800 text-[11px] sm:text-xs truncate">{st.name}</span>
                                            <span className="font-bold text-slate-900">{s.scoreIRT}.0</span>
                                        </div>
                                        <div className="w-full bg-slate-100 h-2.5 sm:h-3 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${pctWidth}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* 11. REKOMENDASI PTN LAIN */}
                    <div className="space-y-1 text-left overflow-x-auto">
                        <div className="p-2 sm:p-2.5 rounded-t-xl bg-slate-900 text-white flex items-center justify-between text-[11px] sm:text-xs font-bold font-mono min-w-[320px]">
                            <span>REKOMENDASI PTN LAIN - PROGRAM STUDI SERUPA DENGAN PILIHAN 1</span>
                            <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">Daya Tampung & Keketatan</span>
                        </div>
                        <div className="border border-slate-200 rounded-b-xl overflow-hidden min-w-[320px]">
                            <table className="w-full text-left text-[11px] sm:text-xs">
                                <thead className="bg-slate-50 text-[9.5px] font-mono font-bold text-slate-400 border-b">
                                    <tr>
                                        <th className="p-2 sm:p-2.5">#</th>
                                        <th className="p-2 sm:p-2.5">UNIVERSITAS</th>
                                        <th className="p-2 sm:p-2.5">PROGRAM STUDI</th>
                                        <th className="p-2 sm:p-2.5 text-center">DK (%)</th>
                                        <th className="p-2 sm:p-2.5 text-center">DAYA TAMPUNG</th>
                                        <th className="p-2 sm:p-2.5 text-center">PEMINAT</th>
                                        <th className="p-2 sm:p-2.5 text-right">PELUANG KELULUSAN</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                    {recommendedAlternativePTNs.map((rec, idx) => (
                                        <tr key={rec.id} className="hover:bg-slate-50/50">
                                            <td className="p-2 sm:p-2.5 font-mono text-slate-400">{idx + 1}</td>
                                            <td className="p-2 sm:p-2.5 font-bold text-slate-900">{rec.kampus}</td>
                                            <td className="p-2 sm:p-2.5">{rec.prodi} ({rec.jenjang || "S1"})</td>
                                            <td className="p-2 sm:p-2.5 text-center font-mono">{formatKeketatan(rec.keketatan)}</td>
                                            <td className="p-2 sm:p-2.5 text-center font-mono">{rec.dayaTampung}</td>
                                            <td className="p-2 sm:p-2.5 text-center font-mono">{rec.peminat}</td>
                                            <td className={`p-2 sm:p-2.5 text-right font-mono text-[10.5px] sm:text-[11px] ${rec.kelulusanColor}`}>
                                                {rec.kelulusanStatus}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* 12. BANNER SIMULATOR RASIONALISASI */}
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left">
                        <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-bold">
                                <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span>Lanjutkan ke Aplikasi Analisis & Rasionalisasi SNBT</span>
                            </div>
                            <p className="text-[10.5px] sm:text-[11px] text-blue-200">
                                Skor rata-rata Anda ({scoreResults.scaledScore}) dapat langsung diuji ke simulator passing grade dengan data daya tampung seluruh PTN nasional.
                            </p>
                        </div>
                        <button
                            onClick={() => window.open("/simulation", "_blank")}
                            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-blue-950 font-bold text-xs shrink-0 cursor-pointer shadow-xs transition-all flex items-center gap-1.5 w-full sm:w-auto justify-center"
                        >
                            <span>Buka Aplikasi Analisis</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* 13. TANDA TANGAN RESMI SEKOLAH */}
                    <div className="pt-6 sm:pt-8 pb-3 sm:pb-4 grid grid-cols-2 gap-4 sm:gap-8 text-center text-xs font-serif text-slate-800">
                        <div className="space-y-12 sm:space-y-16">
                            <div>
                                <p className="text-[10px] sm:text-[11px]">Mengetahui,</p>
                                <div
                                    contentEditable
                                    suppressContentEditableWarning
                                    className="font-bold text-[11px] sm:text-[11.5px] outline-none border-b border-transparent hover:border-slate-300 focus:border-blue-600 px-1 transition-all inline-block"
                                    title="Klik untuk mengubah jabatan penandatangan"
                                >
                                    Koordinator BK / Pembina KIR
                                </div>
                            </div>
                            <div>
                                <div
                                    contentEditable
                                    suppressContentEditableWarning
                                    className="font-bold underline text-[11.5px] sm:text-[12px] outline-none border-b border-transparent hover:border-slate-300 focus:border-blue-600 px-1 transition-all inline-block"
                                    title="Klik untuk mengubah nama guru/pembina"
                                >
                                    Fadhillah Umar, S.Pd.
                                </div>
                                <div
                                    contentEditable
                                    suppressContentEditableWarning
                                    className="text-[9.5px] sm:text-[10px] font-mono text-slate-500 outline-none border-b border-transparent hover:border-slate-300 focus:border-blue-600 px-1 transition-all block"
                                    title="Klik untuk mengubah NIP/NBM"
                                >
                                    NIP: 121 2026 001
                                </div>
                            </div>
                        </div>

                        <div className="space-y-12 sm:space-y-16">
                            <div>
                                <p className="text-[10px] sm:text-[11px]">Jakarta, {currentDateStr}</p>
                                <p className="font-bold text-[11px] sm:text-[11.5px]">Peserta Ujian</p>
                            </div>
                            <div>
                                <p className="font-bold underline text-[11.5px] sm:text-[12px]">
                                    ( <span
                                        contentEditable
                                        suppressContentEditableWarning
                                        className="outline-none border-b border-transparent hover:border-slate-300 focus:border-blue-600 px-1 transition-all inline-block"
                                        title="Klik untuk mengubah nama siswa"
                                    >
                                        {studentSession?.candidateName || "..............................."}
                                    </span> )
                                </p>
                                <p className="text-[9.5px] sm:text-[10px] font-mono text-slate-500">
                                    NISN: {studentSession?.nisn || "-"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 14. FOOTER ACTION */}
                    <div className="pt-2 border-t flex flex-col sm:flex-row items-center justify-between gap-3 print-hidden">
                        <button
                            onClick={() => {
                                safeExitFullscreen();
                                localStorage.removeItem("cbt_exam_result");
                                window.location.reload();
                            }}
                            className="w-full sm:w-auto px-6 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer"
                        >
                            Ulangi Sesi Ini
                        </button>

                        <button
                            onClick={handleExitToHome}
                            disabled={isExitingToHome}
                            className="w-full sm:w-auto px-8 py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all disabled:opacity-50"
                        >
                            {isExitingToHome ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Menutup Bilik Ujian...</span>
                                </>
                            ) : (
                                <>
                                    <Home className="w-4 h-4" />
                                    <span>Kembali ke Halaman Utama</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // TAHAP 2 & 3: BILIK SOAL (RESPONSIF MOBILE / TABLET / DESKTOP)
    return (
        <div className="min-h-screen bg-slate-100 flex flex-col font-sans select-none text-slate-800 relative pb-20 lg:pb-6 text-left">
            {/* DRAWER MATRIX KISI-KISI KHUSUS TABLET & HP */}
            {showMobileMatrix && (
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex flex-col justify-end lg:hidden animate-in fade-in">
                    <div className="bg-white rounded-t-3xl border-t border-slate-200 p-5 space-y-4 max-h-[80vh] flex flex-col shadow-2xl">
                        <div className="flex items-center justify-between border-b pb-3">
                            <div className="flex items-center gap-2">
                                <LayoutGrid className="w-5 h-5 text-blue-700" />
                                <span className="font-bold text-sm text-slate-900">
                                    Daftar Soal Subtes {activeSubtestConfig.code} ({currentSubtestQuestions.length} Butir)
                                </span>
                            </div>
                            <button
                                onClick={() => setShowMobileMatrix(false)}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="grid grid-cols-5 gap-2 overflow-y-auto p-1 flex-1">
                            {currentSubtestQuestions.map((q, idx) => {
                                const isCurrent = currentQIndexInSubtest === idx;
                                const isAnswered = Boolean(answers[q.id]);
                                const isDoubt = Boolean(doubtfuls[q.id]);

                                return (
                                    <button
                                        key={q.id}
                                        onClick={() => {
                                            setCurrentQIndexInSubtest(idx);
                                            setShowMobileMatrix(false);
                                        }}
                                        className={`h-11 rounded-xl border font-mono text-xs font-bold cursor-pointer transition-all ${isCurrent ? "ring-2 ring-blue-700 border-blue-700" : "border-slate-200"
                                            } ${isDoubt
                                                ? "bg-amber-400 text-amber-950 border-amber-400"
                                                : isAnswered
                                                    ? "bg-blue-700 text-white border-blue-700"
                                                    : "bg-slate-50 text-slate-700"
                                            }`}
                                    >
                                        {idx + 1}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="pt-2 border-t grid grid-cols-3 gap-1 text-[10px] font-mono text-slate-500 text-center">
                            <div><span className="w-2.5 h-2.5 rounded bg-blue-700 inline-block mr-1" /> Terjawab</div>
                            <div><span className="w-2.5 h-2.5 rounded bg-amber-400 inline-block mr-1" /> Ragu</div>
                            <div><span className="w-2.5 h-2.5 rounded bg-slate-200 inline-block mr-1" /> Kosong</div>
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
                        <h3 className="text-base sm:text-lg font-black text-slate-900">
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
            <header className="bg-white border-b border-slate-200 px-3 sm:px-8 h-14 sm:h-16 flex items-center justify-between sticky top-0 z-40 shadow-xs">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 font-black flex items-center justify-center text-[11px] sm:text-xs shrink-0">
                        CBT
                    </div>
                    <div className="min-w-0">
                        <div className="font-bold text-xs sm:text-sm text-slate-900 truncate">{activeSubtestConfig.name}</div>
                        <div className="text-[10px] sm:text-[11px] text-slate-500 font-mono truncate">
                            Subtes {currentSubtestIndex + 1}/{subtestsList.length} • {studentSession?.candidateName}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
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

                    {/* TOMBOL BUKA KISI-KISI DI HP & TABLET */}
                    <button
                        onClick={() => setShowMobileMatrix(true)}
                        className="lg:hidden px-2.5 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1 cursor-pointer"
                    >
                        <LayoutGrid className="w-3.5 h-3.5 text-blue-700" />
                        <span className="text-[11px]">Soal</span>
                    </button>

                    <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border font-mono font-bold text-xs sm:text-sm bg-blue-50 border-blue-200 text-blue-900">
                        <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                        <span>{formatTime(subtestTimeLeft)}</span>
                    </div>

                    <button
                        onClick={() => setShowSubtestConfirmModal(true)}
                        className="px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl bg-[#1e3a8a] hover:bg-blue-900 text-white text-[11px] sm:text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs transition-all"
                    >
                        <span>{currentSubtestIndex === subtestsList.length - 1 ? "Selesai" : "Lanjut"}</span>
                        <FastForward className="w-3.5 h-3.5" />
                    </button>
                </div>
            </header>

            {/* AREA SOAL & MATRIX */}
            <div className="flex-1 max-w-[1600px] w-full mx-auto p-3 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
                <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 p-4 sm:p-8 space-y-4 sm:space-y-5 shadow-xs">
                    <div className="font-mono text-[11px] sm:text-xs font-bold text-blue-900 border-b border-slate-100 pb-2.5 flex justify-between items-center">
                        <span>SOAL NOMOR {currentQIndexInSubtest + 1}</span>
                        <span className="text-slate-400 font-normal">Subtes: {activeSubtestConfig.code} ({currentQIndexInSubtest + 1} dari {currentSubtestQuestions.length})</span>
                    </div>

                    {currentQ?.stimulus && (
                        <div className={`p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 whitespace-pre-line leading-relaxed overflow-x-auto ${fontClasses.stimulus}`}>
                            <RenderLatex content={currentQ.stimulus} />
                        </div>
                    )}

                    {currentQ?.imageUrl && currentQ?.imagePosition === "above" && (
                        <div className="flex justify-center p-2.5 bg-slate-50 rounded-2xl border border-slate-200">
                            <img src={currentQ.imageUrl} alt="Diagram Soal" className="max-h-60 sm:max-h-72 object-contain rounded-xl max-w-full" />
                        </div>
                    )}

                    <div className={`text-slate-900 leading-snug overflow-x-auto py-1 ${fontClasses.question}`}>
                        <RenderLatex content={currentQ?.question} />
                    </div>

                    {currentQ?.imageUrl && currentQ?.imagePosition === "below" && (
                        <div className="flex justify-center p-2.5 bg-slate-50 rounded-2xl border border-slate-200">
                            <img src={currentQ.imageUrl} alt="Diagram Soal" className="max-h-60 sm:max-h-72 object-contain rounded-xl max-w-full" />
                        </div>
                    )}

                    <div className="space-y-2 sm:space-y-2.5 pt-1">
                        {currentQ?.options?.map((opt) => {
                            const isSelected = answers[currentQ.id] === opt.id;
                            return (
                                <button
                                    key={opt.id}
                                    onClick={() => handleSelectOption(opt.id)}
                                    className={`w-full text-left p-3 sm:p-3.5 rounded-2xl border flex items-center gap-2.5 sm:gap-3 transition-all cursor-pointer ${fontClasses.option} ${isSelected
                                        ? "bg-blue-50 border-blue-700 text-blue-950 font-bold ring-2 ring-blue-700/20"
                                        : "bg-white hover:bg-slate-50 border-slate-200 text-slate-800"
                                        }`}
                                >
                                    <span
                                        className={`w-6 h-6 sm:w-7 sm:h-7 rounded-xl border font-mono font-bold flex items-center justify-center shrink-0 text-xs sm:text-sm ${isSelected ? "bg-blue-700 text-white border-blue-700" : "bg-slate-100 text-slate-600 border-slate-200"
                                            }`}
                                    >
                                        {opt.id}
                                    </span>
                                    <div className="flex-1 overflow-x-auto">
                                        {opt.imageUrl ? (
                                            <img src={opt.imageUrl} alt={`Opsi ${opt.id}`} className="max-h-20 sm:max-h-24 object-contain rounded-lg" />
                                        ) : (
                                            <RenderLatex content={opt.text} />
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* BARIS TOMBOL NAVIGASI DI DALAM KARTU (DESKTOP) */}
                    <div className="hidden lg:flex pt-4 justify-between items-center border-t border-slate-100 gap-3">
                        <button
                            onClick={() => setCurrentQIndexInSubtest((i) => Math.max(0, i - 1))}
                            disabled={currentQIndexInSubtest === 0}
                            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs active:scale-95"
                        >
                            ← Sebelumnya
                        </button>

                        <button
                            onClick={handleToggleDoubtful}
                            className={`px-5 py-2.5 border rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 ${doubtfuls[currentQ?.id]
                                ? "bg-amber-400 text-amber-950 border-amber-500 font-black ring-2 ring-amber-300"
                                : "bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900"
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
                            className="px-6 py-2.5 bg-[#1e3a8a] hover:bg-blue-900 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer active:scale-95"
                        >
                            {currentQIndexInSubtest < currentSubtestQuestions.length - 1 ? "Berikutnya →" : "Selesai Subtes"}
                        </button>
                    </div>
                </div>

                {/* MATRIX NOMOR SOAL KHUSUS DESKTOP */}
                <div className="hidden lg:block lg:col-span-4 bg-white rounded-3xl border border-slate-200 p-5 space-y-4 shadow-xs sticky top-24">
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

                    <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-1 text-[10px] font-mono text-slate-500 text-center">
                        <div><span className="w-2.5 h-2.5 rounded bg-blue-700 inline-block mr-1" /> Terjawab</div>
                        <div><span className="w-2.5 h-2.5 rounded bg-amber-400 inline-block mr-1" /> Ragu</div>
                        <div><span className="w-2.5 h-2.5 rounded bg-slate-200 inline-block mr-1" /> Kosong</div>
                    </div>
                </div>
            </div>

            {/* STICKY BOTTOM NAV BAR KHUSUS HP & TABLET */}
            <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-2.5 px-3 z-40 flex items-center justify-between gap-2 shadow-lg">
                <button
                    onClick={() => setCurrentQIndexInSubtest((i) => Math.max(0, i - 1))}
                    disabled={currentQIndexInSubtest === 0}
                    className="flex-1 py-2.5 bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold disabled:opacity-30 active:scale-95 cursor-pointer"
                >
                    ← Prev
                </button>

                <button
                    onClick={handleToggleDoubtful}
                    className={`flex-1 py-2.5 border rounded-xl text-xs font-bold active:scale-95 cursor-pointer ${doubtfuls[currentQ?.id]
                        ? "bg-amber-400 text-amber-950 border-amber-500 font-black"
                        : "bg-amber-50 border-amber-300 text-amber-900"
                        }`}
                >
                    {doubtfuls[currentQ?.id] ? "✓ Ragu" : "Ragu"}
                </button>

                <button
                    onClick={() => {
                        if (currentQIndexInSubtest < currentSubtestQuestions.length - 1) {
                            setCurrentQIndexInSubtest((i) => i + 1);
                        } else {
                            setShowSubtestConfirmModal(true);
                        }
                    }}
                    className="flex-1 py-2.5 bg-[#1e3a8a] text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 cursor-pointer"
                >
                    {currentQIndexInSubtest < currentSubtestQuestions.length - 1 ? "Next →" : "Selesai"}
                </button>
            </div>

            {/* MODAL KONFIRMASI PENGUMPULAN SUBTES (Disesuaikan Sesuai Referensi) */}
            {showSubtestConfirmModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 text-center animate-in zoom-in-95 shadow-2xl">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto">
                            <Lock className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-base text-slate-900">
                                {currentSubtestIndex === subtestsList.length - 1
                                    ? "Selesaikan Seluruh Ujian?"
                                    : `Kumpulkan Subtes ${activeSubtestConfig.name}?`}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">
                                Jawaban pada subtes ini akan dikunci permanen.
                            </p>
                        </div>
                        <div className="flex gap-2 pt-1">
                            <button
                                onClick={() => setShowSubtestConfirmModal(false)}
                                className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                            >
                                Periksa Lagi
                            </button>
                            <button
                                onClick={handleNextSubtestManual}
                                className="w-1/2 py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-blue-900 text-white text-xs font-bold cursor-pointer shadow-md shadow-blue-900/20"
                            >
                                {currentSubtestIndex === subtestsList.length - 1 ? "Kirim Semua" : "Kumpulkan & Lanjut"}
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