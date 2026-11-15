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
            data: data || {
                id: 1,
                paket_aktif: "PAKET_1",
                nama_paket: "Simulasi Terstandarisasi SNBT 2026",
                token_resmi: "SM18UT",
                status_akses: "DIBUKA",
                durasi_menit: 195
            }
        });
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

        const payload = {
            id: 1,
            paket_aktif: body.paket_aktif || "PAKET_1",
            nama_paket: body.nama_paket || "Simulasi Terstandarisasi SNBT 2026",
            token_resmi: String(body.token_resmi || "SM18UT").toUpperCase(),
            status_akses: body.status_akses || "DIBUKA",
            waktu_mulai: body.waktu_mulai || null,
            waktu_selesai: body.waktu_selesai || null,
            updated_at: new Date().toISOString()
        };

        const { error } = await supabase
            .from("exam_sessions")
            .upsert(payload, { onConflict: "id" });

        if (error) throw error;
        return NextResponse.json({ status: "success", data: payload });
    } catch (err: any) {
        return NextResponse.json(
            { status: "error", message: err.message },
            { status: 500 }
        );
    }
}
