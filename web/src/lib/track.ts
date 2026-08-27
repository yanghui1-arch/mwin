import type { Step } from "@/pages/projects/track/step-columns";
import type { Trace } from "@/pages/projects/track/trace-columns";

/**
 * Adapters that turn raw step/trace list rows from the backend into the
 * frontend `Step`/`Trace` models. Payload metadata (`payloadSize`, and
 * `stepCount` for traces) arrives as either `payloadSize`/`payload_size`
 * (and `stepCount`/`step_count`); values that are absent or not a valid
 * non-negative number normalize to `null` so the UI renders a placeholder
 * instead of breaking.
 */

function toNonNegativeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return null;
}

export function normalizeStep(row: Record<string, unknown>): Step {
  return {
    ...row,
    payloadSize: toNonNegativeNumber(row.payloadSize ?? row.payload_size),
  } as Step;
}

export function normalizeTrace(row: Record<string, unknown>): Trace {
  return {
    ...row,
    payloadSize: toNonNegativeNumber(row.payloadSize ?? row.payload_size),
    stepCount: toNonNegativeNumber(row.stepCount ?? row.step_count),
  } as Trace;
}
