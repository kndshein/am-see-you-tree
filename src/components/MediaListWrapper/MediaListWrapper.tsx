import { useRef, useState } from 'react';
import { useMotionValueEvent } from 'motion/react';
import { MdKeyboardArrowLeft, MdKeyboardArrowRight } from 'react-icons/md';
import MediaList from '../MediaList/MediaList';
import styles from './MediaListWrapper.module.scss';
import { OrderType } from '../../App';
import { scroll_progress } from '../../utils/hud-telemetry';

type PropTypes = {
  is_movies_only: boolean;
  order_type: OrderType;
};

// scroll_progress (hud-telemetry.ts) is clamped to exactly [0, 1] by
// MediaList's own scroll handler — a small epsilon rather than an exact 0/1
// check only guards against float rounding on the way there, not against a
// genuinely different value.
const AT_EDGE_EPSILON = 0.001;

export default function MediaListWrapper({
  is_movies_only,
  order_type,
}: PropTypes) {
  const media_list_ref = useRef<HTMLDivElement | null>(null);
  const [is_at_start, setIsAtStart] = useState(true);
  const [is_at_end, setIsAtEnd] = useState(false);

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

  return (
    <>
      {!is_at_start && (
        <button
          className={styles.arrow_left}
          onClick={() => handleScroll('left')}
        >
          <MdKeyboardArrowLeft />
        </button>
      )}
      {!is_at_end && (
        <button
          className={styles.arrow_right}
          onClick={() => handleScroll('right')}
        >
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
