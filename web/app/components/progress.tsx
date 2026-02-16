interface Props {
  pagesFound: number;
  currentURL: string;
}

export function Progress({ pagesFound, currentURL }: Props) {
  return (
    <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-4 w-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium">
          Crawling... {pagesFound} page{pagesFound !== 1 ? "s" : ""} found
        </span>
      </div>
      {currentURL && (
        <p className="text-xs text-gray-400 truncate pl-7">{currentURL}</p>
      )}
    </div>
  );
}
