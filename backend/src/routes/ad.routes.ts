import { Router } from 'express';
import { AdController } from '../controllers/ad.controller';
import { requireAuth } from '../middleware/auth';
import { uploadMedia } from '../middleware/upload';

const router = Router();

// Image upload (up to 12 images)
router.post('/upload-images', requireAuth, uploadMedia.array('images', 12), AdController.uploadImages);

// Search and filter Ads (Discovery feed)
router.get('/', AdController.searchAds);

// Search autocomplete suggestions
router.get('/suggestions', AdController.getSuggestions);

// Create new Ad
router.post('/', requireAuth, AdController.createAd);

// Similar ads for detail page
router.get('/:id/similar', AdController.getSimilar);

// Reveal seller phone number / contact info
router.get('/:id/contact', AdController.getContact);

// Toggle favourite/wishlist
router.post('/:id/favourite', requireAuth, AdController.toggleFavourite);

// Get single Ad detail (by ID or Slug)
router.get('/:id', AdController.getById);

// Update Ad
router.put('/:id', requireAuth, AdController.updateAd);

// Update Ad Status (Mark as Sold, Renew, Archive)
router.patch('/:id/status', requireAuth, AdController.updateStatus);

export default router;
