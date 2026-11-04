import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding rich photo gallery for 3 BHK Whitefield Apartment...');

  const ad = await prisma.ad.findFirst({
    where: {
      OR: [
        { slug: '3-bhk-luxury-apartment-whitefield-bengaluru-prop03' },
        { title: { contains: 'Whitefield' } },
      ],
    },
  });

  if (!ad) {
    console.log('Whitefield property ad not found.');
    return;
  }

  // Update title & subtitle if needed to match reference:
  // Title: "3 BHK Luxury Apartment in Whitefield, Bengaluru"
  // Subtitle: "Gated Community with Clubhouse"
  await prisma.ad.update({
    where: { id: ad.id },
    data: {
      title: '3 BHK Luxury Apartment in Whitefield, Bengaluru',
      description: 'Gated Community with Clubhouse\n\nSpacious 1850 sq.ft 3 BHK flat with east-facing balconies overlooking the landscaped garden. Italian marble flooring, modular kitchen with chimney, 2 covered car parks, and 100% power backup. OC received.',
      price: 8800000,
      isNegotiable: true,
      attributesCache: {
        bhk: '3 BHK',
        bathrooms: 3,
        furnishing: 'Semi-Furnished',
        carpet_area: '1850 sqft',
        property_type: 'Apartment',
      },
    },
  });

  // Re-seed gallery images
  await prisma.adImage.deleteMany({ where: { adId: ad.id } });

  const galleryImages = [
    {
      originalUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&auto=format&fit=crop&q=80',
      displayUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&auto=format&fit=crop&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=300&auto=format&fit=crop&q=80',
      sortOrder: 0,
      isCover: true,
    },
    {
      originalUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80',
      displayUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=300&auto=format&fit=crop&q=80',
      sortOrder: 1,
      isCover: false,
    },
    {
      originalUrl: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=1200&auto=format&fit=crop&q=80',
      displayUrl: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=1200&auto=format&fit=crop&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=300&auto=format&fit=crop&q=80',
      sortOrder: 2,
      isCover: false,
    },
    {
      originalUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200&auto=format&fit=crop&q=80',
      displayUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200&auto=format&fit=crop&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=300&auto=format&fit=crop&q=80',
      sortOrder: 3,
      isCover: false,
    },
    {
      originalUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&auto=format&fit=crop&q=80',
      displayUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&auto=format&fit=crop&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=300&auto=format&fit=crop&q=80',
      sortOrder: 4,
      isCover: false,
    },
  ];

  for (const img of galleryImages) {
    await prisma.adImage.create({
      data: {
        adId: ad.id,
        ...img,
      },
    });
  }

  console.log('Successfully seeded 5 gallery images for Whitefield apartment!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
