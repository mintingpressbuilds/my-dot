'use client';

interface TooltipData {
  x: number;
  y: number;
  name: string;
  line: string;
  color: string;
}

interface DotTooltipProps {
  tooltip: TooltipData | null;
}

export default function DotTooltip({ tooltip }: DotTooltipProps) {
  if (!tooltip) return null;

  return (
    <div
      className="fixed z-50 px-4 py-2.5 rounded-xl pointer-events-none max-w-[220px]"
      style={{
        left: tooltip.x,
        top: tooltip.y,
        background: 'rgba(8,8,14,0.92)',
        border: '1px solid #1a1a24',
        backdropFilter: 'blur(16px)',
      }}
    >
      <div>
        <span
          className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle relative -top-px"
          style={{ background: tooltip.color }}
        />
        <span className="text-sm text-white font-normal">{tooltip.name}</span>
      </div>
      <div className="text-[11px] text-[#55556a] font-light leading-snug">
        {tooltip.line}
      </div>
    </div>
  );
}
