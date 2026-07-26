import { useCallback, useEffect, useRef, useState } from 'react';
import { useMotionValueEvent } from 'motion/react';
import styles from './Hud.module.scss';
import { MediaSummary } from '../../utils/media-lists';
import { APP_VERSION } from '../../utils/version';
import {
  focused_position,
  card_count,
  is_locked,
} from '../../utils/hud-telemetry';
import tmdb_meta from '../../assets/tmdb-data.meta.json';
import type { OrderType } from '../../App';
import About from '../About/About';

type PropTypes = {
  summary: MediaSummary;
  order_type: OrderType;
  is_movies_only: boolean;
};

// Written by scripts/prefetch-tmdb.mjs on every fetch, so this is a real
// provenance readout rather than set dressing: which snapshot is loaded, and
// when it was pulled.
const SOURCE_SIGNATURE = tmdb_meta.signature.slice(0, 8).toUpperCase();
const SOURCE_SYNCED = tmdb_meta.generated.slice(0, 10).replace(/-/g, '.');

const pad3 = (value: number) => String(value).padStart(3, '0');

const formatRuntime = (minutes: number) =>
  `${Math.floor(minutes / 60)}h ${minutes % 60}m`;

// Both readouts below write straight to their own text node. The values behind
// them change every animation frame while scrolling, so going through React
// state would re-render the app at 60fps to update a handful of characters.

function PositionReadout() {
  const ref = useRef<HTMLSpanElement>(null);

  const write = useCallback(() => {
    const total = card_count.get();
    if (!ref.current) return;
    ref.current.textContent = total
      ? `${pad3(focused_position.get())} / ${pad3(total)}`
      : '';
  }, []);

  useMotionValueEvent(focused_position, 'change', write);
  useMotionValueEvent(card_count, 'change', write);
  // The rail may have written its first values before this mounted.
  useEffect(write, [write]);

  return <span ref={ref} />;
}

function StatusReadout() {
  const ref = useRef<HTMLSpanElement>(null);

  // Toggles a class as well as the text: LOCKED reads as an alert state, so it
  // breaks out of the HUD's green and goes orange-red.
  const write = useCallback((locked: boolean) => {
    if (!ref.current) return;
    ref.current.textContent = locked ? 'Locked' : 'Scanning';
    ref.current.classList.toggle(styles.locked, locked);
  }, []);

  useMotionValueEvent(is_locked, 'change', write);
  useEffect(() => write(is_locked.get()), [write]);

  return <span ref={ref} />;
}

// Fixed, non-interactive "helmet interior" frame that overlays the whole
// viewport so everything reads as projected onto the visor. Purely decorative
// (pointer-events: none) — clicks pass straight through to the UI beneath.
export default function Hud({
  summary,
  order_type,
  is_movies_only,
}: PropTypes) {
  // The only interactive element the HUD carries — everything else in it is
  // purely decorative (aria-hidden, pointer-events: none, see below).
  const [is_about_open, setIsAboutOpen] = useState(false);

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

      {/* Centre stays empty: the order-type button sits under it, and it's
          reserved for a site title. */}
      <div className={styles.top_bar}>
        <span>MCU&nbsp;//&nbsp;DATABASE</span>
        <span className={styles.tracking}>
          <span>STARK&nbsp;INDUSTRIES</span>
          <span className={styles.tracking_live}>
            <StatusReadout />
            <PositionReadout />
          </span>
        </span>
      </div>

      <div className={styles.readout}>
        <span className={styles.readout_total}>
          {summary.total} {summary.total === 1 ? 'Entry' : 'Entries'}
        </span>
        {summary.by_type.map((row) => (
          <span key={row.label} className={styles.readout_row}>
            <span>{row.label}</span>
            <span className={styles.readout_value}>{row.count}</span>
          </span>
        ))}
        {summary.span && (
          <span className={styles.readout_span}>
            {summary.span.from}&nbsp;&mdash;&nbsp;{summary.span.to}
            {summary.runtime_minutes > 0 && (
              <>&nbsp;.&nbsp;{formatRuntime(summary.runtime_minutes)}</>
            )}
          </span>
        )}
        <span className={styles.readout_mode}>
          {order_type}&nbsp;.&nbsp;
          {is_movies_only ? 'Movies Only' : 'All Media'}
        </span>
      </div>

      <div className={styles.build}>
        <span className={styles.build_source}>
          SRC&nbsp;{SOURCE_SIGNATURE}&nbsp;.&nbsp;SYNC&nbsp;
          {SOURCE_SYNCED}
        </span>
        <span className={styles.build_version}>
          v{APP_VERSION}&nbsp;
          {/* The HUD around this is aria-hidden/pointer-events: none (see
              .hud above) — both are overridden back on here explicitly,
              since this is the one real control living in an otherwise
              decorative overlay. */}
          <button
            className={styles.about_link}
            aria-hidden="false"
            onClick={() => setIsAboutOpen(true)}
          >
            [About]
          </button>
        </span>
      </div>
      <About isModalOpen={is_about_open} setIsModalOpen={setIsAboutOpen} />
    </div>
  );
}
