import express from 'express';
import { profileSetup, register } from '../controllers/auth.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const authRouter = express.Router()

authRouter.post('/register', register)
authRouter.post('/profileSetup', authMiddleware, profileSetup)

export default authRouter