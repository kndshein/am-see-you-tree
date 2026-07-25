import { useState } from 'react';
import styles from './LeftContainer.module.scss';
import { TmdbType } from '../../../types/Tmdb';
import Genres from '../Genres/Genres';
import { motion, AnimationDefinition } from 'motion/react';
import { container } from '../Media';
import { entry_vertical } from '../../../utils/motion';
import { compactCurrency } from '../../../utils/format';
import { MediaType } from '../../../types/Media';

type PropTypes = {
  tmdb_data: TmdbType;
  media_data: MediaType;
};

export default function LeftContainer({ tmdb_data, media_data }: PropTypes) {
  const [is_poster_revealed, setIsPosterRevealed] = useState(false);

  let poster_slug = tmdb_data.poster_path;
  if (media_data.type === 'tv') {
    const season_data = tmdb_data[`season/${media_data.season}`];
    poster_slug = season_data?.poster_path ?? tmdb_data.poster_path;
  }
  const poster_path = poster_slug
    ? `https://image.tmdb.org/t/p/w342${poster_slug}`
    : '';

  const handlePosterAnimationComplete = (definition: AnimationDefinition) => {
    if (definition === 'visible') setIsPosterRevealed(true);
    if (definition === 'hidden') setIsPosterRevealed(false);
  };

  return (
    <motion.div
      className={styles.container}
      variants={{
        ...container,
        visible: { ...container.visible, transition: { staggerChildren: 0.1 } },
      }}
    >
      <motion.div
        className={styles.poster}
        variants={entry_vertical}
        onAnimationComplete={handlePosterAnimationComplete}
      >
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
            animate={{ filter: is_poster_revealed ? 'grayscale(0)' : 'grayscale(1)' }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
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
              <span>{compactCurrency(tmdb_data.budget)}</span>
            </span>
          )}
          {tmdb_data.revenue && (
            <span className={styles.finance_row}>
              <span className={styles.finance_label}>Box Office</span>
              <span>{compactCurrency(tmdb_data.revenue)}</span>
            </span>
          )}
        </motion.section>
      )}
      {/* start_idx: 1 reserves color-stagger slot 0 for the poster above,
          so the genre color cascade picks up chronologically after it */}
      <Genres genres={tmdb_data.genres} start_idx={1} />
    </motion.div>
  );
}
