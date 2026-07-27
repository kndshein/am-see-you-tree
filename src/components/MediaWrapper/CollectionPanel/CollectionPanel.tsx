import { useState, MouseEvent, RefObject } from 'react';
import { motion } from 'motion/react';
import { MediaType } from '../../../types/Media';
import { TmdbType } from '../../../types/Tmdb';
import { HandleToggleType } from '../../../types/Toggles';
import {
  collectionSiblingsOf,
  releaseDateOf,
  showSeasonsOf,
  tmdbKeyOf,
} from '../../../utils/media-lists';
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
  selected_cast?: string | null;
  is_movies_only?: boolean;
  // Forwarded to MediaWrapper so it can hand the list element's position
  // directly to CastPanel — avoids fragile CSS-module class-name queries.
  listRef?: RefObject<HTMLDivElement | null>;
};

const STAGGER = 0.08;

// Sits outside the card itself, just below the reticle's top-right corner
export default function CollectionPanel({
  media_data,
  tmdb_data,
  media_list,
  handleJump,
  is_content_expanded,
  listRef,
}: PropTypes) {
  const tmdb_data_map = useTmdbData();
  const is_tv = media_data.type === 'tv';
  const collection = tmdb_data.collection;

  // TMDB has no collection concept for TV — in its place, every season of
  // this show stands in for Film Collections' sibling movies below.
  const siblings: Array<MediaType> = is_tv
    ? showSeasonsOf(media_data)
    : collection
      ? collectionSiblingsOf(media_data, tmdb_data_map)
      : [];

  if (siblings.length === 0) return null;

  // Movie branch only reaches here once collection is confirmed truthy
  // (siblings is otherwise []), so the fallback below never actually fires —
  // it just spares TypeScript a narrowing it can't otherwise see.
  const label = is_tv
    ? tmdb_data.original_name || media_data.id
    : (collection?.name ?? '');

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
        <div className={styles.list} ref={listRef}>
          <motion.span className={styles.label} variants={entry}>
            {label}
          </motion.span>
          {siblings.map((sibling, sibling_idx) => {
            const sibling_data = tmdb_data_map[tmdbKeyOf(sibling)];
            const title =
              sibling.type === 'tv'
                ? `Season ${sibling.season}`
                : sibling_data?.original_title || sibling.id;
            const year =
              sibling.type === 'tv'
                ? releaseDateOf(sibling, tmdb_data_map).slice(0, 4)
                : sibling_data?.release_date?.slice(0, 4);

            // Same id repeats across a show's seasons, so TV needs the
            // season number too — a plain id match would call every season
            // "active" at once.
            const is_active =
              sibling.type === 'tv' && media_data.type === 'tv'
                ? sibling.season === media_data.season
                : sibling.id === media_data.id;

            return (
              <CollectionItem
                key={tmdbKeyOf(sibling)}
                title={title}
                year={year}
                is_content_expanded={is_content_expanded}
                is_active={is_active}
                stagger_delay={COLOR_REVEAL_DELAY + sibling_idx * COLOR_STAGGER}
                onClick={(event) => {
                  event.stopPropagation();
                  const target_idx = media_list.findIndex((item) =>
                    sibling.type === 'tv'
                      ? item.type === 'tv' &&
                        item.id === sibling.id &&
                        item.season === sibling.season
                      : item.id === sibling.id,
                  );
                  if (target_idx !== -1) handleJump(target_idx);
                }}
              />
            );
          })}
          <motion.span className={styles.end_of_line} variants={entry}>
            End of List
          </motion.span>
        </div>
      </div>
    </motion.div>
  );
}

type ItemPropTypes = {
  title: string;
  year?: string;
  is_content_expanded: boolean;
  // The entry currently on screen — still shown (the sequence would look
  // incomplete without it) but jumping to where you already are is a no-op,
  // so it's never interactive regardless of reveal state.
  is_active: boolean;
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
  is_active,
  stagger_delay,
  onClick,
}: ItemPropTypes) {
  const [is_revealed, setIsRevealed] = useState(false);

  const title_transition = is_content_expanded
    ? {
        duration: REVEAL_DURATION,
        ease: 'easeOut' as const,
        delay: stagger_delay,
      }
    : { duration: 0 };
  // Same duration as the title, not a matching literal — this one's completion
  // is what unlocks the button below, so the two drifting apart would gate
  // interactivity on the wrong moment.
  const bracket_transition = is_content_expanded
    ? {
        duration: REVEAL_DURATION,
        ease: 'easeOut' as const,
        delay: stagger_delay,
      }
    : { duration: 0 };

  return (
    <motion.button
      className={`${styles.item} ${is_active ? styles.is_active : ''}`}
      variants={entry}
      disabled={!is_revealed || is_active}
      onClick={onClick}
    >
      <span className={styles.name}>
        {/* No brackets for the active entry — they're the site-wide cue
            that something is a link (About.module.scss's own comment on
            .link_bracket), and this one isn't. */}
        {!is_active && (
          <motion.span
            className={styles.bracket}
            initial={{ opacity: 0 }}
            animate={{ opacity: is_content_expanded ? 1 : 0 }}
            transition={bracket_transition}
            // Both brackets and the title share stagger_delay/REVEAL_DURATION,
            // so this fires right as the whole reveal actually finishes.
            onAnimationComplete={() => setIsRevealed(is_content_expanded)}
          >
            [
          </motion.span>
        )}
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
        {!is_active && (
          <motion.span
            className={styles.bracket}
            initial={{ opacity: 0 }}
            animate={{ opacity: is_content_expanded ? 1 : 0 }}
            transition={bracket_transition}
          >
            ]
          </motion.span>
        )}
      </span>
      {year && <span className={styles.year}>{year}</span>}
    </motion.button>
  );
}
