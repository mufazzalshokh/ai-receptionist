import { describe, it, expect } from "vitest";
import { resample } from "../audio/resampler";

describe("resampler", () => {
  it("should return same buffer when rates match", () => {
    const input = Buffer.alloc(20);
    for (let i = 0; i < 10; i++) input.writeInt16LE(i * 1000, i * 2);

    const output = resample(input, 16000, 16000);
    expect(output).toBe(input); // same reference
  });

  it("should downsample 16kHz to 8kHz (2:1 ratio)", () => {
    // 10 samples at 16kHz -> ~5 samples at 8kHz
    const input = Buffer.alloc(20);
    for (let i = 0; i < 10; i++) input.writeInt16LE(i * 1000, i * 2);

    const output = resample(input, 16000, 8000);
    expect(output.length).toBe(10); // 5 samples * 2 bytes
  });

  it("should preserve approximate values during downsample", () => {
    // Create a constant signal — all samples = 5000
    const input = Buffer.alloc(20);
    for (let i = 0; i < 10; i++) input.writeInt16LE(5000, i * 2);

    const output = resample(input, 16000, 8000);

    // All output samples should be ~5000
    for (let i = 0; i < output.length / 2; i++) {
      expect(output.readInt16LE(i * 2)).toBe(5000);
    }
  });

  it("should handle empty buffer", () => {
    const output = resample(Buffer.alloc(0), 16000, 8000);
    expect(output.length).toBe(0);
  });

  it("should downsample 22050 to 8000", () => {
    const sampleCount = 100;
    const input = Buffer.alloc(sampleCount * 2);
    for (let i = 0; i < sampleCount; i++) input.writeInt16LE(1000, i * 2);

    const output = resample(input, 22050, 8000);
    const outputSamples = output.length / 2;

    // Ratio is 22050/8000 = ~2.756, so 100 samples -> ~36 samples
    expect(outputSamples).toBeGreaterThan(30);
    expect(outputSamples).toBeLessThan(40);
  });
});
