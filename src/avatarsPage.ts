import '@fontsource/vt323/latin-400.css';
import { ANIMATIONS, type AnimationId } from './config/animations';
import { EXPRESSIONS, type ExpressionId } from './config/expressions';
import { SKINS } from './config/skins';
import { trailById } from './config/trails';
import { createLoop } from './core/loop';
import type { SceneLook } from './render/avatarScene';
import { holdFace } from './render/timeline';
import { jumpShape } from './render/jump';
import { drawMushroom } from './render/mushroom';
import { TUNING } from './config/tuning';
import { AvatarStage } from './ui/avatarStage';

/**
 * A page (avatars.html) that plays every avatar animation and shows every
 * face, so a new animation can be checked by eye. Not part of the game.
 */
const LOOKS: Partial<Record<AnimationId, SceneLook>> = {
  reveal: { skin: SKINS[0]!, newSkin: SKINS[2]!, trail: trailById('spores') },
};

const root = document.getElementById('avatars')!;
document.body.style.cssText = 'margin:0;background:#03100d;color:#e8f6ff;font-family:VT323,monospace;';
root.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;padding:16px;';

const stages: AvatarStage[] = [];
const card = (label: string, build: (stage: AvatarStage) => void): void => {
  const box = document.createElement('section');
  box.style.cssText = 'background:#0b2a22;border-radius:12px;padding:8px;text-align:center;font-size:22px;cursor:pointer;';
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'width:100%;height:150px;display:block;';
  box.append(canvas, label);
  root.append(box);
  const stage = new AvatarStage(canvas, { skin: SKINS[0]! });
  build(stage);
  box.addEventListener('click', () => build(stage));
  stages.push(stage);
};

for (const id of Object.keys(ANIMATIONS) as AnimationId[]) {
  card(id, (stage) => stage.play(id, LOOKS[id] ?? { skin: SKINS[0]! }));
}
// Each face held still: a one-cue animation built on the spot.
for (const face of Object.keys(EXPRESSIONS) as ExpressionId[]) {
  card(`face: ${face}`, (stage) => stage.play(holdFace(face), { skin: SKINS[0]! }));
}

// One flap, frame by frame (every 1/30 s), as the flight draws it: squeeze, stretch forward, lean, dive.
const strip = document.createElement('section');
strip.style.cssText = 'grid-column:1/-1;background:#0b2a22;border-radius:12px;padding:8px;text-align:center;font-size:22px;';
const film = document.createElement('canvas');
film.style.cssText = 'width:100%;height:110px;display:block;';
strip.append(film, 'jump: one flap, every 1/30 s');
root.prepend(strip);
requestAnimationFrame(() => {
  const box = film.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  film.width = box.width * ratio;
  film.height = box.height * ratio;
  const g = film.getContext('2d')!;
  g.scale(ratio, ratio);
  const P = TUNING.player;
  const apex = -P.flapVelocity / P.gravity;
  const frames = 16;
  const step = box.width / frames;
  for (let i = 0; i < frames; i++) {
    const t = i / 30;
    const vy = t < apex ? P.flapVelocity + P.gravity * t : (t - apex) * P.fallGravity;
    const shape = jumpShape(t, vy);
    g.save();
    g.translate(step * (i + 0.5), box.height * 0.5);
    g.rotate(shape.tilt);
    g.scale(shape.scaleX, shape.scaleY);
    drawMushroom(g, Math.min(22, step * 0.32), {
      skin: SKINS[0]!, face: EXPRESSIONS.neutral, gaze: { x: 0, y: 0, blink: 0 }, faceVisible: true, glow: 0, flash: 0,
    });
    g.restore();
  }
});

createLoop(
  (dt) => {
    for (const stage of stages) stage.update(dt);
  },
  () => {},
).start();
