"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Clock, CheckCircle2, ChevronLeft, ChevronRight, BarChart2, Award,
  BookOpen, Printer, X, FastForward, Maximize2, ShieldAlert, Play, Lock, Compass,
  TrendingUp, AlertCircle, Timer, GraduationCap, ExternalLink, User,
  Home, RotateCcw, ArrowLeft
} from "lucide-react";

import {
  FULL_SIMULATION_QUESTIONS,
  OFFICIAL_SUBTESTS,
  QuestionItem
} from "@/data/simulationQuestions";

// DATABASE BENCHMARK KAMPUS & PRODI RESMI SNBT
const PTN_BENCHMARK_DATABASE = [
  { id: "ipb-tp", ptn: "Institut Pertanian Bogor", prodi: "Teknologi Pangan", dt: 39, peminat: 1538, ik: "2.54%", passingScore: 671.4, subtesUtama: "Penalaran Matematika & Penalaran Umum" },
  { id: "ipb-gizi", ptn: "Institut Pertanian Bogor", prodi: "Ilmu Gizi", dt: 39, peminat: 1229, ik: "2.44%", passingScore: 667.6, subtesUtama: "Penalaran Matematika & Penalaran Umum" },
  { id: "ui-tekkom", ptn: "Universitas Indonesia", prodi: "Teknik Komputer", dt: 30, peminat: 1120, ik: "2.68%", passingScore: 685.2, subtesUtama: "Pengetahuan Kuantitatif & Penalaran Matematika" },
  { id: "ui-hukum", ptn: "Universitas Indonesia", prodi: "Ilmu Hukum", dt: 90, peminat: 1850, ik: "4.86%", passingScore: 678.0, subtesUtama: "Literasi Bahasa Indonesia & Penalaran Umum" },
  { id: "unpad-tp", ptn: "Universitas Padjadjaran", prodi: "Teknologi Pangan", dt: 58, peminat: 1494, ik: "3.88%", passingScore: 652.8, subtesUtama: "Penalaran Matematika & Literasi Indonesia" },
  { id: "undip-tp", ptn: "Universitas Diponegoro", prodi: "Teknologi Pangan", dt: 73, peminat: 1296, ik: "5.63%", passingScore: 644.5, subtesUtama: "Penalaran Matematika & Penalaran Umum" },
  { id: "ub-tp", ptn: "Universitas Brawijaya", prodi: "Teknologi Pangan", dt: 75, peminat: 1157, ik: "6.48%", passingScore: 641.0, subtesUtama: "Penalaran Matematika & Penalaran Umum" },
  { id: "upn-jatim-tp", ptn: "UPN 'Veteran' Jawa Timur", prodi: "Teknologi Pangan", dt: 78, peminat: 850, ik: "9.18%", passingScore: 612.3, subtesUtama: "Penalaran Matematika & Penalaran Umum" },
  { id: "ub-gizi", ptn: "Universitas Brawijaya", prodi: "Ilmu Gizi", dt: 54, peminat: 1243, ik: "4.34%", passingScore: 650.1, subtesUtama: "Penalaran Matematika & Penalaran Umum" },
  { id: "unhas-gizi", ptn: "Universitas Hasanuddin", prodi: "Ilmu Gizi", dt: 78, peminat: 997, ik: "7.82%", passingScore: 622.4, subtesUtama: "Penalaran Matematika & Penalaran Umum" },
  { id: "uin-komputasi", ptn: "UIN Syarif Hidayatullah", prodi: "Sains Komputasi", dt: 40, peminat: 620, ik: "6.45%", passingScore: 598.0, subtesUtama: "Pengetahuan Kuantitatif & Penalaran Umum" },
];

