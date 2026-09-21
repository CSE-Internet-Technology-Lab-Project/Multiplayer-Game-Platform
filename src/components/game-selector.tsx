"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { Gamepad2 } from "lucide-react";
import { Card } from "@/components/ui/card";

type Game = { id: string; slug: string; name: string; category: string; status: "PUBLISHED"; definition: Record<string, unknown> };

export function GameSelector() {
  const [games, setGames] = useState<Game[]>([]);
  const [selected, setSelected] = useState("TIC_TAC_TOE");
  useEffect(() => {
    const saved = document.cookie.split("; ").find((item) => item.startsWith("gridline_game="))?.split("=")[1];
    if (saved) setSelected(decodeURIComponent(saved));
    fetch("/api/games").then(async (response) => { if (response.ok) setGames((await response.json()).games.filter((game: Game) => game.status === "PUBLISHED")); });
  }, []);
  function choose(value: string) { setSelected(value); document.cookie = `gridline_game=${encodeURIComponent(value)}; Path=/; SameSite=Lax`; }
  return <Card className="fixed right-4 top-4 z-40 flex items-center gap-3 border-slate-700 bg-slate-900/95 px-3 py-2 text-slate-100 shadow-xl backdrop-blur"><Gamepad2 size={17} className="text-cyan-300" /><label className="text-xs text-slate-400" htmlFor="game-choice">Game</label><select id="game-choice" value={selected} onChange={(event) => choose(event.target.value)} className="max-w-48 rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-cyan-300"><option value="TIC_TAC_TOE">Tic-Tac-Toe · playable</option>{games.map((game) => <option key={game.id} value={game.id} disabled>{game.name} · {game.category} · adapter coming soon</option>)}</select></Card>;
}
