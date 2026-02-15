# CLAUDE.md — my dot.

## What this is
my dot. is a social identity primitive. Not a platform. Not a social network.
You create a card — your dot. It's beautiful, it's yours, it's a file you own.
You exist in a shared 3D galaxy with every other dot.

## Core rules
- Always lowercase "my dot." with period
- Dots are people, not profiles
- No public metrics anywhere (no visible follower counts, spark counts, etc.)
- Cards must be exportable as self-contained HTML files
- The galaxy IS the homepage — not a marketing page with a CTA
- No feeds. No timelines. No content. People, not posts
- Mobile is primary

## Tech
- Next.js 15, TypeScript, Three.js r128, Tailwind CSS
- Drizzle ORM + PostgreSQL (Supabase)
- Upstash Redis
- Resend for magic link email
- DM Sans (body) + Instrument Serif (display) from Google Fonts

## Colors
20-color palette defined in src/lib/colors.ts. Never add more to the base palette.

## Physics constants
- Spring: 0.008
- Damping: 0.94
- Friend pull: 0.001 (when distance > 20)
- Gravity (vortex): 0.15 / (1 + dist * 0.01), swirl factor 0.3
- Scatter force: 3.0, decay 0.8x/frame
- Grabbed dot size: 5.0
- Fling velocity: (pos - home) * -0.05

## Shader
- Core: smoothstep 0→0.12, white
- Glow: smoothstep 0→0.5, dot color
- Additive blending, no depth write
- Point size: size * (300 / -mv.z), clamp 2→60
- Base size: 2.8 ± 1.8

## Quality standard
Every test passes. Every page loads under 500ms. Galaxy runs at 60fps.
Mobile works flawlessly. No console errors. No layout shifts.
