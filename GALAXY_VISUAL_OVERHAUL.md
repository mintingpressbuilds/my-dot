# my dot. — Galaxy Visual Overhaul

Read CLAUDE.md first. These changes modify the galaxy renderer. Do not break existing interactions (grab, fling, scatter, vortex). Execute in order. Test each before moving to the next.

-----

## 1. DOT SIZE SCALES WITH CONNECTIONS

Dots with more friends are larger and brighter. The galaxy develops natural visual hierarchy.

### Implementation:

When computing dot sizes, factor in connection count:

```typescript
function computeDotSize(dot: Dot): number {
  const friendCount = dot.friends.length;
  const connectionScale = Math.min(friendCount / 5, 1.5);
  const base = 2.5 + connectionScale * 2.0;
  return base;
}
```

Also scale the glow intensity in the fragment shader. Pass a `brightness` attribute:

```glsl
attribute float brightness;
varying float vBrightness;
// Fragment shader — use vBrightness
vec3 col = vColor * glow * vBrightness + vec3(1.0) * core * 1.0;
float alpha = glow * (0.6 + vBrightness * 0.3) + core * 0.3;
```

Compute brightness per dot:

```typescript
const brightness = new Float32Array(dots.length);
for (let i = 0; i < dots.length; i++) {
  brightness[i] = 0.7 + Math.min(dots[i].friends.length / 8, 0.6);
}
geometry.setAttribute('brightness', new THREE.BufferAttribute(brightness, 1));
```

-----

## 2. BRIGHTNESS BREATHING

The entire galaxy breathes. Every 8 seconds, a gentle wave of brightness sweeps through.

```typescript
const breathCycle = Math.sin(clock.getElapsedTime() * 0.785) * 0.5 + 0.5;
const breathScale = 1.0 + breathCycle * 0.15;
bloomPass.strength = 0.3 + breathCycle * 0.1;
```

Subtle is the point. The galaxy is breathing, not flashing.

-----

## 3. GRAVITY TRAILS (Comet Tails)

When a dot moves fast (flung, scattered, or dragged), it leaves a fading trail of light behind it in its color.

Trail buffer with 12 points per dot. Only render trails when velocity exceeds threshold of 0.5.

During scatter: every dot has a trail = galaxy becomes a firework.

-----

## 4. ZOOM-DEPENDENT DETAIL (Level of Detail)

```
ZOOM 350-200 (far)      → Tiny points, no labels, no connections
ZOOM 200-120 (medium)   → Normal size, connections appear
ZOOM 120-60 (close)     → Names appear next to dots
ZOOM 60-30 (very close) → Names larger, lines show
ZOOM <30 (intimate)     → Floating card preview, no click needed
```

Use HTML overlay label pool (max 30) positioned via 3D→2D projection.

-----

## 5. HEARTBEAT ON CREATION

When a new dot is born, a visible pulse of light radiates outward across the entire galaxy.
Expanding sphere wireframe mesh with additive blending.

-----

## 6. AURORA NEBULA CLOUDS

40 large, faint particles that drift near dot clusters. Extremely low opacity (0.03-0.05).
Additive blending, depth write OFF, rendered before dots.

-----

## 7. FRIEND CHAIN GLOW

Click any dot → BFS pathfinding from YOUR dot to clicked dot → bright animated chain.
Shows "3 hops away" label. Auto-fades after 10 seconds.

-----

## Build Order

1. Dot size scales with connections
2. Brightness breathing
3. Gravity trails
4. Zoom-dependent detail
5. Heartbeat on creation
6. Aurora nebula clouds
7. Friend chain glow

## Acceptance Criteria

- [ ] Connected dots are visibly larger than isolated dots
- [ ] Galaxy breathing is subtle but perceptible
- [ ] Flung/scattered dots leave colored comet trails that fade
- [ ] Names appear when zoomed in, disappear when zoomed out
- [ ] Heartbeat ring expands when new dot created
- [ ] Faint aurora clouds visible around dot clusters
- [ ] Friend chain lights up path between your dot and clicked dot
- [ ] All existing interactions still work
- [ ] 60fps maintained with all effects
- [ ] Mobile still works perfectly
