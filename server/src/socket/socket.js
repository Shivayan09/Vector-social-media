import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import mongoose from "mongoose";
import Conversation from "../models/conversation.model.js";
import User from "../models/user.model.js";

let io;

const parseCookies = (cookieHeader) => {
  if (!cookieHeader) return {};
  const cookies = {};
  cookieHeader.split(";").forEach((cookie) => {
    const [name, ...rest] = cookie.split("=");
    if (name) {
      cookies[name.trim()] = rest.join("=").trim();
    }
  });
  return cookies;
};

export const initSocket = async (server) => {
  io = new Server(server, {
    cors: {
      origin: ["http://localhost:3000", "http://vector-lac.vercel.app", "https://vector-lac.vercel.app", process.env.FRONTEND_URL],
      credentials: true,
    },
  });

  const pubClient = createClient({ url: process.env.REDIS_URL || "redis://localhost:6379" });
  const subClient = pubClient.duplicate();

  pubClient.on("error", (err) => console.error("Redis Pub Client Error", err));
  subClient.on("error", (err) => console.error("Redis Sub Client Error", err));

  await Promise.all([pubClient.connect(), subClient.connect()]);

  io.adapter(createAdapter(pubClient, subClient));

  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      if (!cookieHeader) {
        return next(new Error("Authentication error: No cookies found"));
      }
      const cookies = parseCookies(cookieHeader);
      const token = cookies.token;
      if (!token) {
        return next(new Error("Authentication error: Token missing"));
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) {
        return next(new Error("Authentication error: User not found"));
      }
      if ((decoded.version || 0) !== (user.tokenVersion || 0)) {
        return next(new Error("Authentication error: Token invalidated due to password reset"));
      }
      socket.userId = decoded.id;
      next();
    } catch {
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

        // Verify both socket.userId and receiverId are actual participants
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