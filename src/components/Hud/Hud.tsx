import styles from './Hud.module.scss';
import { MediaCounts } from '../../utils/media-lists';
import { APP_VERSION } from '../../utils/version';

type PropTypes = {
  counts: MediaCounts;
};

// Fixed, non-interactive "helmet interior" frame that overlays the whole
// viewport so everything reads as projected onto the visor. Purely decorative
// (pointer-events: none) — clicks pass straight through to the UI beneath.
export default function Hud({ counts }: PropTypes) {
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

      <div className={styles.readout}>
        <span className={styles.readout_total}>
          {counts.total} {counts.total === 1 ? 'Entry' : 'Entries'}
        </span>
        {counts.by_type.map((row) => (
          <span key={row.label} className={styles.readout_row}>
            <span>{row.label}</span>
            <span className={styles.readout_value}>{row.count}</span>
          </span>
        ))}
      </div>

      <div className={styles.version}>v{APP_VERSION}</div>
    </div>
  );
}
