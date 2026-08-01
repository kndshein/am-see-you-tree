import { motion } from 'motion/react';
import styles from './SpiderWebCorners.module.scss';

// Local coordinate space every web is authored in, corner anchored at
// (0, 0) with spokes fanning into the positive-x/positive-y quadrant — each
// of the four screen corners just mirrors this same quadrant into place via
// CSS (see .top_right/.bottom_left/.bottom_right below), independently of
// whichever random web that quadrant happens to hold.
const SIZE = 100;

// Deterministic per-corner PRNG, not Math.random(): a real spider's web
// looks irregular, but it doesn't reshuffle itself on every re-render — the
// same seed (see WEB_CONFIGS below) always produces the same tangle, so the
// corners it's mounted in stay stable across opens/closes.
function hashSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h;
}

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

// Point on a quadratic bezier at t — used to scatter sticky glue droplets
// along the same curve the ring segment itself already sags on, so beads
// sit ON the silk rather than floating near it.
function qpoint(p0: Vec, c: Vec, p1: Vec, t: number): Vec {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * c.x + t * t * p1.x,
    y: mt * mt * p0.y + 2 * mt * t * c.y + t * t * p1.y,
  };
}

type Vec = { x: number; y: number };
type StrandPath = { d: string; width: number; opacity: number };
type Glint = { cx: number; cy: number; r: number; opacity: number };

type CornerClass = 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right';

type WebConfig = {
  seed: string;
  corner: CornerClass;
  // How many radial threads besides the two straight frame threads that run
  // along the corner's own two walls (the almost-always-intact ones real
  // corner webs anchor on).
  spokeCount: number;
  ringCount: number;
  // Degrees an interior spoke's angle can drift from its evenly-spaced
  // baseline — the thing that mainly keeps this from reading as a clip-art
  // radial icon.
  angleJitter: number;
  // Chance any given interior spoke snaps short, and independently, that
  // any given ring segment goes missing — an intact, unbroken web reads as
  // fake in a corner nobody's dusted.
  tornChance: number;
  strayCount: number;
  sizeScale: number;
  // How far this web's own anchor sits from the true screen corner, as a
  // percentage of its own (already viewport-safe, see $corner-max in the
  // .scss) box — 0 for the corner's main web, >0 for a smaller second web
  // drifted along one wall, the way a neglected corner accumulates more
  // than one web over time rather than just one. A percentage rather than
  // raw px so the drift shrinks along with the box on a narrow window
  // instead of overshooting a budget that's already gotten smaller.
  insetX: number;
  insetY: number;
  // Opacity multiplier — secondary webs read as older/wispier, not just
  // smaller duplicates of the main one.
  fade: number;
};

const WEB_CONFIGS: WebConfig[] = [
  {
    seed: 'attic-tl',
    corner: 'top_left',
    spokeCount: 9,
    ringCount: 3,
    angleJitter: 9,
    tornChance: 0.08,
    strayCount: 1,
    sizeScale: 1,
    insetX: 0,
    insetY: 0,
    fade: 1,
  },
  {
    seed: 'attic-tl-b',
    corner: 'top_left',
    spokeCount: 5,
    ringCount: 2,
    angleJitter: 14,
    tornChance: 0.3,
    strayCount: 1,
    sizeScale: 0.5,
    insetX: 41,
    insetY: 11,
    fade: 0.6,
  },
  {
    seed: 'drafty-tr',
    corner: 'top_right',
    spokeCount: 6,
    ringCount: 2,
    angleJitter: 17,
    tornChance: 0.34,
    strayCount: 2,
    sizeScale: 0.82,
    insetX: 0,
    insetY: 0,
    fade: 1,
  },
  {
    seed: 'drafty-tr-b',
    corner: 'top_right',
    spokeCount: 6,
    ringCount: 2,
    angleJitter: 12,
    tornChance: 0.16,
    strayCount: 1,
    sizeScale: 0.56,
    insetX: 9,
    insetY: 39,
    fade: 0.55,
  },
  {
    seed: 'windblown-bl',
    corner: 'bottom_left',
    spokeCount: 8,
    ringCount: 3,
    angleJitter: 21,
    tornChance: 0.2,
    strayCount: 2,
    sizeScale: 0.92,
    insetX: 0,
    insetY: 0,
    fade: 1,
  },
  {
    seed: 'windblown-bl-b',
    corner: 'bottom_left',
    spokeCount: 5,
    ringCount: 2,
    angleJitter: 18,
    tornChance: 0.28,
    strayCount: 1,
    sizeScale: 0.46,
    insetX: 26,
    insetY: 20,
    fade: 0.5,
  },
  {
    seed: 'fresh-br',
    corner: 'bottom_right',
    spokeCount: 7,
    ringCount: 2,
    angleJitter: 6,
    tornChance: 0.05,
    strayCount: 0,
    sizeScale: 1,
    insetX: 0,
    insetY: 0,
    fade: 1,
  },
  {
    seed: 'fresh-br-b',
    corner: 'bottom_right',
    spokeCount: 6,
    ringCount: 2,
    angleJitter: 16,
    tornChance: 0.22,
    strayCount: 1,
    sizeScale: 0.5,
    insetX: 35,
    insetY: 8,
    fade: 0.55,
  },
];

