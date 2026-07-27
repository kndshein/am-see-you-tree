// Marvel Studios' own official numbered Phase structure. Which phase a given
// title belongs to now lives directly on its own media-list.json entry
// (`phase: N`) rather than in a per-entry dictionary here — a phase fully
// determines its saga, so keeping {phase, saga} pairs for every single title
// (as this file used to) just repeated the same saga value dozens of times
// over. This file now only owns the one fact a phase number alone can't
// carry: which saga it belongs to.
//
// Marvel Studios has never counted the pre-Disney+ Marvel Television shows —
// Agents of S.H.I.E.L.D. (and its Slingshot tie-in), the Netflix/ABC/Hulu/
// Freeform corner (Daredevil, Jessica Jones, Luke Cage, Iron Fist, The
// Defenders, The Punisher, Cloak & Dagger, Runaways, Inhumans), or the
// original Agent Carter series — toward the numbered Phases, unlike the
// Marvel One-Shot shorts, which it does. None of those carry a `phase` in
// media-list.json for that reason.
//
// A handful of entries in the watched list don't carry a `phase` yet because
// there's no confident, verified placement for them (some are recent enough
// to sit right at or past this project's own knowledge cutoff): Marvel
// Zombies, Eyes of Wakanda, Wonder Man, and The Punisher: One Last Kill.
// Fill these in (or correct anything else here) directly in media-list.json
// — treat this as a starting point, not a verified source.

export type McuSaga = 'Infinity Saga' | 'Multiverse Saga';

export type McuPhase = {
  phase: number;
  saga: McuSaga;
};

// The one place phase-to-saga is actually decided — everything else derives
// from this instead of repeating it.
export const PHASE_SAGA: Record<number, McuSaga> = {
  1: 'Infinity Saga',
  2: 'Infinity Saga',
  3: 'Infinity Saga',
  4: 'Multiverse Saga',
  5: 'Multiverse Saga',
  6: 'Multiverse Saga',
};

// CSS class slugs for each saga's own gradient (Phase.module.scss's pill
// border, Record.module.scss's gradient text) — shared here rather than
// defined separately in each consuming component, so a new saga added above
// without a matching entry here fails to find a class (falls back to no
// gradient) instead of two components guessing at a slug that may not exist.
export const SAGA_CLASS: Record<McuSaga, string> = {
  'Infinity Saga': 'infinity_saga',
  'Multiverse Saga': 'multiverse_saga',
};

// Hyphenated display form ("Infinity-Saga") for the compact badge/record-strip
// contexts that show it — the McuSaga type itself keeps the plain spaced
// string, since that's the more natural form for anything that isn't this
// specific display treatment.
export function sagaDisplayName(saga: McuSaga): string {
  return saga.replace(' ', '-');
}
