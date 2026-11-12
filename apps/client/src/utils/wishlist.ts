import { AdItem } from '../types';
import { apiClient, getInMemoryAccessToken } from '@/lib/api-client';

const WISHLIST_IDS_KEY = 'olx_wishlist_ids';
const WISHLIST_ITEMS_KEY = 'olx_wishlist_items';
const WISHLIST_USER_KEY = 'olx_wishlist_user_id';
export const WISHLIST_EVENT = 'olx_wishlist_updated';

// Browser storage is shared by every account that uses this device. Namespace
// the offline cache by the authenticated account so one user's favourites can
// never be shown to the next user after logout/login.
const scopedKey = (baseKey: string) => {
  const userId = localStorage.getItem(WISHLIST_USER_KEY);
  return `${baseKey}:${userId || 'anonymous'}`;
};

export const getWishlistIds = (): string[] => {
  try {
    const raw = localStorage.getItem(scopedKey(WISHLIST_IDS_KEY));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const isAdWishlisted = (adId: string): boolean => {
  if (!adId) return false;
  const ids = getWishlistIds();
  return ids.includes(adId);
};

export const getWishlistItems = (): AdItem[] => {
  try {
    const raw = localStorage.getItem(scopedKey(WISHLIST_ITEMS_KEY));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const toggleWishlist = async (
  ad: AdItem,
  token?: string | null
): Promise<{ isWishlisted: boolean; message: string }> => {
  const currentIds = getWishlistIds();
  const currentItems = getWishlistItems();
  const alreadySaved = currentIds.includes(ad.id);
  const nextSaved = !alreadySaved;

  let newIds: string[];
  let newItems: AdItem[];

  if (nextSaved) {
    newIds = [...currentIds, ad.id];
    newItems = [ad, ...currentItems.filter((i) => i.id !== ad.id)];
  } else {
    newIds = currentIds.filter((id) => id !== ad.id);
    newItems = currentItems.filter((i) => i.id !== ad.id);
  }

  try {
    localStorage.setItem(scopedKey(WISHLIST_IDS_KEY), JSON.stringify(newIds));
    localStorage.setItem(scopedKey(WISHLIST_ITEMS_KEY), JSON.stringify(newItems));
    window.dispatchEvent(
      new CustomEvent(WISHLIST_EVENT, {
        detail: { adId: ad.id, isWishlisted: nextSaved },
      })
    );
  } catch (e) {
    console.error('Error writing to wishlist localStorage:', e);
  }

  // If user is authenticated, sync with backend
  const activeToken = token || getInMemoryAccessToken();
  if (activeToken) {
    try {
      await apiClient.post(`/ads/${ad.id}/favourite`);
    } catch (err) {
      console.warn('Backend favourite sync error:', err);
    }
  }

  return {
    isWishlisted: nextSaved,
    message: nextSaved ? 'Saved to Wishlist!' : 'Removed from Wishlist',
  };
};

export const removeFromWishlist = async (
  adId: string,
  token?: string | null
): Promise<void> => {
  const currentIds = getWishlistIds();
  const currentItems = getWishlistItems();

  const newIds = currentIds.filter((id) => id !== adId);
  const newItems = currentItems.filter((i) => i.id !== adId);

  try {
    localStorage.setItem(scopedKey(WISHLIST_IDS_KEY), JSON.stringify(newIds));
    localStorage.setItem(scopedKey(WISHLIST_ITEMS_KEY), JSON.stringify(newItems));
    window.dispatchEvent(
      new CustomEvent(WISHLIST_EVENT, {
        detail: { adId, isWishlisted: false },
      })
    );
  } catch (e) {
    console.error('Error removing from wishlist localStorage:', e);
  }

  const activeToken = token || getInMemoryAccessToken();
  if (activeToken) {
    try {
      await apiClient.post(`/ads/${adId}/favourite`);
    } catch (err) {
      console.warn('Backend favourite removal error:', err);
    }
  }
};
