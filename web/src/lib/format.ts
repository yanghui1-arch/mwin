/**
 * Shared display formatters for table cells.
 *
 * Values render as compact strings so table columns stay narrow; a dash
 * stands in for a missing or invalid value.
 */

const UNKNOWN_VALUE = "—";
const BINARY_STEP = 1024;

const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

/**
 * Formats a byte count using binary (1024) units. Values below 1 KB render as
 * whole bytes; KB and above keep one decimal — 0 -> "0 B", 2048 -> "2.0 KB",
 * 5_242_880 -> "5.0 MB". Missing or invalid values render as a dash.
 */
export function formatByteSize(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes) || bytes < 0) {
    return UNKNOWN_VALUE;
  }

  if (bytes < BINARY_STEP) {
    return `${Math.trunc(bytes)} B`;
  }

  let value = bytes;
  let unitIndex = 0;
  while (value >= BINARY_STEP && unitIndex < BYTE_UNITS.length - 1) {
    value /= BINARY_STEP;
    unitIndex += 1;
  }

  return `${value.toFixed(1)} ${BYTE_UNITS[unitIndex]}`;
}
