/**
 * One screen of the game (start, playing, game over...). Each state sets
 * itself up in `enter` and cleans up in `exit`, so no other code needs to
 * know which overlays or timers belong to it.
 */
export interface State {
  enter?(): void;
  exit?(): void;
  update?(dt: number): void;
  /** Player tapped the playfield (or pressed space). */
  onTap?(): void;
}

export class StateMachine<Name extends string> {
  private currentName: Name | null = null;

  constructor(private readonly states: Record<Name, State>) {}

  get current(): Name | null {
    return this.currentName;
  }

  go(name: Name): void {
    if (this.currentName !== null) this.states[this.currentName].exit?.();
    this.currentName = name;
    this.states[name].enter?.();
  }

  update(dt: number): void {
    if (this.currentName !== null) this.states[this.currentName].update?.(dt);
  }

  tap(): void {
    if (this.currentName !== null) this.states[this.currentName].onTap?.();
  }
}
