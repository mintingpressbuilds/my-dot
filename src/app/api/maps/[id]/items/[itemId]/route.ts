import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { maps, mapItems } from '@/db/schema';
import { getAuthUser } from '@/middleware/auth';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    const userId = await getAuthUser();
    if (!userId) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }

    const { id: mapId, itemId } = await params;

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
    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) updates.name = String(body.name).trim().slice(0, 40);
    if (body.color !== undefined) updates.color = body.color;
    if (body.line !== undefined) updates.line = body.line?.trim().slice(0, 80) || null;
    if (body.link !== undefined) updates.link = body.link?.trim() || null;
    if (body.posX !== undefined) updates.posX = Number(body.posX);
    if (body.posY !== undefined) updates.posY = Number(body.posY);
    if (body.posZ !== undefined) updates.posZ = Number(body.posZ);

    const [updated] = await db
      .update(mapItems)
      .set(updates)
      .where(and(eq(mapItems.id, itemId), eq(mapItems.mapId, mapId)))
      .returning();

    if (!updated) {
      return NextResponse.json({ message: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    const userId = await getAuthUser();
    if (!userId) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }

    const { id: mapId, itemId } = await params;

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
      .delete(mapItems)
      .where(and(eq(mapItems.id, itemId), eq(mapItems.mapId, mapId)));

    return NextResponse.json({ message: 'Item deleted' });
  } catch {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
