"use client";

import React, { useState } from "react";
import { UploadCloud, Trash2, Edit3, Send, RefreshCw, HelpCircle } from "lucide-react";

export interface StagedWordQuestion {
  id: string;
  no_soal: number;
  subtes_code: string;
  stimulus: string;
  image_url: string;
  image_position: "above" | "below";
  pertanyaan: string;
  opsi_a: string;
  opsi_b: string;
  opsi_c: string;
  opsi_d: string;
  opsi_e: string;
  kunci: string;
  tingkat_kesukaran: string;
  pembahasan: string;
}

interface WordDocxImporterProps {
  selectedSubtest: string;
  selectedPaket: string;
  currentCount: number;
  onBulkSubmitQuestions: (questions: StagedWordQuestion[]) => Promise<void>;
  isSubmittingServer: boolean;
  renderMath: (content: any) => React.ReactNode;
}

export default function WordDocxImporter({
  selectedSubtest,
  selectedPaket,
  currentCount,
  onBulkSubmitQuestions,
  isSubmittingServer,
  renderMath,
}: WordDocxImporterProps) {
  const [isParsing, setIsParsing] = useState(false);
  const [stagedList, setStagedList] = useState<StagedWordQuestion[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<StagedWordQuestion | null>(null);

  const handleDocxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    try {
      const mammothModule: any = await import("mammoth");
      const mammoth = mammothModule.default || mammothModule;
      const arrayBuffer = await file.arrayBuffer();

      const result = await mammoth.convertToHtml(
        { arrayBuffer },
        {
          convertImage: mammoth.images.inline((element: any) => {
            return element.read("base64").then((imageBuffer: any) => {
              return {
                src: `data:${element.contentType};base64,${imageBuffer}`,
              };
            });
          }),
        }
      );

      const parsed = parseHtmlElementsToQuestions(result.value, selectedSubtest, currentCount);
      if (parsed.length === 0) {
        alert("Tidak ada butir soal yang terbaca. Pastikan ada penomoran (1., 2.) dan opsi pilihan (A., B., C., D., E.).");
      } else {
        setStagedList(parsed);
      }
    } catch (err: any) {
      console.error(err);
      alert("Gagal membaca file .docx: " + (err?.message || "Format tidak valid"));
    } finally {
      setIsParsing(false);
      e.target.value = "";
    }
  };

  const parseHtmlElementsToQuestions = (
    html: string,
    defaultSub: string,
    startOffset: number
  ): StagedWordQuestion[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const elements = Array.from(doc.body.children);

    const questions: StagedWordQuestion[] = [];
    let current: Partial<StagedWordQuestion> = {
      subtes_code: defaultSub || "PU",
      image_position: "above",
      tingkat_kesukaran: "Sedang",
      kunci: "A",
    };

    let counter = 1;

    const commitCurrent = () => {
      if (current.pertanyaan || current.opsi_a) {
        questions.push({
          id: "word_" + Math.random().toString(36).substring(2, 9),
          no_soal: startOffset + counter,
          subtes_code: current.subtes_code || defaultSub || "PU",
          stimulus: current.stimulus || "",
          image_url: current.image_url || "",
          image_position: current.image_position || "above",
          pertanyaan: current.pertanyaan || "Pertanyaan belum terisi",
          opsi_a: current.opsi_a || "",
          opsi_b: current.opsi_b || "",
          opsi_c: current.opsi_c || "",
          opsi_d: current.opsi_d || "",
          opsi_e: current.opsi_e || "",
          kunci: current.kunci || "A",
          tingkat_kesukaran: current.tingkat_kesukaran || "Sedang",
          pembahasan: current.pembahasan || "",
        });
        counter++;
        current = {
          subtes_code: defaultSub || "PU",
          image_position: "above",
          tingkat_kesukaran: "Sedang",
          kunci: "A",
        };
      }
    };

    elements.forEach((el) => {
      const text = (el.textContent || "").trim();
      const img = el.querySelector("img");

      if (img && img.src) {
        current.image_url = img.src;
      }

      const qStartMatch = text.match(/^(?:\[SOAL\s*\d*\]|\d+[\.\)])\s*(.*)/i);
      if (qStartMatch && !/^[A-E][\.\)]/i.test(text)) {
        commitCurrent();
        current.pertanyaan = qStartMatch[1] || "";
        return;
      }

      const optMatch = text.match(/^([A-E])[\.\)]\s*(.*)/i);
      if (optMatch) {
        const char = optMatch[1].toUpperCase();
        const val = optMatch[2].trim();
        if (char === "A") current.opsi_a = val;
        if (char === "B") current.opsi_b = val;
        if (char === "C") current.opsi_c = val;
        if (char === "D") current.opsi_d = val;
        if (char === "E") current.opsi_e = val;
        return;
      }

      const keyMatch = text.match(/^(?:KUNCI(?:\s*JAWABAN)?|KUNCI)\s*[:=]\s*([A-E])/i);
      if (keyMatch) {
        current.kunci = keyMatch[1].toUpperCase();
        return;
      }

      const pbhMatch = text.match(/^PEMBAHASAN\s*[:=]\s*(.*)/i);
      if (pbhMatch) {
        current.pembahasan = pbhMatch[1].trim();
        return;
      }

      if (/^Wacana:\s*/i.test(text)) {
        current.stimulus = text.replace(/^Wacana:\s*/i, "").trim();
        return;
      }

      if (text.length > 0) {
        if (!current.pertanyaan) {
          current.pertanyaan = text;
        } else if (!current.opsi_a) {
          current.pertanyaan += "\n" + text;
        } else if (current.pembahasan !== undefined) {
          current.pembahasan += "\n" + text;
        }
      }
    });

    commitCurrent();
    return questions;
  };

  const startEdit = (item: StagedWordQuestion) => {
    setEditingId(item.id);
    setEditForm({ ...item });
  };

  const saveEdit = () => {
    if (!editForm) return;
    setStagedList((prev) =>
      prev.map((q) => (q.id === editForm.id ? { ...editForm } : q))
    );
    setEditingId(null);
    setEditForm(null);
  };

  const removeItem = (id: string) => {
    setStagedList((prev) => prev.filter((q) => q.id !== id));
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm text-left">
      <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
            Import Dokumen Word (.docx) &bull; Ekstraksi Massal + Gambar
          </h2>
          <p className="text-xs text-slate-500">
            Unggah satu berkas dokumen Word. Semua teks, gambar yang di-paste, opsi, dan kunci langsung terbaca otomatis ke area pratinjau.
          </p>
        </div>
      </div>

      <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 text-xs text-indigo-950 space-y-1.5">
        <div className="font-bold flex items-center gap-1.5 text-indigo-900">
          <HelpCircle className="w-4 h-4" />
          <span>Panduan Penulisan di Microsoft Word:</span>
        </div>
        <pre className="font-mono text-[11px] bg-white p-3 rounded-xl border border-indigo-200 text-slate-700 leading-relaxed overflow-x-auto">
{`1. Sebuah partikel bergerak harmonik sederhana dengan simpangan y = A sin(ωt).
(Tempelkan gambar langsung di sini jika ada)
A. Opsi pertama
B. Opsi kedua
C. Opsi ketiga
D. Opsi keempat
E. Opsi kelima
Kunci: B
Pembahasan: Menggunakan konsep simpangan maksimum.`}
        </pre>
      </div>

      <div className="border-2 border-dashed border-indigo-300 hover:border-indigo-600 bg-indigo-50/20 hover:bg-indigo-50/40 rounded-3xl p-8 text-center transition-all">
        <input
          type="file"
          id="docx-file-input"
          accept=".docx"
          onChange={handleDocxUpload}
          disabled={isParsing || isSubmittingServer}
          className="hidden"
        />
        <label
          htmlFor="docx-file-input"
          className="cursor-pointer flex flex-col items-center justify-center gap-3"
        >
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-xs">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">
              {isParsing ? "Sedang Mengekstrak Soal & Gambar..." : "Klik untuk Memilih Dokumen Word (.docx)"}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Target Paket: <strong>{selectedPaket.replace("_", " ")}</strong> &bull; Subtes Default: <strong>{selectedSubtest}</strong>
            </p>
          </div>
        </label>
      </div>

      {stagedList.length > 0 && (
        <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-xs font-mono">
                {stagedList.length} Soal Terbaca
              </span>
              <span className="text-xs text-slate-300">Siap disimpan ke {selectedPaket.replace("_", " ")}</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Periksa butir soal di bawah. Anda dapat mengedit teks/kunci secara instan tanpa perlu upload ulang berkas.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setStagedList([])}
              disabled={isSubmittingServer}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
            >
              Batalkan
            </button>
            <button
              type="button"
              onClick={() => onBulkSubmitQuestions(stagedList)}
              disabled={isSubmittingServer}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50 transition-all"
            >
              {isSubmittingServer ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan ke Server...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Simpan Semua ({stagedList.length} Soal)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {stagedList.length > 0 && (
        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
          {stagedList.map((q) => {
            const isEditing = editingId === q.id;

            if (isEditing && editForm) {
              return (
                <div key={q.id} className="p-5 rounded-2xl bg-white border-2 border-indigo-500 shadow-md space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b">
                    <span className="text-xs font-bold text-indigo-700 font-mono">
                      Edit Soal No. {q.no_soal}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={saveEdit}
                        className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-500"
                      >
                        Selesai Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEditingId(null); setEditForm(null); }}
                        className="px-3 py-1 bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                      >
                        Batal
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 font-mono block mb-1">PERTANYAAN:</label>
                    <textarea
                      rows={3}
                      value={editForm.pertanyaan}
                      onChange={(e) => setEditForm({ ...editForm, pertanyaan: e.target.value })}
                      className="w-full text-xs p-2.5 border rounded-xl outline-none focus:border-indigo-600"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(["a", "b", "c", "d", "e"] as const).map((letter) => (
                      <div key={letter} className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center font-mono font-bold text-[10px] border">
                          {letter.toUpperCase()}
                        </span>
                        <input
                          type="text"
                          value={(editForm as any)[`opsi_${letter}`]}
                          onChange={(e) =>
                            setEditForm({ ...editForm, [`opsi_${letter}`]: e.target.value })
                          }
                          className="flex-1 p-1.5 border rounded-lg text-xs"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 font-mono block mb-1">KUNCI JAWABAN:</label>
                      <select
                        value={editForm.kunci}
                        onChange={(e) => setEditForm({ ...editForm, kunci: e.target.value })}
                        className="w-full text-xs p-2 border rounded-xl font-bold bg-white"
                      >
                        {["A", "B", "C", "D", "E"].map((k) => (
                          <option key={k} value={k}>Opsi {k}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 font-mono block mb-1">PEMBAHASAN:</label>
                      <input
                        type="text"
                        value={editForm.pembahasan}
                        onChange={(e) => setEditForm({ ...editForm, pembahasan: e.target.value })}
                        className="w-full text-xs p-2 border rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={q.id} className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-[#1e3a8a] text-white font-mono font-bold text-[10px]">
                      NO. {q.no_soal}
                    </span>
                    <span className="font-semibold text-slate-700 text-[11px] font-mono">
                      Subtes: {q.subtes_code}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300 font-mono text-[10px] font-bold">
                      KUNCI: {q.kunci}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => startEdit(q)}
                      className="px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg flex items-center gap-1 transition-all"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(q.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {q.stimulus && (
                  <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed italic">
                    {renderMath(q.stimulus)}
                  </div>
                )}

                {q.image_url && (
                  <div className="p-2 bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center">
                    <img
                      src={q.image_url}
                      alt={`Gambar Soal No. ${q.no_soal}`}
                      className="max-h-56 max-w-full rounded-lg object-contain"
                    />
                    <span className="text-[10px] text-slate-400 mt-1">
                      Gambar diekstrak dari dokumen Word
                    </span>
                  </div>
                )}

                <div className="text-xs font-semibold text-slate-900 leading-relaxed">
                  {renderMath(q.pertanyaan)}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {[
                    { label: "A", text: q.opsi_a },
                    { label: "B", text: q.opsi_b },
                    { label: "C", text: q.opsi_c },
                    { label: "D", text: q.opsi_d },
                    { label: "E", text: q.opsi_e },
                  ].map((opt) => (
                    <div
                      key={opt.label}
                      className={`p-2 rounded-xl border text-xs flex items-center gap-2 ${
                        q.kunci === opt.label
                          ? "bg-emerald-50 border-emerald-400 font-bold text-emerald-950"
                          : "bg-white border-slate-200 text-slate-700"
                      }`}
                    >
                      <span className="font-mono font-bold">{opt.label}.</span>
                      <span>{renderMath(opt.text || "-")}</span>
                    </div>
                  ))}
                </div>

                {q.pembahasan && (
                  <div className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-100 text-[11px] text-blue-900">
                    <strong>Pembahasan: </strong>
                    {renderMath(q.pembahasan)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}