import { useEffect, useMemo, useState } from 'react';
import MediaListWrapper from './components/MediaListWrapper/MediaListWrapper';
import Hud from './components/Hud/Hud';
import Modal from 'react-modal';
import { motion, MotionConfig, useMotionValueEvent } from 'motion/react';
import { loadTmdbData, TmdbContext, TmdbMap } from './utils/tmdb-data';
import { buildMediaList, summarizeMedia } from './utils/media-lists';
import { scroll_progress, is_locked } from './utils/hud-telemetry';

Modal.setAppElement('#root');

const order_types = [
  'Reverse Chronological',
  'Chronological',
  'Release Date',
] as const;

export type OrderType = (typeof order_types)[number];

// Not order_types[0] — that's cycle order (button-display order), not default.
// Keeping the default as its own named lookup means the two can't drift apart
// just because one of them gets reordered.
const DEFAULT_ORDER_TYPE: OrderType = 'Chronological';

const order_param_map: Record<string, OrderType> = {
  reverse: 'Reverse Chronological',
  release: 'Release Date',
};

function getInitialOrderIndex() {
  const order_param = new URLSearchParams(window.location.search).get(
    'order'
  );
  const order_type = order_param
    ? order_param_map[order_param]
    : undefined;
  return order_types.indexOf(order_type ?? DEFAULT_ORDER_TYPE);
}

function App() {
  const [is_DOM_loaded, setIsDOMLoaded] = useState(false);
  const [is_movies_only, setIsMoviesOnly] = useState(true);
  const [order_index, setOrderIndex] = useState(getInitialOrderIndex);
  const [tmdb_data, setTmdbData] = useState<TmdbMap | null>(null);
  const [has_load_error, setHasLoadError] = useState(false);
  // Rarely changes (only on card open/close), so a plain re-render here is
  // fine — unlike is_locked's other reader (Hud's readouts), which is on a
  // MotionValue specifically to dodge 60fps re-renders during scroll.
  const [is_card_expanded, setIsCardExpanded] = useState(is_locked.get());
  useMotionValueEvent(is_locked, 'change', setIsCardExpanded);

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

  // Built through the same helper the rail uses, so the HUD tally always
  // describes exactly what is on screen — including release-date order, which
  // merges TV fragments and so shows fewer cards than the other two.
  const summary = useMemo(() => {
    const data = tmdb_data ?? {};
    return summarizeMedia(
      buildMediaList(order_type, data),
      is_movies_only,
      data,
    );
  }, [order_type, tmdb_data, is_movies_only]);

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
            <button
              className="order_type_btn"
              onClick={() =>
                setOrderIndex((prevState) => {
                  if (prevState == order_types.length - 1) return 0;
                  return prevState + 1;
                })
              }
              aria-label={`Sort order: ${order_types[order_index]}. Click to switch to the next order.`}
            >
              {order_types.map((type, idx) => (
                <span
                  key={type}
                  className={`order_type_option ${
                    idx === order_index ? 'active' : ''
                  }`}
                >
                  {type}
                </span>
              ))}
            </button>
            {/* Doubles as the button's bottom border — same full-bleed span
                its old fading underline used, just live instead of static. */}
            <div className="progress">
              <motion.div
                className="progress_fill"
                style={{ scaleX: scroll_progress }}
              />
            </div>
            <MediaListWrapper
              is_movies_only={is_movies_only}
              order_type={order_type}
            />
            <Hud
              summary={summary}
              order_type={order_type}
              is_movies_only={is_movies_only}
            />
            {/* Bottom-centre, in the HUD's own reserved gap between .readout
                and .build (see .build's comment in Hud.module.scss) — where
                the old nav bar's centrepiece used to sit. */}
            <button
              className={`movies_only_toggle ${
                is_movies_only ? 'active' : ''
              }`}
              aria-pressed={is_movies_only}
              // The expanded card's own darkened overlay sits above this in
              // z-index (see index.scss's :disabled rule) — disabling the
              // click keeps the two in sync instead of leaving a control
              // that's invisible but still technically toggleable.
              disabled={is_card_expanded}
              onClick={() => setIsMoviesOnly((prev) => !prev)}
            >
              <span className="status_dot" aria-hidden="true" />
              Movies Only
            </button>
          </main>
        </TmdbContext.Provider>
      )}
    </MotionConfig>
  );
}

export default App;
