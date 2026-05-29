/**
 * Convert a human-readable decimal amount (e.g. "250.5") to base units (wei/fri)
 * using the token's `decimals`. Throws on malformed input or precision that would
 * be silently truncated (e.g. "0.001" for a 2-decimal token).
 */
export function parseHumanAmount(raw: string, decimals: number): bigint {
  const value = raw.trim();
  if (!/^\d+(\.\d+)?$/.test(value)) {
    throw new Error(`"${raw}" is not a valid non-negative decimal amount`);
  }

  const [whole, frac = ""] = value.split(".");
  if (frac.length > decimals) {
    throw new Error(
      `"${raw}" has more than ${decimals} decimal places (token precision)`,
    );
  }

  const padded = frac.padEnd(decimals, "0");
  const base = BigInt(whole) * 10n ** BigInt(decimals) + BigInt(padded || "0");
  if (base <= 0n) {
    throw new Error(`"${raw}" must be greater than zero`);
  }
  return base;
}
