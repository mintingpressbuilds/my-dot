import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users, dots } from '@/db/schema';
import { getAuthUser } from '@/middleware/auth';

export async function GET() {
  try {
    const userId = await getAuthUser();
    if (!userId) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    let dot = null;
    if (user.dotId) {
      const [d] = await db
        .select()
        .from(dots)
        .where(eq(dots.id, user.dotId))
        .limit(1);
      dot = d || null;
    }

    return NextResponse.json({
      user: { id: user.id, email: user.email, createdAt: user.createdAt },
      dot,
    });
  } catch {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
