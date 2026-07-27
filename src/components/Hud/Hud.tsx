import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useMotionValueEvent } from 'motion/react';
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
  sling_fired,
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

// Same direct-DOM-write approach as the other two below — a 1Hz tick doesn't
// need it the way a per-frame value does, but it keeps every live readout in
// this file on one pattern instead of this one alone going through React
// state/re-renders.
function SystemClock() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const pad = (value: number) => String(value).padStart(2, '0');
    const write = () => {
      if (!ref.current) return;
      const now = new Date();
      ref.current.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    };
    write();
    const interval = setInterval(write, 1000);
    return () => clearInterval(interval);
  }, []);

  return <span ref={ref} />;
}

function StatusReadout() {
  const ref = useRef<HTMLSpanElement>(null);
  const led_ref = useRef<HTMLSpanElement>(null);

  // Toggles a class as well as the text: an alert state (locked, or an armed
  // hold-to-jump) reads as one by breaking out of the HUD's green into
  // .locked's own orange-red — reused rather than a separate color, so both
  // alerts read the same way. The LED dot next to it (led_ref) rides the
  // same class, rather than tracking is_locked/is_armed a second time.
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
    // The LED's own blink behavior is more specific than the text's: solid
    // (no blink) once locked, fast blink once armed — armed wins if both are
    // true, same priority the text above already uses.
    led_ref.current?.classList.toggle(styles.armed, armed);
    led_ref.current?.classList.toggle(styles.locked, locked && !armed);
  }, []);

  useMotionValueEvent(is_locked, 'change', write);
  useMotionValueEvent(is_armed, 'change', write);
  useEffect(write, [write]);

  return (
    <span className={styles.status}>
      <span ref={led_ref} className={styles.status_led} aria-hidden="true" />
      <span ref={ref} />
    </span>
  );
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

  // Bumping this remounts .full_sweep below (key={sweep_key}), which is what
  // replays its initial→animate tween — same "fresh mount, fresh tween"
  // trick Backdrop.tsx's own sweep gets for free by mounting only while
  // is_active. This one has nowhere to unmount to (it's not per-card), so it
  // needs an explicit remount signal instead.
  const [sweep_key, setSweepKey] = useState(0);
  // A held arrow completing its jump-to-edge (sling_fired, hud-telemetry.ts
  // — a counter, so back-to-back slingshots each still fire their own
  // 'change' event).
  useMotionValueEvent(sling_fired, 'change', () => {
    setSweepKey((key) => key + 1);
  });
  // The sort order being cycled — skips the very first render (a ref, not
  // comparing order_type to some initial value) so this doesn't also fire
  // once for free on page load, on top of sweep_key's own initial mount
  // already playing .full_sweep once.
  const is_first_order_render_ref = useRef(true);
  useEffect(() => {
    if (is_first_order_render_ref.current) {
      is_first_order_render_ref.current = false;
      return;
    }
    setSweepKey((key) => key + 1);
  }, [order_type]);
  // The Movies Only toggle — same skip-first-render reasoning as order_type
  // just above, its own separate ref since each needs to skip only its own
  // first render, not the other's.
  const is_first_movies_only_render_ref = useRef(true);
  useEffect(() => {
    if (is_first_movies_only_render_ref.current) {
      is_first_movies_only_render_ref.current = false;
      return;
    }
    setSweepKey((key) => key + 1);
  }, [is_movies_only]);

  return (
    <div className={styles.hud} aria-hidden="true" ref={hud_ref}>
      <div className={styles.vignette} />
      <div className={styles.sheen} />

      <div className={styles.rail_left} />
      <div className={styles.rail_right} />
      {/* Same idea as Backdrop.module.scss's own scan_sweep, scaled to the
          whole viewport instead of one card — plays once whenever a card
          locks open (sweep_key above). */}
      <motion.div
        key={sweep_key}
        className={styles.full_sweep}
        initial={{ top: '-10%' }}
        animate={{ top: '110%' }}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
      />

      <div className={styles.corner_tl} />
      <div className={styles.corner_tr} />
      <div className={styles.corner_bl} />
      <div className={styles.corner_br} />

      {/* Centre stays empty: the order-type button sits under it, and it's
          reserved for a site title. */}
      <div className={styles.top_bar}>
        <span className={styles.system_id}>
          <span>MCU&nbsp;//&nbsp;DATABASE</span>
          <span className={styles.system_time}>
            <SystemClock />
          </span>
        </span>
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
