import './load_env';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning duplicate test listings and elevating reference ads...');

  // 1. Delete test listings containing "E2E Automated Test Listing" or duplicate distress sales
  const deleted = await prisma.ad.deleteMany({
    where: {
      OR: [
        { title: { contains: 'E2E Automated' } },
        { title: { contains: 'Urgent Distress Sale' } },
      ],
    },
  });
  console.log(`Deleted ${deleted.count} duplicate/test ads.`);

  // 2. Set reference ads to newest dates so they appear prominently
  const now = Date.now();
  const refAds = [
    { slug: 'honda-activa-6g-ranchi-ref01', offsetDays: 2 },
    { slug: 'iphone-13-blue-128gb-ranchi-ref02', offsetDays: 3 },
    { slug: '2-bhk-apartment-ranchi-ref03', offsetDays: 5 },
    { slug: 'wooden-study-desk-ranchi-ref04', offsetDays: 1 },
  ];

  for (const item of refAds) {
    await prisma.ad.updateMany({
      where: { slug: item.slug },
      data: {
        createdAt: new Date(now - item.offsetDays * 24 * 60 * 60 * 1000 + 30 * 24 * 60 * 60 * 1000), // Make them the latest active
      },
    });
  }

  console.log('Reference ads refreshed and elevated!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
