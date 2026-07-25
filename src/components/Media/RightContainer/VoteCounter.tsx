import { useCallback, useEffect, useRef } from 'react';
import {
  animate,
  useMotionValueEvent,
  useReducedMotion,
  MotionValue,
} from 'motion/react';

type PropTypes = {
  value: number; // target percentage (0-100)
  play: boolean;
  duration?: number;
  delay?: number; // seconds to wait before starting, so it's not mid/done by the time it's visible
  motion_value: MotionValue<number>; // owned by the parent, which maps it to the live score color
};

// Counts up from 0% to the actual rating once `play` turns true (the card
// is actually visible), instead of just fading in a static number. The count
// lives in a MotionValue and the digits are written straight to the DOM, so
// none of this re-renders React on a per-frame basis.
export default function VoteCounter({
  value,
  play,
  duration = 1,
  delay = 1,
  motion_value,
}: PropTypes) {
  const text_ref = useRef<HTMLSpanElement>(null);
  const should_reduce_motion = useReducedMotion();

  const write = useCallback((latest: number) => {
    if (text_ref.current) {
      text_ref.current.textContent = `${Math.round(latest)}%`;
    }
  }, []);

  useEffect(() => {
    // The MotionValue is owned by the parent, so it outlives this component
    // and still holds the previous run's final score when a card is reopened.
    // Rewind before doing anything else: otherwise `animate` starts and ends
    // on the same number, and since a MotionValue only notifies subscribers on
    // an actual change, nothing would ever overwrite the "0%" below.
    motion_value.set(0);
    write(0);

    if (!play) return;

    if (should_reduce_motion) {
      motion_value.set(value);
      write(value);
      return;
    }

    const controls = animate(motion_value, value, {
      duration,
      delay,
      ease: [0.33, 1, 0.68, 1], // cubic-bezier ease-out: slows down at the end
    });

    return () => controls.stop();
  }, [play, value, duration, delay, motion_value, should_reduce_motion, write]);

  // Only fires on real changes, hence the explicit `write` calls above.
  useMotionValueEvent(motion_value, 'change', write);

  return <span ref={text_ref}>0%</span>;
}
