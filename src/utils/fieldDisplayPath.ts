function splitFieldPath(path: string): string[] {
  return path.match(/[^.]+/g) ?? [path];
}

function getSegmentBase(segment: string): string {
  return segment.replace(/(\[[^\]]+\])+$/g, "");
}

function isNumericSegment(segment: string): boolean {
  const base = getSegmentBase(segment);
  return /^\d+$/.test(base);
}

export function getLeafFieldPath(path: string): string {
  if (!path || path === "$") {
    return path;
  }

  const segments = splitFieldPath(path);

  if (segments.length <= 1) {
    return path;
  }

  const lastSegment = segments[segments.length - 1];

  if (!isNumericSegment(lastSegment)) {
    return lastSegment;
  }

  return lastSegment;
}
