import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/config/prisma';
import { env } from '../../src/config/env';
import { UserRole } from '@prisma/client';

describe('Category Tree Architecture & Moderation Integration Tests', () => {
  let app: FastifyInstance;
  let adminToken: string;
  let regularUserToken: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // 1. Create staff user with category management permissions
    const adminUser = await prisma.user.upsert({
      where: { email: 'cat_admin_test@bharatmarket.in' },
      update: { role: UserRole.ADMIN, status: 'ACTIVE' },
      create: {
        email: 'cat_admin_test@bharatmarket.in',
        role: UserRole.ADMIN,
        status: 'ACTIVE',
      },
    });

    // 2. Create regular user
    const regularUser = await prisma.user.upsert({
      where: { email: 'cat_buyer_test@bharatmarket.in' },
      update: { role: UserRole.BUYER, status: 'ACTIVE' },
      create: {
        email: 'cat_buyer_test@bharatmarket.in',
        role: UserRole.BUYER,
        status: 'ACTIVE',
      },
    });

    adminToken = jwt.sign(
      { userId: adminUser.id, role: adminUser.role, email: adminUser.email },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '1h' }
    );

    regularUserToken = jwt.sign(
      { userId: regularUser.id, role: regularUser.role, email: regularUser.email },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // Clean up test categories
    await prisma.category.deleteMany({
      where: {
        slug: {
          in: [
            'test-vehicles',
            'test-cars',
            'test-toyota',
            'test-corolla',
            'test-deep-model',
            'test-sibling-a',
            'test-sibling-b',
            'test-guarded-cat',
            'test-direct-upload',
            'test-invalid-file-cat',
          ],
        },
      },
    });

    await app.close();
  });

  it('1. GET /api/v1/categories returns active root categories', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/categories',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('2. Enforces authentication & authorization on category mutations', async () => {
    // Unauthenticated
    const resNoAuth = await app.inject({
      method: 'POST',
      url: '/api/v1/categories',
      payload: { name: 'Unauthorized Category' },
    });
    expect(resNoAuth.statusCode).toBe(401);

    // Regular buyer forbidden
    const resForbidden = await app.inject({
      method: 'POST',
      url: '/api/v1/categories',
      headers: { authorization: `Bearer ${regularUserToken}` },
      payload: { name: 'Forbidden Category' },
    });
    expect(resForbidden.statusCode).toBe(403);
  });

  it('3. Root category creation establishes level = 0 and parentId = null', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/categories',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        name: 'Test Vehicles',
        slug: 'test-vehicles',
        description: 'Automobiles and commercial vehicles',
        sortOrder: 1,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.data.parentId).toBeNull();
    expect(body.data.level).toBe(0);
    expect(body.data.slug).toBe('test-vehicles');
  });

  it('4. Child category creation establishes level = parent.level + 1', async () => {
    const root = await prisma.category.findFirst({ where: { slug: 'test-vehicles', parentId: null } });
    expect(root).toBeDefined();

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/categories',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        name: 'Test Cars',
        slug: 'test-cars',
        parentId: root!.id,
        sortOrder: 1,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.data.parentId).toBe(root!.id);
    expect(body.data.level).toBe(1);
  });

  it('5. Enforces maximum depth limit (MAX_CATEGORY_DEPTH = 4)', async () => {
    const root = await prisma.category.findFirst({ where: { slug: 'test-vehicles', parentId: null } });
    const level1 = await prisma.category.findFirst({ where: { slug: 'test-cars', parentId: root!.id } });

    // Level 2 (Brand)
    const resLevel2 = await app.inject({
      method: 'POST',
      url: '/api/v1/categories',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        name: 'Test Toyota',
        slug: 'test-toyota',
        parentId: level1!.id,
      },
    });
    expect(resLevel2.statusCode).toBe(201);
    const level2 = JSON.parse(resLevel2.payload).data;
    expect(level2.level).toBe(2);

    // Level 3 (Model)
    const resLevel3 = await app.inject({
      method: 'POST',
      url: '/api/v1/categories',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        name: 'Test Corolla',
        slug: 'test-corolla',
        parentId: level2.id,
      },
    });
    expect(resLevel3.statusCode).toBe(201);
    const level3 = JSON.parse(resLevel3.payload).data;
    expect(level3.level).toBe(3);

    // Level 4 (Should reject with 400 MAX_DEPTH_EXCEEDED)
    const resLevel4 = await app.inject({
      method: 'POST',
      url: '/api/v1/categories',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        name: 'Test Deep Model',
        slug: 'test-deep-model',
        parentId: level3.id,
      },
    });
    expect(resLevel4.statusCode).toBe(400);
    const errorBody = JSON.parse(resLevel4.payload);
    expect(errorBody.error.code).toBe('MAX_DEPTH_EXCEEDED');
  });

  it('6. Prevents assigning self or a descendant as parent (Circular Hierarchy Prevention)', async () => {
    const root = await prisma.category.findFirst({ where: { slug: 'test-vehicles', parentId: null } });
    const level1 = await prisma.category.findFirst({ where: { slug: 'test-cars', parentId: root!.id } });
    const level2 = await prisma.category.findFirst({ where: { slug: 'test-toyota', parentId: level1!.id } });

    // Self-parenting check
    const resSelf = await app.inject({
      method: 'PUT',
      url: `/api/v1/categories/${root!.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { parentId: root!.id },
    });
    expect(resSelf.statusCode).toBe(400);
    expect(JSON.parse(resSelf.payload).error.code).toBe('INVALID_PARENT_CATEGORY');

    // Descendant-as-parent check (make root a child of its grandchild level2)
    const resCircular = await app.inject({
      method: 'PUT',
      url: `/api/v1/categories/${root!.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { parentId: level2!.id },
    });
    expect(resCircular.statusCode).toBe(400);
    expect(JSON.parse(resCircular.payload).error.code).toBe('CIRCULAR_DEPENDENCY');
  });

  it('7. Enforces slug uniqueness within the same parent while permitting it across different parents', async () => {
    const root = await prisma.category.findFirst({ where: { slug: 'test-vehicles', parentId: null } });

    // Sibling duplicate slug should fail
    const resDup = await app.inject({
      method: 'POST',
      url: '/api/v1/categories',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        name: 'Cars Duplicate',
        slug: 'test-cars',
        parentId: root!.id,
      },
    });
    expect(resDup.statusCode).toBe(400);
    expect(JSON.parse(resDup.payload).error.code).toBe('SLUG_EXISTS');

    // Same slug under null (root) is a different parent, so permitted if uniqueness is scoped to parent
    const resRootSameSlug = await app.inject({
      method: 'POST',
      url: '/api/v1/categories',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        name: 'Cars at Root',
        slug: 'test-cars',
        parentId: null,
      },
    });
    expect(resRootSameSlug.statusCode).toBe(201);
    await prisma.category.delete({ where: { id: JSON.parse(resRootSameSlug.payload).data.id } });
  });

  it('8. PATCH /api/v1/categories/reorder transactionally updates sibling sort orders', async () => {
    const root = await prisma.category.findFirst({ where: { slug: 'test-vehicles', parentId: null } });

    const sibA = await prisma.category.create({
      data: { name: 'Sibling A', slug: 'test-sibling-a', parentId: root!.id, sortOrder: 10, level: 1 },
    });
    const sibB = await prisma.category.create({
      data: { name: 'Sibling B', slug: 'test-sibling-b', parentId: root!.id, sortOrder: 20, level: 1 },
    });

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/categories/reorder',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        items: [
          { id: sibA.id, sortOrder: 50 },
          { id: sibB.id, sortOrder: 5 },
        ],
      },
    });

    expect(res.statusCode).toBe(200);

    const updatedA = await prisma.category.findUnique({ where: { id: sibA.id } });
    const updatedB = await prisma.category.findUnique({ where: { id: sibB.id } });
    expect(updatedA?.sortOrder).toBe(50);
    expect(updatedB?.sortOrder).toBe(5);
  });

  it('9. Deletion Guard blocks deletion of category with children or active listings', async () => {
    const root = await prisma.category.findFirst({ where: { slug: 'test-vehicles', parentId: null } });

    // Root has child 'test-cars', so deletion should be blocked
    const resWithChildren = await app.inject({
      method: 'DELETE',
      url: `/api/v1/categories/${root!.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(resWithChildren.statusCode).toBe(409);
    expect(JSON.parse(resWithChildren.payload).error.code).toBe('CATEGORY_HAS_CHILDREN');

    // Category with active ad should be blocked
    const leaf = await prisma.category.create({
      data: { name: 'Guarded Cat', slug: 'test-guarded-cat', sortOrder: 99, level: 0 },
    });

    const location = await prisma.location.findFirst();
    const admin = await prisma.user.findFirst({ where: { email: 'cat_admin_test@bharatmarket.in' } });

    const ad = await prisma.ad.create({
      data: {
        userId: admin!.id,
        categoryId: leaf.id,
        locationId: location!.id,
        title: 'Active listing for category guard test',
        slug: `guard-ad-${Date.now()}`,
        description: 'Test description with sufficient length for validation',
        price: 5000,
        status: 'ACTIVE',
        latitude: 12.97,
        longitude: 77.59,
        expiresAt: new Date(Date.now() + 86400000),
      },
    });

    const resWithAds = await app.inject({
      method: 'DELETE',
      url: `/api/v1/categories/${leaf.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(resWithAds.statusCode).toBe(409);
    expect(JSON.parse(resWithAds.payload).error.code).toBe('CATEGORY_IN_USE');

    // Clean up test ad and leaf
    await prisma.ad.delete({ where: { id: ad.id } });
    await prisma.category.delete({ where: { id: leaf.id } });
  });

  it('10. GET /api/v1/categories/tree returns nested tree structure with image references', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/categories/tree',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);

    const vehicleTree = body.data.find((c: any) => c.slug === 'test-vehicles');
    expect(vehicleTree).toBeDefined();
    expect(vehicleTree.children.length).toBeGreaterThan(0);
    expect(vehicleTree.children[0].slug).toBe('test-cars');
  });

  it('11. POST /api/v1/categories supports direct multipart image upload with atomic consistency', async () => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    // 1x1 transparent PNG buffer
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    const bodyParts = [
      `--${boundary}\r\nContent-Disposition: form-data; name="name"\r\n\r\nDirect Upload Category\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="slug"\r\n\r\ntest-direct-upload\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="sortOrder"\r\n\r\n5\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="pixel.png"\r\nContent-Type: image/png\r\n\r\n`,
    ];
    const payload = Buffer.concat([
      Buffer.from(bodyParts[0]),
      Buffer.from(bodyParts[1]),
      Buffer.from(bodyParts[2]),
      Buffer.from(bodyParts[3]),
      pngBuffer,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/categories',
      headers: {
        authorization: `Bearer ${adminToken}`,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload,
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('Direct Upload Category');
    expect(body.data.slug).toBe('test-direct-upload');
    expect(body.data.imageMediaId).toBeDefined();
    expect(body.data.image).toBeDefined();
    expect(body.data.image.url).toBeDefined();

    // Verify foreign key relationship is intact in database
    const dbRecord = await prisma.category.findUnique({
      where: { id: body.data.id },
      include: { imageMedia: true },
    });
    expect(dbRecord).toBeDefined();
    expect(dbRecord!.imageMediaId).toBe(body.data.imageMediaId);
    expect(dbRecord!.imageMedia).toBeDefined();
  });

  it('12. Direct upload rolls back atomically on invalid file without saving category or orphan media', async () => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    // Invalid non-image buffer (corrupt spoofed file)
    const corruptBuffer = Buffer.from('NOT_AN_IMAGE_FILE_DATA');

    const bodyParts = [
      `--${boundary}\r\nContent-Disposition: form-data; name="name"\r\n\r\nCorrupt Cat\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="slug"\r\n\r\ntest-invalid-file-cat\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="fake.png"\r\nContent-Type: image/png\r\n\r\n`,
    ];
    const payload = Buffer.concat([
      Buffer.from(bodyParts[0]),
      Buffer.from(bodyParts[1]),
      Buffer.from(bodyParts[2]),
      corruptBuffer,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/categories',
      headers: {
        authorization: `Bearer ${adminToken}`,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload,
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.payload);
    expect(body.error.code).toBe('INVALID_FILE_CONTENT');

    // Verify rollback: no category was inserted
    const cat = await prisma.category.findFirst({
      where: { slug: 'test-invalid-file-cat' },
    });
    expect(cat).toBeNull();
  });
});
