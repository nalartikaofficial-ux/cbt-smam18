"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Users,
    ShieldAlert,
    Award,
    Activity,
    PlusCircle,
    RefreshCw,
    Search,
    CheckCircle2,
    Lock,
    Unlock,
    AlertTriangle,
    ChevronLeft,
    Trash2,
    Pencil,
    X,
    RotateCcw,
    Clock,
    KeyRound,
    Save,
    FastForward,
    Printer,
    FileText,
    Copy,
    Check,
    FileSpreadsheet,
    LogOut,
    LockKeyhole,
    LockKeyholeOpen,
    Ban
} from "lucide-react";

const GOOGLE_SCRIPT_API_URL =
    "https://script.google.com/macros/s/AKfycbxXeMuz-VXgbdUOESiOOLL5NlLrSMVfrdvOCwhgBbjLWwOy3ASkTjnWJSAIONFDrdY7hg/exec";

export interface StudentItem {
    nisn: string;
    nama: string;
    kelas: string;
    status: string;
    violations: number;
    score: number;
    subtesAktif?: string;
    waktu_selesai?: string;
}

export interface MasterSession {
    paket_aktif: "PAKET_1" | "PAKET_2" | "PAKET_3";
    nama_paket: string;
    token_resmi: string;
    status_akses: "DIBUKA" | "TERKUNCI" | "SELESAI";
    waktu_mulai: string;
    waktu_selesai: string;
}

