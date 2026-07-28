// Build-time prefetch of OMDb data (Rotten Tomatoes/Metacritic scores, IMDb's
// own rating) — same idea as prefetch-tmdb.mjs, but this one
// depends on ITS output: it reads the imdb_id TMDB already resolved per
// entry (src/assets/tmdb-data.json) rather than media-list.json directly, so
// it must run after prefetch-tmdb.mjs. Keyed by imdb_id, not the app's own
// id/id__seasonN key — a show's several season-cards share one series-level
// IMDb entry, so there's no reason to fetch it more than once.
//
// Run with: npm run prefetch (chained after prefetch-tmdb.mjs already)

import { readFile, writeFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { fetchWithRetry } from './fetch-retry.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const TMDB_DATA_PATH = resolve(root, 'src/assets/tmdb-data.json');
const OUTPUT_PATH = resolve(root, 'src/assets/omdb-data.json');
const META_PATH = resolve(root, 'src/assets/omdb-data.meta.json');
const SCRIPT_PATH = fileURLToPath(import.meta.url);

// OMDb's free tier is a 1,000/day cap, well above the handful of unique
// imdb_ids this catalogue has — a gentler ceiling than TMDB's own script
// still keeps a run polite to it.
const CONCURRENCY = 4;

function parseNumber(value) {
  if (!value || value === 'N/A') return undefined;
  const n = Number(String(value).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

// Keep only what the app actually renders — the full response also carries
// Title/Plot/Director/Poster/etc., all of which TMDB already supplies.
function trim(full) {
  const ratings = full.Ratings ?? [];
  const rotten_tomatoes = ratings.find((r) => r.Source === 'Rotten Tomatoes');
  const trimmed = {
    rotten_tomatoes: rotten_tomatoes
      ? parseNumber(rotten_tomatoes.Value)
      : undefined,
    metascore: parseNumber(full.Metascore),
    imdb_rating: parseNumber(full.imdbRating),
    imdb_votes: parseNumber(full.imdbVotes),
  };
  // Drop the record entirely rather than storing an all-undefined one — same
  // reasoning prefetch-tmdb.mjs's budget/revenue fields use.
  const has_any_field = Object.values(trimmed).some((v) => v !== undefined);
  return has_any_field ? trimmed : undefined;
}

async function fetchOne(imdb_id, apiKey) {
  const res = await fetchWithRetry(
    `https://www.omdbapi.com/?i=${imdb_id}&apikey=${apiKey}`,
  );
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} for ${imdb_id}`);
  }
  const data = await res.json();
  if (data.Response === 'False') {
    // A genuinely missing title (common for shorts/specials OMDb has never
    // catalogued) is not a failure — anything else (a bad key, the daily
    // cap) is, and should crash the run loudly rather than silently write an
    // empty file.
    if (data.Error === 'Movie not found!' || data.Error === 'Incorrect IMDb ID.') {
      return null;
    }
    throw new Error(`OMDb error for ${imdb_id}: ${data.Error}`);
  }
  return data;
}

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

  const tmdb_data_raw = await readFile(TMDB_DATA_PATH, 'utf8');
  const tmdb_data = JSON.parse(tmdb_data_raw);

  const signature = createHash('sha256')
    .update(tmdb_data_raw)
    .update(await readFile(SCRIPT_PATH, 'utf8'))
    .digest('hex');

  if (!process.argv.includes('--force') && (await isFresh(signature))) {
    console.log('OMDb data is up to date with TMDB data — skipping fetch.');
    return;
  }

  const apiKey = process.env.OMDB_API_KEY;
  if (!apiKey) {
    console.error('Missing OMDB_API_KEY (checked .env and process.env).');
    process.exit(1);
  }

  const imdb_ids = [
    ...new Set(
      Object.values(tmdb_data)
        .map((entry) => entry.imdb_id)
        .filter(Boolean),
    ),
  ].sort();

  const result = {};
  let done = 0;
  let missed = 0;

  let cursor = 0;
  async function worker() {
    while (cursor < imdb_ids.length) {
      const imdb_id = imdb_ids[cursor++];
      const full = await fetchOne(imdb_id, apiKey);
      if (full) {
        const trimmed = trim(full);
        if (trimmed) result[imdb_id] = trimmed;
        else missed++;
      } else {
        missed++;
      }
      done++;
      process.stdout.write(`\rFetched ${done}/${imdb_ids.length}`);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, imdb_ids.length) }, worker),
  );
  process.stdout.write('\n');

  const ordered = Object.fromEntries(
    Object.keys(result)
      .sort()
      .map((k) => [k, result[k]]),
  );
  await writeFile(OUTPUT_PATH, JSON.stringify(ordered) + '\n');
  await writeFile(
    META_PATH,
    JSON.stringify(
      {
        signature,
        generated: new Date().toISOString(),
        count: Object.keys(ordered).length,
      },
      null,
      2,
    ) + '\n',
  );

  console.log(
    `Wrote ${Object.keys(ordered).length} entries to ${OUTPUT_PATH} ` +
      `(${missed} of ${imdb_ids.length} had no usable OMDb data)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
