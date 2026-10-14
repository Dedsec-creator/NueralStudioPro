import { AutoSaveStatus } from '../types';
import { audioEngine } from './audioEngine';
import { historyManager } from './historyManager';

class AutoSaveManager {
  private enabled: boolean = false;
  private intervalSeconds: number = 60;
  private timerId: number | null = null;
  private tickIntervalId: number | null = null;
  private nextSaveTimestamp: number = 0;
  private lastSavedTimestamp: number | null = null;
  private isSaving: boolean = false;
  private lastError: string | null = null;
  private subscribers: Set<(status: AutoSaveStatus) => void> = new Set();
  private isInitialized: boolean = false;

  public init(intervalSeconds: number = 60): void {
    if (this.isInitialized) return;
    this.isInitialized = true;
    this.intervalSeconds = intervalSeconds;
    this.nextSaveTimestamp = 0;

    // Notify initial state
    this.notifySubscribers();
  }

  public start(): void {
    this.stop();
    this.enabled = true;
    this.nextSaveTimestamp = Date.now() + this.intervalSeconds * 1000;

    // 60-second primary autosave interval
    this.timerId = window.setInterval(() => {
      this.performAutoSave();
    }, this.intervalSeconds * 1000);

    // 1-second ticker to update countdowns and UI indicators
    this.tickIntervalId = window.setInterval(() => {
      this.notifySubscribers();
    }, 1000);

    this.notifySubscribers();
  }

  public stop(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    if (this.tickIntervalId !== null) {
      clearInterval(this.tickIntervalId);
      this.tickIntervalId = null;
    }
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (enabled) {
      this.start();
    } else {
      this.stop();
    }
    this.notifySubscribers();
  }

  public async triggerImmediateSave(): Promise<boolean> {
    return await this.performAutoSave();
  }

  /**
   * Synchronous / unawaited emergency save for beforeunload
   */
  private triggerImmediateSaveSync(): void {
    try {
      audioEngine.persistCurrentSession(true).catch((err) => {
        console.warn('[AutoSaveManager] emergency save error:', err);
      });
    } catch (e) {
      console.warn('[AutoSaveManager] beforeunload persist failed:', e);
    }
  }

  private async performAutoSave(): Promise<boolean> {
    if (!this.enabled || this.isSaving) return false;

    this.isSaving = true;
    this.lastError = null;
    this.notifySubscribers();

    try {
      await audioEngine.persistCurrentSession(true);
      this.lastSavedTimestamp = Date.now();
      this.nextSaveTimestamp = Date.now() + this.intervalSeconds * 1000;
      this.isSaving = false;
      this.notifySubscribers();
      return true;
    } catch (err: any) {
      console.error('[AutoSaveManager] Auto-save failed:', err);
      this.lastError = err?.message || 'Failed to save session to IndexedDB';
      this.isSaving = false;
      this.notifySubscribers();
      return false;
    }
  }

  public getStatus(): AutoSaveStatus {
    const now = Date.now();
    const secondsSinceLastSave = this.lastSavedTimestamp
      ? Math.max(0, Math.floor((now - this.lastSavedTimestamp) / 1000))
      : 0;
    const secondsUntilNextSave = this.enabled && this.nextSaveTimestamp > 0
      ? Math.max(0, Math.ceil((this.nextSaveTimestamp - now) / 1000))
      : 0;
    const snapshotCount = historyManager.getAllSnapshots().length;

    return {
      enabled: this.enabled,
      intervalSeconds: this.intervalSeconds,
      lastSaved: this.lastSavedTimestamp,
      secondsSinceLastSave,
      secondsUntilNextSave,
      isSaving: this.isSaving,
      snapshotCount,
      lastError: this.lastError,
    };
  }

  public subscribe(callback: (status: AutoSaveStatus) => void): () => void {
    this.subscribers.add(callback);
    callback(this.getStatus());
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notifySubscribers(): void {
    const status = this.getStatus();
    this.subscribers.forEach((cb) => {
      try {
        cb(status);
      } catch (err) {
        console.warn('[AutoSaveManager] subscriber callback error:', err);
      }
    });
  }
}

export const autoSaveManager = new AutoSaveManager();
