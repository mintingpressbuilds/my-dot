import { NextResponse } from 'next/server';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/db';
import { maps, mapDots, mapItems } from '@/db/schema';
import { getAuthUser } from '@/middleware/auth';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: targetUserId } = await params;
    const currentUserId = await getAuthUser();

    // If viewing own maps, show all. Otherwise, only public.
    const isOwner = currentUserId === targetUserId;

    const userMaps = await db
      .select()
      .from(maps)
      .where(
        isOwner
          ? eq(maps.ownerId, targetUserId)
          : and(eq(maps.ownerId, targetUserId), eq(maps.visibility, 'public'))
      )
      .orderBy(maps.createdAt);

    // For each map, get dot and item counts for thumbnail data
    const mapsWithCounts = await Promise.all(
      userMaps.map(async (map) => {
        const [dotCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(mapDots)
          .where(eq(mapDots.mapId, map.id));

        const [itemCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(mapItems)
          .where(eq(mapItems.mapId, map.id));

        // Get items for thumbnail rendering (positions + colors)
        const items = await db
          .select({
            color: mapItems.color,
            posX: mapItems.posX,
            posY: mapItems.posY,
          })
          .from(mapItems)
          .where(eq(mapItems.mapId, map.id));

        return {
          ...map,
          dotCount: Number(dotCount?.count ?? 0),
          itemCount: Number(itemCount?.count ?? 0),
          thumbnailItems: items,
        };
      })
    );

    return NextResponse.json(mapsWithCounts);
  } catch {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
