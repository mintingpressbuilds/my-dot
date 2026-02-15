# my dot. — Feature Build (Critical)

Read CLAUDE.md and DOT_BLUEPRINT.md first. Execute in order. Do not skip ahead.

-----

## 1. FIND YOUR DOT (Critical — fix this first)

After creating a dot, the user loses it in the galaxy. This is broken. Fix it.

### After creation: fly to your dot

When user creates a dot and closes the card preview ("back to galaxy"), the camera should:

1. Smoothly fly FROM current position TO the new dot's position
1. Zoom in close (zoom level 50, not the default 180)
1. The new dot pulses larger for 3 seconds (size 6.0, pulsing)
1. A soft ring radiates outward from the dot once (like a sonar ping)
1. After 3 seconds, the dot settles to normal size
1. Camera stays zoomed in on the dot's neighborhood — user can see nearby dots

### "Find me" button

Add a persistent button in the UI. Only visible after user has created a dot.

Position: bottom-left, next to the color mode button (or wherever makes sense on mobile).
Icon: crosshair/target icon.
Label on hover: "find my dot"

On tap:

1. Camera flies to user's dot (smooth 2-second animation)
1. Zoom to level 50
1. User's dot pulses once
1. Subtle ring animation radiates out

Implementation:

```typescript
// Store the user's dot index after creation
let myDotIdx: number | null = null;

function findMyDot() {
  if (myDotIdx === null) return;
  const dot = dots[myDotIdx];

  // Set orbit target to dot's position
  orbitTarget = new THREE.Vector3(dot.px, dot.py, dot.pz);
  targetZoom = 50;

  // Trigger pulse
  dotPulse[myDotIdx] = 1.0; // decays over time
  triggerRipple(myDotIdx);
}
```

### Your dot is always slightly special

Your dot should be subtly different from all others at all times:

- Faint outer ring in your color (like a halo) — only on YOUR dot
- Slightly larger than average (base size + 0.5)
- When zoomed all the way out, your dot is still identifiable by its ring

Implementation — in the fragment shader, add a uniform for "highlighted dot index":

```glsl
// If this dot is the user's dot, add a subtle ring
uniform int highlightIdx;
// In vertex shader, pass a varying:
varying float vHighlight;
vHighlight = (index == highlightIdx) ? 1.0 : 0.0;
// In fragment shader:
if (vHighlight > 0.5) {
  float ring = smoothstep(0.35, 0.38, d) * (1.0 - smoothstep(0.38, 0.45, d));
  col += vColor * ring * 0.5;
  alpha += ring * 0.3;
}
```

Alternative simpler approach if shader uniforms are complex: maintain a separate single-point geometry for the user's dot highlight ring. Render it as a sprite or a ring mesh that follows the dot's position.

### Visual indicator in the galaxy

When zoomed far out, your dot should have a tiny label that says "me" in 8px text. Use an HTML overlay positioned via CSS, projected from 3D coordinates to screen space. Only show when camera is further than zoom level 100.

```typescript
function updateMeLabel() {
  if (myDotIdx === null) return;
  const dot = dots[myDotIdx];
  const pos = new THREE.Vector3(dot.px, dot.py, dot.pz);
  pos.project(camera);

  const x = (pos.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-pos.y * 0.5 + 0.5) * window.innerHeight;

  meLabel.style.left = x + 'px';
  meLabel.style.top = (y - 20) + 'px'; // above the dot
  meLabel.style.display = cameraZoom > 100 ? 'block' : 'none';
}
```

HTML:

```html
<div id="me-label" style="
  position: fixed; z-index: 15; pointer-events: none;
  font-size: 8px; letter-spacing: 2px; text-transform: uppercase;
  color: rgba(255,255,255,0.3); font-weight: 300;
  transform: translateX(-50%);
  display: none;
">me</div>
```

-----

## 2. CREATE FIRST, CLAIM LATER (Zero friction)

Current flow requires magic link auth before creating a dot. Change this.

### New flow:

