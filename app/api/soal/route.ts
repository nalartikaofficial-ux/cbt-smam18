import { NextResponse } from "next/server";

const GOOGLE_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbxz6Uh8sLvN4q1WCLDJSGwa6LpTdxcYvh_1kE0Ulpl9AaoExAJRCUB9Tjoh-6IHrlZgHA/exec";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const packageId = searchParams.get("package") || "PAKET_1";

        // Tarik data soal langsung dari Google Sheets
        const response = await fetch(
            `${GOOGLE_SCRIPT_URL}?action=get_questions&package=${packageId}`,
            { cache: "no-store" }
        );

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}