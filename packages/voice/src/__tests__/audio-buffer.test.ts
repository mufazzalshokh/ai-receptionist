import { describe, it, expect } from "vitest";
import { AudioBuffer } from "../audio/audio-buffer";

describe("AudioBuffer", () => {
  it("should start empty", () => {
    const buf = new AudioBuffer();
    expect(buf.size).toBe(0);
    expect(buf.drain().length).toBe(0);
  });

  it("should accumulate chunks", () => {
    const buf = new AudioBuffer();
    buf.push(Buffer.from([1, 2, 3]));
    buf.push(Buffer.from([4, 5]));

    expect(buf.size).toBe(5);
  });

  it("should drain all data as a single buffer", () => {
    const buf = new AudioBuffer();
    buf.push(Buffer.from([1, 2, 3]));
    buf.push(Buffer.from([4, 5]));

    const drained = buf.drain();
    expect(drained.length).toBe(5);
    expect([...drained]).toEqual([1, 2, 3, 4, 5]);
    expect(buf.size).toBe(0);
  });

  it("should drainUpTo partial data", () => {
    const buf = new AudioBuffer();
    buf.push(Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]));

    const partial = buf.drainUpTo(3);
    expect(partial.length).toBe(3);
    expect([...partial]).toEqual([1, 2, 3]);
    expect(buf.size).toBe(5); // remainder kept
  });

  it("should drainUpTo all when maxBytes >= size", () => {
    const buf = new AudioBuffer();
    buf.push(Buffer.from([1, 2, 3]));

    const all = buf.drainUpTo(100);
    expect(all.length).toBe(3);
    expect(buf.size).toBe(0);
  });

  it("should clear all data", () => {
    const buf = new AudioBuffer();
    buf.push(Buffer.from([1, 2, 3]));
    buf.push(Buffer.from([4, 5]));
    buf.clear();

    expect(buf.size).toBe(0);
    expect(buf.drain().length).toBe(0);
  });
});
