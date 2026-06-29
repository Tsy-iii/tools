import { parseJsonInput } from "@/utils/jsonDiff";

export type InputMode = "json" | "curl" | "auto";
export type ResolvedInputFormat = "json" | "curl";
export type CompareSource = "json" | "curl-body-json" | "curl-query" | "curl-form";

export type ParsedInputMeta = {
  resolvedFormat: ResolvedInputFormat;
  compareSource: CompareSource;
  targetLabel: string;
  method?: string;
  url?: string;
  queryCount: number;
  headerCount: number;
  bodyLength: number;
};

export type ParsedInputResult = {
  value?: unknown;
  error?: string;
  meta?: ParsedInputMeta;
};

type CurlParseResult = {
  method: string;
  url?: string;
  query: Record<string, unknown>;
  headers: Record<string, string>;
  bodyText: string;
  compareValue?: unknown;
  compareSource?: CompareSource;
  error?: string;
};

const OPTION_WITH_VALUE = new Set([
  "-u",
  "--user",
  "-b",
  "--cookie",
  "-e",
  "--referer",
  "-A",
  "--user-agent",
  "-o",
  "--output",
  "-w",
  "--write-out",
  "--proxy",
  "--connect-timeout",
  "--max-time",
  "--retry",
  "--interface",
  "--cacert",
  "--cert",
  "--key",
]);

function normalizeParams(params: URLSearchParams): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  for (const [key, value] of params.entries()) {
    const existing = normalized[key];

    if (existing === undefined) {
      normalized[key] = value;
      continue;
    }

    if (Array.isArray(existing)) {
      existing.push(value);
      continue;
    }

    normalized[key] = [existing, value];
  }

  return normalized;
}

function isStructuredObject(value: unknown): boolean {
  return typeof value === "object" && value !== null;
}

function isLikelyCurl(raw: string): boolean {
  return /^\s*curl\b/.test(raw);
}

