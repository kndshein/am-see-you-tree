import { createContext, useContext } from 'react';
import omdb_data_url from '../assets/omdb-data.json?url';
import { OmdbType } from '../types/Omdb';

// Keyed by IMDb ID, not the app's own id/id__seasonN key (TmdbMap's own key)
// — OMDb has no concept of "this app's season card," and TmdbType.imdb_id
// (already resolved per entry by prefetch-tmdb.mjs) is the one stable key
// both sides agree on.
export type OmdbMap = Record<string, OmdbType>;

// Same `?url` + module-scope cache reasoning as tmdb-data.ts's loadTmdbData.
let inflight: Promise<OmdbMap> | null = null;

export function loadOmdbData(): Promise<OmdbMap> {
  if (!inflight) {
    inflight = fetch(omdb_data_url).then((res) => {
      if (!res.ok) {
        throw new Error(`Could not fetch OMDb data: ${res.status}`);
      }
      return res.json() as Promise<OmdbMap>;
    });
  }
  return inflight;
}

// Empty default, and — unlike TmdbContext — nothing in App.tsx gates
// rendering on this loading first: every OmdbType field is an optional
// extra, not core data a card needs before it can render at all, so a card
// just renders without the critic scores until this resolves, then
// picks them up on the re-render once it does.
export const OmdbContext = createContext<OmdbMap>({});

export function useOmdbData() {
  return useContext(OmdbContext);
}
