import { motion } from 'motion/react';
import { MediaType } from '../../../types/Media';
import { TmdbType } from '../../../types/Tmdb';
import { entry } from '../../../utils/motion';
import { phaseOf } from '../../../utils/media-lists';
import { sagaDisplayName } from '../../../assets/mcu-phases';
import styles from './Record.module.scss';

type PropTypes = {
  media_data: MediaType;
  tmdb_data: TmdbType;
};

const pad = (value: number, width = 2) => String(value).padStart(width, '0');

// Machine-readable strip along the bottom of an expanded card. Everything here
// is already in the data — the point is the coded form, which reads as a record
// rather than as prose.
//
// No `animate` of its own: it sits in Media's variant tree and inherits the
// visible/hidden label and the stagger timing from it.
export default function Record({ media_data, tmdb_data }: PropTypes) {
  // Ids are `<tmdb id>-<slug>`, e.g. 1771-captain-america-the-first-avenger.
  // Falls back to the whole string if an id ever lands without the prefix.
  const [tmdb_id] = media_data.id.split('-');

  const classification =
    media_data.type === 'tv'
      ? `TV.S${pad(media_data.season)}.E${pad(media_data.epiStart)}-${pad(
          media_data.epiEnd,
        )}`
      : media_data.type;

  // Undefined outside Marvel Studios' own numbered Phase list (mcu-phases.ts)
  // — unlike IMDB below (omitted entirely when there's no imdb_id), this
  // field always prints: PHASE is as much a fact about this entry as CLS is,
  // so "not part of the MCU" is worth stating rather than leaving a gap.
  const phase_data = phaseOf(media_data);

  return (
    <motion.div
      className={styles.record}
      aria-hidden="true"
      variants={{
        visible: { transition: { staggerChildren: 0.12 } },
        hidden: {},
      }}
    >
      {/* Two groups pushed to opposite ends: what the entry *is* on the left,
          which system it's cross-referenced in on the right. The wrappers
          are plain spans, so variant propagation still reaches each field
          directly and the stagger runs across both in order. */}
      <span className={styles.group}>
        <motion.span variants={entry}>
          <span className={styles.key}>ID</span>TMDB.{tmdb_id}
        </motion.span>
        <motion.span variants={entry}>
          <span className={styles.key}>CLS</span>
          {classification}
        </motion.span>
        <motion.span variants={entry}>
          <span className={styles.key}>PHASE</span>
          {phase_data ? (
            <>
              {phase_data.phase}
              {/* Full stop, not the middle-dot this used to be — matches
                  the HUD's own separator convention (Hud.tsx's
                  SOURCE_SYNCED, "2026-07-23" rendered "2026.07.23"). */}
              <span className={styles.phase_divider}>.</span>
              {sagaDisplayName(phase_data.saga)}
            </>
          ) : (
            'Unassigned'
          )}
        </motion.span>
      </span>
      <span className={`${styles.group} ${styles.group_end}`}>
        {tmdb_data.imdb_id && (
          <motion.span variants={entry}>
            <span className={styles.key}>IMDB</span>
            {tmdb_data.imdb_id}
          </motion.span>
        )}
      </span>
    </motion.div>
  );
}
