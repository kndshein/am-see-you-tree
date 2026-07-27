import { useEffect, useRef, useState } from 'react';
import { useMotionValueEvent } from 'motion/react';
import { MdKeyboardArrowLeft, MdKeyboardArrowRight } from 'react-icons/md';
import MediaList from '../MediaList/MediaList';
import PerspectiveStreaks from './PerspectiveStreaks/PerspectiveStreaks';
import styles from './MediaListWrapper.module.scss';
import { OrderType } from '../../App';
import {
  scroll_progress,
  is_charging,
  is_armed,
  charge_progress,
  sling_fired,
} from '../../utils/hud-telemetry';

type PropTypes = {
  is_movies_only: boolean;
  order_type: OrderType;
};

// scroll_progress (hud-telemetry.ts) is clamped to exactly [0, 1] by
// MediaList's own scroll handler — a small epsilon rather than an exact 0/1
// check only guards against float rounding on the way there, not against a
// genuinely different value.
const AT_EDGE_EPSILON = 0.001;

// Also the charge-up glow's own transition duration
// (MediaListWrapper.module.scss's .charging rules) — kept in step so a held
// arrow finishes charging up right as it becomes armed to jump on release,
// not before or after.
const HOLD_TO_EDGE_MS = 1000;

// The floor: what an instant tap scrolls, same distance every click used
// before hold duration started scaling it.
const SCROLL_INTENSITY = 800;

