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
Tugas: Format naskah mentah berikut agar seluruh notasi ilmiah, satuan berpangkat, variabel, dan rumus diapit tanda dollar tunggal ($...$).

ATURAN WAJIB:
1. Pangkat & notasi ilmiah:
   - 10⁻⁶ W/m² diubah menjadi $10^{-6}\\text{ W/m}^2$
   - 10⁻¹² W/m² diubah menjadi $10^{-12}\\text{ W/m}^2$
2. Satuan & Simbol:
   - m/s² diubah menjadi $\\text{m/s}^2$
   - I₀ atau I_0 diubah menjadi $I_0$
   - v₀ diubah menjadi $v_0$
   - θ = 60° diubah menjadi $\\theta = 60^\\circ$
3. Pertahankan struktur nomor soal, opsi A-E, dan Kunci jawaban.
4. JANGAN gunakan triple backtick (\`\`\`). Berikan HANYA teks bersih hasil format.

Naskah mentah:
${text}
`;

        // 1. Ambil daftar model yang didukung langsung oleh API Key Anda
        let selectedModelName = "models/gemini-1.5-flash";
        try {
            const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            const listData = await listRes.json();
            if (listData?.models && Array.isArray(listData.models)) {
                // Cari model yang mendukung generateContent
                const validModel = listData.models.find((m: any) =>
                    m.supportedGenerationMethods?.includes("generateContent") &&
                    (m.name.includes("flash") || m.name.includes("pro"))
                );
                if (validModel?.name) {
                    selectedModelName = validModel.name;
                }
            }
        } catch {
            // Fallback default jika list models gagal dijangkau
            selectedModelName = "models/gemini-1.5-flash";
        }

        // 2. Request generateContent ke model yang valid
        const cleanModelName = selectedModelName.replace(/^models\//, "");
        const generateUrl = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModelName}:generateContent?key=${apiKey}`;

        const response = await fetch(generateUrl, {
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
                { error: data.error?.message || `HTTP ${response.status}: Gagal memanggil API (${cleanModelName})` },
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