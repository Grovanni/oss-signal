export type AttentionLevel = "low" | "medium" | "high";

export type RecommendedAction =
  | "normal_review"
  | "ask_for_tests"
  | "ask_for_reproduction"
  | "ask_for_clarification"
  | "request_split"
  | "security_review"
  | "wait_for_ci"
  | "dependency_review"
  | "migration_review";

export type SignalLevel = "info" | "medium" | "high";

export type Evidence = {
  kind: "file" | "metadata" | "description" | "diff";
  value: string;
  reason: string;
};

export type Signal = {
  id: string;
  level: SignalLevel;
  title: string;
  message: string;
  evidence: Evidence[];
};

export type ReviewQuestion = {
  signal_id: string;
  question: string;
};

export type PriorityFile = {
  path: string;
  categories: string[];
  changes: number;
  reason: string;
};
