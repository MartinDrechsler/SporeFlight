/**
 * Maths that gives bit-for-bit the same result on every device. JavaScript
 * only promises exact results for + - * / and sqrt; Math.sin, Math.hypot,
 * Math.pow and friends may differ in the last digit between browsers. The
 * flight rules use these instead, so a run replays identically on the server
 * (that is how leaderboard scores are checked). Drawing code may use Math.
 */

const TWO_PI = 6.283185307179586;
const HALF_PI = 1.5707963267948966;
const PI = 3.141592653589793;

/** Sine from basic arithmetic only: reduce to [-π/2, π/2], then a Taylor series (error < 1e-15). */
export function sin(x: number): number {
  let r = x - Math.round(x / TWO_PI) * TWO_PI;
  if (r > HALF_PI) r = PI - r;
  else if (r < -HALF_PI) r = -PI - r;
  const r2 = r * r;
  // Horner form of r - r³/3! + r⁵/5! - ... - r¹⁹/19!
  return (
    r *
    (1 -
      (r2 / 6) *
        (1 -
          (r2 / 20) *
            (1 -
              (r2 / 42) *
                (1 - (r2 / 72) * (1 - (r2 / 110) * (1 - (r2 / 156) * (1 - (r2 / 210) * (1 - (r2 / 272) * (1 - r2 / 342)))))))))
  );
}

export function cos(x: number): number {
  return sin(x + HALF_PI);
}

/** Angle of the point (x, y), like Math.atan2. */
export function atan2(y: number, x: number): number {
  if (x === 0 && y === 0) return 0;
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  // atan of a ratio in [0, 1], then mirrored into the right octant.
  let a = atanUnit(Math.min(ax, ay) / Math.max(ax, ay));
  if (ay > ax) a = HALF_PI - a;
  if (x < 0) a = PI - a;
  return y < 0 ? -a : a;
}

/** atan(t) for t in [0, 1]: halve the angle twice, then a short series. */
function atanUnit(t: number): number {
  // atan(t) = 2·atan(t / (1 + sqrt(1 + t²))), applied twice brings t below 0.2.
  const t1 = t / (1 + Math.sqrt(1 + t * t));
  const t2 = t1 / (1 + Math.sqrt(1 + t1 * t1));
  const s = t2 * t2;
  let sum = 0;
  let term = t2;
  for (let n = 0; n < 12; n++) {
    sum += (n % 2 === 0 ? term : -term) / (2 * n + 1);
    term *= s;
  }
  return 4 * sum;
}

/** Length of the vector (x, y); sqrt is exact everywhere, unlike Math.hypot. */
export function hypot(x: number, y: number): number {
  return Math.sqrt(x * x + y * y);
}
