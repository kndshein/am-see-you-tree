import { useEffect, useState } from 'react';
import MediaListWrapper from './components/MediaListWrapper/MediaListWrapper';
import Nav from './components/Nav/Nav';
import Hud from './components/Hud/Hud';
import Modal from 'react-modal';
import { MotionConfig } from 'motion/react';
import { loadTmdbData, TmdbContext, TmdbMap } from './utils/tmdb-data';

Modal.setAppElement('#root');

const order_types = [
  'Chronological',
  'Reverse Chronological',
  'Release Date',
] as const;

export type OrderType = (typeof order_types)[number];

const order_param_map: Record<string, OrderType> = {
  reverse: 'Reverse Chronological',
  release: 'Release Date',
};

function getInitialOrderIndex() {
  const order_param = new URLSearchParams(window.location.search).get(
    'order'
  );
  const order_type = order_param ? order_param_map[order_param] : undefined;
  if (!order_type) return 0;
  return order_types.indexOf(order_type);
}

function App() {
  const [is_DOM_loaded, setIsDOMLoaded] = useState(false);
  const [is_movies_only, setIsMoviesOnly] = useState(true);
  const [order_index, setOrderIndex] = useState(getInitialOrderIndex);
  const [tmdb_data, setTmdbData] = useState<TmdbMap | null>(null);
  const [has_load_error, setHasLoadError] = useState(false);

  function handleDOMLoad() {
    setIsDOMLoaded(true);
  }

  // Runs alongside the DOM-load wait below, not after it. The fetch can fail,
  // and the gate renders nothing until it resolves, so a failure has to
  // surface as something other than a permanently empty screen.
  useEffect(() => {
    let cancelled = false;
    loadTmdbData().then(
      (data) => !cancelled && setTmdbData(data),
      () => !cancelled && setHasLoadError(true),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  // https://stackoverflow.com/a/75179787
  // Wait for DOM load so that everything else, including CSS, is loaded first. That way, FOUC doesn't happen, which causes all elements to be in the view, rendering the inView logic useless
  useEffect(() => {
    // Check if the page has already loaded
    if (document.readyState == 'complete') {
      handleDOMLoad();
    } else {
      window.addEventListener('load', handleDOMLoad);
      // Remove the event listener when component unmounts
      return () => window.removeEventListener('load', handleDOMLoad);
    }
  }, []);

  const order_type = order_types[order_index];

  return (
    <MotionConfig reducedMotion="user">
      {is_DOM_loaded && has_load_error && (
        <main className="app">
          <p className="load_error">
            Couldn't load the catalogue. Try refreshing.
          </p>
        </main>
      )}
      {is_DOM_loaded && tmdb_data && (
        <TmdbContext.Provider value={tmdb_data}>
          <main className="app">
            <Nav
              is_movies_only={is_movies_only}
              setIsMoviesOnly={setIsMoviesOnly}
            />
            <button
              className="order_type_btn"
              onClick={() =>
                setOrderIndex((prevState) => {
                  if (prevState == order_types.length - 1) return 0;
                  return prevState + 1;
                })
              }
            >
              Showing in {order_types[order_index]} Order
            </button>
            <MediaListWrapper
              is_movies_only={is_movies_only}
              order_type={order_type}
            />
            <Hud />
          </main>
        </TmdbContext.Provider>
      )}
    </MotionConfig>
  );
}

export default App;
