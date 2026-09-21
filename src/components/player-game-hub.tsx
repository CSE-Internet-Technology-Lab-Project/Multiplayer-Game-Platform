"use client";
/* eslint-disable react-hooks/refs */

import { FormEvent, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Gamepad2, LogOut, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type User = { id: string; username: string; score: number };
type Game = { id: string; slug: string; name: string; category: string; status: "PUBLISHED" };
type Room = { id: string; code: string; gameType: string; status: string; turn: string; winnerId?: string | null; playerXId: string; playerOId?: string | null; playerX: User; playerO?: User | null; board: unknown };
type LudoState = { turnIndex: number; dice: number | null; rolledBy: string | null; players: Array<{ userId: string; team?: string | null }>; pieces: Record<string, number[]>; winnerId: string | null; moves: number };

async function request<T>(url: string, options?: RequestInit) {
  const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...options?.headers } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data as T;
}

function Auth({ onAuth }: { onAuth: (user: User) => void }) {
  const [register, setRegister] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const data = await request<{ user: User }>(`/api/auth/${register ? "register" : "login"}`, { method: "POST", body: JSON.stringify({ username: form.get("username"), email: form.get("email"), password: form.get("password") }) });
      onAuth(data.user);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to sign in");
    }
  }
  return <main className="grid min-h-screen place-items-center bg-slate-950 px-5 text-slate-100"><form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-7"><div className="flex items-center gap-3 text-cyan-300"><Gamepad2 /><span className="font-semibold tracking-[.2em]">GRIDLINE</span></div><h1 className="text-2xl font-bold">{register ? "Create account" : "Welcome back"}</h1>{register && <Input name="username" required minLength={3} placeholder="Username" className="border-slate-700 bg-slate-950" />}<Input name="email" type="email" required placeholder="Email address" className="border-slate-700 bg-slate-950" /><Input name="password" type="password" required minLength={8} placeholder="Password (8+ characters)" className="border-slate-700 bg-slate-950" />{message && <p className="text-sm text-rose-300">{message}</p>}<Button type="submit" className="w-full bg-cyan-400 text-slate-950">{register ? "Create account" : "Sign in"}</Button><button type="button" onClick={() => setRegister(!register)} className="w-full text-sm text-cyan-300">{register ? "Already have an account? Sign in" : "Need an account? Register"}</button></form></main>;
}

function LudoBoard({ room, user, socket }: { room: Room; user: User; socket: Socket }) {
  const state = room.board as LudoState;
  if (!state || !state.pieces || !state.players) return <section className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-slate-100"><h2 className="text-2xl font-bold">Ludo · Room {room.code}</h2><p className="mt-2 text-slate-400">Waiting for an opponent to join before the Ludo board starts.</p><span className="mt-5 inline-flex rounded-full bg-cyan-300/10 px-3 py-1 text-xs text-cyan-300">WAITING</span></section>;
  const myTurn = room.turn === user.id;
  const myPieces = state.pieces[user.id] || [];
  const send = (type: string, payload: Record<string, unknown> = {}) => socket.emit("game:action", { roomId: room.id, type, payload });
  return <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-slate-100"><div className="flex items-center justify-between"><div><h2 className="text-2xl font-bold">Ludo · Room {room.code}</h2><p className="mt-1 text-sm text-slate-400">{state.winnerId ? "Game finished" : myTurn ? "Your turn" : "Waiting for the next player"}</p></div><span className="rounded-full bg-cyan-300/10 px-3 py-1 text-xs text-cyan-300">{room.status}</span></div><div className="mt-6 grid gap-3 sm:grid-cols-2">{state.players.map((player) => <div key={player.userId} className="rounded-xl bg-slate-950 p-4"><p className="text-xs uppercase tracking-widest text-slate-500">{player.team || "Player"}</p><p className="mt-1 font-semibold">{player.userId === user.id ? "You" : player.userId}</p><div className="mt-3 grid grid-cols-4 gap-2">{state.pieces[player.userId].map((position, index) => <span key={index} className="rounded-md bg-slate-800 p-2 text-center text-sm text-amber-300">{position < 0 ? "Home" : position === 56 ? "Done" : position}</span>)}</div></div>)}</div><div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-5 text-center"><p className="text-sm text-slate-400">Dice</p><p className="my-2 text-5xl font-bold text-cyan-300">{state.dice ?? "-"}</p><Button type="button" disabled={!myTurn || state.dice !== null || !!state.winnerId} onClick={() => send("roll_dice")} className="bg-cyan-400 text-slate-950">Roll dice</Button><div className="mt-5 grid grid-cols-4 gap-2">{myPieces.map((position, index) => <Button key={index} type="button" disabled={!myTurn || state.dice === null || position === 56 || !!state.winnerId} onClick={() => send("move_piece", { piece: index })} variant="secondary">Piece {index + 1}</Button>)}</div></div></section>;
}

function TicTacToeBoard({ room, user, socket }: { room: Room; user: User; socket: Socket }) {
  const board = room.board as Array<"X" | "O" | null>;
  const mark = room.playerXId === user.id ? "X" : room.playerOId === user.id ? "O" : null;
  const myTurn = mark === room.turn;
  return <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-slate-100"><div className="flex items-center justify-between"><div><h2 className="text-2xl font-bold">Tic-Tac-Toe · Room {room.code}</h2><p className="mt-1 text-sm text-slate-400">{room.status === "WAITING" ? "Waiting for an opponent" : room.status === "FINISHED" ? "Game finished" : myTurn ? "Your turn" : `${room.turn}'s turn`} {mark && `· You are ${mark}`}</p></div><span className="rounded-full bg-cyan-300/10 px-3 py-1 text-xs text-cyan-300">{room.status}</span></div><div className="mx-auto mt-6 grid max-w-sm grid-cols-3 gap-2">{board.map((cell, index) => <button key={index} type="button" disabled={!myTurn || room.status !== "ACTIVE" || !!cell} onClick={() => socket.emit("game:move", { roomId: room.id, cell: index })} className="grid aspect-square place-items-center rounded-xl bg-slate-800 text-4xl font-bold text-cyan-300 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:hover:bg-slate-800">{cell}</button>)}</div></section>;
}

