// Canonical location types matching backend domain model
export type LocationType = 'country' | 'state' | 'city' | 'locality' | 'area';

export interface LocationBreadcrumbParent {
  id: string;
  name: string;
  slug: string;
  type: LocationType | string;
  parent?: LocationBreadcrumbParent | null;
}

export interface LocationItem {
  id: string;
  name: string;
  slug: string;
  type: LocationType | string;
  parentId?: string | null;
  path?: string;
  depth?: number;
  latitude?: number | null;
  longitude?: number | null;
  distanceKm?: number;
  parent?: LocationBreadcrumbParent | null;
  children?: LocationItem[];
}

export interface NearbyLocationParams {
  latitude: number;
  longitude: number;
  radiusKm?: number;
  type?: LocationType;
  limit?: number;
}

