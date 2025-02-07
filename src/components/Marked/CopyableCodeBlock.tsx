import { useState } from "react";

export function CopyableCodeBlock({ code, lang }) {
    const [copied, setCopied] = useState(false);

    function copyToClipboard() {
        navigator.clipboard.writeText(code).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000); // Reset après 2s
        });
    }

    return (
        <div className="relative group">
            <button
                onClick={copyToClipboard}
                className="absolute top-2 right-2 bg-gray-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition"
            >
                <div class="icon-copy"></div>
                {copied ? "✅ Copié !" : "📋 Copier"}
            </button>
            <pre className="bg-gray-900 text-white p-4 rounded">
                <code className={`language-${lang}`}>{code}</code>
            </pre>
        </div>
    );
}
