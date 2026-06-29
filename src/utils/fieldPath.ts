const LEGACY_DATA_DICT_PREFIX = "data_dict.";

export function normalizeFieldPath(path: string): string {
  const trimmed = path.trim();

  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith(LEGACY_DATA_DICT_PREFIX)) {
    return trimmed.slice(LEGACY_DATA_DICT_PREFIX.length);
  }

  return trimmed;
}

export function getFieldPathCandidates(path: string): string[] {
  const normalizedPath = normalizeFieldPath(path);

  if (!normalizedPath) {
    return [];
  }

  const candidates = new Set<string>([normalizedPath, `${LEGACY_DATA_DICT_PREFIX}${normalizedPath}`]);

  if (path.trim()) {
    candidates.add(path.trim());
  }

  return Array.from(candidates);
}

export function resolveAvailableFieldPath(path: string, availablePaths: string[]): string | undefined {
  const availablePathSet = new Set(availablePaths);

  for (const candidate of getFieldPathCandidates(path)) {
    if (availablePathSet.has(candidate)) {
      return candidate;
    }
  }

  return undefined;
}
