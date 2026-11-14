import './load_env';

import {
  PrismaClient,
  UserRole,
  UserStatus,
  AdStatus,
  ReportReason,
  ReportStatus,
  TicketPriority,
  TicketStatus,
  MediaEntityType,
  MediaAssetStatus,
} from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Seeding comprehensive admin accounts, roles, and operational data...');

  // Pre-computed bcrypt hash for password "rahul@123" (cost factor 10)
  const passwordHash = '$2b$10$hk18I7xBFXegISR746tmhOyfC3oYPajVk/UnetyuMObIVd17RE7mu';

  // 1. Seed All Staff Accounts with credentials: password rahul@123
  const staffAccounts = [
    {
      email: 'rahul@gmail.com',
      phoneNumber: '+919876543200',
      name: 'Rahul Kumar',
      role: UserRole.ADMIN, // Admin role: can only access Admin features, cannot toggle to other dashboards
      bio: 'Operations & Platform Administrator',
    },
    {
      email: 'superadmin@gmail.com',
      phoneNumber: '+919876543207',
      name: 'Super Admin',
      role: UserRole.SUPER_ADMIN, // Super Admin: full platform control, can toggle across all dashboards
      bio: 'Platform Owner & Super Administrator',
    },
    {
      email: 'rahul+admin@gmail.com',
      phoneNumber: '+919876543201',
      name: 'Rahul Admin',
      role: UserRole.ADMIN,
      bio: 'Operations & Platform Administrator',
    },
    {
      email: 'rahul+moderator@gmail.com',
      phoneNumber: '+919876543202',
      name: 'Rahul Moderator',
      role: UserRole.MODERATOR,
      bio: 'Trust, Safety & Listing Moderation Officer',
    },
    {
      email: 'rahul+support@gmail.com',
      phoneNumber: '+919876543203',
      name: 'Rahul Support',
      role: UserRole.CUSTOMER_SUPPORT,
      bio: 'Customer Resolution & Helpdesk Specialist',
    },
    {
      email: 'rahul+finance@gmail.com',
      phoneNumber: '+919876543204',
      name: 'Rahul Finance',
      role: UserRole.FINANCE_ADMIN,
      bio: 'Financial Controller & Escrow Settlements',
    },
    {
      email: 'rahul+content@gmail.com',
      phoneNumber: '+919876543205',
      name: 'Rahul Content',
      role: UserRole.CONTENT_MANAGER,
      bio: 'Marketing Campaigns & Category Taxonomy Lead',
    },
    {
      email: 'rahul+analyst@gmail.com',
      phoneNumber: '+919876543206',
      name: 'Rahul Analyst',
      role: UserRole.ANALYST,
      bio: 'Business Intelligence & Marketplace Analytics',
    },
  ];

  const createdStaffMap: Record<string, string> = {};

  for (const staff of staffAccounts) {
    const user = await prisma.user.upsert({
      where: { email: staff.email },
      update: {
        passwordHash,
        role: staff.role,
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
        isPhoneVerified: true,
        profile: {
          upsert: {
            create: {
              name: staff.name,
              bio: staff.bio,
              isIdentityVerified: true,
            },
            update: {
              name: staff.name,
              bio: staff.bio,
              isIdentityVerified: true,
            },
          },
        },
      },
      create: {
        email: staff.email,
        phoneNumber: staff.phoneNumber,
        passwordHash,
        role: staff.role,
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
        isPhoneVerified: true,
        profile: {
          create: {
            name: staff.name,
            bio: staff.bio,
            isIdentityVerified: true,
          },
        },
      },
    });

    createdStaffMap[staff.role] = user.id;
    console.log(`✓ Seeded ${staff.role}: ${staff.email} (${staff.name})`);
  }

  // 2. Ensure Sample Marketplace Sellers & Buyers
  const demoUsers = [
    {
      email: 'techhub.store@olx.in',
      phone: '+919811122233',
      name: 'TechHub Electronics',
      accountType: 'BUSINESS',
      bio: 'Verified business seller for smartphones and laptops',
    },
    {
      email: 'vikram.motors@olx.in',
      phone: '+919822233344',
      name: 'Vikram Motors',
      accountType: 'DEALER',
      bio: 'Certified Pre-Owned Cars Dealer Bangalore',
    },
    {
      email: 'priya.sharma@gmail.com',
      phone: '+919833344455',
      name: 'Priya Sharma',
      accountType: 'INDIVIDUAL',
      bio: 'Student selling personal electronics and books',
    },
  ];

  const sellerIds: string[] = [];
  for (const d of demoUsers) {
    const u = await prisma.user.upsert({
      where: { email: d.email },
      update: { status: UserStatus.ACTIVE, isEmailVerified: true },
      create: {
        email: d.email,
        phoneNumber: d.phone,
        passwordHash,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
        isPhoneVerified: true,
        profile: {
          create: {
            name: d.name,
            bio: d.bio,
            accountType: d.accountType,
            isIdentityVerified: true,
          },
        },
      },
    });
    sellerIds.push(u.id);
  }

  // 3. Ensure Category & Location
  let category = await prisma.category.findFirst({ where: { slug: 'mobiles' } });
  if (!category) {
    category = await prisma.category.create({
      data: {
        name: 'Mobiles',
        slug: 'mobiles',
        iconUrl: 'smartphone',
        sortOrder: 1,
      },
    });
  }

  let location = await prisma.location.findFirst({ where: { slug: 'delhi' } });
  if (!location) {
    location = await prisma.location.create({
      data: {
        name: 'Delhi NCR',
        slug: 'delhi',
        type: 'CITY',
        latitude: 28.6139,
        longitude: 77.209,
      },
    });
  }

  // 4. Seed Moderation Queue Ads (for Moderator Dashboard)
  const pendingAdsData = [
    {
      title: 'iPhone 15 Pro Max 256GB Natural Titanium',
      slug: 'iphone-15-pro-max-256gb-mod-demo',
      price: 24000,
      reason: 'Price suspiciously low (Market average: ₹85,000)',
      image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&auto=format&fit=crop&q=80',
    },
    {
      title: 'Royal Enfield Classic 350 Stealth Black 2023',
      slug: 'royal-enfield-classic-350-mod-demo',
      price: 52000,
      reason: 'Missing RC certificate and duplicate VIN flag',
      image: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=400&auto=format&fit=crop&q=80',
    },
    {
      title: 'Sony PlayStation 5 Disc Edition + Extra Controller',
      slug: 'ps5-disc-edition-mod-demo',
      price: 34000,
      reason: 'Duplicate listing detected across multiple locations',
      image: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=400&auto=format&fit=crop&q=80',
    },
  ];

  for (const item of pendingAdsData) {
    const existing = await prisma.ad.findUnique({ where: { slug: item.slug } });
    if (!existing) {
      // Create or reuse MediaAsset for listing image
      const media = await prisma.mediaAsset.upsert({
        where: { storageKey: `seed/mod/${item.slug}/cover.jpg` },
        create: {
          ownerId: sellerIds[0],
          entityType: MediaEntityType.LISTING,
          storageProvider: 'LOCAL',
          storageKey: `seed/mod/${item.slug}/cover.jpg`,
          originalName: 'cover.jpg',
          mimeType: 'image/jpeg',
          extension: 'jpg',
          status: MediaAssetStatus.READY,
          variants: {
            thumbnail: item.image,
            card: item.image,
            medium: item.image,
            large: item.image,
            original: item.image,
          },
        },
        update: {
          variants: {
            thumbnail: item.image,
            card: item.image,
            medium: item.image,
            large: item.image,
            original: item.image,
          },
        },
      });

      await prisma.ad.create({
        data: {
          userId: sellerIds[0],
          categoryId: category.id,
          locationId: location.id,
          title: item.title,
          slug: item.slug,
          description: `Listing item flagged for moderation review. ${item.reason}`,
          price: item.price,
          status: AdStatus.PENDING_REVIEW,
          rejectionReason: item.reason,
          latitude: 28.6139,
          longitude: 77.209,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          images: {
            create: [
              {
                mediaAssetId: media.id,
                isCover: true,
                sortOrder: 0,
              },
            ],
          },
        },
      });
    }
  }
  console.log('✓ Seeded moderation review queue listings');

  // 5. Seed Support Tickets (for Customer Support Dashboard)
  const ticketsData = [
    {
      subject: 'Listing not showing in search results after payment',
      category: 'LISTING_VISIBILITY',
      priority: TicketPriority.HIGH,
      status: TicketStatus.OPEN,
    },
    {
      subject: 'Payment deducted for Featured Ad but boost inactive',
      category: 'PAYMENTS_BILLING',
      priority: TicketPriority.HIGH,
      status: TicketStatus.IN_PROGRESS,
    },
    {
      subject: 'Phone number verification OTP not received',
      category: 'ACCOUNT_ACCESS',
      priority: TicketPriority.NORMAL,
      status: TicketStatus.OPEN,
    },
    {
      subject: 'Suspected fraudulent seller reporting non-delivery',
      category: 'FRAUD_DISPUTE',
      priority: TicketPriority.URGENT,
      status: TicketStatus.IN_PROGRESS,
    },
  ];

  for (const t of ticketsData) {
    const ticket = await prisma.supportTicket.create({
      data: {
        requesterId: sellerIds[1] || sellerIds[0],
        subject: t.subject,
        category: t.category,
        priority: t.priority,
        status: t.status,
        assignedToId: createdStaffMap[UserRole.CUSTOMER_SUPPORT],
        entries: {
          create: [
            {
              authorId: sellerIds[1] || sellerIds[0],
              body: `Customer inquiry regarding: ${t.subject}. Please investigate.`,
            },
          ],
        },
      },
    });
  }
  console.log('✓ Seeded support tickets and inquiry logs');

  // 6. Seed Marketing Banners (for Content Manager Dashboard)
  const bannersData = [
    {
      title: 'Diwali Electronics Mega Sale 2026',
      position: 'HOME_HERO',
      imageUrl: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=1200&auto=format&fit=crop&q=80',
    },
    {
      title: 'Certified Pre-Owned Cars Festival',
      position: 'VEHICLES_HEADER',
      imageUrl: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1200&auto=format&fit=crop&q=80',
    },
    {
      title: 'Zero Brokerage Homes Campaign',
      position: 'REAL_ESTATE_HEADER',
      imageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&auto=format&fit=crop&q=80',
    },
  ];

  for (const b of bannersData) {
    const existing = await prisma.banner.findFirst({ where: { title: b.title } });
    if (!existing) {
      await prisma.banner.create({
        data: {
          title: b.title,
          desktopMediaUrl: b.imageUrl,
          mobileMediaUrl: b.imageUrl,
          position: b.position,
          isActive: true,
          startsAt: new Date(),
          endsAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        },
      });
    }
  }
  console.log('✓ Seeded promotional marketing banners');

  console.log('\n🎉 ALL ADMIN ROLES & OPERATIONAL DATA SEEDED SUCCESSFULLY!');
  console.log('========================================================');
  console.log('Staff Credentials:');
  console.log('Email:    rahul@gmail.com');
  console.log('Password: rahul@123');
  console.log('Roles:    SUPER_ADMIN, ADMIN, MODERATOR, CUSTOMER_SUPPORT,');
  console.log('          FINANCE_ADMIN, CONTENT_MANAGER, ANALYST');
  console.log('========================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
