import { AlertCircle, Check, Loader2, X } from 'lucide-react';
import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode,
  type SelectHTMLAttributes, type TextareaHTMLAttributes,
} from 'react';
import { twMerge } from 'tailwind-merge';

/**
 * Join class names, resolving Tailwind conflicts so the *last* value wins.
 *
 * A plain join does not work: class order in the attribute is irrelevant, only
 * stylesheet order counts. So a base `w-full` on a field would beat a caller's
 * `w-24` no matter where it sat in the string. twMerge drops the superseded
 * utility instead, which is the behaviour every call site already assumes.
 */
export const cx = (...parts: (string | false | null | undefined)[]) =>
  twMerge(parts.filter(Boolean).join(' '));

/* ------------------------------- button --------------------------------- */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
};

const VARIANTS: Record<string, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 focus-visible:outline-brand-600 shadow-sm',
  secondary: 'bg-white text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 shadow-sm',
  ghost: 'text-slate-600 hover:bg-slate-100',
  subtle: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
};

const SIZES: Record<string, string> = {
  sm: 'h-8 px-2.5 text-[13px] gap-1.5',
  md: 'h-9 px-3.5 text-sm gap-2',
  lg: 'h-11 px-5 text-[15px] gap-2',
};

export function Button({
  variant = 'secondary', size = 'md', loading, icon, className, children, disabled, ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center rounded-lg font-medium transition',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant], SIZES[size], className,
      )}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

/* -------------------------------- fields -------------------------------- */

const FIELD =
  'w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm ' +
  'ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 ' +
  'focus:ring-2 focus:ring-inset focus:ring-brand-600 disabled:bg-slate-50 disabled:text-slate-500';

export function Field({
  label, hint, error, required, children, className,
}: {
  label?: string; hint?: string; error?: string; required?: boolean;
  children: ReactNode; className?: string;
}) {
  return (
    <label className={cx('block', className)}>
      {label && (
        <span className="mb-1.5 block text-[13px] font-medium text-slate-700">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </span>
      )}
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-red-600">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-slate-500">{hint}</span>
      ) : null}
    </label>
  );
}

export const Input = ({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) => (
  <input {...rest} className={cx(FIELD, className)} />
);

export const Textarea = ({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...rest} className={cx(FIELD, 'resize-y', className)} />
);

export const Select = ({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...rest} className={cx(FIELD, 'pr-8', className)}>
    {children}
  </select>
);

export function Checkbox({
  label, checked, onChange, disabled,
}: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
      />
      {label}
    </label>
  );
}

/* -------------------------------- layout -------------------------------- */

