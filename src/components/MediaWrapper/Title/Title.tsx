import { MediaType } from '../../../types/Media';
import { TmdbType } from '../../../types/Tmdb';
import styles from './Title.module.scss';
import { motion } from 'motion/react';

type PropTypes = {
  tmdb_data: TmdbType;
  media_data: MediaType;
};

export default function Title({ tmdb_data, media_data }: PropTypes) {
  return (
    <motion.div className={styles.title} layout="position">
      <h2>
        {media_data.type == 'tv'
          ? tmdb_data.original_name
          : tmdb_data.original_title}
      </h2>
    </motion.div>
  );
}
