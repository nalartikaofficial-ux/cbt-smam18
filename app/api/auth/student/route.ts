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

        // 1. Tambah 1 peserta baru dari panel Proktor
        if (action === "add_student") {
            const cleanNisn = String(body.nisn || "").replace(/\D/g, "").trim();
            const { error } = await supabase.from("students").upsert(
                {
                    nisn: cleanNisn,
                    nama: String(body.nama || "").trim(),
                    kelas: String(body.kelas || "XII").trim().toUpperCase(),
                    status: "Belum Hadir",
                    violations: 0,
                    score: 0,
                    updated_at: new Date().toISOString()
                },
                { onConflict: "nisn" }
            );
            if (error) throw error;
            return NextResponse.json({ status: "success" });
        }

        // 2. Import massal peserta (Salin-tempel Excel / CSV)
        if ((action === "bulk_upsert_students" || action === "bulk_add_students") && Array.isArray(students)) {
            const rows = students
                .map((s: any) => ({
                    nisn: String(s.nisn || "").replace(/\D/g, "").trim(),
                    nama: String(s.nama || s.nama_siswa || "").trim(),
                    kelas: String(s.kelas || "XII").trim().toUpperCase(),
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
                .filter((s: any) => s.nisn !== "" && s.nama !== "");

            const { error } = await supabase
                .from("students")
                .upsert(rows, { onConflict: "nisn" });

            if (error) throw error;
            return NextResponse.json({
                status: "success",
                message: `${rows.length} data peserta berhasil disimpan ke Supabase.`
            });
        }

        // 3. Edit biodata peserta (NISN / Nama / Kelas)
        if (action === "edit_student") {
            const oldNisn = String(body.old_nisn || "").trim();
            const newNisn = String(body.nisn || "").replace(/\D/g, "").trim();
            const nama = String(body.nama || "").trim();
            const kelas = String(body.kelas || "").trim().toUpperCase();

            if (oldNisn && oldNisn !== newNisn) {
                await supabase.from("students").delete().eq("nisn", oldNisn);
                const { error } = await supabase.from("students").insert({
                    nisn: newNisn,
                    nama,
                    kelas,
                    updated_at: new Date().toISOString()
                });
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from("students")
                    .update({ nama, kelas, updated_at: new Date().toISOString() })
                    .eq("nisn", newNisn);
                if (error) throw error;
            }
            return NextResponse.json({ status: "success" });
        }

        // 4. Hapus peserta
        if (action === "delete_student" && nisn) {
            const { error } = await supabase
                .from("students")
                .delete()
                .eq("nisn", String(nisn).trim());
            if (error) throw error;
            return NextResponse.json({ status: "success" });
        }

        // 5. Buka akses pengerjaan (lanjut ujian setelah terkunci kiosk)
        if (action === "unlock_student" && nisn) {
            const { error } = await supabase
                .from("students")
                .update({ status: "Sedang Mengerjakan", updated_at: new Date().toISOString() })
                .eq("nisn", String(nisn).trim());
            if (error) throw error;
            return NextResponse.json({ status: "success" });
        }

        // 6. Blokir / kunci bilik siswa secara manual oleh pengawas
        if (action === "block_student" && nisn) {
            const { error } = await supabase
                .from("students")
                .update({ status: "Terkunci", updated_at: new Date().toISOString() })
                .eq("nisn", String(nisn).trim());
            if (error) throw error;
            return NextResponse.json({ status: "success" });
        }

        // 7. Reset status peserta ke Belum Hadir (untuk persiapan TO berikutnya; riwayat di exam_attempts tetap aman)
        if (action === "reset_status" && nisn) {
            const { error } = await supabase
                .from("students")
                .update({
                    status: "Belum Hadir",
                    violations: 0,
                    score: 0,
                    nilai_tps: 0,
                    nilai_literasi: 0,
                    skor_pu: 0,
                    skor_ppu: 0,
                    skor_pbm: 0,
                    skor_pk: 0,
                    skor_lit_indo: 0,
                    skor_lit_eng: 0,
                    skor_pm: 0,
                    benar: 0,
                    salah: 0,
                    kosong: 0,
                    waktu_mulai: "-",
                    waktu_selesai: "-",
                    updated_at: new Date().toISOString()
                })
                .eq("nisn", String(nisn).trim());
            if (error) throw error;
            return NextResponse.json({ status: "success" });
        }

        // 8. Simpan target pilihan kampus sebelum mulai ujian
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

        // 9. Laporkan pelanggaran layar penuh / pindah tab
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

        // 10. Simpan hasil akhir ujian ke students + exam_attempts + backup Google Sheets
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

            const { error } = await supabase
                .from("students")
                .upsert(payload, { onConflict: "nisn" });

            if (error) throw error;

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

        // 11. Update status parsial umum
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