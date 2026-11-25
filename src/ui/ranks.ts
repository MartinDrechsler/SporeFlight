import { COUNTRY_CODES, flagOf } from '../config/countries';
import type { BoardData, BoardEntry } from '../online/leaderboardApi';
import { button, byId, el, setText } from './dom';

/** The leaderboard screen's lists. What a button does is passed in by the state. */
export function renderBoard(data: BoardData, onReport: (entry: BoardEntry, row: HTMLElement) => void): void {
  const list = byId('ranks-list');
  list.replaceChildren(
    ...data.entries.map((entry) => {
      const row = el('li', entry.you ? 'item you' : 'item');
      row.append(
        el('span', 'rank-number', `#${entry.rank}`),
        el('span', 'rank-flag', entry.country ? flagOf(entry.country) : ''),
        el('span', 'rank-name', entry.name),
        el('span', 'rank-score', String(entry.score)),
      );
      row.append(entry.you ? el('span') : button('⚑', 'report-button', () => onReport(entry, row)));
      return row;
    }),
  );
  const you = byId('ranks-you');
  you.hidden = data.you === null;
  if (data.you) setText(you, `YOUR RANK #${data.you.rank} · RECORD ${data.you.score}`);
}

export function clearBoard(): void {
  byId('ranks-list').replaceChildren();
  byId('ranks-you').hidden = true;
}

/** Shows a message instead of the list (loading, empty, offline). Empty text hides it. */
export function boardStatus(text: string): void {
  const status = byId('ranks-status');
  status.hidden = text === '';
  setText(status, text);
}

/** Fills a country picker: no country first, then every country by its name in the player's language. */
export function fillCountries(select: HTMLSelectElement, selected: string | null): void {
  if (select.options.length === 0) {
    const names = typeof Intl.DisplayNames === 'function' ? new Intl.DisplayNames(undefined, { type: 'region' }) : null;
    const named = COUNTRY_CODES.map((code) => ({ code, name: names?.of(code) ?? code })).sort((a, b) => a.name.localeCompare(b.name));
    select.append(new Option('NO COUNTRY', ''), ...named.map(({ code, name }) => new Option(`${flagOf(code)} ${name}`, code)));
  }
  select.value = selected ?? '';
}
