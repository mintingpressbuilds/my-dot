import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { connections, dots, users } from '@/db/schema';
import { getAuthUser } from '@/middleware/auth';

export async function POST(req: Request) {
  try {
    const userId = await getAuthUser();
    if (!userId) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }

    // get user's dot
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user?.dotId) {
      return NextResponse.json({ message: 'You need a dot first' }, { status: 400 });
    }

    const { targetSlug } = await req.json();
    if (!targetSlug) {
      return NextResponse.json({ message: 'targetSlug required' }, { status: 400 });
    }

    // find target dot
    const [targetDot] = await db
      .select()
      .from(dots)
      .where(eq(dots.slug, targetSlug))
      .limit(1);

    if (!targetDot) {
      return NextResponse.json({ message: 'Target dot not found' }, { status: 404 });
    }

    // prevent self-connection
    if (targetDot.id === user.dotId) {
      return NextResponse.json({ message: 'Cannot connect to yourself' }, { status: 400 });
    }

    // prevent duplicate
    const [existing] = await db
      .select()
      .from(connections)
      .where(
        and(
          eq(connections.fromDotId, user.dotId),
          eq(connections.toDotId, targetDot.id),
        ),
      )
      .limit(1);

    if (existing) {
      return NextResponse.json({ message: 'Already connected' }, { status: 409 });
    }

    const [connection] = await db
      .insert(connections)
      .values({
        id: nanoid(12),
        fromDotId: user.dotId,
        toDotId: targetDot.id,
      })
      .returning();

    return NextResponse.json(connection, { status: 201 });
  } catch {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const userId = await getAuthUser();
    if (!userId) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }

    const { connectionId } = await req.json();
    if (!connectionId) {
      return NextResponse.json({ message: 'connectionId required' }, { status: 400 });
    }

    // get user's dot
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user?.dotId) {
      return NextResponse.json({ message: 'You need a dot first' }, { status: 400 });
    }

    // verify ownership (connection must be from user's dot)
    const [connection] = await db
      .select()
      .from(connections)
      .where(eq(connections.id, connectionId))
      .limit(1);

    if (!connection) {
      return NextResponse.json({ message: 'Connection not found' }, { status: 404 });
    }

    if (connection.fromDotId !== user.dotId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    await db.delete(connections).where(eq(connections.id, connectionId));

    return NextResponse.json({ message: 'Connection removed' });
  } catch {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
