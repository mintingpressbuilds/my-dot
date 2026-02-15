'use client';

import { PALETTE } from '@/lib/colors';

interface ColorPickerProps {
  selected: string;
  onChange: (color: string) => void;
}

export default function ColorPicker({ selected, onChange }: ColorPickerProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {PALETTE.map((c) => (
        <div
          key={c}
          onClick={() => onChange(c)}
          className="w-8 h-8 rounded-full cursor-pointer transition-all duration-200 hover:scale-[1.15]"
          style={{
            background: c,
            border: selected === c ? '2px solid rgba(255,255,255,0.8)' : '2px solid transparent',
            transform: selected === c ? 'scale(1.15)' : undefined,
          }}
        />
      ))}
    </div>
  );
}
