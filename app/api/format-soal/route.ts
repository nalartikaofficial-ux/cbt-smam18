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
3. OPSI & KUNCI:
   - Jika opsi memuat satuan/rumus, apit dengan $: misal A. $40\\text{ dB}$ atau A. 40 dB jika angka biasa.
   - Pertahankan urutan naskah, baris opsi A, B, C, D, E, dan Kunci.
4. Jangan gunakan pembungkus markdown block (\`\`\`). Berikan HANYA teks bersih siap pakai.

Naskah mentah:
${text}
`;

        // Daftar model resmi Google yang didukung
        const candidateModels = [
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
            "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent",
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent"
        ];

        let resultText = "";
        let lastErrorMsg = "";

        for (const baseUrl of candidateModels) {
            try {
                const res = await fetch(`${baseUrl}?key=${apiKey}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: promptInstruksi }] }],
                        generationConfig: { temperature: 0.1 }
                    })
                });

                const data = await res.json();
                if (res.ok && data?.candidates?.[0]?.content?.parts?.[0]?.text) {
                    resultText = data.candidates[0].content.parts[0].text;
                    break; // Berhasil, keluar dari loop
                } else if (data.error) {
                    lastErrorMsg = data.error.message;
                }
            } catch (e: any) {
                lastErrorMsg = e.message;
            }
        }

        if (!resultText) {
            return NextResponse.json(
                { error: lastErrorMsg || "Model AI sedang tidak dapat dijangkau." },
                { status: 500 }
            );
        }

        // Bersihkan jika AI masih menyisipkan tag codeblock ```
        resultText = resultText
            .replace(/^```[a-zA-Z]*\n?/gm, "")
            .replace(/```$/gm, "")
            .trim();

        return NextResponse.json({ result: resultText });
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || "Kesalahan internal server." }, { status: 500 });
    }
}