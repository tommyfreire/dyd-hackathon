// Robust JSON extraction from model output.
//
// Models occasionally wrap JSON in ```json fences, prepend an apology, or
// trail an "I hope this helps". We strip fences, find the first `{` or `[`,
// match braces, and parse. Returns `null` on any failure — the caller then
// falls back to deterministic output.

export function extractJson(raw: string): unknown | null {
  if (!raw) return null;

  // Strip ```json … ``` or ``` … ``` fences if present.
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : raw;

  // Try the candidate as-is first.
  const direct = tryParse(candidate.trim());
  if (direct !== undefined) return direct;

  // Fall back to slicing from the first { to the last }.
  const slice = sliceFirstObjectOrArray(candidate);
  if (!slice) return null;
  return tryParse(slice) ?? null;
}

/** Same as extractJson but rejects non-object roots. */
export function extractJsonObject(raw: string): Record<string, unknown> | null {
  const v = extractJson(raw);
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return null;
}

function tryParse(s: string): unknown | undefined {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}

function sliceFirstObjectOrArray(s: string): string | null {
  const firstBrace = s.indexOf("{");
  const firstBracket = s.indexOf("[");
  let start: number;
  let open: string;
  let close: string;
  if (firstBrace === -1 && firstBracket === -1) return null;
  if (firstBrace === -1) {
    start = firstBracket;
    open = "[";
    close = "]";
  } else if (firstBracket === -1 || firstBrace < firstBracket) {
    start = firstBrace;
    open = "{";
    close = "}";
  } else {
    start = firstBracket;
    open = "[";
    close = "]";
  }
  // Track depth, ignoring braces inside strings.
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inString) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}
