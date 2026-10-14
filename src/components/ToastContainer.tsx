import React, { useEffect, useState } from 'react';
import { toastManager, ToastMessage } from '../utils/toast';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    return toastManager.subscribe((list) => setToasts(list));
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-20 right-4 sm:right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        let borderColor = 'border-slate-700';
        let bgColor = 'bg-slate-900/95';
        let textColor = 'text-slate-100';
        let IconComponent = Info;
        let iconColor = 'text-cyan-400';

        switch (toast.type) {
          case 'success':
            borderColor = 'border-emerald-500/50';
            bgColor = 'bg-emerald-950/90';
            textColor = 'text-emerald-100';
            IconComponent = CheckCircle2;
            iconColor = 'text-emerald-400';
            break;
          case 'warning':
            borderColor = 'border-amber-500/50';
            bgColor = 'bg-amber-950/90';
            textColor = 'text-amber-100';
            IconComponent = AlertTriangle;
            iconColor = 'text-amber-400';
            break;
          case 'error':
            borderColor = 'border-rose-500/50';
            bgColor = 'bg-rose-950/90';
            textColor = 'text-rose-100';
            IconComponent = AlertCircle;
            iconColor = 'text-rose-400';
            break;
          default:
            borderColor = 'border-cyan-500/40';
            bgColor = 'bg-slate-900/95';
            textColor = 'text-cyan-100';
            IconComponent = Info;
            iconColor = 'text-cyan-400';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-2.5 p-3 rounded-xl border backdrop-blur-md shadow-2xl transition-all duration-300 animate-slide-up ${borderColor} ${bgColor} ${textColor}`}
          >
            <IconComponent className={`w-4 h-4 shrink-0 mt-0.5 ${iconColor}`} />
            <div className="flex-1 text-xs leading-relaxed font-sans font-medium break-words">
              {toast.message}
            </div>
            <button
              onClick={() => toastManager.dismiss(toast.id)}
              className="text-slate-400 hover:text-white p-0.5 rounded transition cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
