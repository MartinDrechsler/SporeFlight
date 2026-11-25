import { CHAPTERS } from '../config/chapters';
import { ADVENTURE_LEVELS, chapterLevels, secretLevels, type LevelConfig } from '../config/levels';
import type { Skin } from '../config/skins';
import { THEMES } from '../config/theme';
import type { SaveData } from '../core/save';
import { levelNumber, levelStars } from '../meta/adventure';
import { button, byId, el, setText } from './dom';
import { skinPreview } from './panels';

/** Vertical distance between stops on the path, px. */
const STEP = 132;
/** Space above the last stop and below the first, px. */
const MARGIN = 120;

/**
 * Draws the Adventure map: a winding path from the bottom (level 1) upwards,
 * with finished levels showing their stars, the next one glowing with the
 * player's mushroom on it, and locked ones waiting further along. Each
 * chapter starts with a banner; chapters not built yet wait at the top as
 * coming soon.
 */
export function renderMap(
  save: SaveData,
  current: number,
  selected: number,
  skin: Skin,
  onPick: (levelId: number) => void,
  /** Whether a level can be flown (normally isLevelOpen; everything in a playtest). */
  isOpen: (levelId: number) => boolean,
): void {
  const container = byId('map-path');
  const height = mapHeight();
  container.style.height = `${height}px`;
  const stops = ADVENTURE_LEVELS.map((level, index) => ({ level, ...stopPosition(index, height) }));
  const reached = stops.filter((stop) => isOpen(stop.level.id));

  const nodes = stops.map(({ level, x, y }) => {
    const open = isOpen(level.id);
    const classes = ['map-node'];
    if (!open) classes.push('locked');
    if (level.id === current) classes.push('current');
    if (level.id === selected) classes.push('selected');
    if (hasBoss(level)) classes.push('boss');
    const node = button(open ? String(levelNumber(level.id)) : '🔒', classes.join(' '), () => onPick(level.id));
    node.style.left = `${x}%`;
    node.style.top = `${y}px`;
    node.style.setProperty('--level-color', THEMES[level.theme].accent);
    node.setAttribute('aria-label', `Level ${levelNumber(level.id)}: ${level.name}`);
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

  // Secret levels, once found: beside the level whose secret gap leads there, on a dotted side path.
  const secrets = secretLevels().flatMap((level) => {
    if (!isOpen(level.id)) return [];
    const from = stops.find((stop) => stop.level.id === level.secretOf);
    if (!from) return [];
    const at = { x: from.x > 50 ? from.x - 34 : from.x + 34, y: from.y - STEP * 0.55 };
    const classes = ['map-node', 'secret'];
    if (level.id === current) classes.push('current');
    if (level.id === selected) classes.push('selected');
    const node = button('?', classes.join(' '), () => onPick(level.id));
    node.style.left = `${at.x}%`;
    node.style.top = `${at.y}px`;
    node.style.setProperty('--level-color', '#e3d9ff');
    node.setAttribute('aria-label', `Secret level: ${level.name}`);
    node.append(starRow(levelStars(save, level.id)), el('span', 'map-node-tag', 'SECRET'));
    return [{ node, line: pathLine([from, at], height, 'secret-trail') }];
  });

  container.replaceChildren(
    pathLine(stops, height, 'trail'),
    pathLine(reached, height, 'travelled'),
    ...secrets.map((s) => s.line),
    ...chapterBanners(isOpen, height),
    ...nodes,
    ...secrets.map((s) => s.node),
    marker,
  );
}

/** Map height: the stops, plus a step for each chapter still to come. */
function mapHeight(): number {
  const coming = CHAPTERS.filter((chapter) => chapterLevels(chapter.id).length === 0).length;
  return MARGIN * 2 + STEP * (ADVENTURE_LEVELS.length - 1 + coming);
}

/**
 * A banner where each chapter begins, just below its first stop (the path climbs
 * upwards); a chapter with no levels yet shows above the last stop as coming soon.
 */
function chapterBanners(isOpen: (levelId: number) => boolean, height: number): HTMLElement[] {
  let coming = 0;
  return CHAPTERS.map((chapter) => {
    const levels = chapterLevels(chapter.id);
    const banner = el('div', 'map-chapter');
    banner.style.setProperty('--chapter-color', chapter.color);
    banner.append(el('span', 'map-chapter-number', `CHAPTER ${chapter.id}`), el('span', 'map-chapter-name', chapter.name));
    let y: number;
    if (levels.length > 0) {
      const index = ADVENTURE_LEVELS.indexOf(levels[0]!);
      y = stopPosition(index, height).y + STEP * 0.48;
      if (!isOpen(levels[0]!.id)) banner.classList.add('locked');
    } else {
      coming += 1;
      y = stopPosition(ADVENTURE_LEVELS.length - 1 + coming, height).y;
      banner.classList.add('locked', 'soon');
      banner.append(el('span', 'map-chapter-soon', 'COMING SOON'));
    }
    banner.style.top = `${y}px`;
    return banner;
  });
}

/** Scrolls the map so the given level sits in the middle of the view. */
export function scrollMapTo(levelId: number): void {
  const scroll = byId('map-scroll');
  const index = Math.max(0, ADVENTURE_LEVELS.findIndex((level) => level.id === levelId));
  const height = mapHeight();
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
