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
import {
  buildMediaList,
  castMatchesInMediaList,
  collectionSiblingsOf,
  isShown,
} from '../../utils/media-lists';
import {
  scroll_progress,
  focused_position,
  card_count,
  is_locked,
} from '../../utils/hud-telemetry';
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
  // A jump target that hasn't scrolled past before has never mounted its
  // Backdrop, so its image hasn't started loading. Marking it "ready" the
  // moment the jump starts — not only once it's actually active — gives it
  // the close-wait window as a head start, the same lead time a card that
  // scrolled into view naturally already had before being clicked.
  const [pending_jump, setPendingJump] = useState<ActiveToggleType>(null);
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

  const [active_cast_name, setActiveCastName] = useState<string | null>(null);

  // A slow connection can easily blow past the close-wait window, so the
  // collection panel's own backdrops start loading the moment the card that
  // shows it opens — not only once one is actually clicked. By the time a
  // click happens, the image has had the whole time the card sat open to load.
  const collection_preload_ids = useMemo(() => {
    if (active_toggle === null) return null;
    const active_media = media_list[active_toggle];
    if (!active_media) return null;
    const siblings = collectionSiblingsOf(active_media, tmdb_data);
    return siblings.length ? new Set(siblings.map((s) => s.id)) : null;
  }, [active_toggle, media_list, tmdb_data]);

  // Same idea for cast: the moment a cast pill is clicked, preload backdrops
  // for every item in that actor's filmography so they're ready if jumped to.
  const cast_preload_ids = useMemo(() => {
    if (!active_cast_name) return null;
    const matches = castMatchesInMediaList(
      active_cast_name,
      media_list,
      tmdb_data,
      is_movies_only,
    );
    return matches.length ? new Set(matches.map((m) => m.id)) : null;
  }, [active_cast_name, media_list, tmdb_data, is_movies_only]);

  useEffect(() => {
    active_toggle_ref.current = active_toggle;
  }, [active_toggle]);

  const handleToggle: HandleToggleType = (id) => {
    setActiveToggle(id === active_toggle ? null : id);
    // Card closing — clear cast preload so stale IDs don't linger.
    if (id === active_toggle) setActiveCastName(null);
  };

  // Every other "open a card" path starts from nothing active — the fullscreen
  // dark overlay physically covers the rest of the rail while a card is open,
  // so a direct active-card-to-active-card click has never been reachable
  // before, and MediaWrapper's local expand/collapse state (driven by
  // Framer's onLayoutAnimationComplete) isn't built to handle it. Closing
  // first and opening the target shortly after reuses that same
  // already-working closed-to-open path instead of a novel direct swap.
  const handleJump: HandleToggleType = (id) => {
    setActiveToggle(null);
    setPendingJump(id);
    window.setTimeout(() => {
      setActiveToggle(id);
      setPendingJump(null);
    }, 400);
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
    // these — the rail itself doesn't move or resize when it scrolls.
    let rail_left = 0;
    let max_scroll = 0;
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

      // Telemetry for the HUD. `max_scroll` is cached by measure() so this
      // stays a pure write — no layout reads added to the per-frame path.
      scroll_progress.set(
        max_scroll > 0 ? Math.min(1, Math.max(0, el.scrollLeft / max_scroll)) : 0,
      );

      // Whichever card sits nearest the centre. upperBound gives the first one
      // past it, so the answer is that card or the one before it.
      if (cards.length) {
        const after = Math.min(cards.length - 1, upperBound(mid));
        const before = Math.max(0, after - 1);
        const nearest =
          Math.abs(centers[before] - mid) <= Math.abs(centers[after] - mid)
            ? before
            : after;
        focused_position.set(nearest + 1);
      } else {
        focused_position.set(0);
      }
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
      max_scroll = el.scrollWidth - el.clientWidth;
      card_count.set(cards_ref.current.length);
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
    is_locked.set(active_toggle !== null);
  }, [active_toggle]);

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
                media_list={media_list}
                is_movies_only={is_movies_only}
                handleToggle={handleToggle}
                handleJump={handleJump}
                force_ready={
                  pending_jump === idx ||
                  (collection_preload_ids?.has(ele.id) ?? false) ||
                  (cast_preload_ids?.has(ele.id) ?? false)
                }
                is_active={active_toggle === idx}
                onCastSelect={active_toggle === idx ? setActiveCastName : undefined}
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
