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

  // Format expected: YYYY-MM-DD
  const parts = date_str.split('-');
  if (parts.length < 3) return date_str;

  const [year, month_str, day] = parts;
  const month_idx = parseInt(month_str, 10) - 1;
  const month = MONTHS[month_idx] ?? '';

  if (!month) return date_str;

  return `${day}.${month}.${year}`;
}

// Seconds-since-epoch representation of the same date, used as the
// scramble animation's starting text.
export function dateEpochSeed(date_str?: string): string {
  if (!date_str || typeof date_str !== 'string') return '';
  const ms = new Date(date_str).getTime();
  if (Number.isNaN(ms)) return '';
  return String(Math.floor(ms / 1000));
}
