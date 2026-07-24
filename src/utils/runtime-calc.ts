export default function runtimeCalc(minutes?: number): string {
  if (!minutes || minutes <= 0) return '';
  const hour = Math.floor(minutes / 60);
  const min = minutes % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (hour === 0) return `${pad(min)}MIN`;
  if (min === 0) return `${pad(hour)}HR`;
  return `${pad(hour)}HR.${pad(min)}MIN`;
}

// Millisecond representation of the same runtime, used as the scramble
// animation's starting text.
export function runtimeMsSeed(minutes?: number): string {
  if (!minutes || minutes <= 0) return '';
  return String(minutes * 60000);
}
