import { prisma } from '../prisma';
import { AppError } from '../middleware/errorHandler';

export const settingDefaults: Record<string, unknown> = {
  listingExpiryDays: 30,
  maxImageCount: 12,
  maxImageSizeMb: 10,
  allowedImageMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  requireModeration: false,
  searchDefaults: { sort: 'RECENT', radiusKm: 25 },
  featureFlags: { videoUpload: false, promotions: true, maintenanceMode: false },
  notificationTemplates: {
    LISTING_APPROVED: { title: 'Listing approved', body: 'Your listing "{{title}}" is now live.' },
    LISTING_REJECTED: { title: 'Listing rejected', body: 'Your listing "{{title}}" needs changes: {{reason}}' },
    NEW_MESSAGE: { title: 'New message', body: '{{sender}} sent you a message about "{{title}}".' },
    LISTING_EXPIRING: { title: 'Listing expiring soon', body: 'Your listing "{{title}}" expires soon.' },
    REPORT_RESOLVED: { title: 'Report updated', body: 'Your report has been resolved.' },
  },
};

export class SettingsService {
  static async getAll() {
    const stored = await prisma.platformSetting.findMany();
    return stored.reduce<Record<string, unknown>>((settings, row) => ({ ...settings, [row.key]: row.value }), { ...settingDefaults });
  }
  static async get<T>(key: string): Promise<T> {
    const setting = await prisma.platformSetting.findUnique({ where: { key } });
    return (setting?.value ?? settingDefaults[key]) as T;
  }
  static validate(key: string, value: unknown) {
    if (!(key in settingDefaults)) throw new AppError(400, 'UNKNOWN_SETTING', 'This setting is not configurable');
    if (['listingExpiryDays', 'maxImageCount', 'maxImageSizeMb'].includes(key) && (!Number.isInteger(value) || Number(value) < 1 || Number(value) > (key === 'listingExpiryDays' ? 365 : key === 'maxImageCount' ? 30 : 50))) throw new AppError(400, 'INVALID_SETTING_VALUE', `Invalid ${key}`);
    if (key === 'allowedImageMimeTypes' && (!Array.isArray(value) || value.length < 1 || value.some((item) => !['image/jpeg', 'image/png', 'image/webp'].includes(String(item))))) throw new AppError(400, 'INVALID_SETTING_VALUE', 'Only approved image MIME types are supported');
    if (key === 'requireModeration' && typeof value !== 'boolean') throw new AppError(400, 'INVALID_SETTING_VALUE', 'requireModeration must be boolean');
    if (key === 'featureFlags' && (typeof value !== 'object' || value === null)) throw new AppError(400, 'INVALID_SETTING_VALUE', 'featureFlags must be an object');
    if (key === 'notificationTemplates' && (typeof value !== 'object' || value === null)) throw new AppError(400, 'INVALID_SETTING_VALUE', 'notificationTemplates must be an object');
  }
  static async set(key: string, value: unknown, updatedBy: string) {
    this.validate(key, value);
    return prisma.platformSetting.upsert({ where: { key }, create: { key, value: value as never, updatedBy }, update: { value: value as never, updatedBy } });
  }
}
