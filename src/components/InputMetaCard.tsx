import { Braces, Cable, Map, Route } from "lucide-react";

import type { ParsedInputMeta } from "@/utils/inputParser";

type InputMetaCardProps = {
  title: string;
  meta?: ParsedInputMeta;
};

function getFormatLabel(meta?: ParsedInputMeta) {
  if (!meta) {
    return "未解析";
  }

  return meta.resolvedFormat === "curl" ? "cURL" : "JSON";
}

export default function InputMetaCard({ title, meta }: InputMetaCardProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.45)] backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
          <p className="mt-1 text-xs text-slate-400">展示本次对比前提取出的输入来源与请求摘要。</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-200">
          {getFormatLabel(meta)}
        </span>
      </div>

      {!meta ? (
        <p className="mt-4 text-xs text-slate-500">执行对比后会显示 JSON/cURL 的解析摘要。</p>
      ) : (
        <div className="mt-4 grid gap-3 text-xs text-slate-300 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center gap-2 text-slate-100">
              <Braces className="h-4 w-4 text-cyan-200" />
              <span>对比目标</span>
            </div>
            <p className="mt-2 font-mono text-[12px]">{meta.targetLabel}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center gap-2 text-slate-100">
              <Route className="h-4 w-4 text-cyan-200" />
              <span>请求方法</span>
            </div>
            <p className="mt-2 font-mono text-[12px]">{meta.method ?? "无"}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 md:col-span-2">
            <div className="flex items-center gap-2 text-slate-100">
              <Cable className="h-4 w-4 text-cyan-200" />
              <span>URL</span>
            </div>
            <p className="mt-2 break-all font-mono text-[12px]">{meta.url ?? "无"}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center gap-2 text-slate-100">
              <Map className="h-4 w-4 text-cyan-200" />
              <span>URL 参数</span>
            </div>
            <p className="mt-2 font-mono text-[12px]">{meta.queryCount}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center gap-2 text-slate-100">
              <Cable className="h-4 w-4 text-cyan-200" />
              <span>Header 数量</span>
            </div>
            <p className="mt-2 font-mono text-[12px]">{meta.headerCount}</p>
          </div>
        </div>
      )}
    </section>
  );
}
