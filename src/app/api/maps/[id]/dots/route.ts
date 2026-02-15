import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { maps, mapDots, dots } from '@/db/schema';
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
    const { dotId } = body;

    if (!dotId) {
      return NextResponse.json({ message: 'dotId required' }, { status: 400 });
    }

    // Verify dot exists
    const [dot] = await db
      .select({ id: dots.id })
      .from(dots)
      .where(eq(dots.id, dotId))
      .limit(1);

    if (!dot) {
      return NextResponse.json({ message: 'Dot not found' }, { status: 404 });
    }

    const [mapDot] = await db
      .insert(mapDots)
      .values({
        id: nanoid(12),
        mapId,
        dotId,
      })
      .onConflictDoNothing()
      .returning();

    if (!mapDot) {
      return NextResponse.json({ message: 'Dot already in map' }, { status: 409 });
    }

    return NextResponse.json(mapDot, { status: 201 });
  } catch {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
