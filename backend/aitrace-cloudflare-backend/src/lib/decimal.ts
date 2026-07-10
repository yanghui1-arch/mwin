import Decimal from 'decimal.js';

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export type DecimalInput = Decimal.Value | Decimal;

export function decimal(value: DecimalInput | null | undefined): Decimal {
  return value instanceof Decimal ? value : new Decimal(value ?? 0);
}

export function add(a: DecimalInput, b: DecimalInput): Decimal {
  return decimal(a).plus(decimal(b));
}

export function subtract(a: DecimalInput, b: DecimalInput): Decimal {
  return decimal(a).minus(decimal(b));
}

export function multiplyInteger(amount: DecimalInput, value: number | null | undefined): Decimal {
  return decimal(amount).times(value ?? 0);
}

export function divideIntegerHalfUp(amount: DecimalInput, divisor: number): Decimal {
  return decimal(amount).dividedBy(divisor).toDecimalPlaces(10, Decimal.ROUND_HALF_UP);
}

export function isPositive(amount: DecimalInput): boolean {
  return decimal(amount).greaterThan(0);
}

export function toDecimalString(amount: DecimalInput, fractionDigits = 10): string {
  return decimal(amount).toFixed(fractionDigits);
}

export function toNumber(amount: DecimalInput): number {
  return decimal(amount).toNumber();
}

export const ZERO = new Decimal(0);
