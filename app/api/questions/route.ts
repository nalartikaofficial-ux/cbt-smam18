import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Helper penentu path file JSON sesuai paket
function getFilePath(paket: string) {
    const cleanPaket = (paket || "PAKET_1").toUpperCase().replace(/\s+/g, "_");
    const validPaket = ["PAKET_1", "PAKET_2", "PAKET_3"].includes(cleanPaket) ? cleanPaket : "PAKET_1";
    const dirPath = path.join(process.cwd(), "data");

    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }

    const filePath = path.join(dirPath, `${validPaket.toLowerCase()}.json`);
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify([], null, 2), "utf-8");
    }

    return filePath;
}

// GET: Membaca soal dari file JSON lokal
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const paket = searchParams.get("paket") || searchParams.get("package") || "PAKET_1";
        const subtes = searchParams.get("subtes");

        const filePath = getFilePath(paket);
        const rawData = fs.readFileSync(filePath, "utf-8");
        let questions = JSON.parse(rawData || "[]");

        if (subtes && subtes !== "ALL") {
            questions = questions.filter((q: any) => q.subtes_code === subtes);
        }

        // Urutkan berdasarkan nomor soal
        questions.sort((a: any, b: any) => Number(a.no_soal) - Number(b.no_soal));

        return NextResponse.json({
            status: "success",
            data: questions,
            total: questions.length
        });
    } catch (err: any) {
        return NextResponse.json({ status: "error", message: err.message }, { status: 500 });
    }
}

// POST: Menyimpan massal / satuan ke file JSON lokal
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { action, paket, questions, no_soal } = body;
        const targetPaket = paket || "PAKET_1";
        const filePath = getFilePath(targetPaket);

        const rawData = fs.readFileSync(filePath, "utf-8");
        let currentList: any[] = JSON.parse(rawData || "[]");

        // 1. Bulk Upload (dari Word atau CSV)
        if (action === "bulk_upload_questions" || Array.isArray(questions)) {
            const incoming: any[] = (questions || []).map((q: any) => ({
                paket: targetPaket,
                subtes_code: q.subtes_code || "PU",
                no_soal: Number(q.no_soal),
                stimulus: q.stimulus || "",
                image_url: q.image_url || "",
                image_position: q.image_position || "above",
                pertanyaan: q.pertanyaan,
                opsi_a: q.opsi_a || "",
                opsi_b: q.opsi_b || "",
                opsi_c: q.opsi_c || "",
                opsi_d: q.opsi_d || "",
                opsi_e: q.opsi_e || "",
                opsi_a_img: q.opsi_a_img || "",
                opsi_b_img: q.opsi_b_img || "",
                opsi_c_img: q.opsi_c_img || "",
                opsi_d_img: q.opsi_d_img || "",
                opsi_e_img: q.opsi_e_img || "",
                kunci: q.kunci || "A",
                tingkat_kesukaran: q.tingkat_kesukaran || "Sedang",
                pembahasan: q.pembahasan || "",
                author_guru: q.author_guru || ""
            }));

            // Hapus nomor yang sama bila ditimpa
            const newNumbers = new Set(incoming.map((i) => i.no_soal));
            currentList = currentList.filter((item) => !newNumbers.has(Number(item.no_soal)));
            currentList.push(...incoming);

            // Urutkan nomor soal
            currentList.sort((a, b) => Number(a.no_soal) - Number(b.no_soal));

            fs.writeFileSync(filePath, JSON.stringify(currentList, null, 2), "utf-8");

            return NextResponse.json({
                status: "success",
                message: `Berhasil menyimpan ${incoming.length} soal ke file JSON lokal (${targetPaket})!`
            });
        }

        // 2. Tambah / Edit 1 Soal
        if (action === "add_question" || action === "edit_question") {
            const item = {
                paket: targetPaket,
                subtes_code: body.subtes_code || "PU",
                no_soal: Number(body.no_soal),
                stimulus: body.stimulus || "",
                image_url: body.image_url || "",
                image_position: body.image_position || "above",
                pertanyaan: body.pertanyaan,
                opsi_a: body.opsi_a || "",
                opsi_b: body.opsi_b || "",
                opsi_c: body.opsi_c || "",
                opsi_d: body.opsi_d || "",
                opsi_e: body.opsi_e || "",
                opsi_a_img: body.opsi_a_img || "",
                opsi_b_img: body.opsi_b_img || "",
                opsi_c_img: body.opsi_c_img || "",
                opsi_d_img: body.opsi_d_img || "",
                opsi_e_img: body.opsi_e_img || "",
                kunci: body.kunci || "A",
                tingkat_kesukaran: body.tingkat_kesukaran || "Sedang",
                pembahasan: body.pembahasan || "",
                author_guru: body.author_guru || ""
            };

            const existingIdx = currentList.findIndex((q) => Number(q.no_soal) === item.no_soal);
            if (existingIdx !== -1) {
                currentList[existingIdx] = item;
            } else {
                currentList.push(item);
            }

            currentList.sort((a, b) => Number(a.no_soal) - Number(b.no_soal));
            fs.writeFileSync(filePath, JSON.stringify(currentList, null, 2), "utf-8");

            return NextResponse.json({ status: "success", message: `Soal No. ${item.no_soal} berhasil diperbarui di JSON lokal.` });
        }

        // 3. Hapus 1 Soal
        if (action === "delete_question") {
            currentList = currentList.filter((q) => Number(q.no_soal) !== Number(no_soal));
            fs.writeFileSync(filePath, JSON.stringify(currentList, null, 2), "utf-8");
            return NextResponse.json({ status: "success", message: `Soal No. ${no_soal} berhasil dihapus dari JSON lokal.` });
        }

        return NextResponse.json({ status: "error", message: "Aksi tidak dikenal" }, { status: 400 });
    } catch (err: any) {
        return NextResponse.json({ status: "error", message: err.message }, { status: 500 });
    }
}