import patch_notes from '../assets/patch-notes.json';

// patch-notes.json is the one file a release always has to touch, so the newest
// entry is treated as the app's current version rather than duplicating the
// number elsewhere. "Newest" means last in the array, which is the same
// convention About.tsx uses when it reverses the list and flags index 0 as the
// current release.
export const APP_VERSION =
  patch_notes[patch_notes.length - 1]?.version ?? '0.0.0';
