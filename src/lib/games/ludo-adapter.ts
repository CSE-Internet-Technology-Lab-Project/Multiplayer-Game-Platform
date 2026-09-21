import type { GameAction, GameAdapter, GameContext, GameResult } from "@/lib/game-contract";

export type LudoPlayer = { userId: string; team?: string | null };
export type LudoState = {
  players: LudoPlayer[];
  turnIndex: number;
  dice: number | null;
  rolledBy: string | null;
  pieces: Record<string, number[]>;
  winnerId: string | null;
  moves: number;
};

const FINISH = 56;
const PIECES_PER_PLAYER = 4;

export function createLudoState(players: LudoPlayer[]): LudoState {
  if (players.length < 2 || players.length > 4) throw new Error("Ludo requires 2 to 4 players");
  return { players, turnIndex: 0, dice: null, rolledBy: null, pieces: Object.fromEntries(players.map(({ userId }) => [userId, Array(PIECES_PER_PLAYER).fill(-1)])), winnerId: null, moves: 0 };
}

function currentPlayer(state: LudoState) {
  return state.players[state.turnIndex];
}

function advanceTurn(state: LudoState) {
  state.turnIndex = (state.turnIndex + 1) % state.players.length;
}

export const ludoAdapter: GameAdapter<LudoState> = {
  slug: "ludo",

  validateAction(state: LudoState, action: GameAction, context: GameContext) {
    if (state.winnerId) throw new Error("The game is already finished");
    const player = currentPlayer(state);
    if (!player || player.userId !== context.actorId) throw new Error("It is not your turn");
    if (action.type === "roll_dice") {
      if (state.dice !== null) throw new Error("Move the selected piece before rolling again");
      return;
    }
    if (action.type !== "move_piece") throw new Error("Unsupported Ludo action");
    if (state.dice === null || state.rolledBy !== context.actorId) throw new Error("Roll the dice first");
    const piece = action.payload.piece;
    if (!Number.isInteger(piece) || Number(piece) < 0 || Number(piece) >= PIECES_PER_PLAYER) throw new Error("Choose a piece from 1 to 4");
    const position = state.pieces[context.actorId]?.[Number(piece)];
    if (position === undefined) throw new Error("You are not a Ludo player");
    if (position === FINISH || (position === -1 && state.dice !== 6)) throw new Error("That piece cannot move with this roll");
    if (position >= 0 && position + state.dice > FINISH) throw new Error("That piece cannot move beyond the finish");
  },

  applyAction(state: LudoState, action: GameAction, context: GameContext) {
    const next = structuredClone(state);
    if (action.type === "roll_dice") {
      next.dice = Math.floor(Math.random() * 6) + 1;
      next.rolledBy = context.actorId;
      return next;
    }
    const piece = Number(action.payload.piece);
    const rolled = next.dice as number;
    const currentPosition = next.pieces[context.actorId][piece];
    const nextPosition = currentPosition === -1 ? 0 : currentPosition + rolled;
    next.pieces[context.actorId][piece] = nextPosition;
    next.moves += 1;
    if (nextPosition > 0 && nextPosition < FINISH) {
      for (const player of next.players) {
        if (player.userId === context.actorId) continue;
        next.pieces[player.userId] = next.pieces[player.userId].map((position) => position === nextPosition ? -1 : position);
      }
    }
    if (next.pieces[context.actorId].every((position) => position === FINISH)) next.winnerId = context.actorId;
    next.dice = null;
    next.rolledBy = null;
    if (!next.winnerId && rolled !== 6) advanceTurn(next);
    return next;
  },

  getResult(state: LudoState): GameResult {
    return state.winnerId ? { status: "FINISHED", winnerId: state.winnerId, outcome: "WIN", scores: { [state.winnerId]: 10 } } : { status: "ACTIVE" };
  },
};
