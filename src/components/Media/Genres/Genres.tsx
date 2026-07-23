import { motion } from 'motion/react';
import styles from './Genres.module.scss';
import { Genre } from '../../../types/Tmdb';

type PropTypes = {
  genres?: Genre[];
};

export default function Genres({ genres = [] }: PropTypes) {
  // Copy before sorting
  const sorted_genres = [...genres].sort((a, b) => a.name.localeCompare(b.name));

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

  return (
    <section className={styles.genres}>
      {sorted_genres.map((ele) => {
        return (
          <motion.div
            className={`${classNameColor(ele.id)}`}
            key={ele.id}
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
          >
            <p>{ele.name}</p>
          </motion.div>
        );
      })}
    </section>
  );
}
