// Trimmed shape of scripts/prefetch-omdb.mjs's output — everything here is
// best-effort supplementary data (some entries, especially shorts/specials,
// have no OMDb match at all), unlike TmdbType's own fields most of the app
// treats as always-present.
export interface OmdbType {
  rotten_tomatoes?: number;
  metascore?: number;
  imdb_rating?: number;
  imdb_votes?: number;
}
