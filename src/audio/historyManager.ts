import {
  AutoAlignSettings,
  DenoiseSettings,
  HistorySnapshot,
  HistoryStudioState,
  MasteringSettings,
  MicLockerSettings,
  ModularPlugin,
  PitchFormantSettings,
  ProVocalAIEnhancerSettings,
  TuningSettings,
} from '../types';

export type { HistorySnapshot, HistoryStudioState };

export interface HistoryStatus {
  canUndo: boolean;
  canRedo: boolean;
  undoCount: number;
  redoCount: number;
  lastAction: string | null;
  redoAction: string | null;
}

const MAX_HISTORY_STEPS = 50;

class HistoryManager {
  private undoStack: HistorySnapshot[] = [];
  private redoStack: HistorySnapshot[] = [];
  private currentState: HistoryStudioState | null = null;
  private subscribers: Set<(status: HistoryStatus) => void> = new Set();
  private debounceTimer: number | null = null;
  private pendingSnapshot: { state: HistoryStudioState; label: string } | null = null;

  public init(initialState: HistoryStudioState): void {
    this.currentState = this.cloneState(initialState);
    this.undoStack = [];
    this.redoStack = [];
    this.notify();
  }

  public pushSnapshot(state: HistoryStudioState, label: string = 'Adjust Studio Settings', debounceMs: number = 0): void {
    if (debounceMs > 0) {
      this.pendingSnapshot = { state, label };
      if (this.debounceTimer !== null) {
        window.clearTimeout(this.debounceTimer);
      }
      this.debounceTimer = window.setTimeout(() => {
        if (this.pendingSnapshot) {
          this.commitSnapshot(this.pendingSnapshot.state, this.pendingSnapshot.label);
          this.pendingSnapshot = null;
        }
        this.debounceTimer = null;
      }, debounceMs);
      return;
    }

    this.commitSnapshot(state, label);
  }

  private commitSnapshot(state: HistoryStudioState, label: string): void {
    if (!this.currentState) {
      this.currentState = this.cloneState(state);
      this.notify();
      return;
    }

    // Check if state is identical to currentState to avoid no-op duplicates
    if (JSON.stringify(this.currentState) === JSON.stringify(state)) {
      return;
    }

    const snapshot: HistorySnapshot = {
      id: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      label,
      state: this.cloneState(this.currentState),
    };

    this.undoStack.push(snapshot);
    if (this.undoStack.length > MAX_HISTORY_STEPS) {
      this.undoStack.shift();
    }

    // A new user action clears the redo stack
    this.redoStack = [];
    this.currentState = this.cloneState(state);
    this.notify();
  }

  public undo(): HistoryStudioState | null {
    if (this.undoStack.length === 0 || !this.currentState) {
      return null;
    }

    const previousSnapshot = this.undoStack.pop()!;
    
    // Push current state to redo stack
    this.redoStack.push({
      id: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      label: previousSnapshot.label,
      state: this.cloneState(this.currentState),
    });

    this.currentState = this.cloneState(previousSnapshot.state);
    this.notify();
    return this.cloneState(this.currentState);
  }

  public redo(): HistoryStudioState | null {
    if (this.redoStack.length === 0 || !this.currentState) {
      return null;
    }

    const nextSnapshot = this.redoStack.pop()!;
    
    // Push current state to undo stack
    this.undoStack.push({
      id: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      label: nextSnapshot.label,
      state: this.cloneState(this.currentState),
    });

    this.currentState = this.cloneState(nextSnapshot.state);
    this.notify();
    return this.cloneState(this.currentState);
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public getStatus(): HistoryStatus {
    const lastUndo = this.undoStack[this.undoStack.length - 1];
    const lastRedo = this.redoStack[this.redoStack.length - 1];

    return {
      canUndo: this.undoStack.length > 0,
      canRedo: this.redoStack.length > 0,
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length,
      lastAction: lastUndo ? lastUndo.label : null,
      redoAction: lastRedo ? lastRedo.label : null,
    };
  }

  public subscribe(callback: (status: HistoryStatus) => void): () => void {
    this.subscribers.add(callback);
    callback(this.getStatus());
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notify(): void {
    const status = this.getStatus();
    this.subscribers.forEach((cb) => {
      try {
        cb(status);
      } catch (err) {
        console.warn('[HistoryManager] subscriber error:', err);
      }
    });
  }

  public clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.notify();
  }

  public getAllSnapshots(): HistorySnapshot[] {
    return this.undoStack.map((s) => ({
      ...s,
      state: this.cloneState(s.state),
    }));
  }

  public getRedoSnapshots(): HistorySnapshot[] {
    return this.redoStack.map((s) => ({
      ...s,
      state: this.cloneState(s.state),
    }));
  }

  public getCurrentStudioState(): HistoryStudioState | null {
    return this.currentState ? this.cloneState(this.currentState) : null;
  }

  public restoreSnapshots(
    undo: HistorySnapshot[],
    redo: HistorySnapshot[] = [],
    current?: HistoryStudioState
  ): void {
    if (Array.isArray(undo) && undo.length > 0) {
      this.undoStack = undo.map((s) => ({
        ...s,
        state: this.cloneState(s.state),
      }));
    }
    if (Array.isArray(redo) && redo.length > 0) {
      this.redoStack = redo.map((s) => ({
        ...s,
        state: this.cloneState(s.state),
      }));
    }
    if (current) {
      this.currentState = this.cloneState(current);
    } else if (this.undoStack.length > 0 && !this.currentState) {
      this.currentState = this.cloneState(this.undoStack[this.undoStack.length - 1].state);
    }
    this.notify();
  }

  private cloneState(state: HistoryStudioState): HistoryStudioState {
    return JSON.parse(JSON.stringify(state));
  }
}

export const historyManager = new HistoryManager();
