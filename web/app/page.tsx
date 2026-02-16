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
    <main className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight mb-1">
        llms.txt Generator
      </h1>
      <p className="text-gray-500 mb-8">
        Generate a spec-compliant{" "}
        <a
          href="https://llmstxt.org"
          className="underline hover:text-gray-700"
          target="_blank"
          rel="noopener noreferrer"
        >
          llms.txt
        </a>{" "}
        file for any website.
      </p>

      <URLInput onSubmit={handleSubmit} disabled={state === "crawling"} />

      {state === "crawling" && <Progress {...progress} />}

      {state === "done" && (
        <>
          <ResultDisplay
            content={result}
            pagesCrawled={pagesCrawled}
            cached={cached}
          />
          <button
            onClick={handleReset}
            className="mt-4 text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Generate another
          </button>
        </>
      )}

      {state === "error" && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={handleReset}
            className="mt-2 text-sm text-red-500 hover:text-red-700 underline"
          >
            Try again
          </button>
        </div>
      )}
    </main>
  );
}
