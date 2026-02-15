import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { dots, users } from '@/db/schema';
import { getAuthUser } from '@/middleware/auth';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    // Requires JWT (authenticated user)
    const userId = await getAuthUser();
    if (!userId) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }

    // Requires dot_session cookie
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('dot_session')?.value;
    if (!sessionToken) {
      return NextResponse.json({ message: 'No unclaimed dot found' }, { status: 400 });
    }

    // Find unclaimed dot by sessionToken
    const [dot] = await db
      .select()
      .from(dots)
      .where(eq(dots.sessionToken, sessionToken))
      .limit(1);

    if (!dot) {
      return NextResponse.json({ message: 'No dot found for this session' }, { status: 404 });
    }

    if (dot.ownerId) {
      return NextResponse.json({ message: 'This dot is already claimed' }, { status: 409 });
    }

    // Check user doesn't already have a dot
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user?.dotId) {
      return NextResponse.json({ message: 'You already have a dot' }, { status: 409 });
    }

    // Claim: set ownerId, clear sessionToken
    await db
      .update(dots)
      .set({
        ownerId: userId,
        sessionToken: null,
        updatedAt: new Date(),
      })
      .where(eq(dots.id, dot.id));

    // Update user with dotId
    await db
      .update(users)
      .set({ dotId: dot.id })
      .where(eq(users.id, userId));

    // Clear the session cookie
    const response = NextResponse.json({
      message: 'Dot claimed successfully',
      dot: { ...dot, ownerId: userId, sessionToken: null },
    });
    response.cookies.set('dot_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
