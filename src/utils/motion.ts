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
    transition: { duration: 0.35, ease: 'easeOut' },
  },
  hidden: {
    opacity: 0,
    y: -14,
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
