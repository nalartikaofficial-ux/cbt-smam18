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
Anda adalah asisten pakar kurikulum dan tipografi soal eksakta (Fisika, Matematika, Kimia).
Tugas Anda adalah merapikan naskah soal mentah hasil copy-paste Word agar siap diproses sistem CBT KaTeX.

Aturan Wajib:
1. Setiap rumus, angka eksponen, variabel, dan satuan fisika WAJIB dibungkus tanda dolar tunggal ($...$).
   Contoh salah: $10^-6$ W/m^2 atau $10^{-6}$ W/m^{2}
   Contoh benar: $10^{-6}\\text{ W/m}^2$
2. Variabel berindeks wajib format subscript: $I_0$, $v_0$, $a_t$.
3. Huruf Yunani wajib format LaTeX: $\\theta$, $\\alpha$, $\\lambda$, $\\mu$, $\\pi$, $\\omega$.
4. Pecahan matematika wajib format LaTeX: $\\frac{a}{b}$.
5. Pastikan struktur naskah tetap memiliki penomoran rapi:
   [Nomor]. [Pertanyaan lengkap dengan rumus $...$]
   A. [Teks/rumus opsi A]
   B. [Teks/rumus opsi B]
   C. [Teks/rumus opsi C]
   D. [Teks/rumus opsi D]
   E. [Teks/rumus opsi E]
   Kunci: [A/B/C/D/E]
   (Jika ada wacana/stimulus, awali dengan "Wacana: ...", jika ada link gambar, awali dengan "Gambar: ...")
6. HANYA keluarkan hasil teks soal yang sudah dirapikan, TANPA kata pengantar, TANPA markdown code block (\`\`\`).
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
                            { text: `Naskah mentah:\n${text}` }
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