import { create } from 'zustand';
import { apiClient } from '@/lib/api-client';

interface ChatUnreadState {
  unreadCount: number;
  isLoading: boolean;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  setUnreadCount: (count: number) => void;
  incrementUnread: (by?: number) => void;
  decrementUnread: (by?: number) => void;
  fetchUnreadCount: () => Promise<number>;
  reset: () => void;
}

export const useChatUnreadStore = create<ChatUnreadState>((set, get) => ({
  unreadCount: 0,
  isLoading: false,
  activeConversationId: null,

  setActiveConversationId: (id: string | null) => {
    set({ activeConversationId: id });
  },

  setUnreadCount: (count: number) => {
    set({ unreadCount: Math.max(0, count) });
  },

  incrementUnread: (by = 1) => {
    set((state) => ({ unreadCount: state.unreadCount + by }));
  },

  decrementUnread: (by = 1) => {
    set((state) => ({ unreadCount: Math.max(0, state.unreadCount - by) }));
  },

  fetchUnreadCount: async () => {
    try {
      set({ isLoading: true });
      const res = await apiClient.get('/chat/conversations');
      const convList =
        res.data?.data?.conversations ||
        (Array.isArray(res.data?.data) ? res.data.data : []);
      const total = convList.reduce(
        (sum: number, c: { unreadCount?: number }) => sum + (Number(c.unreadCount) || 0),
        0
      );
      set({ unreadCount: total, isLoading: false });
      return total;
    } catch {
      set({ isLoading: false });
      return get().unreadCount;
    }
  },

  reset: () => {
    set({ unreadCount: 0, isLoading: false, activeConversationId: null });
  },
}));

