#!/usr/bin/env node
import { Command, InvalidArgumentError } from "commander";

import { type OutputFormat, runPrCommand } from "./commands/pr.js";

const outputFormats = new Set<OutputFormat>(["md", "json", "all"]);

function parseOutputFormat(value: string): OutputFormat {
  if (!outputFormats.has(value as OutputFormat)) {
    throw new InvalidArgumentError("Expected one of: md, json, all.");
  }

  return value as OutputFormat;
}

const program = new Command();

program
  .name("pr-signal")
  .description("Generate deterministic GitHub Pull Request intake briefs.")
  .version("0.3.0")
  .showHelpAfterError();

program
  .command("pr")
  .description("Inspect a GitHub Pull Request URL.")
  .argument("<url>", "GitHub Pull Request URL")
  .option("--dry-run", "Parse the URL without fetching GitHub data")
  .option("--fixture <dir>", "Read GitHub PR data from a local fixture instead of the network")
  .option("--config <path>", "Read PR Signal config from a specific file")
  .option("--out <dir>", "Output directory", "./pr-signal-output")
  .option("--format <format>", "Output format: md, json, all", parseOutputFormat, "all")
  .option("--quiet", "Reduce terminal output")
  .option("--no-agent", "Do not generate agent-context.md")
  .action((url: string, options) => {
    return runPrCommand(url, options);
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unexpected error.";
  console.error(`Error: ${message}`);
  process.exitCode = 1;
});
