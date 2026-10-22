"use client";

import React from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface MathRendererProps {
    text?: string;
    className?: string;
}

export default function MathRenderer({ text = "", className = "" }: MathRendererProps) {
    if (!text) return null;

    // Memisahkan teks berdasarkan delimiter $$ (block) dan $ (inline)
    const renderFormattedText = (raw: string) => {
        // Regex mendeteksi $$...$$ atau $...$
        const parts = raw.split(/(\$\$[\s\S]*?\$\$|\$[^\$]+?\$)/g);

        return parts.map((part, index) => {
            if (part.startsWith("$$") && part.endsWith("$$")) {
                const math = part.slice(2, -2);
                try {
                    const html = katex.renderToString(math, { displayMode: true, throwOnError: false });
                    return (
                        <span
                            key={index}
                            className="my-2 block text-center overflow-x-auto py-1"
                            dangerouslySetInnerHTML={{ __html: html }}
                        />
                    );
                } catch {
                    return <span key={index}>{part}</span>;
                }
            } else if (part.startsWith("$") && part.endsWith("$")) {
                const math = part.slice(1, -1);
                try {
                    const html = katex.renderToString(math, { displayMode: false, throwOnError: false });
                    return (
                        <span
                            key={index}
                            className="inline-block px-0.5 align-middle"
                            dangerouslySetInnerHTML={{ __html: html }}
                        />
                    );
                } catch {
                    return <span key={index}>{part}</span>;
                }
            }
            return <span key={index}>{part}</span>;
        });
    };

    return <span className={className}>{renderFormattedText(text)}</span>;
}