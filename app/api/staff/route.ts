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

// Ambil seluruh akun staf/guru dari Supabase
export async function GET() {
    try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from("staff_users")
            .select("*")
            .order("created_at", { ascending: true });

        if (error) throw error;
        return NextResponse.json({ status: "success", data: data || [] });
    } catch (err: any) {
        return NextResponse.json(
            { status: "error", message: err.message },
            { status: 500 }
        );
    }
}

// Tambah atau hapus akun guru dari Supabase
export async function POST(request: Request) {
    try {
        const supabase = getSupabaseClient();
        const body = await request.json();
        const { action } = body;

        if (action === "add_user") {
            const payload = {
                username: String(body.username || "").trim().toLowerCase(),
                password: String(body.password || "").trim(),
                nama: String(body.nama || "").trim(),
                role: String(body.role || "guru").trim(),
                mapel: String(body.mapel || "Semua").trim()
            };

            const { error } = await supabase
                .from("staff_users")
                .upsert(payload, { onConflict: "username" });

            if (error) throw error;
            return NextResponse.json({ status: "success", data: payload });
        }

        if (action === "delete_user" && body.username) {
            const { error } = await supabase
                .from("staff_users")
                .delete()
                .eq("username", String(body.username).trim().toLowerCase());

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