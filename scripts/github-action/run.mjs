#!/usr/bin/env node
import { mkdir, readFile, appendFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const actionPath = process.cwd();
const workspace = process.env.PR_SIGNAL_WORKSPACE || process.env.GITHUB_WORKSPACE || actionPath;
const outDir = process.env.INPUT_OUT || "pr-signal-output";
const outputPath = resolve(workspace, outDir);
const format = process.env.INPUT_FORMAT || "all";
const includeAgentContext = (process.env.INPUT_AGENT_CONTEXT || "true").toLowerCase() !== "false";
const configPath = process.env.INPUT_CONFIG?.trim();
const prUrl = await resolvePullRequestUrl();

await mkdir(outputPath, { recursive: true });

const args = [
  join(actionPath, "dist", "cli", "index.js"),
  "pr",
  prUrl,
  "--out",
  outputPath,
  "--format",
  format
];

if (!includeAgentContext) {
  args.push("--no-agent");
}

if (configPath) {
  args.push("--config", resolve(workspace, configPath));
}

const result = spawnSync(process.execPath, args, {
  cwd: workspace,
  env: process.env,
  encoding: "utf8"
});

if (result.stdout) {
  process.stdout.write(result.stdout);
}

if (result.stderr) {
  process.stderr.write(result.stderr);
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

await appendStepSummary(outputPath);

async function resolvePullRequestUrl() {
  const explicitUrl = process.env.INPUT_PR_URL?.trim();

  if (explicitUrl) {
    return explicitUrl;
  }

  const eventPath = process.env.GITHUB_EVENT_PATH;

  if (!eventPath) {
    throw new Error("No pr-url input and no GITHUB_EVENT_PATH available.");
  }

  const event = JSON.parse(await readFile(eventPath, "utf8"));
  const eventUrl = event?.pull_request?.html_url;

  if (typeof eventUrl !== "string" || eventUrl.length === 0) {
    throw new Error("PR Signal requires a pull_request event or an explicit pr-url input.");
  }

  return eventUrl;
}

async function appendStepSummary(outputPath) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;

  if (!summaryPath) {
    return;
  }

  const briefPath = join(outputPath, "review-brief.md");
  const brief = await readSummaryBrief(briefPath);
  await appendFile(summaryPath, ["## PR Signal", "", brief, ""].join("\n"));
}

async function readSummaryBrief(briefPath) {
  try {
    return await readFile(briefPath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      return "PR Signal completed. `review-brief.md` was not generated for this output format.";
    }

    throw error;
  }
}