export default function MediaListWrapper({
  is_movies_only,
  order_type,
}: PropTypes) {
  const media_list_ref = useRef<HTMLDivElement | null>(null);
  const [is_at_start, setIsAtStart] = useState(true);
  const [is_at_end, setIsAtEnd] = useState(false);
  const [charging_direction, setChargingDirection] = useState<
    'left' | 'right' | null
  >(null);
  const hold_timeout_ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Set by the timer once a hold has been sustained past HOLD_TO_EDGE_MS —
  // the jump itself only actually happens on release (see releaseHold), this
  // just marks that release should trigger it rather than a normal scroll.
  const did_charge_complete_ref = useRef(false);
  // A held-and-released press fires its own jump-to-edge, and then the
  // browser still raises the click event right after — this flags that the
  // release already acted, so that trailing click doesn't also fire the
  // normal short scroll on top of it.
  const did_jump_ref = useRef(false);
  // When this pointer hold actually started, so releaseHold can measure how
  // long it lasted. Stays null for a keyboard-only activation (Enter/Space
  // fires a click straight away with no pointerdown/up at all) — that case
  // falls through to pending_scroll_distance_ref's own default below.
  const hold_start_ref = useRef<number | null>(null);
  // Drives charge_progress every frame while a hold is in progress —
  // separate from hold_timeout_ref's own one-shot timer, which only fires
  // once at the HOLD_TO_EDGE_MS threshold and says nothing about anything in
  // between.
  const charge_raf_ref = useRef<number | null>(null);
  // Mirrors did_charge_complete_ref into render — that ref exists for
  // releaseHold to read without triggering a re-render on every frame, but
  // the arrow's own hint text needs to actually re-render once, at the
  // moment charging finishes.
  const [is_charge_complete, setIsChargeComplete] = useState(false);
  // What the next click should actually scroll by. A real pointer hold
  // computes this on release (see holdScrollDistance) for handleClick to
  // read a moment later; a keyboard activation never touches it, so it stays
  // at the baseline SCROLL_INTENSITY — the same fixed distance every click
  // used before holds became proportional.
  const pending_scroll_distance_ref = useRef(SCROLL_INTENSITY);

  useMotionValueEvent(scroll_progress, 'change', (value) => {
    setIsAtStart(value <= AT_EDGE_EPSILON);
    setIsAtEnd(value >= 1 - AT_EDGE_EPSILON);
  });

  const handleScroll = (direction: 'right' | 'left', distance: number) => {
    if (media_list_ref.current) {
      if (direction == 'left') {
        media_list_ref.current.scrollLeft -= distance;
      } else if (direction == 'right') {
        media_list_ref.current.scrollLeft += distance;
      }
    }
  };

  // Interpolates between a tap's SCROLL_INTENSITY and roughly 1.75 visible
  // pages as elapsed climbs toward HOLD_TO_EDGE_MS, so releasing partway
  // through a hold reads as "charging up" toward the same all-the-way jump
  // the armed state promises, rather than jumping straight from a tap's
  // distance to the full edge the moment a hold merely starts. Smoothstep
  // (3t² - 2t³) rather than plain t*t — a mid-length hold now covers
  // noticeably more ground instead of most of the distance being backloaded
  // onto the final moments right before the threshold.
  const holdScrollDistance = (elapsed_ms: number) => {
    const el = media_list_ref.current;
    const ceiling = el
      ? Math.max(el.clientWidth * 1.75, SCROLL_INTENSITY)
      : SCROLL_INTENSITY;
    const t = Math.min(elapsed_ms / HOLD_TO_EDGE_MS, 1);
    const eased = t * t * (3 - 2 * t);
    return SCROLL_INTENSITY + (ceiling - SCROLL_INTENSITY) * eased;
  };

  const jumpToEdge = (direction: 'right' | 'left') => {
    const el = media_list_ref.current;
    if (!el) return;
    el.scrollLeft = direction === 'left' ? 0 : el.scrollWidth - el.clientWidth;
  };

  // Writes charge_progress every frame for as long as hold_start_ref is set
  // — stops itself once the hold reaches 1 rather than continuing to tick a
  // value that can't change further.
  const tickCharge = () => {
    const start = hold_start_ref.current;
    if (start === null) return;
    const t = Math.min((performance.now() - start) / HOLD_TO_EDGE_MS, 1);
    charge_progress.set(t);
    if (t < 1) {
      charge_raf_ref.current = requestAnimationFrame(tickCharge);
    }
  };

  const stopChargeTick = () => {
    if (charge_raf_ref.current !== null) {
      cancelAnimationFrame(charge_raf_ref.current);
      charge_raf_ref.current = null;
    }
    charge_progress.set(0);
  };

  const startHold = (direction: 'right' | 'left') => {
    did_jump_ref.current = false;
    did_charge_complete_ref.current = false;
    setIsChargeComplete(false);
    hold_start_ref.current = performance.now();
    setChargingDirection(direction);
    is_charging.set(true);
    charge_raf_ref.current = requestAnimationFrame(tickCharge);
    hold_timeout_ref.current = setTimeout(() => {
      did_charge_complete_ref.current = true;
      setIsChargeComplete(true);
      is_armed.set(true);
    }, HOLD_TO_EDGE_MS);
  };

  // Pointer left the button (or the gesture was cancelled) without a real
  // release on it — no jump, even if the charge had already completed.
  const cancelHold = () => {
    if (hold_timeout_ref.current) {
      clearTimeout(hold_timeout_ref.current);
      hold_timeout_ref.current = null;
    }
    stopChargeTick();
    hold_start_ref.current = null;
    pending_scroll_distance_ref.current = SCROLL_INTENSITY;
    setChargingDirection(null);
    setIsChargeComplete(false);
    is_charging.set(false);
    is_armed.set(false);
  };

  const releaseHold = (direction: 'right' | 'left') => {
    if (hold_timeout_ref.current) {
      clearTimeout(hold_timeout_ref.current);
      hold_timeout_ref.current = null;
    }
    stopChargeTick();
    setChargingDirection(null);
    setIsChargeComplete(false);
    is_charging.set(false);
    is_armed.set(false);
    if (did_charge_complete_ref.current) {
      did_jump_ref.current = true;
      jumpToEdge(direction);
      sling_fired.set(sling_fired.get() + 1);
    } else {
      const elapsed = hold_start_ref.current
        ? performance.now() - hold_start_ref.current
        : 0;
      pending_scroll_distance_ref.current = holdScrollDistance(elapsed);
    }
    hold_start_ref.current = null;
  };

  // A held arrow's own button unmounts the instant its side reaches the edge
  // ({!is_at_start && ...}/{!is_at_end && ...} below) — which can happen
  // mid-hold if a second hold starts while an earlier slingshot's smooth
  // scroll (.media_list's own scroll-behavior: smooth) is still animating
  // toward that same edge. A pointerup/pointerleave/pointercancel never
  // fires for an element that's already gone, so nothing would otherwise
  // ever call cancelHold — leaving is_charging/the blur/the zoom stuck on
  // forever. Catching the edge being reached here, for whichever side is
  // actually being held, cleans it up regardless of how the button feels
  // about still existing.
  useEffect(() => {
    if (
      (charging_direction === 'left' && is_at_start) ||
      (charging_direction === 'right' && is_at_end)
    ) {
      cancelHold();
    }
  }, [is_at_start, is_at_end, charging_direction]);

  const handleClick = (direction: 'right' | 'left') => {
    if (did_jump_ref.current) {
      did_jump_ref.current = false;
      pending_scroll_distance_ref.current = SCROLL_INTENSITY;
      return;
    }
    handleScroll(direction, pending_scroll_distance_ref.current);
    pending_scroll_distance_ref.current = SCROLL_INTENSITY;
  };

  // Only mounted while a hold is actually happening — controls
  // PerspectiveStreaks' own mount below. React state (not a per-frame value)
  // is fine here: a hold starting/ending is a rare, human-paced transition —
  // charge_progress itself, read directly inside that component's own
  // per-frame draw loop, is what actually ticks every frame.
  const [is_charging_state, setIsChargingState] = useState(is_charging.get());
  useMotionValueEvent(is_charging, 'change', setIsChargingState);

  // A subtle zoom on the rail itself as a hold charges. Direct DOM write
  // (not a motion-controlled style) since .media_list is a plain ref here,
  // not a motion component — same reasoning as MediaList.tsx's own per-card
  // transform writes, which this doesn't fight over: that one sets
  // card.style.transform per card, this sets .media_list's own transform
  // once, a level up.
  useMotionValueEvent(charge_progress, 'change', (t) => {
    if (!media_list_ref.current) return;
    media_list_ref.current.style.transform = t > 0 ? `scale(${1 + t * 0.02})` : '';
  });

  return (
    <>
      {!is_at_start && (
        <button
          className={`${styles.arrow_left} ${
            charging_direction === 'left' ? styles.charging : ''
          } ${
            charging_direction === 'left' && is_charge_complete
              ? styles.armed
              : ''
          }`}
          onClick={() => handleClick('left')}
          onPointerDown={() => startHold('left')}
          onPointerUp={() => releaseHold('left')}
          onPointerLeave={cancelHold}
          onPointerCancel={cancelHold}
        >
          <span className={styles.arrow_hint}>
            {charging_direction === 'left' && is_charge_complete
              ? 'Release to slingshot'
              : 'Hold to slingshot'}
          </span>
          <MdKeyboardArrowLeft />
        </button>
      )}
      {!is_at_end && (
        <button
          className={`${styles.arrow_right} ${
            charging_direction === 'right' ? styles.charging : ''
          } ${
            charging_direction === 'right' && is_charge_complete
              ? styles.armed
              : ''
          }`}
          onClick={() => handleClick('right')}
          onPointerDown={() => startHold('right')}
          onPointerUp={() => releaseHold('right')}
          onPointerLeave={cancelHold}
          onPointerCancel={cancelHold}
        >
          <span className={styles.arrow_hint}>
            {charging_direction === 'right' && is_charge_complete
              ? 'Release to slingshot'
              : 'Hold to slingshot'}
          </span>
          <MdKeyboardArrowRight />
        </button>
      )}
      <MediaList
        order_type={order_type}
        is_movies_only={is_movies_only}
        media_list_ref={media_list_ref}
      />
      {/* After MediaList in the DOM, not before: z-index: 0 (its own
          stylesheet) and .media_list's own z-index: auto paint in the same
          stacking tier, ordered by DOM position among themselves — putting
          this earlier let .media_list (later, same tier) win that tie and
          paint on top, uncovered, while order_type_btn (App.tsx, earlier in
          .app's own children, same tier too) lost it and got covered
          instead. Being later than .media_list here is what actually shows
          over it; z-index: 0 alone only settled this against .arrow_left/
          .arrow_right (z-index: 1) and .hud (z-index: 40), both of which
          have an explicit, unambiguous edge that doesn't depend on DOM
          order the way this tie did. See PerspectiveStreaks.module.scss for
          the same reasoning in full. */}
      {is_charging_state && charging_direction && (
        <PerspectiveStreaks direction={charging_direction} />
      )}
    </>
  );
}
