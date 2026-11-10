import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Wajib agar Vercel Serverless TIDAK mencache respons API
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const paket = (searchParams.get("paket") || searchParams.get("package") || "PAKET_1").toUpperCase();
        const subtes = searchParams.get("subtes");

        const fileName = `${paket.toLowerCase()}.json`;
        const filePath = path.join(process.cwd(), "data", fileName);

        let questions: any[] = [];
        if (fs.existsSync(filePath)) {
            const fileData = fs.readFileSync(filePath, "utf-8");
            questions = JSON.parse(fileData || "[]");
        }

        // Filter subtes jika diminta spesifik oleh parameter
        if (subtes && subtes !== "ALL") {
            questions = questions.filter(
                (q: any) => (q.subtes_code || "").toUpperCase() === subtes.toUpperCase()
            );
        }

        return NextResponse.json(
            {
                status: "success",
                paket,
                total: questions.length,
                data: questions
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
        const body = await request.json();
        const { action, paket, questions, no_soal, subtes_code } = body;
        const targetPaket = (paket || "PAKET_1").toUpperCase();
        const fileName = `${targetPaket.toLowerCase()}.json`;
        const dirPath = path.join(process.cwd(), "data");
        const filePath = path.join(dirPath, fileName);

        // Pastikan folder data selalu ada
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }

        // 1. Kosongkan seluruh bank soal
        if (action === "clear_all_questions") {
            fs.writeFileSync(filePath, JSON.stringify([], null, 2), "utf-8");
            return NextResponse.json({ status: "success", message: `Seluruh butir soal ${targetPaket} berhasil dikosongkan.` });
        }

        // 2. Simpan naskah soal lengkap (Batch Upload)
        if (action === "bulk_upload_questions" && Array.isArray(questions)) {
            fs.writeFileSync(filePath, JSON.stringify(questions, null, 2), "utf-8");
            return NextResponse.json({
                status: "success",
                message: `Berhasil menyimpan ${questions.length} butir soal ke ${fileName}.`
            });
        }

        // 3. Hapus soal satuan jika admin menghapus 1 nomor
        if (action === "delete_question" && no_soal !== undefined) {
            if (fs.existsSync(filePath)) {
                const currentData: any[] = JSON.parse(fs.readFileSync(filePath, "utf-8") || "[]");
                const filtered = currentData.filter(
                    (q) => !(Number(q.no_soal) === Number(no_soal) && q.subtes_code === subtes_code)
                );
                fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2), "utf-8");
                return NextResponse.json({ status: "success", message: `Soal No. ${no_soal} (${subtes_code}) berhasil dihapus.` });
            }
        }

        return NextResponse.json({ status: "success", message: "OK" });
    } catch (err: any) {
        return NextResponse.json(
            { status: "error", message: err.message },
            { status: 500 }
        );
    }
}