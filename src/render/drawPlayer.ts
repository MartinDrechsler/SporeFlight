import type { Skin } from '../config/skins';
import type { Player } from '../gameplay/player';

const MAX_TILT_UP = (-25 * Math.PI) / 180;
const MAX_TILT_DOWN = (75 * Math.PI) / 180;
/** Nose tips down quickly as the fall speeds up: the fall should look dangerous. */
const TILT_PER_SPEED = 0.0018;

export interface PlayerLook {
  crashed: boolean;
  shield: boolean;
  magnet: boolean;
  /** Blinks while invulnerable after a shield pop. */
  invulnerable: boolean;
  time: number;
}

/** The glowing mushroom. Its tilt, squash and eyes all follow from its motion. */
export function drawPlayer(ctx: CanvasRenderingContext2D, player: Player, skin: Skin, look: PlayerLook): void {
  if (look.invulnerable && Math.floor(look.time * 12) % 2 === 0) return;
  const r = player.radius;

  if (look.magnet) drawMagnetAura(ctx, player.x, player.y, r, look.time);

  const tilt = Math.min(MAX_TILT_DOWN, Math.max(MAX_TILT_UP, player.vy * TILT_PER_SPEED));
  // Stretch tall right after a flap, then settle back.
  const stretch = 0.25 * Math.exp(-player.sinceFlap * 10);

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(look.crashed ? Math.PI * 0.6 : tilt);
  ctx.scale(1 - stretch * 0.9, 1 + stretch);

  ctx.shadowColor = skin.glow;
  ctx.shadowBlur = 14 + Math.sin(look.time * 3) * 4;

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

  if (look.shield) drawShieldBubble(ctx, player.x, player.y, r, look.time);
}

function drawEyes(ctx: CanvasRenderingContext2D, r: number, vy: number, crashed: boolean): void {
  const eyeY = r * 0.35;
  ctx.strokeStyle = '#1a1a1a';
  ctx.fillStyle = '#1a1a1a';
  ctx.lineWidth = 2;
  for (const side of [-1, 1]) {
    const ex = side * r * 0.2;
    if (crashed) {
      const s = r * 0.1;
      ctx.beginPath();
      ctx.moveTo(ex - s, eyeY - s);
      ctx.lineTo(ex + s, eyeY + s);
      ctx.moveTo(ex + s, eyeY - s);
      ctx.lineTo(ex - s, eyeY + s);
      ctx.stroke();
    } else {
      // Pupils look up when rising and down when falling.
      const lookY = Math.max(-1, Math.min(1, vy / 300)) * r * 0.07;
      ctx.beginPath();
      ctx.ellipse(ex, eyeY + lookY, r * 0.08, r * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawShieldBubble(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, time: number): void {
  const pulse = 1 + Math.sin(time * 4) * 0.05;
  ctx.strokeStyle = 'rgba(0, 186, 255, 0.85)';
  ctx.fillStyle = 'rgba(0, 186, 255, 0.12)';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#00baff';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.6 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawMagnetAura(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, time: number): void {
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.35)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    const phase = (time * 0.8 + i / 3) % 1;
    ctx.globalAlpha = 1 - phase;
    ctx.beginPath();
    ctx.arc(x, y, r * (1.3 + phase * 2.5), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
