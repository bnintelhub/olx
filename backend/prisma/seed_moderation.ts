import { PrismaClient, AdStatus, ReportReason, ReportStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding moderation data for Phase 6...');

  // 1. Get or create seller user
  const user = await prisma.user.findFirst({
    where: { phoneNumber: '+919876543210' },
  });

  const reporter = await prisma.user.findFirst({
    where: { phoneNumber: '+919833445566' },
  });

  const cat = await prisma.category.findUnique({ where: { slug: 'electronics' } });
  const loc = await prisma.location.findFirst({ where: { slug: 'delhi' } });

  if (user && cat && loc) {
    // Create pending review ad
    const pendingSlug = 'playstation-5-disc-edition-bundle-pending01';
    const existing = await prisma.ad.findUnique({ where: { slug: pendingSlug } });

    let pendingAd;
    if (!existing) {
      pendingAd = await prisma.ad.create({
        data: {
          userId: user.id,
          categoryId: cat.id,
          locationId: loc.id,
          title: 'Sony PlayStation 5 Disc Edition + 2 DualSense Controllers',
          slug: pendingSlug,
          description: 'Brand new sealed pack PS5 with God of War Ragnarok and extra controller. Full Indian warranty with bill.',
          price: 36000,
          isNegotiable: true,
          status: AdStatus.PENDING_REVIEW,
          rejectionReason: 'Flagged for moderation: High-demand console listed below market price threshold',
          latitude: 28.6139,
          longitude: 77.209,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          images: {
            create: [
              {
                originalUrl: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800&auto=format&fit=crop&q=80',
                displayUrl: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800&auto=format&fit=crop&q=80',
                thumbnailUrl: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800&auto=format&fit=crop&q=80',
                sortOrder: 0,
                isCover: true,
              },
            ],
          },
        },
      });
      console.log('Created pending review ad for PS5');
    } else {
      pendingAd = existing;
    }

    // Create a sample user report
    const activeAd = await prisma.ad.findFirst({
      where: { status: AdStatus.ACTIVE },
    });

    if (activeAd && reporter) {
      const existingReport = await prisma.report.findFirst({
        where: { adId: activeAd.id, reporterId: reporter.id },
      });

      if (!existingReport) {
        await prisma.report.create({
          data: {
            reporterId: reporter.id,
            reportedId: activeAd.userId,
            adId: activeAd.id,
            reason: ReportReason.MISLEADING_PRICE,
            details: 'Seller initially agreed to price on chat but asked for token money in private.',
            status: ReportStatus.PENDING,
          },
        });
        console.log('Created sample user report on ad');
      }
    }
  }

  console.log('Moderation seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
