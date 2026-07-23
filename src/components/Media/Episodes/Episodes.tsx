import styles from './Episodes.module.scss';
import { TmdbType, Episode } from '../../../types/Tmdb';
import { ShowType } from '../../../types/Media';
import { motion } from 'motion/react';
import { calculateDelay } from '../../../utils/utils';

type PropTypes = {
  tmdb_data: TmdbType;
  media_data: ShowType;
};

export default function Episodes({ tmdb_data, media_data }: PropTypes) {
  const seasonData = tmdb_data[`season/${media_data.season}`];
  const overview_text = seasonData?.overview || tmdb_data.overview || '';
  const episodesList = (seasonData?.episodes ?? []).slice(
    media_data.epiStart - 1,
    media_data.epiEnd
  );

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
      {episodesList.map((ele: Episode, idx: number) => {
        const stillPath = ele.still_path || seasonData?.poster_path;
        return (
          <motion.section
            className={styles.episode_container}
            key={ele.episode_number ?? idx}
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
              {stillPath && (
                <img
                  className={styles.still}
                  src={`https://image.tmdb.org/t/p/w185${stillPath}`}
                  alt={`${ele.name || tmdb_data.original_name || 'Episode'} still`}
                />
              )}
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
