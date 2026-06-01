import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import mongoose from "mongoose";
import Conversation from "../models/conversation.model.js";
import User from "../models/user.model.js";
import cookie from "cookie";

let io;

export const shouldUseRedisAdapter = (redisUrl = process.env.REDIS_URL) =>
  typeof redisUrl === "string" && redisUrl.trim().length > 0;

const setupRedisAdapter = async (socketServer) => {
  if (!shouldUseRedisAdapter()) {
    return false;
  }

  const redisUrl = process.env.REDIS_URL.trim();
  const pubClient = createClient({ url: redisUrl });
  const subClient = pubClient.duplicate();

  pubClient.on("error", (err) => console.error("Redis Pub Client Error", err));
  subClient.on("error", (err) => console.error("Redis Sub Client Error", err));

  try {
    await Promise.all([pubClient.connect(), subClient.connect()]);
    socketServer.adapter(createAdapter(pubClient, subClient));
    return true;
  } catch (err) {
    console.warn("Socket.io Redis adapter unavailable; continuing with in-memory adapter.", err);
    await Promise.allSettled([
      pubClient.disconnect?.(),
      subClient.disconnect?.(),
    ]);
    return false;
  }
};
export const initSocket = async (server) => {
  io = new Server(server, {
    cors: {
      origin: ["http://localhost:3000", "https://vector-lac.vercel.app", process.env.FRONTEND_URL].filter(Boolean),
      credentials: true,
    },
  });

  await setupRedisAdapter(io);

  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      if (!cookieHeader) {
        console.error("Socket authentication error: No cookies found in handshake");
        return next(new Error("Authentication error: No cookies found"));
      }
      const cookies = cookie.parse(cookieHeader);
      const token = cookies.token;
      if (!token) {
        console.error("Socket authentication error: Token missing from cookies");
        return next(new Error("Authentication error: Token missing"));
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) {
        console.error("Socket authentication error: User not found");
        return next(new Error("Authentication error: User not found"));
      }
      if ((decoded.version || 0) !== (user.tokenVersion || 0)) {
        console.error("Socket authentication error: Token invalidated");
        return next(new Error("Authentication error: Token invalidated due to password reset"));
      }
      socket.userId = decoded.id;
      next();
    } catch (err) {
      console.error("Socket authentication error:", err.message || err);
      return next(new Error("Authentication error: Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("register", () => {
      if (socket.userId) {
        socket.join(socket.userId);
      }
    });

    socket.on("typing", async ({ conversationId, receiverId }) => {
      try {
        if (
          !conversationId || !receiverId ||
          !mongoose.Types.ObjectId.isValid(conversationId) ||
          !mongoose.Types.ObjectId.isValid(receiverId)
        ) return;

        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: { $all: [socket.userId, receiverId] },
        });

        if (!conversation) return;

        io.to(receiverId).emit("typing", { conversationId, senderId: socket.userId });
      } catch {
        // silently discard on unexpected error
      }
    });

    socket.on("stop_typing", async ({ conversationId, receiverId }) => {
      try {
        if (
          !conversationId || !receiverId ||
          !mongoose.Types.ObjectId.isValid(conversationId) ||
          !mongoose.Types.ObjectId.isValid(receiverId)
        ) return;

        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: { $all: [socket.userId, receiverId] },
        });

        if (!conversation) return;

        io.to(receiverId).emit("stop_typing", { conversationId });
      } catch {
        // silently discard on unexpected error
      }
    });
  });
};

export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
};
