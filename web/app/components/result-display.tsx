"use client";

import { useState } from "react";

interface Props {
  content: string;
  pagesCrawled: number;
  cached: boolean;
  format?: "standard" | "full";
}

export function ResultDisplay({ content, pagesCrawled, cached, format = "standard" }: Props) {
  const filename = format === "full" ? "llms-full.txt" : "llms.txt";
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="mt-6" style={{ animation: "fadeInUp 0.4s ease-out" }}>
      <div className="flex items-center justify-between bg-raised border border-border rounded-t-lg px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="text-sm text-accent font-mono font-medium">
            {filename}
          </span>
          <span className="text-xs text-text-tertiary font-mono">
            {pagesCrawled} pages{cached ? " · cached" : ""}
          </span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={handleCopy}
            className="px-3 py-1 text-xs font-mono text-text-secondary border border-transparent rounded hover:border-border-active hover:bg-surface transition-all"
          >
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={handleDownload}
            className="px-3 py-1 text-xs font-mono text-text-secondary border border-transparent rounded hover:border-border-active hover:bg-surface transition-all"
          >
            Download
          </button>
        </div>
      </div>
      <pre className="result-scroll bg-surface border border-t-0 border-border rounded-b-lg p-4 text-sm font-mono text-text-secondary overflow-auto max-h-96 whitespace-pre-wrap leading-relaxed">
        {content}
      </pre>
    </div>
  );
}
