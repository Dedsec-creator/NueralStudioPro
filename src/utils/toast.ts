export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  durationMs: number;
  timestamp: number;
}

type ToastListener = (toasts: ToastMessage[]) => void;

class ToastManager {
  private toasts: ToastMessage[] = [];
  private listeners: Set<ToastListener> = new Set();
  private timers: Map<string, number> = new Map();

  public subscribe(listener: ToastListener): () => void {
    this.listeners.add(listener);
    listener([...this.toasts]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const copy = [...this.toasts];
    this.listeners.forEach((fn) => fn(copy));
  }

  public show(
    message: string,
    type: ToastType = 'info',
    durationMs: number = 4000
  ): string {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const toast: ToastMessage = {
      id,
      message,
      type,
      durationMs,
      timestamp: Date.now(),
    };

    // Keep max 4 concurrent toasts
    if (this.toasts.length >= 4) {
      const oldest = this.toasts[0];
      this.dismiss(oldest.id);
    }

    this.toasts.push(toast);
    this.notify();

    if (durationMs > 0) {
      const timer = window.setTimeout(() => {
        this.dismiss(id);
      }, durationMs);
      this.timers.set(id, timer);
    }

    return id;
  }

  public dismiss(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notify();
  }

  public clearAll(): void {
    this.timers.forEach((t) => clearTimeout(t));
    this.timers.clear();
    this.toasts = [];
    this.notify();
  }
}

export const toastManager = new ToastManager();

export function showToast(
  message: string,
  type: ToastType = 'info',
  durationMs: number = 4000
): string {
  return toastManager.show(message, type, durationMs);
}
