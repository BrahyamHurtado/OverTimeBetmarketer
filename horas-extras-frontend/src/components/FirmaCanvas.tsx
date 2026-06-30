import { useEffect, useRef, useState } from 'react';
import { Button } from './ui/Button';

interface FirmaCanvasProps {
  onChange: (dataUrl: string | null) => void;
  width?: number;
  height?: number;
}

export function FirmaCanvas({ onChange, width = 480, height = 160 }: FirmaCanvasProps) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = width * dpr;
    c.height = height * dpr;
    c.style.width = `${width}px`;
    c.style.height = `${height}px`;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [width, height]);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = ref.current;
    if (!c) return null;
    const rect = c.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = ref.current?.getContext('2d');
    const p = point(e);
    if (!ctx || !p) return;
    drawing.current = true;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = ref.current?.getContext('2d');
    const p = point(e);
    if (!ctx || !p) return;
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };

  const onUp = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const c = ref.current;
    if (!c) return;
    setHasInk(true);
    onChange(c.toDataURL('image/png'));
  };

  const clear = () => {
    const c = ref.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    setHasInk(false);
    onChange(null);
  };

  return (
    <div className="flex flex-col gap-2">
      <canvas
        ref={ref}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
        className="touch-none rounded-md border border-slate-300 bg-white"
        aria-label="Firma digital"
      />
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          {hasInk ? 'Firma capturada' : 'Dibuja tu firma con el mouse o el dedo'}
        </p>
        <Button type="button" variant="ghost" onClick={clear} className="text-xs">
          Borrar
        </Button>
      </div>
    </div>
  );
}
