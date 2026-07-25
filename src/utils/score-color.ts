// Percent -> hue (degrees) stops. Most real-world ratings cluster in the
// 60-80% band, so most of the hue range (red -> orange -> yellow -> green)
// is spent differentiating scores inside that band; scores well outside it
// compress toward the extremes since the exact value matters less there.
const HUE_STOPS: Array<[percent: number, hue: number]> = [
  [0, 0],
  [50, 5],
  [60, 20],
  [65, 35],
  [70, 50],
  [75, 65],
  [80, 90],
  [85, 110],
  [100, 130],
];

// `alpha` mutes the color without touching the hue ramp. The vote chip needs
// it because its entrance animation writes an inline opacity, so CSS opacity
// isn't available to it.
export default function scoreColor(percent: number, alpha = 1): string {
  const clamped = Math.max(0, Math.min(100, percent));

  for (let i = 0; i < HUE_STOPS.length - 1; i++) {
    const [p0, h0] = HUE_STOPS[i];
    const [p1, h1] = HUE_STOPS[i + 1];
    if (clamped <= p1) {
      const t = (clamped - p0) / (p1 - p0);
      return `hsla(${h0 + (h1 - h0) * t}, 90%, 55%, ${alpha})`;
    }
  }

  const [, last_hue] = HUE_STOPS[HUE_STOPS.length - 1];
  return `hsla(${last_hue}, 90%, 55%, ${alpha})`;
}
