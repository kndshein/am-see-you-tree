import styles from './Episodes.module.scss';
import { TmdbType } from '../../../types/Tmdb';
import { ShowType } from '../../../types/Media';
import { motion } from 'motion/react';
import { calculateDelay } from '../../../utils/utils';

type PropTypes = {
  tmdb_data: TmdbType;
  media_data: ShowType;
};

export default function Episodes({ tmdb_data, media_data }: PropTypes) {
  const overview_text =
    media_data.type == 'tv'
      ? tmdb_data[`season/${media_data.season}`].overview || tmdb_data.overview
      : tmdb_data.overview;

  return (
    <motion.section
      className={styles.container}
      variants={{
        visible: {
          opacity: 1,
          transition: {
            delayChildren: calculateDelay(overview_text),
            staggerChildren: 0.2,
          },
        },
        hidden: {
          opacity: 0,
        },
      }}
    >
      {tmdb_data[`season/${media_data.season}`].episodes
        .slice(media_data.epiStart - 1, media_data.epiEnd)
        .map((ele: any, idx: number) => {
          return (
            <motion.section
              className={styles.episode_container}
              key={idx}
              variants={{
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: {
                    y: {
                      duration: 0.15,
                    },
                  },
                },
                hidden: {
                  opacity: 0,
                  y: -100,
                },
              }}
            >
              <div className={styles.still_wrapper}>
                <img
                  className={styles.still}
                  src={`https://image.tmdb.org/t/p/w185${
                    ele.still_path
                      ? ele.still_path
                      : tmdb_data[`season/${media_data.season}`].poster_path
                  }`}
                  alt={tmdb_data.original_name}
                />
              </div>
              <div className={styles.overview_container}>
                <div className={styles.episode}>
                  <span
                    className={styles.number}
                  >{`Season ${ele.season_number}, Episode ${ele.episode_number} - `}</span>
                  <span className={styles.name}>{ele.name}</span>
                </div>
                <p className={styles.overview}>{ele.overview}</p>
              </div>
            </motion.section>
          );
        })}
    </motion.section>
  );
}
