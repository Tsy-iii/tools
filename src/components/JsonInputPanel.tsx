import { useEffect, useState } from "react";

import { preserveNativeEditingShortcuts } from "@/utils/editingShortcuts";
import type { InputMode } from "@/utils/inputParser";

type JsonInputPanelProps = {
  title: string;
  description: string;
  panelName: string;
  defaultPanelName: string;
  value: string;
  error?: string;
  mode: InputMode;
  onModeChange: (value: InputMode) => void;
  onChange: (value: string) => void;
  onClear: () => void;
  onPanelNameChange: (value: string) => void;
};

export default function JsonInputPanel({
  title,
  description,
  panelName,
  defaultPanelName,
  value,
  error,
  mode,
  onModeChange,
  onChange,
  onClear,
  onPanelNameChange,
}: JsonInputPanelProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftPanelName, setDraftPanelName] = useState(panelName);

  useEffect(() => {
    setDraftPanelName(panelName);
  }, [panelName]);

  const displayPanelName = panelName.trim() || defaultPanelName;

  const submitPanelName = () => {
    onPanelNameChange(draftPanelName);
    setIsEditingName(false);
  };

  const cancelPanelNameEdit = () => {
    setDraftPanelName(panelName);
    setIsEditingName(false);
  };

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.45)] backdrop-blur">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
          <p className="mt-1 text-xs text-slate-400">{description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <input
                aria-label={`${title} 自定义名称`}
                className="w-28 rounded-xl border border-cyan-300/25 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-100 outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                maxLength={24}
                placeholder={defaultPanelName}
                value={draftPanelName}
                onChange={(event) => setDraftPanelName(event.target.value)}
                onKeyDownCapture={preserveNativeEditingShortcuts}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    submitPanelName();
                  }

                  if (event.key === "Escape") {
                    event.preventDefault();
                    cancelPanelNameEdit();
                  }
                }}
              />
              <button
                className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1.5 text-[11px] text-cyan-100 transition hover:bg-cyan-300/15"
                type="button"
                onClick={submitPanelName}
              >
                保存
              </button>
              <button
                className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] text-slate-300 transition hover:bg-white/10"
                type="button"
                onClick={cancelPanelNameEdit}
              >
                取消
              </button>
            </div>
          ) : (
            <button
              aria-label={`${title} 命名`}
              className="max-w-[10rem] rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] text-cyan-200 transition hover:bg-cyan-400/15"
              type="button"
              onClick={() => setIsEditingName(true)}
            >
              <span className="block truncate">{displayPanelName}</span>
            </button>
          )}
          <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[11px] text-cyan-200">
            直接粘贴
          </span>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400" htmlFor={`${title}-mode`}>
            输入模式
          </label>
          <select
            id={`${title}-mode`}
            aria-label={`${title} 输入模式`}
            className="rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-xs text-slate-100 outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
            value={mode}
            onChange={(event) => onModeChange(event.target.value as InputMode)}
          >
            <option value="json">JSON</option>
            <option value="curl">cURL</option>
            <option value="auto">自动识别</option>
          </select>
        </div>

        <button
          aria-label={`${title} 清空`}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 transition hover:bg-white/10"
          type="button"
          onClick={onClear}
        >
          清空
        </button>
      </div>

      <textarea
        aria-label={title}
        className="h-72 w-full resize-none rounded-2xl border border-white/10 bg-slate-900/90 px-4 py-3 font-mono text-[13px] leading-6 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
        placeholder={mode === "curl" ? "curl 'https://example.com/api' -H 'Content-Type: application/json' --data-raw '{\"a\":1}'" : '{\n  "requestId": "demo"\n}'}
        spellCheck={false}
        value={value}
        onKeyDownCapture={preserveNativeEditingShortcuts}
        onChange={(event) => onChange(event.target.value)}
      />

      <div className="mt-3 min-h-6 text-xs">
        {error ? <p className="text-rose-300">{error}</p> : <p className="text-slate-500">支持对象、数组和深层嵌套结构。</p>}
      </div>
    </section>
  );
}
