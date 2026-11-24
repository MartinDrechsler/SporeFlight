import { TUNING } from '../config/tuning';

/**
 * Player names are public on the leaderboard, so they follow one set of rules
 * everywhere: the name screen and the server both use these.
 */

/** Trims, squeezes spaces and keeps only letters, digits and a few signs. Empty means unusable. */
export function cleanName(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFC')
    .replace(/[^\p{L}\p{N} _.-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, TUNING.session.usernameMaxLength);
}

/**
 * Words a name must not contain, matched after undoing common disguises
 * (0 for o, 1 for i, $ for s, spaces and dots between letters). A short
 * starting list; reports from players catch what it misses.
 */
// Words that also hide inside ordinary names (grape, spicy, peacock, Nazir, Churer) are left out on purpose.
const BLOCKED = [
  'fuck', 'shit', 'cunt', 'bitch', 'whore', 'slut', 'pussy', 'penis', 'vagina', 'porn',
  'hitler', 'nigger', 'nigga', 'faggot', 'retard', 'kike',
  'fotze', 'wichser', 'arschloch', 'schwuchtel', 'missgeburt', 'kanake', 'nutte', 'ficken',
];

const DISGUISES: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '@': 'a', $: 's', '!': 'i' };

export function isOffensive(name: string): boolean {
  const plain = [...name.toLowerCase()].map((c) => DISGUISES[c] ?? c).join('').replace(/[^a-zäöüß]/g, '');
  return BLOCKED.some((word) => plain.includes(word));
}