1. User clicks "make yours"
1. Builder opens immediately — NO login required
1. User fills in name, color, line, vibe, link
1. User taps "join the universe"
1. Dot is created in the database with a `sessionToken` (nanoid, stored in httpOnly cookie)
1. No `ownerId` yet — dot is "unclaimed"
1. Card preview shows with a subtle "claim your dot" link
1. Galaxy shows the dot, camera flies to it
1. User can export card, explore galaxy, everything works

### Claiming:

On the card preview or on the dot page, show a subtle prompt:

```
"claim your dot to edit it, create maps, and connect with friends"
[enter your email]
```

When they enter email → magic link → click → JWT set → dot's `ownerId` updated from null to userId → dot is now "claimed"

### Database changes:

Add to dots table:

```typescript
sessionToken: text('session_token'), // for unclaimed dots
```

Modify the dots create endpoint:

```typescript
// POST /api/dots — no auth required
// If user has JWT: set ownerId to userId
// If no JWT: generate sessionToken, set in cookie, store on dot
// Return dot either way
```

Add claim endpoint:

```typescript
// POST /api/dots/claim
// Requires: JWT (from magic link) + sessionToken cookie
// Finds dot by sessionToken, sets ownerId to userId
// Clears sessionToken
```

### UI changes:

- Remove auth gate from "make yours" button
- Add "claim your dot" prompt on card preview (subtle, below the action buttons)
- Add "claim" banner on dot page when viewing your unclaimed dot
- After claiming: "claim" prompts disappear, full edit/maps/connect UI appears

Unclaimed dots can:

- Exist in the galaxy
- Be exported as cards
- Be viewed by anyone
- Receive sparks

Unclaimed dots cannot:

- Create maps
- Connect to other dots
- Edit after creation (unless they claim)
- Have a dot page at /dot/[slug] (or maybe they can, but with limited features)

-----

## 3. MAPS

### Data model:

```typescript
// New table: maps
export const maps = pgTable('maps', {
  id: text('id').primaryKey(),              // nanoid
  slug: text('slug').unique().notNull(),
  name: text('name').notNull(),             // "my music", "road trip 2026"
  description: text('description'),          // optional one-liner
  color: text('color').notNull(),            // accent color for the map
  type: text('type').notNull().default('custom'), // 'people'|'places'|'music'|'ideas'|'custom'
  visibility: text('visibility').notNull().default('public'), // 'public'|'private'|'unlisted'
  ownerId: text('owner_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// New table: map_dots (join table)
export const mapDots = pgTable('map_dots', {
  id: text('id').primaryKey(),
  mapId: text('map_id').notNull().references(() => maps.id, { onDelete: 'cascade' }),
  dotId: text('dot_id').notNull().references(() => dots.id, { onDelete: 'cascade' }),
  addedAt: timestamp('added_at').defaultNow().notNull(),
}, (t) => ({
  unique: unique().on(t.mapId, t.dotId),
}));

// New table: map_items (for non-user dots — songs, places, ideas)
export const mapItems = pgTable('map_items', {
  id: text('id').primaryKey(),             // nanoid
  mapId: text('map_id').notNull().references(() => maps.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  color: text('color').notNull(),
  line: text('line'),                       // description
  link: text('link'),                       // URL (spotify link, google maps, etc.)
  posX: real('pos_x').notNull().default(0),
  posY: real('pos_y').notNull().default(0),
  posZ: real('pos_z').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// New table: map_connections (connections between items within a map)
export const mapConnections = pgTable('map_connections', {
  id: text('id').primaryKey(),
  mapId: text('map_id').notNull().references(() => maps.id, { onDelete: 'cascade' }),
  fromItemId: text('from_item_id').notNull(),
  toItemId: text('to_item_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  unique: unique().on(t.mapId, t.fromItemId, t.toItemId),
}));

// Indexes
// maps: slug, owner_id
// map_dots: map_id, dot_id
// map_items: map_id
// map_connections: map_id
```

### API routes:

```
POST   /api/maps              Create map (requires claimed account)
GET    /api/maps/:slug        Get map with all its dots/items
PATCH  /api/maps/:id          Update map (owner only)
DELETE /api/maps/:id          Delete map (owner only)

POST   /api/maps/:id/dots     Add existing dot to map
DELETE /api/maps/:id/dots/:dotId  Remove dot from map

POST   /api/maps/:id/items    Create a new item in the map
PATCH  /api/maps/:id/items/:itemId  Update item
DELETE /api/maps/:id/items/:itemId  Delete item

POST   /api/maps/:id/connections    Connect two items
DELETE /api/maps/:id/connections/:id  Disconnect

GET    /api/users/:id/maps    Get all maps by a user
```

### Map page: /map/[slug]

This page renders a full-screen galaxy — THE EXACT SAME Galaxy component — but with a filtered dataset. Instead of loading from /api/galaxy, it loads from /api/maps/:slug which returns only that map's dots and items.

The page layout:

- Full-screen galaxy (same renderer, same physics, same interactions)
- Map name in top-left (instead of "my dot." logo — or alongside it)
- Map description below the name
- "Add a dot" button (if owner, replaces "make yours")
- Back arrow to return to main galaxy
- Share button
- Dot count shows map's dot count, not global

The galaxy renderer needs ONE change: accept a `dots` prop instead of always loading from /api/galaxy. When on the main page, it loads global. When on a map page, it loads that map's dots.

```tsx
// Galaxy component change:
interface GalaxyProps {
  dots?: GalaxyDot[];       // if provided, use these instead of fetching
  connections?: [number, number][];
  showGlobalUI?: boolean;   // show "make yours" etc.
}
```

### Map builder modal:

Triggered by "new map" button on the user's dot page or from a maps menu.

Fields:

- Map name (max 40 chars)
- Description (max 120 chars, optional)
- Color (same color picker as dot builder)
- Type: people / places / music / ideas / custom (pill selector)
- Visibility: public / private (toggle)

After creating: opens the empty map page. "Add your first dot" prompt in the center.

### Adding dots/items to a map:

On a map page, the owner sees an "+" floating button.

Tapping it opens a modal with two tabs:

1. **Add person** — search for existing dots by name. Results show as small cards with name + color. Tap to add to map.
1. **Add item** — create a new item (for non-users: songs, places, ideas):
- Name
- Color (color picker)
- Line (description)
- Link (optional URL)
  Tap "add" — item appears in the map galaxy.

After adding: the new dot/item appears at the center of the map galaxy and springs to a random position. Same birth animation as creating a dot on the main galaxy.

### Connecting items within a map:

The owner can draw connections between dots/items in their map. Two approaches (implement the simpler one):

**Simple:** Click item A, then click item B. A connection line appears between them. Click the line to remove it.

**Better:** Enter "connect mode" (toggle button). Click dots in sequence. Each click connects to the previous dot. Click the toggle again to exit. This lets you draw paths quickly (great for travel maps, playlists, etc.).

### My Maps on dot page:

On a user's dot page (/dot/[slug]), below their card info, show their public maps as a horizontal scroll row:

```
my maps
┌─────────┐ ┌─────────┐ ┌─────────┐
│ ● ● ●   │ │ ● ●     │ │ ●●● ●   │
│  ● ●    │ │   ● ●   │ │  ● ●●   │
│ my music│ │ team    │ │ road trip│
└─────────┘ └─────────┘ └─────────┘
```

Each thumbnail is a tiny canvas rendering of that map's dots in their colors — a mini galaxy preview. Tap to open the full map.

### Map thumbnail renderer:

Small canvas (120×80px). Render dots as colored circles at their positions, scaled to fit. No interaction. No labels. Just a visual fingerprint of the map's shape and colors.

```typescript
function renderMapThumbnail(canvas: HTMLCanvasElement, dots: MapDot[]) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.fillStyle = '#0a0a12';
  ctx.fillRect(0, 0, w, h);

  // Normalize positions to fit canvas
  const xs = dots.map(d => d.x), ys = dots.map(d => d.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1, rangeY = maxY - minY || 1;
  const padding = 12;

  dots.forEach(dot => {
    const x = padding + ((dot.x - minX) / rangeX) * (w - padding * 2);
    const y = padding + ((dot.y - minY) / rangeY) * (h - padding * 2);

    // Glow
    const grad = ctx.createRadialGradient(x, y, 0, x, y, 6);
    grad.addColorStop(0, dot.color);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(x - 6, y - 6, 12, 12);

    // Core
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
  });
}
```

