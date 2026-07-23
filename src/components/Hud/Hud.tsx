import styles from './Hud.module.scss';

// Fixed, non-interactive "helmet interior" frame that overlays the whole
// viewport so everything reads as projected onto the visor. Purely decorative
// (pointer-events: none) — clicks pass straight through to the UI beneath.
export default function Hud() {
  return (
    <div className={styles.hud} aria-hidden="true">
      <div className={styles.vignette} />
      <div className={styles.sheen} />

      <div className={styles.rail_left} />
      <div className={styles.rail_right} />

      <div className={styles.corner_tl} />
      <div className={styles.corner_tr} />
      <div className={styles.corner_bl} />
      <div className={styles.corner_br} />

      <div className={styles.top_bar}>
        <span>MCU&nbsp;//&nbsp;DATABASE</span>
        <span>STARK&nbsp;INDUSTRIES</span>
      </div>
    </div>
  );
}
