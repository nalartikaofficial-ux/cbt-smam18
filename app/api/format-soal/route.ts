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
Anda adalah asisten perapih naskah soal ujian eksakta (Fisika, Kimia, Matematika) untuk web CBT KaTeX.
Tugas Anda adalah membaca teks naskah soal mentah dari Word, lalu merapikannya agar siap dibaca oleh parser KaTeX.

ATURAN WAJIB:
1. UBAH SEMUA NOTASI FISIKA/MATEMATIKA MENJADI LATEX YANG DIAPIT TANDA DOLLAR TUNGGAL ($...$):
   - Pangkat/eksponen ilmiah: 10⁻⁶ W/m² atau 10^-6 W/m² -> $10^{-6}\\text{ W/m}^2$
   - Ambang/eksponen: 10⁻¹² W/m² -> $10^{-12}\\text{ W/m}^2$
   - Variabel subskrip: I₀ atau I_0 -> $I_0$, v₀ -> $v_0$
   - Simbol fisika: θ = 60° -> $\\theta = 60^\\circ$
   - Satuan kuadrat: m/s² -> $\\text{m/s}^2$
2. TANDA DOLLAR WAJIB BERPASANGAN ($...$). Jangan biarkan ada tanda $ yang terbuka tanpa penutup.
3. KATA-KATA BIASA JANGAN DIBUNGKUS DOLLAR:
   - "pada jarak tertentu" tetap teks biasa tanpa tanda $.
4. STRUKTUR FORMAT:
   - Jika belum ada penomoran di awal teks, tambahkan nomor "1. " di baris paling atas.
   - Pertahankan struktur baris opsi: A. ..., B. ..., C. ..., D. ..., E. ..., dan Kunci: ...
5. JANGAN gunakan markdown code block (\`\`\`). Keluarkan HANYA teks bersih hasil format.
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