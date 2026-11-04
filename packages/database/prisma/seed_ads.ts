import { PrismaClient, AdStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding rich classified ads for Phase 4...');

  // 1. Get or create a sample user with profile
  let user = await prisma.user.findFirst({
    where: { phoneNumber: '+919876543210' },
    include: { profile: true },
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
            name: 'Rahul Sharma',
            bio: 'Verified buyer & seller on OLX ORBIT',
            ratingAverage: 4.9,
            ratingCount: 18,
            isIdentityVerified: true,
          },
        },
      },
      include: { profile: true },
    });
  }

  // 2. Fetch categories
  const carsCat = await prisma.category.findUnique({ where: { slug: 'cars' } });
  const mobilesCat = await prisma.category.findUnique({ where: { slug: 'mobiles' } });
  const bikesCat = await prisma.category.findUnique({ where: { slug: 'bikes' } });
  const propCat = await prisma.category.findUnique({ where: { slug: 'properties' } });
  const elecCat = await prisma.category.findUnique({ where: { slug: 'electronics' } });
  const furnCat = await prisma.category.findUnique({ where: { slug: 'furniture' } });

  // 3. Fetch cities
  const blr = await prisma.location.findFirst({ where: { slug: 'bengaluru' } });
  const del = await prisma.location.findFirst({ where: { slug: 'delhi' } });
  const mum = await prisma.location.findFirst({ where: { slug: 'mumbai' } });
  const hyd = await prisma.location.findFirst({ where: { slug: 'hyderabad' } });
  const amd = await prisma.location.findFirst({ where: { slug: 'ahmedabad' } });

  const adsToCreate = [
    {
      title: 'Apple iPhone 14 Pro Max 256GB Deep Purple (Battery 92%)',
      slug: 'iphone-14-pro-max-256gb-deep-purple-blr01',
      description: 'Excellent condition iPhone 14 Pro Max with bill, original box, and braided cable. AppleCare valid till Dec 2026. No scratches or dents, always used with tempered glass and Spigen armor case.',
      price: 78000,
      isNegotiable: true,
      categoryId: mobilesCat?.id,
      locationId: blr?.id || amd?.id,
      latitude: 12.9716,
      longitude: 77.5946,
      attributesCache: {
        brand: 'Apple',
        storage: '256 GB',
        ram: '6 GB',
        condition: 'Like New',
        color: 'Deep Purple',
      },
      imageUrl: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&auto=format&fit=crop&q=80',
    },
    {
      title: 'Royal Enfield Classic 350 Reborn - Stealth Black 2023',
      slug: 'royal-enfield-classic-350-stealth-black-del02',
      description: 'First owner Royal Enfield Classic 350 Dual-channel ABS in Stealth Black. Only 7,400 KM driven. Full service record from authorized RE service center. Extra touring seat and crash guard installed.',
      price: 155000,
      isNegotiable: true,
      categoryId: bikesCat?.id,
      locationId: del?.id || amd?.id,
      latitude: 28.6139,
      longitude: 77.209,
      attributesCache: {
        brand: 'Royal Enfield',
        year: 2023,
        kms_driven: 7400,
        fuel_type: 'Petrol',
        owners: '1st',
      },
      imageUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800&auto=format&fit=crop&q=80',
    },
    {
      title: '3 BHK Luxury Apartment in Whitefield, Gated Community with Clubhouse',
      slug: '3-bhk-luxury-apartment-whitefield-bengaluru-prop03',
      description: 'Spacious 1850 sq.ft 3 BHK flat with east-facing balconies overlooking the landscaped garden. Italian marble flooring, modular kitchen with chimney, 2 covered car parks, and 100% power backup. OC received.',
      price: 8800000,
      isNegotiable: true,
      categoryId: propCat?.id,
      locationId: blr?.id || amd?.id,
      latitude: 12.9698,
      longitude: 77.7499,
      attributesCache: {
        property_type: 'Apartment',
        bhk: '3 BHK',
        bathrooms: 3,
        furnishing: 'Semi-Furnished',
        carpet_area: '1850 sqft',
      },
      imageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=80',
    },
    {
      title: 'Sony Bravia 55 inch 4K Ultra HD Smart OLED Google TV',
      slug: 'sony-bravia-55-inch-4k-oled-tv-mum04',
      description: 'XR Cognitive Processor, Dolby Vision Atmos, 120Hz refresh rate perfect for PS5 and movies. Mint condition, only 10 months old with original wall mount and voice remote. Selling due to relocation.',
      price: 54000,
      isNegotiable: true,
      categoryId: elecCat?.id,
      locationId: mum?.id || amd?.id,
      latitude: 19.076,
      longitude: 72.8777,
      attributesCache: {
        brand: 'Sony',
        screen_size: '55 inch',
        resolution: '4K OLED',
        warranty: '2 Months Remaining',
      },
      imageUrl: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&auto=format&fit=crop&q=80',
    },
    {
      title: 'Solid Sheesham Wood 6 Seater Dining Table with Cushioned Chairs',
      slug: 'solid-sheesham-wood-6-seater-dining-table-furn05',
      description: 'Crafted from pure seasoned Sheesham wood with natural teak finish. Includes 6 heavy wooden chairs with high-density foam cushions and 8mm beveled glass top. Extremely sturdy and premium look.',
      price: 24500,
      isNegotiable: false,
      categoryId: furnCat?.id,
      locationId: amd?.id,
      latitude: 23.0225,
      longitude: 72.5714,
      attributesCache: {
        material: 'Solid Wood (Sheesham)',
        seating_capacity: '6 Seater',
        condition: 'Excellent',
      },
      imageUrl: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=800&auto=format&fit=crop&q=80',
    },
    {
      title: 'Apple MacBook Pro 14 M2 Pro (16GB RAM, 512GB SSD) Space Grey',
      slug: 'apple-macbook-pro-14-m2-pro-space-grey-hyd06',
      description: 'MacBook Pro 14-inch with 10-core CPU and 16-core GPU M2 Pro chip. Battery cycle count only 48 (98% battery health). Includes original 67W MagSafe charger and Indian bill. Pristine condition.',
      price: 118000,
      isNegotiable: true,
      categoryId: elecCat?.id,
      locationId: hyd?.id || amd?.id,
      latitude: 17.385,
      longitude: 78.4867,
      attributesCache: {
        brand: 'Apple',
        processor: 'M2 Pro',
        ram: '16 GB',
        storage: '512 GB SSD',
      },
      imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80',
    },
  ];

  for (const adData of adsToCreate) {
    if (!adData.categoryId || !adData.locationId) continue;

    const existing = await prisma.ad.findUnique({ where: { slug: adData.slug } });
    if (existing) {
      console.log(`Ad ${adData.slug} already exists, skipping.`);
      continue;
    }

    await prisma.ad.create({
      data: {
        userId: user!.id,
        categoryId: adData.categoryId,
        locationId: adData.locationId,
        title: adData.title,
        slug: adData.slug,
        description: adData.description,
        price: adData.price,
        isNegotiable: adData.isNegotiable,
        status: AdStatus.ACTIVE,
        latitude: adData.latitude,
        longitude: adData.longitude,
        contactPreference: 'CHAT_AND_CALL',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        attributesCache: adData.attributesCache,
        images: {
          create: [
            {
              originalUrl: adData.imageUrl,
              displayUrl: adData.imageUrl,
              thumbnailUrl: adData.imageUrl,
              sortOrder: 0,
              isCover: true,
            },
          ],
        },
      },
    });

    console.log(`Created ad: ${adData.title}`);
  }

  console.log('Seeding ads completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
