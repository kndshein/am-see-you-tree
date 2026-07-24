import { useEffect, useState } from 'react';
import { cubicBezier } from 'motion/react';

const GLITCH_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ.:';
// Same ease-out curve as RatingCounter: slows down at the end.
const ease_out = cubicBezier(0.33, 1, 0.68, 1);

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
  duration = 2,
  delay = 1,
}: PropTypes) {
  const [display, setDisplay] = useState(seed_text || final_text);

  useEffect(() => {
    if (!play) return;

    if (!final_text) {
      setDisplay('');
      return;
    }

    setDisplay(seed_text || final_text);

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(final_text);
      return;
    }

    let raf = 0;
    const duration_ms = duration * 1000;
    const final_len = final_text.length;
    const seed_len = seed_text.length || final_len;

    // Characters lock into place (left-to-right) during the back half of
    // the animation; the front half is pure scramble/length morph.
    const reveal_start = 0.45;

    const tick = (start: number, now: number) => {
      const t = Math.min(1, (now - start) / duration_ms);
      const eased_t = ease_out(t);
      const reveal_t = Math.max(0, (eased_t - reveal_start) / (1 - reveal_start));
      const reveal_count = Math.floor(reveal_t * final_len);
      const current_len = Math.round(seed_len + (final_len - seed_len) * eased_t);

      let next = '';
      for (let i = 0; i < current_len; i++) {
        next +=
          i < reveal_count && i < final_len
            ? final_text[i]
            : GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
      }
      setDisplay(next);

      if (t < 1) {
        raf = requestAnimationFrame((frame_now) => tick(start, frame_now));
      } else {
        setDisplay(final_text);
      }
    };

    const timeout = window.setTimeout(() => {
      raf = requestAnimationFrame((start) => tick(start, start));
    }, delay * 1000);

    return () => {
      window.clearTimeout(timeout);
      cancelAnimationFrame(raf);
    };
  }, [play, final_text, seed_text, duration, delay]);

  return <>{display}</>;
}
