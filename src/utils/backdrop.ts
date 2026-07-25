import backdrop_manifest from '../assets/backdrops.json';
import { MediaType } from '../types/Media';
import { TmdbType } from '../types/Tmdb';

export type BackdropVariants = {
  graded: string;
  plain: string;
  blurred: string;
  // Measured off the generated file, not assumed from the target size — a
  // source smaller than the target is left at its own dimensions.
  width: number;
  height: number;
};

// Shows are keyed to a per-season alternate when one exists; anything without a
// backdrop falls back to its poster. scripts/process-backdrops.mjs resolves the
// same way, so the two agree on which file belongs to which card.
export function backdropPathOf(media_data: MediaType, data: TmdbType): string {
  if (!data.backdrop_path) return data.poster_path ?? '';
  if (media_data.type !== 'tv') return data.backdrop_path;
  const alternate = data.images?.backdrops?.[media_data.season - 1];
  return alternate ? alternate.file_path : data.backdrop_path;
}

// Undefined when the pipeline hasn't produced a set for this path, which the
// callers treat as "fall back to TMDB".
export function backdropVariantsOf(
  media_data: MediaType,
  data: TmdbType,
): BackdropVariants | undefined {
  return (backdrop_manifest as Record<string, BackdropVariants>)[
    backdropPathOf(media_data, data)
  ];
}
