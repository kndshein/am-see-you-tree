import { Fragment, useState, useRef, RefObject, useEffect } from 'react';
import { MediaType } from '../../types/Media';
import { ActiveToggleType, HandleToggleType } from '../../types/Toggles';
import MediaWrapper from '../MediaWrapper/MediaWrapper';
import media_list_json from '../../assets/media-list.json';
import styles from './MediaList.module.scss';
import { isElementInViewport } from '../../utils/utils';
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

export default function MediaList({
  is_movies_only,
  order_type,
  media_list_ref,
}: PropTypes) {
  const [active_toggle, setActiveToggle] = useState<ActiveToggleType>(null);
  const [media_list, setMediaList] = useState(media_list_chrono);
  const active_toggle_ref = useRef(active_toggle);
  const cards_ref = useRef<HTMLElement[]>([]);
  const apply_ref = useRef<() => void>(() => {});

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

  useEffect(() => {
    switch (order_type) {
      case 'Chronological':
        setMediaList(media_list_chrono);
        break;
      case 'Reverse Chronological':
        setMediaList(media_list_chrono_reversed);
        break;
    }
  }, [order_type]);

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

    const apply = () => {
      const active_toggle = active_toggle_ref.current;
      const cards = cards_ref.current;
      const mid = el.scrollLeft + el.clientWidth / 2;
      const half = el.clientWidth / 2 || 1;
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];

        // If this card is active, clear transform so it morphs cleanly to fullscreen overlay
        if (active_toggle !== null && card.id === active_toggle.toString()) {
          card.style.transform = 'none';
          continue;
        }

        const d = Math.max(
          -MAX_DIST,
          Math.min(MAX_DIST, (centers[i] - mid) / half),
        );
        const ad = Math.abs(d);
        const center = 1 - ad / MAX_DIST; // 1 at center → 0 at edges
        const scale_x = 1 - SQUISH_X * (1 - center); // sides narrower
        const scale_y = 1 - SHORT_Y * center; // center shorter
        const angle = -d * MAX_ANGLE;

        // Per-card 3D perspective and rotation without container perspective trap
        card.style.transform = `perspective(1000px) rotateY(${angle.toFixed(
          2,
        )}deg) scale(${scale_x.toFixed(3)}, ${scale_y.toFixed(3)})`;
      }
    };
    apply_ref.current = apply;

    const measure = () => {
      cards_ref.current = Array.from(
        el.querySelectorAll<HTMLElement>('.media'),
      );
      centers = cards_ref.current.map((c) => c.offsetLeft + c.offsetWidth / 2);
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
  useEffect(() => {
    apply_ref.current();
  }, [active_toggle]);

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
