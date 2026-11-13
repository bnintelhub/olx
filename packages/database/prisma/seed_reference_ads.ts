import { PrismaClient, AdStatus, MediaEntityType, MediaAssetStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding exact reference classified ads matching the target UI...');

  // 1. Ensure Ranchi location exists
  let ranchi = await prisma.location.findFirst({ where: { slug: 'ranchi' } });
  if (!ranchi) {
    ranchi = await prisma.location.create({
      data: {
        name: 'Ranchi, Jharkhand',
        slug: 'ranchi',
        type: 'CITY',
        latitude: 23.3441,
        longitude: 85.3096,
      },
    });
  }


  // 2. Ensure Categories
  const bikesCat = await prisma.category.findUnique({ where: { slug: 'bikes' } });
  const mobilesCat = await prisma.category.findUnique({ where: { slug: 'mobiles' } });
  const propCat = await prisma.category.findUnique({ where: { slug: 'properties' } });
  const furnCat = await prisma.category.findUnique({ where: { slug: 'furniture' } });

  // 3. User
  let user = await prisma.user.findFirst({
    where: { phoneNumber: '+919876543210' },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        phoneNumber: '+919876543210',
        isPhoneVerified: true,
        role: 'USER',
        status: 'ACTIVE',
        profile: {
          create: {
            name: 'Prakash Kumar',
            bio: 'Verified local seller in Ranchi',
            isIdentityVerified: true,
          },
        },
      },
    });
  }

  const referenceAds = [
    {
      title: 'Honda Activa 6G',
      slug: 'honda-activa-6g-ranchi-ref01',
      description: 'Honda Activa 6G in excellent condition, single owner, driven 12,000 km, all original documents and valid insurance available.',
      price: 58000,
      isNegotiable: true,
      categoryId: bikesCat?.id,
      locationId: ranchi.id,
      latitude: 23.3441,
      longitude: 85.3096,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      imageUrl: '/activa.jpg',
      attributesCache: {
        brand: 'Honda',
        kms_driven: 12000,
        year: 2022,
        fuel_type: 'Petrol',
      },
    },
    {
      title: 'iPhone 13',
      slug: 'iphone-13-blue-128gb-ranchi-ref02',
      description: 'Apple iPhone 13 128GB in stylish Blue color. Battery health 89%, pristine condition with box and charging cable. Face ID and TrueTone 100% working.',
      price: 32000,
      isNegotiable: false,
      categoryId: mobilesCat?.id,
      locationId: ranchi.id,
      latitude: 23.3441,
      longitude: 85.3096,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      imageUrl: '/iphone13.jpg',
      attributesCache: {
        brand: 'Apple',
        storage: '128 GB',
        color: 'Blue',
      },
    },
    {
      title: '2 BHK Apartment',
      slug: '2-bhk-apartment-ranchi-ref03',
      description: 'Ready to move 2 BHK modern apartment in prime residential society. Spacious modular kitchen, reserved car parking, 24/7 power backup and security.',
      price: 4800000,
      isNegotiable: true,
      categoryId: propCat?.id,
      locationId: ranchi.id,
      latitude: 23.3441,
      longitude: 85.3096,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80',
      attributesCache: {
        bhk: '2 BHK',
        carpet_area: '1150 sqft',
        furnishing: 'Semi-Furnished',
      },
    },
    {
      title: 'Wooden Study Desk',
      slug: 'wooden-study-desk-ranchi-ref04',
      description: 'Solid engineered wood study/office desk with dual drawers and cable management. Very sturdy and minimal scratch, perfect for work from home or students.',
      price: 3500,
      isNegotiable: true,
      categoryId: furnCat?.id,
      locationId: ranchi.id,
      latitude: 23.3441,
      longitude: 85.3096,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      imageUrl: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800&auto=format&fit=crop&q=80',
      attributesCache: {
        material: 'Solid Wood',
        condition: 'Like New',
      },
    },
  ];

  for (const ad of referenceAds) {
    if (!ad.categoryId) continue;

    const existing = await prisma.ad.findUnique({ where: { slug: ad.slug } });
    if (existing) {
      // Update image & details to make sure it matches
      await prisma.ad.update({
        where: { id: existing.id },
        data: {
          title: ad.title,
          price: ad.price,
          locationId: ad.locationId,
          createdAt: ad.createdAt,
          attributesCache: ad.attributesCache,
        },
      });
      const media = await prisma.mediaAsset.upsert({
        where: { storageKey: `seed/ads/ref/${ad.slug}/cover.jpg` },
        create: {
          ownerId: user.id,
          entityType: MediaEntityType.LISTING,
          storageProvider: 'LOCAL',
          storageKey: `seed/ads/ref/${ad.slug}/cover.jpg`,
          originalName: 'cover.jpg',
          mimeType: 'image/jpeg',
          extension: 'jpg',
          status: MediaAssetStatus.READY,
          variants: {
            thumbnail: ad.imageUrl,
            card: ad.imageUrl,
            medium: ad.imageUrl,
            large: ad.imageUrl,
          },
        },
        update: {},
      });

      await prisma.adImage.deleteMany({ where: { adId: existing.id } });
      await prisma.adImage.create({
        data: {
          adId: existing.id,
          mediaAssetId: media.id,
          sortOrder: 0,
          isCover: true,
        },
      });
      console.log(`Updated ad: ${ad.title}`);
    } else {
      const media = await prisma.mediaAsset.upsert({
        where: { storageKey: `seed/ads/ref/${ad.slug}/cover.jpg` },
        create: {
          ownerId: user.id,
          entityType: MediaEntityType.LISTING,
          storageProvider: 'LOCAL',
          storageKey: `seed/ads/ref/${ad.slug}/cover.jpg`,
          originalName: 'cover.jpg',
          mimeType: 'image/jpeg',
          extension: 'jpg',
          status: MediaAssetStatus.READY,
          variants: {
            thumbnail: ad.imageUrl,
            card: ad.imageUrl,
            medium: ad.imageUrl,
            large: ad.imageUrl,
          },
        },
        update: {},
      });

      await prisma.ad.create({
        data: {
          userId: user.id,
          categoryId: ad.categoryId,
          locationId: ad.locationId,
          title: ad.title,
          slug: ad.slug,
          description: ad.description,
          price: ad.price,
          isNegotiable: ad.isNegotiable,
          status: AdStatus.ACTIVE,
          latitude: ad.latitude,
          longitude: ad.longitude,
          contactPreference: 'CHAT_AND_CALL',
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          createdAt: ad.createdAt,
          attributesCache: ad.attributesCache,
          images: {
            create: [
              {
                mediaAssetId: media.id,
                sortOrder: 0,
                isCover: true,
              },
            ],
          },
        },
      });
      console.log(`Created reference ad: ${ad.title}`);
    }
  }

  console.log('Reference ads seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
