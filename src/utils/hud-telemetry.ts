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
