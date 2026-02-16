'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
// @ts-ignore
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
// @ts-ignore
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
// @ts-ignore
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { generateDots, type DotData } from '@/lib/data';
import { dotVertexShader, dotFragmentShader, ringVertexShader, ringFragmentShader } from '@/lib/shaders';
import { usePhysics } from '@/hooks/usePhysics';
import { useCamera } from '@/hooks/useCamera';
import { hexToHue } from '@/lib/colors';
import DotTooltip from './DotTooltip';
import CardBuilder from './CardBuilder';
import CardPreview from './CardPreview';
import MapAddModal from './MapAddModal';
import { PALETTE } from '@/lib/colors';
import type { Vibe } from '@/lib/colors';

interface Ripple {
  sourceIdx: number;
  startTime: number;
  speed: number;
  maxRadius: number;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export interface GalaxyDot {
  id: string;
  name: string;
  color: string;
  line: string;
  vibe?: string;
  x: number;
  y: number;
  z: number;
}

export interface MapModeConfig {
  mapId: string;
  mapSlug: string;
  mapName: string;
  mapDescription?: string | null;
  mapColor: string;
  isOwner: boolean;
  connections?: { id: string; fromItemId: string; toItemId: string }[];
}

interface GalaxyProps {
  refSlug?: string;
  initialDots?: GalaxyDot[];
  mapMode?: MapModeConfig;
}

export default function Galaxy({ refSlug, initialDots, mapMode }: GalaxyProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const pointsRef = useRef<THREE.Points | null>(null);
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);
  const lineSegRef = useRef<THREE.LineSegments | null>(null);
  const mutualLineSegRef = useRef<THREE.LineSegments | null>(null);
  const clockRef = useRef(new THREE.Clock());
  const grabIndexRef = useRef(-1);
  const hoveredIndexRef = useRef(-1);
  const isDraggingRef = useRef(false);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseVecRef = useRef(new THREE.Vector2());
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchDist0Ref = useRef(0);
  const frameRef = useRef(0);
  const refIndexRef = useRef(-1);

  // ripple system
  const activeRipplesRef = useRef<Ripple[]>([]);
  const sizeBoostRef = useRef<Float32Array>(new Float32Array(0));

  // orbit lock
  const orbitCenterRef = useRef(new THREE.Vector3(0, 0, 0));
  const orbitTransitionRef = useRef(1);
  const orbitFromRef = useRef(new THREE.Vector3(0, 0, 0));
  const orbitToRef = useRef(new THREE.Vector3(0, 0, 0));
  const orbitLockedRef = useRef(false);
  const orbitDotIdxRef = useRef(-1);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFiredRef = useRef(false);

  // galaxy pulse
  const galaxyPulseRef = useRef(0);

  // color mode
  const colorModeActiveRef = useRef(false);

  // trail system — 12 history points per dot
  const TRAIL_LENGTH = 12;
  const trailHistoryRef = useRef<Float32Array[]>([]);
  const trailMeshRef = useRef<THREE.LineSegments | null>(null);

  // zoom-dependent labels — pool of 30
  const LABEL_POOL_SIZE = 30;
  const labelPoolRef = useRef<HTMLDivElement[]>([]);

  // heartbeat pulse meshes
  const heartbeatMeshesRef = useRef<THREE.Mesh[]>([]);

  // shake
  const lastShakeTimeRef = useRef(0);

  // my dot tracking
  const myDotIdxRef = useRef(-1);
  const myDotPulseEndRef = useRef(0);
  const ringPointsRef = useRef<THREE.Points | null>(null);
  const meLabelRef = useRef<HTMLDivElement>(null);

