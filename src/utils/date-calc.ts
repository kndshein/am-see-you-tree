const MONTHS = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
];

export default function dateCalc(date_str?: string): string {
  if (!date_str || typeof date_str !== 'string') return '';

  // Format expected: YYYY-MM-DD, or YYYY-MM for things only known to the
  // month (About.tsx's patch notes) — same MON YYYY styling, just without a
  // day that was never real.
  const parts = date_str.split('-');
  if (parts.length < 2) return date_str;

  const [year, month_str, day] = parts;
  const month_idx = parseInt(month_str, 10) - 1;
  const month = MONTHS[month_idx] ?? '';

  if (!month) return date_str;

  // Dash-separated, matching the rest of the HUD's system-readout labels
  // (dashify, format.ts).
  return day ? `${day}-${month}-${year}` : `${month}-${year}`;
}

// Seconds-since-epoch representation of the same date, used as the
// scramble animation's starting text.
export function dateEpochSeed(date_str?: string): string {
  if (!date_str || typeof date_str !== 'string') return '';
  const ms = new Date(date_str).getTime();
  if (Number.isNaN(ms)) return '';
  return String(Math.floor(ms / 1000));
}
