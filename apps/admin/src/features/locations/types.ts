export type LocationType = 'country' | 'state' | 'city' | 'locality' | 'area';

export interface LocationItem {
  id: string;
  name: string;
  normalizedName?: string;
  slug: string;
  type: LocationType | string;
  parentId: string | null;
  path: string;
  depth: number;
  latitude?: number | null;
  longitude?: number | null;
  pincode?: string | null;
  metadata?: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  pathList?: string[];
  breadcrumbs?: Array<{ id: string; name: string; type: string; slug: string }>;
  children?: LocationItem[];
  parent?: {
    id: string;
    name: string;
    type: string;
    slug: string;
  } | null;
  _count?: {
    children: number;
    ads: number;
  };
}

export interface CreateLocationPayload {
  name: string;
  type: LocationType;
  parentId?: string | null;
  slug?: string;
  latitude?: number | null;
  longitude?: number | null;
  pincode?: string | null;
  isActive?: boolean;
}

export interface UpdateLocationPayload {
  name?: string;
  slug?: string;
  parentId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  pincode?: string | null;
  isActive?: boolean;
}

export interface LocationSearchParams {
  q?: string;
  type?: string;
  status?: string;
  parentId?: string | null;
  page?: number;
  limit?: number;
}

