import { create } from "zustand";

import {
  compareJsonInputs,
  filterDiffRowsByPaths,
  type CompareResult,
  type DiffRow,
  type DiffSummary,
  summarizeDiffRows,
} from "@/utils/jsonDiff";
import { normalizeFieldPath } from "@/utils/fieldPath";
import {
  parseComparableInput,
  type InputMode,
  type ParsedInputMeta,
} from "@/utils/inputParser";
import {
  createCompareHistoryEntry,
  readCompareHistory,
  writeCompareHistory,
  type CompareHistoryEntry,
} from "@/utils/compareHistory";
import { readFieldDisplayPreferences, writeFieldDisplayPreferences } from "@/utils/fieldDisplayPreferences";
import { readPanelNames, writePanelNames } from "@/utils/panelNames";

type DiffStore = {
  leftInput: string;
  rightInput: string;
  leftMode: InputMode;
  rightMode: InputMode;
  leftError: string;
  rightError: string;
  leftMeta?: ParsedInputMeta;
  rightMeta?: ParsedInputMeta;
  leftPanelName: string;
  rightPanelName: string;
  rows: DiffRow[];
  summary: DiffSummary;
  fieldSelectionMode: "single" | "multiple";
  selectedFieldPaths: string[];
  manualFieldInput: string;
  historyEntries: CompareHistoryEntry[];
  showOnlyDiff: boolean;
  showOnlySame: boolean;
  showLeafFieldOnly: boolean;
  hasCompared: boolean;
  hydrateHistory: () => void;
  hydratePanelNames: () => void;
  hydrateFieldDisplayPreferences: () => void;
  setLeftInput: (value: string) => void;
  setRightInput: (value: string) => void;
  setLeftMode: (value: InputMode) => void;
  setRightMode: (value: InputMode) => void;
  setLeftPanelName: (value: string) => void;
  setRightPanelName: (value: string) => void;
  setFieldSelectionMode: (value: "single" | "multiple") => void;
  toggleSelectedFieldPath: (path: string) => void;
  clearSelectedFieldPaths: () => void;
  setManualFieldInput: (value: string) => void;
  clearManualFieldInput: () => void;
  clearLeftInput: () => void;
  clearRightInput: () => void;
  setShowOnlyDiff: (value: boolean) => void;
  setShowOnlySame: (value: boolean) => void;
  setShowLeafFieldOnly: (value: boolean) => void;
  restoreHistoryEntry: (id: string) => boolean;
  clearHistory: () => void;
  compare: () => boolean;
  loadJsonSample: () => void;
  loadCurlSample: () => void;
  clearAll: () => void;
};

const sampleLeft = `{
  "requestId": "REQ-20260623-LEFT",
  "scene": "passive_response",
  "strategy": {
    "mode": "derived",
    "priority": 3,
    "rules": [
      {
        "id": "rule_a",
        "enabled": true,
        "threshold": 0.8
      },
      {
        "id": "rule_b",
        "enabled": false,
        "threshold": 0.5
      }
    ]
  },
  "payload": {
    "keyword": "shoes",
    "page": 1,
    "filters": {
      "region": "CN",
      "device": "ios"
    }
  }
}`;

const sampleRight = `{
  "requestId": "REQ-20260623-RIGHT",
  "scene": "passive_response",
  "strategy": {
    "mode": "derived",
    "priority": 5,
    "rules": [
      {
        "id": "rule_a",
        "enabled": true,
        "threshold": 0.85
      },
      {
        "id": "rule_c",
        "enabled": true,
        "threshold": 0.5
      }
    ]
  },
  "payload": {
    "keyword": "shoes",
    "page": "1",
    "filters": {
      "region": "SG",
      "device": "ios"
    },
    "debug": true
  }
}`;

const curlLeftSample = `curl 'https://example.com/api/search?region=CN&scene=passive_response' \\
  -X POST \\
  -H 'Content-Type: application/json' \\
  -H 'X-Trace-Id: trace-left' \\
  --data-raw '{
    "requestId": "REQ-CURL-LEFT",
    "strategy": {
      "mode": "derived",
      "priority": 2,
      "rules": [
        {
          "id": "rule_a",
          "enabled": true
        }
      ]
    },
    "payload": {
      "keyword": "dress",
      "page": 1
    }
  }'`;

const curlRightSample = `{
  "requestId": "REQ-CURL-RIGHT",
  "strategy": {
    "mode": "derived",
    "priority": 4,
    "rules": [
      {
        "id": "rule_a",
        "enabled": false
      }
    ]
  },
  "payload": {
    "keyword": "dress",
    "page": 1
  }
}`;

const emptySummary: DiffSummary = {
  total: 0,
  same: 0,
  different: 0,
  missingLeft: 0,
  missingRight: 0,
  typeChanged: 0,
};

