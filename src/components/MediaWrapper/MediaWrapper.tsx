import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { MediaType, MediaUiType } from '../../types/Media';
import { HandleToggleType } from '../../types/Toggles';
import Loading from '../Loading/Loading';
import Tag from './Tag/Tag';
import Title from './Title/Title';
import Media from '../Media/Media';
import Backdrop from './Backdrop/Backdrop';
import { useState } from 'react';
import Index from './Index/Index';
import styles from './MediaWrapper.module.scss';
import { motion } from 'motion/react';
import { useInView } from 'react-intersection-observer';
import Season from './Season/Season';
import { OrderType } from '../../App';

type PropTypes = {
  media_data: MediaType;
  is_movies_only: boolean;
  handleToggle: HandleToggleType;
  is_active: boolean;
  is_navigating: boolean;
  idx: number;
  order_type: OrderType;
  media_length: number;
};

export default function MediaWrapper({
  media_data,
  is_movies_only,
  handleToggle,
  is_active,
  is_navigating,
  idx,
  order_type,
  media_length,
}: PropTypes) {
  const { ref, inView } = useInView({
    triggerOnce: true,
  });
  let query_array = [];
  let url_append = '';
  let url_media_type;
  let media_ui_type: MediaUiType; // To display "Show" instead of "TV"
  const [is_backdrop_loaded, setIsBackdropLoaded] = useState(false);
  // Denotes if curr media is fully expanded or not
  const [{ is_content_expanded, is_content_collapsed }, setContentStatus] =
    useState({
      is_content_expanded: is_active,
      is_content_collapsed: !is_active,
    });

  if (media_data.type == 'tv') {
    query_array = ['show', media_data.id, media_data.season];
    url_append = `,season/${media_data.season},images`;
    url_media_type = 'tv';
    media_ui_type = 'show';
  } else {
    query_array = ['movie', media_data.id];
    url_append = ',collection';
    url_media_type = 'movie';
    media_ui_type = media_data.type;
  }

  let url = `https://api.themoviedb.org/3/${url_media_type}/${
    media_data.id
  }?api_key=${
    import.meta.env.VITE_API_KEY
  }&language=en-US&include_image_language=null&append_to_response=credits${url_append}`;

  const { isPending, isError, data, refetch } = useQuery({
    queryKey: query_array,
    queryFn: () => axios.get(url).then((res) => res.data),
    // If is_active, do it. Otherwise, do it if inView, but not while is_navigating
    enabled: is_active ? true : is_navigating ? false : inView,
  });

  // Guard against a failed fetch: `isPending` flips to false on error while
  // `data` stays undefined, so the content below would crash on `data.*`.
  const has_data = !isError && !!data;

  return (
    <button
      id={idx.toString()}
      ref={ref}
      className={`${media_data.id} media ${is_active ? 'active' : ''} ${
        isPending || !has_data || !is_backdrop_loaded ? '' : 'ready'
      } ${is_content_expanded ? 'expanded-layout' : ''} ${
        is_content_collapsed ? 'collapsed-layout' : ''
      }`}
      // On error the card acts as a retry target; otherwise it toggles.
      onClick={() => (isError ? refetch() : handleToggle(idx))}
      tabIndex={0}
      // Keep enabled while in error so the retry click above stays clickable.
      disabled={isPending || (!isError && (!data || !is_backdrop_loaded))}
    >
      {isPending ? (
        <Loading />
      ) : isError ? (
        <div className={styles.error}>
          <p className={styles.error_message}>Couldn't load this title.</p>
          <p className={styles.error_retry}>Tap to retry</p>
        </div>
      ) : !data ? (
        <Loading />
      ) : (
        <div
          className={`${styles.content_container} ${
            is_active ? styles.active : ''
          } ${is_content_expanded ? styles.expanded_layout : ''}`}
        >
          {is_content_expanded && (
            <motion.div
              className={styles.overlay}
              animate={{
                opacity: 1,
                transition: {
                  duration: 0.7,
                },
              }}
              initial={{ opacity: 0 }}
            ></motion.div>
          )}
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
            {/* Double loading because the background image only loads if it's rendered */}
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
              idx={idx}
              order_type={order_type}
              media_length={media_length}
            />
            {media_data.type == 'tv' && (
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
        </div>
      )}
    </button>
  );
}
