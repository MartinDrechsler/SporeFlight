import type { Skin } from '../config/theme';
import type { Player } from '../gameplay/player';

const MAX_TILT_UP = (-25 * Math.PI) / 180;
const MAX_TILT_DOWN = (55 * Math.PI) / 180;
const TILT_PER_SPEED = 0.001;

export interface PlayerLook {
  crashed: boolean;
  fever: boolean;
  time: number;
}

/** The glowing mushroom. Its tilt, squash and eyes are all derived from its motion. */
export function drawPlayer(ctx: CanvasRenderingContext2D, player: Player, skin: Skin, look: PlayerLook): void {
  const r = player.radius;
  const tilt = Math.min(MAX_TILT_DOWN, Math.max(MAX_TILT_UP, player.vy * TILT_PER_SPEED));
  // Stretch tall right after a flap, then settle back.
  const stretch = 0.25 * Math.exp(-player.sinceFlap * 10);

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(look.crashed ? Math.PI * 0.6 : tilt);
  ctx.scale(1 - stretch * 0.9, 1 + stretch);

  const glow = look.fever ? '#ffd700' : skin.glow;
  ctx.shadowColor = glow;
  ctx.shadowBlur = (look.fever ? 26 : 14) + Math.sin(look.time * 3) * 4;

  // Stem
  ctx.fillStyle = '#f2ead8';
  ctx.beginPath();
  ctx.roundRect(-r * 0.42, -r * 0.1, r * 0.84, r * 1.1, r * 0.35);
  ctx.fill();

  // Cap
  const cap = ctx.createLinearGradient(0, -r, 0, r * 0.2);
  cap.addColorStop(0, skin.capLight);
  cap.addColorStop(0.6, skin.capMain);
  cap.addColorStop(1, skin.capDark);
  ctx.fillStyle = cap;
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.1, r * 1.05, r * 0.85, 0, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  // Spots
  ctx.fillStyle = skin.spots;
  for (const [sx, sy, sr] of [[-0.45, -0.5, 0.2], [0.3, -0.62, 0.15], [0.62, -0.28, 0.12]] as const) {
    ctx.beginPath();
    ctx.arc(sx * r, sy * r, sr * r, 0, Math.PI * 2);
    ctx.fill();
  }

  drawEyes(ctx, r, player.vy, look.crashed);
  ctx.restore();
}

function drawEyes(ctx: CanvasRenderingContext2D, r: number, vy: number, crashed: boolean): void {
  const eyeY = r * 0.35;
  ctx.strokeStyle = '#1a1a1a';
  ctx.fillStyle = '#1a1a1a';
  ctx.lineWidth = 2;
  for (const side of [-1, 1]) {
    const ex = side * r * 0.2;
    if (crashed) {
      // X-shaped eyes
      const s = r * 0.1;
      ctx.beginPath();
      ctx.moveTo(ex - s, eyeY - s);
      ctx.lineTo(ex + s, eyeY + s);
      ctx.moveTo(ex + s, eyeY - s);
      ctx.lineTo(ex - s, eyeY + s);
      ctx.stroke();
    } else {
      // Pupils look up when rising and down when falling.
      const look = Math.max(-1, Math.min(1, vy / 300)) * r * 0.07;
      ctx.beginPath();
      ctx.ellipse(ex, eyeY + look, r * 0.08, r * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
