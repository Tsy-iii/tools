import { useEffect, useRef } from "react";
import { AlertCircle, ArrowLeftRight, FileJson2 } from "lucide-react";

import ResultCell from "@/components/ResultCell";
import type { SearchMode } from "@/utils/fieldSearch";
import type { DiffRow } from "@/utils/jsonDiff";

type DiffResultsProps = {
  rows: DiffRow[];
  hasCompared: boolean;
  showOnlyDiff: boolean;
  leftPanelName: string;
  rightPanelName: string;
  searchQuery: string;
  searchMode: SearchMode;
  matchedPaths: string[];
  activeMatchPath?: string;
  showLeafFieldOnly: boolean;
};

export default function DiffResults({
  rows,
  hasCompared,
  showOnlyDiff,
  leftPanelName,
  rightPanelName,
  searchQuery,
  searchMode,
  matchedPaths,
  activeMatchPath,
  showLeafFieldOnly,
}: DiffResultsProps) {
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!activeMatchPath) {
      return;
    }

    const activeNode = rowRefs.current[activeMatchPath];

    if (!activeNode || typeof activeNode.scrollIntoView !== "function") {
      return;
    }

    activeNode.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [activeMatchPath]);

  if (!hasCompared) {
    return (
      <section className="rounded-3xl border border-white/10 bg-slate-950/70 p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.45)] backdrop-blur">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-200">
          <ArrowLeftRight className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-sm font-semibold text-slate-100">等待开始对比</h2>
        <p className="mt-2 text-sm text-slate-400">在左右两侧粘贴 JSON，点击“开始对比”后，这里会按统一字段路径展示结果。</p>
      </section>
    );
  }

  if (rows.length === 0) {
    return (
      <section className="rounded-3xl border border-white/10 bg-slate-950/70 p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.45)] backdrop-blur">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-300/20 bg-rose-300/10 text-rose-200">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-sm font-semibold text-slate-100">没有可展示的结果</h2>
        <p className="mt-2 text-sm text-slate-400">请先修正输入错误，或调整字段筛选与“仅看差异/仅看相同”条件后再查看结果。</p>
      </section>
    );
  }

  return (
    <section
      className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.45)] backdrop-blur"
      data-testid="diff-results-panel"
    >
      <div className="mb-4 grid gap-4 border-b border-white/10 pb-4 md:grid-cols-2">
        <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <FileJson2 className="h-4 w-4 shrink-0 text-cyan-200" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-100">左侧面板</p>
              <p className="text-[11px] text-slate-400">展示左侧提交字段名与字段值</p>
            </div>
          </div>
          <div className="min-w-fit max-w-full rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-left sm:text-right">
            <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/80">自定义名称</p>
            <p className="overflow-x-auto whitespace-nowrap text-xs font-medium text-cyan-50">
              {leftPanelName.trim() || "左侧"}
            </p>
          </div>
        </div>
        <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <FileJson2 className="h-4 w-4 shrink-0 text-cyan-200" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-100">右侧面板</p>
              <p className="text-[11px] text-slate-400">与左侧路径逐行对齐，便于快速人工核对</p>
            </div>
          </div>
          <div className="min-w-fit max-w-full rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-left sm:text-right">
            <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/80">自定义名称</p>
            <p className="overflow-x-auto whitespace-nowrap text-xs font-medium text-cyan-50">
              {rightPanelName.trim() || "右侧"}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <div
            key={row.path}
            className="grid gap-3 md:grid-cols-2"
            data-testid={showOnlyDiff ? "diff-row-filtered" : "diff-row"}
            ref={(node) => {
              rowRefs.current[row.path] = node;
            }}
          >
            <ResultCell
              side="left"
              row={row}
              searchQuery={searchQuery}
              searchMode={searchMode}
              isSearchMatch={matchedPaths.includes(row.path)}
              isCurrentMatch={activeMatchPath === row.path}
              showLeafFieldOnly={showLeafFieldOnly}
            />
            <ResultCell
              side="right"
              row={row}
              searchQuery={searchQuery}
              searchMode={searchMode}
              isSearchMatch={matchedPaths.includes(row.path)}
              isCurrentMatch={activeMatchPath === row.path}
              showLeafFieldOnly={showLeafFieldOnly}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