type Spoke = { dir: Vec; reach: number; maxReach: number };

function buildWeb(config: WebConfig) {
  const rng = mulberry32(hashSeed(config.seed));

  const angles: number[] = [0];
  for (let i = 1; i < config.spokeCount - 1; i++) {
    const base = (i / (config.spokeCount - 1)) * 90;
    angles.push(clamp(base + (rng() - 0.5) * config.angleJitter, 2, 88));
  }
  angles.push(90);
  angles.sort((a, b) => a - b);

  const spokes: Spoke[] = angles.map((angle, idx) => {
    const isAnchor = idx === 0 || idx === angles.length - 1;
    const rad = (angle * Math.PI) / 180;
    const dir = { x: Math.cos(rad), y: Math.sin(rad) };
    const maxReach = SIZE / Math.max(dir.x, dir.y);
    let reachFrac = isAnchor ? 0.92 + rng() * 0.08 : 0.62 + rng() * 0.32;
    if (!isAnchor && rng() < config.tornChance) {
      reachFrac *= 0.32 + rng() * 0.35;
    }
    return { dir, reach: maxReach * reachFrac, maxReach };
  });

  const spokePaths: StrandPath[] = spokes.map((s, idx) => {
    const isAnchor = idx === 0 || idx === spokes.length - 1;
    return {
      d: `M0 0 L ${(s.dir.x * s.reach).toFixed(2)} ${(s.dir.y * s.reach).toFixed(2)}`,
      width: isAnchor ? 0.75 : 0.36 + rng() * 0.22,
      opacity: isAnchor ? 0.8 + rng() * 0.2 : 0.45 + rng() * 0.4,
    };
  });

  type RingSegment = { pa: Vec; control: Vec; pb: Vec; width: number; opacity: number };
  const ringSegments: RingSegment[] = [];
  const baseFractions = [0.28, 0.52, 0.78].slice(0, config.ringCount);
  const fractions = baseFractions
    .map((f) => clamp(f + (rng() - 0.5) * 0.14, 0.12, 0.95))
    .sort((a, b) => a - b);

  for (const f of fractions) {
    for (let i = 1; i < spokes.length; i++) {
      if (rng() < config.tornChance * 0.5) continue; // a gap in the spiral
      const a = spokes[i - 1];
      const b = spokes[i];
      const pa = { x: a.dir.x * f * a.reach, y: a.dir.y * f * a.reach };
      const pb = { x: b.dir.x * f * b.reach, y: b.dir.y * f * b.reach };
      const mid = { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 };
      const dist = Math.hypot(mid.x, mid.y) || 1;
      // Bows the segment outward, away from the corner — real capture silk
      // sags rather than running taut between spokes.
      const bulge = dist * (0.06 + rng() * 0.08);
      const control = {
        x: mid.x + (mid.x / dist) * bulge,
        y: mid.y + (mid.y / dist) * bulge,
      };
      ringSegments.push({
        pa,
        control,
        pb,
        width: 0.22 + rng() * 0.14,
        opacity: 0.26 + rng() * 0.36,
      });
    }
  }

  const ringPaths: StrandPath[] = ringSegments.map((seg) => ({
    d: `M ${seg.pa.x.toFixed(2)} ${seg.pa.y.toFixed(2)} Q ${seg.control.x.toFixed(2)} ${seg.control.y.toFixed(2)} ${seg.pb.x.toFixed(2)} ${seg.pb.y.toFixed(2)}`,
    width: seg.width,
    opacity: seg.opacity,
  }));

  // Sticky glue droplets beaded along the capture spiral itself (real orb
  // webs are studded with these, not the dry radial spokes) — walked along
  // each ring segment's own curve so they sit on the sagging silk.
  const beads: Glint[] = [];
  for (const seg of ringSegments) {
    const segLen = Math.hypot(seg.pb.x - seg.pa.x, seg.pb.y - seg.pa.y) || 1;
    const spacing = 2.4 + rng() * 1.6;
    const count = Math.max(1, Math.round(segLen / spacing));
    for (let i = 0; i < count; i++) {
      const t = clamp((i + 0.5) / count + (rng() - 0.5) * 0.16, 0.06, 0.94);
      const pt = qpoint(seg.pa, seg.control, seg.pb, t);
      beads.push({
        cx: pt.x,
        cy: pt.y,
        r: 0.2 + rng() * 0.16,
        opacity: 0.34 + rng() * 0.34,
      });
    }
  }

  const strayPaths: StrandPath[] = [];
  for (let i = 0; i < config.strayCount; i++) {
    const s = spokes[Math.floor(rng() * spokes.length)];
    const t = 0.3 + rng() * 0.4;
    const origin = { x: s.dir.x * s.reach * t, y: s.dir.y * s.reach * t };
    const driftAngle = rng() * Math.PI * 2;
    const driftLen = 7 + rng() * 15;
    const end = {
      x: Math.max(-8, origin.x + Math.cos(driftAngle) * driftLen),
      y: Math.max(-8, origin.y + Math.sin(driftAngle) * driftLen),
    };
    const mid = { x: (origin.x + end.x) / 2, y: (origin.y + end.y) / 2 };
    const perp = { x: -(end.y - origin.y), y: end.x - origin.x };
    const perpLen = Math.hypot(perp.x, perp.y) || 1;
    const sag = (rng() - 0.5) * 6;
    const control = {
      x: mid.x + (perp.x / perpLen) * sag,
      y: mid.y + (perp.y / perpLen) * sag,
    };
    strayPaths.push({
      d: `M ${origin.x.toFixed(2)} ${origin.y.toFixed(2)} Q ${control.x.toFixed(2)} ${control.y.toFixed(2)} ${end.x.toFixed(2)} ${end.y.toFixed(2)}`,
      width: 0.18 + rng() * 0.1,
      opacity: 0.2 + rng() * 0.24,
    });
  }

  // A few larger, brighter catch-lights on top of the bead field — the
  // occasional droplet that's caught the light dead-on rather than the
  // uniform glisten of the spiral as a whole.
  const glints: Glint[] = [];
  const glintCount = 2 + Math.floor(rng() * 3);
  for (let i = 0; i < glintCount; i++) {
    const f = fractions[Math.floor(rng() * fractions.length)] ?? 0.5;
    const s = spokes[Math.floor(rng() * spokes.length)];
    glints.push({
      cx: s.dir.x * f * s.reach,
      cy: s.dir.y * f * s.reach,
      r: 0.5 + rng() * 0.6,
      opacity: 0.5 + rng() * 0.35,
    });
  }

  return { spokePaths, ringPaths, strayPaths, beads, glints };
}

