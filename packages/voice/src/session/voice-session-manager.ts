// ============================================
// Voice Session Manager
// Tracks active call sessions, handles cleanup.
// ============================================

import { VoiceSession } from "./voice-session";
import { logger } from "../utils/logger";

const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour max
const CLEANUP_INTERVAL_MS = 60 * 1000; // check every minute

export class VoiceSessionManager {
  private readonly sessions = new Map<string, VoiceSession>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  /** Start periodic cleanup of orphaned sessions. */
  startCleanup(): void {
    this.cleanupTimer = setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS);
  }

  /** Stop periodic cleanup. */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /** Register a new session. */
  add(callSid: string, session: VoiceSession): void {
    this.sessions.set(callSid, session);
    logger.info({ callSid, activeSessions: this.sessions.size }, "Session added");
  }

  /** Get a session by callSid. */
  get(callSid: string): VoiceSession | undefined {
    return this.sessions.get(callSid);
  }

  /** Remove and destroy a session. */
  async remove(callSid: string): Promise<void> {
    const session = this.sessions.get(callSid);
    if (session) {
      await session.destroy();
      this.sessions.delete(callSid);
      logger.info({ callSid, activeSessions: this.sessions.size }, "Session removed");
    }
  }

  /** Number of active sessions. */
  get activeCount(): number {
    return this.sessions.size;
  }

  /** Clean up sessions that exceed TTL. */
  private cleanup(): void {
    const now = Date.now();
    const staleCallSids: string[] = [];

    for (const [callSid, session] of this.sessions) {
      const age = now - session.sessionState.createdAt.getTime();
      if (age > SESSION_TTL_MS || session.sessionState.phase === "ended") {
        staleCallSids.push(callSid);
      }
    }

    for (const callSid of staleCallSids) {
      logger.warn({ callSid }, "Cleaning up stale session");
      void this.remove(callSid).catch((err) => {
        logger.error({ err, callSid }, "Error cleaning up stale session");
      });
    }
  }

  /** Destroy all sessions (for shutdown). */
  async destroyAll(): Promise<void> {
    for (const [callSid] of this.sessions) {
      await this.remove(callSid);
    }
  }
}
