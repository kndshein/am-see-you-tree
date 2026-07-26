import { createContext, useContext } from 'react';
import tmdb_data_url from '../assets/tmdb-data.json?url';
import { TmdbType } from '../types/Tmdb';

export type TmdbMap = Record<string, TmdbType>;

// tmdb-data.json is ~330kB. Importing it directly would put all of that in the
// JS bundle, where it is parsed as JavaScript; `?url` keeps it out of the
// module graph, so Vite emits it as a content-hashed asset and hands back the
// path. It then downloads on its own and goes through the faster JSON.parse.
//
// Cached at module scope so a remount, or StrictMode's double-invoke, reuses
// the one request.
let inflight: Promise<TmdbMap> | null = null;

export function loadTmdbData(): Promise<TmdbMap> {
  if (!inflight) {
    inflight = fetch(tmdb_data_url).then((res) => {
      if (!res.ok) {
        throw new Error(`Could not fetch TMDB data: ${res.status}`);
      }
      return res.json() as Promise<TmdbMap>;
    });
  }
  return inflight;
}

// Empty default rather than null. Consumers already handle a missing entry
// (MediaWrapper's `has_data`), so anything rendered outside the provider lands
// on the "couldn't load this title" path rather than crashing.
export const TmdbContext = createContext<TmdbMap>({});

export function useTmdbData() {
  return useContext(TmdbContext);
}
