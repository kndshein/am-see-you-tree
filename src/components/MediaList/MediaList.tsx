import {
  Fragment,
  useState,
  useRef,
  RefObject,
  useEffect,
  useMemo,
} from 'react';
import { ActiveToggleType, HandleToggleType } from '../../types/Toggles';
import MediaWrapper from '../MediaWrapper/MediaWrapper';
import styles from './MediaList.module.scss';
import { useTmdbData } from '../../utils/tmdb-data';
import { buildMediaList, isShown } from '../../utils/media-lists';
import { OrderType } from '../../App';

type PropTypes = {
  is_movies_only: boolean;
  order_type: OrderType;
  media_list_ref: RefObject<HTMLDivElement | null>;
};

export default function MediaList({
  is_movies_only,
  order_type,
  media_list_ref,
}: PropTypes) {
  const [active_toggle, setActiveToggle] = useState<ActiveToggleType>(null);
  const tmdb_data = useTmdbData();

  // Release-date order needs the fetched dates, so it has to be built inside
  // the component. Deriving the list rather than holding it in state keeps the
  // first render consistent with `order_type`, which ?order= can preselect.
  const media_list = useMemo(
    () => buildMediaList(order_type, tmdb_data),
    [order_type, tmdb_data],
  );

  const active_toggle_ref = useRef(active_toggle);
  const cards_ref = useRef<HTMLElement[]>([]);
  const apply_ref = useRef<(full?: boolean) => void>(() => {});

  useEffect(() => {
    active_toggle_ref.current = active_toggle;
  }, [active_toggle]);

  const handleToggle: HandleToggleType = (id) => {
    setActiveToggle(id === active_toggle ? null : id);
  };

  // Per-card 3D concave "visor" curve:
  // Each card receives per-card perspective & rotateY so background cards keep their
  // 3D curved orientation even when a card is expanded into fullscreen.
  useEffect(() => {
    const el = media_list_ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const MAX_ANGLE = 34; // degrees of rotateY per unit of `d`
    const SQUISH_X = -0.1; // negative, so edge cards render 1.1x wider
    const SHORT_Y = 0.1; // center card renders 0.9x shorter
    // Clamps `d`, so the steepest rotation is MAX_DIST * MAX_ANGLE = 47.6deg
    // and everything past the clamp shares one angle.
    const MAX_DIST = 1.4;
    // Extra rotateY layered on top of the curve so a card's face turns toward
    // the pointer. Horizontal only: the rail itself is horizontal, and adding
    // a vertical tilt on top of it reads as noise.
    const TILT_Y = 6; // degrees at full horizontal offset
    // Fraction of the remaining distance covered per frame. Low values give
    // the cards weight: they trail the pointer and coast to a stop.
    const EASE = 0.06;
    const SETTLE = 0.5; // px; closer than this, snap and stop the loop

    let raf = 0;
    let centers: number[] = [];
    // Cached so the per-frame path never reads layout. Only a resize can change
    // it — the rail itself doesn't move when it scrolls.
    let rail_left = 0;
    // Raw pointer vs the eased position the cards actually follow. Tilt stays
    // off until the pointer is first seen, so the resting curve is untouched;
    // `engage` then fades it in so the first movement doesn't land as a step.
    let has_pointer = false;
    let engage = 0;
    let pointer_x = 0;
    let eased_x = window.innerWidth / 2;
    // Cards lay out left-to-right, so `centers` ascends and the cards still
    // inside the un-clamped band are one contiguous range. If that ever stops
    // holding (the `.reverse` row-reverse rule, say), fall back to the whole list.
    let centers_ascending = true;
    // The band written last frame, so a card leaving it can be parked on its
    // clamped transform exactly once instead of every frame.
    let prev_lo = 0;
    let prev_hi = 0;
    let needs_full = true;

    const transformFor = (d: number, tilt_y = 0) => {
      const ad = Math.abs(d);
      const center = 1 - ad / MAX_DIST; // 1 at center → 0 at edges
      const scale_x = 1 - SQUISH_X * (1 - center); // 1.0 at center → 1.1 at edges
      const scale_y = 1 - SHORT_Y * center; // 0.9 at center → 1.0 at edges
      const angle = -d * MAX_ANGLE + tilt_y;
      // Per-card 3D perspective and rotation without container perspective trap
      return `perspective(1000px) rotateY(${angle.toFixed(
        2,
      )}deg) scale(${scale_x.toFixed(3)}, ${scale_y.toFixed(3)})`;
    };

    // `d` is clamped, so everything past the band resolves to one of exactly
    // two transforms however far off-centre it sits. Derived through the same
    // function as the live ones so the two paths can't drift apart. These carry
    // no tilt: the band already extends 1.4 viewport-widths, so anything using
    // them is well offscreen and tilting it would only cost writes.
    const CLAMPED_LEFT = transformFor(-MAX_DIST);
    const CLAMPED_RIGHT = transformFor(MAX_DIST);

    const clampUnit = (n: number) => Math.max(-1, Math.min(1, n));

    // First index whose centre sits past `value`.
    const upperBound = (value: number) => {
      let low = 0;
      let high = centers.length;
      while (low < high) {
        const probe = (low + high) >> 1;
        if (centers[probe] > value) high = probe;
        else low = probe + 1;
      }
      return low;
    };

    const apply = (full = false) => {
      const active_toggle = active_toggle_ref.current;
      const cards = cards_ref.current;
      const mid = el.scrollLeft + el.clientWidth / 2;
      const half = el.clientWidth / 2 || 1;
      const reach = half * MAX_DIST;

      const lo = centers_ascending ? upperBound(mid - reach) : 0;
      const hi = centers_ascending ? upperBound(mid + reach) : cards.length;

      const write = (i: number, value: string) => {
        const card = cards[i];
        if (!card) return;
        // If this card is active, clear transform so it morphs cleanly to fullscreen overlay
        card.style.transform =
          active_toggle !== null && card.id === active_toggle.toString()
            ? 'none'
            : value;
      };

      // While last frame's band and this one overlap, a card can only have left
      // via the side it was already nearest, so the two edge ranges cover every
      // change.
      // A disjoint jump (scrollbar drag) breaks that, so redo everything.
      const disjoint = hi <= prev_lo || lo >= prev_hi;

      if (full || needs_full || disjoint) {
        for (let i = 0; i < lo; i++) write(i, CLAMPED_LEFT);
        for (let i = hi; i < cards.length; i++) write(i, CLAMPED_RIGHT);
        needs_full = false;
      } else {
        for (let i = prev_lo; i < Math.min(lo, prev_hi); i++) {
          write(i, CLAMPED_LEFT);
        }
        for (let i = Math.max(hi, prev_lo); i < prev_hi; i++) {
          write(i, CLAMPED_RIGHT);
        }
      }

      for (let i = lo; i < hi; i++) {
        const d = Math.max(
          -MAX_DIST,
          Math.min(MAX_DIST, (centers[i] - mid) / half),
        );
        let tilt_y = 0;
        if (engage > 0) {
          // Offset of the pointer from this card's centre, in viewport space.
          const card_x = centers[i] - el.scrollLeft + rail_left;
          tilt_y = clampUnit((eased_x - card_x) / half) * TILT_Y * engage;
        }
        write(i, transformFor(d, tilt_y));
      }

      prev_lo = lo;
      prev_hi = hi;
    };
    apply_ref.current = apply;

    const measure = () => {
      cards_ref.current = Array.from(
        el.querySelectorAll<HTMLElement>('.media'),
      );
      centers = cards_ref.current.map((c) => c.offsetLeft + c.offsetWidth / 2);
      centers_ascending = centers.every(
        (c, i) => i === 0 || c >= centers[i - 1],
      );
      rail_left = el.getBoundingClientRect().left;
      needs_full = true;
      apply();
    };

    const isSettled = () => Math.abs(pointer_x - eased_x) < SETTLE;

    // Scrolling needs a single frame; the pointer needs frames until the eased
    // position catches up, which is what gives the tilt its trailing weight.
    const runFrame = () => {
      raf = 0;
      if (has_pointer) {
        eased_x += (pointer_x - eased_x) * EASE;
        if (engage < 1) engage = Math.min(1, engage + EASE);
        if (isSettled()) eased_x = pointer_x;
      }
      apply();
      if (has_pointer && (!isSettled() || engage < 1)) schedule();
    };

    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(runFrame);
    };

    const onScroll = () => schedule();

    // `mousemove`, not `pointermove`: touch has no hover, and a drag shouldn't
    // whip the cards around mid-scroll.
    const onMouseMove = (event: MouseEvent) => {
      pointer_x = event.clientX;
      has_pointer = true;
      schedule();
    };

    measure();
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('resize', measure);

    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', measure);
      if (raf) cancelAnimationFrame(raf);
      cards_ref.current.forEach((c) => (c.style.transform = ''));
    };
  }, [media_list_ref, media_list, is_movies_only]);

  // An opened card lifts out into a fullscreen overlay, so slide the gap it
  // leaves behind into the middle of the rail. Runs after the state change, so
  // the rail is already locked (overflow: hidden) and the animation isn't
  // started under one overflow mode and finished under another — programmatic
  // scrolling still works while locked, which is what keeps the user out of it.
  // scrollTo clamps to the scrollable range itself, so cards near either end
  // settle as close to centre as that side allows.
  useEffect(() => {
    if (active_toggle === null) return;
    const el = media_list_ref.current;
    // Cards are keyed by their index in the unfiltered list, which isn't their
    // position among the rendered ones, so this can't index into cards_ref.
    const card = document.getElementById(active_toggle.toString());
    if (!el || !card) return;

    el.scrollTo({
      left: card.offsetLeft + card.offsetWidth / 2 - el.clientWidth / 2,
      behavior: 'smooth',
    });
  }, [active_toggle, media_list_ref]);

  // Re-apply the curve (without remeasuring or touching listeners) when the
  // active card changes, so toggling doesn't flash every card flat first.
  // Full pass: the card that just stopped being active is holding `none` and
  // may sit outside the band, where the incremental path would never revisit it.
  useEffect(() => {
    apply_ref.current(true);
  }, [active_toggle]);

  // Measure the rail's actual reserved scrollbar height (varies by browser
  // and OS, and is 0 on platforms with overlay scrollbars) so the padding
  // compensation in MediaList.module.scss (.is_active) can offset exactly
  // what disappears, instead of assuming a fixed pixel value.
  useEffect(() => {
    const el = media_list_ref.current;
    if (!el) return;

    const measureScrollbarHeight = () => {
      // Only meaningful while the real scrollbar is showing (overflow-x:
      // scroll); it's hidden while a card is active, which would read as 0.
      if (active_toggle_ref.current !== null) return;
      el.style.setProperty(
        '--scrollbar-height',
        `${el.offsetHeight - el.clientHeight}px`,
      );
    };

    measureScrollbarHeight();
    window.addEventListener('resize', measureScrollbarHeight);
    return () => window.removeEventListener('resize', measureScrollbarHeight);
  }, [media_list_ref]);

  // Let a plain (vertical) wheel scroll drive the horizontal rail, instead
  // of requiring Shift+wheel. Trackpad horizontal swipes (deltaX already
  // nonzero) are left untouched so their native momentum/feel is unchanged.
  useEffect(() => {
    const el = media_list_ref.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (active_toggle_ref.current !== null) return; // rail is locked while a card is open
      if (e.deltaX !== 0 || e.deltaY === 0) return;
      e.preventDefault();
      // Instant, not the element's CSS scroll-behavior:smooth, so it tracks
      // the wheel 1:1 instead of easing/queuing on every tick.
      el.scrollBy({ left: e.deltaY, behavior: 'instant' });
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [media_list_ref]);

  const visible_media_length = media_list.filter(
    (ele) => isShown(ele, is_movies_only),
  ).length;

  return (
    <div
      className={`${styles.media_list} ${
        active_toggle !== null ? styles.is_active : ''
      }`}
      ref={media_list_ref}
    >
      {(() => {
        let display_idx = -1;
        return media_list.map((ele, idx) => {
          const shouldShow = isShown(ele, is_movies_only);
          if (!shouldShow) return null;
          display_idx += 1;

          const key = `${ele.id}${
            ele.type === 'tv'
              ? `_s${ele.season}_ep${ele.epiStart}-${ele.epiEnd}`
              : ''
          }`;

          return (
            <Fragment key={key}>
              <MediaWrapper
                media_data={ele}
                is_movies_only={is_movies_only}
                handleToggle={handleToggle}
                is_active={active_toggle === idx}
                idx={idx}
                display_idx={display_idx}
                order_type={order_type}
                media_length={visible_media_length}
              />
            </Fragment>
          );
        });
      })()}
    </div>
  );
}
