import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  // Move all non-reference ads to 15+ days ago
  await prisma.ad.updateMany({
    where: {
      NOT: {
        slug: {
          in: [
            'honda-activa-6g-ranchi-ref01',
            'iphone-13-blue-128gb-ranchi-ref02',
            '2-bhk-apartment-ranchi-ref03',
            'wooden-study-desk-ranchi-ref04',
          ],
        },
      },
    },
    data: {
      createdAt: new Date(now - 15 * DAY),
    },
  });

  // Set reference ads in descending order of createdAt
  // 1. Honda Activa 6G (2 days ago)
  await prisma.ad.update({
    where: { slug: 'honda-activa-6g-ranchi-ref01' },
    data: { createdAt: new Date(now - 2 * DAY - 2 * 60 * 60 * 1000) },
  });

  // 2. iPhone 13 (3 days ago)
  await prisma.ad.update({
    where: { slug: 'iphone-13-blue-128gb-ranchi-ref02' },
    data: { createdAt: new Date(now - 3 * DAY - 4 * 60 * 60 * 1000) },
  });

  // 3. 2 BHK Apartment (5 days ago)
  await prisma.ad.update({
    where: { slug: '2-bhk-apartment-ranchi-ref03' },
    data: { createdAt: new Date(now - 5 * DAY - 1 * 60 * 60 * 1000) },
  });

  // 4. Wooden Study Desk (6 days ago)
  await prisma.ad.update({
    where: { slug: 'wooden-study-desk-ranchi-ref04' },
    data: { createdAt: new Date(now - 6 * DAY - 3 * 60 * 60 * 1000) },
  });

  console.log('Set exact natural dates for reference ads!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
