import type { AttentionLevel, Signal } from "./types.js";

export function computeAttentionLevel(signals: Signal[]): AttentionLevel {
  if (signals.some((signal) => signal.level === "high")) {
    return "high";
  }

  if (signals.some((signal) => signal.level === "medium")) {
    return "medium";
  }

  return "low";
}
