import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { maps, mapConnections } from '@/db/schema';
import { getAuthUser } from '@/middleware/auth';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; connectionId: string }> },
) {
  try {
    const userId = await getAuthUser();
    if (!userId) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }

    const { id: mapId, connectionId } = await params;

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
      .delete(mapConnections)
      .where(and(eq(mapConnections.id, connectionId), eq(mapConnections.mapId, mapId)));

    return NextResponse.json({ message: 'Connection removed' });
  } catch {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
