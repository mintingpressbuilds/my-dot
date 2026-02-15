'use client';

import Galaxy from '@/components/Galaxy';
import type { GalaxyDot, MapModeConfig } from '@/components/Galaxy';
import { useAuth } from '@/hooks/useAuth';

interface MapData {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  color: string;
  type: string;
  ownerId: string;
}

interface MapPageClientProps {
  map: MapData;
  galaxyDots: GalaxyDot[];
  connections: { id: string; fromItemId: string; toItemId: string }[];
}

export default function MapPageClient({ map, galaxyDots, connections }: MapPageClientProps) {
  const { user } = useAuth();
  const isOwner = user?.id === map.ownerId;

  const mapMode: MapModeConfig = {
    mapId: map.id,
    mapSlug: map.slug,
    mapName: map.name,
    mapDescription: map.description,
    mapColor: map.color,
    isOwner,
    connections,
  };

  return (
    <Galaxy
      initialDots={galaxyDots}
      mapMode={mapMode}
    />
  );
}
