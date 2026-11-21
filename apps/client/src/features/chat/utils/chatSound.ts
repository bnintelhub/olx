import {
  soundService,
  playNotificationSound,
  playConversationSound,
} from '@/lib/soundService';

export { soundService, playNotificationSound, playConversationSound };

// Legacy alias: plays notification chime by default
export function playNewMessageSound(): void {
  soundService.playNotificationSound();
}
