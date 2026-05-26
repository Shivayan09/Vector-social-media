import express from "express";
import mongoose from "mongoose";

const healthRouter = express.Router();

/**
 * GET /api/health
 *
 * Returns the current health status of the server and its dependencies.
 * Used by uptime monitors, load balancers, and CI smoke tests to verify
 * the service is running and connected to its database.
 *
 * Response shape:
 * {
 *   status: "ok" | "degraded",
 *   uptime: number,          // process uptime in seconds
 *   timestamp: string,       // ISO-8601 timestamp
 *   database: "connected" | "disconnected",
 *   environment: string      // NODE_ENV value
 * }
 */
healthRouter.get("/", (req, res) => {
    const dbState = mongoose.connection.readyState;
    // Mongoose readyState: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
    const dbStatus = dbState === 1 ? "connected" : "disconnected";

    const status = dbStatus === "connected" ? "ok" : "degraded";

    const payload = {
        status,
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        database: dbStatus,
        environment: process.env.NODE_ENV || "development",
    };

    // Return 200 if healthy, 503 if degraded (database not connected)
    return res.status(status === "ok" ? 200 : 503).json(payload);
});

export default healthRouter;
