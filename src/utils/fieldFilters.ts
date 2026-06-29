import { normalizeFieldPath, resolveAvailableFieldPath } from "@/utils/fieldPath";

export function parseManualFieldInput(raw: string): string[] {
  const segments = raw
    .split(/[\s,，]+/)
    .map((segment) => normalizeFieldPath(segment))
    .filter(Boolean);

  return Array.from(new Set(segments));
}

export function resolveFieldFilterState(params: {
  availablePaths: string[];
  selectedFieldPaths: string[];
  manualFieldInput: string;
  enableManualValidation?: boolean;
}) {
  const manualFieldPaths = parseManualFieldInput(params.manualFieldInput);
  const validManualFieldPaths = params.enableManualValidation
    ? manualFieldPaths
        .map((path) => resolveAvailableFieldPath(path, params.availablePaths))
        .filter((path): path is string => Boolean(path))
    : [];
  const invalidManualFieldPaths = params.enableManualValidation
    ? manualFieldPaths.filter((path) => !resolveAvailableFieldPath(path, params.availablePaths))
    : [];
  const validSelectedFieldPaths = params.selectedFieldPaths
    .map((path) => resolveAvailableFieldPath(path, params.availablePaths))
    .filter((path): path is string => Boolean(path));
  const effectiveFieldPaths = Array.from(new Set([...validSelectedFieldPaths, ...validManualFieldPaths]));
  const hasActiveFieldFilter = validSelectedFieldPaths.length > 0 || manualFieldPaths.length > 0;

  return {
    manualFieldPaths,
    validManualFieldPaths,
    invalidManualFieldPaths,
    validSelectedFieldPaths,
    effectiveFieldPaths,
    hasActiveFieldFilter,
  };
}
