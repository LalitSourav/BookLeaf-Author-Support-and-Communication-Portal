import express from 'express';
import { login, getMe } from '../controllers/authController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// POST /api/auth/login — Unified login for admins and authors
router.post('/login', login);

// GET /api/auth/me — Get current authenticated user profile
router.get('/me', verifyToken, getMe);

export default router;
