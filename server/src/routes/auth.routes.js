import express from 'express';
import { getMe, login, logout, register } from '../controllers/auth.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import { googleAuth } from '../controllers/googleAuth.controller.js';

const authRouter = express.Router()

//normal auth
authRouter.post('/register', register)
authRouter.get('/me', authMiddleware, getMe)
authRouter.post('/login', login)
authRouter.post('/logout', logout)

//google auth
authRouter.post("/google", googleAuth);

export default authRouter