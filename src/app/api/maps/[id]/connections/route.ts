import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { maps, mapConnections } from '@/db/schema';
import { getAuthUser } from '@/middleware/auth';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getAuthUser();
    if (!userId) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }

    const { id: mapId } = await params;

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

    const body = await req.json();
    const { fromItemId, toItemId } = body;

    if (!fromItemId || !toItemId) {
      return NextResponse.json({ message: 'fromItemId and toItemId required' }, { status: 400 });
    }
    if (fromItemId === toItemId) {
      return NextResponse.json({ message: 'Cannot connect an item to itself' }, { status: 400 });
    }

    const [conn] = await db
      .insert(mapConnections)
      .values({
        id: nanoid(12),
        mapId,
        fromItemId,
        toItemId,
      })
      .onConflictDoNothing()
      .returning();

    if (!conn) {
      return NextResponse.json({ message: 'Connection already exists' }, { status: 409 });
    }

    return NextResponse.json(conn, { status: 201 });
  } catch {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
