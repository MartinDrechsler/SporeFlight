import type { GameEvent } from '../gameplay/world';

/**
 * Purely visual feedback: particles, floating texts, screen shake and colour
 * flashes. None of it affects gameplay, so it may use Math.random freely.
 * Particles are reused from a fixed pool to avoid allocating during play.
 */
interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface FloatingText {
  text: string;
  x: number;
  y: number;
  life: number;
  color: string;
  size: number;
}

const POOL_SIZE = 220;
const TEXT_SECONDS = 1.1;
const RAINBOW = ['#ff3c69', '#ffd700', '#00f2c3', '#3fd8ff', '#bd00ff'];

export class Effects {
  private readonly particles: Particle[] = Array.from({ length: POOL_SIZE }, () => ({
    active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#fff',
  }));
  private texts: FloatingText[] = [];
  private shakeTime = 0;
  private shakeDuration = 1;
  private shakeStrength = 0;
  private flashTime = 0;
  private flashColor = '255, 215, 0';

  /** Turns gameplay events into visuals. `px, py` is the player, `width, height` the field. */
  react(event: GameEvent, px: number, py: number, width: number, height: number, flapColor: string): void {
    switch (event.type) {
      case 'flap':
        this.burst(px - 10, py + 12, 6, flapColor, 60, 0.4);
        break;
      case 'pass':
        if (event.points > 1) this.text(`+${event.points}`, px, py - 34, '#ffffff');
        break;
      case 'comboUp':
        this.text(`COMBO x${event.multiplier}!`, px, py - 52, '#ffd700');
        break;
      case 'fever':
        this.text('FEVER MODE!', width / 2, height * 0.28, '#bd00ff', 26);
        this.burst(px, py, 30, '#bd00ff', 220, 0.8);
        this.flash('189, 0, 255');
        break;
      case 'pickup':
        this.reactToPickup(event);
        break;
      case 'nearMiss':
        this.burst(px, py, 14, '#ffd700', 180, 0.5);
        this.text(`NEAR MISS! +${event.coins}`, px, py - 30, '#ffd700');
        this.shake(0.13, 2.5);
        break;
      case 'shieldPop':
        this.burst(px, py, 24, '#00baff', 200, 0.7);
        this.text('SHIELD POPPED!', px, py - 34, '#00baff');
        this.shake(0.3, 8);
        break;
      case 'benchmark':
        this.burst(px, py, 30, '#ffd700', 260, 0.9);
        this.text(`BENCHMARK ${event.score}! +${event.reward}`, width / 2, height * 0.3, '#ffd700', 22);
        this.flash('255, 215, 0');
        break;
      case 'wind':
        this.text(event.kind === 'updraft' ? 'UPDRAFT!' : 'DOWNDRAFT!', px, py - 30, event.kind === 'updraft' ? '#00f2c3' : '#ff3c69');
        break;
      case 'crash':
        this.burst(event.x, event.y, 28, '#e02476', 240, 0.9);
        this.shake(0.3, 10);
        break;
    }
  }

  /** A short message in the middle of the screen (quests, achievements). */
  announce(text: string, color: string, width: number, height: number): void {
    this.text(text, width / 2, height * 0.38, color, 18);
  }

  update(dt: number, fever: boolean, px: number, py: number): void {
    if (fever && Math.random() < 0.85) {
      this.spawn(px - 12, py + (Math.random() - 0.5) * 16, -80 - Math.random() * 60, (Math.random() - 0.5) * 30, 0.5, 2.5,
        RAINBOW[Math.floor(Math.random() * RAINBOW.length)]!);
    }
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 200 * dt;
    }
    for (const t of this.texts) {
      t.life -= dt;
      t.y -= 45 * dt;
    }
    this.texts = this.texts.filter((t) => t.life > 0);
    this.shakeTime = Math.max(0, this.shakeTime - dt);
    this.flashTime = Math.max(0, this.flashTime - dt);
  }

  /** Camera offset for screen shake; fades out over the shake's duration. */
  shakeOffset(): { x: number; y: number } {
    if (this.shakeTime <= 0) return { x: 0, y: 0 };
    const strength = this.shakeStrength * (this.shakeTime / this.shakeDuration);
    return { x: (Math.random() - 0.5) * 2 * strength, y: (Math.random() - 0.5) * 2 * strength };
  }

  draw(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    for (const p of this.particles) {
      if (!p.active) continue;
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.textAlign = 'center';
    for (const t of this.texts) {
      ctx.font = `${t.size}px VT323, ui-monospace, monospace`;
      ctx.globalAlpha = Math.min(1, (t.life / TEXT_SECONDS) * 1.5);
      ctx.fillStyle = t.color;
      ctx.shadowColor = t.color;
      ctx.shadowBlur = 8;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.shadowBlur = 0;
    if (this.flashTime > 0) {
      const flash = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.7);
      flash.addColorStop(0, `rgba(${this.flashColor}, 0)`);
      flash.addColorStop(1, `rgba(${this.flashColor}, ${0.35 * (this.flashTime / 0.5)})`);
      ctx.globalAlpha = 1;
      ctx.fillStyle = flash;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.globalAlpha = 1;
  }

  clear(): void {
    for (const p of this.particles) p.active = false;
    this.texts = [];
    this.shakeTime = 0;
    this.flashTime = 0;
  }

  private reactToPickup(event: Extract<GameEvent, { type: 'pickup' }>): void {
    const { x, y } = event;
    switch (event.kind) {
      case 'coin':
        this.burst(x, y, 12, '#ffd23f', 150, 0.6);
        this.text(`+${event.coins}`, x, y - 18, '#ffd23f');
        break;
      case 'diamond':
        this.burst(x, y, 18, '#3fd8ff', 200, 0.7);
        this.text('+1 DIAMOND!', x, y - 18, '#3fd8ff');
        this.flash('0, 229, 255');
        break;
      case 'shield':
        this.burst(x, y, 16, '#00baff', 160, 0.6);
        this.text('GLOW-SHIELD!', x, y - 18, '#00baff');
        break;
      case 'magnet':
        this.burst(x, y, 16, '#00e5ff', 160, 0.6);
        this.text('MAGNET!', x, y - 18, '#00e5ff');
        break;
    }
  }

  private shake(seconds: number, strength: number): void {
    this.shakeTime = seconds;
    this.shakeDuration = seconds;
    this.shakeStrength = strength;
  }

  private flash(rgb: string): void {
    this.flashTime = 0.5;
    this.flashColor = rgb;
  }

  private burst(x: number, y: number, count: number, color: string, speed: number, life: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = speed * (0.3 + Math.random() * 0.7);
      this.spawn(x, y, Math.cos(angle) * velocity, Math.sin(angle) * velocity, life, 1.5 + Math.random() * 2, color);
    }
  }

  private spawn(x: number, y: number, vx: number, vy: number, life: number, size: number, color: string): void {
    const p = this.particles.find((candidate) => !candidate.active);
    if (!p) return;
    Object.assign(p, { active: true, x, y, vx, vy, life: life * (0.6 + Math.random() * 0.4), maxLife: life, size, color });
  }

  private text(text: string, x: number, y: number, color: string, size = 20): void {
    this.texts.push({ text, x, y, life: TEXT_SECONDS, color, size });
  }
}
