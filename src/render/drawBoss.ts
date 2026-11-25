import type { Theme } from '../config/theme';
import { TUNING } from '../config/tuning';
import { isWarning, type Boss } from '../gameplay/boss';
import { drawBat } from './hazards';

const B = TUNING.boss;

/** Draws the boss of the stage and what it throws. */
export function drawBoss(ctx: CanvasRenderingContext2D, boss: Boss, theme: Theme, time: number): void {
  if (boss.id === 'batQueen') drawBatQueen(ctx, boss, time);
  else drawStoneThrower(ctx, boss, theme, time);
  for (const rock of boss.rocks) {
    if (rock.kind === 'bat') drawBat(ctx, rock.x, rock.y, B.rockRadius, time + rock.age * 3, '#ff4d6d');
    else drawRock(ctx, rock.x, rock.y, rock.vx, rock.vy, rock.spin);
  }
}

/**
 * The Bat Queen: a great bat hanging in the dark at the right edge, wings
 * wide, a little crown of glowcap light. Before every attack her eyes flare
 * and her wings spread; before a screech her mouth opens wide.
 */
function drawBatQueen(ctx: CanvasRenderingContext2D, boss: Boss, time: number): void {
  const warning = isWarning(boss);
  const r = B.bodyRadius * 0.8;
  const x = boss.x + (warning ? Math.sin(time * 70) * 2 : 0);
  const y = boss.y;
  const beat = Math.sin(time * (warning ? 9 : 4));
  ctx.save();
  ctx.fillStyle = '#140a1f';
  ctx.strokeStyle = '#4a2d6e';
  ctx.lineWidth = 2;
  for (const side of [-1, 1]) {
    // Great wings, spread wider while an attack is announced.
    const span = warning ? 2.4 : 1.9;
    const tipY = y - r * (0.7 + beat * 0.5);
    ctx.beginPath();
    ctx.moveTo(x + side * r * 0.4, y - r * 0.3);
    ctx.lineTo(x + side * r * span, tipY - r * 0.4);
    for (let i = 3; i >= 1; i--) {
      const fx = x + side * r * (0.5 + (span - 0.5) * (i / 3));
      ctx.quadraticCurveTo(fx + side * r * 0.1, tipY + r * (1.1 - i * 0.15), x + side * r * (0.5 + (span - 0.5) * ((i - 1) / 3)), y + r * 0.5);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.62, r * 0.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + side * r * 0.2, y - r * 0.65);
    ctx.lineTo(x + side * r * 0.45, y - r * 1.25);
    ctx.lineTo(x + side * r * 0.55, y - r * 0.5);
    ctx.fill();
  }
  // A crown of three glowing glowcaps.
  ctx.fillStyle = '#c58cff';
  ctx.shadowColor = '#c58cff';
  ctx.shadowBlur = 14;
  for (const dx of [-0.22, 0, 0.22]) {
    ctx.beginPath();
    ctx.arc(x + dx * r, y - r * 0.82 - (dx === 0 ? 6 : 0), r * 0.09, Math.PI, 0);
    ctx.fill();
  }
  // Eyes that flare before every attack.
  const eyes = warning ? '#fff2a8' : '#ff4d6d';
  ctx.fillStyle = eyes;
  ctx.shadowColor = eyes;
  ctx.shadowBlur = warning ? 26 : 10;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(x + side * r * 0.22, y - r * 0.3, warning ? 7 : 5, warning ? 5 : 3.5, side * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Fangs, and a mouth that opens to screech.
  ctx.shadowBlur = 0;
  const open = warning && boss.pattern === 'screech' ? r * 0.35 : r * 0.08;
  ctx.fillStyle = '#050208';
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.05, r * 0.25, open, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f2ead8';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + side * r * 0.16, y);
    ctx.lineTo(x + side * r * 0.1, y + r * 0.2);
    ctx.lineTo(x + side * r * 0.04, y);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * The Stone Thrower: a hulking shape of dark stone at the right edge with two
 * glowing eyes. While a throw is announced the eyes flare and it trembles.
 */
function drawStoneThrower(ctx: CanvasRenderingContext2D, boss: Boss, theme: Theme, time: number): void {
  const warning = isWarning(boss);
  const tremble = warning ? Math.sin(time * 70) * 3 : 0;
  const x = boss.x + tremble;
  const y = boss.y;
  const r = B.bodyRadius;

  ctx.save();
  // Body: a lumpy boulder made of overlapping stones.
  const body = ctx.createRadialGradient(x - r * 0.3, y - r * 0.4, r * 0.2, x, y, r * 1.2);
  body.addColorStop(0, '#4a4038');
  body.addColorStop(1, '#14100d');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  for (let i = 0; i < 7; i++) {
    const angle = (i / 7) * Math.PI * 2 + 0.4;
    const bump = r * (0.35 + ((i * 3) % 4) * 0.06);
    ctx.moveTo(x + Math.cos(angle) * r * 0.85 + bump, y + Math.sin(angle) * r * 0.85);
    ctx.arc(x + Math.cos(angle) * r * 0.85, y + Math.sin(angle) * r * 0.85, bump, 0, Math.PI * 2);
  }
  ctx.fill();

  // Glowing cracks, as if fire lives inside the stone.
  ctx.strokeStyle = theme.accent;
  ctx.globalAlpha = warning ? 0.9 : 0.45;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + r * 0.1, y - r * 0.75);
  ctx.lineTo(x + r * 0.25, y - r * 0.45);
  ctx.lineTo(x + r * 0.1, y - r * 0.25);
  ctx.moveTo(x + r * 0.3, y + r * 0.35);
  ctx.lineTo(x + r * 0.5, y + r * 0.55);
  ctx.lineTo(x + r * 0.4, y + r * 0.8);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // A jagged mouth that opens wide to throw.
  const open = warning ? 16 : 6;
  ctx.fillStyle = '#050302';
  ctx.beginPath();
  ctx.moveTo(x - r * 0.75, y + r * 0.1);
  for (let i = 0; i <= 6; i++) ctx.lineTo(x - r * 0.75 + i * r * 0.11, y + r * 0.1 + (i % 2 ? open * 0.6 : 0));
  ctx.lineTo(x - r * 0.09, y + r * 0.1 + open * 1.5);
  ctx.lineTo(x - r * 0.75, y + r * 0.1 + open * 1.5);
  ctx.closePath();
  ctx.fill();

  // Arm raised to throw.
  ctx.strokeStyle = '#3a3029';
  ctx.lineWidth = 18;
  ctx.lineCap = 'round';
  const raise = warning ? -0.9 : -0.2 + Math.sin(time * 2) * 0.1;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.5, y + r * 0.5);
  ctx.lineTo(x - r * 1.05, y + r * 0.5 + Math.sin(raise) * r * 1.1);
  ctx.stroke();

  // Eyes: dim embers that flare before every throw.
  const glow = warning ? 1 : 0.45 + Math.sin(time * 3) * 0.1;
  ctx.shadowColor = theme.accent;
  ctx.shadowBlur = warning ? 30 : 12;
  ctx.fillStyle = warning ? '#fff2a8' : theme.accent;
  ctx.globalAlpha = glow;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(x - r * 0.35 + side * r * 0.22, y - r * 0.2, warning ? 9 : 7, warning ? 6 : 4, side * -0.25, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawRock(ctx: CanvasRenderingContext2D, x: number, y: number, vx: number, vy: number, spin: number): void {
  const r = B.rockRadius;
  const speed = Math.hypot(vx, vy) || 1;
  // A short dusty trail shows where it is heading.
  ctx.strokeStyle = 'rgba(160, 140, 120, 0.3)';
  ctx.lineWidth = r;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - (vx / speed) * r * 2.2, y - (vy / speed) * r * 2.2);
  ctx.stroke();

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spin);
  ctx.fillStyle = '#7a6a5a';
  ctx.beginPath();
  for (let i = 0; i < 7; i++) {
    const angle = (i / 7) * Math.PI * 2;
    const rr = r * (0.82 + ((i * 5) % 3) * 0.1);
    if (i === 0) ctx.moveTo(Math.cos(angle) * rr, Math.sin(angle) * rr);
    else ctx.lineTo(Math.cos(angle) * rr, Math.sin(angle) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#3d3229';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r * 0.4, -r * 0.2);
  ctx.lineTo(r * 0.1, r * 0.1);
  ctx.lineTo(r * 0.3, -r * 0.3);
  ctx.stroke();
  ctx.restore();
}
