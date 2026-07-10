import Decimal from 'decimal.js';

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export type DecimalInput = Decimal.Value | Decimal;

/** Normalizes supported numeric input into the configured Decimal representation. */
export function decimal(value: DecimalInput | null | undefined): Decimal {
  return value instanceof Decimal ? value : new Decimal(value ?? 0);
}

/** Adds monetary values without binary floating-point conversion. */
export function add(a: DecimalInput, b: DecimalInput): Decimal {
  return decimal(a).plus(decimal(b));
}

/** Subtracts monetary values without binary floating-point conversion. */
export function subtract(a: DecimalInput, b: DecimalInput): Decimal {
  return decimal(a).minus(decimal(b));
}

/** Multiplies a decimal amount by an integer token count. */
export function multiplyInteger(amount: DecimalInput, value: number | null | undefined): Decimal {
  return decimal(amount).times(value ?? 0);
}

/** Divides and rounds to the backend's ten-decimal monetary scale. */
export function divideIntegerHalfUp(amount: DecimalInput, divisor: number): Decimal {
  return decimal(amount).dividedBy(divisor).toDecimalPlaces(10, Decimal.ROUND_HALF_UP);
}

/** Reports whether a decimal amount is greater than zero. */
export function isPositive(amount: DecimalInput): boolean {
  return decimal(amount).greaterThan(0);
}

/** Formats an amount with a stable number of fractional digits. */
export function toDecimalString(amount: DecimalInput, fractionDigits = 10): string {
  return decimal(amount).toFixed(fractionDigits);
}

/** Converts non-monetary aggregate values to a JavaScript number. */
export function toNumber(amount: DecimalInput): number {
  return decimal(amount).toNumber();
}

export const ZERO = new Decimal(0);
