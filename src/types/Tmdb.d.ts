export interface Genre {
  id: number;
  name: string;
}

export interface CastMember {
  name: string;
}

export interface Episode {
  still_path: string | null;
  season_number: number;
  episode_number: number;
  name: string;
  overview: string;
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
  release_date?: string;
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
