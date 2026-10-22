import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const scriptUrl = process.env.GOOGLE_SCRIPT_API_URL;

        if (!scriptUrl) {
            return NextResponse.json({ error: "URL Google Script belum diatur di .env.local" }, { status: 500 });
        }

        await fetch(scriptUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}