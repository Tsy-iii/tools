import type { DiffSummary } from "@/utils/jsonDiff";
import type { InputMode } from "@/utils/inputParser";

export const COMPARE_HISTORY_STORAGE_KEY = "json-compare-history";
const MAX_HISTORY_ENTRIES = 20;

export type CompareHistoryEntry = {
  id: string;
  createdAt: string;
  leftInput: string;
  rightInput: string;
  leftMode: InputMode;
  rightMode: InputMode;
  leftPanelName: string;
  rightPanelName: string;
  summary: DiffSummary;
  leftPreview: string;
  rightPreview: string;
};

function sanitizePreview(input: string): string {
  const trimmed = input.trim().replace(/\s+/g, " ");

  if (!trimmed) {
    return "空内容";
  }

  return trimmed.length > 72 ? `${trimmed.slice(0, 72)}...` : trimmed;
}

export function createCompareHistoryEntry(params: {
  leftInput: string;
  rightInput: string;
  leftMode: InputMode;
  rightMode: InputMode;
  leftPanelName: string;
  rightPanelName: string;
  summary: DiffSummary;
}): CompareHistoryEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    createdAt: new Date().toISOString(),
    leftInput: params.leftInput,
    rightInput: params.rightInput,
    leftMode: params.leftMode,
    rightMode: params.rightMode,
    leftPanelName: params.leftPanelName.trim(),
    rightPanelName: params.rightPanelName.trim(),
    summary: params.summary,
    leftPreview: sanitizePreview(params.leftInput),
    rightPreview: sanitizePreview(params.rightInput),
  };
}

export function readCompareHistory(): CompareHistoryEntry[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(COMPARE_HISTORY_STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((entry): entry is CompareHistoryEntry => {
      return (
        typeof entry?.id === "string" &&
        typeof entry?.createdAt === "string" &&
        typeof entry?.leftInput === "string" &&
        typeof entry?.rightInput === "string" &&
        typeof entry?.leftMode === "string" &&
        typeof entry?.rightMode === "string" &&
        typeof entry?.leftPanelName === "string" &&
        typeof entry?.rightPanelName === "string" &&
        typeof entry?.leftPreview === "string" &&
        typeof entry?.rightPreview === "string" &&
        typeof entry?.summary === "object" &&
        entry.summary !== null
      );
    });
  } catch {
    return [];
  }
}

export function writeCompareHistory(entries: CompareHistoryEntry[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    COMPARE_HISTORY_STORAGE_KEY,
    JSON.stringify(entries.slice(0, MAX_HISTORY_ENTRIES)),
  );
}
