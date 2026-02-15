import { Metadata } from 'next';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { maps, mapDots, mapItems, mapConnections, dots } from '@/db/schema';
import { notFound } from 'next/navigation';
import MapPageClient from './MapPageClient';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  const [map] = await db
    .select()
    .from(maps)
    .where(eq(maps.slug, slug))
    .limit(1);

  if (!map) return { title: 'not found — my dot.' };

  return {
    title: `${map.name} — my dot.`,
    description: map.description || `a map on my dot.`,
  };
}

export default async function MapPage({ params }: Props) {
  const { slug } = await params;

  const [map] = await db
    .select()
    .from(maps)
    .where(eq(maps.slug, slug))
    .limit(1);

  if (!map) notFound();

  // Get dots in this map
  const dotRows = await db
    .select({
      id: dots.id,
      slug: dots.slug,
      name: dots.name,
      color: dots.color,
      line: dots.line,
      vibe: dots.vibe,
      x: dots.posX,
      y: dots.posY,
      z: dots.posZ,
    })
    .from(mapDots)
    .innerJoin(dots, eq(mapDots.dotId, dots.id))
    .where(eq(mapDots.mapId, map.id));

  // Get items in this map
  const items = await db
    .select()
    .from(mapItems)
    .where(eq(mapItems.mapId, map.id));

  // Get connections
  const conns = await db
    .select()
    .from(mapConnections)
    .where(eq(mapConnections.mapId, map.id));

  // Combine dots and items into a single galaxy-compatible array
  const galaxyDots = [
    ...dotRows.map(d => ({
      id: d.id,
      name: d.name,
      color: d.color,
      line: d.line,
      vibe: d.vibe,
      x: d.x,
      y: d.y,
      z: d.z,
    })),
    ...items.map(item => ({
      id: item.id,
      name: item.name,
      color: item.color,
      line: item.line || '',
      vibe: undefined,
      x: item.posX,
      y: item.posY,
      z: item.posZ,
    })),
  ];

  return (
    <MapPageClient
      map={{
        id: map.id,
        slug: map.slug,
        name: map.name,
        description: map.description,
        color: map.color,
        type: map.type,
        ownerId: map.ownerId,
      }}
      galaxyDots={galaxyDots}
      connections={conns.map(c => ({
        id: c.id,
        fromItemId: c.fromItemId,
        toItemId: c.toItemId,
      }))}
    />
  );
}
