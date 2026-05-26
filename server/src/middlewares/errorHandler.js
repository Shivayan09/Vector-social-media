/**
 * globalErrorHandler
 *
 * Express error-handling middleware (4-argument signature).
 * Must be registered AFTER all routes and other middleware in app.js:
 *
 *   app.use(globalErrorHandler);
 *
 * Catches any error passed via `next(err)` from route handlers and returns
 * a consistent JSON response instead of leaking stack traces to the client.
 *
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const globalErrorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
    // Determine status code — prefer err.statusCode, fallback to 500
    const statusCode = err.statusCode || err.status || 500;

    // Only log the full stack in non-production environments
    if (process.env.NODE_ENV !== "production") {
        console.error(`[ERROR] ${req.method} ${req.originalUrl}`, err);
    } else {
        // In production, log only the message to avoid leaking internals
        console.error(`[ERROR] ${req.method} ${req.originalUrl} — ${err.message}`);
    }

    // Mongoose CastError (invalid ObjectId) → 400 Bad Request
    if (err.name === "CastError" && err.kind === "ObjectId") {
        return res.status(400).json({
            success: false,
            message: "Invalid ID format",
        });
    }

    // Mongoose ValidationError → 400 Bad Request with field-level details
    if (err.name === "ValidationError") {
        const messages = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: messages,
        });
    }

    // Mongoose duplicate key (unique index violation) → 409 Conflict
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0] || "field";
        return res.status(409).json({
            success: false,
            message: `${field} already exists`,
        });
    }

    // JWT errors → 401 Unauthorized
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
        return res.status(401).json({
            success: false,
            message: err.name === "TokenExpiredError" ? "Token has expired" : "Invalid token",
        });
    }

    // Generic fallback
    res.status(statusCode).json({
        success: false,
        message: statusCode === 500
            ? "An internal server error occurred"
            : err.message || "Something went wrong",
    });
};

export default globalErrorHandler;
