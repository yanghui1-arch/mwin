const SCALE = 10n;
const UNIT = 10n ** SCALE;

export function decimal(value) {
  if (value == null) return 0n;
  if (typeof value === 'bigint') return value;
  const raw = String(value).trim();
  if (!raw) return 0n;

  const sign = raw.startsWith('-') ? -1n : 1n;
  const unsigned = raw.replace(/^[+-]/, '');
  const [whole, fraction = ''] = unsigned.split('.');
  const padded = (fraction + '0'.repeat(Number(SCALE))).slice(0, Number(SCALE));
  return sign * (BigInt(whole || '0') * UNIT + BigInt(padded || '0'));
}

export function add(a, b) {
  return decimal(a) + decimal(b);
}

export function subtract(a, b) {
  return decimal(a) - decimal(b);
}

export function multiplyInteger(amount, value) {
  return decimal(amount) * BigInt(value ?? 0);
}

export function divideIntegerHalfUp(amount, divisor) {
  const numerator = decimal(amount);
  const denominator = BigInt(divisor);
  if (denominator === 0n) throw new Error('Cannot divide by zero');

  const sign = numerator < 0n ? -1n : 1n;
  const absolute = numerator < 0n ? -numerator : numerator;
  const quotient = absolute / denominator;
  const remainder = absolute % denominator;
  const rounded = remainder * 2n >= denominator ? quotient + 1n : quotient;
  return sign * rounded;
}

export function toDecimalString(amount, fractionDigits = Number(SCALE)) {
  const value = decimal(amount);
  const sign = value < 0n ? '-' : '';
  const absolute = value < 0n ? -value : value;
  const whole = absolute / UNIT;
  const fraction = (absolute % UNIT).toString().padStart(Number(SCALE), '0');
  if (fractionDigits === 0) return `${sign}${whole}`;
  return `${sign}${whole}.${fraction.slice(0, fractionDigits)}`;
}

export function toNumber(amount) {
  return Number(toDecimalString(amount));
}

export const ZERO = 0n;
