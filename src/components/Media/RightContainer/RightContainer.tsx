import { useEffect, useState } from 'react';
import styles from './RightContainer.module.scss';
import { TmdbType, CastMember } from '../../../types/Tmdb';
import { MediaType } from '../../../types/Media';
import dateCalc, { dateEpochSeed } from '../../../utils/date-calc';
import runtimeCalc, { runtimeMsSeed } from '../../../utils/runtime-calc';
import scoreColor from '../../../utils/score-color';
import { compactCount } from '../../../utils/format';
import Episodes from '../Episodes/Episodes';
import { container } from '../Media';
import {
  entry,
  fade,
  CARD_DELAY_CHILDREN,
  CARD_STAGGER,
} from '../../../utils/motion';
import { motion, useMotionValue, useTransform } from 'motion/react';
import Overview from '../Overview/Overview';
import VoteCounter from './VoteCounter';
import GlitchText from './GlitchText';
import { castMatchesInMediaList, isUnreleased } from '../../../utils/media-lists';
import { useTmdbData } from '../../../utils/tmdb-data';

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

// When the vitals row actually starts entering: this container is Media's 3rd
// child (delayChildren + 2 stagger steps), and the row is this container's 2nd
// (+1 more step). The count-up and glitch readouts inside it start on that
// beat — their old flat 1s default had them running for ~0.2s while the row
// they live in was still invisible.
const VITALS_DELAY = CARD_DELAY_CHILDREN + 2 * CARD_STAGGER + CARD_STAGGER;

