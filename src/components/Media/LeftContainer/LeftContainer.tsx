import { useState } from 'react';
import styles from './LeftContainer.module.scss';
import { TmdbType } from '../../../types/Tmdb';
import Genres from '../Genres/Genres';
import { motion, AnimationDefinition } from 'motion/react';
import { container } from '../Media';
import { entry_vertical } from '../../../utils/motion';
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
      {/* start_idx: 1 reserves color-stagger slot 0 for the poster above,
          so the genre color cascade picks up chronologically after it */}
      <Genres genres={tmdb_data.genres} start_idx={1} />
    </motion.div>
  );
}