function buildCompareResult(
  leftInput: string,
  rightInput: string,
  leftMode: InputMode,
  rightMode: InputMode,
): {
  leftMeta?: ParsedInputMeta;
  rightMeta?: ParsedInputMeta;
  ok: boolean;
  leftError: string;
  rightError: string;
  result?: CompareResult;
}
function buildCompareResult(
  leftInput: string,
  rightInput: string,
  leftMode: InputMode,
  rightMode: InputMode,
): {
  leftMeta?: ParsedInputMeta;
  rightMeta?: ParsedInputMeta;
  ok: boolean;
  leftError: string;
  rightError: string;
  result?: CompareResult;
} {
  const leftParsed = parseComparableInput(leftInput, leftMode);
  const rightParsed = parseComparableInput(rightInput, rightMode);

  const leftError = leftParsed.error ?? "";
  const rightError = rightParsed.error ?? "";

  if (leftError || rightError || leftParsed.value === undefined || rightParsed.value === undefined) {
    return {
      ok: false,
      leftError,
      rightError,
      leftMeta: leftParsed.meta,
      rightMeta: rightParsed.meta,
    };
  }

  return {
    ok: true,
    leftError: "",
    rightError: "",
    leftMeta: leftParsed.meta,
    rightMeta: rightParsed.meta,
    result: compareJsonInputs(leftParsed.value, rightParsed.value),
  };
}