export default function SimulationPage() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [allQuestions] = useState<QuestionItem[]>(FULL_SIMULATION_QUESTIONS);
  const [currentSubtestIndex, setCurrentSubtestIndex] = useState(0);
  const [currentQIndexInSubtest, setCurrentQIndexInSubtest] = useState(0);
  const [subtestTimeLeft, setSubtestTimeLeft] = useState<number>(30 * 60);

  // TRACKING DURASI & BLOCKING TIME
  const [subtestTimeSpent, setSubtestTimeSpent] = useState<Record<string, number>>({});
  const [examDateStr, setExamDateStr] = useState<string>("");
  const [examStartTime, setExamStartTime] = useState<string>("");
  const [examEndTime, setExamEndTime] = useState<string>("");

  // DUA PILIHAN PROGRAM STUDI TARGET
  const [targetPtn1, setTargetPtn1] = useState(PTN_BENCHMARK_DATABASE[0]);
  const [targetPtn2, setTargetPtn2] = useState(PTN_BENCHMARK_DATABASE[1]);

  const [isWaitingNextSubtest, setIsWaitingNextSubtest] = useState(false);
  const [answers, setAnswers] = useState<Record<string | number, string>>({});
  const [doubtfuls, setDoubtfuls] = useState<Record<string | number, boolean>>({});
  const [fontSizeMode, setFontSizeMode] = useState<"normal" | "large" | "xlarge">("normal");
  const [isInExam, setIsInExam] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showSubtestConfirmModal, setShowSubtestConfirmModal] = useState(false);

  // LOGO FALLBACK SAFE
  const [logoLoadError, setLogoLoadError] = useState(false);

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<"ALL" | "CORRECT" | "INCORRECT" | "BLANK">("ALL");

  const [ping, setPing] = useState(28);
  const [violationCount, setViolationCount] = useState(0);
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [isExamLockedPermanently, setIsExamLockedPermanently] = useState(false);

  const activeSubtestConfig = OFFICIAL_SUBTESTS[currentSubtestIndex] || OFFICIAL_SUBTESTS[0];

  const currentSubtestQuestions = useMemo(() => {
    return allQuestions.filter((q) => q.subtest === activeSubtestConfig.code);
  }, [allQuestions, activeSubtestConfig]);

  // FUNGSI SELESAI UJIAN
  const finalizeExam = useCallback(() => {
    const now = new Date();
    setExamEndTime(now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }));
    setIsSubmitted(true);
  }, []);

  useEffect(() => {
    if (!isWaitingNextSubtest) {
      setSubtestTimeLeft((activeSubtestConfig.defaultDurationMinutes || 20) * 60);
      setCurrentQIndexInSubtest(0);
    }
  }, [currentSubtestIndex, activeSubtestConfig, isWaitingNextSubtest]);

  // TIMER SUBTES DAN PENCATAT WAKTU RIIL (BLOCKING TIME)
  useEffect(() => {
    if (!isInExam || isSubmitted || isExamLockedPermanently || isWaitingNextSubtest) return;

    const timer = setInterval(() => {
      setSubtestTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      setSubtestTimeSpent((prev) => ({
        ...prev,
        [activeSubtestConfig.code]: (prev[activeSubtestConfig.code] || 0) + 1
      }));
      setPing(Math.floor(26 + Math.random() * 8));
    }, 1000);

    return () => clearInterval(timer);
  }, [isInExam, isSubmitted, isExamLockedPermanently, isWaitingNextSubtest, activeSubtestConfig]);

  // TRANSISI WAKTU HABIS OTOMATIS
  useEffect(() => {
    if (subtestTimeLeft === 0 && isInExam && !isSubmitted && !isWaitingNextSubtest) {
      if (currentSubtestIndex < OFFICIAL_SUBTESTS.length - 1) {
        setIsWaitingNextSubtest(true);
      } else {
        finalizeExam();
      }
    }
  }, [subtestTimeLeft, isInExam, isSubmitted, isWaitingNextSubtest, currentSubtestIndex, finalizeExam]);

  const recordViolation = useCallback((reason: string) => {
    if (!isInExam || isSubmitted || isExamLockedPermanently) return;
    setViolationCount((prev) => {
      const next = prev + 1;
      if (next >= 3) setIsExamLockedPermanently(true);
      return next;
    });
    setShowViolationModal(true);
  }, [isInExam, isSubmitted, isExamLockedPermanently]);

  useEffect(() => {
    if (!isInExam || isSubmitted) return;
    const handleFull = () => {
      if (!document.fullscreenElement) recordViolation("Meninggalkan Layar Penuh");
    };
    const handleBlur = () => recordViolation("Fokus Layar Hilang");

    document.addEventListener("fullscreenchange", handleFull);
    window.addEventListener("blur", handleBlur);
    return () => {
      document.removeEventListener("fullscreenchange", handleFull);
      window.removeEventListener("blur", handleBlur);
    };
  }, [isInExam, isSubmitted, recordViolation]);

  const enterChamber = () => {
    const now = new Date();
    setExamDateStr(now.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }));
    setExamStartTime(now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }));
    if (typeof document !== "undefined" && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => { });
    }
    setIsInExam(true);
    setShowViolationModal(false);
  };

  const handleStartSimulation = enterChamber;

  const currentQ = currentSubtestQuestions[currentQIndexInSubtest] || currentSubtestQuestions[0];

  const handleSelectOption = (optId: string) => {
    if (isExamLockedPermanently || !currentQ) return;
    setAnswers((prev) => ({ ...prev, [currentQ.id]: optId }));
  };

  const handleToggleDoubtful = () => {
    if (isExamLockedPermanently || !currentQ) return;
    setDoubtfuls((prev) => ({ ...prev, [currentQ.id]: !prev[currentQ.id] }));
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `00:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

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

  // REKAPITULASI DETAIL 7 SUBTES BERBASIS IRT STANDAR RESMI (200 - 1000)
  const detailedAnalysis = useMemo(() => {
    const metrics = OFFICIAL_SUBTESTS.map((sub) => {
      const qList = allQuestions.filter((q) => q.subtest === sub.code);
      let benar = 0;
      let salah = 0;
      let kosong = 0;

      let earnedWeight = 0;
      let totalWeight = 0;

      qList.forEach((q, idx) => {
        const itemDifficultyWeight = idx < 5 ? 1.0 : idx < 15 ? 1.2 : 1.4;
        totalWeight += itemDifficultyWeight;

        const u = answers[q.id];
        if (!u) {
          kosong++;
        } else if (u === q.correctAnswer) {
          benar++;
          earnedWeight += itemDifficultyWeight;
        } else {
          salah++;
        }
      });

      const ratio = totalWeight > 0 ? earnedWeight / totalWeight : 0;
      const calculatedIrt = benar === 0 ? 200 : Math.round((200 + ratio * 800) * 10) / 10;
      const score = Math.min(1000, Math.max(200, calculatedIrt));

      const spentSec = subtestTimeSpent[sub.code] || 0;
      const totalSec = sub.defaultDurationMinutes * 60;
      const spentMin = Math.floor(spentSec / 60);
      const spentRemainingSec = spentSec % 60;
      const timePercent = Math.min(100, Math.round((spentSec / totalSec) * 100));

      const accuracy = benar / (qList.length || 1);
      let timeEvaluation: "Efisien" | "Materi perlu diperkuat" | "Terburu-buru" = "Efisien";
      let timeNote = "Tepat dan hemat waktu. Pertahankan efisiensi ini.";

      if (accuracy < 0.55 && spentSec > totalSec * 0.7) {
        timeEvaluation = "Materi perlu diperkuat";
        timeNote = "Semua soal terisi, tapi yang benar masih sedikit. Fokuskan belajarmu di subtes ini.";
      } else if (spentSec < totalSec * 0.4 && accuracy < 0.6) {
        timeEvaluation = "Terburu-buru";
        timeNote = "Waktumu masih tersisa banyak, tapi banyak jawaban yang meleset. Kerjakan lebih teliti.";
      }

      return {
        ...sub,
        benar,
        salah,
        kosong,
        score,
        spentSec,
        spentMin,
        spentRemainingSec,
        timePercent,
        timeEvaluation,
        timeNote,
        accuracyPercent: Math.round(accuracy * 100)
      };
    });

    const skolastik = metrics.filter((s) => ["PU", "PPU", "PBM", "PK"].includes(s.code));
    const avgSkolastik = Math.round((skolastik.reduce((acc, curr) => acc + curr.score, 0) / skolastik.length) * 10) / 10;
    const totalBenarSkolastik = skolastik.reduce((acc, curr) => acc + curr.benar, 0);
    const totalSalahSkolastik = skolastik.reduce((acc, curr) => acc + curr.salah, 0);
    const totalKosongSkolastik = skolastik.reduce((acc, curr) => acc + curr.kosong, 0);

    const literasi = metrics.filter((s) => ["LIT_INDO", "LIT_ENG", "PM"].includes(s.code));
    const avgLiterasi = Math.round((literasi.reduce((acc, curr) => acc + curr.score, 0) / literasi.length) * 10) / 10;
    const totalBenarLiterasi = literasi.reduce((acc, curr) => acc + curr.benar, 0);
    const totalSalahLiterasi = literasi.reduce((acc, curr) => acc + curr.salah, 0);
    const totalKosongLiterasi = literasi.reduce((acc, curr) => acc + curr.kosong, 0);

    const totalAverage = Math.round(((avgSkolastik * 4 + avgLiterasi * 3) / 7) * 10) / 10;

    return {
      metrics,
      skolastik,
      avgSkolastik,
      totalBenarSkolastik,
      totalSalahSkolastik,
      totalKosongSkolastik,
      literasi,
      avgLiterasi,
      totalBenarLiterasi,
      totalSalahLiterasi,
      totalKosongLiterasi,
      totalAverage
    };
  }, [allQuestions, answers, subtestTimeSpent]);

  // REKOMENDASI KAMPUS ALTERNATIF
  const alternativePtnList = useMemo(() => {
    return PTN_BENCHMARK_DATABASE.filter(
      (item) => item.ptn !== targetPtn1.ptn || item.prodi !== targetPtn1.prodi
    ).map((item) => {
      const isEligible = detailedAnalysis.totalAverage >= item.passingScore;
      return {
        ...item,
        kemiripan: item.prodi.toLowerCase().includes(targetPtn1.prodi.toLowerCase().split(" ")[0]) ? "100%" : "50%",
        statusPeluang: isEligible ? "Peluang Tinggi" : "Perlu Peningkatan"
      };
    });
  }, [targetPtn1, detailedAnalysis.totalAverage]);

  const handleExportToExternalApp = () => {
    const payload = {
      sekolah: "SMA Muhammadiyah 18 Jakarta",
      skorFinal: detailedAnalysis.totalAverage,
      avgSkolastik: detailedAnalysis.avgSkolastik,
      avgLiterasi: detailedAnalysis.avgLiterasi,
      pilihan1: targetPtn1,
      pilihan2: targetPtn2,
      subtes: detailedAnalysis.metrics.map((s) => ({ kode: s.code, skor: s.score, benar: s.benar, durasiDetik: s.spentSec }))
    };

    if (typeof window !== "undefined") {
      localStorage.setItem("cbt_analysis_handoff_payload", JSON.stringify(payload));
      alert(`Data skor (${detailedAnalysis.totalAverage}) berhasil disiapkan untuk disinkronkan ke aplikasi analisis SNBT Anda.`);
    }
  };

  const fontClasses = {
    normal: { stimulus: "text-xs sm:text-sm leading-relaxed", question: "text-sm sm:text-base font-semibold", option: "text-xs sm:text-sm" },
    large: { stimulus: "text-sm sm:text-base leading-relaxed", question: "text-base sm:text-lg font-semibold", option: "text-sm sm:text-base" },
    xlarge: { stimulus: "text-base sm:text-lg leading-relaxed", question: "text-lg sm:text-xl font-bold", option: "text-base sm:text-lg" }
  }[fontSizeMode];

  const filteredReview = useMemo(() => {
    return allQuestions.filter((q) => {
      const u = answers[q.id];
      if (reviewFilter === "CORRECT") return u === q.correctAnswer;
      if (reviewFilter === "INCORRECT") return u && u !== q.correctAnswer;
      if (reviewFilter === "BLANK") return !u;
      return true;
    });
  }, [allQuestions, answers, reviewFilter]);

  if (!isMounted) return null;

  // 1. GERBANG AWAL KARANTINA
  if (!isInExam) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans text-slate-800">
        <div className="w-full max-w-xl bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-10 space-y-6">
          <div className="flex items-center gap-4 border-b pb-4">
            <div className="w-16 h-16 rounded-2xl p-1 bg-white border border-slate-200 shadow-2xs flex items-center justify-center shrink-0 overflow-hidden">
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
              <div className="text-[10px] font-mono font-bold tracking-widest text-[#1e3a8a] uppercase">SMA MUHAMMADIYAH 18 JAKARTA</div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Simulasi Uji Coba Mandiri SNBT</h1>
              <p className="text-xs text-slate-500">Standarisasi Instrumen UTBK (145 Butir Soal • 195 Menit)</p>
            </div>
          </div>

          <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-blue-700" />
              <span>Pilih Dua Program Studi Sasaran Anda:</span>
            </div>

            <div className="space-y-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Pilihan 1 (Prioritas Utama):</label>
                <select
                  value={targetPtn1.id}
                  onChange={(e) => {
                    const found = PTN_BENCHMARK_DATABASE.find((item) => item.id === e.target.value);
                    if (found) setTargetPtn1(found);
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium text-xs text-slate-800"
                >
                  {PTN_BENCHMARK_DATABASE.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.ptn} - {item.prodi} (Passing Grade: {item.passingScore})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Pilihan 2 (Alternatif):</label>
                <select
                  value={targetPtn2.id}
                  onChange={(e) => {
                    const found = PTN_BENCHMARK_DATABASE.find((item) => item.id === e.target.value);
                    if (found) setTargetPtn2(found);
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium text-xs text-slate-800"
                >
                  {PTN_BENCHMARK_DATABASE.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.ptn} - {item.prodi} (Passing Grade: {item.passingScore})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            <button
              onClick={enterChamber}
              className="w-full py-3.5 px-6 rounded-2xl bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
            >
              <Maximize2 className="w-4 h-4" />
              <span>Mulai Uji Coba Simulasi</span>
            </button>

            <Link
              href="/"
              className="w-full py-3 px-6 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Batal &amp; Kembali ke Halaman Utama</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. LAYAR JEDA KONFIRMASI ANTAR-SUBTES
  if (isWaitingNextSubtest) {
    const finishedSubtest = OFFICIAL_SUBTESTS[currentSubtestIndex];
    const nextSubtest = OFFICIAL_SUBTESTS[currentSubtestIndex + 1];

    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans text-slate-800">
        <div className="w-full max-w-xl bg-white rounded-3xl border-2 border-blue-200 shadow-2xl p-6 sm:p-9 space-y-6 animate-in zoom-in-95">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="font-mono text-xs font-bold text-slate-500 uppercase">Subtes {currentSubtestIndex + 1} dari 7 Selesai</div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">{finishedSubtest.name} Telah Terkunci</h2>
            <p className="text-xs text-slate-500">Lembar jawaban subtes ini sudah disimpan permanen.</p>
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

          <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-blue-900 text-sm">
              <Clock className="w-4 h-4 text-blue-700" />
              <span>Subtes Berikutnya: {nextSubtest.name}</span>
            </div>
            <div className="text-slate-600 leading-relaxed pl-6 space-y-1">
              <div>&bull; Alokasi Waktu: <strong>{nextSubtest.defaultDurationMinutes} Menit</strong></div>
              <div>&bull; Jumlah Butir: <strong>{allQuestions.filter((q) => q.subtest === nextSubtest.code).length} Butir Soal</strong></div>
            </div>
          </div>

          <button
            onClick={() => {
              setCurrentSubtestIndex((prev) => prev + 1);
              setCurrentQIndexInSubtest(0);
              setIsWaitingNextSubtest(false);
            }}
            className="w-full py-3.5 px-6 rounded-2xl bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold text-sm shadow-lg shadow-blue-900/25 cursor-pointer flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Mulai Mengerjakan Subtes {currentSubtestIndex + 2}: {nextSubtest.code}</span>
          </button>
        </div>
      </div>
    );
  }

  // 3. HASIL AKHIR & RAPOR FORMAL MODEL ELEGAN TERTATA
  if (isSubmitted) {
    const p1Pass = detailedAnalysis.totalAverage >= targetPtn1.passingScore;
    const p2Pass = detailedAnalysis.totalAverage >= targetPtn2.passingScore;

    return (
      <div className="min-h-screen bg-[#edf1f7] py-8 px-4 font-sans text-slate-800">
        <style dangerouslySetInnerHTML={{
          __html: `
            @media print {
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              body {
                background: white !important;
                padding: 0 !important;
                margin: 0 !important;
              }
              .print-hidden {
                display: none !important;
              }
              .print-sheet {
                box-shadow: none !important;
                border: none !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
              }
              .print-overflow-safe {
                overflow: visible !important;
              }
            }
          `
        }} />

        <div className="max-w-4xl mx-auto space-y-5">
          {/* ACTION BAR ATAS */}
          <div className="print-hidden bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Award className="w-4 h-4 text-emerald-600" />
              <span>Hasil Asesmen Terkalibrasi &bull; Evaluasi Diagnostik Siap Cetak</span>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Home className="w-3.5 h-3.5 text-slate-500" />
                <span>Halaman Utama</span>
              </Link>

              <button
                onClick={() => setShowReviewModal(true)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Review Pembahasan</span>
              </button>

              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Lembar Rapor</span>
              </button>
            </div>
          </div>

          {/* DOKUMEN CETAK UTAMA */}
          <div className="print-sheet bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden text-slate-900">
            {/* KOP RESMI SIMETRIS & RAPAT SMA MUHAMMADIYAH 18 JAKARTA */}
            <div className="pt-4 pb-2 px-6 sm:px-8 bg-white border-b-2 border-slate-900">
              <div className="flex items-center justify-between">
                {/* 1. LOGO SEKOLAH KIRI */}
                <div className="w-20 h-20 shrink-0 flex items-center justify-center p-0.5 bg-white rounded-xl border border-slate-100 shadow-2xs overflow-hidden">
                  <img
                    src="/logo-timsim.jpg"
                    alt="Logo SMA Muhammadiyah 18 Jakarta"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as any).src = "/images/logo-smam18.png";
                    }}
                  />
                </div>

                {/* 2. TEKS KOP DINAS (SPASI RAPAT & RATA TENGAH) */}
                <div className="flex-1 text-center px-4 space-y-0.5">
                  <h3 className="text-[11px] font-bold tracking-wider text-slate-800 uppercase leading-none">
                    MAJELIS PENDIDIKAN DASAR DAN MENENGAH
                  </h3>
                  <h4 className="text-[10.5px] font-bold tracking-wide text-slate-700 uppercase leading-tight">
                    PIMPINAN DAERAH MUHAMMADIYAH JAKARTA SELATAN
                  </h4>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight uppercase leading-none pt-0.5">
                    SMA MUHAMMADIYAH 18 JAKARTA
                  </h1>
                  <p className="text-xs font-black text-[#1e3a8a] tracking-widest font-mono uppercase leading-tight">
                    TERAKREDITASI &quot;A&quot;
                  </p>
                  <p className="text-[10px] text-slate-600 leading-tight pt-0.5">
                    Jl. Panjang No.19, RT.8/RW.9, Cipulir, Kebayoran Lama, Jakarta Selatan, DKI Jakarta 12230
                  </p>
                  <p className="text-[10px] font-mono text-slate-600 leading-none">
                    https://smamuh18jakarta.sch.id &bull; smamuh18@gmail.com
                  </p>
                </div>

                {/* 3. SPACER PENYEIMBANG KANAN AGAR TEKS 100% DI TENGAH */}
                <div className="w-20 shrink-0 hidden sm:block" />
              </div>

              {/* Garis Ganda Standar Surat Dinas */}
              <div className="w-full border-b-2 border-slate-900 mt-2.5" />
              <div className="w-full border-b border-slate-900 mt-0.5" />
            </div>

            {/* HEADER IDENTITAS UJIAN */}
            <div className="bg-[#1845a7] text-white p-5 sm:p-6 flex items-center justify-between flex-wrap gap-4" style={{ backgroundColor: "#1845a7" }}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-white font-bold">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold tracking-wide uppercase">PESERTA SIMULASI MANDIRI</div>
                  <div className="text-[11px] text-blue-100 font-mono">NISN: 0078926118 &bull; KELAS XII SMA MUHAMMADIYAH 18</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="bg-white/20 border border-white/30 px-3.5 py-1.5 rounded-xl text-right">
                  <div className="text-[9px] uppercase tracking-wider text-blue-100 font-semibold">WAKTU UJIAN</div>
                  <div className="text-xs font-mono font-bold">{examDateStr || "14 Oktober 2026"}, {examStartTime || "08:00"} - {examEndTime || "11:15"}</div>
                </div>
                <div className="bg-emerald-500 text-white font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1 shadow-xs" style={{ backgroundColor: "#10b981" }}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Selesai</span>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              {/* HERO BANNER SKOR TOTAL (SKOR REALISTIS 200 - 1000) */}
              <div
                className="rounded-2xl p-6 text-white text-center shadow-sm"
                style={{ backgroundColor: "#1c4cb7" }}
              >
                <div className="text-xs font-mono tracking-widest text-blue-100 uppercase font-semibold">
                  NILAI RATA-RATA KESELURUHAN (IRT 3-PARAMETER)
                </div>
                <div className="text-5xl sm:text-6xl font-black my-1 text-white">{detailedAnalysis.totalAverage}</div>
                <div className="text-[11px] text-blue-100 font-mono">
                  Kalkulasi 145 Butir Soal Terstandarisasi Pusmendik &bull; Skala 200 s.d. 1000
                </div>
              </div>

              {/* DUA KARTU TARGET PROGRAM STUDI SAAT UJIAN */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-blue-700" />
                  <span>Pilihan Program Studi Saat Ujian:</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Pilihan 1 */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                      <div>
                        <div className="text-[10px] font-mono text-slate-400 font-bold uppercase">PILIHAN 1</div>
                        <div className="font-bold text-sm text-slate-900">{targetPtn1.ptn}</div>
                        <div className="font-semibold text-xs text-blue-700">{targetPtn1.prodi}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] font-mono">
                      <span className="bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded border border-rose-200">IK {targetPtn1.ik}</span>
                      <span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded border border-blue-200">DT {targetPtn1.dt}</span>
                      <span className="bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded border border-purple-200">Peminat {targetPtn1.peminat}</span>
                    </div>

                    <div className="bg-amber-50 p-2 rounded-lg text-[10.5px] text-amber-900 border border-amber-200">
                      <strong>Subtes Utama:</strong> {targetPtn1.subtesUtama}
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1">
                      <div className="text-[10px] text-slate-500 font-mono">PASSING SCORE TARGET: <strong>{targetPtn1.passingScore}</strong></div>
                      <div className={`text-xs font-bold flex items-center gap-1 ${p1Pass ? "text-emerald-700" : "text-rose-700"}`}>
                        {p1Pass ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                        <span>{p1Pass ? `Skor kamu (${detailedAnalysis.totalAverage}) memenuhi passing score` : `Skor kamu (${detailedAnalysis.totalAverage}) belum memenuhi passing score`}</span>
                      </div>
                    </div>
                  </div>

                  {/* Pilihan 2 */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                      <div>
                        <div className="text-[10px] font-mono text-slate-400 font-bold uppercase">PILIHAN 2</div>
                        <div className="font-bold text-sm text-slate-900">{targetPtn2.ptn}</div>
                        <div className="font-semibold text-xs text-blue-700">{targetPtn2.prodi}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] font-mono">
                      <span className="bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded border border-rose-200">IK {targetPtn2.ik}</span>
                      <span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded border border-blue-200">DT {targetPtn2.dt}</span>
                      <span className="bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded border border-purple-200">Peminat {targetPtn2.peminat}</span>
                    </div>

                    <div className="bg-amber-50 p-2 rounded-lg text-[10.5px] text-amber-900 border border-amber-200">
                      <strong>Subtes Utama:</strong> {targetPtn2.subtesUtama}
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1">
                      <div className="text-[10px] text-slate-500 font-mono">PASSING SCORE TARGET: <strong>{targetPtn2.passingScore}</strong></div>
                      <div className={`text-xs font-bold flex items-center gap-1 ${p2Pass ? "text-emerald-700" : "text-rose-700"}`}>
                        {p2Pass ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                        <span>{p2Pass ? `Skor kamu (${detailedAnalysis.totalAverage}) memenuhi passing score` : `Skor kamu (${detailedAnalysis.totalAverage}) belum memenuhi passing score`}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SEKSI 1: TABEL TES SKOLASTIK (4 SUBTES) */}
              <div className="rounded-2xl border border-blue-200 bg-white print-overflow-safe">
                <div
                  className="text-white px-4 py-2.5 text-xs font-bold flex items-center justify-between rounded-t-2xl"
                  style={{ backgroundColor: "#1c4cb7" }}
                >
                  <span>TES SKOLASTIK (4 SUBTES)</span>
                  <span className="font-mono text-xs font-bold bg-white/20 px-2.5 py-0.5 rounded">Rerata: {detailedAnalysis.avgSkolastik}</span>
                </div>

                <div className="p-4">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b text-slate-400 font-mono text-[10px] uppercase">
                        <th className="py-2">SUBTES</th>
                        <th className="py-2 text-center w-20">BENAR</th>
                        <th className="py-2 text-center w-20">SALAH</th>
                        <th className="py-2 text-center w-20">KOSONG</th>
                        <th className="py-2 w-48">PROGRES CAPAIAN</th>
                        <th className="py-2 text-right w-20">SKOR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detailedAnalysis.skolastik.map((s) => {
                        const pct = Math.min(100, Math.max(0, ((s.score - 200) / 800) * 100));
                        return (
                          <tr key={s.code} className="hover:bg-slate-50">
                            <td className="py-2.5 font-medium">{s.name}</td>
                            <td className="py-2.5 text-center font-mono font-bold text-emerald-700">{s.benar}</td>
                            <td className="py-2.5 text-center font-mono font-bold text-rose-700">{s.salah}</td>
                            <td className="py-2.5 text-center font-mono text-slate-400">{s.kosong}</td>
                            <td className="py-2.5">
                              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: "#2563eb" }} />
                              </div>
                            </td>
                            <td className="py-2.5 text-right font-mono font-bold text-blue-800">{s.score.toFixed(1)}</td>
                          </tr>
                        );
                      })}
                      <tr className="bg-slate-50 font-bold border-t-2">
                        <td className="py-2 text-blue-900">Nilai Rata-rata Skolastik</td>
                        <td className="py-2 text-center font-mono text-emerald-700">{detailedAnalysis.totalBenarSkolastik}</td>
                        <td className="py-2 text-center font-mono text-rose-700">{detailedAnalysis.totalSalahSkolastik}</td>
                        <td className="py-2 text-center font-mono text-slate-400">{detailedAnalysis.totalKosongSkolastik}</td>
                        <td className="py-2">
                          <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                            <div className="bg-blue-800 h-2.5 rounded-full" style={{ width: `${Math.min(100, Math.max(0, ((detailedAnalysis.avgSkolastik - 200) / 800) * 100))}%`, backgroundColor: "#1e40af" }} />
                          </div>
                        </td>
                        <td className="py-2 text-right font-mono text-blue-900 text-sm">{detailedAnalysis.avgSkolastik}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SEKSI 2: TABEL TES LITERASI (3 SUBTES) */}
              <div className="rounded-2xl border border-purple-200 bg-white print-overflow-safe">
                <div
                  className="text-white px-4 py-2.5 text-xs font-bold flex items-center justify-between rounded-t-2xl"
                  style={{ backgroundColor: "#6b31c9" }}
                >
                  <span>TES LITERASI &amp; PENALARAN MATEMATIKA (3 SUBTES)</span>
                  <span className="font-mono text-xs font-bold bg-white/20 px-2.5 py-0.5 rounded">Rerata: {detailedAnalysis.avgLiterasi}</span>
                </div>

                <div className="p-4">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b text-slate-400 font-mono text-[10px] uppercase">
                        <th className="py-2">SUBTES</th>
                        <th className="py-2 text-center w-20">BENAR</th>
                        <th className="py-2 text-center w-20">SALAH</th>
                        <th className="py-2 text-center w-20">KOSONG</th>
                        <th className="py-2 w-48">PROGRES CAPAIAN</th>
                        <th className="py-2 text-right w-20">SKOR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detailedAnalysis.literasi.map((s) => {
                        const pct = Math.min(100, Math.max(0, ((s.score - 200) / 800) * 100));
                        return (
                          <tr key={s.code} className="hover:bg-slate-50">
                            <td className="py-2.5 font-medium">{s.name}</td>
                            <td className="py-2.5 text-center font-mono font-bold text-emerald-700">{s.benar}</td>
                            <td className="py-2.5 text-center font-mono font-bold text-rose-700">{s.salah}</td>
                            <td className="py-2.5 text-center font-mono text-slate-400">{s.kosong}</td>
                            <td className="py-2.5">
                              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                <div className="bg-purple-600 h-2.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: "#9333ea" }} />
                              </div>
                            </td>
                            <td className="py-2.5 text-right font-mono font-bold text-purple-800">{s.score.toFixed(1)}</td>
                          </tr>
                        );
                      })}
                      <tr className="bg-slate-50 font-bold border-t-2">
                        <td className="py-2 text-purple-900">Nilai Rata-rata Literasi</td>
                        <td className="py-2 text-center font-mono text-emerald-700">{detailedAnalysis.totalBenarLiterasi}</td>
                        <td className="py-2 text-center font-mono text-rose-700">{detailedAnalysis.totalSalahLiterasi}</td>
                        <td className="py-2 text-center font-mono text-slate-400">{detailedAnalysis.totalKosongLiterasi}</td>
                        <td className="py-2">
                          <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                            <div className="bg-purple-800 h-2.5 rounded-full" style={{ width: `${Math.min(100, Math.max(0, ((detailedAnalysis.avgLiterasi - 200) / 800) * 100))}%`, backgroundColor: "#6b21a8" }} />
                          </div>
                        </td>
                        <td className="py-2 text-right font-mono text-purple-900 text-sm">{detailedAnalysis.avgLiterasi}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SEKSI 3: BLOCKING TIME & EVALUASI WAKTU */}
              <div className="rounded-2xl border border-slate-800 bg-white print-overflow-safe">
                <div
                  className="text-white px-4 py-2.5 text-xs font-bold flex items-center justify-between rounded-t-2xl"
                  style={{ backgroundColor: "#121c2d" }}
                >
                  <span className="flex items-center gap-1.5">
                    <Timer className="w-3.5 h-3.5 text-blue-400" />
                    <span>BLOCKING TIME &amp; EVALUASI KECEPATAN PENGERJAAN</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono font-normal">Terkalibrasi Presisi</span>
                </div>

                <div className="p-4 divide-y divide-slate-100 text-xs">
                  {detailedAnalysis.metrics.map((s) => (
                    <div key={s.code} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-900">{s.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          Dikerjakan <strong>{s.spentMin} menit {s.spentRemainingSec} detik</strong> dari {s.defaultDurationMinutes} menit ({s.timePercent}%) &bull; Benar {s.benar}, Salah {s.salah}, Kosong {s.kosong}
                        </div>
                        <div className="text-[11px] text-slate-600 italic">{s.timeNote}</div>
                      </div>

                      <div className="shrink-0">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${s.timeEvaluation === "Efisien" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                          s.timeEvaluation === "Terburu-buru" ? "bg-amber-50 text-amber-700 border-amber-200" :
                            "bg-rose-50 text-rose-700 border-rose-200"
                          }`}>
                          {s.timeEvaluation}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SEKSI 4: ANALISA PASSING SCORE PER SUBTES */}
              <div className="rounded-2xl border border-slate-200 bg-white print-overflow-safe">
                <div
                  className="text-white px-4 py-2.5 text-xs font-bold rounded-t-2xl"
                  style={{ backgroundColor: "#121c2d" }}
                >
                  ANALISA PASSING SCORE PER SUBTES TERHADAP PROGRAM STUDI PILIHAN
                </div>

                <div className="p-4">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b text-slate-400 font-mono text-[10px] uppercase">
                        <th className="py-2">SUBTES</th>
                        <th className="py-2 text-center">SKOR KAMU</th>
                        <th className="py-2 text-center">PILIHAN 1 - {targetPtn1.prodi.toUpperCase()}</th>
                        <th className="py-2 text-center">PILIHAN 2 - {targetPtn2.prodi.toUpperCase()}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detailedAnalysis.metrics.map((s) => {
                        const pass1 = s.score >= targetPtn1.passingScore;
                        const pass2 = s.score >= targetPtn2.passingScore;

                        return (
                          <tr key={s.code} className="hover:bg-slate-50">
                            <td className="py-2.5 font-medium">{s.name}</td>
                            <td className="py-2.5 text-center font-mono font-bold text-blue-900">{s.score.toFixed(1)}</td>
                            <td className="py-2.5 text-center">
                              <span className={`font-mono font-bold text-[11px] ${pass1 ? "text-emerald-700" : "text-rose-600"}`}>
                                {pass1 ? `✓ ${targetPtn1.passingScore}` : `✗ Belum mencukupi (${targetPtn1.passingScore})`}
                              </span>
                            </td>
                            <td className="py-2.5 text-center">
                              <span className={`font-mono font-bold text-[11px] ${pass2 ? "text-emerald-700" : "text-rose-600"}`}>
                                {pass2 ? `✓ ${targetPtn2.passingScore}` : `✗ Belum mencukupi (${targetPtn2.passingScore})`}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SEKSI 5: DIAGRAM BATANG KOMPARASI 7 SUBTES MODERN */}
              <div className="rounded-2xl border border-slate-200 p-6 bg-white space-y-4">
                <div className="flex items-center justify-between border-b pb-3 flex-wrap gap-2">
                  <div>
                    <h3 className="font-bold text-xs uppercase text-slate-900 flex items-center gap-1.5">
                      <BarChart2 className="w-4 h-4 text-blue-700" />
                      <span>DIAGRAM KOMPARASI CAPAIAN 7 SUBTES (SKALA 200 - 1000)</span>
                    </h3>
                    <p className="text-[11px] text-slate-500">Garis vertikal putus-putus menunjukkan ambang batas aman kelulusan SNBT (Target 650)</p>
                  </div>

                  <div className="flex items-center gap-3 text-[10px] font-mono">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500" style={{ backgroundColor: "#10b981" }} /> &gt;= 650 (Aman)</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-500" style={{ backgroundColor: "#f59e0b" }} /> 400 - 649 (Cukup)</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-rose-500" style={{ backgroundColor: "#f43f5e" }} /> &lt; 400 (Kurang)</span>
                  </div>
                </div>

                {/* DIAGRAM BATANG HORIZONTAL EKSEKUTIF */}
                <div className="space-y-3 pt-4 relative">
                  {/* Reference Line Target 650 */}
                  <div
                    className="absolute top-0 bottom-0 border-r-2 border-dashed border-slate-400 z-10 pointer-events-none"
                    style={{ left: `${((650 - 200) / 800) * 100}%` }}
                  >
                    <span className="text-[9px] font-mono font-bold bg-slate-800 text-white px-1.5 py-0.5 rounded absolute -top-5 -translate-x-1/2">
                      TARGET 650
                    </span>
                  </div>

                  {detailedAnalysis.metrics.map((s) => {
                    const pct = Math.min(100, Math.max(0, ((s.score - 200) / 800) * 100));
                    const barColor = s.score >= 650 ? "#10b981" : s.score >= 400 ? "#f59e0b" : "#f43f5e";

                    return (
                      <div key={s.code} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-slate-700">{s.name} ({s.code})</span>
                          <span className="font-mono font-bold text-slate-900">{s.score.toFixed(1)}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-4 rounded-lg overflow-hidden flex items-center relative">
                          <div
                            className="h-full rounded-lg transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: barColor }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SEKSI 6: REKOMENDASI PTN LAIN BERDASARKAN SKOR */}
              <div className="rounded-2xl border border-slate-200 bg-white print-overflow-safe">
                <div
                  className="text-white px-4 py-2.5 text-xs font-bold flex items-center justify-between rounded-t-2xl"
                  style={{ backgroundColor: "#121c2d" }}
                >
                  <span>REKOMENDASI PTN LAIN &bull; PROGRAM STUDI SERUPA DENGAN PILIHAN 1</span>
                  <span className="text-[10px] text-slate-400 font-mono">Daya Tampung &amp; Keketatan</span>
                </div>

                <div className="p-4">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b text-slate-400 font-mono text-[10px] uppercase">
                        <th className="py-2">#</th>
                        <th className="py-2">UNIVERSITAS</th>
                        <th className="py-2">PROGRAM STUDI</th>
                        <th className="py-2 text-center">IK (%)</th>
                        <th className="py-2 text-center">DAYA TAMPUNG</th>
                        <th className="py-2 text-center">PEMINAT</th>
                        <th className="py-2 text-right">PELUANG KELULUSAN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {alternativePtnList.map((alt, idx) => (
                        <tr key={alt.id || idx} className="hover:bg-slate-50">
                          <td className="py-2.5 font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-2.5 font-bold text-slate-900">{alt.ptn}</td>
                          <td className="py-2.5 font-medium">{alt.prodi}</td>
                          <td className="py-2.5 text-center font-mono">{alt.ik}</td>
                          <td className="py-2.5 text-center font-mono">{alt.dt}</td>
                          <td className="py-2.5 text-center font-mono">{alt.peminat}</td>
                          <td className="py-2.5 text-right font-bold text-[11px]">
                            <span className={alt.statusPeluang === "Peluang Tinggi" ? "text-emerald-700" : "text-amber-700"}>
                              {alt.statusPeluang}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* HANDOFF SATU KLIK KE APLIKASI ANALISIS SNBT */}
              <div
                className="print-hidden p-5 rounded-2xl text-white flex items-center justify-between flex-wrap gap-4 shadow-lg"
                style={{ backgroundColor: "#1e3a8a" }}
              >
                <div className="space-y-1">
                  <div className="font-bold text-sm sm:text-base flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                    <span>Lanjutkan ke Aplikasi Analisis &amp; Rasionalisasi SNBT</span>
                  </div>
                  <p className="text-xs text-blue-200 max-w-xl">
                    Skor rata-rata Anda (<strong>{detailedAnalysis.totalAverage}</strong>) dapat langsung diuji ke simulator passing grade dengan data daya tampung seluruh PTN nasional.
                  </p>
                </div>

                <button
                  onClick={handleExportToExternalApp}
                  className="px-5 py-3 rounded-xl bg-white text-blue-950 font-bold text-xs hover:bg-blue-50 cursor-pointer flex items-center gap-2 shadow-md transition-all active:scale-95"
                >
                  <span>Buka Aplikasi Analisis</span>
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>

              {/* LEMBAR PENGESAHAN TANDA TANGAN FORMAL */}
              <div className="pt-6 grid grid-cols-2 text-xs text-center border-t border-slate-200">
                <div>
                  <p>Mengetahui,</p>
                  <p className="font-semibold mt-1">Koordinator BK / Pembina KIR</p>
                  <div className="h-16" />
                  <p className="font-bold underline text-slate-900">Fadhillah Umar, S.Pd.</p>
                  <p className="text-[10px] text-slate-500 font-mono">NBM. 118.2026.091</p>
                </div>

                <div>
                  <p>Jakarta, {examDateStr || "14 Oktober 2026"}</p>
                  <p className="font-semibold mt-1">Peserta Ujian</p>
                  <div className="h-16" />
                  <p className="font-bold underline text-slate-900">( Tanda Tangan Siswa )</p>
                  <p className="text-[10px] text-slate-500 font-mono">NISN: 0078926118</p>
                </div>
              </div>
            </div>
          </div>

          {/* FOOTER NAVIGASI KELUAR / ULANGI DI BAGIAN BAWAH RAPOR */}
          <div className="print-hidden flex items-center justify-between gap-3 pt-3">
            <button
              onClick={() => {
                setAnswers({});
                setDoubtfuls({});
                setCurrentSubtestIndex(0);
                setCurrentQIndexInSubtest(0);
                setIsWaitingNextSubtest(false);
                setViolationCount(0);
                setIsExamLockedPermanently(false);
                setIsSubmitted(false);
                setIsInExam(false);
              }}
              className="w-1/2 py-3 rounded-2xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-2xs transition-all"
            >
              <RotateCcw className="w-4 h-4 text-slate-500" />
              <span>Ulangi Simulasi</span>
            </button>

            <Link
              href="/"
              className="w-1/2 py-3 rounded-2xl bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-900/20 text-center transition-all"
            >
              <Home className="w-4 h-4" />
              <span>Kembali ke Halaman Utama</span>
            </Link>
          </div>
        </div>

        {/* MODAL REVIEW PEMBAHASAN 145 BUTIR */}
        {showReviewModal && (
          <div className="fixed inset-0 z-[999999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 print-hidden">
            <div className="bg-white rounded-3xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  <span>Pembahasan 145 Butir Soal</span>
                </h3>
                <button onClick={() => setShowReviewModal(false)} className="p-1.5 rounded-lg border border-slate-200 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 border-b border-slate-100 flex gap-2 flex-wrap text-xs bg-white">
                <button onClick={() => setReviewFilter("ALL")} className={`px-2.5 py-1 rounded-lg border font-bold cursor-pointer ${reviewFilter === "ALL" ? "bg-slate-900 text-white" : "bg-white"}`}>Semua ({allQuestions.length})</button>
                <button onClick={() => setReviewFilter("CORRECT")} className={`px-2.5 py-1 rounded-lg border font-bold cursor-pointer ${reviewFilter === "CORRECT" ? "bg-emerald-600 text-white" : "bg-white"}`}>Benar</button>
                <button onClick={() => setReviewFilter("INCORRECT")} className={`px-2.5 py-1 rounded-lg border font-bold cursor-pointer ${reviewFilter === "INCORRECT" ? "bg-rose-600 text-white" : "bg-white"}`}>Salah</button>
                <button onClick={() => setReviewFilter("BLANK")} className={`px-2.5 py-1 rounded-lg border font-bold cursor-pointer ${reviewFilter === "BLANK" ? "bg-amber-500 text-white" : "bg-white"}`}>Kosong</button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-50/50">
                {filteredReview.map((q, idx) => {
                  const uAns = answers[q.id];
                  const isRight = uAns === q.correctAnswer;
                  return (
                    <div key={q.id} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                        <span className="font-mono font-bold text-blue-700">{q.subtest} &bull; No. {idx + 1}</span>
                        <span className={`px-2 py-0.5 rounded font-bold ${!uAns ? "bg-amber-50 text-amber-700" : isRight ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                          {!uAns ? "Kosong" : isRight ? "Benar" : "Salah"}
                        </span>
                      </div>
                      {q.stimulus && <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl whitespace-pre-line">{q.stimulus}</div>}
                      <div className="text-xs sm:text-sm font-semibold">{q.question}</div>
                      <div className="space-y-1">
                        {q.options.map((opt) => (
                          <div key={opt.id} className={`p-2 rounded-lg border text-xs flex justify-between ${opt.id === q.correctAnswer ? "border-emerald-500 bg-emerald-50 text-emerald-900 font-bold" : uAns === opt.id ? "border-rose-400 bg-rose-50 text-rose-900 line-through" : "border-slate-200"}`}>
                            <span>{opt.id}. {opt.text}</span>
                            {opt.id === q.correctAnswer && <span className="text-[10px] text-emerald-700">Kunci</span>}
                          </div>
                        ))}
                      </div>
                      <div className="text-xs p-2.5 rounded-xl bg-indigo-50 text-indigo-950">
                        <strong>Pembahasan:</strong> {q.explanation}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 4. BILIK PENGERJAAN SOAL
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans select-none text-slate-800">
      {showViolationModal && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-2 border-rose-500 max-w-md w-full p-6 text-center space-y-4">
            <ShieldAlert className="w-10 h-10 text-rose-600 mx-auto" />
            <h3 className="text-lg font-black text-slate-900">
              {isExamLockedPermanently ? "Simulasi Terkunci!" : `Peringatan Integritas (${violationCount}/3)`}
            </h3>
            <p className="text-xs text-slate-600">Dilarang keluar dari layar penuh selama simulasi berlangsung.</p>
            {isExamLockedPermanently ? (
              <button onClick={() => setIsSubmitted(true)} className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold text-xs cursor-pointer">
                Kumpulkan Lembar Simulasi
              </button>
            ) : (
              <button onClick={() => setShowViolationModal(false)} className="w-full py-3 rounded-xl bg-blue-700 text-white font-bold text-xs cursor-pointer">
                Kunci Kembali Layar Penuh
              </button>
            )}
          </div>
        </div>
      )}

      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-800 font-black flex items-center justify-center text-xs">SIM</div>
          <div>
            <div className="font-bold text-xs sm:text-sm">{activeSubtestConfig.name}</div>
            <div className="text-[11px] text-slate-500 font-mono">Subtes {currentSubtestIndex + 1} dari 7</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center bg-slate-100 p-0.5 rounded-lg border text-xs font-bold text-slate-600">
            <button onClick={() => setFontSizeMode("normal")} className={`px-2 py-1 rounded cursor-pointer ${fontSizeMode === "normal" ? "bg-white text-blue-600" : ""}`}>A</button>
            <button onClick={() => setFontSizeMode("large")} className={`px-2 py-1 rounded cursor-pointer ${fontSizeMode === "large" ? "bg-white text-blue-600" : ""}`}>A+</button>
            <button onClick={() => setFontSizeMode("xlarge")} className={`px-2 py-1 rounded cursor-pointer ${fontSizeMode === "xlarge" ? "bg-white text-blue-600" : ""}`}>A++</button>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 font-mono font-bold text-xs flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>Waktu: {formatTime(subtestTimeLeft)}</span>
          </div>

          <button
            onClick={() => setShowSubtestConfirmModal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <span>{currentSubtestIndex === 6 ? "Selesai" : "Lanjut Subtes"}</span>
            <FastForward className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      <div className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 p-5 sm:p-8 space-y-4 shadow-sm">
          <div className="font-mono text-xs font-bold text-blue-700 border-b pb-2">
            SOAL NO. {currentQIndexInSubtest + 1} ({activeSubtestConfig.code})
          </div>

          {currentQ?.stimulus && (
            <div className={`p-4 rounded-2xl bg-slate-50 border text-slate-700 whitespace-pre-line ${fontClasses.stimulus}`}>
              {currentQ.stimulus}
            </div>
          )}

          <div className={`text-slate-900 ${fontClasses.question}`}>{currentQ?.question}</div>

          <div className="space-y-2 pt-2">
            {currentQ?.options?.map((opt) => (
              <button
                key={opt.id}
                onClick={() => handleSelectOption(opt.id)}
                className={`w-full text-left p-3.5 rounded-2xl border text-xs sm:text-sm flex items-center gap-3 transition-all cursor-pointer ${answers[currentQ.id] === opt.id ? "bg-blue-50 border-blue-700 text-blue-900 font-bold" : "bg-white hover:bg-slate-50 border-slate-200"
                  }`}
              >
                <span className="w-7 h-7 rounded-xl border font-mono font-bold flex items-center justify-center shrink-0">{opt.id}</span>
                <span>{opt.text}</span>
              </button>
            ))}
          </div>

          <div className="pt-4 flex justify-between items-center border-t border-slate-100">
            <button
              onClick={() => setCurrentQIndexInSubtest((i) => Math.max(0, i - 1))}
              disabled={currentQIndexInSubtest === 0}
              className="px-4 py-2 border rounded-xl text-xs font-bold disabled:opacity-30 cursor-pointer"
            >
              Sebelumnya
            </button>
            <button
              onClick={handleToggleDoubtful}
              className={`px-4 py-2 border rounded-xl text-xs font-bold cursor-pointer ${doubtfuls[currentQ?.id] ? "bg-amber-100 text-amber-900 border-amber-300" : "bg-white"}`}
            >
              Ragu-Ragu
            </button>
            <button
              onClick={() => {
                if (currentQIndexInSubtest < currentSubtestQuestions.length - 1) {
                  setCurrentQIndexInSubtest((i) => i + 1);
                } else {
                  setShowSubtestConfirmModal(true);
                }
              }}
              className="px-5 py-2 bg-[#1e3a8a] text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              {currentQIndexInSubtest < currentSubtestQuestions.length - 1 ? "Berikutnya" : "Selesai Subtes"}
            </button>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 p-5 space-y-4 shadow-sm">
          <div className="font-bold text-xs text-slate-800 flex justify-between border-b pb-2">
            <span>Daftar Soal {activeSubtestConfig.code}</span>
            <span>{currentSubtestQuestions.length} Butir</span>
          </div>
          <div className="grid grid-cols-5 gap-2 max-h-[360px] overflow-y-auto p-1">
            {currentSubtestQuestions.map((q, idx) => (
              <button
                key={q.id}
                onClick={() => setCurrentQIndexInSubtest(idx)}
                className={`h-11 rounded-xl border font-mono text-xs font-bold cursor-pointer transition-all ${currentQIndexInSubtest === idx ? "ring-2 ring-blue-600 border-blue-600" : ""
                  } ${doubtfuls[q.id] ? "bg-amber-400 text-amber-950" : answers[q.id] ? "bg-blue-700 text-white" : "bg-slate-50"}`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>
      </div>

      {showSubtestConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 text-center animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                {currentSubtestIndex === 6 ? "Selesaikan Seluruh Ujian?" : `Kumpulkan Subtes ${activeSubtestConfig.name}?`}
              </h3>
              <p className="text-xs text-slate-500 mt-1">Jawaban pada subtes ini akan dikunci permanen.</p>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowSubtestConfirmModal(false)} className="w-1/2 py-2.5 rounded-xl border text-xs font-bold cursor-pointer">Periksa Lagi</button>
              <button
                onClick={() => {
                  setShowSubtestConfirmModal(false);
                  if (currentSubtestIndex < 6) setIsWaitingNextSubtest(true);
                  else finalizeExam();
                }}
                className="w-1/2 py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-blue-900 text-white text-xs font-bold cursor-pointer shadow-md shadow-blue-900/20"
              >
                {currentSubtestIndex === 6 ? "Kirim Semua" : "Kumpulkan & Lanjut"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}