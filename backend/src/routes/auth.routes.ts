import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

const router = Router();

const adminLoginLimiter = rateLimit({
  windowMs: env.ADMIN_LOGIN_WINDOW_MS,
  limit: env.ADMIN_LOGIN_MAX_ATTEMPTS,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}:${String(req.body?.username || '').trim().toLowerCase()}`,
  message: {
    success: false,
    error: {
      code: 'ADMIN_LOGIN_RATE_LIMITED',
      message: 'Too many admin login attempts. Please try again later.',
    },
  },
});

router.post('/otp/send', AuthController.sendOtp);
router.post('/otp/verify', AuthController.verifyOtp);
router.post('/admin-login', adminLoginLimiter, AuthController.adminLogin);
router.post('/refresh', AuthController.refreshTokens);
router.get('/me', requireAuth, AuthController.getMe);
router.post('/logout', requireAuth, AuthController.logout);

export default router;
