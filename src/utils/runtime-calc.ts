export default function runtimeCalc(minutes?: number): string {
  if (!minutes || minutes <= 0) return '';
  const hour = Math.floor(minutes / 60);
  const min = minutes % 60;
  if (hour === 0) return `${min}min`;
  if (min === 0) return `${hour}h`;
  return `${hour}h ${min}min`;
}
