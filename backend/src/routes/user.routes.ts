import { Router } from 'express';
import { AdController } from '../controllers/ad.controller';
import { UserController } from '../controllers/user.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

// User Profile endpoints
router.get('/profile', requireAuth, UserController.getProfile);
router.put('/profile', requireAuth, UserController.updateProfile);
router.post('/verify-identity', requireAuth, UserController.requestIdentityVerification);

// My Ads dashboard endpoint
router.get('/my-ads', requireAuth, AdController.getMyAds);

// User Wishlist / Favourites endpoint
router.get('/favourites', requireAuth, UserController.getFavourites);

export default router;
