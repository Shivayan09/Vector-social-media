import rateLimit from "express-rate-limit";

const skipLimiter = (req) => process.env.NODE_ENV === "test" || req.method === "OPTIONS";

const createLimiter = ({ windowMs, max, message }) => rateLimit({
    windowMs,
    max,
    skip: skipLimiter,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message,
    },
});

export const apiLimiter = createLimiter({
    windowMs: 60 * 1000,
    max: 100,
    message: "Too many API requests from this IP. Please try again later.",
});

export const searchLimiter = createLimiter({
    windowMs: 60 * 1000,
    max: 50,
    message: "Too many search requests from this IP. Please try again later.",
});

export const postWriteLimiter = createLimiter({
    windowMs: 60 * 1000,
    max: 10,
    message: "Too many post changes from this IP. Please try again later.",
});

export const messageWriteLimiter = createLimiter({
    windowMs: 60 * 1000,
    max: 30,
    message: "Too many message requests from this IP. Please try again later.",
});

export const commentWriteLimiter = createLimiter({
    windowMs: 60 * 1000,
    max: 30,
    message: "Too many comment requests from this IP. Please try again later.",
});

export const socialActionLimiter = createLimiter({
    windowMs: 60 * 1000,
    max: 60,
    message: "Too many social actions from this IP. Please try again later.",
});

export const followActionLimiter = createLimiter({
    windowMs: 60 * 1000,
    max: 20,
    message: "Too many follow actions from this IP. Please try again later.",
});
