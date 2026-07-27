import { MediaType, ShowType } from '../types/Media';
import media_list_json from '../assets/media-list.json';
import { PHASE_SAGA, McuPhase } from '../assets/mcu-phases';
import { TmdbMap } from './tmdb-data';
import { TmdbType } from '../types/Tmdb';
// Type-only, so this erases at compile time and no import cycle exists.
import type { OrderType } from '../App';

// The raw curated array, unreleased entries included — Release Date order
// (buildMediaList below) sorts by actual date rather than array position, so
// it's the one place an unreleased entry's presence is meaningful; nothing
// else should read from this directly.
export const media_list_chrono = media_list_json as Array<MediaType>;
// Everything else (Chronological/Reverse Chronological order, and anything
// that scans the curated list for siblings — collectionSiblingsOf/
// showSeasonsOf below) reads from this instead: an unreleased entry has no
// real in-universe slot to occupy yet, and surfacing one as a "sibling" of
// an already-released title would be a dead link in whichever order doesn't
// carry it.
const media_list_released = media_list_chrono.filter((ele) => !ele.unreleased);
export const media_list_chrono_reversed = [
  ...media_list_released,
].reverse();

// media-list.json has no date fields (it's just the curated viewing order);
// tmdb-data.json has the dates but no ordering of its own (it's a plain
// id-keyed lookup). Release-date order needs both: look each item's date up
// by the same id/id__seasonN key MediaWrapper uses, then sort by it.
// The key a card's row is stored under, matching what MediaWrapper looks up.
export function tmdbKeyOf(ele: MediaType): string {
  return ele.type === 'tv' ? `${ele.id}__season${ele.season}` : ele.id;
}

// The MCU Phase/Saga a card belongs to, if any — undefined for everything
// outside Marvel Studios' own numbered Phase list, including media never in
// the MCU at all. ele.phase is the source of truth (media-list.json); saga
// is derived from it via mcu-phases.ts's own PHASE_SAGA rather than stored
// alongside it, so the two can't drift apart.
export function phaseOf(ele: MediaType): McuPhase | undefined {
  if (ele.phase === undefined) return undefined;
  return { phase: ele.phase, saga: PHASE_SAGA[ele.phase] };
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

// Shared by releaseDateOf below (looks data up in the whole map) and
// isUnreleased (every caller already has the single resolved entry on hand,
// with no need to look it up a second time) — one place for the TV
// season-fallback logic instead of two copies that could drift apart.
function dateOfResolved(ele: MediaType, data: TmdbType | undefined): string {
  if (!data) return '';
  return ele.type === 'tv'
    ? (data[`season/${ele.season}`]?.air_date ?? '')
    : (data.release_date ?? '');
}

export function releaseDateOf(ele: MediaType, tmdb_data: TmdbMap): string {
  return dateOfResolved(ele, tmdb_data[tmdbKeyOf(ele)]);
}

// media-list.json's own unreleased flag is only ever set once, by hand, and
// never touched again once a title actually ships — so it's a starting
// point, not a live answer. This recomputes the real one from TMDB's own
// release/air date: once that's actually in the past, the flag is stale and
// this stops reporting it as unreleased even though media-list.json still
// says so. No usable date yet (or one still in the future) keeps trusting
// the flag. ISO date strings compare lexically the same as chronologically.
export function isUnreleased(
  ele: MediaType,
  data: TmdbType | undefined,
): boolean {
  if (!ele.unreleased) return false;
  const date = dateOfResolved(ele, data);
  if (!date) return true;
  return date > new Date().toISOString().slice(0, 10);
}

// Other movies in the same TMDB collection (e.g. "Iron Man Collection") that
// are also in this app's own curated list — so every entry returned is
// guaranteed to be something the rail can actually jump to. TV never has a
// collection, so this only ever matches other movie/short/special entries.
// media_list_released, not media_list_chrono: an unreleased sibling (e.g.
// Avengers: Doomsday next to an already-released Avengers film) would list
// here but jump nowhere in Chronological/Reverse Chronological order, since
// it isn't actually part of either.
export function collectionSiblingsOf(
  ele: MediaType,
  tmdb_data: TmdbMap,
): Array<MediaType> {
  const collection_id = tmdb_data[tmdbKeyOf(ele)]?.collection?.id;
  if (!collection_id) return [];

  return media_list_released
    .filter((item) => item.type !== 'tv')
    .filter(
      (item) => tmdb_data[tmdbKeyOf(item)]?.collection?.id === collection_id,
    )
    .sort((a, b) =>
      releaseDateOf(a, tmdb_data).localeCompare(releaseDateOf(b, tmdb_data)),
    );
}

// TV's own answer to collectionSiblingsOf: TMDB has no collection concept for
// shows, so in its place this is every season of ele's own show that's in
// this app's own curated list — one row per season number, not per fragment
// (mergeTvFragments' same concern: a season can appear as several entries
// when a movie was watched partway through it), in season order.
// media_list_released, not media_list_chrono — same reasoning as
// collectionSiblingsOf above: an unreleased season shouldn't list as a
// sibling of an already-released one if it can't actually be jumped to.
export function showSeasonsOf(ele: MediaType): Array<ShowType> {
  if (ele.type !== 'tv') return [];

  const by_season = new Map<number, ShowType>();
  for (const item of media_list_released) {
    if (item.type !== 'tv' || item.id !== ele.id) continue;
    if (!by_season.has(item.season)) by_season.set(item.season, item);
  }

  return [...by_season.values()].sort((a, b) => a.season - b.season);
}

// All media in the list (or current filtered list) featuring the given actor
export function castMatchesInMediaList(
  cast_name: string,
  media_list: Array<MediaType>,
  tmdb_data: TmdbMap,
  is_movies_only: boolean,
): Array<MediaType> {
  return mergeTvFragments(media_list)
    .filter((item) => isShown(item, is_movies_only))
    .filter((item) => {
      const data = tmdb_data[tmdbKeyOf(item)];
      if (!data?.credits?.cast) return false;
      return data.credits.cast.some(
        (c) => c.name.toLowerCase() === cast_name.toLowerCase(),
      );
    })
    .sort((a, b) =>
      releaseDateOf(a, tmdb_data).localeCompare(releaseDateOf(b, tmdb_data)),
    );
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
// genuinely shorter than the chronological orders' — and, since it sorts by
// media_list_chrono directly rather than media_list_released, is also the
// one order genuinely longer whenever unreleased entries exist: it's the
// only view that can actually place them (there's no in-universe slot for
// an unannounced-release title to occupy in the other two).
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
      return media_list_released;
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
  by_type: Array<{ type: MediaType['type']; label: string; count: number }>;
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

  // Chronological order (buildMediaList's default) leaves a season's
  // fragments as separate entries when a movie was watched partway through
  // it — correct for the rail, which is meant to show that split, but
  // counted as multiple shows here otherwise. Merged for tallying only; the
  // rail itself still renders the unmerged `list` passed in.
  for (const ele of mergeTvFragments(list)) {
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
      type,
      label,
      count: tally.get(type) ?? 0,
    })).filter((row) => row.count > 0),
    span: earliest
      ? { from: earliest.slice(0, 4), to: latest.slice(0, 4) }
      : null,
    runtime_minutes,
  };
}
