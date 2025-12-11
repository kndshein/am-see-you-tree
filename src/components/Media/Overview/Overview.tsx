import { motion } from 'motion/react';
import { MediaType } from '../../../types/Media';
import styles from './Overview.module.scss';
import { TmdbType } from '../../../types/Tmdb';

type PropTypes = {
  tmdb_data: TmdbType;
  media_data: MediaType;
};

export default function Overview({ tmdb_data, media_data }: PropTypes) {
  // Shows w/ singular seasons don't nest their overview info
  const overview_text =
    media_data.type == 'tv'
      ? tmdb_data[`season/${media_data.season}`].overview || tmdb_data.overview
      : tmdb_data.overview;

  return (
    <motion.p
      className={styles.overview}
      variants={{
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.002,
          },
        },
        hidden: {
          opacity: 0,
          transition: {
            opacity: {
              duration: 0,
            },
          },
        },
      }}
      initial={{ opacity: 0 }}
    >
      {overview_text.split('').map((letter: string, idx: number) => {
        return (
          <motion.span
            key={idx}
            variants={{
              visible: {
                opacity: 1,
                transition: {
                  opacity: {
                    duration: 0,
                  },
                },
              },
              hidden: {
                opacity: 0,
              },
            }}
            initial={{ opacity: 0 }}
          >
            {letter}
          </motion.span>
        );
      })}
    </motion.p>
  );
}
