import { prisma } from '../../config/prisma';
import { AppError } from '../../shared/errors/app-error';

export class ListingsLocationService {
  /**
   * Update the canonical location of an existing listing
   * Only the listing owner or an authorized administrator can update it.
   */
  static async updateListingLocation(
    userId: string,
    userRole: string,
    listingId: string,
    locationId: string
  ) {
    const ad = await prisma.ad.findUnique({
      where: { id: listingId },
      select: { id: true, userId: true, locationId: true },
    });

    if (!ad) {
      throw new AppError(404, 'LISTING_NOT_FOUND', 'Listing not found');
    }

    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
    if (ad.userId !== userId && !isAdmin) {
      throw new AppError(
        403,
        'FORBIDDEN',
        'Only the listing owner or an authorized administrator can update its location'
      );
    }

    const location = await prisma.location.findUnique({
      where: { id: locationId },
      select: { id: true, name: true, slug: true, type: true, latitude: true, longitude: true, isActive: true },
    });

    if (!location) {
      throw new AppError(404, 'LOCATION_NOT_FOUND', 'Specified target location does not exist');
    }

    if (!location.isActive) {
      throw new AppError(
        400,
        'LOCATION_INACTIVE',
        'Specified location is inactive and cannot be assigned to listings'
      );
    }

    const updated = await prisma.ad.update({
      where: { id: listingId },
      data: {
        locationId: location.id,
        latitude: location.latitude ?? 0,
        longitude: location.longitude ?? 0,
      },
      include: {
        location: {
          select: { id: true, name: true, slug: true, type: true },
        },
      },
    });

    return updated;
  }
}
