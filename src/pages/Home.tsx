import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Eraser, Filter, FlaskConical, History, ScanSearch, Sparkles } from "lucide-react";

import DiffResults from "@/components/DiffResults";
import FieldSelector from "@/components/FieldSelector";
import HistoryDrawer from "@/components/HistoryDrawer";
import InputMetaCard from "@/components/InputMetaCard";
import JsonInputPanel from "@/components/JsonInputPanel";
import SearchToolbar from "@/components/SearchToolbar";
import SectionNavigator from "@/components/SectionNavigator";
import StatCard from "@/components/StatCard";
import { cn } from "@/lib/utils";
import { useDiffStore } from "@/stores/useDiffStore";
import { isPathMatched, type SearchMode } from "@/utils/fieldSearch";
import { resolveFieldFilterState } from "@/utils/fieldFilters";
import { filterDiffRowsByPaths, summarizeDiffRows } from "@/utils/jsonDiff";

export default function Home() {
  const {
    leftInput,
    rightInput,
    leftMode,
    rightMode,
    leftError,
    rightError,
    leftMeta,
    rightMeta,
    leftPanelName,
    rightPanelName,
    rows,
    fieldSelectionMode,
    selectedFieldPaths,
    manualFieldInput,
    historyEntries,
    showOnlyDiff,
    showOnlySame,
    showLeafFieldOnly,
    hasCompared,
    hydrateHistory,
    hydratePanelNames,
    hydrateFieldDisplayPreferences,
    setLeftInput,
    setRightInput,
    setLeftMode,
    setRightMode,
    setLeftPanelName,
    setRightPanelName,
    setFieldSelectionMode,
    toggleSelectedFieldPath,
    clearSelectedFieldPaths,
    setManualFieldInput,
    clearManualFieldInput,
    clearLeftInput,
    clearRightInput,
    setShowOnlyDiff,
    setShowOnlySame,
    setShowLeafFieldOnly,
    restoreHistoryEntry,
    clearHistory,
    compare,
    loadJsonSample,
    loadCurlSample,
    clearAll,
  } = useDiffStore();
  const [draftSearchQuery, setDraftSearchQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>("fuzzy");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  useEffect(() => {
    hydrateHistory();
    hydratePanelNames();
    hydrateFieldDisplayPreferences();
  }, [hydrateFieldDisplayPreferences, hydrateHistory, hydratePanelNames]);

  const availableFieldPaths = useMemo(() => rows.map((row) => row.path), [rows]);

  const {
    effectiveFieldPaths,
    invalidManualFieldPaths,
    manualFieldPaths,
    validManualFieldPaths,
  } = useMemo(
    () =>
      resolveFieldFilterState({
        availablePaths: availableFieldPaths,
        selectedFieldPaths,
        manualFieldInput,
        enableManualValidation: hasCompared && availableFieldPaths.length > 0,
      }),
    [availableFieldPaths, hasCompared, manualFieldInput, selectedFieldPaths],
  );

  const hasActiveFieldFilter = selectedFieldPaths.length > 0 || manualFieldPaths.length > 0;

  const fieldFilteredRows = useMemo(() => {
    if (!hasActiveFieldFilter) {
      return rows;
    }

    return filterDiffRowsByPaths(rows, effectiveFieldPaths);
  }, [effectiveFieldPaths, hasActiveFieldFilter, rows]);

  const summary = useMemo(() => summarizeDiffRows(fieldFilteredRows), [fieldFilteredRows]);

  const visibleRows = useMemo(() => {
    if (showOnlyDiff) {
      return fieldFilteredRows.filter((row) => row.status !== "same");
    }

    if (showOnlySame) {
      return fieldFilteredRows.filter((row) => row.status === "same");
    }

    return fieldFilteredRows;
  }, [fieldFilteredRows, showOnlyDiff, showOnlySame]);

  const matchedRowIndices = useMemo(() => {
    if (!searchQuery.trim()) {
      return [];
    }

    return visibleRows.reduce<number[]>((accumulator, row, index) => {
      if (isPathMatched(row.path, searchQuery, searchMode)) {
        accumulator.push(index);
      }

      return accumulator;
    }, []);
  }, [visibleRows, searchMode, searchQuery]);

  useEffect(() => {
    setCurrentMatchIndex(0);
  }, [searchMode, searchQuery, showOnlyDiff, showOnlySame, fieldFilteredRows]);

  useEffect(() => {
    if (currentMatchIndex >= matchedRowIndices.length) {
      setCurrentMatchIndex(0);
    }
  }, [currentMatchIndex, matchedRowIndices.length]);

  const matchedPaths = useMemo(
    () => matchedRowIndices.map((index) => visibleRows[index]?.path).filter(Boolean) as string[],
    [matchedRowIndices, visibleRows],
  );

  const activeMatchPath =
    matchedRowIndices.length > 0 ? visibleRows[matchedRowIndices[currentMatchIndex]]?.path : undefined;

  const jumpToPreviousMatch = () => {
    if (matchedRowIndices.length === 0) {
      return;
    }

    setCurrentMatchIndex((previous) => (previous - 1 + matchedRowIndices.length) % matchedRowIndices.length);
  };

  const jumpToNextMatch = () => {
    if (matchedRowIndices.length === 0) {
      return;
    }

    setCurrentMatchIndex((previous) => (previous + 1) % matchedRowIndices.length);
  };

  const submitSearch = () => {
    setSearchQuery(draftSearchQuery.trim());
    setCurrentMatchIndex(0);
  };

  const resetWorkbench = () => {
    clearAll();
    setDraftSearchQuery("");
    setSearchQuery("");
    setCurrentMatchIndex(0);
  };

  const restoreHistory = (id: string) => {
    const restored = restoreHistoryEntry(id);

    if (restored) {
      setIsHistoryOpen(false);
      setCurrentMatchIndex(0);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_28%),linear-gradient(180deg,#020617_0%,#0f172a_45%,#020617_100%)] px-4 py-6 text-slate-100 md:px-8 lg:px-10">
      <HistoryDrawer
        entries={historyEntries}
        open={isHistoryOpen}
        onClearHistory={clearHistory}
        onClose={() => setIsHistoryOpen(false)}
        onRestore={restoreHistory}
      />
      <SectionNavigator />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 xl:pr-60">
        <section
          className="scroll-mt-24 overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/75 p-6 shadow-[0_32px_120px_rgba(8,15,36,0.58)] backdrop-blur md:p-8"
          data-page-section="页面概览"
          id="page-overview"
        >
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-cyan-200">
                <Sparkles className="h-3.5 w-3.5" />
                JSON Compare Workbench
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                前端提交字段快速对比工具
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">直接粘贴两组前端请求 JSON 或 cURL，本地解析并按字段路径逐行对齐。差异字段会用醒目背景标出，还支持字段搜索定位和 cURL 请求体提取，适合测试阶段快速核对派生策略、被动响应和复杂嵌套结构。</p>
            </div>

            <div className="grid w-full grid-cols-4 gap-3 xl:w-auto xl:min-w-[28rem]">
              <StatCard label="总字段数" value={summary.total} />
              <StatCard label="差异字段" value={summary.different} tone="warn" />
              <StatCard label="左侧缺失" value={summary.missingLeft} />
              <StatCard label="右侧缺失" value={summary.missingRight} tone="accent" />
            </div>
          </div>
        </section>

        <section className="grid scroll-mt-24 gap-5 lg:grid-cols-2" data-page-section="输入面板" id="compare-inputs">
          <JsonInputPanel
            title="左侧待对比数据"
            description="粘贴第一组前端提交字段数据，可选 JSON、cURL 或自动识别。"
            defaultPanelName="左侧"
            panelName={leftPanelName}
            value={leftInput}
            mode={leftMode}
            error={leftError}
            onModeChange={setLeftMode}
            onChange={setLeftInput}
            onClear={clearLeftInput}
            onPanelNameChange={setLeftPanelName}
          />
          <JsonInputPanel
            title="右侧待对比数据"
            description="粘贴第二组前端提交字段数据，可选 JSON、cURL 或自动识别。"
            defaultPanelName="右侧"
            panelName={rightPanelName}
            value={rightInput}
            mode={rightMode}
            error={rightError}
            onModeChange={setRightMode}
            onChange={setRightInput}
            onClear={clearRightInput}
            onPanelNameChange={setRightPanelName}
          />
        </section>

        <div className="scroll-mt-24" data-page-section="字段筛选" id="field-selector">
          <FieldSelector
            availablePaths={availableFieldPaths}
            fieldSelectionMode={fieldSelectionMode}
            selectedFieldPaths={selectedFieldPaths}
            effectiveFieldPaths={effectiveFieldPaths}
            hasActiveFieldFilter={hasActiveFieldFilter}
            invalidManualFieldPaths={invalidManualFieldPaths}
            manualFieldInput={manualFieldInput}
            validManualFieldPaths={validManualFieldPaths}
            onClearSelection={clearSelectedFieldPaths}
            onClearManualFieldInput={clearManualFieldInput}
            onModeChange={setFieldSelectionMode}
            onManualFieldInputChange={setManualFieldInput}
            onTogglePath={toggleSelectedFieldPath}
          />
        </div>

        <section
          className="scroll-mt-24 rounded-3xl border border-white/10 bg-slate-950/70 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.45)] backdrop-blur"
          data-page-section="对比操作"
          id="compare-actions"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <button
                className="inline-flex items-center gap-2 rounded-2xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
                type="button"
                onClick={compare}
              >
                <ArrowLeftRight className="h-4 w-4" />
                开始对比
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10"
                type="button"
                onClick={loadJsonSample}
              >
                <FlaskConical className="h-4 w-4" />
                填充 JSON 示例
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10"
                type="button"
                onClick={loadCurlSample}
              >
                <ScanSearch className="h-4 w-4" />
                填充 cURL 示例
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10"
                type="button"
                onClick={resetWorkbench}
              >
                <Eraser className="h-4 w-4" />
                全部清空
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100 transition hover:bg-cyan-300/15"
                type="button"
                onClick={() => setIsHistoryOpen(true)}
              >
                <History className="h-4 w-4" />
                查看历史
              </button>
            </div>

            <div
              className="inline-flex flex-wrap items-center gap-2 self-start rounded-2xl border border-white/10 bg-white/5 p-1.5 lg:self-auto"
              data-testid="compare-filter-group"
            >
              <label
                className={cn(
                  "inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition",
                  showOnlyDiff
                    ? "border-amber-300/35 bg-amber-300/10 text-amber-100"
                    : "border-transparent text-slate-300 hover:bg-white/5",
                )}
              >
                <Filter className="h-4 w-4" />
                <span>仅看差异</span>
                <input
                  checked={showOnlyDiff}
                  className="h-4 w-4 accent-amber-300"
                  type="checkbox"
                  onChange={(event) => setShowOnlyDiff(event.target.checked)}
                />
              </label>
              <label
                className={cn(
                  "inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition",
                  showOnlySame
                    ? "border-emerald-300/35 bg-emerald-300/10 text-emerald-100"
                    : "border-transparent text-slate-300 hover:bg-white/5",
                )}
              >
                <Filter className="h-4 w-4" />
                <span>仅看相同</span>
                <input
                  checked={showOnlySame}
                  className="h-4 w-4 accent-emerald-300"
                  type="checkbox"
                  onChange={(event) => setShowOnlySame(event.target.checked)}
                />
              </label>
              <label
                className={cn(
                  "inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition",
                  showLeafFieldOnly
                    ? "border-cyan-300/35 bg-cyan-300/10 text-cyan-100"
                    : "border-transparent text-slate-300 hover:bg-white/5",
                )}
              >
                <Filter className="h-4 w-4" />
                <span>字段名仅显示最后一级</span>
                <input
                  checked={showLeafFieldOnly}
                  className="h-4 w-4 accent-cyan-300"
                  type="checkbox"
                  onChange={(event) => setShowLeafFieldOnly(event.target.checked)}
                />
              </label>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-400">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">相同字段保持同一行展示</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">支持对象、数组和深层嵌套</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              {hasActiveFieldFilter ? `当前只对比 ${effectiveFieldPaths.length} 个指定字段` : "当前展示全部字段"}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">所有对比均在浏览器本地执行</span>
          </div>
        </section>

        <section className="grid scroll-mt-24 gap-5 lg:grid-cols-2" data-page-section="解析摘要" id="input-metadata">
          <InputMetaCard title="左侧解析摘要" meta={leftMeta} />
          <InputMetaCard title="右侧解析摘要" meta={rightMeta} />
        </section>

        <div
          className="sticky top-4 z-30 scroll-mt-24"
          data-page-section="结果搜索"
          data-testid="sticky-search-toolbar"
          id="result-search"
        >
          <SearchToolbar
            committedQuery={searchQuery}
            currentMatchIndex={currentMatchIndex}
            draftQuery={draftSearchQuery}
            matchCount={matchedRowIndices.length}
            onDraftQueryChange={setDraftSearchQuery}
            onNext={jumpToNextMatch}
            onPrevious={jumpToPreviousMatch}
            onSearchModeChange={setSearchMode}
            onSearchSubmit={submitSearch}
            searchMode={searchMode}
          />
        </div>

        <div className="scroll-mt-24" data-page-section="对比结果" id="diff-results">
          <DiffResults
            activeMatchPath={activeMatchPath}
            hasCompared={hasCompared}
            leftPanelName={leftPanelName}
            matchedPaths={matchedPaths}
            rightPanelName={rightPanelName}
            rows={visibleRows}
            searchMode={searchMode}
            searchQuery={searchQuery}
            showOnlyDiff={showOnlyDiff}
            showLeafFieldOnly={showLeafFieldOnly}
          />
        </div>
      </div>
    </main>
  );
}
