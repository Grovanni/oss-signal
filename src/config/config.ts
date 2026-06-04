import { constants } from "node:fs";
import { access, readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";

import type { FileCategory } from "../classify/categories.js";

export type ReviewThresholds = {
  medium_files_changed: number;
  medium_lines_changed: number;
  large_files_changed: number;
  large_lines_changed: number;
};

export type ConfigurableFileCategory = Exclude<FileCategory, "unknown">;

export type OssSignalConfig = {
  attention_thresholds: ReviewThresholds;
  paths: Partial<Record<ConfigurableFileCategory, string[]>>;
  ignore_paths: string[];
};

export type LoadedOssSignalConfig = {
  config: OssSignalConfig;
  path: string | null;
};

type RawConfig = Record<string, unknown>;

const defaultConfigNames = [
  "oss-signal.yml",
  "oss-signal.yaml",
  ".oss-signal.yml",
  ".oss-signal.yaml",
  "oss-signal.json",
  ".oss-signal.json"
];

const configurableCategories = new Set<ConfigurableFileCategory>([
  "code",
  "tests",
  "documentation",
  "ci",
  "automation",
  "dependencies",
  "configuration",
  "security",
  "migrations",
  "release",
  "build",
  "generated"
]);

const pathAliasSections = new Map<string, ConfigurableFileCategory>([
  ["code_paths", "code"],
  ["test_paths", "tests"],
  ["tests_paths", "tests"],
  ["documentation_paths", "documentation"],
  ["docs_paths", "documentation"],
  ["ci_paths", "ci"],
  ["automation_paths", "automation"],
  ["dependency_paths", "dependencies"],
  ["dependencies_paths", "dependencies"],
  ["configuration_paths", "configuration"],
  ["config_paths", "configuration"],
  ["sensitive_paths", "security"],
  ["security_paths", "security"],
  ["migration_paths", "migrations"],
  ["migrations_paths", "migrations"],
  ["release_paths", "release"],
  ["build_paths", "build"],
  ["generated_paths", "generated"]
]);

export const defaultOssSignalConfig: OssSignalConfig = {
  attention_thresholds: {
    medium_files_changed: 6,
    medium_lines_changed: 201,
    large_files_changed: 20,
    large_lines_changed: 800
  },
  paths: {},
  ignore_paths: []
};

export class OssSignalConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OssSignalConfigError";
  }
}

export async function loadOssSignalConfig(
  configPath?: string,
  cwd = process.cwd()
): Promise<LoadedOssSignalConfig> {
  if (configPath) {
    const resolvedPath = resolve(cwd, configPath);
    const raw = await readConfigFile(resolvedPath);

    return {
      config: mergeOssSignalConfig(parseConfigContent(resolvedPath, raw)),
      path: resolvedPath
    };
  }

  for (const name of defaultConfigNames) {
    const candidate = resolve(cwd, name);

    if (await fileExists(candidate)) {
      const raw = await readConfigFile(candidate);

      return {
        config: mergeOssSignalConfig(parseConfigContent(candidate, raw)),
        path: candidate
      };
    }
  }

  return {
    config: cloneDefaultConfig(),
    path: null
  };
}

export function mergeOssSignalConfig(raw: unknown): OssSignalConfig {
  if (!isRecord(raw)) {
    throw new OssSignalConfigError("Config root must be an object.");
  }

  const config = cloneDefaultConfig();
  const allowedTopLevel = new Set([
    "attention_thresholds",
    "paths",
    "ignore_paths",
    ...pathAliasSections.keys()
  ]);

  for (const key of Object.keys(raw)) {
    if (!allowedTopLevel.has(key)) {
      throw new OssSignalConfigError(`Unsupported config key: ${key}.`);
    }
  }

  const thresholds = raw.attention_thresholds;

  if (thresholds !== undefined) {
    if (!isRecord(thresholds)) {
      throw new OssSignalConfigError("attention_thresholds must be an object.");
    }

    for (const [key, value] of Object.entries(thresholds)) {
      if (!isThresholdKey(key)) {
        throw new OssSignalConfigError(`Unsupported threshold: ${key}.`);
      }

      config.attention_thresholds[key] = readPositiveInteger(value, `attention_thresholds.${key}`);
    }
  }

  const paths = raw.paths;

  if (paths !== undefined) {
    if (!isRecord(paths)) {
      throw new OssSignalConfigError("paths must be an object.");
    }

    for (const [category, value] of Object.entries(paths)) {
      if (!isConfigurableCategory(category)) {
        throw new OssSignalConfigError(`Unsupported paths category: ${category}.`);
      }

      appendConfiguredPaths(config, category, readStringList(value, `paths.${category}`));
    }
  }

  for (const [section, category] of pathAliasSections.entries()) {
    if (raw[section] !== undefined) {
      appendConfiguredPaths(config, category, readStringList(raw[section], section));
    }
  }

  if (raw.ignore_paths !== undefined) {
    config.ignore_paths = readStringList(raw.ignore_paths, "ignore_paths");
  }

  validateThresholdOrder(config.attention_thresholds);

  return config;
}

