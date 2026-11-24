import { ADVENTURE_LEVELS, type LevelConfig } from '../config/levels';
import type { Skin } from '../config/skins';
import { THEMES } from '../config/theme';
import type { SaveData } from '../core/save';
import { isLevelOpen, levelStars } from '../meta/adventure';
import { button, byId, el, setText } from './dom';
import { skinPreview } from './panels';

/** Vertical distance between stops on the path, px. */
const STEP = 132;
/** Space above the last stop and below the first, px. */
const MARGIN = 120;

/**
 * Draws the Adventure map: a winding path from the bottom (level 1) upwards,
 * with finished levels showing their stars, the next one glowing with the
 * player's mushroom on it, and locked ones waiting further along.
 */
export function renderMap(
  save: SaveData,
  current: number,
  selected: number,
  skin: Skin,
  onPick: (levelId: number) => void,
): void {
  const container = byId('map-path');
  const height = MARGIN * 2 + STEP * (ADVENTURE_LEVELS.length - 1);
  container.style.height = `${height}px`;
  const stops = ADVENTURE_LEVELS.map((level, index) => ({ level, ...stopPosition(index, height) }));
  const reached = stops.filter((stop) => isLevelOpen(save, stop.level.id));

  const nodes = stops.map(({ level, x, y }) => {
    const open = isLevelOpen(save, level.id);
    const classes = ['map-node'];
    if (!open) classes.push('locked');
    if (level.id === current) classes.push('current');
    if (level.id === selected) classes.push('selected');
    if (hasBoss(level)) classes.push('boss');
    const node = button(open ? String(level.id) : '🔒', classes.join(' '), () => onPick(level.id));
    node.style.left = `${x}%`;
    node.style.top = `${y}px`;
    node.style.setProperty('--level-color', THEMES[level.theme].accent);
    node.setAttribute('aria-label', `Level ${level.id}: ${level.name}`);
    if (open) node.append(starRow(levelStars(save, level.id)));
    if (hasBoss(level)) node.append(el('span', 'map-node-tag', 'BOSS'));
    return node;
  });

  const marker = el('div', 'map-marker');
  const here = stops.find((stop) => stop.level.id === current);
  if (here) {
    marker.style.left = `${here.x}%`;
    marker.style.top = `${here.y}px`;
    marker.append(skinPreview(skin));
  }

  container.replaceChildren(pathLine(stops, height, 'trail'), pathLine(reached, height, 'travelled'), ...nodes, marker);
}

/** Scrolls the map so the given level sits in the middle of the view. */
export function scrollMapTo(levelId: number): void {
  const scroll = byId('map-scroll');
  const index = Math.max(0, ADVENTURE_LEVELS.findIndex((level) => level.id === levelId));
  const height = MARGIN * 2 + STEP * (ADVENTURE_LEVELS.length - 1);
  scroll.scrollTop = stopPosition(index, height).y - scroll.clientHeight / 2;
}

/** Total stars collected over all levels, shown in the map header. */
export function showMapStars(save: SaveData): void {
  const total = ADVENTURE_LEVELS.reduce((sum, level) => sum + levelStars(save, level.id), 0);
  setText(byId('map-stars'), `★ ${total}/${ADVENTURE_LEVELS.length * 3}`);
}

export function hasBoss(level: LevelConfig): boolean {
  return level.stages.some((stage) => stage.kind === 'boss');
}

/** Stops wind left and right as the path climbs; x in percent, y in px from the top. */
function stopPosition(index: number, height: number): { x: number; y: number } {
  return { x: 50 + Math.sin(index * 1.3) * 28, y: height - MARGIN - index * STEP };
}

function starRow(stars: number): HTMLElement {
  const row = el('span', 'map-node-stars');
  for (let i = 0; i < 3; i++) row.append(el('span', i < stars ? '' : 'empty', '★'));
  return row;
}

/** A smooth curve through the stops, drawn in percent across and px down. */
function pathLine(stops: readonly { x: number; y: number }[], height: number, className: string): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'map-line');
  svg.setAttribute('viewBox', `0 0 100 ${height}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('class', className);
  let d = '';
  stops.forEach((stop, i) => {
    if (i === 0) {
      d = `M ${stop.x} ${stop.y}`;
      return;
    }
    const prev = stops[i - 1]!;
    const midY = (prev.y + stop.y) / 2;
    d += ` C ${prev.x} ${midY}, ${stop.x} ${midY}, ${stop.x} ${stop.y}`;
  });
  path.setAttribute('d', d);
  svg.append(path);
  return svg;
}
