import { useState } from 'react';
import { motion, AnimationDefinition } from 'motion/react';
import styles from './Genres.module.scss';
import { Genre } from '../../../types/Tmdb';

type PropTypes = {
  genres?: Genre[];
  start_idx?: number; // color-stagger slots already used by earlier siblings (e.g. the poster)
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

// Gap between each row's color reveal, independent of how fast the rows
// themselves fade in.
const COLOR_STAGGER = 0.3;

export default function Genres({ genres = [], start_idx = 0 }: PropTypes) {
  // Copy before sorting
  const sorted_genres = [...genres].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <section className={styles.genres}>
      {sorted_genres.map((ele, idx) => (
        <GenreRow
          key={ele.id}
          idx={start_idx + idx}
          name={ele.name}
          color_class={classNameColor(ele.id)}
        />
      ))}
    </section>
  );
}

type RowPropTypes = {
  idx: number;
  name: string;
  color_class: string;
};

// Fades/slides in grey, then (only once that entrance finishes) shifts from
// grey to its real color. The reveal itself is staggered top-to-bottom via
// an explicit per-row delay (COLOR_STAGGER), independent of the fade's own
// stagger in LeftContainer.
function GenreRow({ idx, name, color_class }: RowPropTypes) {
  const [is_revealed, setIsRevealed] = useState(false);

  const handleAnimationComplete = (definition: AnimationDefinition) => {
    if (definition === 'visible') setIsRevealed(true);
    if (definition === 'hidden') setIsRevealed(false);
  };

  const color_transition = {
    duration: 0.6,
    ease: 'easeOut',
    delay: idx * COLOR_STAGGER,
  } as const;

  return (
    <motion.div
      className={styles.genre_row}
      variants={{
        visible: {
          opacity: 1,
          x: 0,
          transition: {
            x: {
              duration: 0.1,
            },
          },
        },
        hidden: {
          opacity: 0,
          x: -100,
          transition: {
            x: {
              duration: 0.1,
            },
          },
        },
      }}
      onAnimationComplete={handleAnimationComplete}
    >
      <span className={`${styles.bar} ${styles.bar_grey}`} />
      <motion.span
        className={`${styles.bar} ${color_class}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: is_revealed ? 1 : 0 }}
        transition={color_transition}
      />
      <p className={styles.label}>
        <span className={styles.grey_layer}>{name}</span>
        <motion.span
          className={`${styles.color_layer} ${color_class}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: is_revealed ? 1 : 0 }}
          transition={color_transition}
        >
          {name}
        </motion.span>
      </p>
    </motion.div>
  );
}
