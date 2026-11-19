// Web Audio API notification chime for Staff Dashboard (100% offline, crystal-clear chime)
let lastPlayedTimestamp = 0;
let sharedAudioCtx: AudioContext | null = null;

function getOrCreateAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return null;

  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

// Auto-unlock audio context on first user interaction so alerts can sound immediately
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    const ctx = getOrCreateAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
  };
  window.addEventListener('click', unlockAudio, { passive: true, once: true });
  window.addEventListener('keydown', unlockAudio, { passive: true, once: true });
}

const SOUND_LOCK_KEY = 'olx_admin_sound_lock';

export function playNotificationChime(): void {
  try {
    if (typeof window === 'undefined') return;

    // Throttle multiple rapid alerts within 300ms
    const nowMs = Date.now();
    if (nowMs - lastPlayedTimestamp < 300) return;
    lastPlayedTimestamp = nowMs;

    const ctx = getOrCreateAudioContext();
    if (!ctx) return;

    const startTime = ctx.currentTime;

    // First harmonious tone (D5 note: 587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, startTime);
    gain1.gain.setValueAtTime(0.001, startTime);
    gain1.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(startTime);
    osc1.stop(startTime + 0.3);

    // Second cheerful tone (A5 note: 880 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, startTime + 0.08);
    gain2.gain.setValueAtTime(0.001, startTime + 0.08);
    gain2.gain.linearRampToValueAtTime(0.35, startTime + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(startTime + 0.08);
    osc2.stop(startTime + 0.45);
  } catch {
    // Autoplay policy restrictions prior to user gesture
  }
}

// Distinctive 3-note ascending chime for successful payments with cross-tab audio deduplication
export function playPaymentChime(eventId?: string): void {
  try {
    if (typeof window === 'undefined') return;

    const nowMs = Date.now();
    // Throttle to at most 1 payment chime per 500ms
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
        } catch {
          // Fall back if parse fails
        }
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

    // Note 3: G6 (1567.98 Hz) - Sustained crystalline finish
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