export function matchesConfiguredPath(
  config: OssSignalConfig,
  category: ConfigurableFileCategory,
  path: string
): boolean {
  return matchesAnyPathPattern(path, config.paths[category] ?? []);
}

export function isIgnoredPath(config: OssSignalConfig, path: string): boolean {
  return matchesAnyPathPattern(path, config.ignore_paths);
}

export function matchesAnyPathPattern(path: string, patterns: string[]): boolean {
  const normalizedPath = normalizePath(path);

  return patterns.some((pattern) => globToRegExp(pattern).test(normalizedPath));
}

function parseConfigContent(path: string, text: string): RawConfig {
  if (extname(path).toLowerCase() === ".json") {
    try {
      const parsed = JSON.parse(text) as unknown;

      if (!isRecord(parsed)) {
        throw new OssSignalConfigError("JSON config root must be an object.");
      }

      return parsed;
    } catch (error) {
      if (error instanceof OssSignalConfigError) {
        throw error;
      }

      throw new OssSignalConfigError(`Invalid JSON config ${path}: ${errorMessage(error)}.`);
    }
  }

  return parseYamlSubset(text, path);
}

function parseYamlSubset(text: string, path: string): RawConfig {
  const raw: RawConfig = {};
  let section: string | null = null;
  let pathCategory: string | null = null;

  for (const [index, originalLine] of text.split(/\r?\n/).entries()) {
    const line = stripInlineComment(originalLine);
    const trimmed = line.trim();

    if (trimmed.length === 0) {
      continue;
    }

    const indent = countIndent(line);
    const lineNumber = index + 1;

    if (indent === 0) {
      const [key, value] = readKeyValue(trimmed, path, lineNumber);
      section = key;
      pathCategory = null;

      if (value !== null) {
        raw[key] = parseScalar(value);
      } else if (key === "attention_thresholds" || key === "paths") {
        raw[key] = {};
      } else {
        raw[key] = [];
      }

      continue;
    }

    if (section === null) {
      throw yamlError(path, lineNumber, "Nested value without a section.");
    }

    if (section === "attention_thresholds") {
      if (indent !== 2) {
        throw yamlError(path, lineNumber, "attention_thresholds entries must use two spaces.");
      }

      const [key, value] = readKeyValue(trimmed, path, lineNumber);

      if (value === null) {
        throw yamlError(path, lineNumber, "Threshold entries must use key: value.");
      }

      const thresholds = ensureRecord(raw, "attention_thresholds");
      thresholds[key] = parseScalar(value);
      continue;
    }

    if (section === "paths") {
      if (indent === 2 && !trimmed.startsWith("- ")) {
        const [category, value] = readKeyValue(trimmed, path, lineNumber);

        if (value !== null) {
          throw yamlError(path, lineNumber, "paths entries must be lists.");
        }

        pathCategory = category;
        ensureRecord(raw, "paths")[category] = [];
        continue;
      }

      if (indent === 4 && trimmed.startsWith("- ")) {
        if (pathCategory === null) {
          throw yamlError(path, lineNumber, "Path list item without a category.");
        }

        const paths = ensureRecord(raw, "paths");
        const list = ensureList(paths, pathCategory);
        list.push(parseScalar(trimmed.slice(2)));
        continue;
      }

      throw yamlError(path, lineNumber, "Unsupported paths syntax.");
    }

    if (section === "ignore_paths" || pathAliasSections.has(section)) {
      if (indent !== 2 || !trimmed.startsWith("- ")) {
        throw yamlError(path, lineNumber, `${section} entries must be a list.`);
      }

      const list = ensureTopLevelList(raw, section);
      list.push(parseScalar(trimmed.slice(2)));
      continue;
    }

    throw yamlError(path, lineNumber, `Unsupported section syntax: ${section}.`);
  }

  return raw;
}

