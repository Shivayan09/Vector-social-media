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

const app = express();

app.set("trust proxy", 1);

app.use(helmet());

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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

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

export default app;
