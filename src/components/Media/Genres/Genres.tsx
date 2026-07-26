import { motion } from 'motion/react';
import styles from './Genres.module.scss';
import { Genre } from '../../../types/Tmdb';
import {
  entry,
  COLOR_REVEAL_DELAY,
  COLOR_STAGGER,
  REVEAL_DURATION,
} from '../../../utils/motion';

type PropTypes = {
  genres?: Genre[];
  start_idx?: number; // color-stagger slots already used by earlier siblings (e.g. the poster)
  is_content_expanded: boolean;
};

const classNameColor = (id: number) => {
  switch (id) {
    case 28:
      return styles.action;
    case 12:
      return styles.adventure;
    case 16:
      return styles.animation;
    case 35:
      return styles.comedy;
    case 18:
      return styles.drama;
    case 14:
      return styles.fantasy;
    case 878:
      return styles.science_fiction;
    case 53:
      return styles.thriller;
    case 10751:
      return styles.family;
    case 10759:
      return styles.aa;
    case 10765:
      return styles.sf;
    case 80:
      return styles.crime;
    case 10768:
      return styles.wp;
    case 9648:
      return styles.mystery;
    case 27:
      return styles.horror;
    default:
      return styles.none;
  }
};

export default function Genres({ genres = [], start_idx = 0, is_content_expanded }: PropTypes) {
  // Copy before sorting
  const sorted_genres = [...genres].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <section className={styles.genres}>
      {/* motion, not a plain span: RightContainer's section labels animate in
          with the block they name (they sit inside its motion.div), and this
          one has no animating ancestor of its own — as a plain span it popped
          in instantly while its own rows were still staggering in. */}
      <motion.span className={styles.list_label} variants={entry}>
        Genres
      </motion.span>
      {sorted_genres.map((ele, idx) => (
        <GenreRow
          key={ele.id}
          idx={start_idx + idx}
          name={ele.name}
          // TMDB's own genre id, shown as a code alongside the name. Padded to
          // three, though a few of them are five digits and stay as-is.
          code={String(ele.id).padStart(3, '0')}
          color_class={classNameColor(ele.id)}
          is_content_expanded={is_content_expanded}
        />
      ))}
    </section>
  );
}

type RowPropTypes = {
  idx: number;
  name: string;
  code: string;
  color_class: string;
  is_content_expanded: boolean;
};

// Fades/slides in grey (via the ancestor's own variant propagation), and
// separately shifts from grey to its real color once expanded, on a fixed
// delay staggered top-to-bottom (COLOR_STAGGER) — independent of the fade's
// own stagger in LeftContainer, and of how long that fade actually took.
function GenreRow({ idx, name, code, color_class, is_content_expanded }: RowPropTypes) {
  // Closing snaps back to grey instantly rather than reusing the delayed
  // reveal transition — otherwise a card closed before its own delay had
  // even elapsed never actually reaches opacity: 0, so reopening it has
  // nothing left to visibly animate and the reveal silently skips.
  const color_transition = is_content_expanded
    ? {
        duration: REVEAL_DURATION,
        ease: 'easeOut' as const,
        delay: COLOR_REVEAL_DELAY + idx * COLOR_STAGGER,
      }
    : { duration: 0 };

  return (
    <motion.div className={styles.genre_row} variants={entry}>
      <span className={`${styles.bar} ${styles.bar_grey}`} />
      <motion.span
        className={`${styles.bar} ${color_class}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: is_content_expanded ? 1 : 0 }}
        transition={color_transition}
      />
      <p className={styles.label}>
        <span className={styles.grey_layer}>{name}</span>
        <motion.span
          className={`${styles.color_layer} ${color_class}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: is_content_expanded ? 1 : 0 }}
          transition={color_transition}
        >
          {name}
        </motion.span>
      </p>
      <span className={styles.code}>{code}</span>
    </motion.div>
  );
}
