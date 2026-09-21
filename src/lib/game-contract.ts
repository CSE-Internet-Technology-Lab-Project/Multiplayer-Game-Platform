export type GameAction = { type: string; payload: Record<string, unknown> };

export type GameContext = {
  roomId: string;
  actorId: string;
  participants: Array<{ userId: string; team?: string | null }>;
};

export type GameResult = {
  status: "ACTIVE" | "FINISHED";
  winnerId?: string | null;
  outcome?: string;
  scores?: Record<string, number>;
};

export interface GameAdapter<State = unknown> {
  readonly slug: string;
  validateAction(state: State, action: GameAction, context: GameContext): void;
  applyAction(state: State, action: GameAction, context: GameContext): State;
  getResult(state: State, context: GameContext): GameResult;
}

const adapters = new Map<string, GameAdapter>();

export function registerGameAdapter(adapter: GameAdapter) {
  if (adapters.has(adapter.slug)) throw new Error(`Game adapter already registered: ${adapter.slug}`);
  adapters.set(adapter.slug, adapter);
}

export function getGameAdapter(slug: string) {
  return adapters.get(slug);
}

export function listGameAdapters() {
  return [...adapters.keys()];
}
