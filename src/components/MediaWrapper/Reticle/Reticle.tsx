import { motion } from 'motion/react';
import styles from './Reticle.module.scss';

type PropTypes = {
  is_expanded: boolean;
};

// JARVIS-style targeting brackets that snap onto the expanded card.
const corners = ['tl', 'tr', 'bl', 'br'] as const;

// Each corner starts pushed out from its resting position and slides in.
const offsets = {
  tl: { x: -28, y: -28 },
  tr: { x: 28, y: -28 },
  bl: { x: -28, y: 28 },
  br: { x: 28, y: 28 },
};

export default function Reticle({ is_expanded }: PropTypes) {
  return (
    <motion.div
      className={styles.reticle}
      initial={false}
      animate={is_expanded ? 'lock' : 'idle'}
      // Wrapped in AnimatePresence by MediaWrapper, so the brackets retract
      // on close rather than disappearing the instant the card deactivates.
      exit="idle"
      aria-hidden="true"
    >
      <div className={styles.frame}>
        {corners.map((corner) => (
          <motion.span
            key={corner}
            className={`${styles.corner} ${styles[corner]}`}
            variants={{
              idle: { opacity: 0, ...offsets[corner] },
              lock: {
                opacity: 1,
                x: 0,
                y: 0,
                transition: { delay: 0.55, duration: 0.45, ease: 'easeOut' },
              },
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}
