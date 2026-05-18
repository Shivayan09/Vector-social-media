import { Server } from "socket.io";
import jwt from "jsonwebtoken";

export const onlineUsers = new Map();
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

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: ["http://localhost:3000", "http://vector-lac.vercel.app", "https://vector-lac.vercel.app", process.env.FRONTEND_URL],
      credentials: true,
    },
  });

  io.use((socket, next) => {
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
      socket.userId = decoded.id;
      next();
    } catch {
      return next(new Error("Authentication error: Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {

    socket.on("register", () => {
      if (socket.userId) {
        onlineUsers.set(socket.userId, socket.id);
      }
    });

    socket.on("disconnect", () => {
      if (socket.userId && onlineUsers.get(socket.userId) === socket.id) {
        onlineUsers.delete(socket.userId);
      }
    });

  });
};

export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
};