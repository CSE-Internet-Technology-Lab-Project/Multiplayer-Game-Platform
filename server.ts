import "dotenv/config";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { userIdFromToken } from "./src/lib/auth";
import { getRoom, joinRoom, makeMove } from "./src/lib/room-service";

const httpServer = createServer();
const configuredOrigins = process.env.NEXT_PUBLIC_APP_ORIGIN?.split(",").map((origin) => origin.trim()).filter(Boolean) ?? [];
const isLocalOrigin = (origin: string) => /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
const io = new Server(httpServer, {
  cors: {
    // Next dev can select 3001, 3002, etc. when the preferred port is busy.
    // Production remains restricted to the explicitly configured app origin(s).
    origin(origin, callback) {
      if (!origin || isLocalOrigin(origin) || configuredOrigins.includes(origin)) return callback(null, true);
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
});
httpServer.listen(Number(process.env.SOCKET_PORT || 4000), () => console.log(`Socket.IO listening on ${process.env.SOCKET_PORT || 4000}`));
