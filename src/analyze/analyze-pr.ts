import {
  classifyChangedFiles,
  countCategories,
  hasCategory,
  type ClassifiedFile
} from "../classify/classify-file.js";
import type { FileCategory } from "../classify/categories.js";
import type { GitHubPullRequestData } from "../github/types.js";
import { computeAttentionLevel } from "../signals/attention-level.js";
import { detectSignals } from "../signals/detect-signals.js";
import { buildReviewQuestions } from "../signals/questions.js";
import { chooseRecommendedAction } from "../signals/recommended-action.js";
import type {
  AttentionLevel,
  PriorityFile,
  RecommendedAction,
  ReviewQuestion,
  Signal
} from "../signals/types.js";

export type PullRequestAnalysis = {
  categories: Record<FileCategory, number>;
  classified_files: ClassifiedFile[];
  signals: Signal[];
  attention: AttentionLevel;
  recommended_action: RecommendedAction;
  priority_files: PriorityFile[];
  questions: ReviewQuestion[];
};

export function analyzePullRequestData(data: GitHubPullRequestData): PullRequestAnalysis {
  const classifiedFiles = classifyChangedFiles(data.files);
  const categories = countCategories(classifiedFiles);
  const signals = detectSignals({
    data,
    files: classifiedFiles,
    categoryCounts: categories
  });
  const attention = computeAttentionLevel(signals);

  return {
    categories,
    classified_files: classifiedFiles,
    signals,
    attention,
    recommended_action: chooseRecommendedAction(signals, attention),
    priority_files: buildPriorityFiles(classifiedFiles),
    questions: buildReviewQuestions(signals)
  };
}

function buildPriorityFiles(files: ClassifiedFile[]): PriorityFile[] {
  return [...files]
    .sort((left, right) => scoreFile(right) - scoreFile(left) || left.path.localeCompare(right.path))
    .slice(0, 5)
    .map((file) => ({
      path: file.path,
      categories: file.categories,
      changes: file.changes,
      reason: priorityReason(file)
    }));
}

function scoreFile(file: ClassifiedFile): number {
  let score = Math.min(file.changes, 500) / 10;

  if (hasCategory(file, "security")) {
    score += 100;
  }

  if (hasCategory(file, "migrations")) {
    score += 80;
  }

  if (hasCategory(file, "dependencies")) {
    score += 60;
  }

  if (hasCategory(file, "ci")) {
    score += 50;
  }

  if (hasCategory(file, "code")) {
    score += 40;
  }

  if (hasCategory(file, "configuration")) {
    score += 25;
  }

  if (hasCategory(file, "tests")) {
    score += 10;
  }

  if (hasCategory(file, "documentation")) {
    score += 5;
  }

  return score;
}

function priorityReason(file: ClassifiedFile): string {
  if (hasCategory(file, "security")) {
    return "security-sensitive path";
  }

  if (hasCategory(file, "migrations")) {
    return "migration or schema path";
  }

  if (hasCategory(file, "dependencies")) {
    return "dependency manifest or lockfile";
  }

  if (hasCategory(file, "ci")) {
    return "CI workflow or pipeline";
  }

  if (hasCategory(file, "code")) {
    return "source code change";
  }

  return file.categories.join(", ");
}
