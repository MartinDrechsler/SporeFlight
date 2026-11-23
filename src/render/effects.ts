import type { GameEvent } from '../gameplay/world';

/**
 * Purely visual particles and floating texts. They never affect gameplay,
 * so they may use Math.random freely. Objects are reused from a fixed pool
 * to avoid allocating during play.
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
}

const POOL_SIZE = 160;
const TEXT_SECONDS = 0.9;

export class Effects {
  private readonly particles: Particle[] = Array.from({ length: POOL_SIZE }, () => ({
    active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#fff',
  }));
  private texts: FloatingText[] = [];

  /** Turns gameplay events into visuals. `px, py` is the player position. */
  react(event: GameEvent, px: number, py: number): void {
    switch (event.type) {
      case 'flap':
        this.burst(px - 10, py + 12, 6, '#00f2c3', 60, 0.4);
        break;
      case 'pass':
        if (event.multiplier > 1) this.text(`+${event.points}`, px, py - 34, '#ffffff');
        break;
      case 'fever':
        this.text('FEVER!', px, py - 60, '#bd00ff');
        this.burst(px, py, 30, '#bd00ff', 220, 0.8);
        break;
      case 'pickup':
        this.burst(event.x, event.y, 14, event.kind === 'coin' ? '#ffd23f' : '#3fd8ff', 140, 0.6);
        this.text(event.kind === 'coin' ? '+1' : '+1 ◆', event.x, event.y - 20, event.kind === 'coin' ? '#ffd23f' : '#3fd8ff');
        break;
      case 'crash':
        this.burst(event.x, event.y, 28, '#e02476', 240, 0.9);
        break;
    }
  }

  update(dt: number): void {
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
      t.y -= 40 * dt;
    }
    this.texts = this.texts.filter((t) => t.life > 0);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      if (!p.active) continue;
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.font = 'bold 18px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'center';
    for (const t of this.texts) {
      ctx.globalAlpha = Math.min(1, t.life / TEXT_SECONDS * 1.5);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }

  clear(): void {
    for (const p of this.particles) p.active = false;
    this.texts = [];
  }

  private burst(x: number, y: number, count: number, color: string, speed: number, life: number): void {
    for (let i = 0; i < count; i++) {
      const p = this.particles.find((candidate) => !candidate.active);
      if (!p) return;
      const angle = Math.random() * Math.PI * 2;
      const velocity = speed * (0.3 + Math.random() * 0.7);
      Object.assign(p, {
        active: true, x, y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: life * (0.6 + Math.random() * 0.4),
        maxLife: life,
        size: 1.5 + Math.random() * 2,
        color,
      });
    }
  }

  private text(text: string, x: number, y: number, color: string): void {
    this.texts.push({ text, x, y, life: TEXT_SECONDS, color });
  }
}
