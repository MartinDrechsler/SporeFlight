import type { Player } from './player';

/** A vertical band of moving air that pushes the mushroom up or down. */
export interface WindZone {
  kind: 'updraft' | 'downdraft';
  x: number;
  width: number;
}

export function windContains(zone: WindZone, player: Player): boolean {
  return player.x + player.radius > zone.x && player.x - player.radius < zone.x + zone.width;
}
