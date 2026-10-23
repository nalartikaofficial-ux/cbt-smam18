import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const text = body?.text;

        if (!text || !text.trim()) {
            return NextResponse.json({ error: "Teks soal kosong." }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: "Kunci GEMINI_API_KEY belum terpasang di Vercel/Environment." },
                { status: 500 }
            );
        }

        const promptInstruksi = `
Anda adalah sistem penata tipografi soal sains (Fisika, Matematika, Kimia) untuk aplikasi web berbasis KaTeX.
Tugas: Ambil naskah mentah berikut, ubah seluruh rumus, variabel berindeks, satuan berpangkat, dan notasi ilmiah menjadi LaTeX yang diapit tanda dollar tunggal ($...$).

ATURAN KETAT:
1. Pangkat & notasi ilmiah: 10⁻⁶ W/m² diubah menjadi $10^{-6}\\text{ W/m}^2$, 10⁻¹² W/m² diubah menjadi $10^{-12}\\text{ W/m}^2$.
2. Variabel & indeks: I₀ diubah menjadi $I_0$, v₀ diubah menjadi $v_0$, θ = 60° diubah menjadi $\\theta = 60^\\circ$.
3. Teks biasa dan kalimat narasi jangan diberi tanda dollar ($). Hanya rumus dan satuannya saja.
4. Opsi A-E dan kunci jawaban wajib dipertahankan urutan dan barisnya.
5. PENTING: DILARANG menggunakan pembungkus markdown seperti \`\`\` atau \`\`\`markdown. Berikan HANYA teks murni yang sudah rapi.

Naskah mentah:
${text}
`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptInstruksi }] }],
                generationConfig: {
                    temperature: 0.1
                }
            })
        });

        const data = await response.json();

        // Jika Google API mengembalikan pesan error (kuota, model, atau auth)
        if (!response.ok || data.error) {
            console.error("Gemini API Error:", data.error);
            return NextResponse.json(
                { error: data.error?.message || `HTTP ${response.status}: Gagal memanggil Gemini API` },
                { status: response.status || 500 }
            );
        }

        let rawOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

        // Bersihkan jika Gemini menyisipkan markdown block (```...```)
        rawOutput = rawOutput
            .replace(/^```[a-zA-Z]*\n?/gm, "")
            .replace(/```$/gm, "")
            .trim();

        if (!rawOutput) {
            return NextResponse.json({ error: "AI tidak menghasilkan keluaran teks." }, { status: 500 });
        }

        return NextResponse.json({ result: rawOutput });
    } catch (err: any) {
        console.error("Server Error:", err);
        return NextResponse.json({ error: err?.message || "Kesalahan internal server." }, { status: 500 });
    }
}