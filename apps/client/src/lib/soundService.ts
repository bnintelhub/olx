// ==============================================================================
// Unified Sound Service for BLX Orbit Marketplace
// Handles zero-latency Web Audio API playback, HTML5 audio fallback,
// multi-tab coordination, rapid-burst throttling, and autoplay policy unlock.
// ==============================================================================

type SoundType = 'notification' | 'conversation';

const SOUND_PATHS: Record<SoundType, string> = {
  notification: '/sounds/NotificationSound.mp3',
  conversation: '/sounds/ConversationSound.mp3',
};

class SoundService {
  private audioCtx: AudioContext | null = null;
  private audioBuffers: Map<SoundType, AudioBuffer> = new Map();
  private fallbackAudios: Map<SoundType, HTMLAudioElement> = new Map();
  private lastPlayedTimestamps: Map<SoundType, number> = new Map();
  private isUnlocked = false;
  private isPreloading = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.setupAutoplayUnlocker();
    }
  }

  // Set up listeners for the first user interaction to resume audio context
  private setupAutoplayUnlocker(): void {
    const unlock = () => {
      this.isUnlocked = true;
      this.getOrCreateAudioContext();
      this.preloadSounds();

      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };

    window.addEventListener('click', unlock, { passive: true, once: true });
    window.addEventListener('keydown', unlock, { passive: true, once: true });
    window.addEventListener('touchstart', unlock, { passive: true, once: true });
  }

  private getOrCreateAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return null;

      if (!this.audioCtx || this.audioCtx.state === 'closed') {
        this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  // Preloads and caches both sound buffers in memory for 0ms latency playback
  public preloadSounds(): void {
    if (this.isPreloading || typeof window === 'undefined') return;
    this.isPreloading = true;

    (Object.keys(SOUND_PATHS) as SoundType[]).forEach((type) => {
      const path = SOUND_PATHS[type];

      // 1. Prepare HTML5 fallback audio element
      try {
        const audio = new Audio(path);
        audio.preload = 'auto';
        audio.volume = 0.75;
        this.fallbackAudios.set(type, audio);
      } catch {
        // Ignore if Audio constructor fails
      }

      // 2. Fetch & decode into Web Audio API buffer
      const ctx = this.getOrCreateAudioContext();
      if (ctx) {
        fetch(path)
          .then((res) => res.arrayBuffer())
          .then((arrayBuf) => ctx.decodeAudioData(arrayBuf))
          .then((audioBuffer) => {
            this.audioBuffers.set(type, audioBuffer);
          })
          .catch(() => {
            // Silently fallback to HTML5 Audio element on play
          });
      }
    });
  }

  // Plays the requested sound with throttling & multi-tab coordination
  private playSound(type: SoundType): void {
    if (typeof window === 'undefined') return;

    // 1. Throttling: Prevent duplicate triggers within 250ms for the same sound type
    const now = Date.now();
    const lastPlayed = this.lastPlayedTimestamps.get(type) || 0;
    if (now - lastPlayed < 250) {
      return;
    }
    this.lastPlayedTimestamps.set(type, now);

    // 2. Multi-Tab Coordination:
    // When multiple tabs are open, prefer the visible (focused) tab.
    // If not visible, use a 400ms coordination lock in localStorage to prevent multi-tab echo.
    const isVisible = document.visibilityState === 'visible';
    const lockKey = `blx_audio_handled_${type}`;
    if (!isVisible) {
      try {
        const existingLock = localStorage.getItem(lockKey);
        if (existingLock && now - Number(existingLock) < 400) {
          return; // Suppress sound in this inactive sibling tab
        }
        localStorage.setItem(lockKey, `${now}`);
      } catch {
        // Fallback if localStorage unavailable
      }
    } else {
      try {
        localStorage.setItem(lockKey, `${now}`);
      } catch {}
    }

    // 3. Primary: Web Audio API (instant, buffer-based)
    const ctx = this.getOrCreateAudioContext();
    const buffer = this.audioBuffers.get(type);

    if (ctx && buffer && ctx.state === 'running') {
      try {
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.75, ctx.currentTime);
        source.connect(gainNode);
        gainNode.connect(ctx.destination);
        source.start(0);
        return;
      } catch {
        // Fall through to HTML5 fallback
      }
    }

    // 4. Fallback: HTML5 Audio
    const fallbackAudio = this.fallbackAudios.get(type);
    if (fallbackAudio) {
      try {
        fallbackAudio.currentTime = 0;
        const playPromise = fallbackAudio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            // Browser autoplay restrictions handled gracefully
          });
        }
      } catch {
        // Ignore play failure
      }
    } else {
      // Lazy fallback if not preloaded
      try {
        const freshAudio = new Audio(SOUND_PATHS[type]);
        freshAudio.volume = 0.75;
        freshAudio.play().catch(() => {});
      } catch {}
    }
  }

  // Notification chime (SSE alerts, Push notifications, or Chat outside active thread)
  public playNotificationSound(): void {
    this.playSound('notification');
  }

  // Conversation tick (Active in-chat incoming message)
  public playConversationSound(): void {
    this.playSound('conversation');
  }
}

export const soundService = new SoundService();
export const playNotificationSound = () => soundService.playNotificationSound();
export const playConversationSound = () => soundService.playConversationSound();
