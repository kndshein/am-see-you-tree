import { Fragment, useEffect, useMemo, useState } from 'react';
import styles from './RightContainer.module.scss';
import { TmdbType, CastMember } from '../../../types/Tmdb';
import { MediaType } from '../../../types/Media';
import { HandleToggleType } from '../../../types/Toggles';
import dateCalc, { dateEpochSeed } from '../../../utils/date-calc';
import runtimeCalc, { runtimeMsSeed } from '../../../utils/runtime-calc';
import { dashify } from '../../../utils/format';
import Episodes from '../Episodes/Episodes';
import { container } from '../Media';
import {
  entry,
  fade,
  CARD_DELAY_CHILDREN,
  CARD_STAGGER,
} from '../../../utils/motion';
import { motion } from 'motion/react';
import Overview from '../Overview/Overview';
import GlitchText from './GlitchText';
import {
  castNamesWithOtherEntries,
  isUnreleased,
} from '../../../utils/media-lists';
import { useTmdbData } from '../../../utils/tmdb-data';
import CollectionPanel from '../../MediaWrapper/CollectionPanel/CollectionPanel';
import CastPanel from '../../MediaWrapper/CastPanel/CastPanel';

type PropTypes = {
  tmdb_data: TmdbType;
  media_data: MediaType;
  is_active: boolean;
  is_content_expanded: boolean;
  selected_cast?: string | null;
  onSelectCast?: (cast_name: string) => void;
  media_list: Array<MediaType>;
  is_movies_only: boolean;
  handleJump: HandleToggleType;
};

// When info_group actually starts entering: this container is Media's 3rd
// child (delayChildren + 2 stagger steps), and info_group is this container's
// 2nd (+1 more step). GlitchText's own scramble below starts on that beat —
// its flat 1s default would otherwise have it running for ~0.2s while the row
// it lives in was still invisible.
const INFO_GROUP_DELAY = CARD_DELAY_CHILDREN + 2 * CARD_STAGGER + CARD_STAGGER;

const INITIAL_CAST_COUNT = 5;
const PILL_STAGGER = 0.05;

// A plain module-level function, not defined inline in the component body —
// .cast's pills below call this through pill_variants (useMemo'd arrays),
// specifically so each pill gets the SAME object across re-renders rather
// than a fresh one every time. A fresh object every render was the actual
// bug behind "the initial five all just appear instead of cascading": with
// an explicit initial/animate pair (needed so a pill mounting long after the
// card opened doesn't inherit an already-resolved ambient context as its own
// starting point — see the pills' own comment below), Framer re-evaluates
// whether to (re)start the transition on any receiving a new `variants`
// object, and RightContainer re-renders several times during the opening
// sequence — each one was quietly restarting the still-in-progress
// animation from scratch, which collapsed into "no visible cascade."
function pillVariants(pill_idx: number) {
  return {
    ...entry,
    visible: {
      ...entry.visible,
      transition: {
        ...entry.visible.transition,
        delay: pill_idx * PILL_STAGGER,
      },
    },
  };
}

