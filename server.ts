import "dotenv/config";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { userIdFromToken } from "./src/lib/auth";
import { getRoom, joinRoom, makeGameAction, makeMove } from "./src/lib/room-service";

const httpServer = createServer();
const configuredOrigins = new Set(
  [process.env.NEXT_PUBLIC_APP_ORIGIN, process.env.APP_ORIGIN, process.env.NEXT_PUBLIC_SOCKET_URL]
    .flatMap((value) => value ? value.split(",").map((origin) => origin.trim()).filter(Boolean) : [])
);
const isLocalOrigin = (origin: string) => /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
const io = new Server(httpServer, {
  cors: {
    // Local development permits localhost origins. Production must explicitly match the app origin,
    // but a missing deployment config should not silently break the live room flow.
    origin(origin, callback) {
      if (!origin || isLocalOrigin(origin) || configuredOrigins.has(origin)) return callback(null, true);
      if (process.env.NODE_ENV !== "production") return callback(null, true);
      callback(new Error("Origin is not allowed"));
    },
    methods: ["GET", "POST"],
  },
});
io.use((socket, next) => { const userId = userIdFromToken(socket.handshake.auth.token); if (!userId) return next(new Error("Unauthorized")); socket.data.userId = userId; next(); });
io.on("connection", (socket) => {
  socket.on("room:join", async (roomId: string) => { try { const room = await joinRoom(roomId, socket.data.userId); socket.join(roomId); io.to(roomId).emit("game:state", room); } catch (error) { socket.emit("game:error", error instanceof Error ? error.message : "Unable to join room"); } });
  socket.on("room:watch", async (roomId: string) => { const room = await getRoom(roomId); if (room) { socket.join(roomId); socket.emit("game:state", room); } });
  socket.on("game:move", async ({ roomId, cell }: { roomId: string; cell: number }) => { try { const room = await makeMove(roomId, socket.data.userId, cell); io.to(roomId).emit("game:state", room); } catch (error) { socket.emit("game:error", error instanceof Error ? error.message : "Move rejected"); } });
  socket.on("game:action", async ({ roomId, type, payload }: { roomId: string; type: string; payload?: Record<string, unknown> }) => { try { const room = await makeGameAction(roomId, socket.data.userId, { type, payload: payload || {} }); io.to(roomId).emit("game:state", room); } catch (error) { socket.emit("game:error", error instanceof Error ? error.message : "Action rejected"); } });
});
httpServer.listen(Number(process.env.SOCKET_PORT || 4000), "0.0.0.0", () => console.log(`Socket.IO listening on ${process.env.SOCKET_PORT || 4000}`));
