// ============================================
// mu-law <-> 16-bit Linear PCM Codec
// ITU-T G.711 mu-law (used by Twilio Media Streams)
// ============================================

const MULAW_BIAS = 0x84;
const MULAW_CLIP = 32635;

// Precomputed decode table: mulaw byte -> 16-bit PCM sample
const MULAW_DECODE_TABLE = new Int16Array(256);

for (let i = 0; i < 256; i++) {
  const mulaw = (~i) & 0xff; // mask to 8 bits — JS bitwise NOT returns 32-bit signed
  const sign = mulaw & 0x80;
  const exponent = (mulaw >> 4) & 0x07;
  const mantissa = mulaw & 0x0f;

  let sample = (mantissa << 4) + MULAW_BIAS;
  sample <<= exponent;
  sample -= MULAW_BIAS;

  // Clamp to Int16 range — high exponents can overflow
  const clamped = Math.max(-32768, Math.min(32767, sign !== 0 ? -sample : sample));
  MULAW_DECODE_TABLE[i] = clamped;
}

/**
 * Decode mulaw bytes to 16-bit PCM (little-endian).
 * Input: Buffer of mulaw bytes (1 byte per sample, 8kHz).
 * Output: Buffer of PCM16 LE (2 bytes per sample).
 */
export function mulawToPcm16(mulaw: Buffer): Buffer {
  const pcm = Buffer.alloc(mulaw.length * 2);

  for (let i = 0; i < mulaw.length; i++) {
    const sample = MULAW_DECODE_TABLE[mulaw[i]];
    pcm.writeInt16LE(sample, i * 2);
  }

  return pcm;
}

/**
 * Encode 16-bit PCM (little-endian) to mulaw bytes.
 * Input: Buffer of PCM16 LE (2 bytes per sample).
 * Output: Buffer of mulaw bytes (1 byte per sample).
 */
export function pcm16ToMulaw(pcm: Buffer): Buffer {
  const mulaw = Buffer.alloc(pcm.length / 2);

  for (let i = 0; i < mulaw.length; i++) {
    const sample = pcm.readInt16LE(i * 2);
    mulaw[i] = encodeMulawSample(sample);
  }

  return mulaw;
}

function encodeMulawSample(sample: number): number {
  const sign = sample < 0 ? 0x80 : 0;
  if (sample < 0) sample = -sample;
  if (sample > MULAW_CLIP) sample = MULAW_CLIP;

  sample += MULAW_BIAS;

  let exponent = 7;
  const exponentMask = 0x4000;

  for (; exponent > 0; exponent--) {
    if ((sample & exponentMask) !== 0) break;
    sample <<= 1;
  }

  const mantissa = (sample >> 10) & 0x0f;
  const mulawByte = ~(sign | (exponent << 4) | mantissa) & 0xff;

  return mulawByte;
}