export default function RightContainer({
  tmdb_data,
  media_data,
  is_active,
  is_content_expanded,
  selected_cast,
  onSelectCast,
  media_list,
  is_movies_only,
  handleJump,
}: PropTypes) {
  const tmdb_data_map = useTmdbData();

  // Episodes waits on this rather than the flat staggerChildren step below —
  // a synopsis's word-by-word reveal (Overview.tsx) runs far longer than one
  // stagger step for anything but the shortest text, so the fixed step alone
  // let Episodes start sliding in while Synopsis was still typing.
  const [is_synopsis_revealed, setIsSynopsisRevealed] = useState(false);
  // Whether the cast list below is showing everyone or just the first 5.
  // Reset alongside the synopsis reveal (same effect, same trigger) so a
  // closed-then-reopened card always starts back at the compact view rather
  // than remembering the last expansion.
  const [is_cast_expanded, setIsCastExpanded] = useState(false);
  useEffect(() => {
    if (!is_content_expanded) {
      setIsSynopsisRevealed(false);
      setIsCastExpanded(false);
    }
  }, [is_content_expanded]);

  const element = {
    ...entry,
    // Same movement as everything else, plus a stagger for the fields it wraps.
    visible: {
      ...entry.visible,
      transition: { ...entry.visible.transition, staggerChildren: 0.05 },
    },
  };

  // Release/runtime's own explicit delay, rather than relying purely on
  // info_group's staggerChildren propagation — this same value is also
  // GlitchText's own `delay` below (a separate imperative animation, outside
  // Framer's variant system), so the field's fade-in and its text-scramble
  // resolve together instead of the scramble finishing before the field has
  // even faded in.
  const RELEASE_ENTRY_DELAY = INFO_GROUP_DELAY;
  const RUNTIME_ENTRY_DELAY = RELEASE_ENTRY_DELAY + 0.05;
  const release_entry = {
    ...entry,
    visible: {
      ...entry.visible,
      transition: { ...entry.visible.transition, delay: RELEASE_ENTRY_DELAY },
    },
  };
  const runtime_entry = {
    ...entry,
    visible: {
      ...entry.visible,
      transition: { ...entry.visible.transition, delay: RUNTIME_ENTRY_DELAY },
    },
  };

  const season_data =
    media_data.type === 'tv'
      ? tmdb_data[`season/${media_data.season}`]
      : undefined;

  const is_unreleased = isUnreleased(media_data, tmdb_data);

  // Stored comma-joined (two directors is common), split back out so each gets
  // its own pill alongside the cast.
  const authors = (tmdb_data.author ?? '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);

  const full_cast = tmdb_data.credits?.cast ?? [];
  const visible_cast = is_cast_expanded
    ? full_cast
    : full_cast.slice(0, INITIAL_CAST_COUNT);

  // Only pills revealed later by Show All get their own explicit
  // initial/animate + custom delay (below) — the first 5 (+ authors) go back
  // to the plain ambient `element` variant every other block in this
  // component uses, for a reason that isn't obvious: .cast_header's own
  // wrapper (the <motion.div variants={element}> below) doesn't fade in the
  // instant the card opens — it's RightContainer's own 3rd staggered child
  // (after tagline, info_group), so ambient propagation only gets to it
  // partway through the card's opening sequence. Explicit animate bypasses
  // that ambient delay entirely and reacts to is_content_expanded directly —
  // so the pills were finishing their ENTIRE entrance while still hidden
  // behind their own not-yet-visible wrapper, then all popping in together
  // the instant the wrapper itself finally faded in, which is what read as
  // "arriving with the label, no cascade." Show All's pills don't have this
  // problem: by the time they mount, the wrapper's already been fully
  // visible for a while, so there's no competing ambient delay to race.
  // Memoized (not built inline) so each pill gets the SAME object across
  // re-renders — see pillVariants' own comment above for why that matters.
  const revealed_pill_variants = useMemo(
    () =>
      Array.from(
        { length: Math.max(0, full_cast.length - INITIAL_CAST_COUNT) },
        (_, i) => pillVariants(i),
      ),
    [full_cast.length],
  );

  // Which pills are actually navigable. Built once per card rather than
  // per pill: the previous per-pill castMatchesInMediaList call rebuilt,
  // refiltered and sorted the entire rail for every actor on screen — see
  // castNamesWithOtherEntries' own comment (media-lists.ts) for the cost.
  // Same answer, just hoisted out of the render loop.
  const cast_with_other_entries = useMemo(
    () =>
      castNamesWithOtherEntries(
        media_list,
        tmdb_data_map,
        is_movies_only,
        media_data,
      ),
    [media_list, tmdb_data_map, is_movies_only, media_data],
  );

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
          {/* Plain wrapper, not a motion element — tagline and info_group
              below keep their own existing variants/timing untouched;
              Framer's stagger propagation counts them in document order
              regardless of this non-motion div between them and .container
              (same pattern .cast_header/.cast already rely on). This div
              exists purely so CSS can let Released/Runtime sit on the same
              line as a short tagline and wrap below a long one, the way
              .container's own column flow (one block per line) can't. */}
          <div className={styles.tagline_row}>
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
            {/* Release date/runtime, the fields left in this row now that the
                TMDB/RT/MC/IMDb scores have moved to LeftContainer's own
                Ratings block (above Finances). */}
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
              {media_data.type === 'tv' ? (
                <motion.span variants={release_entry}>
                  <span className={styles.label}>
                    {is_unreleased ? 'Will Release' : 'Aired'}
                  </span>
                  <GlitchText
                    final_text={dateCalc(season_data?.air_date)}
                    seed_text={dateEpochSeed(season_data?.air_date)}
                    play={is_content_expanded}
                    delay={RELEASE_ENTRY_DELAY}
                  />
                </motion.span>
              ) : (
                <>
                  <motion.span variants={release_entry}>
                    <span className={styles.label}>
                      {is_unreleased ? 'Will Release' : 'Released'}
                    </span>
                    <GlitchText
                      final_text={dateCalc(tmdb_data.release_date)}
                      seed_text={dateEpochSeed(tmdb_data.release_date)}
                      play={is_content_expanded}
                      delay={RELEASE_ENTRY_DELAY}
                    />
                  </motion.span>
                  <motion.span variants={runtime_entry}>
                    <span className={styles.label}>Runtime</span>
                    <GlitchText
                      final_text={runtimeCalc(tmdb_data.runtime)}
                      seed_text={runtimeMsSeed(tmdb_data.runtime)}
                      play={is_content_expanded}
                      delay={RUNTIME_ENTRY_DELAY}
                    />
                  </motion.span>
                </>
              )}
            </motion.section>
          </div>
          {/* One list of people: whoever made it, then who's in it. The label
              shares a variant child with the pills so it doesn't arrive a
              stagger step ahead of them. */}
          <motion.div variants={element}>
            <span className={styles.cast_header}>
              <span className={styles.section_label}>
                {media_data.type === 'tv' ? 'Creators & Cast' : 'Directors & Cast'}
              </span>
              {/* Only worth showing once there's actually more hiding behind
                  the slice(0, 5) below — otherwise every pill is already on
                  screen and the button would toggle nothing. */}
              {full_cast.length > 5 && (
                <button
                  type="button"
                  className={styles.see_all}
                  onClick={() => setIsCastExpanded((prev) => !prev)}
                >
                  <span className={styles.see_all_bracket}>[</span>
                  {dashify(is_cast_expanded ? 'Show Less' : 'Show All')}
                  <span className={styles.see_all_bracket}>]</span>
                </button>
              )}
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
              {visible_cast.map((actor: CastMember, idx: number) => {
                // One of the first 5 rides the same ambient `element` cascade
                // as the authors above it (see revealed_pill_variants' own
                // comment for why); one revealed only by Show All gets its
                // own explicit variant/initial/animate instead, so it
                // actually replays an entrance at all once mounted long after
                // that ambient transition already resolved.
                const is_revealed_pill = idx >= INITIAL_CAST_COUNT;
                const pill_variant = is_revealed_pill
                  ? revealed_pill_variants[idx - INITIAL_CAST_COUNT]
                  : element;
                const is_selected = selected_cast === actor.name;
                // Whether this actor appears in any rail item other than the
                // one on screen — i.e. whether the pill has anywhere to jump
                // to. cast_with_other_entries (above) already applies the
                // isShown filter and the current-card exclusion.
                const has_other_movies = cast_with_other_entries.has(
                  actor.name.toLowerCase(),
                );

                if (!has_other_movies) {
                  // No filmography to show — render as a plain non-interactive pill.
                  return (
                    <motion.span
                      className={`${styles.actor} ${styles.actor_no_matches}`}
                      key={actor.name || idx}
                      variants={pill_variant}
                      {...(is_revealed_pill && {
                        initial: 'hidden',
                        animate: is_content_expanded ? 'visible' : 'hidden',
                      })}
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
                  // Fragment (not the button itself) carries the key: on
                  // narrow viewports the inline CastPanel now renders as this
                  // actor's own sibling rather than as one fixed block after
                  // the whole pill row, so panel_wrap_inline's flex-basis:
                  // 100% (CastPanel.module.scss) drops it onto its own line
                  // right where the clicked pill sits in the wrap, instead of
                  // always under the last row regardless of who was clicked.
                  <Fragment key={actor.name || idx}>
                    <motion.button
                      type="button"
                      data-cast-name={actor.name}
                      className={`${styles.actor} ${styles.actor_button} ${
                        is_selected ? styles.selected : ''
                      }`}
                      variants={pill_variant}
                      {...(is_revealed_pill && {
                        initial: 'hidden',
                        animate: is_content_expanded ? 'visible' : 'hidden',
                      })}
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
                    {is_selected && (
                      <CastPanel
                        variant="inline"
                        media_data={media_data}
                        selected_cast={selected_cast ?? null}
                        media_list={media_list}
                        handleJump={handleJump}
                        is_content_expanded={is_content_expanded}
                        is_movies_only={is_movies_only}
                      />
                    )}
                  </Fragment>
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
          {/* Narrow-viewport counterpart to MediaWrapper's floating
              CollectionPanel — below Synopsis, above Episodes for TV. Gated
              on is_synopsis_revealed too, same reason as Episodes below: its
              own reveal is driven directly off is_content_expanded, so
              without this it would finish staggering in while Synopsis was
              still mid-reveal instead of waiting its turn after it. */}
          <CollectionPanel
            variant="inline"
            media_data={media_data}
            tmdb_data={tmdb_data}
            media_list={media_list}
            handleJump={handleJump}
            is_content_expanded={is_content_expanded && is_synopsis_revealed}
          />
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
