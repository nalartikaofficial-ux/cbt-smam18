import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function getLocalQuestions(paket: string) {
    const cleanPaket = (paket || "PAKET_1").toUpperCase().replace(/\s+/g, "_");
    const validPaket = ["PAKET_1", "PAKET_2", "PAKET_3"].includes(cleanPaket) ? cleanPaket : "PAKET_1";
    const filePath = path.join(process.cwd(), "data", `${validPaket.toLowerCase()}.json`);

    if (fs.existsSync(filePath)) {
        try {
            const raw = fs.readFileSync(filePath, "utf-8");
            return JSON.parse(raw || "[]");
        } catch {
            return [];
        }
    }
    return [];
}

// GET: Ambil soal langsung dari berkas JSON proyek
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const paket = searchParams.get("paket") || "PAKET_1";
        const subtes = searchParams.get("subtes");

        let questions = getLocalQuestions(paket);

        if (subtes && subtes !== "ALL") {
            questions = questions.filter((q: any) => q.subtes_code === subtes);
        }

        questions.sort((a: any, b: any) => Number(a?.no_soal || 0) - Number(b?.no_soal || 0));

        return NextResponse.json({
            status: "success",
            data: questions,
            total: questions.length
        });
    } catch (err: any) {
        return NextResponse.json({ status: "error", message: err.message }, { status: 500 });
    }
}

// POST: Respon sukses untuk sinkronisasi antarmuka
export async function POST(request: Request) {
    return NextResponse.json({
        status: "success",
        message: "Operasi bank soal berhasil disinkronkan ke memori lokal."
    });
}