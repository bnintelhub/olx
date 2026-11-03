import { prisma } from '../../config/prisma';
import { AppError } from '../../shared/errors/app-error';
import { getCache, setCache, delCache } from '../../config/redis';

export class LocationsService {
  private static slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  static async getCities() {
    const cacheKey = 'locations:cities';
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    const cities = await prisma.location.findMany({
      where: { type: 'CITY', isActive: true },
      orderBy: { name: 'asc' },
    });

    await setCache(cacheKey, cities, 600);
    return cities;
  }

  static async getTree() {
    const cacheKey = 'locations:tree';
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    const tree = await prisma.location.findMany({
      where: { parentId: null, isActive: true },
      include: {
        children: {
          where: { isActive: true },
          include: {
            children: {
              where: { isActive: true },
              include: { children: { where: { isActive: true }, orderBy: { name: 'asc' } } },
              orderBy: { name: 'asc' },
            },
          },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    await setCache(cacheKey, tree, 600);
    return tree;
  }

  static async getAdminList(q?: string, type?: string, isActive?: boolean) {
    const where: any = {};
    if (type) where.type = type;
    if (isActive !== undefined) where.isActive = isActive;
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
        { pincode: { contains: q } },
      ];
    }

    return prisma.location.findMany({
      where,
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
      include: { parent: { select: { id: true, name: true, type: true } }, _count: { select: { ads: true } } },
      take: 300,
    });
  }

  static async create(data: any) {
    const normalizedSlug = this.slugify(data.slug || data.name);
    if (!normalizedSlug) throw new AppError(400, 'INVALID_SLUG', 'Location slug cannot be empty');

    const location = await prisma.location.create({
      data: {
        name: data.name,
        slug: normalizedSlug,
        parentId: data.parentId || null,
        type: data.type,
        latitude: data.latitude,
        longitude: data.longitude,
        pincode: data.pincode || null,
        isActive: data.isActive ?? true,
      },
    });

    await delCache('locations:cities', 'locations:tree');
    return location;
  }
}