const WEBS = WEB_CONFIGS.map(buildWeb);

function CornerWeb({ index }: { index: number }) {
  const { spokePaths, ringPaths, strayPaths, beads, glints } = WEBS[index];
  const config = WEB_CONFIGS[index];
  const gradient_id = `web-fade-${config.seed}`;
  const shadow_id = `web-shadow-${config.seed}`;
  const dew_id = `web-dew-${config.seed}`;

  return (
    <svg
      className={styles.web}
      viewBox="-8 -8 114 114"
      preserveAspectRatio="none"
    >
      <defs>
        <radialGradient
          id={gradient_id}
          gradientUnits="userSpaceOnUse"
          cx="0"
          cy="0"
          r={SIZE}
        >
          <stop offset="0%" stopColor="#f6f9ff" stopOpacity={0.68} />
          <stop offset="55%" stopColor="#d8e1ef" stopOpacity={0.34} />
          <stop offset="100%" stopColor="#d8e1ef" stopOpacity={0.03} />
        </radialGradient>
        {/* Off-center hotspot rather than a flat fill — sells the droplet
            as glassy/wet (light caught on one side) instead of a flat dot. */}
        <radialGradient id={dew_id} cx="35%" cy="32%" r="70%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={0.95} />
          <stop offset="45%" stopColor="#eef3fb" stopOpacity={0.55} />
          <stop offset="100%" stopColor="#eef3fb" stopOpacity={0} />
        </radialGradient>
        <filter id={shadow_id} x="-60%" y="-60%" width="220%" height="220%">
          <feDropShadow dx="0" dy="0.3" stdDeviation="0.35" floodColor="#000" floodOpacity="0.4" />
        </filter>
      </defs>
      <g
        stroke={`url(#${gradient_id})`}
        fill="none"
        strokeLinecap="round"
        filter={`url(#${shadow_id})`}
      >
        {spokePaths.map((p, idx) => (
          <path key={`s${idx}`} d={p.d} strokeWidth={p.width} opacity={p.opacity} />
        ))}
        {ringPaths.map((p, idx) => (
          <path key={`r${idx}`} d={p.d} strokeWidth={p.width} opacity={p.opacity} />
        ))}
        {strayPaths.map((p, idx) => (
          <path key={`t${idx}`} d={p.d} strokeWidth={p.width} opacity={p.opacity} />
        ))}
      </g>
      <g fill="#fff">
        {beads.map((b, idx) => (
          <circle key={idx} cx={b.cx} cy={b.cy} r={b.r} opacity={b.opacity} />
        ))}
      </g>
      <g fill={`url(#${dew_id})`}>
        {glints.map((g, idx) => (
          <circle key={idx} cx={g.cx} cy={g.cy} r={g.r} opacity={g.opacity} />
        ))}
      </g>
    </svg>
  );
}

