# my dot.

## Blueprint v1.0

**A dot is a person. A constellation is friendship. The galaxy is everyone.**

-----

## 1. What This Is

A social identity primitive. Not a platform. Not a social network. Not a link-in-bio tool.

You create a card — your dot. It’s beautiful. It’s yours. It’s a file you own. You exist in a shared 3D galaxy with every other dot. Your friends are in your constellation. You can grab dots, fling them, scatter the galaxy, create vortexes. The galaxy is alive and interactive.

No feed. No algorithm. No posts. No likes. No follower counts. Just dots and connections.

**Core loop:** See galaxy → want to be in it → make a dot → share it → friends make dots → link to each other → constellations grow → galaxy grows.

-----

## 2. Architecture

```
mydot/
├── packages/
│   └── dot-core/              # Shared types, card generation, physics
│       ├── src/
│       │   ├── types.ts        # Dot, Connection, Galaxy types
│       │   ├── card.ts         # Card generation (HTML artifact)
│       │   ├── backdrop.ts     # Generative backdrop engine
│       │   ├── physics.ts      # Force-directed physics simulation
│       │   ├── colors.ts       # Color palette + utilities
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── apps/
│   ├── web/                    # mydot.space — the galaxy + builder
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx            # Galaxy homepage
│   │   │   │   ├── dot/[slug]/page.tsx # Individual dot page
│   │   │   │   └── api/
│   │   │   │       ├── dots/route.ts        # CRUD
│   │   │   │       ├── dots/[id]/route.ts   # Get/update dot
│   │   │   │       ├── connect/route.ts     # Friend linking
│   │   │   │       ├── spark/route.ts       # Anonymous sparks
│   │   │   │       ├── galaxy/route.ts      # Galaxy state
│   │   │   │       └── auth/route.ts        # Magic link
│   │   │   ├── components/
│   │   │   │   ├── Galaxy.tsx          # Three.js galaxy renderer
│   │   │   │   ├── DotParticles.tsx    # Particle system + shaders
│   │   │   │   ├── ConnectionLines.tsx # Friend connection lines
│   │   │   │   ├── PhysicsEngine.tsx   # Interactive physics
│   │   │   │   ├── CameraController.tsx # Orbit/zoom/fly-through
│   │   │   │   ├── DotTooltip.tsx      # Hover tooltip
│   │   │   │   ├── GrabHandler.tsx     # Click-drag dot interaction
│   │   │   │   ├── CardBuilder.tsx     # Creation modal
│   │   │   │   ├── CardPreview.tsx     # Card display after creation
│   │   │   │   ├── CardBackdrop.tsx    # Canvas generative backdrop
│   │   │   │   ├── MiniConstellation.tsx # Small constellation on card
│   │   │   │   ├── ColorPicker.tsx     # Color selection grid
│   │   │   │   ├── VibePicker.tsx      # Vibe selection pills
│   │   │   │   ├── ExportEngine.tsx    # HTML artifact generator
│   │   │   │   ├── AmbientSound.tsx    # Web Audio API drone
│   │   │   │   ├── SparkButton.tsx     # Anonymous reaction
│   │   │   │   ├── FriendLinker.tsx    # Add friend by URL/search
│   │   │   │   ├── ShareSheet.tsx      # Share card (copy link, download, QR)
│   │   │   │   └── ModeIndicator.tsx   # Shows current interaction mode
│   │   │   ├── hooks/
│   │   │   │   ├── useGalaxy.ts        # Galaxy data state
│   │   │   │   ├── usePhysics.ts       # Physics loop
│   │   │   │   ├── useCamera.ts        # Camera state
│   │   │   │   ├── useGrab.ts          # Grab/fling mechanics
│   │   │   │   ├── useRaycast.ts       # Mouse→3D raycasting
│   │   │   │   ├── useAudio.ts         # Sound toggle
│   │   │   │   └── useAuth.ts          # Auth state
│   │   │   ├── lib/
│   │   │   │   ├── api.ts              # API client
│   │   │   │   ├── shaders.ts          # GLSL vertex/fragment
│   │   │   │   └── utils.ts            # Helpers
│   │   │   └── styles/
│   │   │       └── globals.css
│   │   ├── public/
│   │   │   └── og.png                  # Open graph image
│   │   ├── next.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── api/                    # api.mydot.space — backend
│       ├── src/
│       │   ├── index.ts         # Entry point
│       │   ├── routes/
│       │   │   ├── dots.ts      # Dot CRUD
│       │   │   ├── connect.ts   # Friend linking
│       │   │   ├── sparks.ts    # Anonymous sparks
│       │   │   ├── galaxy.ts    # Galaxy state endpoint
│       │   │   ├── auth.ts      # Magic link auth
│       │   │   └── export.ts    # Server-side card image export
│       │   ├── models/
│       │   │   ├── dot.ts       # Dot model
│       │   │   ├── connection.ts # Connection model
│       │   │   └── spark.ts     # Spark model
│       │   ├── services/
│       │   │   ├── galaxy.ts    # Galaxy position calculation
│       │   │   ├── layout.ts    # Force-directed graph layout
│       │   │   ├── email.ts     # Magic link emails
│       │   │   └── image.ts     # Card → PNG export
│       │   ├── middleware/
│       │   │   ├── auth.ts      # JWT validation
│       │   │   └── rate-limit.ts
│       │   └── db/
│       │       ├── schema.ts    # Drizzle schema
│       │       └── migrate.ts
│       ├── package.json
│       └── tsconfig.json
│
├── .env.example
├── package.json                # Monorepo root (pnpm workspaces)
├── pnpm-workspace.yaml
├── turbo.json
├── CLAUDE.md
└── DOT_BLUEPRINT.md            # This file
```

