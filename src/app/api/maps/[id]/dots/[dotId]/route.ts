import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { maps, mapDots } from '@/db/schema';
import { getAuthUser } from '@/middleware/auth';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; dotId: string }> },
) {
  try {
    const userId = await getAuthUser();
    if (!userId) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }

    const { id: mapId, dotId } = await params;

    const [map] = await db
      .select()
      .from(maps)
      .where(eq(maps.id, mapId))
      .limit(1);

    if (!map) {
      return NextResponse.json({ message: 'Map not found' }, { status: 404 });
    }
    if (map.ownerId !== userId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    await db
      .delete(mapDots)
      .where(and(eq(mapDots.mapId, mapId), eq(mapDots.dotId, dotId)));

    return NextResponse.json({ message: 'Dot removed from map' });
  } catch {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
