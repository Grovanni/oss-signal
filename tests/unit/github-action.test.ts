import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("GitHub Action metadata", () => {
  it("defines a non-intrusive integration-friendly action", async () => {
    const metadata = await readFile("action.yml", "utf8");
    const runner = await readFile("scripts/github-action/run.mjs", "utf8");

    expect(metadata).toContain("actions/upload-artifact@v4");
    expect(metadata).toContain("config:");
    expect(metadata).toContain("upload-artifact:");
    expect(metadata).toContain("step-summary:");
    expect(metadata).toContain("fail-on-error:");
    expect(metadata).toContain("outputs:");
    expect(metadata).toContain("recommended-action:");
    expect(metadata).toContain("steps.generate.outputs.attention");
    expect(metadata).toContain("steps.generate.outputs.generated");
    expect(metadata).toContain("if: ${{ inputs.upload-artifact == 'true'");
    expect(runner).toContain("GITHUB_STEP_SUMMARY");
    expect(runner).toContain("GITHUB_OUTPUT");
    expect(runner).toContain("INPUT_CONFIG");
    expect(runner).toContain("INPUT_STEP_SUMMARY");
    expect(runner).toContain("INPUT_FAIL_ON_ERROR");
    expect(runner).toContain("review-brief.json");
    expect(runner).toContain("recommended_action");
    expect(runner).toContain("review-brief.md` was not generated");
    expect(metadata).not.toContain("fail-on:");
    expect(metadata).not.toContain("comment:");
    expect(metadata).not.toContain("pull-requests: write");
  });

  it("documents that PR comments and fail-on review policies are intentionally unsupported", async () => {
    const docs = await readFile("docs/github-action.md", "utf8");

    expect(docs).toContain("does not comment on pull requests by default");
    expect(docs).toContain("Commenting is not supported");
    expect(docs).toContain("does not support `fail-on` review policies");
    expect(docs).toContain("`fail-on-error` input only controls runtime failures");
    expect(docs).toContain("recommended-action");
    expect(docs).toContain("upload-artifact: \"false\"");
  });
});