-----

## 3. Data Models

### Dot

```typescript
interface Dot {
  id: string;              // nanoid, 12 chars
  slug: string;            // URL-safe name, unique (e.g. "kai", "kai-2")
  name: string;            // Display name, max 24 chars
  color: string;           // Hex color, from palette or custom
  line: string;            // One-liner, max 80 chars
  vibe: Vibe;              // 'serene'|'warm'|'electric'|'midnight'|'golden'|'arctic'
  link: string | null;     // Optional URL
  
  // Galaxy position (computed server-side)
  position: { x: number; y: number; z: number };
  
  // Metadata
  sparkCount: number;      // Total sparks (private to owner)
  createdAt: string;       // ISO timestamp
  updatedAt: string;
  
  // Auth
  ownerId: string;         // User who created this dot
}

type Vibe = 'serene' | 'warm' | 'electric' | 'midnight' | 'golden' | 'arctic';
```

### Connection

```typescript
interface Connection {
  id: string;
  fromDotId: string;       // Who linked
  toDotId: string;         // Who they linked to
  mutual: boolean;         // Both sides linked (computed)
  createdAt: string;
}
```

### Spark

```typescript
interface Spark {
  id: string;
  dotId: string;           // Which dot received the spark
  sessionHash: string;     // Hashed session ID (anonymous, for rate limiting)
  createdAt: string;
}
```

### User

```typescript
interface User {
  id: string;
  email: string;
  dotId: string | null;    // Their dot (one per user for v1)
  createdAt: string;
}
```

### Galaxy State (served to client)

```typescript
interface GalaxyState {
  dots: GalaxyDot[];
  connections: [number, number][]; // Index pairs
  updatedAt: string;
}

interface GalaxyDot {
  id: string;
  slug: string;
  name: string;
  color: string;
  line: string;
  vibe: Vibe;
  x: number;
  y: number;
  z: number;
}
```

-----

## 4. Database Schema (Drizzle + PostgreSQL)

```typescript
// dots
export const dots = pgTable('dots', {
  id: text('id').primaryKey(),                    // nanoid
  slug: text('slug').unique().notNull(),
  name: text('name').notNull(),
  color: text('color').notNull(),
  line: text('line').notNull().default(''),
  vibe: text('vibe').notNull().default('serene'),
  link: text('link'),
  posX: real('pos_x').notNull().default(0),
  posY: real('pos_y').notNull().default(0),
  posZ: real('pos_z').notNull().default(0),
  sparkCount: integer('spark_count').notNull().default(0),
  ownerId: text('owner_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// connections
export const connections = pgTable('connections', {
  id: text('id').primaryKey(),
  fromDotId: text('from_dot_id').notNull().references(() => dots.id),
  toDotId: text('to_dot_id').notNull().references(() => dots.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  unique: unique().on(t.fromDotId, t.toDotId),
}));

// sparks
export const sparks = pgTable('sparks', {
  id: text('id').primaryKey(),
  dotId: text('dot_id').notNull().references(() => dots.id),
  sessionHash: text('session_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// users
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique().notNull(),
  dotId: text('dot_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// magic_links
export const magicLinks = pgTable('magic_links', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  token: text('token').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
});

// Indexes
// dots: slug, owner_id, created_at
// connections: from_dot_id, to_dot_id
// sparks: dot_id, session_hash
// users: email
// magic_links: token, email
```

