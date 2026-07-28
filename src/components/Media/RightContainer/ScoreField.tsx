import { motion, useMotionValue, useTransform } from 'motion/react';
import styles from './RightContainer.module.scss';
import scoreColor from '../../../utils/score-color';
import { entry } from '../../../utils/motion';
import VoteCounter, { formatPercent } from './VoteCounter';

type PropTypes = {
  label: string;
  // Full source name, shown as a native title-attribute tooltip on the
  // abbreviated label — "RT"/"MC" read as cryptic on their own otherwise.
  full_name: string;
  value: number; // the number displayed/animated to, in whatever scale `format` expects
  // scoreColor always wants a 0-100 basis. Defaults to `value` — right for
  // TMDB/Rotten Tomatoes/Metacritic, already 0-100 — but IMDb's own 0-10
  // scale needs its own 0-100 figure passed in here separately, so the
  // colour still lands correctly while the counter itself animates/displays
  // the raw decimal.
  color_value?: number;
  format?: (value: number) => string;
  sub_value?: string;
  play: boolean;
  delay: number;
};

// One shared shape for every score in the vitals row (TMDB/RT/MC/IMDb) — same
// count-up, same colour scale, same optional secondary figure — so the row
// reads as four instances of one thing rather than four separately-built
// fields that happen to look similar. The three sources don't actually
// format the same way (TMDB/RT are "%", Metacritic is a bare number, IMDb is
// a one-decimal /10 figure), so `format`/`color_value` let each source keep
// its own native shape while everything still shares one component.
export default function ScoreField({
  label,
  full_name,
  value,
  color_value = value,
  format = formatPercent,
  sub_value,
  play,
  delay,
}: PropTypes) {
  // A MotionValue, not React state — same reasoning as RightContainer's old
  // single vote_value: motion writes the derived colour straight to the DOM
  // node, so the count-up doesn't re-render the rest of the card per frame.
  const score_value = useMotionValue(0);
  // Tracks the count-up's own progress (latest/value) scaled onto
  // color_value's 0-100 basis, rather than scoreColor(latest) directly — the
  // two only diverge for IMDb, where `latest` counts up through 0-10 while
  // the colour still needs to land on scoreColor of the 0-100 equivalent.
  const score_color = useTransform(score_value, (latest) =>
    scoreColor(value > 0 ? (latest / value) * color_value : color_value),
  );

  return (
    <motion.span variants={entry}>
      <span className={styles.label} title={full_name}>
        {label}
      </span>
      <span className={styles.value_row}>
        <motion.span style={{ color: score_color }}>
          <VoteCounter
            value={value}
            play={play}
            delay={delay}
            motion_value={score_value}
            format={format}
          />
        </motion.span>
        {sub_value && <span className={styles.sub_value}>{sub_value}</span>}
      </span>
    </motion.span>
  );
}
