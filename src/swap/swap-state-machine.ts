import type { SwapLifecycleState } from "@/core/models/types";

const transitions: Record<SwapLifecycleState, SwapLifecycleState[]> = {
  idle: ["quoting", "unsupported"],
  quoting: ["quoted", "failed", "unsupported"],
  quoted: ["reviewing", "failed", "unsupported"],
  reviewing: ["approval-required", "executing", "failed", "unsupported"],
  "approval-required": ["executing", "failed"],
  executing: ["submitted", "failed"],
  submitted: ["pending", "confirmed", "failed"],
  pending: ["confirmed", "failed"],
  confirmed: [],
  failed: [],
  unsupported: []
};

export function canTransition(current: SwapLifecycleState, next: SwapLifecycleState): boolean {
  return transitions[current].includes(next);
}
