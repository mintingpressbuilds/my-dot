'use client';

import { VIBES, type Vibe } from '@/lib/colors';

interface VibePickerProps {
  selected: Vibe;
  onChange: (vibe: Vibe) => void;
}

export default function VibePicker({ selected, onChange }: VibePickerProps) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {VIBES.map((v) => (
        <div
          key={v}
          onClick={() => onChange(v)}
          className="cursor-pointer transition-all duration-200 text-[11px] font-light"
          style={{
            padding: '7px 14px',
            borderRadius: '18px',
            background: selected === v ? '#111118' : '#030305',
            border: selected === v ? '1px solid rgba(255,255,255,0.15)' : '1px solid #1a1a24',
            color: selected === v ? '#fff' : '#55556a',
          }}
        >
          {v}
        </div>
      ))}
    </div>
  );
}
