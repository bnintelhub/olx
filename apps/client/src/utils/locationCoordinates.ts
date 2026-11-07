export interface Coordinates {
  lat: number;
  lng: number;
}

export const KNOWN_LOCATION_COORDINATES: Record<string, Coordinates> = {
  'delhi': { lat: 28.6139, lng: 77.2090 },
  'delhi ncr': { lat: 28.6139, lng: 77.2090 },
  'new delhi': { lat: 28.6139, lng: 77.2090 },
  'noida': { lat: 28.5355, lng: 77.3910 },
  'greater noida': { lat: 28.4744, lng: 77.5040 },
  'gurgaon': { lat: 28.4595, lng: 77.0266 },
  'gurugram': { lat: 28.4595, lng: 77.0266 },
  'ghaziabad': { lat: 28.6692, lng: 77.4538 },
  'faridabad': { lat: 28.4089, lng: 77.3178 },
  'mumbai': { lat: 19.0760, lng: 72.8777 },
  'navi mumbai': { lat: 19.0330, lng: 73.0297 },
  'thane': { lat: 19.2183, lng: 72.9781 },
  'pune': { lat: 18.5204, lng: 73.8567 },
  'bangalore': { lat: 12.9716, lng: 77.5946 },
  'bengaluru': { lat: 12.9716, lng: 77.5946 },
  'hyderabad': { lat: 17.3850, lng: 78.4867 },
  'chennai': { lat: 13.0827, lng: 80.2707 },
  'kolkata': { lat: 22.5726, lng: 88.3639 },
  'ahmedabad': { lat: 23.0225, lng: 72.5714 },
  'surat': { lat: 21.1702, lng: 72.8311 },
  'jaipur': { lat: 26.9124, lng: 75.7873 },
  'lucknow': { lat: 26.8467, lng: 80.9462 },
  'kanpur': { lat: 26.4499, lng: 80.3319 },
  'nagpur': { lat: 21.1458, lng: 79.0882 },
  'indore': { lat: 22.7196, lng: 75.8577 },
  'bhopal': { lat: 23.2599, lng: 77.4126 },
  'patna': { lat: 25.5941, lng: 85.1376 },
  'vadodara': { lat: 22.3072, lng: 73.1812 },
  'chandigarh': { lat: 30.7333, lng: 76.7794 },
  'coimbatore': { lat: 11.0168, lng: 76.9558 },
  'ludhiana': { lat: 30.9010, lng: 75.8573 },
  'agra': { lat: 27.1767, lng: 78.0081 },
  'nashik': { lat: 19.9975, lng: 73.7898 },
  'ranchi': { lat: 23.3441, lng: 85.3096 },
  'varanasi': { lat: 25.3176, lng: 82.9739 },
  'meerut': { lat: 28.9845, lng: 77.7064 },
  'amritsar': { lat: 31.6340, lng: 74.8723 },
  'visakhapatnam': { lat: 17.6868, lng: 83.2185 },
  'kochi': { lat: 9.9312, lng: 76.2673 },
  'trivandrum': { lat: 8.5241, lng: 76.9366 },
  'thiruvananthapuram': { lat: 8.5241, lng: 76.9366 },
  'bhubaneswar': { lat: 20.2961, lng: 85.8245 },
  'dehradun': { lat: 30.3165, lng: 78.0322 },
  'goa': { lat: 15.2993, lng: 74.1240 },
  'panaji': { lat: 15.4909, lng: 73.8278 },
  'india': { lat: 28.6139, lng: 77.2090 },
};

export function resolveLocationCoordinates(
  locationName?: string | null,
  adLat?: number | null,
  adLng?: number | null,
  locLat?: number | null,
  locLng?: number | null
): Coordinates {
  // 1. Direct valid coordinates on ad (must be within realistic bounds)
  if (
    typeof adLat === 'number' &&
    typeof adLng === 'number' &&
    !isNaN(adLat) &&
    !isNaN(adLng) &&
    (adLat !== 0 || adLng !== 0) &&
    adLat >= 6 && adLat <= 38 && adLng >= 68 && adLng <= 98
  ) {
    return { lat: adLat, lng: adLng };
  }

  // 2. Direct valid coordinates on location relation
  if (
    typeof locLat === 'number' &&
    typeof locLng === 'number' &&
    !isNaN(locLat) &&
    !isNaN(locLng) &&
    (locLat !== 0 || locLng !== 0) &&
    locLat >= 6 && locLat <= 38 && locLng >= 68 && locLng <= 98
  ) {
    return { lat: locLat, lng: locLng };
  }

  // 3. Known city/region lookup by name
  if (locationName) {
    const clean = locationName.toLowerCase().trim();
    if (KNOWN_LOCATION_COORDINATES[clean]) {
      return KNOWN_LOCATION_COORDINATES[clean];
    }

    // Substring match
    for (const [key, coords] of Object.entries(KNOWN_LOCATION_COORDINATES)) {
      if (clean.includes(key) || key.includes(clean)) {
        return coords;
      }
    }
  }

  // 4. Default: Delhi NCR
  return { lat: 28.6139, lng: 77.2090 };
}

