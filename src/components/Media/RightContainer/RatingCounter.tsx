import { useEffect, useState } from 'react';
import { animate } from 'motion/react';

type PropTypes = {
  value: number;
  play: boolean;
  duration?: number;
  delay?: number; // seconds to wait before starting, so it's not mid/done by the time it's visible
};

// Counts up from 0.0 to the actual rating once `play` turns true (the card
// is actually visible), instead of just fading in a static number.
export default function RatingCounter({
  value,
  play,
  duration = 2,
  delay = 1,
}: PropTypes) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!play) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(value);
      return;
    }

    const controls = animate(0, value, {
      duration,
      delay,
      ease: [0.33, 1, 0.68, 1], // cubic-bezier ease-out: slows down at the end
      onUpdate: (latest) => setDisplay(latest),
    });

    return () => controls.stop();
  }, [play, value, duration, delay]);

  return <>{display.toFixed(1)}</>;
}
