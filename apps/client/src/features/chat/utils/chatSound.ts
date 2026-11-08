// Web Audio API message sound synthesis (Zero dependencies, 100% offline, crystal-clear chime)
let lastPlayedTimestamp = 0;

export function playNewMessageSound(): void {
  try {
    if (typeof window === 'undefined') return;

    // Prevent duplicate triggers from multiple socket listeners within 350ms
    const nowMs = Date.now();
    if (nowMs - lastPlayedTimestamp < 350) return;
    lastPlayedTimestamp = nowMs;

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const startTime = ctx.currentTime;

    // First harmonious tone (D5 note: 587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, startTime);
    gain1.gain.setValueAtTime(0.001, startTime);
    gain1.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
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
    gain2.gain.linearRampToValueAtTime(0.25, startTime + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(startTime + 0.08);
    osc2.stop(startTime + 0.45);

    // Close audio context after playback to free system audio resources
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 600);
  } catch {
    // Gracefully ignore if autoplay policy restrictions apply prior to user interaction
  }
}
