import type { Skin } from '../config/skins';
import type { Player } from '../gameplay/player';
import type { Pose } from './avatar';
import { EXPRESSIONS, type Expression } from '../config/expressions';
import { drawMushroom } from './mushroom';

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

/** The glowing mushroom in flight. Its tilt, squash and eyes all follow from its motion. */
export function drawPlayer(ctx: CanvasRenderingContext2D, player: Player, skin: Skin, look: PlayerLook): void {
  if (look.invulnerable && Math.floor(look.time * 12) % 2 === 0) return;
  const { pose } = look;
  const r = player.radius * pose.scale;
  const x = player.x + pose.shiftX;

  if (look.magnet) drawMagnetAura(ctx, x, player.y, r, look.time);

  const tilt = Math.min(MAX_TILT_DOWN, Math.max(MAX_TILT_UP, player.vy * TILT_PER_SPEED));
  // Stretch tall right after a flap, then settle back.
  const stretch = 0.25 * Math.exp(-player.sinceFlap * 10);

  ctx.save();
  ctx.translate(x, player.y);
  // A glance turns the head a little too.
  ctx.rotate(look.crashed ? Math.PI * 0.6 : tilt + pose.gaze * 0.07);
  ctx.scale(1 - stretch * 0.9, 1 + stretch);
  const act = pose.act;
  if (act) {
    ctx.translate(act.x * r, act.y * r);
    ctx.rotate(act.rotation);
    ctx.scale(act.scaleX, act.scaleY);
  }

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
