import styles from './RightContainer.module.scss';
import { TmdbType, CastMember } from '../../../types/Tmdb';
import { MediaType } from '../../../types/Media';
import dateCalc, { dateEpochSeed } from '../../../utils/date-calc';
import runtimeCalc, { runtimeMsSeed } from '../../../utils/runtime-calc';
import scoreColor from '../../../utils/score-color';
import { compactCount } from '../../../utils/format';
import Episodes from '../Episodes/Episodes';
import { container } from '../Media';
import { entry } from '../../../utils/motion';
import { motion, useMotionValue, useTransform } from 'motion/react';
import Overview from '../Overview/Overview';
import VoteCounter from './VoteCounter';
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
    ...entry,
    // Same movement as everything else, plus a stagger for the fields it wraps.
    visible: {
      ...entry.visible,
      transition: { ...entry.visible.transition, staggerChildren: 0.05 },
    },
  };

  const season_data =
    media_data.type === 'tv'
      ? tmdb_data[`season/${media_data.season}`]
      : undefined;

  const vote_percent = Math.round((tmdb_data.vote_average ?? 0) * 10);
  // A MotionValue, not React state: motion writes the derived color straight
  // to the DOM node, keeping the per-frame count-up from re-rendering this
  // whole subtree (cast, Overview, Episodes).
  const vote_value = useMotionValue(0);
  const vote_color = useTransform(vote_value, (latest) => scoreColor(latest));

  // Stored comma-joined (two directors is common), split back out so each gets
  // its own pill alongside the cast.
  const authors = (tmdb_data.author ?? '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);

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
          <motion.p className={styles.tagline} variants={element}>
            {/* The slot holds different things per type, so the label names what
                is actually in it rather than being generic. Movies with no
                tagline get no label, to avoid heading an empty line. */}
            {media_data.type === 'tv' ? (
              <>
                <span className={styles.tagline_label}>Coverage</span>
                <span className={styles.season}>
                  Season {media_data.season}
                </span>
                , Episodes {media_data.epiStart} - {media_data.epiEnd}
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
          {/* Staggered harder than the rest: these are four short values on one
              line, so they need the spacing to register as arriving in turn. */}
          <motion.section
            className={styles.info_group}
            variants={{
              ...entry,
              visible: {
                ...entry.visible,
                transition: {
                  ...entry.visible.transition,
                  staggerChildren: 0.18,
                },
              },
            }}
          >
            <motion.span variants={element}>
              <span className={styles.label}>Rating</span>
              <span className={styles.value_row}>
                <motion.span style={{ color: vote_color }}>
                  <VoteCounter
                    value={vote_percent}
                    play={is_content_expanded}
                    motion_value={vote_value}
                  />
                </motion.span>
                {typeof tmdb_data.vote_count === 'number' && (
                  <span className={styles.sub_value}>
                    {compactCount(tmdb_data.vote_count)}
                  </span>
                )}
              </span>
            </motion.span>
            {media_data.type === 'tv' ? (
              <motion.span variants={element}>
                <span className={styles.label}>Aired</span>
                <GlitchText
                  final_text={dateCalc(season_data?.air_date)}
                  seed_text={dateEpochSeed(season_data?.air_date)}
                  play={is_content_expanded}
                />
              </motion.span>
            ) : (
              <>
                <motion.span variants={element}>
                  <span className={styles.label}>Released</span>
                  <GlitchText
                    final_text={dateCalc(tmdb_data.release_date)}
                    seed_text={dateEpochSeed(tmdb_data.release_date)}
                    play={is_content_expanded}
                  />
                </motion.span>
                <motion.span variants={element}>
                  <span className={styles.label}>Runtime</span>
                  <GlitchText
                    final_text={runtimeCalc(tmdb_data.runtime)}
                    seed_text={runtimeMsSeed(tmdb_data.runtime)}
                    play={is_content_expanded}
                  />
                </motion.span>
              </>
            )}
          </motion.section>
          {/* One list of people: whoever made it, then who's in it. The label
              shares a variant child with the pills so it doesn't arrive a
              stagger step ahead of them. */}
          <motion.div variants={element}>
            <span className={styles.section_label}>
              {media_data.type === 'tv' ? 'Creators & Cast' : 'Directors & Cast'}
            </span>
            <section className={styles.cast}>
              {authors.map((name) => (
                <motion.span
                  className={`${styles.actor} ${styles.director}`}
                  key={`author-${name}`}
                  variants={element}
                >
                  <span className={styles.actor_role}>
                    {media_data.type === 'tv' ? 'Creator' : 'Director'}
                  </span>
                  <span className={styles.actor_name}>{name}</span>
                </motion.span>
              ))}
              {(tmdb_data.credits?.cast ?? [])
                .slice(0, 5)
                .map((actor: CastMember, idx: number) => {
                  return (
                    <motion.span
                      className={styles.actor}
                      key={actor.name || idx}
                      variants={element}
                    >
                      {actor.character && (
                        <span className={styles.actor_role}>
                          {actor.character}
                        </span>
                      )}
                      <span className={styles.actor_name}>{actor.name}</span>
                    </motion.span>
                  );
                })}
            </section>
          </motion.div>
          {/* Label and content share one variant child, so they enter together
              instead of the label arriving a stagger step ahead of what it
              names. Every entry has overview text, so this needs no guard. */}
          <motion.div variants={element}>
            <span className={styles.section_label}>Synopsis</span>
            <Overview tmdb_data={tmdb_data} media_data={media_data} />
          </motion.div>
          {media_data.type === 'tv' && (
            <motion.div variants={element}>
              <span className={styles.section_label}>Episodes</span>
              <Episodes tmdb_data={tmdb_data} media_data={media_data} />
            </motion.div>
          )}
        </>
      )}
    </motion.section>
  );
}
