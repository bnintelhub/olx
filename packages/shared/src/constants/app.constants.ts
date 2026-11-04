export const APP_CONSTANTS = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  OTP_LENGTH: 6,
  MAX_OTP_ATTEMPTS: 3,
  DEFAULT_LISTING_EXPIRY_DAYS: 30,
  MAX_IMAGE_COUNT: 12,
  MAX_IMAGE_SIZE_MB: 10,
  ALLOWED_IMAGE_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
} as const;

export const SETTING_DEFAULTS: Record<string, unknown> = {
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