  const [dotCount, setDotCount] = useState(0);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; name: string; line: string; color: string } | null>(null);
  const [selectedDot, setSelectedDot] = useState<DotData | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [previewDot, setPreviewDot] = useState<DotData | null>(null);
  const [colorMode, setColorMode] = useState(false);
  const [modeBadge, setModeBadge] = useState<string | null>(null);
  const [myDotIdx, setMyDotIdx] = useState(-1);
  const modeBadgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const physics = usePhysics();
  const cam = useCamera();

  raycasterRef.current.params.Points!.threshold = 1.8;

  const showMode = useCallback((label: string, duration = 2000) => {
    setModeBadge(label);
    if (modeBadgeTimerRef.current) clearTimeout(modeBadgeTimerRef.current);
    if (duration > 0) {
      modeBadgeTimerRef.current = setTimeout(() => setModeBadge(null), duration);
    }
  }, []);

  const isMutual = useCallback((dotIdx: number, friendIdx: number) => {
    const dots = physics.dotsRef.current;
    if (friendIdx >= dots.length) return false;
    return dots[friendIdx].friends.includes(dotIdx);
  }, [physics.dotsRef]);

  const buildLines = useCallback(() => {
    const scene = sceneRef.current;
    const dots = physics.dotsRef.current;
    if (!scene) return;

    if (lineSegRef.current) {
      scene.remove(lineSegRef.current);
      lineSegRef.current.geometry.dispose();
    }
    if (mutualLineSegRef.current) {
      scene.remove(mutualLineSegRef.current);
      mutualLineSegRef.current.geometry.dispose();
    }

    const regPos: number[] = [];
    const regCol: number[] = [];
    const mutPos: number[] = [];
    const mutCol: number[] = [];

    dots.forEach((d, i) => {
      d.friends.forEach((fi) => {
        if (fi >= dots.length) return;
        const f = dots[fi];
        const c1 = new THREE.Color(d.color);
        const c2 = new THREE.Color(f.color);
        const mutual = isMutual(i, fi);
        if (mutual) {
          mutPos.push(d.px, d.py, d.pz, f.px, f.py, f.pz);
          mutCol.push(c1.r, c1.g, c1.b, c2.r, c2.g, c2.b);
        } else {
          regPos.push(d.px, d.py, d.pz, f.px, f.py, f.pz);
          regCol.push(c1.r, c1.g, c1.b, c2.r, c2.g, c2.b);
        }
      });
    });

    // regular connections — subtle
    const regGeo = new THREE.BufferGeometry();
    regGeo.setAttribute('position', new THREE.Float32BufferAttribute(regPos, 3));
    regGeo.setAttribute('color', new THREE.Float32BufferAttribute(regCol, 3));
    lineSegRef.current = new THREE.LineSegments(regGeo, new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.06,
    }));
    scene.add(lineSegRef.current);

    // mutual connections — slightly brighter
    if (mutPos.length > 0) {
      const mutGeo = new THREE.BufferGeometry();
      mutGeo.setAttribute('position', new THREE.Float32BufferAttribute(mutPos, 3));
      mutGeo.setAttribute('color', new THREE.Float32BufferAttribute(mutCol, 3));
      mutualLineSegRef.current = new THREE.LineSegments(mutGeo, new THREE.LineBasicMaterial({
        vertexColors: true, transparent: true, opacity: 0.12,
      }));
      scene.add(mutualLineSegRef.current);
    }
  }, [physics.dotsRef, isMutual]);

  const updateLines = useCallback(() => {
    const dots = physics.dotsRef.current;

    const updateSeg = (seg: THREE.LineSegments | null, filter: (dotIdx: number, friendIdx: number) => boolean) => {
      if (!seg) return;
      const arr = seg.geometry.attributes.position.array as Float32Array;
      let idx = 0;
      dots.forEach((d, i) => {
        d.friends.forEach((fi) => {
          if (fi >= dots.length) return;
          if (!filter(i, fi)) return;
          const f = dots[fi];
          arr[idx++] = d.px; arr[idx++] = d.py; arr[idx++] = d.pz;
          arr[idx++] = f.px; arr[idx++] = f.py; arr[idx++] = f.pz;
        });
      });
      seg.geometry.attributes.position.needsUpdate = true;
    };

    updateSeg(lineSegRef.current, (i, fi) => !isMutual(i, fi));
    updateSeg(mutualLineSegRef.current, (i, fi) => isMutual(i, fi));
  }, [physics.dotsRef, isMutual]);

  const updateRaycast = useCallback((clientX: number, clientY: number): number => {
    const camera = cameraRef.current;
    const points = pointsRef.current;
    if (!camera || !points) return -1;

    mouseVecRef.current.x = (clientX / window.innerWidth) * 2 - 1;
    mouseVecRef.current.y = -(clientY / window.innerHeight) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseVecRef.current, camera);
    const hits = raycasterRef.current.intersectObject(points);

    if (hits.length > 0 && grabIndexRef.current < 0) {
      const idx = hits[0].index ?? -1;
      if (idx >= 0 && idx < physics.dotsRef.current.length) {
        hoveredIndexRef.current = idx;
        return idx;
      }
    }
    hoveredIndexRef.current = -1;
    return -1;
  }, [physics.dotsRef]);

  const projectToWorld = useCallback((clientX: number, clientY: number, atZ: number) => {
    const camera = cameraRef.current;
    if (!camera) return null;
    const v = new THREE.Vector3(
      (clientX / window.innerWidth) * 2 - 1,
      -(clientY / window.innerHeight) * 2 + 1,
      0.5
    );
    v.unproject(camera);
    const dir = v.sub(camera.position).normalize();
    const t = (atZ - camera.position.z) / dir.z;
    return new THREE.Vector3(
      camera.position.x + dir.x * t,
      camera.position.y + dir.y * t,
      atZ
    );
  }, []);

  const triggerRipple = useCallback((dotIdx: number) => {
    activeRipplesRef.current.push({
      sourceIdx: dotIdx,
      startTime: clockRef.current.getElapsedTime(),
      speed: 40,
      maxRadius: 120,
    });
  }, []);

  const triggerGalaxyPulse = useCallback(() => {
    galaxyPulseRef.current = 1;
  }, []);

  const resetOrbit = useCallback(() => {
    if (!orbitLockedRef.current) return;
    orbitFromRef.current.copy(orbitCenterRef.current);
    orbitToRef.current.set(0, 0, 0);
    orbitTransitionRef.current = 0;
    orbitLockedRef.current = false;
    orbitDotIdxRef.current = -1;
    cam.targetZoomRef.current = 180;
    setModeBadge(null);
  }, [cam.targetZoomRef]);

  const flyToMyDot = useCallback(() => {
    const idx = myDotIdxRef.current;
    if (idx < 0) return;
    const dot = physics.dotsRef.current[idx];
    if (!dot) return;

    // Fly camera to dot
    orbitFromRef.current.copy(orbitCenterRef.current);
    orbitToRef.current.set(dot.px, dot.py, dot.pz);
    orbitTransitionRef.current = 0;
    orbitLockedRef.current = true;
    orbitDotIdxRef.current = idx;
    cam.targetZoomRef.current = 50;
    cam.autoRotateRef.current = false;

    // Trigger pulse (3 seconds) and ripple
    myDotPulseEndRef.current = clockRef.current.getElapsedTime() + 3;
    triggerRipple(idx);
    showMode('your dot', 2000);
  }, [physics.dotsRef, cam.targetZoomRef, cam.autoRotateRef, triggerRipple, showMode]);

  const toggleColorMode = useCallback(() => {
    const dots = physics.dotsRef.current;
    const newMode = !colorModeActiveRef.current;
    colorModeActiveRef.current = newMode;
    setColorMode(newMode);

    dots.forEach(dot => {
      if (newMode) {
        dot._savedHx = dot.hx;
        dot._savedHy = dot.hy;
        dot._savedHz = dot.hz;
        const hue = hexToHue(dot.color);
        const angle = (hue / 360) * Math.PI * 2;
        const radius = 45 + Math.random() * 15;
        const ySpread = (Math.random() - 0.5) * 25;
        dot.hx = radius * Math.cos(angle);
        dot.hy = ySpread;
        dot.hz = radius * Math.sin(angle);
      } else {
        dot.hx = dot._savedHx ?? dot.hx;
        dot.hy = dot._savedHy ?? dot.hy;
        dot.hz = dot._savedHz ?? dot.hz;
      }
    });

    // hide connection lines in color mode
    if (lineSegRef.current) lineSegRef.current.visible = !newMode;
    if (mutualLineSegRef.current) mutualLineSegRef.current.visible = !newMode;

    showMode(newMode ? 'color' : 'friends', 2000);
  }, [physics.dotsRef, showMode]);

  const rebuildGeometry = useCallback(() => {
    const geo = geometryRef.current;
    const scene = sceneRef.current;
    if (!geo || !scene) return;

    const dots = physics.dotsRef.current;
    const n = dots.length;
    const np = new Float32Array(n * 3);
    const nc = new Float32Array(n * 3);
    const ns = new Float32Array(n);
    const nb = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      np[i * 3] = dots[i].px;
      np[i * 3 + 1] = dots[i].py;
      np[i * 3 + 2] = dots[i].pz;
      const c = new THREE.Color(dots[i].color);
      nc[i * 3] = c.r;
      nc[i * 3 + 1] = c.g;
      nc[i * 3 + 2] = c.b;
      const friendCount = dots[i].friends.length;
      const connectionScale = Math.min(friendCount / 5, 1.5);
      ns[i] = 2.5 + connectionScale * 2.0;
      nb[i] = 0.7 + Math.min(friendCount / 8, 0.6);
    }

    geo.setAttribute('position', new THREE.BufferAttribute(np, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(nc, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(ns, 1));
    geo.setAttribute('brightness', new THREE.BufferAttribute(nb, 1));

    sizeBoostRef.current = new Float32Array(n);

    // rebuild trail history for new dot count
    const newTrailHistory: Float32Array[] = [];
    for (let t = 0; t < TRAIL_LENGTH; t++) {
      const buf = new Float32Array(n * 3);
      for (let j = 0; j < n; j++) {
        buf[j * 3] = dots[j].px;
        buf[j * 3 + 1] = dots[j].py;
        buf[j * 3 + 2] = dots[j].pz;
      }
      newTrailHistory.push(buf);
    }
    trailHistoryRef.current = newTrailHistory;

    // resize trail geometry
    if (trailMeshRef.current) {
      const maxTrailVerts = n * (TRAIL_LENGTH - 1) * 2;
      const trailGeo = trailMeshRef.current.geometry;
      trailGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(maxTrailVerts * 3), 3));
      trailGeo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(maxTrailVerts * 3), 3));
      trailGeo.setDrawRange(0, 0);
    }

    buildLines();
  }, [physics.dotsRef, buildLines]);

  const handleCreateDot = useCallback((dotData: { name: string; color: string; line: string; vibe: Vibe; link: string; theme?: string }) => {
    setBuilderOpen(false);
    setSelectedDot(null);

    const dots = physics.dotsRef.current;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 15 + Math.random() * 20;

    const newDot: DotData = {
      id: dots.length,
      name: dotData.name,
      color: dotData.color,
      line: dotData.line,
      vibe: dotData.vibe,
      link: dotData.link,
      theme: dotData.theme || 'default',
      claimed: false,
      px: 0, py: 0, pz: 0,
      hx: r * Math.sin(phi) * Math.cos(theta),
      hy: r * Math.sin(phi) * Math.sin(theta),
      hz: r * Math.cos(phi),
      vx: 0, vy: 0, vz: 0,
      friends: [],
      grabbed: false,
    };

    const friendCount = 2 + ~~(Math.random() * 2);
    for (let i = 0; i < friendCount; i++) {
      newDot.friends.push(~~(Math.random() * dots.length));
    }

    dots.push(newDot);
    rebuildGeometry();
    setDotCount(dots.length);
    setPreviewDot(newDot);
    triggerGalaxyPulse();
    showMode('new dot', 1500);

    // Track as user's dot
    const newIdx = dots.length - 1;
    myDotIdxRef.current = newIdx;
    setMyDotIdx(newIdx);

    // Persist to API (fire and forget — dot already in galaxy locally)
    fetch('/api/dots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: dotData.name,
        color: dotData.color,
        line: dotData.line,
        vibe: dotData.vibe,
        link: dotData.link,
        theme: dotData.theme || 'default',
      }),
    })
      .then(res => res.json())
      .then(saved => {
        if (saved?.slug) {
          newDot.slug = saved.slug;
          newDot.claimed = !!saved.ownerId;
          setPreviewDot(prev => prev ? { ...prev, slug: saved.slug, claimed: !!saved.ownerId } : null);
        }
      })
      .catch(() => {});

    // Create halo ring in the scene
    const scene = sceneRef.current;
    if (scene) {
      if (ringPointsRef.current) {
        scene.remove(ringPointsRef.current);
        ringPointsRef.current.geometry.dispose();
      }
      const ringGeo = new THREE.BufferGeometry();
      ringGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([newDot.px, newDot.py, newDot.pz]), 3));
      const c = new THREE.Color(newDot.color);
      ringGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array([c.r, c.g, c.b]), 3));
      ringGeo.setAttribute('size', new THREE.BufferAttribute(new Float32Array([10.0]), 1));
      const ringMat = new THREE.ShaderMaterial({
        vertexShader: ringVertexShader,
        fragmentShader: ringFragmentShader,
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      ringPointsRef.current = new THREE.Points(ringGeo, ringMat);
      scene.add(ringPointsRef.current);

      // heartbeat pulse — expanding wireframe sphere
      const heartGeo = new THREE.SphereGeometry(1, 24, 16);
      const heartMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(newDot.color),
        wireframe: true,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const heartMesh = new THREE.Mesh(heartGeo, heartMat);
      heartMesh.position.set(newDot.hx, newDot.hy, newDot.hz);
      scene.add(heartMesh);
      heartbeatMeshesRef.current.push(heartMesh);
    }
  }, [physics.dotsRef, rebuildGeometry, triggerGalaxyPulse, showMode]);

  // initialize scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1200);
    camera.position.set(0, 0, 180);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x030305);
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);
    const canvas = renderer.domElement;
    canvas.style.cursor = 'grab';

    // bloom post-processing
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.3,  // strength
      0.8,  // radius
      0.6   // threshold
    );
    composer.addPass(bloomPass);
    composerRef.current = composer;

    // background stars — brighter
    const starPositions = new Float32Array(4000 * 3);
    for (let i = 0; i < starPositions.length; i++) {
      starPositions[i] = (Math.random() - 0.5) * 800;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: 0x3a3a55,
      size: 0.25,
      sizeAttenuation: true,
    })));

    // 200 bright stars
    const brightStarPositions = new Float32Array(200 * 3);
    for (let i = 0; i < brightStarPositions.length; i++) {
      brightStarPositions[i] = (Math.random() - 0.5) * 800;
    }
    const brightStarGeo = new THREE.BufferGeometry();
    brightStarGeo.setAttribute('position', new THREE.BufferAttribute(brightStarPositions, 3));
    scene.add(new THREE.Points(brightStarGeo, new THREE.PointsMaterial({
      color: 0x556677,
      size: 0.8,
      sizeAttenuation: true,
    })));

    // generate or use provided dots
    const dots = initialDots
      ? initialDots.map((d, i) => ({
          id: i,
          slug: d.id,
          name: d.name,
          color: d.color,
          line: d.line,
          vibe: (d.vibe || 'serene') as Vibe,
          link: '',
          px: d.x, py: d.y, pz: d.z,
          hx: d.x, hy: d.y, hz: d.z,
          vx: 0, vy: 0, vz: 0,
          friends: [] as number[],
          grabbed: false,
        }))
      : generateDots(50);

    // If external dots, assign random friends for physics
    if (initialDots && dots.length > 1) {
      for (let i = 0; i < dots.length; i++) {
        const n = 1 + ~~(Math.random() * 2);
        for (let j = 0; j < n; j++) {
          const fi = ~~(Math.random() * dots.length);
          if (fi !== i) dots[i].friends.push(fi);
        }
      }
    }

    physics.setDots(dots);

    sizeBoostRef.current = new Float32Array(dots.length);

    // dot buffers — sizes scale with connection count
    const N = dots.length;
    const positions = new Float32Array(N * 3);
    const colors = new Float32Array(N * 3);
    const sizes = new Float32Array(N);
    const brightnessArr = new Float32Array(N);

    for (let i = 0; i < N; i++) {
      positions[i * 3] = dots[i].px;
      positions[i * 3 + 1] = dots[i].py;
      positions[i * 3 + 2] = dots[i].pz;
      const c = new THREE.Color(dots[i].color);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
      const friendCount = dots[i].friends.length;
      const connectionScale = Math.min(friendCount / 5, 1.5);
      sizes[i] = 2.5 + connectionScale * 2.0;
      brightnessArr[i] = 0.7 + Math.min(friendCount / 8, 0.6);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('brightness', new THREE.BufferAttribute(brightnessArr, 1));
    geometryRef.current = geo;

    const mat = new THREE.ShaderMaterial({
      vertexShader: dotVertexShader,
      fragmentShader: dotFragmentShader,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geo, mat);
    pointsRef.current = points;
    scene.add(points);

    buildLines();

    // trail system initialization — 12 history slots per dot (x,y,z)
    const trailHistory: Float32Array[] = [];
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      const buf = new Float32Array(N * 3);
      for (let j = 0; j < N; j++) {
        buf[j * 3] = dots[j].px;
        buf[j * 3 + 1] = dots[j].py;
        buf[j * 3 + 2] = dots[j].pz;
      }
      trailHistory.push(buf);
    }
    trailHistoryRef.current = trailHistory;

    // trail line segments (each dot can have up to TRAIL_LENGTH-1 segments = 2 verts each)
    const maxTrailVerts = N * (TRAIL_LENGTH - 1) * 2;
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(maxTrailVerts * 3), 3));
    trailGeo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(maxTrailVerts * 3), 3));
    trailGeo.setDrawRange(0, 0);
    const trailMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const trailMesh = new THREE.LineSegments(trailGeo, trailMat);
    trailMeshRef.current = trailMesh;
    scene.add(trailMesh);

    // animate count
    let count = 0;
    const countUp = () => {
      if (count < dots.length) {
        count = Math.min(count + 4, dots.length);
        setDotCount(count);
        requestAnimationFrame(countUp);
      }
    };
    setTimeout(countUp, 600);

    // ref highlight
    if (refSlug) {
      const slug = refSlug.toLowerCase();
      const idx = dots.findIndex((d) => d.name.toLowerCase() === slug);
      if (idx >= 0) {
        refIndexRef.current = idx;
        setTimeout(() => {
          cam.targetZoomRef.current = 60;
          cam.autoRotateRef.current = false;
          const d = dots[idx];
          const r = Math.sqrt(d.hx * d.hx + d.hy * d.hy + d.hz * d.hz);
          if (r > 0) {
            cam.targetXRef.current = Math.asin(d.hy / r);
            cam.targetYRef.current = Math.atan2(d.hx, d.hz);
          }
        }, 800);
      }
    }

    // shake to scatter (DeviceMotion)
    let motionCleanup: (() => void) | null = null;
    const handleMotion = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity;
      if (!acc) return;
      const magnitude = Math.sqrt(
        (acc.x || 0) ** 2 +
        (acc.y || 0) ** 2 +
        (acc.z || 0) ** 2
      );
      const now = Date.now();
      if (magnitude > 25 && now - lastShakeTimeRef.current > 1000) {
        lastShakeTimeRef.current = now;
        physics.scatter();
        galaxyPulseRef.current = 1;
      }
    };

    if (typeof window !== 'undefined' && window.DeviceMotionEvent) {
      if (typeof (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function') {
        const requestOnClick = () => {
          (DeviceMotionEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission().then((response: string) => {
            if (response === 'granted') {
              window.addEventListener('devicemotion', handleMotion);
              motionCleanup = () => window.removeEventListener('devicemotion', handleMotion);
            }
          });
        };
        document.addEventListener('click', requestOnClick, { once: true });
      } else {
        window.addEventListener('devicemotion', handleMotion);
        motionCleanup = () => window.removeEventListener('devicemotion', handleMotion);
      }
    }

    // animation loop
    const loop = () => {
      frameRef.current = requestAnimationFrame(loop);
      const t = clockRef.current.getElapsedTime();

      // update camera
      cam.update();
      const z = cam.zoomRef.current;
      const rx = cam.rotXRef.current;
      const ry = cam.rotYRef.current;
      camera.position.x = z * Math.sin(ry) * Math.cos(rx);
      camera.position.y = z * Math.sin(rx);
      camera.position.z = z * Math.cos(ry) * Math.cos(rx);

      // orbit lock transition
      if (orbitTransitionRef.current < 1) {
        orbitTransitionRef.current = Math.min(1, orbitTransitionRef.current + 0.03);
        orbitCenterRef.current.lerpVectors(
          orbitFromRef.current,
          orbitToRef.current,
          easeInOut(orbitTransitionRef.current)
        );
      }
      if (orbitLockedRef.current && orbitDotIdxRef.current >= 0) {
        const od = dots[orbitDotIdxRef.current];
        if (od) {
          orbitToRef.current.set(od.px, od.py, od.pz);
          if (orbitTransitionRef.current >= 1) {
            orbitCenterRef.current.set(od.px, od.py, od.pz);
          }
        }
      }
      camera.lookAt(orbitCenterRef.current);

      // update physics
      physics.step();

      // brightness breathing — 8-second cycle
      const breathCycle = Math.sin(t * 0.785) * 0.5 + 0.5;
      const breathScale = 1.0 + breathCycle * 0.15;
      bloomPass.strength = 0.3 + breathCycle * 0.1;

      // galaxy pulse decay
      if (galaxyPulseRef.current > 0) {
        galaxyPulseRef.current *= 0.94;
        if (galaxyPulseRef.current < 0.01) galaxyPulseRef.current = 0;
      }

      // ripple system
      const sizeBoost = sizeBoostRef.current;
      const currentDots = physics.dotsRef.current;
      if (sizeBoost.length >= currentDots.length) {
        sizeBoost.fill(0);
        for (let r = activeRipplesRef.current.length - 1; r >= 0; r--) {
          const ripple = activeRipplesRef.current[r];
          const elapsed = t - ripple.startTime;
          const radius = elapsed * ripple.speed;
          if (radius > ripple.maxRadius) {
            activeRipplesRef.current.splice(r, 1);
            continue;
          }
          const src = currentDots[ripple.sourceIdx];
          if (!src) continue;
          const fade = 1 - radius / ripple.maxRadius;
          for (let i = 0; i < currentDots.length; i++) {
            const dx = currentDots[i].px - src.px;
            const dy = currentDots[i].py - src.py;
            const dz = currentDots[i].pz - src.pz;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (Math.abs(dist - radius) < 6) {
              sizeBoost[i] = Math.max(sizeBoost[i], 2.5 * fade);
            }
          }
        }
      }

      // sync buffers
      const posArr = geo.attributes.position.array as Float32Array;
      const sizeArr = geo.attributes.size.array as Float32Array;
      const colArr = geo.attributes.color.array as Float32Array;
      const brightArr = geo.attributes.brightness ? geo.attributes.brightness.array as Float32Array : null;
      for (let i = 0; i < currentDots.length && i * 3 + 2 < posArr.length; i++) {
        posArr[i * 3] = currentDots[i].px;
        posArr[i * 3 + 1] = currentDots[i].py;
        posArr[i * 3 + 2] = currentDots[i].pz;

        // size: connection-scaled base + pulse + ripple boost + galaxy pulse + breath
        const friendCount = currentDots[i].friends.length;
        const connectionScale = Math.min(friendCount / 5, 1.5);
        const baseSize = (2.5 + connectionScale * 2.0) + Math.sin(t * 0.7 + i * 1.1) * 0.7;
        const boost = sizeBoost.length > i ? sizeBoost[i] : 0;
        const gPulse = galaxyPulseRef.current * 2.0;
        sizeArr[i] = (baseSize + boost + gPulse) * breathScale;

        // brightness: connection-based + breathing
        if (brightArr) {
          brightArr[i] = (0.7 + Math.min(friendCount / 8, 0.6)) * breathScale;
        }

        if (i === refIndexRef.current) sizeArr[i] = 4.0 + Math.sin(t * 2.0) * 1.5;
        if (i === grabIndexRef.current) sizeArr[i] = 6.0;

        // My dot: pulse after creation + permanently slightly larger
        if (i === myDotIdxRef.current) {
          if (t < myDotPulseEndRef.current) {
            sizeArr[i] = 6.0 + Math.sin(t * 4) * 1.5;
          } else {
            sizeArr[i] += 0.5;
          }
        }

        // orbit mode: dim non-friends
        if (orbitLockedRef.current && orbitDotIdxRef.current >= 0) {
          const orbitDot = currentDots[orbitDotIdxRef.current];
          if (orbitDot && i !== orbitDotIdxRef.current && !orbitDot.friends.includes(i)) {
            const c = new THREE.Color(currentDots[i].color);
            colArr[i * 3] = c.r * 0.5;
            colArr[i * 3 + 1] = c.g * 0.5;
            colArr[i * 3 + 2] = c.b * 0.5;
          } else {
            const c = new THREE.Color(currentDots[i].color);
            colArr[i * 3] = c.r;
            colArr[i * 3 + 1] = c.g;
            colArr[i * 3 + 2] = c.b;
            if (orbitDot && orbitDot.friends.includes(i)) {
              sizeArr[i] += 1.5;
            }
          }
        } else {
          const c = new THREE.Color(currentDots[i].color);
          colArr[i * 3] = c.r;
          colArr[i * 3 + 1] = c.g;
          colArr[i * 3 + 2] = c.b;
        }
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.size.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
      if (geo.attributes.brightness) geo.attributes.brightness.needsUpdate = true;

      // Update halo ring position
      const myIdx = myDotIdxRef.current;
      if (ringPointsRef.current && myIdx >= 0 && myIdx < currentDots.length) {
        const ringPosArr = ringPointsRef.current.geometry.attributes.position.array as Float32Array;
        ringPosArr[0] = currentDots[myIdx].px;
        ringPosArr[1] = currentDots[myIdx].py;
        ringPosArr[2] = currentDots[myIdx].pz;
        ringPointsRef.current.geometry.attributes.position.needsUpdate = true;
      }

      // Update "me" label position (3D → screen projection)
      if (meLabelRef.current && myIdx >= 0 && myIdx < currentDots.length) {
        const pos3 = new THREE.Vector3(
          currentDots[myIdx].px,
          currentDots[myIdx].py,
          currentDots[myIdx].pz,
        );
        pos3.project(camera);
        const sx = (pos3.x * 0.5 + 0.5) * window.innerWidth;
        const sy = (-pos3.y * 0.5 + 0.5) * window.innerHeight;
        const showLabel = cam.zoomRef.current > 100 && pos3.z < 1;
        meLabelRef.current.style.left = sx + 'px';
        meLabelRef.current.style.top = (sy - 20) + 'px';
        meLabelRef.current.style.display = showLabel ? 'block' : 'none';
      }

      // zoom-dependent detail
      const zoom = cam.zoomRef.current;
      const showConnections = zoom < 200;
      const showLabels = zoom < 120;

      // fade connection lines based on zoom
      if (lineSegRef.current) {
        lineSegRef.current.visible = showConnections;
        (lineSegRef.current.material as THREE.LineBasicMaterial).opacity = showConnections
          ? Math.min((200 - zoom) / 80, 1) * 0.06
          : 0;
      }
      if (mutualLineSegRef.current) {
        mutualLineSegRef.current.visible = showConnections;
        (mutualLineSegRef.current.material as THREE.LineBasicMaterial).opacity = showConnections
          ? Math.min((200 - zoom) / 80, 1) * 0.12
          : 0;
      }

      // position name labels on closest dots when zoomed in
      const labels = labelPoolRef.current;
      if (labels.length > 0) {
        if (!showLabels) {
          for (let l = 0; l < labels.length; l++) {
            labels[l].style.display = 'none';
          }
        } else {
          // find dots closest to camera, sorted by screen-z
          const scored: { idx: number; sx: number; sy: number; sz: number }[] = [];
          const projVec = new THREE.Vector3();
          for (let i = 0; i < currentDots.length; i++) {
            projVec.set(currentDots[i].px, currentDots[i].py, currentDots[i].pz);
            projVec.project(camera);
            if (projVec.z > 0 && projVec.z < 1) {
              scored.push({
                idx: i,
                sx: (projVec.x * 0.5 + 0.5) * window.innerWidth,
                sy: (-projVec.y * 0.5 + 0.5) * window.innerHeight,
                sz: projVec.z,
              });
            }
          }
          scored.sort((a, b) => a.sz - b.sz);

          const labelOpacity = Math.min((120 - zoom) / 60, 1) * 0.5;
          const labelSize = zoom < 60 ? '10px' : '8px';
          const limit = Math.min(scored.length, LABEL_POOL_SIZE);
          for (let l = 0; l < labels.length; l++) {
            if (l < limit) {
              const s = scored[l];
              const d = currentDots[s.idx];
              labels[l].textContent = d.name;
              labels[l].style.left = (s.sx + 8) + 'px';
              labels[l].style.top = (s.sy - 4) + 'px';
              labels[l].style.display = 'block';
              labels[l].style.opacity = String(labelOpacity);
              labels[l].style.fontSize = labelSize;
              labels[l].style.color = d.color;
            } else {
              labels[l].style.display = 'none';
            }
          }
        }
      }

      // heartbeat pulse meshes — animate and clean up
      for (let h = heartbeatMeshesRef.current.length - 1; h >= 0; h--) {
        const mesh = heartbeatMeshesRef.current[h];
        const scale = mesh.scale.x + 0.8;
        mesh.scale.set(scale, scale, scale);
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.opacity *= 0.96;
        if (mat.opacity < 0.01) {
          scene.remove(mesh);
          mesh.geometry.dispose();
          mat.dispose();
          heartbeatMeshesRef.current.splice(h, 1);
        }
      }

      // gravity trails — shift history and build trail segments
      const th = trailHistoryRef.current;
      const tm = trailMeshRef.current;
      if (th.length === TRAIL_LENGTH && tm) {
        // shift history: drop oldest, push current positions
        const oldest = th.shift()!;
        for (let i = 0; i < currentDots.length && i * 3 + 2 < oldest.length; i++) {
          oldest[i * 3] = currentDots[i].px;
          oldest[i * 3 + 1] = currentDots[i].py;
          oldest[i * 3 + 2] = currentDots[i].pz;
        }
        th.push(oldest);

        // build trail line segments for fast-moving dots
        const tPos = tm.geometry.attributes.position.array as Float32Array;
        const tCol = tm.geometry.attributes.color.array as Float32Array;
        let vi = 0;
        const VELOCITY_THRESHOLD = 0.5;
        for (let i = 0; i < currentDots.length; i++) {
          const d = currentDots[i];
          const speed = Math.sqrt(d.vx * d.vx + d.vy * d.vy + d.vz * d.vz);
          if (speed < VELOCITY_THRESHOLD) continue;
          const col = new THREE.Color(d.color);
          for (let s = 0; s < TRAIL_LENGTH - 1; s++) {
            const curr = th[TRAIL_LENGTH - 1 - s];
            const prev = th[TRAIL_LENGTH - 2 - s];
            if (!curr || !prev) break;
            if (vi * 3 + 5 >= tPos.length) break;
            const fade = 1.0 - s / (TRAIL_LENGTH - 1);
            const alpha = fade * Math.min(speed / 2.0, 1.0);
            tPos[vi * 3] = curr[i * 3];
            tPos[vi * 3 + 1] = curr[i * 3 + 1];
            tPos[vi * 3 + 2] = curr[i * 3 + 2];
            tCol[vi * 3] = col.r * alpha;
            tCol[vi * 3 + 1] = col.g * alpha;
            tCol[vi * 3 + 2] = col.b * alpha;
            vi++;
            tPos[vi * 3] = prev[i * 3];
            tPos[vi * 3 + 1] = prev[i * 3 + 1];
            tPos[vi * 3 + 2] = prev[i * 3 + 2];
            tCol[vi * 3] = col.r * alpha * 0.5;
            tCol[vi * 3 + 1] = col.g * alpha * 0.5;
            tCol[vi * 3 + 2] = col.b * alpha * 0.5;
            vi++;
          }
        }
        tm.geometry.setDrawRange(0, vi);
        tm.geometry.attributes.position.needsUpdate = true;
        tm.geometry.attributes.color.needsUpdate = true;
      }

      updateLines();
      composer.render();
    };
    loop();

    // resize handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // --- helpers for long press ---
    const clearLongPress = () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    };

    const startLongPress = (idx: number) => {
      longPressFiredRef.current = false;
      clearLongPress();
      longPressTimerRef.current = setTimeout(() => {
        longPressFiredRef.current = true;
        const dot = physics.dotsRef.current[idx];
        if (!dot) return;
        orbitFromRef.current.copy(orbitCenterRef.current);
        orbitToRef.current.set(dot.px, dot.py, dot.pz);
        orbitTransitionRef.current = 0;
        orbitLockedRef.current = true;
        orbitDotIdxRef.current = idx;
        cam.targetZoomRef.current = 60;
        setModeBadge('orbit: ' + dot.name);
      }, 500);
    };

    // --- MOUSE EVENTS ---
    const onMouseDown = (e: MouseEvent) => {
      const idx = updateRaycast(e.clientX, e.clientY);
      if (idx >= 0) {
        grabIndexRef.current = idx;
        physics.grabDot(idx);
        canvas.style.cursor = 'grabbing';
        startLongPress(idx);
        return;
      }
      isDraggingRef.current = true;
      cam.startDrag(e.clientX, e.clientY);
      canvas.style.cursor = 'grabbing';
    };

    const onMouseMove = (e: MouseEvent) => {
      if (grabIndexRef.current >= 0) {
        clearLongPress();
        const d = physics.dotsRef.current[grabIndexRef.current];
        const worldPos = projectToWorld(e.clientX, e.clientY, d.pz);
        if (worldPos) {
          physics.moveDot(grabIndexRef.current, worldPos.x, worldPos.y, worldPos.z);
        }
        setTooltip(null);
        return;
      }
      if (isDraggingRef.current) {
        cam.updateDrag(e.clientX, e.clientY);
        return;
      }
      const idx = updateRaycast(e.clientX, e.clientY);
      if (idx >= 0) {
        const d = physics.dotsRef.current[idx];
        setTooltip({ x: e.clientX + 18, y: e.clientY - 10, name: d.name, line: d.line, color: d.color });
        canvas.style.cursor = 'pointer';
      } else {
        setTooltip(null);
        canvas.style.cursor = isDraggingRef.current ? 'grabbing' : 'grab';
      }
    };

    const onMouseUp = () => {
      clearLongPress();
      if (grabIndexRef.current >= 0) {
        physics.releaseDot(grabIndexRef.current);
        grabIndexRef.current = -1;
        canvas.style.cursor = 'grab';
        return;
      }
      isDraggingRef.current = false;
      cam.endDrag();
      canvas.style.cursor = 'grab';
    };

    const onClick = (e: MouseEvent) => {
      if (isDraggingRef.current) return;
      if (longPressFiredRef.current) { longPressFiredRef.current = false; return; }
      const idx = updateRaycast(e.clientX, e.clientY);
      if (idx >= 0) {
        triggerRipple(idx);
        const dotCopy = { ...physics.dotsRef.current[idx] };
        setTimeout(() => setSelectedDot(dotCopy), 400);
      } else if (orbitLockedRef.current) {
        orbitFromRef.current.copy(orbitCenterRef.current);
        orbitToRef.current.set(0, 0, 0);
        orbitTransitionRef.current = 0;
        orbitLockedRef.current = false;
        orbitDotIdxRef.current = -1;
        cam.targetZoomRef.current = 180;
        setModeBadge(null);
      }
    };

    const onDblClick = (e: MouseEvent) => {
      if (physics.gravityRef.current) {
        physics.setGravityPoint(null);
        return;
      }
      const v = new THREE.Vector3(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1,
        0.5
      );
      v.unproject(camera);
      v.sub(camera.position).normalize();
      const vt = -camera.position.z / v.z;
      physics.setGravityPoint({
        x: camera.position.x + v.x * vt,
        y: camera.position.y + v.y * vt,
        z: 0,
      });
      showMode('vortex', 2000);
    };

    const onWheel = (e: WheelEvent) => {
      cam.setZoom(e.deltaY * 0.1);
    };

    // --- TOUCH EVENTS ---
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        const tx = e.touches[0].clientX;
        const ty = e.touches[0].clientY;
        const idx = updateRaycast(tx, ty);
        if (idx >= 0) {
          grabIndexRef.current = idx;
          physics.grabDot(idx);
          startLongPress(idx);
          return;
        }
        isDraggingRef.current = true;
        cam.startDrag(tx, ty);
        if (tapTimerRef.current) {
          clearTimeout(tapTimerRef.current);
          tapTimerRef.current = null;
          physics.scatter();
          showMode('scatter', 1500);
        } else {
          tapTimerRef.current = setTimeout(() => { tapTimerRef.current = null; }, 300);
        }
      } else if (e.touches.length === 2) {
        isDraggingRef.current = false;
        clearLongPress();
        touchDist0Ref.current = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        const tx = e.touches[0].clientX;
        const ty = e.touches[0].clientY;
        if (grabIndexRef.current >= 0) {
          clearLongPress();
          const d = physics.dotsRef.current[grabIndexRef.current];
          const worldPos = projectToWorld(tx, ty, d.pz);
          if (worldPos) {
            physics.moveDot(grabIndexRef.current, worldPos.x, worldPos.y, worldPos.z);
          }
          return;
        }
        if (isDraggingRef.current) {
          cam.updateDrag(tx, ty, 0.004);
        }
      } else if (e.touches.length === 2) {
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        cam.setZoom((touchDist0Ref.current - d) * 0.2);
        touchDist0Ref.current = d;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      clearLongPress();
      if (grabIndexRef.current >= 0) {
        if (!longPressFiredRef.current) {
          const idx = grabIndexRef.current;
          triggerRipple(idx);
          const dotCopy = { ...physics.dotsRef.current[idx] };
          setTimeout(() => setSelectedDot(dotCopy), 400);
        }
        physics.releaseDot(grabIndexRef.current);
        grabIndexRef.current = -1;
      }
      isDraggingRef.current = false;
      cam.endDrag();
    };

    // --- KEYBOARD ---
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.code === 'Space') {
        e.preventDefault();
        physics.scatter();
        showMode('scatter', 1500);
      }
      if (e.code === 'KeyR') {
        physics.resetAll();
        cam.reset();
        orbitLockedRef.current = false;
        orbitDotIdxRef.current = -1;
        orbitCenterRef.current.set(0, 0, 0);
        setModeBadge(null);
      }
      if (e.code === 'Escape') {
        physics.setGravityPoint(null);
        setSelectedDot(null);
        setBuilderOpen(false);
        setPreviewDot(null);
        if (orbitLockedRef.current) {
          orbitFromRef.current.copy(orbitCenterRef.current);
          orbitToRef.current.set(0, 0, 0);
          orbitTransitionRef.current = 0;
          orbitLockedRef.current = false;
          orbitDotIdxRef.current = -1;
          cam.targetZoomRef.current = 180;
          setModeBadge(null);
        }
      }
    };

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('click', onClick);
    canvas.addEventListener('dblclick', onDblClick);
    canvas.addEventListener('wheel', onWheel, { passive: true });
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });
    document.addEventListener('keydown', onKeyDown);

    return () => {
      cancelAnimationFrame(frameRef.current);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('dblclick', onDblClick);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', handleResize);
      if (motionCleanup) motionCleanup();
      if (trailMeshRef.current) {
        trailMeshRef.current.geometry.dispose();
        (trailMeshRef.current.material as THREE.Material).dispose();
      }
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogoClick = useCallback(() => {
    physics.resetAll();
    cam.reset();
    resetOrbit();
    setSelectedDot(null);
    setBuilderOpen(false);
    setPreviewDot(null);
  }, [physics, cam, resetOrbit]);

  const isMobile = typeof navigator !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent);

  return (
    <>
      <div ref={containerRef} className="fixed inset-0 z-[1]" style={{ touchAction: 'none' }} />

      {/* Logo / Map header */}
      {mapMode ? (
        <div className="fixed z-20 top-[max(env(safe-area-inset-top,0px),16px)] left-4 sm:top-7 sm:left-7 flex items-center gap-3">
          <a href="/" className="text-white/30 hover:text-white/60 transition-colors no-underline text-lg">&larr;</a>
          <div>
            <div className="font-serif text-[18px] sm:text-[22px] italic tracking-tight" style={{ color: mapMode.mapColor }}>
              {mapMode.mapName}
            </div>
            {mapMode.mapDescription && (
              <div className="text-[10px] text-white/25 font-light mt-0.5">{mapMode.mapDescription}</div>
            )}
          </div>
        </div>
      ) : (
        <div
          className="fixed z-20 cursor-pointer top-[max(env(safe-area-inset-top,0px),16px)] left-4 sm:top-7 sm:left-7"
          onClick={handleLogoClick}
        >
          <span className="font-serif text-[18px] sm:text-[22px] italic text-white/60 tracking-tight">
            my dot<span className="text-[#55556a] not-italic font-extralight">.</span>
          </span>
        </div>
      )}

      {/* Dot count */}
      <div className="fixed z-20 text-[9px] sm:text-[10px] tracking-[2px] text-[#55556a] font-light text-right leading-relaxed top-[max(env(safe-area-inset-top,0px),18px)] right-4 sm:top-8 sm:right-7">
        <span className="text-[#d0d0dd] font-normal">{dotCount}</span> {mapMode ? 'in map' : 'dots'}
      </div>

      {/* Mode badge */}
      {modeBadge && (
        <div
          className="fixed top-1/2 left-4 sm:left-7 -translate-y-1/2 z-20 text-[9px] tracking-[3px] uppercase text-[#55556a] font-light pointer-events-none transition-opacity duration-400"
          style={{ writingMode: 'vertical-rl', opacity: 0.6 }}
        >
          {modeBadge}
        </div>
      )}

      {/* Hint text — global only */}
      {!mapMode && (
        <div className="fixed bottom-[72px] sm:bottom-[100px] left-1/2 -translate-x-1/2 z-[15] text-[9px] sm:text-[11px] text-[#55556a] tracking-[1.5px] font-light text-center pointer-events-none animate-fadeHint whitespace-nowrap">
          {isMobile
            ? 'tap \u00b7 pinch \u00b7 hold \u00b7 shake'
            : 'drag to orbit \u00b7 scroll to zoom \u00b7 click a dot \u00b7 hold to orbit \u00b7 spacebar to scatter'}
        </div>
      )}

      {/* Color mode toggle */}
      <button
        onClick={toggleColorMode}
        className="fixed z-20 cursor-pointer transition-opacity duration-300 active:scale-90 bottom-5 left-4 sm:bottom-10 sm:left-7"
        style={{
          width: '44px',
          height: '44px',
          background: 'none',
          border: 'none',
          opacity: colorMode ? 0.5 : 0.25,
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg viewBox="0 0 24 24" width="24" height="24" fill="#55556a">
          <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-1 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
        </svg>
      </button>

      {/* Find me button — global only, visible after creating a dot */}
      {!mapMode && myDotIdx >= 0 && (
        <button
          onClick={flyToMyDot}
          title="find my dot"
          className="fixed z-20 cursor-pointer transition-opacity duration-300 active:scale-90 bottom-[60px] left-4 sm:bottom-[88px] sm:left-7"
          style={{
            width: '44px',
            height: '44px',
            background: 'none',
            border: 'none',
            opacity: 0.35,
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.35'; }}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#888" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="8" />
            <circle cx="12" cy="12" r="2.5" />
            <line x1="12" y1="2" x2="12" y2="5" />
            <line x1="12" y1="19" x2="12" y2="22" />
            <line x1="2" y1="12" x2="5" y2="12" />
            <line x1="19" y1="12" x2="22" y2="12" />
          </svg>
        </button>
      )}

      {/* Make yours button — global only */}
      {!mapMode && (
        <button
          onClick={() => setBuilderOpen(true)}
          className="fixed z-20 left-1/2 -translate-x-1/2 text-xs sm:text-[13px] font-normal tracking-[2px] lowercase text-white cursor-pointer transition-all duration-[400ms] active:scale-95 bottom-5 sm:bottom-9"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
            padding: '13px 36px',
            borderRadius: '40px',
            backdropFilter: 'blur(20px)',
            fontFamily: "'DM Sans', sans-serif",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
          }}
        >
          make yours
        </button>
      )}

      {/* Map mode: "add" button for owner */}
      {mapMode?.isOwner && (
        <button
          onClick={() => setBuilderOpen(true)}
          className="fixed z-20 bottom-5 sm:bottom-9 right-4 sm:right-7 cursor-pointer transition-all duration-300 active:scale-90"
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: mapMode.mapColor,
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 4px 20px ${mapMode.mapColor}40`,
          }}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      )}

      {/* Empty state for maps */}
      {mapMode && dotCount === 0 && (
        <div className="fixed z-[15] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
          <div className="text-[11px] text-white/20 font-light tracking-[1.5px]">
            add your first dot
          </div>
        </div>
      )}

      {/* Tooltip */}
      <DotTooltip tooltip={tooltip} />

      {/* Clicked dot card preview */}
      <CardPreview dot={selectedDot} onClose={() => setSelectedDot(null)} />

      {/* Builder modal — global */}
      {!mapMode && (
        <CardBuilder
          open={builderOpen}
          onClose={() => setBuilderOpen(false)}
          onSubmit={handleCreateDot}
        />
      )}

      {/* Map mode: add item modal */}
      {mapMode && builderOpen && (
        <MapAddModal
          mapId={mapMode.mapId}
          mapColor={mapMode.mapColor}
          onClose={() => setBuilderOpen(false)}
          onItemAdded={(item) => {
            setBuilderOpen(false);
            // Add the new item to the galaxy locally
            const dots = physics.dotsRef.current;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = 10 + Math.random() * 30;
            const newDot: DotData = {
              id: dots.length,
              name: item.name,
              color: item.color,
              line: item.line || '',
              vibe: 'serene' as Vibe,
              link: item.link || '',
              px: 0, py: 0, pz: 0,
              hx: r * Math.sin(phi) * Math.cos(theta),
              hy: r * Math.sin(phi) * Math.sin(theta),
              hz: r * Math.cos(phi),
              vx: 0, vy: 0, vz: 0,
              friends: [],
              grabbed: false,
            };
            if (dots.length > 0) {
              newDot.friends.push(~~(Math.random() * dots.length));
            }
            dots.push(newDot);
            rebuildGeometry();
            setDotCount(dots.length);
            triggerGalaxyPulse();
            triggerRipple(dots.length - 1);
          }}
        />
      )}

      {/* Preview of newly created dot — global only */}
      {!mapMode && (
        <CardPreview dot={previewDot} onClose={() => {
          setPreviewDot(null);
          flyToMyDot();
        }} />
      )}

      {/* "me" label — projected from 3D, visible when zoomed out, global only */}
      {!mapMode && (
        <div
          ref={meLabelRef}
          className="fixed z-[15] pointer-events-none"
          style={{
            fontSize: '8px',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.35)',
            fontWeight: 300,
            transform: 'translateX(-50%)',
            display: 'none',
          }}
        >
          me
        </div>
      )}

      {/* Zoom-dependent name label pool */}
      <div className="fixed inset-0 z-[14] pointer-events-none overflow-hidden">
        {Array.from({ length: LABEL_POOL_SIZE }).map((_, i) => (
          <div
            key={i}
            ref={(el) => { if (el) labelPoolRef.current[i] = el; }}
            style={{
              position: 'absolute',
              display: 'none',
              fontSize: '8px',
              fontWeight: 300,
              letterSpacing: '1px',
              fontFamily: "'DM Sans', sans-serif",
              whiteSpace: 'nowrap',
              textShadow: '0 1px 4px rgba(0,0,0,0.6)',
              transition: 'opacity 0.3s',
            }}
          />
        ))}
      </div>
    </>
  );
}
