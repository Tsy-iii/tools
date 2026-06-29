import { getFieldPathCandidates } from "@/utils/fieldPath";

export type SearchMode = "fuzzy" | "exact";

function getLeafField(path: string): string {
  const lastSegment = path.split(".").pop() ?? path;
  const bracketMatch = lastSegment.match(/([^\[\]]+)/g);
  return bracketMatch?.[bracketMatch.length - 1] ?? lastSegment;
}

export function isPathMatched(path: string, query: string, mode: SearchMode): boolean {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return false;
  }

  const candidatePaths = getFieldPathCandidates(path);
  const normalizedPaths = candidatePaths.map((candidate) => candidate.toLowerCase());
  const leafFields = candidatePaths.map((candidate) => getLeafField(candidate).toLowerCase());

  if (mode === "exact") {
    return normalizedPaths.includes(normalizedQuery) || leafFields.includes(normalizedQuery);
  }

  return normalizedPaths.some((candidate) => candidate.includes(normalizedQuery)) || leafFields.some((leaf) => leaf.includes(normalizedQuery));
}

export function getHighlightRange(path: string, query: string, mode: SearchMode): [number, number] | null {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return null;
  }

  const normalizedPath = path.toLowerCase();
  const directIndex = normalizedPath.indexOf(normalizedQuery);

  if (mode === "fuzzy" && directIndex > -1) {
    return [directIndex, directIndex + normalizedQuery.length];
  }

  const aliasDirectMatch = getFieldPathCandidates(path).some((candidate) => candidate.toLowerCase() === normalizedQuery);

  if (mode === "exact") {
    if (aliasDirectMatch) {
      return [0, path.length];
    }

    if (normalizedPath === normalizedQuery) {
      return [0, path.length];
    }

    const segments = path.split(".");
    const leaf = segments[segments.length - 1] ?? path;

    if (leaf.toLowerCase() === normalizedQuery) {
      const index = path.length - leaf.length;
      return [index, path.length];
    }
  }

  return directIndex > -1 ? [directIndex, directIndex + normalizedQuery.length] : null;
}
