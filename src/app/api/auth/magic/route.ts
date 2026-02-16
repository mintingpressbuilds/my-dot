import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { Resend } from 'resend';
import { db } from '@/db';
import { magicLinks } from '@/db/schema';
import { createRateLimiter, checkRateLimit } from '@/middleware/rate-limit';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const rateLimiter = createRateLimiter('magic-link', 3, '1 h');

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ message: 'Valid email required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // rate limit
    const rateResult = await checkRateLimit(rateLimiter, normalizedEmail);
    if (!rateResult.success) {
      return NextResponse.json({ message: 'Too many requests. Try again later.' }, { status: 429 });
    }

    // create magic link token
    const token = nanoid(32);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await db.insert(magicLinks).values({
      id: nanoid(12),
      email: normalizedEmail,
      token,
      expiresAt,
    });

    // send email
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
    const verifyUrl = `${baseUrl}/api/auth/verify?token=${token}`;

    if (resend) {
      await resend.emails.send({
        from: 'my dot. <noreply@mydot.space>',
        to: normalizedEmail,
        subject: 'your magic link — my dot.',
        html: `
          <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 40px 20px;">
            <p style="color: #666; font-size: 14px;">click below to sign in to my dot.</p>
            <a href="${verifyUrl}" style="display: inline-block; padding: 12px 32px; background: #111; color: #fff; text-decoration: none; border-radius: 8px; font-size: 14px; margin: 20px 0;">sign in</a>
            <p style="color: #999; font-size: 11px; margin-top: 30px;">this link expires in 15 minutes. if you didn't request this, ignore this email.</p>
          </div>
        `,
      });
      return NextResponse.json({ message: 'Magic link sent' });
    }

    // No email provider configured — return verify URL for direct claim
    return NextResponse.json({ message: 'Magic link sent', verifyUrl });
  } catch {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
