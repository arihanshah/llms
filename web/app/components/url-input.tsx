"use client";

import { useState, FormEvent } from "react";

interface Props {
  onSubmit: (url: string) => void;
  disabled: boolean;
}

export function URLInput({ onSubmit, disabled }: Props) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("invalid protocol");
      }
      onSubmit(parsed.href);
    } catch {
      setError("Please enter a valid URL (e.g. https://example.com)");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="relative">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          className="w-full bg-surface border border-border rounded-lg pl-4 pr-28 py-3 text-sm text-text font-mono placeholder:text-text-tertiary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 focus:shadow-[0_0_12px_rgba(255,107,53,0.1)] transition-all disabled:opacity-50"
          disabled={disabled}
          required
        />
        <button
          type="submit"
          disabled={disabled}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-accent text-bg px-4 py-1.5 rounded-md text-sm font-medium font-mono hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          Generate
        </button>
      </div>
      {error && (
        <p className="text-error text-xs mt-2">{error}</p>
      )}
    </form>
  );
}
