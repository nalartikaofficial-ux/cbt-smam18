"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    ShieldAlert,
    BookOpen,
    ArrowRight,
    ChevronLeft,
    User,
    KeyRound,
    Activity,
    LogOut,
    AlertCircle,
    PlusCircle,
    Trash2,
    Settings,
    GraduationCap,
    BarChart3,
    ExternalLink,
    Eye,
    EyeOff
} from "lucide-react";

interface UserAccount {
    username: string;
    password?: string;
    nama: string;
    role: "admin" | "proctor" | "guru";
    mapel?: string;
}

const DEFAULT_SYSTEM_ACCOUNTS: UserAccount[] = [
    { username: "admin", password: "admin18", nama: "Administrator Utama", role: "admin", mapel: "Semua" },
    { username: "proctor", password: "proctor18", nama: "Proktor Pengawas Ruang", role: "proctor", mapel: "Semua" },
    { username: "gurufisika", password: "guru123", nama: "Fadhillah Umar, S.Pd.", role: "guru", mapel: "Fisika" }
];

export default function AdminGateAndHubPage() {
    const router = useRouter();

    const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
    const [usernameInput, setUsernameInput] = useState("");
    const [passwordInput, setPasswordInput] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [isVerifying, setIsVerifying] = useState(false);
    const [isCheckingSession, setIsCheckingSession] = useState(true);
    const [showPassword, setShowPassword] = useState(false);

    // List User & Form Tambah Guru Baru
    const [userList, setUserList] = useState<UserAccount[]>(DEFAULT_SYSTEM_ACCOUNTS);
    const [newUsername, setNewUsername] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [newNama, setNewNama] = useState("");
    const [newMapel, setNewMapel] = useState("");
    const [isAddingUser, setIsAddingUser] = useState(false);

    const fetchUsers = async () => {
        try {
            const res = await fetch(`/api/staff?_t=${Date.now()}`, { cache: "no-store" });
            const json = await res.json();
            if (json.status === "success" && Array.isArray(json.data) && json.data.length > 0) {
                const dbUsers: UserAccount[] = json.data;
                const merged = [...DEFAULT_SYSTEM_ACCOUNTS];
                dbUsers.forEach((su) => {
                    if (!merged.some((m) => m.username.toLowerCase() === su.username.toLowerCase())) {
                        merged.push(su);
                    }
                });
                setUserList(merged);
            }
        } catch {
            setUserList(DEFAULT_SYSTEM_ACCOUNTS);
        }
    };

    useEffect(() => {
        fetchUsers();

        if (typeof window !== "undefined") {
            const raw = sessionStorage.getItem("logged_user");
            if (raw) {
                try {
                    const parsed = JSON.parse(raw);
                    if (parsed && parsed.username) {
                        setCurrentUser(parsed);
                    }
                } catch {
                    sessionStorage.removeItem("logged_user");
                }
            }
            setIsCheckingSession(false);
        }
    }, []);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setIsVerifying(true);
        setErrorMsg("");

        const cleanInputUser = usernameInput.trim().toLowerCase();
        const cleanInputPass = passwordInput.trim();

        const pool = [...DEFAULT_SYSTEM_ACCOUNTS, ...userList];
        const found = pool.find(
            (u) =>
                u.username.trim().toLowerCase() === cleanInputUser &&
                String(u.password).trim() === cleanInputPass
        );

        if (found) {
            setCurrentUser(found);
            setIsVerifying(false);

            if (typeof window !== "undefined") {
                sessionStorage.setItem("logged_user", JSON.stringify(found));
            }

            if (found.role === "proctor") {
                router.push("/admin/proctor");
            } else if (found.role === "guru") {
                router.push("/admin/bank-soal");
            }
        } else {
            setIsVerifying(false);
            setErrorMsg("Username atau Password salah! Akses ditolak.");
        }
    };

    const handleLogout = () => {
        if (typeof window !== "undefined") {
            sessionStorage.removeItem("logged_user");
        }
        setCurrentUser(null);
        setUsernameInput("");
        setPasswordInput("");
        setErrorMsg("");
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUsername || !newPassword || !newNama || !newMapel) return;
        setIsAddingUser(true);

        const newUserObj: UserAccount = {
            username: newUsername.trim().toLowerCase(),
            password: newPassword.trim(),
            nama: newNama.trim(),
            role: "guru",
            mapel: newMapel.trim()
        };

        try {
            const res = await fetch("/api/staff", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "add_user",
                    ...newUserObj
                })
            });
            const json = await res.json();
            if (json.status !== "success") throw new Error(json.message);

            setUserList((prev) => [...prev.filter((u) => u.username !== newUserObj.username), newUserObj]);
            setNewUsername("");
            setNewPassword("");
            setNewNama("");
            setNewMapel("");
            alert(`Akun guru ${newUserObj.nama} berhasil disimpan ke Supabase!`);
        } catch (err: any) {
            alert(`Gagal menambahkan akun guru: ${err.message || "Cek koneksi"}`);
        } finally {
            setIsAddingUser(false);
        }
    };

    const handleDeleteUser = async (username: string) => {
        if (!confirm(`Hapus akun guru ${username}?`)) return;
        setUserList((prev) => prev.filter((u) => u.username !== username));

        try {
            await fetch("/api/staff", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "delete_user", username })
            });
        } catch { }
    };

    if (isCheckingSession) {
        return <div className="min-h-screen bg-slate-900" />;
    }

    // 1. TAMPILAN FORM LOGIN
    if (!currentUser) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-3.5 sm:p-6 font-sans text-slate-800 relative">
                <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-5 sm:p-8 space-y-5 sm:space-y-6 relative overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-1.5 bg-[#1e3a8a]" />

                    <Link
                        href="/"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Kembali ke Beranda Utama</span>
                    </Link>

                    <div className="text-center space-y-2">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center mx-auto overflow-hidden p-1">
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
                            <div className="inline-block px-3 py-0.5 rounded-full bg-blue-50 border border-blue-200 font-mono text-[9.5px] sm:text-[10px] font-bold text-blue-900 uppercase">
                                SMA MUHAMMADIYAH 18 JAKARTA
                            </div>
                            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
                                Portal Guru & Proktor
                            </h1>
                            <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                                Silakan masuk menggunakan akun Administrator, Pengawas Ujian, atau Guru Mata Pelajaran.
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-3.5 sm:space-y-4 text-xs text-left">
                        <div className="space-y-1">
                            <label className="font-bold font-mono text-slate-700 flex items-center gap-1.5 text-[10.5px] sm:text-xs">
                                <User className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                                <span>USERNAME:</span>
                            </label>
                            <input
                                type="text"
                                required
                                autoFocus
                                placeholder="Masukkan username..."
                                value={usernameInput}
                                onChange={(e) => setUsernameInput(e.target.value)}
                                className="w-full px-3.5 sm:px-4 py-2.5 rounded-xl border border-slate-200 font-mono text-xs sm:text-sm text-slate-900 font-bold focus:border-blue-600 outline-none"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="font-bold font-mono text-slate-700 flex items-center gap-1.5 text-[10.5px] sm:text-xs">
                                <KeyRound className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                                <span>PASSWORD:</span>
                            </label>
                            <div className="relative flex items-center">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    placeholder="Masukkan password..."
                                    value={passwordInput}
                                    onChange={(e) => setPasswordInput(e.target.value)}
                                    className="w-full pl-3.5 sm:pl-4 pr-11 py-2.5 rounded-xl border border-slate-200 font-mono text-xs sm:text-sm text-slate-900 font-bold focus:border-blue-600 outline-none transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 p-1 rounded-lg text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                                    title={showPassword ? "Sembunyikan password" : "Lihat password"}
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {errorMsg && (
                            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-700 font-medium">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isVerifying}
                            className="w-full py-3 sm:py-3.5 rounded-xl bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-900/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                            <span>{isVerifying ? "Memverifikasi..." : "Masuk ke Sistem"}</span>
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // 2. DASHBOARD HUB 3 BILIK
    return (
        <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800 text-left">
            <header className="bg-white border-b border-slate-200/90 py-3 px-3.5 sm:px-8 sticky top-0 z-20 shadow-2xs">
                <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white border border-slate-200 p-0.5 flex items-center justify-center overflow-hidden shrink-0">
                            <img
                                src="/logo-timsim.jpg"
                                alt="Logo SMA Muhammadiyah 18 Jakarta"
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                    (e.target as any).src = "/images/logo-smam18.png";
                                }}
                            />
                        </div>
                        <div className="min-w-0">
                            <div className="text-xs sm:text-sm font-black text-slate-900 tracking-tight uppercase truncate">
                                PUSAT KENDALI STAF • SMA MUHAMMADIYAH 18
                            </div>
                            <div className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate">
                                Masuk sebagai: <strong className="text-blue-700">{currentUser.nama}</strong> ({currentUser.role.toUpperCase()})
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[11px] sm:text-xs font-bold transition-colors cursor-pointer shrink-0"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Keluar / Logout</span>
                        <span className="sm:hidden">Keluar</span>
                    </button>
                </div>
            </header>

            <div className="max-w-6xl w-full mx-auto p-3.5 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 my-auto">
                <div className="space-y-1">
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Pilih Bilik Layanan</h1>
                    <p className="text-xs text-slate-500">Pilih modul tugas yang ingin Anda kelola hari ini.</p>
                </div>

                {/* TIGA KARTU MENU BILIK */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 items-stretch">
                    {/* Bilik 1: Proktor */}
                    <Link
                        href="/admin/proctor"
                        className="group p-5 sm:p-6 rounded-3xl bg-white border-2 border-slate-200 hover:border-blue-600 shadow-sm hover:shadow-xl transition-all duration-200 flex flex-col justify-between text-left cursor-pointer"
                    >
                        <div className="space-y-3.5 sm:space-y-4">
                            <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 group-hover:scale-110 transition-transform">
                                <ShieldAlert className="w-6 h-6 sm:w-7 sm:h-7" />
                            </div>
                            <div>
                                <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-800 text-[9.5px] sm:text-[10px] font-mono font-bold uppercase">
                                    BILIK 01
                                </span>
                                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight mt-1 group-hover:text-blue-700 transition-colors">
                                    Pusat Komando Proktor
                                </h2>
                                <p className="text-xs text-slate-500 leading-relaxed mt-1.5">
                                    Generator token sesi, pemantauan bilik siswa, buka kunci pelanggaran kiosk, import peserta, dan cetak Berita Acara Ujian (BAP).
                                </p>
                            </div>
                        </div>
                        <div className="pt-3.5 sm:pt-4 mt-3.5 sm:mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-700">
                            <span>Masuk Bilik Proktor →</span>
                            <Activity className="w-4 h-4 animate-pulse" />
                        </div>
                    </Link>

                    {/* Bilik 2: Bank Soal */}
                    <Link
                        href="/admin/bank-soal"
                        className="group p-5 sm:p-6 rounded-3xl bg-white border-2 border-slate-200 hover:border-indigo-600 shadow-sm hover:shadow-xl transition-all duration-200 flex flex-col justify-between text-left cursor-pointer"
                    >
                        <div className="space-y-3.5 sm:space-y-4">
                            <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 group-hover:scale-110 transition-transform">
                                <BookOpen className="w-6 h-6 sm:w-7 sm:h-7" />
                            </div>
                            <div>
                                <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-800 text-[9.5px] sm:text-[10px] font-mono font-bold uppercase">
                                    BILIK 02
                                </span>
                                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight mt-1 group-hover:text-indigo-700 transition-colors">
                                    Kelola Bank Soal SNBT
                                </h2>
                                <p className="text-xs text-slate-500 leading-relaxed mt-1.5">
                                    Input butir soal 7 subtes, rumus sains KaTeX, impor Word/CSV, dan penyimpanan otomatis ke Supabase PostgreSQL.
                                </p>
                            </div>
                        </div>
                        <div className="pt-3.5 sm:pt-4 mt-3.5 sm:mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-700">
                            <span>Masuk Ruang Bank Soal →</span>
                            <BookOpen className="w-4 h-4" />
                        </div>
                    </Link>

                    {/* Bilik 3: Analitik & Rekap Nilai */}
                    <Link
                        href="/admin/dashboard"
                        className="group p-5 sm:p-6 rounded-3xl bg-white border-2 border-slate-200 hover:border-emerald-600 shadow-sm hover:shadow-xl transition-all duration-200 flex flex-col justify-between text-left cursor-pointer"
                    >
                        <div className="space-y-3.5 sm:space-y-4">
                            <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 group-hover:scale-110 transition-transform">
                                <BarChart3 className="w-6 h-6 sm:w-7 sm:h-7" />
                            </div>
                            <div>
                                <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[9.5px] sm:text-[10px] font-mono font-bold uppercase">
                                    BILIK 03
                                </span>
                                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight mt-1 group-hover:text-emerald-700 transition-colors">
                                    Analitik & Progres Tryout
                                </h2>
                                <p className="text-xs text-slate-500 leading-relaxed mt-1.5">
                                    Dashboard hasil try out, perbandingan TO-1 vs TO-2 vs TO-3, peta kekuatan subtes, dan cetak rapor diagnostik A4.
                                </p>
                            </div>
                        </div>
                        <div className="pt-3.5 sm:pt-4 mt-3.5 sm:mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-700">
                            <span>Buka Statistik Nilai →</span>
                            <BarChart3 className="w-4 h-4" />
                        </div>
                    </Link>
                </div>

                {/* Tautan Cepat Simulasi Siswa */}
                <div className="bg-gradient-to-r from-blue-900 to-indigo-950 rounded-2xl p-4 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-center gap-3 min-w-0">
                        <GraduationCap className="w-5 h-5 text-amber-300 shrink-0" />
                        <div className="text-xs min-w-0">
                            <span className="font-bold block truncate">Uji Coba Bilik Siswa Langsung:</span>
                            <span className="text-blue-200 text-[11px] truncate block">Buka halaman simulasi mandiri siswa dengan 160 butir soal dan alur 195 menit.</span>
                        </div>
                    </div>
                    <Link
                        href="/simulation"
                        target="_blank"
                        className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white text-blue-950 font-bold text-xs hover:bg-blue-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                    >
                        <span>Buka Simulasi Siswa</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                </div>

                {/* Form Pembuatan Akun Guru (Khusus Super Admin) */}
                {currentUser.role === "admin" && (
                    <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
                            <div className="flex items-center gap-2">
                                <Settings className="w-5 h-5 text-blue-700 shrink-0" />
                                <h3 className="text-sm sm:text-base font-black text-slate-900">
                                    Pendaftaran Akun Guru Mata Pelajaran
                                </h3>
                            </div>
                            <span className="text-[11px] font-mono text-slate-400">
                                Akses Eksklusif Administrator
                            </span>
                        </div>

                        <form onSubmit={handleAddUser} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 text-xs items-end">
                            <div className="lg:col-span-3 space-y-1">
                                <label className="font-bold text-slate-700 font-mono text-[10.5px] uppercase tracking-wider block">
                                    NAMA LENGKAP GURU:
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Nama & Gelar..."
                                    value={newNama}
                                    onChange={(e) => setNewNama(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:border-blue-600 outline-none bg-white placeholder:text-slate-400"
                                />
                            </div>

                            <div className="lg:col-span-3 space-y-1">
                                <label className="font-bold text-slate-700 font-mono text-[10.5px] uppercase tracking-wider block">
                                    MATA PELAJARAN / SUBTES:
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Contoh: Fisika / Penalaran Matematika..."
                                    value={newMapel}
                                    onChange={(e) => setNewMapel(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:border-blue-600 outline-none bg-white placeholder:text-slate-400"
                                />
                            </div>

                            <div className="lg:col-span-2 space-y-1">
                                <label className="font-bold text-slate-700 font-mono text-[10.5px] uppercase tracking-wider block">
                                    USERNAME:
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Username..."
                                    value={newUsername}
                                    onChange={(e) => setNewUsername(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono font-bold text-xs focus:border-blue-600 outline-none bg-white placeholder:text-slate-400"
                                />
                            </div>

                            <div className="lg:col-span-2 space-y-1">
                                <label className="font-bold text-slate-700 font-mono text-[10.5px] uppercase tracking-wider block">
                                    PASSWORD:
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Password..."
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono font-bold text-xs focus:border-blue-600 outline-none bg-white placeholder:text-slate-400"
                                />
                            </div>

                            <div className="lg:col-span-2">
                                <button
                                    type="submit"
                                    disabled={isAddingUser}
                                    className="w-full py-2.5 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-blue-700/20 transition-all disabled:opacity-50 whitespace-nowrap"
                                >
                                    <PlusCircle className="w-3.5 h-3.5" />
                                    <span>{isAddingUser ? "Menyimpan..." : "Buat Akun"}</span>
                                </button>
                            </div>
                        </form>

                        <div className="overflow-x-auto rounded-2xl border border-slate-200">
                            <table className="w-full text-left text-xs border-collapse min-w-[620px]">
                                <thead className="bg-slate-50 border-b border-slate-200 font-mono text-[11px] text-slate-600">
                                    <tr>
                                        <th className="p-3">Username</th>
                                        <th className="p-3">Nama Lengkap</th>
                                        <th className="p-3">Mata Pelajaran</th>
                                        <th className="p-3">Peran (Role)</th>
                                        <th className="p-3 text-right">Tindakan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium">
                                    {userList.map((u) => (
                                        <tr key={u.username} className="hover:bg-slate-50/70">
                                            <td className="p-3 font-mono font-bold text-blue-700">{u.username}</td>
                                            <td className="p-3 text-slate-800 font-semibold">{u.nama}</td>
                                            <td className="p-3 font-mono text-slate-600">{u.mapel || "Semua"}</td>
                                            <td className="p-3">
                                                <span
                                                    className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${u.role === "admin"
                                                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                                                            : u.role === "proctor"
                                                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                        }`}
                                                >
                                                    {u.role.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="p-3 text-right">
                                                {u.role === "guru" ? (
                                                    <button
                                                        onClick={() => handleDeleteUser(u.username)}
                                                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 hover:text-rose-700 text-slate-500 cursor-pointer"
                                                        title="Hapus Akun Guru"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                ) : (
                                                    <span className="text-[10px] font-mono text-slate-400">Akun Sistem</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}