import { motionValue } from 'motion/react';

// The rail writes these from its animation frame; the HUD reads them. They are
// MotionValues rather than React state precisely because they change every
// frame during a scroll — routing that through state would re-render the whole
// app 60 times a second, where this re-renders nothing at all.
//
// A shared module rather than context because the two live on opposite sides of
// the tree: the rail is inside MediaListWrapper, the HUD is its sibling.

export const scroll_progress = motionValue(0); // 0 at the left end, 1 at the right
export const focused_position = motionValue(0); // 1-based card nearest the centre
export const card_count = motionValue(0);

export const is_locked = motionValue(false); // a card is expanded

// A scroll arrow is being held down at all (MediaListWrapper.tsx), from the
// moment of press — read by App.tsx so the progress bar's own fill can pick
// up the same orange the arrow itself charges toward.
export const is_charging = motionValue(false);

// Same hold, but only from the moment it's actually crossed the
// hold-to-jump threshold and armed (MediaListWrapper.tsx's
// HOLD_TO_EDGE_MS) — read by Hud.tsx so the rails/corner reticles only flip
// to their own alert color once the hold has actually turned orange, not
// from the first moment of the press.
export const is_armed = motionValue(false);

// 0 to 1 across the same hold (MediaListWrapper.tsx's HOLD_TO_EDGE_MS),
// written every frame via requestAnimationFrame rather than derived from
// is_charging's own on/off — MediaListWrapper.tsx's own linear_blur needs
// the actual in-between progress, not just whether a hold is happening at
// all, so it can ramp in smoothly rather than snapping to full blur the
// instant a hold starts. Reset to 0 on release/cancel.
export const charge_progress = motionValue(0);

// Incremented (not toggled) each time a held arrow actually completes its
// jump-to-edge (MediaListWrapper.tsx's releaseHold) — a counter rather than
// a boolean so consecutive slingshots each produce their own 'change' event,
// even back-to-back, instead of a same-value set being silently ignored.
// Read by Hud.tsx to replay its full_sweep on the same beat.
export const sling_fired = motionValue(0);
