import rateLimit from "express-rate-limit";

/**
 * authRateLimiter
 *
 * Protects login and register endpoints from brute-force attacks
 * by limiting each IP to 10 requests per 15-minute window.
 *
 * If the project doesn't have express-rate-limit installed yet, run:
 *   npm install express-rate-limit
 */
export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,                   // max 10 requests per window per IP
    standardHeaders: true,     // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false,      // Disable `X-RateLimit-*` headers
    message: {
        success: false,
        message: "Too many requests from this IP. Please try again after 15 minutes.",
    },
    skipSuccessfulRequests: false,
});

/**
 * generalRateLimiter
 *
 * A lighter rate limiter for general API routes — 100 requests per 15 minutes.
 * Apply to any route that should have basic flood protection without being
 * as strict as the auth limiter.
 */
export const generalRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many requests from this IP. Please slow down.",
    },
});
