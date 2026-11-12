import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function loadBundledPackage(paket: string): any[] {
    try {
        if (paket === "PAKET_1") {
            const data = require("@/data/paket_1.json");
            return Array.isArray(data) ? data : [];
        }
        if (paket === "PAKET_2") {
            const data = require("@/data/paket_2.json");
            return Array.isArray(data) ? data : [];
        }
        if (paket === "PAKET_3") {
            const data = require("@/data/paket_3.json");
            return Array.isArray(data) ? data : [];
        }
    } catch {
        return [];
    }
    return [];
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const paket = (searchParams.get("paket") || searchParams.get("package") || "PAKET_1").toUpperCase();
        const subtes = searchParams.get("subtes");

        let questions: any[] = loadBundledPackage(paket);

        if (process.env.NODE_ENV === "development") {
            const fileName = `${paket.toLowerCase()}.json`;
            const filePath = path.join(process.cwd(), "data", fileName);
            if (fs.existsSync(filePath)) {
                const fileData = fs.readFileSync(filePath, "utf-8");
                const parsed = JSON.parse(fileData || "[]");
                if (Array.isArray(parsed) && parsed.length > 0) {
                    questions = parsed;
                }
            }
        }

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

        if (process.env.NODE_ENV === "development") {
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }

            if (action === "clear_all_questions") {
                fs.writeFileSync(filePath, JSON.stringify([], null, 2), "utf-8");
            } else if (action === "bulk_upload_questions" && Array.isArray(questions)) {
                fs.writeFileSync(filePath, JSON.stringify(questions, null, 2), "utf-8");
            } else if (action === "delete_question" && no_soal !== undefined && fs.existsSync(filePath)) {
                const currentData: any[] = JSON.parse(fs.readFileSync(filePath, "utf-8") || "[]");
                const filtered = currentData.filter(
                    (q) => !(Number(q.no_soal) === Number(no_soal) && q.subtes_code === subtes_code)
                );
                fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2), "utf-8");
            }
        }

        return NextResponse.json({
            status: "success",
            message: `Berhasil memproses ${action} pada ${fileName}.`
        });
    } catch (err: any) {
        return NextResponse.json(
            { status: "error", message: err.message },
            { status: 500 }
        );
    }
}