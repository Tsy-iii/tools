import { ListFilter, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import { preserveNativeEditingShortcuts } from "@/utils/editingShortcuts";
import { getFieldPathCandidates } from "@/utils/fieldPath";

type FieldSelectorProps = {
  availablePaths: string[];
  fieldSelectionMode: "single" | "multiple";
  selectedFieldPaths: string[];
  effectiveFieldPaths: string[];
  manualFieldInput: string;
  validManualFieldPaths: string[];
  invalidManualFieldPaths: string[];
  hasActiveFieldFilter: boolean;
  onModeChange: (value: "single" | "multiple") => void;
  onTogglePath: (path: string) => void;
  onClearSelection: () => void;
  onManualFieldInputChange: (value: string) => void;
  onClearManualFieldInput: () => void;
};

export default function FieldSelector({
  availablePaths,
  fieldSelectionMode,
  selectedFieldPaths,
  effectiveFieldPaths,
  manualFieldInput,
  validManualFieldPaths,
  invalidManualFieldPaths,
  hasActiveFieldFilter,
  onModeChange,
  onTogglePath,
  onClearSelection,
  onManualFieldInputChange,
  onClearManualFieldInput,
}: FieldSelectorProps) {
  const [pathKeyword, setPathKeyword] = useState("");

  const filteredPaths = useMemo(() => {
    const keyword = pathKeyword.trim().toLowerCase();

    if (!keyword) {
      return availablePaths;
    }

    return availablePaths.filter((path) =>
      getFieldPathCandidates(path).some((candidate) => candidate.toLowerCase().includes(keyword)),
    );
  }, [availablePaths, pathKeyword]);

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.45)] backdrop-blur">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-cyan-100">
            <ListFilter className="h-3.5 w-3.5" />
            字段筛选
          </div>
          <h2 className="mt-3 text-sm font-semibold text-slate-100">选择需要参与对比的字段</h2>
          <p className="mt-1 text-xs leading-6 text-slate-400">
            支持单字段兼容模式和多字段模式。字段路径会优先按业务顶级字段匹配，`data_dict.*` 旧路径会自动兼容到对应字段。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-2xl border border-white/10 bg-white/5 p-1">
            <button
              className={cn(
                "rounded-xl px-3 py-2 text-xs transition",
                fieldSelectionMode === "single"
                  ? "bg-cyan-300 text-slate-950"
                  : "text-slate-300 hover:bg-white/10",
              )}
              type="button"
              onClick={() => onModeChange("single")}
            >
              单选模式
            </button>
            <button
              className={cn(
                "rounded-xl px-3 py-2 text-xs transition",
                fieldSelectionMode === "multiple"
                  ? "bg-cyan-300 text-slate-950"
                  : "text-slate-300 hover:bg-white/10",
              )}
              type="button"
              onClick={() => onModeChange("multiple")}
            >
              多选模式
            </button>
          </div>

          <button
            className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={selectedFieldPaths.length === 0}
            type="button"
            onClick={onClearSelection}
          >
            清空已选
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
        <div className="flex items-center gap-3">
          <Search className="h-4 w-4 text-cyan-200" />
          <input
            aria-label="字段筛选搜索"
            className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
            placeholder="搜索字段路径，例如 requestId、payload.page、strategy.rules[0].id"
            value={pathKeyword}
            onKeyDownCapture={preserveNativeEditingShortcuts}
            onChange={(event) => setPathKeyword(event.target.value)}
          />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium text-slate-100">手动输入字段</h3>
            <p className="mt-1 text-xs leading-6 text-slate-400">
              支持逗号、空格或换行分隔。输入后的字段会和多选字段合并，最终只展示这些指定字段；输入 `data_dict.spc_upgrade_mode` 也会自动命中 `spc_upgrade_mode`。
            </p>
          </div>

          <button
            className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!manualFieldInput.trim()}
            type="button"
            onClick={onClearManualFieldInput}
          >
            清空输入
          </button>
        </div>

        <textarea
          aria-label="手动输入字段"
          className="mt-3 min-h-28 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-300/35 focus:ring-2 focus:ring-cyan-300/15"
          placeholder={"例如：\nrequestId, payload.page\nstrategy.rules[0].id"}
          value={manualFieldInput}
          onKeyDownCapture={preserveNativeEditingShortcuts}
          onChange={(event) => onManualFieldInputChange(event.target.value)}
        />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400">手动输入识别到：</span>
          {manualFieldInput.trim() ? (
            <>
              {validManualFieldPaths.map((path) => (
                <span
                  key={`manual-valid-${path}`}
                  className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs text-emerald-100"
                >
                  {path}
                </span>
              ))}
              {invalidManualFieldPaths.map((path) => (
                <span
                  key={`manual-invalid-${path}`}
                  className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs text-amber-100"
                >
                  {path}
                </span>
              ))}
              {validManualFieldPaths.length === 0 && invalidManualFieldPaths.length === 0 ? (
                <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 text-xs text-slate-300">
                  等待开始对比后校验字段
                </span>
              ) : null}
            </>
          ) : (
            <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 text-xs text-slate-300">
              尚未输入手动字段
            </span>
          )}
        </div>

        {invalidManualFieldPaths.length > 0 ? (
          <p className="mt-3 text-xs leading-6 text-amber-200">
            以下字段未在当前数据中找到：{invalidManualFieldPaths.join("、")}
          </p>
        ) : null}
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400">当前生效字段：</span>
          {effectiveFieldPaths.length === 0 ? (
            <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 text-xs text-slate-300">
              {hasActiveFieldFilter ? "当前没有命中任何指定字段" : "未限制，当前展示全部字段"}
            </span>
          ) : (
            effectiveFieldPaths.map((path) => (
              <span
                key={path}
                className="inline-flex items-center gap-1 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100"
              >
                <span className="max-w-[18rem] truncate">{path}</span>
                {selectedFieldPaths.includes(path) && !validManualFieldPaths.includes(path) ? (
                  <span className="rounded-full bg-cyan-200/15 px-1.5 py-0.5 text-[10px] text-cyan-100">多选</span>
                ) : null}
                {validManualFieldPaths.includes(path) ? (
                  <span className="rounded-full bg-cyan-200/15 px-1.5 py-0.5 text-[10px] text-cyan-100">手动</span>
                ) : null}
              </span>
            ))
          )}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/60">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-xs text-slate-400">
          <span>可选字段 {availablePaths.length} 个</span>
          <span>{filteredPaths.length} 个匹配当前搜索</span>
        </div>

        <div className="max-h-72 overflow-y-auto p-2">
          {filteredPaths.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-slate-400">没有匹配的字段路径</div>
          ) : (
            <div className="space-y-1">
              {filteredPaths.map((path) => {
                const checked = selectedFieldPaths.includes(path);
                const inputType = fieldSelectionMode === "single" ? "radio" : "checkbox";

                return (
                  <label
                    key={path}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-2xl border px-3 py-2 text-sm transition",
                      checked
                        ? "border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
                        : "border-transparent text-slate-300 hover:bg-white/5",
                    )}
                  >
                    <input
                      aria-label={`选择字段 ${path}`}
                      checked={checked}
                      className="h-4 w-4 accent-cyan-300"
                      name="field-selection"
                      type={inputType}
                      onChange={() => onTogglePath(path)}
                    />
                    <span className="font-mono text-[13px] break-all">{path}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
