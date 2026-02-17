"use client";

import { useState } from "react";
import { URLInput } from "./components/url-input";
import { Progress } from "./components/progress";
import { ResultDisplay } from "./components/result-display";

type AppState = "idle" | "crawling" | "done" | "error";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

const MAX_LIMIT = 75;

export default function Home() {
  const [state, setState] = useState<AppState>("idle");
  const [progress, setProgress] = useState({ pagesFound: 0, currentURL: "" });
  const [result, setResult] = useState("");
  const [pagesCrawled, setPagesCrawled] = useState(0);
  const [cached, setCached] = useState(false);
  const [error, setError] = useState("");
  const [maxPages, setMaxPages] = useState(50);
  const [maxPagesInput, setMaxPagesInput] = useState("50");
  const [maxDepth, setMaxDepth] = useState(3);
  const [maxDepthInput, setMaxDepthInput] = useState("3");
  const [outputFormat, setOutputFormat] = useState<"standard" | "full">("standard");
  const [excludePaths, setExcludePaths] = useState("");

  const clampMaxPages = (val: string) => {
    const n = parseInt(val, 10);
    if (isNaN(n) || n < 1) {
      setMaxPages(1);
      setMaxPagesInput("1");
    } else if (n > MAX_LIMIT) {
      setMaxPages(MAX_LIMIT);
      setMaxPagesInput(String(MAX_LIMIT));
    } else {
      setMaxPages(n);
      setMaxPagesInput(String(n));
    }
  };

  const clampMaxDepth = (val: string) => {
    const n = parseInt(val, 10);
    if (isNaN(n) || n < 1) {
      setMaxDepth(1);
      setMaxDepthInput("1");
    } else if (n > 5) {
      setMaxDepth(5);
      setMaxDepthInput("5");
    } else {
      setMaxDepth(n);
      setMaxDepthInput(String(n));
    }
  };

  const handleSubmit = (url: string) => {
    setState("crawling");
    setResult("");
    setError("");
    setProgress({ pagesFound: 0, currentURL: "" });

    let streamURL = `${API_BASE}/api/generate/stream?url=${encodeURIComponent(url)}&max_pages=${maxPages}&max_depth=${maxDepth}&format=${outputFormat}`;
    if (excludePaths.trim()) {
      streamURL += `&exclude=${encodeURIComponent(excludePaths.trim())}`;
    }
    const eventSource = new EventSource(streamURL);

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
          <h1 className="text-5xl font-semibold tracking-tight text-text">
            llms.txt
          </h1>
          <p className="text-2xl text-text-secondary mt-1">
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

        <div className="stagger-4 mt-4 rounded-lg border border-border bg-surface/50 overflow-hidden">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-2.5">
            {/* Max pages */}
            <div className="flex items-center gap-2">
              <label htmlFor="max-pages" className="text-xs text-text-tertiary">
                Max pages
              </label>
              <input
                id="max-pages"
                type="number"
                min={1}
                max={MAX_LIMIT}
                value={maxPagesInput}
                onChange={(e) => setMaxPagesInput(e.target.value)}
                onBlur={(e) => clampMaxPages(e.target.value)}
                disabled={state === "crawling"}
                className="w-14 bg-raised border border-border rounded px-2 py-1 text-xs font-mono text-text text-center focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
              />
              <span className="text-xs text-text-tertiary">/ {MAX_LIMIT}</span>
            </div>

            {/* Crawl depth */}
            <div className="flex items-center gap-2">
              <label htmlFor="max-depth" className="text-xs text-text-tertiary">
                Crawl depth
              </label>
              <input
                id="max-depth"
                type="number"
                min={1}
                max={5}
                value={maxDepthInput}
                onChange={(e) => setMaxDepthInput(e.target.value)}
                onBlur={(e) => clampMaxDepth(e.target.value)}
                disabled={state === "crawling"}
                className="w-14 bg-raised border border-border rounded px-2 py-1 text-xs font-mono text-text text-center focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
              />
              <span className="text-xs text-text-tertiary">/ 5</span>
            </div>

            {/* Output format toggle */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-tertiary">Output</span>
              <div className="flex rounded border border-border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOutputFormat("standard")}
                  disabled={state === "crawling"}
                  className={`px-2.5 py-1 text-xs font-mono transition-colors disabled:opacity-50 ${
                    outputFormat === "standard"
                      ? "bg-accent text-surface"
                      : "bg-raised text-text-secondary hover:bg-surface"
                  }`}
                >
                  llms.txt
                </button>
                <button
                  type="button"
                  onClick={() => setOutputFormat("full")}
                  disabled={state === "crawling"}
                  className={`px-2.5 py-1 text-xs font-mono border-l border-border transition-colors disabled:opacity-50 ${
                    outputFormat === "full"
                      ? "bg-accent text-surface"
                      : "bg-raised text-text-secondary hover:bg-surface"
                  }`}
                >
                  llms-full.txt
                </button>
              </div>
            </div>
          </div>

          {/* Exclude paths */}
          <div className="border-t border-border px-4 py-2.5">
            <div className="flex items-center gap-2">
              <label htmlFor="exclude-paths" className="text-xs text-text-tertiary whitespace-nowrap">
                Exclude paths
              </label>
              <input
                id="exclude-paths"
                type="text"
                value={excludePaths}
                onChange={(e) => setExcludePaths(e.target.value)}
                placeholder="e.g. /blog, /legal"
                disabled={state === "crawling"}
                className="flex-1 bg-raised border border-border rounded px-2 py-1 text-xs font-mono text-text placeholder:text-text-tertiary/50 focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        <div className="stagger-5 mt-5 mb-2">
          <div className="w-6 h-px bg-border-active" />
        </div>

        {state === "crawling" && <Progress {...progress} />}

        {state === "done" && (
          <div style={{ animation: "fadeInUp 0.4s ease-out" }}>
            <ResultDisplay
              content={result}
              pagesCrawled={pagesCrawled}
              cached={cached}
              format={outputFormat}
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
