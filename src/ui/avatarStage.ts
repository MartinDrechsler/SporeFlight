import type { AnimationId } from '../config/animations';
import { drawAvatarScene, type SceneLook } from '../render/avatarScene';
import type { Timeline } from '../config/animations';
import { AvatarPlayer } from '../render/timeline';

/**
 * A small canvas on a menu screen where the avatar acts out an animation
 * (resting when out of lives, showing off a new look). The owning state
 * calls `update` every frame while its screen is shown.
 */
export class AvatarStage {
  private readonly player = new AvatarPlayer();
  private readonly ctx: CanvasRenderingContext2D;
  private look: SceneLook;
  private time = 0;
  private revealed = false;
  private onReveal: (() => void) | null = null;

  constructor(private readonly canvas: HTMLCanvasElement, look: SceneLook) {
    this.ctx = canvas.getContext('2d')!;
    this.look = look;
  }

  /** Starts an animation; `onReveal` runs once, at the moment the new look appears. */
  play(animation: AnimationId | Timeline, look: SceneLook, onReveal?: () => void): void {
    this.player.play(animation);
    this.look = look;
    this.revealed = false;
    this.onReveal = onReveal ?? null;
  }

  update(dt: number): void {
    this.time += dt;
    const frame = this.player.update(dt);
    if (frame.revealed && !this.revealed) {
      this.revealed = true;
      this.onReveal?.();
    }
    // Sharp on every screen: the backing store follows the canvas's size on the page.
    const box = this.canvas.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return;
    const ratio = Math.min(3, window.devicePixelRatio || 1);
    const w = Math.round(box.width * ratio);
    const h = Math.round(box.height * ratio);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    drawAvatarScene(this.ctx, box.width, box.height, frame, this.look, this.time);
  }
}
