/**
 * Shared display formatters for table cells.
 *
 * Values are rendered as compact, self-explanatory strings ("1.2 MB") so that
 * table columns stay narrow. When a value is not yet available (the backend
 * has not started reporting it), the dash keeps the column aligned without
 * implying a real measurement.
 */

const UNKNOWN_VALUE = "—";
const BINARY_STEP = 1024;

const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

/**
 * Formats a byte count as a human-readable size using binary (1024) units,
 * e.g. 0 -> "0 B", 2048 -> "2 KB", 5_242_880 -> "5 MB".
 *
 * Returns the dash placeholder for missing or invalid values so the caller
 * can rely on the result for display directly.
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

  // Keep one decimal for KB and above; whole bytes stay without decimals.
  return `${value.toFixed(1)} ${BYTE_UNITS[unitIndex]}`;
}
