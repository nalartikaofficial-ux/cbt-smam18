import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getSupabaseClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    return createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false }
    });
}

// GET: Muat info sesi aktif untuk banner halaman /login
export async function GET() {
    try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from("exam_sessions")
            .select("*")
            .eq("id", 1)
            .maybeSingle();

        if (error) throw error;

        return NextResponse.json({
            status: "success",
            data: {
                paket_aktif: data?.paket_aktif || "PAKET_1",
                nama_paket: data?.nama_paket || "Simulasi Terstandarisasi SNBT 2026",
                status_akses: data?.status_akses || "DIBUKA",
                durasi_menit: data?.durasi_menit || 195,
                waktu_mulai: data?.waktu_mulai || null,
                waktu_selesai: data?.waktu_selesai || null
            }
        });
    } catch (err: any) {
        return NextResponse.json(
            { status: "error", message: err.message },
            { status: 500 }
        );
    }
}

// POST: Verifikasi NISN, Nama, dan Token Siswa dari Supabase
export async function POST(request: Request) {
    try {
        const supabase = getSupabaseClient();
        const body = await request.json();

        const nisn = String(body.nisn || "").replace(/\D/g, "").trim();
        const nama = String(body.nama || "").trim();
        const token = String(body.token || "").trim().toUpperCase();

        if (!nisn || !nama || !token) {
            return NextResponse.json(
                { status: "error", message: "NISN, Nama Lengkap, dan Token wajib diisi." },
                { status: 400 }
            );
        }

        // 1. Cek Sesi & Token Resmi dari Supabase
        const { data: sessionData } = await supabase
            .from("exam_sessions")
            .select("*")
            .eq("id", 1)
            .maybeSingle();

        const activeToken = String(sessionData?.token_resmi || "SM18UT").trim().toUpperCase();
        const activePackage = String(sessionData?.paket_aktif || "PAKET_1").trim().toUpperCase();
        const accessStatus = String(sessionData?.status_akses || "DIBUKA").trim().toUpperCase();
        const durasiMenit = Number(sessionData?.durasi_menit || 195);

        if (accessStatus === "TERKUNCI") {
            return NextResponse.json(
                { status: "error", message: "Bilik ujian sedang dikunci pengawas." },
                { status: 403 }
            );
        }

        if (token !== activeToken) {
            return NextResponse.json(
                { status: "error", message: "Token ujian salah, tanyakan pada pengawas!" },
                { status: 401 }
            );
        }

        // 2. Cek NISN di tabel students Supabase
        const { data: student, error } = await supabase
            .from("students")
            .select("*")
            .eq("nisn", nisn)
            .maybeSingle();

        if (error) throw error;

        if (!student) {
            return NextResponse.json(
                { status: "error", message: "NISN belum terdaftar di daftar ujian!" },
                { status: 404 }
            );
        }

        const stLower = String(student.status || "").toLowerCase();
        if (stLower.includes("kunci")) {
            return NextResponse.json(
                { status: "error", message: "Akun kamu sedang dikunci pengawas ruang." },
                { status: 403 }
            );
        }
        if (stLower.includes("selesai")) {
            return NextResponse.json(
                { status: "error", message: "Selamat, kamu sudah selesai mengerjakan ujian ini." },
                { status: 403 }
            );
        }

        // 3. Tandai status siswa menjadi 'Sedang Mengerjakan'
        await supabase
            .from("students")
            .update({
                status: "Sedang Mengerjakan",
                paket_aktif: activePackage,
                updated_at: new Date().toISOString()
            })
            .eq("nisn", nisn);

        return NextResponse.json({
            status: "success",
            student: {
                nisn: student.nisn,
                nama: student.nama,
                kelas: student.kelas,
                pilihan1: student.pilihan_kampus_1 || "",
                pilihan2: student.pilihan_kampus_2 || ""
            },
            session: {
                paket: activePackage,
                durasi_menit: durasiMenit,
                token: activeToken
            }
        });
    } catch (err: any) {
        return NextResponse.json(
            { status: "error", message: err.message || "Terjadi kesalahan server." },
            { status: 500 }
        );
    }
}
