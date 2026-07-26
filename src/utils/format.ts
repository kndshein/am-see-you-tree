// A raw five-digit vote count sitting beside a percentage reads as a second,
// larger score. Abbreviating keeps it obviously subordinate.
export function compactCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}m`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}k`;
  return String(count);
}

// Box-office figures run to ten digits; nobody reads those as numbers.
export function compactCurrency(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${Math.round(value / 1_000_000)}M`;
  return `$${value.toLocaleString('en-US')}`;
}

// System/HUD-style labels read as "REVERSE-CHRONOLOGICAL" rather than
// "REVERSE CHRONOLOGICAL" — a dash between words instead of a space, matching
// the terminal-readout feel the rest of the HUD already has (MCU // DATABASE,
// Record.tsx's TV.S01.E01-03). Kept as a display-only transform (not baked
// into the underlying label strings) so anything that compares or stores
// those strings — App.tsx's OrderType values, its URL param mapping — is
// untouched.
export function dashify(text: string): string {
  return text.replace(/\s+/g, '-');
}
