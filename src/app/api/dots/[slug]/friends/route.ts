import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { dots, connections } from '@/db/schema';

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

    // outgoing connections (dot -> others)
    const outgoing = await db
      .select()
      .from(connections)
      .where(eq(connections.fromDotId, dot.id));

    // incoming connections (others -> dot)
    const incoming = await db
      .select()
      .from(connections)
      .where(eq(connections.toDotId, dot.id));

    // compute mutual flag
    const outgoingSet = new Set(outgoing.map((c) => c.toDotId));
    const incomingSet = new Set(incoming.map((c) => c.fromDotId));

    const friends = [
      ...outgoing.map((c) => ({
        ...c,
        direction: 'outgoing' as const,
        mutual: incomingSet.has(c.toDotId),
      })),
      ...incoming
        .filter((c) => !outgoingSet.has(c.fromDotId)) // avoid dupes
        .map((c) => ({
          ...c,
          direction: 'incoming' as const,
          mutual: false,
        })),
    ];

    // get friend dot details
    const friendDotIds = new Set([
      ...outgoing.map((c) => c.toDotId),
      ...incoming.map((c) => c.fromDotId),
    ]);

    const friendDots = [];
    for (const dotId of friendDotIds) {
      const [friendDot] = await db
        .select({ id: dots.id, slug: dots.slug, name: dots.name, color: dots.color })
        .from(dots)
        .where(eq(dots.id, dotId))
        .limit(1);
      if (friendDot) friendDots.push(friendDot);
    }

    return NextResponse.json({ friends, dots: friendDots });
  } catch {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
