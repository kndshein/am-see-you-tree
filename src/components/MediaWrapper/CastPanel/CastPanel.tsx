import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MediaType } from '../../../types/Media';
import { HandleToggleType } from '../../../types/Toggles';
import {
  castMatchesInMediaList,
  releaseDateOf,
  tmdbKeyOf,
} from '../../../utils/media-lists';
import { useTmdbData } from '../../../utils/tmdb-data';
import { entry, REVEAL_DURATION, COLOR_STAGGER } from '../../../utils/motion';
import styles from './CastPanel.module.scss';

type PropTypes = {
  media_data: MediaType;
  selected_cast: string | null;
  media_list: Array<MediaType>;
  handleJump: HandleToggleType;
  is_content_expanded: boolean;
  is_movies_only: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  // Direct ref to CollectionPanel's list element — used to stack Filmography
  // below Film Collections without querying the DOM by class name.
  collectionListRef: React.RefObject<HTMLDivElement | null>;
};

export default function CastPanel({
  media_data,
  selected_cast,
  media_list,
  handleJump,
  is_content_expanded,
  is_movies_only,
  containerRef,
  collectionListRef,
}: PropTypes) {
  const tmdb_data_map = useTmdbData();
  const listRef = useRef<HTMLDivElement | null>(null);

  const cast_matches = selected_cast
    ? castMatchesInMediaList(selected_cast, media_list, tmdb_data_map, is_movies_only).filter(
        (item) =>
          !(
            item.id === media_data.id &&
            (item.type !== 'tv' ||
              (item.type === 'tv' && media_data.type === 'tv' && item.season === media_data.season))
          ),
      )
    : [];

  useEffect(() => {
    if (!selected_cast || !listRef.current) {
      return;
    }

    const updatePosition = () => {
      const listEl = listRef.current;
      const frameEl = listEl?.offsetParent as HTMLElement | null;
      if (!listEl || !frameEl) return;

      // Position CastPanel (Filmography) below CollectionPanel (Film Collections)
      // when both are visible. Use the direct ref — no DOM class-name querying.
      const collectionListEl = collectionListRef.current;

      let targetTop = 38; // Default standoff top when no collection list
      if (collectionListEl) {
        const frameRect = frameEl.getBoundingClientRect();
        const collectionRect = collectionListEl.getBoundingClientRect();
        targetTop = collectionRect.bottom - frameRect.top + 24;
      }
      listEl.style.setProperty('--panel-top', `${targetTop}px`);
    };

    updatePosition();
    const interval = setInterval(updatePosition, 50);
    window.addEventListener('resize', updatePosition);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', updatePosition);
    };
  }, [selected_cast, collectionListRef, cast_matches.length]);

  if (!selected_cast || cast_matches.length === 0) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={selected_cast ?? ''}
        className={styles.panel_wrap}
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.06 } },
        }}
        initial="hidden"
        animate={is_content_expanded ? 'visible' : 'hidden'}
        exit={{ opacity: 0, transition: { duration: 0.15 } }}
      >
      <div className={styles.frame}>
        <div className={styles.list} ref={listRef}>
          <motion.span className={styles.label} variants={entry}>
            FILMOGRAPHY: {selected_cast.toUpperCase()}
          </motion.span>
          {cast_matches.map((item, item_idx) => {
            const item_key = `${selected_cast}_${item.id}_${item.type}_${
              item.type === 'tv' ? item.season : ''
            }`;
            const item_data = tmdb_data_map[tmdbKeyOf(item)];
            const base_title =
              item.type === 'tv'
                ? item_data?.original_name || item_data?.original_title || item.id
                : item_data?.original_title || item.id;
            const title =
              item.type === 'tv' ? `${base_title} - S${item.season}` : base_title;
            const release_date = releaseDateOf(item, tmdb_data_map);
            const year = release_date ? release_date.slice(0, 4) : undefined;
            // Only items that exist in the current rail are navigable.
            const target_idx = media_list.findIndex(
              (m) =>
                m.id === item.id &&
                (m.type !== 'tv' ||
                  (m.type === 'tv' &&
                    item.type === 'tv' &&
                    m.season === item.season)),
            );
            const is_clickable = target_idx !== -1;

            return (
              <CastItem
                key={item_key}
                title={title}
                year={year}
                is_content_expanded={is_content_expanded}
                is_clickable={is_clickable}
                item_idx={item_idx}
                total_items={cast_matches.length}
                type={item.type}
                onClick={(event) => {
                  event.stopPropagation();
                  if (is_clickable) handleJump(target_idx);
                }}
              />
            );
          })}
        </div>
      </div>
      </motion.div>
    </AnimatePresence>
  );
}

type ItemPropTypes = {
  title: string;
  year?: string;
  is_content_expanded: boolean;
  is_clickable: boolean;
  item_idx: number;
  // Needed to compute when all items have finished entering, so brackets
  // can pop in sync right after the last one lands.
  total_items: number;
  type: MediaType['type'];
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
};

const ITEM_STAGGER = 0.06; // fast cascade, no glow-lock
const ENTRY_DURATION = 0.3; // matches the entry variant's duration

function CastItem({
  title,
  year,
  is_content_expanded,
  is_clickable,
  item_idx,
  total_items,
  type,
  onClick,
}: ItemPropTypes) {
  const [is_revealed, setIsRevealed] = useState(false);
  const fade_delay = item_idx * ITEM_STAGGER;
  // All brackets start after the last item finishes fading in, then cascade
  // top-to-bottom at CollectionPanel's stagger rhythm.
  const bracket_delay =
    (total_items - 1) * ITEM_STAGGER + ENTRY_DURATION + 0.15 + item_idx * COLOR_STAGGER;

  const reveal_transition = is_content_expanded
    ? { duration: REVEAL_DURATION, ease: 'easeOut' as const, delay: bracket_delay }
    : { duration: 0 };

  return (
    <motion.button
      className={`${styles.item} ${!is_clickable ? styles.not_in_rail : ''} ${
        type === 'tv' ? styles.is_tv : ''
      }`}
      variants={entry}
      // Not interactive until its bracket reveal finishes AND it's in the rail.
      disabled={!is_revealed || !is_clickable}
      onClick={onClick}
    >
      <span className={styles.name}>
        <motion.span
          className={styles.bracket}
          initial={{ opacity: 0 }}
          animate={{ opacity: is_content_expanded ? 1 : 0 }}
          transition={reveal_transition}
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
            transition={reveal_transition}
          >
            {title}
          </motion.span>
        </span>
        <motion.span
          className={styles.bracket}
          initial={{ opacity: 0 }}
          animate={{ opacity: is_content_expanded ? 1 : 0 }}
          transition={reveal_transition}
        >
          ]
        </motion.span>
      </span>
      {year && <span className={styles.year}>{year}</span>}
    </motion.button>
  );
}
