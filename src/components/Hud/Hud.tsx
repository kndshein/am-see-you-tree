import { useCallback, useEffect, useRef, useState } from 'react';
import { useMotionValueEvent } from 'motion/react';
import { FaSquare, FaBars, FaPlay, FaCircle } from 'react-icons/fa';
import styles from './Hud.module.scss';
import { MediaSummary } from '../../utils/media-lists';
import { MediaType } from '../../types/Media';
import { APP_VERSION } from '../../utils/version';
import {
  focused_position,
  card_count,
  is_locked,
  is_armed,
} from '../../utils/hud-telemetry';
import tmdb_meta from '../../assets/tmdb-data.meta.json';
import type { OrderType } from '../../App';
import About from '../About/About';
import { dashify } from '../../utils/format';

// Circle=movie, bars=show, play=short, square=special — same mapping as
// Tag.tsx/CastPanel.tsx's own TYPE_ICONS, so an icon means the same thing
// everywhere it shows up.
const TYPE_ICONS: Record<MediaType['type'], React.ReactNode> = {
  movie: <FaCircle />,
  tv: <FaBars />,
  short: <FaPlay />,
  special: <FaSquare />,
};

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
  `${Math.floor(minutes / 60)}h-${minutes % 60}m`;

// A standalone ∞ glyph, sized up via its own .infinity class — kept as its
// own element rather than baked into the armed readout's plain text so the
// " / " separator between the two glyphs can stay at the readout's normal
// size instead of scaling up along with them.
function makeInfinityGlyph() {
  const glyph = document.createElement('span');
  glyph.className = styles.infinity;
  glyph.textContent = '∞';
  return glyph;
}

// Both readouts below write straight to their own text node. The values behind
// them change every animation frame while scrolling, so going through React
// state would re-render the app at 60fps to update a handful of characters.

function PositionReadout() {
  const ref = useRef<HTMLSpanElement>(null);

  const write = useCallback(() => {
    if (!ref.current) return;
    const armed = is_armed.get();
    // An armed hold-to-jump is about to leave the current position behind
    // entirely, not move to a countable one — an actual number here would
    // claim to know where it's headed before it does.
    if (armed) {
      ref.current.replaceChildren(
        makeInfinityGlyph(),
        document.createTextNode(' / '),
        makeInfinityGlyph()
      );
    } else {
      const total = card_count.get();
      ref.current.textContent = total
        ? `${pad3(focused_position.get())} / ${pad3(total)}`
        : '';
    }
    ref.current.classList.toggle(styles.locked, armed);
  }, []);

  useMotionValueEvent(focused_position, 'change', write);
  useMotionValueEvent(card_count, 'change', write);
  useMotionValueEvent(is_armed, 'change', write);
  // The rail may have written its first values before this mounted.
  useEffect(write, [write]);

  return <span ref={ref} />;
}

function StatusReadout() {
  const ref = useRef<HTMLSpanElement>(null);

  // Toggles a class as well as the text: an alert state (locked, or an armed
  // hold-to-jump) reads as one by breaking out of the HUD's green into
  // .locked's own orange-red — reused rather than a separate color, so both
  // alerts read the same way.
  const write = useCallback(() => {
    if (!ref.current) return;
    const armed = is_armed.get();
    const locked = is_locked.get();
    ref.current.textContent = armed
      ? 'Sling-shotting'
      : locked
        ? 'Locked'
        : 'Scanning';
    ref.current.classList.toggle(styles.locked, armed || locked);
  }, []);

  useMotionValueEvent(is_locked, 'change', write);
  useMotionValueEvent(is_armed, 'change', write);
  useEffect(write, [write]);

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

  // Same direct-DOM-write approach as StatusReadout/PositionReadout above,
  // rather than React state, to stay consistent with the rest of this
  // component even though is_armed itself isn't a per-frame value. One class
  // on the root rather than one per element — Hud.module.scss's rails and
  // corner reticles both key off .hud.charging, so a single toggle here
  // covers all of them.
  const hud_ref = useRef<HTMLDivElement>(null);
  const writeArmed = useCallback((armed: boolean) => {
    hud_ref.current?.classList.toggle(styles.charging, armed);
  }, []);
  useMotionValueEvent(is_armed, 'change', writeArmed);
  useEffect(() => writeArmed(is_armed.get()), [writeArmed]);

  return (
    <div className={styles.hud} aria-hidden="true" ref={hud_ref}>
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
          <span>{dashify('Stark Industries')}</span>
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
            <span className={styles.readout_label}>
              {/* Only worth the extra glyph once there's more than one type
                  on screen to tell apart — Movies Only always has exactly
                  one row, so the label alone already says everything. */}
              {!is_movies_only && (
                <span className={styles.readout_icon}>
                  {TYPE_ICONS[row.type]}
                </span>
              )}
              <span>{row.label}</span>
            </span>
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
          {dashify(order_type)}&nbsp;.&nbsp;
          {dashify(is_movies_only ? 'Movies Only' : 'All Media')}
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
            <span className={styles.about_bracket}>[</span>
            <span className={styles.about_text}>About</span>
            <span className={styles.about_bracket}>]</span>
          </button>
        </span>
      </div>
      <About isModalOpen={is_about_open} setIsModalOpen={setIsAboutOpen} />
    </div>
  );
}
