export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

export function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

export function asOneOf<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  return typeof value === 'string' && (options as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

/** Accepts either an array or an id-keyed object and returns its entries. */
export function recordValues(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  return isRecord(value) ? Object.values(value) : [];
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