async function readConfigFile(path: string): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    throw new OssSignalConfigError(`Could not read config ${path}: ${errorMessage(error)}.`);
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function cloneDefaultConfig(): OssSignalConfig {
  return {
    attention_thresholds: { ...defaultOssSignalConfig.attention_thresholds },
    paths: {},
    ignore_paths: []
  };
}

function appendConfiguredPaths(
  config: OssSignalConfig,
  category: ConfigurableFileCategory,
  paths: string[]
): void {
  const current = config.paths[category] ?? [];
  config.paths[category] = [...new Set([...current, ...paths])];
}

function readPositiveInteger(value: unknown, key: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new OssSignalConfigError(`${key} must be a positive integer.`);
  }

  return value;
}

function readStringList(value: unknown, key: string): string[] {
  if (!Array.isArray(value)) {
    throw new OssSignalConfigError(`${key} must be a list of path patterns.`);
  }

  return value.map((entry, index) => {
    if (typeof entry !== "string" || entry.trim().length === 0) {
      throw new OssSignalConfigError(`${key}[${index}] must be a non-empty string.`);
    }

    return normalizePattern(entry);
  });
}

function validateThresholdOrder(thresholds: ReviewThresholds): void {
  if (thresholds.medium_files_changed > thresholds.large_files_changed) {
    throw new OssSignalConfigError(
      "attention_thresholds.medium_files_changed must be <= large_files_changed."
    );
  }

  if (thresholds.medium_lines_changed > thresholds.large_lines_changed) {
    throw new OssSignalConfigError(
      "attention_thresholds.medium_lines_changed must be <= large_lines_changed."
    );
  }
}

function isThresholdKey(key: string): key is keyof ReviewThresholds {
  return [
    "medium_files_changed",
    "medium_lines_changed",
    "large_files_changed",
    "large_lines_changed"
  ].includes(key);
}

function isConfigurableCategory(value: string): value is ConfigurableFileCategory {
  return configurableCategories.has(value as ConfigurableFileCategory);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function ensureRecord(raw: RawConfig, key: string): RawConfig {
  const value = raw[key];

  if (!isRecord(value)) {
    raw[key] = {};
    return raw[key] as RawConfig;
  }

  return value;
}

function ensureTopLevelList(raw: RawConfig, key: string): unknown[] {
  const value = raw[key];

  if (!Array.isArray(value)) {
    raw[key] = [];
    return raw[key] as unknown[];
  }

  return value;
}

function ensureList(raw: RawConfig, key: string): unknown[] {
  const value = raw[key];

  if (!Array.isArray(value)) {
    raw[key] = [];
    return raw[key] as unknown[];
  }

  return value;
}

function readKeyValue(
  trimmed: string,
  path: string,
  lineNumber: number
): [key: string, value: string | null] {
  const index = trimmed.indexOf(":");

  if (index < 1) {
    throw yamlError(path, lineNumber, "Expected key: value syntax.");
  }

  const key = trimmed.slice(0, index).trim();
  const value = trimmed.slice(index + 1).trim();

  if (key.length === 0) {
    throw yamlError(path, lineNumber, "Empty key.");
  }

  return [key, value.length > 0 ? value : null];
}

function parseScalar(value: string): string | number {
  const trimmed = value.trim();
  const unquoted = unquote(trimmed);

  if (/^\d+$/.test(unquoted)) {
    return Number(unquoted);
  }

  return unquoted;
}

function unquote(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function stripInlineComment(line: string): string {
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
    } else if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
    } else if (char === "#" && !inSingleQuote && !inDoubleQuote) {
      return line.slice(0, index);
    }
  }

  return line;
}

function countIndent(line: string): number {
  return line.length - line.trimStart().length;
}

function yamlError(path: string, lineNumber: number, message: string): OssSignalConfigError {
  return new OssSignalConfigError(`Invalid YAML config ${path}:${lineNumber}: ${message}`);
}

function normalizePattern(pattern: string): string {
  return normalizePath(pattern.trim());
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").toLowerCase();
}

function globToRegExp(pattern: string): RegExp {
  const normalized = normalizePattern(pattern);
  let source = "^";

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    const next = normalized[index + 1];
    const afterNext = normalized[index + 2];

    if (char === "*" && next === "*" && afterNext === "/") {
      source += "(?:.*/)?";
      index += 2;
    } else if (char === "*" && next === "*") {
      source += ".*";
      index += 1;
    } else if (char === "*") {
      source += "[^/]*";
    } else if (char === "?") {
      source += "[^/]";
    } else {
      source += escapeRegExp(char);
    }
  }

  source += "$";

  return new RegExp(source);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}
