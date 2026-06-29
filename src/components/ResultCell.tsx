import { cn } from "@/lib/utils";
import { getLeafFieldPath } from "@/utils/fieldDisplayPath";
import { getHighlightRange, type SearchMode } from "@/utils/fieldSearch";
import type { DiffRow, DiffStatus } from "@/utils/jsonDiff";

type ResultCellProps = {
  side: "left" | "right";
  row: DiffRow;
  searchQuery: string;
  searchMode: SearchMode;
  isSearchMatch: boolean;
  isCurrentMatch: boolean;
  showLeafFieldOnly: boolean;
};

const statusClassMap: Record<DiffStatus, string> = {
  same: "border-white/10 bg-slate-950/60",
  changed: "border-amber-300/40 bg-amber-300/12",
  "missing-left": "border-rose-300/45 bg-rose-300/12",
  "missing-right": "border-rose-300/45 bg-rose-300/12",
  "type-changed": "border-fuchsia-300/45 bg-fuchsia-300/12",
};

function renderHighlightedPath(path: string, query: string, mode: SearchMode, showLeafFieldOnly: boolean) {
  const displayPath = showLeafFieldOnly ? getLeafFieldPath(path) : path;
  const highlightRange = getHighlightRange(displayPath, query, mode);
  const content = !highlightRange ? (
    displayPath
  ) : (
    <>
      {displayPath.slice(0, highlightRange[0])}
      <mark className="rounded bg-cyan-300/25 px-1 text-cyan-100">
        {displayPath.slice(highlightRange[0], highlightRange[1])}
      </mark>
      {displayPath.slice(highlightRange[1])}
    </>
  );

  return (
    <span key={displayPath} className="field-path-transition inline-block">
      {content}
    </span>
  );
}

export default function ResultCell({
  side,
  row,
  searchQuery,
  searchMode,
  isSearchMatch,
  isCurrentMatch,
  showLeafFieldOnly,
}: ResultCellProps) {
  const value = side === "left" ? row.leftDisplay : row.rightDisplay;
  const type = side === "left" ? row.leftType : row.rightType;

  return (
    <article
      className={cn(
        "rounded-2xl border p-4 transition",
        statusClassMap[row.status],
        isSearchMatch && "shadow-[0_0_0_1px_rgba(34,211,238,0.4)]",
        isCurrentMatch && "border-cyan-300/70 bg-cyan-300/10",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{side === "left" ? "左侧字段" : "右侧字段"}</p>
          <p className="mt-2 break-all font-mono text-[13px] font-semibold text-slate-100">
            {renderHighlightedPath(row.path, searchQuery, searchMode, showLeafFieldOnly)}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-1 font-mono text-[11px] text-slate-300">
          {type}
        </span>
      </div>

      <pre className="mt-4 overflow-x-auto whitespace-pre-wrap break-words rounded-xl border border-black/10 bg-black/20 px-3 py-3 font-mono text-[12px] leading-6 text-slate-100">
        {value}
      </pre>
    </article>
  );
}
