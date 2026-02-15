import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { dots, users } from '@/db/schema';
import { getAuthUser } from '@/middleware/auth';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'dot';
}

export async function POST(req: Request) {
  try {
    const userId = await getAuthUser();
    if (!userId) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }

    // check if user already has a dot
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    if (user.dotId) {
      return NextResponse.json({ message: 'You already have a dot' }, { status: 409 });
    }

    const body = await req.json();
    const { name, color, line, vibe, link, theme } = body;

    if (!name || typeof name !== 'string' || name.length > 24) {
      return NextResponse.json({ message: 'Name required (max 24 chars)' }, { status: 400 });
    }
    if (!color || typeof color !== 'string') {
      return NextResponse.json({ message: 'Color required' }, { status: 400 });
    }

    // generate unique slug
    let baseSlug = slugify(name);
    let slug = baseSlug;
    let suffix = 2;
    while (true) {
      const [existing] = await db
        .select({ id: dots.id })
        .from(dots)
        .where(eq(dots.slug, slug))
        .limit(1);
      if (!existing) break;
      slug = `${baseSlug}-${suffix}`;
      suffix++;
    }

    // random position in sphere
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 20 + Math.random() * 80;
    const posX = r * Math.sin(phi) * Math.cos(theta);
    const posY = r * Math.sin(phi) * Math.sin(theta);
    const posZ = r * Math.cos(phi);

    const dotId = nanoid(12);

    const [dot] = await db
      .insert(dots)
      .values({
        id: dotId,
        slug,
        name: name.trim().slice(0, 24),
        color,
        line: (line || '').trim().slice(0, 80),
        vibe: vibe || 'serene',
        theme: theme || 'default',
        link: link?.trim() || null,
        posX,
        posY,
        posZ,
        ownerId: userId,
      })
      .returning();

    // update user with dotId
    await db
      .update(users)
      .set({ dotId })
      .where(eq(users.id, userId));

    return NextResponse.json(dot, { status: 201 });
  } catch {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const allDots = await db.select().from(dots);
    return NextResponse.json(allDots);
  } catch {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
