import express from "express";
import cookieParser from "cookie-parser";
import services from "./config/services.js";
import proxy from "./utils/proxy.js";
import authenticate from "./middlewares/auth.js";
import rateLimiter from "./middlewares/rateLimiter.js";
import errorHandler from "./middlewares/errorHandler.js";

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use(rateLimiter);

app.use("/api/auth", proxy(services.auth));
app.use("/api/users", authenticate, proxy(services.user));
app.use("/api/posts", authenticate, proxy(services.post));
app.use("/api/media", authenticate, proxy(services.media));
app.use("/api/comments", authenticate, proxy(services.comment));
app.use("/api/likes", authenticate, proxy(services.like));
app.use("/api/follows", authenticate, proxy(services.follow));
app.use("/api/feed", authenticate, proxy(services.feed));
app.use("/api/chat", authenticate, proxy(services.chat));
app.use("/api/search", authenticate, proxy(services.search));

app.use(
    "/api/notifications",
    authenticate,
    proxy(services.notification)
);

app.use(errorHandler);

app.listen(process.env.PORT, () => {
    console.log(`Gateway running on ${process.env.PORT}`);
});