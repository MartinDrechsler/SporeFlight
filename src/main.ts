import '@fontsource/vt323/latin-400.css';
import './styles/base.css';
import './styles/screens.css';
import './styles/menus.css';
import { createMockAds, type RewardedAds } from './ads/ads';
import { Audio } from './audio/audio';
import { levelById, ENDLESS_LEVEL_ID } from './config/levels';
import { TUNING } from './config/tuning';
import { createLoop } from './core/loop';
import { createRandom, randomSeed } from './core/random';
import { browserStore, loadSave, writeSave } from './core/save';
import { StateMachine } from './core/stateMachine';
import { createWorld } from './gameplay/world';
import { createSurface, resizeSurface } from './render/canvas';
import { Effects } from './render/effects';
import { preloadImages } from './render/images';
import { renderScene } from './render/renderer';
import { adState } from './states/adState';
import { adventureOverState } from './states/adventureOverState';
import { badgesState } from './states/badgesState';
import type { GameContext, StateName } from './states/context';
import { gameOverState } from './states/gameOverState';
import { levelsState } from './states/levelsState';
import { playingState } from './states/playingState';
import { questsState } from './states/questsState';
import { roundOverState } from './states/roundOverState';
import { shopState } from './states/shopState';
import { startState } from './states/startState';
import { unlockState } from './states/unlockState';
import { usernameState } from './states/usernameState';
import { installTestHooks } from './testHooks';
import { byId } from './ui/dom';

/** Length of the stand-in ad; the real ad network decides this later. */
const AD_SECONDS = 10;

const params = new URLSearchParams(location.search);
const isTest = params.has('test');
const seedParam = Number(params.get('seed'));
let rng = createRandom(Number.isFinite(seedParam) && seedParam > 0 ? seedParam : randomSeed());

// Layout in CSS needs the ground height; pass it from the one place it is defined.
document.documentElement.style.setProperty('--ground-height', `${TUNING.world.groundHeight}px`);
preloadImages();

const canvas = byId<HTMLCanvasElement>('game-canvas');
const surface = createSurface(canvas);
const store = browserStore();
const save = loadSave(store);
// Test runs get an ad that finishes instantly, so flows can be checked quickly.
const ads: RewardedAds = createMockAds(isTest ? 0 : AD_SECONDS, TUNING.session.adSkippableAfterSeconds);

const ctx: GameContext = {
  world: createWorld(surface.width, surface.height, levelById(ENDLESS_LEVEL_ID), rng),
  save,
  audio: new Audio(save.soundOn),
  effects: new Effects(),
  ads,
  rng,
  levelId: ENDLESS_LEVEL_ID,
  lastScore: null,
  newWorld: (levelId) => createWorld(surface.width, surface.height, levelById(levelId), rng),
  go: (name) => machine.go(name),
  current: () => machine.current,
  persist: () => writeSave(store, save),
  now: () => Date.now(),
};

const machine = new StateMachine<StateName>({
  username: usernameState(ctx),
  start: startState(ctx),
  playing: playingState(ctx),
  roundOver: roundOverState(ctx),
  gameOver: gameOverState(ctx),
  ad: adState(ctx),
  adventureOver: adventureOverState(ctx),
  shop: shopState(ctx),
  badges: badgesState(ctx),
  quests: questsState(ctx),
  levels: levelsState(ctx),
  unlock: unlockState(ctx),
});

let time = 0;
const loop = createLoop(
  (dt) => {
    time += dt;
    machine.update(dt);
    ctx.effects.update(dt);
  },
  () =>
    renderScene(surface, {
      world: ctx.world,
      skinId: save.activeSkin,
      effects: ctx.effects,
      deathMarks: save.deathMarks[String(ctx.world.level.id)] ?? [],
      time,
    }),
);

setupInput();
setupLifecycle();
setupSoundToggle();

machine.go(save.username === null ? 'username' : 'start');
if (isTest) {
  installTestHooks(ctx, machine, loop, (seed) => {
    rng = createRandom(seed);
    ctx.rng = rng;
  });
} else {
  loop.start();
}

/**
 * Taps flap. Only the canvas and overlays marked `data-tap` count as the
 * playfield; buttons, inputs and menus handle their own touches.
 */
function setupInput(): void {
  const isPlayfield = (event: Event): boolean => {
    const target = event.target as HTMLElement;
    if (target.closest('button, input, label, a')) return false;
    return target === canvas || target.closest('[data-tap]') !== null;
  };
  const field = byId('game');
  field.addEventListener('pointerdown', (event) => {
    if (!isPlayfield(event)) return;
    ctx.audio.unlock();
    machine.tap();
  });
  // Stop the page from scrolling or zooming on the playfield. Elsewhere touches
  // must work normally: cancelling them would also cancel button clicks and list scrolling.
  field.addEventListener(
    'touchstart',
    (event) => {
      if (isPlayfield(event)) event.preventDefault();
    },
    { passive: false },
  );
  window.addEventListener('keydown', (event) => {
    if (event.code !== 'Space' || event.repeat || (event.target as HTMLElement).closest('input')) return;
    event.preventDefault();
    ctx.audio.unlock();
    machine.tap();
  });
}

/** Pause everything when the app goes to the background, and resize with the screen. */
function setupLifecycle(): void {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      loop.stop();
      writeSave(store, save);
    } else if (!isTest) {
      loop.start();
    }
  });
  window.addEventListener('resize', () => {
    resizeSurface(canvas, surface);
    // Only rebuild the field on the title screen, never mid-flight.
    if (machine.current === 'start') machine.go('start');
  });
}

function setupSoundToggle(): void {
  const soundButton = byId<HTMLButtonElement>('sound-button');
  const paint = (): void => {
    soundButton.textContent = save.soundOn ? '🔊' : '🔇';
    soundButton.setAttribute('aria-label', save.soundOn ? 'Mute sound' : 'Unmute sound');
  };
  paint();
  soundButton.addEventListener('click', () => {
    save.soundOn = !save.soundOn;
    ctx.audio.enabled = save.soundOn;
    ctx.audio.unlock();
    writeSave(store, save);
    paint();
  });
}
