import { prisma } from '../../config/prisma';
import { AppError } from '../../shared/errors/app-error';
import { getCache, setCache, delCache } from '../../config/redis';
import {
  LocationType,
  SUPPORTED_LOCATION_TYPES,
  ALLOWED_PARENT_TYPES,
  CreateLocationDto,
  UpdateLocationDto,
  LocationSearchParams,
  NearbyLocationParams,
  BreadcrumbItem,
} from './locations.types';

export class LocationsService {
  public static normalizeName(name: string): string {
    return name.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  public static slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // Validate hierarchy transition (e.g. country -> state -> city -> locality -> area)
  private static validateHierarchyTransition(type: LocationType, parentType: LocationType | null) {
    const expectedParent = ALLOWED_PARENT_TYPES[type];
    if (expectedParent === null && parentType !== null) {
      throw new AppError(400, 'INVALID_HIERARCHY', `Type '${type}' must be a root location (parentId must be null)`);
    }
    if (expectedParent !== null && (!parentType || parentType !== expectedParent)) {
      throw new AppError(
        400,
        'INVALID_HIERARCHY',
        `Type '${type}' requires a parent of type '${expectedParent}'. Received '${parentType || 'none'}'`
      );
    }
  }

  // Calculate Haversine distance in kilometers between two geo coordinates
  private static calculateHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's mean radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static async invalidateCaches() {
    await delCache(
      'locations:tree',
      'locations:tree:all',
      'locations:cities',
      'locations:roots'
    );
  }

  // ============================================================================
  // ADMIN MUTATIONS
  // ============================================================================

  static async create(data: CreateLocationDto, actorId?: string) {
    const rawType = (data.type || '').toLowerCase() as LocationType;
    if (!SUPPORTED_LOCATION_TYPES.includes(rawType)) {
      throw new AppError(400, 'INVALID_LOCATION_TYPE', `Unsupported location type '${data.type}'`);
    }

    if (!data.name || !data.name.trim()) {
      throw new AppError(400, 'INVALID_NAME', 'Location name is required');
    }

    const normalized = this.normalizeName(data.name);
    const slug = data.slug ? this.slugify(data.slug) : this.slugify(data.name);
    const parentId = data.parentId || null;

    // 1. Validate parent relationship
    let parent: any = null;
    if (parentId) {
      parent = await prisma.location.findUnique({ where: { id: parentId } });
      if (!parent) {
        throw new AppError(404, 'PARENT_NOT_FOUND', 'Specified parent location does not exist');
      }
    }
    this.validateHierarchyTransition(rawType, parent ? (parent.type.toLowerCase() as LocationType) : null);

    // 2. Enforce sibling uniqueness
    const duplicate = await prisma.location.findFirst({
      where: {
        parentId,
        type: rawType,
        normalizedName: normalized,
      },
    });
    if (duplicate) {
      throw new AppError(
        409,
        'DUPLICATE_LOCATION',
        `A location '${data.name}' with type '${rawType}' already exists under this parent`
      );
    }

    // 3. Validate coordinates if provided
    if (data.latitude !== undefined && data.latitude !== null) {
      if (data.latitude < -90 || data.latitude > 90) {
        throw new AppError(400, 'INVALID_COORDINATES', 'Latitude must be between -90 and 90');
      }
    }
    if (data.longitude !== undefined && data.longitude !== null) {
      if (data.longitude < -180 || data.longitude > 180) {
        throw new AppError(400, 'INVALID_COORDINATES', 'Longitude must be between -180 and 180');
      }
    }

    // 4. Create location record and initialize materialized path
    const created = await prisma.$transaction(async (tx) => {
      const loc = await tx.location.create({
        data: {
          name: data.name.trim(),
          normalizedName: normalized,
          slug,
          type: rawType,
          parentId,
          path: '/',
          depth: parent ? parent.depth + 1 : 0,
          latitude: data.latitude ?? null,
          longitude: data.longitude ?? null,
          pincode: data.pincode ? data.pincode.trim() : null,
          metadata: data.metadata || {},
          isActive: data.isActive ?? true,
        },
      });

      const finalPath = parent ? `${parent.path}/${loc.id}` : `/${loc.id}`;
      const updated = await tx.location.update({
        where: { id: loc.id },
        data: { path: finalPath },
      });

      // Audit log entry
      await tx.auditLog.create({
        data: {
          userId: actorId || null,
          action: 'LOCATION_CREATED',
          entityType: 'location',
          entityId: updated.id,
          newData: {
            id: updated.id,
            name: updated.name,
            type: updated.type,
            parentId: updated.parentId,
            path: updated.path,
          },
        },
      });

      return updated;
    });

    await this.invalidateCaches();
    return created;
  }