const CORNER_CLASSES = ['top_left', 'top_right', 'bottom_left', 'bottom_right'] as const;

// Mounted only while the expanded card's own theme is 'spider-man'
// (App.tsx, driven by hud-telemetry.ts's locked_theme_title) — sits above
// both the card's fullscreen overlay (MediaWrapper.module.scss's
// .content_container.active, z-index: 100) and the HUD (Hud.module.scss,
// z-index: 40), which is what "in the corners of the whole screen" requires
// rather than just within the card itself.
export default function SpiderWebCorners() {
  return (
    <motion.div
      className={styles.layer}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.3 } }}
      transition={{ duration: 0.7 }}
      aria-hidden="true"
    >
      {CORNER_CLASSES.map((corner_class) => (
        <div key={corner_class} className={`${styles.corner} ${styles[corner_class]}`}>
          {WEB_CONFIGS.map((config, idx) => {
            if (config.corner !== corner_class) return null;
            return (
              <div
                key={config.seed}
                className={styles.web_slot}
                style={
                  {
                    '--scale': config.sizeScale,
                    '--inset-x': `${config.insetX}%`,
                    '--inset-y': `${config.insetY}%`,
                    '--fade': config.fade,
                  } as React.CSSProperties
                }
              >
                <CornerWeb index={idx} />
              </div>
            );
          })}
        </div>
      ))}
    </motion.div>
  );
}
