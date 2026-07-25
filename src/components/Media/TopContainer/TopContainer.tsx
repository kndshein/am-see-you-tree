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
      <motion.p className={styles.tagline} variants={entry}>
        {/* The slot holds different things per type, so the label names what is
            actually in it rather than being generic. Movies with no tagline get
            no label, to avoid heading an empty line. */}
        {media_data.type === 'tv' ? (
          <>
            <span className={styles.tagline_label}>Coverage</span>
            <span className={styles.season}>Season {media_data.season}</span>,
            Episodes {media_data.epiStart} - {media_data.epiEnd}
          </>
        ) : (
          tmdb_data.tagline && (
            <>
              <span className={styles.tagline_label}>Tagline</span>
              {tmdb_data.tagline}
            </>
          )
        )}
      </motion.p>
    </motion.section>
  );
}
