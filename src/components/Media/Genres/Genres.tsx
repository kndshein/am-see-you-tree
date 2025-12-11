import { motion } from 'motion/react';
import styles from './Genres.module.scss';

type PropTypes = {
  genres: Array<any>;
};

export default function Genres({ genres }: PropTypes) {
  genres.sort((a, b) => {
    if (a.name < b.name) {
      return -1;
    }
    if (a.name > b.name) {
      return 1;
    }
    return 0;
  });

  const classNameColor = (e: number) => {
    let className;
    switch (e) {
      case 28:
        className = styles.action;
        break;
      case 12:
        className = styles.adventure;
        break;
      case 16:
        className = styles.animation;
        break;
      case 35:
        className = styles.comedy;
        break;
      case 18:
        className = styles.drama;
        break;
      case 14:
        className = styles.fantasy;
        break;
      case 878:
        className = styles.science_fiction;
        break;
      case 53:
        className = styles.thriller;
        break;
      case 10751:
        className = styles.family;
        break;
      case 10759:
        className = styles.aa;
        break;
      case 10765:
        className = styles.sf;
        break;
      case 80:
        className = styles.crime;
        break;
      case 10768:
        className = styles.wp;
        break;
      case 9648:
        className = styles.mystery;
        break;
      case 27:
        className = styles.horror;
        break;
      default:
        className = styles.none;
    }
    return className;
  };

  return (
    <section className={styles.genres}>
      {genres.map((ele, idx) => {
        return (
          <motion.div
            className={`${classNameColor(ele.id)}`}
            key={idx}
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
