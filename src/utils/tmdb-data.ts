import { createContext, useContext } from 'react';
import tmdb_data_url from '../assets/tmdb-data.json?url';
import { TmdbType } from '../types/Tmdb';

export type TmdbMap = Record<string, TmdbType>;

// tmdb-data.json is ~330kB — a little under half the bundle back when
// components imported it directly, and it was parsed as JavaScript rather than
// as JSON. `?url` keeps it out of the module graph: Vite emits it as a
// content-hashed asset and hands back the path, so it downloads on its own and
// goes through the much faster JSON.parse route.
//
// Cached at module scope so a remount (or StrictMode's double-invoke) reuses
// the same request instead of issuing a second one.
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

// Defaults to empty rather than null: consumers already handle a missing entry
// (MediaWrapper's `has_data`), so anything rendered outside the provider falls
// back to the existing "couldn't load this title" path instead of crashing.
export const TmdbContext = createContext<TmdbMap>({});

export function useTmdbData() {
  return useContext(TmdbContext);
}
