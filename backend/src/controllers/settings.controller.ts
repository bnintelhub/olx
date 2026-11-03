import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { SettingsService } from '../services/settings.service';
import { writeAuditLog } from '../utils/audit';

export class SettingsController {
  static async get(req: AuthenticatedRequest, res: Response, next: NextFunction) { try { res.json({ success: true, data: await SettingsService.getAll() }); } catch (err) { next(err); } }
  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { key, value } = req.body;
      if (typeof key !== 'string') throw new AppError(400, 'SETTING_KEY_REQUIRED', 'Setting key is required');
      const oldValue = await SettingsService.get(key);
      const saved = await SettingsService.set(key, value, req.user!.id);
      await writeAuditLog({ userId: req.user!.id, action: 'ADMIN_UPDATE_PLATFORM_SETTING', entityType: 'PLATFORM_SETTING', entityId: key, oldData: oldValue, newData: value, request: req });
      res.json({ success: true, data: saved });
    } catch (err) { next(err); }
  }
}
