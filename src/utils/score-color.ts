// Percent -> hue (degrees) stops, one curve per rating source. The four
// sources don't cluster around the same numbers for an equivalently-received
// title — Metacritic runs notoriously lower than Rotten Tomatoes or TMDB for
// the same film, and IMDb rarely leaves the 40-90 band at all — so a single
// shared curve (this file's old behavior) made Metacritic read as
// permanently reddish and IMDb as permanently green regardless of whether a
// given title actually over- or under-performed for that source. Each curve
// spends most of its hue range right around that source's own "this is
// where a title tips from disliked to liked" line, so a green MC score and a
// green RT score both genuinely mean "this one did well on its own site."
export type RatingSource = 'tmdb' | 'rt' | 'metacritic' | 'imdb';

const HUE_STOPS: Record<RatingSource, Array<[percent: number, hue: number]>> = {
  // TMDB's own vote_average — the original curve, most real-world titles
  // cluster in the 60-80% band.
  tmdb: [
    [0, 0],
    [50, 5],
    [60, 20],
    [65, 35],
    [70, 50],
    [75, 65],
    [80, 90],
    [85, 110],
    [100, 130],
  ],
  // Rotten Tomatoes' own Tomatometer already draws a hard fresh/rotten line
  // at 60% — the curve bends green right there instead of the higher 70%
  // TMDB uses, and stretches most of its differentiation across 60-90%
  // (Certified Fresh territory) since RT critic scores skew more polarized
  // than TMDB's user-average.
  rt: [
    [0, 0],
    [40, 0],
    [50, 5],
    [60, 25],
    [70, 55],
    [80, 85],
    [90, 110],
    [100, 130],
  ],
  // Metacritic's own site uses three flat bands (red 0-39, yellow 40-60,
  // green 61-100) with no gradient — the stops below are those same three
  // colors, at the centre of each official band (20/50/80), just genuinely
  // blended between them instead of snapping at the 39/40 and 60/61
  // boundaries. 100 still climbs past the green stop toward this curve's
  // own most saturated green, matching every other source here ending on its
  // most vivid tier rather than plateauing at "barely good."
  metacritic: [
    [0, 0],
    [50, 50],
    [80, 110],
    [100, 130],
  ],
  // IMDb has no official color coding, but its ratings rarely leave a 4-9
  // (40-90%) band at all — a bomb still often lands ~5 from bimodal
  // voting, and even acclaimed titles rarely clear 9. Most of the
  // differentiation sits in 50-80%, where "mediocre" actually tips to "good."
  imdb: [
    [0, 0],
    [40, 5],
    [50, 20],
    [60, 40],
    [70, 70],
    [80, 100],
    [90, 120],
    [100, 130],
  ],
};

export default function scoreColor(
  percent: number,
  source: RatingSource = 'tmdb',
): string {
  const clamped = Math.max(0, Math.min(100, percent));
  const stops = HUE_STOPS[source];

  for (let i = 0; i < stops.length - 1; i++) {
    const [p0, h0] = stops[i];
    const [p1, h1] = stops[i + 1];
    if (clamped <= p1) {
      const t = (clamped - p0) / (p1 - p0);
      return `hsl(${h0 + (h1 - h0) * t}, 90%, 55%)`;
    }
  }

  const [, last_hue] = stops[stops.length - 1];
  return `hsl(${last_hue}, 90%, 55%)`;
}
