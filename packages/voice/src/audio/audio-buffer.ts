// ============================================
// Audio Buffer
// Accumulates PCM/mulaw chunks and emits
// fixed-size frames for smooth playback.
// ============================================

export class AudioBuffer {
  private chunks: Buffer[] = [];
  private totalBytes = 0;

  /** Append an audio chunk to the buffer. */
  push(chunk: Buffer): void {
    this.chunks.push(chunk);
    this.totalBytes += chunk.length;
  }

  /** Drain all buffered audio as a single Buffer. */
  drain(): Buffer {
    if (this.chunks.length === 0) return Buffer.alloc(0);

    const combined = Buffer.concat(this.chunks);
    this.chunks = [];
    this.totalBytes = 0;
    return combined;
  }

  /**
   * Drain up to `maxBytes` from the front of the buffer.
   * Returns the drained portion; remainder stays buffered.
   */
  drainUpTo(maxBytes: number): Buffer {
    const combined = this.drain();
    if (combined.length <= maxBytes) return combined;

    const taken = combined.subarray(0, maxBytes);
    const remainder = combined.subarray(maxBytes);
    this.push(Buffer.from(remainder));
    return Buffer.from(taken);
  }

  /** Number of bytes currently buffered. */
  get size(): number {
    return this.totalBytes;
  }

  /** Clear all buffered audio. */
  clear(): void {
    this.chunks = [];
    this.totalBytes = 0;
  }
}
