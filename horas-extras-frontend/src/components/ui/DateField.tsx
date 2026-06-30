import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DayPicker } from 'react-day-picker';
import { es } from 'react-day-picker/locale';
import 'react-day-picker/style.css';

interface DateFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  ariaLabel?: string;
}

const POPUP_WIDTH = 280;
const POPUP_HEIGHT = 320;
const GAP = 6;

function toDate(value: string): Date | undefined {
  if (!value) return undefined;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplay(value: string): string {
  const d = toDate(value);
  if (!d) return '';
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function DateField({
  value,
  onChange,
  disabled,
  className = '',
  placeholder = 'Selecciona fecha',
  ariaLabel,
}: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    let top = rect.bottom + GAP;
    let left = rect.left;
    if (left + POPUP_WIDTH > viewportW - 8) {
      left = Math.max(8, rect.right - POPUP_WIDTH);
    }
    if (top + POPUP_HEIGHT > viewportH - 8) {
      top = Math.max(8, rect.top - POPUP_HEIGHT - GAP);
    }
    setCoords({ top, left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (popupRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const reposition = () => setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onEsc);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [open]);

  const selected = toDate(value);

  return (
    <div className={className}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-label={ariaLabel ?? 'Seleccionar fecha'}
        className="input-base flex w-full items-center justify-between gap-2 py-1.5 text-left tabular-nums disabled:cursor-not-allowed"
      >
        <span className={value ? 'text-ink-900' : 'text-slate-400'}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        <CalendarIcon />
      </button>
      {open && !disabled && coords && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popupRef}
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              width: POPUP_WIDTH,
              zIndex: 9999,
            }}
            className="rounded-xl border border-outline-variant bg-surface-high p-2 text-ink-900 shadow-elevated"
          >
            <DayPicker
              mode="single"
              locale={es}
              selected={selected}
              defaultMonth={selected ?? new Date()}
              onSelect={(d: Date | undefined) => {
                if (d) {
                  onChange(toIso(d));
                  setOpen(false);
                }
              }}
              weekStartsOn={1}
              showOutsideDays
            />
          </div>,
          document.body,
        )}
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
