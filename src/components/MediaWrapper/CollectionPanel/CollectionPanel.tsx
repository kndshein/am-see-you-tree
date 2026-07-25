import { useState, MouseEvent } from 'react';
import { motion } from 'motion/react';
import { MediaType } from '../../../types/Media';
import { TmdbType } from '../../../types/Tmdb';
import { HandleToggleType } from '../../../types/Toggles';
import { collectionSiblingsOf } from '../../../utils/media-lists';
import { useTmdbData } from '../../../utils/tmdb-data';
import {
  entry,
  COLOR_REVEAL_DELAY,
  COLOR_STAGGER,
  REVEAL_DURATION,
} from '../../../utils/motion';
import styles from './CollectionPanel.module.scss';

type PropTypes = {
  media_data: MediaType;
  tmdb_data: TmdbType;
  media_list: Array<MediaType>;
  handleJump: HandleToggleType;
  // Gates both the panel's own entrance (mounts alongside the rest of
  // RightContainer) and the title/bracket reveal below (matches the glow).
  is_content_expanded: boolean;
};

const STAGGER = 0.08;

// A slight overshoot so the brackets read as popping into place rather than
// just fading in — distinct from the plain easeOut used everywhere else.
const POP_EASE = [0.34, 1.56, 0.64, 1] as const;

// Sits outside the card itself, just below the reticle's top-right corner
// (see CollectionPanel.module.scss) — only for movies that belong to a TMDB
// collection with other members already in this app's curated list, so it
// renders null rather than an empty/dead list otherwise.
export default function CollectionPanel({
  media_data,
  tmdb_data,
  media_list,
  handleJump,
  is_content_expanded,
}: PropTypes) {
  const tmdb_data_map = useTmdbData();
  const collection = tmdb_data.collection;
  const siblings = collection
    ? collectionSiblingsOf(media_data, tmdb_data_map)
    : [];

  if (!collection || siblings.length === 0) return null;

  return (
    <motion.div
      className={styles.panel_wrap}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: STAGGER } },
      }}
      initial="hidden"
      animate={is_content_expanded ? 'visible' : 'hidden'}
      exit={{ opacity: 0, transition: { duration: 0.3 } }}
    >
      <div className={styles.frame}>
        <div className={styles.list}>
          <motion.span className={styles.label} variants={entry}>
            {collection.name}
          </motion.span>
          {siblings.map((sibling, sibling_idx) => {
            const sibling_data = tmdb_data_map[sibling.id];
            const title = sibling_data?.original_title || sibling.id;
            const year = sibling_data?.release_date?.slice(0, 4);

            return (
              <CollectionItem
                key={sibling.id}
                title={title}
                year={year}
                is_content_expanded={is_content_expanded}
                // Matches the glow's own schedule, staggered the same way the
                // genre rows are — so the titles/brackets light up alongside
                // the card's color reveal rather than the panel's own mount.
                stagger_delay={COLOR_REVEAL_DELAY + sibling_idx * COLOR_STAGGER}
                onClick={(event) => {
                  // Bubbling to the card's own onClick would immediately
                  // re-toggle (close) this card right after the jump.
                  event.stopPropagation();
                  const target_idx = media_list.findIndex(
                    (item) => item.id === sibling.id,
                  );
                  if (target_idx !== -1) handleJump(target_idx);
                }}
              />
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

type ItemPropTypes = {
  title: string;
  year?: string;
  is_content_expanded: boolean;
  stagger_delay: number;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
};

// Not clickable or hoverable until its own bracket-pop has actually finished
// — before that, the title isn't "confirmed" white yet, so treating it as
// interactive would be jumping ahead of the reveal it's still playing.
function CollectionItem({
  title,
  year,
  is_content_expanded,
  stagger_delay,
  onClick,
}: ItemPropTypes) {
  const [is_revealed, setIsRevealed] = useState(false);

  const title_transition = is_content_expanded
    ? { duration: REVEAL_DURATION, ease: 'easeOut' as const, delay: stagger_delay }
    : { duration: 0 };
  // Same duration as the title, not a matching literal — this one's completion
  // is what unlocks the button below, so the two drifting apart would gate
  // interactivity on the wrong moment.
  const bracket_transition = is_content_expanded
    ? { duration: REVEAL_DURATION, ease: POP_EASE, delay: stagger_delay }
    : { duration: 0 };

  return (
    <motion.button
      className={styles.item}
      variants={entry}
      disabled={!is_revealed}
      onClick={onClick}
    >
      <span className={styles.name}>
        <motion.span
          className={styles.bracket}
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: is_content_expanded ? 1 : 0,
            opacity: is_content_expanded ? 1 : 0,
          }}
          transition={bracket_transition}
          // Both brackets and the title share stagger_delay/REVEAL_DURATION,
          // so this fires right as the whole reveal actually finishes.
          onAnimationComplete={() => setIsRevealed(is_content_expanded)}
        >
          [
        </motion.span>
        <span className={styles.title_wrap}>
          <span className={styles.title_grey}>{title}</span>
          <motion.span
            className={styles.title_white}
            initial={{ opacity: 0 }}
            animate={{ opacity: is_content_expanded ? 1 : 0 }}
            transition={title_transition}
          >
            {title}
          </motion.span>
        </span>
        <motion.span
          className={styles.bracket}
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: is_content_expanded ? 1 : 0,
            opacity: is_content_expanded ? 1 : 0,
          }}
          transition={bracket_transition}
        >
          ]
        </motion.span>
      </span>
      {year && <span className={styles.year}>{year}</span>}
    </motion.button>
  );
}
