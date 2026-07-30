import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import connectDB from "../../../database/mongodb.js";
import csrfProtection from "./middlewares/csrf.middleware.js";
import { apiLimiter } from "../../middlewares/rateLimit.middleware.js";
import { sanitizeAllBodyFields } from "../../middlewares/sanitize.middleware.js";
import errorHandler from "../../middlewares/error.middleware.js";
import authRouter from "./auth.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.set("trust proxy", 1);

app.use(
    helmet({
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
        },
    })
);

app.use(
    cors({
        origin: [ "http://localhost:3000", process.env.FRONTEND_URL],
        credentials: true,
    })
);

app.use("/api", apiLimiter);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(sanitizeAllBodyFields());
app.use(csrfProtection);

app.get("/", (req, res) => {
    res.send("Auth Service Running 🚀");
});

app.use("/api/auth", authRouter);

app.use(errorHandler);

await connectDB();

app.listen(PORT, () => {
    console.log(`🚀 Auth Service running on port ${PORT}`);
});