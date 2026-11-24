import { flagOf } from '../config/countries';
import type { State } from '../core/stateMachine';
import { boardName, isJoined, join, leave, setCountry } from '../meta/leaderboard';
import { fetchBoard, forgetPlayer, newPlayerId, reportName, type BoardEntry } from '../online/leaderboardApi';
import { byId, setText } from '../ui/dom';
import { boardStatus, clearBoard, fillCountries, renderBoard } from '../ui/ranks';
import { showScreens } from '../ui/screens';
import { toast } from '../ui/toast';
import type { GameContext } from './context';
import { onBack } from './menu';
import { syncLeaderboard } from './syncLeaderboard';

const OFFLINE = "THE LEADERBOARD CAN'T BE REACHED RIGHT NOW.";

/**
 * The world and country leaderboard. Before joining, the player sees the top
 * of the world board, what joining stores, and a JOIN button.
 */
export function ranksState(ctx: GameContext): State {
  let scope: 'world' | 'country' = 'world';
  /** Bumped on every load, so a slow answer never overwrites a newer one. */
  let loading = 0;
  let confirmLeave = false;
  const joinCountry = byId<HTMLSelectElement>('ranks-join-country');
  const memberCountry = byId<HTMLSelectElement>('ranks-country');

  onBack(ctx, 'screen-ranks', 'start');
  byId('ranks-tab-world').addEventListener('click', () => switchTo('world'));
  byId('ranks-tab-country').addEventListener('click', () => switchTo('country'));

  byId('ranks-join-button').addEventListener('click', () => {
    ctx.audio.ui('reward');
    join(ctx.save, newPlayerId(), joinCountry.value || null);
    ctx.persist();
    showPanels();
    void syncLeaderboard(ctx).then(load);
  });

  memberCountry.addEventListener('change', () => {
    setCountry(ctx.save, memberCountry.value || null);
    ctx.persist();
    showPanels();
    void syncLeaderboard(ctx).then(load);
  });

  byId('ranks-rename').addEventListener('click', () => {
    ctx.audio.ui('click');
    ctx.go('username');
  });

  const leaveButton = byId('ranks-leave');
  leaveButton.addEventListener('click', async () => {
    const playerId = ctx.save.leaderboard.playerId;
    if (!playerId) return;
    if (!confirmLeave) {
      confirmLeave = true;
      setText(leaveButton, 'TAP AGAIN TO DELETE');
      return;
    }
    const result = await forgetPlayer(playerId);
    if (!result.ok) {
      toast(OFFLINE);
      return;
    }
    leave(ctx.save);
    ctx.persist();
    toast('YOUR ENTRY IS DELETED');
    scope = 'world';
    showPanels();
    void load();
  });

  const onReport = async (entry: BoardEntry, row: HTMLElement): Promise<void> => {
    const flag = row.querySelector('.report-button');
    if (!flag) return;
    if (flag.textContent !== 'REPORT?') {
      flag.textContent = 'REPORT?';
      return;
    }
    const result = await reportName(entry.pub);
    flag.textContent = result.ok ? 'REPORTED' : '⚑';
    if (result.ok) toast('THANKS, THE NAME IS REPORTED');
  };

  const switchTo = (next: 'world' | 'country'): void => {
    ctx.audio.ui('click');
    scope = next;
    showPanels();
    void load();
  };

  /** Which panels show, from whether the player has joined; tabs and pickers follow the save. */
  const showPanels = (): void => {
    const board = ctx.save.leaderboard;
    const joined = isJoined(ctx.save);
    if (!board.country && scope === 'country') scope = 'world';
    byId('ranks-join').hidden = joined;
    byId('ranks-member').hidden = !joined;
    byId('ranks-name-refused').hidden = !board.nameRefused;
    setText(byId('ranks-name'), boardName(ctx.save));
    fillCountries(memberCountry, board.country);
    byId('ranks-tab-world').classList.toggle('active', scope === 'world');
    const countryTab = byId<HTMLButtonElement>('ranks-tab-country');
    countryTab.classList.toggle('active', scope === 'country');
    countryTab.disabled = !board.country;
    setText(countryTab, board.country ? `${flagOf(board.country)} ${board.country}` : 'COUNTRY');
    confirmLeave = false;
    setText(leaveButton, 'LEAVE');
  };

  const load = async (): Promise<void> => {
    const ticket = ++loading;
    clearBoard();
    boardStatus('LOADING...');
    const board = ctx.save.leaderboard;
    const result = await fetchBoard(scope, scope === 'country' ? board.country : null, board.playerId);
    if (ticket !== loading || ctx.current() !== 'ranks') return;
    if (!result.ok) {
      boardStatus(OFFLINE);
      return;
    }
    // Before joining, suggest the country the player seems to be in.
    if (!isJoined(ctx.save) && joinCountry.value === '' && result.data.detectedCountry) {
      fillCountries(joinCountry, result.data.detectedCountry);
    }
    boardStatus(result.data.entries.length === 0 ? 'NO SCORES YET. BE THE FIRST!' : '');
    renderBoard(result.data, (entry, row) => void onReport(entry, row));
  };

  return {
    enter() {
      fillCountries(joinCountry, ctx.save.leaderboard.country);
      showPanels();
      showScreens('ranks');
      void syncLeaderboard(ctx).then(load);
    },
  };
}