export function Card({
  title, subtitle, actions, children, className, padded = true,
}: {
  title?: ReactNode; subtitle?: ReactNode; actions?: ReactNode;
  children?: ReactNode; className?: string; padded?: boolean;
}) {
  return (
    <section className={cx('rounded-xl bg-white shadow-sm ring-1 ring-slate-200', className)}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <div className="min-w-0">
            {title && <h2 className="truncate text-sm font-semibold text-slate-900">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={padded ? 'p-5' : undefined}>{children}</div>
    </section>
  );
}

export function PageHeader({
  title, subtitle, actions, children,
}: { title: string; subtitle?: ReactNode; actions?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

export function Stat({
  label, value, sub, tone = 'default', icon,
}: {
  label: string; value: ReactNode; sub?: ReactNode;
  tone?: 'default' | 'good' | 'warn' | 'bad'; icon?: ReactNode;
}) {
  const tones = {
    default: 'text-slate-900',
    good: 'text-brand-700',
    warn: 'text-amber-600',
    bad: 'text-red-600',
  };
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</p>
        {icon && <span className="text-slate-300">{icon}</span>}
      </div>
      <p className={cx('tnum mt-2 text-2xl font-semibold tracking-tight', tones[tone])}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

/* -------------------------------- badges -------------------------------- */

const BADGE_TONES: Record<string, string> = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  green: 'bg-brand-50 text-brand-700 ring-brand-200',
  blue: 'bg-sky-50 text-sky-700 ring-sky-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
};

export function Badge({
  children, tone = 'slate', dot, className,
}: { children: ReactNode; tone?: keyof typeof BADGE_TONES; dot?: string; className?: string }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        BADGE_TONES[tone], className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full" style={{ background: dot }} />}
      {children}
    </span>
  );
}

const QUOTE_TONES: Record<string, keyof typeof BADGE_TONES> = {
  DRAFT: 'slate', SENT: 'blue', ACCEPTED: 'green', REJECTED: 'red',
  EXPIRED: 'amber', SUPERSEDED: 'violet',
};

export const StatusBadge = ({ status }: { status: string }) => (
  <Badge tone={QUOTE_TONES[status] ?? 'slate'}>{status.replace(/_/g, ' ').toLowerCase()}</Badge>
);

/* -------------------------------- states -------------------------------- */

export const Spinner = ({ className }: { className?: string }) => (
  <Loader2 className={cx('size-5 animate-spin text-slate-400', className)} />
);

export const Loading = ({ label = 'Loading…' }: { label?: string }) => (
  <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
    <Spinner /> {label}
  </div>
);

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl bg-red-50 py-12 text-center ring-1 ring-red-200">
      <AlertCircle className="size-6 text-red-500" />
      <p className="max-w-md px-6 text-sm text-red-700">{message}</p>
      {onRetry && <Button size="sm" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function EmptyState({
  icon, title, description, action,
}: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 py-14 text-center">
      {icon && <div className="text-slate-300">{icon}</div>}
      <div>
        <p className="text-sm font-medium text-slate-900">{title}</p>
        {description && <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/* -------------------------------- modal --------------------------------- */

export function Modal({
  open, onClose, title, description, children, footer, wide,
}: {
  open: boolean; onClose: () => void; title: string; description?: string;
  children: ReactNode; footer?: ReactNode; wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-[2px] sm:p-8">
      <div
        className={cx(
          'my-auto w-full rounded-xl bg-white shadow-xl ring-1 ring-slate-200',
          wide ? 'max-w-4xl' : 'max-w-lg',
        )}
        role="dialog"
        aria-modal="true"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="size-5" />
          </button>
        </header>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <footer className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3 rounded-b-xl">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

/* -------------------------------- table --------------------------------- */

export const Table = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className="overflow-x-auto">
    <table className={cx('w-full text-sm', className)}>{children}</table>
  </div>
);

export const Th = ({ children, className, align }: { children?: ReactNode; className?: string; align?: 'right' | 'center' }) => (
  <th
    className={cx(
      'border-b border-slate-200 px-3 py-2.5 text-xs font-semibold tracking-wide text-slate-500 uppercase',
      align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left',
      className,
    )}
  >
    {children}
  </th>
);

export const Td = ({ children, className, align }: { children?: ReactNode; className?: string; align?: 'right' | 'center' }) => (
  <td
    className={cx(
      'border-b border-slate-100 px-3 py-2.5 align-top text-slate-700',
      align === 'right' ? 'tnum text-right' : align === 'center' ? 'text-center' : '',
      className,
    )}
  >
    {children}
  </td>
);

/* --------------------------------- tabs --------------------------------- */

export function Tabs<T extends string>({
  value, onChange, tabs, className,
}: {
  value: T; onChange: (v: T) => void;
  tabs: { value: T; label: ReactNode; count?: number; color?: string }[];
  className?: string;
}) {
  return (
    <div className={cx('flex gap-1 overflow-x-auto border-b border-slate-200', className)}>
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={cx(
              'relative -mb-px flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-medium transition',
              active
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700',
            )}
          >
            {tab.color && <span className="size-2 rounded-full" style={{ background: tab.color }} />}
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cx(
                  'rounded-full px-1.5 py-0.5 text-[11px] tabular-nums',
                  active ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-600',
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------- toasts -------------------------------- */

type Toast = { id: number; message: string; tone: 'success' | 'error' | 'info' };
const ToastCtx = createContext<{ push: (message: string, tone?: Toast['tone']) => void }>({ push: () => {} });

export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === 'error' ? 7000 : 3500);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cx(
              'pointer-events-auto flex items-start gap-2.5 rounded-lg px-4 py-3 text-sm shadow-lg ring-1',
              t.tone === 'error'
                ? 'bg-red-600 text-white ring-red-700'
                : t.tone === 'info'
                  ? 'bg-slate-800 text-white ring-slate-900'
                  : 'bg-brand-600 text-white ring-brand-700',
            )}
          >
            {t.tone === 'error' ? <AlertCircle className="mt-px size-4 shrink-0" /> : <Check className="mt-px size-4 shrink-0" />}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} className="opacity-70 hover:opacity-100">
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/** Wrap an async action so failures surface as an error toast instead of a silent no-op. */
export function useAction() {
  const { push } = useToast();
  const [busy, setBusy] = useState(false);

  const run = useCallback(
    async <T,>(fn: () => Promise<T>, successMessage?: string): Promise<T | undefined> => {
      setBusy(true);
      try {
        const result = await fn();
        if (successMessage) push(successMessage);
        return result;
      } catch (err) {
        push(err instanceof Error ? err.message : 'Something went wrong', 'error');
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    [push],
  );

  return { run, busy };
}

/* ----------------------------- confirmation ----------------------------- */

export function ConfirmDialog({
  open, onCancel, onConfirm, title, message, confirmLabel = 'Confirm', danger,
}: {
  open: boolean; onCancel: () => void; onConfirm: () => void;
  title: string; message: string; confirmLabel?: string; danger?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }
    >
      <p className="text-sm text-slate-600">{message}</p>
    </Modal>
  );
}
