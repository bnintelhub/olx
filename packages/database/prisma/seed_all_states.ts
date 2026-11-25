import './load_env';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CityData {
  name: string;
  slug: string;
  latitude: number;
  longitude: number;
}

interface StateData {
  name: string;
  slug: string;
  latitude: number;
  longitude: number;
  cities: CityData[];
}

const statesAndCities: StateData[] = [
  {
    name: 'Andhra Pradesh',
    slug: 'andhra-pradesh',
    latitude: 15.9129,
    longitude: 79.7400,
    cities: [
      { name: 'Visakhapatnam', slug: 'visakhapatnam', latitude: 17.6868, longitude: 83.2185 },
      { name: 'Vijayawada', slug: 'vijayawada', latitude: 16.5062, longitude: 80.6480 },
      { name: 'Guntur', slug: 'guntur', latitude: 16.3067, longitude: 80.4365 },
      { name: 'Tirupati', slug: 'tirupati', latitude: 13.6288, longitude: 79.4192 },
    ],
  },
  {
    name: 'Arunachal Pradesh',
    slug: 'arunachal-pradesh',
    latitude: 28.2180,
    longitude: 94.7278,
    cities: [
      { name: 'Itanagar', slug: 'itanagar', latitude: 27.0844, longitude: 93.6053 },
      { name: 'Naharlagun', slug: 'naharlagun', latitude: 27.1042, longitude: 93.6961 },
    ],
  },
  {
    name: 'Assam',
    slug: 'assam',
    latitude: 26.2006,
    longitude: 92.9376,
    cities: [
      { name: 'Guwahati', slug: 'guwahati', latitude: 26.1445, longitude: 91.7362 },
      { name: 'Silchar', slug: 'silchar', latitude: 24.8333, longitude: 92.7789 },
      { name: 'Dibrugarh', slug: 'dibrugarh', latitude: 27.4728, longitude: 94.9120 },
      { name: 'Jorhat', slug: 'jorhat', latitude: 26.7509, longitude: 94.2037 },
    ],
  },
  {
    name: 'Bihar',
    slug: 'bihar',
    latitude: 25.0961,
    longitude: 85.3131,
    cities: [
      { name: 'Patna', slug: 'patna', latitude: 25.5941, longitude: 85.1376 },
      { name: 'Gaya', slug: 'gaya', latitude: 24.7914, longitude: 85.0002 },
      { name: 'Muzaffarpur', slug: 'muzaffarpur', latitude: 26.1209, longitude: 85.3647 },
      { name: 'Bhagalpur', slug: 'bhagalpur', latitude: 25.2425, longitude: 86.9842 },
      { name: 'Darbhanga', slug: 'darbhanga', latitude: 26.1542, longitude: 85.8918 },
    ],
  },
  {
    name: 'Chhattisgarh',
    slug: 'chhattisgarh',
    latitude: 21.2787,
    longitude: 81.8661,
    cities: [
      { name: 'Raipur', slug: 'raipur', latitude: 21.2514, longitude: 81.6296 },
      { name: 'Bhilai', slug: 'bhilai', latitude: 21.1938, longitude: 81.3509 },
      { name: 'Bilaspur', slug: 'bilaspur', latitude: 22.0797, longitude: 82.1409 },
      { name: 'Korba', slug: 'korba', latitude: 22.3595, longitude: 82.7501 },
    ],
  },
  {
    name: 'Goa',
    slug: 'goa',
    latitude: 15.2993,
    longitude: 74.1240,
    cities: [
      { name: 'Panaji', slug: 'panaji', latitude: 15.4909, longitude: 73.8278 },
      { name: 'Margao', slug: 'margao', latitude: 15.2832, longitude: 73.9862 },
      { name: 'Vasco da Gama', slug: 'vasco-da-gama', latitude: 15.3982, longitude: 73.8113 },
    ],
  },
  {
    name: 'Gujarat',
    slug: 'gujarat',
    latitude: 22.2587,
    longitude: 71.1924,
    cities: [
      { name: 'Ahmedabad', slug: 'ahmedabad', latitude: 23.0225, longitude: 72.5714 },
      { name: 'Surat', slug: 'surat', latitude: 21.1702, longitude: 72.8311 },
      { name: 'Vadodara', slug: 'vadodara', latitude: 22.3072, longitude: 73.1812 },
      { name: 'Rajkot', slug: 'rajkot', latitude: 22.3039, longitude: 70.8022 },
      { name: 'Gandhinagar', slug: 'gandhinagar', latitude: 23.2156, longitude: 72.6369 },
    ],
  },
  {
    name: 'Haryana',
    slug: 'haryana',
    latitude: 29.0588,
    longitude: 76.0856,
    cities: [
      { name: 'Gurugram', slug: 'gurugram', latitude: 28.4595, longitude: 77.0266 },
      { name: 'Faridabad', slug: 'faridabad', latitude: 28.4089, longitude: 77.3178 },
      { name: 'Panipat', slug: 'panipat', latitude: 29.3909, longitude: 76.9635 },
      { name: 'Ambala', slug: 'ambala', latitude: 30.3782, longitude: 76.7767 },
      { name: 'Karnal', slug: 'karnal', latitude: 29.6857, longitude: 76.9905 },
    ],
  },
  {
    name: 'Himachal Pradesh',
    slug: 'himachal-pradesh',
    latitude: 31.1048,
    longitude: 77.1734,
    cities: [
      { name: 'Shimla', slug: 'shimla', latitude: 31.1048, longitude: 77.1734 },
      { name: 'Dharamshala', slug: 'dharamshala', latitude: 32.2190, longitude: 76.3234 },
      { name: 'Manali', slug: 'manali', latitude: 32.2432, longitude: 77.1892 },
      { name: 'Solan', slug: 'solan', latitude: 30.9045, longitude: 77.0967 },
    ],
  },
  {
    name: 'Jharkhand',
    slug: 'jharkhand',
    latitude: 23.6102,
    longitude: 85.2799,
    cities: [
      { name: 'Ranchi', slug: 'ranchi', latitude: 23.3441, longitude: 85.3096 },
      { name: 'Jamshedpur', slug: 'jamshedpur', latitude: 22.8046, longitude: 86.2029 },
      { name: 'Dhanbad', slug: 'dhanbad', latitude: 23.7957, longitude: 86.4304 },
      { name: 'Bokaro', slug: 'bokaro', latitude: 23.6693, longitude: 86.1511 },
      { name: 'Deoghar', slug: 'deoghar', latitude: 24.4826, longitude: 86.7000 },
      { name: 'Hazaribagh', slug: 'hazaribagh', latitude: 23.9925, longitude: 85.3637 },
    ],
  },
  {
    name: 'Karnataka',
    slug: 'karnataka',
    latitude: 15.3173,
    longitude: 75.7139,
    cities: [
      { name: 'Bengaluru', slug: 'bengaluru', latitude: 12.9716, longitude: 77.5946 },
      { name: 'Mysuru', slug: 'mysuru', latitude: 12.2958, longitude: 76.6394 },
      { name: 'Hubballi-Dharwad', slug: 'hubballi', latitude: 15.3647, longitude: 75.1240 },
      { name: 'Mangaluru', slug: 'mangaluru', latitude: 12.9141, longitude: 74.8560 },
      { name: 'Belagavi', slug: 'belagavi', latitude: 15.8497, longitude: 74.4977 },
    ],
  },
  {
    name: 'Kerala',
    slug: 'kerala',
    latitude: 10.8505,
    longitude: 76.2711,
    cities: [
      { name: 'Kochi', slug: 'kochi', latitude: 9.9312, longitude: 76.2673 },
      { name: 'Thiruvananthapuram', slug: 'thiruvananthapuram', latitude: 8.5241, longitude: 76.9366 },
      { name: 'Kozhikode', slug: 'kozhikode', latitude: 11.2588, longitude: 75.7804 },
      { name: 'Thrissur', slug: 'thrissur', latitude: 10.5276, longitude: 76.2144 },
    ],
  },
  {
    name: 'Madhya Pradesh',
    slug: 'madhya-pradesh',
    latitude: 22.9734,
    longitude: 78.6569,
    cities: [
      { name: 'Indore', slug: 'indore', latitude: 22.7196, longitude: 75.8577 },
      { name: 'Bhopal', slug: 'bhopal', latitude: 23.2599, longitude: 77.4126 },
      { name: 'Jabalpur', slug: 'jabalpur', latitude: 23.1815, longitude: 79.9864 },
      { name: 'Gwalior', slug: 'gwalior', latitude: 26.2183, longitude: 78.1828 },
      { name: 'Ujjain', slug: 'ujjain', latitude: 23.1765, longitude: 75.7885 },
    ],
  },
  {
    name: 'Maharashtra',
    slug: 'maharashtra',
    latitude: 19.7515,
    longitude: 75.7139,
    cities: [
      { name: 'Mumbai', slug: 'mumbai', latitude: 19.0760, longitude: 72.8777 },
      { name: 'Pune', slug: 'pune', latitude: 18.5204, longitude: 73.8567 },
      { name: 'Nagpur', slug: 'nagpur', latitude: 21.1458, longitude: 79.0882 },
      { name: 'Nashik', slug: 'nashik', latitude: 19.9975, longitude: 73.7898 },
      { name: 'Thane', slug: 'thane', latitude: 19.2183, longitude: 72.9781 },
      { name: 'Aurangabad', slug: 'aurangabad', latitude: 19.8762, longitude: 75.3433 },
    ],
  },
  {
    name: 'Manipur',
    slug: 'manipur',
    latitude: 24.6637,
    longitude: 93.9063,
    cities: [
      { name: 'Imphal', slug: 'imphal', latitude: 24.8170, longitude: 93.9368 },
    ],
  },
  {
    name: 'Meghalaya',
    slug: 'meghalaya',
    latitude: 25.4670,
    longitude: 91.3662,
    cities: [
      { name: 'Shillong', slug: 'shillong', latitude: 25.5788, longitude: 91.8933 },
      { name: 'Tura', slug: 'tura', latitude: 25.5144, longitude: 90.2023 },
    ],
  },
  {
    name: 'Mizoram',
    slug: 'mizoram',
    latitude: 23.1645,
    longitude: 92.9376,
    cities: [
      { name: 'Aizawl', slug: 'aizawl', latitude: 23.7271, longitude: 92.7176 },
    ],
  },
  {
    name: 'Nagaland',
    slug: 'nagaland',
    latitude: 26.1584,
    longitude: 94.5624,
    cities: [
      { name: 'Kohima', slug: 'kohima', latitude: 25.6751, longitude: 94.1086 },
      { name: 'Dimapur', slug: 'dimapur', latitude: 25.9094, longitude: 93.7265 },
    ],
  },
  {
    name: 'Odisha',
    slug: 'odisha',
    latitude: 20.9517,
    longitude: 85.0985,
    cities: [
      { name: 'Bhubaneswar', slug: 'bhubaneswar', latitude: 20.2961, longitude: 85.8245 },
      { name: 'Cuttack', slug: 'cuttack', latitude: 20.4625, longitude: 85.8828 },
      { name: 'Rourkela', slug: 'rourkela', latitude: 22.2604, longitude: 84.8536 },
      { name: 'Puri', slug: 'puri', latitude: 19.8135, longitude: 85.8312 },
    ],
  },
  {
    name: 'Punjab',
    slug: 'punjab',
    latitude: 31.1471,
    longitude: 75.3412,
    cities: [
      { name: 'Ludhiana', slug: 'ludhiana', latitude: 30.9010, longitude: 75.8573 },
      { name: 'Amritsar', slug: 'amritsar', latitude: 31.6340, longitude: 74.8723 },
      { name: 'Jalandhar', slug: 'jalandhar', latitude: 31.3260, longitude: 75.5762 },
      { name: 'Patiala', slug: 'patiala', latitude: 30.3398, longitude: 76.3869 },
    ],
  },
  {
    name: 'Rajasthan',
    slug: 'rajasthan',
    latitude: 27.0238,
    longitude: 74.2179,
    cities: [
      { name: 'Jaipur', slug: 'jaipur', latitude: 26.9124, longitude: 75.7873 },
      { name: 'Jodhpur', slug: 'jodhpur', latitude: 26.2389, longitude: 73.0243 },
      { name: 'Kota', slug: 'kota', latitude: 25.2138, longitude: 75.8648 },
      { name: 'Udaipur', slug: 'udaipur', latitude: 24.5854, longitude: 73.7125 },
      { name: 'Ajmer', slug: 'ajmer', latitude: 26.4499, longitude: 74.6399 },
    ],
  },
  {
    name: 'Sikkim',
    slug: 'sikkim',
    latitude: 27.5330,
    longitude: 88.5122,
    cities: [
      { name: 'Gangtok', slug: 'gangtok', latitude: 27.3389, longitude: 88.6065 },
    ],
  },
  {
    name: 'Tamil Nadu',
    slug: 'tamil-nadu',
    latitude: 11.1271,
    longitude: 78.6569,
    cities: [
      { name: 'Chennai', slug: 'chennai', latitude: 13.0827, longitude: 80.2707 },
      { name: 'Coimbatore', slug: 'coimbatore', latitude: 11.0168, longitude: 76.9558 },
      { name: 'Madurai', slug: 'madurai', latitude: 9.9252, longitude: 78.1198 },
      { name: 'Tiruchirappalli', slug: 'tiruchirappalli', latitude: 10.7905, longitude: 78.7047 },
      { name: 'Salem', slug: 'salem', latitude: 11.6643, longitude: 78.1460 },
    ],
  },
  {
    name: 'Telangana',
    slug: 'telangana',
    latitude: 18.1124,
    longitude: 79.0193,
    cities: [
      { name: 'Hyderabad', slug: 'hyderabad', latitude: 17.3850, longitude: 78.4867 },
      { name: 'Warangal', slug: 'warangal', latitude: 17.9689, longitude: 79.5941 },
      { name: 'Nizamabad', slug: 'nizamabad', latitude: 18.6725, longitude: 78.0941 },
    ],
  },
  {
    name: 'Tripura',
    slug: 'tripura',
    latitude: 23.9408,
    longitude: 91.9882,
    cities: [
      { name: 'Agartala', slug: 'agartala', latitude: 23.8315, longitude: 91.2868 },
    ],
  },
  {
    name: 'Uttar Pradesh',
    slug: 'uttar-pradesh',
    latitude: 26.8467,
    longitude: 80.9462,
    cities: [
      { name: 'Lucknow', slug: 'lucknow', latitude: 26.8467, longitude: 80.9462 },
      { name: 'Kanpur', slug: 'kanpur', latitude: 26.4499, longitude: 80.3319 },
      { name: 'Noida', slug: 'noida', latitude: 28.5355, longitude: 77.3910 },
      { name: 'Varanasi', slug: 'varanasi', latitude: 25.3176, longitude: 82.9739 },
      { name: 'Agra', slug: 'agra', latitude: 27.1767, longitude: 78.0081 },
      { name: 'Prayagraj', slug: 'prayagraj', latitude: 25.4358, longitude: 81.8463 },
      { name: 'Ghaziabad', slug: 'ghaziabad', latitude: 28.6692, longitude: 77.4538 },
      { name: 'Meerut', slug: 'meerut', latitude: 28.9845, longitude: 77.7064 },
    ],
  },
  {
    name: 'Uttarakhand',
    slug: 'uttarakhand',
    latitude: 30.0668,
    longitude: 79.0193,
    cities: [
      { name: 'Dehradun', slug: 'dehradun', latitude: 30.3165, longitude: 78.0322 },
      { name: 'Haridwar', slug: 'haridwar', latitude: 29.9457, longitude: 78.1642 },
      { name: 'Rishikesh', slug: 'rishikesh', latitude: 30.0869, longitude: 78.2676 },
      { name: 'Haldwani', slug: 'haldwani', latitude: 29.2183, longitude: 79.5130 },
    ],
  },
  {
    name: 'West Bengal',
    slug: 'west-bengal',
    latitude: 22.9868,
    longitude: 87.8550,
    cities: [
      { name: 'Kolkata', slug: 'kolkata', latitude: 22.5726, longitude: 88.3639 },
      { name: 'Howrah', slug: 'howrah', latitude: 22.5958, longitude: 88.2636 },
      { name: 'Siliguri', slug: 'siliguri', latitude: 26.7271, longitude: 88.3953 },
      { name: 'Durgapur', slug: 'durgapur', latitude: 23.5204, longitude: 87.3119 },
      { name: 'Asansol', slug: 'asansol', latitude: 23.6739, longitude: 86.9524 },
    ],
  },
  // --- Union Territories ---
  {
    name: 'Delhi',
    slug: 'delhi',
    latitude: 28.7041,
    longitude: 77.1025,
    cities: [
      { name: 'Delhi NCR', slug: 'delhi-ncr', latitude: 28.7041, longitude: 77.1025 },
      { name: 'New Delhi', slug: 'new-delhi', latitude: 28.6139, longitude: 77.2090 },
    ],
  },
  {
    name: 'Chandigarh',
    slug: 'chandigarh',
    latitude: 30.7333,
    longitude: 76.7794,
    cities: [
      { name: 'Chandigarh', slug: 'chandigarh-city', latitude: 30.7333, longitude: 76.7794 },
    ],
  },
  {
    name: 'Jammu and Kashmir',
    slug: 'jammu-and-kashmir',
    latitude: 33.7782,
    longitude: 76.5762,
    cities: [
      { name: 'Srinagar', slug: 'srinagar', latitude: 34.0837, longitude: 74.7973 },
      { name: 'Jammu', slug: 'jammu', latitude: 32.7266, longitude: 74.8570 },
    ],
  },
  {
    name: 'Ladakh',
    slug: 'ladakh',
    latitude: 34.1526,
    longitude: 77.5771,
    cities: [
      { name: 'Leh', slug: 'leh', latitude: 34.1526, longitude: 77.5771 },
      { name: 'Kargil', slug: 'kargil', latitude: 34.5539, longitude: 76.1310 },
    ],
  },
  {
    name: 'Puducherry',
    slug: 'puducherry',
    latitude: 11.9416,
    longitude: 79.8083,
    cities: [
      { name: 'Puducherry', slug: 'puducherry-city', latitude: 11.9416, longitude: 79.8083 },
    ],
  },
  {
    name: 'Andaman and Nicobar Islands',
    slug: 'andaman-and-nicobar',
    latitude: 11.7401,
    longitude: 92.6586,
    cities: [
      { name: 'Port Blair', slug: 'port-blair', latitude: 11.6234, longitude: 92.7265 },
    ],
  },
  {
    name: 'Dadra and Nagar Haveli and Daman and Diu',
    slug: 'dadra-and-nagar-haveli-and-daman-and-diu',
    latitude: 20.4283,
    longitude: 72.8397,
    cities: [
      { name: 'Daman', slug: 'daman', latitude: 20.4283, longitude: 72.8397 },
      { name: 'Silvassa', slug: 'silvassa', latitude: 20.2763, longitude: 73.0083 },
    ],
  },
  {
    name: 'Lakshadweep',
    slug: 'lakshadweep',
    latitude: 10.5667,
    longitude: 72.6417,
    cities: [
      { name: 'Kavaratti', slug: 'kavaratti', latitude: 10.5667, longitude: 72.6417 },
    ],
  },
];

