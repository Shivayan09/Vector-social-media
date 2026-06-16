import "dotenv/config";
import connectDB from "./src/config/mongodb.js";
import { initSocket } from "./src/socket/socket.js";
import app from "./src/app.js";
import { startCleanupJob } from "./src/jobs/cleanupConversations.js";
import mongoose from "mongoose";

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

let server;
try {
  await connectDB();
} catch (error) {
  console.error("Failed to connect to MongoDB:", error);
  process.exit(1);
}

const PORT = process.env.PORT || 5000;

server = app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});

await initSocket(server);
startCleanupJob();

async function shutdown(signal) {
  console.log(`Received ${signal}. Starting graceful shutdown...`);
  server.close(() => {
    console.log("HTTP server closed");
  });
  await mongoose.connection.close();
  console.log("MongoDB connection closed");
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));