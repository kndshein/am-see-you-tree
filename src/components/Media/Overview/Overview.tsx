import { useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { MediaType } from '../../../types/Media';
import styles from './Overview.module.scss';
import { TmdbType } from '../../../types/Tmdb';
import { WORD_STAGGER, WORD_DURATION } from '../../../utils/motion';

type PropTypes = {
  tmdb_data: TmdbType;
  media_data: MediaType;
  is_content_expanded: boolean;
  // Fired once the word-by-word reveal actually finishes — Episodes.tsx
  // (RightContainer) waits on this rather than a fixed delay, since a
  // synopsis's length (and so its reveal duration) varies per title.
  onRevealComplete?: () => void;
};

export default function Overview({
  tmdb_data,
  media_data,
  is_content_expanded,
  onRevealComplete,
}: PropTypes) {
  const should_reduce_motion = useReducedMotion();

  const seasonData =
    media_data.type === 'tv' ? tmdb_data[`season/${media_data.season}`] : undefined;

  const overview_text =
    media_data.type === 'tv'
      ? seasonData?.overview || tmdb_data.overview || ''
      : tmdb_data.overview || '';

  // No word-by-word animation to wait on in this branch — this component
  // remounts every time the card opens (RightContainer's `is_active &&`
  // guard), so firing once on mount is enough to unblock Episodes.
  useEffect(() => {
    if (should_reduce_motion) onRevealComplete?.();
  }, [should_reduce_motion, onRevealComplete]);

  if (should_reduce_motion) {
    return <p className={styles.overview}>{overview_text}</p>;
  }

  // Word-by-word reveal for high performance and clean visual animation
  const words = overview_text.split(' ');

  return (
    <motion.p
      className={styles.overview}
      variants={{
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: WORD_STAGGER,
          },
        },
        hidden: {
          opacity: 0,
          transition: {
            opacity: {
              duration: 0,
            },
          },
        },
      }}
      initial={{ opacity: 0 }}
    >
      {words.map((word, idx) => (
        <motion.span
          key={idx}
          style={{ display: 'inline-block', marginRight: '0.25em' }}
          variants={{
            visible: {
              opacity: 1,
              y: 0,
              transition: {
                duration: WORD_DURATION,
              },
            },
            hidden: {
              opacity: 0,
              y: 4,
              // Instant, like every other hidden variant (utils/motion.ts) —
              // the card is closing, so there's nothing to watch it play out
              // against, and a per-word tween here outlives the close.
              transition: { duration: 0 },
            },
          }}
          // Firing this on the parent <p> instead would be ambiguous — with
          // staggerChildren, it's the parent's own (near-instant) opacity
          // tween that resolves the callback, not its staggered children.
          // The last word is unambiguous: it's the last thing to animate, so
          // its own completion IS the reveal actually finishing.
          onAnimationComplete={
            idx === words.length - 1
              ? () => {
                  if (is_content_expanded) onRevealComplete?.();
                }
              : undefined
          }
        >
          {word}
        </motion.span>
      ))}
    </motion.p>
  );
}
