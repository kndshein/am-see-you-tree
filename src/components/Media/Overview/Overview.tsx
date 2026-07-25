import { useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { MediaType } from '../../../types/Media';
import styles from './Overview.module.scss';
import { TmdbType } from '../../../types/Tmdb';

type PropTypes = {
  tmdb_data: TmdbType;
  media_data: MediaType;
  // Fires once the last word has finished its reveal — lets other elements
  // (the collection panel) wait for the synopsis specifically, rather than
  // guessing a delay long enough to outlast it regardless of its length.
  onRevealComplete?: () => void;
};

export default function Overview({
  tmdb_data,
  media_data,
  onRevealComplete,
}: PropTypes) {
  const should_reduce_motion = useReducedMotion();

  // Reduced motion skips the animated branch entirely below, so nothing else
  // would ever call onRevealComplete for it.
  useEffect(() => {
    if (should_reduce_motion) onRevealComplete?.();
  }, [should_reduce_motion, onRevealComplete]);

  const seasonData =
    media_data.type === 'tv' ? tmdb_data[`season/${media_data.season}`] : undefined;

  const overview_text =
    media_data.type === 'tv'
      ? seasonData?.overview || tmdb_data.overview || ''
      : tmdb_data.overview || '';

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
            staggerChildren: 0.015,
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
      {words.map((word, idx) => {
        const is_last = idx === words.length - 1;
        return (
          <motion.span
            key={idx}
            style={{ display: 'inline-block', marginRight: '0.25em' }}
            variants={{
              visible: {
                opacity: 1,
                y: 0,
                transition: {
                  duration: 0.1,
                },
              },
              hidden: {
                opacity: 0,
                y: 4,
              },
            }}
            // Words stagger, so only the last one finishing means the whole
            // synopsis has actually finished revealing.
            onAnimationComplete={
              is_last
                ? (definition) => {
                    if (definition === 'visible') onRevealComplete?.();
                  }
                : undefined
            }
          >
            {word}
          </motion.span>
        );
      })}
    </motion.p>
  );
}
