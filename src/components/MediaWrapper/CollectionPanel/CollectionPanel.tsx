import { motion } from 'motion/react';
import { MediaType } from '../../../types/Media';
import { TmdbType } from '../../../types/Tmdb';
import { HandleToggleType } from '../../../types/Toggles';
import { collectionSiblingsOf } from '../../../utils/media-lists';
import { useTmdbData } from '../../../utils/tmdb-data';
import { entry } from '../../../utils/motion';
import styles from './CollectionPanel.module.scss';

type PropTypes = {
  media_data: MediaType;
  tmdb_data: TmdbType;
  media_list: Array<MediaType>;
  handleJump: HandleToggleType;
  // True once the synopsis (Overview.tsx) has actually finished revealing —
  // the panel comes in right after it rather than competing with it.
  play: boolean;
};

const STAGGER = 0.08;

// Sits outside the card itself, just below the reticle's top-right corner
// (see CollectionPanel.module.scss) — only for movies that belong to a TMDB
// collection with other members already in this app's curated list, so it
// renders null rather than an empty/dead list otherwise.
export default function CollectionPanel({
  media_data,
  tmdb_data,
  media_list,
  handleJump,
  play,
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
      animate={play ? 'visible' : 'hidden'}
      exit={{ opacity: 0, transition: { duration: 0.3 } }}
    >
      <div className={styles.frame}>
        <div className={styles.list}>
          <motion.span className={styles.label} variants={entry}>
            {collection.name}
          </motion.span>
          {siblings.map((sibling) => {
            const sibling_data = tmdb_data_map[sibling.id];
            const title = sibling_data?.original_title || sibling.id;
            const year = sibling_data?.release_date?.slice(0, 4);

            return (
              <motion.button
                key={sibling.id}
                className={styles.item}
                variants={entry}
                onClick={(event) => {
                  // Bubbling to the card's own onClick would immediately
                  // re-toggle (close) this card right after the jump.
                  event.stopPropagation();
                  const target_idx = media_list.findIndex(
                    (item) => item.id === sibling.id,
                  );
                  if (target_idx !== -1) handleJump(target_idx);
                }}
              >
                <span className={styles.name}>[{title}]</span>
                {year && <span className={styles.year}>{year}</span>}
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