export default function RightContainer({
  tmdb_data,
  media_data,
  is_active,
  is_content_expanded,
  selected_cast,
  onSelectCast,
  media_list,
  is_movies_only,
}: PropTypes) {
  const tmdb_data_map = useTmdbData();

  // Episodes waits on this rather than the flat staggerChildren step below —
  // a synopsis's word-by-word reveal (Overview.tsx) runs far longer than one
  // stagger step for anything but the shortest text, so the fixed step alone
  // let Episodes start sliding in while Synopsis was still typing.
  const [is_synopsis_revealed, setIsSynopsisRevealed] = useState(false);
  useEffect(() => {
    if (!is_content_expanded) setIsSynopsisRevealed(false);
  }, [is_content_expanded]);

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

  const is_unreleased = isUnreleased(media_data, tmdb_data);

  // TMDB returns vote_average: 0 for anything with no votes yet, same as a
  // (never actually seen) genuine 0.0 score — this is what tells the two
  // apart, so the field can show "N/A" instead of a misleading "0%".
  const has_rating = tmdb_data.vote_average > 0;
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
                {has_rating ? (
                  <>
                    <motion.span style={{ color: vote_color }}>
                      <VoteCounter
                        value={vote_percent}
                        play={is_content_expanded}
                        delay={VITALS_DELAY}
                        motion_value={vote_value}
                      />
                    </motion.span>
                    {typeof tmdb_data.vote_count === 'number' && (
                      <span className={styles.sub_value}>
                        {compactCount(tmdb_data.vote_count)}
                      </span>
                    )}
                  </>
                ) : (
                  // No votes yet, not a genuine 0% — scoreColor would map an
                  // actual 0 to red, which reads as "rated terribly" rather
                  // than "not rated at all". Plain muted text instead of
                  // VoteCounter's own count-up, since there's no real number
                  // to animate toward.
                  <span className={styles.no_rating}>N/A</span>
                )}
              </span>
            </motion.span>
            {media_data.type === 'tv' ? (
              <motion.span variants={element}>
                <span className={styles.label}>
                  {is_unreleased ? 'Will Release' : 'Aired'}
                </span>
                <GlitchText
                  final_text={dateCalc(season_data?.air_date)}
                  seed_text={dateEpochSeed(season_data?.air_date)}
                  play={is_content_expanded}
                  delay={VITALS_DELAY}
                />
              </motion.span>
            ) : (
              <>
                <motion.span variants={element}>
                  <span className={styles.label}>
                    {is_unreleased ? 'Will Release' : 'Released'}
                  </span>
                  <GlitchText
                    final_text={dateCalc(tmdb_data.release_date)}
                    seed_text={dateEpochSeed(tmdb_data.release_date)}
                    play={is_content_expanded}
                    delay={VITALS_DELAY}
                  />
                </motion.span>
                <motion.span variants={element}>
                  <span className={styles.label}>Runtime</span>
                  <GlitchText
                    final_text={runtimeCalc(tmdb_data.runtime)}
                    seed_text={runtimeMsSeed(tmdb_data.runtime)}
                    play={is_content_expanded}
                    delay={VITALS_DELAY}
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
                  const is_selected = selected_cast === actor.name;
                  // Check if this actor appears in any other item in the rail.
                  // castMatchesInMediaList already filters by isShown and
                  // excludes the current item (done below), so a non-zero
                  // result means there's something to navigate to.
                  const other_matches = castMatchesInMediaList(
                    actor.name,
                    media_list,
                    tmdb_data_map,
                    is_movies_only,
                  ).filter(
                    (item) =>
                      !(item.id === media_data.id &&
                        (item.type !== 'tv' ||
                          (item.type === 'tv' &&
                            media_data.type === 'tv' &&
                            item.season === (media_data as Extract<MediaType, { type: 'tv' }>).season))),
                  );
                  const has_other_movies = other_matches.length > 0;

                  if (!has_other_movies) {
                    // No filmography to show — render as a plain non-interactive pill.
                    return (
                      <motion.span
                        className={`${styles.actor} ${styles.actor_no_matches}`}
                        key={actor.name || idx}
                        variants={element}
                        aria-label={`${actor.name} (no other titles in this list)`}
                      >
                        <span
                          className={`${styles.actor_role} ${
                            actor.character ? '' : styles.unassigned
                          }`}
                        >
                          {actor.character || 'Unassigned'}
                        </span>
                        <span className={styles.actor_name}>{actor.name}</span>
                      </motion.span>
                    );
                  }

                  return (
                    <motion.button
                      type="button"
                      data-cast-name={actor.name}
                      className={`${styles.actor} ${styles.actor_button} ${
                        is_selected ? styles.selected : ''
                      }`}
                      key={actor.name || idx}
                      variants={element}
                      onClick={() => onSelectCast?.(actor.name)}
                    >
                      <span
                        className={`${styles.actor_role} ${
                          actor.character ? '' : styles.unassigned
                        }`}
                      >
                        {actor.character || 'Unassigned'}
                      </span>
                      <span className={styles.actor_name}>
                        {actor.name}
                      </span>
                    </motion.button>
                  );
                })}
            </section>
          </motion.div>
          {/* Label and content share one variant child, so they enter together
              instead of the label arriving a stagger step ahead of what it
              names. Every entry has overview text, so this needs no guard. */}
          <motion.div variants={element}>
            <span className={styles.section_label}>Synopsis</span>
            <Overview
              tmdb_data={tmdb_data}
              media_data={media_data}
              is_content_expanded={is_content_expanded}
              onRevealComplete={() => setIsSynopsisRevealed(true)}
            />
          </motion.div>
          {media_data.type === 'tv' && (
            // animate rather than variants: this block deliberately opts out
            // of .container's propagated stagger sequence (element above) —
            // it needs to wait on Synopsis actually finishing, not just its
            // own turn in a fixed staggerChildren step. fade rather than
            // entry's x-slide, too: Episodes' own rows (entry_soft) already
            // supply the visible motion here, sliding down — a second, sideways
            // slide on this wrapper at the same time was what read as diagonal.
            <motion.div
              variants={fade}
              initial={false}
              animate={is_synopsis_revealed ? 'visible' : 'hidden'}
            >
              <span className={styles.section_label}>Episodes</span>
              <Episodes tmdb_data={tmdb_data} media_data={media_data} />
            </motion.div>
          )}
        </>
      )}
    </motion.section>
  );
}
