import { NextResponse } from "next/server";

// URL Master Google Apps Script Database
const GOOGLE_SCRIPT_API_URL =
    "https://script.google.com/macros/s/AKfycbxXeMuz-VXgbdUOESiOOLL5NlLrSMVfrdvOCwhgBbjLWwOy3ASkTjnWJSAIONFDrdY7hg/exec";

// GET: Ambil soal (Serverless Passthrough dengan Fallback)
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const paket = searchParams.get("paket") || "PAKET_1";
        const subtes = searchParams.get("subtes");

        const res = await fetch(
            `${GOOGLE_SCRIPT_API_URL}?action=get_questions&package=${paket}&paket=${paket}&_t=${Date.now()}`,
            { cache: "no-store" }
        );
        const text = await res.text();

        let questions: any[] = [];
        if (!text.trim().startsWith("<")) {
            const json = JSON.parse(text);
            if (json.status === "success" && Array.isArray(json.data)) {
                questions = json.data;
            }
        }

        if (subtes && subtes !== "ALL") {
            questions = questions.filter((q: any) => q.subtes_code === subtes);
        }

        questions.sort((a: any, b: any) => Number(a.no_soal) - Number(b.no_soal));

        return NextResponse.json({
            status: "success",
            data: questions,
            total: questions.length
        });
    } catch (err: any) {
        return NextResponse.json({ status: "error", message: err.message }, { status: 500 });
    }
}

// POST: Simpan soal
export async function POST(request: Request) {
    try {
        const body: any = await request.json();
        const { action, paket, questions } = body;
        const targetPaket = paket || "PAKET_1";

        const list = (questions || []).map((q: any) => ({
            paket: targetPaket,
            package: targetPaket,
            subtes_code: q.subtes_code || "PU",
            no_soal: Number(q.no_soal) || 0,
            stimulus: q.stimulus || "",
            image_url: q.image_url || "",
            image_position: q.image_position || "above",
            pertanyaan: q.pertanyaan || "",
            opsi_a: q.opsi_a || "",
            opsi_b: q.opsi_b || "",
            opsi_c: q.opsi_c || "",
            opsi_d: q.opsi_d || "",
            opsi_e: q.opsi_e || "",
            opsi_a_img: q.opsi_a_img || "",
            opsi_b_img: q.opsi_b_img || "",
            opsi_c_img: q.opsi_c_img || "",
            opsi_d_img: q.opsi_d_img || "",
            opsi_e_img: q.opsi_e_img || "",
            kunci: q.kunci || "A",
            tingkat_kesukaran: q.tingkat_kesukaran || "Sedang",
            pembahasan: q.pembahasan || "",
            author_guru: q.author_guru || ""
        }));

        // Sorting aman TypeScript
        list.sort((a: any, b: any) => Number(a?.no_soal || 0) - Number(b?.no_soal || 0));

        // Teruskan data ke Google Apps Script tanpa menyentuh disk lokal Vercel (mencegah EROFS)
        const forwardPayload = {
            action: action || "bulk_upload_questions",
            paket: targetPaket,
            package: targetPaket,
            questions: list
        };

        await fetch(GOOGLE_SCRIPT_API_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(forwardPayload)
        });

        return NextResponse.json({
            status: "success",
            message: `Berhasil menyimpan ${list.length} butir soal ke ${targetPaket}!`
        });
    } catch (err: any) {
        return NextResponse.json({ status: "error", message: err.message }, { status: 500 });
    }
}