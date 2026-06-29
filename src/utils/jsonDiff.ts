import { normalizeFieldPath } from "@/utils/fieldPath";

export type DiffStatus =
  | "same"
  | "changed"
  | "missing-left"
  | "missing-right"
  | "type-changed";

export type DiffRow = {
  path: string;
  leftDisplay: string;
  rightDisplay: string;
  leftType: string;
  rightType: string;
  status: DiffStatus;
};

type FlatNode = {
  path: string;
  rawPath: string;
  value: unknown;
  type: string;
  order: number;
  priority: number;
};

export type DiffSummary = {
  total: number;
  same: number;
  different: number;
  missingLeft: number;
  missingRight: number;
  typeChanged: number;
};

export type CompareResult = {
  rows: DiffRow[];
  summary: DiffSummary;
};

const MISSING_TEXT = "字段缺失";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === "[object Object]";
}

export function getValueType(value: unknown): string {
  if (value === null) {
    return "null";
  }

  if (Array.isArray(value)) {
    return "array";
  }

  return typeof value;
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const entries = Object.keys(value as Record<string, unknown>)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`);

  return `{${entries.join(",")}}`;
}

function formatDisplayValue(value: unknown): string {
  if (value === undefined) {
    return MISSING_TEXT;
  }

  if (typeof value === "string") {
    return value === "" ? '""' : value;
  }

  if (typeof value === "number" || typeof value === "boolean" || value === null) {
    return String(value);
  }

  return JSON.stringify(value, null, 2);
}

function joinPath(basePath: string, key: string | number, isArrayIndex: boolean): string {
  if (typeof key === "number" || isArrayIndex) {
    return `${basePath}[${key}]`;
  }

  return basePath ? `${basePath}.${key}` : String(key);
}

function flattenJson(value: unknown): FlatNode[] {
  const rawNodes: FlatNode[] = [];
  let order = 0;

  function visit(current: unknown, path: string) {
    const type = getValueType(current);
    const isArray = Array.isArray(current);
    const isObject = isPlainObject(current);
    const isEmptyContainer =
      (isArray && current.length === 0) ||
      (isObject && Object.keys(current).length === 0);
    const isLeafNode = !isArray && !isObject;
    const shouldIncludeNode = isLeafNode || isEmptyContainer || (path === "" && (isLeafNode || isEmptyContainer));

    if (shouldIncludeNode) {
      const rawPath = path || "$";
      const normalizedPath = rawPath === "$" ? rawPath : normalizeFieldPath(rawPath);

      rawNodes.push({
        path: normalizedPath,
        rawPath,
        value: current,
        type,
        order: order++,
        priority: rawPath === normalizedPath ? 0 : 1,
      });
    }

    if (Array.isArray(current)) {
      current.forEach((item, index) => {
        visit(item, joinPath(path, index, true));
      });
      return;
    }

    if (isPlainObject(current)) {
      Object.entries(current).forEach(([key, nested]) => {
        visit(nested, joinPath(path, key, false));
      });
    }
  }

  visit(value, "");

  // `data_dict.*` is a legacy transport wrapper. Prefer the direct business field path
  // when both variants exist, but keep the nested form as a fallback for old payloads.
  const normalizedNodeMap = new Map<string, FlatNode>();

  rawNodes.forEach((node) => {
    const existingNode = normalizedNodeMap.get(node.path);

    if (!existingNode) {
      normalizedNodeMap.set(node.path, node);
      return;
    }

    if (node.priority < existingNode.priority || (node.priority === existingNode.priority && node.order < existingNode.order)) {
      normalizedNodeMap.set(node.path, node);
    }
  });

  return Array.from(normalizedNodeMap.values()).sort((left, right) => left.order - right.order);
}

export function parseJsonInput(raw: string): { value?: unknown; error?: string } {
  const trimmed = raw.trim();

  if (!trimmed) {
    return { error: "请输入合法的 JSON 内容" };
  }

  try {
    return { value: JSON.parse(trimmed) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知解析错误";
    return { error: `JSON 解析失败：${message}` };
  }
}

export function compareJsonInputs(leftValue: unknown, rightValue: unknown): CompareResult {
  const leftNodes = flattenJson(leftValue);
  const rightNodes = flattenJson(rightValue);

  const leftMap = new Map(leftNodes.map((node) => [node.path, node]));
  const rightMap = new Map(rightNodes.map((node) => [node.path, node]));

  const orderedPaths: string[] = [];
  const seenPaths = new Set<string>();

  leftNodes.forEach((node) => {
    if (!seenPaths.has(node.path)) {
      orderedPaths.push(node.path);
      seenPaths.add(node.path);
    }
  });

  rightNodes.forEach((node) => {
    if (!seenPaths.has(node.path)) {
      orderedPaths.push(node.path);
      seenPaths.add(node.path);
    }
  });

  const summary: DiffSummary = {
    total: orderedPaths.length,
    same: 0,
    different: 0,
    missingLeft: 0,
    missingRight: 0,
    typeChanged: 0,
  };

  const rows = orderedPaths.map((path) => {
    const leftNode = leftMap.get(path);
    const rightNode = rightMap.get(path);

    let status: DiffStatus = "same";

    if (!leftNode) {
      status = "missing-left";
      summary.missingLeft += 1;
    } else if (!rightNode) {
      status = "missing-right";
      summary.missingRight += 1;
    } else if (leftNode.type !== rightNode.type) {
      status = "type-changed";
      summary.typeChanged += 1;
    } else if (stableStringify(leftNode.value) !== stableStringify(rightNode.value)) {
      status = "changed";
    } else {
      summary.same += 1;
    }

    if (status !== "same") {
      summary.different += 1;
    }

    return {
      path,
      leftDisplay: formatDisplayValue(leftNode?.value),
      rightDisplay: formatDisplayValue(rightNode?.value),
      leftType: leftNode?.type ?? "missing",
      rightType: rightNode?.type ?? "missing",
      status,
    };
  });

  return {
    rows,
    summary,
  };
}

export function summarizeDiffRows(rows: DiffRow[]): DiffSummary {
  return rows.reduce<DiffSummary>(
    (summary, row) => {
      summary.total += 1;

      if (row.status === "same") {
        summary.same += 1;
        return summary;
      }

      summary.different += 1;

      if (row.status === "missing-left") {
        summary.missingLeft += 1;
        return summary;
      }

      if (row.status === "missing-right") {
        summary.missingRight += 1;
        return summary;
      }

      if (row.status === "type-changed") {
        summary.typeChanged += 1;
      }

      return summary;
    },
    {
      total: 0,
      same: 0,
      different: 0,
      missingLeft: 0,
      missingRight: 0,
      typeChanged: 0,
    },
  );
}

export function filterDiffRowsByPaths(rows: DiffRow[], selectedPaths: string[]): DiffRow[] {
  if (selectedPaths.length === 0) {
    return rows;
  }

  const selectedPathSet = new Set(selectedPaths);
  return rows.filter((row) => selectedPathSet.has(row.path));
}
