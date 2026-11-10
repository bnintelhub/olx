// ============================================================================
// LOCATION TYPES & HIERARCHY RULES
// ============================================================================

export type LocationType = 'country' | 'state' | 'city' | 'locality' | 'area';

export const SUPPORTED_LOCATION_TYPES: LocationType[] = [
  'country',
  'state',
  'city',
  'locality',
  'area',
];

// Valid parent type transitions: country -> state -> city -> locality -> area
export const ALLOWED_PARENT_TYPES: Record<LocationType, LocationType | null> = {
  country: null,
  state: 'country',
  city: 'state',
  locality: 'city',
  area: 'locality',
};

export interface CreateLocationDto {
  name: string;
  type: LocationType;
  parentId?: string | null;
  slug?: string;
  latitude?: number | null;
  longitude?: number | null;
  pincode?: string | null;
  metadata?: Record<string, any> | null;
  isActive?: boolean;
}

export interface UpdateLocationDto {
  name?: string;
  slug?: string;
  parentId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  pincode?: string | null;
  metadata?: Record<string, any> | null;
  isActive?: boolean;
}

export interface LocationSearchParams {
  q?: string;
  type?: LocationType | string;
  status?: string;
  parentId?: string | null;
  page?: number;
  limit?: number;
}

export interface NearbyLocationParams {
  latitude: number;
  longitude: number;
  radiusKm?: number;
  type?: LocationType;
  limit?: number;
}

export interface BreadcrumbItem {
  id: string;
  name: string;
  type: string;
  slug: string;
}

export interface LocationResponseItem {
  id: string;
  name: string;
  slug: string;
  type: string;
  parentId: string | null;
  path: string;
  depth: number;
  latitude: number | null;
  longitude: number | null;
  pincode: string | null;
  metadata: any;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  breadcrumbs?: BreadcrumbItem[];
  childrenCount?: number;
  adsCount?: number;
  parent?: {
    id: string;
    name: string;
    type: string;
    slug: string;
  } | null;
}

