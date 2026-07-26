import styles from './Media.module.scss';
import { TmdbType } from '../../types/Tmdb';
import { MediaType } from '../../types/Media';
import TopContainer from './TopContainer/TopContainer';
import LeftContainer from './LeftContainer/LeftContainer';
import RightContainer from './RightContainer/RightContainer';
import Record from '../MediaWrapper/Record/Record';
import { motion } from 'motion/react';
import { CARD_DELAY_CHILDREN, CARD_STAGGER } from '../../utils/motion';

type PropTypes = {
  tmdb_data: TmdbType;
  media_data: MediaType;
  is_active: boolean;
  is_content_expanded: boolean;
  selected_cast?: string | null;
  onSelectCast?: (cast_name: string) => void;
  media_list: Array<MediaType>;
  is_movies_only: boolean;
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
  selected_cast,
  onSelectCast,
  media_list,
  is_movies_only,
}: PropTypes) {
  return (
    <motion.section
      className={styles.container}
      animate={is_content_expanded ? 'visible' : 'hidden'}
      variants={{
        visible: {
          opacity: 1,
          transition: {
            delayChildren: CARD_DELAY_CHILDREN,
            staggerChildren: CARD_STAGGER,
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
      <LeftContainer
        tmdb_data={tmdb_data}
        media_data={media_data}
        is_content_expanded={is_content_expanded}
      />
      <RightContainer
        tmdb_data={tmdb_data}
        media_data={media_data}
        is_active={is_active}
        is_content_expanded={is_content_expanded}
        selected_cast={selected_cast}
        onSelectCast={onSelectCast}
        media_list={media_list}
        is_movies_only={is_movies_only}
      />
      {/* Absolutely positioned, so it escapes the grid and anchors to .content
          — but it lives here to inherit this section's variant orchestration. */}
      {is_active && (
        <Record media_data={media_data} tmdb_data={tmdb_data} />
      )}
    </motion.section>
  );
}
