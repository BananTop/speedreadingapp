let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

// A short downward "whoosh" using filtered noise — played on the woosh-forward gesture.
export function playWhoosh(): void {
  const ac = getCtx();
  if (!ac) return;

  const duration = 0.4;
  const buffer = ac.createBuffer(1, ac.sampleRate * duration, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  const src = ac.createBufferSource();
  src.buffer = buffer;

  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1800, ac.currentTime);
  filter.frequency.exponentialRampToValueAtTime(300, ac.currentTime + duration);
  filter.Q.value = 0.8;

  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.35, ac.currentTime + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration);

  src.connect(filter);
  filter.connect(gain);
  gain.connect(ac.destination);
  src.start();
  src.stop(ac.currentTime + duration);
}
