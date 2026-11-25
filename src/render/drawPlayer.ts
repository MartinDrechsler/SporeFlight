import type { Skin } from '../config/skins';
import type { Player } from '../gameplay/player';
import type { Pose } from './avatar';
import { EXPRESSIONS, type Expression } from '../config/expressions';
import { jumpShape } from './jump';
import { drawMushroom } from './mushroom';

export interface PlayerLook {
  crashed: boolean;
  shield: boolean;
  magnet: boolean;
  /** Blinks while invulnerable after a shield pop. */
  invulnerable: boolean;
  time: number;
  /** Shift, size, gaze and blink (the home screen avatar); see render/avatar.ts. */
  pose: Pose;
  /** The Stone Thrower is in the fight (not leaving): the mushroom looks nervous. */
  bossNear: boolean;
}

/** The face in flight: dizzy after a crash, nervous while the boss is near, calm otherwise. */
function flightFace(look: PlayerLook): Expression {
  if (look.crashed) return EXPRESSIONS.dizzy;
  return look.bossNear ? EXPRESSIONS.nervous : EXPRESSIONS.neutral;
}

/**
 * The mushroom is drawn this much bigger than its hitbox (TUNING.player.radius). A bigger hitbox would make
 * every gap tighter; a bigger drawing on the same hitbox only makes it easier to see, and a cap edge that
 * brushes a root by a pixel or two forgives instead of punishing (Schell: a crash must feel like the
 * player's own mistake, never the game's).
 */
export const LOOK_SCALE = 1.15;

/** The glowing mushroom in flight. Its lean, squeeze and stretch, and its eyes all follow from its motion. */
export function drawPlayer(ctx: CanvasRenderingContext2D, player: Player, skin: Skin, look: PlayerLook): void {
  if (look.invulnerable && Math.floor(look.time * 12) % 2 === 0) return;
  const { pose } = look;
  const r = player.radius * LOOK_SCALE * pose.scale;
  const x = player.x + pose.shiftX;

  if (look.magnet) drawMagnetAura(ctx, x, player.y, r, look.time);

  // Squeeze on the tap, stretch forward along the jump, lean right; see render/jump.ts.
  const jump = jumpShape(player.sinceFlap, player.vy);

  ctx.save();
  ctx.translate(x, player.y);
  // A glance turns the head a little too.
  ctx.rotate(look.crashed ? Math.PI * 0.6 : jump.tilt + pose.gaze * 0.07);
  ctx.scale(jump.scaleX, jump.scaleY);
  const act = pose.act;
  if (act) {
    ctx.translate(act.x * r, act.y * r);
    ctx.rotate(act.rotation);
    ctx.scale(act.scaleX, act.scaleY);
  }

  // Gliding, it hangs from a dandelion seed's white puff.
  if (player.mode === 'glide' && !look.crashed) drawSeedPuff(ctx, r, look.time);
  drawMushroom(ctx, r, {
    skin,
    face: act ? act.face : flightFace(look),
    // Eyes look up when rising and down when falling, and sideways when glancing.
    gaze: { x: pose.gaze, y: Math.max(-1, Math.min(1, player.vy / 300)) * 2, blink: pose.blink },
    faceVisible: act ? act.faceVisible : true,
    glow: 14 + Math.sin(look.time * 3) * 4,
    flash: act ? act.flash : 0,
  });
  ctx.restore();

  if (look.shield) drawShieldBubble(ctx, x, player.y, r, look.time);
}

/** A dandelion seed above the cap: a thin stalk and a puff of fine white filaments, swaying gently. */
function drawSeedPuff(ctx: CanvasRenderingContext2D, r: number, time: number): void {
  const sway = Math.sin(time * 2.2) * 0.12;
  const top = -r * 0.95;
  const cx = Math.sin(sway) * r * 0.7;
  const cy = top - r * 0.75;
  ctx.save();
  ctx.strokeStyle = 'rgba(240, 248, 255, 0.9)';
  ctx.lineWidth = Math.max(1, r * 0.05);
  ctx.beginPath();
  ctx.moveTo(0, top);
  ctx.quadraticCurveTo(cx * 0.3, top - r * 0.4, cx, cy);
  ctx.stroke();
  ctx.lineWidth = Math.max(0.8, r * 0.03);
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 8;
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + sway;
    const len = r * (0.55 + (i % 3) * 0.08);
    const tx = cx + Math.cos(a) * len;
    const ty = cy + Math.sin(a) * len * 0.8;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(tx, ty, r * 0.05, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
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
