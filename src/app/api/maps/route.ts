import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { maps } from '@/db/schema';
import { getAuthUser } from '@/middleware/auth';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'map';
}

const VALID_TYPES = ['people', 'places', 'music', 'ideas', 'custom'];
const VALID_VISIBILITY = ['public', 'private', 'unlisted'];

export async function POST(req: Request) {
  try {
    const userId = await getAuthUser();
    if (!userId) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, color, type, visibility } = body;

    if (!name || typeof name !== 'string' || name.length > 40) {
      return NextResponse.json({ message: 'Name required (max 40 chars)' }, { status: 400 });
    }
    if (!color || typeof color !== 'string') {
      return NextResponse.json({ message: 'Color required' }, { status: 400 });
    }

    const mapType = VALID_TYPES.includes(type) ? type : 'custom';
    const mapVisibility = VALID_VISIBILITY.includes(visibility) ? visibility : 'public';

    // generate unique slug
    let baseSlug = slugify(name);
    let slug = baseSlug;
    let suffix = 2;
    while (true) {
      const [existing] = await db
        .select({ id: maps.id })
        .from(maps)
        .where(eq(maps.slug, slug))
        .limit(1);
      if (!existing) break;
      slug = `${baseSlug}-${suffix}`;
      suffix++;
    }

    const [map] = await db
      .insert(maps)
      .values({
        id: nanoid(12),
        slug,
        name: name.trim().slice(0, 40),
        description: description?.trim().slice(0, 120) || null,
        color,
        type: mapType,
        visibility: mapVisibility,
        ownerId: userId,
      })
      .returning();

    return NextResponse.json(map, { status: 201 });
  } catch {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
