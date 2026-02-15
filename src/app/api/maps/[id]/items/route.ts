import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { maps, mapItems } from '@/db/schema';
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
    const { name, color, line, link } = body;

    if (!name || typeof name !== 'string' || name.length > 40) {
      return NextResponse.json({ message: 'Name required (max 40 chars)' }, { status: 400 });
    }
    if (!color || typeof color !== 'string') {
      return NextResponse.json({ message: 'Color required' }, { status: 400 });
    }

    // Random position in a small sphere
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 10 + Math.random() * 30;

    const [item] = await db
      .insert(mapItems)
      .values({
        id: nanoid(12),
        mapId,
        name: name.trim().slice(0, 40),
        color,
        line: line?.trim().slice(0, 80) || null,
        link: link?.trim() || null,
        posX: r * Math.sin(phi) * Math.cos(theta),
        posY: r * Math.sin(phi) * Math.sin(theta),
        posZ: r * Math.cos(phi),
      })
      .returning();

    return NextResponse.json(item, { status: 201 });
  } catch {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
