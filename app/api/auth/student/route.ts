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

const GAS_WEBHOOK_URL = process.env.NEXT_PUBLIC_GAS_URL || "";

export async function GET(request: Request) {
    try {
        const supabase = getSupabaseClient();
        const { searchParams } = new URL(request.url);
        const nisn = searchParams.get("nisn");
        const withHistory = searchParams.get("history") === "true";

        if (nisn) {
            const { data: student, error } = await supabase
                .from("students")
                .select("*")
                .eq("nisn", nisn.trim())
                .maybeSingle();

            if (error) throw error;

            if (withHistory) {
                const { data: attempts } = await supabase
                    .from("exam_attempts")
                    .select("*")
                    .eq("nisn", nisn.trim())
                    .order("completed_at", { ascending: true });

                return NextResponse.json({
                    status: "success",
                    data: student,
                    attempts: attempts || []
                });
            }

            return NextResponse.json({ status: "success", data: student });
        }

        const { data, error } = await supabase
            .from("students")
            .select("*")
            .order("kelas", { ascending: true })
            .order("nama", { ascending: true });

        if (error) throw error;

        if (withHistory) {
            const { data: attempts } = await supabase
                .from("exam_attempts")
                .select("*")
                .order("completed_at", { ascending: true });

            return NextResponse.json({
                status: "success",
                data: data || [],
                attempts: attempts || []
            });
        }

        return NextResponse.json({ status: "success", data: data || [] });
    } catch (err: any) {
        return NextResponse.json(
            { status: "error", message: err.message },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const supabase = getSupabaseClient();
        const body = await request.json();
        const { action, student, students, nisn, updates } = body;

        // 1. Import massal peserta
        if (action === "bulk_upsert_students" && Array.isArray(students)) {
            const rows = students
                .map((s: any) => ({
                    nisn: String(s.nisn || "").trim(),
                    nama: String(s.nama || s.nama_siswa || "").trim(),
                    kelas: String(s.kelas || "").trim(),
                    sesi_aktif: String(s.sesi_aktif || "Sesi 1").trim(),
                    status: String(s.status || s.status_ujian || "Belum Hadir").trim(),
                    token_proktor: String(s.token_proktor || "").trim(),
                    violations: Number(s.violations ?? s.pelanggaran ?? 0),
                    score: Number(s.score ?? s.skor_irt ?? 0),
                    waktu_selesai: String(s.waktu_selesai || "-").trim(),
                    pilihan_kampus_1: String(s.pilihan_kampus_1 || "").trim(),
                    pilihan_kampus_2: String(s.pilihan_kampus_2 || "").trim(),
                    updated_at: new Date().toISOString()
                }))
                .filter((s: any) => s.nisn !== "");

            const { error } = await supabase
                .from("students")
                .upsert(rows, { onConflict: "nisn" });

            if (error) throw error;
            return NextResponse.json({
                status: "success",
                message: `${rows.length} data peserta berhasil disimpan ke Supabase.`
            });
        }

        // 2. Simpan target pilihan kampus sebelum mulai ujian
        if (action === "save_student_target" && nisn) {
            const { error } = await supabase
                .from("students")
                .update({
                    pilihan_kampus_1: String(body.pilihan_kampus_1 || ""),
                    pilihan_kampus_2: String(body.pilihan_kampus_2 || ""),
                    updated_at: new Date().toISOString()
                })
                .eq("nisn", String(nisn).trim());

            if (error) throw error;
            return NextResponse.json({ status: "success" });
        }

        // 3. Laporkan pelanggaran layar penuh / pindah tab
        if (action === "report_kiosk_lock" && nisn) {
            const vCount = Number(body.violations || 1);
            const nextStatus = vCount >= 3 ? "Terkunci" : "Sedang Mengerjakan";

            const { error } = await supabase
                .from("students")
                .update({
                    violations: vCount,
                    status: nextStatus,
                    updated_at: new Date().toISOString()
                })
                .eq("nisn", String(nisn).trim());

            if (error) throw error;
            return NextResponse.json({ status: "success" });
        }

        // 4. Simpan hasil akhir ujian ke students + exam_attempts + backup Google Sheets
        if (action === "finish_exam" && student?.nisn) {
            const cleanNisn = String(student.nisn).trim();
            const payload = {
                nisn: cleanNisn,
                nama: String(student.nama || "-").trim(),
                kelas: String(student.kelas || "XII").trim(),
                paket_aktif: String(student.paket || "PAKET_1").toUpperCase(),
                status: "Selesai",
                violations: Number(student.violations ?? 0),
                score: Number(student.score ?? 200),
                nilai_tps: Number(student.nilai_tps ?? 200),
                nilai_literasi: Number(student.nilai_literasi ?? 200),
                skor_pu: Number(student.skor_pu ?? 200),
                skor_ppu: Number(student.skor_ppu ?? 200),
                skor_pbm: Number(student.skor_pbm ?? 200),
                skor_pk: Number(student.skor_pk ?? 200),
                skor_lit_indo: Number(student.skor_lit_indo ?? 200),
                skor_lit_eng: Number(student.skor_lit_eng ?? 200),
                skor_pm: Number(student.skor_pm ?? 200),
                benar: Number(student.benar ?? 0),
                salah: Number(student.salah ?? 0),
                kosong: Number(student.kosong ?? 0),
                pilihan_kampus_1: String(student.pilihan_kampus_1 || ""),
                pilihan_kampus_2: String(student.pilihan_kampus_2 || ""),
                waktu_mulai: String(student.waktu_mulai || "-"),
                waktu_selesai: String(student.waktu_selesai || "-"),
                updated_at: new Date().toISOString()
            };

            // Simpan status terkini di tabel students
            const { error } = await supabase
                .from("students")
                .upsert(payload, { onConflict: "nisn" });

            if (error) throw error;

            // Simpan jejak historis ke tabel exam_attempts untuk perbandingan TO-1, TO-2, dst.
            await supabase.from("exam_attempts").insert({
                nisn: payload.nisn,
                nama: payload.nama,
                kelas: payload.kelas,
                paket: payload.paket_aktif,
                score: payload.score,
                nilai_tps: payload.nilai_tps,
                nilai_literasi: payload.nilai_literasi,
                skor_pu: payload.skor_pu,
                skor_ppu: payload.skor_ppu,
                skor_pbm: payload.skor_pbm,
                skor_pk: payload.skor_pk,
                skor_lit_indo: payload.skor_lit_indo,
                skor_lit_eng: payload.skor_lit_eng,
                skor_pm: payload.skor_pm,
                benar: payload.benar,
                salah: payload.salah,
                kosong: payload.kosong,
                violations: payload.violations,
                pilihan_kampus_1: payload.pilihan_kampus_1,
                pilihan_kampus_2: payload.pilihan_kampus_2,
                waktu_mulai: payload.waktu_mulai,
                waktu_selesai: payload.waktu_selesai
            });

            // Backup otomatis ke Google Sheets jika URL tersedia
            if (GAS_WEBHOOK_URL) {
                fetch(GAS_WEBHOOK_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        action: "update_student_status",
                        nisn: payload.nisn,
                        nama_siswa: payload.nama,
                        kelas: payload.kelas,
                        paket: payload.paket_aktif,
                        status: "Selesai",
                        nilai_total: payload.score,
                        skor_irt: payload.score,
                        pelanggaran: payload.violations,
                        waktu_selesai: payload.waktu_selesai,
                        pilihan_kampus_1: payload.pilihan_kampus_1,
                        pilihan_kampus_2: payload.pilihan_kampus_2
                    })
                }).catch(() => { });
            }

            return NextResponse.json({ status: "success", data: payload });
        }

        // 5. Update status manual oleh Proktor
        if (action === "update_status" && nisn && updates) {
            const { error } = await supabase
                .from("students")
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq("nisn", String(nisn).trim());

            if (error) throw error;
            return NextResponse.json({ status: "success" });
        }

        return NextResponse.json({ status: "success" });
    } catch (err: any) {
        return NextResponse.json(
            { status: "error", message: err.message },
            { status: 500 }
        );
    }
}