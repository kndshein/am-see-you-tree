import { motion, useReducedMotion } from 'motion/react';
import { MediaType } from '../../../types/Media';
import { TmdbType } from '../../../types/Tmdb';
import { CARD_DELAY_CHILDREN } from '../../../utils/motion';
import styles from './Ambient.module.scss';

type PropTypes = {
  tmdb_data: TmdbType;
  media_data: MediaType;
  is_content_expanded: boolean;
};

// Its own (slower) pace, deliberately not Overview.tsx's WORD_STAGGER/
// WORD_DURATION (utils/motion.ts) — this used to share those exactly, but a
// giant, blurred, peripheral echo reads better lingering on each word rather
// than matching the real synopsis's reading pace.
const AMBIENT_WORD_STAGGER = 0.02;
const AMBIENT_WORD_DURATION = 0.1;

// A giant, blurred, near-invisible echo of the synopsis along the left edge
// of the screen — decoration, not a second place to actually read the
// synopsis (Overview.tsx, RightContainer, owns that job). Meant to read as a
// HUD readout so large it's practically out of focus, like it's floating
// right up against the glass. aria-hidden + pointer-events: none (its own
// stylesheet) since none of that is real content.
//
// Word-by-word, starting on the same beat as the rest of the expanded card's
// own content (Media.tsx's .container — CARD_DELAY_CHILDREN, utils/motion.ts
// — is when its first child, TopContainer, begins entering) rather than
// waiting for Synopsis's own much-later turn in that cascade. This isn't
// nested inside Media's variant tree itself (it lives outside .content
// entirely, see Ambient.module.scss), so it can't just inherit that timing;
// it reproduces the start time instead, at its own pace. The resting dimness
// (Ambient.module.scss's opacity) is a plain CSS ceiling on top of this, not
// something animated here — each word still only ever animates opacity 0→1,
// same shape as Overview.tsx's own.
export default function Ambient({
  tmdb_data,
  media_data,
  is_content_expanded,
}: PropTypes) {
  const should_reduce_motion = useReducedMotion();

  // Same season-overview fallback Overview.tsx uses — this is a decorative
  // echo of that same text, not a second, independently-sourced one.
  const seasonData =
    media_data.type === 'tv'
      ? tmdb_data[`season/${media_data.season}`]
      : undefined;
  const overview_text =
    media_data.type === 'tv'
      ? seasonData?.overview || tmdb_data.overview || ''
      : tmdb_data.overview || '';

  if (!overview_text) return null;

  if (should_reduce_motion) {
    return (
      <div className={styles.ambient} aria-hidden="true">
        {overview_text}
      </div>
    );
  }

  const words = overview_text.split(' ');

  return (
    <motion.div
      className={styles.ambient}
      aria-hidden="true"
      initial="hidden"
      animate={is_content_expanded ? 'visible' : 'hidden'}
      exit={{ opacity: 0, transition: { duration: 0.3 } }}
      variants={{
        visible: {
          transition: {
            delayChildren: CARD_DELAY_CHILDREN,
            staggerChildren: AMBIENT_WORD_STAGGER,
          },
        },
        hidden: {},
      }}
    >
      {words.map((word, idx) => (
        <motion.span
          key={idx}
          style={{ display: 'inline-block', marginRight: '0.25em' }}
          variants={{
            visible: {
              opacity: 1,
              y: 0,
              transition: { duration: AMBIENT_WORD_DURATION },
            },
            // Instant, like Overview.tsx's own words — the card is closing,
            // so there's nothing to watch it play out against.
            hidden: { opacity: 0, y: 4, transition: { duration: 0 } },
          }}
        >
          {word}
        </motion.span>
      ))}
    </motion.div>
  );
}
