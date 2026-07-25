// Prepares the card backdrops: crops them to the shape the app actually paints,
// re-encodes as WebP, and emits two variants per image.
//
// Two problems this solves at once:
//
//   1. The grade used to be a CSS `filter` chain running over a 1000px x 100vh
//      surface, once per card. Baking it removes that work entirely.
//   2. TMDB's w1280 is 1280x720, but the image is painted into a box roughly
//      1000px wide and a full viewport tall. `object-fit: cover` therefore
//      scales it by *height*, enlarging it ~1.25x. Cropping from `original`
//      (1920x1080 or 3840x2160) means every pixel shipped is one that gets used.
//
// The `plain` variant exists because a baked grade can't be undone in CSS, and
// the card reveals its true color on hover. It is only requested once a card
// has actually been hovered (see Backdrop.tsx), so it costs nothing otherwise.
//
// Run after prefetch-tmdb.mjs — it reads the data that script writes.
//
//   --force   re-process images that already have output

import sharp from 'sharp';
import { readFile, writeFile, mkdir, readdir, rm, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MEDIA_LIST_PATH = resolve(root, 'src/assets/media-list.json');
const TMDB_DATA_PATH = resolve(root, 'src/assets/tmdb-data.json');
const OUT_DIR = resolve(root, 'public/backdrops');
const MANIFEST_PATH = resolve(root, 'src/assets/backdrops.json');

// Matches the painted box: 1000px wide, and tall enough that a 1080p display
// never enlarges it. Sources below this are left at their own size.
const TARGET_WIDTH = 1000;
const TARGET_HEIGHT = 1080;
const WEBP_QUALITY = 80;

// The expanded card shows a heavily blurred backdrop behind its readouts. Baked
// rather than done with a CSS `filter`, which re-runs a convolution over the
// whole surface. Generated small on purpose: blur destroys the detail that
// costs bytes, and it is displayed at 2x where nothing is left to sharpen.
const BLUR_WIDTH = 500;
const BLUR_HEIGHT = 540;
// Half the CSS radius, since it is upscaled 2x on the way to the screen.
const BLUR_SIGMA = 10;

const force = process.argv.includes('--force');

// --- the grade, ported from CSS ---------------------------------------------

// `brightness(0.69) sepia(100%) hue-rotate(165deg)`, composed into one 3x3 so
// sharp can apply it in a single pass. Keep these in step with the design: this
// is now the only place the grade exists.
const BRIGHTNESS = 0.69;
const HUE_ROTATE_DEG = 165;

const SEPIA = [
  [0.393, 0.769, 0.189],
  [0.349, 0.686, 0.168],
  [0.272, 0.534, 0.131],
];

// Straight from the Filter Effects spec's hueRotate definition.
function hueRotateMatrix(degrees) {
  const a = (degrees * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [
    [
      0.213 + c * 0.787 - s * 0.213,
      0.715 - c * 0.715 - s * 0.715,
      0.072 - c * 0.072 + s * 0.928,
    ],
    [
      0.213 - c * 0.213 + s * 0.143,
      0.715 + c * 0.285 + s * 0.14,
      0.072 - c * 0.072 - s * 0.283,
    ],
    [
      0.213 - c * 0.213 - s * 0.787,
      0.715 - c * 0.715 + s * 0.715,
      0.072 + c * 0.928 + s * 0.072,
    ],
  ];
}

const multiply = (a, b) =>
  a.map((row) =>
    b[0].map((_, col) => row.reduce((sum, v, i) => sum + v * b[i][col], 0)),
  );

const IDENTITY = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

// Filters apply left to right, so the later one wraps the earlier: hue-rotate
// of (sepia of the source). Brightness is folded in separately below.
const TONE = multiply(hueRotateMatrix(HUE_ROTATE_DEG), SEPIA);

// `strength` blends between the untouched image and the full duotone, so a
// variant can keep some of the original color. Darkening is applied either way.
const gradeMatrix = (strength) =>
  TONE.map((row, i) =>
    row.map(
      (value, j) =>
        (IDENTITY[i][j] * (1 - strength) + value * strength) * BRIGHTNESS,
    ),
  );

const GRADE = gradeMatrix(1);

// The blurred variant sits at low opacity behind the readouts, where a full
// duotone reads as flat grey. Half strength keeps a hint of the real palette
// while still darkening enough for text to sit on.
const BLUR_GRADE_STRENGTH = 0.5;
const BLUR_GRADE = gradeMatrix(BLUR_GRADE_STRENGTH);

// --- which images the cards actually use ------------------------------------

// Mirrors Backdrop.tsx: shows are keyed to a per-season alternate when one
// exists, and anything without a backdrop falls back to its poster.
function backdropPathFor(item, data) {
  if (!data) return null;
  if (!data.backdrop_path) return data.poster_path ?? null;
  if (item.type !== 'tv') return data.backdrop_path;
  const alternate = data.images?.backdrops?.[item.season - 1];
  return alternate ? alternate.file_path : data.backdrop_path;
}

const tmdbKeyOf = (item) =>
  item.type === 'tv' ? `${item.id}__season${item.season}` : item.id;

const baseNameFor = (tmdb_path) =>
  tmdb_path.replace(/^\//, '').replace(/\.[^.]+$/, '');

const exists = (path) =>
  access(path).then(
    () => true,
    () => false,
  );

// --- run --------------------------------------------------------------------

const media_list = JSON.parse(await readFile(MEDIA_LIST_PATH, 'utf8'));
const tmdb_data = JSON.parse(await readFile(TMDB_DATA_PATH, 'utf8'));

const wanted = new Set();
for (const item of media_list) {
  const path = backdropPathFor(item, tmdb_data[tmdbKeyOf(item)]);
  if (path) wanted.add(path);
}

await mkdir(OUT_DIR, { recursive: true });

const manifest = {};
const expected_files = new Set();
let processed = 0;
let skipped = 0;
let bytes_in = 0;
let bytes_out = 0;

for (const tmdb_path of wanted) {
  const base = baseNameFor(tmdb_path);
  const variants = {
    graded: { file: `${base}.webp`, recomb: GRADE },
    plain: { file: `${base}.plain.webp`, recomb: null },
    blurred: {
      file: `${base}.blur.webp`,
      recomb: BLUR_GRADE,
      width: BLUR_WIDTH,
      height: BLUR_HEIGHT,
      blur: BLUR_SIGMA,
    },
  };

  for (const { file } of Object.values(variants)) expected_files.add(file);
  manifest[tmdb_path] = Object.fromEntries(
    Object.entries(variants).map(([name, { file }]) => [
      name,
      `/backdrops/${file}`,
    ]),
  );

  const paths = Object.values(variants).map((v) => resolve(OUT_DIR, v.file));
  const present = await Promise.all(paths.map(exists));

  // Output is keyed by the source path, and TMDB filenames are per-upload — so
  // an existing file is by definition still correct for that source.
  if (!force && present.every(Boolean)) {
    skipped++;
    continue;
  }

  const response = await fetch(`https://image.tmdb.org/t/p/original${tmdb_path}`);
  if (!response.ok) {
    console.error(`  skip ${tmdb_path}: HTTP ${response.status}`);
    // Only disown it when there is nothing on disk to keep. Under --force the
    // files may already be present and perfectly good — dropping them from the
    // manifest here would have the prune step delete them over a transient 404.
    if (!present.some(Boolean)) {
      delete manifest[tmdb_path];
      for (const { file } of Object.values(variants)) {
        expected_files.delete(file);
      }
    }
    continue;
  }

  const source = Buffer.from(await response.arrayBuffer());
  bytes_in += source.length;

  for (const { file, recomb, width, height, blur } of Object.values(variants)) {
    let pipeline = sharp(source).resize(
      width ?? TARGET_WIDTH,
      height ?? TARGET_HEIGHT,
      {
        fit: 'cover',
        position: 'centre', // matches the default object-position
        withoutEnlargement: true,
      },
    );
    if (recomb) pipeline = pipeline.recomb(recomb);
    if (blur) pipeline = pipeline.blur(blur);

    const output = await pipeline.webp({ quality: WEBP_QUALITY }).toBuffer();
    await writeFile(resolve(OUT_DIR, file), output);
    bytes_out += output.length;
  }

  processed++;
  process.stdout.write(`\rProcessed ${processed}`);
}

await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);

// Anything left over is from a backdrop TMDB has since replaced. Without this
// they accumulate forever — and this directory is committed, so they would
// accumulate in history too.
let pruned = 0;
for (const file of await readdir(OUT_DIR)) {
  if (expected_files.has(file)) continue;
  await rm(resolve(OUT_DIR, file));
  pruned++;
}

const kb = (n) => `${Math.round(n / 1024)} kB`;
console.log(`\n${processed} processed, ${skipped} already present`);
if (processed) {
  console.log(
    `  source ${kb(bytes_in)} -> output ${kb(bytes_out)} ` +
      `(avg ${kb(bytes_out / processed)} per image, all variants)`,
  );
}
if (pruned) console.log(`  pruned ${pruned} orphaned file(s)`);
console.log(`  manifest: ${Object.keys(manifest).length} entries`);