export const useDiffStore = create<DiffStore>((set, get) => ({
  leftInput: "",
  rightInput: "",
  leftMode: "auto",
  rightMode: "auto",
  leftError: "",
  rightError: "",
  leftMeta: undefined,
  rightMeta: undefined,
  leftPanelName: "",
  rightPanelName: "",
  rows: [],
  summary: emptySummary,
  fieldSelectionMode: "multiple",
  selectedFieldPaths: [],
  manualFieldInput: "",
  historyEntries: [],
  showOnlyDiff: false,
  showOnlySame: false,
  showLeafFieldOnly: true,
  hasCompared: false,
  hydrateHistory: () => set({ historyEntries: readCompareHistory() }),
  hydratePanelNames: () => {
    const panelNames = readPanelNames();
    set({
      leftPanelName: panelNames.left,
      rightPanelName: panelNames.right,
    });
  },
  hydrateFieldDisplayPreferences: () => {
    const preferences = readFieldDisplayPreferences();
    set({ showLeafFieldOnly: preferences.showLeafFieldOnly });
  },
  setLeftInput: (value) => set({ leftInput: value, leftError: "" }),
  setRightInput: (value) => set({ rightInput: value, rightError: "" }),
  setLeftMode: (value) => set({ leftMode: value, leftError: "" }),
  setRightMode: (value) => set({ rightMode: value, rightError: "" }),
  setLeftPanelName: (value) => {
    const nextPanelNames = {
      left: value.trim(),
      right: get().rightPanelName,
    };

    writePanelNames(nextPanelNames);
    set({ leftPanelName: nextPanelNames.left });
  },
  setRightPanelName: (value) => {
    const nextPanelNames = {
      left: get().leftPanelName,
      right: value.trim(),
    };

    writePanelNames(nextPanelNames);
    set({ rightPanelName: nextPanelNames.right });
  },
  setFieldSelectionMode: (value) =>
    set((state) => ({
      fieldSelectionMode: value,
      selectedFieldPaths:
        value === "single" && state.selectedFieldPaths.length > 1
          ? state.selectedFieldPaths.slice(0, 1)
          : state.selectedFieldPaths,
    })),
  toggleSelectedFieldPath: (path) =>
    set((state) => {
      const normalizedPath = normalizeFieldPath(path);

      if (state.fieldSelectionMode === "single") {
        const isSameSingleSelection =
          state.selectedFieldPaths.length === 1 && state.selectedFieldPaths[0] === normalizedPath;

        return {
          selectedFieldPaths: isSameSingleSelection ? [] : [normalizedPath],
        };
      }

      const selectedPathSet = new Set(state.selectedFieldPaths);

      if (selectedPathSet.has(normalizedPath)) {
        selectedPathSet.delete(normalizedPath);
      } else {
        selectedPathSet.add(normalizedPath);
      }

      return {
        selectedFieldPaths: Array.from(selectedPathSet),
      };
    }),
  clearSelectedFieldPaths: () => set({ selectedFieldPaths: [] }),
  setManualFieldInput: (value) => set({ manualFieldInput: value }),
  clearManualFieldInput: () => set({ manualFieldInput: "" }),
  clearLeftInput: () =>
    set({
      leftInput: "",
      leftError: "",
      leftMeta: undefined,
      rows: [],
      summary: emptySummary,
      selectedFieldPaths: [],
      hasCompared: false,
    }),
  clearRightInput: () =>
    set({
      rightInput: "",
      rightError: "",
      rightMeta: undefined,
      rows: [],
      summary: emptySummary,
      selectedFieldPaths: [],
      hasCompared: false,
    }),
  setShowOnlyDiff: (value) => set({ showOnlyDiff: value, showOnlySame: value ? false : get().showOnlySame }),
  setShowOnlySame: (value) => set({ showOnlySame: value, showOnlyDiff: value ? false : get().showOnlyDiff }),
  setShowLeafFieldOnly: (value) => {
    writeFieldDisplayPreferences({ showLeafFieldOnly: value });
    set({ showLeafFieldOnly: value });
  },
  compare: () => {
    const { leftInput, rightInput, leftMode, rightMode, leftPanelName, rightPanelName } = get();
    const compareState = buildCompareResult(leftInput, rightInput, leftMode, rightMode);

    if (!compareState.ok || !compareState.result) {
      set({
        leftError: compareState.leftError,
        rightError: compareState.rightError,
        leftMeta: compareState.leftMeta,
        rightMeta: compareState.rightMeta,
        rows: [],
        summary: emptySummary,
        hasCompared: true,
      });
      return false;
    }

    const nextHistoryEntries = [
      createCompareHistoryEntry({
        leftInput,
        rightInput,
        leftMode,
        rightMode,
        leftPanelName,
        rightPanelName,
        summary: compareState.result.summary,
      }),
      ...get().historyEntries.filter(
        (entry) =>
          !(
            entry.leftInput === leftInput &&
            entry.rightInput === rightInput &&
            entry.leftMode === leftMode &&
            entry.rightMode === rightMode &&
            entry.leftPanelName === leftPanelName &&
            entry.rightPanelName === rightPanelName
          ),
      ),
    ];

    writeCompareHistory(nextHistoryEntries);

    const nextSelectedFieldPaths = get().selectedFieldPaths.filter((path) =>
      compareState.result.rows.some((row) => row.path === path),
    );

    set({
      leftError: "",
      rightError: "",
      leftMeta: compareState.leftMeta,
      rightMeta: compareState.rightMeta,
      rows: compareState.result.rows,
      summary: summarizeDiffRows(filterDiffRowsByPaths(compareState.result.rows, nextSelectedFieldPaths)),
      selectedFieldPaths: nextSelectedFieldPaths,
      historyEntries: nextHistoryEntries,
      hasCompared: true,
    });
    return true;
  },
  restoreHistoryEntry: (id) => {
    const entry = get().historyEntries.find((item) => item.id === id);

    if (!entry) {
      return false;
    }

    const compareState = buildCompareResult(entry.leftInput, entry.rightInput, entry.leftMode, entry.rightMode);

    set({
      leftInput: entry.leftInput,
      rightInput: entry.rightInput,
      leftMode: entry.leftMode,
      rightMode: entry.rightMode,
      leftPanelName: entry.leftPanelName,
      rightPanelName: entry.rightPanelName,
      leftError: compareState.leftError,
      rightError: compareState.rightError,
      leftMeta: compareState.leftMeta,
      rightMeta: compareState.rightMeta,
      rows: compareState.result?.rows ?? [],
      summary: compareState.result?.summary ?? emptySummary,
      selectedFieldPaths: [],
      hasCompared: compareState.ok,
    });

    writePanelNames({
      left: entry.leftPanelName,
      right: entry.rightPanelName,
    });

    return compareState.ok;
  },
  clearHistory: () => {
    writeCompareHistory([]);
    set({ historyEntries: [] });
  },
  loadJsonSample: () => {
    const result = buildCompareResult(sampleLeft, sampleRight, "json", "json");

    set({
      leftInput: sampleLeft,
      rightInput: sampleRight,
      leftMode: "json",
      rightMode: "json",
      leftError: result.leftError,
      rightError: result.rightError,
      leftMeta: result.leftMeta,
      rightMeta: result.rightMeta,
      rows: result.result?.rows ?? [],
      summary: result.result?.summary ?? emptySummary,
      hasCompared: true,
    });
  },
  loadCurlSample: () => {
    const result = buildCompareResult(curlLeftSample, curlRightSample, "curl", "json");

    set({
      leftInput: curlLeftSample,
      rightInput: curlRightSample,
      leftMode: "curl",
      rightMode: "json",
      leftError: result.leftError,
      rightError: result.rightError,
      leftMeta: result.leftMeta,
      rightMeta: result.rightMeta,
      rows: result.result?.rows ?? [],
      summary: result.result?.summary ?? emptySummary,
      hasCompared: true,
    });
  },
  clearAll: () =>
    set({
      leftInput: "",
      rightInput: "",
      leftMode: "auto",
      rightMode: "auto",
      leftError: "",
      rightError: "",
      leftMeta: undefined,
      rightMeta: undefined,
      leftPanelName: get().leftPanelName,
      rightPanelName: get().rightPanelName,
      rows: [],
      summary: emptySummary,
      fieldSelectionMode: "multiple",
      selectedFieldPaths: [],
      manualFieldInput: "",
      showOnlyDiff: false,
      showOnlySame: false,
      showLeafFieldOnly: get().showLeafFieldOnly,
      hasCompared: false,
    }),
}));