-----

## 4. NEW DOT TICKER (Social proof)

A subtle, non-intrusive ticker on the homepage showing new dots being created.

Position: top-center, below the stats. Small text that fades in and out.

```
✦ luna just joined · 3s ago
```

Fades in, stays for 4 seconds, fades out. Next one appears. If no new dots, shows nothing.

Implementation:

- Poll /api/dots/recent every 30 seconds (returns last 5 dots created)
- Or use the galaxy state refresh
- Show one at a time with CSS animation

```tsx
<div className="ticker">
  <span className="ticker-dot" style={{ background: newDot.color }} />
  <span className="ticker-text">{newDot.name} just joined</span>
</div>
```

```css
.ticker {
  position: fixed;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 15;
  font-size: 11px;
  color: rgba(255,255,255,.3);
  letter-spacing: 1px;
  font-weight: 300;
  display: flex;
  align-items: center;
  gap: 8px;
  animation: tickFade 4s ease forwards;
  pointer-events: none;
}
.ticker-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
@keyframes tickFade {
  0% { opacity: 0; }
  10% { opacity: 1; }
  80% { opacity: 1; }
  100% { opacity: 0; }
}
```

-----

## 5. EMBEDDABLE DOT WIDGET

A small HTML snippet people can put on their website. Renders their dot as a tiny interactive card.

### Endpoint: GET /api/dots/[slug]/embed

Returns a small HTML page (for iframe) or a script tag.

### iframe approach (simpler):

```html
<!-- Put this on your website -->
<iframe
  src="https://mydot.space/embed/kai"
  width="200"
  height="260"
  frameborder="0"
  style="border-radius: 16px; overflow: hidden;"
></iframe>
```

### Embed page: /embed/[slug]

A minimal page that renders:

- Dot's generative backdrop (small)
- Name
- Line
- Color accent
- "my dot." link at bottom
- Click anywhere → opens mydot.space/dot/[slug] in new tab

No galaxy. No Three.js. Just a tiny beautiful card.

```tsx
// /app/embed/[slug]/page.tsx
export default function EmbedPage({ params }) {
  // Fetch dot
  // Render mini card with backdrop canvas
  // Click → window.open(mydot.space/dot/slug)
}
```

Styling: dark background, same fonts, same generative backdrop but at 200×260 scale. The embed should look like a jewel sitting on someone's website.

-----

## 6. QR CODE ON CARDS

Each card (in preview and on dot page) shows a small QR code that links to their dot page.

Use a client-side QR library (qrcode.js or generate on canvas).

Position: bottom-right corner of the card, small (48×48px), subtle (white at 15% opacity, brightens on hover).

```bash
npm install qrcode
```

```typescript
import QRCode from 'qrcode';

async function generateQR(url: string, canvas: HTMLCanvasElement) {
  await QRCode.toCanvas(canvas, url, {
    width: 96, // 2x for retina
    margin: 0,
    color: {
      dark: 'rgba(255,255,255,0.2)',
      light: 'transparent',
    },
  });
}
```

Also include QR code in the exported HTML artifact.

-----

## 7. DOT OF THE DAY

Each day (UTC midnight), one random dot gets highlighted.

### Implementation:

Use a deterministic random selection based on the date:

```typescript
function getDotOfTheDay(dotIds: string[], date: string): string {
  // Hash the date string
  let hash = 0;
  for (let i = 0; i < date.length; i++) {
    hash = ((hash << 5) - hash) + date.charCodeAt(i);
    hash |= 0;
  }
  return dotIds[Math.abs(hash) % dotIds.length];
}
```

No database needed. Same date = same dot every time. Deterministic.

### Visual treatment:

In the galaxy, the Dot of the Day has:

