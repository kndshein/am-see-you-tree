// Marvel Studios' own official numbered Phase structure — theatrical films,
// the Marvel One-Shot shorts bundled on home video, and Disney+ series only.
// Keyed the same way tmdb-data.json is (utils/media-lists.ts's tmdbKeyOf):
// plain id for movies/shorts/specials, `${id}__season${n}` for a TV season.
//
// Deliberately excludes the pre-Disney+ Marvel Television shows — Agents of
// S.H.I.E.L.D. (and its Slingshot tie-in), the Netflix/ABC/Hulu/Freeform
// corner (Daredevil, Jessica Jones, Luke Cage, Iron Fist, The Defenders, The
// Punisher, Cloak & Dagger, Runaways, Inhumans), and the original Agent
// Carter series. Marvel Studios has never counted those toward the numbered
// Phases, unlike the One-Shot shorts, which it does.
//
// A handful of entries in the watched list aren't included below because I
// don't have confident, verified phase placement for them (some are recent
// enough to sit right at or past my knowledge cutoff): Marvel Zombies, Eyes
// of Wakanda, Wonder Man, and The Punisher: One Last Kill. Fill these in (or
// correct anything else here) directly — treat this file as a starting
// point, not a verified source.

export type McuSaga = 'Infinity Saga' | 'Multiverse Saga';

