import { prisma } from '../../config/prisma';
import { AppError } from '../../shared/errors/app-error';
import { delCache } from '../../config/redis';
import { UpdateProfileInput } from './users.schema';

export class UsersService {
  static async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
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
    const { name, bio, email, avatarUrl, businessName } = body;

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

    await prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        name: name || 'User',
        bio: bio || null,
        avatarUrl: avatarUrl || null,
        businessName: businessName || null,
      },
      update: {
        ...(name !== undefined ? { name } : {}),
        ...(bio !== undefined ? { bio } : {}),
        ...(avatarUrl !== undefined ? { avatarUrl } : {}),
        ...(businessName !== undefined ? { businessName } : {}),
      },
    });

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
            images: { orderBy: { sortOrder: 'asc' }, take: 1 },
          },
        },
      },
    });

    return favourites.map((f) => ({
      ...f.ad,
      favouritedAt: f.createdAt,
    }));
  }
}