export default function ProctorMasterDashboard() {
    const router = useRouter();

    const [isAuthorized, setIsAuthorized] = useState(false);
    const [currentProctor, setCurrentProctor] = useState<{ nama: string; role: string }>({
        nama: "Proktor Pengawas Ruang",
        role: "proctor"
    });

    const [activeTab, setActiveTab] = useState<"students" | "monitor" | "bap" | "scores">("monitor");
    const [students, setStudents] = useState<StudentItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState<string>("ALL");
    const [filterKelas, setFilterKelas] = useState<string>("ALL");
    const [tokenCopied, setTokenCopied] = useState(false);

    // Master Sesi Real-Time
    const [masterSession, setMasterSession] = useState<MasterSession>({
        paket_aktif: "PAKET_1",
        nama_paket: "Simulasi Terstandarisasi SNBT 2026",
        token_resmi: "SM18UT",
        status_akses: "DIBUKA",
        waktu_mulai: "2026-10-19T07:30",
        waktu_selesai: "2026-10-19T11:30"
    });
    const [isSavingSchedule, setIsSavingSchedule] = useState(false);
    const [customMinutes, setCustomMinutes] = useState<number>(5);

    const [newNisn, setNewNisn] = useState("");
    const [newNama, setNewNama] = useState("");
    const [newKelas, setNewKelas] = useState("");
    const [isSubmittingStudent, setIsSubmittingStudent] = useState(false);

    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkRawText, setBulkRawText] = useState("");
    const [isBulkImporting, setIsBulkImporting] = useState(false);

    const [editingStudent, setEditingStudent] = useState<StudentItem | null>(null);
    const [editNisn, setEditNisn] = useState("");
    const [editNama, setEditNama] = useState("");
    const [editKelas, setEditKelas] = useState("");
    const [isUpdatingStudent, setIsUpdatingStudent] = useState(false);

    const [bapData, setBapData] = useState({
        nomorSurat: "118/BAP-SNBT/SMA-M18/2026",
        ruangUjian: "Laboratorium Komputer 1",
        catatanKhusus: "Pelaksanaan simulasi berlangsung tertib, jujur, dan lancar dengan sistem Kiosk Mode aktif tanpa kendala koneksi.",
        kepalaSekolahNama: "Drs. H. Ahmad Dahlan, M.Pd.",
        kepalaSekolahNbm: "882.118.001",
        pengawasNama: "Fadhillah Umar, S.Pd.",
        pengawasNbm: "118.2026.091",
        isManualHadir: false,
        manualHadir: 0,
        manualTidakHadir: 0
    });

    const fetchMasterSession = async () => {
        try {
            const res = await fetch(`${GOOGLE_SCRIPT_API_URL}?action=get_active_session&_t=${Date.now()}`, {
                cache: "no-store"
            });
            const rawText = await res.text();
            if (!rawText.trim().startsWith("<")) {
                const json = JSON.parse(rawText);
                if (json.status === "success" && json.data) {
                    setMasterSession({
                        ...json.data,
                        waktu_mulai: json.data.waktu_mulai ? String(json.data.waktu_mulai).substring(0, 16) : "2026-10-19T07:30",
                        waktu_selesai: json.data.waktu_selesai ? String(json.data.waktu_selesai).substring(0, 16) : "2026-10-19T11:30"
                    });
                }
            }
        } catch (err) {
            console.error("Gagal ambil jadwal:", err);
        }
    };

    // Ambil data siswa dengan status loading manual
    const fetchStudents = async () => {
        setIsLoading(true);
        try {
            await fetchStudentsSilently();
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-polling di latar belakang (tanpa memicu loading spinner layar)
    const fetchStudentsSilently = async () => {
        try {
            const res = await fetch(`${GOOGLE_SCRIPT_API_URL}?action=get_students&_t=${Date.now()}`, {
                cache: "no-store"
            });
            const rawText = await res.text();
            if (!rawText.trim().startsWith("<")) {
                const json = JSON.parse(rawText);
                if (json.status === "success" && Array.isArray(json.data)) {
                    const cleanList: StudentItem[] = json.data.map((item: any) => ({
                        nisn: String(item.nisn || "").replace(/\D/g, "").trim(),
                        nama: String(item.nama || item.nama_siswa || "").trim(),
                        kelas: String(item.kelas || "").trim(),
                        status: String(item.status || item.status_ujian || "Belum Hadir").trim(),
                        violations: Number(item.violations || item.pelanggaran || 0),
                        score: Number(item.score || item.skor_irt || 0),
                        waktu_selesai: String(item.waktu_selesai || "-").trim()
                    }));
                    setStudents(cleanList);
                }
            }
        } catch (err) {
            console.error("Gagal polling data siswa:", err);
        }
    };

    useEffect(() => {
        if (typeof window !== "undefined") {
            const raw = sessionStorage.getItem("logged_user");
            if (!raw) {
                router.replace("/admin");
                return;
            }

            try {
                const user = JSON.parse(raw);
                if (user.role === "admin" || user.role === "proctor") {
                    setCurrentProctor(user);
                    setBapData((prev) => ({
                        ...prev,
                        pengawasNama: user.nama || "Fadhillah Umar, S.Pd."
                    }));
                    setIsAuthorized(true);
                    fetchMasterSession();
                    fetchStudents();
                } else {
                    alert("Akses Dibatasi: Khusus Proktor Pengawas & Administrator.");
                    router.replace("/admin");
                }
            } catch {
                router.replace("/admin");
            }
        }
    }, []);

    // Background auto-refresh setiap 5 detik agar monitor sinkron otomatis
    useEffect(() => {
        if (!isAuthorized) return;
        const interval = setInterval(() => {
            fetchStudentsSilently();
        }, 5000);

        return () => clearInterval(interval);
    }, [isAuthorized]);

    const generateRandomToken = () => {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let result = "SM";
        for (let i = 0; i < 4; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setMasterSession((prev) => ({ ...prev, token_resmi: result }));
    };

    const copyToken = () => {
        navigator.clipboard.writeText(masterSession.token_resmi);
        setTokenCopied(true);
        setTimeout(() => setTokenCopied(false), 2000);
    };

    const handleUpdateSchedule = async (e?: React.FormEvent, customPayload?: Partial<MasterSession>) => {
        if (e) e.preventDefault();
        setIsSavingSchedule(true);

        const payload = {
            action: "update_schedule",
            ...masterSession,
            ...customPayload,
            token_resmi: (customPayload?.token_resmi || masterSession.token_resmi).toUpperCase()
        };

        try {
            await fetch(GOOGLE_SCRIPT_API_URL, {
                method: "POST",
                mode: "no-cors",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify(payload)
            });
            if (customPayload) {
                setMasterSession((prev) => ({ ...prev, ...customPayload }));
            }
            alert(`Jadwal & Waktu batas ujian berhasil diterapkan ke server!`);
        } catch {
            alert("Gagal menyimpan jadwal.");
        } finally {
            setIsSavingSchedule(false);
        }
    };

    const toggleSessionLock = () => {
        const nextStatus = masterSession.status_akses === "DIBUKA" ? "TERKUNCI" : "DIBUKA";
        if (!confirm(`Ubah status akses bilik ujian menjadi: ${nextStatus}?`)) return;
        handleUpdateSchedule(undefined, { status_akses: nextStatus });
    };

    const handleAddCompensationTime = async (minutes: number) => {
        if (!confirm(`Tambahkan waktu darurat ${minutes} menit untuk seluruh bilik siswa secara serentak?`)) return;

        try {
            await fetch(GOOGLE_SCRIPT_API_URL, {
                method: "POST",
                mode: "no-cors",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({
                    action: "add_time_compensation",
                    minutes: minutes
                })
            });
            alert(`Waktu batas sesi ujian berhasil dimundurkan ${minutes} menit!`);
            fetchMasterSession();
        } catch {
            alert("Gagal menambahkan kompensasi waktu.");
        }
    };

    // 1. BUKA AKSES (LANJUT): Membuka gembok pengerjaan siswa yang terkunci / ngelag / laptop mati
    const handleUnlockResumeStudent = async (student: StudentItem) => {
        const stLower = student.status.toLowerCase();

        // JIKA SISWA BELUM PERNAH MULAI UJIAN
        if (stLower.includes("belum") || stLower.includes("hadir")) {
            alert(`Peserta ${student.nama} belum pernah memulai ujian. Akses akan otomatis aktif saat siswa login pertama kali menggunakan NISN dan Token resmi. Status tetap 'Belum Hadir'.`);
            return;
        }

        // JIKA SISWA SUDAH MENYELESAIKAN UJIAN
        if (stLower.includes("selesai")) {
            alert(`Peserta ${student.nama} telah menyelesaikan ujian. Lembar jawaban sudah dikunci. Gunakan tombol 'Ujian Ulang' jika ingin mereset akun untuk paket baru.`);
            return;
        }

        // UNTUK SISWA YANG SEDANG MENGERJAKAN ATAU TERKUNCI KIOSK
        setStudents((prev) =>
            prev.map((s) => (s.nisn === student.nisn ? { ...s, status: "Sedang Mengerjakan" } : s))
        );

        try {
            await fetch(GOOGLE_SCRIPT_API_URL, {
                method: "POST",
                mode: "no-cors",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({ action: "unlock_student", nisn: student.nisn })
            });
            alert(`Akses pengerjaan ${student.nama} berhasil dibuka kembali. Siswa dapat login kembali di perangkatnya menggunakan NISN & Token untuk melanjutkan ujian dengan jawaban yang tetap tersimpan utuh.`);
        } catch {
            alert("Gagal membuka akses pengerjaan.");
        }
    };

    // 2. BLOKIR: Pengawas menindak siswa yang terindikasi curang (Kecurangan tetap sesuai angka aslinya)
    const handleBlockStudent = async (student: StudentItem) => {
        if (!confirm(`TINDAKAN PENGAWAS: Kunci/Blokir bilik ujian peserta ${student.nama} (${student.nisn})? Akses ujian akan langsung dihentikan sepihak tanpa mengubah jumlah catatan pelanggaran (${student.violations}x).`)) return;

        setStudents((prev) =>
            prev.map((s) => (s.nisn === student.nisn ? { ...s, status: "Terkunci" } : s))
        );

        try {
            await fetch(GOOGLE_SCRIPT_API_URL, {
                method: "POST",
                mode: "no-cors",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({
                    action: "block_student",
                    nisn: student.nisn,
                    violations: student.violations // Pertahankan jumlah pelanggaran yang ada
                })
            });
            alert(`Peserta ${student.nama} berhasil diblokir. Status sekarang 'Terkunci' dengan catatan pelanggaran tetap ${student.violations}x.`);
        } catch {
            alert("Gagal memblokir peserta.");
        }
    };

    // 3. UJIAN ULANG / RESET: Mereset akun siswa (siap dipakai untuk sesi/paket baru)
    const handleResetStudent = async (student: StudentItem) => {
        if (!confirm(`Reset ujian peserta ${student.nama} (${student.nisn})? Status akan dikembalikan ke 'Belum Hadir', nilai IRT di-nol-kan, dan pelanggaran dibersihkan kembali ke 0 untuk persiapan sesi baru.`)) return;

        setStudents((prev) =>
            prev.map((s) =>
                s.nisn === student.nisn
                    ? { ...s, status: "Belum Hadir", violations: 0, score: 0, waktu_selesai: "-" }
                    : s
            )
        );

        try {
            await fetch(GOOGLE_SCRIPT_API_URL, {
                method: "POST",
                mode: "no-cors",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({ action: "reset_status", nisn: student.nisn })
            });
            alert(`Peserta ${student.nama} telah berhasil direset ke status 'Belum Hadir' dan siap login kembali.`);
        } catch { }
    };

    const handleAddStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanNisn = newNisn.replace(/\D/g, "").trim();
        const cleanNama = newNama.trim();
        const cleanKelas = newKelas.trim().toUpperCase();

        if (!cleanNisn || cleanNisn.length < 8) {
            alert("NISN wajib berupa angka resmi (8-10 digit)!");
            return;
        }
        if (!cleanNama || !cleanKelas) {
            alert("Lengkapi Nama Siswa dan Kelas!");
            return;
        }

        setIsSubmittingStudent(true);

        const localItem: StudentItem = {
            nisn: cleanNisn,
            nama: cleanNama,
            kelas: cleanKelas,
            status: "Belum Hadir",
            violations: 0,
            score: 0
        };

        setStudents((prev) => [...prev.filter((s) => s.nisn !== cleanNisn), localItem]);

        try {
            await fetch(GOOGLE_SCRIPT_API_URL, {
                method: "POST",
                mode: "no-cors",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({
                    action: "add_student",
                    nisn: cleanNisn,
                    nama: cleanNama,
                    kelas: cleanKelas
                })
            });

            setNewNisn("");
            setNewNama("");
            setTimeout(fetchStudents, 2500);
        } catch {
            alert("Gagal menyimpan siswa.");
        } finally {
            setIsSubmittingStudent(false);
        }
    };

    const handleBulkImportStudents = async () => {
        if (!bulkRawText.trim()) return;
        setIsBulkImporting(true);

        try {
            const lines = bulkRawText.split(/\r?\n/).filter((l) => l.trim() !== "");
            const newItems: StudentItem[] = [];

            lines.forEach((line) => {
                const parts = line.split(/\t|,|;|\|/).map((p) => p.trim());
                if (parts.length >= 2) {
                    const rawNisn = parts[0].replace(/\D/g, "");
                    const nama = parts[1];
                    const kelas = (parts[2] || "XII").toUpperCase();

                    if (rawNisn && nama) {
                        newItems.push({
                            nisn: rawNisn,
                            nama: nama,
                            kelas: kelas.trim(),
                            status: "Belum Hadir",
                            violations: 0,
                            score: 0
                        });
                    }
                }
            });

            if (newItems.length === 0) {
                alert("Format salin tidak valid.");
                setIsBulkImporting(false);
                return;
            }

            setStudents((prev) => {
                const merged = [...prev];
                newItems.forEach((item) => {
                    const idx = merged.findIndex((m) => m.nisn === item.nisn);
                    if (idx >= 0) merged[idx] = item;
                    else merged.push(item);
                });
                return merged;
            });

            await fetch(GOOGLE_SCRIPT_API_URL, {
                method: "POST",
                mode: "no-cors",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({
                    action: "bulk_add_students",
                    students: newItems
                })
            });

            alert(`Berhasil mendaftarkan ${newItems.length} siswa.`);
            setBulkRawText("");
            setShowBulkModal(false);
            setTimeout(fetchStudents, 3000);
        } catch {
            alert("Gagal mengimpor data massal.");
        } finally {
            setIsBulkImporting(false);
        }
    };

    const handleOpenEditModal = (student: StudentItem) => {
        setEditingStudent(student);
        setEditNisn(student.nisn);
        setEditNama(student.nama);
        setEditKelas(student.kelas);
    };

    const handleSaveEditStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingStudent) return;

        const oldNisn = String(editingStudent.nisn).trim();
        const cleanNisn = editNisn.replace(/\D/g, "").trim();
        const cleanNama = editNama.trim();
        const cleanKelas = editKelas.trim().toUpperCase();

        if (!cleanNisn || !cleanNama || !cleanKelas) return;

        setIsUpdatingStudent(true);

        setStudents((prev) =>
            prev.map((s) =>
                String(s.nisn).trim() === oldNisn
                    ? { ...s, nisn: cleanNisn, nama: cleanNama, kelas: cleanKelas }
                    : s
            )
        );

        setEditingStudent(null);
        setSearchQuery("");

        try {
            await fetch(GOOGLE_SCRIPT_API_URL, {
                method: "POST",
                mode: "no-cors",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({
                    action: "edit_student",
                    old_nisn: oldNisn,
                    nisn: cleanNisn,
                    nama: cleanNama,
                    kelas: cleanKelas
                })
            });
            setTimeout(fetchStudents, 3000);
        } catch {
            alert("Gagal memperbarui data siswa.");
        } finally {
            setIsUpdatingStudent(false);
        }
    };

    const handleDeleteStudent = async (nisn: string, nama: string) => {
        if (!confirm(`Hapus peserta ${nama} (${nisn})?`)) return;
        setStudents((prev) => prev.filter((s) => s.nisn !== nisn));

        try {
            await fetch(GOOGLE_SCRIPT_API_URL, {
                method: "POST",
                mode: "no-cors",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({ action: "delete_student", nisn })
            });
        } catch { }
    };

    const handleLogout = () => {
        if (typeof window !== "undefined") {
            sessionStorage.removeItem("logged_user");
        }
        router.replace("/admin");
    };

    const availableClasses = useMemo(() => {
        const setClasses = new Set<string>();
        students.forEach((s) => {
            if (s.kelas && s.kelas.trim()) setClasses.add(s.kelas.trim());
        });
        return Array.from(setClasses).sort();
    }, [students]);

    const stats = useMemo(() => {
        const total = students.length;
        const working = students.filter((s) => s.status.toLowerCase().includes("mengerjakan")).length;
        const finished = students.filter((s) => s.status.toLowerCase().includes("selesai") || s.score > 0).length;
        const locked = students.filter((s) => s.status.toLowerCase().includes("kunci") || s.violations >= 3).length;
        const absent = total - (working + finished + locked);
        return { total, working, finished, locked, absent: Math.max(0, absent) };
    }, [students]);

    const filteredStudents = useMemo(() => {
        return students.filter((s) => {
            const matchSearch =
                s.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.nisn.includes(searchQuery) ||
                s.kelas.toLowerCase().includes(searchQuery.toLowerCase());

            let matchStatus = true;
            if (filterStatus !== "ALL") {
                matchStatus = s.status.toLowerCase().includes(filterStatus.toLowerCase());
            }

            const matchKelas = filterKelas === "ALL" || s.kelas === filterKelas;
            return matchSearch && matchStatus && matchKelas;
        });
    }, [students, searchQuery, filterStatus, filterKelas]);

    if (!isAuthorized) {
        return <div className="min-h-screen bg-slate-900" />;
    }

    return (
        <div className="min-h-screen bg-slate-100 print:bg-white print:min-h-0 flex flex-col font-sans text-slate-800">
            {/* CSS CETAK RESMI STANDAR DINAS A4 */}
            <style
                dangerouslySetInnerHTML={{
                    __html: `
            @page {
              size: A4 portrait;
              margin: 12mm 15mm 12mm 15mm;
            }
            @media print {
              html, body {
                background: #ffffff !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                color: #000000 !important;
                font-family: 'Times New Roman', Times, serif !important;
                font-size: 10.5pt !important;
                -webkit-print-color-adjust: exact !important;
              }
              .print-hidden {
                display: none !important;
              }
              .print-sheet {
                background: #ffffff !important;
                padding: 0 !important;
                width: 100% !important;
                page-break-inside: avoid !important;
              }
              .kop-divider-thick {
                border-bottom: 3px solid #000000 !important;
                margin-top: 6px !important;
              }
              .kop-divider-thin {
                border-bottom: 1px solid #000000 !important;
                margin-top: 2px !important;
              }
              table.print-table {
                width: 100% !important;
                border-collapse: collapse !important;
              }
              table.print-table th, table.print-table td {
                border: 1px solid #000000 !important;
                padding: 4px 6px !important;
                color: #000000 !important;
              }
              table.print-table th {
                background-color: #f2f2f2 !important;
                font-weight: bold !important;
                text-align: center !important;
              }
            }
          `
                }}
            />

            {/* HEADER PROKTOR */}
            <header className="print-hidden bg-white border-b border-slate-200/90 py-3 px-4 sm:px-8 sticky top-0 z-30 shadow-2xs">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/admin"
                            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                            title="Kembali ke Hub Utama Admin"
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
                                PUSAT KENDALI PROKTOR &bull; SMA MUHAMMADIYAH 18
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium">
                                Pengawas Aktif: <strong className="text-blue-700">{currentProctor.nama}</strong> ({currentProctor.role.toUpperCase()})
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={toggleSessionLock}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all ${masterSession.status_akses === "DIBUKA"
                                ? "bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100"
                                : "bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100"
                                }`}
                        >
                            {masterSession.status_akses === "DIBUKA" ? (
                                <>
                                    <LockKeyhole className="w-3.5 h-3.5" />
                                    <span>Tutup Bilik (Kunci Akses)</span>
                                </>
                            ) : (
                                <>
                                    <LockKeyholeOpen className="w-3.5 h-3.5" />
                                    <span>Buka Akses Bilik Siswa</span>
                                </>
                            )}
                        </button>

                        <button
                            onClick={() => {
                                fetchMasterSession();
                                fetchStudents();
                            }}
                            disabled={isLoading}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-blue-600" : ""}`} />
                            <span className="hidden sm:inline">Refresh Data</span>
                        </button>

                        <button
                            onClick={handleLogout}
                            className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                            title="Keluar dari Sistem"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6 print:p-0 print:m-0 print:space-y-0 print:w-full print:max-w-none">
                {/* 1. MASTER PANEL TOKEN & PENJADWALAN REAL-TIME */}
                <div className="print-hidden bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-lg space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shrink-0">
                                <KeyRound className="w-6 h-6" />
                            </div>
                            <div>
                                <div className="text-[10px] font-mono font-bold tracking-widest text-amber-300 uppercase">
                                    PENGATURAN RUANG UJIAN TERPUSAT
                                </div>
                                <h2 className="text-lg sm:text-xl font-black text-white">
                                    Token Resmi &amp; Penjadwalan Waktu Nyata
                                </h2>
                                <p className="text-xs text-blue-200">
                                    Status Sesi: <strong className={`px-2 py-0.5 rounded font-mono text-[11px] ${masterSession.status_akses === "DIBUKA" ? "bg-emerald-500/30 text-emerald-300 border border-emerald-400/40" : "bg-rose-500/30 text-rose-300 border border-rose-400/40"
                                        }`}>{masterSession.status_akses}</strong>
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 bg-white/10 p-1.5 rounded-2xl border border-white/15">
                            <span className="text-[10.5px] font-bold text-slate-300 px-2 font-mono">TAMBAH WAKTU DARURAT:</span>
                            <button
                                type="button"
                                onClick={() => handleAddCompensationTime(2)}
                                className="px-2.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-amber-300 font-bold text-xs cursor-pointer transition-all"
                            >
                                +2m
                            </button>
                            <button
                                type="button"
                                onClick={() => handleAddCompensationTime(5)}
                                className="px-2.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-amber-300 font-bold text-xs cursor-pointer transition-all"
                            >
                                +5m
                            </button>

                            <div className="flex items-center gap-1 pl-1 border-l border-white/20">
                                <input
                                    type="number"
                                    min={1}
                                    max={60}
                                    value={customMinutes}
                                    onChange={(e) => setCustomMinutes(Math.max(1, Number(e.target.value)))}
                                    className="w-12 px-1 py-1 rounded-lg bg-black/40 border border-white/20 text-center text-xs font-mono font-bold text-amber-300 outline-none"
                                />
                                <span className="text-[10.5px] font-mono text-slate-300">mnt</span>
                                <button
                                    type="button"
                                    onClick={() => handleAddCompensationTime(customMinutes)}
                                    className="px-2.5 py-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1 cursor-pointer transition-all"
                                >
                                    <FastForward className="w-3.5 h-3.5" />
                                    <span>Kirim</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleUpdateSchedule} className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 text-xs">
                        <div className="sm:col-span-3 space-y-1">
                            <label className="text-[11px] font-bold text-slate-300 font-mono">PAKET SOAL AKTIF:</label>
                            <select
                                value={masterSession.paket_aktif}
                                onChange={(e: any) => setMasterSession({ ...masterSession, paket_aktif: e.target.value })}
                                className="w-full px-3 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white font-bold font-mono outline-none focus:bg-white/20"
                            >
                                <option value="PAKET_1" className="text-slate-900">PAKET 1 (Reguler Utama)</option>
                                <option value="PAKET_2" className="text-slate-900">PAKET 2 (Alternatif)</option>
                                <option value="PAKET_3" className="text-slate-900">PAKET 3 (Susulan)</option>
                            </select>
                        </div>

                        <div className="sm:col-span-3 space-y-1">
                            <div className="flex items-center justify-between">
                                <label className="text-[11px] font-bold text-slate-300 font-mono">TOKEN RESMI:</label>
                                <button
                                    type="button"
                                    onClick={generateRandomToken}
                                    className="text-[10px] text-amber-300 hover:underline font-bold cursor-pointer"
                                >
                                    Acak Token
                                </button>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <input
                                    type="text"
                                    required
                                    value={masterSession.token_resmi}
                                    onChange={(e) => setMasterSession({ ...masterSession, token_resmi: e.target.value.toUpperCase() })}
                                    className="w-full px-3 py-2.5 rounded-xl bg-white/10 border border-amber-400/50 text-amber-300 font-mono font-black text-sm text-center uppercase outline-none focus:bg-white/20"
                                />
                                <button
                                    type="button"
                                    onClick={copyToken}
                                    className="p-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white cursor-pointer"
                                    title="Salin Token"
                                >
                                    {tokenCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="sm:col-span-3 space-y-1">
                            <label className="text-[11px] font-bold text-slate-300 font-mono">JAM MULAI UJIAN:</label>
                            <input
                                type="datetime-local"
                                required
                                value={masterSession.waktu_mulai}
                                onChange={(e) => setMasterSession({ ...masterSession, waktu_mulai: e.target.value })}
                                className="w-full px-2.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white font-mono text-xs outline-none focus:bg-white/20"
                            />
                        </div>

                        <div className="sm:col-span-3 space-y-1">
                            <label className="text-[11px] font-bold text-slate-300 font-mono">JAM BATAS SELESAI UJIAN:</label>
                            <input
                                type="datetime-local"
                                required
                                value={masterSession.waktu_selesai}
                                onChange={(e) => setMasterSession({ ...masterSession, waktu_selesai: e.target.value })}
                                className="w-full px-2.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white font-mono text-xs outline-none focus:bg-white/20"
                            />
                        </div>

                        <div className="sm:col-span-12 flex justify-end pt-1">
                            <button
                                type="submit"
                                disabled={isSavingSchedule}
                                className="py-2.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50 shadow-md"
                            >
                                <Save className="w-4 h-4" />
                                <span>{isSavingSchedule ? "Menyimpan ke Server..." : "Terapkan Jadwal Ujian"}</span>
                            </button>
                        </div>
                    </form>
                </div>

                {/* 2. STATISTIK PESERTA */}
                <div className="print-hidden grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                        <div className="flex items-center justify-between text-slate-500 text-xs font-bold font-mono">
                            <span>TERDAFTAR</span>
                            <Users className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">{stats.total}</div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                        <div className="flex items-center justify-between text-blue-600 text-xs font-bold font-mono">
                            <span>SEDANG DI BILIK</span>
                            <Activity className="w-4 h-4 text-blue-600 animate-pulse" />
                        </div>
                        <div className="text-2xl sm:text-3xl font-black text-blue-700 mt-2">{stats.working}</div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                        <div className="flex items-center justify-between text-emerald-600 text-xs font-bold font-mono">
                            <span>SELESAI</span>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-2">{stats.finished}</div>
                    </div>

                    <div className={`p-4 rounded-2xl border shadow-2xs ${stats.locked > 0 ? "bg-rose-50 border-rose-300" : "bg-white border-slate-200"}`}>
                        <div className={`flex items-center justify-between text-xs font-bold font-mono ${stats.locked > 0 ? "text-rose-700" : "text-slate-500"}`}>
                            <span>TERKUNCI KIOSK</span>
                            <ShieldAlert className={`w-4 h-4 ${stats.locked > 0 ? "text-rose-600 animate-bounce" : "text-slate-400"}`} />
                        </div>
                        <div className={`text-2xl sm:text-3xl font-black mt-2 ${stats.locked > 0 ? "text-rose-700" : "text-slate-900"}`}>
                            {stats.locked}
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs col-span-2 lg:col-span-1">
                        <div className="flex items-center justify-between text-slate-500 text-xs font-bold font-mono">
                            <span>BELUM HADIR</span>
                            <Clock className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className="text-2xl sm:text-3xl font-black text-slate-600 mt-2">{stats.absent}</div>
                    </div>
                </div>

                {/* 3. TAB NAVIGASI RUANG PROKTOR */}
                <div className="print-hidden flex items-center gap-2 bg-slate-200/80 p-1 rounded-2xl border border-slate-300">
                    <button
                        onClick={() => setActiveTab("students")}
                        className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer ${activeTab === "students" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                    >
                        <PlusCircle className="w-4 h-4 text-emerald-600" />
                        <span>Pendaftaran &amp; Daftar Peserta</span>
                    </button>

                    <button
                        onClick={() => setActiveTab("monitor")}
                        className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer ${activeTab === "monitor" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                    >
                        <Activity className="w-4 h-4 text-blue-600" />
                        <span>Live Monitor Bilik Siswa</span>
                    </button>

                    <button
                        onClick={() => setActiveTab("bap")}
                        className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer ${activeTab === "bap" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                    >
                        <FileText className="w-4 h-4 text-indigo-600" />
                        <span>Berita Acara Ujian (BAP)</span>
                    </button>

                    <button
                        onClick={() => setActiveTab("scores")}
                        className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer ${activeTab === "scores" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                    >
                        <Award className="w-4 h-4 text-amber-500" />
                        <span>Buku Nilai IRT</span>
                    </button>
                </div>

                {/* TAB 1: PENDAFTARAN & DAFTAR SISWA */}
                {activeTab === "students" && (
                    <div className="print-hidden space-y-6">
                        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-5 shadow-sm">
                            <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <h3 className="text-base font-black text-slate-900">Input Data Peserta Ujian</h3>
                                    <p className="text-xs text-slate-500">
                                        Ketik NISN (angka), Nama Lengkap, dan Nama Kelas secara manual.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowBulkModal(true)}
                                        className="px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
                                    >
                                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Salin-Tempel dari Excel</span>
                                    </button>
                                </div>
                            </div>

                            <form onSubmit={handleAddStudent} className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 text-xs">
                                <div className="sm:col-span-4 space-y-1">
                                    <label className="font-bold text-slate-700 font-mono">NISN PESERTA (ANGKA, MAKS 10 DIGIT):</label>
                                    <input
                                        type="text"
                                        required
                                        inputMode="numeric"
                                        maxLength={10}
                                        placeholder="Contoh: 0078926118"
                                        value={newNisn}
                                        onChange={(e) => setNewNisn(e.target.value.replace(/\D/g, ""))}
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono font-bold focus:border-blue-600 outline-none"
                                    />
                                </div>

                                <div className="sm:col-span-5 space-y-1">
                                    <label className="font-bold text-slate-700 font-mono">NAMA LENGKAP SISWA:</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Nama Lengkap Siswa..."
                                        value={newNama}
                                        onChange={(e) => setNewNama(e.target.value)}
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold focus:border-blue-600 outline-none"
                                    />
                                </div>

                                <div className="sm:col-span-3 space-y-1">
                                    <label className="font-bold text-slate-700 font-mono">KELAS (BEBAS KETIK):</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Contoh: XII MIPA 1"
                                        value={newKelas}
                                        onChange={(e) => setNewKelas(e.target.value)}
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold uppercase focus:border-blue-600 outline-none"
                                    />
                                </div>

                                <div className="sm:col-span-12 pt-1 flex items-center justify-between flex-wrap gap-2">
                                    <span className="text-[11px] text-slate-400 italic">
                                        *Data otomatis tercatat di tab DATA_SISWA spreadsheet sekolah.
                                    </span>
                                    <button
                                        type="submit"
                                        disabled={isSubmittingStudent}
                                        className="px-6 py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50 transition-all"
                                    >
                                        <PlusCircle className="w-4 h-4" />
                                        <span>{isSubmittingStudent ? "Menyimpan ke Server..." : "Simpan Peserta"}</span>
                                    </button>
                                </div>
                            </form>
                        </div>

                        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-4 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                                <div>
                                    <h3 className="text-base font-black text-slate-900">
                                        Daftar Peserta Terdaftar ({students.length} Siswa)
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Siswa di daftar ini yang memiliki izin login ke bilik simulasi dengan token proktor.
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="text"
                                            placeholder="Cari NISN / Nama..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs outline-none"
                                        />
                                    </div>

                                    <select
                                        value={filterKelas}
                                        onChange={(e) => setFilterKelas(e.target.value)}
                                        className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold outline-none bg-white"
                                    >
                                        <option value="ALL">Semua Kelas</option>
                                        {availableClasses.map((cls) => (
                                            <option key={cls} value={cls}>
                                                {cls}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="overflow-x-auto rounded-2xl border border-slate-200">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="bg-slate-50 border-b border-slate-200 font-mono text-[11px] text-slate-600">
                                        <tr>
                                            <th className="p-3.5 w-12">No</th>
                                            <th className="p-3.5">NISN</th>
                                            <th className="p-3.5">Nama Lengkap</th>
                                            <th className="p-3.5">Kelas</th>
                                            <th className="p-3.5">Status</th>
                                            <th className="p-3.5 text-right">Tindakan</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium">
                                        {filteredStudents.map((s, idx) => (
                                            <tr key={s.nisn} className="hover:bg-slate-50/70">
                                                <td className="p-3.5 font-mono text-slate-400">{idx + 1}</td>
                                                <td className="p-3.5 font-mono font-bold text-slate-800">{s.nisn}</td>
                                                <td className="p-3.5 font-bold text-slate-900">{s.nama}</td>
                                                <td className="p-3.5 font-mono font-bold text-blue-700">{s.kelas}</td>
                                                <td className="p-3.5">
                                                    <span
                                                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${s.status.toLowerCase().includes("mengerjakan")
                                                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                                                            : s.status.toLowerCase().includes("selesai") || s.score > 0
                                                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                                : s.status.toLowerCase().includes("kunci") || s.violations >= 3
                                                                    ? "bg-rose-100 text-rose-800 border border-rose-300"
                                                                    : "bg-slate-100 text-slate-600 border border-slate-200"
                                                            }`}
                                                    >
                                                        {s.status}
                                                    </span>
                                                </td>
                                                <td className="p-3.5 text-right space-x-1.5">
                                                    <button
                                                        onClick={() => handleOpenEditModal(s)}
                                                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 hover:text-blue-700 text-slate-600 cursor-pointer transition-colors"
                                                        title="Edit Data Peserta"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>

                                                    <button
                                                        onClick={() => handleDeleteStudent(s.nisn, s.nama)}
                                                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 hover:text-rose-700 text-slate-500 cursor-pointer transition-colors"
                                                        title="Hapus Peserta"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}

                                        {filteredStudents.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="text-center py-8 text-slate-400 font-medium">
                                                    {students.length === 0
                                                        ? "Belum ada siswa terdaftar. Silakan masukkan data siswa pada formulir di atas."
                                                        : "Tidak ada siswa yang cocok dengan pencarian / filter kelas."}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: LIVE MONITOR BILIK SISWA (TOMBOL LENGKAP DENGAN SINKRONISASI LOGIS & AUTO-POLLING) */}
                {activeTab === "monitor" && (
                    <div className="print-hidden bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 space-y-4 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                            <div>
                                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                                    <span>Pemantauan Layar Kiosk Siswa</span>
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-[10px] font-bold inline-flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                        Auto-Sync 5s
                                    </span>
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Paket aktif: <strong className="text-blue-700 font-bold">{masterSession.paket_aktif}</strong> | Token:{" "}
                                    <strong className="text-amber-600 font-mono font-bold">{masterSession.token_resmi}</strong>
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="text"
                                        placeholder="Cari NISN / Nama..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs outline-none"
                                    />
                                </div>
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold outline-none bg-white"
                                >
                                    <option value="ALL">Semua Status</option>
                                    <option value="Mengerjakan">Sedang Mengerjakan</option>
                                    <option value="Terkunci">Terkunci</option>
                                    <option value="Selesai">Selesai</option>
                                    <option value="Hadir">Belum Hadir</option>
                                </select>
                            </div>
                        </div>

                        <div className="overflow-x-auto rounded-2xl border border-slate-200">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead className="bg-slate-50 border-b border-slate-200 font-mono text-[11px] text-slate-600">
                                    <tr>
                                        <th className="p-3.5">NISN</th>
                                        <th className="p-3.5">Nama Peserta</th>
                                        <th className="p-3.5">Kelas</th>
                                        <th className="p-3.5">Status Pengerjaan</th>
                                        <th className="p-3.5">Pelanggaran Kiosk</th>
                                        <th className="p-3.5 text-right">Aksi Pengawas (Kendali Penuh)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium">
                                    {filteredStudents.map((s) => {
                                        const isLocked = s.status.toLowerCase().includes("kunci") || s.violations >= 3;
                                        const isFinished = s.status.toLowerCase().includes("selesai") || s.score > 0;
                                        const isWorking = s.status.toLowerCase().includes("mengerjakan");

                                        return (
                                            <tr key={s.nisn} className="hover:bg-slate-50/70">
                                                <td className="p-3.5 font-mono font-bold text-slate-800">{s.nisn}</td>
                                                <td className="p-3.5 font-bold text-slate-900">{s.nama}</td>
                                                <td className="p-3.5 font-mono text-slate-600 font-semibold">{s.kelas}</td>
                                                <td className="p-3.5">
                                                    {isWorking && (
                                                        <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[10px] inline-flex items-center gap-1.5 shadow-2xs">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                                                            Aktif Mengerjakan
                                                        </span>
                                                    )}
                                                    {isFinished && (
                                                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px]">
                                                            Selesai ({s.waktu_selesai || "-"})
                                                        </span>
                                                    )}
                                                    {isLocked && (
                                                        <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 font-black text-[10px] inline-flex items-center gap-1 animate-pulse">
                                                            <Lock className="w-3.5 h-3.5" />
                                                            Terkunci (Kiosk)
                                                        </span>
                                                    )}
                                                    {!isWorking && !isFinished && !isLocked && (
                                                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-medium">
                                                            Belum Hadir
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-3.5 font-mono font-bold">
                                                    {s.violations > 0 ? (
                                                        <span className="text-rose-600 flex items-center gap-1">
                                                            <AlertTriangle className="w-3.5 h-3.5" />
                                                            {s.violations}x Terdeteksi
                                                        </span>
                                                    ) : (
                                                        <span className="text-emerald-600">0 (Bersih)</span>
                                                    )}
                                                </td>

                                                {/* BARIS TIGA TOMBOL KENDALI PENUH */}
                                                <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                                                    {/* 1. BUKA AKSES (LANJUT) */}
                                                    <button
                                                        onClick={() => handleUnlockResumeStudent(s)}
                                                        className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold cursor-pointer inline-flex items-center gap-1 shadow-2xs transition-all active:scale-95"
                                                        title="Buka akses agar siswa dapat melanjutkan ujian tanpa kehilangan jawaban"
                                                    >
                                                        <Unlock className="w-3.5 h-3.5" />
                                                        <span>Buka Akses (Lanjut)</span>
                                                    </button>

                                                    {/* 2. BLOKIR */}
                                                    <button
                                                        onClick={() => handleBlockStudent(s)}
                                                        className="px-2.5 py-1.5 rounded-xl border border-rose-300 hover:bg-rose-50 text-rose-700 text-[11px] font-bold cursor-pointer inline-flex items-center gap-1 transition-all active:scale-95"
                                                        title="Kunci / Blokir bilik siswa ini secara manual (Pelanggaran tetap riil)"
                                                    >
                                                        <Ban className="w-3.5 h-3.5" />
                                                        <span>Blokir</span>
                                                    </button>

                                                    {/* 3. UJIAN ULANG */}
                                                    <button
                                                        onClick={() => handleResetStudent(s)}
                                                        className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-[11px] font-bold cursor-pointer inline-flex items-center gap-1 transition-all active:scale-95"
                                                        title="Reset status dan nilai kembali ke Belum Hadir untuk persiapan paket baru"
                                                    >
                                                        <RotateCcw className="w-3.5 h-3.5" />
                                                        <span>Ujian Ulang</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* TAB 3: BERITA ACARA UJIAN (BAP) */}
                {activeTab === "bap" && (
                    <div className="space-y-6">
                        <div className="print-hidden bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
                                <div>
                                    <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-blue-700" />
                                        <span>Pengaturan Berita Acara Ujian (BAP)</span>
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Data yang Anda ketik di bawah akan otomatis terisi rapi pada lembar cetak Berita Acara di bawah.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => window.print()}
                                    className="px-5 py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md transition-all shrink-0"
                                >
                                    <Printer className="w-4 h-4" />
                                    <span>Cetak Lembar BAP (PDF/A4)</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                                <div className="space-y-1">
                                    <label className="font-bold text-slate-700 font-mono">NOMOR SURAT BAP:</label>
                                    <input
                                        type="text"
                                        value={bapData.nomorSurat}
                                        onChange={(e) => setBapData({ ...bapData, nomorSurat: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold focus:border-blue-600 outline-none"
                                        placeholder="Contoh: 118/BAP-SNBT/SMA-M18/2026"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="font-bold text-slate-700 font-mono">RUANG / LABORATORIUM:</label>
                                    <input
                                        type="text"
                                        value={bapData.ruangUjian}
                                        onChange={(e) => setBapData({ ...bapData, ruangUjian: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold focus:border-blue-600 outline-none"
                                        placeholder="Contoh: Lab Komputer 1"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <label className="font-bold text-slate-700 font-mono">DATA KEHADIRAN:</label>
                                        <label className="text-[10px] text-blue-700 font-bold flex items-center gap-1 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={bapData.isManualHadir}
                                                onChange={(e) =>
                                                    setBapData({
                                                        ...bapData,
                                                        isManualHadir: e.target.checked,
                                                        manualHadir: stats.working + stats.finished,
                                                        manualTidakHadir: stats.absent
                                                    })
                                                }
                                                className="rounded"
                                            />
                                            <span>Manual</span>
                                        </label>
                                    </div>
                                    {bapData.isManualHadir ? (
                                        <div className="grid grid-cols-2 gap-2">
                                            <input
                                                type="number"
                                                placeholder="Hadir"
                                                value={bapData.manualHadir}
                                                onChange={(e) => setBapData({ ...bapData, manualHadir: Number(e.target.value) })}
                                                className="px-2 py-2 rounded-xl border border-slate-200 text-center font-bold font-mono outline-none"
                                            />
                                            <input
                                                type="number"
                                                placeholder="Absen"
                                                value={bapData.manualTidakHadir}
                                                onChange={(e) => setBapData({ ...bapData, manualTidakHadir: Number(e.target.value) })}
                                                className="px-2 py-2 rounded-xl border border-slate-200 text-center font-bold font-mono outline-none"
                                            />
                                        </div>
                                    ) : (
                                        <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-600 flex justify-between items-center">
                                            <span>Otomatis:</span>
                                            <strong className="text-emerald-700">{stats.working + stats.finished} Hadir</strong>
                                            <span className="text-slate-400">/</span>
                                            <strong className="text-rose-700">{stats.absent} Absen</strong>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <label className="font-bold text-slate-700 font-mono">NAMA KEPALA SEKOLAH:</label>
                                    <input
                                        type="text"
                                        value={bapData.kepalaSekolahNama}
                                        onChange={(e) => setBapData({ ...bapData, kepalaSekolahNama: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold focus:border-blue-600 outline-none"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="font-bold text-slate-700 font-mono">NIP / NBM KEPALA SEKOLAH:</label>
                                    <input
                                        type="text"
                                        value={bapData.kepalaSekolahNbm}
                                        onChange={(e) => setBapData({ ...bapData, kepalaSekolahNbm: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono focus:border-blue-600 outline-none"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="font-bold text-slate-700 font-mono">NAMA PROKTOR / PENGAWAS:</label>
                                    <input
                                        type="text"
                                        value={bapData.pengawasNama}
                                        onChange={(e) => setBapData({ ...bapData, pengawasNama: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold focus:border-blue-600 outline-none"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="font-bold text-slate-700 font-mono">NIP / NBM PROKTOR:</label>
                                    <input
                                        type="text"
                                        value={bapData.pengawasNbm}
                                        onChange={(e) => setBapData({ ...bapData, pengawasNbm: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono focus:border-blue-600 outline-none"
                                    />
                                </div>

                                <div className="sm:col-span-2 lg:col-span-3 space-y-1">
                                    <label className="font-bold text-slate-700 font-mono">CATATAN KHUSUS UJIAN:</label>
                                    <textarea
                                        rows={2}
                                        value={bapData.catatanKhusus}
                                        onChange={(e) => setBapData({ ...bapData, catatanKhusus: e.target.value })}
                                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:border-blue-600 outline-none resize-y leading-relaxed font-sans text-xs"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* LEMBAR CETAK DOKUMEN BAP ASLI RESMI */}
                        <div className="print-sheet bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-lg space-y-5 text-slate-950 font-serif leading-relaxed">
                            <div className="text-center">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="w-20 h-20 shrink-0 flex items-center justify-center">
                                        <img
                                            src="/logo-timsim.jpg"
                                            alt="Logo SMA Muhammadiyah 18"
                                            className="w-full h-full object-contain"
                                            onError={(e) => {
                                                (e.target as any).src = "/images/logo-smam18.png";
                                            }}
                                        />
                                    </div>
                                    <div className="flex-1 text-center space-y-0.5">
                                        <h3 className="text-xs font-bold tracking-wider uppercase leading-tight font-sans">
                                            MAJELIS PENDIDIKAN DASAR DAN MENENGAH DAN PENDIDIKAN NONFORMAL
                                        </h3>
                                        <h4 className="text-[11px] font-bold tracking-wide uppercase leading-tight font-sans">
                                            PIMPINAN DAERAH MUHAMMADIYAH JAKARTA SELATAN
                                        </h4>
                                        <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight font-sans text-[#1e3a8a] py-0.5">
                                            SMA MUHAMMADIYAH 18 JAKARTA
                                        </h1>
                                        <p className="text-[11px] font-bold tracking-widest font-mono uppercase text-slate-700">
                                            STATUS: TERAKREDITASI &quot;A&quot;
                                        </p>
                                        <p className="text-[10px] text-slate-600 font-sans leading-tight">
                                            Jl. Panjang No. 19, Cipulir, Kebayoran Lama, Jakarta Selatan 12230 | Telp: (021) 7235544
                                        </p>
                                        <p className="text-[9.5px] text-slate-500 font-mono">
                                            Website: https://smamuh18jakarta.sch.id &bull; Pos-el: smamuh18@gmail.com
                                        </p>
                                    </div>
                                    <div className="w-20 shrink-0" />
                                </div>
                                <div className="kop-divider-thick" />
                                <div className="kop-divider-thin" />
                            </div>

                            <div className="text-center space-y-1 pt-1">
                                <h2 className="text-base font-bold underline uppercase tracking-wide">
                                    BERITA ACARA PELAKSANAAN UJIAN SIMULASI UTBK-SNBT
                                </h2>
                                <p className="text-xs font-mono font-bold">
                                    Nomor: {bapData.nomorSurat}
                                </p>
                            </div>

                            <div className="text-xs leading-relaxed space-y-3.5 text-justify">
                                <p>
                                    Pada hari ini, <strong>{new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</strong>,
                                    telah diselenggarakan Uji Coba Simulasi Terstandarisasi Asesmen UTBK-SNBT Tahun Pelajaran 2026/2027 berbasis Computer-Based Test (CBT) di lingkungan <strong>SMA Muhammadiyah 18 Jakarta</strong> dengan ketentuan pelaksanaan sebagai berikut:
                                </p>

                                <table className="print-table text-xs">
                                    <tbody>
                                        <tr>
                                            <td className="w-1/4 font-semibold">Paket Soal Ujian</td>
                                            <td className="w-3/4 font-bold font-mono">{masterSession.paket_aktif} &mdash; {masterSession.nama_paket}</td>
                                        </tr>
                                        <tr>
                                            <td className="font-semibold">Ruang / Tempat Ujian</td>
                                            <td>{bapData.ruangUjian}</td>
                                        </tr>
                                        <tr>
                                            <td className="font-semibold">Waktu Pelaksanaan</td>
                                            <td>{masterSession.waktu_mulai.replace("T", " ")} s.d. {masterSession.waktu_selesai.replace("T", " ")} WIB</td>
                                        </tr>
                                        <tr>
                                            <td className="font-semibold">Token Resmi Sesi</td>
                                            <td className="font-mono font-bold">{masterSession.token_resmi}</td>
                                        </tr>
                                        <tr>
                                            <td className="font-semibold">Jumlah Peserta Terdaftar</td>
                                            <td className="font-bold">{stats.total} Orang</td>
                                        </tr>
                                        <tr>
                                            <td className="font-semibold">Jumlah Peserta Hadir</td>
                                            <td className="font-bold text-emerald-800">
                                                {bapData.isManualHadir ? bapData.manualHadir : stats.working + stats.finished} Orang
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="font-semibold">Jumlah Tidak Hadir</td>
                                            <td className="font-bold text-rose-800">
                                                {bapData.isManualHadir ? bapData.manualTidakHadir : stats.absent} Orang
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>

                                <div>
                                    <p className="font-bold mb-1">Catatan Khusus Selama Pelaksanaan Ujian:</p>
                                    <div className="p-3 border border-black min-h-[45px] text-xs italic">
                                        &ldquo;{bapData.catatanKhusus}&rdquo;
                                    </div>
                                </div>

                                <p>
                                    Demikian Berita Acara Pelaksanaan ini dibuat dengan sebenar-benarnya serta penuh rasa tanggung jawab untuk dipergunakan sebagaimana mestinya.
                                </p>
                            </div>

                            <div className="pt-6 grid grid-cols-2 text-xs text-center font-sans">
                                <div>
                                    <p>Mengetahui,</p>
                                    <p className="font-bold">Kepala SMA Muhammadiyah 18 Jakarta</p>
                                    <div className="h-20" />
                                    <p className="font-bold underline">{bapData.kepalaSekolahNama}</p>
                                    <p className="font-mono text-[10px]">NBM. {bapData.kepalaSekolahNbm}</p>
                                </div>

                                <div>
                                    <p>Jakarta, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
                                    <p className="font-bold">Proktor / Pengawas Ruang Ujian</p>
                                    <div className="h-20" />
                                    <p className="font-bold underline">{bapData.pengawasNama}</p>
                                    <p className="font-mono text-[10px]">NBM/NIP. {bapData.pengawasNbm}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 4: REKAPITULASI NILAI IRT (DOKUMEN RESMI BERSIH TANPA TOMBOL RESET) */}
                {activeTab === "scores" && (
                    <div className="space-y-6">
                        <div className="print-hidden bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 space-y-4 shadow-sm">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                <div>
                                    <h3 className="text-base font-black text-slate-900">Buku Nilai Rekapitulasi IRT 3-Parameter</h3>
                                    <p className="text-xs text-slate-500">Skor terhitung otomatis pada skala resmi nasional (200 s.d. 1000).</p>
                                </div>
                                <button
                                    onClick={() => window.print()}
                                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer flex items-center gap-1.5 shadow-md"
                                >
                                    <Printer className="w-3.5 h-3.5" />
                                    <span>Cetak Rekap Nilai (A4)</span>
                                </button>
                            </div>

                            <div className="overflow-x-auto rounded-2xl border border-slate-200">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="bg-slate-50 border-b border-slate-200 font-mono text-[11px] text-slate-600">
                                        <tr>
                                            <th className="p-3.5">Peringkat</th>
                                            <th className="p-3.5">NISN</th>
                                            <th className="p-3.5">Nama Peserta</th>
                                            <th className="p-3.5">Kelas</th>
                                            <th className="p-3.5 text-center">Skor Akhir IRT</th>
                                            <th className="p-3.5">Integritas</th>
                                            <th className="p-3.5 text-center">Waktu Selesai</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium">
                                        {students
                                            .filter((s) => s.status.toLowerCase().includes("selesai") || Number(s.score) > 0)
                                            .sort((a, b) => Number(b.score) - Number(a.score))
                                            .map((s, idx) => (
                                                <tr key={s.nisn} className="hover:bg-slate-50">
                                                    <td className="p-3.5 font-mono font-bold text-blue-700">#{idx + 1}</td>
                                                    <td className="p-3.5 font-mono font-bold">{s.nisn}</td>
                                                    <td className="p-3.5 font-bold text-slate-900">{s.nama}</td>
                                                    <td className="p-3.5 font-mono text-slate-600">{s.kelas}</td>
                                                    <td className="p-3.5 font-mono font-black text-sm text-blue-800 text-center">
                                                        {Number(s.score || 0).toFixed(1)}
                                                    </td>
                                                    <td className="p-3.5 text-emerald-700 font-bold">
                                                        {s.violations === 0 ? "Bersih (0)" : `${s.violations}x Pelanggaran`}
                                                    </td>
                                                    <td className="p-3.5 font-mono text-center text-slate-500">
                                                        {s.waktu_selesai || "-"}
                                                    </td>
                                                </tr>
                                            ))}

                                        {students.filter((s) => s.status.toLowerCase().includes("selesai") || Number(s.score) > 0).length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="text-center py-6 text-slate-400 font-medium">
                                                    Belum ada peserta yang menyelesaikan ujian pada sesi ini.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* LEMBAR CETAK REKAP NILAI DOKUMEN RESMI A4 */}
                        <div className="print-sheet hidden print:block bg-white p-8 sm:p-12 space-y-4 text-slate-950 font-serif leading-relaxed">
                            <div className="text-center">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="w-16 h-16 shrink-0 flex items-center justify-center">
                                        <img
                                            src="/logo-timsim.jpg"
                                            alt="Logo SMA Muhammadiyah 18"
                                            className="w-full h-full object-contain"
                                            onError={(e) => {
                                                (e.target as any).src = "/images/logo-smam18.png";
                                            }}
                                        />
                                    </div>
                                    <div className="flex-1 text-center space-y-0.5 font-sans">
                                        <h3 className="text-[11px] font-bold uppercase leading-tight">
                                            MAJELIS PENDIDIKAN DASAR DAN MENENGAH PDM JAKARTA SELATAN
                                        </h3>
                                        <h1 className="text-lg font-black uppercase text-[#1e3a8a] leading-tight">
                                            SMA MUHAMMADIYAH 18 JAKARTA
                                        </h1>
                                        <p className="text-[10px] text-slate-600">
                                            REKAPITULASI HASIL ASESMEN SIMULASI UTBK-SNBT TAHUN 2026/2027
                                        </p>
                                    </div>
                                    <div className="w-16 shrink-0" />
                                </div>
                                <div className="kop-divider-thick" />
                                <div className="kop-divider-thin" />
                            </div>

                            <table className="print-table text-xs mt-3">
                                <thead>
                                    <tr>
                                        <th style={{ width: "35px" }}>No</th>
                                        <th style={{ width: "95px" }}>NISN</th>
                                        <th>Nama Lengkap Peserta</th>
                                        <th style={{ width: "85px" }}>Kelas</th>
                                        <th style={{ width: "85px" }}>Skor IRT</th>
                                        <th style={{ width: "95px" }}>Integritas</th>
                                        <th style={{ width: "70px" }}>Waktu</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students
                                        .filter((s) => s.status.toLowerCase().includes("selesai") || Number(s.score) > 0)
                                        .sort((a, b) => Number(b.score) - Number(a.score))
                                        .map((s, idx) => (
                                            <tr key={s.nisn}>
                                                <td style={{ textAlign: "center" }}>{idx + 1}</td>
                                                <td style={{ fontFamily: "monospace", textAlign: "center" }}>{s.nisn}</td>
                                                <td style={{ fontWeight: "bold" }}>{s.nama}</td>
                                                <td style={{ textAlign: "center" }}>{s.kelas}</td>
                                                <td style={{ textAlign: "center", fontWeight: "bold" }}>{Number(s.score || 0).toFixed(1)}</td>
                                                <td style={{ textAlign: "center" }}>{s.violations === 0 ? "Bersih" : `${s.violations}x Pelanggaran`}</td>
                                                <td style={{ textAlign: "center" }}>{s.waktu_selesai || "-"}</td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>

                            <div className="pt-8 grid grid-cols-2 text-xs text-center font-sans">
                                <div>
                                    <p>Mengetahui,</p>
                                    <p className="font-bold">Kepala SMA Muhammadiyah 18 Jakarta</p>
                                    <div className="h-16" />
                                    <p className="font-bold underline">{bapData.kepalaSekolahNama}</p>
                                    <p className="font-mono text-[10px]">NBM. {bapData.kepalaSekolahNbm}</p>
                                </div>
                                <div>
                                    <p>Jakarta, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
                                    <p className="font-bold">Proktor / Pengawas Ruang Ujian</p>
                                    <div className="h-16" />
                                    <p className="font-bold underline">{bapData.pengawasNama}</p>
                                    <p className="font-mono text-[10px]">NBM/NIP. {bapData.pengawasNbm}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL BULK EXCEL */}
            {showBulkModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full space-y-4 shadow-2xl border border-slate-200">
                        <div className="flex items-center justify-between border-b pb-3">
                            <h3 className="font-bold text-slate-900">Salin-Tempel Massal dari Excel</h3>
                            <button onClick={() => setShowBulkModal(false)}><X className="w-4 h-4" /></button>
                        </div>
                        <textarea
                            rows={8}
                            value={bulkRawText}
                            onChange={(e) => setBulkRawText(e.target.value)}
                            placeholder="NISN [Tab] Nama [Tab] Kelas"
                            className="w-full p-3.5 rounded-2xl border border-slate-200 font-mono text-xs"
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowBulkModal(false)} className="px-4 py-2 border rounded-xl text-xs font-bold">Batal</button>
                            <button onClick={handleBulkImportStudents} disabled={isBulkImporting} className="px-5 py-2 bg-emerald-700 text-white font-bold rounded-xl text-xs">
                                {isBulkImporting ? "Memproses..." : "Daftarkan Siswa"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL EDIT DATA */}
            {editingStudent && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full space-y-4 shadow-2xl border border-slate-200">
                        <div className="flex items-center justify-between border-b pb-3">
                            <h3 className="font-bold text-slate-900">Perbarui Data Peserta</h3>
                            <button onClick={() => setEditingStudent(null)}><X className="w-4 h-4" /></button>
                        </div>
                        <form onSubmit={handleSaveEditStudent} className="space-y-3 text-xs">
                            <input
                                type="text"
                                value={editNisn}
                                onChange={(e) => setEditNisn(e.target.value.replace(/\D/g, ""))}
                                className="w-full p-2.5 border rounded-xl font-mono font-bold"
                            />
                            <input
                                type="text"
                                value={editNama}
                                onChange={(e) => setEditNama(e.target.value)}
                                className="w-full p-2.5 border rounded-xl font-bold"
                            />
                            <input
                                type="text"
                                value={editKelas}
                                onChange={(e) => setEditKelas(e.target.value)}
                                className="w-full p-2.5 border rounded-xl font-bold uppercase"
                            />
                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={() => setEditingStudent(null)} className="px-4 py-2 border rounded-xl font-bold">Batal</button>
                                <button type="submit" disabled={isUpdatingStudent} className="px-5 py-2 bg-blue-700 text-white font-bold rounded-xl">
                                    {isUpdatingStudent ? "Menyimpan..." : "Simpan Perubahan"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}