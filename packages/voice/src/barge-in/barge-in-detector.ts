// ============================================
// Barge-In Detector
// Detects when caller speaks while AI is responding.
// Triggers response cancellation + Twilio clear.
// ============================================

export interface BargeInConfig {
  readonly enabled: boolean;
  /** Minimum duration of detected speech before confirming barge-in (ms). */
  readonly minInterruptionDurationMs: number;
}

export type BargeInHandler = () => void;

export class BargeInDetector {
  private readonly config: BargeInConfig;
  private handler: BargeInHandler | null = null;
  private isMonitoring = false;
  private interimDetectedAt: number | null = null;

  constructor(config: BargeInConfig) {
    this.config = config;
  }

  /** Start monitoring for barge-in (call when AI starts responding). */
  startMonitoring(): void {
    if (!this.config.enabled) return;
    this.isMonitoring = true;
    this.interimDetectedAt = null;
  }

  /** Stop monitoring (call when AI finishes responding or session ends). */
  stopMonitoring(): void {
    this.isMonitoring = false;
    this.interimDetectedAt = null;
  }

  /** Register the handler called when barge-in is confirmed. */
  onBargeIn(handler: BargeInHandler): void {
    this.handler = handler;
  }

  /**
   * Feed interim transcript events while monitoring.
   * Returns true if a barge-in was triggered.
   */
  onInterimTranscript(text: string): boolean {
    if (!this.isMonitoring || !this.config.enabled) return false;
    if (!text.trim()) {
      this.interimDetectedAt = null;
      return false;
    }

    const now = Date.now();

    if (this.interimDetectedAt === null) {
      this.interimDetectedAt = now;
      return false;
    }

    const elapsed = now - this.interimDetectedAt;

    if (elapsed >= this.config.minInterruptionDurationMs) {
      this.isMonitoring = false;
      this.interimDetectedAt = null;
      this.handler?.();
      return true;
    }

    return false;
  }

  get monitoring(): boolean {
    return this.isMonitoring;
  }
}
