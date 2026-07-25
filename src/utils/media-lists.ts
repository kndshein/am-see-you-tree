import { MediaType, ShowType } from '../types/Media';
import media_list_json from '../assets/media-list.json';
import { TmdbMap } from './tmdb-data';
// Type-only, so this erases at compile time and no import cycle exists.
import type { OrderType } from '../App';

export const media_list_chrono = media_list_json as Array<MediaType>;
export const media_list_chrono_reversed = [
  ...media_list_json,
].reverse() as Array<MediaType>;

// media-list.json has no date fields (it's just the curated viewing order);
// tmdb-data.json has the dates but no ordering of its own (it's a plain
// id-keyed lookup). Release-date order needs both: look each item's date up
// by the same id/id__seasonN key MediaWrapper uses, then sort by it.
// The key a card's row is stored under, matching what MediaWrapper looks up.
export function tmdbKeyOf(ele: MediaType): string {
  return ele.type === 'tv' ? `${ele.id}__season${ele.season}` : ele.id;
}

// Minutes for one card. TV counts only the episodes that card actually covers,
// since a season is often split across several entries.
export function runtimeOf(ele: MediaType, tmdb_data: TmdbMap): number {
  const data = tmdb_data[tmdbKeyOf(ele)];
  if (!data) return 0;
  if (ele.type !== 'tv') return data.runtime ?? 0;

  return (data[`season/${ele.season}`]?.episodes ?? [])
    .slice(ele.epiStart - 1, ele.epiEnd)
    .reduce((sum, episode) => sum + (episode.runtime ?? 0), 0);
}

export function releaseDateOf(ele: MediaType, tmdb_data: TmdbMap): string {
  const data = tmdb_data[tmdbKeyOf(ele)];
  if (!data) return '';
  return ele.type === 'tv'
    ? (data[`season/${ele.season}`]?.air_date ?? '')
    : (data.release_date ?? '');
}

// A season can appear as several entries in media-list.json when a movie was
// watched partway through it (e.g. eps 1-7, then a movie, then eps 8-16).
// That split only reflects viewing order, so for release-date order we merge
// same show/season entries back into one card spanning their combined
// episode range.
function mergeTvFragments(list: Array<MediaType>): Array<MediaType> {
  const merged: Array<MediaType> = [];
  const season_idx = new Map<string, number>();

  for (const ele of list) {
    if (ele.type !== 'tv') {
      merged.push(ele);
      continue;
    }

    const key = `${ele.id}__season${ele.season}`;
    const existing_idx = season_idx.get(key);
    if (existing_idx === undefined) {
      season_idx.set(key, merged.length);
      merged.push({ ...ele });
      continue;
    }

    const existing = merged[existing_idx] as ShowType;
    existing.epiStart = Math.min(existing.epiStart, ele.epiStart);
    existing.epiEnd = Math.max(existing.epiEnd, ele.epiEnd);
  }

  return merged;
}

// Shared by the rail and the HUD readout so the two can't disagree about what
// is on screen. Release-date order merges TV fragments, so its length is
// genuinely shorter than the chronological orders'.
export function buildMediaList(
  order_type: OrderType,
  tmdb_data: TmdbMap,
): Array<MediaType> {
  switch (order_type) {
    case 'Reverse Chronological':
      return media_list_chrono_reversed;
    case 'Release Date':
      return mergeTvFragments(media_list_chrono).sort((a, b) =>
        releaseDateOf(a, tmdb_data).localeCompare(releaseDateOf(b, tmdb_data)),
      );
    default:
      return media_list_chrono;
  }
}

// The movies-only filter keeps `movie` alone: shows, shorts and specials all
// drop out together.
export function isShown(ele: MediaType, is_movies_only: boolean) {
  return ele.type === 'movie' || !is_movies_only;
}

const TYPE_LABELS: Array<[MediaType['type'], string]> = [
  ['movie', 'Movies'],
  ['tv', 'Shows'],
  ['short', 'Shorts'],
  ['special', 'Specials'],
];

export type MediaSummary = {
  total: number;
  by_type: Array<{ label: string; count: number }>;
  // Release years of the shown set, or null when no entry has a usable date.
  span: { from: string; to: string } | null;
  runtime_minutes: number;
};

export function summarizeMedia(
  list: Array<MediaType>,
  is_movies_only: boolean,
  tmdb_data: TmdbMap,
): MediaSummary {
  const tally = new Map<string, number>();
  let total = 0;
  let earliest = '';
  let latest = '';
  let runtime_minutes = 0;

  for (const ele of list) {
    if (!isShown(ele, is_movies_only)) continue;
    total++;
    tally.set(ele.type, (tally.get(ele.type) ?? 0) + 1);
    runtime_minutes += runtimeOf(ele, tmdb_data);

    // ISO dates, so lexical comparison is chronological.
    const date = releaseDateOf(ele, tmdb_data);
    if (!date) continue;
    if (!earliest || date < earliest) earliest = date;
    if (!latest || date > latest) latest = date;
  }

  return {
    total,
    // Fixed order, and types with nothing on screen are dropped rather than
    // listed as zero.
    by_type: TYPE_LABELS.map(([type, label]) => ({
      label,
      count: tally.get(type) ?? 0,
    })).filter((row) => row.count > 0),
    span: earliest
      ? { from: earliest.slice(0, 4), to: latest.slice(0, 4) }
      : null,
    runtime_minutes,
  };
}
