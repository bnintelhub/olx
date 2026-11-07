export interface UserProfile {
  id: string;
  userId: string;
  name: string;
  avatarUrl?: string;
  bio?: string;
  businessName?: string;
  ratingAverage: string | number;
  ratingCount: number;
  isIdentityVerified: boolean;
}

export interface User {
  id: string;
  phoneNumber?: string;
  email?: string;
  role: 'GUEST' | 'USER' | 'MODERATOR' | 'ADMIN';
  profile?: UserProfile;
  createdAt?: string;
  stats?: {
    adsCount: number;
    favouritesCount: number;
  };
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  iconUrl?: string;
  image?: {
    mediaId?: string | null;
    url?: string | null;
    thumbnailUrl?: string | null;
    displayUrl?: string | null;
    variants?: Record<string, string>;
  } | null;
  description?: string;
  displayOrder?: number;
  sortOrder?: number;
  parentId?: string | null;
  isActive?: boolean;
  subcategories?: Category[];
  children?: Category[];
  attributes?: any[];
  adsCount?: number;
}

export interface LocationItem {
  id: string;
  name: string;
  slug: string;
  type: string;
  latitude: number;
  longitude: number;
}

export interface AdImageItem {
  id: string;
  originalUrl: string;
  displayUrl: string;
  thumbnailUrl: string;
  isCover: boolean;
  sortOrder: number;
}

export interface AdItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number | string;
  isNegotiable: boolean;
  status: 'ACTIVE' | 'PENDING_REVIEW' | 'SOLD' | 'EXPIRED' | 'ARCHIVED';
  viewCount: number;
  chatCount: number;
  favouriteCount: number;
  contactPreference: string;
  attributes?: Record<string, any>;
  attributesCache?: Record<string, any>;
  attributeValues?: Array<{
    id?: string;
    value: string;
    attribute: {
      id?: string;
      name: string;
      key: string;
      displayLabel?: string | null;
      type?: string;
      unit?: string | null;
      displayOrder?: number;
    };
  }>;
  createdAt: string;
  updatedAt: string;
  category?: {
    id: string;
    name: string;
    slug: string;
    parent?: { id: string; name: string; slug: string } | null;
  };
  location?: {
    id: string;
    name: string;
    slug: string;
    type: string;
    parent?: { id: string; name: string; slug: string } | null;
  };
  images?: AdImageItem[];
  latitude?: number;
  longitude?: number;
  isFeatured?: boolean;
  isFavourited?: boolean;
  seller?: {
    id: string;
    role: string;
    createdAt: string;
    maskedPhone?: string;
    adsCount?: number;
    profile?: UserProfile;
  };
}
