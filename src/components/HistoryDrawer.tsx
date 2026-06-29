import { History, RotateCcw, X } from "lucide-react";

import type { CompareHistoryEntry } from "@/utils/compareHistory";

type HistoryDrawerProps = {
  entries: CompareHistoryEntry[];
  open: boolean;
  onClose: () => void;
  onRestore: (id: string) => void;
  onClearHistory: () => void;
};

function formatHistoryTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function resolvePanelName(value: string, fallback: string): string {
  const trimmed = value.trim();
  return trimmed || fallback;
}

export default function HistoryDrawer({
  entries,
  open,
  onClose,
  onRestore,
  onClearHistory,
}: HistoryDrawerProps) {
  if (!open) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-sm" onClick={onClose} />

      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-white/10 bg-slate-950/95 shadow-2xl sm:max-w-lg"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-2 text-cyan-200">
              <History className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">历史对比记录</h2>
              <p className="text-xs text-slate-400">点击任意一条记录可快速恢复当次对比内容</p>
            </div>
          </div>

          <button
            aria-label="关闭历史记录"
            className="rounded-2xl border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10"
            type="button"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3 text-xs text-slate-400">
          <span>共 {entries.length} 条记录，按时间倒序保存</span>
          <button
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={entries.length === 0}
            type="button"
            onClick={onClearHistory}
          >
            清空历史
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {entries.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-slate-400">
              暂无历史记录。完成一次成功对比后，会自动保存到这里。
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <button
                  key={entry.id}
                  className="w-full rounded-3xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-cyan-300/30 hover:bg-white/10"
                  type="button"
                  onClick={() => onRestore(entry.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-100">
                        {entry.leftMode.toUpperCase()} vs {entry.rightMode.toUpperCase()}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">{formatHistoryTime(entry.createdAt)}</p>
                    </div>

                    <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] text-cyan-100">
                      差异 {entry.summary.different} / 总数 {entry.summary.total}
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Left</p>
                        <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[11px] text-cyan-100">
                          {resolvePanelName(entry.leftPanelName, "左侧")}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-slate-300">{entry.leftPreview}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Right</p>
                        <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[11px] text-cyan-100">
                          {resolvePanelName(entry.rightPanelName, "右侧")}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-slate-300">{entry.rightPreview}</p>
                    </div>
                  </div>

                  <div className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-cyan-200">
                    <RotateCcw className="h-3.5 w-3.5" />
                    重新加载这次对比
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
