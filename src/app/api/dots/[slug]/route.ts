import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { dots, connections, users } from '@/db/schema';
import { getAuthUser } from '@/middleware/auth';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;

    const [dot] = await db
      .select()
      .from(dots)
      .where(eq(dots.slug, slug))
      .limit(1);

    if (!dot) {
      return NextResponse.json({ message: 'Dot not found' }, { status: 404 });
    }

    // get friends
    const friendsFrom = await db
      .select()
      .from(connections)
      .where(eq(connections.fromDotId, dot.id));

    const friendsTo = await db
      .select()
      .from(connections)
      .where(eq(connections.toDotId, dot.id));

    return NextResponse.json({
      ...dot,
      connections: { from: friendsFrom, to: friendsTo },
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

    const [dot] = await db
      .select()
      .from(dots)
      .where(eq(dots.slug, slug))
      .limit(1);

    if (!dot) {
      return NextResponse.json({ message: 'Dot not found' }, { status: 404 });
    }

    if (dot.ownerId !== userId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) updates.name = String(body.name).trim().slice(0, 24);
    if (body.line !== undefined) updates.line = String(body.line).trim().slice(0, 80);
    if (body.vibe !== undefined) updates.vibe = body.vibe;
    if (body.link !== undefined) updates.link = body.link?.trim() || null;
    if (body.color !== undefined) updates.color = body.color;

    updates.updatedAt = new Date();

    const [updated] = await db
      .update(dots)
      .set(updates)
      .where(eq(dots.id, dot.id))
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

    const [dot] = await db
      .select()
      .from(dots)
      .where(eq(dots.slug, slug))
      .limit(1);

    if (!dot) {
      return NextResponse.json({ message: 'Dot not found' }, { status: 404 });
    }

    if (dot.ownerId !== userId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // delete dot (connections/sparks cascade)
    await db.delete(dots).where(eq(dots.id, dot.id));

    // update user
    await db
      .update(users)
      .set({ dotId: null })
      .where(eq(users.id, userId));

    return NextResponse.json({ message: 'Dot deleted' });
  } catch {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
