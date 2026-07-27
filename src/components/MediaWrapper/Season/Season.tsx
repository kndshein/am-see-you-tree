import { motion } from 'motion/react';
import { ShowType } from '../../../types/Media';
import styles from './Season.module.scss';

type PropTypes = {
  media_data: ShowType;
  is_content_collapsed: boolean;
  // Phase.tsx renders one row when unassigned (just its own pill) instead
  // of two ("Phase: N" plus the saga pill) — this badge's own bottom offset
  // (Season.module.scss) needs to know which, so it can sit close to
  // whichever one is actually visible instead of always leaving room for
  // the taller, two-row case.
  is_phase_assigned: boolean;
};

const nums = [
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
];

export default function Season({
  media_data,
  is_content_collapsed,
  is_phase_assigned,
}: PropTypes) {
  return (
    <motion.div
      className={`${styles.season_wrapper} ${
        !is_phase_assigned ? styles.season_wrapper_phase_unassigned : ''
      }`}
      layout="position"
      variants={{
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.2,
          },
        },
        hidden: {
          opacity: 0,
          y: -50,
          transition: {
            duration: 0,
          },
        },
      }}
      animate={is_content_collapsed ? 'visible' : 'hidden'}
    >
      <p className={styles.season_label}>Season</p>
      <p className={styles.season_num}>
        {nums[media_data.season - 1] ?? media_data.season}
      </p>
    </motion.div>
  );
}