export type McuPhase = {
  phase: number;
  saga: McuSaga;
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

export const mcu_phases: Record<string, McuPhase> = {
  // --- Phase 1 ---------------------------------------------------------
  '1726-iron-man': { phase: 1, saga: 'Infinity Saga' },
  '1724-the-incredible-hulk': { phase: 1, saga: 'Infinity Saga' },
  '10138-iron-man-2': { phase: 1, saga: 'Infinity Saga' },
  '76122-marvel-one-shot-the-consultant': { phase: 1, saga: 'Infinity Saga' },
  '10195-thor': { phase: 1, saga: 'Infinity Saga' },
  '76535-marvel-one-shot-a-funny-thing-happened-on-the-way-to-thor-s-hammer': {
    phase: 1,
    saga: 'Infinity Saga',
  },
  '1771-captain-america-the-first-avenger': {
    phase: 1,
    saga: 'Infinity Saga',
  },
  '24428-the-avengers': { phase: 1, saga: 'Infinity Saga' },
  '119569-marvel-one-shot-item-47': { phase: 1, saga: 'Infinity Saga' },

  // --- Phase 2 ---------------------------------------------------------
  '68721-iron-man-3': { phase: 2, saga: 'Infinity Saga' },
  '211387-marvel-one-shot-agent-carter': { phase: 2, saga: 'Infinity Saga' },
  '76338-thor-the-dark-world': { phase: 2, saga: 'Infinity Saga' },
  '100402-captain-america-the-winter-soldier': {
    phase: 2,
    saga: 'Infinity Saga',
  },
  '118340-guardians-of-the-galaxy': { phase: 2, saga: 'Infinity Saga' },
  '253980-marvel-one-shot-all-hail-the-king': {
    phase: 2,
    saga: 'Infinity Saga',
  },
  '99861-avengers-age-of-ultron': { phase: 2, saga: 'Infinity Saga' },
  '102899-ant-man': { phase: 2, saga: 'Infinity Saga' },

  // --- Phase 3 ---------------------------------------------------------
  '271110-captain-america-civil-war': { phase: 3, saga: 'Infinity Saga' },
  '284052-doctor-strange': { phase: 3, saga: 'Infinity Saga' },
  '283995-guardians-of-the-galaxy-2': { phase: 3, saga: 'Infinity Saga' },
  '413279-team-thor': { phase: 3, saga: 'Infinity Saga' },
  '315635-spider-man-homecoming': { phase: 3, saga: 'Infinity Saga' },
  '441829-team-thor-part-2': { phase: 3, saga: 'Infinity Saga' },
  '284053-thor-ragnarok': { phase: 3, saga: 'Infinity Saga' },
  '284054-black-panther': { phase: 3, saga: 'Infinity Saga' },
  '299536-avengers-infinity-war': { phase: 3, saga: 'Infinity Saga' },
  '363088-ant-man-and-the-wasp': { phase: 3, saga: 'Infinity Saga' },
  '505945-team-darryl': { phase: 3, saga: 'Infinity Saga' },
  '299537-captain-marvel': { phase: 3, saga: 'Infinity Saga' },
  '299534-avengers-endgame': { phase: 3, saga: 'Infinity Saga' },
  '429617-spider-man-far-from-home': { phase: 3, saga: 'Infinity Saga' },

  // --- Phase 4 ---------------------------------------------------------
  '497698-black-widow': { phase: 4, saga: 'Multiverse Saga' },
  '85271-wandavision__season1': { phase: 4, saga: 'Multiverse Saga' },
  '88396-falcon-winter-soldier__season1': {
    phase: 4,
    saga: 'Multiverse Saga',
  },
  '84958-loki__season1': { phase: 4, saga: 'Multiverse Saga' },
  '91363-what-if__season1': { phase: 4, saga: 'Multiverse Saga' },
  '566525-shang-chi-and-the-legend-of-the-ten-rings': {
    phase: 4,
    saga: 'Multiverse Saga',
  },
  '524434-eternals': { phase: 4, saga: 'Multiverse Saga' },
  '88329-hawkeye__season1': { phase: 4, saga: 'Multiverse Saga' },
  '634649-spider-man-no-way-home': { phase: 4, saga: 'Multiverse Saga' },
  '92749-moon-knight__season1': { phase: 4, saga: 'Multiverse Saga' },
  '453395-doctor-strange-in-the-multiverse-of-madness': {
    phase: 4,
    saga: 'Multiverse Saga',
  },
  '92782-ms-marvel__season1': { phase: 4, saga: 'Multiverse Saga' },
  '616037-thor-love-and-thunder': { phase: 4, saga: 'Multiverse Saga' },
  '232125-i-am-groot__season1': { phase: 4, saga: 'Multiverse Saga' },
  '92783-she-hulk-attorney-at-law__season1': {
    phase: 4,
    saga: 'Multiverse Saga',
  },
  '894205-werewolf-by-night': { phase: 4, saga: 'Multiverse Saga' },
  '505642-black-panther-wakanda-forever': {
    phase: 4,
    saga: 'Multiverse Saga',
  },
  '774752-the-guardians-of-the-galaxy-holiday-special': {
    phase: 4,
    saga: 'Multiverse Saga',
  },

  // --- Phase 5 ---------------------------------------------------------
  '640146-ant-man-and-the-wasp-quantumania': {
    phase: 5,
    saga: 'Multiverse Saga',
  },
  '114472-secret-invasion__season1': { phase: 5, saga: 'Multiverse Saga' },
  '232125-i-am-groot__season2': { phase: 5, saga: 'Multiverse Saga' },
  '447365-guardians-of-the-galaxy-volume-3': {
    phase: 5,
    saga: 'Multiverse Saga',
  },
  '122226-echo__season1': { phase: 5, saga: 'Multiverse Saga' },
  '84958-loki__season2': { phase: 5, saga: 'Multiverse Saga' },
  '609681-the-marvels': { phase: 5, saga: 'Multiverse Saga' },
  '91363-what-if__season2': { phase: 5, saga: 'Multiverse Saga' },
  '138501-agatha-all-along__season1': { phase: 5, saga: 'Multiverse Saga' },
  '91363-what-if__season3': { phase: 5, saga: 'Multiverse Saga' },
  '533535-deadpool-wolverine': { phase: 5, saga: 'Multiverse Saga' },
  '822119-captain-america-brave-new-world': {
    phase: 5,
    saga: 'Multiverse Saga',
  },
  '202555-daredevil-born-again__season1': {
    phase: 5,
    saga: 'Multiverse Saga',
  },
  '202555-daredevil-born-again__season2': {
    phase: 5,
    saga: 'Multiverse Saga',
  },
  '986056-thunderbolts': { phase: 5, saga: 'Multiverse Saga' },
  '114471-ironheart__season1': { phase: 5, saga: 'Multiverse Saga' },

  // --- Phase 6 ---------------------------------------------------------
  '617126-the-fantastic-4-first-steps': { phase: 6, saga: 'Multiverse Saga' },
};
