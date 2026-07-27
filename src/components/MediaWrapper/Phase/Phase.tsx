import { motion } from 'motion/react';
import {
  McuPhase,
  SAGA_CLASS,
  sagaDisplayName,
} from '../../../assets/mcu-phases';
import styles from './Phase.module.scss';

type PropTypes = {
  phase_data: McuPhase | undefined;
  is_content_collapsed: boolean;
};

export default function Phase({
  phase_data,
  is_content_collapsed,
}: PropTypes) {
  return (
    <motion.div
      className={`${styles.phase_wrapper} ${
        !phase_data ? styles.phase_wrapper_unassigned : ''
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
      {phase_data ? (
        <>
          <span className={styles.phase_num}>Phase :: {phase_data.phase}</span>
          <span
            className={`${styles.phase_pill} ${
              styles[SAGA_CLASS[phase_data.saga]] ?? ''
            }`}
          >
            {sagaDisplayName(phase_data.saga)}
          </span>
        </>
      ) : (
        // A single pill rather than the two-row text+pill layout above —
        // see .phase_wrapper_unassigned (Phase.module.scss) for how this
        // stays bottom-anchored instead of leaving the reserved second row
        // empty above it.
        <span className={`${styles.phase_pill} ${styles.unassigned}`}>
          Phase :: Unassigned
        </span>
      )}
    </motion.div>
  );
}