export async function seedAllStates() {
  console.log('🌱 Seeding All 28 Indian States & 8 Union Territories with major cities...');

  // 1. Root Country: India
  let india = await prisma.location.findFirst({
    where: { slug: 'india', parentId: null },
  });

  if (!india) {
    india = await prisma.location.create({
      data: {
        name: 'India',
        normalizedName: 'india',
        slug: 'india',
        type: 'COUNTRY',
        latitude: 20.5937,
        longitude: 78.9629,
        path: '/india',
        depth: 0,
        isActive: true,
      },
    });
  }

  let statesCount = 0;
  let citiesCount = 0;

  for (const s of statesAndCities) {
    // Upsert State
    let state = await prisma.location.findFirst({
      where: { slug: s.slug },
    });

    if (!state) {
      state = await prisma.location.create({
        data: {
          name: s.name,
          normalizedName: s.name.toLowerCase().trim(),
          slug: s.slug,
          type: 'STATE',
          latitude: s.latitude,
          longitude: s.longitude,
          parentId: india.id,
          path: `/india/${s.slug}`,
          depth: 1,
          isActive: true,
        },
      });
      statesCount++;
    } else {
      // Update coordinates if missing
      if (!state.latitude || !state.longitude) {
        await prisma.location.update({
          where: { id: state.id },
          data: { latitude: s.latitude, longitude: s.longitude, type: 'STATE' },
        });
      }
    }

    // Seed Cities under this state
    for (const c of s.cities) {
      const existingCity = await prisma.location.findFirst({
        where: { slug: c.slug },
      });

      if (!existingCity) {
        await prisma.location.create({
          data: {
            name: c.name,
            normalizedName: c.name.toLowerCase().trim(),
            slug: c.slug,
            type: 'CITY',
            latitude: c.latitude,
            longitude: c.longitude,
            parentId: state.id,
            path: `/india/${s.slug}/${c.slug}`,
            depth: 2,
            isActive: true,
          },
        });
        citiesCount++;
      } else {
        // Ensure coordinates and parentId are up to date
        if (!existingCity.latitude || !existingCity.longitude || !existingCity.parentId) {
          await prisma.location.update({
            where: { id: existingCity.id },
            data: {
              latitude: c.latitude,
              longitude: c.longitude,
              parentId: state.id,
              path: `/india/${s.slug}/${c.slug}`,
              depth: 2,
            },
          });
        }
      }
    }
  }

  console.log(`✅ Seeded ${statesAndCities.length} Indian States/UTs and ${citiesCount} new cities.`);
}

if (require.main === module || process.argv[1]?.includes('seed_all_states')) {
  seedAllStates()
    .catch((err) => {
      console.error('Failed to seed states:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
