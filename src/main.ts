import '@fontsource/vt323/latin-400.css';
import './styles/base.css';
import './styles/screens.css';
import './styles/menus.css';
import { createMockAds, type RewardedAds } from './ads/ads';
import { Audio } from './audio/audio';
import type { Track } from './audio/music';
import { levelById, ENDLESS_LEVEL_ID } from './config/levels';
import { TUNING } from './config/tuning';
import { createLoop } from './core/loop';
import { createRandom, nextSeed, randomSeed } from './core/random';
import { browserStore, loadSave, writeSave } from './core/save';
import { StateMachine } from './core/stateMachine';
import { createWorld } from './gameplay/world';
import { createSurface, resizeSurface } from './render/canvas';
import { Effects } from './render/effects';
import { renderScene } from './render/renderer';
import { adState } from './states/adState';
import { adventureOverState } from './states/adventureOverState';
import { badgesState } from './states/badgesState';
import type { GameContext, StateName } from './states/context';
import { gameOverState } from './states/gameOverState';
import { levelCompleteState } from './states/levelCompleteState';
import { levelsState } from './states/levelsState';
import { playingState } from './states/playingState';
import { questsState } from './states/questsState';
import { roundOverState } from './states/roundOverState';
import { ranksState } from './states/ranksState';
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

const canvas = byId<HTMLCanvasElement>('game-canvas');
const surface = createSurface(canvas);
const store = browserStore();
const save = loadSave(store);
// Test runs get an ad that finishes instantly, so flows can be checked quickly.
const ads: RewardedAds = createMockAds(isTest ? 0 : AD_SECONDS, TUNING.session.adSkippableAfterSeconds);

let earlierMarks: readonly number[] = [];
const ctx: GameContext = {
  world: createWorld(surface.width, surface.height, levelById(ENDLESS_LEVEL_ID), nextSeed(rng)),
  save,
  audio: new Audio(save.soundOn),
  effects: new Effects(),
  ads,
  rng,
  levelId: ENDLESS_LEVEL_ID,
  lastScore: null,
  newWorld: (levelId, startY) => {
    // Clumps from earlier rounds; this round's clump only grows once the mushroom has landed.
    earlierMarks = save.deathMarks[String(levelId)] ?? [];
    // Every round gets its own seed, so it can be replayed on its own.
    return createWorld(surface.width, surface.height, levelById(levelId), nextSeed(rng), startY);
  },
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
  levelComplete: levelCompleteState(ctx),
  shop: shopState(ctx),
  ranks: ranksState(ctx),
  badges: badgesState(ctx),
  quests: questsState(ctx),
  levels: levelsState(ctx),
  unlock: unlockState(ctx),
});

/** The music behind each screen: the calm loop in menus, the faster one in flight, none during an ad. */
const MUSIC: Record<StateName, Track | null> = {
  username: 'menu', start: 'menu', shop: 'menu', ranks: 'menu', badges: 'menu', quests: 'menu', levels: 'menu', unlock: 'menu',
  gameOver: 'menu', adventureOver: 'menu', levelComplete: 'menu',
  playing: 'flight', roundOver: 'flight',
  ad: null,
};

let time = 0;
const loop = createLoop(
  (dt) => {
    time += dt;
    machine.update(dt);
    ctx.effects.update(dt);
    ctx.audio.setMusic(machine.current === null ? null : MUSIC[machine.current]);
  },
  () =>
    renderScene(surface, {
      world: ctx.world,
      skinId: save.activeSkin,
      effects: ctx.effects,
      deathMarks: earlierMarks,
      time,
    }),
);

setupInput();
setupAudioUnlock();
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

/**
 * iPhone Safari only lets a page start sound from the end of a touch or a click,
 * never from its start (where flaps happen, for speed). So every finished touch,
 * click or key press anywhere offers audio a chance to start, or to resume after
 * iOS interrupted it (a call, another app).
 */
function setupAudioUnlock(): void {
  for (const type of ['touchend', 'pointerup', 'click', 'keydown']) {
    document.addEventListener(type, () => ctx.audio.unlock(), { capture: true, passive: true });
  }
}

/** Pause everything when the app goes to the background, and resize with the screen. */
function setupLifecycle(): void {
  document.addEventListener('visibilitychange', () => {
    ctx.audio.setHidden(document.hidden);
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
    ctx.audio.unlock();
    ctx.audio.setEnabled(save.soundOn);
    writeSave(store, save);
    paint();
  });
}
