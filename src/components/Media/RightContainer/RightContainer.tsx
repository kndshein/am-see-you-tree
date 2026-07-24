import styles from './RightContainer.module.scss';
import { TmdbType, CastMember } from '../../../types/Tmdb';
import { MediaType } from '../../../types/Media';
import dateCalc, { dateEpochSeed } from '../../../utils/date-calc';
import runtimeCalc, { runtimeMsSeed } from '../../../utils/runtime-calc';
import Episodes from '../Episodes/Episodes';
import { container } from '../Media';
import { motion } from 'motion/react';
import Overview from '../Overview/Overview';
import RatingCounter from './RatingCounter';
import GlitchText from './GlitchText';

type PropTypes = {
  tmdb_data: TmdbType;
  media_data: MediaType;
  is_active: boolean;
  is_content_expanded: boolean;
};

export default function RightContainer({
  tmdb_data,
  media_data,
  is_active,
  is_content_expanded,
}: PropTypes) {
  const element = {
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        staggerChildren: 0.05,
        x: {
          duration: 0.1,
        },
      },
    },
    hidden: {
      opacity: 0,
      x: -100,
      transition: {
        opacity: {
          duration: 0,
        },
      },
    },
  };

  const season_data =
    media_data.type === 'tv'
      ? tmdb_data[`season/${media_data.season}`]
      : undefined;

  return (
    <motion.section
      className={styles.container}
      variants={{
        ...container,
        visible: { ...container.visible, transition: { staggerChildren: 0.3 } },
      }}
    >
      {/* Only render them when active to reduce calculation while collapsed */}
      {is_active && (
        <>
          <motion.section className={styles.info_group} variants={element}>
            <motion.span className={styles.vote} variants={element}>
              <RatingCounter
                value={Math.round((tmdb_data.vote_average ?? 0) * 10) / 10}
                play={is_content_expanded}
              />
            </motion.span>
            <motion.span className={styles.dot}>//</motion.span>
            {media_data.type === 'tv' ? (
              <motion.span variants={element}>
                <GlitchText
                  final_text={dateCalc(season_data?.air_date)}
                  seed_text={dateEpochSeed(season_data?.air_date)}
                  play={is_content_expanded}
                />
              </motion.span>
            ) : (
              <>
                <motion.span variants={element}>
                  <GlitchText
                    final_text={dateCalc(tmdb_data.release_date)}
                    seed_text={dateEpochSeed(tmdb_data.release_date)}
                    play={is_content_expanded}
                  />
                </motion.span>
                <motion.span className={styles.dot}>//</motion.span>
                <motion.span variants={element}>
                  <GlitchText
                    final_text={runtimeCalc(tmdb_data.runtime)}
                    seed_text={runtimeMsSeed(tmdb_data.runtime)}
                    play={is_content_expanded}
                  />
                </motion.span>
              </>
            )}
          </motion.section>
          <motion.section className={styles.cast} variants={element}>
            {(tmdb_data.credits?.cast ?? [])
              .slice(0, 5)
              .map((actor: CastMember, idx: number) => {
                return (
                  <motion.span
                    className={styles.actor}
                    key={actor.name || idx}
                    variants={element}
                  >
                    {actor.name}
                  </motion.span>
                );
              })}
          </motion.section>
          <Overview tmdb_data={tmdb_data} media_data={media_data} />
        </>
      )}
      {media_data.type === 'tv' && (
        <Episodes tmdb_data={tmdb_data} media_data={media_data} />
      )}
    </motion.section>
  );
}
