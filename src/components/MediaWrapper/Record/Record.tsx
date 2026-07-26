import { motion } from 'motion/react';
import { MediaType } from '../../../types/Media';
import { TmdbType } from '../../../types/Tmdb';
import { entry } from '../../../utils/motion';
import styles from './Record.module.scss';

type PropTypes = {
  media_data: MediaType;
  tmdb_data: TmdbType;
};

const pad = (value: number, width = 2) => String(value).padStart(width, '0');

// Machine-readable strip along the bottom of an expanded card. Everything here
// is already in the data — the point is the coded form, which reads as a record
// rather than as prose.
//
// No `animate` of its own: it sits in Media's variant tree and inherits the
// visible/hidden label and the stagger timing from it.
export default function Record({ media_data, tmdb_data }: PropTypes) {
  // Ids are `<tmdb id>-<slug>`, e.g. 1771-captain-america-the-first-avenger.
  // Falls back to the whole string if an id ever lands without the prefix.
  const [tmdb_id] = media_data.id.split('-');

  const classification =
    media_data.type === 'tv'
      ? `TV.S${pad(media_data.season)}.E${pad(media_data.epiStart)}-${pad(
          media_data.epiEnd,
        )}`
      : media_data.type;

  return (
    <motion.div
      className={styles.record}
      aria-hidden="true"
      variants={{
        visible: { transition: { staggerChildren: 0.12 } },
        hidden: {},
      }}
    >
      {/* Two groups pushed to opposite ends: what the entry *is* on the left,
          which system it's cross-referenced in on the right. The wrappers
          are plain spans, so variant propagation still reaches each field
          directly and the stagger runs across both in order. */}
      <span className={styles.group}>
        <motion.span variants={entry}>
          <span className={styles.key}>ID</span>TMDB.{tmdb_id}
        </motion.span>
        <motion.span variants={entry}>
          <span className={styles.key}>CLS</span>
          {classification}
        </motion.span>
      </span>
      <span className={`${styles.group} ${styles.group_end}`}>
        {tmdb_data.imdb_id && (
          <motion.span variants={entry}>
            <span className={styles.key}>IMDB</span>
            {tmdb_data.imdb_id}
          </motion.span>
        )}
      </span>
    </motion.div>
  );
}
