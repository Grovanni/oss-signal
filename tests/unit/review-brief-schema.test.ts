import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { buildPrResult } from "../../src/cli/commands/pr.js";
import { buildReviewBriefJson } from "../../src/output/review-brief.js";

const examples = [
  "01-docs-only",
  "02-dependency-change",
  "03-ci-change",
  "04-auth-security",
  "05-large-mixed"
];

describe("review-brief.v1 JSON schema", () => {
  it("validates committed examples", async () => {
    const schema = await loadSchema();

    for (const example of examples) {
      const json = JSON.parse(
        await readFile(join("examples", example, "review-brief.json"), "utf8")
      ) as unknown;

      expect(validateSchema(json, schema), example).toEqual([]);
    }
  });

  it("validates generated fixture output", async () => {
    const schema = await loadSchema();
    const result = await buildPrResult("https://github.com/org/repo/pull/123", {
      fixture: join("tests", "fixtures", "github-basic"),
      out: "./oss-signal-output",
      format: "all"
    });

    expect(validateSchema(buildReviewBriefJson(result), schema)).toEqual([]);
  });
});

async function loadSchema(): Promise<JsonSchema> {
  return JSON.parse(
    await readFile(join("schemas", "review-brief.v1.schema.json"), "utf8")
  ) as JsonSchema;
}

type JsonSchema = {
  $defs?: Record<string, JsonSchema>;
  $ref?: string;
  type?: string | string[];
  const?: unknown;
  enum?: unknown[];
  required?: string[];
  properties?: Record<string, JsonSchema>;
  additionalProperties?: boolean | JsonSchema;
  items?: JsonSchema;
  minimum?: number;
};

function validateSchema(value: unknown, schema: JsonSchema, root = schema, path = "$"): string[] {
  const resolved = resolveRef(schema, root);
  const errors: string[] = [];

  if ("const" in resolved && value !== resolved.const) {
    errors.push(`${path} expected const ${String(resolved.const)}`);
  }

  if (resolved.enum && !resolved.enum.includes(value)) {
    errors.push(`${path} expected one of ${resolved.enum.join(", ")}`);
  }

  if (resolved.type && !matchesType(value, resolved.type)) {
    errors.push(`${path} expected type ${formatType(resolved.type)}`);
    return errors;
  }

  if (typeof value === "number" && typeof resolved.minimum === "number" && value < resolved.minimum) {
    errors.push(`${path} expected >= ${resolved.minimum}`);
  }

  if (Array.isArray(value) && resolved.items) {
    value.forEach((item, index) => {
      errors.push(...validateSchema(item, resolved.items as JsonSchema, root, `${path}[${index}]`));
    });
  }

  if (isRecord(value)) {
    for (const key of resolved.required ?? []) {
      if (!(key in value)) {
        errors.push(`${path}.${key} is required`);
      }
    }

    for (const [key, propertySchema] of Object.entries(resolved.properties ?? {})) {
      if (key in value) {
        errors.push(...validateSchema(value[key], propertySchema, root, `${path}.${key}`));
      }
    }

    if (isRecord(resolved.additionalProperties)) {
      for (const [key, item] of Object.entries(value)) {
        if (!(key in (resolved.properties ?? {}))) {
          errors.push(
            ...validateSchema(item, resolved.additionalProperties, root, `${path}.${key}`)
          );
        }
      }
    }
  }

  return errors;
}

function resolveRef(schema: JsonSchema, root: JsonSchema): JsonSchema {
  if (!schema.$ref) {
    return schema;
  }

  const prefix = "#/$defs/";

  if (!schema.$ref.startsWith(prefix)) {
    throw new Error(`Unsupported schema ref: ${schema.$ref}`);
  }

  const name = schema.$ref.slice(prefix.length);
  const resolved = root.$defs?.[name];

  if (!resolved) {
    throw new Error(`Missing schema ref: ${schema.$ref}`);
  }

  return resolved;
}

function matchesType(value: unknown, type: string | string[]): boolean {
  const types = Array.isArray(type) ? type : [type];
  return types.some((entry) => {
    switch (entry) {
      case "array":
        return Array.isArray(value);
      case "boolean":
        return typeof value === "boolean";
      case "integer":
        return Number.isInteger(value);
      case "null":
        return value === null;
      case "number":
        return typeof value === "number";
      case "object":
        return isRecord(value);
      case "string":
        return typeof value === "string";
      default:
        throw new Error(`Unsupported schema type: ${entry}`);
    }
  });
}

function formatType(type: string | string[]): string {
  return Array.isArray(type) ? type.join(" | ") : type;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
