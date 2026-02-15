import { ImageResponse } from 'next/og';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { dots } from '@/db/schema';

export const runtime = 'edge';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const [dot] = await db
    .select()
    .from(dots)
    .where(eq(dots.slug, slug))
    .limit(1);

  if (!dot) {
    return new Response('Not found', { status: 404 });
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: '#030305',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* color accent */}
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            left: '-100px',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${dot.color}30 0%, transparent 70%)`,
          }}
        />

        {/* name */}
        <div
          style={{
            fontSize: '72px',
            fontStyle: 'italic',
            color: '#ffffff',
            letterSpacing: '-1px',
            marginBottom: '16px',
            position: 'relative',
          }}
        >
          {dot.name}
        </div>

        {/* line */}
        {dot.line && (
          <div
            style={{
              fontSize: '24px',
              color: 'rgba(255,255,255,0.45)',
              fontWeight: 300,
              maxWidth: '600px',
              lineHeight: 1.6,
              position: 'relative',
            }}
          >
            {dot.line}
          </div>
        )}

        {/* brand */}
        <div
          style={{
            position: 'absolute',
            bottom: '60px',
            right: '80px',
            fontSize: '20px',
            fontStyle: 'italic',
            color: 'rgba(255,255,255,0.15)',
          }}
        >
          my dot.
        </div>

        {/* color bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: dot.color,
            opacity: 0.6,
          }}
        />
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
