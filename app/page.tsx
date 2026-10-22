"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Wifi,
  BarChart3,
  Lock,
  Building2,
  Cpu,
  EyeOff,
  Play,
  LogIn,
  KeyRound,
  X
} from "lucide-react";

export default function CBTEngineLandingPage() {
  // 1. STATE & ANIMASI COUNTDOWN TIMER MOCKUP
  const [secondsLeft, setSecondsLeft] = useState(1725);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 1800));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (totalSec: number) => {
    const m = Math.floor(totalSec / 60).toString().padStart(2, "0");
    const s = (totalSec % 60).toString().padStart(2, "0");
    return `00:${m}:${s}`;
  };

  // State opsi jawaban interaktif di Hero
  const [selectedOption, setSelectedOption] = useState<string>("A");

  // 2. ANIMASI HITUNG METRIK HERO (0 KE 100)
  const metricsRef = useRef<HTMLDivElement | null>(null);
  const [metricCount, setMetricCount] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    let delayTimer: NodeJS.Timeout | null = null;

    const startCounting = () => {
      setMetricCount(0);
      delayTimer = setTimeout(() => {
        let current = 0;
        const target = 100;
        const totalDuration = 1800;
        const frameRate = 30;
        const totalFrames = totalDuration / frameRate;
        let frame = 0;

        if (timer) clearInterval(timer);

        timer = setInterval(() => {
          frame++;
          const progress = frame / totalFrames;
          const easedProgress = 1 - Math.pow(1 - progress, 3);
          current = Math.min(target, Math.round(target * easedProgress));

          setMetricCount(current);

          if (frame >= totalFrames) {
            if (timer) clearInterval(timer);
          }
        }, frameRate);
      }, 200);
    };

    const target = metricsRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          startCounting();
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
      if (timer) clearInterval(timer);
      if (delayTimer) clearTimeout(delayTimer);
    };
  }, []);

  // 3. STATE SPLASH SCREEN PEMBUKA RESMI (STABIL & TIDAK TERPOTONG)
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);

  useEffect(() => {
    const totalDuration = 3000;
    const updateInterval = 25;
    const totalTicks = totalDuration / updateInterval;
    let currentTick = 0;

    const progressTimer = setInterval(() => {
      currentTick++;
      const currentPercent = Math.min(100, (currentTick / totalTicks) * 100);
      setLoadProgress(currentPercent);

      if (currentTick >= totalTicks) {
        clearInterval(progressTimer);
        setTimeout(() => {
          setIsLoading(false);
        }, 200);
      }
    }, updateInterval);

    return () => clearInterval(progressTimer);
  }, []);

  // 4. MODAL DIALOG PORTAL SISWA TERKUNCI
  const [showStudentAuthModal, setShowStudentAuthModal] = useState(false);

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-800 font-sans selection:bg-blue-700 selection:text-white relative overflow-x-hidden">

      {/* ============================================================== */}
      {/* A. ENTERPRISE BOOTLOADER SPLASH SCREEN                         */}
      {/* ============================================================== */}
      <div
        className={`fixed inset-0 top-0 left-0 w-screen h-screen z-[9999] flex flex-col items-center justify-center bg-white transition-all duration-700 ease-in-out ${isLoading
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 -translate-y-4 pointer-events-none"
          }`}
      >
        <div className="absolute w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col items-center text-center space-y-4 px-4 max-w-lg">
          <div className="relative flex items-center justify-center">
            <span className="animate-ping absolute inline-flex h-16 w-16 rounded-full bg-blue-400 opacity-20" />
            <div className="relative w-14 h-14 rounded-2xl bg-white p-1 shadow-lg shadow-blue-900/10 border border-slate-200/80 flex items-center justify-center overflow-hidden">
              <img
                src="/logo-timsim.jpg"
                alt="Logo TIM S.I.M."
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as any).style.display = "none";
                }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="font-mono text-[11px] font-bold text-blue-600 tracking-widest uppercase flex items-center justify-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600" />
              </span>
              <span>IN-HOUSE ENGINE INITIALIZING</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase">
              TIM SISTEM INFORMASI &amp; MANAJEMEN
            </h2>

            <p className="text-xs sm:text-sm text-slate-500 font-semibold tracking-wide">
              SMA Muhammadiyah 18 Jakarta
            </p>
          </div>

          <div className="w-56 sm:w-64 h-1.5 bg-slate-100 rounded-full overflow-hidden relative mt-3 border border-slate-200/80">
            <div
              className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 rounded-full transition-[width] duration-75 ease-linear"
              style={{ width: `${loadProgress}%` }}
            />
          </div>

          <div className="font-mono text-[9.5px] sm:text-[10px] text-slate-400 tracking-widest pt-1">
            VERIFYING KIOSK &bull; CALIBRATING IRT 3PL &bull; READY
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* B. PEMBUNGKUS KONTEN UTAMA DENGAN TRANSISI HALUS               */}
      {/* ============================================================== */}
      <div
        className={`transition-all duration-1000 ease-out ${isLoading
          ? "opacity-0 translate-y-3 filter blur-xs"
          : "opacity-100 translate-y-0 filter-none"
          }`}
      >
        {/* HEADER / NAVBAR BERSIH */}
        <header className="relative z-40 w-full border-b border-slate-200/90 bg-white/95 backdrop-blur-md shadow-xs sticky top-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
            {/* Branding Sisi Kiri */}
            <div className="flex items-center gap-4 text-left">
              <div className="relative group shrink-0">
                <div className="absolute -inset-1 rounded-full bg-blue-500/30 blur-xs animate-pulse" />
                <div className="relative w-12 h-12 rounded-full bg-white p-0.5 shadow-xs border border-slate-200/80 flex items-center justify-center overflow-hidden">
                  <img
                    src="/logo-timsim.jpg"
                    alt="Logo TIM S.I.M."
                    className="w-full h-full object-contain scale-[1.02]"
                    onError={(e) => {
                      (e.target as any).style.display = "none";
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-base sm:text-lg font-black tracking-tight text-[#1e3a8a] uppercase">
                    TIM SISTEM INFORMASI &amp; MANAJEMEN
                  </span>
                  <div className="relative inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-black tracking-wider text-white shadow-xs shadow-blue-500/40">
                    <span className="relative flex h-1.5 w-1.5 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-200 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                    </span>
                    <span>CBT ENGINE</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <span className="inline-flex items-center rounded-md border border-amber-300 bg-amber-50/90 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-800 shadow-2xs">
                    OFFICIAL PROPRIETARY
                  </span>
                  <span className="font-semibold text-slate-700">
                    SMA Muhammadiyah 18 Jakarta
                  </span>
                </div>
              </div>
            </div>

            {/* Aksi Navbar Sisi Kanan */}
            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/admin"
                className="h-10 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-300 transition shadow-xs flex items-center gap-2 text-xs font-semibold cursor-pointer"
              >
                <Building2 className="w-4 h-4 text-blue-700 shrink-0" />
                <span className="hidden md:inline">Portal Pengawas &amp; Guru</span>
                <span className="md:hidden">Portal Guru</span>
              </Link>

              <button
                type="button"
                onClick={() => setShowStudentAuthModal(true)}
                className="h-10 px-5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white transition shadow-sm shadow-blue-700/20 flex items-center gap-2 text-xs font-bold shrink-0 cursor-pointer"
              >
                <span>Ruang Ujian Siswa</span>
                <LogIn className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* HERO SECTION */}
        <section className="relative z-10 bg-gradient-to-b from-[#F8FAFC] via-[#F1F5F9] to-[#E2E8F0]/40 border-b border-slate-200/90 pt-8 pb-7">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">

              {/* Kolom Kiri */}
              <div className="lg:col-span-6 flex flex-col justify-between text-left py-1">
                <div className="space-y-3.5">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white text-xs font-bold tracking-wider uppercase shadow-sm shadow-blue-900/20 border border-blue-500/30">
                    <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="tracking-wide">SISTEM UJIAN TERSTANDARISASI NASIONAL</span>
                  </div>

                  <h1 className="text-4xl sm:text-5xl lg:text-[48px] font-black tracking-tight leading-none pt-0.5">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900">
                      SIMULASI SNBT
                    </span>
                  </h1>

                  <p className="text-slate-600 text-sm sm:text-[15px] leading-relaxed max-w-xl font-normal">
                    Hadirkan pengalaman <strong className="font-bold text-slate-900">Simulasi SNBT</strong> yang sesungguhnya langsung di sekolah Anda. Sistem penilaian akurat dan stabil digunakan ratusan siswa sekaligus.
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <Link
                      href="/simulation"
                      className="h-11 px-5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs sm:text-sm transition shadow-md shadow-blue-700/20 flex items-center gap-2 cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>Uji Coba Simulasi</span>
                    </Link>

                    <a
                      href="#silabus"
                      className="h-11 px-5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold text-xs sm:text-sm transition shadow-2xs flex items-center gap-2"
                    >
                      <BarChart3 className="w-4 h-4 text-blue-700" />
                      <span>Silabus SNBT</span>
                    </a>
                  </div>
                </div>

                {/* 3 Kotak Metrik Hero */}
                <div ref={metricsRef} className="grid grid-cols-3 gap-3 pt-2">
                  <div className="group relative p-3.5 rounded-2xl bg-white border border-slate-200 text-center transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-lg hover:shadow-blue-900/5 hover:border-blue-300 overflow-hidden cursor-default flex flex-col items-center justify-center">
                    <div className="flex items-center justify-center gap-1.5 font-mono text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      <Wifi className="w-3.5 h-3.5 text-blue-600 animate-pulse transition-transform duration-300 group-hover:scale-110 shrink-0" />
                      <span>KONKURENSI</span>
                    </div>
                    <div className="text-2xl font-black text-slate-900 tracking-tight">
                      {metricCount}<span className="text-blue-600">+</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium mt-0.5">Uji simultan stabil</div>
                  </div>

                  <div className="group relative p-3.5 rounded-2xl bg-white border border-slate-200 text-center transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-lg hover:shadow-indigo-900/5 hover:border-indigo-300 overflow-hidden cursor-default flex flex-col items-center justify-center">
                    <div className="flex items-center justify-center gap-1.5 font-mono text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      <BarChart3 className="w-3.5 h-3.5 text-indigo-600 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-110 shrink-0" />
                      <span>PSIKOMETRI</span>
                    </div>
                    <div className="text-2xl font-black text-slate-900 tracking-tight">
                      IRT <span className="text-blue-600">3PL</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium mt-0.5">Kalibrasi standar SNBT</div>
                  </div>

                  <div className="group relative p-3.5 rounded-2xl bg-white border border-slate-200 text-center transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-lg hover:shadow-emerald-900/5 hover:border-emerald-300 overflow-hidden cursor-default flex flex-col items-center justify-center">
                    <div className="flex items-center justify-center gap-1.5 font-mono text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 animate-pulse transition-transform duration-300 group-hover:scale-110 shrink-0" />
                      <span>INTEGRITAS</span>
                    </div>
                    <div className="text-2xl font-black text-slate-900 tracking-tight">
                      {metricCount}<span className="text-emerald-600">%</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium mt-0.5">Kiosk &amp; proteksi data</div>
                  </div>
                </div>
              </div>

              {/* Kolom Kanan: Mockup Soal Hero */}
              <div className="lg:col-span-6 flex flex-col justify-between">
                <div className="w-full bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/60 p-2.5 sm:p-3 transition duration-300">
                  <div className="h-9 px-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    </div>

                    <div className="flex-1 max-w-xs mx-auto h-6 px-2.5 bg-white border border-slate-200/90 rounded-lg flex items-center justify-center gap-1.5 shadow-2xs">
                      <Lock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                      <span className="font-mono text-[10px] text-slate-600 font-medium truncate select-none">
                        tim-sim.id/cbt-engine/simulasi-snbt/live
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-blue-800 font-bold text-[9px] bg-blue-50/90 px-2 py-0.5 rounded-md border border-blue-200 shrink-0">
                      <ShieldCheck className="w-3 h-3 text-blue-700 animate-pulse" />
                      <span className="tracking-wide">TERPROTEKSI</span>
                    </div>
                  </div>

                  <div className="p-3.5 sm:p-4 bg-slate-50/70 rounded-2xl mt-2 border border-slate-100 space-y-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-blue-700 text-white font-mono font-bold text-[10px]">
                          SOAL NO. 15
                        </span>
                        <span className="text-slate-700 font-semibold text-[11px]">Penalaran Matematika</span>
                      </div>
                      <div className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-mono text-[11px] font-bold border border-amber-200">
                        <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                        <span>{formatTimer(secondsLeft)}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-left">
                      <p className="text-[12px] text-slate-700 leading-snug font-normal">
                        {"Diberikan simpangan gelombang y(t) = A sin(ωt + φ). Jika frekuensi sudut ω = 4π rad/s dan energi kinetik maksimum tercapai saat:"}
                      </p>
                      <div className="py-1.5 px-2 rounded-xl bg-white border border-slate-200 text-slate-900 font-mono text-[11px] font-semibold text-center shadow-2xs tracking-tight">
                        {"Ek = (1/2) · m · ω² · A² cos²(ωt + φ)"}
                      </div>
                    </div>

                    {/* Opsi Jawaban Interaktif */}
                    <div className="space-y-1.5 text-left">
                      {[
                        { key: "A", text: "A. Nilai percepatan mencapai titik nol saat simpangan maksimum", isCorrect: true },
                        { key: "B", text: "B. Energi potensial bernilai dua kali lipat energi total sistem", isCorrect: false },
                        { key: "C", text: "C. Kecepatan partikel maksimum ketika simpangan partikel nol", isCorrect: false },
                        { key: "D", text: "D. Energi kinetik minimum saat simpangan pada titik setimbang", isCorrect: false },
                        { key: "E", text: "E. Frekuensi getaran bergantung linier pada amplitudo gelombang", isCorrect: false },
                      ].map((item) => {
                        const isSelected = selectedOption === item.key;
                        let styleClass = "bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-slate-50/70";

                        if (isSelected) {
                          styleClass = item.isCorrect
                            ? "bg-emerald-50 border-emerald-500 text-emerald-950 font-semibold shadow-xs"
                            : "bg-rose-50 border-rose-400 text-rose-950 font-semibold shadow-xs";
                        }

                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => setSelectedOption(item.key)}
                            className={`w-full p-2.5 rounded-xl text-xs flex items-center justify-between border transition-all duration-200 cursor-pointer text-left ${styleClass}`}
                          >
                            <span className="leading-snug">{item.text}</span>
                            {isSelected && item.isCorrect && (
                              <div className="flex items-center gap-1 text-emerald-600 shrink-0 ml-2">
                                <span className="font-mono text-[10px] font-bold uppercase">BENAR</span>
                                <CheckCircle2 className="w-4 h-4" />
                              </div>
                            )}
                            {isSelected && !item.isCorrect && (
                              <div className="flex items-center gap-1 text-rose-600 shrink-0 ml-2">
                                <span className="font-mono text-[10px] font-bold uppercase">SALAH</span>
                                <XCircle className="w-4 h-4" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Sensor Bawah */}
                    <div className="pt-2 border-t border-slate-150 flex items-center justify-between text-[10.5px] font-mono text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                        <span>Kiosk: <strong className="text-emerald-600 font-bold">Aktif</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <EyeOff className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                        <span>Anti-Blur: <strong className="text-slate-800 font-bold">100%</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                        <span>Sync: <strong className="text-amber-700 font-bold">Siap</strong></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Trust Strip */}
            <div className="mt-1.5 pt-4 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-2 font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-slate-700 font-semibold">Kompatibilitas Sistem:</span>
                <span>Dioptimalkan untuk Laptop, Chromebook, Tablet &amp; Smartphone</span>
              </div>
              <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400">
                <span>LATENCY: &lt; 45MS</span>
                <span>•</span>
                <span>OFFLINE RESILIENCE: AKTIF</span>
                <span>•</span>
                <span>STANDAR: BSNP / PUSMENDIK</span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: 4 PILAR TEKNOLOGI */}
        <section className="relative z-10 bg-slate-50/60 border-b border-slate-200/90 py-12 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-3xl mx-auto space-y-3 mb-10 sm:mb-12">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white text-[11px] font-bold tracking-wider uppercase shadow-sm border border-blue-500/30">
                <Cpu className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>ARSITEKTUR CBT ENGINE</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-black text-slate-900 tracking-tight leading-tight">
                Standar Keamanan &amp;{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900">
                  Presisi Asesmen
                </span>
              </h2>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto font-normal">
                Infrastruktur pengujian digital terintegrasi untuk menjamin validitas skor, meniadakan celah kecurangan, dan mempertahankan latensi rendah saat ujian serentak.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {/* Pilar 1 */}
              <div className="group p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-blue-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-150 flex items-center justify-center text-blue-700 group-hover:scale-105 transition-transform">
                      <ShieldCheck className="w-5 h-5 text-blue-700" />
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider font-mono">
                      Proteksi Kiosk
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight mb-2">
                    Kiosk Anti-Cheat Matrix
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Penguncian peramban otomatis dengan deteksi blur jendela, inspeksi multi-tab, pencegahan ekstensi pihak ketiga, dan isolasi layar terproteksi.
                  </p>
                </div>
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span>SENSOR STATUS</span>
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                    AKTIF
                  </span>
                </div>
              </div>

              {/* Pilar 2 */}
              <div className="group p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-blue-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-150 flex items-center justify-center text-blue-700 group-hover:scale-105 transition-transform">
                      <BarChart3 className="w-5 h-5 text-blue-700" />
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-800 border border-blue-200/60 text-[10px] font-bold uppercase tracking-wider font-mono">
                      Standar SNBT
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight mb-2">
                    Algoritma IRT 3PL
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Kalkulasi pembobotan non-linier skala 200–800 berdasarkan parameter tingkat kesukaran, daya pembeda butir, dan faktor tebakan semu.
                  </p>
                </div>
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span>PEMBOBOTAN</span>
                  <span className="text-blue-700 font-bold">OTOMATIS</span>
                </div>
              </div>

              {/* Pilar 3 */}
              <div className="group p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-blue-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-150 flex items-center justify-center text-indigo-700 group-hover:scale-105 transition-transform">
                      <Cpu className="w-5 h-5 text-indigo-700" />
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider font-mono">
                      Akurasi Notasi
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight mb-2">
                    LaTeX &amp; Formula Parser
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Render matematis, persamaan kalkulus, vektor, dan simbol ilmiah presisi tinggi tanpa distorsi resolusi di semua variasi peramban siswa.
                  </p>
                </div>
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span>NOTASI SAINS</span>
                  <span className="text-indigo-700 font-bold">PREP-READY</span>
                </div>
              </div>

              {/* Pilar 4 */}
              <div className="group p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-blue-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-150 flex items-center justify-center text-emerald-700 group-hover:scale-105 transition-transform">
                      <Wifi className="w-5 h-5 text-emerald-600" />
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider font-mono">
                      Ketahanan Sesi
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight mb-2">
                    Zero-Loss Sync Engine
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Pencadangan jawaban berjenjang secara lokal di perangkat klien. Siswa tetap dapat melanjutkan pengerjaan tanpa gangguan saat jaringan Wi-Fi lab terputus.
                  </p>
                </div>
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span>INTEGRITAS DATA</span>
                  <span className="text-emerald-600 font-bold">100% UTUH</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: SILABUS & CAKUPAN SUBTES (8 KARTU LENGKAP) */}
        <section id="silabus" className="relative z-10 bg-slate-50/70 border-b border-slate-200/90 py-10 sm:py-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-7 mb-8 border-b border-slate-200/80">
              <div className="space-y-2 text-left">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white text-[10.5px] font-bold tracking-wider uppercase shadow-sm border border-blue-500/30">
                  <BarChart3 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>STANDARISASI PUSMENDIK &amp; BPPP</span>
                </div>
                <h2 className="text-2xl sm:text-3xl lg:text-[34px] font-black text-slate-900 tracking-tight leading-tight">
                  Cakupan Materi &amp;{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900">
                    Subtes SNBT
                  </span>
                </h2>
                <p className="text-slate-600 text-xs sm:text-sm max-w-xl font-normal">
                  Struktur instrumen, alokasi waktu, dan jumlah butir soal terkalibrasi presisi sesuai format resmi <strong className="font-semibold text-slate-900">BPPP Seleksi Nasional Penerimaan Mahasiswa Baru</strong>.
                </p>
              </div>

              <div className="flex items-center gap-3 bg-white border border-slate-250/90 px-4 py-2.5 rounded-2xl shadow-2xs shrink-0">
                <div className="text-right">
                  <div className="text-[9.5px] font-bold font-mono text-slate-400 uppercase tracking-wider">Total Evaluasi</div>
                  <div className="text-xs font-black text-slate-900">145 Soal • 195 Menit</div>
                </div>
                <div className="h-7 w-[1px] bg-slate-200" />
                <div className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200/80 font-mono font-bold text-xs">
                  7 Subtes
                </div>
              </div>
            </div>

            {/* Grid 8 Kartu Subtes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
              {/* 1. PU */}
              <div className="group h-full p-4 rounded-2xl bg-white border border-slate-250/80 hover:border-blue-500 hover:shadow-md transition-all duration-200 flex flex-col justify-between text-left">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200/60 text-[10px] font-mono font-bold">
                      TPS • 01
                    </span>
                    <div className="flex items-center gap-1 font-mono text-[11px] text-slate-600 font-semibold bg-slate-100/80 px-2 py-0.5 rounded-md">
                      <Clock className="w-3 h-3 text-slate-500" /> 30m
                    </div>
                  </div>
                  <h4 className="text-[14px] font-bold text-slate-900 tracking-tight mb-1.5 group-hover:text-blue-700 transition-colors">
                    Penalaran Umum (PU)
                  </h4>
                  <p className="text-[11.5px] text-slate-500 leading-relaxed min-h-[34px] line-clamp-2">
                    Penalaran induktif, deduktif, serta telaah pola logika kuantitatif.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-150 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400">BOBOT UJIAN</span>
                  <span className="font-bold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">30 Butir</span>
                </div>
              </div>

              {/* 2. PPU */}
              <div className="group h-full p-4 rounded-2xl bg-white border border-slate-250/80 hover:border-blue-500 hover:shadow-md transition-all duration-200 flex flex-col justify-between text-left">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200/60 text-[10px] font-mono font-bold">
                      TPS • 02
                    </span>
                    <div className="flex items-center gap-1 font-mono text-[11px] text-slate-600 font-semibold bg-slate-100/80 px-2 py-0.5 rounded-md">
                      <Clock className="w-3 h-3 text-slate-500" /> 15m
                    </div>
                  </div>
                  <h4 className="text-[14px] font-bold text-slate-900 tracking-tight mb-1.5 group-hover:text-blue-700 transition-colors">
                    Pengetahuan &amp; Pemahaman
                  </h4>
                  <p className="text-[11.5px] text-slate-500 leading-relaxed min-h-[34px] line-clamp-2">
                    Kelugasan wacana, padanan konteks kata, dan relasi semantik.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-150 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400">BOBOT UJIAN</span>
                  <span className="font-bold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">20 Butir</span>
                </div>
              </div>

              {/* 3. PBM */}
              <div className="group h-full p-4 rounded-2xl bg-white border border-slate-250/80 hover:border-blue-500 hover:shadow-md transition-all duration-200 flex flex-col justify-between text-left">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200/60 text-[10px] font-mono font-bold">
                      TPS • 03
                    </span>
                    <div className="flex items-center gap-1 font-mono text-[11px] text-slate-600 font-semibold bg-slate-100/80 px-2 py-0.5 rounded-md">
                      <Clock className="w-3 h-3 text-slate-500" /> 25m
                    </div>
                  </div>
                  <h4 className="text-[14px] font-bold text-slate-900 tracking-tight mb-1.5 group-hover:text-blue-700 transition-colors">
                    Pemahaman Bacaan (PBM)
                  </h4>
                  <p className="text-[11.5px] text-slate-500 leading-relaxed min-h-[34px] line-clamp-2">
                    Struktur ejaan PUEBI, kelayakan kalimat baku, dan koherensi paragraf.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-150 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400">BOBOT UJIAN</span>
                  <span className="font-bold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">20 Butir</span>
                </div>
              </div>

              {/* 4. PK */}
              <div className="group h-full p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-blue-500 hover:shadow-md transition-all duration-200 flex flex-col justify-between text-left">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200/60 text-[10px] font-mono font-bold">
                      TPS • 04
                    </span>
                    <div className="flex items-center gap-1 font-mono text-[11px] text-slate-600 font-semibold bg-slate-100/80 px-2 py-0.5 rounded-md">
                      <Clock className="w-3 h-3 text-slate-500" /> 20m
                    </div>
                  </div>
                  <h4 className="text-[14px] font-bold text-slate-900 tracking-tight mb-1.5 group-hover:text-blue-700 transition-colors">
                    Pengetahuan Kuantitatif
                  </h4>
                  <p className="text-[11.5px] text-slate-500 leading-relaxed min-h-[34px] line-clamp-2">
                    Operasi aritmatika dasar, aljabar, geometri bangun datar, dan peluang.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-150 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400">BOBOT UJIAN</span>
                  <span className="font-bold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">15 Butir</span>
                </div>
              </div>

              {/* 5. Literasi Indonesia */}
              <div className="group h-full p-4 rounded-2xl bg-white border border-slate-250/80 hover:border-indigo-500 hover:shadow-md transition-all duration-200 flex flex-col justify-between text-left">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200/60 text-[10px] font-mono font-bold">
                      LIT • 01
                    </span>
                    <div className="flex items-center gap-1 font-mono text-[11px] text-indigo-900 font-semibold bg-indigo-50/80 px-2 py-0.5 rounded-md border border-indigo-100">
                      <Clock className="w-3 h-3 text-indigo-600" /> 45m
                    </div>
                  </div>
                  <h4 className="text-[14px] font-bold text-slate-900 tracking-tight mb-1.5 group-hover:text-indigo-700 transition-colors">
                    Literasi Bahasa Indonesia
                  </h4>
                  <p className="text-[11.5px] text-slate-500 leading-relaxed min-h-[34px] line-clamp-2">
                    Analisis wacana kritis, telaah gagasan utama, dan inferensi bacaan panjang.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-150 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400">BOBOT UJIAN</span>
                  <span className="font-bold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">25 Butir</span>
                </div>
              </div>

              {/* 6. Literasi Inggris */}
              <div className="group h-full p-4 rounded-2xl bg-white border border-slate-250/80 hover:border-indigo-500 hover:shadow-md transition-all duration-200 flex flex-col justify-between text-left">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200/60 text-[10px] font-mono font-bold">
                      LIT • 02
                    </span>
                    <div className="flex items-center gap-1 font-mono text-[11px] text-indigo-900 font-semibold bg-indigo-50/80 px-2 py-0.5 rounded-md border border-indigo-100">
                      <Clock className="w-3 h-3 text-indigo-600" /> 30m
                    </div>
                  </div>
                  <h4 className="text-[14px] font-bold text-slate-900 tracking-tight mb-1.5 group-hover:text-indigo-700 transition-colors">
                    Literasi Bahasa Inggris
                  </h4>
                  <p className="text-[11.5px] text-slate-500 leading-relaxed min-h-[34px] line-clamp-2">
                    Contextual vocabulary, implicit argument, dan intisari teks akademik.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-150 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400">BOBOT UJIAN</span>
                  <span className="font-bold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">15 Butir</span>
                </div>
              </div>

              {/* 7. Penalaran Matematika */}
              <div className="group h-full p-4 rounded-2xl bg-white border border-slate-250/80 hover:border-emerald-500 hover:shadow-md transition-all duration-200 flex flex-col justify-between text-left">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-250 text-[10px] font-mono font-bold">
                      PM • 01
                    </span>
                    <div className="flex items-center gap-1 font-mono text-[11px] text-emerald-950 font-semibold bg-emerald-50/90 px-2 py-0.5 rounded-md border border-emerald-200">
                      <Clock className="w-3 h-3 text-emerald-600" /> 30m
                    </div>
                  </div>
                  <h4 className="text-[14px] font-bold text-slate-900 tracking-tight mb-1.5 group-hover:text-emerald-700 transition-colors">
                    Penalaran Matematika (PM)
                  </h4>
                  <p className="text-[11.5px] text-slate-500 leading-relaxed min-h-[34px] line-clamp-2">
                    Pemecahan persoalan aplikatif, pemodelan matematika realistik, dan analisis data kuantitatif.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-150 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400">BOBOT UJIAN</span>
                  <span className="font-bold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">20 Butir</span>
                </div>
              </div>

              {/* 8. Engine Score */}
              <div className="group h-full p-4 rounded-2xl bg-gradient-to-b from-slate-900 via-blue-950 to-slate-950 text-white shadow-sm border border-blue-600/40 flex flex-col justify-between text-left relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-300/40 text-[10px] font-mono font-bold">
                      ENGINE SCORE
                    </span>
                    <div className="flex items-center gap-1 text-blue-200 font-mono text-[11px] bg-white/10 px-2 py-0.5 rounded-md">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" /> 200–800
                    </div>
                  </div>
                  <h4 className="text-[14px] font-bold text-white tracking-tight mb-1.5">
                    Algoritma IRT 3-Parameter
                  </h4>
                  <p className="text-[11.5px] text-slate-300 leading-relaxed min-h-[34px] line-clamp-2 font-normal">
                    Pembobotan saintifik memperhitungkan tingkat kesukaran dan daya pembeda butir soal.
                  </p>
                </div>
                <div className="relative z-10 pt-3 mt-3 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400">STANDAR UJIAN</span>
                  <span className="font-bold text-amber-400 tracking-wide">100% VALID</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: KOMITMEN ARSITEKTUR & LEAD ARCHITECT */}
        <section className="relative z-10 bg-slate-50/70 border-b border-slate-200/90 py-12 sm:py-16 overflow-hidden">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-gradient-to-tr from-blue-400/15 via-indigo-300/10 to-transparent blur-3xl pointer-events-none rounded-full" />

            <div className="relative rounded-3xl bg-gradient-to-br from-white via-slate-50/80 to-blue-50/50 border border-blue-200/60 shadow-xl shadow-blue-900/5 p-7 sm:p-10 text-left overflow-hidden backdrop-blur-xs">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-900" />
              <span className="absolute -top-4 right-6 text-8xl font-serif text-blue-900/5 select-none pointer-events-none font-bold">
                “
              </span>

              <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-blue-150/60">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-900 text-white text-[10px] font-mono font-bold tracking-wider uppercase shadow-xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>KOMITMEN STANDARISASI SISTEM</span>
                </div>
                <div className="flex items-center gap-2.5 text-[10.5px] font-mono font-bold text-slate-500">
                  <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 shadow-2xs">FULL-CLIENT RESILIENT</span>
                  <span className="text-slate-300">•</span>
                  <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 shadow-2xs text-blue-800">IRT 3PL VERIFIED</span>
                </div>
              </div>

              <blockquote className="relative py-6 sm:py-7">
                <p className="text-base sm:text-lg lg:text-[18.5px] font-normal text-slate-800 leading-relaxed tracking-tight">
                  “CBT Engine ini dikembangkan langsung dari bilik asesmen nyata untuk menjawab masalah mendasar pengujian massal: <strong className="font-semibold text-slate-950">server rentan saat akses serentak</strong>, minimnya penguncian layar peramban, dan ketiadaan pembobotan IRT. Kami memastikan seluruh instrumen <strong className="font-semibold text-blue-900">terkalibrasi presisi, stabil, dan objektif</strong>.”
                </p>
              </blockquote>

              <div className="pt-6 border-t border-blue-150/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="relative">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-950 text-white flex items-center justify-center font-mono font-black text-sm shadow-md shadow-blue-900/20 shrink-0 border border-blue-400/40">
                      FU
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-white flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                        Fadhillah Umar, S.Pd.
                      </h3>
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-250 font-mono text-[9.5px] font-bold uppercase tracking-wider">
                        Lead Architect
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      SMA Muhammadiyah 18 Jakarta • <span className="text-blue-800 font-semibold">School of Champions</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center px-3.5 py-1.5 rounded-xl bg-white border border-blue-200/80 shadow-2xs text-[11px] font-mono">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="font-bold text-blue-900">TIM S.I.M.</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="relative z-10 bg-white border-t border-slate-200/90 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-5">
              <div className="flex items-center gap-3.5 text-left">
                <div className="relative h-11 w-11 shrink-0 rounded-xl bg-white border border-slate-200/90 p-1 shadow-2xs flex items-center justify-center">
                  <img
                    src="/logo-timsim.jpg"
                    alt="Logo TIM S.I.M."
                    className="h-full w-full object-contain"
                    onError={(e) => {
                      (e.target as any).style.display = "none";
                    }}
                  />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-xs sm:text-sm text-slate-900 tracking-tight">
                      CBT ENGINE
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-900 font-mono text-[9px] font-bold">
                      v1.3
                    </span>
                  </div>
                  <p className="text-[11.5px] text-slate-500 font-normal">
                    <strong className="font-semibold text-slate-700">© 2026</strong> <strong className="font-semibold text-slate-700">TIM S.I.M.</strong> <strong className="font-semibold text-slate-700">SMA Muhammadiyah 18 Jakarta</strong>.
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50/90 border border-slate-250/90 p-2.5 px-4 text-center shadow-2xs">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="font-mono text-[11px] font-bold tracking-tight text-slate-800">
                    SISTEM AKTIF &amp; TERKALIBRASI
                  </span>
                </div>
                <div className="font-mono text-[9.5px] text-slate-400 font-medium tracking-tight flex items-center justify-center">
                  <span>ENKRIPSI TLS 1.3</span>
                  <span className="mx-1.5 text-slate-300">•</span>
                  <span>STANDAR BPPP / PUSMENDIK</span>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* ============================================================== */}
      {/* C. MODAL DIALOG RESMI UNTUK "RUANG UJIAN SISWA"                */}
      {/* ============================================================== */}
      {showStudentAuthModal && (
        <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 sm:p-7 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setShowStudentAuthModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 mb-1">
                <KeyRound className="w-7 h-7" />
              </div>
              <span className="inline-block px-3 py-0.5 rounded-full bg-blue-50 border border-blue-200 font-mono text-[10px] font-bold text-blue-800 tracking-wider">
                PORTAL RESMI TERJADWAL
              </span>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                Ruang Ujian Siswa
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
                Sesi ujian terproteksi ini khusus peserta terdaftar di database sekolah dan membutuhkan <strong>NISN</strong> serta <strong>Token Pengawas</strong>.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-2 text-xs text-slate-600">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/80 font-mono text-[11px]">
                <span className="text-slate-400">Database Siswa:</span>
                <span className="font-bold text-slate-700">SMA Muhammadiyah 18 Jakarta</span>
              </div>
              <div className="flex items-center justify-between pt-0.5 font-mono text-[11px]">
                <span className="text-slate-400">Status Sesi:</span>
                <span className="font-bold text-amber-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Menunggu Token Pengawas
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <Link
                href="/login"
                onClick={() => setShowStudentAuthModal(false)}
                className="w-full py-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-700/20"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Masuk ke Lembar Pemilihan Paket &amp; Token</span>
              </Link>
              <button
                type="button"
                onClick={() => setShowStudentAuthModal(false)}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50"
              >
                Tutup Jendela
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}