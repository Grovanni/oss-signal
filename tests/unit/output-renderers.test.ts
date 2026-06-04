import { randomUUID } from "node:crypto";
import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { buildPrResult } from "../../src/cli/commands/pr.js";
import {
  buildReviewBriefJson,
  renderAgentContextMarkdown,
  renderReviewBriefMarkdown
} from "../../src/output/review-brief.js";
import { renderTerminalSummary } from "../../src/output/terminal.js";
import { writeReviewOutputs } from "../../src/output/write-outputs.js";

describe("output renderers", () => {
  it("renders stable review brief JSON and markdown without diff dumps", async () => {
    const result = await fixtureResult();
    const json = buildReviewBriefJson(result);
    const markdown = renderReviewBriefMarkdown(result);
    const agentContext = renderAgentContextMarkdown(result);

    expect(json.schema_version).toBe("review-brief.v1");
    expect(json.attention).toBe("low");
    expect(json.recommended_action).toBe("normal_review");
    expect(json.ci.state).toBe("unknown");
    expect(json.data_confidence.ci_available).toBe(false);
    expect(json.signals.map((signal) => signal.id)).toContain("small_pr");
    expect(markdown).toContain("# PR Brief");
    expect(markdown).toContain("## CI");
    expect(markdown).toContain("## Recommended Action");
    expect(agentContext).toContain("# Agent Context");
    expect(agentContext).toContain("## Review Objective");
    expect(JSON.stringify(json)).not.toContain("export function normalize");
    expect(markdown).not.toContain("export function normalize");
    expect(agentContext).not.toContain("export function normalize");
  });

  it("writes all default output files", async () => {
    const result = await fixtureResult();
    const outDir = join(tmpdir(), `oss-signal-test-${randomUUID()}`);

    try {
      const written = await writeReviewOutputs(result, {
        outDir,
        format: "all",
        includeAgentContext: true
      });

      expect(written.files.map((file) => file.kind)).toEqual(["markdown", "json", "agent-context"]);
      await expect(readFile(join(outDir, "review-brief.md"), "utf8")).resolves.toContain(
        "# PR Brief"
      );
      await expect(readFile(join(outDir, "review-brief.json"), "utf8")).resolves.toContain(
        '"schema_version": "review-brief.v1"'
      );
      await expect(readFile(join(outDir, "agent-context.md"), "utf8")).resolves.toContain(
        "# Agent Context"
      );
      expect(renderTerminalSummary(result, written)).toContain("OSS Signal: org/repo#123");
    } finally {
      await rm(outDir, { force: true, recursive: true });
    }
  });

  it("does not render cancelled-only CI as failed in human summaries", async () => {
    const result = await fixtureResult();
    result.ci = {
      head_sha: "1111111111111111111111111111111111111111",
      state: "failure",
      total: 1,
      successful: 0,
      failed: 1,
      pending: 0,
      skipped: 0,
      items: [
        {
          kind: "check_run",
          name: "publish",
          state: "failure",
          status: "completed",
          conclusion: "cancelled",
          url: null
        }
      ]
    };

    const markdown = renderReviewBriefMarkdown(result);
    const terminal = renderTerminalSummary(result, { directory: "out", files: [] });

    expect(markdown).toContain("non-critical");
    expect(markdown).toContain("publish: cancelled");
    expect(markdown).not.toContain("failed");
    expect(terminal).toContain("non-critical");
    expect(terminal).not.toContain("failed");
  });

  it("respects json-only output and --no-agent behavior", async () => {
    const result = await fixtureResult();
    const outDir = join(tmpdir(), `oss-signal-test-${randomUUID()}`);

    try {
      const written = await writeReviewOutputs(result, {
        outDir,
        format: "json",
        includeAgentContext: false
      });

      expect(written.files.map((file) => file.kind)).toEqual(["json"]);
      await expect(readFile(join(outDir, "review-brief.json"), "utf8")).resolves.toContain(
        '"recommended_action": "normal_review"'
      );
      await expect(readFile(join(outDir, "agent-context.md"), "utf8")).rejects.toThrow();
    } finally {
      await rm(outDir, { force: true, recursive: true });
    }
  });
});

async function fixtureResult() {
  return buildPrResult("https://github.com/org/repo/pull/123", {
    fixture: join("tests", "fixtures", "github-basic"),
    out: "./oss-signal-output",
    format: "all"
  });
}
