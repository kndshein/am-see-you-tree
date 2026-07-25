import styles from './LeftContainer.module.scss';
import { TmdbType } from '../../../types/Tmdb';
import Genres from '../Genres/Genres';
import { motion } from 'motion/react';
import { container } from '../Media';
import {
  entry_vertical,
  COLOR_REVEAL_DELAY,
  REVEAL_DURATION,
} from '../../../utils/motion';
import { compactCurrency } from '../../../utils/format';
import { MediaType } from '../../../types/Media';

type PropTypes = {
  tmdb_data: TmdbType;
  media_data: MediaType;
  is_content_expanded: boolean;
};

export default function LeftContainer({
  tmdb_data,
  media_data,
  is_content_expanded,
}: PropTypes) {
  let poster_slug = tmdb_data.poster_path;
  if (media_data.type === 'tv') {
    const season_data = tmdb_data[`season/${media_data.season}`];
    poster_slug = season_data?.poster_path ?? tmdb_data.poster_path;
  }
  const poster_path = poster_slug
    ? `https://image.tmdb.org/t/p/w342${poster_slug}`
    : '';

  return (
    <motion.div
      className={styles.container}
      variants={{
        ...container,
        visible: { ...container.visible, transition: { staggerChildren: 0.1 } },
      }}
    >
      <motion.div className={styles.poster} variants={entry_vertical}>
        {/* Certificates belong on posters, and it's the one field that is
            always three to five characters — it fits a corner cleanly where it
            crowded the vitals row. */}
        {tmdb_data.certification && (
          <span className={styles.certification}>
            {tmdb_data.certification}
          </span>
        )}
        {poster_path && (
          <motion.img
            src={poster_path}
            alt={tmdb_data.original_title || tmdb_data.original_name || 'Poster'}
            initial={{ filter: 'grayscale(1)' }}
            animate={{ filter: is_content_expanded ? 'grayscale(0)' : 'grayscale(1)' }}
            // Poster is color-stagger slot 0 — same schedule Genres.tsx starts
            // its own rows from, so the two read as one continuous cascade.
            // Closing snaps back to grayscale instantly (no delay) rather than
            // reusing the reveal's own delay — otherwise a card closed before
            // that delay elapsed never actually reaches grayscale(1), so
            // reopening it has nothing left to visibly animate.
            transition={
              is_content_expanded
                ? {
                    duration: REVEAL_DURATION,
                    ease: 'easeOut',
                    delay: COLOR_REVEAL_DELAY,
                  }
                : { duration: 0 }
            }
          />
        )}
      </motion.div>
      {/* Real content, so it sits in the column proper rather than on the
          record strip — but small, because it's reference rather than headline.
          TMDB has no figures for most shows and shorts; the block is dropped
          entirely rather than showing zeroes. */}
      {(tmdb_data.budget || tmdb_data.revenue) && (
        <motion.section className={styles.finances} variants={entry_vertical}>
          {tmdb_data.budget && (
            <span className={styles.finance_row}>
              <span className={styles.finance_label}>Budget</span>
              <span className={styles.finance_leader} />
              <span>{compactCurrency(tmdb_data.budget)}</span>
            </span>
          )}
          {tmdb_data.revenue && (
            <span className={styles.finance_row}>
              <span className={styles.finance_label}>Box Office</span>
              <span className={styles.finance_leader} />
              <span>{compactCurrency(tmdb_data.revenue)}</span>
            </span>
          )}
        </motion.section>
      )}
      {/* start_idx: 1 reserves color-stagger slot 0 for the poster above,
          so the genre color cascade picks up chronologically after it */}
      <Genres genres={tmdb_data.genres} start_idx={1} is_content_expanded={is_content_expanded} />
    </motion.div>
  );
}
