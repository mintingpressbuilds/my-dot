'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import { generateDots, type DotData } from '@/lib/data';
import { dotVertexShader, dotFragmentShader } from '@/lib/shaders';
import { usePhysics } from '@/hooks/usePhysics';
import { useCamera } from '@/hooks/useCamera';
import DotTooltip from './DotTooltip';
import CardBuilder from './CardBuilder';
import CardPreview from './CardPreview';
import { PALETTE } from '@/lib/colors';
import type { Vibe } from '@/lib/colors';

export default function Galaxy() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
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

  const [dotCount, setDotCount] = useState(0);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; name: string; line: string; color: string } | null>(null);
  const [selectedDot, setSelectedDot] = useState<DotData | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [previewDot, setPreviewDot] = useState<DotData | null>(null);

  const physics = usePhysics();
  const cam = useCamera();

  // set raycaster threshold
  raycasterRef.current.params.Points!.threshold = 3;

  const isMutual = useCallback((dotIdx: number, friendIdx: number) => {
    const dots = physics.dotsRef.current;
    if (friendIdx >= dots.length) return false;
    return dots[friendIdx].friends.includes(dotIdx);
  }, [physics.dotsRef]);

  const buildLines = useCallback(() => {
    const scene = sceneRef.current;
    const dots = physics.dotsRef.current;
    if (!scene) return;

    // remove old lines
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

    // regular connections (0.06)
    const regGeo = new THREE.BufferGeometry();
    regGeo.setAttribute('position', new THREE.Float32BufferAttribute(regPos, 3));
    regGeo.setAttribute('color', new THREE.Float32BufferAttribute(regCol, 3));
    lineSegRef.current = new THREE.LineSegments(regGeo, new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.06,
    }));
    scene.add(lineSegRef.current);

    // mutual connections (0.12)
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

    // helper to update a line segment's positions
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

  const rebuildGeometry = useCallback(() => {
    const geo = geometryRef.current;
    const scene = sceneRef.current;
    if (!geo || !scene) return;

    const dots = physics.dotsRef.current;
    const n = dots.length;
    const np = new Float32Array(n * 3);
    const nc = new Float32Array(n * 3);
    const ns = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      np[i * 3] = dots[i].px;
      np[i * 3 + 1] = dots[i].py;
      np[i * 3 + 2] = dots[i].pz;
      const c = new THREE.Color(dots[i].color);
      nc[i * 3] = c.r;
      nc[i * 3 + 1] = c.g;
      nc[i * 3 + 2] = c.b;
      ns[i] = 2.8 + Math.random() * 1.8;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(np, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(nc, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(ns, 1));

    // rebuild lines
    buildLines();
  }, [physics.dotsRef, buildLines]);

  const handleCreateDot = useCallback((dotData: { name: string; color: string; line: string; vibe: Vibe; link: string }) => {
    setBuilderOpen(false);

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
      // start at center (0,0,0), spring pulls to home
      px: 0, py: 0, pz: 0,
      hx: r * Math.sin(phi) * Math.cos(theta),
      hy: r * Math.sin(phi) * Math.sin(theta),
      hz: r * Math.cos(phi),
      vx: 0, vy: 0, vz: 0,
      friends: [],
      grabbed: false,
    };

    // 2-3 random friend connections
    const friendCount = 2 + ~~(Math.random() * 2);
    for (let i = 0; i < friendCount; i++) {
      newDot.friends.push(~~(Math.random() * dots.length));
    }

    dots.push(newDot);
    rebuildGeometry();
    setDotCount(dots.length);
    setPreviewDot(newDot);
  }, [physics.dotsRef, rebuildGeometry]);

  // initialize scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // camera
    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1200);
    camera.position.set(0, 0, 180);
    cameraRef.current = camera;

    // renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x030305);
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);
    const canvas = renderer.domElement;
    canvas.style.cursor = 'grab';

    // background stars
    const starPositions = new Float32Array(4000 * 3);
    for (let i = 0; i < starPositions.length; i++) {
      starPositions[i] = (Math.random() - 0.5) * 800;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: 0x222233,
      size: 0.25,
      sizeAttenuation: true,
    })));

    // generate dots
    const dots = generateDots(250);
    physics.setDots(dots);

    // dot buffers
    const N = dots.length;
    const positions = new Float32Array(N * 3);
    const colors = new Float32Array(N * 3);
    const sizes = new Float32Array(N);

    for (let i = 0; i < N; i++) {
      positions[i * 3] = dots[i].px;
      positions[i * 3 + 1] = dots[i].py;
      positions[i * 3 + 2] = dots[i].pz;
      const c = new THREE.Color(dots[i].color);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
      sizes[i] = 2.8 + Math.random() * 1.8;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
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

    // build connection lines
    buildLines();

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
      camera.lookAt(0, 0, 0);

      // update physics
      physics.step();

      // sync buffers
      const posArr = geo.attributes.position.array as Float32Array;
      const sizeArr = geo.attributes.size.array as Float32Array;
      const currentDots = physics.dotsRef.current;
      for (let i = 0; i < currentDots.length && i * 3 + 2 < posArr.length; i++) {
        posArr[i * 3] = currentDots[i].px;
        posArr[i * 3 + 1] = currentDots[i].py;
        posArr[i * 3 + 2] = currentDots[i].pz;
        sizeArr[i] = 2.8 + Math.sin(t * 0.7 + i * 1.1) * 0.5;
        if (i === grabIndexRef.current) sizeArr[i] = 5.0;
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.size.needsUpdate = true;

      updateLines();
      renderer.render(scene, camera);
    };
    loop();

    // resize handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // --- MOUSE EVENTS ---
    const onMouseDown = (e: MouseEvent) => {
      const idx = updateRaycast(e.clientX, e.clientY);
      if (idx >= 0) {
        grabIndexRef.current = idx;
        physics.grabDot(idx);
        canvas.style.cursor = 'grabbing';
        return;
      }
      isDraggingRef.current = true;
      cam.startDrag(e.clientX, e.clientY);
      canvas.style.cursor = 'grabbing';
    };

    const onMouseMove = (e: MouseEvent) => {
      if (grabIndexRef.current >= 0) {
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
      const idx = updateRaycast(e.clientX, e.clientY);
      if (idx >= 0) {
        setSelectedDot({ ...physics.dotsRef.current[idx] });
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
      const t = -camera.position.z / v.z;
      physics.setGravityPoint({
        x: camera.position.x + v.x * t,
        y: camera.position.y + v.y * t,
        z: 0,
      });
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
          return;
        }
        isDraggingRef.current = true;
        cam.startDrag(tx, ty);
        // double-tap scatter
        if (tapTimerRef.current) {
          clearTimeout(tapTimerRef.current);
          tapTimerRef.current = null;
          physics.scatter();
        } else {
          tapTimerRef.current = setTimeout(() => { tapTimerRef.current = null; }, 300);
        }
      } else if (e.touches.length === 2) {
        isDraggingRef.current = false;
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
      if (grabIndexRef.current >= 0) {
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
      }
      if (e.code === 'KeyR') {
        physics.resetAll();
        cam.reset();
      }
      if (e.code === 'Escape') {
        physics.setGravityPoint(null);
        setSelectedDot(null);
        setBuilderOpen(false);
        setPreviewDot(null);
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
    setSelectedDot(null);
    setBuilderOpen(false);
    setPreviewDot(null);
  }, [physics, cam]);

  return (
    <>
      <div ref={containerRef} className="fixed inset-0 z-[1]" style={{ touchAction: 'none' }} />

      {/* Logo */}
      <div
        className="fixed top-7 left-7 z-20 cursor-pointer max-sm:top-4 max-sm:left-4"
        onClick={handleLogoClick}
      >
        <span className="font-serif text-[22px] max-sm:text-[18px] italic text-white/60 tracking-tight">
          my dot<span className="text-[#55556a] not-italic font-extralight">.</span>
        </span>
      </div>

      {/* Dot count */}
      <div className="fixed top-8 right-7 z-20 text-[10px] max-sm:top-5 max-sm:right-4 max-sm:text-[9px] tracking-[2px] text-[#55556a] font-light text-right leading-relaxed">
        <span className="text-[#d0d0dd] font-normal">{dotCount}</span> dots
      </div>

      {/* Hint text */}
      <div className="fixed bottom-[100px] max-sm:bottom-[76px] left-1/2 -translate-x-1/2 z-[15] text-[11px] max-sm:text-[9px] text-[#55556a] tracking-[1.5px] font-light text-center pointer-events-none animate-fadeHint">
        drag to orbit · scroll to zoom · click a dot · spacebar to scatter
      </div>

      {/* Make yours button */}
      <button
        onClick={() => setBuilderOpen(true)}
        className="fixed bottom-9 max-sm:bottom-6 left-1/2 -translate-x-1/2 z-20 text-[13px] max-sm:text-xs font-normal tracking-[2px] lowercase text-white cursor-pointer transition-all duration-[400ms]"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.07)',
          padding: '14px 40px',
          borderRadius: '40px',
          backdropFilter: 'blur(20px)',
          fontFamily: "'DM Sans', sans-serif",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
        }}
      >
        make yours
      </button>

      {/* Tooltip */}
      <DotTooltip tooltip={tooltip} />

      {/* Clicked dot card preview */}
      <CardPreview dot={selectedDot} onClose={() => setSelectedDot(null)} />

      {/* Builder modal */}
      <CardBuilder
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        onSubmit={handleCreateDot}
      />

      {/* Preview of newly created dot */}
      <CardPreview dot={previewDot} onClose={() => setPreviewDot(null)} />
    </>
  );
}