-----

## 5. API Routes

### Dots

|Method|Endpoint       |Auth    |Description    |
|------|---------------|--------|---------------|
|POST  |/api/dots      |Required|Create dot     |
|GET   |/api/dots/:slug|Public  |Get dot by slug|
|PATCH |/api/dots/:id  |Owner   |Update dot     |
|DELETE|/api/dots/:id  |Owner   |Delete dot     |

### Connections

|Method|Endpoint             |Auth    |Description            |
|------|---------------------|--------|-----------------------|
|POST  |/api/connect         |Required|Link to a dot (by slug)|
|DELETE|/api/connect/:id     |Owner   |Remove connection      |
|GET   |/api/dots/:id/friends|Public  |Get dot’s connections  |

### Sparks

|Method|Endpoint  |Auth  |Description         |
|------|----------|------|--------------------|
|POST  |/api/spark|Public|Send anonymous spark|

Rate limit: 1 spark per session per dot per 24h.

### Galaxy

|Method|Endpoint   |Auth  |Description               |
|------|-----------|------|--------------------------|
|GET   |/api/galaxy|Public|Full galaxy state (cached)|

Returns all dot positions + connection pairs. Cached in Redis, rebuilt every 5 minutes or on significant change (10+ new dots). Response is gzipped JSON.

### Auth

|Method|Endpoint        |Auth    |Description            |
|------|----------------|--------|-----------------------|
|POST  |/api/auth/magic |Public  |Send magic link email  |
|GET   |/api/auth/verify|Public  |Verify magic link token|
|POST  |/api/auth/logout|Required|Clear session          |

### Export

|Method|Endpoint             |Auth  |Description            |
|------|---------------------|------|-----------------------|
|GET   |/api/dots/:slug/card |Public|Download HTML artifact |
|GET   |/api/dots/:slug/image|Public|Download PNG card image|

-----

## 6. Galaxy Renderer (Three.js)

### Particle System

Each dot is a point in a Three.js Points geometry. Custom GLSL shaders render:

- **Core:** bright white center (smoothstep 0→0.12)
- **Glow:** colored aura using dot’s color (smoothstep 0→0.5)
- **Ring:** subtle colored ring at 0.3-0.45 radius (0.15 opacity)

Blending: THREE.AdditiveBlending. No depth write. Transparent.

Point size: `size * (300.0 / -mv.z)`, clamped 2→60. Base size 2.8 ± 1.8 random per dot. Pulse: `2.8 + sin(t * 0.7 + i * 1.1) * 0.5`. Grabbed dot: size 5.0.

### Background

4000 tiny particles at random positions in 800³ cube. Color: #222233. Size: 0.25.

### Connection Lines

THREE.LineSegments with vertex colors (gradient from dot A’s color to dot B’s color). Opacity: 0.06. Updated every frame from dot positions.

### Camera

- PerspectiveCamera, FOV 55
- Default position: (0, 0, 180)
- Smooth interpolation: `camRot += (tgtRot - camRot) * 0.06`
- Auto-rotate: +0.0006 rad/frame to Y rotation
- Zoom range: 25 (close) to 350 (far)
- Rotation clamp: X axis ±1.4 rad

### Raycasting

THREE.Raycaster with Points threshold 3. On hover: show tooltip. On click: show card. On mousedown+drag: grab dot.

-----

## 7. Physics Engine

All physics runs client-side at 60fps. Server provides home positions. Client simulates in real-time.

### Per-Dot Forces

```
1. SPRING (snap-back to home)
   force = (home - position) * 0.008
   
2. FRIEND PULL (friends attract each other)
   if distance > 20:
     force = direction * 0.001
     
3. DAMPING (velocity decay)
   velocity *= 0.94 per frame

4. GRAVITY POINT (vortex mode)
   force = direction * 0.15 / (1 + distance * 0.01)
   swirl: perpendicular force * 0.3

5. SCATTER (explosion)
   force = outward * 3.0 (decays: *= 0.8 per frame)
```

### Grab Mechanics

When a dot is grabbed:

