import { MediaType, MediaUiType } from '../../types/Media';
import { HandleToggleType } from '../../types/Toggles';
import Loading from '../Loading/Loading';
import Tag from './Tag/Tag';
import Title from './Title/Title';
import Media from '../Media/Media';
import Backdrop from './Backdrop/Backdrop';
import React, { useState } from 'react';
import Index from './Index/Index';
import styles from './MediaWrapper.module.scss';
import { motion, AnimatePresence } from 'motion/react';
import { useInView } from 'react-intersection-observer';
import Season from './Season/Season';
import Reticle from './Reticle/Reticle';
import { OrderType } from '../../App';
import { TmdbType } from '../../types/Tmdb';
import tmdb_data_map from '../../assets/tmdb-data.json';

type PropTypes = {
  media_data: MediaType;
  is_movies_only: boolean;
  handleToggle: HandleToggleType;
  is_active: boolean;
  idx: number;
  display_idx: number;
  order_type: OrderType;
  media_length: number;
};

export default function MediaWrapper({
  media_data,
  is_movies_only,
  handleToggle,
  is_active,
  idx,
  display_idx,
  order_type,
  media_length,
}: PropTypes) {
  const { ref, inView } = useInView({
    triggerOnce: true,
  });
  const [is_backdrop_loaded, setIsBackdropLoaded] = useState(false);
  const [{ is_content_expanded, is_content_collapsed }, setContentStatus] =
    useState({
      is_content_expanded: is_active,
      is_content_collapsed: !is_active,
    });

  const media_ui_type: MediaUiType =
    media_data.type === 'tv' ? 'show' : media_data.type;

  const tmdb_key =
    media_data.type === 'tv'
      ? `${media_data.id}__season${media_data.season}`
      : media_data.id;
  const data: TmdbType = (tmdb_data_map as Record<string, TmdbType>)[tmdb_key];
  const has_data = !!data;

  const is_ready = is_active || inView;
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
      }`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {!is_ready ? (
        <Loading />
      ) : !has_data ? (
        <div className={styles.error}>
          <p className={styles.error_message}>Couldn't load this title.</p>
        </div>
      ) : (
        <div
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
                // Previously this popped out with no fade, because the
                // conditional unmounted it immediately.
                exit={{ opacity: 0, transition: { duration: 0.3 } }}
                transition={{ duration: 0.7 }}
              ></motion.div>
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
                boxShadow:
                  '0 0 1px white, 0 0 5px 1px rgb(102, 192, 204), 0 0 20px 7px rgb(45, 100, 114)',
                transition: {
                  boxShadow: {
                    delay: 2.5,
                    duration: 0.8,
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
              />
            )}
            <Media
              tmdb_data={data}
              media_data={media_data}
              is_active={is_active}
              is_content_expanded={is_content_expanded}
            />
          </motion.div>
          <AnimatePresence>
            {is_active && (
              <Reticle key="reticle" is_expanded={is_content_expanded} />
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
