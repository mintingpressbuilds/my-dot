import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { eq, and, isNull, gt } from 'drizzle-orm';
import { db } from '@/db';
import { magicLinks, users } from '@/db/schema';
import { signJwt } from '@/middleware/auth';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return NextResponse.json({ message: 'Token required' }, { status: 400 });
    }

    // find valid, unused, non-expired magic link
    const [link] = await db
      .select()
      .from(magicLinks)
      .where(
        and(
          eq(magicLinks.token, token),
          isNull(magicLinks.usedAt),
          gt(magicLinks.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!link) {
      return NextResponse.json({ message: 'Invalid or expired link' }, { status: 400 });
    }

    // mark as used
    await db
      .update(magicLinks)
      .set({ usedAt: new Date() })
      .where(eq(magicLinks.id, link.id));

    // find or create user
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, link.email))
      .limit(1);

    if (!user) {
      const userId = nanoid(12);
      [user] = await db
        .insert(users)
        .values({
          id: userId,
          email: link.email,
        })
        .returning();
    }

    // generate JWT and set cookie
    const jwt = signJwt(user.id);
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';

    const response = NextResponse.redirect(baseUrl);
    response.cookies.set('auth_token', jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24h
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
