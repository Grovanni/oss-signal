#!/usr/bin/env node
import { mkdir, readFile, appendFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const actionPath = process.cwd();
const workspace = process.env.PR_SIGNAL_WORKSPACE || process.env.GITHUB_WORKSPACE || actionPath;
const outDir = process.env.INPUT_OUT || "pr-signal-output";
const outputPath = resolve(workspace, outDir);
const format = (process.env.INPUT_FORMAT || "all").toLowerCase();
const includeAgentContext = readBooleanInput("INPUT_AGENT_CONTEXT", true);
const writeStepSummary = readBooleanInput("INPUT_STEP_SUMMARY", true);
const failOnError = readBooleanInput("INPUT_FAIL_ON_ERROR", true);
const configPath = process.env.INPUT_CONFIG?.trim();

try {
  await runAction();
} catch (error) {
  const message = formatErrorMessage(error);
  console.error(message);
  await writeActionOutputs({
    ...buildPathOutputs(outputPath, false),
    generated: "false",
    "error-message": message
  });

  if (writeStepSummary) {
    await appendFailureSummary(message);
  }

  if (failOnError) {
    process.exit(1);
  }
}

async function runAction() {
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
    throw new Error(formatCliFailure(result));
  }

  await writeActionOutputs({
    ...buildPathOutputs(outputPath, true),
    ...(await readReviewJsonOutputs(outputPath)),
    generated: "true",
    "error-message": ""
  });

  if (writeStepSummary) {
    await appendStepSummary(outputPath);
  }
}

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

async function appendFailureSummary(message) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;

  if (!summaryPath) {
    return;
  }

  await appendFile(
    summaryPath,
    ["## PR Signal", "", "PR Signal did not generate a brief.", "", message, ""].join("\n")
  );
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

function buildPathOutputs(outputPath, generated) {
  const normalizedFormat = format.toLowerCase();
  const writesMarkdown = generated && (normalizedFormat === "md" || normalizedFormat === "all");
  const writesJson = generated && (normalizedFormat === "json" || normalizedFormat === "all");
  const writesAgentContext = generated && includeAgentContext;

  return {
    "output-directory": outputPath,
    "review-brief-path": writesMarkdown ? join(outputPath, "review-brief.md") : "",
    "review-json-path": writesJson ? join(outputPath, "review-brief.json") : "",
    "agent-context-path": writesAgentContext ? join(outputPath, "agent-context.md") : "",
    attention: "",
    "recommended-action": ""
  };
}

async function readReviewJsonOutputs(outputPath) {
  try {
    const json = JSON.parse(await readFile(join(outputPath, "review-brief.json"), "utf8"));
    return {
      attention: typeof json.attention === "string" ? json.attention : "",
      "recommended-action":
        typeof json.recommended_action === "string" ? json.recommended_action : ""
    };
  } catch (error) {
    if (error?.code === "ENOENT") {
      return {};
    }

    throw error;
  }
}

async function writeActionOutputs(outputs) {
  const outputFile = process.env.GITHUB_OUTPUT;

  if (!outputFile) {
    return;
  }

  const lines = Object.entries(outputs).map(
    ([name, value]) => `${name}=${String(value).replace(/\r?\n/g, " ")}`
  );
  await appendFile(outputFile, `${lines.join("\n")}\n`);
}

function readBooleanInput(name, defaultValue) {
  const raw = process.env[name]?.trim().toLowerCase();

  if (!raw) {
    return defaultValue;
  }

  if (["true", "1", "yes", "on"].includes(raw)) {
    return true;
  }

  if (["false", "0", "no", "off"].includes(raw)) {
    return false;
  }

  throw new Error(`${name} must be true or false.`);
}

function formatErrorMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function formatCliFailure(result) {
  const status = result.status ?? 1;
  const detail = (result.stderr || result.stdout || "").trim().replace(/\s+/g, " ");

  if (!detail) {
    return `PR Signal exited with status ${status}.`;
  }

  return `PR Signal exited with status ${status}. ${detail}`;
}
