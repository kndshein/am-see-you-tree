import {
  Fragment,
  useState,
  useRef,
  RefObject,
  useEffect,
  useMemo,
} from 'react';
import { MediaType, ShowType } from '../../types/Media';
import { ActiveToggleType, HandleToggleType } from '../../types/Toggles';
import MediaWrapper from '../MediaWrapper/MediaWrapper';
import media_list_json from '../../assets/media-list.json';
import styles from './MediaList.module.scss';
import { isElementInViewport } from '../../utils/utils';
import { useTmdbData, TmdbMap } from '../../utils/tmdb-data';
import { OrderType } from '../../App';

type PropTypes = {
  is_movies_only: boolean;
  order_type: OrderType;
  media_list_ref: RefObject<HTMLDivElement | null>;
};

const media_list_chrono = media_list_json as Array<MediaType>;
const media_list_chrono_reversed = [
  ...media_list_json,
].reverse() as Array<MediaType>;

// media-list.json has no date fields (it's just the curated viewing order);
// tmdb-data.json has the dates but no ordering of its own (it's a plain
// id-keyed lookup). Release-date order needs both: look each item's date up
// by the same id/id__seasonN key MediaWrapper uses, then sort by it.
function releaseDateOf(ele: MediaType, tmdb_data: TmdbMap): string {
  const tmdb_key =
    ele.type === 'tv' ? `${ele.id}__season${ele.season}` : ele.id;
  const data = tmdb_data[tmdb_key];
  if (!data) return '';
  return ele.type === 'tv'
    ? (data[`season/${ele.season}`]?.air_date ?? '')
    : (data.release_date ?? '');
}

// A season can appear as several entries in media-list.json when a movie was
// watched partway through it (e.g. eps 1-7, then a movie, then eps 8-16).
// That split only reflects viewing order, so for release-date order we merge
// same show/season entries back into one card spanning their combined
// episode range.
function mergeTvFragments(list: Array<MediaType>): Array<MediaType> {
  const merged: Array<MediaType> = [];
  const season_idx = new Map<string, number>();

  for (const ele of list) {
    if (ele.type !== 'tv') {
      merged.push(ele);
      continue;
    }

    const key = `${ele.id}__season${ele.season}`;
    const existing_idx = season_idx.get(key);
    if (existing_idx === undefined) {
      season_idx.set(key, merged.length);
      merged.push({ ...ele });
      continue;
    }

    const existing = merged[existing_idx] as ShowType;
    existing.epiStart = Math.min(existing.epiStart, ele.epiStart);
    existing.epiEnd = Math.max(existing.epiEnd, ele.epiEnd);
  }

  return merged;
}

export default function MediaList({
  is_movies_only,
  order_type,
  media_list_ref,
}: PropTypes) {
  const [active_toggle, setActiveToggle] = useState<ActiveToggleType>(null);
  const tmdb_data = useTmdbData();

  // Release-date order depends on the fetched dates, so it can no longer be
  // built at module scope. Deriving both lists instead of holding one in state
  // also means the first render already matches `order_type`, which matters
  // now that ?order= can select release order before anything mounts.
  const media_list_release_date = useMemo(
    () =>
      mergeTvFragments(media_list_chrono).sort((a, b) =>
        releaseDateOf(a, tmdb_data).localeCompare(releaseDateOf(b, tmdb_data)),
      ),
    [tmdb_data],
  );

  const media_list = useMemo(() => {
    switch (order_type) {
      case 'Reverse Chronological':
        return media_list_chrono_reversed;
      case 'Release Date':
        return media_list_release_date;
      default:
        return media_list_chrono;
    }
  }, [order_type, media_list_release_date]);

  const active_toggle_ref = useRef(active_toggle);
  const cards_ref = useRef<HTMLElement[]>([]);
  const apply_ref = useRef<(full?: boolean) => void>(() => {});

  useEffect(() => {
    active_toggle_ref.current = active_toggle;
  }, [active_toggle]);

  const handleToggle: HandleToggleType = (id) => {
    const ele_active_to_be = document.getElementById(id.toString());

    // Bring the toggled card into view if it isn't already.
    if (!!ele_active_to_be && !isElementInViewport(ele_active_to_be)) {
      ele_active_to_be.scrollIntoView({ behavior: 'smooth' });
    }

    setActiveToggle(id === active_toggle ? null : id);
  };

  // Per-card 3D concave "visor" curve:
  // Each card receives per-card perspective & rotateY so background cards keep their
  // 3D curved orientation even when a card is expanded into fullscreen.
  useEffect(() => {
    const el = media_list_ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const MAX_ANGLE = 34; // degrees the edge cards rotate inward
    const SQUISH_X = -0.1; // how much narrower the edge cards get
    const SHORT_Y = 0.1; // how much shorter the center card gets
    const MAX_DIST = 1.4; // clamp so far-edge cards don't over-rotate
    let raf = 0;
    let centers: number[] = [];
    // Cards lay out left-to-right, so `centers` ascends and the cards still
    // inside the un-clamped band are one contiguous range. If that ever stops
    // holding (the `.reverse` row-reverse rule, say), fall back to the whole list.
    let centers_ascending = true;
    // The band written last frame, so a card leaving it can be parked on its
    // clamped transform exactly once instead of every frame.
    let prev_lo = 0;
    let prev_hi = 0;
    let needs_full = true;

    const transformFor = (d: number) => {
      const ad = Math.abs(d);
      const center = 1 - ad / MAX_DIST; // 1 at center → 0 at edges
      const scale_x = 1 - SQUISH_X * (1 - center); // sides narrower
      const scale_y = 1 - SHORT_Y * center; // center shorter
      const angle = -d * MAX_ANGLE;
      // Per-card 3D perspective and rotation without container perspective trap
      return `perspective(1000px) rotateY(${angle.toFixed(
        2,
      )}deg) scale(${scale_x.toFixed(3)}, ${scale_y.toFixed(3)})`;
    };

    // `d` is clamped, so everything past the band resolves to one of exactly
    // two transforms however far off-centre it sits. Derived through the same
    // function as the live ones so the two paths can't drift apart.
    const CLAMPED_LEFT = transformFor(-MAX_DIST);
    const CLAMPED_RIGHT = transformFor(MAX_DIST);

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

      // While the old and new bands overlap, a card can only have left via the
      // side it was already nearest, so the two edge ranges cover every change.
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
        write(i, transformFor(d));
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
      needs_full = true;
      apply();
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        apply();
      });
    };

    measure();
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', measure);

    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', measure);
      if (raf) cancelAnimationFrame(raf);
      cards_ref.current.forEach((c) => (c.style.transform = ''));
    };
  }, [media_list_ref, media_list, is_movies_only]);

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
    (ele) => ele.type === 'movie' || !is_movies_only,
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
          const shouldShow = ele.type === 'movie' || !is_movies_only;
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
