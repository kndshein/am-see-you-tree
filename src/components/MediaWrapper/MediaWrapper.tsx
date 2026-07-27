import { MediaType, MediaUiType } from '../../types/Media';
import { HandleToggleType } from '../../types/Toggles';
import Loading from '../Loading/Loading';
import Tag from './Tag/Tag';
import Title from './Title/Title';
import Media from '../Media/Media';
import Backdrop from './Backdrop/Backdrop';
import React, { useState, useRef, useEffect } from 'react';
import Index from './Index/Index';
import styles from './MediaWrapper.module.scss';
import { motion, AnimatePresence } from 'motion/react';
import { useInView } from 'react-intersection-observer';
import Season from './Season/Season';
import Phase from './Phase/Phase';
import Reticle from './Reticle/Reticle';
import CollectionPanel from './CollectionPanel/CollectionPanel';
import CastPanel from './CastPanel/CastPanel';
import Ambient from './Ambient/Ambient';
import { OrderType } from '../../App';
import { TmdbType } from '../../types/Tmdb';
import { useTmdbData } from '../../utils/tmdb-data';
import { phaseOf } from '../../utils/media-lists';
import { GLOW_DELAY, GLOW_DURATION } from '../../utils/motion';

// rgb components (not the SCSS variables themselves — variables.scss isn't
// reachable from here) for the same type colors the card's border/reflection
// use elsewhere (index.scss's .media, Title.module.scss). Same pattern as
// CastPanel.tsx's own GLOW_RGB.
const GLOW_RGB: Record<MediaType['type'], string> = {
  movie: '102, 192, 204', // $accent-lite
  tv: '255, 161, 124', // $show
  short: '117, 255, 188', // $short
  special: '255, 232, 117', // $special
};

type PropTypes = {
  media_data: MediaType;
  media_list: Array<MediaType>;
  is_movies_only: boolean;
  handleToggle: HandleToggleType;
  handleJump: HandleToggleType;
  force_ready: boolean;
  is_active: boolean;
  idx: number;
  display_idx: number;
  order_type: OrderType;
  media_length: number;
  // Fires when a cast pill is selected/deselected so the parent can preload
  // filmography backdrops. Only provided for the currently active card.
  onCastSelect?: (name: string | null) => void;
};

