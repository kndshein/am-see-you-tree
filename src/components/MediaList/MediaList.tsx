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
  // Use `is_navigating` over `is_scrolling` since this is a coded action. Does not take into account of user scrolling
  const [is_navigating, setIsNavigating] = useState(false);
  const [media_list, setMediaList] = useState(media_list_chrono);

  const handleToggle: HandleToggleType = (id) => {
    const ele_active_to_be = document.getElementById(id.toString());

    // If element is not in view, set scrolling state, which is used downstream to prevent fetching
    if (!!ele_active_to_be && !isElementInViewport(ele_active_to_be)) {
      setIsNavigating(true);
      ele_active_to_be.scrollIntoView({
        // Use 'instant' for Chrome since scrolling on Chromiums seem to be laggy
        behavior: 'smooth',
      });
      // Clear the navigating flag when the scroll actually settles rather than
      // guessing with a fixed timeout. Fall back to a timeout where `scrollend`
      // isn't supported.
      const scroll_container = media_list_ref.current;
      if (scroll_container && 'onscrollend' in scroll_container) {
        scroll_container.addEventListener(
          'scrollend',
          () => setIsNavigating(false),
          { once: true }
        );
      } else {
        setTimeout(() => {
          setIsNavigating(false);
        }, 1000);
      }
    }

    setActiveToggle(id == active_toggle ? null : id);
  };

  const WrapperComponent = (
    ele: MediaType,
    idx: number,
    media_length: number
  ) => {
    return (
      <MediaWrapper
        media_data={ele}
        is_movies_only={is_movies_only}
        handleToggle={handleToggle}
        is_active={active_toggle == idx}
        is_navigating={is_navigating}
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
