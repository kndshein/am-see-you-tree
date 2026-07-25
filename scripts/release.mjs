// Cuts a release from patch-notes.json, which is the single place the version
// is authored. Reads the newest entry, syncs package.json to it, and creates a
// matching annotated git tag — so neither of those is ever hand-maintained and
// they can't drift from the notes.
//
// Does not push. Tags are hard to retract once shared, so that stays manual.

import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PATCH_NOTES_PATH = resolve(root, 'src/assets/patch-notes.json');
const PACKAGE_PATH = resolve(root, 'package.json');

const git = (...args) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();

function fail(message) {
  console.error(`\nrelease: ${message}\n`);
  process.exit(1);
}

// --- the version, straight from the newest patch note -----------------------

const notes = JSON.parse(await readFile(PATCH_NOTES_PATH, 'utf8'));
const latest = notes[notes.length - 1];

if (!latest?.version) {
  fail('the last entry in patch-notes.json has no "version" field');
}

const version = latest.version;
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  fail(`"${version}" is not an x.y.z version`);
}

const tag = `v${version}`;

// --- refuse to tag something that isn't what's committed ---------------------

// The tag points at HEAD, so uncommitted work would not be part of the release
// it claims to name. package.json is exempt because this script rewrites it.
const dirty = git('status', '--porcelain')
  .split('\n')
  .filter(Boolean)
  .filter((line) => !line.endsWith('package.json'));

if (dirty.length) {
  fail(
    `working tree has uncommitted changes:\n  ${dirty.join('\n  ')}\n` +
      'commit them before releasing',
  );
}

if (git('tag', '--list', tag)) {
  fail(`${tag} already exists — add a new patch-notes.json entry first`);
}

// --- sync package.json ------------------------------------------------------

// Targeted replace rather than a JSON round-trip, so the rest of the file keeps
// its exact formatting.
const pkg_raw = await readFile(PACKAGE_PATH, 'utf8');
const pkg_next = pkg_raw.replace(
  /("version"\s*:\s*")[^"]*(")/,
  `$1${version}$2`,
);

if (JSON.parse(pkg_next).version !== version) {
  fail('could not rewrite the version field in package.json');
}

const package_changed = pkg_next !== pkg_raw;
if (package_changed) {
  await writeFile(PACKAGE_PATH, pkg_next);
  // Path-scoped commit: never sweeps in anything else that happens to be staged.
  git('commit', PACKAGE_PATH, '-m', `Bump version to ${version}`);
  console.log(`  package.json  ${JSON.parse(pkg_raw).version} -> ${version}`);
} else {
  console.log(`  package.json  already at ${version}`);
}

// --- tag --------------------------------------------------------------------

const strip_html = (text) => text.replace(/<[^>]*>/g, '');
const message = [
  latest.date ? `${tag} — ${latest.date}` : tag,
  '',
  ...(latest.notes ?? []).map((note) => `- ${strip_html(note)}`),
].join('\n');

git('tag', '-a', tag, '-m', message);

console.log(`  tag           ${tag} created on ${git('rev-parse', '--short', 'HEAD')}`);
console.log(`\nPush it with:\n  git push && git push origin ${tag}\n`);
