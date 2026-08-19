import { useRef, useState } from 'react';

interface ClockDialProps {
  value: number;
  onChange: (v: number) => void;
  mode: 'hour' | 'minute';
  onCommit?: () => void;
}

const SIZE = 240;
const CENTER = SIZE / 2; 
const NUMBER_RADIUS = 96;
const BUBBLE_RADIUS = 96;
const HAND_END = 78;
const BUBBLE_SIZE = 18;

export function ClockDial({ value, onChange, mode, onCommit }: ClockDialProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState(false);

  const labels = mode === 'hour'
    ? Array.from({ length: 12 }, (_, i) => (i === 0 ? 12 : i))
    : Array.from({ length: 12 }, (_, i) => i * 5);

  const step = mode === 'hour' ? 30 : 6;
  const rotationDeg = value * step;

  const coordsToValue = (clientX: number, clientY: number): number => {
    const svg = svgRef.current;
    if (!svg) return value;
    const rect = svg.getBoundingClientRect();
    const scale = rect.width / SIZE;
    const cx = rect.left + CENTER * scale;
    const cy = rect.top + CENTER * scale;
    const dx = clientX - cx;
    const dy = clientY - cy;
    let deg = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (deg < 0) deg += 360;
    if (mode === 'hour') {
      let h = Math.round(deg / 30) % 12;
      if (h === 0) h = 12;
      return h;
    }
    return (Math.round(deg / 30) * 5) % 60;
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    onChange(coordsToValue(e.clientX, e.clientY));
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging) return;
    const next = coordsToValue(e.clientX, e.clientY);
    if (next !== value) onChange(next);
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDragging(false);
    onCommit?.();
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      width={SIZE}
      height={SIZE}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{ touchAction: 'none', userSelect: 'none' }}
    >
      <circle
        cx={CENTER} cy={CENTER} r={CENTER - 2}
        fill="#272a2c"
        pointerEvents="none"
      />

      <g
        style={{
          transformOrigin: `${CENTER}px ${CENTER}px`,
          transform: `rotate(${rotationDeg}deg)`,
          transition: dragging ? 'none' : 'transform 220ms cubic-bezier(0.4, 0, 0.2, 1)',
          pointerEvents: 'none',
        }}
      >
        <line
          x1={CENTER} y1={CENTER}
          x2={CENTER} y2={CENTER - HAND_END}
          stroke="#0053db"
          strokeWidth={2}
        />
        <circle
          cx={CENTER} cy={CENTER - BUBBLE_RADIUS}
          r={BUBBLE_SIZE}
          fill="#0053db"
        />
        <circle cx={CENTER} cy={CENTER} r={3} fill="#0053db" />
      </g>

      {labels.map((label, i) => {
        const angle = (i * 30 - 90) * (Math.PI / 180);
        const x = CENTER + NUMBER_RADIUS * Math.cos(angle);
        const y = CENTER + NUMBER_RADIUS * Math.sin(angle);
        const isSelected = label === value;
        return (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={14}
            fill={isSelected ? '#ffffff' : '#e0e3e5'}
            fontWeight={isSelected ? 600 : 400}
            style={{ pointerEvents: 'none' }}
          >
            {mode === 'minute' ? String(label).padStart(2, '0') : label}
          </text>
        );
      })}
    </svg>
  );
}
