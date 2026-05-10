import { describe, it, expect } from "vitest";
import { extractJson, extractJsonObject } from "./json";
import {
  cleanDaremasterPostJson,
  fencedDaremasterPostJson,
  malformedJsonText,
  objectWithBracesInStringJson,
  proseWrappedDaremasterPostJson,
  trailingCommentaryDaremasterPostJson,
} from "../../../../../tests/fixtures/llmResponses";

describe("extractJson", () => {
  it("parses clean JSON object", () => {
    const out = extractJson(cleanDaremasterPostJson) as Record<string, unknown>;
    expect(out).not.toBeNull();
    expect(out.trigger).toBe("quality_threat");
    expect(typeof out.content).toBe("string");
  });

  it("parses fenced JSON", () => {
    const out = extractJson(fencedDaremasterPostJson) as Record<string, unknown>;
    expect(out).not.toBeNull();
    expect(out.trigger).toBe("quality_threat");
  });

  it("parses prose-wrapped JSON by slicing first balanced object", () => {
    const out = extractJson(proseWrappedDaremasterPostJson) as Record<string, unknown>;
    expect(out).not.toBeNull();
    expect(out.trigger).toBe("quality_threat");
  });

  it("parses JSON with trailing commentary", () => {
    const out = extractJson(trailingCommentaryDaremasterPostJson) as Record<string, unknown>;
    expect(out).not.toBeNull();
    expect(out.trigger).toBe("quality_threat");
  });

  it("parses array roots", () => {
    const out = extractJson('["a", "b", 3]');
    expect(out).toEqual(["a", "b", 3]);
  });

  it("ignores braces inside strings", () => {
    const out = extractJson(objectWithBracesInStringJson) as Record<string, unknown>;
    expect(out).not.toBeNull();
    expect(out.trigger).toBe("leaderboard_movement");
    expect(typeof out.content).toBe("string");
    expect(out.content as string).toContain("{still}");
  });

  it("returns null for malformed text", () => {
    expect(extractJson(malformedJsonText)).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(extractJson("")).toBeNull();
  });

  it("prefers object root when both an object and array appear", () => {
    // Object appears before the array — slicer should pick the object.
    const text = `Here you go: ${JSON.stringify({ ok: 1 })} ["unrelated"]`;
    expect(extractJson(text)).toEqual({ ok: 1 });
  });
});

describe("extractJsonObject", () => {
  it("accepts object root", () => {
    expect(extractJsonObject(cleanDaremasterPostJson)).not.toBeNull();
  });

  it("rejects array root", () => {
    expect(extractJsonObject('["a", "b"]')).toBeNull();
  });

  it("returns null for malformed text", () => {
    expect(extractJsonObject(malformedJsonText)).toBeNull();
  });
});
