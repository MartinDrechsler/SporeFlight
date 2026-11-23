import './styles/base.css';
import './styles/screens.css';
import { Audio } from './audio/audio';
import { CLASSIC_SKIN, FOREST_THEME } from './config/theme';
import { TUNING } from './config/tuning';
import { createLoop } from './core/loop';
import { createRandom, randomSeed } from './core/random';
import { browserStore, loadSave, writeSave } from './core/save';
import { StateMachine } from './core/stateMachine';
import { createWorld } from './gameplay/world';
import { createSurface, resizeSurface } from './render/canvas';
import { Effects } from './render/effects';
import { renderScene } from './render/renderer';
import type { GameContext, StateName } from './states/context';
import { gameOverState } from './states/gameOverState';
import { playingState } from './states/playingState';
import { roundOverState } from './states/roundOverState';
import { startState } from './states/startState';
import { installTestHooks } from './testHooks';
import { byId } from './ui/dom';

const params = new URLSearchParams(location.search);
const isTest = params.has('test');
const seedParam = Number(params.get('seed'));
let rng = createRandom(Number.isFinite(seedParam) && seedParam > 0 ? seedParam : randomSeed());

// Layout in CSS needs the ground height; pass it from the one place it is defined.
document.documentElement.style.setProperty('--ground-height', `${TUNING.world.groundHeight}px`);

const canvas = byId<HTMLCanvasElement>('game-canvas');
const surface = createSurface(canvas);
const store = browserStore();
const save = loadSave(store, TUNING.session.lives);

const ctx: GameContext = {
  world: createWorld(surface.width, surface.height, rng),
  save,
  store,
  audio: new Audio(save.soundOn),
  effects: new Effects(),
  theme: FOREST_THEME,
  skin: CLASSIC_SKIN,
  lastScore: null,
  now: () => Date.now(),
  newWorld: () => createWorld(surface.width, surface.height, rng),
  go: (name) => machine.go(name),
};

const machine = new StateMachine<StateName>({
  start: startState(ctx),
  playing: playingState(ctx),
  roundOver: roundOverState(ctx),
  gameOver: gameOverState(ctx),
});

let time = 0;
const loop = createLoop(
  (dt) => {
    time += dt;
    machine.update(dt);
  },
  () => renderScene(surface, { world: ctx.world, theme: ctx.theme, skin: ctx.skin, effects: ctx.effects, time }),
);

setupInput();
setupLifecycle();
setupSoundToggle();

machine.go('start');
if (isTest) {
  installTestHooks(ctx, machine, loop, (seed) => (rng = createRandom(seed)));
} else {
  loop.start();
}

/** Taps on the playfield flap. Buttons in overlays handle their own clicks. */
function setupInput(): void {
  const field = byId('game');
  const isButton = (event: Event): boolean => (event.target as HTMLElement).closest('button') !== null;
  field.addEventListener('pointerdown', (event) => {
    if (isButton(event)) return;
    ctx.audio.unlock();
    machine.tap();
  });
  // Stop the page from scrolling or zooming. Buttons are exempt, because
  // cancelling their touchstart would also cancel their click on phones.
  field.addEventListener(
    'touchstart',
    (event) => {
      if (!isButton(event)) event.preventDefault();
    },
    { passive: false },
  );
  window.addEventListener('keydown', (event) => {
    if (event.code !== 'Space' || event.repeat) return;
    event.preventDefault();
    ctx.audio.unlock();
    machine.tap();
  });
  byId('start-button').addEventListener('click', () => {
    ctx.audio.unlock();
    machine.tap();
  });
}

/** Pause everything when the app goes to the background, and resize with the screen. */
function setupLifecycle(): void {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      loop.stop();
      writeSave(store, ctx.save);
    } else if (!isTest) {
      loop.start();
    }
  });
  window.addEventListener('resize', () => {
    resizeSurface(canvas, surface);
    // Only rebuild the field between rounds, never mid-flight.
    if (machine.current === 'start') machine.go('start');
  });
}

function setupSoundToggle(): void {
  const button = byId<HTMLButtonElement>('sound-button');
  const paint = (): void => {
    button.textContent = ctx.save.soundOn ? '🔊' : '🔇';
    button.setAttribute('aria-label', ctx.save.soundOn ? 'Mute sound' : 'Unmute sound');
  };
  paint();
  button.addEventListener('click', () => {
    ctx.save.soundOn = !ctx.save.soundOn;
    ctx.audio.enabled = ctx.save.soundOn;
    ctx.audio.unlock();
    writeSave(store, ctx.save);
    paint();
  });
}
