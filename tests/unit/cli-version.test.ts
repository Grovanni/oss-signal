import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("compiled CLI version", () => {
  it("matches package.json", () => {
    const root = process.cwd();
    const packageJson = JSON.parse(
      readFileSync(resolve(root, "package.json"), "utf8")
    ) as { version: string };

    const output = execFileSync(
      process.execPath,
      [resolve(root, "dist/cli/index.js"), "--version"],
      { encoding: "utf8" }
    ).trim();

    expect(output).toBe(packageJson.version);
  });
});
