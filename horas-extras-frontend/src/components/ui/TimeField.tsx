import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ClockDial } from './ClockDial';

interface TimeFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  ariaLabel?: string;
}

const DESKTOP_POPUP_WIDTH = 520;
const DESKTOP_POPUP_HEIGHT = 380;
const MOBILE_BREAKPOINT = 640;
const GAP = 6;

interface Parts {
  hour12: number;
  minute: number;
  period: 'AM' | 'PM';
}

function parseValue(value: string): Parts {
  const [hStr, mStr] = (value || '').split(':');
  const h24 = Number(hStr);
  const m = Number(mStr);
  const validH = Number.isFinite(h24) && h24 >= 0 && h24 <= 23;
  const validM = Number.isFinite(m) && m >= 0 && m <= 59;
  const hour24 = validH ? h24 : 8;
  const minute = validM ? m : 0;
  const period: 'AM' | 'PM' = hour24 >= 12 ? 'PM' : 'AM';
  let hour12 = hour24 % 12;
  if (hour12 === 0) hour12 = 12;
  return { hour12, minute, period };
}

function toValue24({ hour12, minute, period }: Parts): string {
  let h24 = hour12 % 12;
  if (period === 'PM') h24 += 12;
  return `${pad2(h24)}:${pad2(minute)}`;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatDisplay(value: string): string {
  if (!value) return '';
  const { hour12, minute, period } = parseValue(value);
  return `${hour12}:${pad2(minute)} ${period}`;
}

export function TimeField({
  value,
  onChange,
  disabled,
  className = '',
  placeholder = '--:--',
  ariaLabel,
}: TimeFieldProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const [hourStr, setHourStr] = useState('08');
  const [minStr, setMinStr] = useState('00');
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');
  const [selecting, setSelecting] = useState<'hour' | 'minute'>('hour');

  useEffect(() => {
    if (open) {
      const p = parseValue(value);
      setHourStr(pad2(p.hour12));
      setMinStr(pad2(p.minute));
      setPeriod(p.period);
      setSelecting('hour');
    }
  }, [open, value]);

  useLayoutEffect(() => {
    if (!open) return;
    const mobile = window.innerWidth < MOBILE_BREAKPOINT;
    setIsMobile(mobile);
    if (mobile || !triggerRef.current) {
      setCoords(null);
      return;
    }
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    let top = rect.bottom + GAP;
    let left = rect.left;
    if (left + DESKTOP_POPUP_WIDTH > viewportW - 8) {
      left = Math.max(8, rect.right - DESKTOP_POPUP_WIDTH);
    }
    if (top + DESKTOP_POPUP_HEIGHT > viewportH - 8) {
      top = Math.max(8, rect.top - DESKTOP_POPUP_HEIGHT - GAP);
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
    const onResize = () => setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onEsc);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  const onHourInput = (raw: string) => {
    setHourStr(raw.replace(/\D/g, '').slice(0, 2));
  };
  const onMinInput = (raw: string) => {
    setMinStr(raw.replace(/\D/g, '').slice(0, 2));
  };

  const confirm = () => {
    const h12raw = Number(hourStr) || 12;
    const m = Number(minStr) || 0;
    const hour12 = Math.min(12, Math.max(1, h12raw));
    const minute = Math.min(59, Math.max(0, m));
    onChange(toValue24({ hour12, minute, period }));
    setOpen(false);
  };

  const dialValue = selecting === 'hour'
    ? (Number(hourStr) || 12)
    : (Number(minStr) || 0);

  const onDialChange = (v: number) => {
    if (selecting === 'hour') setHourStr(pad2(v));
    else setMinStr(pad2(v));
  };

  const onDialCommit = () => {
    if (selecting === 'hour') setSelecting('minute');
  };

  const popupContent = (
    <>
      <p className="mb-3 text-xs uppercase tracking-wide text-slate-400">
        {selecting === 'hour' ? 'Selecciona la hora' : 'Selecciona los minutos'}
      </p>

      <div className="flex flex-col items-center gap-4 md:flex-row md:items-center md:justify-center md:gap-6">
        <div className="flex flex-col items-center gap-3">
          <ClockDial
            value={dialValue}
            mode={selecting}
            onChange={onDialChange}
            onCommit={onDialCommit}
          />
          <div className="flex items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={() => setSelecting('hour')}
              className={`rounded-md px-2 py-1 text-3xl tabular-nums transition ${
                selecting === 'hour' ? 'bg-primary-soft text-primary' : 'text-ink-900'
              }`}
            >
              {hourStr}
            </button>
            <span className="text-2xl text-slate-400">:</span>
            <button
              type="button"
              onClick={() => setSelecting('minute')}
              className={`rounded-md px-2 py-1 text-3xl tabular-nums transition ${
                selecting === 'minute' ? 'bg-primary-soft text-primary' : 'text-ink-900'
              }`}
            >
              {minStr}
            </button>
            <div className="ml-2 flex flex-col overflow-hidden rounded-lg border border-outline-variant">
              <PeriodBtn selected={period === 'AM'} onClick={() => setPeriod('AM')}>AM</PeriodBtn>
              <div className="h-px bg-outline-variant" />
              <PeriodBtn selected={period === 'PM'} onClick={() => setPeriod('PM')}>PM</PeriodBtn>
            </div>
          </div>
        </div>

        <div className="hidden flex-col justify-center md:flex">
          <div className="flex items-start gap-2">
            <BigInput
              value={hourStr}
              onChange={onHourInput}
              label="Hora"
              active={selecting === 'hour'}
              onSelectField={() => setSelecting('hour')}
            />
            <span className="pt-4 text-4xl font-light text-slate-400">:</span>
            <BigInput
              value={minStr}
              onChange={onMinInput}
              label="Minuto"
              active={selecting === 'minute'}
              onSelectField={() => setSelecting('minute')}
            />
            <div className="ml-2 flex flex-col overflow-hidden rounded-lg border border-outline-variant">
              <PeriodBtn selected={period === 'AM'} onClick={() => setPeriod('AM')}>AM</PeriodBtn>
              <div className="h-px bg-outline-variant" />
              <PeriodBtn selected={period === 'PM'} onClick={() => setPeriod('PM')}>PM</PeriodBtn>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-1">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full px-4 py-2 text-sm font-medium text-slate-500 hover:bg-surface-highest"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={confirm}
          className="rounded-full bg-secondary-container px-4 py-2 text-sm font-semibold text-white hover:bg-secondary-hover"
        >
          OK
        </button>
      </div>
    </>
  );

  const showPopup = open && !disabled && typeof document !== 'undefined' && (isMobile || coords);

  return (
    <div className={className}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-label={ariaLabel ?? 'Seleccionar hora'}
        className="input-base flex w-full items-center justify-between gap-2 py-1.5 text-left tabular-nums disabled:cursor-not-allowed"
      >
        <span className={value ? 'text-ink-900' : 'text-slate-400'}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        <ClockIcon />
      </button>

      {showPopup &&
        createPortal(
          isMobile ? (
            <>
              <div
                className="fixed inset-0 z-[9998] bg-black/60"
                onClick={() => setOpen(false)}
              />
              <div
                ref={popupRef}
                style={{
                  position: 'fixed',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 'min(340px, 92vw)',
                  maxHeight: 'calc(100vh - 32px)',
                  overflowY: 'auto',
                  zIndex: 9999,
                }}
                className="rounded-2xl border border-outline-variant bg-surface-high p-4 text-ink-900 shadow-elevated"
              >
                {popupContent}
              </div>
            </>
          ) : (
            <div
              ref={popupRef}
              style={{
                position: 'fixed',
                top: coords!.top,
                left: coords!.left,
                width: DESKTOP_POPUP_WIDTH,
                maxHeight: 'calc(100vh - 20px)',
                overflowY: 'auto',
                zIndex: 9999,
              }}
              className="rounded-2xl border border-outline-variant bg-surface-high p-4 text-ink-900 shadow-elevated"
            >
              {popupContent}
            </div>
          ),
          document.body,
        )}
    </div>
  );
}

interface BigInputProps {
  value: string;
  onChange: (v: string) => void;
  label: string;
  active?: boolean;
  onSelectField?: () => void;
}
function BigInput({ value, onChange, label, active, onSelectField }: BigInputProps) {
  return (
    <label className="flex flex-col items-center gap-1">
      <input
        type="text"
        inputMode="numeric"
        maxLength={2}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => {
          e.target.select();
          onSelectField?.();
        }}
        aria-label={label}
        className={`h-16 w-20 rounded-lg text-center text-4xl font-light tabular-nums outline-none transition ${
          active
            ? 'bg-primary-soft text-primary ring-2 ring-primary'
            : 'bg-surface text-ink-900 ring-1 ring-outline-variant'
        }`}
      />
      <span className="text-[10px] uppercase tracking-wide text-slate-400">{label}</span>
    </label>
  );
}

function PeriodBtn({
  children,
  selected,
  onClick,
}: {
  children: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 text-sm font-medium transition ${
        selected
          ? 'bg-primary-soft text-primary'
          : 'text-slate-400 hover:bg-surface-highest'
      }`}
    >
      {children}
    </button>
  );
}

function ClockIcon() {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className="text-slate-400"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
