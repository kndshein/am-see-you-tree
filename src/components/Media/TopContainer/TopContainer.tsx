import styles from './TopContainer.module.scss';
import { TmdbType } from '../../../types/Tmdb';
import { MediaType } from '../../../types/Media';
import { motion } from 'motion/react';
import { container } from '../Media';
import { entry } from '../../../utils/motion';

type PropTypes = {
  tmdb_data: TmdbType;
  media_data: MediaType;
};

export default function TopContainer({ tmdb_data, media_data }: PropTypes) {
  const titleText =
    media_data.type === 'tv'
      ? tmdb_data.original_name || ''
      : tmdb_data.original_title || '';

  return (
    <motion.section
      className={styles.container}
      variants={{
        ...container,
        visible: { ...container.visible, transition: { staggerChildren: 0.1 } },
      }}
    >
      <motion.h2
        className={`${styles.title} ${media_data.theme?.title || ''}`}
        variants={entry}
      >
        {media_data.type !== 'tv' && media_data.theme?.title
          ? titleText.split('').map((letter: string, idx: number) => (
              <span key={idx}>{letter}</span>
            ))
          : titleText}
      </motion.h2>
    </motion.section>
  );
}
