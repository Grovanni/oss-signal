import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { buildPrResult } from "../../src/cli/commands/pr.js";

describe("buildPrResult", () => {
  it("summarizes fixture data without printing full diff text", async () => {
    const result = await buildPrResult("https://github.com/org/repo/pull/123", {
      fixture: join("tests", "fixtures", "github-basic"),
      out: "./oss-signal-output",
      format: "all"
    });

    expect(result).toMatchObject({
      mode: "fixture",
      diff: {
        available: true,
        format: "unified"
      },
      analysis: {
        attention: "low",
        recommended_action: "normal_review"
      }
    });
    expect(JSON.stringify(result)).not.toContain("export function normalize");
  });
});
