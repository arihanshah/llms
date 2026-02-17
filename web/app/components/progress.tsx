interface Props {
  pagesFound: number;
  currentURL: string;
}

export function Progress({ pagesFound, currentURL }: Props) {
  return (
    <div className="mt-4" style={{ animation: "fadeIn 0.3s ease-out" }}>
      <div className="flex items-center gap-3 mb-2">
        <span
          className="text-accent text-sm font-mono font-medium"
          style={{ animation: "crawlPulse 1.2s ease-in-out infinite" }}
        >
          &gt;&gt;&gt;
        </span>
        <span className="text-sm text-text-secondary font-mono">
          Mapping... {pagesFound} page{pagesFound !== 1 ? "s" : ""} found
        </span>
      </div>
      {currentURL && (
        <p
          key={currentURL}
          className="text-xs text-text-tertiary truncate pl-10"
          style={{ animation: "fadeIn 0.2s ease-out" }}
        >
          {currentURL}
        </p>
      )}
      <div className="mt-3 h-px bg-border relative overflow-hidden">
        <div
          className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-accent/60 to-transparent"
          style={{ animation: "scanLine 2s ease-in-out infinite" }}
        />
      </div>
    </div>
  );
}
