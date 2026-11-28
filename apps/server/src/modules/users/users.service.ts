import path from 'path';
import { prisma } from '../../config/prisma';
import { AppError } from '../../shared/errors/app-error';
import { delCache } from '../../config/redis';
import { UpdateProfileInput } from './users.schema';
import { formatAdImages } from '../listings/listings.service';
import { defaultStorage } from '../../integrations/storage/storage.adapter';

export class UsersService {
  static async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          include: {
            location: {
              include: { parent: true },
            },
          },
        },
        _count: {
          select: {
            ads: true,
            favourites: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }
    return user;
  }

  static async updateProfile(userId: string, body: UpdateProfileInput) {
    const { name, bio, email, avatarUrl, businessName, locationId } = body;

    if (locationId) {
      const locationExists = await prisma.location.findFirst({
        where: { id: locationId, isActive: true },
        select: { id: true },
      });
      if (!locationExists) {
        throw new AppError(400, 'INVALID_LOCATION', 'Selected location does not exist or is inactive.');
      }
    }

    if (email) {
      const existing = await prisma.user.findFirst({
        where: { email, id: { not: userId } },
      });
      if (existing) {
        throw new AppError(400, 'EMAIL_EXISTS', 'This email is already associated with another account.');
      }

      await prisma.user.update({
        where: { id: userId },
        data: { email },
      });
    }

    // If avatarUrl changed or was removed: delete previous avatar to keep disk clean
    const currentProfile = await prisma.profile.findUnique({
      where: { userId },
      select: { avatarUrl: true },
    });

    if (
      currentProfile?.avatarUrl &&
      avatarUrl !== undefined &&
      currentProfile.avatarUrl !== avatarUrl
    ) {
      const oldMatch = currentProfile.avatarUrl.match(/med_[a-zA-Z0-9]+/);
      if (oldMatch) {
        const oldAssets = await prisma.mediaAsset.findMany({
          where: {
            OR: [
              { id: oldMatch[0] },
              { storageKey: { contains: oldMatch[0] } },
            ],
          },
        });
        for (const old of oldAssets) {
          if (old.storageKey) {
            await defaultStorage.deleteMediaDirectory(path.dirname(old.storageKey)).catch(() => {});
            const fullFile = path.join(defaultStorage.getUploadDir(), ...old.storageKey.split('/'));
            await defaultStorage.deleteFile(fullFile).catch(() => {});
          }
          await defaultStorage.deleteMediaFiles(old.id).catch(() => {});
          await prisma.mediaAsset.delete({ where: { id: old.id } }).catch(() => {});
        }
      }
    }

    await prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        name: name || 'User',
        bio: bio || null,
        avatarUrl: avatarUrl || null,
        businessName: businessName || null,
        locationId: locationId ?? null,
      },
      update: {
        ...(name !== undefined ? { name } : {}),
        ...(bio !== undefined ? { bio } : {}),
        ...(avatarUrl !== undefined ? { avatarUrl } : {}),
        ...(businessName !== undefined ? { businessName } : {}),
        ...(locationId !== undefined ? { locationId } : {}),
      },
    });

    // Ensure the associated media asset is explicitly mapped to USER entity type
    if (avatarUrl) {
      const match = avatarUrl.match(/med_[a-zA-Z0-9]+/);
      if (match) {
        await prisma.mediaAsset.updateMany({
          where: {
            OR: [
              { id: match[0] },
              { storageKey: { contains: match[0] } },
            ],
          },
          data: {
            entityType: 'USER',
            entityId: userId,
          },
        }).catch(() => {});
      }
    }

    await delCache(`user:${userId}`);

    return this.getProfile(userId);
  }

  static async verifyIdentity(userId: string) {
    const profile = await prisma.profile.update({
      where: { userId },
      data: { isIdentityVerified: true },
    });
    await delCache(`user:${userId}`);
    return profile;
  }

  static async getFavourites(userId: string) {
    const favourites = await prisma.favourite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        ad: {
          include: {
            category: { select: { id: true, name: true, slug: true } },
            location: { select: { id: true, name: true, slug: true } },
            images: {
              include: { mediaAsset: true },
              orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }],
            },
          },
        },
      },
    });

    return favourites.map((f) => ({
      ...f.ad,
      images: formatAdImages(f.ad.images),
      favouritedAt: f.createdAt,
    }));
  }
}
