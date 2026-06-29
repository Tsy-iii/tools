import { ArrowDown, ArrowUp, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { preserveNativeEditingShortcuts } from "@/utils/editingShortcuts";
import type { SearchMode } from "@/utils/fieldSearch";

type SearchToolbarProps = {
  draftQuery: string;
  committedQuery: string;
  searchMode: SearchMode;
  matchCount: number;
  currentMatchIndex: number;
  onDraftQueryChange: (value: string) => void;
  onSearchSubmit: () => void;
  onSearchModeChange: (value: SearchMode) => void;
  onPrevious: () => void;
  onNext: () => void;
};

export default function SearchToolbar({
  draftQuery,
  committedQuery,
  searchMode,
  matchCount,
  currentMatchIndex,
  onDraftQueryChange,
  onSearchSubmit,
  onSearchModeChange,
  onPrevious,
  onNext,
}: SearchToolbarProps) {
  return (
    <section
      className="rounded-3xl border border-cyan-300/10 bg-slate-950/85 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.55)] backdrop-blur-xl"
      data-testid="search-toolbar-card"
    >
      <form
        className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
        onSubmit={(event) => {
          event.preventDefault();
          onSearchSubmit();
        }}
      >
        <div className="flex flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <Search className="h-4 w-4 text-cyan-200" />
          <input
            aria-label="字段搜索"
            className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
            placeholder="输入字段路径后按回车搜索，例如 requestId、payload.page、strategy.rules"
            value={draftQuery}
            onChange={(event) => onDraftQueryChange(event.target.value)}
            onKeyDownCapture={preserveNativeEditingShortcuts}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onSearchSubmit();
              }
            }}
          />
          <button
            className="shrink-0 rounded-xl bg-cyan-300 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-200"
            type="submit"
          >
            搜索
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-2xl border border-white/10 bg-white/5 p-1">
            <button
              className={cn(
                "rounded-xl px-3 py-2 text-xs transition",
                searchMode === "fuzzy" ? "bg-cyan-300 text-slate-950" : "text-slate-300 hover:bg-white/10",
              )}
              type="button"
              onClick={() => onSearchModeChange("fuzzy")}
            >
              模糊搜索
            </button>
            <button
              className={cn(
                "rounded-xl px-3 py-2 text-xs transition",
                searchMode === "exact" ? "bg-cyan-300 text-slate-950" : "text-slate-300 hover:bg-white/10",
              )}
              type="button"
              onClick={() => onSearchModeChange("exact")}
            >
              精确匹配
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-300">
            {!draftQuery.trim()
              ? "未开始搜索"
              : draftQuery !== committedQuery
                ? "按回车确认搜索"
                : `${matchCount === 0 ? 0 : currentMatchIndex + 1}/${matchCount}`}
          </div>

          <div className="flex items-center gap-2">
            <button
              className="rounded-2xl border border-white/10 bg-white/5 p-2 text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={matchCount === 0 || draftQuery !== committedQuery}
              type="button"
              onClick={onPrevious}
            >
              <ArrowUp className="h-4 w-4" />
            </button>
            <button
              className="rounded-2xl border border-white/10 bg-white/5 p-2 text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={matchCount === 0 || draftQuery !== committedQuery}
              type="button"
              onClick={onNext}
            >
              <ArrowDown className="h-4 w-4" />
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
