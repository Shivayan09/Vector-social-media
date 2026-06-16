import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import csrfProtection from "./middlewares/csrf.middleware.js";
import { apiLimiter } from "./middlewares/rateLimit.middleware.js";
import authRouter from "./routes/auth.routes.js";
import postRouter from "./routes/post.routes.js";
import userRoutes from "./routes/user.routes.js";
import commentRoutes from "./routes/comment.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import messageRouter from "./routes/message.routes.js";
import conversationRouter from "./routes/conversation.routes.js";
import reportRouter from "./routes/report.routes.js";
import contactRouter from "./routes/contact.routes.js";
import reviewRouter from "./routes/review.routes.js";
import errorHandler from "./middlewares/error.middleware.js";
import { sanitizeAllBodyFields } from "./middlewares/sanitize.middleware.js";
const app = express();

app.set("trust proxy", 1);

// Configure helmet with strict Content Security Policy
// Protects against XSS, clickjacking, and other injection attacks
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        // Default source for all content types not explicitly defined
        defaultSrc: ["'self'"],

        // Script sources: Only self-hosted and trusted CDNs
        // Inline scripts are NOT allowed ('unsafe-inline' forbidden)
        scriptSrc: [
          "'self'",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
          "https://apis.google.com", // For Google Auth if needed
        ],

        // Style sources: Self, Google Fonts, and trusted CDNs
        // Inline styles are NOT allowed ('unsafe-inline' forbidden)
        styleSrc: [
          "'self'",
          "https://fonts.googleapis.com",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
        ],

        // Font sources: Self and Google Fonts
        fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],

        // Image sources: Self, data URIs, and HTTPS sources
        imageSrc: ["'self'", "data:", "https:"],

        // Media sources: Self-hosted and HTTPS only
        mediaSrc: ["'self'", "https:"],

        // WebSocket and fetch connections: Allow API calls to same-origin and HTTPS origins
        connectSrc: ["'self'", "https://cdn.jsdelivr.net", "https://apis.google.com"],

        // Framing: Disable embedding app in iframes (clickjacking prevention)
        frameSrc: ["'none'"],

        // Form submission: Only allow submitting to same-origin
        formAction: ["'self'"],

        // Base URI: Restrict base tag
        baseUri: ["'self'"],

        // Disable plugins entirely (legacy Flash, etc.)
        objectSrc: ["'none'"],
      },
      // Report CSP violations (useful for monitoring)
      reportUri: process.env.CSP_REPORT_URI || undefined,
    },

    // HSTS: Force HTTPS connections
    hsts: {
      maxAge: 31536000, // 1 year in seconds
      includeSubDomains: true,
      preload: true,
    },

    // Frameguard: Prevent clickjacking attacks
    frameguard: {
      action: "deny",
    },

    // Referrer Policy: Control how much referrer info is shared
    referrerPolicy: {
      policy: "strict-origin-when-cross-origin",
    },

    // X-Content-Type-Options: Prevent MIME type sniffing
    noSniff: true,

    // X-XSS-Protection: Legacy XSS filter (modern browsers use CSP)
    xssFilter: true,

    // Permissions Policy: Control browser features
    permissionsPolicy: {
      geolocation: [],
      microphone: [],
      camera: [],
      payment: [],
    },
  }),
);

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://vector-lac.vercel.app",
      "https://vector-lac.vercel.app",
      "https://vector-social-media.vercel.app",
      process.env.FRONTEND_URL,
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use("/api", apiLimiter);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb", parameterLimit: 5000 }));
app.use(cookieParser());

// Sanitize user input to prevent XSS attacks
// Works in conjunction with CSP headers for defense-in-depth
app.use(sanitizeAllBodyFields());

app.use(csrfProtection);

app.get("/", (req, res) => {
  res.send("Server is up and running 🚀");
});

app.use("/api/auth", authRouter);
app.use("/api/posts", postRouter);
app.use("/api/users", userRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/messages", messageRouter);
app.use("/api/conversation", conversationRouter);
app.use("/api/reports", reportRouter);
app.use("/api/contact", contactRouter);
app.use("/api/reviews", reviewRouter);

app.use(errorHandler);

export default app;
