import {
  PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import MediaListWrapper from './components/MediaListWrapper/MediaListWrapper';
import Hud from './components/Hud/Hud';
import SpiderWebCorners from './components/SpiderWebCorners/SpiderWebCorners';
import Modal from 'react-modal';
import {
  AnimatePresence,
  motion,
  MotionConfig,
  useMotionValueEvent,
  useTransform,
} from 'motion/react';
import { loadTmdbData, TmdbContext, TmdbMap } from './utils/tmdb-data';
import { loadOmdbData, OmdbContext, OmdbMap } from './utils/omdb-data';
import { buildMediaList, summarizeMedia } from './utils/media-lists';
import {
  scroll_progress,
  is_locked,
  is_charging,
  locked_theme_title,
} from './utils/hud-telemetry';
import { dashify } from './utils/format';

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
  const [omdb_data, setOmdbData] = useState<OmdbMap>({});
  const [has_load_error, setHasLoadError] = useState(false);
  // Rarely changes (only on card open/close), so a plain re-render here is
  // fine — unlike is_locked's other reader (Hud's readouts), which is on a
  // MotionValue specifically to dodge 60fps re-renders during scroll.
  const [is_card_expanded, setIsCardExpanded] = useState(is_locked.get());
  useMotionValueEvent(is_locked, 'change', setIsCardExpanded);
  // Same reasoning as is_card_expanded above — which title is expanded only
  // changes on the same rare, human-paced open/close beat.
  const [locked_theme, setLockedTheme] = useState<string | null>(
    locked_theme_title.get(),
  );
  useMotionValueEvent(locked_theme_title, 'change', setLockedTheme);
  const is_spider_man_active = locked_theme === 'spider-man';
  // Same reasoning as is_card_expanded above — a held arrow is a rare,
  // human-paced state change, not a per-frame one.
  const [is_holding_arrow, setIsHoldingArrow] = useState(is_charging.get());
  useMotionValueEvent(is_charging, 'change', setIsHoldingArrow);
  // Owned here (not MediaListWrapper, which used to create its own) so the
  // progress bar's drag handlers below can scrub the rail's actual scrollLeft
  // directly — same rail MediaListWrapper's own arrow buttons already scroll.
  const media_list_ref = useRef<HTMLDivElement | null>(null);
  // Drives the knob's own "being dragged" visual (bigger/glowing, see
  // index.scss's .progress_track.dragging) explicitly, rather than leaning on
  // CSS :active — with setPointerCapture in play, :active's behavior once the
  // pointer strays outside the element varies enough across browsers that a
  // real state flag reads more reliably than trusting it.
  const [is_dragging_progress, setIsDraggingProgress] = useState(false);

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

  // Supplementary, not core data (unlike tmdb_data above) — no error state,
  // no gate on has_load_error/is_DOM_loaded. A failed or slow fetch here just
  // means cards render without critic scores rather than the whole
  // site staying blank for a non-essential extra.
  useEffect(() => {
    let cancelled = false;
    loadOmdbData().then((data) => !cancelled && setOmdbData(data));
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

  const progress_dot_left = useTransform(
    scroll_progress,
    (value) => `${value * 100}%`
  );

  // Writes scrollLeft directly, same as MediaListWrapper's own handleScroll/
  // jumpToEdge — scroll_progress itself is never set from here. MediaList.tsx's
  // scroll listener is the only writer of that motion value (derived from the
  // rail's real scrollLeft), so the dot/fill just follow the scroll this
  // triggers, the same way they follow a wheel scroll or an arrow click.
  const scrollToFraction = (fraction: number) => {
    const el = media_list_ref.current;
    if (!el) return;
    const max_scroll = el.scrollWidth - el.clientWidth;
    el.scrollLeft = Math.max(0, Math.min(1, fraction)) * max_scroll;
  };

  const fractionFromClientX = (clientX: number, track: HTMLElement) => {
    const rect = track.getBoundingClientRect();
    return rect.width > 0 ? (clientX - rect.left) / rect.width : 0;
  };

  // Pointer capture (not window-level move/up listeners) keeps the drag on
  // this same element even once the pointer strays outside the track's own
  // thin strip — same reasoning as a native <input type="range">'s own drag
  // handling. Disabled while a card is open: the rail sits fully covered by
  // the expanded card overlay then, so scrubbing it would move something the
  // user can't even see (same case movies_only_toggle's own `disabled` below
  // already guards against).
  const handleProgressPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (is_card_expanded) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDraggingProgress(true);
    scrollToFraction(fractionFromClientX(event.clientX, event.currentTarget));
  };

  const handleProgressPointerMove = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    scrollToFraction(fractionFromClientX(event.clientX, event.currentTarget));
  };

  const handleProgressPointerUp = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsDraggingProgress(false);
  };

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
          <OmdbContext.Provider value={omdb_data}>
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
                    {dashify(type)}
                  </span>
                ))}
              </button>
              {/* Doubles as the button's bottom border — same full-bleed span
                  its old fading underline used, just live instead of static.
                  Draggable: a pointer down anywhere on the strip grabs the
                  knob and scrubs the rail to that position, the same way a
                  native <input type="range"> track works — not just the tiny
                  7px dot itself, which pointer-events: none anyway (see its
                  own comment, index.scss). */}
              <div
                className={`progress_track ${
                  is_card_expanded ? 'disabled' : ''
                } ${is_dragging_progress ? 'dragging' : ''}`}
                onPointerDown={handleProgressPointerDown}
                onPointerMove={handleProgressPointerMove}
                onPointerUp={handleProgressPointerUp}
                onPointerCancel={handleProgressPointerUp}
              >
                <div className="progress">
                  <motion.div
                    className={`progress_fill ${
                      is_holding_arrow ? 'charging' : ''
                    }`}
                    style={{ scaleX: scroll_progress }}
                  />
                </div>
                <motion.div
                  className={`progress_dot ${
                    is_holding_arrow ? 'charging' : ''
                  }`}
                  style={{ left: progress_dot_left }}
                />
              </div>
              <MediaListWrapper
                is_movies_only={is_movies_only}
                order_type={order_type}
                media_list_ref={media_list_ref}
              />
              <Hud
                summary={summary}
                order_type={order_type}
                is_movies_only={is_movies_only}
              />
              <AnimatePresence>
                {is_spider_man_active && <SpiderWebCorners key="spider-web" />}
              </AnimatePresence>
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
                {dashify('Movies Only')}
              </button>
            </main>
          </OmdbContext.Provider>
        </TmdbContext.Provider>
      )}
    </MotionConfig>
  );
}

export default App;
