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

type Vec = { x: number; y: number };
type StrandPath = { d: string; width: number; opacity: number };
type Glint = { cx: number; cy: number; r: number; opacity: number };

type WebConfig = {
  seed: string;
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
  rotateDeg: number;
};

const WEB_CONFIGS: WebConfig[] = [
  {
    seed: 'attic-tl',
    spokeCount: 9,
    ringCount: 3,
    angleJitter: 9,
    tornChance: 0.08,
    strayCount: 1,
    sizeScale: 1.05,
    rotateDeg: -2,
  },
  {
    seed: 'drafty-tr',
    spokeCount: 6,
    ringCount: 2,
    angleJitter: 17,
    tornChance: 0.34,
    strayCount: 2,
    sizeScale: 0.82,
    rotateDeg: 4,
  },
  {
    seed: 'windblown-bl',
    spokeCount: 8,
    ringCount: 3,
    angleJitter: 21,
    tornChance: 0.2,
    strayCount: 2,
    sizeScale: 0.96,
    rotateDeg: -5,
  },
  {
    seed: 'fresh-br',
    spokeCount: 7,
    ringCount: 2,
    angleJitter: 6,
    tornChance: 0.05,
    strayCount: 0,
    sizeScale: 1.16,
    rotateDeg: 3,
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
      width: isAnchor ? 0.55 : 0.26 + rng() * 0.16,
      opacity: isAnchor ? 0.75 + rng() * 0.2 : 0.4 + rng() * 0.4,
    };
  });

  const ringPaths: StrandPath[] = [];
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
      ringPaths.push({
        d: `M ${pa.x.toFixed(2)} ${pa.y.toFixed(2)} Q ${control.x.toFixed(2)} ${control.y.toFixed(2)} ${pb.x.toFixed(2)} ${pb.y.toFixed(2)}`,
        width: 0.16 + rng() * 0.1,
        opacity: 0.22 + rng() * 0.32,
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
      width: 0.14 + rng() * 0.08,
      opacity: 0.18 + rng() * 0.22,
    });
  }

  const glints: Glint[] = [];
  const glintCount = 2 + Math.floor(rng() * 3);
  for (let i = 0; i < glintCount; i++) {
    const f = fractions[Math.floor(rng() * fractions.length)] ?? 0.5;
    const s = spokes[Math.floor(rng() * spokes.length)];
    glints.push({
      cx: s.dir.x * f * s.reach,
      cy: s.dir.y * f * s.reach,
      r: 0.35 + rng() * 0.45,
      opacity: 0.3 + rng() * 0.35,
    });
  }

  return { spokePaths, ringPaths, strayPaths, glints };
}

const WEBS = WEB_CONFIGS.map(buildWeb);

function CornerWeb({ index }: { index: number }) {
  const { spokePaths, ringPaths, strayPaths, glints } = WEBS[index];
  const gradient_id = `web-fade-${WEB_CONFIGS[index].seed}`;

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
          <stop offset="0%" stopColor="#e8ecf1" stopOpacity={0.6} />
          <stop offset="55%" stopColor="#e8ecf1" stopOpacity={0.3} />
          <stop offset="100%" stopColor="#e8ecf1" stopOpacity={0.03} />
        </radialGradient>
      </defs>
      <g stroke={`url(#${gradient_id})`} fill="none" strokeLinecap="round">
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
      {CORNER_CLASSES.map((corner_class, idx) => (
        <div
          key={corner_class}
          className={`${styles.corner} ${styles[corner_class]}`}
          style={{ '--scale': WEB_CONFIGS[idx].sizeScale } as React.CSSProperties}
        >
          <div
            className={styles.web_inner}
            style={{ transform: `rotate(${WEB_CONFIGS[idx].rotateDeg}deg)` }}
          >
            <CornerWeb index={idx} />
          </div>
        </div>
      ))}
    </motion.div>
  );
}
