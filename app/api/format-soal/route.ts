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
Anda adalah asisten penata tipografi soal eksakta (Fisika, Matematika, Kimia) untuk web ujian CBT KaTeX.
Tugas Anda: Format naskah mentah berikut agar seluruh notasi ilmiah, satuan berpangkat, variabel, dan rumus diapit tanda dollar tunggal ($...$).

ATURAN WAJIB:
1. Pangkat & notasi ilmiah:
   - 10⁻⁶ W/m² atau 10^-6 W/m² diubah menjadi $10^{-6}\\text{ W/m}^2$
   - 10⁻¹² W/m² diubah menjadi $10^{-12}\\text{ W/m}^2$
2. Satuan & Simbol:
   - m/s² diubah menjadi $\\text{m/s}^2$
   - I₀ atau I_0 diubah menjadi $I_0$
   - v₀ diubah menjadi $v_0$
   - θ = 60° diubah menjadi $\\theta = 60^\\circ$
3. Pertahankan urutan nomor soal, baris opsi A, B, C, D, E, dan Kunci.
4. Teks narasi biasa jangan diberi tanda dollar ($).
5. DILARANG menggunakan pembungkus markdown block (\`\`\`). Berikan HANYA teks bersih siap pakai.

Naskah mentah:
${text}
`;

        // Gunakan model resmi yang diminta oleh Google API: gemini-3.8-flash
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;

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

        if (!response.ok || data.error) {
            return NextResponse.json(
                { error: data.error?.message || `HTTP ${response.status}: Gagal memanggil Gemini API` },
                { status: response.status || 500 }
            );
        }

        let rawOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

        rawOutput = rawOutput
            .replace(/^```[a-zA-Z]*\n?/gm, "")
            .replace(/```$/gm, "")
            .trim();

        if (!rawOutput) {
            return NextResponse.json({ error: "Hasil keluaran AI kosong." }, { status: 500 });
        }

        return NextResponse.json({ result: rawOutput });
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || "Kesalahan internal server." }, { status: 500 });
    }
}