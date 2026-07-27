// Shared entry animation for anything inside an expanded card. Defined once so
// the fields, the tagline, the genre rows and the record strip all move with the
// same weight instead of each hand-rolling a duration.
//
// Eased over 0.3s rather than snapping: a linear 0.1s slide reads as a jump at
// this distance. Collapsing is instant — the card is closing, so there's nothing
// to watch it play out against.
export const entry = {
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
  hidden: {
    opacity: 0,
    x: -100,
    transition: { duration: 0 },
  },
} as const;

// For long lists. Same easing, but a short drop: at 19 rows a full -100px each
// reads as thrashing rather than a cascade.
export const entry_soft = {
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
  hidden: {
    opacity: 0,
    y: -14,
    transition: { duration: 0 },
  },
} as const;

// Opacity only — for wrappers whose own children already carry the visible
// motion (e.g. Episodes' rows, each using entry_soft), so the direction isn't
// fought by a second, differently-angled slide on the wrapper itself.
export const fade = {
  visible: {
    opacity: 1,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
  hidden: {
    opacity: 0,
    transition: { duration: 0 },
  },
} as const;

// Same timing, for the things that enter vertically instead.
export const entry_vertical = {
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
  hidden: {
    opacity: 0,
    y: -100,
    transition: { duration: 0 },
  },
} as const;

// The expanded card's own orchestration (Media.tsx): each column enters a beat
// after the last. Shared so anything that has to start on the same beat as the
// block it lives in can derive its delay instead of guessing a literal.
export const CARD_DELAY_CHILDREN = 0.3;
export const CARD_STAGGER = 0.3;

// The expanded card's boxShadow "glow" (MediaWrapper.tsx). Defined here rather
// than inline at that one call site because several reveals below are timed to
// land in lockstep with it — as separate literals they would silently drift
// apart the first time the glow itself was retuned.
export const GLOW_DELAY = 2.5;
export const GLOW_DURATION = 0.8;

// Shared by every "grey/muted until the card's glow lands" reveal — the genre
// rows, the poster's grayscale-to-color, and the collection panel's
// grey-to-white titles and bracket pop. Derived from the glow rather than
// re-stated, so they stay in lockstep by construction; COLOR_STAGGER stacks on
// top of the shared delay so a list of them still cascades top-to-bottom.
export const COLOR_REVEAL_DELAY = GLOW_DELAY;
export const REVEAL_DURATION = GLOW_DURATION;
export const COLOR_STAGGER = 0.1;

// Overview.tsx's own per-word cadence: 0.015 between words, each taking
// 0.1s to fade/lift in. Shared here so Ambient's echo can't drift from it.
export const WORD_STAGGER = 0.015;
export const WORD_DURATION = 0.1;
