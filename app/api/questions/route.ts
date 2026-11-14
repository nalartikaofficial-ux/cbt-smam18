import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getSupabaseClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        throw new Error(
            "Konfigurasi NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum terpasang."
        );
    }

    return createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false }
    });
}

const SUBTEST_ORDER: Record<string, number> = {
    PU: 1,
    PPU: 2,
    PBM: 3,
    PK: 4,
    LIT_INDO: 5,
    LIT_ENG: 6,
    PM: 7
};

export async function GET(request: Request) {
    try {
        const supabase = getSupabaseClient();
        const { searchParams } = new URL(request.url);
        const paket = (
            searchParams.get("paket") ||
            searchParams.get("package") ||
            "PAKET_1"
        ).toUpperCase();
        const subtes = searchParams.get("subtes");

        let query = supabase
            .from("questions")
            .select("*")
            .eq("paket", paket)
            .order("no_soal", { ascending: true });

        if (subtes && subtes !== "ALL") {
            query = query.eq("subtes_code", subtes.toUpperCase());
        }

        const { data, error } = await query;

        if (error) {
            return NextResponse.json(
                { status: "error", message: error.message },
                { status: 500 }
            );
        }

        const sortedData = (data || []).sort((a: any, b: any) => {
            const orderA = SUBTEST_ORDER[(a.subtes_code || "").toUpperCase()] || 99;
            const orderB = SUBTEST_ORDER[(b.subtes_code || "").toUpperCase()] || 99;
            if (orderA !== orderB) return orderA - orderB;
            return Number(a.no_soal) - Number(b.no_soal);
        });

        return NextResponse.json(
            {
                status: "success",
                paket,
                total: sortedData.length,
                data: sortedData
            },
            {
                headers: {
                    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
                    "Pragma": "no-cache",
                    "Expires": "0"
                }
            }
        );
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
        const { action, paket, questions, no_soal, subtes_code } = body;
        const targetPaket = (paket || "PAKET_1").toUpperCase();

        // 1. Kosongkan seluruh bank soal pada paket tertentu
        if (action === "clear_all_questions") {
            const { error } = await supabase
                .from("questions")
                .delete()
                .eq("paket", targetPaket);

            if (error) throw error;

            return NextResponse.json({
                status: "success",
                message: `Seluruh butir soal ${targetPaket} berhasil dikosongkan dari Supabase.`
            });
        }

        // 2. Simpan / Gabungkan naskah soal (Upsert per paket + subtes + nomor soal)
        if (action === "bulk_upload_questions" && Array.isArray(questions)) {
            if (questions.length === 0) {
                return NextResponse.json({
                    status: "success",
                    message: "Tidak ada soal untuk disimpan."
                });
            }

            const rowsToUpsert = questions.map((q: any, idx: number) => ({
                paket: targetPaket,
                subtes_code: String(q.subtes_code || "PU").trim().toUpperCase(),
                no_soal: Number(q.no_soal) || idx + 1,
                stimulus: String(q.stimulus || ""),
                image_url: String(q.image_url || ""),
                image_position: q.image_position === "below" ? "below" : "above",
                pertanyaan: String(q.pertanyaan || "Pertanyaan"),
                opsi_a: String(q.opsi_a || ""),
                opsi_b: String(q.opsi_b || ""),
                opsi_c: String(q.opsi_c || ""),
                opsi_d: String(q.opsi_d || ""),
                opsi_e: String(q.opsi_e || ""),
                opsi_a_img: String(q.opsi_a_img || ""),
                opsi_b_img: String(q.opsi_b_img || ""),
                opsi_c_img: String(q.opsi_c_img || ""),
                opsi_d_img: String(q.opsi_d_img || ""),
                opsi_e_img: String(q.opsi_e_img || ""),
                kunci: String(q.kunci || "A").trim().toUpperCase(),
                tingkat_kesukaran: String(q.tingkat_kesukaran || "Sedang"),
                pembahasan: String(q.pembahasan || ""),
                author_guru: String(q.author_guru || ""),
                updated_at: new Date().toISOString()
            }));

            const { error } = await supabase
                .from("questions")
                .upsert(rowsToUpsert, {
                    onConflict: "paket,subtes_code,no_soal"
                });

            if (error) throw error;

            return NextResponse.json({
                status: "success",
                message: `Berhasil menyimpan ${rowsToUpsert.length} butir soal ke database Supabase (${targetPaket}).`
            });
        }

        // 3. Hapus soal satuan
        if (action === "delete_question" && no_soal !== undefined) {
            const { error } = await supabase
                .from("questions")
                .delete()
                .eq("paket", targetPaket)
                .eq("no_soal", Number(no_soal))
                .eq("subtes_code", String(subtes_code || "").toUpperCase());

            if (error) throw error;

            return NextResponse.json({
                status: "success",
                message: `Soal No. ${no_soal} (${subtes_code}) berhasil dihapus dari Supabase.`
            });
        }

        return NextResponse.json({ status: "success", message: "OK" });
    } catch (err: any) {
        return NextResponse.json(
            { status: "error", message: err.message },
            { status: 500 }
        );
    }
}