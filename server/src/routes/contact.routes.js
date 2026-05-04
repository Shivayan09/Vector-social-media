import express from "express";
import { submitContact } from "../controllers/contact.controller.js";

const contactRouter = express.Router();

contactRouter.post("/", submitContact);

export default contactRouter;
