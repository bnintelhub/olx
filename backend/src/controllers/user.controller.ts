import { Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { AuthenticatedRequest } from '../middleware/auth';

export class UserController {
  /**
   * GET /api/v1/user/profile
   * Retrieve current user profile with stats
   */
  static async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;

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
        return res.status(404).json({
          success: false,
          error: { message: 'User not found' },
        });
      }

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/v1/user/profile
   * Update profile details (name, bio, email, avatarUrl, businessName)
   */
  static async updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { name, bio, email, avatarUrl, businessName } = req.body;

      if (email) {
        const existing = await prisma.user.findFirst({
          where: { email, id: { not: userId } },
        });
        if (existing) {
          return res.status(400).json({
            success: false,
            error: { message: 'This email is already associated with another account.' },
          });
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

      const updatedUser = await prisma.user.findUnique({
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

      res.status(200).json({
        success: true,
        data: updatedUser,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/user/verify-identity
   * Request / toggle identity verification badge
   */
  static async requestIdentityVerification(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;

      const profile = await prisma.profile.update({
        where: { userId },
        data: { isIdentityVerified: true },
      });

      res.status(200).json({
        success: true,
        data: profile,
        message: 'Identity verification badge applied successfully!',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/user/favourites
   * Retrieve all ads bookmarked by the authenticated user
   */
  static async getFavourites(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;

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

      const ads = favourites.map((f) => ({
        ...f.ad,
        favouritedAt: f.createdAt,
      }));

      res.status(200).json({
        success: true,
        data: {
          ads,
          total: ads.length,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
