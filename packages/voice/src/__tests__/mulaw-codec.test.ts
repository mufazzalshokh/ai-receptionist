import { describe, it, expect } from "vitest";
import { mulawToPcm16, pcm16ToMulaw } from "../audio/mulaw-codec";

describe("mulaw codec", () => {
  it("should decode mulaw silence (0xFF) to near-zero PCM", () => {
    // 0xFF is mulaw silence
    const mulaw = Buffer.from([0xff]);
    const pcm = mulawToPcm16(mulaw);

    expect(pcm.length).toBe(2);
    const sample = pcm.readInt16LE(0);
    // Silence should decode to a very small value
    expect(Math.abs(sample)).toBeLessThan(200);
  });

  it("should roundtrip: encode then decode returns similar values", () => {
    // Create a PCM buffer with known samples
    const pcm = Buffer.alloc(8);
    pcm.writeInt16LE(0, 0);
    pcm.writeInt16LE(8000, 2);
    pcm.writeInt16LE(-8000, 4);
    pcm.writeInt16LE(16000, 6);

    const mulaw = pcm16ToMulaw(pcm);
    expect(mulaw.length).toBe(4); // 4 samples

    const decoded = mulawToPcm16(mulaw);
    expect(decoded.length).toBe(8); // back to 4 samples * 2 bytes

    // mulaw is lossy (8-bit compressed) — verify same sign and rough magnitude
    for (let i = 0; i < 4; i++) {
      const original = pcm.readInt16LE(i * 2);
      const restored = decoded.readInt16LE(i * 2);
      if (Math.abs(original) > 500) {
        // Same sign
        expect(Math.sign(restored)).toBe(Math.sign(original));
        // Within 50% — mulaw has significant quantization at mid-range
        expect(Math.abs(restored - original)).toBeLessThan(
          Math.abs(original) * 0.5
        );
      }
    }
  });

  it("should handle empty buffers", () => {
    const empty = Buffer.alloc(0);
    expect(mulawToPcm16(empty).length).toBe(0);
    expect(pcm16ToMulaw(empty).length).toBe(0);
  });

  it("should produce correct output lengths", () => {
    const mulaw = Buffer.alloc(100);
    const pcm = mulawToPcm16(mulaw);
    expect(pcm.length).toBe(200); // 2 bytes per sample

    const back = pcm16ToMulaw(pcm);
    expect(back.length).toBe(100); // 1 byte per sample
  });

  it("should clip extreme PCM values without crashing", () => {
    const pcm = Buffer.alloc(4);
    pcm.writeInt16LE(32767, 0); // max positive
    pcm.writeInt16LE(-32768, 2); // max negative

    const mulaw = pcm16ToMulaw(pcm);
    expect(mulaw.length).toBe(2);

    // Should not throw; decoded values should have correct sign
    const decoded = mulawToPcm16(mulaw);
    expect(decoded.readInt16LE(0)).toBeGreaterThan(0);  // positive in, positive out
    expect(decoded.readInt16LE(2)).toBeLessThan(0);     // negative in, negative out
  });
});
