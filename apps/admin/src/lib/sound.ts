// ==============================================================================
// Web Audio API & Sound Engine for Staff Admin Portal
// Preloads NotificationSound.mp3 with 0ms latency, handles autoplay unlock,
// cross-tab deduplication, and fallback HTML5 audio.
// ==============================================================================

const basePath = (import.meta.env.BASE_URL || '/admin/').replace(/\/$/, '');
const NOTIFICATION_SOUND_PATH = `${basePath}/sounds/NotificationSound.mp3`;

let sharedAudioCtx: AudioContext | null = null;
let notificationBuffer: AudioBuffer | null = null;
let fallbackAudio: HTMLAudioElement | null = null;
let lastPlayedTimestamp = 0;
let isPreloaded = false;

const SOUND_LOCK_KEY = 'olx_admin_sound_lock';

function getOrCreateAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;

    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

// Preload the MP3 file into memory for instant playback
function preloadNotificationSound(): void {
  if (isPreloaded || typeof window === 'undefined') return;
  isPreloaded = true;

  try {
    fallbackAudio = new Audio(NOTIFICATION_SOUND_PATH);
    fallbackAudio.preload = 'auto';
    fallbackAudio.volume = 0.75;
  } catch {}

  const ctx = getOrCreateAudioContext();
  if (ctx) {
    fetch(NOTIFICATION_SOUND_PATH)
      .then((res) => res.arrayBuffer())
      .then((arr) => ctx.decodeAudioData(arr))
      .then((buf) => {
        notificationBuffer = buf;
      })
      .catch(() => {
        // Silently fall back to HTML5 audio element on play
      });
  }
}

// Auto-unlock audio context on first user interaction so alerts can sound immediately
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    const ctx = getOrCreateAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    preloadNotificationSound();

    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
  };
  window.addEventListener('click', unlockAudio, { passive: true, once: true });
  window.addEventListener('keydown', unlockAudio, { passive: true, once: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true, once: true });
}

export function playNotificationChime(): void {
  try {
    if (typeof window === 'undefined') return;

    // 1. Throttle multiple rapid alerts within 250ms
    const nowMs = Date.now();
    if (nowMs - lastPlayedTimestamp < 250) return;
    lastPlayedTimestamp = nowMs;

    // 2. Cross-tab lock: avoid audio echo if user has multiple admin tabs open
    const isVisible = document.visibilityState === 'visible';
    const lockKey = `${SOUND_LOCK_KEY}_notif`;
    if (!isVisible) {
      try {
        const existingLock = localStorage.getItem(lockKey);
        if (existingLock && nowMs - Number(existingLock) < 400) {
          return; // Suppress sound in inactive sibling tab
        }
        localStorage.setItem(lockKey, `${nowMs}`);
      } catch {}
    } else {
      try {
        localStorage.setItem(lockKey, `${nowMs}`);
      } catch {}
    }

    // 3. Primary: Web Audio API (Instant buffer playback)
    const ctx = getOrCreateAudioContext();
    if (ctx && notificationBuffer && ctx.state === 'running') {
      try {
        const source = ctx.createBufferSource();
        source.buffer = notificationBuffer;
        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.75, ctx.currentTime);
        source.connect(gainNode);
        gainNode.connect(ctx.destination);
        source.start(0);
        return;
      } catch {}
    }

    // 4. Fallback: HTML5 Audio
    if (fallbackAudio) {
      try {
        fallbackAudio.currentTime = 0;
        const promise = fallbackAudio.play();
        if (promise !== undefined) {
          promise.catch(() => {});
        }
        return;
      } catch {}
    }

    // Lazy fallback
    try {
      const freshAudio = new Audio(NOTIFICATION_SOUND_PATH);
      freshAudio.volume = 0.75;
      freshAudio.play().catch(() => {});
    } catch {}
  } catch {
    // Autoplay policy restrictions prior to user gesture
  }
}

// Alias for consistency
export const playNotificationSound = playNotificationChime;

// Distinctive 3-note ascending chime for successful payments with cross-tab audio deduplication
export function playPaymentChime(eventId?: string): void {
  try {
    if (typeof window === 'undefined') return;

    const nowMs = Date.now();
    if (nowMs - lastPlayedTimestamp < 500) return;

    // Cross-tab lock: avoid audio echo if user has multiple admin tabs open
    if (eventId) {
      const lockData = localStorage.getItem(SOUND_LOCK_KEY);
      if (lockData) {
        try {
          const parsed = JSON.parse(lockData);
          if (parsed?.id === eventId && nowMs - parsed.timestamp < 3000) {
            return;
          }
        } catch {}
      }
      localStorage.setItem(SOUND_LOCK_KEY, JSON.stringify({ id: eventId, timestamp: nowMs }));
    }

    lastPlayedTimestamp = nowMs;

    const ctx = getOrCreateAudioContext();
    if (!ctx) return;

    const startTime = ctx.currentTime;

    // Note 1: C6 (1046.50 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1046.5, startTime);
    gain1.gain.setValueAtTime(0.001, startTime);
    gain1.gain.linearRampToValueAtTime(0.28, startTime + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(startTime);
    osc1.stop(startTime + 0.25);

    // Note 2: E6 (1318.51 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1318.51, startTime + 0.08);
    gain2.gain.setValueAtTime(0.001, startTime + 0.08);
    gain2.gain.linearRampToValueAtTime(0.32, startTime + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(startTime + 0.08);
    osc2.stop(startTime + 0.35);

    // Note 3: G6 (1567.98 Hz)
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'triangle';
    osc3.frequency.setValueAtTime(1567.98, startTime + 0.16);
    gain3.gain.setValueAtTime(0.001, startTime + 0.16);
    gain3.gain.linearRampToValueAtTime(0.38, startTime + 0.18);
    gain3.gain.exponentialRampToValueAtTime(0.001, startTime + 0.55);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(startTime + 0.16);
    osc3.stop(startTime + 0.55);
  } catch {
    // Autoplay restrictions
  }
}
