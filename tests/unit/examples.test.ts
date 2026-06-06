import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const examples = [
  "01-docs-only",
  "02-dependency-change",
  "03-ci-change",
  "04-auth-security",
  "05-large-mixed"
];

describe("public examples", () => {
  it("include source, terminal output and generated brief files", async () => {
    for (const example of examples) {
      const dir = join("examples", example);
      const source = await readFile(join(dir, "source.md"), "utf8");
      const terminal = await readFile(join(dir, "terminal.txt"), "utf8");
      const markdown = await readFile(join(dir, "review-brief.md"), "utf8");
      const json = JSON.parse(await readFile(join(dir, "review-brief.json"), "utf8")) as {
        schema_version?: string;
        signals?: unknown[];
      };
      const agentContext = await readFile(join(dir, "agent-context.md"), "utf8");

      expect(source).toContain("Why this example");
      expect(terminal).toContain("PR Signal:");
      expect(markdown).toContain("# PR Brief");
      expect(json.schema_version).toBe("review-brief.v1");
      expect(json.signals?.length).toBeGreaterThan(0);
      expect(agentContext).toContain("# Agent Context");
    }
  });
});
