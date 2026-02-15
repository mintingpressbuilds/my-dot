'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import MapThumbnail from './MapThumbnail';
import MapBuilder from './MapBuilder';

interface MapData {
  id: string;
  slug: string;
  name: string;
  color: string;
  dotCount: number;
  itemCount: number;
  thumbnailItems: { color: string; posX: number; posY: number }[];
}

interface MyMapsRowProps {
  maps: MapData[];
  isOwner: boolean;
}

export default function MyMapsRow({ maps, isOwner }: MyMapsRowProps) {
  const router = useRouter();
  const [builderOpen, setBuilderOpen] = useState(false);

  if (maps.length === 0 && !isOwner) return null;

  return (
    <>
      <div className="mt-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] tracking-[2px] uppercase text-[#55556a] font-light">
            my maps
          </div>
          {isOwner && (
            <button
              onClick={() => setBuilderOpen(true)}
              className="text-[10px] tracking-[1px] text-white/25 hover:text-white/50 font-light cursor-pointer transition-colors duration-200 bg-transparent border-none"
            >
              + new
            </button>
          )}
        </div>

        {maps.length === 0 ? (
          <button
            onClick={() => setBuilderOpen(true)}
            className="w-full py-6 cursor-pointer transition-all duration-300 border-none text-center"
            style={{
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '12px',
              border: '1px dashed rgba(255,255,255,0.06)',
            }}
          >
            <div className="text-[10px] text-white/20 font-light tracking-[1px]">
              create your first map
            </div>
          </button>
        ) : (
          <div
            className="flex gap-3 overflow-x-auto pb-2"
            style={{ scrollbarWidth: 'none', touchAction: 'pan-x' }}
          >
            {maps.map((map) => (
              <button
                key={map.id}
                onClick={() => router.push(`/map/${map.slug}`)}
                className="flex-shrink-0 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 bg-transparent border-none p-0 text-left"
              >
                <div
                  style={{
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  <MapThumbnail items={map.thumbnailItems} />
                </div>
                <div className="mt-1.5 text-[10px] text-white/40 font-light truncate" style={{ maxWidth: '120px' }}>
                  {map.name}
                </div>
                <div className="text-[9px] text-white/15 font-light">
                  {map.dotCount + map.itemCount} dots
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <MapBuilder open={builderOpen} onClose={() => setBuilderOpen(false)} />
    </>
  );
}
