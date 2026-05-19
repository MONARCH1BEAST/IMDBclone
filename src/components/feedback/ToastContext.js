import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

const ToastContext = createContext(null);
const MAX_TOASTS = 4;

const toneMap = {
  success: {
    icon: CheckCircle2,
    className: 'border-emerald-500/40 bg-emerald-950/95 text-emerald-50',
    iconClassName: 'text-emerald-300',
  },
  error: {
    icon: AlertTriangle,
    className: 'border-red-500/40 bg-red-950/95 text-red-50',
    iconClassName: 'text-red-300',
  },
  warning: {
    icon: AlertTriangle,
    className: 'border-amber-500/40 bg-amber-950/95 text-amber-50',
    iconClassName: 'text-amber-300',
  },
  info: {
    icon: Info,
    className: 'border-sky-500/40 bg-sky-950/95 text-sky-50',
    iconClassName: 'text-sky-300',
  },
};

function createToastId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function ToastViewport({ toasts, onDismiss }) {
  return (
    <div
      className="pointer-events-none fixed right-4 top-20 z-[60] flex w-[min(92vw,24rem)] flex-col gap-3"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => {
        const tone = toneMap[toast.type] || toneMap.info;
        const Icon = tone.icon;

        return (
          <div
            key={toast.id}
            role={toast.type === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex items-start gap-3 rounded-lg border p-4 shadow-xl backdrop-blur ${tone.className}`}
          >
            <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${tone.iconClassName}`} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{toast.title}</p>
              {toast.message && (
                <p className="mt-1 text-sm opacity-85">{toast.message}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="rounded p-1 opacity-80 transition hover:bg-white/10 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/50"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    ({ type = 'info', title, message, duration = 4000 }) => {
      const id = createToastId();
      const toast = { id, type, title, message };

      setToasts((current) => [toast, ...current].slice(0, MAX_TOASTS));

      if (duration > 0) {
        window.setTimeout(() => dismiss(id), duration);
      }

      return id;
    },
    [dismiss]
  );

  const value = useMemo(
    () => ({
      notify,
      dismiss,
      success: (title, options = {}) => notify({ ...options, title, type: 'success' }),
      error: (title, options = {}) => notify({ ...options, title, type: 'error', duration: options.duration ?? 6000 }),
      warning: (title, options = {}) => notify({ ...options, title, type: 'warning' }),
      info: (title, options = {}) => notify({ ...options, title, type: 'info' }),
    }),
    [dismiss, notify]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used inside ToastProvider');
  }

  return context;
}
