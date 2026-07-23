import { motion } from 'motion/react';
import { ShowType } from '../../../types/Media';
import styles from './Season.module.scss';

type PropTypes = {
  media_data: ShowType;
  is_content_collapsed: boolean;
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
}: PropTypes) {
  return (
    <motion.div
      className={styles.season_wrapper}
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