function sanitizeShellValue(value?: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();

  if (trimmed.startsWith("`") && trimmed.endsWith("`") && trimmed.length >= 2) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

function resolveMode(raw: string, mode: InputMode): ResolvedInputFormat {
  if (mode !== "auto") {
    return mode;
  }

  return isLikelyCurl(raw) ? "curl" : "json";
}

function normalizeCurlCommandInput(input: string): string {
  return input
    .replace(/\r\n/g, "\n")
    .replace(/\\[ \t]*\n/g, " ");
}

function tokenizeShellCommand(input: string): { tokens?: string[]; error?: string } {
  const normalizedInput = normalizeCurlCommandInput(input);
  const tokens: string[] = [];
  let current = "";
  let quote: "single" | "double" | "ansiSingle" | null = null;
  let escaping = false;

  for (let index = 0; index < normalizedInput.length; index += 1) {
    const char = normalizedInput[index];

    if (escaping) {
      if (char === "\n") {
        escaping = false;
        continue;
      }

      current += char;
      escaping = false;
      continue;
    }

    if (quote === "ansiSingle") {
      if (char === "\\") {
        const nextChar = normalizedInput[index + 1];

        if (nextChar === undefined) {
          current += char;
          continue;
        }

        const escapeMap: Record<string, string> = {
          "\\": "\\",
          "'": "'",
          '"': '"',
          n: "\n",
          r: "\r",
          t: "\t",
          b: "\b",
          f: "\f",
          v: "\v",
          a: "\x07",
        };

        if (nextChar in escapeMap) {
          current += escapeMap[nextChar];
          index += 1;
          continue;
        }

        if (nextChar === "\n") {
          index += 1;
          continue;
        }

        current += nextChar;
        index += 1;
        continue;
      }

      if (char === "'") {
        quote = null;
      } else {
        current += char;
      }
      continue;
    }

    if (quote === "single") {
      if (char === "'") {
        quote = null;
      } else {
        current += char;
      }
      continue;
    }

    if (quote === "double") {
      if (char === '"') {
        quote = null;
        continue;
      }

      if (char === "\\") {
        const nextChar = input[index + 1];

        if (nextChar === "\n") {
          index += 1;
          continue;
        }

        if (nextChar && ['"', "\\", "$", "`"].includes(nextChar)) {
          current += nextChar;
          index += 1;
          continue;
        }
      }

      current += char;
      continue;
    }

    if (char === "\\") {
      escaping = true;
      continue;
    }

    if (char === "'") {
      quote = "single";
      continue;
    }

    if (char === "$" && normalizedInput[index + 1] === "'") {
      quote = "ansiSingle";
      index += 1;
      continue;
    }

    if (char === '"') {
      quote = "double";
      continue;
    }

    if (/\s/.test(char)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    current += char;
  }

  if (escaping || quote) {
    return { error: "cURL 命令存在未闭合的引号或续行符，请检查粘贴内容。" };
  }

  if (current) {
    tokens.push(current);
  }

  return { tokens };
}

function readOptionValue(tokens: string[], index: number, fallbackPrefix: string): { value?: string; nextIndex: number } {
  const token = tokens[index];

  if (token.length > fallbackPrefix.length) {
    return {
      value: token.slice(fallbackPrefix.length),
      nextIndex: index,
    };
  }

  return {
    value: tokens[index + 1],
    nextIndex: index + 1,
  };
}

function tryParseJsonText(text: string): unknown | undefined {
  const primary = parseJsonInput(text);

  if (!primary.error) {
    return primary.value;
  }

  const normalizedEscaped = text.replace(/\\"/g, '"');
  const retry = parseJsonInput(normalizedEscaped);
  return retry.error ? undefined : retry.value;
}

function tryParseFormText(text: string): Record<string, unknown> | undefined {
  if (!text.includes("=")) {
    return undefined;
  }

  try {
    const params = new URLSearchParams(text);
    const normalized = normalizeParams(params);
    return Object.keys(normalized).length > 0 ? normalized : undefined;
  } catch {
    return undefined;
  }
}

function joinDataParts(parts: string[], preferJson: boolean): string {
  if (parts.length <= 1) {
    return parts[0] ?? "";
  }

  return preferJson ? parts.join("") : parts.join("&");
}

function parseCurlInput(raw: string): CurlParseResult {
  const tokenized = tokenizeShellCommand(raw);

  if (tokenized.error) {
    return {
      method: "GET",
      query: {},
      headers: {},
      bodyText: "",
      error: tokenized.error,
    };
  }

  const tokens = tokenized.tokens ?? [];

  if (tokens[0] !== "curl") {
    return {
      method: "GET",
      query: {},
      headers: {},
      bodyText: "",
      error: "cURL 模式下请输入以 curl 开头的命令。",
    };
  }

  let method = "";
  let url = "";
  let forceGet = false;
  const headers: Record<string, string> = {};
  const dataParts: string[] = [];

  for (let index = 1; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (token === "-X" || token === "--request" || token.startsWith("-X") || token.startsWith("--request=")) {
      const { value, nextIndex } = token === "-X" || token === "--request"
        ? { value: tokens[index + 1], nextIndex: index + 1 }
        : token.startsWith("-X")
          ? readOptionValue(tokens, index, "-X")
          : { value: token.slice("--request=".length), nextIndex: index };
      method = sanitizeShellValue(value) ?? method;
      index = nextIndex;
      continue;
    }

    if (token === "--url" || token.startsWith("--url=")) {
      if (token === "--url") {
        url = sanitizeShellValue(tokens[index + 1]) ?? url;
        index += 1;
      } else {
        url = sanitizeShellValue(token.slice("--url=".length)) || url;
      }
      continue;
    }

    if (token === "-H" || token === "--header" || token.startsWith("-H") || token.startsWith("--header=")) {
      const { value, nextIndex } = token === "-H" || token === "--header"
        ? { value: tokens[index + 1], nextIndex: index + 1 }
        : token.startsWith("-H")
          ? readOptionValue(tokens, index, "-H")
          : { value: token.slice("--header=".length), nextIndex: index };

      const normalizedHeader = sanitizeShellValue(value);

      if (normalizedHeader) {
        const separatorIndex = normalizedHeader.indexOf(":");
        if (separatorIndex > -1) {
          const key = normalizedHeader.slice(0, separatorIndex).trim();
          const headerValue = normalizedHeader.slice(separatorIndex + 1).trim();
          headers[key.toLowerCase()] = headerValue;
        }
      }

      index = nextIndex;
      continue;
    }

    if (
      token === "-d" ||
      token === "--data" ||
      token === "--data-raw" ||
      token === "--data-binary" ||
      token === "--data-urlencode" ||
      token.startsWith("-d") ||
      token.startsWith("--data=") ||
      token.startsWith("--data-raw=") ||
      token.startsWith("--data-binary=") ||
      token.startsWith("--data-urlencode=")
    ) {
      let value = "";
      let nextIndex = index;

      if (token === "-d" || token === "--data" || token === "--data-raw" || token === "--data-binary" || token === "--data-urlencode") {
        value = tokens[index + 1] ?? "";
        nextIndex = index + 1;
      } else if (token.startsWith("-d")) {
        ({ value, nextIndex } = readOptionValue(tokens, index, "-d"));
      } else {
        const [optionName, optionValue] = token.split("=", 2);
        value = optionValue ?? "";
        nextIndex = index;

        if (optionName === "--data-urlencode") {
          value = optionValue ?? "";
        }
      }

      const normalizedValue = sanitizeShellValue(value) ?? "";
      dataParts.push(normalizedValue.startsWith("$") && normalizedValue[1] !== undefined ? normalizedValue.slice(1) : normalizedValue);
      index = nextIndex;
      continue;
    }

    if (token === "-G" || token === "--get") {
      forceGet = true;
      continue;
    }

    if (OPTION_WITH_VALUE.has(token)) {
      index += 1;
      continue;
    }

    if (token.startsWith("-")) {
      continue;
    }

    if (!url) {
      url = sanitizeShellValue(token) ?? token;
    }
  }

  const normalizedMethod = (method || (dataParts.length > 0 && !forceGet ? "POST" : "GET")).toUpperCase();
  const urlValue = url || undefined;
  const contentType = headers["content-type"]?.toLowerCase() ?? "";

  let query = {};
  if (urlValue) {
    try {
      const parsedUrl = new URL(urlValue, "https://placeholder.local");
      query = normalizeParams(parsedUrl.searchParams);
    } catch {
      query = {};
    }
  }

  const preferJson = contentType.includes("application/json");
  const bodyText = joinDataParts(dataParts, preferJson);

  if (forceGet && bodyText) {
    const queryFromData = tryParseFormText(bodyText);
    if (queryFromData) {
      query = { ...query, ...queryFromData };
    }
  }

  if (bodyText && !forceGet) {
    const bodyJson = tryParseJsonText(bodyText);
    if (bodyJson !== undefined) {
      return {
        method: normalizedMethod,
        url: urlValue,
        query,
        headers,
        bodyText,
        compareValue: bodyJson,
        compareSource: "curl-body-json",
      };
    }

    const formObject = tryParseFormText(bodyText);
    if (formObject) {
      return {
        method: normalizedMethod,
        url: urlValue,
        query,
        headers,
        bodyText,
        compareValue: formObject,
        compareSource: "curl-form",
      };
    }

    return {
      method: normalizedMethod,
      url: urlValue,
      query,
      headers,
      bodyText,
      error: "已解析到 cURL 请求，但未能从 body 中提取结构化 JSON 或参数数据，请检查 --data 内容。",
    };
  }

  if (Object.keys(query).length > 0) {
    return {
      method: normalizedMethod,
      url: urlValue,
      query,
      headers,
      bodyText,
      compareValue: query,
      compareSource: "curl-query",
    };
  }

  return {
    method: normalizedMethod,
    url: urlValue,
    query,
    headers,
    bodyText,
    error: "已解析到 cURL 请求，但没有提取到可对比的 JSON body 或 URL 参数。",
  };
}

function buildJsonMeta(): ParsedInputMeta {
  return {
    resolvedFormat: "json",
    compareSource: "json",
    targetLabel: "JSON 根对象",
    queryCount: 0,
    headerCount: 0,
    bodyLength: 0,
  };
}

function buildCurlMeta(result: CurlParseResult): ParsedInputMeta {
  const compareSource = result.compareSource ?? "curl-body-json";

  return {
    resolvedFormat: "curl",
    compareSource,
    targetLabel:
      compareSource === "curl-body-json"
        ? "提取的 JSON Body"
        : compareSource === "curl-form"
          ? "提取的表单参数"
          : "URL 查询参数",
    method: result.method,
    url: result.url,
    queryCount: Object.keys(result.query).length,
    headerCount: Object.keys(result.headers).length,
    bodyLength: result.bodyText.length,
  };
}

export function parseComparableInput(raw: string, mode: InputMode): ParsedInputResult {
  if (mode === "json" && isLikelyCurl(raw)) {
    return {
      error: "检测到当前内容是 cURL 命令，请将输入模式切换为“cURL”或“自动识别”后再开始对比。",
    };
  }

  const resolvedFormat = resolveMode(raw, mode);

  if (resolvedFormat === "json") {
    const parsed = parseJsonInput(raw);

    if (parsed.error) {
      return {
        error: mode === "auto" ? `自动识别为 JSON，但解析失败：${parsed.error}` : parsed.error,
      };
    }

    return {
      value: parsed.value,
      meta: buildJsonMeta(),
    };
  }

  const parsedCurl = parseCurlInput(raw);

  if (parsedCurl.error || parsedCurl.compareValue === undefined) {
    return {
      error: parsedCurl.error,
      meta: buildCurlMeta(parsedCurl),
    };
  }

  return {
    value: parsedCurl.compareValue,
    meta: buildCurlMeta(parsedCurl),
  };
}

export function canCompareStructuredValue(value: unknown): boolean {
  return isStructuredObject(value) || typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null;
}
