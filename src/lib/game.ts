export type Mark = "X" | "O";
export type Board = (Mark | null)[];
export const emptyBoard: Board = Array(9).fill(null);
const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
export function winner(board: Board): Mark | "DRAW" | null { for (const [a,b,c] of LINES) if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a]; return board.every(Boolean) ? "DRAW" : null; }
export function roomCode() { return Math.random().toString(36).slice(2, 8).toUpperCase(); }