  static async update(id: string, data: UpdateLocationDto, actorId?: string) {
    const existing = await prisma.location.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, 'LOCATION_NOT_FOUND', 'Location not found');
    }

    const updates: any = {};
    let isParentMoved = false;
    let oldPath = existing.path;
    let newPath = existing.path;
    let newDepth = existing.depth;

    // Handle name change and normalization
    if (data.name && data.name.trim()) {
      updates.name = data.name.trim();
      updates.normalizedName = this.normalizeName(data.name);
      if (!data.slug) {
        updates.slug = this.slugify(data.name);
      }
    }
    if (data.slug) {
      updates.slug = this.slugify(data.slug);
    }

    // Handle coordinates update
    if (data.latitude !== undefined) updates.latitude = data.latitude;
    if (data.longitude !== undefined) updates.longitude = data.longitude;
    if (data.pincode !== undefined) updates.pincode = data.pincode ? data.pincode.trim() : null;
    if (data.metadata !== undefined) updates.metadata = data.metadata;
    if (data.isActive !== undefined) updates.isActive = data.isActive;

    // Handle hierarchy move
    if (data.parentId !== undefined && data.parentId !== existing.parentId) {
      isParentMoved = true;
      const targetParentId = data.parentId;

      if (targetParentId === id) {
        throw new AppError(400, 'CIRCULAR_HIERARCHY', 'A location cannot be its own parent');
      }

      let newParent: any = null;
      if (targetParentId) {
        newParent = await prisma.location.findUnique({ where: { id: targetParentId } });
        if (!newParent) {
          throw new AppError(404, 'PARENT_NOT_FOUND', 'Target parent location does not exist');
        }

        // Prevent circular dependency: target parent must not be inside this location's subtree
        if (newParent.path.startsWith(`${existing.path}/`) || newParent.path === existing.path) {
          throw new AppError(400, 'CIRCULAR_HIERARCHY', 'Cannot move a location inside its own descendant subtree');
        }
      }

      this.validateHierarchyTransition(
        existing.type.toLowerCase() as LocationType,
        newParent ? (newParent.type.toLowerCase() as LocationType) : null
      );

      updates.parentId = targetParentId || null;
      newDepth = newParent ? newParent.depth + 1 : 0;
      newPath = newParent ? `${newParent.path}/${existing.id}` : `/${existing.id}`;
      updates.path = newPath;
      updates.depth = newDepth;
    }

    // Sibling duplicate check if name or parent changed
    const effectiveParentId = updates.parentId !== undefined ? updates.parentId : existing.parentId;
    const effectiveNormName = updates.normalizedName || existing.normalizedName;
    const duplicate = await prisma.location.findFirst({
      where: {
        id: { not: id },
        parentId: effectiveParentId,
        type: existing.type,
        normalizedName: effectiveNormName,
      },
    });
    if (duplicate) {
      throw new AppError(
        409,
        'DUPLICATE_LOCATION',
        `A location '${updates.name || existing.name}' with type '${existing.type}' already exists under this parent`
      );
    }

    // Execute atomic update including cascading subtree path updates if moved
    const updated = await prisma.$transaction(async (tx) => {
      const loc = await tx.location.update({
        where: { id },
        data: updates,
      });

      // Cascade materialized path update across all descendants
      if (isParentMoved) {
        const descendants = await tx.location.findMany({
          where: { path: { startsWith: `${oldPath}/` } },
        });

        for (const desc of descendants) {
          const updatedDescPath = desc.path.replace(oldPath, newPath);
          const relativeDepth = updatedDescPath.split('/').filter(Boolean).length - 1;
          await tx.location.update({
            where: { id: desc.id },
            data: { path: updatedDescPath, depth: relativeDepth },
          });
        }
      }

      // Record audit log
      await tx.auditLog.create({
        data: {
          userId: actorId || null,
          action: isParentMoved ? 'LOCATION_MOVED' : 'LOCATION_UPDATED',
          entityType: 'location',
          entityId: loc.id,
          oldData: {
            name: existing.name,
            parentId: existing.parentId,
            path: existing.path,
            isActive: existing.isActive,
          },
          newData: {
            name: loc.name,
            parentId: loc.parentId,
            path: loc.path,
            isActive: loc.isActive,
          },
        },
      });

      return loc;
    });

    await this.invalidateCaches();
    return updated;
  }

  static async updateStatus(id: string, isActive: boolean, actorId?: string) {
    const existing = await prisma.location.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, 'LOCATION_NOT_FOUND', 'Location not found');
    }

    const updated = await prisma.location.update({
      where: { id },
      data: { isActive },
    });

    await prisma.auditLog.create({
      data: {
        userId: actorId || null,
        action: isActive ? 'LOCATION_REACTIVATED' : 'LOCATION_DEACTIVATED',
        entityType: 'location',
        entityId: id,
        oldData: { isActive: existing.isActive },
        newData: { isActive },
      },
    });

    await this.invalidateCaches();
    return updated;
  }

  static async delete(id: string, actorId?: string) {
    const existing = await prisma.location.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            children: true,
            ads: true,
          },
        },
      },
    });

    if (!existing) {
      throw new AppError(404, 'LOCATION_NOT_FOUND', 'Location not found');
    }

    if (existing._count.children > 0) {
      throw new AppError(
        409,
        'LOCATION_IN_USE',
        'Location cannot be deleted because it has child locations. Delete or move children first.'
      );
    }

    if (existing._count.ads > 0) {
      throw new AppError(
        409,
        'LOCATION_IN_USE',
        'Location cannot be deleted because it is used by listings. Deactivate it instead.'
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.location.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          userId: actorId || null,
          action: 'LOCATION_DELETED',
          entityType: 'location',
          entityId: id,
          oldData: {
            id: existing.id,
            name: existing.name,
            type: existing.type,
            path: existing.path,
          },
        },
      });
    });

    await this.invalidateCaches();
    return { success: true, message: 'Location deleted successfully' };
  }

  // ============================================================================
  // HIERARCHICAL QUERIES & BREADCRUMBS
  // ============================================================================

  static async getById(id: string) {
    const location = await prisma.location.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, name: true, type: true, slug: true } },
        _count: { select: { children: true, ads: true } },
      },
    });

    if (!location) {
      throw new AppError(404, 'LOCATION_NOT_FOUND', 'Location not found');
    }

    const breadcrumbs = await this.getAncestors(id);
    return { ...location, breadcrumbs };
  }

  static async getAncestors(id: string): Promise<BreadcrumbItem[]> {
    const location = await prisma.location.findUnique({
      where: { id },
      select: { path: true },
    });

    if (!location || !location.path) return [];

    const ancestorIds = location.path.split('/').filter(Boolean);
    if (ancestorIds.length === 0) return [];

    const ancestors = await prisma.location.findMany({
      where: { id: { in: ancestorIds } },
      select: { id: true, name: true, type: true, slug: true },
    });

    // Map according to path order
    const ancestorMap = new Map(ancestors.map((a) => [a.id, a]));
    return ancestorIds
      .map((aid) => ancestorMap.get(aid))
      .filter((item): item is BreadcrumbItem => Boolean(item));
  }

  static async getChildren(parentId: string | null, activeOnly = false) {
    return prisma.location.findMany({
      where: {
        parentId: parentId || null,
        ...(activeOnly ? { isActive: true } : {}),
      },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { children: true, ads: true } },
      },
    });
  }

  static async getDescendants(id: string, activeOnly = false) {
    const loc = await prisma.location.findUnique({ where: { id }, select: { path: true } });
    if (!loc) throw new AppError(404, 'LOCATION_NOT_FOUND', 'Location not found');

    return prisma.location.findMany({
      where: {
        path: { startsWith: `${loc.path}/` },
        ...(activeOnly ? { isActive: true } : {}),
      },
      orderBy: [{ depth: 'asc' }, { name: 'asc' }],
    });
  }

  static async getTree(activeOnly = true) {
    const cacheKey = activeOnly ? 'locations:tree' : 'locations:tree:all';
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    // Fetch all locations to construct tree in memory (fast and avoids N+1 queries)
    const allLocations = await prisma.location.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: [{ depth: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        parentId: true,
        path: true,
        depth: true,
        isActive: true,
        latitude: true,
        longitude: true,
        _count: { select: { ads: true, children: true } },
      },
    });

    const itemMap = new Map<string, any>();
    const roots: any[] = [];

    allLocations.forEach((loc) => {
      itemMap.set(loc.id, { ...loc, children: [] });
    });

    allLocations.forEach((loc) => {
      const node = itemMap.get(loc.id);
      if (loc.parentId && itemMap.has(loc.parentId)) {
        itemMap.get(loc.parentId).children.push(node);
      } else if (!loc.parentId) {
        roots.push(node);
      }
    });

    await setCache(cacheKey, roots, 600);
    return roots;
  }

  static async adminSearch(params: LocationSearchParams) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.type) where.type = params.type.toLowerCase();
    if (params.parentId !== undefined) where.parentId = params.parentId || null;
    if (params.status === 'active') where.isActive = true;
    if (params.status === 'inactive') where.isActive = false;

    if (params.q && params.q.trim()) {
      const q = params.q.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { normalizedName: { contains: q.toLowerCase() } },
        { slug: { contains: q, mode: 'insensitive' } },
        { pincode: { contains: q } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.location.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ depth: 'asc' }, { name: 'asc' }],
        include: {
          parent: { select: { id: true, name: true, type: true, slug: true } },
          _count: { select: { children: true, ads: true } },
        },
      }),
      prisma.location.count({ where }),
    ]);

    // Enhance search results with breadcrumb paths
    const enhancedItems = await Promise.all(
      items.map(async (item) => {
        const breadcrumbs = await this.getAncestors(item.id);
        return {
          ...item,
          pathList: breadcrumbs.map((b) => b.name),
        };
      })
    );

    return {
      items: enhancedItems,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ============================================================================
  // PUBLIC CLIENT DISCOVERY & NEARBY
  // ============================================================================

  static async clientSearch(q: string, limit = 20) {
    if (!q || !q.trim()) return [];

    const keyword = q.trim();
    const items = await prisma.location.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: keyword, mode: 'insensitive' } },
          { normalizedName: { contains: keyword.toLowerCase() } },
          { slug: { contains: keyword, mode: 'insensitive' } },
        ],
      },
      take: Math.min(30, Math.max(1, limit)),
      orderBy: [{ depth: 'desc' }, { name: 'asc' }],
      include: {
        parent: { select: { id: true, name: true, type: true } },
      },
    });

    // Populate breadcrumbs for clarity (e.g. "Kankarbagh, Patna, Bihar")
    return Promise.all(
      items.map(async (loc) => {
        const ancestors = await this.getAncestors(loc.id);
        const hierarchyText = ancestors.map((a) => a.name).join(', ');
        return {
          id: loc.id,
          name: loc.name,
          slug: loc.slug,
          type: loc.type,
          parentId: loc.parentId,
          depth: loc.depth,
          latitude: loc.latitude,
          longitude: loc.longitude,
          parent: loc.parent,
          hierarchyText,
          breadcrumbs: ancestors,
        };
      })
    );
  }

  static async nearby(params: NearbyLocationParams) {
    const radius = params.radiusKm || 15;
    const limit = Math.min(50, params.limit || 20);

    const locations = await prisma.location.findMany({
      where: {
        isActive: true,
        latitude: { not: null },
        longitude: { not: null },
        ...(params.type ? { type: params.type.toLowerCase() } : {}),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        depth: true,
        latitude: true,
        longitude: true,
        parentId: true,
      },
    });

    const nearbyList = locations
      .map((loc) => {
        const distanceKm = this.calculateHaversineDistanceKm(
          params.latitude,
          params.longitude,
          loc.latitude!,
          loc.longitude!
        );
        return {
          ...loc,
          distanceKm: Math.round(distanceKm * 10) / 10,
        };
      })
      .filter((loc) => loc.distanceKm <= radius)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, limit);

    return Promise.all(
      nearbyList.map(async (loc) => {
        const ancestors = await this.getAncestors(loc.id);
        return {
          ...loc,
          hierarchyText: ancestors.map((a) => a.name).join(', '),
          breadcrumbs: ancestors,
        };
      })
    );
  }

  static async getCities() {
    const cacheKey = 'locations:cities';
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    const cities = await prisma.location.findMany({
      where: {
        type: { in: ['city', 'CITY'] },
        isActive: true,
      },
      orderBy: { name: 'asc' },
      include: {
        parent: { select: { id: true, name: true, type: true } },
      },
    });

    await setCache(cacheKey, cities, 600);
    return cities;
  }
}
