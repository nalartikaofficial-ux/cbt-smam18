import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const paket = (searchParams.get("paket") || "PAKET_1").toUpperCase();
        const subtes = searchParams.get("subtes");

        const filePath = path.join(process.cwd(), "data", `${paket.toLowerCase()}.json`);

        let questions: any[] = [];
        if (fs.existsSync(filePath)) {
            const fileData = fs.readFileSync(filePath, "utf-8");
            questions = JSON.parse(fileData || "[]");
        }

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

export async function POST(request: Request) {
    return NextResponse.json({
        status: "success",
        message: "Operasi soal statis aktif via repositori."
    });
}