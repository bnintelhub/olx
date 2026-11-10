import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/config/prisma';
import { env } from '../../src/config/env';
import { UserRole } from '@prisma/client';

describe('Locations Hierarchical System Integration Tests', () => {
  let app: FastifyInstance;
  let adminToken: string;
  let buyerToken: string;
  let createdLocationIds: string[] = [];

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // 1. Create or ensure Admin user with Staff permissions
    const adminUser = await prisma.user.upsert({
      where: { email: 'locations_admin_test@bharatmarket.in' },
      update: { role: UserRole.ADMIN, status: 'ACTIVE' },
      create: {
        email: 'locations_admin_test@bharatmarket.in',
        role: UserRole.ADMIN,
        status: 'ACTIVE',
      },
    });

    // 2. Create Regular Buyer user (no staff privileges)
    const buyerUser = await prisma.user.upsert({
      where: { email: 'locations_buyer_test@bharatmarket.in' },
      update: { role: UserRole.BUYER, status: 'ACTIVE' },
      create: {
        email: 'locations_buyer_test@bharatmarket.in',
        role: UserRole.BUYER,
        status: 'ACTIVE',
      },
    });

    adminToken = jwt.sign(
      { userId: adminUser.id, role: adminUser.role, email: adminUser.email },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '1h' }
    );

    buyerToken = jwt.sign(
      { userId: buyerUser.id, role: buyerUser.role, email: buyerUser.email },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // Clean up created test locations
    if (createdLocationIds.length > 0) {
      await prisma.location.deleteMany({
        where: { id: { in: createdLocationIds } },
      });
    }
    // Clean up test users
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'locations_admin_test@bharatmarket.in',
            'locations_buyer_test@bharatmarket.in',
          ],
        },
      },
    });
    if (app) {
      await app.close();
    }
  });

  describe('Public Client Endpoints', () => {
    it('GET /api/v1/locations should return root locations', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/locations',
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.body);
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThan(0);
      expect(json.data[0].type.toLowerCase()).toBe('country');
    });

    it('GET /api/v1/locations/cities should return list of active cities', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/locations/cities',
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.body);
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
    });

    it('GET /api/v1/locations/search should return matches with parent lineage', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/locations/search?q=Patna',
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.body);
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);

      const patna = json.data.find((item: any) => item.name.toLowerCase() === 'patna');
      if (patna) {
        expect(patna.type.toLowerCase()).toBe('city');
        expect(patna.parent).toBeDefined();
      }
    });

    it('GET /api/v1/locations/nearby should compute Haversine proximity for coordinates', async () => {
      // Coordinates for Patna center
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/locations/nearby?latitude=25.5941&longitude=85.1376&radiusKm=50',
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.body);
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      if (json.data.length > 0) {
        expect(json.data[0].distanceKm).toBeDefined();
        expect(typeof json.data[0].distanceKm).toBe('number');
      }
    });
  });

  describe('Admin Hierarchical Management & RBAC Protection', () => {
    it('POST /api/v1/admin/locations should be rejected without auth token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/locations',
        payload: {
          name: 'Unauthorized Node',
          type: 'country',
        },
      });

      expect(res.statusCode).toBe(401);
    });

    it('POST /api/v1/admin/locations should be rejected for regular non-staff user', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/locations',
        headers: {
          authorization: `Bearer ${buyerToken}`,
        },
        payload: {
          name: 'Forbidden Node',
          type: 'country',
        },
      });

      expect(res.statusCode).toBe(403);
    });

    it('POST /api/v1/admin/locations should validate allowed parent-child hierarchy rules', async () => {
      // Find India root country
      const rootsRes = await app.inject({
        method: 'GET',
        url: '/api/v1/locations',
      });
      const roots = JSON.parse(rootsRes.body).data;
      const india = roots.find((r: any) => r.slug === 'india') || roots[0];

      // Attempt invalid transition: Locality directly under Country (must be State under Country)
      const invalidRes = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/locations',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          name: 'Invalid Locality Under Country',
          type: 'locality',
          parentId: india.id,
        },
      });

      expect(invalidRes.statusCode).toBe(400);
      const json = JSON.parse(invalidRes.body);
      expect(json.error.code).toBe('INVALID_HIERARCHY');
    });

    it('POST /api/v1/admin/locations should create valid state, city, and locality nodes', async () => {
      // Find India
      const rootsRes = await app.inject({
        method: 'GET',
        url: '/api/v1/locations',
      });
      const roots = JSON.parse(rootsRes.body).data;
      const india = roots.find((r: any) => r.slug === 'india') || roots[0];

      // 1. Create Test State
      const stateRes = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/locations',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          name: 'Test Karnataka',
          type: 'state',
          parentId: india.id,
          latitude: 15.3173,
          longitude: 75.7139,
        },
      });

      expect(stateRes.statusCode).toBe(201);
      const state = JSON.parse(stateRes.body).data;
      createdLocationIds.push(state.id);
      expect(state.depth).toBe(india.depth + 1);
      expect(state.path).toBe(`${india.path}/${state.id}`);

      // 2. Create Test City under State
      const cityRes = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/locations',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          name: 'Test Bengaluru',
          type: 'city',
          parentId: state.id,
          latitude: 12.9716,
          longitude: 77.5946,
        },
      });

      expect(cityRes.statusCode).toBe(201);
      const city = JSON.parse(cityRes.body).data;
      createdLocationIds.push(city.id);
      expect(city.depth).toBe(state.depth + 1);
      expect(city.path).toBe(`${state.path}/${city.id}`);

      // 3. Create Test Locality under City
      const localityRes = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/locations',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          name: 'Test Indiranagar',
          type: 'locality',
          parentId: city.id,
          latitude: 12.9784,
          longitude: 77.6408,
        },
      });

      expect(localityRes.statusCode).toBe(201);
      const locality = JSON.parse(localityRes.body).data;
      createdLocationIds.push(locality.id);
      expect(locality.depth).toBe(city.depth + 1);
      expect(locality.path).toBe(`${city.path}/${locality.id}`);

      // 4. Duplicate sibling name check: creating another "Test Indiranagar" under city must fail
      const dupRes = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/locations',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          name: '  test indiranagar  ',
          type: 'locality',
          parentId: city.id,
        },
      });

      expect(dupRes.statusCode).toBe(409);
      expect(JSON.parse(dupRes.body).error.code).toBe('DUPLICATE_LOCATION');
    });

    it('PATCH /api/v1/admin/locations/:id should update properties and reject circular hierarchy', async () => {
      const cityId = createdLocationIds[1];
      const localityId = createdLocationIds[2];

      // Update name
      const updateRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/admin/locations/${localityId}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          name: 'Test Indiranagar 100ft',
          pincode: '560038',
        },
      });

      expect(updateRes.statusCode).toBe(200);
      const updated = JSON.parse(updateRes.body).data;
      expect(updated.name).toBe('Test Indiranagar 100ft');
      expect(updated.pincode).toBe('560038');

      // Attempt circular hierarchy: setting city parent to its own child locality
      const circularRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/admin/locations/${cityId}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          parentId: localityId,
        },
      });

      expect(circularRes.statusCode).toBe(400);
      expect(JSON.parse(circularRes.body).error.code).toBe('CIRCULAR_HIERARCHY');
    });

    it('PATCH /api/v1/admin/locations/:id/status should toggle active state', async () => {
      const localityId = createdLocationIds[2];

      const deactRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/admin/locations/${localityId}/status`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { isActive: false },
      });

      expect(deactRes.statusCode).toBe(200);
      expect(JSON.parse(deactRes.body).data.isActive).toBe(false);

      const reactRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/admin/locations/${localityId}/status`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { isActive: true },
      });

      expect(reactRes.statusCode).toBe(200);
      expect(JSON.parse(reactRes.body).data.isActive).toBe(true);
    });

    it('DELETE /api/v1/admin/locations/:id should prevent deleting nodes with active children', async () => {
      const stateId = createdLocationIds[0];

      // State has child city -> must return 409
      const delRes = await app.inject({
        method: 'DELETE',
        url: `/api/v1/admin/locations/${stateId}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(delRes.statusCode).toBe(409);
      expect(JSON.parse(delRes.body).error.code).toBe('LOCATION_IN_USE');
    });

    it('DELETE /api/v1/admin/locations/:id should delete leaf node cleanly', async () => {
      const localityId = createdLocationIds[2];

      const delRes = await app.inject({
        method: 'DELETE',
        url: `/api/v1/admin/locations/${localityId}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(delRes.statusCode).toBe(200);
      // Remove from cleanup queue since already deleted
      createdLocationIds = createdLocationIds.filter((id) => id !== localityId);
    });
  });
});
