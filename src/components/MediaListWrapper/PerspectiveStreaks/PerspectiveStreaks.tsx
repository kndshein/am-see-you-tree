import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';
import { charge_progress } from '../../../utils/hud-telemetry';
import styles from './PerspectiveStreaks.module.scss';

type PropTypes = {
  direction: 'left' | 'right';
};

const VERTEX_SRC = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

// Individually-timed comet streaks (one per angular slice, hash-seeded),
// each launching from u_center and traveling outward on its own loop —
// first pass just rotated a perfectly even ring of spokes together, which
// read as a static sunburst/wagon-wheel rather than anything moving past
// you. Per-slice seeding (irregular speed, length, launch timing, and
// whether it's even lit this frame) plus no outer radius cutoff — letting
// streaks run past the visible edges instead of fading inside a fixed
// circle — is what's meant to break both of those readings. side_mask
// keeps streaks off the held side itself (right where the arrow's own UI
// sits) but visible almost everywhere else, all the way out past the
// farthest corner. Color ramps from a dark navy toward a bright saturated
// blue as progress climbs toward armed — deliberately its own color
// (blue), not mirroring the arrow's own red/orange charge escalation
// (MediaListWrapper.module.scss's .charging, $charge-red/$corner-charging
// in variables.scss).
const FRAGMENT_SRC = `
  precision mediump float;
  uniform vec2 u_resolution;
  uniform vec2 u_center;
  uniform float u_progress;
  uniform float u_time;
  // Distance from u_center to the farthest screen corner, in the same
  // aspect-corrected space as delta below — computed in JS
  // (PerspectiveStreaks.tsx's own draw loop) from the real canvas dimensions
  // each frame, not guessed here, so streaks reliably reach every corner
  // regardless of aspect ratio.
  uniform float u_max_reach;

  float hash(float n) {
    return fract(sin(n) * 43758.5453123);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
    vec2 delta = uv * aspect - u_center * aspect;
    float dist = length(delta);
    float angle = atan(delta.y, delta.x);

    // Hides only a narrow band right at the held side (where the arrow's
    // own UI lives) rather than the whole near half — visibility starts
    // close to u_center so streaks read as emerging right from the arrow,
    // not from partway across the screen. u_center.x is already raw 0-1
    // screen space (not aspect-corrected, unlike delta above), so it's
    // directly comparable to uv.x here.
    float vanishing_on_right = step(0.5, u_center.x);
    float side_mask = mix(
      smoothstep(0.12, 0.28, uv.x),
      1.0 - smoothstep(0.72, 0.88, uv.x),
      vanishing_on_right
    );

    const float SLICES = 160.0;
    float slice = floor((angle + 3.14159265) / 6.2831853 * SLICES);
    float seed = hash(slice);
    float seed2 = hash(slice + 41.7);

    // Only a fraction of slices carry a streak at all, at any moment — an
    // unbroken ring of 160 streaks would just be the old sunburst again
    // with extra steps.
    float lit = step(0.6, hash(slice + 91.0));

    // Each streak's own speed and starting offset, so they launch and pass
    // at different moments instead of in lockstep — speed (and so how often
    // a burst passes) climbs with u_progress, same idea as the color ramp.
    // + u_time, not -: fract's own sawtooth then climbs from 0 (at u_center,
    // the arrow) up to 1 (u_max_reach, the far corner) before snapping back,
    // so travel actually counts outward from the arrow over time. The
    // subtracted version this used to be counted down instead — travel
    // shrinking from the corner back toward the arrow — which animated as
    // streaks arriving at the arrow, backwards from the intent.
    float speed = 0.6 + seed * 1.8;
    float launch = fract(seed2 * 11.3 + u_time * speed * (0.2 + u_progress * 1.1));
    float travel = launch * u_max_reach;
    float len = 0.06 + seed * 0.16;

    // d < 0 means dist hasn't reached this streak's leading edge yet — the
    // streak can never render ahead of where it's currently traveled to.
    // Brightest right at that leading edge (d = 0, the newest, outermost
    // point) fading back toward the tail (d = -len, closer to u_center) —
    // a comet's head, not its tail, is the bright end.
    float d = dist - travel;
    float head = 1.0 - smoothstep(-0.015, 0.0, d);
    float tail_fade = smoothstep(-len, -len * 0.35, d);
    float streak = head * tail_fade * lit;

    // Fades in from nothing at the vanishing point up to full strength by
    // 90% of the way to the farthest corner — streaks read as gaining
    // opacity as they near the screen edge, not a flat brightness along
    // their whole reach.
    float edge_boost = smoothstep(0.0, u_max_reach * 0.9, dist);

    // 0.35 — dimmer than the streaks' own raw brightness, on top of the
    // additive/screen blending already softening things further.
    float intensity = streak * side_mask * edge_boost * u_progress * 0.35;

    // Blue instead of the arrow's own red/orange charge colors — dark navy
    // climbing to a bright, saturated blue as progress nears armed.
    vec3 color_low = vec3(0.04, 0.08, 0.25);
    vec3 color_high = vec3(0.25, 0.55, 1.0);
    vec3 color = mix(color_low, color_high, u_progress);

    gl_FragColor = vec4(color * intensity, intensity);
  }
`;

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