- Position tracks cursor (projected from screen to 3D plane at dot’s Z depth)
- Friends receive pull force: `direction * 0.3`
- On release: velocity = `(position - home) * -0.05` (fling)
- Grabbed dot: physics frozen, size increased to 5.0

### Interaction Modes

|Input              |Action                                     |
|-------------------|-------------------------------------------|
|Drag empty space   |Orbit camera                               |
|Scroll / pinch     |Zoom in/out                                |
|Click dot          |Show card preview                          |
|Click + hold dot   |Grab — drag dot, friends follow elastically|
|Release grabbed dot|Fling — dot slings back with momentum      |
|Double-click space |Vortex — all dots swirl to click point     |
|Double-click again |Release vortex                             |
|Spacebar           |Scatter — all dots explode outward, reform |
|Double-tap (mobile)|Scatter                                    |
|R key              |Reset galaxy to default state              |
|ESC                |Close modals, cancel vortex                |

-----

## 8. Card Builder (Creation Flow)

### Steps

1. User clicks “make yours”
1. Modal opens with fields:
- **Name** — text input, max 24 chars, placeholder “just a name”
- **Color** — grid of 20 color dots, click to select
- **Line** — text input, max 80 chars, placeholder “a mood, a thought, anything”
- **Vibe** — pill selector: serene, warm, electric, midnight, golden, arctic
- **Link** — text input, optional, placeholder “your website, playlist, project”
1. “join the universe” button (colored with selected color)
1. Modal closes → card preview opens
1. New dot appears at galaxy center (0,0,0), drifts to home position
1. Dot count increments

### Card Preview

Shows the rendered card with:

- Generative backdrop (canvas)
- Name in Instrument Serif italic
- Line in DM Sans light
- Link (if provided)
- Vibe label
- “my dot.” brand mark
- Mini constellation (if dot has friends)

Actions:

- “save my dot” — downloads HTML artifact
- “back to galaxy” — closes preview, shows galaxy

-----

## 9. Generative Backdrop Engine

Each card backdrop is unique, deterministic, and generated from the dot’s name + color.

### Algorithm

```
1. Seed RNG from name: Σ(charCode * (index + 1))
2. LCG: seed = (seed * 16807) % 2147483647

3. Fill: #0a0a12 base

4. Main radial gradient:
   - Center: (w * (.2 + rng * .5), h * (.15 + rng * .35))
   - Inner: dot color at 18% opacity
   - Mid (.4): dot color at 5% opacity
   - Outer: transparent

5. Orbs (6x):
   - Random position
   - Random radius 30-130px
   - Radial gradient: dot color at 4-10% → transparent

6. Vibe-specific texture:
   - electric/midnight: faint horizontal grid lines (3% opacity)
   - warm/golden: slightly warmer base tint
   - arctic: slightly cooler, blue-shifted noise

7. Film grain:
   - Per-pixel noise: (random - 0.5) * 14, added to R/G/B
```

Same seed = same backdrop. Deterministic. Works identically in browser and in exported artifact.

-----

## 10. Card Artifact (Export)

Self-contained HTML file. Zero external dependencies except Google Fonts (graceful fallback).

### Structure

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>{name} — my dot.</title>
  <style>/* embedded styles */</style>
</head>
<body>
  <div class="card">
    <canvas id="bg"></canvas>
    <div class="inner">
      <div class="name">{name}</div>
      <div class="line">{line}</div>
      <a class="link" href="{link}">{link}</a>
      <div class="footer">
        <div class="vibe">{vibe}</div>
        <div class="brand">my dot.</div>
      </div>
    </div>
  </div>
  <script>/* backdrop generator — identical to server-side */</script>
