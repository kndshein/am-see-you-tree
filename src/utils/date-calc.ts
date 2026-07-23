const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export default function dateCalc(dateStr?: string): string {
  if (!dateStr || typeof dateStr !== 'string') return '';
  
  // Format expected: YYYY-MM-DD
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;

  const [year, monthStr, day] = parts;
  const monthIdx = parseInt(monthStr, 10) - 1;
  const month = MONTHS[monthIdx] ?? '';

  if (!month) return dateStr;

  return `${day} ${month} ${year}`;
}
