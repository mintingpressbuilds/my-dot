import { Metadata } from 'next';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/db';
import { dots, connections, maps, mapDots, mapItems } from '@/db/schema';
import { notFound } from 'next/navigation';
import DotPageClient from './DotPageClient';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  const [dot] = await db
    .select()
    .from(dots)
    .where(eq(dots.slug, slug))
    .limit(1);

  if (!dot) return { title: 'not found — my dot.' };

  const url = `https://mydot.space/dot/${slug}`;

  return {
    title: `${dot.name} — my dot.`,
    description: dot.line || `${dot.name} on my dot.`,
    openGraph: {
      title: `${dot.name} — my dot.`,
      description: dot.line || `${dot.name} on my dot.`,
      url,
      images: [{ url: `${url}/image`, width: 1200, height: 630 }],
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${dot.name} — my dot.`,
      description: dot.line || `${dot.name} on my dot.`,
      images: [`${url}/image`],
    },
  };
}

export default async function DotPage({ params }: Props) {
  const { slug } = await params;

  const [dot] = await db
    .select()
    .from(dots)
    .where(eq(dots.slug, slug))
    .limit(1);

  if (!dot) notFound();

  // get friends with details
  const outgoing = await db
    .select()
    .from(connections)
    .where(eq(connections.fromDotId, dot.id));

  const incoming = await db
    .select()
    .from(connections)
    .where(eq(connections.toDotId, dot.id));

  const outgoingSet = new Set(outgoing.map((c) => c.toDotId));
  const incomingSet = new Set(incoming.map((c) => c.fromDotId));

  const friendDotIds = new Set([
    ...outgoing.map((c) => c.toDotId),
    ...incoming.map((c) => c.fromDotId),
  ]);

  const friends = [];
  for (const dotId of friendDotIds) {
    const [friendDot] = await db
      .select({ id: dots.id, slug: dots.slug, name: dots.name, color: dots.color })
      .from(dots)
      .where(eq(dots.id, dotId))
      .limit(1);
    if (friendDot) {
      friends.push({
        ...friendDot,
        mutual: outgoingSet.has(dotId) && incomingSet.has(dotId),
      });
    }
  }

  // check if viewer is connected (will be refined client-side)
  const isConnected = false;

  // get user's public maps (if dot has an owner)
  let userMaps: {
    id: string;
    slug: string;
    name: string;
    color: string;
    dotCount: number;
    itemCount: number;
    thumbnailItems: { color: string; posX: number; posY: number }[];
  }[] = [];

  if (dot.ownerId) {
    const ownerMaps = await db
      .select()
      .from(maps)
      .where(and(eq(maps.ownerId, dot.ownerId), eq(maps.visibility, 'public')))
      .orderBy(maps.createdAt);

    userMaps = await Promise.all(
      ownerMaps.map(async (map) => {
        const [dotCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(mapDots)
          .where(eq(mapDots.mapId, map.id));
        const [itemCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(mapItems)
          .where(eq(mapItems.mapId, map.id));
        const items = await db
          .select({ color: mapItems.color, posX: mapItems.posX, posY: mapItems.posY })
          .from(mapItems)
          .where(eq(mapItems.mapId, map.id));

        return {
          id: map.id,
          slug: map.slug,
          name: map.name,
          color: map.color,
          dotCount: Number(dotCount?.count ?? 0),
          itemCount: Number(itemCount?.count ?? 0),
          thumbnailItems: items,
        };
      })
    );
  }

  const dotData = {
    id: dot.id,
    slug: dot.slug,
    name: dot.name,
    color: dot.color,
    line: dot.line,
    vibe: dot.vibe,
    theme: dot.theme,
    link: dot.link,
    sparkCount: dot.sparkCount,
    ownerId: dot.ownerId,
    createdAt: dot.createdAt.toISOString(),
  };

  return <DotPageClient dot={dotData} friends={friends} isConnected={isConnected} maps={userMaps} />;
}
