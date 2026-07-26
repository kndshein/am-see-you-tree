export interface Genre {
  id: number;
  name: string;
}

export interface CastMember {
  name: string;
  character?: string;
}

export interface Episode {
  still_path: string | null;
  season_number: number;
  episode_number: number;
  name: string;
  overview: string;
  runtime?: number | null;
  vote_average?: number;
  vote_count?: number;
}

export interface SeasonData {
  air_date?: string;
  poster_path?: string | null;
  overview?: string;
  episodes?: Episode[];
}

export interface TmdbType {
  poster_path: string | null;
  backdrop_path: string | null;
  original_title?: string;
  original_name?: string;
  tagline?: string;
  overview?: string;
  vote_average: number;
  vote_count?: number;
  release_date?: string;
  // US age rating.
  certification?: string;
  imdb_id?: string;
  // Movies only. Absent for standalone titles with no franchise collection.
  collection?: { id: number; name: string };
  original_language?: string;
  // Director for films, creator(s) for shows.
  author?: string;
  // Films only, and absent when TMDB has no figure.
  budget?: number;
  revenue?: number;
  runtime?: number;
  genres: Genre[];
  credits: {
    cast: CastMember[];
  };
  images?: {
    backdrops: Array<{ file_path: string }>;
  };
  [key: `season/${number}`]: SeasonData | undefined;
}
