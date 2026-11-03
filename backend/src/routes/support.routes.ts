import { Router } from 'express';
import { SupportController } from '../controllers/support.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);
router.post('/tickets', SupportController.createTicket);
router.get('/tickets', SupportController.getMyTickets);
export default router;
