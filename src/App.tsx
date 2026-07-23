import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import MediaListWrapper from './components/MediaListWrapper/MediaListWrapper';
import Nav from './components/Nav/Nav';
import Modal from 'react-modal';

Modal.setAppElement('#root');

const order_types = ['Chronological', 'Reverse Chronological'] as const;

export type OrderType = (typeof order_types)[number];

// Create the client once outside of render so it isn't recreated (and its
// cache discarded) on every state change.
const query_client = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  const [is_DOM_loaded, setIsDOMLoaded] = useState(false);
  const [is_movies_only, setIsMoviesOnly] = useState(true);
  const [order_index, setOrderIndex] = useState(0);

  function handleDOMLoad() {
    setIsDOMLoaded(true);
  }

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
    <QueryClientProvider client={query_client}>
      {is_DOM_loaded && (
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
        </main>
      )}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