function ResultPopup({ room, user }: { room: Room; user: User }) {
  if (room.status !== "FINISHED") return null;
  const draw = !room.winnerId;
  const winner = room.winnerId === user.id;
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 px-5 backdrop-blur-sm"><div className="w-full max-w-md rounded-2xl border border-cyan-300/30 bg-slate-900 p-8 text-center shadow-2xl"><div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-cyan-400/15 text-4xl">{draw ? "🤝" : winner ? "🏆" : "🎮"}</div><h2 className="text-3xl font-bold text-slate-100">{draw ? "Draw Match" : winner ? "Congratulations!" : "Game Over"}</h2><p className="mt-3 text-slate-400">{draw ? "The match ended in a draw." : winner ? "You won the match." : "Your opponent won this match."}</p><p className="mt-5 text-sm text-slate-500">The result and score have been saved.</p></div></div>;
}

export function PlayerGameHub() {
  const socket = useRef<Socket | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [selected, setSelected] = useState("TIC_TAC_TOE");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [room, setRoom] = useState<Room | null>(null);
  const [notice, setNotice] = useState("");
  useEffect(() => { request<{ user: User | null }>("/api/auth/me").then((data) => setUser(data.user)).catch(() => undefined); }, []);
  useEffect(() => {
    if (!user) return;
    request<{ games: Game[] }>("/api/games").then((data) => setGames(data.games.filter((game) => game.status === "PUBLISHED"))).catch(() => undefined);
    request<{ rooms: Room[] }>("/api/rooms").then((data) => setRooms(data.rooms)).catch(() => undefined);
    request<{ token: string }>("/api/auth/socket-token").then(({ token }) => {
      const connection = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000", { auth: { token } });
      socket.current = connection;
      connection.on("game:state", (nextRoom: Room) => { setRoom(nextRoom); setNotice(""); });
      connection.on("game:error", (message: string) => setNotice(message));
      connection.on("connect_error", () => setNotice("Live server unavailable."));
    }).catch(() => setNotice("Could not connect to live game service."));
    return () => { socket.current?.disconnect(); };
  }, [user]);
  const refreshRooms = () => request<{ rooms: Room[] }>("/api/rooms").then((data) => setRooms(data.rooms)).catch(() => undefined);
  const create = async () => { if (!socket.current) { setNotice("Live game service is still connecting. Refresh and try again."); return; } try { const data = await request<{ room: Room }>("/api/rooms", { method: "POST", body: JSON.stringify({ gameDefinitionId: selected === "TIC_TAC_TOE" ? undefined : selected }) }); socket.current.emit("room:join", data.room.id); refreshRooms(); } catch (error) { setNotice(error instanceof Error ? error.message : "Could not create room"); } };
  const join = (roomId: string) => { if (!socket.current) { setNotice("Live game service is still connecting. Refresh and try again."); return; } socket.current.emit("room:join", roomId); refreshRooms(); };
  const logout = async () => { await request("/api/auth/logout", { method: "POST" }); socket.current?.disconnect(); setUser(null); setRoom(null); };
  if (!user) return <Auth onAuth={setUser} />;
  return <main className="min-h-screen bg-slate-950 text-slate-100"><header className="border-b border-slate-800 px-5 py-4"><div className="mx-auto flex max-w-6xl items-center justify-between"><div className="flex items-center gap-3"><Gamepad2 className="text-cyan-300" /><span className="font-bold tracking-[.16em]">GRIDLINE</span></div><div className="flex items-center gap-3 text-sm"><span>{user.username} · {user.score} pts</span><Button type="button" size="icon" variant="ghost" onClick={logout} aria-label="Log out"><LogOut size={18} /></Button></div></div></header><div className="mx-auto grid max-w-6xl gap-6 px-5 py-8 lg:grid-cols-[.85fr_1.4fr]"><aside className="space-y-4"><section className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="flex items-center gap-2 font-semibold"><Trophy className="text-amber-300" size={18} /> Choose a published game</h2><select value={selected} onChange={(event) => setSelected(event.target.value)} className="mt-4 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm"><option value="TIC_TAC_TOE">Tic-Tac-Toe</option>{games.map((game) => <option key={game.id} value={game.id}>{game.name} · {game.category}</option>)}</select><Button type="button" onClick={create} className="mt-3 w-full bg-cyan-400 text-slate-950">Create room</Button></section><section className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="font-semibold">Open rooms</h2><div className="mt-4 space-y-2">{rooms.length ? rooms.map((openRoom) => <div key={openRoom.id} className="flex items-center justify-between rounded-lg bg-slate-950 p-3"><span className="text-sm">{openRoom.code} · {openRoom.gameType}</span><Button type="button" size="sm" onClick={() => join(openRoom.id)}>Join</Button></div>) : <p className="mt-3 text-sm text-slate-500">No open rooms.</p>}</div></section></aside><section>{room?.gameType === "ludo" ? <LudoBoard room={room} user={user} socket={socket.current!} /> : room ? <TicTacToeBoard room={room} user={user} socket={socket.current!} /> : <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-slate-400"><h2 className="text-xl font-semibold text-slate-100">Choose a room to play</h2><p className="mt-2">Create a room or join an open room to start playing.</p></div>}{notice && <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">{notice}</p>}</section></div>{room && <ResultPopup room={room} user={user} />}</main>;
}
