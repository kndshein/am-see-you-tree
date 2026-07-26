import { useEffect, useRef } from 'react';
import { animate, useReducedMotion } from 'motion/react';

const GLITCH_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ.:';

type PropTypes = {
  final_text: string;
  seed_text: string;
  play: boolean;
  duration?: number; // seconds, matching RatingCounter/motion's convention
  delay?: number; // seconds to wait before starting, so it's not mid/done by the time it's visible
};

// Starts on a raw numeral (epoch seconds / milliseconds), scrambles through
// glitch characters, then reveals the real formatted text left-to-right,
// once `play` turns true (the card is actually visible).
export default function GlitchText({
  final_text,
  seed_text,
  play,
  duration = 1,
  delay = 1,
}: PropTypes) {
  // Written straight to the DOM: this ticks every frame, and React state would
  // re-render RightContainer's whole subtree each time.
  const ref = useRef<HTMLSpanElement>(null);
  const should_reduce_motion = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node || !play) return;

    if (!final_text) {
      node.textContent = '';
      return;
    }

    if (should_reduce_motion) {
      node.textContent = final_text;
      return;
    }

    node.textContent = seed_text || final_text;

    const final_len = final_text.length;
    const seed_len = seed_text.length || final_len;

    // Characters lock into place (left-to-right) during the back half of
    // the animation; the front half is pure scramble/length morph.
    const reveal_start = 0.45;

    // motion owns the timing, delay and cleanup, and `progress` arrives
    // already eased — this only describes what a single frame looks like.
    const controls = animate(0, 1, {
      duration,
      delay,
      ease: [0.33, 1, 0.68, 1], // same ease-out as VoteCounter
      onUpdate: (progress) => {
        const reveal_t = Math.max(
          0,
          (progress - reveal_start) / (1 - reveal_start),
        );
        const reveal_count = Math.floor(reveal_t * final_len);
        const current_len = Math.round(
          seed_len + (final_len - seed_len) * progress,
        );

        let next = '';
        for (let i = 0; i < current_len; i++) {
          next +=
            i < reveal_count && i < final_len
              ? final_text[i]
              : GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
        }
        node.textContent = next;
      },
      onComplete: () => {
        node.textContent = final_text;
      },
    });

    return () => controls.stop();
  }, [play, final_text, seed_text, duration, delay, should_reduce_motion]);

  return <span ref={ref}>{seed_text || final_text}</span>;
}
