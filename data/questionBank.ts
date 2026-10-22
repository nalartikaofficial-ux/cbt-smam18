export interface SubtestMeta {
    code: "PU" | "PPU" | "PBM" | "PK" | "LIT_INDO" | "LIT_ENG" | "PM";
    name: string;
    category: "Tes Potensi Skolastik" | "Literasi" | "Penalaran";
    questionCount: number;
    durationMinutes: number;
}

export interface QuestionItem {
    id: number;
    subtestCode: "PU" | "PPU" | "PBM" | "PK" | "LIT_INDO" | "LIT_ENG" | "PM";
    subtestName: string;
    stimulus?: string;
    question: string;
    options: { id: string; text: string }[];
    correctAnswer: string;
    // Parameter IRT 3PL untuk kalibrasi SNBT
    irtParams?: {
        a: number; // Daya pembeda (discrimination)
        b: number; // Tingkat kesukaran (difficulty)
        c: number; // Tebakan semu (pseudo-guessing)
    };
}

export interface ExamPackage {
    packageId: "PAKET_1" | "PAKET_2" | "PAKET_3";
    title: string;
    description: string;
    subtests: SubtestMeta[];
    questions: QuestionItem[];
}

export const OFFICIAL_SUBTESTS: SubtestMeta[] = [
    { code: "PU", name: "Penalaran Umum", category: "Tes Potensi Skolastik", questionCount: 30, durationMinutes: 30 },
    { code: "PPU", name: "Pengetahuan & Pemahaman Umum", category: "Tes Potensi Skolastik", questionCount: 20, durationMinutes: 15 },
    { code: "PBM", name: "Pemahaman Bacaan & Menulis", category: "Tes Potensi Skolastik", questionCount: 20, durationMinutes: 25 },
    { code: "PK", name: "Pengetahuan Kuantitatif", category: "Tes Potensi Skolastik", questionCount: 15, durationMinutes: 20 },
    { code: "LIT_INDO", name: "Literasi Bahasa Indonesia", category: "Literasi", questionCount: 25, durationMinutes: 45 },
    { code: "LIT_ENG", name: "Literasi Bahasa Inggris", category: "Literasi", questionCount: 15, durationMinutes: 30 },
    { code: "PM", name: "Penalaran Matematika", category: "Penalaran", questionCount: 20, durationMinutes: 30 },
];