// Purely decorative radiating light-streaks, on the same direction-biased
// vanishing point MediaListWrapper.module.scss's own .perspective_blur mask
// uses. The "realistic middle ground" from the WebGL-feasibility
// conversation this came out of: true motion blur on the real rail would
// need the DOM's actual pixels as a WebGL texture (expensive to get live,
// and a second rendering pipeline to keep in sync with the real one) — this
// renders pure procedural VFX on its own canvas instead, layered on top, and
// never samples real content at all.
export default function PerspectiveStreaks({ direction }: PropTypes) {
  const canvas_ref = useRef<HTMLCanvasElement>(null);
  const should_reduce_motion = useReducedMotion();

  useEffect(() => {
    if (should_reduce_motion) return;
    const canvas = canvas_ref.current;
    const gl = canvas?.getContext('webgl', {
      premultipliedAlpha: false,
      alpha: true,
    });
    if (!canvas || !gl) return;

    const vertex_shader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SRC);
    const fragment_shader = compileShader(
      gl,
      gl.FRAGMENT_SHADER,
      FRAGMENT_SRC,
    );
    const program = gl.createProgram();
    if (!vertex_shader || !fragment_shader || !program) return;

    gl.attachShader(program, vertex_shader);
    gl.attachShader(program, fragment_shader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    // One big triangle covering the whole clip space — cheaper than a
    // two-triangle quad, no shared-edge seam to worry about.
    const position_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, position_buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const position_loc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(position_loc);
    gl.vertexAttribPointer(position_loc, 2, gl.FLOAT, false, 0, 0);

    const resolution_loc = gl.getUniformLocation(program, 'u_resolution');
    const center_loc = gl.getUniformLocation(program, 'u_center');
    const progress_loc = gl.getUniformLocation(program, 'u_progress');
    const time_loc = gl.getUniformLocation(program, 'u_time');
    const max_reach_loc = gl.getUniformLocation(program, 'u_max_reach');

    // Additive, not alpha-over — reads as light being added on top of
    // whatever's underneath (paired with the canvas's own mix-blend-mode:
    // screen, PerspectiveStreaks.module.scss) rather than a translucent
    // layer sitting over it.
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);

    // Close to the actual screen edge — near where .arrow_left/.arrow_right
    // themselves dock (MediaListWrapper.module.scss) — rather than well
    // inset from it, so the streaks read as originating from around the
    // arrow itself instead of some distance away from it.
    const center_x = direction === 'left' ? 0.08 : 0.92;

    let raf = 0;
    const start = performance.now();

    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.round(canvas.clientWidth * dpr);
      const height = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      // Farthest of the four screen corners from the vanishing point, in the
      // same aspect-corrected space the shader's own delta uses — guarantees
      // streaks can always reach every corner regardless of aspect ratio,
      // rather than a fixed distance that only happened to work for one.
      const aspect = canvas.width / canvas.height;
      const center_ac_x = center_x * aspect;
      let max_reach = 0;
      for (const corner_x of [0, aspect]) {
        for (const corner_y of [0, 1]) {
          const dx = corner_x - center_ac_x;
          const dy = corner_y - 0.5;
          max_reach = Math.max(max_reach, Math.sqrt(dx * dx + dy * dy));
        }
      }

      gl.uniform2f(resolution_loc, canvas.width, canvas.height);
      gl.uniform2f(center_loc, center_x, 0.5);
      gl.uniform1f(progress_loc, charge_progress.get());
      gl.uniform1f(time_loc, (performance.now() - start) / 1000);
      gl.uniform1f(max_reach_loc, max_reach * 1.05);

      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      gl.deleteProgram(program);
      gl.deleteShader(vertex_shader);
      gl.deleteShader(fragment_shader);
      gl.deleteBuffer(position_buffer);
    };
  }, [direction, should_reduce_motion]);

  if (should_reduce_motion) return null;

  return (
    <canvas ref={canvas_ref} className={styles.streaks} aria-hidden="true" />
  );
}
