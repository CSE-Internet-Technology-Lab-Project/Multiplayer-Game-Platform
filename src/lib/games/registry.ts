import { getGameAdapter, registerGameAdapter } from "@/lib/game-contract";
import { ludoAdapter } from "@/lib/games/ludo-adapter";

let initialized = false;

export function initializeGameAdapters() {
  if (initialized) return;
  registerGameAdapter(ludoAdapter);
  initialized = true;
}

export function playableGame(slug: string) {
  initializeGameAdapters();
  return getGameAdapter(slug);
}
