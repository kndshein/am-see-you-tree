import { useRef, useState } from 'react';
import { useMotionValueEvent } from 'motion/react';
import { MdKeyboardArrowLeft, MdKeyboardArrowRight } from 'react-icons/md';
import MediaList from '../MediaList/MediaList';
import styles from './MediaListWrapper.module.scss';
import { OrderType } from '../../App';
import {
  scroll_progress,
  is_charging,
  is_armed,
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

  useMotionValueEvent(scroll_progress, 'change', (value) => {
    setIsAtStart(value <= AT_EDGE_EPSILON);
    setIsAtEnd(value >= 1 - AT_EDGE_EPSILON);
  });

  const scroll_intensity = 800;
  const handleScroll = (direction: 'right' | 'left') => {
    if (media_list_ref.current) {
      if (direction == 'left') {
        media_list_ref.current.scrollLeft -= scroll_intensity;
      } else if (direction == 'right') {
        media_list_ref.current.scrollLeft += scroll_intensity;
      }
    }
  };

  const jumpToEdge = (direction: 'right' | 'left') => {
    const el = media_list_ref.current;
    if (!el) return;
    el.scrollLeft = direction === 'left' ? 0 : el.scrollWidth - el.clientWidth;
  };

  const startHold = (direction: 'right' | 'left') => {
    did_jump_ref.current = false;
    did_charge_complete_ref.current = false;
    setChargingDirection(direction);
    is_charging.set(true);
    hold_timeout_ref.current = setTimeout(() => {
      did_charge_complete_ref.current = true;
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
    setChargingDirection(null);
    is_charging.set(false);
    is_armed.set(false);
  };

  const releaseHold = (direction: 'right' | 'left') => {
    if (hold_timeout_ref.current) {
      clearTimeout(hold_timeout_ref.current);
      hold_timeout_ref.current = null;
    }
    setChargingDirection(null);
    is_charging.set(false);
    is_armed.set(false);
    if (did_charge_complete_ref.current) {
      did_jump_ref.current = true;
      jumpToEdge(direction);
    }
  };

  const handleClick = (direction: 'right' | 'left') => {
    if (did_jump_ref.current) {
      did_jump_ref.current = false;
      return;
    }
    handleScroll(direction);
  };

  return (
    <>
      {!is_at_start && (
        <button
          className={`${styles.arrow_left} ${
            charging_direction === 'left' ? styles.charging : ''
          }`}
          onClick={() => handleClick('left')}
          onPointerDown={() => startHold('left')}
          onPointerUp={() => releaseHold('left')}
          onPointerLeave={cancelHold}
          onPointerCancel={cancelHold}
        >
          <span className={styles.arrow_hint}>Hold to slingshot</span>
          <MdKeyboardArrowLeft />
        </button>
      )}
      {!is_at_end && (
        <button
          className={`${styles.arrow_right} ${
            charging_direction === 'right' ? styles.charging : ''
          }`}
          onClick={() => handleClick('right')}
          onPointerDown={() => startHold('right')}
          onPointerUp={() => releaseHold('right')}
          onPointerLeave={cancelHold}
          onPointerCancel={cancelHold}
        >
          <span className={styles.arrow_hint}>Hold to slingshot</span>
          <MdKeyboardArrowRight />
        </button>
      )}
      <MediaList
        order_type={order_type}
        is_movies_only={is_movies_only}
        media_list_ref={media_list_ref}
      />
    </>
  );
}
