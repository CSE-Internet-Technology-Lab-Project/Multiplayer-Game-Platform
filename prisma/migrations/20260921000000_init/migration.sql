CREATE SCHEMA IF NOT EXISTS "public";

CREATE TYPE "RoomStatus" AS ENUM ('WAITING', 'ACTIVE', 'FINISHED');
CREATE TYPE "MatchOutcome" AS ENUM ('X_WIN', 'O_WIN', 'DRAW');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "score" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GameRoom" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "gameType" TEXT NOT NULL DEFAULT 'TIC_TAC_TOE',
  "status" "RoomStatus" NOT NULL DEFAULT 'WAITING',
  "board" JSONB NOT NULL DEFAULT '[null,null,null,null,null,null,null,null,null]',
  "turn" TEXT NOT NULL DEFAULT 'X',
  "playerXId" TEXT NOT NULL,
  "playerOId" TEXT,
  "winnerId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  CONSTRAINT "GameRoom_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Match" (
  "id" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "playerXId" TEXT NOT NULL,
  "playerOId" TEXT NOT NULL,
  "winnerId" TEXT,
  "outcome" "MatchOutcome" NOT NULL,
  "moves" INTEGER NOT NULL,
  "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "GameRoom_code_key" ON "GameRoom"("code");
CREATE INDEX "GameRoom_status_createdAt_idx" ON "GameRoom"("status", "createdAt");
CREATE UNIQUE INDEX "Match_roomId_key" ON "Match"("roomId");
CREATE INDEX "Match_completedAt_idx" ON "Match"("completedAt");

ALTER TABLE "GameRoom" ADD CONSTRAINT "GameRoom_playerXId_fkey" FOREIGN KEY ("playerXId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GameRoom" ADD CONSTRAINT "GameRoom_playerOId_fkey" FOREIGN KEY ("playerOId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GameRoom" ADD CONSTRAINT "GameRoom_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Match" ADD CONSTRAINT "Match_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "GameRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Match" ADD CONSTRAINT "Match_playerXId_fkey" FOREIGN KEY ("playerXId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Match" ADD CONSTRAINT "Match_playerOId_fkey" FOREIGN KEY ("playerOId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Match" ADD CONSTRAINT "Match_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
