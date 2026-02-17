"use client";

import { useState } from "react";
import { URLInput } from "./components/url-input";
import { Progress } from "./components/progress";
import { ResultDisplay } from "./components/result-display";

type AppState = "idle" | "crawling" | "done" | "error";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export default function Home() {
  const [state, setState] = useState<AppState>("idle");
  const [progress, setProgress] = useState({ pagesFound: 0, currentURL: "" });
  const [result, setResult] = useState("");
  const [pagesCrawled, setPagesCrawled] = useState(0);
  const [cached, setCached] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (url: string) => {
    setState("crawling");
    setResult("");
    setError("");
    setProgress({ pagesFound: 0, currentURL: "" });

    const eventSource = new EventSource(
      `${API_BASE}/api/generate/stream?url=${encodeURIComponent(url)}`
    );

    eventSource.addEventListener("progress", (e) => {
      const data = JSON.parse(e.data);
      setProgress({
        pagesFound: data.pages_found,
        currentURL: data.current_url,
      });
    });

    eventSource.addEventListener("complete", (e) => {
      const data = JSON.parse(e.data);
      setResult(data.result);
      setPagesCrawled(data.pages_crawled);
      setCached(data.cached || false);
      setState("done");
      eventSource.close();
    });

    eventSource.addEventListener("error", (e) => {
      const target = e as MessageEvent;
      if (target.data) {
        try {
          const data = JSON.parse(target.data);
          setError(data.message || "Something went wrong");
        } catch {
          setError("Connection lost. Please try again.");
        }
      } else {
        setError("Connection lost. Please try again.");
      }
      setState("error");
      eventSource.close();
    });
  };

  const handleReset = () => {
    setState("idle");
    setResult("");
    setError("");
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-xl lg:ml-[10vw]">
        <div className="stagger-1">
          <h1 className="font-serif not-italic text-5xl tracking-tight text-text">
            llms.txt
          </h1>
          <p className="text-2xl text-text-secondary font-mono mt-1">
            Generator
          </p>
        </div>

        <p className="stagger-2 text-sm text-text-tertiary mt-4 mb-8">
          Generate a spec-compliant{" "}
          <a
            href="https://llmstxt.org"
            className="text-text-secondary hover:text-accent transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            llms.txt
          </a>{" "}
          file for any website.
        </p>

        <div className="stagger-3">
          <URLInput onSubmit={handleSubmit} disabled={state === "crawling"} />
        </div>

        <div className="stagger-4 mt-6 mb-2">
          <div className="w-6 h-px bg-border-active" />
        </div>

        {state === "crawling" && <Progress {...progress} />}

        {state === "done" && (
          <div className="stagger-5">
            <ResultDisplay
              content={result}
              pagesCrawled={pagesCrawled}
              cached={cached}
            />
            <button
              onClick={handleReset}
              className="mt-4 text-sm text-text-tertiary hover:text-accent transition-colors"
            >
              Generate another
            </button>
          </div>
        )}

        {state === "error" && (
          <div
            className="mt-6 border-l-2 border-accent bg-raised/50 rounded-r-lg px-4 py-3"
            style={{ animation: "slideInFromLeft 0.3s ease-out" }}
          >
            <p className="text-sm text-error">{error}</p>
            <button
              onClick={handleReset}
              className="mt-2 text-sm text-text-tertiary hover:text-accent transition-colors"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
