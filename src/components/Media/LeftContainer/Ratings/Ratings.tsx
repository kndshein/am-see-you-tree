import { ReactNode } from 'react';
import { motion, useMotionValue, useTransform } from 'motion/react';
import {
  SiThemoviedatabase,
  SiRottentomatoes,
  SiMetacritic,
  SiImdb,
} from 'react-icons/si';
import styles from './Ratings.module.scss';
import { TmdbType } from '../../../../types/Tmdb';
import { entry_vertical, CARD_DELAY_CHILDREN, CARD_STAGGER } from '../../../../utils/motion';
import scoreColor, { RatingSource } from '../../../../utils/score-color';
import { useOmdbData } from '../../../../utils/omdb-data';
import VoteCounter, {
  formatPercent,
  formatPlain,
  formatDecimal,
} from '../../RightContainer/VoteCounter';

type PropTypes = {
  tmdb_data: TmdbType;
  is_content_expanded: boolean;
};

// Each source's own brand mark, not a generic bullet — same "read the row at
// a glance" reasoning as CastPanel's own per-type TYPE_ICONS.
const SOURCE_ICONS: Record<RatingSource, ReactNode> = {
  tmdb: <SiThemoviedatabase />,
  rt: <SiRottentomatoes />,
  metacritic: <SiMetacritic />,
  imdb: <SiImdb />,
};

// LeftContainer is Media's 2nd child (delayChildren + 1 stagger step), and
// this is LeftContainer's own 2nd child, poster being its 1st (+1 step of
// LeftContainer's own 0.1 staggerChildren). Same derivation as
// RightContainer's VITALS_DELAY, just for this column's own stagger step.
const RATINGS_DELAY = CARD_DELAY_CHILDREN + CARD_STAGGER + 0.1;

// Moved here from RightContainer's vitals row: same four scores, now shown
// as a stack of color-coded progress bars above Finances instead of bare
// count-up numbers, so the ratings themselves are readable at a glance.
export default function Ratings({ tmdb_data, is_content_expanded }: PropTypes) {
  const omdb_data_map = useOmdbData();
  // Keyed by imdb_id (prefetch-omdb.mjs), not this card's own tmdb_key —
  // OMDb has no per-season concept, so every season of a show looks itself
  // up under the same series-level entry.
  const omdb = tmdb_data.imdb_id ? omdb_data_map[tmdb_data.imdb_id] : undefined;

  // TMDB returns vote_average: 0 for anything with no votes yet, same as a
  // (never actually seen) genuine 0.0 score — this is what tells the two
  // apart, so the row can show "N/A" instead of a misleading "0%".
  const has_rating = tmdb_data.vote_average > 0;
  const vote_percent = Math.round((tmdb_data.vote_average ?? 0) * 10);
  // Kept raw (not x10'd like vote_percent above) — IMDb's own field shows
  // its native 0-10/one-decimal shape rather than TMDB's percent, so this is
  // the value the row actually animates/displays; color_value below is what
  // still gets it onto scoreColor's 0-100 basis.
  const imdb_rating = omdb?.imdb_rating;

  return (
    <motion.section className={styles.ratings} variants={entry_vertical}>
      {has_rating ? (
        <RatingRow
          label="TMDB"
          full_name="The Movie Database"
          value={vote_percent}
          source="tmdb"
          play={is_content_expanded}
        />
      ) : (
        <div className={styles.row}>
          <span className={styles.label_group}>
            <span className={styles.icon}>{SOURCE_ICONS.tmdb}</span>
            <span className={styles.label} title="The Movie Database">
              TMDB
            </span>
          </span>
          <span className={styles.track} />
          <span className={`${styles.value} ${styles.no_rating}`}>N/A</span>
        </div>
      )}
      {omdb?.rotten_tomatoes != null && (
        <RatingRow
          label="RT"
          full_name="Rotten Tomatoes"
          value={omdb.rotten_tomatoes}
          source="rt"
          play={is_content_expanded}
        />
      )}
      {omdb?.metascore != null && (
        <RatingRow
          label="MC"
          full_name="Metacritic"
          value={omdb.metascore}
          format={formatPlain}
          source="metacritic"
          play={is_content_expanded}
        />
      )}
      {imdb_rating != null && (
        <RatingRow
          label="IMDb"
          full_name="Internet Movie Database"
          value={imdb_rating}
          color_value={imdb_rating * 10}
          format={formatDecimal}
          source="imdb"
          play={is_content_expanded}
        />
      )}
    </motion.section>
  );
}

type RowPropTypes = {
  label: string;
  full_name: string;
  value: number;
  // scoreColor and the bar fill both always want a 0-100 basis. Defaults to
  // `value` — right for TMDB/Rotten Tomatoes/Metacritic, already 0-100 — but
  // IMDb's own 0-10 scale needs its own 0-100 figure passed in here
  // separately, so the bar/colour still land correctly while the counter
  // itself animates/displays the raw decimal.
  color_value?: number;
  format?: (value: number) => string;
  // Which site's own hue calibration to use (score-color.ts) — the same raw
  // percent means something different per source (a Metacritic 65 and an
  // RT 65 don't reflect the same reception), so each row colors itself off
  // its own source's curve rather than one shared scale.
  source: RatingSource;
  play: boolean;
};

// One shared shape for every rating (TMDB/RT/MC/IMDb) — same count-up, same
// colour scale as RightContainer's old ScoreField, plus a bar whose fill
// width tracks the same 0-100 basis as the colour, so the two always read as
// one instrument (bar length and number color agree at every frame of the
// count-up, not just at rest).
function RatingRow({
  label,
  full_name,
  value,
  color_value = value,
  format = formatPercent,
  source,
  play,
}: RowPropTypes) {
  // A MotionValue, not React state — same reasoning as the old ScoreField:
  // motion writes the derived colour/width straight to the DOM node, so the
  // count-up doesn't re-render the rest of the card per frame.
  const score_value = useMotionValue(0);
  const percent_basis = (latest: number) =>
    value > 0 ? (latest / value) * color_value : color_value;
  const score_color = useTransform(score_value, (latest) =>
    scoreColor(percent_basis(latest), source),
  );
  const bar_width = useTransform(
    score_value,
    (latest) => `${Math.max(0, Math.min(100, percent_basis(latest)))}%`,
  );

  return (
    <div className={styles.row}>
      <span className={styles.label_group}>
        <span className={styles.icon}>{SOURCE_ICONS[source]}</span>
        <span className={styles.label} title={full_name}>
          {label}
        </span>
      </span>
      <span className={styles.track}>
        <motion.span
          className={styles.fill}
          style={{ width: bar_width, borderBottomColor: score_color }}
        />
      </span>
      <motion.span className={styles.value} style={{ color: score_color }}>
        <VoteCounter
          value={value}
          play={play}
          delay={RATINGS_DELAY}
          motion_value={score_value}
          format={format}
        />
      </motion.span>
    </div>
  );
}
