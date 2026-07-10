import Decimal from 'decimal.js';

Decimal.set({
  precision: 40,
  rounding: Decimal.ROUND_HALF_UP,
});

export function decimal(value) {
  return value instanceof Decimal ? value : new Decimal(value ?? 0);
}

export function add(a, b) {
  return decimal(a).plus(decimal(b));
}

export function subtract(a, b) {
  return decimal(a).minus(decimal(b));
}

export function multiplyInteger(amount, value) {
  return decimal(amount).times(value ?? 0);
}

export function divideIntegerHalfUp(amount, divisor) {
  return decimal(amount).dividedBy(divisor).toDecimalPlaces(10, Decimal.ROUND_HALF_UP);
}

export function isPositive(amount) {
  return decimal(amount).greaterThan(0);
}

export function toDecimalString(amount, fractionDigits = 10) {
  return decimal(amount).toFixed(fractionDigits);
}

export function toNumber(amount) {
  return decimal(amount).toNumber();
}

export const ZERO = new Decimal(0);
