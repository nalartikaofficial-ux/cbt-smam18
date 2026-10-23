import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { text } = await req.json();

        if (!text || !text.trim()) {
            return NextResponse.json({ error: "Teks kosong" }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: "GEMINI_API_KEY belum disetel di .env.local atau Vercel" },
                { status: 500 }
            );
        }

        const systemPrompt = `
Anda adalah pakar tipografi soal eksakta (Fisika, Matematika, Kimia) untuk sistem CBT KaTeX.
Tugas Anda adalah merapikan naskah soal mentah hasil copy-paste Word.

ATURAN WAJIB FORMAT:
1. SEMUA ekspresi matematika, rumus, angka ber-satuan, variabel, dan eksponen di bagian WACANA, PERTANYAAN, DAN SELURUH OPSI A-E WAJIB DIAPIT TANDA DOLLAR TUNGGAL ($...$).
   - CONTOH SALAH PADA OPSI: A. 2.5 \\text{m/s}^{2}
   - CONTOH BENAR PADA OPSI: A. $2.5\\text{ m/s}^2$
   - CONTOH LAIN: $10^{-6}\\text{ W/m}^2$, $10^{-12}\\text{ W/m}^2$, $I_0$, $\\theta = 60^\\circ$, $m = 2\\text{ kg}$, $F = 10\\text{ N}$.
2. Jangan pernah menyisakan sintaks LaTeX seperti \\text{}, \\frac{}, \\sqrt{}, atau simbol ^ di luar tanda dollar ($).
3. Struktur naskah WAJIB presisi per baris:
   [Nomor]. Wacana: [Isi wacana jika ada, atau lewati jika tidak ada]
   [Teks pertanyaan dengan rumus berapit $]
   A. [Isi opsi A berapit $]
   B. [Isi opsi B berapit $]
   C. [Isi opsi C berapit $]
   D. [Isi opsi D berapit $]
   E. [Isi opsi E berapit $]
   Kunci: [A/B/C/D/E]
4. Jangan tambahkan kata pembuka/penutup dan jangan gunakan markdown code block (\`\`\`). Cukup keluarkan teks rapi hasil format.
`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            { text: systemPrompt },
                            { text: `Naskah mentah yang harus diformat:\n${text}` }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: 0.1
                }
            })
        });

        const data = await response.json();
        const formattedText = data?.candidates?.[0]?.content?.parts?.[0]?.text || text;

        return NextResponse.json({ result: formattedText.trim() });
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || "Gagal memproses AI" }, { status: 500 });
    }
}