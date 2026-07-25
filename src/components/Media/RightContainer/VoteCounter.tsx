import { useEffect, useState } from 'react';
import { animate } from 'motion/react';
import scoreColor from '../../../utils/score-color';

type PropTypes = {
  value: number; // target percentage (0-100)
  play: boolean;
  duration?: number;
  delay?: number; // seconds to wait before starting, so it's not mid/done by the time it's visible
  onColorChange?: (color: string) => void;
};

// Counts up from 0% to the actual rating once `play` turns true (the card
// is actually visible), instead of just fading in a static number. Reports
// the score-driven color at every step so the parent can sweep the
// text/border color live as the number climbs.
export default function VoteCounter({
  value,
  play,
  duration = 1,
  delay = 1,
  onColorChange,
}: PropTypes) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!play) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(value);
      onColorChange?.(scoreColor(value));
      return;
    }

    const controls = animate(0, value, {
      duration,
      delay,
      ease: [0.33, 1, 0.68, 1], // cubic-bezier ease-out: slows down at the end
      onUpdate: (latest) => {
        setDisplay(latest);
        onColorChange?.(scoreColor(latest));
      },
    });

    return () => controls.stop();
  }, [play, value, duration, delay, onColorChange]);

  return <>{Math.round(display)}%</>;
}
