import express from "express";
import rateLimit from "express-rate-limit";
import { submitContact } from "../controllers/contact.controller.js";

const contactRouter = express.Router();

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many contact submissions from this IP, please try again later",
});

contactRouter.post("/", contactLimiter, submitContact);

export default contactRouter;