</body>
</html>
```

### Properties

- Opens in any browser, any device, offline
- Renders identically everywhere
- Mobile-first: full-bleed on phone screens
- Contains no tracking, no analytics, no external requests (except font CDN)
- Print stylesheet included
- File size: ~4KB
- Download filename: `{name}.dot.html`

-----

## 11. Sparks

Anonymous reactions. Not likes. Not public.

### How It Works

- Visit any card
- Click the spark button (small icon, subtle)
- A spark registers anonymously
- Owner’s card gains shimmer (CSS animation intensity scales with recent spark count)
- Owner sees total spark count on their card (private, no one else sees)
- Shimmer fades over 48 hours without new sparks

### Rate Limiting

- 1 spark per session per dot per 24 hours
- Session identified by hashed fingerprint (no cookies, no login required)
- No way to see who sparked

-----

## 12. Friend Linking

### Flow

1. Visit someone’s dot page (mydot.space/kai)
1. Click “add to constellation”
1. Must be logged in (redirect to magic link if not)
1. Connection created: your dot → their dot
1. Their dot appears in your constellation
1. If they also link to you → mutual connection (both dots visible in each other’s constellations)

### One-directional vs Mutual

- One-directional: you see them in your constellation, they don’t see you
- Mutual: both constellations show each other
- Mutual connections have slightly brighter lines in the galaxy view
- No notification on link. No friend request. No accept/reject

### Constellation

Each dot’s page shows a mini constellation: their friends as small dots in their colors, positioned around them. Click any dot to visit that person’s page. The constellation is rendered as a small canvas or SVG on the card.

-----

## 13. Individual Dot Pages

Route: `mydot.space/{slug}`

### Layout

Full-screen card rendering. Background matches the dot’s generative backdrop (full page, edge to edge). Card content centered.

### Elements

- Name (Instrument Serif, italic, large)
- Line
- Link
- Constellation (interactive — dots are clickable)
- Vibe label
- Card age (subtle indicator — “since feb 2026”)
- Spark button
- “add to my constellation” button (if logged in and not already connected)
- Share button (copy link, download card HTML, download card PNG)
- “my dot.” link back to galaxy

### SEO / Open Graph

```html
<meta property="og:title" content="{name} — my dot.">
<meta property="og:description" content="{line}">
<meta property="og:image" content="https://mydot.space/api/dots/{slug}/image">
<meta property="og:url" content="https://mydot.space/{slug}">
<meta name="twitter:card" content="summary_large_image">
```

Card image (PNG) generated server-side via Puppeteer or canvas. 1200×630 for OG, cropped to card proportions.

-----

## 14. Ambient Sound

Web Audio API. Opt-in (off by default).

### Composition

Three sine oscillators:

- 72 Hz (low drone, gain 0.4)
- 108 Hz (fifth above, gain 0.2)
- 144 Hz (octave, gain 0.2)

Master gain: 0.012 (barely audible). Linear ramp on/off over 1.5 seconds.

### Future Enhancement

- Oscillator frequencies shift based on zoom level
- Each dot has a faint tone when hovered (based on its color hue → frequency)
- Cluster proximity creates harmonic resonance
- Vibe-specific tonal character (warm = lower, electric = crystalline)

-----

## 15. Card Age + Seasonal Tint

### Age Patina

Cards age gracefully. The effect is purely visual, applied as a CSS filter or canvas overlay.

|Age        |Effect                                      |
|-----------|--------------------------------------------|
|< 1 week   |Crisp, clean, full brightness               |
|1-4 weeks  |Very slight warmth (+1% sepia)              |
|1-3 months |Subtle warmth (+2% sepia, -1% brightness)   |
|3-12 months|Gentle patina (+3% sepia, slight vignette)  |
|1+ year    |Warm vintage feel (+4% sepia, soft vignette)|

Not damage. History. Old cards look loved.

### Seasonal Tint

Based on current month, a barely-perceptible color shift applies to the backdrop:

|Season|Months |Tint                             |
|------|-------|---------------------------------|
|Winter|Dec-Feb|Slight blue shift (+2% cool)     |
|Spring|Mar-May|Slight green warmth (+2% warm)   |
|Summer|Jun-Aug|Golden warmth (+3% warm)         |
|Autumn|Sep-Nov|Amber tint (+2% warm, slight red)|

-----

## 16. Color Palette

20 colors. Curated for beauty on dark backgrounds with additive blending.

```typescript
const PALETTE = [
  '#ff6b6b', // coral
  '#ee5a24', // burnt orange
  '#f0932b', // amber
  '#f6e58d', // butter
  '#badc58', // lime
  '#6ab04c', // leaf
  '#00d2d3', // cyan
  '#54a0ff', // sky
  '#5f27cd', // indigo
  '#c44569', // rose
  '#ff9ff3', // pink
  '#feca57', // gold
  '#1dd1a1', // mint
  '#48dbfb', // ice
  '#ff6348', // tomato
  '#a29bfe', // lavender
  '#fd79a8', // flamingo
  '#00cec9', // teal
  '#e17055', // clay
  '#74b9ff', // periwinkle
];
```

Users can also enter a custom hex color (premium feature, v2).

-----

## 17. Vibe System

6 vibes. Each affects the generative backdrop and card aesthetic.

|Vibe    |Backdrop Character             |Dot Shape (future)|
|--------|-------------------------------|------------------|
|serene  |Soft, smooth gradients. Calm   |Perfect circle    |
|warm    |Warmer tones, gentle orbs      |Slightly soft edge|
|electric|Grid lines, sharper gradients  |Slight spike      |
|midnight|Deep, dark, subtle. Grid lines |Clean circle      |
|golden  |Warm amber undertone, rich orbs|Smooth glow       |
|arctic  |Cool blue-shifted noise, crisp |Crystalline edge  |

-----

## 18. The Handoff (Viral Mechanic)

When you share your card file (text, email, AirDrop):

1. Recipient opens the HTML file
1. They see your card, full screen
1. Small “made with my dot.” link at the bottom
1. Clicking it → mydot.space with your dot highlighted in the galaxy
1. “make yours” is prominent
1. If they create a dot, they’re automatically connected to you (your dot is their first constellation member)

The person who shared their card becomes the seed of the new person’s constellation. First star in their sky.

-----

## 19. Privacy Model

|Data           |Who can see it              |
|---------------|----------------------------|
|Name           |Everyone                    |
|Color          |Everyone                    |
|Line           |Everyone                    |
|Link           |Everyone                    |
|Vibe           |Everyone                    |
|Constellation  |Everyone (public by default)|
|Spark count    |Only the dot owner          |
|Email          |Nobody (used only for auth) |
|Who sparked you|Nobody (anonymous)          |

### Privacy Controls (v2)

- Make constellation private (only you see your friends)
- Hide from galaxy (your dot doesn’t appear in the global view)
- Disappear mode (temporarily remove your dot, keep data)

-----

## 20. Tech Stack

### Frontend

- **Next.js 15** (App Router)
- **TypeScript**
- **Three.js r128** (3D rendering)
- **Tailwind CSS** (utility styles)
- **Framer Motion** (UI transitions)

### Backend

- **Next.js API Routes** (v1, monolith)
- **Drizzle ORM** (type-safe SQL)
- **PostgreSQL** (Supabase)
- **Redis** (Upstash — galaxy cache, rate limiting)

### Auth

- **Magic link email** (no passwords, no OAuth complexity)
- **JWT sessions** (httpOnly cookies)
- **Resend** (transactional email)

### Infrastructure

- **Vercel** (hosting, edge functions)
- **Supabase** (PostgreSQL)
- **Upstash** (Redis)
- **Cloudflare** (DNS, CDN, R2 for card images)

### Domains

- `mydot.space` — galaxy + dot pages
- `api.mydot.space` — API (v2, if separating from Next.js)

-----

## 21. Line Count Estimate

|Component                   |Lines     |
|----------------------------|----------|
|Galaxy renderer             |~600      |
|Three.js setup              |~120      |
|Particle system + shader    |~100      |
|Connection lines            |~60       |
|Camera controller           |~80       |
|Raycasting + tooltip        |~80       |
|Grab/fling handler          |~100      |
|Mode system (scatter/vortex)|~60       |
|Physics engine              |~200      |
|Card builder                |~300      |
|Modal UI                    |~120      |
|Color picker                |~40       |
|Vibe picker                 |~40       |
|Preview                     |~100      |
|Card artifact generator     |~200      |
|Backdrop engine             |~150      |
|Individual dot page         |~250      |
|Full page layout            |~100      |
|Mini constellation          |~80       |
|Spark button                |~30       |
|Share sheet                 |~40       |
|API routes                  |~500      |
|Dots CRUD                   |~120      |
|Connections                 |~80       |
|Sparks                      |~50       |
|Galaxy state                |~80       |
|Auth (magic link)           |~100      |
|Export (HTML + PNG)         |~70       |
|Database schema + queries   |~200      |
|Hooks (7 hooks)             |~250      |
|Ambient sound               |~60       |
|Shared types + utils        |~100      |
|Styles (globals.css)        |~150      |
|Config (next, turbo, etc)   |~60       |
|                            |          |
|**TOTAL**                   |**~3,020**|

-----

## 22. Build Order

|Phase|Weeks|Deliverable                                  |
|-----|-----|---------------------------------------------|
|1    |1    |Galaxy renderer + physics + interactions     |
|     |     |Three.js setup, particles, grab/fling/scatter|
|     |     |Camera controls, raycasting, tooltips        |
|     |     |250 sample dots, runs locally                |
|     |     |Mobile touch support                         |
|2    |1    |Card system                                  |
|     |     |Card builder modal                           |
|     |     |Generative backdrop engine                   |
|     |     |Card preview                                 |
|     |     |HTML artifact export                         |
|     |     |PNG image export (server-side)               |
|3    |1    |Backend + auth                               |
|     |     |Database schema, Drizzle setup               |
|     |     |Dot CRUD API                                 |
|     |     |Magic link auth                              |
|     |     |Galaxy state endpoint (cached)               |
|     |     |Rate limiting                                |
|4    |0.5  |Social layer                                 |
|     |     |Friend linking (connect/disconnect)          |
|     |     |Constellation display                        |
|     |     |Sparks (anonymous reactions)                 |
|     |     |Mutual link detection                        |
|5    |0.5  |Dot pages + sharing                          |
|     |     |Individual dot pages (/slug)                 |
|     |     |OG image generation                          |
|     |     |Share sheet (copy link, download, QR)        |
|     |     |The handoff (share → recipient makes dot)    |
|6    |0.5  |Polish + deploy                              |
|     |     |Card age patina                              |
|     |     |Seasonal tint                                |
|     |     |Ambient sound refinement                     |
|     |     |Performance optimization (galaxy > 1000 dots)|
|     |     |Mobile testing                               |
|     |     |Deploy to Vercel + Supabase                  |

**Total: 4.5 weeks**

-----

## 23. Performance Targets

|Metric                     |Target          |
|---------------------------|----------------|
|Galaxy FPS (250 dots)      |60fps           |
|Galaxy FPS (1000 dots)     |60fps           |
|Galaxy FPS (5000 dots)     |45fps+          |
|Galaxy FPS (10000 dots)    |30fps+          |
|Galaxy load (API → render) |< 1s            |
|Card builder open          |< 100ms         |
|Card export (HTML download)|< 200ms         |
|Dot page load              |< 500ms         |
|API response (dots CRUD)   |< 100ms         |
|Galaxy state response      |< 200ms (cached)|
|Lighthouse mobile score    |> 90            |

### Scaling Strategy

At 1000+ dots, switch from individual point rendering to instanced mesh or LOD (level of detail) — distant dots become smaller, fewer shader calculations. Connection lines only render within camera frustum.

At 10000+ dots, server pre-computes cluster centroids. Client renders clusters as single larger dots when zoomed out, expanding to individual dots on zoom in.

-----

## 24. Pricing (v2)

|Tier|Price|Features                                                                                    |
|----|-----|--------------------------------------------------------------------------------------------|
|Free|$0   |1 dot, 5 connections, basic vibes                                                           |
|Plus|$3/mo|Unlimited connections, custom color, analytics, custom domain                               |
|Pro |$7/mo|Multiple dots, private constellation, priority placement in galaxy, no “made with” on export|

No ads. Ever.

-----

## 25. Launch Strategy

1. Build it
1. Create 50 real dots (friends, people in the community)
1. Galaxy starts with 50 real people, not fake data
1. Record a 15-second screen capture of the galaxy (looks stunning)
1. Post on Twitter/X: just the video, caption: “my dot.” and a link
1. The video does the marketing. People see a galaxy, see names, want in
1. First 1000 dots within the first week set the culture

-----

## 26. Critical Rules

- Always lowercase “my dot.” — two words, period at the end
- Dots are people, not profiles
- Constellations are friendships, not follower lists
- No public metrics anywhere. No counts visible to anyone but the owner
- The galaxy is the homepage, not a feature page with a CTA
- Cards must be exportable. Ownable. The file IS the product
- Physics must feel alive. Every interaction has a response
- Beauty is non-negotiable. Every screen, every state, every transition must be beautiful
- Mobile is primary. Most sharing happens on phones
- No feeds. No timelines. No content. People, not posts

-----

## Quick Reference

### Installation (development)

```bash
git clone https://github.com/mydot-space/mydot.git
cd mydot
pnpm install
cp .env.example .env.local
pnpm dev
```

### Environment Variables

```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
RESEND_API_KEY=re_...
JWT_SECRET=...
NEXT_PUBLIC_URL=https://mydot.space
```

-----

**my dot.**

*A dot is a person. A constellation is friendship. The galaxy is everyone.*

*v1.0.0 | February 2026*