export default function MediaWrapper({
  media_data,
  media_list,
  is_movies_only,
  handleToggle,
  handleJump,
  force_ready,
  is_active,
  idx,
  display_idx,
  order_type,
  media_length,
  onCastSelect,
}: PropTypes) {
  const { ref, inView } = useInView({
    triggerOnce: true,
  });
  const container_ref = useRef<HTMLDivElement | null>(null);
  const collection_list_ref = useRef<HTMLDivElement | null>(null);
  const [is_backdrop_loaded, setIsBackdropLoaded] = useState(false);
  // Latches on first hover so Backdrop can fetch its full-color twin. Kept
  // here rather than in Backdrop because this is the element hover applies to.
  const [has_been_hovered, setHasBeenHovered] = useState(false);
  const [{ is_content_expanded, is_content_collapsed }, setContentStatus] =
    useState({
      is_content_expanded: is_active,
      is_content_collapsed: !is_active,
    });

  const media_ui_type: MediaUiType =
    media_data.type === 'tv' ? 'show' : media_data.type;
  const glow_rgb = GLOW_RGB[media_data.type];
  const phase_data = phaseOf(media_data);

  const tmdb_data_map = useTmdbData();
  const tmdb_key =
    media_data.type === 'tv'
      ? `${media_data.id}__season${media_data.season}`
      : media_data.id;
  const data: TmdbType = tmdb_data_map[tmdb_key];
  const has_data = !!data;

  const is_ready = is_active || inView || force_ready;
  const isDisabled = !is_ready || !has_data || !is_backdrop_loaded;

  const handleClick = () => {
    if (!isDisabled) {
      handleToggle(idx);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((e.key === 'Enter' || e.key === ' ') && !isDisabled) {
      e.preventDefault();
      handleToggle(idx);
    }
  };

  const [selected_cast, setSelectedCast] = useState<string | null>(null);

  const handleSelectCast = (cast_name: string) => {
    const next = selected_cast === cast_name ? null : cast_name;
    setSelectedCast(next);
    onCastSelect?.(next);
  };

  useEffect(() => {
    if (!is_active && selected_cast) {
      // Wait for the card's closing layout animation to finish before clearing
      // the selection, avoiding an abrupt vanish mid-close.
      const timer = setTimeout(() => {
        setSelectedCast(null);
        onCastSelect?.(null);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [is_active, selected_cast, onCastSelect]);

  return (
    <div
      id={idx.toString()}
      ref={ref}
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      aria-disabled={isDisabled}
      aria-expanded={is_content_expanded}
      className={`${media_data.id} media ${is_active ? 'active' : ''} ${
        isDisabled ? '' : 'ready'
      } ${is_content_expanded ? 'expanded-layout' : ''} ${
        is_content_collapsed ? 'collapsed-layout' : ''
      } ${
        // Same is_tv/is_short/is_special convention RightContainer's cast
        // pills and CastPanel's filmography already use for the same type
        // colors — index.scss's .media border rules key off these too.
        media_data.type === 'tv'
          ? 'is_tv'
          : media_data.type === 'short'
          ? 'is_short'
          : media_data.type === 'special'
          ? 'is_special'
          : ''
      }`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setHasBeenHovered(true)}
    >
      {!is_ready ? (
        <Loading />
      ) : !has_data ? (
        <div className={styles.error}>
          <p className={styles.error_message}>Couldn't load this title.</p>
        </div>
      ) : (
        <div
          ref={container_ref}
          className={`${styles.content_container} ${
            is_active ? styles.active : ''
          } ${is_content_expanded ? styles.expanded_layout : ''}`}
        >
          <AnimatePresence>
            {is_content_expanded && (
              <motion.div
                key="overlay"
                className={styles.overlay}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                // AnimatePresence keeps this mounted long enough to fade;
                // the bare conditional would unmount it immediately.
                exit={{ opacity: 0, transition: { duration: 0.3 } }}
                transition={{ duration: 0.7 }}
              ></motion.div>
            )}
          </AnimatePresence>
          {/* Before .content in the DOM, not after — Framer's layout
              projection can put an explicit z-index on .content during/after
              its FLIP animation, which would tie with Ambient's own negative
              z-index (Ambient.module.scss) and fall back to DOM order. Behind
              in the DOM is behind regardless of how that tie resolves. */}
          <AnimatePresence>
            {is_active && (
              <Ambient
                key="ambient"
                tmdb_data={data}
                media_data={media_data}
                is_content_expanded={is_content_expanded}
              />
            )}
          </AnimatePresence>
          <motion.div
            className={styles.content}
            layout
            style={{ borderRadius: '10px' }}
            onLayoutAnimationComplete={() => {
              setContentStatus({
                is_content_expanded: is_active,
                is_content_collapsed: !is_active,
              });
            }}
            onLayoutAnimationStart={() => {
              setContentStatus((prevState) => {
                return {
                  is_content_expanded:
                    prevState.is_content_expanded && is_active,
                  is_content_collapsed:
                    prevState.is_content_collapsed && !is_active,
                };
              });
            }}
            onClick={(event) => {
              if (is_content_expanded) event.stopPropagation();
            }}
            variants={{
              expanded: {
                // Soft bloom (white core, low-opacity outer layers — not the
                // harder-edged double ring this used to have), tinted per
                // type like the card's own border/reflection elsewhere
                // (index.scss's .media, Title.module.scss) instead of
                // staying a flat accent-lite/accent blue regardless of type.
                boxShadow: `0 0 1px white, 0 0 4px 1px rgba(${glow_rgb}, 0.5), 0 0 12px 4px rgba(${glow_rgb}, 0.25)`,
                transition: {
                  boxShadow: {
                    // The genre/poster/collection colour reveals are timed off
                    // these same two constants (utils/motion.ts).
                    delay: GLOW_DELAY,
                    duration: GLOW_DURATION,
                  },
                },
              },
              collapsed: {
                boxShadow: 'none',
                transition: {
                  boxShadow: {
                    duration: 0.5,
                  },
                },
              },
            }}
            animate={is_content_expanded ? 'expanded' : 'collapsed'}
          >
            <Backdrop
              data={data}
              media_data={media_data}
              is_backdrop_loaded={is_backdrop_loaded}
              setIsBackdropLoaded={setIsBackdropLoaded}
              has_been_hovered={has_been_hovered}
              is_active={is_active}
            />
            <Title tmdb_data={data} media_data={media_data} />
            <Tag
              is_movies_only={is_movies_only}
              media_ui_type={media_ui_type}
            />
            <Index
              idx={display_idx}
              order_type={order_type}
              media_length={media_length}
            />
            {media_data.type === 'tv' && (
              <Season
                media_data={media_data}
                is_content_collapsed={is_content_collapsed}
                is_phase_assigned={!!phase_data}
              />
            )}
            <Phase
              phase_data={phase_data}
              is_content_collapsed={is_content_collapsed}
            />
            <Media
              tmdb_data={data}
              media_data={media_data}
              is_active={is_active}
              is_content_expanded={is_content_expanded}
              selected_cast={selected_cast}
              onSelectCast={handleSelectCast}
              media_list={media_list}
              is_movies_only={is_movies_only}
            />
          </motion.div>
          <AnimatePresence>
            {is_active && (
              <Reticle key="reticle" is_expanded={is_content_expanded} />
            )}
          </AnimatePresence>
          <AnimatePresence>
            {is_active && (
              <CollectionPanel
                key="collection-panel"
                media_data={media_data}
                tmdb_data={data}
                media_list={media_list}
                handleJump={handleJump}
                is_content_expanded={is_content_expanded}
                listRef={collection_list_ref}
              />
            )}
          </AnimatePresence>
          <AnimatePresence>
            {is_active && (
              <CastPanel
                key="cast-panel"
                media_data={media_data}
                selected_cast={selected_cast}
                media_list={media_list}
                handleJump={handleJump}
                is_content_expanded={is_content_expanded}
                is_movies_only={is_movies_only}
                containerRef={container_ref}
                collectionListRef={collection_list_ref}
              />
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
