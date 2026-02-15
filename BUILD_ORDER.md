# my dot. — Build Order for Claude Code

Read CLAUDE.md and DOT_BLUEPRINT.md before starting any phase. Execute phases sequentially. Do not start Phase 2 until Phase 1 is fully complete and all acceptance criteria pass. One phase at a time.

-----

## Phase 1: Galaxy Renderer + Physics + Interactions

**Goal:** A 3D interactive galaxy of 250 sample dots running at 60fps in the browser. No backend. No auth. Pure frontend.

**Stack:** Next.js 15 (App Router), TypeScript, Three.js r128, Tailwind CSS

**Init:**

```bash
pnpm create next-app@latest mydot --typescript --tailwind --app --src-dir --no-eslint
cd mydot
pnpm add three@0.128.0 @types/three
```

**Build these files:**

1. `src/app/page.tsx` — Full-screen galaxy page. No layout chrome. Black background (#030305). Mounts the Galaxy component.
1. `src/components/Galaxy.tsx` — Main Three.js container. Creates scene, camera (PerspectiveCamera FOV 55), WebGL renderer. Mounts to a canvas element that fills the viewport. Handles resize. Runs the animation loop at 60fps.
1. `src/components/DotParticles.tsx` — Three.js Points geometry with custom GLSL shaders:
- Vertex shader: `attribute float size; gl_PointSize = size * (300.0 / -mv.z); clamp(2.0, 60.0);`
- Fragment shader: core (smoothstep 0→0.12, white), glow (smoothstep 0→0.5, dot color), additive blending
- 250 sample dots generated with random positions in a sphere (radius 20-100)
- Each dot has: id, name, color (from 20-color palette), line, vibe, position, velocity, home position
- Dots pulse gently: `size = 2.8 + sin(t * 0.7 + i * 1.1) * 0.5`
1. `src/components/ConnectionLines.tsx` — Three.js LineSegments. Each dot has 1-3 random friend connections. Lines use vertex colors (gradient from dot A color to dot B color). Opacity: 0.06. Updates every frame from dot positions.
1. `src/components/PhysicsEngine.tsx` — Runs every frame. Per-dot forces:
- Spring snap-back to home: `force = (home - pos) * 0.008`
- Friend pull (if distance > 20): `force = direction * 0.001`
- Damping: `velocity *= 0.94`
- Gravity point (vortex): `force = direction * 0.15 / (1 + dist * 0.01)` plus perpendicular swirl `* 0.3`
- Scatter: `force = outward * 3.0`, decays `*= 0.8` per frame
1. `src/components/CameraController.tsx` — Smooth orbit camera:
- Mouse drag: rotate (sensitivity 0.003)
- Scroll: zoom (range 25-350, default 180)
- Auto-rotate: +0.0006 rad/frame on Y axis (stops on first drag)
- Touch: one finger drag = rotate, two finger pinch = zoom
- Smooth interpolation: `camRot += (targetRot - camRot) * 0.06`
- Camera always looks at origin
1. `src/components/GrabHandler.tsx` — Click-and-drag dots:
- Mousedown on dot: grab it (physics frozen for that dot, size grows to 5.0)
- Mousemove while grabbed: project screen coords to 3D plane at dot's Z depth, move dot there
- Friends of grabbed dot get pulled: `force = direction * 0.3`
- Mouseup: release with fling velocity `= (pos - home) * -0.05`
- Touch: same behavior with touch events
1. `src/components/DotTooltip.tsx` — Fixed-position div. On hover (raycaster threshold 3): show dot name, line, and color indicator. Position follows cursor with 18px/10px offset. Hides when not hovering.
1. `src/hooks/usePhysics.ts` — Physics state management. Stores all dot data (positions, velocities, grabbed state). Exposes: scatter(), setGravityPoint(), resetAll(), grabDot(), moveDot(), releaseDot().
1. `src/hooks/useCamera.ts` — Camera state. Stores rotation, zoom, autoRotate flag. Exposes: startDrag(), updateDrag(), endDrag(), setZoom(), reset().
1. `src/hooks/useRaycast.ts` — Raycaster hook. Returns hovered dot index. Uses Three.js Raycaster with Points threshold 3.
1. `src/lib/data.ts` — Sample data generator. 250 dots with names from a 100-name pool, random colors from 20-color palette, random lines from 22-phrase pool, random vibes from 6-vibe list. 1-3 random friend connections per dot.
1. `src/lib/shaders.ts` — GLSL shader source strings for dot vertex and fragment shaders.
1. `src/lib/colors.ts` — Color palette (20 hex values), vibe list, rgba() helper.

**Background stars:** 4000 tiny points at random positions in 800³ cube. Color: #222233. Size: 0.25. No interaction.

**Keyboard shortcuts:**

- Spacebar: scatter (all dots explode outward, reform)
- R: reset galaxy to default state
- Escape: cancel vortex

**Double-click empty space:** all dots swirl toward click point (vortex). Double-click again to release.

**Double-tap (mobile):** scatter.

**UI elements (minimal, positioned with Tailwind):**

- Logo: "my dot." — top left, Instrument Serif italic, 22px, opacity 0.6. Click = reset.
- Dot count: "250 dots" — top right, 10px, letter-spacing 2px. Count animates up on load.
- Hint text: "drag to orbit · scroll to zoom · click a dot · spacebar to scatter" — bottom center, 11px, fades in after 2.5s at 40% opacity.

**Fonts:** DM Sans (body), Instrument Serif (logo/headings). Import from Google Fonts.

**Acceptance criteria:**

- [ ] `pnpm dev` starts without errors
- [ ] Galaxy renders with 250 colored dots in 3D
- [ ] Dots pulse gently
- [ ] Connection lines visible between friends
- [ ] Camera orbits with mouse drag
- [ ] Scroll zooms in/out
- [ ] Auto-rotate works on load
- [ ] Hovering a dot shows tooltip with name + line
- [ ] Clicking and dragging a dot grabs it, friends follow
- [ ] Releasing a grabbed dot flings it back with momentum
- [ ] Spacebar scatters all dots, they reform
- [ ] Double-click creates vortex, double-click releases
- [ ] R key resets galaxy
- [ ] Touch drag/pinch works on mobile
- [ ] Double-tap scatters on mobile
- [ ] 60fps on desktop, 30fps+ on mobile
- [ ] No console errors
- [ ] Logo, count, hint text visible and positioned correctly

-----

## Phase 2: Card System (Builder + Preview + Export)

**Goal:** Users can create a dot, see their card, and export it as a self-contained HTML file.

**Build these files:**

1. `src/components/CardBuilder.tsx` — Modal overlay (backdrop-filter blur 40px, 88% black opacity). Contains:
- Title: "make your dot." in Instrument Serif italic
- Subtitle: "join the universe"
- Name input (max 24 chars)
- Color picker: 20 dots in a flex grid, click to select, selected has white border
- Line input (max 80 chars)
- Vibe picker: 6 pills (serene, warm, electric, midnight, golden, arctic), click to select
- Link input (optional)
- "join the universe" button (colored with selected color)
- Close button (×) top right
- Click outside modal = close
- Escape = close
1. `src/components/CardPreview.tsx` — Full-screen overlay showing the rendered card:
- Card frame: 380px wide (88vw on mobile), border-radius 24px, box-shadow
- Generative backdrop (canvas)
- Name in Instrument Serif italic, 38px
- Line in DM Sans 300 weight, 14px, 45% white opacity
- Link (if provided) as clickable text, 11px
- Footer: vibe label left, "my dot." brand right, separated by 1px border-top
- Action buttons below card: "save my dot" (colored) + "back to galaxy" (ghost)
- Animate in with scale 0.92→1.0 + translateY
1. `src/components/CardBackdrop.tsx` — Canvas-based generative backdrop:
- Seed RNG from name: `Σ(charCode * (index + 1))`, LCG: `seed = (seed * 16807) % 2147483647`
- Fill: #0a0a12
- Main radial gradient at seeded position, dot color at 18%→5%→transparent
- 6 random orbs: radial gradient, dot color at 4-10%→transparent
- Film grain: per-pixel `(random - 0.5) * 14` added to RGB
- Canvas: 760×1000 (2x retina), displayed at 380×500
- Deterministic: same name = same backdrop every time
1. `src/components/ExportEngine.tsx` — Generates self-contained HTML file:
- Complete HTML document with embedded CSS and JS
- Google Fonts import (DM Sans + Instrument Serif)
- Identical backdrop generation code (no external dependencies)
- Includes name, line, link, vibe
- "made with my dot." link at bottom
- Downloads as `{name}.dot.html`
- File size: ~4KB
- Must open correctly in any browser offline
- **CRITICAL:** Build the HTML as string concatenation or array.join(), NOT template literals. Escape all `</script>` as `<\/script>`. Use `var` instead of `const/let` and `function(){}` instead of arrow functions in the exported script for maximum compatibility.
1. `src/components/ColorPicker.tsx` — Grid of 20 color dots. Click selects. Selected dot has white border + scale 1.15.
1. `src/components/VibePicker.tsx` — Row of 6 pills. Click selects. Selected pill has white border + different background.

**Flow:**

1. "make yours" button at bottom center of galaxy page
1. Click → builder modal opens
1. Fill in fields → click "join the universe"
1. Modal closes → card preview opens
1. New dot spawns at galaxy center (0,0,0), physics spring pulls it to random home position
1. New dot gets 2-3 random friend connections to existing dots
1. Galaxy geometry rebuilt with new dot
1. Dot count increments
1. From preview: "save my dot" downloads HTML artifact, "back to galaxy" closes preview

**Acceptance criteria:**

- [ ] "make yours" button visible on galaxy page
- [ ] Builder modal opens/closes correctly (button, ×, click outside, escape)
- [ ] All 20 colors selectable, visual feedback on selection
- [ ] All 6 vibes selectable, visual feedback on selection
- [ ] Creating a dot with name + color + line + vibe works
- [ ] Card preview shows correct name, line, vibe, link
- [ ] Generative backdrop is unique per name and deterministic
- [ ] "save my dot" downloads a .dot.html file
- [ ] Downloaded file opens in Chrome, Firefox, Safari with correct rendering
- [ ] Downloaded file works offline (no CDN dependencies except font — graceful fallback)
- [ ] New dot appears in galaxy after creation
- [ ] New dot springs from center to home position
- [ ] Dot count updates after creation
- [ ] Mobile layout works for builder and preview

-----

## Phase 3: Backend + Auth + Database

**Goal:** Real dots persisted to database. Users authenticate via magic link email. Galaxy state served from API.

**Stack:** Next.js API Routes, Drizzle ORM, PostgreSQL (Supabase), Redis (Upstash), Resend (email)

**Install:**

```bash
pnpm add drizzle-orm @neondatabase/serverless
pnpm add -D drizzle-kit
pnpm add @upstash/redis @upstash/ratelimit
pnpm add resend
pnpm add nanoid jsonwebtoken
pnpm add -D @types/jsonwebtoken
```

**Database schema** (see blueprint Section 4 for exact Drizzle schema):

- `dots` table: id, slug, name, color, line, vibe, link, posX, posY, posZ, sparkCount, ownerId, createdAt, updatedAt
- `connections` table: id, fromDotId, toDotId, createdAt. Unique constraint on (fromDotId, toDotId)
- `sparks` table: id, dotId, sessionHash, createdAt
- `users` table: id, email, dotId, createdAt
- `magic_links` table: id, email, token, expiresAt, usedAt
- Indexes on: dots.slug, dots.ownerId, connections.fromDotId, connections.toDotId, sparks.dotId, users.email, magic_links.token

**API Routes:**

1. `src/app/api/auth/magic/route.ts`
- POST: accepts { email }. Creates magic link token (nanoid, 32 chars). Saves to magic_links table with 15min expiry. Sends email via Resend with link to `/api/auth/verify?token={token}`. Rate limit: 3 per email per hour.
1. `src/app/api/auth/verify/route.ts`
- GET: accepts ?token query param. Looks up magic_links. If valid and not expired and not used: mark as used, find or create user by email, generate JWT (24h expiry, contains userId), set httpOnly secure cookie, redirect to homepage.
1. `src/app/api/auth/logout/route.ts`
- POST: clears auth cookie.
1. `src/app/api/auth/me/route.ts`
- GET: returns current user + their dot (if any). 401 if not authenticated.
1. `src/app/api/dots/route.ts`
- POST: create dot. Requires auth. Accepts { name, color, line, vibe, link }. Generates slug from name (lowercase, deduplicate with suffix). Generates random position in sphere. Creates dot in database. Updates user.dotId. Returns dot. One dot per user (v1).
- GET: list all dots (for admin/debug). Not exposed to frontend.
1. `src/app/api/dots/[slug]/route.ts`
- GET: public. Returns dot by slug with friends list.
- PATCH: owner only. Update name, line, vibe, link, color.
- DELETE: owner only. Delete dot, cascade connections, update user.dotId to null.
1. `src/app/api/connect/route.ts`
- POST: requires auth. Accepts { targetSlug }. Creates connection from user's dot to target dot. Returns connection. Prevents self-connection. Prevents duplicate.
- DELETE: requires auth. Accepts { connectionId }. Removes connection. Owner only.
1. `src/app/api/dots/[slug]/friends/route.ts`
- GET: public. Returns all connections for a dot (both directions). Includes mutual flag (computed: exists in both directions).
1. `src/app/api/spark/route.ts`
- POST: public. Accepts { dotId }. Creates spark. Rate limit: 1 per session hash per dot per 24h. Session hash derived from IP + user-agent, SHA-256 hashed. Increments dot.sparkCount.
1. `src/app/api/galaxy/route.ts`
- GET: public. Returns GalaxyState: all dots (id, slug, name, color, line, vibe, x, y, z) + all connections as index pairs. Cached in Redis for 5 minutes. Rebuilt on cache miss.

**Middleware:**

1. `src/middleware/auth.ts` — JWT verification. Extracts user from cookie. Returns userId or null.
1. `src/middleware/rate-limit.ts` — Upstash rate limiter. Configurable per-route limits.

**Environment variables:**

```
DATABASE_URL=
REDIS_URL=
RESEND_API_KEY=
JWT_SECRET=
NEXT_PUBLIC_URL=
```

**Migration:**

```bash
pnpm drizzle-kit generate
pnpm drizzle-kit push
```

**Frontend changes:**

- Galaxy now fetches from /api/galaxy on mount instead of generating sample data
- "make yours" flow: if not authenticated, show magic link form first, then builder after auth
- Card builder POSTs to /api/dots on creation
- Dot pages fetch from /api/dots/[slug]

**Acceptance criteria:**

- [ ] Database tables created with correct schema and indexes
- [ ] Magic link email sends successfully via Resend
- [ ] Magic link verification creates user and sets JWT cookie
- [ ] POST /api/dots creates a dot and returns it
- [ ] GET /api/dots/[slug] returns correct dot data
- [ ] PATCH /api/dots/[slug] updates dot (owner only, 403 for others)
- [ ] DELETE /api/dots/[slug] deletes dot (owner only)
- [ ] POST /api/connect creates connection (no self-connect, no duplicates)
- [ ] GET /api/dots/[slug]/friends returns connections with mutual flag
- [ ] POST /api/spark creates spark with rate limiting
- [ ] GET /api/galaxy returns cached galaxy state
- [ ] Galaxy renders real dots from API
- [ ] Creating a dot persists to database and appears in galaxy on next load
- [ ] Auth flow works end-to-end: enter email → receive link → click → authenticated
- [ ] Rate limiting works on magic link and spark endpoints
- [ ] No auth tokens or secrets exposed in API responses

-----

## Phase 4: Social Layer (Friends + Sparks + Constellation)

**Goal:** Users can link to each other, see mutual friends, and leave anonymous sparks.

**Build these files:**

1. `src/components/FriendLinker.tsx` — On a dot's page, shows "add to my constellation" button (if logged in, not self, not already connected). Clicking POSTs to /api/connect. Button changes to "in your constellation ✓" after linking.
1. `src/components/MiniConstellation.tsx` — Small canvas/SVG on each card showing the dot's friends as colored dots arranged in a small circle. Each friend dot is clickable (navigates to their page). Mutual connections are slightly brighter.
1. `src/components/SparkButton.tsx` — Small subtle button on dot pages. Click sends anonymous spark. Button animates (brief glow in dot's color). Disabled for 24h after sparking (per-dot, tracked via localStorage session hash). No count visible to visitors.
1. `src/hooks/useAuth.ts` — Auth state hook. Checks /api/auth/me on mount. Provides: user, dot, isAuthenticated, login(email), logout(). Stores auth state in React context.
1. Update `CardPreview.tsx` — Show mini constellation if dot has friends. Show spark count if viewing your own dot.
1. Update galaxy renderer — Mutual connections have opacity 0.12 (vs 0.06 for one-directional). When user is authenticated, their dot pulses slightly brighter in the galaxy.

**Acceptance criteria:**

- [ ] "add to my constellation" button appears on other dots' pages when logged in
- [ ] Clicking it creates a connection
- [ ] Mini constellation renders friends as colored dots
- [ ] Clicking a friend dot navigates to their page
- [ ] Mutual connections visually distinguished from one-directional
- [ ] Spark button works and rate-limits correctly
- [ ] Spark count visible only to dot owner
- [ ] Auth state persists across page loads

-----

## Phase 5: Dot Pages + Sharing + Handoff

**Goal:** Each dot has a public page with OG tags. Cards can be shared via link, download, or QR.

**Build these files:**

1. `src/app/dot/[slug]/page.tsx` — Individual dot page:
- Full-screen generative backdrop (edge to edge)
- Card content centered
- Name, line, link, vibe, constellation, spark button
- "add to my constellation" button (if logged in)
- Share button (opens share sheet)
- "since {month} {year}" age indicator
- "my dot." link back to galaxy
- SEO: og:title, og:description, og:image, og:url, twitter:card
1. `src/app/api/dots/[slug]/image/route.ts` — OG image generation. Renders card as 1200×630 PNG. Use @vercel/og or canvas-based rendering. Shows: name (large), line, color accent, "my dot." brand.
1. `src/app/api/dots/[slug]/card/route.ts` — Returns downloadable HTML artifact (same as frontend export but server-generated).
1. `src/components/ShareSheet.tsx` — Modal with sharing options:
- Copy link (mydot.space/{slug})
- Download card (HTML artifact)
- Download image (PNG)
- QR code (generated client-side, encoded with dot URL)
- Native share (navigator.share on mobile)
1. **The Handoff** — When someone opens a shared card HTML file:
- "made with my dot." link at bottom
- Link goes to mydot.space?ref={slug}
- If ref param present: that dot is highlighted in galaxy on load
- "make yours" opens builder with that dot as first friend connection (pre-populated)
- After creating dot: new user auto-connected to referrer
1. Update `src/app/page.tsx` — Handle ?ref= query param. If present, fly camera to referrer's dot on load.

**Acceptance criteria:**

- [ ] /dot/{slug} renders correctly for any existing dot
- [ ] OG image generates with correct name, line, color
- [ ] Sharing a dot URL on Twitter/Discord/iMessage shows correct preview card
- [ ] Copy link works
- [ ] Download card works (HTML artifact)
- [ ] Download image works (PNG)
- [ ] QR code generates and scans correctly
- [ ] Native share works on mobile
- [ ] Handoff flow: share card → recipient opens → clicks link → sees galaxy with referrer highlighted → creates dot → auto-connected to referrer
- [ ] "since {date}" shows correctly on dot page

-----

## Phase 6: Polish + Performance + Deploy

**Goal:** Ship it. Everything polished, performant, deployed.

**Tasks:**

1. **Card age patina** — CSS filter based on dot creation date:
- < 1 week: none
- 1-4 weeks: +1% sepia
- 1-3 months: +2% sepia, -1% brightness
- 3-12 months: +3% sepia, slight vignette
- 1+ year: +4% sepia, soft vignette
1. **Seasonal tint** — Backdrop color shift based on current month:
- Dec-Feb: slight blue shift
- Mar-May: slight green warmth
- Jun-Aug: golden warmth
- Sep-Nov: amber tint
1. **Ambient sound** — Web Audio API, opt-in:
- Three sine oscillators: 72 Hz (gain 0.4), 108 Hz (gain 0.2), 144 Hz (gain 0.2)
- Master gain: 0.012
- Linear ramp on/off over 1.5 seconds
- Sound toggle button: bottom right, speaker icon
1. **Performance optimization:**
- Galaxy with 1000+ dots: use LOD (distant dots smaller/fewer shader calculations)
- Connection lines only within camera frustum
- Galaxy state: gzip response
- Images: lazy load, proper sizing
- Lighthouse mobile score > 90
1. **Error handling:**
- API errors return clean JSON { message, status }
- Frontend shows toast notifications for errors
- Offline detection: show banner when disconnected
- Loading states: skeleton screens for dot pages, spinner for galaxy load
1. **Mobile testing:**
- Galaxy touch controls smooth on iOS Safari and Android Chrome
- Builder modal scrollable on small screens
- Card preview properly sized on all screen sizes
- Touch grab/fling feels natural
1. **Deploy:**
- Vercel: frontend + API routes
- Supabase: PostgreSQL database
- Upstash: Redis cache + rate limiting
- Cloudflare: DNS for mydot.space
- Environment variables configured in Vercel dashboard
- Production database migrated
1. **Analytics (privacy-first):**
- Vercel Analytics (anonymous, no cookies)
- Track: page views, dot creations, exports, sparks
- No third-party tracking, no cookies, no fingerprinting

**Acceptance criteria:**

- [ ] Card age patina visible on dots older than 1 week
- [ ] Seasonal tint subtle but present
- [ ] Ambient sound toggle works, sound is barely audible and atmospheric
- [ ] Galaxy performs at 60fps with 500 real dots
- [ ] Lighthouse mobile score > 90
- [ ] All API errors return clean JSON
- [ ] Loading states present on all async operations
- [ ] Works on iOS Safari, Android Chrome, desktop Chrome/Firefox/Safari
- [ ] Deployed to mydot.space
- [ ] Database migrated and seeded with initial dots
- [ ] SSL certificate active
- [ ] OG images generating correctly in production
- [ ] Full flow works: land on galaxy → make dot → share → friend clicks link → makes their dot → both connected
