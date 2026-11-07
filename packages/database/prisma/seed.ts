import { PrismaClient, AttributeType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Locations, Hierarchical Categories & Dynamic Attributes in MySQL...');

  // 1. Seed Indian Major Cities
  const locationsData = [
    { name: 'Bengaluru', slug: 'bengaluru', type: 'CITY', latitude: 12.9716, longitude: 77.5946 },
    { name: 'Mumbai', slug: 'mumbai', type: 'CITY', latitude: 19.0760, longitude: 72.8777 },
    { name: 'Delhi NCR', slug: 'delhi', type: 'CITY', latitude: 28.7041, longitude: 77.1025 },
    { name: 'Hyderabad', slug: 'hyderabad', type: 'CITY', latitude: 17.3850, longitude: 78.4867 },
    { name: 'Chennai', slug: 'chennai', type: 'CITY', latitude: 13.0827, longitude: 80.2707 },
    { name: 'Kolkata', slug: 'kolkata', type: 'CITY', latitude: 22.5726, longitude: 88.3639 },
    { name: 'Pune', slug: 'pune', type: 'CITY', latitude: 18.5204, longitude: 73.8567 },
    { name: 'Ahmedabad', slug: 'ahmedabad', type: 'CITY', latitude: 23.0225, longitude: 72.5714 },
    { name: 'Jaipur', slug: 'jaipur', type: 'CITY', latitude: 26.9124, longitude: 75.7873 },
    { name: 'Indore', slug: 'indore', type: 'CITY', latitude: 22.7196, longitude: 75.8577 },
    { name: 'Chandigarh', slug: 'chandigarh', type: 'CITY', latitude: 30.7333, longitude: 76.7794 },
    { name: 'Lucknow', slug: 'lucknow', type: 'CITY', latitude: 26.8467, longitude: 80.9462 },
    { name: 'Patna', slug: 'patna', type: 'CITY', latitude: 25.5941, longitude: 85.1376 },
  ];

  for (const loc of locationsData) {
    const existing = await prisma.location.findFirst({
      where: { slug: loc.slug, parentId: null },
    });
    if (!existing) {
      await prisma.location.create({ data: loc });
    }
  }

  // 2. Seed Nested Categories & Attributes
  const categoriesHierarchy = [
    {
      name: 'Cars',
      slug: 'cars',
      iconUrl: 'car',
      displayOrder: 1,
      attributes: [
        { name: 'Brand', key: 'brand', type: AttributeType.SELECT, options: ['Maruti Suzuki', 'Hyundai', 'Tata', 'Mahindra', 'Honda', 'Toyota', 'Kia', 'Volkswagen', 'Skoda', 'MG', 'BMW', 'Mercedes-Benz'], isRequired: true, isFilterable: true, displayOrder: 1 },
        { name: 'Year of Manufacture', key: 'year', type: AttributeType.NUMBER, isRequired: true, isFilterable: true, displayOrder: 2 },
        { name: 'Fuel Type', key: 'fuel_type', type: AttributeType.SELECT, options: ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'], isRequired: true, isFilterable: true, displayOrder: 3 },
        { name: 'Transmission', key: 'transmission', type: AttributeType.SELECT, options: ['Manual', 'Automatic'], isRequired: true, isFilterable: true, displayOrder: 4 },
        { name: 'KM Driven', key: 'kms_driven', type: AttributeType.NUMBER, unit: 'KM', isRequired: true, isFilterable: true, displayOrder: 5 },
        { name: 'No. of Owners', key: 'owners', type: AttributeType.SELECT, options: ['1st', '2nd', '3rd', '4th+'], isRequired: false, isFilterable: true, displayOrder: 6 },
        { name: 'Insurance Validity', key: 'insurance', type: AttributeType.SELECT, options: ['Comprehensive', 'Third Party', 'Expired'], isRequired: false, isFilterable: false, displayOrder: 7 },
      ],
      subcategories: [
        { name: 'Used Cars', slug: 'used-cars', displayOrder: 1 },
        { name: 'Commercial & Other Vehicles', slug: 'commercial-cars', displayOrder: 2 },
        { name: 'Car Spare Parts & Accessories', slug: 'car-spares', displayOrder: 3 },
      ],
    },
    {
      name: 'Mobiles',
      slug: 'mobiles',
      iconUrl: 'smartphone',
      displayOrder: 2,
      attributes: [
        { name: 'Brand', key: 'brand', type: AttributeType.SELECT, options: ['Apple', 'Samsung', 'Xiaomi', 'OnePlus', 'Vivo', 'Oppo', 'Realme', 'Google', 'Motorola', 'Nothing'], isRequired: true, isFilterable: true, displayOrder: 1 },
        { name: 'Internal Storage', key: 'storage', type: AttributeType.SELECT, options: ['32 GB', '64 GB', '128 GB', '256 GB', '512 GB', '1 TB'], isRequired: true, isFilterable: true, displayOrder: 2 },
        { name: 'RAM Capacity', key: 'ram', type: AttributeType.SELECT, options: ['3 GB', '4 GB', '6 GB', '8 GB', '12 GB', '16 GB'], isRequired: false, isFilterable: true, displayOrder: 3 },
        { name: 'Physical Condition', key: 'condition', type: AttributeType.SELECT, options: ['Brand New (Unopened)', 'Like New', 'Used - Excellent', 'Used - Good', 'Used - Fair'], isRequired: true, isFilterable: true, displayOrder: 4 },
        { name: 'Original Bill & Box Available', key: 'bill_box', type: AttributeType.BOOLEAN, isRequired: false, isFilterable: true, displayOrder: 5 },
      ],
      subcategories: [
        { name: 'Mobile Phones', slug: 'mobile-phones', displayOrder: 1 },
        { name: 'Tablets & iPads', slug: 'tablets', displayOrder: 2 },
        { name: 'Smart Watches & Wearables', slug: 'smart-watches', displayOrder: 3 },
        { name: 'Accessories & Chargers', slug: 'mobile-accessories', displayOrder: 4 },
      ],
    },
    {
      name: 'Bikes',
      slug: 'bikes',
      iconUrl: 'bike',
      displayOrder: 3,
      attributes: [
        { name: 'Brand', key: 'brand', type: AttributeType.SELECT, options: ['Hero', 'Bajaj', 'Honda', 'Royal Enfield', 'TVS', 'Yamaha', 'KTM', 'Suzuki', 'Ather', 'Ola Electric'], isRequired: true, isFilterable: true, displayOrder: 1 },
        { name: 'Year of Registration', key: 'year', type: AttributeType.NUMBER, isRequired: true, isFilterable: true, displayOrder: 2 },
        { name: 'KM Driven', key: 'kms_driven', type: AttributeType.NUMBER, unit: 'KM', isRequired: true, isFilterable: true, displayOrder: 3 },
      ],
      subcategories: [
        { name: 'Motorcycles', slug: 'motorcycles', displayOrder: 1 },
        { name: 'Scooters & Activa', slug: 'scooters', displayOrder: 2 },
        { name: 'Electric Two-Wheelers', slug: 'electric-bikes', displayOrder: 3 },
        { name: 'Bicycles', slug: 'bicycles', displayOrder: 4 },
        { name: 'Spare Parts & Helmets', slug: 'bike-spare-parts', displayOrder: 5 },
      ],
    },
    {
      name: 'Properties',
      slug: 'properties',
      iconUrl: 'home',
      displayOrder: 4,
      attributes: [
        { name: 'Bedrooms (BHK)', key: 'bhk', type: AttributeType.SELECT, options: ['1 RK / Studio', '1 BHK', '2 BHK', '3 BHK', '4+ BHK'], isRequired: false, isFilterable: true, displayOrder: 1 },
        { name: 'Furnishing State', key: 'furnishing', type: AttributeType.SELECT, options: ['Fully Furnished', 'Semi-Furnished', 'Unfurnished'], isRequired: false, isFilterable: true, displayOrder: 2 },
        { name: 'Super Builtup Area', key: 'sqft', type: AttributeType.NUMBER, unit: 'Sq.Ft', isRequired: false, isFilterable: true, displayOrder: 3 },
        { name: 'Car Parking Available', key: 'car_parking', type: AttributeType.BOOLEAN, isRequired: false, isFilterable: true, displayOrder: 4 },
      ],
      subcategories: [
        { name: 'For Sale: Houses & Apartments', slug: 'houses-apartments-for-sale', displayOrder: 1 },
        { name: 'For Rent: Houses & Apartments', slug: 'houses-apartments-for-rent', displayOrder: 2 },
        { name: 'Lands & Plots', slug: 'lands-plots', displayOrder: 3 },
        { name: 'PG & Guest Houses', slug: 'pg-guest-houses', displayOrder: 4 },
        { name: 'For Rent: Shops & Offices', slug: 'commercial-property-rent', displayOrder: 5 },
      ],
    },
    {
      name: 'Electronics & Appliances',
      slug: 'electronics',
      iconUrl: 'tv',
      displayOrder: 5,
      attributes: [
        { name: 'Device Condition', key: 'condition', type: AttributeType.SELECT, options: ['Brand New', 'Like New', 'Used - Normal'], isRequired: true, isFilterable: true, displayOrder: 1 },
      ],
      subcategories: [
        { name: 'TVs, Video & Audio', slug: 'tvs-audio', displayOrder: 1 },
        { name: 'Kitchen & Home Appliances', slug: 'kitchen-appliances', displayOrder: 2 },
        { name: 'Computers & Laptops', slug: 'computers-laptops', displayOrder: 3 },
        { name: 'Cameras & Lenses', slug: 'cameras-lenses', displayOrder: 4 },
        { name: 'Air Conditioners & Coolers', slug: 'air-conditioners', displayOrder: 5 },
        { name: 'Refrigerators & Washing Machines', slug: 'refrigerators-washing-machines', displayOrder: 6 },
      ],
    },
    {
      name: 'Furniture',
      slug: 'furniture',
      iconUrl: 'armchair',
      displayOrder: 6,
      subcategories: [
        { name: 'Sofa & Dining Sets', slug: 'sofa-dining', displayOrder: 1 },
        { name: 'Beds & Wardrobes', slug: 'beds-wardrobes', displayOrder: 2 },
        { name: 'Home Decor & Garden', slug: 'home-decor', displayOrder: 3 },
        { name: 'Kids Furniture', slug: 'kids-furniture', displayOrder: 4 },
        { name: 'Office & Study Tables', slug: 'office-furniture', displayOrder: 5 },
      ],
    },
    {
      name: 'Commercial Vehicles & Spares',
      slug: 'commercial-vehicles',
      iconUrl: 'truck',
      displayOrder: 7,
      subcategories: [
        { name: 'Commercial Trucks & Pickups', slug: 'commercial-trucks', displayOrder: 1 },
        { name: 'Auto Rickshaws & E-Rickshaws', slug: 'auto-rickshaws', displayOrder: 2 },
        { name: 'Buses & Vans', slug: 'buses-vans', displayOrder: 3 },
      ],
    },
    {
      name: 'Fashion',
      slug: 'fashion',
      iconUrl: 'shirt',
      displayOrder: 8,
      subcategories: [
        { name: 'Men Clothing & Footwear', slug: 'men-fashion', displayOrder: 1 },
        { name: 'Women Clothing & Handbags', slug: 'women-fashion', displayOrder: 2 },
        { name: 'Kids Fashion', slug: 'kids-fashion', displayOrder: 3 },
        { name: 'Watches & Jewelry', slug: 'watches-jewelry', displayOrder: 4 },
      ],
    },
    {
      name: 'Books, Sports & Hobbies',
      slug: 'books-sports-hobbies',
      iconUrl: 'book-open',
      displayOrder: 9,
      subcategories: [
        { name: 'Books & Study Materials', slug: 'books', displayOrder: 1 },
        { name: 'Gym & Fitness Equipment', slug: 'gym-fitness', displayOrder: 2 },
        { name: 'Musical Instruments (Guitars, Keyboards)', slug: 'musical-instruments', displayOrder: 3 },
        { name: 'Sports Equipment', slug: 'sports-equipment', displayOrder: 4 },
      ],
    },
    {
      name: 'Pets',
      slug: 'pets',
      iconUrl: 'paw-print',
      displayOrder: 10,
      subcategories: [
        { name: 'Fishes & Aquariums', slug: 'fishes-aquarium', displayOrder: 1 },
        { name: 'Pet Food & Accessories', slug: 'pet-food-accessories', displayOrder: 2 },
        { name: 'Other Pet Supplies', slug: 'other-pet-supplies', displayOrder: 3 },
      ],
    },
    {
      name: 'Services',
      slug: 'services',
      iconUrl: 'wrench',
      displayOrder: 11,
      subcategories: [
        { name: 'Electronics & Appliance Repair', slug: 'electronics-repair', displayOrder: 1 },
        { name: 'Packers & Movers', slug: 'packers-movers', displayOrder: 2 },
        { name: 'Home Renovation & Painting', slug: 'home-renovation', displayOrder: 3 },
        { name: 'Cleaning & Pest Control', slug: 'cleaning-services', displayOrder: 4 },
        { name: 'Car & Bike Services', slug: 'vehicle-repair-services', displayOrder: 5 },
      ],
    },
    {
      name: 'Jobs',
      slug: 'jobs',
      iconUrl: 'briefcase',
      displayOrder: 12,
      attributes: [
        { name: 'Salary Period', key: 'salary_period', type: AttributeType.SELECT, options: ['Hourly', 'Monthly', 'Yearly'], isRequired: true, isFilterable: true, displayOrder: 1 },
        { name: 'Position Type', key: 'position_type', type: AttributeType.SELECT, options: ['Full-time', 'Part-time', 'Contract', 'Temporary'], isRequired: true, isFilterable: true, displayOrder: 2 },
        { name: 'Salary From (₹)', key: 'salary_from', type: AttributeType.NUMBER, unit: 'INR', isRequired: false, isFilterable: true, displayOrder: 3 },
        { name: 'Salary To (₹)', key: 'salary_to', type: AttributeType.NUMBER, unit: 'INR', isRequired: false, isFilterable: true, displayOrder: 4 },
      ],
      subcategories: [
        { name: 'Data Entry & Back Office', slug: 'data-entry-jobs', displayOrder: 1 },
        { name: 'Sales & Marketing', slug: 'sales-marketing-jobs', displayOrder: 2 },
        { name: 'BPO & Telecalling', slug: 'bpo-telecaller-jobs', displayOrder: 3 },
        { name: 'Delivery & Logistics', slug: 'delivery-jobs', displayOrder: 4 },
        { name: 'Driver & Chauffeur', slug: 'driver-jobs', displayOrder: 5 },
        { name: 'Office Assistant & Receptionist', slug: 'office-assistant-jobs', displayOrder: 6 },
        { name: 'Cook & Hospitality', slug: 'cook-hospitality-jobs', displayOrder: 7 },
      ],
    },
  ];

  for (const catData of categoriesHierarchy) {
    const { attributes, subcategories, ...catFields } = catData;

    // 1. Upsert Parent Category
    const existingParent = await prisma.category.findFirst({
      where: { parentId: null, slug: catFields.slug },
    });
    const parent = existingParent
      ? await prisma.category.update({
          where: { id: existingParent.id },
          data: { name: catFields.name, sortOrder: catFields.displayOrder, iconUrl: catFields.iconUrl, level: 0 },
        })
      : await prisma.category.create({
          data: {
            name: catFields.name,
            slug: catFields.slug,
            sortOrder: catFields.displayOrder,
            iconUrl: catFields.iconUrl,
            level: 0,
            parentId: null,
          },
        });

    // 2. Upsert Attributes for Parent
    if (attributes && attributes.length > 0) {
      for (const attr of attributes) {
        await prisma.categoryAttribute.upsert({
          where: { categoryId_key: { categoryId: parent.id, key: attr.key } },
          update: {
            name: attr.name,
            options: attr.options as any,
            isRequired: attr.isRequired,
            isFilterable: attr.isFilterable,
            unit: attr.unit,
            displayOrder: attr.displayOrder,
          },
          create: {
            categoryId: parent.id,
            name: attr.name,
            key: attr.key,
            type: attr.type,
            options: attr.options as any,
            isRequired: attr.isRequired,
            isFilterable: attr.isFilterable,
            unit: attr.unit,
            displayOrder: attr.displayOrder,
          },
        });
      }
    }

    // 3. Upsert Subcategories
    if (subcategories && subcategories.length > 0) {
      for (const sub of subcategories) {
        const existingSub = await prisma.category.findFirst({
          where: { parentId: parent.id, slug: sub.slug },
        });
        if (existingSub) {
          await prisma.category.update({
            where: { id: existingSub.id },
            data: { name: sub.name, sortOrder: sub.displayOrder, level: 1 },
          });
        } else {
          await prisma.category.create({
            data: {
              name: sub.name,
              slug: sub.slug,
              parentId: parent.id,
              sortOrder: sub.displayOrder,
              level: 1,
            },
          });
        }
      }
    }
  }

  // 3. Ensure Admin & Demo User exist
  const adminPhone = '+919999988888';
  await prisma.user.upsert({
    where: { phoneNumber: adminPhone },
    update: { role: 'ADMIN' },
    create: {
      phoneNumber: adminPhone,
      isPhoneVerified: true,
      role: 'ADMIN',
      profile: {
        create: {
          name: 'Platform Administrator',
          bio: 'OLX ORBIT Super Admin',
          isIdentityVerified: true,
        },
      },
    },
  });

  console.log('✅ Hierarchical Categories & Dynamic Attributes seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
