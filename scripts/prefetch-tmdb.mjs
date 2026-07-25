// Build-time prefetch of TMDB data.
//
// Reads src/assets/media-list.json, fetches the same TMDB endpoint the app used
// to hit at runtime for each card, and writes the responses to
// src/assets/tmdb-data.json keyed per card. The app then imports that JSON, so
// there is no per-card fetching on scroll (and dev/prod use identical data).
//
// Run with: npm run prefetch

import { readFile, writeFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const MEDIA_LIST_PATH = resolve(root, 'src/assets/media-list.json');
const OUTPUT_PATH = resolve(root, 'src/assets/tmdb-data.json');
const META_PATH = resolve(root, 'src/assets/tmdb-data.meta.json');
const SCRIPT_PATH = fileURLToPath(import.meta.url);

// Same concurrency ceiling stays well under TMDB's rate limit.
const CONCURRENCY = 8;

// Keep this key derivation in sync with the app's lookup (see MediaWrapper).
export function tmdbKey(item) {
  return item.type === 'tv' ? `${item.id}__season${item.season}` : item.id;
}

function sanitizeMediaId(id) {
  return id.split('-')[0];
}

function buildUrl(item, apiKey) {
  const media_type = item.type === 'tv' ? 'tv' : 'movie';
  // `release_dates` / `content_ratings` carry the age certification, which
  // lives nowhere else on the main response.
  const append =
    item.type === 'tv'
      ? `,season/${item.season},images,content_ratings,external_ids`
      : ',collection,release_dates';
  const id = sanitizeMediaId(item.id);
  return (
    `https://api.themoviedb.org/3/${media_type}/${id}` +
    `?api_key=${apiKey}&language=en-US&include_image_language=null` +
    `&append_to_response=credits${append}`
  );
}

async function fetchOne(item, apiKey) {
  const res = await fetch(buildUrl(item, apiKey));
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} for ${item.id}`);
  }
  return res.json();
}

// Keep only the fields the app actually renders. The full responses are ~10MB
// total (full cast, keywords, collections, etc.); trimming drops that to a
// bundle-friendly size. If a component starts reading a new field, add it here
// and re-run `npm run prefetch`.
// US age certification. Movies file it per-release under `release_dates`;
// shows keep a single rating per country under `content_ratings`.
function certificationOf(item, full) {
  if (item.type === 'tv') {
    const us = (full.content_ratings?.results ?? []).find(
      (row) => row.iso_3166_1 === 'US',
    );
    return us?.rating || undefined;
  }
  const us = (full.release_dates?.results ?? []).find(
    (row) => row.iso_3166_1 === 'US',
  );
  const rated = (us?.release_dates ?? []).find((r) => r.certification);
  return rated?.certification || undefined;
}

// Movies credit a director; shows credit whoever created them.
function authorOf(item, full) {
  if (item.type === 'tv') {
    const names = (full.created_by ?? []).map((person) => person.name);
    return names.length ? names.join(', ') : undefined;
  }
  const directors = (full.credits?.crew ?? [])
    .filter((person) => person.job === 'Director')
    .map((person) => person.name);
  return directors.length ? directors.join(', ') : undefined;
}

function trim(item, full) {
  const trimmed = {
    poster_path: full.poster_path,
    backdrop_path: full.backdrop_path,
    original_title: full.original_title,
    original_name: full.original_name,
    tagline: full.tagline,
    overview: full.overview,
    vote_average: full.vote_average,
    vote_count: full.vote_count,
    release_date: full.release_date,
    runtime: full.runtime,
    certification: certificationOf(item, full),
    imdb_id: full.imdb_id || full.external_ids?.imdb_id || undefined,
    original_language: full.original_language || undefined,
    author: authorOf(item, full),
    // Movie-only, and frequently 0 when TMDB simply doesn't have the figure —
    // left undefined in that case so the card can omit the field entirely.
    budget: full.budget || undefined,
    revenue: full.revenue || undefined,
    genres: (full.genres ?? []).map(({ id, name }) => ({ id, name })),
    credits: {
      cast: (full.credits?.cast ?? []).slice(0, 5).map(({ name }) => ({ name })),
    },
  };

  if (item.type === 'tv') {
    trimmed.images = {
      backdrops: (full.images?.backdrops ?? []).map(({ file_path }) => ({
        file_path,
      })),
    };
    const season_key = `season/${item.season}`;
    const season = full[season_key];
    if (season) {
      trimmed[season_key] = {
        air_date: season.air_date,
        poster_path: season.poster_path,
        overview: season.overview,
        episodes: (season.episodes ?? []).map((ep) => ({
          still_path: ep.still_path,
          season_number: ep.season_number,
          episode_number: ep.episode_number,
          name: ep.name,
          overview: ep.overview,
          // Per-episode, so a partial season (epiStart..epiEnd) can be totalled
          // accurately rather than assumed from an average.
          runtime: ep.runtime,
        })),
      };
    }
  }

  return trimmed;
}

// Fresh when the data file exists and its recorded signature matches.
async function isFresh(signature) {
  try {
    await access(OUTPUT_PATH);
    const meta = JSON.parse(await readFile(META_PATH, 'utf8'));
    return meta.signature === signature;
  } catch {
    return false;
  }
}

async function main() {
  try {
    process.loadEnvFile(resolve(root, '.env'));
  } catch {
    // Fall back to whatever is already in the environment.
  }
  const media_list_raw = await readFile(MEDIA_LIST_PATH, 'utf8');

  // Freshness check: skip the network entirely when nothing that affects the
  // output has changed. The signature covers the media list (cards can change)
  // and this script (trim shape / URL can change). `--force` bypasses it.
  const signature = createHash('sha256')
    .update(media_list_raw)
    .update(await readFile(SCRIPT_PATH, 'utf8'))
    .digest('hex');

  if (!process.argv.includes('--force') && (await isFresh(signature))) {
    console.log('TMDB data is up to date with media-list — skipping fetch.');
    return;
  }

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    console.error('Missing TMDB_API_KEY (checked .env and process.env).');
    process.exit(1);
  }

  const media_list = JSON.parse(media_list_raw);

  // De-duplicate: cards sharing an id+season hit the same endpoint.
  const unique = new Map();
  for (const item of media_list) {
    const key = tmdbKey(item);
    if (!unique.has(key)) unique.set(key, item);
  }

  const entries = [...unique.entries()];
  const result = {};
  const failures = [];
  let done = 0;

  // Simple fixed-size worker pool over the queue of unique cards.
  let cursor = 0;
  async function worker() {
    while (cursor < entries.length) {
      const [key, item] = entries[cursor++];
      try {
        result[key] = trim(item, await fetchOne(item, apiKey));
      } catch (err) {
        failures.push({ key, message: err.message });
      }
      done++;
      process.stdout.write(`\rFetched ${done}/${entries.length}`);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, entries.length) }, worker)
  );
  process.stdout.write('\n');

  // Safety: don't clobber a good file with nothing if the network was down for
  // every request (e.g. offline). Partial success still writes.
  if (Object.keys(result).length === 0 && entries.length > 0) {
    console.error('\nAll fetches failed — leaving existing data untouched.');
    process.exit(1);
  }

  // Stable key order keeps the generated file diff-friendly.
  const ordered = Object.fromEntries(
    Object.keys(result)
      .sort()
      .map((k) => [k, result[k]])
  );
  await writeFile(OUTPUT_PATH, JSON.stringify(ordered) + '\n');
  // Record the signature so the next run can skip if nothing changed.
  await writeFile(
    META_PATH,
    JSON.stringify(
      {
        signature,
        generated: new Date().toISOString(),
        count: Object.keys(ordered).length,
      },
      null,
      2
    ) + '\n'
  );

  if (failures.length) {
    console.warn(`\n${failures.length} failed:`);
    for (const f of failures) console.warn(`  ${f.key}: ${f.message}`);
  }
  console.log(
    `Wrote ${Object.keys(ordered).length} entries to ${OUTPUT_PATH}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
