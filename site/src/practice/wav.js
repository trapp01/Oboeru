// The recording format /api/transcribe takes: 16 kHz mono 16-bit PCM WAV.
// The page turns a decoded recording into it; the Worker checks for it. No DOM.

export const WAV_RATE = 16_000;
const HEADER_BYTES = 44;

/**
 * Mixes `channels` (Float32Arrays of one length, at `fromRate` Hz) down to one
 * channel at `toRate` Hz. Downsampling averages each output sample's span of
 * input, which keeps most aliasing out of speech.
 */
export function toMono(channels, fromRate, toRate = WAV_RATE) {
  const input = channels[0]?.length ?? 0;
  const mono = new Float32Array(input);
  for (const channel of channels) for (let i = 0; i < input; i++) mono[i] += channel[i] / channels.length;

  const ratio = fromRate / toRate;
  const out = new Float32Array(Math.floor(input / ratio));
  for (let i = 0; i < out.length; i++) {
    if (ratio > 1) {
      const from = Math.floor(i * ratio);
      const to = Math.min(Math.floor((i + 1) * ratio), input);
      let sum = 0;
      for (let j = from; j < to; j++) sum += mono[j];
      out[i] = sum / (to - from);
    } else {
      const x = i * ratio;
      const j = Math.floor(x);
      out[i] = mono[j] + (mono[Math.min(j + 1, input - 1)] - mono[j]) * (x - j);
    }
  }
  return out;
}

/** A 16-bit PCM WAV file of mono `samples` (floats from -1 to 1) at `sampleRate` Hz. */
export function encodeWav(samples, sampleRate = WAV_RATE) {
  const bytes = new Uint8Array(HEADER_BYTES + samples.length * 2);
  const view = new DataView(bytes.buffer);
  const text = (at, value) => [...value].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
  text(0, 'RIFF');
  view.setUint32(4, bytes.length - 8, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // one channel
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  samples.forEach((sample, i) => {
    const s = Math.max(-1, Math.min(1, sample));
    view.setInt16(HEADER_BYTES + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  });
  return bytes;
}

/** True when `bytes` (a Uint8Array) starts with a WAV file's RIFF header. */
export function isWav(bytes) {
  const tag = (at) => String.fromCharCode(...bytes.subarray(at, at + 4));
  return bytes.length >= HEADER_BYTES && tag(0) === 'RIFF' && tag(8) === 'WAVE';
}
