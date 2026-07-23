import { Fragment, useState, RefObject, useEffect } from 'react';
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

  const handleToggle: HandleToggleType = (id) => {
    const ele_active_to_be = document.getElementById(id.toString());

    // Bring the toggled card into view if it isn't already.
    if (!!ele_active_to_be && !isElementInViewport(ele_active_to_be)) {
      ele_active_to_be.scrollIntoView({ behavior: 'smooth' });
    }

    setActiveToggle(id == active_toggle ? null : id);
  };

  const WrapperComponent = (
    ele: MediaType,
    idx: number,
    media_length: number,
  ) => {
    return (
      <MediaWrapper
        media_data={ele}
        is_movies_only={is_movies_only}
        handleToggle={handleToggle}
        is_active={active_toggle == idx}
        idx={idx}
        order_type={order_type}
        media_length={media_length}
      />
    );
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

  // Concave "visor" curve, like a concave lens: the center card keeps its width
  // but is squashed shorter (SHORT_Y), while edge cards keep their height but
  // are squished narrower (SQUISH_X) and rotate inward (rotateY). Everything
  // scales down (≤ 1) so nothing spills out of the rail. The scroll container
  // owns a single perspective/vanishing point (see MediaList.module.scss) so the
  // cards project onto one shared curve and adjacent edges line up. While a card
  // is expanded the curve is cleared and the container perspective is dropped
  // (CSS) so its fullscreen overlay anchors to the viewport. Offsets are measured
  // once and cached; the scroll handler only does math + composited transform
  // writes (no layout reads), rAF-throttled to stay smooth.
  useEffect(() => {
    const el = media_list_ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const MAX_ANGLE = 34; // degrees the edge cards rotate inward
    const SQUISH_X = 0.32; // how much narrower the edge cards get
    const SHORT_Y = 0.2; // how much shorter the center card gets
    const MAX_DIST = 1.4; // clamp so far-edge cards don't over-rotate
    let raf = 0;
    let cards: HTMLElement[] = [];
    let centers: number[] = [];

    const apply = () => {
      const mid = el.scrollLeft + el.clientWidth / 2;
      const half = el.clientWidth / 2 || 1;
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const d = Math.max(
          -MAX_DIST,
          Math.min(MAX_DIST, (centers[i] - mid) / half),
        );
        const ad = Math.abs(d);
        const center = 1 - ad / MAX_DIST; // 1 at center → 0 at edges
        const scale_x = 1 - SQUISH_X * (1 - center); // sides narrower
        const scale_y = 1 - SHORT_Y * center; // center shorter
        // Concave: `-d * MAX_ANGLE` turns each card's inner edge toward you.
        const angle = -d * MAX_ANGLE;
        card.style.transform = `rotateY(${angle}deg) scale(${scale_x.toFixed(
          3,
        )}, ${scale_y.toFixed(3)})`;
      }
    };

    // No curve while a card is expanded (container perspective is off in CSS
    // then, so leftover rotateY would just shear the background cards).
    if (active_toggle != null) {
      el.querySelectorAll<HTMLElement>('.media').forEach(
        (c) => (c.style.transform = ''),
      );
      return;
    }

    const measure = () => {
      cards = Array.from(el.querySelectorAll<HTMLElement>('.media'));
      centers = cards.map((c) => c.offsetLeft + c.offsetWidth / 2);
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
      cards.forEach((c) => (c.style.transform = ''));
    };
  }, [media_list_ref, media_list, is_movies_only, active_toggle]);

  return (
    <div
      className={`${styles.media_list} ${
        active_toggle ? styles.is_active : ''
      }`}
      ref={media_list_ref}
    >
      {media_list.map((ele, idx) => {
        return (
          <Fragment
            key={`${ele.id}${
              ele.type == 'tv'
                ? `${ele.season}${ele.epiStart}${ele.epiEnd}`
                : ''
            }`}
          >
            {ele.type == 'movie'
              ? WrapperComponent(ele, idx, media_list.length)
              : !is_movies_only &&
                WrapperComponent(ele, idx, media_list.length)}
          </Fragment>
        );
      })}
    </div>
  );
}