- A slow-rotating ring around it (like a planet's ring, but made of light)
- Slightly larger (base size + 1.0)
- A tiny "✦" icon near it (HTML overlay, like the "me" label)

On the homepage, small text below the dot count:

```
✦ dot of the day: kai
```

Tapping it flies the camera to that dot.

### Dot page:

If it's your day, your dot page shows a subtle "✦ dot of the day" badge.

-----

## 8. SHARE IMPROVEMENTS

### Native share on mobile:

When tapping share on a card or dot page, use navigator.share if available:

```typescript
async function shareDot(dot: Dot) {
  if (navigator.share) {
    await navigator.share({
      title: `${dot.name} — my dot.`,
      text: dot.line,
      url: `https://mydot.space/dot/${dot.slug}`,
    });
  } else {
    // Fallback: copy link to clipboard
    await navigator.clipboard.writeText(`https://mydot.space/dot/${dot.slug}`);
    showToast('link copied');
  }
}
```

### Share sheet modal:

When share button is tapped (on desktop, or as alternative on mobile):

```
┌─────────────────────────┐
│  share your dot          │
│                          │
│  🔗  copy link           │
│  📄  download card       │
│  📱  QR code             │
│  ↗️  share (native)      │
│                          │
│  <iframe> embed code     │
│  [copy snippet]          │
└─────────────────────────┘
```

Each option is one tap. Copy link copies to clipboard with a "copied!" toast. Download card triggers the HTML artifact export. QR code shows a large QR. Native share opens the OS share sheet. Embed shows the iframe code with a copy button.

-----

## Build Order

Execute in this exact order:

1. **Find your dot** — fly-to animation, "find me" button, "me" label, highlight ring. TEST: create a dot, close preview, can you find it immediately? If yes, proceed.
1. **Create first, claim later** — remove auth gate from builder, add sessionToken flow, add "claim your dot" prompt. TEST: open incognito, make a dot without entering email. Does it work? If yes, proceed.
1. **Maps — database + API** — create tables, all CRUD endpoints, test with curl/Postman. TEST: create a map, add items, fetch map. All return correct data? If yes, proceed.
1. **Maps — UI** — map page (reuse Galaxy component), map builder modal, add dot/item to map, connect items, my maps row on dot page with thumbnails. TEST: create a map, add 5 items, view map as 3D galaxy, see it on your dot page. All work? If yes, proceed.
1. **New dot ticker** — poll for recent dots, animate in/out. TEST: create a dot in another browser, does the ticker show it? If yes, proceed.
1. **Embeddable widget** — /embed/[slug] page, iframe snippet. TEST: embed on a test HTML page, does it render correctly? If yes, proceed.
1. **QR codes** — on card preview, dot page, and exported artifact. TEST: scan QR, does it go to the dot page? If yes, proceed.
1. **Dot of the day** — deterministic selection, visual highlight, homepage text. TEST: does the same dot get selected consistently for today? Does it change tomorrow? If yes, proceed.
1. **Share improvements** — native share, share sheet modal, copy link, embed code. TEST: share from mobile, does OS share sheet open? Copy link, does it work? If yes, done.

-----

## Acceptance Criteria

- [ ] After creating a dot, camera flies directly to it — you can't lose yourself
- [ ] "Find me" button always takes you back to your dot
- [ ] "me" label visible when zoomed out
- [ ] Your dot has a subtle halo ring distinguishing it from all others
- [ ] Dots can be created without any login/email
- [ ] "Claim your dot" flow works: enter email → magic link → dot claimed
- [ ] Unclaimed dots exist in galaxy and can be exported
- [ ] Maps can be created with name, color, description, type
- [ ] Items can be added to maps (search existing dots OR create new items)
- [ ] Items can be connected within a map
- [ ] Map page renders as a 3D galaxy using the same renderer
- [ ] My maps show on dot page as thumbnail previews
- [ ] Map thumbnails render correctly as mini galaxy previews
- [ ] New dot ticker shows recent joins on homepage
- [ ] Embeddable widget renders correctly in iframe
- [ ] QR code appears on cards and scans correctly
- [ ] Dot of the day highlights correctly in galaxy
- [ ] Native share works on iOS and Android
- [ ] Share sheet offers all options (link, card, QR, embed)
- [ ] No performance regression
- [ ] No console errors
- [ ] Mobile works perfectly for all new features
