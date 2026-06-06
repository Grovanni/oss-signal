import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  loadPrSignalConfig,
  matchesAnyPathPattern,
  mergePrSignalConfig
} from "../../src/config/config.js";

describe("PR Signal config", () => {
  it("loads a minimal YAML config", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pr-signal-config-"));
    const path = join(dir, "pr-signal.yml");

    await writeFile(
      path,
      [
        "attention_thresholds:",
        "  medium_files_changed: 8",
        "  large_files_changed: 30",
        "paths:",
        "  security:",
        '    - "app/identity/**"',
        "automation_paths:",
        '  - ".github/actions/**"',
        "ignore_paths:",
        '  - "docs/generated/**"',
        ""
      ].join("\n"),
      "utf8"
    );

    const loaded = await loadPrSignalConfig(path);

    expect(loaded.path).toBe(path);
    expect(loaded.config.attention_thresholds.medium_files_changed).toBe(8);
    expect(loaded.config.attention_thresholds.large_files_changed).toBe(30);
    expect(loaded.config.paths.security).toEqual(["app/identity/**"]);
    expect(loaded.config.paths.automation).toEqual([".github/actions/**"]);
    expect(loaded.config.ignore_paths).toEqual(["docs/generated/**"]);
  });

  it("matches common glob patterns deterministically", () => {
    expect(matchesAnyPathPattern("tests/unit/parser.test.ts", ["**/*.test.ts"])).toBe(true);
    expect(matchesAnyPathPattern("src/auth/session.ts", ["src/auth/**"])).toBe(true);
    expect(matchesAnyPathPattern("src/auth/session.ts", ["docs/**"])).toBe(false);
  });

  it("rejects unknown config keys", () => {
    expect(() => mergePrSignalConfig({ score: true })).toThrow("Unsupported config key");
  });
});
