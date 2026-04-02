// ============================================
// Audio Resampler (linear interpolation)
// Converts between sample rates for PCM16 LE buffers.
// Primary use: 16kHz/22050Hz (ElevenLabs) -> 8kHz (Twilio)
// ============================================

/**
 * Resample PCM16 LE audio from one sample rate to another.
 * Uses linear interpolation for downsampling.
 */
export function resample(
  input: Buffer,
  fromRate: number,
  toRate: number
): Buffer {
  if (fromRate === toRate) return input;

  const inputSamples = input.length / 2;
  const ratio = fromRate / toRate;
  const outputSamples = Math.floor(inputSamples / ratio);
  const output = Buffer.alloc(outputSamples * 2);

  for (let i = 0; i < outputSamples; i++) {
    const srcIndex = i * ratio;
    const srcFloor = Math.floor(srcIndex);
    const srcCeil = Math.min(srcFloor + 1, inputSamples - 1);
    const fraction = srcIndex - srcFloor;

    const sampleA = input.readInt16LE(srcFloor * 2);
    const sampleB = input.readInt16LE(srcCeil * 2);

    // Linear interpolation
    const interpolated = Math.round(sampleA + (sampleB - sampleA) * fraction);
    output.writeInt16LE(
      Math.max(-32768, Math.min(32767, interpolated)),
      i * 2
    );
  }

  return output;
}
