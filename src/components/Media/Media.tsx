import styles from './Media.module.scss';
import { TmdbType } from '../../types/Tmdb';
import { MediaType } from '../../types/Media';
import TopContainer from './TopContainer/TopContainer';
import LeftContainer from './LeftContainer/LeftContainer';
import RightContainer from './RightContainer/RightContainer';
import { motion } from 'motion/react';

type PropTypes = {
  tmdb_data: TmdbType;
  media_data: MediaType;
  is_active: boolean;
  is_content_expanded: boolean;
};

export const container = {
  visible: {
    opacity: 1,
  },
  hidden: {
    opacity: 0,
  },
};

export default function Media({
  tmdb_data,
  media_data,
  is_active,
  is_content_expanded,
}: PropTypes) {
  return (
    <motion.section
      className={styles.container}
      animate={is_content_expanded ? 'visible' : 'hidden'}
      variants={{
        visible: {
          opacity: 1,
          transition: {
            delayChildren: 0.3,
            staggerChildren: 0.3,
          },
        },
        hidden: {
          opacity: 0,
          transition: {
            when: 'beforeChildren',
            opacity: {
              duration: 0, // To immediately hide when content is no longer expanded
            },
          },
        },
      }}
    >
      <TopContainer tmdb_data={tmdb_data} media_data={media_data} />
      <LeftContainer tmdb_data={tmdb_data} media_data={media_data} />
      <RightContainer
        tmdb_data={tmdb_data}
        media_data={media_data}
        is_active={is_active}
      />
    </motion.section>
  );
}
