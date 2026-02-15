import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { maps, mapDots, mapItems, mapConnections, dots } from '@/db/schema';
import { getAuthUser } from '@/middleware/auth';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;

    const [map] = await db
      .select()
      .from(maps)
      .where(eq(maps.slug, slug))
      .limit(1);

    if (!map) {
      return NextResponse.json({ message: 'Map not found' }, { status: 404 });
    }

    // Check visibility
    if (map.visibility === 'private') {
      const userId = await getAuthUser();
      if (userId !== map.ownerId) {
        return NextResponse.json({ message: 'Map not found' }, { status: 404 });
      }
    }

    // Get all dots in this map (join with dots table for full data)
    const mapDotRows = await db
      .select({
        addedAt: mapDots.addedAt,
        dot: dots,
      })
      .from(mapDots)
      .innerJoin(dots, eq(mapDots.dotId, dots.id))
      .where(eq(mapDots.mapId, map.id));

    // Get all items in this map
    const items = await db
      .select()
      .from(mapItems)
      .where(eq(mapItems.mapId, map.id));

    // Get all connections in this map
    const conns = await db
      .select()
      .from(mapConnections)
      .where(eq(mapConnections.mapId, map.id));

    return NextResponse.json({
      ...map,
      dots: mapDotRows.map(r => r.dot),
      items,
      connections: conns,
    });
  } catch {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const userId = await getAuthUser();
    if (!userId) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }

    const { slug } = await params;

    const [map] = await db
      .select()
      .from(maps)
      .where(eq(maps.slug, slug))
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
    if (body.description !== undefined) updates.description = body.description?.trim().slice(0, 120) || null;
    if (body.color !== undefined) updates.color = body.color;
    if (body.type !== undefined && ['people', 'places', 'music', 'ideas', 'custom'].includes(body.type)) {
      updates.type = body.type;
    }
    if (body.visibility !== undefined && ['public', 'private', 'unlisted'].includes(body.visibility)) {
      updates.visibility = body.visibility;
    }

    updates.updatedAt = new Date();

    const [updated] = await db
      .update(maps)
      .set(updates)
      .where(eq(maps.id, map.id))
      .returning();

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const userId = await getAuthUser();
    if (!userId) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }

    const { slug } = await params;

    const [map] = await db
      .select()
      .from(maps)
      .where(eq(maps.slug, slug))
      .limit(1);

    if (!map) {
      return NextResponse.json({ message: 'Map not found' }, { status: 404 });
    }
    if (map.ownerId !== userId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // Cascade deletes map_dots, map_items, map_connections
    await db.delete(maps).where(eq(maps.id, map.id));

    return NextResponse.json({ message: 'Map deleted' });
  } catch {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
