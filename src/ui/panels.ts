import { ACHIEVEMENTS } from '../config/rewards';
import { SKINS, type Price, type Skin } from '../config/skins';
import { TRAILS, trailById, type Trail } from '../config/trails';
import { canAfford, ownsLook, type LookKind } from '../meta/economy';
import type { SaveData } from '../core/save';
import { templateFor } from '../meta/quests';
import { button, byId, el, setText } from './dom';

/**
 * Menu lists built from data. Each function only draws; what a button does
 * is passed in by the state that owns the screen.
 */
/** A look in the shop, with what it costs and whether the player can wear it. */
export interface ShopItem {
  kind: LookKind;
  id: string;
  name: string;
  price: Price;
  preview: () => Element;
}

/** The shop: mushroom colours, then glow trails. */
export function renderShop(save: SaveData, onBuy: (item: ShopItem) => void, onSelect: (item: ShopItem) => void): void {
  setText(byId('shop-coins'), save.coins);
  setText(byId('shop-diamonds'), save.diamonds);
  const skins: ShopItem[] = SKINS.map((skin) => ({ kind: 'skin', id: skin.id, name: skin.name, price: skin.price, preview: () => skinPreview(skin) }));
  const trails: ShopItem[] = TRAILS.map((trail) => ({ kind: 'trail', id: trail.id, name: trail.name, price: trail.price, preview: () => trailPreview(trail) }));
  const row = (item: ShopItem): HTMLElement => {
    const li = el('li', 'item');
    li.append(item.preview());
    const info = el('div', 'item-info');
    info.append(el('span', 'item-name', item.name), el('span', `item-detail ${priceClass(item.price)}`, priceText(item.price)));
    li.append(info);
    const active = item.kind === 'skin' ? save.activeSkin : save.activeTrail;
    if (active === item.id) li.append(button('WEARING', 'item-button', null));
    else if (ownsLook(save, item.kind, item.id)) li.append(button('WEAR', 'item-button', () => onSelect(item)));
    else if ('badge' in item.price) li.append(button('BADGE', 'item-button', null));
    else li.append(button('BUY', 'item-button buy', canAfford(save, item.price) ? () => onBuy(item) : null));
    return li;
  };
  byId('shop-list').replaceChildren(
    el('li', 'list-heading', 'MUSHROOMS'),
    ...skins.map(row),
    el('li', 'list-heading', 'GLOW TRAILS'),
    ...trails.map(row),
  );
}

function priceText(price: Price): string {
  if ('badge' in price) return `BADGE: ${ACHIEVEMENTS.find((a) => a.id === price.badge)?.name ?? '?'}`;
  if ('diamonds' in price) return `${price.diamonds} DIAMONDS`;
  return price.coins === 0 ? 'FREE' : `${price.coins} COINS`;
}

function priceClass(price: Price): string {
  if ('badge' in price) return '';
  return 'diamonds' in price ? 'diamonds' : 'coins';
}

/** A row of the trail's colours, as dots that fade out behind. */
function trailPreview(trail: Trail): Element {
  const box = el('span', 'trail-preview');
  trail.colors.forEach((color, i) => {
    const dot = el('span', 'trail-dot');
    dot.style.background = color;
    dot.style.boxShadow = `0 0 6px ${color}`;
    dot.style.opacity = String(1 - i / (trail.colors.length + 1));
    box.append(dot);
  });
  return box;
}

export function renderBadges(save: SaveData): void {
  byId('badges-list').replaceChildren(
    ...ACHIEVEMENTS.map((achievement) => {
      const unlocked = save.achievements.includes(achievement.id);
      const item = el('li', unlocked ? 'item unlocked' : 'item locked');
      item.append(el('span', 'item-icon', unlocked ? '🏅' : '🔒'));
      const info = el('div', 'item-info');
      info.append(el('span', 'item-name', achievement.name), el('span', 'item-detail', achievement.description));
      if (achievement.trail) info.append(el('span', 'item-detail trail-unlock', `✨ Unlocks the ${trailById(achievement.trail).name} trail`));
      item.append(info);
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

/** Small drawing of a mushroom in a skin's colours. */
export function skinPreview(skin: Skin): SVGSVGElement {
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
