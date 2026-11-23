import { ADVENTURE_LEVELS, starsFor } from '../config/levels';
import { ACHIEVEMENTS } from '../config/rewards';
import { SKINS, type Skin } from '../config/skins';
import { THEMES } from '../config/theme';
import type { SaveData } from '../core/save';
import { templateFor } from '../meta/quests';
import { button, byId, el, setText, starText } from './dom';

/**
 * Menu lists built from data. Each function only draws; what a button does
 * is passed in by the state that owns the screen.
 */
export function renderShop(save: SaveData, onBuy: (skin: Skin) => void, onSelect: (skin: Skin) => void): void {
  setText(byId('shop-coins'), save.coins);
  const list = byId('shop-list');
  list.replaceChildren(
    ...SKINS.map((skin) => {
      const item = el('li', 'item');
      item.append(skinPreview(skin));
      const info = el('div', 'item-info');
      info.append(el('span', 'item-name', skin.name), el('span', 'item-detail coins', skin.cost === 0 ? 'FREE' : `${skin.cost} COINS`));
      item.append(info);

      const owned = save.ownedSkins.includes(skin.id);
      if (save.activeSkin === skin.id) item.append(button('SELECTED', 'item-button', null));
      else if (owned) item.append(button('SELECT', 'item-button', () => onSelect(skin)));
      else item.append(button(`BUY ${skin.cost}`, 'item-button buy', save.coins >= skin.cost ? () => onBuy(skin) : null));
      return item;
    }),
  );
}

export function renderBadges(save: SaveData): void {
  byId('badges-list').replaceChildren(
    ...ACHIEVEMENTS.map((achievement) => {
      const unlocked = save.achievements.includes(achievement.id);
      const item = el('li', unlocked ? 'item unlocked' : 'item locked');
      item.append(el('span', 'item-icon', unlocked ? '🏅' : '🔒'));
      const info = el('div', 'item-info');
      info.append(el('span', 'item-name', achievement.name), el('span', 'item-detail', achievement.description));
      item.append(info, el('span', 'item-reward coins', `+${achievement.reward}`));
      return item;
    }),
  );
}

export function renderQuests(save: SaveData, onClaim: (index: number) => void): void {
  byId('quests-list').replaceChildren(
    ...save.quests.list.map((quest, index) => {
      const template = templateFor(quest.kind);
      const done = quest.progress >= template.target;
      const item = el('li', done ? 'item quest done' : 'item quest');
      const top = el('div', 'quest-top');
      top.append(el('span', 'item-name', template.text), el('span', 'item-reward coins', `+${template.reward}`));
      const bar = el('div', 'quest-bar');
      const fill = el('span');
      fill.style.width = `${(quest.progress / template.target) * 100}%`;
      bar.append(fill);
      const bottom = el('div', 'quest-bottom');
      bottom.append(bar, el('span', 'item-detail', `${quest.progress}/${template.target}`));
      item.append(top, bottom);
      if (done) {
        item.append(quest.claimed ? button('CLAIMED', 'item-button', null) : button('CLAIM REWARD', 'item-button buy', () => onClaim(index)));
      }
      return item;
    }),
  );
}

export function renderLevels(save: SaveData, selectedId: number | null, onPick: (levelId: number) => void): void {
  byId('levels-grid').replaceChildren(
    ...ADVENTURE_LEVELS.map((level) => {
      const best = save.levelBest[level.id] ?? 0;
      const tile = button('', level.id === selectedId ? 'level-tile selected' : 'level-tile', () => onPick(level.id));
      tile.style.setProperty('--level-color', THEMES[level.theme].accent);
      tile.append(el('span', 'level-number', String(level.id)), el('span', 'stars', starText(starsFor(best))));
      return tile;
    }),
  );
}

/** Small drawing of a mushroom in a skin's colours. */
function skinPreview(skin: Skin): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '-22 -26 44 48');
  svg.setAttribute('class', 'skin-preview');
  svg.innerHTML =
    `<rect x="-7" y="-4" width="14" height="22" rx="5" fill="#f2ead8"/>` +
    `<path d="M-20 -2 A20 18 0 0 1 20 -2 Z" fill="${skin.capMain}"/>` +
    `<circle cx="-8" cy="-10" r="3.5" fill="${skin.spots}"/><circle cx="6" cy="-14" r="2.5" fill="${skin.spots}"/>` +
    `<circle cx="-3" cy="6" r="1.5" fill="#1a1a1a"/><circle cx="3" cy="6" r="1.5" fill="#1a1a1a"/>`;
  return svg;
}
