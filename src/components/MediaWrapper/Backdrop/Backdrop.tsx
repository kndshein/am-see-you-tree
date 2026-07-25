import Loading from '../../Loading/Loading';
import styles from './Backdrop.module.scss';
import { motion } from 'motion/react';
import { MediaType } from '../../../types/Media';
import { backdropPathOf, backdropVariantsOf } from '../../../utils/backdrop';

interface Props {
  data: any;
  media_data: MediaType;
  is_backdrop_loaded: boolean;
  setIsBackdropLoaded: React.Dispatch<React.SetStateAction<boolean>>;
  // True once the card has been hovered at least once. Gates the full-color
  // variant so it is never requested for cards nobody points at.
  has_been_hovered: boolean;
  is_active: boolean;
}

export default function Backdrop({
  data,
  media_data,
  is_backdrop_loaded,
  setIsBackdropLoaded,
  has_been_hovered,
  is_active,
}: Props) {
  // Prefer the locally processed images: cropped to the shape this box actually
  // paints (so nothing is enlarged) and with the card grade already baked in,
  // which is why no CSS filter runs here any more. Falls back to TMDB if
  // scripts/process-backdrops.mjs hasn't produced one — a missing file would
  // otherwise leave the card permanently un-loaded.
  const local = backdropVariantsOf(media_data, data);
  const backdrop_src =
    local?.graded ??
    `https://image.tmdb.org/t/p/w1280${backdropPathOf(media_data, data)}`;

  return (
    <>
      {!is_backdrop_loaded && <Loading />}
      <motion.div layout="preserve-aspect" className={styles.backdrop_wrapper}>
        <div className={styles.screen_overlay}></div>
        <img
          className={styles.backdrop}
          // `decoding="async"` keeps decode off the main thread during scroll.
          src={backdrop_src}
          alt={data.original_title}
          decoding="async"
          onLoad={() => setIsBackdropLoaded(true)}
          onError={() => setIsBackdropLoaded(true)}
        />
        {/* The ungraded twin, cross-faded in on hover. Mounted only after the
            first hover, so it costs nothing until someone points at the card. */}
        {has_been_hovered && local?.plain && (
          <img
            className={styles.backdrop_plain}
            src={local.plain}
            alt=""
            aria-hidden="true"
            decoding="async"
          />
        )}
        {/* Pre-blurred twin for the expanded state, so no CSS blur has to run
            over this surface. Only mounted once the card is open. */}
        {is_active && local?.blurred && (
          <img
            className={styles.backdrop_blurred}
            src={local.blurred}
            alt=""
            aria-hidden="true"
            decoding="async"
          />
        )}
      </motion.div>
    </>
  );
}
